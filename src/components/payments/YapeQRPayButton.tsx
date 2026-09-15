'use client';

// ============================================================
// CREARD - YapeQRPayButton
// Muestra QR de Yape y boton "Ya realice el pago"
// Soporta paymentType: 'advance' (adelanto) o 'remaining' (restante)
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
  /** Monto a pagar en soles */
  amount: number;
  /** Nombre/email del usuario */
  userEmail?: string;
  /** Tipo de pago: 'advance' o 'remaining' */
  paymentType?: 'advance' | 'remaining';
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
  paymentType = 'advance',
  buttonText,
  className = '',
  onPaymentMarked,
  onBack,
}: YapeQRPayButtonProps) {
  const [config, setConfig] = useState<YapeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [marked, setMarked] = useState(false);
  // R6 (OLA 2 UX): copiar número/monto + nombre del pagador
  const [copied, setCopied] = useState<'numero' | 'monto' | null>(null);
  const [payerName, setPayerName] = useState('');

  const handleCopy = useCallback(async (what: 'numero' | 'monto', value: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement('textarea');
        ta.value = value;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast({ title: 'No se pudo copiar', description: 'Cópialo manualmente: ' + value, variant: 'destructive' });
    }
  }, []);

  const isRemaining = paymentType === 'remaining';
  const defaultButtonText = isRemaining
    ? 'Ya realic\u00e9 el pago del restante'
    : 'Ya realic\u00e9 el pago';
  const displayButtonText = buttonText || defaultButtonText;
  const displayAmount = isRemaining ? amount : amount;

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
        // R6-B: se envía el nombre del pagador (metadato opcional para el admin)
        body: JSON.stringify({ bookingIds, paymentType, payerName: payerName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar');
      }

      setMarked(true);
      toast({
        title: 'Pago registrado',
        description: isRemaining
          ? 'Tu pago restante queda pendiente de validaci\u00f3n. El administrador verificar\u00e1 tu pago.'
          : 'Tu reserva queda pendiente de validaci\u00f3n. Recibir\u00e1s una notificaci\u00f3n cuando se confirme.',
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
  }, [submitting, bookingIds, paymentType, isRemaining, onPaymentMarked, payerName]);

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
          {isRemaining ? 'Pago restante pendiente' : 'Pendiente de validaci\u00f3n'}
        </h3>
        <p className="text-sm text-cm-on-surface-variant text-center max-w-xs font-[family-name:var(--font-inter)]">
          {isRemaining
            ? 'El administrador validar\u00e1 tu pago restante y actualizar\u00e1 tu reserva.'
            : 'Tu reserva ha sido registrada. El administrador validar\u00e1 tu pago y recibir\u00e1s una confirmaci\u00f3n.'}
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
          Configuraci\u00f3n de Yape no disponible. Contacta al administrador.
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
              <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Número Yape</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">{config.numero_yape}</p>
                <button
                  type="button"
                  onClick={() => handleCopy('numero', config.numero_yape)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cm-surface-container-highest/70 border border-white/10 text-[11px] font-semibold text-cm-on-surface-variant hover:text-cm-primary hover:border-cm-primary/30 transition-colors active:scale-95"
                >
                  <span className="material-symbols-outlined text-[13px]">{copied === 'numero' ? 'check' : 'content_copy'}</span>
                  {copied === 'numero' ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          )}
          <div className="bg-[#00ff41]/5 border border-[#00ff41]/20 rounded-lg p-3">
            <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
              {isRemaining ? 'Monto restante a pagar' : 'Monto a pagar'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-xl font-bold text-[#00ff41] font-[family-name:var(--font-sora)]">S/ {displayAmount.toFixed(2)}</p>
              <button
                type="button"
                onClick={() => handleCopy('monto', displayAmount.toFixed(2))}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cm-surface-container-highest/70 border border-white/10 text-[11px] font-semibold text-cm-on-surface-variant hover:text-cm-primary hover:border-cm-primary/30 transition-colors active:scale-95"
              >
                <span className="material-symbols-outlined text-[13px]">{copied === 'monto' ? 'check' : 'content_copy'}</span>
                {copied === 'monto' ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions — R6 (OLA 2): pasos guiados, sin memorizar nada */}
      <div className="w-full max-w-xs mb-4 space-y-1.5">
        {[
          'Abre Yape y escanea el QR (o usa el n\u00famero copiado).',
          'Yapea el MONTO EXACTO y escribe tu nombre en el mensaje.',
          'Vuelve aqu\u00ed y toca el bot\u00f3n verde.',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-cm-primary/15 text-cm-primary text-[10px] font-bold mt-0.5">{i + 1}</span>
            <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)] leading-snug">{step}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-cm-on-surface-variant text-center max-w-xs mb-4 font-[family-name:var(--font-inter)]">
        {config.mensaje || 'Escanea el c\u00f3digo QR con la aplicaci\u00f3n Yape y realiza el pago del monto correspondiente.'}
      </p>

      {/* R6-B: nombre con el que yapea — facilita la validación del admin */}
      <div className="w-full max-w-xs mb-4">
        <label htmlFor="yape-payer-name" className="block text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-1">
          ¿Con qué nombre yapeaste? (opcional, ayuda a validar más rápido)
        </label>
        <input
          id="yape-payer-name"
          type="text"
          value={payerName}
          onChange={(e) => setPayerName(e.target.value)}
          maxLength={60}
          autoComplete="name"
          placeholder="Ej: Juan Pérez"
          className="w-full px-3 py-2.5 bg-cm-surface-container-highest/40 border border-white/10 rounded-xl text-[16px] text-cm-on-surface placeholder:text-cm-on-surface-variant/40 focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
        />
      </div>

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
            {displayButtonText}
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
