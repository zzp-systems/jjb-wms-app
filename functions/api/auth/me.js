// ── WMS Auth: Get Current User (GET) ──
// GET /api/auth/me → { user }
//
// Requires JWT (populated by _middleware.js into context.data.user).
// Response shape matches /api/auth/login user shape:
//   { id, username, name, email, role }

export async function onRequestGet({ data }) {
  if (!data?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const u = data.user;
  return new Response(
    JSON.stringify({
      user: {
        id: u.id ?? u.userId ?? null,
        username: u.username ?? null,
        name: u.name ?? null,
        email: u.email ?? null,
        role: u.role ?? null,
      },
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}