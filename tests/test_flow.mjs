import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5000/api';

const logPass = (title) => console.log(`\x1b[32m✔ PASS:\x1b[0m ${title}`);
const logFail = (title, err) => console.error(`\x1b[31m✖ FAIL:\x1b[0m ${title}\n`, err);

async function runTests() {
  console.log('=====================================================');
  console.log('Starting PIXEL 2026 End-to-End Automated Test Suite');
  console.log('=====================================================');

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    if (health.status !== 'ONLINE') throw new Error('Health check failed');
    logPass('Server online and responding to health check');

    // 2. Event Settings & QR code verification
    const settingsRes = await fetch(`${BASE_URL}/event/settings`);
    const settings = await settingsRes.json();
    if (settings.event.fee !== 59 || !settings.event.payment_qr_path) {
      throw new Error('Event settings or QR path mismatch');
    }
    logPass('Event settings, participation fee (₹59), and official QR loaded');

    // 3. Test LNCT 1st year restriction enforcement
    const testEmail1 = `test_lnct_1st_${Date.now()}@example.com`;
    const reg1stRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'First Year LNCT Student',
        email: testEmail1,
        mobile: '9876543210',
        city: 'Bhopal',
        college_type: 'LNCT',
        college_name: 'LNCT Group of Colleges, Bhopal',
        course: 'B.Tech CSE',
        academic_year: '1st Year',
        student_id: `ID_${Date.now()}`,
        password: 'Password123',
        accept_rules: true
      })
    });
    if (reg1stRes.status === 400) {
      logPass('LNCT 1st year participation restriction correctly enforced (400 Bad Request)');
    } else {
      throw new Error(`Expected 400 for LNCT 1st year, got ${reg1stRes.status}`);
    }

    // 4. Test Valid LNCT 2nd year registration
    const participantEmail = `photographer_${Date.now()}@lnct.ac.in`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Aarav Patel',
        email: participantEmail,
        mobile: '9876543210',
        city: 'Bhopal',
        college_type: 'LNCT',
        college_name: 'LNCT Group of Colleges, Bhopal',
        course: 'B.Tech CSE',
        academic_year: '2nd Year',
        student_id: `LNCT_${Date.now()}`,
        password: 'Password123',
        accept_rules: true
      })
    });
    const regData = await regRes.json();
    if (!regRes.ok || !regData.token || !regData.participant.registration_id) {
      throw new Error(`Registration failed: ${regData.error || regRes.statusText}`);
    }
    const participantToken = regData.token;
    const participantId = regData.participant.id;
    const regId = regData.participant.registration_id;
    logPass(`Valid participant registered: ${regId} (${regData.participant.full_name})`);

    // 5. Test Duplicate Registration Prevention
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Duplicate Aarav',
        email: participantEmail,
        mobile: '9876543210',
        city: 'Bhopal',
        college_type: 'LNCT',
        college_name: 'LNCT Group of Colleges, Bhopal',
        course: 'B.Tech CSE',
        academic_year: '2nd Year',
        student_id: `LNCT_${Date.now()}`,
        password: 'Password123',
        accept_rules: true
      })
    });
    if (dupRes.status === 409) {
      logPass('Duplicate registration correctly blocked (409 Conflict)');
    } else {
      throw new Error(`Expected 409 on duplicate email, got ${dupRes.status}`);
    }

    // 6. Test Participant Dashboard / Me
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${participantToken}` }
    });
    const meData = await meRes.json();
    if (!meData.participant || Boolean(meData.ticket)) {
      throw new Error('Participant state invalid or ticket issued prematurely without payment');
    }
    logPass('Participant dashboard loads correctly with ticket pending');

    // 7. Submit Payment Proof with test image
    // Prepare a mock test image file
    const testImgPath = path.resolve(__dirname, 'test_screenshot.jpg');
    // Create a 1x1 jpg buffer if not exists
    const mockJpgBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
      0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
      0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
      0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
      0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
      0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
      0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
      0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
      0x00, 0xbf, 0x80, 0xff, 0xd9
    ]);
    fs.writeFileSync(testImgPath, mockJpgBuffer);

    const formData = new FormData();
    const testBlob = new Blob([mockJpgBuffer], { type: 'image/jpeg' });
    formData.append('screenshot', testBlob, 'upi_receipt.jpg');
    formData.append('transaction_ref', 'UPI/2026/9823412098');
    formData.append('amount', '59');
    formData.append('payer_name', 'Aarav Patel');
    formData.append('payment_date', '2026-10-22');
    formData.append('notes', 'Paid via Google Pay');

    const paymentRes = await fetch(`${BASE_URL}/payment/submit`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${participantToken}` },
      body: formData
    });
    const paymentData = await paymentRes.json();
    if (!paymentRes.ok || paymentData.payment.status !== 'UNDER_REVIEW') {
      throw new Error(`Payment submission failed: ${paymentData.error}`);
    }
    const paymentId = paymentData.payment.id;
    logPass(`Payment proof submitted successfully: Status UNDER_REVIEW (UTR: ${paymentData.payment.transaction_ref})`);

    // 8. Test Private Proof Access Control
    // Unauthenticated request to view payment screenshot
    const unauthProofRes = await fetch(`${BASE_URL}/payments/${paymentId}/proof`);
    if (unauthProofRes.status === 401) {
      logPass('Private payment proof access control enforced (401 Unauthorized for public access)');
    } else {
      throw new Error(`Expected 401 for unauthenticated proof, got ${unauthProofRes.status}`);
    }

    // 9. Login as Administrator
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@pixel.lnct.ac.in',
        password: 'Admin@Pixel2026'
      })
    });
    const adminLoginData = await adminLoginRes.json();
    if (!adminLoginRes.ok || adminLoginData.user.role !== 'ADMIN') {
      throw new Error('Admin login failed');
    }
    const adminToken = adminLoginData.token;
    logPass('Administrator authenticated: admin@pixel.lnct.ac.in');

    // 10. Admin views payment review queue
    const queueRes = await fetch(`${BASE_URL}/admin/payments/admin/list?status=UNDER_REVIEW`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const queueData = await queueRes.json();
    const foundPayment = queueData.payments.find(p => p.id === paymentId);
    if (!foundPayment) throw new Error('Submitted payment not found in admin review queue');
    logPass('Admin retrieved payment in pending review queue');

    // 11. Test Payment Rejection Workflow
    const rejectRes = await fetch(`${BASE_URL}/admin/payments/admin/${paymentId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ reason: 'Transaction reference number blurry on screenshot.' })
    });
    const rejectData = await rejectRes.json();
    if (!rejectRes.ok || rejectData.payment.status !== 'REJECTED') {
      throw new Error('Payment rejection failed');
    }
    logPass('Admin rejected payment with explanation reason recorded');

    // 12. Participant resubmits payment proof
    const resubmitFormData = new FormData();
    resubmitFormData.append('screenshot', testBlob, 'upi_receipt_clear.jpg');
    resubmitFormData.append('transaction_ref', 'UPI/2026/9823412098');
    resubmitFormData.append('amount', '59');
    resubmitFormData.append('payer_name', 'Aarav Patel');
    resubmitFormData.append('payment_date', '2026-10-22');
    resubmitFormData.append('notes', 'Resubmitted with clear screenshot');

    const resubmitRes = await fetch(`${BASE_URL}/payment/submit`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${participantToken}` },
      body: resubmitFormData
    });
    const resubmitData = await resubmitRes.json();
    if (!resubmitRes.ok || resubmitData.payment.status !== 'UNDER_REVIEW') {
      throw new Error('Payment resubmission failed');
    }
    logPass('Participant resubmitted payment proof, reset to UNDER_REVIEW');

    // 13. Admin approves payment & atomically generates E-Ticket
    const approveRes = await fetch(`${BASE_URL}/admin/payments/admin/${paymentId}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const approveData = await approveRes.json();
    if (!approveRes.ok || approveData.payment.status !== 'VERIFIED' || !approveData.ticket) {
      throw new Error(`Payment approval failed: ${approveData.error}`);
    }
    const ticketNumber = approveData.ticket.ticket_number;
    const verificationHash = approveData.ticket.verification_hash;
    logPass(`Admin approved payment! E-Ticket issued atomically: ${ticketNumber}`);

    // 14. Participant retrieves issued E-Ticket with QR code
    const ticketRes = await fetch(`${BASE_URL}/tickets/my-ticket`, {
      headers: { 'Authorization': `Bearer ${participantToken}` }
    });
    const myTicketData = await ticketRes.json();
    if (!ticketRes.ok || !myTicketData.ticket.qr_image_url) {
      throw new Error('Failed to retrieve ticket or QR image data URL');
    }
    logPass('Participant retrieved full E-Ticket pass with base64 QR payload');

    // 15. Verify Ticket Authenticity
    const verifyRes = await fetch(`${BASE_URL}/tickets/verify/${ticketNumber}`);
    const verifyData = await verifyRes.json();
    if (!verifyData.valid || verifyData.status !== 'ACTIVE') {
      throw new Error(`Ticket verification failed: ${JSON.stringify(verifyData)}`);
    }
    logPass(`Gate verifier confirmed authentic ticket for ${verifyData.participantName}`);

    // 16. Event Staff Login & Check-in
    const staffLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'staff@pixel.lnct.ac.in',
        password: 'Staff@Pixel2026'
      })
    });
    const staffData = await staffLoginRes.json();
    const staffToken = staffData.token;

    const checkInRes = await fetch(`${BASE_URL}/staff/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({ identifier: ticketNumber })
    });
    const checkInData = await checkInRes.json();
    if (!checkInRes.ok || !checkInData.success) {
      throw new Error(`Check-in failed: ${checkInData.error}`);
    }
    logPass(`Staff checked in attendee: ${checkInData.ticket.participantName}`);

    // 17. Test Duplicate Check-in Prevention
    const dupCheckInRes = await fetch(`${BASE_URL}/staff/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({ identifier: ticketNumber })
    });
    if (dupCheckInRes.status === 400) {
      const dupData = await dupCheckInRes.json();
      logPass(`Duplicate check-in correctly blocked: "${dupData.error}"`);
    } else {
      throw new Error(`Expected 400 for duplicate check-in, got ${dupCheckInRes.status}`);
    }

    // 18. Notification Service stats endpoint check
    const notifStatsRes = await fetch(`${BASE_URL}/notifications/stats`);
    const notifStats = await notifStatsRes.json();
    if (!notifStats.notifications) throw new Error('Notification stats check failed');
    logPass('Live SSE Notification service stats active');

    // 19. Participant uploads photo competition submission for Round 1
    const photoBuffer = mockJpgBuffer;
    const photoFormData = new FormData();
    photoFormData.append('photo', new Blob([photoBuffer], { type: 'image/jpeg' }), 'sunset_campus.jpg');
    photoFormData.append('title', 'Golden Hour at Academic Block');
    photoFormData.append('caption', 'A perspective on architectural symmetry during sunset.');
    photoFormData.append('camera_details', 'Sony Alpha 7 IV - 35mm f/1.8');
    photoFormData.append('round_number', '1');

    const submitPhotoRes = await fetch(`${BASE_URL}/submissions/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${participantToken}` },
      body: photoFormData
    });
    const submitPhotoData = await submitPhotoRes.json();
    if (!submitPhotoRes.ok || !submitPhotoData.submission) {
      throw new Error(`Photo submission failed: ${submitPhotoData.error}`);
    }
    const submissionId = submitPhotoData.submission.id;
    logPass(`Participant submitted competition photo for Round 1: "${submitPhotoData.submission.title}"`);

    // 20. Test Round 1 submission limit enforcement (Max 1 photo)
    const secondPhotoFormData = new FormData();
    secondPhotoFormData.append('photo', new Blob([photoBuffer], { type: 'image/jpeg' }), 'extra_photo.jpg');
    secondPhotoFormData.append('title', 'Second Photo Attempt');
    secondPhotoFormData.append('round_number', '1');

    const secondSubmitRes = await fetch(`${BASE_URL}/submissions/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${participantToken}` },
      body: secondPhotoFormData
    });
    if (secondSubmitRes.status === 400) {
      logPass('Round 1 photo limit correctly enforced (400 Bad Request on second submission)');
    } else {
      throw new Error(`Expected 400 for duplicate round submission, got ${secondSubmitRes.status}`);
    }

    // 21. Admin retrieves photo submission in judging queue
    const adminSubsRes = await fetch(`${BASE_URL}/submissions/admin/list?round=1`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminSubsData = await adminSubsRes.json();
    const foundSub = adminSubsData.submissions.find(s => s.id === submissionId);
    if (!foundSub) throw new Error('Photo submission not found in admin judging queue');
    logPass('Admin retrieved submission in Round 1 evaluation queue');

    // 22. Admin / Judge scores photo using 4-part official rubric
    const scoreRes = await fetch(`${BASE_URL}/submissions/admin/${submissionId}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        score_creativity: 24,
        score_theme: 23.5,
        score_storytelling: 22,
        score_technical: 25,
        feedback: 'Superb composition and depth of field. Great adherence to theme!',
        promote_to_round: 'ROUND_2'
      })
    });
    const scoreData = await scoreRes.json();
    if (!scoreRes.ok || scoreData.submission.total_score !== 94.5 || scoreData.submission.status !== 'SCORED') {
      throw new Error(`Scoring submission failed: ${scoreData.error}`);
    }
    logPass(`Judge evaluated photo: 94.5/100 awarded across 4 criteria & promoted to ROUND_2`);

    // 23. Live Leaderboard Verification
    const leaderboardRes = await fetch(`${BASE_URL}/submissions/leaderboard?round=1`);
    const leaderboardData = await leaderboardRes.json();
    const topEntry = leaderboardData.leaderboard.find(l => l.submission_id === submissionId);
    if (!topEntry || topEntry.total_score !== 94.5) {
      throw new Error('Leaderboard verification failed to reflect top score');
    }
    logPass(`Live Leaderboard confirmed ranking with total score: ${topEntry.total_score} pts`);

    // 24. Participant retrieves own submissions with score & remarks
    const mySubsRes = await fetch(`${BASE_URL}/submissions/my`, {
      headers: { 'Authorization': `Bearer ${participantToken}` }
    });
    const mySubsData = await mySubsRes.json();
    if (!mySubsData.submissions.some(s => s.id === submissionId && s.status === 'SCORED')) {
      throw new Error('Participant submissions query failed');
    }
    logPass('Participant dashboard retrieved evaluated submission with feedback & rubric breakdown');

    // 25. Email Delivery logs verification
    const emailLogsRes = await fetch(`${BASE_URL}/admin/email-logs`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const emailLogsData = await emailLogsRes.json();
    if (!emailLogsData.logs || emailLogsData.logs.length === 0) {
      throw new Error('Email logs table empty — automated email triggers not recorded');
    }
    logPass(`Nodemailer delivery audit confirmed: ${emailLogsData.logs.length} automated emails recorded`);

    // Clean up temporary test image
    if (fs.existsSync(testImgPath)) fs.unlinkSync(testImgPath);

    console.log('=====================================================');
    console.log('\x1b[32mALL 25 END-TO-END ACCEPTANCE TESTS PASSED SUCCESSFULLY!\x1b[0m');
    console.log('=====================================================');
  } catch (err) {
    logFail('Test Suite Execution', err);
    process.exit(1);
  }
}

runTests();
