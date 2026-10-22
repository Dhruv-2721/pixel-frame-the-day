import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';

import { initDb } from './db.js';
import authRoutes from './routes/authRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseUploadDir = path.resolve(__dirname, '../uploads');
const clientDistDir = path.resolve(__dirname, '../../client/dist');

// Ensure required upload folders exist
['qrcodes', 'avatars', 'payment_proofs', 'submissions'].forEach(folder => {
  const p = path.join(baseUploadDir, folder);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const app = express();
const PORT = process.env.PORT || 5000;

// Security Headers (Disable CSP so embedded data URLs & Google Fonts load smoothly)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting on sensitive auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body Parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static paths for public uploads (Official QR code, avatars, and competition submissions)
// Notice: payment_proofs is deliberately NOT exposed statically for privacy & financial security!
app.use('/uploads/qrcodes', express.static(path.join(baseUploadDir, 'qrcodes')));
app.use('/uploads/avatars', express.static(path.join(baseUploadDir, 'avatars')));
app.use('/uploads/submissions', express.static(path.join(baseUploadDir, 'submissions')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/event', eventRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/staff', ticketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/payments', paymentRoutes);
app.use('/api/admin/settings', eventRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'PIXEL Event Platform API',
    timestamp: new Date().toISOString()
  });
});

// Serve built frontend if available
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }
  return res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Bootstrap Database and Start Server
const startServer = async () => {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`PIXEL — FRAME THE DAY Backend API Server Started`);
      console.log(`Listening on http://localhost:${PORT}`);
      console.log(`Admin seeded: admin@pixel.lnct.ac.in / Admin@Pixel2026`);
      console.log(`Staff seeded: staff@pixel.lnct.ac.in / Staff@Pixel2026`);
      console.log(`Features: Photo Submissions, Nodemailer, SSE Notifications`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Fatal initialization error:', error);
    process.exit(1);
  }
};

startServer();
