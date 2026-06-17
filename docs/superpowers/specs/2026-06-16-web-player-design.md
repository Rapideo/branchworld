# Sub-project B — Mobile-Responsive Web Player + Debug Panel — Design

> **Status:** Approved design (2026-06-16). Next step: implementation plan via writing-plans.
> **Depends on:** Sub-project A (hardened engine core + linter), already complete in `src/engine/`.
> **PRD references:** §5 (sub-project B), §11 (player experience), §18 (stack), §21 (debug), §EE-1/§EE-6.

## 1. Goal & scope

Build a thin, mobile-first web player over the existing pure-TypeScript engine, plus a toggleable
debug panel, so the engine can be *played and felt* in a browser. The engine remains the single
source of truth; the UI never re-implements any rule (PRD §EE-6).

**In scope:** player view, hidden-choice handling, named save slots, debug panel (inspector + reset +
jump-to-node + linter status + ending preview), one bundled sample story, component tests.

**Explicitly out of scope (deferred, not dropped):**
- Visual node/flow graph and live-on-graph linting → Sub-project D (authoring tool).
- Live state editing / authoring controls → Sub-project D.
- The real validation chapter (The 4:10 Envelope / The Prater Line) and `add_minutes` calibration
  → Sub-project C. B ships only a tiny demo story.
- Native packaging → later (PRD: "mobile HTML view first, native later").

## 2. Decisions (locked during brainstorming)

| # | Decision | Choice |
|---|---|---|
| 1 | Story content | **Bundle one small sample story** in the repo; C drops in the full chapter later the same way. |
| 2 | Locked choices in player view | **Hidden** from the player; their `lockedReason` is shown only in the debug panel. |
| 3 | Debug panel capability | **Read-only inspector + reset + jump-to-node** (+ linter status + "which ending resolves now"). No live state editing. |
| 4 | Saves | **Multiple named save slots** in localStorage (save/load/delete by name). |
| 5 | Polish level | **Clean, minimal, mobile-first** reading UI (Tailwind); re-themable foundation, not a heavy skin. |
| a | Save/jump logic home | **In the engine** — add a small, tested `snapshot`/`restore`/`gotoNode` seam (not in the UI). |
| b | Sample story vs C | **Write a tiny purpose-built demo story now**; it doubles as a permanent smoke-test fixture. |

## 3. Architecture

**Approach: the engine is the source of truth; React is a thin renderer.** A `useGame` hook holds the
live `GameEngine` instance in a ref and the latest `GameView` in React state. Every action
(`choose`, `reset`, `gotoNode`, `restore`) calls the engine and then re-renders from `engine.view()`.
React components are pure functions of `GameView`. No Redux/Zustand; no engine logic in the UI.

```
 sampleStory ──▶ new GameEngine(story) ──▶ engine.view() ──▶ React renders GameView
       ▲                  │  ▲
       │      choose(id)/reset()/gotoNode(id)/restore(snap)
       │                  │
   localStorage ◀── engine.snapshot() / restore(snapshot)
```

### Stack
- **Vite + React + TypeScript + Tailwind CSS**, reusing the existing `package.json` / `tsconfig` / `src/`.
- `src/engine/**` stays 100% framework-free — no React, no DOM imports — by convention and code review.
- New runtime deps: `react`, `react-dom`. New dev deps: `vite`, `@vitejs/plugin-react`, `tailwindcss`,
  `postcss`, `autoprefixer`, `@types/react`, `@types/react-dom`, `jsdom`, `@testing-library/react`,
  `@testing-library/jest-dom`, `@testing-library/user-event`.
- New scripts: `dev` (vite), `build` (vite build), `preview` (vite preview). Keep `test`, `typecheck`.
- `tsconfig`: add `"jsx": "react-jsx"` and `DOM`/`DOM.Iterable` to `lib`. (The engine still imports
  no DOM types; the convention, not the compiler, keeps it pure.)

## 4. Engine additions (pure, unit-tested, additive — existing 41 tests stay green)

Added to `src/engine/engine.ts` (+ tests in `engine.test.ts`); exported via the barrel.

