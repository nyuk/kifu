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
BACKEND_MODE="${DEVCTL_BACKEND_MODE:-local}"
FRONTEND_MODE="${DEVCTL_FRONTEND_MODE:-local}"
QUICKSTART_FILE="${PROJECT_ROOT}/KIFU-QUICKSTART.md"

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

listener_pid() {
  local port="${1:-}"
  [[ -n "${port}" ]] || return 0
  lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null | head -n 1 || true
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

stop_process_on_port() {
  local port="${1:-}"
  local name="${2:-process}"
  local pids

  [[ -n "${port}" ]] || return 0

  pids="$(lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
  [[ -n "${pids}" ]] || return 0

  for pid in ${pids}; do
    if pid_alive "${pid}"; then
      kill "${pid}" >/dev/null 2>&1 || true
      sleep 0.5
      if pid_alive "${pid}"; then
        kill -9 "${pid}" >/dev/null 2>&1 || true
      fi
    fi
  done

  log "stopped ${name} listener(s) on port ${port}"
}

start_backend_local() {
  stop_local_pid "${BACKEND_PID_FILE}" "backend"
  stop_process_on_port 8080 "backend"
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
  stop_process_on_port 5173 "frontend"
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

docker_available() {
  docker info >/dev/null 2>&1
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

prefer_local_backend() {
  [[ "${BACKEND_MODE}" != "docker" ]]
}

prefer_local_frontend() {
  [[ "${FRONTEND_MODE}" != "docker" ]]
}

service_start() {
  local target="${1:-}"
  case "${target}" in
    backend)
      stop_local_pid "${BACKEND_PID_FILE}" "backend"
      stop_process_on_port 8080 "backend"
      if prefer_local_backend; then
        if docker_available; then
          dc stop backend >/dev/null 2>&1 || true
        fi
        log "backend mode=local"
        start_backend_local
      elif docker_available; then
        ensure_acp_env
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
      else
        log "docker daemon unavailable; backend local mode."
        start_backend_local
      fi
      ;;
    frontend)
      stop_local_pid "${FRONTEND_PID_FILE}" "frontend"
      stop_process_on_port 5173 "frontend"
      if prefer_local_frontend; then
        if docker_available; then
          dc stop frontend >/dev/null 2>&1 || true
        fi
        log "frontend mode=local"
        start_frontend_local
      elif docker_available; then
        ensure_acp_env
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
      else
        log "docker daemon unavailable; frontend local mode."
        start_frontend_local
      fi
      ;;
    all)
      require_docker
      ensure_acp_env
      log "restart stack (postgres + local services)"
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
  case "${target}" in
    backend|frontend|postgres)
      if [[ "${target}" == "postgres" ]]; then
        require_docker
      fi
      log "stop ${target}"
      if docker_available; then
        dc stop "${target}" || true
      fi
      if [[ "${target}" == "backend" ]]; then
        stop_local_pid "${BACKEND_PID_FILE}" "backend"
        stop_process_on_port 8080 "backend"
      fi
      if [[ "${target}" == "frontend" ]]; then
        stop_local_pid "${FRONTEND_PID_FILE}" "frontend"
        stop_process_on_port 5173 "frontend"
      fi
      ;;
    all)
      require_docker
      log "stop frontend/backend/postgres"
      dc stop frontend backend postgres || true
      stop_local_pid "${BACKEND_PID_FILE}" "backend"
      stop_local_pid "${FRONTEND_PID_FILE}" "frontend"
      stop_process_on_port 8080 "backend"
      stop_process_on_port 5173 "frontend"
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
  local backend_listener_pid
  local frontend_listener_pid

  backend_listener_pid="$(listener_pid 8080)"
  frontend_listener_pid="$(listener_pid 5173)"

  if docker_available; then
    dc_base ps
  else
    echo "docker: unavailable"
  fi
  echo "backend-mode: ${BACKEND_MODE}"
  echo "frontend-mode: ${FRONTEND_MODE}"
  if [[ -f "${BACKEND_PID_FILE}" ]]; then
    local bp
    bp="$(cat "${BACKEND_PID_FILE}" 2>/dev/null || true)"
    if pid_alive "${bp}"; then
      echo "local-backend: running (pid=${bp})"
    elif [[ -n "${backend_listener_pid}" ]]; then
      echo "local-backend: running (listener pid=${backend_listener_pid}, pid file stale)"
    else
      echo "local-backend: stale pid file"
    fi
  elif [[ -n "${backend_listener_pid}" ]]; then
    echo "local-backend: running (listener pid=${backend_listener_pid})"
  else
    echo "local-backend: not running"
  fi
  if [[ -f "${FRONTEND_PID_FILE}" ]]; then
    local fp
    fp="$(cat "${FRONTEND_PID_FILE}" 2>/dev/null || true)"
    if pid_alive "${fp}"; then
      echo "local-frontend: running (pid=${fp})"
    elif [[ -n "${frontend_listener_pid}" ]]; then
      echo "local-frontend: running (listener pid=${frontend_listener_pid}, pid file stale)"
    else
      echo "local-frontend: stale pid file"
    fi
  elif [[ -n "${frontend_listener_pid}" ]]; then
    echo "local-frontend: running (listener pid=${frontend_listener_pid})"
  else
    echo "local-frontend: not running"
  fi
}

service_logs() {
  local target="${1:-all}"
  log "streaming logs. press Ctrl+C to return to menu."
  case "${target}" in
    backend|frontend|postgres)
      if [[ "${target}" == "backend" && -f "${BACKEND_LOG_FILE}" ]]; then
        tail -f "${BACKEND_LOG_FILE}"
      elif [[ "${target}" == "frontend" && -f "${FRONTEND_LOG_FILE}" ]]; then
        tail -f "${FRONTEND_LOG_FILE}"
      else
        require_docker
        dc logs -f --tail=200 "${target}"
      fi
      ;;
    all)
      require_docker
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

show_quick_guide() {
  cat <<EOF
=====================================
 KIFU Quick Guide
=====================================
 One door:
   ${PROJECT_ROOT}/KIFU-Control.command
   ${PROJECT_ROOT}/scripts/devctl.sh

 Local dev rule:
   postgres = docker
   backend  = local
   frontend = local

 Most used:
   ./scripts/devctl.sh restart backend
   ./scripts/devctl.sh restart frontend
   ./scripts/devctl.sh status
   ./scripts/devctl.sh logs backend
   ./scripts/devctl.sh logs frontend

 If something feels broken:
   1) ./scripts/devctl.sh status
   2) ./scripts/devctl.sh logs backend
   3) ./scripts/devctl.sh logs frontend
   4) ./scripts/devctl.sh health

 Saved guide:
   ${QUICKSTART_FILE}
=====================================
EOF
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
19) Quick guide
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
    19) show_quick_guide ;;
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
  ./scripts/devctl.sh guide

Recommended:
  Double-click KIFU-Control.command
  Or read: KIFU-QUICKSTART.md
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
    guide)
      show_quick_guide
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
