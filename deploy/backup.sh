#!/usr/bin/env bash
# Dump the production database to ./backups and keep the last 14 days.
#
#   ./deploy/backup.sh
#
# Suggested cron (daily 03:15 UTC):
#   15 3 * * * /opt/arisekms/deploy/backup.sh >> /var/log/arisekms-backup.log 2>&1
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ENV_FILE="$APP_DIR/.env.production"
COMPOSE_FILE="$APP_DIR/docker-compose.prod.yml"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"

cd "$APP_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

mkdir -p "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="$BACKUP_DIR/arisekms-$stamp.dump"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T pgsqldb \
  pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$out"

echo "Wrote $out ($(du -h "$out" | cut -f1))"

# Retention: delete dumps older than 14 days.
find "$BACKUP_DIR" -type f -name 'arisekms-*.dump' -mtime +14 -delete
