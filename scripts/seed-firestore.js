// ============================================================
// CREARD - Script de Población de Firestore (Seed Data)
// Ejecutar: node scripts/seed-firestore.js
// Requiere: Variables de entorno de Firebase configuradas en .env.local
// ============================================================

const { initializeApp, cert, getApps, getApp } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(msg, color = 'reset') {
  console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
}

// --- Inicializar Firebase Admin ---
let db;

function initFirebase() {
  const pk = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
  if (pk.length < 20 || pk.includes('AQUI') || pk.includes('tu_')) {
    log('❌ Firebase no configurado. Ejecuta primero: bash scripts/setup-firebase.sh', 'red');
    process.exit(1);
  }

  const serviceAccount = {
    type: process.env.FIREBASE_SERVICE_ACCOUNT_TYPE || 'service_account',
    project_id: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID || '',
    private_key_id: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID || '',
    private_key: pk.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL || '',
    client_id: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_ID || '',
    auth_uri: process.env.FIREBASE_SERVICE_ACCOUNT_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    token_uri: process.env.FIREBASE_SERVICE_ACCOUNT_TOKEN_URI || 'https://oauth2.googleapis.com/token',
  };

  if (getApps().length === 0) {
    initializeApp({ credential: cert(serviceAccount) });
  }

  db = getFirestore();
  log('✅ Firebase Admin inicializado', 'green');
}

// --- Datos de Seed ---

const BRANCHES = [
  {
    name: 'CREARD San Sebastián',
    address: 'Av. San Sebastián 123, San Sebastián',
    city: 'Cusco',
    phone: '+51 084 123456',
    email: 'info@creard.pe',
    is_active: true,
  },
];

const COURTS = [
  {
    name: 'Cancha Fútbol 1',
    sport: 'futbol',
    description: 'Cancha premium con césped sintético de última generación, ideal para partidos competitivos y torneos. Cuenta con iluminación LED de alta potencia y vestuarios completos.',
    branch_id: 'branch-1',
    images: ['/cancha-futbol-1.png'],
    price_per_hour: 60,
    is_active: true,
    amenities: ['Cesped sintetico', 'Iluminacion LED', 'Vestuarios', 'Estacionamiento'],
  },
  {
    name: 'Cancha Fútbol 2',
    sport: 'futbol',
    description: 'Cancha estándar con césped sintético de alta calidad, perfecta para partidos amistosos y entrenamientos regulares. Incluye iluminación para juegos nocturnos.',
    branch_id: 'branch-1',
    images: ['/cancha-futbol-2.png'],
    price_per_hour: 50,
    is_active: true,
    amenities: ['Cesped sintetico', 'Iluminacion'],
  },
  {
    name: 'Cancha Fútbol 3',
    sport: 'futbol',
    description: 'Cancha con techado parcial que permite jugar incluso durante lloviznas ligeras. Césped sintético con drenaje optimizado.',
    branch_id: 'branch-1',
    images: ['/cancha-futbol-3.png'],
    price_per_hour: 55,
    is_active: true,
    amenities: ['Cesped sintetico', 'Techado parcial', 'Vestuarios'],
  },
  {
    name: 'Cancha Fútbol 4',
    sport: 'futbol',
    description: 'Nuestra cancha más nueva con las mejores instalaciones del complejo. Césped premium, iluminación de última generación y duchas con agua caliente.',
    branch_id: 'branch-1',
    images: ['/cancha-futbol-4.png'],
    price_per_hour: 65,
    is_active: true,
    amenities: ['Cesped premium', 'Iluminacion LED', 'Duchas', 'Estacionamiento'],
  },
  {
    name: 'Cancha Vóley 1',
    sport: 'voley',
    description: 'Piso PVC profesional con red reglamentaria de altura estándar. Usada para torneos de vóley de la liga local.',
    branch_id: 'branch-1',
    images: ['/cancha-voley.png'],
    price_per_hour: 40,
    is_active: true,
    amenities: ['Piso PVC', 'Red reglamentaria', 'Iluminacion LED'],
  },
  {
    name: 'Salón Eventos',
    sport: 'eventos',
    description: 'Espacio multiusos techado con capacidad para 80 personas. Sistema de sonido profesional e iluminación ambiental.',
    branch_id: 'branch-1',
    images: ['/salon-eventos.png'],
    price_per_hour: 80,
    is_active: true,
    amenities: ['Techado', 'Sonido profesional', 'Iluminacion ambiental', '80 personas'],
  },
];

