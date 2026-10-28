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
        s.box(x, y, 262, 34, t, fill='#fff7d6', stroke='#c9a800', fs=10, dash=True)
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
s.note(460, 556, 'Muestra color de bolsa y ejemplos')
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


def btn(s, x, y, w, t, dark=False):
    s.box(x, y, w, 28, t, fill='#bbb' if dark else '#eee', anchor='middle', fs=11, bold=dark)

# 7 · Diagnóstico
s = S('Diagnóstico · requisitos obligatorios (O1)', NOTE); s.frame('Diagnóstico')
s.title('Diagnóstico', 'Autoevaluación orientativa del manejo de residuos y vencimientos')
for i, t in enumerate(['Obligatorios', 'Madurez', 'Resultados', 'Mejoras']): s.box(190 + i * 104, 92, 100, 28, t, fill='#d9d9d9' if i == 0 else '#fff', anchor='middle', fs=11, bold=i == 0)
s.box(190, 132, 790, 470, '', fill='#fff')
s.text(204, 156, 'Requisitos obligatorios', 14, True); s.box(372, 143, 96, 18, 'Obligación legal', fill='#e6eefa', fs=9, anchor='middle'); s.text(880, 156, '11 de 11 respondidas', 11, color='#777')
s.box(204, 166, 762, 8, '', fill='#bbb', stroke='#bbb')
for i in range(4):
    y = 196 + i * 88
    s.text(204, y, f'¿Pregunta del requisito {i + 1}? (texto del requisito)', 12, True); s.text(204, y + 16, 'Base legal: resolución / decreto / artículo', 10, color='#777')
    for j, t in enumerate(['Cumple', 'No cumple', 'No aplica']): s.box(204 + j * 92, y + 26, 86, 28, t, fill='#ddd' if j == i % 3 else '#fff', anchor='middle', fs=11)
btn(s, 840, 560, 126, 'Guardar diagnóstico', True)
s.note(560, 200, 'Un «No cumple» no se compensa con los demás')
s.note(560, 250, 'Madurez 1 a 5 según proporción de «Cumple»')
s.save('07-diagnostico.svg')

# 8 · Plan de mejora
s = S('Plan de mejora · tablero (O1b)', NOTE); s.frame('Diagnóstico')
s.title('Diagnóstico › Mejoras', '2 de 5 cerradas · toca una tarjeta para editarla'); btn(s, 850, 48, 130, '+ Nueva mejora', True)
s.box(190, 92, 790, 28, '', fill='#fafafa'); 
for i, t in enumerate(['Pendiente', 'En curso', 'Cerrada']):
    x = 190 + i * 266; s.box(x, 130, 256, 440, '', fill='#ececec'); s.text(x + 10, 150, t, 13, True)
    for k in range(2 if i != 1 else 1):
        y = 164 + k * 190; s.box(x + 8, y, 240, 176, '', fill='#fff')
        for j, f in enumerate(['Problema', 'Acción', 'Responsable', 'Fecha límite'] + (['Cierre', 'Origen'] if i == 2 else ['Origen'])): s.text(x + 16, y + 20 + j * 20, f + ':', 10, color='#555'); s.box(x + 90, y + 12 + j * 20, 140, 8, '', fill='#ddd', stroke='#ddd')
        if i < 2: btn(s, x + 16, y + 140, 120, 'Mover a «' + ('En curso' if i == 0 else 'Cerrada') + '»')
s.note(190, 580, 'Una mejora cerrada exige fecha de cierre')
s.note(460, 580, 'Nace de un incumplimiento (origen = requisito)')
s.note(730, 580, 'Atrasada: fecha límite pasada y sin cerrar')
s.save('08-plan-de-mejora.svg')

# 9 · Reporte
s = S('Reporte de gestión (R4)', NOTE); s.frame('Reporte')
s.title('Reporte de gestión', 'Diagnóstico, vencimientos y pérdidas, residuos, capacitación y mejoras')
s.text(190, 100, 'Residuos y segregación desde', 11); s.box(190, 106, 140, 26, '', fill='#fff'); s.text(345, 100, 'Hasta', 11); s.box(345, 106, 140, 26, '', fill='#fff'); btn(s, 500, 105, 170, 'Imprimir / guardar PDF', True)
s.box(210, 146, 740, 458, '', fill='#fff')
s.text(226, 170, 'FARMIX · Gestión de vencimientos, residuos y mejora continua', 10, color='#777'); s.text(226, 194, 'Reporte de gestión', 20, True)
s.table(226, 206, 708, ['Establecimiento · Ciudad · Fecha de generación · Código · Generado con'], rows=0, rh=24)
s.box(226, 232, 708, 22, 'DATOS SIMULADOS (aviso, solo en demostración)', fill='#fff7d6', stroke='#c9a800', fs=10, dash=True, anchor='middle')
for i, t in enumerate(['01 Resumen (6 indicadores)', '02 Diagnóstico: línea base vs último, obligatorios pendientes, madurez por área', '03 Vencimientos y pérdidas', '04 Residuos y segregación (según el subtítulo)', '05 Capacitación (según el subtítulo)', '06 Mejoras (según el subtítulo)']):
    y = 266 + i * 48; s.text(226, y + 12, t, 12, True); s.line(226, y + 18, 934, y + 18, '#999'); s.box(226, y + 24, 340, 8, '', fill='#ddd', stroke='#ddd')
