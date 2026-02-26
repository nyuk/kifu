#!/usr/bin/env bash
set -euo pipefail

API_URL="${1:-http://127.0.0.1:8080}"
API="${API_URL%/}/api/v1"
TS="$(date +%s)"
EMAIL="smoke_today_${TS}@kifu.test"
PASSWORD="TestPass123!"
NAME="Smoke Today"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
CSV_PATH="$TMP_DIR/trades.csv"

echo "exchange,symbol,side,quantity,price,trade_time" > "$CSV_PATH"
echo "binance_futures,ETHUSDT,BUY,0.01,1000,$(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$CSV_PATH"

echo "==> register"
REGISTER_CODE="$(curl -s -o "$TMP_DIR/register.json" -w "%{http_code}" -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"$NAME\"}")"
if [ "$REGISTER_CODE" != "200" ] && [ "$REGISTER_CODE" != "201" ] && [ "$REGISTER_CODE" != "409" ]; then
  echo "register failed: HTTP $REGISTER_CODE"
  cat "$TMP_DIR/register.json"
  exit 1
fi

echo "==> login"
LOGIN_CODE="$(curl -s -o "$TMP_DIR/login.json" -w "%{http_code}" -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"
if [ "$LOGIN_CODE" != "200" ]; then
  echo "login failed: HTTP $LOGIN_CODE"
  cat "$TMP_DIR/login.json"
  exit 1
fi
ACCESS_TOKEN="$(grep -o '"access_token":"[^"]*"' "$TMP_DIR/login.json" | cut -d'"' -f4)"
if [ -z "$ACCESS_TOKEN" ]; then
  echo "login failed: access_token missing"
  cat "$TMP_DIR/login.json"
  exit 1
fi

echo "==> import 1 trade"
IMPORT_CODE="$(curl -s -o "$TMP_DIR/import.json" -w "%{http_code}" -X POST "$API/trades/import" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "file=@$CSV_PATH;type=text/csv")"
if [ "$IMPORT_CODE" != "200" ]; then
  echo "trade import failed: HTTP $IMPORT_CODE"
  cat "$TMP_DIR/import.json"
  exit 1
fi

echo "==> guided review today (Asia/Seoul)"
GUIDED_CODE="$(curl -s -o "$TMP_DIR/guided.json" -w "%{http_code}" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$API/guided-reviews/today?timezone=Asia%2FSeoul")"
if [ "$GUIDED_CODE" != "200" ]; then
  echo "guided today failed: HTTP $GUIDED_CODE"
  cat "$TMP_DIR/guided.json"
  exit 1
fi
if grep -q "__NO_TRADE__" "$TMP_DIR/guided.json"; then
  echo "guided today returned NO_TRADE unexpectedly"
  cat "$TMP_DIR/guided.json"
  exit 1
fi
if ! grep -q "ETHUSDT" "$TMP_DIR/guided.json"; then
  echo "guided today missing ETHUSDT"
  cat "$TMP_DIR/guided.json"
  exit 1
fi

echo "==> safety today (Asia/Seoul)"
SAFETY_CODE="$(curl -s -o "$TMP_DIR/safety.json" -w "%{http_code}" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$API/safety/today?timezone=Asia%2FSeoul")"
if [ "$SAFETY_CODE" != "200" ]; then
  echo "safety today failed: HTTP $SAFETY_CODE"
  cat "$TMP_DIR/safety.json"
  exit 1
fi
if ! grep -q "ETHUSDT" "$TMP_DIR/safety.json"; then
  echo "safety today missing ETHUSDT"
  cat "$TMP_DIR/safety.json"
  exit 1
fi

echo "PASS: home today-trade smoke"
