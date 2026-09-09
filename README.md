# Copy Quatre

Grid matching game — copy the reference pattern before time runs out.

## Setup

Installs Node.js and pnpm into `.tools/` (no global system packages):

```bash
./scripts/setup.sh
source scripts/env.sh
```

Or if you already have Node 20+ and pnpm:

```bash
pnpm install
pnpm --filter @copy-quatre/core build
```

## Development

```bash
pnpm dev            # web dev server at http://localhost:5173
pnpm test           # core + web tests
pnpm test:coverage  # core tests with 90%+ coverage gate
pnpm build          # build core + web
```

## Android (Capacitor)

```bash
pnpm build
pnpm cap:sync       # build web + sync to Android project
pnpm cap:open       # open Android Studio
```

Android shell is committed at `packages/web/android/`. Run `pnpm cap:sync` after web changes to copy the latest bundle into the native project before building an APK.

## Project structure

- `packages/core` — game logic, pattern generation, scoring (framework-agnostic, fully unit tested)
- `packages/web` — React + Vite browser client + Capacitor shell

## Game controls

- Click/tap to toggle a cell on/off
- Click-drag or tap-drag to paint cells with the same on/off state
- Pause button during play; Resume from pause overlay
- Settings and high scores accessible from title screen only