s.note(690, 540, 'Cifras descriptivas, no demuestran reducción')
s.save('09-reporte.svg')

# 10 · Normativa
s = S('Normativa (O1)', NOTE); s.frame('Normativa')
s.title('Normativa', 'Normativa aplicable (verificada a una fecha); FARMIX apoya, no sustituye el plan')
for i in range(4):
    y = 98 + i * 112; s.box(214, y + 6, 12, 12, '', fill='#999'); s.line(220, y + 18, 220, y + 118, '#bbb'); s.box(236, y, 744, 100, '', fill='#fff')
    s.text(248, y + 22, f'Año  Nombre de la norma  (tipo)', 13, True); s.box(840, y + 8, 128, 18, 'Obligación legal' if i != 3 else 'Pendiente de verificación', fill='#e6eefa' if i != 3 else '#fff3d6', fs=9, anchor='middle')
    s.text(248, y + 44, 'Descripción de la norma', 11); s.text(248, y + 64, '¿Qué aporta a FARMIX?  texto breve', 11, color='#555'); s.text(248, y + 88, 'Consultar fuente oficial ↗  (entidad)', 11, color='#2a5db0')
s.box(236, 548, 744, 56, 'Bloque final: «Propuesta propia de FARMIX» · criterios de madurez de gestión', fill='#f2f8f2', fs=11)
s.note(700, 38, 'Contenido estático, no está en la base')
s.save('10-normativa.svg')

# 11 · Importar
s = S('Importar desde Excel o CSV (X2)', NOTE); s.frame('Importar')
s.title('Importar desde Excel o CSV', 'Primero vista previa; no se guarda nada hasta confirmar')
s.form(190, 96, 380, ['¿Qué va a importar? (vencimientos, residuos o segregación)'], cols=1); s.form(190, 150, 380, ['Archivo (.xlsx o .csv, máx. 2 MB y 1000 filas)'], cols=1)
btn(s, 190, 214, 170, 'Descargar plantilla CSV'); btn(s, 380, 214, 190, 'Vista previa', True)
s.box(190, 262, 790, 250, '', fill='#fff'); s.text(204, 284, 'Resultado de la vista previa', 13, True)
for i, t in enumerate(['Filas', 'Válidas', 'Inválidas', 'Duplicadas']): s.box(204 + i * 190, 296, 180, 46, t, anchor='middle', fs=11)
s.table(204, 354, 762, ['Fila', 'Estado', 'Detalle del error'], rows=3, rh=24)
btn(s, 780, 470, 186, 'Confirmar e importar', True)
s.note(190, 530, 'La vista previa caduca a las 24 horas')
s.note(460, 530, 'Al confirmar se vuelve a validar cada fila')
s.note(730, 530, 'Un duplicado no se inserta')
s.save('11-importar.svg')

# 12 · Migrar
s = S('Migrar datos guardados en el navegador (X3)', NOTE); s.frame('Migrar')
s.title('Migrar datos guardados en el navegador', 'Vista previa, confirmar y, si hace falta, revertir')
s.text(190, 100, 'Contenido JSON (vencimientos, residuos, segregación) · o cargar un archivo .json', 11); s.box(190, 108, 790, 150, '{ ... }', fill='#fff', fs=12)
btn(s, 190, 268, 170, 'Crear vista previa', True)
s.box(190, 314, 790, 190, '', fill='#fff'); s.text(204, 336, 'Migración (estado: pendiente / confirmada / revertida)', 13, True)
s.table(204, 348, 762, ['Tipo', 'Recibidas', 'Válidas', 'Inválidas', 'Duplicadas'], rows=3, rh=24)
btn(s, 640, 460, 150, 'Confirmar migración', True); btn(s, 806, 460, 160, 'Revertir')
s.note(190, 530, 'Revertir archiva solo lo que creó esta migración')
s.note(460, 530, 'El mismo contenido no se carga dos veces')
s.note(730, 530, 'Máximo 1000 filas por tipo')
s.save('12-migrar.svg')

# 13 · Miembros
s = S('Miembros y roles (R8)', NOTE); s.frame('Miembros')
s.title('Miembros', 'Quién tiene acceso a esta droguería y con qué rol')
s.table(190, 96, 790, ['Nombre', 'Correo', 'Rol', 'Acción'], rows=4)
s.text(190, 262, 'Agregar un miembro', 13, True); s.form(190, 272, 790, ['Correo de una cuenta ya registrada', 'Rol (administrador / operador)'], cols=2); btn(s, 190, 336, 100, 'Agregar', True)
s.note(190, 400, 'Propietario: único; no se modifica ni se retira')
s.note(460, 400, 'Administrador: solo gestiona operadores')
s.note(730, 400, 'Operador: solo puede retirarse a sí mismo')
s.save('13-miembros.svg')

