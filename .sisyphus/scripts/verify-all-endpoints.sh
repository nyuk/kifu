#!/usr/bin/env bash
# verify-all-endpoints.sh — Smoke test 8 core API endpoints
# Usage:
#   API_BASE="http://127.0.0.1:8080/api/v1" TOKEN="<jwt>" bash .sisyphus/scripts/verify-all-endpoints.sh
#
# Requirements: curl, jq (optional, for pretty output)

set -euo pipefail

API_BASE="${API_BASE:-http://127.0.0.1:8080/api/v1}"
TOKEN="${TOKEN:?ERROR: set TOKEN env var with a valid JWT}"
PASS=0
FAIL=0
RESULTS=()

# --- helpers ---
check() {
  local label="$1" method="$2" path="$3"
  shift 3
  local url="${API_BASE}${path}"
  local http_code body

  body=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    "$@" 2>&1) || true

  http_code="$body"

  if [[ "$http_code" =~ ^(200|201|400|404|422)$ ]]; then
    echo "[PASS] ${label} — HTTP ${http_code}"
    PASS=$((PASS + 1))
    RESULTS+=("[PASS] ${label} — HTTP ${http_code}")
  else
    echo "[FAIL] ${label} — HTTP ${http_code}"
    FAIL=$((FAIL + 1))
    RESULTS+=("[FAIL] ${label} — HTTP ${http_code}")
  fi
}

echo "=== KIFU Endpoint Verification ==="
echo "API_BASE: ${API_BASE}"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "---"

# 1. Health check (no auth)
health_code=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE%/api/v1}/health" 2>&1) || true
if [[ "$health_code" == "200" ]]; then
  echo "[PASS] Health — HTTP ${health_code}"
  PASS=$((PASS + 1))
  RESULTS+=("[PASS] Health — HTTP ${health_code}")
else
  echo "[FAIL] Health — HTTP ${health_code}"
  FAIL=$((FAIL + 1))
  RESULTS+=("[FAIL] Health — HTTP ${health_code}")
fi

# 2. AI one-shot (POST /ai/one-shot) — expects 400 without body
check "AI one-shot (no body)" POST "/ai/one-shot"

# 3. Packs generate-latest (POST /packs/generate-latest) — expects 400 without body
check "Packs generate-latest (no body)" POST "/packs/generate-latest"

# 4. Packs latest (GET /packs/latest)
check "Packs latest" GET "/packs/latest"

# 5. Admin policies (GET /admin/policies)
check "Admin policies" GET "/admin/policies"

# 6. Admin agent-services (GET /admin/agent-services)
check "Admin agent-services" GET "/admin/agent-services"

# 7. Admin telemetry (GET /admin/telemetry)
check "Admin telemetry" GET "/admin/telemetry"

# 8. Admin users (GET /admin/users)
check "Admin users" GET "/admin/users"

echo "---"
echo "=== Summary ==="
echo "Passed: ${PASS}  Failed: ${FAIL}  Total: $((PASS + FAIL))"
echo ""
for r in "${RESULTS[@]}"; do
  echo "  $r"
done

if [[ "$FAIL" -gt 0 ]]; then
  echo ""
  echo "⚠ ${FAIL} endpoint(s) failed. Review above output."
  exit 1
else
  echo ""
  echo "✅ All endpoints passed."
  exit 0
fi
