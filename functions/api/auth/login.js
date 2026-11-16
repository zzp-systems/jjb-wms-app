// ── WMS Auth: Login (POST) ──
// POST /api/auth/login → { token, user }
//
// Two auth modes:
// 1. D1 users table (primary; used when the user exists and has a password_hash)
// 2. WMS_AUTH_USERS env var JSON (fallback for users not present in D1,
//    or present in D1 without a password_hash)
//
// Mode 2 is NOT a password bypass — if a user exists in D1 with a hash,
// a wrong password does NOT fall through to the env var list.

import { signJWT, verifyPassword } from '../_jwt.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Constant-time string comparison for env-var plaintext passwords.
function timingSafeEqualString(a, b) {
  const aLen = a.length, bLen = b.length;
  const maxLen = Math.max(aLen, bLen);
  let diff = aLen ^ bLen;
  for (let i = 0; i < maxLen; i++) {
    diff |= (a.charCodeAt(i) | 0) ^ (b.charCodeAt(i) | 0);
  }
  return diff === 0;
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { username, password } = body || {};
  if (
    typeof username !== 'string' || typeof password !== 'string' ||
    username.length === 0 || password.length === 0
  ) {
    return json({ error: 'Username and password required' }, 400);
  }

  let user = null;
  let validPassword = false;
  let tryEnvFallback = false;

  // ── Mode 1: D1 users table ──
  if (env.DB) {
    try {
      const row = await env.DB.prepare(
        'SELECT id, username, name, email, role_category, password_hash FROM users WHERE username = ? AND is_active = 1'
      ).bind(username).first();

      if (!row) {
        tryEnvFallback = true;
      } else if (!row.password_hash) {
        tryEnvFallback = true;
      } else {
        validPassword = await verifyPassword(password, row.password_hash);
        if (validPassword) {
          user = row;
        } else {
          // User exists in D1 with a hash but password is wrong.
          // Do NOT fall through to env var — that would be a bypass.
          return json({ error: 'Invalid credentials' }, 401);
        }
      }
    } catch (e) {
      console.log('D1 users lookup failed, trying fallback:', e.message);
      tryEnvFallback = true;
    }
  } else {
    tryEnvFallback = true;
  }

  // ── Mode 2: WMS_AUTH_USERS env var ──
  if (tryEnvFallback && (!user || !validPassword)) {
    try {
      const authUsers = env.WMS_AUTH_USERS ? JSON.parse(env.WMS_AUTH_USERS) : null;
      if (Array.isArray(authUsers)) {
        const found = authUsers.find(u =>
          u && typeof u.username === 'string' && typeof u.password === 'string' &&
          u.username === username && timingSafeEqualString(u.password, password)
        );
        if (found) {
          user = {
            id: found.username,
            username: found.username,
            name: found.name || found.username,
            email: found.email || null,
            role_category: found.role || 'staff',
          };
          validPassword = true;
        }
      }
    } catch (e) {
      console.log('WMS_AUTH_USERS parse failed:', e.message);
    }
  }

  if (!user || !validPassword) {
    return json({ error: 'Invalid credentials' }, 401);
  }

  // ── Sign JWT ──
  try {
    const token = await signJWT(
      {
        userId: user.id,
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role_category,
        exp: Math.floor(Date.now() / 1000) + 86400 * 7,
      },
      env.JWT_SECRET
    );

    return json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role_category,
      },
    });
  } catch (e) {
    console.error('signJWT failed:', e.message);
    return json(
      { error: 'Failed to generate authentication token. Check JWT_SECRET is set in Cloudflare Pages environment variables.' },
      500
    );
  }
}
