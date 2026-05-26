import { create } from 'zustand'
import { useIsMobile } from '@/hooks/use-mobile'

// ── LocalStorage Persistence ──
const STORAGE_KEY_USER = 'creard_user'
const STORAGE_KEY_TOKEN = 'creard_firebase_token'

function loadFromStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveToStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage full or blocked
  }
}

function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

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
  firebaseToken: string | null
  notifications: Notification[]
  sportFilter: string
  isMobile: boolean
  authChecked: boolean // true after initial session restoration attempt

  setView: (view: ViewType) => void
  setSelectedCourt: (courtId: string | null) => void
  setSelectedDate: (date: string | null) => void
  setSelectedTimeSlot: (time: string | null) => void
  setUser: (user: User | null) => void
  setFirebaseToken: (token: string | null) => void
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void
  markNotificationRead: (id: string) => void
  setSportFilter: (sport: string) => void
  setMobile: (mobile: boolean) => void
  logout: () => void
  setAuthChecked: (checked: boolean) => void
}

// Restore persisted session from localStorage
const persistedUser = loadFromStorage<User>(STORAGE_KEY_USER)
const persistedToken = loadFromStorage<string>(STORAGE_KEY_TOKEN)

export const useAppStore = create<AppState>((set) => ({
  currentView: 'home',
  selectedCourtId: null,
  selectedDate: null,
  selectedTimeSlot: null,
  user: persistedUser,
  firebaseToken: persistedToken,
  authChecked: false,
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
  setUser: (user) => {
    saveToStorage(STORAGE_KEY_USER, user)
    set({ user })
  },
  setFirebaseToken: (token) => {
    saveToStorage(STORAGE_KEY_TOKEN, token)
    set({ firebaseToken: token })
  },
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
  logout: () => {
    removeFromStorage(STORAGE_KEY_USER)
    removeFromStorage(STORAGE_KEY_TOKEN)
    set({ user: null, firebaseToken: null, currentView: 'home' })
  },
  setAuthChecked: (checked: boolean) => set({ authChecked: checked }),
}))

// Initialize mobile detection
if (typeof window !== 'undefined') {
  const isMobile = window.innerWidth < 768
  useAppStore.getState().setMobile(isMobile)
  window.addEventListener('resize', () => {
    useAppStore.getState().setMobile(window.innerWidth < 768)
  })
}
