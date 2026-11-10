/**
 * ============================================================================
 * JJB WMS v4.6 — Phase 2 Backend Admin Panel API (functions/api/admin[[route]].js)
 * ============================================================================
 * Endpoints:
 *   GET    /api/admin/tables               -> All 24 tables + total/test row counts + balance variance check
 *   GET    /api/admin/audit                -> Immutable admin_action_log entries
 *   GET    /api/admin/:table               -> Paginated rows (?filter=all|test|prod&limit=100&offset=0&q=...)
 *   DELETE /api/admin/:table/:id           -> Single-row delete with JSON snapshot into admin_action_log
 *   POST   /api/admin/toggle-test-flag     -> Toggle is_test_data (0 <-> 1) on a specific record
 *   POST   /api/admin/purge-test-data      -> Atomic FK-safe purge of is_test_data=1 + PBKDF2 password check
 *   POST   /api/admin/restore/:actionId    -> Undo single-row delete from admin_action_log.record_snapshot
 * ============================================================================
 */

import {
  ALLOWED_ADMIN_TABLES,
  verifyPbkdf2Secret,
  executePurgeTestDataBatch
} from '../../utils/adminDbUtils.js';

const TABLE_META = {
  users:                        { pk: 'id',          group: 'A', hasTestFlag: true,  immutable: false, searchCol: 'name' },
  roles:                        { pk: 'role_key',    group: 'A', hasTestFlag: false, immutable: true,  searchCol: 'role_name' },
  materials:                    { pk: 'code',        group: 'A', hasTestFlag: true,  immutable: false, searchCol: 'name' },
  storage_rooms:                { pk: 'name',        group: 'A', hasTestFlag: true,  immutable: false, searchCol: 'name' },
  material_lots:                { pk: 'id',          group: 'A', hasTestFlag: true,  immutable: false, searchCol: 'lot_number', balanceAffecting: true },
  recipes:                      { pk: 'sku',         group: 'A', hasTestFlag: true,  immutable: false, searchCol: 'name' },
  recipe_ingredients:           { pk: 'id',          group: 'A', hasTestFlag: true,  immutable: false, searchCol: 'ingredient_name_snapshot' },
  outlets:                      { pk: 'id',          group: 'A', hasTestFlag: true,  immutable: false, searchCol: 'name' },
  suppliers:                    { pk: 'id',          group: 'A', hasTestFlag: true,  immutable: false, searchCol: 'name' },

  receiving_reports:            { pk: 'report_no',   group: 'B', hasTestFlag: true,  immutable: false, searchCol: 'report_no', balanceAffecting: true },
  withdrawals:                  { pk: 'slip_no',     group: 'B', hasTestFlag: true,  immutable: false, searchCol: 'slip_no',   balanceAffecting: true },
  batch_orders:                 { pk: 'order_id',    group: 'B', hasTestFlag: true,  immutable: false, searchCol: 'order_id' },
  adjustments:                  { pk: 'id',          group: 'B', hasTestFlag: true,  immutable: false, searchCol: 'material_code', balanceAffecting: true },
  quarantine_ncr:               { pk: 'ncr_no',      group: 'B', hasTestFlag: true,  immutable: false, searchCol: 'ncr_no' },
  orders:                       { pk: 'order_id',    group: 'B', hasTestFlag: true,  immutable: false, searchCol: 'order_id' },
  specialty_recipe_proposals:   { pk: 'proposal_id', group: 'B', hasTestFlag: true,  immutable: false, searchCol: 'title' },

  receiving_items:              { pk: 'id',          group: 'C', hasTestFlag: true,  immutable: false, searchCol: 'report_no', balanceAffecting: true },
  withdrawal_items:             { pk: 'id',          group: 'C', hasTestFlag: true,  immutable: false, searchCol: 'slip_no',   balanceAffecting: true },
  order_items:                  { pk: 'id',          group: 'C', hasTestFlag: true,  immutable: false, searchCol: 'order_id' },
  specialty_recipe_ingredients: { pk: 'id',          group: 'C', hasTestFlag: true,  immutable: false, searchCol: 'proposal_id' },

  audit_log:                    { pk: 'id',          group: 'D', hasTestFlag: true,  immutable: false, searchCol: 'action' },
  sync_events:                  { pk: 'id',          group: 'D', hasTestFlag: false, immutable: false, searchCol: 'event_type' },
  admin_action_log:             { pk: 'id',          group: 'D', hasTestFlag: false, immutable: true,  searchCol: 'table_name' },

  system_config:                { pk: 'config_key',  group: 'E', hasTestFlag: false, immutable: false, searchCol: 'config_key' }
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function authorizeAdminRequest(request, env, bodyPayload = null) {
  const adminUserId =
    request.headers.get('X-JJB-Admin-User') ||
    bodyPayload?.adminUserId ||
    '';

  if (!adminUserId) {
    return { ok: false, status: 401, error: 'Missing X-JJB-Admin-User header.' };
  }

  const userRow = await env.DB.prepare(`
    SELECT u.id, u.username, u.name, u.password_hash, u.shift_pin_hash, u.role_category,
           r.can_delete_test_data
    FROM users u
    LEFT JOIN roles r ON r.role_key = u.role_category
    WHERE (u.id = ?1 OR u.username = ?1) AND u.is_active = 1
    LIMIT 1
  `).bind(adminUserId).first();

  if (!userRow) {
    return { ok: false, status: 403, error: `Admin user '${adminUserId}' not found or inactive in D1.` };
  }

  if (Number(userRow.can_delete_test_data) !== 1) {
    return {
      ok: false,
      status: 403,
      error: `Access denied: Role '${userRow.role_category}' does not have can_delete_test_data=1 permission.`
    };
  }

  return { ok: true, user: userRow };
}

function buildReconciliationStatement(env) {
  return env.DB.prepare(`
    UPDATE materials
    SET current_balance = COALESCE((
          SELECT ROUND(SUM(qty_sec), 4)
          FROM material_lots
          WHERE material_lots.material_code = materials.code
            AND material_lots.is_test_data = 0
        ), 0),
        updated_at = datetime('now')
    WHERE is_test_data = 0
  `);
}

/**
 * Build the child-table deletes required when a parent row is deleted.
 * Returns [] for tables without cascade-linked children.
 * Safe against FK CASCADE: if the child rows were already cascaded,
 * these DELETE statements affect 0 rows (no-op).
 */
function buildChildDeleteStatements(env, tableName, recordId) {
  const stmts = [];
  if (tableName === 'receiving_reports') {
    stmts.push(env.DB.prepare(`DELETE FROM receiving_items WHERE report_no = ?1`).bind(recordId));
  } else if (tableName === 'withdrawals') {
    stmts.push(env.DB.prepare(`DELETE FROM withdrawal_items WHERE slip_no = ?1`).bind(recordId));
  } else if (tableName === 'orders') {
    stmts.push(env.DB.prepare(`DELETE FROM order_items WHERE order_id = ?1`).bind(recordId));
  } else if (tableName === 'specialty_recipe_proposals') {
    stmts.push(env.DB.prepare(`DELETE FROM specialty_recipe_ingredients WHERE proposal_id = ?1`).bind(recordId));
  } else if (tableName === 'recipes') {
    stmts.push(env.DB.prepare(`DELETE FROM recipe_ingredients WHERE recipe_sku = ?1`).bind(recordId));
  }
  return stmts;
}

/**
 * Extract the (material_code, lot_number) pairs this parent record created
 * so we can toggle/delete the matching material_lots records. Returns [] if
 * the parent table does not have a lot-defining child.
 */
async function getLotPairsForParent(env, tableName, recordId) {
  try {
    if (tableName === 'receiving_reports') {
      const out = await env.DB.prepare(
        `SELECT material_code, lot_number FROM receiving_items WHERE report_no = ?1 AND lot_number IS NOT NULL`
      ).bind(recordId).all();
      return out?.results || [];
    }
  } catch (e) {
    console.warn('getLotPairsForParent failed (non-fatal):', e.message);
  }
  return [];
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const method = request.method.toUpperCase();
  const routeParts = Array.isArray(params.route)
    ? params.route
    : (params.route ? [params.route] : []);

  if (!env.DB) {
    return json({ ok: false, error: 'Cloudflare D1 binding (env.DB) is not configured.' }, 500);
  }

  let parsedBody = null;
  if (method === 'POST' || method === 'DELETE' || method === 'PUT') {
    try {
      const text = await request.text();
      parsedBody = text ? JSON.parse(text) : {};
    } catch {
      return json({ ok: false, error: 'Invalid JSON request body.' }, 400);
    }
  }

  const auth = await authorizeAdminRequest(request, env, parsedBody);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, auth.status);
  }

  try {
    // ---------------------------------------------------------------
    // GET /api/admin/tables
    // ---------------------------------------------------------------
    if (method === 'GET' && routeParts.length === 1 && routeParts[0] === 'tables') {
      const tableNames = Object.keys(TABLE_META);
      const countStatements = tableNames.map((t) => {
        const meta = TABLE_META[t];
        if (meta.hasTestFlag) {
          return env.DB.prepare(`
            SELECT '${t}' AS table_name,
                   COUNT(*) AS total_rows,
                   COALESCE(SUM(CASE WHEN is_test_data = 1 THEN 1 ELSE 0 END), 0) AS test_rows
            FROM ${t}
          `);
        }
        return env.DB.prepare(`
          SELECT '${t}' AS table_name,
                 COUNT(*) AS total_rows,
                 0 AS test_rows
          FROM ${t}
        `);
      });

      countStatements.push(
        env.DB.prepare(`
          SELECT COUNT(*) AS unbalanced_count
          FROM v_material_balance_reconciliation
          WHERE ABS(variance_sec) > 0.001
        `)
      );

      countStatements.push(
        env.DB.prepare(`
          SELECT COUNT(*) AS error_count
          FROM sync_events
          WHERE projection_error IS NOT NULL AND projection_error != ''
        `)
      );

      const batchResults = await env.DB.batch(countStatements);
      const tablesSummary = [];
      let totalTestRowsAcrossDb = 0;

      for (let i = 0; i < tableNames.length; i++) {
        const tName = tableNames[i];
        const row = batchResults[i]?.results?.[0] || { total_rows: 0, test_rows: 0 };
        const meta = TABLE_META[tName];
        const testCount = Number(row.test_rows || 0);
        totalTestRowsAcrossDb += testCount;

        tablesSummary.push({
          table_name: tName,
          group: meta.group,
          pk: meta.pk,
          has_test_flag: meta.hasTestFlag,
          immutable: meta.immutable,
          total_rows: Number(row.total_rows || 0),
          test_rows: testCount,
          prod_rows: Math.max(0, Number(row.total_rows || 0) - testCount)
        });
      }

      const unbalancedRow = batchResults[tableNames.length]?.results?.[0] || {};
      const syncErrRow = batchResults[tableNames.length + 1]?.results?.[0] || {};

      return json({
        ok: true,
        admin_user: { id: auth.user.id, name: auth.user.name, role: auth.user.role_category },
        total_test_rows: totalTestRowsAcrossDb,
        unbalanced_materials_count: Number(unbalancedRow.unbalanced_count || 0),
        sync_projection_errors_count: Number(syncErrRow.error_count || 0),
        tables: tablesSummary
      });
    }

    // ---------------------------------------------------------------
    // GET /api/admin/audit
    // ---------------------------------------------------------------
    if (method === 'GET' && routeParts.length === 1 && routeParts[0] === 'audit') {
      const url = new URL(request.url);
      const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '100', 10)));
      const { results } = await env.DB.prepare(`
        SELECT id, admin_user_id, action, table_name, record_id, record_snapshot, reason, created_at
        FROM admin_action_log
        ORDER BY id DESC
        LIMIT ?1
      `).bind(limit).all();

      return json({ ok: true, logs: results || [] });
    }

    // ---------------------------------------------------------------
    // GET /api/admin/:table   (paginated)
    // ---------------------------------------------------------------
    if (method === 'GET' && routeParts.length === 1) {
      const tableName = routeParts[0];
      if (!ALLOWED_ADMIN_TABLES.has(tableName) || !TABLE_META[tableName]) {
        return json({ ok: false, error: `Table '${tableName}' is not in ALLOWED_ADMIN_TABLES.` }, 400);
      }

      const meta = TABLE_META[tableName];
      const url = new URL(request.url);
      const filter = (url.searchParams.get('filter') || 'all').toLowerCase();
      const search = (url.searchParams.get('q') || '').trim();
      const limit = Math.min(250, Math.max(1, parseInt(url.searchParams.get('limit') || '100', 10)));
      const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));

      const whereClauses = [];
      const bindings = [];

      if (meta.hasTestFlag) {
        if (filter === 'test') whereClauses.push('is_test_data = 1');
        else if (filter === 'prod') whereClauses.push('is_test_data = 0');
      }

      if (search && meta.searchCol) {
        whereClauses.push(`(CAST(${meta.pk} AS TEXT) LIKE ? OR CAST(${meta.searchCol} AS TEXT) LIKE ?)`);
        bindings.push(`%${search}%`, `%${search}%`);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      // Fallback to PK DESC — works on both rowid and WITHOUT ROWID tables.
      const orderCol = `"${meta.pk}" DESC`;

      const rowsStmt = env.DB.prepare(
        `SELECT * FROM ${tableName} ${whereSql} ORDER BY ${orderCol} LIMIT ? OFFSET ?`
      ).bind(...bindings, limit, offset);

      const countStmt = env.DB.prepare(
        `SELECT COUNT(*) AS count FROM ${tableName} ${whereSql}`
      ).bind(...bindings);

      const [rowsRes, countRes] = await env.DB.batch([rowsStmt, countStmt]);

      return json({
        ok: true,
        table: tableName,
        meta,
        total: Number(countRes?.results?.[0]?.count || 0),
        limit,
        offset,
        rows: rowsRes?.results || []
      });
    }

    // ---------------------------------------------------------------
    // DELETE /api/admin/:table/:id
    // ---------------------------------------------------------------
    if (method === 'DELETE' && routeParts.length === 2) {
      const [tableName, rawId] = routeParts;
      const recordId = decodeURIComponent(rawId);

      if (!ALLOWED_ADMIN_TABLES.has(tableName) || !TABLE_META[tableName]) {
        return json({ ok: false, error: `Table '${tableName}' is not in ALLOWED_ADMIN_TABLES.` }, 400);
      }

      const meta = TABLE_META[tableName];
      if (meta.immutable) {
        return json({ ok: false, error: `Table '${tableName}' is immutable and cannot have rows deleted.` }, 403);
      }

      const existingRow = await env.DB.prepare(
        `SELECT * FROM ${tableName} WHERE ${meta.pk} = ?1 LIMIT 1`
      ).bind(recordId).first();

      if (!existingRow) {
        return json({ ok: false, error: `Record '${recordId}' not found in '${tableName}'.` }, 404);
      }

      const reason = parsedBody?.reason || `Single-row delete from Admin Panel by ${auth.user.name}`;
      const stmts = [];

      // Snapshot parent + all children for restore
      let childSnapshot = null;
      if (tableName === 'receiving_reports') {
        const children = await env.DB.prepare(`SELECT * FROM receiving_items WHERE report_no = ?1`).bind(recordId).all();
        childSnapshot = { childTable: 'receiving_items', rows: children?.results || [] };
      } else if (tableName === 'withdrawals') {
        const children = await env.DB.prepare(`SELECT * FROM withdrawal_items WHERE slip_no = ?1`).bind(recordId).all();
        childSnapshot = { childTable: 'withdrawal_items', rows: children?.results || [] };
      } else if (tableName === 'orders') {
        const children = await env.DB.prepare(`SELECT * FROM order_items WHERE order_id = ?1`).bind(recordId).all();
        childSnapshot = { childTable: 'order_items', rows: children?.results || [] };
      } else if (tableName === 'specialty_recipe_proposals') {
        const children = await env.DB.prepare(`SELECT * FROM specialty_recipe_ingredients WHERE proposal_id = ?1`).bind(recordId).all();
        childSnapshot = { childTable: 'specialty_recipe_ingredients', rows: children?.results || [] };
      } else if (tableName === 'recipes') {
        const children = await env.DB.prepare(`SELECT * FROM recipe_ingredients WHERE recipe_sku = ?1`).bind(recordId).all();
        childSnapshot = { childTable: 'recipe_ingredients', rows: children?.results || [] };
      }

      const snapshotPayload = JSON.stringify({
        table: tableName,
        pk: meta.pk,
        row: existingRow,
        children: childSnapshot
      });

      stmts.push(
        env.DB.prepare(`
          INSERT INTO admin_action_log (admin_user_id, action, table_name, record_id, record_snapshot, reason)
          VALUES (?1, 'DELETE_ROW', ?2, ?3, ?4, ?5)
        `).bind(auth.user.id, tableName, String(recordId), snapshotPayload, reason)
      );

      // Delete children FIRST (idempotent regardless of FK CASCADE presence)
      stmts.push(...buildChildDeleteStatements(env, tableName, recordId));

      // Delete parent
      stmts.push(
        env.DB.prepare(`DELETE FROM ${tableName} WHERE ${meta.pk} = ?1`).bind(recordId)
      );

      if (meta.balanceAffecting) {
        stmts.push(buildReconciliationStatement(env));
      }

      await env.DB.batch(stmts);

      return json({
        ok: true,
        deleted: { table: tableName, id: recordId },
        reconciled: !!meta.balanceAffecting
      });
    }

    // ---------------------------------------------------------------
    // POST /api/admin/toggle-test-flag
    // ---------------------------------------------------------------
    if (method === 'POST' && routeParts.length === 1 && routeParts[0] === 'toggle-test-flag') {
      const { table: tableName, id: recordId, isTestData } = parsedBody || {};
      if (!ALLOWED_ADMIN_TABLES.has(tableName) || !TABLE_META[tableName]?.hasTestFlag) {
        return json({ ok: false, error: `Table '${tableName}' does not support is_test_data.` }, 400);
      }

      const meta = TABLE_META[tableName];
      const newFlag = isTestData ? 1 : 0;

      // Build all statements, then dispatch in one atomic batch.
      // Audit log is part of the batch so a partial failure cannot leave a
      // phantom audit entry (fixes previous non-atomic .run() + .batch() bug).
      const stmts = [
        env.DB.prepare(
          `UPDATE ${tableName} SET is_test_data = ?1 WHERE ${meta.pk} = ?2`
        ).bind(newFlag, recordId)
      ];

      // Cascade to child tables
      if (tableName === 'receiving_reports') {
        stmts.push(env.DB.prepare(`UPDATE receiving_items SET is_test_data = ?1 WHERE report_no = ?2`).bind(newFlag, recordId));

        // Also toggle the material_lots created by this receipt so that the
        // reconciliation statement reflects the new is_test_data state.
        const lotPairs = await getLotPairsForParent(env, tableName, recordId);
        for (const pair of lotPairs) {
          if (pair.material_code && pair.lot_number) {
            stmts.push(
              env.DB.prepare(`
                UPDATE material_lots SET is_test_data = ?1
                WHERE material_code = ?2 AND lot_number = ?3
              `).bind(newFlag, pair.material_code, pair.lot_number)
            );
          }
        }
      } else if (tableName === 'withdrawals') {
        stmts.push(env.DB.prepare(`UPDATE withdrawal_items SET is_test_data = ?1 WHERE slip_no = ?2`).bind(newFlag, recordId));
      } else if (tableName === 'orders') {
        stmts.push(env.DB.prepare(`UPDATE order_items SET is_test_data = ?1 WHERE order_id = ?2`).bind(newFlag, recordId));
      } else if (tableName === 'specialty_recipe_proposals') {
        stmts.push(env.DB.prepare(`UPDATE specialty_recipe_ingredients SET is_test_data = ?1 WHERE proposal_id = ?2`).bind(newFlag, recordId));
      } else if (tableName === 'recipes') {
        stmts.push(env.DB.prepare(`UPDATE recipe_ingredients SET is_test_data = ?1 WHERE recipe_sku = ?2`).bind(newFlag, recordId));
      }

      if (meta.balanceAffecting) {
        stmts.push(buildReconciliationStatement(env));
      }

      stmts.push(
        env.DB.prepare(`
          INSERT INTO admin_action_log (admin_user_id, action, table_name, record_id, record_snapshot, reason)
          VALUES (?1, 'UPDATE_ROW', ?2, ?3, ?4, ?5)
        `).bind(
          auth.user.id,
          tableName,
          String(recordId),
          JSON.stringify({ is_test_data: newFlag }),
          `Toggled is_test_data=${newFlag}`
        )
      );

      await env.DB.batch(stmts);
      return json({ ok: true, table: tableName, id: recordId, is_test_data: newFlag });
    }

    // ---------------------------------------------------------------
    // POST /api/admin/purge-test-data
    // ---------------------------------------------------------------
    if (method === 'POST' && routeParts.length === 1 && routeParts[0] === 'purge-test-data') {
      const password = String(parsedBody?.password || '').trim();
      const reason = String(parsedBody?.reason || 'Bulk Purge of Test Data (is_test_data = 1)').trim();

      if (!password) {
        return json({ ok: false, error: 'Password or Shift PIN confirmation is required to purge test data.' }, 400);
      }

      const pepper = env.JJB_PASSWORD_PEPPER || '';
      const passValid = await verifyPbkdf2Secret(password, auth.user.password_hash, pepper);
      const pinValid =
        !passValid && auth.user.shift_pin_hash
          ? await verifyPbkdf2Secret(password, auth.user.shift_pin_hash, pepper)
          : false;

      if (!passValid && !pinValid) {
        return json({ ok: false, error: 'Invalid password or PIN. Test data purge aborted.' }, 403);
      }

      const { totalPurged, purgedTableCount } = await executePurgeTestDataBatch(
        env.DB,
        auth.user.id,
        reason
      );

      return json({
        ok: true,
        status: 'PURGED_AND_RECONCILED',
        total_rows_purged: totalPurged,
        tables_purged: purgedTableCount,
        reconciled_by: auth.user.name
      });
    }

    // ---------------------------------------------------------------
    // POST /api/admin/restore/:actionId
    // ---------------------------------------------------------------
    if (method === 'POST' && routeParts.length === 2 && routeParts[0] === 'restore') {
      const actionId = parseInt(routeParts[1], 10);
      const logEntry = await env.DB.prepare(
        `SELECT * FROM admin_action_log WHERE id = ?1 LIMIT 1`
      ).bind(actionId).first();

      if (!logEntry || logEntry.action !== 'DELETE_ROW' || !logEntry.record_snapshot) {
        return json({ ok: false, error: 'Restorable single-row snapshot not found for this log ID.' }, 404);
      }

      const parsedSnap = JSON.parse(logEntry.record_snapshot);
      const targetTable = parsedSnap.table || logEntry.table_name;
      const rowData = parsedSnap.row || parsedSnap;

      if (!ALLOWED_ADMIN_TABLES.has(targetTable) || !rowData || typeof rowData !== 'object') {
        return json({ ok: false, error: 'Invalid snapshot structure.' }, 400);
      }

      const cols = Object.keys(rowData);
      const placeholders = cols.map((_, idx) => `?${idx + 1}`).join(', ');
      const values = cols.map((c) => rowData[c]);

      const stmts = [
        env.DB.prepare(
          `INSERT OR REPLACE INTO ${targetTable} (${cols.join(', ')}) VALUES (${placeholders})`
        ).bind(...values)
      ];

      if (parsedSnap.children && ALLOWED_ADMIN_TABLES.has(parsedSnap.children.childTable)) {
        const cTable = parsedSnap.children.childTable;
        for (const cRow of parsedSnap.children.rows || []) {
          const cCols = Object.keys(cRow);
          const cPlaceholders = cCols.map((_, idx) => `?${idx + 1}`).join(', ');
          const cVals = cCols.map((c) => cRow[c]);
          stmts.push(
            env.DB.prepare(
              `INSERT OR REPLACE INTO ${cTable} (${cCols.join(', ')}) VALUES (${cPlaceholders})`
            ).bind(...cVals)
          );
        }
      }

      if (TABLE_META[targetTable]?.balanceAffecting) {
        stmts.push(buildReconciliationStatement(env));
      }

      stmts.push(
        env.DB.prepare(`
          INSERT INTO admin_action_log (admin_user_id, action, table_name, record_id, record_snapshot, reason)
          VALUES (?1, 'RESTORE_ROW', ?2, ?3, ?4, ?5)
        `).bind(
          auth.user.id,
          targetTable,
          String(logEntry.record_id),
          JSON.stringify({ restoredFromActionId: actionId }),
          `Restored deleted row from action #${actionId}`
        )
      );

      await env.DB.batch(stmts);

      return json({
        ok: true,
        restored: { table: targetTable, record_id: logEntry.record_id, from_action_id: actionId }
      });
    }

    return json({ ok: false, error: `Unsupported Admin API route: ${method} /api/admin/${routeParts.join('/')}` }, 404);
  } catch (err) {
    console.error('Admin API Error:', err);
    return json({ ok: false, error: String(err.message || err) }, 500);
  }
}