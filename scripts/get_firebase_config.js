// Obtiene projectNumber, storageBucket y appId web del proyecto Firebase
// usando la service account key de .env.local (Firebase Management API)
const path = require('path');
const fs = require('fs');
const { initializeApp, cert } = require('firebase-admin/app');

// Cargar .env.local manualmente (solo las vars FIREBASE_SERVICE_ACCOUNT_*)
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) {
    let v = m[2];
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

async function main() {
  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID,
    private_key_id: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
    private_key: (process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_ID,
  };

  initializeApp({ credential: cert(serviceAccount) });

  // Token con scopes explicitos (Firebase Management API)
  const { GoogleAuth } = require('google-auth-library');
  const gauth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: [
      'https://www.googleapis.com/auth/firebase',
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/firebase.remoteconfig',
    ],
  });
  const client = await gauth.getClient();
  const tok = await client.getAccessToken();
  const headers = { Authorization: `Bearer ${tok.token}` };
  console.log('Token obtenido, len=', tok.token?.length);

  // 1. Info del proyecto (projectNumber, resources)
  const projRes = await fetch('https://firebase.googleapis.com/v1alpha/projects/creard-8debc', { headers });
  console.log('=== PROJECT status', projRes.status, '===');
  const projText = await projRes.text();
  try { console.log(JSON.stringify(JSON.parse(projText), null, 2)); } catch { console.log(projText.slice(0, 500)); }

  // 2. Web apps registradas (appId)
  const appsRes = await fetch('https://firebase.googleapis.com/v1alpha/projects/creard-8debc/webApps', { headers });
  console.log('=== WEB APPS status', appsRes.status, '===');
  const appsText = await appsRes.text();
  try { console.log(JSON.stringify(JSON.parse(appsText), null, 2)); } catch { console.log(appsText.slice(0, 500)); }
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
