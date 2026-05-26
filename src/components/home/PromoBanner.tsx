'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useSiteSettings, type SellingPoint, type PaymentMethod } from '@/context/SiteSettingsContext'
import { SectionEditButton, EditModal, FormField } from './SectionEditor'
import { toast } from '@/hooks/use-toast'

// Defaults
const defaultSellingPoints: SellingPoint[] = [
  { icon: 'percent', title: '50% de adelanto', description: 'Solo necesitas pagar la mitad para confirmar tu reserva. El resto lo pagas al llegar.', highlight: true },
  { icon: 'forum', title: 'Confirmación instantánea', description: 'Recibe tu confirmación por WhatsApp en segundos con todos los detalles de tu reserva.', highlight: false },
  { icon: 'schedule', title: 'Atención 7 días', description: 'Abierto de lunes a domingo de 7:00 AM a 11:00 PM. Siempre disponible para ti.', highlight: false },
  { icon: 'verified', title: 'Sin comisiones', description: 'El precio que ves es el que pagas. Sin cargos ocultos ni sorpresas en tu reserva.', highlight: false },
]

const defaultPaymentMethods: PaymentMethod[] = [
  { name: 'Yape', icon: 'account_balance_wallet', color: 'text-purple-400' },
  { name: 'Plin', icon: 'phone_iphone', color: 'text-blue-400' },
  { name: 'Efectivo', icon: 'payments', color: 'text-green-400' },
  { name: 'Tarjeta', icon: 'credit_card', color: 'text-yellow-400' },
]

