import { NextRequest, NextResponse } from 'next/server';
import {
  getRetainedAdvances,
  createRetainedAdvance,
  updateRetainedAdvance,
  deleteRetainedAdvance,
} from '@/lib/db';
import { requireAnyAuth } from '@/lib/auth-middleware';
import { isFirebaseAvailable } from '@/lib/firebase-check';

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
      createdAt: a.created_at instanceof Date
        ? a.created_at.toISOString()
        : String(a.created_at || ''),
      updatedAt: a.updated_at instanceof Date
        ? a.updated_at.toISOString()
        : String(a.updated_at || ''),
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

    // Regular update
    const data: Record<string, unknown> = {};
    if (updateData.status) data.status = updateData.status;
    if (updateData.reason !== undefined) data.reason = updateData.reason;
    if (updateData.amount !== undefined) data.amount = updateData.amount;
    await updateRetainedAdvance(id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[RETAINED-ADVANCES] PUT error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Error al actualizar adelanto retenido', detail: msg }, { status: 500 });
  }
}