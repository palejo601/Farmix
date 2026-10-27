# 3. Modelo arquitectónico

## Capas

```
┌────────────────────────────────────────────────────────────────────┐
│ CLIENTE  (navegador / frontend en APP_ORIGIN)                      │
│   cookie httpOnly "farmix_sid"  ·  JSON  ·  multipart (soportes)   │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ HTTPS (proxy inverso en producción)
┌──────────────────────────────▼─────────────────────────────────────┐
│ API  (Fastify 5)                                                   │
│  genReqId → CORS(APP_ORIGIN) → helmet/CSP → rate-limit             │
│  → hook Origin (cambios de datos) → requireAuth → guard(rol)       │
│  → validación Zod (params/query/body) → handler → serialización Zod│
│  errores → formato único  ·  X-Request-Id en toda respuesta        │
└──────────────────────────────┬─────────────────────────────────────┘
┌──────────────────────────────▼─────────────────────────────────────┐
│ SERVICIOS  (modules/*/service.ts)                                  │
│  reglas de negocio · cálculo de estados · auditoría                │
└───────────────┬───────────────────────────────┬────────────────────┘
┌───────────────▼──────────────┐   ┌────────────▼───────────────────┐
│ DATOS: PostgreSQL 16 (Drizzle)│   │ ARCHIVOS: STORAGE_DIR (disco)  │
│ restricciones, índices únicos │   │ nombre aleatorio, 0600         │
└───────────────────────────────┘   └────────────────────────────────┘
```

## Recorrido de una petición (ejemplo: `POST /api/v1/drugstores/:id/expirations`)

1. Fastify asigna `X-Request-Id` (reutiliza el entrante solo si es seguro: `[A-Za-z0-9._-]{8,64}`).
2. CORS acepta únicamente `APP_ORIGIN`; helmet aplica la CSP (`default-src 'none'`); rate-limit global.
3. Hook de Origen: una petición que cambia datos con `Origin` distinto de `APP_ORIGIN` recibe 403.
4. `guard('operador')` (en `onRequest`, antes de validar el cuerpo):
   lee la cookie → busca la sesión por **hash** del token (no revocada, dentro del límite absoluto y del de inactividad) →
   busca la membresía activa en la droguería. Sin sesión → 401. No miembro (o droguería borrada/inexistente) → **404**. Rol insuficiente → 403.
5. Zod valida parámetros, consulta y cuerpo (400 con `details` por campo si falla).
6. El servicio aplica reglas (unicidad, estados calculados al consultar), escribe con `created_by`/`updated_by` y registra la auditoría.
7. La respuesta se serializa con el esquema Zod de salida (lo que no está en el esquema no sale).
8. Cualquier error pasa por el manejador único: `{ "error": { code, message, requestId, details? } }`, sin trazas ni mensajes internos.

## Decisiones de seguridad

| Decisión | Motivo |
|---|---|
| Argon2id para contraseñas; nunca en registros ni auditoría | Resistencia a ataques offline; las pruebas verifican que no llegan a `audit_logs`. |
| Sesión en cookie `httpOnly`, `SameSite=Lax`, `secure` según `COOKIE_SECURE` (obligatorio en producción) | Mitiga robo por XSS y CSRF. |
| En la base solo se guarda el hash SHA-256 del token de sesión | Una filtración de la base no entrega sesiones válidas. |
| Expiración por inactividad (`SESSION_IDLE_HOURS`) y absoluta (`SESSION_MAX_DAYS`) | Limita la ventana de uso de una sesión robada. |
| 5 intentos fallidos → bloqueo de 15 minutos; mismo error para correo inexistente y clave errónea | Frena fuerza bruta y enumeración por el ingreso. |
| Límite propio de peticiones de autenticación (`AUTH_RATE_LIMIT_MAX`) además del global | Protege ingreso, registro y recuperación. |
| Recuperación de contraseña responde igual exista o no la cuenta; código de un solo uso, vence en 1 h; cierra todas las sesiones | Evita enumeración y reutilización. |
| Aislamiento por droguería: `guard` en toda ruta de negocio; ajenos reciben 404; claves foráneas **compuestas** `(drugstore_id, id)` | Aunque falle una validación de la API, la base impide asociar registros de otra droguería. |
| Defensa de Origen en cambios de datos + CORS limitado a `APP_ORIGIN` | CSRF adicional a `SameSite`. |
| Soportes: solo PDF/PNG/JPEG decididos por **bytes iniciales**, máx. 5 MB, nombre aleatorio, fuera de la base, descarga solo a miembros, `nosniff` y `attachment` | Evita ejecución/suplantación de tipo y accesos cruzados. |
| Importaciones: máx. 2 MB y 1000 filas; la vista previa no escribe; caduca en 24 h; se revalida al confirmar | Evita cargas masivas y duplicados. |
| Estados derivados (vencimientos, capacitaciones, porcentajes, atraso) **calculados al consultar**, nunca almacenados | No pueden quedar desactualizados. |
| Minimización de datos: sin documento de identidad del personal, sin datos clínicos ni de pacientes | Ley 1581 de 2012. |
| Datos personales: aviso de privacidad versionado, descarga de datos, eliminación con 15 días de gracia (cancelable) y depuración horaria | Derechos del titular. |
| Auditoría de cada creación, modificación, borrado, ingreso y descarga, con `request_id` | Trazabilidad. |
| Errores sin detalles internos; registros con `cookie`/`authorization` ocultos | No filtrar información. |

## Limitaciones conocidas de seguridad

- Sin analizador antivirus para soportes; sin protección específica contra "zip bombs" en `.xlsx` más allá del límite de 2 MB de carga.
- No hay rotación de identificador de sesión adicional ni autenticación en dos pasos.
- El limitador de peticiones usa la IP del cliente (con `TRUST_PROXY=true` detrás de un proxy de confianza).
- La importación auditada registra el lote (una entrada por importación o migración), no una entrada por fila; cada fila guarda `created_by`.
- No se ha realizado una prueba de penetración independiente.
