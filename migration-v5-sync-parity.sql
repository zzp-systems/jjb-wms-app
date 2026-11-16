-- ============================================================================
-- JJB WMS — Migration v5: Batch Orders Cutoff Columns & Withdrawal Requests
-- Target: Cloudflare D1 (SQLite) · Database: jjb-wms-db
-- Apply:  npx wrangler d1 execute jjb-wms-db --remote --file=./migration-v5-sync-parity.sql
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. Add 3:00 PM PHT cut-off, grouping, cost, and notes columns to batch_orders
ALTER TABLE batch_orders ADD COLUMN scheduled_scaling_date TEXT;
ALTER TABLE batch_orders ADD COLUMN scheduled_delivery_date TEXT;
ALTER TABLE batch_orders ADD COLUMN is_after_cutoff INTEGER DEFAULT 0;
ALTER TABLE batch_orders ADD COLUMN cutoff_status_label TEXT;
ALTER TABLE batch_orders ADD COLUMN group_order_ref TEXT;
ALTER TABLE batch_orders ADD COLUMN estimated_cost INTEGER DEFAULT 0;
ALTER TABLE batch_orders ADD COLUMN notes TEXT;

CREATE INDEX IF NOT EXISTS idx_batch_group_ref ON batch_orders(group_order_ref);
CREATE INDEX IF NOT EXISTS idx_batch_delivery_date ON batch_orders(scheduled_delivery_date);

-- 2. First-class table for portal raw material requisitions (Form-WAR-001)
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  request_id TEXT PRIMARY KEY,
  withdrawal_no TEXT,
  withdrawal_date TEXT,
  submitted_at TEXT,
  requesting_line TEXT,
  department TEXT,
  purpose TEXT,
  requisitioned_by TEXT,
  notes TEXT,
  total_cost_centavos INTEGER DEFAULT 0,
  status TEXT DEFAULT 'PENDING_ISSUANCE',
  items_json TEXT,
  issued_slip_no TEXT,
  cancelled_reason TEXT,
  cancelled_by TEXT,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_wreq_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_wreq_date ON withdrawal_requests(withdrawal_date);