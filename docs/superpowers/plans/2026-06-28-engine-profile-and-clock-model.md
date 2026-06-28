# Engine Profile + Clock-Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Revision 2 (post team review, 2026-06-28).** Fixes folded in: (1) the validator now catches generic
> clock-reads (`field:'time'` + a value op), not just `time_*`; (2) `resolveProfile` returns a fully-normalized
> profile so future optional dimensions can't be silently skipped, and `DEFAULT_PROFILE` is derived from the
> dimensions' defaults; (3) inheritance precedence fixed (a chapter's own profile wins; the game profile fills
> gaps) + param renamed `inherited`; (4) chapter-conformance fires on any mixed clock declaration, not only when
> `Game.profile` is set; (5) the 5th deadline consumer (`transforms.test.ts`) is guarded; (6) `src/engine/index.ts`
> re-exports `profile.ts`. Polish: `describe()` cut (no v1 consumer); tautological tests replaced; the
> walker-cheapness claim softened; the time-pressure guide trimmed.

**Goal:** Ship the profile framework (presets + validator) so a `Story`/`Game` declares its shape; fully work the **clock dimension** (`timed` | `untimed`) as the first example, with zero regression on existing games.

**Architecture:** The `Profile`/`ClockMode` *types* live in `src/engine/types.ts` (no circular import); the *logic* — the `Dimension` interface, the clock dimension, `validateProfile`, the presets — lives in a new `src/engine/profile.ts`, re-exported from the engine barrel. `lintStory`/`lintGame` become profile-aware (run or skip the clock lints; append validator issues). The single runtime change is `Story.deadline` becoming optional. The container gains `Game.profile`. The cave + heist retrofit as the first profiled games.

**Tech Stack:** TypeScript 5, Vitest 2, the engine (`src/engine/`) + container (`src/container/`).

## Global Constraints

