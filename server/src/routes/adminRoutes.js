import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { queryGet, queryRun, queryAll } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get Analytics Overview
router.get('/analytics', requireAuth, requireAdmin, async (req, res) => {
  try {
    const totalRegistrations = (await queryGet('SELECT COUNT(*) as c FROM participants')).c;
    const pendingReviews = (await queryGet("SELECT COUNT(*) as c FROM payments WHERE status = 'UNDER_REVIEW'")).c;
    const verifiedPayments = (await queryGet("SELECT COUNT(*) as c FROM payments WHERE status = 'VERIFIED'")).c;
    const rejectedPayments = (await queryGet("SELECT COUNT(*) as c FROM payments WHERE status = 'REJECTED'")).c;
    const ticketsIssued = (await queryGet("SELECT COUNT(*) as c FROM tickets WHERE status != 'CANCELLED'")).c;
    const checkedInCount = (await queryGet("SELECT COUNT(*) as c FROM tickets WHERE status = 'CHECKED_IN'")).c;
    const totalRevenue = (await queryGet("SELECT SUM(amount) as s FROM payments WHERE status = 'VERIFIED'")).s || 0;

    // Round breakdown
    const round1Count = (await queryGet("SELECT COUNT(*) as c FROM participants WHERE round_status = 'ROUND_1'")).c;
    const round2Count = (await queryGet("SELECT COUNT(*) as c FROM participants WHERE round_status = 'ROUND_2'")).c;
    const round3Count = (await queryGet("SELECT COUNT(*) as c FROM participants WHERE round_status = 'ROUND_3'")).c;
    const winnersCount = (await queryGet("SELECT COUNT(*) as c FROM participants WHERE round_status LIKE 'WINNER%'")).c;

    // College breakdown
    const lnctCount = (await queryGet("SELECT COUNT(*) as c FROM participants WHERE college_type = 'LNCT'")).c;
    const otherCount = (await queryGet("SELECT COUNT(*) as c FROM participants WHERE college_type = 'OTHER'")).c;

    return res.json({
      metrics: {
        totalRegistrations,
        pendingReviews,
        verifiedPayments,
        rejectedPayments,
        ticketsIssued,
        checkedInCount,
        totalRevenue,
        rounds: {
          round1: round1Count,
          round2: round2Count,
          round3: round3Count,
          winners: winnersCount
        },
        colleges: {
          lnct: lnctCount,
          other: otherCount
        }
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
});

// List participants with filters, search, and pagination
router.get('/participants', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { college_type, academic_year, payment_status, round_status, search } = req.query;

    let sql = `
      SELECT 
        pt.*,
        u.email,
        p.status as payment_status,
        p.transaction_ref,
        p.amount as payment_amount,
        p.id as payment_id,
        t.ticket_number,
        t.status as ticket_status,
        t.checked_in_at
      FROM participants pt
      JOIN users u ON pt.user_id = u.id
      LEFT JOIN payments p ON p.participant_id = pt.id
      LEFT JOIN tickets t ON t.participant_id = pt.id
      WHERE 1=1
    `;
    const params = [];

    if (college_type && college_type !== 'ALL') {
      sql += ' AND pt.college_type = ?';
      params.push(college_type);
    }

    if (academic_year && academic_year !== 'ALL') {
      sql += ' AND pt.academic_year LIKE ?';
      params.push(`%${academic_year}%`);
    }

    if (payment_status && payment_status !== 'ALL') {
      if (payment_status === 'NOT_SUBMITTED') {
        sql += ' AND p.status IS NULL';
      } else {
        sql += ' AND p.status = ?';
        params.push(payment_status);
      }
    }

    if (round_status && round_status !== 'ALL') {
      sql += ' AND pt.round_status = ?';
      params.push(round_status);
    }

    if (search) {
      sql += ' AND (pt.full_name LIKE ? OR pt.registration_id LIKE ? OR u.email LIKE ? OR pt.college_name LIKE ? OR pt.mobile LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }

    sql += ' ORDER BY pt.created_at DESC';

    const participants = await queryAll(sql, params);
    return res.json({ participants });
  } catch (error) {
    console.error('Admin participants list error:', error);
    return res.status(500).json({ error: 'Failed to fetch participants.' });
  }
});

// Update participant round status (shortlist / advance)
router.post('/participants/:id/round', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { round_status } = req.body;
    const participantId = req.params.id;

    const allowed = ['ROUND_1', 'ROUND_2', 'ROUND_3', 'ELIMINATED', 'WINNER_1ST', 'WINNER_2ND', 'WINNER_3RD'];
    if (!allowed.includes(round_status)) {
      return res.status(400).json({ error: 'Invalid round status value.' });
    }

    const participant = await queryGet('SELECT * FROM participants WHERE id = ?', [participantId]);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found.' });
    }

    await queryRun('UPDATE participants SET round_status = ? WHERE id = ?', [round_status, participantId]);

    await queryRun(`
      INSERT INTO audit_logs (id, user_id, user_email, action, target_type, target_id, details)
      VALUES (?, ?, ?, 'ROUND_STATUS_UPDATED', 'PARTICIPANT', ?, ?)
    `, [
      uuidv4(),
      req.user.id,
      req.user.email,
      participantId,
      `Updated ${participant.full_name} (${participant.registration_id}) round status to ${round_status}`
    ]);

    return res.json({ message: `Participant promoted/updated to ${round_status} successfully.` });
  } catch (error) {
    console.error('Update round status error:', error);
    return res.status(500).json({ error: 'Failed to update round status.' });
  }
});

