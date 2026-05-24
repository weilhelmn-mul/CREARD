import { create } from 'zustand'
import { useIsMobile } from '@/hooks/use-mobile'

export type ViewType =
  | 'home'
  | 'search'
  | 'bookings'
  | 'profile'
  | 'court-detail'
  | 'booking-form'
  | 'admin'
  | 'login'
  | 'register'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'success' | 'info' | 'warning' | 'error'
  read: boolean
  createdAt: Date
}

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: 'user' | 'admin'
}

interface AppState {
  currentView: ViewType
  selectedCourtId: string | null
  selectedDate: string | null
  selectedTimeSlot: string | null
  user: User | null
  notifications: Notification[]
  sportFilter: string
  isMobile: boolean

  setView: (view: ViewType) => void
  setSelectedCourt: (courtId: string | null) => void
  setSelectedDate: (date: string | null) => void
  setSelectedTimeSlot: (time: string | null) => void
  setUser: (user: User | null) => void
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void
  markNotificationRead: (id: string) => void
  setSportFilter: (sport: string) => void
  setMobile: (mobile: boolean) => void
  logout: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'home',
  selectedCourtId: null,
  selectedDate: null,
  selectedTimeSlot: null,
  user: null,
  notifications: [
    {
      id: '1',
      title: 'Reserva confirmada',
      message: 'Tu reserva en CREARD para mañana a las 18:00 ha sido confirmada.',
      type: 'success',
      read: false,
      createdAt: new Date(),
    },
    {
      id: '2',
      title: 'Pago pendiente',
      message: 'Tienes un pago restante de S/ 17.50 por tu reserva de Vóley A.',
      type: 'warning',
      read: false,
      createdAt: new Date(),
    },
  ],
  sportFilter: 'todos',
  isMobile: false,

  setView: (view) => set({ currentView: view }),
  setSelectedCourt: (courtId) => set({ selectedCourtId: courtId }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedTimeSlot: (time) => set({ selectedTimeSlot: time }),
  setUser: (user) => set({ user }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        { ...notification, id: String(Date.now()), read: false, createdAt: new Date() },
        ...state.notifications,
      ],
    })),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
  setSportFilter: (sport) => set({ sportFilter: sport }),
  setMobile: (mobile) => set({ isMobile: mobile }),
  logout: () => set({ user: null, currentView: 'home' }),
}))

// Initialize mobile detection
if (typeof window !== 'undefined') {
  const isMobile = window.innerWidth < 768
  useAppStore.getState().setMobile(isMobile)
  window.addEventListener('resize', () => {
    useAppStore.getState().setMobile(window.innerWidth < 768)
  })
}
