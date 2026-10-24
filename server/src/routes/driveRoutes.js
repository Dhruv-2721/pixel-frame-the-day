import express from 'express';
import path from 'path';
import fs from 'fs';
import { ZipArchive } from 'archiver';
import { fileURLToPath } from 'url';
import { queryGet, queryAll } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseUploadDir = path.resolve(__dirname, '../../uploads');
const submissionsDir = path.join(baseUploadDir, 'submissions');

const router = express.Router();

// Total Allocated 1 TB Drive Space in bytes (1 TB = 1,024 GB = 1,099,511,627,776 bytes)
const TOTAL_DRIVE_CAPACITY_BYTES = 1024 * 1024 * 1024 * 1024; // 1,099,511,627,776 bytes

// Helper to format bytes to human readable string
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * 1. GET /api/admin/drive/stats
 * Returns 1 TB Drive storage utilization, file count, and round breakdown
 */
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    let usedBytes = 0;
    let fileCount = 0;

    if (fs.existsSync(submissionsDir)) {
      const files = fs.readdirSync(submissionsDir);
      for (const file of files) {
        if (file === '.gitkeep') continue;
        const filePath = path.join(submissionsDir, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            usedBytes += stat.size;
            fileCount++;
          }
        } catch (e) {
          // ignore transient file read error
        }
      }
    }

    const round1Count = (await queryGet('SELECT COUNT(*) as c FROM submissions WHERE round_number = 1')).c || 0;
    const round2Count = (await queryGet('SELECT COUNT(*) as c FROM submissions WHERE round_number = 2')).c || 0;
    const round3Count = (await queryGet('SELECT COUNT(*) as c FROM submissions WHERE round_number = 3')).c || 0;
    const scoredCount = (await queryGet("SELECT COUNT(*) as c FROM submissions WHERE status = 'SCORED'")).c || 0;

    const availableBytes = Math.max(0, TOTAL_DRIVE_CAPACITY_BYTES - usedBytes);
    const usedPercentage = ((usedBytes / TOTAL_DRIVE_CAPACITY_BYTES) * 100).toFixed(4);

    return res.json({
      drive: {
        totalCapacityBytes: TOTAL_DRIVE_CAPACITY_BYTES,
        totalCapacityFormatted: '1.00 TB (1,024 GB)',
        usedBytes,
        usedFormatted: formatBytes(usedBytes),
        availableBytes,
        availableFormatted: formatBytes(availableBytes),
        usedPercentage: `${usedPercentage}%`,
        totalPhotos: fileCount,
        breakdown: {
          round1: round1Count,
          round2: round2Count,
          round3: round3Count,
          scored: scoredCount
        }
      }
    });
  } catch (error) {
    console.error('Drive stats error:', error);
    return res.status(500).json({ error: 'Failed to retrieve media drive metrics.' });
  }
});

/**
 * 2. GET /api/admin/drive/photos
 * Returns detailed catalog of all uploaded competition photos and participant metadata
 */
