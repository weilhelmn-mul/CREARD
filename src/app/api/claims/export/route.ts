import { NextRequest, NextResponse } from 'next/server';
import { getClaims, ClaimStatus } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'admin');
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const statusFilter = searchParams.get('status') as ClaimStatus | null;

    if (format === 'pdf') {
      return NextResponse.json(
        { error: 'PDF export not implemented yet' },
        { status: 400 }
      );
    }

    const filters: Parameters<typeof getClaims>[0] = {};
    if (statusFilter) filters.status = statusFilter;
    const claims = await getClaims(filters);

    if (format === 'excel') {
      const XLSX = await import('xlsx');
      const rows = claims.map((c) => ({
        'N\u00b0 Reclamo': c.claim_number || '',
        'Tipo': c.claim_type || '',
        'Estado': c.status || '',
        'Nombre': c.consumer_name || '',
        'Documento': c.consumer_document_number || '',
        'Email': c.consumer_email || '',
        'Tel\u00e9fono': c.consumer_phone || '',
        'Descripci\u00f3n': c.description || '',
        'Fecha Recepci\u00f3n': c.received_date
          ? new Date(c.received_date as unknown as string).toLocaleDateString('es-PE')
          : '',
        'Fecha L\u00edmite': c.deadline_date
          ? new Date(c.deadline_date as unknown as string).toLocaleDateString('es-PE')
          : '',
        'Fecha Cierre': c.closed_date
          ? new Date(c.closed_date as unknown as string).toLocaleDateString('es-PE')
          : '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reclamos');
      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="libro_reclamaciones.xlsx"',
        },
      });
    }

    // Default: CSV
    const headers = [
      'N\u00b0 Reclamo',
      'Tipo',
      'Estado',
      'Nombre',
      'Documento',
      'Email',
      'Tel\u00e9fono',
      'Descripci\u00f3n',
      'Fecha Recepci\u00f3n',
      'Fecha L\u00edmite',
      'Fecha Cierre',
    ];

    const escapeCsv = (val: string) => {
      if (!val) return '""';
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    };

    const formatDate = (d: unknown) => {
      if (!d) return '';
      return new Date(d as string).toLocaleDateString('es-PE');
    };

    const csvRows: string[] = [];
    csvRows.push(headers.map(escapeCsv).join(','));

    for (const c of claims) {
      csvRows.push(
        [
          c.claim_number || '',
          c.claim_type || '',
          c.status || '',
          c.consumer_name || '',
          c.consumer_document_number || '',
          c.consumer_email || '',
          c.consumer_phone || '',
          c.description || '',
          formatDate(c.received_date),
          formatDate(c.deadline_date),
          formatDate(c.closed_date),
        ]
          .map(escapeCsv)
          .join(',')
      );
    }

    const csvString = csvRows.join('\n');
    return new NextResponse(csvString, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="libro_reclamaciones.csv"',
      },
    });
  } catch (error: unknown) {
    console.error('[API /claims/export GET] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
