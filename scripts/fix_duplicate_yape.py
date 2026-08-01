#!/usr/bin/env python3
"""Fix duplicate yape key in BookingsView.tsx"""

FILE = '/home/z/my-project/src/components/bookings/BookingsView.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    text = f.read()

old = """const paymentMethodLabels: Record<string, string> = {
  'yape qr': 'Yape QR',
  'Yape QR': 'Yape QR',
  yape: 'Yape',
  yape: 'Yape',
  plin: 'Plin',
  culqi: 'Culqi',
  card: 'Tarjeta',
  cash: 'Efectivo',
  transfer: 'Transferencia',
}"""

new = """const paymentMethodLabels: Record<string, string> = {
  'yape qr': 'Yape QR',
  'Yape QR': 'Yape QR',
  yape: 'Yape',
  plin: 'Plin',
  culqi: 'Culqi',
  card: 'Tarjeta',
  cash: 'Efectivo',
  transfer: 'Transferencia',
}"""

if old in text:
    text = text.replace(old, new)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(text)
    print('OK: Fixed duplicate yape key')
else:
    print('WARN: Exact block not found')
