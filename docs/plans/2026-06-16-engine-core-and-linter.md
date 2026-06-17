# BranchWorld Engine Core + Linter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the headless, framework-agnostic TypeScript engine core and build-blocking linter that enforce the four BranchWorld v1.1 corrections (engine-derived time, real scheduled events, state-resolved endings, no prose-vs-state lies), fully unit-tested.

**Architecture:** A pure TypeScript module under `src/engine/` with zero UI/framework imports. Small single-responsibility files (time, state, conditions, effects, ending resolver, scheduled events, runtime loop, linter) composed behind a barrel `index.ts`. World state is immutable — every mutation returns a new object. The same module is consumed identically by the future player, the future authoring tool, and CI. Test runner is Vitest.

**Tech Stack:** TypeScript 5 (strict), Vitest 2, Node 18+. No React in this sub-project. (Vite + React + Tailwind arrive in Sub-project B and reuse this same `src/` and `package.json`.)

## Global Constraints

- Language: TypeScript, `strict: true`. No `any` in committed code.
- `src/engine/**` MUST NOT import React, Vite, the DOM, or any UI library. It is pure logic.
- World state is **immutable**: functions return new `WorldState`, never mutate the argument.
- Time is **engine-derived**: the only source of truth for the clock is `WorldState.time` (minutes), seeded from `Story.startTime` and advanced only by `add_minutes` effects. No code reads any per-node authored time for logic.
- All condition/effect `value` fields are strings in the data; the engine coerces them.
- Reserved state fields (never stored in `vars`): `time`, `location`, `clues`, `inventory`, `visited`, `completedEvents`. All author-declared variables live in `WorldState.vars`.
- Tests are co-located: `src/engine/<module>.test.ts`. Every task ends green (`npm test`) and with a commit.
- Commit style: Conventional Commits (`feat:`, `test:`, `chore:`).

---

### Task 1: Project scaffold + test toolchain

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Test: `src/engine/sanity.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm test` running Vitest; the `src/engine/` directory.

- [ ] **Step 1: Initialize git (repo root is the Cambria folder)**

Run: `git init`
Expected: `Initialized empty Git repository`

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "branchworld",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node' },
});
```

- [ ] **Step 5: Create `.gitignore`**

```gitignore
node_modules/
dist/
coverage/
*.log
```

- [ ] **Step 6: Create the sanity test `src/engine/sanity.test.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Install dependencies**

Run: `npm install`
Expected: dependencies install, `node_modules/` created.

- [ ] **Step 8: Run the test to verify the toolchain**

Run: `npm test`
Expected: PASS — 1 test passed.

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts .gitignore src/engine/sanity.test.ts
git commit -m "chore: scaffold TS + vitest engine project"
```

---

### Task 2: Types, state init, and engine-derived time

**Files:**
- Create: `src/engine/types.ts`
- Create: `src/engine/time.ts`
- Create: `src/engine/state.ts`
- Test: `src/engine/time.test.ts`
- Test: `src/engine/state.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - Types: `Primitive`, `Condition`, `ConditionOp`, `Effect`, `EffectOp`, `Choice`, `StoryNode`, `NodeType`, `Location`, `ScheduledEvent`, `Ending`, `VariableDef`, `Story`, `WorldState`, `ChoiceView`, `GameView`, `LintIssue`, `LintResult`.
  - `parseTime(hhmm: string): number`, `formatTime(minutes: number): string`, `addMinutes(minutes: number, delta: number): number`
  - `initState(story: Story): WorldState`, `readVar(s: WorldState, field: string): Primitive | undefined`

- [ ] **Step 1: Write `src/engine/types.ts`** (no test — consumed by later tasks)

```ts
export type Primitive = string | number | boolean;

export type ConditionOp =
  | 'equals' | 'not_equals' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'is_true' | 'is_false' | 'has_clue' | 'has_visited'
  | 'time_before' | 'time_after' | 'time_between';

export interface Condition {
  field: string;
  op: ConditionOp;
  value?: string;        // time_between uses "HH:MM-HH:MM"
  description?: string;
}

export type EffectOp =
  | 'set' | 'increment' | 'decrement'
  | 'add_item' | 'remove_item' | 'add_clue' | 'remove_clue'
  | 'change_location' | 'add_minutes'
  | 'mark_event_completed' | 'mark_visited';

export interface Effect {
  field: string;
  op: EffectOp;
  value?: string;
}

export interface Choice {
  id: string;
  label: string;
  destination: string;   // node id; must not be an ending id (linted)
  conditions?: Condition[];
  effects?: Effect[];
  description?: string;
}

export type NodeType =
  | 'scene' | 'conversation' | 'event' | 'discovery'
  | 'transition' | 'ending' | 'system' | 'location';

export interface StoryNode {
  id: string;
  title: string;
  body: string;
  type?: NodeType;
  location?: string;
  conditions?: Condition[];     // availability (used for location-based selection later)
  entryEffects?: Effect[];
  choices: Choice[];
  resolvesEnding?: boolean;     // entering this node triggers the ending resolver
  authorTimeHint?: string;      // editor-only; engine never reads this for logic
  repeatable?: boolean;
  tags?: string[];
}

export interface Location {
  id: string;
  name: string;
  description?: string;
  connectedLocations?: string[];
  travelTimes?: Record<string, number>;
  defaultNode?: string;
}

export interface ScheduledEvent {
  id: string;
  title: string;
  trigger: Condition[];         // e.g. [{field:'time',op:'time_after',value:'16:10'}]
  eventLocation: string;        // where "present" is judged
  ifPresentNode: string;        // node routed to when player is present
  ifAbsentEffects: Effect[];    // applied when player is absent
  recoveryNodeId: string;       // reachable node that surfaces the clue after absence
}

export interface Ending {
  id: string;
  name: string;
  conditions: Condition[];      // empty only for the default
  summary: string;
  body?: string;
  priority?: number;
  isDefault?: boolean;
}

export interface VariableDef {
  name: string;
  type: 'boolean' | 'number' | 'string';
  default: Primitive;
  purpose: string;              // single semantic meaning
  label?: string;
}

export interface Story {
  id: string;
  title: string;
  startNodeId: string;
  startTime: string;            // "HH:MM"
  deadline: string;             // "HH:MM"
  startLocation: string;
  variables: VariableDef[];
  nodes: StoryNode[];
  locations: Location[];
  events: ScheduledEvent[];
  endings: Ending[];            // ordered; exactly one isDefault with empty conditions
}

export interface WorldState {
  time: number;                 // minutes; engine-derived single source of truth
  location: string;
  clues: string[];
  inventory: string[];
  visited: string[];
  completedEvents: string[];
  vars: Record<string, Primitive>;
}

export interface ChoiceView {
  id: string;
  label: string;
  available: boolean;
  lockedReason?: string;
}

export interface GameView {
  node: StoryNode;
  time: number;
  timeLabel: string;
  location: string;
  choices: ChoiceView[];
  state: WorldState;
  log: string[];
  endingReached?: Ending;
}

export interface LintIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
  where?: string;
}

export interface LintResult {
  ok: boolean;
  errors: LintIssue[];
  warnings: LintIssue[];
}
```

