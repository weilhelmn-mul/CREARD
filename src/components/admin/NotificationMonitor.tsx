'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getAuthHeaders } from '@/lib/auth-helpers'

/* ═══════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════ */

export interface NotificationSettings {
  enabled: boolean
  warningMinutesBefore: number   // minutos antes del fin para alerta previa
  soundEnabled: boolean
  soundVolume: number            // 0-1
  googleChatWebhookUrl: string
  googleTasksEnabled: boolean
  whatsappEnabled: boolean
  whatsappApiUrl: string
  whatsappAuthToken: string
  whatsappAdminPhone: string
  whatsappClientReminder: boolean
  whatsappClientMinutesBefore: number
}

export interface BookingAlert {
  bookingId: string
  courtName: string
  endTime: string
  remainingMinutes: number
  alertType: 'warning' | 'expired'  // warning = N min antes, expired = turno terminado
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  warningMinutesBefore: 5,
  soundEnabled: true,
  soundVolume: 0.6,
  googleChatWebhookUrl: '',
  googleTasksEnabled: false,
  whatsappEnabled: false,
  whatsappApiUrl: '',
  whatsappAuthToken: '',
  whatsappAdminPhone: '',
  whatsappClientReminder: false,
  whatsappClientMinutesBefore: 10,
}

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */

/** Get current time in Lima timezone as HH:MM */
function nowInLima(): { hours: number; minutes: number; timeStr: string; dateStr: string } {
  const now = new Date()
  const limaStr = now.toLocaleString('en-US', { timeZone: 'America/Lima', hour12: false })
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

  // Parse the time from the locale string
  const timeMatch = limaStr.match(/(\d{1,2}):(\d{2}):?(\d{2})?/)
  const hours = timeMatch ? parseInt(timeMatch[1]) : 0
  const minutes = timeMatch ? parseInt(timeMatch[2]) : 0

  return {
    hours,
    minutes,
    timeStr: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    dateStr,
  }
}

/** Convert HH:MM to total minutes since midnight */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Play an alert beep using Web Audio API */
function playBeep(frequency: number, durationMs: number, volume: number): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gainNode.gain.value = volume

      // Fade in/out for cleaner sound
      gainNode.gain.setValueAtTime(0, ctx.currentTime)
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05)
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + durationMs / 1000)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + durationMs / 1000)

      setTimeout(() => {
        ctx.close()
        resolve()
      }, durationMs + 100)
    } catch {
      resolve()
    }
  })
}

/** Play a triple-beep alert pattern */
async function playAlertSound(volume: number, type: 'warning' | 'expired') {
  if (typeof window === 'undefined') return
  try {
    if (type === 'warning') {
      // Two short high beeps
      await playBeep(880, 200, volume)
      await new Promise(r => setTimeout(r, 150))
      await playBeep(880, 200, volume)
    } else {
      // Three urgent lower beeps
      await playBeep(660, 300, volume)
      await new Promise(r => setTimeout(r, 100))
      await playBeep(660, 300, volume)
      await new Promise(r => setTimeout(r, 100))
      await playBeep(880, 400, volume)
    }
  } catch { /* silent fail */ }
}

/* ═══════════════════════════════════════════════════
   HOOK: useBookingAlarm
   ═══════════════════════════════════════════════════ */

interface ActiveBooking {
  id: string
  date: string
  startTime: string
  endTime: string
  court?: { name: string } | null
  courts?: Array<{ name: string }> | null
  status: string
  user?: { name: string; phone?: string } | null
}

