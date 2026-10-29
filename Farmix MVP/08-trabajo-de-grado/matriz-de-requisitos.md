# Matriz de requisitos normativos y funcionales — FARMIX (borrador)

**Fase 1 de la propuesta · objetivo específico 2.** Formato propuesto: requisito → norma → función → prueba (recomendación de la pregunta 12; si la universidad entrega una plantilla, se traslada a ella).
**Estado:** borrador **reconstruido a partir del sistema ya construido** (no de una entrevista con usuarios). Debe validarse con el director y con un profesional farmacéutico y un asesor jurídico antes de citarse como requisitos finales.
Convención: **[H]** confirmado en código o documento · **[I]** inferencia · **[P]** propuesta mía por validar · ✔ cubierto · ◐ parcial · ✘ sin evidencia.
**Alcance:** droguerías y farmacias independientes; sin cadenas ni Clínica Las Peñitas.

## 1. Requisitos normativos
Origen: los 11 requisitos obligatorios del diagnóstico (`migrations/0013_pgirasa_alignment.sql`) y el marco legal de `frontend/src/normativa.ts`. **Las citas son las que ya trae el sistema; yo no verifiqué el texto de las normas** (esa verificación le corresponde a un asesor jurídico, como indica el propio sistema).

| ID | Requisito (lo que debe cumplir la droguería) | Norma citada por el sistema [H] | Cómo lo apoya FARMIX | Prueba | Estado |
|---|---|---|---|---|---|
| RN-01 | PGIRASA elaborado según el manual vigente y disponible a las autoridades | Res. 591/2024; Decreto 780/2016, art. 2.8.10.6 | Pregunta OB-01 del diagnóstico | `diagnoses.test.ts` (general) | ◐ pregunta; no genera el PGIRASA |
| RN-02 | Área para manejo y disposición de residuos | Res. 1403/2007, Manual, Cap. V, 1.1.2 l) | Pregunta OB-02 | ídem | ◐ pregunta |
| RN-03 | Área para medicamentos vencidos o deteriorados | Res. 1403/2007, Manual, Cap. V, 1.1.2 h) | Pregunta OB-03; módulo de vencimientos | ídem; `expirations.test.ts` | ◐ |
| RN-04 | Área de cuarentena | Res. 1403/2007, Manual, Cap. V, 1.1.2 k) | Pregunta OB-04 | ídem | ◐ pregunta |
| RN-05 | Área independiente para control especial (No aplica si no los maneja) | Res. 1403/2007, Manual, Cap. V, 1.1.2 g) | Pregunta OB-05 con «No aplica» | ídem | ◐ pregunta |
| RN-06 | Registro permanente de temperatura y humedad | Res. 1403/2007, Manual, Cap. II, 1.1 h) | Pregunta OB-06 | ídem | ◐ pregunta; no registra temperaturas [I] |
| RN-07 | Primero vender el lote más próximo a vencer | Res. 1403/2007, Manual, Cap. II, 1.1 i) | Pregunta OB-07; alertas por vencimiento | ídem; `expirations.test.ts` | ◐ alerta, no controla la venta [I] |
| RN-08 | Entregar residuos peligrosos a gestor autorizado y guardar certificados | Res. 591/2024; Decreto 1076/2015, Tít. 6, mod. Decreto 766/2026 (alcance pendiente) | Pregunta OB-08; registro de residuos | ídem; `waste.test.ts` | ◐ no guarda certificados [I] |
| RN-09 | Separar de inmediato productos retirados del mercado | Res. 1403/2007, art. 26 | Pregunta OB-09 | ídem | ◐ pregunta |
| RN-10 | Participar en programa posconsumo de medicamentos | Decreto 1076/2015, Tít. 6; Res. 0371/2009 | Pregunta OB-10 | ídem | ◐ pregunta |
| RN-11 | Dirección técnica con el perfil exigido (perfiles pendientes de verificar) | Decreto 780/2016; Res. 1403/2007 | Pregunta OB-11 | ídem | ◐ pregunta; ver P18 de la hoja del director |
| RN-12 | Protección de datos personales | Ley 1581 de 2012 | Aceptación del aviso en el registro; descarga y borrado de cuenta | `users-personal-data.test.ts` | ◐ cubre la cuenta, **no** a trabajadores (A4-4) |

**Lectura [I]:** para las normas, el sistema funciona como **instrumento de autoevaluación y recordatorio**, no como control automático. Eso debe decirse así en la tesis. Además, el sistema aclara que no es asesoría jurídica ni concepto de cumplimiento.

## 2. Requisitos funcionales
Origen: las funciones del encargo y de la propuesta ya mapeadas en la [matriz de trazabilidad](etapa-3-matriz-de-trazabilidad.md). Prioridad (MoSCoW) y criterios de aceptación son **[P]**, salvo los que cito de una prueba existente.

