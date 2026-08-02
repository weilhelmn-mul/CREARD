'use client';

// ============================================================
// CREARD - PaymentVoucher
// Professional payment voucher/receipt modal with PDF & print support
// ============================================================

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface VoucherData {
  payment_id: string;
  booking_code: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  user_document: string | null;
  court_name: string;
  sport: string;
  booking_date: string;
  booking_start_time: string;
  booking_end_time: string;
  payment_type: string;
  amount_paid: number;
  remaining_balance: number;
  payment_method_display: string;
  payment_status: string;
  payment_date: string;
  payment_time: string;
  total_price?: number;
}

interface PaymentVoucherProps {
  data: VoucherData | null;
  open: boolean;
  onClose: () => void;
}

// Helpers
const paymentTypeLabel: Record<string, string> = {
  advance: 'Adelanto (50%)',
  full_payment: 'Pago Total (100%)',
  remaining: 'Pago Restante',
};

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  parcial: {
    label: 'Parcial',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  completed: {
    label: 'Pagado',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
};

function formatCurrency(amount: number): string {
  return `S/ ${amount.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  if (dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

// Sub-components
function Separator() {
  return (
    <div className="border-t border-dashed border-cm-on-surface-variant/20 my-4" />
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-[11px] text-cm-on-surface-variant shrink-0 font-[family-name:var(--font-inter)]">
        {label}
      </span>
      <span className="text-[13px] text-cm-on-surface font-medium text-right break-words font-[family-name:var(--font-inter)]">
        {value}
      </span>
    </div>
  );
}

// Main Component
export default function PaymentVoucher({ data, open, onClose }: PaymentVoucherProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!data) return null;

  const status = statusConfig[data.payment_status] ?? statusConfig.parcial;
  const typeLabel = paymentTypeLabel[data.payment_type] ?? data.payment_type;
  const handlePrint = () => window.print();

  return createPortal(
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          body > *:not(#voucher-root) {
            display: none !important;
          }
          #voucher-root > div {
            opacity: 1 !important;
            transform: none !important;
          }
          #voucher-root {
            position: static !important;
            inset: auto !important;
            background: white !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            display: flex !important;
            align-items: flex-start !important;
            justify-content: center !important;
            padding: 0 !important;
            min-height: auto !important;
            width: 100% !important;
            overflow: visible !important;
          }
          #voucher-card {
            background: white !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          #voucher-actions {
            display: none !important;
          }
          #voucher-close-btn {
            display: none !important;
          }
          #voucher-content {
            color: #000 !important;
          }
          #voucher-content * {
            color: #000 !important;
            border-color: #ddd !important;
          }
          #voucher-content .text-cm-on-surface,
          #voucher-content .text-cm-on-surface-variant {
            color: #000 !important;
          }
          #voucher-content .text-cm-primary,
          #voucher-content .text-\[\#00ff41\] {
            color: #00802b !important;
          }
          #voucher-content .border-dashed {
            border-color: #ccc !important;
          }
          @page {
            margin: 10mm;
            size: auto;
          }
        }
      `}</style>

      <AnimatePresence>
        {open && (
          <motion.div
            id="voucher-root"
            key="voucher-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <motion.div
              id="voucher-card"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="glass-card rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative"
            >
              {/* Close button (hidden in print) */}
              <button
                id="voucher-close-btn"
                onClick={onClose}
                className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                aria-label="Cerrar comprobante"
              >
                <span
                  className="material-symbols-outlined text-cm-on-surface-variant"
                  style={{ fontVariationSettings: '"FILL" 0', fontSize: '18px' }}
                >
                  close
                </span>
              </button>

              {/* Voucher Content */}
              <div id="voucher-content" className="p-6 space-y-0">
                {/* Header */}
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-[#00ff41]/10 border border-[#00ff41]/20 flex items-center justify-center shrink-0">
                    <span
                      className="material-symbols-outlined text-[#00ff41]"
                      style={{ fontVariationSettings: '"FILL" 1', fontSize: '22px' }}
                    >
                      sports_soccer
                    </span>
                  </div>
                  <div>
                    <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold text-cm-on-surface leading-tight">
                      CREARD
                    </h2>
                    <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                      Comprobante de Pago
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Voucher / Booking codes */}
                <div className="grid grid-cols-1 gap-1.5">
                  <InfoRow label="N° Comprobante" value={data.payment_id} />
                  <InfoRow label="Código de Pago" value={data.payment_id} />
                  <InfoRow label="Código de Reserva" value={data.booking_code} />
                </div>

                <Separator />

                {/* Client Info */}
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <span
                      className="material-symbols-outlined text-cm-on-surface-variant"
                      style={{ fontVariationSettings: '"FILL" 0', fontSize: '16px' }}
                    >
                      person
                    </span>
                    <span className="text-xs font-semibold text-cm-on-surface-variant uppercase tracking-wider font-[family-name:var(--font-sora)]">
                      Datos del Cliente
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    <InfoRow label="Nombre" value={data.user_name} />
                    <InfoRow label="Correo" value={data.user_email} />
                    <InfoRow label="Teléfono" value={data.user_phone} />
                    <InfoRow label="Documento" value={data.user_document} />
                  </div>
                </div>

                <Separator />

                {/* Booking Details */}
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <span
                      className="material-symbols-outlined text-cm-on-surface-variant"
                      style={{ fontVariationSettings: '"FILL" 0', fontSize: '16px' }}
                    >
                      calendar_today
                    </span>
                    <span className="text-xs font-semibold text-cm-on-surface-variant uppercase tracking-wider font-[family-name:var(--font-sora)]">
                      Detalles de la Reserva
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    <InfoRow label="Deporte" value={data.sport} />
                    <InfoRow label="Cancha" value={data.court_name} />
                    <InfoRow label="Fecha" value={formatDate(data.booking_date)} />
                    <InfoRow
                      label="Horario"
                      value={`${data.booking_start_time} - ${data.booking_end_time}`}
                    />
                  </div>
                </div>

                <Separator />

                {/* Payment Details - Highlighted Box */}
                <div className="rounded-xl bg-[#00ff41]/5 border border-[#00ff41]/15 p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <span
                      className="material-symbols-outlined text-[#00ff41]"
                      style={{ fontVariationSettings: '"FILL" 1', fontSize: '16px' }}
                    >
                      payments
                    </span>
                    <span className="text-xs font-semibold text-[#00ff41] uppercase tracking-wider font-[family-name:var(--font-sora)]">
                      Detalles del Pago
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    <InfoRow label="Tipo de Pago" value={typeLabel} />

                    {/* Amount Paid */}
                    <div className="flex justify-between items-center gap-4 pt-1">
                      <span className="text-[11px] text-cm-on-surface-variant shrink-0 font-[family-name:var(--font-inter)]">
                        Monto Pagado
                      </span>
                      <span className="text-base font-bold text-[#00ff41] font-[family-name:var(--font-sora)]">
                        {formatCurrency(data.amount_paid)}
                      </span>
                    </div>

                    {/* Remaining Balance */}
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-[11px] text-cm-on-surface-variant shrink-0 font-[family-name:var(--font-inter)]">
                        Saldo Pendiente
                      </span>
                      <span
                        className={`text-[13px] font-semibold font-[family-name:var(--font-inter)] ${
                          data.remaining_balance > 0
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {formatCurrency(data.remaining_balance)}
                      </span>
                    </div>

                    {/* Total price if available */}
                    {data.total_price != null && (
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-[11px] text-cm-on-surface-variant shrink-0 font-[family-name:var(--font-inter)]">
                          Precio Total
                        </span>
                        <span className="text-[13px] font-medium text-cm-on-surface font-[family-name:var(--font-inter)]">
                          {formatCurrency(data.total_price)}
                        </span>
                      </div>
                    )}

                    <InfoRow label="Método de Pago" value={data.payment_method_display} />

                    {/* Status Badge */}
                    <div className="flex justify-between items-center gap-4 pt-1">
                      <span className="text-[11px] text-cm-on-surface-variant shrink-0 font-[family-name:var(--font-inter)]">
                        Estado
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${status.bg} ${status.text} ${status.border} font-[family-name:var(--font-inter)]`}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Payment Date & Time */}
                <div className="flex items-center justify-center gap-6">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="material-symbols-outlined text-cm-on-surface-variant"
                      style={{ fontVariationSettings: '"FILL" 0', fontSize: '14px' }}
                    >
                      event
                    </span>
                    <span className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                      {data.payment_date}
                    </span>
                  </div>
                  <div className="w-px h-3 bg-cm-on-surface-variant/20" />
                  <div className="flex items-center gap-1.5">
                    <span
                      className="material-symbols-outlined text-cm-on-surface-variant"
                      style={{ fontVariationSettings: '"FILL" 0', fontSize: '14px' }}
                    >
                      schedule
                    </span>
                    <span className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                      {data.payment_time}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons (hidden in print) */}
              <div id="voucher-actions" className="px-6 pb-6 pt-2 space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#00ff41]/10 border border-[#00ff41]/20 text-[#00ff41] text-sm font-semibold hover:bg-[#00ff41]/20 transition-colors font-[family-name:var(--font-sora)]"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: '"FILL" 1', fontSize: '18px' }}
                    >
                      picture_as_pdf
                    </span>
                    Descargar PDF
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cm-surface-container-highest border border-white/10 text-cm-on-surface text-sm font-semibold hover:bg-white/5 transition-colors font-[family-name:var(--font-sora)]"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: '"FILL" 0', fontSize: '18px' }}
                    >
                      print
                    </span>
                    Imprimir
                  </button>
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-cm-on-surface-variant hover:text-cm-on-surface hover:bg-white/5 transition-colors font-[family-name:var(--font-inter)]"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
