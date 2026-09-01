import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { isFirebaseAvailable } from '@/lib/firebase-check';

// P0-04 FIX: SSRF protection - validate URLs to prevent internal network access
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow HTTPS
    if (parsed.protocol !== 'https:') return false;
    // Block internal/private IPs
    const hostname = parsed.hostname.toLowerCase();
    // IPv4 private ranges
    if (/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|0\.|169\.254\.)/.test(hostname)) return false;
    // IPv6 private
    if (hostname === '::1' || hostname === '[::1]' || hostname.startsWith('fe80:') || hostname.startsWith('fc') || hostname.startsWith('fd')) return false;
    // Block localhost variants
    if (hostname === 'localhost' || hostname === 'localhost.localdomain' || hostname.endsWith('.local')) return false;
    // Block metadata endpoints
    if (hostname.endsWith('.amazonaws.com') && parsed.pathname.includes('meta-data')) return false;
    // Allow known safe domains for Google Chat and WhatsApp
    const ALLOWED_DOMAINS = [
      'chat.googleapis.com',
      'hooks.chat.googleapis.com', 
      'graph.facebook.com',
    ];
    if (ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))) return true;
    // If not in allowlist, reject
    console.warn('[SSRF] URL blocked - not in allowlist:', url);
    return false;
  } catch {
    return false;
  }
}

interface AlertPayload {
  bookingId: string;
  courtName: string;
  endTime: string;
  remainingMinutes: number;
  alertType: 'warning' | 'expired';
  userName?: string;
  userPhone?: string;
  startTime?: string;
}

// ── POST /api/notifications/dispatch ──
// Dispatches notifications to external services (Google Chat, WhatsApp)
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { alerts, settings, test } = body as {
      alerts: AlertPayload[];
      settings: Record<string, unknown>;
      test?: boolean;
    };

    if (!alerts || !Array.isArray(alerts) || alerts.length === 0) {
      return NextResponse.json({ success: true, message: 'No alerts to dispatch' });
    }

    const results: Record<string, { ok: boolean; error?: string }> = {};

    // ── 1. Google Chat Webhook ──
    const webhookUrl = settings.googleChatWebhookUrl as string;
    if (webhookUrl) {
      // P0-04 FIX: Validate URL to prevent SSRF
      if (!isSafeUrl(webhookUrl)) {
        results.googleChat = { ok: false, error: 'URL no permitida (posible SSRF bloqueado)' };
      } else {
        try {
          for (const alert of alerts) {
            const isExpired = alert.alertType === 'expired';
                    const emoji = isExpired ? '\u{1F6D1}' : '\u{26A0}\u{FE0F}';
                    const text = isExpired
            ? `${emoji} *TURNO FINALIZADO*\nCancha: ${alert.courtName}\nHora fin: ${alert.endTime}`
            : `${emoji} *Tiempo por terminar*\nCancha: ${alert.courtName}\nRestante: ${alert.remainingMinutes} min\nHora fin: ${alert.endTime}`;

                    if (test) {
            // Test message
            const testText = `\u{2705} *TEST - Sistema de Alertas CREARD*\n${text}\n_Las notificaciones estan funcionando correctamente._`;
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: testText }),
            });
                    } else {
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text }),
            });
                    }
        }
          results.googleChat = { ok: true };
        } catch (err: any) {
          console.warn('[Notifications] Google Chat failed:', err.message);
          results.googleChat = { ok: false, error: err.message };
        }
      }
    }

    // ── 2. WhatsApp to Admin ──
    const waEnabled = settings.whatsappEnabled as boolean;
    const waApiUrl = settings.whatsappApiUrl as string;
    const waToken = settings.whatsappAuthToken as string;
    const waAdminPhone = settings.whatsappAdminPhone as string;

    if (waEnabled && waApiUrl && waToken && waAdminPhone) {
      try {
        const phoneId = waApiUrl.match(/\/(\d+)\/messages/)?.[1];
        if (!phoneId) {
          results.whatsapp_admin = { ok: false, error: 'No se pudo extraer el Phone Number ID de la URL' };
        } else {
          const baseUrl = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

          for (const alert of alerts) {
            const isExpired = alert.alertType === 'expired';
            const msgText = isExpired
              ? `*TURNO FINALIZADO*\nCancha: ${alert.courtName}\nHora fin: ${alert.endTime}`
              : `*Tiempo por terminar*\nCancha: ${alert.courtName}\nRestante: ${alert.remainingMinutes} min\nHora fin: ${alert.endTime}`;

            await fetch(baseUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${waToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: waAdminPhone,
                type: 'text',
                text: { body: msgText },
              }),
            });
                    }
          results.whatsapp_admin = { ok: true };
        }
      } catch (err: any) {
        console.warn('[Notifications] WhatsApp admin failed:', err.message);
        results.whatsapp_admin = { ok: false, error: err.message };
      }
    }

    // ── 3. WhatsApp Client Reminder ──
    const waClientEnabled = settings.whatsappClientReminder as boolean;
    const waClientMins = settings.whatsappClientMinutesBefore as number;

    if (waClientEnabled && !test && waApiUrl && waToken) {
      try {
        const phoneId = waApiUrl.match(/\/(\d+)\/messages/)?.[1];
        if (phoneId) {
          const baseUrl = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

          for (const alert of alerts) {
            // Only send client reminder if it's the warning type AND matches the configured minutes
            if (alert.alertType === 'warning' && alert.remainingMinutes <= waClientMins && alert.userPhone) {
              // Clean phone number - assume it already has country code
              const clientPhone = alert.userPhone.replace(/[^0-9]/g, '');
              if (clientPhone.length >= 10) {
                await fetch(baseUrl, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${waToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: clientPhone,
                    type: 'text',
                    text: {
                      body: `Hola ${alert.userName || ''}! Te recordamos que tu turno en ${alert.courtName} termina en ${alert.remainingMinutes} minutos.\n\nGracias por jugar con nosotros! \u26BD`,
                    },
                  }),
                });
                results.whatsapp_client = { ok: true };
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('[Notifications] WhatsApp client failed:', err.message);
        results.whatsapp_client = { ok: false, error: err.message };
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('[Notifications] Dispatch error:', error);
    return NextResponse.json(
      { error: 'Error al enviar notificaciones' },
      { status: 500 }
    );
  }
}