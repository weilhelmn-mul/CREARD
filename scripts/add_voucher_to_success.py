#!/usr/bin/env python3
"""Add PaymentVoucher component and button to UnifiedBookingView.tsx"""

import os

FILE_PATH = '/home/z/my-project/src/components/bookings/UnifiedBookingView.tsx'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Add import for PaymentVoucher after YapeQRPayButton import ──
old_import = "import YapeQRPayButton from '@/components/payments/YapeQRPayButton'"
new_import = """import YapeQRPayButton from '@/components/payments/YapeQRPayButton'
import PaymentVoucher from '@/components/payments/PaymentVoucher'"""
assert old_import in content, "Could not find YapeQRPayButton import"
content = content.replace(old_import, new_import, 1)
print("[1/5] Added PaymentVoucher import")

# ── 2. Add showVoucher and voucherData state after lastPaymentId state ──
old_state = "const [lastPaymentId, setLastPaymentId] = useState<string | null>(null)"
new_state = """const [lastPaymentId, setLastPaymentId] = useState<string | null>(null)
  const [showVoucher, setShowVoucher] = useState(false)
  const [voucherData, setVoucherData] = useState<any>(null)"""
assert old_state in content, "Could not find lastPaymentId state"
content = content.replace(old_state, new_state, 1)
print("[2/5] Added showVoucher and voucherData state")

# ── 3. In handleSubmit, after setLastPaymentId, add setVoucherData ──
old_submit = """      setLastPaymentId(paymentId)
      setCreatedBookings([booking])"""
new_submit = """      setLastPaymentId(paymentId)
      // Construct voucher data for later use
      setVoucherData({
        payment_id: paymentId || '',
        booking_code: getRefCode(booking.id),
        user_name: clientName,
        user_email: clientEmail || user?.email || '',
        user_phone: clientPhone || null,
        user_document: null,
        court_name: selectedCourtIds.map((id) => courts.find((c) => c.id === id)?.name || id).join(', '),
        sport: selectedCourtIds.length > 0 ? (courts.find((c) => c.id === selectedCourtIds[0])?.sport || '') : '',
        booking_date: selectedDate || '',
        booking_start_time: [...selectedTimeSlots].sort()[0] || '',
        booking_end_time: \`\${String(parseInt([...selectedTimeSlots].sort().pop() || '0') + 1).padStart(2, '0')}:00\`,
        payment_type: paymentType,
        amount_paid: isFull ? calcTotal : adv,
        remaining_balance: isFull ? 0 : rem,
        payment_method_display: activePaymentMethod === 'yape_qr' ? 'Yape QR' : 'Culqi',
        payment_status: isFull ? 'completed' : 'parcial',
        payment_date: new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' }),
        payment_time: new Date().toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        total_price: calcTotal,
      })
      setCreatedBookings([booking])"""
assert old_submit in content, "Could not find setLastPaymentId + setCreatedBookings in handleSubmit"
content = content.replace(old_submit, new_submit, 1)
print("[3/5] Added setVoucherData in handleSubmit")

# ── 4. Add "Imprimir Voucher" button before "Ver mis Reservas" button ──
old_button = """          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="w-full space-y-3">
            <button type="button" onClick={handleBack}
              className="w-full py-3.5 bg-[#00ff41] text-[#003907] font-semibold rounded-xl hover:bg-[#00e639] transition-all glow-accent font-[family-name:var(--font-sora)] flex items-center justify-center gap-2 shadow-lg"
              style={{ boxShadow: '0 8px 24px rgba(0,255,65,0.15)' }}>
              <span className="material-symbols-outlined text-[20px]">event_available</span> Ver mis Reservas
            </button>"""
new_button = """          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="w-full space-y-3">
            <button type="button" onClick={() => setShowVoucher(true)}
              className="w-full py-3 bg-white/10 text-cm-on-surface font-semibold rounded-xl hover:bg-white/15 transition-all border border-white/10 font-[family-name:var(--font-sora)] flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
              Imprimir Voucher de Pago
            </button>
            <button type="button" onClick={handleBack}
              className="w-full py-3.5 bg-[#00ff41] text-[#003907] font-semibold rounded-xl hover:bg-[#00e639] transition-all glow-accent font-[family-name:var(--font-sora)] flex items-center justify-center gap-2 shadow-lg"
              style={{ boxShadow: '0 8px 24px rgba(0,255,65,0.15)' }}>
              <span className="material-symbols-outlined text-[20px]">event_available</span> Ver mis Reservas
            </button>"""
assert old_button in content, "Could not find 'Ver mis Reservas' button section"
content = content.replace(old_button, new_button, 1)
print("[4/5] Added 'Imprimir Voucher de Pago' button")

# ── 5. Add PaymentVoucher modal before closing </motion.div> ──
old_closing = """      )}
    </motion.div>
  )
}"""
new_closing = """      )}
      <PaymentVoucher data={voucherData} open={showVoucher} onClose={() => setShowVoucher(false)} />
    </motion.div>
  )
}"""
assert old_closing in content, "Could not find closing </motion.div>"
content = content.replace(old_closing, new_closing, 1)
print("[5/5] Added PaymentVoucher modal component")

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nAll changes applied successfully!")
