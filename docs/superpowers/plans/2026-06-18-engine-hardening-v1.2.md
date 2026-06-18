# Engine Hardening v1.2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the verified defects the standing team found in the v1.1 engine review (2026-06-18) so three new chapters can be authored on a foundation that *enforces* its own guarantees instead of relying on authoring discipline.

**Architecture:** Two nets. (1) The **linter** (`src/engine/linter.ts`) gains cheap, *sound* static checks — they only flag definite defects, never a false positive that could block a valid story. (2) The team's exhaustive **state-space walker** is productionized as a separate, deliberately-run per-chapter validation tool (`src/engine/stateSpaceWalk.ts`) — that is where path-sensitive analysis lives. Plus one runtime fix to the engine core (`src/engine/engine.ts`) so scheduled events fire from world-time, not only on choice transitions.

**Tech Stack:** TypeScript (strict), Vitest, the existing pure engine modules under `src/engine/`. No new dependencies.

## Global Constraints

- **Pure & deterministic engine core (EE-6):** no `Date.now()`, no randomness, no I/O in `src/engine/**`. Same inputs → same outputs.
- **Soundness over completeness for build-blocking rules:** any new `error`-level lint must have *zero false positives* — it may miss a defect, but must never flag a valid story. Rules that rely on heuristics ship as `warning`, not `error`.
- **No regressions:** the full suite (`npm test`) and `npx tsc --noEmit` must stay green after every task. The two shipped chapters (`src/content/praterLine.ts`, `src/content/sampleStory.ts`) must continue to **lint with zero new errors** (new *warnings* are acceptable and expected — e.g. the latent Prater Line ending shadow).
- **TDD:** every behavioral change starts with a failing test. Commit after each task.
- **Test fixtures:** use the shared `mkStory()` helper at `src/test/storyFixture.ts` (created in Task 1) to build minimal valid `Story` objects; override only the fields under test.

---

## File Structure

| File | Responsibility | Tasks |
|---|---|---|
| `src/test/storyFixture.ts` | **Create.** Shared minimal-`Story` factory for tests. | 1 |
| `src/engine/engine.ts` | **Modify.** Move scheduled-event firing into `enter()`. | 1 |
| `src/engine/scheduledEvents.ts` | Reference (no change expected). | 1 |
| `src/engine/symbols.ts` | **Create.** Static symbol tables (producible clues / locations / truthy vars) shared by linter rules. | 2, 3 |
| `src/engine/linter.ts` | **Modify.** Add the new static rules. | 2, 3, 4, 5, 6 |
| `src/engine/endingResolver.ts` | **Modify.** Honor `priority`. | 4 |
| `src/engine/time.ts` | **Modify.** Day-offset rendering in `formatTime`. | 5 |
| `src/engine/stateSpaceWalk.ts` | **Create.** Productionized exhaustive validation walker. | 7 |
| `src/engine/stateSpaceWalk.test.ts` | **Create.** Run the walker against both shipped chapters. | 7 |

