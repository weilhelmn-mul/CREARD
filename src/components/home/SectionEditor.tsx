'use client'

import { useState, type ReactNode } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { motion, AnimatePresence } from 'framer-motion'

// ============================================================
// SectionEditButton — Pencil icon shown on each section when
// the current user is admin. Clicking opens the provided modal.
// ============================================================

interface SectionEditButtonProps {
  onClick: () => void
  label?: string
}

export function SectionEditButton({ onClick, label = 'Editar sección' }: SectionEditButtonProps) {
  const { user } = useAppStore()

  if (user?.role !== 'admin') return null

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="fixed z-[60] flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cm-primary/10 text-cm-primary border border-cm-primary/20 text-xs font-semibold backdrop-blur-sm hover:bg-cm-primary/20 transition-all duration-200 shadow-lg"
      style={{
        top: '72px',
        right: '16px',
      }}
      title={label}
    >
      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>
        edit
      </span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

// ============================================================
// EditModal — Reusable fullscreen modal for editing content
// ============================================================

interface EditModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  onSave: () => void
  saving?: boolean
}

export function EditModal({ open, onClose, title, children, onSave, saving }: EditModalProps) {
  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (!saving) onClose()
          }}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-2xl max-h-[85vh] glass-card rounded-2xl overflow-hidden flex flex-col border-cm-primary/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-cm-surface-container/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-cm-primary text-[22px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                  edit
                </span>
                <h2 className="font-[family-name:var(--font-sora)] font-bold text-lg text-cm-on-surface">{title}</h2>
              </div>
              {!saving && (
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-cm-surface-container-highest transition-colors"
                >
                  <span className="material-symbols-outlined text-cm-on-surface-variant">close</span>
                </button>
              )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {children}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/10 bg-cm-surface-container/50">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-cm-on-surface-variant hover:text-cm-on-surface hover:bg-white/5 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-cm-primary text-cm-on-primary hover:bg-cm-primary-dim transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    Guardando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>save</span>
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// Form helpers — Reusable input components for edit modals
// ============================================================

interface FieldProps {
  label: string
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'textarea' | 'number'
  rows?: number
}

export function FormField({ label, value, onChange, placeholder, type = 'text', rows }: FieldProps) {
  const baseClass =
    'w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-sm text-cm-on-surface placeholder:text-cm-on-surface-variant/50 focus:outline-none focus:border-cm-primary/40 transition-all font-[family-name:var(--font-inter)]'

  return (
    <div>
      <label className="text-xs text-cm-on-surface-variant font-semibold mb-1.5 block font-[family-name:var(--font-inter)]">
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows || 3}
          className={`${baseClass} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={baseClass}
        />
      )}
    </div>
  )
}

interface ArrayFieldProps {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
}

export function ArrayField({ label, items, onChange, placeholder }: ArrayFieldProps) {
  const addItem = () => {
    const val = prompt(`Nuevo ${label.toLowerCase()}:`)
    if (val?.trim()) onChange([...items, val.trim()])
  }
  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx))
  }
  const updateItem = (idx: number, val: string) => {
    const copy = [...items]
    copy[idx] = val
    onChange(copy)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">
          {label}
        </label>
        <button
          type="button"
          onClick={addItem}
          className="text-[10px] font-semibold text-cm-primary hover:text-cm-primary-dim flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          Agregar
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(e) => updateItem(idx, e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-sm text-cm-on-surface placeholder:text-cm-on-surface-variant/50 focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
            />
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-cm-on-surface-variant/50 italic py-1">No hay elementos</p>
        )}
      </div>
    </div>
  )
}
