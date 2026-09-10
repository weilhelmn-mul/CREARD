// Smoke test: Firebase Admin SDK con .env.local restaurado
const path = require('path');
const fs = require('fs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

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

  const app = initializeApp({ credential: cert(serviceAccount) });
  console.log('[OK] Admin SDK inicializado para:', process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID);

  const db = getFirestore(app);
  // 1. Leer canchas
  const courtsSnap = await db.collection('courts').get();
  console.log('[OK] Firestore accesible — courts:', courtsSnap.size, 'documentos');

  // 2. Contar reservas y pagos
  const bookingsSnap = await db.collection('bookings').count().get();
  const paymentsSnap = await db.collection('payments').count().get();
  console.log('[OK] bookings:', bookingsSnap.data().count, '| payments:', paymentsSnap.data().count);

  // 3. Listar usuarios Auth
  const users = await getAuth(app).listUsers(100);
  console.log('[OK] Firebase Auth accesible — usuarios:', users.users.length);

  console.log('\n✅ SMOKE TEST COMPLETO: service account operativa');
}

main().catch((e) => {
  console.error('❌ SMOKE TEST FALLÓ:', e.message);
  process.exit(1);
});
