#!/usr/bin/env python3
"""Rewrite PaymentValidationTab with full payment details, audit trail, evidence support."""
import os

content = r"""'use client'

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
  booking_code?: string
  court_name?: string
  created_at: any
}

interface AuditLog {
  id: string
  action: string
  previous_status?: string
  new_status?: string
  performed_by_name: string
  performed_by_role: string
  details?: string
  observation?: string
  created_at: any
}

interface PaymentRecord {
  id: string
  payment_id?: string
  booking_id: string
  booking_code?: string
  user_name?: string
  user_email?: string
  user_phone?: string | null
  user_document?: string | null
  court_name?: string
  sport?: string
  booking_date?: string
  booking_start_time?: string
  booking_end_time?: string
  payment_type?: string
  amount_paid?: number
  remaining_balance?: number
  total_price?: number
  payment_method_display?: string
  payment_method?: string
  payment_status?: string
  payment_date?: string
  payment_time?: string
  status?: string
  external_ref?: string | null
  created_at?: any
  validated_by?: string
  validated_by_name?: string
  validated_at?: any
  validationRecords?: ValidationRecord[]
  auditLogs?: AuditLog[]
}

// Helpers
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const fmtDate = (d: string) => {
  if (!d) return '-'
  if (d.includes('-')) {
    const p = d.split('-').map(Number)
    return `${p[2]} ${MONTHS_ES[p[1] - 1]} ${p[0]}`
  }
  return d
}
const fmtDateShort = (d: string) => {
  if (!d) return '-'
  if (d.includes('-')) {
    const p = d.split('-').map(Number)
    return `${p[2]} ${MONTHS_ES[p[1] - 1]}`
  }
  return d
}
const fmtTimestamp = (t: any) => {
  if (!t) return '-'
  const ms = t._seconds ? t._seconds * 1000 : (typeof t === 'number' ? t : new Date(t).getTime())
  return new Date(ms).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}
const fmtMoney = (n: number) => `S/ ${(n ?? 0).toFixed(2)}`
const fmtPayDate = (d: string) => {
  if (!d) return '-'
  if (d.includes('/')) {
    const parts = d.split('/')
    if (parts.length === 3) return `${parts[0].padStart(2,'0')}/${parts[1].padStart(2,'0')}/${parts[2]}`
  }
  if (d.includes('-')) {
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }
  return d
}

const getTypeLabel = (t: string) => {
  switch (t) {
    case 'advance': return 'Adelanto (50%)'
    case 'remaining': return 'Pago Restante'
    case 'full_payment': return 'Pago Total (100%)'
    default: return t || '-'
  }
}
const getTypeBadge = (t: string) => {
  switch (t) {
    case 'advance': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">Adelanto</span>
    case 'remaining': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400">Restante</span>
    case 'full_payment': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400">Total</span>
    default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/20 text-gray-400">{t}</span>
  }
}
const getStatusBadge = (s: string) => {
  switch (s) {
    case 'completed': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400">Pagado</span>
    case 'parcial': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">Parcial</span>
    case 'rejected': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400">Rechazado</span>
    case 'pending': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400">Pendiente</span>
    default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/20 text-gray-400">{s || '-'}</span>
  }
}

const getMethodIcon = (m: string) => {
  const method = (m || '').toUpperCase()
  if (method.includes('YAPE')) return <span className="material-symbols-outlined text-purple-400 text-[16px]" style={{fontVariationSettings:'"FILL" 1'}}>phone_iphone</span>
  if (method.includes('PLIN')) return <span className="material-symbols-outlined text-violet-400 text-[16px]">payments</span>
  if (method.includes('CULQI') || method.includes('TARJETA') || method.includes('CARD')) return <span className="material-symbols-outlined text-blue-400 text-[16px]">credit_card</span>
  if (method.includes('EFECTIVO')) return <span className="material-symbols-outlined text-green-400 text-[16px]" style={{fontVariationSettings:'"FILL" 1'}}>paid</span>
  return <span className="material-symbols-outlined text-cm-on-surface-variant text-[16px]">payment</span>
}

const calcDuration = (start?: string, end?: string) => {
  if (!start || !end) return '-'
  const [sh] = start.split(':').map(Number)
  const [eh] = end.split(':').map(Number)
  const diff = eh - sh
  return diff > 0 ? `${diff}h` : '-'
}

const getFinancialStatus = (p: PaymentRecord) => {
  const total = p.total_price || 0
  const paid = p.amount_paid || 0
  const remaining = p.remaining_balance || 0
  if (p.payment_status === 'rejected') return { label: 'Rechazado', color: 'text-red-400', bg: 'bg-red-500/10' }
  if (total > 0 && remaining <= 0.01) return { label: 'Pagado totalmente', color: 'text-green-400', bg: 'bg-green-500/10' }
  if (paid > 0 && remaining > 0) return { label: 'Pagado parcialmente', color: 'text-amber-400', bg: 'bg-amber-500/10' }
  if (p.payment_type === 'advance') return { label: 'Adelanto registrado', color: 'text-blue-400', bg: 'bg-blue-500/10' }
  return { label: 'Pendiente', color: 'text-cm-on-surface-variant', bg: 'bg-white/5' }
}

export default function PaymentValidationTab({ onValidationChange }: PaymentValidationTabProps) {
  const [advanceBookings, setAdvanceBookings] = useState<PendingBooking[]>([])
  const [remainingBookings, setRemainingBookings] = useState<PendingBooking[]>([])
  const [history, setHistory] = useState<Record<string, ValidationRecord[]>>({})
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [obsDialog, setObsDialog] = useState<{ bookingId: string; action: string } | null>(null)
  const [observation, setObservation] = useState('')

  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsSearch, setPaymentsSearch] = useState('')
  const [paymentsStatusFilter, setPaymentsStatusFilter] = useState('all')
  const [paymentsTypeFilter, setPaymentsTypeFilter] = useState('all')
  const [paymentsCount, setPaymentsCount] = useState(20)
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null)
  const [evidenceModal, setEvidenceModal] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/payment-validation', { headers })
      const data = await res.json()
      const allBookings: PendingBooking[] = data.bookings || []
      setHistory(data.validationHistory || {})
      const allRes = await fetch('/api/bookings?dateFrom=2020-01-01&dateTo=2030-12-31', { headers })
      let allUserBookings: any[] = []
      if (allRes.ok) {
        const allData = await allRes.json()
        allUserBookings = Array.isArray(allData) ? allData : []
      }
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
      fetchPayments()
      onValidationChange?.()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setProcessing(null)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-[#00ff41]/30 border-t-[#00ff41] rounded-full animate-spin" /></div>

  const totalPending = advanceBookings.length + remainingBookings.length
  const filteredPayments = payments.filter((p) => {
    const search = paymentsSearch.toLowerCase()
    const matchSearch = !search
      || (p.payment_id || '').toLowerCase().includes(search)
      || (p.booking_code || '').toLowerCase().includes(search)
      || (p.user_name || '').toLowerCase().includes(search)
      || (p.user_email || '').toLowerCase().includes(search)
    const matchStatus = paymentsStatusFilter === 'all' || p.payment_status === paymentsStatusFilter
    const matchType = paymentsTypeFilter === 'all' || p.payment_type === paymentsTypeFilter
    return matchSearch && matchStatus && matchType
  })
  const visiblePayments = filteredPayments.slice(0, paymentsCount)

  const renderPendingCard = (b: PendingBooking, isRemaining: boolean) => (
    <div key={b.id} className="glass-card rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">{b.court_ids?.length ? `${b.court_ids.length} cancha(s)` : 'Cancha'}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isRemaining ? 'bg-orange-500/20 text-orange-400' : 'bg-amber-500/20 text-amber-400'}`}>{isRemaining ? 'Restante' : 'Adelanto'}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div><span className="text-cm-on-surface-variant">Usuario: </span><span className="text-cm-on-surface font-medium">{b.user_email || b.user_id?.substring(0, 8)}</span></div>
            <div><span className="text-cm-on-surface-variant">Fecha: </span><span className="text-cm-on-surface font-medium">{fmtDateShort(b.date)}</span></div>
            <div><span className="text-cm-on-surface-variant">Hora: </span><span className="text-cm-on-surface font-medium">{b.start_time} - {b.end_time}</span></div>
            <div><span className="text-cm-on-surface-variant">Monto: </span><span className="text-[#00ff41] font-bold">S/ {(isRemaining ? b.remaining_amount : b.advance_amount || b.total_price)?.toFixed(2)}</span></div>
          </div>
          <p className="text-[10px] text-cm-on-surface-variant">Metodo: {b.payment_method || 'Yape QR'}</p>
          {history[b.id] && history[b.id].length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
              <p className="text-[10px] text-cm-on-surface-variant font-medium">Historial:</p>
              {history[b.id].slice(0, 3).map((h) => (
                <div key={h.id} className="text-[10px] text-cm-on-surface-variant flex items-center gap-2">
                  <span className={h.action === 'validate' ? 'text-green-400' : 'text-red-400'}>{h.action === 'validate' ? 'Validado' : 'Rechazado'}</span>
                  <span>por {h.validated_by_name}</span>
                  <span>{fmtTimestamp(h.created_at)}</span>
                  {h.observation && <span className="italic">- {h.observation}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => handleAction(b.id, 'validate')} disabled={processing === b.id} className="px-3 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-semibold hover:bg-green-500/30 transition-colors disabled:opacity-50 flex items-center gap-1">
            {processing === b.id ? <div className="w-3.5 h-3.5 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[14px]">check</span>}
            Validar
          </button>
          <button onClick={() => { setObsDialog({ bookingId: b.id, action: 'reject' }); setObservation('') }} disabled={processing === b.id} className="px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">close</span>
            Rechazar
          </button>
        </div>
      </div>
    </div>
  )

  // Detail section component for expanded payment
  const PaymentDetail = ({ p }: { p: PaymentRecord }) => {
    const fin = getFinancialStatus(p)
    const validations = p.validationRecords || []
    const audits = p.auditLogs || []
    const isYapeOrPlin = (p.payment_method || '').toUpperCase().includes('YAPE') || (p.payment_method || '').toUpperCase().includes('PLIN')
    const method = (p.payment_method || '').toUpperCase()
    const methodDisplay = method.includes('YAPE') ? 'Yape' : method.includes('PLIN') ? 'Plin' : method.includes('CULQI') ? 'Culqi' : method.includes('TARJETA') || method.includes('CARD') ? 'Tarjeta' : method.includes('EFECTIVO') ? 'Efectivo' : p.payment_method_display || p.payment_method || '-'

    return (
      <div className="border-t border-white/10 bg-cm-surface-container/30 p-4 space-y-4">
        {/* Section: Payment Info */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="material-symbols-outlined text-[#00ff41] text-[14px]" style={{fontVariationSettings:'"FILL" 1'}}>receipt_long</span>
            <span className="text-[11px] font-bold text-[#00ff41] uppercase tracking-wider font-[family-name:var(--font-sora)]">Informacion del Pago</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <InfoItem label="ID Pago" value={p.payment_id || '-'} mono />
            <InfoItem label="Estado del Pago" value={getStatusBadge(p.payment_status || '')} />
            <InfoItem label="Fecha del Pago" value={fmtPayDate(p.payment_date || '')} />
            <InfoItem label="Hora del Pago" value={p.payment_time || '-'} mono />
            <InfoItem label="Fecha Registro Sistema" value={fmtTimestamp(p.created_at)} />
            <InfoItem label="Metodo de Pago" value={<span className="flex items-center gap-1.5">{getMethodIcon(p.payment_method || '')}<span>{methodDisplay}</span></span>} />
            <InfoItem label="N. Operacion" value={p.external_ref || '-'} mono />
            <InfoItem label="Monto Pagado" value={<span className="text-[#00ff41] font-bold text-sm">{fmtMoney(p.amount_paid || 0)}</span>} />
            <InfoItem label="Moneda" value="PEN (Soles)" />
          </div>
        </div>

        <Separator />

        {/* Section: Booking Info */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="material-symbols-outlined text-blue-400 text-[14px]">calendar_month</span>
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider font-[family-name:var(--font-sora)]">Informacion de la Reserva</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <InfoItem label="Codigo Reserva" value={p.booking_code || '-'} mono />
            <InfoItem label="ID Reserva" value={p.booking_id?.substring(0, 16) + '...' || '-'} mono small />
            <InfoItem label="Fecha Creacion" value={fmtTimestamp(p.created_at)} />
            <InfoItem label="Fecha Alquiler" value={fmtDate(p.booking_date || '')} />
            <InfoItem label="Hora Inicio" value={p.booking_start_time || '-'} mono />
            <InfoItem label="Hora Fin" value={p.booking_end_time || '-'} mono />
            <InfoItem label="Duracion" value={calcDuration(p.booking_start_time, p.booking_end_time)} />
            <InfoItem label="Deporte" value={p.sport || '-'} />
            <InfoItem label="Cancha" value={p.court_name || '-'} />
            <InfoItem label="Precio Total Reserva" value={<span className="font-bold text-sm">{fmtMoney(p.total_price || 0)}</span>} />
          </div>
        </div>

        <Separator />

        {/* Section: Financial Status */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="material-symbols-outlined text-amber-400 text-[14px]" style={{fontVariationSettings:'"FILL" 1'}}>account_balance_wallet</span>
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider font-[family-name:var(--font-sora)]">Estado Financiero</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <InfoItem label="Tipo de Pago" value={getTypeBadge(p.payment_type || '')} />
            <InfoItem label="Total Reserva" value={fmtMoney(p.total_price || 0)} />
            <InfoItem label="Total Pagado" value={<span className="text-green-400 font-semibold">{fmtMoney(p.amount_paid || 0)}</span>} />
            <InfoItem label="Saldo Pendiente" value={<span className={(p.remaining_balance || 0) > 0 ? 'text-orange-400' : 'text-green-400'}>{fmtMoney(p.remaining_balance || 0)}</span>} />
          </div>
          <div className="mt-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${fin.color} ${fin.bg}`}>
              <span className="material-symbols-outlined text-[14px]">{fin.label.includes('total') ? 'check_circle' : fin.label.includes('parcial') ? 'pending' : fin.label.includes('Rechaz') ? 'cancel' : 'schedule'}</span>
              {fin.label}
            </span>
          </div>
        </div>

        <Separator />

        {/* Section: Client Info */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="material-symbols-outlined text-cm-on-surface-variant text-[14px]">person</span>
            <span className="text-[11px] font-bold text-cm-on-surface-variant uppercase tracking-wider font-[family-name:var(--font-sora)]">Informacion del Cliente</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <InfoItem label="Nombre" value={p.user_name || '-'} />
            <InfoItem label="Documento" value={p.user_document || 'No registrado'} />
            <InfoItem label="Correo" value={p.user_email || '-'} />
            <InfoItem label="Telefono" value={p.user_phone || '-'} />
          </div>
        </div>

        <Separator />

        {/* Section: Validation Info */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="material-symbols-outlined text-cyan-400 text-[14px]">verified</span>
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider font-[family-name:var(--font-sora)]">Informacion de Validacion</span>
          </div>
          {validations.length > 0 ? validations.map((v) => (
            <div key={v.id} className="glass-card rounded-lg p-3 mb-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div><span className="text-cm-on-surface-variant">Estado: </span><span className={v.action === 'validate' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>{v.action === 'validate' ? 'Validado' : 'Rechazado'}</span></div>
                <div><span className="text-cm-on-surface-variant">Validador: </span><span className="text-cm-on-surface font-medium">{v.validated_by_name} ({v.validated_by_role})</span></div>
                <div><span className="text-cm-on-surface-variant">Fecha: </span><span className="text-cm-on-surface">{fmtTimestamp(v.created_at)}</span></div>
                {v.booking_code && <div><span className="text-cm-on-surface-variant">Cod. Reserva: </span><span className="text-cm-on-surface font-mono">{v.booking_code}</span></div>}
                {v.court_name && <div><span className="text-cm-on-surface-variant">Cancha: </span><span className="text-cm-on-surface">{v.court_name}</span></div>}
              </div>
              {v.observation && <div className="mt-2 pt-2 border-t border-white/5 text-xs"><span className="text-cm-on-surface-variant">Observacion: </span><span className="text-cm-on-surface italic">{v.observation}</span></div>}
            </div>
          )) : <p className="text-xs text-cm-on-surface-variant">Sin registros de validacion.</p>}
          {p.validated_by_name && <p className="text-[10px] text-cm-on-surface-variant mt-2">Validado por: {p.validated_by_name} - {p.validated_at ? fmtTimestamp(p.validated_at) : '-'}</p>}
        </div>

        {/* Section: Evidence (Yape/Plin) */}
        {isYapeOrPlin && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="material-symbols-outlined text-purple-400 text-[14px]" style={{fontVariationSettings:'"FILL" 1'}}>photo_camera</span>
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider font-[family-name:var(--font-sora)]">Evidencia del Pago</span>
              </div>
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
                <span className="material-symbols-outlined text-3xl text-cm-on-surface-variant/30 block mb-1">image</span>
                <p className="text-xs text-cm-on-surface-variant">No se ha adjuntado comprobante de {methodDisplay}.</p>
                <p className="text-[10px] text-cm-on-surface-variant/50 mt-1">El comprobante se valida via WhatsApp u otro canal.</p>
              </div>
            </div>
          </>
        )}

        {/* Section: Audit Trail */}
        {audits.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="material-symbols-outlined text-emerald-400 text-[14px]">history</span>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider font-[family-name:var(--font-sora)]">Auditoria y Trazabilidad</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {audits.map((a) => {
                  const actionLabel = a.action === 'validate' ? 'Validacion' : a.action === 'reject' ? 'Rechazo' : a.action === 'created' ? 'Creacion' : a.action === 'status_change' ? 'Cambio Estado' : a.action
                  const actionColor = a.action === 'validate' ? 'text-green-400' : a.action === 'reject' ? 'text-red-400' : 'text-cm-on-surface-variant'
                  return (
                    <div key={a.id} className="flex items-start gap-2 text-[11px]">
                      <span className={`material-symbols-outlined text-[14px] mt-0.5 ${actionColor}`}>{a.action === 'validate' ? 'check_circle' : a.action === 'reject' ? 'cancel' : 'info'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold ${actionColor}`}>{actionLabel}</span>
                          {a.previous_status && <span className="text-cm-on-surface-variant">{a.previous_status} → {a.new_status}</span>}
                          <span className="text-cm-on-surface-variant">·</span>
                          <span className="text-cm-on-surface-variant">{a.performed_by_name} ({a.performed_by_role})</span>
                        </div>
                        {a.details && <p className="text-cm-on-surface-variant/70 mt-0.5">{a.details}</p>}
                        {(a.observation || (a.action === 'reject')) && <p className="text-cm-on-surface-variant/70 italic mt-0.5">{a.observation || ''}</p>}
                        <p className="text-cm-on-surface-variant/50 mt-0.5">{fmtTimestamp(a.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">Validacion de Pagos</h3>
        <span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full font-medium">{totalPending} pendiente{totalPending !== 1 ? 's' : ''}</span>
      </div>

      {totalPending === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-cm-on-surface-variant/30 mb-2 block">check_circle</span>
          <p className="text-cm-on-surface-variant text-sm">No hay pagos pendientes de validacion.</p>
        </div>
      ) : (
        <>
          {advanceBookings.length > 0 && (
            <div className="space-y-3">
              {advanceBookings.length > 0 && remainingBookings.length > 0 && (
                <div className="flex items-center gap-2"><span className="text-xs font-semibold text-amber-400 font-[family-name:var(--font-inter)] uppercase tracking-wider">Adelantos ({advanceBookings.length})</span><div className="flex-1 h-px bg-amber-500/20" /></div>
              )}
              {advanceBookings.map((b) => renderPendingCard(b, false))}
            </div>
          )}
          {remainingBookings.length > 0 && (
            <div className="space-y-3">
              {advanceBookings.length > 0 && remainingBookings.length > 0 && (
                <div className="flex items-center gap-2"><span className="text-xs font-semibold text-orange-400 font-[family-name:var(--font-inter)] uppercase tracking-wider">Pagos Restantes ({remainingBookings.length})</span><div className="flex-1 h-px bg-orange-500/20" /></div>
              )}
              {remainingBookings.map((b) => renderPendingCard(b, true))}
            </div>
          )}
        </>
      )}

      {/* Payment History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">Historial de Pagos</h3>
            <span className="text-xs bg-[#00ff41]/20 text-[#00ff41] px-2.5 py-1 rounded-full font-medium">{filteredPayments.length} registro{filteredPayments.length !== 1 ? 's' : ''}</span>
          </div>
          {paymentsLoading && <div className="w-4 h-4 border-2 border-[#00ff41]/30 border-t-[#00ff41] rounded-full animate-spin" />}
        </div>

        {/* Search and filter bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cm-on-surface-variant text-sm">search</span>
            <input type="text" value={paymentsSearch} onChange={e => setPaymentsSearch(e.target.value)} placeholder="Buscar por ID pago, reserva, nombre o correo..." className="w-full pl-9 pr-3 py-2 bg-cm-surface-container-highest/60 border border-white/10 rounded-lg text-cm-on-surface text-xs placeholder:text-cm-on-surface-variant/50 focus:outline-none focus:border-[#00ff41]/50 font-[family-name:var(--font-inter)]" />
          </div>
          <select value={paymentsStatusFilter} onChange={e => setPaymentsStatusFilter(e.target.value)} className="px-3 py-2 bg-cm-surface-container-highest/60 border border-white/10 rounded-lg text-cm-on-surface text-xs focus:outline-none focus:border-[#00ff41]/50 font-[family-name:var(--font-inter)]">
            <option value="all" className="bg-[#1a1a2e] text-white">Todos los estados</option>
            <option value="completed" className="bg-[#1a1a2e] text-white">Pagado</option>
            <option value="parcial" className="bg-[#1a1a2e] text-white">Parcial</option>
            <option value="rejected" className="bg-[#1a1a2e] text-white">Rechazado</option>
            <option value="pending" className="bg-[#1a1a2e] text-white">Pendiente</option>
          </select>
          <select value={paymentsTypeFilter} onChange={e => setPaymentsTypeFilter(e.target.value)} className="px-3 py-2 bg-cm-surface-container-highest/60 border border-white/10 rounded-lg text-cm-on-surface text-xs focus:outline-none focus:border-[#00ff41]/50 font-[family-name:var(--font-inter)]">
            <option value="all" className="bg-[#1a1a2e] text-white">Todos los tipos</option>
            <option value="advance" className="bg-[#1a1a2e] text-white">Adelanto</option>
            <option value="remaining" className="bg-[#1a1a2e] text-white">Restante</option>
            <option value="full_payment" className="bg-[#1a1a2e] text-white">Pago Total</option>
          </select>
        </div>

        {/* Payments list */}
        <div className="glass-card rounded-xl overflow-hidden">
          {paymentsLoading ? (
            <div className="p-12 text-center text-cm-on-surface-variant"><div className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-[#00ff41]/30 border-t-[#00ff41] rounded-full animate-spin" />Cargando pagos...</div></div>
          ) : visiblePayments.length === 0 ? (
            <div className="p-12 text-center text-cm-on-surface-variant text-sm">No se encontraron pagos.</div>
          ) : (
            <div>
              {visiblePayments.map((p) => {
                const isExpanded = expandedPayment === p.id
                const fin = getFinancialStatus(p)
                return (
                  <div key={p.id} className={isExpanded ? 'bg-[#00ff41]/[0.03]' : ''}>
                    <button onClick={() => setExpandedPayment(isExpanded ? null : p.id)} className="w-full text-left p-3 sm:p-4 hover:bg-white/5 transition-colors border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-[16px] text-cm-on-surface-variant transition-transform ${isExpanded ? 'rotate-90' : ''}`}>chevron_right</span>
                        <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-1">
                          <div className="min-w-0"><p className="text-[10px] text-cm-on-surface-variant">ID Pago</p><p className="text-xs text-cm-on-surface font-mono font-medium truncate">{p.payment_id || '-'}</p></div>
                          <div className="min-w-0"><p className="text-[10px] text-cm-on-surface-variant">Reserva</p><p className="text-xs text-cm-on-surface font-mono truncate">{p.booking_code || '-'}</p></div>
                          <div className="min-w-0 hidden sm:block"><p className="text-[10px] text-cm-on-surface-variant">Usuario</p><p className="text-xs text-cm-on-surface truncate">{p.user_name || p.user_email || '-'}</p></div>
                          <div className="min-w-0 hidden lg:block"><p className="text-[10px] text-cm-on-surface-variant">Cancha</p><p className="text-xs text-cm-on-surface truncate">{p.court_name || '-'}</p></div>
                          <div className="hidden sm:flex items-center gap-2"><div><p className="text-[10px] text-cm-on-surface-variant">Tipo</p><div className="flex items-center gap-1">{getTypeBadge(p.payment_type || '')}{getStatusBadge(p.payment_status || '')}</div></div></div>
                          <div className="text-right"><p className="text-[10px] text-cm-on-surface-variant">Monto</p><p className="text-xs text-[#00ff41] font-bold">{fmtMoney(p.amount_paid || 0)}</p></div>
                        </div>
                      </div>
                    </button>
                    {isExpanded && <PaymentDetail p={p} />}
                  </div>
                )
              })}
            </div>
          )}
          {filteredPayments.length > paymentsCount && (
            <div className="p-3 border-t border-white/10 text-center">
              <button onClick={() => setPaymentsCount(prev => prev + 20)} className="px-4 py-2 bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/20 rounded-lg text-xs font-semibold hover:bg-[#00ff41]/20 transition-colors font-[family-name:var(--font-inter)]">Cargar mas ({filteredPayments.length - paymentsCount} restantes)</button>
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
            <textarea value={observation} onChange={e => setObservation(e.target.value)} className="w-full h-24 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm p-3 resize-none focus:outline-none focus:border-red-500/50 font-[family-name:var(--font-inter)]" placeholder="Motivo del rechazo..." />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setObsDialog(null)} className="px-4 py-2 text-cm-on-surface-variant text-sm hover:text-cm-on-surface transition-colors font-[family-name:var(--font-inter)]">Cancelar</button>
              <button onClick={() => handleAction(obsDialog.bookingId, obsDialog.action, observation)} className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-semibold hover:bg-red-500/30 transition-colors font-[family-name:var(--font-inter)]">Confirmar Rechazo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Sub-components
function Separator() {
  return <div className="border-t border-dashed border-white/10 my-1" />
}

function InfoItem({ label, value, mono, small }: { label: string; value: React.ReactNode; mono?: boolean; small?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-cm-on-surface-variant mb-0.5 font-[family-name:var(--font-inter)]">{label}</p>
      <p className={`text-xs text-cm-on-surface ${mono ? 'font-mono' : ''} ${small ? 'text-[10px]' : ''} font-[family-name:var(--font-inter)]`}>{value}</p>
    </div>
  )
}
"""

filepath = '/home/z/my-project/src/components/admin/PaymentValidationTab.tsx'
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print(f'Written: {filepath}')
print(f'Size: {len(content)} bytes, {content.count(chr(10))} lines')
