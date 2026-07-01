# Changelog

All notable changes to the **BranchWorld engine** and the **Sump Line** cave POC.

The engine carried a *documented* version line (v1.2 → v1.3) before this file existed. From here it is
tracked here and by git tags. Tag **`engine-v1.3`** marks the frozen v1.3 baseline — the revert anchor
taken before the first deliberate un-freeze.

> Note: `package.json` `version` (`0.1.0`) is the npm package version and is intentionally *separate* from
> the engine version line below.

## engine v1.7 — the investigation (scene-examination) dimension (tag `engine-v1.7`, 2026-07-01)

> **Tag `engine-v1.7`** marks the **third profile dimension** — the second of the two the engine-first call
> finished before the **D2 prototype corpus** (which is next; it now has both dimensions). Merged to `master`
> (`5984f79`, `--no-ff`; branch `feature/investigation-dimension` deleted). **Opt-in and behaviorally inert**
> (`investigation:'off'` default — every existing game and all prior tests unchanged; **398 tests green**). Pushed
> to `origin` at this tag.

### The investigation (scene-examination) dimension (branch `feature/investigation-dimension`, now merged)

A third **profile dimension** `investigation: 'off' | 'on'` (default `'off'`). When `'on'`, the engine turns the
existing clue primitive into a first-class **examine loop**: a node declares `examinables` (hotspots), and the
engine injects one-shot `__examine_<id>` choices that yield a clue + optional time cost and self-hide once the clue
is held — so scene-exploration is engine-run, not hand-wired.

### What landed

- **Mechanic** (`src/engine/investigation.ts`, wired into `engine.ts`) — `view()` injects one `__examine_<id>`
  choice per available hotspot (available iff `!has_clue(clue)` and its conditions pass), appended after authored +
  travel choices; `choose()` handles a `__examine_` id BEFORE its unknown-choice throw. Taking one applies
  `add_clue` + optional `add_minutes`, logs the reveal, and **settles in place** — `enter()`'s post-arrival tail was
  factored into a reusable `settle()` so a costly examine still fires the deadline/resource/scheduled-event tail
  (and a present event can route the player out) without re-arriving the node. Snapshot/restore unaffected.
- **The completability certificate** (`src/engine/stateSpaceWalk.ts`) — the walker rides the real engine, so
  examination is verified for free (no walker mode, no bucketing: examine is monotonic + self-hiding). Under
  `clock:'timed'`, `verifyInvestigation(story)` proves a clue-gated success ending is genuinely reachable **within
  the deadline**: `satisfiedEndings` counts an ending only when a within-deadline terminal **actually resolves** to
  it AND its clue-conditions hold there — closing both a past-deadline state-win leak (the engine resolves a
  state-match past the buzzer) and an `endsWith`-pin leak. `INVESTIGATION_DEADLINE_UNREACHABLE` on failure; `capHit`
  ⇒ fail. `timeKeyFor` now drops time for **all** untimed walks (the long-deferred untimed key optimization; sound
  because untimed forbids every time-reading mechanism).
- **Lints** (`src/engine/investigationLint.ts`) — the v1 fence `INVESTIGATION_WITH_TRAVEL_UNVERIFIED` (error) +
  hygiene (`EXAMINE_{DUPLICATE_HOTSPOT,EMPTY_CLUE,ON_TERMINAL_NODE,CLUE_UNUSED}`, `INVESTIGATION_MINUTES_UNTIMED`,
  `EXAMINABLES_IGNORED`); the static linter made examinable-aware (profile-gated clue symbols so
  `DEAD_CLUE_REFERENCE` stays sound when off; the four condition sweeps + `timeBounds` count examine minutes).
- **Root-cause container fix** — `seedChapterStory` now stamps the resolved profile (`resolveProfile(story,
  game.profile)`), so chapters inherit the game profile at runtime; this **retires `ROAM_CHAPTER_PROFILE_MISSING`**
  and closes the silent-failure class for **all** dimensions (investigation writes zero papering lints).
- **Reference game + guide** — `src/container/investigationExample.ts` ("The Locked Study": a timed micro-mystery
  with two suspects, a costed red herring, and negative/`endsWith` P0 fixtures) + `docs/authoring/investigation.md`.
- **Process** — built subagent-driven (9 TDD tasks + a fix wave). Spec 5-lens Team deep-dived (rev 3) and plan
  2-lens gut-checked (rev 2), both catching real pre-code P0s in the completability certificate's soundness; each
  task spec+quality reviewed, the certificate + fix opus-reviewed; the whole-branch review returned ready-to-merge.

