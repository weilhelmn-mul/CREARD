import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'skills', 'pdf', 'scripts'))

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ━━ Font Registration ━━
pdfmetrics.registerFont(TTFont('NotoSerifSC', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSCBold', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('CarlitoBold', '/usr/share/fonts/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSCBold')
registerFontFamily('Carlito', normal='Carlito', bold='CarlitoBold')

# ━━ Color Palette ━━
ACCENT = colors.HexColor('#c35029')
TEXT_PRIMARY = colors.HexColor('#1b1a18')
TEXT_MUTED = colors.HexColor('#7a756e')
BG_SURFACE = colors.HexColor('#e2ddd7')
BG_PAGE = colors.HexColor('#f5f4f3')
TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT = colors.white
TABLE_ROW_EVEN = colors.white
TABLE_ROW_ODD = BG_SURFACE

# ━━ Styles ━━
title_style = ParagraphStyle(
    name='Title', fontName='Carlito', fontSize=28, leading=36,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, spaceAfter=12
)
h1_style = ParagraphStyle(
    name='H1', fontName='Carlito', fontSize=18, leading=24,
    alignment=TA_LEFT, textColor=ACCENT, spaceBefore=24, spaceAfter=12
)
h2_style = ParagraphStyle(
    name='H2', fontName='Carlito', fontSize=14, leading=20,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, spaceBefore=18, spaceAfter=8
)
body_style = ParagraphStyle(
    name='Body', fontName='Carlito', fontSize=10.5, leading=17,
    alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY, spaceAfter=8
)
body_left_style = ParagraphStyle(
    name='BodyLeft', fontName='Carlito', fontSize=10.5, leading=17,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, spaceAfter=8
)
code_style = ParagraphStyle(
    name='Code', fontName='DejaVuSans', fontSize=9, leading=14,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, leftIndent=18,
    backColor=colors.HexColor('#f0ece8'), borderPadding=6
)
bullet_style = ParagraphStyle(
    name='Bullet', fontName='Carlito', fontSize=10.5, leading=17,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, leftIndent=24,
    bulletIndent=12, spaceAfter=4
)
header_cell_style = ParagraphStyle(
    name='HeaderCell', fontName='Carlito', fontSize=10,
    textColor=colors.white, alignment=TA_CENTER
)
cell_style = ParagraphStyle(
    name='Cell', fontName='Carlito', fontSize=9.5,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER
)
cell_left_style = ParagraphStyle(
    name='CellLeft', fontName='Carlito', fontSize=9.5,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT
)
caption_style = ParagraphStyle(
    name='Caption', fontName='Carlito', fontSize=9,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceBefore=4, spaceAfter=12
)
meta_style = ParagraphStyle(
    name='Meta', fontName='Carlito', fontSize=10,
    textColor=TEXT_MUTED, alignment=TA_LEFT, spaceAfter=4
)

# ━━ Page Setup ━━
page_width = A4[0]
left_margin = 1.0 * inch
right_margin = 1.0 * inch
available_width = page_width - left_margin - right_margin

output_path = '/home/z/my-project/download/CREARD_Supabase_Analisis.pdf'
doc = SimpleDocTemplate(
    output_path,
    pagesize=A4,
    leftMargin=left_margin,
    rightMargin=right_margin,
    topMargin=0.8 * inch,
    bottomMargin=0.8 * inch,
)

story = []

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COVER PAGE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Spacer(1, 120))
story.append(Paragraph('<b>CREARD</b>', ParagraphStyle(
    name='CoverTitle', fontName='Carlito', fontSize=48, leading=56,
    alignment=TA_LEFT, textColor=ACCENT
)))
story.append(Spacer(1, 18))
story.append(Paragraph('Supabase Database Schema Analysis', ParagraphStyle(
    name='CoverSub', fontName='Carlito', fontSize=20, leading=26,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY
)))
story.append(Spacer(1, 36))
story.append(Paragraph('Plataforma de Gestion de Canchas Deportivas', ParagraphStyle(
    name='CoverDesc', fontName='Carlito', fontSize=13, leading=20,
    alignment=TA_LEFT, textColor=TEXT_MUTED
)))
story.append(Paragraph('Av. Bolivar C1, San Sebastian, Cusco', ParagraphStyle(
    name='CoverAddr', fontName='Carlito', fontSize=11, leading=16,
    alignment=TA_LEFT, textColor=TEXT_MUTED
)))
story.append(Spacer(1, 80))

# Metadata table
meta_data = [
    [Paragraph('<b>Documento:</b>', cell_left_style), Paragraph('Analisis de Tablas para Supabase', cell_left_style)],
    [Paragraph('<b>Version:</b>', cell_left_style), Paragraph('1.0', cell_left_style)],
    [Paragraph('<b>Base de datos:</b>', cell_left_style), Paragraph('Supabase (PostgreSQL)', cell_left_style)],
    [Paragraph('<b>Total de tablas:</b>', cell_left_style), Paragraph('7 tablas principales + 3 vistas + 2 funciones', cell_left_style)],
    [Paragraph('<b>Fecha:</b>', cell_left_style), Paragraph('Mayo 2026', cell_left_style)],
]
meta_table = Table(meta_data, colWidths=[120, available_width - 120])
meta_table.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor('#d4cfc8')),
]))
story.append(meta_table)

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 1: RESUMEN EJECUTIVO
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph('<b>1. Resumen Ejecutivo</b>', h1_style))
story.append(Paragraph(
    'Este documento presenta el analisis completo de la estructura de base de datos necesaria para migrar '
    'el sistema CREARD desde SQLite (Prisma) a Supabase (PostgreSQL). La plataforma CREARD es un sistema '
    'de gestion de canchas deportivas ubicado en Av. Bolivar C1, San Sebastian, Cusco, que administra '
    '6 canchas (4 de futbol 5 y 2 de voley) con un flujo completo de reservas, pagos y control financiero.',
    body_style
))
story.append(Paragraph(
    'La migracion a Supabase ofrece ventajas significativas respecto a SQLite: autenticacion integrada con '
    'JWT y Row Level Security (RLS), base de datos PostgreSQL en la nube con alta disponibilidad, '
    'API REST automatica (PostgREST), subscriptions en tiempo real, almacenamiento de archivos (Storage), '
    'y funciones edge para logica del lado del servidor. Ademas, Supabase utiliza tipos de datos nativos '
    'de PostgreSQL como ENUM, JSONB, UUID, TIMESTAMPTZ y NUMERIC, que proporcionan mayor integridad, '
    'rendimiento y seguridad de los datos en comparacion con las soluciones basadas en SQLite.',
    body_style
))
story.append(Paragraph(
    'El esquema propuesto incluye 7 tablas principales (branches, courts, users, bookings, payments, expenses, '
    'reviews), 10 tipos ENUM para garantizar la integridad referencial, 3 vistas de analisis financiero, '
    '2 funciones utilitarias para disponibilidad y reportes, triggers automaticos para timestamps, '
    'y politicas RLS para seguridad granular por rol (admin/user). Se incluyen ademas constraints de '
    'validacion de datos, indices optimizados para las consultas mas frecuentes, y datos seed iniciales '
    'para las 6 canchas y la sucursal principal.',
    body_style
))

