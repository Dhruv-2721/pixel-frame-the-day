import express from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { queryGet, queryRun, queryAll } from '../db.js';
import { requireAuth, requireAdmin, requireStaffOrAdmin } from '../middleware/auth.js';
import { uploadPhoto } from '../middleware/upload.js';
import { notificationService } from '../services/notificationService.js';
import { sendJudgingResultEmail } from '../services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseUploadDir = path.resolve(__dirname, '../../uploads');

const router = express.Router();

/**
 * PARTICIPANT: Submit competition photograph
 */
router.post('/upload', requireAuth, uploadPhoto.single('photo'), async (req, res) => {
  try {
    if (req.user.role !== 'PARTICIPANT') {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Only registered participants can submit competition photographs.' });
    }

    const participant = await queryGet('SELECT * FROM participants WHERE user_id = ?', [req.user.id]);
    if (!participant) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Participant profile not found.' });
    }

    // Require an active ticket
    const ticket = await queryGet("SELECT * FROM tickets WHERE participant_id = ? AND status != 'CANCELLED'", [participant.id]);
    if (!ticket) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({
        error: 'Active event ticket required to submit competition photographs. Please complete payment verification first.'
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Please choose a photograph to upload (JPG, PNG, WebP up to 15MB).' });
    }

    const { title, caption, camera_details, round_number } = req.body;
    if (!title || !title.trim()) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'A photo title is required.' });
    }

    const roundNum = parseInt(round_number || '1', 10);
    if (![1, 2, 3].includes(roundNum)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Invalid competition round specified (Must be 1, 2, or 3).' });
    }

    // Round eligibility check
    if (roundNum === 2 && !['ROUND_2', 'ROUND_3', 'WINNER_1ST', 'WINNER_2ND', 'WINNER_3RD'].includes(participant.round_status)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'You are not currently shortlisted for Round 2.' });
    }

    if (roundNum === 3 && !['ROUND_3', 'WINNER_1ST', 'WINNER_2ND', 'WINNER_3RD'].includes(participant.round_status)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'You are not currently shortlisted for Round 3.' });
    }

    // Limit check per round
    const existingCount = (await queryGet(
      'SELECT COUNT(*) as count FROM submissions WHERE participant_id = ? AND round_number = ?',
      [participant.id, roundNum]
    )).count;

    const maxAllowed = roundNum === 3 ? 4 : 1; // Round 3 allows up to 4 display photos; Rounds 1 & 2 allow 1 photo
    if (existingCount >= maxAllowed) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: `Submission limit reached! You have already submitted ${existingCount} of ${maxAllowed} allowed photo(s) for Round ${roundNum}.`
      });
    }

    const photo_path = `/uploads/submissions/${req.file.filename}`;
    const submissionId = uuidv4();

    await queryRun(`
      INSERT INTO submissions (
        id, participant_id, round_number, title, caption,
        photo_path, camera_details, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')
    `, [
      submissionId,
      participant.id,
      roundNum,
      title.trim(),
      caption ? caption.trim() : null,
      photo_path,
      camera_details ? camera_details.trim() : null
    ]);

    await queryRun(`
      INSERT INTO audit_logs (id, user_id, user_email, action, target_type, target_id, details)
      VALUES (?, ?, ?, 'PHOTO_SUBMITTED', 'SUBMISSION', ?, ?)
    `, [
      uuidv4(),
      req.user.id,
      req.user.email,
      submissionId,
      `Submitted photo "${title.trim()}" for Round ${roundNum}`
    ]);

    // Live alert to administrators
    notificationService.notifyAdmins('NEW_SUBMISSION', {
      submissionId,
      roundNumber: roundNum,
      participantName: participant.full_name,
      registrationId: participant.registration_id,
      photoTitle: title.trim(),
      message: `📸 New Round ${roundNum} submission from ${participant.full_name}: "${title.trim()}"`
    });

    const created = await queryGet('SELECT * FROM submissions WHERE id = ?', [submissionId]);

    return res.status(201).json({
      message: `Photo "${title.trim()}" submitted successfully for Round ${roundNum}!`,
      submission: created
    });
  } catch (error) {
    console.error('Submission upload error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ error: 'Failed to upload photo submission.' });
  }
});

/**
 * PARTICIPANT: Get own submissions
 */
router.get('/my', requireAuth, async (req, res) => {
  try {
    const participant = await queryGet('SELECT id FROM participants WHERE user_id = ?', [req.user.id]);
    if (!participant) {
      return res.json({ submissions: [] });
    }

    const submissions = await queryAll(
      'SELECT * FROM submissions WHERE participant_id = ? ORDER BY round_number ASC, created_at DESC',
      [participant.id]
    );

    return res.json({ submissions });
  } catch (error) {
    console.error('My submissions error:', error);
    return res.status(500).json({ error: 'Failed to fetch your submissions.' });
  }
});

