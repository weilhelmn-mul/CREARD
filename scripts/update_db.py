#!/usr/bin/env python3
"""
Enhance db.ts payment system:
1. Add PaymentRecord interface after existing Payment interface
2. Enhance createPayment to accept extra fields and write to top-level payments collection
3. Add getNextPaymentNumber, generatePaymentId, getAllPayments, getPaymentsByBookingId
"""

import re

FILE_PATH = '/home/z/my-project/src/lib/db.ts'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# ============================================================
# 1. Add PaymentRecord interface after Payment interface
# ============================================================
# Find the closing of the Payment interface
payment_interface_end = content.find(
    'export interface Payment {\n'
)
if payment_interface_end == -1:
    print("ERROR: Could not find 'export interface Payment {'")
    exit(1)

# Find the closing brace of the Payment interface
brace_count = 0
search_start = payment_interface_end
payment_interface_close = -1
for i in range(search_start, len(content)):
    if content[i] == '{':
        brace_count += 1
    elif content[i] == '}':
        brace_count -= 1
        if brace_count == 0:
            payment_interface_close = i
            break

if payment_interface_close == -1:
    print("ERROR: Could not find closing brace of Payment interface")
    exit(1)

payment_record_interface = """

export interface PaymentRecord extends Payment {
  payment_id: string;           // e.g. 'PAY-000451'
  payment_code: string;         // e.g. 'CRE-PAY-XXXX'
  booking_code: string;         // e.g. 'CRE-XXXX-XXXX'
  user_name: string;
  user_email: string;
  user_phone: string | null;
  user_document: string | null;
  court_name: string;
  sport: string;
  booking_date: string;         // 'YYYY-MM-DD'
  booking_start_time: string;   // 'HH:00'
  booking_end_time: string;     // 'HH:00'
  payment_type: 'advance' | 'remaining' | 'full_payment';
  amount_paid: number;
  remaining_balance: number;
  payment_method_display: string;  // e.g. 'Yape QR', 'Culqi'
  payment_status: 'completed' | 'pending' | 'parcial' | 'failed';
  payment_date: string;         // 'DD/MM/YYYY'
  payment_time: string;         // 'HH:mm:ss'
  sport_name: string;           // same as sport
}
"""

# Insert after the closing brace + newline of Payment interface
insert_pos = payment_interface_close + 1
content = content[:insert_pos] + payment_record_interface + content[insert_pos:]

# ============================================================
# 2. Replace the createPayment function
# ============================================================
old_create_payment = r'''// --- Payments \(subcolecci\u00f3n\) ---
export async function createPayment\(
  bookingId: string,
  data: Partial<Payment>
\): Promise<string> \{
  const now = Timestamp\.now\(\);
  const db = await getAdminDb\(\);
  const docRef = await db
    \.collection\('bookings'\)
    \.doc\(bookingId\)
    \.collection\('payments'\)
    \.add\(\{
      booking_id: bookingId,
      user_id: data\.user_id,
      amount: data\.amount \|\| 0,
      type: data\.type \|\| 'advance',
      method: data\.method \|\| 'yape',
      status: data\.status \|\| 'completed',
      external_ref: data\.external_ref \|\| null,
      created_at: now,
      updated_at: now,
    \}\);
  return docRef\.id;
\}'''

