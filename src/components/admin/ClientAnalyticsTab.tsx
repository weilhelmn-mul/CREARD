'use client'

/* ═══════════════════════════════════════════════════
   CREARD — Módulo: Análisis de Ingresos y Balance por Usuario
   1. Dashboard general (KPIs sensibles al periodo)
   2. Filtro de periodo: hoy/ayer/semana/mes/mes anterior/año/año
      anterior/personalizado
   3. Ingresos por usuario (listado completo)
   4. Ranking de clientes (medallas + criterios)
   5. Fidelización (clasificación configurable)
   6. Balance del usuario (modal con gráficos e historial)
   Criterio de ingresos: mismo que el panel Finanzas
   (reservas completed + reserved, monto = advanceAmount).
   ═══════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAuthHeaders } from '@/lib/auth-helpers'
import ClientBalanceModal from './ClientBalanceModal'
import {
  type AnalyticsBooking, type AnalyticsAdvance, type ClientStat,
  type ClientThresholds, type PeriodKey, type ClientLevel,
  PERIOD_OPTIONS, DEFAULT_THRESHOLDS, CLIENT_LEVELS, LEVEL_ORDER,
  periodRange, inRange, aggregateClients, fmtCurrency, fmtDateFull,
  fmtShort, todayStr,
} from './clientAnalyticsShared'

/* ─── Normalización de datos crudos (/api/bookings) ─── */
function toAnalytics(b: Record<string, unknown>): AnalyticsBooking {
  const user = (b.user || null) as { id?: string; name?: string; email?: string; phone?: string } | null
  const court = (b.court || null) as { name?: string; sport?: string } | null
  const courts = (b.courts || []) as Array<{ name?: string; sport?: string }>
  const bd = (b.paymentBreakdown || null) as { efectivo: number; digital: number; digitalMethod?: string } | null
  return {
    id: String(b.id || ''),
    userId: String(b.userId || user?.id || ''),
    date: String(b.date || ''),
    startTime: String(b.startTime || ''),
    endTime: String(b.endTime || ''),
    totalPrice: Number(b.totalPrice || 0),
    advanceAmount: Number(b.advanceAmount || 0),
    remainingAmount: Number(b.remainingAmount || 0),
    status: String(b.status || ''),
    paymentMethod: (b.paymentMethod as string) || null,
    paymentBreakdown: bd,
    courtName: court?.name || courts.map((c) => c.name).filter(Boolean).join(' + ') || '',
    sport: court?.sport || courts[0]?.sport || '',
    userName: String(user?.name || ''),
    userEmail: String(user?.email || ''),
    userPhone: String(user?.phone || ''),
  }
}

type SortKey = 'ingresos' | 'reservas' | 'pendiente' | 'nombre'
type RankKey = 'ingresos' | 'reservas' | 'gasto' | 'frecuencia' | 'antiguedad' | 'promedio'
type BadgeMode = 'reservas' | 'monto'

const RANK_OPTIONS: { key: RankKey; label: string }[] = [
  { key: 'ingresos', label: 'Mayor monto pagado' },
  { key: 'reservas', label: 'Más reservas' },
  { key: 'gasto', label: 'Mayor gasto acumulado' },
  { key: 'frecuencia', label: 'Mayor frecuencia' },
  { key: 'antiguedad', label: 'Mayor antigüedad' },
  { key: 'promedio', label: 'Mayor promedio/reserva' },
]

const PODIUM = ['🥇', '🥈', '🥉']

