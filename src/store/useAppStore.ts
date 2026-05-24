import { create } from 'zustand'
import { useIsMobile } from '@/hooks/use-mobile'

export type ViewType = 'home' | 'search' | 'bookings' | 'profile' | 'court-detail' | 'admin' | 'booking-form'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'success' | 'info' | 'warning' | 'error'
  read: boolean
  createdAt: Date
}

interface AppState {
  currentView: ViewType
  selectedCourtId: string | null
  selectedDate: Date | null
  selectedTimeSlot: string | null
  user: {
    name: string
    email: string
    phone: string
    avatar: string
    membership: string
    points: number
    credit: number
  } | null
  notifications: Notification[]
  sportFilter: string
  isMobile: boolean
  setView: (view: ViewType) => void
  setSelectedCourt: (courtId: string | null) => void
  setSelectedDate: (date: Date | null) => void
  setSelectedTimeSlot: (time: string | null) => void
  setUser: (user: AppState['user']) => void
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void
  markNotificationRead: (id: string) => void
  setSportFilter: (sport: string) => void
  setMobile: (mobile: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'home',
  selectedCourtId: null,
  selectedDate: null,
  selectedTimeSlot: null,
  user: {
    name: 'Carlos Mendoza',
    email: 'carlos@email.com',
    phone: '+51 987 111 222',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDjVDHNzIdAMhVwEmkn0m6j0jTEHJBBdbEDuemdvXTpV7xyIdcQV5jb3d0pfH0OeqUi5NPAe-82RSxYZ_HnFOusF9icVOg3a5fXN_B7Q4Kq1rg8E8pSIDTNOWr1OiKsrR6So9sOy1Qbv99DDB5mY-TD9ZG7StfdOV9XkEeM5q7GfwkYV_1HoBAAAhAEbjeEnoApczqc8d703zAhJ2L6XYzhoc3iArbCwtemhfcIImmrhx1RtGoxqd7u5iN3xEoUbvxTnXV5aLa-8fjc',
    membership: 'premium',
    points: 350,
    credit: 50,
  },
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
      title: '¡Gana puntos!',
      message: 'Reserva 3 veces más este mes y obtén 100 puntos extra.',
      type: 'info',
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
        {
          ...notification,
          id: String(Date.now()),
          read: false,
          createdAt: new Date(),
        },
        ...state.notifications,
      ],
    })),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  setSportFilter: (sport) => set({ sportFilter: sport }),
  setMobile: (mobile) => set({ isMobile: mobile }),
}))

// Initialize mobile detection
if (typeof window !== 'undefined') {
  const isMobile = window.innerWidth < 768
  useAppStore.getState().setMobile(isMobile)
  window.addEventListener('resize', () => {
    useAppStore.getState().setMobile(window.innerWidth < 768)
  })
}
