// ============================================================
// CREARD - API Route: /api/payment-methods
// GET  : Lee metodos de pago activos (publico)
// PUT  : Activa/desactiva metodos (solo admin/super_admin)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const CONFIG_DOC = 'payment_methods';

interface PaymentMethodsConfig {
  yape_qr: boolean;
  culqi: boolean;
}

// GET /api/payment-methods - Public read
export async function GET() {
  try {
    const db = getAdminDb();
    const doc = await db.collection('configuracion_pago').doc(CONFIG_DOC).get();

    if (!doc.exists) {
      // Default: Yape active, Culqi disabled
      return NextResponse.json({ yape_qr: true, culqi: false });
    }

    return NextResponse.json(doc.data());
  } catch (error: any) {
    console.error('[PAYMENT-METHODS] Error:', error.message);
    return NextResponse.json({ yape_qr: true, culqi: false });
  }
}

// PUT /api/payment-methods - Admin only
export async function PUT(request: NextRequest) {
  const authResult = await requireAuth(request, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { yape_qr, culqi } = body;

    if (typeof yape_qr !== 'boolean' || typeof culqi !== 'boolean') {
      return NextResponse.json({ error: 'Valores booleanos requeridos.' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection('configuracion_pago').doc(CONFIG_DOC).set({
      yape_qr,
      culqi,
      updated_at: Timestamp.now(),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PAYMENT-METHODS] Error updating:', error.message);
    return NextResponse.json({ error: 'Error al actualizar metodos de pago.' }, { status: 500 });
  }
}
