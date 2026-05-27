'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, useInView } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useSiteSettings } from '@/context/SiteSettingsContext'
import { SectionEditButton, EditModal, FormField, ArrayField } from './SectionEditor'
import { toast } from '@/hooks/use-toast'

// --- Animated Counter Component ---
function AnimatedCounter({ target, duration = 2, suffix = '' }: { target: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const hasStarted = useRef(false)

  useEffect(() => {
    if (!isInView || hasStarted.current) return
    hasStarted.current = true

    const startTime = performance.now()
    const from = 0
    const to = target

    function update(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(from + (to - from) * eased)
      setCount(current)
      if (progress < 1) {
        requestAnimationFrame(update)
      }
    }
    requestAnimationFrame(update)
  }, [isInView, target, duration])

  return (
    <span ref={ref}>
      {count}{suffix}
    </span>
  )
}

// --- Date Chips ---
function getDateChips() {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const chips: { date: Date; label: string; dayName: string; isToday: boolean }[] = []

  for (let i = 0; i < 4; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    chips.push({
      date: d,
      label: `${d.getDate()} ${months[d.getMonth()]}`,
      dayName: i === 0 ? 'Hoy' : days[d.getDay()],
      isToday: i === 0,
    })
  }
  return chips
}

// --- Sport Options ---
const sportOptions = [
  { value: 'todos', label: 'Todos los deportes', icon: 'sports' },
  { value: 'futbol', label: 'Fútbol 7', icon: 'sports_soccer' },
  { value: 'voley', label: 'Vóley', icon: 'sports_volleyball' },
]

// --- Gradient Mesh ---
function GradientMesh() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(0,255,65,0.3) 0%, transparent 70%)' }}
        animate={{ x: [0, 50, -30, 0], y: [0, -30, 50, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 -right-20 w-[400px] h-[400px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(0,255,65,0.25) 0%, transparent 70%)' }}
        animate={{ x: [0, -40, 30, 0], y: [0, 40, -20, 0], scale: [1, 0.9, 1.15, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-20 left-1/3 w-[350px] h-[350px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, rgba(0,230,57,0.2) 0%, transparent 70%)' }}
        animate={{ x: [0, 60, -40, 0], y: [0, -50, 30, 0], scale: [1, 1.2, 0.85, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

export default function HeroSection() {
  const { setView, setSportFilter, setSelectedDate } = useAppStore()
  const { settings, saveSection } = useSiteSettings()
  const { hero: defaults } = settings || {
    hero: {
      location: 'San Sebastián, Cusco',
      badge: 'La #1 en reservas deportivas del Cusco',
      headline: 'Reserva tu cancha',
      headlineHighlight: 'en segundos',
      subtitle: '4 canchas de fútbol 7 y 2 canchas de vóley profesional. Reserva fácil, paga con Yape y disfruta sin complicaciones.',
      promoHighlight: '50% de adelanto',
      promoText: ', paga el resto al llegar',
      backgroundImage: '',
      secondaryImage: '',
      stats: [
        { label: 'Espacios', value: 6 },
        { label: 'Fútbol 7', value: 4 },
        { label: 'Vóley', value: 2 },
      ],
    },
  }

  const [selectedSport, setSelectedSport] = useState('todos')
  const [selectedDateIdx, setSelectedDateIdx] = useState(0)
  const [availableSlots, setAvailableSlots] = useState<number | null>(null)
  const dateChips = getDateChips()
  const sectionRef = useRef<HTMLElement>(null)
  const isSectionInView = useInView(sectionRef, { once: true, margin: '-100px' })

  // Edit state
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(defaults)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings) setEditForm(settings.hero)
  }, [settings])

  // Fetch available slots
  useEffect(() => {
    fetch('/api/courts')
      .then((res) => res.json())
      .then((data) => {
        const courtCount = Array.isArray(data) ? data.length : 6
        setAvailableSlots(Math.round(courtCount * 8.5))
      })
      .catch(() => {
        setAvailableSlots(51)
      })
  }, [])

  const handleSearch = useCallback(() => {
    setSportFilter(selectedSport)
    const date = dateChips[selectedDateIdx].date
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    setSelectedDate(dateStr)
    setView('search')
  }, [selectedSport, selectedDateIdx, dateChips, setSportFilter, setSelectedDate, setView])

  const handleSave = async () => {
    setSaving(true)
    const ok = await saveSection('hero', editForm)
    setSaving(false)
    if (ok) {
      setEditOpen(false)
      toast({ title: 'Sección actualizada', description: 'Los cambios del Hero fueron guardados' })
    } else {
      toast({ title: 'Error', description: 'No se pudieron guardar los cambios', variant: 'destructive' })
    }
  }

  const updateStat = (idx: number, field: 'label' | 'value', val: string) => {
    const copy = [...editForm.stats]
    copy[idx] = { ...copy[idx], [field]: field === 'value' ? parseInt(val) || 0 : val }
    setEditForm({ ...editForm, stats: copy })
  }
  const removeStat = (idx: number) => {
    setEditForm({ ...editForm, stats: editForm.stats.filter((_, i) => i !== idx) })
  }
  const addStat = () => {
    setEditForm({ ...editForm, stats: [...editForm.stats, { label: 'Nuevo', value: 0 }] })
  }

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.4, 0.25, 1] } },
  }

  return (
    <>
      <SectionEditButton onClick={() => setEditOpen(true)} label="Editar Hero" />

      <section ref={sectionRef} className="relative overflow-hidden pt-8 pb-12 md:pt-12 md:pb-20 px-4">
        <GradientMesh />

        {/* Background image (uploaded by admin) */}
        {defaults.backgroundImage && (
          <div className="absolute inset-0 z-0">
            <img
              src={defaults.backgroundImage}
              alt=""
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
          </div>
        )}

        <motion.div
          className="relative max-w-4xl mx-auto text-center"
          variants={containerVariants}
          initial="hidden"
          animate={isSectionInView ? 'visible' : 'hidden'}
        >
          {/* Location Badge */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-1.5 mb-4">
            <span className="material-symbols-outlined text-cm-on-surface-variant text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>
              location_on
            </span>
            <span className="text-cm-on-surface-variant text-xs font-medium tracking-wide uppercase font-[family-name:var(--font-inter)]">
              {defaults.location}
            </span>
          </motion.div>

          {/* Hero Badge */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cm-primary/10 border border-cm-primary/20 mb-6"
          >
            <span className="material-symbols-outlined text-cm-primary text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>
              bolt
            </span>
            <span className="text-xs font-semibold text-cm-primary uppercase tracking-wider font-[family-name:var(--font-inter)]">
              {defaults.badge}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="font-[family-name:var(--font-sora)] text-[36px] sm:text-[48px] md:text-[64px] lg:text-[72px] font-extrabold leading-[1.08] text-cm-on-surface mb-5"
          >
            {defaults.headline}{' '}
            <span className="text-cm-primary text-glow">{defaults.headlineHighlight}</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-cm-on-surface-variant text-base md:text-lg max-w-2xl mx-auto mb-8 font-[family-name:var(--font-inter)] leading-relaxed"
          >
            {defaults.subtitle}
          </motion.p>

          {/* Search Bar */}
          <motion.div variants={itemVariants} className="glass-card rounded-2xl p-3 md:p-4 max-w-2xl mx-auto glow-border">
            {/* Date Chips */}
            <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar px-1">
              {dateChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedDateIdx(idx)}
                  className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 min-w-[64px] ${
                    selectedDateIdx === idx
                      ? 'bg-cm-primary text-cm-on-primary shadow-lg shadow-cm-primary/20'
                      : 'bg-cm-surface-container-highest/60 text-cm-on-surface-variant hover:bg-cm-surface-container-highest'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider font-bold">{chip.dayName}</span>
                  <span className="text-sm mt-0.5 font-semibold font-[family-name:var(--font-sora)]">{chip.label}</span>
                </button>
              ))}
            </div>

            {/* Sport Select + Search */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cm-on-surface-variant text-[20px]">
                  {sportOptions.find((s) => s.value === selectedSport)?.icon || 'sports'}
                </span>
                <select
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm appearance-none cursor-pointer focus:outline-none focus:border-cm-primary/50 focus:ring-1 focus:ring-cm-primary/20 transition-all font-[family-name:var(--font-inter)]"
                >
                  {sportOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-cm-surface-container-highest text-cm-on-surface">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSearch}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-cm-primary text-cm-on-primary font-semibold rounded-xl hover:bg-cm-primary-dim transition-all duration-200 glow-accent font-[family-name:var(--font-sora)] active:scale-[0.97]"
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                  search
                </span>
                <span className="hidden sm:inline">Buscar</span>
              </button>
            </div>
          </motion.div>

          {/* Featured Promo Banner */}
          <motion.div
            variants={itemVariants}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cm-primary/10 via-cm-primary/5 to-transparent border border-cm-primary/15"
          >
            <span className="material-symbols-outlined text-cm-primary text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>
              local_offer
            </span>
            <span className="text-cm-on-surface text-xs md:text-sm font-medium font-[family-name:var(--font-inter)]">
              <span className="text-cm-primary font-bold">{defaults.promoHighlight}</span>{defaults.promoText}
            </span>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap justify-center gap-8 md:gap-14 mt-10 md:mt-14"
          >
            {defaults.stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <p className="font-[family-name:var(--font-sora)] text-3xl md:text-4xl font-bold text-cm-primary text-glow">
                  <AnimatedCounter target={stat.value} duration={2} />
                </p>
                <p className="text-cm-on-surface-variant text-sm mt-1 font-[family-name:var(--font-inter)]">
                  {stat.label}
                </p>
              </div>
            ))}
            <div className="text-center">
              <p className="font-[family-name:var(--font-sora)] text-3xl md:text-4xl font-bold text-cm-primary text-glow">
                <AnimatedCounter target={availableSlots ?? 51} duration={2.5} />
              </p>
              <p className="text-cm-on-surface-variant text-sm mt-1 font-[family-name:var(--font-inter)]">
                Horarios hoy
              </p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════ EDIT MODAL ═══════ */}
      <EditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar Sección Hero"
        onSave={handleSave}
        saving={saving}
      >
        <FormField
          label="Ubicación"
          value={editForm.location}
          onChange={(v) => setEditForm({ ...editForm, location: v })}
          placeholder="Ej. San Sebastián, Cusco"
        />
        <FormField
          label="Badge principal"
          value={editForm.badge}
          onChange={(v) => setEditForm({ ...editForm, badge: v })}
          placeholder="Ej. La #1 en reservas deportivas del Cusco"
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="Título (headline)"
            value={editForm.headline}
            onChange={(v) => setEditForm({ ...editForm, headline: v })}
            placeholder="Reserva tu cancha"
          />
          <FormField
            label="Highlight"
            value={editForm.headlineHighlight}
            onChange={(v) => setEditForm({ ...editForm, headlineHighlight: v })}
            placeholder="en segundos"
          />
        </div>
        <FormField
          label="Subtítulo"
          value={editForm.subtitle}
          onChange={(v) => setEditForm({ ...editForm, subtitle: v })}
          type="textarea"
          placeholder="Descripción principal..."
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="Promo highlight"
            value={editForm.promoHighlight}
            onChange={(v) => setEditForm({ ...editForm, promoHighlight: v })}
            placeholder="50% de adelanto"
          />
          <FormField
            label="Promo texto"
            value={editForm.promoText}
            onChange={(v) => setEditForm({ ...editForm, promoText: v })}
            placeholder=", paga el resto al llegar"
          />
        </div>

        {/* Hero Images */}
        <div>
          <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1.5 block">
            Imágenes del Hero
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              {editForm.backgroundImage ? (
                <div className="relative rounded-xl overflow-hidden border border-white/10 mb-1.5">
                  <img src={editForm.backgroundImage} alt="Fondo" className="w-full h-24 object-cover" />
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, backgroundImage: '' })}
                    className="absolute top-1 right-1 p-1 rounded-lg bg-red-500/80 text-white hover:bg-red-500"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ) : null}
              <label className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-white/10 text-cm-on-surface-variant hover:border-cm-primary/30 hover:text-cm-primary cursor-pointer transition-all text-xs font-medium">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const fd = new FormData()
                    fd.append('file', file)
                    fd.append('folder', 'hero')
                    try {
                      const res = await fetch('/api/upload', { method: 'POST', body: fd })
                      if (res.ok) {
                        const data = await res.json()
                        setEditForm({ ...editForm, backgroundImage: data.url })
                      }
                    } catch { /* silent */ }
                    e.target.value = ''
                  }}
                />
                <span className="material-symbols-outlined text-[14px]">cloud_upload</span>
                Fondo
              </label>
            </div>
            <div>
              {editForm.secondaryImage ? (
                <div className="relative rounded-xl overflow-hidden border border-white/10 mb-1.5">
                  <img src={editForm.secondaryImage} alt="Secundaria" className="w-full h-24 object-cover" />
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, secondaryImage: '' })}
                    className="absolute top-1 right-1 p-1 rounded-lg bg-red-500/80 text-white hover:bg-red-500"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ) : null}
              <label className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-white/10 text-cm-on-surface-variant hover:border-cm-primary/30 hover:text-cm-primary cursor-pointer transition-all text-xs font-medium">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const fd = new FormData()
                    fd.append('file', file)
                    fd.append('folder', 'hero')
                    try {
                      const res = await fetch('/api/upload', { method: 'POST', body: fd })
                      if (res.ok) {
                        const data = await res.json()
                        setEditForm({ ...editForm, secondaryImage: data.url })
                      }
                    } catch { /* silent */ }
                    e.target.value = ''
                  }}
                />
                <span className="material-symbols-outlined text-[14px]">cloud_upload</span>
                Secundaria
              </label>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">
              Estadísticas
            </label>
            <button
              type="button"
              onClick={addStat}
              className="text-[10px] font-semibold text-cm-primary hover:text-cm-primary-dim flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Agregar
            </button>
          </div>
          <div className="space-y-2">
            {editForm.stats.map((stat, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  value={stat.label}
                  onChange={(e) => updateStat(idx, 'label', e.target.value)}
                  placeholder="Etiqueta"
                  className="flex-1 px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-sm text-cm-on-surface placeholder:text-cm-on-surface-variant/50 focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                />
                <input
                  type="number"
                  value={stat.value}
                  onChange={(e) => updateStat(idx, 'value', e.target.value)}
                  placeholder="0"
                  className="w-20 px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-sm text-cm-on-surface text-center focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                />
                <button
                  type="button"
                  onClick={() => removeStat(idx)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </EditModal>
    </>
  )
}
