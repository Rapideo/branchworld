# Hardening Pass — Team Review + Fuzzer (v1.4 punch-list input)

> A focused two-track hardening pass on the FROZEN v1.3 engine, run after the 3-chapter slice
> proved playable. **Track A** (a seeded property/fuzz sweep, `harden/fuzz.test.ts`) hunts runtime
> bugs and *execute-proves* hypotheses. **Track B** (four of the team, each a distinct adversarial
> lens) hunts model/craft/scaling gaps. The engine stayed frozen the whole pass (zero `src/engine`
> changes); everything here is a **finding**, not a fix. It extends the F1–F9 log in
> `ENGINE-ASSESSMENT.md`.

## What Track A established (the engine is robust where it counts)

A seeded generator emits random **lint-clean** Stories; the runtime is then walked and asserted
against its load-bearing invariants. Result across **3,000 generated stories**:

| Invariant | Result |
|---|---|
| No reachable state throws (choosing only available choices) | ✅ holds |
| Every resource & bounded var stays within `[min,max]` at every state | ✅ holds |
| Replaying a recorded choice path is deterministic | ✅ holds |
| `snapshot()`/`restore()` into a fresh engine is faithful mid-game | ✅ holds |
| `walkStateSpace` never throws; no cap hits on small stories | ✅ holds |

