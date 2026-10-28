# Matriz de casos de prueba y registro de incidencias (Fase 4)

Responde a la Fase 4 de la propuesta: «matriz de casos de prueba con datos simulados… registro de incidencias».
Contiene **391 casos automáticos** del backend, **22 pasos** del recorrido en navegador y el **registro de incidencias** encontradas durante el trabajo.
También está en Excel/CSV: [`matriz-casos-de-prueba.csv`](matriz-casos-de-prueba.csv) (se abre con Excel; columnas ID, archivo, requisito, área, grupo, caso, resultado, ms).

## Cómo se obtuvo (para que pueda repetirla)
1. Corrí `npx vitest run --reporter=json` en `farmix-app` sobre la rama `modelo-datos`, contra la base desechable `farmix_test` (local; no producción).
2. `python3 scripts/generar-matriz.py informe.json salida/` convierte ese informe en esta matriz. Nada se escribió a mano: cada caso, grupo y resultado sale del informe de Vitest.
- **Resultado de esa corrida: 391 de 391 aprobados, 0 fallos.** [H]
- Todas las pruebas usan **datos simulados**, creados por las propias pruebas; no hay datos de pacientes ni de personas reales.

## Cómo leerla (y sus límites)
- **«Caso (qué se comprueba)»** es el título que escribió el programador de la prueba; el resultado esperado está en ese texto. No revisé una por una que el código de cada prueba afirme exactamente lo que dice su título.
- **La columna «Requisito» (R1…O3…) la asigné yo por el nombre del archivo** (por ejemplo, `waste.test.ts` → R1). Es una inferencia de trazabilidad, no una etiqueta que traiga la prueba. Los códigos R/O/X son los de `../08-trabajo-de-grado/etapa-3-matriz-de-trazabilidad.md`.
- Estos casos **demuestran que el software hace lo que sus pruebas esperan**; no equivalen a una evaluación con usuarios (Fase 5) ni a validación en condiciones reales, como dice la propuesta.
- La rama `pwa-instalable` agrega `pwa.test.ts` (8 casos más, 399 en total); aquí no están porque esa rama no se ha unido.

## Recorrido en navegador (22 pasos, Playwright)
Archivo: `farmix-app/frontend/e2e/ui-smoke.cjs`. Se ejecuta con `bash scripts/prueba-navegador.sh`. **Último resultado verificado: 22 de 22** (corrida hecha al construir esta guía; **no la repetí hoy**).

| Paso | Qué comprueba | Requisito |
|---|---|---|
| 1 | Login: rechaza credenciales inválidas | R6 |
| 2 | Login y lista de droguerías (demostración marcada como simulada) | R6, R7 |
| 3 | Inicio: ciclo Medir · Analizar · Mejorar con alertas | R2 |
| 4 | Vencimientos: tres cifras y filtros con conteo | R2, R3 |
| 5 | Vencimientos: crea producto vencido y lo gestiona | R2 |
| 6 | Vencimientos: un duplicado muestra el error de la API | R2 |
| 7 | Residuos: medicamento vencido ≠ riesgo biológico; registra y grafica | R1 |
| 8 | Residuos: las unidades no se suman a kg | R1 |
| 9 | Segregación: bien segregados no supera revisados | R5 |
| 10 | Personal: trabajador y capacitación con soporte → «Capacitado»; sin soporte → «Sin soporte» | Propuesta F2 |
| 11 | Diagnóstico: responde obligatorios y madurez, guarda y compara con la línea base | O1 |
| 12 | Diagnóstico: una mejora nace de un incumplimiento y se mueve en el tablero | O1b |
| 13 | Mejoras: nueva mejora cerrada exige fecha | O1b |
| 14 | Reporte: documento con las seis secciones y marca de datos simulados | R4 |
| 15 | Normativa: marco legal con fuentes oficiales y aviso | O1 |
| 16 | Importar: vista previa sin guardar y confirmación | X2 |
| 17 | Migrar: vista previa, confirmar y revertir | X3 |
| 18 | Miembros y configuración | R7, R8 |
| 19 | Cuenta: privacidad, descarga y cierre de sesión | R12 |
| 20 | Ruta protegida sin sesión redirige al ingreso | R9 |
| 21 | Registro exige aceptar el aviso; la droguería nueva trae los 4 temas base | R6, R12 |
| 22 | Móvil: el menú lateral se abre | Usabilidad básica |

## Registro de incidencias (encontradas durante este trabajo)
| ID | Qué pasó | Dónde | Estado | Evidencia |
|---|---|---|---|---|
| INC-01 | Una prueba de humo fallaba entre las 7 p. m. y la medianoche: calculaba «hoy» en UTC y el servidor en hora de Colombia | `tests/smoke.test.ts` | **Corregida** en la rama `pwa-instalable` (no unida) | Corrección con zona `America/Bogota` |
| INC-02 | El backend **no lee el archivo `.env`**, aunque el README indica copiarlo | `farmix-app` (arranque) | **Abierta** (hallazgo E1 del plan) | Revisión del código; los scripts de la guía lo cargan por su cuenta |
| INC-03 | En producción la aplicación **se niega a arrancar** sin `COOKIE_SECURE=true` | `src/config/env.ts` | Comportamiento correcto (protección); mis scripts de despliegue local estaban mal y se corrigieron | `produccion-local.sh` |
| INC-04 | Aviso `MaxListenersExceededWarning` durante la corrida (11 *listeners* en un `Response`) | Pruebas de integración | **Abierta, sin investigar**; no hace fallar ninguna prueba | Salida de la corrida del día |
| INC-05 | `docker-local.sh` no pudo verificarse: este entorno no tiene Docker | Guía | **Abierta** | — |

Las incidencias de diseño (48 hallazgos de la Etapa 2) están en `../04-base-de-datos/analisis/hallazgos-consolidados.md`; son distintas de estas porque no son fallos de ejecución.

# Matriz de los 391 casos automáticos

## Resumen por archivo

| Archivo | Requisito | Casos | Aprobados |
|---|---|---|---|
| `actions.test.ts` | O1b | 17 | 17 |
| `auth.test.ts` | R6 | 26 | 26 |
| `config.test.ts` | Infra | 6 | 6 |
| `cors.test.ts` | Infra | 3 | 3 |
| `diagnoses.test.ts` | O1 | 30 | 30 |
| `drugstores.test.ts` | R7/R8/R9 | 30 | 30 |
| `expirations.test.ts` | R2/R3 | 34 | 34 |
| `files.test.ts` | Propuesta F2 | 18 | 18 |
| `health.test.ts` | Infra | 10 | 10 |
| `imports.test.ts` | X2 | 14 | 14 |
| `local-migrations.test.ts` | X3 | 18 | 18 |
| `migrations.test.ts` | O3 | 3 | 3 |
| `openapi.test.ts` | Infra | 4 | 4 |
| `protected-routes.test.ts` | R9 | 66 | 66 |
| `reports.test.ts` | R4 | 12 | 12 |
| `segregation.test.ts` | R5 | 19 | 19 |
| `smoke.test.ts` | R1–R6 | 8 | 8 |
| `staff.test.ts` | Propuesta F2 | 26 | 26 |
| `static.test.ts` | Infra | 9 | 9 |
| `users-personal-data.test.ts` | R6/R12 | 8 | 8 |
| `waste.test.ts` | R1 | 30 | 30 |
| **Total** | | **391** | **391** |

## Casos

