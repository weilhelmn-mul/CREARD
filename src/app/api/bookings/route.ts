import { NextRequest, NextResponse } from 'next/server';
import {
  getBookings,
  createBooking,
  updateBooking,
  getPayments,
  createPayment,
  getCourtById,
} from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courtId = searchParams.get('courtId');
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    const bookings = await getBookings({
      courtId: courtId || undefined,
      userId: userId || undefined,
      date: date || undefined,
      status: status || undefined,
    });

    // Enriquecer con datos de court y user
    const enriched = await Promise.all(
      bookings.map(async (b) => {
        const court = await getCourtById(b.court_id || '');
        return {
          ...b,
          court,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Verificar solapamiento
    const existing = await getBookings({
      courtId,
      date,
    });
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

    return NextResponse.json({ id, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, slot_status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
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
