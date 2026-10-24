// Test photo download and dynamic recovery
const BASE_URL = 'http://localhost:5000';

async function testDownloadFix() {
  console.log('--- TESTING PHOTO DOWNLOAD FIX & DYNAMIC RECOVERY ---');

  // 1. Login as Admin
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@lnct.ac.in',
      password: 'Pixel#LNCT2026!Secure'
    })
  });
  if (!loginRes.ok) throw new Error('Login failed');
  const { token } = await loginRes.json();
  console.log('✓ Admin logged in.');

  // 2. Fetch drive photos
  const photosRes = await fetch(`${BASE_URL}/api/admin/drive/photos`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!photosRes.ok) throw new Error('Failed to fetch drive photos');
  const { photos } = await photosRes.json();
  console.log(`✓ Fetched ${photos.length} photo(s) from media drive.`);

  if (photos.length > 0) {
    const photo = photos[0];
    console.log(`Testing download for photo: ${photo.photo_title} (ID: ${photo.id || photo.submission_id})`);

    // 3. Test direct authenticated download endpoint with query token
    const downloadUrl = `${BASE_URL}/api/admin/drive/download-photo/${photo.id || photo.submission_id}?token=${encodeURIComponent(token)}`;
    const downloadRes = await fetch(downloadUrl);
    console.log('✓ Download endpoint status:', downloadRes.status, downloadRes.statusText);
    const contentDisposition = downloadRes.headers.get('content-disposition');
    console.log('✓ Content-Disposition:', contentDisposition);
    if (!downloadRes.ok) {
      throw new Error(`Download failed with status ${downloadRes.status}: ${await downloadRes.text()}`);
    }
    const buf = await downloadRes.arrayBuffer();
    console.log(`✓ Downloaded file size: ${(buf.byteLength / 1024).toFixed(1)} KB`);

    // 4. Test dynamic static recovery: request photo.photo_path directly!
    const staticUrl = `${BASE_URL}${photo.photo_path}`;
    const staticRes = await fetch(staticUrl);
    console.log('✓ Static path direct access status:', staticRes.status);
    console.log('✓ Static Content-Type:', staticRes.headers.get('content-type'));
    if (!staticRes.ok) {
      throw new Error(`Static path failed with status ${staticRes.status}`);
    }
  }

  console.log('\n--- ALL DOWNLOAD FIX TESTS PASSED SUCCESSFULLY! ---');
}

testDownloadFix().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
