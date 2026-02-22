#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
REDEPLOY_BUILD="${REDEPLOY_BUILD:-0}"
REDEPLOY_PULL="${REDEPLOY_PULL:-0}"

if [ ! -f "$ENV_FILE" ]; then
  echo "[ERROR] root .env not found: $ENV_FILE"
  exit 1
fi

if [ ! -f "$PROJECT_ROOT/$COMPOSE_FILE" ]; then
  echo "[ERROR] compose file not found: $COMPOSE_FILE"
  exit 1
fi

cd "$PROJECT_ROOT"

if [ "$REDEPLOY_PULL" = "1" ]; then
  echo "[info] pull latest main (ff-only)"
  git pull --ff-only origin main
fi

echo "[info] backend fast restart (compose: $COMPOSE_FILE)"
if [ "$REDEPLOY_BUILD" = "1" ]; then
  if [ "${REDEPLOY_NO_CACHE:-0}" = "1" ]; then
    docker compose -f "$COMPOSE_FILE" build --no-cache backend
  else
    docker compose -f "$COMPOSE_FILE" build backend
  fi
fi

docker compose -f "$COMPOSE_FILE" up -d --force-recreate --no-deps backend
echo "[done] backend redeploy complete"
