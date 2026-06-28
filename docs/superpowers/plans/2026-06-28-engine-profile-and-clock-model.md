# Engine Profile + Clock-Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the profile framework (presets + validator) so a `Story`/`Game` declares its shape; fully work the **clock dimension** (`timed` | `untimed`) as the first example, with zero regression on existing games.

**Architecture:** The `Profile`/`ClockMode` *types* live in `src/engine/types.ts` (no circular import); the *logic* — the `Dimension` interface, the clock dimension, `validateProfile`, and the presets — lives in a new `src/engine/profile.ts`. `lintStory`/`lintGame` become profile-aware (run or skip the clock lints; append validator issues). The single runtime change is `Story.deadline` becoming optional. The container gains `Game.profile`. The cave + heist retrofit as the first profiled games.

**Tech Stack:** TypeScript 5, Vitest 2, the engine (`src/engine/`) + container (`src/container/`).

## Global Constraints

- **Backward-compat is load-bearing:** an absent profile resolves to **`DEFAULT_PROFILE` (`{ clock: 'timed' }`)** — today's exact behavior. **All 305 existing tests must stay green**, and making `deadline` optional must not change any timed behavior.
- **Minimal, deliberate engine change:** only (a) `Story.deadline?` optional + its `pastDeadline` guard, (b) the new `profile.ts` module, (c) the linter's profile-gate. No other engine behavior changes.
- The `Profile`/`ClockMode` types live in `types.ts`; the logic + presets live in `profile.ts` (avoids a circular `types.ts ↔ profile.ts` import).
- Every new lint code carries the **recommendation** (`TIME_PRESSURE_SURVIVAL`) in its message.
- TDD throughout. Every task ends `npx vitest run` green (**un-piped**) + `npx tsc --noEmit` clean + a Conventional-Commits commit. **Nothing is pushed** (local commits only). Branch first (`feature/engine-profile`) — do not implement on `master`.

---

### Task 1: The profile module (`profile.ts`) + the `Profile` type

**Files:**
- Modify: `src/engine/types.ts` (add `ClockMode`, `Profile`; add `Story.profile?`)
- Create: `src/engine/profile.ts`
- Test: `src/engine/profile.test.ts`

**Interfaces:**
- Produces: `ClockMode`, `Profile`, `Story.profile?` (types.ts); `DEFAULT_PROFILE`, `ProfileIssue`, `Dimension`, `clockDimension`, `resolveProfile(story, override?)`, `validateProfile(story, override?)`, `TIME_PRESSURE_SURVIVAL`, `UNTIMED_BRANCHING` (profile.ts).
- Consumes: `Story`, `Condition` from `./types`.

- [ ] **Step 1: Add the types to `types.ts`** — directly above `export interface Story {`:

```ts
export type ClockMode = 'timed' | 'untimed'; // 'long-horizon' reserved as a future value of this dimension
export interface Profile {
  clock: ClockMode;
  // future dimensions slot in here unchanged: travel?: 'off' | 'free'; investigation?: 'off' | 'on'; …
}
```

And inside `Story`, after `outOfTimeEndingId?: string;`, add:

```ts
  profile?: Profile;            // the game's declared shape (absent => DEFAULT_PROFILE = timed)
```

