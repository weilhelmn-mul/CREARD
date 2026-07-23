import { NextRequest, NextResponse } from 'next/server';
import { requireAnyAuth } from '@/lib/auth-middleware';
import { getClaimById } from '@/lib/db';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAnyAuth(request);
    if ('status' in authResult) return authResult; // Auth failed
    const auth = authResult.user;
    const { id } = await params;

    const claim = await getClaimById(id);
    if (!claim) {
      return NextResponse.json({ error: 'Reclamo no encontrado' }, { status: 404 });
    }

    // Users can only see their own claims
    if (auth.role === 'user' && claim.consumer_id !== auth.id) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // ── Header ──
    doc.setFillColor(12, 22, 10);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(0, 255, 65);
    doc.setFontSize(18);
    doc.text('CREARD EIRL', 15, y + 5);
    doc.setFontSize(9);
    doc.setTextColor(218, 230, 210);
    doc.text('RUC: 20612345678', 15, y + 12);
    doc.text('Dirección: Cusco, Perú', 15, y + 17);
    doc.text('Teléfono: (084) 000000', 15, y + 22);

    doc.setTextColor(0, 255, 65);
    doc.setFontSize(14);
    doc.text('HOJA DE RECLAMACIÓN', pageWidth - 15, y + 10, { align: 'right' });
    doc.setFontSize(8);
    doc.setTextColor(218, 230, 210);
    doc.text('Libro de Reclamaciones Virtual', pageWidth - 15, y + 17, { align: 'right' });

    y = 48;

    // ── Claim Number ──
    doc.setFontSize(11);
    doc.setTextColor(12, 22, 10);
    doc.setFont('helvetica', 'bold');
    doc.text(`N° de Reclamo: ${claim.claim_number}`, 15, y);
    y += 4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const rcvDate = claim.received_date instanceof Date
      ? claim.received_date.toLocaleDateString('es-PE')
      : new Date(claim.received_date as unknown as Date).toLocaleDateString('es-PE');
    doc.text(`Fecha de recepción: ${rcvDate}`, 15, y);
    y += 4;
    const dlDate = claim.deadline_date instanceof Date
      ? claim.deadline_date.toLocaleDateString('es-PE')
      : new Date(claim.deadline_date as unknown as Date).toLocaleDateString('es-PE');
    doc.text(`Plazo de atención: ${dlDate} (15 días hábiles)`, 15, y);
    y += 4;
    doc.text(`Tipo: ${claim.claim_type === 'queja' ? 'QUEJA' : 'RECLAMO'}`, 15, y);

    y += 10;

    // ── Consumer Data Table ──
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(12, 22, 10);
    doc.text('1. DATOS DEL CONSUMIDOR', 15, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      body: [
        ['Nombre completo', claim.consumer_name || ''],
        ['Tipo de documento', claim.consumer_document_type || ''],
        ['N° de documento', claim.consumer_document_number || ''],
        ['Dirección', claim.consumer_address || ''],
        ['Teléfono', claim.consumer_phone || ''],
        ['Correo electrónico', claim.consumer_email || ''],
      ],
      theme: 'grid',
      head: [],
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold', fillColor: [243, 243, 243] },
        1: { cellWidth: 125 },
      },
      margin: { left: 15, right: 15 },
      styles: { fontSize: 8.5, cellPadding: 3 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
    // ── Service Data ──
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(12, 22, 10);
    doc.text('2. IDENTIFICACIÓN DEL BIEN CONTRATADO', 15, y);
    y += 3;

    const serviceRows = [
      ['Tipo de servicio', 'Reserva de cancha deportiva'],
      ['Descripción', claim.description || ''],
    ];
    if (claim.related_booking_id) {
      serviceRows.push(
        ['Cancha', claim.related_court_name || 'N/A'],
        ['Fecha de reserva', claim.related_booking_date || 'N/A'],
        ['Horario', claim.related_booking_time || 'N/A'],
        ['Monto', claim.related_booking_amount ? `S/ ${Number(claim.related_booking_amount).toFixed(2)}` : 'N/A'],
        ['Método de pago', claim.related_payment_method || 'N/A'],
        ['N° de operación', claim.related_payment_ref || 'N/A'],
      );
    }

    autoTable(doc, {
      startY: y,
      body: serviceRows,
      theme: 'grid',
      head: [],
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold', fillColor: [243, 243, 243] },
        1: { cellWidth: 125 },
      },
      margin: { left: 15, right: 15 },
      styles: { fontSize: 8.5, cellPadding: 3 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
    // ── Consumer Request ──
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(12, 22, 10);
    doc.text('3. DETALLE DE LA QUEJA O RECLAMO', 15, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      body: [
        ['Descripción del hecho', claim.description || ''],
        ['Qué solicita el consumidor', claim.consumer_request || ''],
      ],
      theme: 'grid',
      head: [],
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold', fillColor: [243, 243, 243] },
        1: { cellWidth: 125 },
      },
      margin: { left: 15, right: 15 },
      styles: { fontSize: 8.5, cellPadding: 3 },
    },
    );

    y = (doc as any).lastAutoTable.finalY + 10;
    // ── Provider Response ──
    if (claim.provider_response) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(12, 22, 10);
      doc.text('4. RESPUESTA DEL PROVEEDOR', 15, y);
      y += 3;

      autoTable(doc, {
        startY: y,
        body: [
          ['Respuesta', claim.provider_response],
          ['Fecha de respuesta', claim.provider_response_date
            ? (claim.provider_response_date instanceof Date
              ? claim.provider_response_date.toLocaleDateString('es-PE')
              : new Date(claim.provider_response_date).toLocaleDateString('es-PE'))
            : 'Pendiente'],
        ],
        theme: 'grid',
        head: [],
        columnStyles: {
          0: { cellWidth: 55, fontStyle: 'bold', fillColor: [243, 243, 243] },
          1: { cellWidth: 125 },
        },
        margin: { left: 15, right: 15 },
        styles: { fontSize: 8.5, cellPadding: 3 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // ── Signatures ──
    if (y > 250) doc.addPage();
    const sigY = Math.max(y, 250);

    doc.setDrawColor(100);
    doc.line(15, sigY, 100, sigY);
    doc.line(115, sigY, 195, sigY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Firma del Consumidor', 15, sigY + 5);
    doc.text('Firma del Proveedor', 115, sigY + 5);

    doc.text('Nombre: ________________________', 15, sigY + 12);
    doc.text('Nombre: ________________________', 115, sigY + 12);

    doc.text('DNI: ____________________________', 15, sigY + 19);
    doc.text('DNI: ____________________________', 115, sigY + 19);

    // ── QR Code (if available) ──
    if (claim.qr_code_url) {
      try {
        doc.addImage(claim.qr_code_url, 'PNG', 75, sigY + 25, 50, 50);
      } catch {
        // QR not embedded, skip
      }
    }

    // ── Footer ──
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `Documento generado automáticamente por CREARD - Libro de Reclamaciones Virtual | ${new Date().toLocaleDateString('es-PE')}`,
      pageWidth / 2,
      footerY,
      { align: 'center' }
    );

    const pdfBuffer = doc.output('arraybuffer');

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="reclamo_${claim.claim_number}.pdf"`,
      },
    });
  } catch (error: unknown) {
    console.error('[claims/pdf] Error:', error);
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 });
  }
}
