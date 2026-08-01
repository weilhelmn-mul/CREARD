#!/usr/bin/env python3
"""Replace STEP 4 SUCCESS section in UnifiedBookingView.tsx using line-based approach"""

BASE = '/home/z/my-project'
FILE = f'{BASE}/src/components/bookings/UnifiedBookingView.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# STEP 4 starts at line 967 (index 966) and ends at line 1035 (index 1034)
start_idx = 966  # line 967
end_idx = 1034   # line 1035

print(f'Replacing lines {start_idx+1} to {end_idx+1}')
print(f'First line: {repr(lines[start_idx][:60])}')
print(f'Last line: {repr(lines[end_idx][:60])}')

new_section = '''      {/* \u2550\u2550\u2550 STEP 4: SUCCESS \u2550\u2550\u2550 */}
      {formStep === 'done' && success && (
        <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4 }}
          className="max-w-lg mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[80vh]">

          {activePaymentMethod === 'yape_qr' ? (
            /* \u2500\u2500 Yape: Pendiente de validaci\u00f3n (attractive design) \u2500\u2500 */
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
                  Tu reserva queda <span className="text-amber-400 font-semibold">pendiente de validaci\u00f3n</span>. El administrador verificar\u00e1 tu pago y actualizar\u00e1 el estado de tu reserva.
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
                      Una vez que el administrador valide tu pago, tu reserva cambiar\u00e1 a estado <span className="text-green-400 font-semibold">"Reservado"</span>. Si el pago no puede ser verificado, aparecer\u00e1 como <span className="text-red-400 font-semibold">"Rechazado"</span>.
                    </p>
                  </div>
                </div>
              </motion.div>
            </>
          ) : (
            /* \u2500\u2500 Non-Yape: Reserva confirmada \u2500\u2500 */
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
                    {totalCourts} cancha{totalCourts > 1 ? 's' : ''} \u00b7 {totalSlots} hora{totalSlots > 1 ? 's' : ''}
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
                    {activePaymentMethod === 'yape_qr' ? 'Pago pendiente de validaci\u00f3n' : 'Adelanto pagado'}
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

new_lines = lines[:start_idx] + [new_section + '\n'] + lines[end_idx+1:]
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print(f'OK: Replaced lines {start_idx+1}-{end_idx+1} with new STEP 4 section ({len(new_lines)} total lines)')