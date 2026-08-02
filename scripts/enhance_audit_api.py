#!/usr/bin/env python3
"""
Enhance payment-validation API and payments-list API for better audit trail.

Changes:
  A) Add logPaymentAudit function to db.ts (after getPaymentsByBookingId, ~line 659)
  B) Enhance payment-validation PATCH to write audit logs + update top-level payments
  C) Enhance payments-list GET to include validationRecords and auditLogs
  D) Add booking_code and court_name to validation records
  E) Import and use logPaymentAudit in payment-validation route
"""

import os

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  [OK] Written: {path}")

BASE = '/home/z/my-project'

# ============================================================
# 1. Add logPaymentAudit to db.ts after getPaymentsByBookingId
# ============================================================
def patch_db_ts():
    path = os.path.join(BASE, 'src/lib/db.ts')
    content = read_file(path)

    new_function = '''
/**
 * Log a detailed audit entry to the payment_audit_logs collection.
 * Used by payment-validation and other payment workflows.
 */
export async function logPaymentAudit(data: {
  booking_id: string;
  payment_id?: string;
  action: string;
  previous_status?: string;
  new_status?: string;
  performed_by: string;
  performed_by_name: string;
  performed_by_role: string;
  details?: string;
  observation?: string;
}): Promise<string> {
  const db = await getAdminDb();
  const docRef = await db.collection('payment_audit_logs').add({
    booking_id: data.booking_id,
    payment_id: data.payment_id || null,
    action: data.action,
    previous_status: data.previous_status || null,
    new_status: data.new_status || null,
    performed_by: data.performed_by,
    performed_by_name: data.performed_by_name,
    performed_by_role: data.performed_by_role,
    details: data.details || '',
    observation: data.observation || '',
    rejection_reason: data.action === 'reject' ? (data.details || data.observation || '') : null,
    created_at: Timestamp.now(),
  });
  return docRef.id;
}
'''

    # Insert after the getPaymentsByBookingId function closing brace (line 659)
    # Find the end of getPaymentsByBookingId
    marker = '''  const docs = await queryDocs('payments', constraints, 'created_at', 'desc');
  return docs as Partial<PaymentRecord>[];
}

/**
 * Actualiza el estado de un pago existente (usado por webhooks de Culqi)'''

    replacement = '''  const docs = await queryDocs('payments', constraints, 'created_at', 'desc');
  return docs as Partial<PaymentRecord>[];
}
''' + new_function + '''
/**
 * Actualiza el estado de un pago existente (usado por webhooks de Culqi)'''

    if marker not in content:
        print("  [WARN] Could not find insertion point in db.ts for logPaymentAudit")
        return False

    content = content.replace(marker, replacement)
    write_file(path, content)
    print("  [OK] Added logPaymentAudit function to db.ts")
    return True


