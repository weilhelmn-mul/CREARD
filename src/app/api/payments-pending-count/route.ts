import { NextRequest, NextResponse } from 'next/server';
import { Filter } from 'firebase-admin/firestore';
import { requireAuth } from '@/lib/auth-middleware';
import { getAdminDb } from '@/lib/firebase-admin';
import { isFirebaseAvailable } from '@/lib/firebase-check';
import { isQuotaError, quotaErrorResponse } from '@/lib/api-errors';

// ============================================================
// CREARD - API Route: /api/payments-pending-count
// Cuenta los pagos que esperan validación del admin SIN leer los
// documentos: usa la agregación count() de Firestore (≈1 lectura
// por llamada, vs ~600 lecturas del fetch completo de reservas).
//
// Criterio (idéntico al filtro de la pestaña Pagos):
//   1) status == 'payment_pending'                      (adelantos)
//   2) status == 'reserved' AND
//      remaining_payment_status == 'pending'            (saldos)
//
// Sustituye al polling de 30 s que traía 365 días de reservas
// (~600 lecturas/petición → agotaba la cuota diaria de Firestore
// en menos de una hora, causando 401 "Autenticacion requerida").
// ============================================================

async function countWithFallback(): Promise<number> {
  const db = getAdminDb();
  const bookings = db.collection('bookings');

  // Intento principal: UNA agregación con OR (sin lecturas de docs)
  try {
    const q = bookings.where(
      Filter.or(
        Filter.where('status', '==', 'payment_pending'),
        Filter.and(
          Filter.where('status', '==', 'reserved'),
          Filter.where('remaining_payment_status', '==', 'pending')
        )
      )
    );
    const snap = await q.count().get();
    return snap.data().count || 0;
  } catch (err) {
    // FAILED_PRECONDITION = índice compuesto faltante para el OR:
    // caer a dos agregaciones de un solo campo (no requieren índice)
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('FAILED_PRECONDITION') && !msg.includes('index')) {
      throw err;
    }
  }

  // Fallback: dos agregaciones simples (misma semántica aproximada;
  // suficiente para detección de cambios del polling)
  const [advSnap, remSnap] = await Promise.all([
    bookings.where('status', '==', 'payment_pending').count().get(),
    bookings.where('remaining_payment_status', '==', 'pending').count().get(),
  ]);
  return (advSnap.data().count || 0) + (remSnap.data().count || 0);
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  if (!isFirebaseAvailable()) {
    return NextResponse.json({ error: 'Firebase no configurado', code: 'NO_FIREBASE' }, { status: 503 });
  }

  try {
    const count = await countWithFallback();
    return NextResponse.json({ count, at: Date.now() });
  } catch (error) {
    console.error('[PAYMENTS-PENDING-COUNT] Error:', error);
    if (isQuotaError(error)) return quotaErrorResponse();
    return NextResponse.json({ error: 'Error al contar pagos pendientes' }, { status: 500 });
  }
}
