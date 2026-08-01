with open('src/components/bookings/UnifiedBookingView.tsx', 'r') as f:
    lines = f.readlines()

# Find the Culqi Payment comment line and the security badge closing
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if '{/* Culqi Payment */}' in line:
        start_idx = i
    if start_idx is not None and '{/* Security badge */}' in line:
        # Find the closing of the security badge div block (3 lines after)
        for j in range(i, min(i + 5, len(lines))):
            if 'Pagos seguros procesados por Culqi' in lines[j]:
                end_idx = j + 1
                break
        break

print(f'Culqi section: {start_idx} to {end_idx}')

if start_idx is not None and end_idx is not None:
    new_section = '''          {/* Payment: Yape QR or Culqi based on config */}
          <div className="flex flex-col gap-4">
            {/* Method selector (only if both active) */}
          </div>
          <YapeQRPayButton
            bookingIds={createdBookings.map((b: any) => b.id)}
            amount={advanceAmount}
            userEmail={clientEmail || user?.email || ''}
            onPaymentMarked={() => {
              setFormStep('done')
            }}
            onBack={() => setFormStep('summary')}
          />
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="material-symbols-outlined text-[16px] text-cm-on-surface-variant/40" style={{ fontVariationSettings: '"FILL" 1' }}>lock</span>
            <span className="text-[10px] text-cm-on-surface-variant/40 font-[family-name:var(--font-inter)]">
              Pago seguro mediante Yape
            </span>
          </div>'''

    # Replace lines from start_idx to end_idx
    lines[start_idx:end_idx] = [new_section + '\n']
    print('Replaced Culqi section with Yape QR')
else:
    print('Could not find section bounds')

with open('src/components/bookings/UnifiedBookingView.tsx', 'w') as f:
    f.writelines(lines)

print('Phase 2 complete!')
