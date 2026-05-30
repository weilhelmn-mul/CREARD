'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { useAppStore } from '@/store/useAppStore'
import { motion, useInView } from 'framer-motion'

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
  description: string
  branch_id: string
  images: string[]
  price_per_hour: number
  pricingSchedule: PricingScheduleItem[]
  amenities: string[]
  is_active: boolean
  availableToday?: number
}

const futbolSchedule: PricingScheduleItem[] = [
  { label: 'Mañana', startHour: 7, endHour: 18, pricePerHour: 35 },
  { label: 'Noche', startHour: 18, endHour: 22, pricePerHour: 50 },
]
const voleySchedule: PricingScheduleItem[] = [
  { label: 'Mañana', startHour: 7, endHour: 18, pricePerHour: 30 },
  { label: 'Noche', startHour: 18, endHour: 22, pricePerHour: 45 },
]

const fallbackCourts: Court[] = [
  { id: 'cancha-1', name: 'Cancha Fútbol 1', sport: 'futbol', description: 'Cancha premium con césped sintético', branch_id: 'branch-1', images: ['/cancha-futbol-1.png'], price_per_hour: 35, pricingSchedule: futbolSchedule, amenities: ['Cesped sintetico', 'Iluminacion LED', 'Vestuarios'], is_active: true, availableToday: 9 },
  { id: 'cancha-2', name: 'Cancha Fútbol 2', sport: 'futbol', description: 'Cancha estándar', branch_id: 'branch-1', images: ['/cancha-futbol-2.png'], price_per_hour: 35, pricingSchedule: futbolSchedule, amenities: ['Cesped sintetico', 'Iluminacion'], is_active: true, availableToday: 7 },
  { id: 'cancha-3', name: 'Cancha Fútbol 3', sport: 'futbol', description: 'Techada parcial', branch_id: 'branch-1', images: ['/cancha-futbol-3.png'], price_per_hour: 35, pricingSchedule: futbolSchedule, amenities: ['Cesped sintetico', 'Techado parcial', 'Vestuarios'], is_active: true, availableToday: 6 },
  { id: 'cancha-4', name: 'Cancha Fútbol 4', sport: 'futbol', description: 'Nueva con mejores instalaciones', branch_id: 'branch-1', images: ['/cancha-futbol-4.png'], price_per_hour: 35, pricingSchedule: futbolSchedule, amenities: ['Cesped premium', 'Iluminacion LED', 'Duchas', 'Estacionamiento'], is_active: true, availableToday: 8 },
  { id: 'cancha-5', name: 'Vóley Cancha A', sport: 'voley', description: 'Piso PVC profesional con red reglamentaria', branch_id: 'branch-1', images: ['/cancha-voley.png'], price_per_hour: 30, pricingSchedule: voleySchedule, amenities: ['Piso PVC', 'Red reglamentaria', 'Iluminacion LED'], is_active: true, availableToday: 10 },
  { id: 'cancha-6', name: 'Vóley Cancha B', sport: 'voley', description: 'Segunda cancha de vóley techada', branch_id: 'branch-1', images: ['/cancha-voley.png'], price_per_hour: 30, pricingSchedule: voleySchedule, amenities: ['Piso PVC', 'Iluminacion LED', 'Techado'], is_active: true, availableToday: 8 },
]

const sportLabels: Record<string, string> = {
  futbol: 'Fútbol',
  voley: 'Vóley',
}

const sportIcons: Record<string, string> = {
  futbol: 'sports_soccer',
  voley: 'sports_volleyball',
}

const amenityIcons: Record<string, string> = {
  'cesped sintetico': 'grass',
  'cesped premium': 'eco',
  'iluminacion': 'lightbulb',
  'iluminacion led': 'lightbulb',
  'vestuarios': 'checkroom',
  'duchas': 'shower',
  'estacionamiento': 'local_parking',
  'techado': 'roofing',
  'techado parcial': 'deployed_code',
  'piso pvc': 'layers',
  'red reglamentaria': 'sports_volleyball',
  'sonido': 'speaker',
}

