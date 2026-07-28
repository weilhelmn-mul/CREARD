with open('src/components/home/HeroSection.tsx', 'r') as f:
    content = f.read()

start = content.find('{/* Tariff Info Panel */')
end = content.find('{/* Search Button */}')

old_panel = content[start:end].rstrip() + '\n'

new_panel = '''{/* Tariff Info Panel */}
            <div className="rounded-xl bg-cm-surface-container-highest/30 border border-white/5 p-3.5 mb-5">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="material-symbols-outlined text-cm-primary text-[14px]" style={{ fontVariationSettings: '"FILL" 1' }}>payments</span>
                <span className="text-[10px] font-semibold text-cm-on-surface-variant uppercase tracking-wider font-[family-name:var(--font-inter)]">
                  Precios por hora
                </span>
              </div>
              <div className="space-y-3">
                {tariffInfo.map((t) => (
                  <div key={t.sport}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-sm leading-none">{t.emoji}</span>
                      <span className="text-[12px] font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">{t.label}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-cm-surface-container-highest/40 px-2.5 py-2 text-center">
                        <span className="text-[13px] block mb-0.5">\u2600\ufe0f</span>
                        <span className="text-[9px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] block">Ma\u00f1ana</span>
                        <span className="text-[12px] font-bold text-cm-primary font-[family-name:var(--font-sora)] block mt-0.5">{t.morning}</span>
                      </div>
                      <div className="rounded-lg bg-cm-surface-container-highest/40 px-2.5 py-2 text-center">
                        <span className="text-[13px] block mb-0.5">\u26c5</span>
                        <span className="text-[9px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] block">Tarde</span>
                        <span className="text-[12px] font-bold text-cm-primary font-[family-name:var(--font-sora)] block mt-0.5">{t.afternoon}</span>
                      </div>
                      <div className="rounded-lg bg-cm-surface-container-highest/40 px-2.5 py-2 text-center">
                        <span className="text-[13px] block mb-0.5">\ud83c\udf19</span>
                        <span className="text-[9px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] block">Noche</span>
                        <span className="text-[12px] font-bold text-cm-primary font-[family-name:var(--font-sora)] block mt-0.5">{t.night}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            '''

content = content[:start] + new_panel + content[end:]

with open('src/components/home/HeroSection.tsx', 'w') as f:
    f.write(content)

print('Tariff panel layout updated!')
print(f'Replaced {len(old_panel)} chars with {len(new_panel)} chars')
