# 06 · Despliegue (publicar la aplicación)

## Qué es
**Desplegar** es poner FARMIX en un servidor de internet para que cualquiera la use desde una URL.
FARMIX se publica en **Render** como **un solo servicio**: el backend entrega también la interfaz compilada, así la web y la API comparten dirección.

| Pieza | Archivo real | Para qué |
|---|---|---|
| Imagen Docker | `farmix-app/Dockerfile` | Receta para empaquetar la aplicación: compila el frontend y el backend en una imagen lista para ejecutar |
| Arranque | `farmix-app/docker-entrypoint.sh` | Al iniciar: aplica las migraciones, (opcional) carga la demostración y enciende el servidor |
| Render | `farmix-app/render.yaml` | Declara el servicio web y la base de datos gestionada en Render |
| Variables | `farmix-app/.env.example` | Lista de configuraciones (sin valores reales) |

**Rama publicada:** según la documentación, Render construye desde la rama `claude/hopeful-maxwell-an8ywk`. Por eso los cambios de otras ramas solo llegan a https://farmix.onrender.com cuando se unen a esa rama (no se revisó la configuración del panel de Render).

## Configuración clave en producción
| Variable | Por qué importa |
|---|---|
| `DATABASE_URL` | La base de producción. **Nunca** la use en pruebas |
| `APP_ORIGIN` | Dirección pública; el backend rechaza cambios de datos que vengan de otro origen |
| `COOKIE_SECURE=true` | Obligatoria en producción: la configuración se niega a arrancar sin ella |
| `STATIC_DIR` | Carpeta del frontend compilado que el backend entrega |
| `SEED_DEMO`, `DEMO_PASSWORD` | Demostración opcional con datos simulados |

## Scripts
| Script | Qué hace | Estado |
|---|---|---|
| `bash scripts/produccion-local.sh` | Compila todo y lo sirve como en Render, en http://localhost:3000 (necesario para probar la PWA) | ✅ Verificado |
| `bash scripts/docker-local.sh` | Construye y ejecuta la imagen Docker contra su base local | ⚠️ No verificado (sin Docker en el entorno) |

Guía paso a paso para Render y Docker: [`farmix-app/docs/07-despliegue.md`](../../farmix-app/docs/07-despliegue.md).

## Autoevaluación
1. ¿Por qué en producción no hace falta CORS?
2. ¿Qué pasaría si `COOKIE_SECURE` fuera `false` en Render?
3. Hizo un cambio en otra rama: ¿qué falta para que se vea en farmix.onrender.com?
