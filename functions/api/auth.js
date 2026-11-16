// ── WMS Auth: Index handler for /api/auth (exact) ──
// Login is handled by auth/login.js (POST /api/auth/login)
// Me is handled by auth/me.js (GET /api/auth/me)
// This file only matches /api/auth (exact) — returns 404.

export async function onRequestGet() {
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestPost() {
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}
