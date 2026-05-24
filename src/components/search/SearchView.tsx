'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useAppStore } from '@/store/useAppStore'
import { motion } from 'framer-motion'

interface Court {
  id: string
  name: string
  sport: string
  rating: number
  reviewCount: number
  pricePerHour: number
  images: string[]
  description?: string
  branch: { name: string; city: string }
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

type SortType = 'rating' | 'price-asc' | 'price-desc' | 'name'

export default function SearchView() {
  const { sportFilter, setSportFilter, setSelectedCourt, setView } = useAppStore()
  const [courts, setCourts] = useState<Court[]>([])
  const [localSport, setLocalSport] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortType>('rating')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/courts')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setCourts(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
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
        case 'rating': return b.rating - a.rating
        case 'price-asc': return a.pricePerHour - b.pricePerHour
        case 'price-desc': return b.pricePerHour - a.pricePerHour
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
              <option value="rating">Mejor valoradas</option>
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
                className="glass-card rounded-2xl overflow-hidden cursor-pointer hover:border-cm-primary/30 transition-all duration-300 group"
                onClick={() => handleCourtClick(court.id)}
              >
                {/* Image */}
                <div className="relative h-44 overflow-hidden">
                  <Image
                    src={court.images[0]}
                    alt={court.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                  {/* Sport Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cm-surface/80 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-cm-primary text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                      {sportIcons[court.sport]}
                    </span>
                    <span className="text-xs font-semibold text-cm-primary">
                      {sportLabels[court.sport]}
                    </span>
                  </div>

                  {/* Rating */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-cm-surface/80 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-yellow-400 text-[14px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                      star
                    </span>
                    <span className="text-xs font-semibold text-cm-on-surface">{court.rating}</span>
                    <span className="text-xs text-cm-on-surface-variant">({court.reviewCount})</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-base mb-1 truncate">
                    {court.name}
                  </h3>
                  <div className="flex items-center gap-1 text-cm-on-surface-variant text-xs mb-2">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    <span className="font-[family-name:var(--font-inter)]">
                      {court.branch.name}, {court.branch.city}
                    </span>
                  </div>
                  {court.description && (
                    <p className="text-cm-on-surface-variant text-xs line-clamp-2 mb-3 font-[family-name:var(--font-inter)]">
                      {court.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-[family-name:var(--font-sora)] text-lg font-bold text-cm-primary">
                      ${court.pricePerHour}
                      <span className="text-xs text-cm-on-surface-variant font-normal">/hr</span>
                    </span>
                    <button className="px-4 py-1.5 bg-cm-primary/10 text-cm-primary text-xs font-semibold rounded-lg hover:bg-cm-primary/20 transition-colors">
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
