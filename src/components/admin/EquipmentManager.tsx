'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useToast } from '@/hooks/use-toast'
import { getAuthHeaders } from '@/lib/auth-helpers'

interface EqItem {
  id: string
  name: string
  sport: string
  pricePerRental: number
  stock: number
  active: boolean
}

const sportOptions = [
  { value: 'futbol', label: 'Futbol', icon: 'sports_soccer' },
  { value: 'voley', label: 'Voley', icon: 'sports_volleyball' },
  { value: 'basket', label: 'Basket', icon: 'sports_basketball' },
  { value: 'general', label: 'General', icon: 'sports_tennis' },
]

const fmtCurrency = (n: number) => `S/ ${n.toFixed(2)}`

export default function EquipmentManager({ equipmentList, onRefresh }: { equipmentList: EqItem[]; onRefresh: () => void }) {
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<EqItem | null>(null)
  const [form, setForm] = useState({ name: '', sport: 'futbol', pricePerRental: '', stock: '' })
  const [submitting, setSubmitting] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', sport: 'futbol', pricePerRental: '', stock: '' })
    setShowForm(true)
  }

  const openEdit = (eq: EqItem) => {
    setEditing(eq)
    setForm({ name: eq.name, sport: eq.sport, pricePerRental: String(eq.pricePerRental), stock: String(eq.stock) })
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Error', description: 'El nombre es requerido', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const method = editing ? 'PUT' : 'POST'
      const body = editing
        ? { id: editing.id, name: form.name, sport: form.sport, pricePerRental: parseFloat(form.pricePerRental) || 0, stock: parseInt(form.stock) || 0 }
        : { name: form.name, sport: form.sport, pricePerRental: parseFloat(form.pricePerRental) || 0, stock: parseInt(form.stock) || 0 }

      const res = await fetch('/api/equipment', {
        method,
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast({ title: editing ? 'Equipo actualizado' : 'Equipo creado', description: form.name })
        setShowForm(false)
        onRefresh()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'No se pudo guardar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Eliminar "${name}"?`)) return
    try {
      const res = await fetch(`/api/equipment?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        toast({ title: 'Eliminado', description: name })
        onRefresh()
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">Gestion de Equipamiento</h2>
          <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Registra balones y articulos disponibles para alquiler</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-cm-primary text-cm-on-primary rounded-xl text-sm font-semibold font-[family-name:var(--font-sora)] hover:brightness-110 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nuevo Equipo
        </button>
      </div>

      {/* List */}
      {equipmentList.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl">
          <span className="material-symbols-outlined text-[48px] text-cm-on-surface-variant/20">sports_tennis</span>
          <p className="text-sm text-cm-on-surface-variant mt-3 font-[family-name:var(--font-inter)]">No hay equipos registrados</p>
          <p className="text-xs text-cm-on-surface-variant/60 mt-1 font-[family-name:var(--font-inter)]">Agrega tu primer equipo para empezar a ofrecer alquileres</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {equipmentList.map(eq => (
            <motion.div
              key={eq.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-xl p-4 hover:border-white/15 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-400 text-[20px]">
                      {sportOptions.find(s => s.value === eq.sport)?.icon || 'sports_tennis'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">{eq.name}</p>
                    <p className="text-[10px] text-cm-on-surface-variant capitalize font-[family-name:var(--font-inter)]">{eq.sport}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(eq)} className="p-1.5 rounded-lg text-cm-on-surface-variant hover:bg-cm-surface-container-highest hover:text-cm-on-surface transition-all">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button onClick={() => handleDelete(eq.id, eq.name)} className="p-1.5 rounded-lg text-cm-on-surface-variant hover:bg-red-500/10 hover:text-red-400 transition-all">
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs space-y-0.5">
                  <p className="text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Precio por alquiler</p>
                  <p className="text-base font-bold text-cm-primary font-[family-name:var(--font-sora)]">{fmtCurrency(eq.pricePerRental)}</p>
                </div>
                <div className="text-xs text-right space-y-0.5">
                  <p className="text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Stock disponible</p>
                  <p className="text-base font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">{eq.stock}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md glass-card rounded-2xl p-6 border-blue-400/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-[family-name:var(--font-sora)] font-bold text-lg text-cm-on-surface">
                {editing ? 'Editar Equipo' : 'Nuevo Equipo'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-full hover:bg-cm-surface-container-highest transition-colors">
                <span className="material-symbols-outlined text-cm-on-surface-variant">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Nombre *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                  placeholder="Ej: Balon de Futbol"
                />
              </div>

              <div>
                <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Deporte</label>
                <div className="grid grid-cols-2 gap-2">
                  {sportOptions.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, sport: s.value }))}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        form.sport === s.value ? 'bg-blue-500/10 border-blue-400/40 text-blue-400' : 'bg-cm-surface-container-highest/30 border-transparent text-cm-on-surface-variant hover:border-white/10'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{s.icon}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Precio por alquiler (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.pricePerRental}
                    onChange={(e) => setForm(f => ({ ...f, pricePerRental: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1 block">Stock disponible</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => setForm(f => ({ ...f, stock: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !form.name.trim()}
              className="w-full mt-5 py-3 bg-blue-500 text-white rounded-xl font-semibold font-[family-name:var(--font-sora)] hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Guardando...</>
              ) : (
                <><span className="material-symbols-outlined text-[20px]">check_circle</span> {editing ? 'Guardar Cambios' : 'Crear Equipo'}</>
              )}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}