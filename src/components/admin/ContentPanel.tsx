'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/hooks/use-toast'
import { useContentStore, type SiteSettings, type Court, type NewsItem, type GalleryImage, type SellingPoint, type HowStep, type PaymentMethodItem } from '@/store/useContentStore'

/* ═══════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════ */
type ContentTab = 'secciones' | 'canchas' | 'fotos' | 'noticias'

const contentTabs: { key: ContentTab; label: string; icon: string }[] = [
  { key: 'secciones', label: 'Secciones', icon: 'dashboard_customize' },
  { key: 'canchas', label: 'Canchas', icon: 'sports_soccer' },
  { key: 'fotos', label: 'Fotos', icon: 'photo_library' },
  { key: 'noticias', label: 'Noticias', icon: 'newspaper' },
]

const categoryLabels: Record<string, string> = {
  cancha: 'Cancha', evento: 'Evento', instalacion: 'Instalación', promo: 'Promo', general: 'General',
  futbol: 'Fútbol 5', voley: 'Vóley', basket: 'Basket',
  mantenimiento: 'Mantenimiento', general_news: 'General',
}

const newsCategoryLabels: Record<string, string> = {
  general: 'General', promo: 'Promoción', evento: 'Evento', mantenimiento: 'Mantenimiento',
}

const fmtCurrency = (n: number) => `S/ ${n.toFixed(2)}`

const inputCls = 'w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface placeholder:text-cm-on-surface-variant/50 focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]'

/* ═══════════════════════════════════════════════════
   SUB-COMPONENT: CANCHAS MANAGEMENT
   ═══════════════════════════════════════════════════ */
