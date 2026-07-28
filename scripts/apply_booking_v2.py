import sys

with open('src/components/bookings/UnifiedBookingView.tsx', 'r') as f:
    lines = f.readlines()

with open('scripts/new_court_selector_v2.txt', 'r') as f:
    court_selector = f.read()

with open('scripts/new_time_slots_v2.txt', 'r') as f:
    time_slots = f.read()

# Court selector: lines 591-673 (0-indexed 590-672)
# Empty line: line 674 (0-indexed 673) — wait, let me check
# Actually line 673 is '</div>' and 674 is the time slot comment
# Court selector: 0-indexed 590 to 672 (lines 591-673)
# Time slots: 0-indexed 673 to 723 (lines 674-724)

new_content = ''.join(lines[:590]) + court_selector + '\n' + time_slots + '\n' + ''.join(lines[724:])

with open('src/components/bookings/UnifiedBookingView.tsx', 'w') as f:
    f.write(new_content)

new_lines = new_content.split('\n')
print(f'Original: {len(lines)} lines')
print(f'New: {len(new_lines)} lines')
print('Done!')
