# The Sump Line — Multi-Chapter Cave Survival — Engine-Assessment Experiment — Design

> **Status:** Draft for review (2026-06-22). Brainstormed and approved in direction; pending Matthew's
> spec review before planning.
> **Type:** Containerized experiment. **The engine (`src/engine/`, v1.3) is FROZEN — this touches none of it.**

## 1. Purpose & framing

This is an **experiment to assess where the BranchWorld engine is RIGHT NOW**, run by building a large,
multi-hour, multi-chapter cave-survival game *on top of* the current engine and seeing where it strains.
It is deliberately **not** an engine project. We do not extend the engine speculatively; we let the
experiment tell us — with receipts — which engine improvements are actually worth making.

It produces **two co-equal deliverables**:
1. **A playable multi-hour cave game** (slice first, then scaled) — the proof of capability and the
   honest measure of authoring effort for a consumer-grade experience.
2. **An engine-assessment report** — a living log of every place the container had to work around an
   engine limitation: what was free, what needed a workaround, what was genuinely impossible. This is the
   empirical answer to "what should we build into the engine next."

## 2. Hard constraints (the experiment contract)

- **Zero changes to `src/engine/`.** The just-shipped v1.3 engine stays byte-for-byte stable. The
  experiment cannot regress it.
- **Containerized:** all experiment code lives under `src/experiments/sump-line/`. It is the only new
  surface. It must not be imported by `src/engine/`, `src/content/`, or the existing player.
- **Public-API-only:** the container consumes the engine solely through its exported surface —
  `GameEngine` (`start`/`choose`/`view`/`snapshot`/`restore`/`gotoNode`), `lintStory`, `walkStateSpace`,
  and the data types. No reaching into engine internals.
- **Workarounds are findings, not silent fixes.** Whenever the container bends the engine's existing
  knobs to achieve something the engine doesn't do natively, that is logged in the assessment report.

## 3. Locked decisions (from brainstorming, 2026-06-22)

| # | Decision | Choice |
|---|---|---|
| Structure | What "chapters & timelines" means | **One long ordeal, chaptered**; one protagonist; state carries forward (no parallel tracks, no time-travel). |
| Scale target | Engineering target | **Full consumer-grade** (~10-12 chapters, ~4-6 hrs, ~350-550 nodes) — *engineer the container for this*, prove with a 3-chapter slice. |
| Chapter flow | How chapters connect | **Branch & reconverge** — a mostly-linear spine with real forks; some chapters are route-exclusive (the "what did I miss" replay hook). |
| Pressure | Time-pressure model | **Nested** — per-chapter acute clock + a slow survival burn carried across chapters. |
| Architecture | Container shape | **Chapter = Story, Game orchestrates** — each chapter is a full `Story`; a thin Game layer runs them. |
| Clock | Game-level clock | **Yes**, implemented as **container orchestration**, not an engine feature. |
| Model | Carried-state contract changes | **No changes** beyond what's specified below. |

## 4. Architecture — Chapter = Story, Game orchestrates

A chapter is literally one of our existing `Story` objects, run by the existing `GameEngine`, verified by
the existing `walkStateSpace` and `lintStory`. The container adds an orchestration layer above it.

```ts
// src/experiments/sump-line/types.ts  (experiment-local — NOT engine types)
interface Chapter {
  id: string;
  title: string;
  story: Story;                 // a normal engine Story (own nodes, own clock, own endings)
  gameEnding?: boolean;         // if true, reaching an ending here ends the whole game
  transitions: ChapterTransition[]; // evaluated in order when this chapter ends
}

interface ChapterTransition {
  when: { endingId?: string; conditions?: Condition[] }; // matched against final WorldState + ending
  goTo: string;                 // next chapter id
}

interface Game {
  id: string;
  title: string;
  startChapterId: string;
  chapters: Chapter[];
  carry: CarryContract;         // what persists between chapters (see §6)
  gameDeadlineMinutes?: number; // optional overall survival horizon (container-enforced)
}
```

