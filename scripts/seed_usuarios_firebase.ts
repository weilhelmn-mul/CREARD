// ============================================================
// CREARD - Seed de usuarios de prueba en Firebase Auth + Firestore
// Uso: bun run scripts/seed_usuarios_firebase.ts
// Carga credenciales desde .env.local (nunca hardcodear secretos)
// ============================================================
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // .env como respaldo

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID || '',
  private_key_id: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID || '',
  private_key: (process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL || '',
  client_id: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_ID || '',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
};

if (!serviceAccount.private_key.includes('BEGIN')) {
  console.error('ERROR: FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY no disponible en .env.local');
  process.exit(1);
}

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount as Parameters<typeof cert>[0]) });
}

const auth = getAuth();
const db = getFirestore();

interface SeedUser {
  email: string;
  password: string;
  displayName: string;
  role: 'admin' | 'user';
  phone: string | null;
}

const USERS: SeedUser[] = [
  {
    email: 'admin@creard.com',
    password: 'admin123',
    displayName: 'Administrador CREARD',
    role: 'admin',
    phone: '+51 984 000 001',
  },
  {
    email: 'carlos@email.com',
    password: 'user123',
    displayName: 'Carlos Cliente',
    role: 'user',
    phone: '+51 984 000 002',
  },
];

async function inspect() {
  console.log('\n== ESTADO ACTUAL DE FIRESTORE ==');
  for (const col of ['users', 'courts', 'branches', 'bookings', 'expenses', 'settings']) {
    try {
      const snap = await db.collection(col).count().get();
      console.log(`  ${col}: ${snap.data().count} documentos`);
    } catch {
      console.log(`  ${col}: (sin acceso o no existe)`);
    }
  }
}

async function seedUser(u: SeedUser) {
  console.log(`\n-- Procesando ${u.email} --`);
  let uid: string;

  // 1. Firebase Auth
  try {
    const existing = await auth.getUserByEmail(u.email);
    uid = existing.uid;
    console.log(`   Auth: ya existe (uid=${uid})`);
  } catch {
    const created = await auth.createUser({
      email: u.email,
      password: u.password,
      displayName: u.displayName,
    });
    uid = created.uid;
    console.log(`   Auth: usuario CREADO (uid=${uid})`);
  }

  // 2. Custom claims (rol y estado) para el middleware del servidor
  await auth.setCustomUserClaims(uid, { role: u.role, status: 'approved' });
  console.log(`   Claims: role=${u.role}, status=approved`);

  // 3. Documento de perfil en Firestore (colección users)
  const ref = db.collection('users').doc(uid);
  const doc = await ref.get();
  if (doc.exists) {
    await ref.update({
      name: u.displayName,
      role: u.role,
      status: 'approved',
      is_active: true,
      updated_at: Timestamp.now(),
    });
    console.log('   Firestore: perfil ACTUALIZADO');
  } else {
    await ref.set({
      id: uid,
      name: u.displayName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: 'approved',
      is_active: true,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    });
    console.log('   Firestore: perfil CREADO');
  }
}

async function main() {
  await inspect();
  for (const u of USERS) {
    await seedUser(u);
  }
  console.log('\n== VERIFICACION FINAL ==');
  for (const u of USERS) {
    const rec = await auth.getUserByEmail(u.email);
    const profile = await db.collection('users').doc(rec.uid).get();
    console.log(
      `  ${u.email}: auth=OK, perfil=${profile.exists ? 'OK' : 'FALTA'}, claims=${JSON.stringify(rec.customClaims)}`
    );
  }
  console.log('\nSeed completado.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  });