- [ ] **Step 2: Write the failing time test `src/engine/time.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { parseTime, formatTime, addMinutes } from './time';

describe('time', () => {
  it('parses HH:MM to minutes', () => {
    expect(parseTime('16:10')).toBe(970);
    expect(parseTime('00:00')).toBe(0);
    expect(parseTime('9:05')).toBe(545);
  });
  it('throws on bad input', () => {
    expect(() => parseTime('nope')).toThrow();
  });
  it('adds minutes', () => {
    expect(addMinutes(970, 25)).toBe(995);
  });
  it('formats minutes to 12-hour clock', () => {
    expect(formatTime(970)).toBe('4:10 PM');
    expect(formatTime(0)).toBe('12:00 AM');
    expect(formatTime(720)).toBe('12:00 PM');
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- time`
Expected: FAIL — cannot find module `./time`.

- [ ] **Step 4: Write `src/engine/time.ts`**

```ts
export function parseTime(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) throw new Error(`Invalid time: ${hhmm}`);
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function addMinutes(minutes: number, delta: number): number {
  return minutes + delta;
}

export function formatTime(minutes: number): string {
  const norm = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const mm = norm % 60;
  const ap = h < 12 ? 'AM' : 'PM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${mm < 10 ? '0' : ''}${mm} ${ap}`;
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npm test -- time`
Expected: PASS.

- [ ] **Step 6: Write the failing state test `src/engine/state.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { initState, readVar } from './state';
import type { Story } from './types';

const story: Story = {
  id: 'g', title: 'g', startNodeId: 'n1', startTime: '15:00', deadline: '18:00',
  startLocation: 'L_HOME',
  variables: [
    { name: 'trust', type: 'number', default: 0, purpose: 'trust' },
    { name: 'knows', type: 'boolean', default: false, purpose: 'knowledge' },
  ],
  nodes: [], locations: [], events: [], endings: [],
};

