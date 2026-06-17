import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = {
  type: process.env.FIREBASE_SERVICE_ACCOUNT_TYPE || 'service_account',
  project_id: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID || '',
  private_key_id: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID || '',
  private_key: (process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL || '',
  client_id: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_ID || '',
  auth_uri: process.env.FIREBASE_SERVICE_ACCOUNT_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
  token_uri: process.env.FIREBASE_SERVICE_ACCOUNT_TOKEN_URI || 'https://oauth2.googleapis.com/token',
};

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount as any) });
}

const db = getFirestore();

async function main() {
  console.log('=== CHECKING BOOKINGS ===\n');
  
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  console.log(`Today (Lima): ${today}`);
  console.log(`Tomorrow (Lima): ${tomorrow}\n`);

  // Get total count
  const allCount = await db.collection('bookings').count().get();
  console.log(`Total bookings: ${allCount.data().count}\n`);

  // Get last 30 bookings
  const snapshot = await db.collection('bookings').orderBy('date', 'desc').limit(30).get();
  
  if (snapshot.empty) {
    console.log('❌ NO BOOKINGS FOUND');
    return;
  }

  let todayCount = 0;
  let tomorrowCount = 0;

  for (const doc of snapshot.docs) {
    const d = doc.data();
    const isToday = d.date === today;
    const isTomorrow = d.date === tomorrow;
    if (isToday) todayCount++;
    if (isTomorrow) tomorrowCount++;
    const marker = isToday ? '🔵TODAY' : isTomorrow ? '🟢TMRW' : '   ';
    console.log(`${marker} date=${d.date} ${d.start_time}-${d.end_time} court=${d.court_id || '?'} user=${d.user_id?.substring(0,12)||'?'} status=${d.status} total=${d.total_price} email=${d.user_email || 'none'}`);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Today (${today}): ${todayCount} bookings`);
  console.log(`Tomorrow (${tomorrow}): ${tomorrowCount} bookings`);

  // Also check for today specifically
  console.log('\n=== TODAY BOOKINGS (direct query) ===');
  const todaySnap = await db.collection('bookings').where('date', '==', today).get();
  console.log(`Direct query result: ${todaySnap.size} bookings for ${today}`);
  for (const doc of todaySnap.docs) {
    const d = doc.data();
    console.log(`  -> ${doc.id.substring(0,12)}... ${d.start_time}-${d.end_time} court=${d.court_id} status=${d.status}`);
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
