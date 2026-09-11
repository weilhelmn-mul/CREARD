// ============================================================
// CREARD — Exportación CSV y contacto WhatsApp (módulo Clientes)
// Solo utilidades de presentación: no toca datos ni lógica
// de negocio. Aditivo, sin dependencias externas.
// ============================================================

import { type ClientStat, type AnalyticsBooking, fmtCurrency, statusBadge, CLIENT_LEVELS } from './clientAnalyticsShared'

/* ─── CSV básico con BOM (abre bien en Excel con UTF-8) ─── */
function csvCell(v: string | number): string {
  const s = String(v ?? '')
  // Comillas para evitar roturas con comas, saltos o puntos y coma
  if (/[";\n,]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(','))
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ─── Export: Ingresos por usuario (tabla principal) ─── */
export function exportClientsCsv(clients: ClientStat[], periodLabel: string) {
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  const header = [
    'Cliente', 'Teléfono', 'Correo', 'Reservas', 'Pagadas', 'Canceladas', 'Pendientes',
    'Monto reservado', 'Pagado', 'Pendiente $', 'Adelantos', 'Pagos restantes',
    'Última reserva', 'Última cancha', 'Estado',
  ]
  const rows = clients.map((c) => [
    c.name, c.phone || '', c.email || '',
    c.total, c.completed, c.cancelled, c.pending,
    fmtCurrency(c.montoReservado), fmtCurrency(c.montoPagado),
    c.montoPendiente > 0 ? fmtCurrency(c.montoPendiente) : '',
    c.adelantosCount, c.pagosRestantesCount,
    c.lastDate || '', c.lastCourt || '',
    CLIENT_LEVELS[c.level].label,
  ])
  downloadCsv(`creard_clientes_${periodLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${date}.csv`, header, rows)
}

/* ─── Export: historial de operaciones del balance del usuario ─── */
export function exportHistoryCsv(stat: ClientStat, bookings: AnalyticsBooking[]) {
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  const header = ['Fecha', 'Cancha', 'Deporte', 'Horario', 'Reserva', 'Pago', 'Monto', 'Estado']
  const rows = bookings.map((b) => {
    const st = statusBadge(b.status)
    return [
      b.date,
      b.courtName || '',
      b.sport || '',
      `${b.startTime} - ${b.endTime}`,
      fmtCurrency(b.totalPrice),
      fmtCurrency(b.advanceAmount),
      b.remainingAmount > 0.01 ? fmtCurrency(b.remainingAmount) : '',
      st.label,
    ]
  })
  const safeName = stat.name.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '_').slice(0, 40)
  downloadCsv(`creard_balance_${safeName}_${date}.csv`, header, rows)
}

/* ─── WhatsApp: normaliza a formato internacional y arma el link ───
   Perú: si el número no trae código de país, se antepone 51. */
export function buildWhatsAppLink(name: string, phone: string, pendingAmount = 0): string | null {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length < 7) return null
  const intl = digits.startsWith('51') ? digits : `51${digits}`
  const base = `Hola ${name || ''}, te contactamos de CREARD (reserva de canchas). `
  const msg = pendingAmount > 0.01
    ? `${base}Registramos un saldo pendiente de ${fmtCurrency(pendingAmount)} en tus reservas. ¿Deseas coordinar el pago?`
    : `${base}¡Gracias por jugar con nosotros!`
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`
}
