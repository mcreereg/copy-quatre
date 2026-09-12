# Imposter Mode: Implementation Handoff

Status: approved design  
Scope: add second game mode, prepare architecture for roughly five modes  
Implementation status: not started

This document is normative. A fresh implementation context should be able to implement the feature using this document plus repository source. Where earlier discussion or examples are ambiguous, rules here win.

## 1. Product summary

Copy Quatre currently has one unnamed mode. Name it **Copy**.

Add **Imposter**:

1. Generate a random target using existing pattern generator.
2. Clone target into interactive grid.
3. Change clone with zero or more chunk shifts, then an exact number of eligible single-cell toggles.
4. Show target and changed interactive grid.
5. Player toggles or paints cells on interactive grid until it exactly equals target.
6. On equality, add one point and atomically replace both boards with next generated pair.
7. Continue until existing timer expires or player quits.

Copy behavior remains unchanged: target is generated pattern and interactive grid starts all Off.

Both modes share timer, score, pointer controls, pause, quit, match effects, game-over flow, pattern styles, and two-grid layout.

## 2. Goals

- Implement Imposter exactly as specified below.
- Keep game logic deterministic and framework-independent in `packages/core`.
- Preserve Copy behavior.
- Centralize mode metadata and round generation so later modes require one registry definition, one default profile, one generator, and focused tests instead of application-wide conditionals.
- Keep global preferences shared while retaining independent gameplay settings per mode.
- Track scores independently by mode and gameplay configuration.
- Reset incompatible pre-feature data once instead of carrying legacy shapes forward.
- Maintain core's 90% line, branch, function, and statement coverage gates.

## 3. Non-goals

- No player-facing difficulty setting.
- No Imposter-specific tuning controls.
- No lives, wrong-move penalty, move counter, combo, or score multiplier.
- No session resume.
- No migration of old settings or high scores.
- No changes to pattern algorithms.
- No diagonal cell adjacency or diagonal chunk movement.
- No animation redesign.
- No Imposter integration into `packages/patgen` required for release.

## 4. Terminology and invariants

- **On**: grid value `true`, rendered active.
- **Off**: grid value `false`, rendered inactive.
- **Target**: read-only reference grid.
- **Interactive**: player-editable grid.
- **Round**: one target/interactive pair.
- **Changed grid**: generated Imposter interactive grid before player input.
- **Toggle mutation**: one generator-time boolean inversion.
- **Chunk**: rectangular source area. Height and width may each be 1.
- **Shift**: simultaneous one-cell translation of a chunk N, E, S, or W.
- **Leading strip**: one-cell-wide destination strip newly entered by shift.
- **Trailing strip**: one-cell-wide source strip vacated by shift.
- **Hamming distance**: count of coordinates where two equal-size grids differ.

Required invariants:

- Target and interactive are same square size.
- Imposter starts with target and interactive unequal.
- Player can always solve by toggling every coordinate in symmetric difference once.
- Every returned generated pair completed all mutations selected for that generation attempt.
- No invalid or partially mutated pair may be returned.
- Generator-time toggle eligibility is recalculated against evolving interactive grid before every toggle.
- Target generation still honors selected `PatternStyle`.
- Consecutive target patterns should avoid identical hashes using existing `avoidHash` behavior.
- Same seed plus same settings produces same pair sequence.

## 5. Confirmed product decisions

| Decision | Value |
| --- | --- |
| Existing mode name | Copy |
| Mode selection | Compact selector directly on title screen |
| Selected mode persistence | Yes |
| Target generation | Existing cohesive/chaos generator |
| Toggle-count selection | Uniform integer, inclusive minimum through maximum |
| Mutation order | All shifts first, then toggles |
| Toggle adjacency | Orthogonal neighbors only |
| Outside grid | Not a neighbor; never treated as Off |
| Chunk edge range | Independently 1 through `ceil(gridSize / 2)` |
| Shift directions | N, E, S, W only |
| Shift distance | Exactly one cell |
| Shift collision rule | Newly entered leading strip must be Off |
| Shift source | Must contain at least one On cell |
| Shift operation | Snapshot source, clear source, write snapshot at destination |
| Player interaction | Existing click/tap toggle and drag paint |
| Completion | Exact grid equality |
| Score | One point per completed round |

## 6. Proposed source layout

New core files:

```text
packages/core/src/modes/
  types.ts
  registry.ts
  copy.ts
  imposter/
    budget.ts
    boundary.ts
    shift.ts
    generate.ts
    imposter.test.ts
```

Existing files changed:

```text
packages/core/src/types.ts
packages/core/src/settings.ts
packages/core/src/settings.test.ts
packages/core/src/highScore.ts
packages/core/src/highScore.test.ts
packages/core/src/gameEngine.ts
packages/core/src/gameEngine.test.ts
packages/core/src/grid.ts
packages/core/src/grid.test.ts
packages/core/src/index.ts

packages/web/src/App.tsx
packages/web/src/App.test.tsx
packages/web/src/platform/storage.ts
packages/web/src/platform/storage.test.ts
packages/web/src/components/ModeSelector.tsx
packages/web/src/screens/AnimationSettingsScreen.tsx
packages/web/src/screens/GameErrorScreen.tsx
packages/web/src/screens/TitleScreen.tsx
packages/web/src/screens/SettingsScreen.tsx
packages/web/src/screens/HighScoresScreen.tsx
packages/web/src/screens/PlayScreen.tsx
packages/web/src/screens/PlayScreen.test.tsx
packages/web/src/screens/PlayScreen.animation.test.tsx
packages/web/src/styles.css

packages/core/package.json
packages/web/package.json
README.md
```

