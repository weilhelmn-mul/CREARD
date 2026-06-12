import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { isFirebaseAvailable } from '@/lib/firebase-check';

// ── GET /api/notifications/settings ──
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  try {
    if (!isFirebaseAvailable()) {
      return NextResponse.json({
        enabled: true,
        warningMinutesBefore: 5,
        soundEnabled: true,
        soundVolume: 0.6,
        googleChatWebhookUrl: '',
        googleTasksEnabled: false,
        whatsappEnabled: false,
        whatsappApiUrl: '',
        whatsappAuthToken: '',
        whatsappAdminPhone: '',
        whatsappClientReminder: false,
        whatsappClientMinutesBefore: 10,
      });
    }

    const { adminDb } = await import('@/lib/firebase-admin');
    const doc = await adminDb.collection('site_settings').doc('notifications').get();

    if (doc.exists) {
      return NextResponse.json(doc.data());
    }

    // Return defaults if no settings saved yet
    return NextResponse.json({
      enabled: true,
      warningMinutesBefore: 5,
      soundEnabled: true,
      soundVolume: 0.6,
      googleChatWebhookUrl: '',
      googleTasksEnabled: false,
      whatsappEnabled: false,
      whatsappApiUrl: '',
      whatsappAuthToken: '',
      whatsappAdminPhone: '',
      whatsappClientReminder: false,
      whatsappClientMinutesBefore: 10,
    });
  } catch (error) {
    console.error('[Notifications] Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuracion' },
      { status: 500 }
    );
  }
}

// ── PUT /api/notifications/settings ──
export async function PUT(request: NextRequest) {
  const authResult = await requireAuth(request, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();

    if (!isFirebaseAvailable()) {
      // Demo mode: just return success
      return NextResponse.json({ success: true, message: 'Configuracion guardada (demo)' });
    }

    const { adminDb } = await import('@/lib/firebase-admin');
    const { Timestamp } = await import('firebase-admin/firestore');

    await adminDb.collection('site_settings').doc('notifications').set({
      ...body,
      updated_at: Timestamp.now(),
    }, { merge: true });

    return NextResponse.json({ success: true, message: 'Configuracion guardada' });
  } catch (error) {
    console.error('[Notifications] Error saving settings:', error);
    return NextResponse.json(
      { error: 'Error al guardar configuracion' },
      { status: 500 }
    );
  }
}