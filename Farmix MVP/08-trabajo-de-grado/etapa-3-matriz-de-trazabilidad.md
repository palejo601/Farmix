# Etapa 3 · Análisis de la aplicación y matriz de trazabilidad

**Trazabilidad** = poder seguir un requisito de la propuesta hasta lo que lo cumple: pantalla → API → tabla → prueba.
Fuente: `farmix-app/docs/rutas.md`, `frontend/src/App.tsx` y las páginas, `src/modules/*`, `tests/*.test.ts`, `frontend/e2e/ui-smoke.cjs`.
Convención: **[H]** hecho confirmado leyendo código/documentos · **[I]** inferencia · **✔** cubierto · **◐** parcial · **✘** no encontrado.
**Límite:** no ejecuté nada nuevo en esta etapa; la columna «Pruebas» indica qué archivo o paso existe, no que lo haya vuelto a correr hoy (la última corrida verificada fue 391/391 y 22/22 al construir esta guía).

## 1. Análisis de la aplicación

| Capa | Hallazgo confirmado |
|---|---|
| API | **15 módulos** en `src/modules`; el inventario `rutas.md` lista **71 rutas** (70 funcionales + `health`). [H] |
| Roles | `propietario`, `administrador`, `operador`; quien no es miembro recibe `404`. [H] |
| Pantallas | **14 páginas** en `frontend/src/pages` y **18 rutas de navegación** en `App.tsx` (login, registro, recuperar, inicio, cuenta, y 12 dentro de `/d/:id`). [H] |
| Pruebas | 21 archivos en `tests/` + recorrido de navegador de **22 pasos**. [H] |
| Pagos | Búsqueda de «pago/payment/stripe» en `src` y `frontend/src`: **sin resultados**. Cumple «sin pagos». [H] |
| PWA | Existe solo en la rama `pwa-instalable`; **la rama que publica Render no la tiene**. [H] |

> ⚠️ **Advertencia de `rutas.md`:** el propio documento dice que el inventario es una **propuesta**, porque el prototipo original no estuvo disponible al reconstruir el sistema, y que el encargo hablaba de 70 rutas. Es decir, la lista de rutas se derivó del diseño, no de una especificación de usuarios. Esto afecta el objetivo 2 de la propuesta (requerimientos): la lista de requerimientos formales sigue **pendiente**.

## 2. Matriz de trazabilidad (requisito → implementación → evidencia)

Requisitos tomados de lo que me indicaste (funciones esenciales, cuentas/roles, PWA, sin pagos) y de los objetivos de la propuesta.

