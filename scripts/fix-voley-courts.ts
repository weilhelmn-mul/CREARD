// ============================================================
// CREARD - Fix: Ensure both Vóley A and Vóley B exist in Firestore
// Run: npx tsx scripts/fix-voley-courts.ts
// ============================================================

import * as fs from 'fs'
import * as path from 'path'

// Load env
function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) continue
      const key = trimmed.slice(0, eqIndex)
      let value = trimmed.slice(eqIndex + 1)
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      value = value.replace(/\\n/g, '\n')
      if (!process.env[key]) process.env[key] = value
    }
  }
}
loadEnvFile()

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const serviceAccount = {
  type: process.env.FIREBASE_SERVICE_ACCOUNT_TYPE || 'service_account',
  project_id: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID || '',
  private_key_id: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID || '',
  private_key: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '',
  client_email: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL || '',
  client_id: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_ID || '',
  auth_uri: process.env.FIREBASE_SERVICE_ACCOUNT_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
  token_uri: process.env.FIREBASE_SERVICE_ACCOUNT_TOKEN_URI || 'https://oauth2.googleapis.com/token',
}

const app = initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore(app)

const BRANCH_ID = 'branch-1'

const VOLEY_COURTS: Record<string, Record<string, unknown>> = {
  'cancha-5': {
    name: 'Cancha Vóley A',
    sport: 'voley',
    description: 'Piso PVC profesional con red reglamentaria, usada para torneos de vóley.',
    branch_id: BRANCH_ID,
    images: ['/cancha-voley.png'],
    price_per_hour: 30,
    amenities: ['Piso PVC', 'Red reglamentaria', 'Iluminacion LED'],
    is_active: true,
    pricing_schedule: [
      { label: 'Mañana', startHour: 7, endHour: 18, pricePerHour: 30 },
      { label: 'Noche', startHour: 18, endHour: 22, pricePerHour: 45 },
    ],
  },
  'cancha-6': {
    name: 'Cancha Vóley B',
    sport: 'voley',
    description: 'Segunda cancha de vóley techada con iluminación profesional.',
    branch_id: BRANCH_ID,
    images: ['/cancha-voley.png'],
    price_per_hour: 30,
    amenities: ['Piso PVC', 'Techado', 'Iluminacion LED'],
    is_active: true,
    pricing_schedule: [
      { label: 'Mañana', startHour: 7, endHour: 18, pricePerHour: 30 },
      { label: 'Noche', startHour: 18, endHour: 22, pricePerHour: 45 },
    ],
  },
}

// Also write to aliased IDs (from seed-firebase.ts)
const ALIAS_MAP: Record<string, string> = {
  'court-voley-1': 'cancha-5',
  'court-voley-2': 'cancha-6',
}