new_create_payment = r'''// --- Payments (subcolección + top-level) ---
export async function createPayment(
  bookingId: string,
  data: Partial<Payment> & {
    payment_id?: string;
    payment_code?: string;
    booking_code?: string;
    user_name?: string;
    user_email?: string;
    user_phone?: string | null;
    user_document?: string | null;
    court_name?: string;
    sport?: string;
    booking_date?: string;
    booking_start_time?: string;
    booking_end_time?: string;
    payment_type?: string;
    amount_paid?: number;
    remaining_balance?: number;
    payment_method_display?: string;
    payment_status?: string;
    payment_date?: string;
    payment_time?: string;
  }
): Promise<string> {
  const now = Timestamp.now();
  const db = await getAdminDb();

  // Build the payment document data (backward compatible with existing fields)
  const paymentData: Record<string, unknown> = {
    booking_id: bookingId,
    user_id: data.user_id,
    amount: data.amount || 0,
    type: data.type || 'advance',
    method: data.method || 'yape',
    status: data.status || 'completed',
    external_ref: data.external_ref || null,
    created_at: now,
    updated_at: now,
  };

  // Add new extra fields if provided
  if (data.payment_id !== undefined) paymentData.payment_id = data.payment_id;
  if (data.payment_code !== undefined) paymentData.payment_code = data.payment_code;
  if (data.booking_code !== undefined) paymentData.booking_code = data.booking_code;
  if (data.user_name !== undefined) paymentData.user_name = data.user_name;
  if (data.user_email !== undefined) paymentData.user_email = data.user_email;
  if (data.user_phone !== undefined) paymentData.user_phone = data.user_phone;
  if (data.user_document !== undefined) paymentData.user_document = data.user_document;
  if (data.court_name !== undefined) paymentData.court_name = data.court_name;
  if (data.sport !== undefined) paymentData.sport = data.sport;
  if (data.booking_date !== undefined) paymentData.booking_date = data.booking_date;
  if (data.booking_start_time !== undefined) paymentData.booking_start_time = data.booking_start_time;
  if (data.booking_end_time !== undefined) paymentData.booking_end_time = data.booking_end_time;
  if (data.payment_type !== undefined) paymentData.payment_type = data.payment_type;
  if (data.amount_paid !== undefined) paymentData.amount_paid = data.amount_paid;
  if (data.remaining_balance !== undefined) paymentData.remaining_balance = data.remaining_balance;
  if (data.payment_method_display !== undefined) paymentData.payment_method_display = data.payment_method_display;
  if (data.payment_status !== undefined) paymentData.payment_status = data.payment_status;
  if (data.payment_date !== undefined) paymentData.payment_date = data.payment_date;
  if (data.payment_time !== undefined) paymentData.payment_time = data.payment_time;

  // Write to subcollection (bookings/{id}/payments)
  const docRef = await db
    .collection('bookings')
    .doc(bookingId)
    .collection('payments')
    .add(paymentData);

  // Also write to top-level payments collection for admin-wide queries
  await db.collection('payments').add({
    ...paymentData,
    sub_payment_id: docRef.id, // reference back to the subcollection doc
  });

  return docRef.id;
}'''

# Use a simpler approach: find the exact text and replace
# Read the file line by line to find the createPayment function
lines = content.split('\n')
start_idx = -1
end_idx = -1
brace_depth = 0
found_func_start = False

for i, line in enumerate(lines):
    if 'export async function createPayment(' in line and not found_func_start:
        # Go back to find the comment line
        comment_line = i
        if i > 0 and 'Payments' in lines[i-1]:
            comment_line = i - 1
        start_idx = comment_line
        found_func_start = True
        brace_depth = 0
    elif found_func_start and end_idx == -1:
        brace_depth += line.count('{') - line.count('}')
        if brace_depth <= 0 and '{' in ''.join(lines[start_idx:i+1]):
            end_idx = i
            break

if start_idx == -1 or end_idx == -1:
    print(f"ERROR: Could not find createPayment function boundaries. start={start_idx}, end={end_idx}")
    exit(1)

print(f"Found createPayment at lines {start_idx+1}-{end_idx+1}")

# Replace the function
lines_before = lines[:start_idx]
lines_after = lines[end_idx+1:]
new_func_lines = new_create_payment.split('\n')
content = '\n'.join(lines_before + new_func_lines + lines_after)

# ============================================================
# 3. Add new functions after getPayments (after the existing payments section)
# ============================================================
# Find the end of getPayments function
lines = content.split('\n')
insert_after_idx = -1

