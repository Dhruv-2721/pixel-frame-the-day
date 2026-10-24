import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { ZipArchive } from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import {
  queryGet,
  queryRun,
  queryAll,
  isPostgres,
  createDatabaseBackup
} from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../pixel_event.db');
const backupDir = path.resolve(__dirname, '../../backups');
const baseUploadDir = path.resolve(__dirname, '../../uploads');
const submissionsDir = path.join(baseUploadDir, 'submissions');
const paymentProofsDir = path.join(baseUploadDir, 'payment_proofs');

// Ensure base upload subdirectories exist
[submissionsDir, paymentProofsDir, backupDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer memory storage specifically for uploading backup JSON files (up to 200MB)
const uploadBackup = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }
});

const router = express.Router();

// Helper to escape CSV fields
const escapeCsv = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

/**
 * 1. GET /api/admin/backup/overview
 * Real-time health, row counts across all tables, and snapshot history
 */
router.get('/overview', requireAuth, requireAdmin, async (req, res) => {
  try {
    const totalUsers = (await queryGet('SELECT COUNT(*) as c FROM users')).c || 0;
    const totalParticipants = (await queryGet('SELECT COUNT(*) as c FROM participants')).c || 0;
    const totalPayments = (await queryGet('SELECT COUNT(*) as c FROM payments')).c || 0;
    const verifiedPayments = (await queryGet("SELECT COUNT(*) as c FROM payments WHERE status = 'VERIFIED'")).c || 0;
    const underReviewPayments = (await queryGet("SELECT COUNT(*) as c FROM payments WHERE status = 'UNDER_REVIEW'")).c || 0;
    const rejectedPayments = (await queryGet("SELECT COUNT(*) as c FROM payments WHERE status = 'REJECTED'")).c || 0;
    const totalRevenue = (await queryGet("SELECT SUM(amount) as s FROM payments WHERE status = 'VERIFIED'")).s || 0;

    const totalTickets = (await queryGet('SELECT COUNT(*) as c FROM tickets')).c || 0;
    const checkedInTickets = (await queryGet("SELECT COUNT(*) as c FROM tickets WHERE status = 'CHECKED_IN'")).c || 0;

    const totalSubmissions = (await queryGet('SELECT COUNT(*) as c FROM submissions')).c || 0;
    const round1Submissions = (await queryGet('SELECT COUNT(*) as c FROM submissions WHERE round_number = 1')).c || 0;
    const round2Submissions = (await queryGet('SELECT COUNT(*) as c FROM submissions WHERE round_number = 2')).c || 0;
    const round3Submissions = (await queryGet('SELECT COUNT(*) as c FROM submissions WHERE round_number = 3')).c || 0;

    const totalAnnouncements = (await queryGet('SELECT COUNT(*) as c FROM announcements')).c || 0;
    const totalAuditLogs = (await queryGet('SELECT COUNT(*) as c FROM audit_logs')).c || 0;
    const totalEmailLogs = (await queryGet('SELECT COUNT(*) as c FROM email_logs')).c || 0;

    let dbSizeBytes = 0;
    if (!isPostgres && fs.existsSync(dbPath)) {
      try {
        dbSizeBytes = fs.statSync(dbPath).size;
      } catch (_) {}
    }

    // List automated snapshots in server/backups
    let snapshots = [];
    if (fs.existsSync(backupDir)) {
      snapshots = fs.readdirSync(backupDir)
        .filter((f) => f.startsWith('backup_') && f.endsWith('.db'))
        .map((f) => {
          const p = path.join(backupDir, f);
          const stat = fs.statSync(p);
          return {
            filename: f,
            sizeBytes: stat.size,
            sizeFormatted: (stat.size / 1024).toFixed(1) + ' KB',
            createdAt: stat.mtime.toISOString()
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return res.json({
      status: 'HEALTHY',
      databaseEngine: isPostgres ? 'PostgreSQL' : 'SQLite (Embedded with Automated Snapshots)',
      databaseSizeBytes: dbSizeBytes,
      databaseSizeFormatted: (dbSizeBytes / 1024).toFixed(1) + ' KB',
      counts: {
        users: totalUsers,
        participants: totalParticipants,
        payments: {
          total: totalPayments,
          verified: verifiedPayments,
          underReview: underReviewPayments,
          rejected: rejectedPayments,
          totalRevenue
        },
        tickets: {
          total: totalTickets,
          checkedIn: checkedInTickets
        },
        submissions: {
          total: totalSubmissions,
          round1: round1Submissions,
          round2: round2Submissions,
          round3: round3Submissions
        },
        announcements: totalAnnouncements,
        auditLogs: totalAuditLogs,
        emailLogs: totalEmailLogs
      },
      automatedSnapshots: snapshots,
      lastSnapshotTime: snapshots.length > 0 ? snapshots[0].createdAt : null,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Backup overview error:', error);
    return res.status(500).json({ error: 'Failed to retrieve backup overview.' });
  }
});

/**
 * 2. GET /api/admin/backup/export-json
 * Exports complete master backup JSON containing every table, row, and base64 media buffer
 */
router.get('/export-json', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await queryAll('SELECT id, email, password_hash, role, created_at FROM users');
    const participants = await queryAll('SELECT * FROM participants ORDER BY created_at ASC');
    const eventSettings = await queryAll('SELECT * FROM event_settings');
    const payments = await queryAll('SELECT * FROM payments ORDER BY created_at ASC');
    const tickets = await queryAll('SELECT * FROM tickets ORDER BY issued_at ASC');
    const submissions = await queryAll('SELECT * FROM submissions ORDER BY created_at ASC');
    const announcements = await queryAll('SELECT * FROM announcements ORDER BY created_at ASC');
    const auditLogs = await queryAll('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500');
    const emailLogs = await queryAll('SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 500');

    const backupPayload = {
      app: 'PIXEL — FRAME THE DAY',
      organization: 'LNCT Group of Colleges, Bhopal',
      backup_version: '2.0',
      exported_at: new Date().toISOString(),
      exported_by: req.user.email,
      database_engine: isPostgres ? 'PostgreSQL' : 'SQLite',
      summary: {
        users: users.length,
        participants: participants.length,
        event_settings: eventSettings.length,
        payments: payments.length,
        tickets: tickets.length,
        submissions: submissions.length,
        announcements: announcements.length,
        audit_logs: auditLogs.length,
        email_logs: emailLogs.length
      },
      tables: {
        users,
        participants,
        event_settings: eventSettings,
        payments,
        tickets,
        submissions,
        announcements,
        audit_logs: auditLogs,
        email_logs: emailLogs
      }
    };

    // Log the export action
    await queryRun(`
      INSERT INTO audit_logs (id, user_id, user_email, action, target_type, target_id, details)
      VALUES (?, ?, ?, 'MASTER_BACKUP_EXPORTED', 'SYSTEM', 'DATABASE', ?)
    `, [
      uuidv4(),
      req.user.id,
      req.user.email,
      `Full master backup downloaded: ${participants.length} participants, ${payments.length} payments, ${submissions.length} submissions`
    ]);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `pixel_master_backup_${timestamp}.json`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(JSON.stringify(backupPayload, null, 2));
  } catch (error) {
    console.error('Export JSON backup error:', error);
    return res.status(500).json({ error: 'Failed to generate master JSON backup.' });
  }
});

/**
 * 3. GET /api/admin/backup/export-zip
 * Bundles Master JSON + Participant CSV + Raw SQLite DB + Photo files + Payment Proofs into a single ZIP
 */
router.get('/export-zip', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await queryAll('SELECT id, email, password_hash, role, created_at FROM users');
    const participants = await queryAll('SELECT * FROM participants ORDER BY created_at ASC');
    const eventSettings = await queryAll('SELECT * FROM event_settings');
    const payments = await queryAll('SELECT * FROM payments ORDER BY created_at ASC');
    const tickets = await queryAll('SELECT * FROM tickets ORDER BY issued_at ASC');
    const submissions = await queryAll('SELECT * FROM submissions ORDER BY created_at ASC');
    const announcements = await queryAll('SELECT * FROM announcements ORDER BY created_at ASC');
    const auditLogs = await queryAll('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500');
    const emailLogs = await queryAll('SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 500');

    const backupPayload = {
      app: 'PIXEL — FRAME THE DAY',
      organization: 'LNCT Group of Colleges, Bhopal',
      backup_version: '2.0',
      exported_at: new Date().toISOString(),
      exported_by: req.user.email,
      database_engine: isPostgres ? 'PostgreSQL' : 'SQLite',
      summary: {
        users: users.length,
        participants: participants.length,
        event_settings: eventSettings.length,
        payments: payments.length,
        tickets: tickets.length,
        submissions: submissions.length,
        announcements: announcements.length,
        audit_logs: auditLogs.length,
        email_logs: emailLogs.length
      },
      tables: {
        users,
        participants,
        event_settings: eventSettings,
        payments,
        tickets,
        submissions,
        announcements,
        audit_logs: auditLogs,
        email_logs: emailLogs
      }
    };

    const archive = new ZipArchive({ zlib: { level: 6 } });

    archive.on('error', (err) => {
      console.error('Master ZIP archive streaming error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate master zip archive.' });
      }
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipName = `PIXEL_2026_COMPLETE_SYSTEM_BACKUP_${timestamp}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    archive.pipe(res);

    // 1. Add Master JSON Backup
    archive.append(JSON.stringify(backupPayload, null, 2), { name: 'PIXEL_MASTER_BACKUP.json' });

    // 2. Add Readme & Restoration Instructions
    const instructions = `================================================================================
PIXEL — FRAME THE DAY 2026 (LNCT Group of Colleges, Bhopal)
COMPLETE ALL-DATA SYSTEM BACKUP ARCHIVE
================================================================================
Exported On : ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
Exported By : ${req.user.email}

CONTENTS OF THIS ARCHIVE:
1. PIXEL_MASTER_BACKUP.json
   - Full master database dump of all tables (users, participants, payments,
     tickets, submissions, event settings, announcements, audit logs).
   - Contains raw base64 data for all photos and payment screenshots.
   - CAN BE RE-UPLOADED TO THE WEBSITE VIA THE ADMIN DASHBOARD TO RESTORE ALL DATA.

2. participants_roster.csv
   - Formatted spreadsheet of all participants, registration numbers, payments,
     tickets, and competition rounds for offline reporting.

3. database/pixel_event.db (if using SQLite)
   - The direct binary database file.

4. photos/
   - Participant uploaded competition photography entries, organized by round.

5. payments/
   - Verification payment screenshots uploaded by participants.

RESTORING FROM THIS BACKUP:
- Open the Admin Dashboard -> "Data Backup & Recovery" tab.
- Click "Restore from Backup" and upload the "PIXEL_MASTER_BACKUP.json" file.
- The platform will automatically restore all participants, payments, tickets,
  and photos into the active database!
================================================================================
`;
    archive.append(instructions, { name: 'README_BACKUP_AND_RESTORE.txt' });

    // 3. Add Participant Call-Sheet CSV
    const csvHeaders = [
      'Registration ID', 'Full Name', 'Email', 'Mobile', 'College Name',
      'College Type', 'Course', 'Academic Year', 'Student ID', 'City',
      'Round Status', 'Payment Status', 'Transaction ID', 'Amount',
      'Ticket Number', 'Ticket Status', 'Created At'
    ];
    let csv = csvHeaders.join(',') + '\r\n';
    for (const pt of participants) {
      const p = payments.find((x) => x.participant_id === pt.id) || {};
      const t = tickets.find((x) => x.participant_id === pt.id) || {};
      const u = users.find((x) => x.id === pt.user_id) || {};
      csv += [
        escapeCsv(pt.registration_id),
        escapeCsv(pt.full_name),
        escapeCsv(u.email || ''),
        escapeCsv(pt.mobile),
        escapeCsv(pt.college_name),
        escapeCsv(pt.college_type),
        escapeCsv(pt.course),
        escapeCsv(pt.academic_year),
        escapeCsv(pt.student_id),
        escapeCsv(pt.city),
        escapeCsv(pt.round_status),
        escapeCsv(p.status || 'NOT_SUBMITTED'),
        escapeCsv(p.transaction_ref || ''),
        escapeCsv(p.amount || ''),
        escapeCsv(t.ticket_number || ''),
        escapeCsv(t.status || 'NO_TICKET'),
        escapeCsv(pt.created_at)
      ].join(',') + '\r\n';
    }
    archive.append('\uFEFF' + csv, { name: 'participants_roster.csv' });

    // 4. Add Raw SQLite Database file if available
    if (!isPostgres && fs.existsSync(dbPath)) {
      archive.file(dbPath, { name: 'database/pixel_event.db' });
    }

    // 5. Add All Photos (submissions)
    for (const sub of submissions) {
      const cleanReg = (sub.participant_id || 'PARTICIPANT').slice(0, 8);
      const cleanTitle = (sub.title || 'untitled').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = sub.photo_path ? path.basename(sub.photo_path) : `photo_${sub.id}.jpg`;
      const diskPath = path.join(submissionsDir, filename);
      const zipPath = `photos/Round_${sub.round_number}/${cleanReg}_${cleanTitle}_${filename}`;

      if (fs.existsSync(diskPath)) {
        archive.file(diskPath, { name: zipPath });
      } else if (sub.photo_data) {
        try {
          const match = sub.photo_data.match(/^data:([^;]+);base64,(.+)$/);
          const base64Content = match ? match[2] : sub.photo_data;
          const buffer = Buffer.from(base64Content, 'base64');
          archive.append(buffer, { name: zipPath });
        } catch (_) {}
      }
    }

    // 6. Add All Payment Proof Screenshots
    for (const pay of payments) {
      const filename = pay.screenshot_path ? path.basename(pay.screenshot_path) : `pay_${pay.id}.jpg`;
      const diskPath = path.join(paymentProofsDir, filename);
      const zipPath = `payments/${pay.transaction_ref || 'TXN'}_${filename}`;

      if (fs.existsSync(diskPath)) {
        archive.file(diskPath, { name: zipPath });
      } else if (pay.screenshot_data) {
        try {
          const match = pay.screenshot_data.match(/^data:([^;]+);base64,(.+)$/);
          const base64Content = match ? match[2] : pay.screenshot_data;
          const buffer = Buffer.from(base64Content, 'base64');
          archive.append(buffer, { name: zipPath });
        } catch (_) {}
      }
    }

    // Finalize the archive
    await archive.finalize();

    // Log the action
    await queryRun(`
      INSERT INTO audit_logs (id, user_id, user_email, action, target_type, target_id, details)
      VALUES (?, ?, ?, 'MASTER_ZIP_BACKUP_EXPORTED', 'SYSTEM', 'DATABASE', ?)
    `, [
      uuidv4(),
      req.user.id,
      req.user.email,
      `Full master ZIP system archive downloaded: ${participants.length} participants, ${submissions.length} photos, ${payments.length} payment proofs`
    ]);
  } catch (error) {
    console.error('Export ZIP backup error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to generate master ZIP archive.' });
    }
  }
});

/**
 * 4. GET /api/admin/backup/download-db
 * Direct download of raw SQLite database file
 */
router.get('/download-db', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (isPostgres) {
      return res.status(400).json({
        error: 'System is currently running on PostgreSQL cloud cluster. Use "Download Master JSON Backup" or "Download Complete System ZIP" for full database exports.'
      });
    }

    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'SQLite database file not found on disk.' });
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="pixel_event_${timestamp}.db"`);
    return res.sendFile(dbPath);
  } catch (error) {
    console.error('Download db error:', error);
    return res.status(500).json({ error: 'Failed to download database file.' });
  }
});

/**
 * 5. GET /api/admin/backup/snapshot/:filename
 * Download a specific automated snapshot from server/backups
 */
router.get('/snapshot/:filename', requireAuth, requireAdmin, async (req, res) => {
  try {
    const filename = req.params.filename;
    // Security check: only allow safe snapshot filenames
    if (!/^backup_[\w\-.]+\.db$/.test(filename)) {
      return res.status(400).json({ error: 'Invalid snapshot filename.' });
    }

    const filePath = path.join(backupDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Snapshot not found.' });
    }

    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Download snapshot error:', error);
    return res.status(500).json({ error: 'Failed to download snapshot.' });
  }
});

/**
 * 6. POST /api/admin/backup/create-snapshot
 * Triggers an immediate server-side disk snapshot
 */
router.post('/create-snapshot', requireAuth, requireAdmin, async (req, res) => {
  try {
    createDatabaseBackup();

    await queryRun(`
      INSERT INTO audit_logs (id, user_id, user_email, action, target_type, target_id, details)
      VALUES (?, ?, ?, 'MANUAL_SNAPSHOT_CREATED', 'SYSTEM', 'DATABASE', ?)
    `, [uuidv4(), req.user.id, req.user.email, 'Admin manually triggered an immediate database snapshot']);

    return res.json({ message: 'Database snapshot created successfully.' });
  } catch (error) {
    console.error('Create snapshot error:', error);
    return res.status(500).json({ error: 'Failed to create database snapshot.' });
  }
});

/**
 * 7. POST /api/admin/backup/restore-json
 * Accepts a previously exported JSON backup file (via multipart file or JSON body)
 * and safely restores/merges all records, restoring any missing participants, payments,
 * tickets, photos, and physical files on disk.
 */
router.post('/restore-json', requireAuth, requireAdmin, uploadBackup.single('backup_file'), async (req, res) => {
  try {
    let backup = null;

    if (req.file) {
      try {
        const fileContent = req.file.buffer.toString('utf-8');
        backup = JSON.parse(fileContent);
      } catch (parseErr) {
        return res.status(400).json({ error: 'Invalid JSON file. Please provide an authentic PIXEL backup JSON file.' });
      }
    } else if (req.body && req.body.backup_data) {
      backup = typeof req.body.backup_data === 'string' ? JSON.parse(req.body.backup_data) : req.body.backup_data;
    } else if (req.body && req.body.tables) {
      backup = req.body;
    }

    if (!backup || !backup.tables) {
      return res.status(400).json({
        error: 'Invalid backup structure. The file must contain a valid "tables" object exported from PIXEL.'
      });
    }

    const {
      users = [],
      participants = [],
      event_settings = [],
      payments = [],
      tickets = [],
      submissions = [],
      announcements = []
    } = backup.tables;

    const stats = {
      usersRestored: 0,
      participantsRestored: 0,
      paymentsRestored: 0,
      ticketsRestored: 0,
      submissionsRestored: 0,
      announcementsRestored: 0,
      filesRestored: 0
    };

    // 1. Restore Users
    for (const u of users) {
      if (!u.id || !u.email) continue;
      const existing = await queryGet('SELECT id FROM users WHERE id = ? OR email = ?', [u.id, u.email]);
      if (!existing) {
        await queryRun(
          'INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
          [u.id, u.email, u.password_hash, u.role || 'PARTICIPANT', u.created_at || new Date().toISOString()]
        );
        stats.usersRestored++;
      } else {
        await queryRun(
          'UPDATE users SET password_hash = ?, role = ? WHERE id = ?',
          [u.password_hash, u.role, existing.id]
        );
      }
    }

    // 2. Restore Participants
    for (const pt of participants) {
      if (!pt.id || !pt.user_id) continue;
      const existing = await queryGet('SELECT id FROM participants WHERE id = ? OR registration_id = ?', [pt.id, pt.registration_id]);
      if (!existing) {
        await queryRun(`
          INSERT INTO participants (
            id, user_id, registration_id, full_name, mobile, college_name,
            college_type, course, academic_year, student_id, city, avatar_url,
            round_status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          pt.id, pt.user_id, pt.registration_id, pt.full_name, pt.mobile, pt.college_name,
          pt.college_type, pt.course, pt.academic_year, pt.student_id, pt.city, pt.avatar_url || null,
          pt.round_status || 'ROUND_1', pt.created_at || new Date().toISOString()
        ]);
        stats.participantsRestored++;
      } else {
        await queryRun(`
          UPDATE participants SET
            full_name = ?, mobile = ?, college_name = ?, college_type = ?,
            course = ?, academic_year = ?, student_id = ?, city = ?, round_status = ?
          WHERE id = ?
        `, [
          pt.full_name, pt.mobile, pt.college_name, pt.college_type,
          pt.course, pt.academic_year, pt.student_id, pt.city, pt.round_status,
          existing.id
        ]);
      }
    }

    // 3. Restore Event Settings
    if (event_settings.length > 0) {
      const s = event_settings[0];
      await queryRun(`
        UPDATE event_settings SET
          event_name = ?, tagline = ?, description = ?, organizers = ?,
          venue = ?, event_dates = ?, participation_fee = ?, payment_qr_path = ?,
          registration_open = ?, show_coordinators = ?, student_coordinators = ?,
          teacher_coordinators = ?, round1_info = ?, round2_info = ?, round3_info = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `, [
        s.event_name, s.tagline, s.description, s.organizers,
        s.venue, s.event_dates, s.participation_fee, s.payment_qr_path,
        s.registration_open, s.show_coordinators, s.student_coordinators,
        s.teacher_coordinators, s.round1_info, s.round2_info, s.round3_info
      ]);
    }

    // 4. Restore Payments
    for (const p of payments) {
      if (!p.id || !p.participant_id) continue;
      const existing = await queryGet('SELECT id FROM payments WHERE id = ?', [p.id]);
      if (!existing) {
        await queryRun(`
          INSERT INTO payments (
            id, participant_id, transaction_ref, amount, payer_name,
            payment_date, screenshot_path, screenshot_data, notes,
            status, rejection_reason, reviewed_by, reviewed_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          p.id, p.participant_id, p.transaction_ref, p.amount, p.payer_name,
          p.payment_date, p.screenshot_path, p.screenshot_data || null, p.notes || null,
          p.status || 'UNDER_REVIEW', p.rejection_reason || null, p.reviewed_by || null,
          p.reviewed_at || null, p.created_at || new Date().toISOString()
        ]);
        stats.paymentsRestored++;
      } else {
        await queryRun(`
          UPDATE payments SET
            transaction_ref = ?, amount = ?, payer_name = ?, status = ?,
            screenshot_data = COALESCE(?, screenshot_data)
          WHERE id = ?
        `, [p.transaction_ref, p.amount, p.payer_name, p.status, p.screenshot_data || null, p.id]);
      }

      // Re-create physical screenshot file on disk if missing and base64 exists
      if (p.screenshot_path && p.screenshot_data) {
        try {
          const filename = path.basename(p.screenshot_path);
          const fullPath = path.join(paymentProofsDir, filename);
          if (!fs.existsSync(fullPath)) {
            const match = p.screenshot_data.match(/^data:([^;]+);base64,(.+)$/);
            const base64Content = match ? match[2] : p.screenshot_data;
            fs.writeFileSync(fullPath, Buffer.from(base64Content, 'base64'));
            stats.filesRestored++;
          }
        } catch (_) {}
      }
    }

    // 5. Restore Tickets
    for (const t of tickets) {
      if (!t.id || !t.participant_id) continue;
      const existing = await queryGet('SELECT id FROM tickets WHERE id = ?', [t.id]);
      if (!existing) {
        await queryRun(`
          INSERT INTO tickets (
            id, ticket_number, participant_id, payment_id, verification_hash,
            qr_data, status, checked_in_at, checked_in_by, issued_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          t.id, t.ticket_number, t.participant_id, t.payment_id, t.verification_hash,
          t.qr_data, t.status || 'ACTIVE', t.checked_in_at || null, t.checked_in_by || null,
          t.issued_at || new Date().toISOString()
        ]);
        stats.ticketsRestored++;
      }
    }

    // 6. Restore Submissions (Photos)
    for (const sub of submissions) {
      if (!sub.id || !sub.participant_id) continue;
      const existing = await queryGet('SELECT id FROM submissions WHERE id = ?', [sub.id]);
      if (!existing) {
        await queryRun(`
          INSERT INTO submissions (
            id, participant_id, round_number, title, caption, photo_path,
            photo_data, camera_details, status, score_creativity, score_theme,
            score_storytelling, score_technical, total_score, judge_feedback,
            judged_by, judged_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          sub.id, sub.participant_id, sub.round_number, sub.title, sub.caption || null,
          sub.photo_path, sub.photo_data || null, sub.camera_details || null, sub.status || 'SUBMITTED',
          sub.score_creativity || 0, sub.score_theme || 0, sub.score_storytelling || 0,
          sub.score_technical || 0, sub.total_score || 0, sub.judge_feedback || null,
          sub.judged_by || null, sub.judged_at || null, sub.created_at || new Date().toISOString(),
          sub.updated_at || new Date().toISOString()
        ]);
        stats.submissionsRestored++;
      } else {
        await queryRun(`
          UPDATE submissions SET
            title = ?, caption = ?, total_score = ?, judge_feedback = ?,
            photo_data = COALESCE(?, photo_data)
          WHERE id = ?
        `, [sub.title, sub.caption, sub.total_score, sub.judge_feedback, sub.photo_data || null, sub.id]);
      }

      // Re-create physical submission photo file on disk if missing and base64 exists
      if (sub.photo_path && sub.photo_data) {
        try {
          const filename = path.basename(sub.photo_path);
          const fullPath = path.join(submissionsDir, filename);
          if (!fs.existsSync(fullPath)) {
            const match = sub.photo_data.match(/^data:([^;]+);base64,(.+)$/);
            const base64Content = match ? match[2] : sub.photo_data;
            fs.writeFileSync(fullPath, Buffer.from(base64Content, 'base64'));
            stats.filesRestored++;
          }
        } catch (_) {}
      }
    }

    // 7. Restore Announcements
    for (const a of announcements) {
      if (!a.id || !a.title) continue;
      const existing = await queryGet('SELECT id FROM announcements WHERE id = ?', [a.id]);
      if (!existing) {
        await queryRun(`
          INSERT INTO announcements (id, title, content, category, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [a.id, a.title, a.content, a.category || 'GENERAL', a.created_by || null, a.created_at || new Date().toISOString()]);
        stats.announcementsRestored++;
      }
    }

    // Log the restore event into audit_logs
    await queryRun(`
      INSERT INTO audit_logs (id, user_id, user_email, action, target_type, target_id, details)
      VALUES (?, ?, ?, 'DATABASE_RESTORE_COMPLETED', 'SYSTEM', 'DATABASE', ?)
    `, [
      uuidv4(),
      req.user.id,
      req.user.email,
      `Restored backup successfully: +${stats.usersRestored} users, +${stats.participantsRestored} participants, +${stats.paymentsRestored} payments, +${stats.ticketsRestored} tickets, +${stats.submissionsRestored} photos, +${stats.filesRestored} files written to disk`
    ]);

    return res.json({
      message: 'System data restoration completed successfully! All records and photos have been restored and verified.',
      restoredCounts: stats
    });
  } catch (error) {
    console.error('Restore backup error:', error);
    return res.status(500).json({ error: `Failed to restore data: ${error.message}` });
  }
});

/**
 * 8. POST /api/admin/backup/clear-test-data
 * Clears participant test records, tickets, payments, submissions, and email logs
 * Keeps admin & staff users, settings, and announcements intact.
 */
router.post('/clear-test-data', requireAuth, requireAdmin, async (req, res) => {
  try {
    createDatabaseBackup();

    await queryRun('DELETE FROM tickets');
    await queryRun('DELETE FROM submissions');
    await queryRun('DELETE FROM payments');
    await queryRun('DELETE FROM participants');
    await queryRun("DELETE FROM users WHERE role = 'PARTICIPANT'");
    await queryRun('DELETE FROM email_logs');

    // Clean runtime uploaded submissions and payment proofs on disk
    [submissionsDir, paymentProofsDir].forEach((dir) => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const f of files) {
          if (f !== '.gitkeep') {
            try { fs.unlinkSync(path.join(dir, f)); } catch (_) {}
          }
        }
      }
    });

    await queryRun(`
      INSERT INTO audit_logs (id, user_id, user_email, action, target_type, target_id, details)
      VALUES (?, ?, ?, 'TEST_DATA_CLEARED', 'SYSTEM', 'DATABASE', ?)
    `, [uuidv4(), req.user.id, req.user.email, 'Admin cleared all test participants, tickets, payments, and submissions']);

    return res.json({ message: 'All test participants and submissions have been cleared successfully. System reset to clean state.' });
  } catch (error) {
    console.error('Clear test data error:', error);
    return res.status(500).json({ error: 'Failed to clear test data: ' + error.message });
  }
});

export default router;
