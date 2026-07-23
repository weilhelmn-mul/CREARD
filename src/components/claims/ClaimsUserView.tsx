'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAppStore } from '@/store/useAppStore'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/hooks/use-toast'
import { getAuthHeaders } from '@/lib/auth-helpers'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import {
  FileText,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  Upload,
  X,
  Eye,
  ChevronRight,
  Loader2,
  Paperclip,
  Inbox,
  QrCode,
  Download,
} from 'lucide-react'

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

interface Booking {
  id: string
  courtId: string
  userId: string
  date: string
  startTime: string
  endTime: string
  totalPrice: number
  advanceAmount: number
  remainingAmount: number
  status: string
  paymentMethod: string | null
  notes: string | null
  court: {
    id: string
    name: string
    sport: string
    branch: { id: string; name: string }
  }
  user: { id: string; name: string; email: string }
}

type ClaimType = 'queja' | 'reclamo'
type ClaimStatus = 'received' | 'in_process' | 'responded' | 'closed' | 'archived'

interface AttachedFile {
  name: string
  size: number
  type: string
  base64: string
}

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
   Zod Schema
   ═══════════════════════════════════════════ */

const claimFormSchema = z.object({
  type: z.enum(['queja', 'reclamo']),
  fullName: z.string().min(2, 'El nombre es obligatorio'),
  docType: z.enum(['DNI', 'CE', 'PTE', 'RUC', 'Pasaporte']),
  docNumber: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(20, 'Máximo 20 caracteres'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Correo electrónico inválido'),
  relatedToBooking: z.boolean(),
  bookingId: z.string().optional(),
  description: z
    .string()
    .min(10, 'Mínimo 10 caracteres')
    .max(2000, 'Máximo 2000 caracteres'),
  request: z
    .string()
    .min(10, 'Mínimo 10 caracteres')
    .max(1000, 'Máximo 1000 caracteres'),
})

type ClaimFormData = z.infer<typeof claimFormSchema>

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */

const docTypeOptions = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'Carnet de Extranjería' },
  { value: 'PTE', label: 'Permiso Temporal' },
  { value: 'RUC', label: 'RUC' },
  { value: 'Pasaporte', label: 'Pasaporte' },
]

const statusConfig: Record<ClaimStatus, { label: string; color: string; icon: string }> = {
  received: {
    label: 'Recibido',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    icon: 'inbox',
  },
  in_process: {
    label: 'En Proceso',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: 'hourglass_top',
  },
  responded: {
    label: 'Respondido',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    icon: 'check_circle',
  },
  closed: {
    label: 'Cerrado',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    icon: 'lock',
  },
  archived: {
    label: 'Archivado',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: 'archive',
  },
}

const statusTimeline: ClaimStatus[] = ['received', 'in_process', 'responded', 'closed']

const fmtCurrency = (n: number) => `S/ ${n.toFixed(2)}`

function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
  }
  return new Date(dateStr + 'T00:00:00')
}

const fmtDate = (dateStr: string) => {
  const d = parseLocalDate(dateStr)
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}

