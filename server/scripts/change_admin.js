import bcrypt from 'bcryptjs';
import { db, queryGet, queryRun } from '../src/db.js';

const email = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@lnct.ac.in';
const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'Pixel#LNCT2026!Secure';

async function updateAdmin() {
  console.log(`Updating Administrator credentials to: ${email}...`);
  const hash = await bcrypt.hash(password, 10);
  
  const existing = await queryGet("SELECT id FROM users WHERE role = 'ADMIN' OR email = ? OR email = 'admin@pixel.lnct.ac.in'", [email]);
  if (existing) {
    await queryRun('UPDATE users SET email = ?, password_hash = ? WHERE id = ?', [email, hash, existing.id]);
    console.log(`✔ Successfully updated Admin ID to: ${email}`);
    console.log(`✔ New password encrypted and saved.`);
  } else {
    console.log('No existing admin found. Restart server to seed automatically.');
  }
  process.exit(0);
}

updateAdmin().catch(err => {
  console.error('Error updating admin:', err);
  process.exit(1);
});
