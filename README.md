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
pnpm dev          # start web dev server at http://localhost:5173
pnpm test         # run all tests
pnpm test:coverage # core tests with 90%+ coverage gate
pnpm build        # build core + web
```

## Project structure

- `packages/core` — game logic, pattern generation, scoring (framework-agnostic, fully unit tested)
- `packages/web` — React + Vite browser client

## Game controls

- Click/tap to toggle a cell on/off
- Click-drag or tap-drag to paint cells with the same on/off state
- Pause button during play
- Settings and high scores accessible from title screen only
