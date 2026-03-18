#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

echo "[KIFU] main door: $PROJECT_ROOT/KIFU-Control.command"
echo "[KIFU] quick guide: $PROJECT_ROOT/KIFU-QUICKSTART.md"
echo

./scripts/devctl.sh