// --- Skeleton Card ---
function CourtCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="relative h-48 bg-cm-surface-container-highest animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-5 w-3/4 rounded bg-cm-surface-container-highest animate-pulse" />
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-full bg-cm-surface-container-highest animate-pulse" />
          <div className="h-6 w-20 rounded-full bg-cm-surface-container-highest animate-pulse" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="h-7 w-20 rounded bg-cm-surface-container-highest animate-pulse" />
          <div className="h-9 w-24 rounded-lg bg-cm-surface-container-highest animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export default function FeaturedCourts() {
  const { setView, setSelectedCourt } = useAppStore()
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  useEffect(() => {
    fetch('/api/courts')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // Map API fields (camelCase from API) to our interface, add random available slots
          const mapped = data.slice(0, 6).map((c: Record<string, unknown>) => ({
            id: c.id,
            name: c.name,
            sport: c.sport,
            description: c.description || '',
            branch_id: c.branchId || c.branch_id,
            images: Array.isArray(c.images) && c.images.length > 0 ? c.images : ['/cancha-futbol-1.png'],
            price_per_hour: Number(c.pricePerHour || c.price_per_hour) || 35,
            pricingSchedule: Array.isArray(c.pricingSchedule) ? c.pricingSchedule : [],
            amenities: Array.isArray(c.amenities) ? c.amenities : [],
            is_active: c.isActive !== false && c.is_active !== false,
            availableToday: Math.floor(Math.random() * 6) + 5,
          }))
          setCourts(mapped)
        } else {
          setCourts(fallbackCourts)
        }
      })
      .catch(() => {
        setCourts(fallbackCourts)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleCourtClick = (courtId: string) => {
    setSelectedCourt(courtId)
    setView('court-detail')
  }

  const handleReserve = (courtId: string) => {
    setSelectedCourt(courtId)
    setView('court-detail')
  }

  return (
    <section ref={sectionRef} className="py-12 md:py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex items-end justify-between mb-8"
        >
          <div>
            <h2 className="font-[family-name:var(--font-sora)] text-2xl md:text-3xl font-bold text-cm-on-surface">
              Canchas Destacadas
            </h2>
            <p className="text-cm-on-surface-variant text-sm mt-1.5 font-[family-name:var(--font-inter)]">
              Elige tu espacio ideal y reserva al instante
            </p>
          </div>
          <button
            onClick={() => setView('search')}
            className="hidden sm:flex items-center gap-1 text-cm-primary text-sm font-semibold hover:text-glow transition-all group"
          >
            Ver Todas
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
          </button>
        </motion.div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <CourtCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {courts.map((court, index) => (
              <motion.div
                key={court.id}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.5,
                  delay: index * 0.08,
                  ease: [0.25, 0.4, 0.25, 1],
                }}
                className="glass-card rounded-2xl overflow-hidden group cursor-pointer hover:border-cm-primary/30 hover:shadow-[0_0_20px_rgba(0,255,65,0.1)] transition-all duration-300 flex flex-col"
                onClick={() => handleCourtClick(court.id)}
              >
                {/* Image */}
                <div className="relative h-40 md:h-48 overflow-hidden">
                  <Image
                    src={court.images[0]}
                    alt={court.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Sport Badge */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-full bg-cm-surface/80 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-cm-primary text-[14px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                      {sportIcons[court.sport] || 'sports'}
                    </span>
                    <span className="text-[10px] font-bold text-cm-primary uppercase tracking-wide">
                      {sportLabels[court.sport] || court.sport}
                    </span>
                  </div>

                  {/* Available Today Indicator */}
                  {court.availableToday && court.availableToday > 0 && (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-full bg-cm-primary/90 backdrop-blur-sm">
                      <span className="material-symbols-outlined text-cm-on-primary text-[12px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                        schedule
                      </span>
                      <span className="text-[10px] font-bold text-cm-on-primary">
                        {court.availableToday} hrs
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-3 md:p-4 flex flex-col flex-1">
                  {/* Court Name */}
                  <h3 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-sm md:text-base mb-2 truncate">
                    {court.name}
                  </h3>

                  {/* Amenities */}
                  <div className="flex flex-wrap gap-1.5 mb-3 min-h-[24px]">
                    {court.amenities.filter(Boolean).slice(0, 3).map((amenity: string, i: number) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cm-surface-container-highest/80 text-cm-on-surface-variant text-[10px] font-medium"
                      >
                        <span className="material-symbols-outlined text-[11px]">
                          {amenityIcons[amenity.toLowerCase()] || 'check_circle'}
                        </span>
                        {amenity}
                      </span>
                    ))}
                  </div>

                  {/* Price + Reserve */}
                  <div className="mt-auto flex items-end justify-between gap-2 pt-2 border-t border-white/5">
                    <div>
                      {court.pricingSchedule && court.pricingSchedule.length > 0 ? (
                        <div className="space-y-0.5">
                          {court.pricingSchedule.map((ps, psi) => (
                            <div key={psi} className="flex items-center gap-1.5">
                              <span className="text-[9px] text-cm-on-surface-variant font-medium">{ps.label}</span>
                              <span className="font-[family-name:var(--font-sora)] text-sm md:text-base font-bold text-cm-primary">
                                S/. {ps.pricePerHour}
                                <span className="text-[9px] text-cm-on-surface-variant font-normal ml-0.5">/hr</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>
                          <p className="text-[10px] text-cm-on-surface-variant font-medium">Desde</p>
                          <p className="font-[family-name:var(--font-sora)] text-lg md:text-xl font-bold text-cm-primary">
                            S/. {court.price_per_hour}
                            <span className="text-[10px] text-cm-on-surface-variant font-normal ml-0.5">/hr</span>
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleReserve(court.id)
                      }}
                      className="px-3 py-2 md:px-4 md:py-2.5 bg-cm-primary text-cm-on-primary text-xs font-bold rounded-lg hover:bg-cm-primary-dim transition-all duration-200 active:scale-[0.96] glow-accent font-[family-name:var(--font-sora)]"
                    >
                      Reservar
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Mobile "Ver Todas" button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-6 flex justify-center sm:hidden"
        >
          <button
            onClick={() => setView('search')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-cm-primary/30 text-cm-primary text-sm font-semibold hover:bg-cm-primary/5 transition-all"
          >
            Ver todas las canchas
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </motion.div>
      </div>
    </section>
  )
}