- **Backward-compat is load-bearing:** an absent profile resolves to **`DEFAULT_PROFILE` (`{ clock: 'timed' }`, derived from the dimensions' defaults)** — today's exact behavior. **All 305 existing tests must stay green**, and making `deadline` optional must not change any timed behavior.
- **Minimal, deliberate engine change:** only (a) `Story.deadline?` optional + its `pastDeadline` guard, (b) the new `profile.ts` module + its barrel export, (c) the linter's profile-gate. No other engine behavior changes.
- The `Profile`/`ClockMode` types live in `types.ts`; the logic + presets live in `profile.ts` (avoids a circular `types.ts ↔ profile.ts` import). `src/engine/index.ts` re-exports `profile.ts` so the runtime values (`validateProfile`, the presets) are on the engine barrel.
- **Extensibility invariant:** adding a dimension later = add an optional field to `Profile`, push a `Dimension` to the registry, write its module — nothing else. `resolveProfile` MUST therefore return a fully-normalized profile (every dimension defaulted) so a later optional dimension is never silently skipped.
- Every new lint code carries the **recommendation** (`TIME_PRESSURE_SURVIVAL`) in its message.
- TDD throughout. Every task ends `npx vitest run` green (**un-piped**) + `npx tsc --noEmit` clean (it type-checks **test files** too — `tsconfig include: ["src"]`) + a Conventional-Commits commit. **Nothing is pushed** (local commits only). Branch first (`feature/engine-profile`) — do not implement on `master`.

---

### Task 1: The profile module (`profile.ts`) + the `Profile` type + the barrel export

**Files:**
- Modify: `src/engine/types.ts` (add `ClockMode`, `Profile`; add `Story.profile?`)
- Create: `src/engine/profile.ts`
- Modify: `src/engine/index.ts` (re-export `./profile`)
- Test: `src/engine/profile.test.ts`

**Interfaces:**
- Produces: `ClockMode`, `Profile`, `Story.profile?` (types.ts); `DEFAULT_PROFILE`, `ProfileIssue`, `Dimension`, `clockDimension`, `resolveProfile(story, inherited?)`, `validateProfile(story, inherited?)`, `TIME_PRESSURE_SURVIVAL`, `UNTIMED_BRANCHING` (profile.ts, all re-exported from `../engine`).
- Consumes: `Story`, `Condition` from `./types`.

- [ ] **Step 1: Add the types to `types.ts`** — directly above `export interface Story {`:

```ts
export type ClockMode = 'timed' | 'untimed'; // 'long-horizon' reserved as a future value of this dimension
export interface Profile {
  clock: ClockMode;
  // future dimensions slot in here as OPTIONAL fields: travel?: 'off' | 'free'; investigation?: 'off' | 'on'; …
}
```

And inside `Story`, after `outOfTimeEndingId?: string;`, add `  profile?: Profile;`.

- [ ] **Step 2: Write the failing test `src/engine/profile.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import type { Story } from './types';
import { validateProfile, resolveProfile, TIME_PRESSURE_SURVIVAL, UNTIMED_BRANCHING } from './profile';

// a timed story: deadline + a time-driven resource + an out-of-time ending + a time_* condition.
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
    expect(validateProfile(timedStory())).toEqual([]);
  });
  it('the TIME_PRESSURE_SURVIVAL preset accepts the timed story', () => {
    expect(validateProfile({ ...timedStory(), profile: TIME_PRESSURE_SURVIVAL })).toEqual([]);
  });
  it('UNTIMED_BRANCHING flags every clock-bound feature, each recommending TIME_PRESSURE_SURVIVAL', () => {
    const issues = validateProfile({ ...timedStory(), profile: UNTIMED_BRANCHING });
    const codes = issues.map((i) => i.code);
    for (const c of ['PROFILE_UNTIMED_HAS_DEADLINE', 'PROFILE_UNTIMED_HAS_OOT_ENDING', 'PROFILE_UNTIMED_HAS_TIME_RESOURCE', 'PROFILE_UNTIMED_HAS_TIME_CONDITION']) {
      expect(codes).toContain(c);
    }
    for (const i of issues) expect(i.message).toMatch(/TIME_PRESSURE_SURVIVAL/);
  });
  it('catches a GENERIC clock-read (field "time" + a value op), not just time_* ops', () => {
    const s: Story = {
      id: 'g', title: 'G', startNodeId: 'a', startTime: '00:00', startLocation: 'L', profile: { clock: 'untimed' },
      variables: [], locations: [{ id: 'L', name: 'L' }], events: [],
      nodes: [
        { id: 'a', title: 'A', body: '', choices: [
          { id: 'late', label: 'late', destination: 'e', conditions: [{ field: 'time', op: 'gt', value: '30' }] },
          { id: 'go', label: 'go', destination: 'e' },
        ] },
        { id: 'e', title: 'E', body: '', choices: [], resolvesEnding: true },
      ],
      endings: [{ id: 'd', name: 'D', summary: '', conditions: [], isDefault: true }],
    };
    expect(validateProfile(s).map((i) => i.code)).toContain('PROFILE_UNTIMED_HAS_TIME_CONDITION');
  });
  it('resolveProfile normalizes; the story profile wins, the inherited fills the gap', () => {
    expect(resolveProfile(timedStory())).toEqual({ clock: 'timed' });                                   // default
    expect(resolveProfile(timedStory(), UNTIMED_BRANCHING)).toEqual({ clock: 'untimed' });              // inherited fills
    expect(resolveProfile({ ...timedStory(), profile: { clock: 'timed' } }, UNTIMED_BRANCHING)).toEqual({ clock: 'timed' }); // story wins
  });
});
```

- [ ] **Step 3: Run it to verify it fails** — `npx vitest run profile` → FAIL (module missing).

- [ ] **Step 4: Implement `src/engine/profile.ts`**

```ts
import type { Story, Condition, Profile } from './types';

export type { Profile, ClockMode } from './types';

export interface ProfileIssue { code: string; message: string; where?: string; }

// A dimension is self-contained: its legal values, the value applied when a story omits it (powers
// normalization), and a validator that flags story-vs-declared-value conflicts.
export interface Dimension {
  id: keyof Profile;
  values: readonly string[];
  default: string;
  validate(story: Story, value: string): ProfileIssue[];
}

const REC = "use preset TIME_PRESSURE_SURVIVAL (clock:'timed') to keep these, or remove them to stay untimed";
const TIME_OPS = new Set(['time_before', 'time_after', 'time_between']);
const CLOCK_READING_OPS = new Set(['equals', 'not_equals', 'gt', 'gte', 'lt', 'lte', 'is_true', 'is_false', 'has_item']);
// A condition reads the live clock if it uses a time_* op OR reads the reserved 'time' field with any value op
// (the engine resolves field:'time' to state.time for every value-reading op — see conditions.ts/state.ts).
const readsClock = (c: Condition) => TIME_OPS.has(c.op) || (c.field === 'time' && CLOCK_READING_OPS.has(c.op));

function clockReadingHits(story: Story): { op: string; where: string }[] {
  const hits: { op: string; where: string }[] = [];
  const scan = (cs: Condition[] | undefined, where: string) => {
    for (const c of cs ?? []) if (readsClock(c)) hits.push({ op: c.op, where });
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
  default: 'timed',
  validate(story, value) {
    const issues: ProfileIssue[] = [];
    if (value === 'timed') {
      if (story.deadline === undefined) issues.push({ code: 'PROFILE_TIMED_NEEDS_DEADLINE', message: "profile clock:'timed' requires a deadline" });
    } else if (value === 'untimed') {
      if (story.deadline !== undefined) issues.push({ code: 'PROFILE_UNTIMED_HAS_DEADLINE', message: `clock:'untimed' but the story has a deadline '${story.deadline}' — ${REC}` });
      if (story.outOfTimeEndingId) issues.push({ code: 'PROFILE_UNTIMED_HAS_OOT_ENDING', message: `clock:'untimed' but outOfTimeEndingId '${story.outOfTimeEndingId}' is set (it can never fire) — ${REC}`, where: story.outOfTimeEndingId });
      for (const r of story.resources ?? []) if (r.depletion) issues.push({ code: 'PROFILE_UNTIMED_HAS_TIME_RESOURCE', message: `clock:'untimed' but resource '${r.id}' is time-driven (has depletion) — ${REC}`, where: r.id });
      for (const h of clockReadingHits(story)) issues.push({ code: 'PROFILE_UNTIMED_HAS_TIME_CONDITION', message: `clock:'untimed' but a clock-reading condition (${h.op}) appears in ${h.where} — ${REC}`, where: h.where });
    }
    return issues;
  },
};

const DIMENSIONS: Dimension[] = [clockDimension];

// Derived from the dimensions' defaults so it can never drift from them.
export const DEFAULT_PROFILE: Profile = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d.default])) as Profile;

// A FULLY-NORMALIZED profile — every dimension has a value. Precedence (specific wins):
// the story's own profile > the inherited (game) profile > the dimension defaults.
export function resolveProfile(story: Story, inherited?: Profile): Profile {
  return { ...DEFAULT_PROFILE, ...inherited, ...story.profile } as Profile;
}

export function validateProfile(story: Story, inherited?: Profile): ProfileIssue[] {
  const profile = resolveProfile(story, inherited);
  const issues: ProfileIssue[] = [];
  for (const dim of DIMENSIONS) issues.push(...dim.validate(story, profile[dim.id]));
  // cross-dimension incompatiblePairs — empty in v1 (only one dimension); the hook lands with dimension #2.
  return issues;
}

// Named presets — the "recommended sets". Each pairs with an authoring guide under docs/authoring/.
export const TIME_PRESSURE_SURVIVAL: Profile = { clock: 'timed' };
export const UNTIMED_BRANCHING: Profile = { clock: 'untimed' };
```

- [ ] **Step 5: Add the barrel export** — append to `src/engine/index.ts`: `export * from './profile';`
- [ ] **Step 6: Run it to verify it passes** — `npx vitest run profile` → PASS.
- [ ] **Step 7: Full gates** — `npx tsc --noEmit` clean; `npx vitest run` (un-piped) all green.
- [ ] **Step 8: Commit** — `git add src/engine/types.ts src/engine/profile.ts src/engine/profile.test.ts src/engine/index.ts && git commit -m "feat(profile): the profile module + clock-dimension validator (normalized, clock-read-complete)"`

---

### Task 2: Make `lintStory` profile-aware

**Files:**
- Modify: `src/engine/linter.ts` (resolve the profile; gate the clock-lint block; append validator issues)
- Test: `src/engine/linter.test.ts`

**Interfaces:**
- Consumes: `resolveProfile`, `validateProfile` from `./profile`; `Profile` from `./types`.
- Produces: `lintStory(story: Story, inherited?: Profile)` — the new optional second param (used by `lintGame` in Task 4; named `inherited` because it is the game's inherited default, which a chapter's own profile overrides).

**Note:** `deadline` is still a required `string` in this task, so an `untimed` story still carries a deadline and will (correctly) raise `PROFILE_UNTIMED_HAS_DEADLINE`. The fully-clean untimed game arrives in Task 3. This task proves the **gate** (clock lints skip for untimed) and the **validator wiring**.

- [ ] **Step 1: Write the failing test** in `src/engine/linter.test.ts` (append a new describe):

```ts
describe('lintStory — profile-aware clock lints', () => {
  // longest path 5 min, window 600 min: TIMED would trip CLOCK_CANNOT_BITE.
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
    expect(lintStory(base() as any).errors.map((e) => e.code)).toContain('CLOCK_CANNOT_BITE');
  });
  it('untimed skips the clock lints but flags the residual deadline', () => {
    const codes = lintStory({ ...(base() as any), profile: { clock: 'untimed' } }).errors.map((e) => e.code);
    expect(codes).not.toContain('CLOCK_CANNOT_BITE');           // gate skipped it
    expect(codes).toContain('PROFILE_UNTIMED_HAS_DEADLINE');    // validator caught the residual deadline
  });
});
```

- [ ] **Step 2: Run it to verify it fails** — `npx vitest run linter` → FAIL.
- [ ] **Step 3: Edit `src/engine/linter.ts`:**
  1. Add `Profile` to the `import type { … } from './types';` on line 1.
  2. After line 5, add: `import { resolveProfile, validateProfile } from './profile';`
  3. Change `export function lintStory(story: Story): LintResult {` → `export function lintStory(story: Story, inherited?: Profile): LintResult {`.
  4. Just after `const sym = collectSymbols(story);` (~line 107), add: `const profile = resolveProfile(story, inherited);`
  5. Wrap the clock-lint block (lines ~326–358, the `// time-literal range:` comment through the `DEADLINE_UNWINNABLE` `err(...)`) in `if (profile.clock === 'timed') { … }`.
  6. Immediately before `return { ok: errors.length === 0, errors, warnings };`, add:

```ts
  for (const i of validateProfile(story, inherited)) err(i.code, i.message, i.where);
```

- [ ] **Step 4: Run it to verify it passes** — `npx vitest run linter` → PASS.
- [ ] **Step 5: Full gates** — `npx tsc --noEmit`; `npx vitest run` (un-piped) all green (existing clock-lint tests still pass — all timed/default).
- [ ] **Step 6: Commit** — `feat(profile): profile-aware lintStory (gate the clock lints + run the validator)`

---

### Task 3: Make `Story.deadline` optional + guard the consumers (untimed becomes legal)

**Files:**
- Modify: `src/engine/types.ts` (`deadline?`), `src/engine/engine.ts`, `src/engine/linter.ts` (amend the gate), `src/container/carry.ts`, `src/author/graph/timeAxis.ts`, `src/author/graph/transforms.test.ts`
- Test: `src/engine/untimed.test.ts`

**The deadline consumers (the complete set — verified by review):** `engine.ts` (×2), `linter.ts` (the gated block), `container/carry.ts` (the clamp), `author/graph/timeAxis.ts`, and the **test** `author/graph/transforms.test.ts:32` (`tsc` type-checks tests, so this one breaks the gate if unguarded).

- [ ] **Step 1: Write the failing test `src/engine/untimed.test.ts`** — a fully-clean untimed game:

```ts
import { describe, it, expect } from 'vitest';
import type { Story } from './types';
import { GameEngine } from './engine';
import { lintStory } from './linter';
import { walkStateSpace } from './stateSpaceWalk';

// untimed: NO deadline, no time-driven resources, no clock-reading conditions, no out-of-time ending.
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
  it('lints clean', () => { expect(lintStory(untimed).errors).toEqual([]); });
  it('runs to an ending with no deadline-forced resolution', () => {
    expect(new GameEngine(untimed).choose('open').endingReached?.id).toBe('opened');
  });
  it('walks with no softlocks; both endings reachable', () => {
    const r = walkStateSpace(untimed);
    expect(r.softlocks).toEqual([]);
    expect(r.orphanEndings).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails** — `npx vitest run untimed` → FAIL (`parseTime(undefined)` throws; tsc rejects the missing `deadline`).
- [ ] **Step 3: Make `deadline` optional + guard every consumer:**
  1. `types.ts`: `deadline: string;` → `deadline?: string;            // absent => untimed (no clock)`.
  2. `engine.ts`: field `private deadline: number;` → `private deadline?: number;`. Line ~25: `this.deadline = story.deadline !== undefined ? parseTime(story.deadline) : undefined;`. Line ~61: `const pastDeadline = this.deadline !== undefined && this.state.time >= this.deadline;`.
  3. `linter.ts`: amend the Task-2 gate `if (profile.clock === 'timed')` → `if (profile.clock === 'timed' && story.deadline !== undefined)`.
  4. `container/carry.ts`: the clamp guard `if (gameDeadlineMinutes !== undefined) {` → `if (gameDeadlineMinutes !== undefined && s.deadline !== undefined) {`.
  5. `author/graph/timeAxis.ts`: at the top of `timeAxis`, before `parseTime(story.deadline)`: `if (story.deadline === undefined) { const s = parseTime(story.startTime); return { startMin: s, deadlineMin: s, windowMin: 0, marks: [] }; }` (untimed → a degenerate, no-mark axis; the editor's full untimed UX is out of scope).
  6. `author/graph/transforms.test.ts:32`: `parseTime(praterLine.deadline)` → `parseTime(praterLine.deadline!)` (praterLine is timed; the non-null assertion keeps the test honest and tsc green).
- [ ] **Step 4: Run it to verify it passes** — `npx vitest run untimed` → PASS. Then `npx tsc --noEmit` — if any other `parseTime(story.deadline)` site is flagged, guard it the same way (none expected beyond the six above).
- [ ] **Step 5: Full gates** — `npx tsc --noEmit` clean; `npx vitest run` (un-piped) all green (every existing game has a deadline → unchanged).
- [ ] **Step 6: Commit** — `feat(profile): Story.deadline optional — untimed games are legal end-to-end`

---

### Task 4: `Game.profile` + profile-aware `lintGame`

**Files:**
- Modify: `src/container/types.ts` (`Game.profile?`), `src/container/lintGame.ts`
- Test: `src/container/lintGame.test.ts`

**Interfaces:**
- Consumes: `Profile` from `../engine`; `lintStory(story, inherited?)` from Task 2.
- Produces: `Game.profile?: Profile` (the game-wide inherited default; a chapter's own `story.profile` overrides it).

- [ ] **Step 1: Write the failing test** in `src/container/lintGame.test.ts` (append):

```ts
import type { Game } from './types';
import { lintGame } from './lintGame';
describe('lintGame — profile inheritance + conformance', () => {
  const game = (gameProfile?: { clock: 'timed' | 'untimed' }, chapterProfile?: { clock: 'timed' | 'untimed' }): Game => ({
    id: 'g', title: 'G', startChapterId: 'c1', carry: { vars: 'all', resources: [], clues: true, inventory: true },
    ...(gameProfile ? { profile: gameProfile } : {}),
    chapters: [{ id: 'c1', title: 'C1', gameEnding: true, transitions: [],
      story: {
        id: 'c1', title: 'C1', startNodeId: 'a', startTime: '00:00', startLocation: 'L',
        ...(chapterProfile ? { profile: chapterProfile } : {}),
        variables: [], locations: [{ id: 'L', name: 'L' }], events: [],
        nodes: [{ id: 'a', title: 'A', body: '', choices: [], resolvesEnding: true }],
        endings: [{ id: 'd', name: 'D', summary: '', conditions: [], isDefault: true }],
      } }],
  });
  it('a chapter with no profile inherits the game profile (untimed lints clean, no deadline)', () => {
    expect(lintGame(game({ clock: 'untimed' })).errors).toEqual([]);
  });
  it('a chapter declaring a clock that conflicts with the game is flagged', () => {
    expect(lintGame(game({ clock: 'untimed' }, { clock: 'timed' })).errors.map((e) => e.code)).toContain('PROFILE_CHAPTER_CONFLICT');
  });
});
```

- [ ] **Step 2: Run it to verify it fails.**
- [ ] **Step 3: Edit the container:**
  1. `src/container/types.ts`: add `import type { Profile } from '../engine';` and `profile?: Profile;` to `interface Game`.
  2. `src/container/lintGame.ts`: in the per-chapter loop, pass the game profile as the inherited default — change `const r = lintStory(ch.story);` → `const r = lintStory(ch.story, game.profile);`. Then add the **conformance check** (catches any mixed clock declaration, independent of whether `game.profile` is set):

```ts
    // v1 requires a uniform clock across a game; every EXPLICIT clock declaration (game + chapters) must agree.
    const declaredClocks = new Set<string>();
    if (game.profile) declaredClocks.add(game.profile.clock);
    for (const ch of game.chapters) if (ch.story.profile) declaredClocks.add(ch.story.profile.clock);
    if (declaredClocks.size > 1) {
      errors.push({ level: 'error', code: 'PROFILE_CHAPTER_CONFLICT',
        message: `mixed clock declarations [${[...declaredClocks].sort().join(', ')}] across the game and its chapters — v1 requires a uniform clock` });
    }
```

- [ ] **Step 4: Run it to verify it passes.**
- [ ] **Step 5: Full gates** — `npx tsc --noEmit`; `npx vitest run` (un-piped) green.
- [ ] **Step 6: Commit** — `feat(profile): Game.profile + profile-aware lintGame (inheritance + uniform-clock conformance)`

---

### Task 5: Retrofit the cave + heist, ship the authoring guides + an untimed reference game

**Files:**
- Modify: `src/experiments/sump-line/content/sumpLine.ts`, `src/experiments/countinghouse/content/countinghouse.ts` (stamp `Game.profile = TIME_PRESSURE_SURVIVAL`)
- Create: `docs/authoring/time-pressure-survival.md`, `docs/authoring/untimed-branching.md`
- Create: `src/container/untimedExample.ts` + `src/container/untimedExample.test.ts`
- Modify: `CHANGELOG.md`, `NextSteps.md`

- [ ] **Step 1: Stamp the existing games** — add `profile: TIME_PRESSURE_SURVIVAL` to the `sumpLine` and `countinghouse` `Game` objects (import from `../../../engine`). Behaviorally a no-op (timed is the default + chapters inherit; the conformance check sees one declared clock). Proves the field on real games.
- [ ] **Step 2: Run the existing suites** — `npx vitest run sumpLine countinghouse` → still green. The **zero-regression proof**.
- [ ] **Step 3: Write the untimed reference Game** `src/container/untimedExample.ts` — a 2-chapter `Game` with `profile: UNTIMED_BRANCHING`, chapters with NO deadline, state-gated endings, no time-driven resources, no clock-reading conditions, no `add_minutes` (so the walker stays small). Then `untimedExample.test.ts`: `lintGame` clean, a `GameRunner` plays both chapters to a game ending, `walkStateSpace`/seeded walk has no softlocks. The **end-to-end untimed-at-the-Game-level proof**.
- [ ] **Step 4: Write the authoring guides** —
  - `docs/authoring/time-pressure-survival.md`: 2–3 lines — "the cave/heist shape; full method in `docs/authoring-method.md` (branch-and-bottleneck, clock calibration, survival resources)."
  - `docs/authoring/untimed-branching.md` (the one with real new content): no deadline / time-driven resources / clock-reading conditions (`time_*` **and** any op on the `time` field) / out-of-time endings; use latches + choice-driven resources + state-gated endings. **Note the walker-cheapness caveat:** the walk is only cheaper untimed if you also avoid `add_minutes` (the validator does not forbid it, but advancing the clock still inflates the walker's state space and shows a cosmetic clock). Reference `untimedExample.ts`.
- [ ] **Step 5: Update `CHANGELOG.md` + `NextSteps.md`** — the profile framework + clock dimension shipped (WS-D/D1 done); the deferred boundary (long horizons, scoping, the travel/investigation dimensions + `incompatiblePairs`, the D2 prototype corpus, the future `add_minutes`/walker-key optimization for untimed).
- [ ] **Step 6: Full gates + commit** — `npx tsc --noEmit`; `npx vitest run` (un-piped) all green; `git commit -m "feat(profile): retrofit cave + heist, untimed reference game + authoring guides"`.

---

## Self-Review

- **Spec coverage:** data model + placement → T1 (types) + T4 (Game); compatibility model/validator → T1; the lint-profile flip → T2; the one engine touch (deadline optional) → T3; presets + guides + retrofit → T1 (presets) + T5; the untimed reference game → T3 (story-level) + T5 (game-level); the deferred boundary → CHANGELOG/NextSteps (T5). ✓
- **Team-review fixes folded in:** generic clock-read (`field:'time'` + value op) now caught via `readsClock` (T1); `resolveProfile` fully-normalizes + `DEFAULT_PROFILE` derived from dimension defaults — no silent-skip when an optional dimension #2 lands (T1, Global "Extensibility invariant"); inheritance precedence fixed (story > inherited > default) + param renamed `inherited` (T1/T2/T4); conformance fires on any mixed clock declaration, not only when `Game.profile` is set (T4); the 5th deadline consumer `transforms.test.ts:32` guarded (T3); `src/engine/index.ts` re-exports `profile.ts` (T1); `describe()` cut (no v1 consumer); tautological preset/describe tests replaced with behavioral ones (T1); walker-cheapness claim softened with the `add_minutes` caveat (T5). ✓
- **Backward-compat:** absent profile = `DEFAULT_PROFILE` (timed); every existing game keeps its deadline → all clock lints + runtime unchanged. `validateProfile` runs on every `lintStory` but yields `[]` for timed stories with a deadline (every existing fixture has one — verified by review). T2/T3/T5 each re-run the full suite; T5 Step 2 is the explicit zero-regression gate. ✓
- **Type consistency:** `Profile`/`ClockMode` defined once in `types.ts`, imported by `profile.ts`; re-exported via `index.ts`. `resolveProfile(story, inherited?)` / `validateProfile(story, inherited?)` / `lintStory(story, inherited?)` share the `inherited` param threaded T1→T2→T4. Lint codes (`PROFILE_TIMED_NEEDS_DEADLINE`, `PROFILE_UNTIMED_HAS_{DEADLINE,OOT_ENDING,TIME_RESOURCE,TIME_CONDITION}`, `PROFILE_CHAPTER_CONFLICT`) introduced in T1/T4, asserted in T1/T2/T4 tests. ✓
- **Deadline-consumer coverage:** the six sites (engine.ts ×2, linter.ts gate, carry.ts, timeAxis.ts, transforms.test.ts) are each guarded in T3; tsc (which type-checks tests) is the backstop. ✓

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-28-engine-profile-and-clock-model.md` (revision 2, post team review).
