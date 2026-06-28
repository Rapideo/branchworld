# The Countinghouse — The Loud Route — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended — single consistent authorial voice) or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Author the heist's **loud route** as a genuinely distinct, fuller path (a reactive loud Floor in ch1 + a hot-dock confrontation in ch2), reconverging with the shared spine — delivering the arc's route-exclusive replay hook.

**Architecture:** Pure content edits to the two existing chapter `Story` files under `src/experiments/countinghouse/content/`. ~5 new nodes + two re-pointed choices + one route-neutral prose tweak; the shared spine (Box → grab → turn → commit → car → finales) and the carried contract are untouched. Validation reuses the engine's `lintStory`/`walkStateSpace`, the container's `lintGame` + `GameRunner`, and the existing coherence fuzz. **Zero engine change.**

**Tech Stack:** TypeScript 5, Vitest 2, the shipped engine + container + counted inventory + the profile framework (`countinghouse` declares `profile: TIME_PRESSURE_SURVIVAL`).

## Global Constraints

- **Pure content, zero engine change.** No edits under `src/engine/` or `src/container/`. Only the two chapter files + the existing test/fuzz files + the rebuilt `countinghouse.html`.
- **Voice (locked):** 1970s, cold, literary, procedural, restrained; the mob is *procedure, not menace*. Match the existing chapter prose exactly (it is the calibration).
- **Time/EE-1:** node prose carries NO clock numerals — `{{time}}` token or relative phrasing.
- **The shared spine stays shared:** the loud route reconverges at the existing `n_box` (ch1) and `n_approach_car` / `n_leave`-equivalent (ch2). The endings, the carried contract (`lead`/`loot`/`partner_status`/the latches), and `got_clear` honesty are unchanged.
- **Latch hygiene:** `partner_status` is read by the finale endings, so set it ONLY in a node `entryEffect`, never a choice effect (avoids `LATCH_IN_CHOICE_EFFECT`).
- **The Lead is time-driven** — change it only via `adjust_resource` (a direct write errors `RESOURCE_TIME_DRIVEN_WRITTEN`).
- **Clocks unchanged:** ch1 window 70 (`23:00`→`24:10`), ch2 window 50 (`23:55`→`24:45`). The loud nodes keep `minPath ≤ window ≤ maxPath(simple)`; verify with the walker, do not change a deadline unless a lint forces it.
- TDD. Every task ends `npx vitest run` green (**un-piped**) + `npx tsc --noEmit` clean + a Conventional-Commits commit. **The existing 326 tests stay green. Nothing is pushed.**

---

### Task 1: ch1 — the reactive loud Floor + the route-neutral turn

**Files:**
- Modify: `src/experiments/countinghouse/content/ch1WayIn.ts`
- Test: `src/experiments/countinghouse/content/ch1WayIn.test.ts`

**Authoring brief.** Today `n_floor_loud` (sets `alarm_tripped`, `−12` Lead) goes straight to the shared `n_box`. Insert a 2-beat loud sequence and make the turn route-neutral:

- **Re-point `n_floor_loud`'s choice:** `c_loud_on` destination `n_box` → **`n_floor_loud_react`** (keep `+5` min).
- **NEW `n_floor_loud_react`** (scene, `count_floor`): the building reacting — the count-crew stirred *by the alarm*, descending early; the boxman already moving. Choices:
  - `c_charge` → `n_box` (`+5` min; `{field:'lead',op:'adjust_resource',value:'-8'}` — push straight for the box, spend the margin).
  - `c_relay_late` → `n_floor_relay` (`+10` min — try to kill the relay late, under fire).
- **NEW `n_floor_relay`** (scene, `count_floor`): the relay-cut under fire — buys back margin but the crew is closer. Choice:
  - `c_relay_on` → `n_box` (`+5` min; `{field:'lead',op:'adjust_resource',value:'12'}` — relay killed, some Lead bought back).
- Both loud beats reconverge at the shared `n_box`. The quiet `n_floor_quiet` is untouched.
- **`n_turn` — route-neutral prose (no new node, same effects):** rewrite the lines that read as a quiet-route surprise (currently *"The count-crew. Early. Nobody is early in this business…"* and *"They don't come back till four"*) so the "they're on the stairs now" beat fits BOTH entries — the alarm *called* them (loud) or they *came back early* (quiet). Keep the `entryEffects` (`partner_status='frayed'`, `clue_crew_early`) and the `c_run` choice exactly.

**Calibration note:** the loud route is FASTER than the casing-quiet path but spends Lead. A minimal loud-charge ch1 run ≈ 35 min (< 70); the longest simple path (casing + `c_relay_late` + `c_work` + full grab) ≈ 80 min (≥ 70) so `CLOCK_CANNOT_BITE` still passes. Verify; expect no deadline change.

