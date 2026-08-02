#!/usr/bin/env python3
"""Fix: add setSuccess(true) to Yape onPaymentMarked callback"""

FILE = '/home/z/my-project/src/components/bookings/UnifiedBookingView.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the exact pattern
for i, line in enumerate(lines):
    if "setFormStep('done')" in line and i > 900:
        # Check it's the Yape callback (inside onPaymentMarked)
        if 'onPaymentMarked' in ''.join(lines[max(0,i-5):i]):
            print(f'Found at line {i+1}: {repr(line.strip())}')
            # Check next line
            print(f'Next line: {repr(lines[i+1].strip())}')
            
            # Insert setSuccess(true) after setFormStep('done')
            indent = '              '
            lines.insert(i+1, f'{indent}setSuccess(true)\n')
            with open(FILE, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            print('OK: Added setSuccess(true) after setFormStep(done)')
            break
