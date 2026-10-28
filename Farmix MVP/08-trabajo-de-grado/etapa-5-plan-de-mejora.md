# Etapa 5 · Plan de mejora (P0–P3)

**Es un plan para acordar. No se aplicó ningún cambio al código, a la base ni a producción.**
Reúne: los 39 hallazgos con prioridad de la Etapa 2 (`../04-base-de-datos/analisis/hallazgos-consolidados.md`), las brechas académicas de la Etapa 4 y dos hallazgos extra (E1, E2). Las 8 observaciones y el hallazgo cerrado por alcance (A2-5) no requieren acción.
Convención: **[H]** hecho · **[I]** inferencia · «Quién decide»: **Director** / **Estudiante** / **Equipo** (acordamos juntos) / **Verificar** (primero se comprueba, de solo lectura).

## Reglas para ejecutar (de tu prompt maestro)
1. No se modifica código hasta que este plan esté **acordado**, y se hace por paquetes pequeños.
2. **Nunca** se toca la base de producción de Render; todo se prueba en bases locales (`farmix_test`, `farmix_dev`).
3. Los cambios de estructura van en **migraciones nuevas** (`0014_…sql` en adelante); jamás se edita una ya aplicada (el checksum lo impide).
4. Antes de una migración delicada: **copia de seguridad y plan de recuperación**.
5. **No se agregan restricciones nuevas automáticamente:** cada una se revisa contra los datos existentes antes (puede fallar si ya hay filas que la violan).
6. Cada paquete termina con pruebas nuevas o ajustadas y `verificar-todo.sh` en verde.

## Escala de prioridad
| P | Significado | Cantidad |
|---|---|---|
| P0 | Falla grave, detener todo | **0** |
| P1 | Riesgo importante antes de usuarios reales | 2 |
| P2 | Mejora importante | 16 |
| P3 | Detalle o decisión de diseño | 21 |

## Fase 0 · Verificar antes de decidir (solo lectura, sin cambios)
| ID | Qué verificar | Cómo | Quién |
|---|---|---|---|
| V1 | Valor de `MAIL_MODE` en Render (A1-1) | Mirar el panel de Render; yo no accedo a él | Estudiante |
| V2 | Quién invoca `purgeDueAccounts` y cada cuánto (A1-7) | Buscar en el código y en la configuración de arranque | Yo |
| V3 | Si los reportes suman unidades distintas (A3-3) | Leer `waste/service.ts` y `reports` | Yo |
| V4 | Si la coherencia `score`/`response` con la versión se valida en el código (A5-1) | Leer `diagnoses/service.ts` y su prueba | Yo |
| V5 | Si se pueden editar respuestas ya guardadas y se recalculan las notas (A5-2) | Leer `diagnoses` (PATCH) | Yo |
| V6 | Si una recapacitación conserva el historial anterior (Etapa 4) | Leer `staff/service.ts` | Yo |
| V7 | Si `updated_at` lo escribe la app en vencimientos, residuos y segregación (A3-7) | Leer los servicios | Yo |

## Paquetes de trabajo
Cada paquete indica el tipo de cambio: **Doc** (solo documentación), **Código**, **Migración** (cambia la base).

### PM-1 · Cuentas y correo (prioridad más alta)
| Ref. | Acción propuesta | Tipo | Riesgo / precauciones | Prueba de aceptación |
|---|---|---|---|---|
| **A1-1 (P1)** | Tras V1: si Render usa `dev`, no guardar el token en `dev_mailbox` fuera de desarrollo, o exigir `MAIL_MODE` explícito en producción (como ya se exige `COOKIE_SECURE`) | Código | Cambiar el modo en producción exige tener otro canal de correo; decisión Equipo | Prueba: en producción sin `smtp` la app no arranca o no persiste el token |
| A1-2 (P2) | Limpieza periódica de sesiones y recuperaciones vencidas | Código | Borrado físico: solo filas ya expiradas; probar en local | Prueba: tras la limpieza solo quedan sesiones vigentes |
| A1-7 (P2) | Según V2: conectar o documentar el disparador de `purgeDueAccounts` | Código/Doc | Es una eliminación real de cuentas: probar con datos de prueba | Prueba con una cuenta cuya gracia venció |
| A1-3…6 (P3) | Opcional: CHECK de formato/longitud de `email`, `action` y `resource` más cerrados; índice por fecha | Migración | Riesgo de rechazar datos existentes → revisar antes | Migración aplica en `farmix_test` sin errores |

