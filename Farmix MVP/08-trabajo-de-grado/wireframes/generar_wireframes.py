#!/usr/bin/env python3
"""Genera wireframes de baja fidelidad (SVG en grises) de las pantallas principales de FARMIX.
Uso: python3 generar_wireframes.py   (escribe los .svg en esta carpeta)"""
from xml.sax.saxutils import escape as esc

W, H = 1000, 640
NAV = ['Inicio', 'Diagnóstico', 'Vencimientos', 'Residuos', 'Personal', 'Reporte', 'Normativa', 'Importar', 'Migrar', 'Miembros', 'Configuración']

class S:
    def __init__(s, title, note):
        s.o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H+40}" width="{W}" height="{H+40}" font-family="Arial,Helvetica,sans-serif">',
               f'<rect width="{W}" height="{H+40}" fill="#fff"/>',
               f'<text x="10" y="18" font-size="14" font-weight="bold" fill="#333">WIREFRAME · {esc(title)}</text>',
               f'<text x="10" y="34" font-size="11" fill="#777">{esc(note)}</text>',
               '<g transform="translate(0,40)">',
               f'<rect x="0.5" y="0.5" width="{W-1}" height="{H-1}" fill="#fafafa" stroke="#999"/>']
    def box(s, x, y, w, h, label='', fill='#fff', stroke='#999', fs=12, bold=False, dash=False, anchor='start', color='#444'):
        d = ' stroke-dasharray="4 3"' if dash else ''
        s.o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}"{d}/>')
        if label:
            tx = x + 8 if anchor == 'start' else x + w / 2
            s.o.append(f'<text x="{tx}" y="{y + h / 2 + fs / 3}" font-size="{fs}" fill="{color}" text-anchor="{anchor}"{" font-weight=\"bold\"" if bold else ""}>{esc(label)}</text>')
    def text(s, x, y, t, fs=12, bold=False, color='#444'):
        s.o.append(f'<text x="{x}" y="{y}" font-size="{fs}" fill="{color}"{" font-weight=\"bold\"" if bold else ""}>{esc(t)}</text>')
    def line(s, x1, y1, x2, y2, c='#ccc'):
        s.o.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{c}"/>')
    def frame(s, active):
        s.box(0, 0, W, 22, 'Banner: producto mínimo viable en estudio · datos de demostración simulados', fill='#eee', fs=10, anchor='middle')
        s.box(0, 22, 170, H - 22, '', fill='#f0f0f0')
        s.text(14, 50, 'FARMIX (logo)', 13, True)
        s.text(14, 72, '← Mis droguerías', 11)
        for i, n in enumerate(NAV):
            y = 92 + i * 30
            if n == active: s.box(6, y - 4, 158, 26, n, fill='#d9d9d9', stroke='#888', bold=True, fs=12)
            else: s.text(16, y + 14, n, 12)
        s.text(14, H - 40, 'Usuario · Rol', 11); s.text(14, H - 24, 'Mi cuenta · Cerrar sesión', 10)
    def title(s, t, sub=''):
        s.text(190, 62, t, 20, True)
        if sub: s.text(190, 80, sub, 11, color='#777')
    def table(s, x, y, w, cols, rows=4, rh=26):
        cw = w / len(cols)
        s.box(x, y, w, rh, fill='#e6e6e6')
        for i, c in enumerate(cols): s.text(x + 6 + i * cw, y + rh / 2 + 4, c, 11, True)
        for r in range(rows):
            yy = y + rh * (r + 1)
            s.box(x, yy, w, rh, fill='#fff')
            for i in range(len(cols)): s.box(x + 6 + i * cw, yy + 9, cw * 0.55, 8, fill='#ddd', stroke='#ddd')
    def form(s, x, y, w, fields, cols=2):
        cw = (w - (cols - 1) * 20) / cols
        for i, f in enumerate(fields):
            cx = x + (i % cols) * (cw + 20); cy = y + (i // cols) * 54
            s.text(cx, cy + 12, f, 11)
            s.box(cx, cy + 18, cw, 26, '', fill='#fff')
    def note(s, x, y, t):
        s.box(x, y, 250, 34, t, fill='#fff7d6', stroke='#c9a800', fs=10, dash=True)
    def save(s, name):
        s.o += ['</g>', '</svg>']
        open(name, 'w', encoding='utf-8').write('\n'.join(s.o))

NOTE = 'Baja fidelidad. Reconstruido a partir del sistema construido; campos tomados del esquema de datos. Nota amarilla = regla de negocio.'

# 1 · Ingreso y registro
s = S('Ingreso y registro (R6, R12)', NOTE)
s.box(330, 90, 340, 400, '', fill='#fff')
s.text(350, 125, 'FARMIX', 22, True); s.text(350, 148, 'Ingresar a su cuenta', 12, color='#777')
s.form(350, 165, 300, ['Correo', 'Contraseña'], cols=1)
s.box(350, 290, 300, 34, 'Ingresar', fill='#bbb', anchor='middle', bold=True)
s.text(350, 350, '¿Olvidó su contraseña?  ·  Crear cuenta', 11, color='#555')
s.text(350, 390, 'Registro: nombre, correo, contraseña (mín. 10) y', 10, color='#777'); s.text(350, 404, '☐ Acepto el aviso de privacidad (obligatorio)', 10, color='#777')
s.note(690, 300, 'Tras 5 intentos fallidos: bloqueo de 15 minutos')
s.save('01-ingreso-registro.svg')

# 2 · Inicio
s = S('Inicio de la droguería (R2, R5)', NOTE); s.frame('Inicio')
s.title('Nombre de la droguería', 'Ciudad · empleados · Medir. Analizar. Mejorar.')
s.box(800, 44, 180, 34, 'Ver reporte de gestión', fill='#ddd', anchor='middle', fs=11)
for i, t in enumerate(['1 Registrar', '2 Medir', '3 Analizar', '4 Mejorar', '5 Volver a medir']): s.box(190 + i * 158, 98, 150, 44, t, fs=11, anchor='middle')
s.text(190, 168, 'Analizar · lo que necesita atención', 13, True)
for i, t in enumerate(['Productos vencidos sin gestionar', 'Productos que vencen en los días de alerta', 'Requisito obligatorio pendiente', 'Mejora con fecha vencida', 'Capacitaciones pendientes o vencidas']):
    s.box(190, 178 + i * 34, 790, 30, t, fs=11); s.box(890, 183 + i * 34, 84, 20, 'Ver', fill='#eee', anchor='middle', fs=10)
s.text(190, 368, 'Medir · indicadores', 13, True)
for i, t in enumerate(['Obligatorios que cumple', 'Madurez (1 a 5)', 'Pérdida confirmada', 'En riesgo sin gestionar', 'Devuelto a proveedor', 'Residuos del periodo (kg)', 'Segregación correcta (%)', 'Capacitación al día']):
    s.box(190 + (i % 4) * 198, 378 + (i // 4) * 70, 190, 62, '', fill='#fff'); s.text(200 + (i % 4) * 198, 402 + (i // 4) * 70, '000', 20, True); s.text(200 + (i % 4) * 198, 426 + (i // 4) * 70, t, 10)
s.box(190, 524, 790, 50, 'Mejorar: resumen del plan (pendientes · en curso · cerradas · atrasadas) · [Abrir el plan de mejora]', fs=11)
s.box(190, 582, 790, 34, 'Aviso: cifras descriptivas, no demuestran reducción de pérdidas ni cumplimiento normativo', fill='#eef3fa', fs=10)
s.save('02-inicio.svg')

# 3 · Vencimientos
s = S('Vencimientos (R2, R3)', NOTE); s.frame('Vencimientos')
s.title('Vencimientos', 'Productos con fecha de vencimiento'); s.box(840, 44, 140, 32, '+ Nuevo producto', fill='#ddd', anchor='middle', fs=11)
for i, t in enumerate(['Pérdida confirmada', 'En riesgo sin gestionar', 'Devuelto a proveedor']): s.box(190 + i * 265, 96, 255, 58, t, anchor='middle', fs=11)
s.text(190, 182, 'Filtros:  [Todos]  [Vencidos]  [Por vencer]  [Vigentes]  [Gestionados]   (cada uno con su conteo)', 11)
s.table(190, 198, 790, ['Producto', 'Lote', 'Vence', 'Cantidad', 'Costo', 'Estado', 'Destino'], rows=6)
s.text(190, 400, 'Formulario «Nuevo producto» (ventana):', 12, True)
s.form(190, 410, 790, ['Producto *', 'Lote *', 'Registro sanitario', 'Titular', 'Fecha de vencimiento *', 'Cantidad *', 'Costo unitario', 'Destino (4 opciones)'], cols=4)
s.note(190, 530, 'Mismo producto y lote activos no se repiten')
s.note(460, 530, 'Estado se calcula; no se guarda')
s.note(730, 530, 'Destino ≠ pendiente exige fecha de gestión')
s.save('03-vencimientos.svg')

# 4 · Residuos
s = S('Registro de residuos (R1)', NOTE); s.frame('Residuos')
s.title('Residuos', 'Registro por clasificación'); s.box(840, 44, 140, 32, '+ Nuevo registro', fill='#ddd', anchor='middle', fs=11)
s.box(190, 96, 380, 150, 'Gráfica: kg por clasificación y por mes', fill='#fff', anchor='middle', fs=11)
s.box(590, 96, 390, 150, 'Totales del periodo (kg) · unidades aparte', fill='#fff', anchor='middle', fs=11)
s.table(190, 264, 790, ['Fecha', 'Clasificación', 'Cantidad', 'Unidad', 'Origen', 'Tipo / manejo'], rows=4)
s.text(190, 430, 'Formulario «Nuevo registro»:', 12, True)
s.form(190, 440, 790, ['Fecha *', 'Clasificación * (5)', 'Cantidad *', 'Unidad * (kg, g, uds.)', 'Origen (vencido / otro)', 'Tipo de residuo', 'Manejo', 'Soporte (n.º certificado)'], cols=4)
s.note(190, 556, 'Medicamento vencido ≠ riesgo biológico')
s.note(460, 556, 'La clasificación muestra color de bolsa y ejemplos')
s.note(730, 556, 'Las unidades no se suman a kg')
s.save('04-residuos.svg')

# 5 · Segregación
s = S('Verificación de segregación (R5)', NOTE); s.frame('')
s.title('Segregación', 'Indicador de evaluación del MVP'); s.box(840, 44, 140, 32, '+ Nueva verificación', fill='#ddd', anchor='middle', fs=11)
s.box(190, 96, 250, 70, '% bien segregado', anchor='middle', fs=12); s.box(455, 96, 250, 70, 'Elementos revisados', anchor='middle', fs=12); s.box(720, 96, 260, 70, 'N.º de verificaciones', anchor='middle', fs=12)
s.table(190, 190, 790, ['Fecha', 'Lugar', 'Revisados', 'Correctos', '% correcto', 'Observaciones'], rows=5)
s.text(190, 400, 'Formulario «Nueva verificación»:', 12, True)
s.form(190, 410, 790, ['Fecha *', 'Lugar *', 'Elementos revisados *', 'Elementos correctos *'], cols=4)
s.form(190, 470, 790, ['Observaciones (máx. 500)'], cols=1)
s.note(190, 545, 'Correctos no puede superar a revisados')
s.note(460, 545, 'El porcentaje se calcula al consultar')
s.note(730, 545, 'Ruta /segregacion; no está en el menú lateral')
s.save('05-segregacion.svg')

# 6 · Personal y capacitación
s = S('Personal y capacitación (propuesta, Fase 2)', NOTE); s.frame('Personal')
s.title('Personal y capacitación', 'Quién está capacitado en qué, con su soporte'); s.box(690, 44, 140, 32, '+ Trabajador', fill='#ddd', anchor='middle', fs=11); s.box(840, 44, 140, 32, '+ Capacitación', fill='#ddd', anchor='middle', fs=11)
for i, t in enumerate(['Trabajadores', 'Al día', 'Pendientes o vencidas', 'Sin soporte']): s.box(190 + i * 199, 96, 190, 54, t, anchor='middle', fs=11)
s.text(190, 178, 'Filtros:  [Todos]  [Al día]  [Con pendientes]', 11)
s.table(190, 192, 790, ['Código', 'Trabajador', 'Cargo', 'Tema', 'Capacitado el', 'Vigente hasta', 'Estado', 'Soporte'], rows=5)
s.text(190, 380, 'Formulario «Capacitación»:', 12, True)
s.form(190, 390, 790, ['Trabajador(es) * (marcar a todos si fue grupal)', 'Tema *', 'Fecha de capacitación', 'Vigente hasta', 'Soporte: certificado o lista (PDF/imagen, máx. 5 MB)'], cols=3)
s.note(190, 520, 'Sin fecha = pendiente; vigencia pasada = vencida')
s.note(460, 520, 'Sin soporte = estado «Sin soporte»')
s.note(730, 520, 'Un registro por trabajador y tema')
s.save('06-personal.svg')
print('6 wireframes')
