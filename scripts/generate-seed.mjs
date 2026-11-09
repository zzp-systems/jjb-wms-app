/**
 * ============================================================================
 * JJB WMS v4.6 — Offline D1 Seed & PBKDF2-SHA256 Generator
 * ============================================================================
 * Usage:
 *   node scripts/generate-seed.mjs                     # safe seed / re-seed
 *   JJB_FORCE_RESEED=true      node scripts/generate-seed.mjs   # wipe & re-seed lots
 *   JJB_FORCE_USER_UPDATE=true node scripts/generate-seed.mjs   # overwrite users
 *   JJB_PASSWORD_PEPPER=<hex>  node scripts/generate-seed.mjs   # optional pepper
 *
 * Output:
 *   ./seed.sql
 *   Apply:  npx wrangler d1 execute jjb-wms-db --remote --file=./seed.sql
 *
 * Safety:
 *   - users               : INSERT OR IGNORE  (REPLACE only with JJB_FORCE_USER_UPDATE)
 *   - materials           : INSERT OR IGNORE  (protects current_balance)
 *   - material_lots       : INSERT OR IGNORE  (DELETE+INSERT only with JJB_FORCE_RESEED)
 *   - recipe_ingredients  : per-recipe DELETE + INSERT (source is truth)
 *   - system_config       : INSERT OR IGNORE  (preserves admin-panel edits)
 *   - rooms, suppliers,
 *     recipes, outlets    : INSERT OR REPLACE (descriptive master data)
 * ============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { webcrypto } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT_DIR   = path.resolve(__dirname, '..');

const PBKDF2_ITERATIONS = 100000; // Cloudflare Workers WebCrypto ceiling
const DEFAULT_SHIFT_PIN = process.env.JJB_SHIFT_PIN       || '2026';
const PASSWORD_PEPPER   = process.env.JJB_PASSWORD_PEPPER || '';
const FORCE_RESEED      = process.env.JJB_FORCE_RESEED      === 'true';
const FORCE_USER_UPDATE = process.env.JJB_FORCE_USER_UPDATE === 'true';

async function hashSecretPbkdf2(plainText) {
  const enc = new TextEncoder();
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await webcrypto.subtle.importKey(
    'raw', enc.encode(`${plainText}${PASSWORD_PEPPER}`),
    { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const derivedBits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const saltHex = Buffer.from(salt).toString('hex');
  const hashHex = Buffer.from(derivedBits).toString('hex');
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${saltHex}$${hashHex}`;
}

function sqlVal(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'number')  return Number.isFinite(val) ? String(val) : '0';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function toCentavos(phpAmount) {
  const n = Number(phpAmount);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function slugify(text) {
  return String(text || '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'unknown';
}

async function loadModuleSafe(relPath) {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`[WARN] File not found: ${relPath}`);
    return {};
  }
  return await import(pathToFileURL(fullPath).href);
}

async function main() {
  const mode = FORCE_RESEED ? 'RESEED (destructive)' : (FORCE_USER_UPDATE ? 'USER-UPDATE' : 'SAFE SEED');
  console.log(`🥖 JJB-WMS seed generator — MODE: ${mode}`);
  if (FORCE_RESEED)      console.log('   ⚠️  JJB_FORCE_RESEED=true → material_lots WILL be wiped & re-inserted');
  if (FORCE_USER_UPDATE) console.log('   ⚠️  JJB_FORCE_USER_UPDATE=true → users WILL be overwritten');
  if (PASSWORD_PEPPER)   console.log('   🔐 Pepper is ACTIVE — remember to pass it to the Worker verifier');

  const authMod = await loadModuleSafe('src/data/authUsers.js');
  const matMod  = await loadModuleSafe('src/data/materialsData.js');
  const recMod  = await loadModuleSafe('src/data/recipesData.js');

  const authUsers  = authMod.AUTH_USERS      || authMod.USERS      || authMod.default || [];
  const materials  = matMod.MASTER_MATERIALS || matMod.MATERIALS   || matMod.default || [];
  const rawRooms   = matMod.STORAGE_ROOMS   || [];
  const recipes    = recMod.MASTER_RECIPES  || recMod.RECIPES      || recMod.default || [];
  const rawOutlets = recMod.OUTLETS         || [];

  const L = [
    '-- ============================================================================',
    '-- JJB WMS v4.6 — Auto-Generated Seed (seed.sql)',
    `-- Generated At (UTC): ${new Date().toISOString()}`,
    `-- Mode: ${mode}`,
    `-- Hash format: pbkdf2_sha256$${PBKDF2_ITERATIONS}$<salt_hex>$<hash_hex>`,
    `-- Pepper: ${PASSWORD_PEPPER ? 'ACTIVE (must match Worker secret)' : 'none'}`,
    '-- ============================================================================',
    ''
  ];

  // 1. roles — INSERT OR IGNORE (can_delete_test_data is authoritative in schema.sql)
  L.push('-- A2: roles');
  const roles = [
    ['WAREHOUSE_SUPERVISOR','Warehouse Supervisor',0],
    ['BATCHING_PREPARER',   'Batching Preparer',   0],
    ['PURCHASING_MANAGER',  'Purchasing Manager',  0],
    ['QA_DIRECTOR',         'QA Director',         0],
    ['ADMIN_COA',           'Admin / COA',         1],
    ['SYSTEMS_DIRECTOR',    'Systems Director',    1]
  ];
  for (const [k, n, c] of roles) {
    L.push(`INSERT OR IGNORE INTO roles (role_key, role_name, can_delete_test_data) VALUES (${sqlVal(k)}, ${sqlVal(n)}, ${c});`);
  }
  L.push('');

  // 2. users — INSERT OR IGNORE by default; REPLACE only with FORCE_USER_UPDATE
  L.push(`-- A1: users (${FORCE_USER_UPDATE ? 'INSERT OR REPLACE' : 'INSERT OR IGNORE'})`);
  const userVerb = FORCE_USER_UPDATE ? 'INSERT OR REPLACE' : 'INSERT OR IGNORE';
  const sharedPinHash = await hashSecretPbkdf2(DEFAULT_SHIFT_PIN);

  for (const u of authUsers) {
    const userId    = u.id || slugify(u.username || u.name);
    const plainPass = u.password || 'ChangeMe2026!';
    const passHash  = await hashSecretPbkdf2(plainPass);
    const roleCat   = u.roleCategory || u.role_category || 'WAREHOUSE_SUPERVISOR';
    L.push(
      `${userVerb} INTO users (id, username, password_hash, shift_pin_hash, name, title, station, role_category, avatar_bg, badge_color, description, is_active, is_test_data, updated_at) VALUES (` +
      [
        sqlVal(userId), sqlVal(u.username), sqlVal(passHash), sqlVal(sharedPinHash),
        sqlVal(u.name), sqlVal(u.title || ''), sqlVal(u.station || ''),
        sqlVal(roleCat), sqlVal(u.avatarBg || ''), sqlVal(u.badgeColor || ''),
        sqlVal(u.description || ''), 1, 0, "datetime('now')"
      ].join(', ') + ');'
    );
  }
  L.push('');

  // 3. storage_rooms — INSERT OR REPLACE (descriptive master data)
  L.push('-- A4: storage_rooms');
  const roomSet = new Set(['Dry Room 1','Dry Room 2','Cold Room','Wet Room','Pallet Staging','Quarantine Cabinet']);
  for (const r of rawRooms) {
    if (typeof r === 'string' && r.trim()) roomSet.add(r.trim());
    else if (r && r.name) roomSet.add(String(r.name).trim());
  }
  for (const m of materials) {
    if (m.room && String(m.room).trim()) roomSet.add(String(m.room).trim());
  }
  let roomSort = 1;
  for (const roomName of roomSet) {
    L.push(`INSERT OR REPLACE INTO storage_rooms (name, description, sort_order, is_active, is_test_data, updated_at) VALUES (${sqlVal(roomName)}, ${sqlVal(`Indangan Facility - ${roomName}`)}, ${roomSort++}, 1, 0, datetime('now'));`);
  }
  L.push('');

  // 4. suppliers — INSERT OR REPLACE
  L.push('-- A9: suppliers');
  const supplierMap = new Map();
  for (const m of materials) {
    const supName = String(m.supplier || 'Direct / General Supplier').trim();
    supplierMap.set(slugify(supName), supName);
  }
  for (const [supId, supName] of supplierMap.entries()) {
    L.push(`INSERT OR REPLACE INTO suppliers (id, name, is_active, is_test_data, updated_at) VALUES (${sqlVal(supId)}, ${sqlVal(supName)}, 1, 0, datetime('now'));`);
  }
  L.push('');

  // 5. materials + material_lots
  L.push(`-- A3: materials (INSERT OR IGNORE — protects current_balance)`);
  L.push(`-- A5: material_lots (${FORCE_RESEED ? 'WIPED + REINSERTED' : 'INSERT OR IGNORE'})`);
  if (FORCE_RESEED) {
    L.push('DELETE FROM material_lots WHERE is_test_data = 0;');
  }

  const validMaterialCodes = new Set();
  const lotVerb = FORCE_RESEED ? 'INSERT' : 'INSERT OR IGNORE';

  for (const m of materials) {
    if (!m.code) continue;
    validMaterialCodes.add(m.code);

    const roomName         = (m.room && String(m.room).trim()) || 'Dry Room 1';
    const unitCostCentavos = toCentavos(m.unitCost ?? m.unit_cost ?? 0);
    const currentBalance   = Number(m.currentBalance ?? m.current_balance ?? 0);

    L.push(
      `INSERT OR IGNORE INTO materials (code, category, brand, name, supplier, room, primary_uom, secondary_uom, conversion_factor, threshold, unit_cost_centavos, current_balance, packaging_note, is_test_data, updated_at) VALUES (` +
      [
        sqlVal(m.code), sqlVal(m.category || 'Raw Material'), sqlVal(m.brand || 'Generic'),
        sqlVal(m.name), sqlVal(m.supplier || 'Direct Supplier'), sqlVal(roomName),
        sqlVal(m.primaryUom || 'Unit'), sqlVal(m.secondaryUom || 'kg'),
        sqlVal(Number(m.conversionFactor || 1)), sqlVal(Number(m.threshold || 0)),
        sqlVal(unitCostCentavos), sqlVal(currentBalance),
        sqlVal(m.packagingNote || null), 0, "datetime('now')"
      ].join(', ') + ');'
    );

    const lots = Array.isArray(m.lots) ? m.lots : [];
    if (lots.length > 0) {
      for (const lot of lots) {
        L.push(`${lotVerb} INTO material_lots (material_code, lot_number, expiry_date, qty_sec, location, is_test_data, updated_at) VALUES (` +
          [
            sqlVal(m.code), sqlVal(lot.lotNumber || `LOT-${m.code}-INIT`),
            sqlVal(lot.expiryDate || '2027-11-08'), sqlVal(Number(lot.qtySec ?? currentBalance)),
            sqlVal(lot.location || roomName), 0, "datetime('now')"
          ].join(', ') + ');'
        );
      }
    } else if (currentBalance > 0) {
      L.push(`${lotVerb} INTO material_lots (material_code, lot_number, expiry_date, qty_sec, location, is_test_data, updated_at) VALUES (${sqlVal(m.code)}, ${sqlVal(`OPEN-20261108-${m.code}`)}, '2027-11-08', ${sqlVal(currentBalance)}, ${sqlVal(roomName)}, 0, datetime('now'));`);
    }
  }
  L.push('');

  // 6. recipes + per-recipe-scoped ingredients (source is truth)
  L.push('-- A6: recipes (INSERT OR REPLACE)');
  L.push('-- A7: recipe_ingredients (per-recipe DELETE + INSERT)');

  for (const r of recipes) {
    const sku = r.sku || r.id || r.code;
    if (!sku) continue;

    L.push(
      `INSERT OR REPLACE INTO recipes (sku, name, category, target_facility, standard_batch_flour_kg, unit_piece_yield, dough_exit_temp_target, ccp1_lethality_target, water_activity_limit, unit_production_cost_centavos, wholesale_transfer_price_centavos, srp_centavos, gross_margin_pct, is_custom_specialty, approved_by, approved_at, is_test_data, updated_at) VALUES (` +
      [
        sqlVal(sku), sqlVal(r.name), sqlVal(r.category || 'Commercial Bakery'),
        sqlVal(r.targetFacility || 'Indangan Commissary'),
        sqlVal(Number(r.standardBatchFlourKg || 0)), sqlVal(Number(r.unitPieceYield || 0)),
        sqlVal(r.doughExitTempTarget || '26°C - 28°C'),
        sqlVal(r.ccp1LethalityTarget || 'Core >= 85°C'),
        sqlVal(r.waterActivityLimit || 'Aw <= 0.85'),
        sqlVal(toCentavos(r.unitProductionCost || 0)),
        sqlVal(toCentavos(r.wholesaleTransferPrice || 0)),
        sqlVal(toCentavos(r.srp || 0)),
        sqlVal(Number(r.grossMarginPct || 0)),
        r.isCustomSpecialty ? 1 : 0,
        sqlVal(r.approvedBy || 'Zaphyr Zur T. Pomicpic'),
        sqlVal(r.approvedAt || '2026-11-08'),
        0, "datetime('now')"
      ].join(', ') + ');'
    );

    L.push(`DELETE FROM recipe_ingredients WHERE recipe_sku = ${sqlVal(sku)} AND is_test_data = 0;`);

    const ingredients = Array.isArray(r.ingredients) ? r.ingredients : [];
    ingredients.forEach((ing, idx) => {
      const rawCode = ing.code || ing.materialCode || null;
      const fkMaterialCode = rawCode && validMaterialCodes.has(rawCode) ? rawCode : null;
      const snapshotName =
        fkMaterialCode || !rawCode
          ? ing.name || rawCode || 'Ingredient'
          : `${ing.name || 'Sub-Recipe'} [${rawCode}]`;

      L.push(
        `INSERT INTO recipe_ingredients (recipe_sku, material_code, ingredient_name_snapshot, pct, grams_per_batch, is_water, is_as_needed, is_packaging, sort_order, is_test_data, updated_at) VALUES (` +
        [
          sqlVal(sku), sqlVal(fkMaterialCode), sqlVal(snapshotName),
          sqlVal(Number(ing.pct || 0)), sqlVal(Number(ing.gramsPerBatch || 0)),
          ing.isWater ? 1 : 0, ing.isAsNeeded ? 1 : 0, ing.isPackaging ? 1 : 0,
          idx + 1, 0, "datetime('now')"
        ].join(', ') + ');'
      );
    });
  }
  L.push('');

  // 7. outlets
  L.push('-- A8: outlets');
  const defaultLocations = [
    'Pan de Verde Outlet (Communal, Davao City)',
    'Laurice Delicacies Outlet (Bankerohan, Davao City)',
    'Indangan - Biscocho Commercial Hall',
    'Indangan - Otap Laminated Hall',
    'Indangan - Hearth Bread Production Line',
    'Indangan - Pastry, Cake & Sweets Line',
    'Indangan Facility Mess Hall (Staff Meals & Snacks)',
    'QA Laboratory & R&D Kitchen',
    'Facility Maintenance & Plant Sanitation'
  ];
  const outletMap = new Map();
  for (const loc of defaultLocations) {
    outletMap.set(slugify(loc), { name: loc, address: 'Davao City', contactPerson: 'Duty Supervisor' });
  }
  for (const o of rawOutlets) {
    if (typeof o === 'string') {
      outletMap.set(slugify(o), { name: o, address: 'Davao City', contactPerson: 'Branch Lead' });
    } else if (o && o.name) {
      outletMap.set(o.id || slugify(o.name), {
        name: o.name, address: o.address || 'Davao City', contactPerson: o.contactPerson || 'Branch Lead'
      });
    }
  }
  for (const [id, o] of outletMap.entries()) {
    L.push(`INSERT OR REPLACE INTO outlets (id, name, address, contact_person, is_active, is_test_data, updated_at) VALUES (${sqlVal(id)}, ${sqlVal(o.name)}, ${sqlVal(o.address)}, ${sqlVal(o.contactPerson)}, 1, 0, datetime('now'));`);
  }
  L.push('');

  // 8. system_config — INSERT OR IGNORE (preserve admin-panel edits)
  L.push('-- E1: system_config (INSERT OR IGNORE)');
  const cfg = [
    ['eod_email_recipients',
      JSON.stringify(['bmd.jangjangbakeshop@gmail.com','zaphyrzurpomicpic@gmail.com','mcbasoc.jjb@gmail.com','mjtacuban.jjb@gmail.com']),
      '23:45 PHT Automated EOD Dossier Recipients'],
    ['eod_cutoff_pht',        '23:45', 'Daily PHT End-of-Day Settlement Cutoff'],
    ['heartbeat_interval_sec','300',   'Client health check interval (GET /api/sync)'],
    ['shift_pin_hash',        sharedPinHash, 'Shared floor tablet shift PIN PBKDF2-SHA256 hash']
  ];
  for (const [k, v, d] of cfg) {
    L.push(`INSERT OR IGNORE INTO system_config (config_key, config_value, description, updated_at) VALUES (${sqlVal(k)}, ${sqlVal(v)}, ${sqlVal(d)}, datetime('now'));`);
  }

  const outPath = path.join(ROOT_DIR, 'seed.sql');
  fs.writeFileSync(outPath, L.join('\n') + '\n', 'utf8');

  console.log(`✅ Generated seed.sql (${L.length} lines) → ${outPath}`);
  console.log(`   Mode:              ${mode}`);
  console.log(`   Users:             ${authUsers.length}  (${userVerb})`);
  console.log(`   Rooms:             ${roomSet.size}`);
  console.log(`   Suppliers:         ${supplierMap.size}`);
  console.log(`   Materials:         ${validMaterialCodes.size}  (INSERT OR IGNORE)`);
  console.log(`   Recipes:           ${recipes.length}`);
  console.log(`   Outlets:           ${outletMap.size}`);
}

main().catch(err => { console.error('❌ Failed:', err); process.exit(1); });