export default function ClientAnalyticsTab() {
  /* data */
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [bookings, setBookings] = useState<AnalyticsBooking[]>([])
  const [advances, setAdvances] = useState<AnalyticsAdvance[]>([])
  const [levels, setLevels] = useState<ClientThresholds>(DEFAULT_THRESHOLDS)
  const [levelsDraft, setLevelsDraft] = useState<ClientThresholds>(DEFAULT_THRESHOLDS)
  const [savingLevels, setSavingLevels] = useState(false)
  const [levelsMsg, setLevelsMsg] = useState('')

  /* periodo */
  const [period, setPeriod] = useState<PeriodKey>('mes')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  /* tabla */
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('ingresos')

  /* ranking / fidelización */
  const [rankBy, setRankBy] = useState<RankKey>('ingresos')
  const [badgeMode, setBadgeMode] = useState<BadgeMode>('reservas')

  /* modal */
  const [selected, setSelected] = useState<ClientStat | null>(null)

  /* ─── Carga de datos (historial completo) ─── */
  const loadData = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const headers = getAuthHeaders()
      const [bRes, aRes, sRes] = await Promise.all([
        fetch('/api/bookings?dateFrom=2024-01-01&dateTo=2027-12-31', { headers }),
        fetch('/api/retained-advances', { headers }),
        fetch('/api/client-settings', { headers }),
      ])
      if (!bRes.ok) throw new Error(`No se pudieron cargar las reservas (${bRes.status})`)
      const bData = await bRes.json()
      const arr = Array.isArray(bData) ? bData : []
      setBookings(arr.map(toAnalytics))

      if (aRes.ok) {
        const aData = await aRes.json().catch(() => null)
        const aArr = Array.isArray(aData) ? aData : (aData?.advances || [])
        setAdvances(aArr as AnalyticsAdvance[])
      }
      if (sRes.ok) {
        const sData = await sRes.json().catch(() => null)
        if (sData?.byBookings && sData?.byAmount) {
          const lv: ClientThresholds = { byBookings: sData.byBookings, byAmount: sData.byAmount }
          setLevels(lv)
          setLevelsDraft(lv)
        }
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadData() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [])

  /* ─── Guardar umbrales de fidelización ─── */
  const saveLevels = async () => {
    setSavingLevels(true)
    setLevelsMsg('')
    try {
      const res = await fetch('/api/client-settings', {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(levelsDraft),
      })
      if (!res.ok) throw new Error('save failed')
      const data = await res.json()
      const lv: ClientThresholds = { byBookings: data.byBookings, byAmount: data.byAmount }
      setLevels(lv)
      setLevelsDraft(lv)
      setLevelsMsg('Umbrales guardados')
      setTimeout(() => setLevelsMsg(''), 2500)
    } catch {
      setLevelsMsg('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setSavingLevels(false)
    }
  }

  /* ─── Cálculos ─── */
  const range = useMemo(() => periodRange(period, customFrom, customTo), [period, customFrom, customTo])
  const scoped = useMemo(() => bookings.filter((b) => inRange(b.date, range)), [bookings, range])
  const clientsMap = useMemo(
    () => aggregateClients(scoped, bookings, advances, levels),
    [scoped, bookings, advances, levels]
  )
  const clients = useMemo(() => [...clientsMap.values()], [clientsMap])

  const kpis = useMemo(() => {
    const ingresos = scoped
      .filter((b) => b.status === 'completed' || b.status === 'reserved')
      .reduce((s, b) => s + (b.advanceAmount || 0), 0)
    const atendidas = scoped.filter((b) => b.status === 'completed' || b.status === 'reserved').length
    const ticket = atendidas > 0 ? ingresos / atendidas : 0
    let topSpender: ClientStat | null = null
    let topBooker: ClientStat | null = null
    for (const c of clients) {
      if (!topSpender || c.montoPagado > topSpender.montoPagado) topSpender = c
      if (!topBooker || c.total > topBooker.total) topBooker = c
    }
    const vipCount = clients.filter((c) => c.level === 'vip').length
    // Clientes activos = clientes con al menos una reserva EN el periodo (no histórico)
    const activosSet = new Set<string>()
    for (const b of scoped) {
      const uid = (b.userId || '').trim()
      if (uid) activosSet.add(`u:${uid}`)
      else if (b.userEmail) activosSet.add(`m:${b.userEmail.toLowerCase()}`)
      else if (b.userPhone) activosSet.add(`t:${b.userPhone}`)
      else activosSet.add(`x:${b.id}`)
    }
    return { ingresos, ticket, atendidas, topSpender, topBooker, vipCount, activos: activosSet.size }
  }, [scoped, clients])

  /* Tabla: búsqueda + orden */
  const tableClients = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = q
      ? clients.filter((c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q))
      : clients
    const sorted = [...base]
    switch (sortBy) {
      case 'ingresos': sorted.sort((a, b) => b.montoPagado - a.montoPagado || b.total - a.total); break
      case 'reservas': sorted.sort((a, b) => b.total - a.total); break
      case 'pendiente': sorted.sort((a, b) => b.montoPendiente - a.montoPendiente); break
      case 'nombre': sorted.sort((a, b) => a.name.localeCompare(b.name)); break
    }
    return sorted
  }, [clients, search, sortBy])

  /* Ranking */
  const ranked = useMemo(() => {
    const sorted = [...clients]
    switch (rankBy) {
      case 'ingresos': sorted.sort((a, b) => b.montoPagado - a.montoPagado); break
      case 'reservas': sorted.sort((a, b) => b.total - a.total); break
      case 'gasto': sorted.sort((a, b) => b.montoReservado - a.montoReservado); break
      case 'frecuencia': sorted.sort((a, b) => b.frequencyPerMonth - a.frequencyPerMonth); break
      case 'antiguedad': sorted.sort((a, b) => (a.firstDate || '9999').localeCompare(b.firstDate || '9999')); break
      case 'promedio': sorted.sort((a, b) => b.avgPerBooking - a.avgPerBooking); break
    }
    return sorted
  }, [clients, rankBy])

  const rankValue = (c: ClientStat): { main: string; sub: string } => {
    switch (rankBy) {
      case 'ingresos': return { main: fmtCurrency(c.montoPagado), sub: `${c.total} res.` }
      case 'reservas': return { main: String(c.total), sub: fmtCurrency(c.montoPagado) }
      case 'gasto': return { main: fmtCurrency(c.montoReservado), sub: `${c.total} res.` }
      case 'frecuencia': return { main: `${c.frequencyPerMonth.toFixed(1)}/mes`, sub: `${c.totalAllTime} res. hist.` }
      case 'antiguedad': return { main: fmtDateFull(c.firstDate), sub: `${c.totalAllTime} res. hist.` }
      case 'promedio': return { main: fmtCurrency(c.avgPerBooking), sub: `${c.utilizadasAllTime} jugadas` }
    }
  }
  const rankMax = useMemo(() => {
    if (ranked.length === 0) return 1
    const v = (c: ClientStat) => {
      switch (rankBy) {
        case 'ingresos': return c.montoPagado
        case 'reservas': return c.total
        case 'gasto': return c.montoReservado
        case 'frecuencia': return c.frequencyPerMonth
        case 'antiguedad': return 0
        case 'promedio': return c.avgPerBooking
      }
    }
    return Math.max(1, ...ranked.map(v))
  }, [ranked, rankBy])

  /* Distribución de fidelización */
  const distribution = useMemo(() => {
    const byBookings: Record<ClientLevel, number> = { vip: 0, muy_frecuente: 0, frecuente: 0, nuevo: 0 }
    const byAmount: Record<ClientLevel, number> = { vip: 0, muy_frecuente: 0, frecuente: 0, nuevo: 0 }
    for (const c of clients) { byBookings[c.level]++; byAmount[c.levelByAmount]++ }
    return { byBookings, byAmount }
  }, [clients])

  const today = todayStr()

  /* ─── Estados de carga / error ─── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="material-symbols-outlined text-cm-primary text-4xl animate-pulse" style={{ fontVariationSettings: '"FILL" 1' }}>leaderboard</span>
        <p className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Analizando clientes y reservas…</p>
      </div>
    )
  }
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="material-symbols-outlined text-red-400 text-4xl" style={{ fontVariationSettings: '"FILL" 1' }}>cloud_off</span>
        <p className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{loadError}</p>
        <button type="button" onClick={loadData}
          className="mt-1 px-4 py-2 rounded-lg bg-cm-primary/15 border border-cm-primary/40 text-cm-primary text-xs font-bold hover:bg-cm-primary/25 transition-all">
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <motion.div key="clientes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
      {/* ═══ 1. DASHBOARD GENERAL (KPIs) ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-cm-primary text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>account_balance_wallet</span>
            <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Ingresos del periodo</span>
          </div>
          <p className="font-[family-name:var(--font-sora)] text-2xl font-bold text-cm-primary text-glow">{fmtCurrency(kpis.ingresos)}</p>
          <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mt-1">Completadas + adelantos activos</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-sky-400 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>group</span>
            <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Clientes activos</span>
          </div>
          <p className="font-[family-name:var(--font-sora)] text-2xl font-bold text-sky-400">{kpis.activos}</p>
          <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mt-1">Con al menos una reserva en el periodo</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }} className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-amber-400 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>event_note</span>
            <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Reservas del periodo</span>
          </div>
          <p className="font-[family-name:var(--font-sora)] text-2xl font-bold text-amber-400">{scoped.length}</p>
          <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mt-1">{kpis.atendidas} atendidas (jugadas/activas)</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-purple-400 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>receipt</span>
            <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Ticket promedio</span>
          </div>
          <p className="font-[family-name:var(--font-sora)] text-2xl font-bold text-purple-400">{kpis.atendidas > 0 ? fmtCurrency(kpis.ticket) : '—'}</p>
          <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mt-1">Ingreso por reserva atendida</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-xl p-4 sm:col-span-1 xl:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-green-400 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>military_tech</span>
            <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Cliente que más gastó</span>
          </div>
          <p className="font-[family-name:var(--font-sora)] text-base font-bold text-cm-on-surface truncate" title={kpis.topSpender?.name || ''}>
            {kpis.topSpender && kpis.topSpender.montoPagado > 0 ? kpis.topSpender.name : '—'}
          </p>
          {kpis.topSpender && kpis.topSpender.montoPagado > 0 && (
            <p className="text-[11px] text-green-400 font-[family-name:var(--font-inter)]">{fmtCurrency(kpis.topSpender.montoPagado)}</p>
          )}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-orange-400 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>repeat</span>
            <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Cliente con más reservas</span>
          </div>
          <p className="font-[family-name:var(--font-sora)] text-base font-bold text-cm-on-surface truncate" title={kpis.topBooker?.name || ''}>
            {kpis.topBooker && kpis.topBooker.total > 0 ? kpis.topBooker.name : '—'}
          </p>
          {kpis.topBooker && kpis.topBooker.total > 0 && (
            <p className="text-[11px] text-orange-400 font-[family-name:var(--font-inter)]">{kpis.topBooker.total} reservas</p>
          )}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21 }} className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-amber-300 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>workspace_premium</span>
            <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Clientes VIP</span>
          </div>
          <p className="font-[family-name:var(--font-sora)] text-2xl font-bold text-amber-300">{kpis.vipCount}</p>
          <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mt-1">Según historial completo</p>
        </motion.div>
      </div>

      {/* ═══ 2. FILTRO DE PERIODO ═══ */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="glass-card glow-border rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-cm-primary text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>date_range</span>
            <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] font-medium">Periodo de análisis</span>
          </div>
          <p className="text-[11px] text-cm-primary font-semibold font-[family-name:var(--font-inter)] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">event</span>{range.label}
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-1.5">
          {PERIOD_OPTIONS.map((p) => (
            <button key={p.key} type="button" onClick={() => setPeriod(p.key)}
              className={`px-2.5 py-1 rounded-full text-[10.5px] font-semibold border transition-all font-[family-name:var(--font-inter)] ${
                period === p.key
                  ? 'bg-cm-primary/15 border-cm-primary/60 text-cm-primary shadow-[0_0_10px_rgba(0,255,65,0.25)]'
                  : 'bg-cm-surface-container-highest/30 border-white/10 text-cm-on-surface-variant hover:border-cm-primary/30 hover:text-cm-on-surface'
              }`}>
              {p.label}
            </button>
          ))}
          {period === 'custom' && (
            <div className="flex items-center gap-2 ml-1 flex-wrap">
              <input type="date" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2.5 py-1.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-xs text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]" />
              <span className="material-symbols-outlined text-cm-on-surface-variant text-[14px]">arrow_forward</span>
              <input type="date" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)}
                className="px-2.5 py-1.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-xs text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]" />
              {(customFrom || customTo) && (
                <button type="button" onClick={() => { setCustomFrom(''); setCustomTo('') }}
                  className="text-[10px] text-cm-on-surface-variant hover:text-red-400 underline underline-offset-2 font-[family-name:var(--font-inter)] transition-colors">
                  limpiar
                </button>
              )}
            </div>
          )}
        </div>
        <p className="text-[10px] text-cm-on-surface-variant mt-2 font-[family-name:var(--font-inter)]">
          Todos los indicadores, el listado y el ranking responden al periodo seleccionado. La clasificación de fidelización usa el historial completo.
        </p>
      </motion.div>

      {/* ═══ 3. INGRESOS POR USUARIO ═══ */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-cm-primary text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>query_stats</span>
            <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] font-medium">Ingresos por usuario</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cm-primary/10 text-cm-primary font-bold">{tableClients.length}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <span className="material-symbols-outlined text-cm-on-surface-variant text-[15px] absolute left-2.5 top-1/2 -translate-y-1/2">search</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nombre, correo o teléfono…"
                className="pl-8 pr-3 py-1.5 w-56 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-xs text-cm-on-surface placeholder:text-cm-on-surface-variant/60 focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]" />
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="px-2.5 py-1.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-xs text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]">
              <option value="ingresos">Ordenar: Ingresos</option>
              <option value="reservas">Ordenar: Reservas</option>
              <option value="pendiente">Ordenar: Pendiente</option>
              <option value="nombre">Ordenar: Nombre</option>
            </select>
          </div>
        </div>

        {bookings.length === 0 ? (
          <p className="text-xs text-cm-on-surface-variant py-8 text-center font-[family-name:var(--font-inter)]">
            Aún no hay reservas registradas. Cuando los clientes reserven, su análisis aparecerá aquí.
          </p>
        ) : tableClients.length === 0 ? (
          <p className="text-xs text-cm-on-surface-variant py-8 text-center font-[family-name:var(--font-inter)]">
            Ningún cliente coincide con la búsqueda en este periodo.
          </p>
        ) : (
          <div className="overflow-x-auto no-scrollbar rounded-lg border border-white/10">
            <table className="w-full text-left min-w-[1180px]">
              <thead>
                <tr className="bg-cm-surface-container-highest/40 border-b border-white/10">
                  {['Cliente', 'Teléfono', 'Correo', 'Reservas', 'Pagadas', 'Cancel.', 'Pend.', 'Reservado', 'Pagado', 'Pendiente $', 'Adelantos', 'Pagos rest.', 'Última reserva', 'Estado', ''].map((h) => (
                    <th key={h} className="px-2.5 py-2 text-[9.5px] font-bold text-cm-on-surface-variant uppercase tracking-wide font-[family-name:var(--font-inter)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableClients.map((c, i) => {
                  const lvl = badgeMode === 'reservas' ? c.level : c.levelByAmount
                  const lvlInfo = CLIENT_LEVELS[lvl]
                  return (
                    <motion.tr key={c.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.015, 0.3) }}
                      className="border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => setSelected(c)}>
                      <td className="px-2.5 py-2.5 max-w-[190px]">
                        <p className="text-xs font-bold text-cm-on-surface font-[family-name:var(--font-inter)] truncate">{c.name}</p>
                        <p className="text-[9.5px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{c.totalAllTime} res. hist. · desde {fmtDateFull(c.firstDate)}</p>
                      </td>
                      <td className="px-2.5 py-2.5 text-[11px] text-cm-on-surface-variant whitespace-nowrap font-[family-name:var(--font-inter)]">{c.phone || '—'}</td>
                      <td className="px-2.5 py-2.5 text-[11px] text-cm-on-surface-variant max-w-[170px] truncate font-[family-name:var(--font-inter)]" title={c.email}>{c.email || '—'}</td>
                      <td className="px-2.5 py-2.5 text-center"><span className="text-xs font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">{c.total}</span></td>
                      <td className="px-2.5 py-2.5 text-center"><span className="text-xs font-bold text-green-400 font-[family-name:var(--font-sora)]">{c.completed}</span></td>
                      <td className="px-2.5 py-2.5 text-center"><span className="text-xs font-bold text-red-400 font-[family-name:var(--font-sora)]">{c.cancelled}</span></td>
                      <td className="px-2.5 py-2.5 text-center"><span className="text-xs font-bold text-amber-400 font-[family-name:var(--font-sora)]">{c.pending}</span></td>
                      <td className="px-2.5 py-2.5 text-[11px] text-cm-on-surface-variant whitespace-nowrap font-[family-name:var(--font-inter)]">{fmtCurrency(c.montoReservado)}</td>
                      <td className="px-2.5 py-2.5 whitespace-nowrap"><span className="text-xs font-bold text-cm-primary font-[family-name:var(--font-sora)]">{fmtCurrency(c.montoPagado)}</span></td>
                      <td className="px-2.5 py-2.5 whitespace-nowrap">
                        <span className={`text-xs font-bold font-[family-name:var(--font-sora)] ${c.montoPendiente > 0 ? 'text-orange-400' : 'text-cm-on-surface-variant/50'}`}>
                          {c.montoPendiente > 0 ? fmtCurrency(c.montoPendiente) : '—'}
                        </span>
                      </td>
                      <td className="px-2.5 py-2.5 text-center"><span className="text-[11px] text-blue-400 font-semibold font-[family-name:var(--font-inter)]">{c.adelantosCount}</span></td>
                      <td className="px-2.5 py-2.5 text-center"><span className="text-[11px] text-amber-400/90 font-semibold font-[family-name:var(--font-inter)]">{c.pagosRestantesCount}</span></td>
                      <td className="px-2.5 py-2.5 whitespace-nowrap">
                        <p className="text-[11px] text-cm-on-surface font-medium font-[family-name:var(--font-inter)]">{c.lastDate ? fmtDateFull(c.lastDate) : '—'}</p>
                        {c.lastCourt && <p className="text-[9.5px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] truncate max-w-[110px]">{c.lastCourt}</p>}
                      </td>
                      <td className="px-2.5 py-2.5">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9.5px] font-bold whitespace-nowrap ${lvlInfo.chip}`}>{lvlInfo.label}</span>
                      </td>
                      <td className="px-2.5 py-2.5 text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cm-primary font-[family-name:var(--font-inter)]">
                          Balance<span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        </span>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[10px] text-cm-on-surface-variant mt-2 font-[family-name:var(--font-inter)]">
          Pagado = adelantos de reservas completadas y activas (criterio Finanzas). Pendiente $ = saldos por cobrar de reservas activas.
          Los adelantos de reservas canceladas se auditan en Finanzas → Adelantos por Cancelaciones. Haz clic en un cliente para ver su balance completo.
        </p>
      </motion.div>

      {/* ═══ 4. RANKING DE CLIENTES ═══ */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }} className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-300 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>leaderboard</span>
            <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] font-medium">Ranking de clientes</span>
          </div>
          <select value={rankBy} onChange={(e) => setRankBy(e.target.value as RankKey)}
            className="px-2.5 py-1.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-xs text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]">
            {RANK_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>

        {clients.length === 0 ? (
          <p className="text-xs text-cm-on-surface-variant py-6 text-center font-[family-name:var(--font-inter)]">
            Sin clientes en este periodo todavía.
          </p>
        ) : (
          <>
            {/* Podio top 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {ranked.slice(0, 3).map((c, i) => {
                const v = rankValue(c)
                const accent = i === 0 ? 'border-amber-400/50 bg-amber-400/[0.06] shadow-[0_0_18px_rgba(251,191,36,0.15)]'
                  : i === 1 ? 'border-slate-300/40 bg-slate-300/[0.05]'
                  : 'border-orange-700/50 bg-orange-700/[0.06]'
                return (
                  <motion.button key={c.key} type="button" onClick={() => setSelected(c)}
                    initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                    className={`rounded-xl border px-4 py-3.5 text-left transition-all hover:scale-[1.015] ${accent} ${i === 1 ? 'sm:order-first' : ''}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xl leading-none">{PODIUM[i]}</span>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold ${CLIENT_LEVELS[badgeMode === 'reservas' ? c.level : c.levelByAmount].chip}`}>
                        {CLIENT_LEVELS[badgeMode === 'reservas' ? c.level : c.levelByAmount].label}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-cm-on-surface font-[family-name:var(--font-inter)] truncate">{c.name}</p>
                    <p className="font-[family-name:var(--font-sora)] text-lg font-bold text-cm-primary mt-0.5">{v.main}</p>
                    <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{v.sub}</p>
                  </motion.button>
                )
              })}
            </div>

            {/* Lista top 10 */}
            <div className="space-y-1.5">
              {ranked.slice(3, 10).map((c, i) => {
                const v = rankValue(c)
                const barPct = rankBy === 'antiguedad' ? 100 : Math.max(3, Math.round(((rankBy === 'ingresos' ? c.montoPagado : rankBy === 'reservas' ? c.total : rankBy === 'gasto' ? c.montoReservado : rankBy === 'frecuencia' ? c.frequencyPerMonth : c.avgPerBooking) / rankMax) * 100))
                return (
                  <button key={c.key} type="button" onClick={() => setSelected(c)}
                    className="w-full text-left rounded-lg border border-white/5 hover:border-cm-primary/30 bg-cm-surface-container-highest/20 hover:bg-white/[0.04] px-3 py-2 transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[10px] font-bold text-cm-on-surface-variant w-5 text-center font-[family-name:var(--font-sora)]">{i + 4}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-cm-on-surface font-[family-name:var(--font-inter)] truncate">{c.name}</p>
                          <p className="text-[9.5px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{v.sub}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-cm-primary font-[family-name:var(--font-sora)] whitespace-nowrap">{v.main}</span>
                    </div>
                    {rankBy !== 'antiguedad' && (
                      <div className="h-1 mt-1.5 rounded-full bg-white/5 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${barPct}%` }} transition={{ duration: 0.5, ease: 'easeOut' }}
                          className="h-full rounded-full bg-gradient-to-r from-cm-primary/50 to-cm-primary" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-cm-on-surface-variant mt-3 font-[family-name:var(--font-inter)]">
              Usa el ranking para identificar a los clientes que merecen beneficios, promociones o premios.
            </p>
          </>
        )}
      </motion.div>

      {/* ═══ 5. CLIENTES FRECUENTES / FIDELIZACIÓN ═══ */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-400 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>loyalty</span>
            <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] font-medium">Clientes frecuentes · Fidelización</span>
          </div>
          <div className="flex items-center rounded-lg border border-white/10 overflow-hidden">
            <button type="button" onClick={() => setBadgeMode('reservas')}
              className={`px-3 py-1 text-[10.5px] font-semibold transition-all font-[family-name:var(--font-inter)] ${badgeMode === 'reservas' ? 'bg-cm-primary/15 text-cm-primary' : 'text-cm-on-surface-variant hover:text-cm-on-surface'}`}>
              Clasificar por reservas
            </button>
            <button type="button" onClick={() => setBadgeMode('monto')}
              className={`px-3 py-1 text-[10.5px] font-semibold transition-all font-[family-name:var(--font-inter)] ${badgeMode === 'monto' ? 'bg-cm-primary/15 text-cm-primary' : 'text-cm-on-surface-variant hover:text-cm-on-surface'}`}>
              Clasificar por monto
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <LevelConfigCard
            title="Por número de reservas (historial completo)"
            icon="confirmation_number"
            hint={['VIP ≥', 'Muy frecuente ≥', 'Frecuente ≥']}
            unit="reservas"
            draft={levelsDraft.byBookings}
            onChange={(k, v) => setLevelsDraft((d) => ({ ...d, byBookings: { ...d.byBookings, [k]: v } }))}
            distribution={distribution.byBookings}
          />
          <LevelConfigCard
            title="Por monto acumulado pagado (alternativa)"
            icon="paid"
            hint={['VIP ≥', 'Muy frecuente ≥', 'Frecuente ≥']}
            unit="S/"
            draft={levelsDraft.byAmount}
            onChange={(k, v) => setLevelsDraft((d) => ({ ...d, byAmount: { ...d.byAmount, [k]: v } }))}
            distribution={distribution.byAmount}
          />
        </div>

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <button type="button" onClick={saveLevels} disabled={savingLevels}
            className="px-4 py-2 rounded-lg bg-cm-primary/15 border border-cm-primary/40 text-cm-primary text-xs font-bold hover:bg-cm-primary/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
            {savingLevels ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: '"FILL" 1' }}>save</span>}
            Guardar umbrales
          </button>
          {levelsMsg && <span className="text-[11px] font-semibold text-cm-primary font-[family-name:var(--font-inter)]">{levelsMsg}</span>}
          <span className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
            Nuevo: menos de {levelsDraft.byBookings.frecuente} reservas. Clasificación aplicada a todo el historial del cliente.
          </span>
        </div>
      </motion.div>

      {/* ═══ 6. BALANCE DEL USUARIO (MODAL) ═══ */}
      <AnimatePresence>
        {selected && (
          <ClientBalanceModal stat={selected} advances={advances} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════
   TARJETA DE CONFIGURACIÓN DE NIVEL (FIDELIZACIÓN)
   ═══════════════════════════════════════════════════ */
function LevelConfigCard({ title, icon, hint, unit, draft, onChange, distribution }: {
  title: string
  icon: string
  hint: string[]
  unit: string
  draft: { vip: number; muyFrecuente: number; frecuente: number }
  onChange: (k: 'vip' | 'muyFrecuente' | 'frecuente', v: number) => void
  distribution: Record<ClientLevel, number>
}) {
  const distTotal = Math.max(1, distribution.vip + distribution.muy_frecuente + distribution.frecuente + distribution.nuevo)
  const rows: { key: 'vip' | 'muyFrecuente' | 'frecuente'; level: ClientLevel; label: string; hint: string; derived?: string }[] = [
    { key: 'vip', level: 'vip', label: 'Cliente VIP', hint: hint[0] },
    { key: 'muyFrecuente', level: 'muy_frecuente', label: 'Cliente muy frecuente', hint: hint[1] },
    { key: 'frecuente', level: 'frecuente', label: 'Cliente frecuente', hint: hint[2] },
  ]
  return (
    <div className="rounded-xl border border-white/10 bg-cm-surface-container-highest/20 p-3.5">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="material-symbols-outlined text-cm-primary text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>{icon}</span>
        <p className="text-[11px] font-semibold text-cm-on-surface font-[family-name:var(--font-inter)]">{title}</p>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-2">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9.5px] font-bold ${CLIENT_LEVELS[r.level].chip}`}>{r.label}</span>
            <div className="flex items-center gap-1.5">
              <input type="number" min={0} value={draft[r.key]}
                onChange={(e) => onChange(r.key, Math.max(0, Number(e.target.value) || 0))}
                className="w-16 px-2 py-1 bg-cm-surface-container-highest/50 border border-white/10 rounded-md text-[11px] text-cm-on-surface text-right focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-sora)]" />
              <span className="text-[9.5px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] w-14">{unit === 'S/' ? 'S/ o más' : 'o más res.'}</span>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9.5px] font-bold ${CLIENT_LEVELS.nuevo.chip}`}>Cliente nuevo</span>
          <span className="text-[9.5px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">automático</span>
        </div>
      </div>

      {/* Distribución actual */}
      <div className="mt-3">
        <div className="h-2.5 rounded-full overflow-hidden flex bg-cm-surface-container-highest/40">
          {LEVEL_ORDER.map((lv) => {
            const pct = Math.round((distribution[lv] / distTotal) * 100)
            return pct > 0 ? <div key={lv} className={CLIENT_LEVELS[lv].bar} style={{ width: `${pct}%` }} /> : null
          })}
        </div>
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5">
          {LEVEL_ORDER.map((lv) => (
            <span key={lv} className="text-[9.5px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full inline-block ${CLIENT_LEVELS[lv].bar}`} />
              {CLIENT_LEVELS[lv].label}: <span className="text-cm-on-surface font-bold">{distribution[lv]}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
