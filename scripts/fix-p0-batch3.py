#!/usr/bin/env python3
"""
Fix P0-08, P0-09, P0-10, P0-11
- P0-08: Filter expired reservations in booking transaction
- P0-09: Recurring bookings with atomic conflict check
- P0-10: Server-side price recalculation for recurring
- P0-11: Race condition in payments - use Firestore transaction
"""

import re

BASE = '/home/z/my-project'

def read(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)


def fix_expired_reservations(filepath):
    """P0-08: Add expires_at check inside the booking transaction."""
    content = read(filepath)
    
    # Add expired reservation filter inside transaction overlap check
    old_check = """          for (const doc of snapshot.docs) {
            const b = doc.data();
            const bCourtIds: string[] = Array.isArray(b.court_ids) ? b.court_ids : [b.court_id];
            if (!bCourtIds.includes(cId)) continue;
            if (migrateStatus(b.status || '') === 'cancelled') continue;
            if ((b.start_time || '') < endTime && (b.end_time || '') > startTime) {"""
    
    new_check = """          for (const doc of snapshot.docs) {
            const b = doc.data();
            const bCourtIds: string[] = Array.isArray(b.court_ids) ? b.court_ids : [b.court_id];
            if (!bCourtIds.includes(cId)) continue;
            if (migrateStatus(b.status || '') === 'cancelled') continue;
            // P0-08 FIX: Skip expired reservations (ghost reservations)
            if (b.expires_at) {
              const expMs = b.expires_at.toMillis?.() || new Date(b.expires_at).getTime();
              if (expMs <= Date.now() && migrateStatus(b.status || '') === 'reserved') continue;
            }
            if ((b.start_time || '') < endTime && (b.end_time || '') > startTime) {"""
    
    content = content.replace(old_check, new_check)
    
    write(filepath, content)
    print(f'  [P0-08] bookings/route.ts: Expired reservations filtered in transaction')


