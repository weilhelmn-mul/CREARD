const fs = require('fs');
const filePath = 'src/components/home/HeroSection.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find exact positions
const gridStart = content.indexOf('className="grid grid-cols-2 gap-2.5"');
const closingDiv = content.indexOf('              </div>\n            </div>', gridStart);

console.log('gridStart:', gridStart, 'closingDiv:', closingDiv);

if (gridStart === -1 || closingDiv === -1) {
  console.log('ERROR: Could not find block boundaries');
  process.exit(1);
}

// Find the start of the outer div (with the grid class)
const outerDivStart = content.lastIndexOf('<div', gridStart);
const blockEnd = closingDiv + '              </div>\n            </div>'.length;

console.log('outerDivStart:', outerDivStart, 'blockEnd:', blockEnd);
console.log('Old block length:', blockEnd - outerDivStart);

const oldBlock = content.substring(outerDivStart, blockEnd);
console.log('OLD BLOCK PREVIEW:', oldBlock.substring(0, 100));

// Build new block using the same escape sequences as the file
// The file has literal \uXXXX sequences (JS unicode escapes)
const newBlock = '<div className="space-y-3">' +
'                {tariffInfo.map((t) => (' +
'                  <div key={t.sport}>' +
'                    <div className="flex items-center gap-1.5 mb-1.5">' +
'                      <span className="text-sm leading-none">{t.emoji}</span>' +
'                      <span className="text-[12px] font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">{t.label}</span>' +
'                    </div>' +
'                    <div className="grid grid-cols-3 gap-2">' +
'                      <div className="rounded-lg bg-cm-surface-container-highest/40 px-2.5 py-2 text-center">' +
'                        <span className="text-[13px] block mb-0.5">\\u2600\\ufe0f</span>' +
'                        <span className="text-[9px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] block">Ma\\u00f1ana</span>' +
'                        <span className="text-[12px] font-bold text-cm-primary font-[family-name:var(--font-sora)] block mt-0.5">{t.morning}</span>' +
'                      </div>' +
'                      <div className="rounded-lg bg-cm-surface-container-highest/40 px-2.5 py-2 text-center">' +
'                        <span className="text-[13px] block mb-0.5">\\u26c5</span>' +
'                        <span className="text-[9px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] block">Tarde</span>' +
'                        <span className="text-[12px] font-bold text-cm-primary font-[family-name:var(--font-sora)] block mt-0.5">{t.afternoon}</span>' +
'                      </div>' +
'                      <div className="rounded-lg bg-cm-surface-container-highest/40 px-2.5 py-2 text-center">' +
'                        <span className="text-[13px] block mb-0.5">\\ud83c\\udf19</span>' +
'                        <span className="text-[9px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] block">Noche</span>' +
'                        <span className="text-[12px] font-bold text-cm-primary font-[family-name:var(--font-sora)] block mt-0.5">{t.night}</span>' +
'                      </div>' +
'                    </div>' +
'                  </div>' +
'                ))}' +
'              </div>';

// But wait - we need to match the EXACT whitespace of the old block.
// Let me just do a string replacement with the exact old content
// First get the exact old block
console.log('\n---REPLACING---');

// The old block starts at outerDivStart and ends at blockEnd
content = content.substring(0, outerDivStart) + newBlock + content.substring(blockEnd);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS! File updated.');
