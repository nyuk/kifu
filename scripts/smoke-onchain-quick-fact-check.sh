#!/usr/bin/env bash
set -euo pipefail

API_BASE="${KIFU_API_BASE:-http://127.0.0.1:8080}"
EMAIL="${KIFU_SMOKE_EMAIL:-}"
PASSWORD="${KIFU_SMOKE_PASSWORD:-}"
CHAIN="${KIFU_SMOKE_CHAIN:-base}"
ADDRESS="${KIFU_SMOKE_ADDRESS:-0x0000000000000000000000000000000000000000}"
LOOKBACK="${KIFU_SMOKE_LOOKBACK:-300}"
MAX_TXS="${KIFU_SMOKE_MAX_TXS:-200}"
MAX_EVENTS="${KIFU_SMOKE_MAX_EVENTS:-1000}"

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo "[ERROR] missing test credentials."
  echo "Set KIFU_SMOKE_EMAIL and KIFU_SMOKE_PASSWORD."
  exit 1
fi

clean_url="${API_BASE%/}"
if [[ "$clean_url" == */api/v1 ]]; then
  API_V1_BASE="$clean_url"
else
  API_V1_BASE="${clean_url}/api/v1"
fi

login_resp="$(mktemp)"
jobs_resp="$(mktemp)"
trap 'rm -f "$login_resp" "$jobs_resp"' EXIT

echo "[1] login"
login_code=$(
  curl -sS -o "$login_resp" -w "%{http_code}" -X POST "$API_V1_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
)

if [ "$login_code" != "200" ]; then
  echo "[FAIL] login returned $login_code"
  cat "$login_resp"
  exit 1
fi

token="$(grep -o '\"access_token\":\"[^\"]*\"' "$login_resp" | sed -n 's/.*\"access_token\":\"\([^\"]*\)\".*/\1/p' | head -n 1)"
if [ -z "$token" ]; then
  echo "[FAIL] access_token missing in login response"
  cat "$login_resp"
  exit 1
fi
echo "[OK] got token"

echo "[2] health"
health_code=$(curl -sS -o /tmp/kifu_health.txt -w "%{http_code}" "$clean_url/health")
if [ "$health_code" = "200" ]; then
  echo "[OK] health=200 ($clean_url/health)"
else
  echo "[WARN] root health check failed: $health_code ($clean_url/health)"
fi

api_health_code=$(
  curl -sS -o /tmp/kifu_api_health.txt -w "%{http_code}" \
    -H "Authorization: Bearer $token" \
    "$API_V1_BASE/health"
)
if [ "$api_health_code" = "200" ]; then
  echo "[OK] api health=200 ($API_V1_BASE/health)"
elif [ "$api_health_code" = "401" ] || [ "$api_health_code" = "403" ]; then
  echo "[WARN] api health is auth-gated ($api_health_code) at $API_V1_BASE/health"
elif [ "$api_health_code" = "404" ] || [ "$api_health_code" = "500" ]; then
  echo "[WARN] api health not available on this route ($api_health_code) at $API_V1_BASE/health"
  echo "[INFO] This can happen when only app routes are exposed in frontend proxy. Smoke still proceeds using direct endpoint checks."
else
  echo "[WARN] api health returned $api_health_code at $API_V1_BASE/health"
fi

echo "[3] user profile"
me_code=$(curl -sS -o /tmp/kifu_me.txt -w "%{http_code}" \
  -H "Authorization: Bearer $token" \
  "$API_V1_BASE/users/me")
if [ "$me_code" != "200" ]; then
  echo "[FAIL] /users/me returned $me_code"
  cat /tmp/kifu_me.txt
  exit 1
fi
echo "[OK] users/me=200"

echo "[4] onchain quick fact check"
jobs_payload="{\"chain\":\"$CHAIN\",\"address\":\"$ADDRESS\",\"timeWindow\":{\"lookbackSec\":$LOOKBACK},\"limits\":{\"maxTxs\":$MAX_TXS,\"maxEvents\":$MAX_EVENTS}}"
job_code=$(
  curl -sS -o "$jobs_resp" -w "%{http_code}" -X POST "$API_V1_BASE/jobs/onchain-quick-fact-check" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -d "$jobs_payload"
)

if [ "$job_code" != "200" ]; then
  echo "[WARN] onchain endpoint returned $job_code"
  cat "$jobs_resp"
  exit 1
fi

if ! grep -q '"status":"warning"\|"status":"ok"\|"status":"error"' "$jobs_resp"; then
  echo "[FAIL] unexpected onchain payload"
  cat "$jobs_resp"
  exit 1
fi
echo "[OK] onchain quick fact check returned valid status"
grep -Eo '"status":[^,]+' "$jobs_resp"
grep -Eo '"error_code":[^,]+' "$jobs_resp" | head -n 1
if ! grep -q '"tx_hashes":\[' "$jobs_resp"; then
  echo "[WARN] tx_hashes missing in evidence"
fi
if ! grep -q '"block_range"' "$jobs_resp"; then
  echo "[WARN] block_range missing in evidence"
fi
echo "---- response ----"
cat "$jobs_resp"
echo "------------------"

echo "[PASS] smoke complete"
