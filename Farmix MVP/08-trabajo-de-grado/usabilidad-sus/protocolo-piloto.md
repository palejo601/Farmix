# Protocolo del piloto — evaluación de usabilidad FARMIX (borrador)

**Para qué:** ensayar el [protocolo SUS](protocolo-sus.md) **antes** de convocar a los 5 participantes: comprobar que las tareas se entienden, calibrar los tiempos máximos y encontrar fallas del entorno. **El piloto no cuenta en los resultados** ni en el promedio SUS.
**Estado:** sin ejecutar. Tiempo estimado: 1 hora por sesión.

## Dos rondas
| Ronda | Quién | Para qué |
|---|---|---|
| **A · Autopiloto** | Tú sola, como si fueras participante | Ver que el entorno arranca, que las tareas se pueden hacer y cuánto tardas **(ojo: conoces el sistema, tus tiempos son un mínimo, no un promedio)** |
| **B · Piloto con otra persona** | Una persona **fuera de la muestra** y que no conozca el sistema (idealmente del mismo perfil: droguería o farmacia) | Detectar tareas confusas, tiempos realistas y problemas del guion |

## 1. Antes de empezar (lista de verificación)
- ☐ Sistema encendido con [la guía local](../../07-scripts-generales/probar-en-mi-computador.md), con **datos simulados** y cuenta de prueba entregada al participante
- ☐ Base reiniciada para que cada sesión parta del mismo estado (volver a cargar los datos de demostración)
- ☐ Navegador y dispositivo definidos (computador o teléfono) y anotados
- ☐ Cronómetro, copia impresa de las tareas, hoja de registro y cuestionario SUS
- ☐ Consentimiento: en la ronda B, **leer y firmar el formato provisional** (o el de la universidad si ya llegó)
- ☐ Sin notificaciones ni otras pestañas abiertas

## 2. Guion de la sesión
1. **Bienvenida (3 min):** «Evaluamos el sistema, no a ti. Si algo no se entiende, es culpa del sistema. Puedes parar cuando quieras. Piensa en voz alta.»
2. **Perfil (2 min):** cargo, años de experiencia, dispositivo habitual.
3. **Tareas T1–T7 (≈ 25 min):** leerlas una por una; no explicar cómo hacerlas. Si se atasca, esperar hasta el tiempo máximo; luego dar **una pista** y marcarlo.
4. **Cuestionario SUS (5 min).**
5. **Preguntas del piloto (10 min):** ver sección 4.
6. **Cierre (2 min):** agradecer.

## 3. Hoja de registro (una por sesión)
**Ronda:** ☐ A ☐ B · **Fecha:** ____ · **Dispositivo/navegador:** ____ · **Observador:** ____

| Tarea | Resultado (1 solo · 2 con pista · 3 no completó) | Tiempo | Errores / dudas / frases textuales |
|---|---|---|---|
| T1 Ingresar y abrir la droguería | | | |
| T2 Registrar un residuo | | | |
| T3 Registrar un medicamento con vencimiento próximo | | | |
| T4 Ver lo que vence y gestionar un producto | | | |
| T5 Registrar una verificación de segregación | | | |
| T6 Registrar una capacitación con soporte | | | |
| T7 Responder el diagnóstico y ver el reporte | | | |

**Puntaje SUS de la sesión** (con `calcular-sus.py`, solo como práctica): ____

## 4. Preguntas para el participante del piloto
1. ¿Qué tarea no se entendía al leerla? ¿Con qué palabras la dirías tú?
2. ¿Algún ítem del cuestionario SUS te resultó confuso?
3. ¿Hubo demasiadas o muy pocas tareas? ¿Te cansaste?
4. ¿Se entendió la explicación del inicio y el consentimiento?
5. ¿Qué palabra o botón del sistema no entendiste?

## 5. Qué ajustar después (criterios propuestos [P])
| Si observas… | Entonces… |
|---|---|
| Una tarea que casi nadie completa sin pista | Reescribir el enunciado; **no** cambiar el sistema antes de la evaluación (se reporta como hallazgo) |
| Tiempos mayores que el máximo en varias tareas | Subir el máximo (en la tarea, no en el sistema) y dejarlo escrito |
| Un fallo técnico (error, pantalla en blanco) | Registrarlo con la ruta y lo que hiciste, y corregir el entorno antes de convocar a los 5 |
| Más de ≈ 45 minutos en total | Quitar o dividir tareas |
| Un ítem SUS confuso | Consultar la versión validada que usará la universidad (pregunta 22 de la hoja del director) |

## 6. Bitácora de problemas encontrados
| # | Dónde (pantalla/ruta) | Qué pasó | Gravedad (bloquea / molesta / cosmético) | Decisión |
|---|---|---|---|---|
| | | | | |

## 7. Condiciones para pasar a los 5 participantes
- ☐ Las 7 tareas se pudieron completar al menos una vez
- ☐ Tiempos máximos ajustados
- ☐ Entorno estable (sin fallos técnicos repetidos)
- ☐ Consentimiento y formatos de la universidad listos (preguntas 4, 13 y 22 respondidas)
- ☐ Los datos del piloto **guardados aparte y marcados «piloto»**, fuera del cálculo final

## Límites
El autopiloto no representa a un usuario nuevo, y un solo participante de piloto no valida el protocolo: sirve para encontrar fallos evidentes, no para medir.
