// ── JJB CRM Shared JWT Utility (HS256 via Web Crypto API) ──
// Shared with WMS via same JWT_SECRET for SSO
// Token format: base64url(header).base64url(payload).base64url(signature)
//
// Password hashing: PBKDF2 (100K iterations, SHA-256, 16-byte salt)
// Stored format: "salt_hex:hash_hex" in password_hash column

const enc = new TextEncoder();
const dec = new TextDecoder();

// ── PBKDF2 config ──
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEY_LENGTH = 256; // bits → 32 bytes
const SALT_LENGTH = 16; // bytes

function base64urlEncode(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function base64urlEncodeStr(str) {
  return base64urlEncode(enc.encode(str));
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return arr;
}

async function getHmacKey(secret) {
  return crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign', 'verify']
  );
}

// ── Sign a JWT ──
export async function signJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64urlEncodeStr(JSON.stringify(header));
  const payloadB64 = base64urlEncodeStr(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const key = await getHmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const sigB64 = base64urlEncode(new Uint8Array(sig));
  return `${data}.${sigB64}`;
}

// ── Verify a JWT, returns payload or null ──
export async function verifyJWT(token, secret) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const key = await getHmacKey(secret);
  const sig = base64urlDecode(sigB64);
  const valid = await crypto.subtle.verify('HMAC', key, sig, enc.encode(data));
  if (!valid) return null;
  try {
    const payload = JSON.parse(dec.decode(base64urlDecode(payloadB64)));
    if (payload.exp && Date.now() > payload.exp * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Password hashing (PBKDF2) ──
// Returns "salt_hex:hash_hex" string for storage in password_hash column
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial, PBKDF2_KEY_LENGTH
  );
  return `${bytesToHex(salt)}:${bytesToHex(derived)}`;
}

// ── Verify a password against a stored hash ──
// Supports PBKDF2 ("salt_hex:hash_hex") and legacy SHA-256 (plain hex)
export async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;

  // PBKDF2 format: "salt_hex:hash_hex"
  if (storedHash.includes(':')) {
    const [saltHex, hashHex] = storedHash.split(':');
    const salt = hexToBytes(saltHex);
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const derived = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      keyMaterial, PBKDF2_KEY_LENGTH
    );
    return bytesToHex(derived) === hashHex;
  }

  // Legacy SHA-256 format (plain hex) — for backward compatibility
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(password));
  return bytesToHex(buf) === storedHash;
}

// ── Extract Bearer token from request ──
export function getTokenFromRequest(request) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}
