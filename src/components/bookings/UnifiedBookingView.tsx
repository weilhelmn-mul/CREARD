'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/hooks/use-toast'
import { getAuthHeaders } from '@/lib/auth-helpers'
import CulqiPayButton from '@/components/payments/CulqiPayButton'
import YapeQRPayButton from '@/components/payments/YapeQRPayButton'

/* ═══════════════════════════════════════════════════════
   CREARD — UnifiedBookingView
   Single-screen booking: multi-court + multi-timeslot
   1-hour blocks ONLY, real-time Firebase availability
   ═══════════════════════════════════════════════════════ */

// ── Interfaces ──

interface PricingScheduleItem {
  label: string
  startHour: number
  endHour: number
  pricePerHour: number
}

interface Court {
  id: string
  name: string
  sport: string
  pricePerHour: number
  pricingSchedule: PricingScheduleItem[]
  branch: { name: string; city: string }
  images: string[]
}

interface ExistingBooking {
  id: string
  court_id: string
  court_ids?: string[]
  start_time: string
  end_time: string
  status: string
}

// ── Constants ──

const SLOT_START = 7
const SLOT_END = 22

const sportConfig: Record<string, { label: string; icon: string; color: string }> = {
  futbol: { label: 'Fútbol', icon: 'sports_soccer', color: '#22c55e' },
  voley:  { label: 'Vóley',  icon: 'sports_volleyball', color: '#f59e0b' },
}

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// ── Helpers ──

function formatDateISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getNext14Days(): Date[] {
  const days: Date[] = []
  const now = new Date()
  for (let i = 0; i < 14; i++) {
    days.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i))
  }
  return days
}

function isToday(date: Date): boolean {
  const t = new Date()
  return date.getFullYear() === t.getFullYear() &&
    date.getMonth() === t.getMonth() &&
    date.getDate() === t.getDate()
}

/** Returns the next full hour boundary. E.g. if now is 14:35, returns 15 */
function getNextFullHour(): number {
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  return m >= 1 ? h + 1 : h
}

function getMinSlotHour(date: Date): number {
  if (isToday(date)) {
    return Math.max(SLOT_START, getNextFullHour())
  }
  return SLOT_START
}

function generateHourSlots(): string[] {
  const slots: string[] = []
  for (let h = SLOT_START; h < SLOT_END; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
  }
  return slots
}

function formatHour(slot: string): string {
  const [h] = slot.split(':').map(Number)
  if (h === 0 || h === 12) return `${h === 0 ? 12 : 12}:00 ${h === 0 ? 'AM' : 'PM'}`
  if (h < 12) return `${h}:00 AM`
  return `${h - 12}:00 PM`
}

function getRefCode(bookingId: string): string {
  const hash = bookingId.slice(-8).toUpperCase()
  return `CRE-${hash.slice(0, 4)}-${hash.slice(4)}`
}

/** Calculate price for a 1-hour slot using a pricing schedule */
function calcSlotPrice(schedule: PricingScheduleItem[], slot: string): number {
  const hour = parseInt(slot.split(':')[0], 10)
  if (schedule.length > 0) {
    for (const tier of schedule) {
      if (hour >= tier.startHour && hour < tier.endHour) return tier.pricePerHour
    }
  }
  return 0
}

// ── Component ──

