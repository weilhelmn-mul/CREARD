// ============================================================
// CREARD - Script de Datos Seed para Firebase Firestore
// ============================================================
// Ejecutar con:  npx ts-node seed.ts
// o convertir a JavaScript y ejecutar con:  node seed.js
// ============================================================

import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

// Inicializar Firebase
// Reemplaza con tu configuración de Firebase
const serviceAccount = require('./service-account-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// ============================================================
// Función helper para formatear fecha
// ============================================================
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return formatDate(result);
}

// ============================================================
// DATOS SEED
// ============================================================

const TODAY = new Date();

const SEED = {
  // --------------------------------------------------------
  // 1. Sucursal principal
  // --------------------------------------------------------
  branches: [
    {
      name: 'CREARD',
      address: 'Av. Bolivar C1, San Sebastian',
      city: 'Cusco',
      phone: '+51 984 123 456',
      email: 'info@creard.com',
      is_active: true,
    },
  ],

  // --------------------------------------------------------
  // 2. Canchas (4 fútbol 5 + 2 vóley)
  // --------------------------------------------------------
  courts: [
    {
      name: 'Cancha de Futbol 1',
      sport: 'futbol',
      description: 'Cancha de futbol 5 con cesped sintetico de ultima generacion. Iluminacion LED, vestuarios con duchas y marcador electronico.',
      images: ['/cancha-futbol-1.png'],
      price_per_hour: 45,
      amenities: ['Wi-Fi', 'Estacionamiento', 'Vestuarios', 'Iluminacion LED', 'Duchas', 'Marcador', 'Cafeteria'],
      is_active: true,
    },
    {
      name: 'Cancha de Futbol 2',
      sport: 'futbol',
      description: 'Cancha de futbol 5 con cesped sintetico premium e iluminacion de ultima generacion. Amplia zona de calentamiento.',
      images: ['/cancha-futbol-2.png'],
      price_per_hour: 50,
      amenities: ['Wi-Fi', 'Estacionamiento', 'Vestuarios', 'Iluminacion LED', 'Duchas', 'Zona de calentamiento', 'Cafeteria'],
      is_active: true,
    },
    {
      name: 'Cancha de Futbol 3',
      sport: 'futbol',
      description: 'Cancha de futbol 5 techada con piso tarima profesional. Climatizacion, sonido ambiental y vestuarios premium.',
      images: ['/cancha-futbol-3.png'],
      price_per_hour: 55,
      amenities: ['Climatizacion', 'Vestuarios Premium', 'Wi-Fi', 'Sonido', 'Iluminacion LED', 'Estacionamiento'],
      is_active: true,
    },
    {
      name: 'Cancha de Futbol 4',
      sport: 'futbol',
      description: 'Cancha de futbol 5 al aire libre con cesped sintetico de alta calidad. Ideal para torneos oficiales.',
      images: ['/cancha-futbol-4.png'],
      price_per_hour: 55,
      amenities: ['Wi-Fi', 'Estacionamiento', 'Vestuarios', 'Duchas', 'Iluminacion LED', 'Cafeteria', 'Zona de calentamiento'],
      is_active: true,
    },
    {
      name: 'Cancha de Voley A',
      sport: 'voley',
      description: 'Cancha profesional de voley con piso PVC, red FIVV homologada, tribunas para 200 espectadores.',
      images: ['/cancha-voley.png'],
      price_per_hour: 35,
      amenities: ['Wi-Fi', 'Estacionamiento', 'Tribunas', 'Sonido', 'Iluminacion', 'Red FIVV'],
      is_active: true,
    },
    {
      name: 'Cancha de Voley B',
      sport: 'voley',
      description: 'Cancha de voley techada con piso PVC y excelente iluminacion. Perfecta para entrenamientos.',
      images: ['/cancha-voley.png'],
      price_per_hour: 30,
      amenities: ['Wi-Fi', 'Estacionamiento', 'Iluminacion', 'Vestuarios', 'Climatizacion'],
      is_active: true,
    },
  ],

  // --------------------------------------------------------
  // 3. Reseñas
  // --------------------------------------------------------
  reviews: [
    { court_index: 0, rating: 5, comment: 'Excelente cancha, cesped en perfecto estado. La iluminacion es genial para jugar de noche.' },
    { court_index: 0, rating: 5, comment: 'El mejor lugar para jugar futbol en Cusco. Vestuarios limpios y buena atencion.' },
    { court_index: 1, rating: 4, comment: 'Perfecta para 5 vs 5. Excelente cesped y buena iluminacion.' },
    { court_index: 2, rating: 5, comment: 'La cancha techada es increible. Juegas comodo sin importar la lluvia.' },
    { court_index: 3, rating: 5, comment: 'Espectacular. Ideal para torneos y amplia iluminacion.' },
    { court_index: 4, rating: 4, comment: 'Piso excelente y buena tribuna para espectadores.' },
    { court_index: 5, rating: 5, comment: 'Techada, ideal para entrenar. Buena climatizacion.' },
  ],

  // --------------------------------------------------------
  // 4. Gastos
  // --------------------------------------------------------
  expenses: [
    { description: 'Mantenimiento cesped Cancha 1', amount: 120, category: 'mantenimiento', date: addDays(TODAY, -1), notes: 'Corte y reparacion de cesped sintetico' },
    { description: 'Servicio de energia electrica', amount: 350, category: 'servicios', date: formatDate(TODAY), notes: 'Recibo de luz mensual' },
    { description: 'Sueldo personal de limpieza', amount: 800, category: 'personal', date: addDays(TODAY, -2), notes: 'Pago quincenal' },
    { description: 'Reparacion iluminacion LED', amount: 200, category: 'mantenimiento', date: addDays(TODAY, -3), notes: 'Cambio de lamparas Cancha 2' },
    { description: 'Agua potable', amount: 80, category: 'servicios', date: addDays(TODAY, -5), notes: 'Recibo mensual' },
    { description: 'Material de limpieza', amount: 65, category: 'otros', date: addDays(TODAY, -4), notes: 'Detergentes, desinfectantes' },
    { description: 'Alquiler terreno', amount: 1500, category: 'alquiler', date: formatDate(TODAY), notes: 'Mensual' },
  ],
};

