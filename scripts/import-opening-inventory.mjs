/**
 * ============================================================================
 * JJB WMS — Opening Inventory CSV → SQL Importer
 * ============================================================================
 * Usage:
 *   node scripts/import-opening-inventory.mjs
 *   → writes ./opening-inventory.sql
 *
 *   node scripts/import-opening-inventory.mjs --strict
 *   → errors if CSV contains codes not in materialsData.js
 *
 * Apply:
 *   npx wrangler d1 execute jjb-wms-db --local  --file=./opening-inventory.sql
 *   npx wrangler d1 execute jjb-wms-db --remote --file=./opening-inventory.sql
 *
 * Assumes schema.sql + seed.sql (from materialsData.js) are already applied.
 * The importer emits INSERT OR IGNORE — safe to re-run, never overwrites
 * material master rows from materialsData.js.
 * ============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT_DIR   = path.resolve(__dirname, '..');
const STRICT     = process.argv.includes('--strict');

// ---- Configured fixes (all overrides are now empty — CSV is source of truth)
//
// HISTORY:
//   - 'RM-FAT-001@7' → 'RM-FAT-007'  (obsolete — CSV row 7 is already RM-FAT-007)
//   - 'RM-FAT-007@7' lot override     (obsolete — CSV already has LOT-RMFAT007-INIT)
//   - 'RM-DRY-007' → 18.72            (obsolete and DESTRUCTIVE — CSV was corrected
//                                       to Tin Can / 0.39, and this override would
//                                       force Tin Can / 18.72 which is physically
//                                       impossible: no tin can weighs 18.72 kg)
//
// If a future CSV needs a temporary in-flight correction, add it here with a
// clear comment explaining what value the CSV should eventually be edited to.
// ----------------------------------------------------------------------------
const CODE_OVERRIDES = {
  // (empty — codes come directly from the CSV)
};
const LOT_OVERRIDES = {
  // (empty — lot numbers come directly from the CSV)
};
const CONVERSION_OVERRIDES = {
  // (empty — conversion factors come directly from the CSV)
};
const SUPPLIER_ALIASES = {
  // Multi-spelling normalization — same company, different CSV spellings
  'Davao Great Wall Trading': 'Davao Great Wall Trading, Inc.',
};

// ---- CSV parser (RFC 4180, handles quoted commas and peso signs) ----------
function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c === '\r') { /* skip */ }
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// ---- Field normalizers ----------------------------------------------------
function money(raw) {
  if (!raw || raw === '—' || raw === '-') return null;
  const clean = String(raw).replace(/[₱,\s]/g, '');
  const n = Number(clean);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function numberField(raw) {
  if (!raw || raw === '—' || raw === '-') return null;
  const n = Number(String(raw).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'unknown';
}

function sqlVal(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number')  return Number.isFinite(v) ? String(v) : 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

// ---- Load materialsData.js for validation --------------------------------
async function loadMaterialsData() {
  const p = path.join(ROOT_DIR, 'src/data/materialsData.js');
  if (!fs.existsSync(p)) {
    console.warn('[WARN] materialsData.js not found — validation disabled');
    return { codes: new Set() };
  }
  const mod = await import(pathToFileURL(p).href);
  const list = mod.MASTER_MATERIALS || mod.MATERIALS || mod.default || [];
  const codes = new Set(list.map(m => m.code).filter(Boolean));
  return { codes };
}

// ---- Main -----------------------------------------------------------------
async function main() {
  const csvPath = path.join(ROOT_DIR, 'JJB_Opening_Inventory_Template_2026-11-08.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV not found: ${csvPath}`);
    process.exit(1);
  }
  const csv = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(csv);

  if (rows.length < 2) {
    console.error('❌ CSV appears empty');
    process.exit(1);
  }

  const headers = rows[0].map(h => h.trim());
  const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
  const get = (row, name) => row[idx[name]] ?? '';

  const { codes: knownCodes } = await loadMaterialsData();
  const errors = [];
  const warnings = [];
  const materials = new Map();   // code -> row data (deduped)
  const lots = [];
  const suppliers = new Map();
  const rooms = new Set();

  rows.slice(1).forEach((row, i) => {
    const csvRow = i + 2;  // header is row 1 in the file
    if (!row.length || !row[0]) return;

    let code = get(row, 'Material Code').trim();
    const desc = get(row, 'Description').trim();

    // Apply code overrides
    const overrideKey = `${code}@${csvRow}`;
    if (CODE_OVERRIDES[overrideKey]) code = CODE_OVERRIDES[overrideKey];

    let lotNumber = get(row, 'Lot Number').trim();
    if (LOT_OVERRIDES[`${code}@${csvRow}`]) lotNumber = LOT_OVERRIDES[`${code}@${csvRow}`];

    let conv = numberField(get(row, 'Conversion Factor')) ?? 1;
    if (CONVERSION_OVERRIDES[code]) conv = CONVERSION_OVERRIDES[code];

    let supplier = get(row, 'Primary Supplier').trim();
    if (SUPPLIER_ALIASES[supplier]) supplier = SUPPLIER_ALIASES[supplier];

    const room = get(row, 'Storage Room').trim();
    rooms.add(room);
    suppliers.set(slugify(supplier), supplier);

    const countSec = numberField(get(row, 'Count Secondary Units')) ?? 0;
    const expiry = get(row, 'Expiration Date').trim();
    const location = get(row, 'Storage Location').trim();
    const unitCost = money(get(row, 'Price (PHP)'));

    // Validate against materialsData.js
    if (knownCodes.size && !knownCodes.has(code)) {
      const msg = `Row ${csvRow}: code ${code} ("${desc}") not in materialsData.js`;
      if (STRICT) errors.push(msg); else warnings.push(msg);
    }

    if (materials.has(code)) {
      const prevDesc = materials.get(code).name;
      if (prevDesc !== desc) {
        errors.push(`Row ${csvRow}: duplicate code ${code} — already used for "${prevDesc}"`);
        return;
      }
    }

    materials.set(code, {
      code,
      name: desc,
      category: get(row, 'Category').trim() || 'Uncategorized',
      room,
      primary_uom: get(row, 'Primary Unit').trim() || 'Unit',
      secondary_uom: get(row, 'Secondary Unit').trim() || 'kg',
      conversion_factor: conv,
      unit_cost_centavos: unitCost,
      supplier,
    });

    if (countSec > 0) {
      lots.push({
        material_code: code,
        lot_number: lotNumber,
        expiry_date: expiry || null,
        qty_sec: countSec,
        location: location || room,
      });
    } else {
      warnings.push(`Row ${csvRow}: ${code} has 0 stock — no material_lots row emitted`);
    }
  });

  // ---- Report ------------------------------------------------------------
  console.log('📊 Import summary');
  console.log(`   Materials:   ${materials.size}`);
  console.log(`   Lots:        ${lots.length}`);
  console.log(`   Suppliers:   ${suppliers.size}`);
  console.log(`   Rooms:       ${rooms.size}`);
  if (warnings.length) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(w => console.log(`   • ${w}`));
  }
  if (errors.length) {
    console.log('\n❌ Errors:');
    errors.forEach(e => console.log(`   • ${e}`));
    process.exit(1);
  }

  // ---- Emit SQL ----------------------------------------------------------
  const L = [
    '-- ============================================================================',
    '-- JJB WMS — Opening Inventory (auto-generated from CSV)',
    `-- Generated: ${new Date().toISOString()}`,
    '-- Source: JJB_Opening_Inventory_Template_2026-11-08.csv',
    `-- Materials: ${materials.size} · Lots: ${lots.length} · Suppliers: ${suppliers.size}`,
    '-- All INSERT OR IGNORE — safe to re-run, never overwrites seed.sql rows',
    '-- ============================================================================',
    '',
    '-- Suppliers referenced by the CSV',
  ];

  for (const [id, name] of suppliers.entries()) {
    L.push(`INSERT OR IGNORE INTO suppliers (id, name, is_active) VALUES (${sqlVal(id)}, ${sqlVal(name)}, 1);`);
  }

  L.push('', '-- Storage rooms referenced by the CSV');
  let sort = 1;
  for (const room of rooms) {
    L.push(`INSERT OR IGNORE INTO storage_rooms (name, description, sort_order, is_active) VALUES (${sqlVal(room)}, ${sqlVal(`Indangan Facility - ${room}`)}, ${sort++}, 1);`);
  }

  L.push('', '-- Material master rows (INSERT OR IGNORE — seed.sql values preserved)');
  for (const m of materials.values()) {
    L.push(
      `INSERT OR IGNORE INTO materials (code, category, name, supplier, room, primary_uom, secondary_uom, conversion_factor, unit_cost_centavos, is_test_data) VALUES (` +
      [
        sqlVal(m.code), sqlVal(m.category), sqlVal(m.name), sqlVal(m.supplier),
        sqlVal(m.room), sqlVal(m.primary_uom), sqlVal(m.secondary_uom),
        sqlVal(m.conversion_factor), sqlVal(m.unit_cost_centavos), 0,
      ].join(', ') + ');'
    );
  }

  L.push('', '-- Opening inventory lots');
  for (const l of lots) {
    L.push(
      `INSERT OR IGNORE INTO material_lots (material_code, lot_number, expiry_date, qty_sec, location, is_test_data) VALUES (` +
      [
        sqlVal(l.material_code), sqlVal(l.lot_number), sqlVal(l.expiry_date),
        sqlVal(l.qty_sec), sqlVal(l.location), 0,
      ].join(', ') + ');'
    );
  }

  L.push('', '-- Reconcile current_balance from freshly imported non-test lots');
  L.push(`
UPDATE materials
SET current_balance = COALESCE((
      SELECT ROUND(SUM(qty_sec), 4) FROM material_lots
      WHERE material_lots.material_code = materials.code
        AND material_lots.is_test_data = 0
    ), 0),
    updated_at = datetime('now')
WHERE is_test_data = 0;
`.trim());

  L.push('', '-- Post-import sanity check (run this SELECT and confirm 0 rows)');
  L.push(`
SELECT material_code, book_balance_sec, active_lot_sum_sec, variance_sec
FROM v_material_balance_reconciliation
WHERE variance_sec != 0;
`.trim());

  const outPath = path.join(ROOT_DIR, 'opening-inventory.sql');
  fs.writeFileSync(outPath, L.join('\n') + '\n', 'utf8');
  console.log(`\n✅ Wrote ${outPath}`);
  console.log(`   Apply: npx wrangler d1 execute jjb-wms-db --remote --file=./opening-inventory.sql`);
}

main().catch(err => { console.error('❌ Failed:', err); process.exit(1); });