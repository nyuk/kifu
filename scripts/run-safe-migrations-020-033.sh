#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SQL_FILE="$ROOT_DIR/scripts/sql/migrations_020_033_safe.sql"
POSTGRES_USER="${POSTGRES_USER:-kifu}"
POSTGRES_DB="${POSTGRES_DB:-kifu}"
COMPOSE_ARGS=(-f "$ROOT_DIR/docker-compose.yml")

if [[ -f "$ROOT_DIR/docker-compose.prod.yml" ]]; then
  COMPOSE_ARGS+=(-f "$ROOT_DIR/docker-compose.prod.yml")
fi

echo "[migrate] ensuring postgres is running"
docker compose "${COMPOSE_ARGS[@]}" up -d postgres >/dev/null

echo "[migrate] checking baseline schema"
MISSING_BASE_TABLES="$(
  docker compose "${COMPOSE_ARGS[@]}" exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "
      WITH required(table_name) AS (
        VALUES ('users'), ('trades'), ('alerts'), ('ai_providers')
      )
      SELECT COALESCE(string_agg(required.table_name, ', '), '')
      FROM required
      WHERE NOT EXISTS (
        SELECT 1
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
          AND t.table_name = required.table_name
      );
    "
)"

if [[ -n "$MISSING_BASE_TABLES" ]]; then
  echo "[migrate][error] baseline schema is missing: $MISSING_BASE_TABLES" >&2
  echo "[migrate][error] run the earlier baseline migrations before applying 020~033." >&2
  exit 1
fi

echo "[migrate] applying $(basename "$SQL_FILE")"
docker compose "${COMPOSE_ARGS[@]}" exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$SQL_FILE"

echo "[migrate] verifying key tables"
docker compose "${COMPOSE_ARGS[@]}" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('guided_reviews', 'trade_plans', 'monthly_reports')
    ORDER BY table_name;
  "

echo "[migrate] verifying key admin policies"
docker compose "${COMPOSE_ARGS[@]}" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
    SELECT key, value
    FROM admin_policies
    WHERE key IN (
      'admin_user_signup_enabled',
      'maintenance_mode',
      'notification_delivery_enabled',
      'agent_service_poller_enabled',
      'ai_provider_toggle',
      'ai_run_telemetry',
      'ai_local_gateway'
    )
    ORDER BY key;
  "

echo "[migrate] done"
