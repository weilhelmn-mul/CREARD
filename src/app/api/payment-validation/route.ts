// ============================================================
// CREARD - API Route: /api/payment-validation
// GET   : Lista reservas pendientes de validacion (admin)
// POST  : Crea reserva con estado 'payment_pending' (usuario)
// PATCH : Valida o rechaza un pago (admin)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

// GET /api/payment-validation - Admin: list pending validations
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, 'admin');
  if (authResult instanceof NextResponse) return authResult;
  const authUser = authResult.user;

  try {
    const db = getAdminDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'payment_pending';

    const snapshot = await db
      .collection('bookings')
      .where('status', '==', status)
      .get();

    const bookings = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    // Also get validation history for these bookings
    const validationHistory: Record<string, any[]> = {};
    if (bookings.length > 0) {
      // Get all validation logs
      const historySnap = await db
        .collection('payment_validations')
        .orderBy('created_at', 'desc')
        .limit(100)
        .get();
      
      for (const doc of historySnap.docs) {
        const data = doc.data();
        const bId = data.booking_id;
        if (!validationHistory[bId]) validationHistory[bId] = [];
        validationHistory[bId].push({ id: doc.id, ...data });
      }
    }

    return NextResponse.json({ bookings, validationHistory });
  } catch (error: any) {
    console.error('[PAYMENT-VALIDATION] Error:', error.message);
    return NextResponse.json({ error: 'Error al obtener validaciones.' }, { status: 500 });
  }
}

// POST /api/payment-validation - User: mark booking as payment_pending
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, 'user');
  if (authResult instanceof NextResponse) return authResult;
  const authUser = authResult.user;

  try {
    const body = await request.json();
    const { bookingIds } = body;

    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      return NextResponse.json({ error: 'IDs de reserva requeridos.' }, { status: 400 });
    }

    const db = getAdminDb();
    const batch = db.batch();

    for (const bookingId of bookingIds) {
      const ref = db.collection('bookings').doc(bookingId);
      batch.update(ref, {
        status: 'payment_pending',
        payment_method: 'Yape QR',
        updated_at: Timestamp.now(),
      });
    }

    await batch.commit();
    return NextResponse.json({ success: true, message: 'Reserva marcada como pendiente de validacion.' });
  } catch (error: any) {
    console.error('[PAYMENT-VALIDATION] Error marking pending:', error.message);
    return NextResponse.json({ error: 'Error al procesar.' }, { status: 500 });
  }
}

// PATCH /api/payment-validation - Admin: validate or reject
export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth(request, 'admin');
  if (authResult instanceof NextResponse) return authResult;
  const authUser = authResult.user;

  try {
    const body = await request.json();
    const { bookingId, action, observation } = body;

    if (!bookingId || !['validate', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Parametros invalidos.' }, { status: 400 });
    }

    const db = getAdminDb();
    const now = Timestamp.now();

    // Get booking
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ error: 'Reserva no encontrada.' }, { status: 404 });
    }
    const booking = bookingSnap.data();

    // Update booking status
    if (action === 'validate') {
      await bookingRef.update({
        status: 'reserved',
        slot_status: 'reserved',
        updated_at: now,
      });
    } else {
      // Reject: free up the slot
      await bookingRef.update({
        status: 'cancelled',
        slot_status: 'available',
        updated_at: now,
      });
    }

    // Create payment validation record (audit log)
    await db.collection('payment_validations').add({
      booking_id: bookingId,
      user_id: booking.user_id,
      user_email: booking.user_email || '',
      court_id: booking.court_id,
      court_ids: booking.court_ids || [booking.court_id],
      date: booking.date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      amount: booking.total_price || 0,
      advance_amount: booking.advance_amount || 0,
      payment_method: booking.payment_method || 'Yape QR',
      action,
      observation: observation || '',
      validated_by: authUser.id,
      validated_by_name: authUser.name || authUser.email || '',
      validated_by_role: authUser.role,
      created_at: now,
    });

    return NextResponse.json({
      success: true,
      message: action === 'validate'
        ? 'Pago validado. Reserva confirmada.'
        : 'Pago rechazado. Reserva liberada.',
    });
  } catch (error: any) {
    console.error('[PAYMENT-VALIDATION] Error:', error.message);
    return NextResponse.json({ error: 'Error al procesar validacion.' }, { status: 500 });
  }
}
