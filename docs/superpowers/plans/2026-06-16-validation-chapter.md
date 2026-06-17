# Validation Chapter "The Prater Line" (Sub-project C) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port Team 3's chapter "The Prater Line" to the hardened v1.1 engine as a lint-clean, fully-validated `Story`, proving the living-world thesis (clock bites, scheduled event fires present/absent with recovery, endings resolve from state, no prose-vs-flag lies), and make it playable in the web player via a content selector.

**Architecture:** One typed `Story` object (`src/content/praterLine.ts`) consumed identically by engine, linter, and player (EE-6). The chapter's prose variants are distinct nodes reached by explicit choices (no engine changes). Endings are an ordered resolver list with a mandatory default — choices never target endings. Validation is automated playthrough tests against the real engine; clock calibration is test-driven.

**Tech Stack:** TypeScript (strict), the existing `src/engine` and `src/player`, Vitest. No new dependencies.

## Global Constraints

- TypeScript `strict: true`, no `any`. The chapter is pure data — no engine logic in content.
- **Engine-derived time only (EE-1):** no node carries an authoritative time; node bodies use the `{{time}}` token or relative phrasing. The source's `time: HH:MM` headers are dropped (they were the hardcoded-timestamp bug).
- **Choices must not target endings (EE-3):** endings live in the ordered `endings` resolver; the last entry is the mandatory `isDefault` catch-all with empty conditions.
- **Presence is `state.location` (EE-2):** every inter-location travel choice sets `change_location`; the canal handoff fires on the engine clock and checks `state.location === 'loc_canal'`.
- One variable = one meaning (§EE-5). All condition/effect `value`s are strings (engine coerces).
- `lintStory(praterLine)` MUST return `{ ok: true, errors: [], warnings: [] }`.
- Prose is transcribed **verbatim** from `branchworld-review.md` §1339–1656 per the node mapping in Task 1, with hardcoded clock times replaced by `{{time}}` or removed.
- Content tests run in the `node` env (`src/content/**`); player tests in `jsdom` (`src/player/**`). Co-located tests. Conventional Commits. Every task ends green.

## Calibration target (bites-but-fair)

Window = 20:00→02:10 = **370 min**. Invariants (enforced by Task 4 tests; costs in Task 1 are the starting point):
- Longest reachable path **> 370** (linter: no `CLOCK_CANNOT_BITE`); a viable path **< 370** (no `POSSIBLY_UNWINNABLE`).
- An efficient decisive spine reaches Westbahnhof **before 02:10** with a small margin.
- Genuine dawdling / two major detours pushes **past 02:10** → *The 02:11 Platform*.
- The 23:30 handoff is reachable on real canal paths (accumulated time ≈ 23:00–23:30 on arrival).

---

## File structure

- `src/content/praterLine.ts` — the chapter `Story` (Task 1).
- `src/content/praterLine.test.ts` — lint + reachability + event + clock tests (Tasks 1–4).
- `src/content/stories.ts` — content registry listing the playable stories (Task 5).
- `src/player/Player.tsx` — the per-story player body, extracted from `App` (Task 5).
- `src/player/App.tsx` — modified to add the story selector (Task 5).
- `src/player/contentSelector.test.tsx` — selector test (Task 5).
- `docs/prater-line-prose-audit.md` — the EE-4 prose-vs-state audit (Task 6).

---

### Task 1: Author the chapter `Story` + lint-clean

**Files:**
- Create: `src/content/praterLine.ts`
- Test: `src/content/praterLine.test.ts`

**Interfaces:**
- Consumes: `Story` (types), `lintStory` (engine).
- Produces: `export const praterLine: Story` (id `prater_line`).

**Variables** (each one meaning):
`lindqvist_trust` (number, 0), `dragomir_trust` (number, 0), `volkov_suspicion` (number, 0),
`knows_dragomir_blown` (boolean, false), `handoff_witnessed` (boolean, false),
`handoff_missed` (boolean, false), `has_real_microfilm` (boolean, false),
`took_volkov_deal` (boolean, false), `companion` (string, `'none'`).
**Clues** (engine `clues[]`): `saw_real_receiver`, `knows_who_took_film`, `chalk_marks`, `suspect_canal`.

