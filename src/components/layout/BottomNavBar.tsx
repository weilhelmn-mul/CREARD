'use client'

import { useAppStore, ViewType } from '@/store/useAppStore'

// R1 (OLA 1 UX): botón central "Reservar" — la acción principal del producto
// queda SIEMPRE a un toque (antes solo existía dentro del scroll del home).
const baseNavItems: { view: ViewType; label: string; icon: string }[] = [
  { view: 'home', label: 'Inicio', icon: 'home' },
  { view: 'bookings', label: 'Reservas', icon: 'calendar_month' },
  { view: 'booking', label: 'Reservar', icon: 'sports_soccer' }, // centro destacado
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

  // R1: el admin conserva su acceso directo; "Reservas" sigue disponible desde
  // Perfil/TopAppBar. Para usuarios normales se mantienen los 4 tabs originales.
  const navItems = isAdmin
    ? [baseNavItems[0], adminNavItem, baseNavItems[2], baseNavItems[3], baseNavItems[4]]
    : baseNavItems

  return (
    // FIX #9 (FASE 4): safe-area del home-indicator iOS aplicada en la NAV
    // (altura total = 80px + env(safe-area-inset-bottom)); antes el padding
    // iba en el hijo con h-20 fija y comprimía los iconos.
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-cm-surface/95 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-end justify-around h-20 px-1">
        {navItems.map((item) => {
          const isActive = currentView === item.view
          const isCenter = item.view === 'booking'

          // ── R1: botón central elevado "Reservar" (acción principal) ──
          if (isCenter) {
            return (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                aria-label="Reservar cancha"
                className="relative flex flex-col items-center justify-start gap-1 flex-1 max-w-[80px] min-w-0 pt-0"
              >
                <span
                  className={`flex items-center justify-center w-[52px] h-[52px] -mt-6 rounded-full transition-all duration-200 border-4 border-cm-surface active:scale-95 ${
                    isActive
                      ? 'bg-cm-primary text-[#003907] shadow-lg shadow-cm-primary/40'
                      : 'bg-cm-primary/90 text-[#003907] shadow-md shadow-cm-primary/25'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[26px]"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    {item.icon}
                  </span>
                </span>
                <span
                  className={`text-[11px] font-semibold leading-tight transition-all duration-200 ${
                    isActive ? 'text-cm-primary' : 'text-cm-primary/80'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            )
          }

          return (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-xl transition-all duration-200 min-w-0 flex-1 max-w-[80px] active:scale-95 active:bg-white/5 ${
                item.view === 'admin' && isActive
                  ? 'bg-cm-primary/15'
                  : ''
              }`}
            >
              <span
                className={`material-symbols-outlined text-[22px] transition-all duration-200 ${
                  isActive
                    ? 'text-cm-primary'
                    : item.view === 'admin'
                      ? 'text-cm-primary/70'
                      : 'text-cm-on-surface-variant'
                }`}
                style={isActive ? { fontVariationSettings: '"FILL" 1' } : undefined}
              >
                {item.icon}
              </span>
              <span
                className={`text-[11px] font-semibold leading-tight transition-all duration-200 truncate w-full text-center ${
                  isActive
                    ? 'text-cm-primary'
                    : item.view === 'admin'
                      ? 'text-cm-primary/70'
                      : 'text-cm-on-surface-variant'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-1 w-5 h-0.5 rounded-full bg-cm-primary" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
