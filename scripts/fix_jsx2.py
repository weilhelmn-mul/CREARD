with open('src/components/bookings/UnifiedBookingView.tsx', 'r') as f:
    lines = f.readlines()

# Remove the problematic lines 949-952 (the empty div block and comment)
# Line 949: comment
# Line 950: empty line
# Line 951: inner comment
# Line 952: </div>
to_remove = set()
for i in range(948, min(953, len(lines))):
    stripped = lines[i].strip()
    if stripped in ['{/* Method selector (only if both active) */}', '</div>', '']:
        to_remove.add(i)
    elif 'Payment: Yape QR or Culqi based on config' in stripped:
        to_remove.add(i)

# Remove lines in reverse order
for i in sorted(to_remove, reverse=True):
    del lines[i]
    print(f'Removed line {i+1}')

with open('src/components/bookings/UnifiedBookingView.tsx', 'w') as f:
    f.writelines(lines)

print('Fixed!')
