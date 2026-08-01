with open('src/components/bookings/UnifiedBookingView.tsx', 'rb') as f:
    content = f.read()

# Find and replace the exact byte pattern
old = b'<span className={`text-xs ${activePaymentMethod === "yape_qr" ? "text-amber-400" : "text-[#00ff41]"} font-[family-name:var(--font-inter)] font-semibold`}>{activePaymentMethod === "yape_qr" ? "Pago pendiente de validaci\xc3\xb3n" : "Adelanto pagado"}</span>'

new = b'<span className={activePaymentMethod === "yape_qr" ? "text-xs text-amber-400 font-semibold" : "text-xs text-[#00ff41] font-semibold"}>{activePaymentMethod === "yape_qr" ? "Pago pendiente de validaci\xc3\xb3n" : "Adelanto pagado"}</span>'

if old in content:
    content = content.replace(old, new, 1)
    print('Fixed!')
else:
    print('Not found!')
    # Try with different encoding
    idx = content.find(b'Pago pendiente de validaci')
    if idx > 0:
        start = content.rfind(b'<span', 0, idx)
        end = content.find(b'</span>', idx) + len(b'</span>')
        old_block = content[start:end]
        print(f'Found at {start}-{end}')
        # Replace the className part only
        new_block = old_block.replace(
            b'className={`text-xs ${activePaymentMethod === "yape_qr" ? "text-amber-400" : "text-[#00ff41]"} font-[family-name:var(--font-inter)] font-semibold`}',
            b'className={activePaymentMethod === "yape_qr" ? "text-xs text-amber-400 font-semibold" : "text-xs text-[#00ff41] font-semibold"}'
        )
        content = content[:start] + new_block + content[end:]
        print('Fixed with fallback!')

with open('src/components/bookings/UnifiedBookingView.tsx', 'wb') as f:
    f.write(content)

print('Done!')
