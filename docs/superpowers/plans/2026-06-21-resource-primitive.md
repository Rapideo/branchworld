# Engine v1.3 — Numeric Clamping + Resource Primitive — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the engine enforce per-variable numeric bounds (clamping) and add an opt-in, bounded resource primitive with time-driven depletion and author-defined at-zero behavior, so chapters can model lamps/heat/heat-from-cops/fuel without breaking the state-space walker.

**Architecture:** Two new small pure modules — `bounds.ts` (a `BoundsMap` built once from the Story; a `clampValue` helper) and `resources.ts` (recompute time-driven resources from the clock + fire at-zero). `effects.ts` gains an optional `bounds` param and clamps `set`/`increment`/`decrement`. The `GameEngine` builds the bounds map at construction and threads it through every place effects apply; resource depletion + at-zero run in `enter()` where scheduled events already fire from world-time. Resources live in `WorldState.vars` as numbers, so they are usable in any condition/effect (and already appear in the debug panel for free).

**Tech Stack:** TypeScript 5 (strict), Vitest 2. Pure engine module under `src/engine/` — no React/DOM imports.

## Global Constraints

- `src/engine/**` stays pure logic: no React, Vite, DOM, or UI imports.
- World state is **immutable**: every function returns new `WorldState`, never mutates input.
- **Opt-in & non-breaking:** a Story with no `min`/`max` and no `resources` must behave exactly as today. The two shipped chapters (`praterLine`, `sampleStory`) declare neither and must be byte-for-byte unaffected — the existing 139 tests stay green at every task.
- Time is engine-derived: the only clock source is `WorldState.time`, seeded from `Story.startTime`, advanced only by `add_minutes`. Time-driven resources are a pure function of `time` (no new walker dimension).
- Reserved `WorldState` fields are unchanged (`time, location, clues, inventory, visited, completedEvents, vars`). Resources are stored in `vars`. No new `WorldState` field is added.
- Tests co-located as `src/engine/<module>.test.ts`. Every task ends with `npx vitest run` green and a Conventional-Commits commit.
- v1 scope (YAGNI): depletion is **time-driven only** (`everyMinutes`/`amount`); at-zero supports **`ending` and `setFlag`** only. Deferred to a later version (note in code comments, do NOT build): per-node depletion, at-zero arbitrary `effect`, resource regeneration via negative drain, the player meter UI, and the unified pressure-systems model.

---

### Task 1: `bounds.ts` + clamping in `effects.ts`

**Files:**
- Create: `src/engine/bounds.ts`
- Create: `src/engine/bounds.test.ts`
- Modify: `src/engine/types.ts` (add `min?`/`max?` to `VariableDef`)
- Modify: `src/engine/effects.ts` (optional `bounds` param + clamp)
- Modify: `src/engine/effects.test.ts` (add clamping cases; existing cases unchanged)

**Interfaces:**
- Produces: `interface Bound { min?: number; max?: number }`, `type BoundsMap = Record<string, Bound>`, `clampValue(n: number, b?: Bound): number`, `buildBounds(story: Story): BoundsMap`.
- Produces (changed): `applyEffect(s, e, bounds?: BoundsMap): WorldState`, `applyEffects(s, es, bounds?: BoundsMap): WorldState`.

- [ ] **Step 1: Add bound fields to `VariableDef` in `src/engine/types.ts`**

Replace the `VariableDef` interface (currently ends with `label?: string;`) with:

```ts
export interface VariableDef {
  name: string;
  type: 'boolean' | 'number' | 'string';
  default: Primitive;
  purpose: string;              // single semantic meaning
  label?: string;
  min?: number;                 // optional numeric lower bound (clamped by the engine)
  max?: number;                 // optional numeric upper bound (clamped by the engine)
}
```

- [ ] **Step 2: Write the failing test `src/engine/bounds.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { clampValue, buildBounds } from './bounds';
import type { Story } from './types';

describe('clampValue', () => {
  it('clamps within min/max', () => {
    expect(clampValue(7, { min: 0, max: 4 })).toBe(4);
    expect(clampValue(-3, { min: 0, max: 4 })).toBe(0);
    expect(clampValue(2, { min: 0, max: 4 })).toBe(2);
  });
  it('honors one-sided bounds and no bound', () => {
    expect(clampValue(9, { max: 5 })).toBe(5);
    expect(clampValue(-9, { min: -2 })).toBe(-2);
    expect(clampValue(100, undefined)).toBe(100);
  });
});

describe('buildBounds', () => {
  it('collects variable and resource bounds', () => {
    const story = {
      id: 'g', title: 'g', startNodeId: 'n', startTime: '15:00', deadline: '16:00', startLocation: 'L',
      variables: [
        { name: 'trust', type: 'number', default: 0, purpose: 't', min: 0, max: 4 },
        { name: 'free', type: 'number', default: 0, purpose: 'f' },
      ],
      nodes: [], locations: [], events: [], endings: [],
      resources: [{ id: 'lamp', min: 0, max: 4, start: 4 }],
    } as unknown as Story;
    const b = buildBounds(story);
    expect(b.trust).toEqual({ min: 0, max: 4 });
    expect(b.lamp).toEqual({ min: 0, max: 4 });
    expect(b.free).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run bounds`
