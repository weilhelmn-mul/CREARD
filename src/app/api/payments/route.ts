import { NextRequest, NextResponse } from 'next/server';
import { createPayment, getPayments, updateBooking, getBookings } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, userId, amount, type, method, status, externalRef } = body;

    if (!bookingId || !userId || !amount || !type || !method) {
      return NextResponse.json(
        { error: 'bookingId, userId, amount, type, and method are required' },
        { status: 400 }
      );
    }

    // Crear el pago en la subcolección
    const paymentId = await createPayment(bookingId, {
      user_id: userId,
      amount: parseFloat(amount) || 0,
      type: type || 'remaining',
      method,
      status: status || 'completed',
      external_ref: externalRef || null,
    });

    // Si es pago restante, actualizar la reserva
    if (type === 'remaining') {
      const bookings = await getBookings({ courtId: undefined, userId: undefined, date: undefined, status: undefined });
      // Buscar la reserva por ID
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
