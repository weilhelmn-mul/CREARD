'use client'

/* Series bookings table — extracted from AdminDashboard to avoid
   Turbopack minification bug that renames <thead> to variable 'th'. */

interface Booking {
  id: string
  courtId: string
  courtIds?: string[]
  userId: string
  date: string
  startTime: string
  endTime: string
  totalPrice: number
  status: string
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

interface SeriesBookingsTableProps {
  bookings: Booking[]
  onCancelSingle: (id: string) => void
  use12hFormat?: boolean
}

export default function SeriesBookingsTable({ bookings, onCancelSingle, use12hFormat = false }: SeriesBookingsTableProps) {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Fecha</th>
              <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Hora</th>
              <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Cancha</th>
              <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Estado</th>
              <th className="text-right px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Total</th>
              <th className="text-center px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {bookings.sort((a, b) => a.date.localeCompare(b.date)).map((sb) => {
              const st = statusConfig[sb.status] || statusConfig.reserved
              return (
                <tr key={sb.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${sb.status === 'cancelled' ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-3 text-cm-on-surface font-[family-name:var(--font-inter)]">{fmtDate(sb.date)}</td>
                  <td className="px-4 py-3 text-cm-on-surface font-[family-name:var(--font-inter)]">{formatTimeRange(sb.startTime, sb.endTime, use12hFormat)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-cm-primary text-[16px]">{sportIcons[sb.court?.sport || ''] || 'sports'}</span>
                      <span className="text-cm-on-surface font-medium font-[family-name:var(--font-sora)] text-xs">{sb.courtIds && sb.courtIds.length > 1 ? `${sb.courtIds.length} canchas` : (sb.court?.name || 'N/A')}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-cm-primary font-bold font-[family-name:var(--font-sora)]">{fmtCurrency(sb.totalPrice)}</td>
                  <td className="px-4 py-3 text-center">
                    {sb.status !== 'cancelled' && (
                      <button
                        onClick={() => onCancelSingle(sb.id)}
                        className="p-1 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Cancelar esta fecha"
                      >
                        <span className="material-symbols-outlined text-[16px]">event_busy</span>
                      </button>
                    )}
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