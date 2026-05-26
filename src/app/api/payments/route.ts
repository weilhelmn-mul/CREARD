import { NextRequest, NextResponse } from 'next/server';
import { createPayment, getPayments, updateBooking, getBookings } from '@/lib/db';

function isFirebaseAvailable(): boolean {
  try {
    const pk = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
    return pk.length > 20 && !pk.includes('AQUI') && !pk.includes('tu_');
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Determine userId: from body or from booking
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      // Try to find the booking to get the userId
      try {
        const bookings = await getBookings({});
        const booking = bookings.find((b) => b.id === bookingId);
        if (booking) effectiveUserId = booking.user_id;
      } catch { /* ignore */ }
    }

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
    if (type === 'remaining') {
      const bookings = await getBookings({});
      const booking = bookings.find((b) => b.id === bookingId);
      if (booking) {
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
    }

    // Si es adelanto, actualizar estado de la reserva
    if (type === 'advance') {
      const bookings = await getBookings({});
      const booking = bookings.find((b) => b.id === bookingId);
      if (booking) {
        await updateBooking(bookingId, {
          status: 'partially_paid',
          slot_status: 'reserved',
          payment_method: method,
          advance_amount: parseFloat(amount) || 0,
        });
      }
    }

    return NextResponse.json({ id: paymentId, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}
