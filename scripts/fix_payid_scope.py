#!/usr/bin/env python3
"""Fix: hoist payId out of the if block so the response reuses the same ID."""

FILE_PATH = '/home/z/my-project/src/app/api/bookings/route.ts'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Declare payId before the if block
old_before = """    // Booking was already created inside the transaction (P1-5)
    const id = bookingId;

    // B5 FIX: Create payment record with full audit data
    if (adv > 0.01) {
      try {
        const payType = isFullPayment ? 'full_payment' : 'advance';
        const payAmount = adv;
        const payRemaining = rem;
        const payId = generatePaymentId();"""

new_before = """    // Booking was already created inside the transaction (P1-5)
    const id = bookingId;

    // B5 FIX: Create payment record with full audit data
    let payId: string | undefined = undefined;
    if (adv > 0.01) {
      try {
        const payType = isFullPayment ? 'full_payment' : 'advance';
        const payAmount = adv;
        const payRemaining = rem;
        payId = generatePaymentId();"""

assert old_before in content, "Could not find the payment block start"
content = content.replace(old_before, new_before)

# 2. Use the hoisted payId in the response instead of generating a new one
old_resp = """      paymentId: adv > 0.01 ? generatePaymentId() : undefined,"""
new_resp = """      paymentId: payId,"""

assert old_resp in content, "Could not find the response paymentId line"
content = content.replace(old_resp, new_resp)

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed: payId is now hoisted and reused in the response.")
