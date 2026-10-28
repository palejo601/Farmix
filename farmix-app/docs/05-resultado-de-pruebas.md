# 5. Resultado de pruebas

## Resumen

- **399 pruebas automáticas, 399 en verde, 0 fallidas**, en 22 archivos (criterio del encargo: mínimo 108).
- Comando: `npm test` (Vitest 5.0.5). Duración aproximada: 2 minutos (el hash Argon2id es deliberadamente lento).
- Entorno: Node.js 22.22.0, PostgreSQL 16.15 local, Linux. `tsc --noEmit` sin errores. `npm audit`: 0 vulnerabilidades.
- Las pruebas **borran y recrean el esquema** de la base de pruebas (`TEST_DATABASE_URL`).

## Qué cubre cada archivo

| Archivo | Pruebas | Cobertura |
|---|---|---|
| `actions.test.ts` | 17 | Estados, cerrada exige fecha de cierre (API y base), atraso, filtros, permisos, aislamiento |
| `auth.test.ts` | 26 | Registro, Argon2id, cookie httpOnly/SameSite/secure, validación, ingreso, bloqueo tras 5 intentos y su vencimiento, límite de peticiones de autenticación, sesión (cierre, inactividad, vencimiento absoluto, token falso, solo hash en base), cambio y recuperación de contraseña, defensa por Origin, auditoría sin contraseñas |
| `config.test.ts` | 6 | Variables obligatorias, valores por defecto e inválidos, regla de producción, respaldo RENDER_EXTERNAL_URL |
| `cors.test.ts` | 3 | CORS solo para APP_ORIGIN, con credenciales; expone X-Request-Id |
| `diagnoses.test.ts` | 30 | Instrumento v2 (11 obligatorios con fundamento + 17 de madurez), «no cumple» no compensable, fórmula de madurez 1–5, «no aplica», validación, edición/borrado de respuestas, lectura del instrumento v1, mejoras ligadas a un incumplimiento, aislamiento |
| `drugstores.test.ts` | 30 | CRUD, borrado lógico, auditoría, 404 a ajenos en las 7 rutas con id, matriz de roles, propietario único e inamovible, miembros, archivado al purgar la cuenta del propietario |
| `expirations.test.ts` | 34 | Validación (10 casos), clasificación con límites 0/59/60/61 días, anticipación por droguería, gestionado, pérdidas y valor en riesgo con cifras exactas, alertas, filtros, permisos, aislamiento, restricciones de la base |
| `files.test.ts` | 18 | PDF/PNG/JPEG por bytes iniciales, tipo falso, vacío, >5 MB (413), nombre aleatorio y saneado, guardado en disco, descarga con cabeceras seguras, auditoría, enlace a capacitaciones, aislamiento |
| `health.test.ts` | 10 | Health 200/503, X-Request-Id (generado, reutilizado, descartado), formato de error, helmet y CSP |
| `imports.test.ts` | 14 | Vista previa sin escritura, CSV (coma y punto y coma) y Excel, duplicados (archivo y base), archivos inválidos/grandes, reglas por tipo, confirmación, doble confirmación, caducidad 24 h, revalidación, aislamiento |
| `local-migrations.test.ts` | 18 | Vista previa sin escritura, unicidad usuario+hash+demostración, confirmar sin duplicar, revertir solo lo creado, repetir tras revertir, fases, auditoría, aislamiento |
| `migrations.test.ts` | 3 | Las 13 migraciones se aplican en orden sobre base vacía, son idempotentes y detectan alteraciones |
| `openapi.test.ts` | 4 | 71 rutas sin duplicados, OpenAPI solo con EXPOSE_DOCS=true y con las 71 operaciones |
| `protected-routes.test.ts` | 66 | 66 rutas protegidas responden 401 sin sesión |
| `reports.test.ts` | 12 | Reporte vacío sin cifras inventadas, consolidación con cifras coherentes, periodo, permisos, aislamiento, aviso |
| `segregation.test.ts` | 19 | Porcentaje calculado al consultar, correct <= reviewed en API y base, resumen filtrado, aislamiento |
| `pwa.test.ts` | 8 | PWA: manifest instalable, íconos con el tamaño declarado, enlaces en index.html, el service worker no intercepta `/api`, archivos precargados existentes, tipos y caché del manifest y de `sw.js`, página sin conexión sin scripts ni estilos en línea |
| `smoke.test.ts` | 8 | Servidor real por HTTP: flujo completo de un usuario nuevo de extremo a extremo. Las fechas se calculan en hora de Colombia, como el servidor (antes usaban UTC y fallaban entre las 7 p. m. y la medianoche) |
| `static.test.ts` | 9 | Frontend servido por el backend: SPA, 404 JSON en /api, caché, CSP propia del frontend y estricta en la API, recorrido de rutas, sin STATIC_DIR |
| `staff.test.ts` | 26 | Trabajadores, temas, capacitaciones (pendiente/vigente/vencida), vigencia nula rechazada con 400, unicidad por droguería, FK compuestas, aislamiento |
| `users-personal-data.test.ts` | 8 | Perfil, aviso de privacidad, descarga de datos, eliminación con 15 días de gracia, cancelación y depuración |
| `waste.test.ts` | 30 | Clasificación cerrada, medicamento vencido ≠ riesgo biológico (API y base), fechas, filtros, aislamiento |