```ts
// src/experiments/sump-line/GameRunner.ts
class GameRunner {
  // run current chapter's GameEngine to its ending, then:
  //  1) accumulate chapter elapsed into the game clock
  //  2) evaluate this chapter's transitions (in order) against the final state + ending -> next chapter
  //  3) seed the next chapter (apply the carry contract; rebase carried resources; set effective deadline)
  //  4) repeat until a gameEnding chapter ends, or the game deadline is exceeded
}
```

The `GameRunner` is the only orchestration brain; each chapter's `GameEngine` is untouched and unaware it
is part of a larger game.

## 5. The nested clock — game clock via orchestration

Two clocks, reconciled entirely in the container:

- **Chapter clock (acute):** the chapter's own `Story` `startTime`→`deadline`, run by the engine exactly
  as today. This drives the per-chapter time-driven resources and the chapter's own deadline ending.
- **Game clock (slow burn):** the container keeps a running `gameElapsedMinutes`. When a chapter ends, it
  adds that chapter's elapsed time (`finalState.time − chapterStartTime`) to the game clock.

Carrying the survival burn across chapters (the subtle part, done without engine changes):
- **Survival resources are rebased on chapter entry.** A game-level resource (e.g. `body_heat`, `food`)
  is declared in each chapter's `Story` that uses it. On entry to chapter N, the container clones that
  chapter's `Story` and sets the resource's `start` to the **carried value** from chapter N−1. Within the
  chapter, the engine depletes it normally from that start; on exit the container reads the final value
  and carries it onward. → **Assessment finding:** the engine has no native cross-chapter resource
  persistence; rebasing `resource.start` at entry is a clean workaround, but native support would be
  cleaner.
- **Effective per-chapter deadline.** If a `gameDeadlineMinutes` is set, the container clones the chapter
  `Story` and sets its `deadline` to `min(chapter's own deadline, startTime + remaining game time)`, so an
  overall rescue window can bite mid-chapter. Because the horizon is projected onto the chapter's own
  `deadline`, an exceeded game-clock surfaces *as that chapter's deadline ending* — handled by the
  chapter's transitions / `gameEnding` like any other ending, so the runner needs no separate "game-over"
  check. → **Assessment finding:** the engine knows only one deadline per Story; a game-level horizon must
  be projected onto each chapter.

## 6. Carried-state contract

```ts
interface CarryContract {
  vars: 'all' | string[];       // default 'all' — companion/injury/trust live here, all carry
  resources: string[];          // game-level resources to rebase & carry (e.g. body_heat, food, lamp)
  clues: boolean;               // default true
  inventory: boolean;           // default true
}
```

- **Carries forward:** game-level vars, listed game-level resources, clues, inventory (companions
  alive/dead, injuries, trust are ordinary vars → carried).
- **Resets per chapter:** the chapter clock (rebased to the chapter's `startTime`), `location` (chapter's
  `startLocation`), `visited`, `completedEvents`.
- **Chapter-local resources** (e.g. "air in this pocket") are declared in a chapter's `Story` but omitted
  from `carry.resources`, so they reset each chapter.

## 7. Verification at scale

- **Per chapter — unchanged and exhaustive.** Each chapter is a bounded `Story`, so `lintStory` +
  `walkStateSpace` run on it exactly as today: no soft-locks, no orphan endings, clock bites, every
  chapter-ending reachable. Chaptering is what keeps a 500-node game provably sound.
- **Game-level — a new container-side graph check** (`lintGame`): every chapter reachable from
  `startChapterId`; every chapter has exhaustive transitions (no reachable end-state with no `goTo`);
  every game-ending reachable; no orphan chapters; **carried-state sanity** — no chapter gates content on
  a carried var/resource that no prior chapter on a path to it can set; the `gameDeadlineMinutes` (if set)
  is reachable-but-survivable (a fast path finishes, a slow path can run out).

## 8. Save / resume

