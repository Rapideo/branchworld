# Authoring guide: FREE_TRAVEL (`travel:'free'`)

Use this when the player navigates a map freely — moving between locations at will, doing local work at each stop, and accumulating state that gates endings. The engine injects travel choices at hubs; the author builds the local content that hangs off each hub.

---

## The roam-game shape

A roam game is built from **locations**, each with a `defaultNode` (the hub the player lands on when they arrive) and a symmetric `connectedLocations` / `travelTimes` graph. The engine injects `__travel_<dest>` choices at every hub; those choices do not need to be authored — only the local content that branches off the hub and flows back to it does.

```typescript
// From roamExample.ts — "The Three Halls"
locations: [
  {
    id: 'atrium',
    name: 'The Atrium',
    defaultNode: 'atrium_hub',           // player arrives here
    connectedLocations: ['library', 'vault'],
    travelTimes: { library: 10, vault: 10 },
  },
  {
    id: 'library',
    name: 'The Library',
    defaultNode: 'library_hub',
    connectedLocations: ['atrium', 'vault'],
    travelTimes: { atrium: 10, vault: 10 },
  },
  {
    id: 'vault',
    name: 'The Vault',
    defaultNode: 'vault_hub',
    connectedLocations: ['atrium', 'library'],
    travelTimes: { atrium: 10, library: 10 },
  },
],
```

Local content flows off the hub and back:

```typescript
// atrium local branch
{ id: 'atrium_hub',   choices: [{ id: 'explore_atrium', destination: 'atrium_study' }] },
{ id: 'atrium_study', choices: [{ id: 'leave_study',    destination: 'atrium_hub'   }] },
```

A cross-location latch (written in the library, read at the vault) is the primary coupling primitive:

```typescript
// library_gem sets the latch by entryEffect (not choice effect — avoids LATCH_IN_CHOICE_EFFECT)
{ id: 'library_gem',
  entryEffects: [{ field: 'key_found', op: 'set', value: 'true' }],
  choices: [{ id: 'leave_gem', destination: 'library_hub' }],
},

// vault ending reads it
endings: [
  { id: 'vault_opened', conditions: [{ field: 'key_found', op: 'is_true' }], priority: 1, ... },
  { id: 'vault_locked', conditions: [], isDefault: true, ... },
],
```

Rules the linter enforces:
- Every destination in `connectedLocations` must exist (`TRAVEL_UNKNOWN_LOCATION`).
- Every travel-reachable location must have a `defaultNode` (`TRAVEL_NO_HUB`).
- Every directed edge must have a `travelTimes` entry (`TRAVEL_MISSING_TIME`).
- No authored choice id may start with `__` — that prefix is reserved for engine-injected travel choices (`RESERVED_CHOICE_ID`).
- A hub node should not resolve an ending on arrival (`TRAVEL_HUB_IS_TERMINAL` warning).

---

## Coexist: `travel:'free'` alongside authored `change_location`

`travel:'free'` and authored `change_location` effects coexist. Use authored `change_location` for edges the roam graph cannot express: one-way passages, locked doors, conditional warps. If you do NOT add the back-link to `connectedLocations`, the linter warns `TRAVEL_ASYMMETRIC_EDGE` — that is the expected signal for an intentional one-way edge.

**Footgun:** `change_location` sets `state.location` but does NOT set `currentId`. The engine injects travel choices only when the player is at the hub node AND `state.location` matches that hub's location — it checks `location.defaultNode === currentId`. Dropping a player at a non-hub node via `change_location` leaves them with no travel choices until authored choices walk them back to the hub.

```typescript
// safe pattern: change_location to a hub node, then immediately enter the hub
{ id: 'secret_passage', label: 'Take the passage', destination: 'vault_hub',
  effects: [{ field: 'location', op: 'change_location', value: 'vault' }] },
// ↑ player lands at vault_hub AND state.location is 'vault' → hub check passes; travel works.
```

---

## Write to state/location gates, not exact-clock gates

In a roam game the player can reach any node via many different time paths. If an ending or choice condition tests an exact clock value, some of those paths pass through the window and some miss it — making behavior sensitive to the order the player happened to traverse locations. Gate on **what happened** (latches, counted inventory, location), not **when**:

```typescript
// Preferred — state gate (always deterministic regardless of travel path)
{ id: 'vault_opened', conditions: [{ field: 'key_found', op: 'is_true' }], ... }

// Avoid — exact-time gate (fragile; depends on travel ordering)
{ conditions: [{ field: 'time', op: 'time_after', value: '00:45' }], ... }
```

The bucket mechanism (below) is the right tool when clock gating is intentional.

---

## Timed roam and the bucket

When the chapter has a deadline or clock-gated choices, the verification walk uses a `timeBucket` to quantize accumulated time. The bucket **must evenly divide every time threshold** in the story: `time_after`/`time_before`/`time_between` values on choices and endings, event trigger times, and the `story.deadline`. If it does not, `ROAM_BUCKET_MISALIGNED` fires and suggests the GCD of all thresholds.

```typescript
// From roamExampleTimed — travel times 30 min each, deadline 01:00 (60 min).
// Thresholds: { 30, 60 }. Aligned bucket = gcd(30, 60) = 30.
const result = verifyRoam(roamTimedStory, { timeBucket: 30 }); // ok === true
const bad    = verifyRoam(roamTimedStory, { timeBucket: 31 }); // ok === false — 31 doesn't divide 30

// The time-gated choice in roamExampleTimed:
{ id: 'search_library_t', destination: 'library_gem_t',
  conditions: [{ field: 'time', op: 'time_after', value: '00:30' }], },
```

**Depletion boundaries are excluded.** Resources with `depletion` use keyed state (the raw value), so their step boundaries are never time-thresholds for bucket purposes.

