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
