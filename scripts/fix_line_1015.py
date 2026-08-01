with open('src/components/bookings/UnifiedBookingView.tsx', 'rb') as f:
    content = f.read()

# Fix line 1015: move font-[family-name:var(--font-inter)] inside the template literal
# The pattern is: `} font-[family-name:var(--font-inter)] font-semibold"
# Should be: font-[family-name:var(--font-inter)] font-semibold`}

old = b'`} font-[family-name:var(--font-inter)] font-semibold">'
new = b' font-[family-name:var(--font-inter)] font-semibold`}">'

if old in content:
    content = content.replace(old, new, 1)
    print('Fixed line 1015')
else:
    print('Pattern not found')

with open('src/components/bookings/UnifiedBookingView.tsx', 'wb') as f:
    f.write(content)

print('Done!')
