#!/usr/bin/env python3
"""Redesign Yape payment success screen with premium glassmorphism style"""

FILE = '/home/z/my-project/src/components/bookings/UnifiedBookingView.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the Yape section boundaries within STEP 4
# The Yape branch starts with the comment and ends before the ) : (
start_marker = '            /* ── Yape: Pendiente'
end_marker = '            </>'

yape_start = None
yape_end = None
for i, line in enumerate(lines):
    if start_marker in line and yape_start is None:
        yape_start = i - 1  # include the <> line above
    if yape_start is not None and i > yape_start + 2 and '</>' in line and line.strip() == '</>':
        yape_end = i
        break

print(f'Yape section: lines {yape_start+1} to {yape_end+1}')
if yape_start and yape_end:
    print(f'  Start: {repr(lines[yape_start][:80])}')
    print(f'  End: {repr(lines[yape_end][:80])}')

# New premium Yape section
new_yape = '''            /* ── Yape: Pago Registrado (premium design) ── */
            <>
              {/* Icon with emerald glow + pulse */}
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                className="relative mb-8">
                <div className="w-24 h-24 rounded-full bg-cm-primary/20 border-2 border-cm-primary flex items-center justify-center animate-pulse"
                  style={{ filter: 'drop-shadow(0 0 20px rgba(0,255,65,0.35))', animationDuration: '3s' }}>
                  <span className="material-symbols-outlined text-[#00ff41] text-[48px]" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                </div>
              </motion.div>

              {/* Title + Description */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="text-center mb-8">
                <h2 className="font-[family-name:var(--font-sora)] text-3xl font-extrabold text-cm-on-surface mb-3 tracking-tight"
                  style={{ filter: 'drop-shadow(0 0 12px rgba(0,255,65,0.3))' }}>
                  ¡Pago Registrado!
                </h2>
                <p className="text-cm-on-surface-variant text-sm font-[family-name:var(--font-inter)] leading-relaxed max-w-sm mx-auto">
                  Tu solicitud está <span className="text-[#00ff41] font-bold" style={{ filter: 'drop-shadow(0 0 8px rgba(0,255,65,0.25))' }}>siendo procesada</span>. Por favor, espera la confirmación de nuestro administrador para{' '}
                  <span className="text-[#00ff41] font-bold" style={{ filter: 'drop-shadow(0 0 8px rgba(0,255,65,0.25))' }}>asegurar tu turno</span>.
                </p>
              </motion.div>

              {/* Info card: check reservations */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="w-full glass-card rounded-2xl p-5 mb-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-cm-primary/5 -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-cm-primary/5 translate-y-1/2 -translate-x-1/2" />
                <div className="relative flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cm-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[#00ff41] text-[22px]">info</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)] mb-1.5">
                      Revisa tu bandeja de reservas
                    </p>
                    <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] leading-relaxed">
                      Cuando el administrador valide tu pago, tu reserva cambiará a{' '}
                      <span className="text-green-400 font-semibold">"Reservado"</span>.{' '}
                      Si el pago no puede ser verificado, aparecerá como{' '}
                      <span className="text-red-400 font-semibold">"Rechazado"</span>.
                    </p>
                  </div>
                </div>
              </motion.div>
            </>'''

if yape_start is not None and yape_end is not None:
    new_lines = lines[:yape_start] + [new_yape + '\n'] + lines[yape_end+1:]
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f'OK: Replaced Yape section (lines {yape_start+1}-{yape_end+1})')
else:
    print(f'ERROR: Could not find Yape section boundaries')
