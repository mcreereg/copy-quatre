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

### patgen (local dev only)

Pattern generator dev tool for experimenting with algorithms. PC-only, not built for release.

```bash
pnpm patgen         # GUI at http://localhost:5174
pnpm patgen:cli     # CLI — ASCII patterns, sequential output
pnpm patgen:cli --help
pnpm patgen:cli --algorithm morphology-mix --count 4 --grid-size 8
```

## Android (Capacitor)

Native shell is committed at `packages/web/android/`. After web changes, sync the bundle, then build an APK.

**Prerequisites:** Android Studio, or JDK 21 + Android SDK. For CLI builds, set `ANDROID_HOME` (or `ANDROID_SDK_ROOT`).

```bash
pnpm cap:sync       # build web + copy dist into android/
```

### Debug APK (CLI)

```bash
cd packages/web/android
./gradlew assembleDebug
```

APK: `packages/web/android/app/build/outputs/apk/debug/app-debug.apk`

Install on a device/emulator: `adb install packages/web/android/app/build/outputs/apk/debug/app-debug.apk`

### Android Studio

```bash
pnpm cap:open       # open the android/ project
```

Then **Build → Build Bundle(s) / APK(s) → Build APK(s)**. Same debug APK path as above.

### Release APK

```bash
cd packages/web/android
./gradlew assembleRelease
```

APK: `packages/web/android/app/build/outputs/apk/release/`. No signing config in this repo, so the release APK is unsigned until you add a keystore in `app/build.gradle`.

## Project structure

- `packages/core` — game logic, pattern generation, scoring (framework-agnostic, fully unit tested)
- `packages/web` — React + Vite browser client + Capacitor shell
- `packages/patgen` — local-dev pattern generator tool (CLI + GUI, not shipped)

## Game controls

- Click/tap to toggle a cell on/off
- Click-drag or tap-drag to paint cells with the same on/off state
- Pause button during play; Resume from pause overlay
- Settings and high scores accessible from title screen only
