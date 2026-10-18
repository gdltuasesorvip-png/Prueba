#!/usr/bin/env bash
# Renderiza el borrador y normaliza el audio según estilo.md §9 (−15 LUFS, high-pass 80 Hz, compresión 3:1).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out
COMP="${1:-Borrador}"; SALIDA="${2:-borrador}"
npx remotion render src/index.ts "$COMP" "out/${SALIDA}_raw.mp4" --concurrency="${CONCURRENCY:-3}" --codec=h264 --crf=20 --log=error
ffmpeg -y -v error -i "out/${SALIDA}_raw.mp4" \
  -af "highpass=f=80,acompressor=threshold=-18dB:ratio=3:attack=5:release=80,loudnorm=I=-15:TP=-1.5:LRA=7" \
  -c:v copy -c:a aac -b:a 192k -movflags +faststart "out/${SALIDA}.mp4"
rm -f "out/${SALIDA}_raw.mp4"
echo "OK -> out/${SALIDA}.mp4"
