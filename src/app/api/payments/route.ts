import { NextRequest, NextResponse } from 'next/server';
import { createPayment, updateBooking, getBookingById, getPayments } from '@/lib/db';
import { requireAnyAuth } from '@/lib/auth-middleware';
import { isFirebaseAvailable } from '@/lib/firebase-check';

/**
 * Calculate booking status based on amounts paid vs total.
 * - advanceAmount == 0 → 'reserved' (no payment yet)
 * - advanceAmount > 0 && remainingAmount > 0 → 'partial_payment' (Pago Parcial)
 * - remainingAmount <= 0 → 'confirmed' (Pagado / Confirmado)
 */
function computeBookingStatus(advanceAmount: number, totalPrice: number): string {
  if (totalPrice <= 0) return 'reserved';
  if (advanceAmount <= 0) return 'reserved';
  const remaining = totalPrice - advanceAmount;
  if (remaining <= 0) return 'confirmed'; // 100% paid → "Pagado"
  return 'partial_payment'; // partial → "Pago Parcial"
}

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
    const paymentAmount = parseFloat(amount) || 0;

    // Crear el pago en la subcolección
    const paymentId = await createPayment(bookingId, {
      user_id: effectiveUserId,
      amount: paymentAmount,
      type: type || 'remaining',
      method,
      status: status || 'completed',
      external_ref: externalRef || null,
    });

    // Auto-update booking status and amounts based on payment
    if (booking) {
      let newAdvance = booking.advance_amount || 0;

      if (type === 'advance' || type === 'remaining') {
        newAdvance = newAdvance + paymentAmount;
      }

      const newRemaining = Math.max(0, (booking.total_price || 0) - newAdvance);
      const newStatus = computeBookingStatus(newAdvance, booking.total_price || 0);

      const updateData: Record<string, unknown> = {
        advance_amount: newAdvance,
        remaining_amount: newRemaining,
        status: newStatus,
      };

      // Set payment_method on first advance payment
      if (type === 'advance' && method) {
        updateData.payment_method = method;
      }

      await updateBooking(bookingId, updateData);

      console.log(`[PAYMENT] Booking ${bookingId}: ${type} S/${paymentAmount.toFixed(2)} via ${method} → status=${newStatus}, advance=${newAdvance}, remaining=${newRemaining}`);
    }

    return NextResponse.json({ id: paymentId, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}

/**
 * GET /api/payments?bookingId=xxx
 * Returns the payment history for a specific booking.
 * Requires authentication. Users can only see their own payments; admins can see all.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAnyAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const authUser = authResult.user;

    if (!isFirebaseAvailable()) {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
    }

    // Verify ownership (non-admin)
    if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
      const booking = await getBookingById(bookingId);
      if (!booking || booking.user_id !== authUser.id) {
        return NextResponse.json({ error: 'No puedes ver pagos de otras reservas.' }, { status: 403 });
      }
    }

    const payments = await getPayments(bookingId);

    // Transform to camelCase
    const mapped = payments.map((p) => ({
      id: p.id,
      bookingId: p.booking_id,
      userId: p.user_id,
      amount: p.amount || 0,
      type: p.type,
      method: p.method,
      status: p.status,
      externalRef: p.external_ref,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('[PAYMENTS GET] error:', error);
    return NextResponse.json({ error: 'Error al obtener pagos' }, { status: 500 });
  }
}
