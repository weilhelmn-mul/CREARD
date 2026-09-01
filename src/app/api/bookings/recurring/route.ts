import { NextRequest, NextResponse } from 'next/server';
import { getBookings, createBooking, updateBooking, getUserById, getBookingById, getCourtById, createRetainedAdvance, createPayment } from '@/lib/db';
import { requireAnyAuth } from '@/lib/auth-middleware';
import { isFirebaseAvailable } from '@/lib/firebase-check';

// ============================================================
// Date Generation Logic
// ============================================================

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const dayNamesShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function generateRecurringDates(params: {
  startDate: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'custom';
  daysOfWeek?: number[];
  endDate?: string;
  count?: number;
}): string[] {
  const dates: string[] = [];
  const start = new Date(params.startDate + 'T00:00:00');
  const end = params.endDate ? new Date(params.endDate + 'T00:00:00') : null;
  const maxCount = params.count || 100;
  // Max 1 year from start
  const maxDate = end || new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);

  if (params.frequency === 'daily') {
    const current = new Date(start);
    while (current <= maxDate && dates.length < maxCount) {
      if (!end || current <= end) {
        dates.push(formatDate(current));
      }
      current.setDate(current.getDate() + 1);
    }
  } else if (params.frequency === 'weekly') {
    const current = new Date(start);
    while (current <= maxDate && dates.length < maxCount) {
      if (!end || current <= end) {
        dates.push(formatDate(current));
      }
      current.setDate(current.getDate() + 7);
    }
  } else if (params.frequency === 'biweekly') {
    const current = new Date(start);
    while (current <= maxDate && dates.length < maxCount) {
      if (!end || current <= end) {
        dates.push(formatDate(current));
      }
      current.setDate(current.getDate() + 14);
    }
  } else if (params.frequency === 'custom' && params.daysOfWeek && params.daysOfWeek.length > 0) {
    const sortedDays = [...params.daysOfWeek].sort();
    const current = new Date(start);
    while (current <= maxDate && dates.length < maxCount) {
      if (sortedDays.includes(current.getDay()) && (!end || current <= end)) {
        dates.push(formatDate(current));
      }
      current.setDate(current.getDate() + 1);
    }
  }

  return dates;
}

// ============================================================
// Migrate status (same as bookings/route.ts)
// ============================================================
function migrateStatus(s: string): string {
  switch (s) {
    case 'confirmed':
    case 'pending':
    case 'partially_paid':
      return 'reserved';
    case 'fully_paid':
    case 'completed':
      return 'completed';
    case 'no_show':
    case 'expired':
      return 'cancelled';
    default:
      return s;
  }
}

