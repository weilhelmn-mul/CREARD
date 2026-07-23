'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'

export default function ClaimsFooterBanner() {
  const { setView } = useAppStore()
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-60px' })

  return (
    <section ref={sectionRef} className="py-10 md:py-14 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          onClick={() => setView('claims')}
          className="relative cursor-pointer group overflow-hidden rounded-2xl border border-cm-primary/20 bg-gradient-to-br from-cm-surface-container to-cm-surface-container-highest/60 p-6 md:p-8 transition-all duration-300 hover:border-cm-primary/40 hover:shadow-[0_0_30px_rgba(0,255,65,0.08)]"
        >
          {/* Subtle decorative glow */}
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-cm-primary/5 blur-3xl pointer-events-none group-hover:bg-cm-primary/10 transition-all duration-500" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-cm-primary/4 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5 md:gap-8">
            {/* Icon */}
            <div className="shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-cm-primary/10 border border-cm-primary/20 flex items-center justify-center group-hover:bg-cm-primary/15 group-hover:border-cm-primary/30 transition-all duration-300">
              <span
                className="material-symbols-outlined text-cm-primary text-[28px] md:text-[32px]"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                gavel
              </span>
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cm-primary/10 border border-cm-primary/15 mb-2.5">
                <span className="material-symbols-outlined text-cm-primary text-[12px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                  verified
                </span>
                <span className="text-[10px] font-semibold text-cm-primary uppercase tracking-wider font-[family-name:var(--font-inter)]">
                  Libro de Reclamaciones
                </span>
              </div>
              <h3 className="font-[family-name:var(--font-sora)] text-lg md:text-xl font-bold text-cm-on-surface mb-1.5">
                ¿Tienes una queja o reclamo?
              </h3>
              <p className="text-cm-on-surface-variant text-sm leading-relaxed font-[family-name:var(--font-inter)] max-w-lg">
                De acuerdo con el Código de Protección y Defensa del Consumidor (Ley N.° 29571), ponemos a tu disposición el Libro de Reclamaciones Virtual. Tu solicitud será atendida en un plazo máximo de 15 días hábiles.
              </p>
            </div>

            {/* CTA button */}
            <div className="shrink-0 self-center">
              <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-cm-primary text-cm-on-primary font-semibold text-sm font-[family-name:var(--font-inter)] group-hover:shadow-[0_0_20px_rgba(0,255,65,0.3)] transition-all duration-300">
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                  description
                </span>
                <span>Registrar reclamo</span>
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform duration-200">
                  arrow_forward
                </span>
              </div>
            </div>
          </div>

          {/* Bottom legal reference */}
          <div className="relative mt-5 pt-4 border-t border-cm-primary/10">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="flex items-center gap-1.5 text-cm-on-surface-variant">
                <span className="material-symbols-outlined text-[14px]">balance</span>
                <span className="text-[11px] font-[family-name:var(--font-inter)]">
                  Resolución N.° 007-2016-CCD-INDECOPI
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-cm-on-surface-variant">
                <span className="material-symbols-outlined text-[14px]">article</span>
                <span className="text-[11px] font-[family-name:var(--font-inter)]">
                  Ley N.° 29571 – Código de Protección del Consumidor
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
