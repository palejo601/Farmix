# FARMIX · prototipo v1 (solo demostración)

Primera iteración de FARMIX, conservada como evidencia del proceso de diseño (Design Science Research / Lean Startup).
Se publicó en Vercel y **solo se usó para demostración**: no contiene ni gestionó datos reales.

| Archivo | Contenido |
|---|---|
| `index.html` | La aplicación completa en un solo archivo (interfaz, lógica y almacenamiento). |
| `presentacion.html` | Página de presentación del producto, con cifras simuladas. |

## En qué se diferencia de la versión actual (`farmix-app/`)

| | Prototipo v1 | Versión actual (v2) |
|---|---|---|
| Datos | En el navegador de cada persona (`localStorage`; soportes en `IndexedDB`) | Servidor PostgreSQL (23 tablas) |
| Seguridad | Hash con sal en el navegador; el propio código advierte que no es seguridad real | Servidor con sesiones, roles y aislamiento por droguería |
| Módulos | Vencimientos, residuos, personal y capacitaciones, diagnóstico y plan de mejora | Lo anterior más verificación de segregación, importaciones, miembros por droguería y auditoría |

Para verlo, abra `index.html` en un navegador: los datos que registre quedan solo en ese navegador.
No es la base de la versión actual: la v2 se construyó sin tener este archivo disponible (ver `farmix-app/docs/05-resultado-de-pruebas.md`).
