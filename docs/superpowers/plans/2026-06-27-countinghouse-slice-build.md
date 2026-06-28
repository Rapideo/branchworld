# The Countinghouse — Heist Slice (C2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended for this content build — single consistent authorial voice) or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.
>
> **Revision 2 (post team gut-check, 2026-06-27).** Fixes folded in: the `got_clear` honesty latch moved to the drive-away; the take is a distinct-node grab chain (self-loops don't lift `maxTime`); ch2 standalone `made_clean` default true (walkability); `end_still_inside` documented as a structural orphan; tautological tests replaced; container imported by submodule not barrel; clocks recalibrated. New Task 5 (playable harness). Decisions locked by Matthew: full take affordable-but-costly; a frayed partner counts as clean; keystone prose added to the spec.

**Goal:** Author the approved "The Countinghouse" heist arc as a **two-chapter vertical slice** — one path through The Way In → The Floor → The Box → The Way Out — as real typed `Story` chapters wired into a `Game`, lint-clean and walker-verified, that is the **first content to exercise the four new engine capabilities** (counted inventory, `adjust_resource`, node-named `endsWith` endings, the `outOfTimeEndingId` ending), and playable in a self-contained HTML so Matthew can run the job himself.

**Architecture:** Each chapter is a typed engine `Story` under a new `src/experiments/countinghouse/` directory. A `Game` (`countinghouse.ts`) wires the two chapters with a single catch-all transition and the carry contract, reusing the container layer (imported by **submodule**, not the barrel) that lives in `src/experiments/sump-line/`. Validation reuses the engine's `lintStory`/`walkStateSpace` per chapter and the container's `lintGame` + `GameRunner` + seeded walk across chapters. **Zero engine change** — content on the frozen v1.4 engine; the cave's "Sump Line" is the proven template.

**Tech Stack:** TypeScript 5, Vitest 2, the FROZEN engine v1.4 + the merged container + counted inventory. Vite (+ the existing `vite-plugin-singlefile`) for the playable HTML. No new deps.

## Global Constraints

- **Engine FROZEN** — no changes under `src/engine/`. This plan only ADDS content under `src/experiments/countinghouse/`. If authoring seems to need an engine/container change, STOP and log it as a finding (Task 4); do not edit the engine.
- **Design source-of-truth:** `docs/superpowers/specs/2026-06-27-heist-arc-design.md` (the arc + the three **keystone prose** anchors — `n_street`, `n_turn`, `end_outfit`). This plan carries the full structural wiring; **prose is authored during execution** to the keystones' voice.
- **Voice (locked):** 1970s, cold, literary, procedural, restrained. Two kinds of heat (cops + the outfit). Crew = **you + one partner, the boxman** (name him in authoring — e.g. "Sol"). The mob is *procedure, not menace*. Sparse dialogue. Match the spec's keystones exactly.
- **Time/EE-1:** node prose carries NO clock numerals — use the literal `{{time}}` token or relative phrasing. After-midnight times use absolute minutes past midnight (e.g. `'24:10'` = 00:10), per `TIME_LITERAL_OUT_OF_RANGE`.
- **The four feature-showcases are REQUIRED, each assigned to a task:** counted inventory (`charges` via `has_item`/`decrement`; the counted take `loot` via the grab chain + `gte`) → T1; `adjust_resource` (**The Lead** — a survival meter a choice *raises*) → T1; node-named `endsWith` finales → T2; the `outOfTimeEndingId` ending (**Dawn**) → T2; the atZero death (**The Outfit's Math**) → T2; the cross-chapter contracts (domains/mutex/carriedRequired) → T3; the playable build → T5.
- **Engine wiring rules — lint-clean by construction (verified against linter.ts):**
  - The Lead is a **time-driven resource** (`depletion` present), changed ONLY via `adjust_resource` (a direct `set`/`increment`/`decrement` errors `RESOURCE_TIME_DRIVEN_WRITTEN`; `adjust_resource` on a non-time-driven field errors `ADJUST_RESOURCE_NOT_TIME_DRIVEN`). Lead-buy = `{op:'adjust_resource', value:'+N'}`; Lead-cost = `{op:'adjust_resource', value:'-N'}` (`value = clamp(base(time)+offset)`).
  - Items are `{type:'number', kind:'item', min, max}` vars; gate with `has_item` (≥1) or `gte` (≥N); spend with `decrement` (clamped). `has_item` on a non-item field errors `HAS_ITEM_NOT_ITEM`; an item not `type:'number'` errors `ITEM_NOT_NUMERIC`.
  - `endsWith` terminal nodes have **no choices** (exempt from `NO_EXIT`; live choices warn `ENDSWITH_WITH_LIVE_CHOICES`) and need no `resolvesEnding`. `endsWith` must name a real ending (`NODE_ENDING_MISSING`). **A resource death beats an `endsWith` pin** (resolver tier-1 is skipped when atZero fired), so a getaway finale never masks The Outfit.
  - The atZero death ending must **strictly out-rank** every non-default ending it can co-occur with (`ATZERO_PRIORITY_DOMINANCE`): `end_outfit` priority 2, all other non-default endings priority 0.
  - The `outOfTimeEndingId` ending (**Dawn**) has **empty conditions** (`OUT_OF_TIME_HAS_CONDITIONS`); it fires only via the deadline path (excluded from the state-match pool). Exactly one `isDefault` ending with empty conditions (`DEFAULT_HAS_CONDITIONS`).
  - **Honesty latch `got_clear`** (the cave's `cave_climbed_out` / F1 pattern): the getaway only happens when you **drive away**, so set `got_clear=true` on the **drive-away** — the entryEffects of the three `n_end_*` terminal nodes — NOT at the `n_car` hub. (Setting it at the hub lets a deadline-cross *arriving* at the car fire a getaway finale for a player who never drove — a confirmed honesty leak the team caught.) Every getaway finale requires `got_clear is_true`, so a deadline-cross *before the drive* falls through to **Dawn**.
  - **CALIBRATION RULE — repeatable self-loops do NOT raise `maxTime`.** The linter's longest-path DFS has a `path.has(id)` cycle-guard (linter.ts:77), so a node that loops to itself (`repeatable:true` self-edge) is counted **once** — it does NOT lengthen the longest *simple* path. `CLOCK_CANNOT_BITE` fires when `maxTime(simple) < window`. Therefore: (a) model "spend more time" as a chain of **distinct** nodes, not a self-loop, wherever it must lengthen `maxTime`; (b) set each chapter's window so `minTime(simple) ≤ window ≤ maxTime(simple)`, with a genuine over-investment route longer than the winning route so the window has headroom. Dawn/early-resolution via a self-loop dawdle is still reachable by the **walker** (each loop advances the clock → a fresh state) even though it's invisible to `maxTime`. **Verify every chapter with `lintStory` + `walkStateSpace` and adjust costs/deadline; never silence the test.**
  - No variable may use the reserved `__` prefix (`RESERVED_VAR_PREFIX`).
- **Container reuse (logged decision):** import the container by **submodule** — `../../sump-line/GameRunner`, `../../sump-line/lintGame`, `../../sump-line/lintGameContracts`, `../../sump-line/seededWalk` — NOT the `../../sump-line` barrel (which re-exports the *cave game* `sumpLine`/`ch1Descent`/… and would drag game #1 into game #2's module graph). Promoting the container to a shared `src/container/` is the **immediate next step after this slice** (two consumers = the shape is now visible), logged in Task 4.
- Tests co-located. Every task ends `npx vitest run` green (**un-piped** — never gate a commit on a grep-filtered exit) + `npx tsc --noEmit` clean + a Conventional-Commits commit. **The existing 283 tests stay green. Nothing is pushed** (local commits only).

---

### Task 1: Chapter 1 — "The Way In" (`ch1_wayin`)

**Files:**
- Create: `src/experiments/countinghouse/content/ch1WayIn.ts` (exports `ch1WayIn: Story`)
- Test: `src/experiments/countinghouse/content/ch1WayIn.test.ts`

**Interfaces:**
- Consumes: `Story`, `lintStory`, `walkStateSpace`, `GameEngine` from `../../../engine`.
- Produces: `ch1WayIn: Story` (id `ch1_wayin`, ~13 nodes, non-game-ending; one default ending that transitions to ch2).

**Authoring brief.** Phases 1–3 of the spine (Way In hub → the route-exclusive Floor → the Box + the gone-sideways turn), authored to the keystones. Declarations (exact):

- **Variables:**
  - `{ name:'entry_route', type:'string', default:'quiet', purpose:"The Floor fork: 'quiet' | 'loud'. Carried; gates content." }`
  - `{ name:'partner_status', type:'string', default:'steady', purpose:"The boxman: 'steady'|'frayed'|'hurt'|'gone'. Carried; domain-checked; gates endings." }`
  - `{ name:'made_clean', type:'boolean', default:false, purpose:'Latching: worked the floor without tripping the alarm. Mutex with alarm_tripped.' }`
  - `{ name:'alarm_tripped', type:'boolean', default:false, purpose:'Latching: the alarm went. Mutex with made_clean.' }`
  - `{ name:'lead_blown', type:'boolean', default:false, purpose:'Latching, paired with The Lead at zero. The Outfit ending requires it.' }`
- **Items (counted inventory):**
  - `{ name:'charges', type:'number', kind:'item', default:1, min:0, max:2, label:'Charges', purpose:'breaching charges for the box' }`
  - `{ name:'loot', type:'number', kind:'item', default:0, min:0, max:4, label:'The Take', purpose:'bundles of cash; how much you grab trades against time' }`
- **Resource — The Lead (time-driven, buyable):**
  - `{ id:'lead', label:'Lead', min:0, max:60, start:40, depletion:{ everyMinutes:10, amount:5 }, atZero:{ setFlag:'lead_blown' } }` — **flag only, no ending** in ch1 (non-game-ending; mirrors the cave's ch1 lamp). Burning the Lead here marks you; the death resolves in ch2.
- **Node skeleton** (ids + intent; author full prose; every node sets `location` via a `change_location` entryEffect; `+N` = minutes):
  - `n_street` (hub, start; the `n_street` keystone): casing from the car. Choices: `c_case` → `n_case` (+10; a Lead-buy — scouting the patrol's timing buys margin: `{field:'lead',op:'adjust_resource',value:'15'}`), `c_approach` → `n_approach` (+5).
  - `n_case` (discovery): the timing the scout reveals. Choice: `c_case_on` → `n_approach` (+5).
  - `n_approach` (the entry fork — phase 2): Choices: `c_quiet` → `n_floor_quiet` (+10, sets `entry_route='quiet'`), `c_loud` → `n_floor_loud` (+5, sets `entry_route='loud'`).
  - `n_floor_quiet`: the service-door inside job. entryEffects set `made_clean=true`; a Lead-buy (`{field:'lead',op:'adjust_resource',value:'10'}` — cutting the relay). Choice: `c_quiet_on` → `n_box` (+10).
  - `n_floor_loud`: the fast loud way. entryEffects set `alarm_tripped=true`; a Lead-cost (`{field:'lead',op:'adjust_resource',value:'-12'}`). Choice: `c_loud_on` → `n_box` (+5).
  - `n_box` (phase 3 — the safe): Choices: `c_blow` → `n_grab1` (+5; gated `{field:'charges',op:'has_item'}`; spends a charge `{field:'charges',op:'decrement',value:'1'}`), `c_work` → `n_grab1` (+20; the boxman works it slow — no charge; the time burns Lead via depletion).
  - **The take — a distinct-node grab CHAIN** (NOT a self-loop; each node's entryEffect grabs one bundle so the chain lengthens `maxTime`):
    - `n_grab1` (entryEffect `{field:'loot',op:'increment',value:'1'}` → loot 1): Choices: `c_more1` → `n_grab2` (+5), `c_enough1` → `n_turn` (+5).
    - `n_grab2` (entryEffect loot→2): Choices: `c_more2` → `n_grab3` (+5), `c_enough2` → `n_turn` (+5).
    - `n_grab3` (entryEffect loot→3 — the full take): Choice: `c_done` → `n_turn` (+5).
  - `n_turn` (the gone-sideways turn — forced; the `n_turn` keystone): the count-crew comes back early. entryEffects: `{field:'clues',op:'add_clue',value:'clue_crew_early'}` and `{field:'partner_status',op:'set',value:'frayed'}`. Choice: `c_run` → `n_commit` (+5).
  - `n_commit` (resolvesEnding): commit to the escape. `resolvesEnding:true`, no choices. Resolves `end_ch1_out`.
- **Endings:** exactly one — `{ id:'end_ch1_out', name:'Out of the Count-Room', summary:'You are out of the count-room, the night not yet decided.', isDefault:true, conditions:[] }`. **Prose is NEUTRAL** — it must not assert "you have the take" (a deadline-cross can resolve it at loot 0); say only that you are clear of the room. The transition to ch2 is wired in Task 3.
- **Clock:** `startTime:'23:00'`, `deadline:'24:10'` (window **70**). Target paths (verify with the linter/walker, adjust if off): `minPath` (loud, blow, exit at n_grab1) ≈ 30; the **full-take careful win** (casing + quiet + blow + full chain) ≈ 60 → reaches `n_commit` before 70; `maxPath(simple)` (casing + quiet + **slow `c_work`** + full chain) ≈ 75 ≥ 70 so `CLOCK_CANNOT_BITE` passes and over-investment crosses the deadline (resolving `end_ch1_out` early — ch1 has no lose-state, so that is fine).

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
    ['c_approach', 'c_quiet', 'c_quiet_on'].forEach((c) => g.choose(c)); // arrive at n_box with 1 charge
    expect(g.view().node.id).toBe('n_box');
    expect(g.view().choices.find((c) => c.id === 'c_blow')?.available).toBe(true);
    const v = g.choose('c_blow');
    expect(Number(v.state.vars.charges)).toBe(0); // spent, clamped at min 0
  });
  it('the full take accumulates via the grab chain (counted, not boolean)', () => {
    const g = new GameEngine(ch1WayIn);
    g.start();
    ['c_approach', 'c_quiet', 'c_quiet_on', 'c_blow'].forEach((c) => g.choose(c)); // -> n_grab1, loot 1
    expect(Number(g.view().state.vars.loot)).toBe(1);
    g.choose('c_more1'); expect(Number(g.view().state.vars.loot)).toBe(2);
    g.choose('c_more2'); expect(Number(g.view().state.vars.loot)).toBe(3);
  });
  it('a Lead-buy raises The Lead above the no-buy line (adjust_resource), net of its time cost', () => {
    const noBuy = new GameEngine(ch1WayIn); noBuy.start();
    ['c_approach', 'c_quiet', 'c_quiet_on'].forEach((c) => noBuy.choose(c));   // skip the casing buy
    const withBuy = new GameEngine(ch1WayIn); withBuy.start();
    ['c_case', 'c_case_on', 'c_quiet', 'c_quiet_on'].forEach((c) => withBuy.choose(c)); // take the casing buy
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
- [ ] **Step 3: Author `ch1WayIn.ts`** — the full typed `Story` per the brief (13 nodes, full prose to the keystones, all declarations + wiring). Use the exact choice ids in the test.
- [ ] **Step 4: Run it to verify it passes** — `npx vitest run ch1WayIn` → PASS. If `CLOCK_CANNOT_BITE`/`DEADLINE_UNWINNABLE` appears, adjust deadline/costs per the calibration rule and re-run.
- [ ] **Step 5: Full gates** — `npx tsc --noEmit` clean; `npx vitest run` (un-piped) all green.
- [ ] **Step 6: Commit** — `git add src/experiments/countinghouse/content/ch1WayIn.* && git commit -m "feat(countinghouse): author chapter 1 'The Way In' (counted inventory + The Lead)"`

---

### Task 2: Chapter 2 — "The Way Out" (`ch2_wayout`)

**Files:**
- Create: `src/experiments/countinghouse/content/ch2WayOut.ts` (exports `ch2WayOut: Story`)
- Test: `src/experiments/countinghouse/content/ch2WayOut.test.ts`

**Interfaces:**
- Consumes: `Story`, `lintStory`, `walkStateSpace`, `GameEngine` from `../../../engine`.
- Produces: `ch2WayOut: Story` (id `ch2_wayout`, ~10 nodes, **game-ending**, 6 endings).

**Authoring brief.** Phase 4 — one escape route reconverging at the getaway car, where the finales resolve. Re-declare the carried surface so the container's start-rebase doesn't clamp, **with `made_clean` default TRUE standalone** (the cave's walkability trick — the container rebases it from the real carried value; standalone, it keeps the chapter from softlocking at `n_stair`):

- **Variables:** `{ name:'made_clean', type:'boolean', default:true, ... }` (NOTE the standalone `true`), `{ name:'alarm_tripped', type:'boolean', default:false, ... }`, `partner_status` (default `'steady'`), `lead_blown` (default false), and `{ name:'got_clear', type:'boolean', default:false, purpose:'Latching: you drove away. Every getaway finale requires it so a deadline-cross before the drive cannot claim the car (F1).' }`.
- **Items:** `loot` (`{type:'number', kind:'item', default:0, min:0, max:4, label:'The Take', purpose:'carried take; gates the clean finale'}`) and `charges` (same as ch1; carried, declared so the carry surface matches).
- **Resource — The Lead (now lethal):** `{ id:'lead', label:'Lead', min:0, max:60, start:40, depletion:{ everyMinutes:10, amount:5 }, atZero:{ ending:'end_outfit', setFlag:'lead_blown' } }`. Same bounds as ch1. A carried Lead at/near 0 resolves `end_outfit` on entry.
- **Node skeleton:**
  - `n_out_start` (start): out of the count-room, the escape begins. Choice: `c_to_stair` → `n_stair` (+5).
  - `n_stair` (the back stair — reads the carried Floor latch): Choices: `c_slip` → `n_lot` (+10; gated `{field:'made_clean',op:'is_true'}`; Lead-buy `{field:'lead',op:'adjust_resource',value:'10'}` — a clean exit slips quiet), `c_force` → `n_lot` (+5; gated `{field:'alarm_tripped',op:'is_true'}`; Lead-cost `{field:'lead',op:'adjust_resource',value:'-10'}`). Exactly one is available, by the carried mutex (standalone: `made_clean=true` → `c_slip`).
  - `n_lot` (the loading dock — the partner beat): the crew is between you and the car; the boxman is slow. Choices: `c_cover` → `n_approach_car` (+15; keep the partner), `c_leave` → `n_leave` (+5; abandon him).
  - `n_leave` (scene): entryEffect `{field:'partner_status',op:'set',value:'gone'}`. Choice: `c_leave_on` → `n_approach_car` (+5).
  - `n_approach_car` (the last stretch — the dawdle/deadline pressure point; `got_clear` still false, so a deadline-cross here → Dawn): Choices: `c_dash` → `n_car` (+10), `c_circle` → `n_circle` (+20 — circle the block once more; the **distinct over-investment node** that lifts `maxTime` above the winning path), `c_wait` → `n_approach_car` (+5; **repeatable** — hesitating at the lot mouth; reaches Dawn via the walker even though it doesn't lift `maxTime`).
  - `n_circle` (scene): you take the long way round. Choice: `c_circle_on` → `n_car` (+5).
  - `n_car` (the getaway car — the reconverge hub; **does NOT set got_clear**): Choices (mutually exclusive + exhaustive over (gone?, loot≥3?) so exactly one is always available). **Each drive choice sets `got_clear` as a choice effect** so the latch fires on the drive, not the arrival:
    - `c_drive_clean` → `n_end_clean` (+5; gated `[{field:'partner_status',op:'not_equals',value:'gone'},{field:'loot',op:'gte',value:'3'}]`; effect `{field:'got_clear',op:'set',value:'true'}`).
    - `c_drive_light` → `n_end_lighter` (+5; gated `[{field:'partner_status',op:'not_equals',value:'gone'},{field:'loot',op:'lt',value:'3'}]`; effect `{field:'got_clear',op:'set',value:'true'}`).
    - `c_drive_alone` → `n_end_not_whole` (+5; gated `[{field:'partner_status',op:'equals',value:'gone'}]`; effect `{field:'got_clear',op:'set',value:'true'}`).
  - `n_end_clean` / `n_end_lighter` / `n_end_not_whole` (endsWith terminals): `endsWith:'end_<x>'`, `choices:[]`. (Belt-and-suspenders: also set `got_clear=true` as an entryEffect here, so the latch is true regardless of which write path runs.)
- **Endings** (priorities exact; getaway prose written to a **frayed** partner — "beside you," rattled, not serene):
  - `{ id:'end_outfit', name:"The Outfit's Math", summary:'The Lead hit zero — the margin gone, and you in their building.', priority:2, conditions:[{field:'lead_blown',op:'is_true'}], body:'<the end_outfit keystone>' }` — the resource `atZero.ending`.
  - `{ id:'end_clean', name:'Clean Away', summary:'Out, the take whole, the boxman beside you.', priority:0, conditions:[{field:'got_clear',op:'is_true'},{field:'partner_status',op:'not_equals',value:'gone'},{field:'loot',op:'gte',value:'3'}], body:'<voice>' }`.
  - `{ id:'end_lighter', name:'Away, Lighter', summary:'Out together — but you left some of it in the box to do it.', priority:0, conditions:[{field:'got_clear',op:'is_true'},{field:'partner_status',op:'not_equals',value:'gone'},{field:'loot',op:'lt',value:'3'}], body:'<voice>' }`.
  - `{ id:'end_not_whole', name:'Out, Not Whole', summary:'You made the car. The boxman did not.', priority:0, conditions:[{field:'got_clear',op:'is_true'},{field:'partner_status',op:'equals',value:'gone'}], body:'<voice>' }`.
  - `{ id:'end_dawn', name:'Dawn', summary:'The night ran out before you cleared.', conditions:[], body:'<voice>' }` — referenced by `outOfTimeEndingId` (empty conditions; NOT default).
  - `{ id:'end_still_inside', name:'Still Inside', summary:'You never made the getaway.', isDefault:true, conditions:[], body:'<NEUTRAL structural catch-all — see note>' }`.
- **Story fields:** `outOfTimeEndingId:'end_dawn'`. `startTime:'23:55'`, `deadline:'24:45'` (window **50**). Verify (linter + walker): the clean+cover+dash win reaches `n_car` before 50 → drives to a finale; the `c_circle` over-investment (≈55) crosses 50 *before* the car → Dawn; the `c_wait` dawdle also reaches Dawn. `minTime ≤ 50 ≤ maxTime(simple)`.

**Note — `end_still_inside` is a STRUCTURAL ORPHAN (acknowledged).** The engine requires exactly one `isDefault` ending, but in this slice every resolution path is covered earlier (endsWith terminals → getaways; atZero → Outfit; deadline → Dawn). So the default is unreachable here. Its prose must be a **genuinely neutral** catch-all (do NOT write an evocative "the lights came on" scene that advertises a reachable outcome). The ch2 test allows it as an orphan; Task 4's findings record it. A live "cornered inside" branch that fires it is deferred to the loud-route expansion.

- [ ] **Step 1: Write the failing test `ch2WayOut.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { lintStory, walkStateSpace, GameEngine } from '../../../engine';
import { ch2WayOut } from './ch2WayOut';

describe('ch2_wayout — The Way Out', () => {
  it('lints clean (incl. atZero-dominance, out-of-time, endsWith rules)', () => {
    expect(lintStory(ch2WayOut).errors).toEqual([]);
  });
  it('is walkable, no softlocks; only the carry-only / structural endings may be orphans', () => {
    const r = walkStateSpace(ch2WayOut);
    expect(r.capHit).toBe(false);
    expect(r.softlocks).toEqual([]);
    const allowed = new Set(['end_outfit', 'end_clean', 'end_still_inside']); // carry-only + structural default
    expect(r.orphanEndings.filter((e) => !allowed.has(e))).toEqual([]);
  });
  it('the three drive choices partition (partner gone?, loot>=3?) — exactly one available in each cell', () => {
    // build the four states at n_car by seeding defaults, then assert exactly one drive choice is available.
    const cell = (partner: string, loot: number) => {
      const s: typeof ch2WayOut = JSON.parse(JSON.stringify(ch2WayOut));
      s.variables.find((v) => v.name === 'partner_status')!.default = partner;
      s.variables.find((v) => v.name === 'loot')!.default = loot;
      s.variables.find((v) => v.name === 'got_clear')!.default = true; // stand at the car
      s.startNodeId = 'n_car';
      const g = new GameEngine(s);
      return g.view().choices.filter((c) => c.available).map((c) => c.id).sort();
    };
    expect(cell('frayed', 3)).toEqual(['c_drive_clean']);
    expect(cell('frayed', 1)).toEqual(['c_drive_light']);
    expect(cell('gone', 3)).toEqual(['c_drive_alone']);
    expect(cell('gone', 0)).toEqual(['c_drive_alone']);
  });
  it('Dawn (out-of-time) fires for a pre-drive deadline-cross, with got_clear still false', () => {
    const g = new GameEngine(ch2WayOut);
    g.start();
    // drive to n_approach_car, then dawdle past 24:50 via c_wait, never reaching the car:
    g.choose('c_to_stair'); g.choose('c_slip'); g.choose('c_leave'); g.choose('c_leave_on');
    // c_wait repeats until the deadline resolves (executor confirms the count); the ending must be Dawn:
    let v = g.view();
    for (let i = 0; i < 20 && !v.endingReached; i++) v = g.choose('c_wait');
    expect(v.endingReached?.id).toBe('end_dawn');
    expect(v.state.vars.got_clear).not.toBe(true); // never drove -> no false getaway claim
  });
  it('a carried-low Lead resolves The Outfit on entry (atZero death dominates)', () => {
    const dying: typeof ch2WayOut = JSON.parse(JSON.stringify(ch2WayOut));
    dying.resources!.find((r) => r.id === 'lead')!.start = 0;
    const g = new GameEngine(dying);
    expect(g.view().endingReached?.id).toBe('end_outfit');
  });
});
```

- [ ] **Step 2: Run it to verify it fails.**
- [ ] **Step 3: Author `ch2WayOut.ts`** per the brief (10 nodes, 6 endings, priorities, `outOfTimeEndingId`, `got_clear` on the drive, full prose to the keystones; the `n_circle` over-investment node). Adjust the `c_wait` loop count in the Dawn test to the real number once costs are fixed.
- [ ] **Step 4: Run it to verify it passes.** If `ATZERO_PRIORITY_DOMINANCE`, `OUT_OF_TIME_HAS_CONDITIONS`, or `ENDSWITH_WITH_LIVE_CHOICES` fires, fix the wiring (priorities / empty oot conditions / empty terminal choices) and re-run.
- [ ] **Step 5: Full gates** — `npx tsc --noEmit`; `npx vitest run` (un-piped) green.
- [ ] **Step 6: Commit** — `feat(countinghouse): author chapter 2 'The Way Out' (endsWith finales + Dawn + The Outfit)`

---

### Task 3: The Game wiring (`countinghouse.ts`) + the cross-chapter contracts + end-to-end

**Files:**
- Create: `src/experiments/countinghouse/content/countinghouse.ts` (exports `countinghouse: Game`)
- Create: `src/experiments/countinghouse/index.ts` (barrel: the two chapters + the game ONLY — not the container)
- Test: `src/experiments/countinghouse/content/countinghouse.test.ts`

**Interfaces:**
- Consumes: `ch1WayIn` (T1), `ch2WayOut` (T2); `Game` (type) from `../../sump-line/types`; `lintGame` from `../../sump-line/lintGame`; `GameRunner` from `../../sump-line/GameRunner`; `valuesAtEndings` from `../../sump-line/seededWalk`. **(Submodule imports — never the `../../sump-line` barrel.)**
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
(`lead` carries as a resource; `loot`/`partner_status`/the latches via `vars:'all'`. ch1 writes `loot` and `partner_status`, so `carriedRequired` is satisfied — no `CONTRACT_READ_NO_ANCESTOR_PRODUCER`.)

- [ ] **Step 1: Write the failing test `countinghouse.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { lintGame } from '../../sump-line/lintGame';
import { GameRunner } from '../../sump-line/GameRunner';
import { valuesAtEndings } from '../../sump-line/seededWalk';
import { countinghouse } from './countinghouse';

const fullTakeQuietKeep = ['c_case', 'c_case_on', 'c_quiet', 'c_quiet_on', 'c_blow', 'c_more1', 'c_more2', 'c_done', 'c_run'];

describe('The Countinghouse — the wired game', () => {
  it('lintGame is clean (incl. domains / mutex / carriedRequired / ancestor-producer)', () => {
    expect(lintGame(countinghouse).errors).toEqual([]);
  });
  it('The Lead, the take, and the partner all carry across the chapter boundary', () => {
    const g = new GameRunner(countinghouse);
    fullTakeQuietKeep.forEach((c) => g.choose(c));
    expect(g.view().chapterId).toBe('ch2_wayout');
    expect(Number(g.view().state.vars.loot)).toBeGreaterThanOrEqual(3); // the counted take carried
    expect(Number(g.view().state.vars.lead)).toBeLessThan(40);          // The Lead rebased BELOW its 40 start (carried depleted, not reset)
    expect(Number(g.view().state.vars.lead)).toBeGreaterThan(0);
    expect(g.view().state.vars.partner_status).toBe('frayed');          // the boxman's carried state
  });
  it('the clean quiet route plays end to end to Clean Away', () => {
    const g = new GameRunner(countinghouse);
    fullTakeQuietKeep.forEach((c) => g.choose(c));
    ['c_to_stair', 'c_slip', 'c_cover', 'c_dash', 'c_drive_clean'].forEach((c) => g.choose(c));
    const v = g.view();
    expect(v.gameOver).toBe(true);
    expect(v.finalEndingId).toBe('end_clean');
  });
  it('leaving the boxman yields Out, Not Whole', () => {
    const g = new GameRunner(countinghouse);
    ['c_approach', 'c_quiet', 'c_quiet_on', 'c_blow', 'c_enough1', 'c_run'].forEach((c) => g.choose(c)); // loot 1, keep moving
    ['c_to_stair', 'c_slip', 'c_leave', 'c_leave_on', 'c_dash', 'c_drive_alone'].forEach((c) => g.choose(c));
    const v = g.view();
    expect(v.gameOver).toBe(true);
    expect(v.finalEndingId).toBe('end_not_whole');
  });
  it('value-at-endings: a representative carried-in state reaches the getaway finals, Dawn, and The Outfit', () => {
    const report = valuesAtEndings(ch2WayOutWithImport(), { seed: { loot: 3, partner_status: 'frayed', made_clean: true, lead: 18 }, fields: ['lead', 'loot'] });
    const reached = new Set(report.filter((r) => r.reached).map((r) => r.endingId));
    expect(reached.has('end_clean')).toBe(true);
    expect(reached.has('end_dawn')).toBe(true);    // dawdle crosses the window
    expect(reached.has('end_outfit')).toBe(true);  // the carried-low Lead depletes to zero on a long path
  });
});

// helper: import ch2 directly for the seeded walk
import { ch2WayOut as ch2WayOutWithImport_ } from './ch2WayOut';
function ch2WayOutWithImport() { return ch2WayOutWithImport_; }
```

- [ ] **Step 2: Run it to verify it fails.**
- [ ] **Step 3: Create `countinghouse.ts`** (the `Game` above) and `index.ts` (chapters + game only). Fill the playthroughs with the real authored choice ids so every assertion is concrete. If `CONTRACT_*` fires, fix the annotation/producer wiring (not the lint).
- [ ] **Step 4: Run it to verify it passes** — `npx vitest run countinghouse` → PASS.
- [ ] **Step 5: Full gates** — `npx tsc --noEmit`; `npx vitest run` (un-piped) all green (283 prior + the new suites).
- [ ] **Step 6: Commit** — `feat(countinghouse): wire the Game + cross-chapter contracts + end-to-end playthroughs`

---

### Task 4: Hardening sweep + assessment + docs/memory

**Files:**
- Create: `src/experiments/countinghouse/harden/fuzz.test.ts` (a seeded random-walk sweep over the wired game)
- Create: `src/experiments/countinghouse/FINDINGS.md`
- Modify: `CHANGELOG.md`, `NextSteps.md`
- Modify (memory, gitignored): `…\memory\cave-experiment.md` + `MEMORY.md`

**Brief.** A coherence sweep mirroring the cave's `harden/fuzz.test.ts`: drive the `GameRunner` over many index-seeded choice-sequences (no `Math.random` — derive from the index) and assert no incoherence.

- [ ] **Step 1: Write `harden/fuzz.test.ts`** — N index-seeded playthroughs, each asserting: `gameOver` within the transition cap; `finalEndingId` ∈ the six; **a getaway ending implies you actually DROVE** — i.e. `finalEndingId ∈ {end_clean,end_lighter,end_not_whole}` ⇒ the terminal node reached is one of `n_end_clean/lighter/not_whole` (capture `view().node.id` at game over) AND `state.vars.got_clear === true` AND `state.vars.lead_blown !== true`; `end_clean` ⇒ `loot ≥ 3 && partner_status !== 'gone'`; `end_not_whole` ⇒ `partner_status === 'gone'`; `end_dawn`/`end_outfit` ⇒ `got_clear !== true`. (The node-id check is what catches the `got_clear`-at-hub class the team flagged — a state-only assertion would not.)
- [ ] **Step 2: Run it** — `npx vitest run countinghouse/harden` → PASS. Any incoherence is a **content** bug — fix the chapter, not the test.
- [ ] **Step 3: Write `FINDINGS.md`** — record: (a) the four features exercised, with the node/ending proving each, **and the honest caveats**: `charges` is a `has_item` demonstrator (start 1 / max 2 / spend 1) — the *counted* showcase is `loot` (the grab chain + `≥3` gate); `endsWith` is a clean authoring affordance (distinct terminal nodes for distinct prose) but the same play would resolve identically via the cave's priority-conditioned pattern — it is a demonstration, not a fiction that *requires* the feature. (b) **`end_still_inside` is a structural orphan** (the mandatory default; unreachable in the slice). (c) **The container-promotion finding — DO THIS NEXT:** two games now consume the container from `src/experiments/sump-line/`; promote it to a shared `src/container/` (move the container modules, leave the cave content behind, repoint both games' imports, keep 283+ tests green) as the immediate next refactor, before a third consumer entrenches the coupling. (d) any authoring friction worth an engine/container note.
- [ ] **Step 4: Update `CHANGELOG.md` + `NextSteps.md`** — the Countinghouse slice shipped (first content on the v1.4 features), the two chapters + showcase mapping, and the deferred items (loud-route expansion, the remaining two chapters, the container promotion, WS-G front-end).
- [ ] **Step 5: Update memory** — `cave-experiment.md`: dated entry (Countinghouse slice built + feature showcase + test count); refresh the resume pointer. `MEMORY.md`: refresh the index hook.
- [ ] **Step 6: Full gates + commit** — `npx tsc --noEmit`; `npx vitest run` (un-piped) green; `git add` the new/changed repo files; `git commit -m "test(countinghouse): coherence fuzz sweep + findings + docs"`. (Memory files are gitignored — not committed.)

---

### Task 5: Playable HTML harness (so Matthew can run the job himself)

**Files:**
- Create: `src/experiments/countinghouse/play/main.tsx` (adapt the cave's game-agnostic reader UI, repointed to `countinghouse`)
- Create: `src/experiments/countinghouse/play/index.html`
- Create: `src/experiments/countinghouse/play/vite.config.ts` (single-file inlined build via `vite-plugin-singlefile`)
- Test: `src/experiments/countinghouse/play/main.test.ts`

**Goal:** a self-contained, double-clickable `countinghouse.html` running the REAL `GameRunner` over `countinghouse` — node prose (with `{{time}}` substituted), available choices as buttons, a status strip (chapter title, **The Lead** meter, **The Take** count, the clock), and the ending screen. No engine re-implementation — it imports `GameRunner` + `countinghouse`. The cave's `play/main.tsx` is already game-agnostic; this is a repoint + a meter/label swap, not a rebuild.

- [ ] **Step 1: Adapt the reader UI** — copy the cave's `src/experiments/sump-line/play/main.tsx` as the base; import `GameRunner` (submodule) + `countinghouse`; render `view().node.body` with `{{time}}`→`view().timeLabel`; render available choices as buttons; show the meters from `view().state.vars.lead` (label "Lead") and `view().state.vars.loot` (label "The Take"); on `view().gameOver` show `view().endingReached`.
- [ ] **Step 2: Single-file build** — a `vite.config.ts` rooted at `play/` using the existing `vite-plugin-singlefile`; an npm script `build:countinghouse` → outputs `dist-countinghouse/index.html`.
- [ ] **Step 3: Build it** — `npm run build:countinghouse`; copy the output to repo root as `countinghouse.html`.
- [ ] **Step 4: Smoke test** `main.test.ts` — mount `main.tsx`, play one path (the quiet clean route) via clicks, assert an ending renders (proves the harness wiring without a browser).
- [ ] **Step 5: Full gates** — `npx tsc --noEmit`; `npx vitest run` (un-piped) green; `npx vite build` (the main app still builds).
- [ ] **Step 6: Commit** — `feat(countinghouse): self-contained playable HTML harness`; then **open the folder with `countinghouse.html` selected** for Matthew to double-click and play.

---

## Self-Review

- **Spec coverage** (vs `2026-06-27-heist-arc-design.md`): world/voice/keystones → Global Constraints + T1–T2 prose; the four-phase spine → ch1 (Way In + Floor + Box, T1) + ch2 (Way Out, T2); The Lead + `adjust_resource` → T1 resource + Lead-buy/cost; counted inventory → T1 items + the grab chain; node-named finales → T2 `endsWith` terminals; Dawn → T2 `outOfTimeEndingId`; The Outfit → T2 atZero + priority 2; the carried contract → T3 Game; the playable proof → T5; the verification bar → T1–T4. ✓
- **Team-review fixes folded in:** got_clear→drive-away (honesty leak, T2); distinct-node grab chain + recalibrated windows + the self-loop/`maxTime` rule (calibration trap, Global + T1/T2); ch2 standalone `made_clean` default true (softlock, T2); `end_still_inside` neutral + orphan-documented (T2/T4); real disjointness test + explicit Dawn/Outfit assertions + node-id fuzz invariant (test validity, T2/T3/T4); submodule imports (coupling, Global/T3); neutral ch1-ending prose (honesty, T1); keystones added to the spec; playable harness (T5). Matthew's decisions: full take affordable-but-costly (ch1 window 70 carries the 60-min full-take win); frayed=clean (getaway prose to a rattled partner; `not_equals 'gone'` gate). ✓
- **Type consistency:** `Game`/`Story`/`Condition`/`Effect`/`Resource`/`VariableDef` are the engine/container types; `countinghouse.chapters[].story` consume `ch1WayIn`/`ch2WayOut`; the carried surface (`lead` resource; `loot`/`partner_status`/`made_clean`/`alarm_tripped`/`charges`/`lead_blown` vars) is declared in BOTH chapters with matching types (only `made_clean`'s default differs — `false` in ch1, `true` standalone in ch2, the deliberate walkability trick, mirroring the cave's `companion_status`); `got_clear` is ch2-local; `end_outfit` matches the resource `atZero.ending` and a declared ending. ✓
- **Placeholder note:** the playthrough id-sequences and the `c_wait` loop count are completed against the real authored ids/costs in each task's Step 3 — intrinsic to content authoring, not a placeholder gap. `body:'<voice>'`/`<keystone>` denotes "author the prose to the locked voice/keystone," the established structure-in-plan / prose-in-execution split.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-27-countinghouse-slice-build.md` (revision 2, post team gut-check).
