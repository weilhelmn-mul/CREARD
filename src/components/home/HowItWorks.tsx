'use client'

import { motion } from 'framer-motion'

const steps = [
  {
    number: '01',
    title: 'Elige tu cancha',
    description: 'Explora nuestras canchas por deporte, ubicación y precio. Lee reseñas y ve fotos reales.',
    icon: 'search',
  },
  {
    number: '02',
    title: 'Selecciona fecha y hora',
    description: 'Revisa la disponibilidad en tiempo real y elige el horario que mejor te convenga.',
    icon: 'calendar_month',
  },
  {
    number: '03',
    title: 'Confirma y paga',
    description: 'Completa tu reserva con el método de pago que prefieras. Recibirás confirmación instantánea.',
    icon: 'check_circle',
  },
]

export default function HowItWorks() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-cm-on-surface">
            ¿Cómo funciona?
          </h2>
          <p className="text-cm-on-surface-variant text-sm mt-2 font-[family-name:var(--font-inter)]">
            Reserva tu cancha en 3 simples pasos
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="glass-card rounded-2xl p-6 md:p-8 relative group hover:border-cm-primary/30 transition-all duration-300"
            >
              {/* Number */}
              <div className="font-[family-name:var(--font-sora)] text-5xl font-bold text-cm-primary/10 absolute top-4 right-6">
                {step.number}
              </div>

              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-cm-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-cm-primary text-[28px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                  {step.icon}
                </span>
              </div>

              {/* Content */}
              <h3 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-lg mb-2">
                {step.title}
              </h3>
              <p className="text-cm-on-surface-variant text-sm leading-relaxed font-[family-name:var(--font-inter)]">
                {step.description}
              </p>

              {/* Connector (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 lg:-right-5 w-8 lg:w-10">
                  <div className="border-t-2 border-dashed border-cm-outline-variant w-full" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
