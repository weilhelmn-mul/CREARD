import { NextRequest, NextResponse } from 'next/server';
import {
  getBookings,
  createBooking,
  updateBooking,
  getCourtById,
  getUserById,
  createPayment,
} from '@/lib/db';
import { requireAnyAuth, requireAuth } from '@/lib/auth-middleware';
import { isFirebaseAvailable } from '@/lib/firebase-check';

// Migrate old status values to the new 3-status system
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
      return s; // 'reserved', 'completed', 'cancelled' pass through
  }
}

// Transformar snake_case (Firestore) a camelCase (frontend)
function toCamelBooking(b: Record<string, unknown>) {
  // Primary court (backward compat)
  const courtRaw = b._court as Record<string, unknown> | null;
  const court = courtRaw ? {
    id: courtRaw.id || courtRaw.court_id,
    name: courtRaw.name || courtRaw.court_name,
    sport: courtRaw.sport,
    branch: (courtRaw.branch as Record<string, unknown>) || {
      id: courtRaw.branch_id || 'branch-1',
      name: 'CREARD',
    },
  } : null;

  // Additional courts (multi-court bookings)
  const courtsRaw = b._courts as Array<Record<string, unknown>> | null;
  const courts = courtsRaw ? courtsRaw.map((cr) => ({
    id: cr.id || cr.court_id,
    name: cr.name || cr.court_name,
    sport: cr.sport,
    branch: (cr.branch as Record<string, unknown>) || { id: 'branch-1', name: 'CREARD' },
  })) : [];

  const userRaw = b._user as Record<string, unknown> | null;
  const user = userRaw ? {
    id: userRaw.id,
    name: userRaw.name,
    email: userRaw.email,
    phone: userRaw.phone,
  } : null;

  // Court IDs array
  const courtIds: string[] = Array.isArray(b.court_ids) ? b.court_ids : (b.court_id ? [b.court_id] : []);

  // Equipment items
  const equipmentItems = Array.isArray(b.equipment_items) ? b.equipment_items.map((eq: Record<string, unknown>) => ({
    equipmentId: eq.equipment_id || eq.id,
    name: eq.name,
    quantity: eq.quantity || 1,
    unitPrice: eq.unit_price || eq.price_per_rental || 0,
    subtotal: (eq.quantity || 1) * (eq.unit_price || eq.price_per_rental || 0),
  })) : [];

  // Normalize: recalc equipment subtotal from items (more reliable than stored value)
  const computedEquipSubtotal = equipmentItems.reduce((s: number, eq: { subtotal: number }) => s + eq.subtotal, 0);
  const equipmentSubtotal = computedEquipSubtotal;

  // Normalize court_subtotal: if stored value is wrong (old double-counting bug),
  // derive it from total_price - equipment_subtotal
  const totalPrice = b.total_price || 0;
  const storedCourtSubtotal = b.court_subtotal || 0;
  const courtSubtotal = (storedCourtSubtotal + equipmentSubtotal > totalPrice + 0.01)
    ? Math.max(0, Math.round((totalPrice - equipmentSubtotal) * 100) / 100)
    : storedCourtSubtotal;

  // Normalize remaining_amount: ensure it equals total - advance
  const advanceAmount = b.advance_amount || 0;
  const storedRemaining = b.remaining_amount || 0;
  const remainingAmount = (Math.abs(storedRemaining - (totalPrice - advanceAmount)) > 0.01)
    ? Math.max(0, Math.round((totalPrice - advanceAmount) * 100) / 100)
    : storedRemaining;

  return {
    id: b.id,
    courtId: b.court_id,
    courtIds,
    userId: b.user_id,
    date: b.date,
    startTime: b.start_time,
    endTime: b.end_time,
    totalPrice,
    courtSubtotal,
    equipmentSubtotal,
    equipmentItems,
    advanceAmount,
    remainingAmount,
    status: migrateStatus(b.status || 'reserved'),
    slotStatus: b.slot_status,
    paymentMethod: b.payment_method,
    notes: b.notes,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
    recurringGroupId: b.recurring_group_id,
    recurringIndex: b.recurring_index,
    equipmentDelivered: b.equipment_delivered || false,
    equipmentReturned: b.equipment_returned || false,
    court,
    courts,
    user,
  };
}

