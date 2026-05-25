// ============================================================
// CREARD - Script de Seed para Firebase Firestore
// Ejecutar: npx tsx scripts/seed-firebase.ts
// ============================================================

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

// Cargar variables de entorno desde .env.local
function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex);
      let value = trimmed.slice(eqIndex + 1);
      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      // Replace \n with actual newlines for private key
      value = value.replace(/\\n/g, '\n');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

loadEnvFile();

// Inicializar Firebase Admin
const serviceAccount = {
  type: process.env.FIREBASE_SERVICE_ACCOUNT_TYPE || 'service_account',
  project_id: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID || '',
  private_key_id: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID || '',
  private_key: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '',
  client_email: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL || '',
  client_id: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_ID || '',
  auth_uri: process.env.FIREBASE_SERVICE_ACCOUNT_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
  token_uri: process.env.FIREBASE_SERVICE_ACCOUNT_TOKEN_URI || 'https://oauth2.googleapis.com/token',
};

if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
  console.error('ERROR: Faltan credenciales de Firebase Admin en .env.local');
  console.error('Verifica: FIREBASE_SERVICE_ACCOUNT_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY, FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL');
  process.exit(1);
}

const app = initializeApp({
  credential: cert(serviceAccount),
});
const db = getFirestore(app);
const auth = getAuth(app);

// ============================================================
// Datos de Seed
// ============================================================

interface SeedUser {
  uid: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'admin' | 'user';
}

interface SeedCourt {
  id: string;
  name: string;
  sport: 'futbol' | 'voley';
  description: string;
  branch_id: string;
  images: string[];
  price_per_hour: number;
  amenities: string[];
  is_active: boolean;
}

const SEED_BRANCH = {
  id: 'branch-sebastian-cusco',
  name: 'CREARD San Sebastian',
  address: 'Av. Bolivar C1',
  city: 'Cusco',
  phone: '+51 984 000 000',
  email: 'info@creard.pe',
  is_active: true,
};

const SEED_USERS: SeedUser[] = [
  {
    uid: 'admin-001',
    name: 'Administrador CREARD',
    email: 'admin@creard.pe',
    password: 'Admin123!',
    phone: '+51 984 111 111',
    role: 'admin',
  },
  {
    uid: 'user-carlos',
    name: 'Carlos Quispe',
    email: 'carlos@email.com',
    password: 'User123!',
    phone: '+51 984 222 222',
    role: 'user',
  },
  {
    uid: 'user-maria',
    name: 'Maria Flores',
    email: 'maria@email.com',
    password: 'User123!',
    phone: '+51 984 333 333',
    role: 'user',
  },
];

const SEED_COURTS: SeedCourt[] = [
  {
    id: 'court-futbol-1',
    name: 'Cancha Futbol 1',
    sport: 'futbol',
    description: 'Cancha de futbol 5 con cesped sintetico premium, iluminacion LED y mallas perimetrales. Ideal para partidos competitivos.',
    branch_id: SEED_BRANCH.id,
    images: ['/cancha-futbol-1.png'],
    price_per_hour: 60,
    amenities: ['Cesped sintetico', 'Iluminacion LED', 'Vestuarios', 'Estacionamiento'],
    is_active: true,
  },
  {
    id: 'court-futbol-2',
    name: 'Cancha Futbol 2',
    sport: 'futbol',
    description: 'Cancha de futbol 5 estandar con cesped sintetico y buena iluminacion. Perfecta para partidos amistosos.',
    branch_id: SEED_BRANCH.id,
    images: ['/cancha-futbol-2.png'],
    price_per_hour: 50,
    amenities: ['Cesped sintetico', 'Iluminacion', 'Estacionamiento'],
    is_active: true,
  },
  {
    id: 'court-futbol-3',
    name: 'Cancha Futbol 3',
    sport: 'futbol',
    description: 'Cancha de futbol 5 con superficie techada parcial. Disponible incluso en dias de lluvia.',
    branch_id: SEED_BRANCH.id,
    images: ['/cancha-futbol-3.png'],
    price_per_hour: 55,
    amenities: ['Cesped sintetico', 'Techado parcial', 'Vestuarios'],
    is_active: true,
  },
  {
    id: 'court-futbol-4',
    name: 'Cancha Futbol 4',
    sport: 'futbol',
    description: 'Cancha de futbol 5 nueva con las mejores instalaciones. Cesped de ultima generacion.',
    branch_id: SEED_BRANCH.id,
    images: ['/cancha-futbol-4.png'],
    price_per_hour: 65,
    amenities: ['Cesped premium', 'Iluminacion LED', 'Vestuarios', 'Duchas', 'Estacionamiento'],
    is_active: true,
  },
  {
    id: 'court-voley-1',
    name: 'Cancha Voley 1',
    sport: 'voley',
    description: 'Cancha de voley profesional con piso de PVC y red reglamentaria. Iluminacion de alta calidad.',
    branch_id: SEED_BRANCH.id,
    images: ['/cancha-voley.png'],
    price_per_hour: 40,
    amenities: ['Piso PVC', 'Red reglamentaria', 'Iluminacion LED', 'Vestuarios'],
    is_active: true,
  },
  {
    id: 'court-voley-2',
    name: 'Cancha Voley 2',
    sport: 'voley',
    description: 'Cancha de voley techada con iluminacion artificial. Disponible en cualquier horario.',
    branch_id: SEED_BRANCH.id,
    images: ['/cancha-voley.png'],
    price_per_hour: 35,
    amenities: ['Piso PVC', 'Techado', 'Iluminacion'],
    is_active: true,
  },
];

