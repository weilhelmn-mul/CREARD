'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { toast } from '@/hooks/use-toast'
import { getAuthHeaders } from '@/lib/auth-helpers'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

import {
  Gavel,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Search,
  Download,
  FileSpreadsheet,
  Eye,
  MessageSquare,
  Archive,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Inbox,
  QrCode,
  Filter,
  Send,
  Loader2,
} from 'lucide-react'

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

type ClaimType = 'queja' | 'reclamo'
type ClaimStatus = 'received' | 'in_process' | 'responded' | 'closed' | 'archived'

interface Claim {
  id: string
  claimNumber: string
  type: ClaimType
  status: ClaimStatus
  consumerName: string
  docType: string
  docNumber: string
  address: string
  phone: string
  email: string
  description: string
  request: string
  bookingId: string | null
  bookingInfo: {
    courtName: string
    date: string
    time: string
    amount: number
    paymentMethod: string
  } | null
  attachments: { name: string; size: number; type: string; base64: string }[]
  providerResponse: string | null
  qrCode: string | null
  pdfUrl: string | null
  deadlineDate: string | null
  createdAt: string
  updatedAt: string
  statusHistory: { status: ClaimStatus; date: string; note?: string }[]
}

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */

const ITEMS_PER_PAGE = 10

const statusConfig: Record<ClaimStatus, { label: string; color: string }> = {
  received:   { label: 'Recibido',     color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  in_process: { label: 'En Proceso',  color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  responded:  { label: 'Respondido',  color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  closed:     { label: 'Atendido',    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  archived:   { label: 'Archivado',   color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
}

const typeConfig: Record<ClaimType, { label: string; color: string }> = {
  queja:  { label: 'Queja',  color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  reclamo: { label: 'Reclamo', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

const statusLabel: Record<ClaimStatus, string> = {
  received: 'Recibido',
  in_process: 'En Proceso',
  responded: 'Respondido',
  closed: 'Atendido',
  archived: 'Archivado',
}

function daysUntilDeadline(deadline: string | null): number {
  if (!deadline) return Infinity
  const diff = new Date(deadline).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */

export default function ClaimsAdminTab() {
  /* state */
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [page, setPage] = useState(1)

  /* dialogs */
  const [detailClaim, setDetailClaim] = useState<Claim | null>(null)
  const [responseClaim, setResponseClaim] = useState<Claim | null>(null)
  const [responseText, setResponseText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  /* fetch */
  const fetchClaims = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/claims', {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error('Error al cargar reclamos')
      const data = await res.json()
      setClaims(Array.isArray(data) ? data : data.claims ?? [])
    } catch (err) {
      console.error(err)
      toast({ title: 'Error', description: 'No se pudieron cargar los reclamos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClaims() }, [fetchClaims])

  /* filtered data */
  const filtered = useMemo(() => {
    let result = claims
    if (filterStatus !== 'all') result = result.filter(c => c.status === filterStatus)
    if (filterType !== 'all') result = result.filter(c => c.type === filterType)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        c =>
          c.claimNumber.toLowerCase().includes(q) ||
          c.consumerName.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      )
    }
    return result
  }, [claims, filterStatus, filterType, search])

  /* pagination */
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  useEffect(() => { setPage(1) }, [filterStatus, filterType, search])

  /* KPIs */
  const kpis = useMemo(() => {
    const total = claims.length
    const inProcess = claims.filter(c => c.status === 'in_process' || c.status === 'received').length
    const expiring = claims.filter(c => {
      if (c.status === 'closed' || c.status === 'archived') return false
      return daysUntilDeadline(c.deadlineDate) <= 3 && daysUntilDeadline(c.deadlineDate) >= 0
    }).length
    const attended = claims.filter(c => c.status === 'closed').length
    return { total, inProcess, expiring, attended }
  }, [claims])

  /* actions */
  const handleStatusChange = async (claimId: string, newStatus: ClaimStatus) => {
    try {
      const res = await fetch('/api/claims', {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, action: 'update_status', status: newStatus }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Estado actualizado', description: 'Reclamo \u2192 ' + statusLabel[newStatus] })
      fetchClaims()
    } catch {
      toast({ title: 'Error', description: 'No se pudo cambiar el estado', variant: 'destructive' })
    }
  }

  const handleArchive = async (claimId: string) => {
    await handleStatusChange(claimId, 'archived')
    setDetailClaim(null)
  }

  const openResponse = (claim: Claim) => {
    setResponseClaim(claim)
    setResponseText(claim.providerResponse ?? '')
  }

  const submitResponse = async () => {
    if (!responseClaim || !responseText.trim()) return
    try {
      setSubmitting(true)
      const res = await fetch('/api/claims', {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId: responseClaim.id,
          action: 'respond',
          response: responseText.trim(),
        }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Respuesta enviada', description: 'Se registr\u00f3 la respuesta del reclamo' })
      setResponseClaim(null)
      setResponseText('')
      fetchClaims()
    } catch {
      toast({ title: 'Error', description: 'No se pudo enviar la respuesta', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  /* export */
  const exportCSV = () => {
    const header = 'N\u00b0 Reclamo,Tipo,Consumidor,Documento,Estado,Fecha,Plazo,Descripci\u00f3n\n'
    const rows = filtered.map(c =>
      [c.claimNumber, c.type, c.consumerName, c.docType + ' ' + c.docNumber, statusLabel[c.status], formatDate(c.createdAt), c.deadlineDate ?? '', '"' + c.description.replace(/"/g, '""') + '"'].join(',')
    ).join('\n')
    downloadBlob(header + rows, 'reclamos.csv', 'text/csv')
  }

  const exportExcel = () => {
    const header = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table>'
    const th = '<tr><th>N\u00b0 Reclamo</th><th>Tipo</th><th>Consumidor</th><th>Documento</th><th>Estado</th><th>Fecha</th><th>Plazo</th></tr>'
    const rows = filtered.map(c =>
      '<tr><td>' + c.claimNumber + '</td><td>' + typeConfig[c.type].label + '</td><td>' + c.consumerName + '</td><td>' + c.docType + ' ' + c.docNumber + '</td><td>' + statusLabel[c.status] + '</td><td>' + formatDate(c.createdAt) + '</td><td>' + (c.deadlineDate ? formatDate(c.deadlineDate) : '') + '</td></tr>'
    ).join('')
    downloadBlob(header + th + rows + '</table></body></html>', 'reclamos.xls', 'application/vnd.ms-excel')
  }

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime + ';charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  /* KPI cards data */
  const kpCards = [
    { label: 'Total Reclamos', value: kpis.total, icon: FileText, color: 'text-[#00ff41]' },
    { label: 'En Proceso', value: kpis.inProcess, icon: Clock, color: 'text-amber-400' },
    { label: 'Por Vencer', value: kpis.expiring, icon: AlertTriangle, color: 'text-red-400' },
    { label: 'Atendidos', value: kpis.attended, icon: CheckCircle2, color: 'text-green-400' },
  ]

  /* ═══════════════════════════════════════════
     Render
     ═══════════════════════════════════════════ */
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5"
    >
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpCards.map(kp => (
          <div
            key={kp.label}
            className="bg-[#141e12] border border-[#2a3a25] rounded-xl p-4 flex items-center gap-3"
          >
            <div className="p-2.5 rounded-lg bg-[#00ff41]/10">
              <kp.icon className={'w-5 h-5 ' + kp.color} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#dae6d2]/50 font-medium">{kp.label}</p>
              <p className="text-2xl font-bold text-[#dae6d2] mt-0.5">{kp.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-[#141e12] border border-[#2a3a25] rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#dae6d2]/40" />
            <Input
              placeholder="Buscar por N\u00b0, nombre, descripci\u00f3n..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-[#1a2a16] border-[#2a3a25] text-[#dae6d2] placeholder:text-[#dae6d2]/40 h-9 text-sm focus-visible:ring-[#00ff41]/30"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px] bg-[#1a2a16] border-[#2a3a25] text-[#dae6d2] h-9 text-sm">
              <Filter className="w-4 h-4 mr-1.5 text-[#dae6d2]/50" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-[#141e12] border-[#2a3a25]">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="received">Recibido</SelectItem>
              <SelectItem value="in_process">En Proceso</SelectItem>
              <SelectItem value="responded">Respondido</SelectItem>
              <SelectItem value="closed">Atendido</SelectItem>
              <SelectItem value="archived">Archivado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px] bg-[#1a2a16] border-[#2a3a25] text-[#dae6d2] h-9 text-sm">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-[#141e12] border-[#2a3a25]">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="queja">Queja</SelectItem>
              <SelectItem value="reclamo">Reclamo</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}
              className="bg-[#1a2a16] border-[#2a3a25] text-[#dae6d2] hover:bg-[#2a3a25] hover:text-[#dae6d2] h-9 gap-1.5">
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel}
              className="bg-[#1a2a16] border-[#2a3a25] text-[#dae6d2] hover:bg-[#2a3a25] hover:text-[#dae6d2] h-9 gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#141e12] border border-[#2a3a25] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#00ff41] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#dae6d2]/50">
            <Inbox className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">No se encontraron reclamos</p>
            <p className="text-xs mt-1">Ajusta los filtros o espera nuevas solicitudes</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2a3a25] hover:bg-transparent">
                    <TableHead className="text-[#dae6d2]/60 text-xs font-semibold uppercase tracking-wider">N Reclamo</TableHead>
                    <TableHead className="text-[#dae6d2]/60 text-xs font-semibold uppercase tracking-wider">Tipo</TableHead>
                    <TableHead className="text-[#dae6d2]/60 text-xs font-semibold uppercase tracking-wider">Consumidor</TableHead>
                    <TableHead className="text-[#dae6d2]/60 text-xs font-semibold uppercase tracking-wider">Estado</TableHead>
                    <TableHead className="text-[#dae6d2]/60 text-xs font-semibold uppercase tracking-wider">Fecha</TableHead>
                    <TableHead className="text-[#dae6d2]/60 text-xs font-semibold uppercase tracking-wider">Plazo</TableHead>
                    <TableHead className="text-[#dae6d2]/60 text-xs font-semibold uppercase tracking-wider text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map(claim => {
                    const days = daysUntilDeadline(claim.deadlineDate)
                    const isUrgent = days <= 3 && days >= 0 && claim.status !== 'closed' && claim.status !== 'archived'
                    return (
                      <TableRow key={claim.id} className="border-[#2a3a25] hover:bg-[#00ff41]/5 transition-colors">
                        <TableCell className="text-[#dae6d2] font-mono text-sm font-medium">{claim.claimNumber}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={'text-[10px] font-semibold border ' + typeConfig[claim.type].color + ' px-2 py-0.5'}>
                            {typeConfig[claim.type].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-[#dae6d2] text-sm font-medium">{claim.consumerName}</div>
                          <div className="text-[#dae6d2]/50 text-xs">{claim.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={'text-[10px] font-semibold border ' + statusConfig[claim.status].color + ' px-2 py-0.5'}>
                            {statusConfig[claim.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[#dae6d2]/70 text-sm">{formatDate(claim.createdAt)}</TableCell>
                        <TableCell>
                          {claim.deadlineDate ? (
                            <span className={'text-sm font-medium ' + (isUrgent ? 'text-red-400' : 'text-[#dae6d2]/70')}>
                              {isUrgent && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                              {formatDate(claim.deadlineDate)}
                              {isUrgent && <span className="ml-1 text-[10px]">{days}d</span>}
                            </span>
                          ) : (
                            <span className="text-[#dae6d2]/40 text-sm">--</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setDetailClaim(claim)}
                              className="h-8 w-8 p-0 text-[#dae6d2]/60 hover:text-[#00ff41] hover:bg-[#00ff41]/10">
                              <Eye className="w-4 h-4" />
                            </Button>
                            {claim.status !== 'closed' && claim.status !== 'archived' && (
                              <Button variant="ghost" size="sm" onClick={() => openResponse(claim)}
                                className="h-8 w-8 p-0 text-[#dae6d2]/60 hover:text-[#00ff41] hover:bg-[#00ff41]/10">
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                            )}
                            {claim.status !== 'archived' && (
                              <Button variant="ghost" size="sm" onClick={() => handleArchive(claim.id)}
                                className="h-8 w-8 p-0 text-[#dae6d2]/60 hover:text-amber-400 hover:bg-amber-400/10">
                                <Archive className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a3a25]">
                <span className="text-xs text-[#dae6d2]/50">
                  Mostrando {(page - 1) * ITEMS_PER_PAGE + 1}{'\u2013'}{Math.min(page * ITEMS_PER_PAGE, filtered.length)} de {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="h-8 w-8 p-0 text-[#dae6d2]/60 hover:text-[#00ff41] hover:bg-[#00ff41]/10 disabled:opacity-30">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .map((p, i, arr) => (
                      <span key={p} className="flex items-center">
                        {i > 0 && arr[i - 1] !== p - 1 && <span className="text-[#dae6d2]/30 px-1 text-xs">...</span>}
                        <Button
                          variant={p === page ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setPage(p)}
                          className={'h-8 w-8 p-0 text-xs font-medium ' + (
                            p === page
                              ? 'bg-[#00ff41]/20 text-[#00ff41] hover:bg-[#00ff41]/30'
                              : 'text-[#dae6d2]/60 hover:text-[#00ff41] hover:bg-[#00ff41]/10'
                          )}
                        >
                          {p}
                        </Button>
                      </span>
                    ))}
                  <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                    className="h-8 w-8 p-0 text-[#dae6d2]/60 hover:text-[#00ff41] hover:bg-[#00ff41]/10 disabled:opacity-30">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* DETAIL DIALOG */}
      <Dialog open={!!detailClaim} onOpenChange={() => setDetailClaim(null)}>
        <DialogContent className="bg-[#141e12] border-[#2a3a25] text-[#dae6d2] max-w-2xl max-h-[85vh]">
          {detailClaim && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <Gavel className="w-5 h-5 text-[#00ff41]" />
                  Reclamo {detailClaim.claimNumber}
                </DialogTitle>
                <DialogDescription className="text-[#dae6d2]/50">
                  Registrado el {formatDateTime(detailClaim.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh] pr-3">
                <div className="space-y-5">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className={'border ' + typeConfig[detailClaim.type].color + ' text-xs font-semibold px-3 py-1'}>
                      {typeConfig[detailClaim.type].label}
                    </Badge>
                    <Badge variant="outline" className={'border ' + statusConfig[detailClaim.status].color + ' text-xs font-semibold px-3 py-1'}>
                      {statusConfig[detailClaim.status].label}
                    </Badge>
                    {detailClaim.deadlineDate && (
                      <Badge variant="outline" className={'border ' + (daysUntilDeadline(detailClaim.deadlineDate) <= 3 ? 'border-red-500/40 bg-red-500/10 text-red-400' : 'border-[#2a3a25] text-[#dae6d2]/60') + ' text-xs px-3 py-1'}>
                        <Clock className="w-3 h-3 mr-1" />
                        Plazo: {formatDate(detailClaim.deadlineDate)}
                      </Badge>
                    )}
                  </div>

                  <Separator className="bg-[#2a3a25]" />

                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-[#dae6d2]/50 font-semibold mb-2">Datos del Consumidor</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-[#dae6d2]/50">Nombre:</span> <span className="text-[#dae6d2]">{detailClaim.consumerName}</span></div>
                      <div><span className="text-[#dae6d2]/50">Documento:</span> <span className="text-[#dae6d2]">{detailClaim.docType} {detailClaim.docNumber}</span></div>
                      <div><span className="text-[#dae6d2]/50">Correo:</span> <span className="text-[#dae6d2]">{detailClaim.email}</span></div>
                      <div><span className="text-[#dae6d2]/50">Tel\u00e9fono:</span> <span className="text-[#dae6d2]">{detailClaim.phone || '--'}</span></div>
                      <div className="col-span-2"><span className="text-[#dae6d2]/50">Direcci\u00f3n:</span> <span className="text-[#dae6d2]">{detailClaim.address || '--'}</span></div>
                    </div>
                  </div>

                  <Separator className="bg-[#2a3a25]" />

                  {detailClaim.bookingInfo && (
                    <>
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-[#dae6d2]/50 font-semibold mb-2">Reserva Relacionada</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-[#dae6d2]/50">Cancha:</span> <span className="text-[#dae6d2]">{detailClaim.bookingInfo.courtName}</span></div>
                          <div><span className="text-[#dae6d2]/50">Fecha:</span> <span className="text-[#dae6d2]">{detailClaim.bookingInfo.date}</span></div>
                          <div><span className="text-[#dae6d2]/50">Hora:</span> <span className="text-[#dae6d2]">{detailClaim.bookingInfo.time}</span></div>
                          <div><span className="text-[#dae6d2]/50">Monto:</span> <span className="text-[#dae6d2]">S/ {detailClaim.bookingInfo.amount.toFixed(2)}</span></div>
                        </div>
                      </div>
                      <Separator className="bg-[#2a3a25]" />
                    </>
                  )}

                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-[#dae6d2]/50 font-semibold mb-2">Descripci\u00f3n</h4>
                    <p className="text-sm text-[#dae6d2] bg-[#1a2a16] rounded-lg p-3 whitespace-pre-wrap">{detailClaim.description}</p>
                  </div>

                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-[#dae6d2]/50 font-semibold mb-2">Petici\u00f3n</h4>
                    <p className="text-sm text-[#dae6d2] bg-[#1a2a16] rounded-lg p-3 whitespace-pre-wrap">{detailClaim.request}</p>
                  </div>

                  {detailClaim.providerResponse && (
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-[#dae6d2]/50 font-semibold mb-2">Respuesta del Proveedor</h4>
                      <p className="text-sm text-green-300 bg-green-500/5 border border-green-500/20 rounded-lg p-3 whitespace-pre-wrap">{detailClaim.providerResponse}</p>
                    </div>
                  )}

                  {detailClaim.qrCode && (
                    <div className="flex flex-col items-center">
                      <h4 className="text-xs uppercase tracking-wider text-[#dae6d2]/50 font-semibold mb-2">C\u00f3digo QR</h4>
                      <div className="bg-white rounded-lg p-2">
                        <QrCode className="w-8 h-8 text-black" />
                      </div>
                    </div>
                  )}

                  <Separator className="bg-[#2a3a25]" />

                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-[#dae6d2]/50 font-semibold mb-3">Historial de Estado</h4>
                    <div className="space-y-3">
                      {detailClaim.statusHistory && detailClaim.statusHistory.length > 0
                        ? detailClaim.statusHistory.map((entry, idx) => (
                            <div key={idx} className="flex gap-3 items-start">
                              <div className="flex flex-col items-center">
                                <div className={'w-2.5 h-2.5 rounded-full ' + (
                                  entry.status === 'closed' ? 'bg-emerald-400' :
                                  entry.status === 'responded' ? 'bg-green-400' :
                                  entry.status === 'in_process' ? 'bg-amber-400' :
                                  entry.status === 'received' ? 'bg-blue-400' : 'bg-gray-400'
                                )} />
                                {idx < (detailClaim.statusHistory?.length ?? 0) - 1 && (
                                  <div className="w-px h-8 bg-[#2a3a25] mt-1" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm text-[#dae6d2] font-medium">{statusLabel[entry.status]}</p>
                                <p className="text-xs text-[#dae6d2]/50">{formatDateTime(entry.date)}</p>
                                {entry.note && <p className="text-xs text-[#dae6d2]/40 mt-0.5">{entry.note}</p>}
                              </div>
                            </div>
                          ))
                        : <p className="text-sm text-[#dae6d2]/40">Sin historial registrado</p>
                      }
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="flex gap-2 sm:gap-2">
                {detailClaim.status !== 'closed' && detailClaim.status !== 'archived' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { handleStatusChange(detailClaim.id, 'in_process'); setDetailClaim(null) }}
                      className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-400"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> En Proceso
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => { setDetailClaim(null); openResponse(detailClaim) }}
                      className="bg-[#00ff41]/20 text-[#00ff41] hover:bg-[#00ff41]/30"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" /> Responder
                    </Button>
                  </>
                )}
                {detailClaim.status === 'responded' && (
                  <Button
                    size="sm"
                    onClick={() => { handleStatusChange(detailClaim.id, 'closed'); setDetailClaim(null) }}
                    className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Marcar Atendido
                  </Button>
                )}
                {detailClaim.status !== 'archived' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleArchive(detailClaim.id)}
                    className="border-[#2a3a25] text-[#dae6d2]/60 hover:bg-amber-400/10 hover:text-amber-400 hover:border-amber-400/30"
                  >
                    <Archive className="w-3.5 h-3.5 mr-1.5" /> Archivar
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* RESPONSE DIALOG */}
      <Dialog open={!!responseClaim} onOpenChange={() => { setResponseClaim(null); setResponseText('') }}>
        <DialogContent className="bg-[#141e12] border-[#2a3a25] text-[#dae6d2] max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#00ff41]" />
              Responder Reclamo {responseClaim?.claimNumber}
            </DialogTitle>
            <DialogDescription className="text-[#dae6d2]/50">
              Escriba la respuesta que se notificar\u00e1 al consumidor.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={responseText}
            onChange={e => setResponseText(e.target.value)}
            placeholder="Escriba su respuesta aqu\u00ed..."
            rows={6}
            className="bg-[#1a2a16] border-[#2a3a25] text-[#dae6d2] placeholder:text-[#dae6d2]/40 resize-none focus-visible:ring-[#00ff41]/30"
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => { setResponseClaim(null); setResponseText('') }}
              className="border-[#2a3a25] text-[#dae6d2]/60 hover:bg-[#2a3a25] hover:text-[#dae6d2]">
              Cancelar
            </Button>
            <Button onClick={submitResponse} disabled={submitting || !responseText.trim()}
              className="bg-[#00ff41]/20 text-[#00ff41] hover:bg-[#00ff41]/30 disabled:opacity-40">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Enviar Respuesta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
