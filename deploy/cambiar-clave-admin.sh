#!/usr/bin/env bash
# Cambia la clave de un administrador de EASYBUS en la VM.
# Uso:  cd /opt/easybus && bash deploy/cambiar-clave-admin.sh
#
# - Pide el correo y la clave nueva dos veces, sin mostrarla en pantalla.
# - La clave nunca va en la línea de comandos (ni en el historial ni en "ps"): se pasa
#   por la entrada estándar al contenedor de la API, que calcula el hash con
#   dist/usuarios/contrasena.js (bcryptjs y el mismo costo que usa la API).
# - Solo el hash llega a PostgreSQL, que no registra las consultas (log_statement=none).
# - Los tokens ya emitidos siguen valiendo hasta que vencen (JWT_EXPIRES_IN, 1 hora).
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "Falta el archivo .env en $(pwd)"; exit 1; }
leer() { grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | tr -d '\r'; }
DB_NAME="$(leer DB_NAME)"; DB_USER="$(leer DB_USER)"
DC="docker compose -f docker-compose.prod.yml"

CLAVE=""; CLAVE2=""
trap 'unset CLAVE CLAVE2 HASH' EXIT

# </dev/null: sin esto "docker compose exec" se queda con lo que escribas después
if ! $DC exec -T api test -f /app/dist/usuarios/contrasena.js </dev/null; then
  echo "La API no está encendida o es una versión anterior."
  echo "Ejecuta primero: docker compose up -d --build"
  exit 1
fi

read -r -p "Correo del administrador: " CORREO
CORREO="$(printf '%s' "$CORREO" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
if ! [[ "$CORREO" =~ ^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$ ]]; then
  echo "Correo no válido"; exit 1
fi

read -r -s -p "Clave nueva (no se ve al escribir): " CLAVE; echo
read -r -s -p "Repite la clave nueva: " CLAVE2; echo
if [ "$CLAVE" != "$CLAVE2" ]; then echo "Las claves no coinciden"; exit 1; fi
if [ "${#CLAVE}" -lt 12 ]; then echo "La clave debe tener al menos 12 caracteres"; exit 1; fi
# bcrypt solo usa los primeros 72 bytes: lo que pase de ahí se ignoraría
if [ "$(printf '%s' "$CLAVE" | wc -c)" -gt 72 ]; then
  echo "La clave es demasiado larga (máximo 72 bytes)"; exit 1
fi

# printf es interno de bash: la clave no aparece como argumento de ningún proceso
HASH="$(printf '%s' "$CLAVE" | $DC exec -T api node --input-type=module -e '
  import { hashContrasena } from "/app/dist/usuarios/contrasena.js";
  let clave = "";
  for await (const parte of process.stdin) clave += parte;
  process.stdout.write(await hashContrasena(clave));
')"
unset CLAVE CLAVE2

if ! [[ "$HASH" =~ ^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$ ]]; then
  echo "No se pudo calcular el hash"; exit 1
fi

# El hash también va por la entrada estándar (\set), no como argumento
RESULTADO="$(printf '%s\n' \
  "\\set hash '$HASH'" \
  "UPDATE usuarios SET contrasena_hash = :'hash' WHERE correo = :'correo' AND rol = 'administrador' RETURNING correo;" \
  | $DC exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -v correo="$CORREO" -qtA)"
unset HASH

if [ "$RESULTADO" = "$CORREO" ]; then
  echo "Listo: clave cambiada para $CORREO. Inicia sesión en el panel con la clave nueva."
else
  echo "No hay un administrador con el correo $CORREO (no se cambió nada)."
  exit 1
fi
