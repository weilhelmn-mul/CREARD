import { NextRequest, NextResponse } from 'next/server';
import { createPayment, updateBooking, getBookingById, generatePaymentId, getCourtById, getUserById, logPaymentAudit } from '@/lib/db';
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

    // Generate unique payment ID and audit data
    const payId = await generatePaymentId();

    // Generate booking code from booking ID
    const hash = bookingId.slice(-8).toUpperCase();
    const bookingCode = `CRE-${hash.slice(0, 4)}-${hash.slice(4)}`;

    // Format current date/time in Lima timezone
    const nowLima = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
    const payDateParts = new Date().toLocaleDateString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const payTimeParts = new Date().toLocaleTimeString('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    // Fetch booking data for audit fields
    const bookingData = booking;
    let courtName = '', sport = '', bookingDate = '', startTime = '', endTime = '', totalPrice = 0, userIdForAudit = '';
    if (bookingData) {
      courtName = (bookingData as any).court_name || '';
      sport = (bookingData as any).sport || '';
      bookingDate = bookingData.date || '';
      startTime = bookingData.start_time || '';
      endTime = bookingData.end_time || '';
      totalPrice = bookingData.total_price || 0;
      userIdForAudit = bookingData.user_id || '';
    }

    // Get user info
    let userName = '', userEmail = '', userPhone: string | null = null, userDoc: string | null = null;
    try {
      const u = await getUserById(userIdForAudit);
      if (u) {
        userName = u.name || '';
        userEmail = u.email || '';
        userPhone = u.phone || null;
        userDoc = (u as any).document || null;
      }
    } catch {}

    // Get court name from court_id if not already available
    if (!courtName && bookingData?.court_id) {
      try {
        const c = await getCourtById(bookingData.court_id);
        if (c) courtName = c.name || '';
      } catch {}
    }

    // Payment method display name
    const paymentMethodDisplay =
      method === 'yape_qr' || method === 'YAPE QR' ? 'Yape QR' :
      method === 'culqi' ? 'Culqi' :
      method === 'yape' ? 'Yape' :
      method === 'cash' ? 'Efectivo' :
      method === 'transfer' ? 'Transferencia' :
      method;

    // Crear el pago en la subcolección con datos de auditoría completos
    const paymentId = await createPayment(bookingId, {
      user_id: effectiveUserId,
      amount: parseFloat(amount) || 0,
      type: type || 'remaining',
      method,
      status: status || 'completed',
      external_ref: externalRef || null,
      payment_id: payId,
      booking_code: bookingCode,
      user_name: userName,
      user_email: userEmail,
      user_phone: userPhone,
      user_document: userDoc,
      court_name: courtName,
      sport: sport,
      booking_date: bookingDate,
      booking_start_time: startTime,
      booking_end_time: endTime,
      payment_type: type || 'remaining',
      amount_paid: parseFloat(amount) || 0,
      remaining_balance: 0,
      payment_method_display: paymentMethodDisplay,
      payment_status: status || 'completed',
      payment_date: payDateParts,
      payment_time: payTimeParts,
      total_price: totalPrice,
    });

    // Log payment creation audit trail
    try {
      await logPaymentAudit({
        booking_id: bookingId,
        payment_id: payId,
        action: 'created',
        new_status: status || 'completed',
        performed_by: effectiveUserId,
        performed_by_name: userName || userEmail || effectiveUserId,
        performed_by_role: authUser.role || 'user',
        details: `Pago ${type === 'remaining' ? 'del saldo' : type === 'advance' ? 'adelanto' : type} de S/ ${(parseFloat(amount) || 0).toFixed(2)} registrado para reserva ${bookingCode}. Metodo: ${paymentMethodDisplay}`,
      });
    } catch (auditErr) {
      console.warn('[PAYMENTS] Warning: could not log payment audit:', auditErr);
    }

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
        status: newStatus as any,
      });
    }

    // Si es adelanto, actualizar estado de la reserva
    if (type === 'advance' && booking) {
      await updateBooking(bookingId, {
        status: 'partially_paid' as any,
        slot_status: 'reserved',
        payment_method: method,
        advance_amount: parseFloat(amount) || 0,
      });
    }

    return NextResponse.json({ id: paymentId, paymentId, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}
