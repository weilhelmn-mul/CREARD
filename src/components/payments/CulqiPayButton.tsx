'use client';

// ============================================================
// CREARD - CulqiPayButton
// Botón de pago profesional con Culqi Checkout v4
// Soporta: Yape, Plin, Visa, MC, Amex, Diners Club
// Flujo: Click → Checkout → Token → Backend → Resultado
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuthHeaders } from '@/lib/auth-helpers';

// ── Tipos ──

type PaymentType = 'advance' | 'remaining';
type PaymentStep = 'idle' | 'select-amount' | 'checkout-open' | 'processing' | 'success' | 'error';

interface CulqiPayButtonProps {
  /** ID de la reserva en Firestore */
  bookingId: string;
  /** Monto total de la reserva en soles */
  totalAmount: number;
  /** Saldo pendiente (para pagos restantes) */
  remainingAmount?: number;
  /** Tipo de pago: adelanto o restante */
  paymentType: PaymentType;
  /** Email del usuario para Culqi */
  userEmail: string;
  /** Texto personalizado del botón */
  buttonText?: string;
  /** Clase CSS adicional para el botón */
  className?: string;
  /** Callback cuando el pago es exitoso */
  onSuccess?: (result: PaymentResult) => void;
  /** Callback cuando falla el pago */
  onError?: (error: string) => void;
  /** Callback cuando el usuario cierra el checkout */
  onClose?: () => void;
}

interface PaymentResult {
  paymentId: string;
  chargeId: string;
  amount: number;
  method: string;
  state: string;
  outcome: string;
}

interface CulqiToken {
  id: string;
  type: string;
  creation_date: number;
}

interface CulqiError {
  merchant_message: string;
  user_message: string;
  code: string;
}

// ── Montos predefinidos para selector ──

function getAmountOptions(
  paymentType: PaymentType,
  totalAmount: number,
  remainingAmount?: number
): { label: string; value: number; description: string }[] {
  const effective = remainingAmount ?? totalAmount;
  const half = Math.ceil(effective * 100) / 200; // 50% redondeado

  if (paymentType === 'advance') {
    return [
      {
        label: `S/ ${half.toFixed(2)}`,
        value: half,
        description: 'Adelanto del 50%',
      },
      {
        label: `S/ ${effective.toFixed(2)}`,
        value: effective,
        description: 'Pago completo (100%)',
      },
    ];
  }

  return [
    {
      label: `S/ ${half.toFixed(2)}`,
      value: half,
      description: 'Mitad del saldo',
    },
    {
      label: `S/ ${effective.toFixed(2)}`,
      value: effective,
      description: 'Pago completo del saldo',
    },
  ];
}

// ── Hook para cargar Culqi SDK ──

function useCulqiSDK() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar si el SDK ya está cargado
    if (typeof window !== 'undefined' && (window as any).Culqi) {
      setLoaded(true);
      return;
    }

    // Cargar SDK de Culqi Checkout v4
    const script = document.createElement('script');
    script.src = 'https://checkout.culqi.com/js/v4';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setLoaded(true);
      console.log('[CREARD] Culqi Checkout v4 cargado exitosamente.');
    };

    script.onerror = () => {
      setError('No se pudo cargar el sistema de pagos. Verifica tu conexión.');
      console.error('[CREARD] Error al cargar Culqi SDK.');
    };

    document.head.appendChild(script);

    return () => {
      // Limpiar listeners al desmontar
      document.removeEventListener('culqi:token:created', handleTokenCreated);
      document.removeEventListener('culqi:error', handleCulqiError);
      document.removeEventListener('culqi:closed', handleCheckoutClosed);
    };
  }, []);

  return { loaded, error };
}

// Variables para callbacks del SDK (globales para los event listeners)
let _tokenResolver: ((token: CulqiToken) => void) | null = null;
let _errorResolver: ((error: CulqiError) => void) | null = null;
let _closeResolver: (() => void) | null = null;

function handleTokenCreated(e: any) {
  const token = e.detail?.token || e.detail;
  if (token && _tokenResolver) {
    _tokenResolver(token);
  }
}

function handleCulqiError(e: any) {
  const error = e.detail?.error || e.detail;
  if (error && _errorResolver) {
    _errorResolver(error);
  }
}

function handleCheckoutClosed() {
  if (_closeResolver) {
    _closeResolver();
  }
}

// ── Componente Principal ──

