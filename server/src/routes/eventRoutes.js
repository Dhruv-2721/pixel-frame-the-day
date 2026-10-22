import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { queryGet, queryRun, queryAll } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Public: Get current event settings & announcements
router.get('/settings', async (req, res) => {
  try {
    const settings = await queryGet('SELECT * FROM event_settings WHERE id = 1');
    const announcements = await queryAll('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 10');

    let studentCoordinators = [];
    let teacherCoordinators = [];
    let round1 = {};
    let round2 = {};
    let round3 = {};

    try {
      studentCoordinators = JSON.parse(settings.student_coordinators || '[]');
      teacherCoordinators = JSON.parse(settings.teacher_coordinators || '[]');
      round1 = JSON.parse(settings.round1_info || '{}');
      round2 = JSON.parse(settings.round2_info || '{}');
      round3 = JSON.parse(settings.round3_info || '{}');
    } catch (e) {
      console.error('Error parsing JSON settings:', e);
    }

    return res.json({
      event: {
        name: settings.event_name,
        tagline: settings.tagline,
        description: settings.description,
        organizers: settings.organizers,
        venue: settings.venue,
        dates: settings.event_dates,
        fee: settings.participation_fee,
        payment_qr_path: settings.payment_qr_path,
        registration_open: Boolean(settings.registration_open),
        show_coordinators: Boolean(settings.show_coordinators),
        student_coordinators: settings.show_coordinators ? studentCoordinators : [],
        teacher_coordinators: settings.show_coordinators ? teacherCoordinators : [],
        rounds: {
          round1,
          round2,
          round3
        }
      },
      announcements
    });
  } catch (error) {
    console.error('Get event settings error:', error);
    return res.status(500).json({ error: 'Failed to fetch event settings.' });
  }
});

// Admin: Update event settings
router.put('/admin/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      event_name,
      tagline,
      description,
      organizers,
      venue,
      event_dates,
      participation_fee,
      registration_open,
      show_coordinators,
      student_coordinators,
      teacher_coordinators,
      round1_info,
      round2_info,
      round3_info
    } = req.body;

    await queryRun(`
      UPDATE event_settings
      SET 
        event_name = COALESCE(?, event_name),
        tagline = COALESCE(?, tagline),
        description = COALESCE(?, description),
        organizers = COALESCE(?, organizers),
        venue = COALESCE(?, venue),
        event_dates = COALESCE(?, event_dates),
        participation_fee = COALESCE(?, participation_fee),
        registration_open = COALESCE(?, registration_open),
        show_coordinators = COALESCE(?, show_coordinators),
        student_coordinators = COALESCE(?, student_coordinators),
        teacher_coordinators = COALESCE(?, teacher_coordinators),
        round1_info = COALESCE(?, round1_info),
        round2_info = COALESCE(?, round2_info),
        round3_info = COALESCE(?, round3_info),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [
      event_name,
      tagline,
      description,
      organizers,
      venue,
      event_dates,
      participation_fee !== undefined ? parseFloat(participation_fee) : null,
      registration_open !== undefined ? (registration_open ? 1 : 0) : null,
      show_coordinators !== undefined ? (show_coordinators ? 1 : 0) : null,
      student_coordinators ? JSON.stringify(student_coordinators) : null,
      teacher_coordinators ? JSON.stringify(teacher_coordinators) : null,
      round1_info ? JSON.stringify(round1_info) : null,
      round2_info ? JSON.stringify(round2_info) : null,
      round3_info ? JSON.stringify(round3_info) : null
    ]);

    await queryRun(`
      INSERT INTO audit_logs (id, user_id, user_email, action, target_type, target_id, details)
      VALUES (?, ?, ?, 'EVENT_SETTINGS_UPDATED', 'EVENT_SETTINGS', '1', 'Admin updated event settings, fees, or round rules.')
    `, [uuidv4(), req.user.id, req.user.email]);

    return res.json({ message: 'Event settings updated successfully.' });
  } catch (error) {
    console.error('Update event settings error:', error);
    return res.status(500).json({ error: 'Failed to update event settings.' });
  }
});

// Admin: Upload / Replace official payment QR code
router.post('/admin/upload-qr', requireAuth, requireAdmin, upload.single('qr_code'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an image file for the payment QR code.' });
    }

    const qrPath = `/uploads/qrcodes/${req.file.filename}`;
    await queryRun('UPDATE event_settings SET payment_qr_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [qrPath]);

    await queryRun(`
      INSERT INTO audit_logs (id, user_id, user_email, action, target_type, target_id, details)
      VALUES (?, ?, ?, 'PAYMENT_QR_UPDATED', 'EVENT_SETTINGS', '1', ?)
    `, [uuidv4(), req.user.id, req.user.email, `Official payment QR code replaced with: ${req.file.filename}`]);

    return res.json({
      message: 'Official event payment QR code uploaded and activated successfully.',
      payment_qr_path: qrPath
    });
  } catch (error) {
    console.error('Upload QR error:', error);
    return res.status(500).json({ error: 'Failed to upload QR code.' });
  }
});

// Admin: Post announcement
router.post('/admin/announcements', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }

    const id = uuidv4();
    await queryRun(`
      INSERT INTO announcements (id, title, content, category, created_by)
      VALUES (?, ?, ?, ?, ?)
    `, [id, title.trim(), content.trim(), category || 'GENERAL', req.user.id]);

    return res.status(201).json({ message: 'Announcement published successfully.', id });
  } catch (error) {
    console.error('Announcement create error:', error);
    return res.status(500).json({ error: 'Failed to publish announcement.' });
  }
});

// Admin: Delete announcement
router.delete('/admin/announcements/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await queryRun('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Announcement deleted.' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    return res.status(500).json({ error: 'Failed to delete announcement.' });
  }
});

export default router;
