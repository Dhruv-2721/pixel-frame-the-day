import bcrypt from 'bcryptjs';
import { db, queryGet, queryRun } from '../src/db.js';

const email = process.argv[2] || process.env.STAFF_EMAIL || 'staff@lnct.ac.in';
const password = process.argv[3] || process.env.STAFF_PASSWORD || 'Staff#LNCT2026!Gate';

async function updateStaff() {
  console.log(`Updating Staff credentials to: ${email}...`);
  const hash = await bcrypt.hash(password, 10);
  
  const existing = await queryGet("SELECT id FROM users WHERE role = 'STAFF' OR email = ? OR email = 'staff@pixel.lnct.ac.in'", [email]);
  if (existing) {
    await queryRun('UPDATE users SET email = ?, password_hash = ? WHERE id = ?', [email, hash, existing.id]);
    console.log(`✔ Successfully updated Staff ID to: ${email}`);
    console.log(`✔ New password encrypted and saved.`);
  } else {
    console.log('No existing staff found. Restart server to seed automatically.');
  }
  process.exit(0);
}

updateStaff().catch(err => {
  console.error('Error updating staff:', err);
  process.exit(1);
});
