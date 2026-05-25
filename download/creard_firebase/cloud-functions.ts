// ============================================================
// CREARD - Cloud Functions (Firebase Functions)
// Lógica de negocio del lado del servidor
// ============================================================

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// Inicializar Firebase Admin (solo una vez)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ============================================================
// 1. TRIGGER: Auto-crear perfil de usuario al registrarse
// ============================================================

/**
 * Se ejecuta automáticamente cuando un nuevo usuario se registra
 * en Firebase Authentication. Crea el documento en /users/{uid}.
 */
export const onCreateUser = functions.auth
  .user()
  .onCreate(async (user) => {
    const { uid, email, displayName } = user;

    await db.collection('users').doc(uid).set({
      id: uid,
      name: displayName || email?.split('@')[0] || 'Usuario',
      email: email || '',
      phone: user.phoneNumber || null,
      role: 'user', // Por defecto es cliente
      is_active: true,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    });

    console.log(`Perfil creado para usuario: ${uid}`);
    return null;
  });

// ============================================================
// 2. TRIGGER: Actualizar updated_at al modificar documentos
// ============================================================

/**
 * Trigger genérico que actualiza el campo updated_at
 * cuando se modifica cualquier documento en las colecciones principales.
 */

export const onUpdateBranch = functions.firestore
  .document('branches/{branchId}')
  .onUpdate(async (change) => {
    await change.after.ref.update({ updated_at: Timestamp.now() });
  });

export const onUpdateCourt = functions.firestore
  .document('courts/{courtId}')
  .onUpdate(async (change) => {
    await change.after.ref.update({ updated_at: Timestamp.now() });
  });

export const onUpdateUser = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change) => {
    await change.after.ref.update({ updated_at: Timestamp.now() });
  });

export const onUpdateBooking = functions.firestore
  .document('bookings/{bookingId}')
  .onUpdate(async (change) => {
    await change.after.ref.update({ updated_at: Timestamp.now() });
  });

export const onUpdateExpense = functions.firestore
  .document('expenses/{expenseId}')
  .onUpdate(async (change) => {
    await change.after.ref.update({ updated_at: Timestamp.now() });
  });

// ============================================================
// 3. TRIGGER: Verificar disponibilidad al crear reserva
// ============================================================

/**
 * Antes de crear una reserva, verifica que no exista otra
 * reserva en la misma cancha, fecha y hora.
 * Si existe un conflicto, lanza un error y bloquea la creación.
 */
export const beforeCreateBooking = functions.firestore
  .document('bookings/{bookingId}')
  .onCreate(async (snap, context) => {
    const booking = snap.data();
    const { court_id, date, start_time, end_time } = booking;

    // Buscar reservas existentes en el mismo slot
    const existingBookings = await db
      .collection('bookings')
      .where('court_id', '==', court_id)
      .where('date', '==', date)
      .where('start_time', '==', start_time)
      .where('end_time', '==', end_time)
      .where('status', 'not-in', ['cancelled', 'expired'])
      .get();

    if (existingBookings.size > 1) {
      // Hay más de una reserva (incluyendo la que se acaba de crear)
      // Eliminar la reserva duplicada
      await snap.ref.delete();
      throw new functions.https.HttpsError(
        'already-exists',
        'Ya existe una reserva para esta cancha en el horario seleccionado.'
      );
    }

    console.log(`Reserva creada: ${context.params.bookingId}`);
    return null;
  });

// ============================================================
// 4. TRIGGER: Actualizar estadísticas de cancha al reseñar
// ============================================================

/**
 * Cuando se crea una reseña, actualiza el promedio de calificación
 * y el conteo de reseñas en el documento de la cancha.
 */
