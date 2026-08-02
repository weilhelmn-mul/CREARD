// ============================================================
// CREARD - Wrapper de Firestore (reemplaza a Prisma)
// Firebase Admin SDK v13+
// ============================================================

import { getAdminDb } from './firebase-admin';
import { Timestamp, FieldValue, DocumentData } from 'firebase-admin/firestore';
import type { Query, DocumentReference, CollectionReference, QuerySnapshot, DocumentSnapshot, WriteResult } from 'firebase-admin/firestore';

// ============================================================
// Tipos
// ============================================================

export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PricingScheduleItem {
  label: string;
  startHour: number;
  endHour: number;
  pricePerHour: number;
}

export interface Court {
  id: string;
  name: string;
  sport: string;
  description: string | null;
  branch_id: string;
  images: string[];
  price_per_hour: number;
  pricing_schedule?: PricingScheduleItem[];
  is_active: boolean;
  amenities: string[];
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'user' | 'admin' | 'super_admin';
  is_active: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'disabled';
  created_at: Date;
  updated_at: Date;
}

export type BookingStatus = 'pending' | 'reserved' | 'completed' | 'cancelled';
export type SlotStatus = 'available' | 'reserved' | 'maintenance';

export interface Booking {
  id: string;
  court_id: string;
  court_ids?: string[];
  user_id: string;
  user_email: string | null;
  date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  court_subtotal?: number;
  equipment_subtotal?: number;
  equipment_items?: Array<{ equipment_id: string; name: string; quantity: number; unit_price: number }>;
  equipment_delivered?: boolean;
  equipment_returned?: boolean;
  advance_amount: number;
  remaining_amount: number;
  status: BookingStatus;
  slot_status: SlotStatus;
  payment_method: string | null;
  notes: string | null;
  recurring_group_id?: string;
  recurring_index?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Payment {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  type: string;
  method: string;
  status: string;
  external_ref: string | null;
  created_at: Date;
  updated_at: Date;
}

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


export interface RetainedAdvance {
  id: string;
  booking_id: string;
  user_id: string;
  user_name: string;
  user_email: string | null;
  court_name: string;
  booking_date: string;
  amount: number;
  original_total: number;
  payment_method: string;
  reason: string;
  status: 'retained' | 'refunded';
  created_at: Date;
  updated_at: Date;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Review {
  id: string;
  court_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string | null;
  created_at: Date;
}

export interface Equipment {
  id: string;
  name: string;
  sport: string;
  price_per_rental: number;
  stock: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type ClaimType = 'queja' | 'reclamo';
export type ClaimStatus = 'received' | 'in_process' | 'responded' | 'closed' | 'archived';
export type ClaimChannel = 'presencial' | 'escrito' | 'telefono' | 'correo' | 'web';

export interface ClaimAttachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  url: string;
}

export interface ClaimAuditEntry {
  id: string;
  action: string;
  performed_by: string;
  performed_by_name: string;
  performed_by_role: string;
 details: string;
  created_at: Date;
}

export interface Claim {
  id: string;
  // Correlative number (auto-generated, format: LR-YYYY-NNNNN)
  claim_number: string;
  // Claim type
  claim_type: ClaimType;
  status: ClaimStatus;
  // Consumer info
  consumer_id: string | null;
  consumer_name: string;
  consumer_document_type: 'DNI' | 'CE' | 'PTE' | 'RUC' | 'Pasaporte';
  consumer_document_number: string;
  consumer_address: string;
  consumer_phone: string;
  consumer_email: string;
  // Product/Service info
  service_type: string; // e.g. 'Reserva de cancha deportiva'
  related_booking_id: string | null;
  related_court_name: string | null;
  related_booking_date: string | null;
  related_booking_time: string | null;
  related_booking_amount: number | null;
  related_payment_method: string | null;
  related_payment_ref: string | null;
  // Claim details
  description: string;
  consumer_request: string;
  // Channel
  channel: ClaimChannel;
  // Provider response
  provider_response: string | null;
  provider_response_date: Date | null;
  // Dates
  received_date: Date;
  deadline_date: Date; // 15 business days
  closed_date: Date | null;
  // Attachments
  attachments: ClaimAttachment[];
  // QR code data URL (base64)
  qr_code_url: string | null;
  // PDF hoja URL
  claim_sheet_url: string | null;
  // Archival
  archived: boolean;
  archived_at: Date | null;
  archived_by: string | null;
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

// ============================================================
// Helpers
// ============================================================

function buildQuery(
  collectionName: string,
  constraints: Array<{ field: string; op: string; value: unknown }>
): Query {
  let q: Query = getAdminDb().collection(collectionName);
  for (const c of constraints) {
    switch (c.op) {
      case '==': q = q.where(c.field, '==', c.value); break;
      case '!=': q = q.where(c.field, '!=', c.value); break;
      case '<': q = q.where(c.field, '<', c.value); break;
      case '<=': q = q.where(c.field, '<=', c.value); break;
      case '>': q = q.where(c.field, '>', c.value); break;
      case '>=': q = q.where(c.field, '>=', c.value); break;
      case 'in': q = q.where(c.field, 'in', c.value as unknown[]); break;
      case 'not-in': q = q.where(c.field, 'not-in', c.value as unknown[]); break;
      case 'array-contains': q = q.where(c.field, 'array-contains', c.value); break;
    }
  }
  return q;
}

async function queryDocs(
  collectionName: string,
  constraints: Array<{ field: string; op: string; value: unknown }> = [],
  orderField?: string,
  orderDir: 'asc' | 'desc' = 'asc'
): Promise<DocumentData[]> {
  let q = buildQuery(collectionName, constraints);
  // NEVER use Firestore orderBy — always sort client-side
  // This avoids needing composite indexes (user_id+start_time, user_email+start_time, etc.)
  const snapshot: QuerySnapshot = await q.get();
  let docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  // Client-side sort for all queries
  if (orderField) {
    docs.sort((a, b) => {
      const va = a[orderField] ?? '';
      const vb = b[orderField] ?? '';
      if (va < vb) return orderDir === 'asc' ? -1 : 1;
      if (va > vb) return orderDir === 'asc' ? 1 : -1;
      return 0;
    });
  }
  return docs;
}

async function getDocById(collectionName: string, id: string): Promise<DocumentData | null> {
  const docSnap = await getAdminDb().collection(collectionName).doc(id).get();
  if (!docSnap.exists) return null;
  return { id: docSnap.id, ...docSnap.data() };
}

async function addDoc(
  collectionName: string,
  data: Record<string, unknown>
): Promise<string> {
  const now = Timestamp.now();
  const docRef = await getAdminDb().collection(collectionName).add({
    ...data,
    created_at: now,
    updated_at: now,
  });
  return docRef.id;
}

async function updateDocById(
  collectionName: string,
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  await getAdminDb().collection(collectionName).doc(id).update({
    ...data,
    updated_at: Timestamp.now(),
  });
}

async function setDocById(
  collectionName: string,
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  const now = Timestamp.now();
  await getAdminDb().collection(collectionName).doc(id).set({
    ...data,
    created_at: now,
    updated_at: now,
  });
}

export async function deleteDocById(collectionName: string, id: string): Promise<void> {
  await getAdminDb().collection(collectionName).doc(id).delete();
}

async function getCollectionSize(collectionName: string): Promise<number> {
  const snapshot = await getAdminDb().collection(collectionName).count().get();
  return snapshot.data().count;
}

// ============================================================
// CRUD Específicos de CREARD
// ============================================================

// --- Courts ---
export async function getCourts(filters?: {
  sport?: string;
  branchId?: string;
  active?: boolean;
}): Promise<Partial<Court>[]> {
  const constraints: Array<{ field: string; op: string; value: unknown }> = [];
  if (filters?.sport && filters.sport !== 'todos') {
    constraints.push({ field: 'sport', op: '==', value: filters.sport });
  }
  if (filters?.branchId) {
    constraints.push({ field: 'branch_id', op: '==', value: filters.branchId });
  }
  if (filters?.active !== undefined) {
    constraints.push({ field: 'is_active', op: '==', value: filters.active });
  }

  const docs = await queryDocs('courts', constraints, 'name');
  return docs.map((d) => ({
    ...d,
    images: Array.isArray(d.images) ? d.images : [],
    amenities: Array.isArray(d.amenities) ? d.amenities : [],
  }));
}

export async function getCourtById(id: string): Promise<Partial<Court> | null> {
  const d = await getDocById('courts', id);
  if (!d) return null;
  return {
    ...d,
    images: Array.isArray(d.images) ? d.images : [],
    amenities: Array.isArray(d.amenities) ? d.amenities : [],
  };
}

export async function createCourt(data: Partial<Court>): Promise<string> {
  return addDoc('courts', {
    name: data.name,
    sport: data.sport,
    description: data.description || null,
    branch_id: data.branch_id,
    images: data.images || [],
    price_per_hour: data.price_per_hour || 0,
    pricing_schedule: data.pricing_schedule || [],
    is_active: data.is_active !== undefined ? data.is_active : true,
    amenities: data.amenities || [],
  });
}

// --- Bookings ---
export async function getBookings(filters?: {
  courtId?: string;
  userId?: string;
  userEmail?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}): Promise<Partial<Booking>[]> {
  // Build non-court constraints (shared by both queries)
  const baseConstraints: Array<{ field: string; op: string; value: unknown }> = [];
  if (filters?.userId) baseConstraints.push({ field: 'user_id', op: '==', value: filters.userId });
  if (filters?.userEmail) baseConstraints.push({ field: 'user_email', op: '==', value: filters.userEmail });
  if (filters?.date) baseConstraints.push({ field: 'date', op: '==', value: filters.date });
  if (filters?.dateFrom) baseConstraints.push({ field: 'date', op: '>=', value: filters.dateFrom });
  if (filters?.dateTo) baseConstraints.push({ field: 'date', op: '<=', value: filters.dateTo });
  if (filters?.status) baseConstraints.push({ field: 'status', op: '==', value: filters.status });

  // No court filter — single query
  if (!filters?.courtId) {
    return queryDocs('bookings', baseConstraints, 'start_time');
  }

  // Court filter present — need TWO queries:
  //   1) court_id == X  (primary court)
  //   2) court_ids array-contains X  (secondary court in multi-court booking)
  const [byPrimary, byArray] = await Promise.all([
    queryDocs('bookings', [
      ...baseConstraints,
      { field: 'court_id', op: '==', value: filters.courtId },
    ], 'start_time'),
    queryDocs('bookings', [
      ...baseConstraints,
      { field: 'court_ids', op: 'array-contains', value: filters.courtId },
    ], 'start_time'),
  ]);

  // Merge & deduplicate by document ID
  const seen = new Set<string>();
  const merged: DocumentData[] = [];
  for (const doc of [...byPrimary, ...byArray]) {
    if (!seen.has(doc.id)) {
      seen.add(doc.id);
      merged.push(doc);
    }
  }

  // Client-side sort (already sorted individually, but merge breaks order)
  merged.sort((a, b) => {
    const va = a.start_time ?? '';
    const vb = b.start_time ?? '';
    if (va < vb) return -1;
    if (va > vb) return 1;
    return 0;
  });

  return merged as Partial<Booking>[];
}

export async function createBooking(data: Record<string, unknown>): Promise<string> {
  const courtIds: string[] = Array.isArray(data.court_ids) ? data.court_ids : [data.court_id];
  return addDoc('bookings', {
    court_id: courtIds[0] || data.court_id, // Primary court (backward compat)
    court_ids: courtIds, // All courts in this booking
    user_id: data.user_id,
    user_email: data.user_email || null, // Denormalized for fallback search
    date: data.date,
    start_time: data.start_time,
    end_time: data.end_time,
    total_price: data.total_price || 0,
    court_subtotal: data.court_subtotal || 0,
    equipment_subtotal: data.equipment_subtotal || 0,
    equipment_items: data.equipment_items || [],
    equipment_delivered: data.equipment_delivered || false,
    equipment_returned: data.equipment_returned || false,
    advance_amount: data.advance_amount || 0,
    remaining_amount: data.remaining_amount || 0,
    status: data.status || 'reserved',
    slot_status: data.slot_status || 'available',
    payment_method: data.payment_method || null,
    notes: data.notes || null,
    recurring_group_id: data.recurring_group_id || null,
    recurring_index: data.recurring_index ?? null,
    selected_slots: Array.isArray(data.selected_slots) ? data.selected_slots : [],
  });
}

export async function updateBooking(id: string, data: Partial<Booking>): Promise<void> {
  await updateDocById('bookings', id, data as Record<string, unknown>);
}

/**
 * Get a single booking by its document ID (O(1) direct lookup)
 */
export async function getBookingById(id: string): Promise<Partial<Booking> | null> {
  return getDocById('bookings', id);
}

// --- Payments (subcolección + top-level) ---
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
}

export async function getPayments(bookingId: string): Promise<Partial<Payment>[]> {
  const db = await getAdminDb();
  const snapshot = await db
    .collection('bookings')
    .doc(bookingId)
    .collection('payments')
    .get();
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}


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
}

/**
 * Actualiza el estado de un pago existente (usado por webhooks de Culqi)
 */
export async function updatePaymentStatus(
  bookingId: string,
  paymentId: string,
  status: string,
  extra?: Record<string, unknown>
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status,
    updated_at: Timestamp.now(),
  };
  if (extra) {
    Object.assign(updateData, extra);
  }
  const db = await getAdminDb();
  await db
    .collection('bookings')
    .doc(bookingId)
    .collection('payments')
    .doc(paymentId)
    .update(updateData);
}

/**
 * Busca un pago por su referencia externa (Culqi charge ID)
 * Busca en todas las reservas - usar con moderación
 */
export async function findPaymentByExternalRef(
  externalRef: string
): Promise<{ bookingId: string; payment: Partial<Payment> } | null> {
  // Consultar las reservas más recientes (últimas 100)
  const db = await getAdminDb();
  const bookingsSnapshot = await db
    .collection('bookings')
    .orderBy('created_at', 'desc')
    .limit(100)
    .get();

  for (const bookingDoc of bookingsSnapshot.docs) {
    const paymentsSnapshot = await db
      .collection('bookings')
      .doc(bookingDoc.id)
      .collection('payments')
      .where('external_ref', '==', externalRef)
      .limit(1)
      .get();

    if (!paymentsSnapshot.empty) {
      const payDoc = paymentsSnapshot.docs[0];
      return {
        bookingId: bookingDoc.id,
        payment: { id: payDoc.id, ...payDoc.data() },
      };
    }
  }

  return null;
}

// --- Expenses ---
export async function getExpenses(filters?: {
  category?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Partial<Expense>[]> {
  const constraints: Array<{ field: string; op: string; value: unknown }> = [];
  if (filters?.category) constraints.push({ field: 'category', op: '==', value: filters.category });
  if (filters?.startDate) constraints.push({ field: 'date', op: '>=', value: filters.startDate });
  if (filters?.endDate) constraints.push({ field: 'date', op: '<=', value: filters.endDate });
  return queryDocs('expenses', constraints, 'date', 'desc');
}

export async function createExpense(data: Partial<Expense>): Promise<string> {
  return addDoc('expenses', {
    description: data.description,
    amount: data.amount || 0,
    category: data.category,
    date: data.date,
    notes: data.notes || null,
  });
}

// --- Retained Advances (adelantos retenidos por cancelación) ---
export async function getRetainedAdvances(filters?: {
  startDate?: string;
  endDate?: string;
  status?: string;
  bookingId?: string;
}): Promise<Partial<RetainedAdvance>[]> {
  const constraints: Array<{ field: string; op: string; value: unknown }> = [];
  if (filters?.status) constraints.push({ field: 'status', op: '==', value: filters.status });
  if (filters?.bookingId) constraints.push({ field: 'booking_id', op: '==', value: filters.bookingId });
  // Note: startDate/endDate filters removed — Firestore Timestamp vs string comparison
  // causes unreliable results. Date filtering should be done client-side.
  return queryDocs('retained_advances', constraints, 'created_at', 'desc');
}

export async function createRetainedAdvance(data: Partial<RetainedAdvance>): Promise<string> {
  return addDoc('retained_advances', {
    booking_id: data.booking_id,
    user_id: data.user_id,
    user_name: data.user_name || '',
    user_email: data.user_email || null,
    court_name: data.court_name || '',
    booking_date: data.booking_date || '',
    amount: data.amount || 0,
    original_total: data.original_total || 0,
    payment_method: data.payment_method || 'EFECTIVO',
    reason: data.reason || 'Cancelación de reserva',
    status: data.status || 'retained',
  });
}

export async function updateRetainedAdvance(id: string, data: Partial<RetainedAdvance>): Promise<void> {
  await updateDocById('retained_advances', id, data as Record<string, unknown>);
}

export async function deleteRetainedAdvance(id: string): Promise<void> {
  await deleteDocById('retained_advances', id);
}

// --- Users ---
export async function getUserById(id: string): Promise<Partial<User> | null> {
  return getDocById('users', id);
}

export async function createUser(data: {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  status?: string;
}): Promise<void> {
  await setDocById('users', data.id, {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    role: data.role || 'user',
    status: data.status || 'pending',
    is_active: true,
  });
}

export async function updateUser(id: string, data: Partial<User>): Promise<void> {
  await updateDocById('users', id, data as Record<string, unknown>);
}

export async function getAllUsers(): Promise<DocumentData[]> {
  return queryDocs('users');
}

// --- Reviews (subcolección de courts) ---
export async function getReviews(courtId: string): Promise<Partial<Review>[]> {
  const snapshot = await adminDb
    .collection('courts')
    .doc(courtId)
    .collection('reviews')
    .get();
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createReview(
  courtId: string,
  data: Partial<Review>
): Promise<string> {
  const docRef = await adminDb
    .collection('courts')
    .doc(courtId)
    .collection('reviews')
    .add({
      user_id: data.user_id,
      user_name: data.user_name,
      rating: data.rating,
      comment: data.comment || null,
      created_at: Timestamp.now(),
    });
  return docRef.id;
}

// --- Stats helpers ---
export async function getCount(collectionName: string): Promise<number> {
  try {
    return await getCollectionSize(collectionName);
  } catch {
    // Fallback si count() no está disponible
    const snapshot = await getAdminDb().collection(collectionName).get();
    return snapshot.size;
  }
}

export async function getAllFromCollection(collectionName: string): Promise<DocumentData[]> {
  const snapshot = await getAdminDb().collection(collectionName).get();
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// --- News (noticias) ---
export async function getNews(filters?: {
  active?: boolean;
  featured?: boolean;
  category?: string;
}): Promise<DocumentData[]> {
  const constraints: Array<{ field: string; op: string; value: unknown }> = [];
  if (filters?.active !== undefined) constraints.push({ field: 'is_active', op: '==', value: filters.active });
  if (filters?.featured !== undefined) constraints.push({ field: 'is_featured', op: '==', value: filters.featured });
  if (filters?.category) constraints.push({ field: 'category', op: '==', value: filters.category });
  return queryDocs('news', constraints, 'published_at', 'desc');
}

export async function getNewsById(id: string): Promise<DocumentData | null> {
  return getDocById('news', id);
}

export async function createNewsItem(data: Record<string, unknown>): Promise<string> {
  return addDoc('news', data);
}

export async function updateNewsItem(id: string, data: Record<string, unknown>): Promise<void> {
  await updateDocById('news', id, data);
}

export async function deleteNewsItem(id: string): Promise<void> {
  await deleteDocById('news', id);
}

// --- Gallery (imágenes) ---
export async function getGalleryImages(filters?: {
  active?: boolean;
  category?: string;
}): Promise<DocumentData[]> {
  const constraints: Array<{ field: string; op: string; value: unknown }> = [];
  if (filters?.active !== undefined) constraints.push({ field: 'is_active', op: '==', value: filters.active });
  if (filters?.category) constraints.push({ field: 'category', op: '==', value: filters.category });
  return queryDocs('gallery', constraints, 'display_order', 'asc');
}

export async function getGalleryImageById(id: string): Promise<DocumentData | null> {
  return getDocById('gallery', id);
}

export async function createGalleryImage(data: Record<string, unknown>): Promise<string> {
  return addDoc('gallery', data);
}

export async function updateGalleryImage(id: string, data: Record<string, unknown>): Promise<void> {
  await updateDocById('gallery', id, data);
}

export async function deleteGalleryImage(id: string): Promise<void> {
  await deleteDocById('gallery', id);
}

// --- Site Settings ---
export async function getSiteSettings(): Promise<DocumentData | null> {
  return getDocById('site_settings', 'main');
}

export async function updateSiteSettings(data: Record<string, unknown>): Promise<void> {
  const now = Timestamp.now();
  try {
    await getAdminDb().collection('site_settings').doc('main').update({
      ...data,
      updated_at: now,
    });
  } catch {
    // Si no existe, crearlo
    await getAdminDb().collection('site_settings').doc('main').set({
      ...data,
      created_at: now,
      updated_at: now,
    });
  }
}

// --- Court update/delete (admin) ---
export async function updateCourt(id: string, data: Record<string, unknown>): Promise<void> {
  await updateDocById('courts', id, data);
}

export async function deleteCourt(id: string): Promise<void> {
  await deleteDocById('courts', id);
}

// --- Equipment CRUD ---
export async function getEquipments(filters?: { active?: boolean }): Promise<Partial<Equipment>[]> {
  const constraints: Array<{ field: string; op: string; value: unknown }> = [];
  if (filters?.active !== undefined) constraints.push({ field: 'active', op: '==', value: filters.active });
  return queryDocs('equipment', constraints, 'name');
}

export async function getEquipmentById(id: string): Promise<Partial<Equipment> | null> {
  return getDocById('equipment', id);
}

export async function createEquipment(data: Record<string, unknown>): Promise<string> {
  return addDoc('equipment', {
    name: data.name,
    sport: data.sport || 'general',
    price_per_rental: data.price_per_rental || 0,
    stock: data.stock || 0,
    active: data.active !== false,
  });
}

export async function updateEquipment(id: string, data: Record<string, unknown>): Promise<void> {
  await updateDocById('equipment', id, data);
}

export async function deleteEquipment(id: string): Promise<void> {
  await deleteDocById('equipment', id);
}

// ============================================================
// Claims (Libro de Reclamaciones) CRUD
// ============================================================

/** Get total count of claims (for correlative number generation) */
export async function getClaimsCount(): Promise<number> {
  try {
    return await getCollectionSize('claims');
  } catch {
    return 0;
  }
}

/** Generate next correlative number: LR-YYYY-NNNNN */
export async function generateClaimNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await getClaimsCount();
  const sequential = String(count + 1).padStart(5, '0');
  return `LR-${year}-${sequential}`;
}

/** Get all claims with optional filters */
export async function getClaims(filters?: {
  status?: ClaimStatus;
  claim_type?: ClaimType;
  consumer_id?: string;
  archived?: boolean;
}): Promise<Partial<Claim>[]> {
  const constraints: Array<{ field: string; op: string; value: unknown }> = [];
  if (filters?.status) constraints.push({ field: 'status', op: '==', value: filters.status });
  if (filters?.claim_type) constraints.push({ field: 'claim_type', op: '==', value: filters.claim_type });
  if (filters?.consumer_id) constraints.push({ field: 'consumer_id', op: '==', value: filters.consumer_id });
  if (filters?.archived !== undefined) constraints.push({ field: 'archived', op: '==', value: filters.archived });
  return queryDocs('claims', constraints, 'created_at', 'desc');
}

/** Get a single claim by ID */
export async function getClaimById(id: string): Promise<Partial<Claim> | null> {
  return getDocById('claims', id);
}

/** Create a new claim */
export async function createClaim(data: Record<string, unknown>): Promise<string> {
  return addDoc('claims', data);
}

/** Update a claim */
export async function updateClaim(id: string, data: Record<string, unknown>): Promise<void> {
  await updateDocById('claims', id, data);
}

/** Archive a claim (soft delete) */
export async function archiveClaim(id: string, archivedBy: string): Promise<void> {
  await updateDocById('claims', id, {
    archived: true,
    archived_at: Timestamp.now(),
    archived_by: archivedBy,
    status: 'archived',
  });
}

/** Unarchive a claim */
export async function unarchiveClaim(id: string): Promise<void> {
  await updateDocById('claims', id, {
    archived: false,
    archived_at: null,
    archived_by: null,
    status: 'received',
  });
}

/** Get claims that are approaching or past deadline */
export async function getClaimsNearDeadline(daysThreshold: number = 2): Promise<Partial<Claim>[]> {
  const allClaims = await getClaims();
  const now = new Date();
  const threshold = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);
  return allClaims.filter((c) => {
    if (c.status === 'closed' || c.status === 'archived' || !c.deadline_date) return false;
    const deadline = c.deadline_date instanceof Date ? c.deadline_date : new Date(c.deadline_date);
    return deadline <= threshold;
  });
}

/** Add audit entry to a claim */
export async function addClaimAuditEntry(
  claimId: string,
  action: string,
  performedBy: string,
  performedByName: string,
  performedByRole: string,
  details: string
): Promise<void> {
  const entry = {
    id: claimId + '_' + Date.now(),
    action,
    performed_by: performedBy,
    performed_by_name: performedByName,
    performed_by_role: performedByRole,
    details,
    created_at: Timestamp.now(),
  };
  // Store audit entries as a sub-collection
  await getAdminDb().collection('claims').doc(claimId).collection('audit_log').add(entry);
}

/** Get audit log for a claim */
export async function getClaimAuditLog(claimId: string): Promise<Partial<ClaimAuditEntry>[]> {
  const snapshot = await getAdminDb().collection('claims').doc(claimId).collection('audit_log').orderBy('created_at', 'asc').get();
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}
