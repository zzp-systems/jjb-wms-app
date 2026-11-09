// ============================================================================
// JJB WMS Service Worker — v4.6.3
//
// Strategy:
//   - API routes (/api/*)      → network-only (never cache, always fresh)
//   - Hashed assets (/assets/*) → cache-first (immutable filenames, safe forever)
//   - Everything else           → network-first with cache fallback
//   - Cross-origin              → passthrough (never intercept; CDN handles itself)
//
// Version invalidation:
//   Bump CACHE_VERSION on every deploy. On activate, all old caches purge
//   automatically, forcing fresh fetches of everything on next page load.
// ============================================================================

const CACHE_VERSION = 'v4.6.3';
const STATIC_CACHE = `jjb-wms-static-${CACHE_VERSION}`;

// ---------------------------------------------------------------------------
// install — skipWaiting so a new SW takes over immediately instead of waiting
// for all tabs to close (which may never happen on a 24/7 floor tablet)
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

// ---------------------------------------------------------------------------
// activate — purge old version caches, claim active clients
// ---------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('jjb-wms-static-') && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// ---------------------------------------------------------------------------
// fetch — routing by path
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 1. Non-GET requests: passthrough. Never cache POST/PUT/DELETE.
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // 2. Cross-origin (CDN, GitHub raw, Apps Script): passthrough.
  //    SW cannot cache these safely — CORS, opaque responses, external
  //    availability. Let the browser's own HTTP cache handle them.
  if (url.origin !== self.location.origin) return;

  // 3. API routes: network-only. Never serve cached sync/admin responses.
  if (url.pathname.startsWith('/api/')) return;

  // 4. Hashed Vite assets: cache-first. Filename contains content hash,
  //    so a new build produces new filenames — old entries are dead weight
  //    that activate() already purges.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const clone = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, clone)).catch(() => {});
            }
            return res;
          })
          .catch(() => caches.match('/index.html'));
      })
    );
    return;
  }

  // 5. HTML, manifest, favicon, root — network-first with cache fallback.
  //    Always try fresh on nav; fall back to cached index.html for offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        // Last resort: cached index.html so React can boot and serve from
        // localStorage while offline.
        const fallback = await caches.match('/index.html');
        if (fallback) return fallback;
        // True no-network, no-cache: 503 with a readable body.
        return new Response('Offline — no cached version available', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});