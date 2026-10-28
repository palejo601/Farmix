# Modelos de datos de FARMIX

Todo lo de esta carpeta se **genera desde el catálogo real de PostgreSQL** (las 13 migraciones aplicadas), no a mano.
Las explicaciones funcionales están en `descripciones.json` y se presentan siempre como interpretación.

## Entregables

| Archivo | Qué es | Cómo abrirlo |
|---|---|---|
| `modelo-estructural.md` (+ `.svg`, `.png`) | Vista de alto nivel: 6 áreas funcionales y cómo se conectan | GitHub o cualquier visor de Markdown |
| `modelo-logico-general.mmd` (+ `.svg`, `.png`) | Las 23 tablas, solo con columnas clave (PK, FK y únicas) y sin relaciones de auditoría | Mermaid Live |
| `modelo-logico-completo.mmd` (+ `.svg`, `.png`) | Las 23 tablas con las 234 columnas y las 51 relaciones | Mermaid Live (es grande: use el zoom) |
| `areas/A1.mmd` … `A6.mmd` (+ `.svg`, `.png`) | Un diagrama por área; las tablas de otras áreas aparecen como «ver otra área» | Mermaid Live |
| `relaciones.csv` | Las 51 claves foráneas: origen, columnas, destino, `ON DELETE`, obligatoriedad y tipo | Excel (separador `;`) |
| `diccionario-datos.xlsx` / `.csv` / `.md` | Las 234 columnas: tipo, clave, NULL, valor predeterminado, referencia, función y validaciones | Excel o GitHub |
| `modelo-fisico.md` | Implementación exacta en PostgreSQL: tipos, valores predeterminados, restricciones e índices de cada tabla | GitHub |
| `farmix-drawdb.sql` | SQL simplificado para dibujar el diagrama en drawDB (**no es una migración**) | drawDB |
| `catalogo.sql`, `catalogo.json`, `generar.py` | Extracción del catálogo y generador de todo lo anterior | — |

En los diagramas lógicos, cada atributo lleva marcas: **PK** (clave primaria), **FK** (clave foránea) y **UK** (único, incluidos los índices únicos parciales). La palabra «opcional» indica que la columna admite `NULL`.
Las cardinalidades usan la notación de pata de gallo: `||` = exactamente uno, `|o` = cero o uno, `o{` = cero o muchos.
Los tipos con precisión se muestran sin ella en Mermaid (por ejemplo, `numeric(10,3)` aparece como `numeric`); la precisión exacta está en el diccionario y en el modelo físico.

## Verificación realizada (28/10/2026)

| Prueba | Resultado |
|---|---|
| Conteo del catálogo frente a `docs/schema.sql` y las migraciones | Coinciden: 23 tablas |
| `farmix-drawdb.sql` ejecutado en una base PostgreSQL vacía | Válido: recrea 23 tablas, 234 columnas y 51 claves foráneas |
| `farmix-drawdb.sql` leído con `node-sql-parser` 5.3.10 (la librería que usa drawDB para importar) | Correcto: 23 `CREATE TABLE` y 51 `ALTER TABLE` |
| `docs/schema.sql` original con el mismo parser | **Falla** (el volcado de `pg_dump` incluye `\restrict`, `SET` y otras órdenes que no son SQL estándar) |
| Los 9 diagramas Mermaid dibujados con Mermaid 11.4.1 | Correctos; de ahí salen los `.svg` y `.png` |
| **Importación en el sitio real de drawDB** | **No verificada**: el sitio no era accesible desde el entorno de trabajo. Siga los pasos de abajo para comprobarlo |

## Herramientas para visualizar

| Herramienta | Para qué conviene | Enlace |
|---|---|---|
| **Mermaid Live Editor** | Ver y exportar los diagramas `.mmd` sin instalar nada | https://mermaid.live/edit |
| **drawDB** | Mover las tablas a mano y armar un diagrama propio para el documento | https://www.drawdb.app/editor |
| **pgAdmin** | Ver el modelo directamente desde una base PostgreSQL real, con todas las restricciones | https://www.pgadmin.org/ |
| **DBeaver** | Igual que pgAdmin, con un diagrama ER automático muy cómodo | https://dbeaver.io/ |

### Mermaid Live (lo más rápido)
1. Abra https://mermaid.live/edit.
2. Borre el ejemplo del panel izquierdo y pegue el contenido de un `.mmd` (empiece por `areas/A4.mmd`, que es pequeño).
3. El diagrama aparece a la derecha. Use **Actions → PNG o SVG** para descargarlo.
Limitación: con el diagrama completo el navegador puede tardar; prefiera las vistas por área.

### drawDB
1. Abra https://www.drawdb.app/editor y elija **PostgreSQL** como base de datos.
2. Menú **File → Import from → SQL** y cargue `farmix-drawdb.sql`.
3. Las tablas aparecen amontonadas: arrástrelas por áreas. Las líneas son las claves foráneas; al pasar el cursor se ven las columnas que unen.
4. Exporte con **File → Export as → PNG, SVG o PDF**.
Si la importación falla, anote el mensaje de error: puede deberse a una versión del importador distinta a la probada.

**Qué omite `farmix-drawdb.sql` respecto al esquema real** (por eso no sirve como migración):
- Las 77 restricciones `CHECK` (por ejemplo, la que impide clasificar un medicamento vencido como riesgo biológico).
- Los índices, incluidos los **9 índices únicos parciales o con expresiones** (como `users_email_lower_uq` sobre `lower(email)` o `workers_code_uq … WHERE deleted_at IS NULL`). Esas reglas de unicidad no se verán en drawDB.
- Los valores predeterminados con funciones (`gen_random_uuid()`, `now()`) y las columnas `IDENTITY`.
- `timestamptz` se escribe como `timestamp` para que el importador lo reconozca.
- Se conservan: tablas, columnas, tipos, `NOT NULL`, valores predeterminados simples, claves primarias (incluida la compuesta de `diagnosis_area_scores`), `UNIQUE` declarados y las 51 claves foráneas con su `ON DELETE`.

### pgAdmin o DBeaver (el modelo completo y real)
1. Cree una base de datos **local y vacía**. Nunca use la de producción en Render.
2. Aplique el esquema con `npm run migrate` (con `DATABASE_URL` apuntando a esa base local) o ejecute `docs/schema.sql` con `psql`.
3. **pgAdmin:** clic derecho sobre la base → **ERD For Database**. **DBeaver:** abra la base → esquema `public` → pestaña **ER Diagram**.
4. Ambas permiten exportar la imagen. Aquí sí se ven los `CHECK` y los índices.

## Cómo regenerar todo

```bash
psql "$DATABASE_URL" -At -f catalogo.sql > catalogo.json   # base local con las migraciones aplicadas
python3 generar.py                                         # requiere openpyxl para el Excel
```

Los `.svg` y `.png` se dibujaron con Mermaid 11.4.1 en Chromium. También puede exportarlos desde Mermaid Live.