export default function UnifiedBookingView() {
  const {
    user,
    selectedDate,
    selectedCourtIds,
    selectedTimeSlots,
    setSelectedDate,
    addSelectedCourtId,
    removeSelectedCourtId,
    clearSelectedCourtIds,
    setSelectedTimeSlots,
    toggleTimeSlot,
    clearTimeSlots,
    setSelectedTimeSlot,
    setView,
    setSelectedCourt,
    addNotification,
  } = useAppStore()

  const [courts, setCourts] = useState<Court[]>([])
  const [courtsLoading, setCourtsLoading] = useState(true)
  const [bookings, setBookings] = useState<ExistingBooking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [bookingRefs, setBookingRefs] = useState<string[]>([])
  const [createdBookings, setCreatedBookings] = useState<any[]>([])

  const [clientName, setClientName] = useState(user?.name || '')
  const [clientPhone, setClientPhone] = useState(user?.phone || '')
  const [clientEmail, setClientEmail] = useState(user?.email || '')
  const [formStep, setFormStep] = useState<'select' | 'summary' | 'payment' | 'done'>('select')
  const [activePaymentMethod, setActivePaymentMethod] = useState<'yape_qr' | 'culqi'>('yape_qr')

  // Fetch active payment methods from Firebase
  useEffect(() => {
    fetch('/api/payment-methods')
      .then(r => r.json())
      .then(data => {
        if (data.culqi && data.yape_qr) setActivePaymentMethod('yape_qr')
        else if (data.culqi) setActivePaymentMethod('culqi')
        else setActivePaymentMethod('yape_qr')
      })
      .catch(() => setActivePaymentMethod('yape_qr'))
  }, [])

  const dateScrollRef = useRef<HTMLDivElement>(null)

  // ── Derived data ──

  const availableDays = useMemo(() => getNext14Days(), [])

  const bookingDate = useMemo(() => {
    if (!selectedDate) return new Date()
    const parts = selectedDate.split('-')
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
  }, [selectedDate])

  const allSlots = useMemo(() => generateHourSlots(), [])
  const minHour = useMemo(() => getMinSlotHour(bookingDate), [bookingDate])

  const visibleSlots = useMemo(
    () => allSlots.filter((s) => parseInt(s.split(':')[0], 10) >= minHour),
    [allSlots, minHour]
  )

  // Courts grouped by sport
  const courtsBySport = useMemo(() => {
    const groups: Record<string, Court[]> = {}
    for (const c of courts) {
      const sport = c.sport || 'otros'
      if (!groups[sport]) groups[sport] = []
      groups[sport].push(c)
    }
    return groups
  }, [courts])

  // ── Availability map: "courtId:HH:00" → true if occupied ──

  const occupiedMap = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const b of bookings) {
      if (b.status === 'cancelled') continue
      const courtIds: string[] = Array.isArray(b.court_ids) ? b.court_ids : (b.court_id ? [b.court_id] : [])
      const startH = parseInt((b.start_time || '').split(':')[0] || '0', 10)
      const endH = parseInt((b.end_time || '').split(':')[0] || '0', 10)
      for (const cId of courtIds) {
        for (let h = startH; h < endH; h++) {
          const key = `${cId}:${String(h).padStart(2, '0')}:00`
          map.set(key, true)
        }
      }
    }
    return map
  }, [bookings])

  // ── Slot status for a specific court ──

  function getSlotStatus(courtId: string, slot: string): 'available' | 'occupied' | 'selected' | 'past' {
    const hour = parseInt(slot.split(':')[0], 10)
    if (hour < minHour) return 'past'
    if (selectedTimeSlots.includes(slot)) return 'selected'
    if (occupiedMap.has(`${courtId}:${slot}`)) return 'occupied'
    return 'available'
  }

  // ── For unified grid: slot is available only if ALL selected courts are free ──

  function getUnifiedSlotStatus(slot: string): 'available' | 'occupied' | 'selected' | 'past' {
    const hour = parseInt(slot.split(':')[0], 10)
    if (hour < minHour) return 'past'
    if (selectedTimeSlots.includes(slot)) return 'selected'
    if (selectedCourtIds.length === 0) return 'available'
    for (const cId of selectedCourtIds) {
      if (occupiedMap.has(`${cId}:${slot}`)) return 'occupied'
    }
    return 'available'
  }

  // ── Price calculation ──

  const pricingBreakdown = useMemo(() => {
    const items: Array<{ courtId: string; courtName: string; slot: string; price: number }> = []
    for (const cId of selectedCourtIds) {
      const court = courts.find((c) => c.id === cId)
      if (!court) continue
      for (const slot of selectedTimeSlots) {
        const price = calcSlotPrice(court.pricingSchedule || [], slot) || court.pricePerHour
        items.push({ courtId: cId, courtName: court.name, slot, price })
      }
    }
    return items
  }, [selectedCourtIds, selectedTimeSlots, courts])

  const totalPrice = useMemo(
    () => pricingBreakdown.reduce((sum, item) => sum + item.price, 0),
    [pricingBreakdown]
  )
  const advanceAmount = Math.round(totalPrice * 50) / 100
  const remainingAmount = Math.round((totalPrice - advanceAmount) * 100) / 100

  const totalSlots = selectedTimeSlots.length
  const totalCourts = selectedCourtIds.length
  const totalItems = totalCourts * totalSlots

  // ── Fetch courts ──

  useEffect(() => {
    let cancelled = false
    setCourtsLoading(true)
    fetch('/api/courts')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : (data.courts || [])
        setCourts(list)
        setCourtsLoading(false)
      })
      .catch(() => {
        if (!cancelled) setCourtsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // ── Fetch bookings for selected date ──

  useEffect(() => {
    if (!selectedDate) return
    let cancelled = false
    setBookingsLoading(true)
    fetch(`/api/bookings?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : (data.bookings || [])
        setBookings(list)
        setBookingsLoading(false)
      })
      .catch(() => {
        if (!cancelled) setBookingsLoading(false)
      })
    return () => { cancelled = true }
  }, [selectedDate])

  // ── Auto-select today if no date ──

  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(formatDateISO(new Date()))
    }
  }, [selectedDate, setSelectedDate])

  // ── Pre-fill user info ──

  useEffect(() => {
    if (user) {
      setClientName(user.name || '')
      setClientEmail(user.email || '')
      setClientPhone(user.phone || '')
    }
  }, [user])

  // ── Handlers ──

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(formatDateISO(date))
    clearTimeSlots()
  }, [setSelectedDate, clearTimeSlots])

  const handleCourtToggle = useCallback((courtId: string) => {
    if (selectedCourtIds.includes(courtId)) {
      removeSelectedCourtId(courtId)
    } else {
      addSelectedCourtId(courtId)
    }
  }, [selectedCourtIds, addSelectedCourtId, removeSelectedCourtId])

  const handleSlotToggle = (slot: string) => {
    // If clicking a selected slot, deselect it
    if (selectedTimeSlots.includes(slot)) {
      setSelectedTimeSlots(selectedTimeSlots.filter((s) => s !== slot))
      return
    }
    // If no slots selected yet, just select this one
    if (selectedTimeSlots.length === 0) {
      setSelectedTimeSlots([slot])
      return
    }
    // Range selection: fill all slots between first selected and clicked slot
    const sorted = [...selectedTimeSlots].sort()
    const firstH = parseInt(sorted[0].split(':')[0], 10)
    const clickH = parseInt(slot.split(':')[0], 10)
    const lo = Math.min(firstH, clickH)
    const hi = Math.max(firstH, clickH)
    const rangeSlots: string[] = []
    for (let h = lo; h <= hi; h++) {
      const s = `${String(h).padStart(2, '0')}:00`
      // Skip occupied and past slots
      if (h < minHour) continue
      let isOccupied = false
      for (const cId of selectedCourtIds) {
        if (occupiedMap.has(`${cId}:${s}`)) { isOccupied = true; break }
      }
      if (!isOccupied) rangeSlots.push(s)
    }
    // Merge with existing selections
    const merged = new Set([...selectedTimeSlots, ...rangeSlots])
    setSelectedTimeSlots([...merged].sort())
  }

  const handleProceed = useCallback(() => {
    if (selectedCourtIds.length === 0) {
      toast({ title: 'Selecciona canchas', description: 'Debes seleccionar al menos una cancha.', variant: 'destructive' })
      return
    }
    if (selectedTimeSlots.length === 0) {
      toast({ title: 'Selecciona horarios', description: 'Debes seleccionar al menos un horario.', variant: 'destructive' })
      return
    }
    if (!user?.id) {
      toast({ title: 'Inicia sesión', description: 'Debes iniciar sesión para reservar.', variant: 'destructive' })
      setView('login')
      return
    }
    setFormStep('summary')
  }, [selectedCourtIds, selectedTimeSlots, user, setView])

  // ── Submit: create one booking per time slot ──

  const handleSubmit = useCallback(async () => {
    if (!user?.id || !selectedDate || selectedCourtIds.length === 0 || selectedTimeSlots.length === 0) return
    if (!clientName.trim() || !clientPhone.trim()) {
      toast({ title: 'Datos incompletos', description: 'Nombre y teléfono son requeridos.', variant: 'destructive' })
      return
    }

    setSubmitting(true)

    try {
      // Sort slots for consistent time range
      const sortedSlots = [...selectedTimeSlots].sort()
      const startTime = sortedSlots[0]
      const lastH = parseInt(sortedSlots[sortedSlots.length - 1].split(':')[0], 10)
      const endTime = `${String(lastH + 1).padStart(2, '0')}:00`

      // Calculate total price from all courts × all slots
      let calcTotal = 0
      for (const cId of selectedCourtIds) {
        const court = courts.find((c) => c.id === cId)
        if (!court) continue
        for (const slot of sortedSlots) {
          calcTotal += calcSlotPrice(court.pricingSchedule || [], slot) || court.pricePerHour
        }
      }

      const adv = Math.round(calcTotal * 50) / 100
      const rem = Math.round((calcTotal - adv) * 100) / 100

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          courtIds: selectedCourtIds,
          userId: user.id,
          date: selectedDate,
          startTime,
          endTime,
          totalPrice: calcTotal,
          advanceAmount: adv,
          remainingAmount: rem,
          status: 'reserved',
          paymentMethod: activePaymentMethod === 'yape_qr' ? 'Yape QR' : 'culqi',
          selectedSlots: sortedSlots,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 409) {
          toast({
            title: 'Horarios ya no disponibles',
            description: data.error || 'Algunos de los horarios seleccionados fueron reservados por otra persona. Por favor, vuelve a seleccionar.',
            variant: 'destructive',
          })
          // Refresh bookings to show updated availability
          const bookRes = await fetch(`/api/bookings?date=${selectedDate}`)
          const bookData = await bookRes.json()
          const list = Array.isArray(bookData) ? bookData : (bookData.bookings || [])
          setBookings(list)
          setFormStep('select')
        } else {
          toast({ title: 'Error al crear reserva', description: data.error || 'Intenta nuevamente.', variant: 'destructive' })
        }
        setSubmitting(false)
        return
      }

      const booking = await res.json()
      setCreatedBookings([booking])
      setBookingRefs([getRefCode(booking.id)])
      setFormStep('payment')
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear la reserva. Verifica tu conexión.', variant: 'destructive' })
    }

    setSubmitting(false)
  }, [user, selectedDate, selectedCourtIds, selectedTimeSlots, courts, clientName, clientPhone, setView, addNotification, clearSelectedCourtIds])

  const handlePaymentSuccess = useCallback(() => {
    setFormStep('done')
    setSuccess(true)
    const courtNames = selectedCourtIds
      .map((id) => courts.find((c) => c.id === id)?.name || id)
      .join(', ')
    addNotification({
      title: 'Reserva confirmada',
      message: `${totalCourts} cancha${totalCourts > 1 ? 's' : ''}: ${courtNames} — ${bookingDate.toLocaleDateString('es', { day: 'numeric', month: 'short' })} · ${totalSlots}h · Ref: ${bookingRefs.join(', ')}`,
      type: 'success',
    })
  }, [courts, selectedCourtIds, totalCourts, bookingDate, totalSlots, bookingRefs, addNotification])

  const handlePaymentError = useCallback((error: string) => {
    toast({ title: 'Error en el pago', description: error, variant: 'destructive' })
  }, [])

  const handleBack = useCallback(() => {
    if (formStep === 'payment') { setFormStep('summary'); return }
    if (formStep === 'summary') { setFormStep('select'); return }
    if (success) {
      clearTimeSlots()
      clearSelectedCourtIds()
      setSelectedCourt(null)
      setSelectedDate(null)
      setView('bookings')
    } else {
      clearTimeSlots()
      clearSelectedCourtIds()
      setSelectedCourt(null)
      setView('home')
    }
  }, [formStep, success, clearTimeSlots, clearSelectedCourtIds, setSelectedCourt, setSelectedDate, setView])

  // ── Render ──

  // Loading state
  if (courtsLoading) {
    return (
      <div className="min-h-screen bg-cm-background">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-cm-surface-container-highest rounded w-48" />
            <div className="h-12 bg-cm-surface-container-highest rounded-xl" />
            <div className="h-64 bg-cm-surface-container-highest rounded-xl" />
            <div className="h-48 bg-cm-surface-container-highest rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'tween', duration: 0.3 }}
      className="min-h-screen bg-cm-background"
    >
      {/* ═══ HEADER ═══ */}
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-2">
        <div className="flex items-center gap-3">
          <button type="button" onClick={handleBack}
            className="p-2 rounded-full bg-cm-surface-container-highest/60 text-cm-on-surface-variant hover:text-cm-on-surface transition-colors">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 className="font-[family-name:var(--font-sora)] text-xl font-bold text-cm-on-surface">
              {formStep === 'select' && 'Reservar Cancha'}
              {formStep === 'summary' && 'Confirmar Reserva'}
              {formStep === 'payment' && 'Pagar Adelanto'}
              {formStep === 'done' && 'Reserva Confirmada'}
            </h1>
            <p className="text-cm-on-surface-variant text-xs font-[family-name:var(--font-inter)]">
              {formStep === 'select' && 'Selecciona canchas y horarios en un solo lugar'}
              {formStep === 'summary' && 'Verifica los detalles antes de pagar'}
              {formStep === 'payment' && `Ref: ${bookingRefs.join(', ')}`}
              {formStep === 'done' && 'Tu reserva ha sido registrada exitosamente'}
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
      {/* ═══ STEP 1: SELECT COURTS & SLOTS ═══ */}
      {formStep === 'select' && (
        <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="max-w-2xl mx-auto px-4 pb-40">

          {/* ── Date Picker ── */}
          <div className="mb-5">
            <h2 className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-2.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#00ff41]">calendar_month</span>
              Fecha
            </h2>
            <div ref={dateScrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
              {availableDays.map((day) => {
                const iso = formatDateISO(day)
                const isActive = selectedDate === iso
                const isTodayDate = isToday(day)
                return (
                  <button key={iso} type="button" onClick={() => handleDateSelect(day)}
                    className={`flex-shrink-0 w-[72px] py-2.5 rounded-xl text-center transition-all duration-200 border ${
                      isActive
                        ? 'bg-[#00ff41]/15 border-[#00ff41]/40 shadow-[0_0_15px_rgba(0,255,65,0.1)]'
                        : 'bg-cm-surface-container-highest/40 border-transparent hover:border-white/10'
                    }`}>
                    <p className={`text-[10px] font-[family-name:var(--font-inter)] ${isActive ? 'text-[#00ff41] font-semibold' : 'text-cm-on-surface-variant'}`}>
                      {DAYS_ES[day.getDay()]}
                    </p>
                    <p className={`text-lg font-bold font-[family-name:var(--font-sora)] leading-tight ${isActive ? 'text-[#00ff41]' : 'text-cm-on-surface'}`}>
                      {day.getDate()}
                    </p>
                    <p className={`text-[10px] font-[family-name:var(--font-inter)] ${isActive ? 'text-[#00ff41]/70' : 'text-cm-on-surface-variant/60'}`}>
                      {MONTHS_ES[day.getMonth()]}
                    </p>
                    {isTodayDate && (
                      <span className="block mt-0.5 text-[8px] font-bold text-[#00ff41] font-[family-name:var(--font-inter)]">HOY</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Court Selector ── */}
          <div className="mb-5">
            <h2 className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-4 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-cm-primary" style={{ fontVariationSettings: '"FILL" 1' }}>sports</span>
              Selecciona Canchas
              {selectedCourtIds.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-cm-primary/15 text-cm-primary text-[10px] font-bold font-[family-name:var(--font-inter)]">
                  {selectedCourtIds.length} seleccionada{selectedCourtIds.length > 1 ? 's' : ''}
                </span>
              )}
            </h2>
            <div className="space-y-6">
              {Object.entries(courtsBySport).map(([sport, sportCourts]) => {
                const cfg = sportConfig[sport] || { label: sport, icon: 'sports' }
                const isFutbol = sport === 'futbol'
                const surfaceLabel = isFutbol ? 'Sint\u00e9tico Premium' : 'Piso Flotante'
                return (
                  <section key={sport} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-[18px] ${isFutbol ? 'text-cm-primary' : 'text-[#b4c5ff]'}`}>{cfg.icon}</span>
                        <h3 className={`text-[11px] font-bold uppercase tracking-widest font-[family-name:var(--font-inter)] ${isFutbol ? 'text-cm-primary' : 'text-[#b4c5ff]'}`}>
                          Canchas de {cfg.label}
                        </h3>
                      </div>
                      <span className="text-[10px] text-cm-on-surface-variant bg-cm-surface-container-highest/60 px-2.5 py-0.5 rounded-full font-[family-name:var(--font-inter)]">
                        {surfaceLabel}
                      </span>
                    </div>
                    <div className={`grid gap-5 ${isFutbol && sportCourts.length > 2 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'}`}>
                      {sportCourts.map((court) => {
                        const isSelected = selectedCourtIds.includes(court.id)
                        const schedule = court.pricingSchedule || []
                        const uniquePrices = [...new Set(schedule.length > 0 ? schedule.map((s: PricingScheduleItem) => s.pricePerHour) : [court.pricePerHour])]
                        const dayPrice = Math.min(...uniquePrices)
                        const nightPrice = Math.max(...uniquePrices)
                        const singlePrice = uniquePrices.length === 1
                        const accentBorder = isFutbol
                          ? isSelected ? 'border-cm-primary/60' : 'border-[#3d4a42]'
                          : isSelected ? 'border-[#b4c5ff]/60' : 'border-[#3d4a42]'
                        const accentBg = isFutbol
                          ? isSelected ? 'bg-[#1b211d]' : 'bg-[#171d19]'
                          : isSelected ? 'bg-[#1b1d21]' : 'bg-[#171d19]'
                        const accentShadow = isFutbol
                          ? isSelected ? 'shadow-[0_0_0_1px_#68dba9]' : ''
                          : isSelected ? 'shadow-[0_0_0_1px_#b4c5ff]' : ''
                        const accentText = isFutbol
                          ? isSelected ? 'text-cm-primary' : 'text-cm-on-surface'
                          : isSelected ? 'text-[#b4c5ff]' : 'text-cm-on-surface'
                        const hoverBorder = isFutbol
                          ? 'hover:border-cm-primary/50'
                          : 'hover:border-[#b4c5ff]/50'
                        return (
                          <button key={court.id} type="button" onClick={() => handleCourtToggle(court.id)}
                            className={`group relative w-full flex flex-col p-3 rounded-xl border transition-all duration-300 text-left active:scale-[0.97] ${accentBg} ${accentBorder} ${accentShadow} ${hoverBorder}`}>
                            <div className={`w-full ${isFutbol ? 'aspect-[16/10]' : 'aspect-[21/9]'} rounded-lg relative overflow-hidden mb-3 border border-white/10 ${
                              isFutbol ? '' : ''
                            }`} style={{
                              background: isFutbol
                                ? 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)'
                                : 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
                              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.3)'
                            }}>
                              {isFutbol ? (
                                <>
                                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/20" />
                                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 border border-white/20 rounded-full" />
                                  <div className="absolute left-0 top-1/4 h-1/2 w-3 border-r border-y border-white/20" />
                                  <div className="absolute right-0 top-1/4 h-1/2 w-3 border-l border-y border-white/20" />
                                </>
                              ) : (
                                <>
                                  <div className="absolute inset-2 border border-white/20" />
                                  <div className="absolute inset-x-2 top-[30%] h-[40%] border-y border-white/10" />
                                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-white/40 shadow-sm z-10" />
                                </>
                              )}
                            </div>
                            {isFutbol ? (
                              <div className="w-full space-y-1">
                                <div className="flex justify-between items-start">
                                  <span className={`text-sm font-bold font-[family-name:var(--font-sora)] ${accentText}`}>{court.name}</span>
                                  <span className={`w-2 h-2 rounded-full mt-2 ${isFutbol ? 'bg-cm-primary' : 'bg-[#b4c5ff]'}`} />
                                </div>
                                <p className={`text-[11px] ${isFutbol ? 'text-cm-primary' : 'text-cm-primary'} font-medium font-[family-name:var(--font-inter)]`}>Disponible</p>
                                <div className="flex flex-col gap-1 mt-1">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="4" fill="#fbbf24"/><g stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"><line x1="10" y1="1" x2="10" y2="3"/><line x1="10" y1="17" x2="10" y2="19"/><line x1="1" y1="10" x2="3" y2="10"/><line x1="17" y1="10" x2="19" y2="10"/><line x1="3.5" y1="3.5" x2="5" y2="5"/><line x1="15" y1="15" x2="16.5" y2="16.5"/><line x1="3.5" y1="16.5" x2="5" y2="15"/><line x1="15" y1="5" x2="16.5" y2="3.5"/></g></svg>
                                    <span className="text-[13px] font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">S/ {dayPrice}</span>
                                  </div>
                                  {!singlePrice && (
                                    <div className="flex items-center gap-2">
                                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none"><path d="M17.3 12.3A7.5 7.5 0 016.7 2.7 7.5 7.5 0 1017.3 12.3z" fill="#818cf8"/></svg>
                                      <span className="text-[13px] font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">S/ {nightPrice}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="w-full flex justify-between items-center">
                                <div>
                                  <span className={`text-sm font-bold font-[family-name:var(--font-sora)] ${accentText}`}>{court.name}</span>
                                  <p className="text-[11px] text-cm-primary font-medium font-[family-name:var(--font-inter)]">Disponible</p>
                                </div>
                                <div className="flex flex-col items-end gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="4" fill="#fbbf24"/><g stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"><line x1="10" y1="1" x2="10" y2="3"/><line x1="10" y1="17" x2="10" y2="19"/><line x1="1" y1="10" x2="3" y2="10"/><line x1="17" y1="10" x2="19" y2="10"/><line x1="3.5" y1="3.5" x2="5" y2="5"/><line x1="15" y1="15" x2="16.5" y2="16.5"/><line x1="3.5" y1="16.5" x2="5" y2="15"/><line x1="15" y1="5" x2="16.5" y2="3.5"/></g></svg>
                                    <span className="text-[13px] font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">S/ {dayPrice}</span>
                                  </div>
                                  {!singlePrice && (
                                    <div className="flex items-center gap-1.5">
                                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none"><path d="M17.3 12.3A7.5 7.5 0 016.7 2.7 7.5 7.5 0 1017.3 12.3z" fill="#818cf8"/></svg>
                                      <span className="text-[13px] font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">S/ {nightPrice}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
          {/* ── Time Slot Grid ── */}
          {selectedCourtIds.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-cm-primary text-[18px]">schedule</span>
                  <h2 className="text-[13px] font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">Horarios Disponibles</h2>
                  {bookingsLoading && (
                    <span className="material-symbols-outlined text-[14px] animate-spin text-cm-on-surface-variant">progress_activity</span>
                  )}
                </div>
                <span className="text-[10px] font-bold px-3 py-1 bg-cm-primary/10 text-cm-primary rounded-full font-[family-name:var(--font-inter)] truncate max-w-[180px]">
                  {selectedCourtIds.map((id) => courts.find((c) => c.id === id)?.name || id).join(', ')}
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] text-cm-on-surface-variant font-medium uppercase tracking-wider font-[family-name:var(--font-inter)]">
                  {isToday(bookingDate) ? 'Hoy, ' : ''}{bookingDate.getDate()} de {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][bookingDate.getMonth()]}
                </p>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {visibleSlots.map((slot) => {
                    const status = getUnifiedSlotStatus(slot)
                    const hour = parseInt(slot.split(':')[0], 10)
                    const nextHour = `${String(hour + 1).padStart(2, '0')}:00`
                    let chipClass = 'bg-white/10 backdrop-blur-md text-cm-on-surface font-medium border border-white/20 hover:bg-white/20 shadow-sm'
                    let clickAllowed = true
                    if (status === 'selected') {
                      chipClass = 'bg-cm-primary text-cm-on-primary border-cm-primary shadow-lg shadow-cm-primary/20'
                    } else if (status === 'occupied') {
                      chipClass = 'bg-white/5 backdrop-blur-sm text-cm-on-surface-variant font-medium border border-white/10 opacity-40 cursor-not-allowed'
                      clickAllowed = false
                    } else if (status === 'past') {
                      chipClass = 'bg-white/[0.02] text-cm-on-surface-variant/20 border border-transparent cursor-not-allowed'
                      clickAllowed = false
                    }
                    return (
                      <button key={slot} type="button" disabled={!clickAllowed}
                        onClick={() => handleSlotToggle(slot)}
                        className={`py-3 px-2 rounded-lg border transition-all duration-200 text-center text-[13px] font-[family-name:var(--font-sora)] ${chipClass} ${clickAllowed ? 'active:scale-95' : ''}`}>
                        {slot} - {nextHour}
                      </button>
                    )
                  })}
                </div>
              </div>
              {selectedTimeSlots.length > 0 && (
                <button type="button" onClick={clearTimeSlots}
                  className="mt-3 text-[11px] text-cm-on-surface-variant/60 hover:text-cm-error font-[family-name:var(--font-inter)] transition-colors">
                  Limpiar selección
                </button>
              )}
            </div>
          )}
          {/* ── Empty state: no courts selected ── */}
          {selectedCourtIds.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-symbols-outlined text-[48px] text-cm-on-surface-variant/20 mb-3">sports</span>
              <p className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                Selecciona al menos una cancha para ver los horarios disponibles
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* ═══ STEP 2: SUMMARY ═══ */}
      {formStep === 'summary' && (
        <motion.div key="summary" initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '-100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          className="max-w-2xl mx-auto px-4 pb-40">

          {/* Courts & Slots Summary */}
          <div className="glass-card rounded-2xl p-4 mb-4">
            <h3 className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#00ff41]">sports</span>
              {totalCourts} cancha{totalCourts > 1 ? 's' : ''} x {totalSlots} hora{totalSlots > 1 ? 's' : ''} = {totalItems} bloque{totalItems > 1 ? 's' : ''}
            </h3>
            <div className="space-y-2">
              {selectedCourtIds.map((cId) => {
                const court = courts.find((c) => c.id === cId)
                if (!court) return null
                const cfg = sportConfig[court.sport] || { icon: 'sports', label: court.sport }
                const courtSlots = selectedTimeSlots.sort()
                const courtTotal = pricingBreakdown
                  .filter((p) => p.courtId === cId)
                  .reduce((s, p) => s + p.price, 0)
                return (
                  <div key={cId} className="bg-cm-surface-container-highest/30 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-[20px] text-[#00ff41]">{cfg.icon}</span>
                      <span className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">{court.name}</span>
                      <span className="ml-auto text-sm font-bold text-[#00ff41] font-[family-name:var(--font-sora)]">S/ {courtTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {courtSlots.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-400 font-[family-name:var(--font-inter)] font-medium">
                          {formatHour(s)}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Date & Time Info */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="glass-card rounded-xl p-3">
              <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-0.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">calendar_month</span> Fecha
              </p>
              <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)] capitalize">
                {bookingDate.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="glass-card rounded-xl p-3">
              <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-0.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">schedule</span> Horario
              </p>
              <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                {[...selectedTimeSlots].sort()[0]} - {String(parseInt([...selectedTimeSlots].sort().pop() || '0') + 1).padStart(2, '0')}:00
              </p>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="glass-card rounded-2xl p-4 mb-4">
            <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-sm mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00ff41] text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>receipt_long</span>
              Resumen de Pago
            </h2>
            <div className="space-y-2">
              {selectedCourtIds.map((cId) => {
                const court = courts.find((c) => c.id === cId)
                if (!court) return null
                const courtTotal = pricingBreakdown.filter((p) => p.courtId === cId).reduce((s, p) => s + p.price, 0)
                return (
                  <div key={cId} className="flex items-center justify-between">
                    <span className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{court.name} ({totalSlots}h)</span>
                    <span className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">S/ {courtTotal.toFixed(2)}</span>
                  </div>
                )
              })}
              <div className="border-t border-dashed border-white/10 pt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Adelanto 50%</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#00ff41]/15 text-[#00ff41] border border-[#00ff41]/30 font-[family-name:var(--font-inter)]">REQUERIDO</span>
                </div>
                <span className="text-sm font-bold text-[#00ff41] font-[family-name:var(--font-sora)]">S/ {advanceAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-dashed border-white/10 pt-2 flex items-center justify-between">
                <span className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Pago restante (en el local)</span>
                <span className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">S/ {remainingAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-white/5 pt-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">Total</span>
                <span className="text-lg font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">S/ {totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="glass-card rounded-2xl p-4 mb-4">
            <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-sm mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00ff41] text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>person</span>
              Datos de contacto
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-cm-on-surface-variant mb-1 block font-[family-name:var(--font-inter)]">Nombre completo <span className="text-red-400">*</span></label>
                <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Tu nombre"
                  className="w-full px-3 py-2.5 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm placeholder:text-cm-on-surface-variant/40 focus:outline-none focus:border-[#00ff41]/50 transition-colors font-[family-name:var(--font-inter)]" />
              </div>
              <div>
                <label className="text-xs text-cm-on-surface-variant mb-1 block font-[family-name:var(--font-inter)]">Email</label>
                <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="tu@email.com"
                  className="w-full px-3 py-2.5 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm placeholder:text-cm-on-surface-variant/40 focus:outline-none focus:border-[#00ff41]/50 transition-colors font-[family-name:var(--font-inter)]" />
              </div>
              <div>
                <label className="text-xs text-cm-on-surface-variant mb-1 block font-[family-name:var(--font-inter)]">Teléfono <span className="text-red-400">*</span></label>
                <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+51 999 999 999"
                  className="w-full px-3 py-2.5 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm placeholder:text-cm-on-surface-variant/40 focus:outline-none focus:border-[#00ff41]/50 transition-colors font-[family-name:var(--font-inter)]" />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ STEP 3: PAYMENT ═══ */}
      {formStep === 'payment' && !success && createdBookings.length > 0 && (
        <motion.div key="payment" initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '-100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          className="max-w-2xl mx-auto px-4 pb-40">

          {/* Booking summary card */}
          <div className="glass-card rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#00ff41]/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[#00ff41] text-[22px]">sports</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                  {totalCourts} cancha{totalCourts > 1 ? 's' : ''} · {bookingDate.toLocaleDateString('es', { day: 'numeric', month: 'short' })} · {totalSlots}h
                </p>
                <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                  {selectedTimeSlots.sort().map(formatHour).join(', ')}
                </p>
              </div>
              <p className="text-base font-bold text-[#00ff41] font-[family-name:var(--font-sora)]">S/ {advanceAmount.toFixed(2)}</p>
            </div>
            <div className="bg-cm-surface-container-highest/40 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Adelanto 50% requerido</p>
              <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Restante S/ {remainingAmount.toFixed(2)} se paga en el local</p>
            </div>
          </div>

          <YapeQRPayButton
            bookingIds={createdBookings.map((b: any) => b.id)}
            amount={advanceAmount}
            userEmail={clientEmail || user?.email || ''}
            onPaymentMarked={() => {
              setFormStep('done')
            }}
            onBack={() => setFormStep('summary')}
          />
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="material-symbols-outlined text-[16px] text-cm-on-surface-variant/40" style={{ fontVariationSettings: '"FILL" 1' }}>lock</span>
            <span className="text-[10px] text-cm-on-surface-variant/40 font-[family-name:var(--font-inter)]">
              Pago seguro mediante Yape
            </span>
          </div>
        </motion.div>
      )}

      {/* ═══ STEP 4: SUCCESS ═══ */}
      {formStep === 'done' && success && (
        <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4 }}
          className="max-w-lg mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[80vh]">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
            className="w-24 h-24 rounded-full bg-[#00ff41]/10 border-2 border-[#00ff41]/30 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-[#00ff41] text-[48px]" style={{ fontVariationSettings: '"FILL" 1' }}>{activePaymentMethod === "yape_qr" ? "hourglass_top" : "check_circle"}</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center mb-8">
            <h2 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-cm-on-surface mb-2">{activePaymentMethod === "yape_qr" ? "Pago Registrado" : "Reserva Confirmada"}</h2>
            <p className="text-cm-on-surface-variant text-sm font-[family-name:var(--font-inter)]">{activePaymentMethod === "yape_qr" ? "Tu reserva queda pendiente de validación. Recibirás una notificación cuando se confirme." : "Tu reserva ha sido registrada exitosamente"}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="w-full glass-card rounded-2xl p-5 mb-6">
            <div className="text-center mb-4 pb-4 border-b border-dashed border-white/10">
              <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1">Referencia de reserva</p>
              <p className="font-mono text-xl font-bold text-[#00ff41] tracking-wider">{bookingRefs.join(' ')}</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#00ff41]/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#00ff41] text-[20px]">sports</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                    {selectedCourtIds.map((id) => courts.find((c) => c.id === id)?.name || id).join(', ')}
                  </p>
                  <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                    {totalCourts} cancha{totalCourts > 1 ? 's' : ''} · {totalSlots} hora{totalSlots > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-cm-surface-container-highest/40 rounded-lg p-3">
                  <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-0.5">Fecha</p>
                  <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)] capitalize">
                    {bookingDate.toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="bg-cm-surface-container-highest/40 rounded-lg p-3">
                  <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-0.5">Horario</p>
                  <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                    {selectedTimeSlots.length > 0 ? `${[...selectedTimeSlots].sort()[0]} - ${String(parseInt([...selectedTimeSlots].sort().pop() || '0') + 1).padStart(2, '0')}:00` : '-'}
                  </p>
                </div>
              </div>
              <div className="bg-[#00ff41]/5 border border-[#00ff41]/20 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-cm-on-surface-variant font-medium">{activePaymentMethod === "yape_qr" ? "⏳ Pago pendiente de validación" : "✔ Adelanto pagado"}</span>
                  <span className={activePaymentMethod === "yape_qr" ? "text-sm font-bold text-amber-400" : "text-sm font-bold text-[#00ff41]"}>S/ {advanceAmount.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mt-1">
                  Pago restante: S/ {remainingAmount.toFixed(2)} (en el local)
                </p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="w-full space-y-3">
            <button type="button" onClick={handleBack}
              className="w-full py-3.5 bg-[#00ff41] text-[#003907] font-semibold rounded-xl hover:bg-[#00e639] transition-all glow-accent font-[family-name:var(--font-sora)] flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px]">bookmark</span> Ver Mis Reservas
            </button>
            <button type="button" onClick={() => { clearTimeSlots(); clearSelectedCourtIds(); setSelectedCourt(null); setView('home') }}
              className="w-full py-3 text-cm-on-surface-variant text-sm font-medium font-[family-name:var(--font-inter)] hover:text-cm-on-surface transition-colors">
              Hacer otra reserva
            </button>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ═══ BOTTOM ACTION BAR ═══ */}
      {formStep === 'select' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-cm-background/95 backdrop-blur-xl border-t border-white/10">
          <div className="max-w-2xl mx-auto p-4">
            {totalItems > 0 ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                      {totalCourts} cancha{totalCourts > 1 ? 's' : ''} x {totalSlots}h
                    </p>
                    <p className="font-[family-name:var(--font-sora)] font-bold text-[#00ff41] text-lg">
                      S/ {totalPrice.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Adelanto 50%</p>
                    <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">S/ {advanceAmount.toFixed(2)}</p>
                  </div>
                </div>
                <button type="button" onClick={handleProceed}
                  className="w-full py-3.5 bg-[#00ff41] text-[#003907] font-semibold rounded-xl hover:bg-[#00e639] transition-all glow-accent font-[family-name:var(--font-sora)] flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>arrow_forward</span>
                  Continuar ({totalItems} bloque{totalItems > 1 ? 's' : ''})
                </button>
              </>
            ) : (
              <div className="text-center py-1">
                <p className="text-xs text-cm-on-surface-variant/60 font-[family-name:var(--font-inter)]">
                  Selecciona canchas y horarios para continuar
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ SUMMARY BOTTOM BAR ═══ */}
      {formStep === 'summary' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-cm-background/95 backdrop-blur-xl border-t border-white/10">
          <div className="max-w-2xl mx-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Adelanto a pagar</p>
                <p className="font-[family-name:var(--font-sora)] font-bold text-[#00ff41] text-lg">S/ {advanceAmount.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] capitalize">
                  {bookingDate.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                  {selectedTimeSlots.length > 0 ? `${[...selectedTimeSlots].sort()[0]} - ${String(parseInt([...selectedTimeSlots].sort().pop() || '0') + 1).padStart(2, '0')}:00` : ''}
                </p>
              </div>
            </div>
            <button type="button" disabled={submitting || !clientName.trim() || !clientPhone.trim()}
              onClick={handleSubmit}
              className="w-full py-3.5 bg-[#00ff41] text-[#003907] font-semibold rounded-xl hover:bg-[#00e639] transition-all glow-accent disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-sora)] flex items-center justify-center gap-2">
              {submitting ? (
                <><span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Creando reserva...</>
              ) : (
                <><span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>verified_payment</span> Confirmar Reserva y Pagar</>
              )}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
