#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env"
  set +a
fi

: "${POSTGRES_USER:?POSTGRES_USER is required (root .env)}"
: "${POSTGRES_DB:?POSTGRES_DB is required (root .env)}"

GUEST_EMAIL="${GUEST_EMAIL:-guest.preview@kifu.local}"
GUEST_PASSWORD="${GUEST_PASSWORD:-guest1234}"
GUEST_NAME="${GUEST_NAME:-Guest Preview}"
RESET_GUEST_DATA="${RESET_GUEST_DATA:-true}"

cd "${ROOT_DIR}"

if [[ "${RESET_GUEST_DATA}" == "true" ]]; then
  echo "[seed] resetting guest data for ${GUEST_EMAIL}"
  docker compose -f "${COMPOSE_FILE}" exec -T postgres \
    psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
    -v ON_ERROR_STOP=1 \
    -v guest_email="${GUEST_EMAIL}" \
    -f - < "${ROOT_DIR}/scripts/sql/reset_guest_demo_data.sql"
fi

echo "[seed] seeding guest demo data for ${GUEST_EMAIL}"
docker compose -f "${COMPOSE_FILE}" exec -T postgres \
  psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
  -v ON_ERROR_STOP=1 \
  -v guest_email="${GUEST_EMAIL}" \
  -v guest_password="${GUEST_PASSWORD}" \
  -v guest_name="${GUEST_NAME}" \
  -f - < "${ROOT_DIR}/scripts/sql/seed_guest_demo_data.sql"

echo "[seed] done. quick counts:"
docker compose -f "${COMPOSE_FILE}" exec -T postgres \
  psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
  -v ON_ERROR_STOP=1 \
  -v guest_email="${GUEST_EMAIL}" \
  -c "SELECT
        (SELECT COUNT(*) FROM trades t JOIN users u ON u.id=t.user_id WHERE lower(u.email)=lower(:'guest_email')) AS trades,
        (SELECT COUNT(*) FROM bubbles b JOIN users u ON u.id=b.user_id WHERE lower(u.email)=lower(:'guest_email')) AS bubbles,
        (SELECT COUNT(*) FROM review_notes n JOIN users u ON u.id=n.user_id WHERE lower(u.email)=lower(:'guest_email')) AS notes,
        (SELECT COUNT(*) FROM manual_positions m JOIN users u ON u.id=m.user_id WHERE lower(u.email)=lower(:'guest_email')) AS manual_positions,
        (SELECT COUNT(*) FROM runs r JOIN users u ON u.id=r.user_id WHERE lower(u.email)=lower(:'guest_email')) AS runs;"

echo "[seed] verify guest login:"
echo "curl -i -X POST https://kifu.moneyvessel.kr/api/v1/auth/login -H \"Content-Type: application/json\" -d '{\"email\":\"${GUEST_EMAIL}\",\"password\":\"${GUEST_PASSWORD}\"}'"

