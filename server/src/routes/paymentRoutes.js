import express from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { queryGet, queryRun, queryAll } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validateUploadSignature } from '../middleware/security.js';
import { notificationService } from '../services/notificationService.js';
import { sendTicketConfirmationEmail, sendPaymentRejectionEmail } from '../services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseUploadDir = path.resolve(__dirname, '../../uploads');

const router = express.Router();

// Participant submits payment proof
router.post('/submit', requireAuth, upload.single('screenshot'), validateUploadSignature, async (req, res) => {
  try {
    if (req.user.role !== 'PARTICIPANT') {
      return res.status(403).json({ error: 'Only participants can submit payment proof.' });
    }

    const participant = await queryGet('SELECT * FROM participants WHERE user_id = ?', [req.user.id]);
    if (!participant) {
      return res.status(404).json({ error: 'Participant profile not found.' });
    }

    const { transaction_ref, amount, payer_name, payment_date, notes } = req.body;

    if (!transaction_ref || !amount || !payer_name || !payment_date) {
      // Remove uploaded file if validation failed
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Transaction ID, amount, payer name, and payment date are mandatory.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a clear screenshot of your payment confirmation.' });
    }

    const screenshot_path = `/uploads/payment_proofs/${req.file.filename}`;

    // Check existing payment records for this participant
    const existingPayment = await queryGet(
      'SELECT * FROM payments WHERE participant_id = ? ORDER BY created_at DESC LIMIT 1',
      [participant.id]
    );

    if (existingPayment) {
      if (existingPayment.status === 'VERIFIED') {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Your payment has already been verified and your ticket is issued.' });
      }

      if (existingPayment.status === 'UNDER_REVIEW') {
        // Update existing pending payment record
        await queryRun(`
          UPDATE payments 
          SET transaction_ref = ?, amount = ?, payer_name = ?, payment_date = ?, 
              screenshot_path = ?, notes = ?, status = 'UNDER_REVIEW', created_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          transaction_ref.trim(),
          parseFloat(amount),
          payer_name.trim(),
          payment_date.trim(),
          screenshot_path,
          notes ? notes.trim() : null,
          existingPayment.id
        ]);

        await queryRun(`
          INSERT INTO audit_logs (id, user_id, user_email, action, target_type, target_id, details)
          VALUES (?, ?, ?, 'PAYMENT_UPDATED', 'PAYMENT', ?, ?)
        `, [uuidv4(), req.user.id, req.user.email, existingPayment.id, `Updated payment proof: Ref ${transaction_ref.trim()}`]);

        notificationService.notifyAdmins('NEW_PAYMENT', {
          paymentId: existingPayment.id,
          participantName: participant.full_name,
          registrationId: participant.registration_id,
          amount: parseFloat(amount),
          transactionRef: transaction_ref.trim(),
          message: `💳 Updated payment proof from ${participant.full_name} (₹${amount})`
        });

        const updated = await queryGet('SELECT * FROM payments WHERE id = ?', [existingPayment.id]);
        return res.json({
          message: 'Payment proof updated successfully. An administrator will review your submission shortly.',
          payment: updated
        });
      }

      if (existingPayment.status === 'REJECTED') {
        // Resubmission after rejection!
        await queryRun(`
          UPDATE payments 
          SET transaction_ref = ?, amount = ?, payer_name = ?, payment_date = ?, 
              screenshot_path = ?, notes = ?, status = 'UNDER_REVIEW', rejection_reason = NULL,
              reviewed_by = NULL, reviewed_at = NULL, created_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          transaction_ref.trim(),
          parseFloat(amount),
          payer_name.trim(),
          payment_date.trim(),
          screenshot_path,
          notes ? notes.trim() : null,
          existingPayment.id
        ]);

        await queryRun(`
          INSERT INTO audit_logs (id, user_id, user_email, action, target_type, target_id, details)
          VALUES (?, ?, ?, 'PAYMENT_RESUBMITTED', 'PAYMENT', ?, ?)
        `, [uuidv4(), req.user.id, req.user.email, existingPayment.id, `Resubmitted payment proof after rejection: Ref ${transaction_ref.trim()}`]);

        notificationService.notifyAdmins('NEW_PAYMENT', {
          paymentId: existingPayment.id,
          participantName: participant.full_name,
          registrationId: participant.registration_id,
          amount: parseFloat(amount),
          transactionRef: transaction_ref.trim(),
          message: `💳 Resubmitted payment proof from ${participant.full_name} (₹${amount})`
        });

        const updated = await queryGet('SELECT * FROM payments WHERE id = ?', [existingPayment.id]);
        return res.json({
          message: 'Payment proof resubmitted successfully. It is now under review.',
          payment: updated
        });
      }
    }

    // Fresh new payment record
    const paymentId = uuidv4();
    await queryRun(`
      INSERT INTO payments (
        id, participant_id, transaction_ref, amount, payer_name,
        payment_date, screenshot_path, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'UNDER_REVIEW')
    `, [
      paymentId,
      participant.id,
      transaction_ref.trim(),
      parseFloat(amount),
      payer_name.trim(),
      payment_date.trim(),
      screenshot_path,
      notes ? notes.trim() : null
    ]);

    await queryRun(`
      INSERT INTO audit_logs (id, user_id, user_email, action, target_type, target_id, details)
      VALUES (?, ?, ?, 'PAYMENT_SUBMITTED', 'PAYMENT', ?, ?)
    `, [uuidv4(), req.user.id, req.user.email, paymentId, `Submitted payment proof: Ref ${transaction_ref.trim()} (INR ${amount})`]);

    notificationService.notifyAdmins('NEW_PAYMENT', {
      paymentId,
      participantName: participant.full_name,
      registrationId: participant.registration_id,
      amount: parseFloat(amount),
      transactionRef: transaction_ref.trim(),
      message: `💳 New payment submitted by ${participant.full_name} (₹${amount})`
    });

    const created = await queryGet('SELECT * FROM payments WHERE id = ?', [paymentId]);

    return res.status(201).json({
      message: 'Payment proof submitted successfully! Your payment is currently Under Review by the organizing team.',
      payment: created
    });
  } catch (error) {
    console.error('Payment submit error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ error: 'Failed to submit payment proof. Please try again.' });
  }
});

