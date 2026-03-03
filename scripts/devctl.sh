#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

COMPOSE_FILES=(-f "${PROJECT_ROOT}/docker-compose.yml" -f "${PROJECT_ROOT}/docker-compose.prod.yml")
BASE_COMPOSE_FILE=(-f "${PROJECT_ROOT}/docker-compose.yml")

BACKEND_PID_FILE="${PROJECT_ROOT}/backend/.devctl-backend.pid"
BACKEND_LOG_FILE="${PROJECT_ROOT}/backend/.devctl-backend.log"
FRONTEND_PID_FILE="${PROJECT_ROOT}/frontend/.devctl-frontend.pid"
FRONTEND_LOG_FILE="${PROJECT_ROOT}/frontend/.devctl-frontend.log"

cd "${PROJECT_ROOT}"

log() {
  printf '[devctl] %s\n' "$*"
}

die() {
  printf '[devctl][error] %s\n' "$*" >&2
  exit 1
}

dc() {
  docker compose "${COMPOSE_FILES[@]}" "$@"
}

dc_base() {
  docker compose "${BASE_COMPOSE_FILE[@]}" "$@"
}

dc_up_safe() {
  # First try fast path without build.
  if dc up -d --force-recreate --no-build "$@"; then
    return 0
  fi

  # Auto-fallback: if image is missing, build once and retry.
  if dc build "$@"; then
    dc up -d --force-recreate --no-build "$@"
    return 0
  fi

  return 1
}

has_backend_dockerfile() {
  [[ -f "${PROJECT_ROOT}/backend/Dockerfile" ]]
}

has_frontend_dockerfile() {
  [[ -f "${PROJECT_ROOT}/frontend/Dockerfile" ]]
}

pid_alive() {
  local pid="${1:-}"
  [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1
}

stop_local_pid() {
  local pid_file="${1:-}"
  local name="${2:-process}"
  if [[ -f "${pid_file}" ]]; then
    local pid
    pid="$(cat "${pid_file}" 2>/dev/null || true)"
    if pid_alive "${pid}"; then
      kill "${pid}" >/dev/null 2>&1 || true
      sleep 0.5
      if pid_alive "${pid}"; then
        kill -9 "${pid}" >/dev/null 2>&1 || true
      fi
      log "stopped local ${name} (pid=${pid})"
    fi
    rm -f "${pid_file}"
  fi
}

start_backend_local() {
  stop_local_pid "${BACKEND_PID_FILE}" "backend"
  log "start backend in local mode (go run)"
  (
    cd "${PROJECT_ROOT}/backend"
    nohup go run ./cmd/main.go >"${BACKEND_LOG_FILE}" 2>&1 &
    echo $! >"${BACKEND_PID_FILE}"
  )
  log "backend local pid=$(cat "${BACKEND_PID_FILE}") log=${BACKEND_LOG_FILE}"
}

start_frontend_local() {
  stop_local_pid "${FRONTEND_PID_FILE}" "frontend"
  log "start frontend in local mode (npm run dev)"
  (
    cd "${PROJECT_ROOT}/frontend"
    nohup npm run dev -- --hostname 127.0.0.1 --port 5173 >"${FRONTEND_LOG_FILE}" 2>&1 &
    echo $! >"${FRONTEND_PID_FILE}"
  )
  log "frontend local pid=$(cat "${FRONTEND_PID_FILE}") log=${FRONTEND_LOG_FILE}"
}

require_docker() {
  if ! docker info >/dev/null 2>&1; then
    die "docker daemon is not running. start Docker Desktop first."
  fi
}

ensure_acp_env() {
  mkdir -p "${PROJECT_ROOT}/acp"
  if [[ ! -f "${PROJECT_ROOT}/acp/.env" ]]; then
    touch "${PROJECT_ROOT}/acp/.env"
    log "created empty acp/.env (compose guard)"
  fi
}

require_clean_git_for_update() {
  if [[ -n "$(git status --porcelain)" ]]; then
    die "working tree is dirty. commit/stash first, then run git update."
  fi
}

service_start() {
  local target="${1:-}"
  require_docker
  ensure_acp_env
  case "${target}" in
    backend)
      log "restart backend (stop + up -d --force-recreate)"
      dc stop backend >/dev/null 2>&1 || true
      if ! dc up -d --force-recreate --no-build --no-deps backend; then
        if has_backend_dockerfile; then
          log "backend image missing or stale; building backend once..."
          dc build backend
          dc up -d --force-recreate --no-build --no-deps backend
        else
          log "backend Dockerfile missing; fallback to local mode."
          start_backend_local
        fi
      fi
      ;;
    frontend)
      log "restart frontend (stop + up -d --force-recreate)"
      dc stop frontend >/dev/null 2>&1 || true
      if ! dc up -d --force-recreate --no-build --no-deps frontend; then
        if has_frontend_dockerfile; then
          log "frontend image missing or stale; building frontend once..."
          dc build frontend
          dc up -d --force-recreate --no-build --no-deps frontend
        else
          log "frontend Dockerfile missing; fallback to local mode."
          start_frontend_local
        fi
      fi
      ;;
    all)
      log "restart stack (postgres/backend/frontend)"
      service_stop all >/dev/null 2>&1 || true
      # postgres is always managed by base compose (no build needed)
      dc_base up -d postgres
      service_start backend
      service_start frontend
      ;;
    *)
      die "invalid start target: ${target} (backend|frontend|all)"
      ;;
  esac
}