## Criterios de aceptación del encargo

| Criterio | Estado |
|---|---|
| ≥ 108 pruebas en verde | Cumplido (368) |
| Validación de entradas | Cubierta en cada módulo (casos válidos e inválidos) |
| Reglas de negocio | Cubiertas (clasificación de vencimientos con límites, pérdidas, residuos, segregación, capacitaciones, plan, diagnóstico, importación, migración local) |
| Aislamiento entre droguerías en **todas** las rutas de negocio | Cubierto: cada módulo prueba que una cuenta ajena recibe 404 (también con cuerpo inválido) y que un miembro de **otra** droguería no alcanza registros ajenos desde su propia ruta |
| Límite de intentos de ingreso | Cubierto (bloqueo de cuenta y límite de peticiones) |
| Expiración de sesiones | Cubierta (inactividad y absoluta) |
| Cabeceras de seguridad | Cubiertas (helmet, CSP sin `unsafe-inline`, `nosniff`, CORS) |
| 401 sin sesión en cada ruta protegida | Cubierto: 66 rutas (`protected-routes.test.ts`); las otras 5 son públicas |
| Migraciones en orden sobre base vacía | Cubierto (13 migraciones) |
| Prueba de humo que levanta el servidor y recorre un flujo completo | Cubierta (`smoke.test.ts`, servidor real por HTTP) |
| Prueba de extremo a extremo con navegador (Playwright) | Realizada sobre la interfaz: `frontend/e2e/ui-smoke.cjs`, 22 pasos (ver `docs/06-frontend.md`). No forma parte de `npm test`; se ejecuta a mano con ambos servidores levantados |

## Qué queda pendiente o no está probado (con honestidad)

1. **Contraste con el prototipo.** El prototipo no estuvo disponible: rutas, métodos y contratos de respuesta son una propuesta. Que "el frontend existente funcione sin cambios" **no está verificado**.
2. **Inventario de rutas.** El encargo habla de 70; hay 71 porque `health` se cuenta aparte. Las migraciones son 12 y no 13.
3. **Correo real.** `MAIL_MODE=smtp` no está implementado; solo `dev` (buzón en base de datos).
4. **Despliegue:** el `Dockerfile`, `docker-entrypoint.sh` y `render.yaml` no pudieron construirse como imagen en este entorno (sin demonio de Docker). Se probó el mismo arranque de producción compilado sobre una base nueva (migraciones, siembra, frontend servido, recorrido E2E 22/22 por el puerto 3000), no la imagen ni Render.
5. **Sin pruebas de carga, concurrencia intensa ni de penetración.** Las confirmaciones usan bloqueo de fila (`FOR UPDATE`) contra dobles envíos, pero no hay pruebas concurrentes.
6. **Rendimiento del hash:** parámetros por defecto de `@node-rs/argon2`; no se ajustaron a un hardware de producción.
7. **Limpieza programada** de sesiones vencidas y vistas previas caducadas: no existe (solo la depuración horaria de cuentas con eliminación vencida, probada llamando a la función; el temporizador de `server.ts` no tiene prueba propia).
8. **HSTS y `COOKIE_SECURE=true` bajo HTTPS real** no se probaron detrás de un proxy; solo la bandera `secure` de la cookie.
9. **Archivos:** sin antivirus; la detección de tipo es por bytes iniciales, no por análisis completo del contenido.
10. **Instrumento de diagnóstico v1** es un borrador sin validación de expertos.
11. La importación y la migración local auditan el lote, no cada fila.
