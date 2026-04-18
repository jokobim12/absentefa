#!/bin/bash
# Script to download face-api models

BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
DEST="public/models"

mkdir -p "$DEST"

MODELS=(
    "tiny_face_detector_model-weights_manifest.json"
    "tiny_face_detector_model-shard1"
    "ssd_mobilenetv1_model-weights_manifest.json"
    "ssd_mobilenetv1_model-shard1"
    "ssd_mobilenetv1_model-shard2"
    "face_landmark_68_model-weights_manifest.json"
    "face_landmark_68_model-shard1"
    "face_recognition_model-weights_manifest.json"
    "face_recognition_model-shard1"
    "face_recognition_model-shard2"
)

for FILE in "${MODELS[@]}"; do
    echo "Downloading $FILE..."
    curl -L "$BASE_URL/$FILE" -o "$DEST/$FILE"
done

echo "Models downloaded successfully to $DEST"
