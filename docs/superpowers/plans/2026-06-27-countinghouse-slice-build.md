# The Countinghouse — Heist Slice (C2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended for this content build — single consistent authorial voice) or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Author the approved "The Countinghouse" heist arc as a **two-chapter vertical slice** — one path through The Way In → The Floor → The Box → The Way Out — as real typed `Story` chapters wired into a `Game`, lint-clean and walker-verified, that is the **first content to exercise the four new engine capabilities** (counted inventory, `adjust_resource`, node-named `endsWith` endings, the `outOfTimeEndingId` ending).

**Architecture:** Each chapter is a typed engine `Story` under a new `src/experiments/countinghouse/` directory. A `Game` (`countinghouse.ts`) wires the two chapters with a single catch-all transition and the carry contract, reusing the container layer (`Game`/`GameRunner`/`lintGame`/`lintGameContracts`/`seededWalk`/`valuesAtEndings`) that currently lives in `src/experiments/sump-line/`. Validation reuses the engine's `lintStory`/`walkStateSpace` per chapter and the container's `lintGame` + `GameRunner` + seeded walk across chapters. **Zero engine change** — this is content on the frozen v1.4 engine; the cave's "Sump Line" is the proven template.

**Tech Stack:** TypeScript 5, Vitest 2, the FROZEN engine v1.4 + the merged container + counted inventory. No new deps.

## Global Constraints

