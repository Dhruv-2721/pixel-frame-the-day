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
    if (settings.event.fee !== 99 || !settings.event.payment_qr_path) {
      throw new Error('Event settings or QR path mismatch');
    }
    logPass('Event settings, participation fee (₹99), and official QR loaded');

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
    if (!meData.participant || meData.ticket !== null) {
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
    formData.append('amount', '99');
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
    resubmitFormData.append('amount', '99');
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

    // 18. Clean up temporary test image
    if (fs.existsSync(testImgPath)) fs.unlinkSync(testImgPath);

    console.log('=====================================================');
    console.log('\x1b[32mALL 18 END-TO-END ACCEPTANCE TESTS PASSED SUCCESSFULLY!\x1b[0m');
    console.log('=====================================================');
  } catch (err) {
    logFail('Test Suite Execution', err);
    process.exit(1);
  }
}

runTests();
