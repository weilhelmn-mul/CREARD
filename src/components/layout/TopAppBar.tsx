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

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  // Build nav items based on user role
  const navItems: { view: ViewType; label: string; icon: string }[] = isAdmin
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
    // Also close on touch start (mobile)
    const handleTouchOutside = (e: TouchEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('touchstart', handleTouchOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleTouchOutside)
    }
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
    <header className="fixed top-0 left-0 right-0 z-50 h-14 sm:h-16 bg-cm-surface/90 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-3 sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
          <img src="/creard-logo.png" alt="CREARD" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg" />
          <h1 className="font-[family-name:var(--font-sora)] text-lg sm:text-xl font-bold text-cm-primary text-glow">
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
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Notifications - only show if logged in */}
          {user && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications)
                  setShowUserMenu(false)
                }}
                className="relative p-2 rounded-full text-cm-on-surface-variant hover:text-cm-on-surface hover:bg-white/5 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[22px] sm:text-[24px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-cm-surface">
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
                    className="absolute right-0 top-12 sm:top-13 w-[calc(100vw-1.5rem)] sm:w-80 bg-cm-surface-container border border-white/15 rounded-2xl overflow-hidden shadow-2xl sm:glass-card"
                  >
                    <div className="px-4 py-3 border-b border-white/10">
                      <h3 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-sm sm:text-base">
                        Notificaciones
                      </h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-cm-on-surface-variant text-sm">
                          No hay notificaciones
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-3.5 sm:p-4 border-b border-white/5 active:bg-white/5 transition-colors ${
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
            <div className="flex items-center gap-2">
              {/* Admin Demo Button - only visible in development */}
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={() => {
                    useAppStore.getState().setUser({
                      id: 'demo-admin',
                      name: 'Administrador',
                      email: 'admin@creard.com',
                      phone: '+51 999 999 999',
                      role: 'admin',
                    })
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all duration-200 border border-amber-500/20"
                  title="Acceso demo como administrador (solo desarrollo)"
                >
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                    admin_panel_settings
                  </span>
                  <span className="hidden sm:inline">Admin Demo</span>
                </button>
              )}

              <button
                onClick={() => setView('login')}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium bg-cm-primary text-cm-on-primary hover:brightness-110 transition-all duration-200 active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                  login
                </span>
                <span className="hidden sm:inline">Iniciar Sesión</span>
              </button>
            </div>
          ) : (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu)
                  setShowNotifications(false)
                }}
                className="flex items-center gap-2 px-1.5 sm:px-2 py-1.5 rounded-full hover:bg-white/5 transition-all active:scale-95"
              >
                <div className="w-8 h-8 rounded-full bg-cm-primary/20 border-2 border-cm-primary/40 flex items-center justify-center">
                  <span className="text-cm-primary text-xs font-bold font-[family-name:var(--font-sora)]">
                    {getUserInitials()}
                  </span>
                </div>
                <span className="hidden sm:inline text-sm font-medium text-cm-on-surface font-[family-name:var(--font-inter)] max-w-[120px] truncate">
                  {user.name}
                </span>
                {isAdmin && (
                  <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-cm-primary/15 border border-cm-primary/20">
                    <span className="material-symbols-outlined text-cm-primary text-[12px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                      shield
                    </span>
                    <span className="text-[10px] font-bold text-cm-primary uppercase font-[family-name:var(--font-inter)]">
                      {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
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
                    className="absolute right-0 top-12 sm:top-13 w-[calc(100vw-1.5rem)] sm:w-60 bg-cm-surface-container border border-white/15 rounded-2xl overflow-hidden shadow-2xl"
                  >
                    {/* User info header */}
                    <div className="px-4 py-3.5 bg-cm-primary/5 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-cm-primary/20 border-2 border-cm-primary/40 flex items-center justify-center flex-shrink-0">
                          <span className="text-cm-primary text-sm font-bold font-[family-name:var(--font-sora)]">
                            {getUserInitials()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-cm-on-surface truncate font-[family-name:var(--font-sora)]">
                            {user.name}
                          </p>
                          <p className="text-xs text-cm-on-surface-variant truncate font-[family-name:var(--font-inter)] mt-0.5">
                            {user.email}
                          </p>
                          {isAdmin && (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-cm-primary/15 border border-cm-primary/20">
                              <span className="material-symbols-outlined text-cm-primary text-[10px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                                shield
                              </span>
                              <span className="text-[10px] font-bold text-cm-primary uppercase font-[family-name:var(--font-inter)]">
                                {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          setView('profile')
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-cm-on-surface hover:bg-white/5 active:bg-white/8 rounded-xl transition-colors font-[family-name:var(--font-inter)]"
                      >
                        <span className="material-symbols-outlined text-[22px] text-cm-on-surface-variant">person</span>
                        Mi Perfil
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => {
                            setShowUserMenu(false)
                            setView('admin')
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-cm-primary bg-cm-primary/8 hover:bg-cm-primary/15 active:bg-cm-primary/20 rounded-xl transition-colors font-[family-name:var(--font-inter)] mt-1"
                        >
                          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                            admin_panel_settings
                          </span>
                          <div className="flex-1 text-left">
                            <p>Panel de Administración</p>
                            <p className="text-[10px] font-normal text-cm-primary/60 mt-0.5">Gestionar reservas, canchas y más</p>
                          </div>
                          <span className="material-symbols-outlined text-[18px] text-cm-primary/50">chevron_right</span>
                        </button>
                      )}

                      {!isAdmin && (
                        <button
                          onClick={() => {
                            setShowUserMenu(false)
                            setView('bookings')
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-cm-on-surface hover:bg-white/5 active:bg-white/8 rounded-xl transition-colors font-[family-name:var(--font-inter)] mt-1"
                        >
                          <span className="material-symbols-outlined text-[22px] text-cm-on-surface-variant">calendar_month</span>
                          Mis Reservas
                        </button>
                      )}
                    </div>

                    {/* Logout */}
                    <div className="px-2 pb-2">
                      <button
                        onClick={async () => {
                          setShowUserMenu(false)
                          const { signOutFirebase } = await import('@/lib/auth-helpers')
                          await signOutFirebase()
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-cm-error hover:bg-cm-error/10 active:bg-cm-error/15 rounded-xl transition-colors font-[family-name:var(--font-inter)]"
                      >
                        <span className="material-symbols-outlined text-[22px]">logout</span>
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