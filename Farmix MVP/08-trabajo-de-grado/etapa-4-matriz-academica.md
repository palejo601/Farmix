# Etapa 4 · Matriz académica (propuesta ↔ software ↔ evidencia)

Compara lo que **promete la propuesta** (`Propuesta_de_trabajo_de_grado_modalidad_investigativa.pdf`, Universidad de Sucre, formato FOR-FO-008) con lo que **existe en el repositorio**.
Fuente de la propuesta: el PDF que subiste (lo releí completo para esta etapa: objetivos, fases 1–5, cronograma, validez y ética).
Convención: **[H]** hecho confirmado en el PDF o en el repositorio · **[I]** inferencia · **✔** con evidencia · **◐** parcial · **✘** sin evidencia.
**Límites:** no tengo la rúbrica ni el documento actualizado de la universidad; esta matriz se basa solo en la propuesta. No evalúo la calidad redactada del documento, solo la correspondencia con el software.

## Datos de la propuesta [H]
Título: *Desarrollo de un MVP para el apoyo a la gestión integral de residuos generados en servicios farmacéuticos independientes* · Estudiante: Alejandro Pacheco Montes (Tecnología en Regencia de Farmacia) · Director: David Galvan Borja · Codirector: Brayan Javier Anaya Meza · Sincelejo, Sucre · **6 meses** · periodo 02-2026 · metodología **Design Science Research + Lean Startup**.

## ⚠️ Corrección a la Etapa 3
En la Etapa 3 clasifiqué «Personal y capacitaciones» como módulo **extra**. Es un error: la propuesta lo incluye explícitamente (Fase 2: «registro y control de capacitaciones y consulta del historial por trabajador»; Fase 4: «asociación de trabajadores asistentes»). Ya lo corregí en esa matriz. Los módulos que sí **no** aparecen en la propuesta son **importar Excel/CSV** y **migrar datos locales**.

## 1. Objetivos específicos

| # | Objetivo (texto de la propuesta) | Evidencia en el repositorio | Estado | Falta |
|---|---|---|---|---|
| 1 | Diagnosticar la situación actual de la gestión de residuos | Herramienta de diagnóstico (módulo `diagnoses`, instrumento de 11 obligatorios y 17 de madurez) y marco legal en `/normativa` | ◐ | **Diagnóstico exploratorio con trabajadores** (guía de observación o cuestionario) y su consentimiento: sin evidencia. La revisión normativa existe como pantalla, pero no como documento formal |
| 2 | Establecer los requerimientos funcionales | `rutas.md` (declarado como propuesta) y la matriz de la Etapa 3 | ◐ | **Matriz de requisitos normativos y funcionales** (Fase 1) validada con usuarios y priorizada |
| 3 | Construir la base de datos | 13 migraciones, 23 tablas, modelos, diccionario y análisis de calidad | ✔ | Probar el SQL en drawDB; decisiones pendientes con el director (ver hallazgos) |
| 4 | Diseñar el sistema de apoyo a la BD | Backend (15 módulos), frontend (14 páginas), 391 pruebas | ✔ | PWA sin unir a la rama de Render |
| 5 | Demostrar el funcionamiento en entorno relevante | Despliegue en Render con datos simulados; 22 pasos de navegador | ◐ | Demostración con **trabajadores/usuarios**, con consentimiento informado |

## 2. Funciones que promete la propuesta (Fases 2 y 4) vs. software

| Función de la propuesta | Implementación | Estado |
|---|---|---|
| Registro y **clasificación** de residuos | `/residuos`, 5 clasificaciones cerradas | ✔ |
| Consulta y actualización de registros | GET/PATCH de cada módulo | ✔ |
| Seguimiento básico y **alertas** (vencimientos) | `/vencimientos`, alertas por días configurables | ✔ |
| **Reportes** | `/reporte` (seis secciones) | ✔ |
| Consulta de información sobre **segregación** / «revisar una guía de segregación» | `frontend/src/format.ts` trae la guía por clasificación (color de bolsa y ejemplos) y `/segregacion` registra verificaciones | ✔ |
| Registro y control de **capacitaciones** | `/personal`, estado calculado (vigente/pendiente/vencida/sin soporte) | ✔ |
| **Asociación de trabajadores asistentes** | La pantalla permite marcar varios trabajadores en una capacitación grupal; internamente se guarda **una fila por trabajador y tema** (no hay entidad «sesión de capacitación») | ◐ [H] diseño; funciona, pero no hay un registro único del evento |
| **Historial por trabajador** | `/personal` resume por trabajador. El índice único (trabajador, tema) activo permite una sola fila vigente por pareja: **una recapacitación editaría la misma fila**. No comprobé si el historial anterior se conserva | ◐ [I] por verificar |
| **Manejo de errores** | Errores controlados y probados (409, 404, 422…) | ✔ |

