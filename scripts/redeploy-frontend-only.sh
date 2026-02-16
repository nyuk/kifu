#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "[ERROR] root .env not found: $ENV_FILE"
  exit 1
fi

cd "$PROJECT_ROOT"

echo "[info] recreate frontend from root .env (docker-compose env_file)"
docker compose down --remove-orphans frontend
docker image rm -f kifu-frontend || true
docker compose build --no-cache frontend
docker compose up -d --force-recreate frontend

echo "[done] frontend redeploy complete"
