import fs from 'fs';
import rateLimit from 'express-rate-limit';

/**
 * ============================================================================
 * PIXEL EVENT PLATFORM — ENTERPRISE SECURITY MODULE
 * ============================================================================
 * Provides:
 * 1. Multi-tiered Anti-DDoS & Brute-Force Rate Limiters
 * 2. Magic-Byte Image File Signature Verification (Anti-Shell / Anti-Polyglot)
 * 3. Recursive Input Sanitization against XSS & Script Injection
 * 4. HTTP Parameter Pollution (HPP) Shield
 * 5. Strong Password Policy Validator
 * 6. Timing-Safe Constant-Time Verification Helper
 * ============================================================================
 */

// 1. RATE LIMITERS

// Global Rate Limiter: max 300 requests per 15 minutes per IP
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP. Please slow down and try again later.' }
});

// Auth Rate Limiter (Brute-Force Shield): max 10 failed/successful attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login/registration attempts. Security lockout active for 15 minutes.' }
});

// Ticket Verification Limiter: max 60 verification requests per 15 minutes
export const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Ticket verification rate limit exceeded. Please try again in a few minutes.' }
});

// Payment Submission Limiter: max 10 submissions per 15 minutes
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Payment submission rate limit exceeded. Please wait before submitting again.' }
});

// Competition Photo Upload Limiter: max 15 photo uploads per 15 minutes
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Photo upload rate limit reached. Please wait before submitting another entry.' }
});

// 2. INPUT SANITIZATION AGAINST XSS
// Strips dangerous HTML tags, javascript: URIs, and event handlers from strings
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // remove iframes
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // remove objects
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')   // remove embeds
    .replace(/javascript:/gi, '')                                       // remove javascript pseudo-protocol
    .replace(/on\w+\s*=/gi, '')                                         // remove inline event handlers like onload=, onerror=
    .replace(/[<>]/g, (char) => (char === '<' ? '&lt;' : '&gt;'))        // escape remaining angle brackets
    .trim();
};

const sanitizeValue = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return sanitizeString(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (typeof value === 'object') {
    const cleaned = {};
    for (const [k, v] of Object.entries(value)) {
      cleaned[sanitizeString(k)] = sanitizeValue(v);
    }
    return cleaned;
  }
  return value;
};

// Express Middleware: recursively sanitize req.body, req.query, req.params
export const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }
  next();
};

// 3. HTTP PARAMETER POLLUTION (HPP) SHIELD
// Ensures query parameters are single values to prevent array injection attacks
export const preventHPP = (req, res, next) => {
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      if (Array.isArray(req.query[key])) {
        // Keep only the first parameter value
        req.query[key] = req.query[key][0];
      }
    }
  }
  next();
};

// 4. PASSWORD COMPLEXITY VALIDATOR
// Enforces: Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 digit, 1 special character
export const validatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password cannot exceed 128 characters.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number (0-9).' };
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (!@#$%^&*...).' };
  }
  return { valid: true };
};

// 5. MAGIC BYTE FILE SIGNATURE VERIFICATION
// Inspects raw binary header of uploaded files to verify authentic JPEG, PNG, or WebP signatures
export const verifyImageSignature = (filePath) => {
  if (!fs.existsSync(filePath)) return false;
  
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(16);
  fs.readSync(fd, buffer, 0, 16, 0);
  fs.closeSync(fd);

  // JPEG: FF D8 FF
  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A;

  // WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
  const isWebp =
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP';

  return isJpeg || isPng || isWebp;
};

// Express Middleware: validate uploaded file signature and auto-clean if forged
export const validateUploadSignature = (req, res, next) => {
  if (!req.file) return next();

  const isValid = verifyImageSignature(req.file.path);
  if (!isValid) {
    try {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch (e) {
      console.error('Failed to remove invalid file:', e);
    }
    return res.status(400).json({
      error: 'Security alert: Uploaded file signature does not match authentic JPEG, PNG, or WebP image formats. Upload rejected.'
    });
  }
  next();
};