// ============================================================
// Funciones de Seed
// ============================================================

async function seedBranch() {
  console.log('  Creando sede...');
  await db.collection('branches').doc(SEED_BRANCH.id).set({
    ...SEED_BRANCH,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  });
  console.log(`  Sede "${SEED_BRANCH.name}" creada (${SEED_BRANCH.id})`);
}

async function seedUsers() {
  console.log('  Creando usuarios...');
  for (const user of SEED_USERS) {
    try {
      // Crear en Firebase Auth
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        password: user.password,
        displayName: user.name,
      });

      // Crear documento en Firestore
      await db.collection('users').doc(user.uid).set({
        id: user.uid,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      });

      console.log(`  Usuario "${user.name}" creado (${user.email}) [${user.role}]`);
    } catch (error: any) {
      if (error?.errorInfo?.code === 'auth/uid-already-exists' || error?.errorInfo?.code === 'auth/email-already-exists') {
        console.log(`  Usuario "${user.email}" ya existe, actualizando documento...`);
        await db.collection('users').doc(user.uid).set({
          id: user.uid,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          is_active: true,
          created_at: Timestamp.now(),
          updated_at: Timestamp.now(),
        }, { merge: true });
        console.log(`  Documento actualizado para "${user.email}"`);
      } else {
        console.error(`  Error creando usuario "${user.email}":`, error.message);
      }
    }
  }
}

async function seedCourts() {
  console.log('  Creando canchas...');
  for (const court of SEED_COURTS) {
    await db.collection('courts').doc(court.id).set({
      ...court,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    });
    console.log(`  Cancha "${court.name}" creada (${court.sport}) - S/.${court.price_per_hour}/h`);
  }
}

async function seedSampleBookings() {
  console.log('  Creando reservas de ejemplo...');
  const today = new Date();
  const bookings = [
    {
      id: 'booking-sample-1',
      court_id: 'court-futbol-1',
      user_id: 'user-carlos',
      date: formatDate(today),
      start_time: '18:00',
      end_time: '19:00',
      total_price: 60,
      advance_amount: 30,
      remaining_amount: 30,
      status: 'confirmed',
      slot_status: 'reserved',
      payment_method: 'yape',
      notes: null,
    },
    {
      id: 'booking-sample-2',
      court_id: 'court-futbol-2',
      user_id: 'user-maria',
      date: formatDate(today),
      start_time: '20:00',
      end_time: '21:00',
      total_price: 50,
      advance_amount: 50,
      remaining_amount: 0,
      status: 'fully_paid',
      slot_status: 'reserved',
      payment_method: 'plin',
      notes: 'Partido de despedida',
    },
    {
      id: 'booking-sample-3',
      court_id: 'court-voley-1',
      user_id: 'user-carlos',
      date: formatDate(addDays(today, 1)),
      start_time: '17:00',
      end_time: '18:00',
      total_price: 40,
      advance_amount: 20,
      remaining_amount: 20,
      status: 'pending',
      slot_status: 'reserved',
      payment_method: 'efectivo',
      notes: null,
    },
  ];

  for (const booking of bookings) {
    await db.collection('bookings').doc(booking.id).set({
      ...booking,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    });

    // Crear pago de ejemplo para las reservas con adelanto
    if (booking.advance_amount > 0) {
      await db.collection('bookings').doc(booking.id).collection('payments').add({
        booking_id: booking.id,
        user_id: booking.user_id,
        amount: booking.advance_amount,
        type: 'advance',
        method: booking.payment_method,
        status: 'completed',
        external_ref: null,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      });
    }

    console.log(`  Reserva "${booking.id}" creada - ${booking.date} ${booking.start_time}-${booking.end_time}`);
  }
}

