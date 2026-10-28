#!/usr/bin/env bash
# Construye la misma imagen Docker que usa Render y la ejecuta contra la base local.
# Requiere Docker Desktop encendido. NO VERIFICADO en el entorno donde se escribió esta guía (sin Docker).
source "$(dirname "$0")/../../scripts/_comun.sh"
requiere docker "Instale Docker Desktop: https://www.docker.com/products/docker-desktop/"
paso "Construyendo la imagen farmix:local"
cd "$APP" && docker build -t farmix:local .
# Dentro del contenedor, «localhost» es el propio contenedor: host.docker.internal apunta a su computador
URL_DOCKER="postgres://$FARMIX_DB_USER:$FARMIX_DB_PASS@host.docker.internal:$FARMIX_DB_PORT/$FARMIX_DB_DEV"
paso "Ejecutando en http://localhost:3000"
exec docker run --rm -p 3000:3000 --add-host=host.docker.internal:host-gateway \
  -e DATABASE_URL="$URL_DOCKER" -e APP_ORIGIN=http://localhost:3000 -e COOKIE_SECURE=true farmix:local
