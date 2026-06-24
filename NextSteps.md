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

## The one decision in front of us

**Do we open v1.4 now, or push the consumer POC book further on frozen v1.3 first?** The hardening
pass deliberately informs exactly this. My recommendation, reflected below: **a thin v1.4 "safety"
slice first** (the two cheapest, highest-leverage guards — H1 contract linter + H2 negative-time
lint), because they protect every chapter we write *next*; then build the book; then the richer
v1.4 tooling as the book demands it. But the felt-quality and content fixes need **no un-freeze**
and can run in parallel regardless.

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

### WS-F — A standing testing squad
*Goal: institutionalize this pass so hardening is repeatable, not one-off.*

| Item | What | Size | Proposed priority |
|---|---|---|---|
| F1 | Keep `harden/fuzz.test.ts` in CI; grow probes as new findings arrive (the executable-proof habit). | done + ongoing | **P0** (keep) |
| F2 | A re-runnable "team panel" prompt set (the four lenses) to re-review each new chapter/engine change. | S | P2 |

## Recommended sequencing (to confirm together)

1. **Now, in parallel:** B1 (fix the slice's incoherences) + A2 (negative-time lint) — both cheap,
   both correctness. Keep F1 (fuzzer) in CI.
2. **Then the safety slice:** A1/E1 (contract linter) — the one change that unblocks safe book scale.
3. **Then:** A3 (node-named endings — fixes both honesty seams) + B2/B3 (the felt-quality method work).
4. **Then the book:** C1 (arc design) → C2 (author), riding A4/E2 (seeded walker + calibration report)
   as the chapter count grows. D1 (toggles) slots in when a second project needs a different primitive set.

## Open questions for the walk-through

- **v1.4 now vs. more book on v1.3 first?** (My rec: thin safety slice — A1 + A2 — now.)
- **Book arc**: stay in the cave (the Sump Line as a full book) or a new setting for the POC?
- **Toggles (WS-D)**: design-spike now, or defer until a second project actually needs it?
- Anything here you'd cut as "too much" for the POC stage?
