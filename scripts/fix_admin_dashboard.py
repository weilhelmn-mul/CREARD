#!/usr/bin/env python3
"""
FASE 4 - Fix #4/#7/#14 en AdminDashboard.tsx (quirúrgico):
1. Extrae el JSX del "COMPACT MODE" a un helper renderCompactBookings()
2. En la rama 'table', render dual: tabla oculta en móvil + tarjetas compactas
3. Botones de acción agrandados (p-1→p-2.5, iconos 14→18px) en compacto y galería
4. paymentMethod → paymentMethodLabel() en galería/compacto
5. Inserta helper antes del return principal
"""
import re, sys

PATH = 'src/components/admin/AdminDashboard.tsx'
src = open(PATH, encoding='utf-8').read()
orig_len = len(src)

# ---------- 1. Localizar el bloque COMPACT MODE ----------
start_marker = '              ) : (\n                /* ─── COMPACT MODE ─── */\n'
i_start = src.index(start_marker)
jsx_start = i_start + len(start_marker)

end_marker = '\n              )}\n              {/* Bug fix #8: Pagination controls */}'
i_end = src.index(end_marker, jsx_start)
jsx_block = src[jsx_start:i_end]

assert jsx_block.lstrip().startswith('<div className="space-y-2">'), 'bloque compacto inesperado'
print(f'[ok] bloque compacto localizado: {len(jsx_block)} chars, {jsx_block.count(chr(10))+1} líneas')

# ---------- 2. Fix #7 + #14 dentro del bloque compacto ----------
c = jsx_block
# botones de acción: p-1 → p-2.5  (solo patrones exactos de acción)
c = c.replace('className="p-1 rounded-lg text-cm-primary hover:bg-cm-primary/10 transition-colors"',
              'className="p-2.5 rounded-lg text-cm-primary hover:bg-cm-primary/10 transition-colors"')
c = c.replace('className="p-1 rounded-lg text-amber-400 hover:bg-amber-400/10 transition-colors"',
              'className="p-2.5 rounded-lg text-amber-400 hover:bg-amber-400/10 transition-colors"')
c = c.replace('className="p-1 rounded-lg text-blue-400 hover:bg-blue-400/10 transition-colors"',
              'className="p-2.5 rounded-lg text-blue-400 hover:bg-blue-400/10 transition-colors"')
c = c.replace('className="p-1 rounded-lg text-purple-400 hover:bg-purple-400/10 transition-colors"',
              'className="p-2.5 rounded-lg text-purple-400 hover:bg-purple-400/10 transition-colors"')
c = c.replace('className="p-1 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"',
              'className="p-2.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"')
# iconos de esos botones: text-[14px] → text-[18px] (solo material-symbols dentro del bloque)
c = c.replace('<span className="material-symbols-outlined text-[14px]">repeat</span>',
              '<span className="material-symbols-outlined text-[18px]">repeat</span>')
c = c.replace('<span className="material-symbols-outlined text-[14px]">payments</span>',
              '<span className="material-symbols-outlined text-[18px]">payments</span>')
c = c.replace('<span className="material-symbols-outlined text-[14px]">schedule</span>',
              '<span className="material-symbols-outlined text-[18px]">schedule</span>')
c = c.replace('<span className="material-symbols-outlined text-[14px]">edit</span>',
              '<span className="material-symbols-outlined text-[18px]">edit</span>')
c = c.replace('<span className="material-symbols-outlined text-[14px]">delete_forever</span>',
              '<span className="material-symbols-outlined text-[18px]">delete_forever</span>')
# FIX #14: etiqueta de método de pago legible (compacto)
c = c.replace('<span>{b.paymentMethod}</span>',
              '<span>{paymentMethodLabel(b.paymentMethod)}</span>')

# ---------- 3. Helper + reemplazo de la rama else ----------
helper = (
    '  // FIX #4 (FASE 4): lista de reservas en modo compacto (tarjetas) extraída\n'
    '  // a un helper para reutilizarla en el toggle manual de vista Y como\n'
    '  // fallback automático de la tabla en móviles (la tabla ~824px no cabe).\n'
    '  // FIX #7 (FASE 4): botones de acción aquí son ≥40px (p-2.5 + icono 18px).\n'
    '  const renderCompactBookings = () => (\n'
    + c + '\n'
    '  )\n\n'
)
src = src[:jsx_start] + '                {renderCompactBookings()}\n' + src[i_end:]

