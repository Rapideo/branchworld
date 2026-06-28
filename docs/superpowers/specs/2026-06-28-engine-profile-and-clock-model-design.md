# Engine Profile + Clock-Model — Design

> Engine + container capability spec. The **profile framework** (WS-D / D1): a game declares its *shape* as a
> set of opt-in dimensions; the engine ships **named compatible "sets" (presets)** and a **validator** that knows
> which combinations are coherent and recommends a valid set when they are not. This first cut fully works **one
> dimension — the clock (`timed` | `untimed`)** — as the worked example, and retrofits the cave + heist as the
> first profiled games. Approved 2026-06-28 (brainstorm).

## Context

The engine has grown several optional primitives (resources, scheduled events, multi-chapter carry, the v1.4
ending machinery). Different games want different *shapes*: the cave and heist are tight time-pressure survival;
other games will want untimed branching, investigation/roam, long horizons. Some of these features are
**fundamentally incompatible when switched on together** (the cleanest example: free-travel's loop-backs vs the
exhaustive-walker verification the engine's honesty guarantees rest on). Matthew's framing: *the engine should
**know** which combinations are compatible and **recommend** coherent "sets" of settings, plus how to write for
each.*

This is **WS-D / D1** ("the toggle surface + the lint profile per toggle") extended with the compatible-sets
idea, and it carries the unfinished **time-gate half** of the `time-gating-flexibility` work (the resource half
already shipped). The motivating realization: the heist "plays a lot like" the cave because the engine currently
*only* supports the timed-survival shape — the profile is what lets one engine host genuinely different games
safely.

**Scope (agreed):** the profile **framework** + the **presets + validator** mechanism, with the **clock** as the
first fully-worked dimension. Deferred to their own follow-on specs: the exotic clock mechanics (long horizons,
variable granularity), clock scoping beyond today's `gameDeadlineMinutes`, and the `travel` / `investigation` /
timed-challenge dimensions. See **Out of scope**.

## The model

A **`Profile`** declares a game's shape as a record of dimension→value choices. v1 fully works one dimension:

```ts
// src/engine/profile.ts
export type ClockMode = 'timed' | 'untimed';   // 'long-horizon' reserved as a future value of this dimension
export interface Profile {
  clock: ClockMode;
  // future dimensions slot in here unchanged: travel?: 'off' | 'free'; investigation?: 'off' | 'on'; …
}
export const DEFAULT_PROFILE: Profile = { clock: 'timed' };
```

- **Where it lives:** `Story.profile?: Profile` (the clock is a per-`Story` property — `startTime`/`deadline`
  live there). A multi-chapter `Game` gets `Game.profile?: Profile` as the default all chapters inherit; the
  game-linter checks chapters conform (uniform clock in v1 — no mixed timed/untimed within one game yet).
- **Backward-compat is load-bearing:** an **absent profile resolves to `DEFAULT_PROFILE` (`timed`)** — today's
  exact behavior. Every existing story and all 305 tests are implicitly `clock: 'timed'`; all current clock lints
  run unchanged. Retrofitting is a behavior-neutral stamp.

## The compatibility model (how it "knows")

**Each dimension is a self-contained module** — one purpose, testable alone — exposing a validator and a
description:

```ts
export interface ProfileIssue { code: string; message: string; where?: string; }
export interface Dimension {
  id: string;                                          // 'clock'
  values: readonly string[];                           // ['timed', 'untimed']
  validate(story: Story, value: string): ProfileIssue[];   // story-vs-declared-value conflicts
  describe(value: string): string;                     // for messages + the authoring guide
}
```

**The clock dimension's constraints** (`src/engine/profile.ts`):
- **`timed`** *requires* a `deadline`. Missing → `PROFILE_TIMED_NEEDS_DEADLINE`.
- **`untimed`** *forbids* the clock-bound features; each conflict is its own granular issue, and every message
  ends with the recommended valid set (`TIME_PRESSURE_SURVIVAL`):
  - a `deadline` is present → `PROFILE_UNTIMED_HAS_DEADLINE`
  - `outOfTimeEndingId` is set → `PROFILE_UNTIMED_HAS_OOT_ENDING`
  - any resource has `depletion` (time-driven) → `PROFILE_UNTIMED_HAS_TIME_RESOURCE`
  - any condition uses a time op (`time_before` / `time_after` / `time_between`) on a choice, ending, or event
    trigger → `PROFILE_UNTIMED_HAS_TIME_CONDITION`

**The validator** — `validateProfile(story, profile?): ProfileIssue[]`:
1. resolve the profile (`?? DEFAULT_PROFILE`);
2. run each registered dimension's `validate(story, profile[dim.id])` and collect issues;
3. (cross-dimension `incompatiblePairs` check — **empty in v1**, the hook for when value-combo A forbids
   value-combo B regardless of story content, e.g. future `travel:free` + `verification:exhaustive`).

**The recommendation** *is* the second half of Matthew's ask. With one dimension and two presets, "nearest valid
set" is trivial — the conflict message names the preset that allows the conflicting features
(`TIME_PRESSURE_SURVIVAL`), e.g.:
> `untimed` conflicts with: deadline `24:45`, time-driven resource `lead`, out-of-time ending `end_dawn`.
> Keep them with preset **TIME_PRESSURE_SURVIVAL** (`clock: 'timed'`), or remove them to stay untimed.

A distance metric over many dimensions is deferred (it generalizes step 3, not the v1 surface).

## The lint-profile flip (D1's "lint profile per toggle")

`lintStory` / `lintGame` become **profile-aware** — this is the concrete payoff:

- Resolve the story's profile. If `clock: 'timed'`, run the existing clock lints (`CLOCK_CANNOT_BITE`,
  `DEADLINE_UNWINNABLE`, `TIME_LITERAL_OUT_OF_RANGE`, deadline parsing) exactly as today.
