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

export default function FeaturedCourts() {
  const { setView, setSelectedCourt } = useAppStore()
  const [courts, setCourts] = useState<Court[]>([])

  useEffect(() => {
    fetch('/api/courts')
      .then((res) => res.json())
      .then((data) => setCourts(data.slice(0, 6)))
      .catch(console.error)
  }, [])

  const handleCourtClick = (courtId: string) => {
    setSelectedCourt(courtId)
    setView('court-detail')
  }

  return (
    <section className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-cm-on-surface">
              Canchas Destacadas
            </h2>
            <p className="text-cm-on-surface-variant text-sm mt-1 font-[family-name:var(--font-inter)]">
              Las mejores canchas recomendadas para ti
            </p>
          </div>
          <button
            onClick={() => setView('search')}
            className="flex items-center gap-1 text-cm-primary text-sm font-semibold hover:text-glow transition-all"
          >
            Ver Todas
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>

        {/* Horizontal Scroll */}
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
          <div className="flex gap-4 pb-2">
            {courts.map((court, index) => (
              <motion.div
                key={court.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="glass-card rounded-2xl overflow-hidden cursor-pointer hover:border-cm-primary/30 transition-all duration-300 group min-w-[280px] md:min-w-[340px] flex-shrink-0"
                onClick={() => handleCourtClick(court.id)}
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
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

                  {/* Rating Badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-cm-surface/80 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-yellow-400 text-[14px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                      star
                    </span>
                    <span className="text-xs font-semibold text-cm-on-surface">{court.rating}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-base mb-1 truncate">
                    {court.name}
                  </h3>
                  <div className="flex items-center gap-1 text-cm-on-surface-variant text-xs mb-3">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    <span className="font-[family-name:var(--font-inter)]">
                      {court.branch.name}, {court.branch.city}
                    </span>
                  </div>
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
        </div>
      </div>
    </section>
  )
}
