#!/usr/bin/env bash
# Seed UI settings DB for AutoDL / 秋叶 lora-scripts layout.
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-$HOME/ai-toolkit-gl}"
DATA_ROOT="${DATA_ROOT:-$HOME/autodl-tmp}"
DB_PATH="${DB_PATH:-$INSTALL_DIR/aitk_db.db}"

if [[ ! -f "$DB_PATH" ]]; then
  echo "DB not found: $DB_PATH (run npm run update_db first)"
  exit 1
fi

# 数据集：优先 Jupyter/秋叶 的 train 目录
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
HF_HOME="${HF_HOME:-$DATA_ROOT/huggingface_cache}"

mkdir -p "$DATASETS_FOLDER" "$TRAINING_FOLDER" "$LORAS_FOLDER" "$MODELS_FOLDER" "$HF_HOME/hub"

upsert() {
  sqlite3 "$DB_PATH" "INSERT INTO Settings (key, value) VALUES ('$1', '$2') ON CONFLICT(key) DO UPDATE SET value=excluded.value;"
}

upsert "DATASETS_FOLDER" "$DATASETS_FOLDER"
upsert "TRAINING_FOLDER" "$TRAINING_FOLDER"
upsert "LORAS_FOLDER" "$LORAS_FOLDER"
upsert "MODELS_FOLDER" "$MODELS_FOLDER"
upsert "HF_HOME" "$HF_HOME"
upsert "HF_ENDPOINT" "${HF_ENDPOINT:-https://hf-mirror.com}"

echo "Seeded $DB_PATH:"
echo "  DATASETS_FOLDER=$DATASETS_FOLDER"
echo "  TRAINING_FOLDER=$TRAINING_FOLDER"
echo "  LORAS_FOLDER=$LORAS_FOLDER"
echo "  MODELS_FOLDER=$MODELS_FOLDER"
echo "  HF_HOME=$HF_HOME"
