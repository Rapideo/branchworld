# Travel Dimension (Free-Roam) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in `travel: 'off' | 'free'` profile dimension that turns the dormant `Location` graph into engine-generated free-roam navigation, with a sound bounded-exhaustive roam verification mode.

**Architecture:** A new profile dimension flips roam on. A shared `travel.ts` module owns the mechanic (hub detection, synthetic `__travel_<dest>` choices, the trip). `engine.ts` injects travel choices in `view()` and handles them in `choose()` before its unknown-choice throw. The exhaustive walker (`stateSpaceWalk.ts`) gains a roam mode: drop/bucket time for finiteness, record the **full** forward edge set, and run a co-reachability pass (`deadRegions`) — the property free-roam actually needs. New lints (`travelLint.ts`) enforce graph coherence and the roam-verification preconditions; the container fences multi-chapter roam off in v1. A reference game proves the whole thing.

**Tech Stack:** TypeScript (strict), Vitest, esbuild. Windows + Git Bash / PowerShell. No new dependencies.

## Global Constraints

- Base = engine **v1.5** (profile framework). This is the **second** profile dimension.
- **`travel:'off'` is behaviorally inert** — nothing injected, the walker runs exactly as today. The ONE allowed observable change: `DEFAULT_PROFILE`/`resolveProfile(...)` now include `travel:'off'`, so `profile.test.ts`'s resolved-object assertions update. NO other existing test may change.
- Reserved id prefix is **`__`**; the synthetic travel choice id is exactly **`` `__travel_${destLocationId}` ``**.
- `travel:'free'` **COEXISTS** with authored `change_location` (synthetic edges are additive; authored gated `change_location` stays legal).
- Multi-chapter roam is **FENCED OFF** in v1: `ROAM_CARRY_UNVERIFIABLE` (container error) forbids a `travel:'free'` chapter inside a multi-chapter game. Single-chapter roam is fully supported.
- The timed-roam bucket is a **verification parameter** (`walkStateSpace`'s existing `timeBucket` opt), NOT a `Profile`/`Story` field.
- In roam mode, `capHit` ⇒ the honesty results are **INDETERMINATE and the verify gate FAILS** (not a warning).
- Co-reachability MUST walk the **full forward edge set**, never the `parent` spanning tree.
- TDD throughout: failing test first, watch it fail, minimal code, watch it pass, commit. After every task: `npx vitest run` fully green + `npx tsc --noEmit` clean.
- Commit atomically per task on a feature branch. Pushing to the GitHub remote (`origin`, github.com/Rapideo/branchworld) is allowed only at the merge milestone, not per task.

---

## File Structure

- **`src/engine/types.ts`** (modify) — add `travel?: 'off' | 'free'` to `Profile`.
- **`src/engine/profile.ts`** (modify) — `travelDimension` registry entry; `DEFAULT_PROFILE` gains `travel:'off'`; export `readsClock`; fix the stale `incompatiblePairs` comment.
- **`src/engine/profile.test.ts`** (modify) — update the 3 resolved-object assertions.
- **`src/engine/travel.ts`** (create) — the shared mechanic: hub detection, dest list, trip effects, id helpers, `travelNodeEdges` for the linter. Pure; no engine/walker state.
- **`src/engine/engine.ts`** (modify) — resolve the profile; inject travel choices in `view()`; the `__travel_` seam in `choose()`.
- **`src/engine/linter.ts`** (modify) — travel-aware `computeReachable`/`NO_EXIT`/`EVENT_RECOVERY_UNREACHABLE`; `RESERVED_CHOICE_ID`; call `lintTravel`.
- **`src/engine/travelLint.ts`** (create) — all travel + roam-precondition lints; `checkBucketAlignment` for the verify boundary.
- **`src/engine/stateSpaceWalk.ts`** (modify) — roam-mode keying, full-edge structure, co-reachability `deadRegions`, `indeterminate`-on-cap.
- **`src/container/lintGame.ts`** (modify) — `ROAM_CHAPTER_PROFILE_MISSING`, `ROAM_CARRY_UNVERIFIABLE`.
- **`src/container/roamExample.ts`** (create) + **`src/container/roamExample.test.ts`** (create) — the reference game + the integration/soundness proof.
- **`src/container/index.ts`** (modify) — export `roamExample`.
- **`docs/authoring/free-travel.md`** (create) — the authoring guide.

Sequencing: Phase 1 mechanic (Tasks 1–3) → Phase 2 lints (Tasks 4–5) → Phase 3 roam walker (Task 6) → Phase 4 container fence (Task 7) → Phase 5 proof + docs (Tasks 8–9).

---

### Task 1: The `travel` dimension (registry + default + profile.test fix)

**Files:**
- Modify: `src/engine/types.ts:118-121` (the `Profile` interface)
- Modify: `src/engine/profile.ts` (add `travelDimension`, push to `DIMENSIONS`, export `readsClock`, fix comment)
- Modify: `src/engine/profile.test.ts:49-51`
- Test: `src/engine/profile.test.ts` (existing file)

**Interfaces:**
- Produces: `Profile.travel?: 'off' | 'free'`; `DEFAULT_PROFILE` now `{ clock:'timed', travel:'off' }`; `export const readsClock: (c: Condition) => boolean`; `travelDimension: Dimension`.
- Consumes: nothing from later tasks.

Note: the `travelDimension.validate` returns `[]` on purpose — travel's lints mix error+warning levels and need reachability/symbol context the `Dimension.validate → ProfileIssue` (error-only) hook can't carry, so they live in `travelLint.ts` (Task 5), exactly as `lintResources` lives outside the dimension hook. The dimension entry's real framework job here is resolution/normalization (`DEFAULT_PROFILE`/`resolveProfile`).

- [ ] **Step 1: Write the failing test** — append to `src/engine/profile.test.ts` inside the top-level `describe`:

```ts
import { DEFAULT_PROFILE, resolveProfile } from './profile';
// (DEFAULT_PROFILE may need adding to the existing import line.)

it('travel dimension: default is off and appears in the resolved profile', () => {
  expect(DEFAULT_PROFILE).toEqual({ clock: 'timed', travel: 'off' });
  expect(resolveProfile(timedStory())).toEqual({ clock: 'timed', travel: 'off' });
  expect(resolveProfile({ ...timedStory(), profile: { clock: 'timed', travel: 'free' } }))
    .toEqual({ clock: 'timed', travel: 'free' });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/engine/profile.test.ts -t "travel dimension"`
Expected: FAIL — `DEFAULT_PROFILE` is `{ clock: 'timed' }`, and `Profile` has no `travel` (also a tsc error on the literal).

- [ ] **Step 3: Add `travel` to the `Profile` type** — replace `src/engine/types.ts:118-121`:

```ts
export interface Profile {
  clock: ClockMode;
  travel?: 'off' | 'free'; // free-roam navigation over the Location graph; default 'off'
  // future dimensions slot in here as OPTIONAL fields: investigation?: 'off' | 'on'; …
}
```

- [ ] **Step 4: Add the dimension + export `readsClock` + fix the comment** — in `src/engine/profile.ts`:

Change `const readsClock` (line 21) to `export const readsClock`. Then add, just before `const DIMENSIONS` (line 55):

```ts
export const travelDimension: Dimension = {
  id: 'travel',
  values: ['off', 'free'],
  default: 'off',
  // Travel's lints (structural + roam-precondition, mixed error/warning levels) live in travelLint.ts,
  // called from lintStory — the Dimension.validate→ProfileIssue hook is error-only and lacks lint context.
  validate: () => [],
};
```

Change line 55 to:

```ts
const DIMENSIONS: Dimension[] = [clockDimension, travelDimension];
```

Replace the stale comment at line 70:

```ts
  // cross-dimension incompatiblePairs — empty in v1. Reframed (travel spec rev 2): dimensions carry per-dimension
  // REQUIREMENTS, not binary forbids; the forbid hook is gated on the D2 corpus (kept only if a real forbid appears).
```

- [ ] **Step 5: Update the existing resolved-object assertions** — replace `src/engine/profile.test.ts:49-51`:

```ts
    expect(resolveProfile(timedStory())).toEqual({ clock: 'timed', travel: 'off' });                                   // default
    expect(resolveProfile(timedStory(), UNTIMED_BRANCHING)).toEqual({ clock: 'untimed', travel: 'off' });              // inherited fills
    expect(resolveProfile({ ...timedStory(), profile: { clock: 'timed' } }, UNTIMED_BRANCHING)).toEqual({ clock: 'timed', travel: 'off' }); // story wins
```

- [ ] **Step 6: Run the tests + full suite + typecheck**

Run: `npx vitest run src/engine/profile.test.ts && npx vitest run && npx tsc --noEmit`
Expected: PASS — including the new test; the whole suite green (only `profile.test.ts` changed); tsc clean.

- [ ] **Step 7: Commit**

```bash
git add src/engine/types.ts src/engine/profile.ts src/engine/profile.test.ts
git commit -F - <<'EOF'
feat(travel): register the travel profile dimension (default off)

Profile.travel?:'off'|'free'; DEFAULT_PROFILE gains travel:'off' (derived);
export readsClock for the bucket-alignment lint; reframe the stale
incompatiblePairs comment. travelDimension.validate is intentionally empty
(travel lints live in travelLint.ts). Behaviorally inert for every existing
game; only profile.test.ts resolved-object assertions change shape.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 2: `travel.ts` — the shared mechanic helpers

**Files:**
- Create: `src/engine/travel.ts`
- Test: `src/engine/travel.test.ts`

**Interfaces:**
- Produces:
  - `TRAVEL_PREFIX = '__travel_'`
  - `travelChoiceId(dest: string): string`
  - `parseTravelDest(choiceId: string): string | undefined`
  - `hubLocation(story: Story, location: string, currentId: string): Location | undefined`
  - `travelDests(loc: Location): string[]`
  - `travelTripEffects(loc: Location, dest: string): Effect[]`
  - `destDefaultNode(story: Story, dest: string): string | undefined`
  - `travelNodeEdges(story: Story, profile: Profile): Map<string, string[]>`
- Consumes: `Story`, `Location`, `Effect`, `Profile` from `./types`.

- [ ] **Step 1: Write the failing test** — create `src/engine/travel.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Story, Location } from './types';
import {
  travelChoiceId, parseTravelDest, hubLocation, travelDests,
  travelTripEffects, destDefaultNode, travelNodeEdges,
} from './travel';

