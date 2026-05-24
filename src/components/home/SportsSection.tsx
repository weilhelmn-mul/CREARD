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
    count: 2,
    color: 'from-blue-500/20 to-blue-700/10',
    borderColor: 'border-blue-500/20',
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
            Nuestras Instalaciones
          </h2>
          <p className="text-cm-on-surface-variant text-sm mt-2 font-[family-name:var(--font-inter)]">
            6 espacios disponibles para tu deporte
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 max-w-2xl mx-auto">
          {sports.map((sport, index) => (
            <motion.button
              key={sport.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => handleSportClick(sport.id)}
              className={`glass-card rounded-2xl p-6 md:p-8 flex flex-col items-center gap-3 hover:border-cm-primary/30 transition-all duration-300 group cursor-pointer ${sport.borderColor}`}
            >
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${sport.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                <span className="material-symbols-outlined text-cm-primary text-[32px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                  {sport.icon}
                </span>
              </div>
              <div className="text-center">
                <p className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-lg">
                  {sport.label}
                </p>
                <p className="text-cm-on-surface-variant text-sm font-[family-name:var(--font-inter)]">
                  {sport.count} {sport.count === 1 ? 'espacio' : 'espacios'}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  )
}
