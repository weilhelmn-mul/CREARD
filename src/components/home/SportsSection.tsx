'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import { useAppStore } from '@/store/useAppStore'
import { motion, useInView } from 'framer-motion'
import { useSiteSettings, type SportItem, type PricingDetail } from '@/context/SiteSettingsContext'
import { SectionEditButton, EditModal, FormField, ArrayField } from './SectionEditor'
import { toast } from '@/hooks/use-toast'

const amenityLabels: Record<string, string> = {
  'cesped sintetico': 'Cesped Sintetico',
  'iluminacion led': 'Iluminacion LED',
  'vestuarios': 'Vestuarios',
  'duchas': 'Duchas',
  'estacionamiento': 'Estacionamiento',
  'piso pvc profesional': 'Piso PVC Pro',
  'red reglamentaria': 'Red Reglamentaria',
  'techado': 'Techado',
}

// Default sports for when settings haven't loaded
const defaultSports: SportItem[] = [
  {
    id: 'futbol', label: 'Fútbol 7', icon: 'sports_soccer', image: '/cancha-futbol-1.png',
    count: 4, priceRange: 'S/. 35', badge: '3ra cancha techada',
    amenities: ['Cesped sintetico', 'Iluminacion LED', 'Vestuarios', 'Duchas', 'Estacionamiento'],
    pricingDetails: [
      { label: 'Mañana', timeRange: '7:00 AM - 5:00 PM', price: 35 },
      { label: 'Noche', timeRange: '6:00 PM - 10:00 PM', price: 50 },
    ],
  },
  {
    id: 'voley', label: 'Vóley', icon: 'sports_volleyball', image: '/cancha-voley.png',
    count: 2, priceRange: 'S/. 30', badge: '',
    amenities: ['Piso PVC profesional', 'Red reglamentaria', 'Iluminacion LED', 'Techado'],
    pricingDetails: [
      { label: 'Mañana', timeRange: '7:00 AM - 5:00 PM', price: 30 },
      { label: 'Noche', timeRange: '6:00 PM - 10:00 PM', price: 45 },
    ],
  },
]

