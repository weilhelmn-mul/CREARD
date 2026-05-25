// ============================================================
// CREARD - Esquema de Base de Datos para Firebase Firestore
// Plataforma de Gestión de Canchas Deportivas
// Ubicación: Av. Bolivar C1, San Sebastián, Cusco
// ============================================================

import {
  DocumentData,
  Timestamp,
  FieldValue,
} from 'firebase-admin/firestore';

// ============================================================
// 1. ENUMS (Tipos enumerados como const)
// ============================================================

export const UserRoles = {
  USER: 'user',
  ADMIN: 'admin',
} as const;
export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];

export const BookingStatuses = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PARTIALLY_PAID: 'partially_paid',
  FULLY_PAID: 'fully_paid',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  EXPIRED: 'expired',
} as const;
export type BookingStatus = (typeof BookingStatuses)[keyof typeof BookingStatuses];

export const SlotStatuses = {
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  IN_PLAY: 'in_play',
  FINISHED: 'finished',
  BLOCKED: 'blocked',
  EXPIRED: 'expired',
} as const;
export type SlotStatus = (typeof SlotStatuses)[keyof typeof SlotStatuses];

export const PaymentMethods = {
  YAPE: 'yape',
  PLIN: 'plin',
  CULQI: 'culqi',
  CARD: 'card',
  CASH: 'cash',
  TRANSFER: 'transfer',
} as const;
export type PaymentMethod = (typeof PaymentMethods)[keyof typeof PaymentMethods];

export const PaymentStatuses = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;
export type PaymentStatus = (typeof PaymentStatuses)[keyof typeof PaymentStatuses];

export const PaymentTypes = {
  ADVANCE: 'advance',     // Adelanto 50%
  REMAINING: 'remaining', // Saldo restante 50%
  FULL: 'full',           // Pago completo 100%
} as const;
export type PaymentType = (typeof PaymentTypes)[keyof typeof PaymentTypes];

export const ExpenseCategories = {
  MANTENIMIENTO: 'mantenimiento',
  SERVICIOS: 'servicios',
  PERSONAL: 'personal',
  ALQUILER: 'alquiler',
  OTROS: 'otros',
} as const;
export type ExpenseCategory = (typeof ExpenseCategories)[keyof typeof ExpenseCategories];

export const CourtSports = {
  FUTBOL: 'futbol',
  VOLEY: 'voley',
} as const;
export type CourtSport = (typeof CourtSports)[keyof typeof CourtSports];

// ============================================================
// 2. INTERFACES (Colecciones de Firestore)
// ============================================================

// -----------------------------------------------------------
// 2.1 branches (Sucursales)
// Colección: /branches/{branchId}
// -----------------------------------------------------------
export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// -----------------------------------------------------------
// 2.2 courts (Canchas)
// Colección: /courts/{courtId}
// -----------------------------------------------------------
export interface Court {
  id: string;
  name: string;
  sport: CourtSport;
  description: string | null;
  branch_id: string;        // Referencia a /branches/{branchId}
  images: string[];         // Array de URLs de imágenes
  price_per_hour: number;   // Precio por hora en soles
  is_active: boolean;
  amenities: string[];      // Array de amenidades/servicios
  created_at: Timestamp;
  updated_at: Timestamp;
}

