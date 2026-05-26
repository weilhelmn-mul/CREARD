import { NextRequest, NextResponse } from 'next/server';
import {
  getBookings,
  createBooking,
  updateBooking,
  getCourtById,
  getUserById,
} from '@/lib/db';
import { createPayment } from '@/lib/db';
import { requireAnyAuth, requireAuth } from '@/lib/auth-middleware';
import { isFirebaseAvailable } from '@/lib/firebase-check';
import {
  jsonGetBookings,
  jsonCreateBooking,
  jsonUpdateBooking,
  jsonCreatePayment,
  jsonGetUserById,
  jsonGetCourtById,
} from '@/lib/json-storage';

// Transformar snake_case (Firestore) a camelCase (frontend)
function toCamelBooking(b: Record<string, unknown>) {
  // Court data may come as snake_case (Firestore) or camelCase (JSON fallback)
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

  // User data
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
    status: b.status || 'pending',
    slotStatus: b.slot_status,
    paymentMethod: b.payment_method,
    notes: b.notes,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
    court,
    user,
  };
}

// Helper: get user from either Firebase or JSON storage
async function getUser(id: string): Promise<Record<string, unknown> | null> {
  if (isFirebaseAvailable()) {
    return (await getUserById(id)) as Record<string, unknown> | null;
  }
  return jsonGetUserById(id);
}

// Helper: get court from either Firebase or JSON storage
async function getCourt(id: string): Promise<Record<string, unknown> | null> {
  if (isFirebaseAvailable()) {
    return (await getCourtById(id)) as Record<string, unknown> | null;
  }
  return jsonGetCourtById(id);
}

// Helper: enrich a booking with court and user data
async function enrichBooking(b: Record<string, unknown>): Promise<Record<string, unknown>> {
  const court = b.court_id ? await getCourt(b.court_id as string) : null;
  const user = b.user_id ? await getUser(b.user_id as string) : null;
  return { ...b, _court: court, _user: user };
}

export async function GET(request: NextRequest) {
  try {
    const useJson = !isFirebaseAvailable();
    const { searchParams } = new URL(request.url);
    const courtId = searchParams.get('courtId');
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    // Court availability check (courtId + date) is public — no auth required
    if (courtId && date && !userId) {
      const bookings = useJson
        ? await jsonGetBookings({ courtId, date })
        : await getBookings({ courtId, date });
      return NextResponse.json(bookings.map(toCamelBooking));
    }

    // All other queries require authentication
    const authResult = await requireAnyAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const authUser = authResult.user;

    // Non-admin users can only see their own bookings
    if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
      // If requesting by userId, it must be their own
      if (userId && userId !== authUser.id) {
        return NextResponse.json({ error: 'No puedes ver reservas de otros usuarios.' }, { status: 403 });
      }
      // Default to own bookings
      const effectiveUserId = userId || authUser.id;
      let bookings = useJson
        ? await jsonGetBookings({ userId: effectiveUserId })
        : await getBookings({ userId: effectiveUserId });

      // Fallback: if no bookings found with userId, try searching by user email
      if (bookings.length === 0 && authUser.email) {
        bookings = useJson
          ? await jsonGetBookings({ userEmail: authUser.email })
          : await getBookings({ userEmail: authUser.email });
      }

      // Enrich with court and user data
      const enriched = await Promise.all(bookings.map(async (b) => {
        const raw = await enrichBooking(b as Record<string, unknown>);
        return toCamelBooking(raw);
      }));
      return NextResponse.json(enriched);
    }

    // Admin / super_admin: fetch with all filters
    const bookings = useJson
      ? await jsonGetBookings({
          courtId: courtId || undefined,
          userId: userId || undefined,
          date: date || undefined,
          status: status || undefined,
        })
      : await getBookings({
          courtId: courtId || undefined,
          userId: userId || undefined,
          date: date || undefined,
          status: status || undefined,
        });

    // Enriquecer con datos de court y user
    const enriched = await Promise.all(bookings.map(async (b) => {
      const raw = await enrichBooking(b as Record<string, unknown>);
      return toCamelBooking(raw);
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const useJson = !isFirebaseAvailable();

    // Authenticate user (always required)
    const authResult = await requireAnyAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const authUser = authResult.user;

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
    const existing = useJson
      ? await jsonGetBookings({ courtId, date })
      : await getBookings({ courtId, date });
    const overlapping = existing.filter(
      (b) =>
        !['cancelled', 'expired'].includes(b.status || '') &&
        (b.status === 'pending' || b.status === 'confirmed' ||
         b.status === 'partially_paid' || b.status === 'fully_paid') &&
        (b.start_time || '') < endTime &&
        (b.end_time || '') > startTime
    );

    if (overlapping.length > 0) {
      return NextResponse.json(
        { error: 'Este horario ya está reservado. Por favor selecciona otro.' },
        { status: 409 }
      );
    }

    // Get court price if not provided
    let price = parseFloat(totalPrice) || 0;
    if (!totalPrice) {
      const court = await getCourt(courtId);
      price = (court?.price_per_hour as number) || 0;
    }

    const adv = parseFloat(advanceAmount) || price * 0.5;
    const rem = parseFloat(remainingAmount) || price - adv;
    const bookingStatus = status || 'pending';

    let id: string;

    if (useJson) {
      // Save to JSON file
      id = await jsonCreateBooking({
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
      // Create advance payment in JSON storage
      try {
        await jsonCreatePayment(id, {
          user_id: userId,
          amount: adv,
          type: 'advance',
          method: paymentMethod || 'yape',
          status: 'completed',
        });
      } catch (payErr) {
        console.error('Warning: could not create payment record:', payErr);
      }
    } else {
      // Save to Firestore
      id = await createBooking({
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
        console.error('Warning: could not create payment record:', payErr);
      }
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
    console.error('Error creating booking:', err?.message || err);
    console.error('Stack:', err?.stack || 'no stack');
    return NextResponse.json({
      error: 'Failed to create booking',
      detail: err?.message || 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const useJson = !isFirebaseAvailable();

    // Authenticate user
    const authResult = await requireAnyAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const authUser = authResult.user;

    const body = await request.json();
    const { id, status, slot_status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Non-admin users can only cancel their own bookings
    if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
      if (status === 'cancelled') {
        // Verify the booking belongs to the user
        const bookings = useJson
          ? await jsonGetBookings({ userId: authUser.id })
          : await getBookings({ userId: authUser.id });
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
    if (status) updateData.status = status;
    if (slot_status) updateData.slot_status = slot_status;

    if (useJson) {
      await jsonUpdateBooking(id, updateData);
    } else {
      await updateBooking(id, updateData);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}
