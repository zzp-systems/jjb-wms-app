-- ============================================================================
-- JJB WMS — D1 Schema (v3 Path-B / Phase 1)
-- Target: Cloudflare D1 (SQLite) · Database: jjb-wms-db
-- Apply:  npx wrangler d1 execute jjb-wms-db --remote --file=./schema.sql
--
-- Conventions
--   System timestamps (created_at / updated_at)  -> UTC
--   Business date/time fields (received_*, etc.) -> PHT as entered
--   Money                                         -> INTEGER centavos,
--                                                    always per secondary_uom
--   is_test_data                                  -> 1 on operational tables,
--                                                    omitted on roles/system_config
--                                                    and sync_events
--
-- FK policy
--   Master-data junctions (recipe_ingredients, specialty_recipe_ingredients)
--   and master->master links (materials.room, batch_orders.recipe_sku) keep
--   strict FKs by design.
--   Historical transaction data (receiving_items, withdrawal_items,
--   adjustments, quarantine_ncr) uses ON DELETE SET NULL on material_code
--   with a *_name_snapshot column.
--
-- Path-B additions vs Phase 1 baseline
--   * v_material_balance_reconciliation view (from v3.1)
--   * idx_sri_proposal on specialty_recipe_ingredients(proposal_id) (v3.1)
--   * UNIQUE(material_code, lot_number) on material_lots (required by sync.js)
--   * projected_at / projection_error on sync_events (required by sync.js)
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- A2 roles  (reference data — no is_test_data; seeds included)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  role_key TEXT PRIMARY KEY,
  role_name TEXT NOT NULL,
  can_delete_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);
INSERT OR IGNORE INTO roles (role_key, role_name, can_delete_test_data) VALUES
  ('WAREHOUSE_SUPERVISOR', 'Warehouse Supervisor', 0),
  ('BATCHING_PREPARER',    'Batching Preparer',    0),
  ('PURCHASING_MANAGER',   'Purchasing Manager',   0),
  ('QA_DIRECTOR',          'QA Director',          0),
  ('ADMIN_COA',            'Admin / COA',          1),
  ('SYSTEMS_DIRECTOR',     'Systems Director',     1);

-- ---------------------------------------------------------------------------
-- A1 users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  shift_pin_hash TEXT,
  name TEXT NOT NULL,
  title TEXT,
  station TEXT,
  role_category TEXT REFERENCES roles(role_key),
  avatar_bg TEXT,
  badge_color TEXT,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  last_login_at TEXT,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

-- ---------------------------------------------------------------------------
-- A4 storage_rooms
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS storage_rooms (
  name TEXT PRIMARY KEY,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

-- ---------------------------------------------------------------------------
-- A9 suppliers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  is_active INTEGER DEFAULT 1,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

-- ---------------------------------------------------------------------------
-- A3 materials
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materials (
  code TEXT PRIMARY KEY,
  category TEXT,
  brand TEXT,
  name TEXT NOT NULL,
  supplier TEXT,
  room TEXT REFERENCES storage_rooms(name),
  primary_uom TEXT,
  secondary_uom TEXT,
  conversion_factor REAL,
  threshold REAL,
  unit_cost_centavos INTEGER,
  current_balance REAL DEFAULT 0,
  packaging_note TEXT,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_materials_room     ON materials(room);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);

-- ---------------------------------------------------------------------------
-- A5 material_lots  (UNIQUE required by sync.js ON CONFLICT upsert)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS material_lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_code TEXT NOT NULL REFERENCES materials(code) ON DELETE CASCADE,
  lot_number TEXT NOT NULL,
  expiry_date TEXT,
  qty_sec REAL NOT NULL,
  location TEXT,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE(material_code, lot_number)
);
CREATE INDEX IF NOT EXISTS idx_lots_material_expiry ON material_lots(material_code, expiry_date);

