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

cd "$PROJECT_ROOT"

if [ ! -f "$PROJECT_ROOT/$COMPOSE_FILE" ]; then
  echo "[error] compose file not found: $COMPOSE_FILE"
  echo "Hint: set COMPOSE_FILE explicitly (e.g. COMPOSE_FILE=docker-compose.prod.yml)."
  exit 1
fi

echo "[info] recreate frontend from root .env (compose: $COMPOSE_FILE)"
docker compose -f "$COMPOSE_FILE" down --remove-orphans frontend
docker image rm -f kifu-frontend || true
docker compose -f "$COMPOSE_FILE" build --no-cache frontend
docker compose -f "$COMPOSE_FILE" up -d --force-recreate frontend

echo "[done] frontend redeploy complete"
