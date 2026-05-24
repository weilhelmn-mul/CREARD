'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/hooks/use-toast'

interface Court {
  id: string
  name: string
  sport: string
  pricePerHour: number
  branch: { name: string }
}

interface Client {
  id: string
  name: string
  email: string
  phone: string
}

const paymentMethods = [
  { value: 'card', label: 'Tarjeta', icon: 'credit_card' },
  { value: 'cash', label: 'Efectivo', icon: 'payments' },
  { value: 'transfer', label: 'Transferencia', icon: 'account_balance' },
]

function getNext14Days(): Date[] {
  const days: Date[] = []
  const now = new Date()
  for (let i = 0; i < 14; i++) {
    days.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i))
  }
  return days
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getDayName(date: Date): string {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  return days[date.getDay()]
}

function getMonthName(date: Date): string {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return months[date.getMonth()]
}

function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = 6; h <= 22; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
  }
  return slots
}

export default function BookingForm() {
  const {
    selectedCourtId,
    selectedDate,
    selectedTimeSlot,
    user,
    setView,
    addNotification,
    setSelectedCourt,
    setSelectedDate,
    setSelectedTimeSlot,
  } = useAppStore()

  const [court, setCourt] = useState<Court | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [bookingDate, setBookingDate] = useState<Date>(selectedDate || new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(
    selectedTimeSlot ? selectedTimeSlot.split(' - ')[0] : null
  )
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [bookedSlots, setBookedSlots] = useState<string[]>([])

  const [clientName, setClientName] = useState(user?.name || '')
  const [clientEmail, setClientEmail] = useState(user?.email || '')
  const [clientPhone, setClientPhone] = useState(user?.phone || '')

  const next14Days = getNext14Days()
  const timeSlots = generateTimeSlots()

  useEffect(() => {
    if (!selectedCourtId) {
      setView('search')
      return
    }

    Promise.all([
      fetch(`/api/courts?id=${selectedCourtId}`).then((r) => r.json()),
      fetch(`/api/clients?email=${user?.email || 'carlos@email.com'}`).then((r) => r.json()),
    ])
      .then(([courtData, clientData]) => {
        setCourt(courtData)
        if (Array.isArray(clientData) && clientData.length > 0) {
          setClient(clientData[0])
        } else if (clientData && clientData.id) {
          setClient(clientData)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        setView('search')
      })
  }, [selectedCourtId, user, setView])

  useEffect(() => {
    if (!selectedCourtId) return
    const dateStr = formatDate(bookingDate)
    fetch(`/api/bookings?courtId=${selectedCourtId}&date=${dateStr}`)
      .then((res) => res.json())
      .then((data) => {
        const slots: string[] = []
        if (Array.isArray(data)) {
          data.forEach((b: { startTime: string; endTime: string }) => {
            const start = parseInt(b.startTime.split(':')[0])
            const end = parseInt(b.endTime.split(':')[0])
            for (let h = start; h < end; h++) {
              slots.push(`${String(h).padStart(2, '0')}:00`)
            }
          })
        }
        setBookedSlots(slots)
      })
      .catch(() => setBookedSlots([]))
  }, [selectedCourtId, bookingDate])

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const handleSubmit = async () => {
    if (!selectedTime || !court || !client?.id) return

    setSubmitting(true)
    const endTime = `${String(parseInt(selectedTime) + 1).padStart(2, '0')}:00`

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courtId: court.id,
          clientId: client.id,
          date: formatDate(bookingDate),
          startTime: selectedTime,
          endTime,
          totalPrice: court.pricePerHour,
          paymentMethod,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al crear reserva')
      }

      toast({
        title: '¡Reserva confirmada!',
        description: `Tu reserva en ${court.name} para el ${bookingDate.toLocaleDateString('es')} a las ${selectedTime} ha sido creada exitosamente.`,
      })

      addNotification({
        title: 'Reserva confirmada',
        message: `${court.name} - ${bookingDate.toLocaleDateString('es')} a las ${selectedTime}`,
        type: 'success',
      })

      // Reset and navigate
      setSelectedCourt(null)
      setSelectedDate(null)
      setSelectedTimeSlot(null)
      setView('bookings')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo crear la reserva',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-cm-surface-container-highest rounded w-1/4" />
          <div className="h-48 bg-cm-surface-container-highest rounded-xl" />
          <div className="h-32 bg-cm-surface-container-highest rounded-xl" />
        </div>
      </div>
    )
  }

  if (!court) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'tween', duration: 0.3 }}
      className="fixed inset-0 z-50 bg-cm-background overflow-y-auto"
    >
      <div className="max-w-lg mx-auto px-4 py-6 pb-32">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setView('court-detail')}
            className="p-2 rounded-full bg-cm-surface-container-highest/60 text-cm-on-surface-variant hover:text-cm-on-surface transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-[family-name:var(--font-sora)] text-xl font-bold text-cm-on-surface">
            Nueva Reserva
          </h1>
        </div>

        {/* Court Summary */}
        <div className="glass-card rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-cm-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-cm-primary text-[28px]">sports_soccer</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface truncate">
                {court.name}
              </p>
              <p className="text-cm-on-surface-variant text-xs font-[family-name:var(--font-inter)]">
                {court.branch.name} · ${court.pricePerHour}/hr
              </p>
            </div>
          </div>
        </div>

        {/* Date Selection */}
        <div className="mb-6">
          <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-sm mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-cm-primary text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>calendar_month</span>
            Fecha
          </h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {next14Days.map((date) => {
              const dateStr = formatDate(date)
              const isSelected = dateStr === formatDate(bookingDate)
              return (
                <button
                  key={dateStr}
                  onClick={() => {
                    setBookingDate(date)
                    setSelectedTime(null)
                  }}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl min-w-[60px] transition-all duration-200 ${
                    isSelected
                      ? 'bg-cm-primary/10 border border-cm-primary/30'
                      : 'bg-cm-surface-container-highest/40 border border-transparent hover:border-white/10'
                  }`}
                >
                  <span className={`text-[10px] font-semibold uppercase ${isSelected ? 'text-cm-primary' : 'text-cm-on-surface-variant'}`}>
                    {getDayName(date)}
                  </span>
                  <span className={`text-lg font-bold font-[family-name:var(--font-sora)] ${isSelected ? 'text-cm-primary text-glow' : 'text-cm-on-surface'}`}>
                    {date.getDate()}
                  </span>
                  <span className={`text-[9px] ${isSelected ? 'text-cm-primary' : 'text-cm-on-surface-variant'}`}>
                    {getMonthName(date)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Time Selection */}
        <div className="mb-6">
          <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-sm mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-cm-primary text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>schedule</span>
            Hora
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {timeSlots.map((slot) => {
              const isBooked = bookedSlots.includes(slot)
              const isSelected = selectedTime === slot
              const isPast = isToday(bookingDate) && parseInt(slot) <= new Date().getHours()

              return (
                <button
                  key={slot}
                  disabled={isBooked || isPast}
                  onClick={() => setSelectedTime(slot)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all duration-200 font-[family-name:var(--font-inter)] ${
                    isSelected
                      ? 'bg-cm-primary text-cm-on-primary font-bold glow-accent'
                      : isBooked
                      ? 'bg-cm-surface-container-highest/30 text-cm-on-surface-variant/40 cursor-not-allowed line-through'
                      : isPast
                      ? 'bg-cm-surface-container-highest/30 text-cm-on-surface-variant/40 cursor-not-allowed'
                      : 'bg-cm-surface-container-highest/60 text-cm-on-surface-variant border border-cm-outline-variant/50 hover:border-cm-primary/50 hover:text-cm-primary'
                  }`}
                >
                  {slot}
                </button>
              )
            })}
          </div>
        </div>

        {/* Client Info */}
        <div className="mb-6">
          <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-sm mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-cm-primary text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>person</span>
            Datos del cliente
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-cm-on-surface-variant mb-1 block font-[family-name:var(--font-inter)]">Nombre</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-4 py-2.5 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm focus:outline-none focus:border-cm-primary/50 transition-colors font-[family-name:var(--font-inter)]"
              />
            </div>
            <div>
              <label className="text-xs text-cm-on-surface-variant mb-1 block font-[family-name:var(--font-inter)]">Email</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm focus:outline-none focus:border-cm-primary/50 transition-colors font-[family-name:var(--font-inter)]"
              />
            </div>
            <div>
              <label className="text-xs text-cm-on-surface-variant mb-1 block font-[family-name:var(--font-inter)]">Teléfono</label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full px-4 py-2.5 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm focus:outline-none focus:border-cm-primary/50 transition-colors font-[family-name:var(--font-inter)]"
              />
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-8">
          <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-sm mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-cm-primary text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>payment</span>
            Método de pago
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {paymentMethods.map((pm) => (
              <button
                key={pm.value}
                onClick={() => setPaymentMethod(pm.value)}
                className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl transition-all duration-200 ${
                  paymentMethod === pm.value
                    ? 'bg-cm-primary/10 border border-cm-primary/30'
                    : 'bg-cm-surface-container-highest/40 border border-transparent hover:border-white/10'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[22px] ${
                    paymentMethod === pm.value ? 'text-cm-primary' : 'text-cm-on-surface-variant'
                  }`}
                  style={paymentMethod === pm.value ? { fontVariationSettings: '"FILL" 1' } : undefined}
                >
                  {pm.icon}
                </span>
                <span className={`text-xs font-medium ${paymentMethod === pm.value ? 'text-cm-primary' : 'text-cm-on-surface-variant'} font-[family-name:var(--font-inter)]`}>
                  {pm.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Total & Submit */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-cm-background/95 backdrop-blur-xl border-t border-white/10 p-4">
          <div className="max-w-lg mx-auto">
            {selectedTime && (
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                  {bookingDate.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })} · {selectedTime}
                </div>
                <div className="font-[family-name:var(--font-sora)] font-bold text-cm-primary text-glow text-lg">
                  ${court.pricePerHour}
                </div>
              </div>
            )}
            <button
              disabled={!selectedTime || submitting}
              onClick={handleSubmit}
              className="w-full py-3.5 bg-cm-primary text-cm-on-primary font-semibold rounded-xl hover:bg-cm-primary-dim transition-all glow-accent disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-sora)] flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  Procesando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                  Confirmar Reserva
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
