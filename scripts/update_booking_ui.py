#!/usr/bin/env python3
"""
Update UnifiedBookingView.tsx to add 50%/100% payment type selector.
Processes changes from bottom-to-top to avoid line number shifts.
"""

import os

FILE = '/home/z/my-project/src/components/bookings/UnifiedBookingView.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# ════════════════════════════════════════════════════════════
# We'll work from BOTTOM to TOP to preserve line numbers.
# All line numbers below refer to the ORIGINAL file (1-indexed).
# ════════════════════════════════════════════════════════════

def L(n):
    """Convert 1-indexed line to 0-indexed."""
    return n - 1

def replace_range(start_line, end_line, new_lines):
    """Replace lines [start_line, end_line] (1-indexed, inclusive) with new_lines."""
    s = L(start_line)
    e = L(end_line)
    lines[s:e+1] = new_lines

def insert_after(line_num, new_lines):
    """Insert new_lines after the given 1-indexed line."""
    idx = L(line_num)
    for i, nl in enumerate(new_lines):
        lines.insert(idx + 1 + i, nl)

# ──────────────────────────────────────────────────────────────
# CHANGE 9 (bottom-most): SUMMARY BOTTOM BAR (lines 1170-1171)
# Change "Adelanto a pagar" → "Monto a pagar" and advanceAmount → paymentAmount
# ──────────────────────────────────────────────────────────────
# Line 1170:
lines[L(1170)] = lines[L(1170)].replace('Adelanto a pagar', 'Monto a pagar')
# Line 1171:
lines[L(1171)] = lines[L(1171)].replace('advanceAmount.toFixed(2)', 'paymentAmount.toFixed(2)')
print("✓ Change 9: SUMMARY BOTTOM BAR updated")

# ──────────────────────────────────────────────────────────────
# CHANGE 7: STEP 4 success section - "Restante" block (lines 1102-1108)
# Replace the condition and content
# ──────────────────────────────────────────────────────────────
replace_range(1102, 1108, [
    '            {paymentRemaining > 0 && (\n',
    '              <div className="mt-3 pt-3 border-t border-dashed border-white/5">\n',
    '                <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">\n',
    '                  Pago restante: <span className="font-semibold text-cm-on-surface">S/ {paymentRemaining.toFixed(2)}</span> (en el local)\n',
    '                </p>\n',
    '              </div>\n',
    '            )}\n',
])
print("✓ Change 7b: STEP 4 Restante block updated")

# ──────────────────────────────────────────────────────────────
# CHANGE 7a: STEP 4 success - Monto label and amount (lines 1081, 1085)
# ──────────────────────────────────────────────────────────────
# Line 1081: Change the label
lines[L(1081)] = lines[L(1081)].replace(
    "{activePaymentMethod === 'yape_qr' ? 'Monto Pagado' : 'Adelanto'}",
    "{paymentType === 'full_payment' ? 'Monto Pagado' : (activePaymentMethod === 'yape_qr' ? 'Monto Pagado' : 'Adelanto')}"
)
# Line 1085: Change advanceAmount to paymentAmount
lines[L(1085)] = lines[L(1085)].replace('advanceAmount.toFixed(2)', 'paymentAmount.toFixed(2)')
print("✓ Change 7a: STEP 4 success Monto updated")

# ──────────────────────────────────────────────────────────────
# CHANGE 6c: STEP 3 - amount prop (line 951)
# ──────────────────────────────────────────────────────────────
lines[L(951)] = lines[L(951)].replace('amount={advanceAmount}', 'amount={paymentAmount}')
print("✓ Change 6c: STEP 3 amount prop updated")

# ──────────────────────────────────────────────────────────────
# CHANGE 6b: STEP 3 - info box text (lines 943-946)
# ──────────────────────────────────────────────────────────────
replace_range(943, 946, [
    '            <div className="bg-cm-surface-container-highest/40 rounded-lg p-2.5 text-center">\n',
    '              <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">\n',
    '                {paymentType === \'full_payment\' ? \'Pago total de la reserva\' : \'Adelanto 50% requerido\'}\n',
    '              </p>\n',
    '              {paymentRemaining > 0 && (\n',
    '                <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Restante S/ {paymentRemaining.toFixed(2)} se paga en el local</p>\n',
    '              )}\n',
    '            </div>\n',
])
print("✓ Change 6b: STEP 3 info box updated")