// ============================================================
// POST: Preview recurring dates + create batch
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAnyAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const authUser = authResult.user;

    // Only admin/super_admin can create recurring bookings
    if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Solo los administradores pueden crear reservas recurrentes.' }, { status: 403 });
    }

    if (!isFirebaseAvailable()) {
      return NextResponse.json({ error: 'Firebase no configurado' }, { status: 503 });
    }

    const body = await request.json();
    const {
      courtId, courtIds: bodyCourtIds, userId, startTime, endTime,
      startDate, frequency, daysOfWeek,
      endDate, count, totalPrice, advanceAmount,
      status, paymentMethod, notes, dryRun,
      equipmentItems, selectedSlots,
    } = body;

    // Resolve all court IDs (support both single courtId and multi-court courtIds)
    const allCourtIds: string[] = Array.isArray(bodyCourtIds) && bodyCourtIds.length > 0
      ? bodyCourtIds
      : courtId ? [courtId] : [];

    // Validate payment method (restricted set, UPPERCASE)
    const VALID_PAYMENT_METHODS = ['EFECTIVO', 'YAPE', 'PLIN'];
    const normalizedPaymentMethod = VALID_PAYMENT_METHODS.includes(paymentMethod)
      ? paymentMethod
      : 'EFECTIVO';

    if (allCourtIds.length === 0 || !userId || !startTime || !endTime || !startDate || !frequency) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: courtId/courtIds, userId, startTime, endTime, startDate, frequency' },
        { status: 400 }
      );
    }

    if (frequency === 'custom' && (!daysOfWeek || daysOfWeek.length === 0)) {
      return NextResponse.json({ error: 'Para frecuencia personalizada, selecciona al menos un día de la semana.' }, { status: 400 });
    }

    if (!endDate && !count) {
      return NextResponse.json({ error: 'Especifica endDate o count para limitar la recurrencia.' }, { status: 400 });
    }

    // Generate dates
    const dates = generateRecurringDates({
      startDate,
      frequency,
      daysOfWeek: frequency === 'custom' ? daysOfWeek : undefined,
      endDate: endDate || undefined,
      count: count || undefined,
    });

    if (dates.length === 0) {
      return NextResponse.json({ error: 'No se generaron fechas con los parámetros dados.' }, { status: 400 });
    }

    // P0-10 FIX: Server-side price calculation from court rates
    const eqItems = Array.isArray(equipmentItems) ? equipmentItems : [];
    let equipmentSubtotal = 0;
    for (const eq of eqItems) {
      equipmentSubtotal += (eq.quantity || 0) * (eq.unit_price || eq.unitPrice || 0);
    }
    
    let courtPriceTotal = 0;
    for (const cId of allCourtIds) {
      try {
        const court = await getCourtById(cId);
        if (court?.pricing_schedule && Array.isArray(court.pricing_schedule) && court.pricing_schedule.length > 0) {
          for (const slot of court.pricing_schedule) {
            const overlapStart = Math.max(parseFloat(startTime), slot.startHour);
            const overlapEnd = Math.min(parseFloat(endTime), slot.endHour);
            if (overlapStart < overlapEnd) {
              courtPriceTotal += (overlapEnd - overlapStart) * (slot.pricePerHour || court.price_per_hour || 0);
            }
          }
        } else if (court?.price_per_hour) {
          const hours = parseFloat(endTime) - parseFloat(startTime);
          courtPriceTotal += hours * court.price_per_hour;
        }
      } catch (err) {
        console.warn('[RECURRING] Could not calculate court price for', cId);
        const providedTotal = parseFloat(totalPrice) || 0;
        courtPriceTotal = Math.max(0, providedTotal - equipmentSubtotal);
        break;
      }
    }
    const price = courtPriceTotal + equipmentSubtotal;
    const adv = parseFloat(advanceAmount) || price * 0.5;

    // Check each date for conflicts (no time restrictions — admin-only endpoint)
    const previewItems: Array<{
      date: string; dayName: string; available: boolean;
      conflict: { bookingId: string; startTime: string; endTime: string; userName: string; courtName?: string } | undefined;
      price: number;
    }> = [];
    let availableCount = 0;
    let conflictCount = 0;

    for (const date of dates) {
      let conflict: { bookingId: string; startTime: string; endTime: string; userName: string; courtName?: string } | undefined;

      // Check overlap with existing bookings for ALL courts
      for (const cId of allCourtIds) {
        const existing = await getBookings({ courtId: cId, date });
        const overlapping = existing.filter(
          (b) =>
            !['cancelled'].includes(migrateStatus(b.status || '')) &&
            (b.start_time || '') < endTime &&
            (b.end_time || '') > startTime
        );

        if (overlapping.length > 0) {
          const ob = overlapping[0];
          let userName = 'Cliente';
          try {
            if (ob.user_id) {
              const user = await getUserById(ob.user_id as string);
              if (user?.name) userName = user.name as string;
            }
          } catch { /* fallback */ }

          conflict = {
            bookingId: ob.id as string,
            startTime: (ob.start_time as string) || '',
            endTime: (ob.end_time as string) || '',
            userName,
            courtName: cId,
          };
          break; // one conflict is enough to mark this date unavailable
        }
      }

      const available = !conflict?.bookingId;

      if (available) availableCount++;
      else conflictCount++;

      const d = new Date(date + 'T00:00:00');
      previewItems.push({
        date,
        dayName: dayNames[d.getDay()],
        available,
        conflict,
        price,
      });
    }

    // Dry run — return preview without creating
    if (dryRun) {
      return NextResponse.json({
        dates: previewItems,
        totalCount: dates.length,
        availableCount,
        conflictCount,
        totalRevenue: availableCount * price,
      });
    }

    // Create bookings for available dates
    const groupId = crypto.randomUUID();
    const bookingStatus = migrateStatus(status || 'reserved');
    const createdBookings: Array<{ id: string; date: string }> = [];

    // Resolve client email for denormalized search
    let clientEmail = authUser.email;
    try {
      const clientUser = await getUserById(userId);
      if (clientUser?.email) clientEmail = clientUser.email;
    } catch { /* fallback to admin email */ }

    // P0-09 FIX: Create each booking in a Firestore transaction
    const { adminDb: recDb, Timestamp: recTs } = await import('@/lib/firebase-admin');
    
    for (let i = 0; i < dates.length; i++) {
      const item = previewItems[i];
      if (!item.available) continue;

      try {
        const bookingId = await recDb.runTransaction(async (transaction) => {
          // Re-check conflicts inside transaction
          for (const cId of allCourtIds) {
            const existingRef = recDb.collection('bookings')
              .where('date', '==', dates[i])
              .where('court_ids', 'array-contains', cId);
            const existingSnap = await transaction.get(existingRef);
            for (const doc of existingSnap.docs) {
              const b = doc.data();
              if (b.status === 'cancelled') continue;
              if ((b.start_time || '') < endTime && (b.end_time || '') > startTime) {
                throw new Error(`Conflicto en ${dates[i]} para cancha ${cId}`);
              }
            }
          }
          const now = recTs.now();
          const docRef = recDb.collection('bookings').doc();
          transaction.set(docRef, {
            court_id: allCourtIds[0],
            court_ids: allCourtIds,
            user_id: userId,
            user_email: clientEmail,
            date: dates[i],
            start_time: startTime,
            end_time: endTime,
            total_price: price,
            court_subtotal: courtPriceTotal,
            equipment_subtotal: equipmentSubtotal,
            equipment_items: eqItems,
            advance_amount: adv,
            remaining_amount: price - adv,
            status: bookingStatus,
            slot_status: 'available',
            payment_method: normalizedPaymentMethod || null,
            notes: notes || null,
            recurring_group_id: groupId,
            recurring_index: createdBookings.length,
            selected_slots: Array.isArray(selectedSlots) ? selectedSlots : [],
            created_at: now,
            updated_at: now,
          });
          return docRef.id;
        });
        createdBookings.push({ id: bookingId, date: dates[i] });
      } catch (txErr: any) {
        if (txErr?.message?.includes('Conflicto')) {
          console.warn('[RECURRING] Skipping', dates[i], ':', txErr.message);
          continue;
        }
        throw txErr;
      }
    }

    return NextResponse.json({
      dates: previewItems,
      totalCount: dates.length,
      availableCount,
      conflictCount,
      totalRevenue: availableCount * price,
      bookings: createdBookings,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string; stack?: string };
    console.error('[RECURRING] POST error:', err?.message || err);
    console.error('[RECURRING] Stack:', err?.stack || 'no stack');
    return NextResponse.json({
      error: 'Error al procesar reservas recurrentes',
      detail: err?.message || 'Unknown error',
    }, { status: 500 });
  }
}

