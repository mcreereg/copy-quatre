#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/graphics/icons/app-icon-512.png"
RES="$ROOT/packages/web/android/app/src/main/res"

if [[ ! -f "$SRC" ]]; then
  echo "Missing source icon: $SRC" >&2
  exit 1
fi

if ! command -v convert >/dev/null 2>&1; then
  echo "ImageMagick 'convert' is required to generate Android launcher icons." >&2
  exit 1
fi

declare -A SIZES=(
  [mdpi]=48
  [hdpi]=72
  [xhdpi]=96
  [xxhdpi]=144
  [xxxhdpi]=192
)

for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  size="${SIZES[$density]}"
  dir="$RES/mipmap-$density"
  mkdir -p "$dir"

  for name in ic_launcher ic_launcher_round ic_launcher_foreground; do
    convert "$SRC" -resize "${size}x${size}" "$dir/${name}.png"
  done
done

echo "Generated Android launcher icons from $SRC"
