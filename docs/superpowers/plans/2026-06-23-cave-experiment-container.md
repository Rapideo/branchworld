# Cave Experiment — E1 Game/Chapter Container — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a containerized Game/Chapter orchestration layer that runs a multi-chapter game on top of the frozen v1.3 engine (each chapter is a `Story`), with branch-and-reconverge transitions, cross-chapter carried state, a game-level clock, a game-graph linter, and save/resume — proven end-to-end on a synthetic example game.

**Architecture:** A new isolated package under `src/experiments/sump-line/`. A `GameRunner` drives the existing `GameEngine` one chapter at a time; when a chapter reaches an ending it accumulates a game clock, extracts carried state, picks the next chapter from that chapter's transitions, and seeds the next chapter by *rewriting its Story* (variable defaults, resource starts, projected deadline, carried clue/item entry-effects). Nothing in `src/engine/` changes; the container only calls the engine's public API. Every workaround is logged in `ENGINE-ASSESSMENT.md`.

**Tech Stack:** TypeScript 5 (strict), Vitest 2. The container imports the engine via the barrel `../../engine`. No React/DOM in the container logic.

## Global Constraints

- **The engine is FROZEN.** Do NOT modify anything under `src/engine/`. If a task seems to need an engine change, stop and surface it — it is a finding, not a fix.
- **Containment:** all new code lives under `src/experiments/sump-line/`. It must not be imported by `src/engine/`, `src/content/`, or `src/player/`.
- **Public-API-only:** consume the engine solely through its exports: `GameEngine` (`start`/`view`/`choose`/`snapshot`/`restore`/`gotoNode`), `lintStory`, `parseTime`, `evaluateConditions`, and the exported types (`Story`, `StoryNode`, `Choice`, `Condition`, `Effect`, `WorldState`, `GameView`, `EngineSnapshot`, `Resource`, `VariableDef`, `Primitive`, `LintIssue`). Import from `../../engine`.
- **Immutability:** never mutate a chapter's authored `Story`; `seedChapterStory` deep-clones before rewriting.
- **Non-breaking:** the existing engine suite (157 tests) stays green at every task; the container is additive.
- Tests co-located as `src/experiments/sump-line/<module>.test.ts`. Every task ends with `npx vitest run` green and a Conventional-Commits commit.
- YAGNI: no player UI shell, no cave content, no engine features. This plan is the container + a synthetic example only.

---

### Task 1: Package scaffold, types, and the synthetic example game

**Files:**
- Create: `src/experiments/sump-line/types.ts`
- Create: `src/experiments/sump-line/exampleGame.ts`
- Test: `src/experiments/sump-line/exampleGame.test.ts`

**Interfaces:**
- Produces: `ChapterTransition`, `Chapter`, `CarryContract`, `Game`, `CarriedState`, `GameSnapshot`, `GameRunnerView` (types); `exampleGame: Game` (a 3-chapter synthetic game with a carried, depleting resource and a state-driven branch).

- [ ] **Step 1: Create `src/experiments/sump-line/types.ts`** (no test — consumed by later tasks)

```ts
import type { Story, Condition, Primitive, GameView, EngineSnapshot } from '../../engine';

/** A rule evaluated when a chapter ends; first match wins. Empty `when` = catch-all. */
export interface ChapterTransition {
  when: { endingId?: string; conditions?: Condition[] };
  goTo: string; // id of the next chapter
}

export interface Chapter {
  id: string;
  title: string;
  story: Story;           // a normal engine Story (own nodes, own clock, own endings)
  gameEnding?: boolean;   // if true, reaching an ending here ends the whole game
  transitions: ChapterTransition[]; // evaluated in order on chapter end
}

export interface CarryContract {
  vars: 'all' | string[];
  resources: string[];    // game-level resource ids whose value carries (start rebased next chapter)
  clues: boolean;
  inventory: boolean;
}

export interface Game {
  id: string;
  title: string;
  startChapterId: string;
  chapters: Chapter[];
  carry: CarryContract;
  gameDeadlineMinutes?: number; // optional overall survival horizon (container-projected)
}

export interface CarriedState {
  vars: Record<string, Primitive>;
  clues: string[];
  inventory: string[];
}

export interface GameSnapshot {
  gameId: string;
  currentChapterId: string;
  gameElapsedMinutes: number; // elapsed at the START of the current chapter
  carriedIn: CarriedState;    // the carry used to seed the current chapter
  chapter: EngineSnapshot;    // the current chapter engine's snapshot
}

export interface GameRunnerView extends GameView {
  chapterId: string;
  chapterTitle: string;
  gameElapsedMinutes: number;
  gameOver: boolean;
  finalEndingId?: string;
}
```

- [ ] **Step 2: Write the failing test `src/experiments/sump-line/exampleGame.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { lintStory } from '../../engine';
import { exampleGame } from './exampleGame';

describe('exampleGame', () => {
  it('has 3 chapters, a start chapter, and one game-ending chapter', () => {
    expect(exampleGame.chapters.length).toBe(4);
    expect(exampleGame.chapters.some((c) => c.id === exampleGame.startChapterId)).toBe(true);
    expect(exampleGame.chapters.filter((c) => c.gameEnding).length).toBe(1);
  });
  it('every chapter story lints clean', () => {
    for (const ch of exampleGame.chapters) {
      const r = lintStory(ch.story);
      const errors = r.errors;
      expect(errors, `chapter ${ch.id}: ${JSON.stringify(errors)}`).toEqual([]);
    }
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run exampleGame`
Expected: FAIL — cannot find module `./exampleGame`.

