with open('src/components/bookings/UnifiedBookingView.tsx', 'r') as f:
    lines = f.readlines()

# Find the success step icon and title (check_circle + "Reserva Confirmada")
# Replace with conditional rendering based on payment method
for i, line in enumerate(lines):
    if 'Reserva Confirmada' in line and 'font-sora' in line:
        # Replace the title
        lines[i] = line.replace(
            'Reserva Confirmada',
            '{activePaymentMethod === "yape_qr" ? "Pago Registrado" : "Reserva Confirmada"}'
        )
        print(f'Fixed line {i+1}: title now conditional')
        
        # Find the subtitle line (Tu reserva ha sido registrada exitosamente)
        for j in range(i, min(i+5, len(lines))):
            if 'Tu reserva ha sido registrada exitosamente' in lines[j]:
                lines[j] = lines[j].replace(
                    'Tu reserva ha sido registrada exitosamente',
                    '{activePaymentMethod === "yape_qr" ? "Tu reserva queda pendiente de validaci\u00f3n. Recibir\u00e1s una notificaci\u00f3n cuando se confirme." : "Tu reserva ha sido registrada exitosamente"}'
                )
                print(f'Fixed line {j+1}: subtitle now conditional')
                break
        break

# Change the icon color for yape (amber instead of green)
for i, line in enumerate(lines):
    if 'text-[#00ff41] text-[48px]' in line and 'check_circle' in line:
        lines[i] = line.replace(
            'bg-[#00ff41]/10 border-2 border-[#00ff41]/30 flex items-center justify-center mb-6">\n            <span className="material-symbols-outlined text-[#00ff41] text-[48px]"',
            'className={`w-24 h-24 rounded-full ${activePaymentMethod === "yape_qr" ? "bg-amber-500/10 border-2 border-amber-500/30" : "bg-[#00ff41]/10 border-2 border-[#00ff41]/30"} flex items-center justify-center mb-6`}>\n            <span className={`material-symbols-outlined text-[48px] ${activePaymentMethod === "yape_qr" ? "text-amber-400" : "text-[#00ff41]"}`}'
        )
        print(f'Fixed line {i+1}: icon color conditional')
        break

# Change icon for yape (hourglass instead of check)
for i, line in enumerate(lines):
    if 'check_circle' in line and '48px' in line and i < 1000:
        lines[i] = line.replace(
            'check_circle',
            '{activePaymentMethod === "yape_qr" ? "hourglass_top" : "check_circle"}'
        )
        print(f'Fixed line {i+1}: icon conditional')
        break

# Fix the adelanto section for yape (show pending instead of paid)
for i, line in enumerate(lines):
    if 'Adelanto pagado' in line and 'text-[#00ff41]' in line:
        lines[i] = line.replace(
            '<span className="text-xs text-[#00ff41]',
            '<span className={`text-xs ${activePaymentMethod === "yape_qr" ? "text-amber-400" : "text-[#00ff41]"}`}'
        )
        print(f'Fixed line {i+1}: adelanto label conditional')
        
        # Fix the text
        lines[i] = lines[i].replace(
            'Adelanto pagado',
            '{activePaymentMethod === "yape_qr" ? "Pago pendiente de validaci\u00f3n" : "Adelanto pagado"}'
        )
        print(f'Fixed line {i+1}: adelanto text conditional')
        
        # Fix the amount color
        for j in range(i, min(i+2, len(lines))):
            if 'S/' in lines[j] and 'advanceAmount' in lines[j] and 'text-[#00ff41]' in lines[j]:
                lines[j] = lines[j].replace(
                    'text-[#00ff41]',
                    '{activePaymentMethod === "yape_qr" ? "text-amber-400" : "text-[#00ff41]"}'
                )
                print(f'Fixed line {j+1}: amount color conditional')
                break
        break

with open('src/components/bookings/UnifiedBookingView.tsx', 'w') as f:
    f.writelines(lines)

print('Success step updated!')
