'use client'

// ═══════════════════════════════════════════════════════════════
// REQUISITO 1 (AUDITORÍA): Footer con datos de contacto obligatorios
// Muestra: teléfono, email, dirección física y redes sociales
// funcionales con URLs reales.
// ═══════════════════════════════════════════════════════════════

import { useSiteSettings, type ContactPhone } from '@/context/SiteSettingsContext'
import { useAppStore } from '@/store/useAppStore'

// Valores por defecto (se sobreescriben con datos de Firestore)
const DEFAULT_PHONES: ContactPhone[] = [{ label: '', number: '+51 984 000 000' }]
const DEFAULT_WHATSAPP = '51984000000'

// ═══════════════════════════════════════════════════════════════
// Componente Footer principal
// ═══════════════════════════════════════════════════════════════
export default function SiteFooter() {
  const { settings } = useSiteSettings()
  const { setView } = useAppStore()

  // REQUISITO 1: Leer campos de contacto desde SiteSettings (admin editable)
  // Si no están configurados en Firestore, usar valores por defecto
  const raw = (settings as Record<string, unknown>) || {}
  const phones: ContactPhone[] = Array.isArray(raw.contact_phones) && raw.contact_phones.length > 0
    ? raw.contact_phones as ContactPhone[]
    : DEFAULT_PHONES
  const whatsapp = (raw.contact_whatsapp as string) || DEFAULT_WHATSAPP
  const email = (raw.contact_email as string) || 'contacto@creard.com'
  const address = (raw.contact_address as string) || 'San Sebastián, Cusco, Perú'
  const businessHours = (raw.business_hours as string) || 'Lun-Dom 7:00 AM - 11:00 PM'
  const facebook = (raw.social_facebook as string) || 'https://facebook.com/creard.cusco'
  const instagram = (raw.social_instagram as string) || 'https://instagram.com/creard.cusco'
  const tiktok = (raw.social_tiktok as string) || 'https://tiktok.com/@creard.cusco'

  return (
    <footer className="bg-cm-surface-container-low border-t border-cm-border/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">

          {/* ── Columna 1: Sobre CREARD ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-cm-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-cm-on-primary text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                  sports_soccer
                </span>
              </div>
              <span className="font-[family-name:var(--font-sora)] font-bold text-lg text-cm-on-surface">
                CREARD
              </span>
            </div>
            <p className="text-sm text-cm-on-surface-variant leading-relaxed mb-4 font-[family-name:var(--font-inter)]">
              Plataforma líder en reservas de canchas deportivas en Cusco. Alquila canchas de fútbol 7 y vóley con confirmación instantánea.
            </p>
            {/* REQUISITO 1: Redes sociales funcionales con URLs reales */}
            <div className="flex items-center gap-3">
              {facebook && (
                <a
                  href={facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook de CREARD"
                  className="w-9 h-9 rounded-lg bg-cm-surface-container-highest flex items-center justify-center text-cm-on-surface-variant hover:text-[#1877F2] hover:bg-[#1877F2]/10 transition-all duration-200"
                >
                  <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              )}
              {instagram && (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram de CREARD"
                  className="w-9 h-9 rounded-lg bg-cm-surface-container-highest flex items-center justify-center text-cm-on-surface-variant hover:text-[#E4405F] hover:bg-[#E4405F]/10 transition-all duration-200"
                >
                  <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
              )}
              {tiktok && (
                <a
                  href={tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok de CREARD"
                  className="w-9 h-9 rounded-lg bg-cm-surface-container-highest flex items-center justify-center text-cm-on-surface-variant hover:text-cm-on-surface hover:bg-cm-on-surface/10 transition-all duration-200"
                >
                  <svg className="w-[16px] h-[16px]" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.43v-7.15a8.16 8.16 0 005.58 2.19V11.2a4.85 4.85 0 01-3.77-1.76V6.69h3.77z"/></svg>
                </a>
              )}
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp de CREARD"
                  className="w-9 h-9 rounded-lg bg-cm-surface-container-highest flex items-center justify-center text-cm-on-surface-variant hover:text-[#25D366] hover:bg-[#25D366]/10 transition-all duration-200"
                >
                  <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
              )}
            </div>
          </div>

          {/* ── Columna 2: Datos de contacto (REQUISITO 1) ── */}
          <div>
            <h4 className="font-[family-name:var(--font-sora)] font-semibold text-sm text-cm-on-surface mb-4 uppercase tracking-wider">
              Contacto
            </h4>
            <div className="space-y-3">
              {/* Múltiples teléfonos */}
              {phones.map((p, i) => (
                <a
                  key={i}
                  href={`tel:${p.number.replace(/\s/g, '')}`}
                  className="flex items-start gap-2.5 text-sm text-cm-on-surface-variant hover:text-cm-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0">call</span>
                  <span className="font-[family-name:var(--font-inter)]">
                    {p.label ? <>{p.label}: {p.number}</> : p.number}
                  </span>
                </a>
              ))}
              {/* Email */}
              <a
                href={`mailto:${email}`}
                className="flex items-start gap-2.5 text-sm text-cm-on-surface-variant hover:text-cm-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0">mail</span>
                <span className="font-[family-name:var(--font-inter)]">{email}</span>
              </a>
              {/* Dirección física */}
              <div className="flex items-start gap-2.5 text-sm text-cm-on-surface-variant">
                <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0">location_on</span>
                <span className="font-[family-name:var(--font-inter)]">{address}</span>
              </div>
              {/* Horario de atención */}
              <div className="flex items-start gap-2.5 text-sm text-cm-on-surface-variant">
                <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0">schedule</span>
                <span className="font-[family-name:var(--font-inter)]">{businessHours}</span>
              </div>
            </div>
          </div>

          {/* ── Columna 3: Enlaces legales (REQUISITO 2) ── */}
          <div>
            <h4 className="font-[family-name:var(--font-sora)] font-semibold text-sm text-cm-on-surface mb-4 uppercase tracking-wider">
              Legal
            </h4>
            <div className="space-y-3">
              {/* REQUISITO 2: Páginas legales independientes */}
              <button
                onClick={() => setView('terms')}
                className="flex items-center gap-2 text-sm text-cm-on-surface-variant hover:text-cm-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">description</span>
                <span className="font-[family-name:var(--font-inter)]">Términos y Condiciones</span>
              </button>
              <button
                onClick={() => setView('refund-policy')}
                className="flex items-center gap-2 text-sm text-cm-on-surface-variant hover:text-cm-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                <span className="font-[family-name:var(--font-inter)]">Política de Cambios y Devoluciones</span>
              </button>
              <button
                onClick={() => setView('claims')}
                className="flex items-center gap-2 text-sm text-cm-on-surface-variant hover:text-cm-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">gavel</span>
                <span className="font-[family-name:var(--font-inter)]">Libro de Reclamaciones</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Barra inferior ── */}
        <div className="mt-10 pt-6 border-t border-cm-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
            © {new Date().getFullYear()} CREARD. Todos los derechos reservados.
          </p>
          <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
            Resolución N.° 007-2016-CCD-INDECOPI · Ley N.° 29571
          </p>
        </div>
      </div>
    </footer>
  )
}
