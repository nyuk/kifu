#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

if [ ! -f "$ENV_FILE" ]; then
  echo "[ERROR] root .env not found: $ENV_FILE"
  exit 1
fi

if [ ! -f "$PROJECT_ROOT/$COMPOSE_FILE" ]; then
  echo "[ERROR] compose file not found: $COMPOSE_FILE"
  exit 1
fi

cd "$PROJECT_ROOT"

echo "[info] full stack redeploy (compose: $COMPOSE_FILE)"
if [ "${REDEPLOY_FULL_CLEAN:-0}" = "1" ]; then
  echo "[info] full clean requested: recreating all containers and rebuilding without cache"
  docker compose -f "$COMPOSE_FILE" down --remove-orphans
  docker compose -f "$COMPOSE_FILE" build --no-cache backend frontend
  docker compose -f "$COMPOSE_FILE" up -d --force-recreate backend frontend
  exit 0
fi

if [ "${REDEPLOY_NO_CACHE:-0}" = "1" ]; then
  echo "[info] cache bypass requested: rebuilding backend/frontend with --no-cache"
  docker compose -f "$COMPOSE_FILE" build --no-cache backend frontend
else
  echo "[info] incremental build using Docker cache"
  docker compose -f "$COMPOSE_FILE" build backend frontend
fi

docker compose -f "$COMPOSE_FILE" up -d --force-recreate --no-deps backend frontend
docker compose -f "$COMPOSE_FILE" ps

echo "[done] deployment stack restarted"
