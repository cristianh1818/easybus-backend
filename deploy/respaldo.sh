#!/bin/sh
# Respaldo diario de EASYBUS (corre dentro del servicio "respaldo" de
# docker-compose.prod.yml). Cada día, a partir de HORA_RESPALDO (hora de Bogotá):
#   - /backups/easybus_AAAAMMDD.dump   base completa (pg_dump formato custom)
#   - /backups/uploads_AAAAMMDD.tgz    fotos de los embarcaderos
# y borra los de más de DIAS_RESPALDO días.
# Respaldo manual inmediato:
#   docker compose exec respaldo sh /respaldo.sh ahora
set -eu

HORA="${HORA_RESPALDO:-3}"
DIAS="${DIAS_RESPALDO:-7}"

respaldar() {
  dia=$(date +%Y%m%d)
  echo "$(date '+%F %T') respaldo: inicio $dia"
  pg_dump -Fc --no-owner --no-acl -f "/backups/easybus_$dia.dump.tmp"
  mv "/backups/easybus_$dia.dump.tmp" "/backups/easybus_$dia.dump"
  tar -czf "/backups/uploads_$dia.tgz" -C / uploads
  find /backups -maxdepth 1 \( -name 'easybus_*.dump' -o -name 'uploads_*.tgz' \) \
    -mtime +"$((DIAS - 1))" -print -delete
  echo "$(date '+%F %T') respaldo: listo $(du -h "/backups/easybus_$dia.dump" | cut -f1)"
}

if [ "${1:-}" = "ahora" ]; then
  respaldar
  exit 0
fi

echo "respaldo: diario desde las ${HORA}:00, se guardan ${DIAS} días"
while true; do
  dia=$(date +%Y%m%d)
  hora=$(date +%H | sed 's/^0//')
  if [ "${hora:-0}" -ge "$HORA" ] && [ ! -f "/backups/easybus_$dia.dump" ]; then
    respaldar || echo "$(date '+%F %T') respaldo: FALLÓ (se reintenta en 1 hora)"
  fi
  sleep 3600
done
