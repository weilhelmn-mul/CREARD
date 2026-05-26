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

interface SportItem {
  id: string
  label: string
  icon: string
  image: string
  count: number
  priceRange: string
  badge: string
  amenities: string[]
}

interface SellingPoint {
  icon: string
  title: string
  description: string
  highlight: boolean
}

interface PaymentMethod {
  name: string
  icon: string
  color: string
}

interface StepItem {
  number: string
  title: string
  description: string
  icon: string
  detail: string
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
}

interface SiteSettingsContextValue {
  settings: SiteSettings | null
  loading: boolean
  refresh: () => Promise<void>
  saveSection: (section: keyof SiteSettings, data: SiteSettings[keyof SiteSettings]) => Promise<boolean>
}

const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  settings: null,
  loading: true,
  refresh: async () => {},
  saveSection: async () => false,
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

  const saveSection = useCallback(
    async (section: keyof SiteSettings, data: SiteSettings[keyof SiteSettings]): Promise<boolean> => {
      try {
        if (!settings) return false
        const updated = { ...settings, [section]: data }
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
    [settings]
  )

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, refresh: fetchSettings, saveSection }}>
      {children}
    </SiteSettingsContext.Provider>
  )
}