// Enrich a single booking (all courts + user), safe — never throws
async function safeEnrichBooking(b: Record<string, unknown>): Promise<Record<string, unknown>> {
  let court: Record<string, unknown> | null = null;
  let courts: Array<Record<string, unknown>> = [];
  let user: Record<string, unknown> | null = null;

  // Get all court IDs (from court_ids array or single court_id)
  const allCourtIds: string[] = Array.isArray(b.court_ids)
    ? b.court_ids as string[]
    : (b.court_id ? [b.court_id as string] : []);

  // Enrich primary court (first one)
  try {
    if (allCourtIds.length > 0) {
      const c = await getCourtById(allCourtIds[0]);
      if (c) court = c as Record<string, unknown>;
    }
  } catch (e) {
    console.warn('[BOOKINGS] Failed to load primary court for booking:', b.id, e);
  }

  // Enrich all courts for multi-court bookings
  if (allCourtIds.length > 1) {
    const enrichedCourts: Array<Record<string, unknown>> = [];
    for (const cid of allCourtIds) {
      try {
        const c = await getCourtById(cid);
        if (c) enrichedCourts.push(c as Record<string, unknown>);
      } catch { /* skip failed court enrichment */ }
    }
    courts = enrichedCourts;
  }

  try {
    if (b.user_id) {
      const u = await getUserById(b.user_id as string);
      if (u) user = u as Record<string, unknown>;
    }
  } catch (e) {
    console.warn('[BOOKINGS] Failed to load user for booking:', b.id, e);
  }

  return { ...b, _court: court, _courts: courts, _user: user };
}

// Search bookings by userId OR userEmail, deduplicate
async function searchBookingsForUser(userId: string, userEmail: string | null) {
  const results = new Map<string, Record<string, unknown>>();

  // Always search by userId
  try {
    const byId = await getBookings({ userId });
    for (const b of byId) {
      if (b.id && !results.has(b.id)) {
        results.set(b.id, b as Record<string, unknown>);
      }
    }
  } catch (e) {
    console.error('[BOOKINGS] Error searching by userId:', userId, e);
  }

  // Also search by email to handle demo/Firebase ID mismatches
  if (userEmail && userEmail !== userId) {
    try {
      const byEmail = await getBookings({ userEmail });
      for (const b of byEmail) {
        if (b.id && !results.has(b.id)) {
          results.set(b.id, b as Record<string, unknown>);
        }
      }
    } catch (e) {
      console.error('[BOOKINGS] Error searching by userEmail:', userEmail, e);
    }
  }

  return Array.from(results.values());
}

/**
 * Calculate the total price for a time slot using a pricing schedule.
 * Supports slots that span multiple schedules (e.g., 16:00-19:00 = 1hr morning + 2hr night).
 */
function calculatePriceForTimeSlot(
  schedule: Array<{ label: string; startHour: number; endHour: number; pricePerHour: number }>,
  startTime: string,
  endTime: string,
): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startDecimal = startH + startM / 60;
  const endDecimal = endH + endM / 60;

  // Sort schedule by startHour
  const sorted = [...schedule].sort((a, b) => a.startHour - b.startHour);

  let total = 0;
  let cursor = startDecimal;

  for (const slot of sorted) {
    const slotStart = slot.startHour;
    const slotEnd = slot.endHour;

    if (cursor >= slotEnd) continue; // cursor already past this slot

    // Overlap start/end
    const overlapStart = Math.max(cursor, slotStart);
    const overlapEnd = Math.min(endDecimal, slotEnd);

    if (overlapEnd > overlapStart) {
      const hours = overlapEnd - overlapStart;
      total += hours * slot.pricePerHour;
      cursor = overlapEnd;
    }
  }

  // If cursor didn't reach endDecimal, the remaining time is uncovered by schedule
  // (fall back to 0 or caller's default)
  return Math.round(total * 100) / 100;
}

