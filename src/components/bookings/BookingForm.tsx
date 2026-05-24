'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/hooks/use-toast'

/* ───────────── Interfaces ───────────── */

interface Court {
  id: string
  name: string
  sport: string
  pricePerHour: number
  branch: { name: string; city: string }
  images: string[]
}

interface BookingResponse {
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
}

/* ───────────── Constants ───────────── */

const sportIcons: Record<string, string> = {
  futbol: 'sports_soccer',
  voley: 'sports_volleyball',
  basket: 'sports_basketball',
  tenis: 'sports_tennis',
  eventos: 'celebration',
  padel: 'sports_tennis',
}

const paymentMethods = [
  { value: 'yape', label: 'Yape', icon: 'phone_iphone', color: '#742db5' },
  { value: 'plin', label: 'Plin', icon: 'phone_iphone', color: '#00c1d4' },
  { value: 'culqi', label: 'Culqi', icon: 'credit_card', color: '#f97316' },
  { value: 'card', label: 'Tarjeta', icon: 'credit_card', color: '#6366f1' },
  { value: 'cash', label: 'Efectivo', icon: 'payments', color: '#22c55e' },
  { value: 'transfer', label: 'Transferencia', icon: 'account_balance', color: '#eab308' },
]

/* ───────────── Helpers ───────────── */

function parseDate(dateStr: string | null): Date {
  if (!dateStr) return new Date()
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
  }
  // Fallback in case a Date object was stored
  return new Date(dateStr)
}

