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

// Transformar snake_case (Firestore) a camelCase (frontend)
function toCamelBooking(b: Record<string, unknown>) {
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
    court: b._court || null,
    user: b._user || null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courtId = searchParams.get('courtId');
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    // Court availability check (courtId + date) is public — no auth required
    if (courtId && date && !userId) {
      if (!isFirebaseAvailable()) return NextResponse.json([]);
      const bookings = await getBookings({ courtId, date });
      return NextResponse.json(bookings.map(toCamelBooking));
    }

    // All other queries require authentication
    const authResult = await requireAnyAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const authUser = authResult.user;

    // If Firebase not configured, return empty (no database to query)
    if (!isFirebaseAvailable()) {
      return NextResponse.json([]);
    }

    // Non-admin users can only see their own bookings
    if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
      // If requesting by userId, it must be their own
      if (userId && userId !== authUser.id) {
        return NextResponse.json({ error: 'No puedes ver reservas de otros usuarios.' }, { status: 403 });
      }
      // Default to own bookings
      const effectiveUserId = userId || authUser.id;
      let bookings = await getBookings({ userId: effectiveUserId });

      // Fallback: if no bookings found with userId, try searching by user email
      // This handles cases where bookings were created with a different user ID format
      if (bookings.length === 0 && authUser.email) {
        bookings = await getBookings({ userEmail: authUser.email });
      }

      const enriched = await Promise.all(
        bookings.map(async (b) => {
          const [court, user] = await Promise.all([
            b.court_id ? getCourtById(b.court_id) : Promise.resolve(null),
            b.user_id ? getUserById(b.user_id) : Promise.resolve(null),
          ]);
          const raw = { ...b, _court: court, _user: user };
          return toCamelBooking(raw);
        })
      );
      return NextResponse.json(enriched);
    }

    const bookings = await getBookings({
      courtId: courtId || undefined,
      userId: userId || undefined,
      date: date || undefined,
      status: status || undefined,
    });

    // Enriquecer con datos de court y user, y transformar a camelCase
    const enriched = await Promise.all(
      bookings.map(async (b) => {
        const [court, user] = await Promise.all([
          b.court_id ? getCourtById(b.court_id) : Promise.resolve(null),
          b.user_id ? getUserById(b.user_id) : Promise.resolve(null),
        ]);

        const raw = { ...b, _court: court, _user: user };
        return toCamelBooking(raw);
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    // If Firebase not configured, create a simulated booking with a mock ID
    if (!isFirebaseAvailable()) {
      const body = await request.json();
      const { courtId, userId, date, startTime, endTime, totalPrice, advanceAmount, remainingAmount, paymentMethod } = body;

      if (!courtId || !userId || !date || !startTime || !endTime) {
        return NextResponse.json(
          { error: 'Faltan campos requeridos: courtId, userId, date, startTime, endTime' },
          { status: 400 }
        );
      }

      const mockId = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const price = parseFloat(totalPrice) || 60;
      const adv = parseFloat(advanceAmount) || price * 0.5;
      const rem = parseFloat(remainingAmount) || price - adv;

      return NextResponse.json({
        id: mockId,
        courtId,
        userId,
        date,
        startTime,
        endTime,
        totalPrice: price,
        advanceAmount: adv,
        remainingAmount: rem,
        status: 'partially_paid',
        paymentMethod: paymentMethod || 'yape',
        success: true,
      }, { status: 201 });
    }

    // Authenticate user
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

    // Verificar solapamiento
    const existing = await getBookings({ courtId, date });
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

    // Obtener precio de la cancha si no se proporciona
    let price = parseFloat(totalPrice) || 0;
    if (!totalPrice) {
      const court = await getCourtById(courtId);
      price = (court?.price_per_hour as number) || 0;
    }

    const adv = parseFloat(advanceAmount) || price * 0.5;
    const rem = parseFloat(remainingAmount) || price - adv;

    const id = await createBooking({
      court_id: courtId,
      user_id: userId,
      user_email: authUser.email, // Denormalized for fallback search
      date,
      start_time: startTime,
      end_time: endTime,
      total_price: price,
      advance_amount: adv,
      remaining_amount: rem,
      status: status || 'pending',
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
      status: status || 'pending',
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
    if (!isFirebaseAvailable()) {
      return NextResponse.json({ success: true });
    }

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
        const bookings = await getBookings({ userId: authUser.id });
        const booking = bookings.find((b) => b.id === id);
        if (!booking) {
          return NextResponse.json(
            { error: 'No puedes modificar reservas de otros usuarios.' },
            { status: 403 }
          );
        }
      } else {
        // Users can only cancel, not change other statuses
        return NextResponse.json(
          { error: 'Solo puedes cancelar tus propias reservas.' },
          { status: 403 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (slot_status) updateData.slot_status = slot_status;

    await updateBooking(id, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}
