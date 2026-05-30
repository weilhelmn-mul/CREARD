'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Image from 'next/image'
import { useAppStore } from '@/store/useAppStore'
import { useSiteSettings, type CustomSection } from '@/context/SiteSettingsContext'

function BannerSection({ section }: { section: CustomSection }) {
  return (
    <section className="py-6 md:py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl overflow-hidden glass-card glow-border"
        >
          {section.image && (
            <div className="relative h-48 md:h-64">
              <Image
                src={section.image}
                alt={section.title}
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            </div>
          )}
          <div className={section.image ? 'absolute bottom-0 left-0 right-0 p-6 md:p-8' : 'p-6 md:p-8'}>
            <h3 className="font-[family-name:var(--font-sora)] text-xl md:text-2xl font-bold text-cm-on-surface mb-2">
              {section.title}
            </h3>
            {section.subtitle && (
              <p className="text-cm-on-surface-variant text-sm md:text-base font-[family-name:var(--font-inter)]">
                {section.subtitle}
              </p>
            )}
            {section.ctaText && (
              <a
                href={section.link || '#'}
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-cm-primary text-cm-on-primary text-sm font-bold rounded-xl hover:bg-cm-primary-dim transition-all glow-accent font-[family-name:var(--font-sora)]"
              >
                {section.ctaText}
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </a>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function NoticeSection({ section }: { section: CustomSection }) {
  return (
    <section className="py-4 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="flex items-start gap-3 p-4 md:p-5 rounded-xl bg-cm-primary/8 border border-cm-primary/15"
        >
          <div className="w-10 h-10 rounded-xl bg-cm-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-cm-primary text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>
              campaign
            </span>
          </div>
          <div className="flex-1">
            <h4 className="font-[family-name:var(--font-sora)] font-bold text-sm text-cm-on-surface mb-1">
              {section.title}
            </h4>
            {section.subtitle && (
              <p className="text-cm-on-surface-variant text-xs md:text-sm font-[family-name:var(--font-inter)] leading-relaxed">
                {section.subtitle}
              </p>
            )}
          </div>
          {section.link && (
            <a href={section.link} className="flex-shrink-0 text-cm-primary hover:underline text-xs font-semibold mt-1">
              Ver más
            </a>
          )}
        </motion.div>
      </div>
    </section>
  )
}

function HighlightSection({ section }: { section: CustomSection }) {
  return (
    <section className="py-8 md:py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="glass-card rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-5 items-center"
        >
          {section.image && (
            <div className="relative w-full md:w-64 h-48 md:h-40 rounded-xl overflow-hidden flex-shrink-0">
              <Image
                src={section.image}
                alt={section.title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
          <div className="flex-1 text-center md:text-left">
            {section.subtitle && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cm-primary/10 text-cm-primary text-[10px] font-bold uppercase tracking-wider mb-3">
                <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                {section.subtitle}
              </span>
            )}
            <h3 className="font-[family-name:var(--font-sora)] text-xl md:text-2xl font-bold text-cm-on-surface mb-2">
              {section.title}
            </h3>
            {section.ctaText && (
              <a
                href={section.link || '#'}
                className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 bg-cm-primary text-cm-on-primary text-sm font-bold rounded-xl hover:bg-cm-primary-dim transition-all glow-accent font-[family-name:var(--font-sora)]"
              >
                {section.ctaText}
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </a>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function CTASection({ section }: { section: CustomSection }) {
  const { setView } = useAppStore()
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  return (
    <section ref={sectionRef} className="py-12 md:py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl overflow-hidden glass-card glow-border"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cm-primary/15 via-transparent to-cm-primary/8 pointer-events-none" />
          <div className="relative z-10 p-8 md:p-12 text-center">
            {section.subtitle && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cm-primary/10 text-cm-primary text-[10px] font-bold uppercase tracking-wider mb-4">
                {section.subtitle}
              </span>
            )}
            <h3 className="font-[family-name:var(--font-sora)] text-2xl md:text-3xl font-bold text-cm-on-surface mb-3">
              {section.title}
            </h3>
            {section.image && (
              <div className="relative w-full max-w-sm h-48 mx-auto my-6 rounded-xl overflow-hidden">
                <Image src={section.image} alt={section.title} fill className="object-cover" unoptimized />
              </div>
            )}
            <button
              onClick={() => {
                if (section.link) {
                  window.open(section.link, '_blank')
                } else {
                  setView('search')
                }
              }}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-cm-primary text-cm-on-primary font-bold rounded-xl hover:bg-cm-primary-dim transition-all glow-accent active:scale-[0.97] font-[family-name:var(--font-sora)] text-sm md:text-base"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                sports_soccer
              </span>
              {section.ctaText || 'Reservar ahora'}
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function GallerySection({ section }: { section: CustomSection }) {
  const items = section.items || []
  if (items.length === 0) return null

  return (
    <section className="py-10 md:py-14 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="font-[family-name:var(--font-sora)] text-xl md:text-2xl font-bold text-cm-on-surface mb-6 text-center">
            {section.title}
          </h3>
          {section.subtitle && (
            <p className="text-cm-on-surface-variant text-sm text-center max-w-md mx-auto mb-6 font-[family-name:var(--font-inter)]">
              {section.subtitle}
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {items.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className="relative rounded-xl overflow-hidden glass-card group aspect-square"
              >
                <Image
                  src={item.image}
                  alt={item.title || `Imagen ${idx + 1}`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
                {item.title && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <span className="text-white text-xs font-semibold font-[family-name:var(--font-sora)]">
                      {item.title}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

const sectionRenderers: Record<string, React.ComponentType<{ section: CustomSection }>> = {
  banner: BannerSection,
  notice: NoticeSection,
  highlight: HighlightSection,
  cta: CTASection,
  gallery: GallerySection,
}

interface CustomSectionsProps {
  sectionKey: string
}

export default function CustomSections({ sectionKey }: CustomSectionsProps) {
  const { settings } = useSiteSettings()
  const customSections = settings?.customSections || []
  const sectionId = sectionKey.replace('custom_', '')
  const section = customSections.find((s) => s.id === sectionId)

  if (!section || !section.visible) return null

  const Renderer = sectionRenderers[section.type]
  if (!Renderer) return null

  return <Renderer section={section} />
}
