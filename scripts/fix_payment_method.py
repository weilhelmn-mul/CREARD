with open('src/components/bookings/UnifiedBookingView.tsx', 'r') as f:
    lines = f.readlines()

# Fix 1: Change hardcoded 'culqi' payment method to use activePaymentMethod
for i, line in enumerate(lines):
    if "paymentMethod: 'culqi'" in line:
        lines[i] = line.replace("paymentMethod: 'culqi'", "paymentMethod: activePaymentMethod === 'yape_qr' ? 'Yape QR' : 'culqi'")
        print(f'Fixed line {i+1}: paymentMethod now dynamic')

with open('src/components/bookings/UnifiedBookingView.tsx', 'w') as f:
    f.writelines(lines)

print('Done!')