A game snapshot = `{ gameId, currentChapterId, carried: WorldStateSubset, gameElapsedMinutes, chapterSnapshot: EngineSnapshot }`, persisted to localStorage. Multi-hour play means cross-session resume is
first-class. → **Assessment finding (anticipated):** the engine snapshots a single chapter; the container
wraps it with game-level state.

## 9. The engine-assessment report (co-deliverable)

`src/experiments/sump-line/ENGINE-ASSESSMENT.md` — a living log, updated as we build, with one entry per
friction point: **what we wanted**, **what the engine gave us**, **the workaround (if any)**, and a
**verdict** (free / workaround-clean / workaround-ugly / impossible) plus a **recommended engine change**
(and rough size). At the end of the slice it carries a summary: *where the engine is strong, where a
container can paper over gaps, and the prioritized shortlist of native capabilities worth adding* — the
input to a future, *informed* engine-improvement decision.

## 10. Content — The Sump Line, chaptered

The cave content reuses and expands the **"The Sump Line"** draft from the chapter-design workflow
(`BranchWorld-Three-Chapter-Designs.md`): a club caving trip turned lethal by a flood pulse, an injured
companion, a dying lamp, a sealing sump. Re-cast as a chaptered ordeal (descent → the flood → trapped →
deeper → the long climb → the way out), branch-and-reconverge, nested pressure (per-chapter danger +
carried `body_heat`/`food`/`lamp`/companion-state).

- **Slice (build first):** the first **3 chapters**, fully authored, lint-clean, per-chapter walked, with
  carry-over and the game clock proven end-to-end across the transitions.
- **Scale (after):** to the full ~10-12 chapters once the slice proves the machinery and gives us the
  per-chapter effort number to extrapolate.

## 11. Build order (decomposition)

1. **Container (E1):** `types`, `GameRunner`, game-clock + resource-rebasing orchestration, `lintGame`,
   game-save, and a thin runner harness — all under `src/experiments/sump-line/`, TDD, against the frozen
   engine. Proven with a tiny 2-3 chapter synthetic fixture.
2. **Cave slice (E2):** author the first 3 Sump Line chapters as real `Story` objects; wire transitions +
   carry contract; per-chapter walk + `lintGame` green; playable end-to-end.
3. **Assess:** finalize the slice's assessment-report summary.
4. **Scale (later, separate):** chapters 4-12, then the player-facing shell.

## 12. Effort read (the experiment's other point)

The **container is tractable** — additive orchestration over a working engine, comparable to the
web-player/flow-graph sub-projects. The **content is the real cost**: ~350-550 authored, verified nodes
for the full game. The slice exists to **measure** the per-chapter authoring/verification effort honestly
so we can extrapolate the consumer-grade cost — that number is part of the deliverable.

## 13. Non-goals / scope

- **No engine changes.** Any needed capability is recorded as a finding, not built here.
- No parallel-character timelines, no time-travel mechanics (excluded by the structure decision).
- No new condition/effect operators; no changes to the carried-state contract beyond §6.
- The player-facing UI shell for the full game is out of scope for the slice (a minimal runner/harness is
  enough to prove and play the slice); a polished shell comes with scaling.
- We do not act on the assessment findings within this experiment — surfacing them *is* the goal.

## 14. Done-when (container + slice)

- `src/experiments/sump-line/` builds and is fully unit-tested; `tsc` + `vite build` clean; the existing
  157-test engine suite untouched and green.
- A synthetic multi-chapter fixture runs through the `GameRunner` end-to-end: chapters transition by
  condition, state carries, the game clock accumulates, a survival resource depletes across chapters, and
  a game-ending resolves.
- `lintGame` flags a deliberately-broken game (orphan chapter, non-exhaustive transition, carried-state
  gap) and passes a correct one.
- The 3-chapter Sump Line slice is playable start-to-finish to its game-endings; each chapter lints clean
  and walks exhaustively with no soft-locks/orphans; carry-over and nested pressure are demonstrable.
- `ENGINE-ASSESSMENT.md` exists with concrete findings and a prioritized shortlist.
