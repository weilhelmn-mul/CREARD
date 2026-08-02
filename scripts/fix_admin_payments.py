#!/usr/bin/env python3
"""Fix the broken template literals and braces in PaymentValidationTab.tsx"""

FILE = '/home/z/my-project/src/components/admin/PaymentValidationTab.tsx'

with open(FILE, 'r') as f:
    content = f.read()

# 1. Replace the literal {fetch_payments_fn} with the actual function
old_bad = '''  }, [])
{fetch_payments_fn}
  useEffect(() => {{ fetchData() }}, [fetchData])
  useEffect(() => {{ fetchPayments() }}, [fetchPayments])'''

new_good = '''  }, [])

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

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchPayments() }, [fetchPayments])'''

content = content.replace(old_bad, new_good, 1)

# 2. Fix the getStatusBadge function - {{s}} -> {s}
content = content.replace(
    ': <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/20 text-gray-400">{{s}}</span>',
    ': <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/20 text-gray-400">{s}</span>'
)

# 3. Fix fmtMoney - ${{n?.toFixed(2) ?? '0.00'}} -> ${n?.toFixed(2) ?? '0.00'}
content = content.replace(
    '`S/ ${{n?.toFixed(2) ?? \'0.00\'}}`',
    '`S/ ${n?.toFixed(2) ?? \'0.00\'}`'
)

# 4. Fix fmtPayDate function body - {{ -> {
old_fmtpaydate = '''  const fmtPayDate = (d: string) => {{
    if (!d) return '-'
    const [y, m, day] = d.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, day))
    return date.toLocaleDateString('es-PE', {{ day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' }})
  }}'''

new_fmtpaydate = '''  const fmtPayDate = (d: string) => {
    if (!d) return '-'
    const [y, m, day] = d.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, day))
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' })
  }'''

content = content.replace(old_fmtpaydate, new_fmtpaydate, 1)

# 5. Fix filteredPayments - {{ -> { in the filter callback
old_filter = '''  const filteredPayments = payments.filter((p: any) => {{
    const search = paymentsSearch.toLowerCase()
    const matchSearch = !search
      || (p.payment_id || '').toLowerCase().includes(search)
      || (p.booking_code || '').toLowerCase().includes(search)
    const matchStatus = paymentsStatusFilter === 'all'
      || p.payment_status === paymentsStatusFilter
      || (paymentsStatusFilter === 'parcial' && p.payment_status === 'parcial')
      || (paymentsStatusFilter === 'completed' && p.payment_status === 'completed')
    return matchSearch && matchStatus
  }})'''

new_filter = '''  const filteredPayments = payments.filter((p: any) => {
    const search = paymentsSearch.toLowerCase()
    const matchSearch = !search
      || (p.payment_id || '').toLowerCase().includes(search)
      || (p.booking_code || '').toLowerCase().includes(search)
    const matchStatus = paymentsStatusFilter === 'all'
      || p.payment_status === paymentsStatusFilter
      || (paymentsStatusFilter === 'parcial' && p.payment_status === 'parcial')
      || (paymentsStatusFilter === 'completed' && p.payment_status === 'completed')
    return matchSearch && matchStatus
  })'''

content = content.replace(old_filter, new_filter, 1)

with open(FILE, 'w') as f:
    f.write(content)

print("Done: Fixed all template literal issues.")
print(f"New length: {len(content.splitlines())} lines")

# Verify no remaining {{ }} issues in critical areas
import re
remaining_double = re.findall(r'\{\{[^{]', content)
if remaining_double:
    print(f"WARNING: Found remaining double braces: {remaining_double}")
else:
    print("OK: No remaining double brace issues found.")
