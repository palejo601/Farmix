# Etapa 2 · Área A1 — Identidad

Tablas: `users`, `sessions`, `password_resets`, `audit_logs`, `dev_mailbox`.
Fuente: catálogo (`../modelo-datos/modelo-fisico.md`) y código leído en `farmix-app/src/modules/auth`, `src/modules/personal-data` y `src/shared/audit.ts`.
Convención: **[H]** hecho confirmado · **[I]** inferencia · **[R]** recomendación (no aplicada).

## 4.5 · Explicación por tabla

### `users` — «el carné de cada persona»
Una fila = una cuenta. 12 columnas, 3 CHECK, sin FK propias.

| Columna(s) | Para qué sirve |
|---|---|
| `email` | Identifica a la persona. Único **sin importar mayúsculas** (`lower(email)`) [H] |
| `password_hash` | Contraseña convertida con **Argon2id**; nunca se guarda la contraseña [H: el hash lo calcula `hashPassword`; el algoritmo viene de la documentación y no lo verifiqué en esta lectura] |
| `full_name` | Nombre (2–120) |
| `privacy_accepted_at`, `privacy_version` | Cuándo y qué versión de la política aceptó |
| `failed_login_count`, `locked_until` | Defensa contra adivinar contraseñas: al llegar a **5** fallos se bloquea **15 min** [H: `MAX_FAILED_LOGINS`, `LOCK_MINUTES`] |
| `deletion_requested_at`, `deletion_scheduled_at` | Solicitud de borrado de cuenta y fecha en que se ejecutará (periodo de gracia) |
| `created_at`, `updated_at` | Fechas |

Reglas de la base: `users_deletion_pair` (las dos fechas de borrado van juntas o ambas vacías) y contador de fallos ≥ 0. [H]
`users` **no tiene `deleted_at`**: cuando vence la gracia, el borrado es **físico** (`purgeDueAccounts`); antes se archiva (borrado lógico) cada droguería de la que era propietario. [H]

### `sessions` — «la manilla de ingreso»
Una fila = una sesión abierta. 7 columnas, FK a `users` con `ON DELETE CASCADE`.
- `token_hash`: guarda el **SHA-256 del token**, no el token; el token real viaja solo en la cookie. Si se filtra la tabla, no sirven para entrar. Único. [H]
- `expires_at`, `revoked_at`, `last_seen_at`: una sesión vale si no está revocada y no ha expirado (`SESSION_MAX_DAYS`). Cerrar sesión **marca** `revoked_at`, no borra. [H]

### `password_resets` — «el vale de recuperación»
Una fila = un código para recuperar contraseña. FK a `users` (`CASCADE`).
- `token_hash` (SHA-256, único), `expires_at` (vale **1 hora** [H: `RESET_TTL_MS` según el texto del correo]), `used_at` (un código solo sirve una vez: la consulta exige `used_at IS NULL` y no expirado). [H]
- La solicitud **responde igual exista o no la cuenta**, para no revelar qué correos están registrados. [H]

### `audit_logs` — «el libro de registro»
Una fila = una acción sensible. `id` es `bigint` autonumérico. 8 columnas.
- `user_id` (FK, `SET NULL`), `action`, `resource`, `resource_id`, `outcome` (`success`/`failure`), `request_id`, `created_at`.
- El código documenta que **nunca recibe contraseñas ni tokens**. [H: comentario y firma de `audit()`]
- Cuando se elimina una cuenta, sus registros **se conservan** con `user_id` vacío. [H]

### `dev_mailbox` — «el buzón de mentira»
Una fila = un correo **simulado** (para, asunto, cuerpo). Sin FK ni CHECK. Existe porque `MAIL_MODE` vale `dev` por defecto: en vez de enviar correos, FARMIX los guarda aquí. [H]

## 4.6 · Integridad y calidad (diagnóstico, sin cambios aplicados)

### Lo que está bien [H]
1. Correo único sin distinguir mayúsculas (índice sobre `lower(email)`).
2. Contraseñas y tokens **no se guardan en claro** (hash Argon2id / SHA-256).
3. Tokens únicos, con caducidad y de un solo uso.
4. Bloqueo por intentos fallidos y respuesta uniforme al recuperar contraseña.
5. Auditoría que sobrevive a la eliminación del usuario.
6. `ON DELETE CASCADE` en `sessions` y `password_resets`: al eliminar una cuenta no quedan sesiones huérfanas.

### Hallazgos
| # | Hallazgo | Tipo | Prioridad sugerida |
|---|---|---|---|
| 1 | **`dev_mailbox.body` guarda el código de recuperación en texto claro** (`Código de recuperación…: ${token}`). Contradice el cuidado de `password_resets`, que solo guarda el hash. En desarrollo es esperado; el riesgo es que `MAIL_MODE` sea `dev` **por defecto**. No revisé qué valor tiene Render ni si el modo `smtp` envía correos (en el fragmento leído solo aparece la rama `dev`) | [H] cuerpo en claro y default `dev`; [I] riesgo en producción | **P1**: confirmar en Render sin tocar la base de producción |
| 2 | `sessions` y `password_resets` **no tienen limpieza automática** visible: las filas expiradas o usadas se acumulan. No busqué una tarea programada exhaustivamente | [H] sin borrado en el código leído; [I] crecimiento | P2 |
| 3 | `audit_logs.action`, `resource` y `outcome`: solo `outcome` tiene CHECK; `action` y `resource` son texto libre (puede haber variantes mal escritas) | [H] | P3 |
| 4 | `audit_logs` y `dev_mailbox` no tienen `created_at`-índice propio (solo `user_id, created_at`). Consultar por fecha sin usuario recorrería toda la tabla | [H] índices; [I] efecto solo con muchos datos | P3 (medir antes) |
| 5 | `users`: sin CHECK de formato en `email` ni longitud; la validación está solo en la API (Zod) | [H] | P3 |
| 6 | `users.email` y `password_hash` sin límite de longitud en la base | [H] | P3 |
| 7 | `purgeDueAccounts` borra físicamente usuarios, pero no revisé **quién la invoca** ni cada cuánto (¿tarea programada o endpoint?). Si nadie la llama, las cuentas nunca se eliminan | [H] existe la función; [I] falta verificar el disparador | P2: verificar |
| 8 | `updated_at` en `users` depende de la aplicación (sin triggers); el código leído sí lo escribe | [H] | Observación, sin acción |

### Normalización (resumen) [I]
Cumplen 1FN/2FN/3FN. `sessions` y `password_resets` separadas de `users` son correctas (una persona, muchas sesiones). No se guarda nada derivado.

## Qué NO se hizo
- Ninguna consulta, cambio de código o de base; trabajo solo sobre estructura y lectura del código.
- No verifiqué la configuración de Render (no se toca producción).
- Los hallazgos son para **acordar** antes de cualquier cambio.

## Autoevaluación
1. ¿Por qué guardar el SHA-256 del token y no el token?
2. ¿Qué ve alguien que consulte `audit_logs` de un usuario eliminado?
3. ¿Qué riesgo hay si `MAIL_MODE=dev` queda activo en producción?
