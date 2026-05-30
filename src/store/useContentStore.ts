'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface SellingPoint {
  icon: string
  title: string
  description: string
  highlight: boolean
}

export interface HowStep {
  number: string
  title: string
  description: string
  icon: string
  detail: string
}

export interface PaymentMethodItem {
  name: string
  icon: string
  color: string
}

export interface SiteSettings {
  hero_badge_text: string
  hero_badge_icon: string
  hero_headline: string
  hero_headline_highlight: string
  hero_subtitle: string
  hero_location_text: string
  hero_promo_text: string
  hero_promo_highlight: string
  courts_section_title: string
  courts_section_subtitle: string
  sports_section_badge: string
  sports_section_title: string
  sports_section_subtitle: string
  promo_section_badge: string
  promo_section_title: string
  promo_section_subtitle: string
  promo_cta_text: string
  selling_points: SellingPoint[]
  how_section_badge: string
  how_section_title: string
  how_section_subtitle: string
  how_cta_text: string
  how_cta_subtext: string
  how_steps: HowStep[]
  payment_methods_items: PaymentMethodItem[]
}

export interface Court {
  id: string
  name: string
  sport: string
  description: string | null
  images: string[]
  price_per_hour: number
  is_active: boolean
  amenities: string[]
}

export interface NewsItem {
  id: string
  title: string
  content: string
  image_url: string | null
  category: string
  is_active: boolean
  is_featured: boolean
  priority: number
  published_at: string | null
  expires_at: string | null
}

export interface GalleryImage {
  id: string
  title: string
  description: string | null
  url: string
  thumbnail_url: string | null
  category: string
  is_active: boolean
  display_order: number
}

// ═══════════════════════════════════════════════════
// DEFAULT DATA
// ═══════════════════════════════════════════════════

const DEFAULT_SETTINGS: SiteSettings = {
  hero_badge_text: 'La #1 en reservas deportivas del Cusco',
  hero_badge_icon: 'bolt',
  hero_headline: 'Reserva tu cancha ',
  hero_headline_highlight: 'en segundos',
  hero_subtitle: '4 canchas de fútbol 5 y 2 canchas de vóley profesional. Reserva fácil, paga con Yape y disfruta sin complicaciones.',
  hero_location_text: 'San Sebastián, Cusco',
  hero_promo_text: '',
  hero_promo_highlight: '50% de adelanto, paga el resto al llegar',
  courts_section_title: 'Canchas Destacadas',
  courts_section_subtitle: 'Elige tu espacio ideal y reserva al instante',
  sports_section_badge: 'Nuestras Instalaciones',
  sports_section_title: 'Deporte de primer nivel',
  sports_section_subtitle: '6 espacios disponibles con la mejor infraestructura deportiva del Cusco',
  promo_section_badge: 'Por qué elegir CREARD',
  promo_section_title: 'La experiencia completa',
  promo_section_subtitle: 'Reserva fácil, paga seguro, juega sin preocupaciones',
  promo_cta_text: 'Reservar mi cancha ahora',
  selling_points: [
    { icon: 'percent', title: '50% de adelanto', description: 'Solo necesitas pagar la mitad para confirmar tu reserva. El resto lo pagas al llegar.', highlight: true },
    { icon: 'forum', title: 'Confirmación instantánea', description: 'Recibe tu confirmación por WhatsApp en segundos con todos los detalles de tu reserva.', highlight: false },
    { icon: 'schedule', title: 'Atención 7 días', description: 'Abierto de lunes a domingo de 7:00 AM a 11:00 PM. Siempre disponible para ti.', highlight: false },
    { icon: 'verified', title: 'Sin comisiones', description: 'El precio que ves es el que pagas. Sin cargos ocultos ni sorpresas en tu reserva.', highlight: false },
  ],
  how_section_badge: 'Fácil y rápido',
  how_section_title: '¿Cómo funciona?',
  how_section_subtitle: 'Reserva tu cancha en 4 simples pasos y disfruta del deporte',
  how_cta_text: '¿Tienes dudas? Escríbenos por WhatsApp',
  how_cta_subtext: 'Soporte disponible',
  how_steps: [
    { number: '01', title: 'Elige tu cancha', description: 'Explora nuestras 6 canchas por deporte y disponibilidad. Revisa fotos, amenidades y precios en tiempo real.', icon: 'search', detail: 'Fútbol 5, Vóley o Eventos' },
    { number: '02', title: 'Selecciona fecha y hora', description: 'Consulta la disponibilidad en tiempo real y elige el horario perfecto. Horario de atención: 7:00 AM a 11:00 PM.', icon: 'calendar_month', detail: 'Reserva hasta 7 días adelante' },
    { number: '03', title: 'Paga 50% de adelanto', description: 'Realiza el pago con Yape, Plin, efectivo o tarjeta. Solo necesitas el 50% para confirmar tu reserva.', icon: 'payments', detail: 'Yape / Plin / Efectivo / Tarjeta' },
    { number: '04', title: 'Confirmación por WhatsApp', description: 'Recibe tu confirmación al instante por WhatsApp con todos los detalles. ¡Llega y juega!', icon: 'forum', detail: 'Confirmación en segundos' },
  ],
  payment_methods_items: [
    { name: 'Yape', icon: 'account_balance_wallet', color: 'text-purple-400' },
    { name: 'Plin', icon: 'phone_iphone', color: 'text-blue-400' },
    { name: 'Efectivo', icon: 'payments', color: 'text-green-400' },
    { name: 'Tarjeta', icon: 'credit_card', color: 'text-yellow-400' },
  ],
}