Exact file splitting may vary, but public contracts, behavior, and test coverage in this document must remain.

## 7. Core data model

### 7.1 Mode and settings types

Use these conceptual types. Names may change only if semantics remain obvious.

```ts
export type GameModeId = "copy" | "imposter";

export type GameplaySettings = {
  timeLimitSec: number;
  gridSize: number;
  patternStyle: PatternStyle;
};

export type GlobalSettings = {
  theme: ThemeId;
  colorMode: ColorMode;
  vibration: boolean;
  animations: AnimationSettings;
};

export type Settings = {
  selectedMode: GameModeId;
  global: GlobalSettings;
  modes: Record<GameModeId, GameplaySettings>;
};

export type SessionSettings = GlobalSettings &
  GameplaySettings & {
    mode: GameModeId;
  };
```

Persist `Settings`. Pass immutable `SessionSettings` snapshot into engine at `START`. This prevents settings changes outside active game from mutating score identity or active behavior.

Add pure resolver:

```ts
resolveSessionSettings(settings: Settings, mode?: GameModeId): SessionSettings
```

Default `mode` is `settings.selectedMode`.

### 7.2 Defaults

Both initial mode profiles use current gameplay defaults:

```ts
const DEFAULT_GAMEPLAY_SETTINGS = {
  timeLimitSec: 90,
  gridSize: 4,
  patternStyle: "cohesive",
};
```

Global defaults stay:

```ts
{
  theme: "yellow",
  colorMode: "dark",
  vibration: true,
  animations: DEFAULT_ANIMATION_SETTINGS,
}
```

Default selected mode is `"copy"`.

Each mode profile must be a separate object. Never share mutable nested default references.

### 7.3 Validation

`validateSettings(raw: unknown): Settings` should validate unknown input, not require a compile-time `Settings`.

Rules:

- Reject non-object root by returning deep-cloned defaults.
- `selectedMode`: allow only IDs in mode registry; otherwise `"copy"`.
- Validate `global` fields with existing enum/boolean rules.
- For every registered mode, validate its profile independently.
- Missing, non-object, or array profile falls back to that mode's complete default profile.
- Valid profile object is validated field-by-field; one invalid field falls back only that field and preserves other valid fields.
- Ignore unknown root, global, and mode keys.
- Grid remains integer 2–10.
- Time remains 30–600 seconds, rounded to 30-second steps.
- Pattern style remains `"cohesive"` or `"chaos"`.
- Animation validation remains field-by-field.

Do not accept old flat settings as a migration path. One-time data reset occurs before load.

### 7.4 Runtime game state

Change `GameState.settings` to `SessionSettings`. Add no Imposter-only state unless UI needs generation metadata; metadata should normally remain test/debug output, not player state.

Change `isAnimationActive` to accept `AnimationSettings` directly:

```ts
isAnimationActive(animations: AnimationSettings, id: AnimationId): boolean
```

Callers use `state.settings.animations` or `settings.global.animations`. This avoids coupling animation helpers to persisted versus session settings shapes. `AnimationSettingsScreen` must read and update `settings.global.animations`.

Round shape:

```ts
export type GameRound = {
  reference: Grid;
  interactive: Grid;
};
```

Keep `reference` property for minimal churn even though Imposter UI labels it Target.

## 8. Mode registry

Use one ordered registry as source of truth for selectors, validation, labels, descriptions, and round generation.

```ts
export type RoundGenerationContext = {
  settings: SessionSettings;
  rng: Rng;
  avoidReferenceHash?: string;
};

export type GameModeDefinition = {
  id: GameModeId;
  name: string;
  description: string;
  referenceLabel: string;
  interactiveLabel: string;
  createRound(context: RoundGenerationContext): GameRound;
};
```

Registry order:

```ts
[
  {
    id: "copy",
    name: "Copy",
    description: "Recreate each target from an empty grid.",
    referenceLabel: "Copy this",
    interactiveLabel: "Your grid",
  },
  {
    id: "imposter",
    name: "Imposter",
    description: "Find every changed cell and restore the target.",
    referenceLabel: "Target",
    interactiveLabel: "Find and fix imposters",
  },
]
```

Required helpers:

```ts
GAME_MODES: readonly GameModeDefinition[]
GAME_MODE_IDS: readonly GameModeId[]
getGameMode(id: GameModeId): GameModeDefinition
isGameModeId(value: unknown): value is GameModeId
cycleGameMode(id: GameModeId, delta: -1 | 1): GameModeId
```

Future mode addition checklist:

1. Extend `GameModeId`.
2. Add default profile.
3. Add registry definition and round generator.
4. Add tests.

App, selector, settings validation, labels, and high-score filter must consume registry rather than duplicate mode switches.

## 9. Shared engine design

`packages/core/src/gameEngine.ts` remains lifecycle owner.

Shared behavior:

- start/tick/pause/resume/quit
- pointer stroke and drag painting
- exact equality completion
- one point per completion
- next-round buffering
- `SCORED`, `GAME_OVER`, and generation-failure events

