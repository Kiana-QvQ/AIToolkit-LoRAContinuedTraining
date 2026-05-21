#!/usr/bin/env bash
# Install ai-toolkit-gl beside stock ~/ai-toolkit on AutoDL (no overwrite).
# Default Python: conda env "ai-toolkit" (same as the stock AI-Toolkit image).
# Prereq: ~/ai-toolkit-gl.zip uploaded, or repo already at ~/ai-toolkit-gl.
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-$HOME/ai-toolkit-gl}"
ZIP_PATH="${ZIP_PATH:-$HOME/ai-toolkit-gl.zip}"
DATA_ROOT="${DATA_ROOT:-$HOME/autodl-tmp}"
HF_HOME="${HF_HOME:-$DATA_ROOT/huggingface_cache}"
UI_PORT="${UI_PORT:-6008}"
FORCE_EXTRACT="${FORCE_EXTRACT:-0}"

# Conda (AutoDL AI-Toolkit image default — see: conda env list)
USE_CONDA="${USE_CONDA:-1}"
CONDA_ROOT="${CONDA_ROOT:-$HOME/miniconda3}"
CONDA_ENV="${CONDA_ENV:-ai-toolkit}"
CONDA_PYTHON="$CONDA_ROOT/envs/$CONDA_ENV/bin/python"

# Legacy fallbacks (some images still have ~/ai-toolkit/venv)
USE_STOCK_VENV="${USE_STOCK_VENV:-0}"
STOCK_VENV="${STOCK_VENV:-$HOME/ai-toolkit/venv}"
VENV_DIR="${VENV_DIR:-$INSTALL_DIR/venv}"

echo "=== AI Toolkit GL side-by-side setup ==="
echo "Install dir: $INSTALL_DIR"
echo "Data root:   $DATA_ROOT"
echo "UI port:     $UI_PORT (stock ~/ai-toolkit WebUI is usually 6006)"
echo "USE_CONDA:   $USE_CONDA  env=$CONDA_ENV"

mkdir -p "$DATA_ROOT"

if [[ -f "$ZIP_PATH" ]] && { [[ ! -f "$INSTALL_DIR/run.py" ]] || [[ "$FORCE_EXTRACT" == "1" ]]; }; then
  echo "Extracting $ZIP_PATH ..."
  rm -rf "$INSTALL_DIR"
  mkdir -p "$(dirname "$INSTALL_DIR")"
  unzip -q -o "$ZIP_PATH" -d "$HOME"
  if [[ ! -f "$INSTALL_DIR/run.py" && -d "$HOME/ai-toolkit-gl/ai-toolkit-gl" ]]; then
    mv "$HOME/ai-toolkit-gl/ai-toolkit-gl" "$INSTALL_DIR"
  fi
fi

if [[ ! -f "$INSTALL_DIR/run.py" ]]; then
  echo "Missing $INSTALL_DIR/run.py — upload ai-toolkit-gl.zip to ~ and re-run."
  exit 1
fi

LIST_ROUTE="$INSTALL_DIR/ui/src/app/api/datasets/list/route.ts"
if [[ ! -f "$LIST_ROUTE" ]]; then
  echo "ERROR: Missing $LIST_ROUTE"
  echo "Your zip is outdated. Re-pack on Windows: .\\scripts\\pack_autodl_zip.ps1"
  exit 1
fi

cd "$INSTALL_DIR"
chmod +x "$INSTALL_DIR/scripts/"*.sh 2>/dev/null || true

# --- Python environment ---
PYTHON_BIN=""
if [[ "$USE_CONDA" == "1" && -x "$CONDA_PYTHON" ]]; then
  echo "Using conda: $CONDA_PYTHON"
  "$CONDA_PYTHON" -c "import torch, diffusers" || {
    echo "conda env $CONDA_ENV missing torch/diffusers. Activate and fix:"
    echo "  conda activate $CONDA_ENV"
    exit 1
  }
  mkdir -p "$INSTALL_DIR/venv/bin"
  ln -sf "$CONDA_PYTHON" "$INSTALL_DIR/venv/bin/python"
  PYTHON_BIN="$INSTALL_DIR/venv/bin/python"
elif [[ "$USE_STOCK_VENV" == "1" && -f "$STOCK_VENV/bin/activate" ]]; then
  echo "Using stock venv: $STOCK_VENV"
  # shellcheck source=/dev/null
  source "$STOCK_VENV/bin/activate"
  PYTHON_BIN="$(command -v python)"
  "$PYTHON_BIN" -c "import torch, diffusers" || {
    echo "Stock venv missing torch/diffusers."
    exit 1
  }
  mkdir -p "$INSTALL_DIR/venv/bin"
  ln -sf "$PYTHON_BIN" "$INSTALL_DIR/venv/bin/python"
  PYTHON_BIN="$INSTALL_DIR/venv/bin/python"
