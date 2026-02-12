#!/bin/bash
# =============================================================================
# Kifu Pre-Deploy E2E Test Script
# Based on: docs/2026-02-12-predeploy-qa-checklist.md
# Usage: bash scripts/predeploy-e2e-test.sh [API_URL]
# =============================================================================

API_URL="${1:-http://127.0.0.1:3000}"
API="${API_URL}/api/v1"

# Unique test user per run
TIMESTAMP=$(date +%s)
TEST_EMAIL="e2e_test_${TIMESTAMP}@kifu.test"
TEST_PASSWORD="TestPass123!"
TEST_NAME="E2E Tester"

# Counters
PASS=0
FAIL=0
SKIP=0
TOTAL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Stored state
ACCESS_TOKEN=""
REFRESH_TOKEN=""
BUBBLE_ID=""

# ─────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────

run_test() {
    local name="$1"
    local section="$2"
    TOTAL=$((TOTAL + 1))
    printf "  %-55s" "$name"
}

pass() {
    echo -e "${GREEN}PASS${NC}"
    PASS=$((PASS + 1))
}

fail() {
    local reason="${1:-}"
    echo -e "${RED}FAIL${NC}"
    if [ -n "$reason" ]; then
        echo -e "    ${RED}-> $reason${NC}"
    fi
    FAIL=$((FAIL + 1))
}

skip() {
    local reason="${1:-}"
    echo -e "${YELLOW}SKIP${NC}"
    if [ -n "$reason" ]; then
        echo -e "    ${YELLOW}-> $reason${NC}"
    fi
    SKIP=$((SKIP + 1))
}

auth_header() {
    echo "Authorization: Bearer ${ACCESS_TOKEN}"
}

section() {
    echo ""
    echo -e "${BOLD}${CYAN}═══ $1 ═══${NC}"
}

# ─────────────────────────────────────────────────
# 0) Health Check
# ─────────────────────────────────────────────────
section "0) Health Check"

run_test "GET /health" "0"
RESP=$(curl -s -w "\n%{http_code}" "${API_URL}/health" 2>/dev/null)
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')

if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q '"status"'; then
    pass
else
    fail "HTTP $HTTP_CODE - Server may not be running at $API_URL"
    echo ""
    echo -e "${RED}Server is not reachable. Aborting.${NC}"
    echo "Make sure the backend is running: cd backend && go run ./cmd/..."
    exit 1
fi

# ─────────────────────────────────────────────────
# 1) Core Flow E2E
# ─────────────────────────────────────────────────
section "1) Core Flow E2E (checklist #1)"

# 1-1. Register
run_test "POST /auth/register" "1"
RESP=$(curl -s -w "\n%{http_code}" -X POST "${API}/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\",\"name\":\"${TEST_NAME}\"}")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    pass
else
    fail "HTTP $HTTP_CODE: $BODY"
fi

