CREATE TABLE IF NOT EXISTS sync_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  synced_to_gas INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sync_events_idempotency ON sync_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_sync_events_created ON sync_events(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_events_synced ON sync_events(synced_to_gas);