async function seedSampleExpenses() {
  console.log('  Creando gastos de ejemplo...');
  const today = new Date();
  const expenses = [
    {
      id: 'expense-1',
      description: 'Mantenimiento cesped sintetico',
      amount: 350,
      category: 'mantenimiento',
      date: formatDate(addDays(today, -5)),
      notes: 'Limpieza y cepillado de 6 canchas',
    },
    {
      id: 'expense-2',
      description: 'Recibo de luz',
      amount: 280,
      category: 'servicios',
      date: formatDate(addDays(today, -3)),
      notes: 'Periodo mayo 2026',
    },
    {
      id: 'expense-3',
      description: 'Recibo de agua',
      amount: 120,
      category: 'servicios',
      date: formatDate(addDays(today, -3)),
      notes: 'Periodo mayo 2026',
    },
    {
      id: 'expense-4',
      description: 'Compra de balones',
      amount: 180,
      category: 'equipamiento',
      date: formatDate(addDays(today, -7)),
      notes: '4 balones de futbol + 2 de voley',
    },
    {
      id: 'expense-5',
      description: 'Pago vigilancia',
      amount: 600,
      category: 'personal',
      date: formatDate(addDays(today, -1)),
      notes: 'Sueldo quincenal',
    },
  ];

  for (const expense of expenses) {
    await db.collection('expenses').doc(expense.id).set({
      ...expense,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    });
    console.log(`  Gasto "${expense.description}" - S/.${expense.amount}`);
  }
}

async function seedSampleReviews() {
  console.log('  Creando resenas de ejemplo...');
  const reviews = [
    {
      court_id: 'court-futbol-1',
      user_id: 'user-carlos',
      user_name: 'Carlos Quispe',
      rating: 5,
      comment: 'Excelentes canchas, el cesped esta en perfectas condiciones. Muy recomendado.',
    },
    {
      court_id: 'court-futbol-1',
      user_id: 'user-maria',
      user_name: 'Maria Flores',
      rating: 4,
      comment: 'Muy buena cancha, la iluminacion es genial para jugar de noche.',
    },
    {
      court_id: 'court-voley-1',
      user_id: 'user-maria',
      user_name: 'Maria Flores',
      rating: 5,
      comment: 'El piso de PVC es de primera calidad. Las mejores canchas de voley en Cusco.',
    },
  ];

  for (const review of reviews) {
    await db.collection('courts').doc(review.court_id).collection('reviews').add({
      ...review,
      created_at: Timestamp.now(),
    });
    console.log(`  Resena para "${review.court_id}" - ${review.rating} estrellas`);
  }
}

// ============================================================
// Helpers
// ============================================================

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('\n============================================================');
  console.log('  CREARD - Seed de Firebase Firestore');
  console.log('============================================================\n');

  console.log('Conectando a Firebase...');
  console.log(`  Proyecto: ${serviceAccount.project_id}`);
  console.log(`  Email: ${serviceAccount.client_email}`);
  console.log();

  try {
    await seedBranch();
    await seedUsers();
    await seedCourts();
    await seedSampleBookings();
    await seedSampleExpenses();
    await seedSampleReviews();

    console.log('\n============================================================');
    console.log('  Seed completado exitosamente!');
    console.log('============================================================');
    console.log('\nCredenciales de prueba:');
    console.log('  Admin: admin@creard.pe / Admin123!');
    console.log('  User:  carlos@email.com  / User123!');
    console.log('  User:  maria@email.com   / User123!');
    console.log();

  } catch (error) {
    console.error('\nERROR durante el seed:', error);
    process.exit(1);
  }
}

main();
