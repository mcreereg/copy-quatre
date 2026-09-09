#!/usr/bin/env bash
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) NODE_ARCH="x64" ;;
  aarch64|arm64) NODE_ARCH="arm64" ;;
esac
export PATH="$ROOT/.tools/node-v20.18.2-linux-${NODE_ARCH}/bin:$ROOT/.tools/pnpm:$PATH"