- [ ] **Step 2: Write the failing test `src/engine/profile.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import type { Story } from './types';
import { validateProfile, clockDimension, TIME_PRESSURE_SURVIVAL, UNTIMED_BRANCHING } from './profile';

// minimal timed story (has a deadline + a time-driven resource + an out-of-time ending + a time condition)
function timedStory(): Story {
  return {
    id: 't', title: 'T', startNodeId: 'a', startTime: '00:00', deadline: '01:00', startLocation: 'L',
    outOfTimeEndingId: 'oot',
    variables: [], locations: [{ id: 'L', name: 'L' }],
    events: [{ id: 'ev', title: 'E', trigger: [{ field: 'time', op: 'time_after', value: '00:30' }], eventLocation: 'L', ifPresentNode: 'a', ifAbsentEffects: [], recoveryNodeId: 'a' }],
    resources: [{ id: 'lamp', label: 'Lamp', min: 0, max: 10, start: 10, depletion: { everyMinutes: 10, amount: 1 } }],
    nodes: [{ id: 'a', title: 'A', body: '', choices: [], resolvesEnding: true }],
    endings: [{ id: 'oot', name: 'OOT', summary: '', conditions: [] }, { id: 'd', name: 'D', summary: '', conditions: [], isDefault: true }],
  };
}

describe('profile — the clock dimension validator', () => {
  it('a timed story (the default profile) raises no profile issues', () => {
    expect(validateProfile(timedStory())).toEqual([]); // absent profile => timed
  });
  it("untimed flags every clock-bound feature, each recommending TIME_PRESSURE_SURVIVAL", () => {
    const codes = validateProfile({ ...timedStory(), profile: { clock: 'untimed' } }).map((i) => i.code);
    expect(codes).toContain('PROFILE_UNTIMED_HAS_DEADLINE');
    expect(codes).toContain('PROFILE_UNTIMED_HAS_OOT_ENDING');
    expect(codes).toContain('PROFILE_UNTIMED_HAS_TIME_RESOURCE');
    expect(codes).toContain('PROFILE_UNTIMED_HAS_TIME_CONDITION');
    for (const i of validateProfile({ ...timedStory(), profile: { clock: 'untimed' } })) {
      expect(i.message).toMatch(/TIME_PRESSURE_SURVIVAL/);
    }
  });
  it('describe documents both clock values', () => {
    expect(clockDimension.describe('timed')).toMatch(/clock/);
    expect(clockDimension.describe('untimed')).toMatch(/no clock/);
  });
  it('the presets are the two clock values', () => {
    expect(TIME_PRESSURE_SURVIVAL).toEqual({ clock: 'timed' });
    expect(UNTIMED_BRANCHING).toEqual({ clock: 'untimed' });
  });
});
```

- [ ] **Step 3: Run it to verify it fails** — `npx vitest run profile` → FAIL (module missing).

- [ ] **Step 4: Implement `src/engine/profile.ts`**

```ts
import type { Story, Condition, Profile } from './types';

export type { Profile, ClockMode } from './types';
export const DEFAULT_PROFILE: Profile = { clock: 'timed' };

export interface ProfileIssue { code: string; message: string; where?: string; }

export interface Dimension {
  id: keyof Profile;
  values: readonly string[];
  validate(story: Story, value: string): ProfileIssue[];
  describe(value: string): string;
}

const REC = "use preset TIME_PRESSURE_SURVIVAL (clock:'timed') to keep these, or remove them to stay untimed";
const TIME_OPS = new Set(['time_before', 'time_after', 'time_between']);

function timeConditionHits(story: Story): { op: string; where: string }[] {
  const hits: { op: string; where: string }[] = [];
  const scan = (cs: Condition[] | undefined, where: string) => {
    for (const c of cs ?? []) if (TIME_OPS.has(c.op)) hits.push({ op: c.op, where });
  };
  for (const n of story.nodes) {
    scan(n.conditions, `node ${n.id}`);
    for (const ch of n.choices ?? []) scan(ch.conditions, `choice ${ch.id}`);
  }
  for (const ev of story.events) scan(ev.trigger, `event ${ev.id}`);
  for (const en of story.endings) scan(en.conditions, `ending ${en.id}`);
  return hits;
}

export const clockDimension: Dimension = {
  id: 'clock',
  values: ['timed', 'untimed'],
  validate(story, value) {
    const issues: ProfileIssue[] = [];
    if (value === 'timed') {
      if (story.deadline === undefined) issues.push({ code: 'PROFILE_TIMED_NEEDS_DEADLINE', message: "profile clock:'timed' requires a deadline" });
    } else if (value === 'untimed') {
      if (story.deadline !== undefined) issues.push({ code: 'PROFILE_UNTIMED_HAS_DEADLINE', message: `clock:'untimed' but the story has a deadline '${story.deadline}' — ${REC}` });
      if (story.outOfTimeEndingId) issues.push({ code: 'PROFILE_UNTIMED_HAS_OOT_ENDING', message: `clock:'untimed' but outOfTimeEndingId '${story.outOfTimeEndingId}' is set (it can never fire) — ${REC}`, where: story.outOfTimeEndingId });
      for (const r of story.resources ?? []) if (r.depletion) issues.push({ code: 'PROFILE_UNTIMED_HAS_TIME_RESOURCE', message: `clock:'untimed' but resource '${r.id}' is time-driven (has depletion) — ${REC}`, where: r.id });
      for (const h of timeConditionHits(story)) issues.push({ code: 'PROFILE_UNTIMED_HAS_TIME_CONDITION', message: `clock:'untimed' but a ${h.op} condition appears in ${h.where} — ${REC}`, where: h.where });
    }
    return issues;
  },
  describe(value) {
    return value === 'timed'
      ? 'a deadline-bound clock (the clock lints run; time-driven resources, time conditions, and out-of-time endings are allowed)'
      : 'no clock (no deadline; time-driven resources, time conditions, and out-of-time endings are forbidden; state-driven branching only)';
  },
};

const DIMENSIONS: Dimension[] = [clockDimension];

export function resolveProfile(story: Story, override?: Profile): Profile {
  return override ?? story.profile ?? DEFAULT_PROFILE;
}

export function validateProfile(story: Story, override?: Profile): ProfileIssue[] {
  const profile = resolveProfile(story, override);
  const issues: ProfileIssue[] = [];
  for (const dim of DIMENSIONS) issues.push(...dim.validate(story, profile[dim.id]));
  // cross-dimension incompatiblePairs — empty in v1 (only one dimension)
  return issues;
}

// Named presets — the "recommended sets". Each pairs with an authoring guide under docs/authoring/.
export const TIME_PRESSURE_SURVIVAL: Profile = { clock: 'timed' };
export const UNTIMED_BRANCHING: Profile = { clock: 'untimed' };
```