| ID | Archivo | Req. | Grupo | Caso | Resultado |
|---|---|---|---|---|---|
| CP-001 | `actions` | O1b | crear y consultar | crea en estado pendiente por defecto | Aprobó |
| CP-002 | `actions` | O1b | crear y consultar | valida la entrada: hallazgo corto | Aprobó |
| CP-003 | `actions` | O1b | crear y consultar | valida la entrada: responsable vacío | Aprobó |
| CP-004 | `actions` | O1b | crear y consultar | valida la entrada: estado desconocido | Aprobó |
| CP-005 | `actions` | O1b | crear y consultar | valida la entrada: fecha inválida | Aprobó |
| CP-006 | `actions` | O1b | acción, responsable y fecha por definir | permite registrar solo el problema detectado y completar el resto después | Aprobó |
| CP-007 | `actions` | O1b | acción, responsable y fecha por definir | se puede borrar un dato opcional (null) al editar | Aprobó |
| CP-008 | `actions` | O1b | estados y fecha de cierre | una acción cerrada exige fecha de cierre | Aprobó |
| CP-009 | `actions` | O1b | estados y fecha de cierre | la fecha de cierre solo se admite en acciones cerradas y no puede ser futura | Aprobó |
| CP-010 | `actions` | O1b | estados y fecha de cierre | transiciones: pendiente → en curso → cerrada → reabierta | Aprobó |
| CP-011 | `actions` | O1b | estados y fecha de cierre | la base de datos impone la regla | Aprobó |
| CP-012 | `actions` | O1b | estados y fecha de cierre | no usa una columna llamada status | Aprobó |
| CP-013 | `actions` | O1b | vencimiento de la acción y listado | marca como atrasada solo si no está cerrada y pasó la fecha límite | Aprobó |
| CP-014 | `actions` | O1b | vencimiento de la acción y listado | filtra por estado y atraso, ordena por fecha límite y pagina | Aprobó |
| CP-015 | `actions` | O1b | borrado, permisos y auditoría | el operador crea y edita; borrar exige administrador; borrado lógico auditado | Aprobó |
| CP-016 | `actions` | O1b | aislamiento entre droguerías | una cuenta ajena recibe 404 en todas las rutas del módulo | Aprobó |
| CP-017 | `actions` | O1b | aislamiento entre droguerías | un miembro de B no alcanza acciones de A | Aprobó |
| CP-018 | `auth` | R6 | registro | crea la cuenta, abre sesión y no expone el hash | Aprobó |
| CP-019 | `auth` | R6 | registro | guarda la contraseña con Argon2id | Aprobó |
| CP-020 | `auth` | R6 | registro | la cookie es httpOnly y SameSite=Lax | Aprobó |
| CP-021 | `auth` | R6 | registro | la cookie es secure cuando COOKIE_SECURE=true | Aprobó |
| CP-022 | `auth` | R6 | registro | rechaza correo duplicado sin importar mayúsculas | Aprobó |
| CP-023 | `auth` | R6 | registro | valida la entrada: contraseña corta | Aprobó |
| CP-024 | `auth` | R6 | registro | valida la entrada: correo inválido | Aprobó |
| CP-025 | `auth` | R6 | registro | valida la entrada: sin aceptar aviso | Aprobó |
| CP-026 | `auth` | R6 | registro | valida la entrada: nombre vacío | Aprobó |
| CP-027 | `auth` | R6 | ingreso y bloqueo | ingresa con credenciales correctas | Aprobó |
| CP-028 | `auth` | R6 | ingreso y bloqueo | da el mismo error para clave errónea y correo inexistente | Aprobó |
| CP-029 | `auth` | R6 | ingreso y bloqueo | bloquea la cuenta tras 5 intentos fallidos, incluso con la clave correcta | Aprobó |
| CP-030 | `auth` | R6 | ingreso y bloqueo | permite ingresar de nuevo cuando vence el bloqueo | Aprobó |
| CP-031 | `auth` | R6 | ingreso y bloqueo | limita las solicitudes de autenticación por minuto | Aprobó |
| CP-032 | `auth` | R6 | sesión | devuelve la sesión actual y la cierra en logout | Aprobó |
| CP-033 | `auth` | R6 | sesión | expira por inactividad | Aprobó |
| CP-034 | `auth` | R6 | sesión | expira de forma absoluta aunque haya actividad | Aprobó |
| CP-035 | `auth` | R6 | sesión | rechaza un token falso o manipulado | Aprobó |
| CP-036 | `auth` | R6 | sesión | almacena solo el hash del token de sesión | Aprobó |
| CP-037 | `auth` | R6 | contraseñas | cambia la contraseña y cierra las demás sesiones | Aprobó |
| CP-038 | `auth` | R6 | contraseñas | recuperación: respuesta idéntica exista o no la cuenta | Aprobó |
| CP-039 | `auth` | R6 | contraseñas | recuperación: restablece, desbloquea, cierra sesiones y el código es de un solo uso | Aprobó |
| CP-040 | `auth` | R6 | contraseñas | recuperación: rechaza código vencido o inventado | Aprobó |
| CP-041 | `auth` | R6 | protecciones transversales | rechaza peticiones que cambian datos con Origin ajeno | Aprobó |
| CP-042 | `auth` | R6 | protecciones transversales | acepta el Origin configurado | Aprobó |
| CP-043 | `auth` | R6 | auditoría | registra ingresos exitosos y fallidos sin contraseñas | Aprobó |
| CP-044 | `config` | Infra | configuración | aplica valores por defecto | Aprobó |
| CP-045 | `config` | Infra | configuración | falla si falta DATABASE_URL | Aprobó |
| CP-046 | `config` | Infra | configuración | falla si falta APP_ORIGIN | Aprobó |
| CP-047 | `config` | Infra | configuración | rechaza valores inválidos | Aprobó |
| CP-048 | `config` | Infra | configuración | usa RENDER_EXTERNAL_URL solo si APP_ORIGIN no está definido | Aprobó |
| CP-049 | `config` | Infra | configuración | exige COOKIE_SECURE=true en producción | Aprobó |
| CP-050 | `cors` | Infra | CORS restringido a APP_ORIGIN | permite el origen configurado con credenciales | Aprobó |
| CP-051 | `cors` | Infra | CORS restringido a APP_ORIGIN | no concede acceso a otros orígenes | Aprobó |
| CP-052 | `cors` | Infra | CORS restringido a APP_ORIGIN | expone X-Request-Id al navegador | Aprobó |
| CP-053 | `diagnoses` | O1 | instrumento versión 2 (obligatorios + madurez) | expone 11 requisitos obligatorios y 17 preguntas de madurez en 4 áreas | Aprobó |
| CP-054 | `diagnoses` | O1 | instrumento versión 2 (obligatorios + madurez) | cada requisito obligatorio trae su fundamento normativo; el PGIRASA es el primero | Aprobó |
| CP-055 | `diagnoses` | O1 | instrumento versión 2 (obligatorios + madurez) | se presenta como autoevaluación orientativa, sin afirmar cumplimiento | Aprobó |
| CP-056 | `diagnoses` | O1 | instrumento versión 2 (obligatorios + madurez) | solo puede haber una versión vigente (índice único) | Aprobó |
| CP-057 | `diagnoses` | O1 | requisitos obligatorios: no se compensan con promedios | cuenta cumple, no cumple, no aplica y sin responder, y lista los incumplimientos con su norma | Aprobó |
| CP-058 | `diagnoses` | O1 | requisitos obligatorios: no se compensan con promedios | una madurez perfecta no oculta un incumplimiento obligatorio | Aprobó |
| CP-059 | `diagnoses` | O1 | requisitos obligatorios: no se compensan con promedios | las respuestas de obligatorios no alteran los puntajes de madurez | Aprobó |
| CP-060 | `diagnoses` | O1 | madurez por área (1 a 5): máx(1, redondeo(cumple/aplicables × 4) + 1) | 4 de 4 cumplen → NaN | Aprobó |
| CP-061 | `diagnoses` | O1 | madurez por área (1 a 5): máx(1, redondeo(cumple/aplicables × 4) + 1) | 3 de 4 cumplen → NaN | Aprobó |
| CP-062 | `diagnoses` | O1 | madurez por área (1 a 5): máx(1, redondeo(cumple/aplicables × 4) + 1) | 2 de 4 cumplen → NaN | Aprobó |
| CP-063 | `diagnoses` | O1 | madurez por área (1 a 5): máx(1, redondeo(cumple/aplicables × 4) + 1) | 1 de 4 cumple → NaN | Aprobó |
| CP-064 | `diagnoses` | O1 | madurez por área (1 a 5): máx(1, redondeo(cumple/aplicables × 4) + 1) | ninguno cumple (mínimo 1) → NaN | Aprobó |
| CP-065 | `diagnoses` | O1 | madurez por área (1 a 5): máx(1, redondeo(cumple/aplicables × 4) + 1) | «no aplica» no cuenta: 1 de 1 → NaN | Aprobó |
| CP-066 | `diagnoses` | O1 | madurez por área (1 a 5): máx(1, redondeo(cumple/aplicables × 4) + 1) | un área con todo «no aplica» o sin respuestas queda sin puntaje (no se inventa) | Aprobó |
| CP-067 | `diagnoses` | O1 | madurez por área (1 a 5): máx(1, redondeo(cumple/aplicables × 4) + 1) | el promedio global usa solo las áreas con puntaje y se redondea a un decimal | Aprobó |
| CP-068 | `diagnoses` | O1 | validación y edición | rechaza: respuesta desconocida | Aprobó |
| CP-069 | `diagnoses` | O1 | validación y edición | rechaza: puntaje numérico en el instrumento v2 | Aprobó |
| CP-070 | `diagnoses` | O1 | validación y edición | rechaza: response y score juntos | Aprobó |
| CP-071 | `diagnoses` | O1 | validación y edición | rechaza: sin response ni score | Aprobó |
| CP-072 | `diagnoses` | O1 | validación y edición | rechaza ítems repetidos, ítems inexistentes y fechas futuras | Aprobó |
| CP-073 | `diagnoses` | O1 | validación y edición | un fallo en las respuestas no deja un diagnóstico a medias | Aprobó |
| CP-074 | `diagnoses` | O1 | validación y edición | al editar: cambia, agrega y borra respuestas (null) y recalcula | Aprobó |
| CP-075 | `diagnoses` | O1 | validación y edición | la base de datos exige exactamente un valor por respuesta y áreas válidas | Aprobó |
| CP-076 | `diagnoses` | O1 | línea base, seguimiento y lectura de diagnósticos anteriores | el listado resume obligatorios y madurez de cada diagnóstico | Aprobó |
| CP-077 | `diagnoses` | O1 | línea base, seguimiento y lectura de diagnósticos anteriores | un diagnóstico conserva la versión del instrumento con que se hizo | Aprobó |
| CP-078 | `diagnoses` | O1 | línea base, seguimiento y lectura de diagnósticos anteriores | los diagnósticos hechos con el instrumento anterior (v1, puntaje 1–5) siguen siendo legibles | Aprobó |
| CP-079 | `diagnoses` | O1 | línea base, seguimiento y lectura de diagnósticos anteriores | el operador puede diagnosticar y queda auditado con created_by | Aprobó |
| CP-080 | `diagnoses` | O1 | mejoras que nacen de un incumplimiento | se puede crear una mejora ligada al requisito incumplido, con acción, responsable y fecha por definir | Aprobó |
| CP-081 | `diagnoses` | O1 | aislamiento entre droguerías | una cuenta ajena recibe 404 en todas las rutas del módulo | Aprobó |
| CP-082 | `diagnoses` | O1 | aislamiento entre droguerías | un miembro de B no alcanza diagnósticos de A | Aprobó |
| CP-083 | `drugstores` | R7/R8/R9 | CRUD de droguerías | crea con valores por defecto y convierte al creador en propietario | Aprobó |
| CP-084 | `drugstores` | R7/R8/R9 | CRUD de droguerías | valida la entrada: nombre corto | Aprobó |
| CP-085 | `drugstores` | R7/R8/R9 | CRUD de droguerías | valida la entrada: anticipación 0 | Aprobó |
| CP-086 | `drugstores` | R7/R8/R9 | CRUD de droguerías | valida la entrada: anticipación 400 | Aprobó |
| CP-087 | `drugstores` | R7/R8/R9 | CRUD de droguerías | valida la entrada: anticipación decimal | Aprobó |
| CP-088 | `drugstores` | R7/R8/R9 | CRUD de droguerías | lista solo las droguerías propias, con su rol | Aprobó |
| CP-089 | `drugstores` | R7/R8/R9 | CRUD de droguerías | edita y rechaza un cuerpo vacío | Aprobó |
| CP-090 | `drugstores` | R7/R8/R9 | CRUD de droguerías | borra de forma lógica: desaparece para todos pero la fila se conserva | Aprobó |
| CP-091 | `drugstores` | R7/R8/R9 | CRUD de droguerías | rellena los campos de auditoría y registra la acción | Aprobó |
| CP-092 | `drugstores` | R7/R8/R9 | número de empleados y datos de demostración | guarda el número de empleados y la bandera de demostración (simulada) | Aprobó |
| CP-093 | `drugstores` | R7/R8/R9 | aislamiento: una cuenta ajena recibe 404 en todas las rutas | GET | Aprobó |
| CP-094 | `drugstores` | R7/R8/R9 | aislamiento: una cuenta ajena recibe 404 en todas las rutas | PATCH | Aprobó |
| CP-095 | `drugstores` | R7/R8/R9 | aislamiento: una cuenta ajena recibe 404 en todas las rutas | DELETE | Aprobó |
| CP-096 | `drugstores` | R7/R8/R9 | aislamiento: una cuenta ajena recibe 404 en todas las rutas | GET | Aprobó |
| CP-097 | `drugstores` | R7/R8/R9 | aislamiento: una cuenta ajena recibe 404 en todas las rutas | POST | Aprobó |
| CP-098 | `drugstores` | R7/R8/R9 | aislamiento: una cuenta ajena recibe 404 en todas las rutas | PATCH | Aprobó |
| CP-099 | `drugstores` | R7/R8/R9 | aislamiento: una cuenta ajena recibe 404 en todas las rutas | DELETE | Aprobó |
| CP-100 | `drugstores` | R7/R8/R9 | aislamiento: una cuenta ajena recibe 404 en todas las rutas | el id inexistente o mal formado también da 404 | Aprobó |
| CP-101 | `drugstores` | R7/R8/R9 | aislamiento: una cuenta ajena recibe 404 en todas las rutas | la droguería ajena no se modifica | Aprobó |
| CP-102 | `drugstores` | R7/R8/R9 | aislamiento: una cuenta ajena recibe 404 en todas las rutas | un miembro retirado pierde el acceso | Aprobó |
| CP-103 | `drugstores` | R7/R8/R9 | matriz de roles | operador: solo lectura (403 al editar, borrar o gestionar miembros) | Aprobó |
| CP-104 | `drugstores` | R7/R8/R9 | matriz de roles | administrador: edita y gestiona operadores, pero no borra ni toca administradores | Aprobó |
| CP-105 | `drugstores` | R7/R8/R9 | matriz de roles | propietario: gestiona administradores y cambia roles | Aprobó |
| CP-106 | `drugstores` | R7/R8/R9 | matriz de roles | el propietario no puede ser retirado ni degradado (siempre queda uno) | Aprobó |
| CP-107 | `drugstores` | R7/R8/R9 | matriz de roles | un miembro puede retirarse a sí mismo | Aprobó |
| CP-108 | `drugstores` | R7/R8/R9 | matriz de roles | la base de datos impide dos propietarios activos | Aprobó |
| CP-109 | `drugstores` | R7/R8/R9 | miembros | agrega por correo, lista y rechaza duplicados o cuentas inexistentes | Aprobó |
| CP-110 | `drugstores` | R7/R8/R9 | miembros | no se puede asignar el rol propietario por la API | Aprobó |
| CP-111 | `drugstores` | R7/R8/R9 | miembros | se puede volver a agregar a un miembro retirado | Aprobó |
| CP-112 | `drugstores` | R7/R8/R9 | eliminación de la cuenta del propietario | archiva (borrado lógico) sus droguerías al depurar la cuenta | Aprobó |
| CP-113 | `expirations` | R2/R3 | crear y consultar | guarda los campos y devuelve los calculados | Aprobó |
| CP-114 | `expirations` | R2/R3 | crear y consultar | no guarda la clasificación en la base de datos | Aprobó |
| CP-115 | `expirations` | R2/R3 | crear y consultar | valida la entrada: sin producto | Aprobó |
| CP-116 | `expirations` | R2/R3 | crear y consultar | valida la entrada: sin lote | Aprobó |
| CP-117 | `expirations` | R2/R3 | crear y consultar | valida la entrada: fecha inválida | Aprobó |
| CP-118 | `expirations` | R2/R3 | crear y consultar | valida la entrada: fecha fuera de rango | Aprobó |
| CP-119 | `expirations` | R2/R3 | crear y consultar | valida la entrada: cantidad cero | Aprobó |
| CP-120 | `expirations` | R2/R3 | crear y consultar | valida la entrada: cantidad decimal | Aprobó |
| CP-121 | `expirations` | R2/R3 | crear y consultar | valida la entrada: costo negativo | Aprobó |
| CP-122 | `expirations` | R2/R3 | crear y consultar | valida la entrada: costo con 3 decimales | Aprobó |
| CP-123 | `expirations` | R2/R3 | crear y consultar | valida la entrada: destino desconocido | Aprobó |
| CP-124 | `expirations` | R2/R3 | crear y consultar | valida la entrada: registro demasiado largo | Aprobó |
| CP-125 | `expirations` | R2/R3 | crear y consultar | rechaza el mismo producto y lote (sin importar mayúsculas), pero permite reusarlo tras borrarlo | Aprobó |
| CP-126 | `expirations` | R2/R3 | crear y consultar | el mismo producto y lote puede existir en otra droguería | Aprobó |
| CP-127 | `expirations` | R2/R3 | clasificación (anticipación por defecto: 60 días) | vence en -1 días → vencido | Aprobó |
| CP-128 | `expirations` | R2/R3 | clasificación (anticipación por defecto: 60 días) | vence en 0 días → proximo_a_vencer | Aprobó |
| CP-129 | `expirations` | R2/R3 | clasificación (anticipación por defecto: 60 días) | vence en 59 días → proximo_a_vencer | Aprobó |
| CP-130 | `expirations` | R2/R3 | clasificación (anticipación por defecto: 60 días) | vence en 60 días → proximo_a_vencer | Aprobó |
| CP-131 | `expirations` | R2/R3 | clasificación (anticipación por defecto: 60 días) | vence en 61 días → vigente | Aprobó |
| CP-132 | `expirations` | R2/R3 | clasificación (anticipación por defecto: 60 días) | un producto gestionado se clasifica como gestionado aunque esté vencido | Aprobó |
| CP-133 | `expirations` | R2/R3 | clasificación (anticipación por defecto: 60 días) | respeta la anticipación definida por la droguería | Aprobó |
| CP-134 | `expirations` | R2/R3 | edición, destino y borrado | al asignar destino se registra la gestión y al volver a pendiente se limpia | Aprobó |
| CP-135 | `expirations` | R2/R3 | edición, destino y borrado | conserva la fecha de gestión al cambiar entre destinos gestionados | Aprobó |
| CP-136 | `expirations` | R2/R3 | edición, destino y borrado | rechaza cuerpo vacío y datos inválidos al editar | Aprobó |
| CP-137 | `expirations` | R2/R3 | edición, destino y borrado | el operador crea y edita, pero solo administrador o propietario borra | Aprobó |
| CP-138 | `expirations` | R2/R3 | edición, destino y borrado | llena created_by/updated_by y audita creación, edición y borrado | Aprobó |
| CP-139 | `expirations` | R2/R3 | listado, alertas y pérdidas | filtra por estado y pagina con total | Aprobó |
| CP-140 | `expirations` | R2/R3 | listado, alertas y pérdidas | las alertas incluyen vencidos y próximos, ordenados por fecha | Aprobó |
| CP-141 | `expirations` | R2/R3 | listado, alertas y pérdidas | calcula tres cifras: pérdida confirmada (destrucción o avería), en riesgo (sin gestionar) y devuelto a proveedor | Aprobó |
| CP-142 | `expirations` | R2/R3 | listado, alertas y pérdidas | sin productos devuelve ceros | Aprobó |
| CP-143 | `expirations` | R2/R3 | aislamiento entre droguerías | una cuenta ajena recibe 404 en todas las rutas del módulo | Aprobó |
| CP-144 | `expirations` | R2/R3 | aislamiento entre droguerías | un miembro de B no alcanza productos de A usando su propia droguería | Aprobó |
| CP-145 | `expirations` | R2/R3 | aislamiento entre droguerías | listados, alertas y pérdidas de B no incluyen datos de A | Aprobó |
| CP-146 | `expirations` | R2/R3 | restricciones de la base de datos | rechaza cantidad 0 y destino gestionado sin fecha de gestión | Aprobó |
| CP-147 | `files` | Propuesta F2 | subida | acepta PDF verificando los bytes iniciales | Aprobó |
| CP-148 | `files` | Propuesta F2 | subida | acepta PNG verificando los bytes iniciales | Aprobó |
| CP-149 | `files` | Propuesta F2 | subida | acepta JPEG verificando los bytes iniciales | Aprobó |
| CP-150 | `files` | Propuesta F2 | subida | rechaza un archivo cuyo contenido no coincide con su extensión o tipo declarado | Aprobó |
| CP-151 | `files` | Propuesta F2 | subida | rechaza archivos vacíos y otros campos | Aprobó |
| CP-152 | `files` | Propuesta F2 | subida | rechaza lo que supera 5 MB con 413 | Aprobó |
| CP-153 | `files` | Propuesta F2 | subida | exige multipart | Aprobó |
| CP-154 | `files` | Propuesta F2 | subida | el nombre guardado es aleatorio y el original se sanea (sin rutas) | Aprobó |
| CP-155 | `files` | Propuesta F2 | subida | el contenido se guarda en disco, fuera de la base de datos | Aprobó |
| CP-156 | `files` | Propuesta F2 | subida | detectType reconoce solo los tres formatos | Aprobó |
| CP-157 | `files` | Propuesta F2 | descarga y borrado | un miembro descarga el mismo contenido con cabeceras seguras | Aprobó |
| CP-158 | `files` | Propuesta F2 | descarga y borrado | descargas y subidas quedan auditadas | Aprobó |
| CP-159 | `files` | Propuesta F2 | descarga y borrado | borrar exige administrador; luego la descarga da 404 | Aprobó |
| CP-160 | `files` | Propuesta F2 | descarga y borrado | la base de datos rechaza nombres de almacenamiento inseguros | Aprobó |
| CP-161 | `files` | Propuesta F2 | soporte en capacitaciones | enlaza un soporte de la misma droguería y lo desenlaza al borrar el archivo | Aprobó |
| CP-162 | `files` | Propuesta F2 | soporte en capacitaciones | no permite enlazar un soporte de otra droguería | Aprobó |
| CP-163 | `files` | Propuesta F2 | aislamiento entre droguerías | una cuenta ajena recibe 404 en todas las rutas del módulo | Aprobó |
| CP-164 | `files` | Propuesta F2 | aislamiento entre droguerías | una cuenta ajena no sube ni descarga; un miembro de B no alcanza archivos de A | Aprobó |
| CP-165 | `health` | Infra | GET /api/v1/health | responde 200 con la base de datos disponible | Aprobó |
| CP-166 | `health` | Infra | GET /api/v1/health | responde 503 si la base de datos no está disponible | Aprobó |
| CP-167 | `health` | Infra | X-Request-Id | genera uno si no viene | Aprobó |
| CP-168 | `health` | Infra | X-Request-Id | reutiliza uno entrante seguro | Aprobó |
| CP-169 | `health` | Infra | X-Request-Id | descarta uno entrante inseguro | Aprobó |
| CP-170 | `health` | Infra | X-Request-Id | se incluye también en errores | Aprobó |
| CP-171 | `health` | Infra | formato de error | ruta inexistente devuelve 404 con formato único | Aprobó |
| CP-172 | `health` | Infra | formato de error | JSON inválido devuelve 400 sin detalles internos | Aprobó |
| CP-173 | `health` | Infra | cabeceras de seguridad | incluye helmet y CSP restrictiva | Aprobó |
| CP-174 | `health` | Infra | CSP | no permite scripts ni estilos en línea | Aprobó |
| CP-175 | `imports` | X2 | vista previa (no escribe nada) | valida fila por fila y deja las tablas de negocio intactas | Aprobó |
| CP-176 | `imports` | X2 | vista previa (no escribe nada) | acepta CSV con punto y coma, encabezados con tildes y decimales con coma | Aprobó |
| CP-177 | `imports` | X2 | vista previa (no escribe nada) | lee archivos de Excel (.xlsx), incluidas celdas de fecha | Aprobó |
| CP-178 | `imports` | X2 | vista previa (no escribe nada) | detecta duplicados dentro del archivo y contra lo ya registrado | Aprobó |
| CP-179 | `imports` | X2 | vista previa (no escribe nada) | rechaza archivos sin columnas obligatorias, vacíos, de otro formato o demasiado grandes | Aprobó |
| CP-180 | `imports` | X2 | vista previa (no escribe nada) | aplica las reglas de cada tipo (residuos y segregación) | Aprobó |
| CP-181 | `imports` | X2 | confirmación | escribe solo las filas válidas, con created_by y auditoría | Aprobó |
| CP-182 | `imports` | X2 | confirmación | no se puede confirmar dos veces | Aprobó |
| CP-183 | `imports` | X2 | confirmación | la vista previa caduca a las 24 horas | Aprobó |
| CP-184 | `imports` | X2 | confirmación | vuelve a comprobar duplicados al confirmar | Aprobó |
| CP-185 | `imports` | X2 | confirmación | confirma residuos y segregación | Aprobó |
| CP-186 | `imports` | X2 | confirmación | un importe repetido del mismo archivo no duplica datos | Aprobó |
| CP-187 | `imports` | X2 | aislamiento entre droguerías | una cuenta ajena recibe 404 en todas las rutas del módulo | Aprobó |
| CP-188 | `imports` | X2 | aislamiento entre droguerías | un miembro de B no ve ni confirma importaciones de A; el ajeno no puede subir | Aprobó |
| CP-189 | `local-migrations` | X3 | creación (vista previa) | valida y resume sin escribir en las tablas de negocio | Aprobó |
| CP-190 | `local-migrations` | X3 | creación (vista previa) | valida la entrada: sin datos | Aprobó |
| CP-191 | `local-migrations` | X3 | creación (vista previa) | valida la entrada: listas vacías | Aprobó |
| CP-192 | `local-migrations` | X3 | creación (vista previa) | valida la entrada: tipo desconocido | Aprobó |
| CP-193 | `local-migrations` | X3 | creación (vista previa) | valida la entrada: droguería inválida | Aprobó |
| CP-194 | `local-migrations` | X3 | creación (vista previa) | el mismo usuario y los mismos datos no se pueden enviar dos veces | Aprobó |
| CP-195 | `local-migrations` | X3 | creación (vista previa) | la bandera de demostración distingue envíos con el mismo contenido | Aprobó |
| CP-196 | `local-migrations` | X3 | creación (vista previa) | el mismo contenido puede enviarlo otro usuario a su droguería | Aprobó |
| CP-197 | `local-migrations` | X3 | confirmar y revertir | confirma: registra los datos; confirmar de nuevo no duplica | Aprobó |
| CP-198 | `local-migrations` | X3 | confirmar y revertir | revierte solo lo que la migración creó (borrado lógico) | Aprobó |
| CP-199 | `local-migrations` | X3 | confirmar y revertir | no se puede revertir antes de confirmar | Aprobó |
| CP-200 | `local-migrations` | X3 | confirmar y revertir | tras revertir, los mismos datos se pueden enviar y confirmar otra vez sin duplicar | Aprobó |
| CP-201 | `local-migrations` | X3 | confirmar y revertir | no duplica datos que ya existían al confirmar | Aprobó |
| CP-202 | `local-migrations` | X3 | confirmar y revertir | la base de datos mantiene la coherencia de fases | Aprobó |
| CP-203 | `local-migrations` | X3 | confirmar y revertir | queda auditado | Aprobó |
| CP-204 | `local-migrations` | X3 | aislamiento | una cuenta ajena no migra a una droguería que no es suya | Aprobó |
| CP-205 | `local-migrations` | X3 | aislamiento | otro usuario no puede confirmar ni revertir una migración ajena | Aprobó |
| CP-206 | `local-migrations` | X3 | aislamiento | quien pierde su membresía ya no puede confirmar | Aprobó |
| CP-207 | `migrations` | O3 | migraciones | se aplican en orden sobre una base vacía | Aprobó |
| CP-208 | `migrations` | O3 | migraciones | es idempotente | Aprobó |
| CP-209 | `migrations` | O3 | migraciones | detiene el proceso si una migración aplicada fue modificada | Aprobó |
| CP-210 | `openapi` | Infra | inventario de rutas | expone exactamente 71 rutas (70 del inventario más /health) bajo /api/v1 | Aprobó |
| CP-211 | `openapi` | Infra | inventario de rutas | no hay rutas duplicadas | Aprobó |
| CP-212 | `openapi` | Infra | OpenAPI | no se expone si EXPOSE_DOCS=false | Aprobó |
| CP-213 | `openapi` | Infra | OpenAPI | se expone con EXPOSE_DOCS=true y describe todas las rutas | Aprobó |
| CP-214 | `protected-routes` | R9 | rutas protegidas sin sesión | POST /auth/logout responde 401 | Aprobó |
| CP-215 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /auth/session responde 401 | Aprobó |
| CP-216 | `protected-routes` | R9 | rutas protegidas sin sesión | POST /auth/change-password responde 401 | Aprobó |
| CP-217 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /users/me responde 401 | Aprobó |
| CP-218 | `protected-routes` | R9 | rutas protegidas sin sesión | PATCH /users/me responde 401 | Aprobó |
| CP-219 | `protected-routes` | R9 | rutas protegidas sin sesión | POST /users/me/privacy-acceptance responde 401 | Aprobó |
| CP-220 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /personal-data/export responde 401 | Aprobó |
| CP-221 | `protected-routes` | R9 | rutas protegidas sin sesión | POST /personal-data/deletion-request responde 401 | Aprobó |
| CP-222 | `protected-routes` | R9 | rutas protegidas sin sesión | DELETE /personal-data/deletion-request responde 401 | Aprobó |
| CP-223 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores responde 401 | Aprobó |
| CP-224 | `protected-routes` | R9 | rutas protegidas sin sesión | POST /drugstores responde 401 | Aprobó |
| CP-225 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-226 | `protected-routes` | R9 | rutas protegidas sin sesión | PATCH /drugstores/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-227 | `protected-routes` | R9 | rutas protegidas sin sesión | DELETE /drugstores/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-228 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/members responde 401 | Aprobó |
| CP-229 | `protected-routes` | R9 | rutas protegidas sin sesión | POST /drugstores/11111111-1111-4111-8111-111111111111/members responde 401 | Aprobó |
| CP-230 | `protected-routes` | R9 | rutas protegidas sin sesión | PATCH /drugstores/11111111-1111-4111-8111-111111111111/members/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-231 | `protected-routes` | R9 | rutas protegidas sin sesión | DELETE /drugstores/11111111-1111-4111-8111-111111111111/members/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-232 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/expirations responde 401 | Aprobó |
| CP-233 | `protected-routes` | R9 | rutas protegidas sin sesión | POST /drugstores/11111111-1111-4111-8111-111111111111/expirations responde 401 | Aprobó |
| CP-234 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/expirations/alerts responde 401 | Aprobó |
| CP-235 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/expirations/losses responde 401 | Aprobó |
| CP-236 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/expirations/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-237 | `protected-routes` | R9 | rutas protegidas sin sesión | PATCH /drugstores/11111111-1111-4111-8111-111111111111/expirations/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-238 | `protected-routes` | R9 | rutas protegidas sin sesión | DELETE /drugstores/11111111-1111-4111-8111-111111111111/expirations/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-239 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/waste-records responde 401 | Aprobó |
| CP-240 | `protected-routes` | R9 | rutas protegidas sin sesión | POST /drugstores/11111111-1111-4111-8111-111111111111/waste-records responde 401 | Aprobó |
| CP-241 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/waste-records/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-242 | `protected-routes` | R9 | rutas protegidas sin sesión | PATCH /drugstores/11111111-1111-4111-8111-111111111111/waste-records/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-243 | `protected-routes` | R9 | rutas protegidas sin sesión | DELETE /drugstores/11111111-1111-4111-8111-111111111111/waste-records/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-244 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/segregation-checks responde 401 | Aprobó |
| CP-245 | `protected-routes` | R9 | rutas protegidas sin sesión | POST /drugstores/11111111-1111-4111-8111-111111111111/segregation-checks responde 401 | Aprobó |
| CP-246 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/segregation-checks/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-247 | `protected-routes` | R9 | rutas protegidas sin sesión | PATCH /drugstores/11111111-1111-4111-8111-111111111111/segregation-checks/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-248 | `protected-routes` | R9 | rutas protegidas sin sesión | DELETE /drugstores/11111111-1111-4111-8111-111111111111/segregation-checks/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-249 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/workers responde 401 | Aprobó |
| CP-250 | `protected-routes` | R9 | rutas protegidas sin sesión | POST /drugstores/11111111-1111-4111-8111-111111111111/workers responde 401 | Aprobó |
| CP-251 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/workers/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-252 | `protected-routes` | R9 | rutas protegidas sin sesión | PATCH /drugstores/11111111-1111-4111-8111-111111111111/workers/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-253 | `protected-routes` | R9 | rutas protegidas sin sesión | DELETE /drugstores/11111111-1111-4111-8111-111111111111/workers/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-254 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/training-topics responde 401 | Aprobó |
| CP-255 | `protected-routes` | R9 | rutas protegidas sin sesión | POST /drugstores/11111111-1111-4111-8111-111111111111/training-topics responde 401 | Aprobó |
| CP-256 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/trainings responde 401 | Aprobó |
| CP-257 | `protected-routes` | R9 | rutas protegidas sin sesión | POST /drugstores/11111111-1111-4111-8111-111111111111/trainings responde 401 | Aprobó |
| CP-258 | `protected-routes` | R9 | rutas protegidas sin sesión | PATCH /drugstores/11111111-1111-4111-8111-111111111111/trainings/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-259 | `protected-routes` | R9 | rutas protegidas sin sesión | DELETE /drugstores/11111111-1111-4111-8111-111111111111/trainings/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-260 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/improvement-actions responde 401 | Aprobó |
| CP-261 | `protected-routes` | R9 | rutas protegidas sin sesión | POST /drugstores/11111111-1111-4111-8111-111111111111/improvement-actions responde 401 | Aprobó |
| CP-262 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/improvement-actions/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-263 | `protected-routes` | R9 | rutas protegidas sin sesión | PATCH /drugstores/11111111-1111-4111-8111-111111111111/improvement-actions/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-264 | `protected-routes` | R9 | rutas protegidas sin sesión | DELETE /drugstores/11111111-1111-4111-8111-111111111111/improvement-actions/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-265 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/diagnoses/instrument/current responde 401 | Aprobó |
| CP-266 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/diagnoses responde 401 | Aprobó |
| CP-267 | `protected-routes` | R9 | rutas protegidas sin sesión | POST /drugstores/11111111-1111-4111-8111-111111111111/diagnoses responde 401 | Aprobó |
| CP-268 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/diagnoses/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-269 | `protected-routes` | R9 | rutas protegidas sin sesión | PATCH /drugstores/11111111-1111-4111-8111-111111111111/diagnoses/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-270 | `protected-routes` | R9 | rutas protegidas sin sesión | POST /drugstores/11111111-1111-4111-8111-111111111111/files responde 401 | Aprobó |
| CP-271 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/files/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-272 | `protected-routes` | R9 | rutas protegidas sin sesión | DELETE /drugstores/11111111-1111-4111-8111-111111111111/files/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-273 | `protected-routes` | R9 | rutas protegidas sin sesión | POST /drugstores/11111111-1111-4111-8111-111111111111/imports/preview?kind=waste responde 401 | Aprobó |
| CP-274 | `protected-routes` | R9 | rutas protegidas sin sesión | POST /drugstores/11111111-1111-4111-8111-111111111111/imports/11111111-1111-4111-8111-111111111111/confirm responde 401 | Aprobó |
| CP-275 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/imports/11111111-1111-4111-8111-111111111111 responde 401 | Aprobó |
| CP-276 | `protected-routes` | R9 | rutas protegidas sin sesión | POST /local-migrations responde 401 | Aprobó |
| CP-277 | `protected-routes` | R9 | rutas protegidas sin sesión | POST /local-migrations/11111111-1111-4111-8111-111111111111/confirm responde 401 | Aprobó |
| CP-278 | `protected-routes` | R9 | rutas protegidas sin sesión | POST /local-migrations/11111111-1111-4111-8111-111111111111/revert responde 401 | Aprobó |
| CP-279 | `protected-routes` | R9 | rutas protegidas sin sesión | GET /drugstores/11111111-1111-4111-8111-111111111111/reports/management responde 401 | Aprobó |
| CP-280 | `reports` | R4 | reporte vacío | devuelve ceros y nulos, sin inventar cifras | Aprobó |
| CP-281 | `reports` | R4 | reporte vacío | el aviso lo presenta como producto mínimo viable en estudio que apoya (sin sustituir) el PGIRASA | Aprobó |
| CP-282 | `reports` | R4 | reporte vacío | una droguería marcada como demostración se declara con datos simulados | Aprobó |
| CP-283 | `reports` | R4 | reporte con datos | consolida todos los módulos con cifras coherentes | Aprobó |
| CP-284 | `reports` | R4 | reporte con datos | personal: cada par trabajador × tema cuenta; sin registro = pendiente; sin soporte aparte | Aprobó |
| CP-285 | `reports` | R4 | reporte con datos | serie mensual de residuos: 6 meses, kg por clasificación; las unidades no se suman | Aprobó |
| CP-286 | `reports` | R4 | reporte con datos | diagnóstico: línea base vs último, con obligatorios y madurez por área | Aprobó |
| CP-287 | `reports` | R4 | reporte con datos | el periodo por defecto son 90 días y se puede cambiar | Aprobó |
| CP-288 | `reports` | R4 | reporte con datos | valida el periodo | Aprobó |
| CP-289 | `reports` | R4 | reporte con datos | el operador puede leerlo; no incluye datos de otra droguería | Aprobó |
| CP-290 | `reports` | R4 | reporte con datos | no cuenta registros borrados | Aprobó |
| CP-291 | `reports` | R4 | aislamiento entre droguerías | una cuenta ajena recibe 404 en todas las rutas del módulo | Aprobó |
| CP-292 | `segregation` | R5 | porcentaje calculado al consultar | bien segregados / revisados × 100 | Aprobó |
| CP-293 | `segregation` | R5 | porcentaje calculado al consultar | percent() redondea a un decimal | Aprobó |
| CP-294 | `segregation` | R5 | porcentaje calculado al consultar | no existe columna de porcentaje en la base de datos | Aprobó |
| CP-295 | `segregation` | R5 | porcentaje calculado al consultar | el porcentaje se recalcula al editar | Aprobó |
| CP-296 | `segregation` | R5 | restricción correct <= reviewed | la API rechaza bien segregados mayores que revisados | Aprobó |
| CP-297 | `segregation` | R5 | restricción correct <= reviewed | al editar se compara con el valor guardado | Aprobó |
| CP-298 | `segregation` | R5 | restricción correct <= reviewed | la base de datos también la impone | Aprobó |
| CP-299 | `segregation` | R5 | validación y ciclo de vida | valida la entrada: cero revisados | Aprobó |
| CP-300 | `segregation` | R5 | validación y ciclo de vida | valida la entrada: revisados decimal | Aprobó |
| CP-301 | `segregation` | R5 | validación y ciclo de vida | valida la entrada: correctos negativos | Aprobó |
| CP-302 | `segregation` | R5 | validación y ciclo de vida | valida la entrada: lugar vacío | Aprobó |
| CP-303 | `segregation` | R5 | validación y ciclo de vida | valida la entrada: fecha inválida | Aprobó |
| CP-304 | `segregation` | R5 | validación y ciclo de vida | valida la entrada: observación larga | Aprobó |
| CP-305 | `segregation` | R5 | validación y ciclo de vida | rechaza fechas futuras | Aprobó |
| CP-306 | `segregation` | R5 | validación y ciclo de vida | borrado lógico solo para administrador o propietario, con auditoría | Aprobó |
| CP-307 | `segregation` | R5 | listado y resumen | filtra por fecha y lugar, y resume solo el conjunto filtrado | Aprobó |
| CP-308 | `segregation` | R5 | listado y resumen | sin datos el porcentaje del resumen es nulo, no un número inventado | Aprobó |
| CP-309 | `segregation` | R5 | aislamiento entre droguerías | una cuenta ajena recibe 404 en todas las rutas del módulo | Aprobó |
| CP-310 | `segregation` | R5 | aislamiento entre droguerías | un miembro de B no alcanza verificaciones de A | Aprobó |
| CP-311 | `smoke` | R1–R6 | flujo completo de un usuario nuevo | health responde con X-Request-Id y cabeceras de seguridad | Aprobó |
| CP-312 | `smoke` | R1–R6 | flujo completo de un usuario nuevo | registro, sesión y aviso de privacidad | Aprobó |
| CP-313 | `smoke` | R1–R6 | flujo completo de un usuario nuevo | crea la droguería y registra vencimientos, residuos y segregación | Aprobó |
| CP-314 | `smoke` | R1–R6 | flujo completo de un usuario nuevo | personal, capacitación, plan de mejoramiento y diagnóstico | Aprobó |
| CP-315 | `smoke` | R1–R6 | flujo completo de un usuario nuevo | sube y descarga un soporte | Aprobó |
| CP-316 | `smoke` | R1–R6 | flujo completo de un usuario nuevo | importa un CSV en dos pasos y migra datos locales con reversión | Aprobó |
| CP-317 | `smoke` | R1–R6 | flujo completo de un usuario nuevo | el reporte consolida todo | Aprobó |
| CP-318 | `smoke` | R1–R6 | flujo completo de un usuario nuevo | descarga de datos personales, cierre de sesión y 401 posterior | Aprobó |
| CP-319 | `staff` | Propuesta F2 | trabajadores | CRUD con borrado lógico y búsqueda | Aprobó |
| CP-320 | `staff` | Propuesta F2 | trabajadores | el código es único por droguería (sin importar mayúsculas), pero se repite entre droguerías | Aprobó |
| CP-321 | `staff` | Propuesta F2 | trabajadores | permite reutilizar el código tras borrar al trabajador | Aprobó |
| CP-322 | `staff` | Propuesta F2 | trabajadores | valida la entrada: código vacío | Aprobó |
| CP-323 | `staff` | Propuesta F2 | trabajadores | valida la entrada: nombre corto | Aprobó |
| CP-324 | `staff` | Propuesta F2 | trabajadores | valida la entrada: cargo largo | Aprobó |
| CP-325 | `staff` | Propuesta F2 | trabajadores | no almacena documento de identidad | Aprobó |
| CP-326 | `staff` | Propuesta F2 | temas | crea con vigencia por defecto de 12 meses, lista y rechaza duplicados | Aprobó |
| CP-327 | `staff` | Propuesta F2 | temas | valida la entrada: vigencia 0 | Aprobó |
| CP-328 | `staff` | Propuesta F2 | temas | valida la entrada: vigencia 61 | Aprobó |
| CP-329 | `staff` | Propuesta F2 | temas | valida la entrada: nombre corto | Aprobó |
| CP-330 | `staff` | Propuesta F2 | capacitaciones | sin fecha de realización queda pendiente | Aprobó |
| CP-331 | `staff` | Propuesta F2 | capacitaciones | con fecha de realización calcula la vigencia a partir del tema | Aprobó |
| CP-332 | `staff` | Propuesta F2 | capacitaciones | clasifica vencida, sin soporte y pendiente según la fecha de vigencia | Aprobó |
| CP-333 | `staff` | Propuesta F2 | capacitaciones | con soporte adjunto la capacitación queda vigente; sin soporte, «sin_soporte» | Aprobó |
| CP-334 | `staff` | Propuesta F2 | capacitaciones | un solo registro por trabajador y tema | Aprobó |
| CP-335 | `staff` | Propuesta F2 | capacitaciones | valida fechas: sin vigencia sin realización, vigencia anterior y fechas futuras | Aprobó |
| CP-336 | `staff` | Propuesta F2 | capacitaciones | el trabajador o el tema de otra droguería no se pueden usar | Aprobó |
| CP-337 | `staff` | Propuesta F2 | capacitaciones | la base de datos impide mezclar droguerías por clave compuesta | Aprobó |
| CP-338 | `staff` | Propuesta F2 | capacitaciones | al editar: registrar realización recalcula vigencia; quitarla vuelve a pendiente | Aprobó |
| CP-339 | `staff` | Propuesta F2 | capacitaciones | rechaza (400, no 500) una vigencia nula cuando hay fecha de realización | Aprobó |
| CP-340 | `staff` | Propuesta F2 | capacitaciones | borrar al trabajador oculta sus capacitaciones y libera el par | Aprobó |
| CP-341 | `staff` | Propuesta F2 | capacitaciones | borrar una capacitación exige administrador; queda auditado | Aprobó |
| CP-342 | `staff` | Propuesta F2 | temas base | toda droguería nueva trae los 4 temas base de capacitación (PGIRASA, vencimientos, servicio farmacéutico, bioseguridad) | Aprobó |
| CP-343 | `staff` | Propuesta F2 | aislamiento entre droguerías | una cuenta ajena recibe 404 en todas las rutas del módulo | Aprobó |
| CP-344 | `staff` | Propuesta F2 | aislamiento entre droguerías | un miembro de B no alcanza personal de A | Aprobó |
| CP-345 | `static` | Infra | frontend servido por el backend (STATIC_DIR) | sirve index.html en / y en rutas del frontend (React Router) | Aprobó |
| CP-346 | `static` | Infra | frontend servido por el backend (STATIC_DIR) | las rutas /api nunca devuelven el HTML: responden JSON 404 con el formato único | Aprobó |
| CP-347 | `static` | Infra | frontend servido por el backend (STATIC_DIR) | un POST a una ruta desconocida sigue siendo 404 JSON, no el HTML | Aprobó |
| CP-348 | `static` | Infra | frontend servido por el backend (STATIC_DIR) | los archivos con hash se cachean y index.html no | Aprobó |
| CP-349 | `static` | Infra | frontend servido por el backend (STATIC_DIR) | usa una CSP propia para el frontend y conserva la estricta en la API | Aprobó |
| CP-350 | `static` | Infra | frontend servido por el backend (STATIC_DIR) | no sirve archivos fuera de STATIC_DIR (recorrido de rutas) | Aprobó |
| CP-351 | `static` | Infra | frontend servido por el backend (STATIC_DIR) | la API sigue funcionando igual | Aprobó |
| CP-352 | `static` | Infra | sin STATIC_DIR | no sirve nada: la raíz es 404 JSON | Aprobó |
| CP-353 | `static` | Infra | sin STATIC_DIR | un STATIC_DIR sin index.html se ignora sin romper el arranque | Aprobó |
| CP-354 | `users-personal-data` | R6/R12 | perfil | lee y actualiza el perfil | Aprobó |
| CP-355 | `users-personal-data` | R6/R12 | perfil | valida el nombre | Aprobó |
| CP-356 | `users-personal-data` | R6/R12 | perfil | registra la aceptación del aviso de privacidad | Aprobó |
| CP-357 | `users-personal-data` | R6/R12 | perfil | una cuenta solo ve su propio perfil | Aprobó |
| CP-358 | `users-personal-data` | R6/R12 | datos personales (Ley 1581 de 2012) | descarga los datos propios sin hash de contraseña | Aprobó |
| CP-359 | `users-personal-data` | R6/R12 | datos personales (Ley 1581 de 2012) | programa la eliminación con 15 días de gracia y es idempotente | Aprobó |
| CP-360 | `users-personal-data` | R6/R12 | datos personales (Ley 1581 de 2012) | permite cancelar durante la gracia | Aprobó |
| CP-361 | `users-personal-data` | R6/R12 | datos personales (Ley 1581 de 2012) | no elimina antes de vencer la gracia y sí después, conservando la auditoría anonimizada | Aprobó |
| CP-362 | `waste` | R1 | crear y consultar | guarda y devuelve el registro | Aprobó |
| CP-363 | `waste` | R1 | crear y consultar | acepta la clasificación riesgo_biologico | Aprobó |
| CP-364 | `waste` | R1 | crear y consultar | acepta la clasificación peligroso_quimico | Aprobó |
| CP-365 | `waste` | R1 | crear y consultar | acepta la clasificación aprovechable | Aprobó |
| CP-366 | `waste` | R1 | crear y consultar | acepta la clasificación organico_aprovechable | Aprobó |
| CP-367 | `waste` | R1 | crear y consultar | acepta la clasificación no_aprovechable | Aprobó |
| CP-368 | `waste` | R1 | crear y consultar | valida la entrada: clasificación fuera de la lista | Aprobó |
| CP-369 | `waste` | R1 | crear y consultar | valida la entrada: unidad desconocida | Aprobó |
| CP-370 | `waste` | R1 | crear y consultar | valida la entrada: cantidad cero | Aprobó |
| CP-371 | `waste` | R1 | crear y consultar | valida la entrada: cantidad negativa | Aprobó |
| CP-372 | `waste` | R1 | crear y consultar | valida la entrada: cantidad con 4 decimales | Aprobó |
| CP-373 | `waste` | R1 | crear y consultar | valida la entrada: cantidad excesiva | Aprobó |
| CP-374 | `waste` | R1 | crear y consultar | valida la entrada: fecha inválida | Aprobó |
| CP-375 | `waste` | R1 | crear y consultar | valida la entrada: origen desconocido | Aprobó |
| CP-376 | `waste` | R1 | crear y consultar | valida la entrada: nota demasiado larga | Aprobó |
| CP-377 | `waste` | R1 | crear y consultar | rechaza fechas futuras pero acepta hoy | Aprobó |
| CP-378 | `waste` | R1 | tipo, manejo, soporte y unidades | guarda tipo de residuo, cómo se manejó y el soporte (n.° de certificado) | Aprobó |
| CP-379 | `waste` | R1 | tipo, manejo, soporte y unidades | acepta la unidad «unidades» (p. ej. luminarias) y no la mezcla con los kilogramos | Aprobó |
| CP-380 | `waste` | R1 | tipo, manejo, soporte y unidades | rechaza unidades desconocidas y campos demasiado largos | Aprobó |
| CP-381 | `waste` | R1 | medicamentos vencidos no son riesgo biológico | rechaza origen medicamento_vencido con riesgo_biologico | Aprobó |
| CP-382 | `waste` | R1 | medicamentos vencidos no son riesgo biológico | acepta medicamento vencido como peligroso_quimico | Aprobó |
| CP-383 | `waste` | R1 | medicamentos vencidos no son riesgo biológico | acepta medicamento vencido como no_aprovechable | Aprobó |
| CP-384 | `waste` | R1 | medicamentos vencidos no son riesgo biológico | también se valida al editar, combinando con el valor guardado | Aprobó |
| CP-385 | `waste` | R1 | medicamentos vencidos no son riesgo biológico | la base de datos también lo impide | Aprobó |
| CP-386 | `waste` | R1 | edición y borrado | edita parcialmente y puede limpiar origen y notas | Aprobó |
| CP-387 | `waste` | R1 | edición y borrado | el operador no borra; el administrador sí (borrado lógico) y queda auditado | Aprobó |
| CP-388 | `waste` | R1 | listado | filtra por rango de fechas y clasificación, ordena de más reciente a más antigua y pagina | Aprobó |
| CP-389 | `waste` | R1 | listado | valida los filtros | Aprobó |
| CP-390 | `waste` | R1 | aislamiento entre droguerías | una cuenta ajena recibe 404 en todas las rutas del módulo | Aprobó |
| CP-391 | `waste` | R1 | aislamiento entre droguerías | un miembro de B no alcanza registros de A ni los ve en su listado | Aprobó |
