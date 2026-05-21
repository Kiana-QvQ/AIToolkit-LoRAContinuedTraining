#!/usr/bin/env bash
# Start ai-toolkit-gl WebUI on UI_PORT (default 6008).
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-$HOME/ai-toolkit-gl}"
ENV_FILE="${ENV_FILE:-$INSTALL_DIR/autodl-gl.env}"
UI_PORT="${UI_PORT:-6008}"
LOG_FILE="${LOG_FILE:-$INSTALL_DIR/ui/ui-gl.log}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$ENV_FILE"
fi

export INSTALL_DIR="${INSTALL_DIR:-$HOME/ai-toolkit-gl}"
export TOOLKIT_ROOT="${TOOLKIT_ROOT:-$INSTALL_DIR}"
export UI_PORT="${UI_PORT:-6008}"
export PORT="$UI_PORT"

if [[ ! -d "$INSTALL_DIR/ui" ]]; then
  echo "Run scripts/autodl-setup-gl.sh first."
  exit 1
fi

if [[ -x "$INSTALL_DIR/venv/bin/python" ]]; then
  export AI_TOOLKIT_PYTHON="$INSTALL_DIR/venv/bin/python"
  export PATH="$(dirname "$AI_TOOLKIT_PYTHON"):$PATH"
elif [[ -n "${AI_TOOLKIT_PYTHON:-}" && -x "$AI_TOOLKIT_PYTHON" ]]; then
  export PATH="$(dirname "$AI_TOOLKIT_PYTHON"):$PATH"
else
  echo "WARN: No $INSTALL_DIR/venv/bin/python — run autodl-setup-gl.sh (USE_CONDA=1)"
fi

pkill -f "ai-toolkit-gl/ui.*concurrently" 2>/dev/null || true
pkill -f "ai-toolkit-gl/ui.*next start" 2>/dev/null || true
pkill -f "ai-toolkit-gl/ui.*dist/cron/worker" 2>/dev/null || true
sleep 1

cd "$INSTALL_DIR/ui"
if [[ ! -d "$INSTALL_DIR/ui/.next" ]]; then
  echo "UI not built. Run: bash $INSTALL_DIR/scripts/autodl-setup-gl.sh"
  exit 1
fi

mkdir -p "$(dirname "$LOG_FILE")"
nohup npm run start >>"$LOG_FILE" 2>&1 &
echo "Started ai-toolkit-gl UI on port $UI_PORT (nohup pid $!)"
echo "Python: ${AI_TOOLKIT_PYTHON:-system python3}"
echo "Log: $LOG_FILE"
sleep 4
if ss -lntp 2>/dev/null | grep -q ":$UI_PORT " || netstat -lntp 2>/dev/null | grep -q ":$UI_PORT "; then
  echo "Listening on *:$UI_PORT"
  curl -s -o /dev/null -w "datasets/list HTTP %{http_code}\n" "http://127.0.0.1:$UI_PORT/api/datasets/list" || true
else
  echo "Port $UI_PORT not listening yet. Check: tail -f $LOG_FILE"
fi
echo "AutoDL console: add custom service -> port $UI_PORT -> http://127.0.0.1:$UI_PORT"
