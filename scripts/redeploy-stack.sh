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
docker compose -f "$COMPOSE_FILE" down --remove-orphans
docker compose -f "$COMPOSE_FILE" build --no-cache backend frontend
docker compose -f "$COMPOSE_FILE" up -d --force-recreate
docker compose -f "$COMPOSE_FILE" ps

echo "[done] deployment stack restarted"
