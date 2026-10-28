# Hallazgos consolidados de la Etapa 2 (ordenados por prioridad)

Reúne los **48 hallazgos** (47 abiertos y 1 cerrado por decisión de alcance: las cadenas no entran en el MVP) de `A1` a `A6`. Es solo lectura: **no se aplicó ningún cambio**. El detalle y la evidencia de cada uno están en el documento de su área.

- **Tipo:** [H] hecho confirmado en el catálogo o el código · [I] inferencia por verificar.
- **Quién decide:** **Director** = decisión de alcance o metodología · **Verificar** = falta comprobarlo (código, Render o datos) · **Equipo** = decisión técnica que se acuerda antes de aplicar.
- Prioridad **P0** (falla grave): **ninguna encontrada**. Las prioridades son sugerencias, no verdades cerradas.

## ⚡ Actualización tras la Fase 0 (ver `08-trabajo-de-grado/etapa-5-plan-de-mejora.md`)
Cerrados por verificación en el código: **A1-7, A3-3, A5-2, A3-7**. Degradado a P3: **A5-1**. Nuevo: **F0-1** (P2, el historial por trabajador no conserva ciclos previos).
Conteo vigente: P0 0 · P1 2 · P2 13 · P3 21 · observaciones 8 · cerrados 5 · total **49**. Las tablas de abajo son la versión original de la Etapa 2.

## Resumen
| Prioridad | Cantidad |
|---|---|
| P0 | 0 |
| P1 | 2 |
| P2 | 16 |
| P3 | 21 |
| Observación (sin acción) | 8 |
| Cerrado por alcance (A2-5, cadenas) | 1 |
| **Total** | **48** |

## P1 — Riesgo importante
| Ref. | Qué pasa | Tipo | Quién decide |
|---|---|---|---|
| A1-1 | `dev_mailbox.body` guarda el código de recuperación **en claro** y `MAIL_MODE` vale `dev` por defecto. Falta confirmar el valor en Render (no se toca producción) | [H] cuerpo y default; [I] riesgo | Verificar |
| A4-1 | Los soportes subidos viven en disco y, según la documentación, **se pierden en cada despliegue del plan gratuito de Render**, mientras las filas quedan. No se probó | [H] documentado; [I] inconsistencia | Equipo + Director (¿usuarios reales?) |

## P2 — Mejora importante
| Ref. | Qué pasa | Tipo | Quién decide |
|---|---|---|---|
| A4-3 | Los soportes se manejan de dos formas: `trainings` usa FK a `support_files`; vencimientos y residuos usan texto libre (`support_ref`) | [H] | Equipo |
| A3-1 | `support_ref` sin FK: puede apuntar a un soporte inexistente o de otra droguería | [H] falta FK; [I] riesgo | Equipo |
| A3-3 | `unit` mezcla `kg`, `g` y `unidades`: sumar sin convertir da totales sin sentido. El recorrido en navegador incluye «unidades no se suman a kg» (Etapa 3); falta revisar el reporte y la API | [H]; [I] riesgo | Verificar |
| A3-5 | `unit_cost` vale 0 por defecto: pérdida de valor 0 sin aviso | [H]; [I] efecto en reportes | Equipo |
| A3-8 | `ON DELETE CASCADE` desde `drugstores`: borrar una droguería borra físicamente sus registros (la app usa borrado lógico) | [H] | Equipo (con respaldo previo) |
| A4-4 | `workers` guarda nombres de terceros sin marca de consentimiento (posible requisito de la Ley 1581) | [H] ausencia; [I] requisito legal | **Director** |
| A1-2 | `sessions` y `password_resets` sin limpieza automática visible | [H]; [I] crecimiento | Equipo |
| A1-7 | No se verificó quién invoca `purgeDueAccounts`; si nadie, las cuentas nunca se eliminan | [H] función; [I] disparador | Verificar |
| A2-1 | La base garantiza máximo un propietario, pero no **al menos uno** | [H]; [I] riesgo | Equipo |
| A2-2 | Sin transferencia de propiedad; el propietario solo puede salir borrando su cuenta | [H]; [I] limitación | **Director** (¿requisito?) |
| A5-1 | La base no asegura que `score`/`response` coincida con el tipo de la versión del instrumento | [H]; [I] riesgo | Verificar |
| A5-2 | `diagnosis_area_scores` guarda notas derivables: pueden desfasarse si se editan respuestas. No se revisó la edición | [H]; [I] riesgo | Verificar |
| A5-3 | Los ítems de una versión se pueden modificar y alterarían diagnósticos ya hechos (inmutabilidad solo por convención) | [H] sin triggers; [I] riesgo | Equipo |
| A5-6 | `improvement_actions` no se vincula a un diagnóstico, solo a un ítem | [H] | **Director** (¿se mide seguimiento?) |
| A6-1 | El respaldo del prototipo v1 no se puede cargar en v2 (v2 solo acepta vencimientos, residuos y segregación). No se probó un archivo real | [H] esquema estricto; [I] incompatibilidad | **Director** |
| A6-2 | `imports` y `local_migrations` guardan el contenido de los archivos sin purga, también en vistas caducadas | [H]; [I] retención indefinida | Equipo + Director |

