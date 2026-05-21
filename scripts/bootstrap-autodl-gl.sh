#!/usr/bin/env bash
# Run when only ~/ai-toolkit-gl.zip exists on the server.
#   bash bootstrap-autodl-gl.sh
# Or: unzip -p ~/ai-toolkit-gl.zip ai-toolkit-gl/scripts/bootstrap-autodl-gl.sh | bash
set -euo pipefail

export USE_CONDA="${USE_CONDA:-1}"
export UI_PORT="${UI_PORT:-6008}"

ZIP_PATH="${ZIP_PATH:-$HOME/ai-toolkit-gl.zip}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/ai-toolkit-gl}"

if [[ ! -f "$ZIP_PATH" ]]; then
  echo "Put ai-toolkit-gl.zip in $HOME first."
  exit 1
fi

if [[ ! -f "$INSTALL_DIR/scripts/autodl-deploy.sh" ]]; then
  echo "Extracting $ZIP_PATH -> $HOME ..."
  unzip -q -o "$ZIP_PATH" -d "$HOME"
fi

chmod +x "$INSTALL_DIR/scripts/"*.sh 2>/dev/null || true
exec bash "$INSTALL_DIR/scripts/autodl-deploy.sh"
