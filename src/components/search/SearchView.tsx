'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useAppStore } from '@/store/useAppStore'
import { motion } from 'framer-motion'

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
  images: string[]
  description?: string
  amenities?: string[]
  branch: { name: string; city: string }
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
}

const sportLabels: Record<string, string> = {
  futbol: 'Fútbol',
  voley: 'Vóley',
}

const sportIcons: Record<string, string> = {
  futbol: 'sports_soccer',
  voley: 'sports_volleyball',
}

const sportTabs = [
  { value: 'todos', label: 'Todos' },
  { value: 'futbol', label: 'Fútbol' },
  { value: 'voley', label: 'Vóley' },
]

type SortType = 'price-asc' | 'price-desc' | 'name'

export default function SearchView() {
  const { sportFilter, setSportFilter, setSelectedCourt, setView } = useAppStore()
  const [courts, setCourts] = useState<Court[]>([])
  const [localSport, setLocalSport] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortType>('price-asc')
  const [loading, setLoading] = useState(true)

  const futbolSchedule: PricingScheduleItem[] = [
    { label: 'Mañana', startHour: 7, endHour: 18, pricePerHour: 35 },
    { label: 'Noche', startHour: 18, endHour: 22, pricePerHour: 50 },
  ]
  const voleySchedule: PricingScheduleItem[] = [
    { label: 'Mañana', startHour: 7, endHour: 18, pricePerHour: 30 },
    { label: 'Noche', startHour: 18, endHour: 22, pricePerHour: 45 },
  ]

  const fallbackCourts: Court[] = [
    { id: 'cancha-1', name: 'Cancha Fútbol 1', sport: 'futbol', pricePerHour: 35, pricingSchedule: futbolSchedule, images: ['/cancha-futbol-1.png'], description: 'Cancha premium con césped sintético', amenities: ['Cesped sintetico', 'Iluminacion LED', 'Vestuarios'], branch: { name: 'CREARD', city: 'San Sebastián' } },
    { id: 'cancha-2', name: 'Cancha Fútbol 2', sport: 'futbol', pricePerHour: 35, pricingSchedule: futbolSchedule, images: ['/cancha-futbol-2.png'], description: 'Cancha estándar', amenities: ['Cesped sintetico', 'Iluminacion'], branch: { name: 'CREARD', city: 'San Sebastián' } },
    { id: 'cancha-3', name: 'Cancha Fútbol 3', sport: 'futbol', pricePerHour: 35, pricingSchedule: futbolSchedule, images: ['/cancha-futbol-3.png'], description: 'Techada parcial', amenities: ['Cesped sintetico', 'Techado parcial', 'Vestuarios'], branch: { name: 'CREARD', city: 'San Sebastián' } },
    { id: 'cancha-4', name: 'Cancha Fútbol 4', sport: 'futbol', pricePerHour: 35, pricingSchedule: futbolSchedule, images: ['/cancha-futbol-4.png'], description: 'Nueva con mejores instalaciones', amenities: ['Cesped premium', 'Iluminacion LED', 'Duchas', 'Estacionamiento'], branch: { name: 'CREARD', city: 'San Sebastián' } },
    { id: 'cancha-5', name: 'Vóley Cancha A', sport: 'voley', pricePerHour: 30, pricingSchedule: voleySchedule, images: ['/cancha-voley.png'], description: 'Piso PVC profesional con red reglamentaria', amenities: ['Piso PVC', 'Red reglamentaria', 'Iluminacion LED'], branch: { name: 'CREARD', city: 'San Sebastián' } },
    { id: 'cancha-6', name: 'Vóley Cancha B', sport: 'voley', pricePerHour: 30, pricingSchedule: voleySchedule, images: ['/cancha-voley.png'], description: 'Segunda cancha de vóley techada', amenities: ['Piso PVC', 'Iluminacion LED', 'Techado'], branch: { name: 'CREARD', city: 'San Sebastián' } },
  ]

  useEffect(() => {
    let cancelled = false
    fetch('/api/courts')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          if (Array.isArray(data) && data.length > 0) {
            setCourts(data)
          } else {
            setCourts(fallbackCourts)
          }
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCourts(fallbackCourts)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  const activeSport = localSport || sportFilter || 'todos'

  const handleSportChange = (sport: string) => {
    setLocalSport(sport)
    setSportFilter(sport)
  }

  const filteredCourts = courts
    .filter((court) => activeSport === 'todos' || court.sport === activeSport)
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-asc': return (a.pricePerHour || 0) - (b.pricePerHour || 0)
        case 'price-desc': return (b.pricePerHour || 0) - (a.pricePerHour || 0)
        case 'name': return a.name.localeCompare(b.name)
        default: return 0
      }
    })

  const handleCourtClick = (courtId: string) => {
    setSelectedCourt(courtId)
    setView('court-detail')
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-cm-on-surface">
          Buscar Canchas
        </h1>
        <p className="text-cm-on-surface-variant text-sm mt-1 font-[family-name:var(--font-inter)]">
          {filteredCourts.length} cancha{filteredCourts.length !== 1 ? 's' : ''} disponible{filteredCourts.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Sport Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-4">
          {sportTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleSportChange(tab.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                activeSport === tab.value
                  ? 'bg-cm-primary/10 text-cm-primary text-glow border border-cm-primary/30'
                  : 'bg-cm-surface-container-highest/40 text-cm-on-surface-variant border border-transparent hover:border-white/10'
              }`}
            >
              {tab.value !== 'todos' && (
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={activeSport === tab.value ? { fontVariationSettings: '"FILL" 1' } : undefined}
                >
                  {sportIcons[tab.value]}
                </span>
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-cm-on-surface-variant text-[20px]">sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="bg-cm-surface-container-highest/60 border border-white/10 rounded-lg px-3 py-1.5 text-cm-on-surface text-sm appearance-none cursor-pointer focus:outline-none focus:border-cm-primary/50 transition-colors font-[family-name:var(--font-inter)]"
            >
              <option value="price-asc">Precio: menor a mayor</option>
              <option value="price-desc">Precio: mayor a menor</option>
              <option value="name">Nombre A-Z</option>
            </select>
          </div>
        </div>

        {/* Courts Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass-card rounded-2xl overflow-hidden animate-pulse">
                <div className="h-48 bg-cm-surface-container-highest" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-cm-surface-container-highest rounded w-3/4" />
                  <div className="h-3 bg-cm-surface-container-highest rounded w-1/2" />
                  <div className="flex justify-between items-center">
                    <div className="h-5 bg-cm-surface-container-highest rounded w-20" />
                    <div className="h-8 bg-cm-surface-container-highest rounded-lg w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredCourts.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-cm-on-surface-variant/30 mb-4 block">search_off</span>
            <p className="text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
              No se encontraron canchas para este deporte
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourts.map((court, index) => (
              <motion.div
                key={court.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                className="glass-card rounded-2xl overflow-hidden cursor-pointer hover:border-cm-primary/30 hover:shadow-[0_0_20px_rgba(0,255,65,0.1)] transition-all duration-300 group flex flex-col"
                onClick={() => handleCourtClick(court.id)}
              >
                {/* Image */}
                <div className="relative h-44 overflow-hidden">
                  <Image
                    src={court.images?.[0] || '/cancha-futbol-1.png'}
                    alt={court.name || 'Cancha'}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Sport Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cm-surface/80 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-cm-primary text-[14px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                      {sportIcons[court.sport]}
                    </span>
                    <span className="text-[10px] font-bold text-cm-primary uppercase tracking-wide">
                      {sportLabels[court.sport]}
                    </span>
                  </div>

                  {/* Pricing Badge (from top-right) */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-cm-primary/90 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-cm-on-primary text-[12px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                      schedule
                    </span>
                    <span className="text-[10px] font-bold text-cm-on-primary">
                      S/.{(court.pricingSchedule && court.pricingSchedule.length > 0 ? court.pricingSchedule[0].pricePerHour : court.pricePerHour || 0)}-{court.pricingSchedule && court.pricingSchedule.length > 1 ? court.pricingSchedule[court.pricingSchedule.length - 1].pricePerHour : court.pricePerHour || 0}/hr
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-base mb-2 truncate">
                    {court.name}
                  </h3>

                  {/* Amenities */}
                  {court.amenities && court.amenities.length > 0 && (
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
                  )}

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
                          <p className="font-[family-name:var(--font-sora)] text-lg font-bold text-cm-primary">
                            S/. {court.pricePerHour}
                            <span className="text-[10px] text-cm-on-surface-variant font-normal ml-0.5">/hr</span>
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedCourt(court.id)
                        setView('court-detail')
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
      </div>
    </div>
  )
}
