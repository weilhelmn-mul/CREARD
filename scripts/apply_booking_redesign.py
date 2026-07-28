import sys

with open('src/components/bookings/UnifiedBookingView.tsx', 'r') as f:
    lines = f.readlines()

with open('scripts/new_court_selector.txt', 'r') as f:
    court_selector = f.read()

with open('scripts/new_time_slots.txt', 'r') as f:
    time_slots = f.read()

# Boundaries (0-indexed):
# Court selector: lines 590-647 (inclusive) = 58 lines
# Empty separator: line 648
# Time slots: lines 649-725 (inclusive) = 77 lines
# Empty line: line 726
# Rest starts at: line 727

new_content = ''.join(lines[:590]) + court_selector + '\n' + time_slots + '\n' + ''.join(lines[727:])

with open('src/components/bookings/UnifiedBookingView.tsx', 'w') as f:
    f.write(new_content)

print(f'Original: {len(lines)} lines')
new_lines = new_content.split('\n')
print(f'New: {len(new_lines)} lines')
print('Done!')
