// ── Shared audit-logging utility for Pages Functions ──
// Prefixed with "_" so Pages does NOT serve this as a route; imported by other Functions.
//
// Writes to the `audit_log` D1 table:
//   (id, timestamp, actor, role, action, details, is_test_data, created_at, entity_type, entity_id)

/**
 * Write an audit-log entry.
 *
 * @param {object}  env        — env with the D1 `DB` binding
 * @param {object}  user      — the authenticated user object (data.user from middleware)
 * @param {string}  action     — e.g. 'UPDATE', 'DEACTIVATE', 'CREATE', 'DELETE'
 * @param {string}  entityType — table/entity audited, e.g. 'users'
 * @param {string|number} entityId — primary key of the affected row
 * @param {string}  description — human-readable summary
 * @returns {Promise<void>}
 */
export async function audit(env, user, action, entityType, entityId, description) {
  let actor = user?.name || user?.username || user?.userId || 'system';
  let role  = user?.roleName || user?.role_name || user?.role || null;

  // Look up the user's display name and role name from the database
  // so the audit log matches the format used by the rest of the app
  // (actor = full name, role = role_name e.g. "Warehouse Supervisor").
  if (user?.userId && env?.DB) {
    const u = await env.DB.prepare(
      'SELECT u.name, r.role_name FROM users u LEFT JOIN roles r ON u.role_category = r.role_key WHERE u.id = ?'
    ).bind(user.userId).first();
    if (u) {
      actor = u.name;
      role  = u.role_name;
    }
  }

  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

  await env.DB.prepare(
    'INSERT INTO audit_log (timestamp, actor, role, action, details, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    timestamp,
    actor,
    role,
    action,
    description,
    entityType || null,
    entityId != null ? String(entityId) : null
  ).run();
}
