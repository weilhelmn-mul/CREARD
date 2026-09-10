import { NextResponse } from 'next/server';

// ============================================================
// CREARD - Helpers de errores de API
// Distinguir "cuota de Firestore agotada" (503, temporal) de
// "credenciales ausentes/inválidas" (401) y "sin permisos" (403).
// Antes: con la cuota agotada, toda lectura fallaba y el
// middleware devolvía 401 "Autenticacion requerida" — un error
// que confundía al usuario (parecía sesión expirada).
// ============================================================

/**
 * Detecta si un error proviene de cuota agotada / recurso agotado
 * de Firestore (RESOURCE_EXHAUSTED, gRPC code 8) u otra
 * indisponibilidad transitoria de Google.
 */
export function isQuotaError(err: unknown): boolean {
  if (!err) return false;
  const code = (err as { code?: string })?.code || '';
  const msg = err instanceof Error ? err.message : String(err);
  const haystack = `${code} ${msg}`;
  return (
    haystack.includes('RESOURCE_EXHAUSTED') ||
    haystack.includes('Quota exceeded') ||
    haystack.includes('quota exceeded')
  );
}

/**
 * Respuesta 503 estándar para cuota agotada.
 * El plan gratuito (Spark) de Firestore repone la cuota diaria a
 * medianoche (hora del Pacífico) ≈ 02:00 hora Perú.
 */
export function quotaErrorResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        'Cuota diaria de la base de datos agotada. El servicio se restablece automáticamente más tarde (o actualiza el plan de Firebase a Blaze para cuota adicional).',
      code: 'QUOTA_EXHAUSTED',
    },
    { status: 503 }
  );
}
