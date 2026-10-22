import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { queryRun } from '../db.js';

// Setup Transporter (Uses environment SMTP credentials or transparent simulation mode)
let transporter = null;

const initTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('[EmailService] Configured with live SMTP transport:', process.env.SMTP_HOST);
  } else {
    // Simulated transporter fallback
    console.log('[EmailService] Running in SIMULATION mode (SMTP credentials not provided in .env). Emails will be logged to database & console.');
  }
};

initTransporter();

/**
 * Log email transmission to SQLite database
 */
const logEmail = async ({ recipient_email, subject, template_name, status, details }) => {
  try {
    const id = uuidv4();
    await queryRun(`
      INSERT INTO email_logs (id, recipient_email, subject, template_name, status, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, recipient_email, subject, template_name, status, details || null]);
  } catch (err) {
    console.error('[EmailService] Failed to record email log:', err.message);
  }
};

/**
 * Send an email message (handles live SMTP or simulation)
 */
export const sendEmail = async ({ to, subject, html, text, templateName = 'GENERAL', attachments = [] }) => {
  const from = process.env.EMAIL_FROM || '"PIXEL 2026 Organizing Committee" <pixel@lnct.ac.in>';

  try {
    if (transporter) {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text: text || html.replace(/<[^>]+>/g, ''),
        html,
        attachments
      });

      console.log(`[EmailService] Live email dispatched to ${to}: MessageId=${info.messageId}`);
      await logEmail({
        recipient_email: to,
        subject,
        template_name: templateName,
        status: 'SENT',
        details: `MessageId: ${info.messageId}`
      });

      return { success: true, simulated: false, messageId: info.messageId };
    } else {
      // Simulation mode
      console.log(`\n======================================================`);
      console.log(`[EmailService - SIMULATED DELIVERY]`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Template: ${templateName}`);
      console.log(`Time: ${new Date().toISOString()}`);
      console.log(`======================================================\n`);

      await logEmail({
        recipient_email: to,
        subject,
        template_name: templateName,
        status: 'SIMULATED',
        details: 'Simulated dispatch (No live SMTP config provided). Content rendered successfully.'
      });

      return { success: true, simulated: true };
    }
  } catch (error) {
    console.error(`[EmailService] Delivery error to ${to}:`, error.message);
    await logEmail({
      recipient_email: to,
      subject,
      template_name: templateName,
      status: 'FAILED',
      details: error.message
    });
    return { success: false, error: error.message };
  }
};

/**
 * Branded Ticket Confirmation Email
 */