export default function PromoBanner() {
  const { setView } = useAppStore()
  const { settings, saveSection } = useSiteSettings()
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  const section = settings?.promoBanner
  const sellingPoints = section?.sellingPoints?.length ? section.sellingPoints : defaultSellingPoints
  const paymentMethods = section?.paymentMethods?.length ? section.paymentMethods : defaultPaymentMethods

  // Edit state
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    badge: section?.badge || 'Por qué elegir CREARD',
    title: section?.title || 'La experiencia completa',
    subtitle: section?.subtitle || 'Reserva fácil, paga seguro, juega sin preocupaciones',
    ctaText: section?.ctaText || 'Reservar mi cancha ahora',
    sellingPoints,
    paymentMethods,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (section) {
      setEditForm({
        badge: section.badge,
        title: section.title,
        subtitle: section.subtitle,
        ctaText: section.ctaText,
        sellingPoints: section.sellingPoints?.length ? section.sellingPoints : defaultSellingPoints,
        paymentMethods: section.paymentMethods?.length ? section.paymentMethods : defaultPaymentMethods,
      })
    }
  }, [section])

  const handleSave = async () => {
    setSaving(true)
    const ok = await saveSection('promoBanner', editForm)
    setSaving(false)
    if (ok) {
      setEditOpen(false)
      toast({ title: 'Sección actualizada', description: 'Los cambios del Promo fueron guardados' })
    } else {
      toast({ title: 'Error', description: 'No se pudieron guardar los cambios', variant: 'destructive' })
    }
  }

  const updatePoint = (idx: number, field: keyof SellingPoint, val: string | boolean) => {
    const copy = [...editForm.sellingPoints] as SellingPoint[]
    copy[idx] = { ...copy[idx], [field]: val }
    setEditForm({ ...editForm, sellingPoints: copy })
  }

  const addPoint = () => {
    setEditForm({
      ...editForm,
      sellingPoints: [...editForm.sellingPoints, { icon: 'star', title: '', description: '', highlight: false }],
    })
  }
  const removePoint = (idx: number) => {
    setEditForm({ ...editForm, sellingPoints: editForm.sellingPoints.filter((_, i) => i !== idx) })
  }

  const updatePayment = (idx: number, field: keyof PaymentMethod, val: string) => {
    const copy = [...editForm.paymentMethods] as PaymentMethod[]
    copy[idx] = { ...copy[idx], [field]: val }
    setEditForm({ ...editForm, paymentMethods: copy })
  }
  const addPayment = () => {
    setEditForm({
      ...editForm,
      paymentMethods: [...editForm.paymentMethods, { name: '', icon: 'payments', color: 'text-gray-400' }],
    })
  }
  const removePayment = (idx: number) => {
    setEditForm({ ...editForm, paymentMethods: editForm.paymentMethods.filter((_, i) => i !== idx) })
  }

  return (
    <>
      <SectionEditButton onClick={() => setEditOpen(true)} label="Editar Promo" />

      <section ref={sectionRef} className="py-10 md:py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="glass-card rounded-3xl p-6 md:p-10 relative overflow-hidden glow-border"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-20">
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-cm-primary/20 blur-[80px]" />
            </div>
            <div className="absolute bottom-0 left-0 w-48 h-48 pointer-events-none opacity-15">
              <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full bg-cm-primary/20 blur-[60px]" />
            </div>

            <div className="relative z-10">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-center mb-8 md:mb-10"
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cm-primary/10 border border-cm-primary/15 mb-4">
                  <span className="material-symbols-outlined text-cm-primary text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                    workspace_premium
                  </span>
                  <span className="text-xs font-semibold text-cm-primary uppercase tracking-wider font-[family-name:var(--font-inter)]">
                    {section?.badge || 'Por qué elegir CREARD'}
                  </span>
                </div>
                <h2 className="font-[family-name:var(--font-sora)] text-2xl md:text-3xl font-bold text-cm-on-surface">
                  {section?.title || 'La experiencia completa'}
                </h2>
                <p className="text-cm-on-surface-variant text-sm md:text-base mt-2 max-w-lg mx-auto font-[family-name:var(--font-inter)]">
                  {section?.subtitle || 'Reserva fácil, paga seguro, juega sin preocupaciones'}
                </p>
              </motion.div>

              {/* Selling Points Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 mb-8 md:mb-10">
                {sellingPoints.map((point, index) => (
                  <motion.div
                    key={point.title + index}
                    initial={{ opacity: 0, y: 25 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{
                      duration: 0.5,
                      delay: 0.2 + index * 0.1,
                      ease: [0.25, 0.4, 0.25, 1],
                    }}
                    className={`flex gap-4 p-4 md:p-5 rounded-xl transition-all duration-200 ${
                      point.highlight
                        ? 'bg-cm-primary/10 border border-cm-primary/20'
                        : 'bg-cm-surface-container-highest/40 border border-white/5'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        point.highlight ? 'bg-cm-primary/20' : 'bg-cm-primary/10'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-[20px] md:text-[24px] ${
                          point.highlight ? 'text-cm-primary' : 'text-cm-primary/80'
                        }`}
                        style={{ fontVariationSettings: '"FILL" 1' }}
                      >
                        {point.icon}
                      </span>
                    </div>
                    <div>
                      <h3
                        className={`font-[family-name:var(--font-sora)] font-semibold text-sm md:text-base mb-1 ${
                          point.highlight ? 'text-cm-primary' : 'text-cm-on-surface'
                        }`}
                      >
                        {point.title}
                      </h3>
                      <p className="text-cm-on-surface-variant text-xs md:text-sm leading-relaxed font-[family-name:var(--font-inter)]">
                        {point.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Payment Methods */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="text-center"
              >
                <p className="text-cm-on-surface-variant text-xs uppercase tracking-wider font-semibold mb-4 font-[family-name:var(--font-inter)]">
                  Metodos de pago aceptados
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {paymentMethods.map((method, i) => (
                    <motion.div
                      key={method.name}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={isInView ? { opacity: 1, scale: 1 } : {}}
                      transition={{
                        duration: 0.4,
                        delay: 0.8 + i * 0.1,
                        ease: 'backOut',
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card border border-white/5 hover:border-cm-primary/20 transition-all duration-200 group"
                    >
                      <span className={`material-symbols-outlined text-[18px] ${method.color}`} style={{ fontVariationSettings: '"FILL" 1' }}>
                        {method.icon}
                      </span>
                      <span className="text-cm-on-surface text-sm font-semibold font-[family-name:var(--font-sora)]">
                        {method.name}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 1.1 }}
                className="text-center mt-8"
              >
                <button
                  onClick={() => setView('search')}
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-cm-primary text-cm-on-primary font-bold rounded-xl hover:bg-cm-primary-dim transition-all duration-200 glow-accent active:scale-[0.97] font-[family-name:var(--font-sora)] text-sm md:text-base"
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                    sports_soccer
                  </span>
                  {section?.ctaText || 'Reservar mi cancha ahora'}
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════ EDIT MODAL ═══════ */}
      <EditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar Sección Promo"
        onSave={handleSave}
        saving={saving}
      >
        <FormField label="Badge" value={editForm.badge} onChange={(v) => setEditForm({ ...editForm, badge: v })} />
        <FormField label="Título" value={editForm.title} onChange={(v) => setEditForm({ ...editForm, title: v })} />
        <FormField label="Subtítulo" value={editForm.subtitle} onChange={(v) => setEditForm({ ...editForm, subtitle: v })} type="textarea" />
        <FormField label="Texto del botón CTA" value={editForm.ctaText} onChange={(v) => setEditForm({ ...editForm, ctaText: v })} />

        {/* Selling Points */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">
              Puntos de venta ({editForm.sellingPoints.length})
            </label>
            <button type="button" onClick={addPoint} className="text-[10px] font-semibold text-cm-primary flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">add</span>
              Agregar
            </button>
          </div>
          <div className="space-y-3">
            {editForm.sellingPoints.map((point, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-cm-on-surface-variant font-semibold">Punto #{idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[10px] text-cm-primary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={point.highlight}
                        onChange={(e) => updatePoint(idx, 'highlight', e.target.checked)}
                        className="accent-green-500"
                      />
                      Destacado
                    </label>
                    <button type="button" onClick={() => removePoint(idx)} className="p-1 rounded text-red-400 hover:bg-red-500/10">
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <FormField label="Icono" value={point.icon} onChange={(v) => updatePoint(idx, 'icon', v)} />
                  <FormField label="Título" value={point.title} onChange={(v) => updatePoint(idx, 'title', v)} />
                  <FormField label="Descripción" value={point.description} onChange={(v) => updatePoint(idx, 'description', v)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">
              Métodos de pago ({editForm.paymentMethods.length})
            </label>
            <button type="button" onClick={addPayment} className="text-[10px] font-semibold text-cm-primary flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">add</span>
              Agregar
            </button>
          </div>
          <div className="space-y-2">
            {editForm.paymentMethods.map((method, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  value={method.name}
                  onChange={(e) => updatePayment(idx, 'name', e.target.value)}
                  placeholder="Nombre"
                  className="flex-1 px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                />
                <input
                  value={method.icon}
                  onChange={(e) => updatePayment(idx, 'icon', e.target.value)}
                  placeholder="Icono"
                  className="w-28 px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                />
                <input
                  value={method.color}
                  onChange={(e) => updatePayment(idx, 'color', e.target.value)}
                  placeholder="Color"
                  className="w-32 px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                />
                <button type="button" onClick={() => removePayment(idx)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10">
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
