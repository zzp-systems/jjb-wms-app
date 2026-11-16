-- ──────────────────────────────────────────────────────────
-- JJB WMS — Master Product SKU & Pricing Seed v2
-- 22 product SKUs with wholesale/SRP pricing in centavos
--
-- Run AFTER migration-v2-tax.sql:
--   npx wrangler d1 execute jjb-wms-db --remote --file=seed-v2-products.sql
--
-- All products are processed/manufactured food = is_vat_exempt = 0 (12% VATable)
-- Pricing stored as integer centavos (₱1.00 = 100)
-- ──────────────────────────────────────────────────────────

-- ── Product Master ──
-- Uses INSERT OR IGNORE to avoid duplicating existing materials
-- code = SKU, unit_cost_centavos = Depo/Wholesale price

INSERT OR IGNORE INTO materials (code, name, category, primary_uom, unit_cost_centavos, is_vat_exempt, is_test_data)
VALUES
-- ── Manufactured Line (Own) ──
('BISCOCHO',          'Biscocho',            'Manufactured Line (Own)', 'Pack',       9000,  0, 0),
('OTAP',               'Otap',                'Manufactured Line (Own)', 'Pack',       7000,  0, 0),
('BANANA-SWEET',       'Banana Sweet',        'Manufactured Line (Own)', 'Pack',       7000,  0, 0),
('BANANA-ORDINARY',    'Banana Ordinary',     'Manufactured Line (Own)', 'Pack',       7000,  0, 0),
('BANANA-SOUR',        'Banana Sour',         'Manufactured Line (Own)', 'Pack',       7000,  0, 0),
('BANANA-CHEESE',      'Banana Cheese',       'Manufactured Line (Own)', 'Pack',       7000,  0, 0),
('BANANA-UNSWEET',     'Banana Unsweet',      'Manufactured Line (Own)', 'Pack',       7000,  0, 0),
('TOASTED-ORIGINAL',   'Toasted Original',    'Manufactured Line (Own)', 'Pack',       6000,  0, 0),
('TOASTED-GARLIC',     'Toasted Garlic',       'Manufactured Line (Own)', 'Pack',       6000,  0, 0),
('TOASTED-ONION',      'Toasted Onion',        'Manufactured Line (Own)', 'Pack',       6000,  0, 0),
('PEANUT-SINGLE',      'Peanut Single',        'Manufactured Line (Own)', 'Single Pack',2800,  0, 0),
('PEANUT-PACK-X4',     'Peanut Pack x 4',      'Manufactured Line (Own)', 'Bundle of 4',11000, 0, 0),
('PEANUT-BUTTER-SM',   'Peanut Butter (Small)','Manufactured Line (Own)', 'Jar',       5000,  0, 0),
('PEANUT-BUTTER-BG',   'Peanut Butter (Big)',  'Manufactured Line (Own)', 'Jar',       8500,  0, 0),
('BANANA-CHIPS-60G',   'Banana Chips (60 g)',  'Manufactured Line (Own)', 'Pouch',     3000,  0, 0),

-- ── Partner Goods (Trading) ──
('PRAWNS-ORIGINAL',    'Prawns Original',      'Partner Goods (Trading)', 'Pack',       4500,  0, 0),
('PRAWNS-SPICY-VINEGAR','Prawns Spicy Vinegar','Partner Goods (Trading)', 'Pack',       4500,  0, 0),
('FISH-CRACKER',       'Fish Cracker',         'Partner Goods (Trading)', 'Pack',       4000,  0, 0),

-- ── Secondary / Outlet Lines ──
('TAMARIND',           'Tamarind',             'Secondary / Outlet Lines','Pack',       3500,  0, 0),
('PATATA',             'Patata',               'Secondary / Outlet Lines','Pack',       4000,  0, 0),
('MISCUT',             'Miscut',               'Secondary / Outlet Lines','Kilo',       5000,  0, 0),
('TAPYAS',             'Tapyas',               'Secondary / Outlet Lines','Kilo',       5000,  0, 0);

-- ── Note: SRP (Supermarket price) is not stored in the materials table ──
-- The WMS materials table stores unit_cost_centavos (Depo/Wholesale).
-- SRP can be stored in a separate pricing column or managed in the CRM
-- product cache. If your materials table has a wholesale_price column,
-- you can add the SRP values there. For now, the Depo/Wholesale price
-- is used as the unit cost for ARAP COGS calculations.
--
-- SRP reference (for manual use):
--   Biscocho: ₱110.00 (11000 centavos)
--   Otap: ₱80.00 (8000 centavos)
--   Banana Sweet: ₱80.00 (8000 centavos)
--   Banana Ordinary: ₱75.00 (7500 centavos)
--   Banana Sour: ₱75.00 (7500 centavos)
--   Banana Cheese: ₱75.00 (7500 centavos)
--   Banana Unsweet: ₱75.00 (7500 centavos)
--   Toasted Original: ₱70.00 (7000 centavos)
--   Toasted Garlic: ₱70.00 (7000 centavos)
--   Toasted Onion: ₱70.00 (7000 centavos)
--   Peanut Single: ₱35.00 (3500 centavos)
--   Peanut Pack x 4: ₱120.00 (12000 centavos)
--   Peanut Butter (Small): ₱65.00 (6500 centavos)
--   Peanut Butter (Big): ₱110.00 (11000 centavos)
--   Banana Chips (60g): ₱40.00 (4000 centavos)
--   Prawns Original: ₱60.00 (6000 centavos)
--   Prawns Spicy Vinegar: ₱60.00 (6000 centavos)
--   Fish Cracker: ₱50.00 (5000 centavos)
--   Tamarind: ₱45.00 (4500 centavos)
--   Patata: ₱50.00 (5000 centavos)
--   Miscut: ₱65.00 (6500 centavos)
--   Tapyas: ₱65.00 (6500 centavos)

-- ── Verify count ──
-- SELECT COUNT(*) as total_products, SUM(is_vat_exempt) as vat_exempt_count FROM materials WHERE is_test_data = 0;