router.get('/photos', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { round, status, search, sort } = req.query;

    let sql = `
      SELECT 
        s.id,
        s.id as submission_id,
        s.round_number,
        s.title as photo_title,
        s.caption as story_pitch,
        s.photo_path,
        s.camera_details,
        s.status as submission_status,
        s.score_creativity,
        s.score_theme,
        s.score_storytelling,
        s.score_technical,
        s.total_score,
        s.judge_feedback,
        s.created_at as uploaded_at,
        pt.id as participant_id,
        pt.registration_id,
        pt.full_name as participant_name,
        pt.mobile as participant_mobile,
        pt.college_name,
        pt.college_type,
        pt.course,
        pt.academic_year,
        pt.student_id,
        pt.city,
        u.email as participant_email
      FROM submissions s
      JOIN participants pt ON s.participant_id = pt.id
      JOIN users u ON pt.user_id = u.id
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

    if (search && search.trim()) {
      sql += ' AND (s.title LIKE ? OR pt.full_name LIKE ? OR pt.registration_id LIKE ? OR u.email LIKE ? OR s.camera_details LIKE ? OR s.caption LIKE ?)';
      const sTerm = `%${search.trim()}%`;
      params.push(sTerm, sTerm, sTerm, sTerm, sTerm, sTerm);
    }

    if (sort === 'score_desc') {
      sql += ' ORDER BY s.total_score DESC, s.created_at DESC';
    } else if (sort === 'oldest') {
      sql += ' ORDER BY s.created_at ASC';
    } else {
      sql += ' ORDER BY s.created_at DESC';
    }

    const rows = await queryAll(sql, params);

    // Enrich rows with physical file size and existence check
    const photos = rows.map(r => {
      let fileSizeBytes = 0;
      let fileSizeFormatted = 'Unknown';
      let fileExists = false;

      if (r.photo_path) {
        const filename = path.basename(r.photo_path);
        const fullPath = path.join(submissionsDir, filename);
        if (fs.existsSync(fullPath)) {
          try {
            const stat = fs.statSync(fullPath);
            fileSizeBytes = stat.size;
            fileSizeFormatted = formatBytes(stat.size);
            fileExists = true;
          } catch (e) {
            // ignore
          }
        }
      }

      return {
        ...r,
        file_size_bytes: fileSizeBytes,
        file_size_formatted: fileSizeFormatted,
        file_exists: fileExists,
        round_title: r.round_number === 1 ? 'Round 1: One Frame, One Story' :
                     r.round_number === 2 ? 'Round 2: The Shutter Hunt' : 'Round 3: Final Frame Exhibition'
      };
    });

    return res.json({ photos, count: photos.length });
  } catch (error) {
    console.error('Drive photos list error:', error);
    return res.status(500).json({ error: 'Failed to retrieve media drive catalog.' });
  }
});

/**
 * 3. GET /api/admin/drive/export-csv
 * Exports complete metadata catalog of all photos in 1 TB Drive to CSV with UTF-8 BOM
 */
router.get('/export-csv', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { round, search } = req.query;

    let sql = `
      SELECT 
        pt.registration_id,
        pt.full_name,
        u.email,
        pt.mobile,
        pt.college_name,
        pt.college_type,
        pt.course,
        pt.academic_year,
        pt.student_id,
        pt.city,
        s.round_number,
        s.title,
        s.caption,
        s.camera_details,
        s.photo_path,
        s.status as judging_status,
        s.total_score,
        s.score_creativity,
        s.score_theme,
        s.score_storytelling,
        s.score_technical,
        s.judge_feedback,
        s.created_at as uploaded_at
      FROM submissions s
      JOIN participants pt ON s.participant_id = pt.id
      JOIN users u ON pt.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (round && round !== 'ALL') {
      sql += ' AND s.round_number = ?';
      params.push(parseInt(round, 10));
    }

    if (search && search.trim()) {
      sql += ' AND (s.title LIKE ? OR pt.full_name LIKE ? OR pt.registration_id LIKE ? OR u.email LIKE ? OR s.camera_details LIKE ?)';
      const sTerm = `%${search.trim()}%`;
      params.push(sTerm, sTerm, sTerm, sTerm, sTerm);
    }

    sql += ' ORDER BY s.round_number ASC, s.created_at DESC';

    const rows = await queryAll(sql, params);

    const headers = [
      'Registration ID', 'Participant Name', 'Email', 'Mobile', 'College Name',
      'College Type', 'Course', 'Academic Year', 'Student ID', 'City',
      'Round Number', 'Round Name', 'Photo Title', '60-Second Story Pitch / Caption',
      'Camera & Device Specs', 'Photo URL Path', 'File Size (MB)', 'Evaluation Status',
      'Total Score (100)', 'Creativity (25)', 'Theme (25)', 'Storytelling (25)',
      'Technical (25)', 'Judge Feedback', 'Upload Timestamp'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    let csv = headers.join(',') + '\r\n';
    for (const r of rows) {
      let fileSizeMB = '0.00';
      if (r.photo_path) {
        const p = path.join(submissionsDir, path.basename(r.photo_path));
        if (fs.existsSync(p)) {
          fileSizeMB = (fs.statSync(p).size / (1024 * 1024)).toFixed(2);
        }
      }

      const roundName = r.round_number === 1 ? 'Round 1: One Frame, One Story' :
                        r.round_number === 2 ? 'Round 2: The Shutter Hunt' : 'Round 3: Final Frame Exhibition';

      csv += [
        escapeCsv(r.registration_id),
        escapeCsv(r.full_name),
        escapeCsv(r.email),
        escapeCsv(r.mobile),
        escapeCsv(r.college_name),
        escapeCsv(r.college_type),
        escapeCsv(r.course),
        escapeCsv(r.academic_year),
        escapeCsv(r.student_id),
        escapeCsv(r.city),
        escapeCsv(r.round_number),
        escapeCsv(roundName),
        escapeCsv(r.title),
        escapeCsv(r.caption),
        escapeCsv(r.camera_details),
        escapeCsv(r.photo_path),
        escapeCsv(fileSizeMB),
        escapeCsv(r.judging_status),
        escapeCsv(r.total_score),
        escapeCsv(r.score_creativity),
        escapeCsv(r.score_theme),
        escapeCsv(r.score_storytelling),
        escapeCsv(r.score_technical),
        escapeCsv(r.judge_feedback),
        escapeCsv(r.uploaded_at)
      ].join(',') + '\r\n';
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="pixel_2026_1tb_photo_drive_manifest.csv"');
    return res.status(200).send('\uFEFF' + csv);
  } catch (error) {
    console.error('Drive export CSV error:', error);
    return res.status(500).json({ error: 'Failed to export drive manifest.' });
  }
});

/**
 * 4. GET /api/admin/drive/download-zip
 * Bundles all high-res photos and an automated MANIFEST.txt into a single downloadable .zip
 */