-- ---------------------------------------------------------------------------
-- A6 recipes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recipes (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  target_facility TEXT,
  standard_batch_flour_kg REAL,
  unit_piece_yield INTEGER,
  dough_exit_temp_target TEXT,
  ccp1_lethality_target TEXT,
  water_activity_limit TEXT,
  unit_production_cost_centavos INTEGER,
  wholesale_transfer_price_centavos INTEGER,
  srp_centavos INTEGER,
  gross_margin_pct REAL,
  is_custom_specialty INTEGER DEFAULT 0,
  approved_by TEXT,
  approved_at TEXT,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

-- ---------------------------------------------------------------------------
-- A7 recipe_ingredients  (is_packaging added in Phase 1 / Catch 2)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_sku TEXT NOT NULL REFERENCES recipes(sku) ON DELETE CASCADE,
  material_code TEXT REFERENCES materials(code),
  ingredient_name_snapshot TEXT,
  pct REAL,
  grams_per_batch REAL,
  is_water INTEGER DEFAULT 0,
  is_as_needed INTEGER DEFAULT 0,
  is_packaging INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_ri_recipe ON recipe_ingredients(recipe_sku);

-- ---------------------------------------------------------------------------
-- A8 outlets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outlets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  contact_person TEXT,
  is_active INTEGER DEFAULT 1,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

-- ---------------------------------------------------------------------------
-- B1 receiving_reports + C1 receiving_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS receiving_reports (
  report_no TEXT PRIMARY KEY,
  po_no TEXT,
  supplier TEXT,
  total_paid_centavos INTEGER,
  received_by TEXT REFERENCES users(id),
  received_date TEXT,
  received_time TEXT,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS receiving_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_no TEXT NOT NULL REFERENCES receiving_reports(report_no) ON DELETE CASCADE,
  material_code TEXT REFERENCES materials(code) ON DELETE SET NULL,
  material_name_snapshot TEXT,
  lot_number TEXT,
  expiry_date TEXT,
  secondary_qty REAL,
  bin_location TEXT,
  unit_cost_centavos INTEGER,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_recv_items_report ON receiving_items(report_no);

-- ---------------------------------------------------------------------------
-- B2 withdrawals + C2 withdrawal_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS withdrawals (
  slip_no TEXT PRIMARY KEY,
  withdrawal_date TEXT,
  withdrawal_time TEXT,
  requesting_entity TEXT,
  department TEXT,
  purpose TEXT,
  requested_by TEXT,
  issued_by TEXT REFERENCES users(id),
  received_by TEXT,
  total_cost_centavos INTEGER,
  status TEXT,
  notes TEXT,
  source_channel TEXT,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS withdrawal_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slip_no TEXT NOT NULL REFERENCES withdrawals(slip_no) ON DELETE CASCADE,
  material_code TEXT REFERENCES materials(code) ON DELETE SET NULL,
  name_snapshot TEXT,
  qty_requested_sec REAL,
  qty_issued_sec REAL,
  secondary_uom TEXT,
  lot_number TEXT,
  storage_room TEXT,
  estimated_cost_centavos INTEGER,
  remarks TEXT,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_wd_items_slip ON withdrawal_items(slip_no);

-- ---------------------------------------------------------------------------
-- B3 batch_orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batch_orders (
  order_id TEXT PRIMARY KEY,
  outlet_name TEXT,
  recipe_sku TEXT REFERENCES recipes(sku),
  recipe_name_snapshot TEXT,
  requested_qty_pcs INTEGER,
  batch_multiplier REAL,
  status TEXT,
  bulk_request_status TEXT,
  bulk_requisition_slip_no TEXT,
  bulk_requested_at TEXT,
  bulk_approved_at TEXT,
  bulk_approved_by TEXT,
  batch_tag_id TEXT,
  actual_batched_kg REAL,
  actual_batched_units INTEGER,
  batched_at TEXT,
  batched_by TEXT,
  scale_used TEXT,
  sifter_40mesh_checked INTEGER DEFAULT 0,
  released_at TEXT,
  released_to TEXT,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_batch_status ON batch_orders(status);

-- ---------------------------------------------------------------------------
-- B4 adjustments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_code TEXT REFERENCES materials(code) ON DELETE SET NULL,
  material_name_snapshot TEXT,
  adjustment_type TEXT,
  qty_sec REAL,
  uom TEXT,
  reason TEXT,
  adjusted_by TEXT REFERENCES users(id),
  adjusted_at TEXT,
  notes TEXT,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

-- ---------------------------------------------------------------------------
-- B5 quarantine_ncr
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quarantine_ncr (
  ncr_no TEXT PRIMARY KEY,
  item_description TEXT,
  lot_number TEXT,
  material_code TEXT REFERENCES materials(code) ON DELETE SET NULL,
  material_name_snapshot TEXT,
  qty_sec REAL,
  reason TEXT,
  status TEXT,
  filed_by TEXT REFERENCES users(id),
  filed_at TEXT,
  disposition TEXT,
  disposition_by TEXT,
  disposition_at TEXT,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

-- ---------------------------------------------------------------------------
-- B6 orders + C3 order_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  order_id TEXT PRIMARY KEY,
  customer_or_outlet TEXT,
  contact_person TEXT,
  channel TEXT,
  status TEXT,
  order_date TEXT,
  total_cost_centavos INTEGER,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  name TEXT,
  sku TEXT,
  qty REAL,
  unit_cost_centavos INTEGER,
  line_total_centavos INTEGER,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ---------------------------------------------------------------------------
-- B7 specialty_recipe_proposals + C4 specialty_recipe_ingredients
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS specialty_recipe_proposals (
  proposal_id TEXT PRIMARY KEY,
  sku TEXT UNIQUE,
  title TEXT,
  name TEXT,
  category TEXT,
  target_facility TEXT,
  requesting_location TEXT,
  baker_name TEXT,
  standard_batch_flour_kg REAL,
  unit_piece_yield INTEGER,
  piece_weight_grams REAL,
  dough_exit_temp_target TEXT,
  ccp1_lethality_target TEXT,
  water_activity_limit TEXT,
  unit_production_cost_centavos INTEGER,
  wholesale_transfer_price_centavos INTEGER,
  srp_centavos INTEGER,
  gross_margin_pct REAL,
  mixing_notes TEXT,
  status TEXT DEFAULT 'PENDING_APPROVAL',
  submitted_at TEXT,
  approved_at TEXT,
  approved_by TEXT,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS specialty_recipe_ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id TEXT NOT NULL REFERENCES specialty_recipe_proposals(proposal_id) ON DELETE CASCADE,
  material_code TEXT REFERENCES materials(code),
  ingredient_name_snapshot TEXT,
  pct REAL,
  grams_per_batch REAL,
  is_water INTEGER DEFAULT 0,
  is_as_needed INTEGER DEFAULT 0,
  is_packaging INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sri_proposal ON specialty_recipe_ingredients(proposal_id);

-- ---------------------------------------------------------------------------
-- D1 audit_log  (immutable — append only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  actor TEXT,
  role TEXT,
  action TEXT NOT NULL,
  details TEXT,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- D2 sync_events  (projected_at / projection_error required by sync.js)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  synced_to_gas INTEGER DEFAULT 0,
  projected_at TEXT,
  projection_error TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_events_idempotency ON sync_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_sync_events_created     ON sync_events(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_events_synced      ON sync_events(synced_to_gas);

-- ---------------------------------------------------------------------------
-- D3 admin_action_log  (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_action_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  record_snapshot TEXT,
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- E1 system_config  (reference/config — no is_test_data)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_config (
  config_key TEXT PRIMARY KEY,
  config_value TEXT,
  description TEXT,
  updated_by TEXT REFERENCES users(id),
  updated_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Analytical View (from v3.1) — Perpetual book balance vs active FEFO lot sum
-- ---------------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_material_balance_reconciliation AS
SELECT
  m.code                                                           AS material_code,
  m.name                                                           AS material_name,
  m.secondary_uom,
  m.current_balance                                                AS book_balance_sec,
  COALESCE(ROUND(SUM(CASE WHEN l.is_test_data = 0 THEN l.qty_sec ELSE 0 END), 4), 0)
                                                                   AS active_lot_sum_sec,
  ROUND(
    m.current_balance
    - COALESCE(SUM(CASE WHEN l.is_test_data = 0 THEN l.qty_sec ELSE 0 END), 0),
    4
  )                                                                AS variance_sec
FROM materials m
LEFT JOIN material_lots l ON l.material_code = m.code
WHERE m.is_test_data = 0
GROUP BY m.code, m.name, m.secondary_uom, m.current_balance;