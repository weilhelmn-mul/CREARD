/* ══════════════════════════════════════════════════════════════
   FIX #14 (FASE 4): Etiquetas legibles para métodos de pago.
   Antes se mostraba el valor crudo de la BD ('yape', 'EFECTIVO',
   'culqi'...) al usuario. Esta utilidad lo mapea a un texto con
   formato correcto y, si no reconoce el valor, lo devuelve tal
   cual (fallback seguro, sin romper datos nuevos).
   ══════════════════════════════════════════════════════════════ */

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  yape: 'Yape',
  plin: 'Plin',
  culqi: 'Tarjeta (Culqi)',
  card: 'Tarjeta',
  cash: 'Efectivo',
  efectivo: 'Efectivo',
  transfer: 'Transferencia',
  transferencia: 'Transferencia',
  mixto: 'Mixto',
  // Variantes en mayúsculas usadas por el panel admin
  YAPE: 'Yape',
  PLIN: 'Plin',
  CULQI: 'Tarjeta (Culqi)',
  EFECTIVO: 'Efectivo',
  MIXTO: 'Mixto',
}

export function paymentMethodLabel(method?: string | null): string {
  if (!method) return ''
  return (
    PAYMENT_METHOD_LABELS[method] ||
    PAYMENT_METHOD_LABELS[method.toLowerCase()] ||
    PAYMENT_METHOD_LABELS[method.toUpperCase()] ||
    method
  )
}
