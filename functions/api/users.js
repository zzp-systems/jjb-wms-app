// ── WMS User Management (admin only) ──

// Self-contained PBKDF2 hasher so we don't depend on _jwt.js paths
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return `${[...salt].map(b => b.toString(16).padStart(2,'0')).join('')}:${[...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,'0')).join('')}`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function requireAdmin(data) {
  // Checks for both 'admin' and 'Administrator' just in case
  return data?.user?.role === 'admin' || data?.user?.role === 'Administrator'; 
}

// ── GET /api/users ──
export async function onRequestGet({ env, data }) {
  if (!requireAdmin(data)) return json({ error: 'Admin access required' }, 403);

  const result = await env.DB.prepare(
    'SELECT id, username, name, email, role_category, is_active, created_at FROM users ORDER BY created_at'
  ).all();

  return json({ users: result.results });
}

// ── POST /api/users ──
export async function onRequestPost({ request, env, data }) {
  if (!requireAdmin(data)) return json({ error: 'Admin access required' }, 403);

  const body = await request.json();

  if (!body.username || !body.password || !body.name) {
    return json({ error: 'username, password, and name are required' }, 400);
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(body.username).first();
  if (existing) return json({ error: 'Username already exists' }, 409);

  const hash = await hashPassword(body.password);
  const id = body.id || crypto.randomUUID();

  await env.DB.prepare(
    'INSERT INTO users (id, username, name, email, role_category, password_hash, is_active) VALUES (?,?,?,?,?,?,1)'
  ).bind(id, body.username, body.name, body.email || null, body.role || 'staff', hash).run();

  return json({
    success: true,
    user: { id, username: body.username, name: body.name, email: body.email, role_category: body.role || 'staff' }
  }, 201);
}

// ── DELETE /api/users/:id ──
export async function onRequestDelete({ env, data, params }) {
  if (!requireAdmin(data)) return json({ error: 'Admin access required' }, 403);

  const id = params.id;
  if (id === data.user.userId) return json({ error: 'Cannot deactivate yourself' }, 400);

  await env.DB.prepare('UPDATE users SET is_active = 0 WHERE id = ?').bind(id).run();

  return json({ success: true });
}