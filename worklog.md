# CREARD Worklog

---
Task ID: 1
Agent: Main Agent
Task: Auditoría completa del flujo de reservas + rediseño single-screen booking

Work Log:
- Auditoría completa de todos los archivos del flujo de reservas: BookingForm.tsx (910 líneas), CourtDetail.tsx (1168 líneas), bookings/route.ts (1070 líneas), useAppStore.ts, page.tsx, CulqiPayButton.tsx
- Identificado bug crítico: UnifiedBookingView.tsx importado en page.tsx pero NO EXISTÍA en disco (causaba build error)
- Identificado flujo actual: usuario debe ir a CourtDetail individual → seleccionar horario → BookingForm (múltiples pasos, no multi-cancha)
- Identificado CourtDetail usa intervalos de 30 min (generateTimeSlots con minuteIntervals=[0,30])
- Identificado que la API bookings ya soporta court_ids[] y selectedSlots[]

- Creado UnifiedBookingView.tsx (1063 líneas) — pantalla única de reservas con:
  - Date picker horizontal (14 días)
  - Court selector con checkboxes (6 canchas agrupadas por deporte)
  - Time slot grid con bloques de 1 hora SOLAMENTE (07:00-22:00)
  - Horarios pasados ocultos (basado en hora actual para hoy)
  - Disponibilidad en tiempo real via Firebase (🟢 disponible, 🔴 ocupado, 🔵 seleccionado)
  - Selección por rango automático (click primer slot → click último → llena medio)
  - Deselección individual (click en slot seleccionado)
  - Cálculo de precio por court × slot con pricing schedule (mañana/noche)
  - 4 pasos: select → summary → payment (Culqi) → done
  - Barra inferior fija con total dinámico
  - Validación de datos de contacto antes de enviar
  - Conflict detection con re-verify y refresh de disponibilidad
  - Responsive mobile-first

- Actualizado useAppStore.ts:
  - Nuevo campo: selectedTimeSlots: string[]
  - Nuevas acciones: setSelectedTimeSlots, toggleTimeSlot, clearTimeSlots
  - clearTimeSlots limpia tanto selectedTimeSlots como selectedTimeSlot (legacy)

- NO se modificó: panel admin, superadmin, API de bookings (ya compatible), CourtDetail (aún funciona), BookingForm (aún funciona para flujo legacy desde CourtDetail)

Stage Summary:
- Build exitoso, sin errores
- Archivos creados/modificados: UnifiedBookingView.tsx (nuevo), useAppStore.ts (modificado)
- Compatibilidad admin 100% mantenida
- Listo para deploy