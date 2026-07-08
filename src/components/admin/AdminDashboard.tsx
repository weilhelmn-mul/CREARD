'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/hooks/use-toast'
import { useSiteSettings, type CustomSection, type ActivePromotion, type HeroBanner, type NewsItem } from '@/context/SiteSettingsContext'
import { getAuthHeaders } from '@/lib/auth-helpers'
import { cachedFetch, cachedFetchFresh, invalidateCache, invalidateAllCaches } from '@/lib/cache'
import { EditModal, FormField, ArrayField } from '@/components/home/SectionEditor'
import UsersTab from '@/components/admin/UsersTab'
import EquipmentManager from '@/components/admin/EquipmentManager'
import { useBookingAlarm, NotificationBanner, DEFAULT_SETTINGS, type NotificationSettings } from '@/components/admin/NotificationMonitor'
import NotificationSettingsPanel from '@/components/admin/NotificationSettings'
import { formatTime12, formatTime24, formatTimeRange, generateTimeSlots } from '@/lib/timeUtils'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from '@/components/ui/command'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Plus, UserPlus, Loader2, Check } from 'lucide-react'
import BookingsTable from './tables/BookingsTable'
import ExpensesTable from './tables/ExpensesTable'
import RecurringPreviewTable from './tables/RecurringPreviewTable'
import SeriesBookingsTable from './tables/SeriesBookingsTable'
import TimeSlotPicker from './TimeSlotPicker'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
// v2-tables-extracted-1781314356

/* ═══════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════ */
interface PricingScheduleItem {
  label: string;
  startHour: number;
  endHour: number;
  pricePerHour: number;
}

interface EquipmentItem {
  equipmentId: string
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

interface Equipment {
  id: string
  name: string
  sport: string
  pricePerRental: number
  stock: number
  active: boolean
}

interface Booking {
  id: string
  courtId: string
  courtIds?: string[]
  userId: string
  date: string
  startTime: string
  endTime: string
  totalPrice: number
  courtSubtotal?: number
  equipmentSubtotal?: number
  equipmentItems?: EquipmentItem[]
  advanceAmount: number
  remainingAmount: number
  status: string
  paymentMethod: string | null
  createdAt?: unknown
  recurringGroupId?: string
  recurringIndex?: number
  equipmentDelivered?: boolean
  equipmentReturned?: boolean
  court: { id: string; name: string; sport: string; branch?: { name: string } } | null
  courts: Array<{ id: string; name: string; sport: string; branch?: { name: string } }>
  user: { id: string; name: string; email: string; phone?: string } | null
}

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
  notes: string | null
  createdAt?: string
  created_at?: string
}

interface RetainedAdvance {
  id: string
  bookingId: string
  userId: string
  userName: string
  userEmail: string | null
  courtName: string
  bookingDate: string
  amount: number
  originalTotal: number
  paymentMethod: string
  reason: string
  status: 'retained' | 'refunded'
  createdAt: string
  updatedAt: string
}

interface Stats {
  totalBookings: number
  activeBookings: number
  totalRevenue: number
  monthRevenue: number
  activeClients: number
  totalClients: number
  occupancyRate: number
  bookingsBySport: Record<string, number>
  revenueByMonth: { month: string; revenue: number }[]
  recentBookings: Booking[]
  topCourts: Array<{ id: string; name: string; sport: string; totalRevenue: number; bookingCount: number; branch: { name: string } }>
  dailyBookings: { day: string; bookings: number; revenue: number }[]
}

type AdminTab = 'reservas' | 'finanzas' | 'gastos' | 'equipos' | 'alarmas' | 'usuarios' | 'canchas' | 'contenido'

/* ═══════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════ */
const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  reserved:  { label: 'Reservado',  color: 'bg-amber-500/20 text-amber-400',    dot: 'bg-amber-400' },
  completed: { label: 'Completo',   color: 'bg-green-500/20 text-green-400',    dot: 'bg-green-400' },
  cancelled: { label: 'Cancelado',  color: 'bg-red-500/20 text-red-400',        dot: 'bg-red-400' },
}

const sportIcons: Record<string, string> = {
  futbol: 'sports_soccer', voley: 'sports_volleyball', basket: 'sports_basketball',
  tenis: 'sports_tennis', eventos: 'celebration',
}

const expenseCategories: Record<string, { label: string; icon: string; color: string }> = {
  mantenimiento: { label: 'Mantenimiento', icon: 'build',       color: 'text-blue-400' },
  servicios:     { label: 'Servicios',     icon: 'bolt',        color: 'text-yellow-400' },
  personal:      { label: 'Personal',      icon: 'group',       color: 'text-purple-400' },
  alquiler:      { label: 'Alquiler',      icon: 'home',        color: 'text-cyan-400' },
  otros:         { label: 'Otros',         icon: 'more_horiz',  color: 'text-gray-400' },
}

const adminTabs: { key: AdminTab; label: string; icon: string }[] = [
  { key: 'reservas',  label: 'Reservas',  icon: 'calendar_month' },
  { key: 'finanzas',  label: 'Finanzas',  icon: 'account_balance_wallet' },
  { key: 'gastos',    label: 'Gastos',    icon: 'receipt_long' },
  { key: 'equipos',   label: 'Equipos',   icon: 'sports_tennis' },
  { key: 'alarmas',   label: 'Alarmas',   icon: 'notifications_active' },
  { key: 'canchas',    label: 'Canchas',    icon: 'sports_soccer' },
  { key: 'usuarios',  label: 'Usuarios',  icon: 'group' },
  { key: 'contenido', label: 'Contenido', icon: 'edit_note' },
]

/* ─── helpers ─── */
const fmtCurrency = (n: number) => `S/ ${n.toFixed(2)}`
const fmtHour = (h: number) => `${String(h).padStart(2, '0')}:00`
const fmtDate = (d: string) => {
  // Bug fix #9: Use America/Lima timezone for consistent date display
  const [y, m, day] = d.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, day))
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', timeZone: 'America/Lima' })
}
const fmtDateFull = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, day))
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Lima' })
}
const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

/** Compare Firestore Timestamps (seconds) or ISO strings for sorting */
function compareTimestamps(a: unknown, b: unknown): number {
  const toMs = (t: unknown): number => {
    if (!t) return 0
    if (typeof t === 'number') return t * 1000 // Firestore seconds
    if (typeof t === 'object' && t !== null && '_seconds' in (t as Record<string, unknown>)) return (t as Record<string, unknown>)._seconds as number * 1000
    if (typeof t === 'string') return new Date(t).getTime()
    return 0
  }
  return toMs(a) - toMs(b)
}

/* ═══════════════════════════════════════════════════
   CMS CONTENT EDITOR TAB
   ═══════════════════════════════════════════════════ */

