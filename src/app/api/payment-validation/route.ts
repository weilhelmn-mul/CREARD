// ============================================================
// CREARD - API Route: /api/payment-validation
// GET   : Lista reservas pendientes de validacion (admin)
// POST  : Marca reserva como pendiente (adelanto o restante)
// PATCH : Valida o rechaza un pago (admin)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { logPaymentAudit } from '@/lib/db';

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

// POST /api/payment-validation - User: mark booking as pending validation
// Supports paymentType: 'advance' (default) or 'remaining'
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, 'user');
  if (authResult instanceof NextResponse) return authResult;
  const authUser = authResult.user;

  try {
    const body = await request.json();
    const { bookingIds, paymentType } = body;

    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      return NextResponse.json({ error: 'IDs de reserva requeridos.' }, { status: 400 });
    }

    const isRemaining = paymentType === 'remaining';

    const db = getAdminDb();
    const batch = db.batch();

    // P0-07 FIX: Verify ownership of each booking
    for (const bookingId of bookingIds) {
      const bookingRef = db.collection('bookings').doc(bookingId);
      const bookingSnap = await bookingRef.get();
      if (!bookingSnap.exists) {
        return NextResponse.json({ error: `Reserva ${bookingId} no encontrada.` }, { status: 404 });
      }
      const bookingData = bookingSnap.data();
      // Non-admin users can only mark their own bookings
      if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
        if (bookingData.user_id !== authUser.id && bookingData.user_email !== authUser.email) {
          return NextResponse.json({ error: 'No puedes marcar pagos de reservas de otros usuarios.' }, { status: 403 });
        }
      }
    }

    // P0-07 FIX: Require proof data (transaction ID) for Yape payments
    // The frontend should collect and send this, but we log a warning if missing
    if (!body.transactionId && !body.operationNumber) {
      console.warn('[P0-07] Yape payment marked without transaction ID. User:', authUser.email);
    }

    for (const bookingId of bookingIds) {
      const ref = db.collection('bookings').doc(bookingId);

      if (isRemaining) {
        // For remaining payments, keep status as 'reserved' but add a flag
        batch.update(ref, {
          remaining_payment_status: 'pending',
          payment_method: 'Yape QR',
          updated_at: Timestamp.now(),
        });
      } else {
        // For advance payments, set the whole booking to payment_pending
        batch.update(ref, {
          status: 'payment_pending',
          payment_method: 'Yape QR',
          updated_at: Timestamp.now(),
        });
      }
    }

    await batch.commit();
    return NextResponse.json({
      success: true,
      message: isRemaining
        ? 'Pago restante marcado como pendiente de validacion.'
        : 'Reserva marcada como pendiente de validacion.'
    });
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

    // Determine if this is a remaining payment validation
    const isRemainingPayment = booking.remaining_payment_status === 'pending';

    // Track previous status for audit
    const previousStatus = isRemainingPayment
      ? (booking.remaining_payment_status || 'pending')
      : (booking.status || 'payment_pending');

    // Build update object
    const updateData: Record<string, any> = { updated_at: now };
    let newStatus: string;

    if (isRemainingPayment) {
      // Remaining payment validation
      if (action === 'validate') {
        // Mark remaining as paid
        updateData.remaining_payment_status = 'validated';
        updateData.remaining_amount = 0;
        updateData.advance_amount = booking.total_price;
        // Keep booking as reserved
        newStatus = 'validated';
      } else {
        // Reject remaining payment - keep the amount owed
        updateData.remaining_payment_status = 'rejected';
        newStatus = 'rejected';
      }
    } else {
      // Advance payment validation
      if (action === 'validate') {
        updateData.status = 'reserved';
        updateData.slot_status = 'reserved';
        newStatus = 'reserved';
      } else {
        // Reject: free up the slot
        updateData.status = 'cancelled';
        updateData.slot_status = 'available';
        newStatus = 'cancelled';
      }
    }

    await bookingRef.update(updateData);

    // Create payment validation record (audit log) with booking_code and court_name
    const validationRecord: Record<string, any> = {
      booking_id: bookingId,
      booking_code: booking.booking_code || '',
      court_name: booking.court_name || '',
      user_id: booking.user_id,
      user_email: booking.user_email || '',
      court_id: booking.court_id,
      court_ids: booking.court_ids || [booking.court_id],
      date: booking.date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      amount: booking.total_price || 0,
      advance_amount: isRemainingPayment ? (booking.remaining_amount || 0) : (booking.advance_amount || 0),
      payment_method: booking.payment_method || 'Yape QR',
      payment_type: isRemainingPayment ? 'remaining' : 'advance',
      action,
      observation: observation || '',
      validated_by: authUser.id,
      validated_by_name: authUser.name || authUser.email || '',
      validated_by_role: authUser.role,
      created_at: now,
    };
    await db.collection('payment_validations').add(validationRecord);

    // Try to find related payment in top-level payments collection and update its status
    const paymentStatusForTopLevel = action === 'validate' ? 'completed' : 'rejected';
    let foundPaymentId: string | null = null;
    try {
      const paymentSnap = await db
        .collection('payments')
        .where('booking_id', '==', bookingId)
        .limit(1)
        .get();

      if (!paymentSnap.empty) {
        const paymentDoc = paymentSnap.docs[0];
        foundPaymentId = paymentDoc.id;
        await paymentDoc.ref.update({
          payment_status: paymentStatusForTopLevel,
          status: paymentStatusForTopLevel,
          validated_by: authUser.id,
          validated_by_name: authUser.name || authUser.email || '',
          validated_at: now,
          updated_at: now,
        });
      }
    } catch (payErr: any) {
      console.warn('[PAYMENT-VALIDATION] Could not update top-level payment:', payErr.message);
    }

    // Write detailed audit log to payment_audit_logs collection
    const auditAction = action === 'validate' ? 'validate' : 'reject';
    const paymentTypeLabel = isRemainingPayment ? 'pago restante' : 'adelanto';
    await logPaymentAudit({
      booking_id: bookingId,
      payment_id: foundPaymentId || undefined,
      action: auditAction,
      previous_status: previousStatus,
      new_status: newStatus,
      performed_by: authUser.id,
      performed_by_name: authUser.name || authUser.email || '',
      performed_by_role: authUser.role,
      details: `Pago de ${paymentTypeLabel} ${action === 'validate' ? 'validado' : 'rechazado'} para reserva ${booking.booking_code || bookingId}. Monto: S/ ${booking.total_price || 0}`,
      observation: observation || '',
    });

    return NextResponse.json({
      success: true,
      message: action === 'validate'
        ? (isRemainingPayment ? 'Pago restante validado. Saldo completado.' : 'Pago validado. Reserva confirmada.')
        : (isRemainingPayment ? 'Pago restante rechazado. El monto sigue pendiente.' : 'Pago rechazado. Reserva liberada.'),
    });
  } catch (error: any) {
    console.error('[PAYMENT-VALIDATION] Error:', error.message);
    return NextResponse.json({ error: 'Error al procesar validacion.' }, { status: 500 });
  }
}