# ──────────────────────────────────────────────────────────────
# CHANGE 6a: STEP 3 - amount display (line 941)
# ──────────────────────────────────────────────────────────────
lines[L(941)] = lines[L(941)].replace('advanceAmount.toFixed(2)', 'paymentAmount.toFixed(2)')
print("✓ Change 6a: STEP 3 amount display updated")

# ──────────────────────────────────────────────────────────────
# CHANGE 3: STEP 2 Payment Breakdown - Replace lines 876-891
# (the Adelanto 50% / Pago restante / Total section)
# But FIRST insert the radio selector before it (after line 875, before 876)
# ──────────────────────────────────────────────────────────────

# Insert the radio selector AFTER line 875 (after the court breakdown map closing })
# Line 875 is:               })
radio_selector_lines = [
    '\n',
    '              {/* Payment Type Selector */}\n',
    '              <div className="mb-4">\n',
    '                <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-2 font-medium">Selecciona el monto a pagar</p>\n',
    '                <div className="space-y-2">\n',
    '                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${paymentType === \'advance\' ? \'border-[#00ff41]/50 bg-[#00ff41]/5\' : \'border-white/10 hover:border-white/20\'}`}>\n',
    '                    <input type="radio" name="paymentType" value="advance" checked={paymentType === \'advance\'} onChange={() => setPaymentType(\'advance\')} className="accent-[#00ff41] w-4 h-4" />\n',
    '                    <div className="flex-1">\n',
    '                      <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">Pagar adelanto (50%)</p>\n',
    '                      <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Pago minimo obligatorio para confirmar la reserva</p>\n',
    '                    </div>\n',
    '                    <span className="text-sm font-bold text-[#00ff41] font-[family-name:var(--font-sora)]">S/ {advanceAmount.toFixed(2)}</span>\n',
    '                  </label>\n',
    '                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${paymentType === \'full_payment\' ? \'border-[#00ff41]/50 bg-[#00ff41]/5\' : \'border-white/10 hover:border-white/20\'}`}>\n',
    '                    <input type="radio" name="paymentType" value="full_payment" checked={paymentType === \'full_payment\'} onChange={() => setPaymentType(\'full_payment\')} className="accent-[#00ff41] w-4 h-4" />\n',
    '                    <div className="flex-1">\n',
    '                      <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">Pagar el total (100%)</p>\n',
    '                      <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Tu reserva quedara completamente pagada</p>\n',
    '                    </div>\n',
    '                    <span className="text-sm font-bold text-[#00ff41] font-[family-name:var(--font-sora)]">S/ {totalPrice.toFixed(2)}</span>\n',
    '                  </label>\n',
    '                </div>\n',
    '              </div>\n',
]
insert_after(875, radio_selector_lines)
print("✓ Change 3a: Payment Type Selector inserted")

# Now the old lines 876-891 have shifted down by len(radio_selector_lines) = 22 lines
# So they are now at original 876 + 22 = 898 through 891 + 22 = 913
# Replace those lines with the new dynamic payment summary
new_payment_summary = [
    '              <div className="border-t border-dashed border-white/10 pt-2 flex items-center justify-between">\n',
    '                <div className="flex items-center gap-2">\n',
    '                  <span className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Monto a pagar</span>\n',
    '                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#00ff41]/15 text-[#00ff41] border border-[#00ff41]/30 font-[family-name:var(--font-inter)]">\n',
    '                    {paymentType === \'full_payment\' ? \'PAGO TOTAL\' : \'ADELANTO\'}\n',
    '                  </span>\n',
    '                </div>\n',
    '                <span className="text-sm font-bold text-[#00ff41] font-[family-name:var(--font-sora)]">S/ {paymentAmount.toFixed(2)}</span>\n',
    '              </div>\n',
    '              <div className="border-t border-dashed border-white/10 pt-2 flex items-center justify-between">\n',
    '                <span className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Saldo pendiente</span>\n',
    '                <span className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">S/ {paymentRemaining.toFixed(2)}</span>\n',
    '              </div>\n',
    '              <div className="border-t border-white/5 pt-2 flex items-center justify-between">\n',
    '                <span className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">Total</span>\n',
    '                <span className="text-lg font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">S/ {totalPrice.toFixed(2)}</span>\n',
    '              </div>\n',
]

# The old 876-891 are now at shifted positions: 876+22=898 to 891+22=913
replace_range(898, 913, new_payment_summary)
print("✓ Change 3b: Payment summary section replaced")

