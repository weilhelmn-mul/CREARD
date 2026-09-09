/**
 * Audita usuarios: Firebase Auth vs Firestore
 * Detecta cuentas que existen en uno pero no en el otro (causa tipica de
 * "ha fallado el login" tras activar verificacion de password server-side).
 *
 * Uso: npx tsx scripts/audit_users.ts
 */
import * as fs from 'fs';
import * as path from 'path';

// Cargar .env.local manualmente
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

async function main() {
  const { adminAuth, getAdminDb } = await import('../src/lib/firebase-admin');

  // 1. Usuarios de Firebase Auth
  const authUsers: { uid: string; email: string; created: string; disabled: boolean }[] = [];
  let pageToken: string | undefined;
  do {
    const list = await adminAuth.listUsers(1000, pageToken);
    for (const u of list.users) {
      authUsers.push({
        uid: u.uid,
        email: u.email || '(sin email)',
        created: u.metadata.creationTime,
        disabled: u.disabled,
      });
    }
    pageToken = list.pageToken;
  } while (pageToken);

  // 2. Documentos de Firestore users
  const snap = await getAdminDb().collection('users').get();
  const fsUsers: { uid: string; email: string; role: string; status: string; name: string }[] = [];
  snap.forEach((d) => {
    const v = d.data();
    fsUsers.push({
      uid: d.id,
      email: v.email || '(sin email)',
      role: v.role || '(sin rol)',
      status: v.status || '(sin status)',
      name: v.name || v.displayName || '',
    });
  });

  const authByEmail = new Map(authUsers.map((u) => [u.email.toLowerCase(), u]));
  const fsByEmail = new Map(fsUsers.map((u) => [u.email.toLowerCase(), u]));

  console.log(`\n=== FIREBASE AUTH (${authUsers.length} usuarios) ===`);
  for (const u of authUsers) {
    const fsu = fsByEmail.get(u.email.toLowerCase());
    console.log(
      `- ${u.email} | uid=${u.uid.slice(0, 10)}… | auth_disabled=${u.disabled} | firestore=${fsu ? `role=${fsu.role} status=${fsu.status}` : '*** SIN DOC ***'}`
    );
  }

  console.log(`\n=== FIRESTORE users (${fsUsers.length} docs) ===`);
  for (const u of fsUsers) {
    const au = authByEmail.get(u.email.toLowerCase());
    console.log(
      `- ${u.email} | role=${u.role} status=${u.status} | firebase_auth=${au ? 'OK' : '*** NO EXISTE (login fallara 401) ***'}`
    );
  }

  // 3. Sospechosos tipicos del propietario
  console.log('\n=== BUSQUEDA: weilhelmn / admin ===');
  for (const u of authUsers) {
    if (u.email.includes('weilhelmn') || u.email.includes('admin')) console.log(`AUTH: ${u.email} uid=${u.uid}`);
  }
  for (const u of fsUsers) {
    if (u.email.includes('weilhelmn') || u.email.includes('admin')) console.log(`FS:   ${u.email} role=${u.role} status=${u.status}`);
  }

  // 4. Sesiones activas
  const sess = await getAdminDb().collection('user_sessions').get();
  console.log(`\n=== SESIONES server-side activas: ${sess.size} ===`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  });
