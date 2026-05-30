'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/hooks/use-toast'
import { useSiteSettings, type CustomSection, type ActivePromotion, type HeroBanner } from '@/context/SiteSettingsContext'
import { getAuthHeaders } from '@/lib/auth-helpers'
import { EditModal, FormField, ArrayField } from '@/components/home/SectionEditor'
import UsersTab from '@/components/admin/UsersTab'
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

/* ═══════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════ */
interface PricingScheduleItem {
  label: string;
  startHour: number;
  endHour: number;
  pricePerHour: number;
}

interface Booking {
  id: string
  courtId: string
  userId: string
  date: string
  startTime: string
  endTime: string
  totalPrice: number
  advanceAmount: number
  remainingAmount: number
  status: string
  paymentMethod: string | null
  createdAt?: unknown
  recurringGroupId?: string
  recurringIndex?: number
  court: { id: string; name: string; sport: string; branch?: { name: string } } | null
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

type AdminTab = 'reservas' | 'finanzas' | 'gastos' | 'usuarios' | 'contenido'

/* ═══════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════ */
const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  reserved:         { label: 'Pendiente de Pago', color: 'bg-gray-500/20 text-gray-400',    dot: 'bg-gray-400' },
  partial_payment:  { label: 'Pago Parcial',       color: 'bg-orange-500/20 text-orange-400',  dot: 'bg-orange-400' },
  confirmed:        { label: 'Pagado',             color: 'bg-emerald-500/20 text-emerald-400',dot: 'bg-emerald-400' },
  completed:         { label: 'Completo',           color: 'bg-green-500/20 text-green-400',    dot: 'bg-green-400' },
  cancelled:         { label: 'Cancelado',          color: 'bg-red-500/20 text-red-400',        dot: 'bg-red-400' },
}

const sportIcons: Record<string, string> = {
  futbol: 'sports_soccer', voley: 'sports_volleyball', basket: 'sports_basketball',
  tenis: 'sports_tennis', eventos: 'celebration',
}

const paymentMethodLabels: Record<string, string> = {
  yape: 'Yape', plin: 'Plin', culqi: 'Culqi', card: 'Tarjeta',
  cash: 'Efectivo', transfer: 'Transferencia', efectivo: 'Efectivo', transferencia: 'Transferencia',
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
  { key: 'usuarios',  label: 'Usuarios',  icon: 'group' },
  { key: 'contenido', label: 'Contenido', icon: 'edit_note' },
]

