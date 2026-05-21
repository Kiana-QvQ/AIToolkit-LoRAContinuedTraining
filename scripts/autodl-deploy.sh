#!/usr/bin/env bash
# One-shot deploy after uploading ai-toolkit-gl.zip to ~/
#   unzip -o ~/ai-toolkit-gl.zip -d ~
#   bash ~/ai-toolkit-gl/scripts/autodl-deploy.sh
# Or pipe from zip before extract:
#   unzip -p ~/ai-toolkit-gl.zip ai-toolkit-gl/scripts/autodl-deploy.sh | USE_CONDA=1 bash
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-$HOME/ai-toolkit-gl}"
ZIP_PATH="${ZIP_PATH:-$HOME/ai-toolkit-gl.zip}"

export USE_CONDA="${USE_CONDA:-1}"
export UI_PORT="${UI_PORT:-6008}"
export FORCE_EXTRACT="${FORCE_EXTRACT:-0}"

if [[ ! -f "$INSTALL_DIR/scripts/autodl-setup-gl.sh" && -f "$ZIP_PATH" ]]; then
  echo "Extracting zip first ..."
  unzip -q -o "$ZIP_PATH" -d "$HOME"
fi

bash "$INSTALL_DIR/scripts/autodl-setup-gl.sh"
bash "$INSTALL_DIR/scripts/autodl-install-autostart.sh" || echo "WARN: autostart step failed (non-fatal)"
bash "$INSTALL_DIR/scripts/autodl-start-gl-ui.sh"
bash "$INSTALL_DIR/scripts/autodl-verify-ui.sh" || true

echo ""
echo "=== Deploy finished ==="
echo "Open AutoDL -> Custom Service / WebUI -> port $UI_PORT"
