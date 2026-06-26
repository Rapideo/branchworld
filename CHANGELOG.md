# Changelog

All notable changes to the **BranchWorld engine** and the **Sump Line** cave POC.

The engine carried a *documented* version line (v1.2 → v1.3) before this file existed. From here it is
tracked here and by git tags. Tag **`engine-v1.3`** marks the frozen v1.3 baseline — the revert anchor
taken before the first deliberate un-freeze.

> Note: `package.json` `version` (`0.1.0`) is the npm package version and is intentionally *separate* from
> the engine version line below.

## [Unreleased] — engine v1.4 (in progress, branch `feature/engine-v1.4`)

The first deliberate un-freeze of `src/engine/` since v1.3. Wrapping up the remaining v1.4 hardening punch
list from the team pass (see `src/experiments/sump-line/HARDENING-FINDINGS.md`).

Agreed sequence (2026-06-26): **A2 → A1 v1.1 → A3 → A5 → A4 (H8/H12) → [clock-model decision] → A6 → A7.**

Clock-model note: A6 (time-driven resource offset) is built **clock-agnostic** — its offset is additive over
each resource's own time-function and clamped, an invariant independent of per-chapter vs. nested game-clock.
The full clock-model design is deferred to the post-engine capabilities brainstorm (it belongs with the
"Settings & Preferences" project profile).

- _(nothing landed yet — this entry is the version marker that opens v1.4)_

## [1.3.0] — 2026-06-24 — frozen baseline (tag `engine-v1.3`)

The state-driven narrative engine as proven by the Sump Line cave POC:

- **Resource primitive + clamping** — time-driven and choice-driven resources; `atZero` flag/ending;
  numeric var clamping (`min`/`max`).
- **Multi-chapter container** — `Game`/`GameRunner` with cross-chapter carry, seeded chapters, and game-level save.
- **Hardened** — a 3,000-story fuzz sweep clean; deterministic replay; faithful snapshot/restore;
  container-side cross-chapter contract linter (A1 v1) + seeded walker / value-at-endings report (A4).
- **Frozen and proven** — zero `src/engine/` changes across the entire cave experiment; 232 tests green.
