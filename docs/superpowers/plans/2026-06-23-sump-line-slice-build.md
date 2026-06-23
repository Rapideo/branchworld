# The Sump Line — 3-Chapter Slice — Build (E2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended for this content build — single consistent authorial voice) or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Author the approved 3-chapter "The Sump Line" cave-survival slice as real typed `Story` chapters wired into a `Game` on the (merged) container, lint-clean and walker-verified, then ship a self-contained playable HTML so Matthew can climb out of the cave himself.

**Architecture:** Each chapter is a typed engine `Story` under `src/experiments/sump-line/content/`. A `Game` (`sumpLine.ts`) wires the three chapters with branch-by-`cave_route` transitions and the carry contract. Validation reuses the engine's `lintStory`/`walkStateSpace` per chapter and the container's `lintGame` + `GameRunner` across chapters. A small build step inlines the real `GameRunner` + game into one double-clickable HTML — no engine re-implementation.

**Tech Stack:** TypeScript 5, Vitest 2, the FROZEN engine v1.3 + the merged container. Vite for the playable-HTML bundle.

## Global Constraints

- **Engine FROZEN** — no changes under `src/engine/`. The container under `src/experiments/sump-line/` is also done; this plan only ADDS content under `src/experiments/sump-line/content/` and one player-harness file. If authoring seems to need an engine/container change, STOP and log it as a finding in `ENGINE-ASSESSMENT.md`.
- **Authoring source-of-truth:** `docs/sump-line-slice-design.md` — every chapter's node outline, prose intent, keystone prose, endings, transitions, and the build punch-list. Author prose by EXTENDING the locked voice (cold, restrained, literary, indifferent cave, sparse dialogue) across all nodes; the keystones are the calibration. Translate the design's plain-English conditions/effects into the engine's typed `Condition`/`Effect` form.
- **Locked taste calls (do not drift):** two-chapter branch (dry high / flooded sump); one companion (Rolly); cold/restrained/literary tone; death + sealed-in endings are reachable but earned.
- **Time/EE-1:** node prose carries NO clock numerals — use the literal `{{time}}` token or relative phrasing.
- **The 6 punch-list fixes are REQUIRED** (see `docs/sump-line-slice-design.md` "BUILD PUNCH-LIST"); each is assigned to a task below.
- Tests co-located. Every task ends `npx vitest run` green + a Conventional-Commits commit. The existing 185 tests stay green.

---

### Task 1: Chapter 1 — "The Pulse" (`ch1_descent`)

**Files:**
- Create: `src/experiments/sump-line/content/ch1Descent.ts` (exports `ch1Descent: Story`)
- Test: `src/experiments/sump-line/content/ch1Descent.test.ts`

**Interfaces:**
- Consumes: `Story`, `lintStory`, `walkStateSpace`, `GameEngine` from `../../../engine`.
- Produces: `ch1Descent: Story` (id `ch1_descent`, 11 nodes per the design).

**Authoring brief:** author all 11 nodes of `ch1_descent` from `docs/sump-line-slice-design.md` (its node outline + prose intents + the `n_drop` / `n_seal_present` / `n_choke_hub` keystones), full prose in the locked voice. Declare the carried resources `lamp_charge` (0..100, start 100, depletion 12/5, atZero `{ending: <ch1 dark ending>, setFlag: 'cave_dark_out'}`) and `body_heat` (0..100, start 100, depletion 20/5, atZero `{setFlag: 'cave_hypothermic'}`), the chapter-local `flood_water` (0..3, **start 0** — punch-list), and the carried vars (`cave_route` default `'sump'`, `companion_status` default `'hurt'`, and the latching booleans). The scheduled event `ev_sump_seal` (present/absent/recovery) per design.

**Punch-list fixes in this task:** (a) **CLOCK** — tighten `ch1_descent` so the longest reachable path ≥ its deadline window (shorten the deadline to `14:25` OR add +5 min of choice cost on the longest path; verify with the linter). (b) **change_location** on every node. (c) Latching booleans set ONLY by unconditional `entryEffect`s on destination nodes (no conditional effects). (d) `flood_water` start 0.

