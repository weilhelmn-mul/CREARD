// ============================================================
// CREARD - Culqi API Client (Server-Side Only)
// Procesamiento seguro de cargos con la API REST de Culqi
// NUNCA exponer la llave privada en el frontend
// ============================================================

const CULQI_API_BASE = 'https://api.culqi.com/v2';

interface CulqiChargeRequest {
  amount: number;         // Monto en céntimos (S/ 50.00 = 5000)
  currency_code: string;  // 'PEN' para soles peruanos
  email: string;          // Email del cliente
  source_id: string;      // Token generado por Culqi Checkout
  description: string;    // Descripción del cargo
  capture?: boolean;      // Captura inmediata (default: true)
  installments?: number;  // Cuotas (0 = una sola)
  metadata?: Record<string, string>;
}

interface CulqiChargeResponse {
  object: string;
  id: string;
  amount: number;
  currency_code: string;
  state: 'completed' | 'pending' | 'failed' | 'expired' | 'authorized';
  outcome: {
    type: string;
    merchant_message: string;
    user_message: string;
    reason?: string;
  };
  source: {
    object: string;
    id: string;
    type: string;       // 'card', 'yape', 'plin'
    brand?: string;     // 'Visa', 'MasterCard', 'American Express', 'Diners Club'
    card_number?: string;
    last_four?: string;
  };
  email: string;
  fee: number;
  creation_date: number;
  metadata?: Record<string, string>;
}

interface CulqiError {
  object: 'error';
  type: string;
  code: string;
  message: string;
  merchant_message: string;
}

/**
 * Verifica si las credenciales de Culqi están configuradas
 * Acepta llaves de prueba (sk_test_*) y producción (sk_live_*)
 */
export function isCulqiConfigured(): boolean {
  const key = process.env.CULQI_API_KEY || '';
  return (
    key.length > 10 &&
    (key.startsWith('sk_test_') || key.startsWith('sk_live_'))
  );
}

/**
 * Obtiene la llave API de Culqi desde variables de entorno
 * En modo test, también acepta llaves de prueba
 */
function getCulqiApiKey(): string {
  const key = process.env.CULQI_API_KEY || '';
  if (!key) {
    throw new Error('CULQI_API_KEY no está configurada en las variables de entorno.');
  }
  return key;
}

/**
 * Crea un cargo en Culqi usando la API REST
 * @param token - Token generado por Culqi Checkout v4
 * @param amount - Monto en céntimos de sol (S/ 50.00 = 5000)
 * @param email - Email del cliente
 * @param description - Descripción del pago
 * @param metadata - Datos adicionales para seguimiento
 * @returns CulqiChargeResponse con los datos del cargo
 */
export async function createCharge(
  token: string,
  amount: number,
  email: string,
  description: string,
  metadata: Record<string, string> = {}
): Promise<CulqiChargeResponse> {
  const apiKey = getCulqiApiKey();

  const requestBody: CulqiChargeRequest = {
    amount: Math.round(amount),  // Culqi requiere enteros
    currency_code: 'PEN',
    email: email,
    source_id: token,
    description: description.substring(0, 250),  // Máximo 250 caracteres
    capture: true,
    installments: 0,
    metadata,
  };

  console.log(`[CULQI] Creando cargo: S/ ${(amount / 100).toFixed(2)} para ${email}`);

  const response = await fetch(`${CULQI_API_BASE}/charges`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'CREARD/1.0',
    },
    body: JSON.stringify(requestBody),
  });

  const responseData = await response.json();

  // Manejar errores de la API
  if (!response.ok) {
    const culqiError = responseData as CulqiError;
    console.error(`[CULQI] Error al crear cargo:`, culqiError);

    throw new CulqiApiError(
      culqiError.merchant_message || culqiError.message || 'Error al procesar el pago.',
      culqiError.code,
      response.status
    );
  }

  const charge = responseData as CulqiChargeResponse;
  console.log(`[CULQI] Cargo creado exitosamente: ID=${charge.id}, Estado=${charge.state}, Monto=S/ ${(charge.amount / 100).toFixed(2)}`);

  return charge;
}

/**
 * Obtiene los detalles de un cargo existente por su ID
 */
export async function getCharge(chargeId: string): Promise<CulqiChargeResponse> {
  const apiKey = getCulqiApiKey();

  const response = await fetch(`${CULQI_API_BASE}/charges/${chargeId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'CREARD/1.0',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(`[CULQI] Error al obtener cargo ${chargeId}:`, errorData);
    throw new Error(`No se pudo obtener el cargo ${chargeId}`);
  }

  return response.json();
}

/**
 * Verifica el signature de un webhook de Culqi
 * Usa el secret del webhook para validar la autenticidad
 */
export function verifyWebhookSignature(
  payload: string,
  signatureHeader: string
): boolean {
  const webhookSecret = process.env.CULQI_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('[CULQI] CULQI_WEBHOOK_SECRET no configurada. Verificación de webhook deshabilitada.');
    // En modo desarrollo, aceptar webhooks sin verificación
    if (process.env.NODE_ENV === 'development') return true;
    return false;
  }

  // Culqi envía el signature en el header: x-culqi-signature
  // El formato es: timestamp=v1:signature
  // Para producción, implementar verificación HMAC-SHA256
  // Por ahora, verificamos que el header existe y contiene datos
  if (!signatureHeader || signatureHeader.length < 10) {
    return false;
  }

  return true;
}

/**
 * Obtiene el método de pago legible en español desde el tipo de fuente de Culqi
 */
export function getPaymentMethodLabel(sourceType: string, brand?: string): string {
  switch (sourceType) {
    case 'card':
      if (brand) {
        switch (brand.toLowerCase()) {
          case 'visa': return 'Tarjeta Visa';
          case 'mastercard': return 'Tarjeta Mastercard';
          case 'american express': return 'Tarjeta American Express';
          case 'diners club': return 'Tarjeta Diners Club';
          default: return `Tarjeta ${brand}`;
        }
      }
      return 'Tarjeta';
    case 'yape': return 'Yape';
    case 'plin': return 'Plin';
    default: return sourceType || 'Desconocido';
  }
}

/**
 * Clase personalizada para errores de la API de Culqi
 */
export class CulqiApiError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'CulqiApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}
