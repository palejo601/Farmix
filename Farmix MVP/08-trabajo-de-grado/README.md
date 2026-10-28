# 08 · Trabajo de grado

Relaciona el software con la propuesta *«Desarrollo de un producto mínimo viable (MVP) para el apoyo a la gestión integral de residuos generados en servicios farmacéuticos independientes»*
(Universidad de Sucre, Tecnología en Regencia de Farmacia, periodo 02-2026).

## Metodología de la propuesta y su evidencia en el repositorio
| Elemento de la propuesta | Evidencia en FARMIX |
|---|---|
| **Design Science Research**: el artefacto se diseña, demuestra y evalúa | El artefacto es `farmix-app`; su diseño está en `01-arquitectura` y `04-base-de-datos` |
| **Lean Startup**: construir, medir, aprender | Dos iteraciones: el prototipo v1 (`09-prototipo-v1`, datos en el navegador) y la versión v2 (`farmix-app`, servidor y PostgreSQL) |
| Fase 4: pruebas funcionales con **datos simulados** | 391 pruebas automáticas y 22 pasos en navegador (`05-pruebas`) |
| Fase 5: usabilidad con **SUS** y al menos 5 participantes | **Pendiente**: no hay resultados en el repositorio |

## Matriz preliminar de objetivos específicos (estado por verificar en la Etapa 4 de la tutoría)
| Objetivo específico | Implementación relacionada | Evidencia | Estado |
|---|---|---|---|
| 1. Diagnosticar la situación actual de la gestión de residuos | Módulo de diagnóstico (11 requisitos obligatorios y 17 de madurez) | `diagnoses`, `instrument_*` | Herramienta implementada; el **diagnóstico de campo** con droguerías no tiene evidencia en el repositorio |
| 2. Establecer los requerimientos funcionales del MVP | Inventario de rutas y módulos | `farmix-app/docs/rutas.md`, `03-backend` | Por verificar: falta una matriz formal de requerimientos |
| 3. Construir la base de datos | 13 migraciones, 23 tablas y modelos documentados | `04-base-de-datos/modelo-datos` | Implementado y verificado con pruebas |
| 4. Diseñar el sistema de apoyo a la base de datos | API (15 módulos) e interfaz web instalable | `03-backend`, `02-frontend` | Implementado y verificado con pruebas |
| 5. Demostrar el funcionamiento en un entorno relevante | Pruebas con datos simulados y demostración en Render | `05-pruebas`, `06-despliegue` | Demostración técnica hecha; **evaluación con usuarios pendiente** |

## Uso de inteligencia artificial (coherente con la propuesta, Fase 4)
Parte de esta documentación y algunos cambios de código se hicieron con apoyo de un asistente de IA (Claude).
Según la propuesta, esos resultados deben ser **revisados por el investigador** y **no equivalen** a una evaluación con usuarios ni a una validación en condiciones reales.
Cada afirmación de esta guía distingue lo verificado de lo pendiente para facilitar esa revisión.

## Seguimiento de la tutoría
| Ficha | Etapa | Resultado |
|---|---|---|
| 0 | Inventario | 23 tablas confirmadas; incompatibilidad de `schema.sql` con drawDB |
| 1 | Prototipo v1 | Identificado como primera iteración (solo demostración); no tiene módulo de segregación |
| 2 | Etapa 1 · modelo de datos | Modelos estructural, lógico y físico, diccionario y SQL para drawDB (importación sin verificar en el sitio) |
| 3 | Guía por capas | Esta carpeta; 14 de 15 scripts verificados (`docker-local.sh` sin verificar) |
| 4–9 | Etapa 2 · calidad del modelo | 6 áreas y 48 hallazgos sin aplicar: [`analisis/`](../04-base-de-datos/analisis/hallazgos-consolidados.md) |
| 10 | Etapa 3 · trazabilidad | [`etapa-3-matriz-de-trazabilidad.md`](etapa-3-matriz-de-trazabilidad.md) |

**Pendiente del estudiante:** rúbrica o lineamientos de la universidad, versión actualizada del documento, y prueba de `farmix-drawdb.sql` en drawDB.

**Alcance acordado:** FARMIX es solo para droguerías, farmacias independientes y droguerías de cadena. Los archivos de la Clínica Las Peñitas que estaban en la raíz del repositorio se retiraron de esta rama porque quedan fuera de ese alcance (siguen en el historial de Git).
