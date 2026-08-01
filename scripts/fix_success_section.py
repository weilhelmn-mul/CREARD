with open('src/components/bookings/UnifiedBookingView.tsx', 'rb') as f:
    content = f.read()

# The problem: font-[family-name:var(--font-inter)] inside template literals breaks JSX parser
# Solution: Replace the entire problematic block with a simpler version that doesn't use
# template literals for the className

# Original problematic pattern (line 1015):
# <span className={`text-xs ${activePaymentMethod === "yape_qr" ? "text-amber-400" : "text-[#00ff41]"} font-[family-name:var(--font-inter)] font-semibold`}>
# {activePaymentMethod === "yape_qr" ? "Pago pendiente..." : "Adelanto pagado"}</span>

# Replace with: use a variable approach or separate spans
old_1015 = b'className={`text-xs ${activePaymentMethod === "yape_qr" ? "text-amber-400" : "text-[#00ff41]"} font-[family-name:var(--font-inter)] font-semibold`}>{activePaymentMethod === "yape_qr" ? "Pago pendiente de validaci\xc3\xb3n" : "Adelanto pagado"}'

new_1015 = b'className={activePaymentMethod === "yape_qr" ? "text-xs text-amber-400 font-semibold" : "text-xs text-[#00ff41] font-semibold"}>{activePaymentMethod === "yape_qr" ? "Pago pendiente de validaci\xc3\xb3n" : "Adelanto pagado"}'

if old_1015 in content:
    content = content.replace(old_1015, new_1015, 1)
    print('Fixed line 1015 - no template literal')
else:
    print('Pattern 1015 not found')

# Also fix line 1016 if it still uses template literal with font-[]
old_1016 = b'className={`text-sm font-bold ${activePaymentMethod === "yape_qr" ? "text-amber-400" : "text-[#00ff41]"} font-[family-name:var(--font-sora)]`}'
new_1016 = b'className={activePaymentMethod === "yape_qr" ? "text-sm font-bold text-amber-400" : "text-sm font-bold text-[#00ff41]"}'

if old_1016 in content:
    content = content.replace(old_1016, new_1016, 1)
    print('Fixed line 1016 - no template literal')
else:
    print('Pattern 1016 not found')

with open('src/components/bookings/UnifiedBookingView.tsx', 'wb') as f:
    f.write(content)

print('Done!')