# 14 · Configuración
s = S('Configuración de la droguería (R7)', NOTE); s.frame('Configuración')
s.title('Configuración', 'Datos del establecimiento')
s.form(190, 100, 790, ['Nombre', 'Ciudad', 'Días de anticipación del aviso de vencimiento', 'Número de empleados'], cols=2); btn(s, 190, 220, 100, 'Guardar', True)
s.box(190, 300, 790, 110, '', fill='#fdf0ef', stroke='#c0392b'); s.text(204, 326, 'Zona de riesgo', 13, True, '#a33'); s.text(204, 350, 'Eliminar esta droguería (solo el propietario)', 11); btn(s, 204, 364, 190, 'Eliminar esta droguería')
s.note(190, 430, 'Los días de aviso definen las alertas')
s.note(460, 430, 'Eliminar archiva (borrado lógico) la droguería')
s.save('14-configuracion.svg')

# 15 · Mi cuenta
s = S('Mi cuenta (R6, R12)', NOTE)
s.box(0, 22, W, 40, '← Mis droguerías  ·  Mi cuenta', fill='#f0f0f0', fs=12)
s.text(40, 100, 'Mi cuenta', 20, True)
s.box(40, 116, 440, 150, '', fill='#fff'); s.text(54, 138, 'Perfil', 13, True); s.form(54, 146, 410, ['Nombre completo'], cols=1); btn(s, 54, 214, 90, 'Guardar', True)
s.box(40, 280, 440, 200, '', fill='#fff'); s.text(54, 302, 'Cambiar contraseña', 13, True); s.form(54, 310, 410, ['Contraseña actual', 'Nueva contraseña (mín. 10)'], cols=1); btn(s, 54, 424, 90, 'Cambiar', True)
s.box(510, 116, 450, 364, '', fill='#fff'); s.text(524, 138, 'Privacidad y datos personales', 13, True)
s.text(524, 164, 'Aviso aceptado el … · versión …  [aceptar ahora]', 11); btn(s, 524, 184, 200, 'Descargar mis datos')
s.text(524, 246, 'Eliminar mi cuenta', 13, True); s.text(524, 266, 'Periodo de gracia antes de borrarse', 11, color='#777'); btn(s, 524, 282, 260, 'Solicitar eliminación de mi cuenta'); btn(s, 524, 320, 260, 'Cancelar la eliminación')
s.note(524, 380, 'Tus droguerías de propietario se archivan')
s.save('15-cuenta.svg')

# 16 · Mis droguerías
s = S('Mis droguerías (R7)', NOTE)
s.box(0, 22, W, 40, 'FARMIX  ·  Mi cuenta  ·  Cerrar sesión', fill='#f0f0f0', fs=12)
s.text(40, 100, 'Mis droguerías', 20, True); btn(s, 800, 82, 160, '+ Nueva droguería', True)
for i in range(3):
    s.box(40 + i * 316, 120, 300, 110, '', fill='#fff'); s.text(54 + i * 316, 146, 'Nombre de la droguería', 13, True); s.text(54 + i * 316, 168, 'Ciudad · rol del usuario', 11, color='#777'); s.box(54 + i * 316, 190, 100, 24, 'Abrir', fill='#eee', anchor='middle', fs=11)
s.box(40, 260, 920, 250, '', fill='#fff', dash=True); s.text(54, 284, 'Ventana «Nueva droguería»', 13, True)
s.form(54, 296, 890, ['Nombre', 'Ciudad', 'Anticipación de alerta (días)', 'Número de empleados'], cols=4); btn(s, 704, 420, 110, 'Cancelar'); btn(s, 830, 420, 110, 'Crear', True)
s.note(54, 460, 'Quien crea la droguería queda como propietario')
s.note(330, 460, 'Una cuenta puede tener varias droguerías')
s.save('16-mis-droguerias.svg')

# 17 · Recuperar contraseña
s = S('Recuperar contraseña (R6)', NOTE)
s.box(130, 90, 340, 300, '', fill='#fff'); s.text(150, 122, 'Paso 1 · Solicitar', 14, True); s.form(150, 136, 300, ['Correo de la cuenta'], cols=1); btn(s, 150, 206, 200, 'Enviar instrucciones', True)
s.text(150, 260, 'Siempre responde lo mismo, exista o no la cuenta', 10, color='#777')
s.box(530, 90, 340, 300, '', fill='#fff'); s.text(550, 122, 'Paso 2 · Restablecer', 14, True); s.form(550, 136, 300, ['Código recibido', 'Nueva contraseña (mín. 10)'], cols=1); btn(s, 550, 252, 160, 'Restablecer', True)
s.note(130, 420, 'El código vale 1 hora y se usa una sola vez')
s.note(530, 420, 'En desarrollo el correo es simulado')
s.save('17-recuperar-contrasena.svg')
print('17 wireframes')