Mode-specific behavior is only `createRound`.

Engine changes:

```ts
type GameAction =
  | { type: "START"; settings: SessionSettings }
  // existing actions unchanged

type GameEvent =
  | {
      type: "SCORED";
      score: number;
      matchedReference: Grid;
      matchedInteractive: Grid;
    }
  | {
      type: "GAME_OVER";
      score: number;
      reason: "timeout" | "quit";
      sessionSettings: SessionSettings;
    }
  | {
      type: "GENERATION_FAILED";
      stage: "start" | "round-advance";
      message: string;
      score: number;
      sessionSettings: SessionSettings;
    };
```

On start:

1. Resolve mode definition from `settings.mode`.
2. Generate current round.
3. Set score zero and timer from session settings.
4. Best-effort pre-generate next round with current target hash as `avoidReferenceHash`.
5. If current-round generation fails, leave engine non-playing and emit `GENERATION_FAILED` with stage `start`. App shows Game Error screen with Retry and Back. Retry dispatches a new START with same session settings.
6. If only pre-generation fails, keep playing current round with an empty next-round buffer. Do not surface an error yet.

On match:

1. Capture matched target and interactive for animation event.
2. Calculate incremented score.
3. Obtain complete next round from buffer, or generate it synchronously if buffer is empty.
4. If next round exists, atomically commit incremented score and next pair, reset stroke, emit `SCORED`, then best-effort pre-generate following round.
5. If next-round generation fails, still award completed point, set phase `gameover` while retaining equal matched grids, reset stroke, emit `SCORED`, then emit `GENERATION_FAILED` with stage `round-advance`.

App handles `GENERATION_FAILED` stage `round-advance` by recording high score from event's session snapshot and showing Game Error screen. Retry starts a new zero-score session; Back returns to title. Error text: `Couldn’t generate the next puzzle.` The completed score is displayed on this screen.

Generation failure must never escape `dispatch`, produce an unhandled rejection, or replace a complete pair with partial state.

Every timeout/quit `GAME_OVER` event carries immutable `sessionSettings`. App must use event settings—not mutable persisted selection—for timeout vibration, high-score update, final high-score lookup, and Game Over display. Store computed `finalHighScore` in App state rather than deriving it later from current settings.

Do not temporarily show an all-Off grid between Imposter rounds. Do not generate target and interactive in separate React state updates.

Copy generator:

```ts
const reference = generatePattern(patternStyle, gridSize, rng, avoidHash);
return { reference, interactive: allOff(gridSize) };
```

Imposter generator is defined below.

## 10. Imposter toggle budget

Let:

```ts
cells = gridSize * gridSize;
x = Math.log(cells) - 1;
min = Math.max(1, Math.floor(x));
max = Math.floor(x ** 1.2);
```

Select:

```ts
toggleCount = rng.nextInt(min, max);
```

This is inclusive and uniform.

Expected bounds for supported sizes:

| Grid | Cells | Min | Max |
| --- | ---: | ---: | ---: |
| 2×2 | 4 | 1 | 1 |
| 3×3 | 9 | 1 | 1 |
| 4×4 | 16 | 1 | 1 |
| 5×5 | 25 | 2 | 2 |
| 6×6 | 36 | 2 | 3 |
| 7×7 | 49 | 2 | 3 |
| 8×8 | 64 | 3 | 3 |
| 9×9 | 81 | 3 | 4 |
| 10×10 | 100 | 3 | 4 |

APIs:

```ts
getImposterToggleBounds(gridSize: number): { min: number; max: number }
sampleImposterToggleCount(gridSize: number, rng: Rng): number
```

Validate positive integer size. Tests should use exact JavaScript `Math.log` and `Math.floor` behavior.

## 11. Shift-count odds

Sample one shift count per requested round. Preserve it across every generation retry and fallback:

| Grid size | P(0) | P(1) | P(2) | P(3) |
| --- | ---: | ---: | ---: | ---: |
| 2 | 100% | 0% | 0% | 0% |
| 3 | 100% | 0% | 0% | 0% |
| 4 | 100% | 0% | 0% | 0% |
| 5 | 90% | 10% | 0% | 0% |
| 6 | 80% | 20% | 0% | 0% |
| 7 | 55% | 30% | 15% | 0% |
| 8–10 and any larger supported later | 50% | 25% | 25% | 0% |

Use integer cumulative weights totaling 100 and one `rng.nextInt(1, 100)` draw. Do not use floating thresholds.

```ts
sampleImposterShiftCount(gridSize: number, rng: Rng): 0 | 1 | 2 | 3
```

Boundary tests must prove exact threshold mapping, not statistical approximation alone.

## 12. Generator-time toggle eligibility

A coordinate is eligible if its existing orthogonal neighbors include at least one On and at least one Off value.

Neighbors:

```text
(row - 1, col)
(row + 1, col)
(row, col - 1)
(row, col + 1)
```

Ignore out-of-bounds coordinates. Grid edge is not an Off neighbor.

Cell's own value does not affect eligibility except indirectly after earlier changes. Both On and Off cells may be eligible.

```ts
type CellCoordinate = { row: number; col: number };

isImposterToggleEligible(grid: Grid, row: number, col: number): boolean
listImposterToggleCandidates(
  grid: Grid,
  excluded?: ReadonlySet<string>,
): CellCoordinate[]
```

