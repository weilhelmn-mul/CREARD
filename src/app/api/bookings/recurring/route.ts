import { NextRequest, NextResponse } from 'next/server';
import { getBookings, createBooking, updateBooking, getUserById } from '@/lib/db';
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
      courtId, userId, startTime, endTime,
      startDate, frequency, daysOfWeek,
      endDate, count, totalPrice, advanceAmount,
      status, paymentMethod, notes, dryRun,
    } = body;

    if (!courtId || !userId || !startTime || !endTime || !startDate || !frequency) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: courtId, userId, startTime, endTime, startDate, frequency' },
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

    // Price per booking
    const price = parseFloat(totalPrice) || 0;
    const adv = parseFloat(advanceAmount) || price * 0.5;

    // Check each date for conflicts AND 30-min advance restriction
    const previewItems = [];
    let availableCount = 0;
    let conflictCount = 0;
    const now = new Date();
    const thirtyMinMs = 30 * 60 * 1000;

    for (const date of dates) {
      const slotDateTime = new Date(`${date}T${startTime}:00`);
      const diffMs = slotDateTime.getTime() - now.getTime();

      // Check 30-min advance rule
      let tooSoon = false;
      let conflict: { bookingId: string; startTime: string; endTime: string; userName: string } | undefined;

      if (diffMs < thirtyMinMs) {
        tooSoon = true;
        conflict = {
          bookingId: '',
          startTime,
          endTime,
          userName: diffMs < 0 ? 'Horario pasado' : `Menos de 30 min de anticipación`,
        };
      } else {
        // Check overlap with existing bookings
        const existing = await getBookings({ courtId, date });
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
            bookingId: ob.id,
            startTime: ob.start_time as string,
            endTime: ob.end_time as string,
            userName,
          };
        }
      }

      const available = !tooSoon && !conflict?.bookingId;

      if (available) availableCount++;
      else conflictCount++;

      const d = new Date(date + 'T00:00:00');
      previewItems.push({
        date,
        dayName: dayNames[d.getDay()],
        available,
        conflict,
        tooSoon,
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

    for (let i = 0; i < dates.length; i++) {
      const item = previewItems[i];
      if (!item.available) continue;

      const id = await createBooking({
        court_id: courtId,
        user_id: userId,
        user_email: authUser.email,
        date: dates[i],
        start_time: startTime,
        end_time: endTime,
        total_price: price,
        advance_amount: adv,
        remaining_amount: price - adv,
        status: bookingStatus,
        slot_status: 'available',
        payment_method: paymentMethod || null,
        notes: notes || null,
        recurring_group_id: groupId,
        recurring_index: createdBookings.length,
      });

      createdBookings.push({ id, date: dates[i] });
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
    const { action, recurringGroupId, bookingId, reason } = body;

    if (!action || !recurringGroupId) {
      return NextResponse.json({ error: 'Faltan campos requeridos: action, recurringGroupId' }, { status: 400 });
    }

    if (action === 'cancel_series') {
      // Find ALL bookings with this group ID (we need to query without the field constraint)
      // Firestore doesn't support querying by arbitrary field easily in our helper,
      // so we'll use the adminDb directly
      const { adminDb } = await import('@/lib/firebase-admin');
      const snapshot = await adminDb
        .collection('bookings')
        .where('recurring_group_id', '==', recurringGroupId)
        .get();

      let cancelledCount = 0;
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (migrateStatus(data.status || '') !== 'cancelled') {
          await updateBooking(doc.id, {
            status: 'cancelled',
          } as any);
          cancelledCount++;
        }
      }

      return NextResponse.json({
        success: true,
        cancelledCount,
        message: `${cancelledCount} reservas canceladas en la serie.`,
      });
    } else if (action === 'cancel_single') {
      if (!bookingId) {
        return NextResponse.json({ error: 'Se requiere bookingId para cancel_single.' }, { status: 400 });
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
