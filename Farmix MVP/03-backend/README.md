# 03 · Backend (la API y las reglas de negocio)

## Qué es
El **backend** corre en el servidor. Recibe las peticiones del frontend, **verifica quién es y qué puede hacer**, **valida** los datos,
aplica las **reglas de negocio** y lee o escribe en la base de datos. Es la cocina del restaurante.

**Tecnologías:** Node.js 22, TypeScript estricto, **Fastify 5** (servidor HTTP), **Zod 4** (validación), **Drizzle ORM** (consultas tipadas a PostgreSQL), Argon2id (contraseñas).

## Dónde está el código: `farmix-app/src/`
| Archivo o carpeta | Para qué sirve |
|---|---|
| `server.ts` | Punto de arranque: lee la configuración y enciende el servidor |
| `app.ts` | Arma la aplicación: seguridad (CORS, CSP, límite de peticiones), registra los 15 módulos y, si hay `STATIC_DIR`, sirve el frontend |
| `config/env.ts` | Lee y **valida** las variables de entorno; por ejemplo, rechaza producción sin `COOKIE_SECURE=true` |
| `db/client.ts`, `db/schema.ts` | Conexión a PostgreSQL y descripción de las tablas para Drizzle |
| `db/migrate.ts`, `db/migrations/` | Aplicador de migraciones y los 13 archivos SQL (ver `04-base-de-datos`) |
| `modules/<módulo>/` | Un módulo por tema de negocio (abajo) |
| `shared/` | Piezas comunes: `audit.ts` (auditoría), `error-handler.ts` (formato único de errores), `password.ts` (Argon2id), `request-id.ts`, `crud.ts`, `errors.ts` |
| `scripts/` | `seed-demo.ts` (datos simulados) y `export-openapi.ts` (documento de la API) |

## El patrón de cada módulo: rutas → esquema → servicio
Todos los módulos se escriben igual, lo que hace el código predecible:

| Archivo | Rol | Analogía |
|---|---|---|
| `routes.ts` | Declara las direcciones (`GET`, `POST`, `PATCH`, `DELETE`) y qué rol exige cada una | El mesero que toma el pedido |
| `schema.ts` | Define con Zod la forma exacta de lo que entra y sale | La fórmula que se revisa |
| `service.ts` | Reglas de negocio y acceso a la base de datos | El regente que prepara y dispensa |

**Los 15 módulos:** `auth` (ingreso, sesiones, recuperación), `users`, `personal-data` (privacidad y eliminación de cuenta), `drugstores` (droguerías, miembros y roles; `guard.ts` controla el acceso),
`expirations`, `waste`, `segregation`, `staff` (personal y capacitación), `files` (soportes), `diagnoses`, `actions` (plan de mejora), `reports`, `imports`, `local-migrations` y `health` (estado del servicio).

## Roles por droguería (de menor a mayor)
`operador` → `administrador` → `propietario`. Cada ruta declara el rol mínimo con `guard('…')`.
Una persona que no es miembro de la droguería recibe `404`: así ni siquiera se entera de que la droguería existe.

## Hallazgo para la Etapa 2
El backend **no carga `farmix-app/.env` por sí mismo**: no usa `dotenv` ni `--env-file`. El README de `farmix-app` sugiere copiar `.env.example` a `.env`, pero eso no tiene efecto si no se exportan las variables.
Los scripts de esta guía sí lo cargan (`scripts/_comun.sh`, función `cargar_env`).

## Scripts
| Script | Qué hace |
|---|---|
| `bash scripts/iniciar.sh` | API en http://localhost:3000 que se reinicia sola al guardar cambios. Pruebe http://localhost:3000/api/v1/health |
| `bash scripts/revisar-tipos.sh` | Revisa los tipos de TypeScript sin ejecutar nada |

Documentos técnicos: [`01-codigo-fuente.md`](../../farmix-app/docs/01-codigo-fuente.md), [`rutas.md`](../../farmix-app/docs/rutas.md) (las 71 rutas) y `docs/openapi.json`.

## Autoevaluación
1. Quiere agregar a la verificación de segregación un campo «responsable» (quién verificó): ¿en qué tres archivos del módulo debe trabajar, además de la migración?
2. ¿Qué archivo decide que un operador no puede borrar una droguería?
3. ¿Por qué la contraseña nunca aparece en `audit_logs`?
