# Investigation Dimension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the third profile dimension `investigation: 'off' | 'on'` — an engine-run "examine the scene for clues" loop (author-declared hotspots → injected one-shot `__examine_<id>` choices), with a timed-completability certificate, fenced off from `travel:'free'` in v1.

**Architecture:** Investigation rides the existing engine seam: `view()` injects examine choices and `choose()` handles them, so the exhaustive walker (which plays the real engine) verifies examination *for free* — no walker mode. The one engine refactor factors `enter()`'s post-arrival tail into a reusable `settle()` so examine runs the event/resource/deadline tail without re-arriving. A prior, separate step fixes the runtime profile-inheritance gap at its root so this dimension writes zero papering lints.

**Tech Stack:** TypeScript (strict), Vitest, Node. Windows + Git Bash/PowerShell. No new dependencies.

## Global Constraints

- **TDD always:** failing test → run-it-fails → minimal impl → run-it-passes → commit. One behavior per test.
- **Opt-in inertness:** `investigation:'off'` (every existing game) must stay **behaviorally inert** — nothing injected. Zero existing tests change except (a) `profile.test.ts` resolved-object assertions gain `investigation:'off'`, (b) any exact `statesExplored` assertion on an untimed game (Task 7's `timeKeyFor` change), (c) the retired `ROAM_CHAPTER_PROFILE_MISSING` test (Task 1).
- **Reserved prefix:** injected choice ids are `__examine_<id>`; the `__` prefix is already guarded by `RESERVED_CHOICE_ID` — do not re-add that machinery.
- **Verify gate every task:** `npx tsc --noEmit` clean AND `npx vitest run` green before each commit.
- **Naming:** `GameEngine.settle` (Task 3) is a *different method* from the existing `GameRunner.settle` (`GameRunner.ts:40`, chapter transitions) — they live in different classes; do not merge or rename either.
- **No silent caps:** `verifyInvestigation` treats `report.capHit` as fail (via `!report.capHit`, NOT `report.indeterminate`, which is roam-only).
- **Commit messages:** end with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. On Windows, write the message to a file and `git commit -F <file>` to avoid native-arg quote breakage.

---

## File Structure

**Prior step (Task 1) — container, shipped-code touch:**
- Modify `src/container/carry.ts` — `seedChapterStory` stamps the resolved profile.
- Modify `src/container/GameRunner.ts` — pass `game.profile` into `seedChapterStory` (both call sites).
- Modify `src/container/lintGame.ts` — remove the now-obsolete `ROAM_CHAPTER_PROFILE_MISSING` block.
- Modify the test asserting `ROAM_CHAPTER_PROFILE_MISSING` (locate by grep).

**The dimension build (Tasks 2–9):**
- Modify `src/engine/types.ts` — `Examinable`, `StoryNode.examinables`, `Profile.investigation`.
- Create `src/engine/investigation.ts` — prefix + helper functions (mirrors `travel.ts`).
- Modify `src/engine/profile.ts` — `investigationDimension`, `DEFAULT_PROFILE`, `clockReadingHits` sweep.
- Modify `src/engine/engine.ts` — `settle()` refactor, `view()` injection, `choose()` seam, `examine()`.
- Modify `src/engine/symbols.ts` — profile-gated examinable-clue fold-in.
- Modify `src/engine/linter.ts` — examinable condition/effect sweeps, `timeBounds` examine-minutes, `lintInvestigation` call.
- Create `src/engine/investigationLint.ts` — fence + hygiene lints (mirrors `travelLint.ts`).
- Modify `src/engine/stateSpaceWalk.ts` — `timeKeyFor` all-untimed, `satisfiedEndings`, `verifyInvestigation`.
- Modify `src/container/lintGame.ts` — (no new lint; document-only completability).
- Create `src/container/investigationExample.ts` + test — the reference mystery.
- Modify `src/container/index.ts` — export the reference game.
- Create `docs/authoring/investigation.md` — the authoring guide.
- Modify `src/engine/index.ts` (barrel) — export the new symbols (`Examinable`, `verifyInvestigation`, investigation helpers, `lintInvestigation`) as needed.

---

### Task 1: PRIOR STEP — fix the runtime profile-inheritance gap at the root

**Why first:** `GameEngine` reads only `story.profile`; `seedChapterStory` never stamps the inherited `game.profile`, so a multi-chapter game's chapters silently lose their dimension at runtime. Travel papered this with `ROAM_CHAPTER_PROFILE_MISSING`. Fixing the root removes the silent-failure class for **all** dimensions and lets investigation add **zero** papering lints. This touches shipped travel code, so it is its own reviewed step.

**Files:**
- Modify: `src/container/carry.ts` (`seedChapterStory`, ~line 31-63)
- Modify: `src/container/GameRunner.ts` (`startChapter` line 34, `restore` line 102)
- Modify: `src/container/lintGame.ts` (remove lines 55-59, the `ROAM_CHAPTER_PROFILE_MISSING` block)
- Test: `src/container/carry.test.ts` (or the existing container test file — locate the seed tests) and the existing `ROAM_CHAPTER_PROFILE_MISSING` test (grep to find it).

**Interfaces:**
- Produces: `seedChapterStory(story, carry, gameElapsedMinutes, gameDeadlineMinutes?, gameProfile?)` — now stamps `s.profile = resolveProfile(story, gameProfile)`.

- [ ] **Step 1: Write the failing test** — a single-chapter game whose `travel:'free'` lives ONLY in `game.profile` (bare chapter) must actually roam at runtime.

In `src/container/carry.test.ts` (add):

```ts
import { describe, it, expect } from 'vitest';
import { seedChapterStory } from './carry';
import type { Story } from '../engine';

const bareStory: Story = {
  id: 's', title: 'S', startNodeId: 'a', startTime: '09:00', startLocation: 'L',
  variables: [], nodes: [{ id: 'a', title: 'A', body: '', choices: [] }],
  locations: [{ id: 'L', name: 'L' }], events: [], endings: [{ id: 'e', name: 'E', conditions: [], summary: '', isDefault: true }],
  // NOTE: no profile declared on the story
};

describe('seedChapterStory profile stamp', () => {
  it('stamps the resolved profile (inherited from the game) onto the seeded story', () => {
    const seeded = seedChapterStory(bareStory, { vars: {}, clues: [], inventory: [] }, 0, undefined, { clock: 'timed', travel: 'free' });
    expect(seeded.profile?.travel).toBe('free');
    expect(seeded.profile?.clock).toBe('timed');
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npx vitest run src/container/carry.test.ts -t "stamps the resolved profile"`
Expected: FAIL — `seeded.profile` is `undefined` (no `gameProfile` param yet; story has no profile).

- [ ] **Step 3: Implement the stamp in `seedChapterStory`**

In `src/container/carry.ts`: add `resolveProfile` to the import from `../engine` and a `gameProfile` param, and stamp at the end:

```ts
import { parseTime, resolveProfile } from '../engine';
import type { Story, Effect, WorldState, Primitive, Profile } from '../engine';
```

Change the signature and add the stamp before `return s;`:

```ts
export function seedChapterStory(
  story: Story,
  carry: CarriedState,
  gameElapsedMinutes: number,
  gameDeadlineMinutes?: number,
  gameProfile?: Profile,
): Story {
  const s: Story = JSON.parse(JSON.stringify(story)) as Story;
  // ... existing variable/resource/clue/deadline rewriting unchanged ...

  // Stamp the RESOLVED profile so the engine (which reads only story.profile) honors inherited dimensions
  // (travel/investigation) at runtime. Precedence: the chapter's own profile wins over the game profile.
  s.profile = resolveProfile(story, gameProfile);

  return s;
}
```

- [ ] **Step 4: Pass `game.profile` from both `GameRunner` call sites**

In `src/container/GameRunner.ts`, line 34 (`startChapter`):

```ts
const seeded = seedChapterStory(ch.story, carry, this.gameElapsedMinutes, this.game.gameDeadlineMinutes, this.game.profile);
```

And line 102 (`restore`):

```ts
const seeded = seedChapterStory(ch.story, snap.carriedIn, snap.gameElapsedMinutes, this.game.gameDeadlineMinutes, this.game.profile);
```

- [ ] **Step 5: Run the new test — verify it passes**

Run: `npx vitest run src/container/carry.test.ts -t "stamps the resolved profile"`
Expected: PASS.

- [ ] **Step 6: Remove the obsolete `ROAM_CHAPTER_PROFILE_MISSING` block**

In `src/container/lintGame.ts`, delete lines 55-59 (the `// the engine reads only story.profile…` comment and the `if (resolveProfile(ch.story).travel !== 'free')` push). Keep the `ROAM_CARRY_UNVERIFIABLE` multi-chapter fence above it. The loop becomes:

```ts
  const multiChapter = game.chapters.length > 1;
  for (const ch of game.chapters) {
    const resolved = resolveProfile(ch.story, game.profile).travel;
    if (resolved !== 'free') continue;
    if (multiChapter) {
      errors.push({ level: 'error', code: 'ROAM_CARRY_UNVERIFIABLE',
        message: `chapter ${ch.id} is travel:'free' inside a ${game.chapters.length}-chapter game — multi-chapter roam is unsupported in v1 (keep roam games single-chapter)`, where: ch.id });
    }
  }
```

- [ ] **Step 7: Update the retired-lint test → a positive "stamp resolves it" test**

Run: `npx vitest run -t "ROAM_CHAPTER_PROFILE_MISSING"` to find the asserting test. Replace its assertion: a single-chapter game declaring `travel:'free'` ONLY in `game.profile` (bare chapter) must now **lint clean** (no `ROAM_CHAPTER_PROFILE_MISSING`) AND a `GameRunner` over it must inject a travel choice at the hub. Example assertion to add (adapt to the existing fixture):

```ts
it('a game-profile-only roam chapter now lints clean and roams at runtime (root profile stamp)', () => {
  const game = makeSingleChapterRoamGameWithProfileOnlyOnGame(); // travel:'free' only on game.profile
  const r = lintGame(game);
  expect(r.errors.find((e) => e.code === 'ROAM_CHAPTER_PROFILE_MISSING')).toBeUndefined();
  const runner = new GameRunner(game);
  expect(runner.view().choices.some((c) => c.id.startsWith('__travel_'))).toBe(true);
});
```

- [ ] **Step 8: Full verify + commit**

Run: `npx tsc --noEmit` (expect clean) then `npx vitest run` (expect all green).
Commit (message file ends with the Co-Authored-By line):

```bash
git add src/container/carry.ts src/container/GameRunner.ts src/container/lintGame.ts src/container/carry.test.ts <the-updated-test-file>
git commit -F <msgfile>   # "refactor(container): stamp resolved profile in seedChapterStory; retire ROAM_CHAPTER_PROFILE_MISSING"
```

---

### Task 2: Types + the `investigation.ts` helper module + dimension registration

**Files:**
- Modify: `src/engine/types.ts` (add `Examinable`, `StoryNode.examinables`, `Profile.investigation`)
- Create: `src/engine/investigation.ts`
- Modify: `src/engine/profile.ts` (`investigationDimension`, `DIMENSIONS`, `DEFAULT_PROFILE`)
- Modify: `src/engine/index.ts` (barrel — export `Examinable` type + the investigation helpers)
- Test: `src/engine/investigation.test.ts` (new); `src/engine/profile.test.ts` (assertion churn)

**Interfaces:**
- Produces: `interface Examinable { id; label; clue; reveal; minutes?; conditions? }`; `StoryNode.examinables?: Examinable[]`; `Profile.investigation?: 'off' | 'on'`.
- Produces: `EXAMINE_PREFIX = '__examine_'`; `examineChoiceId(id): string`; `parseExamineTarget(choiceId): string | undefined`; `examinablesAt(node: StoryNode, state: WorldState): Examinable[]`; `examineEffects(ex: Examinable): Effect[]`.
- Consumes: `evaluateConditions` (`conditions.ts`), `Condition`/`Effect`/`WorldState`/`StoryNode` (`types.ts`).

- [ ] **Step 1: Add the types** in `src/engine/types.ts`

```ts
export interface Examinable {
  id: string;                 // hotspot id; injected choice is `__examine_<id>`
  label: string;              // "Search the desk"
  clue: string;               // the clue added when taken
  reveal: string;             // prose surfaced (to the log) when taken
  minutes?: number;           // optional time cost; meaningful only under clock:'timed' (monotonic, >= 0)
  conditions?: Condition[];   // optional extra gate
}
```

Add to `StoryNode`: `examinables?: Examinable[];`
Add to `Profile`: `investigation?: 'off' | 'on'; // scene examination; default 'off'`

- [ ] **Step 2: Write the failing test** for the helpers, `src/engine/investigation.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { EXAMINE_PREFIX, examineChoiceId, parseExamineTarget, examinablesAt, examineEffects } from './investigation';
import type { StoryNode, WorldState, Examinable } from './types';

const base: WorldState = { time: 0, location: 'L', clues: [], inventory: [], visited: [], completedEvents: [], vars: {} };
const desk: Examinable = { id: 'desk', label: 'Search the desk', clue: 'receipt', reveal: 'A receipt.', minutes: 10 };
const node: StoryNode = { id: 'study', title: '', body: '', choices: [], examinables: [desk] };

describe('investigation helpers', () => {
  it('round-trips the choice id', () => {
    expect(examineChoiceId('desk')).toBe(`${EXAMINE_PREFIX}desk`);
    expect(parseExamineTarget(`${EXAMINE_PREFIX}desk`)).toBe('desk');
    expect(parseExamineTarget('go_north')).toBeUndefined();
  });
  it('offers a hotspot whose clue is unheld, hides it once held', () => {
    expect(examinablesAt(node, base).map((e) => e.id)).toEqual(['desk']);
    expect(examinablesAt(node, { ...base, clues: ['receipt'] })).toEqual([]);
  });
  it('honors examinable conditions', () => {
    const gated: Examinable = { id: 'safe', label: 'Open safe', clue: 'cash', reveal: '$', conditions: [{ field: 'has_key', op: 'is_true' }] };
    const n2 = { ...node, examinables: [gated] };
    expect(examinablesAt(n2, base)).toEqual([]);
    expect(examinablesAt(n2, { ...base, vars: { has_key: true } }).map((e) => e.id)).toEqual(['safe']);
  });
  it('builds add_clue + add_minutes effects', () => {
    expect(examineEffects(desk)).toEqual([
      { field: 'clues', op: 'add_clue', value: 'receipt' },
      { field: 'time', op: 'add_minutes', value: '10' },
    ]);
    expect(examineEffects({ id: 'x', label: '', clue: 'c', reveal: '' })).toEqual([{ field: 'clues', op: 'add_clue', value: 'c' }]);
  });
});
```

- [ ] **Step 3: Run it — verify it fails**

Run: `npx vitest run src/engine/investigation.test.ts`
Expected: FAIL — `investigation.ts` does not exist.

- [ ] **Step 4: Implement `src/engine/investigation.ts`**

```ts
import type { StoryNode, WorldState, Examinable, Effect } from './types';
import { evaluateConditions } from './conditions';

export const EXAMINE_PREFIX = '__examine_';

export function examineChoiceId(id: string): string {
  return `${EXAMINE_PREFIX}${id}`;
}

export function parseExamineTarget(choiceId: string): string | undefined {
  return choiceId.startsWith(EXAMINE_PREFIX) ? choiceId.slice(EXAMINE_PREFIX.length) : undefined;
}

/** Available hotspots at a node: clue not yet held AND conditions pass, in declared order. */
export function examinablesAt(node: StoryNode, state: WorldState): Examinable[] {
  return (node.examinables ?? []).filter(
    (ex) => !state.clues.includes(ex.clue) && evaluateConditions(ex.conditions, state),
  );
}

/** The effects taking a hotspot applies: add the clue, then (if any) pay the time. */
export function examineEffects(ex: Examinable): Effect[] {
  const effects: Effect[] = [{ field: 'clues', op: 'add_clue', value: ex.clue }];
  if (ex.minutes !== undefined) effects.push({ field: 'time', op: 'add_minutes', value: String(ex.minutes) });
  return effects;
}
```

- [ ] **Step 5: Run it — verify it passes**

Run: `npx vitest run src/engine/investigation.test.ts`
Expected: PASS.

- [ ] **Step 6: Register the dimension** in `src/engine/profile.ts`

Add after `travelDimension`:

```ts
export const investigationDimension: Dimension = {
  id: 'investigation',
  values: ['off', 'on'],
  default: 'off',
  // Investigation's lints (fence + hygiene) live in investigationLint.ts, called from lintStory — the
  // Dimension.validate hook is error-only and lacks lint context, same pattern as travel.
  validate: () => [],
};
```

Change `const DIMENSIONS: Dimension[] = [clockDimension, travelDimension];` to include `investigationDimension`. (`DEFAULT_PROFILE` is derived from `DIMENSIONS`, so it now includes `investigation:'off'` automatically.)

- [ ] **Step 7: Fix the `profile.test.ts` assertion churn**

Run: `npx vitest run src/engine/profile.test.ts` — failures will be exact-object assertions like `toEqual({ clock: 'timed', travel: 'off' })`. Update each to include `investigation: 'off'`.

- [ ] **Step 8: Export from the barrel** `src/engine/index.ts` — add `Examinable` to the type exports and re-export the investigation helpers (mirror how `travel.ts` symbols are exported). Then `npx tsc --noEmit`.

- [ ] **Step 9: Full verify + commit**

Run: `npx tsc --noEmit` then `npx vitest run`. Expected: green.

```bash
git add src/engine/types.ts src/engine/investigation.ts src/engine/profile.ts src/engine/index.ts src/engine/investigation.test.ts src/engine/profile.test.ts
git commit -F <msgfile>   # "feat(investigation): types, helper module, dimension registration"
```

---

### Task 3: Engine — factor `enter()`'s tail into `settle()` (pure, behavior-preserving refactor)

**Files:**
- Modify: `src/engine/engine.ts` (`enter()` lines 42-71)
- Test: existing `src/engine/engine.test.ts` + `integration.test.ts` are the regression guard (no new test; this task changes NO behavior).

**Interfaces:**
- Produces: `private settle(id: string): void` — the post-arrival tail (scheduled events + routing, resource step, ending resolution). `enter(id)` = set currentId + entryEffects + visited + `settle(id)`.

- [ ] **Step 1: Refactor** `enter()` in `src/engine/engine.ts`. Replace lines 42-71 with:

```ts
  private enter(id: string): void {
    this.currentId = id;
    const n = this.node(id);
    this.state = applyEffects(this.state, n.entryEffects, this.bounds);
    if (!this.state.visited.includes(id)) {
      this.state = { ...this.state, visited: [...this.state.visited, id] };
    }
    this.settle(id);
  }

  // The post-arrival tail, reusable by examine (which advances time in place and must run events/resources/
  // ending resolution WITHOUT re-applying entryEffects or re-marking visited). Distinct from GameRunner.settle.
  private settle(id: string): void {
    const n = this.node(id);
    // Scheduled events fire from world-time, judged after entry effects so any clock advance is seen once.
    const res = checkScheduledEvents(this.state, this.story, this.bounds);
    this.state = res.state;
    if (res.log.length) this.log.push(...res.log);
    if (res.routedNodeId && res.routedNodeId !== id) {
      this.enter(res.routedNodeId);   // a present event legitimately MOVES the player: full enter of the routed node
      return;
    }
    const rstep = applyResourceStep(this.state, this.story, this.startTime);
    this.state = rstep.state;
    if (rstep.log.length) this.log.push(...rstep.log);
    const pastDeadline = this.state.time >= this.deadline;
    if (!this.ending && (n.resolvesEnding || n.endsWith || rstep.atZeroEndingId || pastDeadline)) {
      this.ending = resolveEndingAt(this.state, this.story, n, rstep.atZeroEndingId, pastDeadline);
      if (this.ending) this.log.push(`Ending: ${this.ending.id}`);
    }
  }
```

- [ ] **Step 2: Run the full engine + integration suites — verify still green (no behavior change)**

Run: `npx vitest run src/engine/engine.test.ts src/engine/integration.test.ts src/engine/scheduledEvents.test.ts`
Expected: PASS (identical behavior). If any fails, the refactor diverged from the original tail — diff against lines 42-71 of the original.

- [ ] **Step 3: Full verify + commit**

Run: `npx tsc --noEmit` then `npx vitest run`. Expected: green.

```bash
git add src/engine/engine.ts
git commit -F <msgfile>   # "refactor(engine): factor enter() tail into reusable settle()"
```

---

### Task 4: Engine — examine injection (`view()`) + the `choose()` seam + `examine()`

**Files:**
- Modify: `src/engine/engine.ts` (`view()` ~77-104; `choose()` ~106-119; add `examine()`)
- Test: `src/engine/investigationEngine.test.ts` (new)

**Interfaces:**
- Consumes: `examinablesAt`, `examineChoiceId`, `parseExamineTarget`, `examineEffects` (Task 2).
- Produces: examine choices in `view().choices` when `investigation:'on' && !ending`; `choose('__examine_<id>')` applies the clue/time, logs the reveal, settles in place.

- [ ] **Step 1: Write the failing tests**, `src/engine/investigationEngine.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { GameEngine } from './engine';
import type { Story } from './types';

function study(profile: Story['profile'], opts: { minutes?: number; deadline?: string } = {}): Story {
  return {
    id: 's', title: 'S', startNodeId: 'study', startTime: '09:00', startLocation: 'L',
    deadline: opts.deadline, profile,
    variables: [],
    nodes: [{
      id: 'study', title: 'Study', body: 'A dim study.', examinables: [
        { id: 'desk', label: 'Search the desk', clue: 'receipt', reveal: 'A debt receipt.', minutes: opts.minutes },
      ],
      choices: [{ id: 'leave', label: 'Leave', destination: 'hall' }],
    }, { id: 'hall', title: 'Hall', body: '', choices: [], resolvesEnding: true }],
    locations: [{ id: 'L', name: 'L' }], events: [],
    endings: [{ id: 'end', name: 'E', conditions: [], summary: '', isDefault: true }],
  };
}

describe('investigation engine', () => {
  it('injects an examine choice only when investigation:on', () => {
    expect(new GameEngine(study({ clock: 'untimed' })).view().choices.map((c) => c.id)).toEqual(['leave']);
    const on = new GameEngine(study({ clock: 'untimed', investigation: 'on' }));
    expect(on.view().choices.map((c) => c.id)).toEqual(['leave', '__examine_desk']); // appended after authored
  });
  it('taking a hotspot adds the clue, logs the reveal, retires it, and stays in the scene', () => {
    const g = new GameEngine(study({ clock: 'untimed', investigation: 'on' }));
    const v = g.choose('__examine_desk');
    expect(v.state.clues).toContain('receipt');
    expect(v.log.some((l) => l.includes('debt receipt'))).toBe(true);
    expect(v.node.id).toBe('study');                                  // did not move
    expect(v.choices.map((c) => c.id)).toEqual(['leave']);            // hotspot retired
  });
  it('a costly examine that crosses the deadline ends the game mid-search (settle on examine)', () => {
    const g = new GameEngine(study({ clock: 'timed', investigation: 'on' }, { minutes: 120, deadline: '09:30' }));
    const v = g.choose('__examine_desk');                             // +120 min crosses 09:30
    expect(v.endingReached?.id).toBe('end');
  });
  it('throws on an unavailable examine id (clue already held)', () => {
    const g = new GameEngine(study({ clock: 'untimed', investigation: 'on' }));
    g.choose('__examine_desk');
    expect(() => g.choose('__examine_desk')).toThrow();
  });
});
```

- [ ] **Step 2: Run them — verify they fail**

Run: `npx vitest run src/engine/investigationEngine.test.ts`
Expected: FAIL — examine choices not injected; `choose('__examine_desk')` throws "Unknown choice".

- [ ] **Step 3: Implement injection + the seam** in `src/engine/engine.ts`

Add imports:

```ts
import { parseExamineTarget, examinablesAt, examineChoiceId, examineEffects } from './investigation';
```

In `view()`, after the existing `if (this.profile.travel === 'free' && !this.ending) { … }` block and before the `return`:

```ts
    if (this.profile.investigation === 'on' && !this.ending) {
      for (const ex of examinablesAt(n, this.state)) {
        choices.push({ id: examineChoiceId(ex.id), label: ex.label, available: true });
      }
    }
```

In `choose()`, after the `__travel_` branch (`if (dest !== undefined) return this.travelTo(dest);`) and before `const n = this.node(...)`:

```ts
    const exTarget = parseExamineTarget(choiceId);
    if (exTarget !== undefined) return this.examine(exTarget);
```

Add the `examine()` method (next to `travelTo`):

```ts
  private examine(targetId: string): GameView {
    if (this.profile.investigation !== 'on') throw new Error(`Investigation is off; cannot examine ${targetId}`);
    const n = this.node(this.currentId);
    const ex = examinablesAt(n, this.state).find((e) => e.id === targetId);
    if (!ex) throw new Error(`No available examinable '${targetId}' at node ${this.currentId}`);
    this.state = applyEffects(this.state, examineEffects(ex), this.bounds);
    this.log.push(ex.reveal);
    this.settle(this.currentId);  // run events/resources/deadline tail WITHOUT re-arriving the node
    return this.view();
  }
```

- [ ] **Step 4: Run them — verify they pass**

Run: `npx vitest run src/engine/investigationEngine.test.ts`
Expected: PASS.

- [ ] **Step 5: Confirm inertness — full suite green**

Run: `npx tsc --noEmit` then `npx vitest run`. Expected: all green (no existing game sets `investigation:'on'`).

- [ ] **Step 6: Commit**

```bash
git add src/engine/engine.ts src/engine/investigationEngine.test.ts
git commit -F <msgfile>   # "feat(investigation): inject __examine_ choices + choose() seam + examine()"
```

---

### Task 5: Static linter — examinable-awareness (clues, condition sweeps, time bounds)

**Files:**
- Modify: `src/engine/symbols.ts` (`collectSymbols` — profile-gated examinable clue fold-in)
- Modify: `src/engine/linter.ts` (reorder profile/symbols; sweep `examinables` in 3 condition passes + `checkTimeDeltas`; `timeBounds` examine minutes)
- Modify: `src/engine/profile.ts` (`clockReadingHits` — sweep `examinable.conditions`)
- Test: `src/engine/investigationLint.test.ts` (new; static-lint half)

**Interfaces:**
- Consumes: `Profile` (types), `resolveProfile` (profile.ts).
- Produces: `collectSymbols(story, profile?)` includes examinable clues iff `profile?.investigation === 'on'`.

- [ ] **Step 1: Write the failing tests**, `src/engine/investigationLint.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { lintStory } from './linter';
import type { Story } from './types';

function mystery(over: Partial<Story> = {}): Story {
  return {
    id: 's', title: 'S', startNodeId: 'study', startTime: '09:00', deadline: '10:00',
    startLocation: 'L', profile: { clock: 'timed', investigation: 'on' }, variables: [],
    nodes: [{
      id: 'study', title: '', body: '', examinables: [{ id: 'desk', label: 'Desk', clue: 'receipt', reveal: 'r', minutes: 10 }],
      choices: [{ id: 'accuse', label: 'Accuse', destination: 'end_node', conditions: [{ field: 'receipt', op: 'has_clue' }] }],
    }, { id: 'end_node', title: '', body: '', choices: [], resolvesEnding: true }],
    locations: [{ id: 'L', name: 'L' }], events: [],
    endings: [
      { id: 'win', name: 'W', conditions: [{ field: 'receipt', op: 'has_clue' }], priority: 1, summary: '' },
      { id: 'def', name: 'D', conditions: [], summary: '', isDefault: true },
    ],
    ...over,
  };
}

describe('investigation static lints', () => {
  it('a has_clue gate satisfied only by an examinable does NOT trip DEAD_CLUE_REFERENCE (investigation:on)', () => {
    const r = lintStory(mystery());
    expect(r.errors.find((e) => e.code === 'DEAD_CLUE_REFERENCE')).toBeUndefined();
    expect(r.errors.find((e) => e.code === 'SOFT_LOCK')).toBeUndefined();   // accuse-gated-on-examinable-clue is live
  });
  it('the SAME story under investigation:off DOES trip DEAD_CLUE_REFERENCE (clue unproducible at runtime)', () => {
    const r = lintStory(mystery({ profile: { clock: 'timed', investigation: 'off' } }));
    expect(r.errors.find((e) => e.code === 'DEAD_CLUE_REFERENCE')).toBeDefined();
  });
  it('a negative examinable minutes trips NEGATIVE_TIME_DELTA', () => {
    const r = lintStory(mystery({
      nodes: [{ id: 'study', title: '', body: '', examinables: [{ id: 'd', label: '', clue: 'c', reveal: '', minutes: -5 }], choices: [{ id: 'x', label: '', destination: 'end_node' }] },
               { id: 'end_node', title: '', body: '', choices: [], resolvesEnding: true }],
      endings: [{ id: 'def', name: 'D', conditions: [], summary: '', isDefault: true }],
    }));
    expect(r.errors.find((e) => e.code === 'NEGATIVE_TIME_DELTA')).toBeDefined();
  });
  it('a clock-reading examinable condition under clock:untimed trips PROFILE_UNTIMED_HAS_TIME_CONDITION', () => {
    const r = lintStory(mystery({
      profile: { clock: 'untimed', investigation: 'on' }, deadline: undefined,
      nodes: [{ id: 'study', title: '', body: '', examinables: [{ id: 'd', label: '', clue: 'c', reveal: '', conditions: [{ field: 'time', op: 'time_after', value: '09:30' }] }], choices: [{ id: 'x', label: '', destination: 'end_node' }] },
               { id: 'end_node', title: '', body: '', choices: [], resolvesEnding: true }],
      endings: [{ id: 'def', name: 'D', conditions: [], summary: '', isDefault: true }],
    }));
    expect(r.errors.find((e) => e.code === 'PROFILE_UNTIMED_HAS_TIME_CONDITION')).toBeDefined();
  });
  it('CLOCK_CANNOT_BITE does NOT trip when examine costs alone can exhaust the window', () => {
    // window 60 min; authored path is 0 min, but two 40-min hotspots make maxTime 80 >= 60.
    const r = lintStory(mystery({
      nodes: [{ id: 'study', title: '', body: '', examinables: [
        { id: 'a', label: '', clue: 'ca', reveal: '', minutes: 40 }, { id: 'b', label: '', clue: 'cb', reveal: '', minutes: 40 }],
        choices: [{ id: 'x', label: '', destination: 'end_node' }] },
        { id: 'end_node', title: '', body: '', choices: [], resolvesEnding: true }],
      endings: [{ id: 'def', name: 'D', conditions: [], summary: '', isDefault: true }],
    }));
    expect(r.errors.find((e) => e.code === 'CLOCK_CANNOT_BITE')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run them — verify they fail**

Run: `npx vitest run src/engine/investigationLint.test.ts`
Expected: FAIL — examinable clues not in `producibleClues`; examinable conditions/minutes unswept; `timeBounds` ignores examine.

- [ ] **Step 3: Profile-gate the clue fold-in** in `src/engine/symbols.ts`

```ts
import type { Story, Effect, Profile } from './types';
// ...
export function collectSymbols(story: Story, profile?: Profile): StorySymbols {
  const producibleClues = new Set<string>();
  // ... existing effect scan unchanged ...
  if (profile?.investigation === 'on') {
    for (const n of story.nodes) for (const ex of n.examinables ?? []) producibleClues.add(ex.clue);
  }
  // ... return unchanged ...
}
```

- [ ] **Step 4: Reorder + pass profile, sweep examinables, fix `timeBounds`** in `src/engine/linter.ts`

(a) In `lintStory`, compute `profile` BEFORE `collectSymbols` and pass it:

```ts
  const profile = resolveProfile(story, inherited);
  const sym = collectSymbols(story, profile);
  const travelEdges = travelNodeEdges(story, profile);
  const hops = travelHops(story, profile);
```

(b) Sweep `examinables` in the three condition passes + the time-delta pass. After each existing `for (const c of n.choices || []) { checkConds(c.conditions, c.id); … }` style loop, add the examinable equivalents. Concretely, in the four sweep loops add:

```ts
  // checkConds / checkCondTypes / checkTimeLiterals loops — add inside `for (const n of story.nodes) { … }`:
  for (const ex of n.examinables ?? []) checkConds(ex.conditions, `${n.id}:examine:${ex.id}`);
  for (const ex of n.examinables ?? []) checkCondTypes(ex.conditions, `${n.id}:examine:${ex.id}`);
  for (const ex of n.examinables ?? []) checkTimeLiterals(ex.conditions, `${n.id}:examine:${ex.id}`);
  // checkTimeDeltas loop — examinable.minutes as an add_minutes-equivalent delta:
  for (const ex of n.examinables ?? []) if (ex.minutes !== undefined) checkTimeDeltas([{ field: 'time', op: 'add_minutes', value: String(ex.minutes) }], `${n.id}:examine:${ex.id}`);
```

(Note: `checkTimeLiterals` is defined inside the `if (profile.clock === 'timed' …)` block; add the examinable sweep there alongside its node/choice sweeps.)

(c) Make `timeBounds` count examine minutes into `maxTime` only (track a parallel `accMax`):

```ts
function timeBounds(story: Story, hops: Map<string, { dest: string; minutes: number }[]>): { maxTime: number; minTime: number } {
  const byId = new Map(story.nodes.map((n) => [n.id, n]));
  let maxTime = 0;
  let minTime = Infinity;
  const dfs = (id: string, acc: number, accMax: number, path: Set<string>): void => {
    const n = byId.get(id);
    const choices = n?.choices ?? [];
    const travel = hops.get(id) ?? [];
    const examineMin = (n?.examinables ?? []).reduce((a, e) => a + (e.minutes ?? 0), 0);
    if (!n || n.resolvesEnding || (choices.length === 0 && travel.length === 0) || path.has(id)) {
      maxTime = Math.max(maxTime, accMax + examineMin);
      minTime = Math.min(minTime, acc);
      return;
    }
    const np = new Set(path);
    np.add(id);
    for (const c of choices) dfs(c.destination, acc + choiceMinutes(c), accMax + examineMin + choiceMinutes(c), np);
    for (const h of travel) dfs(h.dest, acc + h.minutes, accMax + examineMin + h.minutes, np);
  };
  dfs(story.startNodeId, 0, 0, new Set());
  if (minTime === Infinity) minTime = 0;
  return { maxTime, minTime };
}
```

(For non-investigation stories `examineMin` is always 0, so `accMax === acc` — behavior is identical.)

- [ ] **Step 5: Sweep `examinable.conditions` in `clockReadingHits`** (`src/engine/profile.ts`)

In `clockReadingHits`, inside `for (const n of story.nodes) { … }`, add:

```ts
    for (const ex of n.examinables ?? []) scan(ex.conditions, `examinable ${ex.id}`);
```

- [ ] **Step 6: Run the tests — verify they pass**

Run: `npx vitest run src/engine/investigationLint.test.ts`
Expected: PASS.

- [ ] **Step 7: Full verify + commit**

Run: `npx tsc --noEmit` then `npx vitest run`. Expected: green.

```bash
git add src/engine/symbols.ts src/engine/linter.ts src/engine/profile.ts src/engine/investigationLint.test.ts
git commit -F <msgfile>   # "feat(investigation): static-lint awareness (clues, condition sweeps, examine time bounds)"
```

---

### Task 6: `investigationLint.ts` — fence + hygiene lints, merged into `lintStory`

**Files:**
- Create: `src/engine/investigationLint.ts`
- Modify: `src/engine/linter.ts` (call `lintInvestigation` in `lintStory`, like `lintTravel`)
- Modify: `src/engine/index.ts` (export `lintInvestigation`)
- Test: append to `src/engine/investigationLint.test.ts`

**Interfaces:**
- Produces: `lintInvestigation(story: Story, profile: Profile): LintIssue[]` — codes: `INVESTIGATION_WITH_TRAVEL_UNVERIFIED`, `EXAMINE_DUPLICATE_HOTSPOT`, `EXAMINE_EMPTY_CLUE`, `EXAMINE_ON_TERMINAL_NODE`, `EXAMINE_CLUE_UNUSED`, `INVESTIGATION_MINUTES_UNTIMED`, `EXAMINABLES_IGNORED`.

- [ ] **Step 1: Write the failing tests** (append to `src/engine/investigationLint.test.ts`)

```ts
import { lintInvestigation } from './investigationLint';

describe('lintInvestigation', () => {
  const node = (examinables: any[], extra: any = {}) => ({ id: 'study', title: '', body: '', choices: [{ id: 'x', label: '', destination: 'study' }], examinables, ...extra });
  const story = (examinables: any[], profile: any, extra: any = {}): any => ({
    id: 's', title: 'S', startNodeId: 'study', startTime: '09:00', startLocation: 'L', profile, variables: [],
    nodes: [node(examinables, extra)], locations: [{ id: 'L', name: 'L' }], events: [],
    endings: [{ id: 'd', name: 'D', conditions: [], summary: '', isDefault: true }],
  });
  const on = { clock: 'untimed', investigation: 'on' };

  it('fences investigation + travel', () => {
    const s = story([{ id: 'a', label: '', clue: 'c', reveal: '' }], { clock: 'untimed', investigation: 'on', travel: 'free' });
    expect(lintInvestigation(s, s.profile).find((i) => i.code === 'INVESTIGATION_WITH_TRAVEL_UNVERIFIED')).toBeDefined();
  });
  it('flags duplicate hotspot ids and empty clues', () => {
    const s = story([{ id: 'a', label: '', clue: 'c', reveal: '' }, { id: 'a', label: '', clue: '', reveal: '' }], on);
    const codes = lintInvestigation(s, s.profile).map((i) => i.code);
    expect(codes).toContain('EXAMINE_DUPLICATE_HOTSPOT');
    expect(codes).toContain('EXAMINE_EMPTY_CLUE');
  });
  it('warns minutes-under-untimed and examinables-ignored-when-off', () => {
    const s1 = story([{ id: 'a', label: '', clue: 'c', reveal: '', minutes: 5 }], on);
    expect(lintInvestigation(s1, s1.profile).find((i) => i.code === 'INVESTIGATION_MINUTES_UNTIMED')).toBeDefined();
    const s2 = story([{ id: 'a', label: '', clue: 'c', reveal: '' }], { clock: 'untimed', investigation: 'off' });
    expect(lintInvestigation(s2, s2.profile).find((i) => i.code === 'EXAMINABLES_IGNORED')).toBeDefined();
  });
  it('warns an unused examinable clue', () => {
    const s = story([{ id: 'a', label: '', clue: 'orphan', reveal: '' }], on); // no has_clue reads 'orphan'
    expect(lintInvestigation(s, s.profile).find((i) => i.code === 'EXAMINE_CLUE_UNUSED')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run them — verify they fail**

Run: `npx vitest run src/engine/investigationLint.test.ts -t "lintInvestigation"`
Expected: FAIL — module/function missing.

- [ ] **Step 3: Implement `src/engine/investigationLint.ts`**

```ts
import type { Story, Profile, LintIssue, Condition } from './types';

const issue = (level: 'error' | 'warning', code: string, message: string, where?: string): LintIssue =>
  ({ level, code, message, where });

function clueIsRead(story: Story, clue: string): boolean {
  const reads = (cs: Condition[] | undefined) => (cs ?? []).some((c) => c.op === 'has_clue' && (c.value ?? c.field) === clue);
  for (const n of story.nodes) {
    if (reads(n.conditions)) return true;
    for (const c of n.choices ?? []) if (reads(c.conditions)) return true;
    for (const ex of n.examinables ?? []) if (reads(ex.conditions)) return true;
  }
  for (const ev of story.events) if (reads(ev.trigger)) return true;
  for (const en of story.endings) if (reads(en.conditions)) return true;
  return false;
}

export function lintInvestigation(story: Story, profile: Profile): LintIssue[] {
  const out: LintIssue[] = [];
  const anyExaminables = story.nodes.some((n) => (n.examinables?.length ?? 0) > 0);

  if (profile.investigation !== 'on') {
    if (anyExaminables) out.push(issue('warning', 'EXAMINABLES_IGNORED',
      `examinables are declared but investigation:'off' — the hotspots are inert (forgotten toggle?)`));
    return out;
  }

  if (profile.travel === 'free') out.push(issue('error', 'INVESTIGATION_WITH_TRAVEL_UNVERIFIED',
    `investigation:'on' with travel:'free' is unsupported in v1 — the timed x roam x investigation verification is not built yet`));

  for (const n of story.nodes) {
    const seen = new Set<string>();
    const terminal = !!(n.resolvesEnding || n.endsWith);
    for (const ex of n.examinables ?? []) {
      if (seen.has(ex.id)) out.push(issue('error', 'EXAMINE_DUPLICATE_HOTSPOT', `node ${n.id} has two examinables with id '${ex.id}'`, n.id));
      seen.add(ex.id);
      if (!ex.clue) out.push(issue('error', 'EXAMINE_EMPTY_CLUE', `examinable '${ex.id}' (node ${n.id}) has no clue`, n.id));
      if (terminal) out.push(issue('warning', 'EXAMINE_ON_TERMINAL_NODE', `examinable '${ex.id}' is on terminal node ${n.id} — the injected choice is dead (the ending resolves on entry)`, n.id));
      if (ex.minutes !== undefined && profile.clock === 'untimed') out.push(issue('warning', 'INVESTIGATION_MINUTES_UNTIMED', `examinable '${ex.id}' sets minutes under clock:'untimed' (inert)`, n.id));
      if (ex.clue && !clueIsRead(story, ex.clue)) out.push(issue('warning', 'EXAMINE_CLUE_UNUSED', `examinable '${ex.id}' yields clue '${ex.clue}' that no has_clue condition reads`, n.id));
    }
  }
  return out;
}
```

- [ ] **Step 4: Call it from `lintStory`** (`src/engine/linter.ts`), next to the `lintTravel` call near the end:

```ts
import { lintInvestigation } from './investigationLint';
// ... after the lintTravel merge:
  for (const i of lintInvestigation(story, profile)) {
    if (i.level === 'error') errors.push(i); else warnings.push(i);
  }
```

- [ ] **Step 5: Run + verify pass; export from barrel**

Run: `npx vitest run src/engine/investigationLint.test.ts`
Expected: PASS. Add `lintInvestigation` to `src/engine/index.ts`. `npx tsc --noEmit`.

- [ ] **Step 6: Full verify + commit**

Run: `npx vitest run`. Expected: green (existing games have no examinables → no new warnings).

```bash
git add src/engine/investigationLint.ts src/engine/linter.ts src/engine/index.ts src/engine/investigationLint.test.ts
git commit -F <msgfile>   # "feat(investigation): fence + hygiene lints (investigationLint.ts)"
```

---

### Task 7: Walker — `timeKeyFor` all-untimed, `satisfiedEndings`, `verifyInvestigation`

**Files:**
- Modify: `src/engine/stateSpaceWalk.ts` (`timeKeyFor`; `WalkReport.satisfiedEndings`; `computeSatisfiedEndings`; `verifyInvestigation`)
- Modify: `src/engine/index.ts` (export `verifyInvestigation`, `InvestigationVerifyResult`)
- Test: `src/engine/verifyInvestigation.test.ts` (new); possibly `src/container/untimedExample.test.ts` (state-count churn)

**Interfaces:**
- Consumes: `lintInvestigation` (Task 6), `resolveProfile`.
- Produces: `WalkReport.satisfiedEndings: string[]`; `verifyInvestigation(story, opts?: { cap?: number }): { ok: boolean; report: WalkReport; issues: LintIssue[] }`.

- [ ] **Step 1: Write the failing tests**, `src/engine/verifyInvestigation.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { verifyInvestigation } from './stateSpaceWalk';
import type { Story } from './types';

// A timed study: examine the desk (its clue gates the win), then accuse. minutes/deadline are the knob.
function study(deskMin: number, deadline: string): Story {
  return {
    id: 's', title: 'S', startNodeId: 'study', startTime: '09:00', deadline, startLocation: 'L',
    profile: { clock: 'timed', investigation: 'on' }, variables: [],
    nodes: [
      { id: 'study', title: '', body: '', examinables: [{ id: 'desk', label: 'Desk', clue: 'receipt', reveal: 'r', minutes: deskMin }],
        choices: [{ id: 'accuse', label: 'Accuse', destination: 'verdict' }] },
      { id: 'verdict', title: '', body: '', choices: [], resolvesEnding: true },
    ],
    locations: [{ id: 'L', name: 'L' }], events: [],
    endings: [
      { id: 'win', name: 'W', conditions: [{ field: 'receipt', op: 'has_clue' }], priority: 1, summary: '' },
      { id: 'lose', name: 'L', conditions: [], summary: '', isDefault: true },
    ],
  };
}

describe('verifyInvestigation', () => {
  it('passes when the clue-gated win is reachable with its clue in time', () => {
    const { ok, issues } = verifyInvestigation(study(10, '10:00')); // 10 min examine, 60 min window
    expect(ok).toBe(true);
    expect(issues.find((i) => i.code === 'INVESTIGATION_DEADLINE_UNREACHABLE')).toBeUndefined();
  });
  it('fails INVESTIGATION_DEADLINE_UNREACHABLE when examining blows the deadline', () => {
    const { ok, issues } = verifyInvestigation(study(90, '10:00')); // 90 min examine > 60 min window
    expect(ok).toBe(false);
    expect(issues.find((i) => i.code === 'INVESTIGATION_DEADLINE_UNREACHABLE')).toBeDefined();
  });

  it('P0 GUARD: an endsWith-pinned clue-gated win reached cluelessly-in-time is NOT a false pass', () => {
    // 'win' is pinned by node.endsWith AND carries has_clue(receipt). The accuse path reaches it WITHOUT the
    // clue (examining the desk costs 90 > 60 window). satisfiedEndings (terminal gate re-eval) must reject it.
    const s = study(90, '10:00');
    s.nodes[1].endsWith = 'win';        // verdict node pins 'win' regardless of its conditions
    const { ok, issues } = verifyInvestigation(s);
    expect(ok).toBe(false);
    expect(issues.find((i) => i.code === 'INVESTIGATION_DEADLINE_UNREACHABLE')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run them — verify they fail**

Run: `npx vitest run src/engine/verifyInvestigation.test.ts`
Expected: FAIL — `verifyInvestigation` not exported.

- [ ] **Step 3: Extend `timeKeyFor` to all untimed** (`src/engine/stateSpaceWalk.ts`)

```ts
function timeKeyFor(n: WNode, roam: boolean, untimed: boolean, timeBucket?: number): number {
  if (untimed) return 0;   // untimed forbids clock-reading conditions, so nothing branches on time — drop it always
  const t = n.snap.state.time;
  return timeBucket ? Math.floor(t / timeBucket) : t;
}
```

- [ ] **Step 4: Add `satisfiedEndings` to the report**

In `WalkReport`, add: `satisfiedEndings: string[]; // non-default endings whose conditions hold at some reached terminal`.

Add the helper near `findEndingAmbiguities`:

```ts
function computeSatisfiedEndings(w: WalkResult): string[] {
  const nonDefault = w.story.endings.filter((e) => !e.isDefault);
  const sat = new Set<string>();
  for (const t of w.terminals)
    for (const e of nonDefault)
      if (evaluateConditions(e.conditions, t.snap.state)) sat.add(e.id);
  return [...sat];
}
```

In the `walkStateSpace` return object, add: `satisfiedEndings: computeSatisfiedEndings(w),`.

- [ ] **Step 5: Add `verifyInvestigation`** (bottom of `stateSpaceWalk.ts`)

```ts
import { lintInvestigation } from './investigationLint';

export interface InvestigationVerifyResult { ok: boolean; report: WalkReport; issues: LintIssue[]; }

/** The investigation verify gate. Walks the real engine (examination is walked for free), then certifies timed
 *  completability on gate-SATISFACTION at a terminal (satisfiedEndings), never bare reachedEndings membership. */
export function verifyInvestigation(story: Story, opts?: { cap?: number }): InvestigationVerifyResult {
  const profile = resolveProfile(story);
  const issues = lintInvestigation(story, profile);
  const report = walkStateSpace(story, { cap: opts?.cap });
  const clueGated = story.endings
    .filter((e) => !e.isDefault && (e.conditions ?? []).some((c) => c.op === 'has_clue'))
    .map((e) => e.id);
  const satisfied = new Set(report.satisfiedEndings);
  const completable = profile.clock !== 'timed' || clueGated.length === 0 || clueGated.some((id) => satisfied.has(id));
  if (!completable && !report.capHit) {
    issues.push(issueErr('INVESTIGATION_DEADLINE_UNREACHABLE',
      `No clue-gated success ending is reachable with its clues within the deadline window [${story.startTime}, ${story.deadline}] — the examine costs likely exceed it`));
  }
  const ok = issues.filter((i) => i.level === 'error').length === 0
    && !report.capHit && report.softlocks.length === 0 && completable;
  return { ok, report, issues };
}

function issueErr(code: string, message: string): LintIssue { return { level: 'error', code, message }; }
```

(Ensure `LintIssue` is imported in `stateSpaceWalk.ts` — it already imports from `./types`.)

- [ ] **Step 6: Run the tests — verify they pass**

Run: `npx vitest run src/engine/verifyInvestigation.test.ts`
Expected: PASS — including the P0 guard (the endsWith-pinned win is reached but `satisfiedEndings` excludes it, so completability fails).

- [ ] **Step 7: Fix any untimed state-count churn**

Run: `npx vitest run`. If an untimed game's test asserts an exact `statesExplored` (e.g. `untimedExample.test.ts`), the all-untimed time-drop may lower it — update the expected number. Confirm softlocks/orphans/endings assertions are unchanged. Export `verifyInvestigation` from `src/engine/index.ts`.

- [ ] **Step 8: Full verify + commit**

Run: `npx tsc --noEmit` then `npx vitest run`. Expected: green.

```bash
git add src/engine/stateSpaceWalk.ts src/engine/index.ts src/engine/verifyInvestigation.test.ts <any-updated-count-test>
git commit -F <msgfile>   # "feat(investigation): satisfiedEndings + verifyInvestigation; drop time for all untimed walks"
```

---

### Task 8: Reference game — "The Locked Study" + integration tests

**Files:**
- Create: `src/container/investigationExample.ts`
- Create: `src/container/investigationExample.test.ts`
- Modify: `src/container/index.ts` (export the games)

**Interfaces:**
- Produces: `investigationStudy` (timed `Story`), `investigationStudyUntimed` (`Story`), `investigationStudyUnreachable` (negative `INVESTIGATION_DEADLINE_UNREACHABLE` fixture), `investigationStudyEndsWith` (the P0 endsWith fixture), and a single-chapter `Game` wrapper `investigationExample`.

- [ ] **Step 1: Author the reference mystery** `src/container/investigationExample.ts`

Build "The Locked Study": one location, one study node with four examinables (`debt_receipt`, `ledger_gap`, `safe_combo` load-bearing; `cigar_brand` red herring), two accusation choices (accuse the partner — gated on the three load-bearing clues; accuse the housekeeper — default/wrong), each routing to a `verdict` node that `resolvesEnding`. Endings: `accuse_partner` (priority 1, gates `has_clue(debt_receipt) && has_clue(ledger_gap) && has_clue(safe_combo)`), `wrong_accusation` (default). Timed variant: deadline `10:00` (60 min), each hotspot 10 min — examining all four = 40 min (fits), but the prose treats `cigar_brand` as a time-waster the player should skip. `profile: { clock: 'timed', investigation: 'on' }`. Write `reveal` text in 1–3 sentences each (it renders to the log). Provide the untimed variant (`clock:'untimed'`, no deadline, no minutes), the unreachable variant (each hotspot 30 min, deadline `10:00` → the 3 load-bearing clues need 90 min > 60), and the endsWith P0 variant (verdict node `endsWith:'accuse_partner'`, hotspots 30 min). Wrap the timed one as a single-chapter `Game` (`gameEnding: true`, `carry: { vars:'all', resources:[], clues:false, inventory:false }`, `profile: { clock:'timed', investigation:'on' }`).

- [ ] **Step 2: Write the integration tests** `src/container/investigationExample.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { GameRunner } from './GameRunner';
import { lintGame } from './lintGame';
import { lintStory, verifyInvestigation } from '../engine';
import { investigationExample, investigationStudy, investigationStudyUntimed, investigationStudyUnreachable, investigationStudyEndsWith } from './investigationExample';

describe('The Locked Study', () => {
  it('lints clean (story + game)', () => {
    expect(lintStory(investigationStudy).errors).toEqual([]);
    expect(lintGame(investigationExample).errors).toEqual([]);
  });
  it('verifyInvestigation passes on the clean timed + untimed variants', () => {
    expect(verifyInvestigation(investigationStudy).ok).toBe(true);
    expect(verifyInvestigation(investigationStudyUntimed).ok).toBe(true);
  });
  it('a GameRunner can examine the load-bearing clues and accuse the partner correctly', () => {
    const g = new GameRunner(investigationExample);
    g.choose('__examine_desk');     // debt_receipt
    g.choose('__examine_ledger');   // ledger_gap
    g.choose('__examine_painting'); // safe_combo
    g.choose('accuse_partner');
    expect(g.view().finalEndingId).toBe('accuse_partner');
  });
  it('the negative fixture fails INVESTIGATION_DEADLINE_UNREACHABLE', () => {
    const { ok, issues } = verifyInvestigation(investigationStudyUnreachable);
    expect(ok).toBe(false);
    expect(issues.find((i) => i.code === 'INVESTIGATION_DEADLINE_UNREACHABLE')).toBeDefined();
  });
  it('the endsWith P0 fixture is NOT a false pass', () => {
    expect(verifyInvestigation(investigationStudyEndsWith).ok).toBe(false);
  });
});
```

- [ ] **Step 3: Run — iterate authoring until green**

Run: `npx vitest run src/container/investigationExample.test.ts`
Expected: PASS. Adjust the data (clue ids, choice ids, minutes/deadline) until each assertion holds. Add the exports to `src/container/index.ts`.

- [ ] **Step 4: Full verify + commit**

Run: `npx tsc --noEmit` then `npx vitest run`. Expected: green.

```bash
git add src/container/investigationExample.ts src/container/investigationExample.test.ts src/container/index.ts
git commit -F <msgfile>   # "feat(investigation): 'The Locked Study' reference mystery + integration tests"
```

---

### Task 9: Authoring guide + final whole-suite verification

**Files:**
- Create: `docs/authoring/investigation.md`
- Test: none new — this task's gate is the full suite + typecheck + a guide self-review.

- [ ] **Step 1: Write `docs/authoring/investigation.md`** covering, in order: the examinable shape (`id/label/clue/reveal/minutes?/conditions?`); the self-hiding `!has_clue` rule; coexistence with authored `add_clue`; the **settle-on-examine** semantics (a costly examine can end a timed game or fire an event that routes you out); the **completability guarantee + its honest scope** (winning is structurally possible, NOT that examining everything wins — design red-herrings deliberately). Then the seven Team-flagged author rules: (1) gate the winnable ending with `has_clue` or completability proves nothing; (2) `reveal` renders to the **secondary log** in v1 — keep it 1–3 sentences; (3) write the scene body to read in both the unsearched and fully-searched states (a "scene complete" convention); (4) a worked deadline-vs-examine-cost arithmetic example; (5) `remove_clue` of a hotspot's clue **re-opens** it (gate with a boolean var to prevent re-examination); (6) treat `EXAMINE_CLUE_UNUSED` as an error in a mystery; (7) run **both** `lintStory` and `verifyInvestigation`, per chapter for multi-chapter games. Point at `src/container/investigationExample.ts` as the reference.

- [ ] **Step 2: Guide self-review** — re-read the guide against `investigationExample.ts`; verify every code snippet and field name in the guide matches the actual `Examinable` interface and the reference game (no drifted names).

- [ ] **Step 3: Final whole-suite verification**

Run: `npx tsc --noEmit` (expect clean) then `npx vitest run` (expect ALL green — the full suite, not a filtered run). Record the test count.

- [ ] **Step 4: Commit**

```bash
git add docs/authoring/investigation.md
git commit -F <msgfile>   # "docs(investigation): authoring guide for scene examination"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** dimension type/registration (T2), examinable mechanic + settle (T3/T4), the symbols + four-pass lint sweep + timeBounds fix (T5), the fence + hygiene lints (T6), satisfiedEndings completability + timeKeyFor + verifyInvestigation (T7), reference game + negatives + P0 guard (T8), guide + the seven author rules (T9), and the root-cause profile-stamp prior step (T1). Every rev-2 spec section maps to a task.
- **Placeholder scan:** no TBD/TODO; every code step shows complete code.
- **Type consistency:** `Examinable`/`examinablesAt`/`examineEffects`/`parseExamineTarget` (T2) are consumed verbatim in T4; `WalkReport.satisfiedEndings` (T7) is produced before `verifyInvestigation` reads it; `collectSymbols(story, profile?)` (T5) matches the reordered call. `GameEngine.settle` (T3) is the engine method; `GameRunner.settle` is left untouched.
- **Known sequencing note:** T1 must land first (it touches shipped travel code and is the reason investigation writes no papering lint). T3 (settle refactor) must precede T4 (examine uses settle). T6 (lintInvestigation) must precede T7 (verifyInvestigation imports it).
