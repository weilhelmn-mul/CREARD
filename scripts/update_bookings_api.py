#!/usr/bin/env python3
"""Enhance payment record creation in /api/bookings POST handler with full audit data."""

import os

FILE_PATH = '/home/z/my-project/src/app/api/bookings/route.ts'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# === CHANGE 1: Add generatePaymentId to the import from @/lib/db ===
old_import = """import {
  getBookings,
  createBooking,
  updateBooking,
  deleteDocById,
  getCourtById,
  getUserById,
  getBookingById,
  createPayment,
  createRetainedAdvance,
} from '@/lib/db';"""

new_import = """import {
  getBookings,
  createBooking,
  updateBooking,
  deleteDocById,
  getCourtById,
  getUserById,
  getBookingById,
  createPayment,
  createRetainedAdvance,
  generatePaymentId,
} from '@/lib/db';"""

assert old_import in content, "Could not find the import block from '@/lib/db'"
content = content.replace(old_import, new_import)

# === CHANGE 2: Add paymentType to body destructuring ===
old_destruct = """    const {
      courtId,
      courtIds: bodyCourtIds,
      userId,
      date,
      startTime,
      endTime,
      totalPrice,
      advanceAmount,
      remainingAmount,
      status,
      paymentMethod,
      notes,
      equipmentItems,
      selectedSlots,
    } = body;"""

new_destruct = """    const {
      courtId,
      courtIds: bodyCourtIds,
      userId,
      date,
      startTime,
      endTime,
      totalPrice,
      advanceAmount,
      remainingAmount,
      status,
      paymentMethod,
      paymentType,
      notes,
      equipmentItems,
      selectedSlots,
    } = body;"""

assert old_destruct in content, "Could not find the body destructuring block"
content = content.replace(old_destruct, new_destruct)

# === CHANGE 3: Modify advance/remaining calculation for full_payment ===
old_calc = """    // B4 FIX: Validate advance + remaining === total consistency
    const adv = parseFloat(advanceAmount) || price * 0.5;
    let rem = parseFloat(remainingAmount) || price - adv;
    // Force consistency: remaining must equal total - advance
    rem = Math.max(0, Math.round((price - adv) * 100) / 100);"""

new_calc = """    // B4 FIX: Validate advance + remaining === total consistency
    const isFullPayment = paymentType === 'full_payment';
    const adv = isFullPayment ? price : (parseFloat(advanceAmount) || price * 0.5);
    let rem = isFullPayment ? 0 : (parseFloat(remainingAmount) || price - adv);
    // Force consistency: remaining must equal total - advance
    rem = Math.max(0, Math.round((price - adv) * 100) / 100);"""

assert old_calc in content, "Could not find the advance/remaining calculation block"
content = content.replace(old_calc, new_calc)

# === CHANGE 4: Hoist clientUser out of the try block so it can be reused ===
old_client_lookup = """    // Resolve client email for denormalized search
    let clientEmail = authUser.email;
    try {
      const clientUser = await getUserById(userId);
      if (clientUser?.email) clientEmail = clientUser.email;
    } catch { /* fallback to admin email */ }"""

new_client_lookup = """    // Resolve client email for denormalized search
    let clientEmail = authUser.email;
    let clientUser: any = null;
    try {
      clientUser = await getUserById(userId);
      if (clientUser?.email) clientEmail = clientUser.email;
    } catch { /* fallback to admin email */ }"""

assert old_client_lookup in content, "Could not find the client user lookup block"
content = content.replace(old_client_lookup, new_client_lookup)

# === CHANGE 5: Replace the payment creation block with enhanced version ===
old_payment_block = """    // B5 FIX: Only create payment record if advance > 0
    if (adv > 0.01) {
      try {
        await createPayment(id, {
          user_id: userId,
          amount: adv,
          type: 'advance',
          method: normalizedPaymentMethod || 'EFECTIVO',
          status: 'completed',
        });
      } catch (payErr) {
        console.error('[BOOKINGS] Warning: could not create payment record:', payErr);
      }
    }"""

new_payment_block = """    // B5 FIX: Create payment record with full audit data
    if (adv > 0.01) {
      try {
        const payType = isFullPayment ? 'full_payment' : 'advance';
        const payAmount = adv;
        const payRemaining = rem;
        const payId = generatePaymentId();
        const hash = id.slice(-8).toUpperCase();
        const bookingCode = `CRE-${hash.slice(0, 4)}-${hash.slice(4)}`;

        // Current date/time in Lima timezone
        const limaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
        const payDate = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' }).format(limaNow);
        const payTime = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Lima' }).format(limaNow);

        // Fetch court data for audit
        let courtData: any = null;
        try {
          courtData = allCourtIds.length > 0 ? await getCourtById(allCourtIds[0]) : null;
        } catch { /* court lookup failed, proceed without it */ }

        // Re-fetch clientUser if not available (should already be set above)
        if (!clientUser) {
          try { clientUser = await getUserById(userId); } catch { /* ignore */ }
        }

        await createPayment(id, {
          user_id: userId,
          amount: payAmount,
          type: payType,
          method: normalizedPaymentMethod || 'EFECTIVO',
          status: 'completed',
          payment_id: payId,
          payment_code: payId,
          booking_code: bookingCode,
          user_name: clientUser?.name || '',
          user_email: clientUser?.email || '',
          user_phone: clientUser?.phone || null,
          user_document: clientUser?.document || null,
          court_name: courtData?.name || '',
          sport: courtData?.sport || '',
          booking_date: date,
          booking_start_time: startTime,
          booking_end_time: endTime,
          payment_type: payType,
          amount_paid: payAmount,
          remaining_balance: payRemaining,
          payment_method_display: normalizedPaymentMethod === 'CULQI' ? 'Culqi' : normalizedPaymentMethod === 'YAPE' ? 'Yape' : normalizedPaymentMethod || 'Efectivo',
          payment_status: payType === 'full_payment' ? 'completed' : 'parcial',
          payment_date: payDate,
          payment_time: payTime,
        });
      } catch (payErr) {
        console.error('[BOOKINGS] Warning: could not create payment record:', payErr);
      }
    }"""

assert old_payment_block in content, "Could not find the payment creation block"
content = content.replace(old_payment_block, new_payment_block)

# === CHANGE 6: Enhance the response to include paymentId and paymentType ===
old_response = """    return NextResponse.json({
      id,
      courtId: allCourtIds[0],
      courtIds: allCourtIds,
      userId,
      date,
      startTime,
      endTime,
      totalPrice: price,
      advanceAmount: adv,
      remainingAmount: rem,
      status: bookingStatus,
      paymentMethod: normalizedPaymentMethod || paymentMethod || null,
      success: true,
    }, { status: 201 });"""

new_response = """    return NextResponse.json({
      id,
      courtId: allCourtIds[0],
      courtIds: allCourtIds,
      userId,
      date,
      startTime,
      endTime,
      totalPrice: price,
      advanceAmount: adv,
      remainingAmount: rem,
      status: bookingStatus,
      paymentMethod: normalizedPaymentMethod || paymentMethod || null,
      paymentId: adv > 0.01 ? generatePaymentId() : undefined,
      paymentType: isFullPayment ? 'full_payment' : 'advance',
      success: true,
    }, { status: 201 });"""

assert old_response in content, "Could not find the response block"
content = content.replace(old_response, new_response)

# Write the modified content back
with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("All 6 changes applied successfully!")
print(f"File size: {len(content)} bytes")