function CourtsPanel({ courts }: { courts: Court[] }) {
  const { updateCourt } = useContentStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Court>>({})

  const startEdit = (court: Court) => {
    setEditingId(court.id)
    setEditForm({ ...court })
  }

  const handleSave = () => {
    if (!editingId) return
    updateCourt(editingId, editForm)
    toast({ title: 'Cancha actualizada', description: `${editForm.name} guardada correctamente. Se refleja en la Home.` })
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-lg">
          Gestión de Canchas y Precios
        </h2>
        <p className="text-cm-on-surface-variant text-xs font-[family-name:var(--font-inter)]">
          {courts.length} canchas registradas · Los cambios se reflejan al instante en la Home
        </p>
      </div>

      <div className="grid gap-3">
        {courts.map((court) => (
          <motion.div
            key={court.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-4"
          >
            {editingId === court.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Nombre</label>
                    <input value={editForm.name || ''} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Precio/Hora (S/)</label>
                    <input type="number" step="0.5" value={editForm.price_per_hour || ''} onChange={(e) => setEditForm(f => ({ ...f, price_per_hour: parseFloat(e.target.value) || 0 }))} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Deporte</label>
                  <select value={editForm.sport || 'futbol'} onChange={(e) => setEditForm(f => ({ ...f, sport: e.target.value }))} className={inputCls}>
                    <option value="futbol">Fútbol 5</option>
                    <option value="voley">Vóley</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Descripción</label>
                  <textarea value={editForm.description || ''} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
                </div>
                <div>
                  <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">URLs de Imágenes (una por línea)</label>
                  <textarea value={(editForm.images || []).join('\n')} onChange={(e) => setEditForm(f => ({ ...f, images: e.target.value.split('\n').filter(Boolean) }))} rows={3} placeholder="https://ejemplo.com/imagen1.jpg" className={`${inputCls} resize-none`} />
                </div>
                <div>
                  <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Servicios (separados por coma)</label>
                  <input value={(editForm.amenities || []).join(', ')} onChange={(e) => setEditForm(f => ({ ...f, amenities: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} className={inputCls} placeholder="Cesped sintetico, Iluminacion LED, Vestuarios" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.is_active ?? true} onChange={(e) => setEditForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 rounded accent-[#00ff41]" />
                    <span className="text-xs text-cm-on-surface font-[family-name:var(--font-inter)]">Activa</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 bg-cm-primary text-cm-on-primary text-sm font-semibold rounded-xl hover:bg-cm-primary-dim transition-colors">
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    Guardar
                  </button>
                  <button onClick={() => setEditingId(null)} className="px-4 py-2 border border-white/10 text-cm-on-surface-variant text-sm rounded-xl hover:bg-white/5 transition-colors">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-cm-primary text-[18px]">
                      {court.sport === 'futbol' ? 'sports_soccer' : court.sport === 'voley' ? 'sports_volleyball' : 'sports'}
                    </span>
                    <h3 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-sm truncate">{court.name}</h3>
                    {!court.is_active && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-400">Inactiva</span>}
                  </div>
                  <p className="text-cm-primary font-[family-name:var(--font-sora)] font-bold text-lg">{fmtCurrency(court.price_per_hour)}</p>
                  <p className="text-cm-on-surface-variant text-[11px] font-[family-name:var(--font-inter)] mt-0.5">{court.amenities?.join(', ') || 'Sin servicios adicionales'}</p>
                </div>
                <button onClick={() => startEdit(court)} className="flex items-center gap-1 px-3 py-2 bg-cm-surface-container-highest/60 text-cm-on-surface-variant hover:text-cm-primary rounded-xl text-xs font-medium transition-colors">
                  <span className="material-symbols-outlined text-[16px]">edit</span>Editar
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   SUB-COMPONENT: FOTOS (GALLERY) MANAGEMENT
   ═══════════════════════════════════════════════════ */
function GalleryPanel({ images }: { images: GalleryImage[] }) {
  const { addGalleryImage, updateGalleryImage, deleteGalleryImage } = useContentStore()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '', url: '', thumbnail_url: '', category: 'general', is_active: true, display_order: 0 })
  const [filterCategory, setFilterCategory] = useState('all')

  const resetForm = () => { setForm({ title: '', description: '', url: '', thumbnail_url: '', category: 'general', is_active: true, display_order: 0 }); setEditingId(null) }

  const handleSave = () => {
    if (!form.title || !form.url) { toast({ title: 'Error', description: 'Título y URL son obligatorios', variant: 'destructive' }); return }
    if (editingId) {
      updateGalleryImage(editingId, form)
      toast({ title: 'Imagen actualizada', description: form.title })
    } else {
      addGalleryImage(form)
      toast({ title: 'Imagen agregada', description: form.title })
    }
    resetForm(); setShowForm(false)
  }

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar esta imagen?')) return
    deleteGalleryImage(id)
    toast({ title: 'Imagen eliminada' })
  }

  const startEdit = (img: GalleryImage) => {
    setEditingId(img.id)
    setForm({ title: img.title, description: img.description || '', url: img.url, thumbnail_url: img.thumbnail_url || '', category: img.category, is_active: img.is_active, display_order: img.display_order })
    setShowForm(true)
  }

  const filteredImages = filterCategory === 'all' ? images : images.filter(i => i.category === filterCategory)
  const categories = [...new Set(images.map(i => i.category))]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-lg">Galería de Fotos</h2>
          <p className="text-cm-on-surface-variant text-xs font-[family-name:var(--font-inter)]">{images.length} fotos subidas</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-1.5 px-4 py-2 bg-cm-primary/10 text-cm-primary text-sm font-semibold rounded-xl hover:bg-cm-primary/20 transition-colors">
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>add</span>Agregar Foto
        </button>
      </div>
      {categories.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterCategory('all')} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${filterCategory === 'all' ? 'bg-cm-primary/10 text-cm-primary border border-cm-primary/30' : 'bg-cm-surface-container-highest/40 text-cm-on-surface-variant border border-transparent'}`}>Todas ({images.length})</button>
          {categories.map(cat => (<button key={cat} onClick={() => setFilterCategory(cat)} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${filterCategory === cat ? 'bg-cm-primary/10 text-cm-primary border border-cm-primary/30' : 'bg-cm-surface-container-highest/40 text-cm-on-surface-variant border border-transparent'}`}>{categoryLabels[cat] || cat} ({images.filter(i => i.category === cat).length})</button>))}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredImages.map((img) => (
          <motion.div key={img.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-xl overflow-hidden group">
            <div className="aspect-video bg-cm-surface-container-highest relative overflow-hidden">
              {img.url ? <img src={img.url} alt={img.title} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-cm-on-surface-variant/30 text-[40px]">image</span></div>}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => startEdit(img)} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"><span className="material-symbols-outlined text-white text-[18px]">edit</span></button>
                <button onClick={() => handleDelete(img.id)} className="p-2 rounded-full bg-red-500/30 hover:bg-red-500/50 transition-colors"><span className="material-symbols-outlined text-red-300 text-[18px]">delete</span></button>
              </div>
              {!img.is_active && <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/80 text-white">Inactiva</span>}
            </div>
            <div className="p-2.5">
              <p className="font-[family-name:var(--font-sora)] text-xs font-medium text-cm-on-surface truncate">{img.title}</p>
              <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{categoryLabels[img.category] || img.category}</p>
            </div>
          </motion.div>
        ))}
      </div>
      {filteredImages.length === 0 && <div className="text-center py-12 text-cm-on-surface-variant font-[family-name:var(--font-inter)] text-sm">No hay fotos en esta categoría</div>}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-md glass-card rounded-2xl p-6 border-cm-primary/20 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-[family-name:var(--font-sora)] font-bold text-lg text-cm-on-surface">{editingId ? 'Editar Foto' : 'Agregar Foto'}</h3>
                <button onClick={() => setShowForm(false)} className="p-1 rounded-full hover:bg-cm-surface-container-highest transition-colors"><span className="material-symbols-outlined text-cm-on-surface-variant">close</span></button>
              </div>
              <div className="space-y-3">
                <div><label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Título *</label><input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="Nombre de la foto" /></div>
                <div><label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">URL de Imagen *</label><input value={form.url} onChange={(e) => setForm(f => ({ ...f, url: e.target.value }))} className={inputCls} placeholder="https://ejemplo.com/foto.jpg" />{form.url && <div className="mt-2 aspect-video rounded-lg overflow-hidden bg-cm-surface-container-highest"><img src={form.url} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} /></div>}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Categoría</label><select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>{Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                  <div><label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Orden</label><input type="number" value={form.display_order} onChange={(e) => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} className={inputCls} /></div>
                </div>
                <div><label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Descripción</label><textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={`${inputCls} resize-none`} placeholder="Descripción opcional" /></div>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 rounded accent-[#00ff41]" /><span className="text-xs text-cm-on-surface font-[family-name:var(--font-inter)]">Foto activa (visible en la Home)</span></label>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-cm-primary text-cm-on-primary text-sm font-semibold rounded-xl hover:bg-cm-primary-dim transition-colors"><span className="material-symbols-outlined text-[16px]">{editingId ? 'save' : 'add'}</span>{editingId ? 'Guardar' : 'Agregar'}</button>
                  <button onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-white/10 text-cm-on-surface-variant text-sm rounded-xl hover:bg-white/5 transition-colors">Cancelar</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   SUB-COMPONENT: NOTICIAS MANAGEMENT
   ═══════════════════════════════════════════════════ */
function NewsPanel({ news }: { news: NewsItem[] }) {
  const { addNews, updateNews, deleteNews } = useContentStore()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', content: '', image_url: '', category: 'general', is_active: true, is_featured: false, priority: 0, published_at: new Date().toISOString().split('T')[0], expires_at: '' })

  const resetForm = () => { setForm({ title: '', content: '', image_url: '', category: 'general', is_active: true, is_featured: false, priority: 0, published_at: new Date().toISOString().split('T')[0], expires_at: '' }); setEditingId(null) }

  const handleSave = () => {
    if (!form.title || !form.content) { toast({ title: 'Error', description: 'Título y contenido son obligatorios', variant: 'destructive' }); return }
    if (editingId) {
      updateNews(editingId, form)
      toast({ title: 'Noticia actualizada', description: form.title })
    } else {
      addNews(form)
      toast({ title: 'Noticia creada', description: form.title })
    }
    resetForm(); setShowForm(false)
  }

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar esta noticia?')) return
    deleteNews(id)
    toast({ title: 'Noticia eliminada' })
  }

  const startEdit = (n: NewsItem) => {
    setEditingId(n.id)
    setForm({ title: n.title, content: n.content, image_url: n.image_url || '', category: n.category, is_active: n.is_active, is_featured: n.is_featured, priority: n.priority, published_at: n.published_at || '', expires_at: n.expires_at || '' })
    setShowForm(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-lg">Noticias y Anuncios</h2>
          <p className="text-cm-on-surface-variant text-xs font-[family-name:var(--font-inter)]">{news.length} noticias · {news.filter(n => n.is_featured).length} destacadas</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-1.5 px-4 py-2 bg-cm-primary/10 text-cm-primary text-sm font-semibold rounded-xl hover:bg-cm-primary/20 transition-colors">
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>add</span>Nueva Noticia
        </button>
      </div>
      <div className="grid gap-3">
        {news.map((item) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-4 flex gap-4">
            {item.image_url && <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-cm-surface-container-highest"><img src={item.image_url} alt={item.title} className="w-full h-full object-cover" /></div>}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-sm truncate">{item.title}</h3>
                {item.is_featured && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400"><span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>Destacada</span>}
                {!item.is_active && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-400">Borrador</span>}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cm-surface-container-highest/60 text-cm-on-surface-variant">{newsCategoryLabels[item.category] || item.category}</span>
              </div>
              <p className="text-cm-on-surface-variant text-xs font-[family-name:var(--font-inter)] mt-1 line-clamp-2">{item.content}</p>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg hover:bg-cm-surface-container-highest transition-colors"><span className="material-symbols-outlined text-cm-on-surface-variant text-[18px]">edit</span></button>
              <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"><span className="material-symbols-outlined text-red-400/70 text-[18px]">delete</span></button>
            </div>
          </motion.div>
        ))}
      </div>
      {news.length === 0 && <div className="text-center py-12 text-cm-on-surface-variant font-[family-name:var(--font-inter)] text-sm">No hay noticias. Crea la primera.</div>}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-lg glass-card rounded-2xl p-6 border-cm-primary/20 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-[family-name:var(--font-sora)] font-bold text-lg text-cm-on-surface">{editingId ? 'Editar Noticia' : 'Nueva Noticia'}</h3>
                <button onClick={() => setShowForm(false)} className="p-1 rounded-full hover:bg-cm-surface-container-highest transition-colors"><span className="material-symbols-outlined text-cm-on-surface-variant">close</span></button>
              </div>
              <div className="space-y-3">
                <div><label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Título *</label><input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="Título de la noticia" /></div>
                <div><label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Contenido *</label><textarea value={form.content} onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))} rows={4} className={`${inputCls} resize-none`} placeholder="Escribe el contenido de la noticia..." /></div>
                <div><label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">URL de Imagen</label><input value={form.image_url} onChange={(e) => setForm(f => ({ ...f, image_url: e.target.value }))} className={inputCls} placeholder="https://ejemplo.com/noticia.jpg" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Categoría</label><select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>{Object.entries(newsCategoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                  <div><label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Prioridad</label><input type="number" value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))} className={inputCls} /></div>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 rounded accent-[#00ff41]" /><span className="text-xs text-cm-on-surface font-[family-name:var(--font-inter)]">Publicada</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm(f => ({ ...f, is_featured: e.target.checked }))} className="w-4 h-4 rounded accent-[#00ff41]" /><span className="text-xs text-cm-on-surface font-[family-name:var(--font-inter)]">Destacada</span></label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-cm-primary text-cm-on-primary text-sm font-semibold rounded-xl hover:bg-cm-primary-dim transition-colors"><span className="material-symbols-outlined text-[16px]">{editingId ? 'save' : 'add'}</span>{editingId ? 'Guardar' : 'Publicar'}</button>
                  <button onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-white/10 text-cm-on-surface-variant text-sm rounded-xl hover:bg-white/5 transition-colors">Cancelar</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   SUB-COMPONENT: SECCIONES (HOME SECTIONS EDITOR)
   ═══════════════════════════════════════════════════ */
function SectionsPanel() {
  const { settings, updateSettings } = useContentStore()
  const [form, setForm] = useState<Partial<SiteSettings>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [openSection, setOpenSection] = useState<string | null>('hero')

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])

  const saveSection = (sectionName: string, fields: Record<string, unknown>) => {
    setSaving(sectionName)
    updateSettings(fields as Partial<SiteSettings>)
    toast({ title: 'Sección guardada', description: `"${sectionName}" actualizada. Se refleja al instante en la Home.` })
    setTimeout(() => setSaving(null), 500)
  }

  const toggleSection = (key: string) => {
    setOpenSection(openSection === key ? null : key)
  }

  const sectionDefs = [
    {
      key: 'hero',
      label: 'Hero Principal',
      icon: 'home',
      fields: (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Badge Text</label>
              <input value={form.hero_badge_text || ''} onChange={(e) => setForm(f => ({ ...f, hero_badge_text: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Badge Icon (nombre de Material Icon)</label>
              <input value={form.hero_badge_icon || ''} onChange={(e) => setForm(f => ({ ...f, hero_badge_icon: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Headline (antes del highlight)</label>
            <input value={form.hero_headline || ''} onChange={(e) => setForm(f => ({ ...f, hero_headline: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Headline Highlight (verde)</label>
            <input value={form.hero_headline_highlight || ''} onChange={(e) => setForm(f => ({ ...f, hero_headline_highlight: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Subtítulo</label>
            <textarea value={form.hero_subtitle || ''} onChange={(e) => setForm(f => ({ ...f, hero_subtitle: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Ubicación</label>
              <input value={form.hero_location_text || ''} onChange={(e) => setForm(f => ({ ...f, hero_location_text: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Promo Highlight</label>
              <input value={form.hero_promo_highlight || ''} onChange={(e) => setForm(f => ({ ...f, hero_promo_highlight: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Promo Text (antes del highlight)</label>
            <input value={form.hero_promo_text || ''} onChange={(e) => setForm(f => ({ ...f, hero_promo_text: e.target.value }))} className={inputCls} />
          </div>
          <button onClick={() => saveSection('Hero Principal', { hero_badge_text: form.hero_badge_text, hero_badge_icon: form.hero_badge_icon, hero_headline: form.hero_headline, hero_headline_highlight: form.hero_headline_highlight, hero_subtitle: form.hero_subtitle, hero_location_text: form.hero_location_text, hero_promo_text: form.hero_promo_text, hero_promo_highlight: form.hero_promo_highlight })} disabled={saving === 'hero'} className="px-4 py-2 bg-cm-primary text-cm-on-primary text-sm font-semibold rounded-xl hover:bg-cm-primary-dim transition-colors disabled:opacity-50">
            {saving === 'hero' ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      ),
    },
    {
      key: 'courts',
      label: 'Canchas Destacadas',
      icon: 'sports_soccer',
      fields: (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Título de Sección</label>
            <input value={form.courts_section_title || ''} onChange={(e) => setForm(f => ({ ...f, courts_section_title: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Subtítulo</label>
            <input value={form.courts_section_subtitle || ''} onChange={(e) => setForm(f => ({ ...f, courts_section_subtitle: e.target.value }))} className={inputCls} />
          </div>
          <button onClick={() => saveSection('Canchas Destacadas', { courts_section_title: form.courts_section_title, courts_section_subtitle: form.courts_section_subtitle })} disabled={saving === 'courts'} className="px-4 py-2 bg-cm-primary text-cm-on-primary text-sm font-semibold rounded-xl hover:bg-cm-primary-dim transition-colors disabled:opacity-50">
            {saving === 'courts' ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      ),
    },
    {
      key: 'sports',
      label: 'Instalaciones',
      icon: 'emoji_events',
      fields: (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Badge</label>
            <input value={form.sports_section_badge || ''} onChange={(e) => setForm(f => ({ ...f, sports_section_badge: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Título</label>
            <input value={form.sports_section_title || ''} onChange={(e) => setForm(f => ({ ...f, sports_section_title: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Subtítulo</label>
            <input value={form.sports_section_subtitle || ''} onChange={(e) => setForm(f => ({ ...f, sports_section_subtitle: e.target.value }))} className={inputCls} />
          </div>
          <button onClick={() => saveSection('Instalaciones', { sports_section_badge: form.sports_section_badge, sports_section_title: form.sports_section_title, sports_section_subtitle: form.sports_section_subtitle })} disabled={saving === 'sports'} className="px-4 py-2 bg-cm-primary text-cm-on-primary text-sm font-semibold rounded-xl hover:bg-cm-primary-dim transition-colors disabled:opacity-50">
            {saving === 'sports' ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      ),
    },
    {
      key: 'promo',
      label: 'Por qué elegir CREARD',
      icon: 'workspace_premium',
      fields: (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Badge</label><input value={form.promo_section_badge || ''} onChange={(e) => setForm(f => ({ ...f, promo_section_badge: e.target.value }))} className={inputCls} /></div>
            <div><label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Título</label><input value={form.promo_section_title || ''} onChange={(e) => setForm(f => ({ ...f, promo_section_title: e.target.value }))} className={inputCls} /></div>
          </div>
          <div><label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Subtítulo</label><input value={form.promo_section_subtitle || ''} onChange={(e) => setForm(f => ({ ...f, promo_section_subtitle: e.target.value }))} className={inputCls} /></div>
          <div><label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">CTA Text</label><input value={form.promo_cta_text || ''} onChange={(e) => setForm(f => ({ ...f, promo_cta_text: e.target.value }))} className={inputCls} /></div>
          <div>
            <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-2 block font-semibold">Puntos de Venta</label>
            <div className="space-y-2">
              {(form.selling_points || []).map((point, idx) => (
                <div key={idx} className="glass-card rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-cm-primary font-semibold font-[family-name:var(--font-inter)]">#{idx + 1}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setForm(f => ({ ...f, selling_points: f.selling_points!.map((p, i) => i === idx ? { ...p, highlight: !p.highlight } : p) }))} className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${point.highlight ? 'bg-cm-primary/20 text-cm-primary' : 'bg-cm-surface-container-highest/60 text-cm-on-surface-variant'}`}>{point.highlight ? 'Destacado' : 'Normal'}</button>
                      <button onClick={() => setForm(f => ({ ...f, selling_points: f.selling_points!.filter((_, i) => i !== idx) }))} className="p-1 rounded-lg hover:bg-red-500/10 transition-colors"><span className="material-symbols-outlined text-red-400/70 text-[16px]">delete</span></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><input value={point.icon} onChange={(e) => setForm(f => ({ ...f, selling_points: f.selling_points!.map((p, i) => i === idx ? { ...p, icon: e.target.value } : p) }))} className={inputCls} placeholder="Icon" /></div>
                    <div><input value={point.title} onChange={(e) => setForm(f => ({ ...f, selling_points: f.selling_points!.map((p, i) => i === idx ? { ...p, title: e.target.value } : p) }))} className={inputCls} placeholder="Título" /></div>
                  </div>
                  <textarea value={point.description} onChange={(e) => setForm(f => ({ ...f, selling_points: f.selling_points!.map((p, i) => i === idx ? { ...p, description: e.target.value } : p) }))} rows={2} className={`${inputCls} resize-none`} placeholder="Descripción" />
                </div>
              ))}
              <button onClick={() => setForm(f => ({ ...f, selling_points: [...(f.selling_points || []), { icon: 'star', title: '', description: '', highlight: false }] }))} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-white/20 text-cm-on-surface-variant text-xs hover:text-cm-primary hover:border-cm-primary/30 transition-colors w-full justify-center">
                <span className="material-symbols-outlined text-[16px]">add</span>Agregar punto
              </button>
            </div>
          </div>
          <button onClick={() => saveSection('Por qué elegir CREARD', { promo_section_badge: form.promo_section_badge, promo_section_title: form.promo_section_title, promo_section_subtitle: form.promo_section_subtitle, promo_cta_text: form.promo_cta_text, selling_points: form.selling_points })} disabled={saving === 'promo'} className="px-4 py-2 bg-cm-primary text-cm-on-primary text-sm font-semibold rounded-xl hover:bg-cm-primary-dim transition-colors disabled:opacity-50">
            {saving === 'promo' ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      ),
    },
    {
      key: 'how',
      label: 'Cómo Funciona',
      icon: 'auto_awesome',
      fields: (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Badge</label><input value={form.how_section_badge || ''} onChange={(e) => setForm(f => ({ ...f, how_section_badge: e.target.value }))} className={inputCls} /></div>
            <div><label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Título</label><input value={form.how_section_title || ''} onChange={(e) => setForm(f => ({ ...f, how_section_title: e.target.value }))} className={inputCls} /></div>
          </div>
          <div><label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">Subtítulo</label><input value={form.how_section_subtitle || ''} onChange={(e) => setForm(f => ({ ...f, how_section_subtitle: e.target.value }))} className={inputCls} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">CTA Text</label><input value={form.how_cta_text || ''} onChange={(e) => setForm(f => ({ ...f, how_cta_text: e.target.value }))} className={inputCls} /></div>
            <div><label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1 block">CTA Subtext</label><input value={form.how_cta_subtext || ''} onChange={(e) => setForm(f => ({ ...f, how_cta_subtext: e.target.value }))} className={inputCls} /></div>
          </div>
          <div>
            <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-2 block font-semibold">Pasos</label>
            <div className="space-y-2">
              {(form.how_steps || []).map((step, idx) => (
                <div key={idx} className="glass-card rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-cm-primary font-semibold font-[family-name:var(--font-inter)]">Paso {step.number || idx + 1}</span>
                    <button onClick={() => setForm(f => ({ ...f, how_steps: f.how_steps!.filter((_, i) => i !== idx) }))} className="p-1 rounded-lg hover:bg-red-500/10 transition-colors"><span className="material-symbols-outlined text-red-400/70 text-[16px]">delete</span></button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div><input value={step.number} onChange={(e) => setForm(f => ({ ...f, how_steps: f.how_steps!.map((s, i) => i === idx ? { ...s, number: e.target.value } : s) }))} className={inputCls} placeholder="01" /></div>
                    <div><input value={step.icon} onChange={(e) => setForm(f => ({ ...f, how_steps: f.how_steps!.map((s, i) => i === idx ? { ...s, icon: e.target.value } : s) }))} className={inputCls} placeholder="Icon" /></div>
                    <div><input value={step.title} onChange={(e) => setForm(f => ({ ...f, how_steps: f.how_steps!.map((s, i) => i === idx ? { ...s, title: e.target.value } : s) }))} className={inputCls} placeholder="Título" /></div>
                  </div>
                  <textarea value={step.description} onChange={(e) => setForm(f => ({ ...f, how_steps: f.how_steps!.map((s, i) => i === idx ? { ...s, description: e.target.value } : s) }))} rows={2} className={`${inputCls} resize-none`} placeholder="Descripción" />
                  <div><input value={step.detail} onChange={(e) => setForm(f => ({ ...f, how_steps: f.how_steps!.map((s, i) => i === idx ? { ...s, detail: e.target.value } : s) }))} className={inputCls} placeholder="Detalle (badge inferior)" /></div>
                </div>
              ))}
              <button onClick={() => setForm(f => ({ ...f, how_steps: [...(f.how_steps || []), { number: String((f.how_steps?.length || 0) + 1).padStart(2, '0'), title: '', description: '', icon: 'star', detail: '' }] }))} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-white/20 text-cm-on-surface-variant text-xs hover:text-cm-primary hover:border-cm-primary/30 transition-colors w-full justify-center">
                <span className="material-symbols-outlined text-[16px]">add</span>Agregar paso
              </button>
            </div>
          </div>
          <button onClick={() => saveSection('Cómo Funciona', { how_section_badge: form.how_section_badge, how_section_title: form.how_section_title, how_section_subtitle: form.how_section_subtitle, how_cta_text: form.how_cta_text, how_cta_subtext: form.how_cta_subtext, how_steps: form.how_steps })} disabled={saving === 'how'} className="px-4 py-2 bg-cm-primary text-cm-on-primary text-sm font-semibold rounded-xl hover:bg-cm-primary-dim transition-colors disabled:opacity-50">
            {saving === 'how' ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      ),
    },
    {
      key: 'payments',
      label: 'Métodos de Pago',
      icon: 'payment',
      fields: (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-2 block font-semibold">Métodos de Pago (Home)</label>
            <div className="space-y-2">
              {(form.payment_methods_items || []).map((method, idx) => (
                <div key={idx} className="glass-card rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-cm-primary font-semibold font-[family-name:var(--font-inter)]">#{idx + 1}</span>
                    <button onClick={() => setForm(f => ({ ...f, payment_methods_items: f.payment_methods_items!.filter((_, i) => i !== idx) }))} className="p-1 rounded-lg hover:bg-red-500/10 transition-colors"><span className="material-symbols-outlined text-red-400/70 text-[16px]">delete</span></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><input value={method.name} onChange={(e) => setForm(f => ({ ...f, payment_methods_items: f.payment_methods_items!.map((m, i) => i === idx ? { ...m, name: e.target.value } : m) }))} className={inputCls} placeholder="Nombre" /></div>
                    <div><input value={method.icon} onChange={(e) => setForm(f => ({ ...f, payment_methods_items: f.payment_methods_items!.map((m, i) => i === idx ? { ...m, icon: e.target.value } : m) }))} className={inputCls} placeholder="Icon" /></div>
                    <div><input value={method.color} onChange={(e) => setForm(f => ({ ...f, payment_methods_items: f.payment_methods_items!.map((m, i) => i === idx ? { ...m, color: e.target.value } : m) }))} className={inputCls} placeholder="text-purple-400" /></div>
                  </div>
                </div>
              ))}
              <button onClick={() => setForm(f => ({ ...f, payment_methods_items: [...(f.payment_methods_items || []), { name: '', icon: 'payments', color: 'text-green-400' }] }))} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-white/20 text-cm-on-surface-variant text-xs hover:text-cm-primary hover:border-cm-primary/30 transition-colors w-full justify-center">
                <span className="material-symbols-outlined text-[16px]">add</span>Agregar método
              </button>
            </div>
          </div>
          <button onClick={() => saveSection('Métodos de Pago', { payment_methods_items: form.payment_methods_items })} disabled={saving === 'payments'} className="px-4 py-2 bg-cm-primary text-cm-on-primary text-sm font-semibold rounded-xl hover:bg-cm-primary-dim transition-colors disabled:opacity-50">
            {saving === 'payments' ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-lg">
          Editor de Secciones
        </h2>
        <p className="text-cm-on-surface-variant text-xs font-[family-name:var(--font-inter)]">
          Personaliza el contenido de cada sección. Los cambios se reflejan al instante en la Home.
        </p>
      </div>

      <div className="space-y-2">
        {sectionDefs.map((section) => (
          <div key={section.key} className="glass-card rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection(section.key)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-cm-surface-container-highest/40 transition-colors"
            >
              <span className="material-symbols-outlined text-cm-primary text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                {section.icon}
              </span>
              <span className="font-[family-name:var(--font-sora)] font-semibold text-sm text-cm-on-surface flex-1">
                {section.label}
              </span>
              <span className={`material-symbols-outlined text-cm-on-surface-variant text-[20px] transition-transform duration-200 ${openSection === section.key ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>
            <AnimatePresence>
              {openSection === section.key && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-1 border-t border-white/5">
                    {section.fields}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT: CONTENT PANEL
   ═══════════════════════════════════════════════════ */
export default function ContentPanel() {
  const [activeTab, setActiveTab] = useState<ContentTab>('secciones')
  const settings = useContentStore(s => s.settings)
  const courts = useContentStore(s => s.courts)
  const news = useContentStore(s => s.news)
  const gallery = useContentStore(s => s.gallery)

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cm-primary/10 border border-cm-primary/20">
        <span className="material-symbols-outlined text-cm-primary text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>sync</span>
        <span className="text-cm-primary text-xs font-semibold font-[family-name:var(--font-inter)]">
          Modo local activo — Los cambios se guardan y reflejan al instante
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-cm-surface-container-highest/40 rounded-xl overflow-x-auto no-scrollbar">
        {contentTabs.map((tab) => (
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

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'secciones' && (
          <motion.div key="secciones" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <SectionsPanel />
          </motion.div>
        )}
        {activeTab === 'canchas' && (
          <motion.div key="canchas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <CourtsPanel courts={courts} />
          </motion.div>
        )}
        {activeTab === 'fotos' && (
          <motion.div key="fotos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <GalleryPanel images={gallery} />
          </motion.div>
        )}
        {activeTab === 'noticias' && (
          <motion.div key="noticias" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <NewsPanel news={news} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
