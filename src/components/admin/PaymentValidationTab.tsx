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
  const [payments, setPayments] = useState<any[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsSearch, setPaymentsSearch] = useState('')
  const [paymentsStatusFilter, setPaymentsStatusFilter] = useState('all')
  const [paymentsCount, setPaymentsCount] = useState(20)

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

  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/payments-list', { headers })
      if (res.ok) {
        const data = await res.json()
        setPayments(Array.isArray(data) ? data : [])
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los pagos', variant: 'destructive' })
    } finally {
      setPaymentsLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchPayments() }, [fetchPayments])

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

  const getTypeLabel = (t: string) => t === 'advance' ? 'Adelanto' : t === 'remaining' ? 'Restante' : t === 'full_payment' ? 'Total' : t
  const getStatusBadge = (s: string) => s === 'completed'
    ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400">Pagado</span>
    : s === 'parcial'
    ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">Parcial</span>
    : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/20 text-gray-400">{s}</span>
  const fmtMoney = (n: number) => `S/ ${n?.toFixed(2) ?? '0.00'}`
  const fmtPayDate = (d: string) => {
    if (!d) return '-'
    const [y, m, day] = d.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, day))
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' })
  }
  const fmtPayTime = (t: string) => t || '-'

  if (loading) return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-[#00ff41]/30 border-t-[#00ff41] rounded-full animate-spin" /></div>

  const totalPending = advanceBookings.length + remainingBookings.length
  const filteredPayments = payments.filter((p: any) => {
    const search = paymentsSearch.toLowerCase()
    const matchSearch = !search
      || (p.payment_id || '').toLowerCase().includes(search)
      || (p.booking_code || '').toLowerCase().includes(search)
    const matchStatus = paymentsStatusFilter === 'all'
      || p.payment_status === paymentsStatusFilter
      || (paymentsStatusFilter === 'parcial' && p.payment_status === 'parcial')
      || (paymentsStatusFilter === 'completed' && p.payment_status === 'completed')
    return matchSearch && matchStatus
  })
  const visiblePayments = filteredPayments.slice(0, paymentsCount)

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



      {/* Payment History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">Historial de Pagos</h3>
            <span className="text-xs bg-[#00ff41]/20 text-[#00ff41] px-2.5 py-1 rounded-full font-medium">
              {filteredPayments.length} registro{filteredPayments.length !== 1 ? 's' : ''}
            </span>
          </div>
          {paymentsLoading && (
            <div className="w-4 h-4 border-2 border-[#00ff41]/30 border-t-[#00ff41] rounded-full animate-spin" />
          )}
        </div>

        {/* Search and filter bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cm-on-surface-variant text-sm">search</span>
            <input
              type="text"
              value={paymentsSearch}
              onChange={e => setPaymentsSearch(e.target.value)}
              placeholder="Buscar por codigo de reserva o ID de pago..."
              className="w-full pl-9 pr-3 py-2 bg-cm-surface-container-highest/60 border border-white/10 rounded-lg text-cm-on-surface text-xs placeholder:text-cm-on-surface-variant/50 focus:outline-none focus:border-[#00ff41]/50 font-[family-name:var(--font-inter)]"
            />
          </div>
          <select
            value={paymentsStatusFilter}
            onChange={e => setPaymentsStatusFilter(e.target.value)}
            className="px-3 py-2 bg-cm-surface-container-highest/60 border border-white/10 rounded-lg text-cm-on-surface text-xs focus:outline-none focus:border-[#00ff41]/50 font-[family-name:var(--font-inter)]"
          >
            <option value="all" className="bg-[#1a1a2e] text-white">Todos</option>
            <option value="parcial" className="bg-[#1a1a2e] text-white">Parcial</option>
            <option value="completed" className="bg-[#1a1a2e] text-white">Pagado</option>
          </select>
        </div>

        {/* Payments table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">ID Pago</th>
                  <th className="text-left p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">Reserva</th>
                  <th className="text-left p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">Usuario</th>
                  <th className="text-left p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">Cancha</th>
                  <th className="text-left p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">Tipo</th>
                  <th className="text-right p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">Monto</th>
                  <th className="text-right p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">Saldo</th>
                  <th className="text-left p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">Metodo</th>
                  <th className="text-left p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">Estado</th>
                  <th className="text-left p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">Fecha</th>
                  <th className="text-left p-3 text-cm-on-surface-variant font-medium font-[family-name:var(--font-inter)]">Hora</th>
                </tr>
              </thead>
              <tbody>
                {paymentsLoading ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-cm-on-surface-variant">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#00ff41]/30 border-t-[#00ff41] rounded-full animate-spin" />
                        Cargando pagos...
                      </div>
                    </td>
                  </tr>
                ) : visiblePayments.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-cm-on-surface-variant text-sm">
                      No se encontraron pagos.
                    </td>
                  </tr>
                ) : (
                  visiblePayments.map((p: any) => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3 text-cm-on-surface font-mono text-[11px]">{p.payment_id}</td>
                      <td className="p-3 text-cm-on-surface font-mono text-[11px]">{p.booking_code}</td>
                      <td className="p-3 text-cm-on-surface text-[11px] max-w-[120px] truncate">{p.user_name || p.user_email || '-'}</td>
                      <td className="p-3 text-cm-on-surface text-[11px] max-w-[100px] truncate">{p.court_name || '-'}</td>
                      <td className="p-3 text-cm-on-surface text-[11px]">{getTypeLabel(p.payment_type)}</td>
                      <td className="p-3 text-[#00ff41] font-semibold text-[11px] text-right">{fmtMoney(p.amount_paid)}</td>
                      <td className="p-3 text-cm-on-surface text-[11px] text-right">{fmtMoney(p.remaining_balance)}</td>
                      <td className="p-3 text-cm-on-surface-variant text-[11px]">{p.payment_method_display || '-'}</td>
                      <td className="p-3 text-[11px]">{getStatusBadge(p.payment_status)}</td>
                      <td className="p-3 text-cm-on-surface text-[11px]">{fmtPayDate(p.payment_date)}</td>
                      <td className="p-3 text-cm-on-surface text-[11px] font-mono">{fmtPayTime(p.payment_time)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredPayments.length > paymentsCount && (
            <div className="p-3 border-t border-white/10 text-center">
              <button
                onClick={() => setPaymentsCount(prev => prev + 20)}
                className="px-4 py-2 bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/20 rounded-lg text-xs font-semibold hover:bg-[#00ff41]/20 transition-colors font-[family-name:var(--font-inter)]"
              >
                Cargar mas ({filteredPayments.length - paymentsCount} restantes)
              </button>
            </div>
          )}
        </div>
      </div>

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
