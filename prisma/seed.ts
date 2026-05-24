import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create single branch
  const branch1 = await prisma.branch.create({
    data: {
      name: 'CREARD',
      address: 'Av. Bolivar C1, San Sebastián',
      city: 'Cusco',
      phone: '+51 984 123 456',
      email: 'info@creard.com',
    },
  });

  // Create 4 football 5 courts + 2 volleyball courts
  const courts = await Promise.all([
    // FÚTBOL 1
    prisma.court.create({
      data: {
        name: 'Cancha de Fútbol 1',
        sport: 'futbol',
        description: 'Cancha de fútbol 5 con césped sintético de última generación. Iluminación LED, vestuarios con duchas y marcador electrónico. Ideal para partidos amateurs y torneos.',
        branchId: branch1.id,
        images: JSON.stringify(['/cancha-futbol-1.png']),
        pricePerHour: 45,
        amenities: JSON.stringify(['Wi-Fi', 'Estacionamiento', 'Vestuarios', 'Iluminación LED', 'Duchas', 'Marcador', 'Cafetería']),
      },
    }),
    // FÚTBOL 2
    prisma.court.create({
      data: {
        name: 'Cancha de Fútbol 2',
        sport: 'futbol',
        description: 'Cancha de fútbol 5 con césped sintético premium e iluminación de última generación. Amplia zona de calentamiento y vestuarios completos. Ideal para torneos competitivos.',
        branchId: branch1.id,
        images: JSON.stringify(['/cancha-futbol-2.png']),
        pricePerHour: 50,
        amenities: JSON.stringify(['Wi-Fi', 'Estacionamiento', 'Vestuarios', 'Iluminación LED', 'Duchas', 'Zona de calentamiento', 'Cafetería']),
      },
    }),
    // FÚTBOL 3
    prisma.court.create({
      data: {
        name: 'Cancha de Fútbol 3',
        sport: 'futbol',
        description: 'Cancha de fútbol 5 techada con piso tarima profesional. Climatización, sonido ambiental y vestuarios premium. Ideal para jugar sin importar el clima.',
        branchId: branch1.id,
        images: JSON.stringify(['/cancha-futbol-3.png']),
        pricePerHour: 55,
        amenities: JSON.stringify(['Climatización', 'Vestuarios Premium', 'Wi-Fi', 'Sonido', 'Iluminación LED', 'Estacionamiento']),
      },
    }),
    // FÚTBOL 4
    prisma.court.create({
      data: {
        name: 'Cancha de Fútbol 4',
        sport: 'futbol',
        description: 'Cancha de fútbol 5 al aire libre con césped sintético de alta calidad, excelente iluminación nocturna y amplio espacio. La mejor opción para torneos oficiales.',
        branchId: branch1.id,
        images: JSON.stringify(['/cancha-futbol-4.png']),
        pricePerHour: 55,
        amenities: JSON.stringify(['Wi-Fi', 'Estacionamiento', 'Vestuarios', 'Duchas', 'Iluminación LED', 'Cafetería', 'Zona de calentamiento']),
      },
    }),
    // VÓLEY A
    prisma.court.create({
      data: {
        name: 'Cancha de Vóley A',
        sport: 'voley',
        description: 'Cancha profesional de vóley con piso PVC, red FIVV homologada, tribunas para 200 espectadores y sistema de sonido profesional. Ideal para ligas y competencias.',
        branchId: branch1.id,
        images: JSON.stringify(['/cancha-voley.png']),
        pricePerHour: 35,
        amenities: JSON.stringify(['Wi-Fi', 'Estacionamiento', 'Tribunas', 'Sonido', 'Iluminación', 'Red FIVV']),
      },
    }),
    // VÓLEY B
    prisma.court.create({
      data: {
        name: 'Cancha de Vóley B',
        sport: 'voley',
        description: 'Cancha de vóley techada con piso PVC y excelente iluminación. Perfecta para entrenamientos, partidos amistosos y torneos escolares o universitarios.',
        branchId: branch1.id,
        images: JSON.stringify(['/cancha-voley.png']),
        pricePerHour: 30,
        amenities: JSON.stringify(['Wi-Fi', 'Estacionamiento', 'Iluminación', 'Vestuarios', 'Climatización']),
      },
    }),
  ]);

  // Create users
  const admin = await prisma.user.create({
    data: {
      name: 'Administrador CREARD',
      email: 'admin@creard.com',
      phone: '+51 984 000 000',
      password: 'admin123',
      role: 'admin',
    },
  });

  const client1 = await prisma.user.create({
    data: {
      name: 'Carlos Mendoza',
      email: 'carlos@email.com',
      phone: '+51 984 111 222',
      password: 'user123',
      role: 'user',
    },
  });

  const client2 = await prisma.user.create({
    data: {
      name: 'María García',
      email: 'maria@email.com',
      phone: '+51 984 333 444',
      password: 'user123',
      role: 'user',
    },
  });

  const client3 = await prisma.user.create({
    data: {
      name: 'Juan Pérez',
      email: 'juan@email.com',
      phone: '+51 984 555 666',
      password: 'user123',
      role: 'user',
    },
  });

  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const addDays = (d: number) => { const r = new Date(today); r.setDate(r.getDate() + d); return fmt(r); };

  // Create bookings with various statuses
  const bookings = await Promise.all([
    // Fútbol 1 - fully_paid (user completed payment)
    prisma.booking.create({
      data: {
        courtId: courts[0].id,
        userId: client1.id,
        date: addDays(1),
        startTime: '18:00',
        endTime: '19:00',
        totalPrice: 45,
        advanceAmount: 22.5,
        remainingAmount: 22.5,
        status: 'fully_paid',
        paymentMethod: 'yape',
      },
    }),
    // Vóley A - partially_paid (only advance paid)
    prisma.booking.create({
      data: {
        courtId: courts[4].id,
        userId: client2.id,
        date: addDays(1),
        startTime: '20:00',
        endTime: '21:00',
        totalPrice: 35,
        advanceAmount: 17.5,
        remainingAmount: 17.5,
        status: 'partially_paid',
        paymentMethod: 'plin',
      },
    }),
    // Fútbol 2 - confirmed (pending advance payment)
    prisma.booking.create({
      data: {
        courtId: courts[1].id,
        userId: client3.id,
        date: addDays(2),
        startTime: '16:00',
        endTime: '17:00',
        totalPrice: 50,
        advanceAmount: 0,
        remainingAmount: 50,
        status: 'confirmed',
      },
    }),
    // Fútbol 3 - fully_paid
    prisma.booking.create({
      data: {
        courtId: courts[2].id,
        userId: client1.id,
        date: addDays(3),
        startTime: '19:00',
        endTime: '20:00',
        totalPrice: 55,
        advanceAmount: 27.5,
        remainingAmount: 27.5,
        status: 'fully_paid',
        paymentMethod: 'culqi',
      },
    }),
    // Fútbol 1 - completed
    prisma.booking.create({
      data: {
        courtId: courts[0].id,
        userId: client2.id,
        date: addDays(-1),
        startTime: '18:00',
        endTime: '19:00',
        totalPrice: 45,
        advanceAmount: 22.5,
        remainingAmount: 22.5,
        status: 'completed',
        paymentMethod: 'yape',
      },
    }),
    // Fútbol 4 - completed
    prisma.booking.create({
      data: {
        courtId: courts[3].id,
        userId: client3.id,
        date: addDays(-1),
        startTime: '08:00',
        endTime: '10:00',
        totalPrice: 110,
        advanceAmount: 55,
        remainingAmount: 55,
        status: 'completed',
        paymentMethod: 'card',
      },
    }),
    // Vóley B - completed
    prisma.booking.create({
      data: {
        courtId: courts[5].id,
        userId: client1.id,
        date: addDays(-2),
        startTime: '17:00',
        endTime: '19:00',
        totalPrice: 60,
        advanceAmount: 30,
        remainingAmount: 30,
        status: 'completed',
        paymentMethod: 'transfer',
      },
    }),
    // Fútbol 2 - completed
    prisma.booking.create({
      data: {
        courtId: courts[1].id,
        userId: client1.id,
        date: addDays(-3),
        startTime: '20:00',
        endTime: '21:00',
        totalPrice: 50,
        advanceAmount: 25,
        remainingAmount: 25,
        status: 'completed',
        paymentMethod: 'cash',
      },
    }),
    // Fútbol 3 - cancelled
    prisma.booking.create({
      data: {
        courtId: courts[2].id,
        userId: client3.id,
        date: addDays(-4),
        startTime: '18:00',
        endTime: '19:00',
        totalPrice: 55,
        advanceAmount: 27.5,
        remainingAmount: 27.5,
        status: 'cancelled',
        paymentMethod: 'yape',
      },
    }),
    // Fútbol 4 - completed
    prisma.booking.create({
      data: {
        courtId: courts[3].id,
        userId: client2.id,
        date: addDays(-5),
        startTime: '15:00',
        endTime: '17:00',
        totalPrice: 110,
        advanceAmount: 55,
        remainingAmount: 55,
        status: 'completed',
        paymentMethod: 'culqi',
      },
    }),
    // Fútbol 1 - fully_paid (today)
    prisma.booking.create({
      data: {
        courtId: courts[0].id,
        userId: client3.id,
        date: fmt(today),
        startTime: '19:00',
        endTime: '20:00',
        totalPrice: 45,
        advanceAmount: 22.5,
        remainingAmount: 22.5,
        status: 'fully_paid',
        paymentMethod: 'plin',
      },
    }),
  ]);

  // Create payments
  await Promise.all([
    // Booking 0 - Fútbol 1 tomorrow - advance
    prisma.payment.create({ data: { bookingId: bookings[0].id, userId: client1.id, amount: 22.5, type: 'advance', method: 'yape', status: 'completed', externalRef: 'YAP-001' } }),
    // Booking 0 - remaining
    prisma.payment.create({ data: { bookingId: bookings[0].id, userId: client1.id, amount: 22.5, type: 'remaining', method: 'yape', status: 'completed', externalRef: 'YAP-002' } }),
    // Booking 1 - Vóley A - only advance
    prisma.payment.create({ data: { bookingId: bookings[1].id, userId: client2.id, amount: 17.5, type: 'advance', method: 'plin', status: 'completed', externalRef: 'PLN-001' } }),
    // Booking 3 - Fútbol 3 - full paid
    prisma.payment.create({ data: { bookingId: bookings[3].id, userId: client1.id, amount: 55, type: 'full', method: 'culqi', status: 'completed', externalRef: 'CUL-001' } }),
    // Booking 4 - completed
    prisma.payment.create({ data: { bookingId: bookings[4].id, userId: client2.id, amount: 45, type: 'full', method: 'yape', status: 'completed', externalRef: 'YAP-003' } }),
    // Booking 5 - completed
    prisma.payment.create({ data: { bookingId: bookings[5].id, userId: client3.id, amount: 110, type: 'full', method: 'card', status: 'completed', externalRef: 'CRD-001' } }),
    // Booking 6 - completed
    prisma.payment.create({ data: { bookingId: bookings[6].id, userId: client1.id, amount: 60, type: 'full', method: 'transfer', status: 'completed', externalRef: 'TRF-001' } }),
    // Booking 7 - completed
    prisma.payment.create({ data: { bookingId: bookings[7].id, userId: client1.id, amount: 50, type: 'full', method: 'cash', status: 'completed', externalRef: 'EF-001' } }),
    // Booking 8 - cancelled (refund)
    prisma.payment.create({ data: { bookingId: bookings[8].id, userId: client3.id, amount: 27.5, type: 'advance', method: 'yape', status: 'refunded', externalRef: 'YAP-004' } }),
    // Booking 9 - completed
    prisma.payment.create({ data: { bookingId: bookings[9].id, userId: client2.id, amount: 110, type: 'full', method: 'culqi', status: 'completed', externalRef: 'CUL-002' } }),
    // Booking 10 - today
    prisma.payment.create({ data: { bookingId: bookings[10].id, userId: client3.id, amount: 45, type: 'full', method: 'plin', status: 'completed', externalRef: 'PLN-002' } }),
  ]);

  // Create expenses
  const todayStr = fmt(today);
  await Promise.all([
    prisma.expense.create({ data: { description: 'Mantenimiento césped Cancha 1', amount: 120, category: 'mantenimiento', date: addDays(-1), notes: 'Corte y reparación de césped sintético' } }),
    prisma.expense.create({ data: { description: 'Servicio de energía eléctrica', amount: 350, category: 'servicios', date: todayStr, notes: 'Recibo de luz mensual' } }),
    prisma.expense.create({ data: { description: 'Sueldo personal de limpieza', amount: 800, category: 'personal', date: addDays(-2), notes: 'Pago quincernal' } }),
    prisma.expense.create({ data: { description: 'Reparación iluminación LED', amount: 200, category: 'mantenimiento', date: addDays(-3), notes: 'Cambio de lámparas Cancha 2' } }),
    prisma.expense.create({ data: { description: 'Agua potable', amount: 80, category: 'servicios', date: addDays(-5), notes: 'Recibo mensual' } }),
    prisma.expense.create({ data: { description: 'Material de limpieza', amount: 65, category: 'otros', date: addDays(-4), notes: 'Detergentes, desinfectantes' } }),
    prisma.expense.create({ data: { description: 'Alquiler terreno', amount: 1500, category: 'alquiler', date: todayStr, notes: 'Mensual' } }),
  ]);

  // Create reviews
  await Promise.all([
    prisma.review.create({ data: { courtId: courts[0].id, userId: client1.id, rating: 5, comment: 'Excelente Cancha de Fútbol 1, césped en perfecto estado. La iluminación es genial para jugar de noche.' } }),
    prisma.review.create({ data: { courtId: courts[0].id, userId: client2.id, rating: 5, comment: 'El mejor lugar para jugar fútbol en Cusco. Vestuarios limpios y buena atención.' } }),
    prisma.review.create({ data: { courtId: courts[1].id, userId: client3.id, rating: 4, comment: 'La Cancha de Fútbol 2 es perfecta para 5 vs 5. Excelente césped y buena iluminación.' } }),
    prisma.review.create({ data: { courtId: courts[2].id, userId: client1.id, rating: 5, comment: 'La Cancha 3 techada es increíble. Juegas cómodo sin importar la lluvia.' } }),
    prisma.review.create({ data: { courtId: courts[3].id, userId: client3.id, rating: 5, comment: 'La Cancha de Fútbol 4 es espectacular. Ideal para torneos y amplia iluminación.' } }),
    prisma.review.create({ data: { courtId: courts[4].id, userId: client1.id, rating: 4, comment: 'La Cancha de Vóley A tiene un piso excelente y buena tribuna para espectadores.' } }),
    prisma.review.create({ data: { courtId: courts[5].id, userId: client2.id, rating: 5, comment: 'La Cancha de Vóley B techada es ideal para entrenar. Buena climatización.' } }),
  ]);

  console.log('Seed data created successfully!');
  console.log('- 4 canchas de fútbol 5 (1, 2, 3, 4)');
  console.log('- 2 canchas de vóley (A, B)');
  console.log('- 1 admin + 3 clientes');
  console.log('- 11 reservas con diferentes estados');
  console.log('- 7 gastos registrados');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
