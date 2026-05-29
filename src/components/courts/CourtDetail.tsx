'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { useAppStore, type User } from '@/store/useAppStore'
import { motion, AnimatePresence } from 'framer-motion'
import { getAuthHeaders } from '@/lib/auth-helpers'

/* ───────────── Interfaces ───────────── */

interface PricingScheduleItem {
  label: string
  startHour: number
  endHour: number
  pricePerHour: number
}

interface PricingSchedule {
  morning: { startHour: number; endHour: number; price: number }
  night: { startHour: number; endHour: number; price: number }
}

interface Court {
  id: string
  name: string
  sport: string
  description?: string
  pricePerHour: number
  pricingSchedule?: PricingSchedule | PricingScheduleItem[]
  images: string[]
  amenities: string[]
  branch: { name: string; city: string; address: string }
}

interface BookingInfo {
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
  user?: { id: string; name: string; email: string; phone?: string } | null
}

type AdminSlotStatus =
  | 'available'
  | 'reserved'
  | 'in_play'
  | 'completed'
  | 'blocked'
  | 'expired'
  | 'past'

interface SlotInfo {
  status: AdminSlotStatus
  booking: BookingInfo | null
}

/* ───────────── Constants ───────────── */

const sportLabels: Record<string, string> = {
  futbol: 'Fútbol',
  voley: 'Vóley',
  basket: 'Básquet',
  tenis: 'Tenis',
  eventos: 'Eventos',
  padel: 'Pádel',
}

const sportIcons: Record<string, string> = {
  futbol: 'sports_soccer',
  voley: 'sports_volleyball',
  basket: 'sports_basketball',
  tenis: 'sports_tennis',
  eventos: 'celebration',
  padel: 'sports_tennis',
}

const amenityIcons: Record<string, string> = {
  'Estacionamiento': 'local_parking',
  'Vestuarios': 'wc',
  'Duchas': 'shower',
  'Iluminación': 'light_mode',
  'Césped Sintético': 'grass',
  'Tribunas': 'stadium',
  'Wi-Fi': 'wifi',
  'Cafetería': 'local_cafe',
  'Parqueo': 'local_parking',
  'Bebedero': 'water_drop',
}

const SLOT_START = 8
const SLOT_END = 22

/* ───────────── Helpers ───────────── */

function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = SLOT_START; h <= SLOT_END; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
  }
  return slots
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getDayName(date: Date): string {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  return days[date.getDay()]
}

function getMonthShort(date: Date): string {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return months[date.getMonth()]
}

function getNext7Days(): Date[] {
  const days: Date[] = []
  const now = new Date()
  for (let i = 0; i < 7; i++) {
    days.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i))
  }
  return days
}

function isToday(date: Date): boolean {
  const today = new Date()
  return date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
}

function getCurrentHour(): number {
  return new Date().getHours()
}

function getAdminSlotInfo(
  hour: number,
  bookings: BookingInfo[],
  isTodayDate: boolean,
  currentHour: number
): SlotInfo {
  const booking = bookings.find((b) => {
    const sh = parseInt(b.startTime.split(':')[0], 10)
    const eh = parseInt(b.endTime.split(':')[0], 10)
    return hour >= sh && hour < eh
  })

  if (!booking) {
    if (isTodayDate && hour <= currentHour) {
      return { status: 'past', booking: null }
    }
    return { status: 'available', booking: null }
  }

  if (booking.status === 'cancelled') return { status: 'blocked', booking }
  if (booking.status === 'completed') return { status: 'completed', booking }

  // Active: reserved
  if (isTodayDate && hour === currentHour) return { status: 'in_play', booking }
  return { status: 'reserved', booking }
}

const adminStatusConfig: Record<
  AdminSlotStatus,
  { label: string; bgClass: string; textClass: string; borderClass: string; icon?: string }
