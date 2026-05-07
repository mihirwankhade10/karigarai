#!/usr/bin/env bash
# ===========================================================================
# Download human.js face detection models from jsDelivr.
# Each .json file references one or more .bin weight files \u2014 both must exist
# in the same directory. The fraud worker loads from backend/models/human/.
# ===========================================================================
set -e

MODEL_DIR="$(dirname "$0")/models/human"
mkdir -p "$MODEL_DIR"

BASE="https://cdn.jsdelivr.net/npm/@vladmandic/human/models"

# blazeface (fast face detector)
FILES=(
  "blazeface.json"
  "blazeface.bin"
  # face mesh \u2014 required by human for landmarks
  "facemesh.json"
  "facemesh.bin"
  # faceres \u2014 128-dim face descriptor (the embedding model)
  "faceres.json"
  "faceres.bin"
  # iris (optional but referenced by some pipelines)
  "iris.json"
  "iris.bin"
  # emotion (small) \u2014 optional, kept for completeness
  "emotion.json"
  "emotion.bin"
)

echo "Downloading human.js models to $MODEL_DIR"
for f in "${FILES[@]}"; do
  if [ -f "$MODEL_DIR/$f" ]; then
    echo "  exists: $f"
    continue
  fi
  echo "  fetch:  $f"
  curl -fsSL "$BASE/$f" -o "$MODEL_DIR/$f" || {
    echo "    ! failed to fetch $f \u2014 the worker will throw on startup unless this is resolved" >&2
  }
done

echo "Done."
