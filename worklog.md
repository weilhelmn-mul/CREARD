---
Task ID: 2
Agent: Main Agent
Task: Implementar reserva manual por admin y registro de adelantos

Work Log:
- Exploró BookingForm.tsx, API /api/bookings (POST), /api/courts, /api/admin/users
- Identificó que admins ya pueden crear reservas para cualquier userId vía API
- Añadió 8 nuevos estados para formulario de reserva y modal de adelanto
- Implementó loadBookingFormData() para obtener usuarios y canchas con precios
- Creó handleBookingFormChange() con auto-cálculo de precio según cancha y horas
- Creó validateBookingForm() con validación de campos requeridos
- Creó handleCreateBooking() que envía POST a /api/bookings
- Añadió botón "Nueva Reserva" (verde, primario) junto a "Ver Horarios"
- Implementó modal completo de nueva reserva con: cancha, cliente, fecha, horas,
  precio total, adelanto, estado inicial, 6 métodos de pago, notas
- Implementó modal de "Registrar Adelanto" para reservas existentes con:
  resumen de la reserva, monto, método de pago, botón completar saldo
- Añadió botón de adelanto (ícono 💰) en los 3 modos de vista (tabla, galería, compacto)
- Commit f48b1e5, push a Vercel exitoso

Stage Summary:
- AdminDashboard.tsx pasó de 1544 a 2119 líneas (+575)
- Funcionalidades nuevas: crear reservas manualmente, registrar adelantos
- Desplegado exitosamente a Vercel