> = {
  available: {
    label: 'Disponible',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
    icon: 'check_circle',
  },
  reserved: {
    label: 'Reservado',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
    icon: 'bookmark',
  },
  in_play: {
    label: 'En juego',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/30',
    icon: 'sports',
  },
  completed: {
    label: 'Finalizado',
    bgClass: 'bg-zinc-500/10',
    textClass: 'text-zinc-400',
    borderClass: 'border-zinc-500/30',
    icon: 'task_alt',
  },
  blocked: {
    label: 'Bloqueado',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30',
    icon: 'block',
  },
  expired: {
    label: 'Vencido',
    bgClass: 'bg-zinc-700/20',
    textClass: 'text-zinc-500',
    borderClass: 'border-zinc-600/30',
    icon: 'schedule',
  },
  past: {
    label: 'Pasado',
    bgClass: 'bg-cm-surface-container-highest/20',
    textClass: 'text-cm-on-surface-variant/30',
    borderClass: 'border-transparent',
  },
}

function normalizeSchedule(schedule: Court['pricingSchedule']): PricingScheduleItem[] {
  if (!schedule) return []
  if (Array.isArray(schedule)) return schedule
  // Legacy { morning, night } object format
  const { morning, night } = schedule as PricingSchedule
  return [
    { label: 'Mañana', startHour: morning.startHour, endHour: morning.endHour, pricePerHour: morning.price },
    { label: 'Noche', startHour: night.startHour, endHour: night.endHour, pricePerHour: night.price },
  ]
}

function getMinPrice(court: Court): number {
  const items = normalizeSchedule(court.pricingSchedule)
  if (items.length > 0) {
    return Math.min(...items.map(s => s.pricePerHour))
  }
  return court.pricePerHour
}

function getPriceForHour(court: Court, hour: number): number {
  const items = normalizeSchedule(court.pricingSchedule)
  for (const slot of items) {
    if (hour >= slot.startHour && hour < slot.endHour) return slot.pricePerHour
  }
  return court.pricePerHour
}

/* ───────────── Component ───────────── */