- [ ] **Step 1: Write the failing test `ch1Descent.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { lintStory, walkStateSpace, GameEngine } from '../../../engine';
import { ch1Descent } from './ch1Descent';

describe('ch1_descent', () => {
  it('lints clean (no errors)', () => {
    expect(lintStory(ch1Descent).errors).toEqual([]);
  });
  it('the clock can bite and the chapter is walkable with no softlocks', () => {
    const r = walkStateSpace(ch1Descent);
    expect(r.capHit).toBe(false);
    expect(r.softlocks).toEqual([]);
  });
  it('reaches both fork outcomes: cave_route high and sump', () => {
    const routes = new Set<string>();
    const r = walkStateSpace(ch1Descent);
    // every reachable ending sets cave_route; assert both 'high' and 'sump' are achievable
    // (drive two explicit playthroughs)
    const high = new GameEngine(ch1Descent);
    // NOTE: choice ids come from the authored chapter; this asserts the high route ends with cave_route==='high'
    expect(typeof high.start().node.id).toBe('string');
    expect(r.orphanEndings.filter((e) => !e.startsWith('end_dark')).length).toBe(0); // only dark endings may be orphans (carry-only)
  });
});
```

- [ ] **Step 2: Run it to verify it fails** — `npx vitest run ch1Descent` → FAIL (module missing).
- [ ] **Step 3: Author `ch1Descent.ts`** — the full typed `Story` per the brief above (11 nodes, prose + wiring + the 4 fixes). Then add explicit playthrough assertions to the test for the high route (ends `cave_route==='high'`) and the sump route (default), using the real choice ids you authored.
- [ ] **Step 4: Run it to verify it passes** — `npx vitest run ch1Descent` → PASS. If `CLOCK_CANNOT_BITE` appears, adjust the deadline/costs and re-run (do not silence the test).
- [ ] **Step 5: Full suite** — `npx vitest run` → all green.
- [ ] **Step 6: Commit** — `git add src/experiments/sump-line/content/ch1Descent.* && git commit -m "feat(sump-line): author chapter 1 'The Pulse'"`

---

### Task 2: Chapter 2A — "The Dry High Traverse" (`ch2_high`)

**Files:**
- Create: `src/experiments/sump-line/content/ch2High.ts` (exports `ch2High: Story`)
- Test: `src/experiments/sump-line/content/ch2High.test.ts`

**Interfaces:** Produces `ch2High: Story` (id `ch2_high`, 6 nodes, a game-ending chapter, 4 endings, event `ev_second_pulse`).

**Authoring brief:** author the 6 nodes from the design (outline + `n_h_start` / `n_pulse_present` / `n_crystal_hub` keystones), voice-consistent. Re-declare `lamp_charge` and `body_heat` with this chapter's depletion (**lamp 12/5, body_heat 20/5** — punch-list low item; same 0..100 bounds as the carry so the container's start-rebase doesn't clamp). The 4 endings honestly gated by latching booleans (`cave_all_together` → *Daylight, All Three*; `cave_someone_lost` → *Out, But Not Whole*; `cave_dark_out` → *The Cave Keeps You*; default → *A Grey Way Out*), plus a mandatory default. The second-pulse event present/absent/recovery.

**Punch-list fixes:** **ending PRIORITIES** — `end_dark_high` priority 2; `end_out_not_whole` priority 1; togetherness/grey 0 (so a lamp-death dominates an overlap). Concrete depletion rates. Clock bites (its window 70; longest path must be ≥ 70 — design says it already is).

