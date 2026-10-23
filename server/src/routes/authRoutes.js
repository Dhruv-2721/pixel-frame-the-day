import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { queryGet, queryRun } from '../db.js';
import { generateToken, requireAuth } from '../middleware/auth.js';
import { validatePasswordStrength } from '../middleware/security.js';

const router = express.Router();

// Constant-time dummy hash for timing attack mitigation on failed email lookups
const DUMMY_HASH = '$2a$12$e8Yk1J5Vl0C2WpQ2M0G1Oe7X2c6R8s4V0k3E9Y1U5W7Z2X4P6Q8S0';

// Helper to validate Indian mobile number: 10 digits starting with 6, 7, 8, or 9
const isValidMobile = (phone) => {
  return /^[6-9]\d{9}$/.test(phone.trim());
};

// Helper to validate email format
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

// Registration Endpoint
router.post('/register', async (req, res) => {
  try {
    const {
      full_name,
      email,
      mobile,
      college_name,
      college_type,
      course,
      academic_year,
      student_id,
      city,
      password,
      accept_rules
    } = req.body;

    // Required fields check
    if (!full_name || !email || !mobile || !college_name || !college_type || !course || !academic_year || !student_id || !city || !password) {
      return res.status(400).json({ error: 'All fields are mandatory for registration.' });
    }

    if (!accept_rules) {
      return res.status(400).json({ error: 'You must accept the event rules and guidelines to register.' });
    }

    // Email format validation
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    // Mobile number validation
    const cleanMobile = mobile.trim();
    if (!isValidMobile(cleanMobile)) {
      return res.status(400).json({ error: 'Please provide a valid 10-digit Indian mobile number.' });
    }

    // Eligibility check based on poster rules:
    // LNCT Group: 2nd to 4th Year Only | Other Colleges: All Years Students Welcome
    const cleanCollegeType = college_type.trim().toUpperCase();
    if (cleanCollegeType === 'LNCT') {
      const allowedYears = ['2nd Year', '3rd Year', '4th Year', '2', '3', '4'];
      if (!allowedYears.some(yr => academic_year.includes(yr))) {
        return res.status(400).json({
          error: 'Per official event guidelines, LNCT participants must be currently in their 2nd, 3rd, or 4th academic year. 1st year LNCT students are not eligible.'
        });
      }
    }

    // Check if email already registered
    const existingUser = await queryGet('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email address already exists. Please log in.' });
    }

    // Check if student ID already registered for this college
    const existingStudent = await queryGet(
      'SELECT id FROM participants WHERE student_id = ? AND college_name = ?',
      [student_id.trim(), college_name.trim()]
    );
    if (existingStudent) {
      return res.status(409).json({ error: 'This Student ID / Enrollment Number is already registered.' });
    }

    // Validate password complexity
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ error: passwordCheck.message });
    }

    // Hash password with 12 rounds of bcrypt
    const password_hash = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const participantId = uuidv4();

    // Generate unique Registration ID e.g. PXL-2026-8421
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const registration_id = `PXL-2026-${randomSuffix}`;

    // Insert user
    await queryRun(`
      INSERT INTO users (id, email, password_hash, role)
      VALUES (?, ?, ?, 'PARTICIPANT')
    `, [userId, cleanEmail, password_hash]);

    // Insert participant
    await queryRun(`
      INSERT INTO participants (
        id, user_id, registration_id, full_name, mobile, college_name,
        college_type, course, academic_year, student_id, city, round_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ROUND_1')
    `, [
      participantId,
      userId,
      registration_id,
      full_name.trim(),
      cleanMobile,
      college_name.trim(),
      cleanCollegeType,
      course.trim(),
      academic_year.trim(),
      student_id.trim(),
      city.trim()
    ]);

    // Log audit
    await queryRun(`
      INSERT INTO audit_logs (id, user_id, user_email, action, target_type, target_id, details)
      VALUES (?, ?, ?, 'PARTICIPANT_REGISTERED', 'PARTICIPANT', ?, ?)
    `, [uuidv4(), userId, cleanEmail, participantId, `New registration: ${registration_id} (${full_name})`]);

    const token = generateToken({ id: userId, email: cleanEmail, role: 'PARTICIPANT' });

    const participantData = await queryGet('SELECT * FROM participants WHERE id = ?', [participantId]);

    return res.status(201).json({
      message: 'Registration successful! Welcome to PIXEL — FRAME THE DAY.',
      token,
      user: {
        id: userId,
        email: cleanEmail,
        role: 'PARTICIPANT'
      },
      participant: participantData
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred during registration. Please try again.' });
  }
});

// Login Endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await queryGet('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    
    // Constant-time execution prevents account enumeration via timing attacks
    const hashToCompare = user ? user.password_hash : DUMMY_HASH;
    const isMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    let participant = null;
    if (user.role === 'PARTICIPANT') {
      participant = await queryGet('SELECT * FROM participants WHERE user_id = ?', [user.id]);
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      participant
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

// Current User Profile Endpoint
router.get('/me', requireAuth, async (req, res) => {
  try {
    let participant = null;
    let payment = null;
    let ticket = null;

    if (req.user.role === 'PARTICIPANT') {
      participant = await queryGet('SELECT * FROM participants WHERE user_id = ?', [req.user.id]);
      if (participant) {
        payment = await queryGet(`
          SELECT id, transaction_ref, amount, payer_name, payment_date, status, rejection_reason, created_at, reviewed_at
          FROM payments 
          WHERE participant_id = ? 
          ORDER BY created_at DESC LIMIT 1
        `, [participant.id]);

        ticket = await queryGet('SELECT * FROM tickets WHERE participant_id = ?', [participant.id]);
      }
    }

    return res.json({
      user: req.user,
      participant,
      payment,
      ticket
    });
  } catch (error) {
    console.error('Auth/me error:', error);
    return res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

export default router;