service_stop() {
  local target="${1:-}"
  require_docker
  case "${target}" in
    backend|frontend|postgres)
      log "stop ${target}"
      dc stop "${target}" || true
      if [[ "${target}" == "backend" ]]; then
        stop_local_pid "${BACKEND_PID_FILE}" "backend"
      fi
      if [[ "${target}" == "frontend" ]]; then
        stop_local_pid "${FRONTEND_PID_FILE}" "frontend"
      fi
      ;;
    all)
      log "stop frontend/backend/postgres"
      dc stop frontend backend postgres || true
      stop_local_pid "${BACKEND_PID_FILE}" "backend"
      stop_local_pid "${FRONTEND_PID_FILE}" "frontend"
      ;;
    *)
      die "invalid stop target: ${target} (backend|frontend|postgres|all)"
      ;;
  esac
}

service_restart() {
  local target="${1:-}"
  service_start "${target}"
}

service_status() {
  require_docker
  dc_base ps
  if [[ -f "${BACKEND_PID_FILE}" ]]; then
    local bp
    bp="$(cat "${BACKEND_PID_FILE}" 2>/dev/null || true)"
    if pid_alive "${bp}"; then
      echo "local-backend: running (pid=${bp})"
    else
      echo "local-backend: stale pid file"
    fi
  else
    echo "local-backend: not running"
  fi
  if [[ -f "${FRONTEND_PID_FILE}" ]]; then
    local fp
    fp="$(cat "${FRONTEND_PID_FILE}" 2>/dev/null || true)"
    if pid_alive "${fp}"; then
      echo "local-frontend: running (pid=${fp})"
    else
      echo "local-frontend: stale pid file"
    fi
  else
    echo "local-frontend: not running"
  fi
}

service_logs() {
  local target="${1:-all}"
  require_docker
  log "streaming logs. press Ctrl+C to return to menu."
  case "${target}" in
    backend|frontend|postgres)
      if [[ "${target}" == "backend" && -f "${BACKEND_LOG_FILE}" ]]; then
        tail -f "${BACKEND_LOG_FILE}"
      elif [[ "${target}" == "frontend" && -f "${FRONTEND_LOG_FILE}" ]]; then
        tail -f "${FRONTEND_LOG_FILE}"
      else
        dc logs -f --tail=200 "${target}"
      fi
      ;;
    all)
      dc logs -f --tail=200
      ;;
    *)
      die "invalid logs target: ${target} (backend|frontend|postgres|all)"
      ;;
  esac
}

git_update() {
  require_clean_git_for_update
  log "git fetch --all --prune"
  git fetch --all --prune
  log "git pull --rebase origin main"
  git pull --rebase origin main
}

git_commit() {
  local msg="${1:-}"
  [[ -n "${msg}" ]] || die "commit message required"
  git add -A
  git commit -m "${msg}"
}

git_push() {
  git push origin main
}

git_status_short() {
  git status --short --branch
  git log --oneline --decorate -n 5
}

run_full_qa() {
  local api_url="${1:-http://127.0.0.1:8080}"
  local frontend_url="${2:-http://127.0.0.1:5173}"
  log "run full QA (api=${api_url}, frontend=${frontend_url})"
  bash "${PROJECT_ROOT}/scripts/full-qa.sh" "${api_url}" "${frontend_url}"
}