- [ ] **Step 1: Write the failing test additions** to `src/experiments/countinghouse/content/ch1WayIn.test.ts`:

```ts
import { GameEngine } from '../../../engine'; // (already imported at top of the file)
describe('ch1_wayin — the loud Floor', () => {
  it('still lints clean and walks with no softlocks after the loud expansion', () => {
    const r = walkStateSpace(ch1WayIn, { cap: 80000 });
    expect(lintStory(ch1WayIn).errors).toEqual([]);
    expect(r.capHit).toBe(false);
    expect(r.softlocks).toEqual([]);
  });
  it('the loud Floor reconverges at the box and spends Lead on the charge', () => {
    const loud = new GameEngine(ch1WayIn); loud.start();
    ['c_approach', 'c_loud', 'c_loud_on'].forEach((c) => loud.choose(c)); // -> n_floor_loud_react
    expect(loud.view().node.id).toBe('n_floor_loud_react');
    const afterCharge = loud.choose('c_charge'); // -> n_box
    expect(afterCharge.node.id).toBe('n_box');
    // the loud-charge run holds LESS Lead than the quiet relay-cut run at the box
    const quiet = new GameEngine(ch1WayIn); quiet.start();
    ['c_approach', 'c_quiet', 'c_quiet_on'].forEach((c) => quiet.choose(c)); // quiet -> n_box (buys +10)
    expect(Number(afterCharge.state.vars.lead)).toBeLessThan(Number(quiet.view().state.vars.lead));
  });
  it('the relay-late beat buys Lead back relative to the charge', () => {
    const charge = new GameEngine(ch1WayIn); charge.start();
    ['c_approach', 'c_loud', 'c_loud_on', 'c_charge'].forEach((c) => charge.choose(c));
    const relay = new GameEngine(ch1WayIn); relay.start();
    ['c_approach', 'c_loud', 'c_loud_on', 'c_relay_late', 'c_relay_on'].forEach((c) => relay.choose(c));
    expect(Number(relay.view().state.vars.lead)).toBeGreaterThan(Number(charge.view().state.vars.lead));
  });
});
```

- [ ] **Step 2: Run it to verify it fails** — `npx vitest run ch1WayIn` → FAIL (`c_loud_on` still lands on `n_box`; `n_floor_loud_react` missing).
- [ ] **Step 3: Author the ch1 edits** — add `n_floor_loud_react` + `n_floor_relay` (full prose in the voice), re-point `c_loud_on`, and rewrite `n_turn`'s prose route-neutral. Use the exact ids above.
- [ ] **Step 4: Run it to verify it passes** — `npx vitest run ch1WayIn` → PASS. If `CLOCK_CANNOT_BITE`/`DEADLINE_UNWINNABLE` fires, adjust loud time costs and re-run (do not silence the test).
- [ ] **Step 5: Full gates** — `npx tsc --noEmit`; `npx vitest run` (un-piped) all green.
- [ ] **Step 6: Commit** — `feat(countinghouse): ch1 reactive loud Floor + route-neutral turn`

---

### Task 2: ch2 — the hot-dock loud escape

**Files:**
- Modify: `src/experiments/countinghouse/content/ch2WayOut.ts`
- Test: `src/experiments/countinghouse/content/ch2WayOut.test.ts`

**Authoring brief.** Today `n_stair`'s `c_force` (gated `alarm_tripped is_true`) goes to the cold dock `n_lot` (the count-crew man oblivious). Route the loud escape through its own hot dock:

- **Re-point `n_stair`'s `c_force`:** destination `n_lot` → **`n_corridor_loud`** (keep `+5` min, the `−10` Lead adjust). The quiet `c_slip` → `n_lot` is untouched.
- **NEW `n_corridor_loud`** (scene, `stairwell` or a new `corridor` location): forcing the corridor with the alarm ringing and the building awake behind you. Choice:
  - `c_corridor_on` → `n_dock_hot` (`+5` min).
- **NEW `n_dock_hot`** (scene, `loading_dock`): the count-crew man *alert, facing you, gun out* — the hot mirror of `n_lot`. Choices:
  - `c_cover_hot` → `n_approach_car` (`+15` min; `{field:'lead',op:'adjust_resource',value:'-5'}` — cover the boxman with a gun on you).
  - `c_leave_hot` → `n_leave_hot` (`+5` min).