- [ ] **Step 4: Create `src/experiments/sump-line/exampleGame.ts`**

```ts
import type { Story } from '../../engine';
import type { Game } from './types';

// Chapter 1: warmth starts at 4 and depletes 1 per 30 min. "slow" burns more warmth than "fast".
const ch1Story: Story = {
  id: 'ex_ch1', title: 'Descent', startNodeId: 'c1_start', startTime: '00:00', deadline: '01:30',
  startLocation: 'L', variables: [], locations: [{ id: 'L', name: 'Cave' }],
  events: [],
  resources: [{ id: 'warmth', label: 'Warmth', min: 0, max: 4, start: 4, depletion: { everyMinutes: 30, amount: 1 } }],
  nodes: [
    { id: 'c1_start', title: 'The Drop', body: 'Cold air rises from the shaft.', choices: [
      { id: 'slow', label: 'Down carefully', destination: 'c1_end', effects: [{ field: 'time', op: 'add_minutes', value: '90' }] },
      { id: 'fast', label: 'Down fast', destination: 'c1_end', effects: [{ field: 'time', op: 'add_minutes', value: '30' }] },
    ] },
    { id: 'c1_end', title: 'The Floor', body: 'You reach the chamber floor.', resolvesEnding: true, choices: [] },
  ],
  endings: [{ id: 'c1_done', name: 'At the floor', summary: 'down', conditions: [], isDefault: true }],
};

// Chapter 2a (warm route) and 2b (cold route) both reconverge on chapter 3.
const ch2aStory: Story = {
  id: 'ex_ch2a', title: 'The Dry Gallery', startNodeId: 'c2a_start', startTime: '00:00', deadline: '00:30',
  startLocation: 'L', variables: [], locations: [{ id: 'L', name: 'Cave' }], events: [],
  resources: [{ id: 'warmth', label: 'Warmth', min: 0, max: 4, start: 4, depletion: { everyMinutes: 30, amount: 1 } }],
  nodes: [
    { id: 'c2a_start', title: 'Dry Gallery', body: 'A dry passage, mercifully.', choices: [
      { id: 'on', label: 'Press on', destination: 'c2a_end', effects: [{ field: 'time', op: 'add_minutes', value: '30' }] },
    ] },
    { id: 'c2a_end', title: 'Onward', body: 'The gallery narrows.', resolvesEnding: true, choices: [] },
  ],
  endings: [{ id: 'c2a_done', name: 'Through the gallery', summary: 'on', conditions: [], isDefault: true }],
};

const ch2bStory: Story = {
  id: 'ex_ch2b', title: 'The Wet Crawl', startNodeId: 'c2b_start', startTime: '00:00', deadline: '00:40',
  startLocation: 'L', variables: [], locations: [{ id: 'L', name: 'Cave' }], events: [],
  resources: [{ id: 'warmth', label: 'Warmth', min: 0, max: 4, start: 4, depletion: { everyMinutes: 20, amount: 1 } }],
  nodes: [
    { id: 'c2b_start', title: 'Wet Crawl', body: 'Frigid water soaks you through.', choices: [
      { id: 'on', label: 'Crawl on', destination: 'c2b_end', effects: [{ field: 'time', op: 'add_minutes', value: '40' }] },
    ] },
    { id: 'c2b_end', title: 'Onward', body: 'You emerge, shaking.', resolvesEnding: true, choices: [] },
  ],
  endings: [{ id: 'c2b_done', name: 'Through the crawl', summary: 'on', conditions: [], isDefault: true }],
};

// Chapter 3: game ending. "warmth gt 0" -> survived; default -> frozen.
const ch3Story: Story = {
  id: 'ex_ch3', title: 'The Last Climb', startNodeId: 'c3_start', startTime: '00:00', deadline: '00:20',
  startLocation: 'L', variables: [{ name: 'frozen_flag', type: 'boolean', default: false, purpose: 'reached zero warmth' }],
  locations: [{ id: 'L', name: 'Cave' }], events: [],
  resources: [{ id: 'warmth', label: 'Warmth', min: 0, max: 4, start: 4, depletion: { everyMinutes: 30, amount: 1 }, atZero: { setFlag: 'frozen_flag' } }],
  nodes: [
    { id: 'c3_start', title: 'The Shaft', body: 'Daylight, far above.', choices: [
      { id: 'climb', label: 'Climb', destination: 'c3_end', effects: [{ field: 'time', op: 'add_minutes', value: '20' }] },
    ] },
    { id: 'c3_end', title: 'The Surface?', body: 'You haul yourself up.', resolvesEnding: true, choices: [] },
  ],
  endings: [
    { id: 'survived', name: 'Out, Alive', summary: 'warm enough', conditions: [{ field: 'warmth', op: 'gt', value: '0' }] },
    { id: 'frozen', name: 'The Cold Took You', summary: 'froze', conditions: [], isDefault: true },
  ],
};

export const exampleGame: Game = {
  id: 'example_cave', title: 'Synthetic Cave', startChapterId: 'ch1',
  carry: { vars: 'all', resources: ['warmth'], clues: true, inventory: true },
  gameDeadlineMinutes: 600,
  chapters: [
    { id: 'ch1', title: 'Descent', story: ch1Story, transitions: [
      { when: { conditions: [{ field: 'warmth', op: 'lte', value: '2' }] }, goTo: 'ch2b' },
      { when: {}, goTo: 'ch2a' },
    ] },
    { id: 'ch2a', title: 'Dry Gallery', story: ch2aStory, transitions: [{ when: {}, goTo: 'ch3' }] },
    { id: 'ch2b', title: 'Wet Crawl', story: ch2bStory, transitions: [{ when: {}, goTo: 'ch3' }] },
    { id: 'ch3', title: 'Last Climb', story: ch3Story, gameEnding: true, transitions: [] },
  ],
};
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run exampleGame`
Expected: PASS — 3 chapters, one game-ending, all chapter stories lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/experiments/sump-line/types.ts src/experiments/sump-line/exampleGame.ts src/experiments/sump-line/exampleGame.test.ts
git commit -m "feat(experiment): cave-container types + synthetic example game"
```

---

### Task 2: Carry extraction + chapter seeding (the crux)

**Files:**
- Create: `src/experiments/sump-line/carry.ts`
- Test: `src/experiments/sump-line/carry.test.ts`

**Interfaces:**
- Consumes: `Story`, `Effect`, `WorldState`, `Primitive`, `parseTime` (engine); `CarryContract`, `CarriedState` (Task 1).
- Produces: `extractCarry(state: WorldState, contract: CarryContract): CarriedState`, `seedChapterStory(story: Story, carry: CarriedState, gameElapsedMinutes: number, gameDeadlineMinutes?: number): Story`, `minutesToClock(min: number): string`.

- [ ] **Step 1: Write the failing test `src/experiments/sump-line/carry.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { extractCarry, seedChapterStory, minutesToClock } from './carry';
import type { Story, WorldState } from '../../engine';
import type { CarryContract } from './types';