Expected: FAIL — cannot find module `./bounds`.

- [ ] **Step 4: Create `src/engine/bounds.ts`**

```ts
import type { Story } from './types';

export interface Bound {
  min?: number;
  max?: number;
}

export type BoundsMap = Record<string, Bound>;

export function clampValue(n: number, b?: Bound): number {
  if (!b) return n;
  let v = n;
  if (b.min !== undefined) v = Math.max(b.min, v);
  if (b.max !== undefined) v = Math.min(b.max, v);
  return v;
}

export function buildBounds(story: Story): BoundsMap {
  const m: BoundsMap = {};
  for (const v of story.variables) {
    if (v.min !== undefined || v.max !== undefined) m[v.name] = { min: v.min, max: v.max };
  }
  for (const r of story.resources ?? []) {
    m[r.id] = { min: r.min, max: r.max };
  }
  return m;
}
```

> Note: `story.resources` is added to the `Story` type in Task 3. To keep Task 1 self-contained and compiling, add `resources?: Resource[]` to `Story` now is NOT required — `story.resources ?? []` compiles only once the field exists. Therefore **in this step also add the field stub to `Story`**: in `src/engine/types.ts`, add `resources?: Resource[];` to the `Story` interface and a minimal `export interface Resource { id: string; min: number; max: number; start: number; }` near `VariableDef` (Task 3 expands `Resource`). This keeps each task compiling on its own.

- [ ] **Step 5: Write the failing clamping test — append to `src/engine/effects.test.ts`**

Add inside the existing `describe('effects', ...)` block:

```ts
  it('clamps increment/decrement/set when bounds are supplied', () => {
    const bounds = { trust: { min: 0, max: 4 } };
    expect(applyEffect(base, { field: 'trust', op: 'increment', value: '10' }, bounds).vars.trust).toBe(4);
    const low = { ...base, vars: { ...base.vars, trust: 0 } };
    expect(applyEffect(low, { field: 'trust', op: 'decrement', value: '5' }, bounds).vars.trust).toBe(0);
    expect(applyEffect(base, { field: 'trust', op: 'set', value: '99' }, bounds).vars.trust).toBe(4);
  });
  it('does not clamp when no bound is supplied (back-compat)', () => {
    expect(applyEffect(base, { field: 'trust', op: 'increment', value: '10' }).vars.trust).toBe(11);
  });
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run effects`
Expected: FAIL — the new clamping case fails (no clamping yet); other cases pass.

- [ ] **Step 7: Add clamping to `src/engine/effects.ts`**

Add imports at the top:

```ts
import type { BoundsMap } from './bounds';
import { clampValue } from './bounds';
```

Replace the `set`/`increment`/`decrement` cases and both function signatures:

```ts
export function applyEffect(s: WorldState, e: Effect, bounds?: BoundsMap): WorldState {
  switch (e.op) {
    case 'set': {
      const v = coerce(e.value);
      const out = typeof v === 'number' ? clampValue(v, bounds?.[e.field]) : v;
      return { ...s, vars: { ...s.vars, [e.field]: out } };
    }
    case 'increment': {
      const v = num(s.vars[e.field]) + num(coerce(e.value ?? '1'));
      return { ...s, vars: { ...s.vars, [e.field]: clampValue(v, bounds?.[e.field]) } };
    }
    case 'decrement': {
      const v = num(s.vars[e.field]) - num(coerce(e.value ?? '1'));
      return { ...s, vars: { ...s.vars, [e.field]: clampValue(v, bounds?.[e.field]) } };
    }
    case 'add_clue':
      return { ...s, clues: uniqPush(s.clues, e.value ?? e.field) };
    case 'remove_clue':
      return { ...s, clues: s.clues.filter((x) => x !== (e.value ?? e.field)) };
    case 'add_item':
      return { ...s, inventory: uniqPush(s.inventory, e.value ?? e.field) };
    case 'remove_item':
      return { ...s, inventory: s.inventory.filter((x) => x !== (e.value ?? e.field)) };
    case 'change_location':
      return { ...s, location: e.value ?? s.location };
    case 'add_minutes':
      return { ...s, time: addMinutes(s.time, num(coerce(e.value))) };
    case 'mark_event_completed':
      return { ...s, completedEvents: uniqPush(s.completedEvents, e.value ?? e.field) };
    case 'mark_visited':
      return { ...s, visited: uniqPush(s.visited, e.value ?? e.field) };
    default:
      return s;
  }
}

export function applyEffects(s: WorldState, es: Effect[] | undefined, bounds?: BoundsMap): WorldState {
  if (!es) return s;
  return es.reduce((acc, e) => applyEffect(acc, e, bounds), s);
}
```

- [ ] **Step 8: Run the tests**

Run: `npx vitest run bounds effects`
Expected: PASS (all cases).

- [ ] **Step 9: Commit**

```bash
git add src/engine/bounds.ts src/engine/bounds.test.ts src/engine/effects.ts src/engine/effects.test.ts src/engine/types.ts
git commit -m "feat(engine): numeric clamping via VariableDef bounds + bounds map"
```

---

### Task 2: Thread bounds through the engine and scheduled events

