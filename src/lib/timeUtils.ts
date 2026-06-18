/**
 * Shared time formatting utilities
 * Supports both 24h and 12h (AM/PM) display formats
 * Also supports fractional minutes (e.g. :30)
 */

/** Convert "HH:MM" to 12h format string, e.g. "08:30 AM", "12:00 PM", "11:30 PM" */
export function formatTime12(time: string): string {
  const [hStr, mStr] = time.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr || '0', 10)
  if (h === 0 && m === 0) return '12:00 AM'
  if (h === 0) return `12:${String(m).padStart(2, '0')} AM`
  if (h < 12) return m === 0 ? `${h}:00 AM` : `${h}:${String(m).padStart(2, '0')} AM`
  if (h === 12 && m === 0) return '12:00 PM'
  if (h === 12) return `12:${String(m).padStart(2, '0')} PM`
  return m === 0 ? `${h - 12}:00 PM` : `${h - 12}:${String(m).padStart(2, '0')} PM`
}

/** Keep time in 24h format (passthrough, but ensures MM is present) */
export function formatTime24(time: string): string {
  const [hStr, mStr] = time.split(':')
  return mStr ? time : `${hStr}:00`
}

/** Format a time range "HH:MM - HH:MM" with the given format */
export function formatTimeRange(startTime: string, endTime: string, use12h: boolean): string {
  const fmt = use12h ? formatTime12 : formatTime24
  return `${fmt(startTime)} - ${fmt(endTime)}`
}

/** Generate time slots from startHour to endHour with given minute intervals */
export function generateTimeSlots(
  startHour: number,
  endHour: number,
  minuteIntervals: number[] = [0, 30]
): Array<{ value: string; disabled: boolean; label?: string }> {
  const slots: Array<{ value: string; disabled: boolean; label?: string }> = []
  for (let h = startHour; h <= endHour; h++) {
    for (const m of minuteIntervals) {
      // Skip 00 of the hour after endHour (e.g. if endHour=23, skip 23:30 unless we want it)
      if (h === endHour && m > 0) continue
      slots.push({
        value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        disabled: false,
        label: undefined,
      })
    }
  }
  return slots
}