    }
    return result
  })()

  // Scroll date picker by direction
  const scrollDates = (direction: 'left' | 'right') => {
    if (!dateScrollRef.current) return
    const scrollAmount = dateScrollRef.current.clientWidth * 0.75
    dateScrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  const handleSearch = useCallback(() => {
    const sport = selectedSport || 'todos'
    setSportFilter(sport)
    const date = dateList[selectedDateIdx].date
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    setSelectedDate(dateStr)
    setView('booking')
  }, [selectedSport, selectedDateIdx, dateList, setSportFilter, setSelectedDate, setView])

  const handleSave = async () => {
    setSaving(true)
    const ok = await saveSection('hero', editForm)
    setSaving(false)
    if (ok) {
      setEditOpen(false)
      toast({ title: 'Secci\u00f3n actualizada', description: 'Los cambios del Hero fueron guardados' })
    } else {
      toast({ title: 'Error', description: 'No se pudieron guardar los cambios', variant: 'destructive' })
    }
  }

  const updateStat = (idx: number, field: 'label' | 'value', val: string) => {
    const copy = [...editForm.stats]
    copy[idx] = { ...copy[idx], [field]: field === 'value' ? parseInt(val) || 0 : val }
    setEditForm({ ...editForm, stats: copy })
  }
  const removeStat = (idx: number) => {
    setEditForm({ ...editForm, stats: editForm.stats.filter((_, i) => i !== idx) })
  }
  const addStat = () => {
    setEditForm({ ...editForm, stats: [...editForm.stats, { label: 'Nuevo', value: 0 }] })
  }

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.4, 0.25, 1] } },
  }

  return (
    <>
      <SectionEditButton onClick={() => setEditOpen(true)} label="Editar Hero" />

      <section ref={sectionRef} className="relative overflow-hidden pt-8 pb-12 md:pt-12 md:pb-20 px-4">
        <GradientMesh />

        {/* Banner Carousel (shows when heroBanners exist) */}
        {activeBanners.length > 1 && (
          <div className="relative h-48 md:h-72 mb-6 rounded-2xl overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentBanner}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0"
              >
                <Image
                  src={activeBanners[currentBanner].image}
                  alt={activeBanners[currentBanner].title || 'Banner'}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                {(activeBanners[currentBanner].title || activeBanners[currentBanner].subtitle) && (
                  <div className="absolute bottom-4 left-4 right-4">
                    {activeBanners[currentBanner].subtitle && (
                      <span className="text-cm-primary text-[10px] font-bold uppercase tracking-wider">{activeBanners[currentBanner].subtitle}</span>
                    )}
                    {activeBanners[currentBanner].title && (
                      <h3 className="font-[family-name:var(--font-sora)] text-lg md:text-2xl font-bold text-white mt-0.5">
                        {activeBanners[currentBanner].title}
                      </h3>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Dots */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {activeBanners.map((_, idx) => (
                <button type="button"
                  key={idx}
                  onClick={() => { setCurrentBanner(idx) }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentBanner ? 'bg-cm-primary w-4' : 'bg-white/50 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Background image (uploaded by admin, only if no carousel) */}
        {!activeBanners.length && defaults.backgroundImage && (
          <div className="absolute inset-0 z-0">
            <img
              src={defaults.backgroundImage}
              alt=""
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
          </div>
        )}

        <motion.div
          className="relative max-w-4xl mx-auto text-center"
          variants={containerVariants}
          initial="hidden"
          animate={isSectionInView ? 'visible' : 'hidden'}
        >
          {/* Location Badge */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-1.5 mb-4">
            <span className="material-symbols-outlined text-cm-on-surface-variant text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>
              location_on
            </span>
            <span className="text-cm-on-surface-variant text-xs font-medium tracking-wide uppercase font-[family-name:var(--font-inter)]">
              {defaults.location}
            </span>
          </motion.div>

          {/* Hero Badge */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cm-primary/10 border border-cm-primary/20 mb-6"
          >
            <span className="material-symbols-outlined text-cm-primary text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>
              bolt
            </span>
            <span className="text-xs font-semibold text-cm-primary uppercase tracking-wider font-[family-name:var(--font-inter)]">
              {defaults.badge}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="font-[family-name:var(--font-sora)] text-[36px] sm:text-[48px] md:text-[64px] lg:text-[72px] font-extrabold leading-[1.08] text-cm-on-surface mb-5"
          >
            {defaults.headline}{' '}
            <span className="text-cm-primary text-glow">{defaults.headlineHighlight}</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-cm-on-surface-variant text-base md:text-lg max-w-2xl mx-auto mb-8 font-[family-name:var(--font-inter)] leading-relaxed"
          >
            {defaults.subtitle}
          </motion.p>

          {/* Search Panel */}
          <motion.div variants={itemVariants} className="glass-card rounded-2xl p-4 md:p-6 max-w-2xl mx-auto glow-border">
            {/* Date Picker with Arrows */}
            <div className="relative mb-5">
              <button
                type="button"
                onClick={() => scrollDates('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-cm-surface-container-highest/90 border border-white/10 text-cm-on-surface-variant hover:text-cm-primary hover:border-cm-primary/30 transition-all shadow-lg backdrop-blur-sm"
                aria-label="Fecha anterior"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>

              <div
                ref={dateScrollRef}
                className="flex gap-2 overflow-x-auto no-scrollbar px-10 scroll-smooth"
              >
                {dateList.map((d, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setSelectedDateIdx(idx)}
                    className={`flex flex-col items-center px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 min-w-[72px] flex-shrink-0 ${
                      selectedDateIdx === idx
                        ? 'bg-cm-primary text-cm-on-primary shadow-lg shadow-cm-primary/25 scale-105'
                        : 'bg-cm-surface-container-highest/50 text-cm-on-surface-variant hover:bg-cm-surface-container-highest/80'
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-wider font-bold">{d.dayName}</span>
                    <span className="text-base mt-0.5 font-bold font-[family-name:var(--font-sora)]">{d.date.getDate()}</span>
                    <span className="text-[10px] mt-0.5 opacity-80">{d.label.split(' ')[1]}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => scrollDates('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-cm-surface-container-highest/90 border border-white/10 text-cm-on-surface-variant hover:text-cm-primary hover:border-cm-primary/30 transition-all shadow-lg backdrop-blur-sm"
                aria-label="Fecha siguiente"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>

            {/* Sport Selection Buttons */}
            <div className="flex gap-3 mb-5">
              {sportButtons.map((sport) => (
                <button
                  type="button"
                  key={sport.value}
                  onClick={() => setSelectedSport(selectedSport === sport.value ? null : sport.value)}
                  className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                    selectedSport === sport.value
                      ? 'bg-cm-primary/10 text-cm-primary border-cm-primary/40 shadow-md shadow-cm-primary/10'
                      : 'bg-cm-surface-container-highest/40 text-cm-on-surface-variant border-white/10 hover:border-white/20'
                  }`}
                >
                  <span className="text-xl">{sport.emoji}</span>
                  <span className="font-[family-name:var(--font-sora)]">{sport.label}</span>
                </button>
              ))}
            </div>

            {/* Tariff Info Panel */}
            <div className="rounded-xl bg-cm-surface-container-highest/30 border border-white/5 p-3 mb-5">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="material-symbols-outlined text-cm-primary text-[14px]" style={{ fontVariationSettings: '"FILL" 1' }}>payments</span>
                <span className="text-[10px] font-semibold text-cm-on-surface-variant uppercase tracking-wider font-[family-name:var(--font-inter)]">
                  Precios por hora
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {tariffInfo.map((t) => (
                  <div key={t.sport} className="rounded-lg bg-cm-surface-container-highest/40 p-2.5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-base leading-none">{t.emoji}</span>
                      <span className="text-[11px] font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">{t.label}</span>
                    </div>
    const sports = [
      { key: 'futbol', emoji: '\u26bd', label: 'F\u00fatbol 7' },
      { key: 'voley', emoji: '\ud83c\udfd0', label: 'V\u00f3ley' },
    ]
    for (const s of sports) {
      const sportCourts = courts.filter((c: any) => c.sport === s.key)
      if (sportCourts.length === 0) {
        result.push({ sport: s.key, emoji: s.emoji, label: s.label, morning: '—', night: '—' })
        continue
      }
      const schedule: any[] = sportCourts[0].pricingSchedule || []
      const defaultPrice = sportCourts[0].pricePerHour || 0
      const morningBlock = schedule.find((b: any) => b.label?.toLowerCase().includes('ma\u00f1ana'))
        || schedule.find((b: any) => b.startHour >= 6 && b.startHour < 12)
      const afternoonBlock = schedule.find((b: any) => b.label?.toLowerCase().includes('tarde'))
        || schedule.find((b: any) => b.startHour >= 12 && b.startHour < 18)
      const nightBlock = schedule.find((b: any) => b.label?.toLowerCase().includes('noche'))
        || schedule.find((b: any) => b.startHour >= 18)
      const fmt = (b: any) => b ? `S/ ${b.pricePerHour}` : `S/ ${defaultPrice || '\u2014'}`
      result.push({
        sport: s.key,
        emoji: s.emoji,
        label: s.label,
        morning: fmt(morningBlock),
        afternoon: fmt(afternoonBlock),
        night: fmt(nightBlock),
      })
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                          <span className="text-[12px]">\u2600\ufe0f</span>Ma\u00f1ana
                        </span>
                        <span className="text-[11px] font-bold text-cm-primary font-[family-name:var(--font-sora)]">{t.morning}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                          <span className="text-[12px]">\u26c5</span>Tarde
                        </span>
                        <span className="text-[11px] font-bold text-cm-primary font-[family-name:var(--font-sora)]">{t.afternoon}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                          <span className="text-[12px]">\ud83c\udf19</span>Noche
                        </span>
                        <span className="text-[11px] font-bold text-cm-primary font-[family-name:var(--font-sora)]">{t.night}</span>
                      </div>
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Search Button */}
            <button
              type="button"
              onClick={handleSearch}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-cm-primary text-cm-on-primary font-bold rounded-xl hover:bg-cm-primary-dim transition-all duration-200 glow-accent font-[family-name:var(--font-sora)] active:scale-[0.98] text-base"
            >
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                search
              </span>
              Buscar Canchas
            </button>
          </motion.div>

          {/* Featured Promo Banner */}
          <motion.div
            variants={itemVariants}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cm-primary/10 via-cm-primary/5 to-transparent border border-cm-primary/15"
          >
            <span className="material-symbols-outlined text-cm-primary text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>
              local_offer
            </span>
            <span className="text-cm-on-surface text-xs md:text-sm font-medium font-[family-name:var(--font-inter)]">
              <span className="text-cm-primary font-bold">{defaults.promoHighlight}</span>{defaults.promoText}
            </span>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap justify-center gap-8 md:gap-14 mt-10 md:mt-14"
          >
            {defaults.stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <p className="font-[family-name:var(--font-sora)] text-3xl md:text-4xl font-bold text-cm-primary text-glow">
                  <AnimatedCounter target={stat.value} duration={2} />
                </p>
                <p className="text-cm-on-surface-variant text-sm mt-1 font-[family-name:var(--font-inter)]">
                  {stat.label}
                </p>
              </div>
            ))}
            <div className="text-center">
              <p className="font-[family-name:var(--font-sora)] text-3xl md:text-4xl font-bold text-cm-primary text-glow">
                <AnimatedCounter target={availableSlots ?? 51} duration={2.5} />
              </p>
              <p className="text-cm-on-surface-variant text-sm mt-1 font-[family-name:var(--font-inter)]">
                Horarios hoy
              </p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Edit Modal */}
      <EditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar Secci\u00f3n Hero"
        onSave={handleSave}
        saving={saving}
      >
        <FormField
          label="Ubicaci\u00f3n"
          value={editForm.location}
          onChange={(v) => setEditForm({ ...editForm, location: v })}
          placeholder="Ej. San Sebasti\u00e1n, Cusco"
        />
        <FormField
          label="Badge principal"
          value={editForm.badge}
          onChange={(v) => setEditForm({ ...editForm, badge: v })}
          placeholder="Ej. La #1 en reservas deportivas del Cusco"
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="T\u00edtulo (headline)"
            value={editForm.headline}
            onChange={(v) => setEditForm({ ...editForm, headline: v })}
            placeholder="Reserva tu cancha"
          />
          <FormField
            label="Highlight"
            value={editForm.headlineHighlight}
            onChange={(v) => setEditForm({ ...editForm, headlineHighlight: v })}
            placeholder="en segundos"
          />
        </div>
        <FormField
          label="Subt\u00edtulo"
          value={editForm.subtitle}
          onChange={(v) => setEditForm({ ...editForm, subtitle: v })}
          type="textarea"
          placeholder="Descripci\u00f3n principal..."
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="Promo highlight"
            value={editForm.promoHighlight}
            onChange={(v) => setEditForm({ ...editForm, promoHighlight: v })}
            placeholder="50% de adelanto"
          />
          <FormField
            label="Promo texto"
            value={editForm.promoText}
            onChange={(v) => setEditForm({ ...editForm, promoText: v })}
            placeholder=", paga el resto al llegar"
          />
        </div>

        {/* Hero Images */}
        <div>
          <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1.5 block">
            Im\u00e1genes del Hero
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              {editForm.backgroundImage ? (
                <div className="relative rounded-xl overflow-hidden border border-white/10 mb-1.5">
                  <img src={editForm.backgroundImage} alt="Fondo" className="w-full h-24 object-cover" />
                  <button type="button"
                    onClick={() => setEditForm({ ...editForm, backgroundImage: '' })}
                    className="absolute top-1 right-1 p-1 rounded-lg bg-red-500/80 text-white hover:bg-red-500"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ) : null}
              <label className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-white/10 text-cm-on-surface-variant hover:border-cm-primary/30 hover:text-cm-primary cursor-pointer transition-all text-xs font-medium">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const fd = new FormData()
                    fd.append('file', file)
                    fd.append('folder', 'hero')
                    try {
                      const res = await fetch('/api/upload', { method: 'POST', body: fd })
                      if (res.ok) {
                        const data = await res.json()
                        setEditForm({ ...editForm, backgroundImage: data.url })
                      }
                    } catch { /* silent */ }
                    e.target.value = ''
                  }}
                />
                <span className="material-symbols-outlined text-[14px]">cloud_upload</span>
                Fondo
              </label>
            </div>
            <div>
              {editForm.secondaryImage ? (
                <div className="relative rounded-xl overflow-hidden border border-white/10 mb-1.5">
                  <img src={editForm.secondaryImage} alt="Secundaria" className="w-full h-24 object-cover" />
                  <button type="button"
                    onClick={() => setEditForm({ ...editForm, secondaryImage: '' })}
                    className="absolute top-1 right-1 p-1 rounded-lg bg-red-500/80 text-white hover:bg-red-500"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ) : null}
              <label className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-white/10 text-cm-on-surface-variant hover:border-cm-primary/30 hover:text-cm-primary cursor-pointer transition-all text-xs font-medium">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const fd = new FormData()
                    fd.append('file', file)
                    fd.append('folder', 'hero')
                    try {
                      const res = await fetch('/api/upload', { method: 'POST', body: fd })
                      if (res.ok) {
                        const data = await res.json()
                        setEditForm({ ...editForm, secondaryImage: data.url })
                      }
                    } catch { /* silent */ }
                    e.target.value = ''
                  }}
                />
                <span className="material-symbols-outlined text-[14px]">cloud_upload</span>
                Secundaria
              </label>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)]">
              Estad\u00edsticas
            </label>
            <button type="button"
              onClick={addStat}
              className="text-[10px] font-semibold text-cm-primary hover:text-cm-primary-dim flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Agregar
            </button>
          </div>
          <div className="space-y-2">
            {editForm.stats.map((stat, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  value={stat.label}
                  onChange={(e) => updateStat(idx, 'label', e.target.value)}
                  placeholder="Etiqueta"
                  className="flex-1 px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-sm text-cm-on-surface placeholder:text-cm-on-surface-variant/50 focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                />
                <input
                  type="number"
                  value={stat.value}
                  onChange={(e) => updateStat(idx, 'value', e.target.value)}
                  placeholder="0"
                  className="w-20 px-3 py-2 bg-cm-surface-container-highest/40 border border-white/10 rounded-lg text-sm text-cm-on-surface text-center focus:outline-none focus:border-cm-primary/40 font-[family-name:var(--font-inter)]"
                />
                <button type="button"
                  onClick={() => removeStat(idx)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </EditModal>
    </>
  )
}
