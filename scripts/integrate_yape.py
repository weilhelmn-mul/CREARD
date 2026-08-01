with open('src/components/bookings/UnifiedBookingView.tsx', 'r') as f:
    lines = f.readlines()

# 1. Add import for YapeQRPayButton after CulqiPayButton import (line 8)
import_line = "import YapeQRPayButton from '@/components/payments/YapeQRPayButton'\n"
if 'YapeQRPayButton' not in ''.join(lines):
    lines.insert(8, import_line)
    print('1. Added YapeQRPayButton import')
else:
    print('1. Import already exists')

# 2. Find formStep state line
formStep_idx = None
for i, line in enumerate(lines):
    if "useState<'select'" in line:
        formStep_idx = i
        break

if formStep_idx:
    state_line = "  const [activePaymentMethod, setActivePaymentMethod] = useState<'yape_qr' | 'culqi'>('yape_qr')\n"
    if 'activePaymentMethod' not in ''.join(lines):
        lines.insert(formStep_idx + 1, state_line)
        print('2. Added activePaymentMethod state')
    else:
        print('2. State already exists')

# 3. Add useEffect to fetch payment methods after the state declaration
pm_fetch_idx = None
for i, line in enumerate(lines):
    if 'activePaymentMethod' in line and 'useState' in line:
        pm_fetch_idx = i + 1
        break

if pm_fetch_idx:
    fetch_lines = [
        '\n',
        '  // Fetch active payment methods from Firebase\n',
        '  useEffect(() => {\n',
        '    fetch(\'/api/payment-methods\')\n',
        '      .then(r => r.json())\n',
        '      .then(data => {\n',
        '        if (data.culqi && data.yape_qr) setActivePaymentMethod(\'yape_qr\')\n',
        '        else if (data.culqi) setActivePaymentMethod(\'culqi\')\n',
        '        else setActivePaymentMethod(\'yape_qr\')\n',
        '      })\n',
        '      .catch(() => setActivePaymentMethod(\'yape_qr\'))\n',
        '  }, [])\n',
    ]
    if 'payment-methods' not in ''.join(lines):
        for j, fl in enumerate(fetch_lines):
            lines.insert(pm_fetch_idx + j, fl)
        print('3. Added payment methods fetch')
    else:
        print('3. Fetch already exists')

with open('src/components/bookings/UnifiedBookingView.tsx', 'w') as f:
    f.writelines(lines)

print('Phase 1 complete!')