The runtime core (clamping, effect application, resolution, snapshotting, the walker's fork-restore)
is **sound**. The findings below are not crashes — they are *valid states with broken meaning*, and
*model/scale* gaps. Five are now backed by a running test (the "Proof" column).

## The findings (ranked; H-series, mapped to F-series + the lens that found them)

### Tier 0 — book-scale blockers (silent-state class)

**H1 — No machine check that what one chapter *writes* is what another *reads*.** `carry:{vars:'all'}`
copies every var forward; `lintGame` lints each chapter *in isolation*. A latch set in ch3, read by an
`is_false` gate in ch9, **renamed** in ch6 produces no error, no softlock, no crash — the gate just
silently opens and an "guarded" ending fires for free. The detonator is engine coercion, not a bug:
`is_false`/`not_equals` on a missing var read **true** (fail-open); `equals` reads **false** (fail-closed)
— same drift, opposite symptom per operator. Carried surface is already ~10 fields across 3 chapters;
projects to ~25–35 across a book.
*Lenses: Scaling-S1/S4, Systems-S6, Player-F-C/F-E. Proof: Track A **PROBE-D** (coercion asymmetry).
Sharpens F4; promotes tooling-backlog #2 to Game scope. Fix: **cross-chapter contract + latch linter** (M).*

**H2 — Negative `add_minutes` rewinds the clock, *revives* a time-driven meter, and defeats the
clock lint.** Nothing forbids a negative time delta. A rewind makes `lamp = start − amount·⌊(t−t₀)/every⌋`
go **up** — falsifying F6's "time-driven meters can only fall" — and can hold the clock under the
deadline indefinitely, while the lint's `timeBounds` *sums* the negative and mis-reports
`CLOCK_CANNOT_BITE`. The single cheapest high-value fix.
*Lens: Systems-S1. Proof: Track A **PROBE-B** (lamp 70→90 on rewind, lint clean). Fix: **`NEGATIVE_TIME_DELTA`
lint error + "time is monotonic" invariant** (S).*

### Tier 1 — ending-honesty / resolution-order

**H3 — `atZero` endings short-circuit the priority resolver.** The at-zero hook sets the ending
*before* `resolveEnding` runs, so a low carried lamp fires the dark ending even when the state matches a
**higher-priority** ending (e.g. you set `cave_crossed` and still get "The Cave Keeps You"). The overlap
lint can't see it because at-zero endings aren't modeled as conditions.
*Lenses: Systems-S5, Player-F-D. Proof: Track A **PROBE-C** (engine resolves `e_dark` while the priority
resolver picks `e_grey`). Fix: teach the overlap lint that `atZero.ending` ≡ `resource ≤ min`; prefer a
`resolvesEnding` node's own ending (needs **F8 node-named endings**) (M).*

**H4 — The deadline silently overrides an *answered* spine decision.** Wander, then pick "go high" —
if the clock crosses the deadline on the way to the commit node, the ending resolves from default state
*before* the route latch is set, discarding the choice. Worse, the **default ending doubles as the
"ran out of time" ending**, so "I chose the low road" and "the clock chose for me" are indistinguishable.
*Lens: Systems-S2 (reproduced by the project's own `ch1Descent.test.ts`). Sharpens F8. Fix: a distinct
"out of time" ending convention + node-named endings (S–M).*

**H5 — EE-4 honesty has neutered the default endings into shrugs.** Because a default ending's
conditions are `[]`, it can guarantee nothing about Rolly, so it must hedge the companion entirely —
delivering the story's emotional climax ("did your friend make it?") as an uncommitted *"if there is
anyone beside you…"*. The honesty rule is right; letting one catch-all default inherit every un-narrowed
state is the sin.
*Lens: Craft-F-D. Fix (method+engine): fan the default into priority-ordered, companion-specific
committed endings (rides on **F8**) (M).*

### Tier 1 — scheduled events & the shared-node trap

**H6 — A non-event choice routing into an event's `ifPresentNode` fires the consequence on demand.**
In ch1, "look at the low way" (`c_check_low`) routes straight into `n_seal_present` — so *looking seals
the cave ~40 min early*. The timed event and the manual look-at share one node.
*Lens: Player-F-A. Fix (content today + lint): split the look node; lint rule **"no non-event choice may
target an `ifPresentNode`"** (S).*

**H7 — A scheduled event ignores carried state, opening a window the player is barred from.** A player
who carries `cave_sump_sealed=true` into ch2_sump still gets the "the window just opened — go now!"
present node, whose only dive choice is gated `sealed is_false` → the narration insists on a passable gap
the engine forbids.
*Lens: Player-F-B. Sharpens F5. Fix: **conditional event triggers/present-routes** (so a carried-sealed
player never reaches the present node) (S content / M engine).*

**H8 — Present/absent reachability is unverifiable, and the lint actively suppresses the one signal.**
`lintStory` exempts `ifPresentNode`s from the unreachable-node warning by design, so a present node no
reachable play reaches is silently fine. Both branch chapters hit this (F5).
*Lenses: F5, Scaling-S5. Fix: a **present-reachability check** in the (seeded) walker (M).*

### Tier 1 — verification at scale

**H9 — The walker can't seed, so carry-only endings are unverifiable per-chapter, and the fraction
*grows* with branch count.** `walkStateSpace(story)` always starts from authored defaults; 3 of 11
endings (27%) in the slice are carry-only orphans, caught only by hand-scripted cross-chapter playthroughs
(4 scripts vs up to 2ⁿ paths). The seeded walk that would close this is also the one most likely to hit
the 50k cap.
*Lenses: F4, Scaling-S3. Fix: **`walkStateSpace(story,{seedState})`** driven by the H1 linter's real
carried-in bands (tooling-backlog #1) (M–L).*

**H10 — The walker's true cap driver is *distinct accumulated time at reconverging hubs*, not flavor
state.** The state key includes `time`, so every distinct minute-total at a hub is a distinct state; the
method's doc names flavor-vars as the primary driver, which is secondary. Authors optimizing the doc's
advice prune the cheap axis and keep the expensive one.
*Lens: Systems-S4. Sharpens F4/backlog #1. Fix: **doc correction + quantize detour time costs**;
optional walker time-bucketing mode (S doc / M engine).*

**H11 — Resource calibration is coupled across the whole upstream path, verified only by a handful of
scripted playthroughs.** A rate change in ch8 can silently break ch3's dark-ending reachability; the
oracle is 4 hand-authored button sequences.
*Lenses: F7, Scaling-S2. Fix: **per-resource value-at-endings report** over the seeded walk
(tooling-backlog #3) (M).*

### Tier 2 — model & method

**H12 — A spine option can be dead for a whole class of players with zero signal.** `c_godown` is gated
`flood_water ≥ 2`, reachable only via the abandon-Rolly `c_push` branch; the walker reports it "exercised"
(some path reaches it) and lint's sound dead-choice check returns false. No tool flags *conditional /
per-branch* reachability.
*Lens: Systems-S3 (new). Fix: per-branch reachability in the seeded walk (M).*

**H13 — The latch tax (F8) is unbounded *and unaudited*.** "Latch set only by an unconditional
entry-effect" is real, load-bearing for ending honesty, and enforced **nowhere** — it lives in the
author's head and a prose ledger that "does not scale by hand." A mis-set latch is exactly the EE-4
"ending lies" failure.
*Lenses: Systems-S6, Player-F-E. Fix: lint the latch discipline directly (rolls into H1) (M).*

**H14 — Detours are consequence-free *by design*, so most choices are cosmetic.** Eight of ch1's optional
nodes write nothing; three different detours tell the player the same fact ("the cave is flooding") in
three registers that change no later line, choice, or outcome. The prose is good enough to hide it on a
first read; a second read exposes it.
*Lens: Craft-F-A (the central agency finding). Fix (method): an **"earning detour"** class — a budgeted
handful of rejoining detours each set *one* readable flag a later spine choice/line visibly consumes
(`flood_water → c_godown` done on purpose instead of once by accident) (M).*

**H15 — "Splint & carry" vs "push fast" collapses to the same companion fate.** The marquee moral choice
(20 min together vs 10 min, Rolly limping) routes a `c_push` player to the *same stranding* as never
helping — the "limping behind, together-ish" state the prose promises doesn't exist in the model. A false
choice wearing a tradeoff's label.
*Lens: Craft-F-C (new). Fix (author-craft): make `hurt`-present a real carried state, or relabel `c_push`
honestly as the leaving choice (S–M).*

**H16 — Other craft gaps** worth a method line each: the spine is a **metronome** (hub→forced→hub ×4) —
add a Stage-1 *rhythm-variation* check (Craft-F-E); **loop-backs are strictly-dominated** negative-value
choices — a loop-back must change *something* (Craft-F-F); the world-moves events are keyed to a **hidden
timer** the player can't read — give one legible instrument (lamp dimming, water line) that correlates
with the clock (Craft-F-G); and **signpost the one real branch** so the `flood_water` consequence is felt
(Craft-F-B). All method/author-craft, no engine change.

## The convergence (what the four lenses independently agreed on)

1. **Silent state is the book-killer, not crashes.** Three lenses + the fuzzer landed on the same root:
   carried state has no machine-checked contract, and the engine's fail-open coercion makes drift
   invisible. **H1 is the consensus P0.**
2. **Ending honesty leaks at two seams** — the `atZero` short-circuit (H3) and the default-ending hedge
   (H5) — both fixed cleanly by **node-named endings (F8)**, which jumps in priority.
3. **The verification story doesn't scale** without a **seeded walker fed by real carried-in bands**
   (H9) — and the contract linter (H1) is what *produces* those bands. One linter unblocks three tools.
4. **Most of the felt-quality and player-incoherence fixes need no un-freeze** — they're content/method
   (H6, H7 content side, H14–H16) and can ship against v1.3 today.

## Recommended v1.4 punch list (engine/tooling), in order

| # | Change | Size | Closes |
|---|---|---|---|
| 1 | **Cross-chapter contract + latch linter** (name/type/domain match across transitions; latch discipline; the carried-in bands) | M | H1, H13, F4 (half) |
| 2 | **`NEGATIVE_TIME_DELTA` lint + "time monotonic" invariant** | S | H2 |
| 3 | **Node-named endings (F8)** + atZero-as-condition in the overlap lint + distinct "out of time" ending | M | H3, H4, H5 |
| 4 | **Seeded/scalable walker** (fed by #1) + present-reachability + per-branch reachability + value-at-endings report | M–L | H8, H9, H11, H12, F4, F5, F7 |
| 5 | **Event hygiene**: "no non-event choice → `ifPresentNode`" lint + conditional event triggers | S–M | H6, H7 |
| 6 | **Time-driven resource offset (F6)** — now doubly motivated by H2 | M | F6 |
| 7 | **Walker time-bucketing mode** + doc correction (quantize detour times) | S–M | H10 |

*Content/method/craft track (no un-freeze, can start now): the four player-reachable incoherences
(H6/H7 content side, plus the stale-latch clears H13's content half), and the method additions
(earning-detour H14, honest companion choice H15, rhythm/loop-back/instrument/signpost H16).*