**Locations:** `loc_safehouse`, `loc_streets`, `loc_sperl`, `loc_crossroads`, `loc_riesenrad`,
`loc_canal`, `loc_canal_drop`, `loc_underpass`, `loc_westbahnhof`, `loc_eastbound`.

**Scheduled event `event_handoff`:**
- `trigger: [{ field: 'time', op: 'time_after', value: '23:30' }]`
- `eventLocation: 'loc_canal'`
- `ifPresentNode: 'node_handoff_witnessed'`
- `ifAbsentEffects: [{ field: 'handoff_missed', op: 'set', value: 'true' }, { field: 'clues', op: 'add_clue', value: 'chalk_marks' }]`
- `recoveryNodeId: 'node_canal_drop'`

**Endings (ordered; resolver returns first non-default match):**
1. `ending_missed` — *The 02:11 Platform* — `[{ field:'time', op:'time_after', value:'02:10' }]`
2. `ending_double` — *The Man Who Knew Too Much* — `[{ field:'took_volkov_deal', op:'is_true' }]`
3. `ending_clean` — *The Last Train West* — `[{ field:'time', op:'time_before', value:'02:10' }, { field:'dragomir_trust', op:'gte', value:'3' }, { field:'companion', op:'equals', value:'dragomir' }, { field:'has_real_microfilm', op:'is_true' }]`
4. `ending_burned` — *Smoke on the Embankment* — `[{ field:'dragomir_trust', op:'lt', value:'3' }, { field:'volkov_suspicion', op:'gte', value:'4' }]`
5. `ending_default` — *A Cold Vienna Dawn* — `conditions: []`, `isDefault: true` (the mandatory catch-all the original lacked).

> The double-cross resolves on the decisive `took_volkov_deal` flag; the rich narrative preconditions
> (witnessed + blown + suspicion≥3 + distrust) gate the *choice* that sets it (see `node_volkov`), so a
> player who reaches Volkov but refuses does not wrongly get this ending.

**Nodes.** For each node: `body` is the verbatim prose from the cited review lines, with any literal
clock time turned into `{{time}}` or dropped (EE-1); drop the source's `time:` header. `type` is taken
from the source header. Choices below give **label → destination | conditions | effects** (effects list
`add_minutes` as `+N`; every cross-location move includes `change_location`).

1. **`node_safehouse`** (scene, `loc_safehouse`, body: review L1350–1360) — start node.
   - "Take the satchel… Trust the old man." → `node_to_sperl` | — | `lindqvist_trust +1`, `+5`
   - "Why the canal?… Push him." → `node_safehouse_press` | — | `lindqvist_trust -1`, `+10`
   - "…quietly search the satchel." → `node_search_satchel` | `lindqvist_trust lt 2` | `+20`
2. **`node_safehouse_press`** (conversation, `loc_safehouse`, L1370–1376)
   - "'I trust you.'…" → `node_to_sperl` | — | `lindqvist_trust +1`, `+5`
   - "Say nothing…note the canal." → `node_to_sperl` | — | `add_clue suspect_canal`, `+5`
   - "…search the satchel." → `node_search_satchel` | `lindqvist_trust lt 2` | `+20`
3. **`node_search_satchel`** (discovery, `loc_safehouse`, L1386–1392)
   - "Pocket the carbon…" → `node_to_sperl` | — | `set knows_dragomir_blown true`, `set lindqvist_trust 0`, `add_clue carbon`, `+5`
   - "Confront him now…" → `node_safehouse_confront` | — | `set knows_dragomir_blown true`, `set lindqvist_trust 0`, `+10`
4. **`node_safehouse_confront`** (conversation, `loc_safehouse`, L1401–1409)
   - "Leave without a word…" → `node_to_sperl` | — | `+5`
   - "'Then I'll do my own arithmetic.'" → `node_to_sperl` | — | `lindqvist_trust +1`, `+5`
5. **`node_to_sperl`** (transition, `loc_streets`, L1418–1420). Entry: `change_location loc_streets`.
   - "Take the tram." → `node_sperl` | — | `change_location loc_sperl`, `+25`
   - "Walk the back lanes." → `node_sperl` | — | `change_location loc_sperl`, `dragomir_trust +1`, `+40`
