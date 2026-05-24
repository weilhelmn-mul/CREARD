import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create branches
  const branch1 = await prisma.branch.create({
    data: {
      name: 'CanchaMax Centro',
      address: 'Av. Principal 123',
      city: 'Lima',
      phone: '+51 987 654 321',
      email: 'centro@canchamax.com',
    },
  });

  const branch2 = await prisma.branch.create({
    data: {
      name: 'CanchaMax Norte',
      address: 'Calle Los Deportes 456',
      city: 'Lima',
      phone: '+51 912 345 678',
      email: 'norte@canchamax.com',
    },
  });

  const branch3 = await prisma.branch.create({
    data: {
      name: 'CanchaMax Sur',
      address: 'Pasaje Deportivo 789',
      city: 'Lima',
      phone: '+51 945 678 123',
      email: 'sur@canchamax.com',
    },
  });

  // Create courts
  const courts = await Promise.all([
    prisma.court.create({
      data: {
        name: 'Cancha Sintética Pro',
        sport: 'futbol',
        description: 'Cancha de fútbol profesional con césped sintético de última generación, iluminación LED y vestuarios completos. Ideal para partidos de 5, 7 u 11 jugadores.',
        branchId: branch1.id,
        images: JSON.stringify([
          'https://lh3.googleusercontent.com/aida/ADBb0ugR1W028dfouFYVkLV8ywXH715szM1noNRjAX27NjZJbSISuwwfcsG6OXBvhpGPNm447Y0fxD3AlUcrHqWNIigbyhb8_DhH7zoaXTTMs5-cvBckeVW9rdWSj4hDNrVXdNzmNGD7mXTNDm3uZEFYighajMVsZxRH-FuyI1GNSeBM_VvVec734cFXJx1aXQQyGao2CWTAGDNAhQwBBVrzBz2WCsSW4zrd9LxTJemAT7MobhTbMPrW9AnLSSs',
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDjVDHNzIdAMhVwEmkn0m6j0jTEHJBBdbEDuemdvXTpV7xyIdcQV5jb3d0pfH0OeqUi5NPAe-82RSxYZ_HnFOusF9icVOg3a5fXN_B7Q4Kq1rg8E8pSIDTNOWr1OiKsrR6So9sOy1Qbv99DDB5mY-TD9ZG7StfdOV9XkEeM5q7GfwkYV_1HoBAAAhAEbjeEnoApczqc8d703zAhJ2L6XYzhoc3iArbCwtemhfcIImmrhx1RtGoxqd7u5iN3xEoUbvxTnXV5aLa-8fjc',
        ]),
        rating: 4.9,
        reviewCount: 128,
        pricePerHour: 45,
        amenities: JSON.stringify(['Wi-Fi', 'Estacionamiento', 'Vestuarios', 'Iluminación LED', 'Duchas', 'Cafetería']),
      },
    }),
    prisma.court.create({
      data: {
        name: 'Coliseo de Voley VIP',
        sport: 'voley',
        description: 'Coliseo profesional de vóley con piso PVC, red FIVV homologada, tribunas para 200 espectadores y sistema de sonido.',
        branchId: branch1.id,
        images: JSON.stringify([
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDA5470OGWpmp_n9u2uhmPJkXVjJa3jyHGB5QXJE86RcW2giEptBZV6vNSBF6be7H90PkkotYRUHmd-mPw-mk2XjrJlfH-aHktPs6isa4SPUE_4veDrPd5LM6gIdXhd2QN4o14ZxYfN4d_PsKZ_YQG-DAvPxYidH0BuLzUqSGJwv8TACldwTKeku4dkebvp3jFWbOlVioZT9b9r6alfgUisim823Qjy3zZIs5NE8eoPy4SCdN_a0BC5Xiw0KRPg1n_IUR2R4D0Ld27j',
        ]),
        rating: 4.8,
        reviewCount: 87,
        pricePerHour: 35,
        amenities: JSON.stringify(['Wi-Fi', 'Estacionamiento', 'Tribunas', 'Sonido', 'Iluminación']),
      },
    }),
    prisma.court.create({
      data: {
        name: 'Salón de Eventos Luxury',
        sport: 'eventos',
        description: 'Espacio versátil para eventos corporativos, torneos y celebraciones. Capacidad para 300 personas con catering completo.',
        branchId: branch1.id,
        images: JSON.stringify([
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBfFiyRwb_rR1S8525jWwAgyypWC8J5H9eeagTeGYBkrjWF7QVTGYD8VaXrfsdIIStep6EkcGXMW8cLSrCria-MF7fEfpa6qnObNeIvqXrzVe8klRKGRJqWB6fyseGAHesOF6RyTJHUFokiEnRBfHaJe23R7gSQ_FLMvqDvw1AjEaJFZUS3bllkp3j9FzZmmZUzn3WlvtGZCSCaPm_A5bnXACJ1TL9M4CTbJJh27nI2aWT4nkkkHgCzqxTmzH_hsMnZdi80sCQ8cUqg',
        ]),
        rating: 5.0,
        reviewCount: 45,
        pricePerHour: 120,
        amenities: JSON.stringify(['Wi-Fi', 'Estacionamiento', 'Catering', 'Sonido', 'Iluminación', 'Proyector', 'A/C']),
      },
    }),
    prisma.court.create({
      data: {
        name: 'Cancha Multiplex Norte',
        sport: 'futbol',
        description: 'Cancha multiuso con césped sintético, perfecta para fútbol 5 y 7. Incluye porterías reglamentarias y marcador electrónico.',
        branchId: branch2.id,
        images: JSON.stringify([
          'https://lh3.googleusercontent.com/aida/ADBb0ugR1W028dfouFYVkLV8ywXH715szM1noNRjAX27NjZJbSISuwwfcsG6OXBvhpGPNm447Y0fxD3AlUcrHqWNIigbyhb8_DhH7zoaXTTMs5-cvBckeVW9rdWSj4hDNrVXdNzmNGD7mXTNDm3uZEFYighajMVsZxRH-FuyI1GNSeBM_VvVec734cFXJx1aXQQyGao2CWTAGDNAhQwBBVrzBz2WCsSW4zrd9LxTJemAT7MobhTbMPrW9AnLSSs',
        ]),
        rating: 4.7,
        reviewCount: 95,
        pricePerHour: 38,
        amenities: JSON.stringify(['Wi-Fi', 'Estacionamiento', 'Vestuarios', 'Marcador', 'Iluminación']),
      },
    }),
    prisma.court.create({
      data: {
        name: 'Pista de Básquet Premium',
        sport: 'basket',
        description: 'Pista profesional de básquet con piso de madera, canastas ajustables y sistema de puntuación digital. Cancha reglamentaria FIBA.',
        branchId: branch2.id,
        images: JSON.stringify([
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDA5470OGWpmp_n9u2uhmPJkXVjJa3jyHGB5QXJE86RcW2giEptBZV6vNSBF6be7H90PkkotYRUHmd-mPw-mk2XjrJlfH-aHktPs6isa4SPUE_4veDrPd5LM6gIdXhd2QN4o14ZxYfN4d_PsKZ_YQG-DAvPxYidH0BuLzUqSGJwv8TACldwTKeku4dkebvp3jFWbOlVioZT9b9r6alfgUisim823Qjy3zZIs5NE8eoPy4SCdN_a0BC5Xiw0KRPg1n_IUR2R4D0Ld27j',
        ]),
        rating: 4.6,
        reviewCount: 62,
        pricePerHour: 50,
        amenities: JSON.stringify(['Wi-Fi', 'Vestuarios', 'Piso madera', 'Canastas FIBA', 'Iluminación']),
      },
    }),
    prisma.court.create({
      data: {
        name: 'Cancha de Tenis Sur',
        sport: 'tenis',
        description: 'Dos canchas de tenis con superficie hard court, iluminación profesional y área de descanso. Clases disponibles.',
        branchId: branch3.id,
        images: JSON.stringify([
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBfFiyRwb_rR1S8525jWwAgyypWC8J5H9eeagTeGYBkrjWF7QVTGYD8VaXrfsdIIStep6EkcGXMW8cLSrCria-MF7fEfpa6qnObNeIvqXrzVe8klRKGRJqWB6fyseGAHesOF6RyTJHUFokiEnRBfHaJe23R7gSQ_FLMvqDvw1AjEaJFZUS3bllkp3j9FzZmmZUzn3WlvtGZCSCaPm_A5bnXACJ1TL9M4CTbJJh27nI2aWT4nkkkHgCzqxTmzH_hsMnZdi80sCQ8cUqg',
        ]),
        rating: 4.9,
        reviewCount: 78,
        pricePerHour: 40,
        amenities: JSON.stringify(['Wi-Fi', 'Estacionamiento', 'Raquetas incluidas', 'Iluminación', 'Área social']),
      },
    }),
    prisma.court.create({
      data: {
        name: 'Arena Fútbol Sur',
        sport: 'futbol',
        description: 'Gran cancha de fútbol 11 con césped natural, gradas para 500 personas y cabinas de transmisión.',
        branchId: branch3.id,
        images: JSON.stringify([
          'https://lh3.googleusercontent.com/aida/ADBb0ugR1W028dfouFYVkLV8ywXH715szM1noNRjAX27NjZJbSISuwwfcsG6OXBvhpGPNm447Y0fxD3AlUcrHqWNIigbyhb8_DhH7zoaXTTMs5-cvBckeVW9rdWSj4hDNrVXdNzmNGD7mXTNDm3uZEFYighajMVsZxRH-FuyI1GNSeBM_VvVec734cFXJx1aXQQyGao2CWTAGDNAhQwBBVrzBz2WCsSW4zrd9LxTJemAT7MobhTbMPrW9AnLSSs',
        ]),
        rating: 4.8,
        reviewCount: 156,
        pricePerHour: 85,
        amenities: JSON.stringify(['Gradas', 'Cabinas TV', 'Estacionamiento', 'Vestuarios', 'Duchas', 'Cafetería']),
      },
    }),
    prisma.court.create({
      data: {
        name: 'Cancha Fútbol Sala Premium',
        sport: 'futbol',
        description: 'Cancha indoor de fútbol sala con piso tarima, climatización y recinto techado. Competencias y torneos disponibles.',
        branchId: branch2.id,
        images: JSON.stringify([
          'https://lh3.googleusercontent.com/aida/ADBb0ugR1W028dfouFYVkLV8ywXH715szM1noNRjAX27NjZJbSISuwwfcsG6OXBvhpGPNm447Y0fxD3AlUcrHqWNIigbyhb8_DhH7zoaXTTMs5-cvBckeVW9rdWSj4hDNrVXdNzmNGD7mXTNDm3uZEFYighajMVsZxRH-FuyI1GNSeBM_VvVec734cFXJx1aXQQyGao2CWTAGDNAhQwBBVrzBz2WCsSW4zrd9LxTJemAT7MobhTbMPrW9AnLSSs',
        ]),
        rating: 4.5,
        reviewCount: 43,
        pricePerHour: 55,
        amenities: JSON.stringify(['Climatización', 'Vestuarios', 'Wi-Fi', 'Cafetería', 'Estacionamiento']),
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

  // Create bookings
  const now = new Date();
  const bookings = await Promise.all([
    prisma.booking.create({
      data: {
        courtId: courts[0].id,
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
    prisma.booking.create({
      data: {
        courtId: courts[1].id,
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
    prisma.booking.create({
      data: {
        courtId: courts[0].id,
        clientId: clients[2].id,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2),
        startTime: '16:00',
        endTime: '17:00',
        totalPrice: 45,
        status: 'confirmed',
        paymentMethod: 'cash',
        paymentStatus: 'pending',
      },
    }),
    prisma.booking.create({
      data: {
        courtId: courts[3].id,
        clientId: clients[0].id,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3),
        startTime: '19:00',
        endTime: '20:30',
        totalPrice: 57,
        status: 'confirmed',
        paymentMethod: 'card',
        paymentStatus: 'paid',
      },
    }),
    prisma.booking.create({
      data: {
        courtId: courts[4].id,
        clientId: clients[1].id,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0),
        startTime: '10:00',
        endTime: '12:00',
        totalPrice: 100,
        status: 'completed',
        paymentMethod: 'card',
        paymentStatus: 'paid',
      },
    }),
    prisma.booking.create({
      data: {
        courtId: courts[5].id,
        clientId: clients[2].id,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
        startTime: '08:00',
        endTime: '09:00',
        totalPrice: 40,
        status: 'completed',
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    }),
    prisma.booking.create({
      data: {
        courtId: courts[6].id,
        clientId: clients[0].id,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
        startTime: '15:00',
        endTime: '17:00',
        totalPrice: 170,
        status: 'completed',
        paymentMethod: 'card',
        paymentStatus: 'paid',
      },
    }),
    prisma.booking.create({
      data: {
        courtId: courts[0].id,
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
  ]);

  // Create payments
  await Promise.all([
    prisma.payment.create({
      data: {
        bookingId: bookings[0].id,
        amount: 45,
        method: 'card',
        status: 'completed',
        externalRef: 'MP-001',
      },
    }),
    prisma.payment.create({
      data: {
        bookingId: bookings[1].id,
        amount: 35,
        method: 'transfer',
        status: 'completed',
        externalRef: 'TR-002',
      },
    }),
    prisma.payment.create({
      data: {
        bookingId: bookings[4].id,
        amount: 100,
        method: 'card',
        status: 'completed',
        externalRef: 'MP-003',
      },
    }),
  ]);

  // Create reviews
  await Promise.all([
    prisma.review.create({
      data: {
        courtId: courts[0].id,
        clientId: clients[0].id,
        rating: 5,
        comment: 'Excelente cancha, césped en perfecto estado. La iluminación es genial para jugar de noche.',
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
        comment: 'Muy buen coliseo de vóley, piso excelente. Se podría mejorar la ventilación.',
      },
    }),
    prisma.review.create({
      data: {
        courtId: courts[2].id,
        clientId: clients[0].id,
        rating: 5,
        comment: 'Usamos el salón para un torneo corporativo. Todo perfecto, el catering excelente.',
      },
    }),
    prisma.review.create({
      data: {
        courtId: courts[5].id,
        clientId: clients[2].id,
        rating: 5,
        comment: 'Las canchas de tenis están impecables. Muy recomendado para jugar con amigos.',
      },
    }),
  ]);

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
