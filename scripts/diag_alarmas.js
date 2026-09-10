// Diagnóstico alarmas: settings de notificación + reservas de hoy (Lima) que deberían sonar
const path = require('path');
const fs = require('fs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const envPath = path.join(__dirname, '..', '.env.local');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) {
    let v = m[2];
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

async function main() {
  const sa = {
    type: 'service_account',
    project_id: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID,
    private_key_id: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
    private_key: (process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_ID,
  };
  const db = getFirestore(initializeApp({ credential: cert(sa) }));

  // 1. Settings de notificación
  const s = await db.collection('site_settings').doc('notifications').get();
  console.log('=== SETTINGS site_settings/notifications ===');
  console.log(s.exists ? JSON.stringify(s.data(), null, 1) : 'NO EXISTE (se usará DEFAULT enabled=true)');

  // 2. Hora actual Lima
  const nowLima = new Date().toLocaleString('en-US', { timeZone: 'America/Lima', hour12: false });
  const todayLima = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  console.log('\n=== AHORA LIMA ===', nowLima, '| fecha:', todayLima);

  // 3. Reservas de hoy y ayer con sus horarios
  const snap = await db.collection('bookings').get();
  const rows = [];
  snap.forEach((d) => {
    const b = d.data();
    if (b.date === todayLima || b.date === '2026-09-09' || b.date === '2026-09-10') {
      rows.push({ id: d.id, date: b.date, start: b.start_time || b.startTime, end: b.end_time || b.endTime, status: b.status, user: b.user_name || b.user_id, branch: b.branch_id || b.branchId || null });
    }
  });
  rows.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  console.log('\n=== RESERVAS 9-10 SEP ===', rows.length);
  rows.forEach((r) => console.log(JSON.stringify(r)));
}

main().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
