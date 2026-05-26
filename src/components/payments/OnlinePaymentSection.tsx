'use client';

// ============================================================
// CREARD - OnlinePaymentSection
// Sección de pago en línea que integra CulqiPayButton
// Incluye info de la reserva y opciones manuales como fallback
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CulqiPayButton from './CulqiPayButton';

interface OnlinePaymentSectionProps {
  bookingId: string;
  courtName?: string;
  date?: string;
  timeSlot?: string;
  totalAmount: number;
  remainingAmount?: number;
  paymentType: 'advance' | 'remaining';
  userEmail: string;
  onPaymentSuccess?: () => void;
  onManualPayment?: () => void;
  showManualOptions?: boolean;
}

export default function OnlinePaymentSection({
  bookingId,
  courtName,
  date,
  timeSlot,
  totalAmount,
  remainingAmount,
  paymentType,
  userEmail,
  onPaymentSuccess,
  onManualPayment,
  showManualOptions = true,
}: OnlinePaymentSectionProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'online' | 'manual'>('online');

  const effectiveRemaining = remainingAmount ?? totalAmount;

  const handleSuccess = () => {
    setShowSuccess(true);
    onPaymentSuccess?.();
  };

  return (
    <div className="space-y-4">
      {/* Resumen de la reserva */}
      {(courtName || date || timeSlot) && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
          <h4 className="text-xs font-semibold text-cm-on-surface-variant uppercase tracking-wider font-[family-name:var(--font-inter)]">
            Detalle de la reserva
          </h4>
          {courtName && (
            <div className="flex justify-between text-sm">
              <span className="text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Cancha</span>
              <span className="text-cm-on-surface font-medium font-[family-name:var(--font-inter)]">{courtName}</span>
            </div>
          )}
          {date && (
            <div className="flex justify-between text-sm">
              <span className="text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Fecha</span>
              <span className="text-cm-on-surface font-[family-name:var(--font-inter)]">{date}</span>
            </div>
          )}
          {timeSlot && (
            <div className="flex justify-between text-sm">
              <span className="text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Horario</span>
              <span className="text-cm-on-surface font-[family-name:var(--font-inter)]">{timeSlot}</span>
            </div>
          )}
          <div className="h-px bg-white/10" />
          <div className="flex justify-between text-sm">
            <span className="text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
              {paymentType === 'advance' ? 'Total' : 'Saldo pendiente'}
            </span>
            <span className="text-cm-primary font-bold text-lg font-[family-name:var(--font-sora)]">
              S/ {effectiveRemaining.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Tabs: Online / Manual */}
      {showManualOptions && (
        <div className="flex rounded-xl bg-white/5 border border-white/10 p-1">
          <button
            onClick={() => setActiveTab('online')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 font-[family-name:var(--font-inter)] flex items-center justify-center gap-1.5
              ${activeTab === 'online'
                ? 'bg-cm-primary text-cm-on-primary shadow-sm'
                : 'text-cm-on-surface-variant hover:text-cm-on-surface'
              }`}
          >
            <span className="material-symbols-outlined text-[16px]">lock</span>
            En Linea
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 font-[family-name:var(--font-inter)] flex items-center justify-center gap-1.5
              ${activeTab === 'manual'
                ? 'bg-cm-primary text-cm-on-primary shadow-sm'
                : 'text-cm-on-surface-variant hover:text-cm-on-surface'
              }`}
          >
            <span className="material-symbols-outlined text-[16px]">storefront</span>
            Manual
          </button>
        </div>
      )}

      {/* Contenido de tabs */}
      <AnimatePresence mode="wait">
        {activeTab === 'online' && (
          <motion.div
            key="online"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            <CulqiPayButton
              bookingId={bookingId}
              totalAmount={totalAmount}
              remainingAmount={remainingAmount}
              paymentType={paymentType}
              userEmail={userEmail}
              buttonText={paymentType === 'advance' ? 'Pagar Adelanto' : 'Pagar en Linea'}
              onSuccess={handleSuccess}
            />

            {/* Badge de seguridad */}
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <span className="material-symbols-outlined text-cm-on-surface-variant/30 text-[14px]">verified_user</span>
              <span className="text-[10px] text-cm-on-surface-variant/30 font-[family-name:var(--font-inter)]">
                Pagos seguros procesados por Culqi
              </span>
            </div>
          </motion.div>
        )}

        {activeTab === 'manual' && showManualOptions && onManualPayment && (
          <motion.div
            key="manual"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            {onManualPayment()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