export const onCreateReview = functions.firestore
  .document('courts/{courtId}/reviews/{reviewId}')
  .onCreate(async (snap, context) => {
    const review = snap.data();
    const courtId = context.params.courtId;

    // Obtener todas las reseñas de la cancha
    const reviews = await db
      .collection(`courts/${courtId}/reviews`)
      .get();

    const totalReviews = reviews.size;
    const avgRating =
      reviews.docs.reduce((sum, doc) => sum + doc.data().rating, 0) / totalReviews;

    // Actualizar la cancha con las estadísticas
    await db.collection('courts').doc(courtId).update({
      avg_rating: Math.round(avgRating * 10) / 10,
      total_reviews: totalReviews,
      updated_at: Timestamp.now(),
    });

    console.log(`Reseña creada para cancha ${courtId}: ${review.rating} estrellas`);
    return null;
  });

// ============================================================
// 5. HTTPS FUNCTION: Crear primer admin
// ============================================================

/**
 * Función para promover un usuario a admin.
 * DEBE llamarse manualmente una sola vez con el UID del usuario.
 *
 * Uso:
 *   curl -X POST https://region-project.cloudfunctions.net/setAdminRole \
 *     -H "Content-Type: application/json" \
 *     -d '{"uid": "USER_UID_HERE"}'
 */
