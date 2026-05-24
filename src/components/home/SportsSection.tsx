'use client'

import { useAppStore } from '@/store/useAppStore'
import { motion } from 'framer-motion'

const sports = [
  {
    id: 'futbol',
    label: 'Fútbol',
    icon: 'sports_soccer',
    count: 4,
    color: 'from-green-500/20 to-green-700/10',
    borderColor: 'border-green-500/20',
  },
  {
    id: 'voley',
    label: 'Vóley',
    icon: 'sports_volleyball',
    count: 1,
    color: 'from-blue-500/20 to-blue-700/10',
    borderColor: 'border-blue-500/20',
  },
  {
    id: 'basket',
    label: 'Básquet',
    icon: 'sports_basketball',
    count: 1,
    color: 'from-orange-500/20 to-orange-700/10',
    borderColor: 'border-orange-500/20',
  },
  {
    id: 'tenis',
    label: 'Tenis',
    icon: 'sports_tennis',
    count: 1,
    color: 'from-yellow-500/20 to-yellow-700/10',
    borderColor: 'border-yellow-500/20',
  },
  {
    id: 'eventos',
    label: 'Eventos',
    icon: 'celebration',
    count: 1,
    color: 'from-purple-500/20 to-purple-700/10',
    borderColor: 'border-purple-500/20',
  },
]

export default function SportsSection() {
  const { setView, setSportFilter } = useAppStore()

  const handleSportClick = (sportId: string) => {
    setSportFilter(sportId)
    setView('search')
  }

  return (
    <section className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-cm-on-surface">
            Explora por Deporte
          </h2>
          <p className="text-cm-on-surface-variant text-sm mt-2 font-[family-name:var(--font-inter)]">
            Encuentra la cancha perfecta para tu deporte favorito
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
          {sports.map((sport, index) => (
            <motion.button
              key={sport.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => handleSportClick(sport.id)}
              className={`glass-card rounded-2xl p-5 md:p-6 flex flex-col items-center gap-3 hover:border-cm-primary/30 transition-all duration-300 group cursor-pointer ${sport.borderColor}`}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${sport.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                <span className="material-symbols-outlined text-cm-primary text-[28px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                  {sport.icon}
                </span>
              </div>
              <div className="text-center">
                <p className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-sm">
                  {sport.label}
                </p>
                <p className="text-cm-on-surface-variant text-xs font-[family-name:var(--font-inter)]">
                  {sport.count} cancha{sport.count !== 1 ? 's' : ''}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  )
}