- [ ] **Step 5: Run it to verify it passes** — `npx vitest run profile` → PASS.
- [ ] **Step 6: Full gates** — `npx tsc --noEmit` clean; `npx vitest run` (un-piped) all green.
- [ ] **Step 7: Commit** — `git add src/engine/types.ts src/engine/profile.ts src/engine/profile.test.ts && git commit -m "feat(profile): the profile module + clock-dimension validator"`

---

### Task 2: Make `lintStory` profile-aware

**Files:**
- Modify: `src/engine/linter.ts` (resolve the profile; gate the clock-lint block; append validator issues)
- Test: `src/engine/linter.test.ts`

**Interfaces:**
- Consumes: `resolveProfile`, `validateProfile` from `./profile`.
- Produces: `lintStory(story: Story, profileOverride?: Profile)` — the new optional second param (used by `lintGame` in Task 4).

**Note:** `deadline` is still a required `string` in this task — so an `untimed` story still carries a deadline and will (correctly) raise `PROFILE_UNTIMED_HAS_DEADLINE`. The fully-clean untimed game arrives in Task 3. This task proves the **gate** (clock lints skip for untimed) and the **validator wiring**.

- [ ] **Step 1: Write the failing test** in `src/engine/linter.test.ts` (append to the existing file):

```ts
import { lintStory } from './linter';   // (already imported at the top of linter.test.ts)
// ... within the existing describe block or a new one:
describe('lintStory — profile-aware clock lints', () => {
  // a story whose longest path (5 min) is far under its window (600 min): TIMED would trip CLOCK_CANNOT_BITE.
  const base = () => ({
    id: 'p', title: 'P', startNodeId: 'a', startTime: '00:00', deadline: '10:00', startLocation: 'L',
    variables: [], locations: [{ id: 'L', name: 'L' }], events: [],
    nodes: [
      { id: 'a', title: 'A', body: '', choices: [{ id: 'go', label: 'go', destination: 'e', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] }] },
      { id: 'e', title: 'E', body: '', choices: [], resolvesEnding: true },
    ],
    endings: [{ id: 'd', name: 'D', summary: '', conditions: [], isDefault: true }],
  });
  it('timed (the default) still runs the clock lints', () => {
    const codes = lintStory(base() as any).errors.map((e) => e.code);
    expect(codes).toContain('CLOCK_CANNOT_BITE'); // window 600 > maxpath 5
  });
  it('untimed skips the clock lints but flags the residual deadline', () => {
    const codes = lintStory({ ...(base() as any), profile: { clock: 'untimed' } }).errors.map((e) => e.code);
    expect(codes).not.toContain('CLOCK_CANNOT_BITE');           // the gate skipped it
    expect(codes).toContain('PROFILE_UNTIMED_HAS_DEADLINE');    // the validator caught the residual deadline
  });
});
```