// ============================================================
// FUNCIÓN PRINCIPAL DE SEED
// ============================================================

async function seedDatabase() {
  console.log('Iniciando seed de datos...');

  try {
    // 1. Crear sucursal
    console.log('\n1. Creando sucursal...');
    const branchRef = await db.collection('branches').add({
      ...SEED.branches[0],
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    });
    const branchId = branchRef.id;
    console.log(`   Sucursal creada: ${branchId} (${SEED.branches[0].name})`);

    // 2. Crear canchas
    console.log('\n2. Creando canchas...');
    const courtIds: string[] = [];
    for (const courtData of SEED.courts) {
      const courtRef = await db.collection('courts').add({
        ...courtData,
        branch_id: branchId,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      });
      courtIds.push(courtRef.id);
      console.log(`   Cancha creada: ${courtRef.id} (${courtData.name}) - S/${courtData.price_per_hour}/h`);
    }

    // 3. Crear reseñas (se asocian a las canchas ya creadas)
    console.log('\n3. Creando resenas...');
    for (let i = 0; i < SEED.reviews.length; i++) {
      const reviewData = SEED.reviews[i];
      const courtId = courtIds[reviewData.court_index];

      await db.collection(`courts/${courtId}/reviews`).add({
        user_id: 'seed_user', // Reemplazar con UID real
        user_name: 'Usuario de prueba',
        rating: reviewData.rating,
        comment: reviewData.comment,
        created_at: Timestamp.now(),
      });
      console.log(`   Resena: ${reviewData.rating} estrellas para ${SEED.courts[reviewData.court_index].name}`);
    }

    // 4. Crear gastos
    console.log('\n4. Creando gastos...');
    for (const expenseData of SEED.expenses) {
      await db.collection('expenses').add({
        ...expenseData,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      });
      console.log(`   Gasto: S/${expenseData.amount} - ${expenseData.description}`);
    }

    console.log('\n========================================');
    console.log('Seed completado exitosamente!');
    console.log(`  - 1 sucursal`);
    console.log(`  - ${courtIds.length} canchas (4 futbol + 2 voley)`);
    console.log(`  - ${SEED.reviews.length} resenas`);
    console.log(`  - ${SEED.expenses.length} gastos`);
    console.log('========================================');

    // Nota: Los usuarios se crean automáticamente al registrarse
    // en Firebase Auth mediante el trigger onCreateUser.
    //
    // Para crear el primer admin manualmente:
    // 1. Registra un usuario en Firebase Auth
    // 2. Ejecuta la función setAdminRole con su UID:
    //    curl -X POST https://REGION-PROJECT.cloudfunctions.net/setAdminRole \
    //      -H "Content-Type: application/json" \
    //      -d '{"uid": "EL_UID_DEL_USUARIO"}'
    //
    // O desde Firebase Console > Authentication > Users > editar custom claims:
    //   { "role": "admin" }
    console.log('\nNOTA: Para crear usuarios de prueba:');
    console.log('1. Registra usuarios en Firebase Auth');
    console.log('2. Los perfiles se crean automáticamente en /users');
    console.log('3. Para promover a admin, usa la función setAdminRole');

  } catch (error) {
    console.error('Error durante el seed:', error);
    process.exit(1);
  }
}

// Ejecutar
seedDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