# Overview table
story.append(Spacer(1, 18))
overview_data = [
    [Paragraph('<b>Componente</b>', header_cell_style),
     Paragraph('<b>Cantidad</b>', header_cell_style),
     Paragraph('<b>Descripcion</b>', header_cell_style)],
    [Paragraph('Tablas', cell_style),
     Paragraph('7', cell_style),
     Paragraph('branches, courts, users, bookings, payments, expenses, reviews', cell_left_style)],
    [Paragraph('ENUMs', cell_style),
     Paragraph('10', cell_style),
     Paragraph('user_role, booking_status, slot_status, payment_method, payment_status, payment_type, expense_category, court_sport', cell_left_style)],
    [Paragraph('Vistas', cell_style),
     Paragraph('3', cell_style),
     Paragraph('v_daily_summary, v_court_revenue_ranking, v_today_status', cell_left_style)],
    [Paragraph('Funciones', cell_style),
     Paragraph('2', cell_style),
     Paragraph('get_court_availability, get_financial_summary', cell_left_style)],
    [Paragraph('Triggers', cell_style),
     Paragraph('6', cell_style),
     Paragraph('Auto-update de updated_at en todas las tablas principales', cell_left_style)],
    [Paragraph('Politicas RLS', cell_style),
     Paragraph('15+', cell_style),
     Paragraph('Seguridad granular por rol (admin/user) y por operacion (SELECT/INSERT/UPDATE/DELETE)', cell_left_style)],
    [Paragraph('Indices', cell_style),
     Paragraph('18+', cell_style),
     Paragraph('Indices optimizados para busquedas por fecha, estado, usuario, cancha', cell_left_style)],
]
overview_table = Table(overview_data, colWidths=[available_width * 0.15, available_width * 0.1, available_width * 0.75])
overview_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0, 1), (-1, 1), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 5), (-1, 5), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 6), (-1, 6), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 7), (-1, 7), TABLE_ROW_EVEN),
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(overview_table)
story.append(Paragraph('<b>Tabla 1.</b> Resumen general del esquema de base de datos', caption_style))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 2: MEJORAS RESPECTO A SQLITE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph('<b>2. Mejoras Respecto a SQLite (Prisma)</b>', h1_style))
story.append(Paragraph(
    'La migracion de SQLite a PostgreSQL mediante Supabase permite aprovechar las capacidades avanzadas '
    'de un motor de base de datos relacional de nivel empresarial. A continuacion se detallan las '
    'principales mejoras implementadas en el esquema para Supabase, cada una de las cuales aporta '
    'beneficios concretos en terminos de integridad, rendimiento y seguridad de la aplicacion CREARD.',
    body_style
))

story.append(Paragraph('<b>2.1 Tipos de Datos Nativos de PostgreSQL</b>', h2_style))
story.append(Paragraph(
    'SQLite utiliza tipado dinamico y no soporta tipos nativos como ENUM, JSONB, UUID o TIMESTAMPTZ. '
    'En el esquema original de Prisma, los campos de estado (status, role, method, etc.) se almacenaban '
    'como cadenas de texto (String), lo que permite cualquier valor arbitrario y carece de validacion '
    'a nivel de base de datos. En Supabase, se definen 10 tipos ENUM que restringen los valores '
    'permitidos directamente en PostgreSQL, garantizando que no se inserten valores invalidos como '
    '"status=xyz" o "role=superadmin". Los campos JSON (images, amenities) se migran de String a JSONB, '
    'permitiendo consultas y indexacion sobre contenido JSON de manera nativa, como buscar canchas que '
    'tengan "Wi-Fi" en sus amenidades o filtrar por URLs de imagenes especificas.',
    body_style
))

# Comparison table
story.append(Spacer(1, 18))
comp_data = [
    [Paragraph('<b>Campo</b>', header_cell_style),
     Paragraph('<b>SQLite (Prisma)</b>', header_cell_style),
     Paragraph('<b>Supabase (PostgreSQL)</b>', header_cell_style),
     Paragraph('<b>Ventaja</b>', header_cell_style)],
    [Paragraph('ID primaria', cell_left_style),
     Paragraph('String (cuid)', cell_left_style),
     Paragraph('UUID (gen_random_uuid)', cell_left_style),
     Paragraph('Estandar universal, mejor performance en indices', cell_left_style)],
    [Paragraph('Estado reserva', cell_left_style),
     Paragraph('String', cell_left_style),
     Paragraph('booking_status (ENUM)', cell_left_style),
     Paragraph('Validacion nativa, sin valores invalidos', cell_left_style)],
    [Paragraph('Imagenes', cell_left_style),
     Paragraph('String (JSON manual)', cell_left_style),
     Paragraph('JSONB', cell_left_style),
     Paragraph('Consultas e indices sobre contenido JSON', cell_left_style)],
    [Paragraph('Amenidades', cell_left_style),
     Paragraph('String (JSON manual)', cell_left_style),
     Paragraph('JSONB', cell_left_style),
     Paragraph('Filtros y busquedas nativas en JSON', cell_left_style)],
    [Paragraph('Fechas', cell_left_style),
     Paragraph('DateTime o String', cell_left_style),
     Paragraph('TIMESTAMPTZ', cell_left_style),
     Paragraph('Zona horaria automatica, mejor precision', cell_left_style)],
    [Paragraph('Precio', cell_left_style),
     Paragraph('Float', cell_left_style),
     Paragraph('NUMERIC(10,2)', cell_left_style),
     Paragraph('Precision decimal exacta (sin errores de punto flotante)', cell_left_style)],
    [Paragraph('Horas', cell_left_style),
     Paragraph('String ("18:00")', cell_left_style),
     Paragraph('TIME', cell_left_style),
     Paragraph('Operaciones aritmeticas y comparaciones nativas', cell_left_style)],
]
comp_table = Table(comp_data, colWidths=[available_width * 0.17, available_width * 0.22, available_width * 0.28, available_width * 0.33])
comp_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD) for i in range(1, 8)],
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))
story.append(comp_table)
story.append(Paragraph('<b>Tabla 2.</b> Comparacion de tipos de datos entre SQLite y Supabase', caption_style))

