import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseUploadDir = path.resolve(__dirname, '../../uploads');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = path.join(baseUploadDir, 'payment_proofs');
    if (file.fieldname === 'qr_code') {
      dest = path.join(baseUploadDir, 'qrcodes');
    } else if (file.fieldname === 'avatar') {
      dest = path.join(baseUploadDir, 'avatars');
    } else if (file.fieldname === 'photo' || file.fieldname === 'submission') {
      dest = path.join(baseUploadDir, 'submissions');
    }
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    // Sanitize extension: get last extension, convert to lower case, ensure in whitelist
    let ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      ext = '.jpg'; // safe fallback
    }
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIME_TYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only authentic JPG, PNG, and WebP images are allowed.'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max for payment proofs and avatars
  }
});

export const uploadPhoto = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB max for competition photo submissions
  }
});