- **NEW `n_leave_hot`** (scene, `loading_dock`): the loud abandon — the man already on you, you go alone. `entryEffects` set `{field:'partner_status',op:'set',value:'gone'}` (in the ENTRY, not the choice — latch hygiene), loud prose. Choice:
  - `c_leave_hot_on` → `n_approach_car` (`+5` min).
- Both hot-dock outcomes reconverge at the shared `n_approach_car`; the abandon sets `partner_status='gone'` exactly as the cold `n_leave` does, so the finales resolve unchanged.

**Calibration note:** the loud escape's longest simple path (≈ `c_force`+`c_corridor_on`+`c_cover_hot`+`c_circle`+drive) ≈ the existing 60-min `maxPath`, so window 50 still bites; the minimal loud run (~40) wins. Verify with the walker.

- [ ] **Step 1: Write the failing test additions** to `src/experiments/countinghouse/content/ch2WayOut.test.ts`:

```ts
describe('ch2_wayout — the hot-dock loud escape', () => {
  it('still lints clean and walks with no new softlocks; allowed orphans unchanged', () => {
    const r = walkStateSpace(ch2WayOut, { cap: 80000 });
    expect(lintStory(ch2WayOut).errors).toEqual([]);
    expect(r.softlocks).toEqual([]);
    const allowed = new Set(['end_outfit', 'end_clean', 'end_still_inside']);
    expect(r.orphanEndings.filter((e) => !allowed.has(e))).toEqual([]);
  });
  it('the loud escape routes through the hot dock; covering keeps the partner', () => {
    // seed a carried-in loud state: alarm_tripped, partner frayed, loot 3, healthy Lead
    const s: typeof ch2WayOut = JSON.parse(JSON.stringify(ch2WayOut));
    s.variables.find((v) => v.name === 'alarm_tripped')!.default = true;
    s.variables.find((v) => v.name === 'made_clean')!.default = false;
    s.variables.find((v) => v.name === 'partner_status')!.default = 'frayed';
    s.variables.find((v) => v.name === 'loot')!.default = 3;
    s.resources!.find((r) => r.id === 'lead')!.start = 40;
    const g = new GameEngine(s); g.start();
    g.choose('c_to_stair'); g.choose('c_force');
    expect(g.view().node.id).toBe('n_corridor_loud');
    g.choose('c_corridor_on');
    expect(g.view().node.id).toBe('n_dock_hot');
    g.choose('c_cover_hot'); g.choose('c_dash');
    const v = g.choose('c_drive_clean');
    expect(v.endingReached?.id).toBe('end_clean'); // partner kept, full take
  });
  it('leaving the boxman at the hot dock sets partner gone -> Out, Not Whole', () => {
    const s: typeof ch2WayOut = JSON.parse(JSON.stringify(ch2WayOut));
    s.variables.find((v) => v.name === 'alarm_tripped')!.default = true;
    s.variables.find((v) => v.name === 'made_clean')!.default = false;
    s.resources!.find((r) => r.id === 'lead')!.start = 40;
    const g = new GameEngine(s); g.start();
    ['c_to_stair', 'c_force', 'c_corridor_on', 'c_leave_hot', 'c_leave_hot_on', 'c_dash'].forEach((c) => g.choose(c));
    expect(g.view().state.vars.partner_status).toBe('gone');
    const v = g.choose('c_drive_alone');
    expect(v.endingReached?.id).toBe('end_not_whole');
  });
});
```

- [ ] **Step 2: Run it to verify it fails** — `npx vitest run ch2WayOut` → FAIL (`c_force` still lands on `n_lot`).
- [ ] **Step 3: Author the ch2 edits** — add `n_corridor_loud`, `n_dock_hot`, `n_leave_hot` (full prose), re-point `c_force`. Use the exact ids above; declare any new `corridor` location in `locations` if used.
- [ ] **Step 4: Run it to verify it passes** — `npx vitest run ch2WayOut` → PASS. Fix any `CLOCK_CANNOT_BITE`/softlock by adjusting loud costs and re-run.
- [ ] **Step 5: Full gates** — `npx tsc --noEmit`; `npx vitest run` (un-piped) all green.
- [ ] **Step 6: Commit** — `feat(countinghouse): ch2 hot-dock loud escape`

---

### Task 3: end-to-end + the loud Lead-pressure + redeploy

**Files:**
- Modify: `src/experiments/countinghouse/content/countinghouse.test.ts`
- (the fuzz `src/experiments/countinghouse/harden/fuzz.test.ts` auto-covers the new nodes — confirm it stays green; no edit expected)
- Rebuild: `countinghouse.html` (+ redeploy)

- [ ] **Step 1: Write the failing test additions** to `src/experiments/countinghouse/content/countinghouse.test.ts`:

```ts
it('the loud route plays end to end (loud entry -> hot dock -> a getaway finale)', () => {
  const g = new GameRunner(countinghouse);
  // ch1 loud: skip casing, loud entry, charge to the box, full take, run
  ['c_approach', 'c_loud', 'c_loud_on', 'c_relay_late', 'c_relay_on', 'c_blow', 'c_more1', 'c_more2', 'c_done', 'c_run'].forEach((c) => g.choose(c));
  expect(g.view().chapterId).toBe('ch2_wayout');
  expect(g.view().state.vars.alarm_tripped).toBe(true); // the loud latch carried
  // ch2 loud: force the corridor, hot dock, cover, dash, drive
  ['c_to_stair', 'c_force', 'c_corridor_on', 'c_cover_hot', 'c_dash', 'c_drive_clean'].forEach((c) => g.choose(c));
  const v = g.view();
  expect(v.gameOver).toBe(true);
  expect(['end_clean', 'end_lighter', 'end_outfit', 'end_dawn']).toContain(v.finalEndingId);
});
it('a loud, charge-then-force run trends to The Outfit (Lead pressure)', () => {
  const g = new GameRunner(countinghouse);
  // loud entry + charge (no relay buy-back) + full take burns the Lead; force in ch2 burns the rest
  ['c_approach', 'c_loud', 'c_loud_on', 'c_charge', 'c_work', 'c_more1', 'c_more2', 'c_done', 'c_run'].forEach((c) => g.choose(c));
  ['c_to_stair', 'c_force', 'c_corridor_on', 'c_cover_hot'].forEach((c) => g.choose(c));
  // by here the carried-low Lead has depleted to zero -> The Outfit (executor confirms the exact beat)
  expect(g.view().finalEndingId).toBe('end_outfit');
});
```

- [ ] **Step 2: Run it to verify it fails.**
- [ ] **Step 3: Make it pass** — fill the loud playthrough ids against the authored content; if the `end_outfit` trend test doesn't fire, tune the loud Lead costs (Task 1/2 `adjust_resource` magnitudes) so a charge-heavy loud run depletes the Lead to zero by the hot dock, and re-run. Confirm `lintGame(countinghouse).errors` stays `[]` (the `alarm_tripped`/`made_clean` mutex now has live loud reads).
- [ ] **Step 4: Run the fuzz** — `npx vitest run countinghouse/harden` → green (every loud path ends honestly; the ending spread now shows more outfit/not_whole). If any incoherence, fix the content.
- [ ] **Step 5: Full gates + rebuild** — `npx tsc --noEmit`; `npx vitest run` (un-piped) all green; `npm run build:countinghouse` (rebuild `countinghouse.html`).
- [ ] **Step 6: Commit** — `feat(countinghouse): loud-route end-to-end + Lead-pressure tests; rebuild playable`. Then redeploy: `node src/experiments/countinghouse/play/build.mjs` is already run by Step 5; deploy with the memory's `countinghouse-player` command (`netlify deploy --prod --no-build --dir=<tmp> --site c88a0696-ec51-4c6b-8dae-3ee32fd6f467`).

---

## Self-Review

- **Spec coverage:** ch1 reactive loud Floor (`n_floor_loud_react`/`n_floor_relay`, charge vs relay-late) → T1; route-neutral turn → T1; ch2 hot dock (`n_corridor_loud`/`n_dock_hot`/`n_leave_hot`, alert man, cover vs leave under fire) → T2; the loud route trends to The Outfit (Lead pressure) + the mutex's loud arm live → T3; lint/walker/fuzz clean + redeploy → T1–T3. No new finale (reuses the shipped ending set). ✓
- **Placeholder note:** the T3 playthrough ids + the `end_outfit`-trend tuning are completed against the authored content in T3 Step 3 (intrinsic to content authoring). Loud node bodies are authored to the locked voice during execution — the established structure-in-plan / prose-in-execution split.
- **Type consistency:** all new nodes are `StoryNode`s on the existing `ch1WayIn`/`ch2WayOut` `Story` objects; reuse the existing vars/items/resource (`alarm_tripped`/`made_clean`/`partner_status`/`lead`/`loot`/`got_clear`) — no new declarations. `partner_status='gone'` is set in `n_leave_hot.entryEffects` (latch hygiene, mirroring `n_leave`). The shared reconvergence targets (`n_box`, `n_approach_car`, the finale nodes) are unchanged.
- **Honesty preserved:** the loud route reconverges at the shared `n_car`/`n_end_*`, so `got_clear` is still set on the drive-away — no new honesty seam; the fuzz (T3) is the catch-net.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-28-heist-loud-route.md`.