story.append(Paragraph('<b>2.2 Row Level Security (RLS)</b>', h2_style))
story.append(Paragraph(
    'SQLite no tiene soporte nativo para politicas de seguridad a nivel de fila. En el esquema Prisma '
    'original, toda la logica de autorizacion se realizaba en el backend de Next.js, lo que implica '
    'que cada endpoint API debia verificar manualmente los permisos del usuario. Con Supabase RLS, las '
    'politicas de acceso se definen directamente en la base de datos y se ejecutan de forma automatica '
    'en cada consulta, independientemente de como se acceda a los datos (API REST, SDK, o directamente '
    'desde el frontend con el cliente Supabase). Esto elimina la posibilidad de que un usuario acceda '
    'a datos de otro usuario mediante una peticion maliciosa, ya que PostgreSQL rechaza la consulta '
    'antes de devolver cualquier resultado.',
    body_style
))
story.append(Paragraph(
    'El esquema define 15+ politicas RLS que cubren los siguientes casos: los clientes pueden leer y '
    'modificar unicamente sus propias reservas, pagos y perfil; los administradores tienen acceso '
    'completo a todas las tablas para gestionar reservas, gastos, usuarios y pagos; las canchas y '
    'sucursales son de lectura publica para usuarios anonimos y autenticados; las reseñas son visibles '
    'para todos pero solo pueden ser creadas por usuarios autenticados para su propia experiencia; y '
    'los gastos son accesibles unicamente para administradores, protegiendo la informacion financiera '
    'sensible del negocio.',
    body_style
))

story.append(Paragraph('<b>2.3 Constraints y Validacion de Datos</b>', h2_style))
story.append(Paragraph(
    'PostgreSQL permite definir restricciones CHECK a nivel de tabla que validan los datos antes de '
    'insertarlos o actualizarlos, algo que SQLite soporta de forma limitada. En el esquema de Supabase '
    'se implementan las siguientes restricciones: el precio total de una reserva no puede ser negativo '
    '(chk_total_price); el monto del adelanto no puede superar el precio total (chk_advance); la suma '
    'del adelanto mas el saldo restante debe ser exactamente igual al precio total (chk_amounts); la '
    'hora de fin de una reserva debe ser posterior a la hora de inicio (chk_times); los montos de pago '
    'y gastos deben ser valores positivos (chk_payment_amount, chk_expense_amount); y las calificaciones '
    'de reseñas deben estar entre 1 y 5 estrellas (CHECK en la columna rating). Estas restricciones '
    'garantizan la integridad de los datos incluso si la aplicacion frontend tiene errores de validacion.',
    body_style
))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 3: DETALLE DE TABLAS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph('<b>3. Detalle de Tablas</b>', h1_style))

# --- 3.1 Branches ---
story.append(Paragraph('<b>3.1 branches (Sucursales)</b>', h2_style))
story.append(Paragraph(
    'La tabla branches almacena las sucursales o locales de CREARD. Aunque actualmente la plataforma '
    'opera desde una sola ubicacion en Av. Bolivar C1, San Sebastian, Cusco, incluir esta tabla desde '
    'el inicio permite escalar el negocio a multiples sedes en el futuro sin requerir cambios '
    'estructurales en la base de datos. Cada cancha pertenece a una sucursal mediante la relacion '
    'FOREIGN KEY branch_id, lo que facilita la gestion independiente de horarios, precios y '
    'disponibilidad por ubicacion. Los campos incluyen nombre, direccion, ciudad, telefono, email '
    'y un flag is_active para desactivar sucursales temporalmente sin eliminar sus datos historicos.',
    body_style
))

branches_data = [
    [Paragraph('<b>Columna</b>', header_cell_style),
     Paragraph('<b>Tipo</b>', header_cell_style),
     Paragraph('<b>Restriccion</b>', header_cell_style),
     Paragraph('<b>Descripcion</b>', header_cell_style)],
    [Paragraph('id', cell_left_style), Paragraph('UUID', cell_style), Paragraph('PK', cell_style), Paragraph('Identificador unico', cell_left_style)],
    [Paragraph('name', cell_left_style), Paragraph('TEXT', cell_style), Paragraph('NOT NULL', cell_style), Paragraph('Nombre de la sucursal', cell_left_style)],
    [Paragraph('address', cell_left_style), Paragraph('TEXT', cell_style), Paragraph('NOT NULL', cell_style), Paragraph('Direccion fisica', cell_left_style)],
    [Paragraph('city', cell_left_style), Paragraph('TEXT', cell_style), Paragraph("DEFAULT 'Cusco'", cell_style), Paragraph('Ciudad de ubicacion', cell_left_style)],
    [Paragraph('phone', cell_left_style), Paragraph('TEXT', cell_style), Paragraph('NULL', cell_style), Paragraph('Telefono de contacto', cell_left_style)],
    [Paragraph('email', cell_left_style), Paragraph('TEXT', cell_style), Paragraph('NULL', cell_style), Paragraph('Email de contacto', cell_left_style)],
    [Paragraph('is_active', cell_left_style), Paragraph('BOOLEAN', cell_style), Paragraph("DEFAULT true", cell_style), Paragraph('Sucursal operativa', cell_left_style)],
    [Paragraph('created_at', cell_left_style), Paragraph('TIMESTAMPTZ', cell_style), Paragraph('NOT NULL', cell_style), Paragraph('Fecha de creacion', cell_left_style)],
    [Paragraph('updated_at', cell_left_style), Paragraph('TIMESTAMPTZ', cell_style), Paragraph('NOT NULL', cell_style), Paragraph('Fecha de actualizacion (trigger)', cell_left_style)],
]
branches_table = Table(branches_data, colWidths=[available_width * 0.18, available_width * 0.18, available_width * 0.18, available_width * 0.46])
branches_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD) for i in range(1, 10)],
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))
story.append(Spacer(1, 12))
story.append(branches_table)
story.append(Paragraph('<b>Tabla 3.</b> Estructura de la tabla branches', caption_style))

