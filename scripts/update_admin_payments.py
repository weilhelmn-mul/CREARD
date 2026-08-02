#!/usr/bin/env python3
"""Enhance PaymentValidationTab.tsx with full payment history table."""

import re

FILE = '/home/z/my-project/src/components/admin/PaymentValidationTab.tsx'

with open(FILE, 'r') as f:
    content = f.read()

# ============================================================
# 1. Add new state variables after the existing state declarations
# ============================================================
old_state = "  const [observation, setObservation] = useState('')"
new_state = """  const [observation, setObservation] = useState('')
  const [payments, setPayments] = useState<any[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsSearch, setPaymentsSearch] = useState('')
  const [paymentsStatusFilter, setPaymentsStatusFilter] = useState('all')
  const [paymentsCount, setPaymentsCount] = useState(20)"""

content = content.replace(old_state, new_state, 1)

# ============================================================
# 2. Add fetchPayments function after the fetchData function
# ============================================================
fetch_payments_fn = '''

  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/payments-list', { headers })
      if (res.ok) {
        const data = await res.json()
        setPayments(Array.isArray(data) ? data : [])
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los pagos', variant: 'destructive' })
    } finally {
      setPaymentsLoading(false)
    }
  }, [])
'''

# Insert after the fetchData closing brace - find the end of fetchData
# The fetchData useCallback ends with "}, [])" and is followed by empty line and useEffect
old_useeffect = """  }, [])

  useEffect(() => { fetchData() }, [fetchData])"""

new_useeffect = """  }, [])
{fetch_payments_fn}
  useEffect(() => {{ fetchData() }}, [fetchData])
  useEffect(() => {{ fetchPayments() }}, [fetchPayments])"""

content = content.replace(old_useeffect, new_useeffect, 1)

# ============================================================
# 3. Add helper functions before the loading check
# ============================================================
old_loading = "  if (loading) return"
new_loading = """  const getTypeLabel = (t: string) => t === 'advance' ? 'Adelanto' : t === 'remaining' ? 'Restante' : t === 'full_payment' ? 'Total' : t
  const getStatusBadge = (s: string) => s === 'completed'
    ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400">Pagado</span>
    : s === 'parcial'
    ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">Parcial</span>
    : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/20 text-gray-400">{{s}}</span>
  const fmtMoney = (n: number) => `S/ ${{n?.toFixed(2) ?? '0.00'}}`
  const fmtPayDate = (d: string) => {{
    if (!d) return '-'
    const [y, m, day] = d.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, day))
    return date.toLocaleDateString('es-PE', {{ day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' }})
  }}
  const fmtPayTime = (t: string) => t || '-'

  if (loading) return"""

content = content.replace(old_loading, new_loading, 1)

# ============================================================
# 4. Add computed values for filtered payments after totalPending
# ============================================================
old_total_pending = "  const totalPending = advanceBookings.length + remainingBookings.length"
new_total_pending = """  const totalPending = advanceBookings.length + remainingBookings.length
  const filteredPayments = payments.filter((p: any) => {{
    const search = paymentsSearch.toLowerCase()
    const matchSearch = !search
      || (p.payment_id || '').toLowerCase().includes(search)
      || (p.booking_code || '').toLowerCase().includes(search)
    const matchStatus = paymentsStatusFilter === 'all'
      || p.payment_status === paymentsStatusFilter
      || (paymentsStatusFilter === 'parcial' && p.payment_status === 'parcial')
      || (paymentsStatusFilter === 'completed' && p.payment_status === 'completed')
    return matchSearch && matchStatus
  }})
  const visiblePayments = filteredPayments.slice(0, paymentsCount)"""

content = content.replace(old_total_pending, new_total_pending, 1)