else
  VENV_MINE="$INSTALL_DIR/venv-mine"
  echo "Creating venv-mine (slow; prefer USE_CONDA=1 on AutoDL): $VENV_MINE"
  python3 -m venv "$VENV_MINE"
  # shellcheck source=/dev/null
  source "$VENV_MINE/bin/activate"
  pip install -U pip -q
  REQ_NO_GIT="$INSTALL_DIR/requirements.autodl.nogit.txt"
  grep -v '^git+https://github.com/huggingface/diffusers' "$INSTALL_DIR/requirements_base.txt" >"$REQ_NO_GIT" || true
  echo "scipy==1.12.0" >>"$REQ_NO_GIT"
  pip install -r "$REQ_NO_GIT" -i https://pypi.tuna.tsinghua.edu.cn/simple
  VENV_DIR="$VENV_MINE" bash "$INSTALL_DIR/scripts/autodl-install-diffusers.sh"
  pip install bitsandbytes -q 2>/dev/null || true
  mkdir -p "$INSTALL_DIR/venv/bin"
  ln -sf "$VENV_MINE/bin/python" "$INSTALL_DIR/venv/bin/python"
  PYTHON_BIN="$INSTALL_DIR/venv/bin/python"
fi

export HF_HOME="$HF_HOME"
export HUGGINGFACE_HUB_CACHE="$HF_HOME/hub"
export HF_ENDPOINT="${HF_ENDPOINT:-https://hf-mirror.com}"

mkdir -p "$INSTALL_DIR/output" \
  "$DATA_ROOT/datasets" "$DATA_ROOT/train" "$DATA_ROOT/training" \
  "$DATA_ROOT/loras" "$DATA_ROOT/models" "$HF_HOME/hub"

# 与 Jupyter / 秋叶 lora-scripts 对齐：数据集优先 autodl-tmp/train
if [[ -d "$DATA_ROOT/train" ]]; then
  DATASETS_FOLDER="$DATA_ROOT/train"
elif [[ -d /root/lora-scripts/train ]]; then
  DATASETS_FOLDER="/root/lora-scripts/train"
else
  DATASETS_FOLDER="$DATA_ROOT/datasets"
fi
TRAINING_FOLDER="$DATA_ROOT/training"
LORAS_FOLDER="$DATA_ROOT/loras"
MODELS_FOLDER="$DATA_ROOT/models"

echo "Building UI ..."
cd "$INSTALL_DIR/ui"
if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found."
  exit 1
fi
npm install
npm run update_db
export INSTALL_DIR DATA_ROOT HF_HOME TRAINING_FOLDER DATASETS_FOLDER LORAS_FOLDER MODELS_FOLDER
bash "$INSTALL_DIR/scripts/seed-autodl-settings.sh"
rm -rf .next
npm run build

if [[ ! -d "$INSTALL_DIR/ui/.next/server/app/api/datasets/list" ]]; then
  echo "WARN: build missing api/datasets/list — check npm run build output"
fi

cat > "$INSTALL_DIR/autodl-gl.env" <<EOF
# source ~/ai-toolkit-gl/autodl-gl.env
export INSTALL_DIR="$INSTALL_DIR"
export TOOLKIT_ROOT="$INSTALL_DIR"
export UI_PORT="$UI_PORT"
export PORT="$UI_PORT"
export HF_HOME="$HF_HOME"
export HUGGINGFACE_HUB_CACHE="$HF_HOME/hub"
export HF_ENDPOINT="$HF_ENDPOINT"
export DATA_ROOT="$DATA_ROOT"
export TRAINING_FOLDER="$TRAINING_FOLDER"
export DATASETS_FOLDER="$DATASETS_FOLDER"
export LORAS_FOLDER="$LORAS_FOLDER"
export MODELS_FOLDER="$MODELS_FOLDER"
export AI_TOOLKIT_PYTHON="$INSTALL_DIR/venv/bin/python"
export PYTHONNOUSERSITE=1
export PATH="\$(dirname "\$AI_TOOLKIT_PYTHON"):\$PATH"
EOF

echo ""
echo "=== Setup complete ==="
echo "  source $INSTALL_DIR/autodl-gl.env"
echo "  bash $INSTALL_DIR/scripts/autodl-start-gl-ui.sh"
echo "  bash $INSTALL_DIR/scripts/autodl-install-autostart.sh   # boot autostart on 6008"
echo "Verify: curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$UI_PORT/api/datasets/list  (expect 200)"
echo "Share HF cache with stock ~/ai-toolkit: bash $INSTALL_DIR/scripts/autodl-shared-hf.sh"
