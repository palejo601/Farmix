# 02 · Frontend (la interfaz)

## Qué es
El **frontend** es lo que la persona ve y toca: pantallas, formularios y botones. Corre en el **navegador**.
No guarda datos propios: los pide a la API y los muestra. En la analogía del restaurante, es el salón y el menú.

**Tecnologías:** React 19 (componentes de interfaz), TypeScript (JavaScript con tipos), Vite (servidor de desarrollo y empaquetador) y React Router (las direcciones `/d/:id/residuos`, etc.).

## Dónde está el código: `farmix-app/frontend/`
| Archivo | Para qué sirve |
|---|---|
| `index.html` | La única página HTML; React dibuja todo dentro de `<div id="root">` |
| `src/main.tsx` | Punto de entrada: arranca React (y, en la rama `pwa-instalable`, registra el service worker) |
| `src/App.tsx` | **Mapa de direcciones**: qué pantalla corresponde a cada ruta |
| `src/api.ts` | **El mesero**: la función que llama a `/api/v1/...` con la cookie de sesión y traduce los errores |
| `src/auth.tsx` | Guarda quién inició sesión y protege las pantallas privadas |
| `src/drugstore.tsx` | Comparte la droguería activa entre pantallas |
| `src/Layout.tsx` | Estructura común: menú lateral, encabezado y menú móvil |
| `src/CrudPage.tsx`, `src/ui.tsx` | Componentes reutilizables (tablas, formularios, avisos) |
| `src/format.ts` | Formatos de fecha, número y moneda en español de Colombia |
| `src/normativa.ts` | Lista del marco normativo (con estado de verificación) |
| `src/styles.css` | Estilos (incluye modo oscuro) |
| `e2e/ui-smoke.cjs` | Prueba de navegador de 22 pasos (ver `05-pruebas`) |

## Pantallas → módulo de la API → tablas
| Dirección | Pantalla | Usa la API | Tablas principales |
|---|---|---|---|
| `/login`, `/registro`, `/recuperar` | `AuthPages.tsx` | auth | `users`, `sessions`, `password_resets` |
| `/` | `DrugstoresPage.tsx` | drugstores | `drugstores`, `drugstore_members` |
| `/d/:id` (resumen) | `DashboardPage.tsx` | reports y otros | varias |
| `/d/:id/vencimientos` | `ExpirationsPage.tsx` | expirations | `expiration_products` |
| `/d/:id/residuos` | `WastePage.tsx` | waste | `waste_records` |
| `/d/:id/segregacion` | `SegregationPage.tsx` | segregation | `segregation_checks` |
| `/d/:id/personal` | `StaffPage.tsx` | staff, files | `workers`, `training_topics`, `trainings`, `support_files` |
| `/d/:id/diagnostico` | `DiagnosticoPage.tsx` | diagnoses, actions | `instrument_*`, `diagnoses`, `diagnosis_*`, `improvement_actions` |
| `/d/:id/reporte` | `ReportPage.tsx` | reports | lee A3, A4 y A5 |
| `/d/:id/importar` · `/migrar` | `ImportsPage.tsx` · `LocalMigrationPage.tsx` | imports · local-migrations | `imports` · `local_migrations` |
| `/d/:id/miembros` · `/configuracion` | `MembersPage.tsx` | drugstores | `drugstore_members` · `drugstores` |
| `/d/:id/normativa` | `NormativaPage.tsx` | ninguna (contenido fijo) | — |
| `/cuenta` | `AccountPage.tsx` | users, personal-data | `users` |

La relación pantalla → tabla es un resumen para orientarse; el detalle de qué tabla toca cada servicio está en `04-base-de-datos`.

## Cómo llama a la API
`src/api.ts` usa `fetch('/api/v1' + ruta, { credentials: 'same-origin' })`: la cookie de sesión viaja sola porque la web y la API comparten origen.
- En **desarrollo**, Vite (puerto 5173) redirige `/api` al backend (puerto 3000): ver `vite.config.ts`.
- En **producción**, el mismo servidor entrega la web y la API (ver `06-despliegue`).

## Scripts
| Script | Qué hace |
|---|---|
| `bash scripts/iniciar.sh` | Interfaz en http://localhost:5173 con recarga en vivo (encienda antes el backend) |
| `bash scripts/compilar.sh` | Revisa tipos y empaqueta para producción en `frontend/dist` |

## Autoevaluación
1. Si cambia el texto de un botón de la pantalla de residuos, ¿qué archivo edita?
2. ¿Por qué en desarrollo hay dos puertos (5173 y 3000) y en Render solo una URL?
3. ¿Dónde se decide qué pantalla se muestra en `/d/123/segregacion`?
