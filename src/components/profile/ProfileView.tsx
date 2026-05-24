'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { motion } from 'framer-motion'

interface RecentBooking {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  court: { name: string; sport: string }
}

const statusConfig: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmada', color: 'bg-green-500/20 text-green-400' },
  completed: { label: 'Completada', color: 'bg-blue-500/20 text-blue-400' },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/20 text-red-400' },
}

const sportIcons: Record<string, string> = {
  futbol: 'sports_soccer',
  voley: 'sports_volleyball',
  basket: 'sports_basketball',
  tenis: 'sports_tennis',
  eventos: 'celebration',
}

export default function ProfileView() {
  const { user, setView } = useAppStore()
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  useEffect(() => {
    fetch('/api/bookings')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRecentBookings(data.slice(0, 5))
        }
      })
      .catch(console.error)
  }, [])

  const membershipBadge = user?.membership === 'premium'
    ? { label: 'Premium', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: 'workspace_premium' }
    : user?.membership === 'basic'
    ? { label: 'Básico', color: 'bg-cm-primary/10 text-cm-primary border-cm-primary/30', icon: 'star' }
    : { label: 'Gratis', color: 'bg-cm-surface-container-highest text-cm-on-surface-variant border-cm-outline-variant', icon: 'person' }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="px-4 py-6">
      <div className="max-w-2xl mx-auto">
        {/* User Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-cm-primary/30 glow-accent flex-shrink-0">
              <img
                src={user?.avatar || ''}
                alt={user?.name || 'Avatar'}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-[family-name:var(--font-sora)] text-xl font-bold text-cm-on-surface truncate">
                  {user?.name}
                </h1>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${membershipBadge.color}`}>
                  <span className="material-symbols-outlined text-[12px]">{membershipBadge.icon}</span>
                  {membershipBadge.label}
                </span>
              </div>
              <p className="text-cm-on-surface-variant text-sm font-[family-name:var(--font-inter)]">
                {user?.email}
              </p>
              <p className="text-cm-on-surface-variant text-sm font-[family-name:var(--font-inter)]">
                {user?.phone}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="glass-card rounded-xl p-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-cm-primary/10 flex items-center justify-center mx-auto mb-2">
              <span className="material-symbols-outlined text-cm-primary" style={{ fontVariationSettings: '"FILL" 1' }}>calendar_month</span>
            </div>
            <p className="font-[family-name:var(--font-sora)] text-xl font-bold text-cm-on-surface">
              {recentBookings.length}
            </p>
            <p className="text-cm-on-surface-variant text-[10px] font-[family-name:var(--font-inter)]">Reservas</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center mx-auto mb-2">
              <span className="material-symbols-outlined text-yellow-400" style={{ fontVariationSettings: '"FILL" 1' }}>stars</span>
            </div>
            <p className="font-[family-name:var(--font-sora)] text-xl font-bold text-cm-on-surface">
              {user?.points || 0}
            </p>
            <p className="text-cm-on-surface-variant text-[10px] font-[family-name:var(--font-inter)]">Puntos</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mx-auto mb-2">
              <span className="material-symbols-outlined text-green-400" style={{ fontVariationSettings: '"FILL" 1' }}>account_balance_wallet</span>
            </div>
            <p className="font-[family-name:var(--font-sora)] text-xl font-bold text-cm-on-surface">
              ${user?.credit || 0}
            </p>
            <p className="text-cm-on-surface-variant text-[10px] font-[family-name:var(--font-inter)]">Crédito</p>
          </div>
        </motion.div>

        {/* Membership Upgrade */}
        {user?.membership !== 'premium' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-5 mb-6 border-yellow-500/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-yellow-400 text-[28px]" style={{ fontVariationSettings: '"FILL" 1' }}>workspace_premium</span>
              </div>
              <div className="flex-1">
                <h3 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-sm">
                  ¡Hazte Premium!
                </h3>
                <p className="text-cm-on-surface-variant text-xs font-[family-name:var(--font-inter)]">
                  Obtén descuentos exclusivos y reservas prioritarias.
                </p>
              </div>
              <button className="px-4 py-2 bg-yellow-500/20 text-yellow-400 text-xs font-semibold rounded-lg hover:bg-yellow-500/30 transition-colors font-[family-name:var(--font-sora)]">
                Upgrade
              </button>
            </div>
          </motion.div>
        )}

        {/* Recent Bookings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-lg">
              Reservas Recientes
            </h2>
            <button
              onClick={() => setView('bookings')}
              className="text-cm-primary text-xs font-semibold hover:underline"
            >
              Ver todas
            </button>
          </div>
          <div className="space-y-2">
            {recentBookings.length === 0 ? (
              <div className="text-center py-8 text-cm-on-surface-variant text-sm font-[family-name:var(--font-inter)]">
                No tienes reservas aún
              </div>
            ) : (
              recentBookings.map((booking) => {
                const status = statusConfig[booking.status] || statusConfig.confirmed
                return (
                  <div
                    key={booking.id}
                    className="glass-card rounded-xl p-3 flex items-center gap-3 hover:border-cm-primary/20 transition-all cursor-pointer"
                    onClick={() => setView('bookings')}
                  >
                    <div className="w-10 h-10 rounded-lg bg-cm-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-cm-primary text-[20px]">
                        {sportIcons[booking.court.sport] || 'sports'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-cm-on-surface truncate font-[family-name:var(--font-sora)]">
                        {booking.court.name}
                      </p>
                      <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                        {formatDate(booking.date)} · {booking.startTime}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>

        {/* Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-lg mb-3">
            Configuración
          </h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            {/* Notifications */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-cm-on-surface-variant text-[20px]">notifications</span>
                <span className="text-sm text-cm-on-surface font-[family-name:var(--font-inter)]">Notificaciones</span>
              </div>
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`w-11 h-6 rounded-full transition-all duration-200 ${
                  notificationsEnabled ? 'bg-cm-primary' : 'bg-cm-surface-container-highest'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                    notificationsEnabled ? 'translate-x-5.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-cm-on-surface-variant text-[20px]">language</span>
                <span className="text-sm text-cm-on-surface font-[family-name:var(--font-inter)]">Idioma</span>
              </div>
              <span className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Español</span>
            </div>

            {/* Help */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-cm-on-surface-variant text-[20px]">help</span>
                <span className="text-sm text-cm-on-surface font-[family-name:var(--font-inter)]">Ayuda y soporte</span>
              </div>
              <span className="material-symbols-outlined text-cm-on-surface-variant text-[18px]">chevron_right</span>
            </div>

            {/* Terms */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-cm-on-surface-variant text-[20px]">description</span>
                <span className="text-sm text-cm-on-surface font-[family-name:var(--font-inter)]">Términos y condiciones</span>
              </div>
              <span className="material-symbols-outlined text-cm-on-surface-variant text-[18px]">chevron_right</span>
            </div>
          </div>
        </motion.div>

        {/* Admin Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <button
            onClick={() => setView('admin')}
            className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 hover:border-cm-primary/30 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-cm-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-cm-primary text-[22px]" style={{ fontVariationSettings: '"FILL" 1' }}>admin_panel_settings</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                Admin Dashboard
              </p>
              <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                Ver estadísticas y gestión
              </p>
            </div>
            <span className="material-symbols-outlined text-cm-on-surface-variant text-[18px] group-hover:text-cm-primary transition-colors">
              chevron_right
            </span>
          </button>
        </motion.div>
      </div>
    </div>
  )
}