// ============================================================
// PUT: Cancel series or single date
// ============================================================
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAnyAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const authUser = authResult.user;

    if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Solo los administradores pueden cancelar series recurrentes.' }, { status: 403 });
    }

    if (!isFirebaseAvailable()) {
      return NextResponse.json({ error: 'Firebase no configurado' }, { status: 503 });
    }

    const body = await request.json();
    const { action, recurringGroupId, bookingId, reason, advanceAction } = body;

    if (!action || !recurringGroupId) {
      return NextResponse.json({ error: 'Faltan campos requeridos: action, recurringGroupId' }, { status: 400 });
    }

    // B12: Support retain/refund choice for series cancellation (defaults to 'retained')
    const seriesAdvanceAction = (advanceAction === 'refund') ? 'refunded' : 'retained';
    const seriesPayType = (advanceAction === 'refund') ? 'refund' : 'retained';

    if (action === 'cancel_series') {
      const { adminDb } = await import('@/lib/firebase-admin');
      const snapshot = await adminDb
        .collection('bookings')
        .where('recurring_group_id', '==', recurringGroupId)
        .get();

      let cancelledCount = 0;
      let skippedCompleted = 0;
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const currentStatus = migrateStatus(data.status || '');
        // B2 FIX: Skip completed bookings
        if (currentStatus === 'cancelled' || currentStatus === 'completed') {
          if (currentStatus === 'completed') skippedCompleted++;
          continue;
        }
        // Handle retained advance for bookings with advance > 0
        const advAmount = data.advance_amount || 0;
        if (advAmount > 0) {
          try {
            let courtName = '';
            try {
              const cId = (data.court_ids as string[])?.[0] || (data.court_id as string) || '';
              if (cId) { const court = await getCourtById(cId); courtName = (court?.name as string) || ''; }
            } catch { /* non-critical */ }
            let userName = '';
            try {
              const uId = data.user_id as string;
              if (uId) { const user = await getUserById(uId); userName = (user?.name as string) || ''; }
            } catch { /* non-critical */ }

            // Check for duplicate retained advance
            const { getRetainedAdvances } = await import('@/lib/db');
            const existingRA = await getRetainedAdvances({ bookingId: doc.id });
            if (existingRA.length === 0) {
              await createRetainedAdvance({
                booking_id: doc.id,
                user_id: (data.user_id as string) || '',
                user_name: userName,
                user_email: (data.user_email as string) || null,
                court_name: courtName,
                booking_date: (data.date as string) || '',
                amount: advAmount,
                original_total: (data.total_price as number) || 0,
                payment_method: (data.payment_method as string) || 'EFECTIVO',
                reason: reason || 'Cancelación de serie recurrente',
                status: seriesAdvanceAction,
              });
              await createPayment(doc.id, {
                user_id: (data.user_id as string) || '',
                amount: advAmount,
                type: seriesPayType,
                method: (data.payment_method as string) || 'EFECTIVO',
                status: 'completed',
              });
            } else {
              console.warn('[RECURRING] Retained advance already exists for booking', doc.id, '- skipping');
            }
          } catch (raErr) {
            console.error('[RECURRING] Warning: could not create retained advance for booking', doc.id, raErr);
          }
        }
        await updateBooking(doc.id, { status: 'cancelled' } as any);
        cancelledCount++;
      }

      return NextResponse.json({
        success: true,
        cancelledCount,
        skippedCompleted,
        message: skippedCompleted > 0
          ? `${cancelledCount} reservas canceladas. ${skippedCompleted} completadas fueron omitidas.`
          : `${cancelledCount} reservas canceladas en la serie.`,
      });
    } else if (action === 'cancel_single') {
      if (!bookingId) {
        return NextResponse.json({ error: 'Se requiere bookingId para cancel_single.' }, { status: 400 });
      }

      // Handle retained advance for this booking
      const booking = await getBookingById(bookingId);
      if (booking) {
        // B2 FIX: Prevent cancelling completed bookings
        const currentStatus = migrateStatus((booking.status as string) || '');
        if (currentStatus === 'completed') {
          return NextResponse.json({ error: 'No se puede cancelar una reserva completada.' }, { status: 400 });
        }
        if (currentStatus === 'cancelled') {
          return NextResponse.json({ error: 'Esta reserva ya está cancelada.' }, { status: 400 });
        }
        // B12: Support retain/refund choice
        const singleAdvanceAction = (advanceAction === 'refund') ? 'refunded' : 'retained';
        const singlePayType = (advanceAction === 'refund') ? 'refund' : 'retained';
        const advAmount = (booking.advance_amount as number) || 0;
        if (advAmount > 0) {
          try {
            let courtName = '';
            try {
              const cId = (booking.court_ids as string[])?.[0] || (booking.court_id as string) || '';
              if (cId) { const court = await getCourtById(cId); courtName = (court?.name as string) || ''; }
            } catch { /* non-critical */ }
            let userName = '';
            try {
              const uId = booking.user_id as string;
              if (uId) { const user = await getUserById(uId); userName = (user?.name as string) || ''; }
            } catch { /* non-critical */ }

            // Check for duplicate
            const { getRetainedAdvances } = await import('@/lib/db');
            const existingRA = await getRetainedAdvances({ bookingId });
            if (existingRA.length === 0) {
              await createRetainedAdvance({
                booking_id: bookingId,
                user_id: (booking.user_id as string) || '',
                user_name: userName,
                user_email: (booking.user_email as string) || null,
                court_name: courtName,
                booking_date: (booking.date as string) || '',
                amount: advAmount,
                original_total: (booking.total_price as number) || 0,
                payment_method: (booking.payment_method as string) || 'EFECTIVO',
                reason: reason || 'Cancelación de reserva recurrente',
                status: singleAdvanceAction,
              });
              await createPayment(bookingId, {
                user_id: (booking.user_id as string) || '',
                amount: advAmount,
                type: singlePayType,
                method: (booking.payment_method as string) || 'EFECTIVO',
                status: 'completed',
              });
            } else {
              console.warn('[RECURRING] Retained advance already exists for booking', bookingId, '- skipping');
            }
          } catch (raErr) {
            console.error('[RECURRING] Warning: could not create retained advance for single booking', bookingId, raErr);
          }
        }
      }

      await updateBooking(bookingId, { status: 'cancelled' } as any);

      return NextResponse.json({
        success: true,
        message: 'Reserva cancelada.',
      });
    } else {
      return NextResponse.json({ error: 'Acción no válida. Usa cancel_series o cancel_single.' }, { status: 400 });
    }
  } catch (error) {
    console.error('[RECURRING] PUT error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Error al cancelar reservas recurrentes', detail: msg }, { status: 500 });
  }
}
