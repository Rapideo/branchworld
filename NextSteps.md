# BranchWorld — Next Steps

> The planned forward work for the BranchWorld engine + "The Sump Line" cave POC, as of
> **2026-06-24**. This is a **proposal to prioritize together**, not a committed sequence — the
> "Proposed priority" column is a recommendation; we set the real order in our walk-through.
>
> Detail behind the hardening items lives in
> [`src/experiments/sump-line/HARDENING-FINDINGS.md`](src/experiments/sump-line/HARDENING-FINDINGS.md)
> (the team + fuzzer pass) and [`ENGINE-ASSESSMENT.md`](src/experiments/sump-line/ENGINE-ASSESSMENT.md)
> (the F1–F9 log). The authoring method is in [`docs/authoring-method.md`](docs/authoring-method.md).

## Status — 2026-06-27 (The Countinghouse heist slice) — resume anchor

Engine v1.4 is **merged** (`master`, tag `engine-v1.4`) and **counted inventory** shipped (`58526b6`). The
post-v1.4 capabilities brainstorm chose the next game = a **mob/heist thriller**; counted inventory was
capability #1. Now built: **"The Countinghouse"** — a two-chapter vertical slice on branch
**`feature/countinghouse-slice`** (the first game to exercise all four new capabilities). Spec + plan in
`docs/superpowers/{specs,plans}/2026-06-27-*`; the plan was team-gut-checked (verdict CHANGE → fixed) before any
code.

- ✅ **ch1 "The Way In"** (`5478d89`) — counted inventory + The Lead (`adjust_resource`).
- ✅ **ch2 "The Way Out"** (`27ac26d`) — `endsWith` finales + Dawn (`outOfTimeEndingId`) + The Outfit (atZero).
- ✅ **The Game + contracts** (`0ea06ff`) — `countinghouse` wired; `lintGame` clean; carry verified; end-to-end.
- ⏳ **Hardening + docs + playable harness** (Task 4–5 in progress) — 600-run coherence fuzz green; FINDINGS.md
  written; this update; then the self-contained playable `countinghouse.html`.
- **Zero engine change throughout. Nothing pushed.**

