'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { useAppStore } from '@/store/useAppStore'
import { motion, useInView } from 'framer-motion'

interface SportCard {
  id: string
  label: string
  icon: string
  image: string
  count: number
  priceRange: string
  badge?: string
  amenities: string[]
  gradientFrom: string
  gradientTo: string
}

const sports: SportCard[] = [
  {
    id: 'futbol',
    label: 'Fútbol 5',
    icon: 'sports_soccer',
    image: '/cancha-futbol-1.png',
    count: 4,
    priceRange: 'S/. 50',
    badge: '3ra cancha techada',
    amenities: ['Cesped sintetico', 'Iluminacion LED', 'Vestuarios', 'Duchas', 'Estacionamiento'],
    gradientFrom: 'from-green-900/80',
    gradientTo: 'to-cm-background/95',
  },
  {
    id: 'voley',
    label: 'Vóley',
    icon: 'sports_volleyball',
    image: '/cancha-voley.png',
    count: 2,
    priceRange: 'S/. 35',
    badge: undefined,
    amenities: ['Piso PVC profesional', 'Red reglamentaria', 'Iluminacion LED', 'Techado'],
    gradientFrom: 'from-emerald-900/80',
    gradientTo: 'to-cm-background/95',
  },
]

const amenityLabels: Record<string, string> = {
  'cesped sintetico': 'Cesped Sintetico',
  'iluminacion led': 'Iluminacion LED',
  'vestuarios': 'Vestuarios',
  'duchas': 'Duchas',
  'estacionamiento': 'Estacionamiento',
  'piso pvc profesional': 'Piso PVC Pro',
  'red reglamentaria': 'Red Reglamentaria',
  'techado': 'Techado',
}

export default function SportsSection() {
  const { setView, setSportFilter } = useAppStore()
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  const handleSportClick = (sportId: string) => {
    setSportFilter(sportId)
    setView('search')
  }

  return (
    <section ref={sectionRef} className="py-12 md:py-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cm-primary/10 border border-cm-primary/15 mb-4">
            <span className="material-symbols-outlined text-cm-primary text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>
              emoji_events
            </span>
            <span className="text-xs font-semibold text-cm-primary uppercase tracking-wider font-[family-name:var(--font-inter)]">
              Nuestras Instalaciones
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-sora)] text-2xl md:text-3xl font-bold text-cm-on-surface">
            Deporte de primer nivel
          </h2>
          <p className="text-cm-on-surface-variant text-sm md:text-base mt-2 max-w-lg mx-auto font-[family-name:var(--font-inter)]">
            6 espacios disponibles con la mejor infraestructura deportiva del Cusco
          </p>
        </motion.div>

        {/* Sport Cards */}
        <div className="space-y-5 md:space-y-6">
          {sports.map((sport, index) => (
            <motion.button
              key={sport.id}
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{
                duration: 0.7,
                delay: index * 0.15,
                ease: [0.25, 0.4, 0.25, 1],
              }}
              onClick={() => handleSportClick(sport.id)}
              className="w-full text-left glass-card rounded-2xl overflow-hidden group hover:border-cm-primary/30 hover:shadow-[0_0_30px_rgba(0,255,65,0.08)] transition-all duration-400 cursor-pointer"
            >
              <div className="relative h-52 md:h-72">
                {/* Background Image */}
                <Image
                  src={sport.image}
                  alt={sport.label}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  unoptimized
                />

                {/* Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-r ${sport.gradientFrom} ${sport.gradientTo}`} />

                {/* Content */}
                <div className="absolute inset-0 p-5 md:p-8 flex flex-col justify-between">
                  {/* Top Row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-cm-primary/20 backdrop-blur-sm border border-cm-primary/30 flex items-center justify-center">
                        <span className="material-symbols-outlined text-cm-primary text-[24px] md:text-[28px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                          {sport.icon}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-[family-name:var(--font-sora)] text-xl md:text-2xl font-bold text-cm-on-surface">
                          {sport.label}
                        </h3>
                        <p className="text-cm-on-surface-variant text-sm font-[family-name:var(--font-inter)]">
                          {sport.count} {sport.count === 1 ? 'espacio disponible' : 'espacios disponibles'}
                        </p>
                      </div>
                    </div>

                    {/* Badge */}
                    {sport.badge && (
                      <div className="px-3 py-1.5 rounded-full bg-cm-primary/20 backdrop-blur-sm border border-cm-primary/30">
                        <span className="text-cm-primary text-xs font-bold font-[family-name:var(--font-inter)]">
                          {sport.badge}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Row */}
                  <div className="flex items-end justify-between gap-4">
                    {/* Amenities */}
                    <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                      {sport.amenities.slice(0, 4).map((amenity, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-[10px] md:text-xs font-medium"
                        >
                          <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                            check
                          </span>
                          {amenityLabels[amenity.toLowerCase()] || amenity}
                        </span>
                      ))}
                    </div>

                    {/* Price */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-cm-on-surface-variant text-[10px] md:text-xs font-medium">Desde</p>
                      <p className="font-[family-name:var(--font-sora)] text-2xl md:text-3xl font-bold text-cm-primary text-glow">
                        {sport.priceRange}
                        <span className="text-xs md:text-sm text-cm-on-surface-variant font-normal">/hr</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  )
}