# --- 3.2 Courts ---
story.append(Paragraph('<b>3.2 courts (Canchas)</b>', h2_style))
story.append(Paragraph(
    'La tabla courts es el nucleo del sistema, almacenando las 6 canchas deportivas: 4 de futbol 5 '
    '(Cancha de Futbol 1, 2, 3 y 4) y 2 de voley (Cancha de Voley A y B). Cada cancha tiene un '
    'tipo de deporte definido por el ENUM court_sport, un precio por hora en soles (NUMERIC(10,2) para '
    'precision decimal exacta), y campos JSONB para imagenes y amenidades que permiten almacenar arrays '
    'de URLs y listas de servicios con la posibilidad de consultarlos directamente desde PostgreSQL. '
    'El campo is_active permite desactivar temporalmente una cancha (por mantenimiento, por ejemplo) '
    'sin eliminar sus reservas historicas. Los precios varian entre S/30 y S/55 por hora segun las '
    'caracteristicas de cada cancha, siendo las canchas techadas (Futbol 3) y las de futbol premium '
    '(Futbol 2, Futbol 4) las mas costosas.',
    body_style
))

courts_data = [
    [Paragraph('<b>Columna</b>', header_cell_style),
     Paragraph('<b>Tipo</b>', header_cell_style),
     Paragraph('<b>Restriccion</b>', header_cell_style),
     Paragraph('<b>Descripcion</b>', header_cell_style)],
    [Paragraph('id', cell_left_style), Paragraph('UUID', cell_style), Paragraph('PK', cell_style), Paragraph('Identificador unico', cell_left_style)],
    [Paragraph('name', cell_left_style), Paragraph('TEXT', cell_style), Paragraph('NOT NULL', cell_style), Paragraph('Nombre de la cancha', cell_left_style)],
    [Paragraph('sport', cell_left_style), Paragraph('court_sport', cell_style), Paragraph('NOT NULL', cell_style), Paragraph('ENUM: futbol / voley', cell_left_style)],
    [Paragraph('description', cell_left_style), Paragraph('TEXT', cell_style), Paragraph('NULL', cell_style), Paragraph('Descripcion detallada', cell_left_style)],
    [Paragraph('branch_id', cell_left_style), Paragraph('UUID', cell_style), Paragraph('FK branches', cell_style), Paragraph('Sucursal a la que pertenece', cell_left_style)],
    [Paragraph('images', cell_left_style), Paragraph('JSONB', cell_style), Paragraph("DEFAULT '[]'", cell_style), Paragraph('Array de URLs de imagenes', cell_left_style)],
    [Paragraph('price_per_hour', cell_left_style), Paragraph('NUMERIC(10,2)', cell_style), Paragraph('NOT NULL', cell_style), Paragraph('Precio por hora en soles', cell_left_style)],
    [Paragraph('is_active', cell_left_style), Paragraph('BOOLEAN', cell_style), Paragraph("DEFAULT true", cell_style), Paragraph('Cancha disponible', cell_left_style)],
    [Paragraph('amenities', cell_left_style), Paragraph('JSONB', cell_style), Paragraph("DEFAULT '[]'", cell_style), Paragraph('Array de amenidades/servicios', cell_left_style)],
]
courts_table = Table(courts_data, colWidths=[available_width * 0.18, available_width * 0.18, available_width * 0.18, available_width * 0.46])
courts_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD) for i in range(1, 10)],
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))
story.append(Spacer(1, 12))
story.append(courts_table)
story.append(Paragraph('<b>Tabla 4.</b> Estructura de la tabla courts', caption_style))

# --- 3.3 Users ---
story.append(Paragraph('<b>3.3 users (Usuarios)</b>', h2_style))
story.append(Paragraph(
    'La tabla users almacena los dos roles del sistema: administradores (admin) y clientes (user). '
    'Se definen mediante el ENUM user_role que solo permite estos dos valores, previniendo la creacion '
    'de roles no autorizados. El campo password almacena el hash bcrypt de la contrasena, nunca la '
    'contrasena en texto plano. Se recomienda utilizar Supabase Auth para la autenticacion real, '
    'manteniendo esta tabla como perfil extendido vinculado al ID de Supabase Auth mediante '
    'auth.uid(). El email tiene la restriccion UNIQUE para evitar duplicados y se indexa para '
    'acelerar las busquedas durante el inicio de sesion. Los campos is_active y updated_at permiten '
    'desactivar usuarios y rastrear la ultima modificacion de cada perfil.',
    body_style
))

users_data = [
    [Paragraph('<b>Columna</b>', header_cell_style),
     Paragraph('<b>Tipo</b>', header_cell_style),
     Paragraph('<b>Restriccion</b>', header_cell_style),
     Paragraph('<b>Descripcion</b>', header_cell_style)],
    [Paragraph('id', cell_left_style), Paragraph('UUID', cell_style), Paragraph('PK', cell_style), Paragraph('Identificador unico (auth.uid())', cell_left_style)],
    [Paragraph('name', cell_left_style), Paragraph('TEXT', cell_style), Paragraph('NOT NULL', cell_style), Paragraph('Nombre completo', cell_left_style)],
    [Paragraph('email', cell_left_style), Paragraph('TEXT', cell_style), Paragraph('UNIQUE, NOT NULL', cell_style), Paragraph('Correo electronico', cell_left_style)],
    [Paragraph('phone', cell_left_style), Paragraph('TEXT', cell_style), Paragraph('NULL', cell_style), Paragraph('Numero de telefono', cell_left_style)],
    [Paragraph('password', cell_left_style), Paragraph('TEXT', cell_style), Paragraph('NOT NULL', cell_style), Paragraph('Hash bcrypt de la contrasena', cell_left_style)],
    [Paragraph('role', cell_left_style), Paragraph('user_role', cell_style), Paragraph("DEFAULT 'user'", cell_style), Paragraph('ENUM: user / admin', cell_left_style)],
    [Paragraph('is_active', cell_left_style), Paragraph('BOOLEAN', cell_style), Paragraph("DEFAULT true", cell_style), Paragraph('Usuario activo', cell_left_style)],
]
users_table = Table(users_data, colWidths=[available_width * 0.18, available_width * 0.18, available_width * 0.22, available_width * 0.42])
users_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD) for i in range(1, 8)],
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))
story.append(Spacer(1, 12))
story.append(users_table)
story.append(Paragraph('<b>Tabla 5.</b> Estructura de la tabla users', caption_style))

