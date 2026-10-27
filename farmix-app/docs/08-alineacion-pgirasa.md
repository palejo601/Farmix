# 8. Alineación con el PGIRASA y con el prototipo original

FARMIX es un **producto mínimo viable en estudio** que **apoya el registro y el seguimiento del PGIRASA** (Plan de Gestión Integral de Residuos Generados en la Atención en Salud y Otras Actividades) de una droguería. **No lo sustituye**: el plan sigue siendo un documento de la droguería exigido por la norma y debe estar disponible para las autoridades.

Esta versión se reorientó tomando como referencia el prototipo original (`index.html`) y la presentación (`presentacion.html`) entregados por la autora. El contenido normativo (requisitos obligatorios, fundamentos y marco legal) se copió de esos archivos, **sin agregar normas de memoria**; lo que el propio prototipo marca como «pendiente de verificar» se conserva así.

## Qué hace FARMIX por el PGIRASA

| Componente de gestión | Módulo | Qué registra o mide |
|---|---|---|
| Existencia y disponibilidad del plan | Diagnóstico (requisito OB-01) | Si el PGIRASA está elaborado según el manual vigente y disponible |
| Clasificación y cuantificación de residuos | Residuos | Kilogramos por clase (riesgo biológico, peligroso químico, aprovechable, orgánico aprovechable, no aprovechable); unidades aparte; tipo y manejo |
| Segregación en la fuente | Residuos → Verificación de segregación | Porcentaje correcto = bien segregados ÷ revisados × 100 |
| Medicamentos vencidos y gestor autorizado | Vencimientos, Residuos | Destino (devuelto, destruido por gestor, avería), soporte (acta o nota crédito) y certificados |
| Capacitación del personal | Personal | Un chip por trabajador y tema, con soporte (certificado o lista de asistencia) |
| Seguimiento y mejora | Diagnóstico → Mejoras | Hallazgo, acción, responsable, fecha límite y estado; nacen de los incumplimientos |
| Indicadores y reporte | Inicio, Reporte | Cifras descriptivas, línea base y comparación; reporte imprimible |
| Marco normativo | Normativa | 7 normas con fuente oficial y estado |

El diagnóstico separa lo que la norma exige (**11 requisitos obligatorios**, con su fundamento) de las buenas prácticas propuestas por FARMIX (**17 preguntas de madurez** en 4 áreas, puntaje 1 a 5). **Un «no cumple» obligatorio no se compensa con un promedio.** Es una autoevaluación orientativa: no es un concepto de cumplimiento ni reemplaza la visita de la autoridad, y sus criterios están pendientes de validación por un profesional farmacéutico y un asesor jurídico.

## Cambios respecto a la versión anterior de esta reconstrucción

Donde el encargo original y el prototipo diferían, **se siguió el prototipo**:

| Tema | Antes (encargo original) | Ahora (prototipo) |
|---|---|---|
| Próximo a vencer | faltan **menos** de N días | faltan **N días o menos** (vence hoy ya es «próximo») |
| Pérdidas | pérdida = vencido sin gestionar; riesgo = próximo | **pérdida confirmada** = destruido por gestor autorizado o con avería; **en riesgo** = pendiente y vencido o próximo; **devuelto a proveedor** = valor recuperado |
| Destinos | pendiente, devolución, disposición final, otro | pendiente de gestión, **devuelto a proveedor, destrucción por gestor autorizado, avería o deterioro** (+ soporte: acta o nota crédito) |
| Diagnóstico | 15 ítems, puntaje 1–5 por ítem, 5 áreas | **11 obligatorios** (cumple / no cumple / no aplica, con fundamento normativo) + **17 de madurez** en 4 áreas; puntaje de área = máx(1, redondeo(cumple ÷ aplicables × 4) + 1) |
| Residuos | kg y g | kg, g y **unidades** (no se suman a kg); tipo, manejo y soporte |
| Capacitaciones | pendiente, vigente, vencida | + **sin soporte**; 4 **temas base** al crear la droguería (PGIRASA, vencimientos, servicio farmacéutico, bioseguridad) |
| Mejoras | acción, responsable y fecha obligatorios | pueden quedar **por definir**; se **crean desde un incumplimiento** del diagnóstico |
| Droguería | nombre, ciudad, aviso | + **número de empleados** y **marca de demostración (datos simulados)** |
| Reporte | indicadores sueltos | línea base vs último diagnóstico, serie mensual de 6 meses, equipo con lo que le falta, mejoras pendientes, código de documento |

El instrumento anterior (v1) sigue siendo legible: los diagnósticos ya guardados con él no se alteran.

## Qué NO hace (límites)

- No genera ni sustituye el documento del PGIRASA, ni los formatos oficiales de reporte a la autoridad.
- No emite conceptos de cumplimiento; no valida certificados ni gestores.
- No afirma reducción de pérdidas ni de residuos: es una **hipótesis por validar** que debe comprobarse con un piloto.
- El marco normativo es el del plan de negocios (verificado a septiembre de 2026 según el plan): **debe revisarlo un asesor jurídico**, en especial el Decreto 766 de 2026 (alcance para droguerías pendiente de verificación) y el régimen de transición de la Res. 591 de 2024.
- Sin validación de expertos, entrevistas ni piloto (estado del proyecto: MVP funcional; lo demás, pendiente).