export function useBookingAlarm(bookings: ActiveBooking[], settings: NotificationSettings) {
  const [alerts, setAlerts] = useState<BookingAlert[]>([])
  const [alertingIds, setAlertingIds] = useState<Set<string>>(new Set())
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  // Track which bookings have already triggered an alert (to avoid re-triggering)
  const triggeredWarnings = useRef<Set<string>>(new Set())
  const triggeredExpired = useRef<Set<string>>(new Set())
  const lastSoundTime = useRef<number>(0)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const checkAlarms = useCallback(() => {
    const s = settingsRef.current
    if (!s.enabled) {
      setAlertingIds(new Set())
      return
    }

    const { timeStr: currentTime, dateStr: todayDate } = nowInLima()
    const currentMinutes = timeToMinutes(currentTime)
    const warningThreshold = s.warningMinutesBefore

    const newAlerts: BookingAlert[] = []
    const newAlertingIds = new Set<string>()

    for (const b of bookings) {
      // Only check today's non-cancelled bookings
      if (b.date !== todayDate || b.status === 'cancelled') continue

      const endMinutes = timeToMinutes(b.endTime)
      const remaining = endMinutes - currentMinutes

      const courtName = b.courts && b.courts.length > 0
        ? b.courts.map(c => c.name).join(', ')
        : b.court?.name || 'Cancha'

      // EXPIRED: time has passed
      if (remaining <= 0 && remaining > -15) {
        // Within 15 minutes after end — show expired alert
        const alertKey = `${b.id}-expired`
        newAlertingIds.add(b.id)

        if (!triggeredExpired.current.has(b.id) && !dismissedIds.has(alertKey)) {
          triggeredExpired.current.add(b.id)
          newAlerts.push({
            bookingId: b.id,
            courtName,
            endTime: b.endTime,
            remainingMinutes: 0,
            alertType: 'expired',
          })
        }
      }
      // WARNING: approaching end
      else if (remaining > 0 && remaining <= warningThreshold) {
        const alertKey = `${b.id}-warning`
        newAlertingIds.add(b.id)

        if (!triggeredWarnings.current.has(b.id) && !dismissedIds.has(alertKey)) {
          triggeredWarnings.current.add(b.id)
          newAlerts.push({
            bookingId: b.id,
            courtName,
            endTime: b.endTime,
            remainingMinutes: Math.ceil(remaining),
            alertType: 'warning',
          })
        }
      }
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 20)) // Keep max 20

      // Play sound (with cooldown: max once per 30 seconds)
      const now = Date.now()
      if (s.soundEnabled && now - lastSoundTime.current > 30000) {
        lastSoundTime.current = now
        const type = newAlerts.some(a => a.alertType === 'expired') ? 'expired' : 'warning'
        playAlertSound(s.soundVolume, type)
      }

      // Dispatch webhooks (best effort)
      dispatchNotifications(newAlerts, bookings, s)
    }

    setAlertingIds(newAlertingIds)
  }, [bookings, dismissedIds])

  // Poll every 15 seconds
  useEffect(() => {
    checkAlarms()
    const interval = setInterval(checkAlarms, 15000)
    return () => clearInterval(interval)
  }, [checkAlarms])

  const dismissAlert = useCallback((bookingId: string, type: string) => {
    const key = `${bookingId}-${type}`
    setDismissedIds(prev => new Set(prev).add(key))
    setAlerts(prev => prev.filter(a => !(a.bookingId === bookingId && a.alertType === type)))
  }, [])

  const clearAllAlerts = useCallback(() => {
    setAlerts([])
    setDismissedIds(new Set())
  }, [])

  const getAlertLevel = useCallback((bookingId: string): 'none' | 'warning' | 'expired' => {
    if (!alertingIds.has(bookingId)) return 'none'
    const alert = alerts.find(a => a.bookingId === bookingId)
    return alert?.alertType || 'warning'
  }, [alertingIds, alerts])

  return { alerts, alertingIds, dismissAlert, clearAllAlerts, getAlertLevel }
}

/* ═══════════════════════════════════════════════════
   WEBHOOK DISPATCH (Client-side call to server)
   ═══════════════════════════════════════════════════ */