export default function CourtDetail() {
  const {
    selectedCourtId,
    selectedCourtIds,
    user,
    setView,
    setSelectedCourt,
    setSelectedCourtIds,
    addSelectedCourtId,
    removeSelectedCourtId,
    setSelectedDate,
    setSelectedTimeSlot,
  } = useAppStore()

  const [court, setCourt] = useState<Court | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDateState] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [bookings, setBookings] = useState<BookingInfo[]>([])
  const [activeImageIdx, setActiveImageIdx] = useState(0)

  // Admin booking popup
  const [popupBooking, setPopupBooking] = useState<BookingInfo | null>(null)

  const timeSlots = useMemo(() => generateTimeSlots(), [])
  const next7Days = useMemo(() => getNext7Days(), [])

  const isAdmin = user?.role === 'admin'
  const isUser = !!user && !isAdmin
  const isGuest = !user

  /* ──── Fetch court ──── */
  useEffect(() => {
    if (!selectedCourtId) {
      setView('search')
      return
    }
    let cancelled = false
    fetch(`/api/courts?id=${selectedCourtId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          if (data.error) {
            setView('search')
            return
          }
          setCourt(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false)
          setView('search')
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedCourtId, setView])

  /* ──── Fetch bookings for selected date ──── */
  useEffect(() => {
    if (!selectedCourtId) return
    const dateStr = formatDateISO(selectedDate)
    let cancelled = false
    fetch(`/api/bookings?courtId=${selectedCourtId}&date=${dateStr}`, {
      headers: getAuthHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setBookings(Array.isArray(data) ? data : [])
        }
      })
      .catch(() => {
        if (!cancelled) setBookings([])
      })
    return () => {
      cancelled = true
    }
  }, [selectedCourtId, selectedDate])

  /* ──── Build slot map for admin ──── */
  const adminSlotMap = useMemo(() => {
    if (!isAdmin) return new Map<number, SlotInfo>()
    const map = new Map<number, SlotInfo>()
    const todayFlag = isToday(selectedDate)
    const curHour = getCurrentHour()
    for (let h = SLOT_START; h <= SLOT_END; h++) {
      map.set(h, getAdminSlotInfo(h, bookings, todayFlag, curHour))
    }
    return map
  }, [isAdmin, bookings, selectedDate])

  /* ──── Helpers for user role ──── */
  const bookedSlotHours = useMemo(() => {
    if (isAdmin) return new Set<number>() // admin uses adminSlotMap
    const hours = new Set<number>()
    bookings.forEach((b) => {
      const sh = parseInt(b.startTime.split(':')[0], 10)
      const eh = parseInt(b.endTime.split(':')[0], 10)
      for (let h = sh; h < eh; h++) {
        hours.add(h)
      }
    })
    return hours
  }, [bookings, isAdmin])

  const pastHours = useMemo(() => {
    const todayFlag = isToday(selectedDate)
    if (!todayFlag) return new Set<number>()
    const curHour = getCurrentHour()
    const hours = new Set<number>()
    for (let h = SLOT_START; h <= SLOT_END; h++) {
      if (h <= curHour) hours.add(h)
    }
    return hours
  }, [selectedDate])

  /* ──── Handlers ──── */
  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDateState(date)
    setSelectedTime(null)
    setPopupBooking(null)
  }, [])

  const handleSelectSlot = useCallback(
    (slot: string) => {
      const hour = parseInt(slot.split(':')[0], 10)

      if (isAdmin) {
        const info = adminSlotMap.get(hour)
        if (!info) return
        if (info.status === 'available') {
          setSelectedTime(slot)
          setPopupBooking(null)
        } else if (info.booking) {
          setPopupBooking(info.booking)
        }
        return
      }

      // Guest or regular user
      if (bookedSlotHours.has(hour) || pastHours.has(hour)) return

      if (isGuest) {
        setView('login')
        return
      }

      setSelectedTime(slot)
    },
    [isAdmin, adminSlotMap, bookedSlotHours, pastHours, isGuest, setView]
  )

  const handleReservar = useCallback(() => {
    if (!selectedTime || !selectedCourtId) return
    // Add this court to the multi-court selection cart
    const endHour = parseInt(selectedTime.split(':')[0], 10) + 1
    const endTime = `${String(endHour).padStart(2, '0')}:00`
    setSelectedDate(formatDateISO(selectedDate))
    setSelectedTimeSlot(`${selectedTime} - ${endTime}`)
    addSelectedCourtId(selectedCourtId)
  }, [selectedTime, selectedCourtId, selectedDate, setSelectedDate, setSelectedTimeSlot, addSelectedCourtId])

  // Navigate to booking form with all selected courts
  const handleGoToBooking = useCallback(() => {
    if (selectedCourtIds.length === 0) return
    setSelectedCourtIds(selectedCourtIds)
    setView('booking-form')
  }, [selectedCourtIds, setSelectedCourtIds, setView])

  const handleClosePopup = useCallback(() => setPopupBooking(null), [])

  /* ──── Render helpers ──── */
  const getSlotClasses = (slot: string): string => {
    const hour = parseInt(slot.split(':')[0], 10)

    if (isAdmin) {
      const info = adminSlotMap.get(hour)
      if (!info) return ''
      const cfg = adminStatusConfig[info.status]

      if (selectedTime === slot && info.status === 'available') {
        return 'bg-[#00ff41] text-[#003907] font-bold glow-accent border border-[#00ff41]'
      }

      switch (info.status) {
        case 'available':
          return `${cfg.bgClass} ${cfg.textClass} border ${cfg.borderClass} hover:border-[#00ff41]/50 cursor-pointer`
        case 'reserved':
        case 'in_play':
        case 'completed':
        case 'blocked':
        case 'expired':
          return `${cfg.bgClass} ${cfg.textClass} border ${cfg.borderClass} cursor-pointer`
        case 'past':
        default:
          return `${cfg.bgClass} ${cfg.textClass} border ${cfg.borderClass} cursor-not-allowed`
      }
    }

    // Guest / User role
    const isBooked = bookedSlotHours.has(hour)
    const isPast = pastHours.has(hour)
    const isSelected = selectedTime === slot

    if (isSelected) {
      return 'bg-[#00ff41] text-[#003907] font-bold glow-accent border border-[#00ff41]'
    }
    if (isBooked) {
      return 'bg-cm-surface-container-highest/30 text-cm-on-surface-variant/40 cursor-not-allowed border border-transparent'
    }
    if (isPast) {
      return 'bg-cm-surface-container-highest/20 text-cm-on-surface-variant/25 cursor-not-allowed border border-transparent'
    }
    return 'bg-cm-surface-container-highest/60 text-cm-on-surface-variant border border-cm-outline-variant/50 hover:border-[#00ff41]/50 hover:text-[#00ff41] cursor-pointer transition-all duration-200'
  }

  const getSlotLabel = (slot: string): string | null => {
    if (!isAdmin) return null
    const hour = parseInt(slot.split(':')[0], 10)
    const info = adminSlotMap.get(hour)
    if (!info || info.status === 'available' || info.status === 'past') return null
    return adminStatusConfig[info.status].label
  }

  /* ───────────── Render ───────────── */

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
          <div className="h-64 md:h-80 bg-cm-surface-container-highest rounded-2xl" />
          <div className="h-6 bg-cm-surface-container-highest rounded w-1/2" />
          <div className="h-4 bg-cm-surface-container-highest rounded w-3/4" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-20 bg-cm-surface-container-highest rounded-xl" />
            <div className="h-20 bg-cm-surface-container-highest rounded-xl" />
            <div className="h-20 bg-cm-surface-container-highest rounded-xl" />
          </div>
          <div className="h-32 bg-cm-surface-container-highest rounded-xl" />
        </div>
      </div>
    )
  }

  if (!court) return null

  const images = court.images && court.images.length > 0 ? court.images : ['/placeholder-court.jpg']
  const mainImage = images[activeImageIdx] || images[0]
  const endHour = selectedTime ? parseInt(selectedTime.split(':')[0], 10) + 1 : 0
  const endTimeStr = selectedTime ? `${String(endHour).padStart(2, '0')}:00` : ''

  return (
    <div className="pb-28">
      {/* ─── Image Gallery ─── */}
      <div className="relative">
        <div className="relative h-64 md:h-80 overflow-hidden">
          <Image
            src={mainImage}
            alt={court.name}
            fill
            className="object-cover transition-all duration-500"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-cm-background via-cm-background/30 to-transparent" />

          {/* Back Button */}
          <button
            onClick={() => setView('search')}
            className="absolute top-4 left-4 z-10 p-2 rounded-full bg-cm-surface/80 backdrop-blur-sm border border-white/10 text-cm-on-surface hover:bg-cm-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>

          {/* Price Badge */}
          <div className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-full bg-cm-surface/80 backdrop-blur-sm border border-white/10">
            <span className="text-cm-on-surface-variant text-[10px] font-[family-name:var(--font-inter)]">Desde </span>
            <span className="font-[family-name:var(--font-sora)] font-bold text-[#00ff41] text-lg">
              S/ {getMinPrice(court)}
            </span>
            <span className="text-cm-on-surface-variant text-xs ml-1 font-[family-name:var(--font-inter)]">/hr</span>
          </div>

          {/* Court Name Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00ff41]/15 backdrop-blur-sm border border-[#00ff41]/20">
                <span
                  className="material-symbols-outlined text-[#00ff41] text-[14px]"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  {sportIcons[court.sport] || 'sports'}
                </span>
                <span className="text-xs font-semibold text-[#00ff41] font-[family-name:var(--font-inter)]">
                  {sportLabels[court.sport] || court.sport}
                </span>
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-sora)] text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
              {court.name}
            </h1>
            <p className="text-white/70 text-sm mt-1 font-[family-name:var(--font-inter)] flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">location_on</span>
              {court.branch.name}, {court.branch.city}
            </p>
          </div>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIdx(idx)}
                className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all duration-200 ${
                  idx === activeImageIdx
                    ? 'ring-2 ring-[#00ff41] ring-offset-2 ring-offset-cm-background'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                <Image src={img} alt={`${court.name} ${idx + 1}`} fill className="object-cover" unoptimized />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 max-w-4xl mx-auto">
        {/* ─── Info Cards ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-3 -mt-2 relative z-10 mb-6"
        >
          <div className="glass-card rounded-xl p-3 flex items-center gap-3">
            <span
              className="material-symbols-outlined text-[#00ff41]"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              location_on
            </span>
            <div>
              <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Sede</p>
              <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                {court.branch.name}
              </p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-3 flex items-center gap-3">
            <span
              className="material-symbols-outlined text-[#00ff41]"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              payments
            </span>
            <div>
              <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Precio</p>
              {(() => {
                const items = normalizeSchedule(court.pricingSchedule)
                return items.length > 0 ? (
                  <div className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)] space-y-0.5">
                    {items.map((s, i) => (
                      <p key={i}>{s.label}: S/ {s.pricePerHour}/hr</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                    S/ {court.pricePerHour}/hr
                  </p>
                )
              })()}
            </div>
          </div>
          <div className="glass-card rounded-xl p-3 flex items-center gap-3 col-span-2 md:col-span-1">
            <span
              className="material-symbols-outlined text-[#00ff41]"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              map
            </span>
            <div>
              <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Dirección</p>
              <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)] truncate">
                {court.branch.address}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ─── Amenities ─── */}
        {court.amenities && court.amenities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-lg mb-3 flex items-center gap-2">
              <span
                className="material-symbols-outlined text-[#00ff41] text-[20px]"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                star
              </span>
              Servicios
            </h2>
            <div className="flex flex-wrap gap-2">
              {court.amenities.map((amenity) => (
                <span
                  key={amenity}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cm-surface-container-highest/60 text-cm-on-surface-variant text-xs font-medium border border-cm-outline-variant/50 font-[family-name:var(--font-inter)]"
                >
                  <span className="material-symbols-outlined text-[14px] text-[#00ff41]">
                    {amenityIcons[amenity] || 'checkroom'}
                  </span>
                  {amenity}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── Description ─── */}
        {court.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-lg mb-3 flex items-center gap-2">
              <span
                className="material-symbols-outlined text-[#00ff41] text-[20px]"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                info
              </span>
              Descripción
            </h2>
            <p className="text-cm-on-surface-variant text-sm leading-relaxed font-[family-name:var(--font-inter)]">
              {court.description}
            </p>
          </motion.div>
        )}

        {/* ─── 7-Day Calendar ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-lg mb-3 flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[#00ff41] text-[20px]"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              calendar_month
            </span>
            Disponibilidad
          </h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {next7Days.map((date) => {
              const dateStr = formatDateISO(date)
              const isSelected = dateStr === formatDateISO(selectedDate)
              const todayFlag = isToday(date)
              return (
                <button
                  key={dateStr}
                  onClick={() => handleSelectDate(date)}
                  className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl min-w-[68px] transition-all duration-200 flex-shrink-0 ${
                    isSelected
                      ? 'bg-[#00ff41]/10 border border-[#00ff41]/30'
                      : 'bg-cm-surface-container-highest/40 border border-transparent hover:border-white/10'
                  }`}
                >
                  <span
                    className={`text-[10px] font-semibold uppercase font-[family-name:var(--font-inter)] ${
                      isSelected ? 'text-[#00ff41]' : 'text-cm-on-surface-variant'
                    }`}
                  >
                    {getDayName(date)}
                  </span>
                  <span
                    className={`text-lg font-bold font-[family-name:var(--font-sora)] ${
                      isSelected ? 'text-[#00ff41] text-glow' : 'text-cm-on-surface'
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  <span
                    className={`text-[9px] font-[family-name:var(--font-inter)] ${
                      isSelected ? 'text-[#00ff41]' : 'text-cm-on-surface-variant'
                    }`}
                  >
                    {todayFlag ? 'HOY' : getMonthShort(date)}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* ─── Time Slots ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-lg flex items-center gap-2">
              <span
                className="material-symbols-outlined text-[#00ff41] text-[20px]"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                schedule
              </span>
              Horarios
            </h2>
            <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
              {selectedDate.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* Admin Legend */}
          {isAdmin && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 px-1">
              {(['available', 'reserved', 'in_play', 'completed', 'blocked', 'expired'] as AdminSlotStatus[]).map(
                (s) => (
                  <div key={s} className="flex items-center gap-1">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        s === 'available'
                          ? 'bg-emerald-400'
                          : s === 'reserved'
                          ? 'bg-amber-400'
                          : s === 'in_play'
                          ? 'bg-blue-400'
                          : s === 'completed'
                          ? 'bg-zinc-400'
                          : s === 'blocked'
                          ? 'bg-red-400'
                          : 'bg-zinc-600'
                      }`}
                    />
                    <span className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                      {adminStatusConfig[s].label}
                    </span>
                  </div>
                )
              )}
            </div>
          )}

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {timeSlots.map((slot) => {
              const hour = parseInt(slot.split(':')[0], 10)
              const label = getSlotLabel(slot)
              const disabled = (() => {
                if (isAdmin) {
                  const info = adminSlotMap.get(hour)
                  return info?.status === 'past'
                }
                return bookedSlotHours.has(hour) || pastHours.has(hour)
              })()

              return (
                <button
                  key={slot}
                  disabled={disabled}
                  onClick={() => handleSelectSlot(slot)}
                  className={`py-2.5 px-1 rounded-lg text-center transition-all duration-200 font-[family-name:var(--font-inter)] ${getSlotClasses(slot)}`}
                  title={label || undefined}
                >
                  <span className="text-xs font-medium block">{slot}</span>
                  {label && <span className="text-[8px] leading-tight block mt-0.5 opacity-80">{label}</span>}
                </button>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* ─── Add to Cart Button (User: select slot) ─── */}
      {selectedTime && !isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 z-30 bg-cm-background/95 backdrop-blur-xl border-t border-white/10"
        >
          <div className="max-w-4xl mx-auto p-4">
            <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                  {selectedTime} - {endTimeStr}
                </p>
                <p className="text-[#00ff41] font-bold font-[family-name:var(--font-sora)] text-glow">
                  S/ {getPriceForHour(court, parseInt(selectedTime.split(':')[0], 10))}
                </p>
              </div>
              <button
                onClick={handleReservar}
                className="px-6 py-3 bg-[#00ff41] text-[#003907] font-semibold rounded-xl hover:bg-[#00e639] transition-all glow-accent font-[family-name:var(--font-sora)] flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                Agregar
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Cart Bar: shows when courts are selected ─── */}
      {selectedCourtIds.length > 0 && !isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-cm-background/95 backdrop-blur-xl border-t border-[#00ff41]/30"
        >
          <div className="max-w-4xl mx-auto p-4">
            <div className="glass-card rounded-2xl p-4 border border-[#00ff41]/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00ff41] text-[20px]">shopping_cart</span>
                  <span className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                    {selectedCourtIds.length} cancha{selectedCourtIds.length > 1 ? 's' : ''} seleccionada{selectedCourtIds.length > 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={() => removeSelectedCourtId(selectedCourtId!)}
                  className="text-xs text-cm-on-surface-variant hover:text-red-400 transition-colors font-[family-name:var(--font-inter)] flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  Quitar última
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                    {selectedCourtIds.length}x {selectedTime} - {endTimeStr}
                  </p>
                </div>
                <button
                  onClick={handleGoToBooking}
                  className="px-6 py-3 bg-[#00ff41] text-[#003907] font-bold rounded-xl hover:bg-[#00e639] transition-all glow-accent font-[family-name:var(--font-sora)] flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">sports</span>
                  Reservar {selectedCourtIds.length} cancha{selectedCourtIds.length > 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Admin: Reservar available slot ─── */}
      {selectedTime && isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 z-30 bg-cm-background/95 backdrop-blur-xl border-t border-white/10"
        >
          <div className="max-w-4xl mx-auto p-4">
            <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Slot disponible</p>
                <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                  {selectedTime} - {endTimeStr} · S/ {getPriceForHour(court, parseInt(selectedTime.split(':')[0], 10))}
                </p>
              </div>
              <button
                onClick={handleReservar}
                className="px-6 py-3 bg-[#00ff41] text-[#003907] font-semibold rounded-xl hover:bg-[#00e639] transition-all glow-accent font-[family-name:var(--font-sora)] flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                Crear Reserva
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Admin Booking Details Popup ─── */}
      <AnimatePresence>
        {popupBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={handleClosePopup}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md glass-card rounded-2xl p-5 border border-white/15 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={handleClosePopup}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-cm-surface-container-highest/60 text-cm-on-surface-variant hover:text-cm-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>

              <h3 className="font-[family-name:var(--font-sora)] font-bold text-cm-on-surface text-base mb-4 pr-8">
                Detalle de Reserva
              </h3>

              <div className="space-y-3">
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold font-[family-name:var(--font-inter)] ${
                      popupBooking.status === 'completed'
                        ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                        : popupBooking.status === 'cancelled'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[12px]">
                      {popupBooking.status === 'reserved'
                        ? 'check_circle'
                        : popupBooking.status === 'completed'
                        ? 'verified'
                        : popupBooking.status === 'cancelled'
                        ? 'cancel'
                        : 'pending'}
                    </span>
                    {popupBooking.status === 'reserved' ? 'Reservado' : popupBooking.status === 'completed' ? 'Completo' : popupBooking.status === 'cancelled' ? 'Cancelado' : popupBooking.status.charAt(0).toUpperCase() + popupBooking.status.slice(1).replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] font-mono">
                    #{popupBooking.id.slice(-6)}
                  </span>
                </div>

                {/* Divider */}
                <div className="border-t border-white/5" />

                {/* Client Info */}
                {popupBooking.user && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#00ff41]/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[#00ff41] text-[20px]">person</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)] truncate">
                        {popupBooking.user.name}
                      </p>
                      <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] truncate">
                        {popupBooking.user.email}
                        {popupBooking.user.phone && ` · ${popupBooking.user.phone}`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Schedule */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-cm-surface-container-highest/40 rounded-lg p-3">
                    <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-0.5">
                      Fecha
                    </p>
                    <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                      {popupBooking.date}
                    </p>
                  </div>
                  <div className="bg-cm-surface-container-highest/40 rounded-lg p-3">
                    <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-0.5">
                      Horario
                    </p>
                    <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                      {popupBooking.startTime} - {popupBooking.endTime}
                    </p>
                  </div>
                </div>

                {/* Payment */}
                <div className="bg-cm-surface-container-highest/40 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                      Pago total
                    </span>
                    <span className="text-sm font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">
                      S/ {popupBooking.totalPrice?.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#00ff41] font-[family-name:var(--font-inter)]">
                      Adelanto (50%)
                    </span>
                    <span className="text-sm font-bold text-[#00ff41] font-[family-name:var(--font-sora)]">
                      S/ {popupBooking.advanceAmount?.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                      Restante
                    </span>
                    <span className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                      S/ {popupBooking.remainingAmount?.toFixed(2)}
                    </span>
                  </div>
                  {popupBooking.paymentMethod && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-cm-on-surface-variant">
                        {popupBooking.paymentMethod === 'yape'
                          ? 'phone_iphone'
                          : popupBooking.paymentMethod === 'plin'
                          ? 'phone_iphone'
                          : popupBooking.paymentMethod === 'culqi'
                          ? 'credit_card'
                          : popupBooking.paymentMethod === 'card'
                          ? 'credit_card'
                          : popupBooking.paymentMethod === 'cash'
                          ? 'payments'
                          : 'account_balance'}
                      </span>
                      <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] capitalize">
                        {popupBooking.paymentMethod}
                      </span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {popupBooking.notes && (
                  <div className="bg-cm-surface-container-highest/40 rounded-lg p-3">
                    <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1">
                      Notas
                    </p>
                    <p className="text-xs text-cm-on-surface font-[family-name:var(--font-inter)]">
                      {popupBooking.notes}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
