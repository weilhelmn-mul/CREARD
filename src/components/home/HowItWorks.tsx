'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const steps = [
  {
    number: '01',
    title: 'Elige tu cancha',
    description:
      'Explora nuestras 6 canchas por deporte y disponibilidad. Revisa fotos, amenidades y precios en tiempo real.',
    icon: 'search',
    detail: 'Fútbol 5, Vóley o Eventos',
  },
  {
    number: '02',
    title: 'Selecciona fecha y hora',
    description:
      'Consulta la disponibilidad en tiempo real y elige el horario perfecto. Horario de atención: 7:00 AM a 11:00 PM.',
    icon: 'calendar_month',
    detail: 'Reserva hasta 7 días adelante',
  },
  {
    number: '03',
    title: 'Paga 50% de adelanto',
    description:
      'Realiza el pago con Yape, Plin, efectivo o tarjeta. Solo necesitas el 50% para confirmar tu reserva.',
    icon: 'payments',
    detail: 'Yape / Plin / Efectivo / Tarjeta',
  },
  {
    number: '04',
    title: 'Confirmación por WhatsApp',
    description:
      'Recibe tu confirmación al instante por WhatsApp con todos los detalles. ¡Llega y juega!',
    icon: 'forum',
    detail: 'Confirmación en segundos',
  },
]

function AnimatedLine({ progress }: { progress: number }) {
  return (
    <svg className="absolute top-1/2 left-0 w-full h-2 -translate-y-1/2 hidden md:block" preserveAspectRatio="none">
      {/* Background line */}
      <line
        x1="0"
        y1="1"
        x2="100%"
        y2="1"
        stroke="rgba(0,255,65,0.1)"
        strokeWidth="2"
        strokeDasharray="8 6"
      />
      {/* Animated progress line */}
      <motion.line
        x1="0"
        y1="1"
        x2={progress}
        y2="1"
        stroke="rgba(0,255,65,0.5)"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ x2: '0%' }}
        animate={{ x2: `${progress}%` }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />
    </svg>
  )
}

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section ref={sectionRef} className="py-14 md:py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cm-primary/10 border border-cm-primary/15 mb-4">
            <span className="material-symbols-outlined text-cm-primary text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>
              auto_awesome
            </span>
            <span className="text-xs font-semibold text-cm-primary uppercase tracking-wider font-[family-name:var(--font-inter)]">
              Facil y rapido
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-sora)] text-2xl md:text-3xl font-bold text-cm-on-surface">
            ¿Cómo funciona?
          </h2>
          <p className="text-cm-on-surface-variant text-sm md:text-base mt-2 max-w-md mx-auto font-[family-name:var(--font-inter)]">
            Reserva tu cancha en 4 simples pasos y disfruta del deporte
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          {isInView && (
            <div className="absolute top-0 md:top-1/2 md:-translate-y-1/2 left-0 w-full h-full md:h-0 z-0 hidden md:block">
              <AnimatedLine progress={75} />
            </div>
          )}

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.6,
                  delay: index * 0.2,
                  ease: [0.25, 0.4, 0.25, 1],
                }}
                className="relative flex flex-col items-center text-center group"
              >
                {/* Icon Circle */}
                <div className="relative mb-5">
                  {/* Outer glow ring */}
                  <motion.div
                    className="absolute inset-0 w-16 h-16 md:w-18 md:h-18 rounded-full"
                    style={{
                      background: 'radial-gradient(circle, rgba(0,255,65,0.15) 0%, transparent 70%)',
                    }}
                    animate={
                      isInView
                        ? { scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }
                        : {}
                    }
                    transition={{
                      duration: 3,
                      delay: index * 0.2 + 0.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                  <div className="relative w-16 h-16 md:w-[72px] md:h-[72px] rounded-full bg-cm-surface-container-highest border-2 border-cm-primary/30 flex items-center justify-center group-hover:border-cm-primary group-hover:shadow-[0_0_20px_rgba(0,255,65,0.25)] transition-all duration-300">
                    <span className="material-symbols-outlined text-cm-primary text-[28px] md:text-[32px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                      {step.icon}
                    </span>
                  </div>

                  {/* Step number */}
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-cm-primary text-cm-on-primary text-[10px] font-bold flex items-center justify-center font-[family-name:var(--font-sora)]">
                    {step.number}
                  </div>
                </div>

                {/* Content */}
                <h3 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-base md:text-lg mb-2">
                  {step.title}
                </h3>
                <p className="text-cm-on-surface-variant text-sm leading-relaxed font-[family-name:var(--font-inter)] max-w-[220px]">
                  {step.description}
                </p>

                {/* Detail badge */}
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cm-primary/8 border border-cm-primary/12">
                  <span className="material-symbols-outlined text-cm-primary text-[12px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                    info
                  </span>
                  <span className="text-cm-primary text-[10px] font-semibold font-[family-name:var(--font-inter)]">
                    {step.detail}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="text-center mt-12 md:mt-16"
        >
          <p className="text-cm-on-surface-variant text-sm mb-4 font-[family-name:var(--font-inter)]">
            ¿Tienes dudas? Escríbenos por WhatsApp
          </p>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-card border-cm-primary/20">
            <span className="material-symbols-outlined text-cm-primary text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>
              chat
            </span>
            <span className="text-cm-primary text-sm font-semibold font-[family-name:var(--font-inter)]">
              Soporte disponible
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
