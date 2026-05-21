#!/usr/bin/env bash
# Point both stock ~/ai-toolkit and ~/ai-toolkit-gl at the same HuggingFace cache on AutoDL.
set -euo pipefail

DATA_ROOT="${DATA_ROOT:-$HOME/autodl-tmp}"
HF_HOME="${HF_HOME:-$DATA_ROOT/huggingface_cache}"
HF_ENDPOINT="${HF_ENDPOINT:-https://hf-mirror.com}"

mkdir -p "$HF_HOME/hub"

echo "Shared HF_HOME=$HF_HOME"
echo "Add to ~/.bashrc or run before training:"
echo "  export HF_HOME=$HF_HOME"
echo "  export HUGGINGFACE_HUB_CACHE=$HF_HOME/hub"
echo "  export HF_ENDPOINT=$HF_ENDPOINT"
echo ""
echo "Official ai-toolkit (6006) will use the same cache when name_or_path is a HF repo id."
echo "ai-toolkit-gl (6008) uses autodl-gl.env automatically."
