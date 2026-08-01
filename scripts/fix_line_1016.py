with open('src/components/bookings/UnifiedBookingView.tsx', 'r') as f:
    lines = f.readlines()

# Fix line 1016 - className needs backticks, not quotes
for i, line in enumerate(lines):
    if 'text-sm font-bold {activePaymentMethod' in line and 'S/ {advanceAmount' in line:
        # This line uses regular quotes but has JSX expressions - needs backticks
        lines[i] = line.replace(
            'className="text-sm font-bold {activePaymentMethod === "yape_qr" ? "text-amber-400" : "text-[#00ff41]"} font-[family-name:var(--font-sora)]"',
            'className={`text-sm font-bold ${activePaymentMethod === "yape_qr" ? "text-amber-400" : "text-[#00ff41]"} font-[family-name:var(--font-sora)]`}'
        )
        print(f'Fixed line {i+1}')
        break

# Also fix line 1015 - check it has font- outside the template
for i, line in enumerate(lines):
    if 'Pago pendiente de validacion' in line:
        # The font-[family-name:var(--font-inter)] should be INSIDE the template literal
        # Current: className={`text-xs ${...}`} font-[...]
        # Should be: className={`text-xs ${...} font-[...]`}
        lines[i] = line.replace(
            '`} font-[family-name:var(--font-inter)] font-semibold',
            ' font-[family-name:var(--font-inter)] font-semibold`}'
        )
        print(f'Fixed line {i+1}')
        break

with open('src/components/bookings/UnifiedBookingView.tsx', 'w') as f:
    f.writelines(lines)

print('Fixed!')
