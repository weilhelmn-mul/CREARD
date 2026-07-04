import { NextRequest, NextResponse } from 'next/server';
import {
  getBookings,
  createBooking,
  updateBooking,
  deleteDocById,
  getCourtById,
  getUserById,
  getBookingById,
  createPayment,
  createRetainedAdvance,
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
    date: typeof b.date === 'string' ? b.date : (b.date ? String(b.date) : ''),
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
  const startTime = Date.now();
  const firebaseOk = isFirebaseAvailable();

  try {
    const { searchParams } = new URL(request.url);
    const courtId = searchParams.get('courtId');
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
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
      // Admin: fetch with optional filters (date range for performance)
      bookings = (await getBookings({
        courtId: courtId || undefined,
        userId: userId || undefined,
        date: date || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: status || undefined,
      })) as Record<string, unknown>[];
      console.log(`[BOOKINGS] Firestore returned ${bookings.length} raw docs (dateFrom=${dateFrom}, dateTo=${dateTo})`);
      if (bookings.length > 0) {
        console.log(`[BOOKINGS] Sample raw date field: id=${bookings[0].id}, date=${JSON.stringify(bookings[0].date)}, type=${typeof bookings[0].date}`);
      }
    }

    // Enrich each booking with cached court/user lookups (avoid N+1 Firestore reads)
    const courtCache = new Map<string, Record<string, unknown> | null>();
    const userCache = new Map<string, Record<string, unknown> | null>();
    const getCourtCached = async (cid: string) => {
      if (courtCache.has(cid)) return courtCache.get(cid)!;
      try {
        const c = await getCourtById(cid);
        courtCache.set(cid, c as Record<string, unknown> | null);
        return c as Record<string, unknown> | null;
      } catch { courtCache.set(cid, null); return null; }
    };
    const getUserCached = async (uid: string) => {
      if (userCache.has(uid)) return userCache.get(uid)!;
      try {
        const u = await getUserById(uid);
        userCache.set(uid, u as Record<string, unknown> | null);
        return u as Record<string, unknown> | null;
      } catch { userCache.set(uid, null); return null; }
    };

    const enriched: Record<string, unknown>[] = [];
    // Process in batches of 10 to avoid overwhelming Firestore
    const BATCH_SIZE = 10;
    for (let i = 0; i < bookings.length; i += BATCH_SIZE) {
      const batch = bookings.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (b) => {
          const allCourtIds: string[] = Array.isArray(b.court_ids)
            ? b.court_ids as string[] : (b.court_id ? [b.court_id as string] : []);
          let court: Record<string, unknown> | null = null;
          let courts: Array<Record<string, unknown>> = [];
          let user: Record<string, unknown> | null = null;
          try {
            if (allCourtIds.length > 0) court = await getCourtCached(allCourtIds[0]);
          } catch { /* skip */ }
          if (allCourtIds.length > 1) {
            const enrichedCourts: Array<Record<string, unknown>> = [];
            for (const cid of allCourtIds) {
              try {
                const c = await getCourtCached(cid);
                if (c) enrichedCourts.push(c);
              } catch { /* skip */ }
            }
            courts = enrichedCourts;
          }
          try {
            if (b.user_id) user = await getUserCached(b.user_id as string);
          } catch { /* skip */ }
          return toCamelBooking({ ...b, _court: court, _courts: courts, _user: user });
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled') {
          enriched.push(r.value);
        } else {
          console.error('[BOOKINGS] Batch enrichment error:', r.reason);
        }
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

    console.log(`[BOOKINGS] GET: ${enriched.length} bookings returned in ${Date.now() - startTime}ms (auth=${authUser.role}, filters: courtId=${courtId||'all'}, date=${date||'all'}, status=${status||'all'})`);

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

    // B15 FIX: Re-check conflicts right before creation (optimistic concurrency)
    for (const cId of allCourtIds) {
      const recheck = await getBookings({ courtId: cId, date });
      const stillConflicts = recheck.filter(
        (b) => {
          const bCourtIds: string[] = Array.isArray(b.court_ids)
            ? b.court_ids as string[]
            : [b.court_id as string];
          if (!bCourtIds.includes(cId)) return false;
          return (
            !['cancelled'].includes(migrateStatus(b.status || '')) &&
            (b.start_time || '') < endTime &&
            (b.end_time || '') > startTime
          );
        }
      );
      if (stillConflicts.length > 0) {
        let courtName = cId;
        try {
          const c = await getCourtById(cId);
          if (c?.name) courtName = c.name as string;
        } catch { /* use ID */ }
        return NextResponse.json(
          { error: `Horario ocupado en ${courtName}. Alguien reservó mientras completabas el formulario. Intenta de nuevo.`, conflicts: [{ courtId: cId, courtName }] },
          { status: 409 }
        );
      }
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

    // B4 FIX: Validate advance + remaining === total consistency
    const adv = parseFloat(advanceAmount) || price * 0.5;
    let rem = parseFloat(remainingAmount) || price - adv;
    // Force consistency: remaining must equal total - advance
    rem = Math.max(0, Math.round((price - adv) * 100) / 100);
    const bookingStatus = migrateStatus(status || 'reserved');

    // Resolve client email for denormalized search
    let clientEmail = authUser.email;
    try {
      const clientUser = await getUserById(userId);
      if (clientUser?.email) clientEmail = clientUser.email;
    } catch { /* fallback to admin email */ }

    // Save to Firestore — single booking with all courts
    const id = await createBooking({
      court_ids: allCourtIds,
      user_id: userId,
      user_email: clientEmail,
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

    console.log(`[BOOKINGS] POST: Created booking ${id} for user=${userId} date=${date} ${startTime}-${endTime} courts=${allCourtIds.join(',')} total=${price} advance=${adv} remaining=${rem} method=${normalizedPaymentMethod} email=${clientEmail}`);

    // B5 FIX: Only create payment record if advance > 0
    if (adv > 0.01) {
      try {
        await createPayment(id, {
          user_id: userId,
          amount: adv,
          type: 'advance',
          method: normalizedPaymentMethod || 'EFECTIVO',
          status: 'completed',
        });
      } catch (payErr) {
        console.error('[BOOKINGS] Warning: could not create payment record:', payErr);
      }
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
    const { id, status, slot_status, advanceAmount: reqAdvance, remainingAmount: reqRemaining, paymentMethod: reqPaymentMethod, equipmentDelivered, equipmentReturned, advanceAction, cancelReason, endTime: reqEndTime, totalPrice: reqTotalPrice, extendTime, editTime, editBooking, startTime: reqStartTime, date: reqDate, courtIds: reqCourtIds, userId: reqUserId, notes: reqNotes, equipmentItems: reqEquipmentItems } = body;

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

    // Extend time: update end_time and total_price, create payment record
    if (extendTime && reqEndTime && reqTotalPrice) {
      // Validate: new end must be after current end
      const booking = await getBookingById(id);
      if (booking) {
        const currentEnd = booking.end_time as string || '';
        if (reqEndTime <= currentEnd) {
          return NextResponse.json({ error: 'La nueva hora de fin debe ser posterior a la actual' }, { status: 400 });
        }
        // Check for conflicts with other bookings (same court, same date, overlapping time)
        const allCourtIds: string[] = Array.isArray(booking.court_ids) ? booking.court_ids : (booking.court_id ? [booking.court_id] : []);
        const bookingDate = booking.date as string;
        if (allCourtIds.length > 0 && bookingDate) {
          // B10 FIX: Filter by date and courts instead of fetching ALL bookings
          const conflictQueries = allCourtIds.map(cid => getBookings({ courtId: cid, date: bookingDate }));
          const conflictResults = await Promise.all(conflictQueries);
          const allConflicting = conflictResults.flat();
          const conflicts = allConflicting.filter((ob: Record<string, unknown>) => {
            const obId = ob.id as string;
            if (obId === id) return false;
            // B9 FIX: Use migrateStatus for legacy status values
            if (migrateStatus(ob.status || '') === 'cancelled') return false;
            if (ob.date !== bookingDate) return false;
            const obCourtIds: string[] = Array.isArray(ob.court_ids) ? ob.court_ids : (ob.court_id ? [ob.court_id] : []);
            if (!obCourtIds.some((cid: string) => allCourtIds.includes(cid))) return false;
            return (ob.start_time as string) < reqEndTime && (ob.end_time as string) > (booking.start_time as string);
          });
          // Filter to only real conflicts (overlapping with the NEW extended period)
          const realConflicts = conflicts.filter((ob: Record<string, unknown>) => {
            return (ob.start_time as string) < reqEndTime && (ob.end_time as string) > currentEnd;
          });
          if (realConflicts.length > 0) {
            return NextResponse.json({ error: 'Hay una reserva que ocupa ese horario. No se puede extender.' }, { status: 409 });
          }
        }

        const extraCost = Math.max(0, (reqTotalPrice - ((booking.total_price as number) || 0)));
        updateData.end_time = reqEndTime;
        updateData.total_price = reqTotalPrice;

        // If admin collected payment for the extension, create a payment record
        if (typeof reqAdvance === 'number' && extraCost > 0.01) {
          const prevAdvance = (booking.advance_amount as number) || 0;
          const paymentIncrement = reqAdvance - prevAdvance;
          if (paymentIncrement > 0.01) {
            try {
              await createPayment(id, {
                user_id: booking.user_id as string,
                amount: paymentIncrement,
                type: 'extension',
                method: (reqPaymentMethod as string) || 'EFECTIVO',
                status: 'completed',
              });
            } catch (payErr) {
              console.error('[BOOKINGS] Warning: could not create payment record for extension:', payErr);
            }
          }
        }
      }
    }

    // Edit booking (super_admin only): change any field
    if (editBooking) {
      if (authUser.role !== 'super_admin') {
        return NextResponse.json({ error: 'Solo el super administrador puede editar reservas.' }, { status: 403 });
      }

      const booking = await getBookingById(id);
      if (!booking) {
        return NextResponse.json({ error: 'Reserva no encontrada.' }, { status: 404 });
      }

      // Don't allow editing completed or cancelled bookings (unless only changing notes/status)
      const bStatus = migrateStatus(booking.status || 'reserved');
      const hasTimeOrCourtChange = reqStartTime || reqEndTime || reqDate || (reqCourtIds && reqCourtIds.length > 0);
      if ((bStatus === 'completed' || bStatus === 'cancelled') && hasTimeOrCourtChange) {
        return NextResponse.json({ error: 'No se puede editar el horario/cancha de una reserva completada o cancelada.' }, { status: 400 });
      }

      // Validate time if provided
      if (reqStartTime && reqEndTime) {
        if (reqStartTime >= reqEndTime) {
          return NextResponse.json({ error: 'La hora de inicio debe ser anterior a la hora de fin.' }, { status: 400 });
        }
      }

      // Date & time
      if (reqDate) updateData.date = reqDate;
      if (reqStartTime) updateData.start_time = reqStartTime;
      if (reqEndTime) updateData.end_time = reqEndTime;

      // Court change
      if (reqCourtIds && Array.isArray(reqCourtIds) && reqCourtIds.length > 0) {
        updateData.court_ids = reqCourtIds;
        updateData.court_id = reqCourtIds[0]; // backward compat
      }

      // Client change
      if (reqUserId) {
        updateData.user_id = reqUserId;
      }

      // Notes
      if (reqNotes !== undefined) {
        updateData.notes = reqNotes;
      }

      // Equipment items
      if (reqEquipmentItems && Array.isArray(reqEquipmentItems)) {
        const equipSub = reqEquipmentItems.reduce((s: number, eq: Record<string, unknown>) => s + ((eq.quantity as number) || 0) * ((eq.unit_price as number) || 0), 0);
        updateData.equipment_items = reqEquipmentItems;
        updateData.equipment_subtotal = Math.round(equipSub * 100) / 100;
      }

      // Price fields
      if (typeof reqTotalPrice === 'number' && reqTotalPrice > 0) {
        updateData.total_price = reqTotalPrice;
        const currentAdvance = typeof reqAdvance === 'number' ? reqAdvance : (booking.advance_amount as number) || 0;
        updateData.advance_amount = Math.min(currentAdvance, reqTotalPrice);
        updateData.remaining_amount = Math.max(0, Math.round((reqTotalPrice - currentAdvance) * 100) / 100);
        // Recalc court_subtotal
        const equipSub = (updateData.equipment_subtotal as number) || (booking.equipment_subtotal as number) || 0;
        updateData.court_subtotal = Math.max(0, Math.round((reqTotalPrice - equipSub) * 100) / 100);
      } else if (typeof reqAdvance === 'number') {
        // Only advance changed, not total
        const currentTotal = (booking.total_price as number) || 0;
        updateData.advance_amount = reqAdvance;
        updateData.remaining_amount = Math.max(0, Math.round((currentTotal - reqAdvance) * 100) / 100);
      }

      // Payment method
      if (reqPaymentMethod) {
        const VALID_PM = ['EFECTIVO', 'YAPE', 'PLIN'];
        updateData.payment_method = VALID_PM.includes(reqPaymentMethod) ? reqPaymentMethod : 'EFECTIVO';
      }

      // Conflict check (only if time or court or date changed)
      const finalCourtIds: string[] = (updateData.court_ids as string[]) || (Array.isArray(booking.court_ids) ? booking.court_ids : (booking.court_id ? [booking.court_id] : []));
      const finalDate = (updateData.date as string) || (booking.date as string);
      const finalStart = (updateData.start_time as string) || (booking.start_time as string);
      const finalEnd = (updateData.end_time as string) || (booking.end_time as string);

      if (finalCourtIds.length > 0 && finalDate && finalStart && finalEnd) {
        const conflictQueries = finalCourtIds.map(cid => getBookings({ courtId: cid, date: finalDate }));
        const conflictResults = await Promise.all(conflictQueries);
        const allConflicting = conflictResults.flat();
        const conflicts = allConflicting.filter((ob: Record<string, unknown>) => {
          const obId = ob.id as string;
          if (obId === id) return false;
          if (migrateStatus(ob.status || '') === 'cancelled') return false;
          const obCourtIds: string[] = Array.isArray(ob.court_ids) ? ob.court_ids : (ob.court_id ? [ob.court_id] : []);
          if (!obCourtIds.some((cid: string) => finalCourtIds.includes(cid))) return false;
          return (ob.start_time as string) < finalEnd && (ob.end_time as string) > finalStart;
        });
        if (conflicts.length > 0) {
          const c = conflicts[0];
          return NextResponse.json({
            error: 'Hay una reserva que ocupa ese horario.',
            detail: `Conflicto con reserva: ${(c.start_time as string)} - ${(c.end_time as string)}`,
          }, { status: 409 });
        }
      }

      // Skip the generic advance payment record creation below — we handle it here
      // (prevent double payment records)
    }

    // B11 FIX: Track if this is a cancellation to skip advance payment record
    const isCancelling = status === 'cancelled' || (status && migrateStatus(status) === 'cancelled');

    // When cancelling a booking with advance, handle retained/refunded advance
    // Only create retained advance records when an admin explicitly provides advanceAction
    // (user-side cancellations should NOT auto-create records — the admin decides later)
    const isAdminCancellation = authUser.role === 'admin' || authUser.role === 'super_admin';
    if (isCancelling) {
      // B6 FIX: Fetch booking once, reuse for both checks
      let bookingForCancel: Record<string, unknown> | null = null;
      try {
        bookingForCancel = await getBookingById(id);
      } catch { /* non-blocking */ }

      // Prevent cancelling completed bookings
      if (bookingForCancel && (bookingForCancel.status === 'completed' || migrateStatus(bookingForCancel.status as string || '') === 'completed')) {
        return NextResponse.json({ error: 'No se puede cancelar una reserva completada. Contacta soporte si es necesario.' }, { status: 400 });
      }

      if (isAdminCancellation) {
      try {
        if (bookingForCancel && ((bookingForCancel.advance_amount as number) || 0) > 0) {
          // Bug #4: Check for duplicate retained advance
          const { getRetainedAdvances } = await import('@/lib/db');
          const existing = await getRetainedAdvances({ bookingId: id });
          if (existing.length > 0) {
            console.warn('[BOOKINGS] Retained advance already exists for booking', id, '- skipping creation');
          } else {
          const advAmount = (bookingForCancel.advance_amount as number) || 0;
          const isRetained = advanceAction === 'retain';
          const statusAdvance = isRetained ? 'retained' : 'refunded';

          // Get court name for the record
          let courtName = '';
          try {
            const cId = (bookingForCancel.court_ids as string[])?.[0] || (bookingForCancel.court_id as string) || '';
            if (cId) {
              const court = await getCourtById(cId);
              courtName = (court?.name as string) || '';
            }
          } catch { /* non-critical */ }

          // Get user name
          let userName = '';
          try {
            const uId = bookingForCancel.user_id as string;
            if (uId) {
              const user = await getUserById(uId);
              userName = (user?.name as string) || '';
            }
          } catch { /* non-critical */ }

          await createRetainedAdvance({
            booking_id: id,
            user_id: (bookingForCancel.user_id as string) || '',
            user_name: userName,
            user_email: (bookingForCancel.user_email as string) || null,
            court_name: courtName,
            booking_date: (bookingForCancel.date as string) || '',
            amount: advAmount,
            original_total: (bookingForCancel.total_price as number) || 0,
            payment_method: (bookingForCancel.payment_method as string) || 'EFECTIVO',
            reason: cancelReason || 'Cancelación de reserva',
            status: statusAdvance,
          });

          // Create a payment record for the refund/retention
          try {
            await createPayment(id, {
              user_id: (bookingForCancel.user_id as string) || '',
              amount: advAmount,
              type: isRetained ? 'retained' : 'refund',
              method: (bookingForCancel.payment_method as string) || 'EFECTIVO',
              status: 'completed',
            });
          } catch (payErr) {
            console.error('[BOOKINGS] Warning: could not create payment record for cancellation:', payErr);
          }
          }
        }
      } catch (err) {
        console.error('[BOOKINGS] Warning: could not process retained advance on cancellation:', err);
      }
      } // end isAdminCancellation
    }

    // B11 FIX: Skip advance payment record when cancelling or editBooking (handled above / no record needed)
    if (typeof reqAdvance === 'number' && typeof reqRemaining === 'number' && !isCancelling && !editBooking) {
      try {
        const booking = await getBookingById(id);
        if (booking) {
          const prevAdvance = (booking.advance_amount as number) || 0;
          const paymentIncrement = reqAdvance - prevAdvance;
          if (paymentIncrement > 0.01) {
            try {
              await createPayment(id, {
                user_id: booking.user_id as string,
                amount: paymentIncrement,
                type: reqRemaining <= 0 ? 'full_payment' : 'advance',
                method: (updateData.payment_method as string) || 'EFECTIVO',
                status: 'completed',
              });
            } catch (payErr) {
              console.error('[BOOKINGS] Warning: could not create payment record for advance update:', payErr);
            }
          }
        }
      } catch { /* non-critical: proceed with booking update */ }
    }

    await updateBooking(id, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[BOOKINGS] PUT error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Error al actualizar reserva', detail: msg }, { status: 500 });
  }
}

// DELETE /api/bookings — permanently delete a booking (super_admin only)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'super_admin');
    if (authResult instanceof NextResponse) return authResult;

    if (!isFirebaseAvailable()) {
      return NextResponse.json({ error: 'Firebase no configurado' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Delete the booking document and its payments subcollection
    const { getAdminDb } = await import('@/lib/firebase-admin');
    const db = await getAdminDb();

    // Delete payments subcollection
    try {
      const paymentsSnapshot = await db.collection('bookings').doc(id).collection('payments').get();
      for (const doc of paymentsSnapshot.docs) {
        await doc.ref.delete();
      }
    } catch (err) {
      console.error('[BOOKINGS] Warning: could not delete payments subcollection:', err);
    }

    // Delete associated retained advance record (Bug #12 fix)
    try {
      const { getRetainedAdvances, deleteRetainedAdvance } = await import('@/lib/db');
      const retained = await getRetainedAdvances({ bookingId: id });
      for (const ra of retained) {
        if (ra.id) {
          await deleteRetainedAdvance(ra.id);
          console.log('[BOOKINGS] Deleted orphaned retained advance:', ra.id);
        }
      }
    } catch (err) {
      console.error('[BOOKINGS] Warning: could not delete retained advance for booking:', id, err);
    }

    // Delete the booking document itself
    await deleteDocById('bookings', id);

    console.log('[BOOKINGS] Booking permanently deleted:', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[BOOKINGS] DELETE error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Error al eliminar reserva', detail: msg }, { status: 500 });
  }
}