## P3 — Detalle menor o decisión de diseño
| Ref. | Qué pasa | Quién decide |
|---|---|---|
| A1-3 | `audit_logs.action` y `resource` son texto libre | Equipo |
| A1-4 | `audit_logs`/`dev_mailbox` sin índice por fecha sola (medir antes) | Equipo |
| A1-5 | `users.email` sin CHECK de formato (solo lo valida la API) | Equipo |
| A1-6 | `users.email` y `password_hash` sin límite de longitud en la base | Equipo |
| A2-3 | Al purgar una cuenta propietaria, la droguería se archiva y sus miembros pierden acceso | Equipo |
| A2-6 | `city` con valor por defecto fijo `'Sincelejo'` | Equipo |
| A3-2 | Los residuos no se enlazan con el lote de origen (trazabilidad lote → residuo) | **Director** |
| A3-4 | `origin`, `waste_type`, `handling` opcionales; dos son texto libre | Equipo |
| A3-6 | `segregation_checks` no guarda quién revisó ni evita duplicados del mismo día y lugar | **Director** (¿lo exige la propuesta?) |
| A3-7 | Sin triggers: `updated_at` depende de la aplicación (no verificado en esas tablas) | Equipo |
| A3-9 | `SET NULL` en auditoría: se pierde el autor si se elimina el usuario | Equipo |
| A4-5 | Trabajador retirado sin fecha ni motivo de retiro | Equipo |
| A4-6 | Capacitaciones futuras permitidas por el CHECK (depende de la API) | Equipo |
| A4-7 | `valid_until` se guarda aunque es derivable (decisión razonable; documentarla) | Equipo |
| A5-4 | `area` mezcla el vocabulario de dos instrumentos | Equipo |
| A5-5 | Responsable y fecha opcionales en `improvement_actions` | **Director** |
| A5-7 | `diagnosis_answers` sin `drugstore_id` (patrón, no error) | Equipo |
| A6-3 | CASCADE al borrar usuario elimina el historial de migraciones | Equipo |
| A6-4 | Lista de 3 tipos repetida en CHECK y código | Equipo |
| A6-5 | `inserted_ids` (`jsonb`) sin FK: reversión depende de que los ids existan | Equipo |
| A6-6 | «Quién cargó» se registra con criterios distintos en `imports` y `local_migrations` | Equipo |

## Observaciones (sin acción)
A1-8, A2-4, A2-7, A2-8, A4-2, A4-8, A5-8, A6-7: describen decisiones correctas o hechos neutros (por ejemplo, `drugstores.name` no único).

## Decisiones que necesitan al director (7)
1. **Transferencia de propiedad** (A2-2).
2. **Trazabilidad lote → residuo** (A3-2).
3. ¿La propuesta exige **quién revisó** en segregación? (A3-6).
4. **Consentimiento** del personal / Ley 1581 (A4-4).
5. Vincular el **plan de mejora** a un diagnóstico y exigir responsable (A5-5, A5-6).
6. ¿Debe **migrarse el prototipo v1** o basta como demostración? (A6-1).
7. **Retención** de datos cargados y ¿usuarios reales en Render? (A6-2, A4-1).

## Pendiente de verificar sin tocar producción (5)
A1-1 (`MAIL_MODE` en Render), A1-7 (quién llama a `purgeDueAccounts`), A3-3 (reportes con unidades), A5-1 y A5-2 (coherencia y edición de respuestas).
