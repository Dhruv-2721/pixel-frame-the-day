import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../pixel_event.db');
const uploadsDir = path.resolve(__dirname, '../uploads');

const db = new sqlite3.Database(dbPath);

console.log('Cleaning test data from PIXEL event database...');

db.serialize(() => {
  // Delete all test participant submissions
  db.run('DELETE FROM submissions', (err) => {
    if (err) console.error('Error cleaning submissions:', err);
    else console.log('✔ Cleaned submissions table.');
  });

  // Delete all issued tickets
  db.run('DELETE FROM tickets', (err) => {
    if (err) console.error('Error cleaning tickets:', err);
    else console.log('✔ Cleaned tickets table.');
  });

  // Delete all payment records
  db.run('DELETE FROM payments', (err) => {
    if (err) console.error('Error cleaning payments:', err);
    else console.log('✔ Cleaned payments table.');
  });

  // Delete all participants
  db.run('DELETE FROM participants', (err) => {
    if (err) console.error('Error cleaning participants:', err);
    else console.log('✔ Cleaned participants table.');
  });

  // Delete all participant user accounts (preserve ADMIN and STAFF accounts!)
  db.run("DELETE FROM users WHERE role = 'PARTICIPANT'", (err) => {
    if (err) console.error('Error cleaning participant users:', err);
    else console.log('✔ Cleaned participant user accounts (Preserved Admin and Staff).');
  });

  // Clean test audit logs
  db.run("DELETE FROM audit_logs", (err) => {
    if (err) console.error('Error cleaning audit logs:', err);
    else console.log('✔ Reset audit logs.');
  });

  // Clean email logs
  db.run("DELETE FROM email_logs", (err) => {
    if (err) console.error('Error cleaning email logs:', err);
    else console.log('✔ Reset email logs.');
  });

  // Vacuum SQLite database to reclaim space
  db.run('VACUUM', (err) => {
    if (err) console.error('Vacuum error:', err);
    else console.log('✔ Database vacuumed and optimized.');
    db.close();
  });
});

// Clean uploaded test files from payment_proofs
const proofsDir = path.join(uploadsDir, 'payment_proofs');
if (fs.existsSync(proofsDir)) {
  const files = fs.readdirSync(proofsDir);
  for (const f of files) {
    fs.unlinkSync(path.join(proofsDir, f));
  }
  console.log(`✔ Removed ${files.length} test payment screenshot(s).`);
}

// Clean uploaded test photos from submissions
const submissionsDir = path.join(uploadsDir, 'submissions');
if (fs.existsSync(submissionsDir)) {
  const files = fs.readdirSync(submissionsDir);
  for (const f of files) {
    fs.unlinkSync(path.join(submissionsDir, f));
  }
  console.log(`✔ Removed ${files.length} test submission photograph(s).`);
}

console.log('Cleanup completed successfully! Platform is fresh and pristine.');
