# Donut chart: desglose de ingresos por metodo de pago (auditoria CREARD)
import matplotlib.font_manager as fm
fm.fontManager.addfont('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')

import matplotlib.pyplot as plt
plt.rcParams['font.sans-serif'] = ['DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# Datos (produccion, 10-sep-2026)
labels = ['Efectivo', 'Yape', 'Culqi', 'Plin']
values = [3886.00, 817.50, 435.00, 65.00]
total = sum(values)
# Colores cascade: ACCENT, ACCENT_2, HEADER_FILL, ICON
colors_ = ['#87702a', '#3a95b4', '#504933', '#8c7e52']

fig, ax = plt.subplots(figsize=(7.4, 3.8), dpi=200, constrained_layout=True)

# Donut: hole 65% (wedgeprops width=0.35), sin etiquetas sobre el grafico (estrategia C)
wedges, _ = ax.pie(
    values, colors=colors_, startangle=90, counterclock=False,
    wedgeprops=dict(width=0.35, edgecolor='white', linewidth=1.5),
)
ax.text(0, 0.08, 'S/ 5,203.50', ha='center', va='center',
        fontsize=15, fontweight='bold', color='#1c1c1a')
ax.text(0, -0.16, 'Total ingresado', ha='center', va='center',
        fontsize=9, color='#78766f')
ax.set(aspect='equal')

# Leyenda rica a la derecha (sin borde, marcadores circulares)
legend_labels = [
    f'{l}  -  S/ {v:,.2f}  ({v/total*100:.1f}%)'.replace(',', '@').replace('.', ',').replace('@', '.')
    for l, v in zip(labels, values)
]
ax.legend(wedges, legend_labels, loc='center left', bbox_to_anchor=(1.02, 0.5),
          frameon=False, fontsize=10, handlelength=0.9, handleheight=0.9,
          borderaxespad=0, labelspacing=1.1)

fig.savefig('/home/z/my-project/scripts/audit_donut_metodo.png', facecolor='white')
print('OK donut guardado')
