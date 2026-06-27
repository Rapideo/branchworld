# BranchWorld Authoring Method — *Branch-and-Bottleneck Authoring*

> The repeatable, machine-verified pipeline for turning a chapter brief into a proven, evening-length
> chapter (25–40 beats) on the BranchWorld engine. **Audience now:** the LLM author, producing the POC
> book at scale. **Audience later (for free):** a human writer + LLM copilot — same pipeline, the human
> owns the prose, the LLM keeps owning the bookkeeping, wiring, and verification.
>
> Lineage we lean on: **branch-and-bottleneck** (Sam Kabo Ashwell, *Standard Patterns in Choice-Based
> Games*), **weave/gather** (Ink / inkle), and **quality-based narrative** (Failbetter; Emily Short) — our
> engine is a state-based / quality-based system, so these are kin, not just references.

---

## 0. The cardinal artifact — the **State Ledger**

This is the whole answer to *"manage all the branches and variables mentally."* The LLM does **not** hold
it in its head — it externalizes it and keeps it current through every stage. Maintain it as a table:

| variable / resource | type | default | meaning | invariant | SET at | READ at |
|---|---|---|---|---|---|---|
| `cave_route` | string | `'sump'` | the chapter fork | output contract; set once on a resolving beat | n_take_high / n_take_low | Game transition |
| `cave_all_together` | bool | `false` | kept Rolly to safety | **latch — set only by an unconditional entry-effect** | n_set_together | `end_daylight_all_three` |
| `lamp_charge` | resource | start 60 | the dread clock | time-driven; bounded 0–100; carried & rebased | (depletes; never written by effects) | at-zero → dark; meter UI |
| … | | | | | | |

Plus an **endings table** — each ending's `conditions`, `priority`, and **what its prose may assert**
(only facts its conditions *guarantee*; everything else is hedged). The ledger is the source of truth the
later stages are checked against. A variable that is declared but never read, set but never reachable, or
asserted in prose without a guaranteeing condition is a ledger violation — caught here, not in playtest.

**Carried state:** at the top of the ledger, list what carries *in* from prior chapters (vars + resources,
rebased by the container) and the **output contract** — exactly what this chapter must set for downstream
chapters/endings to read. The output contract is frozen unless the whole book agrees to change it.

---

## The five stages

### Stage 0 — Brief & Pattern
- **Role in the book:** what carries in, what the chapter must carry out (the output contract), its
  dramatic job, target beat count (25–40 = "an evening").
- **Pattern:** default to **branch-and-bottleneck**. Define the **spine** — the ordered list of *big
  decisions the player must be routinely led to and must answer* — and the bottlenecks (hubs) between them.
