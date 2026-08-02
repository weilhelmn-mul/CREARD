// ============================================================
// CREARD - API Route: /api/payments-list
// GET: Fetch all payment records with optional filters (admin)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyAuth } from '@/lib/auth-middleware';
import { getAllPayments } from '@/lib/db';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  // Authenticate
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

    // Enrich each payment with validation records, audit logs, and booking data
    const db = getAdminDb();

    // Batch-fetch all unique booking documents in a single pass to avoid N+1
    const bookingIds = [...new Set(payments.map(p => p.booking_id).filter(Boolean))];
    const bookingMap = new Map<string, Record<string, any>>();

    if (bookingIds.length > 0) {
      // Firestore 'in' queries support max 30 items per query
      const chunks: string[][] = [];
      for (let i = 0; i < bookingIds.length; i += 30) {
        chunks.push(bookingIds.slice(i, i + 30));
      }
      for (const chunk of chunks) {
        try {
          const snap = await db.collection('bookings').where('__name__', 'in', chunk).get();
          for (const doc of snap.docs) {
            bookingMap.set(doc.id, doc.data());
          }
        } catch (err: any) {
          console.warn('[PAYMENTS-LIST] Error batch-fetching bookings:', err.message);
        }
      }
    }

    // Batch-fetch validation records and audit logs per booking
    const valMap = new Map<string, any[]>();
    const auditMap = new Map<string, any[]>();

    // Fetch validations in bulk (limit 500 most recent)
    try {
      const valSnap = await db
        .collection('payment_validations')
        .orderBy('created_at', 'desc')
        .limit(500)
        .get();
      for (const doc of valSnap.docs) {
        const data = doc.data();
        const bId = data.booking_id;
        if (bId && bookingMap.has(bId)) {
          if (!valMap.has(bId)) valMap.set(bId, []);
          valMap.get(bId)!.push({ id: doc.id, ...data });
        }
      }
    } catch (err: any) {
      console.warn('[PAYMENTS-LIST] Error fetching validations:', err.message);
    }

    // Fetch audit logs in bulk
    try {
      const auditSnap = await db
        .collection('payment_audit_logs')
        .orderBy('created_at', 'desc')
        .limit(500)
        .get();
      for (const doc of auditSnap.docs) {
        const data = doc.data();
        const bId = data.booking_id;
        if (bId && bookingMap.has(bId)) {
          if (!auditMap.has(bId)) auditMap.set(bId, []);
          auditMap.get(bId)!.push({ id: doc.id, ...data });
        }
      }
    } catch (err: any) {
      console.warn('[PAYMENTS-LIST] Error fetching audit logs:', err.message);
    }

    const enrichedPayments = payments.map((payment) => {
      const bId = payment.booking_id;
      const booking = bId ? bookingMap.get(bId) : null;

      // Extract total_price from booking if not already on payment record
      const total_price = payment.total_price || booking?.total_price || 0;

      // Calculate financial summary
      const amount_paid = payment.amount_paid || 0;
      const remaining_balance = payment.remaining_balance ?? (total_price - amount_paid);
      const percentage_paid = total_price > 0 ? Math.round((amount_paid / total_price) * 100) : 0;

      // Multi-court names
      let court_names = payment.court_name || booking?.court_name || '';
      const bCourtIds = booking?.court_ids;
      if (Array.isArray(bCourtIds) && bCourtIds.length > 1) {
        court_names = `${bCourtIds.length} cancha(s) - ${court_names}`;
      }

      // Booking creation timestamp
      const booking_created_at = booking?.created_at || null;

      // Rejection reason from latest validation record
      const validations = bId ? (valMap.get(bId) || []) : [];
      const latestRejection = validations.find(v => v.action === 'reject');
      const rejection_reason = latestRejection?.observation || latestRejection?.details || '';

      // Validation info from latest validation
      const latestValidation = validations[0] || null;

      // Audit logs for this booking
      const audits = bId ? (auditMap.get(bId) || []) : [];

      return {
        ...payment,
        total_price,
        remaining_balance,
        percentage_paid,
        court_names,
        booking_created_at,
        rejection_reason,
        validationRecords: validations,
        auditLogs: audits,
        latestValidation,
        // Extra booking fields useful for the admin
        booking_status: booking?.status || '',
        booking_slot_status: booking?.slot_status || '',
        booking_notes: booking?.notes || '',
        booking_payment_method: booking?.payment_method || '',
      };
    });

    return NextResponse.json(enrichedPayments);
  } catch (error: any) {
    console.error('[PAYMENTS-LIST] Error:', error.message);
    return NextResponse.json(
      { error: 'Error al obtener los pagos.' },
      { status: 500 }
    );
  }
}
