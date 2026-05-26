'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/hooks/use-toast'
import { useSiteSettings } from '@/context/SiteSettingsContext'
import { EditModal, FormField, ArrayField } from '@/components/home/SectionEditor'
import UsersTab from '@/components/admin/UsersTab'

/* ═══════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════ */
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
  pending:        { label: 'Pendiente',           color: 'bg-gray-500/20 text-gray-400',      dot: 'bg-gray-400' },
  confirmed:      { label: 'Confirmada',          color: 'bg-amber-500/20 text-amber-400',    dot: 'bg-amber-400' },
  partially_paid: { label: 'Parcial',             color: 'bg-orange-500/20 text-orange-400',  dot: 'bg-orange-400' },
  fully_paid:     { label: 'Completo',            color: 'bg-green-500/20 text-green-400',    dot: 'bg-green-400' },
  completed:      { label: 'Completada',          color: 'bg-blue-500/20 text-blue-400',      dot: 'bg-blue-400' },
  cancelled:      { label: 'Cancelada',           color: 'bg-red-500/20 text-red-400',        dot: 'bg-red-400' },
  no_show:        { label: 'No Asistió',          color: 'bg-orange-500/20 text-orange-400',  dot: 'bg-orange-400' },
  expired:        { label: 'Expirada',            color: 'bg-gray-500/20 text-gray-500',      dot: 'bg-gray-500' },
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

/* ═══════════════════════════════════════════════════
   CONTENT EDITOR TAB
   ═══════════════════════════════════════════════════ */