def fix_recurring(filepath):
    """P0-09 + P0-10: Transaction-based recurring + server-side price."""
    content = read(filepath)
    
    # P0-10: Server-side price calculation
    old_price = """    // Price per booking — frontend sends grand total (court + equipment), avoid double-counting
    const eqItems = Array.isArray(equipmentItems) ? equipmentItems : [];
    let equipmentSubtotal = 0;
    for (const eq of eqItems) {
      equipmentSubtotal += (eq.quantity || 0) * (eq.unit_price || eq.unitPrice || 0);
    }
    const providedTotal = parseFloat(totalPrice) || 0;
    const courtPrice = providedTotal > 0 ? Math.max(0, providedTotal - equipmentSubtotal) : 0;
    const price = courtPrice + equipmentSubtotal;
    const adv = parseFloat(advanceAmount) || price * 0.5;"""
    
    new_price = """    // P0-10 FIX: Server-side price calculation from court rates
    const eqItems = Array.isArray(equipmentItems) ? equipmentItems : [];
    let equipmentSubtotal = 0;
    for (const eq of eqItems) {
      equipmentSubtotal += (eq.quantity || 0) * (eq.unit_price || eq.unitPrice || 0);
    }
    
    let courtPriceTotal = 0;
    for (const cId of allCourtIds) {
      try {
        const court = await getCourtById(cId);
        if (court?.pricing_schedule && Array.isArray(court.pricing_schedule) && court.pricing_schedule.length > 0) {
          for (const slot of court.pricing_schedule) {
            const overlapStart = Math.max(parseFloat(startTime), slot.startHour);
            const overlapEnd = Math.min(parseFloat(endTime), slot.endHour);
            if (overlapStart < overlapEnd) {
              courtPriceTotal += (overlapEnd - overlapStart) * (slot.pricePerHour || court.price_per_hour || 0);
            }
          }
        } else if (court?.price_per_hour) {
          const hours = parseFloat(endTime) - parseFloat(startTime);
          courtPriceTotal += hours * court.price_per_hour;
        }
      } catch (err) {
        console.warn('[RECURRING] Could not calculate court price for', cId);
        const providedTotal = parseFloat(totalPrice) || 0;
        courtPriceTotal = Math.max(0, providedTotal - equipmentSubtotal);
        break;
      }
    }
    const price = courtPriceTotal + equipmentSubtotal;
    const adv = parseFloat(advanceAmount) || price * 0.5;"""
    
    content = content.replace(old_price, new_price)
    
    # P0-09: Transaction-based creation
    old_loop = """    for (let i = 0; i < dates.length; i++) {
      const item = previewItems[i];
      if (!item.available) continue;

      const id = await createBooking({
        court_ids: allCourtIds,
        user_id: userId,
        user_email: clientEmail,
        date: dates[i],
        start_time: startTime,
        end_time: endTime,
        total_price: price,
        court_subtotal: courtPrice,
        equipment_subtotal: equipmentSubtotal,
        equipment_items: eqItems,
        advance_amount: adv,
        remaining_amount: price - adv,
        status: bookingStatus,
        slot_status: 'available',
        payment_method: normalizedPaymentMethod || null,
        notes: notes || null,
        recurring_group_id: groupId,
        recurring_index: createdBookings.length,
        selected_slots: Array.isArray(selectedSlots) ? selectedSlots : [],
      });

      createdBookings.push({ id, date: dates[i] });
    }"""
    
    new_loop = """    // P0-09 FIX: Create each booking in a Firestore transaction
    const { adminDb: recDb, Timestamp: recTs } = await import('@/lib/firebase-admin');
    
    for (let i = 0; i < dates.length; i++) {
      const item = previewItems[i];
      if (!item.available) continue;

      try {
        const bookingId = await recDb.runTransaction(async (transaction) => {
          // Re-check conflicts inside transaction
          for (const cId of allCourtIds) {
            const existingRef = recDb.collection('bookings')
              .where('date', '==', dates[i])
              .where('court_ids', 'array-contains', cId);
            const existingSnap = await transaction.get(existingRef);
            for (const doc of existingSnap.docs) {
              const b = doc.data();
              if (b.status === 'cancelled') continue;
              if ((b.start_time || '') < endTime && (b.end_time || '') > startTime) {
                throw new Error(`Conflicto en ${dates[i]} para cancha ${cId}`);
              }
            }
          }
          const now = recTs.now();
          const docRef = recDb.collection('bookings').doc();
          transaction.set(docRef, {
            court_id: allCourtIds[0],
            court_ids: allCourtIds,
            user_id: userId,
            user_email: clientEmail,
            date: dates[i],
            start_time: startTime,
            end_time: endTime,
            total_price: price,
            court_subtotal: courtPriceTotal,
            equipment_subtotal: equipmentSubtotal,
            equipment_items: eqItems,
            advance_amount: adv,
            remaining_amount: price - adv,
            status: bookingStatus,
            slot_status: 'available',
            payment_method: normalizedPaymentMethod || null,
            notes: notes || null,
            recurring_group_id: groupId,
            recurring_index: createdBookings.length,
            selected_slots: Array.isArray(selectedSlots) ? selectedSlots : [],
            created_at: now,
            updated_at: now,
          });
          return docRef.id;
        });
        createdBookings.push({ id: bookingId, date: dates[i] });
      } catch (txErr: any) {
        if (txErr?.message?.includes('Conflicto')) {
          console.warn('[RECURRING] Skipping', dates[i], ':', txErr.message);
          continue;
        }
        throw txErr;
      }
    }"""
    
    content = content.replace(old_loop, new_loop)
    
    write(filepath, content)
    print(f'  [P0-09+P0-10] recurring/route.ts: Transaction-based creation + server-side price')


