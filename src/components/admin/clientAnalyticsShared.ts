// ============================================================
// CREARD — Módulo de Análisis de Ingresos y Balance por Usuario
// Archivo compartido: tipos, helpers de periodo y agregación.
// Criterio de ingresos: MISMO que el panel Finanzas (audited):
//   reservas completed + reserved, monto = advanceAmount.
// ============================================================

export interface AnalyticsBooking {
  id: string
  userId: string
  date: string // 'YYYY-MM-DD'
  startTime: string
  endTime: string
  totalPrice: number
  advanceAmount: number
  remainingAmount: number
  status: string
  paymentMethod: string | null
  paymentBreakdown?: { efectivo: number; digital: number; digitalMethod?: string } | null
  courtName: string
  sport: string
  userName: string
  userEmail: string
  userPhone: string
}

export interface AnalyticsAdvance {
  id: string
  bookingId: string
  userId: string
  userName: string
  courtName: string
  bookingDate: string
  amount: number
  paymentMethod: string
  reason: string
  status: 'retained' | 'refunded'
}

export type ClientLevel = 'nuevo' | 'frecuente' | 'muy_frecuente' | 'vip'

export interface ClientLevelInfo {
  key: ClientLevel
  label: string
  chip: string // clases del badge
  bar: string  // color de segmento
  hex: string
}

export const CLIENT_LEVELS: Record<ClientLevel, ClientLevelInfo> = {
  vip:           { key: 'vip',           label: 'VIP',           chip: 'bg-amber-400/15 text-amber-300 border-amber-400/40',        bar: 'bg-amber-400',        hex: '#fbbf24' },
  muy_frecuente: { key: 'muy_frecuente', label: 'Muy frecuente', chip: 'bg-purple-400/15 text-purple-300 border-purple-400/40',     bar: 'bg-purple-400',       hex: '#c084fc' },
  frecuente:     { key: 'frecuente',     label: 'Frecuente',     chip: 'bg-sky-400/15 text-sky-300 border-sky-400/40',              bar: 'bg-sky-400',          hex: '#38bdf8' },
  nuevo:         { key: 'nuevo',         label: 'Nuevo',         chip: 'bg-cm-on-surface-variant/15 text-cm-on-surface-variant border-white/15', bar: 'bg-cm-on-surface-variant/50', hex: '#9ca3af' },
}

export const LEVEL_ORDER: ClientLevel[] = ['vip', 'muy_frecuente', 'frecuente', 'nuevo']

export interface ClientThresholds {
  byBookings: { vip: number; muyFrecuente: number; frecuente: number }
  byAmount: { vip: number; muyFrecuente: number; frecuente: number }
}

export const DEFAULT_THRESHOLDS: ClientThresholds = {
  byBookings: { vip: 20, muyFrecuente: 10, frecuente: 3 },
  byAmount: { vip: 2000, muyFrecuente: 1000, frecuente: 300 },
}

export function classifyByCount(totalAllTime: number, t: ClientThresholds): ClientLevel {
  if (totalAllTime >= t.byBookings.vip) return 'vip'
  if (totalAllTime >= t.byBookings.muyFrecuente) return 'muy_frecuente'
  if (totalAllTime >= t.byBookings.frecuente) return 'frecuente'
  return 'nuevo'
}

export function classifyByAmount(paidAllTime: number, t: ClientThresholds): ClientLevel {
  if (paidAllTime >= t.byAmount.vip) return 'vip'
  if (paidAllTime >= t.byAmount.muyFrecuente) return 'muy_frecuente'
  if (paidAllTime >= t.byAmount.frecuente) return 'frecuente'
  return 'nuevo'
}

/* ─── Periodos ─── */
export type PeriodKey = 'hoy' | 'ayer' | 'semana' | 'mes' | 'mes_anterior' | 'anio' | 'anio_anterior' | 'custom'

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'ayer', label: 'Ayer' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes', label: 'Este mes' },
  { key: 'mes_anterior', label: 'Mes anterior' },
  { key: 'anio', label: 'Este año' },
  { key: 'anio_anterior', label: 'Año anterior' },
  { key: 'custom', label: 'Personalizado' },
]

