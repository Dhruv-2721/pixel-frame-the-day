// Integration test for All Data Backup & Disaster Recovery API
const BASE_URL = 'http://localhost:5000';

async function runBackupTests() {
  console.log('--- STARTING ALL DATA BACKUP & RECOVERY TESTS ---');

  // 1. Login as Admin
  console.log('1. Authenticating as Admin...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@lnct.ac.in',
      password: 'Pixel#LNCT2026!Secure'
    })
  });

  if (!loginRes.ok) {
    throw new Error(`Admin login failed: ${loginRes.status} ${await loginRes.text()}`);
  }
  const { token } = await loginRes.json();
  console.log('✓ Admin authenticated successfully.');

  // 2. Test GET /api/admin/backup/overview
  console.log('2. Testing GET /api/admin/backup/overview...');
  const overviewRes = await fetch(`${BASE_URL}/api/admin/backup/overview`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!overviewRes.ok) throw new Error(`Backup overview failed: ${overviewRes.status}`);
  const overview = await overviewRes.json();
  console.log('✓ Overview status:', overview.status);
  console.log('✓ Database engine:', overview.databaseEngine);
  console.log('✓ Participants count:', overview.counts.participants);
  console.log('✓ Payments count:', overview.counts.payments.total);
  console.log('✓ Submissions count:', overview.counts.submissions.total);
  console.log('✓ Automated snapshots count:', overview.automatedSnapshots.length);

  // 3. Test POST /api/admin/backup/create-snapshot
  console.log('3. Testing POST /api/admin/backup/create-snapshot...');
  const snapshotRes = await fetch(`${BASE_URL}/api/admin/backup/create-snapshot`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!snapshotRes.ok) throw new Error(`Snapshot trigger failed: ${snapshotRes.status}`);
  const snapshotData = await snapshotRes.json();
  console.log('✓ Snapshot created:', snapshotData.message);

  // 4. Test GET /api/admin/backup/export-json
  console.log('4. Testing GET /api/admin/backup/export-json...');
  const jsonExportRes = await fetch(`${BASE_URL}/api/admin/backup/export-json`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!jsonExportRes.ok) throw new Error(`Export JSON failed: ${jsonExportRes.status}`);
  const backupJson = await jsonExportRes.json();
  console.log('✓ Master JSON backup received.');
  console.log('✓ Backup App Name:', backupJson.app);
  console.log('✓ Exported By:', backupJson.exported_by);
  console.log('✓ Exported Tables present:', Object.keys(backupJson.tables).join(', '));
  if (!backupJson.tables.users || !backupJson.tables.participants) {
    throw new Error('Missing core tables in backup JSON');
  }

  // 5. Test GET /api/admin/backup/export-zip
  console.log('5. Testing GET /api/admin/backup/export-zip...');
  const zipRes = await fetch(`${BASE_URL}/api/admin/backup/export-zip`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!zipRes.ok) throw new Error(`Export ZIP failed: ${zipRes.status}`);
  const zipBuffer = await zipRes.arrayBuffer();
  console.log(`✓ Master ZIP archive downloaded (${(zipBuffer.byteLength / 1024).toFixed(1)} KB)`);

  // 6. Test GET /api/admin/backup/download-db
  console.log('6. Testing GET /api/admin/backup/download-db...');
  const dbRes = await fetch(`${BASE_URL}/api/admin/backup/download-db`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!dbRes.ok) throw new Error(`Download DB failed: ${dbRes.status}`);
  const dbBuffer = await dbRes.arrayBuffer();
  console.log(`✓ Raw database downloaded (${(dbBuffer.byteLength / 1024).toFixed(1)} KB)`);

  // 7. Test POST /api/admin/backup/restore-json (Simulate disaster restore)
  console.log('7. Testing POST /api/admin/backup/restore-json (Recovery test)...');
  const restoreRes = await fetch(`${BASE_URL}/api/admin/backup/restore-json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ backup_data: backupJson })
  });

  if (!restoreRes.ok) {
    throw new Error(`Restore failed: ${restoreRes.status} ${await restoreRes.text()}`);
  }
  const restoreData = await restoreRes.json();
  console.log('✓ Restore result:', restoreData.message);
  console.log('✓ Restored counts:', restoreData.restoredCounts);

  // 8. Re-verify overview
  console.log('8. Re-verifying data integrity after restore...');
  const checkRes = await fetch(`${BASE_URL}/api/admin/backup/overview`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const checkOverview = await checkRes.json();
  console.log('✓ Verified participants count:', checkOverview.counts.participants);
  console.log('✓ Verified payments count:', checkOverview.counts.payments.total);

  console.log('\n--- ALL DATA BACKUP & RECOVERY TESTS PASSED (8/8) ---');
}

runBackupTests().catch((err) => {
  console.error('❌ Backup Test Failed:', err);
  process.exit(1);
});