backend_health_check() {
  local url="${1:-http://127.0.0.1:8080/health}"
  log "health check: ${url}"
  curl -sS "${url}"
  echo
}

show_menu() {
  cat <<'EOF'
=====================================
 KIFU Dev Control Menu
=====================================
 1) Start backend
 2) Start frontend
 3) Start all (postgres+backend+frontend)
 4) Stop backend
 5) Stop frontend
 6) Stop all
 7) Restart backend
 8) Restart frontend
 9) Restart all
10) Status
11) Logs backend
12) Logs frontend
13) Git update (fetch+pull --rebase)
14) Git commit (all changed files)
15) Git push (origin main)
16) Git short status
17) Full QA run (scripts/full-qa.sh)
18) Backend health check (/health)
 0) Exit
EOF
}

run_menu() {
  trap 'echo; log "interrupted. returning to menu..."' INT
  while true; do
    show_menu
    read -r -p "Select: " choice
    if run_menu_choice "${choice}"; then
      :
    else
      local rc=$?
      log "operation failed (exit=${rc}). menu stays open."
    fi
    echo
  done
}

run_menu_choice() {
  local choice="${1:-}"
  case "${choice}" in
    1) service_start backend ;;
    2) service_start frontend ;;
    3) service_start all ;;
    4) service_stop backend ;;
    5) service_stop frontend ;;
    6) service_stop all ;;
    7) service_restart backend ;;
    8) service_restart frontend ;;
    9) service_restart all ;;
    10) service_status ;;
    11) service_logs backend ;;
    12) service_logs frontend ;;
    13) git_update ;;
    14)
      read -r -p "Commit message: " msg
      git_commit "${msg}"
      ;;
    15) git_push ;;
    16) git_status_short ;;
    17)
      read -r -p "API URL [http://127.0.0.1:8080]: " api_url
      read -r -p "Frontend URL [http://127.0.0.1:5173]: " frontend_url
      run_full_qa "${api_url:-http://127.0.0.1:8080}" "${frontend_url:-http://127.0.0.1:5173}"
      ;;
    18)
      read -r -p "Health URL [http://127.0.0.1:8080/health]: " health_url
      backend_health_check "${health_url:-http://127.0.0.1:8080/health}"
      ;;
    0) exit 0 ;;
    *)
      log "invalid selection: ${choice}"
      return 0
      ;;
  esac
}

usage() {
  cat <<'EOF'
Usage:
  ./scripts/devctl.sh
  ./scripts/devctl.sh start backend|frontend|all
  ./scripts/devctl.sh stop backend|frontend|postgres|all
  ./scripts/devctl.sh restart backend|frontend|all
  ./scripts/devctl.sh status
  ./scripts/devctl.sh logs backend|frontend|postgres|all
  ./scripts/devctl.sh git update
  ./scripts/devctl.sh git commit "your message"
  ./scripts/devctl.sh git push
  ./scripts/devctl.sh git status
  ./scripts/devctl.sh qa [api_url] [frontend_url]
  ./scripts/devctl.sh health [health_url]
EOF
}

main() {
  if [[ $# -eq 0 ]]; then
    run_menu
    return
  fi

  case "${1}" in
    start)
      [[ $# -ge 2 ]] || die "missing target for start"
      service_start "${2}"
      ;;
    stop)
      [[ $# -ge 2 ]] || die "missing target for stop"
      service_stop "${2}"
      ;;
    restart)
      [[ $# -ge 2 ]] || die "missing target for restart"
      service_restart "${2}"
      ;;
    status)
      service_status
      ;;
    logs)
      service_logs "${2:-all}"
      ;;
    git)
      [[ $# -ge 2 ]] || die "missing git subcommand"
      case "${2}" in
        update) git_update ;;
        commit)
          [[ $# -ge 3 ]] || die "commit message required"
          git_commit "${3}"
          ;;
        push) git_push ;;
        status) git_status_short ;;
        *) die "invalid git subcommand: ${2}" ;;
      esac
      ;;
    qa)
      run_full_qa "${2:-http://127.0.0.1:8080}" "${3:-http://127.0.0.1:5173}"
      ;;
    health)
      backend_health_check "${2:-http://127.0.0.1:8080/health}"
      ;;
    help|-h|--help)
      usage
      ;;
    *)
      die "unknown command: ${1}"
      ;;
  esac
}

main "$@"