**Files:**
- Modify: `src/engine/scheduledEvents.ts` (optional `bounds` param)
- Modify: `src/engine/engine.ts` (build bounds, pass everywhere)
- Test: `src/engine/engine.test.ts` (add a clamped-through-engine case)

**Interfaces:**
- Consumes: `buildBounds`, `BoundsMap` (Task 1); `applyEffects(…, bounds?)` (Task 1).
- Produces (changed): `checkScheduledEvents(s, story, bounds?: BoundsMap): EventCheckResult`.

- [ ] **Step 1: Write the failing test — append to `src/engine/engine.test.ts`**

Add a new `describe`:

```ts
import { GameEngine } from './engine';
import type { Story } from './types';

describe('GameEngine — clamping end-to-end', () => {
  function clampStory(): Story {
    return {
      id: 'c', title: 'c', startNodeId: 'a', startTime: '15:00', deadline: '16:00', startLocation: 'L',
      variables: [{ name: 'heat', type: 'number', default: 4, purpose: 'h', min: 0, max: 4 }],
      locations: [], events: [],
      nodes: [
        { id: 'a', title: 'A', body: 'a', choices: [
          { id: 'spike', label: 'spike', destination: 'b',
            effects: [{ field: 'heat', op: 'increment', value: '10' }] },
        ] },
        { id: 'b', title: 'B', body: 'b', resolvesEnding: true, choices: [] },
      ],
      endings: [{ id: 'd', name: 'D', summary: 'd', conditions: [], isDefault: true }],
    };
  }
  it('clamps a choice effect to the variable max', () => {
    const g = new GameEngine(clampStory());
    const v = g.choose('spike');
    expect(v.state.vars.heat).toBe(4); // 4 + 10 clamped to max 4
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run engine`
Expected: FAIL — `heat` is 14, not clamped (engine doesn't pass bounds yet).

- [ ] **Step 3: Add the `bounds` param to `src/engine/scheduledEvents.ts`**

```ts
import type { Story, WorldState } from './types';
import type { BoundsMap } from './bounds';
import { evaluateConditions } from './conditions';
import { applyEffects } from './effects';

export interface EventCheckResult {
  state: WorldState;
  routedNodeId?: string;
  log: string[];
}

export function checkScheduledEvents(s: WorldState, story: Story, bounds?: BoundsMap): EventCheckResult {
  let state = s;
  let routedNodeId: string | undefined;
  const log: string[] = [];

  for (const ev of story.events) {
    if (state.completedEvents.includes(ev.id)) continue;
    if (!evaluateConditions(ev.trigger, state)) continue;

    if (state.location === ev.eventLocation) {
      state = { ...state, completedEvents: [...state.completedEvents, ev.id] };
      if (!routedNodeId) routedNodeId = ev.ifPresentNode;
      log.push(`Event ${ev.id} fired (present) -> ${ev.ifPresentNode}`);
    } else {
      state = applyEffects(state, ev.ifAbsentEffects, bounds);
      state = { ...state, completedEvents: [...state.completedEvents, ev.id] };
      log.push(`Event ${ev.id} fired (absent); clue recoverable at ${ev.recoveryNodeId}`);
    }
  }

  return { state, routedNodeId, log };
}
```

- [ ] **Step 4: Wire bounds into `src/engine/engine.ts`**

Add imports:

```ts
import { buildBounds, type BoundsMap } from './bounds';
```

Add a field and build it in the constructor (before `this.enter(...)`):

```ts
  private bounds: BoundsMap;
```
```ts
  constructor(story: Story) {
    this.story = story;
    this.state = initState(story);
    this.currentId = story.startNodeId;
    this.deadline = parseTime(story.deadline);
    this.bounds = buildBounds(story);
    this.enter(this.currentId);
  }
```

In `enter()`, pass bounds to entry effects and the event check:

```ts
    this.state = applyEffects(this.state, n.entryEffects, this.bounds);
```
```ts
    const res = checkScheduledEvents(this.state, this.story, this.bounds);
```

In `choose()`, pass bounds to the choice effects:

```ts
    this.state = applyEffects(this.state, choice.effects, this.bounds);
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run engine`
Expected: PASS, including the new clamping case.

- [ ] **Step 6: Run the full suite (back-compat gate)**

Run: `npx vitest run`
Expected: all tests pass (139 existing + new).

- [ ] **Step 7: Commit**

```bash
git add src/engine/scheduledEvents.ts src/engine/engine.ts src/engine/engine.test.ts
git commit -m "feat(engine): thread clamping bounds through engine + scheduled events"
```

---

### Task 3: Resource type + initState seeding

**Files:**
- Modify: `src/engine/types.ts` (full `Resource` shape + `Story.resources`)
- Modify: `src/engine/state.ts` (seed resource start values)
- Test: `src/engine/state.test.ts` (add seeding case)

**Interfaces:**
- Produces: `interface ResourceDepletion { everyMinutes: number; amount: number }`, `interface ResourceAtZero { ending?: string; setFlag?: string }`, full `interface Resource { id; label?; min; max; start; depletion?; atZero?; hidden? }`, `Story.resources?: Resource[]`.

- [ ] **Step 1: Replace the `Resource` stub in `src/engine/types.ts`**

Replace the minimal `Resource` added in Task 1 with the full shape (place near `VariableDef`):

```ts
export interface ResourceDepletion {
  everyMinutes: number;   // time-driven: lose `amount` every `everyMinutes` of clock
  amount: number;
}

export interface ResourceAtZero {
  ending?: string;        // resolve to this ending when the resource reaches min
  setFlag?: string;       // set this boolean var true when the resource reaches min
}

export interface Resource {
  id: string;             // stored in WorldState.vars[id] as a number
  label?: string;         // for an optional player meter (debug shows it for free)
  min: number;
  max: number;
  start: number;
  depletion?: ResourceDepletion;  // present => time-driven (recomputed); absent => choice-driven (stored)
  atZero?: ResourceAtZero;        // fires once-effectively when value reaches min
  hidden?: boolean;               // omit from the player meter (still in debug)
}
```

Confirm `Story` has `resources?: Resource[];` (added in Task 1 Step 4).

- [ ] **Step 2: Write the failing test — append to `src/engine/state.test.ts`**

```ts
it('seeds resource start values into vars', () => {
  const story = {
    id: 'g', title: 'g', startNodeId: 'n', startTime: '15:00', deadline: '16:00', startLocation: 'L',
    variables: [], nodes: [], locations: [], events: [], endings: [],
    resources: [{ id: 'lamp', min: 0, max: 4, start: 4 }, { id: 'cash', min: 0, max: 9, start: 2 }],
  } as unknown as import('./types').Story;
  const s = initState(story);
  expect(s.vars.lamp).toBe(4);
  expect(s.vars.cash).toBe(2);
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run state`
Expected: FAIL — `s.vars.lamp` is undefined.

- [ ] **Step 4: Seed resources in `src/engine/state.ts`**

In `initState`, after the variables loop and before the return:

```ts
  for (const r of story.resources ?? []) vars[r.id] = r.start;
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run state`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/state.ts src/engine/state.test.ts
git commit -m "feat(engine): Resource type + initState seeding"
```

---

### Task 4: Resource depletion + at-zero (`resources.ts`) + engine integration

**Files:**
- Create: `src/engine/resources.ts`
- Create: `src/engine/resources.test.ts`
- Modify: `src/engine/engine.ts` (startTime field; run the resource step in `enter()`)
- Test: `src/engine/engine.test.ts` (a depleting-lamp fixture reaching the death ending)

**Interfaces:**
- Consumes: `clampValue` (Task 1); `Story`, `WorldState`, `Resource` (Task 3).
- Produces: `interface ResourceStepResult { state: WorldState; atZeroEndingId?: string; log: string[] }`, `applyResourceStep(s: WorldState, story: Story, startTime: number): ResourceStepResult`.

- [ ] **Step 1: Write the failing test `src/engine/resources.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { applyResourceStep } from './resources';
import type { Story, WorldState } from './types';

function lampStory(): Story {
  return {
    id: 'g', title: 'g', startNodeId: 'n', startTime: '15:00', deadline: '18:00', startLocation: 'L',
    variables: [{ name: 'dead', type: 'boolean', default: false, purpose: 'd' }],
    nodes: [], locations: [], events: [], endings: [],
    resources: [{
      id: 'lamp', min: 0, max: 4, start: 4,
      depletion: { everyMinutes: 30, amount: 1 },
      atZero: { ending: 'ending_dark', setFlag: 'dead' },
    }],
  } as unknown as Story;
}
const at = (time: number): WorldState => ({
  time, location: 'L', clues: [], inventory: [], visited: [], completedEvents: [], vars: { lamp: 4, dead: false },
});
const START = 900; // 15:00

describe('applyResourceStep — time-driven depletion', () => {
  it('recomputes the lamp from the clock', () => {
    expect(applyResourceStep(at(900), lampStory(), START).state.vars.lamp).toBe(4);   // 0 elapsed
    expect(applyResourceStep(at(960), lampStory(), START).state.vars.lamp).toBe(2);   // 60 min -> -2
    expect(applyResourceStep(at(1020), lampStory(), START).state.vars.lamp).toBe(0);  // 120 min -> clamp 0
  });
  it('fires at-zero: sets the flag and reports the ending', () => {
    const r = applyResourceStep(at(1020), lampStory(), START);
    expect(r.state.vars.dead).toBe(true);
    expect(r.atZeroEndingId).toBe('ending_dark');
  });
  it('does nothing for a story with no resources', () => {
    const none = { ...lampStory(), resources: [] } as unknown as Story;
    const s = at(1020);
    expect(applyResourceStep(s, none, START).state).toBe(s);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run resources`
Expected: FAIL — cannot find module `./resources`.

- [ ] **Step 3: Create `src/engine/resources.ts`**

```ts
import type { Story, WorldState } from './types';
import { clampValue } from './bounds';

export interface ResourceStepResult {
  state: WorldState;
  atZeroEndingId?: string;
  log: string[];
}

// Recompute time-driven resources from the clock, clamp choice-driven ones, and fire at-zero.
// Time-driven values are a pure function of `time`, so they add NO new walker dimension.
export function applyResourceStep(s: WorldState, story: Story, startTime: number): ResourceStepResult {
  const resources = story.resources ?? [];
  if (resources.length === 0) return { state: s, log: [] };

  const vars = { ...s.vars };
  let changed = false;
  let atZeroEndingId: string | undefined;
  const log: string[] = [];

  for (const r of resources) {
    const bound = { min: r.min, max: r.max };
    let value: number;
    if (r.depletion) {
      const steps = Math.floor((s.time - startTime) / r.depletion.everyMinutes);
      value = clampValue(r.start - r.depletion.amount * steps, bound);
    } else {
      value = clampValue(Number(vars[r.id] ?? r.start), bound);
    }
    if (vars[r.id] !== value) {
      vars[r.id] = value;
      changed = true;
    }
    if (value <= r.min && r.atZero) {
      if (r.atZero.setFlag && vars[r.atZero.setFlag] !== true) {
        vars[r.atZero.setFlag] = true;
        changed = true;
        log.push(`Resource ${r.id} hit ${r.min}: set ${r.atZero.setFlag}`);
      }
      if (r.atZero.ending && !atZeroEndingId) {
        atZeroEndingId = r.atZero.ending;
        log.push(`Resource ${r.id} hit ${r.min}: ending ${r.atZero.ending}`);
      }
    }
  }

  return { state: changed ? { ...s, vars } : s, atZeroEndingId, log };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run resources`
Expected: PASS.

- [ ] **Step 5: Integrate into `src/engine/engine.ts`**

Add imports:

```ts
import { applyResourceStep } from './resources';
```

Add a `startTime` field and set it in the constructor (next to `this.deadline`):

```ts
  private startTime: number;
```
```ts
    this.deadline = parseTime(story.deadline);
    this.startTime = parseTime(story.startTime);
    this.bounds = buildBounds(story);
```

In `enter()`, after the scheduled-events block and its reroute `return`, and BEFORE the existing ending check, insert the resource step:

```ts
    // Resource depletion + at-zero, after any clock advance is settled at this node.
    const rstep = applyResourceStep(this.state, this.story, this.startTime);
    this.state = rstep.state;
    if (rstep.log.length) this.log.push(...rstep.log);
    if (!this.ending && rstep.atZeroEndingId) {
      const e = this.story.endings.find((x) => x.id === rstep.atZeroEndingId);
      if (e) {
        this.ending = e;
        this.log.push(`Ending: ${e.id}`);
      }
    }
    if (!this.ending && (n.resolvesEnding || this.state.time >= this.deadline)) {
      this.ending = resolveEnding(this.state, this.story);
      if (this.ending) this.log.push(`Ending: ${this.ending.id}`);
    }
```

(The final `if (!this.ending && (n.resolvesEnding …))` block already exists — replace it in place so the resource step precedes it; do not duplicate it.)

- [ ] **Step 6: Write the failing engine fixture test — append to `src/engine/engine.test.ts`**

```ts
describe('GameEngine — resource at-zero ends the game', () => {
  function caveStory(): Story {
    return {
      id: 'cave', title: 'cave', startNodeId: 'crawl', startTime: '15:00', deadline: '20:00', startLocation: 'L',
      variables: [{ name: 'dead', type: 'boolean', default: false, purpose: 'd' }],
      locations: [],
      events: [],
      resources: [{
        id: 'lamp', min: 0, max: 4, start: 4,
        depletion: { everyMinutes: 30, amount: 1 },
        atZero: { ending: 'ending_dark', setFlag: 'dead' },
      }],
      nodes: [
        { id: 'crawl', title: 'Crawl', body: 'dark', choices: [
          { id: 'press', label: 'press on', destination: 'crawl2',
            effects: [{ field: 'time', op: 'add_minutes', value: '60' }] },
        ] },
        { id: 'crawl2', title: 'Crawl2', body: 'darker', choices: [
          { id: 'press2', label: 'press on', destination: 'surface',
            effects: [{ field: 'time', op: 'add_minutes', value: '90' }] },
        ] },
        { id: 'surface', title: 'Surface', body: 'daylight', resolvesEnding: true, choices: [] },
      ],
      endings: [
        { id: 'ending_dark', name: 'The Cave Keeps You', summary: 'lamp died', conditions: [{ field: 'dead', op: 'is_true' }] },
        { id: 'ending_out', name: 'Daylight', summary: 'made it', conditions: [], isDefault: true },
      ],
    } as unknown as Story;
  }
  it('lamp dies after 120 min -> dark ending, not the surface', () => {
    const g = new GameEngine(caveStory());
    g.choose('press');          // +60 -> 16:00, lamp 2
    const v = g.choose('press2'); // +90 -> 17:30, lamp 0 -> at-zero ending fires before surface resolves
    expect(v.endingReached?.id).toBe('ending_dark');
    expect(v.state.vars.dead).toBe(true);
  });
});
```

- [ ] **Step 7: Run the tests**

Run: `npx vitest run engine resources`
Expected: PASS, including the lamp-death case.

- [ ] **Step 8: Full suite gate**

Run: `npx vitest run`
Expected: all green.

- [ ] **Step 9: Commit**

```bash
git add src/engine/resources.ts src/engine/resources.test.ts src/engine/engine.ts src/engine/engine.test.ts
git commit -m "feat(engine): time-driven resource depletion + at-zero ending/flag"
```

---

### Task 5: Linter rules for resources + out-of-range warning

**Files:**
- Modify: `src/engine/linter.ts` (add `lintResources` and call it from `lintStory`)
- Test: `src/engine/linter.test.ts` (failing + passing cases per rule)

**Interfaces:**
- Consumes: `Story`, `LintIssue` (existing types); the existing `lintStory(story): LintResult` shape (`{ ok, errors, warnings }`, where `errors`/`warnings` are `LintIssue[]` and `ok === (errors.length === 0)`).
- Produces: `lintResources(story: Story): LintIssue[]` (each issue has `level: 'error' | 'warning'`).

- [ ] **Step 1: Write the failing test — append to `src/engine/linter.test.ts`**

```ts
import { lintStory } from './linter';
import type { Story } from './types';

function resStory(over: Partial<Story> = {}): Story {
  return {
    id: 'g', title: 'g', startNodeId: 'a', startTime: '15:00', deadline: '16:00', startLocation: 'L',
    variables: [{ name: 'dead', type: 'boolean', default: false, purpose: 'd' }],
    locations: [],
    events: [],
    nodes: [{ id: 'a', title: 'A', body: 'a', resolvesEnding: true, choices: [] }],
    endings: [
      { id: 'ending_dark', name: 'Dark', summary: 's', conditions: [{ field: 'dead', op: 'is_true' }] },
      { id: 'd', name: 'D', summary: 'd', conditions: [], isDefault: true },
    ],
    resources: [{ id: 'lamp', min: 0, max: 4, start: 4, depletion: { everyMinutes: 30, amount: 1 }, atZero: { ending: 'ending_dark', setFlag: 'dead' } }],
    ...over,
  } as unknown as Story;
}

describe('linter — resources', () => {
  it('passes a well-formed resource story', () => {
    const r = lintStory(resStory());
    expect(r.errors.filter((e) => e.code.startsWith('RESOURCE'))).toEqual([]);
  });
  it('flags start out of range', () => {
    const r = lintStory(resStory({ resources: [{ id: 'lamp', min: 0, max: 4, start: 9 }] as never }));
    expect(r.errors.some((e) => e.code === 'RESOURCE_START_OUT_OF_RANGE')).toBe(true);
  });
  it('flags min >= max', () => {
    const r = lintStory(resStory({ resources: [{ id: 'lamp', min: 4, max: 4, start: 4 }] as never }));
    expect(r.errors.some((e) => e.code === 'RESOURCE_BAD_RANGE')).toBe(true);
  });
  it('flags an at-zero ending that does not exist', () => {
    const r = lintStory(resStory({ resources: [{ id: 'lamp', min: 0, max: 4, start: 4, atZero: { ending: 'ghost' } }] as never }));
    expect(r.errors.some((e) => e.code === 'RESOURCE_ATZERO_ENDING_MISSING')).toBe(true);
  });
  it('flags a time-driven resource targeted by an effect', () => {
    const bad = resStory();
    bad.nodes[0].choices = [{ id: 'x', label: 'x', destination: 'a', effects: [{ field: 'lamp', op: 'increment', value: '1' }] }];
    expect(lintStory(bad).errors.some((e) => e.code === 'RESOURCE_TIME_DRIVEN_WRITTEN')).toBe(true);
  });
  it('warns on a set effect out of a variable bound', () => {
    const s = resStory();
    s.variables.push({ name: 'trust', type: 'number', default: 0, purpose: 't', min: 0, max: 4 } as never);
    s.nodes[0].choices = [{ id: 'x', label: 'x', destination: 'a', effects: [{ field: 'trust', op: 'set', value: '9' }] }];
    expect(lintStory(s).warnings.some((w) => w.code === 'VALUE_OUT_OF_BOUND')).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run linter`
Expected: FAIL — codes like `RESOURCE_START_OUT_OF_RANGE` are not produced.

- [ ] **Step 3: Add `lintResources` to `src/engine/linter.ts`**

Add this exported function (place near the other check functions):

```ts
export function lintResources(story: Story): LintIssue[] {
  const issues: LintIssue[] = [];
  const resources = story.resources ?? [];
  const varNames = new Set(story.variables.map((v) => v.name));
  const endingIds = new Set(story.endings.map((e) => e.id));
  const timeDriven = new Set(resources.filter((r) => r.depletion).map((r) => r.id));
  const resourceIds = new Set(resources.map((r) => r.id));

  for (const r of resources) {
    if (r.min >= r.max) {
      issues.push({ level: 'error', code: 'RESOURCE_BAD_RANGE', message: `Resource ${r.id}: min (${r.min}) must be < max (${r.max})`, where: r.id });
    }
    if (r.start < r.min || r.start > r.max) {
      issues.push({ level: 'error', code: 'RESOURCE_START_OUT_OF_RANGE', message: `Resource ${r.id}: start ${r.start} is outside [${r.min}, ${r.max}]`, where: r.id });
    }
    if (r.depletion && (r.depletion.everyMinutes <= 0 || r.depletion.amount <= 0)) {
      issues.push({ level: 'error', code: 'RESOURCE_BAD_DEPLETION', message: `Resource ${r.id}: depletion everyMinutes/amount must be > 0`, where: r.id });
    }
    if (varNames.has(r.id)) {
      issues.push({ level: 'error', code: 'RESOURCE_ID_COLLISION', message: `Resource ${r.id} collides with a declared variable name`, where: r.id });
    }
    if (r.atZero?.ending && !endingIds.has(r.atZero.ending)) {
      issues.push({ level: 'error', code: 'RESOURCE_ATZERO_ENDING_MISSING', message: `Resource ${r.id}: at-zero ending ${r.atZero.ending} does not exist`, where: r.id });
    }
    if (r.atZero?.setFlag && !varNames.has(r.atZero.setFlag)) {
      issues.push({ level: 'error', code: 'RESOURCE_ATZERO_FLAG_UNDECLARED', message: `Resource ${r.id}: at-zero flag ${r.atZero.setFlag} is not a declared variable`, where: r.id });
    }
  }

  // bounds map for the out-of-range warning (variables + resources)
  const boundOf: Record<string, { min?: number; max?: number }> = {};
  for (const v of story.variables) if (v.min !== undefined || v.max !== undefined) boundOf[v.name] = { min: v.min, max: v.max };
  for (const r of resources) boundOf[r.id] = { min: r.min, max: r.max };

  const scanEffects = (effects: { field: string; op: string; value?: string }[] | undefined, where: string) => {
    for (const e of effects ?? []) {
      if (timeDriven.has(e.field) && (e.op === 'set' || e.op === 'increment' || e.op === 'decrement')) {
        issues.push({ level: 'error', code: 'RESOURCE_TIME_DRIVEN_WRITTEN', message: `Effect writes time-driven resource ${e.field} (it is recomputed from the clock)`, where });
      }
      if (e.op === 'set' && boundOf[e.field] && e.value !== undefined && /^-?\d+(\.\d+)?$/.test(e.value)) {
        const n = Number(e.value);
        const b = boundOf[e.field];
        if ((b.min !== undefined && n < b.min) || (b.max !== undefined && n > b.max)) {
          issues.push({ level: 'warning', code: 'VALUE_OUT_OF_BOUND', message: `set ${e.field}=${n} is outside its bound [${b.min ?? '-inf'}, ${b.max ?? 'inf'}] (will be clamped)`, where });
        }
      }
    }
  };
  for (const n of story.nodes) {
    scanEffects(n.entryEffects, n.id);
    for (const c of n.choices ?? []) scanEffects(c.effects, `${n.id}:${c.id}`);
  }
  for (const ev of story.events) scanEffects(ev.ifAbsentEffects, ev.id);

  return issues;
}
```

- [ ] **Step 4: Call `lintResources` from `lintStory`**

In `lintStory`, after the existing checks build the `errors`/`warnings` arrays and before the final `return { ok: errors.length === 0, errors, warnings }`, merge the resource issues:

```ts
  for (const issue of lintResources(story)) {
    if (issue.level === 'error') errors.push(issue);
    else warnings.push(issue);
  }
```

(Adapt the variable names `errors`/`warnings` to the existing function's locals if they differ; the existing `lintStory` already accumulates `LintIssue[]` for each — push into those.)

- [ ] **Step 5: Run the tests**

Run: `npx vitest run linter`
Expected: PASS (all resource cases).

- [ ] **Step 6: Full suite gate**

Run: `npx vitest run`
Expected: all green (shipped chapters declare no resources, so `lintResources` is a no-op for them).

- [ ] **Step 7: Commit**

```bash
git add src/engine/linter.ts src/engine/linter.test.ts
git commit -m "feat(linter): resource validation + out-of-bound set warning"
```

---

### Task 6: Walker confirmation, exports, and documentation (doc-fidelity gate)

**Files:**
- Modify: `src/engine/index.ts` (export `bounds`, `resources`)
- Test: `src/engine/stateSpaceWalk.test.ts` (a resource fixture stays tractable + reaches the at-zero ending)
- Modify: `Product Requirements Document.md` (document clamping + resources so the contract matches the engine)
- Modify: `docs/superpowers/specs/2026-06-21-resource-primitive-design.md` (mark scope v1 as shipped: time-driven depletion + at-zero ending/flag; per-node + at-zero effect deferred)

**Interfaces:**
- Consumes: `walkStateSpace` (existing), `GameEngine` (existing).

- [ ] **Step 1: Export the new modules in `src/engine/index.ts`**

```ts
export * from './types';
export * from './time';
export * from './state';
export * from './bounds';
export * from './conditions';
export * from './effects';
export * from './resources';
export * from './endingResolver';
export * from './scheduledEvents';
export * from './engine';
export * from './linter';
```

- [ ] **Step 2: Write the failing walker test — append to `src/engine/stateSpaceWalk.test.ts`**

```ts
import { walkStateSpace } from './stateSpaceWalk';
import type { Story } from './types';

describe('walkStateSpace — resources stay tractable', () => {
  function caveStory(): Story {
    return {
      id: 'cave', title: 'cave', startNodeId: 'a', startTime: '15:00', deadline: '20:00', startLocation: 'L',
      variables: [{ name: 'dead', type: 'boolean', default: false, purpose: 'd' }],
      locations: [], events: [],
      resources: [{ id: 'lamp', min: 0, max: 4, start: 4, depletion: { everyMinutes: 30, amount: 1 }, atZero: { ending: 'ending_dark', setFlag: 'dead' } }],
      nodes: [
        { id: 'a', title: 'A', body: 'a', choices: [
          { id: 'slow', label: 'slow', destination: 'b', effects: [{ field: 'time', op: 'add_minutes', value: '150' }] },
          { id: 'fast', label: 'fast', destination: 'b', effects: [{ field: 'time', op: 'add_minutes', value: '30' }] },
        ] },
        { id: 'b', title: 'B', body: 'b', resolvesEnding: true, choices: [] },
      ],
      endings: [
        { id: 'ending_dark', name: 'Dark', summary: 's', conditions: [{ field: 'dead', op: 'is_true' }] },
        { id: 'ending_out', name: 'Out', summary: 'o', conditions: [], isDefault: true },
      ],
    } as unknown as Story;
  }
  it('walks without hitting the cap and reaches both endings', () => {
    const report = walkStateSpace(caveStory());
    expect(report.capHit).toBe(false);
    expect(report.softlocks).toEqual([]);
    expect(report.orphanEndings).toEqual([]); // dark (slow) + out (fast) both reachable
  });
});
```

- [ ] **Step 3: Run it to verify it passes**

Run: `npx vitest run stateSpaceWalk`
Expected: PASS (the time-driven lamp adds no dimension; both endings reachable).

- [ ] **Step 4: Document the feature in `Product Requirements Document.md`**

Find the data-model / engine-requirements region (the §10 / §19 data-model area) and add this subsection so the written contract matches the engine:

```markdown
### Numeric bounds & Resources (engine v1.3)

**Bounds.** A `VariableDef` may declare `min` and/or `max`. The engine clamps the result of every
`set`/`increment`/`decrement` into range. Variables without bounds are unclamped (back-compatible).
Authors should bound any numeric the walker must keep finite (trust, suspicion, heat).

**Resources (opt-in).** `Story.resources?: Resource[]`. A resource is a bounded number stored in world
state (usable in any condition/effect) with:
- `min`, `max`, `start`.
- optional `depletion: { everyMinutes, amount }` — **time-driven**: the value is recomputed from the
  clock as `clamp(start - amount * floor((time - startTime) / everyMinutes))`. Because it is a pure
  function of time, it adds no new state-space dimension. A time-driven resource must NOT be written by
  any effect (linted). A resource without `depletion` is **choice-driven**: changed only by effects, clamped.
- optional `atZero: { ending?, setFlag? }` — when the value reaches `min`, the engine resolves to
  `ending` (if not already ended) and/or sets `setFlag` true.
- optional `label`, `hidden` for an optional player meter.

Deferred (not in v1.3): per-node depletion, an arbitrary at-zero effect, regeneration via negative drain.
```

- [ ] **Step 5: Update the spec to record shipped scope**

In `docs/superpowers/specs/2026-06-21-resource-primitive-design.md`, change the Status line to note it is implemented in v1.3, and adjust §6 Non-goals to confirm per-node depletion and at-zero `effect` were deferred (already listed). No other edits needed.

- [ ] **Step 6: Final gates — typecheck, build, full suite**

Run: `npx tsc --noEmit && npx vite build && npx vitest run`
Expected: tsc clean; build clean; all tests pass (139 prior + new).

- [ ] **Step 7: Commit**

```bash
git add src/engine/index.ts src/engine/stateSpaceWalk.test.ts "Product Requirements Document.md" docs/superpowers/specs/2026-06-21-resource-primitive-design.md
git commit -m "feat(engine): export resources/bounds; walker + PRD doc for v1.3"
```

---

## Self-Review

**Spec coverage (vs `2026-06-21-resource-primitive-design.md`):**
- Part A clamping (add `min`/`max`, clamp in effects, thread through engine) → Tasks 1–2. ✓
- Part B resource primitive (type, initState seed, time-driven depletion, at-zero ending/flag, choice-driven) → Tasks 3–4. ✓
- Part C linter (resource sanity, out-of-range warning) → Task 5. ✓ (event-routing footgun lint was marked optional/candidate in the spec — deliberately deferred, noted here so it isn't lost.)
- Player/debug meter → resources live in `vars`, so the existing debug panel shows them with no work; the labeled player meter is deferred (Global Constraints), consistent with the engine-only scope of this plan. ✓
- Walker tractability confirmation → Task 6. ✓
- Doc fidelity (engine matches its documentation) → Task 6 Steps 4–5. ✓
- Non-goals (per-node, at-zero effect, regen, unified model) → enforced by Global Constraints. ✓

**Placeholder scan:** no TBD/TODO; every code step has full code and exact commands. ✓

**Type consistency:** `BoundsMap`/`Bound`/`clampValue`/`buildBounds` (Task 1) used identically in Tasks 2–5; `applyEffects(s, es, bounds?)` signature consistent across effects/scheduledEvents/engine; `Resource`/`ResourceDepletion`/`ResourceAtZero` (Task 3) match `resources.ts` (Task 4) and `lintResources` (Task 5); `applyResourceStep(s, story, startTime)` return `{ state, atZeroEndingId, log }` consumed verbatim in `engine.enter()`. ✓

**Deferred-but-tracked:** per-node depletion, at-zero `effect`, regeneration, player meter UI, the optional event-routing-footgun lint — all explicitly out of scope, recorded so nothing is silently dropped.