export default function SportsSection() {
  const { setView, setSportFilter } = useAppStore()
  const { settings, saveSection } = useSiteSettings()
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  const section = settings?.sportsSection
  const sports = section?.sports?.length ? section.sports : defaultSports

  // Edit state
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    badge: section?.badge || 'Nuestras Instalaciones',
    title: section?.title || 'Deporte de primer nivel',
    subtitle: section?.subtitle || '6 espacios disponibles con la mejor infraestructura deportiva del Cusco',
    sports: sports,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (section) {
      setEditForm({
        badge: section.badge,
        title: section.title,
        subtitle: section.subtitle,
        sports: section.sports?.length ? section.sports : defaultSports,
      })
    }
  }, [section])

  const handleSportClick = (sportId: string) => {
    setSportFilter(sportId)
    setView('search')
  }

  const handleSave = async () => {
    setSaving(true)
    const ok = await saveSection('sportsSection', editForm)
    setSaving(false)
    if (ok) {
      setEditOpen(false)
      toast({ title: 'Sección actualizada', description: 'Los cambios de Instalaciones fueron guardados' })
    } else {
      toast({ title: 'Error', description: 'No se pudieron guardar los cambios', variant: 'destructive' })
    }
  }

  const updateSport = (idx: number, field: keyof SportItem, val: string | string[]) => {
    const copy = [...editForm.sports] as SportItem[]
    copy[idx] = { ...copy[idx], [field]: val }
    setEditForm({ ...editForm, sports: copy })
  }

  return (
    <>
      <SectionEditButton onClick={() => setEditOpen(true)} label="Editar Instalaciones" />

      <section ref={sectionRef} className="py-12 md:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-10 md:mb-14"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cm-primary/10 border border-cm-primary/15 mb-4">
              <span className="material-symbols-outlined text-cm-primary text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                emoji_events
              </span>
              <span className="text-xs font-semibold text-cm-primary uppercase tracking-wider font-[family-name:var(--font-inter)]">
                {section?.badge || 'Nuestras Instalaciones'}
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-sora)] text-2xl md:text-3xl font-bold text-cm-on-surface">
              {section?.title || 'Deporte de primer nivel'}
            </h2>
            <p className="text-cm-on-surface-variant text-sm md:text-base mt-2 max-w-lg mx-auto font-[family-name:var(--font-inter)]">
              {section?.subtitle || '6 espacios disponibles con la mejor infraestructura deportiva del Cusco'}
            </p>
          </motion.div>

          {/* Sport Cards */}
          <div className="space-y-5 md:space-y-6">
            {sports.map((sport, index) => (
              <motion.button
                key={sport.id}
                initial={{ opacity: 0, y: 40, scale: 0.97 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{
                  duration: 0.7,
                  delay: index * 0.15,
                  ease: [0.25, 0.4, 0.25, 1],
                }}
                onClick={() => handleSportClick(sport.id)}
                className="w-full text-left glass-card rounded-2xl overflow-hidden group hover:border-cm-primary/30 hover:shadow-[0_0_30px_rgba(0,255,65,0.08)] transition-all duration-400 cursor-pointer"
              >
                <div className="relative h-52 md:h-72">
                  <Image
                    src={sport.image}
                    alt={sport.label}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-green-900/80 to-cm-background/95" />
                  <div className="absolute inset-0 p-5 md:p-8 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-cm-primary/20 backdrop-blur-sm border border-cm-primary/30 flex items-center justify-center">
                          <span className="material-symbols-outlined text-cm-primary text-[24px] md:text-[28px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                            {sport.icon}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-[family-name:var(--font-sora)] text-xl md:text-2xl font-bold text-cm-on-surface">
                            {sport.label}
                          </h3>
                          <p className="text-cm-on-surface-variant text-sm font-[family-name:var(--font-inter)]">
                            {sport.count} {sport.count === 1 ? 'espacio disponible' : 'espacios disponibles'}
                          </p>
                        </div>
                      </div>
                      {sport.badge && (
                        <div className="px-3 py-1.5 rounded-full bg-cm-primary/20 backdrop-blur-sm border border-cm-primary/30">
                          <span className="text-cm-primary text-xs font-bold font-[family-name:var(--font-inter)]">
                            {sport.badge}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-end justify-between gap-4">
                      <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                        {sport.amenities.slice(0, 4).map((amenity, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-[10px] md:text-xs font-medium"
                          >
                            <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                              check
                            </span>
                            {amenityLabels[amenity.toLowerCase()] || amenity}
                          </span>
                        ))}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {sport.pricingDetails && sport.pricingDetails.length > 0 ? (
                          <div className="space-y-1">
                            {sport.pricingDetails.map((pd, pi) => (
                              <div key={pi} className="flex items-center gap-2 justify-end">
                                <span className="text-cm-on-surface-variant text-[10px] md:text-[11px] font-medium">
                                  {pd.label}
                                </span>
                                <span className="font-[family-name:var(--font-sora)] text-lg md:text-xl font-bold text-cm-primary text-glow">
                                  S/. {pd.price}
                                  <span className="text-[10px] text-cm-on-surface-variant font-normal">/hr</span>
                                </span>
                              </div>
                            ))}
                            <p className="text-cm-on-surface-variant text-[9px] md:text-[10px] font-medium">
                              {sport.pricingDetails[0].timeRange} / {sport.pricingDetails[sport.pricingDetails.length - 1].timeRange}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-cm-on-surface-variant text-[10px] md:text-xs font-medium">Desde</p>
                            <p className="font-[family-name:var(--font-sora)] text-2xl md:text-3xl font-bold text-cm-primary text-glow">
                              {sport.priceRange}
                              <span className="text-xs md:text-sm text-cm-on-surface-variant font-normal">/hr</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ EDIT MODAL ═══════ */}
      <EditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar Sección Instalaciones"
        onSave={handleSave}
        saving={saving}
      >
        <FormField
          label="Badge"
          value={editForm.badge}
          onChange={(v) => setEditForm({ ...editForm, badge: v })}
        />
        <FormField
          label="Título"
          value={editForm.title}
          onChange={(v) => setEditForm({ ...editForm, title: v })}
        />
        <FormField
          label="Subtítulo"
          value={editForm.subtitle}
          onChange={(v) => setEditForm({ ...editForm, subtitle: v })}
          type="textarea"
        />

        {/* Edit each sport */}
        <div className="space-y-4">
          <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">
            Deportes ({editForm.sports.length})
          </label>
          {editForm.sports.map((sport, idx) => (
            <div key={sport.id} className="p-3 rounded-xl border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-cm-primary text-xs font-bold font-[family-name:var(--font-sora)]">
                <span className="material-symbols-outlined text-[16px]">{sport.icon}</span>
                {sport.label}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  label="Nombre"
                  value={sport.label}
                  onChange={(v) => updateSport(idx, 'label', v)}
                />
                <FormField
                  label="Precio Desde"
                  value={sport.priceRange}
                  onChange={(v) => updateSport(idx, 'priceRange', v)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  label="Cantidad de espacios"
                  value={String(sport.count)}
                  onChange={(v) => updateSport(idx, 'count', v)}
                  type="number"
                />
                <FormField
                  label="Badge"
                  value={sport.badge}
                  onChange={(v) => updateSport(idx, 'badge', v)}
                  placeholder="Dejar vacío si no tiene"
                />
              </div>

              {/* Pricing Details Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">
                    Precios por turno
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const details = [...(sport.pricingDetails || []), { label: 'Nuevo', timeRange: '', price: 0 }]
                      const copy = [...editForm.sports] as SportItem[]
                      copy[idx] = { ...copy[idx], pricingDetails: details }
                      setEditForm({ ...editForm, sports: copy })
                    }}
                    className="text-[10px] font-semibold text-cm-primary hover:text-cm-primary-dim flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[12px]">add</span>
                    Agregar turno
                  </button>
                </div>
                <div className="space-y-1.5">
                  {(sport.pricingDetails || []).map((pd: PricingDetail, pi: number) => (
                    <div key={pi} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-cm-surface-container-highest/30">
                      <input
                        value={pd.label}
                        onChange={(e) => {
                          const details = [...(sport.pricingDetails || [])]
                          details[pi] = { ...details[pi], label: e.target.value }
                          const copy = [...editForm.sports] as SportItem[]
                          copy[idx] = { ...copy[idx], pricingDetails: details }
                          setEditForm({ ...editForm, sports: copy })
                        }}
                        placeholder="Mañana"
                        className="w-16 px-2 py-1 bg-transparent border border-white/10 rounded text-[10px] text-cm-on-surface focus:outline-none focus:border-cm-primary/40"
                      />
                      <input
                        value={pd.timeRange}
                        onChange={(e) => {
                          const details = [...(sport.pricingDetails || [])]
                          details[pi] = { ...details[pi], timeRange: e.target.value }
                          const copy = [...editForm.sports] as SportItem[]
                          copy[idx] = { ...copy[idx], pricingDetails: details }
                          setEditForm({ ...editForm, sports: copy })
                        }}
                        placeholder="7:00 AM - 5:00 PM"
                        className="flex-1 px-2 py-1 bg-transparent border border-white/10 rounded text-[10px] text-cm-on-surface focus:outline-none focus:border-cm-primary/40"
                      />
                      <div className="flex items-center gap-0.5">
                        <span className="text-[10px] text-cm-on-surface-variant">S/.</span>
                        <input
                          type="number"
                          value={pd.price}
                          onChange={(e) => {
                            const details = [...(sport.pricingDetails || [])]
                            details[pi] = { ...details[pi], price: parseInt(e.target.value) || 0 }
                            const copy = [...editForm.sports] as SportItem[]
                            copy[idx] = { ...copy[idx], pricingDetails: details }
                            setEditForm({ ...editForm, sports: copy })
                          }}
                          placeholder="0"
                          className="w-14 px-2 py-1 bg-transparent border border-white/10 rounded text-[10px] text-cm-on-surface text-center focus:outline-none focus:border-cm-primary/40"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const details = (sport.pricingDetails || []).filter((_: PricingDetail, i: number) => i !== pi)
                          const copy = [...editForm.sports] as SportItem[]
                          copy[idx] = { ...copy[idx], pricingDetails: details }
                          setEditForm({ ...editForm, sports: copy })
                        }}
                        className="p-0.5 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <ArrayField
                label="Amenidades"
                items={sport.amenities}
                onChange={(items) => updateSport(idx, 'amenities', items)}
              />
            </div>
          ))}
        </div>
      </EditModal>
    </>
  )
}
