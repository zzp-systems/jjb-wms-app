// ── WMS Auth: Login + Me ──
// POST /api/auth/login  → { token, user }
// GET  /api/auth/me     → { user }

import { signJWT, verifyPassword, getTokenFromRequest } from './_jwt.js';

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);

  if (url.pathname === '/api/auth/login') {
    const { username, password } = await request.json();

    const user = await env.DB.prepare(
      'SELECT id, username, name, email, role_category, password_hash FROM users WHERE username = ? AND is_active = 1'
    ).bind(username).first();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = await signJWT(
      { userId: user.id, username: user.username, role: user.role_category, exp: Math.floor(Date.now() / 1000) + 86400 * 7 },
      env.JWT_SECRET
    );

    return new Response(JSON.stringify({
      token,
      user: { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role_category },
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestGet({ request, env, data }) {
  const url = new URL(request.url);

  if (url.pathname === '/api/auth/me') {
    return new Response(JSON.stringify({ user: data.user }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
}
