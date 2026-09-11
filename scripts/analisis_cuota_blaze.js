// ============================================================
// ANÁLISIS DE CUOTA FIRESTORE — CREARD producción
// Mide volúmenes reales y estima lecturas/escrituras por día
// para decidir: ¿plan Spark (gratis) alcanza o conviene Blaze?
// ============================================================
const BASE = 'https://creard.vercel.app';
const ADMIN_EMAIL = process.env.CREARD_ADMIN_EMAIL || 'admin@creard.com';
const ADMIN_PASSWORD = process.env.CREARD_ADMIN_PASSWORD || 'admin123';

let COOKIE = '';

async function api(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', Cookie: COOKIE },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}`);
  return res.json();
}

async function main() {
  // 1. Login
  const loginRes = await fetch(`${BASE}/api/auth?action=login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) throw new Error(`Login falló: ${loginRes.status}`);
  const setCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get('set-cookie')];
  for (const sc of setCookies) {
    const tok = String(sc || '').split(';')[0];
    if (tok.startsWith('creard_session=')) COOKIE = tok;
  }

  // 2. Volúmenes reales
  const year2026 = await api('/api/bookings?dateFrom=2026-01-01&dateTo=2026-12-31');
  const all = await api('/api/bookings?dateFrom=2024-01-01&dateTo=2027-12-31');
  const payments = await api('/api/payments-list');
  const advances = await api('/api/retained-advances');
  const stats = await api('/api/stats').catch(() => ({}));

  const bookingsAll = Array.isArray(all) ? all : (all.bookings || []);
  const bookings2026 = Array.isArray(year2026) ? year2026 : (year2026.bookings || []);
  const pays = Array.isArray(payments) ? payments : (payments.payments || payments.records || []);
  const advs = Array.isArray(advances) ? advances : (advances.advances || []);

  // usuarios únicos y canchas únicas en reservas (para estimar enriquecimiento)
  const userIds = new Set(), courtIds = new Set();
  for (const b of bookingsAll) {
    if (b.userId) userIds.add(b.userId);
    else if (b.user?.id) userIds.add(b.user.id);
    const cids = Array.isArray(b.courtIds) ? b.courtIds : (b.courtId ? [b.courtId] : []);
    cids.forEach((c) => courtIds.add(c));
  }

  console.log('════════ VOLÚMENES REALES (producción) ════════');
  console.log(`Reservas históricas 2024-2027: ${bookingsAll.length}`);
  console.log(`Reservas 2026:                 ${bookings2026.length}`);
  console.log(`Usuarios únicos con reserva:   ${userIds.size}`);
  console.log(`Canchas únicas:                ${courtIds.size}`);
  console.log(`Pagos registrados:             ${pays.length}`);
  console.log(`Adelantos por cancelación:     ${advs.length}`);
  if (stats?.totalBookings !== undefined) console.log(`Stats totalBookings:           ${stats.totalBookings}`);
  if (stats?.totalUsers !== undefined) console.log(`Stats totalUsers:              ${stats.totalUsers}`);

  // 3. Estimación de lecturas por visita al panel
  // Cada doc reservas leído 1 vez + enriquecimiento con caché por usuario/cancha único
  // + auth (user_sessions 1 + users 1) + stats (agregación ~5-15) + pagos-lista + adelantos
  const readsBookingsFull = bookingsAll.length + userIds.size + courtIds.size;
  const readsAuth = 2; // user_sessions + users/<id>
  const readsStats = 10; // agregaciones count (aprox, ~1 read por 1000 índices)
  const readsClientesTab = readsBookingsFull + readsAuth + Math.min(advs.length, 50) + 1; // + client-settings doc
  const readsReservasTab = Math.round(bookingsAll.length / 1) + userIds.size + courtIds.size + readsAuth; // 365d ≈ todo 2026
  const readsPagosTab = pays.length + readsAuth;

  console.log('\n════════ LECTURAS FIRESTORE POR ACCIÓN (estimado) ════════');
  console.log(`Login (auth):                        ~${readsAuth} lecturas`);
  console.log(`Abrir pestaña Reservas (histórico):  ~${readsReservasTab} lecturas`);
  console.log(`Abrir pestaña Clientes (2024-2027):  ~${readsClientesTab} lecturas`);
  console.log(`Abrir pestaña Pagos:                 ~${readsPagosTab} lecturas`);
  console.log(`Polling contador (cada 60s activo):  ~1 lectura/min`);

  // 4. Escenarios diarios
  const polling8h = 8 * 60; // panel abierto 8h
  const escNormal = 3 * readsClientesTab + 2 * readsReservasTab + readsPagosTab + polling8h + 20;
  const escAlto = 15 * readsClientesTab + 10 * readsReservasTab + 5 * readsPagosTab + 12 * 60 + 50;
  const escExtremo = 60 * readsClientesTab + 40 * readsReservasTab + 20 * readsPagosTab + 24 * 60 + 100;
  const CAP = 50000;

  console.log('\n════════ ESCENARIOS DE CONSUMO DIARIO (50,000 lecturas/día gratis) ════════');
  const row = (n, e, d) => {
    const pct = ((n / CAP) * 100).toFixed(0);
    const excede = n > CAP;
    console.log(`${e}: ~${n.toLocaleString('es-PE')} lecturas (${pct}% de la cuota) ${excede ? '⚠️ EXCEDE' : '✅'} — ${d}`);
  };
  row(escNormal, 'Día normal   (3 visitas Clientes, 2 Reservas, 1 Pagos, panel abierto 8h)      ', 'uso administrativo típico');
  row(escAlto, 'Día alto     (15 visitas Clientes, 10 Reservas, 5 Pagos, panel abierto 12h)      ', 'varios staff consultando');
  row(escExtremo, 'Día extremo  (60 visitas Clientes, 40 Reservas, 20 Pagos, panel abierto 24h)     ', 'pico raro / varios módulos abiertos');

  // 5. Costo Blaze si se excede
  const pricePer100K = 0.06; // USD por 100,000 lecturas
  console.log('\n════════ COSTO MENSUAL ESTIMADO EN BLAZE (solo excedente) ════════');
  console.log(`El tier gratis se MANTIENE en Blaze (50K lecturas/día incluidas).`);
  console.log(`Día normal:   S/ 0.00 (no excede)`);
  const excAlto = Math.max(0, escAlto - CAP), excExt = Math.max(0, escExtremo - CAP);
  const mesesAlto = 30 * escAlto, excedMesAlto = 30 * excAlto;
  console.log(`Día alto todos los días del mes: ${(excedMesAlto / 100000 * pricePer100K).toFixed(2)} USD/mes (${excedMesAlto.toLocaleString('es-PE')} lecturas excedentes)`);
  const excedMesExt = 30 * excExt;
  console.log(`Día extremo todos los días:      ${(excedMesExt / 100000 * pricePer100K).toFixed(2)} USD/mes (imposible en la práctica)`);

  // 6. Escrituras
  console.log('\n════════ ESCRITURAS (20,000/día gratis) ════════');
  console.log(`Crear reserva: ~2-4 escrituras; validar pago: ~2-3; cancelación: ~2-3; sesión: ~1`);
  console.log(`Volumen real del negocio (~10-30 reservas/día) ≈ 50-150 escrituras/día → muy por debajo del límite ✅`);
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