async function main() {
  console.log('\n=== CREARD: Fix Vóley Courts in Firestore ===\n')

  // 1. Check current state
  console.log('1. Checking current courts in Firestore...')
  const snapshot = await db.collection('courts').get()
  const existingCourts: { id: string; name: string; sport: string }[] = []
  snapshot.forEach((doc) => {
    const data = doc.data()
    existingCourts.push({ id: doc.id, name: data.name || 'unnamed', sport: data.sport || 'unknown' })
  })

  console.log(`   Found ${existingCourts.length} courts total:`)
  existingCourts.forEach((c) => {
    const isVoley = c.sport === 'voley'
    console.log(`   ${isVoley ? '🏐' : '⚽'} ${c.id}: ${c.name} (${c.sport})`)
  })

  const voleyCourts = existingCourts.filter(c => c.sport === 'voley')
  console.log(`\n   Vóley courts found: ${voleyCourts.length}`)

  if (voleyCourts.length >= 2) {
    console.log('   ✅ Both vóley courts already exist!')
  } else {
    console.log('   ⚠️  Missing vóley court(s). Fixing...')
  }

  // 2. Ensure branch-1 exists
  console.log('\n2. Ensuring branch-1 exists...')
  const branchRef = db.collection('branches').doc(BRANCH_ID)
  const branchSnap = await branchRef.get()
  if (!branchSnap.exists) {
    await branchRef.set({
      id: BRANCH_ID,
      name: 'CREARD',
      address: 'Cusco, Perú',
      city: 'San Sebastián',
      phone: '+51 984 000 000',
      email: 'info@creard.pe',
      is_active: true,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    })
    console.log('   Created branch-1')
  } else {
    console.log('   branch-1 already exists')
  }

  // 3. Write/fix cancha-5 and cancha-6
  console.log('\n3. Writing cancha-5 (Vóley A) and cancha-6 (Vóley B)...')
  for (const [id, data] of Object.entries(VOLEY_COURTS)) {
    const ref = db.collection('courts').doc(id)
    await ref.set({
      ...data,
      updated_at: Timestamp.now(),
    }, { merge: true })
    console.log(`   ✅ Set ${id}: ${data.name}`)
  }

  // 4. Write aliased IDs
  console.log('\n4. Writing aliased IDs (court-voley-1, court-voley-2)...')
  for (const [aliasId, mainId] of Object.entries(ALIAS_MAP)) {
    const data = VOLEY_COURTS[mainId]
    if (!data) continue
    const ref = db.collection('courts').doc(aliasId)
    await ref.set({
      ...data,
      updated_at: Timestamp.now(),
    }, { merge: true })
    console.log(`   ✅ Set ${aliasId} -> ${data.name}`)
  }

  // 5. Also ensure all 4 fútbol courts exist with correct IDs
  console.log('\n5. Ensuring all fútbol courts exist...')
  const FUTBOL_COURTS: Record<string, Record<string, unknown>> = {
    'cancha-1': {
      name: 'Cancha Fútbol 1',
      sport: 'futbol',
      description: 'Cancha premium con césped sintético de última generación, ideal para partidos competitivos y torneos.',
      branch_id: BRANCH_ID,
      images: ['/cancha-futbol-1.png'],
      price_per_hour: 35,
      amenities: ['Cesped sintetico', 'Iluminacion LED', 'Vestuarios', 'Estacionamiento'],
      is_active: true,
      pricing_schedule: [
        { label: 'Mañana', startHour: 7, endHour: 18, pricePerHour: 35 },
        { label: 'Noche', startHour: 18, endHour: 22, pricePerHour: 50 },
      ],
    },
    'cancha-2': {
      name: 'Cancha Fútbol 2',
      sport: 'futbol',
      description: 'Cancha estándar con césped sintético, perfecta para partidos amistosos y entrenamientos.',
      branch_id: BRANCH_ID,
      images: ['/cancha-futbol-2.png'],
      price_per_hour: 35,
      amenities: ['Cesped sintetico', 'Iluminacion'],
      is_active: true,
      pricing_schedule: [
        { label: 'Mañana', startHour: 7, endHour: 18, pricePerHour: 35 },
        { label: 'Noche', startHour: 18, endHour: 22, pricePerHour: 50 },
      ],
    },
    'cancha-3': {
      name: 'Cancha Fútbol 3',
      sport: 'futbol',
      description: 'Cancha con techado parcial, permite jugar incluso cuando hay llovizna ligera.',
      branch_id: BRANCH_ID,
      images: ['/cancha-futbol-3.png'],
      price_per_hour: 35,
      amenities: ['Cesped sintetico', 'Techado parcial', 'Vestuarios'],
      is_active: true,
      pricing_schedule: [
        { label: 'Mañana', startHour: 7, endHour: 18, pricePerHour: 35 },
        { label: 'Noche', startHour: 18, endHour: 22, pricePerHour: 50 },
      ],
    },
    'cancha-4': {
      name: 'Cancha Fútbol 4',
      sport: 'futbol',
      description: 'Nuestra cancha más nueva con las mejores instalaciones del complejo.',
      branch_id: BRANCH_ID,
      images: ['/cancha-futbol-4.png'],
      price_per_hour: 35,
      amenities: ['Cesped premium', 'Iluminacion LED', 'Duchas', 'Estacionamiento'],
      is_active: true,
      pricing_schedule: [
        { label: 'Mañana', startHour: 7, endHour: 18, pricePerHour: 35 },
        { label: 'Noche', startHour: 18, endHour: 22, pricePerHour: 50 },
      ],
    },
  }

  const FUTBOL_ALIASES: Record<string, string> = {
    'court-futbol-1': 'cancha-1',
    'court-futbol-2': 'cancha-2',
    'court-futbol-3': 'cancha-3',
    'court-futbol-4': 'cancha-4',
  }

  for (const [id, data] of Object.entries(FUTBOL_COURTS)) {
    const ref = db.collection('courts').doc(id)
    await ref.set({ ...data, updated_at: Timestamp.now() }, { merge: true })
    console.log(`   ✅ Set ${id}: ${data.name}`)
  }

  for (const [aliasId, mainId] of Object.entries(FUTBOL_ALIASES)) {
    const data = FUTBOL_COURTS[mainId]
    if (!data) continue
    const ref = db.collection('courts').doc(aliasId)
    await ref.set({ ...data, updated_at: Timestamp.now() }, { merge: true })
    console.log(`   ✅ Set ${aliasId} -> ${data.name}`)
  }

  // 6. Verify final state
  console.log('\n6. Verifying final state...')
  const finalSnapshot = await db.collection('courts').get()
  const finalCourts: { id: string; name: string; sport: string; is_active: boolean }[] = []
  finalSnapshot.forEach((doc) => {
    const data = doc.data()
    finalCourts.push({ id: doc.id, name: data.name || 'unnamed', sport: data.sport || 'unknown', is_active: data.is_active !== false })
  })

  const activeCourts = finalCourts.filter(c => c.is_active)
  const voleyFinal = activeCourts.filter(c => c.sport === 'voley')
  const futbolFinal = activeCourts.filter(c => c.sport === 'futbol')

  console.log(`\n   Total courts: ${activeCourts.length} active`)
  console.log(`   ⚽ Fútbol: ${futbolFinal.length}`)
  futbolFinal.forEach(c => console.log(`      - ${c.id}: ${c.name}`))
  console.log(`   🏐 Vóley: ${voleyFinal.length}`)
  voleyFinal.forEach(c => console.log(`      - ${c.id}: ${c.name}`))

  console.log('\n=== Fix completed ===\n')
}

main().catch((err) => {
  console.error('ERROR:', err)
  process.exit(1)
})
