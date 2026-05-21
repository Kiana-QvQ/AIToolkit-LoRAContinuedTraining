#!/usr/bin/env bash
# Install pinned diffusers without blocking on github.com (use mirror + pip).
set -euo pipefail

VENV_DIR="${VENV_DIR:-${INSTALL_DIR:-$HOME/ai-toolkit-gl}/venv}"
DIFFUSERS_COMMIT="${DIFFUSERS_COMMIT:-dc8d9032171c83741fd37ed2b12bc9d8274464f3}"
WORK_DIR="${WORK_DIR:-/tmp/diffusers-aitk-build}"
MIRROR_PREFIX="${MIRROR_PREFIX:-https://ghproxy.net/}"

if [[ -f "$VENV_DIR/bin/activate" ]]; then
  # shellcheck source=/dev/null
  source "$VENV_DIR/bin/activate"
else
  echo "Activate venv first or set VENV_DIR"
  exit 1
fi

pip install -U pip wheel setuptools -q

if python -c "import diffusers" 2>/dev/null; then
  echo "diffusers already importable in $VENV_DIR"
  python -c "import diffusers; print('diffusers', diffusers.__version__)"
  exit 0
fi

rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

if [[ ! -d diffusers/.git ]]; then
  echo "Cloning diffusers via mirror ..."
  git clone "${MIRROR_PREFIX}https://github.com/huggingface/diffusers.git" diffusers
fi
cd diffusers
git fetch origin "$DIFFUSERS_COMMIT" 2>/dev/null || git fetch --all
git checkout "$DIFFUSERS_COMMIT"

echo "Installing diffusers (editable) ..."
pip install -e . -i https://pypi.tuna.tsinghua.edu.cn/simple
python -c "import diffusers; print('OK diffusers', diffusers.__version__)"
