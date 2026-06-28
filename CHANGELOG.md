# Changelog

All notable changes to the **BranchWorld engine** and the **Sump Line** cave POC.

The engine carried a *documented* version line (v1.2 → v1.3) before this file existed. From here it is
tracked here and by git tags. Tag **`engine-v1.3`** marks the frozen v1.3 baseline — the revert anchor
taken before the first deliberate un-freeze.

> Note: `package.json` `version` (`0.1.0`) is the npm package version and is intentionally *separate* from
> the engine version line below.

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
