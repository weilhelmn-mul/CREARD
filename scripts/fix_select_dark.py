#!/usr/bin/env python3
"""Fix select dropdown options for dark theme."""

FILE = '/home/z/my-project/src/components/admin/PaymentValidationTab.tsx'

with open(FILE, 'r') as f:
    content = f.read()

old_select = '''          <select
            value={paymentsStatusFilter}
            onChange={e => setPaymentsStatusFilter(e.target.value)}
            className="px-3 py-2 bg-cm-surface-container-highest/60 border border-white/10 rounded-lg text-cm-on-surface text-xs focus:outline-none focus:border-[#00ff41]/50 font-[family-name:var(--font-inter)]"
          >
            <option value="all">Todos</option>
            <option value="parcial">Parcial</option>
            <option value="completed">Pagado</option>
          </select>'''

new_select = '''          <select
            value={paymentsStatusFilter}
            onChange={e => setPaymentsStatusFilter(e.target.value)}
            className="px-3 py-2 bg-cm-surface-container-highest/60 border border-white/10 rounded-lg text-cm-on-surface text-xs focus:outline-none focus:border-[#00ff41]/50 font-[family-name:var(--font-inter)]"
          >
            <option value="all" className="bg-[#1a1a2e] text-white">Todos</option>
            <option value="parcial" className="bg-[#1a1a2e] text-white">Parcial</option>
            <option value="completed" className="bg-[#1a1a2e] text-white">Pagado</option>
          </select>'''

content = content.replace(old_select, new_select, 1)

with open(FILE, 'w') as f:
    f.write(content)

print("Done: Fixed select options dark theme styling.")
