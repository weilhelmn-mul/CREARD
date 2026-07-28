import re

with open('src/components/bookings/UnifiedBookingView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Improve the court selector design ("Selecciona Canchas" section)
old_court_header = '''            <h2 className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-2.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#00ff41]">sports</span>
              Selecciona Canchas
              {selectedCourtIds.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#00ff41]/15 text-[#00ff41] text-[10px] font-bold">
                  {selectedCourtIds.length}
                </span>
              )}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(courtsBySport).map(([sport, sportCourts]) => (
                <div key={sport}>
                  {Object.keys(courtsBySport).length > 1 && (
                    <p className="text-[10px] font-semibold text-cm-on-surface-variant/60 font-[family-name:var(--font-inter)] mb-1.5 px-1 uppercase tracking-wider">
                      {sportConfig[sport]?.label || sport}
                    </p>
                  )}
                  <div className="space-y-2">
                    {sportCourts.map((court) => {
                      const isSelected = selectedCourtIds.includes(court.id)
                      const cfg = sportConfig[court.sport] || { icon: 'sports', color: '#00ff41' }
                      return (
                        <button key={court.id} type="button" onClick={() => handleCourtToggle(court.id)}
                          className={`w-full flex items-center gap-2.5 py-3.5 px-3.5 rounded-xl transition-all duration-200 border text-left ${
                            isSelected
                              ? 'bg-[#00ff41]/10 border-[#00ff41]/30'
                              : 'bg-cm-surface-container-highest/40 border-transparent hover:border-white/10'
                          }`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected ? 'bg-[#00ff41]/20' : 'bg-white/5'
                          }`}>
                            <span className={`material-symbols-outlined text-[20px] ${isSelected ? 'text-[#00ff41]' : 'text-cm-on-surface-variant'}`}
                              style={{ fontVariationSettings: isSelected ? '"FILL" 1' : '"FILL" 0' }}>
                              {cfg.icon}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold font-[family-name:var(--font-sora)] truncate ${isSelected ? 'text-[#00ff41]' : 'text-cm-on-surface'}`}>
                              {court.name}
                            </p>
                          </div>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected ? 'bg-[#00ff41] border-[#00ff41]' : 'border-white/20'
                          }`}>
                            {isSelected && (
                              <span className="material-symbols-outlined text-[#003907] text-[14px]">check</span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>'''

new_court_header = '''            <h2 className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#00ff41]" style={{ fontVariationSettings: '\"FILL\" 1' }}>sports</span>
              Selecciona Canchas
              {selectedCourtIds.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#00ff41]/15 text-[#00ff41] text-[10px] font-bold">
                  {selectedCourtIds.length} seleccionada{selectedCourtIds.length > 1 ? 's' : ''}
                </span>
              )}
            </h2>
            <div className="space-y-3">
              {Object.entries(courtsBySport).map(([sport, sportCourts]) => (
                <div key={sport}>
                  {Object.keys(courtsBySport).length > 1 && (
                    <p className="text-[10px] font-semibold text-cm-on-surface-variant/50 font-[family-name:var(--font-inter)] mb-2 px-0.5 uppercase tracking-wider">
                      {sportConfig[sport]?.label || sport}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {sportCourts.map((court) => {
                      const isSelected = selectedCourtIds.includes(court.id)
                      const cfg = sportConfig[court.sport] || { icon: 'sports', color: '#00ff41' }
                      return (
                        <button key={court.id} type="button" onClick={() => handleCourtToggle(court.id)}
                          className={`group relative w-full flex items-center gap-3 py-3 px-3 rounded-2xl transition-all duration-200 border text-left ${
                            isSelected
                              ? 'bg-[#00ff41]/10 border-[#00ff41]/30 shadow-[0_0_16px_rgba(0,255,65,0.08)]'
                              : 'bg-cm-surface-container-highest/30 border-white/5 hover:border-white/15 hover:bg-cm-surface-container-highest/50'
                          }`}>
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                            isSelected ? 'bg-[#00ff41]/20 shadow-[0_0_12px_rgba(0,255,65,0.15)]' : 'bg-white/[0.04] group-hover:bg-white/[0.07]'
                          }`}>
                            <span className={`material-symbols-outlined text-[22px] transition-colors duration-200 ${isSelected ? 'text-[#00ff41]' : 'text-cm-on-surface-variant/60 group-hover:text-cm-on-surface-variant'}`}
                              style={{ fontVariationSettings: isSelected ? '\"FILL\" 1' : '\"FILL\" 0' }}>
                              {cfg.icon}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13px] font-semibold font-[family-name:var(--font-sora)] truncate transition-colors duration-200 ${isSelected ? 'text-[#00ff41]' : 'text-cm-on-surface'}`}>
                              {court.name}
                            </p>
                          </div>
                          <div className={`w-[22px] h-[22px] rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                            isSelected ? 'bg-[#00ff41] border-[#00ff41] scale-110' : 'border-white/15 group-hover:border-white/30'
                          }`}>
                            {isSelected && (
                              <span className="material-symbols-outlined text-[#003907] text-[14px]">check</span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>'''

if old_court_header in content:
    content = content.replace(old_court_header, new_court_header)
    print('Court selector design updated!')
else:
    print('ERROR: Could not find court selector block')
    # Try to find partial match
    if 'Selecciona Canchas' in content:
        print('Found "Selecciona Canchas" in content')
    else:
        print('Did NOT find "Selecciona Canchas" in content')
    exit(1)

# 2. Remove "Manana"/"Noche" labels from time slots
old_slot_text = '''                      <p className={`text-[10px] font-[family-name:var(--font-inter)] mt-0.5 ${status === 'selected' ? 'text-blue-400/70' : 'text-cm-on-surface-variant/40'}`}>
                        {isMorning ? 'Ma\u00f1ana' : 'Noche'}
                      </p>'''

new_slot_text = ''

if old_slot_text in content:
    content = content.replace(old_slot_text, new_slot_text)
    print('Removed Ma\u00f1ana/Noche labels from time slots!')
else:
    print('WARNING: Could not find Manana/Noche label block to remove')
    # Try finding with actual bytes
    idx = content.find('Ma')
    if idx >= 0:
        print(f'Context around Ma: {repr(content[idx-20:idx+30])}')

with open('src/components/bookings/UnifiedBookingView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done!')
