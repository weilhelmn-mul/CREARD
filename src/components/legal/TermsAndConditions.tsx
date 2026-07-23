'use client'

// ═══════════════════════════════════════════════════════════════
// REQUISITO 2 (AUDITORÍA): Página independiente de
// Términos y Condiciones - contenido legal completo
// ═══════════════════════════════════════════════════════════════

import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'

export default function TermsAndConditions() {
  const { setView } = useAppStore()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto px-4 py-6"
    >
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => setView('home')}
          className="w-9 h-9 rounded-xl bg-cm-surface-container-highest flex items-center justify-center text-cm-on-surface-variant hover:text-cm-primary transition-colors"
          aria-label="Volver al inicio"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div>
          <h1 className="font-[family-name:var(--font-sora)] text-xl md:text-2xl font-bold text-cm-on-surface">
            Términos y Condiciones
          </h1>
          <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
            Última actualización: julio 2025
          </p>
        </div>
      </div>

      <article className="space-y-5 text-sm text-cm-on-surface font-[family-name:var(--font-inter)] leading-relaxed">
        <Section title="1. Datos del Proveedor">
          CREARD es una plataforma de reservas de canchas deportivas con sede en San Sebastián, Cusco, Perú.
          Los servicios se prestan exclusivamente en las instalaciones físicas del proveedor. Para consultas,
          puede contactarnos a través de los datos indicados en el pie de página de esta aplicación web.
        </Section>

        <Section title="2. Objeto del Servicio">
          CREARD facilita la reserva en línea de canchas deportivas (fútbol 7 y vóley) disponibles en sus
          instalaciones. La reserva confirma el uso del espacio deportivo por el tiempo y horario seleccionado,
          sujeto a disponibilidad y pago del adelanto correspondiente.
        </Section>

        <Section title="3. Registro del Usuario">
          Para realizar reservas, el usuario debe registrarse proporcionando nombre completo, número de
          documento de identidad (DNI, CE, PTE, RUC o Pasaporte), correo electrónico y número telefónico.
          El usuario es responsable de la veracidad de los datos proporcionados. CREARD se reserva el derecho
          de suspender cuentas con datos falsos o incompletos.
        </Section>

        <Section title="4. Proceso de Reserva y Pago">
          <p className="mb-2">
            <strong>4.1 Adelanto:</strong> Para confirmar una reserva, el usuario debe pagar el 50% del monto total
            mediante los métodos de pago habilitados (Yape, Plin, efectivo, tarjeta). El monto restante se
            paga directamente en las instalaciones el día de la reserva.
          </p>
          <p className="mb-2">
            <strong>4.2 Precios:</strong> Los precios son publicados en la aplicación web y pueden variar según
            el turno (mañana o noche) y el tipo de cancha. Los precios mostrados incluyen IGV donde corresponda.
          </p>
          <p>
            <strong>4.3 Confirmación:</strong> La reserva se considera confirmada una vez recibido el pago del
            adelanto y la confirmación enviada al usuario por la plataforma.
          </p>
        </Section>

        <Section title="5. Cancelaciones y Reembolsos">
          Las condiciones de cancelación y reembolso se detallan en nuestra Política de Cambios y Devoluciones
          disponible en esta misma aplicación. En general, las cancelaciones realizadas con al menos 12 horas
          de anticipación serán elegibles para reembolso del adelanto o reprogramación sin costo adicional.
        </Section>

        <Section title="6. Uso de las Instalaciones">
          El usuario se compromete a utilizar las instalaciones de manera responsable, respetando las normas
          de convivencia, el equipamiento proporcionado y los horarios asignados. CREARD no se hace
          responsable por daños personales o a bienes de terceros derivados del uso de las instalaciones.
        </Section>

        <Section title="7. Libro de Reclamaciones">
          De conformidad con el Código de Protección y Defensa del Consumidor (Ley N.° 29571) y la
          Resolución N.° 007-2016-CCD-INDECOPI, CREARD pone a disposición de sus usuarios el Libro de
          Reclamaciones Virtual, accesible desde esta aplicación web. Las quejas y reclamos serán atendidos
          en un plazo máximo de 15 días hábiles.
        </Section>

        <Section title="8. Protección de Datos Personales">
          CREARD recopila y procesa datos personales exclusivamente para la prestación del servicio de
          reservas, la gestión de pagos y la atención de reclamos. Los datos no serán compartidos con
          terceros sin consentimiento expreso del usuario, salvo requerimiento legal. El usuario puede
          solicitar la eliminación de sus datos personales en cualquier momento contactando al proveedor.
        </Section>

        <Section title="9. Modificaciones">
          CREARD se reserva el derecho de modificar estos Términos y Condiciones en cualquier momento.
          Las modificaciones entrarán en vigencia desde su publicación en esta aplicación. El uso continuado
          del servicio después de la publicación constituye aceptación de los cambios.
        </Section>

        <Section title="10. Legislación Aplicable">
          Para cualquier controversia derivada del uso de esta plataforma o la prestación del servicio,
          las partes se someten a la jurisdicción de los Juzgados de Cusco, Perú, y a la aplicación de
          la legislación peruana vigente, incluyendo el Código de Protección y Defensa del Consumidor
          (Ley N.° 29571) y su Reglamento (D.S. N.° 011-2011-PCM).
        </Section>
      </article>
    </motion.div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="p-5 rounded-xl bg-cm-surface-container border border-cm-border/50">
      <h2 className="font-[family-name:var(--font-sora)] font-bold text-base text-cm-on-surface mb-3">{title}</h2>
      {typeof children === 'string' ? <p>{children}</p> : children}
    </section>
  )
}