const DEFAULT_COURTS: Court[] = [
  { id: 'c1', name: 'Cancha Fútbol 1', sport: 'futbol', description: 'Cancha premium con césped sintético', images: ['/cancha-futbol-1.png'], price_per_hour: 35, is_active: true, amenities: ['Cesped sintetico', 'Iluminacion LED', 'Vestuarios'] },
  { id: 'c2', name: 'Cancha Fútbol 2', sport: 'futbol', description: 'Cancha estándar de fútbol 5', images: ['/cancha-futbol-2.png'], price_per_hour: 35, is_active: true, amenities: ['Cesped sintetico', 'Iluminacion'] },
  { id: 'c3', name: 'Cancha Fútbol 3', sport: 'futbol', description: 'Cancha techada parcial', images: ['/cancha-futbol-3.png'], price_per_hour: 35, is_active: true, amenities: ['Cesped sintetico', 'Techado parcial', 'Vestuarios'] },
  { id: 'c4', name: 'Cancha Fútbol 4', sport: 'futbol', description: 'Nueva con mejores instalaciones', images: ['/cancha-futbol-4.png'], price_per_hour: 35, is_active: true, amenities: ['Cesped premium', 'Iluminacion LED', 'Duchas', 'Estacionamiento'] },
  { id: 'c5', name: 'Vóley Cancha A', sport: 'voley', description: 'Piso PVC profesional con red reglamentaria', images: ['/cancha-voley.png'], price_per_hour: 30, is_active: true, amenities: ['Piso PVC', 'Red reglamentaria', 'Iluminacion LED'] },
  { id: 'c6', name: 'Vóley Cancha B', sport: 'voley', description: 'Segunda cancha de vóley techada con iluminación profesional', images: ['/cancha-voley.png'], price_per_hour: 30, is_active: true, amenities: ['Piso PVC', 'Iluminacion LED', 'Techado'] },
]

const DEFAULT_NEWS: NewsItem[] = []
const DEFAULT_GALLERY: GalleryImage[] = []

// ═══════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════

interface ContentState {
  settings: SiteSettings
  courts: Court[]
  news: NewsItem[]
  gallery: GalleryImage[]

  // Settings
  updateSettings: (data: Partial<SiteSettings>) => void

  // Courts
  updateCourt: (id: string, data: Partial<Court>) => void

  // News
  addNews: (item: Omit<NewsItem, 'id'>) => void
  updateNews: (id: string, data: Partial<NewsItem>) => void
  deleteNews: (id: string) => void

  // Gallery
  addGalleryImage: (item: Omit<GalleryImage, 'id'>) => void
  updateGalleryImage: (id: string, data: Partial<GalleryImage>) => void
  deleteGalleryImage: (id: string) => void

  // Reset
  resetAll: () => void
}

export const useContentStore = create<ContentState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      courts: DEFAULT_COURTS,
      news: DEFAULT_NEWS,
      gallery: DEFAULT_GALLERY,

      updateSettings: (data) =>
        set((state) => ({
          settings: { ...state.settings, ...data },
        })),

      updateCourt: (id, data) =>
        set((state) => ({
          courts: state.courts.map((c) => (c.id === id ? { ...c, ...data } : c)),
        })),

      addNews: (item) =>
        set((state) => ({
          news: [{ ...item, id: `n_${Date.now()}` }, ...state.news],
        })),

      updateNews: (id, data) =>
        set((state) => ({
          news: state.news.map((n) => (n.id === id ? { ...n, ...data } : n)),
        })),

      deleteNews: (id) =>
        set((state) => ({
          news: state.news.filter((n) => n.id !== id),
        })),

      addGalleryImage: (item) =>
        set((state) => ({
          gallery: [{ ...item, id: `g_${Date.now()}` }, ...state.gallery],
        })),

      updateGalleryImage: (id, data) =>
        set((state) => ({
          gallery: state.gallery.map((g) => (g.id === id ? { ...g, ...data } : g)),
        })),

      deleteGalleryImage: (id) =>
        set((state) => ({
          gallery: state.gallery.filter((g) => g.id !== id),
        })),

      resetAll: () =>
        set({
          settings: DEFAULT_SETTINGS,
          courts: DEFAULT_COURTS,
          news: DEFAULT_NEWS,
          gallery: DEFAULT_GALLERY,
        }),
    }),
    {
      name: 'creard-content-store',
      version: 1,
    }
  )
)
