#!/usr/bin/env bash
# Quick checks after deploy.
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-$HOME/ai-toolkit-gl}"
UI_PORT="${UI_PORT:-6008}"

echo "=== Source ==="
ls -la "$INSTALL_DIR/ui/src/app/api/datasets/list/route.ts" 2>&1 || true

echo ""
echo "=== Build output ==="
if [[ -d "$INSTALL_DIR/ui/.next/server/app/api/datasets/list" ]]; then
  ls -la "$INSTALL_DIR/ui/.next/server/app/api/datasets/list"
else
  echo "MISSING .next/server/app/api/datasets/list — run: cd $INSTALL_DIR/ui && rm -rf .next && npm run build"
fi

echo ""
echo "=== Port $UI_PORT ==="
ss -lntp 2>/dev/null | grep ":$UI_PORT " || netstat -lntp 2>/dev/null | grep ":$UI_PORT " || echo "Not listening"
ps aux | grep -E "ai-toolkit-gl.*next|ai-toolkit-gl.*worker" | grep -v grep || true

echo ""
echo "=== HTTP ==="
curl -s -w "\ndatasets/list HTTP %{http_code}\n" "http://127.0.0.1:$UI_PORT/api/datasets/list" | head -c 200
echo ""
curl -s -w "settings HTTP %{http_code}\n" -o /dev/null "http://127.0.0.1:$UI_PORT/api/settings"
