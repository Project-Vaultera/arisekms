#!/bin/sh
set -eu

# Apply pending TypeORM migrations before serving traffic. TypeORM records
# applied migrations in the `migrations` table, so this is idempotent and safe
# on every start. Set RUN_MIGRATIONS=false for extra replicas when you scale
# the API (run migrations once, separately).
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  npm run migration:run:prod
fi

exec "$@"
