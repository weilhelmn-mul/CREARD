'use client'

// ═══════════════════════════════════════════════════════════════
// SiteConfigTab — Panel de Configuración del Sitio (Admin)
// Permite editar: datos de contacto, redes sociales y contenido legal
// Accesible para roles: admin y super_admin
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react'
import { useSiteSettings, type LegalSection } from '@/context/SiteSettingsContext'
import { toast } from '@/hooks/use-toast'

const CONTACT_FIELDS = [
  { key: 'contact_phone', label: 'Teléfono', placeholder: '+51 984 000 000', icon: 'call' },
  { key: 'contact_whatsapp', label: 'WhatsApp (número)', placeholder: '51984000000', icon: 'chat' },
  { key: 'contact_email', label: 'Correo electrónico', placeholder: 'contacto@creard.com', icon: 'mail' },
  { key: 'contact_address', label: 'Dirección física', placeholder: 'San Sebastián, Cusco, Perú', icon: 'location_on' },
  { key: 'business_hours', label: 'Horario de atención', placeholder: 'Lun-Dom 7:00 AM - 11:00 PM', icon: 'schedule' },
] as const

const SOCIAL_FIELDS = [
  { key: 'social_facebook', label: 'Facebook', placeholder: 'https://facebook.com/creard.cusco', icon: 'public' },
  { key: 'social_instagram', label: 'Instagram', placeholder: 'https://instagram.com/creard.cusco', icon: 'photo_camera' },
  { key: 'social_tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@creard.cusco', icon: 'videocam' },
] as const

type SubTab = 'contacto' | 'redes' | 'terminos' | 'devoluciones'

const subTabs: { key: SubTab; label: string; icon: string }[] = [
  { key: 'contacto', label: 'Contacto', icon: 'call' },
  { key: 'redes', label: 'Redes Sociales', icon: 'share' },
  { key: 'terminos', label: 'Términos y Cond.', icon: 'description' },
  { key: 'devoluciones', label: 'Política Devoluciones', icon: 'swap_horiz' },
]

