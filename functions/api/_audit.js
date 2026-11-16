// ── Audit Log Helper ──
// Writes to audit_log table for FDA/LTO compliance tracking
// Column names match the deployed migration.sql:
//   entity_type (not table_name), entity_id (not record_id)

export async function audit(env, user, action, entityType, entityId, details) {
  await env.DB.prepare(
    'INSERT INTO audit_log (id, actor, role, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?,?)'
  ).bind(
    crypto.randomUUID(),
    user?.username || 'system',
    user?.role || null,
    action,
    entityType,
    entityId,
    details
  ).run();
}