6. **`node_sperl`** (conversation, `loc_sperl`, L1429–1435)
   - "Tell her the plain truth…" → `node_sperl_trust` | — | `dragomir_trust +2`, `+30`
   - "Reassure her with the cover story…" → `node_sperl_cover` | — | `dragomir_trust -1`, `+30`
   - "Tell her she was blown…" → `node_sperl_trust` | `knows_dragomir_blown is_true` | `dragomir_trust +3`, `+35`
   - "'Give me the microfilm now…'" → `node_sperl_press_film` | — | `dragomir_trust -2`, `+20`
7. **`node_sperl_trust`** (conversation, `loc_sperl`, L1446–1452)
   - "'Then let me earn the second one.'" → `node_get_real_film` | `dragomir_trust gte 3` | `+5`
   - "Don't push the film. 'Walk with me.'" → `node_crossroads` | — | `set companion dragomir`, `change_location loc_crossroads`, `+15`
   - "Tell her a handoff at the canal…" → `node_crossroads` | `knows_dragomir_blown is_true` | `set companion dragomir`, `dragomir_trust +1`, `change_location loc_crossroads`, `+10`
8. **`node_sperl_cover`** (conversation, `loc_sperl`, L1462–1466)
   - "Drop the script…the real truth." → `node_sperl_trust` | — | `dragomir_trust +2`, `+20`
   - "Just get her moving." → `node_crossroads` | — | `set companion dragomir`, `change_location loc_crossroads`, `+15`
9. **`node_sperl_press_film`** (event, `loc_sperl`, L1475–1481)
   - "Pocket the decoy and try to recover." → `node_sperl_cover` | — | `+10`
   - "Take the decoy, take her arm, leave." → `node_crossroads` | — | `set companion dragomir`, `change_location loc_crossroads`, `+10`
10. **`node_get_real_film`** (discovery, `loc_sperl`, L1490–1496)
    - "Take her out into the rain…" → `node_crossroads` | — | `set has_real_microfilm true`, `set companion dragomir`, `dragomir_trust +1`, `change_location loc_crossroads`, `+10`
11. **`node_crossroads`** (scene, `loc_crossroads`, L1504–1508)
    - "Go straight to Westbahnhof." → `node_westbahnhof` | — | `change_location loc_westbahnhof`, `+50`
    - "Ride the Riesenrad first." → `node_riesenrad` | — | `change_location loc_riesenrad`, `+40`
    - "Go down to the canal." → `node_canal_approach` | — | `change_location loc_canal`, `+40`
12. **`node_riesenrad`** (discovery, `loc_riesenrad`, L1518–1522). Entry: `set knows_dragomir_blown true`, `volkov_suspicion +1`.
    - "Come down…head for the canal." → `node_canal_approach` | — | `change_location loc_canal`, `+40`
    - "Go meet Volkov in the underpass." → `node_volkov` | `knows_dragomir_blown is_true` | `change_location loc_underpass`, `+40`
    - "Take Dragomir straight to the train." → `node_westbahnhof` | — | `change_location loc_westbahnhof`, `+55`
13. **`node_canal_approach`** (scene, `loc_canal`, L1532–1537)
    - "Wait in the dark for 23:30…" → `node_westbahnhof` *(fallback; overridden by the present-event route)* | `time_before 23:30` | `+25`
    - "You're too late… read the chalk." → `node_canal_drop` | `time_after 23:30` | `+5`
    - "Pull back and run to the train." → `node_westbahnhof` | — | `change_location loc_westbahnhof`, `+55`
14. **`node_handoff_witnessed`** (event, `loc_canal`, L1546–1552) — the event's `ifPresentNode`.
    Entry: `add_clue saw_real_receiver`, `set handoff_witnessed true`, `set knows_dragomir_blown true`, `volkov_suspicion +2`.
    - "Go and find Volkov." → `node_volkov` | — | `change_location loc_underpass`, `+40`
    - "Say nothing…take Dragomir to the train." → `node_westbahnhof` | — | `change_location loc_westbahnhof`, `+55`