export default function CulqiPayButton({
  bookingId,
  totalAmount,
  remainingAmount,
  paymentType,
  userEmail,
  buttonText,
  className = '',
  onSuccess,
  onError,
  onClose,
}: CulqiPayButtonProps) {
  const { loaded, error: sdkError } = useCulqiSDK();
  const [step, setStep] = useState<PaymentStep>('idle');
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<PaymentResult | null>(null);

  const publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;

  // ── Abrir Checkout de Culqi ──

  const openCulqiCheckout = useCallback(async (amount: number) => {
    if (!publicKey || typeof window === 'undefined' || !(window as any).Culqi) {
      setErrorMsg('Sistema de pagos no disponible.');
      onError?.('Sistema de pagos no disponible.');
      return;
    }

    setSelectedAmount(amount);
    setStep('checkout-open');

    const Culqi = (window as any).Culqi;

    try {
      // Limpiar listeners previos
      document.removeEventListener('culqi:token:created', handleTokenCreated);
      document.removeEventListener('culqi:error', handleCulqiError);
      document.removeEventListener('culqi:closed', handleCheckoutClosed);

      // Registrar nuevos listeners
      document.addEventListener('culqi:token:created', handleTokenCreated);
      document.addEventListener('culqi:error', handleCulqiError);
      document.addEventListener('culqi:closed', handleCheckoutClosed);

      // Promesas para los eventos
      const tokenPromise = new Promise<CulqiToken>((resolve) => {
        _tokenResolver = resolve;
      });

      const errorPromise = new Promise<never>((_, reject) => {
        _errorResolver = (err: CulqiError) => reject(err);
      });

      const closePromise = new Promise<never>((_, reject) => {
        _closeResolver = () => reject(new Error('closed'));
      });

      // Configurar y abrir el Checkout
      Culqi.publicKey = publicKey;
      Culqi.settings({
        title: 'CREARD',
        currency: 'PEN',
        description: paymentType === 'advance'
          ? `Adelanto Reserva #${bookingId.substring(0, 8)}`
          : `Pago Restante #${bookingId.substring(0, 8)}`,
        amount: Math.round(amount * 100), // Convertir a céntimos
      });

      Culqi.open();

      // Esperar resultado del checkout
      const token = await Promise.race([
        tokenPromise,
        errorPromise,
        closePromise,
      ]);

      // Token recibido - enviar al backend
      await processPayment(token, amount);

    } catch (err: any) {
      if (err?.message === 'closed') {
        // Usuario cerró el checkout
        console.log('[CREARD] Checkout cerrado por el usuario.');
        setStep('idle');
        onClose?.();
        return;
      }

      // Error del checkout
      const culqiErr = err as CulqiError;
      const message = culqiErr?.user_message || culqiErr?.merchant_message || 'Error en el checkout de pagos.';
      setErrorMsg(message);
      setStep('error');
      onError?.(message);
    }
  }, [publicKey, bookingId, paymentType, userEmail, onSuccess, onError, onClose]);

  // ── Procesar pago en el backend ──

  const processPayment = useCallback(async (token: CulqiToken, amount: number) => {
    setStep('processing');
    setErrorMsg('');

    try {
      const response = await fetch('/api/payments/process', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          culqiToken: token.id,
          bookingId,
          amount,
          type: paymentType,
          email: userEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data.error || 'Error al procesar el pago.';
        setErrorMsg(message);
        setStep('error');
        onError?.(message);
        return;
      }

      const paymentResult: PaymentResult = {
        paymentId: data.id,
        chargeId: data.chargeId,
        amount: data.amount,
        method: data.method,
        state: data.state,
        outcome: data.outcome,
      };

      setResult(paymentResult);
      setStep('success');
      onSuccess?.(paymentResult);

    } catch (err: any) {
      const message = err.message || 'Error de conexión al procesar el pago.';
      setErrorMsg(message);
      setStep('error');
      onError?.(message);
    }
  }, [bookingId, paymentType, userEmail, onSuccess, onError]);

  // ── Resetear estado ──

  const reset = useCallback(() => {
    setStep('idle');
    setErrorMsg('');
    setResult(null);
    setSelectedAmount(0);
  }, []);

  // ── No renderizar si no hay llave pública ──
  if (!publicKey) {
    return null;
  }

  // ── Obtener opciones de monto ──
  const effectiveAmount = remainingAmount ?? totalAmount;
  const amountOptions = getAmountOptions(paymentType, totalAmount, remainingAmount);

  // ── Renderizar según paso actual ──

  return (
    <div className={className}>
      <AnimatePresence mode="wait">

        {/* ── PASO 1: Botón principal ── */}
        {step === 'idle' && (
          <motion.button
            key="pay-button"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setStep('select-amount')}
            disabled={!!sdkError || !loaded}
            className="w-full py-3.5 bg-cm-primary text-cm-on-primary font-semibold rounded-xl
              hover:bg-cm-primary-dim transition-all duration-200 glow-accent
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
              font-[family-name:var(--font-sora)] flex items-center justify-center gap-2"
          >
            {sdkError ? (
              <>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>error</span>
                {sdkError}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>lock</span>
                {buttonText || `Pagar en Linea`}
              </>
            )}
          </motion.button>
        )}

        {/* ── PASO 2: Selector de monto ── */}
        {step === 'select-amount' && (
          <motion.div
            key="amount-selector"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                {paymentType === 'advance' ? 'Selecciona el monto del adelanto:' : 'Selecciona el monto a pagar:'}
              </p>
              <button onClick={reset}
                className="text-xs text-cm-on-surface-variant hover:text-cm-primary transition-colors">
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {amountOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => openCulqiCheckout(option.value)}
                  disabled={!loaded}
                  className="relative p-4 rounded-xl border border-white/10
                    hover:border-cm-primary/40 hover:bg-cm-primary/5
                    active:bg-cm-primary/10 transition-all duration-200
                    disabled:opacity-40 disabled:cursor-not-allowed group"
                >
                  <p className="text-lg font-bold text-cm-primary font-[family-name:var(--font-sora)]">
                    {option.label}
                  </p>
                  <p className="text-xs text-cm-on-surface-variant mt-1 font-[family-name:var(--font-inter)]">
                    {option.description}
                  </p>
                  <span className="material-symbols-outlined absolute top-2 right-2 text-cm-on-surface-variant/30 group-hover:text-cm-primary/50 text-[18px] transition-colors">
                    arrow_forward
                  </span>
                </button>
              ))}
            </div>

            {/* Logos de métodos de pago aceptados */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <span className="text-[10px] text-cm-on-surface-variant/40 font-[family-name:var(--font-inter)]">
                Aceptamos:
              </span>
              {['Yape', 'Plin', 'Visa', 'MC', 'Amex', 'Diners'].map((brand) => (
                <span key={brand} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-cm-on-surface-variant/50 font-[family-name:var(--font-inter)]">
                  {brand}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── PASO 3: Checkout abierto ── */}
        {step === 'checkout-open' && (
          <motion.div
            key="checkout-open"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 py-4"
          >
            <div className="relative">
              <span className="material-symbols-outlined animate-spin text-cm-primary text-[32px]">progress_activity</span>
            </div>
            <p className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)] text-center">
              Completa el pago en la ventana de Culqi...
            </p>
            <p className="text-xs text-cm-on-surface-variant/50 font-[family-name:var(--font-inter)]">
              S/ {selectedAmount.toFixed(2)}
            </p>
            <button onClick={() => {
              // Cerrar checkout de Culqi si es posible
              try {
                if ((window as any).Culqi?.close) {
                  (window as any).Culqi.close();
                }
              } catch { /* ignore */ }
              setStep('idle');
            }}
              className="text-xs text-cm-on-surface-variant hover:text-cm-error transition-colors">
              Cancelar
            </button>
          </motion.div>
        )}

        {/* ── PASO 4: Procesando ── */}
        {step === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 py-4"
          >
            <span className="material-symbols-outlined animate-spin text-cm-primary text-[32px]">progress_activity</span>
            <p className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
              Procesando tu pago...
            </p>
            <p className="text-xs text-cm-on-surface-variant/50 font-[family-name:var(--font-inter)]">
              Esto puede tomar unos segundos
            </p>
          </motion.div>
        )}

        {/* ── PASO 5: Exito ── */}
        {step === 'success' && result && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="rounded-xl p-4 bg-green-500/10 border border-green-500/20"
          >
            <div className="flex items-start gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
              >
                <span className="material-symbols-outlined text-green-400 text-[28px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                  check_circle
                </span>
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-400 font-[family-name:var(--font-sora)]">
                  Pago exitoso
                </p>
                <p className="text-xs text-cm-on-surface-variant mt-1 font-[family-name:var(--font-inter)]">
                  {result.outcome}
                </p>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-cm-on-surface-variant/60 font-[family-name:var(--font-inter)]">Monto</span>
                    <span className="text-green-400 font-semibold font-[family-name:var(--font-inter)]">
                      S/ {result.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-cm-on-surface-variant/60 font-[family-name:var(--font-inter)]">Metodo</span>
                    <span className="text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                      {result.method}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-cm-on-surface-variant/60 font-[family-name:var(--font-inter)]">ID Cargo</span>
                    <span className="text-cm-on-surface-variant/70 font-mono text-[10px]">
                      {result.chargeId.substring(0, 16)}...
                    </span>
                  </div>
                  {result.state === 'pending' && (
                    <div className="mt-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <p className="text-[11px] text-yellow-400 font-[family-name:var(--font-inter)]">
                        El pago esta pendiente de confirmacion (Yape/Plin). La reserva se actualizara automaticamente cuando se confirme.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── PASO 6: Error ── */}
        {step === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="rounded-xl p-4 bg-cm-error-container/10 border border-cm-error/20"
          >
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-cm-error text-[24px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                error
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-cm-error font-[family-name:var(--font-sora)]">
                  Pago fallido
                </p>
                <p className="text-xs text-cm-on-surface-variant mt-1 font-[family-name:var(--font-inter)]">
                  {errorMsg}
                </p>
                <button
                  onClick={reset}
                  className="mt-3 text-xs text-cm-primary hover:text-cm-primary-dim transition-colors font-[family-name:var(--font-inter)] font-medium"
                >
                  Intentar nuevamente
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