/* ─── Sortable Section Card ─── */
function SortableSectionCard({
  id,
  label,
  icon,
  color,
  isCustom,
  visible,
  onToggle,
  onEdit,
  onDelete,
}: {
  id: string
  label: string
  icon: string
  color: string
  isCustom: boolean
  visible: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`glass-card rounded-xl p-3 flex items-center gap-3 transition-all ${isDragging ? 'opacity-60 shadow-xl z-50' : ''} ${!visible ? 'opacity-40' : ''}`}
    >
      {/* Drag handle */}
      <button type="button" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-cm-on-surface-variant/40 hover:text-cm-on-surface-variant p-1">
        <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
      </button>

      {/* Icon */}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <span className="material-symbols-outlined text-[18px] text-white" style={{ fontVariationSettings: '"FILL" 1' }}>
          {icon}
        </span>
      </div>

      {/* Label */}
      <span className="flex-1 text-sm font-semibold text-cm-on-surface truncate font-[family-name:var(--font-sora)]">
        {label}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button type="button" onClick={onToggle} className={`p-1.5 rounded-lg transition-colors ${visible ? 'text-cm-primary hover:bg-cm-primary/10' : 'text-cm-on-surface-variant/40 hover:bg-white/5'}`} title={visible ? 'Ocultar' : 'Mostrar'}>
          <span className="material-symbols-outlined text-[16px]">{visible ? 'visibility' : 'visibility_off'}</span>
        </button>
        <button type="button" onClick={onEdit} className="p-1.5 rounded-lg text-cm-on-surface-variant hover:text-cm-primary hover:bg-cm-primary/10 transition-colors" title="Editar">
          <span className="material-symbols-outlined text-[16px]">edit</span>
        </button>
        {isCustom && onDelete && (
          <button type="button" onClick={onDelete} className="p-1.5 rounded-lg text-cm-on-surface-variant hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Eliminar">
            <span className="material-symbols-outlined text-[16px]">delete</span>
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Main ContentTab ─── */
function ContentTab() {
  const { settings, saveSection, saveFullSettings, toggleSectionVisibility, reorderSections, saveCustomSection, removeCustomSection } = useSiteSettings()
  const [activeSubTab, setActiveSubTab] = useState<'secciones' | 'promociones' | 'banners' | 'noticias'>('secciones')
  const [editSection, setEditSection] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Record<string, unknown> | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)

  // Custom section editing
  const [editingCustom, setEditingCustom] = useState<CustomSection | null>(null)
  const [customForm, setCustomForm] = useState<CustomSection | null>(null)
  const [savingCustom, setSavingCustom] = useState(false)

  // Promotions editing
  const [editingPromo, setEditingPromo] = useState<ActivePromotion | null>(null)
  const [promoForm, setPromoForm] = useState<ActivePromotion | null>(null)
  const [savingPromo, setSavingPromo] = useState(false)

  // Hero banners editing
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null)
  const [bannerForm, setBannerForm] = useState<HeroBanner | null>(null)
  const [savingBanner, setSavingBanner] = useState(false)

  // News editing
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null)
  const [newsForm, setNewsForm] = useState<NewsItem | null>(null)
  const [savingNews, setSavingNews] = useState(false)

  // Preview modal
  const [showPreview, setShowPreview] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Section metadata map
  const sectionMeta: Record<string, { label: string; icon: string; color: string; isCustom: boolean }> = {
    hero: { label: 'Hero Principal', icon: 'hero', color: 'bg-cm-primary', isCustom: false },
    sportsSection: { label: 'Instalaciones', icon: 'emoji_events', color: 'bg-green-500', isCustom: false },
    featuredCourts: { label: 'Canchas Destacadas', icon: 'sports_soccer', color: 'bg-teal-500', isCustom: false },
    promoBanner: { label: 'Promociones', icon: 'workspace_premium', color: 'bg-purple-500', isCustom: false },
    howItWorks: { label: 'Cómo Funciona', icon: 'auto_awesome', color: 'bg-sky-500', isCustom: false },
  }

  const sectionOrder = settings?.sectionOrder || ['hero', 'sportsSection', 'featuredCourts', 'promoBanner', 'howItWorks']
  const visibility = settings?.sectionVisibility || { hero: true, sportsSection: true, featuredCourts: true, promoBanner: true, howItWorks: true }
  const customSections = settings?.customSections || []

  const openEditor = (sectionKey: string) => {
    if (!settings) return
    setEditSection(sectionKey)
    if (sectionKey in settings) {
      setEditForm({ ...(settings[sectionKey as keyof typeof settings] as Record<string, unknown>) })
    }
  }

  const handleSave = async () => {
    if (!editSection || !editForm || !settings) return
    setSaving(true)
    const ok = await saveSection(editSection, editForm)
    setSaving(false)
    if (ok) {
      setEditSection(null)
      setEditForm(null)
      toast({ title: 'Contenido guardado', description: 'Los cambios se aplicaron correctamente' })
    } else {
      toast({ title: 'Error', description: 'No se pudo guardar el contenido', variant: 'destructive' })
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !settings) return
    const oldIndex = sectionOrder.indexOf(active.id as string)
    const newIndex = sectionOrder.indexOf(over.id as string)
    if (oldIndex < 0 || newIndex < 0) return
    const newOrder = arrayMove(sectionOrder, oldIndex, newIndex)
    await reorderSections(newOrder)
    toast({ title: 'Orden actualizado', description: 'Las secciones se reordenaron correctamente' })
  }

  const addCustomSection = () => {
    const id = `cs_${Date.now()}`
    const newSection: CustomSection = {
      id, type: 'banner', visible: true, title: 'Nueva sección',
      subtitle: '', image: '', link: '', ctaText: '', items: [], order: customSections.length,
    }
    setEditingCustom(newSection)
    setCustomForm({ ...newSection })
  }

  const handleSaveCustom = async () => {
    if (!customForm || !settings) return
    setSavingCustom(true)
    const ok = await saveCustomSection(customForm)
    setSavingCustom(false)
    if (ok) {
      setEditingCustom(null)
      setCustomForm(null)
      toast({ title: 'Sección guardada', description: 'La sección personalizada fue guardada' })
    } else {
      toast({ title: 'Error', description: 'No se pudo guardar la sección', variant: 'destructive' })
    }
  }

  const handleDeleteCustom = async (sectionId: string) => {
    if (!confirm('¿Eliminar esta sección personalizada?')) return
    const ok = await removeCustomSection(sectionId)
    if (ok) toast({ title: 'Sección eliminada' })
    else toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' })
  }

  // Promotions CRUD
  const addPromotion = () => {
    const newPromo: ActivePromotion = {
      id: `promo_${Date.now()}`, title: '', description: '', discount: '', validFrom: '', validUntil: '', active: true, image: '',
    }
    setEditingPromo(newPromo)
    setPromoForm({ ...newPromo })
  }

  const handleSavePromo = async () => {
    if (!promoForm || !settings) return
    setSavingPromo(true)
    const existing = settings.activePromotions.findIndex((p) => p.id === promoForm.id)
    let updated: ActivePromotion[]
    if (existing >= 0) { updated = [...settings.activePromotions]; updated[existing] = promoForm }
    else { updated = [...settings.activePromotions, promoForm] }
    const ok = await saveFullSettings({ ...settings, activePromotions: updated })
    setSavingPromo(false)
    if (ok) { setEditingPromo(null); setPromoForm(null); toast({ title: 'Promoción guardada' }) }
    else toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' })
  }

  const togglePromoActive = async (promoId: string) => {
    if (!settings) return
    const updated = settings.activePromotions.map((p) => p.id === promoId ? { ...p, active: !p.active } : p)
    await saveFullSettings({ ...settings, activePromotions: updated })
  }

  const deletePromo = async (promoId: string) => {
    if (!confirm('¿Eliminar esta promoción?')) return
    if (!settings) return
    const ok = await saveFullSettings({ ...settings, activePromotions: settings.activePromotions.filter((p) => p.id !== promoId) })
    if (ok) toast({ title: 'Promoción eliminada' })
  }

  // Hero Banners CRUD
  const addHeroBanner = () => {
    const newBanner: HeroBanner = {
      id: `hb_${Date.now()}`, image: '', title: '', subtitle: '', link: '', active: true,
    }
    setEditingBanner(newBanner)
    setBannerForm({ ...newBanner })
  }

  const handleSaveBanner = async () => {
    if (!bannerForm || !settings) return
    setSavingBanner(true)
    const existing = settings.heroBanners.findIndex((b) => b.id === bannerForm.id)
    let updated: HeroBanner[]
    if (existing >= 0) { updated = [...settings.heroBanners]; updated[existing] = bannerForm }
    else { updated = [...settings.heroBanners, bannerForm] }
    const ok = await saveFullSettings({ ...settings, heroBanners: updated })
    setSavingBanner(false)
    if (ok) { setEditingBanner(null); setBannerForm(null); toast({ title: 'Banner guardado' }) }
    else toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' })
  }

  const toggleBannerActive = async (bannerId: string) => {
    if (!settings) return
    const updated = settings.heroBanners.map((b) => b.id === bannerId ? { ...b, active: !b.active } : b)
    await saveFullSettings({ ...settings, heroBanners: updated })
  }

  const deleteBanner = async (bannerId: string) => {
    if (!confirm('¿Eliminar este banner?')) return
    if (!settings) return
    const ok = await saveFullSettings({ ...settings, heroBanners: settings.heroBanners.filter((b) => b.id !== bannerId) })
    if (ok) toast({ title: 'Banner eliminado' })
  }

  // News CRUD
  const addNews = () => {
    const newItem: NewsItem = {
      id: `news_${Date.now()}`, title: '', content: '', image: '', link: '', active: true, pinned: false, createdAt: new Date().toISOString(),
    }
    setEditingNews(newItem)
    setNewsForm({ ...newItem })
  }

  const handleSaveNews = async () => {
    if (!newsForm || !settings) return
    setSavingNews(true)
    const existing = settings.news.findIndex((n) => n.id === newsForm.id)
    let updated: NewsItem[]
    if (existing >= 0) { updated = [...settings.news]; updated[existing] = newsForm }
    else { updated = [...settings.news, newsForm] }
    const ok = await saveFullSettings({ ...settings, news: updated })
    setSavingNews(false)
    if (ok) { setEditingNews(null); setNewsForm(null); toast({ title: 'Noticia guardada' }) }
    else toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' })
  }

  const toggleNewsActive = async (newsId: string) => {
    if (!settings) return
    const updated = settings.news.map((n) => n.id === newsId ? { ...n, active: !n.active } : n)
    await saveFullSettings({ ...settings, news: updated })
  }

  const toggleNewsPinned = async (newsId: string) => {
    if (!settings) return
    const updated = settings.news.map((n) => n.id === newsId ? { ...n, pinned: !n.pinned } : n)
    await saveFullSettings({ ...settings, news: updated })
  }

  const deleteNews = async (newsId: string) => {
    if (!confirm('¿Eliminar esta noticia?')) return
    if (!settings) return
    const ok = await saveFullSettings({ ...settings, news: settings.news.filter((n) => n.id !== newsId) })
    if (ok) toast({ title: 'Noticia eliminada' })
  }

  /* ─── Image upload ─── */
  const handleUploadImage = async (file: File, targetPath: string, callback?: (url: string) => void) => {
    setUploading(targetPath)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'site-images')
      // Do NOT send Content-Type or auth headers with FormData — the browser sets multipart boundary automatically
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        if (targetPath && editForm) {
          updateField(targetPath, data.url)
        }
        callback?.(data.url)
        toast({ title: 'Imagen subida', description: `${Math.round(data.url.length / 1024)}KB` })
      } else {
        const errData = await res.json().catch(() => null)
        toast({ title: 'Error al subir', description: errData?.error || 'No se pudo subir la imagen', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo subir la imagen', variant: 'destructive' })
    } finally {
      setUploading(null)
    }
  }

  const updateField = (path: string, value: unknown) => {
    if (!editForm) return
    const keys = path.split('.')
    const copy = { ...editForm }
    let target: Record<string, unknown> = copy
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]] || typeof target[keys[i]] !== 'object') target[keys[i]] = {}
      target = target[keys[i]] as Record<string, unknown>
    }
    target[keys[keys.length - 1]] = value
    setEditForm(copy)
  }

  const getField = (path: string): string => {
    if (!editForm) return ''
    const keys = path.split('.')
    let target: unknown = editForm
    for (const key of keys) {
      if (target && typeof target === 'object' && key in (target as Record<string, unknown>)) target = (target as Record<string, unknown>)[key]
      else return ''
    }
    return String(target ?? '')
  }

  const getArray = (path: string): unknown[] => {
    if (!editForm) return []
    const keys = path.split('.')
    let target: unknown = editForm
    for (const key of keys) {
      if (target && typeof target === 'object' && key in (target as Record<string, unknown>)) target = (target as Record<string, unknown>)[key]
      else return []
    }
    return Array.isArray(target) ? target : []
  }

  const updateArrayItem = (path: string, idx: number, field: string, value: string | number | boolean) => {
    const arr = getArray(path)
    const copy = [...arr]
    copy[idx] = { ...(copy[idx] as Record<string, unknown>), [field]: value }
    updateField(path, copy)
  }

  const addArrayItem = (path: string, template: Record<string, unknown>) => {
    const arr = getArray(path)
    updateField(path, [...arr, template])
  }

  const removeArrayItem = (path: string, idx: number) => {
    const arr = getArray(path)
    updateField(path, arr.filter((_, i) => i !== idx))
  }

  /* ─── Generic image upload helper (for modals outside editForm context) ─── */
  const uploadFile = async (file: File, callback: (url: string) => void, uploadId: string) => {
    setUploading(uploadId)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'site-images')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        callback(data.url)
        toast({ title: 'Imagen subida', description: `${Math.round(data.url.length / 1024)}KB` })
      } else {
        const errData = await res.json().catch(() => null)
        toast({ title: 'Error al subir', description: errData?.error || 'No se pudo subir', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo subir la imagen', variant: 'destructive' })
    } finally {
      setUploading(null)
    }
  }

  /* ─── Reusable Image Uploader ─── */
  const ImageUploader = ({ label, path, currentUrl, onUpload, uploadId }: { label: string; path: string; currentUrl?: string; onUpload?: (url: string) => void; uploadId?: string }) => {
    const uid = uploadId || path
    return (
      <div>
        <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1.5 block">{label}</label>
        <div className="space-y-2">
          {currentUrl && (
            <div className="relative group rounded-xl overflow-hidden border border-white/10">
              <img src={currentUrl} alt={label} className="w-full h-32 object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button type="button" onClick={() => {
                  if (path && editForm) updateField(path, '')
                  onUpload?.('')
                }} className="p-1.5 rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            </div>
          )}
          <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            uploading === uid ? 'border-cm-primary/50 bg-cm-primary/5 text-cm-primary' : 'border-white/10 text-cm-on-surface-variant hover:border-cm-primary/30 hover:text-cm-primary'
          }`}>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                if (onUpload && !path) {
                  uploadFile(file, onUpload, uid)
                } else {
                  handleUploadImage(file, path, onUpload)
                }
              }
              e.target.value = ''
            }} />
            {uploading === uid ? (<><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span><span className="text-xs font-medium">Subiendo...</span></>)
              : (<><span className="material-symbols-outlined text-[18px]">cloud_upload</span><span className="text-xs font-medium">{currentUrl ? 'Cambiar imagen' : 'Subir imagen'}</span></>)}
          </label>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <span className="material-symbols-outlined text-4xl text-cm-on-surface-variant/30 animate-pulse block mb-2">edit_note</span>
        <p className="text-cm-on-surface-variant text-sm">Cargando contenido...</p>
      </div>
    )
  }

  return (
    <>
      <motion.div key="contenido" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-sora)] font-bold text-xl text-cm-on-surface">CMS de Inicio</h2>
            <p className="text-cm-on-surface-variant text-sm mt-1 font-[family-name:var(--font-inter)]">
              Administra todo el contenido de la página de inicio
            </p>
          </div>
          <button type="button"
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cm-primary/10 text-cm-primary border border-cm-primary/20 text-xs font-bold hover:bg-cm-primary/20 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            Vista Previa
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {([
            { key: 'secciones' as const, label: 'Secciones', icon: 'dashboard' },
            { key: 'promociones' as const, label: 'Promociones', icon: 'local_offer' },
            { key: 'banners' as const, label: 'Banners Hero', icon: 'view_carousel' },
            { key: 'noticias' as const, label: 'Noticias', icon: 'newspaper' },
          ]).map((tab) => (
            <button type="button"
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === tab.key
                  ? 'bg-cm-primary text-cm-on-primary shadow-lg shadow-cm-primary/20'
                  : 'bg-cm-surface-container-highest/60 text-cm-on-surface-variant hover:bg-cm-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
              {tab.key === 'promociones' && settings.activePromotions?.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-cm-on-primary/20 text-[9px]">{settings.activePromotions.length}</span>
              )}
              {tab.key === 'banners' && settings.heroBanners?.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-cm-on-primary/20 text-[9px]">{settings.heroBanners.length}</span>
              )}
              {tab.key === 'noticias' && (settings.news?.length || 0) > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-cm-on-primary/20 text-[9px]">{settings.news.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ═══════ SECCIONES TAB ═══════ */}
        {activeSubTab === 'secciones' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-[family-name:var(--font-sora)] font-semibold text-sm text-cm-on-surface">Orden de secciones</h3>
              <button type="button"
                onClick={addCustomSection}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cm-primary/10 text-cm-primary text-xs font-bold hover:bg-cm-primary/20 transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                Agregar sección
              </button>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {sectionOrder.map((key) => {
                    const isCustomKey = key.startsWith('custom_')
                    const meta = sectionMeta[key]
                    let label = meta?.label || key
                    let icon = meta?.icon || 'widgets'
                    let color = meta?.color || 'bg-gray-500'

                    if (isCustomKey) {
                      const csId = key.replace('custom_', '')
                      const cs = customSections.find((s) => s.id === csId)
                      label = cs?.title || 'Sección personalizada'
                      const typeColors: Record<string, string> = { banner: 'bg-cm-primary', notice: 'bg-amber-500', highlight: 'bg-purple-500', cta: 'bg-sky-500', gallery: 'bg-teal-500' }
                      const typeIcons: Record<string, string> = { banner: 'image', notice: 'campaign', highlight: 'star', cta: 'touch_app', gallery: 'photo_library' }
                      color = typeColors[cs?.type || 'banner'] || 'bg-gray-500'
                      icon = typeIcons[cs?.type || 'banner'] || 'widgets'
                    }

                    return (
                      <SortableSectionCard
                        key={key}
                        id={key}
                        label={label}
                        icon={icon}
                        color={color}
                        isCustom={isCustomKey}
                        visible={isCustomKey ? (customSections.find((s) => s.id === key.replace('custom_', ''))?.visible ?? true) : (visibility[key as keyof typeof visibility] ?? true)}
                        onToggle={() => {
                          if (isCustomKey) {
                            const csId = key.replace('custom_', '')
                            const cs = customSections.find((s) => s.id === csId)
                            if (cs) saveCustomSection({ ...cs, visible: !cs.visible })
                          } else {
                            toggleSectionVisibility(key)
                          }
                        }}
                        onEdit={() => {
                          if (isCustomKey) {
                            const csId = key.replace('custom_', '')
                            const cs = customSections.find((s) => s.id === csId)
                            if (cs) { setEditingCustom(cs); setCustomForm({ ...cs }) }
                          } else {
                            openEditor(key)
                          }
                        }}
                        onDelete={isCustomKey ? () => handleDeleteCustom(key.replace('custom_', '')) : undefined}
                      />
                    )
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* ═══════ PROMOCIONES TAB ═══════ */}
        {activeSubTab === 'promociones' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-[family-name:var(--font-sora)] font-semibold text-sm text-cm-on-surface">Promociones activas</h3>
              <button type="button" onClick={addPromotion} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cm-primary/10 text-cm-primary text-xs font-bold hover:bg-cm-primary/20 transition-all">
                <span className="material-symbols-outlined text-[14px]">add</span>
                Nueva promoción
              </button>
            </div>
            {settings.activePromotions.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center">
                <span className="material-symbols-outlined text-3xl text-cm-on-surface-variant/30 block mb-2">local_offer</span>
                <p className="text-cm-on-surface-variant text-sm">No hay promociones. Crea una para mostrarla en la página de inicio.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {settings.activePromotions.map((promo) => (
                  <div key={promo.id} className={`glass-card rounded-xl p-4 flex items-start gap-3 ${!promo.active ? 'opacity-40' : ''}`}>
                    {promo.image && <img src={promo.image} alt={promo.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-[family-name:var(--font-sora)] font-bold text-sm text-cm-on-surface truncate">{promo.title || 'Sin título'}</span>
                        {promo.discount && <span className="px-2 py-0.5 rounded-full bg-cm-primary/15 text-cm-primary text-[10px] font-bold">{promo.discount}</span>}
                      </div>
                      <p className="text-cm-on-surface-variant text-xs mt-0.5 truncate">{promo.description}</p>
                      {(promo.validFrom || promo.validUntil) && (
                        <p className="text-cm-on-surface-variant/60 text-[10px] mt-1">
                          {promo.validFrom} — {promo.validUntil || 'Sin límite'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button type="button" onClick={() => togglePromoActive(promo.id)} className={`p-1.5 rounded-lg transition-colors ${promo.active ? 'text-cm-primary hover:bg-cm-primary/10' : 'text-cm-on-surface-variant/40'}`}>
                        <span className="material-symbols-outlined text-[16px]">{promo.active ? 'toggle_on' : 'toggle_off'}</span>
                      </button>
                      <button type="button" onClick={() => { setEditingPromo(promo); setPromoForm({ ...promo }) }} className="p-1.5 rounded-lg text-cm-on-surface-variant hover:text-cm-primary hover:bg-cm-primary/10 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button type="button" onClick={() => deletePromo(promo.id)} className="p-1.5 rounded-lg text-cm-on-surface-variant hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════ BANNERS TAB ═══════ */}
        {activeSubTab === 'banners' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-[family-name:var(--font-sora)] font-semibold text-sm text-cm-on-surface">Banners del carrusel Hero</h3>
              <button type="button" onClick={addHeroBanner} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cm-primary/10 text-cm-primary text-xs font-bold hover:bg-cm-primary/20 transition-all">
                <span className="material-symbols-outlined text-[14px]">add</span>
                Nuevo banner
              </button>
            </div>
            {settings.heroBanners.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center">
                <span className="material-symbols-outlined text-3xl text-cm-on-surface-variant/30 block mb-2">view_carousel</span>
                <p className="text-cm-on-surface-variant text-sm">No hay banners. Agrega banners para mostrar un carrusel en el Hero.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {settings.heroBanners.map((banner, idx) => (
                  <div key={banner.id} className={`glass-card rounded-xl p-3 flex items-center gap-3 ${!banner.active ? 'opacity-40' : ''}`}>
                    <span className="text-cm-on-surface-variant text-xs font-bold w-6 text-center font-[family-name:var(--font-sora)]">#{idx + 1}</span>
                    {banner.image ? (
                      <img src={banner.image} alt={banner.title || ''} className="w-24 h-16 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-24 h-16 rounded-lg bg-cm-surface-container-highest flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-cm-on-surface-variant/30 text-[20px]">image</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-[family-name:var(--font-sora)] font-semibold text-sm text-cm-on-surface truncate block">{banner.title || 'Sin título'}</span>
                      {banner.subtitle && <span className="text-cm-on-surface-variant text-[10px] truncate block">{banner.subtitle}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button type="button" onClick={() => toggleBannerActive(banner.id)} className={`p-1.5 rounded-lg transition-colors ${banner.active ? 'text-cm-primary hover:bg-cm-primary/10' : 'text-cm-on-surface-variant/40'}`}>
                        <span className="material-symbols-outlined text-[16px]">{banner.active ? 'toggle_on' : 'toggle_off'}</span>
                      </button>
                      <button type="button" onClick={() => { setEditingBanner(banner); setBannerForm({ ...banner }) }} className="p-1.5 rounded-lg text-cm-on-surface-variant hover:text-cm-primary hover:bg-cm-primary/10 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button type="button" onClick={() => deleteBanner(banner.id)} className="p-1.5 rounded-lg text-cm-on-surface-variant hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════ NOTICIAS TAB ═══════ */}
        {activeSubTab === 'noticias' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-[family-name:var(--font-sora)] font-semibold text-sm text-cm-on-surface">Noticias y Anuncios</h3>
              <button type="button" onClick={addNews} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cm-primary/10 text-cm-primary text-xs font-bold hover:bg-cm-primary/20 transition-all">
                <span className="material-symbols-outlined text-[14px]">add</span>
                Nueva noticia
              </button>
            </div>
            {(!settings.news || settings.news.length === 0) ? (
              <div className="glass-card rounded-xl p-8 text-center">
                <span className="material-symbols-outlined text-3xl text-cm-on-surface-variant/30 block mb-2">newspaper</span>
                <p className="text-cm-on-surface-variant text-sm">No hay noticias. Crea una para mostrar anuncios en la página de inicio.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {[...settings.news].sort((a, b) => {
                  if (a.pinned && !b.pinned) return -1
                  if (!a.pinned && b.pinned) return 1
                  return 0
                }).map((newsItem) => (
                  <div key={newsItem.id} className={`glass-card rounded-xl p-4 flex items-start gap-3 ${!newsItem.active ? 'opacity-40' : ''}`}>
                    {newsItem.image ? (
                      <img src={newsItem.image} alt={newsItem.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-cm-surface-container-highest flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-cm-on-surface-variant/30 text-[20px]">article</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {newsItem.pinned && (
                          <span className="material-symbols-outlined text-[14px] text-cm-primary" style={{ fontVariationSettings: '"FILL" 1' }}>push_pin</span>
                        )}
                        <span className="font-[family-name:var(--font-sora)] font-bold text-sm text-cm-on-surface truncate">{newsItem.title || 'Sin título'}</span>
                      </div>
                      <p className="text-cm-on-surface-variant text-xs mt-0.5 line-clamp-2">{newsItem.content}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button type="button" onClick={() => toggleNewsPinned(newsItem.id)} className={`p-1.5 rounded-lg transition-colors ${newsItem.pinned ? 'text-cm-primary' : 'text-cm-on-surface-variant/40 hover:text-cm-primary/60'}`} title={newsItem.pinned ? 'Desfijar' : 'Fijar'}>
                        <span className="material-symbols-outlined text-[16px]">push_pin</span>
                      </button>
                      <button type="button" onClick={() => toggleNewsActive(newsItem.id)} className={`p-1.5 rounded-lg transition-colors ${newsItem.active ? 'text-cm-primary hover:bg-cm-primary/10' : 'text-cm-on-surface-variant/40'}`}>
                        <span className="material-symbols-outlined text-[16px]">{newsItem.active ? 'toggle_on' : 'toggle_off'}</span>
                      </button>
                      <button type="button" onClick={() => { setEditingNews(newsItem); setNewsForm({ ...newsItem }) }} className="p-1.5 rounded-lg text-cm-on-surface-variant hover:text-cm-primary hover:bg-cm-primary/10 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button type="button" onClick={() => deleteNews(newsItem.id)} className="p-1.5 rounded-lg text-cm-on-surface-variant hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ═══════ SECTION EDIT MODAL ═══════ */}
      {editSection && editForm && (
        <EditModal
          open={true}
          onClose={() => { setEditSection(null); setEditForm(null) }}
          title={`Editar: ${sectionMeta[editSection]?.label || editSection}`}
          onSave={handleSave}
          saving={saving}
        >
          {editSection === 'hero' && (
            <>
              <FormField label="Ubicación" value={getField('location')} onChange={(v) => updateField('location', v)} />
              <FormField label="Badge" value={getField('badge')} onChange={(v) => updateField('badge', v)} />
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Título" value={getField('headline')} onChange={(v) => updateField('headline', v)} />
                <FormField label="Highlight" value={getField('headlineHighlight')} onChange={(v) => updateField('headlineHighlight', v)} />
              </div>
              <FormField label="Subtítulo" value={getField('subtitle')} onChange={(v) => updateField('subtitle', v)} type="textarea" />
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Promo Highlight" value={getField('promoHighlight')} onChange={(v) => updateField('promoHighlight', v)} />
                <FormField label="Promo Text" value={getField('promoText')} onChange={(v) => updateField('promoText', v)} />
              </div>
              <div className="space-y-3">
                <ImageUploader label="Imagen de fondo principal" path="backgroundImage" currentUrl={getField('backgroundImage')} />
                <ImageUploader label="Imagen secundaria" path="secondaryImage" currentUrl={getField('secondaryImage')} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">Estadísticas</label>
                  <button type="button" onClick={() => addArrayItem('stats', { label: 'Nuevo', value: 0 })} className="text-[10px] font-semibold text-cm-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">add</span> Agregar
                  </button>
                </div>
                {(getArray('stats') as Array<{ label: string; value: number }>).map((stat, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <input value={stat.label} onChange={(e) => updateArrayItem('stats', idx, 'label', e.target.value)} placeholder="Etiqueta" className="flex-1 px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]" />
                    <input type="number" value={stat.value} onChange={(e) => updateArrayItem('stats', idx, 'value', parseInt(e.target.value) || 0)} className="w-20 px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-sm text-cm-on-surface text-center focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]" />
                    <button type="button" onClick={() => removeArrayItem('stats', idx)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                  </div>
                ))}
              </div>
            </>
          )}
          {editSection === 'sportsSection' && (
            <>
              <FormField label="Badge" value={getField('badge')} onChange={(v) => updateField('badge', v)} />
              <FormField label="Título" value={getField('title')} onChange={(v) => updateField('title', v)} />
              <FormField label="Subtítulo" value={getField('subtitle')} onChange={(v) => updateField('subtitle', v)} type="textarea" />
              {(getArray('sports') as Array<Record<string, unknown>>).map((sport, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-cm-primary text-xs font-bold font-[family-name:var(--font-sora)]">
                    <span className="material-symbols-outlined text-[16px]">sports</span>
                    {sport.label || `Deporte #${idx + 1}`}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="Nombre" value={String(sport.label || '')} onChange={(v) => updateArrayItem('sports', idx, 'label', v)} />
                    <FormField label="Precio" value={String(sport.priceRange || '')} onChange={(v) => updateArrayItem('sports', idx, 'priceRange', v)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="Cantidad" value={String(sport.count || '')} onChange={(v) => updateArrayItem('sports', idx, 'count', v)} type="number" />
                    <FormField label="Badge" value={String(sport.badge || '')} onChange={(v) => updateArrayItem('sports', idx, 'badge', v)} />
                  </div>
                  <ArrayField label="Amenidades" items={(sport.amenities as string[]) || []} onChange={(items) => updateArrayItem('sports', idx, 'amenities', items)} />
                  <ImageUploader label={`Imagen de ${sport.label || 'deporte'}`} path={`sports.${idx}.image`} currentUrl={String(sport.image || '')} />
                  {/* Pricing details editor */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">Detalles de precio</label>
                      <button type="button" onClick={() => {
                        const pricing = (sport.pricingDetails as Array<Record<string, unknown>>) || []
                        updateArrayItem('sports', idx, 'pricingDetails', [...pricing, { label: 'Nuevo turno', timeRange: '', price: 0 }])
                      }} className="text-[10px] font-semibold text-cm-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">add</span> Agregar turno
                      </button>
                    </div>
                    {((sport.pricingDetails as Array<Record<string, unknown>>) || []).map((pd, pdIdx) => (
                      <div key={pdIdx} className="flex items-center gap-1.5 mb-1.5 p-2 rounded-lg bg-cm-surface-container-highest/20">
                        <input value={String(pd.label || '')} onChange={(e) => {
                          const arr = [...((sport.pricingDetails as Array<Record<string, unknown>>) || [])]
                          arr[pdIdx] = { ...arr[pdIdx], label: e.target.value }
                          updateArrayItem('sports', idx, 'pricingDetails', arr)
                        }} placeholder="Turno" className="w-20 px-2 py-1.5 bg-transparent border border-white/10 rounded-lg text-xs text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]" />
                        <input value={String(pd.timeRange || '')} onChange={(e) => {
                          const arr = [...((sport.pricingDetails as Array<Record<string, unknown>>) || [])]
                          arr[pdIdx] = { ...arr[pdIdx], timeRange: e.target.value }
                          updateArrayItem('sports', idx, 'pricingDetails', arr)
                        }} placeholder="7:00 - 5:00 PM" className="flex-1 px-2 py-1.5 bg-transparent border border-white/10 rounded-lg text-xs text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]" />
                        <div className="flex items-center gap-0.5">
                          <span className="text-[10px] text-cm-on-surface-variant">S/.</span>
                          <input type="number" value={String(pd.price || 0)} onChange={(e) => {
                            const arr = [...((sport.pricingDetails as Array<Record<string, unknown>>) || [])]
                            arr[pdIdx] = { ...arr[pdIdx], price: parseFloat(e.target.value) || 0 }
                            updateArrayItem('sports', idx, 'pricingDetails', arr)
                          }} className="w-14 px-2 py-1.5 bg-transparent border border-white/10 rounded-lg text-xs text-cm-on-surface text-center focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]" />
                        </div>
                        <button type="button" onClick={() => {
                          const arr = ((sport.pricingDetails as Array<Record<string, unknown>>) || []).filter((_, i) => i !== pdIdx)
                          updateArrayItem('sports', idx, 'pricingDetails', arr)
                        }} className="p-1 rounded text-red-400 hover:bg-red-500/10">
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
          {editSection === 'featuredCourts' && (
            <>
              <FormField label="Badge" value={getField('badge')} onChange={(v) => updateField('badge', v)} placeholder="Ej. Nuestras canchas" />
              <FormField label="Título" value={getField('title')} onChange={(v) => updateField('title', v)} placeholder="Canchas Destacadas" />
              <FormField label="Subtítulo" value={getField('subtitle')} onChange={(v) => updateField('subtitle', v)} type="textarea" placeholder="Elige tu espacio ideal y reserva al instante" />
              <FormField label="Texto del botón CTA" value={getField('ctaText')} onChange={(v) => updateField('ctaText', v)} placeholder="Ver Todas" />
              <div className="p-3 rounded-xl bg-cm-surface-container-highest/20 border border-white/5">
                <p className="text-[10px] text-cm-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  Las canchas mostradas provienen del módulo "Canchas". Usa esa pestaña para editar nombres, precios e imágenes de cada cancha.
                </p>
              </div>
            </>
          )}
          {editSection === 'promoBanner' && (
            <>
              <FormField label="Badge" value={getField('badge')} onChange={(v) => updateField('badge', v)} />
              <FormField label="Título" value={getField('title')} onChange={(v) => updateField('title', v)} />
              <FormField label="Subtítulo" value={getField('subtitle')} onChange={(v) => updateField('subtitle', v)} type="textarea" />
              <FormField label="Texto CTA" value={getField('ctaText')} onChange={(v) => updateField('ctaText', v)} />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">Puntos de venta</label>
                  <button type="button" onClick={() => addArrayItem('sellingPoints', { icon: 'star', title: '', description: '', highlight: false })} className="text-[10px] font-semibold text-cm-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">add</span> Agregar
                  </button>
                </div>
                {(getArray('sellingPoints') as Array<Record<string, unknown>>).map((pt, idx) => (
                  <div key={idx} className="p-2 rounded-lg border border-white/10 mb-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-cm-on-surface-variant font-semibold">#{idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-[10px] text-cm-primary cursor-pointer">
                          <input type="checkbox" checked={!!pt.highlight} onChange={(e) => updateArrayItem('sellingPoints', idx, 'highlight', e.target.checked)} className="accent-green-500" />
                          Destacado
                        </label>
                        <button type="button" onClick={() => removeArrayItem('sellingPoints', idx)} className="p-1 rounded text-red-400 hover:bg-red-500/10"><span className="material-symbols-outlined text-[14px]">delete</span></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <FormField label="Icono" value={String(pt.icon || '')} onChange={(v) => updateArrayItem('sellingPoints', idx, 'icon', v)} />
                      <FormField label="Título" value={String(pt.title || '')} onChange={(v) => updateArrayItem('sellingPoints', idx, 'title', v)} />
                      <FormField label="Descripción" value={String(pt.description || '')} onChange={(v) => updateArrayItem('sellingPoints', idx, 'description', v)} />
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">Métodos de pago</label>
                  <button type="button" onClick={() => addArrayItem('paymentMethods', { name: '', icon: 'payments', color: 'text-gray-400' })} className="text-[10px] font-semibold text-cm-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">add</span> Agregar
                  </button>
                </div>
                {(getArray('paymentMethods') as Array<Record<string, unknown>>).map((pm, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <input value={String(pm.name || '')} onChange={(e) => updateArrayItem('paymentMethods', idx, 'name', e.target.value)} placeholder="Nombre" className="flex-1 px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]" />
                    <input value={String(pm.icon || '')} onChange={(e) => updateArrayItem('paymentMethods', idx, 'icon', e.target.value)} placeholder="Icono" className="w-28 px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]" />
                    <button type="button" onClick={() => removeArrayItem('paymentMethods', idx)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                  </div>
                ))}
              </div>
            </>
          )}
          {editSection === 'howItWorks' && (
            <>
              <FormField label="Badge" value={getField('badge')} onChange={(v) => updateField('badge', v)} />
              <FormField label="Título" value={getField('title')} onChange={(v) => updateField('title', v)} />
              <FormField label="Subtítulo" value={getField('subtitle')} onChange={(v) => updateField('subtitle', v)} type="textarea" />
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Texto WhatsApp" value={getField('whatsappText')} onChange={(v) => updateField('whatsappText', v)} />
                <FormField label="Texto Soporte" value={getField('supportText')} onChange={(v) => updateField('supportText', v)} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">Pasos</label>
                  <button type="button" onClick={() => addArrayItem('steps', { number: '', title: '', description: '', icon: 'star', detail: '' })} className="text-[10px] font-semibold text-cm-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">add</span> Agregar
                  </button>
                </div>
                {(getArray('steps') as Array<Record<string, unknown>>).map((step, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-white/10 mb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-cm-primary font-bold font-[family-name:var(--font-sora)]">Paso {step.number || idx + 1}</span>
                      <button type="button" onClick={() => removeArrayItem('steps', idx)} className="p-1 rounded text-red-400 hover:bg-red-500/10"><span className="material-symbols-outlined text-[14px]">delete</span></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField label="Título" value={String(step.title || '')} onChange={(v) => updateArrayItem('steps', idx, 'title', v)} />
                      <FormField label="Icono" value={String(step.icon || '')} onChange={(v) => updateArrayItem('steps', idx, 'icon', v)} />
                    </div>
                    <FormField label="Descripción" value={String(step.description || '')} onChange={(v) => updateArrayItem('steps', idx, 'description', v)} type="textarea" rows={2} />
                    <FormField label="Detalle" value={String(step.detail || '')} onChange={(v) => updateArrayItem('steps', idx, 'detail', v)} />
                  </div>
                ))}
              </div>
            </>
          )}
        </EditModal>
      )}

      {/* ═══════ CUSTOM SECTION MODAL ═══════ */}
      <EditModal
        open={!!editingCustom}
        onClose={() => { setEditingCustom(null); setCustomForm(null) }}
        title={customForm?.id && settings?.customSections.some((s) => s.id === customForm.id) ? 'Editar sección personalizada' : 'Nueva sección personalizada'}
        onSave={handleSaveCustom}
        saving={savingCustom}
      >
        {customForm && (
          <>
            <div>
              <label className="text-xs text-cm-on-surface-variant font-semibold mb-1.5 block font-[family-name:var(--font-inter)]">Tipo de sección</label>
              <select
                value={customForm.type}
                onChange={(e) => setCustomForm({ ...customForm, type: e.target.value as CustomSection['type'] })}
                className="w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40"
              >
                <option value="banner">Banner (imagen completa)</option>
                <option value="notice">Aviso / Noticia</option>
                <option value="highlight">Destacado</option>
                <option value="cta">Llamada a la acción (CTA)</option>
                <option value="gallery">Galería de imágenes</option>
              </select>
            </div>
            <FormField label="Título" value={customForm.title} onChange={(v) => setCustomForm({ ...customForm, title: v })} />
            <FormField label="Subtítulo" value={customForm.subtitle || ''} onChange={(v) => setCustomForm({ ...customForm, subtitle: v })} type="textarea" />
            {customForm.type !== 'notice' && (
              <ImageUploader label="Imagen" path="" currentUrl={customForm.image || ''} onUpload={(url) => setCustomForm({ ...customForm, image: url })} uploadId="custom-image" />
            )}
            <FormField label="Enlace (URL opcional)" value={customForm.link || ''} onChange={(v) => setCustomForm({ ...customForm, link: v })} />
            {(customForm.type === 'banner' || customForm.type === 'cta') && (
              <FormField label="Texto del botón CTA" value={customForm.ctaText || ''} onChange={(v) => setCustomForm({ ...customForm, ctaText: v })} />
            )}
            {/* Gallery items management */}
            {customForm.type === 'gallery' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">Imágenes de la galería</label>
                  <button type="button" onClick={() => setCustomForm({
                    ...customForm,
                    items: [...(customForm.items || []), { image: '', title: '', description: '' }],
                  })} className="text-[10px] font-semibold text-cm-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">add</span> Agregar imagen
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(customForm.items || []).map((item, idx) => (
                    <div key={idx} className="rounded-xl border border-white/10 p-2 space-y-1.5">
                      {item.image ? (
                        <div className="relative group rounded-lg overflow-hidden">
                          <img src={item.image} alt={item.title || ''} className="w-full h-20 object-cover" />
                          <button type="button" onClick={() => {
                            const items = [...(customForm.items || [])]
                            items[idx] = { ...items[idx], image: '' }
                            setCustomForm({ ...customForm, items })
                          }} className="absolute top-1 right-1 p-0.5 rounded bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-[12px]">close</span>
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center h-20 rounded-lg border border-dashed border-white/10 cursor-pointer hover:border-cm-primary/30 transition-colors">
                          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const fd = new FormData()
                              fd.append('file', file)
                              fd.append('folder', 'gallery')
                              fetch('/api/upload', { method: 'POST', body: fd })
                                .then((r) => r.json())
                                .then((data) => {
                                  const items = [...(customForm.items || [])]
                                  items[idx] = { ...items[idx], image: data.url }
                                  setCustomForm({ ...customForm, items })
                                  toast({ title: 'Imagen subida' })
                                })
                                .catch(() => toast({ title: 'Error al subir', variant: 'destructive' }))
                            }
                            e.target.value = ''
                          }} />
                          <span className="material-symbols-outlined text-cm-on-surface-variant/30 text-[20px]">add_photo_alternate</span>
                        </label>
                      )}
                      <input value={item.title || ''} onChange={(e) => {
                        const items = [...(customForm.items || [])]
                        items[idx] = { ...items[idx], title: e.target.value }
                        setCustomForm({ ...customForm, items })
                      }} placeholder="Título" className="w-full px-2 py-1 bg-transparent border border-white/10 rounded-lg text-[10px] text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]" />
                      <button type="button" onClick={() => {
                        const items = (customForm.items || []).filter((_, i) => i !== idx)
                        setCustomForm({ ...customForm, items })
                      }} className="flex items-center gap-1 text-red-400 hover:text-red-300 text-[10px]">
                        <span className="material-symbols-outlined text-[12px]">delete</span> Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-cm-on-surface-variant cursor-pointer">
                <input type="checkbox" checked={customForm.visible} onChange={(e) => setCustomForm({ ...customForm, visible: e.target.checked })} className="accent-green-500" />
                Sección visible
              </label>
            </div>
          </>
        )}
      </EditModal>

      {/* ═══════ PROMOTION MODAL ═══════ */}
      <EditModal
        open={!!editingPromo}
        onClose={() => { setEditingPromo(null); setPromoForm(null) }}
        title="Promoción"
        onSave={handleSavePromo}
        saving={savingPromo}
      >
        {promoForm && (
          <>
            <FormField label="Título" value={promoForm.title} onChange={(v) => setPromoForm({ ...promoForm, title: v })} />
            <FormField label="Descripción" value={promoForm.description} onChange={(v) => setPromoForm({ ...promoForm, description: v })} type="textarea" />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Descuento (ej. 20%)" value={promoForm.discount || ''} onChange={(v) => setPromoForm({ ...promoForm, discount: v })} />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-cm-on-surface-variant cursor-pointer">
                  <input type="checkbox" checked={promoForm.active} onChange={(e) => setPromoForm({ ...promoForm, active: e.target.checked })} className="accent-green-500" />
                  Activar
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Válido desde" value={promoForm.validFrom || ''} onChange={(v) => setPromoForm({ ...promoForm, validFrom: v })} />
              <FormField label="Válido hasta" value={promoForm.validUntil || ''} onChange={(v) => setPromoForm({ ...promoForm, validUntil: v })} />
            </div>
            <ImageUploader label="Imagen de promoción" path="" currentUrl={promoForm.image || ''} onUpload={(url) => setPromoForm({ ...promoForm, image: url })} uploadId="promo-image" />
          </>
        )}
      </EditModal>

      {/* ═══════ HERO BANNER MODAL ═══════ */}
      <EditModal
        open={!!editingBanner}
        onClose={() => { setEditingBanner(null); setBannerForm(null) }}
        title="Banner del Hero"
        onSave={handleSaveBanner}
        saving={savingBanner}
      >
        {bannerForm && (
          <>
            <FormField label="Título" value={bannerForm.title || ''} onChange={(v) => setBannerForm({ ...bannerForm, title: v })} />
            <FormField label="Subtítulo" value={bannerForm.subtitle || ''} onChange={(v) => setBannerForm({ ...bannerForm, subtitle: v })} />
            <FormField label="Enlace (URL)" value={bannerForm.link || ''} onChange={(v) => setBannerForm({ ...bannerForm, link: v })} />
            <ImageUploader label="Imagen del banner" path="" currentUrl={bannerForm.image || ''} onUpload={(url) => setBannerForm({ ...bannerForm, image: url })} uploadId="banner-image" />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-cm-on-surface-variant cursor-pointer">
                <input type="checkbox" checked={bannerForm.active} onChange={(e) => setBannerForm({ ...bannerForm, active: e.target.checked })} className="accent-green-500" />
                Banner activo
              </label>
            </div>
          </>
        )}
      </EditModal>

      {/* ═══════ NEWS MODAL ═══════ */}
      <EditModal
        open={!!editingNews}
        onClose={() => { setEditingNews(null); setNewsForm(null) }}
        title={newsForm?.id && settings?.news.some((n) => n.id === newsForm.id) ? 'Editar noticia' : 'Nueva noticia'}
        onSave={handleSaveNews}
        saving={savingNews}
      >
        {newsForm && (
          <>
            <FormField label="Título" value={newsForm.title} onChange={(v) => setNewsForm({ ...newsForm, title: v })} placeholder="Título de la noticia" />
            <FormField label="Contenido" value={newsForm.content} onChange={(v) => setNewsForm({ ...newsForm, content: v })} type="textarea" rows={4} placeholder="Escribe el contenido o descripción de la noticia..." />
            <FormField label="Enlace (URL opcional)" value={newsForm.link || ''} onChange={(v) => setNewsForm({ ...newsForm, link: v })} placeholder="https://..." />
            <ImageUploader label="Imagen de la noticia" path="" currentUrl={newsForm.image || ''} onUpload={(url) => setNewsForm({ ...newsForm, image: url })} uploadId="news-image" />
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-xs text-cm-on-surface-variant cursor-pointer">
                <input type="checkbox" checked={newsForm.active} onChange={(e) => setNewsForm({ ...newsForm, active: e.target.checked })} className="accent-green-500" />
                Publicada (activa)
              </label>
              <label className="flex items-center gap-2 text-xs text-cm-on-surface-variant cursor-pointer">
                <input type="checkbox" checked={newsForm.pinned} onChange={(e) => setNewsForm({ ...newsForm, pinned: e.target.checked })} className="accent-cm-primary" />
                Fijar como destacada
              </label>
            </div>
          </>
        )}
      </EditModal>

      {/* ═══════ PREVIEW MODAL ═══════ */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-5xl max-h-[90vh] glass-card rounded-2xl overflow-hidden flex flex-col border-cm-primary/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-cm-surface-container/50">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-cm-primary text-[22px]" style={{ fontVariationSettings: '"FILL" 1' }}>preview</span>
                  <h2 className="font-[family-name:var(--font-sora)] font-bold text-lg text-cm-on-surface">Vista Previa — Inicio</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-lg bg-cm-primary/10 text-cm-primary text-[10px] font-bold">{sectionOrder.filter((k) => {
                    const v = k.startsWith('custom_') ? customSections.find((s) => s.id === k.replace('custom_', ''))?.visible ?? true : (visibility[k as keyof typeof visibility] ?? true)
                    return v
                  }).length} secciones visibles</span>
                  <button type="button" onClick={() => setShowPreview(false)} className="p-1.5 rounded-full hover:bg-cm-surface-container-highest transition-colors">
                    <span className="material-symbols-outlined text-cm-on-surface-variant">close</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto bg-cm-background/50">
                {/* Mobile frame preview */}
                <div className="flex justify-center py-6 px-4">
                  <div className="w-full max-w-[390px] bg-cm-background rounded-[2rem] shadow-2xl shadow-black/40 overflow-hidden border border-white/10">
                    {/* Status bar */}
                    <div className="flex items-center justify-between px-6 pt-3 pb-1">
                      <span className="text-[10px] text-cm-on-surface-variant font-medium">9:41</span>
                      <div className="w-20 h-5 bg-cm-on-surface rounded-full"></div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px] text-cm-on-surface-variant">signal_cellular_alt</span>
                        <span className="material-symbols-outlined text-[12px] text-cm-on-surface-variant">battery_full</span>
                      </div>
                    </div>
                    {/* Content preview */}
                    <div className="overflow-y-auto max-h-[70vh]">
                      {sectionOrder.map((key) => {
                        const isVisible = key.startsWith('custom_')
                          ? customSections.find((s) => s.id === key.replace('custom_', ''))?.visible ?? true
                          : (visibility[key as keyof typeof visibility] ?? true)
                        if (!isVisible) return null

                        return (
                          <div key={key} className="relative">
                            {/* Hidden sections indicator */}
                            {!isVisible && (
                              <div className="px-4 py-2 bg-white/5 border-l-2 border-gray-500/50">
                                <span className="text-[10px] text-cm-on-surface-variant/50 font-medium">OCULTO — {sectionMeta[key]?.label || key}</span>
                              </div>
                            )}

                            {/* ── Hero Section Preview ── */}
                            {key === 'hero' && (
                              <div className="relative overflow-hidden">
                                {settings.hero.backgroundImage ? (
                                  <img src={settings.hero.backgroundImage} alt="" className="w-full h-56 object-cover" />
                                ) : (
                                  <div className="w-full h-56 bg-gradient-to-br from-cm-primary/30 to-cm-primary/5" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-5">
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <span className="material-symbols-outlined text-[12px] text-cm-primary">location_on</span>
                                    <span className="text-[10px] text-white/70">{settings.hero.location}</span>
                                  </div>
                                  <div className="px-2.5 py-1 rounded-full bg-cm-primary/20 backdrop-blur-sm inline-block mb-2">
                                    <span className="text-[10px] text-cm-primary font-bold">{settings.hero.badge}</span>
                                  </div>
                                  <h3 className="text-lg font-bold text-white font-[family-name:var(--font-sora)] leading-tight">
                                    {settings.hero.headline} <span className="text-cm-primary">{settings.hero.headlineHighlight}</span>
                                  </h3>
                                  <p className="text-[10px] text-white/60 mt-1 line-clamp-2">{settings.hero.subtitle}</p>
                                  <div className="flex gap-3 mt-3">
                                    {settings.hero.stats.map((stat, i) => (
                                      <div key={i} className="text-center">
                                        <span className="text-sm font-bold text-white font-[family-name:var(--font-sora)]">{stat.value}</span>
                                        <p className="text-[9px] text-white/50">{stat.label}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* ── Sports Section Preview ── */}
                            {key === 'sportsSection' && (
                              <div className="p-4">
                                <div className="px-2.5 py-1 rounded-full bg-green-500/15 inline-block mb-1">
                                  <span className="text-[10px] text-green-400 font-bold">{settings.sportsSection.badge}</span>
                                </div>
                                <h3 className="text-base font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">{settings.sportsSection.title}</h3>
                                <p className="text-[10px] text-cm-on-surface-variant mt-0.5">{settings.sportsSection.subtitle}</p>
                                <div className="mt-3 space-y-3">
                                  {settings.sportsSection.sports.map((sport) => (
                                    <div key={sport.id} className="rounded-xl overflow-hidden border border-white/10">
                                      {sport.image ? (
                                        <img src={sport.image} alt={sport.label} className="w-full h-28 object-cover" />
                                      ) : (
                                        <div className="w-full h-28 bg-cm-surface-container-highest flex items-center justify-center">
                                          <span className="material-symbols-outlined text-3xl text-cm-on-surface-variant/20">{sport.icon || 'sports'}</span>
                                        </div>
                                      )}
                                      <div className="p-3">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-cm-on-surface font-[family-name:var(--font-sora)]">{sport.label}</span>
                                            {sport.badge && (
                                              <span className="px-1.5 py-0.5 rounded-full bg-cm-primary/15 text-cm-primary text-[8px] font-bold">{sport.badge}</span>
                                            )}
                                          </div>
                                          <span className="text-sm font-bold text-cm-primary">{sport.priceRange}</span>
                                        </div>
                                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                          {sport.pricingDetails?.map((pd, i) => (
                                            <span key={i} className="px-2 py-0.5 rounded-lg bg-white/5 text-[9px] text-cm-on-surface-variant">
                                              {pd.label}: {pd.timeRange} — S/. {pd.price}
                                            </span>
                                          ))}
                                        </div>
                                        <div className="flex gap-1 mt-2 flex-wrap">
                                          {sport.amenities.map((a, i) => (
                                            <span key={i} className="px-1.5 py-0.5 rounded-full bg-white/5 text-[8px] text-cm-on-surface-variant">{a}</span>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* ── Featured Courts Preview ── */}
                            {key === 'featuredCourts' && (
                              <div className="p-4">
                                {settings.featuredCourts?.badge && (
                                  <div className="px-2.5 py-1 rounded-full bg-teal-500/15 inline-block mb-1">
                                    <span className="text-[10px] text-teal-400 font-bold">{settings.featuredCourts.badge}</span>
                                  </div>
                                )}
                                <h3 className="text-base font-bold text-cm-on-surface font-[family-name:var(--font-sora)] mb-1">{settings.featuredCourts?.title || 'Canchas Destacadas'}</h3>
                                <p className="text-[10px] text-cm-on-surface-variant mb-3">{settings.featuredCourts?.subtitle || 'Reserva tu espacio favorito'}</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {['Cancha Fútbol 1', 'Cancha Fútbol 2', 'Cancha Vóley A', 'Cancha Vóley B'].map((name, i) => (
                                    <div key={i} className="rounded-xl border border-white/10 p-2.5 bg-cm-surface-container/30">
                                      <div className="w-full h-16 rounded-lg bg-cm-surface-container-highest flex items-center justify-center mb-1.5">
                                        <span className="material-symbols-outlined text-xl text-cm-on-surface-variant/20">{i < 2 ? 'sports_soccer' : 'sports_volleyball'}</span>
                                      </div>
                                      <span className="text-[10px] font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">{name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* ── Promo Banner Preview ── */}
                            {key === 'promoBanner' && (
                              <div className="p-4">
                                <div className="px-2.5 py-1 rounded-full bg-purple-500/15 inline-block mb-1">
                                  <span className="text-[10px] text-purple-400 font-bold">{settings.promoBanner.badge}</span>
                                </div>
                                <h3 className="text-base font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">{settings.promoBanner.title}</h3>
                                <p className="text-[10px] text-cm-on-surface-variant mt-0.5">{settings.promoBanner.subtitle}</p>
                                <div className="mt-3 space-y-2">
                                  {settings.promoBanner.sellingPoints.map((sp, i) => (
                                    <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-xl ${sp.highlight ? 'bg-cm-primary/10 border border-cm-primary/20' : 'bg-white/5'}`}>
                                      <span className="material-symbols-outlined text-[18px] text-cm-primary mt-0.5" style={{ fontVariationSettings: '"FILL" 1' }}>{sp.icon || 'star'}</span>
                                      <div>
                                        <span className="text-xs font-bold text-cm-on-surface">{sp.title}</span>
                                        <p className="text-[9px] text-cm-on-surface-variant mt-0.5">{sp.description}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                  {settings.promoBanner.paymentMethods.map((pm, i) => (
                                    <span key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5">
                                      <span className="material-symbols-outlined text-[12px]">{pm.icon}</span>
                                      <span className="text-[9px] text-cm-on-surface-variant">{pm.name}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* ── How It Works Preview ── */}
                            {key === 'howItWorks' && (
                              <div className="p-4">
                                <div className="px-2.5 py-1 rounded-full bg-sky-500/15 inline-block mb-1">
                                  <span className="text-[10px] text-sky-400 font-bold">{settings.howItWorks.badge}</span>
                                </div>
                                <h3 className="text-base font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">{settings.howItWorks.title}</h3>
                                <p className="text-[10px] text-cm-on-surface-variant mt-0.5 mb-3">{settings.howItWorks.subtitle}</p>
                                <div className="space-y-2.5">
                                  {settings.howItWorks.steps.map((step, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                      <div className="w-8 h-8 rounded-full bg-cm-primary/15 flex items-center justify-center flex-shrink-0">
                                        <span className="text-[10px] font-bold text-cm-primary">{step.number}</span>
                                      </div>
                                      <div className="flex-1 pt-0.5">
                                        <span className="text-xs font-bold text-cm-on-surface">{step.title}</span>
                                        <p className="text-[9px] text-cm-on-surface-variant mt-0.5 line-clamp-2">{step.description}</p>
                                      </div>
                                      {i < settings.howItWorks.steps.length - 1 && (
                                        <div className="absolute left-[22px] top-8 w-0.5 h-3 bg-cm-primary/20" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* ── Custom Section Preview ── */}
                            {key.startsWith('custom_') && (() => {
                              const cs = customSections.find((s) => s.id === key.replace('custom_', ''))
                              if (!cs) return null
                              const typeConfig: Record<string, { color: string; icon: string }> = {
                                banner: { color: 'border-l-cm-primary', icon: 'image' },
                                notice: { color: 'border-l-amber-400', icon: 'campaign' },
                                highlight: { color: 'border-l-purple-400', icon: 'star' },
                                cta: { color: 'border-l-sky-400', icon: 'touch_app' },
                                gallery: { color: 'border-l-teal-400', icon: 'photo_library' },
                              }
                              const cfg = typeConfig[cs.type] || typeConfig.banner
                              return (
                                <div className={`border-l-2 ${cfg.color} p-3 mx-4 my-2 rounded-r-xl bg-white/5`}>
                                  {cs.image && (
                                    <img src={cs.image} alt={cs.title} className="w-full h-32 object-cover rounded-lg mb-2" />
                                  )}
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="material-symbols-outlined text-[14px] text-cm-on-surface-variant">{cfg.icon}</span>
                                    <span className="text-[10px] text-cm-on-surface-variant/60 font-semibold uppercase">{cs.type}</span>
                                  </div>
                                  <h4 className="text-sm font-bold text-cm-on-surface">{cs.title}</h4>
                                  {cs.subtitle && <p className="text-[10px] text-cm-on-surface-variant mt-0.5">{cs.subtitle}</p>}
                                  {cs.ctaText && (
                                    <div className="mt-2">
                                      <span className="px-3 py-1.5 rounded-lg bg-cm-primary text-cm-on-primary text-[10px] font-bold inline-block">{cs.ctaText}</span>
                                    </div>
                                  )}
                                  {cs.type === 'gallery' && cs.items && cs.items.length > 0 && (
                                    <div className="mt-2 grid grid-cols-3 gap-1">
                                      {cs.items.map((item, i) => (
                                        <img key={i} src={item.image} alt={item.title || ''} className="w-full h-16 object-cover rounded-lg" />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })()}
                          </div>
                        )
                      })}

                      {/* Active promotions strip */}
                      {settings.activePromotions.filter((p) => p.active).length > 0 && (
                        <div className="px-4 pb-3">
                          <div className="rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/20 p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="material-symbols-outlined text-amber-400 text-[14px]" style={{ fontVariationSettings: '"FILL" 1' }}>local_offer</span>
                              <span className="text-[10px] text-amber-400 font-bold">Promociones</span>
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {settings.activePromotions.filter((p) => p.active).map((p) => (
                                <div key={p.id} className="flex-shrink-0 w-48 rounded-lg bg-white/5 p-2">
                                  {p.image && <img src={p.image} alt={p.title} className="w-full h-16 object-cover rounded-md mb-1.5" />}
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-bold text-cm-on-surface truncate">{p.title}</span>
                                    {p.discount && <span className="px-1 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[8px] font-bold flex-shrink-0">{p.discount}</span>}
                                  </div>
                                  {p.description && <p className="text-[8px] text-cm-on-surface-variant mt-0.5 line-clamp-1">{p.description}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Hero banners strip */}
                      {settings.heroBanners.filter((b) => b.active).length > 0 && (
                        <div className="px-4 pb-4">
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="material-symbols-outlined text-sky-400 text-[14px]">view_carousel</span>
                            <span className="text-[10px] text-sky-400 font-bold">Carrusel Hero ({settings.heroBanners.filter((b) => b.active).length})</span>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {settings.heroBanners.filter((b) => b.active).map((b) => (
                              <div key={b.id} className="flex-shrink-0 w-56 rounded-lg overflow-hidden border border-white/10">
                                {b.image ? (
                                  <img src={b.image} alt={b.title || ''} className="w-full h-24 object-cover" />
                                ) : (
                                  <div className="w-full h-24 bg-cm-surface-container-highest flex items-center justify-center">
                                    <span className="material-symbols-outlined text-cm-on-surface-variant/20">image</span>
                                  </div>
                                )}
                                <div className="p-2">
                                  {b.title && <span className="text-[10px] font-bold text-cm-on-surface">{b.title}</span>}
                                  {b.subtitle && <p className="text-[8px] text-cm-on-surface-variant">{b.subtitle}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* News strip */}
                      {settings.news && settings.news.filter((n) => n.active).length > 0 && (
                        <div className="px-4 pb-3">
                          <div className="rounded-xl bg-gradient-to-r from-cm-primary/10 to-teal-500/10 border border-cm-primary/20 p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="material-symbols-outlined text-cm-primary text-[14px]" style={{ fontVariationSettings: '"FILL" 1' }}>newspaper</span>
                              <span className="text-[10px] text-cm-primary font-bold">Noticias</span>
                            </div>
                            <div className="space-y-2">
                              {[...settings.news].filter((n) => n.active).sort((a, b) => (a.pinned && !b.pinned ? -1 : 0)).slice(0, 3).map((n) => (
                                <div key={n.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/5">
                                  {n.image && <img src={n.image} alt={n.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      {n.pinned && <span className="material-symbols-outlined text-[10px] text-cm-primary">push_pin</span>}
                                      <span className="text-[10px] font-bold text-cm-on-surface truncate">{n.title}</span>
                                    </div>
                                    <p className="text-[8px] text-cm-on-surface-variant mt-0.5 line-clamp-1">{n.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Bottom nav hint */}
                    <div className="flex items-center justify-around py-2 border-t border-white/10 bg-cm-surface-container/50">
                      {['home', 'search', 'calendar_month', 'person'].map((icon, i) => (
                        <span key={i} className={`material-symbols-outlined text-[20px] ${i === 0 ? 'text-cm-primary' : 'text-cm-on-surface-variant/30'}`}>{icon}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ═══════════════════════════════════════════════════
   COURTS MANAGEMENT TAB
   ═══════════════════════════════════════════════════ */

function CourtsTab({ allCourts, onRefresh }: { allCourts: Array<{ id: string; name: string; sport?: string; pricePerHour?: number; pricingSchedule?: PricingScheduleItem[] }>; onRefresh: () => void }) {
  const [migrating, setMigrating] = useState(false)
  const [editingCourt, setEditingCourt] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editSchedule, setEditSchedule] = useState<PricingScheduleItem[]>([])
  const [saving, setSaving] = useState(false)
  const [showSchedule, setShowSchedule] = useState<string | null>(null)

  const blockPresets = [
    { label: 'Mañana', startHour: 7, endHour: 13, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    { label: 'Tarde', startHour: 13, endHour: 18, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
    { label: 'Noche', startHour: 18, endHour: 23, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
  ]

  const handleMigrate = async () => {
    setMigrating(true)
    try {
      const res = await fetch('/api/migrate/courts', { method: 'PUT', headers: getAuthHeaders() })
      if (res.ok) {
        toast({ title: 'Migración exitosa', description: 'Canchas actualizadas correctamente en Firestore.' })
        onRefresh()
      } else {
        const err = await res.json().catch(() => ({ error: 'Error' }))
        toast({ title: 'Error en migración', description: err.error || 'No se pudo migrar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setMigrating(false)
    }
  }


  // Check for overlapping blocks
  const getOverlapWarnings = (schedule: PricingScheduleItem[]): string[] => {
    const warnings: string[] = []
    const sorted = [...schedule]
      .filter(s => s.startHour < s.endHour)
      .sort((a, b) => a.startHour - b.startHour)
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].endHour > sorted[i + 1].startHour) {
        warnings.push(
          `"${sorted[i].label}" (${fmtHour(sorted[i].startHour)}–${fmtHour(sorted[i].endHour)}) se solapa con "${sorted[i + 1].label}" (${fmtHour(sorted[i + 1].startHour)}–${fmtHour(sorted[i + 1].endHour)})`
        )
      }
    }
    return warnings
  }

  const getZeroPriceWarnings = (schedule: PricingScheduleItem[]): string[] => {
    return schedule
      .filter(s => s.startHour < s.endHour && s.pricePerHour <= 0)
      .map(s => `"${s.label}" (${fmtHour(s.startHour)}–${fmtHour(s.endHour)}) tiene precio S/ 0 — no generará cobro`)
  }

  const handleSaveCourt = async () => {
    if (!editingCourt || !editName) return

    const overlaps = getOverlapWarnings(editSchedule)
    if (overlaps.length > 0) {
      toast({ title: 'Bloques solapados', description: overlaps[0], variant: 'destructive' })
      return
    }

    const validSchedule = editSchedule
      .filter(s => s.startHour < s.endHour)
      .sort((a, b) => a.startHour - b.startHour)

    const zeroWarnings = getZeroPriceWarnings(validSchedule)

    setSaving(true)
    try {
      const res = await fetch('/api/admin/courts', {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCourt,
          name: editName,
          price_per_hour: parseFloat(editPrice) || undefined,
          pricing_schedule: validSchedule,
        }),
      })
      if (res.ok) {
        const blockCount = validSchedule.filter(s => s.pricePerHour > 0).length
        const msg = blockCount > 0
          ? `"${editName}" guardada con ${blockCount} bloque${blockCount > 1 ? 's' : ''} de tarifa activos.`
          : `"${editName}" guardada. Todos los bloques tienen precio S/ 0 — se usará el precio base.`
        toast({
          title: 'Cancha actualizada',
          description: msg,
          ...(zeroWarnings.length > 0 && { variant: 'destructive' }),
        })
        setEditingCourt(null)
        onRefresh()
      } else {
        const err = await res.json().catch(() => ({ error: 'Error' }))
        toast({ title: 'Error', description: err.error || 'No se pudo actualizar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (court: { id: string; name: string; pricePerHour?: number; pricingSchedule?: PricingScheduleItem[] }) => {
    setEditingCourt(court.id)
    setEditName(court.name)
    setEditPrice(String(court.pricePerHour || 0))
    setEditSchedule(
      Array.isArray(court.pricingSchedule) && court.pricingSchedule.length > 0
        ? court.pricingSchedule.map(s => ({ ...s }))
        : blockPresets.map(p => ({ label: p.label, startHour: p.startHour, endHour: p.endHour, pricePerHour: 0 }))
    )
  }

  const updateScheduleItem = (idx: number, field: keyof PricingScheduleItem, value: string | number) => {
    setEditSchedule(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  const addScheduleBlock = () => {
    setEditSchedule(prev => [...prev, { label: 'Bloque', startHour: 0, endHour: 1, pricePerHour: 0 }])
  }

  const removeScheduleBlock = (idx: number) => {
    setEditSchedule(prev => prev.filter((_, i) => i !== idx))
  }

  const sportLabels: Record<string, string> = { futbol: 'Fútbol 7', voley: 'Vóley' }
  const sportColors: Record<string, string> = { futbol: 'bg-green-500/15 text-green-400 border-green-500/30', voley: 'bg-amber-500/15 text-amber-400 border-amber-500/30' }

  const getBlockStyle = (label: string) => {
    const l = label.toLowerCase()
    if (l.includes('mañana') || l.includes('manana') || l.includes('dia')) return { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-400' }
    if (l.includes('tarde')) return { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-400' }
    if (l.includes('noche')) return { color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', dot: 'bg-indigo-400' }
    return { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-400' }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold text-cm-on-surface">Gestión de Canchas</h2>
          <p className="text-cm-on-surface-variant text-xs mt-1 font-[family-name:var(--font-inter)]">
            {allCourts.length} canchas registradas · Configura tarifas por bloques horarios
          </p>
        </div>
        <button type="button"
          onClick={handleMigrate}
          disabled={migrating}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#00ff41]/10 text-[#00ff41] text-sm font-semibold rounded-xl border border-[#00ff41]/30 hover:bg-[#00ff41]/20 transition-all disabled:opacity-50 font-[family-name:var(--font-sora)]"
        >
          <span className="material-symbols-outlined text-[18px]">{migrating ? 'progress_activity' : 'sync'}</span>
          {migrating ? 'Migrando...' : 'Sincronizar'}
        </button>
      </div>

      {/* Courts List */}
      <div className="space-y-4">
        {allCourts.map((court) => {
          const schedule = court.pricingSchedule || []
          const courtEditing = editingCourt === court.id

          return (
            <div key={court.id} className="glass-card rounded-xl overflow-hidden">
              {courtEditing ? (
                /* ─── EDIT MODE ─── */
                <div className="p-5 space-y-5">
                  {/* Name + Base Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Nombre de la cancha</label>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-[#00ff41]/40 font-[family-name:var(--font-inter)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Precio base / respaldo (S/ hora)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-[#00ff41]/40 font-[family-name:var(--font-inter)]"
                      />
                    </div>
                  </div>

                  {/* Pricing Schedule */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-cm-on-surface font-[family-name:var(--font-sora)] flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-[#00ff41]">schedule</span>
                          Tarifas por Bloques Horarios
                        </h4>
                        <p className="text-[10px] text-cm-on-surface-variant mt-0.5 font-[family-name:var(--font-inter)]">Define precios diferentes según el turno. Las reservas calcularán automáticamente.</p>
                      </div>
                      <button type="button"
                        onClick={addScheduleBlock}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold text-[#00ff41] bg-[#00ff41]/10 border border-[#00ff41]/30 rounded-lg hover:bg-[#00ff41]/20 transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">add</span>
                        Bloque
                      </button>
                    </div>

                    {editSchedule.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-white/10 rounded-xl">
                        <span className="material-symbols-outlined text-cm-on-surface-variant/30 text-[32px]">schedule</span>
                        <p className="text-xs text-cm-on-surface-variant mt-2">Sin bloques de tarifa. Se usará el precio base.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {editSchedule.map((slot, idx) => {
                          const style = getBlockStyle(slot.label)
                          return (
                            <div key={idx} className={`flex flex-wrap items-center gap-2 p-3 rounded-xl border ${style.bg} ${style.border}`}>
                              {/* Label */}
                              <input
                                value={slot.label}
                                onChange={(e) => updateScheduleItem(idx, 'label', e.target.value)}
                                className="w-24 px-2 py-1.5 bg-black/20 border border-white/10 rounded-lg text-xs font-semibold text-cm-on-surface focus:outline-none focus:border-white/30 font-[family-name:var(--font-sora)]"
                                placeholder="Turno"
                              />
                              {/* Time Range */}
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={23}
                                  value={slot.startHour}
                                  onChange={(e) => updateScheduleItem(idx, 'startHour', parseInt(e.target.value) || 0)}
                                  className="w-14 px-2 py-1.5 bg-black/20 border border-white/10 rounded-lg text-xs text-cm-on-surface text-center focus:outline-none focus:border-white/30 font-mono"
                                />
                                <span className="text-cm-on-surface-variant text-xs font-mono">:</span>
                                <span className="text-cm-on-surface-variant text-[10px]">00</span>
                                <span className="text-cm-on-surface-variant text-xs mx-1">—</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={24}
                                  value={slot.endHour}
                                  onChange={(e) => updateScheduleItem(idx, 'endHour', parseInt(e.target.value) || 1)}
                                  className="w-14 px-2 py-1.5 bg-black/20 border border-white/10 rounded-lg text-xs text-cm-on-surface text-center focus:outline-none focus:border-white/30 font-mono"
                                />
                                <span className="text-cm-on-surface-variant text-xs font-mono">:00</span>
                              </div>
                              {/* Price */}
                              <div className="flex items-center gap-1 ml-auto">
                                <span className="text-cm-on-surface-variant text-xs">S/</span>
                                <input
                                  type="number"
                                  min={0}
                                  step="1"
                                  value={slot.pricePerHour}
                                  onChange={(e) => updateScheduleItem(idx, 'pricePerHour', parseFloat(e.target.value) || 0)}
                                  className={`w-20 px-2 py-1.5 border rounded-lg text-xs text-center focus:outline-none font-mono font-semibold transition-colors ${
                                    slot.pricePerHour <= 0
                                      ? 'bg-red-500/10 border-red-500/30 text-red-300 focus:border-red-500/50'
                                      : 'bg-black/20 border-white/10 text-cm-on-surface focus:border-white/30'
                                  }`}
                                />
                                <span className="text-cm-on-surface-variant text-[10px]">/hr</span>
                              </div>
                              {/* Remove */}
                              <button type="button"
                                onClick={() => removeScheduleBlock(idx)}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-cm-on-surface-variant hover:text-red-400 transition-all"
                              >
                                <span className="material-symbols-outlined text-[14px]">close</span>
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Real-time Validation Warnings */}
                    {editSchedule.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {getOverlapWarnings(editSchedule).map((w, i) => (
                          <div key={`ov-${i}`} className="flex items-start gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-lg">
                            <span className="material-symbols-outlined text-red-400 text-[14px] mt-0.5 shrink-0">warning</span>
                            <p className="text-[11px] text-red-300 font-[family-name:var(--font-inter)]">{w}</p>
                          </div>
                        ))}
                        {getZeroPriceWarnings(editSchedule).map((w, i) => (
                          <div key={`zp-${i}`} className="flex items-start gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/25 rounded-lg">
                            <span className="material-symbols-outlined text-amber-400 text-[14px] mt-0.5 shrink-0">info</span>
                            <p className="text-[11px] text-amber-300 font-[family-name:var(--font-inter)]">{w}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Visual Timeline Preview */}
                    {editSchedule.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-[10px] text-cm-on-surface-variant mb-2 font-semibold uppercase tracking-wider">Vista previa del horario</p>
                        <div className="flex rounded-lg overflow-hidden h-8 border border-white/10">
                          {(() => {
                            const sorted = [...editSchedule].sort((a, b) => a.startHour - b.startHour)
                            const totalHours = 24
                            const segments: Array<{ pct: number; label: string; color: string; price: number }> = []
                            let cursor = 0
                            for (const s of sorted) {
                              if (s.startHour > cursor) {
                                segments.push({ pct: ((s.startHour - cursor) / totalHours) * 100, label: '', color: 'bg-cm-surface-container-highest/30', price: 0 })
                              }
                              const width = Math.max(0, s.endHour - s.startHour)
                              const st = getBlockStyle(s.label)
                              const bgMap: Record<string, string> = { 'text-amber-400': 'bg-amber-500/30', 'text-orange-400': 'bg-orange-500/30', 'text-indigo-400': 'bg-indigo-500/30' }
                              segments.push({ pct: (width / totalHours) * 100, label: s.label, color: bgMap[st.color] || 'bg-blue-500/30', price: s.pricePerHour })
                              cursor = s.endHour
                            }
                            if (cursor < totalHours) {
                              segments.push({ pct: ((totalHours - cursor) / totalHours) * 100, label: '', color: 'bg-cm-surface-container-highest/30', price: 0 })
                            }
                            return segments.map((seg, i) => (
                              <div key={i} className={`${seg.color} flex items-center justify-center transition-all`} style={{ width: `${seg.pct}%` }}>
                                {seg.label && (
                                  <span className="text-[9px] font-bold text-cm-on-surface truncate px-1">
                                    {seg.label} S/{seg.price}
                                  </span>
                                )}
                              </div>
                            ))
                          })()}
                        </div>
                        <div className="flex justify-between mt-1 px-0.5">
                          <span className="text-[8px] text-cm-on-surface-variant/50 font-mono">00:00</span>
                          <span className="text-[8px] text-cm-on-surface-variant/50 font-mono">06:00</span>
                          <span className="text-[8px] text-cm-on-surface-variant/50 font-mono">12:00</span>
                          <span className="text-[8px] text-cm-on-surface-variant/50 font-mono">18:00</span>
                          <span className="text-[8px] text-cm-on-surface-variant/50 font-mono">24:00</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-end pt-1">
                    <button type="button"
                      onClick={() => setEditingCourt(null)}
                      className="px-4 py-2 text-xs text-cm-on-surface-variant hover:text-cm-on-surface border border-white/10 rounded-lg transition-all font-[family-name:var(--font-inter)]"
                    >
                      Cancelar
                    </button>
                    <button type="button"
                      onClick={handleSaveCourt}
                      disabled={saving}
                      className="px-5 py-2 bg-[#00ff41] text-[#003907] text-xs font-semibold rounded-lg hover:bg-[#00e639] disabled:opacity-50 flex items-center gap-1.5 transition-all font-[family-name:var(--font-sora)]"
                    >
                      {saving ? <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span> : <span className="material-symbols-outlined text-[14px]">check</span>}
                      Guardar Cambios
                    </button>
                  </div>
                </div>
              ) : (
                /* ─── VIEW MODE ─── */
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#00ff41]/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#00ff41] text-[20px]">
                          {sportIcons[court.sport || 'futbol'] || 'sports'}
                        </span>
                      </div>
                      <div>
                        <p className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-sm">{court.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sportColors[court.sport || ''] || 'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}>
                            {sportLabels[court.sport || 'futbol'] || court.sport}
                          </span>
                          <span className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                            Precio base: S/ {court.pricePerHour || 0}/hr
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Toggle schedule view */}
                      <button type="button"
                        onClick={() => setShowSchedule(showSchedule === court.id ? null : court.id)}
                        className={`p-2 rounded-lg transition-all ${showSchedule === court.id ? 'bg-[#00ff41]/10 text-[#00ff41]' : 'hover:bg-cm-surface-container-highest text-cm-on-surface-variant hover:text-cm-on-surface'}`}
                        title="Ver tarifas"
                      >
                        <span className="material-symbols-outlined text-[18px]">schedule</span>
                      </button>
                      <button type="button"
                        onClick={() => startEdit(court as { id: string; name: string; pricePerHour: number; pricingSchedule?: PricingScheduleItem[] })}
                        className="p-2 rounded-lg hover:bg-cm-surface-container-highest text-cm-on-surface-variant hover:text-cm-on-surface transition-colors"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                    </div>
                  </div>

                  {/* Pricing Schedule Preview */}
                  {showSchedule === court.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-3 pt-3 border-t border-white/5"
                    >
                      {schedule.length > 0 ? (
                        <div className="space-y-2">
                          {/* Coverage summary */}
                          {(() => {
                            const sorted = [...schedule].sort((a, b) => a.startHour - b.startHour)
                            const coveredHours = sorted.reduce((sum, s) => sum + Math.max(0, s.endHour - s.startHour), 0)
                            const activeBlocks = sorted.filter(s => s.pricePerHour > 0).length
                            return (
                              <div className="flex items-center gap-3 text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">schedule</span>
                                  {coveredHours}h cubiertas de 24h
                                </span>
                                <span className="w-px h-3 bg-white/10" />
                                <span>{activeBlocks}/{sorted.length} bloques con precio activo</span>
                              </div>
                            )
                          })()}
                          {/* Timeline Bar */}
                          <div className="flex rounded-lg overflow-hidden h-7 border border-white/10 mb-1">
                            {(() => {
                              const sorted = [...schedule].sort((a, b) => a.startHour - b.startHour)
                              const totalHours = 24
                              const segments: Array<{ pct: number; label: string; color: string; price: number }> = []
                              let cursor = 0
                              for (const s of sorted) {
                                if (s.startHour > cursor) {
                                  segments.push({ pct: ((s.startHour - cursor) / totalHours) * 100, label: '', color: 'bg-cm-surface-container-highest/20', price: 0 })
                                }
                                const width = Math.max(0, s.endHour - s.startHour)
                                const st = getBlockStyle(s.label)
                                const bgMap: Record<string, string> = { 'text-amber-400': 'bg-amber-500/25', 'text-orange-400': 'bg-orange-500/25', 'text-indigo-400': 'bg-indigo-500/25' }
                                segments.push({ pct: (width / totalHours) * 100, label: s.label, color: bgMap[st.color] || 'bg-blue-500/25', price: s.pricePerHour })
                                cursor = s.endHour
                              }
                              if (cursor < totalHours) {
                                segments.push({ pct: ((totalHours - cursor) / totalHours) * 100, label: '', color: 'bg-cm-surface-container-highest/20', price: 0 })
                              }
                              return segments.map((seg, i) => (
                                <div key={i} className={`${seg.color} flex items-center justify-center`} style={{ width: `${seg.pct}%` }}>
                                  {seg.label && (
                                    <span className="text-[8px] font-bold text-cm-on-surface truncate px-0.5">{seg.label} S/{seg.price}</span>
                                  )}
                                </div>
                              ))
                            })()}
                          </div>
                          <div className="flex justify-between px-0.5 mb-2">
                            {['00', '06', '12', '18', '24'].map(h => (
                              <span key={h} className="text-[7px] text-cm-on-surface-variant/40 font-mono">{h}:00</span>
                            ))}
                          </div>

                          {/* Detail Cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {schedule.sort((a, b) => a.startHour - b.startHour).map((slot, i) => {
                              const style = getBlockStyle(slot.label)
                              return (
                                <div key={i} className={`flex items-center gap-2.5 p-2.5 rounded-lg border ${style.bg} ${style.border}`}>
                                  <div className={`w-2 h-8 rounded-full ${style.dot}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{slot.label}</p>
                                    <p className="text-xs font-mono text-cm-on-surface font-semibold">{fmtHour(slot.startHour)} — {fmtHour(slot.endHour)}</p>
                                  </div>
                                  <span className={`text-sm font-bold font-[family-name:var(--font-sora)] ${slot.pricePerHour > 0 ? style.color : 'text-red-400/70'}`}>
                                  S/ {slot.pricePerHour}
                                  {slot.pricePerHour <= 0 && <span className="text-[9px] font-normal ml-1 text-red-400/50">sin tarifa</span>}
                                </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-xs text-cm-on-surface-variant">Sin tarifas por bloque configuradas. Se usa el precio base S/ {court.pricePerHour || 0}/hr.</p>
                          <button type="button"
                            onClick={() => startEdit(court as { id: string; name: string; pricePerHour: number; pricingSchedule?: PricingScheduleItem[] })}
                            className="mt-2 text-[10px] text-[#00ff41] font-semibold hover:underline"
                          >
                            Configurar tarifas
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Info */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[#00ff41] text-[20px] mt-0.5">info</span>
          <div className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] space-y-1">
            <p><span className="font-semibold text-cm-on-surface">Tarifas por bloques</span> — Define precios distintos para cada turno (mañana, tarde, noche). Al crear una reserva, el sistema calcula automáticamente el precio según el horario seleccionado.</p>
            <p><span className="font-semibold text-cm-on-surface">Precio base</span> — Se usa como respaldo cuando no hay bloques configurados o cuando un horario no está cubierto por ningún bloque.</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════
   LIVE CLOCK (Lima timezone)
   ═══════════════════════════════════════════════════ */
function LiveClock({ alarmsCount, settings }: { alarmsCount: number; settings: NotificationSettings }) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cm-surface-container-highest/60 border border-white/10">
          <span className="material-symbols-outlined text-cm-primary text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>schedule</span>
          <span className="text-sm font-bold text-cm-on-surface font-mono tracking-wider">{time}</span>
          <span className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Lima</span>
        </div>
        {settings.enabled && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cm-surface-container-highest/60">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
            </span>
            <span className="text-[10px] text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">
              Monitoreando cada 15s
            </span>
          </div>
        )}
      </div>
      {alarmsCount > 0 && (
        <button type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all animate-pulse"
        >
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>notification_important</span>
          <span className="text-xs font-bold font-[family-name:var(--font-inter)]">{alarmsCount} alarma{alarmsCount > 1 ? 's' : ''}</span>
        </button>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const { setView, user: loggedInUser } = useAppStore()
  const isSuperAdmin = loggedInUser?.role === 'super_admin'
  const [activeTab, setActiveTab] = useState<AdminTab>('reservas')

  /* data */
  const [stats, setStats] = useState<Stats | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [retainedAdvances, setRetainedAdvances] = useState<RetainedAdvance[]>([])
  const [allCourts, setAllCourts] = useState<Array<{ id: string; name: string; sport?: string; pricePerHour?: number }>>([])

  /* filters */
  const [statusFilter, setStatusFilter] = useState<string>('all')

  /* advanced filters */
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [courtFilter, setCourtFilter] = useState('all')
  const [sportFilter, setSportFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'table' | 'gallery' | 'compact'>('table')
  const [bookingsPage, setBookingsPage] = useState(1)
  const BOOKINGS_PER_PAGE = 30
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'price_desc' | 'price_asc' | 'name_asc'>('date_desc')
  const [showPastBookings, setShowPastBookings] = useState(false)

  /* cancel dialog (advance handling) */
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)
  const [cancelAdvanceAction, setCancelAdvanceAction] = useState<'retain' | 'refund'>('retain')
  const [cancelReason, setCancelReason] = useState('')
  const [cancellingBooking, setCancellingBooking] = useState(false)

  /* expense form */
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expForm, setExpForm] = useState({ description: '', amount: '', category: 'mantenimiento', date: todayStr(), notes: '' })
  const [submittingExpense, setSubmittingExpense] = useState(false)

  /* time display format */
  const [use12hFormat, setUse12hFormat] = useState(true)

  /* loading */
  const [loading, setLoading] = useState(true)

  /* schedule modal */
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleDate, setScheduleDate] = useState(todayStr())

  /* admin booking form */
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [submittingBooking, setSubmittingBooking] = useState(false)
  const [bookingForm, setBookingForm] = useState({
    courtId: '', courtIds: [] as string[], userId: '', date: todayStr(), startTime: '18:00', endTime: '19:00',
    totalPrice: '', advanceAmount: '', status: 'reserved', paymentMethod: 'EFECTIVO', notes: '',
  })
  // Track whether user manually edited totalPrice (to avoid overwriting their input)
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(false)
  const [bookingUsers, setBookingUsers] = useState<Array<{ id: string; name: string; email: string; phone?: string | null }>>([])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [startTimeDrop, setStartTimeDrop] = useState(false)
  const [endTimeDrop, setEndTimeDrop] = useState(false)

  /* quick client creation from booking modal */
  const [showNewClientDialog, setShowNewClientDialog] = useState(false)
  const [newClientForm, setNewClientForm] = useState({ name: '', email: '', phone: '' })
  const [newClientErrors, setNewClientErrors] = useState<Record<string, string>>({})
  const [creatingClient, setCreatingClient] = useState(false)

  /* recurring booking */
  const [showRecurring, setShowRecurring] = useState(false)
  const [recurringConfig, setRecurringConfig] = useState({
    frequency: 'weekly' as 'daily' | 'weekly' | 'biweekly' | 'custom',
    daysOfWeek: [] as number[],
    endDate: '',
    count: 12,
    endCondition: 'count' as 'date' | 'count',
  })
  const [recurringPreview, setRecurringPreview] = useState<Array<{
    date: string; dayName: string; available: boolean; conflict?: { bookingId: string; startTime: string; endTime: string; userName: string }; price: number
  }> | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [creatingRecurring, setCreatingRecurring] = useState(false)
  const [recurringStep, setRecurringStep] = useState<'config' | 'preview'>('config')
  const [recurringPreviewSummary, setRecurringPreviewSummary] = useState<{ totalCount: number; availableCount: number; conflictCount: number; totalRevenue: number } | null>(null)

  /* recurring series management */
  const [showSeriesModal, setShowSeriesModal] = useState(false)
  const [seriesBookings, setSeriesBookings] = useState<Booking[]>([])
  const [seriesGroupId, setSeriesGroupId] = useState('')
  const [cancellingSeries, setCancellingSeries] = useState(false)

  /* equipment */
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [selectedEquipItems, setSelectedEquipItems] = useState<Array<{ equipmentId: string; name: string; quantity: number; unitPrice: number; subtotal: number }>>([])
  const [showEquipPanel, setShowEquipPanel] = useState(false)
  const [showEquipDetail, setShowEquipDetail] = useState<Booking | null>(null)

  /* advance payment modal */
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const [advanceTarget, setAdvanceTarget] = useState<Booking | null>(null)
  const [advanceAmount, setAdvanceAmount] = useState('')
  const [advanceMethod, setAdvanceMethod] = useState('EFECTIVO')
  const [submittingAdvance, setSubmittingAdvance] = useState(false)

  /* extend time modal */
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [extendTarget, setExtendTarget] = useState<Booking | null>(null)
  const [extendNewEnd, setExtendNewEnd] = useState('')
  const [extendExtraCost, setExtendExtraCost] = useState(0)
  const [extendMethod, setExtendMethod] = useState('EFECTIVO')
  const [extendPaidNow, setExtendPaidNow] = useState('')
  const [submittingExtend, setSubmittingExtend] = useState(false)

  /* edit booking modal (super_admin only) */
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Booking | null>(null)
  const [editForm, setEditForm] = useState({
    courtId: '', courtIds: [] as string[], userId: '', date: '', startTime: '', endTime: '',
    totalPrice: '', advanceAmount: '', paymentMethod: 'EFECTIVO', notes: '', status: 'reserved' as string,
  })
  const [editEquipItems, setEditEquipItems] = useState<Array<{ equipmentId: string; name: string; quantity: number; unitPrice: number; subtotal: number }>>([])
  const [editPriceManual, setEditPriceManual] = useState(false)
  const [editClientSearch, setEditClientSearch] = useState('')
  const [editEquipOpen, setEditEquipOpen] = useState(false)
  const [submittingEdit, setSubmittingEdit] = useState(false)

  /* notification alarm system */
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS)
  const { alerts: bookingAlerts, dismissAlert: dismissBookingAlert, clearAllAlerts, getAlertLevel } = useBookingAlarm(bookings, notifSettings)

  // Fetch notification settings on mount
  useEffect(() => {
    (async () => {
      try {
        const headers = getAuthHeaders()
        const res = await fetch('/api/notifications/settings', { headers })
        if (res.ok) {
          const data = await res.json()
          setNotifSettings({ ...DEFAULT_SETTINGS, ...data })
        }
      } catch { /* silent */ }
    })()
  }, [])

  /* ─── fetch all data (courts & users cached in IndexedDB for speed) ─── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const headers = getAuthHeaders()

      // Courts: cache-first (rarely change) — instant on repeat visits
      const courtsPromise = cachedFetch('courts', async () => {
        const res = await fetch('/api/courts', { headers })
        if (!res.ok) throw new Error('err')
        const d = await res.json()
        return Array.isArray(d) ? d : []
      })

      // Users for booking form: cache-first
      const usersPromise = cachedFetch('users', async () => {
        const res = await fetch('/api/admin/users', { headers })
        if (!res.ok) throw new Error('err')
        const d = await res.json()
        return Array.isArray(d) ? d : []
      })

      const [statsRes, bookingsRes, expensesRes, courtsData, usersData] = await Promise.all([
        fetch('/api/stats', { headers }).catch(() => new Response(null, { status: 0 })),
        // B13 FIX: Fetch wider date range (365 days) for accurate Finanzas
        // Only fetch recent bookings: 365 days back to 60 days forward
        (() => {
          const today = todayStr()
          const from = new Date(Date.now() - 365 * 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
          const to = new Date(Date.now() + 60 * 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
          return fetch(`/api/bookings?dateFrom=${from}&dateTo=${to}`, { headers })
        })().catch(() => new Response(null, { status: 0 })),
        fetch('/api/expenses', { headers }).catch(() => new Response(null, { status: 0 })),
        courtsPromise,
        usersPromise,
      ])

      if (statsRes.ok) setStats(await statsRes.json())
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json()
        const arr = Array.isArray(bookingsData) ? bookingsData : []
        console.log(`[AdminDashboard] ${arr.length} bookings loaded from API`)
        if (arr.length > 0) {
          console.log(`[AdminDashboard] Date range in data: ${arr[0]?.date} → ${arr[arr.length - 1]?.date}`)
          console.log(`[AdminDashboard] Sample booking:`, { id: arr[0].id, date: arr[0].date, dateType: typeof arr[0].date, status: arr[0].status })
        } else {
          console.warn('[AdminDashboard] API returned 0 bookings — check Firestore data')
        }
        setBookings(arr)
      } else if (bookingsRes.status === 0) {
        console.error('[AdminDashboard] Bookings fetch failed (network error)')
        toast({ title: 'Error de conexion', description: 'No se pudieron cargar las reservas. Verifica tu conexion a internet.', variant: 'destructive' })
      } else if (bookingsRes.status >= 400) {
        console.error('[AdminDashboard] Bookings API error:', bookingsRes.status)
        try {
          const errData = await bookingsRes.json()
          toast({ title: 'Error al cargar reservas', description: errData.error || `Error ${bookingsRes.status}`, variant: 'destructive' })
        } catch {
          toast({ title: 'Error al cargar reservas', description: `Error del servidor (${bookingsRes.status})`, variant: 'destructive' })
        }
      }
      if (expensesRes.ok) {
        const expensesData = await expensesRes.json()
        setExpenses(Array.isArray(expensesData) ? expensesData : [])
      }
      // Fetch retained advances
      try {
        const raRes = await fetch('/api/retained-advances', { headers })
        if (raRes.ok) {
          const raData = await raRes.json()
          setRetainedAdvances(Array.isArray(raData.advances) ? raData.advances : [])
        }
      } catch (err) { console.error('[AdminDashboard] Error loading retained advances:', err) }
      setAllCourts(courtsData)
      setBookingUsers(usersData)

      // Equipment still needs separate fetch (no cache)
      try {
        const equipRes = await fetch('/api/equipment', { headers })
        if (equipRes.ok) {
          const equipData = await equipRes.json()
          setEquipmentList(Array.isArray(equipData) ? equipData : [])
        }
      } catch { /* silent */ }
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los datos. Verifica la conexion a la base de datos.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  /* Derive booking court list from allCourts — deduplicated by id */
  const bookingCourtDetails = useMemo(() => {
    const seen = new Set<string>()
    return allCourts.reduce<Array<{ id: string; name: string; sport: string; pricePerHour: number; pricingSchedule: PricingScheduleItem[] }>>((acc, c) => {
      if (seen.has(c.id)) return acc
      seen.add(c.id)
      acc.push({
        id: c.id,
        name: c.name,
        sport: c.sport || '',
        pricePerHour: c.pricePerHour || 0,
        pricingSchedule: Array.isArray((c as Record<string, unknown>).pricingSchedule) ? (c as Record<string, unknown>).pricingSchedule as PricingScheduleItem[] : [],
      })
      return acc
    }, [])
  }, [allCourts])

  /* Occupied slots for the booking form's selected date + courts */
  const formOccupiedSlots = useMemo(() => {
    const date = bookingForm.date
    const cIds = bookingForm.courtIds.length > 0 ? bookingForm.courtIds : (bookingForm.courtId ? [bookingForm.courtId] : [])
    if (!date || cIds.length === 0) return []
    return bookings
      .filter(b => {
        if (b.status === 'cancelled') return false
        if (b.date !== date) return false
        const bCIds = b.courtIds && b.courtIds.length > 0 ? b.courtIds : [b.courtId]
        return bCIds.some(id => cIds.includes(id))
      })
      .map(b => ({ startTime: b.startTime, endTime: b.endTime, label: b.user?.name }))
  }, [bookings, bookingForm.date, bookingForm.courtIds, bookingForm.courtId])

  /* Occupied slots for the edit form */
  const editOccupiedSlots = useMemo(() => {
    const date = editForm.date
    const cIds = editForm.courtIds.length > 0 ? editForm.courtIds : (editForm.courtId ? [editForm.courtId] : [])
    if (!date || cIds.length === 0 || !editTarget) return []
    return bookings
      .filter(b => {
        if (b.id === editTarget.id) return false
        if (b.status === 'cancelled') return false
        if (b.date !== date) return false
        const bCIds = b.courtIds && b.courtIds.length > 0 ? b.courtIds : [b.courtId]
        return bCIds.some(id => cIds.includes(id))
      })
      .map(b => ({ startTime: b.startTime, endTime: b.endTime, label: b.user?.name }))
  }, [bookings, editForm.date, editForm.courtIds, editForm.courtId, editTarget])

  /* fetch users for booking form (courts come from allCourts, deduplicated) */
  const loadBookingFormData = useCallback(async () => {
    try {
      const headers = getAuthHeaders()
      const usersRes = await fetch('/api/admin/users', { headers })
      if (usersRes.ok) {
        const data = await usersRes.json()
        const users = Array.isArray(data) ? data : []
        setBookingUsers(users)
      } else {
        toast({ title: 'Error cargando clientes', description: 'No se pudieron obtener los usuarios', variant: 'destructive' })
      }
    } catch (err) {
      console.error('[loadBookingFormData] Exception:', err)
    }
  }, [])

  /* ─── booking form helpers (declared BEFORE any useCallback that references them,
       to avoid Turbopack minification reordering bug) ─── */
  const calculateHours = (start: string, end: string): number => {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const diff = (eh * 60 + em) - (sh * 60 + sm)
    return Math.max(diff / 60, 0.5)
  }

  const calculatePriceForTimeSlot = (schedule: PricingScheduleItem[], startTime: string, endTime: string): { total: number; breakdown: Array<{ label: string; hours: number; pricePerHour: number; subtotal: number }> } => {
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)
    const startDecimal = startH + startM / 60
    const endDecimal = endH + endM / 60

    if (schedule.length === 0) return { total: 0, breakdown: [] }

    const sorted = [...schedule].sort((a, b) => a.startHour - b.startHour)
    let total = 0
    let cursor = startDecimal
    const breakdown: Array<{ label: string; hours: number; pricePerHour: number; subtotal: number }> = []

    for (const slot of sorted) {
      if (cursor >= slot.endHour) continue
      const overlapStart = Math.max(cursor, slot.startHour)
      const overlapEnd = Math.min(endDecimal, slot.endHour)
      if (overlapEnd > overlapStart) {
        const hours = overlapEnd - overlapStart
        const subtotal = Math.round(hours * slot.pricePerHour * 100) / 100
        breakdown.push({ label: slot.label, hours: Math.round(hours * 100) / 100, pricePerHour: slot.pricePerHour, subtotal })
        total += subtotal
        cursor = overlapEnd
      }
    }
    return { total: Math.round(total * 100) / 100, breakdown }
  }

  /** Calculate total price for ALL selected courts combined */
  const calculateMultiCourtPrice = (courtIds: string[], startTime: string, endTime: string): number => {
    let total = 0
    for (const cId of courtIds) {
      const court = bookingCourtDetails.find((c) => c.id === cId)
      if (!court) continue
      if (court.pricingSchedule && court.pricingSchedule.length > 0) {
        const { total: slotTotal } = calculatePriceForTimeSlot(court.pricingSchedule, startTime, endTime)
        total += slotTotal > 0 ? slotTotal : court.pricePerHour * calculateHours(startTime, endTime)
      } else {
        total += court.pricePerHour * calculateHours(startTime, endTime)
      }
    }
    return Math.round(total * 100) / 100
  }

  const handleBookingFormChange = (field: string, value: string) => {
    // If user edits totalPrice manually, mark it so we don't overwrite
    if (field === 'totalPrice') {
      setPriceManuallyEdited(true)
    }
    setBookingForm((prev) => {
      const updated = { ...prev, [field]: value }
      // Auto-calculate court price when courts or times change (only if user hasn't manually edited)
      if (!priceManuallyEdited && (field === 'courtId' || field === 'startTime' || field === 'endTime' || field === 'courtIds')) {
        const ids = updated.courtIds.length > 0 ? updated.courtIds : (updated.courtId ? [updated.courtId] : [])
        if (ids.length > 0 && updated.startTime && updated.endTime) {
          const courtPrice = calculateMultiCourtPrice(ids, updated.startTime, updated.endTime)
          const eqTotal = selectedEquipItems.reduce((s, i) => s + i.subtotal, 0)
          const grandTotal = Math.round((courtPrice + eqTotal) * 100) / 100
          updated.totalPrice = String(grandTotal)
          if (!updated.advanceAmount || parseFloat(updated.advanceAmount) <= 0) {
            updated.advanceAmount = String(Math.round(grandTotal * 0.5 * 100) / 100)
          }
        }
      }
      return updated
    })
    if (formErrors[field]) setFormErrors((prev) => { const next = { ...prev }; delete next[field]; return next })
  }

  /* ─── quick client creation from booking modal ─── */
  const openNewClientDialog = useCallback((prefillName?: string) => {
    console.log('[quickCreateClient] Opening dialog, prefill:', prefillName)
    setNewClientForm({ name: prefillName?.trim() || '', email: '', phone: '' })
    setNewClientErrors({})
    setShowNewClientDialog(true)
    setClientDropdownOpen(false) // close the popover
  }, [])

  const handleQuickCreateClient = useCallback(async () => {
    const errors: Record<string, string> = {}
    if (!newClientForm.name.trim() || newClientForm.name.trim().length < 2) {
      errors.name = 'Nombre requerido (min. 2 caracteres)'
    }
    if (!newClientForm.phone.trim() || newClientForm.phone.trim().length < 6) {
      errors.phone = 'Telefono requerido (min. 6 digitos)'
    }
    if (newClientForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newClientForm.email.trim())) {
      errors.email = 'Formato de correo invalido'
    }
    if (Object.keys(errors).length > 0) {
      setNewClientErrors(errors)
      return
    }

    setCreatingClient(true)
    try {
      const headers = getAuthHeaders()
      console.log('[quickCreateClient] Creating client:', newClientForm.name, newClientForm.phone)
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newClientForm.name.trim(),
          phone: newClientForm.phone.trim(),
          email: newClientForm.email.trim() || undefined,
        }),
      })

      const data = await res.json()
      console.log('[quickCreateClient] Response:', res.status, data)

      if (!res.ok) {
        setNewClientErrors({ general: data.error || 'Error al crear cliente' })
        return
      }

      // Auto-select the new (or existing) client in the booking form
      if (data.user) {
        handleBookingFormChange('userId', data.user.id)
        // Add to local list so it appears immediately
        setBookingUsers((prev) => {
          const exists = prev.some((u) => u.id === data.user.id)
          if (exists) return prev
          return [...prev, { id: data.user.id, name: data.user.name, email: data.user.email, phone: data.user.phone }]
        })
      }

      // Invalidate users cache so next load gets fresh data
      invalidateCache('users')

      setShowNewClientDialog(false)
      toast({
        title: data.alreadyExists ? 'Cliente encontrado' : 'Cliente creado',
        description: data.message || `"${data.user?.name}" esta listo para la reserva.`,
      })
    } catch (err) {
      console.error('[quickCreateClient] Exception:', err)
      setNewClientErrors({ general: 'Error de conexion. Intenta de nuevo.' })
    } finally {
      setCreatingClient(false)
    }
  }, [newClientForm, handleBookingFormChange])

  /* ─── computed ─── */
  const today = todayStr()
  const todayBookings = bookings.filter((b) => b.date === today && b.status !== 'cancelled')
  const todayCompleted = bookings.filter((b) => b.date === today && b.status === 'completed')
  const todayReserved = bookings.filter((b) => b.date === today && b.status === 'reserved')
  const todayRevenue = todayCompleted.reduce((s, b) => s + b.totalPrice, 0)
    + todayReserved.reduce((s, b) => s + b.advanceAmount, 0)
  const pendingPayments = bookings.filter((b) => b.status === 'reserved' && b.remainingAmount > 0)
  const pendingTotal = pendingPayments.reduce((s, b) => s + b.remainingAmount, 0)

  const uniqueCourts = [...new Map(bookings.filter(b => b.court).map(b => [b.court!.id, b.court!])).values()]
  const uniqueSports = [...new Set(bookings.filter(b => b.court?.sport).map(b => b.court!.sport))]

  /* ─── booking form validation ─── */
  const validateBookingForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (bookingForm.courtIds.length === 0) errors.courtId = 'Selecciona al menos una cancha'
    if (!bookingForm.userId) errors.userId = 'Selecciona un cliente'
    if (!bookingForm.date) errors.date = 'Selecciona una fecha'
    if (!bookingForm.startTime) errors.startTime = 'Hora de inicio requerida'
    if (!bookingForm.endTime) errors.endTime = 'Hora de fin requerida'
    if (bookingForm.startTime >= bookingForm.endTime) errors.endTime = 'La hora de fin debe ser posterior'
    if (!bookingForm.totalPrice || parseFloat(bookingForm.totalPrice) <= 0) errors.totalPrice = 'El precio debe ser mayor a 0'
    if (bookingForm.advanceAmount && parseFloat(bookingForm.advanceAmount) > parseFloat(bookingForm.totalPrice)) errors.advanceAmount = 'El adelanto no puede superar el total'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  /* ─── equipment selection helpers ─── */
  const addEquipmentToForm = (eq: Equipment) => {
    const existing = selectedEquipItems.find(i => i.equipmentId === eq.id)
    if (existing) {
      if (existing.quantity < eq.stock) {
        setSelectedEquipItems(selectedEquipItems.map(i =>
          i.equipmentId === eq.id ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unitPrice } : i
        ))
      }
    } else if (eq.stock > 0) {
      setSelectedEquipItems([...selectedEquipItems, { equipmentId: eq.id, name: eq.name, quantity: 1, unitPrice: eq.pricePerRental, subtotal: eq.pricePerRental }])
    }
  }

  const removeEquipmentFromForm = (eqId: string) => {
    setSelectedEquipItems(selectedEquipItems.filter(i => i.equipmentId !== eqId))
  }

  const updateEquipQty = (eqId: string, qty: number, stock: number) => {
    const clamped = Math.max(1, Math.min(qty, stock))
    setSelectedEquipItems(selectedEquipItems.map(i =>
      i.equipmentId === eqId ? { ...i, quantity: clamped, subtotal: clamped * i.unitPrice } : i
    ))
  }

  const equipmentFormTotal = selectedEquipItems.reduce((s, i) => s + i.subtotal, 0)

  // Effect: whenever equipment items change, recalculate totalPrice ONLY if user hasn't manually edited it
  useEffect(() => {
    if (priceManuallyEdited) return
    if (bookingForm.courtIds.length === 0 && !bookingForm.courtId) return
    if (!bookingForm.startTime || !bookingForm.endTime) return
    const ids = bookingForm.courtIds.length > 0 ? bookingForm.courtIds : [bookingForm.courtId]
    const courtPrice = calculateMultiCourtPrice(ids, bookingForm.startTime, bookingForm.endTime)
    const eqTotal = selectedEquipItems.reduce((s, i) => s + i.subtotal, 0)
    const grandTotal = Math.round((courtPrice + eqTotal) * 100) / 100
    if (grandTotal > 0) {
      setBookingForm(prev => {
        // Don't overwrite if user is currently typing
        if (priceManuallyEdited) return prev
        const newAdv = !prev.advanceAmount || parseFloat(prev.advanceAmount) <= 0
          ? String(Math.round(grandTotal * 0.5 * 100) / 100)
          : prev.advanceAmount
        return { ...prev, totalPrice: String(grandTotal), advanceAmount: newAdv }
      })
    }
  }, [selectedEquipItems]) // Only react to equipment changes, not to form changes (avoid loops)

  // Reset manual edit flag when courts or times change
  useEffect(() => {
    setPriceManuallyEdited(false)
  }, [bookingForm.courtIds, bookingForm.courtId, bookingForm.startTime, bookingForm.endTime])

  const handleCreateBooking = async () => {
    if (!validateBookingForm()) return
    setSubmittingBooking(true)
    try {
      const parsedTotal = parseFloat(bookingForm.totalPrice)
      const parsedAdvance = parseFloat(bookingForm.advanceAmount) || parsedTotal * 0.5
      const body = {
        courtIds: bookingForm.courtIds.length > 0 ? bookingForm.courtIds : [bookingForm.courtId],
        userId: bookingForm.userId,
        date: bookingForm.date,
        startTime: bookingForm.startTime,
        endTime: bookingForm.endTime,
        totalPrice: parsedTotal,
        advanceAmount: parsedAdvance,
        remainingAmount: parsedTotal - parsedAdvance,
        status: bookingForm.status,
        paymentMethod: bookingForm.paymentMethod,
        notes: bookingForm.notes || null,
        equipmentItems: selectedEquipItems.map(i => ({
          equipment_id: i.equipmentId,
          name: i.name,
          quantity: i.quantity,
          unit_price: i.unitPrice,
        })),
      }
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast({ title: 'Reserva creada', description: 'La reserva se ha registrado correctamente' })
        setShowBookingForm(false)
        setBookingForm({ courtId: '', courtIds: [] as string[], userId: '', date: todayStr(), startTime: '18:00', endTime: '19:00', totalPrice: '', advanceAmount: '', status: 'reserved', paymentMethod: 'EFECTIVO', notes: '' })
        setFormErrors({})
        setSelectedEquipItems([])
        setShowEquipPanel(false)
        setPriceManuallyEdited(false)
        fetchData()
      } else {
        const err = await res.json()
        toast({ title: 'Error al crear reserva', description: err.error || 'No se pudo crear la reserva', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear la reserva', variant: 'destructive' })
    } finally {
      setSubmittingBooking(false)
    }
  }

  const openBookingForm = () => {
    // Reset form to clean defaults
    setBookingForm({ courtId: '', courtIds: [] as string[], userId: '', date: todayStr(), startTime: '18:00', endTime: '19:00', totalPrice: '', advanceAmount: '', status: 'reserved', paymentMethod: 'EFECTIVO', notes: '' })
    setFormErrors({})
    setSelectedEquipItems([])
    setShowEquipPanel(false)
    setPriceManuallyEdited(false)
    loadBookingFormData()
    setShowBookingForm(true)
    setClientDropdownOpen(false)
    setClientSearch('')
    setStartTimeDrop(false)
    setEndTimeDrop(false)
    // Reset recurring state
    setShowRecurring(false)
    setRecurringStep('config')
    setRecurringPreview(null)
    setRecurringPreviewSummary(null)
  }

  /* ─── recurring booking handlers ─── */
  const handlePreviewRecurring = async () => {
    if (bookingForm.courtIds.length === 0 || !bookingForm.userId || !bookingForm.startTime || !bookingForm.endTime || !bookingForm.date) {
      toast({ title: 'Error', description: 'Completa la cancha, cliente, fecha y horario primero.', variant: 'destructive' })
      return
    }
    if (recurringConfig.frequency === 'custom' && recurringConfig.daysOfWeek.length === 0) {
      toast({ title: 'Error', description: 'Selecciona al menos un día de la semana.', variant: 'destructive' })
      return
    }
    if (recurringConfig.endCondition === 'date' && !recurringConfig.endDate) {
      toast({ title: 'Error', description: 'Ingresa una fecha final.', variant: 'destructive' })
      return
    }

    setPreviewLoading(true)
    try {
      const body: Record<string, unknown> = {
        courtIds: bookingForm.courtIds.length > 0 ? bookingForm.courtIds : [bookingForm.courtId],
        userId: bookingForm.userId,
        startTime: bookingForm.startTime,
        endTime: bookingForm.endTime,
        startDate: bookingForm.date,
        frequency: recurringConfig.frequency,
        totalPrice: parseFloat(bookingForm.totalPrice) || 0,
        advanceAmount: parseFloat(bookingForm.advanceAmount) || 0,
        status: bookingForm.status,
        paymentMethod: bookingForm.paymentMethod,
        notes: bookingForm.notes || null,
        equipmentItems: selectedEquipItems.length > 0 ? selectedEquipItems.map(i => ({
          equipment_id: i.equipmentId,
          name: i.name,
          quantity: i.quantity,
          unit_price: i.unitPrice,
        })) : undefined,
        dryRun: true,
      }
      if (recurringConfig.frequency === 'custom') {
        body.daysOfWeek = recurringConfig.daysOfWeek
      }
      if (recurringConfig.endCondition === 'date') {
        body.endDate = recurringConfig.endDate
      } else {
        body.count = recurringConfig.count
      }

      const res = await fetch('/api/bookings/recurring', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        setRecurringPreview(data.dates)
        setRecurringPreviewSummary({
          totalCount: data.totalCount,
          availableCount: data.availableCount,
          conflictCount: data.conflictCount,
          totalRevenue: data.totalRevenue,
        })
        setRecurringStep('preview')
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'No se pudo generar la vista previa.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo generar la vista previa.', variant: 'destructive' })
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleCreateRecurring = async () => {
    setCreatingRecurring(true)
    try {
      const body: Record<string, unknown> = {
        courtIds: bookingForm.courtIds.length > 0 ? bookingForm.courtIds : [bookingForm.courtId],
        userId: bookingForm.userId,
        startTime: bookingForm.startTime,
        endTime: bookingForm.endTime,
        startDate: bookingForm.date,
        frequency: recurringConfig.frequency,
        totalPrice: parseFloat(bookingForm.totalPrice) || 0,
        advanceAmount: parseFloat(bookingForm.advanceAmount) || 0,
        status: bookingForm.status,
        paymentMethod: bookingForm.paymentMethod,
        notes: bookingForm.notes || null,
        equipmentItems: selectedEquipItems.length > 0 ? selectedEquipItems.map(i => ({
          equipment_id: i.equipmentId,
          name: i.name,
          quantity: i.quantity,
          unit_price: i.unitPrice,
        })) : undefined,
        dryRun: false,
      }
      if (recurringConfig.frequency === 'custom') {
        body.daysOfWeek = recurringConfig.daysOfWeek
      }
      if (recurringConfig.endCondition === 'date') {
        body.endDate = recurringConfig.endDate
      } else {
        body.count = recurringConfig.count
      }

      const res = await fetch('/api/bookings/recurring', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        const created = data.bookings?.length || 0
        toast({
          title: 'Reservas recurrentes creadas',
          description: `${created} reservas recurrentes creadas exitosamente${data.conflictCount > 0 ? ` (${data.conflictCount} conflictos omitidos)` : ''}`,
        })
        setShowBookingForm(false)
        setBookingForm({ courtId: '', courtIds: [] as string[], userId: '', date: todayStr(), startTime: '18:00', endTime: '19:00', totalPrice: '', advanceAmount: '', status: 'reserved', paymentMethod: 'EFECTIVO', notes: '' })
        setFormErrors({})
        setSelectedEquipItems([])
        setShowEquipPanel(false)
        setShowRecurring(false)
        setRecurringStep('config')
        setRecurringPreview(null)
        setRecurringPreviewSummary(null)
        fetchData()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'No se pudieron crear las reservas recurrentes.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudieron crear las reservas recurrentes.', variant: 'destructive' })
    } finally {
      setCreatingRecurring(false)
    }
  }

  /* ─── series management ─── */
  const openSeriesModal = async (groupId: string) => {
    setSeriesGroupId(groupId)
    setShowSeriesModal(true)
    // Load all bookings in this series from the bookings list
    const series = bookings.filter((b) => b.recurringGroupId === groupId)
    setSeriesBookings(series)
  }

  const handleCancelSeries = async (groupId: string) => {
    if (!confirm('¿Cancelar toda la serie recurrente? Esta acción no se puede deshacer.')) return
    setCancellingSeries(true)
    try {
      const res = await fetch('/api/bookings/recurring', {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_series', recurringGroupId: groupId }),
      })
      if (res.ok) {
        toast({ title: 'Serie cancelada', description: 'Todas las reservas de la serie fueron canceladas.' })
        setShowSeriesModal(false)
        fetchData()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'No se pudo cancelar la serie.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo cancelar la serie.', variant: 'destructive' })
    } finally {
      setCancellingSeries(false)
    }
  }

  const handleCancelSingleFromSeries = async (bookingId: string) => {
    if (!confirm('¿Cancelar esta reserva de la serie?')) return
    try {
      const res = await fetch('/api/bookings/recurring', {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_single', recurringGroupId: seriesGroupId, bookingId }),
      })
      if (res.ok) {
        toast({ title: 'Reserva cancelada', description: 'La reserva fue cancelada exitosamente.' })
        // Refresh series and main bookings
        fetchData()
        const updatedSeries = bookings.filter((b) => b.recurringGroupId === seriesGroupId)
        setSeriesBookings(updatedSeries)
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'No se pudo cancelar.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo cancelar la reserva.', variant: 'destructive' })
    }
  }

  /* advance payment handlers */
  const openAdvanceModal = (booking: Booking) => {
    setAdvanceTarget(booking)
    setAdvanceAmount(String(booking.remainingAmount > 0 ? booking.remainingAmount : booking.totalPrice))
    setAdvanceMethod('EFECTIVO')
    setShowAdvanceModal(true)
  }

  const handleSubmitAdvance = async () => {
    if (!advanceTarget || !advanceAmount || parseFloat(advanceAmount) <= 0) return
    setSubmittingAdvance(true)
    try {
      // Update booking status and adjust amounts
      const newAdvance = advanceTarget.advanceAmount + parseFloat(advanceAmount)
      const newRemaining = Math.max(0, advanceTarget.totalPrice - newAdvance)
      const newStatus = newRemaining <= 0 ? 'completed' : 'reserved'
      const isFullPayment = newRemaining <= 0

      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: advanceTarget.id,
          status: newStatus,
          advanceAmount: newAdvance,
          remainingAmount: newRemaining,
          paymentMethod: advanceMethod,
        }),
      })
      if (res.ok) {
        toast({
          title: isFullPayment ? 'Pago total registrado' : 'Adelanto registrado',
          description: isFullPayment
            ? `Se registró el pago total de ${fmtCurrency(parseFloat(advanceAmount))}. Saldo: S/ 0.00`
            : `Adelanto de ${fmtCurrency(parseFloat(advanceAmount))} registrado. Restante: ${fmtCurrency(newRemaining)}`,
        })
        setShowAdvanceModal(false)
        setAdvanceTarget(null)
        fetchData()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'No se pudo registrar el pago', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo registrar el pago', variant: 'destructive' })
    } finally {
      setSubmittingAdvance(false)
    }
  }

  /* ─── extend time handlers ─── */
  const extendTimeSlots = useMemo(() => {
    if (!extendTarget) return []
    const [eh, em] = extendTarget.endTime.split(':').map(Number)
    // Generate slots starting from 30min after current end, up to 3h extra
    const slots: string[] = []
    let cursorMin = (eh * 60 + em) + 30 // minimum +30min extension
    const maxMin = cursorMin + 180 // max 3 extra hours
    while (cursorMin <= Math.min(maxMin, 23 * 60 + 30)) {
      const h = Math.floor(cursorMin / 60)
      const m = cursorMin % 60
      if (h <= 23) slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      cursorMin += 30
    }
    return slots
  }, [extendTarget])

  const openExtendModal = (booking: Booking) => {
    if (booking.status === 'completed' || booking.status === 'cancelled') return
    setExtendTarget(booking)
    // Default to +30min
    const [eh, em] = booking.endTime.split(':').map(Number)
    const newMin = eh * 60 + em + 30
    const nh = Math.floor(newMin / 60)
    const nm = newMin % 60
    const defaultEnd = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
    setExtendNewEnd(defaultEnd)
    // Bug fix #4: Calculate extra cost for ALL courts, not just primary
    const courtIds = booking.courtIds && booking.courtIds.length > 0 ? booking.courtIds : [booking.courtId]
    let extraCost = 0
    for (const cId of courtIds) {
      const court = bookingCourtDetails.find(c => c.id === cId)
      if (court) {
        if (court.pricingSchedule && court.pricingSchedule.length > 0) {
          const { total: newTotal } = calculatePriceForTimeSlot(court.pricingSchedule, booking.startTime, defaultEnd)
          const { total: oldTotal } = calculatePriceForTimeSlot(court.pricingSchedule, booking.startTime, booking.endTime)
          extraCost += Math.round((newTotal - oldTotal) * 100) / 100
        } else {
          extraCost += Math.round(court.pricePerHour * 0.5 * 100) / 100 // default 30min
        }
      }
    }
    setExtendExtraCost(Math.max(0, extraCost))
    setExtendPaidNow(String(Math.max(0, extraCost)))
    setExtendMethod('EFECTIVO')
    setShowExtendModal(true)
  }

  const handleExtendEndChange = (newEnd: string) => {
    setExtendNewEnd(newEnd)
    if (!extendTarget) return
    // Bug fix #4: Calculate extra cost for ALL courts
    const courtIds = extendTarget.courtIds && extendTarget.courtIds.length > 0 ? extendTarget.courtIds : [extendTarget.courtId]
    let extraCost = 0
    for (const cId of courtIds) {
      const court = bookingCourtDetails.find(c => c.id === cId)
      if (court) {
        if (court.pricingSchedule && court.pricingSchedule.length > 0) {
          const { total: newTotal } = calculatePriceForTimeSlot(court.pricingSchedule, extendTarget.startTime, newEnd)
          const { total: oldTotal } = calculatePriceForTimeSlot(court.pricingSchedule, extendTarget.startTime, extendTarget.endTime)
          extraCost += Math.round((newTotal - oldTotal) * 100) / 100
        } else {
          const origH = calculateHours(extendTarget.startTime, extendTarget.endTime)
          const newH = calculateHours(extendTarget.startTime, newEnd)
          extraCost += Math.round(court.pricePerHour * (newH - origH) * 100) / 100
        }
      }
    }
    setExtendExtraCost(Math.max(0, extraCost))
    setExtendPaidNow(String(Math.max(0, extraCost)))
  }

  const handleSubmitExtend = async () => {
    if (!extendTarget || !extendNewEnd || extendNewEnd <= extendTarget.endTime || extendExtraCost <= 0) return
    setSubmittingExtend(true)
    try {
      const paidNow = Math.min(parseFloat(extendPaidNow) || 0, extendExtraCost)
      const newTotalPrice = Math.round((extendTarget.totalPrice + extendExtraCost) * 100) / 100
      const newAdvance = extendTarget.advanceAmount + paidNow
      const newRemaining = Math.round((newTotalPrice - newAdvance) * 100) / 100

      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: extendTarget.id,
          endTime: extendNewEnd,
          totalPrice: newTotalPrice,
          advanceAmount: newAdvance,
          remainingAmount: Math.max(0, newRemaining),
          paymentMethod: extendMethod,
          extendTime: true,
        }),
      })
      if (res.ok) {
        const hoursAdded = calculateHours(extendTarget.endTime, extendNewEnd)
        toast({
          title: 'Tiempo extendido',
          description: `Se agregó ${hoursAdded}h extra a la reserva. Costo adicional: ${fmtCurrency(extendExtraCost)}${paidNow > 0 ? ` (Pagado: ${fmtCurrency(paidNow)})` : ''}`,
        })
        setShowExtendModal(false)
        setExtendTarget(null)
        fetchData()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'No se pudo extender el tiempo', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo extender el tiempo', variant: 'destructive' })
    } finally {
      setSubmittingExtend(false)
    }
  }

  /* ─── edit booking handlers (super_admin only) ─── */
  const allTimeSlots = useMemo(() => {
    const slots: string[] = []
    for (let h = 6; h <= 23; h++) {
      for (const m of [0, 30]) {
        if (h === 23 && m > 0) continue
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      }
    }
    return slots
  }, [])

  const editEndSlots = useMemo(() => {
    if (!editForm.startTime) return allTimeSlots
    return allTimeSlots.filter(s => s > editForm.startTime)
  }, [editForm.startTime, allTimeSlots])

  const recalcEditCourtPrice = () => {
    if (editPriceManual) return
    const ids = editForm.courtIds.length > 0 ? editForm.courtIds : (editForm.courtId ? [editForm.courtId] : [])
    if (ids.length === 0 || !editForm.startTime || !editForm.endTime) return
    const courtPrice = calculateMultiCourtPrice(ids, editForm.startTime, editForm.endTime)
    const eqTotal = editEquipItems.reduce((s, i) => s + i.subtotal, 0)
    const grandTotal = Math.round((courtPrice + eqTotal) * 100) / 100
    if (grandTotal > 0) {
      setEditForm(prev => ({ ...prev, totalPrice: String(grandTotal) }))
    }
  }

  const handleEditFormChange = (field: string, value: string | string[]) => {
    if (field === 'totalPrice') setEditPriceManual(true)
    setEditForm(prev => {
      const updated = { ...prev, [field]: value }
      if (!editPriceManual && (field === 'courtId' || field === 'startTime' || field === 'endTime' || field === 'courtIds')) {
        const ids = Array.isArray(value) ? value : (updated.courtIds.length > 0 ? updated.courtIds : (updated.courtId ? [updated.courtId] : []))
        if (ids.length > 0 && updated.startTime && updated.endTime) {
          const courtPrice = calculateMultiCourtPrice(ids, updated.startTime, updated.endTime)
          const eqTotal = editEquipItems.reduce((s, i) => s + i.subtotal, 0)
          const grandTotal = Math.round((courtPrice + eqTotal) * 100) / 100
          updated.totalPrice = String(grandTotal)
        }
      }
      return updated
    })
    if (field === 'startTime' || field === 'endTime' || field === 'courtId' || field === 'courtIds') {
      setEditPriceManual(false)
    }
  }

  const toggleEditCourt = (cId: string) => {
    const ids = editForm.courtIds
    const isSelected = ids.includes(cId)
    const newIds = isSelected ? ids.filter(id => id !== cId) : [...ids, cId]
    handleEditFormChange('courtIds', newIds)
    handleEditFormChange('courtId', newIds[0] || '')
  }

  const addEditEquip = (eq: Equipment) => {
    const existing = editEquipItems.find(i => i.equipmentId === eq.id)
    if (existing) {
      if (existing.quantity < eq.stock) {
        setEditEquipItems(editEquipItems.map(i =>
          i.equipmentId === eq.id ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unitPrice } : i
        ))
      }
    } else if (eq.stock > 0) {
      setEditEquipItems([...editEquipItems, { equipmentId: eq.id, name: eq.name, quantity: 1, unitPrice: eq.pricePerRental, subtotal: eq.pricePerRental }])
    }
  }

  const removeEditEquip = (eqId: string) => {
    setEditEquipItems(editEquipItems.filter(i => i.equipmentId !== eqId))
  }

  const updateEditEquipQty = (eqId: string, qty: number, stock: number) => {
    const clamped = Math.max(1, Math.min(qty, stock))
    setEditEquipItems(editEquipItems.map(i =>
      i.equipmentId === eqId ? { ...i, quantity: clamped, subtotal: clamped * i.unitPrice } : i
    ))
  }

  // Recalc price when equipment changes
  useEffect(() => {
    if (editPriceManual || !showEditModal) return
    const ids = editForm.courtIds.length > 0 ? editForm.courtIds : (editForm.courtId ? [editForm.courtId] : [])
    if (ids.length === 0 || !editForm.startTime || !editForm.endTime) return
    const courtPrice = calculateMultiCourtPrice(ids, editForm.startTime, editForm.endTime)
    const eqTotal = editEquipItems.reduce((s, i) => s + i.subtotal, 0)
    const grandTotal = Math.round((courtPrice + eqTotal) * 100) / 100
    if (grandTotal > 0) {
      setEditForm(prev => {
        if (editPriceManual) return prev
        return { ...prev, totalPrice: String(grandTotal) }
      })
    }
  }, [editEquipItems])

  const filteredEditUsers = useMemo(() => {
    if (!editClientSearch) return bookingUsers
    const q = editClientSearch.toLowerCase()
    return bookingUsers.filter(u =>
      u.name.toLowerCase().includes(q) || (u.email && u.email.toLowerCase().includes(q)) || (u.phone && u.phone.includes(q))
    )
  }, [editClientSearch, bookingUsers])

  const openEditModal = (booking: Booking) => {
    setEditTarget(booking)
    const cIds = booking.courtIds && booking.courtIds.length > 0 ? booking.courtIds : [booking.courtId]
    setEditForm({
      courtId: booking.courtId,
      courtIds: cIds,
      userId: booking.userId,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalPrice: String(booking.totalPrice),
      advanceAmount: String(booking.advanceAmount),
      paymentMethod: booking.paymentMethod || 'EFECTIVO',
      notes: (booking as Record<string, unknown>).notes as string || '',
      status: booking.status || 'reserved',
    })
    setEditEquipItems((booking.equipmentItems || []).map(e => ({ equipmentId: e.equipmentId, name: e.name, quantity: e.quantity, unitPrice: e.unitPrice, subtotal: e.subtotal })))
    setEditPriceManual(false)
    setEditClientSearch('')
    setEditEquipOpen(false)
    setShowEditModal(true)
  }

  const handleSubmitEdit = async () => {
    if (!editTarget) return
    const ids = editForm.courtIds.length > 0 ? editForm.courtIds : (editForm.courtId ? [editForm.courtId] : [])
    if (ids.length === 0) { toast({ title: 'Error', description: 'Selecciona al menos una cancha', variant: 'destructive' }); return }
    if (!editForm.userId) { toast({ title: 'Error', description: 'Selecciona un cliente', variant: 'destructive' }); return }
    if (!editForm.date) { toast({ title: 'Error', description: 'Selecciona una fecha', variant: 'destructive' }); return }
    if (!editForm.startTime || !editForm.endTime) { toast({ title: 'Error', description: 'Selecciona hora de inicio y fin', variant: 'destructive' }); return }
    if (editForm.startTime >= editForm.endTime) { toast({ title: 'Error', description: 'La hora de fin debe ser posterior a la de inicio', variant: 'destructive' }); return }
    const parsedTotal = parseFloat(editForm.totalPrice) || 0
    if (parsedTotal <= 0) { toast({ title: 'Error', description: 'El total debe ser mayor a 0', variant: 'destructive' }); return }
    const parsedAdvance = parseFloat(editForm.advanceAmount) || 0

    setSubmittingEdit(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editTarget.id,
          courtIds: ids,
          userId: editForm.userId,
          date: editForm.date,
          startTime: editForm.startTime,
          endTime: editForm.endTime,
          totalPrice: parsedTotal,
          advanceAmount: parsedAdvance,
          remainingAmount: Math.max(0, parsedTotal - parsedAdvance),
          paymentMethod: editForm.paymentMethod,
          status: editForm.status,
          notes: editForm.notes || null,
          equipmentItems: editEquipItems.map(i => ({ equipment_id: i.equipmentId, name: i.name, quantity: i.quantity, unit_price: i.unitPrice })),
          editBooking: true,
        }),
      })
      if (res.ok) {
        toast({ title: 'Reserva actualizada', description: 'Todos los cambios fueron guardados correctamente.' })
        setShowEditModal(false)
        setEditTarget(null)
        fetchData()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'No se pudo actualizar la reserva', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar la reserva', variant: 'destructive' })
    } finally {
      setSubmittingEdit(false)
    }
  }

  // B16 FIX: Use useMemo instead of IIFE for filtered bookings
  const filteredBookings = useMemo(() => {
    let result = statusFilter === 'all' ? [...bookings] : bookings.filter((b) => b.status === statusFilter)
    const afterStatus = result.length;
    // Hide past bookings unless toggle is on
    if (!showPastBookings) {
      const today = todayStr();
      const beforeDate = result.length;
      result = result.filter((b) => {
        const ok = typeof b.date === 'string' && b.date >= today;
        if (!ok) console.debug('[Filter] Excluded past booking:', b.id, 'date=', b.date, 'typeof=', typeof b.date, 'today=', today);
        return ok;
      });
      if (beforeDate > 0 && result.length === 0) {
        console.warn(`[Filter] showPastBookings=false removed ALL ${beforeDate} bookings. Today(Lima)=`, today)
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((b) =>
        b.user?.name?.toLowerCase().includes(q) ||
        b.user?.email?.toLowerCase().includes(q) ||
        b.court?.name?.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        (b.courts && b.courts.some((c) => c.name?.toLowerCase().includes(q)))
      )
    }
    if (dateFrom) result = result.filter((b) => b.date >= dateFrom)
    if (dateTo) result = result.filter((b) => b.date <= dateTo)
    if (courtFilter !== 'all') result = result.filter((b) => b.courtId === courtFilter || (b.courtIds && b.courtIds.includes(courtFilter)))
    if (sportFilter !== 'all') result = result.filter((b) => b.court?.sport === sportFilter || (b.courts && b.courts.some((c) => c.sport === sportFilter)))
    switch (sortBy) {
      case 'date_desc': {
        const today = todayStr();
        result.sort((a, b) => {
          const aIsToday = a.date === today, bIsToday = b.date === today;
          const aFuture = a.date > today, bFuture = b.date > today;
          const aPast = a.date < today, bPast = b.date < today;
          // 1) Today always first
          if (aIsToday && !bIsToday) return -1;
          if (!aIsToday && bIsToday) return 1;
          // 2) Both on same side of today
          if (aFuture && bFuture) {
            const dc = a.date.localeCompare(b.date);
            if (dc !== 0) return dc;
          } else if (aPast && bPast) {
            const dc = b.date.localeCompare(a.date);
            if (dc !== 0) return dc;
          }
          // Same date: chronological by start time
          return a.startTime.localeCompare(b.startTime);
        });
        break;
      }
      case 'date_asc': {
        // Strict ascending date order (correlativo)
        result.sort((a, b) => {
          const dc = a.date.localeCompare(b.date);
          if (dc !== 0) return dc;
          return a.startTime.localeCompare(b.startTime);
        });
        break;
      }
      case 'price_desc': result.sort((a, b) => b.totalPrice - a.totalPrice); break
      case 'price_asc': result.sort((a, b) => a.totalPrice - b.totalPrice); break
      case 'name_asc': result.sort((a, b) => (a.user?.name || '').localeCompare(b.user?.name || '')); break
    }
    return result
  }, [bookings, statusFilter, showPastBookings, searchQuery, dateFrom, dateTo, courtFilter, sportFilter, sortBy])

  // Bug fix #8: Pagination
  const paginatedBookings = useMemo(() => {
    const start = (bookingsPage - 1) * BOOKINGS_PER_PAGE
    return filteredBookings.slice(start, start + BOOKINGS_PER_PAGE)
  }, [filteredBookings, bookingsPage])
  const totalBookingsPages = Math.ceil(filteredBookings.length / BOOKINGS_PER_PAGE)

  // Reset page when filters change
  useEffect(() => { setBookingsPage(1) }, [statusFilter, showPastBookings, searchQuery, dateFrom, dateTo, courtFilter, sportFilter, sortBy])

  const activeFilterCount = [searchQuery, dateFrom, dateTo, courtFilter !== 'all' && courtFilter, sportFilter !== 'all' && sportFilter].filter(Boolean).length

  const clearAllFilters = () => {
    setSearchQuery('')
    setDateFrom('')
    setDateTo('')
    setCourtFilter('all')
    setSportFilter('all')
  }

  // B14 FIX: Use actual paid amount (advance) for completed, not totalPrice
  // B13 FIX: Widen date range to 365 days for accurate Finanzas
  const completedIncome = bookings
    .filter((b) => b.status === 'completed')
    .reduce((s, b) => s + b.advanceAmount, 0)
  const reservedAdvances = bookings
    .filter((b) => b.status === 'reserved')
    .reduce((s, b) => s + b.advanceAmount, 0)
  const totalIncome = completedIncome + reservedAdvances

  // Retained advances (adelantos de reservas canceladas que se quedaron en caja)
  const retainedTotal = retainedAdvances
    .filter((ra) => ra.status === 'retained')
    .reduce((s, ra) => s + ra.amount, 0)
  const refundedTotal = retainedAdvances
    .filter((ra) => ra.status === 'refunded')
    .reduce((s, ra) => s + ra.amount, 0)

  // Real money in box = normal income + retained advances (refunded is informational only —
  // the booking was already removed from totalIncome when cancelled, so subtracting again
  // would double-count the outflow).
  const effectiveIncome = totalIncome + retainedTotal
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const balance = effectiveIncome - totalExpenses

  const expensesByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {})

  /* user stats from bookings */
  const userStats = bookings.reduce<Record<string, { name: string; email: string; phone?: string; bookingCount: number; totalSpent: number }>>((acc, b) => {
    if (!b.user || !b.user.id) return acc
    if (!acc[b.user.id]) {
      acc[b.user.id] = { name: b.user.name || 'Sin nombre', email: b.user.email || '', phone: b.user.phone, bookingCount: 0, totalSpent: 0 }
    }
    acc[b.user.id].bookingCount++
    if (b.status === 'completed') {
      acc[b.user.id].totalSpent += b.totalPrice
    }
    return acc
  }, {})
  const rankedUsers = Object.values(userStats).sort((a, b) => b.totalSpent - a.totalSpent)

  /* ─── actions ─── */
  const handleUpdateStatus = async (id: string, status: string, advanceAction?: 'retain' | 'refund', cancelReason?: string): Promise<boolean> => {
    try {
      const body: Record<string, unknown> = { id, status }
      if (status === 'cancelled' && advanceAction) {
        body.advanceAction = advanceAction
        body.cancelReason = cancelReason || ''
      }
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)))
        toast({ title: 'Estado actualizado', description: `Reserva marcada como ${statusConfig[status]?.label || status}` })
        fetchData()
        return true
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Error', description: (err as Record<string, string>).error || 'No se pudo actualizar el estado', variant: 'destructive' })
        return false
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado', variant: 'destructive' })
      return false
    }
  }

  const handleStatusChangeWithAdvanceCheck = (booking: Booking, newStatus: string) => {
    // B1 FIX: Prevent reverting cancelled/completed back to other statuses
    if (booking.status === 'cancelled' && newStatus !== 'cancelled') {
      toast({ title: 'Acción bloqueada', description: 'No se puede cambiar el estado de una reserva cancelada.', variant: 'destructive' })
      return
    }
    // B3 FIX: Always confirm cancellation (even with 0 advance)
    if (newStatus === 'cancelled') {
      if (booking.advanceAmount > 0) {
        setCancelTarget(booking)
        setCancelAdvanceAction('retain')
        setCancelReason('')
        setShowCancelDialog(true)
      } else {
        // Simple confirmation for 0-advance bookings
        if (confirm(`¿Cancelar esta reserva de ${booking.user?.name || 'sin nombre'}?`)) {
          handleUpdateStatus(booking.id, newStatus)
        }
      }
    } else {
      handleUpdateStatus(booking.id, newStatus)
    }
  }

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return
    setCancellingBooking(true)
    const success = await handleUpdateStatus(cancelTarget.id, 'cancelled', cancelAdvanceAction, cancelReason)
    if (success) {
      setShowCancelDialog(false)
      setCancelTarget(null)
    }
    setCancellingBooking(false)
  }

  const handleToggleEquipment = async (bookingId: string, field: 'equipmentDelivered' | 'equipmentReturned', value: boolean) => {
    try {
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bookingId, [field]: value }),
      })
      if (res.ok) {
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, [field]: value } : b)))
        if (showEquipDetail?.id === bookingId) {
          setShowEquipDetail((prev) => prev ? { ...prev, [field]: value } : null)
        }
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' })
    }
  }

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Eliminar permanentemente esta reserva? Se borrara de la base de datos y no se podra recuperar.')) return
    try {
      const res = await fetch(`/api/bookings?id=${bookingId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        toast({ title: 'Reserva eliminada', description: 'La reserva fue eliminada permanentemente de la base de datos.' })
        setBookings((prev) => prev.filter((b) => b.id !== bookingId))
        fetchData()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'No se pudo eliminar la reserva.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar la reserva.', variant: 'destructive' })
    }
  }

  const handleAddExpense = async () => {
    if (!expForm.description || !expForm.amount || !expForm.category || !expForm.date) {
      toast({ title: 'Error', description: 'Completa todos los campos requeridos', variant: 'destructive' })
      return
    }
    setSubmittingExpense(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(expForm),
      })
      if (res.ok) {
        toast({ title: 'Gasto registrado', description: `${expForm.description} - ${fmtCurrency(parseFloat(expForm.amount))}` })
        setExpForm({ description: '', amount: '', category: 'mantenimiento', date: todayStr(), notes: '' })
        setShowExpenseForm(false)
        fetchData()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'No se pudo registrar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo registrar el gasto', variant: 'destructive' })
    } finally {
      setSubmittingExpense(false)
    }
  }

  /* schedule bookings for a given date */
  const scheduleBookings = bookings.filter((b) => b.date === scheduleDate && b.status !== 'cancelled')
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  const scheduleCourts = allCourts.map((c) => ({
    ...c,
    bookings: scheduleBookings.filter((b) => b.courtId === c.id || (b.courtIds && b.courtIds.includes(c.id))),
  }))

  /* time slots — admin has NO time restrictions, all slots available for any date (includes :30 for fractional hours) */
  const timeSlots = useMemo(() => generateTimeSlots(6, 23, [0, 30]), [])

  /* ─── KPIs ─── */
  const kpis = [
    { label: 'Canchas Ocupadas Hoy', value: todayBookings.length, icon: 'sports_soccer', color: 'text-cm-primary', bg: 'bg-cm-primary/10', sub: `de ${allCourts.length} canchas` },
    { label: 'Reservas del Día', value: todayBookings.length, icon: 'event', color: 'text-blue-400', bg: 'bg-blue-500/10', sub: `Hoy ${fmtDate(today)}` },
    { label: 'Ingresos del Día', value: fmtCurrency(todayRevenue), icon: 'payments', color: 'text-green-400', bg: 'bg-green-500/10', sub: 'Completados + adelantos' },
    { label: 'Pagos Pendientes', value: fmtCurrency(pendingTotal), icon: 'schedule', color: 'text-amber-400', bg: 'bg-amber-500/10', sub: `${pendingPayments.length} reservas` },
  ]

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="max-w-7xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-cm-surface-container-highest rounded w-1/4" />
          <div className="h-10 bg-cm-surface-container-highest rounded-xl" />
          <div className="h-64 bg-cm-surface-container-highest rounded-xl" />
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════ */
  return (
    <div className="px-4 py-6 pb-28">
      {/* Notification Banner - always visible */}
      <NotificationBanner
        alerts={bookingAlerts}
        onDismiss={dismissBookingAlert}
        onClearAll={clearAllAlerts}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button type="button"
            onClick={() => setView('profile')}
            className="p-2 rounded-full bg-cm-surface-container-highest/60 text-cm-on-surface-variant hover:text-cm-on-surface transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex-1">
            <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-cm-on-surface">
              Panel de Administracion
            </h1>
            <p className="text-cm-on-surface-variant text-sm font-[family-name:var(--font-inter)]">
              Gestion integral de CREARD
            </p>
          </div>
          {/* Time format toggle + Live alarm indicator */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUse12hFormat(!use12hFormat)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cm-surface-container-highest/60 border border-white/10 text-cm-on-surface-variant hover:text-cm-on-surface hover:border-white/20 transition-all"
              title={use12hFormat ? 'Cambiar a formato 24h' : 'Cambiar a formato 12h'}
            >
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span className="text-[11px] font-bold font-[family-name:var(--font-inter)]">{use12hFormat ? '12h' : '24h'}</span>
            </button>
          {notifSettings.enabled && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cm-primary/10 border border-cm-primary/20">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cm-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cm-primary"></span>
              </span>
              <span className="text-[11px] font-bold text-cm-primary font-[family-name:var(--font-inter)]">Alarmas activas</span>
            </div>
          )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-cm-surface-container-highest/40 rounded-xl mb-6 overflow-x-auto no-scrollbar">
          {adminTabs.map((tab) => (
            <button type="button"
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 py-2.5 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.key
                  ? 'bg-cm-primary/10 text-cm-primary font-semibold'
                  : 'text-cm-on-surface-variant hover:text-cm-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═════════════════ TAB CONTENT ═════════════════ */}
        <AnimatePresence mode="wait">
          {/* ─── RESERVAS ─── */}
          {activeTab === 'reservas' && (
            <motion.div key="reservas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {/* ─── Live Clock + Alarm Indicator ─── */}
              <LiveClock alarmsCount={bookingAlerts.length} settings={notifSettings} />

              {/* ─── Filter Bar ─── */}
              <div className="glass-card rounded-xl p-4 mb-4">
                {/* Top row: search, view toggle, sort, filter toggle */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search */}
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cm-on-surface-variant/50 text-[18px]">search</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por cliente, cancha o ID..."
                      className="w-full pl-9 pr-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-sm text-cm-on-surface placeholder:text-cm-on-surface-variant/40 focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                    />
                    {searchQuery && (
                      <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined text-cm-on-surface-variant text-[16px]">close</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Sort dropdown */}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      className="bg-cm-surface-container-highest/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                    >
                      <option value="date_desc">Más recientes</option>
                      <option value="date_asc">Más antiguos</option>
                      <option value="price_desc">Mayor precio</option>
                      <option value="price_asc">Menor precio</option>
                      <option value="name_asc">Cliente A-Z</option>
                    </select>

                    {/* View mode toggle */}
                    <div className="flex bg-cm-surface-container-highest/60 rounded-lg p-0.5">
                      <button type="button" onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-cm-primary/15 text-cm-primary' : 'text-cm-on-surface-variant hover:text-cm-on-surface'}`} title="Tabla">
                        <span className="material-symbols-outlined text-[18px]">table_list</span>
                      </button>
                      <button type="button" onClick={() => setViewMode('gallery')} className={`p-1.5 rounded-md transition-all ${viewMode === 'gallery' ? 'bg-cm-primary/15 text-cm-primary' : 'text-cm-on-surface-variant hover:text-cm-on-surface'}`} title="Galería">
                        <span className="material-symbols-outlined text-[18px]">grid_view</span>
                      </button>
                      <button type="button" onClick={() => setViewMode('compact')} className={`p-1.5 rounded-md transition-all ${viewMode === 'compact' ? 'bg-cm-primary/15 text-cm-primary' : 'text-cm-on-surface-variant hover:text-cm-on-surface'}`} title="Compacto">
                        <span className="material-symbols-outlined text-[18px]">view_agenda</span>
                      </button>
                    </div>

                    {/* Filter toggle */}
                    <button type="button"
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${showFilters || activeFilterCount > 0 ? 'bg-cm-primary/10 text-cm-primary border border-cm-primary/30' : 'bg-cm-surface-container-highest/40 text-cm-on-surface-variant border border-transparent hover:border-white/10'}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{showFilters ? 'filter_list_off' : 'filter_list'}</span>
                      Filtros
                      {activeFilterCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-cm-primary text-cm-on-primary text-[10px] flex items-center justify-center font-bold">{activeFilterCount}</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Advanced filters (collapsible) */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t border-white/5">
                        <div>
                          <label className="text-[11px] text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Desde</label>
                          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]" />
                        </div>
                        <div>
                          <label className="text-[11px] text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Hasta</label>
                          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]" />
                        </div>
                        <div>
                          <label className="text-[11px] text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Cancha</label>
                          <select value={courtFilter} onChange={(e) => setCourtFilter(e.target.value)} className="w-full px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]">
                            <option value="all">Todas las canchas</option>
                            {uniqueCourts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Deporte</label>
                          <select value={sportFilter} onChange={(e) => setSportFilter(e.target.value)} className="w-full px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]">
                            <option value="all">Todos los deportes</option>
                            {uniqueSports.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                          </select>
                        </div>
                      </div>
                      {activeFilterCount > 0 && (
                        <button type="button" onClick={clearAllFilters} className="mt-2 text-xs text-cm-primary font-semibold font-[family-name:var(--font-inter)] hover:underline flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">filter_list_off</span>
                          Limpiar todos los filtros
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Active filter badges */}
                {!showFilters && activeFilterCount > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-white/5">
                    {dateFrom && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cm-surface-container-highest/60 text-[10px] text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">
                        Desde: {fmtDate(dateFrom)}
                        <button type="button" onClick={() => setDateFrom('')} className="hover:text-red-400 transition-colors"><span className="material-symbols-outlined text-[12px]">close</span></button>
                      </span>
                    )}
                    {dateTo && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cm-surface-container-highest/60 text-[10px] text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">
                        Hasta: {fmtDate(dateTo)}
                        <button type="button" onClick={() => setDateTo('')} className="hover:text-red-400 transition-colors"><span className="material-symbols-outlined text-[12px]">close</span></button>
                      </span>
                    )}
                    {courtFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cm-surface-container-highest/60 text-[10px] text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">
                        {uniqueCourts.find(c => c.id === courtFilter)?.name || courtFilter}
                        <button type="button" onClick={() => setCourtFilter('all')} className="hover:text-red-400 transition-colors"><span className="material-symbols-outlined text-[12px]">close</span></button>
                      </span>
                    )}
                    {sportFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cm-surface-container-highest/60 text-[10px] text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)] capitalize">
                        {sportFilter}
                        <button type="button" onClick={() => setSportFilter('all')} className="hover:text-red-400 transition-colors"><span className="material-symbols-outlined text-[12px]">close</span></button>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Status filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button type="button" onClick={() => setStatusFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === 'all' ? 'bg-cm-primary/10 text-cm-primary border border-cm-primary/30' : 'bg-cm-surface-container-highest/40 text-cm-on-surface-variant border border-transparent hover:border-white/10'}`}>
                  Todos ({filteredBookings.length})
                </button>
                {Object.entries(statusConfig).map(([key, val]) => {
                  // Bug fix #5: Count respects showPastBookings toggle
                  let countBase = bookings.filter((b) => b.status === key)
                  if (!showPastBookings) {
                    const today = todayStr()
                    countBase = countBase.filter(b => typeof b.date === 'string' && b.date >= today)
                  }
                  const count = countBase.length
                  if (count === 0) return null
                  return (
                    <button type="button" key={key} onClick={() => setStatusFilter(key)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${statusFilter === key ? `${val.color} border-current/30` : 'bg-cm-surface-container-highest/40 text-cm-on-surface-variant border border-transparent hover:border-white/10'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${val.dot}`} />
                      {val.label} ({count})
                    </button>
                  )
                })}
              </div>

              {/* Results count + action buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                  Mostrando <span className="font-semibold text-cm-on-surface">{filteredBookings.length}</span> de <span className="font-semibold text-cm-on-surface">{showPastBookings ? bookings.length : bookings.filter(b => typeof b.date === 'string' && b.date >= todayStr()).length}</span> reservas
                </p>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => setShowPastBookings(!showPastBookings)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${showPastBookings ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' : 'bg-cm-surface-container-highest/40 text-cm-on-surface-variant border border-transparent hover:border-white/10'}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{showPastBookings ? 'history_toggle_off' : 'history'}</span>
                    {showPastBookings ? 'Ocultar pasadas' : 'Ver pasadas'}
                  </button>
                  <button type="button"
                    onClick={openBookingForm}
                    className="flex items-center gap-1.5 px-4 py-2 bg-cm-primary text-cm-on-primary text-sm font-semibold rounded-xl hover:brightness-110 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>add_circle</span>
                    Nueva Reserva
                  </button>
                  <button type="button"
                    onClick={() => setShowSchedule(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-cm-primary/10 text-cm-primary text-sm font-semibold rounded-xl hover:bg-cm-primary/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>view_timeline</span>
                    Ver Horarios
                  </button>
                </div>
              </div>

              {/* ═══ View Modes ═══ */}
              {filteredBookings.length === 0 ? (
                <div className="glass-card rounded-xl p-12 text-center">
                  <span className="material-symbols-outlined text-4xl text-cm-on-surface-variant/30 block mb-2">search_off</span>
                  <p className="text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-2">No hay reservas con estos filtros</p>
                  <div className="flex flex-col items-center gap-1 text-[11px] text-cm-on-surface-variant/60 font-[family-name:var(--font-inter)]">
                    <span>Total cargadas: {bookings.length} | Mostrando: {filteredBookings.length}</span>
                    {!showPastBookings && <span className="text-cm-primary/70">Las reservas pasadas estan ocultas. Activa "Ver pasadas" para mostrarlas.</span>}
                    {bookings.length === 0 && <span>No se encontraron reservas en el rango de fechas consultado.</span>}
                  </div>
                  {bookings.length === 0 && (
                    <button type="button" onClick={fetchData} className="mt-4 px-4 py-2 bg-cm-primary/10 text-cm-primary text-xs font-semibold rounded-lg hover:bg-cm-primary/20 transition-colors font-[family-name:var(--font-inter)]">
                      <span className="material-symbols-outlined text-[14px] align-middle mr-1">refresh</span>Reintentar carga
                    </button>
                  )}
                </div>
              ) : viewMode === 'table' ? (
                /* ─── TABLE MODE ─── */
                <BookingsTable
                  bookings={paginatedBookings}
                  getAlertLevel={getAlertLevel}
                  openSeriesModal={openSeriesModal}
                  openAdvanceModal={openAdvanceModal}
                  handleUpdateStatus={handleStatusChangeWithAdvanceCheck}
                  onShowEquipDetail={setShowEquipDetail}
                  advanceAmount={advanceAmount}
                  isSuperAdmin={isSuperAdmin}
                  onDeleteBooking={handleDeleteBooking}
                  use12hFormat={use12hFormat}
                  onExtendTime={openExtendModal}
                  onEditTime={isSuperAdmin ? openEditModal : undefined}
                />
              ) : viewMode === 'gallery' ? (
                /* ─── GALLERY MODE ─── */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedBookings.map((b, i) => {
                    const st = statusConfig[b.status] || statusConfig.reserved
                    const isGCompleted = b.status === 'completed'
                    const statusAccent = isGCompleted ? 'bg-gradient-to-r from-green-400 via-emerald-400 to-green-400' : b.status === 'cancelled' ? 'bg-red-400' : 'bg-amber-400'
                    const galertLv = getAlertLevel(b.id)
                    const cardBorder = isGCompleted
                      ? 'border-green-400/40 shadow-[0_0_15px_rgba(34,197,94,0.12),0_0_3px_rgba(34,197,94,0.3)] animate-glow-green-row'
                      : galertLv === 'expired' ? 'border-red-500/60 animate-pulse' : galertLv === 'warning' ? 'border-amber-500/60' : ''
                    return (
                      <motion.div
                        key={b.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                        className={`glass-card rounded-xl overflow-hidden hover:border-white/15 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all duration-300 group relative ${cardBorder}`}
                      >
                        {/* Top accent bar */}
                        <div className={`h-1 ${statusAccent}`} />
                        {isGCompleted && (
                          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-green-400/10 via-green-400/[0.03] to-transparent animate-scanline-green pointer-events-none rounded-t-xl" />
                        )}
                        <div className="p-4 space-y-3">
                          {/* Date & Time */}
                          <div>
                            <div className="flex items-center gap-1.5 text-cm-on-surface-variant text-[11px] font-[family-name:var(--font-inter)]">
                              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                              {fmtDateFull(b.date)}
                              {b.recurringGroupId && (
                                <button type="button" onClick={() => openSeriesModal(b.recurringGroupId!)} className="p-0.5 rounded text-cm-primary hover:bg-cm-primary/10 transition-colors" title="Serie recurrente">
                                  <span className="material-symbols-outlined text-[13px]">repeat</span>
                                </button>
                              )}
                            </div>
                            <p className="font-[family-name:var(--font-sora)] font-bold text-cm-on-surface text-lg mt-0.5">
                              {formatTimeRange(b.startTime, b.endTime, use12hFormat)}
                            </p>
                          </div>
                          {/* Court */}
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-cm-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="material-symbols-outlined text-cm-primary text-[16px]">{sportIcons[b.court?.sport || ''] || 'sports'}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-[family-name:var(--font-sora)] font-semibold text-xs text-cm-on-surface">
                                {b.courtIds && b.courtIds.length > 1
                                  ? (b.courts?.map(c => c.name).join(', ') || `${b.courtIds.length} canchas`)
                                  : (b.court?.name || 'N/A')}
                              </p>
                              {b.court?.branch && <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{b.court.branch.name}</p>}
                            </div>
                          </div>
                          {/* Client */}
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-cm-surface-container-highest flex items-center justify-center flex-shrink-0">
                              <span className="material-symbols-outlined text-cm-on-surface-variant text-[14px]">person</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-cm-on-surface font-medium font-[family-name:var(--font-inter)] truncate">{b.user?.name || 'Sin nombre'}</p>
                              <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] truncate">{b.user?.email || ''}</p>
                            </div>
                          </div>
                          {/* Status badge + Payment method */}
                          <div className="flex items-center gap-2">
                            {isGCompleted ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-500/20 text-green-300 shadow-[0_0_10px_rgba(34,197,94,0.25),0_0_3px_rgba(34,197,94,0.5)] border border-green-400/20 animate-glow-green">
                                <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                                {st.label}
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                {st.label}
                              </span>
                            )}
                            {b.paymentMethod && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cm-surface-container-highest/60 text-cm-on-surface-variant">
                                {b.paymentMethod === 'YAPE' ? '📱' : b.paymentMethod === 'PLIN' ? '💜' : '💵'}
                                <span>{b.paymentMethod}</span>
                              </span>
                            )}
                          </div>
                          {/* Price breakdown */}
                          <div className="pt-2 border-t border-white/5 space-y-1">
                            <div className="flex justify-between text-[11px] font-[family-name:var(--font-inter)]">
                              <span className="text-cm-on-surface-variant">Adelanto</span>
                              <span className="text-cm-on-surface">{fmtCurrency(b.advanceAmount)}</span>
                            </div>
                            <div className="flex justify-between text-[11px] font-[family-name:var(--font-inter)]">
                              <span className="text-cm-on-surface-variant">Restante</span>
                              <span className={b.remainingAmount > 0 ? 'text-orange-400' : 'text-green-400'}>{fmtCurrency(b.remainingAmount)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-[family-name:var(--font-sora)] pt-1">
                              <span className="text-cm-on-surface font-medium">Total</span>
                              <span className="text-cm-primary font-bold">{fmtCurrency(b.totalPrice)}</span>
                            </div>
                          </div>
                          {/* Status dropdown + Advance */}
                          <div className="flex items-center gap-2">
                            {b.recurringGroupId && (
                              <button type="button"
                                onClick={() => openSeriesModal(b.recurringGroupId!)}
                                className="p-1.5 rounded-lg bg-cm-primary/10 text-cm-primary hover:bg-cm-primary/20 transition-colors flex-shrink-0"
                                title="Ver serie recurrente"
                              >
                                <span className="material-symbols-outlined text-[16px]">repeat</span>
                              </button>
                            )}
                            <select
                              value={b.status}
                              onChange={(e) => handleStatusChangeWithAdvanceCheck(b, e.target.value)}
                              className="flex-1 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                            >
                              <option value="reserved">Reservado</option>
                              <option value="completed">Completo</option>
                              <option value="cancelled">Cancelado</option>
                            </select>
                            {/* B8 FIX: Always show payment button (not just when remainingAmount > 0) */}
                            <button type="button"
                              onClick={() => openAdvanceModal(b)}
                              className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-400/20 transition-colors flex-shrink-0"
                              title={b.remainingAmount > 0 ? 'Registrar pago' : 'Registrar pago adicional'}
                            >
                              <span className="material-symbols-outlined text-[16px]">payments</span>
                            </button>
                            {b.status === 'reserved' && (
                              <button type="button"
                                onClick={() => openExtendModal(b)}
                                className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-400/20 transition-colors flex-shrink-0"
                                title="Extender tiempo"
                              >
                                <span className="material-symbols-outlined text-[16px]">schedule</span>
                              </button>
                            )}
                            {isSuperAdmin && (
                              <button type="button"
                                onClick={() => openEditModal(b)}
                                className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-400/20 transition-colors flex-shrink-0"
                                title="Editar reserva"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                            )}
                            {isSuperAdmin && (
                              <button type="button"
                                onClick={() => handleDeleteBooking(b.id)}
                                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-400/20 transition-colors flex-shrink-0"
                                title="Eliminar permanentemente"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                /* ─── COMPACT MODE ─── */
                <div className="space-y-2">
                  {paginatedBookings.map((b, i) => {
                    const st = statusConfig[b.status] || statusConfig.reserved
                    const isCCompleted = b.status === 'completed'
                    const calertLv = getAlertLevel(b.id)
                    const compactBorder = isCCompleted
                      ? 'border-green-400/40 shadow-[0_0_12px_rgba(34,197,94,0.1),0_0_3px_rgba(34,197,94,0.25)] animate-glow-green-row relative overflow-hidden'
                      : calertLv === 'expired' ? 'border-red-500/60 animate-pulse' : calertLv === 'warning' ? 'border-amber-500/60' : ''
                    return (
                      <motion.div
                        key={b.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.2) }}
                        className={`glass-card rounded-xl px-4 py-3 hover:border-white/15 transition-all duration-200 ${compactBorder}`}
                      >
                        {isCCompleted && (
                          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-green-400/10 via-green-400/[0.03] to-transparent animate-scanline-green pointer-events-none" />
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          {/* Date & Time */}
                          <div className="flex items-center gap-2 sm:w-32 flex-shrink-0">
                            <span className="material-symbols-outlined text-cm-on-surface-variant text-[16px]">event</span>
                            <div>
                              <div className="flex items-center gap-1">
                                <p className="text-xs text-cm-on-surface font-medium font-[family-name:var(--font-inter)]">{fmtDate(b.date)}</p>
                                {b.recurringGroupId && (
                                  <button type="button" onClick={() => openSeriesModal(b.recurringGroupId!)} className="p-0.5 rounded text-cm-primary hover:bg-cm-primary/10 transition-colors" title="Serie recurrente">
                                    <span className="material-symbols-outlined text-[13px]">repeat</span>
                                  </button>
                                )}
                              </div>
                              <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{formatTimeRange(b.startTime, b.endTime, use12hFormat)}</p>
                            </div>
                          </div>
                          {/* Court */}
                          <div className="flex items-center gap-1.5 sm:w-36 flex-shrink-0">
                            <span className="material-symbols-outlined text-cm-primary text-[14px]">{sportIcons[b.court?.sport || ''] || 'sports'}</span>
                            <span className="text-xs text-cm-on-surface font-medium font-[family-name:var(--font-sora)] truncate">
                              {b.courtIds && b.courtIds.length > 1
                                ? (b.courts?.map(c => c.name).join(', ') || `${b.courtIds.length} canchas`)
                                : (b.court?.name || 'N/A')}
                            </span>
                          </div>
                          {/* Client */}
                          <div className="flex-1 min-w-0 hidden md:block">
                            <p className="text-xs text-cm-on-surface font-medium font-[family-name:var(--font-inter)] truncate">{b.user?.name || 'Sin nombre'}</p>
                            <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] truncate">{b.user?.email || ''}</p>
                          </div>
                          {/* Status + Price + Action */}
                          <div className="flex items-center gap-2 sm:gap-3 sm:ml-auto flex-shrink-0">
                            {b.recurringGroupId && (
                              <button type="button"
                                onClick={() => openSeriesModal(b.recurringGroupId!)}
                                className="p-1 rounded-lg text-cm-primary hover:bg-cm-primary/10 transition-colors"
                                title="Ver serie recurrente"
                              >
                                <span className="material-symbols-outlined text-[14px]">repeat</span>
                              </button>
                            )}
                            {b.status === 'completed' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-500/20 text-green-300 shadow-[0_0_10px_rgba(34,197,94,0.25),0_0_3px_rgba(34,197,94,0.5)] border border-green-400/20 animate-glow-green">
                                <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                                {st.label}
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                {st.label}
                              </span>
                            )}
                            {b.paymentMethod && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cm-surface-container-highest/60 text-cm-on-surface-variant hidden sm:inline-flex">
                                {b.paymentMethod === 'YAPE' ? '📱' : b.paymentMethod === 'PLIN' ? '💜' : '💵'}
                                <span>{b.paymentMethod}</span>
                              </span>
                            )}
                            <span className="text-xs text-cm-primary font-bold font-[family-name:var(--font-sora)] whitespace-nowrap">{fmtCurrency(b.totalPrice)}</span>
                            {/* B8 FIX: Always show payment button */}
                            <button type="button"
                              onClick={() => openAdvanceModal(b)}
                              className="p-1 rounded-lg text-amber-400 hover:bg-amber-400/10 transition-colors"
                              title={b.remainingAmount > 0 ? 'Registrar pago' : 'Registrar pago adicional'}
                            >
                              <span className="material-symbols-outlined text-[14px]">payments</span>
                            </button>
                            {b.status === 'reserved' && (
                              <button type="button"
                                onClick={() => openExtendModal(b)}
                                className="p-1 rounded-lg text-blue-400 hover:bg-blue-400/10 transition-colors"
                                title="Extender tiempo"
                              >
                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                              </button>
                            )}
                            {isSuperAdmin && (
                              <button type="button"
                                onClick={() => openEditModal(b)}
                                className="p-1 rounded-lg text-purple-400 hover:bg-purple-400/10 transition-colors"
                                title="Editar reserva"
                              >
                                <span className="material-symbols-outlined text-[14px]">edit</span>
                              </button>
                            )}
                            <select
                              value={b.status}
                              onChange={(e) => handleStatusChangeWithAdvanceCheck(b, e.target.value)}
                              className="bg-cm-surface-container-highest/60 border border-white/10 rounded-lg px-1.5 py-1 text-[10px] text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                            >
                              <option value="reserved">Reservado</option>
                              <option value="completed">Completo</option>
                              <option value="cancelled">Cancelado</option>
                            </select>
                            {isSuperAdmin && (
                              <button type="button"
                                onClick={() => handleDeleteBooking(b.id)}
                                className="p-1 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                                title="Eliminar permanentemente"
                              >
                                <span className="material-symbols-outlined text-[14px]">delete_forever</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
              {/* Bug fix #8: Pagination controls */}
              {totalBookingsPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button type="button" onClick={() => setBookingsPage(p => Math.max(1, p - 1))} disabled={bookingsPage <= 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cm-surface-container-highest/40 text-cm-on-surface-variant border border-white/10 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    Anterior
                  </button>
                  <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] px-2">
                    {bookingsPage} / {totalBookingsPages}
                  </span>
                  <button type="button" onClick={() => setBookingsPage(p => Math.min(totalBookingsPages, p + 1))} disabled={bookingsPage >= totalBookingsPages}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cm-surface-container-highest/40 text-cm-on-surface-variant border border-white/10 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    Siguiente
                  </button>
                </div>
              )}
            </motion.div>
          )}


          {/* ─── FINANZAS ─── */}
          {activeTab === 'finanzas' && (
            <motion.div key="finanzas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
              {/* Row 1: Main income cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-cm-primary text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>account_balance_wallet</span>
                    <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Ingresos Totales</span>
                  </div>
                  <p className="font-[family-name:var(--font-sora)] text-2xl font-bold text-cm-primary">{fmtCurrency(totalIncome)}</p>
                  <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mt-1">Completados + adelantos activos</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-green-400 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>verified</span>
                    <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Servicios Completados</span>
                  </div>
                  <p className="font-[family-name:var(--font-sora)] text-2xl font-bold text-green-400">{fmtCurrency(completedIncome)}</p>
                  <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mt-1">Pagos recibidos de completadas</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-blue-400 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>savings</span>
                    <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Adelantos Activos</span>
                  </div>
                  <p className="font-[family-name:var(--font-sora)] text-2xl font-bold text-blue-400">{fmtCurrency(reservedAdvances)}</p>
                  <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mt-1">Saldo pendiente de reservas</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-red-400 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>trending_down</span>
                    <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Egresos</span>
                  </div>
                  <p className="font-[family-name:var(--font-sora)] text-2xl font-bold text-red-400">{fmtCurrency(totalExpenses)}</p>
                  <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mt-1">Total de gastos registrados</p>
                </motion.div>
              </div>

              {/* Row 2: Retained advances + Balance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-orange-400 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>lock_person</span>
                    <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] font-medium">Adelantos por Cancelaciones</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3 rounded-lg bg-orange-400/10">
                      <p className="text-[10px] text-orange-300 font-[family-name:var(--font-inter)] mb-1">Retenidos (en caja)</p>
                      <p className="font-[family-name:var(--font-sora)] text-lg font-bold text-orange-400">{fmtCurrency(retainedTotal)}</p>
                      <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{retainedAdvances.filter((ra) => ra.status === 'retained').length} registros</p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-400/10">
                      <p className="text-[10px] text-purple-300 font-[family-name:var(--font-inter)] mb-1">Devueltos al cliente</p>
                      <p className="font-[family-name:var(--font-sora)] text-lg font-bold text-purple-400">{fmtCurrency(refundedTotal)}</p>
                      <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{retainedAdvances.filter((ra) => ra.status === 'refunded').length} registros</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-cm-surface-container-highest/40 flex items-center justify-between">
                    <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Neto retenido</span>
                    <span className="font-[family-name:var(--font-sora)] text-sm font-bold text-orange-400">{fmtCurrency(retainedTotal)}</span>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`material-symbols-outlined text-[20px] ${balance >= 0 ? 'text-cm-primary' : 'text-red-400'}`} style={{ fontVariationSettings: '"FILL" 1' }}>analytics</span>
                    <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] font-medium">Balance (Dinero en Caja)</span>
                  </div>
                  <p className={`font-[family-name:var(--font-sora)] text-3xl font-bold ${balance >= 0 ? 'text-cm-primary' : 'text-red-400'}`}>
                    {fmtCurrency(balance)}
                  </p>
                  <div className="mt-3 p-3 rounded-lg bg-cm-surface-container-highest/40 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-green-400 font-[family-name:var(--font-inter)]">+ Ingresos por servicios</span>
                      <span className="text-green-400 font-[family-name:var(--font-inter)]">{fmtCurrency(totalIncome)}</span>
                    </div>
                    {retainedTotal > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-orange-400 font-[family-name:var(--font-inter)]">+ Adelantos retenidos</span>
                        <span className="text-orange-400 font-[family-name:var(--font-inter)]">+{fmtCurrency(retainedTotal)}</span>
                      </div>
                    )}
                    {refundedTotal > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-purple-400/70 font-[family-name:var(--font-inter)]">~ Devueltos (info)</span>
                        <span className="text-purple-400/70 font-[family-name:var(--font-inter)]">{fmtCurrency(refundedTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-red-400 font-[family-name:var(--font-inter)]">- Egresos</span>
                      <span className="text-red-400 font-[family-name:var(--font-inter)]">-{fmtCurrency(totalExpenses)}</span>
                    </div>
                    <div className="border-t border-white/10 mt-2 pt-2 flex justify-between text-sm font-bold">
                      <span className="text-cm-on-surface font-[family-name:var(--font-sora)]">Balance Total</span>
                      <span className={`font-[family-name:var(--font-sora)] ${balance >= 0 ? 'text-cm-primary' : 'text-red-400'}`}>{fmtCurrency(balance)}</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Row 3: Expense breakdown */}
              {Object.keys(expensesByCategory).length > 0 && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="glass-card rounded-xl p-4">
                  <h3 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-sm mb-3">Desglose de Gastos</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(expensesByCategory).map(([cat, amount]) => {
                      const catInfo = expenseCategories[cat] || expenseCategories.otros
                      return (
                        <div key={cat} className="flex items-center gap-2 p-2.5 rounded-lg bg-cm-surface-container-highest/30">
                          <span className="material-symbols-outlined text-[16px] text-cm-on-surface-variant">{catInfo.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] truncate">{catInfo.label}</p>
                            <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-inter)]">{fmtCurrency(amount)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* Row 4: Retained advances table */}
              {retainedAdvances.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-orange-400 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>history</span>
                      <h3 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-sm">Historial de Adelantos por Cancelaciones</h3>
                    </div>
                    <span className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{retainedAdvances.length} registros</span>
                  </div>
                  <div className="overflow-x-auto -mx-4 px-4">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="text-left py-2 text-cm-on-surface-variant font-[family-name:var(--font-inter)] font-medium">Fecha</th>
                          <th className="text-left py-2 text-cm-on-surface-variant font-[family-name:var(--font-inter)] font-medium">Cliente</th>
                          <th className="text-left py-2 text-cm-on-surface-variant font-[family-name:var(--font-inter)] font-medium">Cancha</th>
                          <th className="text-right py-2 text-cm-on-surface-variant font-[family-name:var(--font-inter)] font-medium">Adelanto</th>
                          <th className="text-right py-2 text-cm-on-surface-variant font-[family-name:var(--font-inter)] font-medium">Total Reserva</th>
                          <th className="text-center py-2 text-cm-on-surface-variant font-[family-name:var(--font-inter)] font-medium">Estado</th>
                          <th className="text-left py-2 text-cm-on-surface-variant font-[family-name:var(--font-inter)] font-medium">Motivo</th>
                          <th className="text-center py-2 text-cm-on-surface-variant font-[family-name:var(--font-inter)] font-medium">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {retainedAdvances.map((ra) => (
                          <tr key={ra.id} className="border-b border-white/5 last:border-0">
                            <td className="py-2 text-cm-on-surface font-[family-name:var(--font-inter)] whitespace-nowrap">
                              {ra.bookingDate || (ra.createdAt ? new Date(ra.createdAt).toLocaleDateString('es-PE') : '-')}
                            </td>
                            <td className="py-2 text-cm-on-surface font-[family-name:var(--font-inter)]">{ra.userName || 'Sin nombre'}</td>
                            <td className="py-2 text-cm-on-surface font-[family-name:var(--font-inter)]">{ra.courtName || '-'}</td>
                            <td className="py-2 text-right font-semibold font-[family-name:var(--font-inter)]">{fmtCurrency(ra.amount)}</td>
                            <td className="py-2 text-right text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{fmtCurrency(ra.originalTotal)}</td>
                            <td className="py-2 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium font-[family-name:var(--font-inter)] ${
                                ra.status === 'retained'
                                  ? 'bg-orange-400/20 text-orange-400'
                                  : 'bg-purple-400/20 text-purple-400'
                              }`}>
                                <span className="material-symbols-outlined text-[10px]">
                                  {ra.status === 'retained' ? 'lock' : 'currency_exchange'}
                                </span>
                                {ra.status === 'retained' ? 'Retenido' : 'Devuelto'}
                              </span>
                            </td>
                            <td className="py-2 text-cm-on-surface-variant font-[family-name:var(--font-inter)] max-w-[140px] truncate">{ra.reason || '-'}</td>
                            <td className="py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {ra.status === 'retained' ? (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        const res = await fetch('/api/retained-advances', {
                                          method: 'PUT',
                                          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ id: ra.id, bookingId: ra.bookingId, status: 'refunded' }),
                                        })
                                        if (res.ok) {
                                          toast({ title: 'Actualizado', description: 'Adelanto marcado como devuelto' })
                                          fetchData()
                                        }
                                      } catch { toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' }) }
                                    }}
                                    className="p-1 rounded-lg text-purple-400 hover:bg-purple-400/10 transition-colors"
                                    title="Marcar como devuelto"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">currency_exchange</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        const res = await fetch('/api/retained-advances', {
                                          method: 'PUT',
                                          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ id: ra.id, bookingId: ra.bookingId, status: 'retained' }),
                                        })
                                        if (res.ok) {
                                          toast({ title: 'Actualizado', description: 'Adelanto marcado como retenido' })
                                          fetchData()
                                        }
                                      } catch { toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' }) }
                                    }}
                                    className="p-1 rounded-lg text-orange-400 hover:bg-orange-400/10 transition-colors"
                                    title="Marcar como retenido"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">lock</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!confirm('Eliminar este registro de adelanto?')) return
                                    try {
                                      const res = await fetch('/api/retained-advances', {
                                        method: 'PUT',
                                        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ id: ra.id, action: 'delete' }),
                                      })
                                      if (res.ok) {
                                        toast({ title: 'Eliminado', description: 'Registro de adelanto eliminado' })
                                        fetchData()
                                      }
                                    } catch { toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' }) }
                                  }}
                                  className="p-1 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                                  title="Eliminar registro"
                                >
                                  <span className="material-symbols-outlined text-[14px]">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* Revenue chart */}
              {stats?.revenueByMonth && stats.revenueByMonth.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card rounded-xl p-5">
                  <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-base mb-4">Ingresos por Mes</h2>
                  <div className="space-y-2">
                    {stats.revenueByMonth.map((item, i) => {
                      const maxRevenue = Math.max(...stats.revenueByMonth.map((m) => m.revenue), 1)
                      const barWidth = (item.revenue / maxRevenue) * 100
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-cm-on-surface-variant w-12 text-right font-[family-name:var(--font-inter)]">{item.month}</span>
                          <div className="flex-1 h-7 bg-cm-surface-container-highest/40 rounded-lg overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(barWidth, 2)}%` }}
                              transition={{ duration: 0.6, delay: i * 0.05 }}
                              className="h-full rounded-lg flex items-center px-2"
                              style={{
                                background: i === stats.revenueByMonth.length - 1
                                  ? 'linear-gradient(90deg, #00ff41, #00cc33)'
                                  : 'linear-gradient(90deg, rgba(0,255,65,0.6), rgba(0,255,65,0.3))',
                              }}
                            >
                              <span className="text-[10px] font-semibold text-cm-on-primary font-[family-name:var(--font-inter)] whitespace-nowrap">
                                {item.revenue > 0 ? fmtCurrency(item.revenue) : ''}
                              </span>
                            </motion.div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ─── GASTOS ─── */}
          {activeTab === 'gastos' && (
            <motion.div key="gastos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {/* Header with add button */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-lg">Registro de Gastos</h2>
                  <p className="text-cm-on-surface-variant text-xs font-[family-name:var(--font-inter)]">{expenses.length} gastos · Total {fmtCurrency(totalExpenses)}</p>
                </div>
                <button type="button"
                  onClick={() => setShowExpenseForm(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-cm-primary/10 text-cm-primary text-sm font-semibold rounded-xl hover:bg-cm-primary/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>add</span>
                  Agregar Gasto
                </button>
              </div>

              {/* Expense list */}
              <ExpensesTable expenses={expenses} />

              {/* Add expense modal */}
              <AnimatePresence>
                {showExpenseForm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => !submittingExpense && setShowExpenseForm(false)}
                  >
                    <motion.div
                      initial={{ y: 100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 100, opacity: 0 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      className="w-full max-w-md glass-card rounded-2xl p-6 border-cm-primary/20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="font-[family-name:var(--font-sora)] font-bold text-lg text-cm-on-surface">Agregar Gasto</h3>
                        {!submittingExpense && (
                          <button type="button" onClick={() => setShowExpenseForm(false)} className="p-1 rounded-full hover:bg-cm-surface-container-highest transition-colors">
                            <span className="material-symbols-outlined text-cm-on-surface-variant">close</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Descripción *</label>
                          <input
                            value={expForm.description}
                            onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface placeholder:text-cm-on-surface-variant/50 focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                            placeholder="Ej. Mantenimiento césped"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Monto (S/) *</label>
                            <input
                              type="number"
                              step="0.01"
                              value={expForm.amount}
                              onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))}
                              className="w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface placeholder:text-cm-on-surface-variant/50 focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Fecha *</label>
                            <input
                              type="date"
                              value={expForm.date}
                              onChange={(e) => setExpForm((f) => ({ ...f, date: e.target.value }))}
                              className="w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Categoría *</label>
                          <div className="grid grid-cols-3 gap-2">
                            {Object.entries(expenseCategories).map(([key, cat]) => (
                              <button type="button"
                                key={key}
                                onClick={() => setExpForm((f) => ({ ...f, category: key }))}
                                className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-[11px] font-medium transition-all ${
                                  expForm.category === key
                                    ? 'bg-cm-primary/10 border-cm-primary/40 text-cm-primary'
                                    : 'bg-cm-surface-container-highest/30 border-transparent text-cm-on-surface-variant hover:border-white/10'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
                                {cat.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Notas</label>
                          <textarea
                            value={expForm.notes}
                            onChange={(e) => setExpForm((f) => ({ ...f, notes: e.target.value }))}
                            rows={2}
                            className="w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface placeholder:text-cm-on-surface-variant/50 focus:outline-none focus:border-cm-primary/40 resize-none font-[family-name:var(--font-inter)]"
                            placeholder="Notas opcionales..."
                          />
                        </div>
                      </div>

                      <button type="button"
                        onClick={handleAddExpense}
                        disabled={submittingExpense}
                        className="w-full mt-5 py-3 bg-cm-primary text-cm-on-primary rounded-xl font-semibold font-[family-name:var(--font-sora)] hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {submittingExpense ? (
                          <><span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Registrando...</>
                        ) : (
                          <><span className="material-symbols-outlined text-[20px]">check_circle</span> Registrar Gasto</>
                        )}
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ─── USUARIOS ─── */}
          {activeTab === 'usuarios' && (
            <motion.div key="usuarios" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <UsersTab />
            </motion.div>
          )}

          {/* ─── CANCHAS (Court Management) ─── */}
          {activeTab === 'canchas' && (
            <CourtsTab allCourts={allCourts} onRefresh={fetchData} />
          )}

          {/* ─── EQUIPOS (Equipment Management) ─── */}
          {activeTab === 'equipos' && (
            <motion.div key="equipos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <EquipmentManager equipmentList={equipmentList} onRefresh={fetchData} />
            </motion.div>
          )}

          {/* ─── ALARMAS (Notification Settings) ─── */}
          {activeTab === 'alarmas' && (
            <motion.div key="alarmas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <NotificationSettingsPanel
                settings={notifSettings}
                onSettingsChange={setNotifSettings}
              />
            </motion.div>
          )}

          {/* ─── CONTENIDO (Edit Home Page) ─── */}
          {activeTab === 'contenido' && (
            <ContentTab />
          )}
        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
           MODALS: Booking Form, Advance Payment, Schedule
         ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {/* ─── New Booking Modal ─── */}
        {showBookingForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !submittingBooking && setShowBookingForm(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-[92vw] max-w-6xl lg:max-w-7xl glass-card rounded-2xl p-6 border-cm-primary/20 overflow-hidden flex flex-col max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-cm-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-cm-primary text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>add_circle</span>
                  </div>
                  <div>
                    <h3 className="font-[family-name:var(--font-sora)] font-bold text-lg text-cm-on-surface">Nueva Reserva</h3>
                    <p className="text-cm-on-surface-variant text-[11px] font-[family-name:var(--font-inter)]">Crear reserva manualmente</p>
                  </div>
                </div>
                {!submittingBooking && (
                  <button type="button" onClick={() => setShowBookingForm(false)} className="p-1 rounded-full hover:bg-cm-surface-container-highest transition-colors">
                    <span className="material-symbols-outlined text-cm-on-surface-variant">close</span>
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1 pr-1">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5">

                {/* ═══ SECTION 1 — Cancha y Horario ═══ */}
                <div className="lg:col-span-2">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-lg bg-cm-primary/15 text-cm-primary text-[11px] font-bold flex items-center justify-center font-[family-name:var(--font-sora)]">1</span>
                    <h4 className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">Cancha y Horario</h4>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] block">Selecciona cancha(s) *</label>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cm-primary/10 text-cm-primary font-semibold font-[family-name:var(--font-inter)]">
                      {bookingForm.courtIds.length} seleccionada{bookingForm.courtIds.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {(() => {
                    const futbolCourts = bookingCourtDetails.filter(c => c.sport === 'futbol')
                    const voleyCourts = bookingCourtDetails.filter(c => c.sport === 'voley')
                    const otherCourts = bookingCourtDetails.filter(c => c.sport !== 'futbol' && c.sport !== 'voley')

                    const CourtCard = ({ c, isFutbol }: { c: typeof bookingCourtDetails[0]; isFutbol: boolean }) => {
                      const isSelected = bookingForm.courtIds.includes(c.id)
                      const courtLabel = c.name.replace(/^(Cancha\s*)/i, '').trim() || c.name
                      const sched = c.pricingSchedule && c.pricingSchedule.length > 0 ? c.pricingSchedule : []
                      const morning = sched.find(s => s.startHour < 12)
                      const afternoon = sched.find(s => s.startHour >= 12)
                      return (
                        <button type="button" key={c.id}
                          onClick={() => {
                            setBookingForm((prev) => {
                              const newIds = isSelected ? prev.courtIds.filter(id => id !== c.id) : [...prev.courtIds, c.id]
                              const updated = { ...prev, courtIds: newIds, courtId: newIds[0] || '' }
                              if (newIds.length > 0 && updated.startTime && updated.endTime) {
                                const courtPrice = calculateMultiCourtPrice(newIds, updated.startTime, updated.endTime)
                                const eqTotal = selectedEquipItems.reduce((s, i) => s + i.subtotal, 0)
                                const grandTotal = Math.round((courtPrice + eqTotal) * 100) / 100
                                updated.totalPrice = String(grandTotal)
                                if (!updated.advanceAmount || parseFloat(updated.advanceAmount) <= 0) updated.advanceAmount = String(Math.round(grandTotal * 0.5 * 100) / 100)
                              } else { updated.totalPrice = ''; updated.advanceAmount = '' }
                              return updated
                            })
                            if (formErrors.courtId) setFormErrors(prev => { const n = { ...prev }; delete n.courtId; return n })
                          }}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all duration-200 active:scale-[0.97] ${
                            isSelected
                              ? (isFutbol ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-blue-500/50 bg-blue-500/10')
                              : 'border-white/[0.08] bg-cm-surface-container-low/50 hover:border-white/20'
                          }`}
                        >
                          {/* Mini field icon */}
                          <div className={`w-5 h-5 rounded-[3px] flex-shrink-0 flex items-center justify-center ${
                            isFutbol ? 'bg-emerald-900/80' : 'bg-blue-900/80'
                          }`}
                            style={isSelected ? { boxShadow: isFutbol ? '0 0 6px rgba(52,211,153,0.4)' : '0 0 6px rgba(96,165,250,0.4)' } : undefined}
                          >
                            <span className="material-symbols-outlined text-white/70" style={{ fontSize: '12px' }}>{isFutbol ? 'sports_soccer' : 'sports_volleyball'}</span>
                          </div>
                          <span className={`text-[11px] font-semibold font-[family-name:var(--font-sora)] leading-tight ${isSelected ? (isFutbol ? 'text-emerald-400' : 'text-blue-400') : 'text-cm-on-surface'}`}>{courtLabel}</span>
                          <span className={`text-[9px] font-[family-name:var(--font-inter)] leading-tight ${isSelected ? 'text-white/50' : 'text-cm-on-surface-variant/70'}`}>
                            {morning ? `${morning.label}: S/${morning.pricePerHour}` : ''}{morning && afternoon ? ' · ' : ''}{afternoon ? `${afternoon.label}: S/${afternoon.pricePerHour}` : ''}
                            {!morning && !afternoon ? `S/${c.pricePerHour}/h` : ''}
                          </span>
                          {isSelected && <span className="material-symbols-outlined text-emerald-400 ml-auto" style={{ fontSize: '14px' }}>check_circle</span>}
                        </button>
                      )
                    }

                    return (
                      <div className="flex flex-col gap-2">
                        {futbolCourts.length > 0 && (
                          <div>
                            <span className="text-[9px] font-bold font-[family-name:var(--font-inter)] text-emerald-400/70 uppercase tracking-[0.1em] mb-1 block">Fútbol</span>
                            <div className="flex flex-wrap gap-1.5">
                              {futbolCourts.map(c => <CourtCard key={c.id} c={c} isFutbol />)}
                            </div>
                          </div>
                        )}
                        {voleyCourts.length > 0 && (
                          <div>
                            <span className="text-[9px] font-bold font-[family-name:var(--font-inter)] text-blue-400/70 uppercase tracking-[0.1em] mb-1 block">Vóley</span>
                            <div className="flex flex-wrap gap-1.5">
                              {voleyCourts.map(c => <CourtCard key={c.id} c={c} isFutbol={false} />)}
                            </div>
                          </div>
                        )}
                        {otherCourts.length > 0 && (
                          <div>
                            <span className="text-[9px] font-bold font-[family-name:var(--font-inter)] text-sky-400/70 uppercase tracking-[0.1em] mb-1 block">Otras</span>
                            <div className="flex flex-wrap gap-1.5">
                              {otherCourts.map(c => <CourtCard key={c.id} c={c} isFutbol={false} />)}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  {formErrors.courtId && <p className="text-[10px] text-red-400 mt-1 font-[family-name:var(--font-inter)]">{formErrors.courtId}</p>}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <div>
                      <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Fecha *</label>
                      <input
                        type="date"
                        value={bookingForm.date}
                        onChange={(e) => handleBookingFormChange('date', e.target.value)}
                        min={todayStr()}
                        className={`w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)] ${formErrors.date ? 'border-red-400' : 'border-white/10'}`}
                      />
                      {formErrors.date && <p className="text-[10px] text-red-400 mt-1 font-[family-name:var(--font-inter)]">{formErrors.date}</p>}
                    </div>
                    {/* TimeSlotPicker — visual timeline */}
                    <div className="sm:mt-2 col-span-2">
                      <TimeSlotPicker
                        startTime={bookingForm.startTime}
                        endTime={bookingForm.endTime}
                        onChange={(s, e) => {
                          handleBookingFormChange('startTime', s)
                          handleBookingFormChange('endTime', e)
                          setStartTimeDrop(false)
                          setEndTimeDrop(false)
                        }}
                        occupied={formOccupiedSlots}
                        use12hFormat={use12hFormat}
                        theme="primary"
                      />
                      {(formErrors.startTime || formErrors.endTime) && (
                        <p className="text-[10px] text-red-400 mt-1 font-[family-name:var(--font-inter)]">
                          {formErrors.startTime || formErrors.endTime}
                        </p>
                      )}
                    </div>
                  </div>

                  {bookingForm.totalPrice && (bookingForm.courtIds.length > 1 || (bookingCourtDetails.find((c) => c.id === bookingForm.courtId)?.pricingSchedule?.length > 0 && bookingForm.startTime && bookingForm.endTime)) && (
                    <div className="mt-3 p-2.5 rounded-lg bg-cm-surface-container-highest/30 space-y-1">
                    {bookingForm.courtIds.length > 1 && bookingForm.startTime && bookingForm.endTime && (
                      <>
                        <p className="text-[10px] text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1">Desglose por cancha:</p>
                        {bookingForm.courtIds.map((cId) => {
                          const court = bookingCourtDetails.find((c) => c.id === cId)
                          if (!court) return null
                          const courtPrice = calculateMultiCourtPrice([cId], bookingForm.startTime, bookingForm.endTime)
                          return (
                            <div key={cId} className="flex justify-between text-xs font-[family-name:var(--font-inter)]">
                              <span className="text-cm-on-surface-variant truncate mr-2">{court.name}</span>
                              <span className="text-cm-on-surface whitespace-nowrap">S/ {courtPrice.toFixed(2)}</span>
                            </div>
                          )
                        })}
                      </>
                    )}
                    {/* Time-slot breakdown for single court */}
                    {(() => {
                      if (bookingForm.courtIds.length > 1) return null
                      const court = bookingCourtDetails.find((c) => c.id === bookingForm.courtId)
                      if (court && court.pricingSchedule && court.pricingSchedule.length > 0 && bookingForm.startTime && bookingForm.endTime) {
                        const { breakdown } = calculatePriceForTimeSlot(court.pricingSchedule, bookingForm.startTime, bookingForm.endTime)
                        if (breakdown.length > 0) {
                          return (
                            <>
                              <p className="text-[10px] text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1">Desglose por horario:</p>
                              {breakdown.map((b, i) => (
                                <div key={i} className="flex justify-between text-xs font-[family-name:var(--font-inter)]">
                                  <span className="text-cm-on-surface-variant">{b.label} ({b.hours}h × S/ {b.pricePerHour})</span>
                                  <span className="text-cm-on-surface">S/ {b.subtotal.toFixed(2)}</span>
                                </div>
                              ))}
                            </>
                          )
                        }
                      }
                      return null
                    })()}
                    {selectedEquipItems.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-white/[0.06] space-y-0.5">
                        <p className="text-[10px] text-blue-400/80 font-semibold font-[family-name:var(--font-inter)]">Equipamiento:</p>
                        {selectedEquipItems.map((eq) => (
                          <div key={eq.equipmentId} className="flex justify-between text-[11px] font-[family-name:var(--font-inter)]">
                            <span className="text-cm-on-surface-variant">{eq.name} ×{eq.quantity}</span>
                            <span className="text-blue-400">S/ {eq.subtotal.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-2 border-t border-white/5" />

                {/* ═══ SECTION 2 — Cliente ═══ */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-lg bg-cm-primary/15 text-cm-primary text-[11px] font-bold flex items-center justify-center font-[family-name:var(--font-sora)]">2</span>
                    <h4 className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">Cliente</h4>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">Cliente *</label>
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); openNewClientDialog() }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-cm-primary font-semibold hover:bg-cm-primary/10 rounded-lg transition-colors font-[family-name:var(--font-inter)] cursor-pointer"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Nuevo usuario
                    </button>
                  </div>
                  <Popover open={clientDropdownOpen} onOpenChange={setClientDropdownOpen}>
                    <PopoverTrigger asChild>
                      <button type="button"
                        className={`w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border rounded-xl text-sm text-left focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)] flex items-center justify-between ${formErrors.userId ? 'border-red-400' : 'border-white/10'}`}
                      >
                        <span className={bookingForm.userId ? 'text-cm-on-surface' : 'text-cm-on-surface-variant/40'}>
                          {(() => {
                            const selected = bookingUsers.find(u => u.id === bookingForm.userId)
                            return selected ? `${selected.name}${selected.phone ? ` · ${selected.phone}` : ''}${selected.email ? ` (${selected.email})` : ''}` : 'Buscar o seleccionar cliente...'
                          })()}
                        </span>
                        <span className="material-symbols-outlined text-[18px] text-cm-on-surface-variant/60">expand_more</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-0 bg-cm-surface-container-highest border-white/15 rounded-xl shadow-2xl"
                      align="start"
                      sideOffset={4}
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <Command shouldFilter={false} className="bg-transparent">
                        <div className="flex items-center gap-2 border-b border-white/10 px-3">
                          <span className="material-symbols-outlined text-[16px] text-cm-on-surface-variant/50">search</span>
                          <CommandInput
                            placeholder="Buscar por nombre, telefono o email..."
                            value={clientSearch}
                            onValueChange={setClientSearch}
                            className="h-9 bg-transparent border-0 text-sm text-cm-on-surface placeholder:text-cm-on-surface-variant/30 font-[family-name:var(--font-inter)]"
                          />
                        </div>
                        <CommandList className="max-h-56">
                          <CommandEmpty>
                            <div className="px-2 py-3 text-center">
                              <p className="text-xs text-cm-on-surface-variant/60 mb-2 font-[family-name:var(--font-inter)]">No se encontro el cliente</p>
                              <button type="button"
                                onClick={() => openNewClientDialog(clientSearch)}
                                className="inline-flex items-center gap-1.5 text-xs text-cm-primary font-semibold hover:text-cm-primary/80 transition-colors font-[family-name:var(--font-inter)]"
                              >
                                <UserPlus className="h-3.5 w-3.5" />
                                Crear "{clientSearch}" como nuevo cliente
                              </button>
                            </div>
                          </CommandEmpty>
                          <CommandGroup className="px-1 py-1">
                            {bookingUsers
                              .filter(u => {
                                if (!clientSearch) return true
                                const q = clientSearch.toLowerCase()
                                return u.name.toLowerCase().includes(q)
                                  || (u.email && u.email.toLowerCase().includes(q))
                                  || (u.phone && u.phone.includes(q))
                              })
                              .map((u) => {
                                const isSelected = u.id === bookingForm.userId
                                return (
                                  <CommandItem
                                    key={u.id}
                                    value={u.id}
                                    onSelect={() => {
                                      handleBookingFormChange('userId', u.id)
                                      setClientDropdownOpen(false)
                                      setClientSearch('')
                                    }}
                                    className={`flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer font-[family-name:var(--font-inter)] text-sm ${
                                      isSelected
                                        ? 'bg-cm-primary/15 text-cm-primary'
                                        : 'text-cm-on-surface data-[selected=true]:bg-cm-surface-container-highest/60'
                                    }`}
                                  >
                                    <div className="w-7 h-7 rounded-full bg-cm-primary/10 flex items-center justify-center flex-shrink-0">
                                      <span className="text-[11px] font-bold text-cm-primary font-[family-name:var(--font-sora)]">
                                        {u.name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="truncate text-sm">{u.name}</p>
                                      <p className="text-[10px] text-cm-on-surface-variant truncate">
                                        {[u.phone, u.email].filter(Boolean).join(' · ') || 'Sin contacto'}
                                      </p>
                                    </div>
                                    {isSelected && <Check className="h-4 w-4 text-cm-primary flex-shrink-0" />}
                                  </CommandItem>
                                )
                              })}
                          </CommandGroup>
                          <CommandSeparator className="bg-white/10" />
                          <CommandGroup className="px-1 py-1">
                            <CommandItem
                              onSelect={() => openNewClientDialog(clientSearch)}
                              className="flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer text-cm-primary hover:text-cm-primary/80 font-[family-name:var(--font-inter)] text-sm font-semibold data-[selected=true]:bg-cm-primary/10"
                            >
                              <Plus className="h-4 w-4" />
                              <span>Crear nuevo cliente</span>
                            </CommandItem>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {formErrors.userId && <p className="text-[10px] text-red-400 mt-1 font-[family-name:var(--font-inter)]">{formErrors.userId}</p>}
                </div>

                {/* ═══ SECTION 3 — Pago ═══ */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-lg bg-cm-primary/15 text-cm-primary text-[11px] font-bold flex items-center justify-center font-[family-name:var(--font-sora)]">3</span>
                    <h4 className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">Pago</h4>
                  </div>
                  <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Método de pago</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'EFECTIVO', label: 'Efectivo', icon: 'payments', color: 'text-green-400' },
                      { key: 'YAPE', label: 'Yape', icon: 'account_balance_wallet', color: 'text-purple-400' },
                      { key: 'PLIN', label: 'Plin', icon: 'account_balance_wallet', color: 'text-cyan-400' },
                    ].map((pm) => (
                      <button
                        type="button"
                        key={pm.key}
                        onClick={() => handleBookingFormChange('paymentMethod', pm.key)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-[11px] font-medium transition-all ${
                          bookingForm.paymentMethod === pm.key
                            ? 'bg-cm-primary/10 border-cm-primary/40 text-cm-primary'
                            : 'bg-cm-surface-container-highest/30 border-transparent text-cm-on-surface-variant hover:border-white/10'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-[16px] ${bookingForm.paymentMethod === pm.key ? '' : pm.color}`}>{pm.icon}</span>
                        {pm.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Precio total (S/) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={bookingForm.totalPrice}
                        onChange={(e) => handleBookingFormChange('totalPrice', e.target.value)}
                        placeholder="0.00"
                        className={`w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)] ${formErrors.totalPrice ? 'border-red-400' : 'border-white/10'}`}
                      />
                      {formErrors.totalPrice && <p className="text-[10px] text-red-400 mt-1 font-[family-name:var(--font-inter)]">{formErrors.totalPrice}</p>}
                    </div>
                    <div>
                      <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Adelanto (S/)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={bookingForm.advanceAmount}
                        onChange={(e) => handleBookingFormChange('advanceAmount', e.target.value)}
                        placeholder="50%"
                        className="w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                      />
                      {formErrors.advanceAmount && <p className="text-[10px] text-red-400 mt-1 font-[family-name:var(--font-inter)]">{formErrors.advanceAmount}</p>}
                    </div>
                  </div>

                  <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Estado inicial</label>
                  <select
                    value={bookingForm.status}
                    onChange={(e) => handleBookingFormChange('status', e.target.value)}
                    className="w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                  >
                    <option value="reserved">Reservado</option>
                    <option value="completed">Completo</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>

                <div className="lg:col-span-2 border-t border-white/5" />

                <div className="lg:col-span-2">
                  <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Notas</label>
                  <textarea
                    value={bookingForm.notes}
                    onChange={(e) => handleBookingFormChange('notes', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface placeholder:text-cm-on-surface-variant/50 focus:outline-none focus:border-cm-primary/40 resize-none font-[family-name:var(--font-inter)]"
                    placeholder="Notas opcionales..."
                  />
                </div>

                <div className="lg:col-span-2 border-t border-white/5" />

                <div className="lg:col-span-2">
                  <button type="button"
                    onClick={() => setShowEquipPanel(!showEquipPanel)}
                    className="flex items-center gap-2.5 w-full text-left"
                  >
                    <div className={`w-9 h-5 rounded-full transition-colors flex items-center ${showEquipPanel ? 'bg-blue-500 justify-end' : 'bg-cm-surface-container-highest justify-start'} px-0.5`}>
                      <div className={`w-4 h-4 rounded-full transition-all ${showEquipPanel ? 'bg-white shadow-lg' : 'bg-cm-on-surface-variant/60'}`} />
                    </div>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                      <span className="material-symbols-outlined text-[18px] text-blue-400">sports_tennis</span>
                      Agregar Equipamiento
                    </span>
                    {selectedEquipItems.length > 0 && (
                      <span className="ml-auto px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-bold">{selectedEquipItems.reduce((s, i) => s + i.quantity, 0)} items</span>
                    )}
                  </button>

                  {showEquipPanel && (
                    <div className="mt-3 space-y-2">
                      {equipmentList.length === 0 ? (
                        <p className="text-xs text-cm-on-surface-variant text-center py-3">No hay equipos registrados. Ve a la pestana "Equipos" para agregar.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {equipmentList.map(eq => {
                            const selected = selectedEquipItems.find(i => i.equipmentId === eq.id)
                            return (
                              <div key={eq.id} className="flex items-center gap-2 p-2 rounded-lg bg-cm-surface-container-highest/30">
                                <span className="material-symbols-outlined text-blue-400 text-[16px]">{sportIcons[eq.sport] || 'sports_tennis'}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-cm-on-surface font-medium font-[family-name:var(--font-sora)] truncate">{eq.name}</p>
                                  <p className="text-[10px] text-cm-on-surface-variant">{fmtCurrency(eq.pricePerRental)}/alquiler · Stock: {eq.stock}</p>
                                </div>
                                {selected ? (
                                  <div className="flex items-center gap-1">
                                    <button type="button" onClick={() => updateEquipQty(eq.id, selected.quantity - 1, eq.stock)} className="w-6 h-6 rounded bg-cm-surface-container-highest/60 text-cm-on-surface text-xs flex items-center justify-center hover:bg-red-500/20">-</button>
                                    <span className="w-6 text-center text-xs font-bold text-cm-on-surface">{selected.quantity}</span>
                                    <button type="button" onClick={() => updateEquipQty(eq.id, selected.quantity + 1, eq.stock)} className="w-6 h-6 rounded bg-cm-surface-container-highest/60 text-cm-on-surface text-xs flex items-center justify-center hover:bg-green-500/20">+</button>
                                    <span className="text-[10px] text-blue-400 font-semibold w-14 text-right">{fmtCurrency(selected.subtotal)}</span>
                                    <button type="button" onClick={() => removeEquipmentFromForm(eq.id)} className="p-1 text-red-400 hover:bg-red-400/10 rounded">
                                      <span className="material-symbols-outlined text-[14px]">close</span>
                                    </button>
                                  </div>
                                ) : (
                                  <button type="button"
                                    onClick={() => addEquipmentToForm(eq)}
                                    disabled={eq.stock <= 0}
                                    className="px-2 py-1 text-[10px] font-semibold rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                  >
                                    + Agregar
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {equipmentFormTotal > 0 && (
                        <div className="flex justify-between text-xs font-semibold pt-2 border-t border-white/5">
                          <span className="text-cm-on-surface-variant">Subtotal Equipamiento</span>
                          <span className="text-blue-400">{fmtCurrency(equipmentFormTotal)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-2 border-t border-white/5" />

                <div className="lg:col-span-2">
                  <button type="button"
                    onClick={() => { setShowRecurring(!showRecurring); setRecurringStep('config'); setRecurringPreview(null) }}
                    className="flex items-center gap-2.5 w-full text-left"
                  >
                    <div className={`w-9 h-5 rounded-full transition-colors flex items-center ${showRecurring ? 'bg-cm-primary justify-end' : 'bg-cm-surface-container-highest justify-start'} px-0.5`}>
                      <div className={`w-4 h-4 rounded-full transition-all ${showRecurring ? 'bg-white shadow-lg' : 'bg-cm-on-surface-variant/60'}`} />
                    </div>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                      <span className="material-symbols-outlined text-cm-primary text-[16px]">repeat</span>
                      Crear como reserva recurrente
                    </span>
                  </button>

                  <AnimatePresence>
                    {showRecurring && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        {recurringStep === 'config' ? (
                          <div className="mt-3 space-y-3">
                            {/* Frequency selector */}
                            <div>
                              <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1.5 block">Frecuencia</label>
                              <div className="grid grid-cols-4 gap-2">
                                {([
                                  { key: 'daily' as const, label: 'Diaria' },
                                  { key: 'weekly' as const, label: 'Semanal' },
                                  { key: 'biweekly' as const, label: 'Quincenal' },
                                  { key: 'custom' as const, label: 'Personalizada' },
                                ]).map((f) => (
                                  <button
                                    type="button"
                                    key={f.key}
                                    onClick={() => setRecurringConfig((p) => ({ ...p, frequency: f.key }))}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                      recurringConfig.frequency === f.key
                                        ? 'bg-cm-primary text-cm-on-primary shadow-lg shadow-cm-primary/20'
                                        : 'bg-cm-surface-container-highest/40 text-cm-on-surface-variant hover:bg-cm-surface-container-highest/60 border border-white/10'
                                    }`}
                                  >
                                    {f.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Custom days of week */}
                            {recurringConfig.frequency === 'custom' && (
                              <div>
                                <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1.5 block">Días de la semana</label>
                                <div className="flex gap-1.5">
                                  {(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const).map((day, idx) => {
                                    const dayNum = idx === 6 ? 0 : idx + 1 // Mon=1, Tue=2, ... Sun=0
                                    const isSelected = recurringConfig.daysOfWeek.includes(dayNum)
                                    return (
                                      <button
                                        type="button"
                                        key={day}
                                        onClick={() => {
                                          setRecurringConfig((p) => ({
                                            ...p,
                                            daysOfWeek: isSelected ? p.daysOfWeek.filter((d) => d !== dayNum) : [...p.daysOfWeek, dayNum],
                                          }))
                                        }}
                                        className={`w-10 h-10 rounded-xl text-[11px] font-bold transition-all ${
                                          isSelected
                                            ? 'bg-cm-primary text-cm-on-primary shadow-lg shadow-cm-primary/20'
                                            : 'bg-cm-surface-container-highest/40 text-cm-on-surface-variant hover:bg-cm-surface-container-highest/60 border border-white/10'
                                        }`}
                                      >
                                        {day}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* End condition */}
                            <div>
                              <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1.5 block">Condición de fin</label>
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                <button type="button"
                                  onClick={() => setRecurringConfig((p) => ({ ...p, endCondition: 'date' }))}
                                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                    recurringConfig.endCondition === 'date'
                                      ? 'bg-cm-primary text-cm-on-primary shadow-lg shadow-cm-primary/20'
                                      : 'bg-cm-surface-container-highest/40 text-cm-on-surface-variant hover:bg-cm-surface-container-highest/60 border border-white/10'
                                  }`}
                                >
                                  Por fecha final
                                </button>
                                <button type="button"
                                  onClick={() => setRecurringConfig((p) => ({ ...p, endCondition: 'count' }))}
                                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                    recurringConfig.endCondition === 'count'
                                      ? 'bg-cm-primary text-cm-on-primary shadow-lg shadow-cm-primary/20'
                                      : 'bg-cm-surface-container-highest/40 text-cm-on-surface-variant hover:bg-cm-surface-container-highest/60 border border-white/10'
                                  }`}
                                >
                                  Por cantidad
                                </button>
                              </div>
                              {recurringConfig.endCondition === 'date' ? (
                                <input
                                  type="date"
                                  value={recurringConfig.endDate}
                                  onChange={(e) => setRecurringConfig((p) => ({ ...p, endDate: e.target.value }))}
                                  min={bookingForm.date}
                                  className="w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={recurringConfig.count}
                                    onChange={(e) => setRecurringConfig((p) => ({ ...p, count: parseInt(e.target.value) || 12 }))}
                                    className="w-24 px-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                                  />
                                  <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">repeticiones</span>
                                </div>
                              )}
                            </div>

                            {/* Preview button */}
                            <button type="button"
                              onClick={handlePreviewRecurring}
                              disabled={previewLoading}
                              className="w-full py-2.5 bg-cm-primary/10 text-cm-primary rounded-xl text-sm font-semibold hover:bg-cm-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {previewLoading ? (
                                <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Generando vista previa...</>
                              ) : (
                                <><span className="material-symbols-outlined text-[18px]">preview</span> Vista previa</>
                              )}
                            </button>
                          </div>
                        ) : (
                          /* ═══ PREVIEW STEP ═══ */
                          <div className="mt-3 space-y-3">
                            {recurringPreview && recurringPreviewSummary && (
                              <>
                                {/* Summary */}
                                <div className="p-3 rounded-xl bg-cm-primary/5 border border-cm-primary/20 space-y-1.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Fechas disponibles</span>
                                    <span className="text-cm-primary font-bold font-[family-name:var(--font-sora)]">{recurringPreviewSummary.availableCount} de {recurringPreviewSummary.totalCount}</span>
                                  </div>
                                  {recurringPreviewSummary.conflictCount > 0 && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-red-400 font-[family-name:var(--font-inter)]">Conflictos</span>
                                      <span className="text-red-400 font-bold font-[family-name:var(--font-sora)]">{recurringPreviewSummary.conflictCount}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between text-sm pt-1 border-t border-white/5">
                                    <span className="text-cm-on-surface font-medium font-[family-name:var(--font-sora)]">Ingresos estimados</span>
                                    <span className="text-cm-primary font-bold font-[family-name:var(--font-sora)]">{fmtCurrency(recurringPreviewSummary.totalRevenue)}</span>
                                  </div>
                                </div>

                                {/* Dates table */}
                                <RecurringPreviewTable preview={recurringPreview} />

                                {/* Action buttons */}
                                <div className="flex gap-2">
                                  <button type="button"
                                    onClick={() => { setRecurringStep('config'); setRecurringPreview(null) }}
                                    className="flex-1 py-2.5 bg-cm-surface-container-highest/40 text-cm-on-surface-variant rounded-xl text-xs font-semibold hover:bg-cm-surface-container-highest/60 transition-all"
                                  >
                                    Volver
                                  </button>
                                  <button type="button"
                                    onClick={handleCreateRecurring}
                                    disabled={creatingRecurring || recurringPreviewSummary.availableCount === 0}
                                    className="flex-[2] py-2.5 bg-cm-primary text-cm-on-primary rounded-xl text-xs font-semibold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                  >
                                    {creatingRecurring ? (
                                      <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> Creando...</>
                                    ) : (
                                      <><span className="material-symbols-outlined text-[16px]">check_circle</span> Crear {recurringPreviewSummary.availableCount} reservas disponibles</>
                                    )}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                </div>{/* end grid */}
              </div>

              {/* ─── Sticky Footer with Price Summary ─── */}
              <div className="flex-shrink-0 border-t border-white/10 mt-4 pt-4 bg-cm-surface-container/80 backdrop-blur-sm -mx-6 -mb-6 px-6 pb-6 rounded-b-2xl">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    {bookingForm.totalPrice && (
                      <>
                        <div className="text-center">
                          <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Total</p>
                          <p className="text-lg font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">{fmtCurrency(parseFloat(bookingForm.totalPrice))}</p>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="text-center">
                          <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Adelanto</p>
                          <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">{fmtCurrency(parseFloat(bookingForm.advanceAmount) || parseFloat(bookingForm.totalPrice) * 0.5)}</p>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="text-center">
                          <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Restante</p>
                          <p className="text-sm font-semibold text-orange-400 font-[family-name:var(--font-sora)]">{fmtCurrency(parseFloat(bookingForm.totalPrice) - (parseFloat(bookingForm.advanceAmount) || parseFloat(bookingForm.totalPrice) * 0.5))}</p>
                        </div>
                      </>
                    )}
                  </div>
                  <button type="button"
                    onClick={showRecurring && recurringStep === 'preview' ? handleCreateRecurring : handleCreateBooking}
                    disabled={submittingBooking || creatingRecurring}
                    className="px-8 py-3 bg-cm-primary text-cm-on-primary rounded-xl font-semibold font-[family-name:var(--font-sora)] hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {(submittingBooking || creatingRecurring) ? (
                      <><span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Creando...</>
                    ) : (
                      <><span className="material-symbols-outlined text-[20px]">check_circle</span> Crear Reserva</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ─── Quick Client Creation Dialog (nested, portal-based so it renders above booking modal) ─── */}
        <Dialog open={showNewClientDialog} onOpenChange={(open) => { if (!open) { setShowNewClientDialog(false); setNewClientErrors({}) } }}>
          <DialogContent 
            className="sm:max-w-md bg-cm-surface-container border-white/15 rounded-2xl p-6 shadow-2xl z-[100]"
            onInteractOutside={(e) => {
              // Prevent closing when interacting with the booking modal underneath
              e.preventDefault()
            }}
            onEscapeKeyDown={(e) => {
              // Allow Escape to close only if not inside a nested interaction
              setShowNewClientDialog(false)
              setNewClientErrors({})
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-cm-on-surface font-[family-name:var(--font-sora)] text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-cm-primary" />
                Nuevo Cliente
              </DialogTitle>
              <DialogDescription className="text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                Crea un perfil rapido para este cliente. No se generan credenciales de acceso — el cliente podra reclamar su cuenta en el futuro.
              </DialogDescription>
            </DialogHeader>

            {newClientErrors.general && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-400 font-[family-name:var(--font-inter)]">
                {newClientErrors.general}
              </div>
            )}

            <div className="space-y-3 mt-2">
              <div>
                <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={newClientForm.name}
                  onChange={(e) => { setNewClientForm(p => ({ ...p, name: e.target.value })); if (newClientErrors.name) setNewClientErrors(p => { const n = { ...p }; delete n.name; return n }) }}
                  placeholder="Ej: Carlos Mendoza"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('new-client-phone')?.focus() }}
                  className={`w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border rounded-xl text-sm text-cm-on-surface placeholder:text-cm-on-surface-variant/30 focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)] ${newClientErrors.name ? 'border-red-400' : 'border-white/10'}`}
                />
                {newClientErrors.name && <p className="text-[10px] text-red-400 mt-1 font-[family-name:var(--font-inter)]">{newClientErrors.name}</p>}
              </div>

              <div>
                <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">
                  Telefono / Celular *
                </label>
                <input
                  type="tel"
                  id="new-client-phone"
                  value={newClientForm.phone}
                  onChange={(e) => { setNewClientForm(p => ({ ...p, phone: e.target.value })); if (newClientErrors.phone) setNewClientErrors(p => { const n = { ...p }; delete n.phone; return n }) }}
                  placeholder="Ej: 987654321"
                  onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('new-client-email')?.focus() }}
                  className={`w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border rounded-xl text-sm text-cm-on-surface placeholder:text-cm-on-surface-variant/30 focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)] ${newClientErrors.phone ? 'border-red-400' : 'border-white/10'}`}
                />
                {newClientErrors.phone && <p className="text-[10px] text-red-400 mt-1 font-[family-name:var(--font-inter)]">{newClientErrors.phone}</p>}
              </div>

              <div>
                <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">
                  Correo Electronico (opcional)
                </label>
                <input
                  id="new-client-email"
                  type="email"
                  value={newClientForm.email}
                  onChange={(e) => { setNewClientForm(p => ({ ...p, email: e.target.value })); if (newClientErrors.email) setNewClientErrors(p => { const n = { ...p }; delete n.email; return n }) }}
                  placeholder="Ej: cliente@correo.com"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickCreateClient() } }}
                  className={`w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border rounded-xl text-sm text-cm-on-surface placeholder:text-cm-on-surface-variant/30 focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)] ${newClientErrors.email ? 'border-red-400' : 'border-white/10'}`}
                />
                {newClientErrors.email && <p className="text-[10px] text-red-400 mt-1 font-[family-name:var(--font-inter)]">{newClientErrors.email}</p>}
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2">
              <button type="button"
                onClick={() => { setShowNewClientDialog(false); setNewClientErrors({}) }}
                disabled={creatingClient}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-cm-on-surface-variant border border-white/15 bg-cm-surface-container-highest/40 hover:bg-cm-surface-container-highest/60 transition-colors font-[family-name:var(--font-inter)] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button type="button"
                onClick={handleQuickCreateClient}
                disabled={creatingClient}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-cm-on-primary bg-cm-primary hover:brightness-110 transition-all flex items-center justify-center gap-2 font-[family-name:var(--font-inter)] disabled:opacity-50"
              >
                {creatingClient ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Creando...</>
                ) : (
                  <><UserPlus className="h-4 w-4" /> Crear y Seleccionar</>
                )}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Advance Payment Modal ─── */}
        {showAdvanceModal && advanceTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !submittingAdvance && setShowAdvanceModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md glass-card rounded-2xl p-6 border-amber-400/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-amber-400 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>payments</span>
                  </div>
                  <div>
                    <h3 className="font-[family-name:var(--font-sora)] font-bold text-lg text-cm-on-surface">
                      {advanceTarget.remainingAmount > 0 && parseFloat(advanceAmount || '0') >= advanceTarget.remainingAmount ? 'Registrar el Total' : 'Registrar Adelanto'}
                    </h3>
                    <p className="text-cm-on-surface-variant text-[11px] font-[family-name:var(--font-inter)]">
                      {advanceTarget.remainingAmount > 0 && parseFloat(advanceAmount || '0') >= advanceTarget.remainingAmount ? 'Cancelar la totalidad de la deuda' : 'Agregar pago a reserva existente'}
                    </p>
                  </div>
                </div>
                {!submittingAdvance && (
                  <button type="button" onClick={() => setShowAdvanceModal(false)} className="p-1 rounded-full hover:bg-cm-surface-container-highest transition-colors">
                    <span className="material-symbols-outlined text-cm-on-surface-variant">close</span>
                  </button>
                )}
              </div>

              {/* Booking summary */}
              <div className="p-3 rounded-xl bg-cm-surface-container-highest/40 mb-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-cm-on-surface font-[family-name:var(--font-inter)]">
                  <span className="material-symbols-outlined text-[14px]">sports</span>
                  <span className="font-medium">{advanceTarget.courtIds && advanceTarget.courtIds.length > 1 ? (advanceTarget.courts?.map(c => c.name).join(', ') || `${advanceTarget.courtIds.length} canchas`) : (advanceTarget.court?.name || 'N/A')}</span>
                  <span className="text-cm-on-surface-variant">•</span>
                  <span>{fmtDate(advanceTarget.date)}</span>
                  <span className="text-cm-on-surface-variant">•</span>
                  <span>{formatTimeRange(advanceTarget.startTime, advanceTarget.endTime, use12hFormat)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                  <span className="material-symbols-outlined text-[14px]">person</span>
                  {advanceTarget.user?.name || 'Sin nombre'} {advanceTarget.user?.email ? `(${advanceTarget.user.email})` : ''}
                </div>
                <div className="flex justify-between text-xs font-[family-name:var(--font-inter)] pt-1 border-t border-white/5">
                  <span className="text-cm-on-surface-variant">Adelanto anterior</span>
                  <span className="text-cm-on-surface">{fmtCurrency(advanceTarget.advanceAmount)}</span>
                </div>
                <div className="flex justify-between text-xs font-[family-name:var(--font-inter)]">
                  <span className="text-cm-on-surface-variant">Restante</span>
                  <span className="text-orange-400 font-semibold">{fmtCurrency(advanceTarget.remainingAmount)}</span>
                </div>
                {(advanceTarget.courtSubtotal !== undefined && (advanceTarget.equipmentSubtotal ?? 0) > 0) && (
                  <>
                    <div className="flex justify-between text-[10px] font-[family-name:var(--font-inter)] pt-1 border-t border-white/5">
                      <span className="text-cm-on-surface-variant">Subtotal Cancha</span>
                      <span className="text-cm-on-surface">{fmtCurrency(advanceTarget.courtSubtotal || 0)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-[family-name:var(--font-inter)]">
                      <span className="text-cm-on-surface-variant">Subtotal Equipamiento</span>
                      <span className="text-blue-400">{fmtCurrency(advanceTarget.equipmentSubtotal || 0)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-[family-name:var(--font-inter)]">
                      <span className="text-cm-on-surface-variant">Detalle equipo</span>
                      <span className="text-cm-on-surface">{advanceTarget.equipmentItems?.map(e => `${e.name} x${e.quantity}`).join(', ')}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Monto del adelanto (S/) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    max={advanceTarget.remainingAmount > 0 ? advanceTarget.remainingAmount : advanceTarget.totalPrice}
                    className="w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                    placeholder="0.00"
                  />
                  {advanceTarget.remainingAmount > 0 && (
                    <button type="button"
                      onClick={() => setAdvanceAmount(String(advanceTarget.remainingAmount))}
                      className="text-[10px] text-amber-400 font-semibold mt-1 hover:underline font-[family-name:var(--font-inter)]"
                    >
                      Completar saldo: {fmtCurrency(advanceTarget.remainingAmount)}
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Método de pago</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'EFECTIVO', label: 'Efectivo', icon: 'payments' },
                      { key: 'YAPE', label: 'Yape', icon: 'account_balance_wallet' },
                      { key: 'PLIN', label: 'Plin', icon: 'account_balance_wallet' },
                    ].map((pm) => (
                      <button
                        type="button"
                        key={pm.key}
                        onClick={() => setAdvanceMethod(pm.key)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-[11px] font-medium transition-all ${
                          advanceMethod === pm.key
                            ? 'bg-amber-500/10 border-amber-400/40 text-amber-400'
                            : 'bg-cm-surface-container-highest/30 border-transparent text-cm-on-surface-variant hover:border-white/10'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">{pm.icon}</span>
                        {pm.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button type="button"
                onClick={handleSubmitAdvance}
                disabled={submittingAdvance || !advanceAmount || parseFloat(advanceAmount) <= 0}
                className={`w-full mt-5 py-3 text-white rounded-xl font-semibold font-[family-name:var(--font-sora)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                  advanceTarget.remainingAmount > 0 && parseFloat(advanceAmount || '0') >= advanceTarget.remainingAmount ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {submittingAdvance ? (
                  <><span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Registrando...</>
                ) : advanceTarget.remainingAmount > 0 && parseFloat(advanceAmount || '0') >= advanceTarget.remainingAmount ? (
                  <><span className="material-symbols-outlined text-[20px]">check_circle</span> Registrar el Total — {advanceAmount ? fmtCurrency(parseFloat(advanceAmount)) : 'S/ 0.00'}</>
                ) : (
                  <><span className="material-symbols-outlined text-[20px]">check_circle</span> Registrar Adelanto — {advanceAmount ? fmtCurrency(parseFloat(advanceAmount)) : 'S/ 0.00'}</>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Extend Time Modal ─── */}
      <AnimatePresence>
        {showExtendModal && extendTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !submittingExtend && setShowExtendModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md glass-card border border-white/10 rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-400 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>schedule</span>
                  </div>
                  <div>
                    <h3 className="font-[family-name:var(--font-sora)] font-bold text-lg text-cm-on-surface">Extender Tiempo</h3>
                    <p className="text-cm-on-surface-variant text-[11px] font-[family-name:var(--font-inter)]">Agregar tiempo extra a la reserva</p>
                  </div>
                </div>
                {!submittingExtend && (
                  <button type="button" onClick={() => setShowExtendModal(false)} className="p-1 rounded-full hover:bg-cm-surface-container-highest transition-colors">
                    <span className="material-symbols-outlined text-cm-on-surface-variant">close</span>
                  </button>
                )}
              </div>

              <div className="p-4 space-y-4">
                {/* Booking summary */}
                <div className="p-3 rounded-xl bg-cm-surface-container-highest/40 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-cm-on-surface font-[family-name:var(--font-inter)]">
                    <span className="material-symbols-outlined text-[14px]">sports</span>
                    <span className="font-medium">{extendTarget.courtIds && extendTarget.courtIds.length > 1 ? (extendTarget.courts?.map(c => c.name).join(', ') || `${extendTarget.courtIds.length} canchas`) : (extendTarget.court?.name || 'N/A')}</span>
                    <span className="text-cm-on-surface-variant">•</span>
                    <span>{fmtDate(extendTarget.date)}</span>
                    <span className="text-cm-on-surface-variant">•</span>
                    <span>{formatTimeRange(extendTarget.startTime, extendTarget.endTime, use12hFormat)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                    <span className="material-symbols-outlined text-[14px]">person</span>
                    {extendTarget.user?.name || 'Sin nombre'}
                  </div>
                  <div className="flex justify-between text-xs font-[family-name:var(--font-inter)] pt-1 border-t border-white/5">
                    <span className="text-cm-on-surface-variant">Total actual</span>
                    <span className="text-cm-on-surface">{fmtCurrency(extendTarget.totalPrice)}</span>
                  </div>
                </div>

                {/* New end time selector */}
                <div>
                  <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1.5 block">
                    Nueva hora de fin
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {extendTimeSlots.map((slot) => {
                      const fmt = use12hFormat ? formatTime12(slot) : formatTime24(slot)
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => handleExtendEndChange(slot)}
                          disabled={submittingExtend}
                          className={`py-2 px-1 rounded-lg text-xs font-medium font-[family-name:var(--font-inter)] transition-all ${
                            extendNewEnd === slot
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                              : 'bg-cm-surface-container-highest/40 text-cm-on-surface border border-white/10 hover:border-white/20'
                          }`}
                        >
                          {fmt}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Extra cost info */}
                {extendExtraCost > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-400 text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>add_circle</span>
                      <span className="text-xs font-semibold text-emerald-400 font-[family-name:var(--font-sora)]">
                        Costo adicional: {fmtCurrency(extendExtraCost)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] font-[family-name:var(--font-inter)]">
                      <span className="text-cm-on-surface-variant">Nuevo total</span>
                      <span className="text-cm-on-surface font-semibold">{fmtCurrency(Math.round((extendTarget.totalPrice + extendExtraCost) * 100) / 100)}</span>
                    </div>
                  </div>
                )}

                {/* Payment method and amount */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1.5 block">
                      Metodo de pago del extra
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['EFECTIVO', 'YAPE', 'PLIN'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setExtendMethod(m)}
                          disabled={submittingExtend}
                          className={`py-2 rounded-lg text-xs font-semibold font-[family-name:var(--font-inter)] transition-all ${
                            extendMethod === m
                              ? 'bg-cm-primary/20 text-cm-primary border border-cm-primary/40'
                              : 'bg-cm-surface-container-highest/40 text-cm-on-surface-variant border border-white/10 hover:border-white/20'
                          }`}
                        >
                          {m === 'YAPE' ? '📱 ' : m === 'PLIN' ? '💜 ' : '💵 '}{m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1.5 block">
                      Monto a cobrar ahora
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cm-on-surface-variant text-sm">S/</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={extendExtraCost}
                        value={extendPaidNow}
                        onChange={(e) => {
                          const v = Math.min(parseFloat(e.target.value) || 0, extendExtraCost)
                          setExtendPaidNow(String(Math.max(0, Math.round(v * 100) / 100)))
                        }}
                        disabled={submittingExtend}
                        className="w-full pl-8 pr-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-[10px] text-cm-on-surface-variant mt-1 font-[family-name:var(--font-inter)]">
                      Si cobra menos ahora, el resto se agrega al saldo pendiente
                    </p>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="button"
                  onClick={handleSubmitExtend}
                  disabled={submittingExtend || extendExtraCost <= 0 || !extendNewEnd}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 font-[family-name:var(--font-sora)]"
                >
                  {submittingExtend ? (
                    <><span className="animate-spin"><Loader2 size={18} /></span> Procesando...</>
                  ) : (
                    <><span className="material-symbols-outlined text-[18px]">schedule</span> Extender y Cobrar</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Edit Booking Modal (super_admin only) ─── */}
      <AnimatePresence>
        {showEditModal && editTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
            onClick={() => !submittingEdit && setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-lg glass-card border border-purple-500/20 rounded-2xl overflow-hidden my-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5 bg-purple-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-400 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>edit</span>
                  </div>
                  <div>
                    <h3 className="font-[family-name:var(--font-sora)] font-bold text-base text-cm-on-surface">Editar Reserva</h3>
                    <p className="text-cm-on-surface-variant text-[10px] font-[family-name:var(--font-inter)]">Super Admin — Modifica cualquier campo</p>
                  </div>
                </div>
                {!submittingEdit && (
                  <button type="button" onClick={() => setShowEditModal(false)} className="p-1 rounded-full hover:bg-cm-surface-container-highest transition-colors">
                    <span className="material-symbols-outlined text-cm-on-surface-variant">close</span>
                  </button>
                )}
              </div>

              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* ── Fecha y Hora ── */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-purple-400 text-[14px]">event</span>
                    <span className="text-xs font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">Fecha y Hora</span>
                  </div>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => handleEditFormChange('date', e.target.value)}
                    disabled={submittingEdit}
                    className="w-full px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-purple-500/40 font-[family-name:var(--font-inter)] mb-2"
                  />
                  {/* TimeSlotPicker for edit modal */}
                  <TimeSlotPicker
                    startTime={editForm.startTime}
                    endTime={editForm.endTime}
                    onChange={(s, e) => {
                      handleEditFormChange('startTime', s)
                      handleEditFormChange('endTime', e)
                    }}
                    occupied={editOccupiedSlots}
                    use12hFormat={use12hFormat}
                    theme="purple"
                    disabled={submittingEdit}
                  />
                </div>

                {/* ── Cancha ── */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-purple-400 text-[14px]">sports</span>
                    <span className="text-xs font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">Cancha</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {bookingCourtDetails.map(c => {
                      const sel = editForm.courtIds.includes(c.id)
                      return (
                        <button key={c.id} type="button" onClick={() => toggleEditCourt(c.id)} disabled={submittingEdit}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${sel ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-cm-surface-container-highest/40 text-cm-on-surface border border-white/10 hover:border-white/20'}`}
                        >
                          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${sel ? 'border-purple-400 bg-purple-400' : 'border-white/20'}`}>
                            {sel && <span className="material-symbols-outlined text-[10px] text-white">check</span>}
                          </span>
                          <span className="material-symbols-outlined text-[14px]">{sportIcons[c.sport] || 'sports'}</span>
                          <span className="font-medium font-[family-name:var(--font-sora)]">{c.name}</span>
                          <span className="text-cm-on-surface-variant ml-auto">S/ {c.pricePerHour.toFixed(2)}/h</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* ── Cliente ── */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-purple-400 text-[14px]">person</span>
                    <span className="text-xs font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">Cliente</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por nombre, email o telefono..."
                    value={editClientSearch}
                    onChange={(e) => setEditClientSearch(e.target.value)}
                    disabled={submittingEdit}
                    className="w-full px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-xs text-cm-on-surface focus:outline-none focus:border-purple-500/40 font-[family-name:var(--font-inter)] mb-1.5"
                  />
                  <div className="max-h-28 overflow-y-auto space-y-0.5">
                    {filteredEditUsers.slice(0, 20).map(u => {
                      const sel = editForm.userId === u.id
                      return (
                        <button key={u.id} type="button" onClick={() => { handleEditFormChange('userId', u.id); setEditClientSearch('') }} disabled={submittingEdit}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] transition-all ${sel ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'hover:bg-cm-surface-container-highest/60 text-cm-on-surface'}`}
                        >
                          <span className="font-medium font-[family-name:var(--font-sora)]">{u.name}</span>
                          <span className="text-cm-on-surface-variant">{u.email}</span>
                          {u.phone && <span className="text-cm-on-surface-variant ml-auto">{u.phone}</span>}
                        </button>
                      )
                    })}
                    {filteredEditUsers.length === 0 && <p className="text-[10px] text-cm-on-surface-variant px-3 py-2">Sin resultados</p>}
                  </div>
                </div>

                {/* ── Equipamiento ── */}
                <div>
                  <button type="button" onClick={() => setEditEquipOpen(!editEquipOpen)} className="flex items-center gap-2 mb-2 w-full text-left">
                    <span className="material-symbols-outlined text-purple-400 text-[14px]">sports_tennis</span>
                    <span className="text-xs font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">Equipamiento</span>
                    {editEquipItems.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[9px] font-bold">{editEquipItems.length}</span>
                    )}
                    <span className="material-symbols-outlined text-cm-on-surface-variant text-[14px] ml-auto transition-transform" style={{ transform: editEquipOpen ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                  </button>
                  {editEquipOpen && (
                    <div className="space-y-2">
                      {editEquipItems.length > 0 && (
                        <div className="space-y-1">
                          {editEquipItems.map(eq => {
                            const eqData = equipmentList.find(e => e.id === eq.equipmentId)
                            return (
                              <div key={eq.equipmentId} className="flex items-center gap-2 px-2 py-1.5 bg-cm-surface-container-highest/40 rounded-lg">
                                <span className="text-[11px] text-cm-on-surface font-medium flex-1 font-[family-name:var(--font-sora)]">{eq.name}</span>
                                <div className="flex items-center gap-1">
                                  <button type="button" onClick={() => updateEditEquipQty(eq.equipmentId, eq.quantity - 1, eqData?.stock || 99)} disabled={submittingEdit || eq.quantity <= 1} className="w-6 h-6 rounded bg-white/10 text-cm-on-surface text-xs flex items-center justify-center hover:bg-white/20">-</button>
                                  <span className="text-[11px] text-cm-on-surface w-6 text-center font-mono">{eq.quantity}</span>
                                  <button type="button" onClick={() => updateEditEquipQty(eq.equipmentId, eq.quantity + 1, eqData?.stock || 99)} disabled={submittingEdit} className="w-6 h-6 rounded bg-white/10 text-cm-on-surface text-xs flex items-center justify-center hover:bg-white/20">+</button>
                                </div>
                                <span className="text-[10px] text-cm-on-surface-variant">{fmtCurrency(eq.subtotal)}</span>
                                <button type="button" onClick={() => removeEditEquip(eq.equipmentId)} disabled={submittingEdit} className="p-0.5 rounded text-red-400 hover:bg-red-400/10">
                                  <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      <div className="max-h-24 overflow-y-auto space-y-0.5">
                        {equipmentList.filter(e => e.active && e.stock > 0 && !editEquipItems.find(ie => ie.equipmentId === e.id)).map(eq => (
                          <button key={eq.id} type="button" onClick={() => addEditEquip(eq)} disabled={submittingEdit}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] hover:bg-cm-surface-container-highest/60 text-cm-on-surface transition-colors"
                          >
                            <span className="material-symbols-outlined text-[12px] text-cm-on-surface-variant">add</span>
                            <span className="font-medium">{eq.name}</span>
                            <span className="text-cm-on-surface-variant ml-auto">S/ {eq.pricePerRental.toFixed(2)} (stock: {eq.stock})</span>
                          </button>
                        ))}
                        {equipmentList.filter(e => e.active && e.stock > 0 && !editEquipItems.find(ie => ie.equipmentId === e.id)).length === 0 && (
                          <p className="text-[10px] text-cm-on-surface-variant px-2">Todo el equipamiento disponible ya fue agregado</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Pagos ── */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-purple-400 text-[14px]">payments</span>
                    <span className="text-xs font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">Pagos</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-[10px] text-cm-on-surface-variant font-semibold mb-1 block">Total (S/)</label>
                      <input type="number" step="0.01" min="0" value={editForm.totalPrice} onChange={(e) => handleEditFormChange('totalPrice', e.target.value)} disabled={submittingEdit}
                        className="w-full px-2 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-xs text-cm-on-surface focus:outline-none focus:border-purple-500/40 font-[family-name:var(--font-inter)]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-cm-on-surface-variant font-semibold mb-1 block">Adelanto (S/)</label>
                      <input type="number" step="0.01" min="0" value={editForm.advanceAmount} onChange={(e) => handleEditFormChange('advanceAmount', e.target.value)} disabled={submittingEdit}
                        className="w-full px-2 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-xs text-cm-on-surface focus:outline-none focus:border-purple-500/40 font-[family-name:var(--font-inter)]"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-cm-on-surface-variant mb-2 px-1">
                    <span>Restante: <span className={`font-semibold ${Math.max(0, (parseFloat(editForm.totalPrice) || 0) - (parseFloat(editForm.advanceAmount) || 0)) > 0 ? 'text-orange-400' : 'text-green-400'}`}>{fmtCurrency(Math.max(0, (parseFloat(editForm.totalPrice) || 0) - (parseFloat(editForm.advanceAmount) || 0)))}</span></span>
                    <span>Equip: {fmtCurrency(editEquipItems.reduce((s, i) => s + i.subtotal, 0))}</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-cm-on-surface-variant font-semibold mb-1 block">Metodo de pago</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['EFECTIVO', 'YAPE', 'PLIN'].map(m => (
                        <button key={m} type="button" onClick={() => handleEditFormChange('paymentMethod', m)} disabled={submittingEdit}
                          className={`py-1.5 rounded-lg text-[10px] font-semibold transition-all ${editForm.paymentMethod === m ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'bg-cm-surface-container-highest/40 text-cm-on-surface-variant border border-white/10 hover:border-white/20'}`}
                        >{m === 'YAPE' ? '📱 ' : m === 'PLIN' ? '💜 ' : '💵 '}{m}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Estado ── */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-purple-400 text-[14px]">toggle_on</span>
                    <span className="text-xs font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">Estado</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'reserved', label: 'Reservado', icon: 'calendar_month', color: 'text-blue-400' },
                      { value: 'completed', label: 'Completado', icon: 'check_circle', color: 'text-green-400' },
                      { value: 'cancelled', label: 'Cancelado', icon: 'cancel', color: 'text-red-400' },
                    ].map(s => {
                      // Bug fix #2: Cannot reactivate cancelled bookings
                      const originalStatus = editTarget?.status || ''
                      const isDisabled = (originalStatus === 'cancelled' && s.value !== 'cancelled')
                        // Bug fix #3: Cannot cancel completed bookings
                        || (originalStatus === 'completed' && s.value === 'cancelled')
                        || submittingEdit
                      return (
                        <button key={s.value} type="button" onClick={() => !isDisabled && handleEditFormChange('status', s.value)} disabled={isDisabled}
                          className={`py-2 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center gap-1 ${editForm.status === s.value ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : isDisabled ? 'bg-cm-surface-container-highest/20 text-cm-on-surface-variant/30 border border-white/5 cursor-not-allowed' : 'bg-cm-surface-container-highest/40 text-cm-on-surface-variant border border-white/10 hover:border-white/20'}`}
                        >
                          <span className="material-symbols-outlined text-[12px]">{s.icon}</span>
                          {s.label}
                        </button>
                      )
                    })}
                  </div>
                  {editTarget?.status === 'cancelled' && (
                    <p className="text-[10px] text-amber-400/70 mt-1.5 font-[family-name:var(--font-inter)]">Reserva cancelada: no se puede reactivar.</p>
                  )}
                  {editTarget?.status === 'completed' && (
                    <p className="text-[10px] text-amber-400/70 mt-1.5 font-[family-name:var(--font-inter)]">Reserva completada: no se puede cancelar.</p>
                  )}
                </div>

                {/* ── Notas ── */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-purple-400 text-[14px]">notes</span>
                    <span className="text-xs font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">Notas</span>
                  </div>
                  <textarea value={editForm.notes} onChange={(e) => handleEditFormChange('notes', e.target.value)} disabled={submittingEdit} rows={2} placeholder="Notas opcionales..."
                    className="w-full px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-xs text-cm-on-surface focus:outline-none focus:border-purple-500/40 font-[family-name:var(--font-inter)] resize-none"
                  />
                </div>

                {/* Submit */}
                <button type="button" onClick={handleSubmitEdit} disabled={submittingEdit}
                  className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 font-[family-name:var(--font-sora)]"
                >
                  {submittingEdit ? (<><span className="animate-spin"><Loader2 size={18} /></span> Guardando...</>) : (<><span className="material-symbols-outlined text-[18px]">save</span> Guardar Cambios</>)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Equipment Detail Modal (delivered/returned) ─── */}
      <AnimatePresence>
        {showEquipDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEquipDetail(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm glass-card rounded-2xl p-6 border-blue-400/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-400 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>sports_tennis</span>
                  </div>
                  <h3 className="font-[family-name:var(--font-sora)] font-bold text-lg text-cm-on-surface">Equipamiento</h3>
                </div>
                <button type="button" onClick={() => setShowEquipDetail(null)} className="p-1 rounded-full hover:bg-cm-surface-container-highest transition-colors">
                  <span className="material-symbols-outlined text-cm-on-surface-variant">close</span>
                </button>
              </div>

              <div className="space-y-2 mb-4">
                {showEquipDetail.equipmentItems?.map((eq, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-cm-surface-container-highest/30">
                    <div>
                      <p className="text-xs font-medium text-cm-on-surface font-[family-name:var(--font-sora)]">{eq.name}</p>
                      <p className="text-[10px] text-cm-on-surface-variant">Cantidad: {eq.quantity} · {fmtCurrency(eq.unitPrice)}/u</p>
                    </div>
                    <span className="text-sm font-bold text-blue-400">{fmtCurrency(eq.subtotal)}</span>
                  </div>
                ))}
                {(showEquipDetail.courtSubtotal !== undefined) && (
                  <div className="pt-2 border-t border-white/5 space-y-1">
                    <div className="flex justify-between text-[11px]"><span className="text-cm-on-surface-variant">Subtotal Cancha</span><span>{fmtCurrency(Math.max(0, (showEquipDetail.totalPrice || 0) - (showEquipDetail.equipmentSubtotal || 0)))}</span></div>
                    <div className="flex justify-between text-[11px]"><span className="text-cm-on-surface-variant">Subtotal Equip.</span><span className="text-blue-400">{fmtCurrency(showEquipDetail.equipmentSubtotal || 0)}</span></div>
                    <div className="flex justify-between text-xs font-bold pt-1 border-t border-white/5"><span>Total</span><span className="text-cm-primary">{fmtCurrency(showEquipDetail.totalPrice)}</span></div>
                  </div>
                )}
              </div>

              {/* Delivery / Return toggles */}
              <div className="space-y-3 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-amber-400">inventory_2</span>
                    <span className="text-sm text-cm-on-surface font-medium font-[family-name:var(--font-sora)]">Entregado</span>
                  </div>
                  <button type="button"
                    onClick={() => handleToggleEquipment(showEquipDetail.id, 'equipmentDelivered', !showEquipDetail.equipmentDelivered)}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${showEquipDetail.equipmentDelivered ? 'bg-amber-500 justify-end' : 'bg-cm-surface-container-highest justify-start'}`}
                  >
                    <div className={`w-5 h-5 rounded-full transition-all shadow ${showEquipDetail.equipmentDelivered ? 'bg-white' : 'bg-cm-on-surface-variant/60'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-green-400">done_all</span>
                    <span className="text-sm text-cm-on-surface font-medium font-[family-name:var(--font-sora)]">Devuelto</span>
                  </div>
                  <button type="button"
                    onClick={() => handleToggleEquipment(showEquipDetail.id, 'equipmentReturned', !showEquipDetail.equipmentReturned)}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${showEquipDetail.equipmentReturned ? 'bg-green-500 justify-end' : 'bg-cm-surface-container-highest justify-start'}`}
                  >
                    <div className={`w-5 h-5 rounded-full transition-all shadow ${showEquipDetail.equipmentReturned ? 'bg-white' : 'bg-cm-on-surface-variant/60'}`} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Cancel Booking Dialog (advance handling) ─── */}
      <Dialog open={showCancelDialog} onOpenChange={(open) => { if (!open) setShowCancelDialog(false) }}>
        <DialogContent className="z-[70] bg-[#1a1a2e] border border-white/10 text-white max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>warning</span>
              Cancelar Reserva con Adelanto
            </DialogTitle>
            <DialogDescription className="text-cm-on-surface-variant">
              Esta reserva tiene un adelanto pagado de <span className="font-bold text-orange-400">{cancelTarget ? fmtCurrency(cancelTarget.advanceAmount) : ''}</span>. Indica que se hizo con ese dinero.
            </DialogDescription>
          </DialogHeader>

          {cancelTarget && (
            <div className="space-y-4 mt-2">
              {/* Booking summary */}
              <div className="p-3 rounded-lg bg-cm-surface-container-highest/40 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-cm-on-surface-variant">Cliente</span>
                  <span className="text-cm-on-surface font-medium">{cancelTarget.user?.name || 'Sin nombre'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-cm-on-surface-variant">Cancha</span>
                  <span className="text-cm-on-surface font-medium">{cancelTarget.court?.name || '-'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-cm-on-surface-variant">Fecha</span>
                  <span className="text-cm-on-surface font-medium">{cancelTarget.date}</span>
                </div>
                <div className="border-t border-white/5 pt-1.5 flex justify-between text-xs">
                  <span className="text-cm-on-surface-variant">Adelanto pagado</span>
                  <span className="text-orange-400 font-bold">{fmtCurrency(cancelTarget.advanceAmount)}</span>
                </div>
              </div>

              {/* Action selection */}
              <div>
                <label className="text-xs text-cm-on-surface-variant font-medium mb-2 block">Que se hizo con el adelanto?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCancelAdvanceAction('retain')}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      cancelAdvanceAction === 'retain'
                        ? 'border-orange-400 bg-orange-400/10'
                        : 'border-white/10 bg-cm-surface-container-highest/20 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-[18px] text-orange-400" style={{ fontVariationSettings: '"FILL" 1' }}>lock</span>
                      <span className="text-sm font-semibold text-cm-on-surface">Retener</span>
                    </div>
                    <p className="text-[10px] text-cm-on-surface-variant">El dinero se queda en caja como compensacion</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelAdvanceAction('refund')}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      cancelAdvanceAction === 'refund'
                        ? 'border-purple-400 bg-purple-400/10'
                        : 'border-white/10 bg-cm-surface-container-highest/20 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-[18px] text-purple-400" style={{ fontVariationSettings: '"FILL" 1' }}>currency_exchange</span>
                      <span className="text-sm font-semibold text-cm-on-surface">Devolver</span>
                    </div>
                    <p className="text-[10px] text-cm-on-surface-variant">Se devolvio el dinero al cliente</p>
                  </button>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="text-xs text-cm-on-surface-variant font-medium mb-1.5 block">Motivo de cancelacion (opcional)</label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ej: El cliente no se presento..."
                  className="w-full bg-cm-surface-container-highest/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-cm-on-surface placeholder:text-cm-on-surface-variant/50 focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 mt-2">
            <button
              type="button"
              onClick={() => setShowCancelDialog(false)}
              disabled={cancellingBooking}
              className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-cm-on-surface-variant hover:bg-white/5 transition-colors font-[family-name:var(--font-inter)]"
            >
              No cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmCancel}
              disabled={cancellingBooking}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2 font-[family-name:var(--font-inter)]"
            >
              {cancellingBooking && <Loader2 className="h-4 w-4 animate-spin" />}
              {cancellingBooking ? 'Cancelando...' : 'Confirmar Cancelacion'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Series Management Modal ─── */}
      <AnimatePresence>
        {showSeriesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !cancellingSeries && setShowSeriesModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-2xl glass-card rounded-2xl p-6 border-cm-primary/20 overflow-hidden flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-cm-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-cm-primary text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>repeat</span>
                  </div>
                  <div>
                    <h3 className="font-[family-name:var(--font-sora)] font-bold text-lg text-cm-on-surface">Serie Recurrente</h3>
                    <p className="text-cm-on-surface-variant text-[11px] font-[family-name:var(--font-inter)]">{seriesBookings.length} reservas en la serie</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {seriesBookings.some((b) => b.status !== 'cancelled') && (
                    <button type="button"
                      onClick={() => handleCancelSeries(seriesGroupId)}
                      disabled={cancellingSeries}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[14px]">cancel</span>
                      {cancellingSeries ? 'Cancelando...' : 'Cancelar toda la serie'}
                    </button>
                  )}
                  {!cancellingSeries && (
                    <button type="button" onClick={() => setShowSeriesModal(false)} className="p-1 rounded-full hover:bg-cm-surface-container-highest transition-colors">
                      <span className="material-symbols-outlined text-cm-on-surface-variant">close</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-auto flex-1">
                <SeriesBookingsTable bookings={seriesBookings} onCancelSingle={handleCancelSingleFromSeries} use12hFormat={use12hFormat} />
              </div>

              {/* Summary */}
              <div className="mt-4 pt-3 border-t border-white/5 flex-shrink-0">
                <div className="flex items-center justify-between text-xs font-[family-name:var(--font-inter)]">
                  <span className="text-cm-on-surface-variant">
                    {seriesBookings.filter((b) => b.status !== 'cancelled').length} activas · {seriesBookings.filter((b) => b.status === 'cancelled').length} canceladas
                  </span>
                  <span className="text-cm-primary font-bold font-[family-name:var(--font-sora)]">
                    Total: {fmtCurrency(seriesBookings.filter((b) => b.status !== 'cancelled').reduce((s, b) => s + b.totalPrice, 0))}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Schedule Modal ─── */}
      <AnimatePresence>
        {showSchedule && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSchedule(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-4xl max-h-[85vh] glass-card rounded-2xl p-6 border-cm-primary/20 overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h3 className="font-[family-name:var(--font-sora)] font-bold text-lg text-cm-on-surface">Horarios del Día</h3>
                <button type="button" onClick={() => setShowSchedule(false)} className="p-1 rounded-full hover:bg-cm-surface-container-highest transition-colors">
                  <span className="material-symbols-outlined text-cm-on-surface-variant">close</span>
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                />
                <span className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                  {scheduleBookings.length} reserva{scheduleBookings.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="overflow-auto flex-1">
                {scheduleCourts.length === 0 ? (
                  <p className="text-center py-8 text-cm-on-surface-variant font-[family-name:var(--font-inter)]">No hay canchas disponibles</p>
                ) : (
                  <div className="space-y-4 min-w-[640px]">
                    {scheduleCourts.map((court) => (
                      <div key={court.id}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-outlined text-cm-primary text-[16px]">{sportIcons[court.bookings[0]?.court?.sport] || 'sports'}</span>
                          <span className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">{court.name}</span>
                        </div>
                        <div className="flex gap-1">
                          {timeSlots.map((ts) => {
                            // Match any booking whose time range covers this slot (not just exact start)
                            const booking = court.bookings.find((b) => ts.value >= b.startTime && ts.value < b.endTime)
                            const isStart = booking?.startTime === ts.value
                            return (
                              <div
                                key={ts.value}
                                className={`flex-1 h-10 rounded-md flex items-center justify-center text-[10px] font-medium transition-all ${
                                  booking
                                    ? isStart
                                      ? 'bg-cm-primary/20 text-cm-primary border border-cm-primary/30 rounded-l-lg'
                                      : 'bg-cm-primary/10 text-cm-primary/70 border border-cm-primary/15 border-l-0'
                                    : ts.disabled
                                    ? 'bg-cm-surface-container-highest/15 text-cm-on-surface-variant/15 border border-transparent'
                                    : 'bg-cm-surface-container-highest/30 text-cm-on-surface-variant/30 border border-transparent'
                                }`}
                                title={booking ? `${booking.user?.name || 'Cliente'} (${formatTimeRange(booking.startTime, booking.endTime, use12hFormat)})` : ts.label || 'Disponible'}
                              >
                                {booking && isStart ? (
                                  <span className="truncate px-1">{(booking.user?.name || 'Cliente').split(' ')[0]}</span>
                                ) : booking && !isStart ? (
                                  <span className="opacity-60">▎</span>
                                ) : (
                                  <span className="opacity-0 sm:opacity-100">{ts.value.slice(0, 2)}</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* KPI Cards — compact, bottom */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-6">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              className="glass-card rounded-lg px-3 py-2 flex items-center gap-2.5"
            >
              <div className={`w-8 h-8 rounded-md ${kpi.bg} flex items-center justify-center flex-shrink-0`}>
                <span className={`material-symbols-outlined ${kpi.color} text-[16px]`} style={{ fontVariationSettings: '"FILL" 1' }}>
                  {kpi.icon}
                </span>
              </div>
              <div className="min-w-0">
                <p className={`font-[family-name:var(--font-sora)] text-sm lg:text-base font-bold ${kpi.color} leading-tight`}>
                  {kpi.value}
                </p>
                <p className="text-cm-on-surface-variant text-[10px] font-[family-name:var(--font-inter)] truncate">
                  {kpi.label}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
    </div>
  )
}
// build-v1781316090
