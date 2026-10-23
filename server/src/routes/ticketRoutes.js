import express from 'express';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { queryGet, queryRun } from '../db.js';
import { requireAuth, requireAdmin, requireStaffOrAdmin } from '../middleware/auth.js';
import { verifyLimiter } from '../middleware/security.js';

const router = express.Router();

// Participant views their issued ticket
router.get('/my-ticket', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'PARTICIPANT') {
      return res.status(403).json({ error: 'Only participants have event tickets.' });
    }

    const participant = await queryGet('SELECT * FROM participants WHERE user_id = ?', [req.user.id]);
    if (!participant) {
      return res.status(404).json({ error: 'Participant record not found.' });
    }

    const ticket = await queryGet('SELECT * FROM tickets WHERE participant_id = ?', [participant.id]);
    if (!ticket) {
      return res.status(404).json({
        error: 'No active ticket found. Your payment must be verified by an administrator before a ticket is issued.'
      });
    }

    const eventSettings = await queryGet('SELECT * FROM event_settings WHERE id = 1');

    // Generate high-resolution base64 QR code image
    const qrCodeDataUrl = await QRCode.toDataURL(ticket.qr_data, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return res.json({
      ticket: {
        ...ticket,
        qr_image_url: qrCodeDataUrl
      },
      participant,
      event: {
        name: eventSettings.event_name,
        tagline: eventSettings.tagline,
        dates: eventSettings.event_dates,
        venue: eventSettings.venue,
        organizers: eventSettings.organizers
      }
    });
  } catch (error) {
    console.error('my-ticket error:', error);
    return res.status(500).json({ error: 'Failed to retrieve ticket.' });
  }
});

// Verify ticket authenticity (Public or Staff) with anti-scraping rate limiter
router.get('/verify/:identifier', verifyLimiter, async (req, res) => {
  try {
    const { identifier } = req.params;
    const cleanId = identifier.trim();

    // Look up by verification_hash or ticket_number
    const ticket = await queryGet(`
      SELECT 
        t.*,
        pt.registration_id,
        pt.full_name as participant_name,
        pt.college_name,
        pt.college_type,
        pt.academic_year,
        pt.course,
        pt.round_status,
        es.event_name,
        es.event_dates,
        es.venue,
        u.email as staff_email
      FROM tickets t
      JOIN participants pt ON t.participant_id = pt.id
      JOIN event_settings es ON es.id = 1
      LEFT JOIN users u ON t.checked_in_by = u.id
      WHERE t.verification_hash = ? OR t.ticket_number = ?
    `, [cleanId, cleanId]);

    if (!ticket) {
      return res.status(404).json({
        valid: false,
        message: 'Invalid Ticket! No ticket found matching this identifier or QR code.'
      });
    }

    if (ticket.status === 'CANCELLED') {
      return res.json({
        valid: false,
        status: 'CANCELLED',
        ticketNumber: ticket.ticket_number,
        participantName: ticket.participant_name,
        message: 'This ticket has been cancelled by event administration. Entry denied.'
      });
    }

    if (ticket.status === 'CHECKED_IN') {
      return res.json({
        valid: true,
        status: 'CHECKED_IN',
        ticketNumber: ticket.ticket_number,
        participantName: ticket.participant_name,
        registrationId: ticket.registration_id,
        collegeName: ticket.college_name,
        checkedInAt: ticket.checked_in_at,
        checkedInBy: ticket.staff_email || 'Event Staff',
        message: `Already Checked-In on ${new Date(ticket.checked_in_at).toLocaleString('en-IN')}. Single-use entry alert!`
      });
    }

    return res.json({
      valid: true,
      status: 'ACTIVE',
      ticketNumber: ticket.ticket_number,
      participantName: ticket.participant_name,
      registrationId: ticket.registration_id,
      collegeName: ticket.college_name,
      collegeType: ticket.college_type,
      academicYear: ticket.academic_year,
      course: ticket.course,
      roundStatus: ticket.round_status,
      eventDates: ticket.event_dates,
      venue: ticket.venue,
      issuedAt: ticket.issued_at,
      message: 'Authentic Verified Ticket. Ready for check-in.'
    });
  } catch (error) {
    console.error('Ticket verify error:', error);
    return res.status(500).json({ error: 'Server error verifying ticket.' });
  }
});

// Event Entry Check-In (Authorized Staff or Admin only)
router.post('/check-in', requireAuth, requireStaffOrAdmin, async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Ticket identifier or QR hash is required.' });
    }

    const cleanId = identifier.trim();

    const ticket = await queryGet(`
      SELECT t.*, pt.full_name, pt.registration_id, pt.college_name 
      FROM tickets t
      JOIN participants pt ON t.participant_id = pt.id
      WHERE t.verification_hash = ? OR t.ticket_number = ?
    `, [cleanId, cleanId]);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found. Invalid entry code.' });
    }

    if (ticket.status === 'CANCELLED') {
      return res.status(400).json({
        error: `Entry Denied! Ticket ${ticket.ticket_number} has been cancelled.`
      });
    }

    if (ticket.status === 'CHECKED_IN') {
      return res.status(400).json({
        error: `DUPLICATE ENTRY DETECTED! Ticket ${ticket.ticket_number} for ${ticket.full_name} was already checked in on ${new Date(ticket.checked_in_at).toLocaleString('en-IN')}.`
      });
    }

    // Mark as checked in
    await queryRun(`
      UPDATE tickets 
      SET status = 'CHECKED_IN', checked_in_at = CURRENT_TIMESTAMP, checked_in_by = ?
      WHERE id = ?
    `, [req.user.id, ticket.id]);

    // Audit log
    await queryRun(`
      INSERT INTO audit_logs (id, user_id, user_email, action, target_type, target_id, details)
      VALUES (?, ?, ?, 'TICKET_CHECKED_IN', 'TICKET', ?, ?)
    `, [
      uuidv4(),
      req.user.id,
      req.user.email,
      ticket.id,
      `Checked in participant ${ticket.full_name} (${ticket.registration_id}) with ticket ${ticket.ticket_number}`
    ]);

    return res.json({
      success: true,
      message: `CHECK-IN CONFIRMED! Welcome ${ticket.full_name} to PIXEL — FRAME THE DAY.`,
      ticket: {
        ticketNumber: ticket.ticket_number,
        participantName: ticket.full_name,
        registrationId: ticket.registration_id,
        college: ticket.college_name,
        status: 'CHECKED_IN',
        checkedInAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Check-in error:', error);
    return res.status(500).json({ error: 'Server error recording check-in.' });
  }
});

// Admin Ticket Cancellation
router.post('/admin/:id/cancel', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const ticketId = req.params.id;

    const ticket = await queryGet('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    await queryRun("UPDATE tickets SET status = 'CANCELLED' WHERE id = ?", [ticketId]);

    await queryRun(`
      INSERT INTO audit_logs (id, user_id, user_email, action, target_type, target_id, details)
      VALUES (?, ?, ?, 'TICKET_CANCELLED', 'TICKET', ?, ?)
    `, [
      uuidv4(),
      req.user.id,
      req.user.email,
      ticketId,
      `Cancelled ticket ${ticket.ticket_number}. Reason: ${reason || 'Administrative action'}`
    ]);

    return res.json({ message: `Ticket ${ticket.ticket_number} cancelled successfully.` });
  } catch (error) {
    console.error('Cancel ticket error:', error);
    return res.status(500).json({ error: 'Failed to cancel ticket.' });
  }
});

export default router;
