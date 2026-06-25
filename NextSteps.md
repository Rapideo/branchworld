# BranchWorld — Next Steps

> The planned forward work for the BranchWorld engine + "The Sump Line" cave POC, as of
> **2026-06-24**. This is a **proposal to prioritize together**, not a committed sequence — the
> "Proposed priority" column is a recommendation; we set the real order in our walk-through.
>
> Detail behind the hardening items lives in
> [`src/experiments/sump-line/HARDENING-FINDINGS.md`](src/experiments/sump-line/HARDENING-FINDINGS.md)
> (the team + fuzzer pass) and [`ENGINE-ASSESSMENT.md`](src/experiments/sump-line/ENGINE-ASSESSMENT.md)
> (the F1–F9 log). The authoring method is in [`docs/authoring-method.md`](docs/authoring-method.md).

## Where we are

- **Engine** v1.3, **frozen** and proven robust: a 3,000-story fuzz sweep found zero crashes, zero
  out-of-bounds, deterministic replay, faithful snapshot/restore. 219 tests green.
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
| A1 | **Cross-chapter contract + latch linter** — machine-check that every carried field a downstream chapter reads has an upstream writer of matching name/type/domain; lint latch discipline. Kills the silent-drift class (H1, H13). | M | **P0** |
| A2 | **`NEGATIVE_TIME_DELTA` lint + "time is monotonic" invariant** — one-line guard closing the rewind exploit (H2). | S | **P0** |
| A3 | **Node-named endings (F8)** + teach the overlap lint about `atZero` endings + a distinct "out of time" ending — fixes the two honesty seams (H3, H4, H5). | M | P1 |
| A4 | **Seeded / scalable walker** (fed by A1's carried-in bands) + present-reachability + per-branch reachability + **value-at-endings report** — the book-scale verification + calibration tools (H8, H9, H11, H12; F4/F5/F7). | M–L | P1 |
| A5 | **Event hygiene** — lint "no non-event choice may target an `ifPresentNode`"; conditional event triggers (H6, H7). | S–M | P1 |
| A6 | **Time-driven resource offset (F6)** — safe "rest / swap the battery" mechanic, now doubly motivated by H2. | M | P2 |
| A7 | **Walker time-bucketing mode** + doc correction (quantize detour times) (H10). | S–M | P2 |

### WS-B — Authoring quality (felt experience; **no un-freeze**)
*Goal: make an evening worth a consumer's time, not just structurally valid. Content + method only.*

| Item | What | Size | Proposed priority |
|---|---|---|---|
| B1 | Fix the four player-reachable incoherences in the slice — seal-on-look (H6), carried-seal window (H7), re-loss scene, stale companion latch — all editable in the existing chapter files today. | S | **P0** (cheap, correctness) |
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
| E1 | The contract linter / **machine-checked variable registry** — *re-ranked to #1* by the scaling lens (was #2). Same as A1. | M | **P0** |
| E2 | The **seeded walker** + value-at-endings report (same as A4). | M–L | P1 |
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

- **Sprint 1 — Safety slice (no un-freeze, NOW):**
  `A1`/`E1` cross-chapter **contract + latch linter** (container layer) · `B1` fix the **four player
  incoherences** (chapter files) · `F1` fuzzer stays in CI. *Exit: book-scale is drift-safe, freeze intact.*
- **Sprint 2 — Verification + honesty (as the book demands):**
  `A4`/`E2` **seeded walker + value-at-endings report** (built container-side first) → then the first
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
