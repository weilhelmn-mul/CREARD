'use client'

// ═══════════════════════════════════════════════════════════════
// REQUISITO 2 (AUDITORÍA): Página independiente de
// Política de Cambios y/o Devoluciones
// ═══════════════════════════════════════════════════════════════

import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'

export default function RefundPolicy() {
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
            Política de Cambios y/o Devoluciones
          </h1>
          <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
            Última actualización: julio 2025
          </p>
        </div>
      </div>

      <article className="space-y-5 text-sm text-cm-on-surface font-[family-name:var(--font-inter)] leading-relaxed">
        <Section title="1. Alcance">
          La presente política regula los cambios, cancelaciones y devoluciones aplicables a las reservas de
          canchas deportivas realizadas a través de la plataforma CREARD. Esta política es complementaria a
          los Términos y Condiciones del servicio y se rige por lo dispuesto en el Código de Protección y
          Defensa del Consumidor (Ley N.° 29571) de la República del Perú.
        </Section>

        <Section title="2. Cambio de Reserva (Reprogramación)">
          <p className="mb-2">
            <strong>2.1 Con al menos 12 horas de anticipación:</strong> El usuario puede solicitar el cambio
            de fecha u horario de su reserva sin costo adicional, sujeto a disponibilidad. El cambio debe
            solicitarse a través de la plataforma web o contactando al equipo de soporte.
          </p>
          <p>
            <strong>2.2 Con menos de 12 horas de anticipación:</strong> No se permite el cambio de reserva.
            El usuario puede optar por ceder su reserva a un tercero, notificando previamente al proveedor.
          </p>
        </Section>

        <Section title="3. Cancelación de Reserva">
          <p className="mb-2">
            <strong>3.1 Con al menos 12 horas de anticipación:</strong> El usuario puede cancelar su reserva
            y solicitar el reembolso del adelanto pagado. El reembolso se procesará en un plazo de 3 a 5
            días hábiles al mismo medio de pago utilizado (Yape, Plin, tarjeta). Para pagos en efectivo,
            el reembolso se coordinará de forma presencial.
          </p>
          <p className="mb-2">
            <strong>3.2 Con menos de 12 horas de anticipación:</strong> El adelanto no es reembolsable. Sin
            embargo, el usuario podrá solicitar un crédito para futuras reservas equivalente al monto del
            adelanto pagado, válido por 30 días calendario.
          </p>
          <p>
            <strong>3.3 No asistencia (no show):</strong> Si el usuario no se presenta en la fecha y hora de
            la reserva sin notificación previa, perderá el 100% del monto pagado (adelanto). No se generará
            crédito ni reembolso alguno.
          </p>
        </Section>

        <Section title="4. Devoluciones por Fuerza Mayor">
          En caso de lluvia intensa, desastres naturales, o causas de fuerza mayor que impidan el uso seguro
          de las instalaciones, CREARD ofrecerá al usuario las siguientes opciones: (a) reprogramación de
          la reserva sin costo adicional en la primera fecha disponible, o (b) reembolso total del monto
          pagado. La decisión corresponderá al usuario.
        </Section>

        <Section title="5. Devoluciones por Responsabilidad del Proveedor">
          Si la reserva no puede ser atendida por causas atribuibles a CREARD (fallo de instalaciones,
            doble reserva, mantenimiento no comunicado con la debida anticipación), el usuario tendrá derecho
          a: (a) reembolso del 100% del monto pagado, más un crédito adicional del 20% para su próxima
          reserva, o (b) reprogramación con un bono de cortesía.
        </Section>

        <Section title="6. Plazos de Procesamiento">
          <p className="mb-2">
            <strong>6.1 Reembolsos electrónicos (Yape, Plin, tarjeta):</strong> 3 a 5 días hábiles desde la
            aprobación de la solicitud.
          </p>
          <p>
            <strong>6.2 Reembolsos en efectivo:</strong> Se coordinará con el usuario para la entrega en
            instalaciones dentro de los 5 días hábiles siguientes.
          </p>
        </Section>

        <Section title="7. Procedimiento para Solicitar Devolución">
          El usuario debe contactar a CREARD a través de: (a) la plataforma web, (b) el correo electrónico
          indicado en el pie de página, o (c) el Libro de Reclamaciones Virtual disponible en la aplicación.
          La solicitud debe incluir el número de reserva, nombre del titular y motivo de la devolución.
          CREARD responderá en un plazo máximo de 2 días hábiles.
        </Section>

        <Section title="8. Excepciones">
          No proceden devoluciones ni cambios en los siguientes casos: (a) reservas realizadas con
          promociones o descuentos especiales que indiquen condiciones no reembolsables, (b) incumplimiento
          de las normas de uso de las instalaciones que motive la expulsión del usuario, y (c) solicitudes
          realizadas después de la fecha y hora de la reserva.
        </Section>

        <Section title="9. Contacto">
          Para cualquier consulta sobre esta política, puede contactarnos a través de los datos de contacto
          indicados en el pie de página de esta aplicación o mediante el Libro de Reclamaciones Virtual.
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