| ID | Requisito funcional | Traza (Etapa 3) | Prioridad [P] | Criterio de aceptación | Estado |
|---|---|---|---|---|---|
| RF-01 | Registrar residuos por clasificación, cantidad y unidad | R1 | Debe | Un medicamento vencido no puede clasificarse como riesgo biológico (regla probada); las unidades distintas no se suman a kg en pantalla | ✔ |
| RF-02 | Registrar productos con lote, vencimiento, cantidad y costo | R2 | Debe | Un lote repetido se rechaza como duplicado | ✔ |
| RF-03 | Alertar productos por vencer según los días configurados | R2 | Debe | Probado en los límites 0, 59, 60 y 61 días | ✔ |
| RF-04 | Gestionar un producto vencido (devolver, destruir, avería) | R2 | Debe | El producto cambia de estado y queda en pérdidas | ✔ |
| RF-05 | Calcular pérdidas por vencimiento | R3 | Debería | Las cifras coinciden con los registros (prueba de cifras exactas); son descriptivas, no demuestran reducción | ✔ |
| RF-06 | Verificar la segregación y calcular su porcentaje | R5 | Debe | Los correctos no superan los revisados | ✔ |
| RF-07 | Registrar personal y capacitaciones con soporte | X1 | Debería | Con soporte PDF o imagen el estado es «Capacitado»; sin soporte, «Sin soporte» | ✔ (soportes se pierden en el plan gratuito de Render, A4-1) |
| RF-08 | Conservar el historial por trabajador | F0-1 | Debería | Al repetir una capacitación se conserva el ciclo anterior | ✘ hoy se edita el registro; depende de la P6 |
| RF-09 | Diagnóstico con 11 obligatorios y 17 de madurez, comparado con la línea base | O1 | Debe | Un incumplimiento no se compensa con promedios; genera una mejora | ✔ herramienta; sin diagnóstico de campo |
| RF-10 | Tablero de mejoras (pendiente, en curso, cerrada) | O1b | Debería | Cerrar una mejora guarda la fecha | ✔ |
| RF-11 | Reporte de gestión con seis secciones | R4 | Debe | El documento incluye las seis secciones | ✔ |
| RF-12 | Cuentas, sesión y recuperación de contraseña | R6 | Debe | Rutas privadas sin sesión responden 401 | ✔ (riesgo A1-1 si `MAIL_MODE` es `dev`) |
| RF-13 | Varias droguerías por cuenta y miembros con rol | R7, R8 | Debería | Quien no es miembro recibe 404 | ✔ |
| RF-14 | Consultar el marco legal | X4 | Podría | Contenido estático, con aviso de que no es asesoría jurídica | ✔ |
| RF-15 | Importar Excel/CSV y migrar datos locales | X2, X3 | Podría | Vista previa antes de importar; solo 3 tipos migrables | ✔ (fuera de la propuesta, P2) |

## 3. Requisitos no funcionales
| ID | Requisito | Evidencia [H] | Estado |
|---|---|---|---|
| RNF-01 | Aislamiento de datos entre droguerías | 6 claves foráneas compuestas; `protected-routes.test.ts` | ✔ |
| RNF-02 | Contraseñas protegidas | Argon2id (según la arquitectura documentada) | ✔ [H] |
| RNF-03 | Instalable en el teléfono (PWA) | `pwa.test.ts`, solo en la rama `pwa-instalable` | ◐ sin unir a la rama de Render; sin prueba en celular real |
| RNF-04 | Sin pagos | Búsqueda de texto sin resultados | ✔ |
| RNF-05 | Se usa en teléfono | Capturas móviles de 390 px | ◐ sin evaluación con usuarios |
| RNF-06 | Usabilidad percibida | Protocolo SUS en [`usabilidad-sus/`](usabilidad-sus/protocolo-sus.md) | ✘ sin ejecutar |

## 4. Qué falta para que sea «la matriz final»
1. **Validación con usuarios y expertos:** hoy la lista sale del sistema, no de ellos (la propia lista de rutas se declara «propuesta»).
2. **Plantilla de la universidad** (pregunta 12) y respuesta a las preguntas 6, 16 y 17.
3. **Verificación jurídica** de las citas y del alcance del Decreto 766 de 2026.
4. **Prueba por requisito:** conté archivos de prueba, pero no verifiqué que cada prueba afirme lo que su nombre sugiere (límite heredado de la Etapa 3).
5. Una columna **«Validado por / fecha»** que se agrega cuando se haga lo anterior.

## Autoevaluación
1. ¿Por qué los RN-01 a RN-11 están en ◐ y no en ✔?
2. ¿Qué diferencia hay entre «el sistema pregunta por un requisito» y «el sistema lo hace cumplir»?
3. ¿Qué requisito funcional depende de la respuesta del director a la pregunta 6?