def fix_payment_race(filepath):
    """P0-11: Atomic payment + booking update via Firestore transaction."""
    content = read(filepath)
    
    old_section = """    // ── 12. Registrar el pago en Firestore ──
    const paymentId = await createPayment(bookingId, {
      user_id: authUser.id,
      amount: amountInSoles,
      type: type || 'remaining',
      method: paymentMethod,
      status: paymentStatus,
      external_ref: charge.id,
    });

    // ── 13. Actualizar la reserva según el tipo de pago ──
    // FIX P1-8: Use canonical status values (reserved/completed)
    if (paymentStatus === 'completed' && booking) {
      if (type === 'remaining') {
        const newAdvance = (booking.advance_amount || 0) + amountInSoles;
        let newRemaining = (booking.total_price || 0) - newAdvance;
        let newStatus = 'reserved'; // FIX: canonical status

        if (newRemaining <= 0.5) { // Tolerancia de 0.5 soles
          newRemaining = 0;
          newStatus = 'completed'; // FIX: canonical status for fully paid
        }

        await updateBooking(bookingId, {
          advance_amount: Math.round(newAdvance * 100) / 100,
          remaining_amount: Math.round(Math.max(0, newRemaining) * 100) / 100,
          status: newStatus,
        });
      } else if (type === 'advance') {
        await updateBooking(bookingId, {
          status: 'reserved', // FIX: canonical status (not 'partially_paid')
          slot_status: 'reserved',
          payment_method: paymentMethod,
          advance_amount: amountInSoles,
          remaining_amount: (booking.total_price || 0) - amountInSoles,
        });
      }
    }"""

    new_section = """    // ── 12-13. P0-11 FIX: Atomic payment + booking update via Firestore transaction ──
    let paymentId: string;
    try {
      const { getAdminDb } = await import('@/lib/firebase-admin');
      const { Timestamp } = await import('firebase-admin/firestore');
      const pDb = getAdminDb();
      
      paymentId = await pDb.runTransaction(async (transaction) => {
        // Re-read booking inside transaction for fresh data
        const bookingRef = pDb.collection('bookings').doc(bookingId);
        const bookingSnap = await transaction.get(bookingRef);
        if (!bookingSnap.exists) throw new Error('Booking not found');
        const freshBooking = bookingSnap.data();

        // Create payment record inside transaction (top-level + subcollection)
        const paymentData: Record<string, any> = {
          user_id: authUser.id,
          amount: amountInSoles,
          type: type || 'remaining',
          method: paymentMethod,
          status: paymentStatus,
          external_ref: charge.id,
          booking_id: bookingId,
          created_at: Timestamp.now(),
          updated_at: Timestamp.now(),
        };
        
        const payDocRef = pDb.collection('payments').doc();
        transaction.set(payDocRef, paymentData);
        const subRef = pDb.collection('bookings').doc(bookingId).collection('payments').doc();
        transaction.set(subRef, paymentData);

        // Update booking atomically
        if (paymentStatus === 'completed') {
          if (type === 'remaining') {
            const newAdvance = (freshBooking.advance_amount || 0) + amountInSoles;
            let newRemaining = (freshBooking.total_price || 0) - newAdvance;
            let newStatus = 'reserved';
            if (newRemaining <= 0.5) { newRemaining = 0; newStatus = 'completed'; }
            transaction.update(bookingRef, {
              advance_amount: Math.round(newAdvance * 100) / 100,
              remaining_amount: Math.round(Math.max(0, newRemaining) * 100) / 100,
              status: newStatus,
              updated_at: Timestamp.now(),
            });
          } else if (type === 'advance') {
            transaction.update(bookingRef, {
              status: 'reserved',
              slot_status: 'reserved',
              payment_method: paymentMethod,
              advance_amount: amountInSoles,
              remaining_amount: (freshBooking.total_price || 0) - amountInSoles,
              updated_at: Timestamp.now(),
            });
          }
        }
        return payDocRef.id;
      });
    } catch (txErr: any) {
      console.error('[P0-11] Transaction failed:', txErr.message);
      console.error('[P0-11] Charge', charge.id, 'completed but booking update failed. Manual reconciliation needed.');
      return NextResponse.json({
        error: 'Pago procesado pero error al actualizar reserva. Contacta soporte.',
        chargeId: charge.id,
        code: 'BOOKING_UPDATE_FAILED'
      }, { status: 502 });
    }"""
    
    content = content.replace(old_section, new_section)
    
    write(filepath, content)
    print(f'  [P0-11] payments/process/route.ts: Atomic payment+booking via Firestore transaction')


# Execute
print('=== Batch 3: P0-08, P0-09, P0-10, P0-11 ===')

fix_expired_reservations(f'{BASE}/src/app/api/bookings/route.ts')
fix_recurring(f'{BASE}/src/app/api/bookings/recurring/route.ts')
fix_payment_race(f'{BASE}/src/app/api/payments/process/route.ts')

print('\nBatch 3 complete!')
