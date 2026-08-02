// ============================================================
// CREARD - API Route: /api/payments-list
// GET: Fetch all payment records with optional filters (admin)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyAuth } from '@/lib/auth-middleware';
import { getAllPayments } from '@/lib/db';
import { getAdminDb } from '@/lib/firebase-admin';

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

    // Enrich each payment with validation records and audit logs
    const db = getAdminDb();
    const enrichedPayments = await Promise.all(
      payments.map(async (payment) => {
        const bId = payment.booking_id;
        if (!bId) {
          return { ...payment, validationRecords: [], auditLogs: [] };
        }

        let validationRecords: any[] = [];
        let auditLogs: any[] = [];

        try {
          // Fetch validation records for this booking
          const valSnap = await db
            .collection('payment_validations')
            .where('booking_id', '==', bId)
            .orderBy('created_at', 'desc')
            .get();
          validationRecords = valSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch (err: any) {
          console.warn('[PAYMENTS-LIST] Error fetching validations for', bId, err.message);
        }

        try {
          // Fetch audit logs for this booking
          const auditSnap = await db
            .collection('payment_audit_logs')
            .where('booking_id', '==', bId)
            .orderBy('created_at', 'desc')
            .get();
          auditLogs = auditSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch (err: any) {
          console.warn('[PAYMENTS-LIST] Error fetching audit logs for', bId, err.message);
        }

        return {
          ...payment,
          validationRecords,
          auditLogs,
        };
      })
    );

    return NextResponse.json(enrichedPayments);
  } catch (error: any) {
    console.error('[PAYMENTS-LIST] Error:', error.message);
    return NextResponse.json(
      { error: 'Error al obtener los pagos.' },
      { status: 500 }
    );
  }
}
