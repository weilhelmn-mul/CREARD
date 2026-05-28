// ============================================================
// CREARD - API Route: /api/webhooks/culqi
// Recibe notificaciones de Culqi sobre cambios de estado de cargos
// Culqi envía webhooks cuando: cargo exitoso, fallido, expirado
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  updatePaymentStatus,
  updateBooking,
  getBookingById,
  findPaymentByExternalRef,
} from '@/lib/db';
import { verifyWebhookSignature, getPaymentMethodLabel } from '@/lib/culqi';

export async function POST(request: NextRequest) {
  try {
    // ── 1. Obtener el body raw para verificación de firma ──
    const rawBody = await request.text();
    let eventData: Record<string, any>;

    try {
      eventData = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'JSON inválido.' },
        { status: 400 }
      );
    }

    const signatureHeader = request.headers.get('x-culqi-signature') || '';

    console.log(`[WEBHOOK] Evento recibido: ${eventData.type || 'desconocido'}`);
    console.log(`[WEBHOOK] Charge ID: ${eventData.data?.id || 'N/A'}`);

    // ── 2. Verificar autenticidad del webhook ──
    if (!verifyWebhookSignature(rawBody, signatureHeader)) {
      console.warn('[WEBHOOK] Firma inválida - webhook rechazado.');
      return NextResponse.json(
        { error: 'Firma inválida.' },
        { status: 401 }
      );
    }

    // ── 3. Procesar según tipo de evento ──
    const eventType = eventData.type;
    const chargeData = eventData.data;

    if (!chargeData || !chargeData.id) {
      console.warn('[WEBHOOK] Evento sin datos de cargo.');
      return NextResponse.json({ received: true });
    }

    const chargeId = chargeData.id;
    const chargeState = chargeData.object === 'charge'
      ? chargeData.state
      : null;

    if (eventType === 'charge.created') {
      console.log(`[WEBHOOK] Cargo creado: ${chargeId}, estado: ${chargeState}`);
      return NextResponse.json({ received: true });
    }

    if (eventType === 'charge.paid' || eventType === 'charge.succeeded') {
      console.log(`[WEBHOOK] Cargo exitoso: ${chargeId}`);
      await handleSuccessfulCharge(chargeId, chargeData);
      return NextResponse.json({ received: true });
    }

    if (eventType === 'charge.failed' || eventType === 'charge.declined') {
      console.log(`[WEBHOOK] Cargo fallido: ${chargeId}, razón: ${chargeData.outcome?.merchant_message || 'N/A'}`);
      await handleFailedCharge(chargeId);
      return NextResponse.json({ received: true });
    }

    if (eventType === 'charge.expired') {
      console.log(`[WEBHOOK] Cargo expirado: ${chargeId}`);
      await handleExpiredCharge(chargeId);
      return NextResponse.json({ received: true });
    }

    if (eventType === 'charge.updated') {
      console.log(`[WEBHOOK] Cargo actualizado: ${chargeId}, estado: ${chargeState}`);
      if (chargeState === 'completed') {
        await handleSuccessfulCharge(chargeId, chargeData);
      } else if (chargeState === 'failed' || chargeState === 'expired') {
        await handleFailedCharge(chargeId);
      }
      return NextResponse.json({ received: true });
    }

    // Evento no manejado - responder 200 para que Culqi no reintente
    console.log(`[WEBHOOK] Evento no manejado: ${eventType}`);
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('[WEBHOOK] Error procesando webhook:', error);
    // Siempre responder 200 para evitar reintentos infinitos de Culqi
    return NextResponse.json({ received: true, error: 'Error interno.' });
  }
}

// ── 4. Handlers de eventos ──

/**
 * Maneja un cargo exitoso: actualiza pago y reserva
 */
async function handleSuccessfulCharge(chargeId: string, chargeData: Record<string, any>) {
  try {
    const result = await findPaymentByExternalRef(chargeId);
    if (!result) {
      console.warn(`[WEBHOOK] No se encontró pago con external_ref: ${chargeId}`);
      return;
    }

    const { bookingId, payment } = result;

    // Actualizar estado del pago a 'completed'
    await updatePaymentStatus(bookingId, payment.id!, 'completed', {
      external_ref: chargeId,
      culqi_state: 'completed',
    });

    // Actualizar la reserva
    const booking = await getBookingById(bookingId);
    if (!booking) return;

    const paymentAmount = payment.amount || 0;

    if (payment.type === 'remaining') {
      const newAdvance = (booking.advance_amount || 0) + paymentAmount;
      let newRemaining = (booking.total_price || 0) - newAdvance;
      let newStatus = booking.status || 'partially_paid';

      if (newRemaining <= 0.5) {
        newRemaining = 0;
        newStatus = 'fully_paid';
      }

      await updateBooking(bookingId, {
        advance_amount: Math.round(newAdvance * 100) / 100,
        remaining_amount: Math.round(Math.max(0, newRemaining) * 100) / 100,
        status: newStatus,
      });
    } else if (payment.type === 'advance') {
      const methodLabel = chargeData?.source
        ? getPaymentMethodLabel(chargeData.source.type, chargeData.source.brand)
        : payment.method;

      await updateBooking(bookingId, {
        status: 'partially_paid',
        slot_status: 'reserved',
        payment_method: methodLabel,
        advance_amount: paymentAmount,
        remaining_amount: (booking.total_price || 0) - paymentAmount,
      });
    }

    console.log(`[WEBHOOK] Reserva ${bookingId} actualizada exitosamente.`);
  } catch (error) {
    console.error(`[WEBHOOK] Error al procesar cargo exitoso ${chargeId}:`, error);
  }
}

/**
 * Maneja un cargo fallido: marca el pago como fallido
 */
async function handleFailedCharge(chargeId: string) {
  try {
    const result = await findPaymentByExternalRef(chargeId);
    if (!result) return;

    const { bookingId, payment } = result;
    await updatePaymentStatus(bookingId, payment.id!, 'failed', {
      external_ref: chargeId,
      culqi_state: 'failed',
    });

    // Si era un adelanto y falló, volver la reserva a 'pending'
    const booking = await getBookingById(bookingId);
    if (booking && payment.type === 'advance' && booking.status === 'partially_paid') {
      const otherPayments = await getPayments(bookingId);
      const completedPayments = otherPayments.filter(
        (p: any) => p.id !== payment.id && p.status === 'completed'
      );
      if (completedPayments.length === 0) {
        await updateBooking(bookingId, {
          status: 'pending',
          slot_status: 'available',
          advance_amount: 0,
          remaining_amount: booking.total_price || 0,
        });
      }
    }

    console.log(`[WEBHOOK] Pago fallido registrado para cargo ${chargeId}.`);
  } catch (error) {
    console.error(`[WEBHOOK] Error al procesar cargo fallido ${chargeId}:`, error);
  }
}

/**
 * Maneja un cargo expirado: marca como expirado
 */
async function handleExpiredCharge(chargeId: string) {
  try {
    const result = await findPaymentByExternalRef(chargeId);
    if (!result) return;

    const { bookingId, payment } = result;
    await updatePaymentStatus(bookingId, payment.id!, 'expired', {
      external_ref: chargeId,
      culqi_state: 'expired',
    });

    console.log(`[WEBHOOK] Pago expirado registrado para cargo ${chargeId}.`);
  } catch (error) {
    console.error(`[WEBHOOK] Error al procesar cargo expirado ${chargeId}:`, error);
  }
}
