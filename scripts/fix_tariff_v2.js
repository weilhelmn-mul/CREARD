const fs = require('fs');
const filePath = 'src/components/home/HeroSection.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldInner = `              <div className="grid grid-cols-2 gap-2.5">
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
              </div>`;

const newInner = `              <div className="space-y-3">
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
              </div>`;

if (content.includes(oldInner)) {
  content = content.replace(oldInner, newInner);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Tariff panel layout updated!');
} else {
  console.log('ERROR: Old block not found');
  // Debug
  const idx1 = content.indexOf('grid grid-cols-2 gap-2.5');
  const idx2 = content.indexOf('tariffInfo.map');
  console.log('grid-cols-2 at:', idx1);
  console.log('tariffInfo.map at:', idx2);
}
