'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useAppStore } from '@/store/useAppStore'
import { motion } from 'framer-motion'

interface Court {
  id: string
  name: string
  sport: string
  description?: string
  rating: number
  reviewCount: number
  pricePerHour: number
  images: string[]
  amenities: string[]
  branch: { name: string; city: string; address: string }
  reviews: Array<{ rating: number; comment: string; client: { name: string } }>
}

interface BookingSlot {
  startTime: string
  endTime: string
}

const sportLabels: Record<string, string> = {
  futbol: 'Fútbol',
  voley: 'Vóley',
  basket: 'Básquet',
  tenis: 'Tenis',
  eventos: 'Eventos',
}

const sportIcons: Record<string, string> = {
  futbol: 'sports_soccer',
  voley: 'sports_volleyball',
  basket: 'sports_basketball',
  tenis: 'sports_tennis',
  eventos: 'celebration',
}

function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = 6; h <= 22; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
  }
  return slots
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getDayName(date: Date): string {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  return days[date.getDay()]
}

function getNext7Days(): Date[] {
  const days: Date[] = []
  const now = new Date()
  for (let i = 0; i < 7; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    days.push(date)
  }
  return days
}

export default function CourtDetail() {
  const { selectedCourtId, setView, setSelectedDate, setSelectedTimeSlot } = useAppStore()
  const [court, setCourt] = useState<Court | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDateState] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [bookedSlots, setBookedSlots] = useState<string[]>([])

  const timeSlots = generateTimeSlots()
  const next7Days = getNext7Days()

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
    return () => { cancelled = true }
  }, [selectedCourtId, setView])

  useEffect(() => {
    if (!selectedCourtId) return
    const dateStr = formatDate(selectedDate)
    fetch(`/api/bookings?courtId=${selectedCourtId}&date=${dateStr}`)
      .then((res) => res.json())
      .then((data) => {
        const slots: string[] = []
        data.forEach((b: BookingSlot) => {
          const start = parseInt(b.startTime.split(':')[0])
          const end = parseInt(b.endTime.split(':')[0])
          for (let h = start; h < end; h++) {
            slots.push(`${String(h).padStart(2, '0')}:00`)
          }
        })
        setBookedSlots(slots)
      })
      .catch(() => setBookedSlots([]))
  }, [selectedCourtId, selectedDate])

  const handleReservar = () => {
    if (!selectedTime) return
    const endTime = `${String(parseInt(selectedTime) + 1).padStart(2, '0')}:00`
    setSelectedDate(selectedDate)
    setSelectedTimeSlot(selectedTime + ' - ' + endTime)
    setView('booking-form')
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-cm-surface-container-highest rounded-2xl" />
          <div className="h-6 bg-cm-surface-container-highest rounded w-1/2" />
          <div className="h-4 bg-cm-surface-container-highest rounded w-3/4" />
          <div className="h-32 bg-cm-surface-container-highest rounded-xl" />
        </div>
      </div>
    )
  }

  if (!court) return null

  return (
    <div className="pb-8">
      {/* Hero Image */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <Image
          src={court.images[0]}
          alt={court.name}
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cm-background via-transparent to-transparent" />

        {/* Back Button */}
        <button
          onClick={() => setView('search')}
          className="absolute top-4 left-4 p-2 rounded-full bg-cm-surface/80 backdrop-blur-sm border border-white/10 text-cm-on-surface hover:bg-cm-surface transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

        {/* Court Name Overlay */}
        <div className="absolute bottom-6 left-4 right-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cm-primary/20 backdrop-blur-sm">
              <span className="material-symbols-outlined text-cm-primary text-[14px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                {sportIcons[court.sport]}
              </span>
              <span className="text-xs font-semibold text-cm-primary">{sportLabels[court.sport]}</span>
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cm-surface/80 backdrop-blur-sm">
              <span className="material-symbols-outlined text-yellow-400 text-[14px]" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
              <span className="text-xs font-semibold text-cm-on-surface">{court.rating}</span>
              <span className="text-xs text-cm-on-surface-variant">({court.reviewCount})</span>
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-sora)] text-2xl md:text-3xl font-bold text-white">
            {court.name}
          </h1>
        </div>
      </div>

      <div className="px-4 max-w-4xl mx-auto">
        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-3 -mt-4 relative z-10 mb-6"
        >
          <div className="glass-card rounded-xl p-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-cm-primary" style={{ fontVariationSettings: '"FILL" 1' }}>location_on</span>
            <div>
              <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Ubicación</p>
              <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">{court.branch.city}</p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-cm-primary" style={{ fontVariationSettings: '"FILL" 1' }}>payments</span>
            <div>
              <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Precio</p>
              <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">${court.pricePerHour}/hr</p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-3 flex items-center gap-3 col-span-2 md:col-span-1">
            <span className="material-symbols-outlined text-cm-primary" style={{ fontVariationSettings: '"FILL" 1' }}>store</span>
            <div>
              <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Sede</p>
              <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">{court.branch.name}</p>
            </div>
          </div>
        </motion.div>

        {/* Amenities */}
        {court.amenities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-lg mb-3">
              Servicios
            </h2>
            <div className="flex flex-wrap gap-2">
              {court.amenities.map((amenity) => (
                <span
                  key={amenity}
                  className="px-3 py-1.5 rounded-full bg-cm-surface-container-highest/60 text-cm-on-surface-variant text-xs font-medium border border-cm-outline-variant/50 font-[family-name:var(--font-inter)]"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Description */}
        {court.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-lg mb-3">
              Descripción
            </h2>
            <p className="text-cm-on-surface-variant text-sm leading-relaxed font-[family-name:var(--font-inter)]">
              {court.description}
            </p>
          </motion.div>
        )}

        {/* Calendar - Next 7 Days */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-lg mb-3">
            Disponibilidad
          </h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {next7Days.map((date) => {
              const dateStr = formatDate(date)
              const isSelected = dateStr === formatDate(selectedDate)
              return (
                <button
                  key={dateStr}
                  onClick={() => {
                    setSelectedDateState(date)
                    setSelectedTime(null)
                  }}
                  className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl min-w-[68px] transition-all duration-200 ${
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
                  {isToday(date) && (
                    <span className={`text-[9px] font-semibold ${isSelected ? 'text-cm-primary' : 'text-cm-on-surface-variant'}`}>
                      HOY
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Time Slots */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-lg">
              Horarios
            </h2>
            <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
              {selectedDate.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {timeSlots.map((slot) => {
              const isBooked = bookedSlots.includes(slot)
              const isSelected = selectedTime === slot
              const isPast = isToday(selectedDate) && parseInt(slot) <= new Date().getHours()

              return (
                <button
                  key={slot}
                  disabled={isBooked || isPast}
                  onClick={() => setSelectedTime(slot)}
                  className={`py-2.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 font-[family-name:var(--font-inter)] ${
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
        </motion.div>

        {/* Reservar Button */}
        {selectedTime && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky bottom-24 md:bottom-6 z-30"
          >
            <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                  {selectedTime} - {String(parseInt(selectedTime) + 1).padStart(2, '0')}:00
                </p>
                <p className="text-cm-primary font-bold font-[family-name:var(--font-sora)]">
                  ${court.pricePerHour}/hr
                </p>
              </div>
              <button
                onClick={handleReservar}
                className="px-6 py-3 bg-cm-primary text-cm-on-primary font-semibold rounded-xl hover:bg-cm-primary-dim transition-all glow-accent font-[family-name:var(--font-sora)]"
              >
                Reservar
              </button>
            </div>
          </motion.div>
        )}

        {/* Reviews */}
        {court.reviews && court.reviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-lg mb-3">
              Reseñas
            </h2>
            <div className="space-y-3">
              {court.reviews.map((review, idx) => (
                <div key={idx} className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-cm-primary/20 flex items-center justify-center">
                      <span className="text-cm-primary font-semibold text-xs font-[family-name:var(--font-sora)]">
                        {review.client.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                        {review.client.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={`material-symbols-outlined text-[14px] ${
                            i < review.rating ? 'text-yellow-400' : 'text-cm-outline-variant'
                          }`}
                          style={i < review.rating ? { fontVariationSettings: '"FILL" 1' } : undefined}
                        >
                          star
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-cm-on-surface-variant text-sm font-[family-name:var(--font-inter)]">
                    {review.comment}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
