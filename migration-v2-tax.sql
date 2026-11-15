-- ──────────────────────────────────────────────────────────
-- JJB WMS — Tax Compliance Migration v2
-- Adds VAT-exempt flag to materials so product sync can tell
-- CRM and ARAP whether an item is 12% VATable or VAT-Exempt.
--
-- Run AFTER your existing migration.sql:
--   npx wrangler d1 execute jjb-wms-db --remote --file=migration-v2-tax.sql
-- ──────────────────────────────────────────────────────────

-- Add VAT-exempt flag to materials (raw agricultural goods = 1)
-- 0 = VATable (12% VAT applies — processed/manufactured food)
-- 1 = VAT-Exempt (raw agricultural products: rice, fresh meat, veg, fish)
ALTER TABLE materials ADD COLUMN is_vat_exempt INTEGER DEFAULT 0;

-- Add supplier TIN column to suppliers table (if it exists)
-- This lets the WMS pass supplier TIN + VAT status to ARAP
-- If your suppliers table has a different name, adjust accordingly.
ALTER TABLE suppliers ADD COLUMN tin TEXT;
ALTER TABLE suppliers ADD COLUMN is_vat_registered INTEGER DEFAULT 1;

-- Index for VAT-exempt filtering
CREATE INDEX IF NOT EXISTS idx_materials_vat_exempt ON materials(is_vat_exempt);

-- ── Seed: Mark raw agricultural materials as VAT-Exempt ──
-- Adjust category names to match your actual materials data.
UPDATE materials SET is_vat_exempt = 1
  WHERE category IN ('Raw Materials', 'Agricultural', 'Fresh Produce')
     OR name LIKE '%rice%'
     OR name LIKE '%fresh %'
     OR name LIKE '%raw %';
