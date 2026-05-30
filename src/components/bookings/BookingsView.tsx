'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/hooks/use-toast'
import { getAuthHeaders } from '@/lib/auth-helpers'
import CulqiPayButton from '@/components/payments/CulqiPayButton'

/* ─── types ─── */
interface Booking {
  id: string
  courtId: string
  userId: string
  date: string
  startTime: string
  endTime: string
  totalPrice: number
  advanceAmount: number
  remainingAmount: number
  status: string
  paymentMethod: string | null
  notes: string | null
  court: {
    id: string
    name: string
    sport: string
    branch: { id: string; name: string }
  }
  user: { id: string; name: string; email: string }
}

interface PaymentRecord {
  id: string
  amount: number
  type: string
  method: string
  status: string
  createdAt: unknown
}

type TabType = 'upcoming' | 'completed' | 'cancelled'

/* ─── config ─── */
const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  reserved:         { label: 'Pendiente de Pago',  color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',     icon: 'schedule' },
  partial_payment:  { label: 'Pago Parcial',       color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: 'clock_loader' },
  confirmed:        { label: 'Pagado',             color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: 'verified' },
  completed:        { label: 'Completo',           color: 'bg-green-500/20 text-green-400 border-green-500/30',   icon: 'check_circle' },
  cancelled:        { label: 'Cancelado',          color: 'bg-red-500/20 text-red-400 border-red-500/30',        icon: 'cancel' },
}

const sportIcons: Record<string, string> = {
  futbol: 'sports_soccer',
  voley: 'sports_volleyball',
  basket: 'sports_basketball',
  tenis: 'sports_tennis',
  eventos: 'celebration',
}

const sportLabels: Record<string, string> = {
  futbol: 'Fútbol',
  voley: 'Vóley',
  basket: 'Básquet',
  tenis: 'Tenis',
  eventos: 'Eventos',
}

const paymentMethodLabels: Record<string, string> = {
  yape: 'Yape',
  plin: 'Plin',
  culqi: 'Culqi',
  card: 'Tarjeta',
  cash: 'Efectivo',
  transfer: 'Transferencia',
}

const onlineMethods = ['culqi', 'yape', 'plin', 'card', 'tarjeta']
const manualMethods = ['efectivo', 'transferencia', 'cash', 'transfer']

const tabs: { key: TabType; label: string }[] = [
  { key: 'upcoming',   label: 'Activas' },
  { key: 'completed',  label: 'Completadas' },
  { key: 'cancelled',  label: 'Canceladas' },
]

/* ─── helpers ─── */
// Parse date string as local date (avoids UTC timezone issues for Peru, UTC-5)
function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
  }
  return new Date(dateStr + 'T00:00:00')
}

const fmt = (dateStr: string) => {
  const d = parseLocalDate(dateStr)
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}

const fmtCurrency = (n: number) => `S/ ${n.toFixed(2)}`