const state: WorldState = {
  time: 970, location: 'X', clues: ['map'], inventory: ['rope'], visited: ['n1'],
  completedEvents: ['e1'], vars: { warmth: 1, trust: 3, name: 'Mara' },
};
const contract: CarryContract = { vars: 'all', resources: ['warmth'], clues: true, inventory: true };

const story = (): Story => ({
  id: 's', title: 's', startNodeId: 'start', startTime: '00:00', deadline: '02:00', startLocation: 'L',
  variables: [{ name: 'trust', type: 'number', default: 0, purpose: 't' }],
  locations: [{ id: 'L', name: 'Cave' }], events: [],
  resources: [{ id: 'warmth', min: 0, max: 4, start: 4, depletion: { everyMinutes: 30, amount: 1 } }],
  nodes: [{ id: 'start', title: 'S', body: 'b', entryEffects: [{ field: 'trust', op: 'increment', value: '1' }], choices: [] }],
  endings: [{ id: 'd', name: 'D', summary: 'd', conditions: [], isDefault: true }],
});

describe('minutesToClock', () => {
  it('renders minutes as HH:MM allowing >24h', () => {
    expect(minutesToClock(90)).toBe('1:30');
    expect(minutesToClock(1570)).toBe('26:10');
    expect(minutesToClock(0)).toBe('0:00');
  });
});

describe('extractCarry', () => {
  it("copies vars (all), the listed resource value, clues and inventory", () => {
    const c = extractCarry(state, contract);
    expect(c.vars.trust).toBe(3);
    expect(c.vars.warmth).toBe(1);
    expect(c.clues).toEqual(['map']);
    expect(c.inventory).toEqual(['rope']);
  });
  it('honors a restricted var list and disabled clues/inventory', () => {
    const c = extractCarry(state, { vars: ['trust'], resources: [], clues: false, inventory: false });
    expect(c.vars).toEqual({ trust: 3 });
    expect(c.clues).toEqual([]);
    expect(c.inventory).toEqual([]);
  });
});