### PM-2 · Soportes documentales
| Ref. | Acción propuesta | Tipo | Riesgo / precauciones | Prueba |
|---|---|---|---|---|
| **A4-1 (P1)** | Decidir con el director si habrá usuarios reales. Si sí: disco persistente o almacenamiento externo (plan de pago). Si no: **documentar la limitación** en el informe y avisar en pantalla | Doc / config | La opción de pago cambia costos y despliegue | La app avisa; o un archivo subido sobrevive a un redespliegue |
| A4-3, A3-1 (P2) | Unificar: que vencimientos y residuos usen `support_files` con FK, igual que capacitaciones | Migración + código | Migrar `support_ref` existentes (texto) sin perder datos: **respaldo primero**, mapear o conservar el texto | Migración reversible probada en local |

### PM-3 · Reglas de integridad en la base
| Ref. | Acción propuesta | Tipo | Riesgo | Prueba |
|---|---|---|---|---|
| A2-1 (P2) | Garantizar «al menos un propietario» (restricción diferida o validación) | Migración/Código | Una restricción mal puesta bloquea el borrado de cuentas (ver A2-3) | Prueba: no se puede dejar una droguería activa sin propietario |
| A5-1 (P2) | Según V4: CHECK o trigger que exija `score` con `likert_avg` y `response` con `compliance_ratio` | Migración | Datos antiguos con versión mezclada | Prueba que rechaza el tipo equivocado |
| A5-2 (P2) | Según V5: recalcular notas al editar respuestas, o bloquear la edición | Código | Cambia resultados guardados: solo hacia adelante | Prueba de recálculo |
| A5-3 (P2) | Impedir modificar ítems de una versión que ya tiene diagnósticos | Migración (trigger) | Los triggers son nuevos en este proyecto (hoy no hay ninguno): decisión Equipo | Prueba que rechaza el UPDATE |
| A3-3 (P2) | Según V3: validar unidades en reportes | Código | Bajo | Prueba con kg + unidades |
| A3-5 (P2) | Avisar cuando `unit_cost = 0` en pérdidas, sin cambiar el default | Código | Bajo | Prueba del aviso |
| A3-8 (P2) | Evaluar `RESTRICT` en vez de `CASCADE` desde `drugstores` | Migración | **Delicado:** cambia el borrado de droguerías y de cuentas. Respaldo previo; revisar A2-3 | Prueba de borrado lógico intacto |

### PM-4 · Privacidad y retención de datos
| Ref. | Acción propuesta | Tipo | Quién |
|---|---|---|---|
| A4-4 (P2) | Definir con el director si el consentimiento del personal (Ley 1581) aplica y cómo registrarlo | Doc → posible Migración | **Director** |
| A6-2 (P2) | Definir retención y purga de `imports` y `local_migrations` (p. ej. borrar el contenido pasadas las 24 h o tras confirmar) | Código | Equipo |
| A2-3, A3-9, A6-3 (P3) | Documentar qué se conserva y qué se pierde al borrar una cuenta; mostrar aviso antes de confirmar | Doc/Código | Equipo |