export async function GET(request: NextRequest) {
  const firebaseOk = isFirebaseAvailable();

  try {
    const { searchParams } = new URL(request.url);
    const courtId = searchParams.get('courtId');
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    // Court availability check (courtId + date) is public — no auth required
    if (courtId && date && !userId) {
      if (!firebaseOk) {
        return NextResponse.json({ error: 'Firebase no configurado', code: 'NO_FIREBASE' }, { status: 503 });
      }
      const bookings = await getBookings({ courtId, date });
      return NextResponse.json(bookings.map(toCamelBooking));
    }

    // All other queries require authentication
    const authResult = await requireAnyAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const authUser = authResult.user;

    if (!firebaseOk) {
      return NextResponse.json({ error: 'Firebase no configurado', code: 'NO_FIREBASE' }, { status: 503 });
    }

    let bookings: Record<string, unknown>[];

    // Non-admin users: only their own bookings
    if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
      if (userId && userId !== authUser.id) {
        return NextResponse.json({ error: 'No puedes ver reservas de otros usuarios.' }, { status: 403 });
      }
      const effectiveUserId = userId || authUser.id;
      bookings = await searchBookingsForUser(effectiveUserId, authUser.email);
    } else {
      // Admin: fetch with optional filters
      bookings = (await getBookings({
        courtId: courtId || undefined,
        userId: userId || undefined,
        date: date || undefined,
        status: status || undefined,
      })) as Record<string, unknown>[];
    }

    // Enrich each booking (safe, per-booking error handling)
    const enriched: Record<string, unknown>[] = [];
    for (const b of bookings) {
      try {
        const raw = await safeEnrichBooking(b);
        enriched.push(toCamelBooking(raw));
      } catch (e) {
        console.error('[BOOKINGS] Error enriching booking:', b.id, e);
        // Still include the booking, just without enrichment
        enriched.push(toCamelBooking(b));
      }
    }

    // Default server-side sort: today first, future ascending, past descending
    // Within each date: chronological time
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    enriched.sort((a, b) => {
      const dA = String(a.date || ''), dB = String(b.date || '');
      const aIsToday = dA === today, bIsToday = dB === today;
      const aFuture = dA > today, bFuture = dB > today;
      const aPast = dA < today, bPast = dB < today;
      // 1) Today always first
      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;
      // 2) Both on same side of today
      if (aFuture && bFuture) {
        // Future dates: ascending (correlativo)
        const dc = dA.localeCompare(dB);
        if (dc !== 0) return dc;
      } else if (aPast && bPast) {
        // Past dates: descending (most recent past first)
        const dc = dB.localeCompare(dA);
        if (dc !== 0) return dc;
      }
      // Same date: chronological by start time
      return String(a.startTime || '').localeCompare(String(b.startTime || ''));
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('[BOOKINGS] GET error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Error al obtener reservas', detail: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAnyAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const authUser = authResult.user;

    if (!isFirebaseAvailable()) {
      return NextResponse.json({ error: 'Firebase no configurado' }, { status: 503 });
    }

    const body = await request.json();
    const {
      courtId,
      courtIds: bodyCourtIds,
      userId,
      date,
      startTime,
      endTime,
      totalPrice,
      advanceAmount,
      remainingAmount,
      status,
      paymentMethod,
      notes,
      equipmentItems,
    } = body;

    // ── Resolve court IDs (support both single courtId and multi-court courtIds) ──
    const allCourtIds: string[] = Array.isArray(bodyCourtIds) && bodyCourtIds.length > 0
      ? bodyCourtIds
      : courtId
        ? [courtId]
        : [];

    // ── Validate payment method (restricted set, UPPERCASE) ──
    const VALID_PAYMENT_METHODS = ['EFECTIVO', 'YAPE', 'PLIN'];
    const normalizedPaymentMethod = VALID_PAYMENT_METHODS.includes(paymentMethod)
      ? paymentMethod
      : 'EFECTIVO';

    if (allCourtIds.length === 0 || !userId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: courtId/courtIds, userId, date, startTime, endTime' },
        { status: 400 }
      );
    }

    // ── Minimum advance validation ──
    // Admin/super_admin: NO time restrictions — can book any slot (walk-in, past, current)
    // Regular users: require 30 min minimum advance
    const isAdmin = authUser.role === 'admin' || authUser.role === 'super_admin';

    if (!isAdmin) {
      const now = new Date();
      const slotDateTime = new Date(`${date}T${startTime}:00`);
      const diffMs = slotDateTime.getTime() - now.getTime();
      const thirtyMinMs = 30 * 60 * 1000;
      if (diffMs < thirtyMinMs) {
        const minsLeft = Math.floor(diffMs / 60000);
        if (minsLeft < 0) {
          return NextResponse.json(
            { error: 'No se puede reservar un horario que ya ha pasado.' },
            { status: 422 }
          );
        }
        return NextResponse.json(
          { error: `La reserva requiere al menos 30 minutos de anticipación. El horario seleccionado comienza en ${minsLeft} minuto${minsLeft === 1 ? '' : 's'}. Selecciona un horario a partir de las ${new Date(now.getTime() + thirtyMinMs).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })} o posterior.` },
          { status: 422 }
        );
      }
    }

    // Non-admin users can only create bookings for themselves
    if (!isAdmin) {
      if (userId !== authUser.id) {
        return NextResponse.json(
          { error: 'No puedes crear reservas para otros usuarios.' },
          { status: 403 }
        );
      }
    }

    // ── Check overlap for ALL courts ──
    const conflicts: Array<{ courtId: string; courtName: string }> = [];
    for (const cId of allCourtIds) {
      const existing = await getBookings({ courtId: cId, date });
      const overlapping = existing.filter(
        (b) => {
          const bCourtIds: string[] = Array.isArray(b.court_ids)
            ? b.court_ids as string[]
            : [b.court_id as string];
          // Skip if this existing booking doesn't include the court we're checking
          if (!bCourtIds.includes(cId)) return false;
          return (
            !['cancelled'].includes(migrateStatus(b.status || '')) &&
            (b.start_time || '') < endTime &&
            (b.end_time || '') > startTime
          );
        }
      );
      if (overlapping.length > 0) {
        let courtName = cId;
        try {
          const c = await getCourtById(cId);
          if (c?.name) courtName = c.name as string;
        } catch { /* use ID */ }
        conflicts.push({ courtId: cId, courtName });
      }
    }

    if (conflicts.length > 0) {
      const conflictNames = conflicts.map((c) => c.courtName).join(', ');
      return NextResponse.json(
        {
          error: `Cancha${conflicts.length > 1 ? 's' : ''} no disponible${conflicts.length > 1 ? 's' : ''}: ${conflictNames}. Por favor selecciona otro horario o cancha.`,
          conflicts,
        },
        { status: 409 }
      );
    }

    // ── Calculate price ──
    // Frontend sends totalPrice as grand total (court + equipment combined).
    // We compute courtSubtotal and equipmentSubtotal separately for storage/display.
    const eqItems = Array.isArray(equipmentItems) ? equipmentItems : [];
    let equipmentSubtotal = 0;
    for (const eq of eqItems) {
      equipmentSubtotal += (eq.quantity || 0) * (eq.unit_price || eq.unitPrice || 0);
    }

    let courtPriceTotal: number;
    const providedTotal = parseFloat(totalPrice) || 0;
    if (providedTotal > 0) {
      // Frontend already included equipment in totalPrice — extract court portion
      courtPriceTotal = Math.max(0, providedTotal - equipmentSubtotal);
    } else {
      // No price from frontend — calculate from court rates
      courtPriceTotal = 0;
      for (const cId of allCourtIds) {
        const court = await getCourtById(cId);
        if (court) {
          const schedule = court.pricing_schedule as Array<{ label: string; startHour: number; endHour: number; pricePerHour: number }> | undefined;
          let courtPrice = 0;
          if (schedule && schedule.length > 0) {
            courtPrice = calculatePriceForTimeSlot(schedule, startTime, endTime);
            if (courtPrice <= 0) courtPrice = (court.price_per_hour as number) || 0;
          } else {
            courtPrice = (court.price_per_hour as number) || 0;
          }
          courtPriceTotal += courtPrice;
        }
      }
    }

    const price = courtPriceTotal + equipmentSubtotal;

    const adv = parseFloat(advanceAmount) || price * 0.5;
    const rem = parseFloat(remainingAmount) || price - adv;
    const bookingStatus = migrateStatus(status || 'reserved');

    // Save to Firestore — single booking with all courts
    const id = await createBooking({
      court_ids: allCourtIds,
      user_id: userId,
      user_email: authUser.email,
      date,
      start_time: startTime,
      end_time: endTime,
      total_price: price,
      court_subtotal: courtPriceTotal,
      equipment_subtotal: equipmentSubtotal,
      equipment_items: eqItems,
      advance_amount: adv,
      remaining_amount: rem,
      status: bookingStatus,
      slot_status: 'available',
      payment_method: normalizedPaymentMethod || null,
      notes: notes || null,
    });

    // Create advance payment record
    try {
      await createPayment(id, {
        user_id: userId,
        amount: adv,
        type: 'advance',
        method: paymentMethod || 'yape',
        status: 'completed',
      });
    } catch (payErr) {
      console.error('[BOOKINGS] Warning: could not create payment record:', payErr);
    }

    return NextResponse.json({
      id,
      courtId: allCourtIds[0],
      courtIds: allCourtIds,
      userId,
      date,
      startTime,
      endTime,
      totalPrice: price,
      advanceAmount: adv,
      remainingAmount: rem,
      status: bookingStatus,
      paymentMethod: paymentMethod || null,
      success: true,
    }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string; stack?: string };
    console.error('[BOOKINGS] POST error:', err?.message || err);
    console.error('[BOOKINGS] Stack:', err?.stack || 'no stack');
    return NextResponse.json({
      error: 'Failed to create booking',
      detail: err?.message || 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAnyAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const authUser = authResult.user;

    if (!isFirebaseAvailable()) {
      return NextResponse.json({ error: 'Firebase no configurado' }, { status: 503 });
    }

    const body = await request.json();
    const { id, status, slot_status, advanceAmount: reqAdvance, remainingAmount: reqRemaining, paymentMethod: reqPaymentMethod, equipmentDelivered, equipmentReturned } = body;

    if (!id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Non-admin users can only cancel their own bookings
    if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
      if (status === 'cancelled') {
        // Verify the booking belongs to the user (by both userId and email)
        const bookings = await searchBookingsForUser(authUser.id, authUser.email);
        const booking = bookings.find((b) => b.id === id);
        if (!booking) {
          return NextResponse.json(
            { error: 'No puedes modificar reservas de otros usuarios.' },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Solo puedes cancelar tus propias reservas.' },
          { status: 403 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = migrateStatus(status);
    if (slot_status) updateData.slot_status = slot_status;
    if (typeof reqAdvance === 'number') updateData.advance_amount = reqAdvance;
    if (typeof reqRemaining === 'number') updateData.remaining_amount = reqRemaining;
    if (reqPaymentMethod) {
      const VALID_PM = ['EFECTIVO', 'YAPE', 'PLIN'];
      updateData.payment_method = VALID_PM.includes(reqPaymentMethod) ? reqPaymentMethod : 'EFECTIVO';
    }
    if (typeof equipmentDelivered === 'boolean') updateData.equipment_delivered = equipmentDelivered;
    if (typeof equipmentReturned === 'boolean') updateData.equipment_returned = equipmentReturned;

    await updateBooking(id, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[BOOKINGS] PUT error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Error al actualizar reserva', detail: msg }, { status: 500 });
  }
}
