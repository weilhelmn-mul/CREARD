'use client'

/* ═══════════════════════════════════════════════════
   CREARD — Balance del Usuario (vista detallada)
   Histórico completo, generación por periodo, filtros
   día/mes/año/personalizado y gráficos de evolución.
   ═══════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  type ClientStat, type AnalyticsBooking, type AnalyticsAdvance,
  type Granularity, type MetricKey, type DateRange,
  fmtCurrency, fmtDateFull, todayStr, inRange, periodRange,
  bucketize, statusBadge, CLIENT_LEVELS,
} from './clientAnalyticsShared'
import { exportHistoryCsv } from './clientAnalyticsExport'

interface Props {
  stat: ClientStat
  advances: AnalyticsAdvance[]
  onClose: () => void
}

type HistFilterKey = 'todos' | 'dia' | 'mes' | 'anio' | 'custom'

const HIST_FILTERS: { key: HistFilterKey; label: string }[] = [
  { key: 'todos', label: 'Todo' },
  { key: 'dia', label: 'Día' },
  { key: 'mes', label: 'Mes' },
  { key: 'anio', label: 'Año' },
  { key: 'custom', label: 'Personalizado' },
]

export default function ClientBalanceModal({ stat, onClose }: Props) {
  const [histFilter, setHistFilter] = useState<HistFilterKey>('todos')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [gran, setGran] = useState<Granularity>('mes')
  const [metric, setMetric] = useState<MetricKey>('ingresos')
  const [hovered, setHovered] = useState<string | null>(null)

  /* Bloquear scroll de fondo + cerrar con Escape */
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const allBookings = stat.bookings
  const today = todayStr()

  /* Rango activo para historial + gráficos */
  const histRange: DateRange = useMemo(() => {
    if (histFilter === 'dia') return periodRange('hoy', '', '')
    if (histFilter === 'mes') return periodRange('mes', '', '')
    if (histFilter === 'anio') return periodRange('anio', '', '')
    if (histFilter === 'custom') return periodRange('custom', customFrom, customTo)
    return { from: '', to: '', label: 'Todo el historial' }
  }, [histFilter, customFrom, customTo])

  const filtered = useMemo(
    () => allBookings.filter((b) => inRange(b.date, histRange)),
    [allBookings, histRange]
  )
  const filteredDesc = useMemo(() => [...filtered].reverse(), [filtered])

  /* Generación por periodo (siempre histórico completo) */
  const genChips = useMemo(() => {
    const mk = (key: 'hoy' | 'semana' | 'mes' | 'anio') => {
      const r = periodRange(key, '', '')
      const bs = allBookings.filter((b) => inRange(b.date, r))
      const ingresos = bs
        .filter((b) => b.status === 'completed' || b.status === 'reserved')
        .reduce((s, b) => s + (b.advanceAmount || 0), 0)
      return { label: key === 'hoy' ? 'Hoy' : key === 'semana' ? 'Esta semana' : key === 'mes' ? 'Este mes' : 'Este año', ingresos, reservas: bs.length }
    }
    return [mk('hoy'), mk('semana'), mk('mes'), mk('anio')]
  }, [allBookings])

  /* Buckets del gráfico (auto-degrada día→mes si hay demasiados días) */
  const chart = useMemo(() => {
    let effGran = gran
    let forced = false
    if (gran === 'dia') {
      const distinctDays = new Set(filtered.map((b) => b.date)).size
      if (distinctDays > 92) { effGran = 'mes'; forced = true }
    }
    const buckets = bucketize(filtered, effGran)
    const maxVal = Math.max(
      0.0001,
      ...buckets.map((b) => metric === 'ingresos' ? b.ingresos : metric === 'reservas' ? b.reservas : (b.reservas > 0 ? b.ingresos / b.reservas : 0))
    )
    return { effGran, forced, buckets, maxVal }
  }, [filtered, gran, metric])

  const metricValue = (b: { ingresos: number; reservas: number }) =>
    metric === 'ingresos' ? b.ingresos : metric === 'reservas' ? b.reservas : (b.reservas > 0 ? b.ingresos / b.reservas : 0)
  const metricFmt = (v: number) => metric === 'reservas' ? String(Math.round(v)) : metric === 'promedio' ? fmtCurrency(v) : fmtCurrency(v)

  const balanceTiles = [
    { label: 'Total de reservas', value: String(stat.totalAllTime), icon: 'event_note', color: 'text-cm-on-surface' },
    { label: 'Total pagado', value: fmtCurrency(stat.montoPagadoAllTime), icon: 'payments', color: 'text-cm-primary' },
    { label: 'Total pendiente de saldo', value: fmtCurrency(stat.bookings.filter((b) => b.status === 'reserved').reduce((s, b) => s + (b.remainingAmount || 0), 0)), icon: 'hourglass_top', color: 'text-orange-400' },
    { label: 'Total de adelantos', value: fmtCurrency(stat.adelantosRetenidosAllTime + stat.adelantosDevueltosAllTime), icon: 'savings', color: 'text-blue-400' },
    { label: 'Pagos restantes', value: String(stat.bookings.filter((b) => b.status === 'reserved' && (b.remainingAmount || 0) > 0.01).length), icon: 'pending_actions', color: 'text-amber-400' },
    { label: 'Cancelaciones', value: String(stat.noJugoAllTime), icon: 'event_busy', color: 'text-red-400' },
    { label: 'Reservas utilizadas', value: String(stat.utilizadasAllTime), icon: 'check_circle', color: 'text-green-400' },
    { label: 'Reservas "No jugó"', value: String(stat.noJugoAllTime), icon: 'person_off', color: 'text-red-400' },
    { label: 'Frecuencia', value: `${stat.frequencyPerMonth.toFixed(1)} res/mes`, icon: 'speed', color: 'text-sky-400' },
    { label: 'Promedio por reserva', value: fmtCurrency(stat.avgPerBooking), icon: 'analytics', color: 'text-purple-400' },
    { label: 'Primera reserva', value: fmtDateFull(stat.firstDate), icon: 'flag', color: 'text-cm-on-surface' },
    { label: 'Última reserva', value: fmtDateFull(stat.lastDateAllTime), icon: 'history', color: 'text-cm-on-surface' },
  ]

  const levelInfo = CLIENT_LEVELS[stat.level]

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-3 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.22 }}
        className="relative w-full max-w-5xl my-4 rounded-2xl border border-white/10 bg-[#101713] shadow-[0_0_60px_rgba(0,255,65,0.08)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Header ─── */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-2xl border-b border-white/10 bg-[#101713]/95 backdrop-blur px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-[family-name:var(--font-sora)] text-lg font-bold text-cm-on-surface truncate">
                Balance del usuario
              </h3>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${levelInfo.chip}`}>{levelInfo.label}</span>
            </div>
            <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mt-0.5 truncate">
              {stat.name}
              {stat.phone ? ` · ${stat.phone}` : ''}{stat.email ? ` · ${stat.email}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-lg border border-white/10 p-1.5 text-cm-on-surface-variant hover:text-cm-on-surface hover:border-white/25 transition-all flex-shrink-0"
            aria-label="Cerrar">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* ─── Generación por periodo (Hoy / Semana / Mes / Año) ─── */}
          <div>
            <p className="text-[11px] font-semibold text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-cm-primary text-[15px]" style={{ fontVariationSettings: '"FILL" 1' }}>bolt</span>
              Generación por periodo
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {genChips.map((c) => (
                <div key={c.label} className="rounded-lg border border-cm-primary/20 bg-cm-primary/5 px-3 py-2">
                  <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{c.label}</p>
                  <p className="font-[family-name:var(--font-sora)] text-lg font-bold text-cm-primary text-glow">{fmtCurrency(c.ingresos)}</p>
                  <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{c.reservas} {c.reservas === 1 ? 'reserva' : 'reservas'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Tiles de balance ─── */}
          <div>
            <p className="text-[11px] font-semibold text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-cm-primary text-[15px]" style={{ fontVariationSettings: '"FILL" 1' }}>account_balance</span>
              Balance histórico total
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {balanceTiles.map((t, i) => (
                <motion.div key={t.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="rounded-lg bg-cm-surface-container-highest/30 border border-white/5 px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`material-symbols-outlined text-[14px] ${t.color}`} style={{ fontVariationSettings: '"FILL" 1' }}>{t.icon}</span>
                    <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] leading-tight">{t.label}</p>
                  </div>
                  <p className={`font-[family-name:var(--font-sora)] text-sm font-bold ${t.color}`}>{t.value}</p>
                </motion.div>
              ))}
            </div>
            {(stat.adelantosRetenidosAllTime > 0 || stat.adelantosDevueltosAllTime > 0) && (
              <p className="text-[10.5px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mt-2">
                Adelantos por cancelaciones: <span className="text-blue-400 font-semibold">S/ {stat.adelantosRetenidosAllTime.toFixed(2)} retenidos</span>
                {' · '}<span className="text-cm-on-surface font-semibold">S/ {stat.adelantosDevueltosAllTime.toFixed(2)} devueltos</span>
              </p>
            )}
          </div>

          {/* ─── Gráfico de evolución ─── */}
          <div className="rounded-xl border border-cm-primary/25 bg-cm-primary/[0.03] p-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <p className="text-[11px] font-semibold text-cm-on-surface-variant font-[family-name:var(--font-inter)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-cm-primary text-[15px]" style={{ fontVariationSettings: '"FILL" 1' }}>monitoring</span>
                Evolución {histRange.from ? `(${histRange.label})` : '(histórico)'}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center rounded-lg border border-white/10 overflow-hidden">
                  {([['dia', 'Por día'], ['mes', 'Por mes'], ['anio', 'Por año']] as [Granularity, string][]).map(([g, lbl]) => (
                    <button key={g} type="button" onClick={() => setGran(g)}
                      className={`px-2.5 py-1 text-[10px] font-semibold transition-all font-[family-name:var(--font-inter)] ${
                        gran === g ? 'bg-cm-primary/15 text-cm-primary' : 'text-cm-on-surface-variant hover:text-cm-on-surface'
                      }`}>{lbl}</button>
                  ))}
                </div>
                <div className="flex items-center rounded-lg border border-white/10 overflow-hidden">
                  {([['ingresos', 'Ingresos'], ['reservas', 'Reservas'], ['promedio', 'Promedio']] as [MetricKey, string][]).map(([, lbl]) => (
                    <button key={lbl} type="button" onClick={() => setMetric(lbl.toLowerCase() as MetricKey)}
                      className={`px-2.5 py-1 text-[10px] font-semibold transition-all font-[family-name:var(--font-inter)] ${
                        metric === lbl.toLowerCase() ? 'bg-cm-primary/15 text-cm-primary' : 'text-cm-on-surface-variant hover:text-cm-on-surface'
                      }`}>{lbl}</button>
                  ))}
                </div>
              </div>
            </div>

            {chart.buckets.length === 0 ? (
              <p className="text-xs text-cm-on-surface-variant py-8 text-center font-[family-name:var(--font-inter)]">
                Sin reservas en el periodo seleccionado.
              </p>
            ) : (
              <>
                {chart.forced && (
                  <p className="text-[10px] text-amber-400/80 mb-2 font-[family-name:var(--font-inter)]">Rango extenso: vista por mes</p>
                )}
                <div className="overflow-x-auto no-scrollbar pb-1">
                  <div className="flex items-end gap-1 min-w-full h-36" style={{ minWidth: `${Math.max(chart.buckets.length * 22, 200)}px` }}>
                    {chart.buckets.map((b) => {
                      const v = metricValue(b)
                      const hPct = Math.max(2, Math.round((v / chart.maxVal) * 100))
                      const isHover = hovered === b.key
                      const isTop = v === chart.maxVal && v > 0
                      return (
                        <div key={b.key} className="flex-1 min-w-[16px] flex flex-col items-center justify-end h-full relative"
                          onMouseEnter={() => setHovered(b.key)} onMouseLeave={() => setHovered(null)}>
                          {isHover && (
                            <div className="absolute bottom-full mb-1 z-20 whitespace-nowrap rounded-md border border-white/10 bg-[#0b100d]/95 px-2 py-1 text-[10px] shadow-lg pointer-events-none">
                              <p className="font-bold text-cm-on-surface">{b.label}</p>
                              <p className="text-cm-primary">{fmtCurrency(b.ingresos)} · {b.reservas} res.</p>
                            </div>
                          )}
                          <motion.div
                            initial={{ height: 0 }} animate={{ height: `${hPct}%` }} transition={{ duration: 0.4, ease: 'easeOut' }}
                            className="w-full rounded-t-sm"
                            style={{
                              background: isTop ? 'linear-gradient(180deg, #00ff41, #00cc33)' : 'linear-gradient(180deg, rgba(0,255,65,0.55), rgba(0,255,65,0.18))',
                              boxShadow: isTop ? '0 0 12px rgba(0,255,65,0.5)' : isHover ? '0 0 8px rgba(0,255,65,0.35)' : 'none',
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex gap-1 mt-1" style={{ minWidth: `${Math.max(chart.buckets.length * 22, 200)}px` }}>
                    {chart.buckets.map((b, i) => (
                      <div key={b.key} className="flex-1 min-w-[16px] text-center">
                        <span className={`text-[8.5px] font-semibold font-[family-name:var(--font-inter)] ${hovered === b.key ? 'text-cm-primary' : 'text-cm-on-surface-variant'}`}>
                          {(chart.buckets.length <= 14 || i % Math.ceil(chart.buckets.length / 12) === 0) ? b.label : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-cm-on-surface-variant mt-2 font-[family-name:var(--font-inter)]">
                  {metric === 'ingresos' && 'Ingresos del periodo (adelantos de reservas completadas y activas)'}
                  {metric === 'reservas' && 'Número de reservas por periodo'}
                  {metric === 'promedio' && 'Promedio gastado por reserva'}
                </p>
              </>
            )}
          </div>

          {/* ─── Historial cronológico ─── */}
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <p className="text-[11px] font-semibold text-cm-on-surface-variant font-[family-name:var(--font-inter)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-cm-primary text-[15px]" style={{ fontVariationSettings: '"FILL" 1' }}>history</span>
                Historial de operaciones ({filtered.length})
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center rounded-lg border border-white/10 overflow-hidden">
                  {HIST_FILTERS.map((f) => (
                    <button key={f.key} type="button" onClick={() => setHistFilter(f.key)}
                      className={`px-2.5 py-1 text-[10px] font-semibold transition-all font-[family-name:var(--font-inter)] ${
                        histFilter === f.key ? 'bg-cm-primary/15 text-cm-primary' : 'text-cm-on-surface-variant hover:text-cm-on-surface'
                      }`}>{f.label}</button>
                  ))}
                </div>
                <button type="button" onClick={() => exportHistoryCsv(stat, filtered)} disabled={filtered.length === 0}
                  className="px-2.5 py-1 rounded-lg bg-cm-primary/10 border border-cm-primary/40 text-cm-primary text-[10px] font-bold hover:bg-cm-primary/20 transition-all font-[family-name:var(--font-inter)] flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Descargar el historial visible en CSV">
                  <span className="material-symbols-outlined text-[13px]">download</span>
                  CSV
                </button>
              </div>
            </div>
            {histFilter === 'custom' && (
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <input type="date" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)}
                  className="px-2.5 py-1.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-xs text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]" />
                <span className="material-symbols-outlined text-cm-on-surface-variant text-[14px]">arrow_forward</span>
                <input type="date" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)}
                  className="px-2.5 py-1.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-xs text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]" />
              </div>
            )}
            {histFilter !== 'todos' && (
              <p className="text-[10.5px] text-cm-on-surface font-medium font-[family-name:var(--font-inter)] mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-cm-primary/70 text-[13px]">event</span>{histRange.label}
              </p>
            )}

            <div className="overflow-x-auto no-scrollbar rounded-lg border border-white/10">
              <table className="w-full text-left min-w-[760px]">
                <thead>
                  <tr className="bg-cm-surface-container-highest/40 border-b border-white/10">
                    {['Fecha', 'Cancha', 'Deporte', 'Horario', 'Reserva', 'Pago', 'Monto', 'Estado'].map((h) => (
                      <th key={h} className="px-3 py-2 text-[10px] font-bold text-cm-on-surface-variant uppercase tracking-wide font-[family-name:var(--font-inter)] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDesc.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                      Sin operaciones registradas en este periodo.
                    </td></tr>
                  )}
                  {filteredDesc.map((b) => <HistoryRow key={b.id} b={b} advances={stat.adelantosRegistros} today={today} />)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Fila del historial ─── */
function HistoryRow({ b, advances, today }: { b: AnalyticsBooking; advances: AnalyticsAdvance[]; today: string }) {
  const st = statusBadge(b.status)
  const ra = advances.find((a) => a.bookingId === b.id)
  const method = String(b.paymentMethod || '').trim().toUpperCase() || '—'
  const isFuture = b.date >= today
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
      <td className="px-3 py-2 text-[11px] text-cm-on-surface font-medium whitespace-nowrap font-[family-name:var(--font-inter)]">
        {fmtDateFull(b.date)}{isFuture && b.date > today ? <span className="ml-1 text-[9px] text-sky-400">próx.</span> : ''}
      </td>
      <td className="px-3 py-2 text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] whitespace-nowrap">{b.courtName || '—'}</td>
      <td className="px-3 py-2 text-[11px] text-cm-on-surface-variant capitalize font-[family-name:var(--font-inter)] whitespace-nowrap">{b.sport || '—'}</td>
      <td className="px-3 py-2 text-[11px] text-cm-on-surface-variant whitespace-nowrap font-[family-name:var(--font-inter)]">{b.startTime} – {b.endTime}</td>
      <td className="px-3 py-2 text-[10px] text-cm-on-surface-variant font-mono whitespace-nowrap">#{b.id.slice(-6).toUpperCase()}</td>
      <td className="px-3 py-2 text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] whitespace-nowrap">
        {method === 'MIXTO' && b.paymentBreakdown
          ? `Mixto (Ef ${b.paymentBreakdown.efectivo?.toFixed(0)} + ${b.paymentBreakdown.digitalMethod || 'Digital'} ${b.paymentBreakdown.digital?.toFixed(0)})`
          : method}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <p className="text-[11.5px] font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">{fmtCurrency(b.totalPrice || 0)}</p>
        {(b.advanceAmount || 0) > 0 && (
          <p className="text-[9.5px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
            adelanto {fmtCurrency(b.advanceAmount)}{(b.remainingAmount || 0) > 0.01 ? ` · saldo ${fmtCurrency(b.remainingAmount)}` : ''}
          </p>
        )}
        {ra && (
          <p className={`text-[9.5px] font-[family-name:var(--font-inter)] ${ra.status === 'retained' ? 'text-blue-400' : 'text-cm-on-surface-variant'}`}>
            {ra.status === 'retained' ? 'adelanto retenido' : 'adelanto devuelto'} {fmtCurrency(ra.amount)}
          </p>
        )}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9.5px] font-bold ${st.cls}`}>{st.label}</span>
      </td>
    </tr>
  )
}
