'use client'

import { useMemo, useRef, useEffect } from 'react'
import { formatTime12, formatTime24, generateTimeSlots } from '@/lib/timeUtils'

interface OccupiedSlot {
  startTime: string
  endTime: string
  label?: string
}

interface TimeSlotPickerProps {
  /** Currently selected start time (HH:MM) */
  startTime: string
  /** Currently selected end time (HH:MM) */
  endTime: string
  /** Called when user selects a complete range */
  onChange: (startTime: string, endTime: string) => void
  /** Occupied/booking ranges to display */
  occupied?: OccupiedSlot[]
  /** 12-hour format */
  use12hFormat?: boolean
  /** Accent color theme: 'primary' (teal) | 'purple' (edit) */
  theme?: 'primary' | 'purple'
  /** Disabled state */
  disabled?: boolean
  /** Hour range */
  startHour?: number
  endHour?: number
}

export default function TimeSlotPicker({
  startTime,
  endTime,
  onChange,
  occupied = [],
  use12hFormat = true,
  theme = 'primary',
  disabled = false,
  startHour = 6,
  endHour = 23,
}: TimeSlotPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const slots = useMemo(
    () => generateTimeSlots(startHour, endHour, [0, 30]),
    [startHour, endHour]
  )

  // Determine which slots are occupied
  const occupiedSet = useMemo(() => {
    const set = new Set<string>()
    for (const occ of occupied) {
      for (const slot of slots) {
        if (slot.value >= occ.startTime && slot.value < occ.endTime) {
          set.add(slot.value)
        }
      }
    }
    return set
  }, [occupied, slots])

  // Selection state: 'start' = waiting for start click, 'end' = waiting for end click
  // We use startTime/endTime from props to determine current phase
  const hasStart = !!startTime
  const hasEnd = !!endTime && endTime > startTime

  const fmt = (v: string) => (use12hFormat ? formatTime12(v) : formatTime24(v))

  const isOccupied = (v: string) => occupiedSet.has(v)
  const isSelected = (v: string) => hasStart && hasEnd && v >= startTime && v < endTime
  const isStart = (v: string) => v === startTime && hasEnd
  const isEnd = (v: string) => v === endTime && hasEnd
  const isInRange = (v: string) => hasStart && !hasEnd && v >= startTime

  const handleClick = (v: string) => {
    if (disabled || isOccupied(v)) return

    if (!hasStart || (hasStart && hasEnd)) {
      // Start fresh selection
      onChange(v, '')
    } else if (v <= startTime) {
      // Clicked before or at start — reset start
      onChange(v, '')
    } else {
      // Set end time
      onChange(startTime, v)
    }
  }

  // Auto-scroll to selected start
  useEffect(() => {
    if (startTime && scrollRef.current) {
      const idx = slots.findIndex(s => s.value === startTime)
      if (idx >= 0) {
        const slotEl = scrollRef.current.children[idx] as HTMLElement
        if (slotEl) {
          slotEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
        }
      }
    }
  }, [startTime, slots])

  const accent = theme === 'purple'
    ? {
        bg: 'bg-purple-500/20',
        border: 'border-purple-400/50',
        text: 'text-purple-300',
        glow: 'shadow-[0_0_8px_rgba(168,85,247,0.3)]',
        selected: 'bg-purple-500/25',
        range: 'bg-purple-500/8',
        occupied: 'bg-red-500/15 text-red-400/40',
        pulse: 'animate-pulse',
      }
    : {
        bg: 'bg-cm-primary/20',
        border: 'border-cm-primary/50',
        text: 'text-cm-primary',
        glow: 'shadow-[0_0_8px_rgba(0,229,160,0.3)]',
        selected: 'bg-cm-primary/25',
        range: 'bg-cm-primary/8',
        occupied: 'bg-red-500/15 text-red-400/40',
        pulse: 'animate-pulse',
      }

  return (
    <div className="space-y-2">
      {/* Selection info bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px] {accent.text}" style={{ fontVariationSettings: '"FILL" 1' }}>
            schedule
          </span>
          <span className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
            {hasStart && hasEnd
              ? `${fmt(startTime)} — ${fmt(endTime)}`
              : hasStart
                ? `Inicio: ${fmt(startTime)} — toca el fin`
                : 'Toca la hora de inicio'}
          </span>
        </div>
        {hasStart && hasEnd && (
          <button
            type="button"
            onClick={() => onChange('', '')}
            className="text-[10px] text-cm-on-surface-variant/60 hover:text-red-400 transition-colors font-[family-name:var(--font-inter)]"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Timeline */}
      <div
        ref={scrollRef}
        className="flex gap-[3px] overflow-x-auto pb-1 no-scrollbar scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {slots.map((ts, i) => {
          const occ = isOccupied(ts.value)
          const sel = isSelected(ts.value)
          const srt = isStart(ts.value)
          const end = isEnd(ts.value)
          const inR = isInRange(ts.value)

          // Hour marker
          const showHour = ts.value.endsWith(':00')
          const prevShowHour = i > 0 && slots[i - 1].value.endsWith(':00')

          return (
            <div key={ts.value} className="flex flex-col items-center flex-shrink-0">
              {/* Hour label */}
              {showHour && (
                <span className={`text-[9px] font-bold font-[family-name:var(--font-inter)] mb-1 ${occ ? 'text-red-400/40' : 'text-cm-on-surface-variant/70'}`}>
                  {use12hFormat ? formatTime12(ts.value).replace(':00', '') : ts.value.slice(0, 2)}
                </span>
              )}
              {!showHour && !prevShowHour && i === 0 && (
                <span className="w-6 h-3" />
              )}

              {/* Slot button */}
              <button
                type="button"
                disabled={disabled || occ}
                onClick={() => handleClick(ts.value)}
                className={`
                  relative w-[42px] h-[38px] rounded-lg text-[10px] font-semibold font-[family-name:var(--font-inter)]
                  transition-all duration-200 flex items-center justify-center
                  ${occ
                    ? `${accent.occupied} cursor-not-allowed border border-red-500/10`
                    : sel
                      ? `${accent.selected} ${accent.border} ${accent.glow} ${accent.text} border`
                      : inR
                        ? `${accent.range} ${accent.text}/60 border border-dashed border-current/20 hover:${accent.selected}`
                        : `${accent.bg}/40 text-cm-on-surface/70 border border-white/5 hover:${accent.bg} hover:${accent.text} hover:border-current/30`
                  }
                  ${srt ? 'rounded-l-lg' : ''}
                  ${end ? 'rounded-r-lg' : ''}
                  ${!srt && !end && sel ? 'rounded-none' : ''}
                  ${srt && !end ? 'rounded-r-lg' : ''}
                  ${!srt && end ? 'rounded-l-lg' : ''}
                `}
                title={
                  occ
                    ? 'Ocupado'
                    : sel
                      ? `${fmt(ts.value)} (seleccionado)`
                      : fmt(ts.value)
                }
              >
                {/* Occupied indicator */}
                {occ && (
                  <span className="material-symbols-outlined text-[12px] opacity-50" style={{ fontVariationSettings: '"FILL" 1' }}>
                    block
                  </span>
                )}

                {/* Selected range content */}
                {sel && !occ && (
                  <span className="relative z-10">
                    {srt ? fmt(ts.value) : end ? fmt(ts.value) : '▎'}
                  </span>
                )}

                {/* In-range (waiting for end) */}
                {inR && !sel && !occ && (
                  <span className="opacity-50">▎</span>
                )}

                {/* Available empty */}
                {!occ && !sel && !inR && (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {ts.value.slice(3)}
                  </span>
                )}

                {/* Start cap glow */}
                {srt && (
                  <div className={`absolute -left-[1px] top-1 bottom-1 w-[2px] rounded-full ${accent.text} ${accent.pulse}`} />
                )}
              </button>

              {/* :30 sub-label */}
              {!showHour && (
                <span className={`text-[7px] mt-0.5 font-[family-name:var(--font-inter)] ${occ ? 'text-red-400/30' : 'text-cm-on-surface-variant/30'}`}>
                  :30
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-cm-primary/30 border border-cm-primary/30" />
          <span className="text-[9px] text-cm-on-surface-variant/50 font-[family-name:var(--font-inter)]">Disponible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-cm-primary/25 border border-cm-primary/50 shadow-[0_0_4px_rgba(0,229,160,0.2)]" />
          <span className="text-[9px] text-cm-on-surface-variant/50 font-[family-name:var(--font-inter)]">Seleccionado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-red-500/15 border border-red-500/10" />
          <span className="text-[9px] text-cm-on-surface-variant/50 font-[family-name:var(--font-inter)]">Ocupado</span>
        </div>
      </div>
    </div>
  )
}