'use client'

import { useAppStore, ViewType } from '@/store/useAppStore'

const baseNavItems: { view: ViewType; label: string; icon: string }[] = [
  { view: 'home', label: 'Inicio', icon: 'home' },
  { view: 'bookings', label: 'Reservas', icon: 'calendar_month' },
  { view: 'search', label: 'Buscar', icon: 'search' },
  { view: 'profile', label: 'Perfil', icon: 'person' },
]

const adminNavItem: { view: ViewType; label: string; icon: string } = {
  view: 'admin',
  label: 'Admin',
  icon: 'admin_panel_settings',
}

export default function BottomNavBar() {
  const { currentView, setView, user } = useAppStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  // Insert admin button after "Inicio" for admin users
  const navItems = isAdmin
    ? [baseNavItems[0], adminNavItem, ...baseNavItems.slice(1)]
    : baseNavItems

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden h-20 bg-cm-surface/95 backdrop-blur-xl border-t border-white/10">
      <div className="flex items-center justify-around h-full px-1 pb-[env(safe-area-inset-bottom,0px)]">
        {navItems.map((item) => {
          const isActive = currentView === item.view
          const isAdminItem = item.view === 'admin'
          return (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-xl transition-all duration-200 min-w-0 flex-1 max-w-[80px] ${
                isAdminItem && isActive
                  ? 'bg-cm-primary/15'
                  : ''
              }`}
            >
              <span
                className={`material-symbols-outlined text-[22px] transition-all duration-200 ${
                  isActive
                    ? isAdminItem
                      ? 'text-cm-primary'
                      : 'text-cm-primary'
                    : isAdminItem
                      ? 'text-cm-primary/70'
                      : 'text-cm-on-surface-variant'
                }`}
                style={isActive ? { fontVariationSettings: '"FILL" 1' } : undefined}
              >
                {item.icon}
              </span>
              <span
                className={`text-[10px] font-semibold leading-tight transition-all duration-200 truncate w-full text-center ${
                  isActive
                    ? 'text-cm-primary'
                    : isAdminItem
                      ? 'text-cm-primary/60'
                      : 'text-cm-on-surface-variant'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <div className={`absolute bottom-1 w-5 h-0.5 rounded-full ${isAdminItem ? 'bg-cm-primary' : 'bg-cm-primary'}`} />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}