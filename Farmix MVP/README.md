# Farmix MVP · guía de la aplicación por capas

Esta carpeta **explica** FARMIX capa por capa y trae **scripts** para ejecutar cada parte.
El código real está en [`../farmix-app`](../farmix-app): aquí no se duplica, se explica y se señala dónde está cada cosa.
Así nunca hay dos versiones del código que se contradigan, y el despliegue en Render no cambia.

> **FARMIX** es un producto mínimo viable (MVP) **en estudio** para apoyar la gestión de residuos, vencimientos,
> segregación, capacitación y PGIRASA en droguerías independientes de Sincelejo. Los datos de demostración son simulados.

## Mapa de carpetas

| Carpeta | Capa | Qué aprende aquí | Scripts |
|---|---|---|---|
| [`01-arquitectura`](01-arquitectura) | Visión general | Cómo se conectan las capas y el recorrido de un clic hasta la base de datos | — |
| [`02-frontend`](02-frontend) | 📱 Interfaz | React, pantallas, cómo la interfaz llama a la API, PWA | `iniciar.sh`, `compilar.sh` |
| [`03-backend`](03-backend) | ⚙️ API | Fastify, módulos (rutas, esquemas y servicios), seguridad | `iniciar.sh`, `revisar-tipos.sh` |
| [`04-base-de-datos`](04-base-de-datos) | 🗄️ Datos | PostgreSQL, migraciones y los modelos estructural, lógico y físico, con el diccionario | `crear-base-local.sh`, `migrar.sh`, `datos-demo.sh`, `generar-modelos.sh` |
| [`05-pruebas`](05-pruebas) | ✅ Calidad | Pruebas automáticas y de navegador | `pruebas.sh`, `prueba-navegador.sh` |
| [`06-despliegue`](06-despliegue) | ☁️ Publicación | Render, Docker y modo producción | `produccion-local.sh`, `docker-local.sh` |
| [`07-scripts-generales`](07-scripts-generales) | 🧰 Atajos | Instalar, encender todo y verificar todo | `instalar.sh`, `levantar-todo.sh`, `verificar-todo.sh` |
| [`08-trabajo-de-grado`](08-trabajo-de-grado) | 🎓 Académico | Relación con la propuesta, metodología y seguimiento de la tutoría | — |
| [`09-prototipo-v1`](09-prototipo-v1) | 🧪 Historia | La primera versión (un solo HTML) y en qué se diferencia | — |
| `scripts/_comun.sh` | — | Configuración compartida por todos los scripts | — |

## Ruta rápida (primera vez en su computador)

Requisitos: **Node.js 22**, **PostgreSQL 16** y una terminal **bash** (en Windows: Git Bash o WSL). Desde esta carpeta:

```bash
bash 07-scripts-generales/instalar.sh
```
```bash
bash 04-base-de-datos/scripts/crear-base-local.sh
```
```bash
bash 04-base-de-datos/scripts/migrar.sh
```
```bash
bash 04-base-de-datos/scripts/datos-demo.sh
```
```bash
bash 07-scripts-generales/levantar-todo.sh
```

Abra http://localhost:5173 e ingrese con `demo@ejemplo.test` y la contraseña que imprimió `datos-demo.sh`.

**Reglas de seguridad de estos scripts:** solo trabajan con bases **locales** (`farmix_dev` y `farmix_test`); nunca tocan la base de producción de Render.
`farmix_test` se **borra y recrea** en cada ejecución de pruebas. `farmix-app/.env` nunca se sube a GitHub.

## Verificación de los scripts (28/10/2026, Linux, Node 22, PostgreSQL 16)

| Script | Resultado |
|---|---|
| `crear-base-local.sh` | ✅ Crea usuario y bases; repetirlo no cambia nada; no sobrescribe un `.env` existente |
| `migrar.sh` | ✅ Aplica las 13 migraciones; la segunda vez, ninguna |
| `datos-demo.sh` | ✅ Crea la droguería de demostración |
| `generar-modelos.sh` | ✅ Regenera la documentación del modelo; sale idéntica (solo cambia la fecha interna del Excel) |
| `revisar-tipos.sh`, `compilar.sh`, `pruebas.sh` (con `verificar-todo.sh`) | ✅ Sin errores de tipos, compilación correcta y 391/391 pruebas |
| `iniciar.sh` (backend y frontend) con `levantar-todo.sh` | ✅ Ambos responden; el frontend llega a la API por el proxy; al detenerlo no queda ningún proceso |
| `prueba-navegador.sh` | ✅ 22/22 pasos en Chromium |
| `produccion-local.sh` | ✅ Web y API en una sola URL (`localhost:3000`) |
| `docker-local.sh` | ⚠️ **No verificado**: el entorno no tenía Docker |

## Cómo usar esta guía para estudiar

Lea las carpetas en orden: 01 → 04 → 03 → 02 → 05. Cada README termina con **preguntas de autoevaluación**:
si puede responderlas sin mirar, domina esa capa para la sustentación.