const locA: Location = { id: 'a', name: 'Aaa', connectedLocations: ['b'], travelTimes: { b: 10 }, defaultNode: 'a_hub' };
const locB: Location = { id: 'b', name: 'Bbb', connectedLocations: ['a'], travelTimes: { a: 10 }, defaultNode: 'b_hub' };
const story = { locations: [locA, locB], nodes: [] } as unknown as Story;

describe('travel helpers', () => {
  it('builds and parses synthetic ids', () => {
    expect(travelChoiceId('b')).toBe('__travel_b');
    expect(parseTravelDest('__travel_b')).toBe('b');
    expect(parseTravelDest('c_quiet')).toBeUndefined();
  });
  it('hubLocation is keyed off the live location, not a global node scan', () => {
    expect(hubLocation(story, 'a', 'a_hub')?.id).toBe('a');     // at a's hub while in a
    expect(hubLocation(story, 'b', 'a_hub')).toBeUndefined();   // at a_hub but state.location is b → not a hub
    expect(hubLocation(story, 'a', 'a_side')).toBeUndefined();  // in a but not at the hub node
  });
  it('trip effects pay the travel time and change location', () => {
    expect(travelTripEffects(locA, 'b')).toEqual([
      { op: 'add_minutes', field: 'time', value: '10' },
      { op: 'change_location', field: 'location', value: 'b' },
    ]);
    expect(destDefaultNode(story, 'b')).toBe('b_hub');
    expect(travelDests(locA)).toEqual(['b']);
  });
  it('travelNodeEdges maps hub->dest-hub only when travel is free', () => {
    expect(travelNodeEdges(story, { clock: 'timed', travel: 'free' })).toEqual(new Map([
      ['a_hub', ['b_hub']],
      ['b_hub', ['a_hub']],
    ]));
    expect(travelNodeEdges(story, { clock: 'timed', travel: 'off' }).size).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/engine/travel.test.ts`
Expected: FAIL — `Cannot find module './travel'`.

- [ ] **Step 3: Implement `src/engine/travel.ts`**

```ts
import type { Story, Location, Effect, Profile } from './types';

export const TRAVEL_PREFIX = '__travel_';

export function travelChoiceId(dest: string): string {
  return `${TRAVEL_PREFIX}${dest}`;
}

export function parseTravelDest(choiceId: string): string | undefined {
  return choiceId.startsWith(TRAVEL_PREFIX) ? choiceId.slice(TRAVEL_PREFIX.length) : undefined;
}

/** A node is a hub only FOR the player's current location: state.location's Location has this node as defaultNode. */
export function hubLocation(story: Story, location: string, currentId: string): Location | undefined {
  const here = story.locations.find((l) => l.id === location);
  return here && here.defaultNode === currentId ? here : undefined;
}

export function travelDests(loc: Location): string[] {
  return loc.connectedLocations ?? [];
}

export function destDefaultNode(story: Story, dest: string): string | undefined {
  return story.locations.find((l) => l.id === dest)?.defaultNode;
}

/** The effects a trip applies: pay travelTimes[dest] (monotonic add_minutes) then move to dest. */
export function travelTripEffects(loc: Location, dest: string): Effect[] {
  return [
    { op: 'add_minutes', field: 'time', value: String(loc.travelTimes?.[dest] ?? 0) },
    { op: 'change_location', field: 'location', value: dest },
  ];
}

/** Hub-node -> connected dest-hub-nodes, in declared connectedLocations order. Empty unless travel:'free'. */
export function travelNodeEdges(story: Story, profile: Profile): Map<string, string[]> {
  const edges = new Map<string, string[]>();
  if (profile.travel !== 'free') return edges;
  for (const loc of story.locations) {
    if (!loc.defaultNode) continue;
    const dests: string[] = [];
    for (const d of travelDests(loc)) {
      const dn = destDefaultNode(story, d);
      if (dn) dests.push(dn);
    }
    edges.set(loc.defaultNode, dests);
  }
  return edges;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/engine/travel.test.ts`
Expected: PASS (all 4).

- [ ] **Step 5: Commit**

```bash
git add src/engine/travel.ts src/engine/travel.test.ts
git commit -F - <<'EOF'
feat(travel): shared mechanic helpers (hub detection, ids, trip, edges)

travel.ts owns the free-roam mechanic used by the engine and the linter:
state-location-keyed hub detection, __travel_<dest> id build/parse, the trip
effects (pay travelTimes then change_location), and travelNodeEdges for
reachability. Pure; no engine/walker state.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 3: Engine wiring — inject in `view()`, the `__travel_` seam in `choose()`

**Files:**
- Modify: `src/engine/engine.ts` (constructor, `view()`, `choose()`, add `travelTo`)
- Test: `src/engine/engine.travel.test.ts` (create)

**Interfaces:**
- Consumes: `resolveProfile` (from `./profile`), all of `./travel`, `applyEffects` (already imported).
- Produces: at a hub with `travel:'free'`, `view().choices` includes `{ id:'__travel_<dest>', label:'Travel to <name>', available:true }`; `choose('__travel_<dest>')` advances time by `travelTimes[dest]`, sets location, enters the dest hub.

- [ ] **Step 1: Write the failing test** — create `src/engine/engine.travel.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Story } from './types';
import { GameEngine } from './engine';

// Two connected locations, each a hub node; travel:'free'.
function roamStory(): Story {
  return {
    id: 't', title: 'T', startNodeId: 'a_hub', startTime: '00:00', startLocation: 'a',
    profile: { clock: 'untimed', travel: 'free' },
    variables: [], events: [], resources: [],
    locations: [
      { id: 'a', name: 'Aaa', connectedLocations: ['b'], travelTimes: { b: 10 }, defaultNode: 'a_hub' },
      { id: 'b', name: 'Bbb', connectedLocations: ['a'], travelTimes: { a: 10 }, defaultNode: 'b_hub' },
    ],
    nodes: [
      { id: 'a_hub', title: 'A', body: '', choices: [{ id: 'finish', label: 'Finish', destination: 'a_end' }] },
      { id: 'a_end', title: 'End', body: '', choices: [], resolvesEnding: true },
      { id: 'b_hub', title: 'B', body: '', choices: [{ id: 'finish', label: 'Finish', destination: 'a_end' }] },
    ],
    endings: [{ id: 'fin', name: 'Fin', conditions: [], isDefault: true, summary: '' }],
  };
}

describe('engine travel wiring', () => {
  it('injects a travel choice at the hub and the trip moves + costs time', () => {
    const eng = new GameEngine(roamStory());
    const v0 = eng.view();
    expect(v0.choices.map((c) => c.id)).toContain('__travel_b'); // injected alongside the authored 'finish'
    const v1 = eng.choose('__travel_b');
    expect(v1.location).toBe('b');
    expect(v1.time).toBe(10);             // paid travelTimes a->b
    expect(v1.node.id).toBe('b_hub');     // entered b's default node
    expect(v1.choices.map((c) => c.id)).toContain('__travel_a'); // and b offers the way back
  });

  it('travel:off injects nothing (behaviorally inert)', () => {
    const s = roamStory();
    s.profile = { clock: 'untimed', travel: 'off' };
    const eng = new GameEngine(s);
    expect(eng.view().choices.map((c) => c.id)).toEqual(['finish']);
  });

  it('an illegal travel id throws a travel-specific error, not "Unknown choice"', () => {
    const eng = new GameEngine(roamStory());
    expect(() => eng.choose('__travel_zzz')).toThrowError(/not connected/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/engine/engine.travel.test.ts`
Expected: FAIL — no `__travel_b` choice injected; `choose('__travel_b')` throws `Unknown choice`.

- [ ] **Step 3: Wire the engine** — in `src/engine/engine.ts`:

Add imports near the top:

```ts
import { resolveProfile } from './profile';
import { parseTravelDest, hubLocation, travelDests, travelTripEffects, destDefaultNode, travelChoiceId } from './travel';
import type { Profile } from './types';
```

Add a field and resolve it in the constructor (after `this.bounds = buildBounds(story);`, before `this.enter(...)`):

```ts
  private profile: Profile;
```
```ts
    this.profile = resolveProfile(story);
```

In `view()`, after the `choices` array is built (after line 79) and before the `return`:

```ts
    if (this.profile.travel === 'free' && !this.ending) {
      const here = hubLocation(this.story, this.state.location, this.currentId);
      if (here) {
        for (const dest of travelDests(here)) {
          const dl = this.story.locations.find((l) => l.id === dest);
          choices.push({ id: travelChoiceId(dest), label: `Travel to ${dl?.name ?? dest}`, available: true });
        }
      }
    }
```

In `choose()`, add the seam immediately after `if (this.ending) return this.view();` (before `const n = this.node(...)`):

```ts
    const dest = parseTravelDest(choiceId);
    if (dest !== undefined) return this.travelTo(dest);
```

Add the `travelTo` method (e.g. after `choose()`):

```ts
  private travelTo(dest: string): GameView {
    if (this.profile.travel !== 'free') throw new Error(`Travel is off; cannot travel to ${dest}`);
    const here = hubLocation(this.story, this.state.location, this.currentId);
    if (!here) throw new Error(`Not at a travel hub; cannot travel to ${dest}`);
    if (!travelDests(here).includes(dest)) throw new Error(`Location ${here.id} is not connected to ${dest}`);
    if (here.travelTimes?.[dest] === undefined) throw new Error(`No travel time from ${here.id} to ${dest}`);
    const destNode = destDefaultNode(this.story, dest);
    if (!destNode) throw new Error(`Destination ${dest} has no defaultNode`);
    this.state = applyEffects(this.state, travelTripEffects(here, dest), this.bounds);
    this.enter(destNode);
    return this.view();
  }
```

- [ ] **Step 4: Run the test + full suite + typecheck**

Run: `npx vitest run src/engine/engine.travel.test.ts && npx vitest run && npx tsc --noEmit`
Expected: PASS — new tests green; the whole existing suite still green (every existing game resolves `travel:'off'` → nothing injected); tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/engine/engine.ts src/engine/engine.travel.test.ts
git commit -F - <<'EOF'
feat(travel): engine injects hub travel choices and handles the trip

view() appends one __travel_<dest> choice per connectedLocations entry at the
current location's hub when travel:'free'; choose() recognizes a __travel_ id
BEFORE its unknown-choice throw, validates (free / at hub / connected / has
time / dest has a hub), then pays travelTimes and enters the dest hub via the
normal enter() path. travel:'off' injects nothing.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 4: Static linter — travel-aware reachability + `RESERVED_CHOICE_ID`

**Files:**
- Modify: `src/engine/linter.ts` (`computeReachable`, the `NO_EXIT`/`SOFT_LOCK` block, `EVENT_RECOVERY_UNREACHABLE`, add `RESERVED_CHOICE_ID`)
- Test: `src/engine/linter.travel.test.ts` (create)

**Interfaces:**
- Consumes: `travelNodeEdges` (Task 2), `resolveProfile` (already imported in linter.ts at line 6).
- Produces: with `travel:'free'`, `computeReachable` follows hub→dest-hub edges; `NO_EXIT`/`SOFT_LOCK` count injected travel exits; `EVENT_RECOVERY_UNREACHABLE` honors travel reachability. Always: `RESERVED_CHOICE_ID` (error) on a `__`-prefixed choice id.

- [ ] **Step 1: Write the failing test** — create `src/engine/linter.travel.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Story } from './types';
import { lintStory } from './linter';

// b_hub is reachable ONLY via travel from a_hub (no authored choice points to it).
function roamStory(): Story {
  return {
    id: 't', title: 'T', startNodeId: 'a_hub', startTime: '00:00', startLocation: 'a',
    profile: { clock: 'untimed', travel: 'free' },
    variables: [], events: [], resources: [],
    locations: [
      { id: 'a', name: 'A', connectedLocations: ['b'], travelTimes: { b: 10 }, defaultNode: 'a_hub' },
      { id: 'b', name: 'B', connectedLocations: ['a'], travelTimes: { a: 10 }, defaultNode: 'b_hub' },
    ],
    nodes: [
      { id: 'a_hub', title: 'A', body: '', choices: [{ id: 'fin', label: 'Finish', destination: 'a_end' }] },
      { id: 'a_end', title: 'End', body: '', choices: [], resolvesEnding: true },
      { id: 'b_hub', title: 'B', body: '', choices: [{ id: 'fin', label: 'Finish', destination: 'a_end' }] },
    ],
    endings: [{ id: 'fin', name: 'Fin', conditions: [], isDefault: true, summary: '' }],
  };
}

describe('linter travel-awareness', () => {
  it('a travel-only node is NOT flagged UNREACHABLE when travel:free', () => {
    const codes = lintStory(roamStory()).warnings.map((w) => w.code);
    expect(codes).not.toContain('UNREACHABLE_NODE'); // b_hub is reachable via the roam edge
  });
  it('RESERVED_CHOICE_ID bites on a __-prefixed authored choice id', () => {
    const s = roamStory();
    s.nodes[0].choices.push({ id: '__travel_b', label: 'x', destination: 'a_end' });
    const codes = lintStory(s).errors.map((e) => e.code);
    expect(codes).toContain('RESERVED_CHOICE_ID');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/engine/linter.travel.test.ts`
Expected: FAIL — `b_hub` is reported `UNREACHABLE_NODE` (computeReachable ignores travel); no `RESERVED_CHOICE_ID` code exists.

- [ ] **Step 3: Make reachability travel-aware + add the reserved-id guard** — in `src/engine/linter.ts`:

Add the travel import at the top:

```ts
import { travelNodeEdges } from './travel';
```

Replace `computeReachable` (lines 58-70) to accept and follow travel edges:

```ts
function computeReachable(story: Story, travelEdges: Map<string, string[]>): Set<string> {
  const out = new Set<string>();
  const stack: string[] = [story.startNodeId];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    const n = story.nodes.find((x) => x.id === id);
    if (!n) continue;
    out.add(id);
    for (const c of n.choices || []) stack.push(c.destination);
    for (const dest of travelEdges.get(id) ?? []) stack.push(dest);
  }
  return out;
}
```

In `lintStory`, the `profile` is already resolved at line 109. Just below it, derive the edges:

```ts
  const travelEdges = travelNodeEdges(story, profile);
```

Update the call site at line 246: `const reachable = computeReachable(story, travelEdges);`

In the `NO_EXIT`/`SOFT_LOCK` block (lines 135-146), count travel exits so a hub with only travel exits is not a no-exit node. Replace the `const choices = n.choices ?? [];` / `if (choices.length === 0)` logic:

```ts
  for (const n of story.nodes) {
    if (n.resolvesEnding || n.endsWith) continue; // an endsWith node resolves (F3), so it needs no choices
    const choices = n.choices ?? [];
    const travelExits = travelEdges.get(n.id) ?? [];
    if (choices.length === 0 && travelExits.length === 0) {
      err('NO_EXIT', `Node ${n.id} has no choices and does not resolve an ending`, n.id);
      continue;
    }
    if (choices.length > 0 && choices.every((c) => staticallyDeadChoice(c, story, sym)) && travelExits.length === 0) {
      err('SOFT_LOCK', `Node ${n.id} has no escapable exit — every choice is permanently locked`, n.id);
    }
  }
```

Add the reserved-choice-id guard inside the existing variable loop region — put it right after the `RESERVED_VAR_PREFIX` loop (after line 115):

```ts
  // reserved namespace on CHOICE ids too — '__travel_<dest>' choices are engine-injected; an authored collision is an error.
  for (const n of story.nodes) {
    for (const c of n.choices || []) {
      if (c.id.startsWith('__')) err('RESERVED_CHOICE_ID', `Choice '${c.id}' (node ${n.id}) uses the reserved '__' prefix (engine-injected, e.g. travel choices)`, n.id);
    }
  }
```

(`EVENT_RECOVERY_UNREACHABLE` at line 304 already reads the same `reachable` set, so it is now travel-aware automatically — no further change.)

- [ ] **Step 4: Run the test + full suite + typecheck**

Run: `npx vitest run src/engine/linter.travel.test.ts && npx vitest run && npx tsc --noEmit`
Expected: PASS — new tests green; existing games still lint identically (their `travelEdges` is empty → `computeReachable`/`NO_EXIT` behave exactly as before); tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/engine/linter.ts src/engine/linter.travel.test.ts
git commit -F - <<'EOF'
feat(travel): travel-aware reachability + reserved choice-id guard

computeReachable / NO_EXIT / SOFT_LOCK / EVENT_RECOVERY_UNREACHABLE now follow
hub->dest-hub travel edges when travel:'free', so the static linter stops
disagreeing with the walker on travel-only nodes and transit hubs. Add
RESERVED_CHOICE_ID (always-on) mirroring RESERVED_VAR_PREFIX. travel:'off'
games are unaffected (empty travel-edge map).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 5: `travelLint.ts` — graph + roam-precondition lints

**Files:**
- Create: `src/engine/travelLint.ts`
- Modify: `src/engine/linter.ts` (merge `lintTravel` results into `lintStory`)
- Test: `src/engine/travelLint.test.ts` (create)

**Interfaces:**
- Consumes: `readsClock` (Task 1), `Story`, `Profile`, `LintIssue`, `parseTime`, `Resource`/`VariableDef` shapes.
- Produces:
  - `lintTravel(story: Story, profile: Profile): LintIssue[]` — `TRAVEL_UNKNOWN_LOCATION`/`TRAVEL_NO_HUB`/`TRAVEL_MISSING_TIME` (errors, only when `travel:'free'`), `TRAVEL_GRAPH_IGNORED`/`TRAVEL_ASYMMETRIC_EDGE`/`TRAVEL_HUB_IS_TERMINAL` (warnings), `ROAM_UNBOUNDED_HUB_WRITE` (error, only when `travel:'free'`).
  - `roamTimeThresholds(story: Story): number[]` — the alignment set (absolute minutes).
  - `checkBucketAlignment(story: Story, bucket: number): LintIssue[]` — `ROAM_BUCKET_MISALIGNED` for a chosen verification bucket.
- Lives outside the Dimension hook (mixed levels + lint context), merged into `lintStory` like `lintResources`.

Finiteness rule: an effect farms infinite keyed states iff it grows a keyed numeric var without bound. So `ROAM_UNBOUNDED_HUB_WRITE` flags, across every node's `entryEffects` and every choice's `effects` (and event `ifAbsentEffects`): an `increment` on a numeric var with no `max` bound; a `decrement` with no `min` bound; and `adjust_resource` outright (its `__roff_` offset is unclamped and keyed). Set-semantic ops (`add_*`/`mark_*`/`set`) and `add_minutes` (time is dropped/bucketed) are bounded — never flagged. A var is bounded if it is a `Resource` (has min+max) or a `VariableDef` with the relevant bound declared.

Bucket-alignment: depleted resource values are written into `state.vars` and keyed raw (`resources.ts:31-33`), so depletion-step boundaries are explored regardless of bucket — they are NOT in the alignment set. The set is: `readsClock` literals in **choice** and **ending** conditions, every event trigger time, and the deadline (all as absolute minutes). `time_*` literals parse via `parseTime`; a `{field:'time'}` value-op literal is `Number(c.value)` (absolute minutes).

- [ ] **Step 1: Write the failing test** — create `src/engine/travelLint.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Story } from './types';
import { lintTravel, roamTimeThresholds, checkBucketAlignment } from './travelLint';

function base(): Story {
  return {
    id: 't', title: 'T', startNodeId: 'a_hub', startTime: '00:00', startLocation: 'a',
    profile: { clock: 'untimed', travel: 'free' },
    variables: [], events: [], resources: [],
    locations: [
      { id: 'a', name: 'A', connectedLocations: ['b'], travelTimes: { b: 10 }, defaultNode: 'a_hub' },
      { id: 'b', name: 'B', connectedLocations: ['a'], travelTimes: { a: 10 }, defaultNode: 'b_hub' },
    ],
    nodes: [
      { id: 'a_hub', title: 'A', body: '', choices: [{ id: 'fin', label: 'F', destination: 'a_end' }] },
      { id: 'a_end', title: 'E', body: '', choices: [], resolvesEnding: true },
      { id: 'b_hub', title: 'B', body: '', choices: [{ id: 'fin', label: 'F', destination: 'a_end' }] },
    ],
    endings: [{ id: 'fin', name: 'F', conditions: [], isDefault: true, summary: '' }],
  };
}

describe('travel structural lints', () => {
  it('clean roam graph lints clean', () => {
    expect(lintTravel(base(), { clock: 'untimed', travel: 'free' })).toEqual([]);
  });
  it('TRAVEL_MISSING_TIME / TRAVEL_UNKNOWN_LOCATION / TRAVEL_NO_HUB / TRAVEL_ASYMMETRIC_EDGE / TRAVEL_HUB_IS_TERMINAL', () => {
    const s = base();
    s.locations[0].travelTimes = {};                 // missing time a->b
    s.locations[0].connectedLocations = ['b', 'zzz']; // unknown loc + now asymmetric (zzz, and b<-a still ok)
    s.locations[1].defaultNode = undefined;           // b has no hub
    const codes = lintTravel(s, { clock: 'untimed', travel: 'free' }).map((i) => i.code);
    expect(codes).toContain('TRAVEL_MISSING_TIME');
    expect(codes).toContain('TRAVEL_UNKNOWN_LOCATION');
    expect(codes).toContain('TRAVEL_NO_HUB');
    expect(codes).toContain('TRAVEL_ASYMMETRIC_EDGE');
  });
  it('TRAVEL_GRAPH_IGNORED warns when a graph is declared but travel:off', () => {
    const codes = lintTravel(base(), { clock: 'untimed', travel: 'off' }).map((i) => i.code);
    expect(codes).toContain('TRAVEL_GRAPH_IGNORED');
  });
});

describe('roam finiteness lint', () => {
  it('ROAM_UNBOUNDED_HUB_WRITE bites on an unbounded increment and adjust_resource, passes a bounded counter', () => {
    const s = base();
    s.variables = [{ name: 'n', type: 'number', default: 0, purpose: 'unbounded' }];
    s.nodes[0].entryEffects = [{ field: 'n', op: 'increment', value: '1' }]; // no max → unbounded
    const codes = lintTravel(s, { clock: 'untimed', travel: 'free' }).map((i) => i.code);
    expect(codes).toContain('ROAM_UNBOUNDED_HUB_WRITE');

    const s2 = base();
    s2.variables = [{ name: 'n', type: 'number', default: 0, min: 0, max: 3, purpose: 'bounded' }];
    s2.nodes[0].entryEffects = [{ field: 'n', op: 'increment', value: '1' }]; // has max → fine
    expect(lintTravel(s2, { clock: 'untimed', travel: 'free' }).map((i) => i.code)).not.toContain('ROAM_UNBOUNDED_HUB_WRITE');
  });
});

describe('bucket alignment (verification-time check)', () => {
  it('thresholds collect time gates; a misaligned bucket bites, an aligned one passes', () => {
    const s = base();
    s.profile = { clock: 'timed', travel: 'free' };
    s.deadline = '01:00'; // 60
    s.nodes[0].choices[0].conditions = [{ field: 'time', op: 'time_after', value: '00:15' }]; // 15
    expect(roamTimeThresholds(s).sort((a, b) => a - b)).toEqual([15, 60]);
    expect(checkBucketAlignment(s, 10).map((i) => i.code)).toContain('ROAM_BUCKET_MISALIGNED'); // 10 ∤ 15
    expect(checkBucketAlignment(s, 5)).toEqual([]); // 5 | 15 and 5 | 60
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/engine/travelLint.test.ts`
Expected: FAIL — `Cannot find module './travelLint'`.

- [ ] **Step 3: Implement `src/engine/travelLint.ts`**

```ts
import type { Story, Profile, LintIssue, Condition, Effect } from './types';
import { parseTime } from './time';
import { readsClock } from './profile';

const issue = (level: 'error' | 'warning', code: string, message: string, where?: string): LintIssue =>
  ({ level, code, message, where });

/** A keyed numeric var is bounded above iff it has a max (resource or VariableDef.max); below iff it has a min. */
function boundsOf(story: Story): Map<string, { min?: number; max?: number }> {
  const m = new Map<string, { min?: number; max?: number }>();
  for (const v of story.variables) m.set(v.name, { min: v.min, max: v.max });
  for (const r of story.resources ?? []) m.set(r.id, { min: r.min, max: r.max });
  return m;
}

function unboundedWrites(story: Story): LintIssue[] {
  const out: LintIssue[] = [];
  const bounds = boundsOf(story);
  const scan = (es: Effect[] | undefined, where: string) => {
    for (const e of es ?? []) {
      if (e.op === 'adjust_resource') {
        out.push(issue('error', 'ROAM_UNBOUNDED_HUB_WRITE',
          `adjust_resource on '${e.field}' is roam-reachable: its '__roff_' offset is unclamped and keyed, farming infinite states under roam — not allowed in a roam game`, where));
        continue;
      }
      if (e.op === 'increment' && bounds.get(e.field)?.max === undefined) {
        out.push(issue('error', 'ROAM_UNBOUNDED_HUB_WRITE',
          `increment of '${e.field}' has no max bound — under roam it farms infinite keyed states; declare a max`, where));
      }
      if (e.op === 'decrement' && bounds.get(e.field)?.min === undefined) {
        out.push(issue('error', 'ROAM_UNBOUNDED_HUB_WRITE',
          `decrement of '${e.field}' has no min bound — under roam it farms infinite keyed states; declare a min`, where));
      }
    }
  };
  for (const n of story.nodes) {
    scan(n.entryEffects, `node ${n.id}`);
    for (const c of n.choices ?? []) scan(c.effects, `choice ${c.id}`);
  }
  for (const ev of story.events) scan(ev.ifAbsentEffects, `event ${ev.id}`);
  return out;
}

export function lintTravel(story: Story, profile: Profile): LintIssue[] {
  const out: LintIssue[] = [];
  const locById = new Map(story.locations.map((l) => [l.id, l]));
  const declaresGraph = story.locations.some((l) => (l.connectedLocations?.length ?? 0) > 0);

  if (profile.travel !== 'free') {
    if (declaresGraph) out.push(issue('warning', 'TRAVEL_GRAPH_IGNORED',
      `connectedLocations are declared but travel:'off' — the roam graph is inert (forgotten toggle?)`));
    return out;
  }

  for (const loc of story.locations) {
    for (const dest of loc.connectedLocations ?? []) {
      const d = locById.get(dest);
      if (!d) { out.push(issue('error', 'TRAVEL_UNKNOWN_LOCATION', `Location ${loc.id} connects to unknown location '${dest}'`, loc.id)); continue; }
      if (!d.defaultNode) out.push(issue('error', 'TRAVEL_NO_HUB', `Travel-reachable location ${dest} has no defaultNode (you could arrive nowhere)`, dest));
      if (loc.travelTimes?.[dest] === undefined) out.push(issue('error', 'TRAVEL_MISSING_TIME', `Connection ${loc.id} -> ${dest} has no travelTimes entry`, loc.id));
      if (!(d.connectedLocations ?? []).includes(loc.id)) out.push(issue('warning', 'TRAVEL_ASYMMETRIC_EDGE', `${loc.id} connects to ${dest} but ${dest} does not connect back (roam graph should be symmetric; use authored change_location for one-way)`, loc.id));
    }
    if (loc.defaultNode) {
      const hub = story.nodes.find((n) => n.id === loc.defaultNode);
      if (hub && (hub.resolvesEnding || hub.endsWith)) out.push(issue('warning', 'TRAVEL_HUB_IS_TERMINAL', `Location ${loc.id}'s hub '${loc.defaultNode}' resolves an ending — arriving there ends the game on contact`, loc.id));
    }
  }

  out.push(...unboundedWrites(story));
  return out;
}

/** The time thresholds (absolute minutes) a timed-roam bucket must evenly divide. Depletion boundaries are
 *  subsumed (depleted values are keyed raw), so they are NOT included. */
export function roamTimeThresholds(story: Story): number[] {
  const set = new Set<number>();
  const litMinutes = (c: Condition): number[] => {
    if (!c.value) return [];
    if (c.op === 'time_between') return c.value.split('-').map((s) => parseTime(s.trim()));
    if (c.op.startsWith('time_')) return [parseTime(c.value)];
    return [Number(c.value)]; // value-op on field:'time' → absolute minutes
  };
  const scan = (cs: Condition[] | undefined) => { for (const c of cs ?? []) if (readsClock(c)) for (const m of litMinutes(c)) if (Number.isFinite(m)) set.add(m); };
  for (const n of story.nodes) for (const c of n.choices ?? []) scan(c.conditions);
  for (const en of story.endings) scan(en.conditions);
  for (const ev of story.events) for (const c of ev.trigger ?? []) for (const m of litMinutes(c)) if (Number.isFinite(m)) set.add(m);
  if (story.deadline !== undefined) set.add(parseTime(story.deadline));
  return [...set];
}

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }

/** ROAM_BUCKET_MISALIGNED — run at the verification boundary with the bucket the walker will use. */
export function checkBucketAlignment(story: Story, bucket: number): LintIssue[] {
  const thresholds = roamTimeThresholds(story).filter((t) => t > 0);
  const bad = thresholds.filter((t) => t % bucket !== 0);
  if (bad.length === 0) return [];
  const suggested = thresholds.reduce((a, b) => gcd(a, b));
  return [issue('error', 'ROAM_BUCKET_MISALIGNED',
    `timeBucket ${bucket} does not divide time threshold(s) [${bad.sort((a, b) => a - b).join(', ')}] — bucketing would merge open/closed variants of a time-gated choice. Use a bucket that divides them (e.g. ${suggested}).`)];
}
```

- [ ] **Step 4: Merge `lintTravel` into `lintStory`** — in `src/engine/linter.ts`, add the import:

```ts
import { lintTravel } from './travelLint';
```

and just before `return { ok: errors.length === 0, errors, warnings };` (line 371), merge:

```ts
  for (const i of lintTravel(story, profile)) {
    if (i.level === 'error') errors.push(i); else warnings.push(i);
  }
```

- [ ] **Step 5: Run the tests + full suite + typecheck**

Run: `npx vitest run src/engine/travelLint.test.ts && npx vitest run && npx tsc --noEmit`
Expected: PASS — new tests green; existing games unaffected (`lintTravel` returns `[]` for them: `travel:'off'` and no declared graph); tsc clean.

- [ ] **Step 6: Commit**

```bash
git add src/engine/travelLint.ts src/engine/linter.ts src/engine/travelLint.test.ts
git commit -F - <<'EOF'
feat(travel): travel + roam-precondition lints

travelLint.ts: structural errors (TRAVEL_UNKNOWN_LOCATION/NO_HUB/MISSING_TIME),
warnings (TRAVEL_GRAPH_IGNORED/ASYMMETRIC_EDGE/HUB_IS_TERMINAL), the finiteness
error ROAM_UNBOUNDED_HUB_WRITE (rejects adjust_resource + unbounded
increment/decrement, both clock modes, counted vars included), and the
verification-boundary check ROAM_BUCKET_MISALIGNED (alignment set via readsClock;
depletion boundaries subsumed because depleted values are keyed). Merged into
lintStory like lintResources.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 6: Walker roam mode — finite keying, full edges, co-reachability, INDETERMINATE-on-cap

**Files:**
- Modify: `src/engine/stateSpaceWalk.ts` (`WalkReport`, `keyOf`, `walk`, `walkStateSpace`)
- Test: `src/engine/stateSpaceWalk.travel.test.ts` (create)

**Interfaces:**
- Consumes: `resolveProfile` (from `./profile`).
- Produces: `walkStateSpace(story, { cap?, timeBucket?, roam? })` — `WalkReport` gains `deadRegions: string[]` and `indeterminate: boolean`. In roam mode: untimed drops time from the key, timed buckets it; the walk records the full forward edge set and computes `deadRegions`; `indeterminate = roam && capHit`.

- [ ] **Step 1: Write the failing test** — create `src/engine/stateSpaceWalk.travel.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Story } from './types';
import { walkStateSpace } from './stateSpaceWalk';

// Reconvergent clean map: a<->b, both can finish. The soundness regression guard:
// a tree-only co-reachability would false-positive b as dead (b->a edge dropped).
function reconvergent(): Story {
  return {
    id: 't', title: 'T', startNodeId: 'a_hub', startTime: '00:00', startLocation: 'a',
    profile: { clock: 'untimed', travel: 'free' },
    variables: [], events: [], resources: [],
    locations: [
      { id: 'a', name: 'A', connectedLocations: ['b'], travelTimes: { b: 10 }, defaultNode: 'a_hub' },
      { id: 'b', name: 'B', connectedLocations: ['a'], travelTimes: { a: 10 }, defaultNode: 'b_hub' },
    ],
    nodes: [
      { id: 'a_hub', title: 'A', body: '', choices: [{ id: 'fin', label: 'F', destination: 'a_end' }] },
      { id: 'a_end', title: 'E', body: '', choices: [], resolvesEnding: true },
      // b can ONLY get out by traveling back to a (b->a edge is a re-visit edge the parent tree drops)
      { id: 'b_hub', title: 'B', body: '', choices: [] },
    ],
    endings: [{ id: 'fin', name: 'F', conditions: [], isDefault: true, summary: '' }],
  };
}

// Stranded map: c is a dead region — you can roam a<->c but c can never reach an ending.
function stranded(): Story {
  const s = reconvergent();
  s.locations[0].connectedLocations = ['b', 'c'];
  s.locations[0].travelTimes = { b: 10, c: 10 };
  s.locations.push({ id: 'c', name: 'C', connectedLocations: ['a'], travelTimes: { a: 10 }, defaultNode: 'c_hub' });
  // c_hub only travels back to a, and a can finish — so c is NOT stranded here. To strand, cut c->a:
  s.locations[2].connectedLocations = []; // c connects nowhere out; its hub has no choices
  s.nodes.push({ id: 'c_hub', title: 'C', body: '', choices: [] });
  return s;
}

describe('walker roam mode', () => {
  it('untimed roam terminates and the reconvergent clean map has no dead regions', () => {
    const r = walkStateSpace(reconvergent());
    expect(r.capHit).toBe(false);          // time dropped → finite
    expect(r.indeterminate).toBe(false);
    expect(r.deadRegions).toEqual([]);     // b reaches an ending via b->a->finish (full-edge co-reachability)
    expect(r.softlocks).toEqual([]);
  });
  it('a stranded wander-region is reported in deadRegions', () => {
    const r = walkStateSpace(stranded());
    expect(r.deadRegions).toContain('c_hub'); // c can never reach an ending
  });
  it('capHit in roam is INDETERMINATE', () => {
    const r = walkStateSpace(reconvergent(), { cap: 1 }); // force a cap
    expect(r.capHit).toBe(true);
    expect(r.indeterminate).toBe(true);
  });
});
```

Note on `stranded()`: `c_hub` has no choices and no travel exits → it is also a `NO_EXIT`/softlock-shaped node. That is fine for this walker test (we assert `deadRegions` contains it). The point is the co-reachability pass flags it as unable to reach an ending; a real stranding fixture (Task 8) makes the region non-trivial.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/engine/stateSpaceWalk.travel.test.ts`
Expected: FAIL — `r.deadRegions` / `r.indeterminate` are `undefined` (fields don't exist); and untimed roam runs to cap (time not dropped).

- [ ] **Step 3: Add the report fields** — in `src/engine/stateSpaceWalk.ts`, extend `WalkReport` (after line 19):

```ts
  deadRegions: string[];   // roam: forward-reachable node ids from which NO ending is reachable (co-reachability)
  indeterminate: boolean;  // roam + capHit: the honesty results are from a partial walk — treat as FAIL, not all-clear
```

- [ ] **Step 4: Roam-mode keying + full edges + terminal keys** — modify `walk` and `keyOf`:

Add the import at the top:

```ts
import { resolveProfile } from './profile';
```

Change `keyOf` (line 28) to take an explicit effective-time so the caller controls drop/bucket:

```ts
function keyOf(n: WNode, timeKey: number): string {
  const s = n.snap.state;
  const sortArr = (a: string[]) => [...a].sort();
  return JSON.stringify({
    id: n.snap.currentId,
    ending: n.snap.endingId ?? null,
    time: timeKey,
    location: s.location,
    clues: sortArr(s.clues),
    inventory: sortArr(s.inventory),
    visited: sortArr(s.visited),
    completedEvents: sortArr(s.completedEvents),
    vars: Object.fromEntries(Object.entries(s.vars).sort(([a], [b]) => a.localeCompare(b))),
  });
}
```

Add a helper just below `keyOf`:

```ts
// Effective time component: roam+untimed drops time (A<->A dedups); else raw, or bucketed when a bucket is given.
function timeKeyFor(n: WNode, roam: boolean, untimed: boolean, timeBucket?: number): number {
  if (roam && untimed) return 0;
  const t = n.snap.state.time;
  return timeBucket ? Math.floor(t / timeBucket) : t;
}
```

Extend `WalkResult` (after line 68) with the full-edge structure + terminal keys:

```ts
  edges: Map<string, Set<string>>; // FULL forward transition relation (every taken edge, incl. to-visited)
  terminalKeys: Set<string>;
```

Rewrite `walk` (lines 71-132) to thread roam mode, key via `timeKeyFor`, record every edge, and collect terminal keys. Replace the function body:

```ts
function walk(story: Story, cap: number, timeBucket?: number, roamOpt?: boolean): WalkResult {
  const profile = resolveProfile(story);
  const roam = roamOpt ?? (profile.travel === 'free');
  const untimed = profile.clock === 'untimed';
  const key = (n: WNode) => keyOf(n, timeKeyFor(n, roam, untimed, timeBucket));

  const visited = new Map<string, WNode>();
  const parent = new Map<string, { prevKey: string; choiceId: string } | null>();
  const edges = new Map<string, Set<string>>();
  const terminalKeys = new Set<string>();
  const terminals: WNode[] = [];
  const exercisedChoices = new Set<string>();
  const choiceAvail = new Map<string, { available: number; locked: number }>();
  const reachedNodes = new Set<string>();
  const reachedEndings = new Set<string>();
  const softlocks: WNode[] = [];
  const zeroEnding: WNode[] = [];
  let capHit = false;

  const start = snapAt(story, null);
  const startKey = key(start);
  visited.set(startKey, start);
  parent.set(startKey, null);
  const queue: WNode[] = [start];

  while (queue.length) {
    if (visited.size >= cap) { capHit = true; break; }
    const cur = queue.shift()!;
    const curKey = key(cur);
    reachedNodes.add(cur.snap.currentId);

    const ended = cur.view.endingReached;
    if (ended) {
      reachedEndings.add(ended.id);
      terminals.push(cur);
      terminalKeys.add(curKey);
      if (!resolveEnding(cur.snap.state, story)) zeroEnding.push(cur);
      continue;
    }

    const available = cur.view.choices.filter((c) => c.available);
    for (const c of cur.view.choices) {
      const k = `${cur.snap.currentId}::${c.id}`;
      const rec = choiceAvail.get(k) ?? { available: 0, locked: 0 };
      if (c.available) rec.available++; else rec.locked++;
      choiceAvail.set(k, rec);
    }
    if (available.length === 0) { softlocks.push(cur); continue; }

    for (const ch of available) {
      exercisedChoices.add(`${cur.snap.currentId}::${ch.id}`);
      const next = snapAt(story, cur, ch.id);
      const nextKey = key(next);
      // record the FULL forward edge — even when nextKey is already visited (co-reachability needs all edges)
      const set = edges.get(curKey) ?? new Set<string>();
      set.add(nextKey);
      edges.set(curKey, set);
      if (!visited.has(nextKey)) {
        visited.set(nextKey, next);
        parent.set(nextKey, { prevKey: curKey, choiceId: ch.id });
        queue.push(next);
        if (visited.size >= cap) { capHit = true; break; }
      }
    }
    if (capHit) break;
  }

  return { story, visited, terminals, capHit, exercisedChoices, choiceAvail, reachedNodes, reachedEndings, softlocks, zeroEnding, parent, edges, terminalKeys };
}
```

Note: the `findOrphanEndings`/`computeEventPresent`/etc. helpers still take a `WalkResult` and are unchanged.

- [ ] **Step 5: Add the co-reachability pass + report the new fields** — add this helper above `walkStateSpace`:

```ts
// Co-reachability: from which states is SOME ending still reachable? Walk the FULL edge set backward from every
// terminal; any forward-reachable state not marked is a dead region. Returns distinct node ids.
function computeDeadRegions(w: WalkResult): string[] {
  const rev = new Map<string, string[]>();
  for (const [from, tos] of w.edges) for (const to of tos) {
    const a = rev.get(to);
    if (a) a.push(from); else rev.set(to, [from]);
  }
  const canReach = new Set<string>(w.terminalKeys);
  const q = [...w.terminalKeys];
  while (q.length) {
    const k = q.shift()!;
    for (const p of rev.get(k) ?? []) if (!canReach.has(p)) { canReach.add(p); q.push(p); }
  }
  const dead = new Set<string>();
  for (const [k, n] of w.visited) if (!canReach.has(k)) dead.add(n.snap.currentId);
  return [...dead];
}
```

Update `walkStateSpace` (line 186) to accept `roam`, pass it through, and emit the fields:

```ts
export function walkStateSpace(story: Story, opts?: { cap?: number; timeBucket?: number; roam?: boolean }): WalkReport {
  const cap = opts?.cap ?? DEFAULT_CAP;
  const profile = resolveProfile(story);
  const roam = opts?.roam ?? (profile.travel === 'free');
  const w = walk(story, cap, opts?.timeBucket, roam);
  return {
    statesExplored: w.visited.size,
    capHit: w.capHit,
    indeterminate: roam && w.capHit,
    deadRegions: roam ? computeDeadRegions(w) : [],
    zeroEnding: [...new Set(w.zeroEnding.map((n) => n.view.endingReached?.id ?? n.snap.currentId))],
    softlocks: [...new Set(w.softlocks.map((n) => n.snap.currentId))],
    orphanNodes: findOrphanNodes(w),
    orphanEndings: findOrphanEndings(w),
    deadChoices: findDeadChoices(w),
    eventRecovery: checkEventRecovery(w),
    eventPresent: computeEventPresent(w),
    conditionalChoices: [...w.choiceAvail.entries()].filter(([, v]) => v.available > 0 && v.locked > 0).map(([k]) => k).sort(),
    overlaps: findEndingAmbiguities(w),
  };
}
```

- [ ] **Step 6: Run the test + full suite + typecheck**

Run: `npx vitest run src/engine/stateSpaceWalk.travel.test.ts && npx vitest run && npx tsc --noEmit`
Expected: PASS — roam tests green; existing walker tests still green: non-roam games have `roam=false` → `deadRegions:[]`, `indeterminate:false`, and the key uses raw/bucketed time exactly as before (the `keyOf` signature changed but `timeKeyFor` reproduces the old behavior for non-roam). tsc clean.

- [ ] **Step 7: Commit**

```bash
git add src/engine/stateSpaceWalk.ts src/engine/stateSpaceWalk.travel.test.ts
git commit -F - <<'EOF'
feat(travel): bounded-exhaustive roam mode in the walker

Roam keying (untimed drops time, timed buckets it) keeps the walk finite. The
walk now records the FULL forward edge set (every taken edge, including to
already-visited states) and runs a co-reachability pass: deadRegions = nodes
from which no ending is reachable — the property free-roam needs, computed over
the edge set, NOT the parent spanning tree (which would false-positive
reconvergent maps). capHit in roam sets indeterminate (treat as FAIL). Non-roam
games are unchanged.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 7: Container fence — `ROAM_CHAPTER_PROFILE_MISSING` + `ROAM_CARRY_UNVERIFIABLE`

**Files:**
- Modify: `src/container/lintGame.ts`
- Test: `src/container/lintGame.travel.test.ts` (create)

**Interfaces:**
- Consumes: `resolveProfile` (already imported in lintGame.ts at line 1).
- Produces, in `lintGame`:
  - `ROAM_CARRY_UNVERIFIABLE` (error) — a `travel:'free'`-resolving chapter in a **multi-chapter** game (`chapters.length > 1`).
  - `ROAM_CHAPTER_PROFILE_MISSING` (error) — a chapter that resolves `travel:'free'` only via the inherited `game.profile` (its own `story.profile` does not declare it), so the engine — which reads `story.profile` alone — would not actually roam at runtime.

- [ ] **Step 1: Write the failing test** — create `src/container/lintGame.travel.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Game } from './types';
import { lintGame } from './lintGame';

function roamChapterStory(id: string) {
  return {
    id, title: id, startNodeId: 'h', startTime: '00:00', startLocation: 'a',
    profile: { clock: 'untimed', travel: 'free' } as const,
    variables: [], events: [], resources: [],
    locations: [{ id: 'a', name: 'A', connectedLocations: [], travelTimes: {}, defaultNode: 'h' }],
    nodes: [{ id: 'h', title: 'H', body: '', choices: [{ id: 'fin', label: 'F', destination: 'e' }] },
            { id: 'e', title: 'E', body: '', choices: [], resolvesEnding: true }],
    endings: [{ id: 'fin', name: 'F', conditions: [], isDefault: true, summary: '' }],
  };
}

describe('container roam fence', () => {
  it('a single-chapter roam game lints clean', () => {
    const g: Game = {
      id: 'g', title: 'G', startChapterId: 'c1',
      carry: { vars: 'all', resources: [], clues: false, inventory: false },
      chapters: [{ id: 'c1', title: 'C1', story: roamChapterStory('s1'), gameEnding: true, transitions: [] }],
    };
    expect(lintGame(g).errors.map((e) => e.code)).not.toContain('ROAM_CARRY_UNVERIFIABLE');
    expect(lintGame(g).ok).toBe(true);
  });
  it('ROAM_CARRY_UNVERIFIABLE forbids a roam chapter in a multi-chapter game', () => {
    const g: Game = {
      id: 'g', title: 'G', startChapterId: 'c1',
      carry: { vars: 'all', resources: [], clues: false, inventory: false },
      chapters: [
        { id: 'c1', title: 'C1', story: roamChapterStory('s1'), transitions: [{ when: {}, goTo: 'c2' }] },
        { id: 'c2', title: 'C2', story: roamChapterStory('s2'), gameEnding: true, transitions: [] },
      ],
    };
    expect(lintGame(g).errors.map((e) => e.code)).toContain('ROAM_CARRY_UNVERIFIABLE');
  });
  it('ROAM_CHAPTER_PROFILE_MISSING when only the game declares travel:free', () => {
    const story = roamChapterStory('s1');
    story.profile = { clock: 'untimed' } as never; // chapter does NOT declare travel
    const g: Game = {
      id: 'g', title: 'G', startChapterId: 'c1', profile: { clock: 'untimed', travel: 'free' },
      carry: { vars: 'all', resources: [], clues: false, inventory: false },
      chapters: [{ id: 'c1', title: 'C1', story, gameEnding: true, transitions: [] }],
    };
    expect(lintGame(g).errors.map((e) => e.code)).toContain('ROAM_CHAPTER_PROFILE_MISSING');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/container/lintGame.travel.test.ts`
Expected: FAIL — neither code exists.

- [ ] **Step 3: Add the fence** — in `src/container/lintGame.ts`, after the clock-conflict block (after line 43):

```ts
  // Travel fence (v1): roam verification is single-chapter only — the container's seeded/value-at-endings walks
  // are not yet roam-safe, so a roam chapter inside a multi-chapter carry would get a false all-clear.
  const multiChapter = game.chapters.length > 1;
  for (const ch of game.chapters) {
    const resolved = resolveProfile(ch.story, game.profile).travel;
    if (resolved !== 'free') continue;
    if (multiChapter) {
      errors.push({ level: 'error', code: 'ROAM_CARRY_UNVERIFIABLE',
        message: `chapter ${ch.id} is travel:'free' inside a ${game.chapters.length}-chapter game — multi-chapter roam is unsupported in v1 (keep roam games single-chapter)`, where: ch.id });
    }
    // the engine reads only story.profile at runtime; inheriting travel from the game alone would silently not roam.
    if (resolveProfile(ch.story).travel !== 'free') {
      errors.push({ level: 'error', code: 'ROAM_CHAPTER_PROFILE_MISSING',
        message: `chapter ${ch.id} resolves travel:'free' only via the game profile; declare travel:'free' in the chapter's own story.profile (the engine reads story.profile at runtime)`, where: ch.id });
    }
  }
