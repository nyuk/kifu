#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "[ERROR] root .env not found: $ENV_FILE"
  echo "Create it from .env.example and set frontend vars."
  exit 1
fi

if [ ! -f "$PROJECT_ROOT/frontend/package.json" ]; then
  echo "[ERROR] frontend package.json not found"
  exit 1
fi

echo "[info] loading env from ${ENV_FILE}"
set -a
. "$ENV_FILE"
set +a

if [ -z "${NEXT_PUBLIC_API_BASE_URL:-}" ] || [ -z "${NEXT_PUBLIC_APP_MODE:-}" ]; then
  echo "[ERROR] NEXT_PUBLIC_API_BASE_URL and NEXT_PUBLIC_APP_MODE are required in root .env"
  exit 1
fi

cd "$PROJECT_ROOT/frontend"
echo "[info] start local dev: npm run dev"
npm run dev