// -----------------------------------------------------------
// 2.3 users (Usuarios)
// Colección: /users/{userId}
// -----------------------------------------------------------
export interface User {
  id: string;               // = Firebase Auth UID
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// Nota: La contraseña se gestiona con Firebase Auth, NO se almacena en Firestore.

// -----------------------------------------------------------
// 2.4 bookings (Reservas)
// Colección: /bookings/{bookingId}
// -----------------------------------------------------------
export interface Booking {
  id: string;
  court_id: string;          // Referencia a /courts/{courtId}
  user_id: string;           // Referencia a /users/{userId}
  date: string;              // 'YYYY-MM-DD'
  start_time: string;        // 'HH:MM'
  end_time: string;          // 'HH:MM'
  total_price: number;
  advance_amount: number;    // 50% del total
  remaining_amount: number;  // 50% del total
  status: BookingStatus;     // Visible para el cliente
  slot_status: SlotStatus;   // Visible para el admin
  payment_method: PaymentMethod | null;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// Subcolección: /bookings/{bookingId}/payments/{paymentId}
export interface Payment {
  id: string;
  booking_id: string;        // Referencia al documento padre
  user_id: string;           // Referencia a /users/{userId}
  amount: number;
  type: PaymentType;
  method: PaymentMethod;
  status: PaymentStatus;
  external_ref: string | null; // 'YAP-001', 'PLN-001', etc.
  created_at: Timestamp;
  updated_at: Timestamp;
}

// -----------------------------------------------------------
// 2.5 expenses (Gastos)
// Colección: /expenses/{expenseId}
// -----------------------------------------------------------
export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;              // 'YYYY-MM-DD'
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// -----------------------------------------------------------
// 2.6 reviews (Reseñas)
// Subcolección: /courts/{courtId}/reviews/{reviewId}
// -----------------------------------------------------------
export interface Review {
  id: string;
  user_id: string;           // Referencia a /users/{userId}
  user_name: string;         // Denormalizado para consultas
  rating: number;            // 1 a 5
  comment: string | null;
  created_at: Timestamp;
}

// ============================================================
// 3. ESTRUCTURA DE COLECCIONES
// ============================================================

/**
 * Estructura de Firestore:
 *
 *  /branches/{branchId}               ← Raíz
 *  /courts/{courtId}                  ← Raíz
 *    /courts/{courtId}/reviews/{reviewId}  ← Subcolección
 *  /users/{userId}                    ← Raíz
 *  /bookings/{bookingId}              ← Raíz
 *    /bookings/{bookingId}/payments/{paymentId}  ← Subcolección
 *  /expenses/{expenseId}              ← Raíz
 *
 * Relaciones:
 *  branches  1:N courts     (court.branch_id → branches.id)
 *  courts    1:N bookings   (booking.court_id → courts.id)
 *  courts    1:N reviews    (subcolección anidada)
 *  users     1:N bookings   (booking.user_id → users.id)
 *  users     1:N reviews    (review.user_id → users.id)
 *  bookings  1:N payments   (subcolección anidada)
 */

// ============================================================
// 4. CONSTANTES DE VALIDACION
// ============================================================

export const VALIDATION = {
  MIN_HOUR: 8,
  MAX_HOUR: 22,
  SLOT_DURATION: 60,
  ADVANCE_PERCENTAGE: 0.5,
  MIN_RATING: 1,
  MAX_RATING: 5,
  MIN_PRICE: 0,
  MAX_PRICE: 9999.99,
} as const;

// ============================================================
// 5. FUNCIONES AUXILIARES
// ============================================================

export function generateTimeSlots(): Array<{ start_time: string; end_time: string }> {
  const slots: Array<{ start_time: string; end_time: string }> = [];
  for (let h = VALIDATION.MIN_HOUR; h < VALIDATION.MAX_HOUR; h++) {
    slots.push({
      start_time: `${String(h).padStart(2, '0')}:00`,
      end_time: `${String(h + 1).padStart(2, '0')}:00`,
    });
  }
  return slots;
}

export function validateBooking(booking: Partial<Booking>): string | null {
  if (booking.start_time && booking.end_time && booking.end_time <= booking.start_time) {
    return 'La hora de fin debe ser posterior a la hora de inicio';
  }
  if (booking.total_price !== undefined && booking.total_price < 0) {
    return 'El precio total no puede ser negativo';
  }
  if (
    booking.advance_amount !== undefined &&
    booking.total_price !== undefined &&
    booking.advance_amount > booking.total_price
  ) {
    return 'El adelanto no puede superar el precio total';
  }
  if (
    booking.advance_amount !== undefined &&
    booking.remaining_amount !== undefined &&
    booking.total_price !== undefined &&
    Math.abs((booking.advance_amount + booking.remaining_amount) - booking.total_price) > 0.01
  ) {
    return 'La suma del adelanto y el saldo restante debe ser igual al precio total';
  }
  return null;
}