```

- [ ] **Step 4: Run the test + full suite + typecheck**

Run: `npx vitest run src/container/lintGame.travel.test.ts && npx vitest run && npx tsc --noEmit`
Expected: PASS — fence tests green; the cave + heist + untimedExample games are all `travel:'off'` → neither code fires; suite green; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/container/lintGame.ts src/container/lintGame.travel.test.ts
git commit -F - <<'EOF'
feat(travel): container fence — single-chapter roam only in v1

ROAM_CARRY_UNVERIFIABLE forbids a travel:'free' chapter inside a multi-chapter
game (container seeded/value-at-endings walks aren't roam-safe yet; parity build
deferred to the D2 corpus). ROAM_CHAPTER_PROFILE_MISSING catches the runtime
inheritance gap — the engine reads story.profile, so a roam chapter must declare
travel:'free' itself, not only inherit it from the game.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 8: The roam reference game + the integration / soundness proof

**Files:**
- Create: `src/container/roamExample.ts`
- Create: `src/container/roamExample.test.ts`
- Modify: `src/container/index.ts` (export it)

**Interfaces:**
- Consumes: everything above.
- Produces: `export const roamExample: Game` (single chapter, untimed, `travel:'free'`); `export const roamExampleTimed: Game` (single chapter, timed, `travel:'free'`); `export const roamStranded: Story` (a deliberately-stranded variant for the co-reachability bite). A real game: 3 locations, a hub each, **cross-location state coupling** (a token picked up in one location gates the "good" ending reached at another), and a **reconvergent** clean graph.

Design rules (mirror `untimedExample.ts`): latches set by unconditional `entryEffects` (not choice effects); a default ending; no `__`-prefixed ids; symmetric `connectedLocations`; for the untimed variant no clock features; the clean graph is reconvergent (every hub reachable from ≥2 others) so the co-reachability soundness guard is exercised.

- [ ] **Step 1: Write the failing test** — create `src/container/roamExample.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { lintGame, GameRunner } from './index';
import { walkStateSpace, lintStory } from '../engine';
import { checkBucketAlignment, roamTimeThresholds } from '../engine/travelLint';
import { roamExample, roamExampleTimed, roamStranded } from './roamExample';

