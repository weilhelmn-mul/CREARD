import re

with open('src/components/home/HeroSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_panel = '''            {/* Tariff Info Panel */}
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
                ))}
              </div>
            </div>'''

new_panel = '''            {/* Tariff Info Panel */}
            <div className="rounded-xl bg-cm-surface-container-highest/30 border border-white/5 p-3.5 mb-5">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="material-symbols-outlined text-cm-primary text-[14px]" style={{ fontVariationSettings: '"FILL" 1' }}>payments</span>
                <span className="text-[10px] font-semibold text-cm-on-surface-variant uppercase tracking-wider font-[family-name:var(--font-inter)]">
                  Precios por hora
                </span>
              </div>
              <div className="space-y-2.5">
                {tariffInfo.map((t) => (
                  <div key={t.sport}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-sm leading-none">{t.emoji}</span>
                      <span className="text-[12px] font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">{t.label}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-cm-surface-container-highest/40 px-2.5 py-2 text-center">
                        <span className="text-[12px] block mb-0.5">\u2600\ufe0f</span>
                        <span className="text-[9px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] block">Ma\u00f1ana</span>
                        <span className="text-[12px] font-bold text-cm-primary font-[family-name:var(--font-sora)] block mt-0.5">{t.morning}</span>
                      </div>
                      <div className="rounded-lg bg-cm-surface-container-highest/40 px-2.5 py-2 text-center">
                        <span className="text-[12px] block mb-0.5">\u26c5</span>
                        <span className="text-[9px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] block">Tarde</span>
                        <span className="text-[12px] font-bold text-cm-primary font-[family-name:var(--font-sora)] block mt-0.5">{t.afternoon}</span>
                      </div>
                      <div className="rounded-lg bg-cm-surface-container-highest/40 px-2.5 py-2 text-center">
                        <span className="text-[12px] block mb-0.5">\ud83c\udf19</span>
                        <span className="text-[9px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] block">Noche</span>
                        <span className="text-[12px] font-bold text-cm-primary font-[family-name:var(--font-sora)] block mt-0.5">{t.night}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>'''

if old_panel in content:
    content = content.replace(old_panel, new_panel)
    print('Tariff panel layout updated!')
else:
    print('ERROR: old panel not found')
    # Find partial matches
    for marker in ['Tariff Info Panel', 'Precios por hora', 'grid grid-cols-2 gap-2.5']:
        idx = content.find(marker)
        if idx >= 0:
            print(f'Found "{marker}" at index {idx}')
        else:
            print(f'NOT found "{marker}"')
    exit(1)

with open('src/components/home/HeroSection.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done!')
