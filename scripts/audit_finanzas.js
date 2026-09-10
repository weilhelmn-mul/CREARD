// ============================================================
// AUDITORÍA FINANCIERA — CREARD (producción creard-8debc)
// Audita: Ingresos Totales, Yape/Plin, Efectivo,
//         Adelantos por Cancelaciones, Retenidos, Devueltos
// Fuentes: bookings, payments (top-level), retained_advances, expenses
// ============================================================
const path = require('path');
const fs = require('fs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) {
    let v = m[2];
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

const r2 = (n) => Math.round(n * 100) / 100;

// Normaliza método de pago a categoría canónica
function normMethod(raw) {
  const m = String(raw || '').trim().toLowerCase();
  if (!m) return 'SIN_MÉTODO';
  if (m === 'yape' || m === 'yape_qr' || m === 'yape qr' || m === 'yapeqr') return 'YAPE';
  if (m === 'plin') return 'PLIN';
  if (m === 'mixto') return 'MIXTO';
  if (m === 'efectivo' || m === 'cash') return 'EFECTIVO';
  if (m === 'transfer' || m === 'transferencia') return 'TRANSFERENCIA';
  if (m === 'culqi') return 'CULQI';
  return m.toUpperCase();
}

function tsToStr(ts) {
  if (!ts) return null;
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts) {
    try { return ts.toDate().toISOString(); } catch { return null; }
  }
  if (typeof ts === 'string') return ts;
  if (typeof ts === 'number') return new Date(ts).toISOString();
  return null;
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

  // ---------- Carga de datos ----------
  const [bookSnap, paySnap, raSnap, expSnap] = await Promise.all([
    db.collection('bookings').get(),
    db.collection('payments').get(),
    db.collection('retained_advances').get(),
    db.collection('expenses').get(),
  ]);

  const bookings = bookSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const payments = paySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const ras = raSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const expenses = expSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const bookingIds = new Set(bookings.map((b) => b.id));

  // ============ A. INGRESOS TOTALES (criterio panel Finanzas) ============
  const completed = bookings.filter((b) => b.status === 'completed');
  const reserved = bookings.filter((b) => b.status === 'reserved');
  const cancelled = bookings.filter((b) => b.status === 'cancelled');
  const payPending = bookings.filter((b) => b.status === 'payment_pending');
  const awaiting = bookings.filter((b) => b.status === 'awaiting_payment');

  const completedIncome = completed.reduce((s, b) => s + (b.advance_amount || 0), 0);
  const reservedAdvances = reserved.reduce((s, b) => s + (b.advance_amount || 0), 0);
  const totalIncome = completedIncome + reservedAdvances;

  console.log('================ A. INGRESOS TOTALES (criterio del panel) ================');
  console.log(`Reservas COMPLETADAS: ${completed.length} → S/ ${r2(completedIncome)}  (suma de advance_amount = pagado)`);
  console.log(`Reservas RESERVADAS : ${reserved.length} → S/ ${r2(reservedAdvances)}  (adelantos activos)`);
  console.log(`INGRESOS TOTALES    : S/ ${r2(totalIncome)}`);
  console.log(`(No cuentan: payment_pending=${payPending.length}, awaiting_payment=${awaiting.length}, cancelled=${cancelled.length})`);

  // ============ B. DESGLOSE POR MÉTODO (fuente: bookings) ============
  const byMethodBookings = {};
  let mixtoSinBreakdown = 0;
  const mixtoSinBreakdownList = [];
  for (const b of [...completed, ...reserved]) {
    const paid = b.advance_amount || 0;
    const pm = normMethod(b.payment_method);
    if (pm === 'MIXTO') {
      const bd = b.payment_breakdown || b.paymentBreakdown;
      if (bd && (bd.efectivo > 0 || bd.digital > 0)) {
        const efect = bd.efectivo || 0;
        const dig = bd.digital || 0;
        const digM = normMethod(bd.digitalMethod || 'YAPE');
        byMethodBookings['EFECTIVO'] = (byMethodBookings['EFECTIVO'] || 0) + efect;
        byMethodBookings[digM] = (byMethodBookings[digM] || 0) + dig;
      } else {
        mixtoSinBreakdown++;
        mixtoSinBreakdownList.push({ id: b.id, date: b.date, paid });
        byMethodBookings['MIXTO_SIN_DESGLOSE'] = (byMethodBookings['MIXTO_SIN_DESGLOSE'] || 0) + paid;
      }
    } else {
      byMethodBookings[pm] = (byMethodBookings[pm] || 0) + paid;
    }
  }
  const sumBookings = Object.values(byMethodBookings).reduce((s, v) => s + v, 0);

  console.log('\n================ B. DESGLOSE POR MÉTODO (fuente: reservas activas+completadas) ================');
  for (const [k, v] of Object.entries(byMethodBookings).sort((a, b2) => b2[1] - a[1])) {
    console.log(`  ${k.padEnd(20)} S/ ${r2(v)}`);
  }
  console.log(`  SUMA                S/ ${r2(sumBookings)}  ${r2(sumBookings) === r2(totalIncome) ? '✔ cuadra con Ingresos Totales' : '⚠ NO cuadra con Ingresos Totales'}`);
  if (mixtoSinBreakdown > 0) {
    console.log(`  ⚠ ${mixtoSinBreakdown} reservas MIXTO sin payment_breakdown:`, JSON.stringify(mixtoSinBreakdownList));
  }

  // Desglose Yape/Plin consolidado (Yape+Plin como "digital", resto efectivo)
  const yapePlin = (byMethodBookings['YAPE'] || 0) + (byMethodBookings['PLIN'] || 0);
  const efectivo = byMethodBookings['EFECTIVO'] || 0;
  console.log(`\n  ► Yape + Plin (digital): S/ ${r2(yapePlin)}`);
  console.log(`  ► Efectivo             : S/ ${r2(efectivo)}`);

  // ============ C. DESGLOSE POR MÉTODO (fuente: payments top-level) ============
  const byMethodPayments = {};
  const byTypePayments = {};
  const byStatusPayments = {};
  let payTotalCompleted = 0;
  for (const p of payments) {
    const st = p.status || 'unknown';
    byStatusPayments[st] = (byStatusPayments[st] || 0) + (p.amount || 0);
    const meth = normMethod(p.method || p.payment_method_display);
    if (st === 'completed') {
      byMethodPayments[meth] = (byMethodPayments[meth] || 0) + (p.amount || 0);
      byTypePayments[p.type || '?'] = (byTypePayments[p.type || '?'] || 0) + (p.amount || 0);
      payTotalCompleted += p.amount || 0;
    }
  }
  console.log('\n================ C. PAGOS REGISTRADOS (colección payments, status=completed) ================');
  for (const [k, v] of Object.entries(byMethodPayments).sort((a, b2) => b2[1] - a[1])) {
    console.log(`  ${k.padEnd(20)} S/ ${r2(v)}`);
  }
  console.log(`  TOTAL cobrado       S/ ${r2(payTotalCompleted)}`);
  console.log(`  Por tipo:`, JSON.stringify(Object.fromEntries(Object.entries(byTypePayments).map(([k, v]) => [k, r2(v)]))));
  console.log(`  Por status (todos):`, JSON.stringify(Object.fromEntries(Object.entries(byStatusPayments).map(([k, v]) => [k, r2(v)]))));

  // ============ D. CONCILIACIÓN bookings vs payments ============
  const payByBooking = {};
  for (const p of payments) {
    if (!p.booking_id) continue;
    if (p.status !== 'completed') continue;
    payByBooking[p.booking_id] = (payByBooking[p.booking_id] || 0) + (p.amount || 0);
  }
  const mismatches = [];
  for (const b of bookings) {
    if (!['reserved', 'completed', 'cancelled', 'payment_pending'].includes(b.status)) continue;
    const expected = b.advance_amount || 0;
    const actual = payByBooking[b.id] || 0;
    if (r2(expected) !== r2(actual)) {
      mismatches.push({ id: b.id, date: b.date, status: b.status, advance: r2(expected), pagosRegistrados: r2(actual), diff: r2(expected - actual) });
    }
  }
  console.log('\n================ D. CONCILIACIÓN advance_amount vs pagos registrados ================');
  console.log(`Reservas revisadas con diferencia: ${mismatches.length}`);
  for (const m of mismatches.slice(0, 20)) console.log('  ', JSON.stringify(m));
  if (mismatches.length > 20) console.log(`   ... y ${mismatches.length - 20} más`);

  // Huérfanos
  const orphans = payments.filter((p) => !p.booking_id || !bookingIds.has(p.booking_id));
  const orphansSum = orphans.reduce((s, p) => s + (p.amount || 0), 0);
  console.log(`\nPagos huérfanos (sin reserva válida): ${orphans.length} → S/ ${r2(orphansSum)}`);
  for (const o of orphans.slice(0, 15)) {
    console.log(`   id=${o.id} method=${o.method} status=${o.status} amount=${o.amount} type=${o.type} created=${tsToStr(o.created_at)} user=${o.user_name || o.user_id || '?'}`);
  }

  // Por validar (declarados, no validados)
  const declaredPending = payments.filter((p) => p.status === 'pending');
  console.log(`Pagos declarados pendientes de validación: ${declaredPending.length} → S/ ${r2(declaredPending.reduce((s, p) => s + (p.amount || 0), 0))}`);

  // ============ E. ADELANTOS POR CANCELACIONES ============
  const rasRetained = ras.filter((ra) => ra.status === 'retained');
  const rasRefunded = ras.filter((ra) => ra.status === 'refunded');
  const retainedTotal = rasRetained.reduce((s, r) => s + (r.amount || 0), 0);
  const refundedTotal = rasRefunded.reduce((s, r) => s + (r.amount || 0), 0);
  const netRetained = retainedTotal - refundedTotal;

  console.log('\n================ E. ADELANTOS POR CANCELACIONES (retained_advances) ================');
  console.log(`Retenidos (en caja) : S/ ${r2(retainedTotal)}  (${rasRetained.length} registros)`);
  console.log(`Devueltos al cliente: S/ ${r2(refundedTotal)}  (${rasRefunded.length} registros)`);
  console.log(`NETO retenido       : S/ ${r2(netRetained)}`);

  // Métodos de los retenidos (para saber si Yape o efectivo)
  const raByMethod = {};
  for (const ra of ras) {
    const meth = normMethod(ra.payment_method);
    const key = `${meth}/${ra.status}`;
    raByMethod[key] = (raByMethod[key] || 0) + (ra.amount || 0);
  }
  console.log(`Por método/status:`, JSON.stringify(Object.fromEntries(Object.entries(raByMethod).map(([k, v]) => [k, r2(v)]))));

  // Cruce: canceladas con adelanto sin registro en retained_advances
  const raByBooking = {};
  for (const ra of ras) {
    raByBooking[ra.booking_id] = (raByBooking[ra.booking_id] || 0) + (ra.amount || 0);
  }
  const cancelSinRegistro = cancelled.filter((b) => (b.advance_amount || 0) > 0 && !raByBooking[b.id]);
  const cancelConRegistro = cancelled.filter((b) => (b.advance_amount || 0) > 0 && raByBooking[b.id]);
  const sumCancelSin = cancelSinRegistro.reduce((s, b) => s + (b.advance_amount || 0), 0);
  console.log(`\nReservas CANCELADAS con adelanto: ${cancelConRegistro.length} con registro / ${cancelSinRegistro.length} SIN registro en retained_advances`);
  if (cancelSinRegistro.length > 0) {
    console.log(`  ⚠ S/ ${r2(sumCancelSin)} en adelantos de canceladas sin clasificar (¿retenido o devuelto?):`);
    for (const b of cancelSinRegistro.slice(0, 15)) {
      console.log(`   id=${b.id} date=${b.date} advance=${b.advance_amount} method=${b.payment_method || '?'} user=${b.user_name || b.user_id || '?'}`);
    }
  }
  // Registro cuya reserva no está cancelada
  const raBookingNotCancelled = ras.filter((ra) => ra.booking_id && bookingIds.has(ra.booking_id) && !cancelled.find((b) => b.id === ra.booking_id));
  if (raBookingNotCancelled.length > 0) {
    console.log(`  ⚠ ${raBookingNotCancelled.length} registros de retained_advances cuya reserva NO está cancelada:`);
    for (const ra of raBookingNotCancelled.slice(0, 10)) {
      const b = bookings.find((x) => x.id === ra.booking_id);
      console.log(`   ra=${ra.id} booking=${ra.booking_id} statusReserva=${b?.status} amount=${ra.amount} raStatus=${ra.status}`);
    }
  }

  // Detalle completo de registros
  console.log(`\nDetalle retained_advances (${ras.length}):`);
  for (const ra of ras) {
    console.log(`   ${ra.status.padEnd(9)} S/${String(r2(ra.amount || 0)).padStart(8)} method=${String(ra.payment_method || '?').padEnd(9)} fechaReserva=${ra.booking_date || '?'} user=${ra.user_name || '?'} created=${tsToStr(ra.created_at)}`);
  }

  // ============ F. EGRESOS Y BALANCE ============
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const effectiveIncome = totalIncome + retainedTotal - refundedTotal;
  const balance = effectiveIncome - totalExpenses;
  console.log('\n================ F. BALANCE (dinero en caja, criterio del panel) ================');
  console.log(`+ Ingresos por servicios : S/ ${r2(totalIncome)}`);
  console.log(`+ Adelantos retenidos    : S/ ${r2(retainedTotal)}`);
  console.log(`- Devueltos al cliente   : S/ ${r2(refundedTotal)}`);
  console.log(`- Egresos                : S/ ${r2(totalExpenses)}  (${expenses.length} registros)`);
  console.log(`= BALANCE EN CAJA        : S/ ${r2(balance)}`);
  const expByCat = {};
  for (const e of expenses) expByCat[e.category || '?'] = (expByCat[e.category || '?'] || 0) + (e.amount || 0);
  console.log(`Egresos por categoría:`, JSON.stringify(Object.fromEntries(Object.entries(expByCat).map(([k, v]) => [k, r2(v)]))));

  // ============ G. INTEGRIDAD DE DATOS ============
  console.log('\n================ G. INTEGRIDAD / HALLAZGOS ================');
  // reservas con advance > total
  const advGT = bookings.filter((b) => (b.advance_amount || 0) > (b.total_price || 0) + 0.01 && b.status !== 'cancelled');
  console.log(`Reservas con advance_amount > total_price: ${advGT.length}`);
  for (const b of advGT.slice(0, 10)) console.log(`   id=${b.id} status=${b.status} total=${b.total_price} advance=${b.advance_amount} date=${b.date}`);
  // completadas con remaining > 0
  const compWithRem = completed.filter((b) => (b.remaining_amount || 0) > 0.01);
  console.log(`Completadas con remaining_amount > 0: ${compWithRem.length}`);
  for (const b of compWithRem.slice(0, 10)) console.log(`   id=${b.id} total=${b.total_price} advance=${b.advance_amount} remaining=${b.remaining_amount}`);
  // reservadas con remaining incoherente
  const resRemBad = reserved.filter((b) => r2((b.advance_amount || 0) + (b.remaining_amount || 0)) !== r2(b.total_price || 0));
  console.log(`Reservadas donde advance+remaining ≠ total: ${resRemBad.length}`);
  for (const b of resRemBad.slice(0, 10)) console.log(`   id=${b.id} total=${b.total_price} advance=${b.advance_amount} remaining=${b.remaining_amount} method=${b.payment_method}`);
  // payment_pending (adelantos declarados por validar)
  const sumPayPending = payPending.reduce((s, b) => s + (b.advance_amount || 0), 0);
  console.log(`payment_pending (pago declarado por validar): ${payPending.length} reservas → S/ ${r2(sumPayPending)}`);
  for (const b of payPending.slice(0, 10)) console.log(`   id=${b.id} date=${b.date} advance=${b.advance_amount} method=${b.payment_method} user=${b.user_name || '?'}`);

  console.log('\n================ RESUMEN EJECUTIVO ================');
  console.log(JSON.stringify({
    ingresosTotales: r2(totalIncome),
    serviciosCompletados: r2(completedIncome),
    adelantosActivos: r2(reservedAdvances),
    yapePlin_reservas: r2(yapePlin),
    efectivo_reservas: r2(efectivo),
    cobradoDigital_payments: r2((byMethodPayments['YAPE'] || 0) + (byMethodPayments['PLIN'] || 0)),
    cobradoEfectivo_payments: r2(byMethodPayments['EFECTIVO'] || 0),
    totalCobrado_payments: r2(payTotalCompleted),
    adelantosPorCancelaciones: r2(retainedTotal + refundedTotal),
    retenidosEnCaja: r2(retainedTotal),
    devueltosAlCliente: r2(refundedTotal),
    netoRetenido: r2(netRetained),
    egresos: r2(totalExpenses),
    balanceEnCaja: r2(balance),
    hallazgos: {
      reservasMixtoSinDesglose: mixtoSinBreakdown,
      reservasConDiferenciaPagos: mismatches.length,
      pagosHuerfanos: orphans.length,
      canceladasSinRegistroAdelanto: cancelSinRegistro.length,
      pagosPorValidar: declaredPending.length,
    },
  }, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error('FATAL:', e); process.exit(1); });