- If `clock: 'untimed'`, **deactivate** those (they assume a clock) and run the untimed conflict checks instead.
- Always call `validateProfile` and merge its issues as **errors**.

Today an untimed story (no deadline) cannot pass lint at all — the profile is precisely what makes a non-clock
game *legal*.

## Presets + authoring guides + the retrofit

A **preset bundles**: (a) a named `Profile` constant, (b) its lint profile (a *consequence* of the values, not
stored separately), and (c) an **authoring-guide doc**. v1 ships the full set for the clock dimension:

```ts
export const TIME_PRESSURE_SURVIVAL: Profile = { clock: 'timed' };   // the cave/heist shape; the default
export const UNTIMED_BRANCHING: Profile = { clock: 'untimed' };      // no clock; state-driven branching
```

- **`TIME_PRESSURE_SURVIVAL`** — guide = the existing `docs/authoring-method.md` (branch-and-bottleneck + clock
  calibration + survival resources); a thin `docs/authoring/time-pressure-survival.md` points at it.
- **`UNTIMED_BRANCHING`** — new `docs/authoring/untimed-branching.md`: no deadline / time-ops / time-driven
  resources; use latches + choice-driven resources + state-gated endings. (Bonus: the walker is *cheaper*
  untimed — no clock multiplying states.)

**The retrofit (the proof):** the cave + heist chapters stamp `profile: TIME_PRESSURE_SURVIVAL`. Behaviorally a
no-op (timed is the default), but it exercises the field end-to-end and proves zero regression on real games.

## The one engine touch + the surface

The **only runtime change**: `Story.deadline` becomes **optional**.

- `src/engine/types.ts` — `deadline?: string`; add `Story.profile?: Profile`.
- `src/engine/engine.ts` — `this.deadline = story.deadline !== undefined ? parseTime(story.deadline) : undefined;`
  and `pastDeadline = this.deadline !== undefined && this.state.time >= this.deadline` (absent → always false →
  no deadline-forced resolution). Everything else degrades through the validator: untimed *forbids* time-driven
  resources and time-ops, so the engine never reaches them in an untimed game.
- `src/engine/profile.ts` (**NEW**) — `ClockMode`, `Profile`, `DEFAULT_PROFILE`, `ProfileIssue`, `Dimension`,
  `clockDimension`, `validateProfile`, `TIME_PRESSURE_SURVIVAL`, `UNTIMED_BRANCHING`.
- `src/engine/linter.ts` — resolve the profile; guard the clock lints on `clock === 'timed'`; call
  `validateProfile`; export the new codes.
- `src/container/types.ts` — `Game.profile?: Profile`.
- `src/container/lintGame.ts` — resolve `Game.profile` as each chapter's default; check chapter conformance
  (`PROFILE_CHAPTER_CONFLICT` if a chapter declares a different clock than the game in v1).
- `src/container/carry.ts` — `seedChapterStory`'s deadline-clamp only applies when the chapter has a deadline
  (guard on presence, so untimed chapters are untouched).
- Retrofit: stamp `profile: TIME_PRESSURE_SURVIVAL` on the cave + heist chapter stories (no-op).
- Docs: `docs/authoring/untimed-branching.md` (new), `docs/authoring/time-pressure-survival.md` (new, points at
  the method doc).

Modules stay isolated: the `Dimension` is self-contained (validate + describe + values); the linter consumes it;
the engine runtime change is the single optional-deadline guard.

## Out of scope (deferred / parked)

- **Long-horizon + variable granularity** (days/month, minutes→hours→days) — reserved as the `'long-horizon'`
  value of the clock dimension; not implemented.
- **Clock scoping** beyond today's `gameDeadlineMinutes` (per-chapter vs nested vs single) — not added.
- **Other dimensions** — `travel` (free-roam, the #3 capability), `investigation`/clue-exploration (#2),
  timed/skill challenges — each its own follow-on spec hanging off this framework.
- **Cross-dimension `incompatiblePairs`** — the hook exists, empty in v1 (only one dimension).
- **The nearest-set distance metric** — trivial at two values; generalized when there are many dimensions.
- **The D2 prototype-game corpus** (10–20 games across compatible sets) — a separate work item that will
  stress-test the framework and graduate strong combos into presets.

## Verification

- **TDD throughout.** `profile.test.ts`: the clock dimension's `validate()` — timed-with-deadline passes; an
  untimed story with a `deadline` / `outOfTimeEndingId` / time-driven resource / time-op each yields its specific
  conflict code, and the message names `TIME_PRESSURE_SURVIVAL`.
- **The lint-profile flip:** an untimed story (no deadline) — which *fails* lint today — now lints clean under
  `clock: 'untimed'`; a timed story still runs every clock lint (regression).
- **An untimed reference game fixture** that lints clean **and** walks (`walkStateSpace`: no softlocks, endings
  reachable) — the end-to-end proof that an untimed game is now legal.
- **Container:** `lintGame` resolves `Game.profile`; a chapter declaring a conflicting clock is flagged; the
  carry's deadline-clamp skips untimed chapters.
- **Retrofit/regression:** cave + heist stamped `TIME_PRESSURE_SURVIVAL` → **all 305 tests stay green**;
  absent-profile-means-timed is proven by the existing suite passing unchanged.
- Full `npx vitest run` green + `npx tsc --noEmit` clean. Nothing pushed (local commits only).