### Fence + deferred (v1)
- `investigation` + `travel` fenced (`INVESTIGATION_WITH_TRAVEL_UNVERIFIED`) — the roam-mystery combo is corpus-gated.
- Deferred: `revealNode` routing, explicit `required:` contracts, clue combination/deduction, an `all_examined`
  predicate — all corpus-gated.

## engine v1.6 — the travel (free-roam) dimension (tag `engine-v1.6`, 2026-06-29)

> **Tag `engine-v1.6`** marks the **second profile dimension**. Merged to `master` (`a610d25`, `--no-ff`; branch
> `feature/travel-dimension` deleted). The first dimension built on the v1.5 profile framework; **opt-in and
> behaviorally inert** (`travel:'off'` default — every existing game and all prior tests unchanged). The
> **investigation** dimension shipped next (**v1.7**); the **D2 prototype corpus** follows (it now has the ≥2
> dimensions it needs). Pushed to `origin` at this tag.

### The travel (free-roam) dimension (branch `feature/travel-dimension`, now merged)

A second **profile dimension** `travel: 'off' | 'free'` (default `'off'`). When `'free'`, the engine wires the
long-dormant `Location` graph (`connectedLocations` / `travelTimes` / `defaultNode`, shipped as type fields since
v1.2 but never read) as a navigation layer, and verification switches to a **bounded-exhaustive roam mode** so the
honesty guarantees (no softlocks, all endings reachable, no stranded regions) survive free-roam.

### What landed

- **Mechanic** (`src/engine/travel.ts`, wired into `engine.ts`) — at a location's `defaultNode` hub (keyed off
  `state.location`, not a global node scan), `view()` injects one synthetic `__travel_<dest>` choice per
  `connectedLocations` entry; `choose()` handles a `__travel_` id BEFORE its unknown-choice throw (pays
  `travelTimes`, enters the dest hub). **Coexists** with authored `change_location` (additive; one-way/conditional
  edges stay authored). Snapshot/restore unaffected (travel choices are derived, never persisted).
- **Roam verification** (`src/engine/stateSpaceWalk.ts`) — finite roam keying (untimed drops time from the key,
  timed buckets it); the walk records the **FULL forward edge set** and runs a **co-reachability** pass
  (`deadRegions` = nodes from which no ending is reachable — the property free-roam actually needs, computed over
  the edge set, NOT the spanning `parent` tree, which would false-positive reconvergent maps); `capHit` ⇒
  `indeterminate` (a hard fail in roam). The `verifyRoam(story, { timeBucket })` gate couples bucket-alignment +
  the walk + fail-on-(indeterminate/softlock/deadRegion/orphan ending) — its `ok===true` is a sound certificate on
  its own (independent of whether the author ran the lints).
- **Lints** — `ROAM_UNBOUNDED_HUB_WRITE` (finiteness: rejects `adjust_resource` + sign-aware unbounded
  `increment`/`decrement`, both clock modes) and `ROAM_BUCKET_MISALIGNED` (verification-time, via the `readsClock`
  predicate) in `src/engine/travelLint.ts`; the static linter (`computeReachable` / `NO_EXIT` / `timeBounds`) made
  travel-aware; `RESERVED_CHOICE_ID`; graph lints
  `TRAVEL_{UNKNOWN_LOCATION,NO_HUB,MISSING_TIME,ASYMMETRIC_EDGE,HUB_IS_TERMINAL,GRAPH_IGNORED}`.
- **Container fence** (`src/container/lintGame.ts`) — `ROAM_CARRY_UNVERIFIABLE` (multi-chapter roam unsupported in
  v1; single-chapter only) + `ROAM_CHAPTER_PROFILE_MISSING` (the engine reads `story.profile`, so a roam chapter
  must declare `travel:'free'` itself, not merely inherit it from the game).
- **Reference game** `src/container/roamExample.ts` — `roamExample` (untimed) / `roamExampleTimed` / `roamStranded`,
  a real 3-location game ("The Three Halls") with **cross-location state coupling** (a key found in the library
  gates the good ending reached at the vault) + a deliberate stranding fixture. Authoring guide
  `docs/authoring/free-travel.md`.
- **365 tests green, tsc clean, zero existing tests changed** (the opt-in inertness held branch-wide).

### Process

