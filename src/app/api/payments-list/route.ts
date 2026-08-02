// ============================================================
// CREARD - API Route: /api/payments-list
// GET: Fetch all payment records with optional filters (admin)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyAuth } from '@/lib/auth-middleware';
import { getAllPayments } from '@/lib/db';

export async function GET(request: NextRequest) {
  // Authenticate — requireAnyAuth accepts any role;
  // we then verify admin/super_admin below.
  const authResult = await requireAnyAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { user } = authResult;

  // Only admin or super_admin may list all payments
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return NextResponse.json(
      { error: 'No tienes permisos de administrador.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = request.nextUrl;

    const filters: {
      dateFrom?: string;
      dateTo?: string;
      status?: string;
      userId?: string;
      bookingId?: string;
    } = {};

    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const bookingId = searchParams.get('bookingId');

    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (status) filters.status = status;
    if (userId) filters.userId = userId;
    if (bookingId) filters.bookingId = bookingId;

    const payments = await getAllPayments(filters);

    return NextResponse.json(payments);
  } catch (error: any) {
    console.error('[PAYMENTS-LIST] Error:', error.message);
    return NextResponse.json(
      { error: 'Error al obtener los pagos.' },
      { status: 500 }
    );
  }
}
