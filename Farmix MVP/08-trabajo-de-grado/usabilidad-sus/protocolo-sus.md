# Protocolo de evaluación de usabilidad con SUS — FARMIX (borrador)

**Estudiante:** Alejandro Pacheco Montes · **Fase 5 de la propuesta:** usabilidad con SUS y **al menos 5 participantes**.
**Estado:** borrador **sin ejecutar**. Falta el formato de consentimiento, la guía de observación y el registro de tareas de la universidad (pregunta 13 de la hoja del director); este protocolo debe ajustarse a ellos.

## 1. Qué se mide
| Medida | Cómo | Para qué |
|---|---|---|
| Percepción de usabilidad | Cuestionario SUS (10 ítems, puntaje 0–100) | Resultado principal de la Fase 5 |
| Éxito por tarea | Observación: completó / con ayuda / no completó | Explicar *dónde* falla |
| Tiempo por tarea | Cronómetro | Detectar tareas lentas |
| Errores y comentarios | Notas del observador | Priorizar mejoras |

## 2. Participantes
- **Mínimo 5.** Con tan pocos, el promedio SUS es orientativo, no estadístico; se reporta cada puntaje individual además del promedio.
- **Perfil:** personas que trabajan o han trabajado en una droguería o farmacia independiente (propietario, director técnico o auxiliar). Procurar mezclar al menos dos de esos cargos.
- **Exclusión:** quienes hayan participado en el desarrollo del sistema.
- Se identifican como P1, P2… (sin nombre en los resultados).

## 3. Preparación
1. **Entorno:** instancia con **datos simulados**. Si se usa Render, avisar que los archivos adjuntos se pierden en cada despliegue; mejor una instancia local o con almacenamiento persistente (pregunta 3 de la hoja).
2. **Cuentas de prueba** creadas de antemano; nunca datos reales de una droguería ni de trabajadores.
3. **Piloto:** ejecutar el protocolo completo con una persona fuera de la muestra para ajustar tareas y tiempos.
4. Un observador (el estudiante) y, si es posible, grabación **solo con permiso expreso** y sin rostro.
5. Dispositivo: el que el participante usaría (computador o teléfono); anotarlo.

## 4. Tareas (basadas en los flujos de [`flujos-y-capturas.md`](../flujos-y-capturas.md))
Se lee cada tarea en voz alta; no se explica cómo hacerla. El tiempo máximo es una propuesta **por calibrar en el piloto**.

| # | Tarea | Éxito si… | Máx. |
|---|---|---|---|
| T1 | Ingresar con la cuenta de prueba y abrir la droguería | Llega a la pantalla de Inicio | 3 min |
| T2 | Registrar un residuo (elegir clasificación, cantidad y unidad) | Aparece en la lista de residuos | 4 min |
| T3 | Registrar un medicamento con fecha de vencimiento próxima | Aparece en Vencimientos con su estado | 5 min |
| T4 | Encontrar qué productos están por vencer y marcar uno como devuelto o destruido | El producto cambia de estado | 4 min |
| T5 | Registrar una verificación de segregación | Queda guardada con su porcentaje | 4 min |
| T6 | Registrar una capacitación a un trabajador y adjuntar un soporte | El trabajador figura como «Capacitado» | 6 min |
| T7 | Responder el diagnóstico y ver el reporte de gestión | Abre el reporte con sus secciones | 6 min |

Registro por tarea: **1** completó solo · **2** completó con una pista · **3** no completó. Más tiempo, errores y comentarios.

## 5. Guion de la sesión (≈ 35 min)
1. **Bienvenida y consentimiento (5 min):** explicar que se evalúa el sistema, no a la persona; que puede parar cuando quiera; que los datos serán anónimos. Firmar el consentimiento.
2. **Perfil (2 min):** cargo, años de experiencia, uso habitual de computador o teléfono.
3. **Tareas T1–T7 (20 min):** pedir que piense en voz alta; el observador no ayuda salvo que pasen el tiempo máximo (se marca «con pista» o «no completó»).
4. **Cuestionario SUS (5 min):** inmediatamente después de las tareas, sin discutir las respuestas antes.
5. **Cierre (3 min):** dos preguntas abiertas: «¿Qué fue lo más difícil?» y «¿Qué cambiaría?». Agradecer.

