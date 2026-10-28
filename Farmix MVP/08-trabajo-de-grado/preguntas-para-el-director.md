# Preguntas para el director — FARMIX (MVP)

**Estudiante:** Alejandro Pacheco Montes · **Director:** David Galvan Borja · **Codirector:** Brayan Javier Anaya Meza
**Contexto:** el MVP ya funciona con datos simulados (391 pruebas automáticas). Antes de seguir cambiándolo, necesito decidir lo siguiente. Cada pregunta tiene una recomendación mía (marcada ★) que puede aceptarse o cambiarse.

## A. Alcance
| # | Pregunta | Recomendación ★ | Respuesta |
|---|---|---|---|
| 1 | ¿Confirma que el MVP es solo para **droguerías y farmacias independientes**, sin cadenas de droguerías y sin la Clínica Las Peñitas? | Sí; coincide con el título de la propuesta («servicios farmacéuticos independientes») | |
| 2 | La aplicación incluye dos funciones que **no están en la propuesta**: importar Excel/CSV y migrar datos locales. ¿Se dejan, se presentan como extra o se retiran de la evaluación? | Dejarlas y declararlas como funciones adicionales | |

## B. Uso real y datos
| # | Pregunta | Recomendación ★ | Respuesta |
|---|---|---|---|
| 3 | ¿El MVP se presentará **solo con datos simulados**, o también lo usarán trabajadores reales? (En el plan gratuito de Render los archivos de soporte subidos se pierden en cada despliegue.) | Datos simulados para la Fase 4; para la Fase 5 usar una instalación con almacenamiento persistente o documentar la limitación | |
| 4 | Si participan trabajadores: la base guarda su **nombre y cargo**. ¿Qué consentimiento y qué tratamiento de datos personales (Ley 1581) exige la universidad? | Consentimiento informado antes de la Fase 5 y datos agregados o anónimos en el informe | |
| 5 | ¿Por cuánto tiempo deben guardarse los archivos que se importan (pueden traer datos del personal)? | Borrarlos al confirmar o a las 24 horas | |

## C. Funciones que podrían cambiar el diseño
| # | Pregunta | Recomendación ★ | Respuesta |
|---|---|---|---|
| 6 | La propuesta pide **«historial por trabajador»**. Hoy, al repetir una capacitación se **edita** el registro y se pierde la fecha anterior. ¿Debe conservarse el historial de ciclos anteriores? | Sí: es lo que promete la propuesta | |
| 7 | ¿Debe poder **trazarse un residuo hasta el lote** del medicamento vencido del que salió? | No para el MVP; dejarlo como trabajo futuro | |
| 8 | En la verificación de segregación, ¿debe registrarse **quién** la hizo? | Sí, si la evaluación mide responsabilidad; si no, trabajo futuro | |
| 9 | En el plan de mejora, ¿el **responsable** y la fecha deben ser obligatorios y ligarse al diagnóstico que originó el hallazgo? | Responsable obligatorio; el vínculo al diagnóstico, trabajo futuro | |
| 10 | ¿Se necesita **transferir la propiedad** de una droguería a otra persona? | No para el MVP | |
| 11 | Existe un prototipo anterior (solo demostración). ¿Se debe poder **migrar sus datos** a la versión actual? | No; mantenerlo solo como primera iteración (Lean Startup) | |

## D. Entregables de la metodología (Fases 1, 4 y 5)
| # | Pregunta | Recomendación ★ | Respuesta |
|---|---|---|---|
| 12 | ¿Hay un **formato** o plantilla para la matriz de requisitos normativos y funcionales (Fase 1)? | Si no existe, usar una tabla requisito → norma → función → prueba | |
| 13 | ¿Hay formato de **consentimiento informado**, guía de observación y registro de tareas para la evaluación de usabilidad con SUS (≥ 5 participantes)? | Pedirlos a la universidad antes de contactar participantes | |
| 14 | ¿Cómo debe declararse el **uso de asistentes de IA** en el informe? (La propuesta lo permite como apoyo revisado por el investigador.) | Una sección que lo describa y diga qué revisó el investigador | |
| 15 | ¿Puedo recibir la **rúbrica** y la versión actualizada del documento? | — | |

## Resumen en una frase
Las preguntas **1, 3, 4 y 6** son las que más cambian el trabajo; el resto puede quedar como trabajo futuro sin afectar los objetivos.