describe('seedChapterStory', () => {
  it('does not mutate the source story', () => {
    const src = story();
    const before = JSON.stringify(src);
    seedChapterStory(src, extractCarry(state, contract), 0);
    expect(JSON.stringify(src)).toBe(before);
  });
  it('rebases variable defaults and resource starts from carried values', () => {
    const seeded = seedChapterStory(story(), extractCarry(state, contract), 0);
    expect(seeded.variables.find((v) => v.name === 'trust')!.default).toBe(3);
    expect(seeded.resources!.find((r) => r.id === 'warmth')!.start).toBe(1);
  });
  it('injects carried clues and inventory as prepended start-node entry effects', () => {
    const seeded = seedChapterStory(story(), extractCarry(state, contract), 0);
    const start = seeded.nodes.find((n) => n.id === 'start')!;
    expect(start.entryEffects![0]).toEqual({ field: 'clues', op: 'add_clue', value: 'map' });
    expect(start.entryEffects!.some((e) => e.op === 'add_item' && e.value === 'rope')).toBe(true);
    // authored entry effect is preserved after the injected ones
    expect(start.entryEffects!.some((e) => e.field === 'trust' && e.op === 'increment')).toBe(true);
  });
  it('projects the game deadline onto the chapter deadline when the horizon is tighter', () => {
    // chapter own deadline 02:00 = 120 min; game has 50 min left -> deadline becomes 00:50
    const seeded = seedChapterStory(story(), extractCarry(state, contract), 550, 600);
    expect(seeded.deadline).toBe('0:50');
  });
  it("leaves the chapter deadline alone when the game horizon is looser", () => {
    const seeded = seedChapterStory(story(), extractCarry(state, contract), 0, 600);
    expect(seeded.deadline).toBe('2:00'); // min(120, 600) -> 120 = 02:00
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run carry`
Expected: FAIL — cannot find module `./carry`.

- [ ] **Step 3: Create `src/experiments/sump-line/carry.ts`**

```ts
import { parseTime } from '../../engine';
import type { Story, Effect, WorldState, Primitive } from '../../engine';
import type { CarryContract, CarriedState } from './types';

export function minutesToClock(min: number): string {
  const m = Math.max(0, Math.round(min));
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${hh}:${mm < 10 ? '0' : ''}${mm}`;
}

export function extractCarry(state: WorldState, contract: CarryContract): CarriedState {
  const vars: Record<string, Primitive> = {};
  if (contract.vars === 'all') Object.assign(vars, state.vars);
  else for (const k of contract.vars) if (k in state.vars) vars[k] = state.vars[k];
  for (const id of contract.resources) if (id in state.vars) vars[id] = state.vars[id];
  return {
    vars,
    clues: contract.clues === false ? [] : [...state.clues],
    inventory: contract.inventory === false ? [] : [...state.inventory],
  };
}

// Seed the next chapter by REWRITING a clone of its Story (never the original):
//  - variable defaults <- carried values   (engine initState reads these)
//  - resource starts    <- carried values   (so a time-driven survival meter continues, not resets)
//  - carried clues/items -> prepended start-node entryEffects (engine has no initial-clue field)
//  - deadline           <- min(chapter deadline, projected game horizon)
// FINDING (ENGINE-ASSESSMENT): the engine has no public "construct with carried state" seam; this
// Story-rewrite is a clean public-API workaround, but native carried-state seeding would be simpler.
export function seedChapterStory(
  story: Story,
  carry: CarriedState,
  gameElapsedMinutes: number,
  gameDeadlineMinutes?: number,
): Story {
  const s: Story = JSON.parse(JSON.stringify(story)) as Story;

  for (const v of s.variables) {
    if (Object.prototype.hasOwnProperty.call(carry.vars, v.name)) v.default = carry.vars[v.name];
  }
  for (const r of s.resources ?? []) {
    if (Object.prototype.hasOwnProperty.call(carry.vars, r.id)) r.start = Number(carry.vars[r.id]);
  }

  const start = s.nodes.find((n) => n.id === s.startNodeId);
  if (start) {
    const seedEffects: Effect[] = [
      ...carry.clues.map((c): Effect => ({ field: 'clues', op: 'add_clue', value: c })),
      ...carry.inventory.map((i): Effect => ({ field: 'inventory', op: 'add_item', value: i })),
    ];
    start.entryEffects = [...seedEffects, ...(start.entryEffects ?? [])];
  }

  if (gameDeadlineMinutes !== undefined) {
    const chapterStart = parseTime(s.startTime);
    const projected = chapterStart + Math.max(0, gameDeadlineMinutes - gameElapsedMinutes);
    const eff = Math.max(chapterStart, Math.min(parseTime(s.deadline), projected));
    s.deadline = minutesToClock(eff);
  }

  return s;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run carry`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/experiments/sump-line/carry.ts src/experiments/sump-line/carry.test.ts
git commit -m "feat(experiment): cross-chapter carry extraction + Story-rewrite seeding"
```

---

### Task 3: Transition resolution

**Files:**
- Create: `src/experiments/sump-line/transitions.ts`
- Test: `src/experiments/sump-line/transitions.test.ts`

**Interfaces:**
- Consumes: `evaluateConditions`, `WorldState` (engine); `Chapter` (Task 1).
- Produces: `pickNextChapter(chapter: Chapter, finalState: WorldState, endingId: string): string | undefined`.

- [ ] **Step 1: Write the failing test `src/experiments/sump-line/transitions.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { pickNextChapter } from './transitions';
import type { Chapter } from './types';
import type { WorldState } from '../../engine';

const ch: Chapter = {
  id: 'a', title: 'A', story: {} as never, transitions: [
    { when: { endingId: 'bad', conditions: [{ field: 'x', op: 'gte', value: '5' }] }, goTo: 'fail' },
    { when: { conditions: [{ field: 'warmth', op: 'lte', value: '2' }] }, goTo: 'cold' },
    { when: {}, goTo: 'warm' }, // catch-all
  ],
};
const state = (vars: Record<string, number>): WorldState => ({
  time: 0, location: 'L', clues: [], inventory: [], visited: [], completedEvents: [], vars,
});

describe('pickNextChapter', () => {
  it('matches on endingId AND conditions', () => {
    expect(pickNextChapter(ch, state({ x: 9, warmth: 4 }), 'bad')).toBe('fail');
  });
  it('skips a rule whose endingId does not match even if conditions hold', () => {
    expect(pickNextChapter(ch, state({ x: 9, warmth: 4 }), 'good')).toBe('warm');
  });
  it('matches a conditions-only rule', () => {
    expect(pickNextChapter(ch, state({ x: 0, warmth: 1 }), 'good')).toBe('cold');
  });
  it('falls through to the catch-all', () => {
    expect(pickNextChapter(ch, state({ x: 0, warmth: 4 }), 'good')).toBe('warm');
  });
  it('returns undefined when nothing matches', () => {
    const noCatch: Chapter = { ...ch, transitions: [{ when: { endingId: 'never' }, goTo: 'x' }] };
    expect(pickNextChapter(noCatch, state({}), 'good')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run transitions`
Expected: FAIL — cannot find module `./transitions`.

- [ ] **Step 3: Create `src/experiments/sump-line/transitions.ts`**

```ts
import { evaluateConditions } from '../../engine';
import type { WorldState } from '../../engine';
import type { Chapter } from './types';

export function pickNextChapter(chapter: Chapter, finalState: WorldState, endingId: string): string | undefined {
  for (const t of chapter.transitions) {
    if (t.when.endingId !== undefined && t.when.endingId !== endingId) continue;
    if (t.when.conditions && !evaluateConditions(t.when.conditions, finalState)) continue;
    return t.goTo;
  }
  return undefined;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run transitions`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/experiments/sump-line/transitions.ts src/experiments/sump-line/transitions.test.ts
git commit -m "feat(experiment): chapter transition resolution"
```

---

### Task 4: GameRunner orchestration

**Files:**
- Create: `src/experiments/sump-line/GameRunner.ts`
- Test: `src/experiments/sump-line/GameRunner.test.ts`

**Interfaces:**
- Consumes: `GameEngine`, `parseTime`, `Story` (engine); `extractCarry`, `seedChapterStory` (Task 2); `pickNextChapter` (Task 3); `Game`, `Chapter`, `CarriedState`, `GameSnapshot`, `GameRunnerView` (Task 1); `exampleGame` (Task 1).
- Produces: `class GameRunner` with `constructor(game: Game)`, `start(): GameRunnerView`, `view(): GameRunnerView`, `choose(choiceId: string): GameRunnerView`, `snapshot(): GameSnapshot`, `restore(snap: GameSnapshot): void`.

- [ ] **Step 1: Write the failing test `src/experiments/sump-line/GameRunner.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { GameRunner } from './GameRunner';
import { exampleGame } from './exampleGame';

describe('GameRunner — end to end on the synthetic game', () => {
  it('routes ch1 -> ch2a (warm) -> ch3, carrying warmth, to a game ending', () => {
    const g = new GameRunner(exampleGame);
    expect(g.view().chapterId).toBe('ch1');
    g.choose('fast');           // +30 min: warmth 4 -> 3 (1 step). c1 ends -> warmth 3 > 2 -> ch2a
    expect(g.view().chapterId).toBe('ch2a');
    g.choose('on');             // +30 min in ch2a: warmth 3 -> 2
    expect(g.view().chapterId).toBe('ch3');
    const v = g.choose('climb'); // ch3 game ending
    expect(v.gameOver).toBe(true);
    expect(v.finalEndingId).toBe('survived'); // warmth still > 0
  });

  it('routes ch1 -> ch2b (cold) when warmth drops to <= 2, and can freeze by ch3', () => {
    const g = new GameRunner(exampleGame);
    g.choose('slow');           // +90 min: warmth 4 -> 1 (3 steps) -> <= 2 -> ch2b
    expect(g.view().chapterId).toBe('ch2b');
    g.choose('on');             // +40 min @ 20/step: warmth 1 -> 0 (2 steps) -> frozen_flag set
    expect(g.view().chapterId).toBe('ch3');
    const v = g.choose('climb');
    expect(v.gameOver).toBe(true);
    expect(v.finalEndingId).toBe('frozen'); // warmth hit 0
  });

  it('accumulates the game clock across chapters', () => {
    const g = new GameRunner(exampleGame);
    g.choose('fast');  // 30
    g.choose('on');    // 30
    g.choose('climb'); // 20
    expect(g.view().gameElapsedMinutes).toBe(80);
  });

  it('snapshot/restore round-trips mid-game', () => {
    const g = new GameRunner(exampleGame);
    g.choose('fast'); // now in ch2a
    const snap = g.snapshot();
    const g2 = new GameRunner(exampleGame);
    g2.restore(snap);
    expect(g2.view().chapterId).toBe('ch2a');
    const v = g2.choose('on');
    expect(v.chapterId).toBe('ch3');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run GameRunner`
Expected: FAIL — cannot find module `./GameRunner`.

- [ ] **Step 3: Create `src/experiments/sump-line/GameRunner.ts`**

```ts
import { GameEngine, parseTime } from '../../engine';
import type { Game, Chapter, CarriedState, GameSnapshot, GameRunnerView } from './types';
import { extractCarry, seedChapterStory } from './carry';
import { pickNextChapter } from './transitions';

const EMPTY_CARRY: CarriedState = { vars: {}, clues: [], inventory: [] };
const MAX_TRANSITIONS = 1000; // runaway-cycle guard

export class GameRunner {
  private game: Game;
  private engine!: GameEngine;
  private currentChapterId = '';
  private carriedIn: CarriedState = EMPTY_CARRY;
  private gameElapsedMinutes = 0;
  private gameOver = false;
  private finalEndingId?: string;
  private transitionCount = 0;

  constructor(game: Game) {
    this.game = game;
    this.startChapter(game.startChapterId, EMPTY_CARRY);
  }

  private chapter(id: string): Chapter {
    const c = this.game.chapters.find((x) => x.id === id);
    if (!c) throw new Error(`Unknown chapter: ${id}`);
    return c;
  }

  private startChapter(chapterId: string, carry: CarriedState): void {
    const ch = this.chapter(chapterId);
    this.currentChapterId = chapterId;
    this.carriedIn = carry;
    const seeded = seedChapterStory(ch.story, carry, this.gameElapsedMinutes, this.game.gameDeadlineMinutes);
    this.engine = new GameEngine(seeded);
    this.settle();
  }

  // If the current chapter has ended, bank its elapsed time and transition (recursively).
  private settle(): void {
    const v = this.engine.view();
    if (!v.endingReached || this.gameOver) return;
    const ch = this.chapter(this.currentChapterId);
    this.gameElapsedMinutes += v.state.time - parseTime(ch.story.startTime);
    if (ch.gameEnding) {
      this.gameOver = true;
      this.finalEndingId = v.endingReached.id;
      return;
    }
    if (++this.transitionCount > MAX_TRANSITIONS) {
      throw new Error(`Transition limit exceeded near chapter ${this.currentChapterId} (cycle?)`);
    }
    const carry = extractCarry(v.state, this.game.carry);
    const next = pickNextChapter(ch, v.state, v.endingReached.id);
    if (!next) { this.gameOver = true; this.finalEndingId = v.endingReached.id; return; }
    this.startChapter(next, carry);
  }

  start(): GameRunnerView { return this.view(); }

  view(): GameRunnerView {
    const v = this.engine.view();
    const ch = this.chapter(this.currentChapterId);
    return {
      ...v,
      chapterId: this.currentChapterId,
      chapterTitle: ch.title,
      gameElapsedMinutes: this.gameElapsedMinutes,
      gameOver: this.gameOver,
      finalEndingId: this.finalEndingId,
    };
  }

  choose(choiceId: string): GameRunnerView {
    if (this.gameOver) return this.view();
    this.engine.choose(choiceId);
    this.settle();
    return this.view();
  }

  snapshot(): GameSnapshot {
    return {
      gameId: this.game.id,
      currentChapterId: this.currentChapterId,
      gameElapsedMinutes: this.gameElapsedMinutes,
      carriedIn: JSON.parse(JSON.stringify(this.carriedIn)) as CarriedState,
      chapter: this.engine.snapshot(),
    };
  }

  // Restore expects a snapshot taken DURING play (no pending un-transitioned ending).
  // FINDING (ENGINE-ASSESSMENT): the engine snapshots one chapter; the game snapshot wraps it with
  // chapter id + game clock + the carry that seeded the chapter.
  restore(snap: GameSnapshot): void {
    if (snap.gameId !== this.game.id) throw new Error(`Snapshot is for game ${snap.gameId}, not ${this.game.id}`);
    this.gameElapsedMinutes = snap.gameElapsedMinutes;
    this.currentChapterId = snap.currentChapterId;
    this.carriedIn = snap.carriedIn;
    this.gameOver = false;
    this.finalEndingId = undefined;
    const ch = this.chapter(snap.currentChapterId);
    const seeded = seedChapterStory(ch.story, snap.carriedIn, snap.gameElapsedMinutes, this.game.gameDeadlineMinutes);
    this.engine = new GameEngine(seeded);
    this.engine.restore(snap.chapter);
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run GameRunner`
Expected: PASS (routing both ways, clock accumulation, snapshot/restore).

- [ ] **Step 5: Full suite gate**

Run: `npx vitest run`
Expected: all green (engine's 157 + the experiment's new tests).

- [ ] **Step 6: Commit**

```bash
git add src/experiments/sump-line/GameRunner.ts src/experiments/sump-line/GameRunner.test.ts
git commit -m "feat(experiment): GameRunner orchestration (transitions, carry, game clock, save)"
```

---

### Task 5: Game-graph linter (`lintGame`)

**Files:**
- Create: `src/experiments/sump-line/lintGame.ts`
- Test: `src/experiments/sump-line/lintGame.test.ts`

**Interfaces:**
- Consumes: `lintStory`, `LintIssue` (engine); `Game` (Task 1); `exampleGame` (Task 1).
- Produces: `lintGame(game: Game): { ok: boolean; errors: LintIssue[]; warnings: LintIssue[] }`.

- [ ] **Step 1: Write the failing test `src/experiments/sump-line/lintGame.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { lintGame } from './lintGame';
import { exampleGame } from './exampleGame';
import type { Game } from './types';

function clone(g: Game): Game { return JSON.parse(JSON.stringify(g)) as Game; }

describe('lintGame', () => {
  it('passes the well-formed example game', () => {
    const r = lintGame(exampleGame);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });
  it('flags a transition pointing at a missing chapter', () => {
    const g = clone(exampleGame);
    g.chapters[0].transitions[0].goTo = 'ghost';
    expect(lintGame(g).errors.some((e) => e.code === 'GAME_BROKEN_TRANSITION')).toBe(true);
  });
  it('flags a non-game-ending chapter with no catch-all transition', () => {
    const g = clone(exampleGame);
    g.chapters[1].transitions = [{ when: { endingId: 'never' }, goTo: 'ch3' }]; // ch2a no catch-all
    expect(lintGame(g).errors.some((e) => e.code === 'GAME_NO_CATCHALL')).toBe(true);
  });
  it('flags a missing start chapter', () => {
    const g = clone(exampleGame);
    g.startChapterId = 'nope';
    expect(lintGame(g).errors.some((e) => e.code === 'GAME_NO_START')).toBe(true);
  });
  it('flags when no game-ending chapter is reachable', () => {
    const g = clone(exampleGame);
    g.chapters[3].gameEnding = false;
    g.chapters[3].transitions = [{ when: {}, goTo: 'ch1' }]; // ch3 now loops back, never ends
    expect(lintGame(g).errors.some((e) => e.code === 'GAME_NO_REACHABLE_ENDING')).toBe(true);
  });
  it('warns on an orphan chapter', () => {
    const g = clone(exampleGame);
    g.chapters.push({ id: 'orphan', title: 'O', story: g.chapters[0].story, gameEnding: true, transitions: [] });
    expect(lintGame(g).warnings.some((w) => w.code === 'GAME_ORPHAN_CHAPTER')).toBe(true);
  });
  it('surfaces a per-chapter lintStory error', () => {
    const g = clone(exampleGame);
    g.chapters[0].story.nodes[0].choices[0].destination = 'nowhere'; // broken link inside a chapter
    expect(lintGame(g).errors.some((e) => e.code === 'GAME_CHAPTER_LINT')).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lintGame`
Expected: FAIL — cannot find module `./lintGame`.

- [ ] **Step 3: Create `src/experiments/sump-line/lintGame.ts`**

```ts
import { lintStory } from '../../engine';
import type { LintIssue } from '../../engine';
import type { Game } from './types';

export function lintGame(game: Game): { ok: boolean; errors: LintIssue[]; warnings: LintIssue[] } {
  const errors: LintIssue[] = [];
  const warnings: LintIssue[] = [];
  const ids = new Set(game.chapters.map((c) => c.id));

  if (!ids.has(game.startChapterId)) {
    errors.push({ level: 'error', code: 'GAME_NO_START', message: `startChapterId ${game.startChapterId} is not a chapter` });
  }

  // structural per-chapter checks
  for (const ch of game.chapters) {
    for (const t of ch.transitions) {
      if (!ids.has(t.goTo)) {
        errors.push({ level: 'error', code: 'GAME_BROKEN_TRANSITION', message: `chapter ${ch.id} -> missing chapter ${t.goTo}`, where: ch.id });
      }
    }
    if (!ch.gameEnding) {
      const hasCatchAll = ch.transitions.some((t) => t.when.endingId === undefined && !t.when.conditions);
      if (!hasCatchAll) {
        errors.push({ level: 'error', code: 'GAME_NO_CATCHALL', message: `non-game-ending chapter ${ch.id} has no catch-all transition; some end-state could have no next chapter`, where: ch.id });
      }
    }
    const r = lintStory(ch.story);
    for (const e of r.errors) {
      errors.push({ level: 'error', code: 'GAME_CHAPTER_LINT', message: `chapter ${ch.id}: [${e.code}] ${e.message}`, where: ch.id });
    }
  }

  // reachability from start
  const reachable = new Set<string>();
  const stack = ids.has(game.startChapterId) ? [game.startChapterId] : [];
  while (stack.length) {
    const id = stack.pop()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    const ch = game.chapters.find((c) => c.id === id);
    if (ch) for (const t of ch.transitions) if (ids.has(t.goTo)) stack.push(t.goTo);
  }

  const reachableEnding = game.chapters.some((c) => reachable.has(c.id) && c.gameEnding);
  if (!reachableEnding) {
    errors.push({ level: 'error', code: 'GAME_NO_REACHABLE_ENDING', message: 'no game-ending chapter is reachable from the start chapter' });
  }

  for (const ch of game.chapters) {
    if (!reachable.has(ch.id)) {
      warnings.push({ level: 'warning', code: 'GAME_ORPHAN_CHAPTER', message: `chapter ${ch.id} is unreachable from the start chapter`, where: ch.id });
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run lintGame`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/experiments/sump-line/lintGame.ts src/experiments/sump-line/lintGame.test.ts
git commit -m "feat(experiment): game-graph linter (reachability, catch-all, per-chapter lint)"
```

---

### Task 6: Public barrel, full gates, and the engine-assessment report

**Files:**
- Create: `src/experiments/sump-line/index.ts`
- Create: `src/experiments/sump-line/ENGINE-ASSESSMENT.md`
- Test: (none new — final gate runs the whole suite + tsc + build)

**Interfaces:**
- Consumes: all prior modules.
- Produces: `src/experiments/sump-line/index.ts` re-exporting the container's public surface.

- [ ] **Step 1: Create `src/experiments/sump-line/index.ts`**

```ts
export * from './types';
export * from './carry';
export * from './transitions';
export * from './GameRunner';
export * from './lintGame';
export { exampleGame } from './exampleGame';
```

- [ ] **Step 2: Create `src/experiments/sump-line/ENGINE-ASSESSMENT.md`**

```markdown
# Engine Assessment — Cave Multi-Chapter Experiment

> Living log. Each entry: **what we wanted**, **what the engine gave us**, **the workaround**, a
> **verdict** (free / workaround-clean / workaround-ugly / impossible), and a **recommended engine
> change** with a rough size. The engine (`src/engine/`, v1.3) is frozen; everything here is a finding,
> not a fix. Summary + prioritized shortlist live at the bottom.

## Findings (container / E1)

### F1 — Seeding a chapter with carried state
- **Wanted:** start a chapter's `GameEngine` from the previous chapter's accumulated state (vars,
  resources, clues, inventory).
- **Engine gave us:** `GameEngine` always builds its initial state from the `Story` (`initState`): vars
  from `variable.default`, resources from `resource.start`, and `clues`/`inventory` always empty. No
  public "construct with this WorldState" seam.
- **Workaround:** `seedChapterStory` clones the chapter's `Story` and rewrites `variable.default` and
  `resource.start` from carried values, and prepends `add_clue`/`add_item` entry effects to the start
  node for carried clues/items.
- **Verdict:** workaround-clean (vars/resources) + workaround-ok (clues/items via entry effects).
- **Recommended change (small):** a `GameEngine` option / factory that accepts an initial `WorldState`
  (or a `Story.seedState`), so carried state needs no Story rewriting.

### F2 — Game-level clock / survival horizon
- **Wanted:** a slow survival burn and an overall rescue deadline that span the whole multi-chapter game.
- **Engine gave us:** one clock per `Story` (minutes from `startTime` to one `deadline`); time-driven
  resources recompute from the *current* chapter's clock.
- **Workaround:** the container keeps `gameElapsedMinutes` (sum of chapter durations), rebases each
  carried resource's `start` on entry (so the burn continues), and projects the game deadline onto each
  chapter's `deadline` (`min(chapter deadline, startTime + remaining)`).
- **Verdict:** workaround-clean.
- **Recommended change (medium):** native game-vs-chapter time — a game clock that chapters inherit, and
  resources that persist across chapters. (This is the `time-gating-flexibility` generalization; the
  experiment now has its concrete shape.)

### F3 — Game-level save
- **Wanted:** cross-session resume of a multi-chapter game.
- **Engine gave us:** `snapshot`/`restore` of a single chapter (`EngineSnapshot`).
- **Workaround:** `GameSnapshot` wraps the chapter snapshot with `currentChapterId`, `gameElapsedMinutes`,
  and the carry that seeded the chapter.
- **Verdict:** workaround-clean.
- **Recommended change (small):** none required; the wrapper is fine. Revisit if/when game structure
  becomes native.

## Summary & prioritized shortlist
_(Filled in after the E2 slice — once we've authored real chapters and seen which findings actually
bite. Current lead candidate: F2, native game-vs-chapter time + resource persistence.)_
```

- [ ] **Step 3: Final gates — typecheck, build, full suite**

Run: `npx tsc --noEmit && npx vite build && npx vitest run`
Expected: tsc clean; build clean; all tests pass (engine's 157 + the experiment's). Confirm nothing under `src/engine/` changed: `git diff --stat 9f8873b -- src/engine` should show no engine source files modified by this branch beyond v1.3 (i.e., this plan adds only `src/experiments/**`).

- [ ] **Step 4: Commit**

```bash
git add src/experiments/sump-line/index.ts src/experiments/sump-line/ENGINE-ASSESSMENT.md
git commit -m "feat(experiment): container barrel + engine-assessment findings log"
```

---

## Self-Review

**Spec coverage (vs `2026-06-22-cave-experiment-design.md`):**
- §2 engine frozen / containerized / public-API-only → Global Constraints + the `git diff` check in Task 6. ✓
- §4 Chapter = Story, Game, transitions, GameRunner → Tasks 1, 4. ✓
- §5 nested clock: game clock via orchestration, resource-start rebasing, projected deadline → Task 2 (`seedChapterStory`) + Task 4 (`gameElapsedMinutes`). ✓
- §6 carried-state contract (vars/resources/clues/inventory carry; clock/location/visited/events reset) → Task 2 `extractCarry`/`seedChapterStory` (reset is implicit: a fresh `GameEngine` on the seeded story starts time/location/visited/events clean). ✓
- §7 verification: per-chapter `lintStory` + game-graph checks (reachability, catch-all exhaustiveness, game-ending reachability, orphans) → Task 5. Per-chapter `walkStateSpace` is exercised in the E2 slice plan (each authored chapter), noted there; E1's synthetic chapters are trivially bounded. ✓ (documented boundary)
- §8 save/resume → Task 4 `snapshot`/`restore` + `GameSnapshot`. ✓
- §9 ENGINE-ASSESSMENT.md co-deliverable → Task 6, seeded with F1-F3 (the known findings). ✓
- §11 build order: container (this plan) → cave slice (separate E2 plan). ✓

**Placeholder scan:** no TBD/TODO in code steps; every code step is complete. The ENGINE-ASSESSMENT summary is intentionally "filled after E2" (it depends on authoring real chapters) — that is a real sequencing note, not a code placeholder.

**Type consistency:** `Game`/`Chapter`/`ChapterTransition`/`CarryContract`/`CarriedState`/`GameSnapshot`/`GameRunnerView` (Task 1) are used identically in Tasks 2-6; `extractCarry(state, contract)→CarriedState` and `seedChapterStory(story, carry, gameElapsed, gameDeadline?)→Story` (Task 2) are consumed verbatim in Task 4; `pickNextChapter(chapter, finalState, endingId)→string|undefined` (Task 3) consumed in Task 4; `lintGame(game)→{ok,errors,warnings}` (Task 5) matches its test.

**Deferred-but-tracked (out of scope for E1, by design):** the cave content (E2 — separate plan), per-chapter `walkStateSpace` over authored chapters (E2), a carried-state-sanity lint (a richer cross-chapter check — candidate, noted not built), the player UI shell, and any engine change (frozen — recorded as findings).

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-23-cave-experiment-container.md`.
