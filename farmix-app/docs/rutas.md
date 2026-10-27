# Inventario de rutas de la API

> **Importante.** El prototipo original no estuvo disponible durante la reconstrucción, por lo que este inventario es una **propuesta** derivada de la tabla de módulos del encargo, **no** una lectura de los `routes.ts` del prototipo. Antes de conectar el frontend existente hay que contrastarlo con este documento y con `docs/openapi.json`.

> El encargo habla de 70 rutas; el inventario propuesto suma **71** porque `GET /api/v1/health` se cuenta aparte (70 rutas funcionales + health).

Todas las rutas cuelgan de `/api/v1`. "operador+" significa operador, administrador o propietario de la droguería. Una cuenta que no es miembro recibe **404**; un miembro con rol insuficiente recibe **403**; sin sesión, **401**.


## health

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/v1/health` | público |

## auth

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/v1/auth/change-password` | sesión |
| POST | `/api/v1/auth/login` | público |
| POST | `/api/v1/auth/logout` | sesión |
| POST | `/api/v1/auth/password-reset/confirm` | público |
| POST | `/api/v1/auth/password-reset/request` | público |
| POST | `/api/v1/auth/register` | público |
| GET | `/api/v1/auth/session` | sesión |

## users

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/v1/users/me` | sesión |
| PATCH | `/api/v1/users/me` | sesión |
| POST | `/api/v1/users/me/privacy-acceptance` | sesión |

## personal-data

| Método | Ruta | Acceso |
|---|---|---|
| DELETE | `/api/v1/personal-data/deletion-request` | sesión |
| POST | `/api/v1/personal-data/deletion-request` | sesión |
| GET | `/api/v1/personal-data/export` | sesión |

## drugstores

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/v1/drugstores` | sesión |
| POST | `/api/v1/drugstores` | sesión |
| DELETE | `/api/v1/drugstores/{id}` | propietario |
| GET | `/api/v1/drugstores/{id}` | operador+ |
| PATCH | `/api/v1/drugstores/{id}` | administrador+ |
| GET | `/api/v1/drugstores/{id}/members` | operador+ |
| POST | `/api/v1/drugstores/{id}/members` | administrador+ (el administrador solo gestiona operadores) |
| DELETE | `/api/v1/drugstores/{id}/members/{userId}` | miembro (operador: solo a sí mismo; administrador+: a otros) |
| PATCH | `/api/v1/drugstores/{id}/members/{userId}` | administrador+ (el administrador solo gestiona operadores) |

## expirations

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/v1/drugstores/{id}/expirations` | operador+ |
| POST | `/api/v1/drugstores/{id}/expirations` | operador+ |
| DELETE | `/api/v1/drugstores/{id}/expirations/{expirationId}` | administrador+ |
| GET | `/api/v1/drugstores/{id}/expirations/{expirationId}` | operador+ |
| PATCH | `/api/v1/drugstores/{id}/expirations/{expirationId}` | operador+ |
| GET | `/api/v1/drugstores/{id}/expirations/alerts` | operador+ |
| GET | `/api/v1/drugstores/{id}/expirations/losses` | operador+ |

## waste

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/v1/drugstores/{id}/waste-records` | operador+ |
| POST | `/api/v1/drugstores/{id}/waste-records` | operador+ |
| DELETE | `/api/v1/drugstores/{id}/waste-records/{wasteId}` | administrador+ |
| GET | `/api/v1/drugstores/{id}/waste-records/{wasteId}` | operador+ |
| PATCH | `/api/v1/drugstores/{id}/waste-records/{wasteId}` | operador+ |

## segregation

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/v1/drugstores/{id}/segregation-checks` | operador+ |
| POST | `/api/v1/drugstores/{id}/segregation-checks` | operador+ |
| DELETE | `/api/v1/drugstores/{id}/segregation-checks/{checkId}` | administrador+ |
| GET | `/api/v1/drugstores/{id}/segregation-checks/{checkId}` | operador+ |
| PATCH | `/api/v1/drugstores/{id}/segregation-checks/{checkId}` | operador+ |

## staff

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/v1/drugstores/{id}/training-topics` | operador+ |
| POST | `/api/v1/drugstores/{id}/training-topics` | operador+ |
| GET | `/api/v1/drugstores/{id}/trainings` | operador+ |
| POST | `/api/v1/drugstores/{id}/trainings` | operador+ |
| DELETE | `/api/v1/drugstores/{id}/trainings/{trainingId}` | administrador+ |
| PATCH | `/api/v1/drugstores/{id}/trainings/{trainingId}` | operador+ |
| GET | `/api/v1/drugstores/{id}/workers` | operador+ |
| POST | `/api/v1/drugstores/{id}/workers` | operador+ |
| DELETE | `/api/v1/drugstores/{id}/workers/{workerId}` | administrador+ |
| GET | `/api/v1/drugstores/{id}/workers/{workerId}` | operador+ |
| PATCH | `/api/v1/drugstores/{id}/workers/{workerId}` | operador+ |

## actions

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/v1/drugstores/{id}/improvement-actions` | operador+ |
| POST | `/api/v1/drugstores/{id}/improvement-actions` | operador+ |
| DELETE | `/api/v1/drugstores/{id}/improvement-actions/{actionId}` | administrador+ |
| GET | `/api/v1/drugstores/{id}/improvement-actions/{actionId}` | operador+ |
| PATCH | `/api/v1/drugstores/{id}/improvement-actions/{actionId}` | operador+ |

## diagnoses

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/v1/drugstores/{id}/diagnoses` | operador+ |
| POST | `/api/v1/drugstores/{id}/diagnoses` | operador+ |
| GET | `/api/v1/drugstores/{id}/diagnoses/{diagId}` | operador+ |
| PATCH | `/api/v1/drugstores/{id}/diagnoses/{diagId}` | operador+ |
| GET | `/api/v1/drugstores/{id}/diagnoses/instrument/current` | operador+ |

## files

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/v1/drugstores/{id}/files` | operador+ |
| DELETE | `/api/v1/drugstores/{id}/files/{fileId}` | administrador+ |
| GET | `/api/v1/drugstores/{id}/files/{fileId}` | operador+ |

## imports

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/v1/drugstores/{id}/imports/{importId}` | operador+ |
| POST | `/api/v1/drugstores/{id}/imports/{importId}/confirm` | operador+ |
| POST | `/api/v1/drugstores/{id}/imports/preview` | operador+ |

## reports

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/v1/drugstores/{id}/reports/management` | operador+ |

## migrations

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/v1/local-migrations` | sesión |
| POST | `/api/v1/local-migrations/{migrationId}/confirm` | sesión |
| POST | `/api/v1/local-migrations/{migrationId}/revert` | sesión |

**Total: 71 rutas.** Se verifica con `tests/openapi.test.ts`.