15. **`node_canal_drop`** (discovery, `loc_canal_drop`, L1561–1565) — the `recoveryNodeId`.
    Entry: `add_clue knows_who_took_film`, `set knows_dragomir_blown true`, `volkov_suspicion +1`.
    - "Take this to Volkov." → `node_volkov` | — | `change_location loc_underpass`, `+40`
    - "Pocket the chalk truth and run." → `node_westbahnhof` | — | `change_location loc_westbahnhof`, `+55`
16. **`node_volkov`** (conversation, `loc_underpass`, L1576–1583). Entry: `volkov_suspicion +1`.
    - "'Then tell me how she was blown…'" → `node_volkov_truth` | `knows_dragomir_blown is_true` | `volkov_suspicion +1`, `+15`
    - "Take his deal…burn your own service." → `node_eastbound` | `handoff_witnessed is_true`, `knows_dragomir_blown is_true`, `volkov_suspicion gte 3`, `lindqvist_trust lt 2` | `set took_volkov_deal true`, `change_location loc_eastbound`, `+15`
    - "Refuse him. Run for your own train." → `node_westbahnhof` | — | `change_location loc_westbahnhof`, `+25`
17. **`node_volkov_truth`** (conversation, `loc_underpass`, L1576–1583 tail — reuse the "he respects that you came armed" beat). Single exit so it is not a dead-end:
    - "Now take what you know and decide." → `node_westbahnhof_or_deal` is NOT used; instead two choices mirroring `node_volkov`'s deal/refuse:
      - "Take his deal." → `node_eastbound` | `handoff_witnessed is_true`, `knows_dragomir_blown is_true`, `volkov_suspicion gte 3`, `lindqvist_trust lt 2` | `set took_volkov_deal true`, `change_location loc_eastbound`, `+5`
      - "Refuse and run for your train." → `node_westbahnhof` | — | `change_location loc_westbahnhof`, `+25`
