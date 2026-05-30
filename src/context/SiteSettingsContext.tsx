'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'

// ============================================================
// Types — mirrors the Firestore document structure
// ============================================================

interface StatItem {
  label: string
  value: number
}

export interface PricingDetail {
  label: string
  timeRange: string
  price: number
}

interface SportItem {
  id: string
  label: string
  icon: string
  image: string
  count: number
  priceRange: string
  badge: string
  amenities: string[]
  pricingDetails?: PricingDetail[]
}

export interface SellingPoint {
  icon: string
  title: string
  description: string
  highlight: boolean
}

export interface PaymentMethod {
  name: string
  icon: string
  color: string
}

export interface StepItem {
  number: string
  title: string
  description: string
  icon: string
  detail: string
}

// ── CMS: Custom section types ──
export interface CustomSection {
  id: string
  type: 'banner' | 'notice' | 'highlight' | 'cta' | 'gallery'
  visible: boolean
  title: string
  subtitle?: string
  image?: string
  link?: string
  ctaText?: string
  items?: Array<{ image: string; title?: string; description?: string }>
  order: number
  createdAt?: unknown
}

// ── CMS: Active promotion ──
export interface ActivePromotion {
  id: string
  title: string
  description: string
  discount?: string
  validFrom?: string
  validUntil?: string
  active: boolean
  image?: string
}

// ── CMS: Hero banner ──
export interface HeroBanner {
  id: string
  image: string
  title?: string
  subtitle?: string
  link?: string
  active: boolean
}

// ── Section visibility map ──
export interface SectionVisibility {
  hero: boolean
  sportsSection: boolean
  featuredCourts: boolean
  todaysSchedule: boolean
  promoBanner: boolean
  howItWorks: boolean
}

export interface SiteSettings {
  hero: {
    location: string
    badge: string
    headline: string
    headlineHighlight: string
    subtitle: string
    promoHighlight: string
    promoText: string
    backgroundImage?: string
    secondaryImage?: string
    stats: StatItem[]
  }
  sportsSection: {
    badge: string
    title: string
    subtitle: string
    sports: SportItem[]
  }
  promoBanner: {
    badge: string
    title: string
    subtitle: string
    ctaText: string
    sellingPoints: SellingPoint[]
    paymentMethods: PaymentMethod[]
  }
  howItWorks: {
    badge: string
    title: string
    subtitle: string
    whatsappText: string
    supportText: string
    steps: StepItem[]
  }
  // CMS fields
  sectionOrder: string[]
  sectionVisibility: SectionVisibility
  customSections: CustomSection[]
  activePromotions: ActivePromotion[]
  heroBanners: HeroBanner[]
}

interface SiteSettingsContextValue {
  settings: SiteSettings | null
  loading: boolean
  refresh: () => Promise<void>
  saveSection: (section: string, data: unknown) => Promise<boolean>
  saveFullSettings: (data: SiteSettings) => Promise<boolean>
  toggleSectionVisibility: (sectionKey: string) => Promise<boolean>
  reorderSections: (newOrder: string[]) => Promise<boolean>
  saveCustomSection: (section: CustomSection) => Promise<boolean>
  removeCustomSection: (sectionId: string) => Promise<boolean>
}

const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  settings: null,
  loading: true,
  refresh: async () => {},
  saveSection: async () => false,
  saveFullSettings: async () => false,
  toggleSectionVisibility: async () => false,
  reorderSections: async () => false,
  saveCustomSection: async () => false,
  removeCustomSection: async () => false,
})

export function useSiteSettings() {
  return useContext(SiteSettingsContext)
}

// ============================================================
// Provider
// ============================================================

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data as SiteSettings)
      }
    } catch (err) {
      console.error('[SiteSettings] fetch failed', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const persistSettings = useCallback(
    async (updated: SiteSettings): Promise<boolean> => {
      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        })
        if (res.ok) {
          setSettings(updated)
          return true
        }
      } catch (err) {
        console.error('[SiteSettings] save failed', err)
      }
      return false
    },
    []
  )

  const saveSection = useCallback(
    async (section: string, data: unknown): Promise<boolean> => {
      if (!settings) return false
      const updated = { ...settings, [section]: data }
      return persistSettings(updated)
    },
    [settings, persistSettings]
  )

  const saveFullSettings = useCallback(
    async (data: SiteSettings): Promise<boolean> => {
      return persistSettings(data)
    },
    [persistSettings]
  )

  const toggleSectionVisibility = useCallback(
    async (sectionKey: string): Promise<boolean> => {
      if (!settings) return false
      const visibility = { ...settings.sectionVisibility }
      if (sectionKey in visibility) {
        ;(visibility as Record<string, boolean>)[sectionKey] = !(visibility as Record<string, boolean>)[sectionKey]
      }
      return persistSettings({ ...settings, sectionVisibility: visibility })
    },
    [settings, persistSettings]
  )

  const reorderSections = useCallback(
    async (newOrder: string[]): Promise<boolean> => {
      if (!settings) return false
      return persistSettings({ ...settings, sectionOrder: newOrder })
    },
    [settings, persistSettings]
  )

  const saveCustomSection = useCallback(
    async (section: CustomSection): Promise<boolean> => {
      if (!settings) return false
      const existing = settings.customSections.findIndex((s) => s.id === section.id)
      let updatedSections: CustomSection[]
      if (existing >= 0) {
        updatedSections = [...settings.customSections]
        updatedSections[existing] = section
      } else {
        updatedSections = [...settings.customSections, section]
      }
      // Also add to sectionOrder if new
      const sectionKey = `custom_${section.id}`
      const sectionOrder = settings.sectionOrder.includes(sectionKey)
        ? settings.sectionOrder
        : [...settings.sectionOrder, sectionKey]
      return persistSettings({ ...settings, customSections: updatedSections, sectionOrder })
    },
    [settings, persistSettings]
  )

  const removeCustomSection = useCallback(
    async (sectionId: string): Promise<boolean> => {
      if (!settings) return false
      const sectionKey = `custom_${sectionId}`
      return persistSettings({
        ...settings,
        customSections: settings.customSections.filter((s) => s.id !== sectionId),
        sectionOrder: settings.sectionOrder.filter((k) => k !== sectionKey),
      })
    },
    [settings, persistSettings]
  )

  return (
    <SiteSettingsContext.Provider
      value={{
        settings,
        loading,
        refresh: fetchSettings,
        saveSection,
        saveFullSettings,
        toggleSectionVisibility,
        reorderSections,
        saveCustomSection,
        removeCustomSection,
      }}
    >
      {children}
    </SiteSettingsContext.Provider>
  )
}
