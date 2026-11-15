CREATE TABLE IF NOT EXISTS fg_lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_sku TEXT NOT NULL REFERENCES recipes(sku),
  lot_number TEXT NOT NULL,
  production_date TEXT,
  expiry_date TEXT,
  qty_pieces INTEGER NOT NULL DEFAULT 0,
  qty_boxes INTEGER DEFAULT 0,
  qa_status TEXT NOT NULL DEFAULT 'PENDING',
  qa_approved_by TEXT,
  qa_approved_at TEXT,
  storage_location TEXT,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE(product_sku, lot_number)
);

CREATE INDEX IF NOT EXISTS idx_fg_lots_sku_qa ON fg_lots(product_sku, qa_status);

CREATE TABLE IF NOT EXISTS delivery_shipments (
  shipment_id TEXT PRIMARY KEY,
  delivery_date TEXT NOT NULL,
  loading_time TEXT,
  vehicle_plate TEXT,
  driver_name TEXT,
  origin_warehouse TEXT NOT NULL,
  destination_type TEXT NOT NULL,
  destination_outlet_id TEXT,
  destination_client_name TEXT,
  recipient_name TEXT,
  status TEXT NOT NULL DEFAULT 'PLANNED',
  notes TEXT,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_delivery_date ON delivery_shipments(delivery_date);

CREATE TABLE IF NOT EXISTS delivery_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id TEXT NOT NULL REFERENCES delivery_shipments(shipment_id) ON DELETE CASCADE,
  fg_lot_id INTEGER NOT NULL REFERENCES fg_lots(id),
  qty_loaded INTEGER NOT NULL,
  qty_received INTEGER DEFAULT 0,
  quality_status TEXT,
  remarks TEXT,
  is_test_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(shipment_id, fg_lot_id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_items_shipment ON delivery_items(shipment_id);