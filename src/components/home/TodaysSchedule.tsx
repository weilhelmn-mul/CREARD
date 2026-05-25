'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'

interface BookingSlot {
  id: string
  court_id: string
  court_name?: string
  sport?: string
  start_time: string
  end_time: string
  status: string
  user_name?: string
  total_price: number
}

const mockBookings: BookingSlot[] = [
  { id: 'b1', court_id: '1', court_name: 'Cancha Fútbol 1', sport: 'futbol', start_time: '08:00', end_time: '09:00', status: 'confirmed', user_name: 'Carlos M.', total_price: 60 },
  { id: 'b2', court_id: '3', court_name: 'Cancha Fútbol 3', sport: 'futbol', start_time: '09:00', end_time: '10:00', status: 'confirmed', user_name: 'Miguel R.', total_price: 55 },
  { id: 'b3', court_id: '5', court_name: 'Cancha Vóley 1', sport: 'voley', start_time: '10:00', end_time: '11:00', status: 'pending', user_name: 'Ana L.', total_price: 40 },
  { id: 'b4', court_id: '2', court_name: 'Cancha Fútbol 2', sport: 'futbol', start_time: '18:00', end_time: '19:00', status: 'confirmed', user_name: 'Diego P.', total_price: 50 },
  { id: 'b5', court_id: '4', court_name: 'Cancha Fútbol 4', sport: 'futbol', start_time: '19:00', end_time: '20:00', status: 'pending', user_name: 'Luis G.', total_price: 65 },
  { id: 'b6', court_id: '1', court_name: 'Cancha Fútbol 1', sport: 'futbol', start_time: '20:00', end_time: '21:00', status: 'confirmed', user_name: 'Pedro S.', total_price: 60 },
]

const sportIcons: Record<string, string> = {
  futbol: 'sports_soccer',
  voley: 'sports_volleyball',
  eventos: 'celebration',
}

function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatTime12(time: string): string {
  const [h] = time.split(':').map(Number)
  if (h === 0) return '12:00 AM'
  if (h < 12) return `${h}:00 AM`
  if (h === 12) return '12:00 PM'
  return `${h - 12}:00 PM`
}

export default function TodaysSchedule() {
  const { setView } = useAppStore()
  const [bookings, setBookings] = useState<BookingSlot[]>([])
  const [loading, setLoading] = useState(true)
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  useEffect(() => {
    fetch(`/api/bookings?date=${getTodayStr()}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped: BookingSlot[] = data.map((b: Record<string, unknown>) => ({
            id: b.id,
            court_id: b.court_id,
            court_name: (b.court as Record<string, unknown>)?.name || 'Cancha',
            sport: (b.court as Record<string, unknown>)?.sport || 'futbol',
            start_time: b.start_time || '',
            end_time: b.end_time || '',
            status: b.status || 'pending',
            user_name: b.user_name || '',
            total_price: b.total_price || 0,
          }))
          setBookings(mapped)
        } else {
          setBookings(mockBookings)
        }
      })
      .catch(() => {
        setBookings(mockBookings)
      })
      .finally(() => setLoading(false))
  }, [])

  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length
  const pendingCount = bookings.filter((b) => b.status === 'pending').length

  return (
    <section ref={sectionRef} className="py-12 md:py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-6 md:mb-8 gap-3"
        >
          <div>
            <h2 className="font-[family-name:var(--font-sora)] text-2xl md:text-3xl font-bold text-cm-on-surface">
              Agenda de Hoy
            </h2>
            <p className="text-cm-on-surface-variant text-sm mt-1 font-[family-name:var(--font-inter)]">
              {bookings.length > 0
                ? `${bookings.length} reservas para hoy`
                : 'Aun no hay reservas para hoy'}
            </p>
          </div>

          {/* Status summary */}
          {bookings.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-400 text-xs font-semibold">{confirmedCount} confirmadas</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-yellow-400 text-xs font-semibold">{pendingCount} pendientes</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Timeline */}
        {loading ? (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-16 h-10 rounded-lg bg-cm-surface-container-highest flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-cm-surface-container-highest" />
                  <div className="h-3 w-24 rounded bg-cm-surface-container-highest" />
                </div>
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="glass-card rounded-2xl p-8 md:p-12 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-cm-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-cm-primary text-[32px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                event_available
              </span>
            </div>
            <h3 className="font-[family-name:var(--font-sora)] text-lg font-bold text-cm-on-surface mb-2">
              Aun no hay reservas para hoy
            </h3>
            <p className="text-cm-on-surface-variant text-sm mb-5 font-[family-name:var(--font-inter)]">
              Se el primero en reservar tu cancha
            </p>
            <button
              onClick={() => setView('search')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-cm-primary text-cm-on-primary text-sm font-semibold rounded-xl hover:bg-cm-primary-dim transition-all glow-accent font-[family-name:var(--font-sora)]"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                add_circle
              </span>
              Reservar ahora
            </button>
          </motion.div>
        ) : (
          <div className="glass-card rounded-2xl p-4 md:p-6 overflow-hidden">
            <div className="overflow-x-auto no-scrollbar -mx-2 px-2">
              <div className="flex gap-3 pb-2 min-w-max">
                {bookings.map((booking, index) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, x: 30 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.08,
                      ease: [0.25, 0.4, 0.25, 1],
                    }}
                    className="flex-shrink-0 w-48 md:w-56 p-3 md:p-4 rounded-xl bg-cm-surface-container-highest/50 border border-white/5 hover:border-cm-primary/20 transition-all duration-200 group"
                  >
                    {/* Time */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-cm-on-surface-variant text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                        schedule
                      </span>
                      <span className="text-cm-on-surface text-xs font-semibold font-[family-name:var(--font-sora)]">
                        {formatTime12(booking.start_time)} - {formatTime12(booking.end_time)}
                      </span>
                    </div>

                    {/* Court Info */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-cm-primary text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                        {sportIcons[booking.sport || 'futbol'] || 'sports'}
                      </span>
                      <span className="text-cm-on-surface text-sm font-semibold truncate font-[family-name:var(--font-sora)]">
                        {booking.court_name || 'Cancha'}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          booking.status === 'confirmed'
                            ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                            : booking.status === 'pending'
                              ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                              : 'bg-cm-surface-container text-cm-on-surface-variant border border-white/10'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${booking.status === 'confirmed' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                        {booking.status === 'confirmed' ? 'Confirmada' : booking.status === 'pending' ? 'Pendiente' : booking.status}
                      </span>
                      <span className="text-cm-on-surface-variant text-[10px] font-medium font-[family-name:var(--font-inter)]">
                        S/. {booking.total_price}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