const pad2 = (n: number) => String(n).padStart(2, '0')
export const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

const addDaysStr = (dateStr: string, n: number) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`
}

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MONTHS_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export const fmtCurrency = (n: number) => `S/ ${(Number.isFinite(n) ? n : 0).toFixed(2)}`
export const fmtShort = (n: number) => {
  const v = Number.isFinite(n) ? n : 0
  if (Math.abs(v) >= 1000) return `S/ ${(v / 1000).toFixed(1)}k`
  return `S/ ${v.toFixed(0)}`
}
export const fmtDateFull = (d: string) => {
  if (!d) return '—'
  if (d.includes('-')) {
    const p = d.split('-').map(Number)
    return `${p[2]} ${MONTHS_ES[p[1] - 1]} ${p[0]}`
  }
  return d
}
export const fmtMonthKey = (key: string) => `${MONTHS_ES[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`

export interface DateRange { from: string; to: string; label: string }

export function periodRange(key: PeriodKey, customFrom: string, customTo: string): DateRange {
  const today = todayStr()
  const [ty, tm, td] = today.split('-').map(Number)
  switch (key) {
    case 'hoy':
      return { from: today, to: today, label: `Hoy · ${fmtDateFull(today)}` }
    case 'ayer': {
      const y = addDaysStr(today, -1)
      return { from: y, to: y, label: `Ayer · ${fmtDateFull(y)}` }
    }
    case 'semana': {
      const dow = new Date(Date.UTC(ty, tm - 1, td)).getUTCDay() // 0 = domingo
      const monday = addDaysStr(today, dow === 0 ? -6 : 1 - dow)
      const sunday = addDaysStr(monday, 6)
      return { from: monday, to: sunday, label: `Semana · ${fmtDateFull(monday)} – ${fmtDateFull(sunday)}` }
    }
    case 'mes':
      return {
        from: `${ty}-${pad2(tm)}-01`,
        to: `${ty}-${pad2(tm)}-${pad2(new Date(Date.UTC(ty, tm, 0)).getUTCDate())}`,
        label: `${MONTHS_FULL[tm - 1]} ${ty}`,
      }
    case 'mes_anterior': {
      const base = new Date(Date.UTC(ty, tm - 2, 1))
      const y = base.getUTCFullYear()
      const m = base.getUTCMonth() + 1
      return {
        from: `${y}-${pad2(m)}-01`,
        to: `${y}-${pad2(m)}-${pad2(new Date(Date.UTC(y, m, 0)).getUTCDate())}`,
        label: `${MONTHS_FULL[m - 1]} ${y} (anterior)`,
      }
    }
    case 'anio':
      return { from: `${ty}-01-01`, to: `${ty}-12-31`, label: `Año ${ty}` }
    case 'anio_anterior':
      return { from: `${ty - 1}-01-01`, to: `${ty - 1}-12-31`, label: `Año ${ty - 1}` }
    case 'custom': {
      const f = customFrom
      const t = customTo
      const label = f && t ? `${fmtDateFull(f)} – ${fmtDateFull(t)}`
        : f ? `Desde ${fmtDateFull(f)}`
        : t ? `Hasta ${fmtDateFull(t)}`
        : 'Elige un rango'
      return { from: f, to: t, label }
    }
  }
}

export const inRange = (date: string, r: DateRange) =>
  (!r.from || date >= r.from) && (!r.to || date <= r.to)

/* ─── Identidad del cliente ─── */
export function bookingIdentity(b: AnalyticsBooking): { key: string; name: string; email: string; phone: string } {
  const uid = (b.userId || '').trim()
  const name = (b.userName || '').trim()
  const email = (b.userEmail || '').trim()
  const phone = (b.userPhone || '').trim()
  if (uid) return { key: `u:${uid}`, name: name || (email ? email.split('@')[0] : 'Cliente sin identificar'), email, phone }
  if (email) return { key: `m:${email.toLowerCase()}`, name: name || email.split('@')[0], email, phone }
  if (phone) return { key: `t:${phone}`, name: name || phone, email, phone }
  return { key: `x:${b.id}`, name: name || 'Cliente sin identificar', email, phone }
}

/* ─── Agregación por cliente ─── */
export interface ClientStat {
  key: string
  name: string
  email: string
  phone: string
  /* periodo */
  total: number
  completed: number
  cancelled: number
  pending: number // reserved + payment_pending + awaiting_payment
  montoReservado: number   // Σ totalPrice de reservas del periodo
  montoPagado: number      // criterio Finanzas: advanceAmount de completed+reserved
  montoPendiente: number   // Σ remainingAmount de reserved
  adelantosCount: number   // reservas con adelanto
  pagosRestantesCount: number // reservas reserved con saldo
  cancelacionesPeriod: number
  lastDate: string   // última reserva (fecha) dentro del periodo
  lastCourt: string
  /* histórico total */
  totalAllTime: number
  montoPagadoAllTime: number
  montoReservadoAllTime: number
  utilizadasAllTime: number // completed
  noJugoAllTime: number     // cancelled
  firstDate: string
  lastDateAllTime: string
  frequencyPerMonth: number // reservas / mes (histórico)
  avgPerBooking: number     // pagado / completadas (histórico)
  adelantosRetenidosAllTime: number
  adelantosDevueltosAllTime: number
  adelantosRegistros: AnalyticsAdvance[]
  /* clasificación */
  level: ClientLevel
  levelByAmount: ClientLevel
  /* referencia */
  bookings: AnalyticsBooking[]
}

const MONTH_MS = 30.44 * 86400000

export function aggregateClients(
  scoped: AnalyticsBooking[],
  all: AnalyticsBooking[],
  advances: AnalyticsAdvance[],
  thresholds: ClientThresholds,
): Map<string, ClientStat> {
  const map = new Map<string, ClientStat>()

  const ensure = (b: AnalyticsBooking): ClientStat => {
    const id = bookingIdentity(b)
    let s = map.get(id.key)
    if (!s) {
      s = {
        key: id.key, name: id.name, email: id.email, phone: id.phone,
        total: 0, completed: 0, cancelled: 0, pending: 0,
        montoReservado: 0, montoPagado: 0, montoPendiente: 0,
        adelantosCount: 0, pagosRestantesCount: 0, cancelacionesPeriod: 0,
        lastDate: '', lastCourt: '',
        totalAllTime: 0, montoPagadoAllTime: 0, montoReservadoAllTime: 0,
        utilizadasAllTime: 0, noJugoAllTime: 0,
        firstDate: '', lastDateAllTime: '',
        frequencyPerMonth: 0, avgPerBooking: 0,
        adelantosRetenidosAllTime: 0, adelantosDevueltosAllTime: 0,
        adelantosRegistros: [],
        level: 'nuevo', levelByAmount: 'nuevo',
        bookings: [],
      }
      map.set(id.key, s)
    } else {
      // Enriquecer contacto con datos de cualquier reserva
      if (!s.phone && id.phone) s.phone = id.phone
      if (!s.email && id.email) s.email = id.email
      if (id.name && id.name !== 'Cliente sin identificar' && (s.name === 'Cliente sin identificar')) s.name = id.name
    }
    return s
  }

  // 1) Histórico completo (clasificación, frecuencia, antigüedad)
  for (const b of all) {
    const s = ensure(b)
    s.totalAllTime++
    s.bookings.push(b)
    if (b.date && (!s.firstDate || b.date < s.firstDate)) s.firstDate = b.date
    if (b.date && b.date > s.lastDateAllTime) s.lastDateAllTime = b.date
    if (b.status === 'completed') {
      s.utilizadasAllTime++
      s.montoPagadoAllTime += b.advanceAmount || 0
      s.montoReservadoAllTime += b.totalPrice || 0
    } else if (b.status === 'reserved') {
      s.montoPagadoAllTime += b.advanceAmount || 0
      s.montoReservadoAllTime += b.totalPrice || 0
    } else if (b.status === 'cancelled') {
      s.noJugoAllTime++
    } else {
      s.montoReservadoAllTime += b.totalPrice || 0
    }
  }

  // 2) Periodo seleccionado (indicadores móviles)
  for (const b of scoped) {
    const s = ensure(b)
    s.total++
    s.montoReservado += b.totalPrice || 0
    if (b.status === 'completed') {
      s.completed++
      s.montoPagado += b.advanceAmount || 0
    } else if (b.status === 'reserved') {
      s.pending++
      s.montoPagado += b.advanceAmount || 0
      if ((b.remainingAmount || 0) > 0.01) {
        s.montoPendiente += b.remainingAmount
        s.pagosRestantesCount++
      }
    } else if (b.status === 'cancelled') {
      s.cancelled++
      s.cancelacionesPeriod++
    } else {
      s.pending++ // payment_pending / awaiting_payment
    }
    if ((b.advanceAmount || 0) > 0.01) s.adelantosCount++
    if (b.date && b.date > s.lastDate) { s.lastDate = b.date; s.lastCourt = b.courtName || '' }
  }

  // 3) Adelantos por cancelación (histórico, por booking → cliente)
  const byBookingId = new Map<string, AnalyticsBooking>()
  for (const b of all) byBookingId.set(b.id, b)
  for (const ra of advances) {
    const b = ra.bookingId ? byBookingId.get(ra.bookingId) : undefined
    const target = b ? ensure(b) : null
    if (target) {
      target.adelantosRegistros.push(ra)
      if (ra.status === 'retained') target.adelantosRetenidosAllTime += ra.amount || 0
      else target.adelantosDevueltosAllTime += ra.amount || 0
    }
  }

  // 4) Derivados + clasificación
  const today = todayStr()
  for (const s of map.values()) {
    s.bookings.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    if (s.firstDate) {
      const [y, m, d] = s.firstDate.split('-').map(Number)
      const [ty, tm, td] = today.split('-').map(Number)
      const months = Math.max(1, (Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / MONTH_MS)
      s.frequencyPerMonth = s.totalAllTime / months
    }
    s.avgPerBooking = s.utilizadasAllTime > 0 ? s.montoPagadoAllTime / s.utilizadasAllTime : 0
    s.level = classifyByCount(s.totalAllTime, thresholds)
    s.levelByAmount = classifyByAmount(s.montoPagadoAllTime, thresholds)
  }
  return map
}

/* ─── Buckets para gráficos ─── */
export type Granularity = 'dia' | 'mes' | 'anio'
export type MetricKey = 'ingresos' | 'reservas' | 'promedio'

export interface ChartBucket { key: string; label: string; ingresos: number; reservas: number }

/** Agrupa reservas (ya filtradas) en buckets por día/mes/año.
 *  ingresos = advanceAmount de completed+reserved (criterio Finanzas). */
export function bucketize(bookings: AnalyticsBooking[], gran: Granularity): ChartBucket[] {
  const map = new Map<string, ChartBucket>()
  const keyOf = (date: string) =>
    gran === 'anio' ? date.slice(0, 4) : gran === 'mes' ? date.slice(0, 7) : date
  for (const b of bookings) {
    if (!b.date) continue
    const k = keyOf(b.date)
    let bucket = map.get(k)
    if (!bucket) {
      const label = gran === 'anio' ? k : gran === 'mes' ? fmtMonthKey(k) : fmtDateFull(k).replace(` ${k.slice(0, 4)}`, '')
      bucket = { key: k, label, ingresos: 0, reservas: 0 }
      map.set(k, bucket)
    }
    bucket.reservas++
    if (b.status === 'completed' || b.status === 'reserved') bucket.ingresos += b.advanceAmount || 0
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export const statusBadge = (status: string): { label: string; cls: string } => {
  switch (status) {
    case 'completed': return { label: 'Completo', cls: 'bg-green-500/15 text-green-400' }
    case 'reserved': return { label: 'Reservado', cls: 'bg-amber-500/15 text-amber-400' }
    case 'cancelled': return { label: 'Cancelado', cls: 'bg-red-500/15 text-red-400' }
    case 'payment_pending': return { label: 'Pago Pendiente', cls: 'bg-orange-500/15 text-orange-400' }
    case 'awaiting_payment': return { label: 'Esperando Pago', cls: 'bg-sky-500/15 text-sky-400' }
    case 'pending': return { label: 'Pendiente', cls: 'bg-orange-500/15 text-orange-400' }
    default: return { label: status || '—', cls: 'bg-cm-on-surface-variant/15 text-cm-on-surface-variant' }
  }
}
