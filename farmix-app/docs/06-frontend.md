# 6. Interfaz web (frontend)

Aplicación de una sola página para el **producto mínimo viable (MVP) en estudio** FARMIX. Consume la API de este repositorio tal como está (no hay cambios de contrato).

## Cómo ejecutarla

```bash
# 1) Backend (puerto 3000), con PostgreSQL 16 en marcha
npm run migrate && npm run seed:demo && npm run dev

# 2) Frontend (puerto 5173)
cd frontend && npm install && npm run dev
```

Abra <http://localhost:5173>. `seed:demo` imprime el correo y una contraseña aleatoria de la cuenta de demostración (datos **simulados**).

- El puerto **5173 es fijo** (`strictPort`): el backend valida que el `Origin` de las peticiones que cambian datos sea `APP_ORIGIN` (por defecto `http://localhost:5173`).
- Vite reenvía `/api` al backend (`API_URL`, por defecto `http://localhost:3000`), de modo que el navegador usa un solo origen y la cookie de sesión `httpOnly` funciona sin configurar nada. El backend también tiene CORS restringido a `APP_ORIGIN` por si se sirve desde otro origen.
- Recuperar contraseña: en `MAIL_MODE=dev` el correo no se envía; el código queda en la tabla `dev_mailbox` (la pantalla muestra el comando `psql` para leerlo).

## Pantallas

| Pantalla | Qué hace |
|---|---|
| Ingreso, registro (con aceptación del aviso de privacidad), recuperar contraseña | Cuentas y sesión |
| Mis droguerías | Lista y creación |
| Resumen | Reporte consolidado con periodo editable, barras por clasificación, segregación, personal, plan y último diagnóstico; imprimible |
| Vencimientos | Alta/edición/borrado, filtro por estado, pérdida confirmada y valor en riesgo, destino |
| Residuos | Registro por fecha, clasificación, cantidad y unidad; regla «medicamento vencido ≠ riesgo biológico» |
| Segregación | Verificaciones con porcentaje calculado por la API |
| Personal y capacitación | Trabajadores, temas y capacitaciones (pendiente/vigente/vencida), con soporte PDF/imagen |
| Plan de mejoramiento | Acciones con estado; cerrar exige fecha de cierre; marca de atraso |
| Diagnóstico | Cuestionario 1–5 por ítem, madurez por área y global |
| Importar Excel / CSV | Vista previa (no guarda), tabla fila a fila, confirmación, plantilla CSV |
| Migrar datos locales | Pegar o cargar JSON, vista previa, confirmar y revertir |
| Miembros / Configuración | Roles, alta y retiro; edición y borrado de la droguería (según rol) |
| Mi cuenta | Perfil, cambio de contraseña, descarga de datos, solicitud/cancelación de eliminación (15 días) |

La interfaz muestra en todo momento el rótulo «producto mínimo viable en estudio · indicadores = hipótesis por validar · datos de demostración simulados». Los botones de borrado se ocultan para el rol operador; aun así **la autorización real la hace el backend** (la interfaz solo evita acciones que fallarían).

## Estructura

```
frontend/
  src/api.ts            Cliente HTTP (errores de la API con detalle por campo, 401 → cierra sesión)
  src/auth.tsx          Contexto de sesión
  src/CrudPage.tsx      Tabla + formulario genérico dirigido por configuración (vencimientos, residuos, segregación, personal, plan)
  src/pages/*           Pantallas específicas (resumen, diagnóstico, importación, migración, miembros, cuenta)
  src/styles.css        Estilos (claro/oscuro automático, responsive, foco visible)
  e2e/ui-smoke.cjs      Recorrido de extremo a extremo con Playwright
```

Dependencias: React 19, React Router 7, Vite 8, TypeScript. Sin librerías de interfaz.

## Pruebas realizadas

- `npm run build` (compilación TypeScript estricta + empaquetado) sin errores.
- `e2e/ui-smoke.cjs` (Playwright/Chromium contra servidores reales): **18 de 18 pasos correctos**, sin errores de consola ni respuestas 5xx. Cubre ingreso fallido y exitoso, resumen, alta y gestión de producto, error de duplicado, regla de residuos, validación de segregación, trabajador→tema→capacitación (pendiente→vigente), cierre de acción con fecha, diagnóstico, importación en dos pasos, migración local con reversión, miembros, cuenta, cierre de sesión, ruta protegida, registro con aviso de privacidad y menú móvil.

```bash
DEMO_PASSWORD='<la que imprimió seed:demo>' SHOTS=/tmp/capturas node frontend/e2e/ui-smoke.cjs
```
(Crea datos de ejemplo en la droguería de demostración: úsela con una base desechable.)

## Límites (honestidad)

- El prototipo original no estuvo disponible: esta interfaz está hecha **contra esta API**, no contra el diseño del prototipo; no replica su aspecto ni sus flujos.
- No hay pruebas unitarias de componentes; la cobertura es el recorrido E2E anterior.
- Accesibilidad: etiquetas, roles, foco visible y navegación por teclado básica; **no** se hizo una auditoría formal (lector de pantalla, contraste con herramienta).
- Los formatos de fecha de los campos `date` dependen del idioma del navegador.
- Sin paginación por páginas: «Cargar más» (100 por tanto).
- No hay edición de diagnósticos eliminados ni gestión de versiones del instrumento (la API no la ofrece).
- Producción: falta definir cómo se sirve el frontend compilado (`frontend/dist`); el backend no lo sirve (`STATIC_DIR` no implementado). Un proxy inverso (nginx, Caddy) delante de ambos resuelve el origen único.
