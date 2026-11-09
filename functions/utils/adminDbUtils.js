// ============================================================================
// JJB WMS — WebCrypto PBKDF2 verifier + FK-safe test-data purge engine
// Runtime: Cloudflare Pages Functions (Workers)
// NOTE: This file MUST NOT reference process.argv or process.env.
//       Workers only expose env via the `env` parameter of onRequest*.
// ============================================================================
export const ALLOWED_ADMIN_TABLES = new Set([
  'users','roles','materials','storage_rooms','material_lots',
  'recipes','recipe_ingredients','outlets','suppliers',
  'receiving_reports','receiving_items','withdrawals','withdrawal_items',
  'batch_orders','adjustments','quarantine_ncr','orders','order_items',
  'specialty_recipe_proposals','specialty_recipe_ingredients',
  'audit_log','sync_events','admin_action_log','system_config'
]);

/**
 * Verifies plaintext against a pbkdf2_sha256$<iter>$<salt>$<hash> string.
 * Iterations are read from the stored hash so bumping them is migration-free,
 * but the Workers ceiling (100,000) is enforced for safety.
 */
export async function verifyPbkdf2Secret(plainText, storedHash, pepper = '') {
  if (!plainText || !storedHash || !storedHash.startsWith('pbkdf2_sha256$')) {
    console.warn('verifyPbkdf2Secret: unsupported hash format');
    return false;
  }
  const parts = storedHash.split('$');
  if (parts.length !== 4) {
    console.warn('verifyPbkdf2Secret: malformed hash string');
    return false;
  }
  const iterations = parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations < 1000 || iterations > 100000) {
    console.warn(`verifyPbkdf2Secret: iteration count ${iterations} out of Workers-safe range [1000, 100000]`);
    return false;
  }

  const saltBytes     = hexToUint8Array(parts[2]);
  const expectedBytes = hexToUint8Array(parts[3]);
  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(`${plainText}${pepper}`),
    { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
    keyMaterial, expectedBytes.byteLength * 8
  );

  return timingSafeEqual(new Uint8Array(derivedBits), expectedBytes);
}

/**
 * Executes the FK-safe 18-step test-data purge in one atomic D1 batch, then
 * reconciles materials.current_balance from surviving non-test lots.
 *
 * NOTE — Snapshot is a *summary* row, not per-row data. This makes the purge
 *        irreversible unless you also take an external D1 backup first.
 */
export async function executePurgeTestDataBatch(db, adminUserId, reason = 'Admin Test Data Purge') {
  const purgeOrder = [
    'order_items', 'withdrawal_items', 'receiving_items',
    'specialty_recipe_ingredients', 'recipe_ingredients', 'material_lots',
    'orders', 'withdrawals', 'receiving_reports', 'batch_orders',
    'adjustments', 'quarantine_ncr', 'specialty_recipe_proposals',
    'audit_log', 'recipes', 'materials'
  ];

  const statements = [];
  for (const table of purgeOrder) {
    statements.push(db.prepare(`DELETE FROM ${table} WHERE is_test_data = 1`));
  }

  statements.push(db.prepare(`
    UPDATE materials
    SET current_balance = COALESCE((
          SELECT ROUND(SUM(qty_sec), 4) FROM material_lots
          WHERE material_lots.material_code = materials.code
            AND material_lots.is_test_data = 0
        ), 0),
        updated_at = datetime('now')
    WHERE is_test_data = 0
  `));

  statements.push(db.prepare(`
    INSERT INTO admin_action_log (admin_user_id, action, table_name, record_id, record_snapshot, reason)
    VALUES (?1, 'BULK_DELETE_TEST', 'ALL_OPERATIONAL_TABLES', 'is_test_data=1', ?2, ?3)
  `).bind(
    adminUserId,
    JSON.stringify({ purgedTables: purgeOrder, balanceReconciled: true, timestampUtc: new Date().toISOString() }),
    reason
  ));

  return await db.batch(statements);
}

function hexToUint8Array(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

function timingSafeEqual(a, b) {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}