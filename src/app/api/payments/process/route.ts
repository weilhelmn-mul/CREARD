// ============================================================
// CREARD - API Route: /api/payments/process
// Procesa pagos reales con Culqi (cargos con tarjeta/Yape/Plin)
// Solo acepta tokens generados por Culqi Checkout v4
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  createPayment,
  getBookingById,
  updateBooking,
  getPayments,
} from '@/lib/db';
import {
  createCharge,
  isCulqiConfigured,
  getPaymentMethodLabel,
  CulqiApiError,
} from '@/lib/culqi';
import { requireAnyAuth } from '@/lib/auth-middleware';
import { isFirebaseAvailable } from '@/lib/firebase-check';

export async function POST(request: NextRequest) {
  try {
    // ── 1. Autenticación ──
    const authResult = await requireAnyAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const authUser = authResult.user;

    const body = await request.json();
    const {
      culqiToken,
      bookingId,
      amount,
      type,           // 'advance' | 'remaining'
      email,
      deviceFingerprint,
    } = body;

    // ── 2. Validaciones de campos obligatorios ──
    if (!culqiToken) {
      return NextResponse.json(
        { error: 'Token de Culqi es requerido.' },
        { status: 400 }
      );
    }

    if (!bookingId) {
      return NextResponse.json(
        { error: 'ID de reserva es requerido.' },
        { status: 400 }
      );
    }

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor a cero.' },
        { status: 400 }
      );
    }

    // ── 3. Demo mode ──
    if (!isFirebaseAvailable()) {
      return NextResponse.json({
        id: `pay-${Date.now()}`,
        success: true,
        demo: true,
        message: 'Demo: pago registrado sin procesar.',
      }, { status: 201 });
    }

    // ── 4. Verificar configuración de Culqi ──
    if (!isCulqiConfigured()) {
      // Demo mode: simular pago exitoso sin llave privada Culqi
      console.log('[PAYMENT] Culqi no configurado - registrando pago en modo demo.');

      const demoPaymentId = `pay-demo-${Date.now()}`;
      const demoChargeId = `chr_demo_${Date.now()}`;
      const paymentAmountSoles = parseFloat(amount);
      const demoMethod = type === 'advance' ? 'Tarjeta Visa (Demo)' : 'Yape (Demo)';
      const demoStatus = 'completed';

      // Registrar pago demo en Firestore (si Firebase disponible)
      try {
        const booking = await getBookingById(bookingId);
        if (booking) {
          await createPayment(bookingId, {
            user_id: authUser.id,
            amount: paymentAmountSoles,
            type: type || 'remaining',
            method: demoMethod,
            status: demoStatus,
            external_ref: demoChargeId,
          });

          // Actualizar reserva
          if (type === 'remaining') {
            const newAdvance = (booking.advance_amount || 0) + paymentAmountSoles;
            let newRemaining = (booking.total_price || 0) - newAdvance;
            let newStatus = booking.status || 'partially_paid';
            if (newRemaining <= 0.5) { newRemaining = 0; newStatus = 'fully_paid'; }
            await updateBooking(bookingId, {
              advance_amount: Math.round(newAdvance * 100) / 100,
              remaining_amount: Math.round(Math.max(0, newRemaining) * 100) / 100,
              status: newStatus,
            });
          } else if (type === 'advance') {
            await updateBooking(bookingId, {
              status: 'partially_paid',
              slot_status: 'reserved',
              payment_method: demoMethod,
              advance_amount: paymentAmountSoles,
              remaining_amount: (booking.total_price || 0) - paymentAmountSoles,
            });
          }
        }
      } catch (dbErr) {
        console.warn('[PAYMENT] Demo payment: no se pudo guardar en BD:', dbErr);
      }

      return NextResponse.json({
        id: demoPaymentId,
        success: true,
        demo: true,
        chargeId: demoChargeId,
        state: 'completed',
        amount: paymentAmountSoles,
        method: demoMethod,
        outcome: 'Pago registrado en modo demo. Configura CULQI_API_KEY para pagos reales.',
      }, { status: 201 });
    }

    // ── 5. Verificar la reserva existe ──
    const booking = await getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: 'La reserva no existe.' },
        { status: 404 }
      );
    }

    // ── 6. Verificar propiedad (solo usuarios no-admin) ──
    if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
      if (booking.user_id !== authUser.id) {
        return NextResponse.json(
          { error: 'No puedes pagar reservas de otros usuarios.' },
          { status: 403 }
        );
      }
    }

    // ── 7. Validar estado de la reserva ──
    const validStatuses = ['pending', 'confirmed', 'partially_paid'];
    if (!validStatuses.includes(booking.status as string)) {
      return NextResponse.json(
        { error: `La reserva no permite pagos (estado actual: ${booking.status}).` },
        { status: 400 }
      );
    }

    // ── 8. Validar monto ──
    const paymentAmount = Math.round(parseFloat(amount) * 100); // Convertir a céntimos
    const amountInSoles = parseFloat(amount);

    if (type === 'remaining') {
      const remaining = (booking.remaining_amount || 0);
      if (amountInSoles > remaining + 0.5) { // Tolerancia de 0.5 soles por redondeo
        return NextResponse.json(
          { error: `El monto excede el saldo pendiente (S/ ${remaining.toFixed(2)}).` },
          { status: 400 }
        );
      }
    }

    if (type === 'advance') {
      const total = (booking.total_price || 0);
      if (amountInSoles > total) {
        return NextResponse.json(
          { error: `El adelanto no puede exceder el total (S/ ${total.toFixed(2)}).` },
          { status: 400 }
        );
      }
    }

    // ── 9. Verificar pagos duplicados ──
    const existingPayments = await getPayments(bookingId);
    const recentPayment = existingPayments.find((p: any) => {
      if (p.status !== 'pending') return false;
      const created = p.created_at?.toMillis?.() || new Date(p.created_at).getTime();
      return (Date.now() - created) < 5 * 60 * 1000; // 5 minutos
    });
    if (recentPayment) {
      return NextResponse.json(
        { error: 'Ya existe un pago pendiente para esta reserva. Espera unos minutos.' },
        { status: 409 }
      );
    }

    // ── 10. Crear el cargo en Culqi ──
    const chargeDescription = type === 'advance'
      ? `CREARD - Adelanto Reserva #${bookingId.substring(0, 8)}`
      : `CREARD - Pago Restante Reserva #${bookingId.substring(0, 8)}`;

    const userEmail = email || authUser.email || '';

    let charge;
    try {
      charge = await createCharge(
        culqiToken,
        paymentAmount,
        userEmail,
        chargeDescription,
        {
          booking_id: bookingId,
          user_id: authUser.id,
          payment_type: type,
        }
      );
    } catch (error) {
      if (error instanceof CulqiApiError) {
        console.error(`[PAYMENT] Error de Culqi: ${error.code} - ${error.message}`);

        // Mapear errores comunes a mensajes en español
        const userMessages: Record<string, string> = {
          'invalid_expiry_month': 'La fecha de expiración de la tarjeta es inválida.',
          'invalid_expiry_year': 'El año de expiración de la tarjeta es inválido.',
          'card_declined': 'La tarjeta fue rechazada. Intenta con otro método de pago.',
          'insufficient_funds': 'Fondos insuficientes en la tarjeta.',
          'invalid_number': 'El número de tarjeta es inválido.',
          'expired_card': 'La tarjeta ha expirado.',
          'processing_error': 'Error al procesar el pago. Intenta nuevamente.',
          'stolen_card': 'La tarjeta fue reportada como robada.',
          'lost_card': 'La tarjeta fue reportada como perdida.',
          'restricted_card': 'La tarjeta tiene restricciones para compras en línea.',
          'invalid_cvv': 'El código de seguridad (CVV) es inválido.',
          'invalid_email': 'El email es inválido.',
        };

        const userMessage = userMessages[error.code] || error.message;
        return NextResponse.json(
          { error: userMessage, code: error.code },
          { status: error.statusCode || 400 }
        );
      }
      throw error; // Re-lanzar errores no esperados
    }

    // ── 11. Determinar estado del pago según Culqi ──
    const paymentStatus = charge.state === 'completed' ? 'completed'
      : charge.state === 'pending' ? 'pending'
      : charge.state === 'authorized' ? 'completed'
      : 'failed';

    const paymentMethod = getPaymentMethodLabel(
      charge.source?.type || 'card',
      charge.source?.brand
    );

    // ── 12. Registrar el pago en Firestore ──
    const paymentId = await createPayment(bookingId, {
      user_id: authUser.id,
      amount: amountInSoles,
      type: type || 'remaining',
      method: paymentMethod,
      status: paymentStatus,
      external_ref: charge.id,
    });

    // ── 13. Actualizar la reserva según el tipo de pago ──
    if (paymentStatus === 'completed' && booking) {
      if (type === 'remaining') {
        const newAdvance = (booking.advance_amount || 0) + amountInSoles;
        let newRemaining = (booking.total_price || 0) - newAdvance;
        let newStatus = booking.status || 'partially_paid';

        if (newRemaining <= 0.5) { // Tolerancia de 0.5 soles
          newRemaining = 0;
          newStatus = 'fully_paid';
        }

        await updateBooking(bookingId, {
          advance_amount: Math.round(newAdvance * 100) / 100,
          remaining_amount: Math.round(Math.max(0, newRemaining) * 100) / 100,
          status: newStatus,
        });
      } else if (type === 'advance') {
        await updateBooking(bookingId, {
          status: 'partially_paid',
          slot_status: 'reserved',
          payment_method: paymentMethod,
          advance_amount: amountInSoles,
          remaining_amount: (booking.total_price || 0) - amountInSoles,
        });
      }
    }

    // ── 14. Respuesta exitosa ──
    return NextResponse.json({
      id: paymentId,
      success: true,
      chargeId: charge.id,
      state: charge.state,
      amount: amountInSoles,
      method: paymentMethod,
      outcome: charge.outcome?.user_message || 'Pago procesado exitosamente.',
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('[PAYMENT] Error procesando pago:', error);
    const message = error instanceof Error ? error.message : 'Error interno al procesar el pago.';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