Use stable row-major ordering. Randomness comes from `rng.pick`.

Generation procedure for each toggle:

1. Recompute candidate list from current interactive grid.
2. Exclude coordinates already used by a generator-time toggle in this attempt.
3. If list is empty, fail attempt; do not return partial result.
4. Uniformly pick one candidate.
5. Record coordinate in used set.
6. Toggle it.

Distinct toggle coordinates ensure requested mutation count represents real individual cell changes and cannot be spent toggling one coordinate twice.

Eligibility applies only to generation. Player may toggle any in-bounds cell.

### 12.1 Malformed input behavior

All Imposter grid helpers validate runtime input as a non-empty square `boolean[][]`.

- Empty, ragged, or non-square grid: throw `RangeError`.
- Non-boolean cell value: throw `TypeError`.
- `isImposterToggleEligible` returns `false` for an out-of-bounds or non-integer coordinate after grid validation.
- Candidate listing throws for malformed exclusion keys only if implementation parses them; prefer opaque canonical keys produced internally.
- `isValidChunkShift` returns `false` for non-integer fields, unsupported direction, malformed dimensions, out-of-bounds rectangles, collision, or all-Off source after grid validation.
- `listValidChunkShifts` throws `RangeError` for non-integer or out-of-range requested dimensions.
- `applyChunkShift` throws `RangeError` for malformed geometry and a dedicated `InvalidChunkShiftError` for a well-formed but currently invalid move.

## 13. Chunk shift contract

### 13.1 Shape and direction

```ts
type ShiftDirection = "north" | "east" | "south" | "west";

type ChunkShift = {
  sourceRow: number;
  sourceCol: number;
  height: number;
  width: number;
  direction: ShiftDirection;
};
```

For grid size `n`:

```ts
maxEdge = Math.ceil(n / 2);
1 <= height <= maxEdge
1 <= width <= maxEdge
```

Height and width are selected independently from feasible values. A 1×1, 1×N, or N×1 chunk is valid.

Source and translated destination rectangles must be entirely in bounds. Shift distance is one.

### 13.2 Validity

A shift is valid against current grid when all are true:

1. Dimensions satisfy bounds.
2. Source and destination are in bounds.
3. Source contains at least one On cell.
4. Every cell in newly entered leading strip is Off before shift.

Do not require entire destination rectangle to be Off. Source and destination overlap for every chunk edge longer than one.

Leading strip:

- north: row immediately above source, same width
- south: row immediately below source, same width
- west: column immediately left of source, same height
- east: column immediately right of source, same height

### 13.3 Application semantics

Apply simultaneously:

1. Snapshot every source value.
2. Clone whole grid.
3. Clear every source coordinate to Off.
4. Write source snapshot into translated destination rectangle.

Clearing before writing in the output clone is intentional. Snapshot prevents iteration order from smearing overlap.

Result:

- trailing strip is Off
- overlapping region contains translated snapshot values
- leading strip receives source leading-edge values
- unrelated cells remain unchanged
- On-cell count is preserved

`applyChunkShift` must validate and throw `RangeError` for malformed/out-of-bounds shifts and an ordinary `Error` (or dedicated domain error) for collision/source-content invalidity. Generator only calls it with enumerated valid shifts.

### 13.4 Examples

Good: 2×3 source on 5×5 grid shifts west. Newly entered column is Off. Width 3 is allowed because `ceil(5/2) = 3`.

```text
target  interactive
ooooo    ooooo
..ooo    .ooo.
..oo.    .oo..
.....    .....
.....    .....
```

Bad for 4×4: 2×3 chunk exceeds max width `ceil(4/2) = 2`.

```text
target  interactive
oooo    oo..
..oo    ..oo
..o.    ..oo
....    ..o.
```

### 13.5 Enumeration and sampling

Required helpers:

```ts
getMaxChunkEdge(gridSize: number): number
isValidChunkShift(grid: Grid, shift: ChunkShift): boolean
listValidChunkShifts(
  grid: Grid,
  height: number,
  width: number,
): ChunkShift[]
applyChunkShift(grid: Grid, shift: ChunkShift): Grid
sampleAndApplyChunkShift(
  grid: Grid,
  rng: Rng,
): { grid: Grid; shift: ChunkShift } | null
```

Sampling must avoid weighting dimensions by number of placements:

1. For every height 1…max and width 1…max, enumerate valid placements/directions.
2. Keep only dimension pairs with at least one valid operation.
3. Build list of feasible heights.
4. Pick feasible height uniformly.
5. Within chosen height, build feasible widths and pick width uniformly.
6. Pick one valid operation for chosen `(height, width)` uniformly.

This makes height uniform among currently feasible heights and width uniform conditional on height. Do not flatten all placements into one list; that would over-sample small chunks and dimensions with more placements.

Recompute valid shifts against evolving grid before every requested shift.

Because 1×1 is allowed, any mixed finite rectangular grid has a valid shift along some orthogonal On/Off boundary. Existing pattern generators produce mixed patterns under their density constraints. Still treat no-valid-shift as generation-attempt failure.

## 14. Pair generation

### 14.1 Result and debug metadata

Public game result can be `GameRound`. Keep richer metadata available to unit tests:

```ts
export type ImposterRoundMetadata = {
  toggleCount: number;
  toggledCells: CellCoordinate[];
  shiftCount: number;
  shifts: ChunkShift[];
  hammingDistance: number;
};

export type ImposterRound = GameRound & {
  metadata: ImposterRoundMetadata;
};
```

`GameModeDefinition.createRound` may strip metadata or structurally return richer object as `GameRound`.

### 14.2 Main algorithm

```ts
function generateImposterRound(context): ImposterRound {
  shiftCount = sampleShiftCount(size, rng)
  toggleCount = sampleToggleCount(size, rng)

  for attempt in 0..<MAX_RANDOM_ATTEMPTS:
    reference = generatePattern(style, size, rng, avoidHash)
    interactive = clone(reference)

    shifts = []
    repeat shiftCount times:
      result = sampleAndApplyChunkShift(interactive, rng)
      if result is null: fail attempt
      interactive = result.grid
      shifts.push(result.shift)

    used = empty set
    toggledCells = []
    repeat toggleCount times:
      candidates = listEligible(interactive, used)
      if candidates empty: fail attempt
      cell = rng.pick(candidates)
      interactive = toggleCell(interactive, cell)
      used.add(cell)
      toggledCells.push(cell)

    if gridsEqual(reference, interactive): fail attempt

    return complete pair and metadata

  return deterministicFallback(context)
}
```

Use `MAX_RANDOM_ATTEMPTS = 64`. Each failed attempt is discarded in full. Shift and toggle counts are sampled once per requested round, outside retry loop, and preserved by every retry and fallback. This keeps returned count frequencies faithful to uniform toggle selection and shift-count odds.

Mutation counts describe operations applied, not final Hamming distance. Shifts and later toggles may partially reverse earlier differences. Only final non-identity is required.

### 14.3 Deterministic fallback

Fallback exists to prevent hangs and invalid partial rounds. It is exceptional, deterministic, and preserves counts already sampled for this round:

1. Generate one target normally with same style, size, RNG, and avoid hash.
2. Start interactive as clone.
3. Find a complete sequence of exactly `shiftCount` valid shifts using deterministic depth-first search:
   - enumerate dimensions and operations in stable order
   - validate against evolving grid
   - apply, recurse, and backtrack
4. From each complete shift state, find exactly `toggleCount` distinct eligible toggles using deterministic depth-first search:
   - candidates in row-major order
   - recompute after each tentative toggle
   - exclude used coordinates
   - backtrack when remaining count cannot be completed
5. Accept first complete sequence producing non-identical grid.
6. If target has no complete sequence, generate another target and repeat up to 64 fallback targets.
7. If still impossible, throw `ImposterGenerationError` containing size, style, requested shift count, and requested toggle count. Never return identity or partial pair.

Do not resample, reduce, or replace selected counts during retries or fallback. Seed/property tests must show fallback is not reached for normal generators across test corpus.

### 14.4 Avoid-repeat behavior

Current `generatePattern` accepts one `avoidHash`. Pass prior target hash, not prior interactive hash.

Pair uniqueness rules:

- target should differ from immediately previous target when generator can provide difference
- interactive only must differ from its target
- no requirement to deduplicate changed interactive grids across rounds

## 15. Solvability and difficulty

No solver is needed. Boolean cell toggles span all grid states. For target `T` and interactive `I`, toggle each coordinate where `T[r][c] !== I[r][c]`. This reaches target in exactly Hamming distance moves if using individual clicks.

Do not enforce additional Hamming-distance minimum or maximum. User-defined mutation formulas and shifts determine difficulty.

Do not expose generation metadata, solution coordinates, mutation count, or Hamming distance during play.

## 16. Settings UX

### 16.1 Global versus mode-specific

Root-level app preference:

- selected mode

Global display/device preferences:

- color mode
- color theme
- vibration
- animation master toggle and animation detail settings

Mode-specific:

- time limit
- grid size
- pattern style

Reason: display/device preferences should remain stable across modes. Gameplay configuration affects difficulty and score comparability, so each mode retains its own profile.

### 16.2 Settings screen

`SettingsScreen` shows:

1. Heading `Settings`.
2. Reusable mode selector.
3. Section heading `<Mode name> game`.
4. Time limit stepper.
5. Grid size stepper.
6. Pattern style control.
7. Section heading `Global`.
8. Color mode.
9. Color theme.
10. Vibration.
11. Animations and `Customize…`.
12. Back.

Changing selector:

- updates `settings.selectedMode`
- swaps visible gameplay profile
- preserves other mode profiles
- persists immediately through existing settings save path

Changing gameplay setting updates only `settings.modes[selectedMode]`.

Changing global setting updates only `settings.global`.

Animation customization edits `settings.global.animations`.

No Imposter mutation settings appear.

## 17. Title-screen mode selector

Keep selector directly on title screen between title/hero area and Start.

Structure:

```text
[Previous]  Imposter  [Next]
Find every changed cell and restore the target.
[Start]
```

Requirements:

- Compact control must fit five future mode names.
- Center displays mode name only.
- Separate text below displays selected mode description.
- Previous/next wrap registry order.
- Buttons have accessible names `Previous game mode` and `Next game mode`.
- Mode name region uses `aria-live="polite"` or equivalent.
- Description updates with selected mode.
- Selection persists immediately.
- Start launches selected mode's profile.
- Existing Settings, High Scores, and disclosure buttons remain.

