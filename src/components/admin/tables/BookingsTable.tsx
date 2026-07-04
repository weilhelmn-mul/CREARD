'use client'

/* Bookings table (table mode) — extracted from AdminDashboard to avoid
   Turbopack minification bug that renames <thead> to variable 'th'. */

interface EquipmentItem {
  equipmentId: string
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

interface Booking {
  id: string
  courtId: string
  courtIds?: string[]
  userId: string
  date: string
  startTime: string
  endTime: string
  totalPrice: number
  courtSubtotal?: number
  equipmentSubtotal?: number
  equipmentItems?: EquipmentItem[]
  advanceAmount: number
  remainingAmount: number
  status: string
  paymentMethod: string | null
  createdAt?: unknown
  recurringGroupId?: string
  recurringIndex?: number
  equipmentDelivered?: boolean
  equipmentReturned?: boolean
  court: { id: string; name: string; sport: string; branch?: { name: string } } | null
  courts: Array<{ id: string; name: string; sport: string; branch?: { name: string } }>
  user: { id: string; name: string; email: string; phone?: string } | null
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  reserved:  { label: 'Reservado',  color: 'bg-amber-500/20 text-amber-400',    dot: 'bg-amber-400' },
  completed: { label: 'Completo',   color: 'bg-green-500/20 text-green-400',    dot: 'bg-green-400' },
  cancelled: { label: 'Cancelado',  color: 'bg-red-500/20 text-red-400',        dot: 'bg-red-400' },
}

import { formatTimeRange } from '@/lib/timeUtils'

const sportIcons: Record<string, string> = {
  futbol: 'sports_soccer', voley: 'sports_volleyball', basket: 'sports_basketball',
  tenis: 'sports_tennis', eventos: 'celebration',
}

const fmtCurrency = (n: number) => `S/ ${n.toFixed(2)}`
const fmtDate = (d: string) => {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

interface BookingsTableProps {
  bookings: Booking[]
  getAlertLevel: (id: string) => string
  openSeriesModal: (groupId: string) => void
  openAdvanceModal: (booking: Booking) => void
  handleUpdateStatus: (booking: Booking, status: string) => void
  onShowEquipDetail: (booking: Booking) => void
  advanceAmount: string
  advanceTarget: Booking | null
  isSuperAdmin?: boolean
  onDeleteBooking?: (bookingId: string) => void
  use12hFormat?: boolean
  onExtendTime?: (booking: Booking) => void
  onEditTime?: (booking: Booking) => void
}

export default function BookingsTable({
  bookings,
  getAlertLevel,
  openSeriesModal,
  openAdvanceModal,
  handleUpdateStatus,
  onShowEquipDetail,
  advanceAmount,
  advanceTarget,
  isSuperAdmin = false,
  onDeleteBooking,
  use12hFormat = false,
  onExtendTime,
  onEditTime,
}: BookingsTableProps) {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Fecha</th>
              <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Hora</th>
              <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Cancha</th>
              <th className="text-center px-2 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]" title="Equipamiento alquilado">Equip.</th>
              <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)] hidden md:table-cell">Cliente</th>
              <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Estado</th>
              <th className="text-right px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)] hidden sm:table-cell">Adelanto</th>
              <th className="text-right px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)] hidden sm:table-cell">Restante</th>
              <th className="text-right px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)] hidden sm:table-cell">Total</th>
              <th className="text-center px-2 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]" title="Método de pago">Pago</th>
              <th className="text-center px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => {
              const st = statusConfig[b.status] || statusConfig.reserved
              const alertLv = getAlertLevel(b.id)
              const isCompleted = b.status === 'completed'
              const rowClass = isCompleted
                ? 'bg-green-500/[0.06] border-l-2 border-l-green-400/70 animate-glow-green-row relative overflow-hidden'
                : alertLv === 'expired'
                ? 'bg-red-500/10 border-l-2 border-l-red-500 animate-pulse'
                : alertLv === 'warning'
                ? 'bg-amber-500/10 border-l-2 border-l-amber-500'
                : 'border-b border-white/[0.03] hover:bg-white/[0.02]'
              return (
                <tr key={b.id} className={`${rowClass} transition-colors`}>
                  <td className="px-4 py-3 text-cm-on-surface font-[family-name:var(--font-inter)] relative">
                    {isCompleted && (
                      <div className="absolute inset-y-0 -left-[2px] w-20 bg-gradient-to-r from-green-400/15 via-green-400/5 to-transparent animate-scanline-green pointer-events-none" />
                    )}
                    <div className="flex items-center gap-1.5">
                      {fmtDate(b.date)}
                      {b.recurringGroupId && (
                        <button onClick={() => openSeriesModal(b.recurringGroupId!)} className="p-0.5 rounded text-cm-primary hover:bg-cm-primary/10 transition-colors" title="Serie recurrente">
                          <span className="material-symbols-outlined text-[14px]">repeat</span>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-cm-on-surface font-[family-name:var(--font-inter)]">
                    <div className="flex items-center gap-2">
                      {formatTimeRange(b.startTime, b.endTime, use12hFormat)}
                      {alertLv === 'warning' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold animate-pulse">
                          <span className="material-symbols-outlined text-[10px]">timer</span>
                        </span>
                      )}
                      {alertLv === 'expired' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] font-bold animate-pulse">
                          <span className="material-symbols-outlined text-[10px]">timer_off</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-cm-primary text-[16px]">{sportIcons[b.court?.sport || ''] || 'sports'}</span>
                      {b.courtIds && b.courtIds.length > 1
                        ? <span className="text-cm-on-surface font-medium font-[family-name:var(--font-sora)] text-xs">{b.courts?.map(c => c.name).join(', ') || `${b.courtIds.length} canchas`}</span>
                        : <span className="text-cm-on-surface font-medium font-[family-name:var(--font-sora)] text-xs">{b.court?.name || 'N/A'}</span>
                      }
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    {b.equipmentItems && b.equipmentItems.length > 0 ? (
                      <button
                        onClick={() => onShowEquipDetail(b)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all"
                        title={b.equipmentItems.map(e => `${e.name} x${e.quantity}`).join(', ')}
                        style={{
                          backgroundColor: b.equipmentReturned ? 'rgba(34,197,94,0.15)' : b.equipmentDelivered ? 'rgba(234,179,8,0.15)' : 'rgba(59,130,246,0.15)',
                          color: b.equipmentReturned ? '#4ade80' : b.equipmentDelivered ? '#facc15' : '#60a5fa',
                        }}
                      >
                        <span className="material-symbols-outlined text-[14px]">sports_tennis</span>
                        {b.equipmentItems.reduce((s, e) => s + e.quantity, 0)}
                      </button>
                    ) : (
                      <span className="text-cm-on-surface-variant/30 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div>
                      <p className="text-cm-on-surface font-[family-name:var(--font-sora)] text-xs">{b.user?.name || 'Sin nombre'}</p>
                      <p className="text-cm-on-surface-variant text-[11px] font-[family-name:var(--font-inter)]">{b.user?.email || ''}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-500/20 text-green-300 shadow-[0_0_10px_rgba(34,197,94,0.25),0_0_3px_rgba(34,197,94,0.5)] border border-green-400/20 animate-[glow-green_2s_ease-in-out_infinite]">
                        <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                        {st.label}
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-cm-on-surface font-[family-name:var(--font-inter)] hidden sm:table-cell">{fmtCurrency(b.advanceAmount)}</td>
                  <td className={`px-4 py-3 text-right font-[family-name:var(--font-inter)] hidden sm:table-cell ${b.remainingAmount > 0 ? 'text-orange-400' : 'text-green-400'}`}>{fmtCurrency(b.remainingAmount)}</td>
                  <td className="px-4 py-3 text-right text-cm-primary font-bold font-[family-name:var(--font-sora)] hidden sm:table-cell">{fmtCurrency(b.totalPrice)}</td>
                  <td className="px-2 py-3 text-center">
                    {b.paymentMethod ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cm-surface-container-highest/60 text-cm-on-surface-variant">
                        {b.paymentMethod === 'YAPE' ? '📱' : b.paymentMethod === 'PLIN' ? '💜' : '💵'}
                        <span className="hidden lg:inline">{b.paymentMethod}</span>
                      </span>
                    ) : (
                      <span className="text-cm-on-surface-variant/30 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {b.recurringGroupId && (
                        <button
                          onClick={() => openSeriesModal(b.recurringGroupId!)}
                          className="p-1 rounded-lg text-cm-primary hover:bg-cm-primary/10 transition-colors"
                          title="Ver serie recurrente"
                        >
                          <span className="material-symbols-outlined text-[16px]">repeat</span>
                        </button>
                      )}
                      {/* B8 FIX: Always show payment button */}
                      <button
                        onClick={() => openAdvanceModal(b)}
                        className="p-1 rounded-lg text-amber-400 hover:bg-amber-400/10 transition-colors"
                        title={b.remainingAmount > 0 ? (parseFloat(advanceAmount || '0') >= b.remainingAmount && advanceTarget?.id === b.id ? 'Registrar el total' : 'Registrar adelanto') : 'Registrar pago adicional'}
                      >
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                      </button>
                      {b.status === 'reserved' && onExtendTime && (
                        <button
                          onClick={() => onExtendTime(b)}
                          className="p-1 rounded-lg text-blue-400 hover:bg-blue-400/10 transition-colors"
                          title="Extender tiempo"
                        >
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                        </button>
                      )}
                      <select
                        value={b.status}
                        onChange={(e) => handleUpdateStatus(b, e.target.value)}
                        className="bg-cm-surface-container-highest/60 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-cm-on-surface focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                      >
                        <option value="reserved">Reservado</option>
                        <option value="completed">Completo</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                      {isSuperAdmin && onEditTime && (
                        <button
                          onClick={() => onEditTime(b)}
                          className="p-1 rounded-lg text-purple-400 hover:bg-purple-400/10 transition-colors"
                          title="Editar reserva"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                      )}
                      {isSuperAdmin && onDeleteBooking && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteBooking(b.id) }}
                          className="p-1 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                          title="Eliminar permanentemente"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}