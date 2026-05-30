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

  const userRaw = b._user as Record<string, unknown> | null;
  const user = userRaw ? {
    id: userRaw.id,
    name: userRaw.name,
    email: userRaw.email,
  } : null;

  return {
    id: b.id,
    courtId: b.court_id,
    userId: b.user_id,
    date: b.date,
    startTime: b.start_time,
    endTime: b.end_time,
    totalPrice: b.total_price || 0,
    advanceAmount: b.advance_amount || 0,
    remainingAmount: b.remaining_amount || 0,
    status: migrateStatus(b.status || 'reserved'),
    slotStatus: b.slot_status,
    paymentMethod: b.payment_method,
    notes: b.notes,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
    recurringGroupId: b.recurring_group_id,
    recurringIndex: b.recurring_index,
    court,
    user,
  };
}

// Enrich a single booking (court + user), safe — never throws
async function safeEnrichBooking(b: Record<string, unknown>): Promise<Record<string, unknown>> {
  let court: Record<string, unknown> | null = null;
  let user: Record<string, unknown> | null = null;

  try {
    if (b.court_id) {
      const c = await getCourtById(b.court_id as string);
      if (c) court = c as Record<string, unknown>;
    }
  } catch (e) {
    console.warn('[BOOKINGS] Failed to load court for booking:', b.id, e);
  }

  try {
    if (b.user_id) {
      const u = await getUserById(b.user_id as string);
      if (u) user = u as Record<string, unknown>;
    }
  } catch (e) {
    console.warn('[BOOKINGS] Failed to load user for booking:', b.id, e);
  }

  return { ...b, _court: court, _user: user };
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
    const today = new Date().toISOString().split('T')[0];
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
    } = body;

    if (!courtId || !userId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: courtId, userId, date, startTime, endTime' },
        { status: 400 }
      );
    }

    // Non-admin users can only create bookings for themselves
    if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
      if (userId !== authUser.id) {
        return NextResponse.json(
          { error: 'No puedes crear reservas para otros usuarios.' },
          { status: 403 }
        );
      }
    }

    // Check overlap
    const existing = await getBookings({ courtId, date });
    const overlapping = existing.filter(
      (b) =>
        !['cancelled'].includes(migrateStatus(b.status || '')) &&
        (b.start_time || '') < endTime &&
        (b.end_time || '') > startTime
    );

    if (overlapping.length > 0) {
      return NextResponse.json(
        { error: 'Este horario ya esta reservado. Por favor selecciona otro.' },
        { status: 409 }
      );
    }

    // Get court price if not provided — use time-based pricing schedule
    let price = parseFloat(totalPrice) || 0;
    if (!totalPrice) {
      const court = await getCourtById(courtId);
      if (court) {
        const schedule = court.pricing_schedule as Array<{ label: string; startHour: number; endHour: number; pricePerHour: number }> | undefined;
        if (schedule && schedule.length > 0) {
          price = calculatePriceForTimeSlot(schedule, startTime, endTime);
          if (price <= 0) price = (court.price_per_hour as number) || 0;
        } else {
          price = (court.price_per_hour as number) || 0;
        }
      }
    }

    const adv = parseFloat(advanceAmount) || price * 0.5;
    const rem = parseFloat(remainingAmount) || price - adv;
    const bookingStatus = migrateStatus(status || 'reserved');

    // Save to Firestore
    const id = await createBooking({
      court_id: courtId,
      user_id: userId,
      user_email: authUser.email,
      date,
      start_time: startTime,
      end_time: endTime,
      total_price: price,
      advance_amount: adv,
      remaining_amount: rem,
      status: bookingStatus,
      slot_status: 'available',
      payment_method: paymentMethod || null,
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
      courtId,
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
    const { id, status, slot_status } = body;

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

    await updateBooking(id, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[BOOKINGS] PUT error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Error al actualizar reserva', detail: msg }, { status: 500 });
  }
}