export const setAdminRole = functions
  .https
  .onRequest(async (req, res) => {
    // Verificar que la petición viene de un admin (opcional)
    // En producción, agregar verificación con Firebase ID Token

    const { uid } = req.body;

    if (!uid) {
      res.status(400).json({ error: 'UID es requerido' });
      return;
    }

    try {
      await db.collection('users').doc(uid).update({
        role: 'admin',
        updated_at: Timestamp.now(),
      });

      // También agregar claim en Firebase Auth
      await admin.auth().setCustomUserClaims(uid, { role: 'admin' });

      res.status(200).json({
        success: true,
        message: `Usuario ${uid} promovido a admin`,
      });
    } catch (error) {
      console.error('Error al promover usuario:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

// ============================================================
// 6. HTTPS FUNCTION: Obtener disponibilidad de cancha
// ============================================================

/**
 * Retorna los slots horarios disponibles de una cancha para una fecha.
 * Equivalente a la función get_court_availability de Supabase.
 *
 * Uso:
 *   GET /getCourAvailability?courtId=XXX&date=2026-05-26
 */
export const getCourtAvailability = functions
  .https
  .onRequest(async (req, res) => {
    const { courtId, date } = req.query;

    if (!courtId || !date) {
      res.status(400).json({ error: 'courtId y date son requeridos' });
      return;
    }

    try {
      // Generar slots de 08:00 a 22:00
      const slots = [];
      for (let h = 8; h < 22; h++) {
        const start_time = `${String(h).padStart(2, '0')}:00`;
        const end_time = `${String(h + 1).padStart(2, '0')}:00`;

        // Buscar si hay reserva en este slot
        const bookings = await db
          .collection('bookings')
          .where('court_id', '==', courtId as string)
          .where('date', '==', date as string)
          .where('start_time', '==', start_time)
          .where('status', 'not-in', ['cancelled', 'expired'])
          .limit(1)
          .get();

        const isAvailable = bookings.empty;

        let bookingId = null;
        let clientName = null;
        let slotStatus = 'available';

        if (!isAvailable) {
          const booking = bookings.docs[0].data();
          bookingId = bookings.docs[0].id;
          slotStatus = booking.slot_status;

          // Obtener nombre del cliente
          const userDoc = await db
            .collection('users')
            .doc(booking.user_id)
            .get();
          clientName = userDoc.exists ? userDoc.data()?.name : null;
        }

        slots.push({
          start_time,
          end_time,
          is_available: isAvailable,
          booking_id: bookingId,
          client_name: clientName,
          slot_status: slotStatus,
        });
      }

      res.status(200).json({ courtId, date, slots });
    } catch (error) {
      console.error('Error al obtener disponibilidad:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

// ============================================================
// 7. HTTPS FUNCTION: Resumen financiero
// ============================================================

/**
 * Calcula el resumen financiero en un rango de fechas.
 * Equivalente a la función get_financial_summary de Supabase.
 *
 * Uso:
 *   GET /getFinancialSummary?startDate=2026-05-01&endDate=2026-05-31
 */
export const getFinancialSummary = functions
  .https
  .onRequest(async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate y endDate son requeridos (YYYY-MM-DD)' });
      return;
    }

    try {
      // Obtener reservas en el rango de fechas
      const bookingsSnapshot = await db
        .collection('bookings')
        .where('date', '>=', startDate as string)
        .where('date', '<=', endDate as string)
        .get();

      let totalIncome = 0;
      let pendingIncome = 0;
      let totalBookings = bookingsSnapshot.size;
      let completedBookings = 0;

      for (const doc of bookingsSnapshot.docs) {
        const booking = doc.data();

        if (booking.status === 'completed') {
          completedBookings++;
        }

        // Obtener pagos de cada reserva
        const paymentsSnapshot = await doc.ref
          .collection('payments')
          .where('status', '==', 'completed')
          .get();

        for (const payDoc of paymentsSnapshot.docs) {
          const payment = payDoc.data();
          totalIncome += payment.amount;
        }

        // Pagos pendientes
        const pendingPaymentsSnapshot = await doc.ref
          .collection('payments')
          .where('status', '==', 'pending')
          .get();

        for (const payDoc of pendingPaymentsSnapshot.docs) {
          const payment = payDoc.data();
          pendingIncome += payment.amount;
        }
      }

      // Obtener gastos en el rango de fechas
      const expensesSnapshot = await db
        .collection('expenses')
        .where('date', '>=', startDate as string)
        .where('date', '<=', endDate as string)
        .get();

      let totalExpenses = 0;
      for (const doc of expensesSnapshot.docs) {
        totalExpenses += doc.data().amount;
      }

      const balance = totalIncome - totalExpenses;

      res.status(200).json({
        startDate,
        endDate,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        balance,
        pending_income: pendingIncome,
        total_bookings: totalBookings,
        completed_bookings: completedBookings,
      });
    } catch (error) {
      console.error('Error al calcular resumen financiero:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

// ============================================================
// 8. HTTPS FUNCTION: Estado del día (admin)
// ============================================================

/**
 * Retorna el estado actual de todas las canchas para el día de hoy.
 * Equivalente a la vista v_today_status de Supabase.
 *
 * Uso:
 *   GET /getTodayStatus
 */
export const getTodayStatus = functions
  .https
  .onRequest(async (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    try {
      // Obtener todas las canchas activas
      const courtsSnapshot = await db
        .collection('courts')
        .where('is_active', '==', true)
        .orderBy('sport')
        .orderBy('name')
        .get();

      const result = [];

      for (const courtDoc of courtsSnapshot.docs) {
        const court = courtDoc.data();

        // Obtener reservas del día para esta cancha
        const bookingsSnapshot = await db
          .collection('bookings')
          .where('court_id', '==', court.id)
          .where('date', '==', today)
          .orderBy('start_time')
          .get();

        const bookings = [];
        for (const bookingDoc of bookingsSnapshot.docs) {
          const booking = bookingDoc.data();

          // Obtener nombre del cliente
          const userDoc = await db
            .collection('users')
            .doc(booking.user_id)
            .get();

          bookings.push({
            booking_id: bookingDoc.id,
            start_time: booking.start_time,
            end_time: booking.end_time,
            booking_status: booking.status,
            slot_status: booking.slot_status,
            client_name: userDoc.exists ? userDoc.data()?.name : '-',
            client_phone: userDoc.exists ? userDoc.data()?.phone : '-',
            total_price: booking.total_price,
            advance_amount: booking.advance_amount,
            remaining_amount: booking.remaining_amount,
            payment_method: booking.payment_method,
          });
        }

        result.push({
          court_id: court.id,
          court_name: court.name,
          sport: court.sport,
          bookings,
        });
      }

      res.status(200).json({ date: today, courts: result });
    } catch (error) {
      console.error('Error al obtener estado del día:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

// ============================================================
// 9. HTTPS FUNCTION: Ranking de canchas por ingresos
// ============================================================

/**
 * Retorna el ranking de canchas por ingresos totales.
 * Equivalente a la vista v_court_revenue_ranking de Supabase.
 *
 * Uso:
 *   GET /getCourtRanking
 */
export const getCourtRanking = functions
  .https
  .onRequest(async (req, res) => {
    try {
      const courtsSnapshot = await db
        .collection('courts')
        .where('is_active', '==', true)
        .get();

      const ranking = [];

      for (const courtDoc of courtsSnapshot.docs) {
        const court = courtDoc.data();

        // Contar reservas
        const bookingsSnapshot = await db
          .collection('bookings')
          .where('court_id', '==', court.id)
          .where('status', '==', 'completed')
          .get();

        // Calcular ingresos totales
        let totalRevenue = 0;
        for (const bookingDoc of bookingsSnapshot.docs) {
          const paymentsSnapshot = await bookingDoc.ref
            .collection('payments')
            .where('status', '==', 'completed')
            .get();

          for (const payDoc of paymentsSnapshot.docs) {
            totalRevenue += payDoc.data().amount;
          }
        }

        // Obtener reseñas de la cancha
        const reviewsSnapshot = await db
          .collection(`courts/${court.id}/reviews`)
          .get();

        const totalReviews = reviewsSnapshot.size;
        const avgRating =
          totalReviews > 0
            ? Math.round(
                (reviewsSnapshot.docs.reduce((s, d) => s + d.data().rating, 0) /
                  totalReviews) *
                  10
              ) / 10
            : 0;

        ranking.push({
          court_id: court.id,
          name: court.name,
          sport: court.sport,
          total_bookings: bookingsSnapshot.size,
          total_revenue: totalRevenue,
          avg_rating: avgRating,
          total_reviews: totalReviews,
        });
      }

      // Ordenar por ingresos descendentes
      ranking.sort((a, b) => b.total_revenue - a.total_revenue);

      res.status(200).json({ ranking });
    } catch (error) {
      console.error('Error al obtener ranking:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

// ============================================================
// 10. HTTPS FUNCTION: Registrar pago de adelanto
// ============================================================

/**
 * Registra un pago de adelanto (50%) y actualiza el estado de la reserva.
 *
 * Uso:
 *   POST /registerAdvancePayment
 *   Body: { bookingId, method, externalRef, amount }
 */
export const registerAdvancePayment = functions
  .https
  .onRequest(async (req, res) => {
    const { bookingId, method, externalRef, amount } = req.body;

    if (!bookingId || !method || !amount) {
      res.status(400).json({ error: 'bookingId, method y amount son requeridos' });
      return;
    }

    try {
      const bookingRef = db.collection('bookings').doc(bookingId);
      const bookingDoc = await bookingRef.get();

      if (!bookingDoc.exists) {
        res.status(404).json({ error: 'Reserva no encontrada' });
        return;
      }

      const booking = bookingDoc.data();

      // Crear el pago en la subcolección
      await bookingRef.collection('payments').add({
        booking_id: bookingId,
        user_id: booking.user_id,
        amount: amount,
        type: 'advance',
        method: method,
        status: 'completed',
        external_ref: externalRef || null,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      });

      // Actualizar la reserva
      const totalPaid = booking.advance_amount + amount;
      let newStatus: string;
      let newSlotStatus: string;

      if (totalPaid >= booking.total_price) {
        newStatus = 'fully_paid';
        newSlotStatus = 'reserved';
      } else {
        newStatus = 'partially_paid';
        newSlotStatus = 'reserved';
      }

      await bookingRef.update({
        advance_amount: totalPaid,
        remaining_amount: booking.total_price - totalPaid,
        status: newStatus,
        slot_status: newSlotStatus,
        payment_method: method,
        updated_at: Timestamp.now(),
      });

      res.status(200).json({
        success: true,
        booking_status: newStatus,
        advance_paid: totalPaid,
        remaining: booking.total_price - totalPaid,
      });
    } catch (error) {
      console.error('Error al registrar pago:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });
