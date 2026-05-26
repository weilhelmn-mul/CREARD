// ============================================================
// CREARD - Wrapper de Firestore (reemplaza a Prisma)
// Firebase Admin SDK v13+
// ============================================================

import { adminDb } from './firebase-admin';
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

export interface Court {
  id: string;
  name: string;
  sport: string;
  description: string | null;
  branch_id: string;
  images: string[];
  price_per_hour: number;
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
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Booking {
  id: string;
  court_id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  advance_amount: number;
  remaining_amount: number;
  status: string;
  slot_status: string;
  payment_method: string | null;
  notes: string | null;
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

// ============================================================
// Helpers
// ============================================================

function buildQuery(
  collectionName: string,
  constraints: Array<{ field: string; op: string; value: unknown }>
): Query {
  let q: Query = adminDb.collection(collectionName);
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
  if (orderField) {
    q = q.orderBy(orderField, orderDir);
  }
  const snapshot: QuerySnapshot = await q.get();
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getDocById(collectionName: string, id: string): Promise<DocumentData | null> {
  const docSnap = await adminDb.collection(collectionName).doc(id).get();
  if (!docSnap.exists) return null;
  return { id: docSnap.id, ...docSnap.data() };
}

async function addDoc(
  collectionName: string,
  data: Record<string, unknown>
): Promise<string> {
  const now = Timestamp.now();
  const docRef = await adminDb.collection(collectionName).add({
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
  await adminDb.collection(collectionName).doc(id).update({
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
  await adminDb.collection(collectionName).doc(id).set({
    ...data,
    created_at: now,
    updated_at: now,
  });
}

export async function deleteDocById(collectionName: string, id: string): Promise<void> {
  await adminDb.collection(collectionName).doc(id).delete();
}

async function getCollectionSize(collectionName: string): Promise<number> {
  const snapshot = await adminDb.collection(collectionName).count().get();
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
    is_active: data.is_active !== undefined ? data.is_active : true,
    amenities: data.amenities || [],
  });
}

// --- Bookings ---
export async function getBookings(filters?: {
  courtId?: string;
  userId?: string;
  date?: string;
  status?: string;
}): Promise<Partial<Booking>[]> {
  const constraints: Array<{ field: string; op: string; value: unknown }> = [];
  if (filters?.courtId) constraints.push({ field: 'court_id', op: '==', value: filters.courtId });
  if (filters?.userId) constraints.push({ field: 'user_id', op: '==', value: filters.userId });
  if (filters?.date) constraints.push({ field: 'date', op: '==', value: filters.date });
  if (filters?.status) constraints.push({ field: 'status', op: '==', value: filters.status });
  return queryDocs('bookings', constraints, 'start_time');
}

export async function createBooking(data: Partial<Booking>): Promise<string> {
  return addDoc('bookings', {
    court_id: data.court_id,
    user_id: data.user_id,
    date: data.date,
    start_time: data.start_time,
    end_time: data.end_time,
    total_price: data.total_price || 0,
    advance_amount: data.advance_amount || 0,
    remaining_amount: data.remaining_amount || 0,
    status: data.status || 'pending',
    slot_status: data.slot_status || 'available',
    payment_method: data.payment_method || null,
    notes: data.notes || null,
  });
}

export async function updateBooking(id: string, data: Partial<Booking>): Promise<void> {
  await updateDocById('bookings', id, data as Record<string, unknown>);
}

// --- Payments (subcolección) ---
export async function createPayment(
  bookingId: string,
  data: Partial<Payment>
): Promise<string> {
  const now = Timestamp.now();
  const docRef = await adminDb
    .collection('bookings')
    .doc(bookingId)
    .collection('payments')
    .add({
      booking_id: bookingId,
      user_id: data.user_id,
      amount: data.amount || 0,
      type: data.type || 'advance',
      method: data.method || 'yape',
      status: data.status || 'completed',
      external_ref: data.external_ref || null,
      created_at: now,
      updated_at: now,
    });
  return docRef.id;
}

export async function getPayments(bookingId: string): Promise<Partial<Payment>[]> {
  const snapshot = await adminDb
    .collection('bookings')
    .doc(bookingId)
    .collection('payments')
    .get();
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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
}): Promise<void> {
  await setDocById('users', data.id, {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    role: data.role || 'user',
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
    const snapshot = await adminDb.collection(collectionName).get();
    return snapshot.size;
  }
}

export async function getAllFromCollection(collectionName: string): Promise<DocumentData[]> {
  const snapshot = await adminDb.collection(collectionName).get();
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}
