// reset-passwords.mjs
import crypto from 'crypto';

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const saltHex = salt.toString('hex');
  const hashHex = hash.toString('hex');
  return `pbkdf2_sha256$100000$${saltHex}$${hashHex}`;
}

const newPassword = 'jjb2026';  // <-- The new password for all users
const hash = hashPassword(newPassword);

console.log('\n=== COPY THIS INTO CLOUDFLARE D1 CONSOLE ===\n');
console.log(`UPDATE users SET password_hash = '${hash}' WHERE is_active = 1;`);
console.log('\n=== END ===\n');
console.log(`All 6 users will now have the password: ${newPassword}`);