# ============================================================
# 2. Enhance payment-validation PATCH route
# ============================================================
def patch_payment_validation():
    path = os.path.join(BASE, 'src/app/api/payment-validation/route.ts')
    content = read_file(path)

    # A) Add import for logPaymentAudit
    old_import = "import { Timestamp } from 'firebase-admin/firestore';"
    new_import = """import { Timestamp } from 'firebase-admin/firestore';
import { logPaymentAudit } from '@/lib/db';"""
    content = content.replace(old_import, new_import, 1)

    # B) Replace the entire PATCH handler with enhanced version
    old_patch_start = "// PATCH /api/payment-validation - Admin: validate or reject"
    old_patch = '''// PATCH /api/payment-validation - Admin: validate or reject
export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth(request, 'admin');
  if (authResult instanceof NextResponse) return authResult;
  const authUser = authResult.user;

  try {
    const body = await request.json();
    const { bookingId, action, observation } = body;

    if (!bookingId || !['validate', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Parametros invalidos.' }, { status: 400 });
    }

    const db = getAdminDb();
    const now = Timestamp.now();

    // Get booking
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ error: 'Reserva no encontrada.' }, { status: 404 });
    }
    const booking = bookingSnap.data();

    // Determine if this is a remaining payment validation
    const isRemainingPayment = booking.remaining_payment_status === 'pending';

    // Build update object
    const updateData: Record<string, any> = { updated_at: now };

    if (isRemainingPayment) {
      // Remaining payment validation
      if (action === 'validate') {
        // Mark remaining as paid
        updateData.remaining_payment_status = 'validated';
        updateData.remaining_amount = 0;
        updateData.advance_amount = booking.total_price;
        // Keep booking as reserved
      } else {
        // Reject remaining payment - keep the amount owed
        updateData.remaining_payment_status = 'rejected';
      }
    } else {
      // Advance payment validation
      if (action === 'validate') {
        updateData.status = 'reserved';
        updateData.slot_status = 'reserved';
      } else {
        // Reject: free up the slot
        updateData.status = 'cancelled';
        updateData.slot_status = 'available';
      }
    }

    await bookingRef.update(updateData);

    // Create payment validation record (audit log)
    await db.collection('payment_validations').add({
      booking_id: bookingId,
      user_id: booking.user_id,
      user_email: booking.user_email || '',
      court_id: booking.court_id,
      court_ids: booking.court_ids || [booking.court_id],
      date: booking.date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      amount: booking.total_price || 0,
      advance_amount: isRemainingPayment ? (booking.remaining_amount || 0) : (booking.advance_amount || 0),
      payment_method: booking.payment_method || 'Yape QR',
      payment_type: isRemainingPayment ? 'remaining' : 'advance',
      action,
      observation: observation || '',
      validated_by: authUser.id,
      validated_by_name: authUser.name || authUser.email || '',
      validated_by_role: authUser.role,
      created_at: now,
    });

    return NextResponse.json({
      success: true,
      message: action === 'validate'
        ? (isRemainingPayment ? 'Pago restante validado. Saldo completado.' : 'Pago validado. Reserva confirmada.')
        : (isRemainingPayment ? 'Pago restante rechazado. El monto sigue pendiente.' : 'Pago rechazado. Reserva liberada.'),
    });
  } catch (error: any) {
    console.error('[PAYMENT-VALIDATION] Error:', error.message);
    return NextResponse.json({ error: 'Error al procesar validacion.' }, { status: 500 });
  }
}'''

    new_patch = '''// PATCH /api/payment-validation - Admin: validate or reject
export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth(request, 'admin');
  if (authResult instanceof NextResponse) return authResult;
  const authUser = authResult.user;

  try {
    const body = await request.json();
    const { bookingId, action, observation } = body;

    if (!bookingId || !['validate', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Parametros invalidos.' }, { status: 400 });
    }

    const db = getAdminDb();
    const now = Timestamp.now();

    // Get booking
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ error: 'Reserva no encontrada.' }, { status: 404 });
    }
    const booking = bookingSnap.data();

    // Determine if this is a remaining payment validation
    const isRemainingPayment = booking.remaining_payment_status === 'pending';

    // Track previous status for audit
    const previousStatus = isRemainingPayment
      ? (booking.remaining_payment_status || 'pending')
      : (booking.status || 'payment_pending');

    // Build update object
    const updateData: Record<string, any> = { updated_at: now };
    let newStatus: string;

    if (isRemainingPayment) {
      // Remaining payment validation
      if (action === 'validate') {
        // Mark remaining as paid
        updateData.remaining_payment_status = 'validated';
        updateData.remaining_amount = 0;
        updateData.advance_amount = booking.total_price;
        // Keep booking as reserved
        newStatus = 'validated';
      } else {
        // Reject remaining payment - keep the amount owed
        updateData.remaining_payment_status = 'rejected';
        newStatus = 'rejected';
      }
    } else {
      // Advance payment validation
      if (action === 'validate') {
        updateData.status = 'reserved';
        updateData.slot_status = 'reserved';
        newStatus = 'reserved';
      } else {
        // Reject: free up the slot
        updateData.status = 'cancelled';
        updateData.slot_status = 'available';
        newStatus = 'cancelled';
      }
    }

    await bookingRef.update(updateData);

    // Create payment validation record (audit log) with booking_code and court_name
    const validationRecord: Record<string, any> = {
      booking_id: bookingId,
      booking_code: booking.booking_code || '',
      court_name: booking.court_name || '',
      user_id: booking.user_id,
      user_email: booking.user_email || '',
      court_id: booking.court_id,
      court_ids: booking.court_ids || [booking.court_id],
      date: booking.date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      amount: booking.total_price || 0,
      advance_amount: isRemainingPayment ? (booking.remaining_amount || 0) : (booking.advance_amount || 0),
      payment_method: booking.payment_method || 'Yape QR',
      payment_type: isRemainingPayment ? 'remaining' : 'advance',
      action,
      observation: observation || '',
      validated_by: authUser.id,
      validated_by_name: authUser.name || authUser.email || '',
      validated_by_role: authUser.role,
      created_at: now,
    };
    await db.collection('payment_validations').add(validationRecord);

    // Try to find related payment in top-level payments collection and update its status
    const paymentStatusForTopLevel = action === 'validate' ? 'completed' : 'rejected';
    let foundPaymentId: string | null = null;
    try {
      const paymentSnap = await db
        .collection('payments')
        .where('booking_id', '==', bookingId)
        .limit(1)
        .get();

      if (!paymentSnap.empty) {
        const paymentDoc = paymentSnap.docs[0];
        foundPaymentId = paymentDoc.id;
        await paymentDoc.ref.update({
          payment_status: paymentStatusForTopLevel,
          status: paymentStatusForTopLevel,
          validated_by: authUser.id,
          validated_by_name: authUser.name || authUser.email || '',
          validated_at: now,
          updated_at: now,
        });
      }
    } catch (payErr: any) {
      console.warn('[PAYMENT-VALIDATION] Could not update top-level payment:', payErr.message);
    }

    // Write detailed audit log to payment_audit_logs collection
    const auditAction = action === 'validate' ? 'validate' : 'reject';
    const paymentTypeLabel = isRemainingPayment ? 'pago restante' : 'adelanto';
    await logPaymentAudit({
      booking_id: bookingId,
      payment_id: foundPaymentId || undefined,
      action: auditAction,
      previous_status: previousStatus,
      new_status: newStatus,
      performed_by: authUser.id,
      performed_by_name: authUser.name || authUser.email || '',
      performed_by_role: authUser.role,
      details: `Pago de ${paymentTypeLabel} ${action === 'validate' ? 'validado' : 'rechazado'} para reserva ${booking.booking_code || bookingId}. Monto: S/ ${booking.total_price || 0}`,
      observation: observation || '',
    });

    return NextResponse.json({
      success: true,
      message: action === 'validate'
        ? (isRemainingPayment ? 'Pago restante validado. Saldo completado.' : 'Pago validado. Reserva confirmada.')
        : (isRemainingPayment ? 'Pago restante rechazado. El monto sigue pendiente.' : 'Pago rechazado. Reserva liberada.'),
    });
  } catch (error: any) {
    console.error('[PAYMENT-VALIDATION] Error:', error.message);
    return NextResponse.json({ error: 'Error al procesar validacion.' }, { status: 500 });
  }
}'''

    if old_patch not in content:
        print("  [WARN] Could not find old PATCH handler in payment-validation route")
        return False

    content = content.replace(old_patch, new_patch)
    write_file(path, content)
    print("  [OK] Enhanced payment-validation PATCH handler")
    return True


# ============================================================
# 3. Enhance payments-list GET route
# ============================================================
def patch_payments_list():
    path = os.path.join(BASE, 'src/app/api/payments-list/route.ts')
    content = read_file(path)

    old_content = '''// ============================================================
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
}'''

    new_content = '''// ============================================================
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
}'''

    if old_content not in content:
        print("  [WARN] Could not find old content in payments-list route")
        return False

    content = content.replace(old_content, new_content)
    write_file(path, content)
    print("  [OK] Enhanced payments-list GET handler with validationRecords and auditLogs")
    return True


# ============================================================
# Main
# ============================================================
if __name__ == '__main__':
    print("=== Enhancing Audit Trail APIs ===\n")

    ok1 = patch_db_ts()
    print()
    ok2 = patch_payment_validation()
    print()
    ok3 = patch_payments_list()
    print()

    if ok1 and ok2 and ok3:
        print("=== All patches applied successfully ===")
    else:
        print("=== Some patches failed - check warnings above ===")
        if not ok1: print("  FAIL: db.ts")
        if not ok2: print("  FAIL: payment-validation/route.ts")
        if not ok3: print("  FAIL: payments-list/route.ts")