/* ─── helpers ─── */
const fmtCurrency = (n: number) => `S/ ${n.toFixed(2)}`
const fmtDate = (d: string) => {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}
const fmtDateFull = (d: string) => {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}
const todayStr = () => new Date().toISOString().split('T')[0]

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
  const [activeSubTab, setActiveSubTab] = useState<'secciones' | 'promociones' | 'banners'>('secciones')
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
    todaysSchedule: { label: 'Agenda de Hoy', icon: 'calendar_month', color: 'bg-amber-500', isCustom: false },
    promoBanner: { label: 'Promociones', icon: 'workspace_premium', color: 'bg-purple-500', isCustom: false },
    howItWorks: { label: 'Cómo Funciona', icon: 'auto_awesome', color: 'bg-sky-500', isCustom: false },
  }

  const sectionOrder = settings?.sectionOrder || ['hero', 'sportsSection', 'featuredCourts', 'todaysSchedule', 'promoBanner', 'howItWorks']
  const visibility = settings?.sectionVisibility || { hero: true, sportsSection: true, featuredCourts: true, todaysSchedule: true, promoBanner: true, howItWorks: true }
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

  /* ─── Image upload ─── */
  const handleUploadImage = async (file: File, targetPath: string) => {
    setUploading(targetPath)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'site-images')
      const headers = getAuthHeaders()
      const res = await fetch('/api/upload', { method: 'POST', headers, body: formData })
      if (res.ok) {
        const data = await res.json()
        updateField(targetPath, data.url)
        toast({ title: 'Imagen subida' })
      } else {
        toast({ title: 'Error al subir', description: 'No se pudo subir la imagen', variant: 'destructive' })
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

  /* ─── Reusable Image Uploader ─── */
  const ImageUploader = ({ label, path, currentUrl, onUpload }: { label: string; path: string; currentUrl?: string; onUpload?: (url: string) => void }) => (
    <div>
      <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1.5 block">{label}</label>
      <div className="space-y-2">
        {currentUrl && (
          <div className="relative group rounded-xl overflow-hidden border border-white/10">
            <img src={currentUrl} alt={label} className="w-full h-32 object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button type="button" onClick={() => { updateField(path, ''); onUpload?.('') }} className="p-1.5 rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-colors">
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          </div>
        )}
        <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
          uploading === path ? 'border-cm-primary/50 bg-cm-primary/5 text-cm-primary' : 'border-white/10 text-cm-on-surface-variant hover:border-cm-primary/30 hover:text-cm-primary'
        }`}>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUploadImage(file, path)
            e.target.value = ''
          }} />
          {uploading === path ? (<><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span><span className="text-xs font-medium">Subiendo...</span></>)
            : (<><span className="material-symbols-outlined text-[18px]">cloud_upload</span><span className="text-xs font-medium">{currentUrl ? 'Cambiar imagen' : 'Subir imagen'}</span></>)}
        </label>
      </div>
    </div>
  )

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
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cm-primary/10 text-cm-primary border border-cm-primary/20 text-xs font-bold hover:bg-cm-primary/20 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            Vista Previa
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-2 mb-6">
          {([
            { key: 'secciones' as const, label: 'Secciones', icon: 'dashboard' },
            { key: 'promociones' as const, label: 'Promociones', icon: 'local_offer' },
            { key: 'banners' as const, label: 'Banners Hero', icon: 'view_carousel' },
          ]).map((tab) => (
            <button
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
            </button>
          ))}
        </div>

        {/* ═══════ SECCIONES TAB ═══════ */}
        {activeSubTab === 'secciones' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-[family-name:var(--font-sora)] font-semibold text-sm text-cm-on-surface">Orden de secciones</h3>
              <button
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
              <button onClick={addPromotion} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cm-primary/10 text-cm-primary text-xs font-bold hover:bg-cm-primary/20 transition-all">
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
                      <button onClick={() => togglePromoActive(promo.id)} className={`p-1.5 rounded-lg transition-colors ${promo.active ? 'text-cm-primary hover:bg-cm-primary/10' : 'text-cm-on-surface-variant/40'}`}>
                        <span className="material-symbols-outlined text-[16px]">{promo.active ? 'toggle_on' : 'toggle_off'}</span>
                      </button>
                      <button onClick={() => { setEditingPromo(promo); setPromoForm({ ...promo }) }} className="p-1.5 rounded-lg text-cm-on-surface-variant hover:text-cm-primary hover:bg-cm-primary/10 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button onClick={() => deletePromo(promo.id)} className="p-1.5 rounded-lg text-cm-on-surface-variant hover:text-red-400 hover:bg-red-500/10 transition-colors">
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
              <button onClick={addHeroBanner} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cm-primary/10 text-cm-primary text-xs font-bold hover:bg-cm-primary/20 transition-all">
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
                      <button onClick={() => toggleBannerActive(banner.id)} className={`p-1.5 rounded-lg transition-colors ${banner.active ? 'text-cm-primary hover:bg-cm-primary/10' : 'text-cm-on-surface-variant/40'}`}>
                        <span className="material-symbols-outlined text-[16px]">{banner.active ? 'toggle_on' : 'toggle_off'}</span>
                      </button>
                      <button onClick={() => { setEditingBanner(banner); setBannerForm({ ...banner }) }} className="p-1.5 rounded-lg text-cm-on-surface-variant hover:text-cm-primary hover:bg-cm-primary/10 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button onClick={() => deleteBanner(banner.id)} className="p-1.5 rounded-lg text-cm-on-surface-variant hover:text-red-400 hover:bg-red-500/10 transition-colors">
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
                </div>
              ))}
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
              <ImageUploader label="Imagen" path="" currentUrl={customForm.image || ''} onUpload={(url) => setCustomForm({ ...customForm, image: url })} />
            )}
            <FormField label="Enlace (URL opcional)" value={customForm.link || ''} onChange={(v) => setCustomForm({ ...customForm, link: v })} />
            {(customForm.type === 'banner' || customForm.type === 'cta') && (
              <FormField label="Texto del botón CTA" value={customForm.ctaText || ''} onChange={(v) => setCustomForm({ ...customForm, ctaText: v })} />
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
            <ImageUploader label="Imagen de promoción" path="" currentUrl={promoForm.image || ''} onUpload={(url) => setPromoForm({ ...promoForm, image: url })} />
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
            <ImageUploader label="Imagen del banner" path="" currentUrl={bannerForm.image || ''} onUpload={(url) => setBannerForm({ ...bannerForm, image: url })} />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-cm-on-surface-variant cursor-pointer">
                <input type="checkbox" checked={bannerForm.active} onChange={(e) => setBannerForm({ ...bannerForm, active: e.target.checked })} className="accent-green-500" />
                Banner activo
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
              className="w-full max-w-4xl max-h-[90vh] glass-card rounded-2xl overflow-hidden flex flex-col border-cm-primary/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-cm-surface-container/50">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-cm-primary text-[22px]" style={{ fontVariationSettings: '"FILL" 1' }}>preview</span>
                  <h2 className="font-[family-name:var(--font-sora)] font-bold text-lg text-cm-on-surface">Vista Previa — Inicio</h2>
                </div>
                <button onClick={() => setShowPreview(false)} className="p-1.5 rounded-full hover:bg-cm-surface-container-highest transition-colors">
                  <span className="material-symbols-outlined text-cm-on-surface-variant">close</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-cm-background/50">
                <div className="max-w-2xl mx-auto space-y-4">
                  {sectionOrder.map((key) => {
                    const isVisible = key.startsWith('custom_')
                      ? customSections.find((s) => s.id === key.replace('custom_', ''))?.visible ?? true
                      : (visibility[key as keyof typeof visibility] ?? true)
                    if (!isVisible) return null

                    const sectionLabel = sectionMeta[key]?.label || key

                    return (
                      <div key={key} className="glass-card rounded-xl p-4 border-l-4 border-cm-primary">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-outlined text-cm-primary text-[16px]">{sectionMeta[key]?.icon || 'widgets'}</span>
                          <span className="font-[family-name:var(--font-sora)] font-bold text-sm text-cm-on-surface">{sectionLabel}</span>
                          <span className="px-2 py-0.5 rounded-full bg-cm-primary/15 text-cm-primary text-[9px] font-bold">VISIBLE</span>
                        </div>
                        {key === 'hero' && (
                          <div className="text-xs text-cm-on-surface-variant space-y-1">
                            <p><span className="font-semibold">Badge:</span> {settings.hero.badge}</p>
                            <p><span className="font-semibold">Título:</span> {settings.hero.headline} <span className="text-cm-primary">{settings.hero.headlineHighlight}</span></p>
                            <p><span className="font-semibold">Promo:</span> {settings.hero.promoHighlight}{settings.hero.promoText}</p>
                          </div>
                        )}
                        {key === 'sportsSection' && (
                          <div className="text-xs text-cm-on-surface-variant">
                            <p className="font-semibold mb-1">{settings.sportsSection.title}</p>
                            <div className="flex flex-wrap gap-1">
                              {settings.sportsSection.sports.map((s) => (
                                <span key={s.id} className="px-2 py-0.5 rounded-full bg-white/5">{s.label} ({s.count})</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {key === 'promoBanner' && (
                          <div className="text-xs text-cm-on-surface-variant">
                            <p className="font-semibold mb-1">{settings.promoBanner.title}</p>
                            <div className="flex flex-wrap gap-1">
                              {settings.promoBanner.sellingPoints.map((sp, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-full bg-white/5">{sp.title}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {key === 'howItWorks' && (
                          <div className="text-xs text-cm-on-surface-variant">
                            <p className="font-semibold mb-1">{settings.howItWorks.title}</p>
                            <div className="space-y-0.5">
                              {settings.howItWorks.steps.map((s, i) => (
                                <p key={i}>{s.number}. {s.title}</p>
                              ))}
                            </div>
                          </div>
                        )}
                        {key === 'featuredCourts' && (
                          <p className="text-xs text-cm-on-surface-variant">Canchas destacadas (datos de la API)</p>
                        )}
                        {key === 'todaysSchedule' && (
                          <p className="text-xs text-cm-on-surface-variant">Agenda de hoy (datos de la API)</p>
                        )}
                        {key.startsWith('custom_') && (() => {
                          const cs = customSections.find((s) => s.id === key.replace('custom_', ''))
                          if (!cs) return null
                          return (
                            <div className="text-xs text-cm-on-surface-variant">
                              <p><span className="font-semibold">Tipo:</span> {cs.type}</p>
                              <p><span className="font-semibold">Título:</span> {cs.title}</p>
                              {cs.subtitle && <p><span className="font-semibold">Subtítulo:</span> {cs.subtitle}</p>}
                              {cs.image && <img src={cs.image} alt={cs.title} className="w-full h-24 object-cover rounded-lg mt-2" />}
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}
                  {settings.activePromotions.filter((p) => p.active).length > 0 && (
                    <div className="glass-card rounded-xl p-4 border-l-4 border-amber-400">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-amber-400 text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>local_offer</span>
                        <span className="font-[family-name:var(--font-sora)] font-bold text-sm text-cm-on-surface">Promociones activas</span>
                      </div>
                      <div className="space-y-1">
                        {settings.activePromotions.filter((p) => p.active).map((p) => (
                          <p key={p.id} className="text-xs text-cm-on-surface-variant">
                            <span className="text-amber-400 font-bold">{p.title}</span> — {p.description}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {settings.heroBanners.filter((b) => b.active).length > 0 && (
                    <div className="glass-card rounded-xl p-4 border-l-4 border-sky-400">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-sky-400 text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>view_carousel</span>
                        <span className="font-[family-name:var(--font-sora)] font-bold text-sm text-cm-on-surface">Carrusel Hero</span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto">
                        {settings.heroBanners.filter((b) => b.active).map((b) => (
                          <img key={b.id} src={b.image} alt={b.title || ''} className="h-16 rounded-lg flex-shrink-0" />
                        ))}
                      </div>
                    </div>
                  )}
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
   COMPONENT
   ═══════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const { setView } = useAppStore()
  const [activeTab, setActiveTab] = useState<AdminTab>('reservas')

  /* data */
  const [stats, setStats] = useState<Stats | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
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
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'price_desc' | 'price_asc' | 'name_asc'>('date_desc')
  const [showPastBookings, setShowPastBookings] = useState(false)

  /* expense form */
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expForm, setExpForm] = useState({ description: '', amount: '', category: 'mantenimiento', date: todayStr(), notes: '' })
  const [submittingExpense, setSubmittingExpense] = useState(false)

  /* loading */
  const [loading, setLoading] = useState(true)

  /* schedule modal */
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleDate, setScheduleDate] = useState(todayStr())

  /* admin booking form */
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [submittingBooking, setSubmittingBooking] = useState(false)
  const [bookingForm, setBookingForm] = useState({
    courtId: '', userId: '', date: todayStr(), startTime: '18:00', endTime: '19:00',
    totalPrice: '', advanceAmount: '', status: 'reserved', paymentMethod: 'yape', notes: '',
  })
  const [bookingUsers, setBookingUsers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [bookingCourtDetails, setBookingCourtDetails] = useState<Array<{ id: string; name: string; sport: string; pricePerHour: number; pricingSchedule: PricingScheduleItem[] }>>([])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

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

  /* advance payment modal */
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const [advanceTarget, setAdvanceTarget] = useState<Booking | null>(null)
  const [advanceAmount, setAdvanceAmount] = useState('')
  const [advanceMethod, setAdvanceMethod] = useState('yape')
  const [submittingAdvance, setSubmittingAdvance] = useState(false)

  /* ─── fetch all data ─── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const headers = getAuthHeaders()
      const [statsRes, bookingsRes, expensesRes, courtsRes] = await Promise.all([
        fetch('/api/stats', { headers }),
        fetch('/api/bookings', { headers }),
        fetch('/api/expenses', { headers }),
        fetch('/api/courts', { headers }),
      ])

      if (!bookingsRes.ok) {
        const errData = await bookingsRes.json().catch(() => ({ error: 'Error desconocido' }))
        console.error('[CREARD Admin] Error loading bookings:', bookingsRes.status, errData)
      }
      if (statsRes.ok) setStats(await statsRes.json())
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json()
        setBookings(Array.isArray(bookingsData) ? bookingsData : [])
      }
      if (expensesRes.ok) {
        const expensesData = await expensesRes.json()
        setExpenses(Array.isArray(expensesData) ? expensesData : [])
      }
      if (courtsRes.ok) {
        const courtsData = await courtsRes.json()
        setAllCourts(Array.isArray(courtsData) ? courtsData : [])
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los datos. Verifica la conexion a la base de datos.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  /* fetch users & court details for booking form */
  const loadBookingFormData = useCallback(async () => {
    try {
      const headers = getAuthHeaders()
      const [usersRes, courtsRes] = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch('/api/courts', { headers }),
      ])
      if (usersRes.ok) {
        const data = await usersRes.json()
        setBookingUsers(Array.isArray(data) ? data : [])
      }
      if (courtsRes.ok) {
        const data = await courtsRes.json()
        const courtsList = Array.isArray(data) ? data : []
        setBookingCourtDetails(courtsList.map((c: Record<string, unknown>) => ({
          id: c.id as string,
          name: c.name as string,
          sport: (c.sport as string) || '',
          pricePerHour: (c.pricePerHour as number) || 0,
          pricingSchedule: Array.isArray(c.pricingSchedule) ? c.pricingSchedule as PricingScheduleItem[] : [],
        })))
      }
    } catch { /* silent */ }
  }, [])

  /* ─── computed ─── */
  const today = todayStr()
  const todayBookings = bookings.filter((b) => b.date === today && b.status !== 'cancelled')
  const todayPaid = bookings.filter((b) => b.date === today && ['confirmed', 'completed'].includes(b.status))
  const todayRevenue = todayPaid.reduce((s, b) => s + b.totalPrice, 0)
  const pendingPayments = bookings.filter((b) => b.date === today && ['reserved', 'partial_payment'].includes(b.status) && b.remainingAmount > 0)
  const pendingTotal = pendingPayments.reduce((s, b) => s + b.remainingAmount, 0)

  const uniqueCourts = [...new Map(bookings.filter(b => b.court).map(b => [b.court!.id, b.court!])).values()]
  const uniqueSports = [...new Set(bookings.filter(b => b.court?.sport).map(b => b.court!.sport))]

  /* ─── booking form handlers ─── */
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

  const handleBookingFormChange = (field: string, value: string) => {
    setBookingForm((prev) => {
      const updated = { ...prev, [field]: value }
      // Auto-calculate price when court or times change
      if (field === 'courtId' || field === 'startTime' || field === 'endTime') {
        const court = bookingCourtDetails.find((c) => c.id === updated.courtId)
        if (court) {
          if (court.pricingSchedule && court.pricingSchedule.length > 0) {
            const { total } = calculatePriceForTimeSlot(court.pricingSchedule, updated.startTime, updated.endTime)
            const price = total > 0 ? total : court.pricePerHour * calculateHours(updated.startTime, updated.endTime)
            updated.totalPrice = String(price)
            if (!updated.advanceAmount || updated.advanceAmount === String(court.pricePerHour * calculateHours(prev.startTime, prev.endTime) * 0.5)) {
              updated.advanceAmount = String(Math.round(price * 0.5 * 100) / 100)
            }
          } else {
            const hours = calculateHours(updated.startTime, updated.endTime)
            const price = court.pricePerHour * hours
            updated.totalPrice = String(price)
            if (!updated.advanceAmount || updated.advanceAmount === String(court.pricePerHour * calculateHours(prev.startTime, prev.endTime) * 0.5)) {
              updated.advanceAmount = String(Math.round(price * 0.5 * 100) / 100)
            }
          }
        }
      }
      // Auto-recalculate remaining
      if (['totalPrice', 'advanceAmount'].includes(field)) {
        const total = parseFloat(updated.totalPrice) || 0
        const adv = parseFloat(updated.advanceAmount) || 0
      }
      return updated
    })
    if (formErrors[field]) setFormErrors((prev) => { const next = { ...prev }; delete next[field]; return next })
  }

  const calculateHours = (start: string, end: string): number => {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const diff = (eh * 60 + em) - (sh * 60 + sm)
    return Math.max(diff / 60, 0.5)
  }

  const validateBookingForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!bookingForm.courtId) errors.courtId = 'Selecciona una cancha'
    if (!bookingForm.userId) errors.userId = 'Selecciona un cliente'
    if (!bookingForm.date) errors.date = 'Selecciona una fecha'
    if (!bookingForm.startTime) errors.startTime = 'Hora de inicio requerida'
    if (!bookingForm.endTime) errors.endTime = 'Hora de fin requerida'
    if (bookingForm.startTime >= bookingForm.endTime) errors.endTime = 'La hora de fin debe ser posterior'
    if (!bookingForm.totalPrice || parseFloat(bookingForm.totalPrice) <= 0) errors.totalPrice = 'El precio debe ser mayor a 0'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreateBooking = async () => {
    if (!validateBookingForm()) return
    setSubmittingBooking(true)
    try {
      const body = {
        courtId: bookingForm.courtId,
        userId: bookingForm.userId,
        date: bookingForm.date,
        startTime: bookingForm.startTime,
        endTime: bookingForm.endTime,
        totalPrice: parseFloat(bookingForm.totalPrice),
        advanceAmount: parseFloat(bookingForm.advanceAmount) || parseFloat(bookingForm.totalPrice) * 0.5,
        remainingAmount: parseFloat(bookingForm.totalPrice) - (parseFloat(bookingForm.advanceAmount) || parseFloat(bookingForm.totalPrice) * 0.5),
        status: bookingForm.status,
        paymentMethod: bookingForm.paymentMethod,
        notes: bookingForm.notes || null,
      }
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast({ title: 'Reserva creada', description: 'La reserva se ha registrado correctamente' })
        setShowBookingForm(false)
        setBookingForm({ courtId: '', userId: '', date: todayStr(), startTime: '18:00', endTime: '19:00', totalPrice: '', advanceAmount: '', status: 'reserved', paymentMethod: 'yape', notes: '' })
        setFormErrors({})
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
    loadBookingFormData()
    setShowBookingForm(true)
    // Reset recurring state
    setShowRecurring(false)
    setRecurringStep('config')
    setRecurringPreview(null)
    setRecurringPreviewSummary(null)
  }

  /* ─── recurring booking handlers ─── */
  const handlePreviewRecurring = async () => {
    if (!bookingForm.courtId || !bookingForm.userId || !bookingForm.startTime || !bookingForm.endTime || !bookingForm.date) {
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
        courtId: bookingForm.courtId,
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
        courtId: bookingForm.courtId,
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
        setBookingForm({ courtId: '', userId: '', date: todayStr(), startTime: '18:00', endTime: '19:00', totalPrice: '', advanceAmount: '', status: 'reserved', paymentMethod: 'yape', notes: '' })
        setFormErrors({})
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
    setAdvanceMethod('yape')
    setShowAdvanceModal(true)
  }

  const handleSubmitAdvance = async () => {
    if (!advanceTarget || !advanceAmount || parseFloat(advanceAmount) <= 0) return
    setSubmittingAdvance(true)
    try {
      // Update booking status and adjust amounts
      const newAdvance = advanceTarget.advanceAmount + parseFloat(advanceAmount)
      const newRemaining = advanceTarget.totalPrice - newAdvance
      const newStatus = newRemaining <= 0 ? 'completed' : 'reserved'

      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: advanceTarget.id,
          status: newStatus,
        }),
      })
      if (res.ok) {
        toast({ title: 'Pago registrado', description: `Adelanto de ${fmtCurrency(parseFloat(advanceAmount))} registrado. Estado: ${statusConfig[newStatus]?.label || newStatus}` })
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

  const filteredBookings = (() => {
    let result = statusFilter === 'all' ? [...bookings] : bookings.filter((b) => b.status === statusFilter)
    // Hide past bookings unless toggle is on
    if (!showPastBookings) {
      const today = todayStr();
      result = result.filter((b) => b.date >= today);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((b) =>
        b.user?.name?.toLowerCase().includes(q) ||
        b.user?.email?.toLowerCase().includes(q) ||
        b.court?.name?.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q)
      )
    }
    if (dateFrom) result = result.filter((b) => b.date >= dateFrom)
    if (dateTo) result = result.filter((b) => b.date <= dateTo)
    if (courtFilter !== 'all') result = result.filter((b) => b.courtId === courtFilter)
    if (sportFilter !== 'all') result = result.filter((b) => b.court?.sport === sportFilter)
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
  })()

  const activeFilterCount = [searchQuery, dateFrom, dateTo, courtFilter !== 'all' && courtFilter, sportFilter !== 'all' && sportFilter].filter(Boolean).length

  const clearAllFilters = () => {
    setSearchQuery('')
    setDateFrom('')
    setDateTo('')
    setCourtFilter('all')
    setSportFilter('all')
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const totalIncome = bookings
    .filter((b) => ['confirmed', 'completed'].includes(b.status))
    .reduce((s, b) => s + b.totalPrice, 0)
  const totalAdvances = bookings
    .filter((b) => ['reserved', 'partial_payment', 'confirmed', 'completed'].includes(b.status))
    .reduce((s, b) => s + b.advanceAmount, 0)
  const balance = totalIncome - totalExpenses

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
    if (['confirmed', 'completed'].includes(b.status)) {
      acc[b.user.id].totalSpent += b.totalPrice
    }
    return acc
  }, {})
  const rankedUsers = Object.values(userStats).sort((a, b) => b.totalSpent - a.totalSpent)

  /* ─── actions ─── */
  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)))
        toast({ title: 'Estado actualizado', description: `Reserva marcada como ${statusConfig[status]?.label || status}` })
        fetchData()
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado', variant: 'destructive' })
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
    bookings: scheduleBookings.filter((b) => b.courtId === c.id),
  }))

  /* time slots — for today's date, exclude hours within 30 min of now */
  const timeSlots: Array<{ value: string; disabled: boolean; label?: string }> = []
  const adminNow = new Date()
  const adminCurH = adminNow.getHours()
  const adminCurM = adminNow.getMinutes()
  // Restricted hour: if current minute >= 30, next hour is also too soon
  const adminRestrictedH = adminCurM >= 30 ? adminCurH + 1 : adminCurH
  const adminToday = todayStr()
  for (let h = 6; h <= 23; h++) {
    const isRestricted = bookingForm.date === adminToday && h <= adminRestrictedH
    timeSlots.push({
      value: `${String(h).padStart(2, '0')}:00`,
      disabled: isRestricted,
      label: isRestricted && h > adminCurH ? '30 min' : undefined,
    })
  }

  /* ─── KPIs ─── */
  const kpis = [
    { label: 'Canchas Ocupadas Hoy', value: todayBookings.length, icon: 'sports_soccer', color: 'text-cm-primary', bg: 'bg-cm-primary/10', sub: `de ${allCourts.length} canchas` },
    { label: 'Reservas del Día', value: todayBookings.length, icon: 'event', color: 'text-blue-400', bg: 'bg-blue-500/10', sub: `Hoy ${fmtDate(today)}` },
    { label: 'Ingresos del Día', value: fmtCurrency(todayRevenue), icon: 'payments', color: 'text-green-400', bg: 'bg-green-500/10', sub: 'Pagos completados' },
    { label: 'Pagos Pendientes', value: fmtCurrency(pendingTotal), icon: 'schedule', color: 'text-amber-400', bg: 'bg-amber-500/10', sub: `${pendingPayments.length} reservas` },
  ]

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="max-w-7xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-cm-surface-container-highest rounded w-1/4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-cm-surface-container-highest rounded-xl" />)}
          </div>
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setView('profile')}
            className="p-2 rounded-full bg-cm-surface-container-highest/60 text-cm-on-surface-variant hover:text-cm-on-surface transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-cm-on-surface">
              Panel de Administración
            </h1>
            <p className="text-cm-on-surface-variant text-sm font-[family-name:var(--font-inter)]">
              Gestión integral de CREARD
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="glass-card rounded-xl p-4"
            >
              <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center mb-3`}>
                <span className={`material-symbols-outlined ${kpi.color} text-[22px]`} style={{ fontVariationSettings: '"FILL" 1' }}>
                  {kpi.icon}
                </span>
              </div>
              <p className={`font-[family-name:var(--font-sora)] text-xl lg:text-2xl font-bold ${kpi.color}`}>
                {kpi.value}
              </p>
              <p className="text-cm-on-surface text-xs mt-0.5 font-[family-name:var(--font-sora)] font-medium">
                {kpi.label}
              </p>
              <p className="text-cm-on-surface-variant text-[11px] mt-0.5 font-[family-name:var(--font-inter)]">
                {kpi.sub}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-cm-surface-container-highest/40 rounded-xl mb-6 overflow-x-auto no-scrollbar">
          {adminTabs.map((tab) => (
            <button
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
                      <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/10 transition-colors">
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
                      <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-cm-primary/15 text-cm-primary' : 'text-cm-on-surface-variant hover:text-cm-on-surface'}`} title="Tabla">
                        <span className="material-symbols-outlined text-[18px]">table_list</span>
                      </button>
                      <button onClick={() => setViewMode('gallery')} className={`p-1.5 rounded-md transition-all ${viewMode === 'gallery' ? 'bg-cm-primary/15 text-cm-primary' : 'text-cm-on-surface-variant hover:text-cm-on-surface'}`} title="Galería">
                        <span className="material-symbols-outlined text-[18px]">grid_view</span>
                      </button>
                      <button onClick={() => setViewMode('compact')} className={`p-1.5 rounded-md transition-all ${viewMode === 'compact' ? 'bg-cm-primary/15 text-cm-primary' : 'text-cm-on-surface-variant hover:text-cm-on-surface'}`} title="Compacto">
                        <span className="material-symbols-outlined text-[18px]">view_agenda</span>
                      </button>
                    </div>

                    {/* Filter toggle */}
                    <button
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
                        <button onClick={clearAllFilters} className="mt-2 text-xs text-cm-primary font-semibold font-[family-name:var(--font-inter)] hover:underline flex items-center gap-1">
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
                        <button onClick={() => setDateFrom('')} className="hover:text-red-400 transition-colors"><span className="material-symbols-outlined text-[12px]">close</span></button>
                      </span>
                    )}
                    {dateTo && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cm-surface-container-highest/60 text-[10px] text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">
                        Hasta: {fmtDate(dateTo)}
                        <button onClick={() => setDateTo('')} className="hover:text-red-400 transition-colors"><span className="material-symbols-outlined text-[12px]">close</span></button>
                      </span>
                    )}
                    {courtFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cm-surface-container-highest/60 text-[10px] text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">
                        {uniqueCourts.find(c => c.id === courtFilter)?.name || courtFilter}
                        <button onClick={() => setCourtFilter('all')} className="hover:text-red-400 transition-colors"><span className="material-symbols-outlined text-[12px]">close</span></button>
                      </span>
                    )}
                    {sportFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cm-surface-container-highest/60 text-[10px] text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)] capitalize">
                        {sportFilter}
                        <button onClick={() => setSportFilter('all')} className="hover:text-red-400 transition-colors"><span className="material-symbols-outlined text-[12px]">close</span></button>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Status filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => setStatusFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === 'all' ? 'bg-cm-primary/10 text-cm-primary border border-cm-primary/30' : 'bg-cm-surface-container-highest/40 text-cm-on-surface-variant border border-transparent hover:border-white/10'}`}>
                  Todos ({bookings.length})
                </button>
                {Object.entries(statusConfig).map(([key, val]) => {
                  const count = bookings.filter((b) => b.status === key).length
                  if (count === 0) return null
                  return (
                    <button key={key} onClick={() => setStatusFilter(key)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${statusFilter === key ? `${val.color} border-current/30` : 'bg-cm-surface-container-highest/40 text-cm-on-surface-variant border border-transparent hover:border-white/10'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${val.dot}`} />
                      {val.label} ({count})
                    </button>
                  )
                })}
              </div>

              {/* Results count + action buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                  Mostrando <span className="font-semibold text-cm-on-surface">{filteredBookings.length}</span> de <span className="font-semibold text-cm-on-surface">{bookings.length}</span> reservas
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPastBookings(!showPastBookings)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${showPastBookings ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' : 'bg-cm-surface-container-highest/40 text-cm-on-surface-variant border border-transparent hover:border-white/10'}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{showPastBookings ? 'history_toggle_off' : 'history'}</span>
                    {showPastBookings ? 'Ocultar pasadas' : 'Ver pasadas'}
                  </button>
                  <button
                    onClick={openBookingForm}
                    className="flex items-center gap-1.5 px-4 py-2 bg-cm-primary text-cm-on-primary text-sm font-semibold rounded-xl hover:brightness-110 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>add_circle</span>
                    Nueva Reserva
                  </button>
                  <button
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
                  <p className="text-cm-on-surface-variant font-[family-name:var(--font-inter)]">No hay reservas con estos filtros</p>
                </div>
              ) : viewMode === 'table' ? (
                /* ─── TABLE MODE ─── */
                <div className="glass-card rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Fecha</th>
                          <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Hora</th>
                          <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Cancha</th>
                          <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)] hidden md:table-cell">Cliente</th>
                          <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Estado</th>
                          <th className="text-right px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)] hidden sm:table-cell">Adelanto</th>
                          <th className="text-right px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)] hidden sm:table-cell">Restante</th>
                          <th className="text-right px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Total</th>
                          <th className="text-center px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.map((b) => {
                          const st = statusConfig[b.status] || statusConfig.reserved
                          return (
                            <tr key={b.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3 text-cm-on-surface font-[family-name:var(--font-inter)]">
                                <div className="flex items-center gap-1.5">
                                  {fmtDate(b.date)}
                                  {b.recurringGroupId && (
                                    <button onClick={() => openSeriesModal(b.recurringGroupId!)} className="p-0.5 rounded text-cm-primary hover:bg-cm-primary/10 transition-colors" title="Serie recurrente">
                                      <span className="material-symbols-outlined text-[14px]">repeat</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-cm-on-surface font-[family-name:var(--font-inter)]">{b.startTime}-{b.endTime}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-cm-primary text-[16px]">{sportIcons[b.court?.sport || ''] || 'sports'}</span>
                                  <span className="text-cm-on-surface font-medium font-[family-name:var(--font-sora)] text-xs">{b.court?.name || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell">
                                <div>
                                  <p className="text-cm-on-surface font-[family-name:var(--font-sora)] text-xs">{b.user?.name || 'Sin nombre'}</p>
                                  <p className="text-cm-on-surface-variant text-[11px] font-[family-name:var(--font-inter)]">{b.user?.email || ''}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                  {st.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-cm-on-surface font-[family-name:var(--font-inter)] hidden sm:table-cell">{fmtCurrency(b.advanceAmount)}</td>
                              <td className={`px-4 py-3 text-right font-[family-name:var(--font-inter)] hidden sm:table-cell ${b.remainingAmount > 0 ? 'text-orange-400' : 'text-green-400'}`}>{fmtCurrency(b.remainingAmount)}</td>
                              <td className="px-4 py-3 text-right text-cm-primary font-bold font-[family-name:var(--font-sora)]">{fmtCurrency(b.totalPrice)}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {b.recurringGroupId && (
                                    <button
                                      onClick={() => openSeriesModal(b.recurringGroupId!)}
                                      className="p-1 rounded-lg text-cm-primary hover:bg-cm-primary/10 transition-colors"
                                      title="Ver serie recurrente"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">repeat</span>
                                    </button>
                                  )}
                                  {b.remainingAmount > 0 && (
                                    <button
                                      onClick={() => openAdvanceModal(b)}
                                      className="p-1 rounded-lg text-amber-400 hover:bg-amber-400/10 transition-colors"
                                      title="Registrar adelanto"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">payments</span>
                                    </button>
                                  )}
                                  <select
                                    value={b.status}
                                    onChange={(e) => handleUpdateStatus(b.id, e.target.value)}
                                    className="bg-cm-surface-container-highest/60 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                                  >
                                    <option value="reserved">Pendiente de Pago</option>
                                    <option value="partial_payment">Pago Parcial</option>
                                    <option value="confirmed">Pagado</option>
                                    <option value="completed">Completo</option>
                                    <option value="cancelled">Cancelado</option>
                                  </select>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : viewMode === 'gallery' ? (
                /* ─── GALLERY MODE ─── */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredBookings.map((b, i) => {
                    const st = statusConfig[b.status] || statusConfig.reserved
                    const statusAccent = b.status === 'completed' ? 'bg-green-400' : b.status === 'cancelled' ? 'bg-red-400' : 'bg-amber-400'
                    return (
                      <motion.div
                        key={b.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                        className="glass-card rounded-xl overflow-hidden hover:border-white/15 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all duration-300 group"
                      >
                        {/* Top accent bar */}
                        <div className={`h-1 ${statusAccent}`} />
                        <div className="p-4 space-y-3">
                          {/* Date & Time */}
                          <div>
                            <div className="flex items-center gap-1.5 text-cm-on-surface-variant text-[11px] font-[family-name:var(--font-inter)]">
                              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                              {fmtDateFull(b.date)}
                              {b.recurringGroupId && (
                                <button onClick={() => openSeriesModal(b.recurringGroupId!)} className="p-0.5 rounded text-cm-primary hover:bg-cm-primary/10 transition-colors" title="Serie recurrente">
                                  <span className="material-symbols-outlined text-[13px]">repeat</span>
                                </button>
                              )}
                            </div>
                            <p className="font-[family-name:var(--font-sora)] font-bold text-cm-on-surface text-lg mt-0.5">
                              {b.startTime} - {b.endTime}
                            </p>
                          </div>
                          {/* Court */}
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-cm-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="material-symbols-outlined text-cm-primary text-[16px]">{sportIcons[b.court?.sport || ''] || 'sports'}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-[family-name:var(--font-sora)] font-semibold text-xs text-cm-on-surface truncate">{b.court?.name || 'N/A'}</p>
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
                          {/* Status badge */}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                          {/* Price breakdown + Payment method */}
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
                            {b.paymentMethod && (
                              <div className="flex items-center gap-1 pt-1">
                                <span className="material-symbols-outlined text-[12px] text-cm-on-surface-variant">payments</span>
                                <span className="text-[10px] text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">
                                  {paymentMethodLabels[b.paymentMethod] || b.paymentMethod}
                                </span>
                              </div>
                            )}
                          {/* Status dropdown + Advance */}
                          <div className="flex items-center gap-2">
                            {b.recurringGroupId && (
                              <button
                                onClick={() => openSeriesModal(b.recurringGroupId!)}
                                className="p-1.5 rounded-lg bg-cm-primary/10 text-cm-primary hover:bg-cm-primary/20 transition-colors flex-shrink-0"
                                title="Ver serie recurrente"
                              >
                                <span className="material-symbols-outlined text-[16px]">repeat</span>
                              </button>
                            )}
                            <select
                              value={b.status}
                              onChange={(e) => handleUpdateStatus(b.id, e.target.value)}
                              className="flex-1 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                            >
                              <option value="reserved">Reservado</option>
                              <option value="completed">Completo</option>
                              <option value="cancelled">Cancelado</option>
                            </select>
                            {b.remainingAmount > 0 && (
                              <button
                                onClick={() => openAdvanceModal(b)}
                                className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-400/20 transition-colors flex-shrink-0"
                                title="Registrar adelanto"
                              >
                                <span className="material-symbols-outlined text-[16px]">payments</span>
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
                  {filteredBookings.map((b, i) => {
                    const st = statusConfig[b.status] || statusConfig.reserved
                    return (
                      <motion.div
                        key={b.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.2) }}
                        className="glass-card rounded-xl px-4 py-3 hover:border-white/15 transition-all duration-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          {/* Date & Time */}
                          <div className="flex items-center gap-2 sm:w-32 flex-shrink-0">
                            <span className="material-symbols-outlined text-cm-on-surface-variant text-[16px]">event</span>
                            <div>
                              <div className="flex items-center gap-1">
                                <p className="text-xs text-cm-on-surface font-medium font-[family-name:var(--font-inter)]">{fmtDate(b.date)}</p>
                                {b.recurringGroupId && (
                                  <button onClick={() => openSeriesModal(b.recurringGroupId!)} className="p-0.5 rounded text-cm-primary hover:bg-cm-primary/10 transition-colors" title="Serie recurrente">
                                    <span className="material-symbols-outlined text-[13px]">repeat</span>
                                  </button>
                                )}
                              </div>
                              <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{b.startTime}-{b.endTime}</p>
                            </div>
                          </div>
                          {/* Court */}
                          <div className="flex items-center gap-1.5 sm:w-36 flex-shrink-0">
                            <span className="material-symbols-outlined text-cm-primary text-[14px]">{sportIcons[b.court?.sport || ''] || 'sports'}</span>
                            <span className="text-xs text-cm-on-surface font-medium font-[family-name:var(--font-sora)] truncate">{b.court?.name || 'N/A'}</span>
                          </div>
                          {/* Client */}
                          <div className="flex-1 min-w-0 hidden md:block">
                            <p className="text-xs text-cm-on-surface font-medium font-[family-name:var(--font-inter)] truncate">{b.user?.name || 'Sin nombre'}</p>
                            <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] truncate">{b.user?.email || ''}</p>
                          </div>
                          {/* Status + Price + Action */}
                          <div className="flex items-center gap-2 sm:gap-3 sm:ml-auto flex-shrink-0">
                            {b.recurringGroupId && (
                              <button
                                onClick={() => openSeriesModal(b.recurringGroupId!)}
                                className="p-1 rounded-lg text-cm-primary hover:bg-cm-primary/10 transition-colors"
                                title="Ver serie recurrente"
                              >
                                <span className="material-symbols-outlined text-[14px]">repeat</span>
                              </button>
                            )}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                              {st.label}
                            </span>
                            <span className="text-xs text-cm-primary font-bold font-[family-name:var(--font-sora)] whitespace-nowrap">{fmtCurrency(b.totalPrice)}</span>
                            {b.remainingAmount > 0 && (
                              <button
                                onClick={() => openAdvanceModal(b)}
                                className="p-1 rounded-lg text-amber-400 hover:bg-amber-400/10 transition-colors"
                                title="Registrar adelanto"
                              >
                                <span className="material-symbols-outlined text-[14px]">payments</span>
                              </button>
                            )}
                            <select
                              value={b.status}
                              onChange={(e) => handleUpdateStatus(b.id, e.target.value)}
                              className="bg-cm-surface-container-highest/60 border border-white/10 rounded-lg px-1.5 py-1 text-[10px] text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                            >
                              <option value="reserved">Reservado</option>
                              <option value="completed">Completo</option>
                              <option value="cancelled">Cancelado</option>
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}


          {/* ─── FINANZAS ─── */}
          {activeTab === 'finanzas' && (
            <motion.div key="finanzas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
              {/* Income summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-cm-primary text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>account_balance_wallet</span>
                    <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Ingresos Totales</span>
                  </div>
                  <p className="font-[family-name:var(--font-sora)] text-2xl font-bold text-cm-primary">{fmtCurrency(totalIncome)}</p>
                  <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mt-1">Por reservas completadas y pagadas</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-blue-400 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>savings</span>
                    <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Adelantos Recibidos</span>
                  </div>
                  <p className="font-[family-name:var(--font-sora)] text-2xl font-bold text-blue-400">{fmtCurrency(totalAdvances)}</p>
                  <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mt-1">Suma de todos los adelantos</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-green-400 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>verified</span>
                    <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Pagos Completos</span>
                  </div>
                  <p className="font-[family-name:var(--font-sora)] text-2xl font-bold text-green-400">{fmtCurrency(totalIncome)}</p>
                  <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mt-1">Reservas pagadas al 100%</p>
                </motion.div>
              </div>

              {/* Expenses & Balance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-red-400 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>trending_down</span>
                    <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Egresos Totales</span>
                  </div>
                  <p className="font-[family-name:var(--font-sora)] text-2xl font-bold text-red-400">{fmtCurrency(totalExpenses)}</p>
                  <div className="mt-3 space-y-1.5">
                    {Object.entries(expensesByCategory).map(([cat, amount]) => {
                      const catInfo = expenseCategories[cat] || expenseCategories.otros
                      return (
                        <div key={cat} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                            <span className="material-symbols-outlined text-[14px]">{catInfo.icon}</span>
                            {catInfo.label}
                          </span>
                          <span className="text-cm-on-surface font-medium font-[family-name:var(--font-inter)]">{fmtCurrency(amount)}</span>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`material-symbols-outlined text-[20px] ${balance >= 0 ? 'text-cm-primary' : 'text-red-400'}`} style={{ fontVariationSettings: '"FILL" 1' }}>analytics</span>
                    <span className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Balance</span>
                  </div>
                  <p className={`font-[family-name:var(--font-sora)] text-2xl font-bold ${balance >= 0 ? 'text-cm-primary' : 'text-red-400'}`}>
                    {fmtCurrency(balance)}
                  </p>
                  <div className="mt-3 p-3 rounded-lg bg-cm-surface-container-highest/40">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-green-400 font-[family-name:var(--font-inter)]">+ Ingresos</span>
                      <span className="text-green-400 font-[family-name:var(--font-inter)]">{fmtCurrency(totalIncome)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-red-400 font-[family-name:var(--font-inter)]">- Egresos</span>
                      <span className="text-red-400 font-[family-name:var(--font-inter)]">{fmtCurrency(totalExpenses)}</span>
                    </div>
                    <div className="border-t border-white/5 mt-2 pt-2 flex justify-between text-sm font-bold">
                      <span className="text-cm-on-surface font-[family-name:var(--font-sora)]">Balance</span>
                      <span className={`font-[family-name:var(--font-sora)] ${balance >= 0 ? 'text-cm-primary' : 'text-red-400'}`}>{fmtCurrency(balance)}</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Revenue chart */}
              {stats?.revenueByMonth && stats.revenueByMonth.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-xl p-5">
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
                <button
                  onClick={() => setShowExpenseForm(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-cm-primary/10 text-cm-primary text-sm font-semibold rounded-xl hover:bg-cm-primary/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>add</span>
                  Agregar Gasto
                </button>
              </div>

              {/* Expense list */}
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Fecha</th>
                        <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Descripción</th>
                        <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Categoría</th>
                        <th className="text-right px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-12 text-cm-on-surface-variant font-[family-name:var(--font-inter)]">No hay gastos registrados</td></tr>
                      ) : (
                        expenses.map((e) => {
                          const cat = expenseCategories[e.category] || expenseCategories.otros
                          return (
                            <tr key={e.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3 text-cm-on-surface font-[family-name:var(--font-inter)]">{fmtDateFull(e.created_at || e.date)}</td>
                              <td className="px-4 py-3">
                                <p className="text-cm-on-surface font-medium font-[family-name:var(--font-sora)] text-xs">{e.description}</p>
                                {e.notes && <p className="text-cm-on-surface-variant text-[11px] font-[family-name:var(--font-inter)] mt-0.5">{e.notes}</p>}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cm-surface-container-highest/60 ${cat.color}`}>
                                  <span className="material-symbols-outlined text-[12px]">{cat.icon}</span>
                                  {cat.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-red-400 font-bold font-[family-name:var(--font-sora)]">-{fmtCurrency(e.amount)}</td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

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
                          <button onClick={() => setShowExpenseForm(false)} className="p-1 rounded-full hover:bg-cm-surface-container-highest transition-colors">
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
                              <button
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

                      <button
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
              className="w-full max-w-lg glass-card rounded-2xl p-6 border-cm-primary/20 overflow-hidden flex flex-col max-h-[90vh]"
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
                  <button onClick={() => setShowBookingForm(false)} className="p-1 rounded-full hover:bg-cm-surface-container-highest transition-colors">
                    <span className="material-symbols-outlined text-cm-on-surface-variant">close</span>
                  </button>
                )}
              </div>

              <div className="overflow-auto flex-1 space-y-3">
                {/* Court */}
                <div>
                  <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Cancha *</label>
                  <select
                    value={bookingForm.courtId}
                    onChange={(e) => handleBookingFormChange('courtId', e.target.value)}
                    className={`w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)] ${formErrors.courtId ? 'border-red-400' : 'border-white/10'}`}
                  >
                    <option value="">Selecciona una cancha</option>
                    {bookingCourtDetails.map((c) => {
                      const hasSchedule = c.pricingSchedule && c.pricingSchedule.length > 0
                      const priceLabel = hasSchedule
                        ? c.pricingSchedule.map((s) => `${s.label} S/${s.pricePerHour}`).join(' / ')
                        : `S/ ${c.pricePerHour}/h`
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.sport} — {priceLabel}
                        </option>
                      )
                    })}
                  </select>
                  {formErrors.courtId && <p className="text-[10px] text-red-400 mt-1 font-[family-name:var(--font-inter)]">{formErrors.courtId}</p>}
                </div>

                {/* Client */}
                <div>
                  <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Cliente *</label>
                  <select
                    value={bookingForm.userId}
                    onChange={(e) => handleBookingFormChange('userId', e.target.value)}
                    className={`w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)] ${formErrors.userId ? 'border-red-400' : 'border-white/10'}`}
                  >
                    <option value="">Selecciona un cliente</option>
                    {bookingUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.email ? `(${u.email})` : ''}
                      </option>
                    ))}
                  </select>
                  {formErrors.userId && <p className="text-[10px] text-red-400 mt-1 font-[family-name:var(--font-inter)]">{formErrors.userId}</p>}
                </div>

                {/* Date */}
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

                {/* Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">
                      Hora inicio *
                      {bookingForm.date === adminToday && (
                        <span className="text-cm-primary ml-1">mín. 30 min</span>
                      )}
                    </label>
                    <select
                      value={bookingForm.startTime}
                      onChange={(e) => handleBookingFormChange('startTime', e.target.value)}
                      className={`w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)] ${formErrors.startTime ? 'border-red-400' : 'border-white/10'}`}
                    >
                      {timeSlots.map((ts) => (
                        <option key={ts.value} value={ts.value} disabled={ts.disabled}>
                          {ts.value}{ts.label ? ` (${ts.label})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Hora fin *</label>
                    <select
                      value={bookingForm.endTime}
                      onChange={(e) => handleBookingFormChange('endTime', e.target.value)}
                      className={`w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)] ${formErrors.endTime ? 'border-red-400' : 'border-white/10'}`}
                    >
                      {Array.from({ length: 18 }, (_, i) => i + 7).map((h) => {
                        const val = `${String(h).padStart(2, '0')}:00`
                        const isRest = bookingForm.date === adminToday && h <= adminRestrictedH
                        return (
                          <option key={h} value={val} disabled={isRest}>
                            {val}{isRest && h > adminCurH ? ' (30 min)' : ''}
                          </option>
                        )
                      })}
                    </select>
                    {formErrors.endTime && <p className="text-[10px] text-red-400 mt-1 font-[family-name:var(--font-inter)]">{formErrors.endTime}</p>}
                  </div>
                </div>

                {/* Price & Advance */}
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
                  </div>
                </div>

                {/* Price preview */}
                {bookingForm.totalPrice && (
                  <div className="p-3 rounded-xl bg-cm-surface-container-highest/40 space-y-1">
                    {(() => {
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
                    <div className="flex justify-between text-xs font-[family-name:var(--font-inter)]">
                      <span className="text-cm-on-surface-variant">Adelanto</span>
                      <span className="text-cm-on-surface">{fmtCurrency(parseFloat(bookingForm.advanceAmount) || parseFloat(bookingForm.totalPrice) * 0.5)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-[family-name:var(--font-inter)]">
                      <span className="text-cm-on-surface-variant">Restante</span>
                      <span className="text-orange-400">{fmtCurrency(parseFloat(bookingForm.totalPrice) - (parseFloat(bookingForm.advanceAmount) || parseFloat(bookingForm.totalPrice) * 0.5))}</span>
                    </div>
                    <div className="flex justify-between text-sm font-[family-name:var(--font-sora)] pt-1 border-t border-white/5">
                      <span className="text-cm-on-surface font-medium">Total</span>
                      <span className="text-cm-primary font-bold">{fmtCurrency(parseFloat(bookingForm.totalPrice))}</span>
                    </div>
                  </div>
                )}

                {/* Status */}
                <div>
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

                {/* Payment method */}
                <div>
                  <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Método de pago</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'yape', label: 'Yape', icon: 'account_balance_wallet', color: 'text-purple-400' },
                      { key: 'plin', label: 'Plin', icon: 'account_balance_wallet', color: 'text-cyan-400' },
                      { key: 'cash', label: 'Efectivo', icon: 'payments', color: 'text-green-400' },
                      { key: 'transfer', label: 'Transfer.', icon: 'account_balance', color: 'text-blue-400' },
                      { key: 'culqi', label: 'Culqi', icon: 'credit_card', color: 'text-amber-400' },
                      { key: 'card', label: 'Tarjeta', icon: 'credit_card', color: 'text-orange-400' },
                    ].map((pm) => (
                      <button
                        key={pm.key}
                        type="button"
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
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Notas</label>
                  <textarea
                    value={bookingForm.notes}
                    onChange={(e) => handleBookingFormChange('notes', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface placeholder:text-cm-on-surface-variant/50 focus:outline-none focus:border-cm-primary/40 resize-none font-[family-name:var(--font-inter)]"
                    placeholder="Notas opcionales..."
                  />
                </div>

                {/* ═══ Recurring Booking Toggle ═══ */}
                <div className="border-t border-white/5 pt-3">
                  <button
                    type="button"
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
                                    key={f.key}
                                    type="button"
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
                                        key={day}
                                        type="button"
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
                                <button
                                  type="button"
                                  onClick={() => setRecurringConfig((p) => ({ ...p, endCondition: 'date' }))}
                                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                    recurringConfig.endCondition === 'date'
                                      ? 'bg-cm-primary text-cm-on-primary shadow-lg shadow-cm-primary/20'
                                      : 'bg-cm-surface-container-highest/40 text-cm-on-surface-variant hover:bg-cm-surface-container-highest/60 border border-white/10'
                                  }`}
                                >
                                  Por fecha final
                                </button>
                                <button
                                  type="button"
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
                            <button
                              type="button"
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
                                <div className="max-h-60 overflow-y-auto rounded-xl border border-white/10">
                                  <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-cm-surface-container-highest/80 backdrop-blur-sm">
                                      <tr className="border-b border-white/5">
                                        <th className="text-left px-3 py-2 text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">Fecha</th>
                                        <th className="text-left px-3 py-2 text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">Día</th>
                                        <th className="text-left px-3 py-2 text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">Estado</th>
                                        <th className="text-right px-3 py-2 text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">Precio</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {recurringPreview.map((item, i) => (
                                        <tr key={i} className={`border-b border-white/[0.03] ${!item.available ? 'opacity-50' : ''}`}>
                                          <td className="px-3 py-2 text-cm-on-surface font-medium font-[family-name:var(--font-inter)]">{fmtDate(item.date)}</td>
                                          <td className="px-3 py-2 text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{item.dayName}</td>
                                          <td className="px-3 py-2">
                                            {item.available ? (
                                              <span className="inline-flex items-center gap-1 text-green-400">
                                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                <span className="font-[family-name:var(--font-inter)]">Disponible</span>
                                              </span>
                                            ) : (
                                              <span className="text-red-400 font-[family-name:var(--font-inter)]">
                                                Ocupado {item.conflict ? `(${item.conflict.startTime}-${item.conflict.endTime}, ${item.conflict.userName})` : ''}
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 text-right text-cm-on-surface font-[family-name:var(--font-sora)]">{fmtCurrency(item.price)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => { setRecurringStep('config'); setRecurringPreview(null) }}
                                    className="flex-1 py-2.5 bg-cm-surface-container-highest/40 text-cm-on-surface-variant rounded-xl text-xs font-semibold hover:bg-cm-surface-container-highest/60 transition-all"
                                  >
                                    Volver
                                  </button>
                                  <button
                                    type="button"
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
              </div>

              <button
                onClick={showRecurring && recurringStep === 'preview' ? handleCreateRecurring : handleCreateBooking}
                disabled={submittingBooking || creatingRecurring}
                className="w-full mt-5 py-3 bg-cm-primary text-cm-on-primary rounded-xl font-semibold font-[family-name:var(--font-sora)] hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 flex-shrink-0"
              >
                {(submittingBooking || creatingRecurring) ? (
                  <><span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Creando reserva...</>
                ) : (
                  <><span className="material-symbols-outlined text-[20px]">check_circle</span> {showRecurring ? 'Crear Reserva Individual' : 'Crear Reserva'}</>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}

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
                    <h3 className="font-[family-name:var(--font-sora)] font-bold text-lg text-cm-on-surface">Registrar Adelanto</h3>
                    <p className="text-cm-on-surface-variant text-[11px] font-[family-name:var(--font-inter)]">Agregar pago a reserva existente</p>
                  </div>
                </div>
                {!submittingAdvance && (
                  <button onClick={() => setShowAdvanceModal(false)} className="p-1 rounded-full hover:bg-cm-surface-container-highest transition-colors">
                    <span className="material-symbols-outlined text-cm-on-surface-variant">close</span>
                  </button>
                )}
              </div>

              {/* Booking summary */}
              <div className="p-3 rounded-xl bg-cm-surface-container-highest/40 mb-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-cm-on-surface font-[family-name:var(--font-inter)]">
                  <span className="material-symbols-outlined text-[14px]">sports</span>
                  <span className="font-medium">{advanceTarget.court?.name || 'N/A'}</span>
                  <span className="text-cm-on-surface-variant">•</span>
                  <span>{fmtDate(advanceTarget.date)}</span>
                  <span className="text-cm-on-surface-variant">•</span>
                  <span>{advanceTarget.startTime}-{advanceTarget.endTime}</span>
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
                    <button
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
                      { key: 'yape', label: 'Yape', icon: 'account_balance_wallet' },
                      { key: 'plin', label: 'Plin', icon: 'account_balance_wallet' },
                      { key: 'cash', label: 'Efectivo', icon: 'payments' },
                      { key: 'transfer', label: 'Transfer.', icon: 'account_balance' },
                      { key: 'culqi', label: 'Culqi', icon: 'credit_card' },
                      { key: 'card', label: 'Tarjeta', icon: 'credit_card' },
                    ].map((pm) => (
                      <button
                        key={pm.key}
                        type="button"
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

              <button
                onClick={handleSubmitAdvance}
                disabled={submittingAdvance || !advanceAmount || parseFloat(advanceAmount) <= 0}
                className="w-full mt-5 py-3 bg-amber-500 text-white rounded-xl font-semibold font-[family-name:var(--font-sora)] hover:bg-amber-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingAdvance ? (
                  <><span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Registrando...</>
                ) : (
                  <><span className="material-symbols-outlined text-[20px]">check_circle</span> Registrar Adelanto — {advanceAmount ? fmtCurrency(parseFloat(advanceAmount)) : 'S/ 0.00'}</>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    <button
                      onClick={() => handleCancelSeries(seriesGroupId)}
                      disabled={cancellingSeries}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[14px]">cancel</span>
                      {cancellingSeries ? 'Cancelando...' : 'Cancelar toda la serie'}
                    </button>
                  )}
                  {!cancellingSeries && (
                    <button onClick={() => setShowSeriesModal(false)} className="p-1 rounded-full hover:bg-cm-surface-container-highest transition-colors">
                      <span className="material-symbols-outlined text-cm-on-surface-variant">close</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-auto flex-1">
                <div className="glass-card rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Fecha</th>
                          <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Hora</th>
                          <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Cancha</th>
                          <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Estado</th>
                          <th className="text-right px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Total</th>
                          <th className="text-center px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seriesBookings.sort((a, b) => a.date.localeCompare(b.date)).map((sb) => {
                          const st = statusConfig[sb.status] || statusConfig.reserved
                          return (
                            <tr key={sb.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${sb.status === 'cancelled' ? 'opacity-40' : ''}`}>
                              <td className="px-4 py-3 text-cm-on-surface font-[family-name:var(--font-inter)]">{fmtDate(sb.date)}</td>
                              <td className="px-4 py-3 text-cm-on-surface font-[family-name:var(--font-inter)]">{sb.startTime}-{sb.endTime}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-cm-primary text-[16px]">{sportIcons[sb.court?.sport || ''] || 'sports'}</span>
                                  <span className="text-cm-on-surface font-medium font-[family-name:var(--font-sora)] text-xs">{sb.court?.name || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                  {st.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-cm-primary font-bold font-[family-name:var(--font-sora)]">{fmtCurrency(sb.totalPrice)}</td>
                              <td className="px-4 py-3 text-center">
                                {sb.status !== 'cancelled' && (
                                  <button
                                    onClick={() => handleCancelSingleFromSeries(sb.id)}
                                    className="p-1 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                                    title="Cancelar esta fecha"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">event_busy</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
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
                <button onClick={() => setShowSchedule(false)} className="p-1 rounded-full hover:bg-cm-surface-container-highest transition-colors">
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
                            const booking = court.bookings.find((b) => b.startTime === ts.value)
                            return (
                              <div
                                key={ts.value}
                                className={`flex-1 h-10 rounded-md flex items-center justify-center text-[10px] font-medium transition-all ${
                                  booking
                                    ? 'bg-cm-primary/20 text-cm-primary border border-cm-primary/30'
                                    : ts.disabled
                                    ? 'bg-cm-surface-container-highest/15 text-cm-on-surface-variant/15 border border-transparent'
                                    : 'bg-cm-surface-container-highest/30 text-cm-on-surface-variant/30 border border-transparent'
                                }`}
                                title={booking ? `${booking.user?.name || 'Cliente'} (${booking.startTime}-${booking.endTime})` : ts.label || 'Disponible'}
                              >
                                {booking ? (
                                  <span className="truncate px-1">{(booking.user?.name || 'Cliente').split(' ')[0]}</span>
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
    </div>
  )
}