## 6. Cuestionario SUS (versión en español)
Escala: **1** = totalmente en desacuerdo … **5** = totalmente de acuerdo.
> Nota: esta redacción es una adaptación común al español. Antes de aplicarla, **verificar y citar la versión validada** que adopte la universidad o el director.

| # | Ítem | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| 1 | Creo que me gustaría usar este sistema con frecuencia | ☐ | ☐ | ☐ | ☐ | ☐ |
| 2 | Encontré el sistema innecesariamente complejo | ☐ | ☐ | ☐ | ☐ | ☐ |
| 3 | Pensé que el sistema era fácil de usar | ☐ | ☐ | ☐ | ☐ | ☐ |
| 4 | Creo que necesitaría el apoyo de una persona experta para poder usar el sistema | ☐ | ☐ | ☐ | ☐ | ☐ |
| 5 | Encontré que las diversas funciones del sistema estaban bien integradas | ☐ | ☐ | ☐ | ☐ | ☐ |
| 6 | Pensé que había demasiada inconsistencia en el sistema | ☐ | ☐ | ☐ | ☐ | ☐ |
| 7 | Imagino que la mayoría de las personas aprenderían a usar este sistema muy rápidamente | ☐ | ☐ | ☐ | ☐ | ☐ |
| 8 | Encontré el sistema muy incómodo de usar | ☐ | ☐ | ☐ | ☐ | ☐ |
| 9 | Me sentí muy seguro/a usando el sistema | ☐ | ☐ | ☐ | ☐ | ☐ |
| 10 | Necesité aprender muchas cosas antes de poder empezar a usar el sistema | ☐ | ☐ | ☐ | ☐ | ☐ |

## 7. Cálculo del puntaje
- Ítems **impares** (1, 3, 5, 7, 9): respuesta − 1.
- Ítems **pares** (2, 4, 6, 8, 10): 5 − respuesta.
- Se suman los 10 valores y se **multiplican por 2,5** → puntaje de 0 a 100.
- Promedio de los participantes. Una referencia habitual en la literatura es **68** puntos; citar la fuente exacta en la tesis. El puntaje **no es un porcentaje**.
- Se calcula con [`calcular-sus.py`](calcular-sus.py) a partir de [`plantilla-resultados.csv`](plantilla-resultados.csv).

## 8. Consentimiento (texto provisional, **no sustituye** el formato de la universidad)
Debe decir, como mínimo: objetivo del estudio; que la participación es voluntaria y puede retirarse sin consecuencia; qué datos se recogen (cargo, respuestas, tiempos, notas); que se usarán de forma anónima y agregada; quién los custodia y por cuánto tiempo; contacto del estudiante y del director; autorización expresa para grabar (si aplica). Revisar con la universidad el tratamiento de datos personales según la **Ley 1581 de 2012** (pregunta 4 de la hoja del director).

## 9. Qué se informa en la tesis
- Número y perfil de participantes, y entorno (datos simulados).
- Tabla por participante: puntaje SUS, tareas completadas, tiempo total.
- Promedio SUS y por tarea: tasa de éxito, tiempo medio, errores frecuentes.
- Lista priorizada de problemas de usabilidad y cambios propuestos (sin aplicar hasta acordarlos).
- **Límites:** muestra pequeña, datos simulados, un solo observador, evaluación en un solo momento.

## 10. Pendientes antes de ejecutar
- [ ] Formatos de la universidad (consentimiento, guía de observación, registro de tareas)
- [ ] Respuesta del director a las preguntas 3 y 4
- [ ] Versión de SUS en español que se citará
- [ ] Entorno con datos simulados y cuentas de prueba
- [ ] Piloto con una persona fuera de la muestra