Recommended reusable component:

```text
packages/web/src/components/ModeSelector.tsx
```

Use same component on Settings and High Scores where practical.

## 18. Play screen

Layout stays two grids and uses existing responsive stack/side-by-side logic.

Labels:

| Mode | Reference | Interactive |
| --- | --- | --- |
| Copy | Copy this | Your grid |
| Imposter | Target | Find and fix imposters |

Read labels from registry.

Imposter starts with pre-mutated interactive grid. Existing pointer behavior remains:

- pointer down toggles hit cell
- drag paints all newly visited cells to state selected by first toggle
- revisiting cell in same stroke does nothing
- matching during stroke ends stroke

Existing exact `gridsEqual` check serves both modes.

Pause:

- hides grids as today
- freezes timer
- ignores input

Completion:

- same vibration behavior
- same explosion/match animation using equal matched grids
- both next boards appear together
- score increments once

Game-over screen behavior remains, including current text unless separately changed. Quit still records score through existing App event path.

## 19. High scores

### 19.1 Identity

Scores compare only within:

- game mode
- pattern style
- grid size
- time limit

Theme, color mode, vibration, and animations do not affect score identity.

Canonical key:

```text
<mode>:<patternStyle>:<gridSize>:<timeLimitSec>
```

Examples:

```text
copy:cohesive:4:90
imposter:chaos:5:120
```

### 19.2 Parsing

`parseHighScoreKey` accepts exactly four parts and validates:

- mode is registered
- pattern style is allowed
- grid size is integer and valid
- time limit is integer and valid

Malformed and old three-part keys return `null`.

No legacy migration.

### 19.3 Display

High Scores screen includes mode selector/filter at top.

- Default filter is current `settings.selectedMode`.
- Show only selected mode's entries.
- Sort descending score.
- Stable tie breakers: pattern-style registry order, grid size ascending, time ascending.
- Row detail: `<pattern style> · <N>×<N> · <M:SS>`.
- Mode heading/selector makes row mode unambiguous; mode need not repeat in every row.
- If selected mode has no entries, show one score-zero placeholder for selected mode's current profile.
- High-score selector is local screen state initialized from `settings.selectedMode`.
- Changing high-score filter does not update persisted `selectedMode`, save settings, or alter profiles.

`getHighScore` and `updateHighScore` accept `SessionSettings`, ensuring completed game uses session snapshot rather than possibly changed persisted selection.

`loadHighScores` validates parsed JSON before returning it:

- root must be a plain object, not `null` or array
- keys must pass strict four-part parser
- values must be finite nonnegative integers
- grid size must be integer 2–10
- time limit must be integer 30–600 and divisible by 30
- invalid entries are dropped; invalid root returns `{}`

## 20. One-time app-data reset

Approved behavior: discard old settings and scores on first launch of this release. Do not migrate.

Storage keys:

```ts
const SETTINGS_KEY = "copy-quatre:settings";
const HIGH_SCORES_KEY = "copy-quatre:high-scores";
const DATA_GENERATION_KEY = "copy-quatre:data-generation";
const CURRENT_DATA_GENERATION = "2";
```

Before normal load in `App`:

```ts
await initializeDataGeneration();
const [settings, scores] = await Promise.all([
  loadSettings(DEFAULT_SETTINGS),
  loadHighScores(),
]);
```

`initializeDataGeneration`:

1. Read marker.
2. If marker equals `"2"`, do nothing.
3. Otherwise remove settings key.
4. Remove high-scores key.
5. Write marker `"2"` last.

Writing marker last makes interruption retry safe. Use `Preferences.remove` for app-owned keys; do not call broad `Preferences.clear`.

New install also has no marker, runs same idempotent reset, then loads defaults.

If removing or writing fails:

- `initializeDataGeneration` throws a normalized error
- App catches it and enters explicit bootstrap-error state
- do not load or parse settings/high scores
- show `Couldn’t initialize game data.` with Retry button
- Retry reruns initialization and normal loading
- keep title/game screens inaccessible until initialization succeeds

Do not increment data generation for ordinary semver releases. Increment only for another intentionally incompatible persisted-data change.

After reset, storage loaders still defensively handle corrupt JSON and return defaults/empty scores.

Persistence API contract:

```ts
initializeDataGeneration(): Promise<void>
loadSettings(): Promise<Settings>
saveSettings(settings: Settings): Promise<boolean>
loadHighScores(): Promise<HighScoreStore>
saveHighScores(store: HighScoreStore): Promise<boolean>
```

`loadSettings` parses JSON as unknown and passes it through `validateSettings`; missing/corrupt data returns deep-cloned defaults. Do not shallow-merge parsed root into defaults. `loadHighScores` applies strict validation from §19.3. Save functions serialize already validated in-memory values.

## 21. Detailed test plan

All random tests use seeded `createRng`. Avoid timing-sensitive probability assertions when threshold injection can prove exact mapping.

### 21.1 `packages/core/src/modes/imposter/imposter.test.ts`

Toggle bounds:

- exact table for sizes 2–10
- min and max formulas for larger representative size
- invalid sizes rejected
- sampled toggle values include both endpoints with controlled RNG

Shift-count sampling:

