'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/hooks/use-toast'

interface Booking {
  id: string
  date: string
  startTime: string
  endTime: string
  totalPrice: number
  status: string
  paymentMethod: string
  court: {
    id: string
    name: string
    sport: string
    branch: { name: string }
  }
  client: {
    name: string
  }
}

type TabType = 'upcoming' | 'past' | 'cancelled'

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  confirmed: { label: 'Confirmada', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: 'check_circle' },
  completed: { label: 'Completada', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: 'done_all' },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: 'cancel' },
  no_show: { label: 'No asistió', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: 'person_off' },
}

const sportIcons: Record<string, string> = {
  futbol: 'sports_soccer',
  voley: 'sports_volleyball',
  basket: 'sports_basketball',
  tenis: 'sports_tennis',
  eventos: 'celebration',
}

const tabs: { key: TabType; label: string }[] = [
  { key: 'upcoming', label: 'Próximas' },
  { key: 'past', label: 'Pasadas' },
  { key: 'cancelled', label: 'Canceladas' },
]

export default function BookingsView() {
  const { user, setView } = useAppStore()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('upcoming')
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetch(`/api/bookings?clientId=email:${user.email}`)
      .then((res) => res.json())
      .then((data) => {
        // Fallback: fetch all and filter client-side
        if (Array.isArray(data) && data.length > 0) {
          setBookings(data)
        }
        return fetch('/api/bookings')
      })
      .then((res) => res?.json())
      .then((allBookings) => {
        if (Array.isArray(allBookings) && allBookings.length > 0 && bookings.length === 0) {
          setBookings(allBookings)
        }
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [user])

  const now = new Date()

  const filteredBookings = bookings.filter((b) => {
    const bookingDate = new Date(b.date)
    switch (activeTab) {
      case 'upcoming':
        return bookingDate >= now && b.status === 'confirmed'
      case 'past':
        return (bookingDate < now && b.status === 'completed') || b.status === 'completed'
      case 'cancelled':
        return b.status === 'cancelled'
      default:
        return true
    }
  })

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bookingId, status: 'cancelled' }),
      })
      if (res.ok) {
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b)))
        setSelectedBooking(null)
        toast({ title: 'Reserva cancelada', description: 'Tu reserva ha sido cancelada exitosamente.' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo cancelar la reserva', variant: 'destructive' })
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="px-4 py-6">
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
            Nueva Reserva
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-cm-surface-container-highest/40 rounded-xl mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-cm-primary/10 text-cm-primary font-semibold'
                  : 'text-cm-on-surface-variant hover:text-cm-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bookings List */}
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
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-cm-on-surface-variant/30 mb-4 block">event_busy</span>
            <p className="text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
              No tienes reservas {activeTab === 'upcoming' ? 'próximas' : activeTab === 'past' ? 'pasadas' : 'canceladas'}
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
            <AnimatePresence>
              {filteredBookings.map((booking) => {
                const status = statusConfig[booking.status] || statusConfig.confirmed
                return (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="glass-card rounded-xl p-4 hover:border-cm-primary/20 transition-all cursor-pointer"
                    onClick={() => setSelectedBooking(selectedBooking?.id === booking.id ? null : booking)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Sport Icon */}
                      <div className="w-12 h-12 rounded-xl bg-cm-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-cm-primary text-[24px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                          {sportIcons[booking.court.sport] || 'sports'}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-sm truncate">
                            {booking.court.name}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${status.color}`}>
                            <span className="material-symbols-outlined text-[12px]">{status.icon}</span>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-cm-on-surface-variant text-xs font-[family-name:var(--font-inter)]">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                            {formatDate(booking.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            {booking.startTime} - {booking.endTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                            {booking.court.branch.name}
                          </span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-[family-name:var(--font-sora)] font-bold text-cm-primary text-sm">
                          ${booking.totalPrice}
                        </p>
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    <AnimatePresence>
                      {selectedBooking?.id === booking.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Cliente</span>
                              <span className="text-cm-on-surface font-medium font-[family-name:var(--font-sora)]">{booking.client.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Método de pago</span>
                              <span className="text-cm-on-surface font-medium font-[family-name:var(--font-sora)] capitalize">
                                {booking.paymentMethod || 'No definido'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Total</span>
                              <span className="text-cm-primary font-bold font-[family-name:var(--font-sora)]">${booking.totalPrice}</span>
                            </div>
                            {booking.status === 'confirmed' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCancelBooking(booking.id)
                                }}
                                className="w-full py-2.5 mt-2 border border-red-500/30 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/10 transition-colors font-[family-name:var(--font-sora)]"
                              >
                                Cancelar Reserva
                              </button>
                            )}
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
    </div>
  )
}