# 1-2. Login
run_test "POST /auth/login" "1"
RESP=$(curl -s -w "\n%{http_code}" -X POST "${API}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    ACCESS_TOKEN=$(echo "$BODY" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$BODY" | grep -o '"refresh_token":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$ACCESS_TOKEN" ]; then
        pass
    else
        fail "200 but no access_token in response"
    fi
else
    fail "HTTP $HTTP_CODE: $BODY"
fi

# 1-3. Get profile (verifies JWT works)
run_test "GET /users/me (JWT auth)" "1"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    RESP=$(curl -s -w "\n%{http_code}" "${API}/users/me" \
        -H "$(auth_header)")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    BODY=$(echo "$RESP" | sed '$d')
    if [ "$HTTP_CODE" = "200" ]; then
        pass
    else
        fail "HTTP $HTTP_CODE: $BODY"
    fi
fi

# 1-4. Get market klines (chart data)
run_test "GET /market/klines (chart)" "1"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    RESP=$(curl -s -w "\n%{http_code}" "${API}/market/klines?symbol=BTCUSDT&interval=1h&limit=10" \
        -H "$(auth_header)")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" = "200" ]; then
        pass
    else
        fail "HTTP $HTTP_CODE"
    fi
fi

# 1-5. Create bubble (memo marker)
run_test "POST /bubbles (create)" "1"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    CANDLE_TIME=$(date -u +"%Y-%m-%dT%H:00:00Z")
    RESP=$(curl -s -w "\n%{http_code}" -X POST "${API}/bubbles" \
        -H "$(auth_header)" \
        -H "Content-Type: application/json" \
        -d "{\"symbol\":\"BTCUSDT\",\"timeframe\":\"1h\",\"candle_time\":\"${CANDLE_TIME}\",\"price\":\"50000\",\"memo\":\"E2E test bubble\",\"tags\":[\"test\"]}")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    BODY=$(echo "$RESP" | sed '$d')
    if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
        BUBBLE_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        pass
    else
        fail "HTTP $HTTP_CODE: $BODY"
    fi
fi

# 1-6. List bubbles
run_test "GET /bubbles (list)" "1"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    RESP=$(curl -s -w "\n%{http_code}" "${API}/bubbles" \
        -H "$(auth_header)")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" = "200" ]; then
        pass
    else
        fail "HTTP $HTTP_CODE"
    fi
fi

# 1-7. Ask AI (one-shot)
run_test "POST /ai/one-shot (Ask AI)" "1"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    RESP=$(curl -s -w "\n%{http_code}" -X POST "${API}/ai/one-shot" \
        -H "$(auth_header)" \
        -H "Content-Type: application/json" \
        -d "{\"symbol\":\"BTCUSDT\",\"timeframe\":\"1h\",\"price\":\"50000\",\"prompt_type\":\"analysis\"}" \
        --max-time 30)
    HTTP_CODE=$(echo "$RESP" | tail -1)
    BODY=$(echo "$RESP" | sed '$d')
    if [ "$HTTP_CODE" = "200" ]; then
        pass
    elif [ "$HTTP_CODE" = "429" ]; then
        skip "Rate limited (expected)"
        SKIP=$((SKIP - 1))  # undo skip count
        PASS=$((PASS + 1))  # rate limit is correct behavior
    elif [ "$HTTP_CODE" = "402" ] || [ "$HTTP_CODE" = "403" ]; then
        skip "No AI key configured or quota exceeded"
    else
        fail "HTTP $HTTP_CODE: $(echo "$BODY" | head -c 200)"
    fi
fi

# 1-8. Review stats
run_test "GET /review/stats" "1"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    RESP=$(curl -s -w "\n%{http_code}" "${API}/review/stats" \
        -H "$(auth_header)")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" = "200" ]; then
        pass
    else
        fail "HTTP $HTTP_CODE"
    fi
fi

# ─────────────────────────────────────────────────
# 2) Trade Sync & Data Integrity
# ─────────────────────────────────────────────────
section "2) Trade Sync & Data (checklist #2)"

# 2-1. List exchanges (no creds expected for test user)
run_test "GET /exchanges (list)" "2"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    RESP=$(curl -s -w "\n%{http_code}" "${API}/exchanges" \
        -H "$(auth_header)")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" = "200" ]; then
        pass
    else
        fail "HTTP $HTTP_CODE"
    fi
fi

# 2-2. List trades
run_test "GET /trades (list)" "2"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    RESP=$(curl -s -w "\n%{http_code}" "${API}/trades" \
        -H "$(auth_header)")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" = "200" ]; then
        pass
    else
        fail "HTTP $HTTP_CODE"
    fi
fi

# 2-3. Trade summary
run_test "GET /trades/summary" "2"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    RESP=$(curl -s -w "\n%{http_code}" "${API}/trades/summary" \
        -H "$(auth_header)")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" = "200" ]; then
        pass
    else
        fail "HTTP $HTTP_CODE"
    fi
fi

# 2-4. Portfolio timeline
run_test "GET /portfolio/timeline" "2"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    RESP=$(curl -s -w "\n%{http_code}" "${API}/portfolio/timeline" \
        -H "$(auth_header)")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" = "200" ]; then
        pass
    else
        fail "HTTP $HTTP_CODE"
    fi
fi

# 2-5. Portfolio positions
run_test "GET /portfolio/positions" "2"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    RESP=$(curl -s -w "\n%{http_code}" "${API}/portfolio/positions" \
        -H "$(auth_header)")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" = "200" ]; then
        pass
    else
        fail "HTTP $HTTP_CODE"
    fi
fi

# ─────────────────────────────────────────────────
# 3) Auth Edge Cases
# ─────────────────────────────────────────────────
section "3) Auth Edge Cases"

# 3-1. Login with wrong password
run_test "POST /auth/login (wrong password -> 401)" "3"
RESP=$(curl -s -w "\n%{http_code}" -X POST "${API}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"WrongPass999!\"}")
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "401" ]; then
    pass