# Find the getPayments function end
for i, line in enumerate(lines):
    if 'export async function getPayments(bookingId: string)' in line:
        # Find the end of this function
        brace_depth = 0
        for j in range(i, len(lines)):
            brace_depth += lines[j].count('{') - lines[j].count('}')
            if brace_depth <= 0 and '{' in ''.join(lines[i:j+1]):
                insert_after_idx = j
                break
        break

if insert_after_idx == -1:
    print("ERROR: Could not find getPayments function")
    exit(1)

print(f"Found getPayments ends at line {insert_after_idx+1}")

new_functions = '''

/**
 * Get the next payment number from the counters collection (atomic increment via transaction)
 */
export async function getNextPaymentNumber(): Promise<number> {
  const db = await getAdminDb();
  const counterRef = db.collection('counters').doc('payments');

  const result = await db.runTransaction(async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    if (!counterSnap.exists) {
      // Counter doesn't exist yet, create it starting at 1
      const newCounter = { value: 1, updated_at: Timestamp.now() };
      transaction.set(counterRef, newCounter);
      return 1;
    }
    const current = counterSnap.data()?.value ?? 0;
    const next = current + 1;
    transaction.update(counterRef, {
      value: next,
      updated_at: Timestamp.now(),
    });
    return next;
  });

  return result;
}

/**
 * Generate a formatted payment ID like 'PAY-000451'
 */
export async function generatePaymentId(): Promise<string> {
  const nextNum = await getNextPaymentNumber();
  return `PAY-${String(nextNum).padStart(6, '0')}`;
}

/**
 * Get all payments from the top-level payments collection with optional filters
 * (for admin-wide queries, not subcollection)
 */
export async function getAllPayments(filters?: {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  userId?: string;
  bookingId?: string;
}): Promise<Partial<PaymentRecord>[]> {
  const constraints: Array<{ field: string; op: string; value: unknown }> = [];
  if (filters?.status) constraints.push({ field: 'status', op: '==', value: filters.status });
  if (filters?.userId) constraints.push({ field: 'user_id', op: '==', value: filters.userId });
  if (filters?.bookingId) constraints.push({ field: 'booking_id', op: '==', value: filters.bookingId });
  if (filters?.dateFrom) constraints.push({ field: 'created_at', op: '>=', value: filters.dateFrom });
  if (filters?.dateTo) constraints.push({ field: 'created_at', op: '<=', value: filters.dateTo });

  const docs = await queryDocs('payments', constraints, 'created_at', 'desc');
  // Limit to 500 results
  return docs.slice(0, 500) as Partial<PaymentRecord>[];
}

/**
 * Get all payments for a specific booking from the top-level payments collection
 */
export async function getPaymentsByBookingId(bookingId: string): Promise<Partial<PaymentRecord>[]> {
  const constraints: Array<{ field: string; op: string; value: unknown }> = [
    { field: 'booking_id', op: '==', value: bookingId },
  ];
  const docs = await queryDocs('payments', constraints, 'created_at', 'desc');
  return docs as Partial<PaymentRecord>[];
}'''

# Insert the new functions after getPayments
lines = content.split('\n')
lines = lines[:insert_after_idx+1] + new_functions.split('\n') + lines[insert_after_idx+1:]
content = '\n'.join(lines)

# ============================================================
# Write the file
# ============================================================
with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: db.ts has been updated with all payment enhancements.")
print("Changes:")
print("  1. Added PaymentRecord interface after Payment interface")
print("  2. Enhanced createPayment with extra fields + top-level collection write")
print("  3. Added getNextPaymentNumber (atomic counter)")
print("  4. Added generatePaymentId (PAY-NNNNNN format)")
print("  5. Added getAllPayments (top-level collection with filters)")
print("  6. Added getPaymentsByBookingId (top-level collection)")
