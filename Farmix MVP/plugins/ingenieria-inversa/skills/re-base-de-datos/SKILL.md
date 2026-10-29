---
name: re-base-de-datos
description: "Reconstruye el modelo de datos (tablas, columnas, claves, relaciones, restricciones, índices) desde migraciones, ORM o un volcado de esquema, y evalúa su integridad. Úsalo para obtener un diccionario de datos o un diagrama entidad-relación de una base sin documentar."
---

# Base de datos

## Flujo
1. **Fuente:** migraciones, esquema del ORM o `pg_dump --schema-only`; nunca la base de producción.
2. **Inventario:** tablas, columnas, tipos, nulos, valores por defecto.
3. **Relaciones:** claves primarias y foráneas, cardinalidades, tablas puente.
4. **Restricciones e índices:** UNIQUE, CHECK, índices faltantes en claves foráneas.
5. **Integridad:** datos huérfanos posibles, duplicados, campos libres que deberían ser catálogos.
6. **Salida:** diccionario de datos, diagrama (Mermaid o SQL para drawDB) y hallazgos `[H]/[I]/[R]` con prioridad P0-P3.
7. **Cambios:** solo como propuesta en migraciones nuevas y con respaldo previo; no los apliques sin acuerdo.

## Reglas comunes
1. **Autorización:** confirma que el objetivo es del usuario o que tiene permiso. No ayudes a evadir licencias, DRM o protecciones, ni a extraer credenciales; si aparece un secreto, repórtalo sin copiarlo.
2. **Solo lectura:** no modifiques el objetivo; ejecuta código no confiable solo en un directorio aislado y nunca contra producción.
3. **Etiqueta:** `[H]` hecho (con evidencia: archivo:línea o salida), `[I]` inferencia, `[R]` recomendación. No inventes nada y no afirmes haber ejecutado lo que no ejecutaste.
4. **Ahorra tokens:** busca antes de leer, lee por partes, resume.