export const sendTicketConfirmationEmail = async ({ participant, ticket, payment, eventSettings }) => {
  const subject = `🎉 Verified: Your E-Ticket for PIXEL — FRAME THE DAY (${ticket.ticket_number})`;
  const eventName = eventSettings?.event_name || 'PIXEL — FRAME THE DAY';
  const venue = eventSettings?.venue || 'LNCT Group of Colleges, Bhopal';
  const dates = eventSettings?.event_dates || '29, 30 & 31 October';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d0f14; color: #f1f5f9; margin: 0; padding: 20px; }
        .card { max-width: 600px; margin: 0 auto; background: #161a23; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .header { background: linear-gradient(135deg, #1e293b, #0f172a); border-bottom: 2px solid #eab308; padding: 30px; text-align: center; }
        .header h1 { margin: 0; color: #eab308; font-size: 26px; letter-spacing: 1px; font-weight: 800; }
        .header p { margin: 8px 0 0; color: #94a3b8; font-size: 14px; }
        .body { padding: 30px; }
        .ticket-box { background: #0b0e14; border: 2px dashed #eab308; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0; }
        .ticket-num { font-size: 22px; font-family: monospace; font-weight: bold; color: #facc15; letter-spacing: 2px; }
        .details-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .details-table td { padding: 8px 0; font-size: 14px; border-bottom: 1px solid #1e293b; }
        .details-table td.label { color: #64748b; width: 40%; }
        .details-table td.val { color: #e2e8f0; font-weight: 600; text-align: right; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; background: #15803d; color: #ffffff; }
        .footer { background: #0f172a; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>📸 ${eventName}</h1>
          <p>Organized by LNCT Group of Colleges, Bhopal</p>
        </div>
        <div class="body">
          <p style="font-size: 16px;">Dear <strong>${participant.full_name}</strong>,</p>
          <p style="color: #94a3b8; line-height: 1.6;">
            Congratulations! Your payment of <strong>₹${payment.amount}</strong> (Ref: <code>${payment.transaction_ref}</code>) has been officially verified by the organizing committee. Your event pass is now active!
          </p>

          <div class="ticket-box">
            <div style="font-size: 12px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 5px;">Official E-Ticket Number</div>
            <div class="ticket-num">${ticket.ticket_number}</div>
            <div style="margin-top: 10px;">
              <span class="badge">STATUS: VERIFIED & ACTIVE</span>
            </div>
          </div>

          <table class="details-table">
            <tr>
              <td class="label">Participant</td>
              <td class="val">${participant.full_name}</td>
            </tr>
            <tr>
              <td class="label">Registration ID</td>
              <td class="val">${participant.registration_id}</td>
            </tr>
            <tr>
              <td class="label">College</td>
              <td class="val">${participant.college_name}</td>
            </tr>
            <tr>
              <td class="label">Event Dates</td>
              <td class="val">${dates}</td>
            </tr>
            <tr>
              <td class="label">Venue</td>
              <td class="val">${venue}</td>
            </tr>
            <tr>
              <td class="label">Round 1 Reporting</td>
              <td class="val">10:30 AM — Campus Gate</td>
            </tr>
          </table>

          <div style="margin-top: 25px; background: rgba(234, 179, 8, 0.08); border-left: 4px solid #eab308; padding: 12px 16px; border-radius: 4px;">
            <strong style="color: #facc15; font-size: 13px;">Important Gate Check-In Instructions:</strong>
            <p style="color: #cbd5e1; font-size: 13px; margin: 4px 0 0; line-height: 1.5;">
              Please present your digital E-Ticket on your smartphone or carry a printed copy for gate verification at LNCT Bhopal. Single-use entry validation will be enforced.
            </p>
          </div>
        </div>
        <div class="footer">
          &copy; 2026 LNCT Group of Colleges &bull; PIXEL Photography Club &bull; Not just a photo, but a perspective.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: participant.email,
    subject,
    html,
    templateName: 'TICKET_CONFIRMATION'
  });
};

/**
 * Branded Payment Rejection Notification
 */
export const sendPaymentRejectionEmail = async ({ participant, payment, reason }) => {
  const subject = `⚠️ Action Required: Payment Proof Resubmission for PIXEL 2026`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d0f14; color: #f1f5f9; margin: 0; padding: 20px; }
        .card { max-width: 600px; margin: 0 auto; background: #161a23; border: 1px solid #334155; border-radius: 16px; overflow: hidden; }
        .header { background: #7f1d1d; border-bottom: 2px solid #ef4444; padding: 25px; text-align: center; }
        .header h1 { margin: 0; color: #fee2e2; font-size: 22px; }
        .body { padding: 25px; }
        .reason-box { background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 8px; padding: 16px; margin: 20px 0; color: #fca5a5; }
        .footer { background: #0f172a; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>⚠️ Payment Proof Review Update</h1>
        </div>
        <div class="body">
          <p>Dear <strong>${participant.full_name}</strong>,</p>
          <p style="color: #94a3b8; line-height: 1.5;">
            Our administrative team reviewed your payment submission (Ref: <code>${payment.transaction_ref}</code>), but was unable to verify it due to the following reason:
          </p>

          <div class="reason-box">
            <strong>Reason for rejection:</strong><br>
            ${reason}
          </div>

          <p style="color: #cbd5e1; font-size: 14px;">
            <strong>What to do next?</strong><br>
            Please log in to your PIXEL Participant Dashboard, navigate to the Payment section, and resubmit a clear screenshot with the correct transaction reference number. Your registration will be reviewed immediately upon resubmission.
          </p>
        </div>
        <div class="footer">
          &copy; 2026 LNCT Group of Colleges &bull; PIXEL Photography Committee
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: participant.email,
    subject,
    html,
    templateName: 'PAYMENT_REJECTED'
  });
};

/**
 * Branded Judging Result Notification
 */
export const sendJudgingResultEmail = async ({ participant, submission, roundTitle }) => {
  const subject = `🏆 Scores Released: Your Round ${submission.round_number} Submission has been Judged!`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d0f14; color: #f1f5f9; margin: 0; padding: 20px; }
        .card { max-width: 600px; margin: 0 auto; background: #161a23; border: 1px solid #334155; border-radius: 16px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #1e293b, #0f172a); border-bottom: 2px solid #eab308; padding: 25px; text-align: center; }
        .header h1 { margin: 0; color: #eab308; font-size: 22px; }
        .body { padding: 25px; }
        .score-circle { width: 90px; height: 90px; border-radius: 50%; background: #eab308; color: #000; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; margin: 20px auto; }
        .footer { background: #0f172a; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>📸 Round ${submission.round_number} Evaluation Results</h1>
          <p style="margin: 5px 0 0; color: #94a3b8;">${roundTitle || 'PIXEL — FRAME THE DAY'}</p>
        </div>
        <div class="body">
          <p>Dear <strong>${participant.full_name}</strong>,</p>
          <p style="color: #94a3b8;">
            The judges have completed scoring your photograph: <strong>"${submission.title}"</strong>.
          </p>

          <div style="text-align: center;">
            <div style="display: inline-block; background: #eab308; color: #000; border-radius: 12px; padding: 15px 30px; font-size: 26px; font-weight: 800; font-family: monospace;">
              Score: ${submission.total_score} / 100
            </div>
          </div>

          <div style="margin-top: 20px; background: #0f172a; border-radius: 8px; padding: 15px;">
            <div style="font-size: 13px; color: #94a3b8;">Rubric Breakdown:</div>
            <ul style="color: #e2e8f0; font-size: 14px; margin: 8px 0; padding-left: 20px;">
              <li>Creativity & Originality: <strong>${submission.score_creativity} / 25</strong></li>
              <li>Theme Relevance: <strong>${submission.score_theme} / 25</strong></li>
              <li>Storytelling & Perspective: <strong>${submission.score_storytelling} / 25</strong></li>
              <li>Composition & Technical Quality: <strong>${submission.score_technical} / 25</strong></li>
            </ul>
            ${submission.judge_feedback ? `<div style="margin-top: 10px; border-top: 1px solid #334155; pt: 8px; font-size: 13px; color: #cbd5e1;"><em>Judge's Feedback:</em> "${submission.judge_feedback}"</div>` : ''}
          </div>

          <p style="margin-top: 20px; font-size: 13px; color: #94a3b8;">
            Check the live event leaderboard on the PIXEL portal to see your standing!
          </p>
        </div>
        <div class="footer">
          &copy; 2026 LNCT Group of Colleges &bull; PIXEL Photography Club
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: participant.email,
    subject,
    html,
    templateName: 'JUDGING_RESULT'
  });
};
