import { NextRequest, NextResponse } from 'next/server';
import {
  getRetainedAdvances,
  createRetainedAdvance,
  updateRetainedAdvance,
  deleteRetainedAdvance,
  getPayments,
  createPayment,
} from '@/lib/db';
import { requireAnyAuth } from '@/lib/auth-middleware';
import { isFirebaseAvailable } from '@/lib/firebase-check';
import { Timestamp } from 'firebase-admin/firestore';

// GET /api/retained-advances — list retained advances
export async function GET(request: NextRequest) {
  try {
    if (!isFirebaseAvailable()) {
      return NextResponse.json({ error: 'Firebase no configurado' }, { status: 503 });
    }

    const authUser = await requireAnyAuth(request);
    if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const status = searchParams.get('status') || undefined;

    const advances = await getRetainedAdvances({ startDate, endDate, status });

    // Transform Firestore timestamps to strings for JSON
    const tsToStr = (ts: unknown): string => {
      if (!ts) return ''
      if (ts instanceof Date) return ts.toISOString()
      if (typeof ts === 'object' && ts !== null && 'toDate' in (ts as Record<string, unknown>)) {
        try { return ((ts as { toDate: () => Date }).toDate()).toISOString() } catch { return '' }
      }
      if (typeof ts === 'string') return ts
      return String(ts)
    }
    const result = advances.map((a) => ({
      id: a.id,
      bookingId: a.booking_id,
      userId: a.user_id,
      userName: a.user_name,
      userEmail: a.user_email,
      courtName: a.court_name,
      bookingDate: a.booking_date,
      amount: a.amount || 0,
      originalTotal: a.original_total || 0,
      paymentMethod: a.payment_method,
      reason: a.reason,
      status: a.status,
      createdAt: tsToStr(a.created_at),
      updatedAt: tsToStr(a.updated_at),
    }));

    // Compute totals
    const totalRetained = result
      .filter((a) => a.status === 'retained')
      .reduce((s, a) => s + a.amount, 0);
    const totalRefunded = result
      .filter((a) => a.status === 'refunded')
      .reduce((s, a) => s + a.amount, 0);

    return NextResponse.json({
      advances: result,
      totalRetained,
      totalRefunded,
      count: result.length,
    });
  } catch (error) {
    console.error('[RETAINED-ADVANCES] GET error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Error al obtener adelantos retenidos', detail: msg }, { status: 500 });
  }
}

// POST /api/retained-advances — create a retained advance record
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable()) {
      return NextResponse.json({ error: 'Firebase no configurado' }, { status: 503 });
    }

    const authUser = await requireAnyAuth(request);
    if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const {
      bookingId,
      userId,
      userName,
      userEmail,
      courtName,
      bookingDate,
      amount,
      originalTotal,
      paymentMethod,
      reason,
      status,
    } = body;

    if (!bookingId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'bookingId y amount son requeridos' },
        { status: 400 }
      );
    }

    const id = await createRetainedAdvance({
      booking_id: bookingId,
      user_id: userId || '',
      user_name: userName || '',
      user_email: userEmail || null,
      court_name: courtName || '',
      booking_date: bookingDate || '',
      amount,
      original_total: originalTotal || 0,
      payment_method: paymentMethod || 'EFECTIVO',
      reason: reason || 'Cancelación de reserva',
      status: status || 'retained',
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('[RETAINED-ADVANCES] POST error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Error al crear adelanto retenido', detail: msg }, { status: 500 });
  }
}

// PUT /api/retained-advances — update or delete a retained advance
export async function PUT(request: NextRequest) {
  try {
    if (!isFirebaseAvailable()) {
      return NextResponse.json({ error: 'Firebase no configurado' }, { status: 503 });
    }

    const authUser = await requireAnyAuth(request);
    if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { id, action, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    if (action === 'delete') {
      await deleteRetainedAdvance(id);
      return NextResponse.json({ success: true });
    }

    // Regular update — with validation
    const data: Record<string, unknown> = {};
    if (updateData.status) {
      if (!['retained', 'refunded'].includes(updateData.status)) {
        return NextResponse.json({ error: 'Estado inválido. Use "retained" o "refunded".' }, { status: 400 });
      }
      data.status = updateData.status;
    }
    if (updateData.reason !== undefined) data.reason = updateData.reason;
    if (updateData.amount !== undefined) {
      const amt = Number(updateData.amount);
      if (isNaN(amt) || amt < 0) {
        return NextResponse.json({ error: 'Monto inválido. Debe ser un número >= 0.' }, { status: 400 });
      }
      data.amount = amt;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    // B17 FIX: Sync payment record when status changes
    if (updateData.status && updateData.bookingId) {
      try {
        const { getAdminDb } = await import('@/lib/firebase-admin');
        const db = await getAdminDb();
        // Find the matching payment record for this retained advance
        const paySnapshot = await db
          .collection('bookings')
          .doc(updateData.bookingId as string)
          .collection('payments')
          .where('type', 'in', ['retained', 'refund'])
          .get();
        for (const payDoc of paySnapshot.docs) {
          const payData = payDoc.data();
          // Match: a 'retained' payment should become 'refund' and vice-versa
          const currentPayType = payData.type as string;
          const newPayType = updateData.status === 'refunded' ? 'refund' : 'retained';
          if ((updateData.status === 'refunded' && currentPayType === 'retained') ||
              (updateData.status === 'retained' && currentPayType === 'refund')) {
            await payDoc.ref.update({
              type: newPayType,
              updated_at: Timestamp.now(),
            });
            console.log(`[RETAINED-ADVANCES] Synced payment ${payDoc.id} type to ${newPayType}`);
          }
        }
      } catch (syncErr) {
        console.error('[RETAINED-ADVANCES] Warning: could not sync payment record:', syncErr);
      }
    }

    await updateRetainedAdvance(id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[RETAINED-ADVANCES] PUT error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Error al actualizar adelanto retenido', detail: msg }, { status: 500 });
  }
}