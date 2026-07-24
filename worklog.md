---
Task ID: 4
Agent: Super Z (main)
Task: Auditoría completa + rediseño del flujo de reservas del usuario

Work Log:
- Auditoría exhaustiva del flujo actual (16 archivos analizados)
- Creado UnifiedBookingView.tsx (~750 líneas) — pantalla única de reservas
- Creado API /api/bookings/group/route.ts — creación atómica de reservas grupales
- Actualizado useAppStore.ts — nuevo ViewType 'booking'
- Actualizado page.tsx — ruta + isFullPage para nueva vista
- Actualizado SearchView.tsx — tabs completos + botón Reservar Cancha
- Botón Reservar Cancha agregado en HomeView
- Build exitoso, commit, push, deploy a Vercel

Stage Summary:
- Nuevo flujo: Home → Reservar Cancha → (canchas + horarios + resumen + pago)
- Multi-cancha: checkboxes sin límite de selección
- Multi-horario: bloques de 1 hora, multi-select
- Disponibilidad en tiempo real desde Firebase
- Solo horarios futuros (regla 30 min de anticipación)
- booking_group_id vincula reservas del grupo
- Panel admin NO modificado (100% compatible)
- Deploy: https://creard.vercel.app/