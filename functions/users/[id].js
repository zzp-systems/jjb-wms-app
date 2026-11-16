// ── WMS Admin: User Management (GET, PUT, DELETE) ──
// /api/users/:id
// Requires admin role (enforced by middleware JWT + requireAdmin check)

import { hashPassword } from '../api/_jwt.js';

// ── Inline audit logger (no shared _audit.js — sync.js uses its own inline audit too) ──
async function audit(env, user, action, entityType, entityId, description) {
  let actor = user?.name || user?.username || user?.userId || 'system';
  let role = user?.roleName || user?.role_name || user?.role || null;

  if (user?.userId && env?.DB) {
    const u = await env.DB.prepare(
      'SELECT u.name, r.role_name FROM users u LEFT JOIN roles r ON u.role_category = r.role_key WHERE u.id = ?'
    ).bind(user.userId).first();
    if (u) {
      actor = u.name;
      role = u.role_name;
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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requireAdmin(data) {
  return data?.user?.role === 'admin' || data?.user?.role === 'ADMIN';
}

// ── GET /api/users/:id ──
export async function onRequestGet({ request, env, data, params }) {
  if (!requireAdmin(data)) return json({ error: 'Admin access required' }, 403);

  const id = params.id;
  if (!id) return json({ error: 'User ID required' }, 400);

  try {
    const user = await env.DB.prepare(
      'SELECT id, username, name, email, title, station, role_category, is_active, created_at FROM users WHERE id = ?'
    ).bind(id).first();

    if (!user) return json({ error: 'User not found' }, 404);

    let roleName = null;
    if (user.role_category) {
      const role = await env.DB.prepare(
        'SELECT role_name FROM roles WHERE role_key = ?'
      ).bind(user.role_category).first();
      roleName = role?.role_name || null;
    }

    return json({ ...user, role_name: roleName });
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
}

// ── PUT /api/users/:id ──
export async function onRequestPut({ request, env, data, params }) {
  if (!requireAdmin(data)) return json({ error: 'Admin access required' }, 403);

  const id = params.id;
  if (!id) return json({ error: 'User ID required' }, 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  try {
    const old = await env.DB.prepare(
      'SELECT username, name, email, title, station, role_category, password_hash FROM users WHERE id = ?'
    ).bind(id).first();

    if (!old) return json({ error: 'User not found' }, 404);

    const updates = [];
    const values = [];

    if (body.username != null) { updates.push('username = ?'); values.push(body.username); }
    if (body.name != null) { updates.push('name = ?'); values.push(body.name); }
    if (body.email != null) { updates.push('email = ?'); values.push(body.email); }
    if (body.title != null) { updates.push('title = ?'); values.push(body.title); }
    if (body.station != null) { updates.push('station = ?'); values.push(body.station); }
    if (body.role_category != null) { updates.push('role_category = ?'); values.push(body.role_category); }

    let passwordHash = old.password_hash;
    if (body.password) {
      passwordHash = await hashPassword(body.password);
      updates.push('password_hash = ?');
      values.push(passwordHash);
    }

    if (body.is_active != null) { updates.push('is_active = ?'); values.push(body.is_active ? 1 : 0); }

    if (updates.length === 0) {
      return json({ error: 'No fields to update' }, 400);
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await env.DB.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    await audit(env, data.user, 'UPDATE', 'users', id, `Updated user: ${old.username}`);

    return json({ success: true, message: `User ${old.username} updated` });
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
}

// ── DELETE /api/users/:id (soft delete — set is_active = 0) ──
export async function onRequestDelete({ request, env, data, params }) {
  if (!requireAdmin(data)) return json({ error: 'Admin access required' }, 403);

  const id = params.id;
  if (!id) return json({ error: 'User ID required' }, 400);

  try {
    const old = await env.DB.prepare(
      'SELECT username, name FROM users WHERE id = ?'
    ).bind(id).first();

    if (!old) return json({ error: 'User not found' }, 404);

    await env.DB.prepare(
      "UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ?"
    ).bind(id).run();

    await audit(env, data.user, 'DEACTIVATE', 'users', id, 'Deactivated user');

    return json({ success: true, message: `User ${old.username} deactivated` });
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
}
