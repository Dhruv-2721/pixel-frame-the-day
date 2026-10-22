import express from 'express';
import jwt from 'jsonwebtoken';
import { queryGet } from '../db.js';
import { notificationService } from '../services/notificationService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pixel_super_secret_jwt_key_2026_lnct';

/**
 * Server-Sent Events (SSE) Stream Endpoint
 * Accepts token via Authorization header or ?token= query parameter (for browser EventSource)
 */
router.get('/stream', async (req, res) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication token required for live notifications.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    const user = await queryGet('SELECT id, email, role FROM users WHERE id = ?', [decoded.id]);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    // Register client with notification service
    const clientId = notificationService.addClient(user.id, user.role, res);

    // Clean up when client disconnects
    req.on('close', () => {
      notificationService.removeClient(clientId);
    });
  } catch (error) {
    console.error('SSE Stream error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to establish event stream.' });
    }
  }
});

/**
 * Active stats
 */
router.get('/stats', (req, res) => {
  res.json({
    notifications: notificationService.getActiveStats()
  });
});

export default router;
