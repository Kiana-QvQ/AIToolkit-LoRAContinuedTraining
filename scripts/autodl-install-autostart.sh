#!/usr/bin/env bash
# Register ai-toolkit-gl UI to start on boot (port 6008 by default).
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-$HOME/ai-toolkit-gl}"
ENV_FILE="${ENV_FILE:-$INSTALL_DIR/autodl-gl.env}"
MARKER="ai-toolkit-gl-autostart"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$ENV_FILE"
fi

START_SCRIPT="$INSTALL_DIR/scripts/autodl-start-gl-ui.sh"
chmod +x "$INSTALL_DIR/scripts/"*.sh 2>/dev/null || true

# crontab @reboot (optional — many AutoDL images omit crontab)
if command -v crontab >/dev/null 2>&1; then
  CRON_CMD="@reboot sleep 60 && INSTALL_DIR=$INSTALL_DIR UI_PORT=${UI_PORT:-6008} bash $START_SCRIPT >> $INSTALL_DIR/ui/autostart.log 2>&1"
  (
    crontab -l 2>/dev/null | grep -v "$MARKER" | grep -v "autodl-start-gl-ui" || true
    echo "# $MARKER"
    echo "$CRON_CMD"
  ) | crontab -
  echo "Installed crontab @reboot:"
  crontab -l | grep -E "autodl-start|$MARKER" || true
else
  echo "WARN: crontab not installed — skip @reboot hook."
  echo "  Use AutoDL custom service for port ${UI_PORT:-6008}, or run after each boot:"
  echo "  bash $START_SCRIPT"
fi

# Optional: supervisor if available
if command -v supervisorctl >/dev/null 2>&1 && [[ -d /etc/supervisor/conf.d ]]; then
  SUP_CONF="/etc/supervisor/conf.d/ai-toolkit-gl.conf"
  cat >"$SUP_CONF" <<EOF
[program:ai-toolkit-gl]
command=/bin/bash -lc "source $ENV_FILE 2>/dev/null; bash $START_SCRIPT"
directory=$INSTALL_DIR/ui
autostart=true
autorestart=true
startsecs=10
stdout_logfile=$INSTALL_DIR/ui/supervisor-gl.log
stderr_logfile=$INSTALL_DIR/ui/supervisor-gl.err.log
EOF
  supervisorctl reread 2>/dev/null || true
  supervisorctl update 2>/dev/null || true
  echo "Also wrote $SUP_CONF (supervisor)"
fi

echo ""
echo "Done. Manual start: bash $START_SCRIPT"
echo "AutoDL panel: Custom Service -> port ${UI_PORT:-6008} -> http://127.0.0.1:${UI_PORT:-6008}"
