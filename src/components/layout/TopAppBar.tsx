'use client'

import { useAppStore, ViewType } from '@/store/useAppStore'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'

export default function TopAppBar() {
  const { currentView, setView, user, notifications, logout } = useAppStore()
  const unreadCount = notifications.filter((n) => !n.read).length
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  // Build nav items based on user role
  const navItems: { view: ViewType; label: string; icon: string }[] = user?.role === 'admin'
    ? [
        { view: 'home', label: 'Inicio', icon: 'home' },
        { view: 'admin', label: 'Panel Admin', icon: 'admin_panel_settings' },
        { view: 'search', label: 'Buscar', icon: 'search' },
        { view: 'profile', label: 'Perfil', icon: 'person' },
      ]
    : [
        { view: 'home', label: 'Inicio', icon: 'home' },
        { view: 'bookings', label: 'Reservas', icon: 'calendar_month' },
        { view: 'search', label: 'Buscar', icon: 'search' },
        { view: 'profile', label: 'Perfil', icon: 'person' },
      ]

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get user initials
  const getUserInitials = () => {
    if (!user?.name) return '?'
    const parts = user.name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0][0].toUpperCase()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-cm-surface/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
          <img src="/creard-logo.png" alt="CREARD" className="h-8 w-8 rounded-lg" />
          <h1 className="font-[family-name:var(--font-sora)] text-xl font-bold text-cm-primary text-glow">
            CREARD
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

        {/* Right section: Notifications + Auth */}
        <div className="flex items-center gap-2">
          {/* Notifications - only show if logged in */}
          {user && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications)
                  setShowUserMenu(false)
                }}
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
          )}

          {/* Auth section */}
          {!user ? (
            <button
              onClick={() => setView('login')}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-cm-primary/10 text-cm-primary hover:bg-cm-primary/20 transition-all duration-200 border border-cm-primary/20"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                login
              </span>
              <span className="hidden sm:inline">Iniciar Sesión</span>
            </button>
          ) : (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu)
                  setShowNotifications(false)
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-white/5 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-cm-primary/15 border border-cm-primary/30 flex items-center justify-center">
                  <span className="text-cm-primary text-xs font-bold font-[family-name:var(--font-sora)]">
                    {getUserInitials()}
                  </span>
                </div>
                <span className="hidden sm:inline text-sm font-medium text-cm-on-surface font-[family-name:var(--font-inter)] max-w-[120px] truncate">
                  {user.name}
                </span>
                {user.role === 'admin' && (
                  <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-cm-primary/15 border border-cm-primary/20">
                    <span className="material-symbols-outlined text-cm-primary text-[12px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                      shield
                    </span>
                    <span className="text-[10px] font-bold text-cm-primary uppercase font-[family-name:var(--font-inter)]">
                      Admin
                    </span>
                  </span>
                )}
                <span className="material-symbols-outlined text-cm-on-surface-variant text-[18px]">
                  expand_more
                </span>
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 w-56 glass-card rounded-xl overflow-hidden shadow-2xl"
                  >
                    {/* User info header */}
                    <div className="p-3 border-b border-white/10">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-cm-primary/15 border border-cm-primary/30 flex items-center justify-center">
                          <span className="text-cm-primary text-sm font-bold font-[family-name:var(--font-sora)]">
                            {getUserInitials()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-cm-on-surface truncate font-[family-name:var(--font-sora)]">
                            {user.name}
                          </p>
                          <p className="text-xs text-cm-on-surface-variant truncate font-[family-name:var(--font-inter)]">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          setView('profile')
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-cm-on-surface-variant hover:text-cm-on-surface hover:bg-white/5 transition-colors font-[family-name:var(--font-inter)]"
                      >
                        <span className="material-symbols-outlined text-[20px]">person</span>
                        Mi Perfil
                      </button>

                      {user.role === 'admin' && (
                        <button
                          onClick={() => {
                            setShowUserMenu(false)
                            setView('admin')
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-cm-on-surface-variant hover:text-cm-primary hover:bg-cm-primary/5 transition-colors font-[family-name:var(--font-inter)]"
                        >
                          <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                          Panel de Administración
                        </button>
                      )}

                      {user.role === 'user' && (
                        <button
                          onClick={() => {
                            setShowUserMenu(false)
                            setView('bookings')
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-cm-on-surface-variant hover:text-cm-on-surface hover:bg-white/5 transition-colors font-[family-name:var(--font-inter)]"
                        >
                          <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                          Mis Reservas
                        </button>
                      )}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-white/10 py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          logout()
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-cm-error hover:bg-cm-error-container/10 transition-colors font-[family-name:var(--font-inter)]"
                      >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        Cerrar Sesión
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
