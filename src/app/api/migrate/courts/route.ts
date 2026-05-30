// ============================================================
// CREARD - One-time Migration: Fix Courts in Firestore
// PUT /api/migrate/courts
// Updates courts to correct names, sports, and prices
// Requires admin auth
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { requireAuth } from '@/lib/auth-middleware'
import { Timestamp } from 'firebase-admin/firestore'

const CORRECT_COURTS: Record<string, Record<string, unknown>> = {
  'cancha-1': {
    name: 'Cancha Fútbol 1',
    sport: 'futbol',
    description: 'Cancha premium con césped sintético de última generación, ideal para partidos competitivos y torneos.',
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
    images: ['/cancha-futbol-4.png'],
    price_per_hour: 35,
    amenities: ['Cesped premium', 'Iluminacion LED', 'Duchas', 'Estacionamiento'],
    is_active: true,
    pricing_schedule: [
      { label: 'Mañana', startHour: 7, endHour: 18, pricePerHour: 35 },
      { label: 'Noche', startHour: 18, endHour: 22, pricePerHour: 50 },
    ],
  },
  'cancha-5': {
    name: 'Cancha Vóley A',
    sport: 'voley',
    description: 'Piso PVC profesional con red reglamentaria, usada para torneos de vóley.',
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

// Also handle courts from seed-firebase.ts with different IDs
const ALIAS_MAP: Record<string, string> = {
  'court-futbol-1': 'cancha-1',
  'court-futbol-2': 'cancha-2',
  'court-futbol-3': 'cancha-3',
  'court-futbol-4': 'cancha-4',
  'court-voley-1': 'cancha-5',
  'court-voley-2': 'cancha-6',
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const batch = adminDb.batch()
    const colRef = adminDb.collection('courts')
    const results: string[] = []

    for (const [id, data] of Object.entries(CORRECT_COURTS)) {
      const ref = colRef.doc(id)
      batch.set(ref, {
        ...data,
        branch_id: 'branch-1',
        updated_at: Timestamp.now(),
      }, { merge: true })
      results.push(`Updated ${id}: ${data.name}`)
    }

    await batch.commit()
    console.log('[MIGRATE] Updated standard courts:', results.join(', '))

    // Handle aliased court IDs from seed-firebase.ts
    const aliasResults: string[] = []
    const batch2 = adminDb.batch()

    for (const [oldId, newId] of Object.entries(ALIAS_MAP)) {
      const correctData = CORRECT_COURTS[newId]
      if (!correctData) continue

      const ref = colRef.doc(oldId)
      batch2.set(ref, {
        ...correctData,
        branch_id: 'branch-1',
        updated_at: Timestamp.now(),
      }, { merge: true })
      aliasResults.push(`Updated ${oldId} -> ${correctData.name}`)
    }

    await batch2.commit()
    console.log('[MIGRATE] Updated aliased courts:', aliasResults.join(', '))

    return NextResponse.json({
      success: true,
      message: 'Courts migrated successfully',
      updated: [...results, ...aliasResults],
    })
  } catch (error: unknown) {
    console.error('[MIGRATE /api/migrate/courts]', error)
    return NextResponse.json(
      { error: 'Error during migration' },
      { status: 500 }
    )
  }
}

// GET - Show current court state for debugging
export async function GET() {
  try {
    const snapshot = await adminDb.collection('courts').get()
    const courts: Record<string, unknown>[] = []
    snapshot.forEach((doc) => {
      courts.push({ id: doc.id, ...doc.data() })
    })
    return NextResponse.json({ courts })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Error reading courts' },
      { status: 500 }
    )
  }
}
