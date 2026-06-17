// ============================================================
// CREARD - One-time fix: Correct court names in Firestore
// GET /api/setup/fix-names — no auth required (one-time use)
// ============================================================

import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { isFirebaseAvailable } from '@/lib/firebase-check'
import { Timestamp } from 'firebase-admin/firestore'

const FIXES: Record<string, { name: string; price_per_hour: number }> = {
  'cancha-5': { name: 'Cancha Vóley A', price_per_hour: 30 },
  'cancha-6': { name: 'Cancha Vóley B', price_per_hour: 30 },
  'court-voley-1': { name: 'Cancha Vóley A', price_per_hour: 30 },
  'court-voley-2': { name: 'Cancha Vóley B', price_per_hour: 30 },
}

export async function GET() {
  if (!isFirebaseAvailable()) {
    return NextResponse.json({ error: 'Firebase not available' }, { status: 503 })
  }

  const results: string[] = []
  const colRef = adminDb.collection('courts')
  const batch = adminDb.batch()

  for (const [id, fix] of Object.entries(FIXES)) {
    const ref = colRef.doc(id)
    batch.set(ref, {
      name: fix.name,
      price_per_hour: fix.price_per_hour,
      sport: 'voley',
      is_active: true,
      branch_id: 'branch-1',
      updated_at: Timestamp.now(),
      pricing_schedule: [
        { label: 'Mañana', startHour: 7, endHour: 18, pricePerHour: 30 },
        { label: 'Noche', startHour: 18, endHour: 22, pricePerHour: 45 },
      ],
    }, { merge: true })
    results.push(`${id} → ${fix.name} (S/${fix.price_per_hour}/hr)`)
  }

  await batch.commit()

  // Also check all courts and report
  const snapshot = await colRef.get()
  const allCourts: { id: string; name: string; sport: string; price: number }[] = []
  snapshot.forEach((doc) => {
    const d = doc.data()
    allCourts.push({
      id: doc.id,
      name: d.name || '?',
      sport: d.sport || '?',
      price: d.price_per_hour || 0,
    })
  })

  return NextResponse.json({
    success: true,
    fixed: results,
    allCourts,
  })
}