### PM-5 · Decisiones funcionales (dependen del director)
| Ref. | Pregunta | Tipo si se aprueba |
|---|---|---|
| A2-2 (P2) | ¿Transferencia de propiedad? | Código |
| A3-2 (P3) | ¿Trazabilidad lote → residuo? | Migración (nueva FK opcional) |
| A3-6 (P3) | ¿Segregación guarda quién revisó? | Migración |
| A5-5, A5-6 (P2/P3) | ¿Plan de mejora ligado a un diagnóstico y con responsable obligatorio? | Migración + código |
| A6-1 (P2) | ¿Migrar el prototipo v1 o dejarlo como demostración? | Código (conversor) o solo Doc |
| A4-5 (P3) | ¿Fecha y motivo de retiro de trabajadores? | Migración |
| V6 | Si el historial por trabajador se pierde al recapacitar | Código/Migración |

### PM-6 · Calidad menor (P3, sin urgencia)
A3-4, A3-7, A4-6, A4-7, A5-4, A5-7, A6-4, A6-5, A6-6, A2-6. Son consistencia y documentación: se agrupan en una sola ronda de limpieza al final, o se dejan documentados como **limitaciones conocidas** en el informe.

## Hallazgos extra (no estaban en las 48)
| ID | Prioridad | Qué pasa | Acción |
|---|---|---|---|
| **E1** | P2 | **El backend no lee `.env`** (no hay `dotenv` ni `--env-file`), pero el README de `farmix-app` indica copiar `.env.example`. [H, Etapa de la guía] Mis scripts lo cargan por su cuenta | Corregir el README, o cargar el `.env` en `package.json`/código. Cambio pequeño y de bajo riesgo |
| **E2** | P2 | Las ramas `pwa-instalable` y `modelo-datos` **no están unidas** a la rama que publica Render; la PWA no llega a producción [H] | Abrir PRs; **decisión tuya**, no lo hago sin pedírmelo |

## Pista académica (de la Etapa 4)
| ID | Prioridad | Entregable | Quién |
|---|---|---|---|
| AC1 | Alta | Matriz de requisitos normativos y funcionales (Fase 1) | Estudiante + director; yo ayudo a ordenarla |
| AC2 | Alta | Consentimiento informado y procedimiento ético (Fase 5) | Estudiante + director |
| AC3 | Alta | Evaluación de usabilidad: ≥ 5 participantes, tareas, SUS | Estudiante |
| AC4 | Media | Matriz de casos de prueba e incidencias (Fase 4) | **Yo**, desde las pruebas existentes |
| AC5 | Media | Wireframes y flujos con capturas del sistema real (Fase 2) | **Yo** (capturas con Playwright), tú revisas |
| AC6 | Media | Confirmar por escrito con el director: sin cadenas, sin la Clínica Las Peñitas | Estudiante |

## Orden sugerido
| Paso | Qué | Por qué primero |
|---|---|---|
| 1 | **Fase 0** (V1–V7) | Convierte inferencias en hechos sin tocar nada |
| 2 | Decisiones con el director (PM-5, PM-4, AC6, A4-1) | Evitan rehacer trabajo |
| 3 | E1 y PM-1 (A1-1) | Bajo riesgo y alto valor de seguridad |
| 4 | AC4 y AC5 | Cierran brechas académicas con lo que ya existe |
| 5 | PM-2 y PM-3 | Cambian la base: requieren respaldo y migraciones |
| 6 | E2 (PRs) | Al final, con todo probado |
| 7 | PM-6 | Si queda tiempo |
| En paralelo | AC1–AC3 | Dependen de personas, no del código |

## Cobertura
39 hallazgos con prioridad: PM-1 (7) + PM-2 (3) + PM-3 (7) + PM-4 (5) + PM-5 (7) + PM-6 (10) = **39** ✔. Más E1, E2 y AC1–AC6.

## Lo que este plan NO afirma
- No afirma que los hallazgos sean errores confirmados: varios son **[I]** y se verifican en la Fase 0.
- No incluye estimaciones de tiempo: dependen de las respuestas del director y de la disponibilidad de usuarios.

## Autoevaluación
1. ¿Por qué la Fase 0 va antes que cualquier cambio?
2. ¿Por qué una restricción nueva puede fallar aunque el código esté bien?
3. ¿Qué paquetes puedes avanzar tú sin depender del director?