# --- 3.4 Bookings ---
story.append(Paragraph('<b>3.4 bookings (Reservas)</b>', h2_style))
story.append(Paragraph(
    'La tabla bookings es la mas compleja del esquema, gestionando el ciclo completo de vida de una '
    'reserva con dos campos de estado independientes: status (booking_status) visible para el cliente '
    'y slot_status (slot_status) visible para el administrador. El flujo de una reserva sigue el '
    'siguiente ciclo: el cliente crea una reserva en estado pending con slot_status available; el '
    'admin confirma la reserva cambiando status a confirmed y slot_status a reserved; el cliente '
    'realiza el adelanto del 50% cambiando status a partially_paid; al completar el pago restante '
    'el status cambia a fully_paid; durante el partido el slot_status cambia a in_play; al finalizar '
    'pasa a finished y el booking_status a completed. Si el cliente no paga a tiempo, la reserva '
    'expira (expired). Si no se presenta, se marca como no_show. El admin puede cancelar en cualquier '
    'momento o bloquear slots para mantenimiento.',
    body_style
))
story.append(Paragraph(
    'Los constraints de validacion garantizan que: el precio total no sea negativo, el adelanto no '
    'supere el total, la suma de adelanto y restante iguale el total, y la hora de fin sea posterior '
    'a la hora de inicio. Se definen indices compuestos para optimizar las busquedas mas frecuentes, '
    'como buscar reservas por cancha y fecha, y un indice UNIQUE para prevenir reservas duplicadas '
    'en el mismo slot horario de la misma cancha.',
    body_style
))

bookings_data = [
    [Paragraph('<b>Columna</b>', header_cell_style),
     Paragraph('<b>Tipo</b>', header_cell_style),
     Paragraph('<b>Restriccion</b>', header_cell_style),
     Paragraph('<b>Descripcion</b>', header_cell_style)],
    [Paragraph('id', cell_left_style), Paragraph('UUID', cell_style), Paragraph('PK', cell_style), Paragraph('Identificador unico', cell_left_style)],
    [Paragraph('court_id', cell_left_style), Paragraph('UUID', cell_style), Paragraph('FK courts', cell_style), Paragraph('Cancha reservada', cell_left_style)],
    [Paragraph('user_id', cell_left_style), Paragraph('UUID', cell_style), Paragraph('FK users', cell_style), Paragraph('Cliente que reserva', cell_left_style)],
    [Paragraph('date', cell_left_style), Paragraph('DATE', cell_style), Paragraph('NOT NULL', cell_style), Paragraph('Fecha de la reserva (YYYY-MM-DD)', cell_left_style)],
    [Paragraph('start_time', cell_left_style), Paragraph('TIME', cell_style), Paragraph('NOT NULL', cell_style), Paragraph('Hora de inicio (HH:MM)', cell_left_style)],
    [Paragraph('end_time', cell_left_style), Paragraph('TIME', cell_style), Paragraph('NOT NULL', cell_style), Paragraph('Hora de fin (HH:MM)', cell_left_style)],
    [Paragraph('total_price', cell_left_style), Paragraph('NUMERIC(10,2)', cell_style), Paragraph('NOT NULL, CHECK>=0', cell_style), Paragraph('Precio total en soles', cell_left_style)],
    [Paragraph('advance_amount', cell_left_style), Paragraph('NUMERIC(10,2)', cell_style), Paragraph('DEFAULT 0', cell_style), Paragraph('Monto del adelanto (50%)', cell_left_style)],
    [Paragraph('remaining_amount', cell_left_style), Paragraph('NUMERIC(10,2)', cell_style), Paragraph('DEFAULT 0', cell_style), Paragraph('Saldo pendiente (50%)', cell_left_style)],
    [Paragraph('status', cell_left_style), Paragraph('booking_status', cell_style), Paragraph("DEFAULT 'pending'", cell_style), Paragraph('Estado visible para el cliente', cell_left_style)],
    [Paragraph('slot_status', cell_left_style), Paragraph('slot_status', cell_style), Paragraph("DEFAULT 'available'", cell_style), Paragraph('Estado del slot para el admin', cell_left_style)],
    [Paragraph('payment_method', cell_left_style), Paragraph('payment_method', cell_style), Paragraph('NULL', cell_style), Paragraph('Metodo de pago (ENUM)', cell_left_style)],
    [Paragraph('notes', cell_left_style), Paragraph('TEXT', cell_style), Paragraph('NULL', cell_style), Paragraph('Notas adicionales', cell_left_style)],
]
bookings_table = Table(bookings_data, colWidths=[available_width * 0.20, available_width * 0.18, available_width * 0.22, available_width * 0.40])
bookings_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD) for i in range(1, 14)],
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))
story.append(Spacer(1, 12))
story.append(bookings_table)
story.append(Paragraph('<b>Tabla 6.</b> Estructura de la tabla bookings', caption_style))

# --- 3.5 Payments ---
story.append(Paragraph('<b>3.5 payments (Pagos)</b>', h2_style))
story.append(Paragraph(
    'La tabla payments registra cada transaccion financiera individual, vinculada a una reserva y a un '
    'usuario. Cada pago tiene un tipo (advance para el adelanto del 50%, remaining para el saldo '
    'restante, o full para pagos completos del 100%), un metodo de pago (Yape, Plin, Culqi, tarjeta, '
    'efectivo o transferencia definidos por el ENUM payment_method), y un estado (pending, completed, '
    'failed o refunded). El campo external_ref almacena la referencia del medio de pago externo, como '
    'los codigos YAP-001, PLN-001 o CUL-001 que permiten conciliar los pagos con las plataformas '
    'externas. Los indices sobre booking_id, user_id, status, method y created_at permiten generar '
    'reportes financieros eficientes agrupados por cualquier combinacion de criterios.',
    body_style
))

