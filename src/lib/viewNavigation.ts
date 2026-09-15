'use client'

// R3 (OLA 2 UX): historial de vistas + borrador de reserva
//
// Problema: la app cambia de vista sin tocar el historial del navegador, así
// que el gesto "atrás" del celular SALÍA del sitio; y el login obligatorio
// descartaba la cancha/hora elegida. Este módulo:
//  1. Mapea las vistas a history API (pushState/popstate) → "atrás" navega
//     internamente como el usuario espera.
//  2. Persiste un BORRADOR de la selección de reserva (canchas, fecha, horas)
//     en sessionStorage y lo restaura al recargar / volver.
// No altera ninguna lógica de Firebase, precios ni reglas de reserva.

import { useAppStore, ViewType } from '@/store/useAppStore'

const DRAFT_KEY = 'creard_booking_draft'

export interface BookingDraft {
  selectedCourtIds: string[]
  selectedDate: string | null
  selectedTimeSlot: string | null
  selectedTimeSlots: string[]
  savedAt: number
}

let installed = false
let suppressPush = false

function readJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function installViewHistory() {
  if (installed || typeof window === 'undefined') return
  installed = true

  // Estado inicial del historial
  try {
    history.replaceState({ view: useAppStore.getState().currentView }, '')
  } catch {
    // history no disponible (p. ej. iframe sandbox) — la app sigue funcionando
  }

  // Cada cambio de vista → pushState; cada cambio de selección → borrador
  useAppStore.subscribe((state, prev) => {
    if (state.currentView !== prev.currentView) {
      if (suppressPush) {
        suppressPush = false
      } else {
        try {
          history.pushState({ view: state.currentView }, '')
        } catch {
          // ignore
        }
      }
    }

    const draftChanged =
      state.selectedCourtIds !== prev.selectedCourtIds ||
      state.selectedDate !== prev.selectedDate ||
      state.selectedTimeSlot !== prev.selectedTimeSlot ||
      state.selectedTimeSlots !== prev.selectedTimeSlots

    if (draftChanged) {
      const draft: BookingDraft = {
        selectedCourtIds: state.selectedCourtIds,
        selectedDate: state.selectedDate,
        selectedTimeSlot: state.selectedTimeSlot,
        selectedTimeSlots: state.selectedTimeSlots,
        savedAt: Date.now(),
      }
      const hasContent =
        draft.selectedCourtIds.length > 0 || draft.selectedTimeSlots.length > 0
      try {
        if (hasContent) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
        else sessionStorage.removeItem(DRAFT_KEY)
      } catch {
        // sessionStorage bloqueado — continuar sin borrador
      }
    }
  })

  // Atrás/adelante del navegador o del celular → vista interna
  window.addEventListener('popstate', (e) => {
    const view = (e.state && (e.state as { view?: ViewType }).view) || 'home'
    suppressPush = true
    useAppStore.getState().setView(view)
  })
}

/** Restaura el borrador de reserva de esta sesión (si existe). */
export function restoreBookingDraft(): boolean {
  if (typeof window === 'undefined') return false
  const draft = readJson<BookingDraft>(sessionStorage.getItem(DRAFT_KEY))
  if (!draft) return false
  const hasContent =
    (draft.selectedCourtIds?.length || 0) > 0 ||
    (draft.selectedTimeSlots?.length || 0) > 0
  if (!hasContent) return false

  const st = useAppStore.getState()
  if (st.selectedCourtIds.length > 0 || st.selectedTimeSlots.length > 0) {
    return false // ya hay una selección activa; no pisar
  }
  st.setSelectedCourtIds(draft.selectedCourtIds || [])
  if (draft.selectedDate) st.setSelectedDate(draft.selectedDate)
  if (draft.selectedTimeSlot) st.setSelectedTimeSlot(draft.selectedTimeSlot)
  if (draft.selectedTimeSlots?.length) st.setSelectedTimeSlots(draft.selectedTimeSlots)
  return true
}
