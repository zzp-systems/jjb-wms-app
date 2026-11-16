-- ──────────────────────────────────────────────────────────
-- JJB WMS — Users & Auth Migration v4
-- Creates users table + audit_log table for WMS user management.
--
-- No admin seed needed — the CRM proxy creates WMS users
-- by forwarding the CRM admin's JWT (shared JWT_SECRET).
-- The WMS middleware verifies the JWT and grants admin access.
--
-- Run:
--   npx wrangler d1 execute jjb-wms-db --remote --file=migration-v4-users.sql
-- ──────────────────────────────────────────────────────────

-- ── Users table (same schema as CRM and ARAP) ──
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  role_category TEXT DEFAULT 'viewer',
  password_hash TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ── Audit log table (same schema as CRM and ARAP) ──
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor TEXT,
  role TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- ── Verify ──
-- SELECT COUNT(*) as total FROM users;
-- Expected: total=0 (users created via CRM proxy)