payments_data = [
    [Paragraph('<b>Columna</b>', header_cell_style),
     Paragraph('<b>Tipo</b>', header_cell_style),
     Paragraph('<b>Restriccion</b>', header_cell_style),
     Paragraph('<b>Descripcion</b>', header_cell_style)],
    [Paragraph('id', cell_left_style), Paragraph('UUID', cell_style), Paragraph('PK', cell_style), Paragraph('Identificador unico', cell_left_style)],
    [Paragraph('booking_id', cell_left_style), Paragraph('UUID', cell_style), Paragraph('FK bookings', cell_style), Paragraph('Reserva asociada', cell_left_style)],
    [Paragraph('user_id', cell_left_style), Paragraph('UUID', cell_style), Paragraph('FK users', cell_style), Paragraph('Usuario que paga', cell_left_style)],
    [Paragraph('amount', cell_left_style), Paragraph('NUMERIC(10,2)', cell_style), Paragraph('NOT NULL, CHECK>0', cell_style), Paragraph('Monto del pago', cell_left_style)],
    [Paragraph('type', cell_left_style), Paragraph('payment_type', cell_style), Paragraph('NOT NULL', cell_style), Paragraph('ENUM: advance / remaining / full', cell_left_style)],
    [Paragraph('method', cell_left_style), Paragraph('payment_method', cell_style), Paragraph('NOT NULL', cell_style), Paragraph('ENUM: yape / plin / culqi / card / cash / transfer', cell_left_style)],
    [Paragraph('status', cell_left_style), Paragraph('payment_status', cell_style), Paragraph("DEFAULT 'pending'", cell_style), Paragraph('ENUM: pending / completed / failed / refunded', cell_left_style)],
    [Paragraph('external_ref', cell_left_style), Paragraph('TEXT', cell_style), Paragraph('NULL', cell_style), Paragraph('Referencia externa (YAP-001, etc.)', cell_left_style)],
]
payments_table = Table(payments_data, colWidths=[available_width * 0.18, available_width * 0.18, available_width * 0.20, available_width * 0.44])
payments_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD) for i in range(1, 9)],
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))
story.append(Spacer(1, 12))
story.append(payments_table)
story.append(Paragraph('<b>Tabla 7.</b> Estructura de la tabla payments', caption_style))

# --- 3.6 Expenses ---
story.append(Paragraph('<b>3.6 expenses (Gastos)</b>', h2_style))
story.append(Paragraph(
    'La tabla expenses registra los gastos operativos del negocio, categorizados mediante el ENUM '
    'expense_category que incluye: mantenimiento (reparacion de cesped, iluminacion, instalaciones), '
    'servicios (energia electrica, agua, internet), personal (sueldos de limpieza y mantenimiento), '
    'alquiler (canon del terreno), y otros (materiales de limpieza, insumos varios). Cada gasto tiene '
    'un monto positivo validado por la constraint chk_expense_amount, una fecha para agrupacion '
    'temporal en reportes, y campos de descripcion y notas para detalle adicional. Los indices sobre '
    'category y date permiten generar reportes de gastos por periodo y por categoria de forma eficiente.',
    body_style
))

expenses_data = [
    [Paragraph('<b>Columna</b>', header_cell_style),
     Paragraph('<b>Tipo</b>', header_cell_style),
     Paragraph('<b>Restriccion</b>', header_cell_style),
     Paragraph('<b>Descripcion</b>', header_cell_style)],
    [Paragraph('id', cell_left_style), Paragraph('UUID', cell_style), Paragraph('PK', cell_style), Paragraph('Identificador unico', cell_left_style)],
    [Paragraph('description', cell_left_style), Paragraph('TEXT', cell_style), Paragraph('NOT NULL', cell_style), Paragraph('Descripcion del gasto', cell_left_style)],
    [Paragraph('amount', cell_left_style), Paragraph('NUMERIC(10,2)', cell_style), Paragraph('NOT NULL, CHECK>0', cell_style), Paragraph('Monto del gasto en soles', cell_left_style)],
    [Paragraph('category', cell_left_style), Paragraph('expense_category', cell_style), Paragraph('NOT NULL', cell_style), Paragraph('ENUM: mantenimiento / servicios / personal / alquiler / otros', cell_left_style)],
    [Paragraph('date', cell_left_style), Paragraph('DATE', cell_style), Paragraph('NOT NULL', cell_style), Paragraph('Fecha del gasto', cell_left_style)],
    [Paragraph('notes', cell_left_style), Paragraph('TEXT', cell_style), Paragraph('NULL', cell_style), Paragraph('Notas adicionales', cell_left_style)],
]
expenses_table = Table(expenses_data, colWidths=[available_width * 0.18, available_width * 0.16, available_width * 0.20, available_width * 0.46])
expenses_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD) for i in range(1, 7)],
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))
story.append(Spacer(1, 12))
story.append(expenses_table)
story.append(Paragraph('<b>Tabla 8.</b> Estructura de la tabla expenses', caption_style))

# --- 3.7 Reviews ---
story.append(Paragraph('<b>3.7 reviews (Resenas)</b>', h2_style))
story.append(Paragraph(
    'La tabla reviews almacena las calificaciones y comentarios de los clientes sobre las canchas. '
    'Cada resena tiene una calificacion de 1 a 5 estrellas (validada por la constraint CHECK en la '
    'columna rating) y un comentario opcional. La constraint UNIQUE(user_id, court_id) garantiza que '
    'un usuario solo pueda dejar una resena por cancha, evitando duplicados y manipulacion de '
    'calificaciones. Las resenas son visibles para todos los usuarios (anonimos y autenticados) pero '
    'solo los usuarios autenticados pueden crear resenas, y unicamente para canchas donde hayan '
    'tenido al menos una reserva completada. Los indices sobre court_id permiten calcular el promedio '
    'de calificaciones por cancha de forma eficiente.',
    body_style
))