router.get('/download-zip', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { round } = req.query;

    let sql = `
      SELECT 
        s.id, s.round_number, s.title, s.caption, s.photo_path, s.photo_data, s.camera_details,
        s.total_score, s.judge_feedback, s.created_at,
        pt.registration_id, pt.full_name, pt.college_name, pt.student_id, u.email, pt.mobile
      FROM submissions s
      JOIN participants pt ON s.participant_id = pt.id
      JOIN users u ON pt.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (round && round !== 'ALL') {
      sql += ' AND s.round_number = ?';
      params.push(parseInt(round, 10));
    }
    sql += ' ORDER BY s.round_number ASC, s.created_at DESC';

    const items = await queryAll(sql, params);

    const archive = new ZipArchive({
      zlib: { level: 6 } // Good balance of compression speed and file size
    });

    archive.on('error', (err) => {
      console.error('Archive streaming error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate zip archive.' });
      }
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    const zipName = `PIXEL_2026_Media_Drive_${round ? `Round_${round}_` : ''}${timestamp}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    archive.pipe(res);

    // Build human-readable MANIFEST.txt inside the zip
    let manifestText = `================================================================================\n`;
    manifestText += `PIXEL — FRAME THE DAY (LNCT Group of Colleges, Bhopal)\n`;
    manifestText += `Official 1 TB Photo Drive Master Manifest\n`;
    manifestText += `Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`;
    manifestText += `Total Photos in Archive: ${items.length}\n`;
    manifestText += `================================================================================\n\n`;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const filename = path.basename(it.photo_path);
      const diskPath = path.join(submissionsDir, filename);

      const cleanTitle = (it.title || 'Untitled').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanName = (it.full_name || 'Participant').replace(/[^a-zA-Z0-9_-]/g, '_');
      const ext = path.extname(filename) || '.jpg';
      const archiveFilename = `Round_${it.round_number}/${it.registration_id}_${cleanName}_${cleanTitle}${ext}`;

      manifestText += `[PHOTO #${i + 1}]\n`;
      manifestText += `File Path inside Zip : ${archiveFilename}\n`;
      manifestText += `Registration ID      : ${it.registration_id}\n`;
      manifestText += `Participant Name     : ${it.full_name}\n`;
      manifestText += `College & ID         : ${it.college_name} (${it.student_id})\n`;
      manifestText += `Email & Mobile       : ${it.email} | ${it.mobile}\n`;
      manifestText += `Round                : Round ${it.round_number}\n`;
      manifestText += `Photo Title          : "${it.title}"\n`;
      manifestText += `Camera / Device      : ${it.camera_details || 'Not specified'}\n`;
      manifestText += `Storytelling Pitch   : ${it.caption || 'None provided'}\n`;
      manifestText += `Total Score          : ${it.total_score ? `${it.total_score}/100` : 'Not yet scored'}\n`;
      manifestText += `Judge Feedback       : ${it.judge_feedback || 'None'}\n`;
      manifestText += `Uploaded At          : ${it.created_at}\n`;
      manifestText += `--------------------------------------------------------------------------------\n\n`;

      if (fs.existsSync(diskPath)) {
        archive.file(diskPath, { name: archiveFilename });
      } else if (it.photo_data) {
        // Fallback recovery from database buffer
        try {
          const match = it.photo_data.match(/^data:([^;]+);base64,(.+)$/);
          const base64Content = match ? match[2] : it.photo_data;
          const buffer = Buffer.from(base64Content, 'base64');
          archive.append(buffer, { name: archiveFilename });
        } catch (e) {
          console.warn(`Failed to recover photo ${it.id} from database buffer:`, e.message);
        }
      }
    }

    archive.append(manifestText, { name: 'DRIVE_MANIFEST.txt' });
    await archive.finalize();
  } catch (error) {
    console.error('Download drive zip error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to create zip archive.' });
    }
  }
});

/**
 * 5. GET /api/admin/drive/download-photo/:id
 * Direct, authenticated single photo download with forced attachment headers
 */
router.get('/download-photo/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const item = await queryGet(`
      SELECT s.*, pt.registration_id, pt.full_name 
      FROM submissions s 
      JOIN participants pt ON s.participant_id = pt.id 
      WHERE s.id = ?
    `, [id]);

    if (!item) {
      return res.status(404).json({ error: 'Photo not found in drive.' });
    }

    const cleanTitle = (item.title || 'Photo').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanReg = (item.registration_id || 'PXL').replace(/[^a-zA-Z0-9_-]/g, '_');
    const downloadFilename = `PXL_${cleanReg}_R${item.round_number}_${cleanTitle}.jpg`;

    const diskPath = path.join(submissionsDir, path.basename(item.photo_path));

    if (fs.existsSync(diskPath)) {
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
      return res.sendFile(diskPath);
    }

    if (item.photo_data) {
      const match = item.photo_data.match(/^data:([^;]+);base64,(.+)$/);
      const mime = match ? match[1] : 'image/jpeg';
      const base64Content = match ? match[2] : item.photo_data;
      const buffer = Buffer.from(base64Content, 'base64');

      try {
        const dir = path.dirname(diskPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(diskPath, buffer);
      } catch (_) {}

      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
      return res.send(buffer);
    }

    return res.status(404).json({ error: 'Master image file is currently unavailable.' });
  } catch (err) {
    console.error('Download single drive photo error:', err);
    return res.status(500).json({ error: 'Failed to download master photo.' });
  }
});

export default router;