- **Engine FROZEN** — no changes under `src/engine/`. This plan only ADDS content under `src/experiments/countinghouse/`. If authoring seems to need an engine/container change, STOP and log it as a finding (see Task 4), do not edit the engine.
- **Design source-of-truth:** `docs/superpowers/specs/2026-06-27-heist-arc-design.md` (the arc: world, four-phase spine, The Lead, the carried contract, the ending set, the feature-showcase mapping). This plan carries the full structural wiring; **prose is authored during execution** to the voice below (the cave precedent: structure in the plan, prose to the voice).
- **Voice (locked):** 1970s, cold, literary, procedural, restrained. Two kinds of heat (cops + the outfit). Crew = **you + one partner, the boxman** (name him in authoring — e.g. "Sol"). Sparse dialogue. No melodrama. The mob is procedure, not menace.
- **Time/EE-1:** node prose carries NO clock numerals — use the literal `{{time}}` token or relative phrasing. After-midnight times use absolute minutes past midnight (e.g. `'24:50'` = 00:50), per the engine's `TIME_LITERAL_OUT_OF_RANGE` rule.
- **The four feature-showcases are REQUIRED and each is assigned to a task:** counted inventory (charges + the counted take `loot`) → T1; `adjust_resource` (**The Lead** — a survival meter a choice *raises*) → T1; node-named `endsWith` finales → T2; the `outOfTimeEndingId` ending (**Dawn**) → T2; the atZero death (**The Outfit's Math**) → T2; the cross-chapter contracts (domains/mutex/carriedRequired) → T3.
- **Engine wiring rules to honor (lint-clean by construction — verified, see linter.ts):**
  - The Lead is a **time-driven resource** (`depletion` present). It may be changed ONLY via `adjust_resource` (a direct `set`/`increment`/`decrement` on it errors `RESOURCE_TIME_DRIVEN_WRITTEN`). A Lead-buy = `{op:'adjust_resource', value:'+N'}`; a Lead-cost = `{op:'adjust_resource', value:'-N'}` (`adjust_resource` on a non-time-driven field errors `ADJUST_RESOURCE_NOT_TIME_DRIVEN`).
  - Items are `{type:'number', kind:'item', min, max}` vars; gate with `has_item` (≥1) or numeric ops (`gte` for ≥N); spend with `decrement` (clamped). `has_item` on a non-item field errors `HAS_ITEM_NOT_ITEM`.
  - `endsWith` terminal nodes have **no choices** (exempt from `NO_EXIT`; live choices warn `ENDSWITH_WITH_LIVE_CHOICES`) and need no `resolvesEnding`. `endsWith` must name a real ending (`NODE_ENDING_MISSING`). **A resource death beats an `endsWith` pin** (resolver tier-1 is skipped when atZero fired), so a getaway finale never masks The Outfit.
  - The atZero death ending must **strictly out-rank** every non-default ending it can co-occur with (`ATZERO_PRIORITY_DOMINANCE`): give `end_outfit` priority 2, all other non-default endings priority 0.
  - The `outOfTimeEndingId` ending (**Dawn**) must have **empty conditions** (`OUT_OF_TIME_HAS_CONDITIONS`); it fires only via the deadline path (it is excluded from the state-match pool). Exactly one `isDefault` ending with empty conditions (`DEFAULT_HAS_CONDITIONS`).
  - **Honesty latch `got_clear`** (the cave's `cave_climbed_out` pattern, F1): set true ONLY at the getaway-car node; every getaway finale requires `got_clear is_true`, so a deadline-cross *before* the car cannot masquerade as a getaway — it correctly falls through to **Dawn**.
  - No variable may use the reserved `__` prefix (`RESERVED_VAR_PREFIX`).
  - **Clock calibration:** each chapter's window = `deadline − startTime` must satisfy `minPath ≤ window < maxPath` so the clock can bite (`CLOCK_CANNOT_BITE` / `DEADLINE_UNWINNABLE`) AND the dawdle path crosses it (so Dawn is reachable). Verify with `lintStory` + the walker; adjust costs/deadline and re-run — never silence the test.
- **Container reuse (logged decision):** the container layer is imported from `../sump-line` (it is reusable but physically lives in the sump-line dir). Promoting it to a shared `src/container/` is a deliberate **deferral** (logged in Task 4 as a finding), not part of this slice — keep scope to content.
- Tests co-located. Every task ends `npx vitest run` green (un-piped — never gate a commit on a grep-filtered exit) + `npx tsc --noEmit` clean + a Conventional-Commits commit. **The existing 283 tests stay green. Nothing is pushed** (local commits only).

---

### Task 1: Chapter 1 — "The Way In" (`ch1_wayin`)

**Files:**
- Create: `src/experiments/countinghouse/content/ch1WayIn.ts` (exports `ch1WayIn: Story`)
- Test: `src/experiments/countinghouse/content/ch1WayIn.test.ts`

**Interfaces:**
- Consumes: `Story` from `../../../engine`; `lintStory`, `walkStateSpace`, `GameEngine` from `../../../engine`.
- Produces: `ch1WayIn: Story` (id `ch1_wayin`, ~11 nodes, non-game-ending; one default ending that transitions to ch2).

**Authoring brief.** Phases 1–3 of the spine (Way In hub → the route-exclusive Floor → the Box + the gone-sideways turn), authored to the voice. Declarations (exact):

- **Variables:**
  - `{ name:'entry_route', type:'string', default:'quiet', purpose:"The Floor fork: 'quiet' | 'loud'. Carried; gates content." }`
  - `{ name:'partner_status', type:'string', default:'steady', purpose:"The boxman: 'steady'|'frayed'|'hurt'|'gone'. Carried; domain-checked; gates endings." }`
  - `{ name:'made_clean', type:'boolean', default:false, purpose:'Latching: entered/worked the floor without tripping the alarm. Mutex with alarm_tripped.' }`
  - `{ name:'alarm_tripped', type:'boolean', default:false, purpose:'Latching: the alarm went. Mutex with made_clean.' }`
  - `{ name:'lead_blown', type:'boolean', default:false, purpose:'Latching, paired with The Lead at zero. The Outfit ending requires it.' }`
- **Items (counted inventory):**
  - `{ name:'charges', type:'number', kind:'item', default:1, min:0, max:2, label:'Charges', purpose:'breaching charges for the box' }`
  - `{ name:'loot', type:'number', kind:'item', default:0, min:0, max:4, label:'The Take', purpose:'bundles of cash from the box; how much you grab trades against time' }`
- **Resource — The Lead (time-driven, buyable):**
  - `{ id:'lead', label:'Lead', min:0, max:60, start:40, depletion:{ everyMinutes:10, amount:5 }, atZero:{ setFlag:'lead_blown' } }` — **flag only, no ending** in ch1 (a non-game-ending chapter; mirrors the cave's ch1 lamp). Burning the Lead here marks you; the death itself resolves in ch2.
- **Node skeleton** (ids + intent; author full prose; every node sets its `location` via a `change_location` entryEffect; time costs in minutes shown as `+N`):
  - `n_street` (hub, start): casing the countinghouse from the street. Choices: `c_case` → `n_case` (+10; a Lead-buy — scouting the patrol buys margin: `{field:'lead',op:'adjust_resource',value:'12'}`), `c_approach` → `n_approach` (+5).
  - `n_case` (discovery): what the scouting shows. Choice: `c_case_on` → `n_approach` (+5).
  - `n_approach` (the entry fork — phase 2 begins): Choices: `c_quiet` → `n_floor_quiet` (+10, sets `entry_route='quiet'`), `c_loud` → `n_floor_loud` (+5, sets `entry_route='loud'`).
  - `n_floor_quiet`: the service-door inside job. entryEffects set `made_clean=true`; a Lead-buy (`{field:'lead',op:'adjust_resource',value:'10'}` — killing the relay). Choice: `c_quiet_on` → `n_box` (+10).
  - `n_floor_loud`: the fast loud way. entryEffects set `alarm_tripped=true`; a Lead-cost (`{field:'lead',op:'adjust_resource',value:'-12'}`). Choice: `c_loud_on` → `n_box` (+5).
  - `n_box` (phase 3 — the safe): Choices: `c_blow` → `n_grab` (+5; gated `{field:'charges',op:'has_item'}`; spends a charge `{field:'charges',op:'decrement',value:'1'}`), `c_work` → `n_grab` (+20; the boxman works it slow — no charge, the time burns Lead via depletion).
  - `n_grab` (the take — counted loot, greed vs time): Choices: `c_grab` → `n_grab` (+5, `{field:'loot',op:'increment',value:'1'}`; **repeatable** — set `repeatable:true`; the loop-back lets the player keep grabbing at a time/Lead cost), `c_enough` → `n_turn` (+5).
  - `n_turn` (the gone-sideways turn — forced): the outfit's count-crew comes back early. entryEffects: a clue `{field:'clues',op:'add_clue',value:'clue_crew_early'}` and `partner_status='frayed'` (the boxman rattled). Choice: `c_run` → `n_commit` (+5).
  - `n_commit` (resolvesEnding): commit to the escape. `resolvesEnding:true`, no choices. Resolves `end_ch1_out`.
- **Endings:** exactly one — `{ id:'end_ch1_out', name:'Out of the Count-Room', summary:'You have the take; now get clear.', isDefault:true, conditions:[] }`. (The transition to ch2 is wired in Task 3.)
- **Clock:** `startTime:'23:00'`, `deadline:'23:55'` (window 55). Verify `minPath ≤ 55 < maxPath`; the `n_grab` loop makes `maxPath` large, so the clock can bite. If `CLOCK_CANNOT_BITE`/`DEADLINE_UNWINNABLE` fires, adjust costs/deadline and re-run.

- [ ] **Step 1: Write the failing test `ch1WayIn.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { lintStory, walkStateSpace, GameEngine } from '../../../engine';
import { ch1WayIn } from './ch1WayIn';

describe('ch1_wayin — The Way In', () => {
  it('lints clean (no errors)', () => {
    expect(lintStory(ch1WayIn).errors).toEqual([]);
  });
  it('is walkable with no softlocks and the clock can bite', () => {
    const r = walkStateSpace(ch1WayIn);
    expect(r.capHit).toBe(false);
    expect(r.softlocks).toEqual([]);
  });
  it('the box can be blown only with a charge, and blowing spends it (counted inventory)', () => {
    const g = new GameEngine(ch1WayIn);
    g.start();
    ['c_case', 'c_case_on', 'c_quiet', 'c_quiet_on'].forEach((c) => g.choose(c)); // arrive at n_box with 1 charge
    expect(g.view().node.id).toBe('n_box');
    expect(g.view().choices.find((c) => c.id === 'c_blow')?.available).toBe(true);
    const v = g.choose('c_blow');
    expect(Number(v.state.vars.charges)).toBe(0); // spent, clamped at min 0
  });
  it('a Lead-buy raises The Lead above pure time-depletion (adjust_resource)', () => {
    const noBuy = new GameEngine(ch1WayIn);
    noBuy.start();
    ['c_approach', 'c_quiet', 'c_quiet_on'].forEach((c) => noBuy.choose(c)); // skip the casing Lead-buy
    const withBuy = new GameEngine(ch1WayIn);
    withBuy.start();
    ['c_case', 'c_case_on', 'c_quiet', 'c_quiet_on'].forEach((c) => withBuy.choose(c)); // take the casing Lead-buy
    // same node reached; the buy path holds more Lead despite spending MORE time
    expect(withBuy.view().node.id).toBe('n_box');
    expect(Number(withBuy.view().state.vars.lead)).toBeGreaterThan(Number(noBuy.view().state.vars.lead));
  });
  it('both Floor latches are reachable and mutually exclusive per path', () => {
    const quiet = new GameEngine(ch1WayIn); quiet.start();
    ['c_approach', 'c_quiet'].forEach((c) => quiet.choose(c));
    expect(quiet.view().state.vars.made_clean).toBe(true);
    expect(quiet.view().state.vars.alarm_tripped).toBe(false);
    const loud = new GameEngine(ch1WayIn); loud.start();
    ['c_approach', 'c_loud'].forEach((c) => loud.choose(c));
    expect(loud.view().state.vars.alarm_tripped).toBe(true);
    expect(loud.view().state.vars.made_clean).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails** — `npx vitest run ch1WayIn` → FAIL (module missing).
- [ ] **Step 3: Author `ch1WayIn.ts`** — the full typed `Story` per the brief (11 nodes, full prose in the voice, all declarations + wiring). Use the exact choice ids in the test.
- [ ] **Step 4: Run it to verify it passes** — `npx vitest run ch1WayIn` → PASS. If `CLOCK_CANNOT_BITE` appears, adjust the deadline/costs and re-run (do not silence the test).
- [ ] **Step 5: Full gates** — `npx tsc --noEmit` clean; `npx vitest run` (un-piped) all green.
- [ ] **Step 6: Commit** — `git add src/experiments/countinghouse/content/ch1WayIn.* && git commit -m "feat(countinghouse): author chapter 1 'The Way In' (counted inventory + The Lead)"`

---

### Task 2: Chapter 2 — "The Way Out" (`ch2_wayout`)

**Files:**
- Create: `src/experiments/countinghouse/content/ch2WayOut.ts` (exports `ch2WayOut: Story`)
- Test: `src/experiments/countinghouse/content/ch2WayOut.test.ts`

**Interfaces:**
- Consumes: `Story`, `lintStory`, `walkStateSpace`, `GameEngine` from `../../../engine`.
- Produces: `ch2WayOut: Story` (id `ch2_wayout`, ~9 nodes, **game-ending**, 6 endings: `end_outfit` atZero-death, `end_clean`/`end_lighter`/`end_not_whole` node-named, `end_dawn` out-of-time, `end_still_inside` default).

**Authoring brief.** Phase 4 — one escape route reconverging at the getaway car, where the finales resolve. Re-declare the carried surface so the container's start-rebase doesn't clamp:

- **Variables:** re-declare `partner_status` (default `'steady'`), `made_clean` (default false), `alarm_tripped` (default false), `lead_blown` (default false), and add the honesty latch `{ name:'got_clear', type:'boolean', default:false, purpose:'Latching: you reached the getaway car. Every getaway finale requires it so a deadline-cross below cannot claim the car (F1 pattern).' }`.
- **Items:** re-declare `loot` (`{type:'number', kind:'item', default:0, min:0, max:4, label:'The Take', purpose:'carried take; gates the clean finale'}`) and `charges` (same as ch1; carried, unused here but declared so the carry surface matches).
- **Resource — The Lead (now lethal):** `{ id:'lead', label:'Lead', min:0, max:60, start:40, depletion:{ everyMinutes:10, amount:5 }, atZero:{ ending:'end_outfit', setFlag:'lead_blown' } }`. Same bounds as ch1. A carried Lead at/near 0 resolves `end_outfit` on entry.
- **Node skeleton:**
  - `n_out_start` (start): out of the count-room, the escape begins. Choice: `c_to_stair` → `n_stair` (+10).
  - `n_stair` (the back stair — reads the carried Floor latch): Choices: `c_slip` → `n_lot` (+10; gated `{field:'made_clean',op:'is_true'}`; a Lead-buy `{field:'lead',op:'adjust_resource',value:'10'}` — a clean exit slips quiet), `c_force` → `n_lot` (+5; gated `{field:'alarm_tripped',op:'is_true'}`; a Lead-cost `{field:'lead',op:'adjust_resource',value:'-10'}`). (Exactly one is available, by the carried mutex.)
  - `n_lot` (the loading dock — the partner beat): the count-crew is between you and the car; the boxman is slow. Choices: `c_cover` → `n_approach_car` (+15; keep the partner — costs time/Lead pressure; if `partner_status` is `'steady'`/`'frayed'` it stays), `c_leave` → `n_leave` (+5; abandon him).
  - `n_leave` (scene): set `partner_status='gone'` (entryEffect). Choice: `c_leave_on` → `n_approach_car` (+5).
  - `n_approach_car` (the last stretch — the dawdle/deadline pressure point; got_clear still false, so a deadline-cross here → Dawn): Choices: `c_dash` → `n_car` (+10), `c_wait` → `n_approach_car` (+5; **repeatable** — hesitating at the mouth of the lot burns the night toward Dawn).
  - `n_car` (the getaway car — the reconverge hub): entryEffect `{field:'got_clear',op:'set',value:'true'}`. Choices (mutually exclusive + exhaustive over (gone?, loot≥3?) so exactly one is always available):
    - `c_drive_clean` → `n_end_clean` (+5; gated `[{field:'partner_status',op:'not_equals',value:'gone'},{field:'loot',op:'gte',value:'3'}]`).
    - `c_drive_light` → `n_end_lighter` (+5; gated `[{field:'partner_status',op:'not_equals',value:'gone'},{field:'loot',op:'lt',value:'3'}]`).
    - `c_drive_alone` → `n_end_not_whole` (+5; gated `[{field:'partner_status',op:'equals',value:'gone'}]`).
  - `n_end_clean` (endsWith terminal): `endsWith:'end_clean'`, `choices:[]`.
  - `n_end_lighter`: `endsWith:'end_lighter'`, `choices:[]`.
  - `n_end_not_whole`: `endsWith:'end_not_whole'`, `choices:[]`.
- **Endings** (priorities exact):
  - `{ id:'end_outfit', name:"The Outfit's Math", summary:'The Lead hit zero — the margin gone, and you in their building. The outfit takes you.', priority:2, conditions:[{field:'lead_blown',op:'is_true'}], body:'<voice>' }` — the resource `atZero.ending`.
  - `{ id:'end_clean', name:'Clean Away', summary:'Out, the take whole, the boxman beside you.', priority:0, conditions:[{field:'got_clear',op:'is_true'},{field:'partner_status',op:'not_equals',value:'gone'},{field:'loot',op:'gte',value:'3'}], body:'<voice>' }`.
  - `{ id:'end_lighter', name:'Away, Lighter', summary:'Out together — but you left some of it in the box to do it.', priority:0, conditions:[{field:'got_clear',op:'is_true'},{field:'partner_status',op:'not_equals',value:'gone'},{field:'loot',op:'lt',value:'3'}], body:'<voice>' }`.
  - `{ id:'end_not_whole', name:'Out, Not Whole', summary:'You made the car. The boxman did not.', priority:0, conditions:[{field:'got_clear',op:'is_true'},{field:'partner_status',op:'equals',value:'gone'}], body:'<voice>' }`.
  - `{ id:'end_dawn', name:'Dawn', summary:'The night ran out before you cleared.', conditions:[], body:'<voice>' }` — referenced by `outOfTimeEndingId` (empty conditions, NOT default).
  - `{ id:'end_still_inside', name:'Still Inside', summary:'The lights came on and you never made the getaway.', isDefault:true, conditions:[], body:'<voice>' }`.
- **Story fields:** `outOfTimeEndingId:'end_dawn'`. `startTime:'23:55'`, `deadline:'24:50'` (window 55; absolute-minutes after-midnight literal). Verify the efficient route reaches `n_car` before the window and the `n_approach_car` dawdle crosses it → **Dawn reachable, got_clear false on that path**.

**Note on expected orphans (the cave's F4 pattern):** the per-chapter walker starts from authored defaults (Lead at 40, partner steady, loot 0). From that seed: `end_outfit` (needs Lead→0; a full Lead won't deplete to 0 in 9 nodes) and `end_clean` (needs loot≥3, which the `n_grab` loop in ch1 produces — ch2 standalone can't) are **carry-only endings** — expected `orphanEndings` standalone, proven reachable in Task 3 via the seeded/cross-chapter walk. The test allows exactly these two as orphans.

- [ ] **Step 1: Write the failing test `ch2WayOut.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { lintStory, walkStateSpace, GameEngine } from '../../../engine';
import { ch2WayOut } from './ch2WayOut';

describe('ch2_wayout — The Way Out', () => {
  it('lints clean (incl. atZero-dominance, out-of-time, endsWith rules)', () => {
    expect(lintStory(ch2WayOut).errors).toEqual([]);
  });
  it('is walkable, no softlocks; only the carry-only endings may be orphans', () => {
    const r = walkStateSpace(ch2WayOut);
    expect(r.capHit).toBe(false);
    expect(r.softlocks).toEqual([]);
    const allowedOrphans = new Set(['end_outfit', 'end_clean']);
    expect(r.orphanEndings.filter((e) => !allowedOrphans.has(e))).toEqual([]);
  });
  it('Dawn (out-of-time) is reachable by dawdling before the car, with got_clear still false', () => {
    const g = new GameEngine(ch2WayOut);
    g.start();
    g.choose('c_to_stair');
    // exactly one stair choice is available from the default (made_clean=false, alarm_tripped=false) ->
    // neither: author n_stair so the standalone-default has a path; from a real game made_clean is carried.
    // Drive to n_approach_car, then dawdle c_wait past the 24:50 window:
    // (the executor fills the exact id sequence; assert the deadline ending is Dawn, not a getaway)
    // Sentinel that the out-of-time wiring exists:
    expect(ch2WayOut.outOfTimeEndingId).toBe('end_dawn');
    const dawn = ch2WayOut.endings.find((e) => e.id === 'end_dawn');
    expect(dawn?.conditions).toEqual([]); // OUT_OF_TIME_HAS_CONDITIONS guard
  });
  it('the three drive choices are mutually exclusive and exhaustive at the car', () => {
    // n_car sets got_clear; over (gone?, loot>=3?) exactly one drive choice is available.
    // Proven exhaustively by the walker reaching n_end_clean/lighter/not_whole across seeds (Task 3);
    // here assert the gates are structurally present and disjoint.
    const car = ch2WayOut.nodes.find((n) => n.id === 'n_car')!;
    const ids = car.choices.map((c) => c.id).sort();
    expect(ids).toEqual(['c_drive_alone', 'c_drive_clean', 'c_drive_light']);
  });
  it('a carried-low Lead resolves The Outfit on entry (atZero death dominates)', () => {
    // seed a near-zero Lead the way the container will: clone + override the start, then the first
    // depletion step crosses zero -> end_outfit (priority 2) fires.
    const dying: typeof ch2WayOut = JSON.parse(JSON.stringify(ch2WayOut));
    dying.resources!.find((r) => r.id === 'lead')!.start = 0;
    const g = new GameEngine(dying);
    expect(g.view().endingReached?.id).toBe('end_outfit');
  });
});
```

- [ ] **Step 2: Run it to verify it fails.**
- [ ] **Step 3: Author `ch2WayOut.ts`** per the brief (9 nodes, 6 endings, priorities, `outOfTimeEndingId`, `got_clear`, full prose). Make `n_stair` reachable from the standalone default so the chapter is walkable alone (e.g. the default `made_clean=false`/`alarm_tripped=false` state still has a non-gated fallthrough, OR seed the walk in Task 3 — choose the fallthrough so per-chapter lint/walk is clean). Then fill the Dawn playthrough in the test with the real id sequence and assert `finalEndingId`/`endingReached.id === 'end_dawn'`.
- [ ] **Step 4: Run it to verify it passes.** If `ATZERO_PRIORITY_DOMINANCE`, `OUT_OF_TIME_HAS_CONDITIONS`, or `ENDSWITH_WITH_LIVE_CHOICES` fires, fix the wiring (priorities / empty oot conditions / empty terminal choices) and re-run.
- [ ] **Step 5: Full gates** — `npx tsc --noEmit`; `npx vitest run` (un-piped) green.
- [ ] **Step 6: Commit** — `feat(countinghouse): author chapter 2 'The Way Out' (endsWith finales + Dawn + The Outfit)`

---

### Task 3: The Game wiring (`countinghouse.ts`) + the cross-chapter contracts + end-to-end

**Files:**
- Create: `src/experiments/countinghouse/content/countinghouse.ts` (exports `countinghouse: Game`)
- Create: `src/experiments/countinghouse/index.ts` (barrel: re-export the container from `../sump-line` + the two chapters + the game)
- Test: `src/experiments/countinghouse/content/countinghouse.test.ts`

**Interfaces:**
- Consumes: `ch1WayIn` (T1), `ch2WayOut` (T2); `Game`, `lintGame`, `GameRunner`, `valuesAtEndings` from `../../sump-line`.
- Produces: `countinghouse: Game` —
```ts
{
  id: 'countinghouse', title: 'The Countinghouse', startChapterId: 'ch1_wayin',
  carry: { vars: 'all', resources: ['lead'], clues: true, inventory: true },
  gameDeadlineMinutes: 240,
  domains: { partner_status: ['steady', 'frayed', 'hurt', 'gone'] },
  mutexLatches: [['alarm_tripped', 'made_clean']],
  chapters: [
    { id: 'ch1_wayin', title: 'The Way In', story: ch1WayIn, transitions: [{ when: {}, goTo: 'ch2_wayout' }] },
    { id: 'ch2_wayout', title: 'The Way Out', story: ch2WayOut, gameEnding: true, transitions: [],
      carriedRequired: ['loot', 'partner_status'] },
  ],
}
```
(`lead` carries as a resource; `loot`/`partner_status`/the latches carry via `vars:'all'`. ch1 writes `loot` and `partner_status`, so `carriedRequired` is satisfied — no `CONTRACT_READ_NO_ANCESTOR_PRODUCER`.)

- [ ] **Step 1: Write the failing test `countinghouse.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { lintGame, GameRunner, valuesAtEndings } from '../../sump-line';
import { countinghouse } from './countinghouse';
import { ch2WayOut } from './ch2WayOut';

describe('The Countinghouse — the wired game', () => {
  it('lintGame is clean (incl. domains / mutex / carriedRequired / ancestor-producer)', () => {
    expect(lintGame(countinghouse).errors).toEqual([]);
  });
  it('The Lead, the take, and the partner all carry across the chapter boundary', () => {
    const g = new GameRunner(countinghouse);
    // quiet route, grab the full take, keep the boxman, into ch2:
    ['c_case', 'c_case_on', 'c_quiet', 'c_quiet_on', 'c_blow', 'c_grab', 'c_grab', 'c_grab', 'c_enough', 'c_run']
      .forEach((c) => g.choose(c));
    expect(g.view().chapterId).toBe('ch2_wayout');
    expect(Number(g.view().state.vars.loot)).toBeGreaterThanOrEqual(3);   // the counted take carried
    expect(Number(g.view().state.vars.lead)).toBeLessThan(60);            // The Lead rebased, not reset
    expect(g.view().state.vars.partner_status).toBe('frayed');            // the boxman's carried state
  });
  it('the clean quiet route plays end to end to Clean Away', () => {
    const g = new GameRunner(countinghouse);
    ['c_case', 'c_case_on', 'c_quiet', 'c_quiet_on', 'c_blow', 'c_grab', 'c_grab', 'c_grab', 'c_enough', 'c_run']
      .forEach((c) => g.choose(c));
    ['c_to_stair', 'c_slip', 'c_cover', 'c_dash', 'c_drive_clean'].forEach((c) => g.choose(c));
    const v = g.view();
    expect(v.gameOver).toBe(true);
    expect(v.finalEndingId).toBe('end_clean');
  });
  it('leaving the boxman yields Out, Not Whole', () => {
    const g = new GameRunner(countinghouse);
    ['c_case', 'c_case_on', 'c_quiet', 'c_quiet_on', 'c_blow', 'c_grab', 'c_enough', 'c_run'].forEach((c) => g.choose(c));
    ['c_to_stair', 'c_slip', 'c_leave', 'c_leave_on', 'c_dash', 'c_drive_alone'].forEach((c) => g.choose(c));
    const v = g.view();
    expect(v.gameOver).toBe(true);
    expect(v.finalEndingId).toBe('end_not_whole');
  });
  it('a carried-low Lead dies as The Outfit in ch2 (cross-chapter only)', () => {
    const g = new GameRunner(countinghouse);
    // the loud route + dawdling burns the Lead down; it carries low into ch2 and hits zero there.
    // (executor fills the exact dawdle sequence; assert the game ends on end_outfit)
    // sentinel: the contract + atZero wiring are present
    expect(ch2WayOut.resources!.find((r) => r.id === 'lead')!.atZero).toEqual({ ending: 'end_outfit', setFlag: 'lead_blown' });
  });
  it('value-at-endings: the slice reaches the getaway finals, Dawn, and The Outfit with sane ranges', () => {
    // seed a representative carried-in state (full take, boxman frayed, Lead carried low) and read terminals
    const report = valuesAtEndings(ch2WayOut, { seed: { loot: 3, partner_status: 'frayed', lead: 18 }, fields: ['lead', 'loot'] });
    const reached = new Set(report.filter((r) => r.reached).map((r) => r.endingId));
    expect(reached.has('end_clean')).toBe(true);
    expect(reached.has('end_dawn')).toBe(true);   // dawdle crosses the window
    expect(reached.has('end_outfit')).toBe(true); // the carried-low Lead depletes to zero on a long path
  });
});
```

- [ ] **Step 2: Run it to verify it fails.**
- [ ] **Step 3: Create `countinghouse.ts`** (the `Game` above) and `index.ts` (barrel). Fill the playthroughs with the real authored choice ids so every assertion is concrete (carry proven; `end_clean`/`end_not_whole` end-to-end; `end_outfit` via carried-low Lead; the value-at-endings seed reaches clean/dawn/outfit). If `CONTRACT_*` fires, fix the annotation/producer wiring (not the lint).
- [ ] **Step 4: Run it to verify it passes** — `npx vitest run countinghouse` → PASS.
- [ ] **Step 5: Full gates** — `npx tsc --noEmit`; `npx vitest run` (un-piped) all green (283 prior + the new suites).
- [ ] **Step 6: Commit** — `feat(countinghouse): wire the Game + cross-chapter contracts + end-to-end playthroughs`

---

### Task 4: Hardening sweep + assessment + docs/memory

**Files:**
- Create: `src/experiments/countinghouse/harden/fuzz.test.ts` (a seeded random-walk sweep over the wired game)
- Create/Modify: `src/experiments/countinghouse/FINDINGS.md` (the slice's findings, incl. the container-promotion deferral)
- Modify: `CHANGELOG.md`, `NextSteps.md`
- Modify (memory, gitignored): `C:\Users\matts\.claude\projects\C--Users-matts-Desktop-Cambria\memory\cave-experiment.md` + `MEMORY.md`

**Brief.** A coherence sweep mirroring the cave's `harden/fuzz.test.ts`: drive the `GameRunner` over many random choice-sequences and assert no incoherence — every run terminates in a real ending; no getaway finale fires with the Lead blown; `end_dawn`/`end_outfit` are honest (no `got_clear` / no surface claim on a deadline-cross); a finale's asserted partner/loot state matches the terminal state. Then record findings + update docs.

- [ ] **Step 1: Write `harden/fuzz.test.ts`** — N seeded pseudo-random playthroughs (seed varied by index; no `Math.random` — index-derived), each asserting: `gameOver` reached within the transition cap; `finalEndingId` is one of the six; if `finalEndingId` ∈ {clean,lighter,not_whole} then `state.vars.got_clear === true` and `state.vars.lead_blown !== true`; if `end_clean` then `loot ≥ 3 && partner_status !== 'gone'`; if `end_not_whole` then `partner_status === 'gone'`.
- [ ] **Step 2: Run it** — `npx vitest run countinghouse/harden` → PASS. Any incoherence is a **content** bug — fix the chapter, not the test.
- [ ] **Step 3: Write `FINDINGS.md`** — record: (a) the four features exercised end-to-end (counted inventory, `adjust_resource`, `endsWith`, `outOfTimeEndingId`) with the node/ending that proves each; (b) the **container-promotion finding** — the container layer is imported from `../sump-line`; a second game now exists, so the container should be promoted to a shared dir (e.g. `src/container/`) in a dedicated refactor (deferred, not part of this slice); (c) any authoring friction worth an engine/container note.
- [ ] **Step 4: Update `CHANGELOG.md` + `NextSteps.md`** — note the Countinghouse slice shipped (the first content on the v1.4 features), the two chapters + the showcase mapping, and the deferred items (the loud-route expansion, the remaining two chapters, the container promotion, the WS-G front-end).
- [ ] **Step 5: Update memory** — `cave-experiment.md`: append a dated entry (the Countinghouse slice built + the feature showcase + test count); update the resume pointer. `MEMORY.md`: refresh the one-line index hook.
- [ ] **Step 6: Full gates + commit** — `npx tsc --noEmit`; `npx vitest run` (un-piped) green; `git add` the new/changed repo files; `git commit -m "test(countinghouse): coherence fuzz sweep + findings + docs"`. (Memory files are gitignored — not committed.)

---

## Self-Review

- **Spec coverage** (vs `2026-06-27-heist-arc-design.md`): world/voice → Global Constraints; the four-phase spine → ch1 (Way In + Floor + Box, T1) + ch2 (Way Out, T2); The Lead + `adjust_resource` → T1 resource + Lead-buy/cost; counted inventory (charges + the take) → T1 items + the Box; node-named finales → T2 `endsWith` terminals; Dawn (out-of-time) → T2 `outOfTimeEndingId`; The Outfit (atZero death) → T2 resource `atZero.ending` + priority 2; the carried contract (domains/mutex/carriedRequired) → T3 Game; the first-slice "reach ≥4 endings, spend a charge, buy Lead, carry across one boundary" → T3 tests; the verification bar (lint-clean + walker + fuzz) → T1–T4. ✓
- **Placeholder note:** per the cave precedent, the playthrough id-sequences in T2/T3 tests are completed against the real authored choice ids in the same task's Step 3 (the ids are created there) — intrinsic to content authoring, not a placeholder gap. Ending `body:'<voice>'` denotes "author the prose to the locked voice," the established structure-in-plan/prose-in-execution split.
- **Type consistency:** `Game`/`Story`/`Condition`/`Effect`/`Resource`/`VariableDef` are the engine/container types; `countinghouse.chapters[].story` consume `ch1WayIn`/`ch2WayOut`; the carried surface (`lead` resource; `loot`/`partner_status`/`made_clean`/`alarm_tripped`/`charges`/`lead_blown` vars) is declared in BOTH chapters with matching types so no `CONTRACT_TYPE_MISMATCH`; `got_clear` is ch2-local. The atZero ending id `end_outfit` matches the resource `atZero.ending` and a declared ending. ✓
- **Honesty seams pre-closed:** `got_clear` keeps Dawn honest (no getaway claim on a pre-car deadline-cross); the Lead's atZero is flag-only in ch1 (non-game-ending) and lethal in ch2 (mirrors the cave's lamp); the atZero death out-ranks all finales (priority 2 vs 0) so a death can never be masked; Dawn and the default are distinct (out-of-time vs catch-all). These are exactly the v1.4 seams the engine was hardened to expose — the fuzz sweep (T4) is the catch-net.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-27-countinghouse-slice-build.md`.
