#!/usr/bin/env python3
"""Rewrite PaymentValidationTab.tsx with comprehensive info per the user's spec."""

import os

TARGET = "/home/z/my-project/src/components/admin/PaymentValidationTab.tsx"

CONTENT = r"""'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from '@/hooks/use-toast'
import { getAuthHeaders } from '@/lib/auth-helpers'

// ============================================================
// INTERFACES
// ============================================================

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
  rejection_reason?: string
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
  court_names?: string
  sport?: string
  booking_date?: string
  booking_start_time?: string
  booking_end_time?: string
  payment_type?: string
  amount_paid?: number
  remaining_balance?: number
  total_price?: number
  percentage_paid?: number
  payment_method_display?: string
  payment_method?: string
  payment_status?: string
  payment_date?: string
  payment_time?: string
  status?: string
  external_ref?: string | null
  created_at?: any
  booking_created_at?: any
  validated_by?: string
  validated_by_name?: string
  validated_at?: any
  validationRecords?: ValidationRecord[]
  auditLogs?: AuditLog[]
  latestValidation?: ValidationRecord | null
  rejection_reason?: string
  booking_status?: string
  booking_notes?: string
  booking_payment_method?: string
}

// ============================================================
// HELPERS
// ============================================================

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
  return new Date(ms).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  })
}

const fmtTimeOnly = (t: any) => {
  if (!t) return '-'
  const ms = t._seconds ? t._seconds * 1000 : (typeof t === 'number' ? t : new Date(t).getTime())
  return new Date(ms).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  })
}

const fmtDateOnly = (t: any) => {
  if (!t) return '-'
  const ms = t._seconds ? t._seconds * 1000 : (typeof t === 'number' ? t : new Date(t).getTime())
  return new Date(ms).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
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
    case 'remaining': return 'Pago del Saldo'
    case 'full_payment': return 'Pago Total'
    case 'complementary': return 'Pago Complementario'
    default: return t || '-'
  }
}

const getTypeBadge = (t: string) => {
  switch (t) {
    case 'advance': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">Adelanto</span>
    case 'remaining': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400">Saldo</span>
    case 'full_payment': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400">Total</span>
    case 'complementary': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400">Complementario</span>
    default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/20 text-gray-400">{t || '-'}</span>
  }
}

const getStatusBadge = (s: string) => {
  switch (s) {
    case 'completed': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400">Validado</span>
    case 'parcial': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">Parcial</span>
    case 'rejected': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400">Rechazado</span>
    case 'pending': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400">Pendiente</span>
    case 'failed': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400">Fallido</span>
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

const getMethodDisplay = (p: PaymentRecord) => {
  const m = (p.payment_method || '').toUpperCase()
  if (m.includes('YAPE')) return 'Yape'
  if (m.includes('PLIN')) return 'Plin'
  if (m.includes('CULQI')) return 'Culqi (Tarjeta)'
  if (m.includes('TARJETA') || m.includes('CARD')) return 'Tarjeta'
  if (m.includes('EFECTIVO')) return 'Efectivo'
  return p.payment_method_display || p.payment_method || '-'
}

const calcDuration = (start?: string, end?: string) => {
  if (!start || !end) return '-'
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diffMin = (eh * 60 + em) - (sh * 60 + sm)
  if (diffMin <= 0) return '-'
  const h = Math.floor(diffMin / 60)
  const m = diffMin % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

const getFinancialStatus = (p: PaymentRecord) => {
  const total = p.total_price || 0
  const paid = p.amount_paid || 0
  const remaining = p.remaining_balance ?? (total - paid)
  if (p.payment_status === 'rejected') return { label: 'Rechazado', color: 'text-red-400', bg: 'bg-red-500/10', icon: 'cancel' }
  if (p.payment_status === 'failed') return { label: 'Fallido', color: 'text-red-400', bg: 'bg-red-500/10', icon: 'error' }
  if (total > 0 && remaining <= 0.01) return { label: 'Pagado completamente', color: 'text-green-400', bg: 'bg-green-500/10', icon: 'check_circle' }
  if (paid > 0 && remaining > 0 && paid < total) return { label: 'Pago parcial', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: 'pending' }
  if (p.payment_type === 'advance' && paid > 0) return { label: 'Adelanto registrado', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: 'schedule' }
  return { label: 'Pendiente', color: 'text-cm-on-surface-variant', bg: 'bg-white/5', icon: 'schedule' }
}

const isYapeOrPlin = (p: PaymentRecord) => {
  const m = (p.payment_method || '').toUpperCase()
  return m.includes('YAPE') || m.includes('PLIN')
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function Separator() {
  return <div className="border-t border-dashed border-white/10 my-1" />
}

function InfoItem({ label, value, mono, small }: { label: string; value: React.ReactNode; mono?: boolean; small?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-cm-on-surface-variant mb-0.5 font-[family-name:var(--font-inter)]">{label}</p>
      <p className={`text-xs text-cm-on-surface ${mono ? 'font-mono' : ''} ${small ? 'text-[10px]' : ''} font-[family-name:var(--font-inter)] break-all`}>{value}</p>
    </div>
  )
}

function SectionHeader({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <span className={`material-symbols-outlined ${color} text-[14px]`} style={icon === 'receipt_long' || icon === 'account_balance_wallet' ? {fontVariationSettings:'"FILL" 1'} : {}}>{icon}</span>
      <span className={`text-[11px] font-bold ${color} uppercase tracking-wider font-[family-name:var(--font-sora)]`}>{label}</span>
    </div>
  )
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <span className="text-[11px] font-mono text-cm-on-surface-variant w-10 text-right">{value}%</span>
    </div>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

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
  const [paymentsMethodFilter, setPaymentsMethodFilter] = useState('all')
  const [paymentsCount, setPaymentsCount] = useState(20)
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null)
  const [evidenceModal, setEvidenceModal] = useState<string | null>(null)

  // ----------------------------------------------------------
  // DATA FETCHING
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // ACTIONS
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // LOADING STATE
  // ----------------------------------------------------------
  if (loading) return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-[#00ff41]/30 border-t-[#00ff41] rounded-full animate-spin" /></div>

  const totalPending = advanceBookings.length + remainingBookings.length

  // ----------------------------------------------------------
  // FILTERS
  // ----------------------------------------------------------
  const filteredPayments = payments.filter((p) => {
    const search = paymentsSearch.toLowerCase()
    const matchSearch = !search
      || (p.payment_id || '').toLowerCase().includes(search)
      || (p.booking_code || '').toLowerCase().includes(search)
      || (p.booking_id || '').toLowerCase().includes(search)
      || (p.user_name || '').toLowerCase().includes(search)
      || (p.user_email || '').toLowerCase().includes(search)
      || (p.user_document || '').toLowerCase().includes(search)
      || (p.external_ref || '').toLowerCase().includes(search)
      || (p.court_name || '').toLowerCase().includes(search)
    const matchStatus = paymentsStatusFilter === 'all' || p.payment_status === paymentsStatusFilter
    const matchType = paymentsTypeFilter === 'all' || p.payment_type === paymentsTypeFilter
    const matchMethod = paymentsMethodFilter === 'all' || (p.payment_method || '').toUpperCase().includes(paymentsMethodFilter.toUpperCase())
    return matchSearch && matchStatus && matchType && matchMethod
  })
  const visiblePayments = filteredPayments.slice(0, paymentsCount)

  // ----------------------------------------------------------
  // PENDING PAYMENT CARDS (top section)
  // ----------------------------------------------------------
  const renderPendingCard = (b: PendingBooking, isRemaining: boolean) => (
    <div key={b.id} className="glass-card rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">{b.court_ids?.length ? `${b.court_ids.length} cancha(s)` : 'Cancha'}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isRemaining ? 'bg-orange-500/20 text-orange-400' : 'bg-amber-500/20 text-amber-400'}`}>{isRemaining ? 'Saldo Pendiente' : 'Adelanto Pendiente'}</span>
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

  // ----------------------------------------------------------
  // EXPANDED PAYMENT DETAIL
  // ----------------------------------------------------------
  const PaymentDetail = ({ p }: { p: PaymentRecord }) => {
    const fin = getFinancialStatus(p)
    const validations = p.validationRecords || []
    const audits = p.auditLogs || []
    const methodDisplay = getMethodDisplay(p)
    const hasEvidence = isYapeOrPlin(p)
    const pctPaid = p.percentage_paid ?? (p.total_price && p.total_price > 0 ? Math.round(((p.amount_paid || 0) / p.total_price) * 100) : 0)

    return (
      <div className="border-t border-white/10 bg-cm-surface-container/30 p-4 space-y-4">

        {/* === 1. Informacion General === */}
        <div>
          <SectionHeader icon="info" label="Informacion General" color="text-cm-on-surface-variant" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <InfoItem label="ID del Pago" value={p.payment_id || '-'} mono />
            <InfoItem label="ID de la Reserva" value={p.booking_code || p.booking_id?.substring(0, 16) + '...' || '-'} mono small />
            <InfoItem label="Estado del Pago" value={getStatusBadge(p.payment_status || '')} />
            <InfoItem label="Tipo de Pago" value={getTypeBadge(p.payment_type || '')} />
          </div>
        </div>

        <Separator />

        {/* === 2. Informacion del Usuario === */}
        <div>
          <SectionHeader icon="person" label="Informacion del Usuario" color="text-cm-on-surface-variant" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <InfoItem label="Nombre Completo" value={p.user_name || 'No registrado'} />
            <InfoItem label="Correo Electronico" value={p.user_email || 'No registrado'} />
            <InfoItem label="Telefono" value={p.user_phone || 'No registrado'} />
            <InfoItem label="Documento de Identidad" value={p.user_document || 'No registrado'} />
          </div>
        </div>

        <Separator />

        {/* === 3. Informacion de la Reserva === */}
        <div>
          <SectionHeader icon="calendar_month" label="Informacion de la Reserva" color="text-blue-400" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <InfoItem label="Codigo Reserva" value={p.booking_code || '-'} mono />
            <InfoItem label="Cancha(s) Reservada(s)" value={p.court_names || p.court_name || '-'} />
            <InfoItem label="Tipo de Deporte" value={p.sport || '-'} />
            <InfoItem label="Fecha del Alquiler" value={fmtDate(p.booking_date || '')} />
            <InfoItem label="Hora de Inicio" value={p.booking_start_time || '-'} mono />
            <InfoItem label="Hora de Finalizacion" value={p.booking_end_time || '-'} mono />
            <InfoItem label="Duracion" value={calcDuration(p.booking_start_time, p.booking_end_time)} />
            <InfoItem label="Fecha de Creacion de Reserva" value={p.booking_created_at ? fmtDateOnly(p.booking_created_at) : (p.created_at ? fmtDateOnly(p.created_at) : '-')} />
            <InfoItem label="Hora de Creacion de Reserva" value={p.booking_created_at ? fmtTimeOnly(p.booking_created_at) : (p.created_at ? fmtTimeOnly(p.created_at) : '-')} />
          </div>
        </div>

        <Separator />

        {/* === 4. Informacion del Pago Realizado === */}
        <div>
          <SectionHeader icon="receipt_long" label="Informacion del Pago Realizado" color="text-[#00ff41]" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <InfoItem label="Fecha del Pago" value={fmtPayDate(p.payment_date || '')} />
            <InfoItem label="Hora del Pago" value={p.payment_time || '-'} mono />
            <InfoItem label="Fecha/Hora Registro en Sistema" value={fmtTimestamp(p.created_at)} />
            <InfoItem label="Metodo de Pago" value={<span className="flex items-center gap-1.5">{getMethodIcon(p.payment_method || '')}<span>{methodDisplay}</span></span>} />
            <InfoItem label="ID / Codigo de Transaccion" value={p.payment_id || '-'} mono />
            <InfoItem label="Numero de Operacion" value={p.external_ref || 'No registrado'} mono />
            <InfoItem label="Monto Pagado" value={<span className="text-[#00ff41] font-bold text-sm">{fmtMoney(p.amount_paid || 0)}</span>} />
            <InfoItem label="Moneda" value="PEN (Soles)" />
          </div>
        </div>

        <Separator />

        {/* === 5. Estado Financiero === */}
        <div>
          <SectionHeader icon="account_balance_wallet" label="Estado Financiero" color="text-amber-400" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <InfoItem label="Precio Total de la Reserva" value={<span className="font-bold text-sm">{fmtMoney(p.total_price || 0)}</span>} />
            <InfoItem label="Monto Abonado" value={<span className="text-green-400 font-semibold">{fmtMoney(p.amount_paid || 0)}</span>} />
            <InfoItem label="Saldo Pendiente" value={<span className={(p.remaining_balance ?? (p.total_price || 0) - (p.amount_paid || 0)) > 0 ? 'text-orange-400 font-semibold' : 'text-green-400'}>{fmtMoney(p.remaining_balance ?? (p.total_price || 0) - (p.amount_paid || 0))}</span>} />
            <InfoItem label="Porcentaje Cancelado" value={
              <div className="space-y-1">
                <ProgressBar value={pctPaid} color={pctPaid >= 100 ? 'bg-green-500' : pctPaid >= 50 ? 'bg-amber-500' : 'bg-red-500'} />
              </div>
            } />
          </div>
          <div className="mt-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${fin.color} ${fin.bg}`}>
              <span className="material-symbols-outlined text-[14px]">{fin.icon}</span>
              {fin.label}
            </span>
          </div>
        </div>

        <Separator />

        {/* === 6. Validacion Administrativa === */}
        <div>
          <SectionHeader icon="verified" label="Validacion Administrativa" color="text-cyan-400" />
          {validations.length > 0 ? validations.map((v) => (
            <div key={v.id} className="glass-card rounded-lg p-3 mb-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                <div><span className="text-cm-on-surface-variant">Estado: </span><span className={v.action === 'validate' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>{v.action === 'validate' ? 'Validado' : 'Rechazado'}</span></div>
                <div><span className="text-cm-on-surface-variant">Validador: </span><span className="text-cm-on-surface font-medium">{v.validated_by_name} ({v.validated_by_role})</span></div>
                <div><span className="text-cm-on-surface-variant">Fecha Validacion: </span><span className="text-cm-on-surface">{fmtDateOnly(v.created_at)}</span></div>
                <div><span className="text-cm-on-surface-variant">Hora Validacion: </span><span className="text-cm-on-surface font-mono">{fmtTimeOnly(v.created_at)}</span></div>
                {v.booking_code && <div><span className="text-cm-on-surface-variant">Cod. Reserva: </span><span className="text-cm-on-surface font-mono">{v.booking_code}</span></div>}
                {v.court_name && <div><span className="text-cm-on-surface-variant">Cancha: </span><span className="text-cm-on-surface">{v.court_name}</span></div>}
              </div>
              {v.observation && <div className="mt-2 pt-2 border-t border-white/5 text-xs"><span className="text-cm-on-surface-variant">Observacion del Admin: </span><span className="text-cm-on-surface italic">{v.observation}</span></div>}
            </div>
          )) : <p className="text-xs text-cm-on-surface-variant">Sin registros de validacion.</p>}
          {p.validated_by_name && !validations.length && (
            <p className="text-xs text-cm-on-surface-variant mt-1">Validado por: {p.validated_by_name} - {p.validated_at ? fmtTimestamp(p.validated_at) : '-'}</p>
          )}
          {p.rejection_reason && (
            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-[10px] text-red-400 font-semibold mb-0.5">Motivo del Rechazo:</p>
              <p className="text-xs text-red-300">{p.rejection_reason}</p>
            </div>
          )}
        </div>

        {/* === 7. Evidencia del Pago === */}
        {hasEvidence && (
          <>
            <Separator />
            <div>
              <SectionHeader icon="photo_camera" label="Evidencia del Pago" color="text-purple-400" />
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
                <span className="material-symbols-outlined text-3xl text-cm-on-surface-variant/30 block mb-1">image</span>
                <p className="text-xs text-cm-on-surface-variant">Comprobante de {methodDisplay} validado via WhatsApp u otro canal.</p>
                <p className="text-[10px] text-cm-on-surface-variant/50 mt-1">La evidencia se gestiona de forma externa al sistema.</p>
              </div>
            </div>
          </>
        )}

        {/* === 8. Auditoria y Trazabilidad === */}
        {audits.length > 0 && (
          <>
            <Separator />
            <div>
              <SectionHeader icon="history" label="Auditoria y Trazabilidad" color="text-emerald-400" />
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {audits.map((a) => {
                  const actionLabel = a.action === 'validate' ? 'Validacion' : a.action === 'reject' ? 'Rechazo' : a.action === 'created' ? 'Creacion del Pago' : a.action === 'status_change' ? 'Cambio de Estado' : a.action === 'registered' ? 'Registro en Sistema' : a.action
                  const actionColor = a.action === 'validate' ? 'text-green-400' : a.action === 'reject' ? 'text-red-400' : a.action === 'created' ? 'text-blue-400' : 'text-cm-on-surface-variant'
                  const actionIcon = a.action === 'validate' ? 'check_circle' : a.action === 'reject' ? 'cancel' : a.action === 'created' ? 'add_circle' : 'info'
                  return (
                    <div key={a.id} className="flex items-start gap-2 text-[11px]">
                      <span className={`material-symbols-outlined text-[14px] mt-0.5 ${actionColor}`}>{actionIcon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold ${actionColor}`}>{actionLabel}</span>
                          {a.previous_status && <span className="text-cm-on-surface-variant">{a.previous_status} <span className="text-cm-on-surface-variant/40">&#8594;</span> {a.new_status}</span>}
                          <span className="text-cm-on-surface-variant/40">|</span>
                          <span className="text-cm-on-surface-variant">{a.performed_by_name} ({a.performed_by_role})</span>
                        </div>
                        {a.details && <p className="text-cm-on-surface-variant/70 mt-0.5">{a.details}</p>}
                        {(a.observation || (a.action === 'reject' && a.rejection_reason)) && <p className="text-cm-on-surface-variant/70 italic mt-0.5">{a.observation || a.rejection_reason || ''}</p>}
                        <p className="text-cm-on-surface-variant/40 mt-0.5 font-mono text-[10px]">{fmtTimestamp(a.created_at)}</p>
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

  // ----------------------------------------------------------
  // MAIN RENDER
  // ----------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">Validacion de Pagos</h3>
        <span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full font-medium">{totalPending} pendiente{totalPending !== 1 ? 's' : ''}</span>
      </div>

      {/* Pending payments section */}
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

      {/* --------------------------------------------------------
          PAYMENT HISTORY TABLE
          -------------------------------------------------------- */}
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
            <input type="text" value={paymentsSearch} onChange={e => setPaymentsSearch(e.target.value)} placeholder="Buscar por ID pago, reserva, nombre, correo, DNI, operacion..." className="w-full pl-9 pr-3 py-2 bg-cm-surface-container-highest/60 border border-white/10 rounded-lg text-cm-on-surface text-xs placeholder:text-cm-on-surface-variant/50 focus:outline-none focus:border-[#00ff41]/50 font-[family-name:var(--font-inter)]" />
          </div>
          <select value={paymentsStatusFilter} onChange={e => setPaymentsStatusFilter(e.target.value)} className="px-3 py-2 bg-cm-surface-container-highest/60 border border-white/10 rounded-lg text-cm-on-surface text-xs focus:outline-none focus:border-[#00ff41]/50 font-[family-name:var(--font-inter)]">
            <option value="all" className="bg-[#1a1a2e] text-white">Todos los estados</option>
            <option value="completed" className="bg-[#1a1a2e] text-white">Validado</option>
            <option value="pending" className="bg-[#1a1a2e] text-white">Pendiente</option>
            <option value="parcial" className="bg-[#1a1a2e] text-white">Parcial</option>
            <option value="rejected" className="bg-[#1a1a2e] text-white">Rechazado</option>
            <option value="failed" className="bg-[#1a1a2e] text-white">Fallido</option>
          </select>
          <select value={paymentsTypeFilter} onChange={e => setPaymentsTypeFilter(e.target.value)} className="px-3 py-2 bg-cm-surface-container-highest/60 border border-white/10 rounded-lg text-cm-on-surface text-xs focus:outline-none focus:border-[#00ff41]/50 font-[family-name:var(--font-inter)]">
            <option value="all" className="bg-[#1a1a2e] text-white">Todos los tipos</option>
            <option value="advance" className="bg-[#1a1a2e] text-white">Adelanto (50%)</option>
            <option value="remaining" className="bg-[#1a1a2e] text-white">Pago del Saldo</option>
            <option value="full_payment" className="bg-[#1a1a2e] text-white">Pago Total</option>
            <option value="complementary" className="bg-[#1a1a2e] text-white">Complementario</option>
          </select>
          <select value={paymentsMethodFilter} onChange={e => setPaymentsMethodFilter(e.target.value)} className="px-3 py-2 bg-cm-surface-container-highest/60 border border-white/10 rounded-lg text-cm-on-surface text-xs focus:outline-none focus:border-[#00ff41]/50 font-[family-name:var(--font-inter)]">
            <option value="all" className="bg-[#1a1a2e] text-white">Todos los metodos</option>
            <option value="YAPE" className="bg-[#1a1a2e] text-white">Yape</option>
            <option value="PLIN" className="bg-[#1a1a2e] text-white">Plin</option>
            <option value="CULQI" className="bg-[#1a1a2e] text-white">Culqi</option>
            <option value="EFECTIVO" className="bg-[#1a1a2e] text-white">Efectivo</option>
          </select>
        </div>

        {/* Table header (desktop) */}
        <div className="glass-card rounded-xl overflow-hidden">
          {/* Desktop table header */}
          <div className="hidden lg:grid lg:grid-cols-11 gap-1 px-4 py-2.5 bg-cm-surface-container-highest/40 border-b border-white/10 text-[10px] font-bold text-cm-on-surface-variant uppercase tracking-wider font-[family-name:var(--font-inter)]">
            <div>ID Pago</div>
            <div>ID Reserva</div>
            <div>Usuario</div>
            <div>Cancha(s)</div>
            <div>Tipo Pago</div>
            <div className="text-right">Monto Pagado</div>
            <div className="text-right">Saldo Pendiente</div>
            <div>Metodo</div>
            <div>Estado</div>
            <div>Fecha Pago</div>
            <div>Hora Pago</div>
          </div>

          {paymentsLoading ? (
            <div className="p-12 text-center text-cm-on-surface-variant"><div className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-[#00ff41]/30 border-t-[#00ff41] rounded-full animate-spin" />Cargando pagos...</div></div>
          ) : visiblePayments.length === 0 ? (
            <div className="p-12 text-center text-cm-on-surface-variant text-sm">No se encontraron pagos.</div>
          ) : (
            <div>
              {visiblePayments.map((p) => {
                const isExpanded = expandedPayment === p.id
                const fin = getFinancialStatus(p)
                const methodDisp = getMethodDisplay(p)
                const remaining = p.remaining_balance ?? (p.total_price || 0) - (p.amount_paid || 0)

                return (
                  <div key={p.id} className={isExpanded ? 'bg-[#00ff41]/[0.03]' : ''}>
                    {/* Row */}
                    <button
                      onClick={() => setExpandedPayment(isExpanded ? null : p.id)}
                      className="w-full text-left p-3 sm:p-4 hover:bg-white/5 transition-colors border-b border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-[16px] text-cm-on-surface-variant transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>chevron_right</span>

                        {/* Desktop grid */}
                        <div className="hidden lg:flex lg:flex-1 lg:items-center lg:grid lg:grid-cols-11 gap-1 text-xs min-w-0">
                          <div className="min-w-0 font-mono font-medium truncate" title={p.payment_id}>{p.payment_id || '-'}</div>
                          <div className="min-w-0 font-mono truncate" title={p.booking_code || p.booking_id}>{p.booking_code || p.booking_id?.substring(0, 12) + '...' || '-'}</div>
                          <div className="min-w-0 truncate" title={p.user_name || p.user_email}>{p.user_name || p.user_email || '-'}</div>
                          <div className="min-w-0 truncate" title={p.court_names || p.court_name}>{p.court_names || p.court_name || '-'}</div>
                          <div className="min-w-0">{getTypeBadge(p.payment_type || '')}</div>
                          <div className="text-right font-bold text-[#00ff41]">{fmtMoney(p.amount_paid || 0)}</div>
                          <div className={`text-right font-medium ${remaining > 0 ? 'text-orange-400' : 'text-green-400'}`}>{fmtMoney(remaining)}</div>
                          <div className="min-w-0 flex items-center gap-1">{getMethodIcon(p.payment_method || '')}<span className="truncate">{methodDisp}</span></div>
                          <div className="min-w-0">{getStatusBadge(p.payment_status || '')}</div>
                          <div className="min-w-0 font-mono">{fmtPayDate(p.payment_date || '')}</div>
                          <div className="min-w-0 font-mono">{p.payment_time || '-'}</div>
                        </div>

                        {/* Mobile/card layout */}
                        <div className="flex-1 min-w-0 lg:hidden space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-medium text-cm-on-surface text-xs">{p.payment_id || '-'}</span>
                              {getTypeBadge(p.payment_type || '')}
                              {getStatusBadge(p.payment_status || '')}
                            </div>
                            <span className="text-[#00ff41] font-bold text-sm">{fmtMoney(p.amount_paid || 0)}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-cm-on-surface-variant">
                            <span>{p.booking_code || '-'}</span>
                            <span>{p.user_name || p.user_email || '-'}</span>
                            <span className="flex items-center gap-1">{getMethodIcon(p.payment_method || '')}{methodDisp}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-cm-on-surface-variant/70">
                            <span>{p.court_names || p.court_name || '-'}</span>
                            <span>{fmtPayDate(p.payment_date || '')} {p.payment_time || ''}</span>
                            {remaining > 0 && <span className="text-orange-400">Saldo: {fmtMoney(remaining)}</span>}
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && <PaymentDetail p={p} />}
                  </div>
                )
              })}
            </div>
          )}

          {/* Load more */}
          {filteredPayments.length > paymentsCount && (
            <div className="p-3 border-t border-white/10 text-center">
              <button onClick={() => setPaymentsCount(prev => prev + 20)} className="px-4 py-2 bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/20 rounded-lg text-xs font-semibold hover:bg-[#00ff41]/20 transition-colors font-[family-name:var(--font-inter)]">
                Cargar mas ({filteredPayments.length - paymentsCount} restantes)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------
          REJECT OBSERVATION DIALOG
          -------------------------------------------------------- */}
      {obsDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setObsDialog(null)}>
          <div className="glass-card rounded-2xl p-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h4 className="text-base font-bold text-cm-on-surface font-[family-name:var(--font-sora)] mb-3">Rechazar Pago</h4>
            <p className="text-sm text-cm-on-surface-variant mb-3 font-[family-name:var(--font-inter)]">Agrega una observacion o motivo del rechazo:</p>
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
"""

with open(TARGET, 'w', encoding='utf-8') as f:
    f.write(CONTENT)

print(f"Written {len(CONTENT)} bytes to {TARGET}")