# ---------- 4. Insertar helper antes del RENDER ----------
render_marker = '  /* ═══════════════════════════════════════════════════\n     RENDER\n     ═══════════════════════════════════════════════════ */\n'
src = src.replace(render_marker, helper + render_marker, 1)

# ---------- 5. Rama table: dual render ----------
old_table = '''              ) : viewMode === 'table' ? (
                /* ─── TABLE MODE ─── */
                <BookingsTable
                  bookings={paginatedBookings}
                  getAlertLevel={getAlertLevel}
                  openSeriesModal={openSeriesModal}
                  openAdvanceModal={openAdvanceModal}
                  handleUpdateStatus={handleStatusChangeWithAdvanceCheck}
                  onShowEquipDetail={setShowEquipDetail}
                  isSuperAdmin={isSuperAdmin}
                  onDeleteBooking={handleDeleteBooking}
                  use12hFormat={use12hFormat}
                  onExtendTime={openExtendModal}
                  onEditTime={isSuperAdmin ? openEditModal : undefined}
                />
              ) : viewMode === 'gallery' ? ('''
new_table = '''              ) : viewMode === 'table' ? (
                /* ─── TABLE MODE ─── FIX #4 (FASE 4): en desktop se conserva la
                   tabla tal cual; en móvil (<768px) la tabla de ~824px se
                   sustituye automáticamente por las tarjetas compactas. */
                <>
                  <div className="hidden md:block">
                    <BookingsTable
                      bookings={paginatedBookings}
                      getAlertLevel={getAlertLevel}
                      openSeriesModal={openSeriesModal}
                      openAdvanceModal={openAdvanceModal}
                      handleUpdateStatus={handleStatusChangeWithAdvanceCheck}
                      onShowEquipDetail={setShowEquipDetail}
                      isSuperAdmin={isSuperAdmin}
                      onDeleteBooking={handleDeleteBooking}
                      use12hFormat={use12hFormat}
                      onExtendTime={openExtendModal}
                      onEditTime={isSuperAdmin ? openEditModal : undefined}
                    />
                  </div>
                  <div className="md:hidden">{renderCompactBookings()}</div>
                </>
              ) : viewMode === 'gallery' ? ('''
assert old_table in src, 'rama table no encontrada'
src = src.replace(old_table, new_table, 1)
print('[ok] dual render tabla/móvil insertado')

# ---------- 6. Fix #7 en tarjetas de galería (p-1.5 → p-2.5, iconos 16→18) ----------
old_gal_actions = '''                                className="p-1.5 rounded-lg bg-cm-primary/10 text-cm-primary hover:bg-cm-primary/20 transition-colors flex-shrink-0"'''
src = src.replace(old_gal_actions, '''                                className="p-2.5 rounded-lg bg-cm-primary/10 text-cm-primary hover:bg-cm-primary/20 transition-colors flex-shrink-0"''')
src = src.replace('''className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-400/20 transition-colors flex-shrink-0"''',
                  '''className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-400/20 transition-colors flex-shrink-0"''')
src = src.replace('''className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-400/20 transition-colors flex-shrink-0"''',
                  '''className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-400/20 transition-colors flex-shrink-0"''')
src = src.replace('''className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-400/20 transition-colors flex-shrink-0"''',
                  '''className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-400/20 transition-colors flex-shrink-0"''')
src = src.replace('''className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-400/20 transition-colors flex-shrink-0"''',
                  '''className="p-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-400/20 transition-colors flex-shrink-0"''')
for icon in ['repeat', 'payments', 'schedule', 'edit', 'delete_forever']:
    src = src.replace(f'<span className="material-symbols-outlined text-[16px]">{icon}</span>',
                      f'<span className="material-symbols-outlined text-[18px]">{icon}</span>')