/* ─── component ─── */
export default function BookingsView() {
  const { user, setView } = useAppStore()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('upcoming')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  /* pay-remaining modal */
  const [payModal, setPayModal] = useState<Booking | null>(null)
  const [payMethod, setPayMethod] = useState('yape')
  const [paying, setPaying] = useState(false)
  const [payModalTab, setPayModalTab] = useState<'online' | 'manual'>('online')

  /* payment history modal */
  const [historyModal, setHistoryModal] = useState<Booking | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  /* ─── fetch ─── */
  const fetchBookings = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      // Don't send userId as query param — let the server determine it from auth headers
      // This avoids mismatch between old demo IDs and real Firebase UIDs
      const res = await fetch('/api/bookings', {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const data: Booking[] = await res.json()
        setBookings(data)
        console.log('[CREARD] Bookings loaded:', data.length)
      } else {
        const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
        console.error('[CREARD] Error loading bookings:', res.status, err)
      }
    } catch (err) {
      console.error('[CREARD] Fetch bookings error:', err)
      toast({ title: 'Error', description: 'No se pudieron cargar las reservas', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  /* ─── filter ─── */
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const filtered = bookings.filter((b) => {
    const bd = parseLocalDate(b.date)
    switch (activeTab) {
      case 'upcoming':
        return (
          bd >= today &&
          !['cancelled', 'completed'].includes(b.status)
        )
      case 'completed':
        return b.status === 'completed'
      case 'cancelled':
        return b.status === 'cancelled'
      default:
        return true
    }
  })

  /* ─── actions ─── */
  const handleCancel = async (id: string) => {
    try {
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, status: 'cancelled' }),
      })
      if (res.ok) {
        setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)))
        setExpandedId(null)
        toast({ title: 'Reserva cancelada', description: 'Tu reserva ha sido cancelada exitosamente.' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo cancelar la reserva', variant: 'destructive' })
    }
  }

  const handlePayRemaining = async () => {
    if (!payModal) return
    setPaying(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          bookingId: payModal.id,
          type: 'remaining',
          amount: payModal.remainingAmount,
          method: payMethod,
        }),
      })
      if (res.ok) {
        toast({ title: 'Pago registrado', description: `Se registró el pago restante de ${fmtCurrency(payModal.remainingAmount)}` })
        setPayModal(null)
        fetchBookings()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'No se pudo procesar el pago', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo procesar el pago', variant: 'destructive' })
    } finally {
      setPaying(false)
    }
  }

  /* ─── fetch payment history ─── */
  const fetchPaymentHistory = useCallback(async (bookingId: string) => {
    try {
      setLoadingHistory(true)
      const res = await fetch(`/api/payments?bookingId=${bookingId}`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setPaymentHistory(data)
      }
    } catch (err) {
      console.error('[PAYMENTS] Error fetching history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  const openHistory = (booking: Booking) => {
    setHistoryModal(booking)
    fetchPaymentHistory(booking.id)
  }

  /* ─── tab counts ─── */
  const tabCounts = {
    upcoming: bookings.filter((b) => {
      const bd = parseLocalDate(b.date)
      return bd >= today && !['completed', 'cancelled'].includes(b.status)
    }).length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  }

  return (
    <div className="px-4 py-6 pb-28">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-cm-on-surface">
              Mis Reservas
            </h1>
            <p className="text-cm-on-surface-variant text-sm mt-1 font-[family-name:var(--font-inter)]">
              Gestiona tus reservas de canchas
            </p>
          </div>
          <button
            onClick={() => setView('search')}
            className="flex items-center gap-1.5 px-4 py-2 bg-cm-primary/10 text-cm-primary text-sm font-semibold rounded-xl hover:bg-cm-primary/20 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>add</span>
            <span className="hidden sm:inline">Nueva Reserva</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-cm-surface-container-highest/40 rounded-xl mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-cm-primary/10 text-cm-primary font-semibold'
                  : 'text-cm-on-surface-variant hover:text-cm-on-surface'
              }`}
            >
              {tab.label}
              {tabCounts[tab.key] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-cm-primary/20 text-cm-primary' : 'bg-cm-surface-container-highest text-cm-on-surface-variant'
                }`}>
                  {tabCounts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-cm-surface-container-highest rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-cm-surface-container-highest rounded w-3/4" />
                    <div className="h-3 bg-cm-surface-container-highest rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-cm-surface-container-highest/60 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl text-cm-on-surface-variant/40">event_busy</span>
            </div>
            <p className="text-cm-on-surface-variant font-[family-name:var(--font-inter)] text-base">
              No tienes reservas {activeTab === 'upcoming' ? 'próximas' : activeTab === 'completed' ? 'completadas' : 'canceladas'}
            </p>
            <button
              onClick={() => setView('search')}
              className="mt-4 text-cm-primary text-sm font-semibold hover:underline"
            >
              Buscar canchas
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((booking) => {
                const status = statusConfig[booking.status] || statusConfig.reserved
                const isExpanded = expandedId === booking.id
                const progressPercent = booking.totalPrice > 0
                  ? (booking.advanceAmount / booking.totalPrice) * 100
                  : 0

                return (
                  <motion.div
                    key={booking.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className={`glass-card rounded-xl overflow-hidden transition-all ${
                      isExpanded ? 'border-cm-primary/30 glow-accent' : 'hover:border-white/15'
                    }`}
                  >
                    {/* Main row */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Sport icon */}
                        <div className="w-12 h-12 rounded-xl bg-cm-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-cm-primary text-[24px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                            {sportIcons[booking.court.sport] || 'sports'}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-sm truncate">
                                  {booking.court.name}
                                </h3>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cm-surface-container-highest text-cm-on-surface-variant border border-cm-outline-variant/50 whitespace-nowrap">
                                  {sportLabels[booking.court.sport] || booking.court.sport}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-cm-on-surface-variant text-xs font-[family-name:var(--font-inter)]">
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                                  {fmt(booking.date)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                                  {booking.startTime} - {booking.endTime}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <p className="font-[family-name:var(--font-sora)] font-bold text-cm-primary text-sm">
                                {fmtCurrency(booking.totalPrice)}
                              </p>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${status.color}`}>
                                <span className="material-symbols-outlined text-[12px]">{status.icon}</span>
                                {status.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar (visible for active payment statuses) */}
                      {['reserved', 'partial_payment', 'confirmed'].includes(booking.status) && (
                        <div className="mt-3 ml-[60px]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                              Adelanto {fmtCurrency(booking.advanceAmount)}
                            </span>
                            <span className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                              {Math.round(progressPercent)}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-cm-surface-container-highest rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercent}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className={`h-full rounded-full ${
                                progressPercent >= 100
                                  ? 'bg-cm-primary'
                                  : 'bg-gradient-to-r from-cm-primary to-cm-primary-dim'
                              }`}
                            />
                          </div>
                        </div>
                      )}

                      {/* Expand chevron */}
                      <div className="flex justify-center mt-2">
                        <motion.span
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="material-symbols-outlined text-cm-on-surface-variant/40 text-[18px]"
                        >
                          expand_more
                        </motion.span>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-3">
                            {/* Details */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-cm-on-surface-variant text-xs font-[family-name:var(--font-inter)] mb-0.5">Sede</p>
                                <p className="text-cm-on-surface font-medium font-[family-name:var(--font-sora)]">{booking.court.branch.name}</p>
                              </div>
                              <div>
                                <p className="text-cm-on-surface-variant text-xs font-[family-name:var(--font-inter)] mb-0.5">Método de pago</p>
                                <p className="text-cm-on-surface font-medium font-[family-name:var(--font-sora)]">
                                  {paymentMethodLabels[booking.paymentMethod || ''] || booking.paymentMethod || 'No definido'}
                                </p>
                              </div>
                              <div>
                                <p className="text-cm-on-surface-variant text-xs font-[family-name:var(--font-inter)] mb-0.5">Adelanto</p>
                                <p className="text-cm-on-surface font-medium font-[family-name:var(--font-sora)]">{fmtCurrency(booking.advanceAmount)}</p>
                              </div>
                              <div>
                                <p className="text-cm-on-surface-variant text-xs font-[family-name:var(--font-inter)] mb-0.5">Restante</p>
                                <p className={`font-medium font-[family-name:var(--font-sora)] ${booking.remainingAmount > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                                  {fmtCurrency(booking.remainingAmount)}
                                </p>
                              </div>
                            </div>

                            {/* Remaining payment warning */}
                            {booking.remainingAmount > 0 && ['reserved', 'partial_payment'].includes(booking.status) && (
                              <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                <span className="material-symbols-outlined text-orange-400 text-[20px]">warning</span>
                                <p className="text-sm text-orange-300 font-[family-name:var(--font-inter)]">
                                  Falta pagar <span className="font-semibold">{fmtCurrency(booking.remainingAmount)}</span>
                                </p>
                              </div>
                            )}

                            {/* Fully paid confirmation */}
                            {booking.status === 'confirmed' && (
                              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <span className="material-symbols-outlined text-emerald-400 text-[20px]">verified</span>
                                <p className="text-sm text-emerald-300 font-[family-name:var(--font-inter)]">
                                  Pago completado — tu reserva esta confirmada
                                </p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 pt-1">
                              {['reserved', 'partial_payment'].includes(booking.status) && booking.remainingAmount > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setPayModal(booking)
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-cm-primary text-cm-on-primary rounded-xl text-sm font-semibold hover:brightness-110 transition-all font-[family-name:var(--font-sora)]"
                                >
                                  <span className="material-symbols-outlined text-[18px]">payments</span>
                                  Pagar Restante
                                </button>
                              )}
                              {['reserved', 'partial_payment'].includes(booking.status) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCancel(booking.id)
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-red-500/30 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/10 transition-colors font-[family-name:var(--font-sora)]"
                                >
                                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                                  Cancelar
                                </button>
                              )}
                              {booking.advanceAmount > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openHistory(booking)
                                  }}
                                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-cm-primary/30 text-cm-primary rounded-xl text-sm font-semibold hover:bg-cm-primary/10 transition-colors font-[family-name:var(--font-sora)]"
                                >
                                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                                  Historial
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ─── Pay Remaining Modal ─── */}
      <AnimatePresence>
        {payModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !paying && setPayModal(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md glass-card rounded-2xl p-6 border-cm-primary/20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-[family-name:var(--font-sora)] font-bold text-lg text-cm-on-surface">
                  Pagar Restante
                </h3>
                {!paying && (
                  <button
                    onClick={() => setPayModal(null)}
                    className="p-1 rounded-full hover:bg-cm-surface-container-highest transition-colors"
                  >
                    <span className="material-symbols-outlined text-cm-on-surface-variant">close</span>
                  </button>
                )}
              </div>

              {/* Booking summary */}
              <div className="p-3 rounded-xl bg-cm-surface-container-highest/40 space-y-2 mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Cancha</span>
                  <span className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">{payModal.court.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Fecha</span>
                  <span className="text-sm text-cm-on-surface font-[family-name:var(--font-inter)]">{fmt(payModal.date)} · {payModal.startTime} - {payModal.endTime}</span>
                </div>
                <div className="border-t border-white/5 pt-2 flex items-center justify-between">
                  <span className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Monto a pagar</span>
                  <span className="text-lg font-bold text-cm-primary font-[family-name:var(--font-sora)]">{fmtCurrency(payModal.remainingAmount)}</span>
                </div>
              </div>

              {/* Tabs: Online / Manual */}
              <div className="flex gap-1 p-1 bg-cm-surface-container-highest/40 rounded-xl mb-4">
                <button
                  onClick={() => setPayModalTab('online')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all font-[family-name:var(--font-inter)] flex items-center justify-center gap-1.5 ${
                    payModalTab === 'online'
                      ? 'bg-cm-primary text-cm-on-primary shadow-sm'
                      : 'text-cm-on-surface-variant hover:text-cm-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  En Linea
                </button>
                <button
                  onClick={() => setPayModalTab('manual')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all font-[family-name:var(--font-inter)] flex items-center justify-center gap-1.5 ${
                    payModalTab === 'manual'
                      ? 'bg-cm-primary text-cm-on-primary shadow-sm'
                      : 'text-cm-on-surface-variant hover:text-cm-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">storefront</span>
                  Manual
                </button>
              </div>

              {/* Online payment with Culqi */}
              {payModalTab === 'online' && (
                <CulqiPayButton
                  bookingId={payModal.id}
                  totalAmount={payModal.totalPrice}
                  remainingAmount={payModal.remainingAmount}
                  paymentType="remaining"
                  userEmail={payModal.user.email}
                  buttonText={`Pagar ${fmtCurrency(payModal.remainingAmount)}`}
                  onSuccess={() => {
                    toast({ title: 'Pago exitoso', description: 'Tu reserva ha sido actualizada.' })
                    setPayModal(null)
                    fetchBookings()
                  }}
                  onError={(error) => {
                    toast({ title: 'Error en el pago', description: error, variant: 'destructive' })
                  }}
                  onClose={() => {}}
                />
              )}

              {/* Manual payment method */}
              {payModalTab === 'manual' && (
                <div className="space-y-2 mb-4">
                  <label className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Metodo de pago manual</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'yape', label: 'Yape', icon: 'account_balance_wallet' },
                      { key: 'plin', label: 'Plin', icon: 'phone_android' },
                      { key: 'cash', label: 'Efectivo', icon: 'payments' },
                      { key: 'transfer', label: 'Transferencia', icon: 'account_balance' },
                    ].map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setPayMethod(m.key)}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                          payMethod === m.key
                            ? 'bg-cm-primary/10 border-cm-primary/40 text-cm-primary'
                            : 'bg-cm-surface-container-highest/30 border-transparent text-cm-on-surface-variant hover:border-white/10'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirm button (only for manual) */}
              {payModalTab === 'manual' && (
                <button
                  onClick={handlePayRemaining}
                  disabled={paying}
                  className="w-full py-3 bg-cm-primary text-cm-on-primary rounded-xl font-semibold font-[family-name:var(--font-sora)] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {paying ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                      Confirmar Pago {fmtCurrency(payModal.remainingAmount)}
                    </>
                  )}
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Payment History Modal ─── */}
      <AnimatePresence>
        {historyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setHistoryModal(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md glass-card rounded-2xl p-6 border-cm-primary/20 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-[family-name:var(--font-sora)] font-bold text-lg text-cm-on-surface">
                  Historial de Pagos
                </h3>
                <button
                  onClick={() => setHistoryModal(null)}
                  className="p-1 rounded-full hover:bg-cm-surface-container-highest transition-colors"
                >
                  <span className="material-symbols-outlined text-cm-on-surface-variant">close</span>
                </button>
              </div>

              {/* Booking info */}
              <div className="p-3 rounded-xl bg-cm-surface-container-highest/40 space-y-1 mb-4">
                <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">{historyModal.court.name}</p>
                <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                  {fmt(historyModal.date)} · {historyModal.startTime} - {historyModal.endTime}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-xs text-cm-on-surface-variant">Total</span>
                  <span className="text-sm font-bold text-cm-primary font-[family-name:var(--font-sora)]">{fmtCurrency(historyModal.totalPrice)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-cm-on-surface-variant">Pagado</span>
                  <span className="text-sm font-semibold text-emerald-400 font-[family-name:var(--font-sora)]">{fmtCurrency(historyModal.advanceAmount)}</span>
                </div>
              </div>

              {/* Payment list */}
              {loadingHistory ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 rounded-xl bg-cm-surface-container-highest/40 animate-pulse" />
                  ))}
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-3xl text-cm-on-surface-variant/30">receipt_long</span>
                  <p className="text-sm text-cm-on-surface-variant mt-2">No hay pagos registrados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="flex items-center gap-3 p-3 rounded-xl bg-cm-surface-container-highest/40 border border-white/5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        payment.type === 'advance'
                          ? 'bg-blue-500/10'
                          : 'bg-emerald-500/10'
                      }`}>
                        <span className={`material-symbols-outlined text-[20px] ${
                          payment.type === 'advance' ? 'text-blue-400' : 'text-emerald-400'
                        }`} style={{ fontVariationSettings: '"FILL" 1' }}>
                          {payment.type === 'advance' ? 'download' : 'verified'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                            {payment.type === 'advance' ? 'Adelanto' : 'Pago Restante'}
                          </p>
                          <p className="text-sm font-bold text-cm-primary font-[family-name:var(--font-sora)]">
                            {fmtCurrency(payment.amount)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                            {paymentMethodLabels[payment.method] || payment.method}
                          </span>
                          <span className="text-cm-on-surface-variant/30">·</span>
                          <span className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                            {payment.createdAt
                              ? new Date(String(payment.createdAt)).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
