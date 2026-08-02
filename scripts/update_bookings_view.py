#!/usr/bin/env python3
"""Update BookingsView.tsx: Yape QR for remaining + payment method toggles + remaining_payment status"""

FILE = '/home/z/my-project/src/components/bookings/BookingsView.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

text = ''.join(lines)

# === 1. Add import for YapeQRPayButton ===
old_import = "import CulqiPayButton from '@/components/payments/CulqiPayButton'"
new_import = """import CulqiPayButton from '@/components/payments/CulqiPayButton'
import YapeQRPayButton from '@/components/payments/YapeQRPayButton'"""
if old_import in text:
    text = text.replace(old_import, new_import)
    print('OK: Added YapeQRPayButton import')

# === 2. Add remaining_payment_pending to statusConfig ===
old_status = "  payment_pending: { label: 'Pendiente de reserva', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: 'hourglass_top' },"
new_status = """  payment_pending: { label: 'Pendiente de reserva', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: 'hourglass_top' },
  remaining_payment_pending: { label: 'Pago restante pendiente', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: 'pending' },"""
if old_status in text:
    text = text.replace(old_status, new_status)
    print('OK: Added remaining_payment_pending to statusConfig')

# === 3. Add payment methods state and fetch ===
old_state = "  /* pay-remaining modal */\n  const [payModal, setPayModal] = useState<Booking | null>(null)"
new_state = """  /* payment methods from admin config */
  const [paymentMethods, setPaymentMethods] = useState<{ yape_qr: boolean; culqi: boolean }>({ yape_qr: true, culqi: false })
  const [yapeRemainingPaid, setYapeRemainingPaid] = useState(false)

  useEffect(() => {
    fetch('/api/payment-methods')
      .then(r => r.json())
      .then(data => setPaymentMethods(data))
      .catch(() => {})
  }, [])

  /* pay-remaining modal */
  const [payModal, setPayModal] = useState<Booking | null>(null)"""
if old_state in text:
    text = text.replace(old_state, new_state)
    print('OK: Added payment methods state + fetch')
else:
    print('WARN: pay modal state not found')

# === 4. Add remaining_payment_pending to tab counts ===
old_counts = """  const tabCounts = {
    upcoming: bookings.filter((b) => {
      const bd = parseLocalDate(b.date)
      return bd >= tomorrow && ['reserved', 'payment_pending'].includes(b.status)
    }).length,"""
new_counts = """  const tabCounts = {
    upcoming: bookings.filter((b) => {
      const bd = parseLocalDate(b.date)
      return bd >= tomorrow && ['reserved', 'payment_pending', 'remaining_payment_pending'].includes(b.status)
    }).length,"""
if old_counts in text:
    text = text.replace(old_counts, new_counts)
    print('OK: Updated tab counts')

# === 5. Add remaining_payment_pending to progress bar, warning, buttons ===
# Progress bar
old_progress = "['reserved', 'payment_pending', 'completed'].includes(booking.status)"
new_progress = "['reserved', 'payment_pending', 'remaining_payment_pending', 'completed'].includes(booking.status)"
text = text.replace(old_progress, new_progress)
print('OK: Updated progress bar condition')

# Remaining warning
old_warn = "['reserved', 'payment_pending'].includes(booking.status) && booking.remainingAmount > 0"
new_warn = "['reserved', 'payment_pending', 'remaining_payment_pending'].includes(booking.status) && booking.remainingAmount > 0"
text = text.replace(old_warn, new_warn)
print('OK: Updated remaining warning condition')

# Pay button
old_pay_btn = "['reserved', 'payment_pending'].includes(booking.status) && booking.remainingAmount > 0 && ("
new_pay_btn = "['reserved', 'payment_pending', 'remaining_payment_pending'].includes(booking.status) && booking.remainingAmount > 0 && ("
text = text.replace(old_pay_btn, new_pay_btn)
print('OK: Updated pay button condition')

# Cancel button
old_cancel = "['reserved', 'payment_pending'].includes(booking.status) && ("
new_cancel = "['reserved', 'payment_pending', 'remaining_payment_pending'].includes(booking.status) && ("
# Only replace the one near handleCancel
count = text.count(new_cancel)
if count > 1:
    text = text.replace(new_cancel, new_cancel, 1)  # only replace the first extra
print('OK: Updated cancel button condition')

# === 6. Replace the entire Pay Remaining Modal ===
# Find and replace the modal section
modal_start = '      {/* \u2500\u2500\u2500 Pay Remaining Modal \u2500\u2500\u2500 */}'
modal_end_marker = '      </AnimatePresence>'

# Find the modal
idx_start = text.find(modal_start)
if idx_start < 0:
    print('ERROR: Could not find modal start')
