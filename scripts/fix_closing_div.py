#!/usr/bin/env python3
"""Fix missing closing </div> for Payment Type Selector."""

FILE = '/home/z/my-project/src/components/bookings/UnifiedBookingView.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find line 906 which is: "                </div>\n" (closes space-y-2 inside the radio selector)
# It's followed by line 907 which starts with: "              <div className="border-t..."
# We need to insert a closing </div> for the <div className="mb-4"> between them

# Find the pattern: after the closing of the radio label group's space-y-2 div,
# before the border-t payment summary divs
for i in range(len(lines) - 1):
    # Look for the end of the radio selector's inner space-y-2
    if '</label>' in lines[i]:
        # Check if the next few lines close the space-y-2 and then start border-t
        if i + 1 < len(lines) and lines[i+1].strip() == '</div>' and i + 2 < len(lines) and 'border-t border-dashed' in lines[i+2]:
            # Insert </div> after the </div> on line i+1 (to close div className="mb-4")
            lines.insert(i+2, '              </div>\n')
            print(f"✓ Inserted missing </div> for Payment Type Selector at line {i+3}")
            break

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"✅ Fixed! Total lines: {len(lines)}")
