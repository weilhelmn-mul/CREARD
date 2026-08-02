'use client'

/* Expenses table — extracted from AdminDashboard to avoid
   Turbopack minification bug that renames <thead> to variable 'th'. */

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
  notes: string | null
  createdAt?: string
  created_at?: string
}

const expenseCategories: Record<string, { label: string; icon: string; color: string }> = {
  mantenimiento: { label: 'Mantenimiento', icon: 'build',       color: 'text-blue-400' },
  servicios:     { label: 'Servicios',     icon: 'bolt',        color: 'text-yellow-400' },
  personal:      { label: 'Personal',      icon: 'group',       color: 'text-purple-400' },
  alquiler:      { label: 'Alquiler',      icon: 'home',        color: 'text-cyan-400' },
  otros:         { label: 'Otros',         icon: 'more_horiz',  color: 'text-gray-400' },
}

const fmtCurrency = (n: number) => `S/ ${n.toFixed(2)}`
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const fmtDateFull = (d: string) => {
  if (!d) return '-'
  if (d.includes('-')) {
    const p = d.split('-').map(Number)
    return `${p[2]} ${MONTHS_ES[p[1] - 1]} ${p[0]}`
  }
  return d
}

interface ExpensesTableProps {
  expenses: Expense[]
}

export default function ExpensesTable({ expenses }: ExpensesTableProps) {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Fecha</th>
              <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Descripción</th>
              <th className="text-left px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Categoría</th>
              <th className="text-right px-4 py-3 text-cm-on-surface-variant text-xs font-semibold font-[family-name:var(--font-inter)]">Monto</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-cm-on-surface-variant font-[family-name:var(--font-inter)]">No hay gastos registrados</td></tr>
            ) : (
              expenses.map((e) => {
                const cat = expenseCategories[e.category] || expenseCategories.otros
                return (
                  <tr key={e.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-cm-on-surface font-[family-name:var(--font-inter)]">{fmtDateFull(e.created_at || e.date)}</td>
                    <td className="px-4 py-3">
                      <p className="text-cm-on-surface font-medium font-[family-name:var(--font-sora)] text-xs">{e.description}</p>
                      {e.notes && <p className="text-cm-on-surface-variant text-[11px] font-[family-name:var(--font-inter)] mt-0.5">{e.notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cm-surface-container-highest/60 ${cat.color}`}>
                        <span className="material-symbols-outlined text-[12px]">{cat.icon}</span>
                        {cat.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-red-400 font-bold font-[family-name:var(--font-sora)]">-{fmtCurrency(e.amount)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}