with open('src/components/bookings/UnifiedBookingView.tsx', 'r') as f:
    lines = f.readlines()

# Remove the orphaned </div> at line 968
if '</div>' in lines[967] and lines[967].strip() == '</div>':
    del lines[967]
    print('Removed orphaned </div>')
else:
    print(f'Line 968: {repr(lines[967])}')

# Also fix the empty div block at lines 949-952
for i, line in enumerate(lines):
    if '{/* Method selector (only if both active) */}' in line:
        # Remove the empty div wrapper
        for j in range(i-1, i+3):
            if '<div className="flex flex-col gap-4">' in lines[j]:
                lines[j] = lines[j].replace('<div className="flex flex-col gap-4">', '')
                print(f'Cleaned line {j+1}')
        break

with open('src/components/bookings/UnifiedBookingView.tsx', 'w') as f:
    f.writelines(lines)

print('Fixed!')