reviews_data = [
    [Paragraph('<b>Columna</b>', header_cell_style),
     Paragraph('<b>Tipo</b>', header_cell_style),
     Paragraph('<b>Restriccion</b>', header_cell_style),
     Paragraph('<b>Descripcion</b>', header_cell_style)],
    [Paragraph('id', cell_left_style), Paragraph('UUID', cell_style), Paragraph('PK', cell_style), Paragraph('Identificador unico', cell_left_style)],
    [Paragraph('court_id', cell_left_style), Paragraph('UUID', cell_style), Paragraph('FK courts', cell_style), Paragraph('Cancha reseada', cell_left_style)],
    [Paragraph('user_id', cell_left_style), Paragraph('UUID', cell_style), Paragraph('FK users', cell_style), Paragraph('Usuario que resena', cell_left_style)],
    [Paragraph('rating', cell_left_style), Paragraph('SMALLINT', cell_style), Paragraph('CHECK 1-5', cell_style), Paragraph('Calificacion (1 a 5 estrellas)', cell_left_style)],
    [Paragraph('comment', cell_left_style), Paragraph('TEXT', cell_style), Paragraph('NULL', cell_style), Paragraph('Comentario del usuario', cell_left_style)],
    [Paragraph('created_at', cell_left_style), Paragraph('TIMESTAMPTZ', cell_style), Paragraph('NOT NULL', cell_style), Paragraph('Fecha de la resena', cell_left_style)],
]
reviews_table = Table(reviews_data, colWidths=[available_width * 0.18, available_width * 0.18, available_width * 0.18, available_width * 0.46])
reviews_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD) for i in range(1, 7)],
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))
story.append(Spacer(1, 12))
story.append(reviews_table)
story.append(Paragraph('<b>Tabla 9.</b> Estructura de la tabla reviews', caption_style))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 4: ENUMS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph('<b>4. Tipos ENUM Definidos</b>', h1_style))
story.append(Paragraph(
    'Los tipos ENUM de PostgreSQL garantizan la integridad referencial a nivel de base de datos, '
    'impidiendo la insercion de valores no validos en columnas de estado, rol, metodo de pago y '
    'demas campos categoricos. A diferencia de SQLite donde estos campos son simples cadenas de texto, '
    'PostgreSQL valida cada valor contra los permitidos antes de aceptar la insercion o actualizacion, '
    'lo que elimina errores de validacion en la aplicacion y proporciona documentacion implicita del '
    'dominio de cada campo.',
    body_style
))

enums_data = [
    [Paragraph('<b>ENUM</b>', header_cell_style),
     Paragraph('<b>Valores Permitidos</b>', header_cell_style),
     Paragraph('<b>Usado en</b>', header_cell_style)],
    [Paragraph('user_role', cell_left_style), Paragraph('user, admin', cell_left_style), Paragraph('users.role', cell_left_style)],
    [Paragraph('booking_status', cell_left_style), Paragraph('pending, confirmed, partially_paid, fully_paid, completed, cancelled, no_show, expired', cell_left_style), Paragraph('bookings.status', cell_left_style)],
    [Paragraph('slot_status', cell_left_style), Paragraph('available, reserved, in_play, finished, blocked, expired', cell_left_style), Paragraph('bookings.slot_status', cell_left_style)],
    [Paragraph('payment_method', cell_left_style), Paragraph('yape, plin, culqi, card, cash, transfer', cell_left_style), Paragraph('bookings.payment_method, payments.method', cell_left_style)],
    [Paragraph('payment_status', cell_left_style), Paragraph('pending, completed, failed, refunded', cell_left_style), Paragraph('payments.status', cell_left_style)],
    [Paragraph('payment_type', cell_left_style), Paragraph('advance, remaining, full', cell_left_style), Paragraph('payments.type', cell_left_style)],
    [Paragraph('expense_category', cell_left_style), Paragraph('mantenimiento, servicios, personal, alquiler, otros', cell_left_style), Paragraph('expenses.category', cell_left_style)],
    [Paragraph('court_sport', cell_left_style), Paragraph('futbol, voley', cell_left_style), Paragraph('courts.sport', cell_left_style)],
]
enums_table = Table(enums_data, colWidths=[available_width * 0.20, available_width * 0.48, available_width * 0.32])
enums_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD) for i in range(1, 9)],
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))
story.append(Spacer(1, 18))
story.append(enums_table)
story.append(Paragraph('<b>Tabla 10.</b> Tipos ENUM y sus valores permitidos', caption_style))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 5: VISTAS Y FUNCIONES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph('<b>5. Vistas y Funciones Utilitarias</b>', h1_style))

story.append(Paragraph('<b>5.1 Vistas de Analisis</b>', h2_style))
story.append(Paragraph(
    'Se incluyen 3 vistas predefinidas que simplifican las consultas mas comunes del modulo financiero '
    'y administrativo del sistema CREARD. Estas vistas encapsulan la logica de joins y agregaciones, '
    'permitiendo obtener informacion consolidada con una simple consulta SELECT sin necesidad de '
    'escribir queries complejas en el frontend o backend.',
    body_style
))
story.append(Paragraph(
    'La vista v_daily_summary proporciona un resumen financiero diario que incluye: total de reservas, '
    'reservas completadas, ingresos totales (suma de pagos completados), gastos totales y balance neto '
    '(ingresos menos gastos). Es ideal para el dashboard principal del administrador y para generar '
    'reportes semanales o mensuales agrupando por fecha.',
    body_style
))
story.append(Paragraph(
    'La vista v_court_revenue_ranking muestra un ranking de canchas ordenadas por ingresos totales, '
    'incluyendo el total de reservas, el promedio de calificacion y la cantidad de reseñas. Permite '
    'identificar rapidamente cuales canchas son las mas rentables y mejor valoradas por los clientes, '
    'facilitando decisiones sobre inversiones en mantenimiento o promociones.',
    body_style
))
story.append(Paragraph(
    'La vista v_today_status muestra el estado actual de todas las canchas para el dia de hoy, '
    'incluyendo las reservas activas con datos del cliente, horarios, precios, montos pagados y '
    'metodo de pago. Es la vista principal que utiliza el panel de control del administrador para '
    'visualizar la operacion del dia y gestionar los slots en tiempo real.',
    body_style
))

story.append(Paragraph('<b>5.2 Funciones Utilitarias</b>', h2_style))
story.append(Paragraph(
    'Se incluyen 2 funciones PostgreSQL marcadas como SECURITY DEFINER (se ejecutan con los privilegios '
    'del creador, no del invocador) para operaciones criticas que requieren acceso a datos que el '
    'usuario no podria consultar directamente con RLS activo.',
    body_style
))
story.append(Paragraph(
    'La funcion get_court_availability(p_court_id UUID, p_date DATE) genera automaticamente los slots '
    'horarios de una hora desde las 08:00 hasta las 22:00 para una cancha y fecha especificas, '
    'realizando un LEFT JOIN con las reservas existentes para indicar cuales slots estan disponibles '
    'y cuales estan ocupados, incluyendo el nombre del cliente y el estado del slot. Esto simplifica '
    'enormemente la logica del frontend para mostrar la grilla de disponibilidad.',
    body_style
))
story.append(Paragraph(
    'La funcion get_financial_summary(p_start_date DATE, p_end_date DATE) calcula el resumen '
    'financiero en un rango de fechas: ingresos totales, gastos totales, balance neto, ingresos '
    'pendientes, total de reservas y reservas completadas. Es la base del modulo de reportes '
    'financieros que permite al administrador analizar la rentabilidad del negocio por periodo.',
    body_style
))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 6: DIAGRAMA DE RELACIONES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph('<b>6. Diagrama de Relaciones (ER)</b>', h1_style))
story.append(Paragraph(
    'El siguiente diagrama muestra las relaciones entre las 7 tablas principales del esquema. Las '
    'flechas indican las foreign keys con sus acciones ON DELETE CASCADE, lo que significa que al '
    'eliminar un registro padre se eliminan automaticamente todos sus registros hijos asociados, '
    'garantizando que no queden datos huerfanos en la base de datos.',
    body_style
))