export default function SiteConfigTab() {
  const { settings, saveFullSettings } = useSiteSettings()
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('contacto')
  const [saving, setSaving] = useState(false)

  // ── Contact & Social form state ──
  const [contactForm, setContactForm] = useState<Record<string, string>>({})

  // ── Legal form state ──
  const [termsSections, setTermsSections] = useState<LegalSection[]>([])
  const [refundSections, setRefundSections] = useState<LegalSection[]>([])
  const [editingLegalIdx, setEditingLegalIdx] = useState<number | null>(null)
  const [legalEditForm, setLegalEditForm] = useState<{ title: string; content: string }>({ title: '', content: '' })

  // Initialize forms from settings
  useEffect(() => {
    if (!settings) return
    const s = settings as Record<string, unknown>
    setContactForm({
      contact_phone: (s.contact_phone as string) || '',
      contact_whatsapp: (s.contact_whatsapp as string) || '',
      contact_email: (s.contact_email as string) || '',
      contact_address: (s.contact_address as string) || '',
      business_hours: (s.business_hours as string) || '',
      social_facebook: (s.social_facebook as string) || '',
      social_instagram: (s.social_instagram as string) || '',
      social_tiktok: (s.social_tiktok as string) || '',
    })
    if (settings.legal_terms?.length) setTermsSections([...settings.legal_terms])
    if (settings.legal_refund?.length) setRefundSections([...settings.legal_refund])
  }, [settings])

  const handleSaveContact = useCallback(async () => {
    if (!settings) return
    setSaving(true)
    const updated = { ...settings, ...contactForm }
    const ok = await saveFullSettings(updated)
    setSaving(false)
    if (ok) toast({ title: 'Datos de contacto guardados' })
    else toast({ title: 'Error al guardar', variant: 'destructive' })
  }, [settings, contactForm, saveFullSettings])

  const handleSaveSocial = useCallback(async () => {
    if (!settings) return
    setSaving(true)
    const updated = { ...settings, ...contactForm }
    const ok = await saveFullSettings(updated)
    setSaving(false)
    if (ok) toast({ title: 'Redes sociales guardadas' })
    else toast({ title: 'Error al guardar', variant: 'destructive' })
  }, [settings, contactForm, saveFullSettings])

  const handleSaveLegal = useCallback(async (key: 'legal_terms' | 'legal_refund', sections: LegalSection[]) => {
    if (!settings) return
    setSaving(true)
    const updated = { ...settings, [key]: sections }
    const ok = await saveFullSettings(updated)
    setSaving(false)
    if (ok) toast({ title: 'Contenido legal guardado' })
    else toast({ title: 'Error al guardar', variant: 'destructive' })
  }, [settings, saveFullSettings])

  const handleEditSection = (idx: number, sections: LegalSection[], setSections: (s: LegalSection[]) => void) => {
    setEditingLegalIdx(idx)
    setLegalEditForm({ title: sections[idx].title, content: sections[idx].content })
  }

  const handleSaveSection = (sections: LegalSection[], setSections: (s: LegalSection[]) => void) => {
    if (editingLegalIdx === null) return
    const updated = [...sections]
    updated[editingLegalIdx] = { ...legalEditForm }
    setSections(updated)
    setEditingLegalIdx(null)
  }

  const handleCancelEdit = () => {
    setEditingLegalIdx(null)
    setLegalEditForm({ title: '', content: '' })
  }

  const handleAddSection = (sections: LegalSection[], setSections: (s: LegalSection[]) => void, label: string) => {
    const num = sections.length + 1
    setSections([...sections, { title: `${num}. ${label}`, content: '' }])
  }

  const handleDeleteSection = (idx: number, sections: LegalSection[], setSections: (s: LegalSection[]) => void) => {
    setSections(sections.filter((_, i) => i !== idx))
    if (editingLegalIdx === idx) handleCancelEdit()
  }

  const handleMoveSection = (idx: number, dir: -1 | 1, sections: LegalSection[], setSections: (s: LegalSection[]) => void) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= sections.length) return
    const updated = [...sections]
    ;[updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]]
    setSections(updated)
  }

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {subTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              activeSubTab === tab.key
                ? 'bg-cm-primary text-cm-on-primary'
                : 'bg-cm-surface-container-highest text-cm-on-surface-variant hover:bg-cm-surface-container-highest/80'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ CONTACTO ═══ */}
      {activeSubTab === 'contacto' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-[family-name:var(--font-sora)] font-semibold text-base text-cm-on-surface">
                Datos de Contacto
              </h3>
              <p className="text-xs text-cm-on-surface-variant mt-1">
                Información visible en el footer de la aplicación
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CONTACT_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="flex items-center gap-1.5 text-xs font-medium text-cm-on-surface-variant mb-1.5">
                  <span className="material-symbols-outlined text-[14px]">{field.icon}</span>
                  {field.label}
                </label>
                <input
                  type="text"
                  value={contactForm[field.key] || ''}
                  onChange={(e) => setContactForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2.5 rounded-xl bg-cm-surface-container-highest border border-cm-border/50 text-sm text-cm-on-surface placeholder:text-cm-on-surface-variant/50 focus:outline-none focus:border-cm-primary/50 focus:ring-1 focus:ring-cm-primary/30 transition-all font-[family-name:var(--font-inter)]"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveContact}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cm-primary text-cm-on-primary text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? (
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">save</span>
              )}
              Guardar Contacto
            </button>
          </div>
        </div>
      )}

      {/* ═══ REDES SOCIALES ═══ */}
      {activeSubTab === 'redes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-[family-name:var(--font-sora)] font-semibold text-base text-cm-on-surface">
                Redes Sociales
              </h3>
              <p className="text-xs text-cm-on-surface-variant mt-1">
                URLs de redes sociales visibles en el footer
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {SOCIAL_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="flex items-center gap-1.5 text-xs font-medium text-cm-on-surface-variant mb-1.5">
                  <span className="material-symbols-outlined text-[14px]">{field.icon}</span>
                  {field.label}
                </label>
                <input
                  type="url"
                  value={contactForm[field.key] || ''}
                  onChange={(e) => setContactForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2.5 rounded-xl bg-cm-surface-container-highest border border-cm-border/50 text-sm text-cm-on-surface placeholder:text-cm-on-surface-variant/50 focus:outline-none focus:border-cm-primary/50 focus:ring-1 focus:ring-cm-primary/30 transition-all font-[family-name:var(--font-inter)]"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveSocial}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cm-primary text-cm-on-primary text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? (
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">save</span>
              )}
              Guardar Redes Sociales
            </button>
          </div>
        </div>
      )}

      {/* ═══ TÉRMINOS Y CONDICIONES ═══ */}
      {activeSubTab === 'terminos' && (
        <LegalEditor
          title="Términos y Condiciones"
          description="Contenido legal de los Términos y Condiciones. Soporta HTML básico (&lt;p&gt;, &lt;strong&gt;, etc.)"
          sections={termsSections}
          setSections={setTermsSections}
          editingIdx={editingLegalIdx}
          setEditingIdx={setEditingLegalIdx}
          editForm={legalEditForm}
          setEditForm={setLegalEditForm}
          onSave={() => handleSaveLegal('legal_terms', termsSections)}
          saving={saving}
          onAdd={() => handleAddSection(termsSections, setTermsSections, 'Nueva sección')}
          onDelete={(idx) => handleDeleteSection(idx, termsSections, setTermsSections)}
          onMove={(idx, dir) => handleMoveSection(idx, dir, termsSections, setTermsSections)}
          onEdit={(idx) => handleEditSection(idx, termsSections, setTermsSections)}
          onSaveSection={() => handleSaveSection(termsSections, setTermsSections)}
          onCancelEdit={handleCancelEdit}
        />
      )}

      {/* ═══ POLÍTICA DE DEVOLUCIONES ═══ */}
      {activeSubTab === 'devoluciones' && (
        <LegalEditor
          title="Política de Cambios y Devoluciones"
          description="Contenido legal de la política de cambios y devoluciones. Soporta HTML básico."
          sections={refundSections}
          setSections={setRefundSections}
          editingIdx={editingLegalIdx}
          setEditingIdx={setEditingLegalIdx}
          editForm={legalEditForm}
          setEditForm={setLegalEditForm}
          onSave={() => handleSaveLegal('legal_refund', refundSections)}
          saving={saving}
          onAdd={() => handleAddSection(refundSections, setRefundSections, 'Nueva sección')}
          onDelete={(idx) => handleDeleteSection(idx, refundSections, setRefundSections)}
          onMove={(idx, dir) => handleMoveSection(idx, dir, refundSections, setRefundSections)}
          onEdit={(idx) => handleEditSection(idx, refundSections, setRefundSections)}
          onSaveSection={() => handleSaveSection(refundSections, setRefundSections)}
          onCancelEdit={handleCancelEdit}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// LegalEditor — Sub-componente para editar secciones legales
// ═══════════════════════════════════════════════════════════════
function LegalEditor({
  title,
  description,
  sections,
  setSections,
  editingIdx,
  setEditingIdx,
  editForm,
  setEditForm,
  onSave,
  saving,
  onAdd,
  onDelete,
  onMove,
  onEdit,
  onSaveSection,
  onCancelEdit,
}: {
  title: string
  description: string
  sections: LegalSection[]
  setSections: (s: LegalSection[]) => void
  editingIdx: number | null
  setEditingIdx: (i: number | null) => void
  editForm: { title: string; content: string }
  setEditForm: (f: { title: string; content: string }) => void
  onSave: () => void
  saving: boolean
  onAdd: () => void
  onDelete: (idx: number) => void
  onMove: (idx: number, dir: -1 | 1) => void
  onEdit: (idx: number) => void
  onSaveSection: () => void
  onCancelEdit: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-[family-name:var(--font-sora)] font-semibold text-base text-cm-on-surface">
            {title}
          </h3>
          <p className="text-xs text-cm-on-surface-variant mt-1">{description}</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cm-surface-container-highest border border-cm-border/50 text-xs font-medium text-cm-on-surface-variant hover:text-cm-primary hover:border-cm-primary/30 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Agregar sección
        </button>
      </div>

      {/* Sections list */}
      <div className="space-y-3">
        {sections.map((section, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-cm-border/50 bg-cm-surface-container overflow-hidden"
          >
            {/* Section header */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs font-mono text-cm-on-surface-variant/60 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                {editingIdx === idx ? (
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="flex-1 px-2 py-1 rounded-lg bg-cm-surface-container-highest border border-cm-border/50 text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/50 font-[family-name:var(--font-sora)] font-semibold"
                  />
                ) : (
                  <span className="text-sm font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface truncate">
                    {section.title}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onMove(idx, -1)}
                  disabled={idx === 0}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-cm-on-surface-variant hover:text-cm-primary hover:bg-cm-primary/10 disabled:opacity-30 transition-all"
                  title="Mover arriba"
                >
                  <span className="material-symbols-outlined text-[16px]">expand_less</span>
                </button>
                <button
                  onClick={() => onMove(idx, 1)}
                  disabled={idx === sections.length - 1}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-cm-on-surface-variant hover:text-cm-primary hover:bg-cm-primary/10 disabled:opacity-30 transition-all"
                  title="Mover abajo"
                >
                  <span className="material-symbols-outlined text-[16px]">expand_more</span>
                </button>
                {editingIdx === idx ? (
                  <>
                    <button
                      onClick={onSaveSection}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-green-400 hover:bg-green-400/10 transition-all"
                      title="Guardar sección"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </button>
                    <button
                      onClick={onCancelEdit}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-400/10 transition-all"
                      title="Cancelar"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onEdit(idx)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-cm-on-surface-variant hover:text-cm-primary hover:bg-cm-primary/10 transition-all"
                      title="Editar sección"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button
                      onClick={() => onDelete(idx)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-cm-on-surface-variant hover:text-red-400 hover:bg-red-400/10 transition-all"
                      title="Eliminar sección"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Section content editor */}
            {editingIdx === idx && (
              <div className="px-4 pb-4">
                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  rows={6}
                  placeholder="Escribe el contenido aquí. Soporta HTML: <p>, <strong>, <br>, etc."
                  className="w-full px-3 py-2.5 rounded-xl bg-cm-surface-container-highest border border-cm-border/50 text-sm text-cm-on-surface placeholder:text-cm-on-surface-variant/50 focus:outline-none focus:border-cm-primary/50 focus:ring-1 focus:ring-cm-primary/30 transition-all resize-y font-[family-name:var(--font-inter)] leading-relaxed"
                />
                <p className="text-[11px] text-cm-on-surface-variant/60 mt-1.5">
                  Usa etiquetas HTML básicas: &lt;p&gt;, &lt;strong&gt;, &lt;br&gt;, class=&quot;mb-2&quot;
                </p>
              </div>
            )}

            {/* Section preview (when not editing) */}
            {editingIdx !== idx && section.content && (
              <div className="px-4 pb-3">
                <div
                  className="text-xs text-cm-on-surface-variant/80 line-clamp-3 leading-relaxed [&_strong]:text-cm-on-surface/80"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cm-primary text-cm-on-primary text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? (
            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-[18px]">save</span>
          )}
          Guardar {title}
        </button>
      </div>
    </div>
  )
}