Each new lint rule gets its own tests in `src/engine/linter.test.ts`. Engine-runtime tests live in `src/engine/engine.test.ts` (and a new `src/engine/events.enter.test.ts` for Task 1's focused cases).

---

### Task 1: Scheduled events fire on `enter()` (Blocker B1)

**Problem:** `checkScheduledEvents` runs only inside `choose()` (`engine.ts:77`), after choice effects, judging "present" on the transient post-effect location and silently clobbering the author's `destination` via `routedNodeId ?? choice.destination` (`engine.ts:80`). Time advanced by a node's `entryEffects` is never seen by the scheduler, so an event can fire late and mis-route — the engine itself then tells the player they witnessed something they missed (an engine-generated EE-4 lie). Fix: fire events inside `enter()` after entry effects, exactly once, judged at the fully-arrived node; a "present" event diverts by re-entering its present node.

**Files:**
- Create: `src/test/storyFixture.ts`
- Modify: `src/engine/engine.ts:31-42` (`enter`), `src/engine/engine.ts:68-83` (`choose`)
- Test: `src/engine/events.enter.test.ts`

**Interfaces:**
- Consumes: `checkScheduledEvents(state, story): { state, routedNodeId?, log }` (`scheduledEvents.ts:11`, unchanged); `GameEngine` public API (`start`, `view`, `choose`, `gotoNode`, `snapshot`, `restore`).
- Produces: `mkStory(overrides?: Partial<Story>): Story` exported from `src/test/storyFixture.ts` — used by every later task.

- [ ] **Step 1: Create the shared test fixture**

```ts
// src/test/storyFixture.ts
import type { Story } from '../engine/types';

/** Minimal valid Story; override only what a test exercises. */
export function mkStory(overrides: Partial<Story> = {}): Story {
  const base: Story = {
    id: 'test',
    title: 'Test Story',
    startNodeId: 'start',
    startTime: '20:00',
    deadline: '22:00',
    startLocation: 'loc_a',
    variables: [],
    nodes: [{ id: 'start', title: 'Start', body: '', choices: [] }],
    locations: [{ id: 'loc_a', name: 'A' }],
    events: [],
    endings: [{ id: 'end_default', name: 'Default', summary: '', conditions: [], isDefault: true }],
  };
  return { ...base, ...overrides };
}
```

- [ ] **Step 2: Write the failing test (event fires on time crossed by an entry effect)**

```ts
// src/engine/events.enter.test.ts
import { describe, it, expect } from 'vitest';
import { GameEngine } from './engine';
import { mkStory } from '../test/storyFixture';

describe('scheduled events fire on enter()', () => {
  it('fires an event when the trigger time is crossed by a node entry effect (not a choice effect)', () => {
    const story = mkStory({
      startTime: '20:00',
      deadline: '23:00',
      locations: [{ id: 'loc_a', name: 'A' }, { id: 'loc_canal', name: 'Canal' }],
      nodes: [
        { id: 'start', title: 'Start', body: '', choices: [
          { id: 'go', label: 'Go to the canal', destination: 'canal',
            effects: [{ field: 'location', op: 'change_location', value: 'loc_canal' }] },
        ] },
        // Entering this node advances the clock past the 22:30 trigger via an ENTRY effect.
        { id: 'canal', title: 'Canal', body: '', location: 'loc_canal',
          entryEffects: [{ field: 'time', op: 'add_minutes', value: '40' }], // 20:00 -> 22:00... see note
          choices: [{ id: 'wait', label: 'Wait', destination: 'canal2' }] },
        { id: 'canal2', title: 'Later', body: '', choices: [] , resolvesEnding: true },
        { id: 'present', title: 'You saw it', body: '', choices: [], resolvesEnding: true },
      ],
      events: [{
        id: 'ev', title: 'Handoff', trigger: [{ field: 'time', op: 'time_after', value: '22:30' }],
        eventLocation: 'loc_canal', ifPresentNode: 'present',
        ifAbsentEffects: [{ field: 'missed', op: 'set', value: 'true' }], recoveryNodeId: 'canal2',
      }],
      variables: [{ name: 'missed', type: 'boolean', default: false, purpose: 'missed the handoff' }],
    });
    // Start 20:00. choose('go') -> enter('canal'): +40 entry not enough; bump to cross 22:30:
    const eng = new GameEngine(story);
    // Make the entry effect actually cross 22:30 (20:00 + 160 = 22:40):
    story.nodes[1].entryEffects = [{ field: 'time', op: 'add_minutes', value: '160' }];
    const eng2 = new GameEngine(story);
    const v = eng2.choose('go');
    // Player is present at loc_canal when the clock crosses 22:30 via the entry effect -> diverts.
    expect(v.node.id).toBe('present');
    expect(v.log.some((l) => l.includes('ev') && l.includes('present'))).toBe(true);
    void eng; void v;
  });
});
```

> Note for the implementer: simplify the test before committing — drop the throwaway `eng`/`eng2` duplication; build the story once with `add_minutes '160'`. The behavioral assertion is: **entry-effect time advance triggers the present event and diverts to `present`.**

- [ ] **Step 3: Run the test, verify it fails**

Run: `npx vitest run src/engine/events.enter.test.ts`
Expected: FAIL — under the current code the event check never runs in `enter()`, so `v.node.id` is `canal`, not `present`.

- [ ] **Step 4: Move the event check into `enter()` and simplify `choose()`**

```ts
// src/engine/engine.ts — replace enter() (lines 31-42)
private enter(id: string): void {
  this.currentId = id;
  const n = this.node(id);
  this.state = applyEffects(this.state, n.entryEffects);
  if (!this.state.visited.includes(id)) {
    this.state = { ...this.state, visited: [...this.state.visited, id] };
  }
  // Scheduled events fire from world-time, judged at the node we have fully arrived at
  // (after entry effects) so any clock advance — choice OR entry effect — is seen exactly
  // once. checkScheduledEvents marks each fired event completed, so the recursive re-entry
  // a "present" event triggers cannot re-fire it.
  const res = checkScheduledEvents(this.state, this.story);
  this.state = res.state;
  if (res.log.length) this.log.push(...res.log);
  if (res.routedNodeId && res.routedNodeId !== id) {
    this.enter(res.routedNodeId);
    return;
  }
  if (!this.ending && (n.resolvesEnding || this.state.time >= this.deadline)) {
    this.ending = resolveEnding(this.state, this.story);
    if (this.ending) this.log.push(`Ending: ${this.ending.id}`);
  }
}
```

```ts
// src/engine/engine.ts — replace choose() body (lines 76-82) so it no longer checks events itself
this.state = applyEffects(this.state, choice.effects);
this.enter(choice.destination);
return this.view();
```

(`checkScheduledEvents` import stays; the standalone call in `choose()` is removed.)

- [ ] **Step 5: Run the focused test, verify it passes**

Run: `npx vitest run src/engine/events.enter.test.ts`
Expected: PASS — `v.node.id === 'present'`.

- [ ] **Step 6: Run the FULL suite and reconcile**

Run: `npm test`
Expected: PASS. If any existing event/timing test in `engine.test.ts` or `integration.test.ts` changed outcome, inspect each: the only legitimate behavior shift is *when* an event is judged (now after the destination's entry effects instead of mid-choice). Update assertions that encoded the old mid-choice timing; do **not** weaken an assertion that protects a real guarantee. Re-run `npx tsc --noEmit`.

- [ ] **Step 7: Verify the shipped chapters still behave**

Run: `npx vitest run src/content/praterLine.test.ts src/content/sampleStory.test.ts`
Expected: PASS (Prater Line's 23:30 handoff and the 4:10 pickup still fire and recover correctly).

- [ ] **Step 8: Commit**

```bash
git add src/test/storyFixture.ts src/engine/engine.ts src/engine/events.enter.test.ts
git commit -m "fix(engine): fire scheduled events on enter() from world-time (Blocker B1)"
```

---

### Task 2: Static symbol tables + undefined-location & dead-clue lints

**Problem:** `change_location`/`eventLocation` values are never checked against `story.locations` (`linter.ts:5-8,99` skips them), and `has_clue`/`has_visited` conditions are skipped entirely (`linter.ts:93`), so a typo'd clue (`add_clue 'cluX'` vs `has_clue 'clue'`) lints clean and the gated content silently never unlocks.

**Files:**
- Create: `src/engine/symbols.ts`
- Modify: `src/engine/linter.ts` (add two rules)
- Test: `src/engine/linter.test.ts`

**Interfaces:**
- Produces: `collectSymbols(story: Story): StorySymbols` where
  `interface StorySymbols { producibleClues: Set<string>; locationIds: Set<string>; }`
  — `producibleClues` = every value an `add_clue` effect can add anywhere (node entryEffects, choice effects, event ifAbsentEffects); `locationIds` = `story.locations[].id`.
- Consumed by: Task 3 (extends with truthy-var producibility).

- [ ] **Step 1: Write the failing tests**

```ts
// add to src/engine/linter.test.ts
import { mkStory } from '../test/storyFixture';

it('flags a has_clue condition for a clue nothing ever adds (DEAD_CLUE_REFERENCE)', () => {
  const story = mkStory({
    nodes: [
      { id: 'start', title: 'S', body: '', choices: [
        { id: 'c', label: 'Use key', destination: 'start',
          conditions: [{ field: 'keycard', op: 'has_clue' }] }, // no effect ever adds 'keycard'
      ] },
    ],
  });
  const res = lintStory(story);
  expect(res.errors.map((e) => e.code)).toContain('DEAD_CLUE_REFERENCE');
});

it('flags a change_location to an undefined location id (UNDEFINED_LOCATION)', () => {
  const story = mkStory({
    nodes: [
      { id: 'start', title: 'S', body: '', choices: [
        { id: 'c', label: 'Go', destination: 'start',
          effects: [{ field: 'location', op: 'change_location', value: 'loc_nowhere' }] },
      ] },
    ],
  });
  const res = lintStory(story);
  expect(res.errors.map((e) => e.code)).toContain('UNDEFINED_LOCATION');
});
```

- [ ] **Step 2: Run, verify both fail**

Run: `npx vitest run src/engine/linter.test.ts`
Expected: FAIL — neither code is emitted today.

- [ ] **Step 3: Create the symbol-table module**

```ts
// src/engine/symbols.ts
import type { Story, Effect } from './types';

export interface StorySymbols {
  producibleClues: Set<string>;
  locationIds: Set<string>;
}

function allEffects(story: Story): Effect[] {
  const out: Effect[] = [];
  for (const n of story.nodes) {
    out.push(...(n.entryEffects ?? []));
    for (const c of n.choices ?? []) out.push(...(c.effects ?? []));
  }
  for (const ev of story.events) out.push(...(ev.ifAbsentEffects ?? []));
  return out;
}

export function collectSymbols(story: Story): StorySymbols {
  const producibleClues = new Set<string>();
  for (const e of allEffects(story)) {
    if (e.op === 'add_clue') producibleClues.add(e.value ?? e.field);
  }
  return { producibleClues, locationIds: new Set(story.locations.map((l) => l.id)) };
}
```

- [ ] **Step 4: Wire the two rules into `lintStory`**

```ts
// src/engine/linter.ts — near the top
import { collectSymbols } from './symbols';

// inside lintStory(), after varNames is built:
const sym = collectSymbols(story);

// (a) UNDEFINED_LOCATION — walk every change_location effect + event.eventLocation
const checkLocations = (es: Effect[] | undefined, where: string) => {
  for (const e of es || []) {
    if (e.op === 'change_location' && e.value && !sym.locationIds.has(e.value)) {
      err('UNDEFINED_LOCATION', `Effect sets location to undefined id: ${e.value}`, where);
    }
  }
};
for (const n of story.nodes) {
  checkLocations(n.entryEffects, n.id);
  for (const c of n.choices || []) checkLocations(c.effects, c.id);
}
for (const ev of story.events) {
  if (!sym.locationIds.has(ev.eventLocation)) {
    err('UNDEFINED_LOCATION', `Event ${ev.id} eventLocation ${ev.eventLocation} is not a defined location`, ev.id);
  }
}
if (!sym.locationIds.has(story.startLocation)) {
  err('UNDEFINED_LOCATION', `startLocation ${story.startLocation} is not a defined location`);
}

// (b) DEAD_CLUE_REFERENCE — extend the existing checkConds (linter.ts:90-96)
//     Replace the early `continue` for has_clue with a producibility check:
//        if (c.op === 'has_clue') {
//          const clue = c.value ?? c.field;
//          if (!sym.producibleClues.has(clue)) err('DEAD_CLUE_REFERENCE',
//            `Condition requires clue '${clue}' that no add_clue effect can produce`, where);
//          continue;
//        }
//        if (c.op === 'has_visited' || c.op.startsWith('time_')) continue;
```

- [ ] **Step 5: Run the new tests, verify they pass**

Run: `npx vitest run src/engine/linter.test.ts`
Expected: PASS — both codes emitted.

- [ ] **Step 6: Verify shipped chapters stay clean**

Run: `npm test`
Expected: PASS. In particular `praterLine.test.ts`/`sampleStory.test.ts` must show **no new errors**. If `UNDEFINED_LOCATION` fires on a shipped chapter, that is a real latent content bug — fix the chapter's location id (do not relax the rule). Re-run `npx tsc --noEmit`.

- [ ] **Step 7: Commit**

```bash
git add src/engine/symbols.ts src/engine/linter.ts src/engine/linter.test.ts
git commit -m "feat(linter): undefined-location and dead-clue static checks"
```

---

### Task 3: Internally-contradictory choices + soft-lock error (Blocker B2)

**Problem:** `NO_EXIT` (`linter.ts:84`) only fires when `choices.length === 0`. A non-ending node whose every choice is permanently locked (e.g. gated on a boolean a player can never make true) lints clean and soft-locks the player — verified `errors:[], warnings:[]`. Fix: detect *statically dead* choices (sound subset) and error when a non-ending node has no live exit.

**Files:**
- Modify: `src/engine/symbols.ts` (add truthy-var producibility), `src/engine/linter.ts`
- Test: `src/engine/linter.test.ts`

**Interfaces:**
- Consumes: `StorySymbols` from Task 2.
- Produces: `staticallyDeadChoice(choice: Choice, story: Story, sym: StorySymbols): boolean` (exported from `linter.ts` for unit testing) — `true` only when the choice can be *proven* never-available. Sound: when unsure, returns `false`.

- [ ] **Step 1: Write the failing test (the vault)**

```ts
// add to src/engine/linter.test.ts
it('flags a node whose only exit is gated on a never-true flag as SOFT_LOCK', () => {
  const story = mkStory({
    variables: [{ name: 'keycard', type: 'boolean', default: false, purpose: 'has keycard' }],
    nodes: [
      { id: 'start', title: 'S', body: '', choices: [
        { id: 'enter', label: 'Enter vault', destination: 'vault' },
      ] },
      { id: 'vault', title: 'Vault', body: '', choices: [
        { id: 'leave', label: 'Leave', destination: 'start',
          conditions: [{ field: 'keycard', op: 'is_true' }] }, // keycard is never set true anywhere
      ] },
    ],
  });
  const res = lintStory(story);
  expect(res.errors.map((e) => e.code)).toContain('SOFT_LOCK');
});

it('does NOT flag a node whose gate CAN be satisfied (no false positive)', () => {
  const story = mkStory({
    variables: [{ name: 'keycard', type: 'boolean', default: false, purpose: 'has keycard' }],
    nodes: [
      { id: 'start', title: 'S', body: '', choices: [
        { id: 'grab', label: 'Grab keycard', destination: 'vault',
          effects: [{ field: 'keycard', op: 'set', value: 'true' }] },
      ] },
      { id: 'vault', title: 'Vault', body: '', choices: [
        { id: 'leave', label: 'Leave', destination: 'start', conditions: [{ field: 'keycard', op: 'is_true' }] },
      ] },
    ],
  });
  expect(lintStory(story).errors.map((e) => e.code)).not.toContain('SOFT_LOCK');
});
```

- [ ] **Step 2: Run, verify the first fails (and the second already passes is fine)**

Run: `npx vitest run src/engine/linter.test.ts`
Expected: FAIL on the SOFT_LOCK test.

- [ ] **Step 3: Extend symbols with truthy-var producibility**

```ts
// src/engine/symbols.ts — extend StorySymbols + collectSymbols
export interface StorySymbols {
  producibleClues: Set<string>;
  locationIds: Set<string>;
  canBecomeTruthy: Set<string>;   // var names some effect can make truthy
  setValues: Map<string, Set<string>>; // var -> literal values some `set` can assign
}

// in collectSymbols, while iterating allEffects(story):
//   set:        record e.value into setValues[e.field]; if value is 'true' or a nonzero number -> canBecomeTruthy.add(field)
//   increment:  canBecomeTruthy.add(field)  (can push above 0)
// also: for any VariableDef whose default is truthy (true, or number !== 0, or non-empty string), canBecomeTruthy.add(name).
```

- [ ] **Step 4: Implement `staticallyDeadChoice` + the SOFT_LOCK rule**

```ts
// src/engine/linter.ts
import type { Choice, Condition } from './types';

// A choice is statically dead only when we can PROVE no reachable state satisfies it.
export function staticallyDeadChoice(c: Choice, story: Story, sym: StorySymbols): boolean {
  const conds = c.conditions ?? [];
  // (1) internal contradiction within this choice's own AND-list
  if (contradicts(conds)) return true;
  // (2) requires a clue nothing can produce
  for (const k of conds) {
    if (k.op === 'has_clue' && !sym.producibleClues.has(k.value ?? k.field)) return true;
    // (3) requires a declared var to be truthy that nothing can make truthy
    if (k.op === 'is_true' && story.variables.some((v) => v.name === k.field) && !sym.canBecomeTruthy.has(k.field)) return true;
  }
  return false;
}

// sound contradiction detector over an AND-list (returns true only for definite contradictions)
function contradicts(conds: Condition[]): boolean {
  const byField = new Map<string, Condition[]>();
  for (const c of conds) { const a = byField.get(c.field) ?? []; a.push(c); byField.set(c.field, a); }
  for (const [, cs] of byField) {
    const hasTrue = cs.some((c) => c.op === 'is_true');
    const hasFalse = cs.some((c) => c.op === 'is_false');
    if (hasTrue && hasFalse) return true;
    const eqs = cs.filter((c) => c.op === 'equals').map((c) => c.value);
    if (new Set(eqs).size > 1) return true; // equals A and equals B, A!==B
    // numeric range emptiness: gte/gt lower vs lte/lt upper
    const lowers = cs.filter((c) => c.op === 'gte' || c.op === 'gt').map((c) => Number(c.value));
    const uppers = cs.filter((c) => c.op === 'lte' || c.op === 'lt').map((c) => Number(c.value));
    if (lowers.length && uppers.length && Math.max(...lowers) > Math.min(...uppers)) return true;
  }
  return false;
}

// in lintStory(), replace/augment the no-exit loop (linter.ts:83-87):
for (const n of story.nodes) {
  if (n.resolvesEnding) continue;
  const choices = n.choices ?? [];
  if (choices.length === 0) { err('NO_EXIT', `Node ${n.id} has no choices and does not resolve an ending`, n.id); continue; }
  if (choices.every((c) => staticallyDeadChoice(c, story, sym))) {
    err('SOFT_LOCK', `Node ${n.id} has no escapable exit — every choice is permanently locked`, n.id);
  }
}
```

- [ ] **Step 5: Run the tests, verify pass (and no false positive)**

Run: `npx vitest run src/engine/linter.test.ts`
Expected: PASS — SOFT_LOCK fires on the vault, does NOT fire when the gate is satisfiable.

- [ ] **Step 6: Full suite + shipped chapters**

Run: `npm test && npx tsc --noEmit`
Expected: PASS, **no SOFT_LOCK on praterLine/sampleStory** (the walk in the review proved both are soft-lock-free). A false positive here means `contradicts`/producibility is too aggressive — loosen until sound.

- [ ] **Step 7: Commit**

```bash
git add src/engine/symbols.ts src/engine/linter.ts src/engine/linter.test.ts
git commit -m "feat(linter): static soft-lock + dead-choice detection (Blocker B2)"
```

---

### Task 4: Ending `priority` + overlap/shadow warnings

**Problem:** `resolveEnding` (`endingResolver.ts:5-9`) returns the first array-order match and ignores `Ending.priority` (`types.ts:80`) — dead code that invites silent authoring bugs. Two endings simultaneously satisfiable resolve by array position with no diagnostic; a broad ending listed before a specific one permanently shadows it (latent in Prater Line: `ending_double` precedes `ending_clean`). Fix: honor `priority` explicitly; warn on overlap/shadow.

**Files:**
- Modify: `src/engine/endingResolver.ts`, `src/engine/linter.ts`
- Test: `src/engine/endingResolver.test.ts`, `src/engine/linter.test.ts`

**Interfaces:**
- Produces: `resolveEnding` now selects among satisfied non-default endings by **highest `priority` first** (default `priority` = 0), breaking ties by array order — behavior is otherwise unchanged when no priorities are set.

- [ ] **Step 1: Write the failing resolver test**

```ts
// add to src/engine/endingResolver.test.ts
it('prefers the higher-priority ending when two conditions are both satisfied', () => {
  const story = mkStory({
    variables: [{ name: 'score', type: 'number', default: 0, purpose: 's' }],
    endings: [
      { id: 'broad', name: 'Broad', summary: '', conditions: [{ field: 'score', op: 'gte', value: '1' }], priority: 0 },
      { id: 'specific', name: 'Specific', summary: '', conditions: [{ field: 'score', op: 'gte', value: '5' }], priority: 10 },
      { id: 'def', name: 'Default', summary: '', conditions: [], isDefault: true },
    ],
  });
  const state = { time: 0, location: 'loc_a', clues: [], inventory: [], visited: [], completedEvents: [], vars: { score: 10 } };
  expect(resolveEnding(state, story)?.id).toBe('specific');
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `npx vitest run src/engine/endingResolver.test.ts`
Expected: FAIL — current resolver returns `broad` (array order).

- [ ] **Step 3: Honor priority in the resolver**

```ts
// src/engine/endingResolver.ts
export function resolveEnding(s: WorldState, story: Story): Ending | undefined {
  const matched = story.endings.filter((e) => !e.isDefault && evaluateConditions(e.conditions, s));
  if (matched.length) {
    // highest priority wins; stable tie-break by original array order
    return matched.reduce((best, e) => ((e.priority ?? 0) > (best.priority ?? 0) ? e : best));
  }
  return story.endings.find((e) => e.isDefault);
}
```

- [ ] **Step 4: Run resolver test, verify pass; run full resolver suite**

Run: `npx vitest run src/engine/endingResolver.test.ts`
Expected: PASS, and existing resolver tests still green (no-priority stories keep first-match-by-order semantics because `reduce` keeps `best` on ties).

- [ ] **Step 5: Write the failing lint test (overlap warning)**

```ts
// add to src/engine/linter.test.ts
it('warns when two non-default endings can be simultaneously satisfiable (OVERLAPPING_ENDINGS)', () => {
  const story = mkStory({
    variables: [{ name: 'score', type: 'number', default: 0, purpose: 's' }],
    nodes: [{ id: 'start', title: 'S', body: '', choices: [], resolvesEnding: true }],
    endings: [
      { id: 'a', name: 'A', summary: '', conditions: [{ field: 'score', op: 'gte', value: '1' }] },
      { id: 'b', name: 'B', summary: '', conditions: [{ field: 'score', op: 'gte', value: '5' }] },
      { id: 'def', name: 'Default', summary: '', conditions: [], isDefault: true },
    ],
  });
  expect(lintStory(story).warnings.map((w) => w.code)).toContain('OVERLAPPING_ENDINGS');
});
```

- [ ] **Step 6: Implement the overlap/shadow warning (sound heuristic, warning-level)**

```ts
// src/engine/linter.ts — after the default-ending integrity block (linter.ts:126-132)
// Two endings "may overlap" when we CANNOT prove their condition sets are mutually exclusive.
// Reuse contradicts(): combine both condition lists; if the union is NOT a contradiction,
// they can co-occur. Warn (never error — undecidable in general; default keeps EE-3 safe).
const nonDefault = story.endings.filter((e) => !e.isDefault);
for (let i = 0; i < nonDefault.length; i++) {
  for (let j = i + 1; j < nonDefault.length; j++) {
    const a = nonDefault[i], b = nonDefault[j];
    if (!contradicts([...(a.conditions ?? []), ...(b.conditions ?? [])])) {
      const aPri = a.priority ?? 0, bPri = b.priority ?? 0;
      if (aPri === bPri) {
        warn('OVERLAPPING_ENDINGS',
          `Endings '${a.id}' and '${b.id}' can both be satisfied and share priority ${aPri}; ` +
          `resolution falls back to array order. Set distinct priorities to make intent explicit.`, a.id);
      }
    }
  }
}
```

(Export `contradicts` from `linter.ts` or hoist it to module scope so this block can call it.)

- [ ] **Step 7: Run lint test, verify pass; full suite**

Run: `npm test && npx tsc --noEmit`
Expected: PASS. Prater Line is expected to emit an `OVERLAPPING_ENDINGS` **warning** (the `ending_double`/`ending_clean` shadow the team flagged) — that is the intended surfacing, not a regression. Confirm it is a *warning*, `ok` stays `true`.

- [ ] **Step 8: Commit**

```bash
git add src/engine/endingResolver.ts src/engine/endingResolver.test.ts src/engine/linter.ts src/engine/linter.test.ts
git commit -m "feat(engine): honor ending priority; warn on overlapping/shadowed endings"
```

---

### Task 5: Time-literal range, unwinnable-deadline error, day-offset rendering

**Problem:** Nothing validates that a `time_*` literal falls within `[startTime, deadline]`, so a naked past-midnight literal like `01:00` (= 60 min) makes a `time_after` gate permanently open (`conditions.ts:34`). `formatTime` wraps `% 1440` (`time.ts:12`) so two absolute times >24h apart render identically. And `minTime > window` only *warns* (`linter.ts:149-151`) — a chapter whose shortest path already misses the deadline ships green.

**Files:**
- Modify: `src/engine/time.ts`, `src/engine/linter.ts`
- Test: `src/engine/time.test.ts`, `src/engine/linter.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/engine/time.test.ts
it('renders a day offset for times at or beyond 24h so distinct absolute times differ', () => {
  expect(formatTime(120)).toBe('2:00 AM');
  expect(formatTime(120 + 1440)).toBe('2:00 AM (+1d)');
});

// src/engine/linter.test.ts
it('errors when a time literal falls outside [startTime, deadline] (TIME_LITERAL_OUT_OF_RANGE)', () => {
  const story = mkStory({
    startTime: '20:00', deadline: '23:00',
    nodes: [{ id: 'start', title: 'S', body: '', choices: [
      { id: 'c', label: 'After 1am?', destination: 'start',
        conditions: [{ field: 'time', op: 'time_after', value: '01:00' }] }, // 60 min, far below the 20:00 start
    ] }],
  });
  expect(lintStory(story).errors.map((e) => e.code)).toContain('TIME_LITERAL_OUT_OF_RANGE');
});

it('errors when the shortest reachable path already exceeds the deadline (DEADLINE_UNWINNABLE)', () => {
  const story = mkStory({
    startTime: '20:00', deadline: '20:30', // 30-min window
    nodes: [
      { id: 'start', title: 'S', body: '', choices: [
        { id: 'go', label: 'Long walk', destination: 'end', effects: [{ field: 'time', op: 'add_minutes', value: '60' }] }],
      },
      { id: 'end', title: 'E', body: '', choices: [], resolvesEnding: true },
    ],
  });
  const res = lintStory(story);
  expect(res.errors.map((e) => e.code)).toContain('DEADLINE_UNWINNABLE');
  expect(res.ok).toBe(false);
});
```

- [ ] **Step 2: Run, verify failures**

Run: `npx vitest run src/engine/time.test.ts src/engine/linter.test.ts`
Expected: FAIL on the three new assertions.

- [ ] **Step 3: Day-offset in `formatTime`**

```ts
// src/engine/time.ts — formatTime
export function formatTime(minutes: number): string {
  const dayOffset = Math.floor(minutes / 1440);
  const norm = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const mm = norm % 60;
  const ap = h < 12 ? 'AM' : 'PM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  const suffix = dayOffset > 0 ? ` (+${dayOffset}d)` : '';
  return `${h12}:${mm < 10 ? '0' : ''}${mm} ${ap}${suffix}`;
}
```

- [ ] **Step 4: Time-literal range rule + promote unwinnable to error**

```ts
// src/engine/linter.ts
// collect every time_* literal from conditions/triggers/endings and check it sits in [start, deadline].
const startMin = parseTime(story.startTime);
const deadlineMin = parseTime(story.deadline);
const checkTimeLiterals = (cs: Condition[] | undefined, where: string) => {
  for (const c of cs || []) {
    if (!c.op.startsWith('time_') || !c.value) continue;
    const lits = c.op === 'time_between' ? c.value.split('-') : [c.value];
    for (const lit of lits) {
      const t = parseTime(lit.trim());
      if (t < startMin || t > deadlineMin) {
        err('TIME_LITERAL_OUT_OF_RANGE',
          `Time literal ${lit} (=${t}m) in ${c.op} is outside the story window [${story.startTime}, ${story.deadline}]. ` +
          `Use absolute minutes past midnight for after-midnight times (e.g. '26:10').`, where);
      }
    }
  }
};
for (const n of story.nodes) {
  checkTimeLiterals(n.conditions, n.id);
  for (const c of n.choices || []) checkTimeLiterals(c.conditions, c.id);
}
for (const ev of story.events) checkTimeLiterals(ev.trigger, ev.id);
for (const en of story.endings) checkTimeLiterals(en.conditions, en.id);

// promote POSSIBLY_UNWINNABLE (linter.ts:149-151) from warn -> err:
if (minTime > window) {
  err('DEADLINE_UNWINNABLE', `Shortest reachable path (${minTime} min) already exceeds the deadline window (${window} min)`);
}
```

- [ ] **Step 5: Run the new tests, verify pass**

Run: `npx vitest run src/engine/time.test.ts src/engine/linter.test.ts`
Expected: PASS.

- [ ] **Step 6: Full suite + shipped chapters**

Run: `npm test && npx tsc --noEmit`
Expected: PASS. Prater Line uses the `'26:10'` absolute convention, which is **within** `[20:00, 26:10]`, so `TIME_LITERAL_OUT_OF_RANGE` must NOT fire on it. If `DEADLINE_UNWINNABLE` fires on a shipped chapter, that's a real content bug — fix the chapter. Confirm any `formatTime` snapshot/UI test still matches (no shipped time is >24h except Prater's deadline display — verify its label).

- [ ] **Step 7: Commit**

```bash
git add src/engine/time.ts src/engine/time.test.ts src/engine/linter.ts src/engine/linter.test.ts
git commit -m "feat(linter): time-literal range check, unwinnable-deadline error, day-offset rendering"
```

---

### Task 6: Type-check condition/effect values against declared variable types

**Problem:** `Condition.value`/`Effect.value` are `string | undefined` (`types.ts:11,24`) and `num('banana')` coerces to `0` (`conditions.ts:5-11`), so a numeric comparison against a non-numeric literal lints clean and silently behaves as `=== 0`. The `VariableDef.type` field is never used to validate values.

**Files:**
- Modify: `src/engine/linter.ts`
- Test: `src/engine/linter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// add to src/engine/linter.test.ts
it('flags a numeric comparison against a non-numeric literal (TYPE_MISMATCH)', () => {
  const story = mkStory({
    variables: [{ name: 'score', type: 'number', default: 0, purpose: 's' }],
    nodes: [{ id: 'start', title: 'S', body: '', choices: [
      { id: 'c', label: 'x', destination: 'start', conditions: [{ field: 'score', op: 'gt', value: 'banana' }] }],
    }],
  });
  expect(lintStory(story).errors.map((e) => e.code)).toContain('TYPE_MISMATCH');
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `npx vitest run src/engine/linter.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the type check**

```ts
// src/engine/linter.ts
const varType = new Map(story.variables.map((v) => [v.name, v.type]));
const NUMERIC_OPS = new Set(['gt', 'gte', 'lt', 'lte']);
const checkCondTypes = (cs: Condition[] | undefined, where: string) => {
  for (const c of cs || []) {
    const t = varType.get(c.field);
    if (!t) continue; // undefined-var is already reported elsewhere; reserved fields skip
    if (NUMERIC_OPS.has(c.op)) {
      if (t !== 'number') err('TYPE_MISMATCH', `${c.op} on non-number variable '${c.field}' (declared ${t})`, where);
      else if (c.value != null && !/^-?\d+(\.\d+)?$/.test(c.value))
        err('TYPE_MISMATCH', `${c.op} on '${c.field}' compares against non-numeric literal '${c.value}'`, where);
    }
  }
};
for (const n of story.nodes) {
  checkCondTypes(n.conditions, n.id);
  for (const c of n.choices || []) checkCondTypes(c.conditions, c.id);
}
for (const ev of story.events) checkCondTypes(ev.trigger, ev.id);
for (const en of story.endings) checkCondTypes(en.conditions, en.id);
```

- [ ] **Step 4: Run, verify pass; full suite**

Run: `npm test && npx tsc --noEmit`
Expected: PASS — no `TYPE_MISMATCH` on shipped chapters (their numeric gates use numeric literals).

- [ ] **Step 5: Commit**

```bash
git add src/engine/linter.ts src/engine/linter.test.ts
git commit -m "feat(linter): type-check condition values against declared variable types"
```

---

### Task 7: Productionize the state-space validation walker

**Problem:** The linter is the cheap *sound* net; it cannot catch path-sensitive defects (e.g. a choice gated on `trust>=2` reachable only via a path that sets `trust=1`). The review's spike proved an exhaustive walk over the *real* engine catches these. Productionize it as a deliberately-run validation tool and a regression guard on the two shipped chapters.

**Files:**
- Create: `src/engine/stateSpaceWalk.ts`, `src/engine/stateSpaceWalk.test.ts`

**Interfaces:**
- Produces: `walkStateSpace(story: Story, opts?: { cap?: number }): WalkReport` where
  `interface WalkReport { statesExplored: number; capHit: boolean; zeroEnding: string[]; softlocks: string[]; orphanNodes: string[]; orphanEndings: string[]; deadChoices: string[]; eventRecovery: { eventId: string; ok: boolean }[]; overlaps: { winner: string; shadowed: string[]; count: number }[]; }` (each `string` is a node/choice/ending id or `node::choice` key).

- [ ] **Step 1: Create the walker (productionized from the review spike)**

Port the spike verbatim from the review (it drove the real `GameEngine` via `snapshot`/`restore`, BFS over a canonical state key, and ran green at 4,786 states for Prater Line). Drop the two unused imports. Default `cap = 50_000`. Expose `walkStateSpace` returning `WalkReport` (above) instead of asserting inline, so both the test here and future per-chapter validation can consume it. Keep the canonical key including `time` (proven fast enough for ≤25-node chapters); a `cap` + `capHit` flag is the backstop. (Do **not** add time-bucketing yet — YAGNI until a real chapter exceeds the cap.)

- [ ] **Step 2: Write the test against both shipped chapters**

```ts
// src/engine/stateSpaceWalk.test.ts
import { describe, it, expect } from 'vitest';
import { walkStateSpace } from './stateSpaceWalk';
import { praterLine } from '../content/praterLine';
import { sampleStory } from '../content/sampleStory';

describe.each([['praterLine', praterLine], ['sampleStory', sampleStory]])('state-space: %s', (_n, story) => {
  const r = walkStateSpace(story);
  it('completes exhaustively (cap not hit)', () => expect(r.capHit).toBe(false));
  it('EE-3: no reachable state resolves to zero endings', () => expect(r.zeroEnding).toEqual([]));
  it('no soft-locks', () => expect(r.softlocks).toEqual([]));
  it('no orphan endings', () => expect(r.orphanEndings).toEqual([]));
  it('EE-2: every event has a reachable recovery', () => expect(r.eventRecovery.filter((e) => !e.ok)).toEqual([]));
});
```

- [ ] **Step 3: Run, verify pass**

Run: `npx vitest run src/engine/stateSpaceWalk.test.ts`
Expected: PASS — both chapters clean on the hard-safety invariants (matches the review). `sampleStory` will report a non-empty `deadChoices`/`orphanNodes` (the known `briefed::press` dead choice and `missed` orphan); those are **reported, not asserted** here — they are content observations, not safety failures.

- [ ] **Step 4: Full suite + typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/stateSpaceWalk.ts src/engine/stateSpaceWalk.test.ts
git commit -m "feat(validate): productionize exhaustive state-space walker as per-chapter validation tool"
```

---

## Self-Review

**1. Spec coverage** — every item on the team's worklist maps to a task:

| Team finding | Severity | Task |
|---|---|---|
| Scheduled events skip entry-effect clock advances; present-route clobbers destination | Blocker (B1) | 1 |
| Fully-locked node soft-locks yet lints green | Blocker (B2) | 3 |
| Dead/typo'd clue references lint clean | Important | 2 |
| `change_location`/`eventLocation` to undefined location lints clean | Important | 2 |
| Unsatisfiable / internally-contradictory choice lints clean | Important | 3 (static subset), 7 (path-sensitive) |
| Overlapping endings resolve by silent array order | Important | 4 |
| Shadowed/unreachable ending (latent in Prater Line) | Important | 4 (warning), 7 (reports) |
| Dead `priority` field | Important | 4 |
| Out-of-range time literal (`01:00` footgun) | Important | 5 |
| `formatTime` collides times >24h apart | Important | 5 |
| "Can't-win" deadline only warns | Important | 5 |
| Value not type-checked against declared var type | Important | 6 |
| EE-4 prose-truth has no mechanical enforcement | Architectural | **Out of scope** — deferred to D4 (AI-assist); D1 surfaces the reachable-flag set. Noted, not built here. |
| Resource-depletion primitive (cave) | Feature | **Out of scope** — resolved during the cave chapter's design. |

**2. Placeholder scan** — no TBD/TODO; every code step shows real code. The Task 1 test carries an explicit "simplify before commit" note (the duplicate-engine scaffolding is intentional illustration, flagged for cleanup), which is guidance, not a placeholder.

**3. Type consistency** — `StorySymbols` defined in Task 2, extended in Task 3 (additive fields only). `staticallyDeadChoice`/`contradicts` defined in Task 3 and reused by Task 4's overlap check (hoist `contradicts` to module scope). `walkStateSpace`/`WalkReport` defined once in Task 7. `resolveEnding` signature unchanged (Task 4 changes only its body). `mkStory` defined in Task 1, used by all later tasks.

**Scope note:** Tasks 1 and 3 are the two blockers — if execution must stop early, those two close the ship-green correctness holes. Tasks 2, 4, 5, 6 are linter hardening; Task 7 is the per-chapter validation tool the three new chapters will run.
