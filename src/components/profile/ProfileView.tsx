'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { motion } from 'framer-motion'

interface RecentBooking {
  id: string
  date: string
  startTime: string
  endTime: string
  totalPrice: number
  status: string
  court: { name: string; sport: string }
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-gray-500/20 text-gray-400' },
  confirmed: { label: 'Confirmada', color: 'bg-amber-500/20 text-amber-400' },
  partially_paid: { label: 'Parcial', color: 'bg-orange-500/20 text-orange-400' },
  fully_paid: { label: 'Pagado', color: 'bg-green-500/20 text-green-400' },
  completed: { label: 'Completada', color: 'bg-blue-500/20 text-blue-400' },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/20 text-red-400' },
}

const sportIcons: Record<string, string> = {
  futbol: 'sports_soccer',
  voley: 'sports_volleyball',
}

export default function ProfileView() {
  const { user, setView } = useAppStore()

  const handleLogout = async () => {
    const { signOutFirebase } = await import('@/lib/auth-helpers')
    await signOutFirebase()
  }
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [totalSpent, setTotalSpent] = useState(0)

  useEffect(() => {
    if (!user) return
    fetch(`/api/bookings?userId=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRecentBookings(data.slice(0, 5))
          const completed = data.filter((b: RecentBooking) =>
            ['completed', 'fully_paid', 'partially_paid'].includes(b.status)
          )
          setTotalSpent(completed.reduce((sum: number, b: RecentBooking) => sum + b.totalPrice, 0))
        }
      })
      .catch(console.error)
  }, [user])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('es', { day: 'numeric', month: 'short' })
  }

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (!user) {
    return (
      <div className="px-4 py-16 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 rounded-full bg-cm-surface-container-highest flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-cm-on-surface-variant text-[40px]">person</span>
          </div>
          <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-cm-on-surface mb-2">
            Inicia Sesión
          </h2>
          <p className="text-cm-on-surface-variant text-sm mb-6 font-[family-name:var(--font-inter)]">
            Accede a tu cuenta para ver tus reservas y historial
          </p>
          <button
            onClick={() => setView('login')}
            className="px-6 py-3 bg-cm-primary text-cm-on-primary font-semibold rounded-xl hover:bg-cm-primary-dim transition-all glow-accent font-[family-name:var(--font-sora)]"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    )
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
            <div className="w-20 h-20 rounded-2xl bg-cm-primary/20 flex items-center justify-center flex-shrink-0 border-2 border-cm-primary/30 glow-accent">
              <span className="font-[family-name:var(--font-sora)] text-2xl font-bold text-cm-primary">
                {getInitials(user.name)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-[family-name:var(--font-sora)] text-xl font-bold text-cm-on-surface truncate">
                  {user.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-cm-primary/10 text-cm-primary border-cm-primary/30">
                  <span className="material-symbols-outlined text-[12px]">verified</span>
                  Activo
                </span>
              </div>
              <div className="flex items-center gap-1 text-cm-on-surface-variant text-sm font-[family-name:var(--font-inter)]">
                <span className="material-symbols-outlined text-[14px]">mail</span>
                {user.email}
              </div>
              {user.phone && (
                <div className="flex items-center gap-1 text-cm-on-surface-variant text-sm font-[family-name:var(--font-inter)]">
                  <span className="material-symbols-outlined text-[14px]">phone</span>
                  {user.phone}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/5">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-400 text-sm hover:text-red-300 transition-colors font-[family-name:var(--font-inter)]"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Cerrar Sesión
            </button>
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
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mx-auto mb-2">
              <span className="material-symbols-outlined text-green-400" style={{ fontVariationSettings: '"FILL" 1' }}>payments</span>
            </div>
            <p className="font-[family-name:var(--font-sora)] text-xl font-bold text-cm-on-surface">
              S/ {totalSpent.toFixed(0)}
            </p>
            <p className="text-cm-on-surface-variant text-[10px] font-[family-name:var(--font-inter)]">Total Gastado</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
              <span className="material-symbols-outlined text-blue-400" style={{ fontVariationSettings: '"FILL" 1' }}>location_on</span>
            </div>
            <p className="font-[family-name:var(--font-sora)] text-lg font-bold text-cm-on-surface leading-tight">
              Cusco
            </p>
            <p className="text-cm-on-surface-variant text-[10px] font-[family-name:var(--font-inter)]">Ubicación</p>
          </div>
        </motion.div>

        {/* Reservas Recientes */}
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
                        {formatDate(booking.date)} · {booking.startTime} - {booking.endTime}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">
                        S/ {booking.totalPrice}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
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
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-cm-on-surface-variant text-[20px]">notifications</span>
                <span className="text-sm text-cm-on-surface font-[family-name:var(--font-inter)]">Notificaciones</span>
              </div>
              <span className="material-symbols-outlined text-cm-primary text-[18px]">check_circle</span>
            </div>
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-cm-on-surface-variant text-[20px]">help</span>
                <span className="text-sm text-cm-on-surface font-[family-name:var(--font-inter)]">Ayuda y soporte</span>
              </div>
              <span className="material-symbols-outlined text-cm-on-surface-variant text-[18px]">chevron_right</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-cm-on-surface-variant text-[20px]">description</span>
                <span className="text-sm text-cm-on-surface font-[family-name:var(--font-inter)]">Términos y condiciones</span>
              </div>
              <span className="material-symbols-outlined text-cm-on-surface-variant text-[18px]">chevron_right</span>
            </div>
          </div>
        </motion.div>

        {/* Admin Button (only for admin users) */}
        {user.role === 'admin' && (
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
                  Panel de Administración
                </p>
                <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                  Gestión completa del negocio
                </p>
              </div>
              <span className="material-symbols-outlined text-cm-on-surface-variant text-[18px] group-hover:text-cm-primary transition-colors">
                chevron_right
              </span>
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
