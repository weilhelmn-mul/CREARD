// ============================================================
// CREARD - API Route: /api/client-settings
// GET / PUT: Umbrales configurables de fidelización de clientes
//            (clasificación Nuevo / Frecuente / Muy frecuente / VIP
//             por nº de reservas y por monto acumulado).
// Almacena un único documento en Firestore: app_settings/client_levels
// Solo administradores (admin / super_admin).
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyAuth } from '@/lib/auth-middleware';
import { isFirebaseAvailable } from '@/lib/firebase-check';
import { Timestamp } from 'firebase-admin/firestore';

export interface ClientLevels {
  byBookings: { vip: number; muyFrecuente: number; frecuente: number };
  byAmount: { vip: number; muyFrecuente: number; frecuente: number };
}

// Defaults (criterio solicitado por el admin: nuevo 1-2, frecuente 3-9,
// muy frecuente 10-19, VIP 20+ / alternativa por monto acumulado en S/)
export const DEFAULT_CLIENT_LEVELS: ClientLevels = {
  byBookings: { vip: 20, muyFrecuente: 10, frecuente: 3 },
  byAmount: { vip: 2000, muyFrecuente: 1000, frecuente: 300 },
};

const DOC_PATH = { collection: 'app_settings', doc: 'client_levels' } as const;

function sanitizeLevels(raw: unknown): ClientLevels {
  const src = (raw || {}) as Record<string, unknown>;
  const num = (v: unknown, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
  };
  const bb = (src.byBookings || {}) as Record<string, unknown>;
  const ba = (src.byAmount || {}) as Record<string, unknown>;
  const db = DEFAULT_CLIENT_LEVELS;
  return {
    byBookings: {
      vip: num(bb.vip, db.byBookings.vip),
      muyFrecuente: num(bb.muyFrecuente, db.byBookings.muyFrecuente),
      frecuente: num(bb.frecuente, db.byBookings.frecuente),
    },
    byAmount: {
      vip: num(ba.vip, db.byAmount.vip),
      muyFrecuente: num(ba.muyFrecuente, db.byAmount.muyFrecuente),
      frecuente: num(ba.frecuente, db.byAmount.frecuente),
    },
  };
}

async function requireAdmin(request: NextRequest) {
  if (!isFirebaseAvailable()) {
    return { error: NextResponse.json({ error: 'Firebase no configurado' }, { status: 503 }) };
  }
  const authResult = await requireAnyAuth(request);
  if (authResult instanceof NextResponse) return { error: authResult };
  const authUser = authResult.user;
  if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
    return { error: NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 }) };
  }
  return { authUser };
}

// GET — devuelve los umbrales actuales (o los defaults si aún no existen)
export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;

  try {
    const { adminDb } = await import('@/lib/firebase-admin');
    const snap = await adminDb.collection(DOC_PATH.collection).doc(DOC_PATH.doc).get();
    if (!snap.exists) {
      return NextResponse.json({ ...DEFAULT_CLIENT_LEVELS, _isDefault: true });
    }
    return NextResponse.json({ ...sanitizeLevels(snap.data()), _isDefault: false });
  } catch (error) {
    console.error('[CLIENT-SETTINGS] GET error:', error);
    // Fallback resiliente: mejores defaults en memoria antes que romper el módulo
    return NextResponse.json({ ...DEFAULT_CLIENT_LEVELS, _isDefault: true, _fallback: true });
  }
}

// PUT — guarda los umbrales (body completo o parcial)
export async function PUT(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;

  try {
    const body = await request.json().catch(() => ({}));
    const { adminDb } = await import('@/lib/firebase-admin');
    const currentSnap = await adminDb.collection(DOC_PATH.collection).doc(DOC_PATH.doc).get();
    const merged = {
      ...DEFAULT_CLIENT_LEVELS,
      ...(currentSnap.exists ? (currentSnap.data() as Record<string, unknown>) : {}),
      ...(body as Record<string, unknown>),
    };
    const levels = sanitizeLevels(merged);
    await adminDb.collection(DOC_PATH.collection).doc(DOC_PATH.doc).set({
      ...levels,
      updated_at: Timestamp.now(),
      updated_by: guard.authUser?.email || 'admin',
    });
    return NextResponse.json({ ok: true, ...levels });
  } catch (error) {
    console.error('[CLIENT-SETTINGS] PUT error:', error);
    return NextResponse.json({ error: 'No se pudieron guardar los umbrales.' }, { status: 500 });
  }
}
