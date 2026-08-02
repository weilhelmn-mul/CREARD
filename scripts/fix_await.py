#!/usr/bin/env python3
"""Fix: add await to generatePaymentId() call in bookings API"""

filepath = '/home/z/my-project/src/app/api/bookings/route.ts'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: payId = generatePaymentId() -> payId = await generatePaymentId()
content = content.replace('payId = generatePaymentId();', 'payId = await generatePaymentId();')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed: added await to generatePaymentId()")