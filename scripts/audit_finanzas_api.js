// ============================================================
// AUDITORÍA FINANCIERA CREARD — vía API de producción
// https://creard.vercel.app  (sesión admin)
// Audita: Ingresos Totales, Yape/Plin, Efectivo,
//         Adelantos por Cancelaciones, Retenidos, Devueltos
// ============================================================
const BASE = 'https://creard.vercel.app';
const ADMIN_EMAIL = process.env.CREARD_ADMIN_EMAIL || 'admin@creard.com';
const ADMIN_PASSWORD = process.env.CREARD_ADMIN_PASSWORD || 'admin123';

const r2 = (n) => Math.round((n || 0) * 100) / 100;

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

let COOKIE = '';

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Cookie: COOKIE, ...(opts.headers || {}) },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error(`AUTH FAIL ${res.status} en ${path}`);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}: ${JSON.stringify(data).slice(0, 200)}`);
  return data;
}

async function main() {
  // ---------- 1. Login ----------
  const loginRes = await fetch(`${BASE}/api/auth?action=login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const loginData = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) throw new Error(`Login falló: ${loginRes.status} ${JSON.stringify(loginData).slice(0, 200)}`);
  const setCookies = typeof loginRes.headers.getSetCookie === 'function' ? loginRes.headers.getSetCookie() : [loginRes.headers.get('set-cookie')];
  for (const sc of setCookies) {
    const tok = sc.split(';')[0];
    if (tok.startsWith('creard_session=')) COOKIE = tok;
  }
  if (!COOKIE) throw new Error('No se recibió cookie creard_session');
  console.error(`Login OK: ${loginData.user?.email} (${loginData.user?.role})`);

  // ---------- 2. Descargar datos ----------
  const dFrom = '2024-01-01', dTo = '2027-12-31';
  const [bookings, stats, raData, expensesRaw, paymentsRaw] = await Promise.all([
    api(`/api/bookings?dateFrom=${dFrom}&dateTo=${dTo}`),
    api('/api/stats'),
    api('/api/retained-advances'),
    api('/api/expenses'),
    api('/api/payments-list'),
  ]);

  const bookingsArr = Array.isArray(bookings) ? bookings : (bookings.bookings || []);
  const advances = Array.isArray(raData) ? raData : (raData.advances || []);
  const expenses = Array.isArray(expensesRaw) ? expensesRaw : (expensesRaw.expenses || []);
  let payments = Array.isArray(paymentsRaw) ? paymentsRaw : (paymentsRaw.payments || paymentsRaw.records || []);
  console.error(`Datos: ${bookingsArr.length} reservas, ${payments.length} pagos, ${advances.length} adelantos, ${expenses.length} egresos`);

  // Normalizar campos de payments (snake o camel)
  payments = payments.map((p) => ({
    id: p.id || p.payment_id,
    bookingId: p.booking_id || p.bookingId || null,
    amount: p.amount || p.amount_paid || 0,
    type: p.type || p.payment_type || '?',
    method: p.method || p.payment_method || '',
    status: p.status || p.payment_status || '?',
    createdAt: p.created_at || p.createdAt || null,
    userName: p.user_name || p.user_name || p.userName || null,
    date: p.booking_date || p.payment_date || null,
  }));

  const bookingIds = new Set(bookingsArr.map((b) => b.id));

  // ============ A. INGRESOS TOTALES (criterio panel Finanzas) ============
  const completed = bookingsArr.filter((b) => b.status === 'completed');
  const reserved = bookingsArr.filter((b) => b.status === 'reserved');
  const cancelled = bookingsArr.filter((b) => b.status === 'cancelled');
  const payPending = bookingsArr.filter((b) => b.status === 'payment_pending');
  const awaiting = bookingsArr.filter((b) => b.status === 'awaiting_payment');

  const completedIncome = completed.reduce((s, b) => s + (b.advanceAmount || 0), 0);
  const reservedAdvances = reserved.reduce((s, b) => s + (b.advanceAmount || 0), 0);
  const totalIncome = completedIncome + reservedAdvances;

  console.log('================ A. INGRESOS TOTALES (criterio panel Finanzas) ================');
  console.log(`Reservas COMPLETADAS: ${completed.length} → S/ ${r2(completedIncome)} (advance_amount = pagado)`);
  console.log(`Reservas RESERVADAS : ${reserved.length} → S/ ${r2(reservedAdvances)} (adelantos activos)`);
  console.log(`INGRESOS TOTALES    : S/ ${r2(totalIncome)}`);
  console.log(`(No cuentan: payment_pending=${payPending.length}, awaiting_payment=${awaiting.length}, cancelled=${cancelled.length})`);
  console.log(`Nota: /api/stats reporta totalRevenue=S/ ${r2(stats.totalRevenue)} (usa total_price en completadas — criterio distinto al panel Finanzas)`);

  // ============ B. DESGLOSE POR MÉTODO (fuente: reservas) ============
  const byMethodBookings = {};
  let mixtoSinBreakdown = 0;
  const mixtoSinBreakdownList = [];
  for (const b of [...completed, ...reserved]) {
    const paid = b.advanceAmount || 0;
    const pm = normMethod(b.paymentMethod);
    if (pm === 'MIXTO') {
      const bd = b.paymentBreakdown;
      if (bd && ((bd.efectivo || 0) > 0 || (bd.digital || 0) > 0)) {
        const digM = normMethod(bd.digitalMethod || 'YAPE');
        byMethodBookings['EFECTIVO'] = (byMethodBookings['EFECTIVO'] || 0) + (bd.efectivo || 0);
        byMethodBookings[digM] = (byMethodBookings[digM] || 0) + (bd.digital || 0);
      } else {
        mixtoSinBreakdown++;
        mixtoSinBreakdownList.push({ id: b.id, date: b.date, paid: r2(paid) });
        byMethodBookings['MIXTO_SIN_DESGLOSE'] = (byMethodBookings['MIXTO_SIN_DESGLOSE'] || 0) + paid;
      }
    } else {
      byMethodBookings[pm] = (byMethodBookings[pm] || 0) + paid;
    }
  }
  const sumBookings = Object.values(byMethodBookings).reduce((s, v) => s + v, 0);

  console.log('\n================ B. DESGLOSE POR MÉTODO (fuente: reservas completadas+activas) ================');
  for (const [k, v] of Object.entries(byMethodBookings).sort((a, b2) => b2[1] - a[1])) {
    console.log(`  ${k.padEnd(20)} S/ ${r2(v)}`);
  }
  console.log(`  SUMA                S/ ${r2(sumBookings)} ${r2(sumBookings) === r2(totalIncome) ? '✔ cuadra' : '⚠ NO cuadra con Ingresos Totales'}`);
  if (mixtoSinBreakdown > 0) console.log(`  ⚠ MIXTO sin desglose:`, JSON.stringify(mixtoSinBreakdownList));

  const yapePlinReservas = (byMethodBookings['YAPE'] || 0) + (byMethodBookings['PLIN'] || 0);
  const efectivoReservas = byMethodBookings['EFECTIVO'] || 0;
  console.log(`\n  ► Yape + Plin: S/ ${r2(yapePlinReservas)}   ► Efectivo: S/ ${r2(efectivoReservas)}`);

  // ============ C. DESGLOSE POR MÉTODO (fuente: pagos registrados) ============
  const byMethodPayments = {};
  const byTypePayments = {};
  const byStatusPayments = {};
  let payTotalCompleted = 0;
  for (const p of payments) {
    byStatusPayments[p.status] = (byStatusPayments[p.status] || 0) + p.amount;
    if (p.status === 'completed') {
      const meth = normMethod(p.method);
      byMethodPayments[meth] = (byMethodPayments[meth] || 0) + p.amount;
      byTypePayments[p.type] = (byTypePayments[p.type] || 0) + p.amount;
      payTotalCompleted += p.amount;
    }
  }
  console.log('\n================ C. PAGOS REGISTRADOS status=completed (payments-list) ================');
  for (const [k, v] of Object.entries(byMethodPayments).sort((a, b2) => b2[1] - a[1])) {
    console.log(`  ${k.padEnd(20)} S/ ${r2(v)}`);
  }
  console.log(`  TOTAL cobrado       S/ ${r2(payTotalCompleted)}`);
  console.log(`  Por tipo:`, JSON.stringify(Object.fromEntries(Object.entries(byTypePayments).map(([k, v]) => [k, r2(v)]))));
  console.log(`  Todos los status:`, JSON.stringify(Object.fromEntries(Object.entries(byStatusPayments).map(([k, v]) => [k, r2(v)]))));

  // ============ D. CONCILIACIÓN reservas vs pagos ============
  const payByBooking = {};
  for (const p of payments) {
    if (p.bookingId && p.status === 'completed') payByBooking[p.bookingId] = (payByBooking[p.bookingId] || 0) + p.amount;
  }
  const mismatches = [];
  for (const b of bookingsArr) {
    if (!['reserved', 'completed', 'cancelled', 'payment_pending'].includes(b.status)) continue;
    const expected = b.advanceAmount || 0;
    const actual = payByBooking[b.id] || 0;
    if (r2(expected) !== r2(actual)) {
      mismatches.push({ id: b.id, date: b.date, status: b.status, advance: r2(expected), pagos: r2(actual), diff: r2(expected - actual) });
    }
  }
  console.log('\n================ D. CONCILIACIÓN advanceAmount vs pagos completados ================');
  console.log(`Reservas con diferencia: ${mismatches.length}`);
  for (const m of mismatches.slice(0, 25)) console.log('  ', JSON.stringify(m));
  if (mismatches.length > 25) console.log(`   ... y ${mismatches.length - 25} más`);

  const orphans = payments.filter((p) => !p.bookingId || !bookingIds.has(p.bookingId));
  const orphanSum = orphans.reduce((s, p) => s + p.amount, 0);
  console.log(`\nPagos huérfanos (sin reserva válida): ${orphans.length} → S/ ${r2(orphanSum)}`);
  for (const o of orphans.slice(0, 15)) {
    console.log(`   ${o.status.padEnd(9)} S/${String(r2(o.amount)).padStart(8)} method=${o.method} type=${o.type} date=${o.date} user=${o.userName || '?'}`);
  }

  const declaredPending = payments.filter((p) => p.status === 'pending');
  console.log(`Pagos declarados por validar: ${declaredPending.length} → S/ ${r2(declaredPending.reduce((s, p) => s + p.amount, 0))}`);

  // ============ E. ADELANTOS POR CANCELACIONES ============
  const rasRetained = advances.filter((ra) => ra.status === 'retained');
  const rasRefunded = advances.filter((ra) => ra.status === 'refunded');
  const retainedTotal = rasRetained.reduce((s, r) => s + (r.amount || 0), 0);
  const refundedTotal = rasRefunded.reduce((s, r) => s + (r.amount || 0), 0);
  const netRetained = retainedTotal - refundedTotal;

  console.log('\n================ E. ADELANTOS POR CANCELACIONES ================');
  console.log(`Adelantos por cancelaciones (total): S/ ${r2(retainedTotal + refundedTotal)}`);
  console.log(`Retenidos (en caja) : S/ ${r2(retainedTotal)} (${rasRetained.length} registros)`);
  console.log(`Devueltos al cliente: S/ ${r2(refundedTotal)} (${rasRefunded.length} registros)`);
  console.log(`NETO retenido       : S/ ${r2(netRetained)}`);

  const raByMethodStatus = {};
  for (const ra of advances) {
    const k = `${normMethod(ra.paymentMethod)}/${ra.status}`;
    raByMethodStatus[k] = (raByMethodStatus[k] || 0) + (ra.amount || 0);
  }
  console.log(`Por método/status:`, JSON.stringify(Object.fromEntries(Object.entries(raByMethodStatus).map(([k, v]) => [k, r2(v)]))));

  const raByBooking = {};
  for (const ra of advances) raByBooking[ra.bookingId] = (raByBooking[ra.bookingId] || 0) + (ra.amount || 0);
  const cancelSinRegistro = cancelled.filter((b) => (b.advanceAmount || 0) > 0 && !raByBooking[b.id]);
  const sumCancelSin = cancelSinRegistro.reduce((s, b) => s + (b.advanceAmount || 0), 0);
  const cancelConRegistro = cancelled.filter((b) => (b.advanceAmount || 0) > 0 && raByBooking[b.id]);
  console.log(`\nCanceladas con adelanto: ${cancelConRegistro.length} con registro / ${cancelSinRegistro.length} SIN registro en retained_advances`);
  if (cancelSinRegistro.length > 0) {
    console.log(`  ⚠ S/ ${r2(sumCancelSin)} sin clasificar (¿retenido o devuelto?):`);
    for (const b of cancelSinRegistro.slice(0, 15)) {
      console.log(`   id=${b.id} date=${b.date} advance=${r2(b.advanceAmount)} method=${b.paymentMethod || '?'} user=${b.user?.name || b.userId || '?'}`);
    }
  }
  const raNotCancelled = advances.filter((ra) => ra.bookingId && bookingIds.has(ra.bookingId) && !cancelled.find((b) => b.id === ra.bookingId));
  if (raNotCancelled.length > 0) {
    console.log(`  ⚠ ${raNotCancelled.length} registros retained_advances cuya reserva NO está cancelada:`);
    for (const ra of raNotCancelled.slice(0, 10)) {
      const b = bookingsArr.find((x) => x.id === ra.bookingId);
      console.log(`   booking=${ra.bookingId} statusReserva=${b?.status} S/=${ra.amount} raStatus=${ra.status}`);
    }
  }
  // Registro huérfano de retained_advances
  const raOrphan = advances.filter((ra) => ra.bookingId && !bookingIds.has(ra.bookingId));
  if (raOrphan.length > 0) console.log(`  ⚠ ${raOrphan.length} registros retained_advances con reserva inexistente: ${raOrphan.map((r) => r.bookingId).join(', ')}`);

  console.log(`\nDetalle registros (${advances.length}):`);
  for (const ra of advances) {
    console.log(`   ${String(ra.status).padEnd(9)} S/${String(r2(ra.amount)).padStart(8)} method=${String(ra.paymentMethod || '?').padEnd(9)} fechaReserva=${ra.bookingDate || '?'} user=${ra.userName || '?'} motivo=${ra.reason || ''}`);
  }

  // ============ F. EGRESOS Y BALANCE ============
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const effectiveIncome = totalIncome + retainedTotal - refundedTotal;
  const balance = effectiveIncome - totalExpenses;
  console.log('\n================ F. BALANCE (dinero en caja, criterio del panel) ================');
  console.log(`+ Ingresos por servicios : S/ ${r2(totalIncome)}`);
  console.log(`+ Adelantos retenidos    : S/ ${r2(retainedTotal)}`);
  console.log(`- Devueltos al cliente   : S/ ${r2(refundedTotal)}`);
  console.log(`- Egresos                : S/ ${r2(totalExpenses)} (${expenses.length} registros)`);
  console.log(`= BALANCE EN CAJA        : S/ ${r2(balance)}`);
  const expByCat = {};
  for (const e of expenses) expByCat[e.category || '?'] = (expByCat[e.category || '?'] || 0) + (e.amount || 0);
  console.log(`Egresos por categoría:`, JSON.stringify(Object.fromEntries(Object.entries(expByCat).map(([k, v]) => [k, r2(v)]))));

  // ============ G. INTEGRIDAD ============
  console.log('\n================ G. INTEGRIDAD / HALLAZGOS ================');
  const advGT = bookingsArr.filter((b) => (b.advanceAmount || 0) > (b.totalPrice || 0) + 0.01 && b.status !== 'cancelled');
  console.log(`Reservas con advanceAmount > totalPrice: ${advGT.length}`);
  for (const b of advGT.slice(0, 10)) console.log(`   id=${b.id} status=${b.status} total=${b.totalPrice} advance=${b.advanceAmount} date=${b.date}`);
  const compWithRem = completed.filter((b) => (b.remainingAmount || 0) > 0.01);
  console.log(`Completadas con remainingAmount > 0: ${compWithRem.length}`);
  for (const b of compWithRem.slice(0, 10)) console.log(`   id=${b.id} total=${b.totalPrice} advance=${b.advanceAmount} remaining=${b.remainingAmount}`);
  const resRemBad = reserved.filter((b) => r2((b.advanceAmount || 0) + (b.remainingAmount || 0)) !== r2(b.totalPrice || 0));
  console.log(`Reservadas donde advance+remaining ≠ total: ${resRemBad.length}`);
  for (const b of resRemBad.slice(0, 10)) console.log(`   id=${b.id} total=${b.totalPrice} advance=${b.advanceAmount} remaining=${b.remainingAmount} method=${b.paymentMethod}`);

  console.log('\n================ RESUMEN EJECUTIVO ================');
  console.log(JSON.stringify({
    ingresosTotales: r2(totalIncome),
    serviciosCompletados: r2(completedIncome),
    adelantosActivos: r2(reservedAdvances),
    yapePlin_reservas: r2(yapePlinReservas),
    efectivo_reservas: r2(efectivoReservas),
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

main().then(() => process.exit(0)).catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
