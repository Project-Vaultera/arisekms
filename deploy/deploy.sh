#!/usr/bin/env bash
# Manual production rollout on the VPS.
#
#   ./deploy/deploy.sh
#
# Pulls the images referenced in .env.production, starts the stack, and waits
# for health. Pending migrations run at API startup (see docker-entrypoint.sh).
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
COMPOSE_FILE="$APP_DIR/docker-compose.prod.yml"
ENV_FILE="$APP_DIR/.env.production"

cd "$APP_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy .env.production.template and fill it in." >&2
  exit 1
fi

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

compose pull
compose up -d --remove-orphans --wait --wait-timeout 300
docker image prune -f
compose ps
