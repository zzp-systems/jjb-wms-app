// ── Shared JWT & password utilities for Pages Functions ──
// Located at functions/api/_jwt.js
// Imported by:
//   functions/api/auth/login.js  → signJWT, verifyPassword
//   functions/_middleware.js     → verifyJWT, getTokenFromRequest
//   functions/users/[id].js      → hashPassword
//
// Prefixed with "_" so Pages does NOT serve this as a route.

// ── base64url helpers ──
function base64UrlEncode(data) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ── JWT sign / verify (HS256) ──

/**
 * Sign a JWT using HMAC-SHA256.
 * @param {object} payload  - claims to encode
 * @param {string} secret   - JWT_SECRET from env
 * @returns {Promise<string>} compact JWT
 */
export async function signJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;

  const keyMaterial = new TextEncoder().encode(secret || '');
  const key = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigB64 = base64UrlEncode(signature);
  return `${data}.${sigB64}`;
}

/**
 * Verify a compact JWT (HS256).
 * Returns the decoded payload if valid, or null if invalid / expired.
 * @param {string} token
 * @param {string} secret
 * @returns {Promise<object|null>}
 */
export async function verifyJWT(token, secret) {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const data = `${headerB64}.${payloadB64}`;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const signature = base64UrlDecode(sigB64);
    const valid = await crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(data));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

// ── Token extraction ──

/**
 * Extract a Bearer token from the Authorization header.
 * @param {Request} request
 * @returns {string|null}
 */
export function getTokenFromRequest(request) {
  const auth = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

// ── Password hashing (SHA-256) ──

/**
 * Hash a plaintext password using SHA-256 (Web Crypto API).
 * Returns a 64-character lowercase hex string.
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify a plaintext password against a stored SHA-256 hex hash.
 * @param {string} plaintext
 * @param {string} storedHash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(plaintext, storedHash) {
  if (!storedHash) return false;
  const hash = await hashPassword(plaintext);
  return hash === storedHash;
}