function formatDateES(date: Date): string {
  return date.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

function getRefCode(bookingId: string): string {
  const hash = bookingId.slice(-8).toUpperCase()
  return `CRE-${hash.slice(0, 4)}-${hash.slice(4)}`
}

/* ───────────── Component ───────────── */

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
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [bookingRef, setBookingRef] = useState('')
  const [bookingData, setBookingData] = useState<BookingResponse | null>(null)

  const [paymentMethod, setPaymentMethod] = useState('yape')
  const [clientName, setClientName] = useState(user?.name || '')
  const [clientEmail, setClientEmail] = useState(user?.email || '')
  const [clientPhone, setClientPhone] = useState(user?.phone || '')

  // Parse store values
  const bookingDate = useMemo(() => parseDate(selectedDate), [selectedDate])
  const timeParts = useMemo(() => {
    if (!selectedTimeSlot) return { start: '', end: '' }
    const parts = selectedTimeSlot.split(' - ')
    return { start: parts[0] || '', end: parts[1] || '' }
  }, [selectedTimeSlot])

  const totalPrice = court?.pricePerHour || 0
  const advanceAmount = totalPrice * 0.5
  const remainingAmount = totalPrice * 0.5

  /* ──── Fetch court ──── */
  useEffect(() => {
    if (!selectedCourtId || !selectedTimeSlot) {
      setView('court-detail')
      return
    }
    let cancelled = false
    setLoading(true)
    fetch(`/api/courts?id=${selectedCourtId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setCourt(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false)
          setView('court-detail')
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedCourtId, selectedTimeSlot, setView])

  /* ──── Pre-fill from user ──── */
  useEffect(() => {
    if (user) {
      setClientName(user.name || '')
      setClientEmail(user.email || '')
      setClientPhone(user.phone || '')
    }
  }, [user])

  /* ──── Submit ──── */
  const handleSubmit = useCallback(async () => {
    if (!court || !selectedDate || !timeParts.start || !timeParts.end) return
    if (!user?.id) {
      toast({ title: 'Inicia sesión', description: 'Debes iniciar sesión para reservar.', variant: 'destructive' })
      setView('login')
      return
    }
    if (!clientName.trim() || !clientPhone.trim()) {
      toast({ title: 'Datos incompletos', description: 'Nombre y teléfono son requeridos.', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courtId: court.id,
          userId: user.id,
          date: selectedDate,
          startTime: timeParts.start,
          endTime: timeParts.end,
          totalPrice,
          advanceAmount,
          remainingAmount,
          status: 'partially_paid',
          paymentMethod,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al crear reserva')
      }

      const created: BookingResponse = await res.json()
      const ref = getRefCode(created.id)
      setBookingRef(ref)
      setBookingData(created)
      setSuccess(true)

      addNotification({
        title: 'Reserva confirmada',
        message: `Reserva en ${court.name} — ${formatDateES(bookingDate)} a las ${timeParts.start}. Ref: ${ref}`,
        type: 'success',
      })
    } catch (error) {
      toast({
        title: 'Error al reservar',
        description: error instanceof Error ? error.message : 'No se pudo crear la reserva. Intenta de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }, [
    court, selectedDate, timeParts, user, clientName, clientPhone,
    totalPrice, advanceAmount, remainingAmount, paymentMethod, bookingDate,
    addNotification, setView,
  ])

  /* ──── Go back ──── */
  const handleBack = useCallback(() => {
    if (success) {
      setSelectedCourt(null)
      setSelectedDate(null)
      setSelectedTimeSlot(null)
      setView('bookings')
    } else {
      setView('court-detail')
    }
  }, [success, setSelectedCourt, setSelectedDate, setSelectedTimeSlot, setView])

  /* ───────────── Render ───────────── */

  if (loading) {
    return (
      <div className="min-h-screen bg-cm-background">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-cm-surface-container-highest rounded w-1/4" />
            <div className="h-36 bg-cm-surface-container-highest rounded-xl" />
            <div className="h-48 bg-cm-surface-container-highest rounded-xl" />
            <div className="h-40 bg-cm-surface-container-highest rounded-xl" />
          </div>
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
      className="min-h-screen bg-cm-background"
    >
      <AnimatePresence mode="wait">
        {!success ? (
          /* ═══════ FORM VIEW ═══════ */
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-lg mx-auto px-4 py-6 pb-40"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={handleBack}
                className="p-2 rounded-full bg-cm-surface-container-highest/60 text-cm-on-surface-variant hover:text-cm-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
              <h1 className="font-[family-name:var(--font-sora)] text-xl font-bold text-cm-on-surface">
                Nueva Reserva
              </h1>
            </div>

            {/* ─── Summary Card ─── */}
            <div className="glass-card rounded-2xl p-4 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#00ff41]/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#00ff41] text-[28px]">
                    {sportIcons[court.sport] || 'sports'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-base truncate">
                    {court.name}
                  </p>
                  <p className="text-cm-on-surface-variant text-xs font-[family-name:var(--font-inter)]">
                    {court.branch.name}, {court.branch.city}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-cm-surface-container-highest/40 rounded-lg p-3">
                  <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">calendar_month</span>
                    Fecha
                  </p>
                  <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)] capitalize">
                    {formatDateShort(bookingDate)}
                  </p>
                </div>
                <div className="bg-cm-surface-container-highest/40 rounded-lg p-3">
                  <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                    Horario
                  </p>
                  <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                    {timeParts.start} - {timeParts.end}
                  </p>
                </div>
              </div>
            </div>

            {/* ─── Payment Breakdown ─── */}
            <div className="glass-card rounded-2xl p-4 mb-6">
              <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-sm mb-4 flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-[#00ff41] text-[20px]"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  receipt_long
                </span>
                Resumen de Pago
              </h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                    Precio por hora
                  </span>
                  <span className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                    S/ {totalPrice.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                      Adelanto 50%
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#00ff41]/15 text-[#00ff41] border border-[#00ff41]/30 font-[family-name:var(--font-inter)]">
                      REQUERIDO
                    </span>
                  </div>
                  <span className="text-base font-bold text-[#00ff41] font-[family-name:var(--font-sora)] text-glow">
                    S/ {advanceAmount.toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-dashed border-white/10 pt-3 flex items-center justify-between">
                  <span className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                    Pago restante 50%
                  </span>
                  <span className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                    S/ {remainingAmount.toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                    Total
                  </span>
                  <span className="text-lg font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">
                    S/ {totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* ─── Payment Method ─── */}
            <div className="mb-6">
              <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-sm mb-3 flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-[#00ff41] text-[20px]"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  payment
                </span>
                Método de pago (adelanto)
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((pm) => {
                  const isSelected = paymentMethod === pm.value
                  return (
                    <button
                      key={pm.value}
                      onClick={() => setPaymentMethod(pm.value)}
                      className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl transition-all duration-200 ${
                        isSelected
                          ? 'bg-[#00ff41]/8 border border-[#00ff41]/30'
                          : 'bg-cm-surface-container-highest/40 border border-transparent hover:border-white/10'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
                        style={{
                          backgroundColor: isSelected ? `${pm.color}20` : 'rgba(45,56,42,0.3)',
                        }}
                      >
                        <span
                          className={`material-symbols-outlined text-[22px] transition-colors duration-200`}
                          style={{
                            color: isSelected ? pm.color : '#84967e',
                            fontVariationSettings: isSelected ? '"FILL" 1' : '"FILL" 0',
                          }}
                        >
                          {pm.icon}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-semibold transition-colors duration-200 font-[family-name:var(--font-inter)] ${
                          isSelected ? 'text-[#00ff41]' : 'text-cm-on-surface-variant'
                        }`}
                      >
                        {pm.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ─── Client Info ─── */}
            <div className="mb-6">
              <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-sm mb-3 flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-[#00ff41] text-[20px]"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  person
                </span>
                Datos de contacto
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-cm-on-surface-variant mb-1.5 block font-[family-name:var(--font-inter)]">
                    Nombre completo <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cm-on-surface-variant text-[18px]">
                      badge
                    </span>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Tu nombre"
                      className="w-full pl-10 pr-4 py-2.5 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm placeholder:text-cm-on-surface-variant/40 focus:outline-none focus:border-[#00ff41]/50 transition-colors font-[family-name:var(--font-inter)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-cm-on-surface-variant mb-1.5 block font-[family-name:var(--font-inter)]">
                    Email
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cm-on-surface-variant text-[18px]">
                      mail
                    </span>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm placeholder:text-cm-on-surface-variant/40 focus:outline-none focus:border-[#00ff41]/50 transition-colors font-[family-name:var(--font-inter)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-cm-on-surface-variant mb-1.5 block font-[family-name:var(--font-inter)]">
                    Teléfono <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cm-on-surface-variant text-[18px]">
                      phone
                    </span>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+51 999 999 999"
                      className="w-full pl-10 pr-4 py-2.5 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm placeholder:text-cm-on-surface-variant/40 focus:outline-none focus:border-[#00ff41]/50 transition-colors font-[family-name:var(--font-inter)]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ═══════ SUCCESS VIEW ═══════ */
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="max-w-lg mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[80vh]"
          >
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
              className="w-24 h-24 rounded-full bg-[#00ff41]/10 border-2 border-[#00ff41]/30 flex items-center justify-center mb-6"
            >
              <span
                className="material-symbols-outlined text-[#00ff41] text-[48px]"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                check_circle
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center mb-8"
            >
              <h2 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-cm-on-surface mb-2">
                ¡Reserva Confirmada!
              </h2>
              <p className="text-cm-on-surface-variant text-sm font-[family-name:var(--font-inter)]">
                Tu cancha ha sido reservada exitosamente
              </p>
            </motion.div>

            {/* Booking Details Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full glass-card rounded-2xl p-5 mb-6"
            >
              {/* Reference */}
              <div className="text-center mb-4 pb-4 border-b border-dashed border-white/10">
                <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1">
                  Referencia de reserva
                </p>
                <p className="font-mono text-xl font-bold text-[#00ff41] text-glow tracking-wider">
                  {bookingRef}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#00ff41]/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#00ff41] text-[20px]">
                      {sportIcons[court.sport] || 'sports'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)] truncate">
                      {court.name}
                    </p>
                    <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                      {court.branch.name}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-cm-surface-container-highest/40 rounded-lg p-3">
                    <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-0.5">Fecha</p>
                    <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)] capitalize">
                      {formatDateShort(bookingDate)}
                    </p>
                  </div>
                  <div className="bg-cm-surface-container-highest/40 rounded-lg p-3">
                    <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-0.5">Horario</p>
                    <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                      {timeParts.start} - {timeParts.end}
                    </p>
                  </div>
                </div>

                <div className="bg-[#00ff41]/5 border border-[#00ff41]/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#00ff41] font-[family-name:var(--font-inter)] font-semibold">
                      Adelanto pagado
                    </span>
                    <span className="text-sm font-bold text-[#00ff41] font-[family-name:var(--font-sora)]">
                      S/ {advanceAmount.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mt-1">
                    Pago restante: S/ {remainingAmount.toFixed(2)} (en el local)
                  </p>
                </div>

                {bookingData?.paymentMethod && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-cm-on-surface-variant">
                      {bookingData.paymentMethod === 'cash'
                        ? 'payments'
                        : bookingData.paymentMethod === 'transfer'
                        ? 'account_balance'
                        : 'phone_iphone'}
                    </span>
                    <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                      Pagado con{' '}
                      <span className="capitalize font-semibold text-cm-on-surface">
                        {bookingData.paymentMethod}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Back Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full space-y-3"
            >
              <button
                onClick={handleBack}
                className="w-full py-3.5 bg-[#00ff41] text-[#003907] font-semibold rounded-xl hover:bg-[#00e639] transition-all glow-accent font-[family-name:var(--font-sora)] flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">bookmark</span>
                Ver Mis Reservas
              </button>
              <button
                onClick={() => {
                  setSelectedCourt(null)
                  setSelectedDate(null)
                  setSelectedTimeSlot(null)
                  setView('search')
                }}
                className="w-full py-3 text-cm-on-surface-variant text-sm font-medium font-[family-name:var(--font-inter)] hover:text-cm-on-surface transition-colors"
              >
                Buscar más canchas
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bottom Submit Bar (form only) ─── */}
      {!success && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-cm-background/95 backdrop-blur-xl border-t border-white/10">
          <div className="max-w-lg mx-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                  Adelanto a pagar
                </p>
                <p className="font-[family-name:var(--font-sora)] font-bold text-[#00ff41] text-lg text-glow">
                  S/ {advanceAmount.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] capitalize">
                  {formatDateES(bookingDate)}
                </p>
                <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                  {timeParts.start} - {timeParts.end}
                </p>
              </div>
            </div>
            <button
              disabled={submitting}
              onClick={handleSubmit}
              className="w-full py-3.5 bg-[#00ff41] text-[#003907] font-semibold rounded-xl hover:bg-[#00e639] transition-all glow-accent disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-sora)] flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  Procesando reserva...
                </>
              ) : (
                <>
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    verified_payment
                  </span>
                  Confirmar Reserva y Pagar Adelanto
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