18. **`node_westbahnhof`** (transition, `loc_westbahnhof`, L1592–1596) — `resolvesEnding: true`, `choices: []`.
    *(The source's choices-to-endings are removed; the resolver selects the ending from state — EE-3.)*
19. **`node_eastbound`** (transition, `loc_eastbound`, body: a one-line bridge — "Volkov's hand closes the deal; a slower train waits." or reuse L1621) — `resolvesEnding: true`, `choices: []`.

**Endings carry the source ending prose** as `body` (and a one-line `summary`):
`ending_clean` ← L1608–1616; `ending_double` ← L1621–1629; `ending_burned` ← L1634–1642;
`ending_missed` ← L1647–1655; `ending_default` ← a new 2–3 sentence "cold Vienna dawn, the night
resolved into none of its sharp shapes" catch-all written in the same register.

**Starting `add_minutes` costs** are the `+N` values above (already ~2.5–3× the source). They are the
**starting point**; Task 4's tests finalize them against the bites-but-fair invariants.

- [ ] **Step 1: Write the failing lint test `src/content/praterLine.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { lintStory } from '../engine';
import { praterLine } from './praterLine';

describe('praterLine — integrity', () => {
  it('lints clean with no errors or warnings', () => {
    const r = lintStory(praterLine);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run praterLine`
Expected: FAIL — cannot find module `./praterLine`.

- [ ] **Step 3: Write `src/content/praterLine.ts`**

Author the `Story` exactly per the variables / locations / event / endings / nodes specified above:
every node with its `id`, `type`, `location`, `body` (verbatim from the cited review lines with clock
times → `{{time}}`/removed), and `choices` with the listed `destination`, `conditions`, and `effects`
(string `value`s; `add_minutes` for the `+N`; `change_location` on every cross-location move).
`node_westbahnhof` and `node_eastbound` have `resolvesEnding: true` and `choices: []`. Endings are the
ordered list above with the mandatory `isDefault` catch-all last.

- [ ] **Step 4: Run the lint test; fix until it passes**

Run: `npx vitest run praterLine`
Expected: PASS. If `BROKEN_LINK`/`NO_EXIT`/`UNDEFINED_VAR`/`CHOICE_TARGETS_ENDING`/`EVENT_*`/
`NO_DEFAULT_ENDING` fire, correct the named node/effect/ending. If `CLOCK_CANNOT_BITE` fires, the
longest path is ≤ 370 — raise the larger `add_minutes` costs (conversations/detours) until it clears.
If `POSSIBLY_UNWINNABLE` fires, the shortest path already exceeds 370 — lower the cheapest spine costs.

- [ ] **Step 5: Commit**

```bash
git add src/content/praterLine.ts src/content/praterLine.test.ts
git commit -m "feat: port The Prater Line to the hardened engine (lint-clean)"
```

---

### Task 2: Ending-reachability tests (all five resolve from state)

**Files:**
- Modify: `src/content/praterLine.test.ts`

**Interfaces:**
- Consumes: `GameEngine` (engine), `praterLine`.

- [ ] **Step 1: Add the failing reachability tests**

```ts
import { GameEngine } from '../engine';

function play(ids: string[]) {
  const g = new GameEngine(praterLine);
  for (const id of ids) g.choose(id);
  return g.view();
}

describe('praterLine — every ending resolves from accumulated state', () => {
  it('reaches The Last Train West (clean)', () => {
    // truth -> trust builds -> real film -> straight to the station, in time
    const v = play(['take_satchel', 'tram', 'truth', 'tell_blown_or_trust_path']); // sequence finalized in Step 3
    expect(v.endingReached?.id).toBe('ending_clean');
    expect(v.state.vars.has_real_microfilm).toBe(true);
    expect(v.state.vars.companion).toBe('dragomir');
  });
  it('reaches The Man Who Knew Too Much (double-cross)', () => {
    const v = play([/* search -> sperl -> canal -> witness -> volkov -> take_deal */]);
    expect(v.endingReached?.id).toBe('ending_double');
    expect(v.state.vars.took_volkov_deal).toBe(true);
  });
  it('reaches Smoke on the Embankment (burned)', () => {
    const v = play([/* press_film (low trust) -> riesenrad -> canal -> witness -> volkov -> refuse */]);
    expect(v.endingReached?.id).toBe('ending_burned');
    expect(Number(v.state.vars.dragomir_trust)).toBeLessThan(3);
    expect(Number(v.state.vars.volkov_suspicion)).toBeGreaterThanOrEqual(4);
  });
  it('reaches A Cold Vienna Dawn (default catch-all)', () => {
    const v = play([/* an in-time path matching none of the specific endings */]);
    expect(v.endingReached?.id).toBe('ending_default');
  });
  // ending_missed is covered by the clock tests in Task 4.
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run praterLine`
Expected: FAIL (placeholder choice ids / endings not yet reached).

- [ ] **Step 3: Replace each `play([...])` with the real choice-id sequence; fix conditions/effects until green**

Walk each path by hand using the Task 1 node spec and fill the exact `choose` ids. If an ending is not
reached, the bug is in a condition or effect — correct it in `praterLine.ts` (e.g., a suspicion
increment too small for `gte 4`, or `companion`/`has_real_microfilm` not set on the path). Re-run until
all four endings resolve and the asserted state holds. Confirm `npx vitest run praterLine` is green and
`lintStory` is still clean.

- [ ] **Step 4: Commit**

```bash
git add src/content/praterLine.ts src/content/praterLine.test.ts
git commit -m "test: prove all five Prater Line endings resolve from state"
```

---

### Task 3: Scheduled event — present, absent, and recovery

**Files:**
- Modify: `src/content/praterLine.test.ts`

- [ ] **Step 1: Add the failing event tests**

```ts
describe('praterLine — the 23:30 canal handoff fires both ways', () => {
  it('present: witnessing the handoff sets the doubling clues', () => {
    const v = play([/* reach loc_canal before 23:30, then wait */]);
    expect(v.node.id).toBe('node_handoff_witnessed');
    expect(v.state.clues).toContain('saw_real_receiver');
    expect(v.state.vars.handoff_witnessed).toBe(true);
    expect(v.state.completedEvents).toContain('event_handoff');
  });
  it('absent: the drop happens without you and plants a recoverable clue', () => {
    const g = new GameEngine(praterLine);
    // dawdle off-canal until time passes 23:30 (event fires absent), then go to the canal late
    [/* dawdle ids */, /* go to canal after 23:30 */].forEach((id) => g.choose(id));
    expect(g.view().state.vars.handoff_missed).toBe(true);
    expect(g.view().state.clues).toContain('chalk_marks');
    // visiting the recovery node yields the late knowledge
    const v = g.choose('too_late'); // -> node_canal_drop
    expect(v.node.id).toBe('node_canal_drop');
    expect(v.state.clues).toContain('knows_who_took_film');
  });
});
```

- [ ] **Step 2: Run to verify failure, then fill the real choice ids**

Run: `npx vitest run praterLine` → FAIL. Replace the comment placeholders with the real `choose` id
sequences (present: a path arriving at `loc_canal` before 23:30 then `wait`; absent: a path whose time
advances past 23:30 while `state.location !== 'loc_canal'`, then a travel choice to the canal and
`too_late`). If the present path doesn't route to `node_handoff_witnessed`, the arrival/wait timing or
`change_location` is off; if the absent clue isn't planted, check `ifAbsentEffects`. Fix in
`praterLine.ts` and re-run until green.

- [ ] **Step 3: Commit**

```bash
git add src/content/praterLine.ts src/content/praterLine.test.ts
git commit -m "test: Prater Line handoff fires present, absent, and recovers"
```

---

### Task 4: Clock bites-but-fair (final calibration)

**Files:**
- Modify: `src/content/praterLine.test.ts`

- [ ] **Step 1: Add the failing clock tests**

```ts
import { parseTime } from '../engine';

describe('praterLine — the clock bites, but fairly', () => {
  it('an efficient decisive run makes the 02:10', () => {
    const v = play([/* the leanest spine to Westbahnhof */]);
    expect(v.endingReached?.id).not.toBe('ending_missed');
    expect(v.state.time).toBeLessThan(parseTime('02:10') + 1440); // before the 02:10 deadline
  });
  it('a dawdling / double-detour run misses the train', () => {
    const v = play([/* walk everywhere + ride the wheel + the canal + the underpass */]);
    expect(v.endingReached?.id).toBe('ending_missed');
  });
});
```

> Note: `02:10` is `130` minutes; `20:00` start is `1200`. The engine clock is absolute minutes from
> `startTime`, so compare `v.state.time` against `parseTime('02:10') + 1440` (past-midnight) — or simply
> assert the ending id, which is the authoritative signal.

- [ ] **Step 2: Run; finalize costs until both hold AND lint stays clean**

Run: `npx vitest run praterLine`. Fill the two sequences (leanest spine; maximal-detour). Then tune the
`add_minutes` costs in `praterLine.ts` so: the efficient spine lands before 02:10 with a small margin;
the maximal-detour/dawdle path lands after 02:10 (`ending_missed`); `lintStory` stays clean (longest
path > 370, a viable path < 370). Re-run the **whole** `praterLine` suite after each change — Tasks 2–3
must remain green. Do not weaken a test to pass; adjust the costs.

- [ ] **Step 3: Run the full project suite + typecheck**

Run: `npm test` → all green. Run: `npm run typecheck` → no errors.

- [ ] **Step 4: Commit**

```bash
git add src/content/praterLine.ts src/content/praterLine.test.ts
git commit -m "test: calibrate The Prater Line clock to bite-but-fair"
```

---

### Task 5: Player content selector

**Files:**
- Create: `src/content/stories.ts`
- Create: `src/player/Player.tsx`
- Modify: `src/player/App.tsx`
- Test: `src/player/contentSelector.test.tsx`

**Interfaces:**
- Consumes: `Story` (engine), `sampleStory`, `praterLine`, `useGame`, the player components, `SaveSlots`, `DebugPanel`.
- Produces: `export const stories: { id: string; title: string; story: Story }[]`; `Player({ story })`.

- [ ] **Step 1: Write `src/content/stories.ts`**

```ts
import type { Story } from '../engine';
import { sampleStory } from './sampleStory';
import { praterLine } from './praterLine';

export const stories: { id: string; title: string; story: Story }[] = [
  { id: sampleStory.id, title: sampleStory.title, story: sampleStory },
  { id: praterLine.id, title: praterLine.title, story: praterLine },
];
```

- [ ] **Step 2: Write the failing selector test `src/player/contentSelector.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('content selector', () => {
  it('switches the loaded story and resets to its start', async () => {
    render(<App />);
    // default story (the demo) start heading is present
    expect(screen.getByRole('heading', { name: 'A Booth by the Window' })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Story'), 'prater_line');
    expect(screen.getByRole('heading', { name: 'The Margareten Safehouse' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run contentSelector`
Expected: FAIL — no `Story` selector yet.

- [ ] **Step 4: Extract `src/player/Player.tsx` from `App` (parameterized by `story`)**

```tsx
import { useState } from 'react';
import type { Story } from '../engine';
import { useGame } from './useGame';
import { StatusBar } from './StatusBar';
import { SceneView } from './SceneView';
import { ChoiceList } from './ChoiceList';
import { EndingView } from './EndingView';
import { SaveSlots } from './saves/SaveSlots';
import { DebugPanel } from './debug/DebugPanel';

export function Player({ story }: { story: Story }) {
  const game = useGame(story);
  const [showDebug, setShowDebug] = useState(false);
  const [showSaves, setShowSaves] = useState(false);
  const { view } = game;
  const locationName = (id: string) => story.locations.find((l) => l.id === id)?.name ?? id;

  return (
    <>
      <StatusBar timeLabel={view.timeLabel} location={locationName(view.location)} />
      <main className="pb-4">
        <SceneView node={view.node} timeLabel={view.timeLabel} />
        {view.endingReached
          ? <EndingView ending={view.endingReached} onReset={game.reset} />
          : <ChoiceList choices={view.choices} onChoose={game.choose} />}
      </main>
      <footer className="sticky bottom-0 flex gap-3 border-t border-stone-200 bg-stone-50/90 px-4 py-2 text-sm backdrop-blur">
        <button onClick={() => setShowDebug((s) => !s)}>⚙ debug</button>
        <button onClick={() => setShowSaves((s) => !s)}>💾 saves</button>
      </footer>
      {showSaves && (
        <SaveSlots
          storyId={story.id}
          makeSnapshot={game.snapshot}
          onRestore={game.restore}
          summary={`${view.timeLabel} · ${locationName(view.location)}`}
        />
      )}
      {showDebug && <DebugPanel view={view} story={story} onReset={game.reset} onGoto={game.gotoNode} />}
    </>
  );
}
```

- [ ] **Step 5: Rewrite `src/player/App.tsx` to host the selector**

```tsx
import { useState } from 'react';
import { stories } from '../content/stories';
import { Player } from './Player';

export function App() {
  const [storyId, setStoryId] = useState(stories[0].id);
  const story = stories.find((s) => s.id === storyId)!.story;
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-2 text-sm">
        <label htmlFor="story" className="text-stone-500">Story</label>
        <select
          id="story"
          aria-label="Story"
          value={storyId}
          onChange={(e) => setStoryId(e.target.value)}
          className="rounded border border-stone-300 px-2 py-1"
        >
          {stories.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>
      {/* key remounts Player (fresh engine) when the story changes */}
      <Player key={storyId} story={story} />
    </div>
  );
}
```

- [ ] **Step 6: Update `src/player/App.test.tsx` start-node assertions if needed, then run**

The existing `App.test.tsx` asserts the demo start ("A Booth by the Window") and the locked-choice
behavior — both still hold because the demo is `stories[0]`. Run: `npx vitest run "player/App" contentSelector`
Expected: PASS. (If the demo is no longer first in `stories`, make it first.)

- [ ] **Step 7: Full suite + typecheck + build**

Run: `npm test` → green. `npm run typecheck` → clean. `npm run build` → succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/content/stories.ts src/player/Player.tsx src/player/App.tsx src/player/contentSelector.test.tsx
git commit -m "feat: content selector so the player loads the demo or The Prater Line"
```

---

### Task 6: Prose-vs-state audit (EE-4)

**Files:**
- Create: `docs/prater-line-prose-audit.md`

**Interfaces:**
- Consumes: the green playthrough tests from Tasks 2–4 (which prove the state at each ending/variant is real).

- [ ] **Step 1: Write `docs/prater-line-prose-audit.md`**

A table with one row per **ending** and per **state-gated variant node** (`node_sperl_trust`,
`node_get_real_film`, `node_handoff_witnessed`, `node_canal_drop`, `node_volkov` deal, etc.). Columns:
*Node/Ending* · *Claim the prose makes* · *Flag(s) that must be set* · *Set by (choice/entry effect)* ·
*Proven by (test name)*. Every prose claim must map to a flag actually set on the reaching path. Example
rows:

```markdown
| Node / Ending | Prose claim | Required flag(s) | Set by | Proven by |
|---|---|---|---|---|
| ending_clean | "the real film… rides west" | has_real_microfilm, companion=dragomir, time<02:10 | node_get_real_film effects | "reaches The Last Train West" |
| ending_double | "the film will be read in Moscow" | took_volkov_deal | node_volkov deal choice | "reaches The Man Who Knew Too Much" |
| ending_burned | "She never handed you the real film" | has_real_microfilm=false, dragomir_trust<3 | (never set on this path) | "reaches Smoke on the Embankment" |
| node_handoff_witnessed | "It is Lindqvist's own runner" | handoff_witnessed, saw_real_receiver | event ifPresent entry | "present: witnessing…" |
```

State each ending's required flags are exactly what its resolver condition checks, and that no ending or
variant narrates a flag absent from its reaching path. Note any claim that is atmosphere-only (no flag).

- [ ] **Step 2: Verify the audit against the tests**

Re-read each row against the green Task 2–4 tests; if any prose claim has no corresponding set flag,
either the prose must change (drop the claim) or an effect is missing — fix and re-run the suite.

- [ ] **Step 3: Commit**

```bash
git add docs/prater-line-prose-audit.md
git commit -m "docs: Prater Line prose-vs-state audit (EE-4)"
```

---

## Self-Review (completed during planning)

**Spec coverage:**
- Chapter choice (Prater Line) → all tasks. ✓
- Full faithful port (all nodes/variants, Volkov underpass, trust math, 4 endings) → Task 1 (22 nodes incl. `node_volkov_truth`). ✓
- Clock bites-but-fair → Task 4 + the calibration target section. ✓
- EE-4 via checklist + playthrough state tests → Tasks 2–4 (state asserts) + Task 6 (audit). ✓
- One typed Story (Approach A) → Task 1. ✓
- Microfilm as `has_real_microfilm` flag (no `has_item` op) → Task 1 vars + ending_clean. ✓
- Mandatory default ending → Task 1 `ending_default`. ✓
- Engine-derived time / `{{time}}`, drop hardcoded times → Task 1 body rule. ✓
- Scheduled event present/absent + reachable recovery → Task 1 event + Task 3. ✓
- The six documented bugs → clock (Task 4), timestamps (Task 1 EE-1), recovery reachable (Task 1 `node_canal_drop` navigable + Task 3), fallthrough (Task 1 resolver+default + Task 2), suspicion-gate reachability (Task 1 suspicion sources + Task 2 burned/double tests), `has_item` mismatch (Task 1 flag). ✓
- Player integration / content selector → Task 5. ✓
- Prose source cited → Task 1 (review L-numbers). ✓

**Placeholder scan:** the only deferred specifics are the exact `choose`-id sequences inside the test
bodies (Tasks 2–4) and the final calibrated costs — both are **resolved by the named test as the
oracle** during execution (test-driven), not vague "adjust as needed": each test states the exact
assertion that defines done. Prose is sourced verbatim from cited lines. No TODO/TBD. ✓

**Type consistency:** `praterLine` (`Story`), `EngineSnapshot`-free here; `stories[]` shape and
`Player({ story })` prop match Task 5 usage; variable names (`has_real_microfilm`, `took_volkov_deal`,
`companion`, `volkov_suspicion`, …) are identical across nodes, endings, and tests; ending ids
(`ending_clean/double/burned/missed/default`) consistent in Task 1 and Tasks 2–4. ✓

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-16-validation-chapter.md`.
