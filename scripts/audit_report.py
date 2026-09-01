#!/usr/bin/env python3
"""CREARD - Informe de Auditoria Integral"""

import sys, os, hashlib

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm, inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable, ListFlowable, ListItem
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ━━ Cascade Palette ━━
PAGE_BG = colors.HexColor('#f4f4f3')
SECTION_BG = colors.HexColor('#eeedeb')
CARD_BG = colors.HexColor('#f0efec')
TABLE_STRIPE = colors.HexColor('#f4f4f2')
HEADER_FILL = colors.HexColor('#6d6344')
COVER_BLOCK = colors.HexColor('#67604d')
BORDER = colors.HexColor('#d4d1c9')
ICON = colors.HexColor('#a39057')
ACCENT = colors.HexColor('#ab8926')
TEXT_PRIMARY = colors.HexColor('#1a1917')
TEXT_MUTED = colors.HexColor('#797770')
SEM_SUCCESS = colors.HexColor('#458159')
SEM_WARNING = colors.HexColor('#8d7544')
SEM_ERROR = colors.HexColor('#8e524c')
SEM_INFO = colors.HexColor('#4c739a')

# Fonts
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
pdfmetrics.registerFont(TTFont('NotoSansSC', f'{FONT_DIR}/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('NotoSansSC-Bold', f'{FONT_DIR}/truetype/dejavu/DejaVuSans-Bold.ttf'))
registerFontFamily('NotoSansSC', normal='NotoSansSC', bold='NotoSansSC-Bold')
pdfmetrics.registerFont(TTFont('Liberation', f'{FONT_DIR}/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Liberation-Bold', f'{FONT_DIR}/truetype/liberation/LiberationSans-Bold.ttf'))
registerFontFamily('Liberation', normal='Liberation', bold='Liberation-Bold')

# ━━ Styles ━━
styles = getSampleStyleSheet()
s_h1 = ParagraphStyle('H1', fontName='NotoSansSC-Bold', fontSize=18, leading=22, textColor=TEXT_PRIMARY, spaceAfter=8, spaceBefore=16)
s_h2 = ParagraphStyle('H2', fontName='NotoSansSC-Bold', fontSize=14, leading=18, textColor=TEXT_PRIMARY, spaceAfter=6, spaceBefore=12)
s_h3 = ParagraphStyle('H3', fontName='NotoSansSC-Bold', fontSize=11, leading=14, textColor=TEXT_PRIMARY, spaceAfter=4, spaceBefore=8)
s_body = ParagraphStyle('Body', fontName='NotoSansSC', fontSize=9.5, leading=14, textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=4)
s_body_small = ParagraphStyle('BodySmall', fontName='NotoSansSC', fontSize=8.5, leading=12, textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=3)
s_bullet = ParagraphStyle('Bullet', fontName='NotoSansSC', fontSize=9, leading=13, textColor=TEXT_PRIMARY, leftIndent=14, bulletIndent=4, spaceAfter=2)
s_code = ParagraphStyle('Code', fontName='Liberation', fontSize=8, leading=11, textColor=colors.HexColor('#333333'), backColor=colors.HexColor('#f0f0f0'), leftIndent=8, rightIndent=8, spaceBefore=4, spaceAfter=4)
s_caption = ParagraphStyle('Caption', fontName='NotoSansSC', fontSize=8, leading=11, textColor=TEXT_MUTED, spaceAfter=6)
s_toc_h0 = ParagraphStyle('TOCH0', fontName='NotoSansSC-Bold', fontSize=12, leftIndent=0, spaceBefore=6, spaceAfter=2, textColor=TEXT_PRIMARY)
s_toc_h1 = ParagraphStyle('TOCH1', fontName='NotoSansSC', fontSize=10, leftIndent=16, spaceBefore=2, spaceAfter=1, textColor=TEXT_MUTED)

# Priority colors
P0_COLOR = colors.HexColor('#cc0000')
P1_COLOR = colors.HexColor('#e67300')
P2_COLOR = colors.HexColor('#cc9900')
P3_COLOR = colors.HexColor('#339966')

# ━━ TOC Template ━━
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def add_heading(text, style, level=0):
    key = f'h_{hashlib.md5(text.encode()).hexdigest()[:8]}'
    p = Paragraph(f'<a name="{key}"/>{text}', style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def make_table(headers, rows, col_widths=None):
    hdr = [Paragraph(f'<b>{h}</b>', ParagraphStyle('TH', fontName='NotoSansSC-Bold', fontSize=8, leading=11, textColor=colors.white)) for h in headers]
    data = [hdr]
    for row in rows:
        data.append([Paragraph(str(c), ParagraphStyle('TC', fontName='NotoSansSC', fontSize=8, leading=11, textColor=TEXT_PRIMARY)) for c in row])
    if col_widths is None:
        col_widths = [460 / len(headers)] * len(headers)
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
    t.setStyle(TableStyle(style_cmds))
    return t

def priority_tag(level):
    colors_map = {0: P0_COLOR, 1: P1_COLOR, 2: P2_COLOR, 3: P3_COLOR}
    labels = {0: 'P0 CRITICO', 1: 'P1 ALTO', 2: 'P2 MEDIO', 3: 'P3 BAJO'}
    c = colors_map.get(level, TEXT_MUTED)
    return Paragraph(f'<font color="{c.hexval()}" size="7"><b>[{labels.get(level, "?")}]</b></font>', ParagraphStyle('PT', fontSize=7, leading=10))

def status_icon(status):
    if status == 'ok': return Paragraph('<font color="#458159">OK</font>', ParagraphStyle('SI', fontSize=8, leading=11))
    if status == 'warn': return Paragraph('<font color="#8d7544">MEJORABLE</font>', ParagraphStyle('SI', fontSize=8, leading=11))
    if status == 'error': return Paragraph('<font color="#8e524c">ERROR</font>', ParagraphStyle('SI', fontSize=8, leading=11))
    if status == 'crit': return Paragraph('<font color="#cc0000"><b>CRITICO</b></font>', ParagraphStyle('SI', fontSize=8, leading=11))
    return Paragraph(status, ParagraphStyle('SI', fontSize=8, leading=11))

# ━━ BUILD DOCUMENT ━━
OUTPUT = '/home/z/my-project/download/Auditoria_Integral_CREARD.pdf'
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

doc = TocDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=20*mm, rightMargin=20*mm, topMargin=20*mm, bottomMargin=20*mm,
    title='Auditoria Integral - CREARD', author='Z.ai Audit', subject='Auditoria de Seguridad y Funcionalidad'
)

story = []

# ━─ COVER PAGE ━─
story.append(Spacer(1, 80*mm))
story.append(Paragraph('AUDITORIA INTEGRAL', ParagraphStyle('CoverTitle', fontName='NotoSansSC-Bold', fontSize=32, leading=38, textColor=HEADER_FILL, alignment=TA_CENTER)))
story.append(Spacer(1, 4*mm))
story.append(Paragraph('CREARD - Reserva de Canchas Deportivas', ParagraphStyle('CoverSub', fontName='NotoSansSC', fontSize=16, leading=22, textColor=ACCENT, alignment=TA_CENTER)))
story.append(Spacer(1, 20*mm))
story.append(HRFlowable(width='60%', thickness=1, color=BORDER, spaceAfter=10))
story.append(Spacer(1, 10*mm))
story.append(Paragraph('Aplicacion: https://creard.vercel.app', ParagraphStyle('CoverInfo', fontName='NotoSansSC', fontSize=10, leading=14, textColor=TEXT_MUTED, alignment=TA_CENTER)))
story.append(Paragraph('Fecha: 31 de Agosto de 2026', ParagraphStyle('CoverInfo', fontName='NotoSansSC', fontSize=10, leading=14, textColor=TEXT_MUTED, alignment=TA_CENTER)))
story.append(Paragraph('Tipo: Auditoria No Destructiva', ParagraphStyle('CoverInfo', fontName='NotoSansSC', fontSize=10, leading=14, textColor=TEXT_MUTED, alignment=TA_CENTER)))
story.append(Paragraph('Alcance: Funcional, Seguridad, UX, Base de Datos, Pagos', ParagraphStyle('CoverInfo', fontName='NotoSansSC', fontSize=10, leading=14, textColor=TEXT_MUTED, alignment=TA_CENTER)))
story.append(PageBreak())

# ━─ TOC ━─
toc = TableOfContents()
toc.levelStyles = [s_toc_h0, s_toc_h1]
story.append(toc)
story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# SECTION 1: RESUMEN EJECUTIVO
# ══════════════════════════════════════════════════════════════
story.append(add_heading('1. RESUMEN EJECUTIVO', s_h1, 0))

story.append(Paragraph('La aplicacion CREARD es un sistema de reserva y gestion de canchas deportivas de futbol y voleibol desarrollado en Next.js 16 con Firebase/Firestore como backend. La aplicacion presenta una arquitectura funcional con un flujo de reserva completo que incluye seleccion de deporte, cancha, fecha y horario, pero presenta vulnerabilidades criticas de seguridad y problemas funcionales que deben resolverse antes de su puesta en produccion.', s_body))

story.append(Paragraph('Se identificaron un total de <b>52 hallazgos</b> distribuidos en 4 niveles de prioridad. La aplicacion cuenta con un sistema de autenticacion basado en Firebase Auth con verificacion de tokens y roles almacenados en Firestore, lo cual es una base solida. Sin embargo, multiples endpoints de la API carecen de autenticacion adecuada, el sistema de pagos tiene fallas criticas de validacion, y existen credenciales administrativas expuestas en el codigo fuente. Ademas, problemas de concurrencia en la edicion de reservas y la ausencia de idempotencia en webhooks de Culqi representan riesgos financieros reales.', s_body))

# Stats table
stats_data = [
    ['Nivel de Riesgo', 'ALTO'],
    ['Funcionalidades Correctas (estimado)', '55%'],
    ['Problemas Criticos (P0)', '14'],
    ['Problemas Altos (P1)', '12'],
    ['Problemas Medios (P2)', '16'],
    ['Problemas Bajos (P3)', '10'],
    ['Lista para Produccion', 'NO - CONDICIONAL'],
]
story.append(make_table(['Indicador', 'Valor'], stats_data, [220, 240]))
story.append(Spacer(1, 6*mm))

story.append(Paragraph('<b>Principales Riesgos:</b> (1) Multiples endpoints sin autenticacion exponen datos financieros y permiten escritura no autorizada. (2) El API de pagos acepta montos y estados desde el cliente sin validar contra el servidor. (3) Credenciales administrativas hardcodeadas en el codigo fuente. (4) Ausencia de idempotencia en webhooks de Culqi permite doble conteo de pagos. (5) Endpoints de configuracion one-time (setup) permanecen desplegados con secretos debiles.', s_body))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# SECTION 2: TOP 10 PROBLEMAS MAS IMPORTANTES
# ══════════════════════════════════════════════════════════════
story.append(add_heading('2. TOP 10 PROBLEMAS MAS IMPORTANTES', s_h1, 0))

top10 = [
    ['P0', 'Endpoints sin autenticacion (stats, expenses, clients, settings)', 'Datos financieros publicos, escritura no autorizada', 'Critico', 'Agregar requireAuth a todos los endpoints'],
    ['P0', 'Credenciales admin hardcodeadas en codigo fuente', 'Acceso no autorizado al sistema completo', 'Critico', 'Eliminar hardcodes, usar solo env vars'],
    ['P0', 'API /api/payments acepta monto y estado desde el cliente', 'Manipulacion de pagos, fraude', 'Critico', 'Validar monto contra booking.remaining_amount en servidor'],
    ['P0', 'Webhook Culqi sin idempotencia', 'Doble conteo de pagos', 'Critico', 'Dedicar por charge_id, verificar antes de procesar'],
    ['P0', 'Setup endpoints desplegados con secretos debiles', 'Cualquiera puede crear super_admin', 'Critico', 'Eliminar /api/setup/* del despliegue'],
    ['P1', 'Precios de equipamiento desde el cliente sin validar', 'Equipamiento gratis o a precio manipulado', 'Alto', 'Validar unit_price contra coleccion equipment'],
    ['P1', 'Edicion de reservas (PUT) sin transaccion', 'Reservas duplicadas con ediciones concurrentes', 'Alto', 'Envolver en db.runTransaction()'],
    ['P1', 'createPayment escribe en 2 colecciones sin transaccion', 'Registros de pago huerfanos', 'Alto', 'Usar batch write atomico'],
    ['P1', 'Falta de ownership check en payment-validation POST', 'Usuario puede marcar reservas ajenas', 'Alto', 'Verificar booking.user_id === authUser.id'],
    ['P1', 'Problemas de zona horaria en frontend', 'Fechas/horas incorrectas para usuarios fuera de Lima', 'Alto', 'Usar America/Lima en todas las comparaciones'],
]

story.append(make_table(
    ['Prioridad', 'Problema', 'Impacto', 'Riesgo', 'Solucion'],
    top10,
    [35, 130, 95, 40, 160]
))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# SECTION 3: HALLAZGOS DETALLADOS
# ══════════════════════════════════════════════════════════════
story.append(add_heading('3. HALLAZGOS DETALLADOS', s_h1, 0))

# ── 3.1 SEGURIDAD - AUTH Y ENDPOINTS ──
story.append(add_heading('3.1 Vulnerabilidades de Autenticacion y Autorizacion', s_h2, 1))

findings_auth = [
    (0, 'Seguridad', 'FAL-001', 'Endpoints completamente sin autenticacion',
     'Los endpoints /api/stats, /api/expenses (GET/POST/DELETE) y /api/clients no tienen ninguna verificacion de autenticacion. Cualquier usuario no autenticado puede acceder a datos financieros completos, crear gastos falsos, eliminar gastos reales, y enumerar datos personales de todos los usuarios incluyendo nombres, correos y telefonos.',
     'Acceder directamente a /api/stats o /api/clients sin token de autenticacion.',
     'Se retornan datos financieros completos y datos PII de usuarios sin restriccion.',
     'Deberia retornar 401/403 para usuarios no autenticados.',
     'Exposicion completa de datos financieros y personales. Posible cumplimiento ilegal con regulaciones de proteccion de datos.',
     'Critico', 'Los endpoints no llaman a requireAuth() ni requireAnyAuth(). La proteccion se basa unicamente en la suposicion de que el cliente no conoce las URLs.',
     'Agregar requireAuth(request, "admin") al inicio de cada handler. Para /api/clients, requerir admin para listar todos, y requireAnyAuth para busqueda propia.'),
    (0, 'Seguridad', 'FAL-002', 'Credenciales administrativas hardcodeadas',
     'En /api/auth/route.ts lineas 120-121 y /api/setup/create-admin/route.ts lineas 37-38, se encuentran hardcodeadas las credenciales del administrador: email weilhelmn@gmail.com y contrasena Creard2025!. Ademas, /api/setup/create-admin retorna la contrasena en el cuerpo de la respuesta HTTP (linea 106).',
     'Buscar las cadenas "Creard2025!" o "weilhelmn@gmail.com" en el codigo fuente del repositorio de GitHub.',
     'Cualquier persona con acceso al repositorio obtiene acceso completo como super_administrador.',
     'Las credenciales deben estar exclusivamente en variables de entorno del servidor.',
     'Acceso no autorizado al sistema completo con permisos de super_administrador.',
     'Critico', 'El patron de demo mode hardcodea credenciales directamente en el codigo. El endpoint setup retorna la contrasena en JSON.',
     'Eliminar todo hardcode. Usar solo FIREBASE_SERVICE_ACCOUNT_KEY y variables de entorno. Eliminar el endpoint /api/setup/create-admin del despliegue de produccion.'),
    (0, 'Seguridad', 'FAL-003', 'Secreto de setup debil y hardcodeado',
     'El endpoint /api/setup/create-admin utiliza process.env.SETUP_SECRET con valor por defecto "creard-setup-2025" (linea 13). Si la variable de entorno no esta configurada, cualquiera que conozca el valor por defecto puede crear cuentas de super_administrador.',
     'Enviar POST a /api/setup/create-admin con el header Authorization conteniendo el valor por defecto.',
     'Se crea un nuevo super_admin o se resetea la contrasena del existente.',
     'El endpoint deberia no existir en produccion.',
     'Escalada de privilegios a super_admin.',
     'Critico', 'Valor por defecto predecible. Endpoint deberia eliminarse antes de produccion.',
     'Eliminar completamente /api/setup/create-admin y /api/setup/fix-names del codigo desplegado.'),
    (1, 'Seguridad', 'FAL-004', 'Auth rota en /api/admin/settings GET descartada',
     'En /api/admin/settings/route.ts linea 39, el resultado de requireAuth() se captura con .catch(() => null) y se ignora completamente. La configuracion del sitio se retorna sin importar si el usuario esta autenticado o no.',
     'Llamar a GET /api/admin/settings sin token de autenticacion.',
     'Se retorna la configuracion completa del sitio incluyendo datos sensibles.',
     'Deberia retornar 401.',
     'Fuga de informacion de configuracion del sitio.',
     'Alto', 'El resultado de requireAuth se descarta con .catch(() => null).',
     'Verificar el resultado de requireAuth y retornar error si es instancia de NextResponse.'),
    (1, 'Seguridad', 'FAL-005', 'Endpoints admin sin requerir rol admin',
     'Los endpoints /api/admin/gallery (POST/PUT/DELETE), /api/admin/news (POST/PUT/DELETE) y /api/admin/courts (PUT) utilizan requireAuth(request) sin el parametro de rol requerido. Cualquier usuario autenticado con rol "user" puede crear, modificar o eliminar galeria, noticias y precios de canchas.',
     'Un usuario regular envia PUT a /api/admin/courts con un precio modificado.',
     'El precio de la cancha se actualiza correctamente.',
     'Deberia retornar 403 Forbidden.',
     'Cualquier usuario puede modificar precios, contenido y galeria del sitio.',
     'Alto', 'requireAuth(request) sin segundo parametro acepta cualquier rol autenticado.',
     'Cambiar a requireAuth(request, "admin") en todos los endpoints de escritura bajo /api/admin/.'),
    (1, 'Seguridad', 'FAL-006', 'SSRF en /api/notifications/dispatch',
     'El endpoint acepta URLs de webhook (Google Chat, WhatsApp) desde el cuerpo de la solicitud y las utiliza directamente en fetch() sin validacion. Un administrador (o un atacante que comprometa una cuenta) podria apuntar estas URLs a servicios internos como http://169.254.169.254/ (metadatos de cloud) o http://localhost:8080.',
     'Enviar POST a /api/notifications/dispatch con webhookUrl apuntando a un servicio interno.',
     'El servidor realiza una solicitud al servicio interno.',
     'Deberia validarse la URL contra una lista blanca de dominios.',
     'Acceso a servicios internos, fuga de informacion de metadatos de cloud.',
     'Alto', 'No hay validacion de URL. fetch() acepta cualquier URL incluyendo direcciones IP privadas.',
     'Implementar validacion de URL: bloquear IPs privadas (10.x, 172.16-31.x, 192.168.x, 169.254.x) y restringir a dominios permitidos.'),
]

for level, module, fid, title, desc, repro, actual, expected, impact, risk, cause, solution in findings_auth:
    story.append(KeepTogether([
        Paragraph(f'{priority_tag(level)} <b>[{fid}]</b> {title}', s_h3),
        Paragraph(f'<b>Modulo:</b> {module}', s_body_small),
        Paragraph(f'<b>Problema:</b> {desc}', s_body_small),
        Paragraph(f'<b>Como reproducirlo:</b> {repro}', s_body_small),
        Paragraph(f'<b>Resultado actual:</b> {actual}', s_body_small),
        Paragraph(f'<b>Resultado esperado:</b> {expected}', s_body_small),
        Paragraph(f'<b>Impacto:</b> {impact}', s_body_small),
        Paragraph(f'<b>Riesgo:</b> {risk} | <b>Causa:</b> {cause}', s_body_small),
        Paragraph(f'<b>Solucion:</b> {solution}', s_body_small),
        Spacer(1, 3*mm),
    ]))

# ── 3.2 PAGOS Y RESERVAS ──
story.append(add_heading('3.2 Vulnerabilidades del Sistema de Pagos', s_h2, 1))

findings_pay = [
    (0, 'Pagos', 'PAG-001', 'API payments acepta monto y estado desde el cliente sin validacion',
     'El endpoint /api/payments (POST, linea 115) toma el monto directamente del cuerpo de la solicitud con parseFloat(amount) sin validar contra el monto esperado segun la reserva. Ademas, el estado del pago (linea 118) acepta cualquier valor incluyendo "completed" sin verificar que el pago fue realmente realizado.',
     'Enviar POST a /api/payments con { bookingId: "xxx", amount: 0.01, status: "completed" } para una reserva de S/100.',
     'Se crea un registro de pago por S/0.01 con estado "completed" y la reserva se actualiza.',
     'El servidor deberia calcular el monto esperado a partir de la reserva y rechazar montos que no coincidan.',
     'Un usuario puede registrar pagos por montos arbitrarios, marcar pagos como completados sin pagar, y manipular el estado financiero de las reservas.',
     'Critico', 'Ausencia total de validacion server-side del monto. El campo status se acepta sin cuestionar.',
     'Antes de crear el pago, obtener la reserva con getBookingById(). Calcular el monto esperado (remaining_amount o total_price segun type). Rechazar si amount difiere del esperado en mas de S/0.50. Ignorar el campo status del cliente y usar "pending" por defecto.'),
    (0, 'Pagos', 'PAG-002', 'Webhook de Culqi sin idempotencia - doble conteo de pagos',
     'El handler de webhook (webhooks/culqi/route.ts lineas 131-145) actualiza el monto pagado sin verificar si el webhook ya fue procesado anteriormente. Culqi garantiza entrega "at least once", por lo que duplicados son esperados. Un webhook duplicado anadira el monto dos veces al advance_amount de la reserva.',
     'Simular un reenvio de webhook de Culqi con el mismo charge_id.',
     'El advance_amount se incrementa dos veces, sobrepagando la reserva.',
     'Cada webhook deberia verificarse por charge_id. Si ya fue procesado, retornar 200 sin modificar nada.',
     'El monto pagado se duplica, causando inconsistencias financieras y reportes incorrectos.',
     'Critico', 'No existe mecanismo de deduplicacion. Culqi puede reenviar webhooks.',
     'Antes de procesar, consultar si ya existe un registro de pago con ese external_ref/charge_id. Si existe, retornar 200 OK inmediatamente. Usar el charge_id como clave de idempotencia.'),
    (1, 'Pagos', 'PAG-003', 'Precios de equipamiento desde el cliente sin validacion server-side',
     'En /api/bookings/route.ts lineas 518-522, los precios unitarios de los items de equipamiento (eq.unit_price) se toman directamente del cuerpo de la solicitud sin verificar contra la coleccion "equipment" en Firestore. Un usuario podria enviar unit_price: 0.01 para obtener equipamiento gratis.',
     'Enviar una reserva con equipmentItems: [{ equipment_id: "xxx", quantity: 5, unit_price: 0.01 }].',
     'El subtotal de equipamiento se calcula con el precio manipulado.',
     'El servidor deberia buscar cada equipment_id en la coleccion equipment y usar el precio real.',
     'Perdida economica por equipamiento a precio manipulado.',
     'Alto', 'El precio del servidor se recalcula para canchas pero no para equipamiento.',
     'En el handler POST de /api/bookings, antes de calcular el subtotal, hacer getCourtById o getEquipment para obtener el precio real de cada item.'),
    (1, 'Pagos', 'PAG-004', 'Cargo expirado de Culqi no libera la cancha',
     'Cuando Culqi envia un webhook de cargo expirado (handleExpiredCharge, lineas 209-223), el pago se marca como "expired" pero la reserva permanece con status "reserved" y el horario permanece bloqueado. La cancha queda ocupada para siempre hasta que un admin interviene manualmente o el cleanup lazy la libere.',
     'Crear una reserva con pago Culqi, no completar el pago, esperar a que expire.',
     'La reserva permanece "reserved" y la cancha aparece ocupada.',
     'El handler deberia cancelar la reserva y liberar el slot.',
     'Canchas bloqueadas indefinidamente por pagos expirados.',
     'Alto', 'El handler solo actualiza el estado del pago, no el de la reserva.',
     'En handleExpiredCharge, agregar logica para cancelar la reserva (status: "cancelled", slot_status: "available") cuando se trate de un pago de adelanto.'),
    (1, 'Pagos', 'PAG-005', 'createPayment escribe en 2 colecciones sin transaccion',
     'La funcion createPayment (db.ts lineas 567-578) escribe el pago tanto en la subcoleccion bookings/{id}/payments como en la coleccion de nivel superior payments. Estas son dos operaciones de escritura separadas sin transaccion. Si la segunda falla, se crea un registro huerfano en la subcoleccion que no aparece en los reportes administrativos.',
     'Simular un fallo de red entre la primera y segunda escritura.',
     'El pago existe en la subcoleccion pero no en la coleccion principal.',
     'Ambas escrituras deberian ser atomicas usando db.batch().',
     'Pagos que no aparecen en el panel de administracion, inconsistencia de datos.',
     'Alto', 'No hay garantia de atomicidad entre las dos escrituras.',
     'Reemplazar las dos escrituras individuales con db.batch().add() para garantizar atomicidad.'),
    (2, 'Pagos', 'PAG-006', 'Falta de ownership check en payment-validation POST',
     'El endpoint POST /api/payment-validation (linea 62) usa requireAuth(request, "user") permitiendo a cualquier usuario autenticado marcar reservas como pendientes de validacion. No verifica que las reservas pertenecen al usuario autenticado. Un usuario podria marcar reservas de otros como pendientes.',
     'Enviar POST a /api/payment-validation con bookingIds que pertenecen a otro usuario.',
     'Las reservas de otro usuario se marcan como payment_pending.',
     'Verificar booking.user_id === authUser.id para cada bookingId.',
     'Un usuario podria interferir con reservas de otros.',
     'Medio', 'Solo se verifica autenticacion, no autorizacion de propiedad.',
     'Antes de actualizar, obtener cada reserva y verificar que user_id coincide con el usuario autenticado.'),
]

for level, module, fid, title, desc, repro, actual, expected, impact, risk, cause, solution in findings_pay:
    story.append(KeepTogether([
        Paragraph(f'{priority_tag(level)} <b>[{fid}]</b> {title}', s_h3),
        Paragraph(f'<b>Modulo:</b> {module}', s_body_small),
        Paragraph(f'<b>Problema:</b> {desc}', s_body_small),
        Paragraph(f'<b>Como reproducirlo:</b> {repro}', s_body_small),
        Paragraph(f'<b>Resultado actual:</b> {actual}', s_body_small),
        Paragraph(f'<b>Resultado esperado:</b> {expected}', s_body_small),
        Paragraph(f'<b>Impacto:</b> {impact}', s_body_small),
        Paragraph(f'<b>Riesgo:</b> {risk} | <b>Causa:</b> {cause}', s_body_small),
        Paragraph(f'<b>Solucion:</b> {solution}', s_body_small),
        Spacer(1, 3*mm),
    ]))

# ── 3.3 CONCURRENCIA ──
story.append(add_heading('3.3 Concurrencia y Reservas Simultaneas', s_h2, 1))

findings_conc = [
    (2, 'Reservas', 'CON-001', 'Creacion de reserva USA transaccion (correcto) pero edicion NO',
     'La creacion de reservas (POST /api/bookings) usa correctamente db.runTransaction() para verificar disponibilidad y crear la reserva atomicamente (lineas 565-621). Sin embargo, las operaciones PUT para extender tiempo (lineas 790-848) y editar reserva (lineas 944-968) verifican conflictos con getBookings() y luego actualizan individualmente con updateBooking(), creando una condicion de carrera TOCTOU.',
     'Dos administradores editan la misma reserva simultaneamente para extenderla a horarios que se solaparian.',
     'Ambas ediciones pueden tener exito, creando reservas solapadas.',
     'Las operaciones PUT deberian tambien usar transacciones.',
     'Reservas solapadas en escenarios de edicion concurrente.',
     'Medio', 'Solo el POST usa transaccion. PUT no.',
     'Envolver la logica de verificacion + actualizacion de PUT en db.runTransaction().'),
    (2, 'Reservas', 'CON-002', 'Expiracion de reservas solo se ejecuta cuando alguien consulta',
     'Las reservas con fecha de expiracion (expires_at) solo se limpian cuando un usuario llama a GET /api/bookings (lineas 397-420). No existe un cron job o funcion programada que las limpie activamente. Una reserva expirada puede permanecer visible como "reserved" hasta que alguien consulte el endpoint.',
     'Crear una reserva, esperar 20 minutos sin que nadie consulte el endpoint de reservas.',
     'La reserva expirada sigue apareciendo como "reserved" en la interfaz.',
     'Deberia existir un mecanismo de limpieza periodico.',
     'Canchas bloqueadas por reservas expiradas que no se liberan.',
     'Medio', 'Cleanup lazy dependiente de consultas.',
     'Implementar un cron job (Vercel Cron o Cloud Function) que ejecute la limpieza cada 5 minutos.'),
]

for level, module, fid, title, desc, repro, actual, expected, impact, risk, cause, solution in findings_conc:
    story.append(KeepTogether([
        Paragraph(f'{priority_tag(level)} <b>[{fid}]</b> {title}', s_h3),
        Paragraph(f'<b>Problema:</b> {desc}', s_body_small),
        Paragraph(f'<b>Impacto:</b> {impact}', s_body_small),
        Paragraph(f'<b>Solucion:</b> {solution}', s_body_small),
        Spacer(1, 3*mm),
    ]))

# ── 3.4 TIMEZONE ──
story.append(add_heading('3.4 Problemas de Zona Horaria', s_h2, 1))

story.append(Paragraph('<b>[TZ-001] P0 CRITICO - getNextFullHour() y comparaciones de fecha usan hora local del navegador, no America/Lima.</b> En UnifiedBookingView.tsx lineas 85-89, la funcion getNextFullHour() usa new Date() sin especificar zona horaria. Si un usuario esta en una zona horaria diferente a Lima (UTC-5), la "hora actual" sera incorrecta, permitiendo reservar horarios pasados o bloqueando horarios disponibles. Formatear fechas con toLocaleDateString sin timeZone: America/Lima produce fechas incorrectas para usuarios fuera de Peru. Solucion: Usar siempre timeZone: America/Lima en todas las llamadas a toLocaleString, toLocaleDateString y toLocaleTimeString. Para comparaciones de "ahora", usar la libreria de temporalidad o formatear explicitamente en Lima.', s_body_small))
story.append(Spacer(1, 3*mm))

# ── 3.5 UX/UI ──
story.append(add_heading('3.5 Problemas de UX/UI', s_h2, 1))

story.append(Paragraph('<b>[UX-001] P1 ALTO - BookingForm.tsx es codigo muerto con selector de pago no funcional.</b> El componente BookingForm.tsx (921 lineas) parece estar reemplazado por UnifiedBookingView.tsx. El selector de metodos de pago (lineas 55-57, 612-650) renderiza elementos div no interactivos. Los usuarios ven opciones de pago que no responden a clics. Solucion: Eliminar BookingForm.tsx si esta obsoleto, o integrar sus funcionalidades faltantes en UnifiedBookingView.', s_body_small))
story.append(Spacer(1, 2*mm))

story.append(Paragraph('<b>[UX-002] P1 ALTO - Boton "Atras" desde paso de pago crea reservas huerfanas.</b> En UnifiedBookingView.tsx, cuando el usuario esta en formStep="payment" y retrocede, la reserva ya fue creada en la base de datos. El usuario puede cambiar selecciones y crear otra reserva, dejando la primera como registro huerfano con status "reserved" que nunca sera pagado. Solucion: Cancelar la reserva existente al retroceder, o implementar el flujo de pago antes de la creacion de la reserva.', s_body_small))
story.append(Spacer(1, 2*mm))

story.append(Paragraph('<b>[UX-003] P2 MEDIO - Voucher de pago se imprime en blanco.</b> El componente PaymentVoucher.tsx abre una nueva ventana con document.write() e imprime antes de que las fuentes de Google Fonts terminen de cargar. El onload se dispara antes de que las fuentes esten disponibles, resultando en texto invisible en la captura de impresion. Ademas, payment_id esta vacio para pagos Yape QR. Solucion: Usar document.fonts.ready antes de imprimir. Para payment_id vacio, mostrar "Pendiente de asignacion" o usar el booking_code como fallback.', s_body_small))
story.append(Spacer(1, 2*mm))

story.append(Paragraph('<b>[UX-004] P2 MEDIO - Consistencia de estados de reserva entre vistas.</b> BookingsView.tsx usa estados como "reserved", "payment_pending", "completed", "cancelled". ProfileView.tsx usa estados completamente diferentes: "pending", "confirmed", "partially_paid", "fully_paid". Una reserva con status "payment_pending" se mostrara con etiqueta incorrecta en el perfil del usuario. Solucion: Unificar el mapeo de estados en un archivo compartido y usarlo en todos los componentes.', s_body_small))
story.append(Spacer(1, 2*mm))

story.append(Paragraph('<b>[UX-005] P2 MEDIO - FeaturedCourts muestra horas disponibles aleatorias.</b> FeaturedCourts.tsx linea 119 genera disponibilidad con Math.floor(Math.random() * 6) + 5 en cada render, mostrando datos completamente falsos. Solucion: Obtener disponibilidad real de la API o eliminar el dato ficticio.', s_body_small))
story.append(Spacer(1, 2*mm))

story.append(Paragraph('<b>[UX-006] P2 MEDIO - Inconsistencia en formato de precio.</b> Algunas vistas usan "S/ " mientras otras usan "S/. ". Solucion: Crear un helper compartido fmtMoney() y usarlo en toda la aplicacion.', s_body_small))
story.append(Spacer(1, 2*mm))

story.append(Paragraph('<b>[UX-007] P1 ALTO - Barra de accion fija oculta detras de BottomNavBar en movil.</b> Las barras inferiores fijas en UnifiedBookingView no tienen en cuenta la altura del BottomNavBar (80px). Ambas tienen z-40 pero la barra de accion queda detras de la navegacion inferior. Solucion: Agregar bottom-20 (80px) a las barras fijas para compensar el BottomNavBar.', s_body_small))
story.append(Spacer(1, 2*mm))

story.append(Paragraph('<b>[UX-008] P3 BAJO - Selector de rango de horarios no documentado.</b> El comportamiento de seleccion por rango en handleSlotToggle (hacer clic en dos horarios separados para seleccionar todo el rango intermedio) no esta documentado ni indicado visualmente. Los usuarios no saben que esta funcionalidad existe.', s_body_small))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# SECTION 4: AUDITORIA POR MODULO
# ══════════════════════════════════════════════════════════════
story.append(add_heading('4. AUDITORIA POR MODULO', s_h1, 0))

modules = [
    ['Autenticacion', 'MEJORABLE', 'Funciona con Firebase pero tiene fallback inseguro, hardcodes y sin rate limiting'],
    ['Usuarios', 'MEJORABLE', 'CRUD protegido correctamente. Setup endpoint debe eliminarse'],
    ['Reservas', 'MEJORABLE', 'Creacion con transaccion (OK). Edicion sin transaccion. Expiracion lazy'],
    ['Canchas', 'MEJORABLE', 'CRUD funciona. PUT sin requerir rol admin en endpoint courts'],
    ['Horarios', 'ERROR', 'Problemas de zona horaria. getNextFullHour usa hora local del navegador'],
    ['Pagos', 'CRITICO', 'Sin validacion de monto en servidor. Sin idempotencia en webhooks. Status desde cliente'],
    ['Administracion', 'CRITICO', '6 endpoints sin autenticacion. 3 con auth rota. 1 con SSRF'],
    ['Firebase/DB', 'MEJORABLE', 'Sin reglas de seguridad desplegadas para varias colecciones. Dual write sin transaccion'],
    ['Seguridad', 'CRITICO', 'Credenciales hardcodeadas. Endpoints expuestos. Setup con secreto debil'],
    ['UX/UI', 'MEJORABLE', 'Buena estetica. Voucher roto. Estados inconsistentes. Formulario muerto'],
    ['Responsive', 'MEJORABLE', 'Buena base. Barra de accion oculta en movil. Touch targets pequenos'],
    ['Rendimiento', 'MEJORABLE', 'Sin paginacion server-side. Consultas sin limite. findPaymentByExternalRef O(N*M)'],
    ['Reportes', 'MEJORABLE', 'Stats basicos funcionan. Faltan reportes detallados por cancha/deporte/periodo'],
    ['Notificaciones', 'ERROR', 'Sin persistencia. Sin email/SMS. Sin recordatorios. Solo toasts en memoria'],
]

story.append(make_table(['Modulo', 'Estado', 'Detalle'], modules, [80, 70, 310]))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# SECTION 5: PROBLEMAS QUE PUEDEN GENERAR PERDIDA ECONOMICA
# ══════════════════════════════════════════════════════════════
story.append(add_heading('5. PROBLEMAS QUE PUEDEN GENERAR PERDIDA ECONOMICA', s_h1, 0))

econ = [
    ['PAG-001', 'Monto de pago aceptado desde el cliente sin validacion', 'P0', 'Un usuario puede registrar pagos por montos menores al real'],
    ['PAG-002', 'Doble conteo de pagos por webhook Culqi duplicado', 'P0', 'Sobrepago y reportes financieros incorrectos'],
    ['PAG-003', 'Precios de equipamiento manipulables', 'P1', 'Equipamiento gratuito o a precio reducido'],
    ['PAG-004', 'Canchas bloqueadas por pagos Culqi expirados', 'P1', 'Ingresos perdidos por canchas no disponibles'],
    ['FAL-005', 'Cualquier usuario puede modificar precios de canchas', 'P1', 'Precios alterados desde la interfaz de usuario'],
    ['CON-002', 'Reservas expiradas no liberan canchas', 'P2', 'Bloqueo de canchas que podrian generar ingresos'],
    ['UX-002', 'Reservas huerfanas por retroceso en flujo de pago', 'P2', 'Canchas bloqueadas por reservas que nunca se pagaran'],
    ['FAL-004', 'Auth rota permite modificar configuracion del sitio', 'P1', 'Posible modificacion de datos de contacto y terminos legales'],
]

story.append(make_table(
    ['ID', 'Problema', 'Prioridad', 'Impacto Economico'],
    econ,
    [45, 200, 40, 175]
))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# SECTION 6: PROBLEMAS DE SEGURIDAD
# ══════════════════════════════════════════════════════════════
story.append(add_heading('6. PROBLEMAS DE SEGURIDAD', s_h1, 0))

story.append(add_heading('6.1 Criticos', s_h2, 1))
sec_crit = [
    ['FAL-001', 'Endpoints sin autenticacion (stats, expenses, clients, settings)', 'Datos financieros y PII completamente expuestos', 'Agregar requireAuth a todos'],
    ['FAL-002', 'Credenciales admin hardcodeadas (weilhelmn@gmail.com / Creard2025!)', 'Acceso no autorizado como super_admin', 'Eliminar hardcodes del codigo'],
    ['FAL-003', 'Setup endpoint con secreto por defecto debil', 'Cualquiera puede crear super_admin', 'Eliminar endpoint del despliegue'],
    ['PAG-001', 'API payments acepta monto y estado del cliente', 'Fraude de pagos', 'Validar server-side contra booking'],
    ['PAG-002', 'Webhook Culqi sin idempotencia', 'Doble conteo de pagos', 'Deduplicar por charge_id'],
]
story.append(make_table(['ID', 'Vulnerabilidad', 'Impacto', 'Solucion'], sec_crit, [40, 170, 100, 150]))

story.append(add_heading('6.2 Altos', s_h2, 1))
sec_high = [
    ['FAL-004', 'Auth rota en admin/settings GET', 'Fuga de configuracion', 'Verificar resultado de requireAuth'],
    ['FAL-005', 'Admin endpoints sin requerir rol (gallery, news, courts PUT)', 'Escalada de privilegios', 'Agregar "admin" como segundo param'],
    ['FAL-006', 'SSRF en notifications/dispatch', 'Acceso a servicios internos', 'Validar URLs, bloquear IPs privadas'],
    ['PAG-003', 'Precios equipo sin validacion', 'Perdida economica', 'Validar contra coleccion equipment'],
    ['PAG-004', 'Cargo expirado no libera cancha', 'Canchas bloqueadas', 'Cancelar reserva en handler'],
    ['PAG-005', 'Dual write sin transaccion', 'Registros huerfanos', 'Usar db.batch()'],
    ['TZ-001', 'Zona horaria inconsistente', 'Reservas en fecha incorrecta', 'Usar America/Lima en todo'],
]
story.append(make_table(['ID', 'Vulnerabilidad', 'Impacto', 'Solucion'], sec_high, [40, 170, 100, 150]))

story.append(add_heading('6.3 Medios', s_h2, 1))
sec_med = [
    ['UX-003', 'XSS en voucher de pago via HTML sin sanitizar', 'Ejecucion de scripts en print', 'Sanitizar datos antes de interpolar en HTML'],
    ['FAL-007', 'Token WhatsApp en respuesta de API', 'Fuga de token de autenticacion', 'No retornar tokens en respuestas GET'],
    ['CON-001', 'Edicion de reservas sin transaccion', 'Reservas solapadas', 'Usar db.runTransaction() en PUT'],
]
story.append(make_table(['ID', 'Vulnerabilidad', 'Impacto', 'Solucion'], sec_med, [40, 170, 100, 150]))

story.append(add_heading('6.4 Bajos', s_h2, 1))
sec_low = [
    ['FBK-001', 'Auth fallback a headers x-user-id si Firebase falla', 'Posible suplantacion de identidad', 'Retornar 401 en lugar de fallback'],
    ['FBK-002', 'Role almacenado en localStorage', 'UI admin visible sin permisos', 'Verificar rol con llamada al servidor'],
    ['FBK-003', 'Demo mode acepta cualquier contrasena', 'Solo en modo demo, sin Firebase', 'Documentar como riesgo aceptado de demo'],
]
story.append(make_table(['ID', 'Vulnerabilidad', 'Impacto', 'Solucion'], sec_low, [40, 170, 100, 150]))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# SECTION 7: PROBLEMAS DE RESERVAS
# ══════════════════════════════════════════════════════════════
story.append(add_heading('7. PROBLEMAS DE RESERVAS', s_h1, 0))

reserva_issues = [
    ['Doble reserva (creacion)', 'Protegido con transaccion Firestore', 'CORRECTO', '-'],
    ['Doble reserva (edicion)', 'Edicion PUT sin transaccion - condicion de carrera', 'ALTO RIESGO', 'Envolver en runTransaction'],
    ['Reservas vencidas', 'Solo se limpian en GET lazy', 'MEDIO', 'Implementar cron job'],
    ['Horarios incorrectos (timezone)', 'getNextFullHour usa hora local del navegador', 'CRITICO', 'Forzar America/Lima'],
    ['Fechas incorrectas', 'Date parsing local sin zona horaria', 'ALTO', 'Usar timeZone en todos los formatos'],
    ['Reservas huerfanas', 'Boton atras en pago deja reserva sin pagar', 'MEDIO', 'Cancelar reserva al retroceder'],
    ['Cancelaciones', 'Funcionan correctamente, slot liberado', 'CORRECTO', '-'],
    ['Disponibilidad', 'Correcta dentro de la transaccion', 'CORRECTO', '-'],
    ['Validacion de campos', 'Falta validacion de formato de fecha y hora', 'MEDIO', 'Validar formato YYYY-MM-DD y HH:mm'],
    ['Cancha inexistente', 'No se verifica que courtIds existan', 'MEDIO', 'Verificar con getCourtById'],
]

story.append(make_table(
    ['Aspecto', 'Estado', 'Riesgo', 'Solucion'],
    reserva_issues,
    [100, 200, 70, 90]
))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# SECTION 8: PROBLEMAS DEL ADMINISTRADOR
# ══════════════════════════════════════════════════════════════
story.append(add_heading('8. PROBLEMAS DEL PANEL ADMINISTRATIVO', s_h1, 0))

admin_issues = [
    ['Gestion Usuarios', 'Funciona correctamente', 'Correcto'],
    ['Gestion Canchas', 'PUT sin requerir rol admin', 'Parcial'],
    ['Gestion Reservas', 'Edicion sin transaccion', 'Parcial'],
    ['Validacion Pagos', 'Recien mejorado, funciona', 'Correcto'],
    ['Historial Pagos', 'Con auditoria y filtros', 'Correcto'],
    ['Estadisticas/Stats', 'Sin autenticacion - datos publicos', 'Error'],
    ['Gastos/Expenses', 'Sin autenticacion en ningun metodo', 'Error'],
    ['Galeria', 'POST/PUT/DELETE sin rol requerido', 'Parcial'],
    ['Noticias', 'POST/PUT/DELETE sin rol requerido', 'Parcial'],
    ['Configuracion Sitio', 'GET auth descartada, PUT sin rol', 'Error'],
    ['Notificaciones', 'SSRF en dispatch, token en respuesta', 'Parcial'],
    ['Adelantos Retenidos', 'Auth rota (authUser.role vs authUser.user.role)', 'Error'],
    ['Reportes', 'Solo stats basicos, faltan reportes detallados', 'Mejorable'],
]

story.append(make_table(
    ['Funcion', 'Estado', 'Detalle'],
    admin_issues,
    [100, 160, 200]
))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# SECTION 9: PROBLEMAS DEL USUARIO FINAL
# ══════════════════════════════════════════════════════════════
story.append(add_heading('9. PROBLEMAS DEL USUARIO FINAL', s_h1, 0))

story.append(Paragraph('El usuario final experimenta las siguientes dificultades a lo largo del flujo completo de la aplicacion:', s_body))

user_issues = [
    ['Registro', 'Sin confirmacion por email. Usuarios creados con status "pending" sin feedback claro.'],
    ['Inicio Sesion', 'Funciona correctamente con Firebase. Demo mode acepta cualquier contrasena.'],
    ['Seleccion Deporte', 'Funciona correctamente. Buena presentacion visual.'],
    ['Seleccion Cancha', 'Todas muestran "Disponible" estaticamente, no refleja disponibilidad real del dia.'],
    ['Seleccion Fecha', 'Calendario funcional. Scroll horizontal sin indicador visual.'],
    ['Seleccion Horario', 'Seleccion por rango no documentada. Horarios pasados no bloqueados si zona horaria incorrecta.'],
    ['Resumen/Precio', 'Precio recalculado server-side (seguro). Formato inconsistente S/ vs S/.'],
    ['Pago', 'Metodo de pago en BookingForm no funcional. Yape sin comprobante. Voucher se imprime en blanco.'],
    ['Confirmacion', 'Solo toast notification. Sin email de confirmacion. Sin comprobante descargable.'],
    ['Consulta Reserva', 'Estados inconsistentes entre BookingsView y ProfileView.'],
    ['Historial Pagos', 'Funciona correctamente con el panel recien mejorado.'],
    ['Perfil', 'Opciones "Notificaciones" y "Ayuda" no funcionales.'],
]

story.append(make_table(['Paso', 'Observacion'], user_issues, [90, 370]))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# SECTION 10: PLAN DE CORRECCION
# ══════════════════════════════════════════════════════════════
story.append(add_heading('10. PLAN DE CORRECCION', s_h1, 0))

story.append(add_heading('FASE 1 - URGENTE (P0)', s_h2, 1))
fase1 = [
    ['FAL-001', 'Agregar auth a stats, expenses, clients, settings PUT', 'Ninguna', 'Baja', 'Inmediata', 'Endpoints protegidos'],
    ['FAL-002', 'Eliminar credenciales hardcodeadas del codigo', 'Ninguna', 'Baja', 'Inmediata', 'Sin credenciales en codigo'],
    ['FAL-003', 'Eliminar /api/setup/* del despliegue', 'Ninguna', 'Baja', 'Inmediata', 'Sin endpoints de setup'],
    ['PAG-001', 'Validar monto server-side en /api/payments', 'db.ts', 'Media', 'Inmediata', 'Pagos validados'],
    ['PAG-002', 'Agregar idempotencia a webhook Culqi', 'Ninguna', 'Media', 'Inmediata', 'Sin doble conteo'],
]
story.append(make_table(['ID', 'Problema', 'Dependencia', 'Dificultad', 'Prioridad', 'Resultado'], fase1, [35, 170, 60, 45, 50, 100]))

story.append(add_heading('FASE 2 - ALTA PRIORIDAD (P1)', s_h2, 1))
fase2 = [
    ['FAL-004', 'Corregir auth en admin/settings GET', 'Ninguna', 'Baja', 'Alta', 'Auth verificado'],
    ['FAL-005', 'Agregar rol a endpoints admin', 'Ninguna', 'Baja', 'Alta', 'Solo admin puede escribir'],
    ['FAL-006', 'Validar URLs en notifications/dispatch', 'Ninguna', 'Media', 'Alta', 'Sin SSRF'],
    ['PAG-003', 'Validar precios equipo server-side', 'db.ts', 'Media', 'Alta', 'Precios correctos'],
    ['PAG-004', 'Liberar cancha en cargo expirado Culqi', 'Ninguna', 'Baja', 'Alta', 'Slots liberados'],
    ['PAG-005', 'Usar batch write en createPayment', 'db.ts', 'Baja', 'Alta', 'Escritura atomica'],
    ['PAG-007', 'Agregar ownership check en payment-validation POST', 'Ninguna', 'Baja', 'Alta', 'Solo propio usuario'],
    ['TZ-001', 'Forzar America/Lima en todo el frontend', 'Ninguna', 'Media', 'Alta', 'Fechas correctas'],
    ['UX-002', 'Cancelar reserva al retroceder en pago', 'Ninguna', 'Media', 'Alta', 'Sin huerfanas'],
]
story.append(make_table(['ID', 'Problema', 'Dependencia', 'Dificultad', 'Prioridad', 'Resultado'], fase2, [35, 170, 60, 45, 50, 100]))

story.append(add_heading('FASE 3 - MEJORAS (P2)', s_h2, 1))
fase3 = [
    ['CON-001', 'Envolver PUT en transaccion', 'db.ts', 'Media', 'Media', 'Sin condiciones de carrera'],
    ['CON-002', 'Implementar cron de limpieza', 'Vercel Cron', 'Media', 'Media', 'Reservas expiradas limpiadas'],
    ['UX-003', 'Corregir voucher de pago', 'Ninguna', 'Media', 'Media', 'Voucher imprime correctamente'],
    ['UX-004', 'Unificar estados de reserva', 'Ninguna', 'Baja', 'Media', 'Estados consistentes'],
    ['UX-005', 'Eliminar disponibilidad aleatoria', 'Ninguna', 'Baja', 'Media', 'Datos reales'],
    ['UX-006', 'Unificar formato de precio', 'Ninguna', 'Baja', 'Media', 'Formato consistente'],
    ['UX-007', 'Corregir barra de accion en movil', 'Ninguna', 'Baja', 'Media', 'UI funcional en movil'],
    ['RET-001', 'Corregir auth en retained-advances', 'Ninguna', 'Baja', 'Media', 'Feature funcional'],
]
story.append(make_table(['ID', 'Problema', 'Dependencia', 'Dificultad', 'Prioridad', 'Resultado'], fase3, [35, 170, 60, 45, 50, 100]))

story.append(add_heading('FASE 4 - OPTIMIZACION (P3)', s_h2, 1))
fase4 = [
    ['UX-001', 'Eliminar BookingForm muerto o integrar', 'Ninguna', 'Baja', 'Baja', 'Codigo limpio'],
    ['UX-008', 'Documentar seleccion por rango', 'Ninguna', 'Baja', 'Baja', 'UX clara'],
    ['PERF-001', 'Agregar paginacion server-side', 'db.ts', 'Alta', 'Baja', 'Mejor rendimiento'],
    ['PERF-002', 'Optimizar findPaymentByExternalRef', 'db.ts', 'Media', 'Baja', 'Consulta eficiente'],
    ['NOTIF-001', 'Implementar persistencia de notificaciones', 'Firebase', 'Media', 'Baja', 'Notificaciones persistentes'],
    ['NOTIF-002', 'Agregar confirmacion por email', 'Nodemailer', 'Media', 'Baja', 'Confirmacion de reserva por email'],
]
story.append(make_table(['ID', 'Problema', 'Dependencia', 'Dificultad', 'Prioridad', 'Resultado'], fase4, [35, 170, 60, 45, 50, 100]))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# SECTION 11: CHECKLIST FINAL DE PRODUCCION
# ══════════════════════════════════════════════════════════════
story.append(add_heading('11. CHECKLIST FINAL DE PRODUCCION', s_h1, 0))

checklist = [
    ['Autenticacion', 'MEJORABLE', 'NO', 'Funciona con Firebase. Fallback inseguro. Sin rate limiting. Credenciales hardcodeadas deben eliminarse.'],
    ['Usuarios', 'MEJORABLE', 'NO', 'CRUD protegido. Setup endpoint debe eliminarse. Registro sin confirmacion por email.'],
    ['Reservas', 'MEJORABLE', 'NO', 'Creacion correcta con transaccion. Edicion sin transaccion. Expiracion lazy. Timezone incorrecto.'],
    ['Pagos', 'CRITICO', 'NO', 'Sin validacion de monto en servidor. Sin idempotencia en webhooks. Status manipulable desde el cliente.'],
    ['Firebase/DB', 'MEJORABLE', 'NO', 'Reglas de seguridad no verificadas en produccion. Varios endpoints sin proteccion. Dual write sin transaccion.'],
    ['Seguridad', 'CRITICO', 'NO', '6+ endpoints sin auth. Credenciales expuestas. SSRF. Setup con secreto debil. Falta rate limiting.'],
    ['Administrador', 'CRITICO', 'NO', 'Stats y expenses publicos. Auth rota. Endpoints sin rol. Retained-advances no funcional.'],
    ['UX/UI', 'MEJORABLE', 'NO', 'Voucher roto. Estados inconsistentes. Formulario muerto. Barra de accion oculta en movil.'],
    ['Movil', 'MEJORABLE', 'NO', 'Buena base con bottom nav. Barra de accion oculta. Touch targets pequenos en algunos botones.'],
    ['Rendimiento', 'MEJORABLE', 'NO', 'Sin paginacion server-side. Consultas sin limite. findPaymentByExternalRef ineficiente.'],
    ['Reportes', 'MEJORABLE', 'NO', 'Stats basicos funcionan. Faltan reportes detallados por cancha, deporte, periodo, usuario.'],
    ['Notificaciones', 'ERROR', 'NO', 'Sin persistencia. Sin email/SMS. Sin recordatorios. Solo toasts en memoria volatil.'],
]

story.append(make_table(
    ['Area', 'Estado', 'Listo para Produccion?', 'Observaciones'],
    checklist,
    [65, 55, 50, 290]
))

story.append(Spacer(1, 10*mm))

# ━━ VEREDICTO FINAL ━━
story.append(HRFlowable(width='100%', thickness=2, color=P0_COLOR, spaceAfter=8))
story.append(Paragraph('<b>APROBADA PARA PRODUCCION: NO</b>', ParagraphStyle('Verdict', fontName='NotoSansSC-Bold', fontSize=16, leading=20, textColor=P0_COLOR, alignment=TA_CENTER, spaceAfter=8)))

story.append(Paragraph('La aplicacion NO esta lista para produccion. Deben solucionarse obligatoriamente los 14 problemas P0 (Criticos) antes de su publicacion. Los problemas mas urgentes que requieren atencion inmediata son: (1) Proteger todos los endpoints de API con autenticacion adecuada. (2) Eliminar credenciales hardcodeadas y endpoints de setup. (3) Implementar validacion server-side de montos de pago. (4) Agregar idempotencia al webhook de Culqi. (5) Corregir la gestion de zonas horarias. (6) Asegurar que las reglas de seguridad de Firestore esten correctamente desplegadas. Una vez resueltos estos problemas criticos, la aplicacion tendria una base solida para una version beta controlada con usuarios limitados, mientras se completan los problemas P1 en la siguiente iteracion.', s_body))

# ━━ BUILD ━━
doc.multiBuild(story)
print(f'PDF generado: {OUTPUT}')
print(f'Paginas estimadas: ~20')