## 3. Fases metodológicas y cronograma (6 meses)

| Fase / actividad | Producto que exige la propuesta | Evidencia | Estado |
|---|---|---|---|
| 1. Diagnóstico y requerimientos | Revisión normativa, **matriz de requisitos**, diagnóstico exploratorio | Pantalla `/normativa` y `docs/08-alineacion-pgirasa.md` | ◐ falta la matriz formal y el diagnóstico con personas |
| 2. Diseño | Requerimientos, arquitectura, **modelo de datos**, flujos, **wireframes**, prototipo visual | Arquitectura y modelo de datos ✔ (Etapas 1–2); prototipo v1 funcional | ◐ no hay wireframes ni flujos de usuario como documentos |
| 3. Desarrollo | BD, backend, frontend, pruebas unitarias, control de versiones | Repositorio Git, 391 pruebas | ✔ |
| 4. Pruebas funcionales | **Matriz de casos de prueba** con datos simulados, registro de incidencias, uso de IA solo como apoyo revisado | `docs/05-resultado-de-pruebas.md`, pruebas automáticas | ◐ falta la matriz de casos en el formato de la propuesta y el registro de incidencias |
| 5. Usabilidad | ≥ 5 participantes, tareas definidas, **SUS**, consentimiento | Ninguna | ✘ |
| Informe final y socialización | Documento final | — | Pendiente |

## 4. Consideraciones de validez (lo que la propuesta prohíbe afirmar)
La propuesta dice que **no** se presentarán como resultados: reducción de residuos, pérdidas evitadas, mejora del cumplimiento normativo ni que la SUS demuestre eficacia.

| Control | Evidencia | Estado |
|---|---|---|
| Las pérdidas se muestran como «cifras descriptivas… hipótesis por validar» | `expirations/service.ts`, `reports/service.ts` | ✔ [H] |
| La comparación de diagnósticos advierte que no demuestra mejora | `DiagnosticoPage.tsx` | ✔ [H] |
| No se usan datos clínicos de pacientes | No hay tablas ni columnas de pacientes en las 23 tablas | ✔ [H] |
| Datos simulados marcados como tales (`is_demo`) | Pantallas de demostración | ✔ [H] |
| Uso de IA como apoyo revisado por el investigador | Declarado en `08-trabajo-de-grado/README.md` | ✔ (tú debes revisar y reconocerlo en el informe) |

## 5. Alcance vs. propuesta
- La propuesta habla de **servicios farmacéuticos independientes**: coincide con tu decisión (sin cadenas) y con que la Clínica Las Peñitas no entra. [H]
- Funciones fuera de la propuesta: **importar** y **migrar** datos locales. Son decisiones técnicas; conviene que el director las conozca. [H]
- La propuesta indica **«Sincelejo - Sucre»** y el modelo trae `city = 'Sincelejo'` por defecto: coherente. [H]

## 6. Ética y consentimiento (Sección 8 de la propuesta)
- Datos simulados en las pruebas ✔.
- Participación voluntaria, consentimiento informado, resultados agregados o anónimos: **procedimiento y formato aún no existen en el repositorio** ✘. Debe prepararse **antes** de la Fase 5. (Esto se conecta con A4-4: nombres de trabajadores en `workers`.)

## 7. Brechas académicas priorizadas (para tu plan, sin aplicar)
| Prioridad | Brecha | Quién |
|---|---|---|
| Alta | Matriz de requisitos normativos y funcionales (Fase 1) | Estudiante + director |
| Alta | Consentimiento informado y procedimiento ético (Fase 5) | Estudiante + director |
| Alta | Evaluación de usabilidad con ≥ 5 participantes y SUS | Estudiante |
| Media | Matriz de casos de prueba y registro de incidencias (Fase 4) | Yo puedo prepararla desde las pruebas existentes |
| Media | Wireframes y flujos de usuario (Fase 2) | Yo puedo apoyar con capturas del sistema real |
| Media | Verificar historial por trabajador y la asociación de asistentes | Verificar en el código |
| Baja | Unir `pwa-instalable` a la rama de Render | Decisión tuya |

## Autoevaluación
1. ¿Qué objetivo específico depende más de personas reales y no del código?
2. ¿Por qué la propuesta prohíbe presentar «pérdidas evitadas» como resultado?
3. ¿Qué diferencia hay entre una prueba funcional con datos simulados (Fase 4) y la evaluación de usabilidad (Fase 5)?