Built **subagent-driven** over a 9-task TDD plan (`docs/superpowers/plans/2026-06-28-travel-dimension.md`), each
task + the whole branch reviewed (opus for the soundness-critical walker / lints + the final pass). The design was
**twice Team-gut-checked** (spec → rev 3; plan → rev 2): the reviews caught two soundness bugs *inside* the rev-2
fixes (co-reachability over the `parent` tree; an `adjust_resource`/`__roff_` finiteness hole) and a test that
didn't actually guard the fix it was written for (replaced with a pure `coReachable` back-edge unit test). Spec
`docs/superpowers/specs/2026-06-28-travel-dimension-design.md`.

### Deferred (not in v1)

- **Multi-chapter roam** (a roam chapter inside a cross-chapter carry) — fenced by `ROAM_CARRY_UNVERIFIABLE`; the
  container-walk roam-parity build is gated on the D2 corpus (built when a real roam-in-a-carry game appears).
- **`incompatiblePairs`** stays empty / corpus-gated (reframed as per-dimension *requirements*, not binary
  forbids); the **investigation** dimension is the next engine work and the likely first real forbid.
- Map UI, one-way roam-graph edges, travel-triggered encounters — see the spec's Out-of-scope.

## engine v1.5 — counted inventory + the profile framework (tag `engine-v1.5`, 2026-06-28)

> **Tag `engine-v1.5`** marks the post-v1.4 engine line: **counted inventory** (`58526b6`) + the **profile
> framework / clock dimension** (described below). Cut at `master` after the heist slice, the loud route, and the
> container promotion (those are content/refactor, not engine changes). The next engine work — the `travel`
> dimension — opened the **v1.6** line (above); `investigation` follows. Nothing pushed at the v1.5 tag (local
> only); a `git bundle` backup was taken at this tag. (Pushing began at v1.6.)

### Profile framework + clock dimension (branch `feature/engine-profile`)

The first shipped **profile** — a per-story / per-game declaration of which engine dimensions are active. Ships the `clock` dimension (`'timed'` | `'untimed'`) with conformance validation, two named presets, authoring guides, and an untimed reference game. **Zero behavior change for timed games** (timed is the default; all existing stories and games are unchanged). WS-D/D1 done.

### What landed