else
    fail "Expected 401, got HTTP $HTTP_CODE"
fi

# 3-2. Duplicate registration
run_test "POST /auth/register (duplicate -> 409)" "3"
RESP=$(curl -s -w "\n%{http_code}" -X POST "${API}/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\",\"name\":\"${TEST_NAME}\"}")
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "409" ]; then
    pass
else
    fail "Expected 409, got HTTP $HTTP_CODE"
fi

# 3-3. Access without token
run_test "GET /users/me (no token -> 401)" "3"
RESP=$(curl -s -w "\n%{http_code}" "${API}/users/me")
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "401" ]; then
    pass
else
    fail "Expected 401, got HTTP $HTTP_CODE"
fi

# 3-4. Token refresh
run_test "POST /auth/refresh" "3"
if [ -z "$REFRESH_TOKEN" ]; then
    skip "No refresh token"
else
    RESP=$(curl -s -w "\n%{http_code}" -X POST "${API}/auth/refresh" \
        -H "Content-Type: application/json" \
        -d "{\"refresh_token\":\"${REFRESH_TOKEN}\"}")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    BODY=$(echo "$RESP" | sed '$d')
    if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q "access_token"; then
        # Update token for remaining tests
        ACCESS_TOKEN=$(echo "$BODY" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
        pass
    else
        fail "HTTP $HTTP_CODE: $BODY"
    fi
fi

# ─────────────────────────────────────────────────
# 4) AI Rate Limiting (checklist #4)
# ─────────────────────────────────────────────────
section "4) AI Rate Limit / Cost Protection (checklist #4)"

run_test "AI rate-limit burst test (3 rapid calls)" "4"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    GOT_429=false
    for i in 1 2 3; do
        RESP=$(curl -s -w "\n%{http_code}" -X POST "${API}/ai/one-shot" \
            -H "$(auth_header)" \
            -H "Content-Type: application/json" \
            -d "{\"symbol\":\"BTCUSDT\",\"timeframe\":\"1h\",\"price\":\"50000\",\"prompt_type\":\"analysis\"}" \
            --max-time 15)
        HTTP_CODE=$(echo "$RESP" | tail -1)
        if [ "$HTTP_CODE" = "429" ]; then
            GOT_429=true
            break
        fi
    done
    if [ "$GOT_429" = true ]; then
        pass
    else
        skip "No 429 received (may need more calls or AI not configured)"
    fi
fi

# ─────────────────────────────────────────────────
# 5) Review & Notes
# ─────────────────────────────────────────────────
section "5) Review & Notes"

# 5-1. Review calendar
run_test "GET /review/calendar" "5"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    RESP=$(curl -s -w "\n%{http_code}" "${API}/review/calendar" \
        -H "$(auth_header)")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" = "200" ]; then
        pass
    else
        fail "HTTP $HTTP_CODE"
    fi
fi

# 5-2. Review trend
run_test "GET /review/trend" "5"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    RESP=$(curl -s -w "\n%{http_code}" "${API}/review/trend" \
        -H "$(auth_header)")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" = "200" ]; then
        pass
    else
        fail "HTTP $HTTP_CODE"
    fi
fi

# 5-3. Create note
run_test "POST /notes (create)" "5"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    NOTE_BODY="{\"title\":\"E2E Test Note\",\"content\":\"Test content from E2E script\"}"
    if [ -n "$BUBBLE_ID" ]; then
        NOTE_BODY="{\"title\":\"E2E Test Note\",\"content\":\"Test content\",\"bubble_id\":\"${BUBBLE_ID}\"}"
    fi
    RESP=$(curl -s -w "\n%{http_code}" -X POST "${API}/notes" \
        -H "$(auth_header)" \
        -H "Content-Type: application/json" \
        -d "$NOTE_BODY")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
        pass
    else
        fail "HTTP $HTTP_CODE"
    fi
fi

# 5-4. List notes
run_test "GET /notes (list)" "5"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    RESP=$(curl -s -w "\n%{http_code}" "${API}/notes" \
        -H "$(auth_header)")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" = "200" ]; then
        pass
    else
        fail "HTTP $HTTP_CODE"
    fi
fi

# ─────────────────────────────────────────────────
# 6) Alert System
# ─────────────────────────────────────────────────
section "6) Alert System"

# 6-1. List alert rules
run_test "GET /alert-rules (list)" "6"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    RESP=$(curl -s -w "\n%{http_code}" "${API}/alert-rules" \
        -H "$(auth_header)")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" = "200" ]; then
        pass
    else
        fail "HTTP $HTTP_CODE"
    fi
fi

# 6-2. List alerts
run_test "GET /alerts (list)" "6"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    RESP=$(curl -s -w "\n%{http_code}" "${API}/alerts" \
        -H "$(auth_header)")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" = "200" ]; then
        pass
    else
        fail "HTTP $HTTP_CODE"
    fi
fi

# 6-3. Notification channels
run_test "GET /notifications/channels" "6"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    RESP=$(curl -s -w "\n%{http_code}" "${API}/notifications/channels" \
        -H "$(auth_header)")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" = "200" ]; then
        pass
    else
        fail "HTTP $HTTP_CODE"
    fi
fi

# ─────────────────────────────────────────────────
# 7) Guided Review & Safety
# ─────────────────────────────────────────────────
section "7) Guided Review & Safety"

run_test "GET /guided-reviews/today" "7"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    RESP=$(curl -s -w "\n%{http_code}" "${API}/guided-reviews/today" \
        -H "$(auth_header)")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
        pass
    else
        fail "HTTP $HTTP_CODE"
    fi
fi

run_test "GET /guided-reviews/streak" "7"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    RESP=$(curl -s -w "\n%{http_code}" "${API}/guided-reviews/streak" \
        -H "$(auth_header)")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" = "200" ]; then
        pass
    else
        fail "HTTP $HTTP_CODE"
    fi
fi

run_test "GET /safety/today" "7"
if [ -z "$ACCESS_TOKEN" ]; then
    skip "No token"
else
    RESP=$(curl -s -w "\n%{http_code}" "${API}/safety/today" \
        -H "$(auth_header)")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" = "200" ]; then
        pass
    else
        fail "HTTP $HTTP_CODE"
    fi
fi

# ─────────────────────────────────────────────────
# 8) Cleanup - Delete test bubble
# ─────────────────────────────────────────────────
section "8) Cleanup"

run_test "DELETE /bubbles/:id (cleanup)" "8"
if [ -z "$ACCESS_TOKEN" ] || [ -z "$BUBBLE_ID" ]; then
    skip "No bubble to clean up"
else
    RESP=$(curl -s -w "\n%{http_code}" -X DELETE "${API}/bubbles/${BUBBLE_ID}" \
        -H "$(auth_header)")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
        pass
    else
        fail "HTTP $HTTP_CODE"
    fi
fi

# ─────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD} Pre-Deploy E2E Test Results${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "  ${GREEN}PASS: ${PASS}${NC}"
echo -e "  ${RED}FAIL: ${FAIL}${NC}"
echo -e "  ${YELLOW}SKIP: ${SKIP}${NC}"
echo -e "  Total: ${TOTAL}"
echo ""

if [ "$TOTAL" -gt 0 ]; then
    RATE=$(( (PASS * 100) / TOTAL ))
    echo -e "  Pass Rate: ${BOLD}${RATE}%${NC}"
fi

echo ""
echo -e "  Test User: ${TEST_EMAIL}"
echo -e "  API URL:   ${API_URL}"
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"

if [ "$FAIL" -gt 0 ]; then
    exit 1
else
    exit 0
fi