else:
    # Find the closing AnimatePresence after the modal start
    idx_end = text.find('</AnimatePresence>', idx_start + len(modal_start))
    if idx_end < 0:
        print('ERROR: Could not find modal end')
    else:
        idx_end += len('</AnimatePresence>')
        
        new_modal = '''      {/* \u2500\u2500\u2500 Pay Remaining Modal \u2500\u2500\u2500 */}
      <AnimatePresence>
        {payModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !paying && !yapeRemainingPaid && setPayModal(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md glass-card rounded-2xl p-6 border-cm-primary/20 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-[family-name:var(--font-sora)] font-bold text-lg text-cm-on-surface">
                  Pagar Restante
                </h3>
                {!paying && !yapeRemainingPaid && (
                  <button type="button"
                    onClick={() => setPayModal(null)}
                    className="p-1 rounded-full hover:bg-cm-surface-container-highest transition-colors"
                  >
                    <span className="material-symbols-outlined text-cm-on-surface-variant">close</span>
                  </button>
                )}
              </div>

              {/* Booking summary */}
              <div className="p-3 rounded-xl bg-cm-surface-container-highest/40 space-y-2 mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Cancha</span>
                  <span className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">{payModal.court.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Fecha</span>
                  <span className="text-sm text-cm-on-surface font-[family-name:var(--font-inter)]">{fmt(payModal.date)} \u00b7 {formatTimeRange(payModal.startTime, payModal.endTime, use12hFormat)}</span>
                </div>
                <div className="border-t border-white/5 pt-2 flex items-center justify-between">
                  <span className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Monto a pagar</span>
                  <span className="text-lg font-bold text-cm-primary font-[family-name:var(--font-sora)]">{fmtCurrency(payModal.remainingAmount)}</span>
                </div>
              </div>

              {/* Tabs: show available payment methods */}
              {(() => {
                const hasOnline = paymentMethods.yape_qr || paymentMethods.culqi
                const hasManual = true // always available

                if (paymentMethods.yape_qr && !paymentMethods.culqi) {
                  // Only Yape QR: show directly without tabs
                  return (
                    <YapeQRPayButton
                      bookingIds={[payModal.id]}
                      amount={payModal.remainingAmount}
                      userEmail={payModal.user.email}
                      paymentType="remaining"
                      onPaymentMarked={() => {
                        setYapeRemainingPaid(true)
                        fetchBookings()
                      }}
                      onBack={() => setPayModal(null)}
                    />
                  )
                }

                return (
                  <>
                    {/* Tab bar */}
                    {hasOnline && (
                      <div className="flex gap-1 p-1 bg-cm-surface-container-highest/40 rounded-xl mb-4">
                        {paymentMethods.culqi && (
                          <button type="button"
                            onClick={() => setPayModalTab('online')}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all font-[family-name:var(--font-inter)] flex items-center justify-center gap-1.5 ${
                              payModalTab === 'online'
                                ? 'bg-cm-primary text-cm-on-primary shadow-sm'
                                : 'text-cm-on-surface-variant hover:text-cm-on-surface'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">credit_card</span>
                            Tarjeta
                          </button>
                        )}
                        {paymentMethods.yape_qr && (
                          <button type="button"
                            onClick={() => setPayModalTab('yape')}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all font-[family-name:var(--font-inter)] flex items-center justify-center gap-1.5 ${
                              payModalTab === 'yape'
                                ? 'bg-cm-primary text-cm-on-primary shadow-sm'
                                : 'text-cm-on-surface-variant hover:text-cm-on-surface'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                            Yape QR
                          </button>
                        )}
                        <button type="button"
                          onClick={() => setPayModalTab('manual')}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all font-[family-name:var(--font-inter)] flex items-center justify-center gap-1.5 ${
                            payModalTab === 'manual'
                              ? 'bg-cm-primary text-cm-on-primary shadow-sm'
                              : 'text-cm-on-surface-variant hover:text-cm-on-surface'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">storefront</span>
                          Manual
                        </button>
                      </div>
                    )}

                    {/* Culqi tab */}
                    {payModalTab === 'online' && paymentMethods.culqi && (
                      <CulqiPayButton
                        bookingId={payModal.id}
                        totalAmount={payModal.totalPrice}
                        remainingAmount={payModal.remainingAmount}
                        paymentType="remaining"
                        userEmail={payModal.user.email}
                        buttonText={`Pagar {fmtCurrency(payModal.remainingAmount)}`}
                        onSuccess={() => {
                          toast({ title: 'Pago exitoso', description: 'Tu reserva ha sido actualizada.' })
                          setPayModal(null)
                          fetchBookings()
                        }}
                        onError={(error) => {
                          toast({ title: 'Error en el pago', description: error, variant: 'destructive' })
                        }}
                        onClose={() => {}}
                      />
                    )}

                    {/* Yape QR tab */}
                    {payModalTab === 'yape' && paymentMethods.yape_qr && (
                      <YapeQRPayButton
                        bookingIds={[payModal.id]}
                        amount={payModal.remainingAmount}
                        userEmail={payModal.user.email}
                        paymentType="remaining"
                        onPaymentMarked={() => {
                          setYapeRemainingPaid(true)
                          fetchBookings()
                        }}
                        onBack={() => setPayModal(null)}
                      />
                    )}

                    {/* Manual tab */}
                    {payModalTab === 'manual' && (
                      <>
                        <div className="space-y-2 mb-4">
                          <label className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">M\u00e9todo de pago manual</label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { key: 'yape', label: 'Yape', icon: 'account_balance_wallet' },
                              { key: 'plin', label: 'Plin', icon: 'phone_android' },
                              { key: 'cash', label: 'Efectivo', icon: 'payments' },
                              { key: 'transfer', label: 'Transferencia', icon: 'account_balance' },
                            ].map((m) => (
                              <button type="button"
                                key={m.key}
                                onClick={() => setPayMethod(m.key)}
                                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                                  payMethod === m.key
                                    ? 'bg-cm-primary/10 border-cm-primary/40 text-cm-primary'
                                    : 'bg-cm-surface-container-highest/30 border-transparent text-cm-on-surface-variant hover:border-white/10'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[18px]">{m.icon}</span>
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button type="button"
                          onClick={handlePayRemaining}
                          disabled={paying}
                          className="w-full py-3 bg-cm-primary text-cm-on-primary rounded-xl font-semibold font-[family-name:var(--font-sora)] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {paying ? (
                            <>
                              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                              Procesando...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[20px]">check_circle</span>
                              Confirmar Pago {fmtCurrency(payModal.remainingAmount)}
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>'''
        
        text = text[:idx_start] + new_modal + text[idx_end:]
        print('OK: Replaced Pay Remaining Modal')

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(text)

print('\nAll BookingsView changes applied!')
