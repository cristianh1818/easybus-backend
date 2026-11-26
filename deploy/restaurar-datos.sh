#!/usr/bin/env bash
# Restaura en la VM la base y las fotos exportadas con deploy/exportar-datos.ps1.
# Uso (en la VM):  cd /opt/easybus && bash deploy/restaurar-datos.sh [carpeta]
# Por defecto lee ~/migracion/easybus.dump y ~/migracion/uploads.tgz.
#
# ⚠️ REEMPLAZA por completo la base y las fotos de la VM. Antes guarda un respaldo
# de lo que había en backups/antes_de_restaurar_*.dump.
set -euo pipefail
cd "$(dirname "$0")/.."

CARPETA="${1:-$HOME/migracion}"
DUMP="$CARPETA/easybus.dump"
FOTOS="$CARPETA/uploads.tgz"
[ -f "$DUMP" ] || { echo "No existe $DUMP"; exit 1; }
[ -f .env ] || { echo "Falta el archivo .env en $(pwd)"; exit 1; }
# Lee solo lo necesario (el .env tiene valores con espacios: no se ejecuta con ".")
leer() { grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | tr -d '\r'; }
DB_NAME="$(leer DB_NAME)"; DB_USER="$(leer DB_USER)"; EASYBUS_HOST="$(leer EASYBUS_HOST)"
DC="docker compose -f docker-compose.prod.yml"

read -r -p "Esto reemplaza la base '$DB_NAME' y las fotos de la VM. ¿Seguir? (si/no) " r
[ "$r" = "si" ] || { echo "Cancelado"; exit 1; }

echo "1/5 Base encendida y API detenida..."
$DC up -d postgres respaldo
$DC stop api
until $DC exec -T postgres pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do sleep 2; done

echo "2/5 Respaldo de lo que había..."
# Lo escribe el contenedor "respaldo" (root, monta ./backups): la carpeta backups/ la
# crea Docker como root y azureuser no puede escribir en ella sin sudo.
ANTES="antes_de_restaurar_$(date +%Y%m%d_%H%M%S).dump"
if ! $DC exec -T respaldo pg_dump -Fc --no-owner --no-acl -f "/backups/$ANTES"; then
  echo "No se pudo respaldar la base actual: no se restaura nada."
  $DC up -d
  exit 1
fi
echo "   Guardado en backups/$ANTES"

echo "3/5 Restaurando la base..."
$DC cp "$DUMP" postgres:/tmp/easybus.dump
$DC exec -T postgres dropdb -U "$DB_USER" --if-exists --force "$DB_NAME"
$DC exec -T postgres createdb -U "$DB_USER" -O "$DB_USER" "$DB_NAME"
$DC exec -T postgres pg_restore -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl /tmp/easybus.dump
$DC exec -T postgres rm -f /tmp/easybus.dump

echo "4/5 Restaurando las fotos..."
if [ -f "$FOTOS" ]; then
  $DC run --rm --no-deps -T -v "$CARPETA:/migracion:ro" --entrypoint sh api \
    -c 'rm -f /app/uploads/* && tar -xzf /migracion/uploads.tgz -C /app --no-same-owner && ls /app/uploads | wc -l'
else
  echo "   (no hay $FOTOS, se omite)"
fi

echo "5/5 Encendiendo la API (aplica las migraciones que falten)..."
$DC up -d
for i in $(seq 1 30); do
  if curl -fsS "https://$EASYBUS_HOST/api/v1/health" 2>/dev/null | grep -q '"status":"ok"'; then
    echo "Listo: https://$EASYBUS_HOST/api/v1/health responde ok"
    exit 0
  fi
  sleep 3
done
echo "La API no respondió todavía. Revisa: docker compose logs --tail 100 api"
exit 1
