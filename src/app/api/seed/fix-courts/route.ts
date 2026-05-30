// ============================================================
// CREARD - One-time seed: Fix vóley courts in Firestore
// Changes cancha-5 to "Vóley Cancha A" and cancha-6 from
// "Salón Eventos"/eventos to "Vóley Cancha B"/voley
// DELETE THIS FILE AFTER RUNNING
// ============================================================

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { isFirebaseAvailable } from '@/lib/firebase-check';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!isFirebaseAvailable()) {
      return NextResponse.json({
        success: false,
        error: 'Firebase no está disponible en este entorno.',
      });
    }

    const voleyPricingSchedule = [
      { label: 'Mañana', startHour: 7, endHour: 18, pricePerHour: 30 },
      { label: 'Noche', startHour: 18, endHour: 22, pricePerHour: 45 },
    ];

    const results: Record<string, unknown> = {};

    // 1. Update cancha-5: Rename to "Vóley Cancha A"
    try {
      const doc5 = await adminDb.collection('courts').doc('cancha-5').get();
      if (doc5.exists) {
        await adminDb.collection('courts').doc('cancha-5').update({
          name: 'Vóley Cancha A',
          sport: 'voley',
          description: 'Piso PVC profesional con red reglamentaria, usada para torneos de vóley.',
          images: ['/cancha-voley.png'],
          price_per_hour: 30,
          pricing_schedule: voleyPricingSchedule,
          amenities: ['Piso PVC', 'Red reglamentaria', 'Iluminacion LED'],
          updated_at: new Date().toISOString(),
        });
        results.cancha5 = { success: true, action: 'updated', doc: doc5.id };
      } else {
        await adminDb.collection('courts').doc('cancha-5').set({
          name: 'Vóley Cancha A',
          sport: 'voley',
          description: 'Piso PVC profesional con red reglamentaria, usada para torneos de vóley.',
          branch_id: 'branch-1',
          images: ['/cancha-voley.png'],
          price_per_hour: 30,
          pricing_schedule: voleyPricingSchedule,
          amenities: ['Piso PVC', 'Red reglamentaria', 'Iluminacion LED'],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        results.cancha5 = { success: true, action: 'created', doc: 'cancha-5' };
      }
    } catch (err: any) {
      results.cancha5 = { success: false, error: err.message };
    }

    // 2. Update cancha-6: Change from "Salón Eventos"/eventos to "Vóley Cancha B"/voley
    try {
      const doc6 = await adminDb.collection('courts').doc('cancha-6').get();
      if (doc6.exists) {
        await adminDb.collection('courts').doc('cancha-6').update({
          name: 'Vóley Cancha B',
          sport: 'voley',
          description: 'Segunda cancha de vóley techada con iluminación profesional.',
          images: ['/cancha-voley.png'],
          price_per_hour: 30,
          pricing_schedule: voleyPricingSchedule,
          amenities: ['Piso PVC', 'Iluminacion LED', 'Techado'],
          updated_at: new Date().toISOString(),
        });
        results.cancha6 = { success: true, action: 'updated', doc: doc6.id, previousData: doc6.data() };
      } else {
        await adminDb.collection('courts').doc('cancha-6').set({
          name: 'Vóley Cancha B',
          sport: 'voley',
          description: 'Segunda cancha de vóley techada con iluminación profesional.',
          branch_id: 'branch-1',
          images: ['/cancha-voley.png'],
          price_per_hour: 30,
          pricing_schedule: voleyPricingSchedule,
          amenities: ['Piso PVC', 'Iluminacion LED', 'Techado'],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        results.cancha6 = { success: true, action: 'created', doc: 'cancha-6' };
      }
    } catch (err: any) {
      results.cancha6 = { success: false, error: err.message };
    }

    // 3. List all courts in Firestore for verification
    try {
      const snapshot = await adminDb.collection('courts').get();
      results.allCourts = snapshot.docs.map(d => ({
        id: d.id,
        name: d.data().name,
        sport: d.data().sport,
      }));
    } catch (err: any) {
      results.allCourtsError = err.message;
    }

    return NextResponse.json({
      success: true,
      message: 'Courts updated in Firestore. DELETE this route file after verification.',
      results,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
