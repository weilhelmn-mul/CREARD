'use client'

/* Recurring bookings preview table — extracted from AdminDashboard to avoid
   Turbopack minification bug that renames <thead> to variable 'th'. */

export interface RecurringPreviewItem {
  date: string
  dayName: string
  available: boolean
  conflict?: { bookingId: string; startTime: string; endTime: string; userName: string }
  price: number
}

const fmtCurrency = (n: number) => `S/ ${n.toFixed(2)}`
const fmtDate = (d: string) => {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

interface RecurringPreviewTableProps {
  preview: RecurringPreviewItem[]
}

export default function RecurringPreviewTable({ preview }: RecurringPreviewTableProps) {
  return (
    <div className="max-h-60 overflow-y-auto rounded-xl border border-white/10">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-cm-surface-container-highest/80 backdrop-blur-sm">
          <tr className="border-b border-white/5">
            <th className="text-left px-3 py-2 text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">Fecha</th>
            <th className="text-left px-3 py-2 text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">Día</th>
            <th className="text-left px-3 py-2 text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">Estado</th>
            <th className="text-right px-3 py-2 text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">Precio</th>
          </tr>
        </thead>
        <tbody>
          {preview.map((item, i) => (
            <tr key={i} className={`border-b border-white/[0.03] ${!item.available ? 'opacity-50' : ''}`}>
              <td className="px-3 py-2 text-cm-on-surface font-medium font-[family-name:var(--font-inter)]">{fmtDate(item.date)}</td>
              <td className="px-3 py-2 text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{item.dayName}</td>
              <td className="px-3 py-2">
                {item.available ? (
                  <span className="inline-flex items-center gap-1 text-green-400">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    <span className="font-[family-name:var(--font-inter)]">Disponible</span>
                  </span>
                ) : (
                  <span className="text-red-400 font-[family-name:var(--font-inter)]">
                    Ocupado {item.conflict ? `(${item.conflict.startTime}-${item.conflict.endTime}, ${item.conflict.userName})` : ''}
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-right text-cm-on-surface font-[family-name:var(--font-sora)]">{fmtCurrency(item.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}