#!/usr/bin/env python3
"""Fix date offset bug across all components.
Root cause: fmtDate uses Date.UTC(y,m-1,day) which creates midnight UTC.
In Lima (UTC-5), midnight UTC = 7PM previous day, showing wrong date.
Fix: Parse string parts directly without using Date constructor.
"""
import re
import os

BASE = '/home/z/my-project/src'

# The safe fmtDate replacement (no Date constructor)
SAFE_FMTDATE = """const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const fmtDate = (d: string) => {
  if (!d) return '-'
  if (d.includes('-')) {
    const p = d.split('-').map(Number)
    return `${p[2]} ${MONTHS_ES[p[1] - 1]}`
  }
  return d
}"""

SAFE_FMTDATE_FULL = """const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const fmtDateFull = (d: string) => {
  if (!d) return '-'
  if (d.includes('-')) {
    const p = d.split('-').map(Number)
    return `${p[2]} ${MONTHS_ES[p[1] - 1]} ${p[0]}`
  }
  return d
}"""

def fix_file(filepath, patterns_and_replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for pattern, replacement in patterns_and_replacements:
        content = re.sub(pattern, replacement, content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  Fixed: {filepath}')
        return True
    return False

# Pattern 1: Date.UTC fmtDate (used in BookingsTable, PaymentValidationTab, AdminDashboard)
P1 = re.compile(
    r"const fmtDate = \(d: string\) => \{\s*"
    r"const \[y, m, day\] = d\.split\(\'\-\'\)\.map\(Number\)\s*"
    r"const date = new Date\(Date\.UTC\(y, m - 1, day\)\)\s*"
    r"return date\.toLocaleDateString\(\'es-PE\',\s*\{\s*day: \'numeric\',\s*month: \'short\',\s*timeZone: \'America/Lima\'\s*\}\)\s*\}",
    re.DOTALL
)

# Pattern 1b: compact version on one or two lines
P1b = re.compile(
    r"const fmtDate = \(d: string\) => \{\n"
    r"  const \[y, m, day\] = d\.split\('-'\)\.map\(Number\)\n"
    r"  const date = new Date\(Date\.UTC\(y, m - 1, day\)\)\n"
    r"  return date\.toLocaleDateString\('es-PE', \{ day: 'numeric', month: 'short', timeZone: 'America/Lima' \}\)\n"
    r"\}",
)

# Pattern 2: fmtDateFull with Date.UTC
P2 = re.compile(
    r"const fmtDateFull = \(d: string\) => \{\n"
    r"  const \[y, m, day\] = d\.split\('-'\)\.map\(Number\)\n"
    r"  const date = new Date\(Date\.UTC\(y, m - 1, day\)\)\n"
    r"  return date\.toLocaleDateString\('es-PE', \{ day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Lima' \}\)\n"
    r"\}",
)

# Pattern 3: T00:00:00 pattern (RecurringPreviewTable, ExpensesTable, SeriesBookingsTable)
P3 = re.compile(
    r"const fmtDate = \(d: string\) => \{\n"
    r"  const date = new Date\(d \+ 'T00:00:00'\);\n"
    r"  return date\.toLocaleDateString\('es-PE', \{ day: 'numeric', month: 'short' \}\)\n"
    r"\}",
)

# Pattern 4: fmtDateFull with T00:00:00
P4 = re.compile(
    r"const fmtDateFull = \(d: string\) => \{\n"
    r"  const date = new Date\(d \+ 'T00:00:00'\);\n"
    r"  return date\.toLocaleDateString\('es-PE', \{ day: 'numeric', month: 'short', year: 'numeric' \}\)\n"
    r"\}",
)

files_fixed = 0

# Fix all component files
files_to_check = [
    'components/admin/tables/BookingsTable.tsx',
    'components/admin/PaymentValidationTab.tsx',
    'components/admin/AdminDashboard.tsx',
    'components/admin/tables/RecurringPreviewTable.tsx',
    'components/admin/tables/ExpensesTable.tsx',
    'components/admin/tables/SeriesBookingsTable.tsx',
]

for rel_path in files_to_check:
    filepath = os.path.join(BASE, rel_path)
    if not os.path.exists(filepath):
        print(f'  Skip (not found): {rel_path}')
        continue
    
    fixed = fix_file(filepath, [
        (P1, SAFE_FMTDATE),
        (P1b, SAFE_FMTDATE),
        (P2, SAFE_FMTDATE_FULL),
        (P3, SAFE_FMTDATE),
        (P4, SAFE_FMTDATE_FULL),
    ])
    if fixed:
        files_fixed += 1

print(f'\nTotal files fixed: {files_fixed}')
