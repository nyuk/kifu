#!/usr/bin/env bash
set -euo pipefail

API_URL="${1:-${KIFU_API_URL:-http://127.0.0.1:8080}}"
FRONTEND_URL="${2:-${KIFU_FRONTEND_URL:-http://127.0.0.1:5173}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> Step 1: API smoke pre-deploy suite"
if ! bash "$PROJECT_ROOT/scripts/predeploy-e2e-test.sh" "$API_URL"; then
  echo "[FAIL] API smoke suite failed"
  exit 1
fi
echo "✓ API smoke suite passed"

echo "==> Step 2: UI smoke (Playwright)"
cd "$PROJECT_ROOT/frontend"
BACKEND_API_URL="${API_URL%/api/v1}"
BACKEND_API_URL="${BACKEND_API_URL%/api}"
BACKEND_API_URL="${BACKEND_API_URL%/}"

BACKEND_API_URL="$BACKEND_API_URL" \
  FRONTEND_BASE_URL="$FRONTEND_URL" \
  PLAYWRIGHT_BASE_URL="$FRONTEND_URL" \
  npm run e2e:smoke
echo "✓ UI smoke suite passed"

echo "✅ Full QA suite complete"
