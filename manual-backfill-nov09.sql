-- ============================================================================
-- Manual Backfill — Nov 9, 2026
-- 1. Preserve the Nov 6 INVENTORY_ZERO_OUT in audit_log (Option A + this)
-- 2. Record the Nov 9 manual receiving of 49 sacks of RM-FLR-003
--
-- Assumptions (edit before applying if any are wrong):
--   report_no:      RR-2026-NOV09-001
--   po_no:          PO-2026-NOV09-001
--   supplier:       Lucky Roma Trading (per CSV row for RM-FLR-003)
--   price:          ₱1,000/sack  (per CSV; materialsData.js has ₱1,120 — decide!)
--   qty:            49 sacks × 25 kg = 1,225 kg
--   expiry:         2027-06-30 (edit if the DR shows a different date)
--   bin_location:   Pallet A1
--   received_by:    jade
--   received_date:  2026-11-09 (PHT as entered)
--
-- Idempotent: each INSERT has a guard (WHERE NOT EXISTS, ON CONFLICT, or
-- INSERT OR IGNORE). Re-running after success is a no-op.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Preserve Nov 6 zero-out in audit_log
-- ---------------------------------------------------------------------------
INSERT INTO audit_log (timestamp, actor, role, action, details, is_test_data, created_at)
SELECT
  COALESCE(json_extract(payload, '$.timestamp'), '2026-11-06 08:33:59'),
  COALESCE(json_extract(payload, '$.actor'), 'Jade Q. Dela Cruz'),
  json_extract(payload, '$.role'),
  'INVENTORY_ZERO_OUT',
  COALESCE(json_extract(payload, '$.details'),
           'All warehouse materials reset to 0.00 for fresh production start.'),
  0,
  datetime('now')
FROM sync_events
WHERE event_type = 'WMS_AUDIT_EVENT'
  AND json_extract(payload, '$.action') = 'INVENTORY_ZERO_OUT'
  AND NOT EXISTS (
    SELECT 1 FROM audit_log
    WHERE action = 'INVENTORY_ZERO_OUT'
      AND timestamp = COALESCE(json_extract(payload, '$.timestamp'), '2026-11-06 08:33:59')
  );

-- Mark the source event as projected (backfill will skip it)
UPDATE sync_events
SET projected_at = datetime('now'), projection_error = 'MANUAL_BACKFILL_ZERO_OUT'
WHERE event_type = 'WMS_AUDIT_EVENT'
  AND json_extract(payload, '$.action') = 'INVENTORY_ZERO_OUT'
  AND projected_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Manual receiving — 49 sacks of RM-FLR-003 (Naga Rossa)
-- ---------------------------------------------------------------------------

-- 2a. Receiving header (report_no is PK → re-run skips)
INSERT OR IGNORE INTO receiving_reports
  (report_no, po_no, supplier, total_paid_centavos, received_by,
   received_date, received_time, is_test_data, coa_coc_status)
VALUES
  ('RR-2026-NOV09-001',
   'PO-2026-NOV09-001',
   'Lucky Roma Trading',
   4900000,        -- ₱49,000.00 = 49 × ₱1,000/sack × 100
   'jade',
   '2026-11-09',
   '08:00',
   0,
   'PENDING');

-- 2b. Receiving line item (guard against re-insert on re-run)
INSERT INTO receiving_items
  (report_no, material_code, material_name_snapshot, lot_number, expiry_date,
   secondary_qty, bin_location, unit_cost_centavos, is_test_data)
SELECT
  'RR-2026-NOV09-001',
  'RM-FLR-003',
  '1st Class Hard Wheat Flour (Naga Rossa - Asian Grains Corp)',
  'LOT-RMFLR003-NOV09',
  '2027-06-30',
  1225,           -- 49 sacks × 25 kg
  'Pallet A1',
  4000,           -- ₱40/kg = ₱1,000 ÷ 25 kg × 100
  0
WHERE NOT EXISTS (
  SELECT 1 FROM receiving_items
  WHERE report_no = 'RR-2026-NOV09-001'
    AND material_code = 'RM-FLR-003'
    AND lot_number = 'LOT-RMFLR003-NOV09'
);

-- 2c. New material lot (UNIQUE(material_code, lot_number) → re-run skips)
INSERT OR IGNORE INTO material_lots
  (material_code, lot_number, expiry_date, qty_sec, location, is_test_data)
VALUES
  ('RM-FLR-003', 'LOT-RMFLR003-NOV09', '2027-06-30', 1225, 'Pallet A1', 0);

-- 2d. Reconcile current_balance from all non-test lots
UPDATE materials
SET current_balance = COALESCE((
      SELECT ROUND(SUM(qty_sec), 4) FROM material_lots
      WHERE material_code = 'RM-FLR-003' AND is_test_data = 0
    ), 0),
    updated_at = datetime('now')
WHERE code = 'RM-FLR-003';

-- 2e. Synthetic sync_events row (idempotency_key is UNIQUE → re-run skips)
INSERT OR IGNORE INTO sync_events
  (idempotency_key, event_type, payload, projected_at, projection_error, synced_to_gas)
VALUES
  ('MANUAL_BACKFILL_RECEIVING_20261109_001',
   'RECEIVING_SAVED',
   json_object(
     'reportNo', 'RR-2026-NOV09-001',
     'poNo', 'PO-2026-NOV09-001',
     'supplier', 'Lucky Roma Trading',
     'date', '2026-11-09',
     'time', '08:00',
     'receivedBy', 'jade',
     'totalPaid', 49000.00,
     'items', json_array(json_object(
       'materialCode', 'RM-FLR-003',
       'name', '1st Class Hard Wheat Flour (Naga Rossa - Asian Grains Corp)',
       'lotNumber', 'LOT-RMFLR003-NOV09',
       'expiryDate', '2027-06-30',
       'secondaryQty', 1225,
       'unitCost', 40.00,
       'binLocation', 'Pallet A1'
     ))
   ),
   datetime('now'),
   'MANUAL_BACKFILL_RECEIVING',
   1);