# ============================================================
# 5. Insert the payment history section before the reject dialog
# ============================================================
history_section = '''

      {/* Payment History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">Historial de Pagos</h3>
            <span className="text-xs bg-[#00ff41]/20 text-[#00ff41] px-2.5 py-1 rounded-full font-medium">
              {filteredPayments.length} registro{filteredPayments.length !== 1 ? 's' : ''}
            </span>
          </div>
          {paymentsLoading && (
            <div className="w-4 h-4 border-2 border-[#00ff41]/30 border-t-[#00ff41] rounded-full animate-spin" />
          )}
        </div>

        {/* Search and filter bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cm-on-surface-variant text-sm">search</span>
            <input
              type="text"
              value={paymentsSearch}
              onChange={e => setPaymentsSearch(e.target.value)}
              placeholder="Buscar por codigo de reserva o ID de pago..."
              className="w-full pl-9 pr-3 py-2 bg-cm-surface-container-highest/60 border border-white/10 rounded-lg text-cm-on-surface text-xs placeholder:text-cm-on-surface-variant/50 focus:outline-none focus:border-[#00ff41]/50 font-[family-name:var(--font-inter)]"
            />
          </div>
          <select
            value={paymentsStatusFilter}
            onChange={e => setPaymentsStatusFilter(e.target.value)}
            className="px-3 py-2 bg-cm-surface-container-highest/60 border border-white/10 rounded-lg text-cm-on-surface text-xs focus:outline-none focus:border-[#00ff41]/50 font-[family-name:var(--font-inter)]"
          >
            <option value="all">Todos</option>
            <option value="parcial">Parcial</option>
            <option value="completed">Pagado</option>
          </select>
        </div>

        {/* Payments table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">ID Pago</th>
                  <th className="text-left p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">Reserva</th>
                  <th className="text-left p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">Usuario</th>
                  <th className="text-left p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">Cancha</th>
                  <th className="text-left p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">Tipo</th>
                  <th className="text-right p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">Monto</th>
                  <th className="text-right p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">Saldo</th>
                  <th className="text-left p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">Metodo</th>
                  <th className="text-left p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">Estado</th>
                  <th className="text-left p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">Fecha</th>
                  <th className="text-left p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">Hora</th>
                </tr>
              </thead>
              <tbody>
                {paymentsLoading ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-cm-on-surface-variant">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#00ff41]/30 border-t-[#00ff41] rounded-full animate-spin" />
                        Cargando pagos...
                      </div>
                    </td>
                  </tr>
                ) : visiblePayments.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-cm-on-surface-variant text-sm">
                      No se encontraron pagos.
                    </td>
                  </tr>
                ) : (
                  visiblePayments.map((p: any) => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3 text-cm-on-surface font-mono text-[11px]">{p.payment_id}</td>
                      <td className="p-3 text-cm-on-surface font-mono text-[11px]">{p.booking_code}</td>
                      <td className="p-3 text-cm-on-surface text-[11px] max-w-[120px] truncate">{p.user_name || p.user_email || '-'}</td>
                      <td className="p-3 text-cm-on-surface text-[11px] max-w-[100px] truncate">{p.court_name || '-'}</td>
                      <td className="p-3 text-cm-on-surface text-[11px]">{getTypeLabel(p.payment_type)}</td>
                      <td className="p-3 text-[#00ff41] font-semibold text-[11px] text-right">{fmtMoney(p.amount_paid)}</td>
                      <td className="p-3 text-cm-on-surface text-[11px] text-right">{fmtMoney(p.remaining_balance)}</td>
                      <td className="p-3 text-cm-on-surface-variant text-[11px]">{p.payment_method_display || '-'}</td>
                      <td className="p-3 text-[11px]">{getStatusBadge(p.payment_status)}</td>
                      <td className="p-3 text-cm-on-surface text-[11px]">{fmtPayDate(p.payment_date)}</td>
                      <td className="p-3 text-cm-on-surface text-[11px] font-mono">{fmtPayTime(p.payment_time)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredPayments.length > paymentsCount && (
            <div className="p-3 border-t border-white/10 text-center">
              <button
                onClick={() => setPaymentsCount(prev => prev + 20)}
                className="px-4 py-2 bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/20 rounded-lg text-xs font-semibold hover:bg-[#00ff41]/20 transition-colors font-[family-name:var(--font-inter)]"
              >
                Cargar mas ({filteredPayments.length - paymentsCount} restantes)
              </button>
            </div>
          )}
        </div>
      </div>
'''

# Insert before the reject dialog comment
old_reject = "      {/* Reject observation dialog */}"
content = content.replace(old_reject, history_section + "\n      {/* Reject observation dialog */}", 1)

with open(FILE, 'w') as f:
    f.write(content)

print("Done: PaymentValidationTab.tsx updated successfully.")
print(f"New length: {len(content.splitlines())} lines")
