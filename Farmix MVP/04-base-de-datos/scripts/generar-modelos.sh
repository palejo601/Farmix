#!/usr/bin/env bash
# Vuelve a generar los modelos y el diccionario de datos (carpeta modelo-datos/) desde la base local.
# Úselo cada vez que agregue una migración: así la documentación nunca queda desactualizada.
source "$(dirname "$0")/../../scripts/_comun.sh"
requiere psql "Instale PostgreSQL 16."
requiere python3 "Instale Python 3 (y openpyxl para el Excel: pip install openpyxl)."
entorno_local
M="$(dirname "$0")/../modelo-datos"
paso "Extrayendo el catálogo de ${DATABASE_URL##*/}"
psql "$DATABASE_URL" -At -f "$M/catalogo.sql" > "$M/catalogo.json"
paso "Generando diccionario, relaciones, modelo físico, diagramas Mermaid y SQL para drawDB"
python3 "$M/generar.py"
aviso "Las imágenes .svg/.png no se regeneran aquí: exporte los .mmd desde https://mermaid.live/edit"