# FIX #14 en galería
src = src.replace('''{b.paymentMethod === 'YAPE' ? '📱' : b.paymentMethod === 'PLIN' ? '💜' : b.paymentMethod === 'MIXTO' ? '💵📱' : '💵'}
                                <span>{b.paymentMethod}</span>''',
                  '''{b.paymentMethod === 'YAPE' ? '📱' : b.paymentMethod === 'PLIN' ? '💜' : b.paymentMethod === 'MIXTO' ? '💵📱' : '💵'}
                                <span>{paymentMethodLabel(b.paymentMethod)}</span>''')
print('[ok] galería: botones agrandados + label pago')

# ---------- 7. Root overflow-x-hidden (Fix #4) ----------
src = src.replace('    <div className="px-4 py-6 pb-28">',
                  '    // FIX #4 (FASE 4): overflow-x-hidden evita el scroll lateral de la\n'
                  '    // PÁGINA (antes 445px de ancho vs 320px del viewport); los\n'
                  '    // contenedores anchos hacen scroll dentro de sí mismos.\n'
                  '    <div className="px-4 py-6 pb-28 overflow-x-hidden">', 1)
print('[ok] root overflow-x-hidden')

# ---------- 8. Fix #11: indicador de scroll en tabs ----------
src = src.replace(
    '<div className="flex gap-1 p-1 bg-cm-surface-container-highest/40 rounded-xl mb-6 overflow-x-auto no-scrollbar">',
    '<div className="flex gap-1 p-1 bg-cm-surface-container-highest/40 rounded-xl mb-6 overflow-x-auto no-scrollbar scroll-hint-x">', 1)
print('[ok] tabs con scroll-hint-x')

# ---------- 9. Fix #12: modales con max-h + scroll ----------
# 9a. Agregar Gasto (5523)
src = src.replace('className="w-full max-w-md glass-card rounded-2xl p-6 border-cm-primary/20"',
                  'className="w-full max-w-md glass-card rounded-2xl p-6 border-cm-primary/20 max-h-[85dvh] overflow-y-auto"', 1)
# 9b. Registrar Pago adelanto (6528)
src = src.replace('className="w-full max-w-md glass-card rounded-2xl p-6 border-amber-400/20"',
                  'className="w-full max-w-md glass-card rounded-2xl p-6 border-amber-400/20 max-h-[85dvh] overflow-y-auto"', 1)
# 9c. Extender Tiempo (6713) — overflow-hidden recortaba el contenido
src = src.replace('className="w-full max-w-md glass-card border border-white/10 rounded-2xl overflow-hidden"',
                  'className="w-full max-w-md glass-card border border-white/10 rounded-2xl max-h-[85dvh] overflow-y-auto"', 1)
# 9d. Equipamiento (7149)
src = src.replace('className="w-full max-w-sm glass-card rounded-2xl p-6 border-blue-400/20"',
                  'className="w-full max-w-sm glass-card rounded-2xl p-6 border-blue-400/20 max-h-[85dvh] overflow-y-auto"', 1)
print('[ok] 4 modales con max-h-[85dvh] + scroll')

# ---------- 10. Fix #10: touch-reveal en overlays hover-only ----------
src = src.replace(
    '<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">',
    '<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 touch-reveal transition-opacity flex items-center justify-center gap-2">', 1)
src = src.replace(
    "className=\"absolute top-1 right-1 p-0.5 rounded bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity\"",
    "className=\"absolute top-1 right-1 p-2 rounded bg-red-500/80 text-white opacity-0 group-hover:opacity-100 touch-reveal transition-opacity\"", 1)
print('[ok] touch-reveal en ImageUploader + imagen custom')

# ---------- 11. Fix #14 en tablas restantes ----------
src = src.replace('<span className="hidden lg:inline">{b.paymentMethod}</span>',
                  '<span className="hidden lg:inline">{paymentMethodLabel(b.paymentMethod)}</span>')

# ---------- 12. Import ----------
src = src.replace("import { getAuthHeaders } from '@/lib/auth-helpers'",
                  "import { getAuthHeaders } from '@/lib/auth-helpers'\nimport { paymentMethodLabel } from '@/lib/paymentMethodLabels'", 1)

open(PATH, 'w', encoding='utf-8').write(src)
print(f'[done] {PATH}: {orig_len} → {len(src)} chars (+{len(src)-orig_len})')