```ts
export interface EngineSnapshot {
  version: 1;
  storyId: string;        // guards restore against a mismatched story
  currentId: string;
  state: WorldState;
  log: string[];
  endingId?: string;      // resolved ending id, if any
}

class GameEngine {
  // ...existing constructor/start/view/choose...
  snapshot(): EngineSnapshot;          // deep-cloned, JSON-serializable
  restore(snap: EngineSnapshot): void; // throws on version/storyId mismatch; rehydrates state/currentId/log/ending
  gotoNode(id: string): GameView;      // DEBUG: enter a node (entry effects, visited, ending check); no choice applied
}
```

- `snapshot()` returns a structurally-cloned snapshot (the UI must not be able to mutate engine
  internals through it).
- `restore()` validates `version` and `storyId`, then sets state/currentId/log and re-derives the
  `ending` object from `endingId` via `story.endings`.
- `gotoNode()` is a debug/testing affordance with simple semantics: it enters the node and returns
  the view; it does **not** unwind a previously reached ending (use `reset()` for that).
- Engine purity guard (optional, cheap): a unit test asserting no `src/engine/*.ts` file imports
  `react`/`react-dom`.

## 5. Repository layout

```
index.html                     # Vite entry
src/
  main.tsx                     # mounts <App/>
  engine/                      # unchanged + snapshot/restore/gotoNode
  content/
    sampleStory.ts             # the bundled demo Story (the demo)
    sampleStory.test.ts        # asserts lintStory(sampleStory).ok === true
  player/
    useGame.ts                 # hook: engine ref + view + actions
    App.tsx                    # composes player + debug drawer + save slots
    renderBody.ts              # {{time}} token substitution
    StatusBar.tsx              # time · location
    SceneView.tsx              # node title + rendered body
    ChoiceList.tsx             # available choices only
    EndingView.tsx             # shown when GameView.endingReached
    debug/
      DebugPanel.tsx           # toggle/drawer shell
      StateInspector.tsx       # time, location, vars, clues, inventory, visited, completed
      EventLog.tsx             # fired events (log) + upcoming/pending events
      HiddenChoices.tsx        # locked choices + lockedReason
      EndingPreview.tsx        # resolveEnding(state, story) right now
      LintStatus.tsx           # lintStory(story) summary
      JumpToNode.tsx           # pick any node id → gotoNode
    saves/
      SaveSlots.tsx            # list / save / load / delete named slots
      storage.ts              # namespaced, error-safe localStorage I/O
  index.css                    # Tailwind directives
```

UI tests are co-located (`*.test.tsx`).

## 6. Components (each one job)

- **`useGame(story)`** — owns `engineRef` + `view` state; exposes `{ view, choose, reset, gotoNode,
  snapshot, restore }`. The only place that touches the engine instance.
- **Player:** `StatusBar` (engine-derived time + location), `SceneView` (title + `renderBody`),
  `ChoiceList` (renders only `choices.filter(c => c.available)` as full-width buttons), `EndingView`
  (renders `endingReached.name`/`summary`/`body` and offers "New game").
- **`renderBody(body, view)`** — replaces the `{{time}}` token with `view.timeLabel` (PRD §EE-1).
  Pure, unit-tested.
- **Debug drawer:** `StateInspector`, `EventLog` (+ upcoming events = story events not yet in
  `state.completedEvents`), `HiddenChoices` (locked choices with their `lockedReason`), `EndingPreview`,
  `LintStatus`, and controls `Reset` + `JumpToNode`.
- **`SaveSlots` / `storage.ts`** — named slots via `engine.snapshot()` / `engine.restore()`.

## 7. Data flow & save model

- **Boot:** `new GameEngine(sampleStory)` → render `view()`.
- **Choice:** click → `choose(id)` → engine advances (effects → scheduled events → routing → ending)
  → `setView(engine.view())`.
- **Save:** write `engine.snapshot()` under a named slot.
- **Load:** read slot → `engine.restore(snapshot)` → `setView(engine.view())`.
- **localStorage schema:** key `branchworld:saves:<storyId>` → JSON object
  `{ [slotName]: { snapshot: EngineSnapshot, savedAt: ISO-ish string, summary: string } }`.
  Namespaced by `storyId` so multiple stories never collide. (`savedAt`/`summary` are produced by the
  UI at save time; the engine remains clock-pure.)

## 8. Error handling

