import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../pixel_event.db');

// Ensure db directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Promisified DB helpers
export const queryAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

export const queryGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const queryRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// Initialize schema
export const initDb = async () => {
  // Users
  await queryRun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'PARTICIPANT',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Participants
  await queryRun(`
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      registration_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      college_name TEXT NOT NULL,
      college_type TEXT NOT NULL,
      course TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      student_id TEXT NOT NULL,
      city TEXT NOT NULL,
      avatar_url TEXT,
      round_status TEXT NOT NULL DEFAULT 'ROUND_1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Event Settings
  await queryRun(`
    CREATE TABLE IF NOT EXISTS event_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      event_name TEXT NOT NULL,
      tagline TEXT NOT NULL,
      description TEXT NOT NULL,
      organizers TEXT NOT NULL,
      venue TEXT NOT NULL,
      event_dates TEXT NOT NULL,
      participation_fee REAL NOT NULL,
      payment_qr_path TEXT NOT NULL,
      registration_open INTEGER NOT NULL DEFAULT 1,
      show_coordinators INTEGER NOT NULL DEFAULT 1,
      student_coordinators TEXT NOT NULL,
      teacher_coordinators TEXT NOT NULL,
      round1_info TEXT NOT NULL,
      round2_info TEXT NOT NULL,
      round3_info TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Payments
  await queryRun(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      transaction_ref TEXT NOT NULL,
      amount REAL NOT NULL,
      payer_name TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      screenshot_path TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'UNDER_REVIEW',
      rejection_reason TEXT,
      reviewed_by TEXT REFERENCES users(id),
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tickets
  await queryRun(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      ticket_number TEXT UNIQUE NOT NULL,
      participant_id TEXT UNIQUE NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      payment_id TEXT UNIQUE NOT NULL REFERENCES payments(id),
      verification_hash TEXT UNIQUE NOT NULL,
      qr_data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      checked_in_at DATETIME,
      checked_in_by TEXT REFERENCES users(id),
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Announcements
  await queryRun(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'GENERAL',
      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Audit Logs
  await queryRun(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Submissions (Photo Competition Entries)
  await queryRun(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      round_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      caption TEXT,
      photo_path TEXT NOT NULL,
      camera_details TEXT,
      status TEXT NOT NULL DEFAULT 'SUBMITTED',
      score_creativity REAL DEFAULT 0,
      score_theme REAL DEFAULT 0,
      score_storytelling REAL DEFAULT 0,
      score_technical REAL DEFAULT 0,
      total_score REAL DEFAULT 0,
      judge_feedback TEXT,
      judged_by TEXT REFERENCES users(id),
      judged_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Email Delivery Logs
  await queryRun(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      template_name TEXT NOT NULL,
      status TEXT NOT NULL,
      details TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default Event Settings if not exists
  const existingSettings = await queryGet('SELECT id FROM event_settings WHERE id = 1');
  if (!existingSettings) {
    const round1 = JSON.stringify({
      title: 'ONE FRAME, ONE STORY',
      format: 'Individual participation',
      reporting_time: '10:30 AM — Reporting Time',
      task: 'Capture one photograph based on the given theme and submit it with a title/tagline or story.',
      presentation_time: '60 seconds per participant',
      key_focus: 'Creativity, Theme Relevance, Storytelling, Critical Thinking, Presentation'
    });

    const round2 = JSON.stringify({
      title: 'THE SHUTTER HUNT',
      format: 'Individual participation',
      note: 'Shortlisted participants from Round 1 advance to this round.',
      concept: 'Each participant receives a unique one-line message, explores the campus, captures a photo that best represents it, and submits it within the time limit for shortlisting to Round 3.',
      key_focus: 'Creative Interpretation, Observation Skills, Teamwork, Originality',
      example_messages: [
        'A picture a place where time feels still',
        'Find something that shows contrast',
        'Capture the silent hard work'
      ]
    });

    const round3 = JSON.stringify({
      title: 'FINAL FRAME EXHIBITION',
      format: 'Individual display',
      note: 'Shortlisted participants from Round 2 advance to the final exhibition.',
      submission: 'Bring up to 4 of your best photographs, printed or displayed on your phone/laptop. Present your own stall, explain the story behind each image, and engage the judges and audience.',
      key_focus: 'Creativity, Image Quality, Storytelling, Presentation, Audience Engagement'
    });

    const studentCoordinators = JSON.stringify([
      { name: 'Parth Ranjan', phone: '6207595113' },
      { name: 'Prathvish Singh', phone: '8109794298' }
    ]);

    const teacherCoordinators = JSON.stringify([
      'Prof. Neha Singh Rajput',
      'Prof. Yogesh Verma',
      'Prof. Sudhir Geed',
      'Dr. Saurabh Chandra'
    ]);

    await queryRun(`
      INSERT INTO event_settings (
        id, event_name, tagline, description, organizers, venue, event_dates,
        participation_fee, payment_qr_path, registration_open, show_coordinators,
        student_coordinators, teacher_coordinators, round1_info, round2_info, round3_info
      ) VALUES (
        1,
        'PIXEL — FRAME THE DAY',
        'Not just a photo, but a perspective.',
        'A photography experience to capture stories, explore campus perspectives, and showcase creativity.',
        'LNCT Group of Colleges, Bhopal',
        'LNCT Group of Colleges, Raisen Road, Bhopal',
        '29, 30 & 31 October',
        59.00,
        '/uploads/qrcodes/official_payment_qr.jpg',
        1,
        1,
        ?,
        ?,
        ?,
        ?,
        ?
      )
    `, [studentCoordinators, teacherCoordinators, round1, round2, round3]);
    console.log('Default event settings initialized from poster info.');
  }

  // Seed default Admin account if not exists
  const adminUser = await queryGet('SELECT id FROM users WHERE email = ?', ['admin@pixel.lnct.ac.in']);
  if (!adminUser) {
    const adminId = uuidv4();
    const adminPasswordHash = await bcrypt.hash('Admin@Pixel2026', 10);
    await queryRun(`
      INSERT INTO users (id, email, password_hash, role)
      VALUES (?, ?, ?, 'ADMIN')
    `, [adminId, 'admin@pixel.lnct.ac.in', adminPasswordHash]);
    console.log('Seeded Administrator: admin@pixel.lnct.ac.in / Admin@Pixel2026');
  }

  // Seed default Staff scanner account if not exists
  const staffUser = await queryGet('SELECT id FROM users WHERE email = ?', ['staff@pixel.lnct.ac.in']);
  if (!staffUser) {
    const staffId = uuidv4();
    const staffPasswordHash = await bcrypt.hash('Staff@Pixel2026', 10);
    await queryRun(`
      INSERT INTO users (id, email, password_hash, role)
      VALUES (?, ?, ?, 'STAFF')
    `, [staffId, 'staff@pixel.lnct.ac.in', staffPasswordHash]);
    console.log('Seeded Staff Account: staff@pixel.lnct.ac.in / Staff@Pixel2026');
  }

  // Seed sample announcements
  const existingAnnouncements = await queryGet('SELECT COUNT(*) as count FROM announcements');
  if (existingAnnouncements.count === 0) {
    await queryRun(`
      INSERT INTO announcements (id, title, content, category)
      VALUES 
      (?, 'Registrations Open for PIXEL 2026!', 'LNCT Group of Colleges invites all photography enthusiasts to register for PIXEL — FRAME THE DAY. Check round guidelines and register now.', 'GENERAL'),
      (?, 'Official Payment QR Code Active', 'Pay the ₹59 participation fee via UPI to confirm your registration. Remember to submit your transaction reference and screenshot for rapid verification.', 'GENERAL')
    `, [uuidv4(), uuidv4()]);
  }

  console.log('Database initialization completed.');
};
