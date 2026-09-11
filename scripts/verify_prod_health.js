// ============================================================
// VERIFICACIÓN DE SALUD — CREARD en producción
// Contexto: (1) error 401 reportado por el usuario (raíz: cuota
// Firestore agotada, ya reparado); (2) aviso de Firebase sobre
// "secretos de base de datos heredados" — verificamos que toda
// la cadena de auth funciona SOLO con Admin SDK + cookie sesión.
// ============================================================
const BASE = 'https://creard.vercel.app';
const ADMIN_EMAIL = process.env.CREARD_ADMIN_EMAIL || 'admin@creard.com';
const ADMIN_PASSWORD = process.env.CREARD_ADMIN_PASSWORD || 'admin123';

let COOKIE = '';

async function check(name, path, { expect = 200, withCookie = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (withCookie && COOKIE) headers.Cookie = COOKIE;
  const t0 = Date.now();
  const res = await fetch(`${BASE}${path}`, { headers });
  const ms = Date.now() - t0;
  const ok = res.status === expect;
  const tag = ok ? 'OK ' : 'FALLA';
  console.log(`[${tag}] ${name} → HTTP ${res.status} (${ms} ms) — esperado ${expect}`);
  if (!ok) {
    const body = await res.text().catch(() => '');
    console.log(`        cuerpo: ${body.slice(0, 300)}`);
  }
  return { status: res.status, ok };
}

async function main() {
  console.log('=== 0. Anónimo (sin cookie) — debe dar 401 correcto ===');
  await check('GET /api/bookings anónimo', '/api/bookings?dateFrom=2026-01-01&dateTo=2026-12-31', { expect: 401, withCookie: false });

  console.log('\n=== 1. Login admin ===');
  const loginRes = await fetch(`${BASE}/api/auth?action=login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const loginData = await loginRes.json().catch(() => ({}));
  console.log(`Login → HTTP ${loginRes.status} ${loginRes.ok ? `— ${loginData.user?.email} (${loginData.user?.role})` : JSON.stringify(loginData).slice(0, 200)}`);
  if (!loginRes.ok) process.exit(1);
  const setCookies = typeof loginRes.headers.getSetCookie === 'function' ? loginRes.headers.getSetCookie() : [loginRes.headers.get('set-cookie')];
  for (const sc of setCookies) {
    const tok = String(sc || '').split(';')[0];
    if (tok.startsWith('creard_session=')) COOKIE = tok;
  }
  if (!COOKIE) { console.log('FALLA: no se recibió cookie creard_session'); process.exit(1); }
  console.log('Cookie creard_session recibida (auth por Admin SDK + Firestore user_sessions).');

  console.log('\n=== 2. Endpoints que fallaban con 401 / usados por pestaña Clientes ===');
  await check('GET /api/bookings (rango completo pestaña Clientes)', '/api/bookings?dateFrom=2024-01-01&dateTo=2027-12-31');
  await check('GET /api/stats', '/api/stats');
  await check('GET /api/retained-advances', '/api/retained-advances');
  await check('GET /api/client-settings', '/api/client-settings');
  await check('GET /api/payments-pending-count', '/api/payments-pending-count');

  console.log('\n=== 3. Módulos existentes (no deben romperse) ===');
  await check('GET /api/expenses', '/api/expenses');
  await check('GET /api/payments-list', '/api/payments-list');
  await check('GET /api/courts', '/api/courts');

  console.log('\nVerificación completa.');
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
