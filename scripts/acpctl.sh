#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ACP_DIR="${PROJECT_ROOT}/acp"
ACP_ENV_FILE="${ACP_DIR}/.env"
SMOKE_SCRIPT="${PROJECT_ROOT}/scripts/smoke-onchain-quick-fact-check.sh"

log() {
  printf '[acpctl] %s\n' "$*"
}

die() {
  printf '[acpctl][error] %s\n' "$*" >&2
  exit 1
}

load_acp_env() {
  local override_wallet_private_key="${WHITELISTED_WALLET_PRIVATE_KEY:-}"
  local override_wallet_address="${SELLER_AGENT_WALLET_ADDRESS:-}"
  local override_entity_id="${SELLER_ENTITY_ID:-}"
  local override_api_base="${KIFU_API_BASE:-}"
  local override_email="${KIFU_EMAIL:-}"
  local override_password="${KIFU_PASSWORD:-}"
  local override_smoke_email="${KIFU_SMOKE_EMAIL:-}"
  local override_smoke_password="${KIFU_SMOKE_PASSWORD:-}"

  if [[ -f "${ACP_ENV_FILE}" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "${ACP_ENV_FILE}"
    set +a
  fi

  if [[ -n "${override_wallet_private_key}" ]]; then
    export WHITELISTED_WALLET_PRIVATE_KEY="${override_wallet_private_key}"
  fi
  if [[ -n "${override_wallet_address}" ]]; then
    export SELLER_AGENT_WALLET_ADDRESS="${override_wallet_address}"
  fi
  if [[ -n "${override_entity_id}" ]]; then
    export SELLER_ENTITY_ID="${override_entity_id}"
  fi
  if [[ -n "${override_api_base}" ]]; then
    export KIFU_API_BASE="${override_api_base}"
  fi
  if [[ -n "${override_email}" ]]; then
    export KIFU_EMAIL="${override_email}"
  fi
  if [[ -n "${override_password}" ]]; then
    export KIFU_PASSWORD="${override_password}"
  fi
  if [[ -n "${override_smoke_email}" ]]; then
    export KIFU_SMOKE_EMAIL="${override_smoke_email}"
  fi
  if [[ -n "${override_smoke_password}" ]]; then
    export KIFU_SMOKE_PASSWORD="${override_smoke_password}"
  fi
}

print_key_status() {
  local key="${1:-}"
  local label="${2:-$1}"
  local value="${!key:-}"
  if [[ -z "${value}" ]]; then
    printf '  [MISSING] %s\n' "${label}"
  elif value_is_placeholder "${value}"; then
    printf '  [PLACEHOLDER] %s\n' "${label}"
  else
    printf '  [OK] %s\n' "${label}"
  fi
}

value_is_placeholder() {
  local value="${1:-}"
  case "${value}" in
    your_*|example|example.com|*example.com*|0x...|your_private_key_here|your_password_here)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

python_import_ok() {
  local module="${1:-}"
  python3 - <<PY >/dev/null 2>&1
import importlib
importlib.import_module("${module}")
PY
}

backend_health_ok() {
  local base="${KIFU_API_BASE:-http://127.0.0.1:8080}"
  local code
  code="$(curl -sS -o /dev/null -w "%{http_code}" "${base%/}/health" 2>/dev/null || true)"
  [[ "${code}" == "200" ]]
}

check_common_requirements() {
  local missing=0

  if ! command -v python3 >/dev/null 2>&1; then
    log "python3: missing"
    missing=1
  else
    log "python3: $(python3 --version 2>/dev/null)"
  fi

  if python_import_ok dotenv; then
    log "python module: dotenv OK"
  else
    log "python module: dotenv missing"
    missing=1
  fi

  if python_import_ok requests; then
    log "python module: requests OK"
  else
    log "python module: requests missing"
    missing=1
  fi

  if python_import_ok virtuals_acp; then
    log "python module: virtuals_acp OK"
  else
    log "python module: virtuals_acp missing"
    missing=1
  fi

  if backend_health_ok; then
    log "backend health: OK (${KIFU_API_BASE:-http://127.0.0.1:8080}/health)"
  else
    log "backend health: unreachable (${KIFU_API_BASE:-http://127.0.0.1:8080}/health)"
    missing=1
  fi

  return "${missing}"
}

check_env_requirements() {
  local missing=0

  echo "Required seller env:"
  print_key_status WHITELISTED_WALLET_PRIVATE_KEY "wallet private key"
  print_key_status SELLER_AGENT_WALLET_ADDRESS "seller wallet address"
  print_key_status SELLER_ENTITY_ID "seller entity id"
  print_key_status KIFU_API_BASE "kifu api base"
  print_key_status KIFU_EMAIL "kifu email"
  print_key_status KIFU_PASSWORD "kifu password"

  local key
  for key in WHITELISTED_WALLET_PRIVATE_KEY SELLER_AGENT_WALLET_ADDRESS SELLER_ENTITY_ID KIFU_API_BASE KIFU_EMAIL KIFU_PASSWORD; do
    if [[ -z "${!key:-}" ]] || value_is_placeholder "${!key:-}"; then
      missing=1
    fi
  done

  return "${missing}"
}

require_seller_env() {
  if ! check_env_requirements >/dev/null; then
    die "fill ${ACP_ENV_FILE} first"
  fi
}

preflight() {
  local env_ready=0
  local common_ready=0

  load_acp_env

  log "ACP env file: ${ACP_ENV_FILE}"
  if [[ -f "${ACP_ENV_FILE}" ]]; then
    log "ACP env file present"
  else
    log "ACP env file missing"
  fi

  if check_env_requirements; then
    env_ready=1
  fi

  if check_common_requirements; then
    common_ready=1
  fi

  [[ "${env_ready}" -eq 1 && "${common_ready}" -eq 1 ]]
}

run_smoke() {
  load_acp_env
  export KIFU_SMOKE_EMAIL="${KIFU_SMOKE_EMAIL:-${KIFU_EMAIL:-}}"
  export KIFU_SMOKE_PASSWORD="${KIFU_SMOKE_PASSWORD:-${KIFU_PASSWORD:-}}"
  export KIFU_API_BASE="${KIFU_API_BASE:-http://127.0.0.1:8080}"

  [[ -n "${KIFU_SMOKE_EMAIL:-}" ]] || die "missing KIFU_SMOKE_EMAIL or KIFU_EMAIL"
  [[ -n "${KIFU_SMOKE_PASSWORD:-}" ]] || die "missing KIFU_SMOKE_PASSWORD or KIFU_PASSWORD"
  [[ -x "${SMOKE_SCRIPT}" ]] || die "smoke script missing: ${SMOKE_SCRIPT}"

  check_common_requirements >/dev/null || true
  log "running smoke script"
  exec "${SMOKE_SCRIPT}"
}

install_deps() {
  if ! command -v python3 >/dev/null 2>&1; then
    die "python3 is required"
  fi
  log "installing ACP python requirements"
  exec python3 -m pip install -r "${ACP_DIR}/requirements.txt"
}

run_seller() {
  load_acp_env
  require_seller_env
  check_common_requirements || die "preflight failed"
  log "starting ACP seller"
  cd "${ACP_DIR}"
  exec python3 seller.py
}

show_guide() {
  cat <<EOF
=====================================
 ACP Quick Guide
=====================================
 Files:
   ${ACP_DIR}/seller.py
   ${ACP_ENV_FILE}
   ${SMOKE_SCRIPT}

 Commands:
   ./scripts/acpctl.sh install
   ./scripts/acpctl.sh preflight
   ./scripts/acpctl.sh smoke
   ./scripts/acpctl.sh seller

 Flow:
   1) Fill ${ACP_ENV_FILE}
   2) Run: ./scripts/acpctl.sh install
   3) Start local backend / postgres
   4) Run: ./scripts/acpctl.sh preflight
   5) Run: ./scripts/acpctl.sh smoke
   6) Run: ./scripts/acpctl.sh seller

 Notes:
   - smoke uses KIFU_EMAIL/KIFU_PASSWORD by default
   - seller will refuse to start if required env or python modules are missing
   - backend health is checked against KIFU_API_BASE/health
=====================================
EOF
}

usage() {
  cat <<EOF
Usage:
  ./scripts/acpctl.sh install
  ./scripts/acpctl.sh preflight
  ./scripts/acpctl.sh smoke
  ./scripts/acpctl.sh seller
  ./scripts/acpctl.sh guide
EOF
}

main() {
  case "${1:-guide}" in
    preflight|status)
      preflight
      ;;
    install)
      install_deps
      ;;
    smoke)
      run_smoke
      ;;
    seller)
      run_seller
      ;;
    guide)
      show_guide
      ;;
    help|-h|--help)
      usage
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