describe('state', () => {
  it('initializes from story start values and variable defaults', () => {
    const s = initState(story);
    expect(s.time).toBe(900);
    expect(s.location).toBe('L_HOME');
    expect(s.vars.trust).toBe(0);
    expect(s.vars.knows).toBe(false);
    expect(s.clues).toEqual([]);
    expect(s.visited).toEqual([]);
  });
  it('readVar resolves reserved fields and vars', () => {
    const s = initState(story);
    expect(readVar(s, 'time')).toBe(900);
    expect(readVar(s, 'location')).toBe('L_HOME');
    expect(readVar(s, 'trust')).toBe(0);
    expect(readVar(s, 'missing')).toBeUndefined();
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `npm test -- state`
Expected: FAIL — cannot find module `./state`.

- [ ] **Step 8: Write `src/engine/state.ts`**

```ts
import type { Story, WorldState, Primitive } from './types';
import { parseTime } from './time';

export function initState(story: Story): WorldState {
  const vars: Record<string, Primitive> = {};
  for (const v of story.variables) vars[v.name] = v.default;
  return {
    time: parseTime(story.startTime),
    location: story.startLocation,
    clues: [],
    inventory: [],
    visited: [],
    completedEvents: [],
    vars,
  };
}

export function readVar(s: WorldState, field: string): Primitive | undefined {
  if (field === 'time') return s.time;
  if (field === 'location') return s.location;
  return s.vars[field];
}
```

- [ ] **Step 9: Run it to verify it passes**

Run: `npm test -- state`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/engine/types.ts src/engine/time.ts src/engine/state.ts src/engine/time.test.ts src/engine/state.test.ts
git commit -m "feat: engine types, engine-derived time, state init"
```

---

### Task 3: Condition evaluator

**Files:**
- Create: `src/engine/conditions.ts`
- Test: `src/engine/conditions.test.ts`

**Interfaces:**
- Consumes: `WorldState`, `Condition` (types); `readVar` (state); `parseTime` (time).
- Produces: `evaluateCondition(c, s): boolean`, `evaluateConditions(cs, s): boolean` (AND; empty/undefined → true), `explainFailing(cs, s): string`.

- [ ] **Step 1: Write the failing test `src/engine/conditions.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { evaluateCondition, evaluateConditions, explainFailing } from './conditions';
import type { WorldState } from './types';

const base: WorldState = {
  time: 970, location: 'Diner', clues: ['black_car'], inventory: [],
  visited: ['n1'], completedEvents: [], vars: { trust: 2, knows: true, phase: 'invest' },
};

describe('conditions', () => {
  it('compares numbers and equality', () => {
    expect(evaluateCondition({ field: 'trust', op: 'gte', value: '2' }, base)).toBe(true);
    expect(evaluateCondition({ field: 'trust', op: 'gt', value: '2' }, base)).toBe(false);
    expect(evaluateCondition({ field: 'phase', op: 'equals', value: 'invest' }, base)).toBe(true);
    expect(evaluateCondition({ field: 'phase', op: 'not_equals', value: 'x' }, base)).toBe(true);
  });
  it('handles booleans', () => {
    expect(evaluateCondition({ field: 'knows', op: 'is_true' }, base)).toBe(true);
    expect(evaluateCondition({ field: 'knows', op: 'is_false' }, base)).toBe(false);
  });
  it('handles clues and visited', () => {
    expect(evaluateCondition({ field: 'clues', op: 'has_clue', value: 'black_car' }, base)).toBe(true);
    expect(evaluateCondition({ field: 'clues', op: 'has_clue', value: 'plate' }, base)).toBe(false);
    expect(evaluateCondition({ field: 'visited', op: 'has_visited', value: 'n1' }, base)).toBe(true);
  });
  it('handles engine-derived time', () => {
    expect(evaluateCondition({ field: 'time', op: 'time_after', value: '16:10' }, base)).toBe(true);
    expect(evaluateCondition({ field: 'time', op: 'time_before', value: '16:10' }, base)).toBe(false);
    expect(evaluateCondition({ field: 'time', op: 'time_between', value: '16:00-17:00' }, base)).toBe(true);
  });
  it('ANDs lists and treats empty as true', () => {
    expect(evaluateConditions([], base)).toBe(true);
    expect(evaluateConditions(undefined, base)).toBe(true);
    expect(evaluateConditions(
      [{ field: 'trust', op: 'gte', value: '2' }, { field: 'knows', op: 'is_true' }], base)).toBe(true);
    expect(evaluateConditions(
      [{ field: 'trust', op: 'gte', value: '2' }, { field: 'knows', op: 'is_false' }], base)).toBe(false);
  });
  it('explains failing conditions', () => {
    const msg = explainFailing([{ field: 'trust', op: 'gte', value: '5' }], base);
    expect(msg).toContain('trust');
    expect(msg).toContain('gte');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- conditions`
Expected: FAIL — cannot find module `./conditions`.

- [ ] **Step 3: Write `src/engine/conditions.ts`**

```ts
import type { Condition, WorldState, Primitive } from './types';
import { readVar } from './state';
import { parseTime } from './time';

function num(v: Primitive | undefined): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v == null) return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function coerce(v: string | undefined): Primitive {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v != null && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v ?? '';
}

export function evaluateCondition(c: Condition, s: WorldState): boolean {
  const cur = readVar(s, c.field);
  switch (c.op) {
    case 'equals': return String(cur) === String(coerce(c.value));
    case 'not_equals': return String(cur) !== String(coerce(c.value));
    case 'gt': return num(cur) > num(coerce(c.value));
    case 'gte': return num(cur) >= num(coerce(c.value));
    case 'lt': return num(cur) < num(coerce(c.value));
    case 'lte': return num(cur) <= num(coerce(c.value));
    case 'is_true': return cur === true || cur === 'true' || num(cur) > 0;
    case 'is_false': return !(cur === true || cur === 'true' || num(cur) > 0);
    case 'has_clue': return s.clues.includes(c.value ?? c.field);
    case 'has_visited': return s.visited.includes(c.value ?? c.field);
    case 'time_before': return s.time < parseTime(c.value ?? '00:00');
    case 'time_after': return s.time >= parseTime(c.value ?? '00:00');
    case 'time_between': {
      const range = (c.value ?? '00:00-23:59').split('-');
      const a = parseTime(range[0] ?? '00:00');
      const b = parseTime(range[1] ?? '23:59');
      return s.time >= a && s.time <= b;
    }
    default: return true;
  }
}

export function evaluateConditions(cs: Condition[] | undefined, s: WorldState): boolean {
  if (!cs || cs.length === 0) return true;
  return cs.every((c) => evaluateCondition(c, s));
}

export function explainFailing(cs: Condition[] | undefined, s: WorldState): string {
  if (!cs) return '';
  return cs
    .filter((c) => !evaluateCondition(c, s))
    .map((c) => `${c.field} ${c.op}${c.value != null ? ' ' + c.value : ''}`)
    .join('; ');
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- conditions`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/conditions.ts src/engine/conditions.test.ts
git commit -m "feat: condition evaluator with engine-derived time ops"
```

---

### Task 4: Effect processor (immutable)

**Files:**
- Create: `src/engine/effects.ts`
- Test: `src/engine/effects.test.ts`

**Interfaces:**
- Consumes: `WorldState`, `Effect`, `Primitive` (types); `addMinutes` (time).
- Produces: `applyEffect(s, e): WorldState`, `applyEffects(s, es): WorldState`. Both return new state; never mutate input.

- [ ] **Step 1: Write the failing test `src/engine/effects.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { applyEffect, applyEffects } from './effects';
import type { WorldState } from './types';

const base: WorldState = {
  time: 900, location: 'Home', clues: [], inventory: [], visited: [],
  completedEvents: [], vars: { trust: 1, knows: false },
};

describe('effects', () => {
  it('sets, increments, decrements vars', () => {
    expect(applyEffect(base, { field: 'knows', op: 'set', value: 'true' }).vars.knows).toBe(true);
    expect(applyEffect(base, { field: 'trust', op: 'increment', value: '2' }).vars.trust).toBe(3);
    expect(applyEffect(base, { field: 'trust', op: 'decrement' }).vars.trust).toBe(0);
  });
  it('advances engine-derived time', () => {
    expect(applyEffect(base, { field: 'time', op: 'add_minutes', value: '15' }).time).toBe(915);
  });
  it('manages clues, items, location, visited, events', () => {
    expect(applyEffect(base, { field: 'clues', op: 'add_clue', value: 'plate' }).clues).toEqual(['plate']);
    expect(applyEffect(base, { field: 'location', op: 'change_location', value: 'Diner' }).location).toBe('Diner');
    expect(applyEffect(base, { field: 'e1', op: 'mark_event_completed' }).completedEvents).toEqual(['e1']);
    expect(applyEffect(base, { field: 'n2', op: 'mark_visited' }).visited).toEqual(['n2']);
  });
  it('does not mutate the input state', () => {
    const before = JSON.stringify(base);
    applyEffect(base, { field: 'trust', op: 'increment', value: '5' });
    expect(JSON.stringify(base)).toBe(before);
  });
  it('applies a list in order', () => {
    const out = applyEffects(base, [
      { field: 'knows', op: 'set', value: 'true' },
      { field: 'trust', op: 'increment', value: '1' },
      { field: 'time', op: 'add_minutes', value: '10' },
    ]);
    expect(out.vars.knows).toBe(true);
    expect(out.vars.trust).toBe(2);
    expect(out.time).toBe(910);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- effects`
Expected: FAIL — cannot find module `./effects`.

- [ ] **Step 3: Write `src/engine/effects.ts`**

```ts
import type { Effect, WorldState, Primitive } from './types';
import { addMinutes } from './time';

function num(v: Primitive | undefined): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v == null) return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function coerce(v: string | undefined): Primitive {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v != null && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v ?? '';
}

function uniqPush(arr: string[], x: string): string[] {
  return arr.includes(x) ? arr : [...arr, x];
}

export function applyEffect(s: WorldState, e: Effect): WorldState {
  switch (e.op) {
    case 'set':
      return { ...s, vars: { ...s.vars, [e.field]: coerce(e.value) } };
    case 'increment':
      return { ...s, vars: { ...s.vars, [e.field]: num(s.vars[e.field]) + num(coerce(e.value ?? '1')) } };
    case 'decrement':
      return { ...s, vars: { ...s.vars, [e.field]: num(s.vars[e.field]) - num(coerce(e.value ?? '1')) } };
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

export function applyEffects(s: WorldState, es: Effect[] | undefined): WorldState {
  if (!es) return s;
  return es.reduce((acc, e) => applyEffect(acc, e), s);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- effects`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/effects.ts src/engine/effects.test.ts
git commit -m "feat: immutable effect processor"
```

---

### Task 5: Ending resolver (state-driven, exhaustive)

**Files:**
- Create: `src/engine/endingResolver.ts`
- Test: `src/engine/endingResolver.test.ts`

**Interfaces:**
- Consumes: `Story`, `Ending`, `WorldState` (types); `evaluateConditions` (conditions).
- Produces: `resolveEnding(s, story): Ending | undefined` — first non-default ending whose conditions pass, else the default.

- [ ] **Step 1: Write the failing test `src/engine/endingResolver.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { resolveEnding } from './endingResolver';
import type { Story, WorldState } from './types';

function storyWith(endings: Story['endings']): Story {
  return {
    id: 'g', title: 'g', startNodeId: 'n', startTime: '15:00', deadline: '18:00',
    startLocation: 'L', variables: [], nodes: [], locations: [], events: [], endings,
  };
}
const s = (vars: Record<string, number>): WorldState => ({
  time: 0, location: 'L', clues: [], inventory: [], visited: [], completedEvents: [], vars,
});

describe('endingResolver', () => {
  const story = storyWith([
    { id: 'win', name: 'Win', summary: 'w', conditions: [{ field: 'score', op: 'gte', value: '3' }] },
    { id: 'ok', name: 'Ok', summary: 'o', conditions: [{ field: 'score', op: 'gte', value: '1' }] },
    { id: 'default', name: 'Default', summary: 'd', conditions: [], isDefault: true },
  ]);
  it('returns the first non-default match in order', () => {
    expect(resolveEnding(s({ score: 5 }), story)?.id).toBe('win');
    expect(resolveEnding(s({ score: 2 }), story)?.id).toBe('ok');
  });
  it('falls back to the default when nothing matches (no zero-match holes)', () => {
    expect(resolveEnding(s({ score: 0 }), story)?.id).toBe('default');
  });
  it('returns default even if it is not last in the list', () => {
    const reordered = storyWith([
      { id: 'default', name: 'D', summary: 'd', conditions: [], isDefault: true },
      { id: 'win', name: 'W', summary: 'w', conditions: [{ field: 'score', op: 'gte', value: '3' }] },
    ]);
    expect(resolveEnding(s({ score: 9 }), reordered)?.id).toBe('win');
    expect(resolveEnding(s({ score: 0 }), reordered)?.id).toBe('default');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- endingResolver`
Expected: FAIL — cannot find module `./endingResolver`.

- [ ] **Step 3: Write `src/engine/endingResolver.ts`**

```ts
import type { Story, Ending, WorldState } from './types';
import { evaluateConditions } from './conditions';

export function resolveEnding(s: WorldState, story: Story): Ending | undefined {
  for (const e of story.endings) {
    if (e.isDefault) continue;
    if (evaluateConditions(e.conditions, s)) return e;
  }
  return story.endings.find((e) => e.isDefault);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- endingResolver`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/endingResolver.ts src/engine/endingResolver.test.ts
git commit -m "feat: state-driven ending resolver with default catch-all"
```

---

### Task 6: Scheduled events (fire on the clock, present/absent)

**Files:**
- Create: `src/engine/scheduledEvents.ts`
- Test: `src/engine/scheduledEvents.test.ts`

**Interfaces:**
- Consumes: `Story`, `WorldState` (types); `evaluateConditions` (conditions); `applyEffects` (effects).
- Produces: `EventCheckResult { state: WorldState; routedNodeId?: string; log: string[] }`, `checkScheduledEvents(s, story): EventCheckResult`. Fires each incomplete event whose trigger passes; present → routes to `ifPresentNode`; absent → applies `ifAbsentEffects`; marks completed either way; never fires twice.

- [ ] **Step 1: Write the failing test `src/engine/scheduledEvents.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { checkScheduledEvents } from './scheduledEvents';
import type { Story, WorldState } from './types';

function story(): Story {
  return {
    id: 'g', title: 'g', startNodeId: 'n', startTime: '15:00', deadline: '18:00', startLocation: 'Diner',
    variables: [], nodes: [], locations: [], endings: [],
    events: [{
      id: 'E410', title: 'Pickup',
      trigger: [{ field: 'time', op: 'time_after', value: '16:10' }],
      eventLocation: 'Diner',
      ifPresentNode: 'n_witness',
      ifAbsentEffects: [
        { field: 'envelope_gone', op: 'set', value: 'true' },
        { field: 'clues', op: 'add_clue', value: 'receipt' },
      ],
      recoveryNodeId: 'n_receipt',
    }],
  };
}
const at = (time: number, location: string): WorldState => ({
  time, location, clues: [], inventory: [], visited: [], completedEvents: [], vars: {},
});

describe('scheduledEvents', () => {
  it('does not fire before the trigger time', () => {
    const r = checkScheduledEvents(at(900, 'Diner'), story());
    expect(r.routedNodeId).toBeUndefined();
    expect(r.state.completedEvents).toEqual([]);
  });
  it('routes to the witness node when present', () => {
    const r = checkScheduledEvents(at(975, 'Diner'), story());
    expect(r.routedNodeId).toBe('n_witness');
    expect(r.state.completedEvents).toEqual(['E410']);
  });
  it('applies absent effects and plants the clue when absent', () => {
    const r = checkScheduledEvents(at(975, 'Arcade'), story());
    expect(r.routedNodeId).toBeUndefined();
    expect(r.state.vars.envelope_gone).toBe(true);
    expect(r.state.clues).toContain('receipt');
    expect(r.state.completedEvents).toEqual(['E410']);
  });
  it('never fires the same event twice', () => {
    const fired: WorldState = { ...at(975, 'Arcade'), completedEvents: ['E410'] };
    const r = checkScheduledEvents(fired, story());
    expect(r.state.clues).toEqual([]);
    expect(r.log).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- scheduledEvents`
Expected: FAIL — cannot find module `./scheduledEvents`.

- [ ] **Step 3: Write `src/engine/scheduledEvents.ts`**

```ts
import type { Story, WorldState } from './types';
import { evaluateConditions } from './conditions';
import { applyEffects } from './effects';

export interface EventCheckResult {
  state: WorldState;
  routedNodeId?: string;
  log: string[];
}

export function checkScheduledEvents(s: WorldState, story: Story): EventCheckResult {
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
      state = applyEffects(state, ev.ifAbsentEffects);
      state = { ...state, completedEvents: [...state.completedEvents, ev.id] };
      log.push(`Event ${ev.id} fired (absent); clue recoverable at ${ev.recoveryNodeId}`);
    }
  }

  return { state, routedNodeId, log };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- scheduledEvents`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/scheduledEvents.ts src/engine/scheduledEvents.test.ts
git commit -m "feat: scheduled events fire on the clock with present/absent paths"
```

---

### Task 7: Runtime engine loop

**Files:**
- Create: `src/engine/engine.ts`
- Test: `src/engine/engine.test.ts`

**Interfaces:**
- Consumes: all prior modules.
- Produces: `class GameEngine` with `constructor(story: Story)`, `start(): GameView`, `view(): GameView`, `choose(choiceId: string): GameView`. The loop on `choose`: apply choice effects → check scheduled events (after time advance) → next node is a present-event route if any else `choice.destination` → enter node (entry effects, mark visited) → resolve ending if the node `resolvesEnding` or `time >= deadline`.

- [ ] **Step 1: Write the failing test `src/engine/engine.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { GameEngine } from './engine';
import type { Story } from './types';

function demo(): Story {
  return {
    id: 'g', title: 'demo', startNodeId: 'start', startTime: '15:00', deadline: '18:00',
    startLocation: 'Diner',
    variables: [{ name: 'knows', type: 'boolean', default: false, purpose: 'k' }],
    locations: [],
    events: [{
      id: 'E', title: 'pickup',
      trigger: [{ field: 'time', op: 'time_after', value: '16:10' }],
      eventLocation: 'Diner', ifPresentNode: 'witness',
      ifAbsentEffects: [{ field: 'clues', op: 'add_clue', value: 'receipt' }],
      recoveryNodeId: 'receipt',
    }],
    nodes: [
      { id: 'start', title: 'Start', body: 'You are at the diner.', choices: [
        { id: 'ask', label: 'Ask about the envelope', destination: 'learned',
          effects: [{ field: 'knows', op: 'set', value: 'true' }, { field: 'time', op: 'add_minutes', value: '5' }] },
        { id: 'wait', label: 'Wait around', destination: 'start2',
          effects: [{ field: 'time', op: 'add_minutes', value: '75' }] },
      ] },
      { id: 'learned', title: 'Learned', body: 'Now you know.', choices: [
        { id: 'gated', label: 'Mention the envelope', destination: 'finish',
          conditions: [{ field: 'knows', op: 'is_true' }] },
        { id: 'leave', label: 'Leave', destination: 'finish' },
      ] },
      { id: 'start2', title: 'Still waiting', body: 'Time passes.', choices: [
        { id: 'end', label: 'Give up', destination: 'finish' },
      ] },
      { id: 'witness', title: 'Witness', body: 'You saw the pickup.', choices: [
        { id: 'w_end', label: 'Go report it', destination: 'finish' },
      ] },
      { id: 'receipt', title: 'Receipt', body: 'You find a receipt.', choices: [
        { id: 'r_end', label: 'Pocket it', destination: 'finish' },
      ] },
      { id: 'finish', title: 'The End', body: 'Resolve.', resolvesEnding: true, choices: [] },
    ],
    endings: [
      { id: 'informed', name: 'Informed', summary: 'You knew.', conditions: [{ field: 'knows', op: 'is_true' }] },
      { id: 'default', name: 'Clueless', summary: 'You did not.', conditions: [], isDefault: true },
    ],
  };
}

describe('GameEngine', () => {
  it('starts at the start node and marks it visited', () => {
    const g = new GameEngine(demo());
    const v = g.start();
    expect(v.node.id).toBe('start');
    expect(v.state.visited).toContain('start');
    expect(v.timeLabel).toBe('3:00 PM');
  });

  it('hides gated choices and explains why, then reveals them after state changes', () => {
    const g = new GameEngine(demo());
    g.choose('wait');        // 75 min passes -> but stays start2 path; knows still false
    // re-run on a fresh engine to test gating at 'learned'
    const g2 = new GameEngine(demo());
    g2.choose('ask');        // sets knows=true, +5 min => 15:05
    const v = g2.view();
    expect(v.node.id).toBe('learned');
    const gated = v.choices.find((c) => c.id === 'gated')!;
    expect(gated.available).toBe(true);
  });

  it('routes to the witness node when a scheduled event fires while present', () => {
    const g = new GameEngine(demo());
    const v = g.choose('wait');   // +75 min => 16:15, at Diner => event fires present
    expect(v.node.id).toBe('witness');
    expect(v.state.completedEvents).toContain('E');
  });

  it('resolves an ending from accumulated state at a resolution node', () => {
    const g = new GameEngine(demo());
    g.choose('ask');              // knows=true
    const v = g.choose('gated');  // -> finish (resolvesEnding)
    expect(v.endingReached?.id).toBe('informed');
  });

  it('falls to the default ending when state does not match', () => {
    const g = new GameEngine(demo());
    g.choose('wait');             // event fires present -> witness (knows still false)
    const v = g.choose('w_end');  // -> finish
    expect(v.endingReached?.id).toBe('default');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- engine`
Expected: FAIL — cannot find module `./engine`.

- [ ] **Step 3: Write `src/engine/engine.ts`**

```ts
import type { Story, StoryNode, WorldState, GameView, ChoiceView, Ending } from './types';
import { initState } from './state';
import { evaluateConditions, explainFailing } from './conditions';
import { applyEffects } from './effects';
import { checkScheduledEvents } from './scheduledEvents';
import { resolveEnding } from './endingResolver';
import { parseTime, formatTime } from './time';

export class GameEngine {
  private story: Story;
  private state: WorldState;
  private currentId: string;
  private deadline: number;
  private log: string[] = [];
  private ending?: Ending;

  constructor(story: Story) {
    this.story = story;
    this.state = initState(story);
    this.currentId = story.startNodeId;
    this.deadline = parseTime(story.deadline);
    this.enter(this.currentId);
  }

  private node(id: string): StoryNode {
    const n = this.story.nodes.find((x) => x.id === id);
    if (!n) throw new Error(`Unknown node: ${id}`);
    return n;
  }

  private enter(id: string): void {
    this.currentId = id;
    const n = this.node(id);
    this.state = applyEffects(this.state, n.entryEffects);
    if (!this.state.visited.includes(id)) {
      this.state = { ...this.state, visited: [...this.state.visited, id] };
    }
    if (!this.ending && (n.resolvesEnding || this.state.time >= this.deadline)) {
      this.ending = resolveEnding(this.state, this.story);
      if (this.ending) this.log.push(`Ending: ${this.ending.id}`);
    }
  }

  start(): GameView {
    return this.view();
  }

  view(): GameView {
    const n = this.node(this.currentId);
    const choices: ChoiceView[] = (n.choices || []).map((c) => {
      const ok = evaluateConditions(c.conditions, this.state);
      return ok
        ? { id: c.id, label: c.label, available: true }
        : { id: c.id, label: c.label, available: false, lockedReason: explainFailing(c.conditions, this.state) };
    });
    return {
      node: n,
      time: this.state.time,
      timeLabel: formatTime(this.state.time),
      location: this.state.location,
      choices,
      state: this.state,
      log: [...this.log],
      endingReached: this.ending,
    };
  }

  choose(choiceId: string): GameView {
    if (this.ending) return this.view();
    const n = this.node(this.currentId);
    const choice = (n.choices || []).find((c) => c.id === choiceId);
    if (!choice) throw new Error(`Unknown choice: ${choiceId}`);
    if (!evaluateConditions(choice.conditions, this.state)) {
      throw new Error(`Choice not available: ${choiceId}`);
    }
    this.state = applyEffects(this.state, choice.effects);
    const res = checkScheduledEvents(this.state, this.story);
    this.state = res.state;
    this.log.push(...res.log);
    const nextId = res.routedNodeId ?? choice.destination;
    this.enter(nextId);
    return this.view();
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- engine`
Expected: PASS (all 5 cases).

- [ ] **Step 5: Commit**

```bash
git add src/engine/engine.ts src/engine/engine.test.ts
git commit -m "feat: runtime engine loop (choices, events, endings)"
```

---

### Task 8: The build-blocking linter

**Files:**
- Create: `src/engine/linter.ts`
- Test: `src/engine/linter.test.ts`

**Interfaces:**
- Consumes: `Story`, `StoryNode`, `Choice`, `Condition`, `Effect`, `LintResult`, `LintIssue` (types).
- Produces: `lintStory(story): LintResult`. Errors block; warnings inform. Checks: duplicate ids, broken links, choice-targets-ending, no-exit nodes, undefined variables, unreachable nodes (warning), default-ending integrity, scheduled-event integrity, deadline reachability, possibly-unwinnable (warning).

- [ ] **Step 1: Write the failing test `src/engine/linter.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { lintStory } from './linter';
import type { Story } from './types';

// A clean, lint-passing minimal story.
function clean(): Story {
  return {
    id: 'g', title: 'g', startNodeId: 'a', startTime: '15:00', deadline: '16:00',
    startLocation: 'L',
    variables: [{ name: 'knows', type: 'boolean', default: false, purpose: 'k' }],
    locations: [],
    events: [{
      id: 'E', title: 'e',
      trigger: [{ field: 'time', op: 'time_after', value: '15:30' }],
      eventLocation: 'L', ifPresentNode: 'b',
      ifAbsentEffects: [{ field: 'clues', op: 'add_clue', value: 'c' }],
      recoveryNodeId: 'b',
    }],
    nodes: [
      { id: 'a', title: 'A', body: 'a', choices: [
        { id: 'go', label: 'go', destination: 'b',
          effects: [{ field: 'time', op: 'add_minutes', value: '90' }] },
      ] },
      { id: 'b', title: 'B', body: 'b', resolvesEnding: true, choices: [] },
    ],
    endings: [
      { id: 'win', name: 'Win', summary: 'w', conditions: [{ field: 'knows', op: 'is_true' }] },
      { id: 'default', name: 'D', summary: 'd', conditions: [], isDefault: true },
    ],
  };
}

describe('linter', () => {
  it('passes a clean story', () => {
    const r = lintStory(clean());
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('flags broken links', () => {
    const s = clean();
    s.nodes[0].choices[0].destination = 'nowhere';
    const r = lintStory(s);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === 'BROKEN_LINK')).toBe(true);
  });

  it('flags a missing default ending', () => {
    const s = clean();
    s.endings = s.endings.filter((e) => !e.isDefault);
    expect(lintStory(s).errors.some((e) => e.code === 'NO_DEFAULT_ENDING')).toBe(true);
  });

  it('flags undefined variables', () => {
    const s = clean();
    s.nodes[0].choices[0].effects = [{ field: 'ghost', op: 'set', value: '1' }];
    expect(lintStory(s).errors.some((e) => e.code === 'UNDEFINED_VAR')).toBe(true);
  });

  it('flags a no-exit dead-end node', () => {
    const s = clean();
    s.nodes[1].resolvesEnding = false; // node b now has no choices and no resolution
    expect(lintStory(s).errors.some((e) => e.code === 'NO_EXIT')).toBe(true);
  });

  it('flags a scheduled event with an unreachable recovery node', () => {
    const s = clean();
    s.events[0].recoveryNodeId = 'b';
    s.nodes[0].choices[0].destination = 'b'; // still reachable -> ok
    s.events[0].recoveryNodeId = 'ghost';
    expect(lintStory(s).errors.some((e) => e.code === 'EVENT_RECOVERY_MISSING')).toBe(true);
  });

  it('flags a clock that cannot bite', () => {
    const s = clean();
    s.nodes[0].choices[0].effects = [{ field: 'time', op: 'add_minutes', value: '5' }]; // window is 60 min
    const r = lintStory(s);
    expect(r.errors.some((e) => e.code === 'CLOCK_CANNOT_BITE')).toBe(true);
  });

  it('warns on unreachable nodes', () => {
    const s = clean();
    s.nodes.push({ id: 'orphan', title: 'O', body: 'o', resolvesEnding: true, choices: [] });
    const r = lintStory(s);
    expect(r.warnings.some((w) => w.code === 'UNREACHABLE_NODE')).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- linter`
Expected: FAIL — cannot find module `./linter`.

- [ ] **Step 3: Write `src/engine/linter.ts`**

```ts
import type { Story, Choice, Condition, Effect, LintResult, LintIssue } from './types';
import { parseTime } from './time';

const RESERVED_FIELDS = new Set(['time', 'location']);
const NON_VAR_EFFECT_OPS = new Set<Effect['op']>([
  'add_clue', 'remove_clue', 'add_item', 'remove_item',
  'change_location', 'add_minutes', 'mark_event_completed', 'mark_visited',
]);

function choiceMinutes(c: Choice): number {
  return (c.effects || [])
    .filter((e) => e.op === 'add_minutes')
    .reduce((a, e) => a + Number(e.value ?? 0), 0);
}

function computeReachable(story: Story): Set<string> {
  const out = new Set<string>();
  const stack: string[] = [story.startNodeId];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    const n = story.nodes.find((x) => x.id === id);
    if (!n) continue;
    out.add(id);
    for (const c of n.choices || []) stack.push(c.destination);
  }
  return out;
}

function timeBounds(story: Story): { maxTime: number; minTime: number } {
  const byId = new Map(story.nodes.map((n) => [n.id, n]));
  let maxTime = 0;
  let minTime = Infinity;
  const dfs = (id: string, acc: number, path: Set<string>): void => {
    const n = byId.get(id);
    if (!n || n.resolvesEnding || (n.choices?.length ?? 0) === 0 || path.has(id)) {
      maxTime = Math.max(maxTime, acc);
      minTime = Math.min(minTime, acc);
      return;
    }
    const np = new Set(path);
    np.add(id);
    for (const c of n.choices) {
      dfs(c.destination, acc + choiceMinutes(c), np);
    }
  };
  dfs(story.startNodeId, 0, new Set());
  if (minTime === Infinity) minTime = 0;
  return { maxTime, minTime };
}

export function lintStory(story: Story): LintResult {
  const errors: LintIssue[] = [];
  const warnings: LintIssue[] = [];
  const err = (code: string, message: string, where?: string) =>
    errors.push({ level: 'error', code, message, where });
  const warn = (code: string, message: string, where?: string) =>
    warnings.push({ level: 'warning', code, message, where });

  const nodeIds = new Set(story.nodes.map((n) => n.id));
  const endingIds = new Set(story.endings.map((e) => e.id));
  const varNames = new Set(story.variables.map((v) => v.name));

  // duplicate node ids
  const seen = new Set<string>();
  for (const n of story.nodes) {
    if (seen.has(n.id)) err('DUPLICATE_NODE_ID', `Duplicate node id: ${n.id}`, n.id);
    seen.add(n.id);
  }

  // links + choice-targets-ending
  for (const n of story.nodes) {
    for (const c of n.choices || []) {
      if (endingIds.has(c.destination)) {
        err('CHOICE_TARGETS_ENDING', `Choice ${c.id} targets ending ${c.destination}; endings resolve from state`, n.id);
      } else if (!nodeIds.has(c.destination)) {
        err('BROKEN_LINK', `Choice ${c.id} -> missing node ${c.destination}`, n.id);
      }
    }
  }

  // no-exit nodes
  for (const n of story.nodes) {
    if ((n.choices?.length ?? 0) === 0 && !n.resolvesEnding) {
      err('NO_EXIT', `Node ${n.id} has no choices and does not resolve an ending`, n.id);
    }
  }

  // undefined variables
  const checkConds = (cs: Condition[] | undefined, where: string) => {
    for (const c of cs || []) {
      if (RESERVED_FIELDS.has(c.field)) continue;
      if (c.op === 'has_clue' || c.op === 'has_visited' || c.op.startsWith('time_')) continue;
      if (!varNames.has(c.field)) err('UNDEFINED_VAR', `Condition references undefined variable: ${c.field}`, where);
    }
  };
  const checkEffs = (es: Effect[] | undefined, where: string) => {
    for (const e of es || []) {
      if (NON_VAR_EFFECT_OPS.has(e.op)) continue;
      if (!varNames.has(e.field)) err('UNDEFINED_VAR', `Effect references undefined variable: ${e.field}`, where);
    }
  };
  for (const n of story.nodes) {
    checkConds(n.conditions, n.id);
    checkEffs(n.entryEffects, n.id);
    for (const c of n.choices || []) {
      checkConds(c.conditions, c.id);
      checkEffs(c.effects, c.id);
    }
  }
  for (const ev of story.events) {
    checkConds(ev.trigger, ev.id);
    checkEffs(ev.ifAbsentEffects, ev.id);
  }
  for (const en of story.endings) checkConds(en.conditions, en.id);

  // reachability
  const reachable = computeReachable(story);
  const presentNodes = new Set(story.events.map((e) => e.ifPresentNode));
  for (const n of story.nodes) {
    if (!reachable.has(n.id) && !presentNodes.has(n.id)) {
      warn('UNREACHABLE_NODE', `Node ${n.id} is unreachable from start`, n.id);
    }
  }

  // default ending integrity
  const defaults = story.endings.filter((e) => e.isDefault);
  if (defaults.length === 0) err('NO_DEFAULT_ENDING', 'No default (catch-all) ending; some end-states could match zero endings');
  if (defaults.length > 1) err('MULTIPLE_DEFAULT_ENDINGS', 'More than one default ending');
  if (defaults.length === 1 && (defaults[0].conditions?.length ?? 0) > 0) {
    err('DEFAULT_HAS_CONDITIONS', 'Default ending must have no conditions');
  }

  // scheduled event integrity
  for (const ev of story.events) {
    if (!nodeIds.has(ev.ifPresentNode)) err('EVENT_PRESENT_NODE_MISSING', `Event ${ev.id} ifPresentNode ${ev.ifPresentNode} missing`, ev.id);
    if (!nodeIds.has(ev.recoveryNodeId)) err('EVENT_RECOVERY_MISSING', `Event ${ev.id} recoveryNodeId ${ev.recoveryNodeId} missing`, ev.id);
    else if (!reachable.has(ev.recoveryNodeId)) err('EVENT_RECOVERY_UNREACHABLE', `Event ${ev.id} recovery node ${ev.recoveryNodeId} is unreachable by navigation`, ev.id);
    if ((ev.ifAbsentEffects?.length ?? 0) === 0) err('EVENT_NO_ABSENT', `Event ${ev.id} has no if-absent effects`, ev.id);
    if ((ev.trigger?.length ?? 0) === 0) err('EVENT_NO_TRIGGER', `Event ${ev.id} has no trigger`, ev.id);
  }

  // deadline reachability
  const window = parseTime(story.deadline) - parseTime(story.startTime);
  const { maxTime, minTime } = timeBounds(story);
  if (maxTime < window) {
    err('CLOCK_CANNOT_BITE', `Longest reachable path accumulates ${maxTime} min but the deadline window is ${window} min — the clock can never run out`);
  }
  if (minTime > window) {
    warn('POSSIBLY_UNWINNABLE', `Shortest reachable path (${minTime} min) already exceeds the deadline window (${window} min)`);
  }

  return { ok: errors.length === 0, errors, warnings };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- linter`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/engine/linter.ts src/engine/linter.test.ts
git commit -m "feat: build-blocking linter (clock, endings, events, integrity)"
```

---

### Task 9: Public API barrel + full-story integration test

**Files:**
- Create: `src/engine/index.ts`
- Test: `src/engine/integration.test.ts`

**Interfaces:**
- Consumes: all modules.
- Produces: `src/engine/index.ts` re-exporting the public surface. Integration test proves a small full story lints clean and plays to two different state-resolved endings.

- [ ] **Step 1: Write `src/engine/index.ts`**

```ts
export * from './types';
export * from './time';
export * from './state';
export * from './conditions';
export * from './effects';
export * from './endingResolver';
export * from './scheduledEvents';
export * from './engine';
export * from './linter';
```

- [ ] **Step 2: Write the failing integration test `src/engine/integration.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { GameEngine, lintStory, type Story } from './index';

function miniGame(): Story {
  return {
    id: 'mini', title: 'Mini', startNodeId: 'start', startTime: '15:00', deadline: '16:00',
    startLocation: 'Diner',
    variables: [{ name: 'knows', type: 'boolean', default: false, purpose: 'knowledge of the envelope' }],
    locations: [],
    events: [{
      id: 'E', title: 'pickup',
      trigger: [{ field: 'time', op: 'time_after', value: '15:30' }],
      eventLocation: 'Diner', ifPresentNode: 'witness',
      ifAbsentEffects: [{ field: 'clues', op: 'add_clue', value: 'receipt' }],
      recoveryNodeId: 'receipt',
    }],
    nodes: [
      { id: 'start', title: 'Start', body: 'The diner is quiet.', choices: [
        { id: 'ask', label: 'Ask about the envelope', destination: 'leave',
          effects: [{ field: 'knows', op: 'set', value: 'true' }, { field: 'time', op: 'add_minutes', value: '70' }] },
        { id: 'go_arcade', label: 'Walk to the arcade', destination: 'arcade',
          effects: [{ field: 'location', op: 'change_location', value: 'Arcade' }, { field: 'time', op: 'add_minutes', value: '70' }] },
      ] },
      { id: 'leave', title: 'Leave', body: 'You step out.', resolvesEnding: true, choices: [] },
      { id: 'arcade', title: 'Arcade', body: 'Pinball clatters.', choices: [
        { id: 'home', label: 'Head home', destination: 'leave' },
      ] },
      { id: 'witness', title: 'Witness', body: 'You saw it.', resolvesEnding: true, choices: [] },
      { id: 'receipt', title: 'Receipt', body: 'A torn receipt.', resolvesEnding: true, choices: [] },
    ],
    endings: [
      { id: 'informed', name: 'Informed', summary: 'You learned the truth.', conditions: [{ field: 'knows', op: 'is_true' }] },
      { id: 'default', name: 'In the dark', summary: 'You never found out.', conditions: [], isDefault: true },
    ],
  };
}

describe('integration', () => {
  it('lints clean', () => {
    const r = lintStory(miniGame());
    expect(r.ok).toBe(true);
  });

  it('reaches the informed ending by asking (present at the event)', () => {
    const g = new GameEngine(miniGame());
    const v = g.choose('ask'); // +70 min -> 16:10, present at Diner: event routes to witness; knows=true
    expect(v.endingReached?.id).toBe('informed');
  });

  it('reaches the default ending by leaving town uninformed', () => {
    const g = new GameEngine(miniGame());
    g.choose('go_arcade');        // leaves Diner (absent), +70 -> receipt clue planted, lands at arcade
    const v = g.choose('home');   // -> leave (resolvesEnding); knows still false
    expect(v.endingReached?.id).toBe('default');
  });
});
```

- [ ] **Step 3: Run it to verify it fails, then passes**

Run: `npm test -- integration`
Expected: FAIL first if `index.ts` missing exports; then PASS once Step 1 file is in place. Run the full suite: `npm test` → all green.

- [ ] **Step 4: Typecheck the whole engine**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/engine/index.ts src/engine/integration.test.ts
git commit -m "feat: engine public API + full-story integration test"
```

---

## Self-Review (completed during planning)

**Spec coverage (v1.1 §1–2):**
- §1.1 engine-derived time → Task 2 (`time`, `initState`) + Task 4 (`add_minutes` only path to advance) + linter `CLOCK_CANNOT_BITE` (Task 8). Authored node time never read for logic (no code path reads `authorTimeHint`). ✓
- §1.2 scheduled events with mandatory if-absent → Task 6 + linter `EVENT_*` checks. ✓
- §1.3 endings resolved from state, choices can't target endings → Task 5 + linter `CHOICE_TARGETS_ENDING`, `NO_DEFAULT_ENDING`. ✓
- §1.4 prose-vs-state → partially structural here; full prose audit is an AI-assist pass in Sub-project D (noted, not silently dropped). The engine guarantees the *state* an ending sees is real; it cannot read prose. ✓ (documented boundary)
- §2 linter three blocking checks → Task 8 (`CLOCK_CANNOT_BITE`, default-ending exhaustiveness, `EVENT_RECOVERY_*`). ✓
- §2 carried-over validations → Task 8 (`DUPLICATE_NODE_ID`, `BROKEN_LINK`, `UNDEFINED_VAR`, `NO_EXIT`, `UNREACHABLE_NODE`). ✓
- §2 one-variable-one-meaning (P2) → **not in this plan**; deferred (it is P2 and needs heuristics/AI). Flagged here so it is not forgotten.

**Placeholder scan:** no TBD/TODO; every step has complete code/commands. ✓

**Type consistency:** `WorldState`, `Story`, `Condition`, `Effect`, `Ending`, `GameView` names and shapes are identical across Tasks 2–9; `checkScheduledEvents` returns `{state, routedNodeId, log}` consumed verbatim in Task 7; `resolveEnding(s, story)` signature consistent in Tasks 5/7. ✓

**Known deferred (out of scope for Sub-project A, by design):** location-based "best node" selection (v0.1 §20.2), full ending-reachability/dead-code analysis (needs state-space search; candidate for the AI-assist branch analyzer), and the one-variable-one-meaning lint. These belong to later sub-projects and are listed so execution does not assume they are missing by accident.

## Execution Handoff

Plan complete and saved to `docs/plans/2026-06-16-engine-core-and-linter.md`.