/**
 * PUBLIC / PARTICIPANTS: Live Leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { round } = req.query;
    let sql = `
      SELECT 
        s.id as submission_id,
        s.round_number,
        s.title as photo_title,
        s.photo_path,
        s.score_creativity,
        s.score_theme,
        s.score_storytelling,
        s.score_technical,
        s.total_score,
        s.judge_feedback,
        pt.id as participant_id,
        pt.registration_id,
        pt.full_name,
        pt.college_name,
        pt.college_type,
        pt.round_status
      FROM submissions s
      JOIN participants pt ON s.participant_id = pt.id
      WHERE s.status = 'SCORED'
    `;
    const params = [];

    if (round && round !== 'ALL') {
      sql += ' AND s.round_number = ?';
      params.push(parseInt(round, 10));
    }

    sql += ' ORDER BY s.total_score DESC, s.created_at ASC LIMIT 50';

    const leaderboard = await queryAll(sql, params);
    return res.json({ leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return res.status(500).json({ error: 'Failed to load leaderboard.' });
  }
});

/**
 * ADMIN: List all submissions with filters
 */
router.get('/admin/list', requireAuth, requireStaffOrAdmin, async (req, res) => {
  try {
    const { round, status, search } = req.query;
    let sql = `
      SELECT 
        s.*,
        pt.registration_id,
        pt.full_name as participant_name,
        pt.mobile,
        pt.college_name,
        pt.college_type,
        pt.academic_year,
        pt.round_status as participant_round_status,
        u.email as participant_email,
        j.email as judge_email
      FROM submissions s
      JOIN participants pt ON s.participant_id = pt.id
      JOIN users u ON pt.user_id = u.id
      LEFT JOIN users j ON s.judged_by = j.id
      WHERE 1=1
    `;
    const params = [];

    if (round && round !== 'ALL') {
      sql += ' AND s.round_number = ?';
      params.push(parseInt(round, 10));
    }

    if (status && status !== 'ALL') {
      sql += ' AND s.status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND (s.title LIKE ? OR pt.full_name LIKE ? OR pt.registration_id LIKE ? OR u.email LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    sql += ' ORDER BY s.created_at DESC';

    const submissions = await queryAll(sql, params);
    return res.json({ submissions });
  } catch (error) {
    console.error('Admin submissions list error:', error);
    return res.status(500).json({ error: 'Failed to fetch submissions.' });
  }
});

/**
 * ADMIN / JUDGE: Score submission using 4-part official rubric
 */
router.post('/admin/:id/score', requireAuth, requireStaffOrAdmin, async (req, res) => {
  try {
    const submissionId = req.params.id;
    const {
      score_creativity,
      score_theme,
      score_storytelling,
      score_technical,
      feedback,
      promote_to_round
    } = req.body;

    const c = Math.max(0, Math.min(25, parseFloat(score_creativity || 0)));
    const t = Math.max(0, Math.min(25, parseFloat(score_theme || 0)));
    const s = Math.max(0, Math.min(25, parseFloat(score_storytelling || 0)));
    const tech = Math.max(0, Math.min(25, parseFloat(score_technical || 0)));
    const total = parseFloat((c + t + s + tech).toFixed(2));

    const submission = await queryGet(`
      SELECT s.*, pt.full_name, pt.id as participant_id, pt.user_id, u.email
      FROM submissions s
      JOIN participants pt ON s.participant_id = pt.id
      JOIN users u ON pt.user_id = u.id
      WHERE s.id = ?
    `, [submissionId]);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    await queryRun(`
      UPDATE submissions
      SET 
        score_creativity = ?,
        score_theme = ?,
        score_storytelling = ?,
        score_technical = ?,
        total_score = ?,
        judge_feedback = ?,
        judged_by = ?,
        judged_at = CURRENT_TIMESTAMP,
        status = 'SCORED',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [c, t, s, tech, total, feedback ? feedback.trim() : null, req.user.id, submissionId]);

    // Optional immediate round promotion
    if (promote_to_round && ['ROUND_2', 'ROUND_3', 'WINNER_1ST', 'WINNER_2ND', 'WINNER_3RD'].includes(promote_to_round)) {
      await queryRun('UPDATE participants SET round_status = ? WHERE id = ?', [promote_to_round, submission.participant_id]);
    }

    await queryRun(`
      INSERT INTO audit_logs (id, user_id, user_email, action, target_type, target_id, details)
      VALUES (?, ?, ?, 'SUBMISSION_SCORED', 'SUBMISSION', ?, ?)
    `, [
      uuidv4(),
      req.user.id,
      req.user.email,
      submissionId,
      `Awarded score of ${total}/100 to "${submission.title}" (${submission.full_name})`
    ]);

    const updated = await queryGet('SELECT * FROM submissions WHERE id = ?', [submissionId]);

    // Send real-time SSE notification to participant
    notificationService.notifyUser(submission.user_id, 'SUBMISSION_SCORED', {
      submissionId,
      title: submission.title,
      roundNumber: submission.round_number,
      totalScore: total,
      feedback: feedback ? feedback.trim() : null,
      message: `🏆 Your Round ${submission.round_number} photo "${submission.title}" scored ${total}/100!`
    });

    // Send judging result email
    sendJudgingResultEmail({
      participant: { full_name: submission.full_name, email: submission.email },
      submission: updated,
      roundTitle: `Round ${submission.round_number}`
    }).catch(err => console.error('Judging email error:', err.message));

    return res.json({
      message: `Submission evaluated! Score: ${total}/100 awarded.`,
      submission: updated
    });
  } catch (error) {
    console.error('Score submission error:', error);
    return res.status(500).json({ error: 'Failed to evaluate submission.' });
  }
});

export default router;
