'use client'

import { useAppStore, ViewType } from '@/store/useAppStore'

const navItems: { view: ViewType; label: string; icon: string }[] = [
  { view: 'home', label: 'Inicio', icon: 'home' },
  { view: 'bookings', label: 'Reservas', icon: 'calendar_month' },
  { view: 'search', label: 'Buscar', icon: 'search' },
  { view: 'profile', label: 'Perfil', icon: 'person' },
]

export default function BottomNavBar() {
  const { currentView, setView } = useAppStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden h-20 bg-cm-surface/90 backdrop-blur-xl border-t border-white/10">
      <div className="flex items-center justify-around h-full px-2 pb-[env(safe-area-inset-bottom,0px)]">
        {navItems.map((item) => {
          const isActive = currentView === item.view
          return (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className="flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-xl transition-all duration-200"
            >
              <span
                className={`material-symbols-outlined text-[24px] transition-all duration-200 ${
                  isActive ? 'text-cm-primary text-glow' : 'text-cm-on-surface-variant'
                }`}
                style={isActive ? { fontVariationSettings: '"FILL" 1' } : undefined}
              >
                {item.icon}
              </span>
              <span
                className={`text-[10px] font-semibold transition-all duration-200 ${
                  isActive ? 'text-cm-primary text-glow' : 'text-cm-on-surface-variant'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-2 w-8 h-0.5 bg-cm-primary rounded-full glow-accent" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
