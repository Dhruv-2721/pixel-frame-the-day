import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import { fileURLToPath } from 'url';

import { initDb } from './db.js';
import authRoutes from './routes/authRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import driveRoutes from './routes/driveRoutes.js';
import {
  globalLimiter,
  authLimiter,
  paymentLimiter,
  uploadLimiter,
  sanitizeInput,
  preventHPP
} from './middleware/security.js';

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

// 1. Remove express signature fingerprint and enable proxy trust for Render / Cloudflare
app.disable('x-powered-by');
app.set('trust proxy', 1);

// 2. Comprehensive Security Headers with Content-Security-Policy (CSP)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'https:', 'ws:', 'wss:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: []
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  })
);

// 3. Permissions Policy Header
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');
  next();
});

// 4. CORS Configuration
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// 5. Multi-tiered Anti-DDoS and Brute-Force Rate Limiters
app.use('/api', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/payment/submit', paymentLimiter);
app.use('/api/payments/submit', paymentLimiter);
app.use('/api/submissions/upload', uploadLimiter);

// 6. JSON Body Parsers with DoS-Safe Payload Limits (1 MB for standard JSON)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 7. HTTP Parameter Pollution (HPP) & Recursive XSS Sanitization
app.use(preventHPP);
app.use(sanitizeInput);

// 8. Static paths for public uploads with nosniff protection
// Notice: payment_proofs is deliberately NOT exposed statically for privacy & financial security!
const staticSecurityHeaders = (res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, max-age=86400');
};

app.use(
  '/uploads/qrcodes',
  express.static(path.join(baseUploadDir, 'qrcodes'), { setHeaders: staticSecurityHeaders })
);
app.use(
  '/uploads/avatars',
  express.static(path.join(baseUploadDir, 'avatars'), { setHeaders: staticSecurityHeaders })
);
app.use(
  '/uploads/submissions',
  express.static(path.join(baseUploadDir, 'submissions'), { setHeaders: staticSecurityHeaders })
);

// 9. API Routes
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
app.use('/api/admin/drive', driveRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'PIXEL Event Platform API',
    security: 'ENHANCED_ENTERPRISE_SHIELD',
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

// 10. Centralized Production Error Handling (Never leak internal stack traces)
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }
  const isProduction = process.env.NODE_ENV === 'production';
  return res.status(err.status || 500).json({
    error: isProduction ? 'An unexpected error occurred. Please try again later.' : (err.message || 'Internal Server Error')
  });
});

// Bootstrap Database and Start Server
const startServer = async () => {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`PIXEL — FRAME THE DAY Backend API Server Started`);
      console.log(`Security: CSP, Rate Limiting, Magic Byte Check, HPP, XSS Sanitizer`);
      console.log(`Listening on http://localhost:${PORT}`);
      const activeAdmin = process.env.ADMIN_EMAIL || 'admin@lnct.ac.in';
      console.log(`Admin Portal: ${activeAdmin}`);
      console.log(`Staff: staff@pixel.lnct.ac.in / Staff@Pixel2026`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Fatal initialization error:', error);
    process.exit(1);
  }
};

startServer();