---

## Finiteness: no unbounded increments and no `adjust_resource`

In a roam game the walker tracks every distinct world-state. Any effect that grows a variable without a bound creates infinitely many states — the walk will cap and declare `indeterminate`.

| What fires `ROAM_UNBOUNDED_HUB_WRITE` | Fix |
|---|---|
| `increment` of a variable with no `max` | Add `max` to the variable declaration |
| `decrement` of a variable with no `min` | Add `min` to the variable declaration |
| `adjust_resource` anywhere in the story | Not allowed in roam games; use a counted variable with bounds instead |

```typescript
// Forbidden — no max → unbounded upward growth
{ name: 'visit_count', type: 'number', default: 0 }  // missing max!

// Allowed
{ name: 'visit_count', type: 'number', default: 0, min: 0, max: 5 }
```

---

## The cap is a failure in roam (`indeterminate`)

`walkStateSpace` caps at 50,000 states by default. For a branching story that cap is a warning. **For a roam game it is `indeterminate` — a hard failure.** When `report.indeterminate === true`, the walker stopped before covering the full space; `softlocks` and `deadRegions` from that partial walk mean nothing.

If `verifyRoam` returns `ok === false` with `report.indeterminate === true`:
- Shrink the map (fewer locations, fewer local branches).
- Coarsen the bucket (a larger bucket merges more time states).
- Tighten variable bounds.

Do not dismiss a capped walk as "mostly fine" — it is not a pass.

---

## `deadRegions` and the co-reachability guarantee

`verifyRoam` checks that every reachable node can reach at least one ending — this is the **co-reachability** guarantee. `report.deadRegions` lists node ids from which no ending is reachable in any state at that node.

```typescript
// roamStranded example: vault connects to a crypt with no exit.
// verifyRoam(roamStranded).ok === false; report.deadRegions includes 'crypt_hub' and 'crypt_pit'.
locations: [
  { id: 'vault', connectedLocations: ['atrium', 'library', 'crypt'], ... },
  { id: 'crypt', connectedLocations: [], ... },  // no way out → dead region
],
```

**Granularity caveat:** `deadRegions` reports by node id. A node is flagged conservatively — it means at least one reachable state at that node cannot reach an ending. A node shared across many states may appear here even if most states at it are fine; the only safe fix is to eliminate the bad state (add a path to an ending) rather than dismiss the flag.

---

## Use `verifyRoam` as the verify gate

`verifyRoam(story, { timeBucket })` is the single correct verification call for a roam game. It couples:
1. `checkBucketAlignment` — all time thresholds must divide the bucket (`ROAM_BUCKET_MISALIGNED`).
2. `walkStateSpace` — the full BFS over the roam state space.
3. Fail-on: `indeterminate`, `softlocks`, `deadRegions`, `orphanEndings`.

```typescript
import { verifyRoam } from '../engine/stateSpaceWalk';

// Untimed roam — no bucket needed
const { ok, report } = verifyRoam(roamStory);
expect(ok).toBe(true);
expect(report.deadRegions).toEqual([]);

// Timed roam — pass the aligned bucket
const { ok: okT, bucketIssues } = verifyRoam(roamTimedStory, { timeBucket: 30 });
expect(okT).toBe(true);
expect(bucketIssues).toHaveLength(0);
```

Do NOT hand-assemble `walkStateSpace` + `checkBucketAlignment` separately — it is easy to forget one leg, pass a bucket to one and not the other, or misread `capHit` as a non-fatal warning. `verifyRoam` is the gate.

---

## `valuesAtEndings` and `walkSeeded` are NOT roam-aware

`valuesAtEndings` and `walkSeeded` are multi-chapter carry tools. `valuesAtEndings` uses its own non-roam raw-time state key (no bucketing) and will silently hit the cap on any meaningful roam map; `walkSeeded` delegates to `walkStateSpace` (which auto-detects roam from `profile.travel`), but both are multi-chapter carry helpers — and the container linter fires `ROAM_CARRY_UNVERIFIABLE` for any roam chapter in a multi-chapter game, so these tools should not be pointed at roam games in the first place.

Use `verifyRoam` / `walkStateSpace` (with `roam: true` explicit) for all roam verification.

---

## v1 fence: roam games are single-chapter

In v1, multi-chapter carry is not verified for roam games. The container linter fires `ROAM_CARRY_UNVERIFIABLE` if a `travel:'free'` chapter appears in a game with more than one chapter.

Keep roam games single-chapter. The `gameEnding: true` flag on the sole chapter is the correct shape:

```typescript
export const roamExample: Game = {
  id: 'roam_example',
  title: 'The Three Halls',
  startChapterId: 'roam_ch1',
  profile: { clock: 'untimed', travel: 'free' },
  carry: { vars: 'all', resources: [], clues: false, inventory: false },
  chapters: [
    { id: 'roam_ch1', title: 'The Three Halls', story: roamStory,
      gameEnding: true, transitions: [] },
  ],
};
```

Also declare `travel:'free'` directly in the chapter's own `story.profile`. The engine reads `story.profile` at runtime — inheriting `travel` from the game profile alone silently does not roam at runtime, and the container linter fires `ROAM_CHAPTER_PROFILE_MISSING`.

```typescript
// Required on the story, not just the game
const roamStory: Story = {
  ...
  profile: { clock: 'untimed', travel: 'free' },  // ← must be here
};
```

---

## Reference implementation

`src/container/roamExample.ts` — three exports: `roamExample` (untimed, clean), `roamExampleTimed` (timed, with a `time_after` gate and aligned bucket), and `roamStranded` (a dead-region fixture for negative testing). Read them alongside this guide.
