'use client'

import { useAppStore } from '@/store/useAppStore'
import { useState } from 'react'
import { motion } from 'framer-motion'

// Hero section for the home page
const sportOptions = [
  { value: 'todos', label: 'Todos' },
  { value: 'futbol', label: 'Fútbol' },
  { value: 'voley', label: 'Vóley' },
]

export default function HeroSection() {
  const { setView, setSportFilter } = useAppStore()
  const [selectedSport, setSelectedSport] = useState('todos')

  const handleSearch = () => {
    setSportFilter(selectedSport)
    setView('search')
  }

  return (
    <section className="relative overflow-hidden py-16 md:py-24 px-4">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cm-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cm-primary/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cm-primary/10 border border-cm-primary/20 mb-6"
        >
          <span className="material-symbols-outlined text-cm-primary text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>
            bolt
          </span>
          <span className="text-xs font-semibold text-cm-primary uppercase tracking-wider">
            La #1 en reservas deportivas
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-[family-name:var(--font-sora)] text-[40px] md:text-[64px] lg:text-[72px] font-bold leading-[1.1] text-cm-on-surface mb-6"
        >
          Reserva tu cancha{' '}
          <span className="text-cm-primary text-glow">en segundos</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-cm-on-surface-variant text-base md:text-lg max-w-2xl mx-auto mb-10 font-[family-name:var(--font-inter)]"
        >
          4 canchas de fútbol 5 y 2 canchas de vóley. Reserva, paga y disfruta sin complicaciones.
        </motion.p>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass-card rounded-2xl p-3 md:p-4 max-w-2xl mx-auto"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Sport Select */}
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cm-on-surface-variant text-[20px]">
                sports_soccer
              </span>
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm appearance-none cursor-pointer focus:outline-none focus:border-cm-primary/50 transition-colors font-[family-name:var(--font-inter)]"
              >
                {sportOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-cm-surface-container-highest text-cm-on-surface">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-cm-primary text-cm-on-primary font-semibold rounded-xl hover:bg-cm-primary-dim transition-all duration-200 glow-accent font-[family-name:var(--font-sora)]"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                search
              </span>
              Buscar
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-6 md:gap-12 mt-12"
        >
          {[
            { value: '6', label: 'Espacios' },
            { value: '4', label: 'Fútbol 5' },
            { value: '2', label: 'Vóley' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-[family-name:var(--font-sora)] text-2xl md:text-3xl font-bold text-cm-primary text-glow">
                {stat.value}
              </p>
              <p className="text-cm-on-surface-variant text-sm mt-1 font-[family-name:var(--font-inter)]">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