const SITE_SETTINGS = {
  business_name: 'CREARD',
  slogan: 'Tu cancha, tu juego, tu momento',
  description: 'Complejo deportivo con las mejores canchas de fútbol 5 y vóley en San Sebastián, Cusco.',
  phone: '+51 084 123456',
  whatsapp: '+51987654321',
  email: 'info@creard.pe',
  address: 'Av. San Sebastián 123, San Sebastián, Cusco',
  working_hours: 'Lun-Dom: 8:00 AM - 10:00 PM',
  social_links: {
    facebook: 'https://facebook.com/creard.cusco',
    instagram: 'https://instagram.com/creard.cusco',
    tiktok: 'https://tiktok.com/@creard.cusco',
  },
};

const NEWS = [
  {
    title: 'Inauguración Cancha Fútbol 4',
    content: 'Estamos emocionados de anunciar la apertura de nuestra nueva Cancha Fútbol 4 con césped premium e instalaciones de primer nivel. Reserva ahora con precio especial de lanzamiento.',
    category: 'evento',
    image_url: null,
    is_active: true,
    is_featured: true,
    published_at: new Date().toISOString(),
  },
  {
    title: 'Torneo Relámpago de Fútbol 5',
    content: 'Inscríbete en nuestro torneo relámpago semanal. Premios para los 3 primeros lugares. Cupos limitados a 16 equipos. Consulta bases y condiciones en recepción.',
    category: 'torneo',
    image_url: null,
    is_active: true,
    is_featured: true,
    published_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    title: 'Promoción Nocturna',
    content: 'Reserva cualquier cancha de lunes a jueves después de las 8:00 PM y obtén un 20% de descuento. Válido hasta fin de mes.',
    category: 'promo',
    image_url: null,
    is_active: true,
    is_featured: false,
    published_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

const GALLERY = [
  { title: 'Cancha Fútbol 1 - Vista panorámica', image_url: '/cancha-futbol-1.png', category: 'canchas', is_active: true, display_order: 1 },
  { title: 'Cancha Fútbol 2 - Partido nocturno', image_url: '/cancha-futbol-2.png', category: 'canchas', is_active: true, display_order: 2 },
  { title: 'Cancha Fútbol 3 - Techado parcial', image_url: '/cancha-futbol-3.png', category: 'canchas', is_active: true, display_order: 3 },
  { title: 'Cancha Fútbol 4 - Nueva instalación', image_url: '/cancha-futbol-4.png', category: 'canchas', is_active: true, display_order: 4 },
  { title: 'Cancha Vóley - Piso profesional', image_url: '/cancha-voley.png', category: 'canchas', is_active: true, display_order: 5 },
  { title: 'Salón Eventos', image_url: '/salon-eventos.png', category: 'eventos', is_active: true, display_order: 6 },
];

// --- Funciones de Seed ---

async function seedBranches() {
  log('\n📦 Poblando sedes (branches)...', 'cyan');
  const branchRef = db.collection('branches').doc('branch-1');
  await branchRef.set({
    ...BRANCHES[0],
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  });
  log('  ✅ 1 sede creada (branch-1)', 'green');
}

async function seedCourts() {
  log('\n⚽ Poblando canchas...', 'cyan');
  const batch = db.batch();
  
  for (let i = 0; i < COURTS.length; i++) {
    const ref = db.collection('courts').doc(`cancha-${i + 1}`);
    batch.set(ref, {
      ...COURTS[i],
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    });
  }
  
  await batch.commit();
  log(`  ✅ ${COURTS.length} canchas creadas`, 'green');
}

async function seedSiteSettings() {
  log('\n⚙️  Configurando ajustes del sitio...', 'cyan');
  const ref = db.collection('site_settings').doc('main');
  await ref.set({
    ...SITE_SETTINGS,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  });
  log('  ✅ Ajustes del sitio configurados', 'green');
}

async function seedNews() {
  log('\n📰 Poblando noticias...', 'cyan');
  const batch = db.batch();
  
  for (let i = 0; i < NEWS.length; i++) {
    const ref = db.collection('news').doc();
    batch.set(ref, {
      ...NEWS[i],
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    });
  }
  
  await batch.commit();
  log(`  ✅ ${NEWS.length} noticias creadas`, 'green');
}

async function seedGallery() {
  log('\n🖼️  Poblando galería...', 'cyan');
  const batch = db.batch();
  
  for (const item of GALLERY) {
    const ref = db.collection('gallery').doc();
    batch.set(ref, {
      ...item,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    });
  }
  
  await batch.commit();
  log(`  ✅ ${GALLERY.length} imágenes en galería`, 'green');
}

async function seedSampleBookings() {
  log('\n📋 Creando reservas de ejemplo...', 'cyan');
  
  const today = new Date();
  const bookings = [
    {
      court_id: 'cancha-1',
      user_id: 'user-demo-1',
      date: today.toISOString().split('T')[0],
      start_time: '10:00',
      end_time: '11:00',
      total_price: 60,
      advance_amount: 30,
      remaining_amount: 30,
      status: 'confirmed',
      slot_status: 'reserved',
      payment_method: 'yape',
      notes: 'Partido amistoso entre amigos',
    },
    {
      court_id: 'cancha-1',
      user_id: 'user-demo-2',
      date: today.toISOString().split('T')[0],
      start_time: '18:00',
      end_time: '19:00',
      total_price: 60,
      advance_amount: 30,
      remaining_amount: 30,
      status: 'partially_paid',
      slot_status: 'reserved',
      payment_method: 'plin',
      notes: null,
    },
    {
      court_id: 'cancha-3',
      user_id: 'user-demo-1',
      date: today.toISOString().split('T')[0],
      start_time: '15:00',
      end_time: '16:00',
      total_price: 55,
      advance_amount: 27.5,
      remaining_amount: 27.5,
      status: 'confirmed',
      slot_status: 'reserved',
      payment_method: 'efectivo',
      notes: 'Capacitación equipo juvenil',
    },
  ];

  const batch = db.batch();
  for (const b of bookings) {
    const ref = db.collection('bookings').doc();
    batch.set(ref, {
      ...b,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    });
  }
  await batch.commit();
  log(`  ✅ ${bookings.length} reservas de ejemplo creadas`, 'green');
}

// --- Main ---

async function main() {
  console.log('');
  log('══════════════════════════════════════════════════════', 'cyan');
  log('  CREARD - Población de Firestore (Seed Data)', 'cyan');
  log('══════════════════════════════════════════════════════', 'cyan');
  
  initFirebase();
  
  try {
    await seedBranches();
    await seedCourts();
    await seedSiteSettings();
    await seedNews();
    await seedGallery();
    await seedSampleBookings();
    
    console.log('');
    log('══════════════════════════════════════════════════════', 'green');
    log('  ✅ ¡Seed completado exitosamente!', 'green');
    log('══════════════════════════════════════════════════════', 'green');
    console.log('');
    log('Colecciones creadas:', 'cyan');
    log('  • branches (1 documento)', 'reset');
    log('  • courts (6 documentos)', 'reset');
    log('  • site_settings (1 documento)', 'reset');
    log('  • news (3 documentos)', 'reset');
    log('  • gallery (6 documentos)', 'reset');
    log('  • bookings (3 documentos de ejemplo)', 'reset');
    console.log('');
    log('Verifica en: https://console.firebase.google.com', 'cyan');
    console.log('');
    
  } catch (error) {
    log(`\n❌ Error durante el seed: ${error.message}`, 'red');
    if (error.code === 'permission-denied') {
      log('Verifica que el Service Account tenga permisos de Firestore.', 'yellow');
    }
    process.exit(1);
  }
}

main();
