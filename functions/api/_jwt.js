// ── Shared JWT & password utilities for Pages Functions ──
// Prefixed with "_" so Pages does NOT serve this as a route; imported by other Functions.

/**
 * Hash a plaintext password using SHA-256 (Web Crypto API).
 * Returns a 64-character lowercase hex string.
 *
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
