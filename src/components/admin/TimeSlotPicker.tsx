'use client'

import { useMemo, useCallback, useState } from 'react'
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

/* ──────────────────────────────────────────────
   Period definitions — each groups a range of hours
   ────────────────────────────────────────────── */
const PERIODS = [
  { key: 'morning',   label: 'MAÑANA', icon: 'light_mode', startH: 6,  endH: 11 },
  { key: 'afternoon', label: 'TARDE',   icon: 'wb_sunny',   startH: 12, endH: 17 },
  { key: 'evening',   label: 'NOCHE',   icon: 'dark_mode',  startH: 18, endH: 23 },
]

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
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null)

  const allSlots = useMemo(
    () => generateTimeSlots(startHour, endHour, [0, 30]),
    [startHour, endHour],
  )

  /* ── occupied set ── */
  const occupiedSet = useMemo(() => {
    const set = new Set<string>()
    for (const occ of occupied) {
      for (const slot of allSlots) {
        if (slot.value >= occ.startTime && slot.value < occ.endTime) {
          set.add(slot.value)
        }
      }
    }
    return set
  }, [occupied, allSlots])

  /* ── derived booleans ── */
  const hasStart = !!startTime
  const hasEnd   = !!endTime && endTime > startTime
  const fmt      = (v: string) => (use12hFormat ? formatTime12(v) : formatTime24(v))
  const isOcc    = (v: string) => occupiedSet.has(v)
  const isSel    = (v: string) => hasStart && hasEnd && v >= startTime && v < endTime
  const isSrt    = (v: string) => v === startTime && hasEnd
  const isEndM   = (v: string) => v === endTime   && hasEnd
  const isRng    = (v: string) => hasStart && !hasEnd && v >= startTime

  /* ── click handler (two-tap range) ── */
  const handleClick = useCallback(
    (v: string) => {
      if (disabled || isOcc(v)) return
      if (!hasStart || (hasStart && hasEnd)) {
        onChange(v, '')
      } else if (v <= startTime) {
        onChange(v, '')
      } else {
        onChange(startTime, v)
      }
    },
    [disabled, hasStart, hasEnd, startTime, isOcc, onChange],
  )

  /* ── theme tokens ── */
  const isPurple = theme === 'purple'
  const accent   = isPurple ? '#a855f7' : '#00ff41'
  const rgb      = isPurple ? '168,85,247' : '0,255,65'

  /* ── duration helpers ── */
  const duration = useMemo(() => {
    if (!hasStart || !hasEnd) return null
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    return (eh * 60 + em) - (sh * 60 + sm)
  }, [startTime, endTime, hasStart, hasEnd])

  const durationLabel = duration !== null
    ? duration >= 60
      ? `${Math.floor(duration / 60)}h${duration % 60 ? ` ${duration % 60}min` : ''}`
      : `${duration} min`
    : null

  const selectedCount = hasStart && hasEnd
    ? allSlots.filter(s => s.value >= startTime && s.value < endTime).length
    : 0

  /* ── group slots by period ── */
  const periods = useMemo(
    () =>
      PERIODS.filter(p => p.endH >= startHour && p.startH <= endHour).map(p => ({
        ...p,
        slots: allSlots.filter(s => {
          const h = parseInt(s.value.split(':')[0], 10)
          return h >= p.startH && h <= p.endH
        }),
      })),
    [allSlots, startHour, endHour],
  )

  /* ─────────────────── RENDER ─────────────────── */
  return (
    <div className="space-y-3">
      {/* ═══ Selection info bar ═══ */}
      <div
        className="relative overflow-hidden rounded-xl px-3 py-2.5"
        style={{
          background: `linear-gradient(135deg, rgba(${rgb},0.07), rgba(${rgb},0.02))`,
          border: `1px solid rgba(${rgb},0.12)`,
        }}
      >
        {/* scanline decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-y-0 w-10"
            style={{
              background: `linear-gradient(90deg, transparent, rgba(${rgb},0.07), transparent)`,
              animation: 'tsp-scan 4s linear infinite',
            }}
          />
        </div>

        <div className="relative flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="material-symbols-outlined text-[16px] flex-shrink-0"
              style={{ color: accent, fontVariationSettings: '"FILL" 1' }}
            >
              schedule
            </span>

            {hasStart && hasEnd ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-sm font-bold font-[family-name:var(--font-sora)] whitespace-nowrap"
                  style={{ color: accent }}
                >
                  {fmt(startTime)} — {fmt(endTime)}
                </span>
                {durationLabel && (
                  <span
                    className="text-[10px] font-semibold font-[family-name:var(--font-inter)] px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{ background: `rgba(${rgb},0.15)`, color: accent }}
                  >
                    {durationLabel}
                  </span>
                )}
                <span className="text-[10px] text-cm-on-surface-variant/30 font-[family-name:var(--font-inter)]">
                  {selectedCount} bloque{selectedCount !== 1 ? 's' : ''}
                </span>
              </div>
            ) : hasStart ? (
              <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] truncate">
                Inicio:{' '}
                <span style={{ color: accent }}>{fmt(startTime)}</span>
                <span className="text-cm-on-surface-variant/40"> → toca la hora de fin</span>
              </span>
            ) : (
              <span className="text-xs text-cm-on-surface-variant/40 font-[family-name:var(--font-inter)]">
                Selecciona un horario
              </span>
            )}
          </div>

          {hasStart && hasEnd && (
            <button
              type="button"
              onClick={() => onChange('', '')}
              className="flex-shrink-0 text-cm-on-surface-variant/40 hover:text-red-400 transition-colors flex items-center gap-0.5"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
              <span className="text-[10px] font-[family-name:var(--font-inter)] hidden sm:inline">
                Limpiar
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ═══ Period grids ═══ */}
      <div className="space-y-4">
        {periods.map((period) => (
          <div key={period.key}>
            {/* period header */}
            <div className="flex items-center gap-2 mb-2 px-0.5">
              <span
                className="material-symbols-outlined text-[12px]"
                style={{ color: `rgba(${rgb},0.35)`, fontVariationSettings: '"FILL" 1' }}
              >
                {period.icon}
              </span>
              <span
                className="text-[9px] font-bold font-[family-name:var(--font-inter)] uppercase tracking-[0.2em]"
                style={{ color: `rgba(${rgb},0.35)` }}
              >
                {period.label}
              </span>
              <div
                className="flex-1 h-px"
                style={{
                  background: `linear-gradient(to right, rgba(${rgb},0.1), transparent)`,
                }}
              />
            </div>

            {/* slot grid — 3 cols mobile, 4 sm, 6 md+ */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
              {period.slots.map((ts) => {
                const occ = isOcc(ts.value)
                const sel = isSel(ts.value)
                const srt = isSrt(ts.value)
                const end = isEndM(ts.value)
                const inR = isRng(ts.value)
                const hov = hoveredSlot === ts.value && !disabled

                const hour   = parseInt(ts.value.split(':')[0], 10)
                const minute = ts.value.split(':')[1]
                const isHourSlot = minute === '00'

                /* display label */
                let label: string
                if (use12hFormat) {
                  label = isHourSlot
                    ? formatTime12(ts.value).replace(':00', '')
                    : `:${minute}`
                } else {
                  label = isHourSlot ? `${hour}:00` : `:${minute}`
                }

                const ampm =
                  use12hFormat && isHourSlot ? (hour < 12 ? 'AM' : 'PM') : ''

                /* ── cell styles ── */
                let cellStyle: React.CSSProperties
                let labelColor: string | undefined

                if (occ) {
                  cellStyle = {
                    background: 'rgba(239,68,68,0.05)',
                    border: '1px solid rgba(239,68,68,0.1)',
                  }
                  labelColor = undefined
                } else if (sel) {
                  cellStyle = {
                    background: `linear-gradient(135deg, rgba(${rgb},0.22), rgba(${rgb},0.08))`,
                    border: `1px solid rgba(${rgb},0.45)`,
                    boxShadow: `0 0 20px rgba(${rgb},0.1), inset 0 0 20px rgba(${rgb},0.05)`,
                  }
                  labelColor = accent
                } else if (inR) {
                  cellStyle = {
                    background: `rgba(${rgb},0.06)`,
                    border: `1px dashed rgba(${rgb},0.22)`,
                  }
                  labelColor = accent
                } else if (hov) {
                  cellStyle = {
                    background: `rgba(${rgb},0.08)`,
                    border: `1px solid rgba(${rgb},0.2)`,
                  }
                  labelColor = accent
                } else {
                  cellStyle = {
                    background: 'rgba(255,255,255,0.015)',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }
                  labelColor = undefined
                }

                return (
                  <button
                    key={ts.value}
                    type="button"
                    disabled={disabled || occ}
                    onClick={() => handleClick(ts.value)}
                    onMouseEnter={() => setHoveredSlot(ts.value)}
                    onMouseLeave={() => setHoveredSlot(null)}
                    className={[
                      'relative rounded-xl text-center py-2.5 sm:py-3',
                      'transition-all duration-200 font-[family-name:var(--font-inter)]',
                      occ ? 'cursor-not-allowed' : 'cursor-pointer active:scale-[0.96]',
                    ].join(' ')}
                    style={cellStyle}
                    title={occ ? 'Ocupado' : fmt(ts.value)}
                  >
                    {/* primary label */}
                    <span
                      className={[
                        'block text-[13px] sm:text-sm font-bold leading-none',
                        occ ? 'text-red-400/40' : labelColor ? '' : 'text-cm-on-surface/60',
                      ].join(' ')}
                      style={!occ && labelColor ? { color: labelColor } : undefined}
                    >
                      {occ ? (
                        <span
                          className="material-symbols-outlined text-[16px]"
                          style={{ fontVariationSettings: '"FILL" 1' }}
                        >
                          block
                        </span>
                      ) : (
                        label
                      )}
                    </span>

                    {/* AM/PM sub-label for hour slots */}
                    {!occ && ampm && (
                      <span
                        className="block text-[7px] mt-1 font-[family-name:var(--font-inter)] font-semibold"
                        style={{ color: `rgba(${rgb},0.45)` }}
                      >
                        {ampm}
                      </span>
                    )}

                    {/* ":30" sub-label for half-hour slots */}
                    {!occ && !isHourSlot && (
                      <span className="block text-[7px] mt-1 font-[family-name:var(--font-inter)] text-cm-on-surface-variant/20">
                        {minute}
                      </span>
                    )}

                    {/* start marker */}
                    {srt && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                        style={{
                          background: accent,
                          boxShadow: `0 0 10px ${accent}`,
                          animation: 'tsp-pulse 2s ease-in-out infinite',
                        }}
                      />
                    )}

                    {/* end marker */}
                    {end && (
                      <div
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-l-full"
                        style={{
                          background: accent,
                          boxShadow: `0 0 10px ${accent}`,
                          animation: 'tsp-pulse 2s ease-in-out infinite',
                        }}
                      />
                    )}

                    {/* selected glow overlay */}
                    {sel && !occ && (
                      <div
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        style={{
                          background: `radial-gradient(ellipse at center, rgba(${rgb},0.08), transparent 70%)`,
                        }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Legend ═══ */}
      <div className="flex items-center gap-4 pt-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded"
            style={{
              background: 'rgba(255,255,255,0.015)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}
          />
          <span className="text-[9px] text-cm-on-surface-variant/30 font-[family-name:var(--font-inter)]">
            Disponible
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded"
            style={{
              background: `linear-gradient(135deg, rgba(${rgb},0.22), rgba(${rgb},0.08))`,
              border: `1px solid rgba(${rgb},0.45)`,
              boxShadow: `0 0 6px rgba(${rgb},0.15)`,
            }}
          />
          <span className="text-[9px] text-cm-on-surface-variant/30 font-[family-name:var(--font-inter)]">
            Seleccionado
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded"
            style={{
              background: 'rgba(239,68,68,0.05)',
              border: '1px solid rgba(239,68,68,0.1)',
            }}
          />
          <span className="text-[9px] text-cm-on-surface-variant/30 font-[family-name:var(--font-inter)]">
            Ocupado
          </span>
        </div>
      </div>
    </div>
  )
}