# ──────────────────────────────────────────────────────────────
# CHANGE 5b: handleSubmit - add paymentType to API body
# Find the line with `remainingAmount: rem,` and add `paymentType` after it
# Original line 440:          remainingAmount: rem,
# It has shifted by 0 so far (changes above are all below this line)
# Wait - changes 3a/3b are BELOW this line? No, 876-891 is below 440.
# So line 440 is unaffected by changes above. Let me search for it.
# ──────────────────────────────────────────────────────────────

# Find the line with "remainingAmount: rem,"
for i, line in enumerate(lines):
    if 'remainingAmount: rem,' in line and i < 500:
        # Add paymentType after this line
        lines.insert(i + 1, '          paymentType: paymentType,\n')
        print(f"✓ Change 5b: Added paymentType to API body after line {i+1}")
        break

# ──────────────────────────────────────────────────────────────
# CHANGE 5a: handleSubmit - update advance calculation (original lines 426-427)
# ──────────────────────────────────────────────────────────────
# Original line 426: const adv = Math.round(calcTotal * 50) / 100
# Original line 427: const rem = Math.round((calcTotal - adv) * 100) / 100
# These haven't shifted yet (all changes above are below line 270 except 3a/3b which are below 875)
# Actually let me search for them to be safe
for i, line in enumerate(lines):
    if 'const adv = Math.round(calcTotal * 50) / 100' in line:
        lines[i] = "      const isFull = paymentType === 'full_payment'\n"
        lines.insert(i + 1, "      const adv = isFull ? calcTotal : Math.round(calcTotal * 50) / 100\n")
        # Now line i+2 is the old rem line
        lines[i + 2] = "      const rem = isFull ? 0 : Math.round((calcTotal - adv) * 100) / 100\n"
        print(f"✓ Change 5a: Updated advance calculation at line {i+1}")
        break

# ──────────────────────────────────────────────────────────────
# CHANGE 8b: After `const booking = await res.json()` add paymentId extraction
# Original line 468
# ──────────────────────────────────────────────────────────────
for i, line in enumerate(lines):
    if 'const booking = await res.json()' in line:
        lines.insert(i + 1, "      const paymentId = booking.paymentId || null\n")
        lines.insert(i + 2, "      setLastPaymentId(paymentId)\n")
        print(f"✓ Change 8b: Added paymentId extraction after line {i+1}")
        break

# ──────────────────────────────────────────────────────────────
# CHANGE 2: Add paymentAmount and paymentRemaining after line 270
# (original line 270: const remainingAmount = ...)
# ──────────────────────────────────────────────────────────────
for i, line in enumerate(lines):
    if line.strip() == 'const remainingAmount = Math.round((totalPrice - advanceAmount) * 100) / 100':
        lines.insert(i + 1, '\n')
        lines.insert(i + 2, '  const paymentAmount = paymentType === \'full_payment\' ? totalPrice : advanceAmount\n')
        lines.insert(i + 3, '  const paymentRemaining = paymentType === \'full_payment\' ? 0 : remainingAmount\n')
        print(f"✓ Change 2: Added paymentAmount/paymentRemaining after line {i+1}")
        break

# ──────────────────────────────────────────────────────────────
# CHANGE 1: Add paymentType state after activePaymentMethod state (original line 163)
# ──────────────────────────────────────────────────────────────
for i, line in enumerate(lines):
    if "const [activePaymentMethod, setActivePaymentMethod] = useState<'yape_qr' | 'culqi'>('yape_qr')" in line:
        lines.insert(i + 1, "  const [paymentType, setPaymentType] = useState<'advance' | 'full_payment'>('advance')\n")
        print(f"✓ Change 1: Added paymentType state after line {i+1}")
        break

# ──────────────────────────────────────────────────────────────
# CHANGE 8a: Add lastPaymentId state
# Add it right after the paymentType state we just inserted
# ──────────────────────────────────────────────────────────────
for i, line in enumerate(lines):
    if "const [paymentType, setPaymentType] = useState<'advance' | 'full_payment'>('advance')" in line:
        lines.insert(i + 1, "  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null)\n")
        print(f"✓ Change 8a: Added lastPaymentId state after line {i+1}")
        break

# ════════════════════════════════════════════════════════════
# Write the result
# ════════════════════════════════════════════════════════════
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\n✅ Done! File written successfully. Total lines: {len(lines)}")
