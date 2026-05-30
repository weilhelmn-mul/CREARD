// TEMPORARY: Update prices in Firestore. DELETE after running.
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { isFirebaseAvailable } from '@/lib/firebase-check';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!isFirebaseAvailable()) {
      return NextResponse.json({ success: false, error: 'Firebase no disponible' });
    }

    const futbolSchedule = [
      { label: 'Mañana', startHour: 7, endHour: 18, pricePerHour: 35 },
      { label: 'Noche', startHour: 18, endHour: 22, pricePerHour: 50 },
    ];
    const voleySchedule = [
      { label: 'Mañana', startHour: 7, endHour: 18, pricePerHour: 30 },
      { label: 'Noche', startHour: 18, endHour: 22, pricePerHour: 45 },
    ];

    const updates: Record<string, unknown> = {};
    const courts = [
      { id: 'cancha-1', price: 35, schedule: futbolSchedule },
      { id: 'cancha-2', price: 35, schedule: futbolSchedule },
      { id: 'cancha-3', price: 35, schedule: futbolSchedule },
      { id: 'cancha-4', price: 35, schedule: futbolSchedule },
      { id: 'cancha-5', price: 30, schedule: voleySchedule },
      { id: 'cancha-6', price: 30, schedule: voleySchedule },
    ];

    for (const c of courts) {
      try {
        const doc = await adminDb.collection('courts').doc(c.id).get();
        if (doc.exists) {
          const prev = doc.data()?.price_per_hour;
          await adminDb.collection('courts').doc(c.id).update({
            price_per_hour: c.price,
            pricing_schedule: c.schedule,
            updated_at: new Date().toISOString(),
          });
          updates[c.id] = { success: true, previousPrice: prev, newPrice: c.price };
        } else {
          updates[c.id] = { success: false, error: 'No existe en Firestore' };
        }
      } catch (err: any) {
        updates[c.id] = { success: false, error: err.message };
      }
    }

    return NextResponse.json({ success: true, updates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