const fmtDateTime = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function daysRemaining(deadlineDate: string): number {
  const deadline = new Date(deadlineDate)
  const now = new Date()
  const diff = deadline.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILES = 3
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */

export default function ClaimsUserView() {
  const { user } = useAppStore()
  const [activeTab, setActiveTab] = useState<string>('file')
  const [claims, setClaims] = useState<Claim[]>([])
  const [claimsLoading, setClaimsLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submittedClaim, setSubmittedClaim] = useState<Claim | null>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [attachments, setAttachments] = useState<AttachedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  /* ── Form ── */
  const form = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      type: 'queja',
      fullName: user?.name ?? '',
      docType: 'DNI',
      docNumber: '',
      address: '',
      phone: user?.phone ?? '',
      email: user?.email ?? '',
      relatedToBooking: false,
      bookingId: '',
      description: '',
      request: '',
    },
  })

  const watchRelatedToBooking = form.watch('relatedToBooking')
  const watchBookingId = form.watch('bookingId')

  // Get selected booking info
  const selectedBooking = bookings.find((b) => b.id === watchBookingId)

  /* ── Fetch user bookings ── */
  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch('/api/bookings', {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setBookings(Array.isArray(data) ? data : data.bookings ?? [])
      }
    } catch {
      // Silent fail for bookings
    }
  }, [])

  /* ── Fetch user claims ── */
  const fetchClaims = useCallback(async () => {
    setClaimsLoading(true)
    try {
      const res = await fetch('/api/claims', {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setClaims(Array.isArray(data) ? data : data.claims ?? [])
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los reclamos', variant: 'destructive' })
    } finally {
      setClaimsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookings()
    fetchClaims()
  }, [fetchBookings, fetchClaims])

  /* ── File handling ── */
  const processFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)

    for (const file of fileArray) {
      if (attachments.length >= MAX_FILES) {
        toast({ title: 'Límite alcanzado', description: `Máximo ${MAX_FILES} archivos permitidos` })
        return
      }

      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast({
          title: 'Formato no válido',
          description: 'Solo se acepta PDF, JPG, JPEG, PNG',
          variant: 'destructive',
        })
        continue
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'Archivo muy grande',
          description: 'Máximo 5MB por archivo',
          variant: 'destructive',
        })
        continue
      }

      const reader = new FileReader()
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type,
            base64: (reader.result as string).split(',')[1],
          },
        ])
      }
      reader.readAsDataURL(file)
    }
  }, [attachments.length])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files)
      }
    },
    [processFiles]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files)
        e.target.value = ''
      }
    },
    [processFiles]
  )

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  /* ── Submit ── */
  const onSubmit = async (data: ClaimFormData) => {
    setSubmitting(true)
    try {
      const booking = data.bookingId ? bookings.find((b) => b.id === data.bookingId) : null

      const payload = {
        type: data.type,
        fullName: data.fullName,
        docType: data.docType,
        docNumber: data.docNumber,
        address: data.address,
        phone: data.phone,
        email: data.email,
        relatedToBooking: data.relatedToBooking,
        bookingId: data.bookingId || null,
        bookingInfo: booking
          ? {
              courtName: `${booking.court.name} - ${booking.court.branch.name}`,
              date: booking.date,
              time: `${booking.startTime} - ${booking.endTime}`,
              amount: booking.totalPrice,
              paymentMethod: booking.paymentMethod ?? 'N/A',
            }
          : null,
        description: data.description,
        request: data.request,
        attachments,
      }

      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(err.error || err.message || 'Error al enviar el reclamo')
      }

      const claim = await res.json()
      setSubmittedClaim(claim)
      setShowSuccessDialog(true)

      // Reset form
      form.reset({
        type: 'queja',
        fullName: user?.name ?? '',
        docType: 'DNI',
        docNumber: '',
        address: '',
        phone: user?.phone ?? '',
        email: user?.email ?? '',
        relatedToBooking: false,
        bookingId: '',
        description: '',
        request: '',
      })
      setAttachments([])

      // Refresh claims list
      fetchClaims()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error al enviar el reclamo',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Open detail ── */
  const openDetail = (claim: Claim) => {
    setSelectedClaim(claim)
    setShowDetailDialog(true)
  }

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-cm-primary/10 border border-cm-primary/20">
            <span className="material-symbols-outlined text-cm-primary text-xl">feedback</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-cm-primary">Libro de Reclamaciones</h1>
            <p className="text-sm text-cm-muted">
              Registra tu queja o reclamo de acuerdo al Código de Protección y Defensa del Consumidor
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="w-full bg-cm-surface-container-low border border-cm-border rounded-xl h-auto p-1">
          <TabsTrigger
            value="file"
            className="flex-1 py-2.5 rounded-lg data-[state=active]:bg-cm-primary/15 data-[state=active]:text-cm-primary text-cm-muted"
          >
            <Send className="w-4 h-4 mr-2" />
            Presentar Reclamo
          </TabsTrigger>
          <TabsTrigger
            value="list"
            className="flex-1 py-2.5 rounded-lg data-[state=active]:bg-cm-primary/15 data-[state=active]:text-cm-primary text-cm-muted"
          >
            <FileText className="w-4 h-4 mr-2" />
            Mis Reclamos
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: File a Claim ─── */}
        <TabsContent value="file" className="mt-6">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Section 1: Tipo de Reclamo */}
                <section className="bg-cm-surface rounded-xl border border-cm-border p-6">
                  <h2 className="text-lg font-semibold text-cm-primary mb-4">
                    <span className="material-symbols-outlined text-cm-primary text-xl align-middle mr-2">
                      category
                    </span>
                    Tipo de Reclamo
                  </h2>

                  <RadioGroup
                    value={form.watch('type')}
                    onValueChange={(val) => form.setValue('type', val as ClaimType)}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    <label
                      className={`relative flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                        form.watch('type') === 'queja'
                          ? 'border-cm-primary/50 bg-cm-primary/5'
                          : 'border-cm-border hover:border-cm-primary/30 bg-cm-surface-container-low'
                      }`}
                    >
                      <RadioGroupItem value="queja" className="mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-cm-primary text-sm">Queja</p>
                        <p className="text-xs text-cm-muted mt-1">
                          Disconformidad respecto a un servicio recibido
                        </p>
                      </div>
                    </label>

                    <label
                      className={`relative flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                        form.watch('type') === 'reclamo'
                          ? 'border-cm-primary/50 bg-cm-primary/5'
                          : 'border-cm-border hover:border-cm-primary/30 bg-cm-surface-container-low'
                      }`}
                    >
                      <RadioGroupItem value="reclamo" className="mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-cm-primary text-sm">Reclamo</p>
                        <p className="text-xs text-cm-muted mt-1">
                          Requiere una solución específica (reparo, devolución, etc.)
                        </p>
                      </div>
                    </label>
                  </RadioGroup>
                </section>

                {/* Section 2: Datos del Consumidor */}
                <section className="bg-cm-surface rounded-xl border border-cm-border p-6">
                  <h2 className="text-lg font-semibold text-cm-primary mb-4">
                    <span className="material-symbols-outlined text-cm-primary text-xl align-middle mr-2">
                      person
                    </span>
                    Datos del Consumidor
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nombre completo */}
                    <div className="space-y-2">
                      <Label className="text-sm text-cm-muted">Nombre completo *</Label>
                      <Input
                        {...form.register('fullName')}
                        placeholder="Ingrese su nombre completo"
                        className="bg-cm-surface-container-low border-cm-border text-cm-primary placeholder:text-cm-muted/50 focus:border-cm-primary/50 focus:ring-cm-primary/20"
                      />
                      {form.formState.errors.fullName && (
                        <p className="text-xs text-red-400">{form.formState.errors.fullName.message}</p>
                      )}
                    </div>

                    {/* Tipo de documento */}
                    <div className="space-y-2">
                      <Label className="text-sm text-cm-muted">Tipo de documento *</Label>
                      <Select
                        value={form.watch('docType')}
                        onValueChange={(val) => form.setValue('docType', val as 'DNI' | 'CE' | 'PTE' | 'RUC' | 'Pasaporte')}
                      >
                        <SelectTrigger className="bg-cm-surface-container-low border-cm-border text-cm-primary focus:border-cm-primary/50 focus:ring-cm-primary/20 w-full">
                          <SelectValue placeholder="Seleccione" />
                        </SelectTrigger>
                        <SelectContent className="bg-cm-surface-container border-cm-border">
                          {docTypeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-cm-primary focus:bg-cm-primary/10 focus:text-cm-primary">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Número de documento */}
                    <div className="space-y-2">
                      <Label className="text-sm text-cm-muted">Número de documento *</Label>
                      <Input
                        {...form.register('docNumber')}
                        placeholder="Ingrese número de documento"
                        className="bg-cm-surface-container-low border-cm-border text-cm-primary placeholder:text-cm-muted/50 focus:border-cm-primary/50 focus:ring-cm-primary/20"
                      />
                      {form.formState.errors.docNumber && (
                        <p className="text-xs text-red-400">{form.formState.errors.docNumber.message}</p>
                      )}
                    </div>

                    {/* Dirección */}
                    <div className="space-y-2">
                      <Label className="text-sm text-cm-muted">Dirección</Label>
                      <Input
                        {...form.register('address')}
                        placeholder="Dirección de domicilio"
                        className="bg-cm-surface-container-low border-cm-border text-cm-primary placeholder:text-cm-muted/50 focus:border-cm-primary/50 focus:ring-cm-primary/20"
                      />
                    </div>

                    {/* Teléfono */}
                    <div className="space-y-2">
                      <Label className="text-sm text-cm-muted">Teléfono</Label>
                      <Input
                        {...form.register('phone')}
                        placeholder="Número de teléfono"
                        className="bg-cm-surface-container-low border-cm-border text-cm-primary placeholder:text-cm-muted/50 focus:border-cm-primary/50 focus:ring-cm-primary/20"
                      />
                    </div>

                    {/* Correo electrónico */}
                    <div className="space-y-2">
                      <Label className="text-sm text-cm-muted">Correo electrónico *</Label>
                      <Input
                        {...form.register('email')}
                        placeholder="correo@ejemplo.com"
                        readOnly={!!user}
                        className="bg-cm-surface-container-low border-cm-border text-cm-primary placeholder:text-cm-muted/50 focus:border-cm-primary/50 focus:ring-cm-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      {form.formState.errors.email && (
                        <p className="text-xs text-red-400">{form.formState.errors.email.message}</p>
                      )}
                    </div>
                  </div>
                </section>

                {/* Section 3: Relación con una Reserva */}
                <section className="bg-cm-surface rounded-xl border border-cm-border p-6">
                  <h2 className="text-lg font-semibold text-cm-primary mb-4">
                    <span className="material-symbols-outlined text-cm-primary text-xl align-middle mr-2">
                      sports_soccer
                    </span>
                    Relación con una Reserva
                    <span className="text-xs text-cm-muted font-normal ml-2">(Opcional)</span>
                  </h2>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-cm-surface-container-low border border-cm-border mb-4">
                    <div>
                      <p className="text-sm text-cm-primary">¿Está relacionado con una reserva?</p>
                      <p className="text-xs text-cm-muted">Seleccione una reserva existente como referencia</p>
                    </div>
                    <Switch
                      checked={watchRelatedToBooking}
                      onCheckedChange={(val) => {
                        form.setValue('relatedToBooking', val)
                        if (!val) form.setValue('bookingId', '')
                      }}
                    />
                  </div>

                  <AnimatePresence>
                    {watchRelatedToBooking && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-4 pt-2">
                          <div className="space-y-2">
                            <Label className="text-sm text-cm-muted">Seleccione una reserva</Label>
                            <Select
                              value={watchBookingId || ''}
                              onValueChange={(val) => form.setValue('bookingId', val)}
                            >
                              <SelectTrigger className="bg-cm-surface-container-low border-cm-border text-cm-primary focus:border-cm-primary/50 focus:ring-cm-primary/20 w-full">
                                <SelectValue placeholder="Seleccione una reserva..." />
                              </SelectTrigger>
                              <SelectContent className="bg-cm-surface-container border-cm-border max-h-60">
                                {bookings.length === 0 ? (
                                  <SelectItem value="__none" disabled className="text-cm-muted">
                                    No hay reservas disponibles
                                  </SelectItem>
                                ) : (
                                  bookings.map((b) => (
                                    <SelectItem
                                      key={b.id}
                                      value={b.id}
                                      className="text-cm-primary focus:bg-cm-primary/10 focus:text-cm-primary"
                                    >
                                      <span className="flex items-center gap-2">
                                        <span>{b.court.name}</span>
                                        <span className="text-cm-muted">• {fmtDate(b.date)}</span>
                                        <span className="text-cm-muted">• {fmtCurrency(b.totalPrice)}</span>
                                      </span>
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Booking info display */}
                          {selectedBooking && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-cm-surface-container-low border border-cm-primary/20"
                            >
                              <div>
                                <p className="text-xs text-cm-muted">Cancha</p>
                                <p className="text-sm text-cm-primary font-medium">
                                  {selectedBooking.court.name} - {selectedBooking.court.branch.name}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-cm-muted">Fecha</p>
                                <p className="text-sm text-cm-primary font-medium">
                                  {fmtDate(selectedBooking.date)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-cm-muted">Horario</p>
                                <p className="text-sm text-cm-primary font-medium">
                                  {selectedBooking.startTime} - {selectedBooking.endTime}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-cm-muted">Monto</p>
                                <p className="text-sm text-cm-primary font-medium">
                                  {fmtCurrency(selectedBooking.totalPrice)}
                                </p>
                              </div>
                              <div className="sm:col-span-2">
                                <p className="text-xs text-cm-muted">Método de pago</p>
                                <p className="text-sm text-cm-primary font-medium capitalize">
                                  {selectedBooking.paymentMethod || 'Pendiente'}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>

                {/* Section 4: Detalle del Reclamo */}
                <section className="bg-cm-surface rounded-xl border border-cm-border p-6">
                  <h2 className="text-lg font-semibold text-cm-primary mb-4">
                    <span className="material-symbols-outlined text-cm-primary text-xl align-middle mr-2">
                      edit_note
                    </span>
                    Detalle del Reclamo
                  </h2>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-cm-muted">
                        Descripción del hecho *
                        <span className="text-xs text-cm-muted ml-1">
                          ({form.watch('description').length}/2000)
                        </span>
                      </Label>
                      <Textarea
                        {...form.register('description')}
                        placeholder="Describa detalladamente los hechos que motivan su queja o reclamo..."
                        rows={5}
                        className="bg-cm-surface-container-low border-cm-border text-cm-primary placeholder:text-cm-muted/50 focus:border-cm-primary/50 focus:ring-cm-primary/20 resize-none"
                      />
                      {form.formState.errors.description && (
                        <p className="text-xs text-red-400">
                          {form.formState.errors.description.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm text-cm-muted">
                        Qué solicita el consumidor *
                        <span className="text-xs text-cm-muted ml-1">
                          ({form.watch('request').length}/1000)
                        </span>
                      </Label>
                      <Textarea
                        {...form.register('request')}
                        placeholder="Indique qué solución espera (reparo, devolución, cambio, etc.)..."
                        rows={4}
                        className="bg-cm-surface-container-low border-cm-border text-cm-primary placeholder:text-cm-muted/50 focus:border-cm-primary/50 focus:ring-cm-primary/20 resize-none"
                      />
                      {form.formState.errors.request && (
                        <p className="text-xs text-red-400">
                          {form.formState.errors.request.message}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                {/* Section 5: Documentos Adjuntos */}
                <section className="bg-cm-surface rounded-xl border border-cm-border p-6">
                  <h2 className="text-lg font-semibold text-cm-primary mb-4">
                    <span className="material-symbols-outlined text-cm-primary text-xl align-middle mr-2">
                      attach_file
                    </span>
                    Documentos Adjuntos
                    <span className="text-xs text-cm-muted font-normal ml-2">
                      (Opcional - máx. 3 archivos, 5MB c/u)
                    </span>
                  </h2>

                  {/* Drop zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOver(true)
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center gap-3 p-8 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
                      dragOver
                        ? 'border-cm-primary bg-cm-primary/5'
                        : 'border-cm-border hover:border-cm-primary/30 bg-cm-surface-container-low'
                    }`}
                  >
                    <div
                      className={`p-3 rounded-full transition-colors ${
                        dragOver ? 'bg-cm-primary/20' : 'bg-cm-surface-container-high'
                      }`}
                    >
                      <Upload
                        className={`w-6 h-6 ${dragOver ? 'text-cm-primary' : 'text-cm-muted'}`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-cm-primary font-medium">
                        Arrastra archivos aquí o haz clic para seleccionar
                      </p>
                      <p className="text-xs text-cm-muted mt-1">
                        PDF, JPG, JPEG, PNG • Máximo 5MB por archivo
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>

                  {/* File list */}
                  {attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {attachments.map((file, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-cm-surface-container-low border border-cm-border"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-md bg-cm-surface-container-high shrink-0">
                              <Paperclip className="w-4 h-4 text-cm-muted" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-cm-primary truncate">{file.name}</p>
                              <p className="text-xs text-cm-muted">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="p-1.5 rounded-md hover:bg-red-500/10 text-cm-muted hover:text-red-400 transition-colors shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Submit Button */}
                <motion.div whileTap={{ scale: 0.98 }} className="flex justify-center pt-2 pb-4">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto min-w-[280px] h-12 text-base font-semibold bg-cm-primary text-cm-on-primary hover:bg-cm-primary-dim shadow-[0_0_20px_rgba(0,255,65,0.2)] hover:shadow-[0_0_30px_rgba(0,255,65,0.3)] transition-all rounded-xl"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Presentar Reclamo
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </form>
        </TabsContent>

        {/* ─── TAB 2: Mis Reclamos ─── */}
        <TabsContent value="list" className="mt-6">
          <AnimatePresence mode="wait">
            {claimsLoading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center py-20"
              >
                <Loader2 className="w-8 h-8 animate-spin text-cm-primary" />
              </motion.div>
            ) : claims.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="p-4 rounded-full bg-cm-surface-container-low border border-cm-border mb-4">
                  <Inbox className="w-10 h-10 text-cm-muted" />
                </div>
                <h3 className="text-lg font-semibold text-cm-primary mb-2">
                  No tiene reclamos registrados
                </h3>
                <p className="text-sm text-cm-muted max-w-sm">
                  Aún no ha presentado ninguna queja o reclamo. Puede hacerlo desde la pestaña anterior.
                </p>
                <Button
                  onClick={() => setActiveTab('file')}
                  className="mt-6 bg-cm-primary/10 border border-cm-primary/30 text-cm-primary hover:bg-cm-primary/20"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Presentar Reclamo
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {claims.map((claim, index) => (
                  <motion.div
                    key={claim.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => openDetail(claim)}
                    className="flex items-center justify-between p-4 rounded-xl bg-cm-surface border border-cm-border hover:border-cm-primary/30 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="p-2.5 rounded-lg bg-cm-surface-container-low shrink-0">
                        <span className="material-symbols-outlined text-cm-primary text-xl">description</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-cm-primary">
                            {claim.claimNumber}
                          </p>
                          <Badge
                            className={`text-[10px] px-1.5 py-0 border ${
                              claim.type === 'queja'
                                ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25'
                                : 'bg-orange-500/15 text-orange-400 border-orange-500/25'
                            }`}
                          >
                            {claim.type === 'queja' ? 'Queja' : 'Reclamo'}
                          </Badge>
                          <Badge
                            className={`text-[10px] px-1.5 py-0 border ${statusConfig[claim.status]?.color ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}
                          >
                            {statusConfig[claim.status]?.label ?? claim.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-cm-muted mt-1">
                          {fmtDateTime(claim.createdAt)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-cm-muted group-hover:text-cm-primary transition-colors shrink-0" />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* ─── Success Dialog ─── */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md bg-cm-surface-container border border-cm-primary/30 shadow-[0_0_30px_rgba(0,255,65,0.1)]">
          <DialogHeader className="text-center sm:text-center items-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="mx-auto mb-4 p-4 rounded-full bg-cm-primary/15 border border-cm-primary/30"
            >
              <CheckCircle className="w-10 h-10 text-cm-primary" />
            </motion.div>
            <DialogTitle className="text-xl text-cm-primary">
              Reclamo Registrado Exitosamente
            </DialogTitle>
            <DialogDescription className="text-cm-muted">
              Su reclamo ha sido registrado y será atendido en un plazo máximo de 30 días calendario.
            </DialogDescription>
          </DialogHeader>

          {submittedClaim && (
            <div className="space-y-4 py-4">
              {/* Claim number */}
              <div className="p-4 rounded-lg bg-cm-surface-container-low border border-cm-border text-center">
                <p className="text-xs text-cm-muted mb-1">Número de Reclamo</p>
                <p className="text-2xl font-bold text-cm-primary tracking-wide">
                  {submittedClaim.claimNumber}
                </p>
              </div>

              {/* QR Code */}
              {submittedClaim.qrCode && (
                <div className="flex justify-center">
                  <div className="p-3 rounded-lg bg-white border border-cm-border">
                    <img
                      src={submittedClaim.qrCode}
                      alt="Código QR"
                      className="w-32 h-32"
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-cm-muted text-center">
                ⚠️ Guarde este número para seguimiento
              </p>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {submittedClaim?.pdfUrl && (
              <Button
                asChild
                className="w-full border border-cm-primary/30 bg-cm-primary/10 text-cm-primary hover:bg-cm-primary/20"
              >
                <a href={submittedClaim.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </a>
              </Button>
            )}
            <Button
              onClick={() => {
                setShowSuccessDialog(false)
                setActiveTab('list')
              }}
              className="w-full bg-cm-primary text-cm-on-primary hover:bg-cm-primary-dim shadow-[0_0_15px_rgba(0,255,65,0.2)]"
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver Mis Reclamos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail Dialog ─── */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-lg bg-cm-surface-container border border-cm-border max-h-[90vh] overflow-y-auto">
          {selectedClaim && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg text-cm-primary">
                    Detalle del Reclamo
                  </DialogTitle>
                  <Badge
                    className={`border ${statusConfig[selectedClaim.status]?.color ?? ''}`}
                  >
                    <span
                      className={`material-symbols-outlined text-sm mr-1`}
                    >
                      {statusConfig[selectedClaim.status]?.icon ?? 'help'}
                    </span>
                    {statusConfig[selectedClaim.status]?.label ?? selectedClaim.status}
                  </Badge>
                </div>
                <DialogDescription className="text-cm-muted">
                  {selectedClaim.claimNumber}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* Status Timeline */}
                <div className="p-4 rounded-lg bg-cm-surface-container-low border border-cm-border">
                  <p className="text-xs text-cm-muted mb-3 font-medium uppercase tracking-wide">
                    Estado del Reclamo
                  </p>
                  <div className="flex items-center gap-1">
                    {statusTimeline.map((status, index) => {
                      const statusIndex = statusTimeline.indexOf(selectedClaim.status)
                      const isActive = statusTimeline.indexOf(status) <= statusIndex
                      const isCurrent = status === selectedClaim.status

                      return (
                        <div key={status} className="flex items-center flex-1">
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                                isActive
                                  ? 'border-cm-primary bg-cm-primary/20'
                                  : 'border-cm-border bg-cm-surface-container'
                              } ${isCurrent ? 'shadow-[0_0_10px_rgba(0,255,65,0.3)]' : ''}`}
                            >
                              <span className="material-symbols-outlined text-base">
                                {isActive
                                  ? statusConfig[status]?.icon
                                  : 'radio_button_unchecked'}
                              </span>
                            </div>
                            <p
                              className={`text-[10px] mt-1 ${
                                isActive ? 'text-cm-primary' : 'text-cm-muted'
                              }`}
                            >
                              {statusConfig[status]?.label}
                            </p>
                          </div>
                          {index < statusTimeline.length - 1 && (
                            <div
                              className={`flex-1 h-0.5 mx-1 ${
                                statusTimeline.indexOf(status) < statusIndex
                                  ? 'bg-cm-primary'
                                  : 'bg-cm-border'
                              }`}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Claim Info */}
                <div className="space-y-3">
                  <InfoRow label="Tipo" value={selectedClaim.type === 'queja' ? 'Queja' : 'Reclamo'} />
                  <InfoRow label="Fecha de registro" value={fmtDateTime(selectedClaim.createdAt)} />
                  <Separator className="bg-cm-border" />
                  <InfoRow label="Nombre" value={selectedClaim.consumerName} />
                  <InfoRow label="Documento" value={`${selectedClaim.docType}: ${selectedClaim.docNumber}`} />
                  <InfoRow label="Teléfono" value={selectedClaim.phone || 'No indicado'} />
                  <InfoRow label="Email" value={selectedClaim.email} />
                  <Separator className="bg-cm-border" />

                  {/* Booking relation */}
                  {selectedClaim.bookingInfo && (
                    <>
                      <div className="p-3 rounded-lg bg-cm-surface-container-low border border-cm-primary/20">
                        <p className="text-xs text-cm-muted mb-2 font-medium">Reserva relacionada</p>
                        <div className="grid grid-cols-2 gap-2">
                          <InfoRow label="Cancha" value={selectedClaim.bookingInfo.courtName} />
                          <InfoRow label="Fecha" value={fmtDate(selectedClaim.bookingInfo.date)} />
                          <InfoRow label="Horario" value={selectedClaim.bookingInfo.time} />
                          <InfoRow label="Monto" value={fmtCurrency(selectedClaim.bookingInfo.amount)} />
                        </div>
                      </div>
                      <Separator className="bg-cm-border" />
                    </>
                  )}

                  {/* Description */}
                  <div>
                    <p className="text-xs text-cm-muted mb-1">Descripción del hecho</p>
                    <p className="text-sm text-cm-primary whitespace-pre-wrap leading-relaxed">
                      {selectedClaim.description}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-cm-muted mb-1">Solicitud del consumidor</p>
                    <p className="text-sm text-cm-primary whitespace-pre-wrap leading-relaxed">
                      {selectedClaim.request}
                    </p>
                  </div>

                  {/* Provider Response */}
                  {selectedClaim.providerResponse && (
                    <>
                      <Separator className="bg-cm-border" />
                      <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-outlined text-green-400 text-lg">
                            support_agent
                          </span>
                          <p className="text-xs font-medium text-green-400 uppercase tracking-wide">
                            Respuesta del Proveedor
                          </p>
                        </div>
                        <p className="text-sm text-cm-primary whitespace-pre-wrap leading-relaxed">
                          {selectedClaim.providerResponse}
                        </p>
                      </div>
                    </>
                  )}

                  {/* QR Code */}
                  {selectedClaim.qrCode && (
                    <div className="flex justify-center py-2">
                      <div className="p-3 rounded-lg bg-white border border-cm-border">
                        <img
                          src={selectedClaim.qrCode}
                          alt="Código QR del reclamo"
                          className="w-28 h-28"
                        />
                      </div>
                    </div>
                  )}

                  {/* Deadline */}
                  {selectedClaim.deadlineDate && (
                    <div
                      className={`p-3 rounded-lg border text-center ${
                        daysRemaining(selectedClaim.deadlineDate) <= 5
                          ? 'bg-yellow-500/10 border-yellow-500/30'
                          : 'bg-cm-surface-container-low border-cm-border'
                      }`}
                    >
                      <p className="text-xs text-cm-muted">Plazo máximo de atención</p>
                      <p className="text-sm font-semibold text-cm-primary">
                        {fmtDate(selectedClaim.deadlineDate)}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          daysRemaining(selectedClaim.deadlineDate) <= 5
                            ? 'text-yellow-400'
                            : 'text-cm-muted'
                        }`}
                      >
                        {daysRemaining(selectedClaim.deadlineDate) > 0
                          ? `${daysRemaining(selectedClaim.deadlineDate)} días restantes`
                          : daysRemaining(selectedClaim.deadlineDate) === 0
                            ? 'Vence hoy'
                            : 'Plazo vencido'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                {selectedClaim.pdfUrl && (
                  <Button
                    asChild
                    className="border border-cm-primary/30 bg-cm-primary/10 text-cm-primary hover:bg-cm-primary/20 mr-2"
                  >
                    <a href={selectedClaim.pdfUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-2" />
                      PDF
                    </a>
                  </Button>
                )}
                <Button
                  onClick={() => setShowDetailDialog(false)}
                  className="bg-cm-primary text-cm-on-primary hover:bg-cm-primary-dim"
                >
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════ */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <p className="text-xs text-cm-muted min-w-[120px] shrink-0">{label}</p>
      <p className="text-sm text-cm-primary">{value}</p>
    </div>
  )
}
