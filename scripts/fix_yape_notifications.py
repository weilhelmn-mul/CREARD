#!/usr/bin/env python3
"""
Fix Yape payment notification + BookingsView status + Admin validation sync
"""

import re

BASE = '/home/z/my-project'

# ============================================================
# FILE 1: UnifiedBookingView.tsx — Redesign 'done' step for Yape
# ============================================================
print('=== Patching UnifiedBookingView.tsx ===')
with open(f'{BASE}/src/components/bookings/UnifiedBookingView.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

text = ''.join(lines)

# --- 1a. Fix the header title for 'done' step when Yape ---
old_header_done = "{formStep === 'done' && 'Reserva Confirmada'}"
new_header_done = "{formStep === 'done' && (activePaymentMethod === 'yape_qr' ? 'Pago Registrado' : 'Reserva Confirmada')}"
text = text.replace(old_header_done, new_header_done)

old_sub_done = "{formStep === 'done' && 'Tu reserva ha sido registrada exitosamente'}"
new_sub_done = "{formStep === 'done' && (activePaymentMethod === 'yape_qr' ? 'Espera la confirmacion del administrador' : 'Tu reserva ha sido registrada exitosamente')}"
text = text.replace(old_sub_done, new_sub_done)

# --- 1b. Replace the entire STEP 4: SUCCESS section for Yape ---
old_done_section = '''      {/* ═══ STEP 4: SUCCESS ═══ */}
      {formStep === 'done' && success && (
        <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4 }}
          className="max-w-lg mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[80vh]">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
            className="w-24 h-24 rounded-full bg-[#00ff41]/10 border-2 border-[#00ff41]/30 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-[#00ff41] text-[48px]" style={{ fontVariationSettings: '"FILL" 1' }}>{activePaymentMethod === "yape_qr" ? "hourglass_top" : "check_circle"}</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center mb-8">
            <h2 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-cm-on-surface mb-2">{activePaymentMethod === "yape_qr" ? "Pago Registrado" : "Reserva Confirmada"}</h2>
            <p className="text-cm-on-surface-variant text-sm font-[family-name:var(--font-inter)]">{activePaymentMethod === "yape_qr" ? "Tu reserva queda pendiente de validacion. Recibiras una notificacion cuando se confirme." : "Tu reserva ha sido registrada exitosamente"}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="w-full glass-card rounded-2xl p-5 mb-6">
            <div className="text-center mb-4 pb-4 border-b border-dashed border-white/10">
              <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1">Referencia de reserva</p>
              <p className="font-mono text-xl font-bold text-[#00ff41] tracking-wider">{bookingRefs.join(' ')}</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#00ff41]/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#00ff41] text-[20px]">sports</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                    {selectedCourtIds.map((id) => courts.find((c) => c.id === id)?.name || id).join(', ')}
                  </p>
                  <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                    {totalCourts} cancha{totalCourts > 1 ? 's' : ''} · {totalSlots} hora{totalSlots > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-cm-surface-container-highest/40 rounded-lg p-3">
                  <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-0.5">Fecha</p>
                  <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)] capitalize">
                    {bookingDate.toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="bg-cm-surface-container-highest/40 rounded-lg p-3">
                  <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-0.5">Horario</p>
                  <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                    {selectedTimeSlots.length > 0 ? `${[...selectedTimeSlots].sort()[0]} - ${String(parseInt([...selectedTimeSlots].sort().pop() || '0') + 1).padStart(2, '0')}:00` : '-'}
                  </p>
                </div>
              </div>
              <div className="bg-[#00ff41]/5 border border-[#00ff41]/20 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-cm-on-surface-variant font-medium">{activePaymentMethod === "yape_qr" ? "⏳ Pago pendiente de validacion" : "✔ Adelanto pagado"}</span>
                  <span className={activePaymentMethod === "yape_qr" ? "text-sm font-bold text-amber-400" : "text-sm font-bold text-[#00ff41]"}>S/ {advanceAmount.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mt-1">
                  Pago restante: S/ {remainingAmount.toFixed(2)} (en el local)
                </p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="w-full space-y-3">
            <button type="button" onClick={handleBack}
              className="w-full py-3.5 bg-[#00ff41] text-[#003907] font-semibold rounded-xl hover:bg-[#00e639] transition-all glow-accent font-[family-name:var(--font-sora)] flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px]">bookmark</span> Ver Mis Reservas
            </button>
            <button type="button" onClick={() => { clearTimeSlots(); clearSelectedCourtIds(); setSelectedCourt(null); setView('home') }}
              className="w-full py-3 text-cm-on-surface-variant text-sm font-medium font-[family-name:var(--font-inter)] hover:text-cm-on-surface transition-colors">
              Hacer otra reserva
            </button>
          </motion.div>
        </motion.div>
      )}'''

new_done_section = '''      {/* ═══ STEP 4: SUCCESS ═══ */}
      {formStep === 'done' && success && (
        <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4 }}
          className="max-w-lg mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[80vh]">

          {activePaymentMethod === 'yape_qr' ? (
            /* ── Yape: Pendiente de validacion (attractive design) ── */
            <>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                className="relative mb-6">
                <div className="w-28 h-28 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(129,140,248,0.15) 100%)', border: '2px solid rgba(251,191,36,0.3)' }}>
                  <span className="material-symbols-outlined text-amber-400 text-[52px]" style={{ fontVariationSettings: '"FILL" 1' }}>hourglass_top</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-400 text-[16px]">schedule</span>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center mb-5">
                <h2 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-cm-on-surface mb-2">Pago Registrado</h2>
                <p className="text-cm-on-surface-variant text-sm font-[family-name:var(--font-inter)] leading-relaxed">
                  Tu reserva queda <span className="text-amber-400 font-semibold">pendiente de validacion</span>. El administrador verificara tu pago y actualizará el estado de tu reserva.
                </p>
              </motion.div>

              {/* Prominent call-to-action card */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                className="w-full rounded-2xl p-5 mb-5 overflow-hidden relative"
                style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(129,140,248,0.08) 100%)', border: '1.5px solid rgba(251,191,36,0.25)' }}>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-amber-400/5 -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-indigo-400/5 translate-y-1/2 -translate-x-1/2" />
                <div className="relative flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-amber-400 text-[22px]">info</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-300 font-[family-name:var(--font-sora)] mb-1">
                      Revisa tu bandeja de reservas
                    </p>
                    <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] leading-relaxed">
                      Una vez que el administrador valide tu pago, tu reserva cambiara a estado <span className="text-green-400 font-semibold">"Reservado"</span>. Si el pago no puede ser verificado, aparecera como <span className="text-red-400 font-semibold">"Rechazado"</span>.
                    </p>
                  </div>
                </div>
              </motion.div>
            </>
          ) : (
            /* ── Non-Yape: Reserva confirmada ── */
            <>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                className="w-24 h-24 rounded-full bg-[#00ff41]/10 border-2 border-[#00ff41]/30 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[#00ff41] text-[48px]" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center mb-8">
                <h2 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-cm-on-surface mb-2">Reserva Confirmada</h2>
                <p className="text-cm-on-surface-variant text-sm font-[family-name:var(--font-inter)]">Tu reserva ha sido registrada exitosamente</p>
              </motion.div>
            </>
          )}

          {/* Booking details card (shared) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="w-full glass-card rounded-2xl p-5 mb-6">
            <div className="text-center mb-4 pb-4 border-b border-dashed border-white/10">
              <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1">Referencia de reserva</p>
              <p className="font-mono text-xl font-bold text-[#00ff41] tracking-wider">{bookingRefs.join(' ')}</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#00ff41]/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#00ff41] text-[20px]">sports</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                    {selectedCourtIds.map((id) => courts.find((c) => c.id === id)?.name || id).join(', ')}
                  </p>
                  <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                    {totalCourts} cancha{totalCourts > 1 ? 's' : ''} · {totalSlots} hora{totalSlots > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-cm-surface-container-highest/40 rounded-lg p-3">
                  <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-0.5">Fecha</p>
                  <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)] capitalize">
                    {bookingDate.toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="bg-cm-surface-container-highest/40 rounded-lg p-3">
                  <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-0.5">Horario</p>
                  <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                    {selectedTimeSlots.length > 0 ? `${[...selectedTimeSlots].sort()[0]} - ${String(parseInt([...selectedTimeSlots].sort().pop() || '0') + 1).padStart(2, '0')}:00` : '-'}
                  </p>
                </div>
              </div>
              <div className={activePaymentMethod === 'yape_qr'
                ? 'bg-amber-500/10 border border-amber-500/25 rounded-lg p-3'
                : 'bg-[#00ff41]/5 border border-[#00ff41]/20 rounded-lg p-3'
              }>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-cm-on-surface-variant font-medium">
                    {activePaymentMethod === 'yape_qr' ? 'Pago pendiente de validacion' : 'Adelanto pagado'}
                  </span>
                  <span className={activePaymentMethod === 'yape_qr' ? 'text-sm font-bold text-amber-400' : 'text-sm font-bold text-[#00ff41]'}>S/ {advanceAmount.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mt-1">
                  Pago restante: S/ {remainingAmount.toFixed(2)} (en el local)
                </p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="w-full space-y-3">
            <button type="button" onClick={handleBack}
              className="w-full py-3.5 bg-[#00ff41] text-[#003907] font-semibold rounded-xl hover:bg-[#00e639] transition-all glow-accent font-[family-name:var(--font-sora)] flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px]">bookmark</span> Ver Mis Reservas
            </button>
            <button type="button" onClick={() => { clearTimeSlots(); clearSelectedCourtIds(); setSelectedCourt(null); setView('home') }}
              className="w-full py-3 text-cm-on-surface-variant text-sm font-medium font-[family-name:var(--font-inter)] hover:text-cm-on-surface transition-colors">
              Hacer otra reserva
            </button>
          </motion.div>
        </motion.div>
      )}'''

if old_done_section in text:
    text = text.replace(old_done_section, new_done_section)
    print('  OK: Replaced STEP 4 SUCCESS section')
else:
    print('  WARN: Could not find exact STEP 4 SUCCESS section — trying line-based approach')
    # Find the section boundaries
    start_marker = '{/* ═══ STEP 4: SUCCESS ═══ */}'
    end_marker = '{formStep === \x27done\x27 && success && ('
    # Just try a broader search
    idx = text.find('{/* ═══ STEP 4: SUCCESS ═══ */}')
    if idx >= 0:
        print(f'  Found STEP 4 at char index {idx}')
    else:
        print('  ERROR: STEP 4 marker not found at all!')

with open(f'{BASE}/src/components/bookings/UnifiedBookingView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

# ============================================================
# FILE 2: BookingsView.tsx — Add payment_pending status display
# ============================================================
print()
print('=== Patching BookingsView.tsx ===')
with open(f'{BASE}/src/components/bookings/BookingsView.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

text = ''.join(lines)

# --- 2a. Add payment_pending to statusConfig ---
old_status_config = '''const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  reserved:  { label: 'Reservado',  color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',   icon: 'check_circle' },
  completed: { label: 'Completo',   color: 'bg-green-500/20 text-green-400 border-green-500/30',   icon: 'verified' },
  cancelled: { label: 'Cancelado',  color: 'bg-red-500/20 text-red-400 border-red-500/30',        icon: 'cancel' },
}'''

new_status_config = '''const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  reserved:       { label: 'Reservado',            color: 'bg-green-500/20 text-green-400 border-green-500/30',   icon: 'check_circle' },
  payment_pending: { label: 'Pendiente de reserva', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: 'hourglass_top' },
  completed:      { label: 'Completo',             color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',     icon: 'verified' },
  cancelled:      { label: 'Cancelado',            color: 'bg-red-500/20 text-red-400 border-red-500/30',       icon: 'cancel' },
}'''

if old_status_config in text:
    text = text.replace(old_status_config, new_status_config)
    print('  OK: Updated statusConfig with payment_pending')
else:
    print('  WARN: statusConfig not found exactly, trying alternate approach')
    # Try to find and replace just the statusConfig block
    pattern = r"(const statusConfig: Record<string, \{ label: string; color: string; icon: string \}> = \{[^}]+\})"
    match = re.search(pattern, text)
    if match:
        text = text[:match.start()] + new_status_config + text[match.end():]
        print('  OK: Updated statusConfig via regex')
    else:
        print('  ERROR: Could not find statusConfig')

# --- 2b. Add payment_method label for Yape QR ---
old_pay_labels = "const paymentMethodLabels: Record<string, string> = {"
new_pay_labels_block = '''const paymentMethodLabels: Record<string, string> = {
  'yape qr': 'Yape QR',
  'Yape QR': 'Yape QR',
  yape: 'Yape','''
if old_pay_labels in text:
    text = text.replace(old_pay_labels, new_pay_labels_block)
    print('  OK: Added Yape QR payment method labels')
else:
    print('  WARN: paymentMethodLabels not found')

# --- 2c. Fix upcoming tab count to include payment_pending ---
old_tab_counts = '''  const tabCounts = {
    upcoming: bookings.filter((b) => {
      const bd = parseLocalDate(b.date)
      return bd >= tomorrow && b.status === 'reserved'
    }).length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  }'''

new_tab_counts = '''  const tabCounts = {
    upcoming: bookings.filter((b) => {
      const bd = parseLocalDate(b.date)
      return bd >= tomorrow && ['reserved', 'payment_pending'].includes(b.status)
    }).length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  }'''

if old_tab_counts in text:
    text = text.replace(old_tab_counts, new_tab_counts)
    print('  OK: Updated tabCounts to include payment_pending')
else:
    print('  WARN: tabCounts not found exactly')

# --- 2d. Show progress bar for payment_pending too ---
old_progress_cond = "{['reserved', 'completed'].includes(booking.status) && ("
new_progress_cond = "{['reserved', 'payment_pending', 'completed'].includes(booking.status) && ("
if old_progress_cond in text:
    text = text.replace(old_progress_cond, new_progress_cond)
    print('  OK: Show progress bar for payment_pending')
else:
    print('  WARN: Progress bar condition not found')

# --- 2e. Show payment warning for payment_pending ---
old_remaining_warning = "{booking.status === 'reserved' && booking.remainingAmount > 0 && ("
new_remaining_warning = "{['reserved', 'payment_pending'].includes(booking.status) && booking.remainingAmount > 0 && ("
if old_remaining_warning in text:
    text = text.replace(old_remaining_warning, new_remaining_warning)
    print('  OK: Show remaining payment warning for payment_pending')
else:
    print('  WARN: Remaining warning condition not found')

# --- 2f. Show action buttons (pay/cancel) for payment_pending too ---
old_pay_btn_cond = "{booking.status === 'reserved' && booking.remainingAmount > 0 && ("
new_pay_btn_cond = "{['reserved', 'payment_pending'].includes(booking.status) && booking.remainingAmount > 0 && ("
if old_pay_btn_cond in text:
    text = text.replace(old_pay_btn_cond, new_pay_btn_cond)
    print('  OK: Show pay button for payment_pending')
else:
    print('  WARN: Pay button condition not found (may already be updated)')

old_cancel_btn = "{booking.status === 'reserved' && ("
new_cancel_btn = "{['reserved', 'payment_pending'].includes(booking.status) && ("
# There are two instances of this - cancel button and something else
# We only want to change the cancel button one
# Let's count occurrences
count = text.count(old_cancel_btn)
if count > 0:
    # Replace the cancel button instance (the one near 'handleCancel')
    # Find the cancel button section more precisely
    cancel_section = """{booking.status === 'reserved' && (
                                <button type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCancel(booking.id)
                                  }}"""
    if cancel_section in text:
        new_cancel_section = cancel_section.replace("{booking.status === 'reserved' && (", "{['reserved', 'payment_pending'].includes(booking.status) && (")
        text = text.replace(cancel_section, new_cancel_section)
        print('  OK: Show cancel button for payment_pending')
    else:
        print('  WARN: Cancel button section not found exactly')
else:
    print('  WARN: Cancel button condition not found')

with open(f'{BASE}/src/components/bookings/BookingsView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

# ============================================================
# FILE 3: PaymentValidationTab.tsx — Refresh admin bookings table
# ============================================================
print()
print('=== Patching PaymentValidationTab.tsx ===')
with open(f'{BASE}/src/components/admin/PaymentValidationTab.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

text = ''.join(lines)

# Add an onRefreshed callback prop and call it after validate/reject
# Also add a visual success/error feedback

old_imports = """'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from '@/hooks/use-toast'
import { getAuthHeaders } from '@/lib/auth-helpers'
import { cachedFetch, cachedFetchFresh } from '@/lib/cache'"""

new_imports = """'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from '@/hooks/use-toast'
import { getAuthHeaders } from '@/lib/auth-helpers'
import { cachedFetch, cachedFetchFresh } from '@/lib/cache'

interface PaymentValidationTabProps {
  onValidationChange?: () => void
}"""

if old_imports in text:
    text = text.replace(old_imports, new_imports)
    print('  OK: Added props interface')
else:
    print('  WARN: imports block not found')

old_component_sig = 'export default function PaymentValidationTab() {'
new_component_sig = 'export default function PaymentValidationTab({ onValidationChange }: PaymentValidationTabProps) {'
if old_component_sig in text:
    text = text.replace(old_component_sig, new_component_sig)
    print('  OK: Added onValidationChange prop')
else:
    print('  WARN: component signature not found')

# After fetchData() call in handleAction, also call onValidationChange
old_handle_action_end = '''      setObsDialog(null)
      setObservation('')
      fetchData()
    } catch (e: any) {'''

new_handle_action_end = '''      setObsDialog(null)
      setObservation('')
      fetchData()
      onValidationChange?.()
    } catch (e: any) {'''

if old_handle_action_end in text:
    text = text.replace(old_handle_action_end, new_handle_action_end)
    print('  OK: Added onValidationChange call after validation')
else:
    print('  WARN: handleAction end not found')

with open(f'{BASE}/src/components/admin/PaymentValidationTab.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print()
print('=== All patches applied! ===')