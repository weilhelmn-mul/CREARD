#!/usr/bin/env python3
"""Redesign booking details card with bento-grid glassmorphism style"""

FILE = '/home/z/my-project/src/components/bookings/UnifiedBookingView.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Replace the booking details card + buttons (lines 1033-1092)
# Line 1033 = index 1032, Line 1092 = index 1091
start_idx = 1032  # {/* Booking details card (shared) */}
end_idx = 1091   # </motion.div> (buttons closing)

print(f'Replacing lines {start_idx+1} to {end_idx+1}')
print(f'  Start: {repr(lines[start_idx][:60])}')
print(f'  End: {repr(lines[end_idx][:60])}')

new_content = '''          {/* Booking details card (shared) - Bento Glassmorphism */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="w-full rounded-2xl p-6 mb-6 relative overflow-hidden"
            style={{ background: 'rgba(30,41,59,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>

            {/* Section label */}
            <div className="flex items-center gap-2 mb-5 opacity-60">
              <span className="material-symbols-outlined text-[14px] text-[#00ff41]">receipt_long</span>
              <span className="text-[10px] text-[#00ff41] font-[family-name:var(--font-inter)] font-semibold uppercase tracking-[0.15em]">Resumen de la Transacci\u00f3n</span>
            </div>

            {/* Bento grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
              {/* Cancha */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] opacity-70">Cancha</span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00ff41] text-[18px]">sports</span>
                  <span className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                    {selectedCourtIds.map((id) => courts.find((c) => c.id === id)?.name || id).join(', ')}
                  </span>
                </div>
              </div>
              {/* Fecha */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] opacity-70">Fecha</span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00ff41] text-[18px]">calendar_today</span>
                  <span className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)] capitalize">
                    {bookingDate.toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
              {/* Horario */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] opacity-70">Horario</span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00ff41] text-[18px]">schedule</span>
                  <span className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
                    {selectedTimeSlots.length > 0 ? `${[...selectedTimeSlots].sort()[0]} - ${String(parseInt([...selectedTimeSlots].sort().pop() || '0') + 1).padStart(2, '0')}:00` : '-'}
                  </span>
                </div>
              </div>
              {/* Monto */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] opacity-70">
                  {activePaymentMethod === 'yape_qr' ? 'Monto Pagado' : 'Adelanto'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00ff41] text-[18px]">payments</span>
                  <span className="text-lg font-black text-[#00ff41] font-[family-name:var(--font-sora)]">S/ {advanceAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer: status + ref */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00ff41]" style={{ filter: 'drop-shadow(0 0 6px rgba(0,255,65,0.5))' }} />
                <span className="text-[10px] text-[#00ff41] font-[family-name:var(--font-inter)] font-semibold uppercase tracking-wider">
                  {activePaymentMethod === 'yape_qr' ? 'Pendiente de Verificaci\u00f3n' : 'Confirmado'}
                </span>
              </div>
              <span className="text-[10px] text-cm-on-surface-variant font-mono opacity-40">#{bookingRefs.join('-')}</span>
            </div>

            {/* Restante (only for Yape) */}
            {activePaymentMethod === 'yape_qr' && remainingAmount > 0 && (
              <div className="mt-3 pt-3 border-t border-dashed border-white/5">
                <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                  Pago restante: <span className="font-semibold text-cm-on-surface">S/ {remainingAmount.toFixed(2)}</span> (en el local)
                </p>
              </div>
            )}
          </motion.div>

          {/* Action Buttons */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="w-full space-y-3">
            <button type="button" onClick={handleBack}
              className="w-full py-3.5 bg-[#00ff41] text-[#003907] font-semibold rounded-xl hover:bg-[#00e639] transition-all glow-accent font-[family-name:var(--font-sora)] flex items-center justify-center gap-2 shadow-lg"
              style={{ boxShadow: '0 8px 24px rgba(0,255,65,0.15)' }}>
              <span className="material-symbols-outlined text-[20px]">event_available</span> Ver mis Reservas
            </button>
            <button type="button" onClick={() => { clearTimeSlots(); clearSelectedCourtIds(); setSelectedCourt(null); setView('home') }}
              className="w-full py-3 text-cm-on-surface-variant text-sm font-medium font-[family-name:var(--font-inter)] hover:text-cm-on-surface transition-colors rounded-xl border border-white/10 hover:border-white/20 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px]">home</span> Volver al Inicio
            </button>
          </motion.div>'''

new_lines = lines[:start_idx] + [new_content + '\n'] + lines[end_idx+1:]
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print(f'OK: Replaced details card + buttons ({len(new_lines)} total lines)')
