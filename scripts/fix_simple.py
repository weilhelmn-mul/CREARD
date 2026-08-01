with open('src/components/bookings/UnifiedBookingView.tsx', 'rb') as f:
    content = f.read()

# Fix line 1015: avoid text-[#00ff41] inside JSX expression
# Use a simple approach - just keep the color conditional but without arbitrary values
idx = content.find(b'Pago pendiente de validaci')
if idx > 0:
    start = content.rfind(b'<span', 0, idx)
    end = content.find(b'</span>', idx) + len(b'</span>')
    old_block = content[start:end]
    
    # Just use the original green for both - the text label change is enough
    new_block = b'<span className="text-xs text-cm-on-surface-variant font-medium">{activePaymentMethod === "yape_qr" ? "\xe2\x8f\xb3 Pago pendiente de validaci\xc3\xb3n" : "\xe2\x9c\x94 Adelanto pagado"}</span>'
    content = content[:start] + new_block + content[end:]
    print(f'Fixed line 1015 ({start})')

# Fix line 1016: also remove arbitrary value from expression  
idx2 = content.find(b'S/ {advanceAmount.toFixed(2)}</span>')
if idx2 > 0:
    start2 = content.rfind(b'<span', 0, idx2)
    end2 = idx2 + len(b'S/ {advanceAmount.toFixed(2)}</span>')
    old_block2 = content[start2:end2]
    
    # Keep original green for the amount - no conditional needed
    new_block2 = b'<span className="text-sm font-bold text-[#00ff41] font-[family-name:var(--font-sora)]">S/ {advanceAmount.toFixed(2)}</span>'
    content = content[:start2] + new_block2 + content[end2:]
    print(f'Fixed line 1016 ({start2})')

with open('src/components/bookings/UnifiedBookingView.tsx', 'wb') as f:
    f.write(content)

print('Done!')