// Participant gets their current payment
router.get('/my-payment', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'PARTICIPANT') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const participant = await queryGet('SELECT id FROM participants WHERE user_id = ?', [req.user.id]);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found.' });
    }

    const payment = await queryGet(
      'SELECT * FROM payments WHERE participant_id = ? ORDER BY created_at DESC LIMIT 1',
      [participant.id]
    );

    return res.json({ payment });
  } catch (error) {
    console.error('my-payment error:', error);
    return res.status(500).json({ error: 'Failed to fetch payment details.' });
  }
});

// Secure protected endpoint to view payment screenshot
// Strict Access Control: Only the participant who owns it or an Administrator!
router.get('/:id/proof', requireAuth, async (req, res) => {
  try {
    const payment = await queryGet(`
      SELECT p.*, pt.user_id 
      FROM payments p 
      JOIN participants pt ON p.participant_id = pt.id 
      WHERE p.id = ?
    `, [req.params.id]);

    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found.' });
    }

    const isOwner = req.user.id === payment.user_id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized: Private payment proof.' });
    }

    const relativeFilename = path.basename(payment.screenshot_path);
    const fullFilePath = path.join(baseUploadDir, 'payment_proofs', relativeFilename);

    if (!fs.existsSync(fullFilePath)) {
      return res.status(404).json({ error: 'Screenshot file not found on disk.' });
    }

    return res.sendFile(fullFilePath);
  } catch (error) {
    console.error('Proof viewing error:', error);
    return res.status(500).json({ error: 'Failed to load screenshot.' });
  }
});

