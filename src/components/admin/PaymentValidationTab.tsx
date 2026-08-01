'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from '@/hooks/use-toast'
import { getAuthHeaders } from '@/lib/auth-helpers'

interface PaymentValidationTabProps {
  onValidationChange?: () => void
}

interface PendingBooking {
  id: string
  user_id: string
  user_email: string | null
  court_id: string
  court_ids?: string[]
  date: string
  start_time: string
  end_time: string
  total_price: number
  advance_amount: number
  remaining_amount?: number
  payment_method: string
  status: string
  remaining_payment_status?: string
  created_at: any
}

interface ValidationRecord {
  id: string
  booking_id: string
  action: string
  observation: string
  validated_by_name: string
  validated_by_role: string
  payment_type?: string
  created_at: any
}

export default function PaymentValidationTab({ onValidationChange }: PaymentValidationTabProps) {
  const [advanceBookings, setAdvanceBookings] = useState<PendingBooking[]>([])
  const [remainingBookings, setRemainingBookings] = useState<PendingBooking[]>([])
  const [history, setHistory] = useState<Record<string, ValidationRecord[]>>({})
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [obsDialog, setObsDialog] = useState<{ bookingId: string; action: string } | null>(null)
  const [observation, setObservation] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      // Fetch payment_pending bookings
      const res = await fetch('/api/payment-validation', { headers })
      const data = await res.json()
      const allBookings: PendingBooking[] = data.bookings || []
      setHistory(data.validationHistory || {})

      // Fetch bookings with remaining_payment_status = 'pending'
      const allRes = await fetch('/api/bookings?dateFrom=2020-01-01&dateTo=2030-12-31', { headers })
      let allUserBookings: any[] = []
      if (allRes.ok) {
        const allData = await allRes.json()
        allUserBookings = Array.isArray(allData) ? allData : []
      }

      // Filter: advance payments have status=payment_pending
      // remaining payments have remaining_payment_status='pending'
      setAdvanceBookings(allBookings.filter((b: any) => b.status === 'payment_pending'))
      setRemainingBookings(allUserBookings.filter((b: any) => b.remaining_payment_status === 'pending' && b.status === 'reserved'))
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar las validaciones', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAction = async (bookingId: string, action: string, obs?: string) => {
    setProcessing(bookingId)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/payment-validation', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, action, observation: obs || '' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({
        title: action === 'validate' ? 'Pago validado' : 'Pago rechazado',
        description: data.message,
      })
      setObsDialog(null)
      setObservation('')
      fetchData()
      onValidationChange?.()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setProcessing(null)
    }
  }

  const fmtDate = (d: string) => {
    const [y, m, day] = d.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, day))
    return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', timeZone: 'America/Lima' })
  }

  const fmtTimestamp = (t: any) => {
    if (!t) return '-'
    const ms = t._seconds ? t._seconds * 1000 : new Date(t).getTime()
    return new Date(ms).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-[#00ff41]/30 border-t-[#00ff41] rounded-full animate-spin" /></div>

  const totalPending = advanceBookings.length + remainingBookings.length

  const renderBookingCard = (b: PendingBooking, isRemaining: boolean) => (
    <div key={b.id} className="glass-card rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">
              {b.court_ids?.length ? `${b.court_ids.length} cancha(s)` : 'Cancha'}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isRemaining ? 'bg-orange-500/20 text-orange-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {isRemaining ? 'Restante' : 'Adelanto'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-cm-on-surface-variant">Usuario: </span>
              <span className="text-cm-on-surface font-medium">{b.user_email || b.user_id?.substring(0, 8)}</span>
            </div>
            <div>
              <span className="text-cm-on-surface-variant">Fecha: </span>
              <span className="text-cm-on-surface font-medium">{fmtDate(b.date)}</span>
            </div>
            <div>
              <span className="text-cm-on-surface-variant">Hora: </span>
              <span className="text-cm-on-surface font-medium">{b.start_time} - {b.end_time}</span>
            </div>
            <div>
              <span className="text-cm-on-surface-variant">Monto: </span>
              <span className="text-[#00ff41] font-bold">S/ {(isRemaining ? b.remaining_amount : b.advance_amount || b.total_price)?.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-[10px] text-cm-on-surface-variant">Metodo: {b.payment_method || 'Yape QR'} · ID: {b.id.substring(0, 10)}...</p>

          {/* Show validation history for this booking */}
          {history[b.id] && history[b.id].length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
              <p className="text-[10px] text-cm-on-surface-variant font-medium">Historial:</p>
              {history[b.id].slice(0, 3).map((h) => (
                <div key={h.id} className="text-[10px] text-cm-on-surface-variant flex items-center gap-2">
                  <span className={h.action === 'validate' ? 'text-green-400' : 'text-red-400'}>
                    {h.action === 'validate' ? 'Validado' : 'Rechazado'}
                  </span>
                  <span>por {h.validated_by_name}</span>
                  <span>{fmtTimestamp(h.created_at)}</span>
                  {h.observation && <span className="italic">- {h.observation}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleAction(b.id, 'validate')}
            disabled={processing === b.id}
            className="px-3 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-semibold hover:bg-green-500/30 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {processing === b.id ? (
              <div className="w-3.5 h-3.5 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[14px]">check</span>
            )}
            Validar
          </button>
          <button
            onClick={() => { setObsDialog({ bookingId: b.id, action: 'reject' }); setObservation('') }}
            disabled={processing === b.id}
            className="px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
            Rechazar
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">Validacion de Pagos</h3>
        <span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full font-medium">
          {totalPending} pendiente{totalPending !== 1 ? 's' : ''}
        </span>
      </div>

      {totalPending === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-cm-on-surface-variant/30 mb-2 block">check_circle</span>
          <p className="text-cm-on-surface-variant text-sm">No hay pagos pendientes de validacion.</p>
        </div>
      ) : (
        <>
          {/* Advance payments section */}
          {advanceBookings.length > 0 && (
            <div className="space-y-3">
              {advanceBookings.length > 0 && remainingBookings.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-amber-400 font-[family-name:var(--font-inter)] uppercase tracking-wider">
                    Adelantos ({advanceBookings.length})
                  </span>
                  <div className="flex-1 h-px bg-amber-500/20" />
                </div>
              )}
              {advanceBookings.map((b) => renderBookingCard(b, false))}
            </div>
          )}

          {/* Remaining payments section */}
          {remainingBookings.length > 0 && (
            <div className="space-y-3">
              {advanceBookings.length > 0 && remainingBookings.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-orange-400 font-[family-name:var(--font-inter)] uppercase tracking-wider">
                    Pagos Restantes ({remainingBookings.length})
                  </span>
                  <div className="flex-1 h-px bg-orange-500/20" />
                </div>
              )}
              {remainingBookings.map((b) => renderBookingCard(b, true))}
            </div>
          )}
        </>
      )}

      {/* Reject observation dialog */}
      {obsDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setObsDialog(null)}>
          <div className="glass-card rounded-2xl p-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h4 className="text-base font-bold text-cm-on-surface font-[family-name:var(--font-sora)] mb-3">Rechazar Pago</h4>
            <p className="text-sm text-cm-on-surface-variant mb-3 font-[family-name:var(--font-inter)]">Agrega una observacion opcional:</p>
            <textarea
              value={observation}
              onChange={e => setObservation(e.target.value)}
              className="w-full h-24 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm p-3 resize-none focus:outline-none focus:border-red-500/50 font-[family-name:var(--font-inter)]"
              placeholder="Motivo del rechazo..."
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setObsDialog(null)} className="px-4 py-2 text-cm-on-surface-variant text-sm hover:text-cm-on-surface transition-colors font-[family-name:var(--font-inter)]">
                Cancelar
              </button>
              <button
                onClick={() => handleAction(obsDialog.bookingId, obsDialog.action, observation)}
                className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-semibold hover:bg-red-500/30 transition-colors font-[family-name:var(--font-inter)]"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