**NEXT (Matthew's call):** finish the slice (the playable build), then one of —
(a) **promote the container** to a shared `src/container/` (two consumers now; see `countinghouse/FINDINGS.md` —
the recommended immediate refactor); (b) **expand the heist** (the loud route, then the remaining two chapters);
(c) the **next capability** (characters-as-assets / timed challenges / clock-phase profile); (d) the **WS-G
front-end**. Deferred P2 engine lints (F8/F9/F10) remain clean on shipped content.

## Status — 2026-06-26 (engine v1.4 wrap-up IN PROGRESS) — resume anchor

Working on branch **`feature/engine-v1.4`** (tag **`engine-v1.3`** = frozen revert anchor: `git checkout
engine-v1.3` to bail). The first **deliberate v1.4 un-freeze**. Sequence agreed 2026-06-26:
**A2 → A1 v1.1 → A3 → A5 → A4 (H8/H12) → [clock decision] → A6 → A7.** Clock-model fork = **(b) deferred** —
A6 is built clock-agnostic; the full clock model goes to the post-engine capabilities brainstorm (with
"Settings & Preferences"). Each item committed atomically on the branch; **nothing pushed**.

- ✅ **Versioning** — `engine-v1.3` tag + `CHANGELOG.md` (`2e27ed6`).
- ✅ **A2** — `NEGATIVE_TIME_DELTA` lint + monotonic-time invariant; **H2 closed**; PROBE-B flipped (`1f4ed08`).
- ✅ **A1 v1.1** — ancestor-aware + annotated contract checks (`Chapter.carriedRequired` / `Game.domains` /
  `Game.mutexLatches`), cave contract populated, zero-FP (`c96529e`).
- ✅ **A3** — node-named endings (`endsWith`) + atZero-by-priority (H3) + `outOfTimeEndingId` (H4), unified in
  `resolveEndingAt` (`2cac20e`); PROBE-C flipped.
- ✅ **Team adversarial pass + ALL P0/P1 follow-ups (F1–F6)** — found one CONFIRMED live cave bug + seam gaps;
  fixed: **F1** ch2_high honesty (the live bug), **F2** `ATZERO_PRIORITY_DOMINANCE`, **F3** endsWith-trigger +
  death-beats-pin, **F4/F5/F6** coherence lints (`bf2bbc7`/`ce21b75`/`62fedbe`/`98a8b87`).
- ✅ **A5** — `EVENT_PRESENT_NODE_ON_DEMAND` lint (H6 regression guard) + a conditional-trigger regression lock
  (H7 — conditional triggers are already engine-supported; B1 used them).
- ✅ **A4 (H8/H12)** — present-reachability (`eventPresent`) + per-branch reachability (`conditionalChoices`) in
  the walker; cave's seal-event present node verified reachable.
- ✅ **A6** — clock-agnostic resource offset (`adjust_resource` op + hidden offset var, F6); PROBE-G proves a
  battery-swap raises the lamp. Lint `ADJUST_RESOURCE_NOT_TIME_DRIVEN`.
- ✅ **A7** — `walkStateSpace({ timeBucket: N })` mode (H10) + method-doc correction (quantize detour times).
- **276 tests green; typecheck clean. ▶▶ v1.4 COMPLETE** (A2..A7 + team-pass F1–F6 + the pre-merge fixes).

**NEXT = merge `feature/engine-v1.4` → `main`** (pre-merge Team check done = OK-WITH-FIXES, all fixed; F11
precedence docs done). Remaining team-pass **P2** (all clean on the shipped content, deferred): F8
(`hasProducerFreePath` ignores transition conditions), F9 (`CONTRACT_DOMAIN_VIOLATION` counts defaults /
`not_equals`), F10 (chapter-deadline-OOT lint). THEN the deferred **capabilities brainstorm** (task #9): six
parked ideas —
inventory, clue-finding/scene-exploration, free travel between locations, characters+locations as rich
assets, an engine "Settings & Preferences" profile (chapter-vs-no-chapter, carry rules, **clock model**),
and **As Dusk Falls-style** timed/skill challenges (narrative-native QTEs; mostly front-end). Each gets its
own design pass AFTER the engine wrap-up.

## Status — end of 2026-06-24 session (prior anchor)

**DONE this session** (all container-side / content; engine FROZEN throughout; **232 tests green**):
- ✅ **Hardening pass** — fuzzer + 4 team lenses → `HARDENING-FINDINGS.md` (H1–H16) + `harden/fuzz.test.ts`.
- ✅ **Priority walk-through** — decisions below; front-end captured as WS-G.
- ✅ **B1** — the four player incoherences fixed (commit `7402474`); **validated CLOSED by two team agents**.
- ✅ **A1 v1** — cross-chapter contract + latch linter (`lintGameContracts.ts`, commit `0c1558d`); 4 zero-FP
  checks merged into `lintGame`; design in `docs/a1-contract-linter-design.md`.
- ✅ **A4/E2** — seeded walker + value-at-endings report (`seededWalk.ts`, commit `74cf36d`); closes F4 + F7.
- ✅ **F1** — fuzzer in CI.

**NEXT (resume here), by risk:**
- *Low-risk, container-side:* **A1 v1.1** — ancestor-aware `READ_NO_ANCESTOR_PRODUCER` (the precise
  rename-catcher v1 misses) + opt-in `carriedRequired`/`domain` annotations + `MUTEX_LATCH` groups.
  **Needs careful design — false-positive risk; do NOT rush it.** Plus a small ledger-printer for authoring.
- *Deliberate v1.4 un-freeze (Matthew's call):* **A2** negative-time lint, **A3** node-named endings (closes
  both honesty seams H3/H5), then A5/A6/A7.
- *Then the book:* **C1** arc design + pick the world.

## Where we are

- **Engine** v1.3, **frozen** and proven robust: a 3,000-story fuzz sweep found zero crashes, zero
  out-of-bounds, deterministic replay, faithful snapshot/restore. **232 tests green** (was 209 at session start).
- **Content**: "The Sump Line" plays end-to-end — ch1 (~26 beats) → ch2_high (~19) **or** ch2_sump
  (~16), an evening per playthrough. Double-clickable `sump-line.html` in play and well-received.
- **Method**: the Branch-and-Bottleneck Authoring method is codified *and* proven by application
  (all three chapters authored through it).
- **Just completed**: a two-track hardening pass (mechanical fuzzer + four adversarial team lenses).
  It produced a ranked **v1.4 punch list** — see HARDENING-FINDINGS.md. Headline: *the runtime is
  sound; the risks are silent cross-chapter state, ending-honesty seams, and verification at book
  scale* — none fatal, all now specified.

## Decided priority (set together 2026-06-24)

Three calls, locked:

1. **First sprint = the safety slice, NO un-freeze.** Build the **contract + latch linter (A1/E1)**
   in the *container layer* (next to `lintGame`, not `src/engine/`) + **fix the four player
   incoherences (B1)** in the chapter files + keep the fuzzer (F1) in CI. This catches the
   book-killer silent-drift class and protects every future chapter *while the engine stays frozen*.
   (Key realization: A1 is a Game-level concern, so it needs no un-freeze — only the deeper
   ending-honesty/offset work does.)
2. **Book world = chosen after tooling.** Don't lock the cave-vs-new-setting question yet; harden +
   tool first, pick the arc when we're ready to author at length.
3. **Per-project toggles (WS-D) = deferred** until a second project actually needs a different
   primitive set — no speculative abstraction now.

The deeper v1.4 engine changes (A2 negative-time lint, A3 node-named endings, A6 offset, A7 walker
bucketing) are **not** in Sprint 1 — we open v1.4 deliberately, after the safety slice, when the book
demands it. `E3` (graph editor) is parked as premature for the POC stage.

## Workstreams

### WS-A — Engine v1.4 hardening (from the team pass)
*Goal: close the gaps the hardening pass found, in leverage order. Un-freezes the engine deliberately.*

| Item | What | Size | Proposed priority |
|---|---|---|---|
| A1 | **Cross-chapter contract + latch linter** — machine-check that every carried field a downstream chapter reads has an upstream writer of matching name/type/domain; lint latch discipline. Kills the silent-drift class (H1, H13). | M | **✅ v1 DONE** (`0c1558d`); v1.1 ancestor-aware next |
| A2 | **`NEGATIVE_TIME_DELTA` lint + "time is monotonic" invariant** — one-line guard closing the rewind exploit (H2). | S | **P0** |
| A3 | **Node-named endings (F8)** + teach the overlap lint about `atZero` endings + a distinct "out of time" ending — fixes the two honesty seams (H3, H4, H5). | M | P1 |
| A4 | **Seeded / scalable walker** + **value-at-endings report** — book-scale verification + calibration (F4/F7 done). Present-reachability + per-branch reachability (H8/H12) still to add. | M–L | **✅ core DONE** (`74cf36d`); H8/H12 next |
| A5 | **Event hygiene** — lint "no non-event choice may target an `ifPresentNode`"; conditional event triggers (H6, H7). | S–M | P1 |
| A6 | **Time-driven resource offset (F6)** — safe "rest / swap the battery" mechanic, now doubly motivated by H2. | M | P2 |
| A7 | **Walker time-bucketing mode** + doc correction (quantize detour times) (H10). | S–M | P2 |

### WS-B — Authoring quality (felt experience; **no un-freeze**)
*Goal: make an evening worth a consumer's time, not just structurally valid. Content + method only.*

| Item | What | Size | Proposed priority |
|---|---|---|---|
| B1 | Fix the four player-reachable incoherences in the slice — seal-on-look (H6), carried-seal window (H7), re-loss scene, stale companion latch — all editable in the existing chapter files today. | S | **✅ DONE** (`7402474`, validated CLOSED) |
| B2 | Add the **"earning detour"** class to the method — a budgeted few rejoining detours that set one readable flag a later choice/line consumes, turning cosmetic detours into agency (H14). | M | P1 |
| B3 | Make the marquee choices *felt*: honest splint-vs-push (H15), signpost the `flood_water` branch, give scheduled events one legible instrument (H16). | S–M | P1 |
| B4 | Add a Stage-1 **rhythm-variation** check + the loop-back-must-change-something rule to the method (H16). | S | P2 |

### WS-C — The consumer POC book
*Goal: flesh out a consumer-size book (beyond the 3-chapter cave-out) to exercise the method at length.*

| Item | What | Size | Proposed priority |
|---|---|---|---|
| C1 | **Design the book arc first** — the spine across ~10–12 chapters, the carried output contract, the survival horizon. (The slice is the opening; the arc is undecided.) | M | P1 |
| C2 | Author the chapters via the method, applying WS-B's quality additions. Gated by A1/A4 for safe scale. | L | P1→P2 |

### WS-D — Per-project engine feature toggles
*Goal: your stated ask — aspects/features turn on/off per project, so the engine is "correctly complex"
for the project at hand (resources, scheduled events, multi-chapter carry, etc.).*

| Item | What | Size | Proposed priority |
|---|---|---|---|
| D1 | Define the toggle surface (which primitives are opt-in per `Story`/`Game`) and the lint profile per toggle. A small design spike, then implementation. | M | P1 |

### WS-E — Tooling for book scale
*Goal: the tools the method's backlog named, now re-ranked by the hardening pass. (Several overlap WS-A.)*

| Item | What | Size | Proposed priority |
|---|---|---|---|
| E1 | The contract linter / **machine-checked variable registry** — *re-ranked to #1* by the scaling lens (was #2). Same as A1. | M | **✅ v1 DONE** (= A1) |
| E2 | The **seeded walker** + value-at-endings report (same as A4). | M–L | **✅ core DONE** (= A4) |
| E3 | **Graph + variable-panel editor** — the human-facing surface (Twine/articy-shaped) for the eventual creator product. | L | P3 |

### WS-G — Front-end: a native-mobile video-game experience
*Goal (Matthew, 2026-06-24): make the player a **native-mobile-feeling video game**, not a text page —
**images for locations and characters**, plus other rich presentation elements. **Sequenced AFTER initial
game design** (the engine/content/safety work below comes first); this is the presentation layer over the
proven `GameRunner`.*

| Item | What | Size | Proposed priority |
|---|---|---|---|
| G1 | **Design spike** — define the mobile UX: scene/location art + character portraits, meter HUD (the loved Warmth/Light trackers), choice presentation, transitions, art pipeline (where images come from — generated vs commissioned), and how art keys off engine state (location id, companion status, time-of-day, survival meters). | M | P2 (after game design) |
| G2 | **Build the mobile front-end** over the real `GameRunner` (the current `sump-line.html` is the logic-proven seed; this replaces its presentation with an app-grade, image-rich, touch-first UI). | L | P2→P3 |
| G3 | **Art asset system** — per-location and per-character image slots driven by `Story`/state, with sensible fallbacks; likely a small per-project asset manifest (pairs naturally with WS-D toggles). | M | P3 |

### WS-F — A standing testing squad
*Goal: institutionalize this pass so hardening is repeatable, not one-off.*

| Item | What | Size | Proposed priority |
|---|---|---|---|
| F1 | Keep `harden/fuzz.test.ts` in CI; grow probes as new findings arrive (the executable-proof habit). | done + ongoing | **P0** (keep) |
| F2 | A re-runnable "team panel" prompt set (the four lenses) to re-review each new chapter/engine change. | S | P2 |

## Locked sequencing

- **Sprint 1 — Safety slice (no un-freeze): ✅ COMPLETE.**
  `A1`/`E1` cross-chapter **contract + latch linter** ✅ · `B1` fix the **four player incoherences** ✅ ·
  `F1` fuzzer in CI ✅. *Exit reached: book-scale is drift-safe, freeze intact.*
- **Sprint 2 — Verification + honesty (IN PROGRESS):**
  `A4`/`E2` **seeded walker + value-at-endings report** ✅ (F4/F7 done; present/per-branch reachability still
  to add) → **NEXT:** `A1 v1.1` ancestor-aware check (container-side, careful — FP risk) → then the first
  *deliberate* v1.4 engine opening: `A2` negative-time lint + `A3` node-named endings (closes both
  honesty seams). `A5` event hygiene rides along.
- **Sprint 3 — The book:**
  `C1` arc design **+ pick the world** (cave-as-full-book vs new setting — deferred to here) → `C2`
  author, riding the safety stack · `B2`/`B3`/`B4` craft/method work alongside the prose.
- **Deferred / on-demand:** `WS-D` toggles (until a 2nd project needs a different primitive set) ·
  `A6` resource offset, `A7` walker bucketing (pull when they bite) · `E3` graph editor (parked —
  premature for POC) · `F2` re-runnable team panel (nice-to-have).

## Decisions made (2026-06-24)

- **v1.4 now vs. book-first?** → **Safety slice first, no un-freeze** (A1 container-side + B1), *then* book.
- **Book world?** → **Decide after tooling** (cave vs new setting chosen when we author at length).
- **Toggles (WS-D)?** → **Defer** until a second project needs it.
- **Cut as "too much"?** → `E3` (graph editor) parked for the POC stage.
