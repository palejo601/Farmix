#!/usr/bin/env bash
# Crea en SU computador el usuario y las dos bases locales de FARMIX:
#   farmix_dev  → para usar la aplicación
#   farmix_test → para las pruebas (se borra y recrea en cada `npm test`)
# Necesita PostgreSQL 16 instalado y encendido. Se conecta como administrador con PG_ADMIN_URL
# (por defecto el usuario «postgres» local; si tiene contraseña, psql se la pedirá).
# Es seguro repetirlo: lo que ya existe no se toca.
source "$(dirname "$0")/../../scripts/_comun.sh"
requiere psql "Instale PostgreSQL 16: https://www.postgresql.org/download/"

ADMIN="${PG_ADMIN_URL:-postgres://postgres@$FARMIX_DB_HOST:$FARMIX_DB_PORT/postgres}"
sql() { psql "$ADMIN" -v ON_ERROR_STOP=1 -qAt -c "$1"; }

paso "Usuario «$FARMIX_DB_USER»"
if [ "$(sql "select 1 from pg_roles where rolname = '$FARMIX_DB_USER'")" = "1" ]; then echo "ya existe"
else sql "create role $FARMIX_DB_USER login password '$FARMIX_DB_PASS' createdb" && echo "creado"; fi

for BD in "$FARMIX_DB_DEV" "$FARMIX_DB_TEST"; do
  paso "Base «$BD»"
  if [ "$(sql "select 1 from pg_database where datname = '$BD'")" = "1" ]; then echo "ya existe"
  else sql "create database $BD owner $FARMIX_DB_USER" && echo "creada"; fi
done

# El archivo .env guarda la configuración del backend. Nunca se sobrescribe uno existente.
if [ ! -f "$APP/.env" ]; then
  paso "Creando farmix-app/.env para desarrollo local"
  sed -e "s#^DATABASE_URL=.*#DATABASE_URL=$URL_DEV#" -e "s#^TEST_DATABASE_URL=.*#TEST_DATABASE_URL=$URL_TEST#" \
    "$APP/.env.example" > "$APP/.env"
  echo "listo (está en .gitignore: no se sube a GitHub)"
else
  aviso "farmix-app/.env ya existe: no se modificó"
fi
paso "Siguiente paso: bash migrar.sh"
