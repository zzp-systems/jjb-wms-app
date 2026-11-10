// ============================================================================
// JJB-WMS · Offline-First Outbox (IndexedDB) — schema v2
// ============================================================================
// Lifecycle:
//   PENDING  → just queued, never attempted
//   SYNCING  → in-flight (never increments attempts)
//   FAILED   → transient failure, retry with exponential backoff
//   SYNCED   → success, safe to purge
//   DEAD     → permanent rejection (4xx) OR attempts exhausted
//              → NEVER auto-retried. Requires manual review/revive.
// ============================================================================

const DB_NAME = 'JJB_WMS_OUTBOX';
const DB_VERSION = 2;
const STORE_NAME = 'events';

export const MAX_ATTEMPTS = 5;
export const STATUS = {
  PENDING: 'PENDING',
  SYNCING: 'SYNCING',
  FAILED: 'FAILED',
  SYNCED: 'SYNCED',
  DEAD: 'DEAD',
};

// 0s, 2s, 4s, 8s, 16s, 32s (capped at 60s)
export function computeBackoffMs(attempts) {
  if (!attempts || attempts <= 0) return 0;
  return Math.min(Math.pow(2, attempts) * 1000, 60_000);
}

let dbPromise = null;

// ---------------------------------------------------------------------------
// Open + migrate
// ---------------------------------------------------------------------------
export function initOfflineDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      const tx = e.target.transaction;

      let store;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      } else {
        store = tx.objectStore(STORE_NAME);
      }
      if (!store.indexNames.contains('status')) {
        store.createIndex('status', 'status', { unique: false });
      }

      // ---- v1 → v2 migration ----
      if (e.oldVersion < 2) {
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = (ev) => {
          const cursor = ev.target.result;
          if (!cursor) return;
          const rec = cursor.value;

          // New fields
          if (rec.next_retry_at == null) rec.next_retry_at = 0;
          if (rec.last_http_status == null) rec.last_http_status = null;

          // Fix attempts inflated by the double-increment bug
          if (typeof rec.attempts !== 'number') rec.attempts = 0;

          // Demote already-exhausted FAILED records to DEAD
          if (rec.status === STATUS.FAILED && rec.attempts >= MAX_ATTEMPTS) {
            rec.status = STATUS.DEAD;
            rec.error = rec.error || 'Exceeded max attempts (migrated from v1)';
          }

          cursor.update(rec);
          cursor.continue();
        };
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

// ---------------------------------------------------------------------------
// Queue (size-guarded)
// ---------------------------------------------------------------------------
const MAX_PAYLOAD_BYTES = 500_000; // 500 KB — well under D1's 1 MB row limit

export async function queueEvent(eventType, idempotencyKey, payload) {
  const serialized = JSON.stringify(payload);
  if (serialized.length > MAX_PAYLOAD_BYTES) {
    throw new Error(
      `Payload too large (${serialized.length} bytes, max ${MAX_PAYLOAD_BYTES}). ` +
      `Event type: ${eventType}`
    );
  }

  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record = {
      event_type: eventType,
      idempotency_key: idempotencyKey,
      payload,
      status: STATUS.PENDING,
      attempts: 0,
      next_retry_at: 0,
      last_http_status: null,
      error: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    const req = store.add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

/** Full list of non-terminal records (for the "Syncing N…" badge). */
export async function getPendingEvents() {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      resolve(
        (req.result || [])
          .filter((e) => e.status !== STATUS.SYNCED)
          .sort((a, b) => a.id - b.id)
      );
    };
    req.onerror = () => reject(req.error);
  });
}

/** Candidates for the flush loop. Excludes SYNCING, SYNCED, DEAD, and any event not yet past its backoff. */
export async function getRetryableEvents() {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      const now = Date.now();
      resolve(
        (req.result || [])
          .filter(
            (e) =>
              (e.status === STATUS.PENDING || e.status === STATUS.FAILED) &&
              (e.attempts || 0) < MAX_ATTEMPTS &&
              (e.next_retry_at || 0) <= now
          )
          .sort((a, b) => a.id - b.id)
      );
    };
    req.onerror = () => reject(req.error);
  });
}

/** For the diagnostics panel. */
export async function getDeadEvents() {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      resolve(
        (req.result || [])
          .filter((e) => e.status === STATUS.DEAD)
          .sort((a, b) => b.id - a.id)
      );
    };
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------
export async function updateEventStatus(id, status, opts = {}) {
  const { errorMsg = null, httpStatus = null } = opts;
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const rec = getReq.result;
      if (!rec) { resolve(); return; }

      rec.status = status;
      rec.updated_at = Date.now();
      if (errorMsg) rec.error = errorMsg;
      if (httpStatus != null) rec.last_http_status = httpStatus;

      // Attempts increment ONLY on a FAILED transition
      if (status === STATUS.FAILED) {
        rec.attempts = (rec.attempts || 0) + 1;
        rec.next_retry_at = Date.now() + computeBackoffMs(rec.attempts);
        if (rec.attempts >= MAX_ATTEMPTS) {
          rec.status = STATUS.DEAD;
          rec.error = rec.error || `Exceeded ${MAX_ATTEMPTS} attempts`;
        }
      }

      const putReq = store.put(rec);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------
export async function clearSyncedEvents() {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      (req.result || []).forEach((e) => {
        if (e.status === STATUS.SYNCED) store.delete(e.id);
      });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Re-enqueue a DEAD event for one more round of retries. */
export async function reviveEvent(id) {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const rec = getReq.result;
      if (!rec) { resolve(false); return; }
      rec.status = STATUS.PENDING;
      rec.attempts = 0;
      rec.next_retry_at = 0;
      rec.error = null;
      rec.updated_at = Date.now();
      store.put(rec);
      tx.oncomplete = () => resolve(true);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/** Permanently discard a DEAD event. */
export async function dismissDeadEvent(id) {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// ---------------------------------------------------------------------------
// Convenience
// ---------------------------------------------------------------------------
export async function getOutboxCount() {
  const pending = await getPendingEvents();
  return pending.length;
}