// CSV Export (Supports current filters or full participant export)
router.get('/export-csv', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { college_type, academic_year, payment_status, round_status, search } = req.query;

    let sql = `
      SELECT 
        pt.registration_id,
        pt.full_name,
        u.email,
        pt.mobile,
        pt.college_name,
        pt.college_type,
        pt.course,
        pt.academic_year,
        pt.student_id,
        pt.city,
        pt.round_status,
        COALESCE(p.status, 'NOT_SUBMITTED') as payment_status,
        p.transaction_ref,
        p.amount,
        t.ticket_number,
        COALESCE(t.status, 'NO_TICKET') as ticket_status,
        t.checked_in_at,
        pt.created_at
      FROM participants pt
      JOIN users u ON pt.user_id = u.id
      LEFT JOIN (
        SELECT p1.*
        FROM payments p1
        INNER JOIN (
          SELECT participant_id, MAX(created_at) as max_created
          FROM payments
          GROUP BY participant_id
        ) p2 ON p1.participant_id = p2.participant_id AND p1.created_at = p2.max_created
      ) p ON p.participant_id = pt.id
      LEFT JOIN tickets t ON t.participant_id = pt.id
      WHERE 1=1
    `;
    const params = [];

    if (college_type && college_type !== 'ALL') {
      sql += ' AND pt.college_type = ?';
      params.push(college_type);
    }

    if (academic_year && academic_year !== 'ALL') {
      sql += ' AND pt.academic_year LIKE ?';
      params.push(`%${academic_year}%`);
    }

    if (payment_status && payment_status !== 'ALL') {
      if (payment_status === 'NOT_SUBMITTED') {
        sql += ' AND p.status IS NULL';
      } else {
        sql += ' AND p.status = ?';
        params.push(payment_status);
      }
    }

    if (round_status && round_status !== 'ALL') {
      sql += ' AND pt.round_status = ?';
      params.push(round_status);
    }

    if (search && search.trim()) {
      sql += ' AND (pt.full_name LIKE ? OR pt.registration_id LIKE ? OR u.email LIKE ? OR pt.mobile LIKE ? OR pt.student_id LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }

    sql += ' ORDER BY pt.created_at DESC';

    const rows = await queryAll(sql, params);

    const headers = [
      'Registration ID', 'Full Name', 'Email', 'Mobile', 'College Name',
      'College Type', 'Course', 'Academic Year', 'Student ID', 'City',
      'Round Status', 'Payment Status', 'Transaction ID / UTR', 'Fee Paid (INR)',
      'Ticket Number', 'Ticket Status', 'Gate Checked In At', 'Registration Timestamp'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    let csv = headers.join(',') + '\r\n';
    for (const r of rows) {
      csv += [
        escapeCsv(r.registration_id),
        escapeCsv(r.full_name),
        escapeCsv(r.email),
        escapeCsv(r.mobile),
        escapeCsv(r.college_name),
        escapeCsv(r.college_type),
        escapeCsv(r.course),
        escapeCsv(r.academic_year),
        escapeCsv(r.student_id),
        escapeCsv(r.city),
        escapeCsv(r.round_status),
        escapeCsv(r.payment_status),
        escapeCsv(r.transaction_ref),
        escapeCsv(r.amount),
        escapeCsv(r.ticket_number),
        escapeCsv(r.ticket_status),
        escapeCsv(r.checked_in_at),
        escapeCsv(r.created_at)
      ].join(',') + '\r\n';
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="pixel_2026_participants.csv"');
    // Prepend UTF-8 BOM (\uFEFF) so Excel and Google Sheets open Unicode characters correctly
    return res.status(200).send('\uFEFF' + csv);
  } catch (error) {
    console.error('CSV export error:', error);
    return res.status(500).json({ error: 'Failed to generate CSV export.' });
  }
});

// Audit Logs
router.get('/audit-logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const logs = await queryAll('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200');
    return res.json({ logs });
  } catch (error) {
    console.error('Audit logs error:', error);
    return res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

// Email Delivery Logs
router.get('/email-logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const logs = await queryAll('SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 100');
    return res.json({ logs });
  } catch (error) {
    console.error('Email logs error:', error);
    return res.status(500).json({ error: 'Failed to fetch email logs.' });
  }
});

// Admin creates a new staff or admin user
router.post('/users/create', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required.' });
    }

    if (!['ADMIN', 'STAFF'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either ADMIN or STAFF.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await queryGet('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, 10);

    await queryRun('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)', [
      id, cleanEmail, password_hash, role
    ]);

    await queryRun(`
      INSERT INTO audit_logs (id, user_id, user_email, action, target_type, target_id, details)
      VALUES (?, ?, ?, 'STAFF_USER_CREATED', 'USER', ?, ?)
    `, [uuidv4(), req.user.id, req.user.email, id, `Created new ${role} user: ${cleanEmail}`]);

    return res.status(201).json({ message: `Created new ${role} user ${cleanEmail} successfully.` });
  } catch (error) {
    console.error('Create staff error:', error);
    return res.status(500).json({ error: 'Failed to create user.' });
  }
});

export default router;