| # | Requisito | Pantalla (ruta) | API (módulo) | Tablas | Pruebas (archivo / paso del navegador) | Estado |
|---|---|---|---|---|---|---|
| R1 | Registrar residuos **por clasificación** | `/d/:id/residuos` | `waste-records` (5 rutas) | `waste_records` | `waste.test.ts`; paso «residuos: medicamento vencido ≠ riesgo biológico» | ✔ |
| R2 | Controlar **vencimientos con alertas** | `/vencimientos`, inicio | `expirations` (+ `/alerts`) | `expiration_products`, `drugstores.expiry_alert_days` | `expirations.test.ts` (límites 0/59/60/61 días); pasos de vencimientos | ✔ |
| R3 | Calcular **pérdidas** por vencimiento | `/vencimientos` | `expirations/losses` | `expiration_products` | `expirations.test.ts` (cifras exactas) | ✔ (cifras descriptivas, no demuestran reducción) |
| R4 | **Reporte de gestión** | `/reporte`, inicio | `reports/management` (junta 5 módulos) | lee de varias tablas | `reports.test.ts`; paso «reporte: documento con las seis secciones» | ✔ |
| R5 | **Verificación de segregación** (indicador de evaluación del MVP) | `/segregacion`, reporte, inicio | `segregation-checks` (5 rutas) | `segregation_checks` | `segregation.test.ts`; paso «bien segregados no supera revisados» | ✔ |
| R6 | **Cuentas y sesión** | `/login`, `/registro`, `/recuperar`, `/cuenta` | `auth`, `users` | `users`, `sessions`, `password_resets` | `auth.test.ts`, `users-personal-data.test.ts`; pasos de login, registro y cuenta | ✔ |
| R7 | **Droguerías** (multi-cuenta) | `/` , `/configuracion` | `drugstores` | `drugstores` | `drugstores.test.ts`, `tenant.ts` | ✔ |
| R8 | **Roles** y miembros | `/miembros` | `drugstores/{id}/members` | `drugstore_members` | `drugstores.test.ts` (matriz de roles; `404` ajeno); paso «miembros y configuración» | ✔ |
| R9 | **Aislamiento** entre droguerías | todas | `guard()` + FK compuestas | 6 FK compuestas | `protected-routes.test.ts` (66 rutas privadas → 401), `drugstores.test.ts` | ✔ |
| R10 | **Instalable (PWA)** | toda la app | — | — | `pwa.test.ts` (8) | ◐ solo en `pwa-instalable`, sin unir a la rama de Render |
| R11 | **Sin pagos** | — | — | — | búsqueda de texto sin resultados | ✔ [H] |
| R12 | Privacidad: aceptación y borrado de cuenta (Ley 1581, por validar) | `/cuenta`, `/registro` | `personal-data`, `users/me/privacy-acceptance` | `users` | `users-personal-data.test.ts`; paso «cuenta: privacidad…» | ◐ cubre la cuenta; **no** a trabajadores (A4-4) |
| **Objetivos de la propuesta** | | | | | | |
| O1 | Diagnosticar la gestión de residuos | `/diagnostico` | `diagnoses` | `instrument_*`, `diagnoses`, `diagnosis_*` | `diagnoses.test.ts`; 2 pasos de diagnóstico | ◐ herramienta ✔; **diagnóstico de campo sin evidencia** |
| O1b | Plan de mejora | `/diagnostico?v=mejoras` | `improvement-actions` | `improvement_actions` | `actions.test.ts`; pasos de mejoras | ✔ |
| O2 | Requerimientos formales | — | `rutas.md` (propuesta) | — | — | ✘ falta matriz formal con usuarios |
| O3 | Base de datos | — | — | 23 tablas | `migrations.test.ts` | ✔ (Etapa 1) |
| O4 | Sistema de apoyo | todas | 15 módulos | — | 391 pruebas | ✔ |
| O5 | Demostración en entorno relevante | Render | — | — | 22 pasos con datos simulados | ◐ técnica ✔; **usuarios y SUS pendientes** |
| **Extras (no estaban en tus funciones esenciales)** | | | | | | |
| X1 | Personal y capacitaciones | `/personal` | `staff` | `workers`, `training_topics`, `trainings`, `support_files` | `staff.test.ts`, `files.test.ts` | ✔ — [I] conviene justificarlas ante el director |
| X2 | Importar Excel/CSV | `/importar` | `imports` | `imports` | `imports.test.ts` | ✔ |
| X3 | Migrar datos locales | `/migrar` | `local-migrations` | `local_migrations` | `local-migrations.test.ts` | ✔ (solo 3 tipos; A6-1) |
| X4 | Marco legal | `/normativa` | — (datos en `frontend/src/normativa.ts`) | — | paso «normativa…» | ✔ [H] contenido estático en el frontend |

## 3. Lo que muestra la matriz

**Cubierto con evidencia (R1–R9, R11):** las 4 funciones esenciales, las cuentas, los roles y el aislamiento tienen pantalla, API, tabla y prueba.

**Brechas (por decidir, ninguna corregida):**
1. **PWA sin publicar (R10):** existe en una rama aparte. Hace falta unirla a la rama de Render y comprobar la instalación en un celular real (lo que probé fue por pruebas automáticas).
2. **Requerimientos formales (O2):** `rutas.md` es una propuesta; falta la lista de requerimientos validada con usuarios.
3. **Evidencia de campo (O1, O5):** el diagnóstico real y la evaluación de usabilidad (SUS) no están en el repositorio.
4. **Alcance ampliado (X1–X4):** hay módulos que tu propuesta no enumera como esenciales; no son un problema, pero conviene que el director los conozca.
5. **Datos personales de trabajadores (R12 ◐):** relacionada con A4-4.

## 4. Cruce con la Etapa 2
- **A3-3** (unidades mezcladas): el paso del navegador «residuos: unidades no se suman a kg» muestra que **la pantalla de residuos ya evita sumar unidades distintas**; falta revisar el reporte y la API. Baja el riesgo a **por verificar**, no a «resuelto».
- **A6-1** (respaldo del prototipo v1): es consistente con X3, que solo admite 3 tipos.

## 5. Límites de esta etapa
- Leí rutas, páginas y nombres de pruebas; **no** verifiqué una por una que cada prueba afirme lo que su nombre sugiere.
- La relación pantalla → API se confirmó por lectura de código y documentación, sin abrir cada pantalla en el navegador.
- No modifiqué código, base ni producción.

## Autoevaluación
1. ¿Qué requisito de tu propuesta tiene pantalla y API pero **no** evidencia con usuarios?
2. ¿Por qué `rutas.md` dice que la lista de rutas es una «propuesta» y qué consecuencia tiene para el objetivo 2?
3. ¿Qué falta para que R10 pase de ◐ a ✔?
