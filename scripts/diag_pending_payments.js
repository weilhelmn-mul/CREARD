// Diagnóstico: reservas por validar en producción (creard-8debc)
const path = require('path');
const fs = require('fs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

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
  const sa = {
    type: 'service_account',
    project_id: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID,
    private_key_id: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
    private_key: (process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_ID,
  };
  const app = initializeApp({ credential: cert(sa) });
  const db = getFirestore(app);

  // 1. Todas las reservas con estados relacionados a pago (últimos 400 días)
  const snap = await db.collection('bookings').get();
  const interesting = [];
  const statusCount = {};
  snap.forEach((d) => {
    const b = d.data();
    statusCount[b.status] = (statusCount[b.status] || 0) + 1;
    const isPending =
      b.status === 'payment_pending' ||
      (b.status === 'reserved' && (b.remaining_payment_status === 'pending' || b.remainingPaymentStatus === 'pending'));
    if (isPending) interesting.push({ id: d.id, date: b.date, status: b.status, remaining: b.remaining_payment_status || b.remainingPaymentStatus || null, advance: b.advance_payment_status || b.advancePaymentStatus || null, paymentStatus: b.payment_status || b.paymentStatus || null, createdAt: b.created_at || null, user: b.user_name || b.userId });
  });

  console.log('=== CONTEO POR STATUS ===');
  console.log(JSON.stringify(statusCount, null, 1));
  console.log('\n=== RESERVAS QUE DEBERÍAN ACTIVAR LA ALERTA ===');
  console.log(JSON.stringify(interesting, null, 1));

  // 2. Pagos top-level pendientes
  const paySnap = await db.collection('payments').where('status', '==', 'pending').get();
  console.log('\n=== PAYMENTS TOP-LEVEL PENDING ===', paySnap.size);
  paySnap.forEach((d) => {
    const p = d.data();
    console.log(JSON.stringify({ id: d.id, bookingId: p.bookingId, type: p.type, amount: p.amount, status: p.status, created_at: p.created_at }));
  });
}

main().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