- Seed the State Ledger (carried-in, output contract, the spine's decision variables).

### Stage 1 — Beat Map
- Lay out beats: spine hubs + the forced decisions, plus **detours** hung off each hub.
  - **Forward-merge detour** (default): a flavoured route that rejoins at the *next* spine beat. Cheap for
    the walker (keeps the graph a DAG). Use for most optional content.
  - **Loop-back detour** (use sparingly): go in, come back to the same hub — the "poke around and return"
    feel. **Costs walker state** (a hub reachable at many times). Budget a handful per chapter.
- Each beat: `id`, location, type, **time cost**, destination(s), and every **set/read** → update the ledger.
- Rules enforced here (cheap to fix now, expensive later):
  - **No dead-ends** — every node has an exit; every detour rejoins the spine.
  - **Latch discipline** — latching booleans are set by an **unconditional entry-effect** on a destination
    node, never inside a conditional choice-effect.
  - **Time budget** — the longest *static* (no-revisit) path ≈ the deadline window (so the clock can bite);
    loop-back wandering may exceed it → the clock commits the player (usually to the default ending).
  - **Walker tractability** — limit loop-backs and **flavor state** (clues/vars that gate nothing multiply
    the state space for no payoff; keep the texture in *prose*, not in bookkeeping). The exhaustive walker
    caps at 50k states — a 26-beat chapter with loops + flavor clues *will* blow it.

### Stage 2 — Prose
- Each beat in the locked **voice bible** for the book. Texture lives here (the cave, the companion, the
  body, the dread) — *not* in extra variables.
- `{{time}}` token for any clock reference, **never a numeral** (EE-1).
- **Ending bodies assert only what their conditions guarantee**; hedge everything else with `if/whether`
  (EE-4). Never say "Rolly is beside you" in an ending that doesn't *require* the togetherness latch.

### Stage 3 — Wiring
- Emit the typed `Story`: nodes, choices (`conditions`/`effects`), resources, scheduled events, endings
  (with `priority` to silence overlap warnings and make resolution deterministic).
- Apply the engine invariants (below). Cross-check **every** ledger row: each declared var is set on a
  reachable beat *and* read somewhere; no orphan vars; no prose assertion without a guaranteeing condition.

### Stage 4 — Verify & Calibrate (the tool-loop)
Run, read, fix, re-run until green:
1. `lintStory` → **no errors** (clock can bite, no broken links, no undefined vars/locations, resource
   bounds, default ending present, event integrity).
2. `walkStateSpace` → `capHit:false`, `softlocks:[]`, `orphanEndings` is exactly the expected carry-only set
   (dark endings, etc.). **If `capHit`** → reduce loop-backs / flavor state (Stage 1), or fall back to
   seeded/sampled walking + scripted coverage, and log it.
3. **Scripted `GameEngine` playthroughs** — every ending reached by *some* path; the spine always reachable;
   the **output contract** values correct at each fork.
4. In the book: `lintGame` clean + **cross-chapter `GameRunner` playthroughs** — carry works, the meters
   land, the carry-only endings (dark / clean) are reachable cross-chapter.
5. **Calibrate** the clock & resources (see below) until efficient play survives and careless play pays.

---

## Engine invariants (the rules the ledger enforces)

- **EE-1 — time is engine-derived.** Prose carries no clock numerals; use `{{time}}`. Deadlines past
  midnight use >24h literals.
- **Latch discipline.** Latching booleans (`cave_all_together`, `cave_someone_lost`, …) are set *only* by
  unconditional entry-effects on destination nodes. Forks are gated **choices**, never conditional effects.
- **Resource model.** Resources are bounded (`min`/`max`). **Time-driven** resources (lamp, warmth)
  recompute from the clock and are *never written by effects* — an action cannot replenish them (engine
  limit F6); **choice-driven** resources (water level, air, rope) are written by `increment`/`decrement`.
  `atZero` may set a flag and/or resolve an ending (only in game-ending chapters).
- **Carried-output contract.** A chapter's outputs (route var, companion state, latches, carried meters)
  must match exactly what downstream chapters/endings read. Declare only the vars the chapter uses; the
  container rebases carried defaults.
- **EE-4 ending honesty.** Ending prose asserts only conditions-guaranteed facts; hedge the rest. Distinct
  *node-determined* outcomes that share state need a latch to tell them apart (e.g. `cave_crossed` to
  separate "got out" from "waited").
- **No dead-ends.** Every node has an exit or `resolvesEnding`; detours rejoin the spine.
- **Walker tractability.** The real cap driver (H10) is **distinct accumulated TIME at reconverging hubs** —
  the state key includes `time`, so every distinct minute-total at a hub is a distinct state. Flavor state
  (gate-nothing clues/vars) is the *secondary* axis. So: keep detour **time costs on a coarse grid** (multiples
  of, say, 5 or 10 min) so same-bucket arrivals collapse, and limit loop-backs + flavor state. For evening-scale
  chapters that still blow the 50k cap, use `walkStateSpace(story, { timeBucket: N })` — it quantizes time in the
  dedup key (lossless when detour costs are multiples of `N`).

---

## Structural patterns

- **Branch-and-bottleneck (default).** A spine of forced decisions; between them, optional rejoining
  detours. The bottlenecks (hubs) are where divergent state re-converges — which is *also* what keeps the
  chapter walker-verifiable. (Ashwell's name for our model; Ink's *gather* is the same move.)
- **Time as the only true constraint.** Exploring costs minutes; the deadline / flood / dying lamp / cold
  are the teeth that make spending time cost something. Lots of options + freedom to wander, bounded by one
  honest clock.
- **The world moves without you.** Scheduled events fire on (time ≥ trigger ∧ location). Tune the trigger
  against navigation timing so *both* present (witnessed) and absent (missed) branches are reachable —
  usually by letting a **pace difference** straddle the trigger (the careful-but-slow get caught; the fast
  get ahead). A present node no reachable play reaches is an orphan — verify it.

---

## Calibration craft (the F7 dance)

- **Clock.** Set `deadline` ≈ `startTime` + longest *static* path, so `lintStory` confirms the clock can
  bite, and no efficient path is cut off at a non-resolving node. Over-wandering (loop-backs) overshoots →
  the clock resolves the default ending. Bump a choice ±5 min to hit the target.
- **Survival meters across chapters.** Start time-driven meters **partly spent** (a lamp at 60, not 100) so
  the lethal at-zero is reachable inside a short game. Tune depletion so the *minimal successful long route*
  (e.g. carry-the-companion-high) survives on a thin margin while careless/explored routes die. Verify the
  full matrix with cross-chapter playthroughs — one rate per chapter; longer chapters need gentler rates.
  This is the part that does **not** scale by hand → it's the top of the tooling backlog.

---

## Generalization to human authors (later, for free)

Same pipeline. The human owns **Stage 2 (prose)** and approves **Stage 0–1** decisions. The LLM owns the
**State Ledger**, **Stage 3 wiring**, and **Stage 4 verification** — i.e. exactly the branch/variable load
the human can't hold in their head. The method doesn't change; only who writes the prose does.

## Tooling backlog (build when it bites — discovered by doing)

1. **Seeded / scalable walker** — exhaustively verify a 30-beat chapter from a representative carried-in
   state (the cap we hit). *Top priority — it's the verification guarantee at evening scale.*
2. **Machine-checked variable registry** — auto-maintain the State Ledger (set-at / read-at / invariant
   violations) instead of by hand.
3. **Resource value-at-endings report** — the calibration math (min/max meter at every reachable ending),
   so survival tuning stops being arithmetic by hand.
4. **Graph + variable-panel editor** — the human-facing surface (Twine/articy-shaped) for the eventual
   creator product.

---

*This method is applied per chapter. Invoke it, work the five stages in order, keep the ledger current, and
do not leave Stage 4 until the tool-loop is green.*