// ADMIN: Get all payments with status filtering & search
router.get('/admin/list', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = `
      SELECT 
        p.*, 
        pt.registration_id, 
        pt.full_name as participant_name, 
        pt.mobile as participant_mobile,
        pt.college_name,
        pt.college_type,
        pt.course,
        pt.academic_year,
        u.email as participant_email,
        t.ticket_number,
        t.status as ticket_status
      FROM payments p
      JOIN participants pt ON p.participant_id = pt.id
      JOIN users u ON pt.user_id = u.id
      LEFT JOIN tickets t ON t.payment_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'ALL') {
      sql += ' AND p.status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND (p.transaction_ref LIKE ? OR pt.full_name LIKE ? OR pt.registration_id LIKE ? OR u.email LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    sql += ' ORDER BY p.created_at DESC';

    const payments = await queryAll(sql, params);
    return res.json({ payments });
  } catch (error) {
    console.error('Admin payments list error:', error);
    return res.status(500).json({ error: 'Failed to fetch payments.' });
  }
});

// ADMIN: Approve payment & Atomically issue E-Ticket
router.post('/admin/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const paymentId = req.params.id;
    const payment = await queryGet(`
      SELECT p.*, pt.full_name, pt.registration_id, pt.college_name, pt.user_id, u.email
      FROM payments p
      JOIN participants pt ON p.participant_id = pt.id
      JOIN users u ON pt.user_id = u.id
      WHERE p.id = ?
    `, [paymentId]);

    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found.' });
    }

    if (payment.status === 'VERIFIED') {
      return res.status(400).json({ error: 'This payment is already verified.' });
    }

    // Update payment status to VERIFIED
    await queryRun(`
      UPDATE payments 
      SET status = 'VERIFIED', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = NULL
      WHERE id = ?
    `, [req.user.id, paymentId]);

    // Check if ticket already exists
    let ticket = await queryGet('SELECT * FROM tickets WHERE participant_id = ?', [payment.participant_id]);

    if (!ticket) {
      // Issue new ticket
      const ticketId = uuidv4();
      const ticketNumber = `TKT-PXL-${Math.floor(100000 + Math.random() * 900000)}`;
      const verificationHash = uuidv4();

      // QR Data payload
      const qrPayload = JSON.stringify({
        tkt: ticketNumber,
        hash: verificationHash,
        reg: payment.registration_id,
        name: payment.full_name,
        college: payment.college_name,
        event: 'PIXEL — FRAME THE DAY',
        dates: '29, 30 & 31 October'
      });

      await queryRun(`
        INSERT INTO tickets (
          id, ticket_number, participant_id, payment_id, verification_hash, qr_data, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
      `, [ticketId, ticketNumber, payment.participant_id, paymentId, verificationHash, qrPayload]);

      ticket = await queryGet('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    }

    // Audit log
    await queryRun(`
      INSERT INTO audit_logs (id, user_id, user_email, action, target_type, target_id, details)
      VALUES (?, ?, ?, 'PAYMENT_APPROVED', 'PAYMENT', ?, ?)
    `, [
      uuidv4(),
      req.user.id,
      req.user.email,
      paymentId,
      `Approved payment of INR ${payment.amount} (Ref: ${payment.transaction_ref}) for ${payment.full_name} (${payment.registration_id}). Ticket issued: ${ticket.ticket_number}`
    ]);

    // Send confirmation email
    const eventSettings = await queryGet('SELECT * FROM event_settings WHERE id = 1');
    sendTicketConfirmationEmail({
      participant: {
        full_name: payment.full_name,
        registration_id: payment.registration_id,
        college_name: payment.college_name,
        email: payment.email
      },
      ticket,
      payment,
      eventSettings
    }).catch(err => console.error('[PaymentApprove] Email delivery error:', err.message));

    // Live real-time SSE notification to participant
    notificationService.notifyUser(payment.user_id, 'PAYMENT_APPROVED', {
      ticketNumber: ticket.ticket_number,
      status: 'VERIFIED',
      message: `🎉 Payment verified! Your official E-Ticket (${ticket.ticket_number}) is ready.`
    });

    return res.json({
      message: `Payment verified successfully! E-Ticket ${ticket.ticket_number} has been generated.`,
      payment: { ...payment, status: 'VERIFIED' },
      ticket
    });
  } catch (error) {
    console.error('Approve payment error:', error);
    return res.status(500).json({ error: 'Failed to approve payment and issue ticket.' });
  }
});

// ADMIN: Reject payment with required reason
router.post('/admin/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    const paymentId = req.params.id;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'A specific rejection reason is required to notify the participant.' });
    }

    const payment = await queryGet(`
      SELECT p.*, pt.full_name, pt.registration_id, pt.user_id, u.email
      FROM payments p
      JOIN participants pt ON p.participant_id = pt.id
      JOIN users u ON pt.user_id = u.id
      WHERE p.id = ?
    `, [paymentId]);

    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found.' });
    }

    await queryRun(`
      UPDATE payments 
      SET status = 'REJECTED', rejection_reason = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [reason.trim(), req.user.id, paymentId]);

    // Audit log
    await queryRun(`
      INSERT INTO audit_logs (id, user_id, user_email, action, target_type, target_id, details)
      VALUES (?, ?, ?, 'PAYMENT_REJECTED', 'PAYMENT', ?, ?)
    `, [
      uuidv4(),
      req.user.id,
      req.user.email,
      paymentId,
      `Rejected payment (Ref: ${payment.transaction_ref}) for ${payment.full_name}. Reason: ${reason.trim()}`
    ]);

    // Send rejection email
    sendPaymentRejectionEmail({
      participant: { full_name: payment.full_name, email: payment.email },
      payment,
      reason: reason.trim()
    }).catch(err => console.error('[PaymentReject] Email delivery error:', err.message));

    // Live real-time SSE notification to participant
    notificationService.notifyUser(payment.user_id, 'PAYMENT_REJECTED', {
      reason: reason.trim(),
      message: `⚠️ Payment update: Proof rejected. Reason: ${reason.trim()}`
    });

    return res.json({
      message: 'Payment rejected. The participant has been notified with the reason and may resubmit.',
      payment: { ...payment, status: 'REJECTED', rejection_reason: reason.trim() }
    });
  } catch (error) {
    console.error('Reject payment error:', error);
    return res.status(500).json({ error: 'Failed to reject payment.' });
  }
});

export default router;