- **`Profile` type + `ClockMode`** in `src/engine/types.ts` — `Story.profile?: Profile`, `Game.profile?: Profile`.
- **`src/engine/profile.ts`** — `clockDimension`, `DEFAULT_PROFILE` (derived from dimension defaults so it can't drift), `resolveProfile(story, inherited?)`, `validateProfile(story, inherited?)`, and presets `TIME_PRESSURE_SURVIVAL` / `UNTIMED_BRANCHING`.  Re-exported via `src/engine/index.ts`.
- **`lintStory(story, inherited?)`** — takes an optional inherited `Profile` (game-wide default); `validateProfile` runs inside; flags `PROFILE_TIMED_NEEDS_DEADLINE`, `PROFILE_UNTIMED_HAS_{DEADLINE,OOT_ENDING,TIME_RESOURCE,TIME_CONDITION}`.  Clock-reading detection covers both `time_*` ops AND any value op on the reserved `field:'time'` (the engine resolves both to `state.time`).
- **`Story.deadline` made optional** — was `string` (required), now `string | undefined` (absent for untimed stories).  Five consumer sites guarded: `engine.ts` (×2), `linter.ts`, `carry.ts`, `timeAxis.ts`.
- **`lintGame`** — propagates `profile` to `lintStory`; adds conformance check: any mix of `'timed'` / `'untimed'` clock declarations across `Game.profile` and chapter `story.profile` is a `PROFILE_CHAPTER_CONFLICT` error (v1 requires a uniform clock).
- **Retrofit** — `sumpLine` and `countinghouse` each get `profile: TIME_PRESSURE_SURVIVAL` (behaviorally a no-op; proves the field on real games).
- **`src/container/untimedExample.ts`** — a two-chapter `Game` with `profile: UNTIMED_BRANCHING`, no deadline anywhere, a choice-driven resource (`trust`), state-gated endings (priority 2 / 1 / default), no `add_minutes`.  Lints clean; `walkStateSpace` finds no softlocks on either chapter; `GameRunner` plays to all three endings.
- **Authoring guides** — `docs/authoring/time-pressure-survival.md` (pointer to the cave/heist method) and `docs/authoring/untimed-branching.md` (the real content: what to forbid, what to use instead, the walker-cheapness `add_minutes` caveat).

### Deferred boundary (not in v1)

The profile framework is intentionally minimal: one dimension, one gate.  Deferred:
- **Long-horizon / scoping** — a `'long-horizon'` clock value for month-scale games (reserved in the `ClockMode` type comment) and a per-chapter scope toggle.  Ships when a second project needs it.
- **Travel + investigation dimensions** — `travel?: 'off' | 'free'` and `investigation?: 'off' | 'on'` (the WS-D brainstorm candidates).  Sequenced after the D2 prototype corpus proves the combinations.
- **`incompatiblePairs`** — the cross-dimension validator hook (e.g. `investigation + untimed` may be semantically odd).  The hook location is stubbed in the `DIMENSIONS` loop comment; wires in when dimension #2 lands.
- **D2 prototype corpus** — 10–20 small prototype games each declaring a different profile combination to empirically stress-test the framework and surface incompatibilities before they graduate to presets.
- **`add_minutes`/walker-key optimization for untimed** — when no effect advances the clock, the walker key could drop the time dimension entirely for a cheaper walk.  The validator does not enforce `add_minutes` absence; the guide documents the caveat.

## [Unreleased] — Container promoted to `src/container/` (branch `refactor/promote-container`)

The multi-chapter container is now a **shared, game-agnostic layer** at `src/container/` (was physically inside
`src/experiments/sump-line/`). Moved with git history: `types` / `carry` / `transitions` / `GameRunner` /
`lintGame` / `lintGameContracts` / `seededWalk` + the synthetic `exampleGame` fixture, plus a new
`src/container/index.ts` barrel. The container depends only on `src/engine/` + its synthetic fixture; the two
cave-specific integration tests stay with their fixtures in `sump-line/`. `sump-line/index.ts` re-exports the
container (cave imports unchanged); the heist imports from `../../../container`. Zero behavior change; both
playable builds re-bundle; 305 tests green.

## [Unreleased] — The Countinghouse heist slice (branch `feature/countinghouse-slice`)

The first **game** authored on the post-v1.4 engine + counted inventory — a two-chapter vertical slice
("The Way In" → "The Way Out") that is the first content to exercise the four new capabilities. **Zero engine
change**; content only, under `src/experiments/countinghouse/`. Built TDD after a three-lens team gut-check of
the plan (verdict CHANGE — four real bugs caught before any code: a `got_clear` honesty leak, a self-loop
clock-calibration trap, a standalone softlock, two tautological tests; all fixed in the plan).

- **ch1 "The Way In"** — counted inventory (`charges` via `has_item`/`decrement`; the counted take `loot` via
  the distinct-node grab chain) + **The Lead** (`adjust_resource`: casing / cutting the relay buy margin; a
  loud entry costs it). Non-game-ending; one neutral default the container transitions to ch2.
- **ch2 "The Way Out"** — node-named `endsWith` finales (Clean Away / Away Lighter / Out Not Whole, branched by
  the gated drive choices), the `outOfTimeEndingId` ending (**Dawn**), and the atZero death (**The Outfit's
  Math**, priority 2). `got_clear` is set on the drive-away (not the car hub) so a pre-drive deadline-cross
  honestly falls through to Dawn.
- **The Game** — `countinghouse` wires the two chapters with the carry contract (Lead + loot/partner/latches),
  machine-checked by the A1 v1.1 contract linter (domains / mutex / carriedRequired). Container imported by
  submodule, not the barrel.
- **Hardening** — a 600-run coherence fuzz sweep proves every random run ends honestly (no fake getaways; Dawn
  never claims the drive; The Outfit always means the Lead is blown). Findings + the container-promotion
  next-step in `src/experiments/countinghouse/FINDINGS.md`. A self-contained playable HTML harness ships too.
- **289 → 300+ tests green**, typecheck clean, nothing pushed.

## [Unreleased] — engine v1.4 (in progress, branch `feature/engine-v1.4`)

The first deliberate un-freeze of `src/engine/` since v1.3. Wrapping up the remaining v1.4 hardening punch
list from the team pass (see `src/experiments/sump-line/HARDENING-FINDINGS.md`).

Agreed sequence (2026-06-26): **A2 → A1 v1.1 → A3 → A5 → A4 (H8/H12) → [clock-model decision] → A6 → A7.**

Clock-model note: A6 (time-driven resource offset) is built **clock-agnostic** — its offset is additive over
each resource's own time-function and clamped, an invariant independent of per-chapter vs. nested game-clock.
The full clock-model design is deferred to the post-engine capabilities brainstorm (it belongs with the
"Settings & Preferences" project profile).

### Done so far on this branch
- **A2 — `NEGATIVE_TIME_DELTA` lint + monotonic-time invariant** (`1f4ed08`, engine change). Closes the H2
  rewind exploit: `add_minutes` can never move the clock backward; a negative delta is a lint error. Fuzzer
  PROBE-B flipped from proving the exploit to proving the closure.
- **A1 v1.1 — ancestor-aware + annotated cross-chapter contract checks** (`c96529e`, container-side, zero
  engine change). `CONTRACT_READ_NO_ANCESTOR_PRODUCER` (the precise rename-catcher), `CONTRACT_DOMAIN_VIOLATION`,
  `MUTEX_LATCH_UNGUARDED` — all **opt-in via author annotations** (`Chapter.carriedRequired`, `Game.domains`,
  `Game.mutexLatches`), zero false positives. Cave contract populated. 239 tests green.
- **A3 — node-named endings + unified ending resolution** (`2cac20e`, engine change). `StoryNode.endsWith`
  (F8), atZero competes by priority instead of short-circuiting (H3), `Story.outOfTimeEndingId` (H4), all
  unified in `resolveEndingAt`. Fuzzer PROBE-C flipped to prove the H3 closure.
- **Team-pass follow-ups F1–F6** (`bf2bbc7`, `ce21b75`, `62fedbe`, `98a8b87`). A 3-lens adversarial review of
  the v1.4 delta found one confirmed live bug + seam gaps; all P0/P1 fixes landed:
  - **F1** (content): ch2_high's default no longer falsely claims escape — a `cave_climbed_out` latch gates the
    surfacing endings; an honest benighted default fires on a deadline-cross below the shaft.
  - **F2** `ATZERO_PRIORITY_DOMINANCE` (lint): every resource death must out-rank any ending it can co-occur with.
  - **F3**: `endsWith` is now a resolution trigger; a resource death always beats a node-named pin; the
    out-of-time ending is excluded from state-matching (so it may be condition-free).
  - **F4** `CONTRACT_UNKNOWN_ANNOTATION`, **F5** `OUT_OF_TIME_HAS_CONDITIONS`, **F6** `ENDSWITH_WITH_LIVE_CHOICES`.
- **A5** (`93dc85d`) — `EVENT_PRESENT_NODE_ON_DEMAND` lint (H6 regression guard) + a conditional-trigger
  regression lock (H7; the engine already evaluates the full trigger).
- **A4** (`95e0eef`) — walker present-reachability (`eventPresent`) + per-branch reachability
  (`conditionalChoices`) (H8/H12).
- **A6** (`5e3f258`) — `adjust_resource`: a clock-agnostic additive offset on a time-driven resource —
  `value = clamp(base(time) + offset)`; a "swap the battery" choice can raise a meter (F6).
- **A7** (`02e68dc`) — `walkStateSpace({ timeBucket })` scale mode + method-doc correction (H10).
- **Pre-merge Team-check fixes** (`78d1bb5` / `d8375bd` / `d599bb9`) — closed two atZero death-masking seams
  (resolver OOT-alias + the F2 lint false-negative); made `eventPresent` count actual present-firings (not node
  membership); added the `RESERVED_VAR_PREFIX` guard for the `__roff_` offset namespace; corrected the
  `timeBucket` approximate-mode caveat.

**276 tests green; typecheck clean. v1.4 sequence complete.** Note: out-of-time in the cave is handled by an
honest default ending (`end_benighted_high`), not `outOfTimeEndingId`. Deferred to a later pass (P2, all clean
on the shipped content): F8 (`hasProducerFreePath` ignores transition conditions → hypothetical FP), F9
(`CONTRACT_DOMAIN_VIOLATION` counts defaults / `not_equals` → hypothetical FP), F10 (no chapter-deadline-OOT lint).

## [1.3.0] — 2026-06-24 — frozen baseline (tag `engine-v1.3`)

The state-driven narrative engine as proven by the Sump Line cave POC:

- **Resource primitive + clamping** — time-driven and choice-driven resources; `atZero` flag/ending;
  numeric var clamping (`min`/`max`).
- **Multi-chapter container** — `Game`/`GameRunner` with cross-chapter carry, seeded chapters, and game-level save.
- **Hardened** — a 3,000-story fuzz sweep clean; deterministic replay; faithful snapshot/restore;
  container-side cross-chapter contract linter (A1 v1) + seeded walker / value-at-endings report (A4).
- **Frozen and proven** — zero `src/engine/` changes across the entire cave experiment; 232 tests green.