function ContentTab() {
  const { settings, saveSection } = useSiteSettings()
  const [editSection, setEditSection] = useState<'hero' | 'sportsSection' | 'promoBanner' | 'howItWorks' | null>(null)
  const [editForm, setEditForm] = useState<Record<string, unknown> | null>(null)
  const [saving, setSaving] = useState(false)

  const sections = [
    { key: 'hero' as const, label: 'Hero Principal', icon: 'hero', desc: 'Título, subtítulo, badge, estadísticas', color: 'text-cm-primary' },
    { key: 'sportsSection' as const, label: 'Instalaciones', icon: 'emoji_events', desc: 'Deportes, precios, amenidades', color: 'text-green-400' },
    { key: 'promoBanner' as const, label: 'Promociones', icon: 'workspace_premium', desc: 'Puntos de venta, métodos de pago, CTA', color: 'text-purple-400' },
    { key: 'howItWorks' as const, label: 'Cómo Funciona', icon: 'auto_awesome', desc: 'Pasos del proceso de reserva', color: 'text-blue-400' },
  ]

  const openEditor = (sectionKey: 'hero' | 'sportsSection' | 'promoBanner' | 'howItWorks') => {
    if (!settings) return
    setEditSection(sectionKey)
    setEditForm({ ...(settings[sectionKey] as Record<string, unknown>) })
  }

  const handleSave = async () => {
    if (!editSection || !editForm) return
    setSaving(true)
    const ok = await saveSection(editSection, editForm as never)
    setSaving(false)
    if (ok) {
      setEditSection(null)
      setEditForm(null)
      toast({ title: 'Contenido guardado', description: 'Los cambios se aplicaron correctamente' })
    } else {
      toast({ title: 'Error', description: 'No se pudo guardar el contenido', variant: 'destructive' })
    }
  }

  const updateField = (path: string, value: unknown) => {
    if (!editForm) return
    const keys = path.split('.')
    const copy = { ...editForm }
    let target: Record<string, unknown> = copy
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]] || typeof target[keys[i]] !== 'object') {
        target[keys[i]] = {}
      }
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
      if (target && typeof target === 'object' && key in (target as Record<string, unknown>)) {
        target = (target as Record<string, unknown>)[key]
      } else {
        return ''
      }
    }
    return String(target ?? '')
  }

  const getArray = (path: string): unknown[] => {
    if (!editForm) return []
    const keys = path.split('.')
    let target: unknown = editForm
    for (const key of keys) {
      if (target && typeof target === 'object' && key in (target as Record<string, unknown>)) {
        target = (target as Record<string, unknown>)[key]
      } else {
        return []
      }
    }
    return Array.isArray(target) ? target : []
  }

  const updateArrayItem = (path: string, idx: number, field: string, value: string | number) => {
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

  const updateArrayString = (path: string, idx: number, value: string) => {
    const arr = getArray(path) as string[]
    const copy = [...arr]
    copy[idx] = value
    updateField(path, copy)
  }

  const addArrayString = (path: string) => {
    const arr = getArray(path) as string[]
    const val = prompt('Nuevo elemento:')
    if (val?.trim()) updateField(path, [...arr, val.trim()])
  }

  const removeArrayString = (path: string, idx: number) => {
    const arr = getArray(path) as string[]
    updateField(path, arr.filter((_, i) => i !== idx))
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
        <div className="mb-6">
          <h2 className="font-[family-name:var(--font-sora)] font-bold text-xl text-cm-on-surface">Editor de Contenido</h2>
          <p className="text-cm-on-surface-variant text-sm mt-1 font-[family-name:var(--font-inter)]">
            Modifica el contenido visible en la página de inicio
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sections.map((sec, i) => (
            <motion.button
              key={sec.key}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => openEditor(sec.key)}
              className="glass-card rounded-xl p-5 text-left hover:border-cm-primary/30 hover:shadow-[0_0_20px_rgba(0,255,65,0.08)] transition-all duration-300 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-cm-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-cm-primary/20 transition-colors">
                  <span className={`material-symbols-outlined text-[24px] ${sec.color}`} style={{ fontVariationSettings: '"FILL" 1' }}>
                    {sec.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-[family-name:var(--font-sora)] font-bold text-sm text-cm-on-surface group-hover:text-cm-primary transition-colors">
                    {sec.label}
                  </h3>
                  <p className="text-cm-on-surface-variant text-xs mt-1 font-[family-name:var(--font-inter)]">
                    {sec.desc}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-cm-primary text-[10px] font-semibold">
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    Editar
                  </div>
                </div>
                <span className="material-symbols-outlined text-cm-on-surface-variant/30 group-hover:text-cm-primary group-hover:translate-x-0.5 transition-all">
                  arrow_forward
                </span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Quick Preview */}
        <div className="mt-6 glass-card rounded-xl p-5">
          <h3 className="font-[family-name:var(--font-sora)] font-semibold text-sm text-cm-on-surface mb-3">Vista previa rápida</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-cm-surface-container-highest/40">
              <span className="text-cm-on-surface-variant font-semibold">Hero: </span>
              <span className="text-cm-on-surface">{settings.hero.headline} <span className="text-cm-primary">{settings.hero.headlineHighlight}</span></span>
            </div>
            <div className="p-3 rounded-lg bg-cm-surface-container-highest/40">
              <span className="text-cm-on-surface-variant font-semibold">Badge: </span>
              <span className="text-cm-on-surface">{settings.hero.badge}</span>
            </div>
            <div className="p-3 rounded-lg bg-cm-surface-container-highest/40">
              <span className="text-cm-on-surface-variant font-semibold">Deportes: </span>
              <span className="text-cm-on-surface">{settings.sportsSection.sports.map((s) => s.label).join(', ')}</span>
            </div>
            <div className="p-3 rounded-lg bg-cm-surface-container-highest/40">
              <span className="text-cm-on-surface-variant font-semibold">Pasos: </span>
              <span className="text-cm-on-surface">{settings.howItWorks.steps.map((s) => s.title).join(' → ')}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════ EDIT MODAL ═══════════════ */}
      {editSection && editForm && (
        <EditModal
          open={true}
          onClose={() => { setEditSection(null); setEditForm(null) }}
          title={`Editar: ${sections.find((s) => s.key === editSection)?.label}`}
          onSave={handleSave}
          saving={saving}
        >
          {/* ─── Hero Editor ─── */}
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

              {/* Stats array */}
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

          {/* ─── Sports Editor ─── */}
          {editSection === 'sportsSection' && (
            <>
              <FormField label="Badge" value={getField('badge')} onChange={(v) => updateField('badge', v)} />
              <FormField label="Título" value={getField('title')} onChange={(v) => updateField('title', v)} />
              <FormField label="Subtítulo" value={getField('subtitle')} onChange={(v) => updateField('subtitle', v)} type="textarea" />

              {(getArray('sports') as Array<{ id: string; label: string; count: number; priceRange: string; badge: string; amenities: string[] }>).map((sport, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-cm-primary text-xs font-bold font-[family-name:var(--font-sora)]">
                    <span className="material-symbols-outlined text-[16px]">sports</span>
                    {sport.label || `Deporte #${idx + 1}`}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="Nombre" value={sport.label} onChange={(v) => updateArrayItem('sports', idx, 'label', v)} />
                    <FormField label="Precio" value={sport.priceRange} onChange={(v) => updateArrayItem('sports', idx, 'priceRange', v)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="Cantidad" value={String(sport.count)} onChange={(v) => updateArrayItem('sports', idx, 'count', v)} type="number" />
                    <FormField label="Badge" value={sport.badge} onChange={(v) => updateArrayItem('sports', idx, 'badge', v)} />
                  </div>
                  <ArrayField label="Amenidades" items={sport.amenities} onChange={(items) => updateArrayItem('sports', idx, 'amenities', items)} />
                </div>
              ))}
            </>
          )}

          {/* ─── Promo Editor ─── */}
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
                {(getArray('sellingPoints') as Array<{ title: string; description: string; icon: string; highlight: boolean }>).map((pt, idx) => (
                  <div key={idx} className="p-2 rounded-lg border border-white/10 mb-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-cm-on-surface-variant font-semibold">#{idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-[10px] text-cm-primary cursor-pointer">
                          <input type="checkbox" checked={pt.highlight} onChange={(e) => updateArrayItem('sellingPoints', idx, 'highlight', e.target.checked)} className="accent-green-500" />
                          Destacado
                        </label>
                        <button type="button" onClick={() => removeArrayItem('sellingPoints', idx)} className="p-1 rounded text-red-400 hover:bg-red-500/10"><span className="material-symbols-outlined text-[14px]">delete</span></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <FormField label="Icono" value={pt.icon} onChange={(v) => updateArrayItem('sellingPoints', idx, 'icon', v)} />
                      <FormField label="Título" value={pt.title} onChange={(v) => updateArrayItem('sellingPoints', idx, 'title', v)} />
                      <FormField label="Descripción" value={pt.description} onChange={(v) => updateArrayItem('sellingPoints', idx, 'description', v)} />
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
                {(getArray('paymentMethods') as Array<{ name: string; icon: string; color: string }>).map((pm, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <input value={pm.name} onChange={(e) => updateArrayItem('paymentMethods', idx, 'name', e.target.value)} placeholder="Nombre" className="flex-1 px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]" />
                    <input value={pm.icon} onChange={(e) => updateArrayItem('paymentMethods', idx, 'icon', e.target.value)} placeholder="Icono" className="w-28 px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]" />
                    <button type="button" onClick={() => removeArrayItem('paymentMethods', idx)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ─── HowItWorks Editor ─── */}
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
                {(getArray('steps') as Array<{ number: string; title: string; description: string; icon: string; detail: string }>).map((step, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-white/10 mb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-cm-primary font-bold font-[family-name:var(--font-sora)]">Paso {step.number || idx + 1}</span>
                      <button type="button" onClick={() => removeArrayItem('steps', idx)} className="p-1 rounded text-red-400 hover:bg-red-500/10"><span className="material-symbols-outlined text-[14px]">delete</span></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField label="Título" value={step.title} onChange={(v) => updateArrayItem('steps', idx, 'title', v)} />
                      <FormField label="Icono" value={step.icon} onChange={(v) => updateArrayItem('steps', idx, 'icon', v)} />
                    </div>
                    <FormField label="Descripción" value={step.description} onChange={(v) => updateArrayItem('steps', idx, 'description', v)} type="textarea" rows={2} />
                    <FormField label="Detalle" value={step.detail} onChange={(v) => updateArrayItem('steps', idx, 'detail', v)} />
                  </div>
                ))}
              </div>
            </>
          )}
        </EditModal>
      )}
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
  const [allCourts, setAllCourts] = useState<Array<{ id: string; name: string }>>([])

  /* filters */
  const [statusFilter, setStatusFilter] = useState<string>('all')

  /* expense form */
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expForm, setExpForm] = useState({ description: '', amount: '', category: 'mantenimiento', date: todayStr(), notes: '' })
  const [submittingExpense, setSubmittingExpense] = useState(false)

  /* loading */
  const [loading, setLoading] = useState(true)

  /* schedule modal */
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleDate, setScheduleDate] = useState(todayStr())

  /* ─── fetch all data ─── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [statsRes, bookingsRes, expensesRes, courtsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/bookings'),
        fetch('/api/expenses'),
        fetch('/api/courts'),
      ])

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

  /* ─── computed ─── */
  const today = todayStr()
  const todayBookings = bookings.filter((b) => b.date === today && !['cancelled', 'expired'].includes(b.status))
  const todayPaid = bookings.filter((b) => b.date === today && ['completed', 'fully_paid'].includes(b.status))
  const todayRevenue = todayPaid.reduce((s, b) => s + b.totalPrice, 0)
  const pendingPayments = bookings.filter((b) => ['confirmed', 'partially_paid'].includes(b.status))
  const pendingTotal = pendingPayments.reduce((s, b) => s + b.remainingAmount, 0)

  const filteredBookings = statusFilter === 'all' ? bookings : bookings.filter((b) => b.status === statusFilter)

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const totalIncome = bookings
    .filter((b) => ['completed', 'fully_paid'].includes(b.status))
    .reduce((s, b) => s + b.totalPrice, 0)
  const totalAdvances = bookings
    .filter((b) => ['partially_paid', 'fully_paid', 'completed'].includes(b.status))
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
    if (['completed', 'fully_paid'].includes(b.status)) {
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
  const scheduleBookings = bookings.filter((b) => b.date === scheduleDate && !['cancelled', 'expired'].includes(b.status))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  const scheduleCourts = allCourts.map((c) => ({
    ...c,
    bookings: scheduleBookings.filter((b) => b.courtId === c.id),
  }))

  /* time slots */
  const timeSlots = []
  for (let h = 6; h <= 23; h++) {
    timeSlots.push(`${String(h).padStart(2, '0')}:00`)
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

              {/* Schedule button */}
              <button
                onClick={() => setShowSchedule(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-cm-primary/10 text-cm-primary text-sm font-semibold rounded-xl hover:bg-cm-primary/20 transition-colors mb-4"
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>view_timeline</span>
                Ver Todos los Horarios
              </button>

              {/* Bookings table */}
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
                      {filteredBookings.length === 0 ? (
                        <tr><td colSpan={9} className="text-center py-12 text-cm-on-surface-variant font-[family-name:var(--font-inter)]">No hay reservas con este filtro</td></tr>
                      ) : (
                        filteredBookings.map((b) => {
                          const st = statusConfig[b.status] || statusConfig.pending
                          return (
                            <tr key={b.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3 text-cm-on-surface font-[family-name:var(--font-inter)]">{fmtDate(b.date)}</td>
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
                                <select
                                  value={b.status}
                                  onChange={(e) => handleUpdateStatus(b.id, e.target.value)}
                                  className="bg-cm-surface-container-highest/60 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                                >
                                  <option value="pending">Pendiente</option>
                                  <option value="confirmed">Confirmada</option>
                                  <option value="partially_paid">Parcial</option>
                                  <option value="fully_paid">Completo</option>
                                  <option value="completed">Completada</option>
                                  <option value="cancelled">Cancelada</option>
                                  <option value="no_show">No Asistió</option>
                                </select>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
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
                          {timeSlots.map((slot) => {
                            const booking = court.bookings.find((b) => b.startTime === slot)
                            return (
                              <div
                                key={slot}
                                className={`flex-1 h-10 rounded-md flex items-center justify-center text-[10px] font-medium transition-all ${
                                  booking
                                    ? 'bg-cm-primary/20 text-cm-primary border border-cm-primary/30'
                                    : 'bg-cm-surface-container-highest/30 text-cm-on-surface-variant/30 border border-transparent'
                                }`}
                                title={booking ? `${booking.user?.name || 'Cliente'} (${booking.startTime}-${booking.endTime})` : 'Disponible'}
                              >
                                {booking ? (
                                  <span className="truncate px-1">{(booking.user?.name || 'Cliente').split(' ')[0]}</span>
                                ) : (
                                  <span className="opacity-0 sm:opacity-100">{slot.slice(0, 2)}</span>
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