- [ ] **Step 2: Run it to verify it fails** — `npx vitest run linter` → FAIL (untimed story still gets CLOCK_CANNOT_BITE; PROFILE_* codes absent).
- [ ] **Step 3: Edit `src/engine/linter.ts`:**
  1. Add the import after line 5: `import { resolveProfile, validateProfile } from './profile';`
  2. Change the signature `export function lintStory(story: Story): LintResult {` → `export function lintStory(story: Story, profileOverride?: Profile): LintResult {` and import the type: add `Profile` to the `import type { ... } from './types';` on line 1.
  3. Just after the `err`/`warn` helpers are defined near the top of `lintStory` (right after `const sym = collectSymbols(story);`, ~line 107), add: `const profile = resolveProfile(story, profileOverride);`
  4. Wrap the clock-lint block (lines ~326–358 — the `// time-literal range:` comment through the `DEADLINE_UNWINNABLE` `err(...)`) in `if (profile.clock === 'timed') { … }`.
  5. Immediately before `return { ok: errors.length === 0, errors, warnings };`, add:

```ts
  for (const i of validateProfile(story, profileOverride)) err(i.code, i.message, i.where);
```

- [ ] **Step 4: Run it to verify it passes** — `npx vitest run linter` → PASS.
- [ ] **Step 5: Full gates** — `npx tsc --noEmit`; `npx vitest run` (un-piped) all green (the existing clock-lint tests still pass — they're all timed/default).
- [ ] **Step 6: Commit** — `feat(profile): profile-aware lintStory (gate the clock lints + run the validator)`

---

### Task 3: Make `Story.deadline` optional + guard the consumers (untimed becomes legal)

**Files:**
- Modify: `src/engine/types.ts` (`deadline?`), `src/engine/engine.ts`, `src/container/carry.ts`, `src/author/graph/timeAxis.ts`, `src/engine/linter.ts` (amend the gate)
- Test: `src/engine/engine.test.ts` (or a new `src/engine/untimed.test.ts`)

**Interfaces:**
- Produces: `Story.deadline?: string`. Runtime: an absent deadline means `pastDeadline` is always false (no deadline-forced resolution).

- [ ] **Step 1: Write the failing test `src/engine/untimed.test.ts`** — a fully-clean untimed game:

```ts
import { describe, it, expect } from 'vitest';
import type { Story } from './types';
import { GameEngine } from './engine';
import { lintStory } from './linter';
import { walkStateSpace } from './stateSpaceWalk';

// untimed: NO deadline, no time-driven resources, no time conditions, no out-of-time ending; state-gated endings.
const untimed: Story = {
  id: 'u', title: 'Untimed', startNodeId: 'start', startTime: '00:00', startLocation: 'L',
  profile: { clock: 'untimed' },
  variables: [{ name: 'opened', type: 'boolean', default: false, purpose: 'a latch' }],
  locations: [{ id: 'L', name: 'L' }], events: [],
  nodes: [
    { id: 'start', title: 'Start', body: '', choices: [
      { id: 'open', label: 'open it', destination: 'end', effects: [{ field: 'opened', op: 'set', value: 'true' }] },
      { id: 'leave', label: 'leave', destination: 'end', effects: [] },
    ] },
    { id: 'end', title: 'End', body: '', choices: [], resolvesEnding: true },
  ],
  endings: [
    { id: 'opened', name: 'Opened', summary: '', conditions: [{ field: 'opened', op: 'is_true' }], priority: 1 },
    { id: 'left', name: 'Left', summary: '', conditions: [], isDefault: true },
  ],
};

describe('untimed game (no clock)', () => {
  it('lints clean', () => {
    expect(lintStory(untimed).errors).toEqual([]);
  });
  it('runs to an ending with no deadline-forced resolution', () => {
    const g = new GameEngine(untimed);
    const v = g.choose('open');
    expect(v.endingReached?.id).toBe('opened');
  });
  it('is walkable with no softlocks; both endings reachable', () => {
    const r = walkStateSpace(untimed);
    expect(r.softlocks).toEqual([]);
    expect(r.orphanEndings).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails** — `npx vitest run untimed` → FAIL (today `new GameEngine` with no deadline throws in `parseTime(undefined)`, and tsc rejects the missing `deadline`).
- [ ] **Step 3: Make `deadline` optional + guard every consumer:**
  1. `src/engine/types.ts`: change `deadline: string;` → `deadline?: string;            // absent => untimed (no clock)`.
  2. `src/engine/engine.ts`: the field decl `private deadline: number;` → `private deadline?: number;`. Line ~25: `this.deadline = parseTime(story.deadline);` → `this.deadline = story.deadline !== undefined ? parseTime(story.deadline) : undefined;`. Line ~61: `const pastDeadline = this.state.time >= this.deadline;` → `const pastDeadline = this.deadline !== undefined && this.state.time >= this.deadline;`.
  3. `src/engine/linter.ts`: amend the Task-2 gate `if (profile.clock === 'timed')` → `if (profile.clock === 'timed' && story.deadline !== undefined)` (narrows `parseTime(story.deadline)` inside).
  4. `src/container/carry.ts`: the deadline-clamp block (`if (gameDeadlineMinutes !== undefined) { … s.deadline = … }`) → guard with `&& s.deadline !== undefined` so untimed chapters are untouched: `if (gameDeadlineMinutes !== undefined && s.deadline !== undefined) {`.
  5. `src/author/graph/timeAxis.ts`: at the top of `timeAxis`, before `parseTime(story.deadline)`, add: `if (story.deadline === undefined) return { startMin: parseTime(story.startTime), deadlineMin: parseTime(story.startTime), windowMin: 0, marks: [] };` (untimed stories get a degenerate, no-mark axis; the editor's full untimed UX is out of scope here).
- [ ] **Step 4: Run it to verify it passes** — `npx vitest run untimed` → PASS. Then `npx tsc --noEmit` — fix any remaining `parseTime(story.deadline)` site tsc flags with the same `!== undefined` guard (there should be none beyond the four above).
- [ ] **Step 5: Full gates** — `npx tsc --noEmit` clean; `npx vitest run` (un-piped) all green (every existing game has a deadline → unchanged).
- [ ] **Step 6: Commit** — `feat(profile): Story.deadline optional — untimed games are legal end-to-end`

---

### Task 4: `Game.profile` + profile-aware `lintGame`

**Files:**
- Modify: `src/container/types.ts` (`Game.profile?`), `src/container/lintGame.ts`
- Test: `src/container/lintGame.test.ts`

**Interfaces:**
- Consumes: `Profile`, `DEFAULT_PROFILE` from `../engine` (re-exported) or `../engine/profile`; `lintStory(story, profileOverride?)` from Task 2.
- Produces: `Game.profile?: Profile` (the game-wide default chapters inherit).

- [ ] **Step 1: Write the failing test** in `src/container/lintGame.test.ts` (append):

```ts
import type { Game } from './types';
import { lintGame } from './lintGame';
// (use a small inline 1-chapter game helper, or the exampleGame clone pattern already in this file)
describe('lintGame — profile inheritance + conformance', () => {
  const oneChapter = (chapterProfile?: { clock: 'timed' | 'untimed' }): Game => ({
    id: 'g', title: 'G', startChapterId: 'c1', carry: { vars: 'all', resources: [], clues: true, inventory: true },
    profile: { clock: 'untimed' },
    chapters: [{ id: 'c1', title: 'C1', gameEnding: true, transitions: [],
      story: {
        id: 'c1', title: 'C1', startNodeId: 'a', startTime: '00:00', startLocation: 'L',
        ...(chapterProfile ? { profile: chapterProfile } : {}),
        variables: [], locations: [{ id: 'L', name: 'L' }], events: [],
        nodes: [{ id: 'a', title: 'A', body: '', choices: [], resolvesEnding: true }],
        endings: [{ id: 'd', name: 'D', summary: '', conditions: [], isDefault: true }],
      } }],
  });
  it('a chapter with no profile inherits the game profile (lints untimed-clean, no deadline needed)', () => {
    expect(lintGame(oneChapter()).errors).toEqual([]);
  });
  it('a chapter declaring a conflicting clock is flagged', () => {
    const codes = lintGame(oneChapter({ clock: 'timed' })).errors.map((e) => e.code);
    expect(codes).toContain('PROFILE_CHAPTER_CONFLICT');
  });
});
```

- [ ] **Step 2: Run it to verify it fails.**
- [ ] **Step 3: Edit the container:**
  1. `src/container/types.ts`: add `import type { Profile } from '../engine';` (or `'../engine/profile'`) and `profile?: Profile;` to `interface Game`.
  2. `src/container/lintGame.ts`: in the per-chapter loop where `lintStory(ch.story)` is called, pass the game profile as the inherited default: `const r = lintStory(ch.story, game.profile);`. Add the conformance check just before it:

```ts
    if (game.profile && ch.story.profile && ch.story.profile.clock !== game.profile.clock) {
      errors.push({ level: 'error', code: 'PROFILE_CHAPTER_CONFLICT',
        message: `chapter ${ch.id} declares clock '${ch.story.profile.clock}' but the game profile is '${game.profile.clock}'`, where: ch.id });
    }
```

- [ ] **Step 4: Run it to verify it passes.**
- [ ] **Step 5: Full gates** — `npx tsc --noEmit`; `npx vitest run` (un-piped) green.
- [ ] **Step 6: Commit** — `feat(profile): Game.profile + profile-aware lintGame (inheritance + conformance)`

---

### Task 5: Retrofit the cave + heist, ship the authoring guides + an untimed reference game

**Files:**
- Modify: `src/experiments/sump-line/content/sumpLine.ts`, `src/experiments/countinghouse/content/countinghouse.ts` (stamp `profile: TIME_PRESSURE_SURVIVAL`)
- Create: `docs/authoring/time-pressure-survival.md`, `docs/authoring/untimed-branching.md`
- Create: `src/container/untimedExample.ts` + `src/container/untimedExample.test.ts` (the untimed reference Game)
- Modify: `CHANGELOG.md`, `NextSteps.md`

- [ ] **Step 1: Stamp the existing games** — add `profile: TIME_PRESSURE_SURVIVAL` to the `sumpLine` and `countinghouse` `Game` objects (import it from `../../../engine` / `../../../engine/profile`). Behaviorally a no-op (timed is the default + chapters inherit), proving the field on real games.
- [ ] **Step 2: Run the existing suites** — `npx vitest run sumpLine countinghouse` → still green (the stamp changes nothing). This is the **zero-regression proof**.
- [ ] **Step 3: Write the untimed reference Game** `src/container/untimedExample.ts` — a 2-chapter `Game` with `profile: UNTIMED_BRANCHING`, chapters with NO deadline, state-gated endings, choice-driven (non-depleting) resources only. Then `untimedExample.test.ts`: `lintGame` clean, a `GameRunner` plays both chapters to a game ending, `walkStateSpace`/seeded walk has no softlocks. The **end-to-end untimed-at-the-Game-level proof**.
- [ ] **Step 4: Write the authoring guides** — `docs/authoring/time-pressure-survival.md` (one screen: "this is the cave/heist shape; see `docs/authoring-method.md` for the full method — branch-and-bottleneck, clock calibration, survival resources"). `docs/authoring/untimed-branching.md` (one screen: no deadline / time-ops / time-driven resources; use latches + choice-driven resources + state-gated endings; the walker is cheaper untimed; reference `untimedExample.ts`).
- [ ] **Step 5: Update `CHANGELOG.md` + `NextSteps.md`** — record the profile framework + clock dimension shipped (WS-D/D1 done); note the deferred boundary (long horizons, scoping, travel/investigation dimensions, the D2 prototype corpus).
- [ ] **Step 6: Full gates + commit** — `npx tsc --noEmit`; `npx vitest run` (un-piped) all green; `git commit -m "feat(profile): retrofit cave + heist, untimed reference game + authoring guides"`.

---

## Self-Review

- **Spec coverage:** data model + placement → T1 (types) + T4 (Game); compatibility model/validator → T1; the lint-profile flip → T2; the one engine touch (deadline optional) → T3; presets + authoring guides + retrofit → T1 (presets) + T5 (guides + retrofit); the untimed reference game → T3 (story-level) + T5 (game-level); the deferred boundary → CHANGELOG/NextSteps (T5). ✓
- **Backward-compat:** absent profile = `DEFAULT_PROFILE` (timed); every existing game keeps its deadline → all clock lints + runtime unchanged. T2/T3/T5 each re-run the full suite. The retrofit stamps are no-ops (T2-of-T5 is the explicit zero-regression gate). ✓
- **Type consistency:** `Profile`/`ClockMode` defined once in `types.ts`, imported by `profile.ts` (no circular runtime import). `resolveProfile(story, override?)` / `validateProfile(story, override?)` / `lintStory(story, profileOverride?)` carry the same optional-override param threaded T1→T2→T4. The lint codes (`PROFILE_TIMED_NEEDS_DEADLINE`, `PROFILE_UNTIMED_HAS_DEADLINE/OOT_ENDING/TIME_RESOURCE/TIME_CONDITION`, `PROFILE_CHAPTER_CONFLICT`) are introduced in T1/T4 and asserted in T1/T2/T4 tests. ✓
- **Deadline-consumer coverage:** the four `parseTime(story.deadline)` sites (engine.ts, linter.ts, carry.ts, timeAxis.ts) are each guarded in T3; tsc is the backstop for any missed site. ✓

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-28-engine-profile-and-clock-model.md`.