describe('roam reference game', () => {
  it('the untimed reference game lints clean (game + story)', () => {
    expect(lintGame(roamExample).errors).toEqual([]);
    expect(lintStory(roamExample.chapters[0].story).errors).toEqual([]);
  });

  it('the untimed roam walk terminates, verifies, and has no dead regions', () => {
    const r = walkStateSpace(roamExample.chapters[0].story);
    expect(r.capHit).toBe(false);
    expect(r.indeterminate).toBe(false);
    expect(r.softlocks).toEqual([]);
    expect(r.deadRegions).toEqual([]);          // reconvergent clean map — the soundness regression guard
    expect(r.orphanEndings).toEqual([]);         // every ending reachable
  });

  it('a GameRunner roams across locations and reaches the coupled good ending', () => {
    const g = new GameRunner(roamExample);
    // (path filled in once the game is authored; assert it reaches the cross-location "good" ending)
    expect(g.view().gameElapsedMinutes).toBeGreaterThanOrEqual(0);
  });

  it('the stranded variant is flagged by co-reachability', () => {
    const r = walkStateSpace(roamStranded);
    expect(r.deadRegions.length).toBeGreaterThan(0);
  });

  it('the timed reference game: an aligned bucket verifies, a misaligned one bites', () => {
    const story = roamExampleTimed.chapters[0].story;
    const bucket = roamTimeThresholds(story).reduce((a, b) => { const g = (x: number, y: number): number => y === 0 ? x : g(y, x % y); return g(a, b); });
    expect(checkBucketAlignment(story, bucket)).toEqual([]);
    const r = walkStateSpace(story, { timeBucket: bucket });
    expect(r.indeterminate).toBe(false);
    expect(r.deadRegions).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/container/roamExample.test.ts`
Expected: FAIL — `Cannot find module './roamExample'`.

- [ ] **Step 3: Author `src/container/roamExample.ts`**

Author a single-chapter game with three locations (`atrium`, `library`, `vault`), each with a hub node and a little local content, wired into a reconvergent symmetric graph (atrium↔library, library↔vault, atrium↔vault). Cross-location coupling: a `key_found` latch (unconditional `entryEffect` on a `library` local node) gates the "good" ending resolved at the `vault` hub's finish; without it the player reaches a lesser ending. Provide a `finish` path from a hub that `resolvesEnding`. Build:
- `roamExample: Game` — untimed (`profile: { clock: 'untimed', travel: 'free' }`, no deadline/resources/time conditions), single `gameEnding` chapter, `travel:'free'` declared on the chapter story.
- `roamExampleTimed: Game` — same shape but `clock:'timed'`, a `deadline`, and one `time_after` choice gate whose literal the bucket must divide (e.g. travelTimes all `10`, deadline `01:00`, a gate at `00:30` → thresholds `{30,60}`, aligned bucket `10` or `30`). Keep it `CLOCK_CANNOT_BITE`-clean (the longest path must be able to exceed the window — author enough travel/among-hub minutes).
- `roamStranded: Story` — clone of the untimed chapter story with one location whose `connectedLocations` lead into a sub-region that cannot reach any ending (e.g. a `crypt` reachable from `vault` but with no finish and no way back), so `deadRegions` is non-empty.

Follow `untimedExample.ts` exactly for fixture style (typed `Story`/`Game`, latches via `entryEffects`, a default ending, `carry` contract). Keep prose short. Ensure no choice id starts with `__`.

After authoring, fill in the `GameRunner` path in the test's third case (the sequence of `g.choose(...)` calls — including `__travel_<dest>` ids — that picks up the key in `library` and finishes in `vault`) and assert `g.view().finalEndingId` is the coupled good ending.

- [ ] **Step 4: Export it** — in `src/container/index.ts`, after line 14:

```ts
export { roamExample, roamExampleTimed, roamStranded } from './roamExample';
```

- [ ] **Step 5: Run the test + full suite + typecheck**

Run: `npx vitest run src/container/roamExample.test.ts && npx vitest run && npx tsc --noEmit`
Expected: PASS — all reference-game tests green (clean lints; untimed walk verifies with `deadRegions:[]`; the GameRunner reaches the coupled ending; the stranded variant has dead regions; the timed game verifies under an aligned bucket); full suite green; tsc clean.

- [ ] **Step 6: Commit**

```bash
git add src/container/roamExample.ts src/container/roamExample.test.ts src/container/index.ts
git commit -F - <<'EOF'
feat(travel): roam reference game + soundness proof

roamExample (untimed) + roamExampleTimed: single-chapter roam games with three
locations, hubs, a reconvergent symmetric graph, and cross-location state
coupling (a key found in one location gates the good ending reached at another)
— a real game, not plumbing. Proves: hub injection, a paid trip, a non-hub
injects nothing, the roam walk terminates and verifies with deadRegions:[] on a
RECONVERGENT map (the co-reachability soundness regression guard), and a timed
roam game verifies under an aligned bucket. roamStranded exercises the
deadRegions bite.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 9: Authoring guide

**Files:**
- Create: `docs/authoring/free-travel.md`

**Interfaces:** none (docs).

- [ ] **Step 1: Write the guide** — create `docs/authoring/free-travel.md` covering, each as a short section with a code snippet from `roamExample.ts`:
  - The roam-game shape: locations + a `defaultNode` hub each + the symmetric `connectedLocations`/`travelTimes` graph; the engine injects `__travel_<dest>` choices at hubs; local content lives off the hub and flows back.
  - **Coexist:** `travel:'free'` lives alongside authored `change_location` (use the latter for one-way / conditional / locked edges). The footgun: `change_location` sets `location` but not `currentId`, so dropping a player at a non-hub node yields no travel choices until they reach the hub.
  - **Write to state/location gates, not exact-clock gates** — and why (bucket coarsening).
  - **Timed roam + the bucket:** the bucket is a verification parameter; it must divide every time threshold (`readsClock` gates on choices/endings, event triggers, the deadline); `ROAM_BUCKET_MISALIGNED` tells you when it doesn't and suggests one. Depletion boundaries don't count (depleted values are keyed).
  - **Finiteness:** no unbounded `increment`/`decrement` (declare bounds) and no `adjust_resource` in a roam game (`ROAM_UNBOUNDED_HUB_WRITE`).
  - **The cap is a FAILURE in roam** (`indeterminate`): shrink the map or coarsen the bucket; an empty `softlocks`/`deadRegions` from a capped walk means nothing.
  - **`deadRegions`:** the co-reachability guarantee — no wander-region from which no ending is reachable.
  - **v1 fence:** roam games are single-chapter (`ROAM_CARRY_UNVERIFIABLE`); declare `travel:'free'` on the chapter's own `story.profile`.

- [ ] **Step 2: Verify the full suite + typecheck one final time**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS — everything green, tsc clean.

- [ ] **Step 3: Commit**

```bash
git add docs/authoring/free-travel.md
git commit -F - <<'EOF'
docs(travel): authoring guide for free-roam

The roam-game shape, the coexist rule (+ the change_location/currentId footgun),
state-over-clock gating, the bucket-as-verification-parameter rule and
ROAM_BUCKET_MISALIGNED, the finiteness constraints, cap-is-failure
(indeterminate), the deadRegions guarantee, and the single-chapter v1 fence.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Self-Review

**1. Spec coverage** (rev 3 spec → task):
- Mechanic (hub injection, `__travel_` id, the trip, coexist, snapshot-safe) → Tasks 2, 3. ✓
- `choose()` seam before the throw; hub test off `state.location` → Task 3 (`travelTo`, `hubLocation`). ✓
- Finiteness proved (`ROAM_UNBOUNDED_HUB_WRITE`, adjust_resource + both clock modes + counted vars) → Task 5. ✓
- Bucket alignment via `readsClock`, depletion subsumed, bucket = verification param → Task 5 (`roamTimeThresholds`/`checkBucketAlignment`). ✓
- Co-reachability over the FULL edge set; `deadRegions`; reconvergent regression guard → Tasks 6, 8. ✓
- capHit ⇒ INDETERMINATE-and-fail → Task 6 (`indeterminate`). ✓
- Container fence (`ROAM_CARRY_UNVERIFIABLE`) + runtime-inheritance lint (`ROAM_CHAPTER_PROFILE_MISSING`) → Task 7. ✓
- Travel-aware static linter + `RESERVED_CHOICE_ID` → Task 4. ✓
- Structural + advisory lints (UNKNOWN_LOCATION/NO_HUB/MISSING_TIME/ASYMMETRIC_EDGE/HUB_IS_TERMINAL/GRAPH_IGNORED) → Task 5. ✓
- `DEFAULT_PROFILE` gains `travel:'off'`; profile.test.ts updated; stale comment fixed → Task 1. ✓
- Reference game (cross-location coupling + stranding fixture + reconvergent clean) → Task 8. ✓
- Authoring guide → Task 9. ✓
- Cut `ROAM_HUB_NONIDEMPOTENT` → absent by construction (never introduced). ✓

**2. Placeholder scan:** The only deferred specifics are in Task 8 (the authored prose and the exact `GameRunner.choose(...)` path), which is correct — authoring a narrative fixture is the task's creative work; its acceptance is pinned by concrete test assertions (clean lints, `deadRegions:[]`, the coupled `finalEndingId`). No `TODO`/"handle edge cases"/missing-code steps elsewhere.

**3. Type consistency:** `Profile.travel?: 'off'|'free'` (Task 1) used identically in Tasks 2–7. `travelNodeEdges(story, profile)` (Task 2) consumed in Task 4. `keyOf(n, timeKey: number)` + `timeKeyFor` (Task 6) are internal and consistent. `WalkReport.deadRegions: string[]` / `indeterminate: boolean` (Task 6) asserted in Tasks 6 & 8. `lintTravel(story, profile)` / `roamTimeThresholds(story)` / `checkBucketAlignment(story, bucket)` (Task 5) consumed in Task 8. `resolveProfile` signature reused as-is. All consistent.

---

## Execution Handoff

This plan is heavy on verification surface (two soundness-critical tasks: 6 co-reachability, 5 finiteness). Recommend a **(lighter) Team gut-check of this plan** before building — the same step that caught real pre-code bugs on the heist and profile plans — then **subagent-driven execution** (it worked well for the profile build), reviewing between tasks, with extra scrutiny on Tasks 6 and 8 (the co-reachability edge-set correctness and the reconvergent-clean regression guard).