- The player renders only valid, available choices, so the engine's throw-on-bad-input never fires
  from normal play. `JumpToNode` lists only real node ids.
- `storage.ts` wraps all localStorage access in try/catch: unavailable storage or corrupt/oversized
  JSON degrades gracefully (a non-blocking notice; play continues; the bad slot is skipped).
- `restore()` throwing on storyId/version mismatch is caught by `SaveSlots` and surfaced as a
  non-blocking error.
- If the bundled story ever fails lint, `LintStatus` shows the errors prominently. (It must always be
  clean — see §10.)

## 9. Testing strategy

- **Vitest environment split:** engine/content tests run in `node`; UI tests run in `jsdom`. Configure
  via `environmentMatchGlobs` (e.g. `src/player/**` → jsdom) so the existing node-based engine tests
  are untouched.
- **Engine additions:** unit tests for `snapshot`/`restore` round-trip (incl. storyId-mismatch throw)
  and `gotoNode`.
- **`renderBody`:** unit test for `{{time}}` substitution.
- **UI (React Testing Library):**
  - start scene renders title/body/status;
  - taking an available choice advances time/location and re-renders;
  - locked choices are **absent** from the player DOM but **present** in the debug panel with reasons;
  - reaching a resolution shows the correct state-resolved ending;
  - save → load restores exact state;
  - jump-to-node renders the chosen node.
- **Sample story:** a test asserts `lintStory(sampleStory).ok === true`.

## 10. The bundled sample story (`src/content/sampleStory.ts`)

A compact, self-contained mini-mystery that proves the *player* by exercising every reactivity axis.
**Requirements (the implementation authors the actual nodes):**

- ~5–7 nodes, 2–3 locations, a `startTime`/`deadline` window.
- One scheduled event with present (`ifPresentNode`) and absent (`ifAbsentEffects`) paths and a
  **reachable** `recoveryNodeId`.
- At least one knowledge/clue-gated choice that is **hidden, then revealed** after a state change.
- 3–4 ordered endings including the **mandatory `isDefault` catch-all**; at least two distinct endings
  reachable by different play.
- `add_minutes` costs tuned so the engine **lints clean**: the longest reachable path can exceed the
  deadline (clock can bite, no `CLOCK_CANNOT_BITE`) and the shortest path does **not** already overrun
  it (no `POSSIBLY_UNWINNABLE` warning).
- One variable per meaning (no overloading), per §EE-5.

It is intentionally tiny and overlaps slightly with Sub-project C, but C delivers the *full* chapter
and the narrative thesis; this fixture only proves the runtime and stays as the canonical format
example / smoke test.

## 11. Visual direction (clean, minimal, mobile-first)

- Single-column, max-width reading layout; generous line-height; serif body for prose readability.
- Sticky compact status bar (time · location).
- Choices as full-width, tappable buttons.
- Endings as a distinct card.
- Restrained palette (warm near-black on off-white, one accent); re-themable later once C settles tone.
- Debug panel = a collapsible drawer (bottom sheet on mobile / side panel on desktop), monospace and
  muted, visually walled off so it never bleeds into the player aesthetic.

```
┌─────────────────────────┐
│  4:10 PM · The Diner     │  ← sticky status bar
├─────────────────────────┤
│  Scene title            │
│  Body prose with the     │  ← {{time}} substituted from view.timeLabel
│  {{time}} woven in...    │
│                         │
│  ▸ Ask about the envelope│  ← available choices only (full-width buttons)
│  ▸ Walk to the arcade    │
├─────────────────────────┤
│  ⚙ debug ▾   💾 saves ▾  │  ← drawers, walled off from player styling
└─────────────────────────┘
```

## 12. Done-when

- `npm run dev` serves a mobile-first player of the sample story; the full suite (engine + UI) is green
  and `tsc --noEmit` is clean.
- A player can: take choices, see engine-derived time advance, hit the scheduled event present **and**
  absent (recovering the planted clue), and reach at least two different state-resolved endings.
- Locked choices never appear in the player view but do appear in the debug panel with reasons.
- Named save slots round-trip exact state across reloads; reset and jump-to-node work.
- The debug panel shows live state, fired/upcoming events, the current ending preview, and a clean
  linter status for the bundled story.
```
