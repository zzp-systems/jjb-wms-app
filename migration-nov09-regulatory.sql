-- ============================================================================
-- JJB WMS — Migration Nov 9, 2026: Regulatory / Traceability Columns
-- ============================================================================
-- Applies the 6-field regulatory patch from the v3 spec to an ALREADY-
-- DEPLOYED database. Fresh installs get these columns from schema.sql
-- directly; this file is only for databases created before Nov 9, 2026.
--
-- Idempotency: Not safe to re-run (SQLite has no IF NOT EXISTS for ALTER
-- TABLE ADD COLUMN). If you run twice, you'll get "duplicate column name"
-- errors — that's expected and harmless if the first run succeeded.
--
-- Precondition: coa_coc_status was added earlier via manual ALTER.
--               If not, uncomment the first ALTER below.
--
-- Apply:
--   npx wrangler d1 execute jjb-wms-db --remote --file=./migration-nov09-regulatory.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- receiving_reports — FDA / cGMP / BIR additions
-- ---------------------------------------------------------------------------
-- Uncomment ONLY if coa_coc_status doesn't already exist (it does on your DB)
-- ALTER TABLE receiving_reports ADD COLUMN coa_coc_status TEXT DEFAULT 'PENDING';

ALTER TABLE receiving_reports ADD COLUMN invoice_type TEXT;
ALTER TABLE receiving_reports ADD COLUMN invoice_number TEXT;
ALTER TABLE receiving_reports ADD COLUMN receiving_temp_check TEXT;
ALTER TABLE receiving_reports ADD COLUMN supplier_id TEXT REFERENCES suppliers(id);

CREATE INDEX IF NOT EXISTS idx_recv_coa      ON receiving_reports(coa_coc_status);
CREATE INDEX IF NOT EXISTS idx_recv_supplier ON receiving_reports(supplier_id);

-- ---------------------------------------------------------------------------
-- withdrawals — production traceability
-- ---------------------------------------------------------------------------
ALTER TABLE withdrawals ADD COLUMN target_product_line TEXT;
CREATE INDEX IF NOT EXISTS idx_wd_target_line ON withdrawals(target_product_line);

-- ---------------------------------------------------------------------------
-- quarantine_ncr — FDA CAPA (Corrective and Preventive Action)
-- ---------------------------------------------------------------------------
ALTER TABLE quarantine_ncr ADD COLUMN deficiency_type TEXT;
ALTER TABLE quarantine_ncr ADD COLUMN root_cause_analysis TEXT;
ALTER TABLE quarantine_ncr ADD COLUMN capa_action TEXT;
CREATE INDEX IF NOT EXISTS idx_ncr_deficiency ON quarantine_ncr(deficiency_type);

-- ---------------------------------------------------------------------------
-- sync_events — device traceability
-- ---------------------------------------------------------------------------
ALTER TABLE sync_events ADD COLUMN terminal_id TEXT;

-- ---------------------------------------------------------------------------
-- audit_log — target entity traceability
-- ---------------------------------------------------------------------------
ALTER TABLE audit_log ADD COLUMN target_entity TEXT;

-- ---------------------------------------------------------------------------
-- Post-migration verification (run manually after the file applies)
-- ---------------------------------------------------------------------------
-- SELECT
--   (SELECT COUNT(*) FROM pragma_table_info('receiving_reports') WHERE name IN
--     ('coa_coc_status','invoice_type','invoice_number','receiving_temp_check','supplier_id')) AS recv_new_cols,
--   (SELECT COUNT(*) FROM pragma_table_info('withdrawals')       WHERE name = 'target_product_line')  AS wd_new_cols,
--   (SELECT COUNT(*) FROM pragma_table_info('quarantine_ncr')    WHERE name IN
--     ('deficiency_type','root_cause_analysis','capa_action'))   AS ncr_new_cols,
--   (SELECT COUNT(*) FROM pragma_table_info('sync_events')       WHERE name = 'terminal_id')         AS sync_new_cols,
--   (SELECT COUNT(*) FROM pragma_table_info('audit_log')         WHERE name = 'target_entity')       AS audit_new_cols;
-- Expected: recv=5, wd=1, ncr=3, sync=1, audit=1