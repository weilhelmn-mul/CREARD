'use client'

// R4 (OLA 2 UX): hoja de calendario mensual — permite elegir fechas lejanas
// (antes solo existía la tira horizontal de días y "reservar en 3 semanas"
// era imposible). Compartida por CourtDetail y UnifiedBookingView.
// Solo lectura de fechas: no altera ninguna regla de disponibilidad.

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const WEEKDAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

interface DateCalendarSheetProps {
  open: boolean
  selectedISO: string | null
  onSelect: (iso: string) => void
  onClose: () => void
}

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function DateCalendarSheet({ open, selectedISO, onSelect, onClose }: DateCalendarSheetProps) {
  const now = useMemo(() => new Date(), [])
  const [view, setView] = useState(() => ({ y: now.getFullYear(), m: now.getMonth() }))

  // Límite de navegación: 3 meses hacia adelante desde hoy
  const maxMonth = now.getMonth() + 3
  const canPrev = view.y > now.getFullYear() || (view.y === now.getFullYear() && view.m > now.getMonth())
  const canNext = view.y * 12 + view.m < now.getFullYear() * 12 + maxMonth

  const cells = useMemo<(Date | null)[]>(() => {
    const first = new Date(view.y, view.m, 1)
    const startWeekday = first.getDay() // 0 = domingo
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
    const arr: (Date | null)[] = []
    for (let i = 0; i < startWeekday; i++) arr.push(null)
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(view.y, view.m, d))
    return arr
  }, [view])

  const todayISO = toISO(now)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="relative w-full sm:max-w-sm bg-cm-surface-container rounded-t-2xl sm:rounded-2xl border border-white/10 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                disabled={!canPrev}
                onClick={() => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))}
                className="p-2.5 rounded-lg text-cm-on-surface-variant hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Mes anterior"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <p className="text-sm font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">
                {MONTHS_ES[view.m]} {view.y}
              </p>
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))}
                className="p-2.5 rounded-lg text-cm-on-surface-variant hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Mes siguiente"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>

            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((d, i) => (
                <div key={i} className="text-center text-[10px] font-bold text-cm-on-surface-variant/60 uppercase py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((date, i) => {
                if (!date) return <div key={`e-${i}`} />
                const iso = toISO(date)
                const isPast = iso < todayISO
                const isSelected = iso === selectedISO
                const isToday = iso === todayISO
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={isPast}
                    onClick={() => { onSelect(iso); onClose() }}
                    className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
                      isSelected
                        ? 'bg-cm-primary text-[#003907] shadow-lg shadow-cm-primary/25'
                        : isPast
                          ? 'text-cm-on-surface-variant/25 cursor-not-allowed'
                          : 'text-cm-on-surface hover:bg-white/5 active:bg-white/10'
                    } ${isToday && !isSelected ? 'border border-cm-primary/40' : 'border border-transparent'}`}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>

            <p className="text-[11px] text-cm-on-surface-variant text-center mt-3 font-[family-name:var(--font-inter)]">
              Solo fechas de hoy en adelante · hasta 3 meses
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
