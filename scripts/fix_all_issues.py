#!/usr/bin/env python3
"""
Comprehensive fix for:
1. Admin PaymentValidationTab: date parsing, refresh after validation
2. Date audit: booking_date stored correctly, payment_date/time format
3. Voucher data flow verification
"""

import re

# ============================================================
# FIX 1: PaymentValidationTab - fmtPayDate and refresh
# ============================================================
filepath = '/home/z/my-project/src/components/admin/PaymentValidationTab.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix fmtPayDate - payment_date is DD/MM/YYYY, not YYYY-MM-DD
old_fmtPayDate = '''  const fmtPayDate = (d: string) => {
    if (!d) return '-'
    const [y, m, day] = d.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, day))
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' })
  }'''

new_fmtPayDate = '''  const fmtPayDate = (d: string) => {
    if (!d) return '-'
    // payment_date comes in DD/MM/YYYY format from toLocaleDateString
    if (d.includes('/')) {
      // Already in DD/MM/YYYY format - return as-is or normalize
      const parts = d.split('/')
      if (parts.length === 3) {
        const [day, month, year] = parts
        return `${day.padStart(2,'0')}/${month.padStart(2,'0')}/${year}`
      }
    }
    // Fallback: might be YYYY-MM-DD
    const [y, m, day] = d.split('-').map(Number)
    if (y && m && day) {
      return `${String(day).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`
    }
    return d
  }'''

content = content.replace(old_fmtPayDate, new_fmtPayDate)

# Fix: refresh payments after validation action
old_action_end = '''      setObsDialog(null)
      setObservation('')
      fetchData()
      onValidationChange?.()'''

new_action_end = '''      setObsDialog(null)
      setObservation('')
      fetchData()
      fetchPayments()
      onValidationChange?.()'''

content = content.replace(old_action_end, new_action_end)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('FIX 1: PaymentValidationTab - date parsing and refresh fixed')

# ============================================================
# FIX 2: Bookings API - ensure booking_date is correct
# ============================================================
filepath2 = '/home/z/my-project/src/app/api/bookings/route.ts'

with open(filepath2, 'r', encoding='utf-8') as f:
    content2 = f.read()

# The booking_date field should use the 'date' variable which is in YYYY-MM-DD
# This is already correct - 'date' comes from the request body
# But let's verify the payment_date format is consistent

# Fix: Ensure payment_date is always DD/MM/YYYY with proper padding
old_lima_format = '''        const limaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
        const payDate = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' }).format(limaNow);
        const payTime = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Lima' }).format(limaNow);'''

new_lima_format = '''        const limaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
        const payDateParts = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' }).formatToParts(limaNow);
        const payDate = `${payDateParts.find(p => p.type === 'day')?.value || '01'}/${payDateParts.find(p => p.type === 'month')?.value || '01'}/${payDateParts.find(p => p.type === 'year')?.value || '2026'}`;
        const payTimeParts = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Lima' }).formatToParts(limaNow);
        const payTime = `${payTimeParts.find(p => p.type === 'hour')?.value || '00'}:${payTimeParts.find(p => p.type === 'minute')?.value || '00'}:${payTimeParts.find(p => p.type === 'second')?.value || '00'}`;'''

content2 = content2.replace(old_lima_format, new_lima_format)

with open(filepath2, 'w', encoding='utf-8') as f:
    f.write(content2)

print('FIX 2: Bookings API - payment_date/time format standardized with formatToParts')

# ============================================================
# FIX 3: Payments API - same date/time format fix
# ============================================================
filepath3 = '/home/z/my-project/src/app/api/payments/route.ts'

with open(filepath3, 'r', encoding='utf-8') as f:
    content3 = f.read()

# Fix date/time format in payments API
old_pay_format = '''    const payDateParts = new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' });
    const payTimeParts = new Date().toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });'''

new_pay_format = '''    const limaNowPay = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
    const ppDay = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' }).formatToParts(limaNowPay);
    const payDateParts = `${ppDay.find((p: any) => p.type === 'day')?.value || '01'}/${ppDay.find((p: any) => p.type === 'month')?.value || '01'}/${ppDay.find((p: any) => p.type === 'year')?.value || '2026'}`;
    const ppTime = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Lima' }).formatToParts(limaNowPay);
    const payTimeParts = `${ppTime.find((p: any) => p.type === 'hour')?.value || '00'}:${ppTime.find((p: any) => p.type === 'minute')?.value || '00'}:${ppTime.find((p: any) => p.type === 'second')?.value || '00'}`;'''

content3 = content3.replace(old_pay_format, new_pay_format)

with open(filepath3, 'w', encoding='utf-8') as f:
    f.write(content3)

print('FIX 3: Payments API - date/time format standardized')

# ============================================================
# FIX 4: UnifiedBookingView - date format in voucher data
# ============================================================
filepath4 = '/home/z/my-project/src/components/bookings/UnifiedBookingView.tsx'

with open(filepath4, 'r', encoding='utf-8') as f:
    content4 = f.read()

# Fix: Use formatToParts for consistent date/time in voucher
old_voucher_date = '''        payment_date: new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' }),
        payment_time: new Date().toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),'''

new_voucher_date = '''        payment_date: (() => { const p = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' }).formatToParts(new Date()); return `${p.find(x => x.type === 'day')?.value}/${p.find(x => x.type === 'month')?.value}/${p.find(x => x.type === 'year')?.value}`; })(),
        payment_time: (() => { const p = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Lima' }).formatToParts(new Date()); return `${p.find(x => x.type === 'hour')?.value}:${p.find(x => x.type === 'minute')?.value}:${p.find(x => x.type === 'second')?.value}`; })(),'''

content4 = content4.replace(old_voucher_date, new_voucher_date)

with open(filepath4, 'w', encoding='utf-8') as f:
    f.write(content4)

print('FIX 4: UnifiedBookingView - voucher date format consistent')

# ============================================================
# FIX 5: BookingsView - date format in voucher construction
# ============================================================
filepath5 = '/home/z/my-project/src/components/bookings/BookingsView.tsx'

with open(filepath5, 'r', encoding='utf-8') as f:
    content5 = f.read()

# Fix the constructVoucherFromBooking date/time
old_bv_date = "payment_date: new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' }),"
new_bv_date = "payment_date: (() => { const p = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' }).formatToParts(new Date()); return `${p.find((x: any) => x.type === 'day')?.value}/${p.find((x: any) => x.type === 'month')?.value}/${p.find((x: any) => x.type === 'year')?.value}`; })(),"

content5 = content5.replace(old_bv_date, new_bv_date)

old_bv_time = "payment_time: new Date().toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),"
new_bv_time = "payment_time: (() => { const p = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Lima' }).formatToParts(new Date()); return `${p.find((x: any) => x.type === 'hour')?.value}:${p.find((x: any) => x.type === 'minute')?.value}:${p.find((x: any) => x.type === 'second')?.value}`; })(),"

content5 = content5.replace(old_bv_time, new_bv_time)

with open(filepath5, 'w', encoding='utf-8') as f:
    f.write(content5)

print('FIX 5: BookingsView - voucher date format consistent')

print('\nAll fixes applied successfully!')