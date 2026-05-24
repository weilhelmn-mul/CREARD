import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create single branch
  const branch1 = await prisma.branch.create({
    data: {
      name: 'CanchaMax Centro',
      address: 'Av. Principal 123',
      city: 'Lima',
      phone: '+51 987 654 321',
      email: 'centro@canchamax.com',
    },
  });

  // Create 4 football courts, 2 volleyball courts, 1 events salon
  const courts = await Promise.all([
    // FÚTBOL 1
    prisma.court.create({
      data: {
        name: 'Cancha de Fútbol 1',
        sport: 'futbol',
        description: 'Cancha de fútbol 5 con césped sintético de última generación. Iluminación LED, vestuarios con duchas y marcador electrónico. Ideal para partidos amateurs y torneos.',
        branchId: branch1.id,
        images: JSON.stringify([
          'https://lh3.googleusercontent.com/aida/ADBb0ugR1W028dfouFYVkLV8ywXH715szM1noNRjAX27NjZJbSISuwwfcsG6OXBvhpGPNm447Y0fxD3AlUcrHqWNIigbyhb8_DhH7zoaXTTMs5-cvBckeVW9rdWSj4hDNrVXdNzmNGD7mXTNDm3uZEFYighajMVsZxRH-FuyI1GNSeBM_VvVec734cFXJx1aXQQyGao2CWTAGDNAhQwBBVrzBz2WCsSW4zrd9LxTJemAT7MobhTbMPrW9AnLSSs',
        ]),
        rating: 4.9,
        reviewCount: 128,
        pricePerHour: 45,
        amenities: JSON.stringify(['Wi-Fi', 'Estacionamiento', 'Vestuarios', 'Iluminación LED', 'Duchas', 'Marcador', 'Cafetería']),
      },
    }),
    // FÚTBOL 2
    prisma.court.create({
      data: {
        name: 'Cancha de Fútbol 2',
        sport: 'futbol',
        description: 'Cancha de fútbol 7 con césped sintético de alta densidad. Porterías reglamentarias, red protector lateral y zona de aquecimiento. Perfecta para partidos grupales.',
        branchId: branch1.id,
        images: JSON.stringify([
          'https://lh3.googleusercontent.com/aida/ADBb0ugR1W028dfouFYVkLV8ywXH715szM1noNRjAX27NjZJbSISuwwfcsG6OXBvhpGPNm447Y0fxD3AlUcrHqWNIigbyhb8_DhH7zoaXTTMs5-cvBckeVW9rdWSj4hDNrVXdNzmNGD7mXTNDm3uZEFYighajMVsZxRH-FuyI1GNSeBM_VvVec734cFXJx1aXQQyGao2CWTAGDNAhQwBBVrzBz2WCsSW4zrd9LxTJemAT7MobhTbMPrW9AnLSSs',
        ]),
        rating: 4.8,
        reviewCount: 95,
        pricePerHour: 50,
        amenities: JSON.stringify(['Wi-Fi', 'Estacionamiento', 'Vestuarios', 'Iluminación LED', 'Duchas', 'Red lateral', 'Cafetería']),
      },
    }),
    // FÚTBOL 3
    prisma.court.create({
      data: {
        name: 'Cancha de Fútbol 3',
        sport: 'futbol',
        description: 'Cancha de fútbol 5 techada con piso tarima profesional. Climatización, sonido ambiental y vestuarios premium. Ideal para jugar sin importar el clima.',
        branchId: branch1.id,
        images: JSON.stringify([
          'https://lh3.googleusercontent.com/aida/ADBb0ugR1W028dfouFYVkLV8ywXH715szM1noNRjAX27NjZJbSISuwwfcsG6OXBvhpGPNm447Y0fxD3AlUcrHqWNIigbyhb8_DhH7zoaXTTMs5-cvBckeVW9rdWSj4hDNrVXdNzmNGD7mXTNDm3uZEFYighajMVsZxRH-FuyI1GNSeBM_VvVec734cFXJx1aXQQyGao2CWTAGDNAhQwBBVrzBz2WCsSW4zrd9LxTJemAT7MobhTbMPrW9AnLSSs',
        ]),
        rating: 4.7,
        reviewCount: 72,
        pricePerHour: 55,
        amenities: JSON.stringify(['Climatización', 'Vestuarios Premium', 'Wi-Fi', 'Sonido', 'Iluminación LED', 'Estacionamiento']),
      },
    }),
    // FÚTBOL 4
    prisma.court.create({
      data: {
        name: 'Cancha de Fútbol 4',
        sport: 'futbol',
        description: 'Cancha de fútbol 11 con césped natural, gradas para 500 espectadores y cabinas de transmisión. La experiencia más completa para partidos competitivos y torneos oficiales.',
        branchId: branch1.id,
        images: JSON.stringify([
          'https://lh3.googleusercontent.com/aida/ADBb0ugR1W028dfouFYVkLV8ywXH715szM1noNRjAX27NjZJbSISuwwfcsG6OXBvhpGPNm447Y0fxD3AlUcrHqWNIigbyhb8_DhH7zoaXTTMs5-cvBckeVW9rdWSj4hDNrVXdNzmNGD7mXTNDm3uZEFYighajMVsZxRH-FuyI1GNSeBM_VvVec734cFXJx1aXQQyGao2CWTAGDNAhQwBBVrzBz2WCsSW4zrd9LxTJemAT7MobhTbMPrW9AnLSSs',
        ]),
        rating: 4.9,
        reviewCount: 156,
        pricePerHour: 85,
        amenities: JSON.stringify(['Gradas', 'Cabinas TV', 'Estacionamiento', 'Vestuarios', 'Duchas', 'Cafetería', 'Césped natural']),
      },
    }),
    // VÓLEY A
    prisma.court.create({
      data: {
        name: 'Cancha de Vóley A',
        sport: 'voley',
        description: 'Cancha profesional de vóley con piso PVC, red FIVV homologada, tribunas para 200 espectadores y sistema de sonido profesional. Ideal para ligas y competencias.',
        branchId: branch1.id,
        images: JSON.stringify([
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDA5470OGWpmp_n9u2uhmPJkXVjJa3jyHGB5QXJE86RcW2giEptBZV6vNSBF6be7H90PkkotYRUHmd-mPw-mk2XjrJlfH-aHktPs6isa4SPUE_4veDrPd5LM6gIdXhd2QN4o14ZxYfN4d_PsKZ_YQG-DAvPxYidH0BuLzUqSGJwv8TACldwTKeku4dkebvp3jFWbOlVioZT9b9r6alfgUisim823Qjy3zZIs5NE8eoPy4SCdN_a0BC5Xiw0KRPg1n_IUR2R4D0Ld27j',
        ]),
        rating: 4.8,
        reviewCount: 87,
        pricePerHour: 35,
        amenities: JSON.stringify(['Wi-Fi', 'Estacionamiento', 'Tribunas', 'Sonido', 'Iluminación', 'Red FIVV']),
      },
    }),
    // VÓLEY B
    prisma.court.create({
      data: {
        name: 'Cancha de Vóley B',
        sport: 'voley',
        description: 'Cancha de vóley techada con piso PVC y excelente iluminación. Perfecciona para entrenamientos, partidos amistosos y torneos escolares o universitarios.',
        branchId: branch1.id,
        images: JSON.stringify([
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDA5470OGWpmp_n9u2uhmPJkXVjJa3jyHGB5QXJE86RcW2giEptBZV6vNSBF6be7H90PkkotYRUHmd-mPw-mk2XjrJlfH-aHktPs6isa4SPUE_4veDrPd5LM6gIdXhd2QN4o14ZxYfN4d_PsKZ_YQG-DAvPxYidH0BuLzUqSGJwv8TACldwTKeku4dkebvp3jFWbOlVioZT9b9r6alfgUisim823Qjy3zZIs5NE8eoPy4SCdN_a0BC5Xiw0KRPg1n_IUR2R4D0Ld27j',
        ]),
        rating: 4.6,
        reviewCount: 54,
        pricePerHour: 30,
        amenities: JSON.stringify(['Wi-Fi', 'Estacionamiento', 'Iluminación', 'Vestuarios', 'Climatización']),
      },
    }),
    // SALÓN DE EVENTOS
    prisma.court.create({
      data: {
        name: 'Salón de Eventos',
        sport: 'eventos',
        description: 'Espacio versátil para eventos corporativos, torneos, celebraciones y reuniones. Capacidad para 300 personas con servicio de catering, proyector, sistema de sonido profesional y aire acondicionado.',
        branchId: branch1.id,
        images: JSON.stringify([
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBfFiyRwb_rR1S8525jWwAgyypWC8J5H9eeagTeGYBkrjWF7QVTGYD8VaXrfsdIIStep6EkcGXMW8cLSrCria-MF7fEfpa6qnObNeIvqXrzVe8klRKGRJqWB6fyseGAHesOF6RyTJHUFokiEnRBfHaJe23R7gSQ_FLMvqDvw1AjEaJFZUS3bllkp3j9FzZmmZUzn3WlvtGZCSCaPm_A5bnXACJ1TL9M4CTbJJh27nI2aWT4nkkkHgCzqxTmzH_hsMnZdi80sCQ8cUqg',
        ]),
        rating: 5.0,
        reviewCount: 45,
        pricePerHour: 120,
        amenities: JSON.stringify(['Wi-Fi', 'Estacionamiento', 'Catering', 'Sonido profesional', 'Iluminación', 'Proyector', 'A/C', 'Escenario', 'Baños']),
      },
    }),
  ]);

  // Create clients
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        name: 'Carlos Mendoza',
        email: 'carlos@email.com',
        phone: '+51 987 111 222',
        points: 350,
        credit: 50,
        membership: 'premium',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDjVDHNzIdAMhVwEmkn0m6j0jTEHJBBdbEDuemdvXTpV7xyIdcQV5jb3d0pfH0OeqUi5NPAe-82RSxYZ_HnFOusF9icVOg3a5fXN_B7Q4Kq1rg8E8pSIDTNOWr1OiKsrR6So9sOy1Qbv99DDB5mY-TD9ZG7StfdOV9XkEeM5q7GfwkYV_1HoBAAAhAEbjeEnoApczqc8d703zAhJ2L6XYzhoc3iArbCwtemhfcIImmrhx1RtGoxqd7u5iN3xEoUbvxTnXV5aLa-8fjc',
      },
    }),
    prisma.client.create({
      data: {
        name: 'María García',
        email: 'maria@email.com',
        phone: '+51 912 333 444',
        points: 200,
        credit: 25,
        membership: 'basic',
      },
    }),
    prisma.client.create({
      data: {
        name: 'Juan Pérez',
        email: 'juan@email.com',
        phone: '+51 945 555 666',
        points: 520,
        credit: 80,
        membership: 'premium',
      },
    }),
  ]);

  // Create bookings across all courts
  const now = new Date();
  const bookings = await Promise.all([
    // Fútbol 1 - confirmed
    prisma.booking.create({
      data: {
        courtId: courts[0].id, // Fútbol 1
        clientId: clients[0].id,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        startTime: '18:00',
        endTime: '19:00',
        totalPrice: 45,
        status: 'confirmed',
        paymentMethod: 'card',
        paymentStatus: 'paid',
      },
    }),
    // Vóley A - confirmed
    prisma.booking.create({
      data: {
        courtId: courts[4].id, // Vóley A
        clientId: clients[1].id,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        startTime: '20:00',
        endTime: '21:00',
        totalPrice: 35,
        status: 'confirmed',
        paymentMethod: 'transfer',
        paymentStatus: 'paid',
      },
    }),
    // Fútbol 2 - confirmed
    prisma.booking.create({
      data: {
        courtId: courts[1].id, // Fútbol 2
        clientId: clients[2].id,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2),
        startTime: '16:00',
        endTime: '17:00',
        totalPrice: 50,
        status: 'confirmed',
        paymentMethod: 'cash',
        paymentStatus: 'pending',
      },
    }),
    // Fútbol 3 - confirmed
    prisma.booking.create({
      data: {
        courtId: courts[2].id, // Fútbol 3
        clientId: clients[0].id,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3),
        startTime: '19:00',
        endTime: '20:00',
        totalPrice: 55,
        status: 'confirmed',
        paymentMethod: 'card',
        paymentStatus: 'paid',
      },
    }),
    // Salón de Eventos - completed
    prisma.booking.create({
      data: {
        courtId: courts[6].id, // Salón de Eventos
        clientId: clients[1].id,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0),
        startTime: '10:00',
        endTime: '14:00',
        totalPrice: 480,
        status: 'completed',
        paymentMethod: 'card',
        paymentStatus: 'paid',
      },
    }),
    // Fútbol 4 - completed
    prisma.booking.create({
      data: {
        courtId: courts[3].id, // Fútbol 4
        clientId: clients[2].id,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
        startTime: '08:00',
        endTime: '10:00',
        totalPrice: 170,
        status: 'completed',
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    }),
    // Vóley B - completed
    prisma.booking.create({
      data: {
        courtId: courts[5].id, // Vóley B
        clientId: clients[0].id,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
        startTime: '17:00',
        endTime: '19:00',
        totalPrice: 60,
        status: 'completed',
        paymentMethod: 'card',
        paymentStatus: 'paid',
      },
    }),
    // Fútbol 1 - completed
    prisma.booking.create({
      data: {
        courtId: courts[0].id, // Fútbol 1
        clientId: clients[1].id,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3),
        startTime: '19:00',
        endTime: '20:00',
        totalPrice: 45,
        status: 'completed',
        paymentMethod: 'transfer',
        paymentStatus: 'paid',
      },
    }),
    // Fútbol 2 - completed
    prisma.booking.create({
      data: {
        courtId: courts[1].id, // Fútbol 2
        clientId: clients[0].id,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 4),
        startTime: '20:00',
        endTime: '21:00',
        totalPrice: 50,
        status: 'completed',
        paymentMethod: 'card',
        paymentStatus: 'paid',
      },
    }),
    // Fútbol 3 - completed
    prisma.booking.create({
      data: {
        courtId: courts[2].id, // Fútbol 3
        clientId: clients[2].id,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5),
        startTime: '18:00',
        endTime: '19:00',
        totalPrice: 55,
        status: 'completed',
        paymentMethod: 'card',
        paymentStatus: 'paid',
      },
    }),
    // Fútbol 4 - completed
    prisma.booking.create({
      data: {
        courtId: courts[3].id, // Fútbol 4
        clientId: clients[1].id,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
        startTime: '15:00',
        endTime: '17:00',
        totalPrice: 170,
        status: 'completed',
        paymentMethod: 'transfer',
        paymentStatus: 'paid',
      },
    }),
  ]);

  // Create payments
  await Promise.all([
    prisma.payment.create({
      data: { bookingId: bookings[0].id, amount: 45, method: 'card', status: 'completed', externalRef: 'MP-001' },
    }),
    prisma.payment.create({
      data: { bookingId: bookings[1].id, amount: 35, method: 'transfer', status: 'completed', externalRef: 'TR-002' },
    }),
    prisma.payment.create({
      data: { bookingId: bookings[3].id, amount: 55, method: 'card', status: 'completed', externalRef: 'MP-003' },
    }),
    prisma.payment.create({
      data: { bookingId: bookings[4].id, amount: 480, method: 'card', status: 'completed', externalRef: 'MP-004' },
    }),
    prisma.payment.create({
      data: { bookingId: bookings[5].id, amount: 170, method: 'cash', status: 'completed', externalRef: 'EF-005' },
    }),
    prisma.payment.create({
      data: { bookingId: bookings[6].id, amount: 60, method: 'card', status: 'completed', externalRef: 'MP-006' },
    }),
    prisma.payment.create({
      data: { bookingId: bookings[7].id, amount: 45, method: 'transfer', status: 'completed', externalRef: 'TR-007' },
    }),
    prisma.payment.create({
      data: { bookingId: bookings[8].id, amount: 50, method: 'card', status: 'completed', externalRef: 'MP-008' },
    }),
    prisma.payment.create({
      data: { bookingId: bookings[9].id, amount: 55, method: 'card', status: 'completed', externalRef: 'MP-009' },
    }),
    prisma.payment.create({
      data: { bookingId: bookings[10].id, amount: 170, method: 'transfer', status: 'completed', externalRef: 'TR-010' },
    }),
  ]);

  // Create reviews
  await Promise.all([
    prisma.review.create({
      data: {
        courtId: courts[0].id,
        clientId: clients[0].id,
        rating: 5,
        comment: 'Excelente Cancha de Fútbol 1, césped en perfecto estado. La iluminación es genial para jugar de noche.',
      },
    }),
    prisma.review.create({
      data: {
        courtId: courts[0].id,
        clientId: clients[1].id,
        rating: 5,
        comment: 'El mejor lugar para jugar fútbol. Vestuarios limpios y buena atención.',
      },
    }),
    prisma.review.create({
      data: {
        courtId: courts[1].id,
        clientId: clients[2].id,
        rating: 4,
        comment: 'La Cancha de Fútbol 2 es perfecta para 7 vs 7. Porterías reglamentarias y buen césped.',
      },
    }),
    prisma.review.create({
      data: {
        courtId: courts[2].id,
        clientId: clients[0].id,
        rating: 5,
        comment: 'La Cancha 3 techada es increíble. Juegas cómodo sin importar la lluvia.',
      },
    }),
    prisma.review.create({
      data: {
        courtId: courts[3].id,
        clientId: clients[2].id,
        rating: 5,
        comment: 'La Cancha 4 de fútbol 11 es espectacular. Gradas, césped natural, la mejor experiencia.',
      },
    }),
    prisma.review.create({
      data: {
        courtId: courts[4].id,
        clientId: clients[0].id,
        rating: 4,
        comment: 'La Cancha de Vóley A tiene un piso excelente y buena tribuna para espectadores.',
      },
    }),
    prisma.review.create({
      data: {
        courtId: courts[5].id,
        clientId: clients[1].id,
        rating: 5,
        comment: 'La Cancha de Vóley B techada es ideal para entrenar. Buena climatización.',
      },
    }),
    prisma.review.create({
      data: {
        courtId: courts[6].id,
        clientId: clients[0].id,
        rating: 5,
        comment: 'Usamos el Salón de Eventos para un torneo corporativo. Todo perfecto, el catering excelente.',
      },
    }),
  ]);

  console.log('Seed data created successfully!');
  console.log(`- 4 canchas de fútbol (1, 2, 3, 4)`);
  console.log(`- 2 canchas de vóley (A, B)`);
  console.log(`- 1 salón de eventos`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
