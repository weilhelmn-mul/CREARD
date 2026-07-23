import { NextRequest, NextResponse } from 'next/server';
import {
  getClaims,
  createClaim,
  updateClaim,
  archiveClaim,
  unarchiveClaim,
  generateClaimNumber,
  addClaimAuditEntry,
  getClaimById,
  ClaimType,
  ClaimStatus,
} from '@/lib/db';
import { requireAnyAuth, requireAuth } from '@/lib/auth-middleware';
// REQUISITO 2 (AUDITORÍA): Importar nodemailer para envío de correo de confirmación
import nodemailer from 'nodemailer';

// REQUISITO 2 (AUDITORÍA): Envío de correo de confirmación al consumidor
// al registrar un reclamo en el Libro de Reclamaciones Virtual
async function sendClaimConfirmationEmail(data: {
  consumerName: string
  consumerEmail: string
  claimNumber: string
  claimType: string
  description: string
  request: string
  deadlineDate: Date
}) {
  try {
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPass = process.env.SMTP_PASS || '';
    const smtpFrom = process.env.SMTP_FROM || smtpUser || 'no-reply@creard.com';

    if (!smtpUser || !smtpPass) {
      console.warn('[API /claims] SMTP no configurado. Saltando envío de correo.');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const deadlineStr = data.deadlineDate.toLocaleDateString('es-PE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    await transporter.sendMail({
      from: `"CREARD - Libro de Reclamaciones" <${smtpFrom}>`,
      to: data.consumerEmail,
      subject: `Confirmacion de ${data.claimType === 'queja' ? 'Queja' : 'Reclamo'} N. ${data.claimNumber} - CREARD`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333"><div style="background:#0a0a0a;padding:20px;border-radius:12px 12px 0 0;text-align:center"><h1 style="color:#00ff41;margin:0;font-size:24px">CREARD</h1><p style="color:#888;margin:4px 0 0;font-size:13px">Libro de Reclamaciones Virtual</p></div><div style="background:#fff;padding:30px;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px"><p>Estimado/a <strong>${data.consumerName}</strong>,</p><p>Hemos recibido su <strong>${data.claimType === 'queja' ? 'queja' : 'reclamo'}</strong> registrada con el numero:</p><div style="background:#f0fdf4;border:2px solid #00ff41;border-radius:8px;padding:16px;text-align:center;margin:20px 0"><p style="margin:0 0 4px;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:1px">Numero de registro</p><p style="margin:0;font-size:28px;font-weight:bold;color:#0a0a0a">${data.claimNumber}</p></div><p style="font-size:13px;color:#666">Puede hacer seguimiento desde nuestra aplicacion web.</p><div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:8px;padding:14px;margin:20px 0"><p style="margin:0 0 4px;font-size:12px;color:#92400e;font-weight:bold">Plazo maximo de atencion</p><p style="margin:0;font-size:16px;font-weight:bold;color:#92400e">${deadlineStr}</p><p style="margin:6px 0 0;font-size:12px;color:#92400e">(15 dias habiles - Ley N. 29571)</p></div></div><p style="text-align:center;font-size:11px;color:#999;margin-top:20px">Resolucion N. 007-2016-CCD-INDECOPI · Ley N. 29571<br/>CREARD · San Sebastian, Cusco, Peru</p></div>`,
    });
    console.log(`[API /claims] Correo enviado a ${data.consumerEmail}`);
  } catch (emailError) {
    console.error('[API /claims] Error enviando correo:', emailError);
  }
}

// ============================================================
// Helper: calculate 15 business days deadline (exclude weekends)
// ============================================================
function calculateDeadline(startDate: Date): Date {
  const date = new Date(startDate);
  let businessDays = 0;
  while (businessDays < 15) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      businessDays++;
    }
  }
  return date;
}

// ============================================================
// Helper: simple email validation
// ============================================================
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================================
// GET /api/claims - List claims
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAnyAuth(request);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') as ClaimStatus | null;
    const claimTypeFilter = searchParams.get('claim_type') as ClaimType | null;
    const archivedParam = searchParams.get('archived');
    const archivedFilter = archivedParam === 'true' ? true : archivedParam === 'false' ? false : undefined;

    const isAdmin = user.role === 'admin' || user.role === 'super_admin';

    const filters: Parameters<typeof getClaims>[0] = {};
    if (statusFilter) filters.status = statusFilter;
    if (claimTypeFilter) filters.claim_type = claimTypeFilter;
    if (archivedFilter !== undefined) filters.archived = archivedFilter;

    // Non-admin users only see their own claims
    if (!isAdmin) {
      filters.consumer_id = user.id;
    }

    const claims = await getClaims(filters);

    return NextResponse.json({ claims });
  } catch (error: unknown) {
    console.error('[API /claims GET] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/claims - Create a new claim
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAnyAuth(request);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    const body = await request.json();
    const {
      claim_type,
      consumer_document_type,
      consumer_document_number,
      consumer_name,
      consumer_address,
      consumer_phone,
      consumer_email,
      description,
      consumer_request,
      related_booking_id,
    } = body;

    // --- Validations ---
    if (!consumer_name || typeof consumer_name !== 'string' || consumer_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'El nombre del consumidor es obligatorio.' },
        { status: 400 }
      );
    }

    if (
      !consumer_document_number ||
      typeof consumer_document_number !== 'string' ||
      consumer_document_number.trim().length < 8 ||
      consumer_document_number.trim().length > 20
    ) {
      return NextResponse.json(
        { error: 'El numero de documento debe tener entre 8 y 20 caracteres.' },
        { status: 400 }
      );
    }

    const email = consumer_email || user.email;
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Se requiere un email valido.' },
        { status: 400 }
      );
    }

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return NextResponse.json(
        { error: 'La descripcion debe tener al menos 10 caracteres.' },
        { status: 400 }
      );
    }

    if (!consumer_request || typeof consumer_request !== 'string' || consumer_request.trim().length < 10) {
      return NextResponse.json(
        { error: 'La peticion del consumidor debe tener al menos 10 caracteres.' },
        { status: 400 }
      );
    }

    // --- Generate claim number ---
    const claim_number = await generateClaimNumber();

    // --- Calculate deadline ---
    const now = new Date();
    const deadline_date = calculateDeadline(now);

    // --- Generate QR code ---
    let qr_code_url: string | null = null;
    try {
      const QRCode = await import('qrcode');
      const qrText = `CREARD | Reclamo ${claim_number} | ${now.toISOString().split('T')[0]}`;
      qr_code_url = await QRCode.toDataURL(qrText);
    } catch (qrError) {
      console.warn('[API /claims POST] QR generation failed:', qrError);
    }

    // --- Build claim data ---
    const claimData: Record<string, unknown> = {
      claim_number,
      claim_type: claim_type || 'reclamo',
      status: 'received',
      consumer_id: user.id,
      consumer_document_type: consumer_document_type || 'DNI',
      consumer_document_number: consumer_document_number.trim(),
      consumer_name: consumer_name.trim(),
      consumer_address: consumer_address || '',
      consumer_phone: consumer_phone || '',
      consumer_email: email.trim(),
      description: description.trim(),
      consumer_request: consumer_request.trim(),
      channel: 'web',
      related_booking_id: related_booking_id || null,
      received_date: now,
      deadline_date,
      provider_response: null,
      provider_response_date: null,
      closed_date: null,
      attachments: [],
      qr_code_url,
      claim_sheet_url: null,
      archived: false,
      archived_at: null,
      archived_by: null,
      service_type: 'Reserva de cancha deportiva',
      related_court_name: null,
      related_booking_date: null,
      related_booking_time: null,
      related_booking_amount: null,
      related_payment_method: null,
      related_payment_ref: null,
    };

    // --- Create in DB ---
    const claimId = await createClaim(claimData);

    // --- Audit log ---
    await addClaimAuditEntry(
      claimId,
      'claim_created',
      user.id,
      user.name,
      user.role,
      `Reclamo ${claim_number} creado via web`
    );

    // REQUISITO 2 (AUDITORÍA): Enviar correo de confirmación al consumidor
    await sendClaimConfirmationEmail({
      consumerName: String(claimData.consumer_name),
      consumerEmail: String(claimData.consumer_email),
      claimNumber: claim_number,
      claimType: String(claimData.claim_type),
      description: String(claimData.description),
      request: String(claimData.consumer_request),
      deadlineDate: deadline_date,
    });

    // Fetch and return the created claim
    const claim = await getClaimById(claimId);

    return NextResponse.json({ success: true, claim });
  } catch (error: unknown) {
    console.error('[API /claims POST] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT /api/claims - Admin actions on claims
// ============================================================
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'admin');
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    const body = await request.json();
    const { action, id, ...fields } = body;

    if (!action || !id) {
      return NextResponse.json(
        { error: 'Se requieren los campos action e id.' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { updated_at: new Date() };
    let auditAction = action;
    let auditDetails = '';

    switch (action) {
      case 'update_status': {
        const { status } = fields;
        if (!status) {
          return NextResponse.json(
            { error: 'Se requiere el campo status.' },
            { status: 400 }
          );
        }
        updateData.status = status;
        auditDetails = `Estado cambiado a: ${status}`;
        if (status === 'closed') {
          updateData.closed_date = new Date();
          auditDetails += ' (fecha de cierre registrada)';
        }
        break;
      }

      case 'respond': {
        const { provider_response } = fields;
        if (!provider_response) {
          return NextResponse.json(
            { error: 'Se requiere el campo provider_response.' },
            { status: 400 }
          );
        }
        updateData.provider_response = provider_response;
        updateData.provider_response_date = new Date();
        updateData.status = 'responded';
        auditDetails = 'Respuesta del proveedor registrada';
        break;
      }

      case 'archive': {
        await archiveClaim(id, user.id);
        auditAction = 'archived';
        auditDetails = 'Reclamo archivado';
        await addClaimAuditEntry(id, auditAction, user.id, user.name, user.role, auditDetails);
        return NextResponse.json({ success: true });
      }

      case 'unarchive': {
        await unarchiveClaim(id);
        auditAction = 'unarchived';
        auditDetails = 'Reclamo desarchivado';
        await addClaimAuditEntry(id, auditAction, user.id, user.name, user.role, auditDetails);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: `Accion no reconocida: ${action}` },
          { status: 400 }
        );
    }

    // Apply update
    await updateClaim(id, updateData);

    // Audit entry
    await addClaimAuditEntry(id, auditAction, user.id, user.name, user.role, auditDetails);

    // Fetch updated claim
    const claim = await getClaimById(id);

    return NextResponse.json({ success: true, claim });
  } catch (error: unknown) {
    console.error('[API /claims PUT] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
