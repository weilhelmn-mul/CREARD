'use client'

import { useAppStore, ViewType } from '@/store/useAppStore'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

const navItems: { view: ViewType; label: string; icon: string }[] = [
  { view: 'home', label: 'Inicio', icon: 'home' },
  { view: 'bookings', label: 'Reservas', icon: 'calendar_month' },
  { view: 'search', label: 'Buscar', icon: 'search' },
  { view: 'profile', label: 'Perfil', icon: 'person' },
]

export default function TopAppBar() {
  const { currentView, setView, user, notifications } = useAppStore()
  const unreadCount = notifications.filter((n) => !n.read).length
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-cm-surface/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-cm-primary/50 glow-accent hidden sm:block">
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            </div>
          )}
          <h1
            className="font-[family-name:var(--font-sora)] text-xl font-bold text-cm-primary text-glow cursor-pointer"
            onClick={() => setView('home')}
          >
            CanchaMax Pro
          </h1>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                currentView === item.view
                  ? 'text-cm-primary text-glow bg-cm-primary/10'
                  : 'text-cm-on-surface-variant hover:text-cm-on-surface hover:bg-white/5'
              }`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={currentView === item.view ? { fontVariationSettings: '"FILL" 1' } : undefined}
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right: Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-full text-cm-on-surface-variant hover:text-cm-on-surface hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-80 glass-card rounded-xl overflow-hidden shadow-2xl"
              >
                <div className="p-4 border-b border-white/10">
                  <h3 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface">
                    Notificaciones
                  </h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-cm-on-surface-variant text-sm">
                      No hay notificaciones
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${
                          !n.read ? 'bg-cm-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`material-symbols-outlined text-xl mt-0.5 ${
                              n.type === 'success'
                                ? 'text-green-400'
                                : n.type === 'warning'
                                ? 'text-yellow-400'
                                : n.type === 'error'
                                ? 'text-red-400'
                                : 'text-cm-primary'
                            }`}
                            style={{ fontVariationSettings: '"FILL" 1' }}
                          >
                            {n.type === 'success'
                              ? 'check_circle'
                              : n.type === 'warning'
                              ? 'warning'
                              : n.type === 'error'
                              ? 'error'
                              : 'info'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-cm-on-surface">{n.title}</p>
                            <p className="text-xs text-cm-on-surface-variant mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