- every cumulative threshold edge for each size class
- sizes 2–4 always zero
- size 5 maps 1–90 to zero and 91–100 to one
- exact tables for sizes 6, 7, and 8+

Boundary eligibility:

- center with mixed orthogonal neighbors is eligible
- On and Off center cells can both be eligible
- all same neighbors is ineligible
- diagonal differences alone do not qualify
- outside grid is ignored
- corners with one On and one Off neighbor qualify
- row-major candidate order
- excluded coordinates omitted

Chunk dimensions and validity:

- max edge: 2→1, 4→2, 5→3, 10→5
- 1×1, 1×N, N×1 accepted
- width/height above max rejected
- every cardinal direction
- out-of-bounds source/destination rejected
- all-Off source rejected
- On leading-strip collision rejected
- On cells in overlapping destination allowed
- unrelated destination cells do not matter

Shift application:

- approved 5×5 GOOD fixture exactly matches output
- 4×4 BAD 2×3 rejected
- source snapshot prevents overlap smearing in all directions
- trailing strip clears
- leading strip receives translated values
- unrelated cells unchanged
- input grid not mutated
- On count preserved

Shift sampling:

- dimensions selected before placement
- placement counts do not bias dimension selection
- only valid placements returned
- sequential shifts validate against evolving grid

Pair generation:

- starts from existing target generator for both styles
- shifts happen before toggles
- requested operation counts equal metadata lengths
- requested shift/toggle counts remain unchanged across retries and fallback
- toggled coordinates are distinct
- every recorded toggle was eligible immediately before application
- eligibility is re-evaluated after each toggle
- returned target and interactive differ
- same seed/settings produce identical pair and metadata
- prior target hash passed to avoidance path
- Hamming-distance solution toggles to equality
- input/reference grids remain immutable
- retry discards entire failed attempt
- identity after mutations retries
- deterministic fallback preserves exact sampled shift/toggle counts
- exhaustion throws `ImposterGenerationError`, never partial output

Property corpus:

- sizes 2–10
- both cohesive and chaos
- at least 200 seeds per `(size, style)`
- assert dimensions, invariants, determinism, non-identity, valid metadata replay, and symmetric-difference solvability
- assert random fallback never reached across corpus

Do not assert observed percentages from only a small random sample. Threshold tests are authoritative. A large deterministic distribution smoke test is optional.

### 21.2 `packages/core/src/gameEngine.test.ts`

Copy regressions:

- starts interactive all Off
- existing pointer/drag/pause/quit/timer behavior unchanged
- match advances to next Copy round

Imposter:

- START uses changed copy, not all Off
- target and interactive same size and unequal
- toggling symmetric difference completes round
- completion adds exactly one point
- next pair is complete and unequal
- no intermediate blank grid
- target avoidance uses previous target
- pause/input/stroke rules remain
- `SCORED` contains equal completed grids for animations
- session settings mode remains fixed during game
- timeout/quit events carry active session settings
- start generation failure leaves engine non-playing and emits recoverable error
- round-advance failure awards completed point, emits `SCORED` then recoverable error, and never installs partial round
- failed speculative pre-generation leaves nullable buffer and does not stop current round

Registry:

- every registered mode creates valid-size round
- unknown runtime mode cannot enter engine after validation; defensive error if forced

### 21.3 `packages/core/src/settings.test.ts`

- deep default shape
- default profiles are independent objects
- selected mode validation
- each profile validates independently
- invalid/missing mode profile gets defaults
- unknown future keys ignored
- global settings validation unchanged
- `resolveSessionSettings` flattens selected profile plus globals
- explicit mode resolution works
- changing one profile does not change other profile
- old flat shape returns new defaults rather than being interpreted

### 21.4 `packages/core/src/highScore.test.ts`

- four-part key creation for each mode
- strict parsing and field validation
- reject three-part legacy key
- reject unknown mode/style and invalid numeric fields
- reject invalid score roots and non-finite, negative, or fractional values
- scores isolated by mode
- scores isolated by style/size/time
- lower/equal score does not replace
- list ignores malformed records
- selected-mode filtering
- deterministic sort and tie breakers
- empty selected mode produces correct zero placeholder

### 21.5 `packages/web/src/platform/storage.test.ts`

- marker already current leaves settings/scores untouched
- missing marker removes both app keys then writes marker
- stale marker does same
- new install initializes marker and loads defaults
- remove happens before marker write
- interruption before marker write retries next call
- settings-key remove failure enters bootstrap-error state
- high-score-key remove failure enters bootstrap-error state
- marker write failure enters bootstrap-error state and retries reset next launch/retry
- no broad clear call
- corrupt new-shape settings falls back
- old flat settings are discarded through initialization
- old three-part scores are discarded through initialization
- new settings and four-part scores round-trip

Update Preferences mock with `remove` support and operation recording where needed.

### 21.6 `packages/web/src/App.test.tsx`

- initialization runs before settings/scores load
- title defaults to Copy
- title selector wraps both directions
- mode name and separate description update
- selected mode persists
- Start launches currently selected mode
- Imposter renders changed interactive board
- settings navigation retains selected mode
- timeout/quit records score under active session mode
- one-time reset results in defaults
- existing vibration and disclosure tests remain
- timeout vibration and score key use event session snapshot, not current persisted selection
- start and round-advance generation errors show retry/back flow
- bootstrap initialization failure shows retry and blocks normal load

