'use client';

// ============================================================
// CREARD - YapeQRPayButton
// Muestra QR de Yape y boton "Ya realice el pago"
// La reserva queda en estado 'payment_pending' hasta que
// el administrador valide manualmente.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuthHeaders } from '@/lib/auth-helpers';
import { toast } from '@/hooks/use-toast';
import Image from 'next/image';

interface YapeConfig {
  qr_url: string;
  nombre_titular: string;
  numero_yape: string;
  mensaje: string;
  activo: boolean;
}

interface YapeQRPayButtonProps {
  /** IDs de reservas en Firestore */
  bookingIds: string[];
  /** Monto a pagar (adelanto) en soles */
  amount: number;
  /** Nombre/email del usuario */
  userEmail?: string;
  /** Texto del boton */
  buttonText?: string;
  /** Clase CSS adicional */
  className?: string;
  /** Callback cuando el usuario marca como pagado */
  onPaymentMarked?: () => void;
  /** Callback para volver atras */
  onBack?: () => void;
}

export default function YapeQRPayButton({
  bookingIds,
  amount,
  userEmail = '',
  buttonText = 'Ya realic\u00e9 el pago',
  className = '',
  onPaymentMarked,
  onBack,
}: YapeQRPayButtonProps) {
  const [config, setConfig] = useState<YapeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [marked, setMarked] = useState(false);

  // Fetch Yape config
  useEffect(() => {
    fetch('/api/yape-config')
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleMarkPaid = useCallback(async () => {
    if (submitting || bookingIds.length === 0) return;
    setSubmitting(true);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/payment-validation', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingIds }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar');
      }

      setMarked(true);
      toast({
        title: 'Pago registrado',
        description: 'Tu reserva queda pendiente de validacion. Recibiras una notificacion cuando se confirme.',
      });
      onPaymentMarked?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }, [submitting, bookingIds, onPaymentMarked]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#00ff41]/30 border-t-[#00ff41] rounded-full animate-spin" />
      </div>
    );
  }

  if (marked) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center py-8"
      >
        <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-amber-400 text-[40px]" style={{ fontVariationSettings: '"FILL" 1' }}>hourglass_top</span>
        </div>
        <h3 className="font-[family-name:var(--font-sora)] text-lg font-bold text-cm-on-surface mb-2">
          Pendiente de validacion
        </h3>
        <p className="text-sm text-cm-on-surface-variant text-center max-w-xs font-[family-name:var(--font-inter)]">
          Tu reserva ha sido registrada. El administrador validara tu pago y recibiras una confirmacion.
        </p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-6 px-6 py-2.5 bg-cm-surface-container-highest border border-white/10 rounded-xl text-cm-on-surface text-sm font-medium hover:bg-white/5 transition-colors font-[family-name:var(--font-inter)]"
          >
            Volver
          </button>
        )}
      </motion.div>
    );
  }

  if (!config?.qr_url) {
    return (
      <div className="text-center py-8">
        <p className="text-cm-on-surface-variant text-sm font-[family-name:var(--font-inter)]">
          Configuracion de Yape no disponible. Contacta al administrador.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* QR Code */}
      <div className="glass-card rounded-2xl p-5 mb-5 w-full max-w-xs">
        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-white mb-4">
          {config.qr_url.startsWith('data:') ? (
            <Image
              src={config.qr_url}
              alt="QR Yape"
              fill
              className="object-contain"
              unoptimized
            />
          ) : (
            <img
              src={config.qr_url}
              alt="QR Yape"
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {/* Payment info */}
        <div className="space-y-3 text-center">
          {config.nombre_titular && (
            <div>
              <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Titular</p>
              <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">{config.nombre_titular}</p>
            </div>
          )}
          {config.numero_yape && (
            <div>
              <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Numero Yape</p>
              <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">{config.numero_yape}</p>
            </div>
          )}
          <div className="bg-[#00ff41]/5 border border-[#00ff41]/20 rounded-lg p-3">
            <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Monto a pagar</p>
            <p className="text-xl font-bold text-[#00ff41] font-[family-name:var(--font-sora)]">S/ {amount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-xs text-cm-on-surface-variant text-center max-w-xs mb-5 font-[family-name:var(--font-inter)]">
        {config.mensaje || 'Escanea el codigo QR con la aplicacion Yape y realiza el pago del monto correspondiente.'}
      </p>

      {/* Mark as paid button */}
      <button
        type="button"
        onClick={handleMarkPaid}
        disabled={submitting}
        className="w-full max-w-xs py-3.5 bg-[#00ff41] text-[#003907] font-semibold rounded-xl hover:bg-[#00e639] transition-all glow-accent font-[family-name:var(--font-sora)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <div className="w-5 h-5 border-2 border-[#003907]/30 border-t-[#003907] rounded-full animate-spin" />
        ) : (
          <>
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
            {buttonText}
          </>
        )}
      </button>

      {/* Security note */}
      <div className="flex items-center gap-2 mt-4">
        <span className="material-symbols-outlined text-[14px] text-cm-on-surface-variant/40" style={{ fontVariationSettings: '"FILL" 1' }}>lock</span>
        <span className="text-[10px] text-cm-on-surface-variant/40 font-[family-name:var(--font-inter)]">
          Pago seguro mediante Yape
        </span>
      </div>
    </div>
  );
}
