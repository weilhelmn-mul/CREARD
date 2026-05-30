'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { useSiteSettings } from '@/context/SiteSettingsContext'
import { useAppStore } from '@/store/useAppStore'

export default function NewsSection() {
  const { settings } = useSiteSettings()
  const { setView } = useAppStore()
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  const activeNews = (settings?.news || []).filter((n) => n.active)
  if (activeNews.length === 0) return null

  const pinnedNews = activeNews.filter((n) => n.pinned)
  const regularNews = activeNews.filter((n) => !n.pinned)
  const sortedNews = [...pinnedNews, ...regularNews]

  return (
    <section ref={sectionRef} className="py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cm-primary/10 border border-cm-primary/20 mb-2">
            <span className="material-symbols-outlined text-cm-primary text-[14px]" style={{ fontVariationSettings: '"FILL" 1' }}>
              newspaper
            </span>
            <span className="text-xs font-semibold text-cm-primary uppercase tracking-wider font-[family-name:var(--font-inter)]">
              Noticias
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-sora)] text-xl md:text-2xl font-bold text-cm-on-surface">
            Últimas novedades
          </h2>
        </motion.div>

        <div className="space-y-4">
          {sortedNews.map((newsItem, index) => (
            <motion.div
              key={newsItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`glass-card rounded-2xl overflow-hidden ${newsItem.pinned ? 'border-cm-primary/30' : ''}`}
              onClick={() => {
                if (newsItem.link) {
                  window.open(newsItem.link, '_blank')
                }
              }}
            >
              <div className="flex flex-col sm:flex-row">
                {newsItem.image && (
                  <div className="sm:w-48 h-40 sm:h-auto flex-shrink-0 relative overflow-hidden">
                    <img
                      src={newsItem.image}
                      alt={newsItem.title}
                      className="w-full h-full object-cover"
                    />
                    {newsItem.pinned && (
                      <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-cm-primary/90 backdrop-blur-sm">
                        <span className="material-symbols-outlined text-cm-on-primary text-[12px]" style={{ fontVariationSettings: '"FILL" 1' }}>push_pin</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex-1 p-4">
                  <h3 className="font-[family-name:var(--font-sora)] font-bold text-cm-on-surface text-base">
                    {newsItem.title}
                  </h3>
                  <p className="text-cm-on-surface-variant text-sm mt-1.5 line-clamp-3 font-[family-name:var(--font-inter)] leading-relaxed">
                    {newsItem.content}
                  </p>
                  {newsItem.link && (
                    <div className="mt-3 flex items-center gap-1 text-cm-primary text-xs font-semibold">
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      Leer más
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