er_data = [
    [Paragraph('<b>Tabla Origen</b>', header_cell_style),
     Paragraph('<b>Relacion</b>', header_cell_style),
     Paragraph('<b>Tabla Destino</b>', header_cell_style),
     Paragraph('<b>Cardinalidad</b>', header_cell_style)],
    [Paragraph('branches', cell_style), Paragraph('1 : N', cell_style), Paragraph('courts', cell_style), Paragraph('Una sucursal tiene muchas canchas', cell_left_style)],
    [Paragraph('courts', cell_style), Paragraph('1 : N', cell_style), Paragraph('bookings', cell_style), Paragraph('Una cancha tiene muchas reservas', cell_left_style)],
    [Paragraph('courts', cell_style), Paragraph('1 : N', cell_style), Paragraph('reviews', cell_style), Paragraph('Una cancha tiene muchas resenas', cell_left_style)],
    [Paragraph('users', cell_style), Paragraph('1 : N', cell_style), Paragraph('bookings', cell_style), Paragraph('Un usuario tiene muchas reservas', cell_left_style)],
    [Paragraph('users', cell_style), Paragraph('1 : N', cell_style), Paragraph('payments', cell_style), Paragraph('Un usuario tiene muchos pagos', cell_left_style)],
    [Paragraph('users', cell_style), Paragraph('1 : N', cell_style), Paragraph('reviews', cell_style), Paragraph('Un usuario tiene muchas resenas', cell_left_style)],
    [Paragraph('bookings', cell_style), Paragraph('1 : N', cell_style), Paragraph('payments', cell_style), Paragraph('Una reserva tiene muchos pagos', cell_left_style)],
]
er_table = Table(er_data, colWidths=[available_width * 0.22, available_width * 0.14, available_width * 0.22, available_width * 0.42])
er_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD) for i in range(1, 8)],
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))
story.append(Spacer(1, 18))
story.append(er_table)
story.append(Paragraph('<b>Tabla 11.</b> Relaciones entre tablas (Diagrama ER)', caption_style))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 7: RECOMENDACIONES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph('<b>7. Recomendaciones de Implementacion</b>', h1_style))

story.append(Paragraph('<b>7.1 Autenticacion con Supabase Auth</b>', h2_style))
story.append(Paragraph(
    'Se recomienda utilizar Supabase Auth como sistema de autenticacion principal en lugar de gestionar '
    'las contrasenas manualmente. Supabase Auth proporciona registro, login, recuperacion de contrasena, '
    'verificacion de email y autenticacion con proveedores sociales (Google, Facebook, etc.) de forma '
    'integrada. El ID del usuario autenticado (auth.uid()) se vincula a la tabla users como clave '
    'primaria, permitiendo que las politicas RLS funcionen de forma nativa. La columna password puede '
    'eliminarse de la tabla users si se utiliza Supabase Auth exclusivamente, o mantenerse como respaldo '
    'si se requiere un sistema de autenticacion paralelo.',
    body_style
))

story.append(Paragraph('<b>7.2 Almacenamiento de Imagenes con Supabase Storage</b>', h2_style))
story.append(Paragraph(
    'Las imagenes de las canchas pueden almacenarse directamente en Supabase Storage en lugar de '
    'referenciar URLs externas. Supabase Storage proporciona un bucket de almacenamiento con control '
    'de acceso, transformacion de imagenes on-the-fly (resize, crop, formato) y CDN integrado para '
    'entrega rapida. Se recomienda crear un bucket "court-images" con acceso publico de lectura y '
    'restringir la escritura a usuarios autenticados con rol admin.',
    body_style
))

story.append(Paragraph('<b>7.3 Realtime Subscriptions</b>', h2_style))
story.append(Paragraph(
    'Supabase Realtime permite recibir actualizaciones en tiempo real cuando se modifican las tablas '
    'de bookings o slot_status. Esto es especialmente util para el panel del administrador, donde '
    'multiples operadores pueden estar gestionando reservas simultaneamente y necesitan ver los cambios '
    'de otros en tiempo real sin refrescar la pagina. Tambien se puede utilizar para notificar a los '
    'clientes cuando su reserva cambia de estado (confirmada, pagada, etc.).',
    body_style
))

story.append(Paragraph('<b>7.4 Migracion del Schema</b>', h2_style))
story.append(Paragraph(
    'El archivo SQL adjunto (creard_supabase_schema.sql) contiene todo el esquema listo para ejecutar '
    'en el SQL Editor de Supabase. Los pasos para la migracion son: crear un nuevo proyecto en '
    'supabase.com, copiar el contenido del archivo SQL y ejecutarlo en el SQL Editor, verificar que '
    'todas las tablas, enums, triggers, vistas y funciones se hayan creado correctamente, ejecutar las '
    'sentencias INSERT de datos seed para las 6 canchas y la sucursal principal, y finalmente configurar '
    'los buckets de Storage para las imagenes si se desea utilizar el almacenamiento nativo de Supabase.',
    body_style
))

story.append(Paragraph('<b>7.5 Adaptacion del Frontend</b>', h2_style))
story.append(Paragraph(
    'Para adaptar el frontend Next.js existente a Supabase, se recomienda instalar el SDK de Supabase '
    '(@supabase/supabase-js), crear un cliente Supabase con las credenciales del proyecto, reemplazar '
    'las llamadas a la API Prisma por consultas directa al cliente Supabase o mantener los endpoints '
    'API de Next.js como capa intermedia, actualizar el store de Zustand para utilizar el auth state '
    'de Supabase, y modificar los componentes AdminDashboard, BookingView y demas para utilizar los '
    'nuevos tipos ENUM de PostgreSQL. La transicion puede ser gradual, manteniendo la API de Next.js '
    'como intermediaria y reemplazando Prisma por el cliente Supabase en el backend.',
    body_style
))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUILD
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
doc.build(story)
print(f'PDF generado exitosamente: {output_path}')