- [ ] **Step 1: Write the failing test** (mirror Task 1's shape):

```ts
import { describe, it, expect } from 'vitest';
import { lintStory, walkStateSpace } from '../../../engine';
import { ch2High } from './ch2High';

describe('ch2_high', () => {
  it('lints clean', () => { expect(lintStory(ch2High).errors).toEqual([]); });
  it('walkable, no softlocks; only dark endings may be orphans (carry-only)', () => {
    const r = walkStateSpace(ch2High);
    expect(r.capHit).toBe(false);
    expect(r.softlocks).toEqual([]);
    expect(r.orphanEndings.filter((e) => !e.startsWith('end_dark')).length).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails.**
- [ ] **Step 3: Author `ch2High.ts`** per the brief (6 nodes, 4 endings + default, priorities, depletion, event).
- [ ] **Step 4: Run it to verify it passes.**
- [ ] **Step 5: Full suite green.**
- [ ] **Step 6: Commit** — `feat(sump-line): author chapter 2A 'The Dry High Traverse'`

---

### Task 3: Chapter 2B — "The Flooded Sump Crawl" (`ch2_sump`)

**Files:**
- Create: `src/experiments/sump-line/content/ch2Sump.ts` (exports `ch2Sump: Story`)
- Test: `src/experiments/sump-line/content/ch2Sump.test.ts`

**Interfaces:** Produces `ch2Sump: Story` (id `ch2_sump`, 7 nodes, game-ending, 4 endings, event `ev_water_drops`).

**Authoring brief:** author the 7 nodes from the design (outline + `n_s_start` / `n_drop_present` / `n_gravel_hub` keystones), voice-consistent. Re-declare `lamp_charge` (12/5) and `body_heat` (**15/5 — wet route burns faster**). Chapter-local `air_gulps` (0..3, **start 3** — punch-list), `rope_pitches` if used (0..2, **start 2**). Endings: *Behind the Sump* (`cave_sump_sealed`), *A Grey Way Out* (default), *The Cave Keeps You* (`cave_dark_out`), plus the crossing-success ending. Mandatory default.

**Punch-list fixes:** (a) **EE-4 DIVE GATE** — the "you got through into free air" node (`n_dive`) must be UNREACHABLE once `cave_sump_sealed` is true: add `cave_sump_sealed is_false` to the dive choices (`c_crawl_dive`, `c_drop_dive`, `c_g_try`), or route the sealed case to the resolve hub. Verify no path reaches `n_dive` with `cave_sump_sealed===true`. (b) `air_gulps` start 3, `rope_pitches` start 2. (c) ending PRIORITIES (dark=2, behind_sump=1, grey=0). (d) Depletion rates.

- [ ] **Step 1: Write the failing test** (mirror Task 2) PLUS an explicit EE-4 guard:

```ts
import { describe, it, expect } from 'vitest';
import { lintStory, walkStateSpace } from '../../../engine';
import { ch2Sump } from './ch2Sump';

describe('ch2_sump', () => {
  it('lints clean', () => { expect(lintStory(ch2Sump).errors).toEqual([]); });
  it('walkable, no softlocks; only dark endings may be orphans', () => {
    const r = walkStateSpace(ch2Sump);
    expect(r.capHit).toBe(false);
    expect(r.softlocks).toEqual([]);
    expect(r.orphanEndings.filter((e) => !e.startsWith('end_dark')).length).toBe(0);
  });
  it('the crossing-success node is never reached once the sump is sealed (EE-4)', () => {
    // n_dive must be gated on cave_sump_sealed is_false; assert no walked state sits at n_dive with cave_sump_sealed true
    const r = walkStateSpace(ch2Sump);
    expect(r.capHit).toBe(false); // sentinel; the real assertion is authored against the walk's reached states
  });
});
```

- [ ] **Step 2-6:** fail → author `ch2Sump.ts` (apply all 4 fixes) → pass → full suite green → commit `feat(sump-line): author chapter 2B 'The Flooded Sump Crawl'`.

---

### Task 4: The Game wiring (`sumpLine.ts`) + end-to-end playthroughs

**Files:**
- Create: `src/experiments/sump-line/content/sumpLine.ts` (exports `sumpLine: Game`)
- Test: `src/experiments/sump-line/content/sumpLine.test.ts`

**Interfaces:**
- Consumes: `ch1Descent`/`ch2High`/`ch2Sump` (Tasks 1-3); `Game`/`lintGame`/`GameRunner` from `..` (the container barrel `../index` / `../lintGame` / `../GameRunner`).
- Produces: `sumpLine: Game` — `{ id:'sump_line', title:'The Sump Line', startChapterId:'ch1_descent', chapters:[{id:'ch1_descent', story:ch1Descent, transitions:[{when:{conditions:[{field:'cave_route',op:'equals',value:'high'}]},goTo:'ch2_high'},{when:{},goTo:'ch2_sump'}]},{id:'ch2_high', story:ch2High, gameEnding:true, transitions:[]},{id:'ch2_sump', story:ch2Sump, gameEnding:true, transitions:[]}], carry:{vars:'all', resources:['lamp_charge','body_heat'], clues:true, inventory:true}, gameDeadlineMinutes:360 }`.

- [ ] **Step 1: Write the failing test `sumpLine.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { lintGame, GameRunner } from '..';
import { sumpLine } from './sumpLine';

describe('sumpLine game', () => {
  it('lintGame is clean', () => {
    const r = lintGame(sumpLine);
    expect(r.errors).toEqual([]);
  });
  it('the high route plays end to end to a game ending', () => {
    const g = new GameRunner(sumpLine);
    // drive ch1 choices that set cave_route='high', then the branch chapter to a game ending
    // (choice ids from the authored chapters)
    expect(g.view().chapterId).toBe('ch1_descent');
    // ...choices... -> expect a ch2_high game ending
  });
  it('the sump route plays end to end to a game ending', () => {
    const g = new GameRunner(sumpLine);
    expect(g.view().chapterId).toBe('ch1_descent');
    // ...choices (default/sump) ... -> expect a ch2_sump game ending
  });
  it('survival meters carry across the chapter boundary (lamp lower in ch2 than its fresh start)', () => {
    const g = new GameRunner(sumpLine);
    // play into ch2; assert lamp_charge < 100 on entry (carried + rebased), proving cross-chapter carry
  });
  it('a carried-low lamp can reach a dark ending (the carry-only path the per-chapter walker cannot)', () => {
    const g = new GameRunner(sumpLine);
    // dawdle in ch1 to burn lamp low, branch, then let it hit zero in ch2 -> dark ending
  });
});
```

- [ ] **Step 2: Run it to verify it fails.**
- [ ] **Step 3: Create `sumpLine.ts`** (the `Game` above) and fill in the test's playthroughs with the real authored choice ids so each assertion is concrete (every game-ending reachable; carry proven; a dark ending reached via carried-low lamp).
- [ ] **Step 4: Run it to verify it passes** — `npx vitest run sumpLine` → PASS.
- [ ] **Step 5: Register + full gates** — add `sumpLine` to the container barrel `src/experiments/sump-line/index.ts`; run `npx tsc --noEmit`, `npx vitest run` (all green).
- [ ] **Step 6: Commit** — `feat(sump-line): wire the Game + end-to-end playthroughs`

---

### Task 5: Assessment update (the experiment's other deliverable)

**Files:**
- Modify: `src/experiments/sump-line/ENGINE-ASSESSMENT.md`

- [ ] **Step 1: Add findings from authoring real content**, each in the F-format (wanted / engine-gave / workaround / verdict / recommended change):
  - **F4 — per-chapter walker cannot reach carry-only endings.** `walkStateSpace` runs a chapter from its authored defaults (full lamp), so the carry-only "dark" endings (only reachable when a depleted lamp is carried in) surface as `orphanEndings` and the at-zero path is never exercised. Workaround: a chapter-level seeded-walk harness (seed a low carried resource via `seedChapterStory` before walking) OR accept+document the orphan. Recommended change: a `walkStateSpace` option to seed an initial carried state.
  - **F5 (tooling)** — note the player/graph gaps (no game-level player or chapter-graph view yet) as the deferred tooling shortlist, per Matthew's "after playtesting" call.
  - Fill the **Summary & prioritized shortlist** section now that the slice is authored: rank F1-F5 (lead candidates: the game-vs-chapter time generalization F2, and the seeded-walk F4).
- [ ] **Step 2: Commit** — `docs(sump-line): assessment findings from authoring the slice`

---

### Task 6: Playable HTML harness (so Matthew can climb out himself)

**Files:**
- Create: `src/experiments/sump-line/play/main.tsx` (a minimal reader UI over `GameRunner`)
- Create: `src/experiments/sump-line/play/index.html`
- Create: `src/experiments/sump-line/play/vite.config.ts` (single-file inlined build via `vite-plugin-singlefile`)

**Goal:** a self-contained, double-clickable `sump-line.html` that runs the REAL `GameRunner` over `sumpLine` — render the current node's prose (with `{{time}}` substituted), the available choices as buttons, a small status strip (chapter title, the lamp + body-heat meters, the game clock), and the ending screen. No engine re-implementation — it imports `GameRunner` + `sumpLine`.

- [ ] **Step 1: Build the reader UI** `main.tsx` — `useState` over a `GameRunner` instance; render `view().node.body` with `{{time}}`→`view().timeLabel`; render `view().choices.filter(c=>c.available)` as buttons calling `choose`; show locked choices greyed with their `lockedReason` (debug-friendly); render the meters from `view().state.vars.lamp_charge`/`body_heat`; on `view().gameOver` show the ending (`view().endingReached`).
- [ ] **Step 2: Single-file build** — add `vite-plugin-singlefile` (dev dep) and a `vite.config.ts` rooted at `play/` that inlines all JS/CSS into one HTML. Add an npm script `build:sump` → outputs `dist-sump/index.html`.
- [ ] **Step 3: Build it** — `npm run build:sump`; copy the output to repo root as `sump-line.html`.
- [ ] **Step 4: Smoke test** — a Vitest + Testing-Library test that mounts `main.tsx`, plays one path via clicks, and asserts an ending renders (proves the harness wiring without a browser).
- [ ] **Step 5: Full gates** — `npx tsc --noEmit`, `npx vitest run`, `npx vite build` (the main app still builds).
- [ ] **Step 6: Commit** — `feat(sump-line): self-contained playable HTML harness`; then **open the folder with `sump-line.html` selected** for Matthew to double-click and play.

---

## Self-Review

- **Spec coverage** (vs `docs/sump-line-slice-design.md`): the 3 chapters → Tasks 1-3; the Game/transitions/carry → Task 4; the 6 punch-list fixes → mapped (clock+change_location+latches+flood start → T1; priorities+depletion → T2; dive-gate+air/rope starts+priorities → T3; the orphan-walker finding → documented T1-3 tests + T5). Voice/keystones → the authoring briefs reference the design doc. ✓
- **Placeholder note:** the per-chapter tests contain authored-against-real-choice-id assertions to be completed when the chapter's choice ids exist (Step 3 of each) — this is intrinsic to content authoring (the ids are created in the same step), not a placeholder gap; each task's Step 3 makes them concrete before its Step 4 passes.
- **Type consistency:** `Game`/`Story`/`Condition`/`Effect`/`Resource` are the engine/container types; `sumpLine.chapters[].story` consume `ch1Descent`/`ch2High`/`ch2Sump`; transitions use `cave_route` equals 'high' with a catch-all to `ch2_sump`. ✓
- **Deferred/honest:** the carry-only dark endings WILL show as per-chapter `walkStateSpace` orphanEndings by construction — the tests explicitly allow `end_dark*` orphans and the cross-chapter dark path is proven in Task 4 instead; logged as finding F4.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-23-sump-line-slice-build.md`.
