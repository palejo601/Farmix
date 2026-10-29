# Preguntas para el director — FARMIX (MVP)

**Estudiante:** Alejandro Pacheco Montes · **Director:** David Galvan Borja · **Codirector:** Brayan Javier Anaya Meza
**Versión final.** **Contexto:** el MVP ya funciona con datos simulados (391 pruebas automáticas); ya existen el borrador de [matriz de requisitos](matriz-de-requisitos.md) y el de [protocolo SUS](usabilidad-sus/protocolo-sus.md), que generan las preguntas 20 a 25. Antes de seguir cambiándolo, necesito decidir lo siguiente. Cada pregunta tiene una recomendación mía (marcada ★) que puede aceptarse o cambiarse.

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

## E. Registro del establecimiento (propuesta nueva)
Hay un borrador, **sin aplicar**, para guardar los datos legales de la droguería: NIT con dígito de verificación, razón social, CIIU, régimen tributario, representante legal, director técnico, concepto sanitario, área del local y resolución de facturación electrónica (`../propuestas/registro-drogueria/`).
| # | Pregunta | Recomendación ★ | Respuesta |
|---|---|---|---|
| 16 | Estos datos **no están en la propuesta**. ¿Se incluyen en el MVP? | Solo los que la gestión de residuos necesite (nombre, ciudad, director técnico); dejar NIT, CIIU, régimen y facturación electrónica como trabajo futuro | |
| 17 | Si se incluyen, ¿el **área mínima del local (20 m²)** y que el nombre comercial lleve la palabra **«Droguería»** son requisitos legales? No pude confirmarlos en la norma (Res. 1403 y 2955 de 2007; Decreto 780 de 2016). ¿Con qué texto o con qué secretaría de salud se verifican? | No bloquear el registro por esas reglas hasta tener la cita exacta; mostrarlas como aviso | |
| 18 | La dirección técnica de una droguería puede ser un Químico Farmacéutico, un Tecnólogo en Regencia de Farmacia **o un Expendedor de Drogas** (según una guía de la Alcaldía de Barranquilla). ¿Debe admitirse este último perfil? | Sí, si hay droguerías así en Sincelejo | |
| 19 | Los datos del representante legal y del director técnico son **personales de terceros** (Ley 1581). ¿Qué consentimiento y qué restricciones de acceso exige la universidad? | Acceso solo para propietario y administrador, sin registrarlos en el historial de auditoría | |

## F. Evidencia y validación (Fases 1, 4 y 5)
| # | Pregunta | Recomendación ★ | Respuesta |
|---|---|---|---|
| 20 | El **diagnóstico de campo** (objetivo 1) no tiene evidencia en el repositorio. ¿Con cuántas droguerías y con quién se hace (director, codirector, contactos propios)? | Con las que acuerde la universidad; si no hay acceso, simular casos y declararlo | |
| 21 | Para la **evaluación SUS**: ¿cuántos participantes (mínimo 5), de dónde salen y quién los contacta? | Entre 5 y 8 personas de droguerías independientes de Sincelejo, contactadas por la universidad o el director, con datos simulados | |
| 22 | ¿Qué **versión en español del SUS** debe citarse, y qué valor de referencia (68 puntos u otro)? | La que indique la universidad; si no hay, citar una versión validada y su fuente | |
| 23 | La **matriz de requisitos** sale del sistema construido, no de entrevistas. ¿Quién la valida (profesional farmacéutico, asesor jurídico) y cómo se deja constancia? | Revisión por un profesional farmacéutico y un asesor jurídico, con firma o acta; mientras tanto, presentarla como borrador | |
| 24 | La demostración, ¿se hace desde **Render** (los soportes subidos se pierden en cada despliegue) o desde una instalación **local**? ¿Debe la **PWA instalable** estar en la versión demostrada? | Instalación local o Render con aviso de la limitación; unir la PWA a la rama de Render antes de la Fase 5 | |
| 25 | El sistema **pregunta** por los 11 requisitos obligatorios, pero no hace cumplir ninguno. ¿Se presenta como herramienta de **autoevaluación y apoyo**, no de control de cumplimiento? | Sí, con ese aviso visible y en el informe | |

## Resumen en una frase
Las preguntas **1, 3, 4, 6, 16, 20 y 21** son las que más cambian el trabajo; el resto puede quedar como trabajo futuro sin afectar los objetivos. Las respuestas de la 13, la 15 y la 22 desbloquean la evaluación con usuarios.
