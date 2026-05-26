import { NextRequest, NextResponse } from 'next/server';
import { createPayment, updateBooking, getBookingById } from '@/lib/db';
import { requireAnyAuth } from '@/lib/auth-middleware';
import { isFirebaseAvailable } from '@/lib/firebase-check';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireAnyAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const authUser = authResult.user;

    const body = await request.json();
    const { bookingId, userId, amount, type, method, status, externalRef } = body;

    if (!bookingId || !amount || !type || !method) {
      return NextResponse.json(
        { error: 'bookingId, amount, type, and method are required' },
        { status: 400 }
      );
    }

    // Demo mode: accept payment without Firebase
    if (!isFirebaseAvailable()) {
      return NextResponse.json({
        id: `pay-${Date.now()}`,
        success: true,
        demo: true,
      }, { status: 201 });
    }

    // Verify user owns the booking (non-admin users) — O(1) direct lookup
    if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
      const booking = await getBookingById(bookingId);
      if (!booking || booking.user_id !== authUser.id) {
        return NextResponse.json(
          { error: 'No puedes realizar pagos para reservas de otros usuarios.' },
          { status: 403 }
        );
      }
    }

    // Get the booking directly (O(1) instead of fetching all bookings)
    const booking = await getBookingById(bookingId);
    const effectiveUserId = userId || booking?.user_id || authUser.id;

    // Crear el pago en la subcolección
    const paymentId = await createPayment(bookingId, {
      user_id: effectiveUserId,
      amount: parseFloat(amount) || 0,
      type: type || 'remaining',
      method,
      status: status || 'completed',
      external_ref: externalRef || null,
    });

    // Si es pago restante, actualizar la reserva
    if (type === 'remaining' && booking) {
      const newAdvance = (booking.advance_amount || 0) + (parseFloat(amount) || 0);
      let newRemaining = (booking.total_price || 0) - newAdvance;
      let newStatus = booking.status || 'partially_paid';

      if (newRemaining <= 0) {
        newRemaining = 0;
        newStatus = 'fully_paid';
      }

      await updateBooking(bookingId, {
        advance_amount: newAdvance,
        remaining_amount: newRemaining,
        status: newStatus,
      });
    }

    // Si es adelanto, actualizar estado de la reserva
    if (type === 'advance' && booking) {
      await updateBooking(bookingId, {
        status: 'partially_paid',
        slot_status: 'reserved',
        payment_method: method,
        advance_amount: parseFloat(amount) || 0,
      });
    }

    return NextResponse.json({ id: paymentId, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}
