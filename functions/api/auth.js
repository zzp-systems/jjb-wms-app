// functions/api/auth.js — JJB WMS
import { signJWT, verifyPassword, getTokenFromRequest } from './_jwt.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return json({ error: 'Username and password are required' }, 400);
    }

    const user = await env.DB.prepare(
      'SELECT * FROM users WHERE (username = ? OR id = ?) AND is_active = 1'
    ).bind(username, username).first();

    if (!user) {
      return json({ error: 'Invalid credentials' }, 401);
    }

    // 1. Check Master Password
    let isValid = false;
    if (user.password_hash) {
      isValid = await verifyPassword(password, user.password_hash);
    }

    // 2. Check 4-Digit Shift PIN fallback
    if (!isValid && user.shift_pin_hash) {
      // Only try PIN verification if the input looks like a 4-digit code
      if (/^\d{4}$/.test(password)) {
        isValid = await verifyPassword(password, user.shift_pin_hash);
      }
    }

    if (!isValid) {
      return json({ error: 'Invalid username or password/PIN' }, 401);
    }

    // 3. Generate JWT with user context
    const token = await signJWT({
      userId: user.id,
      username: user.username,
      role: user.role_category,
      name: user.name
    }, env.JWT_SECRET);

    // Update last_login_at
    await env.DB.prepare('UPDATE users SET last_login_at = datetime("now") WHERE id = ?').bind(user.id).run();

    return json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        title: user.title,
        role_category: user.role_category,
        station: user.station
      }
    });
  } catch (err) {
    return json({ error: 'Login failed', detail: err.message }, 500);
  }
}

export async function onRequestGet({ request, env }) {
  try {
    const token = getTokenFromRequest(request);
    const { verifyJWT } = await import('./_jwt.js');
    const payload = await verifyJWT(token, env.JWT_SECRET);
    if (!payload) return json({ error: 'Unauthorized' }, 401);

    const user = await env.DB.prepare('SELECT id, username, name, title, role_category, station FROM users WHERE id = ?').bind(payload.userId).first();
    return json({ user });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}