### 21.7 Screen/component tests

`TitleScreen` or `ModeSelector`:

- accessible previous/next names
- displayed name only in selector
- separate description
- wrap behavior delegated correctly
- supports registry expansion without fixed two-mode UI

`SettingsScreen`:

- global and mode sections render
- switching mode swaps profile controls
- editing Imposter profile leaves Copy untouched
- global edit visible for both
- animation navigation edits global animation settings

`HighScoresScreen`:

- mode filter shows only selected mode
- changing filter remains local and does not save selected mode
- empty mode placeholder
- sorted score rows
- correct labels and formatting

`PlayScreen`:

- Copy labels unchanged
- Imposter labels exact
- two grids rendered
- pointer dispatch unchanged
- scored animation and vibration unchanged
- pause hides both grids

Responsive/manual checks remain necessary because happy-dom does not verify actual layout.

## 22. Implementation order

1. Add mode/settings/session types and registry.
2. Add Copy round generator and refactor engine to registry without behavior change.
3. Run Copy engine tests.
4. Implement Imposter budget, boundary, shift, and pair generator with core tests.
5. Wire Imposter into engine and add engine tests.
6. Replace persisted settings shape, add data-generation initialization/reset, and update storage tests.
7. Make high-score identity mode-aware and update tests.
8. Add reusable mode selector and title-screen description.
9. Refactor settings screen into mode/global sections.
10. Add high-score mode filter.
11. Make PlayScreen labels mode-aware.
12. Update App orchestration and integration tests.
13. Update README controls/modes/settings documentation.
14. Bump `packages/web/package.json` and `packages/core/package.json` together, likely minor version because this is a user-facing feature.
15. Run all completion gates and manual QA.

Keep each step compiling where practical. Refactor Copy into registry before introducing Imposter behavior so regressions are attributable.

## 23. Risks and required mitigations

### Generator dead ends

Exact distinct toggle sequence can run out of candidates. Mitigation: sample counts once, preserve them across full-attempt retries, use deterministic exact-count DFS fallback, then emit recoverable typed terminal error. Never resample or lower requested count.

### Sampling bias

Flattening valid placements biases dimensions. Mitigation: choose feasible height, then feasible width, then placement.

### Overlap bugs

In-place iteration can smear values. Mitigation: snapshot source, clear clone, write snapshot; fixtures in every direction.

### Mode leakage

Flat settings or high-score keys can cause Copy and Imposter to overwrite each other. Mitigation: per-mode profiles, session snapshot, mode-prefixed key.

### Persisted-shape incompatibility

Old JSON can superficially parse but violate new assumptions. Mitigation: one-time generation reset before loading.

### UI coupling

Hardcoded labels and selectors will scale poorly to five modes. Mitigation: ordered registry consumed by reusable selector and screens.

### Animation assumptions

Explosion logic expects matched boards to be equal. This remains true: event captures boards only after exact match.

### Performance

Enumeration is bounded by grid size 10 and at most 3 shifts. Candidate space is small. Pair pre-generation prevents visible delay. Property tests should catch pathological retries.

## 24. Manual QA checklist

Desktop portrait and landscape:

- title selector changes name and separate description
- selector wraps Copy ↔ Imposter
- Start launches selected mode
- both modes fit existing two-grid layout
- 10×10 remains usable
- pause/resume/quit work
- timer and score update
- matching advances without blank flash

Mobile/Capacitor:

- touch toggle works
- touch drag paint works
- no page scroll during grid gesture
- safe-area padding remains correct
- mode controls are large enough to tap
- vibration follows global setting

Imposter visual checks:

- interactive resembles target rather than blank board
- 2×2 always has zero shifts and one toggle mutation
- larger sizes occasionally show shifted chunks
- target and interactive never start equal
- both cohesive and chaos generate promptly

Settings:

- Copy and Imposter retain different grid/time/style values
- global theme/color/vibration/animations apply across modes
- restart preserves new settings after marker initialized

Scores:

- same configuration stores separate Copy and Imposter records
- filter switches modes
- lower score does not replace record

Upgrade reset:

- install/run prior build with saved settings/scores
- launch feature build
- verify old data cleared exactly once
- set new values, restart, verify they persist

## 25. Completion gates

Run from repository root:

```bash
pnpm test
pnpm test:coverage
pnpm lint
pnpm build
pnpm version:check
```

If Android tooling is available:

```bash
pnpm cap:sync
cd packages/web/android
./gradlew assembleDebug
```

Core coverage must stay at or above 90% for lines, branches, functions, and statements.

## 26. Definition of done

- Copy remains behaviorally unchanged and is named Copy in UI.
- Imposter follows all formulas, odds, eligibility, ordering, and shift semantics in this document.
- Every Imposter round starts unequal and is solvable by normal player toggles.
- Mode registry drives selectors, labels, validation, and round generation.
- Title selector is suitable for roughly five modes and includes separate selected-mode description.
- Global and per-mode settings are isolated as specified.
- Old app settings/scores reset once through data-generation marker.
- High scores are mode-aware and strictly parse new keys only.
- Core and web tests cover matrices above.
- Completion commands pass.
- Package versions are bumped together.
- README documents both modes and mode selection.

No implementation should substitute inferred behavior for a rule stated here. If implementation uncovers a true contradiction, stop and resolve product decision before coding around it.