async function dispatchNotifications(
  alerts: BookingAlert[],
  bookings: ActiveBooking[],
  settings: NotificationSettings
) {
  try {
    const enrichedAlerts = alerts.map(a => {
      const booking = bookings.find(b => b.id === a.bookingId)
      return {
        ...a,
        userName: booking?.user?.name || '',
        userPhone: booking?.user?.phone || '',
        startTime: booking?.startTime || '',
      }
    })

    const headers = getAuthHeaders()
    const res = await fetch('/api/notifications/dispatch', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ alerts: enrichedAlerts, settings }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.warn('[NotificationMonitor] Dispatch failed:', err)
    }
  } catch (err) {
    console.warn('[NotificationMonitor] Dispatch error:', err)
  }
}

/* ═══════════════════════════════════════════════════
   COMPONENT: NotificationBanner
   ═══════════════════════════════════════════════════ */

interface NotificationBannerProps {
  alerts: BookingAlert[]
  onDismiss: (bookingId: string, type: string) => void
  onClearAll: () => void
}

export function NotificationBanner({ alerts, onDismiss, onClearAll }: NotificationBannerProps) {
  const [expanded, setExpanded] = useState(true)

  if (alerts.length === 0) return null

  const hasExpired = alerts.some(a => a.alertType === 'expired')

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[200] transition-all duration-300 ${
        expanded ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div
        className={`mx-4 mt-2 rounded-b-2xl rounded-t-lg shadow-2xl border backdrop-blur-xl ${
          hasExpired
            ? 'bg-red-950/90 border-red-500/40'
            : 'bg-amber-950/90 border-amber-500/40'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`relative`}>
              <span
                className="material-symbols-outlined text-[22px] animate-pulse"
                style={{ fontVariationSettings: '"FILL" 1', color: hasExpired ? '#f87171' : '#fbbf24' }}
              >
                {hasExpired ? 'alarm' : 'notifications_active'}
              </span>
              {alerts.length > 1 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                  {alerts.length}
                </span>
              )}
            </div>
            <div>
              <p className={`text-sm font-bold ${hasExpired ? 'text-red-300' : 'text-amber-300'} font-[family-name:var(--font-sora)]`}>
                {hasExpired ? 'Turno finalizado' : 'Tiempo por terminar'}
              </p>
              <p className="text-[11px] text-white/60 font-[family-name:var(--font-inter)]">
                {alerts.length} alerta{alerts.length > 1 ? 's' : ''} activa{alerts.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClearAll}
              className="text-[11px] text-white/50 hover:text-white/80 transition-colors px-2 py-1 rounded-lg hover:bg-white/10 font-[family-name:var(--font-inter)]"
            >
              Limpiar todo
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                {expanded ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>
        </div>

        {/* Alert list */}
        {expanded && (
          <div className="px-4 pb-3 space-y-2 max-h-48 overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={`${alert.bookingId}-${alert.alertType}`}
                className={`flex items-center gap-3 p-2.5 rounded-xl ${
                  alert.alertType === 'expired'
                    ? 'bg-red-500/15 border border-red-500/20'
                    : 'bg-amber-500/15 border border-amber-500/20'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    alert.alertType === 'expired' ? 'text-red-400' : 'text-amber-400'
                  }`}
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  {alert.alertType === 'expired' ? 'timer_off' : 'timer'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white/90 truncate font-[family-name:var(--font-sora)]">
                    {alert.courtName}
                  </p>
                  <p className="text-[11px] text-white/50 font-[family-name:var(--font-inter)]">
                    {alert.alertType === 'expired'
                      ? `Turno terminaba a las ${alert.endTime}`
                      : `${alert.remainingMinutes} min restantes — termina a las ${alert.endTime}`
                    }
                  </p>
                </div>
                <button
                  onClick={() => onDismiss(alert.bookingId, alert.alertType)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   EXPORTS
   ═══════════════════════════════════════════════════ */

export { DEFAULT_SETTINGS, nowInLima, timeToMinutes }
export type { ActiveBooking }