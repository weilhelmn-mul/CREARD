// ============================================================
// CREARD - API Route: /api/yape-config
// GET  : Lee la configuracion de Yape (publico)
// PUT  : Actualiza la configuracion (solo admin/super_admin)
// POST : Sube/actualiza la imagen QR (solo admin/super_admin)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const CONFIG_DOC = 'yape_payment';

interface YapeConfig {
  qr_url: string;
  nombre_titular: string;
  numero_yape: string;
  mensaje: string;
  activo: boolean;
}

// GET /api/yape-config - Public read
export async function GET() {
  try {
    const db = getAdminDb();
    const doc = await db.collection('configuracion_pago').doc(CONFIG_DOC).get();
    
    if (!doc.exists) {
      // Return defaults
      return NextResponse.json({
        qr_url: '',
        nombre_titular: '',
        numero_yape: '',
        mensaje: 'Escanee el codigo QR con la aplicacion Yape y realice el pago del monto correspondiente.',
        activo: true,
      });
    }
    
    return NextResponse.json(doc.data());
  } catch (error: any) {
    console.error('[YAPE-CONFIG] Error reading config:', error.message);
    return NextResponse.json({ error: 'Error al leer configuracion.' }, { status: 500 });
  }
}

// PUT /api/yape-config - Admin only
export async function PUT(request: NextRequest) {
  const authResult = await requireAuth(request, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { qr_url, nombre_titular, numero_yape, mensaje, activo } = body;

    const db = getAdminDb();
    const data: Record<string, unknown> = {
      updated_at: Timestamp.now(),
    };
    if (qr_url !== undefined) data.qr_url = qr_url;
    if (nombre_titular !== undefined) data.nombre_titular = nombre_titular;
    if (numero_yape !== undefined) data.numero_yape = numero_yape;
    if (mensaje !== undefined) data.mensaje = mensaje;
    if (activo !== undefined) data.activo = activo;

    await db.collection('configuracion_pago').doc(CONFIG_DOC).set(data, { merge: true });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[YAPE-CONFIG] Error updating config:', error.message);
    return NextResponse.json({ error: 'Error al actualizar configuracion.' }, { status: 500 });
  }
}

// POST /api/yape-config - Upload QR image (base64)
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { qr_base64 } = body;

    if (!qr_base64 || typeof qr_base64 !== 'string') {
      return NextResponse.json({ error: 'Imagen QR es requerida.' }, { status: 400 });
    }

    // Validate base64 is an image
    const mimeMatch = qr_base64.match(/^data:(image\/(png|jpe?g|webp));base64,/);
    if (!mimeMatch) {
      return NextResponse.json(
        { error: 'Formato invalido. Use PNG, JPG o WEBP.' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    await db.collection('configuracion_pago').doc(CONFIG_DOC).set({
      qr_url: qr_base64,
      updated_at: Timestamp.now(),
    }, { merge: true });

    return NextResponse.json({ success: true, message: 'QR actualizado.' });
  } catch (error: any) {
    console.error('[YAPE-CONFIG] Error uploading QR:', error.message);
    return NextResponse.json({ error: 'Error al subir imagen QR.' }, { status: 500 });
  }
}
