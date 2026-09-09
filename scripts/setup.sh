#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$ROOT/.tools"
NODE_VERSION="20.18.2"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) NODE_ARCH="x64" ;;
  aarch64|arm64) NODE_ARCH="arm64" ;;
  *) echo "Unsupported arch: $ARCH" >&2; exit 1 ;;
esac

NODE_DIR="$TOOLS/node-v${NODE_VERSION}-linux-${NODE_ARCH}"
NODE_BIN="$NODE_DIR/bin/node"

if [[ ! -x "$NODE_BIN" ]]; then
  echo "Installing Node.js v${NODE_VERSION} to .tools/ ..."
  mkdir -p "$TOOLS"
  TARBALL="node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz"
  TARBALL_URL="https://nodejs.org/dist/v${NODE_VERSION}/${TARBALL}"
  SHASUMS_URL="https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt"
  curl -fsSL "$TARBALL_URL" -o "$TOOLS/$TARBALL"
  curl -fsSL "$SHASUMS_URL" -o "$TOOLS/SHASUMS256.txt"
  EXPECTED="$(grep " ${TARBALL}\$" "$TOOLS/SHASUMS256.txt" | awk '{print $1}')"
  ACTUAL="$(sha256sum "$TOOLS/$TARBALL" | awk '{print $1}')"
  if [[ -z "$EXPECTED" || "$EXPECTED" != "$ACTUAL" ]]; then
    echo "Node.js tarball checksum mismatch" >&2
    exit 1
  fi
  tar -xJf "$TOOLS/$TARBALL" -C "$TOOLS"
  rm "$TOOLS/$TARBALL" "$TOOLS/SHASUMS256.txt"
fi

export PATH="$NODE_DIR/bin:$PATH"
PNPM_HOME="$TOOLS/pnpm"
export PNPM_HOME
export PATH="$PNPM_HOME:$PATH"

if [[ ! -x "$PNPM_HOME/pnpm" ]]; then
  echo "Installing pnpm to .tools/pnpm ..."
  mkdir -p "$PNPM_HOME"
  "$NODE_BIN" "$NODE_DIR/lib/node_modules/corepack/dist/corepack.js" prepare pnpm@9.15.4 --activate
  corepack enable
fi

echo "Installing dependencies ..."
cd "$ROOT"
pnpm install

echo "Building core ..."
pnpm --filter @copy-quatre/core build

echo "Running tests ..."
pnpm test:coverage

echo ""
echo "Setup complete. Run: source scripts/env.sh && pnpm dev"
