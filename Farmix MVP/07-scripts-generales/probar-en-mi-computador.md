# Probar FARMIX en mi computador (guía de arranque local)

Para ver y probar el MVP con **datos simulados**, sin tocar la base de Render. Los pasos usan los scripts del repositorio; esta guía **no se ha ejecutado de principio a fin en un computador limpio**, solo cada script por separado en la nube. Si algo falla, anota el mensaje exacto.

## Requisitos
- **Node.js 22** y **PostgreSQL 16** instalados.
- **bash**: en Windows, usa **Git Bash** o **WSL** (en PowerShell no funcionan los scripts).
- Git.

## Pasos (todos desde la raíz del repositorio)
**1. Descargar el código**
```bash
git clone https://github.com/palejo601/Farmix.git
```
```bash
cd Farmix && git checkout modelo-datos
```

**2. Instalar las librerías** (la primera vez tarda unos minutos)
```bash
bash "Farmix MVP/07-scripts-generales/instalar.sh"
```

**3. Crear la base local y su configuración** (crea `farmix-app/.env`, que no se sube a Git)
```bash
bash "Farmix MVP/04-base-de-datos/scripts/crear-base-local.sh"
```

**4. Crear las tablas**
```bash
bash "Farmix MVP/04-base-de-datos/scripts/migrar.sh"
```

**5. Cargar la droguería de demostración.** Imprime un correo y una contraseña **una sola vez: guárdalos**.
```bash
bash "Farmix MVP/04-base-de-datos/scripts/datos-demo.sh"
```

**6. Encender el sistema** (`Ctrl + C` lo apaga)
```bash
bash "Farmix MVP/07-scripts-generales/levantar-todo.sh"
```
Abre **http://localhost:5173** en el navegador e ingresa con el correo y la contraseña del paso 5. El backend queda en el puerto 3000.

## Qué probar
Haz las **7 tareas** del [protocolo SUS](../08-trabajo-de-grado/usabilidad-sus/protocolo-sus.md) como si fueras un participante y anota tiempo y dudas: te sirve de **piloto** y para calibrar los tiempos máximos.
También puedes crear una cuenta nueva desde `/registro` para ver el primer uso.

## Si algo falla
| Síntoma | Qué probar |
|---|---|
| No conecta a la base | PostgreSQL está apagado: enciéndelo desde el servicio de Windows, o con `pg_ctl start`, o `service postgresql start` en Linux/WSL |
| El paso 5 se niega a correr | Hay que ejecutarlo en modo desarrollo: `NODE_ENV=development` y `APP_ORIGIN=http://localhost:5173` en la terminal (en la nube me pasó esto; no sé si te pasará a ti) |
| `command not found` o errores raros con `bash` | Estás en PowerShell: abre Git Bash o WSL |
| El puerto 3000 o 5173 está ocupado | Cierra el programa que lo usa o cambia `PORT` en `farmix-app/.env` |
| Quieres comprobar que todo está sano | `bash "Farmix MVP/07-scripts-generales/verificar-todo.sh"` (revisa tipos, compila y corre las 391 pruebas; usa una base de pruebas aparte) |

## Cuidados
- Es una base **local y desechable**: no pongas datos reales de droguerías ni de trabajadores.
- No uses la base ni las claves de Render para estas pruebas.
- Con el correo en modo desarrollo, los enlaces de recuperación de contraseña se guardan en la base local (hallazgo A1-1); por eso es solo para pruebas.
