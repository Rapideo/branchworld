# Product Requirements Document — v1.1

# BranchWorld Engine — Engine-Enforcement Revision

### Version 1.1 — supersedes selected sections of v0.1. Read alongside `Product Requirements Document.md`.

---

## 0. Why v1.1 exists (the review finding)

Three independent design teams — each running designer → writer → playtester in isolation — separately
invented, wrote, and adversarially playtested a complete chapter one against the v0.1 model. All three,
working blind to one another, shipped the **same four structural failures**:

1. The deadline could not run out (per-action time costs far too cheap).
2. Authors hardcoded fictional timestamps into prose to fake the urgency the clock wasn't conveying.
3. The "world moves without you" scheduled event was never a real trigger — only an opt-in choice in
   one node — and the if-absent clue-recovery path was unimplemented.
4. Endings were hardwired to specific choices rather than resolved from accumulated state, so the
   fiction asserted outcomes the state contradicted.

Convergence this tight across isolated teams is the signal: **these are not authoring mistakes, they are
the path of least resistance the v0.1 model creates.** The clue/knowledge-gating pillar — the one feature
v0.1 forces the author to wire correctly — worked in all three and was the only thing that felt like a
living world.

> **Organizing principle of v1.1: the engine enforces its own promises; the author cannot silently break
> them. Anything v0.1 left to author discipline becomes an engine primitive plus a build-blocking linter
> check.**

---

## 1. The Four Corrections (normative)

### 1.1 Time is engine-derived; hardcoded timestamps are banned

- The current clock has exactly one source of truth: `startTime + Σ(add_minutes applied)`. The engine
  computes and exposes `currentTime`; the renderer injects it.
- Node bodies **must not** embed absolute clock times as authored ground truth. Prose may reference a
  `{{time}}` token (engine-substituted) or relative phrasing ("the light is going").
- The node `time` field from v0.1 is **demoted** to `authorTimeHint` (non-authoritative, editor-only) or
  removed. The engine never reads it for logic.
- **Calibration is a requirement, not a vibe:** per-action `add_minutes` costs must be tuned so an
  efficient path lands *near* the deadline and any meaningful detour genuinely risks missing it. The
  linter (§2) enforces that the deadline is reachable.

### 1.2 Scheduled events are real engine triggers with a mandatory if-absent path

- After **every** time advance, the engine evaluates all incomplete scheduled events regardless of the
  player's location.
- When a trigger fires:
  - **Present** (player at the event location): route to the witnessed node.
  - **Absent:** apply the if-absent effects, **automatically plant a discoverable clue** at the relevant
    location (a reachable recovery node), mark the event completed, and write a debug log entry.
- Every scheduled event **must declare a reachable `recoveryNodeId`** (the if-absent discovery). Shipping
  one without it is a linter failure. This is the "missing something opens a different path, never a dead
  end" guarantee from v0.1 §8.3 — now enforced.

### 1.3 Endings resolve from accumulated state, never hardwired to choices

- Replace all choice→ending links with a single **Ending Resolver**, evaluated at resolution points
  (deadline reached, or an explicit resolve trigger).
- The resolver walks an **ordered** list of endings, each gated by conditions over accumulated state, and
  selects the first match. A **mandatory catch-all default ending** guarantees exhaustiveness — no
  reachable end-state may match zero endings.
- Choices may advance state and time but **must not target ending nodes directly** (linter-enforced).

### 1.4 Prose must not contradict state

- No node — especially an ending — may narrate an outcome (the town drowned, the gate failed) unless the
  corresponding flag is actually set on the path that reached it.
- Enforced by a per-ending review checklist plus the AI-assisted consistency pass (§3).

---

## 2. The Linter (new, build-blocking) — the linchpin

This is the mechanism that turns "the playtester noted it" into "you cannot ship it broken." It runs in
CI/build **and** live inside the authoring tool.

**Three blocking checks (new):**

1. **Deadline reachability** — compute the longest reachable accumulated-time path; **FAIL** if it cannot
   exceed the deadline (the clock can never bite). Also **warn** if the shortest path already overruns the
   deadline (unwinnable by construction).
2. **Ending exhaustiveness & reachability** — every reachable end-state matches **exactly one** ending;
   flag dead-code endings (unreachable) and zero-match holes (fall-through).
3. **Scheduled-event integrity** — every scheduled event defines present + absent effects **and** has a
   reachable `recoveryNodeId`.

**Carried over from v0.1 §22.3 (still required):** broken links, missing destinations, undefined/unused
variables, duplicate IDs, no-exit nodes, unreachable nodes, conditions referencing deleted variables.

**New guardrail (P2):** **one variable = one meaning.** Each variable declares a single semantic purpose
in a registry; the linter flags suspected overloading (a team independently overloaded one number to mean
trust, willingness-to-deal, and enemy pressure, which made its endings feel like a coin flip).

---

## 3. Authoring & Story-Flow Utility (elevated to first-class; AI-assisted)

*(Addresses the founder's second comment.)* In v0.1 the node-graph view and debug preview were "later"
(Stages 7+). The review makes clear that state-driven branching is **unmanageable to author by hand** —
so the flow/logic view is promoted to a core deliverable, not a nicety.

**Capabilities:**

- **Visual node/flow graph** (React Flow): nodes, choice edges, conditional edges labeled with their
  conditions, scheduled events overlaid on a timeline, endings, and **live linter results inline**
  (unreachable nodes, zero-match endings, an unbiteable clock all shown on the graph).
- **Logic inspector:** select any node to see *appears when / leads to / changes / used by*, plus a
  "why did/didn't this appear" state-trace — the debug ethos from v0.1 §21, made visual.
- **AI-assist (concrete, scoped):**
  - (a) Draft or expand scene prose from a node's structural intent and surrounding state.
  - (b) **Branch & consistency analysis** — find prose-vs-flag contradictions, missing if-absent paths,
    orphan/dead-code nodes, and zero-match ending holes; propose the endings or recovery nodes that close
    them.
  - (c) Propose `add_minutes` calibration that makes the clock bite without making the chapter unwinnable.
  - (d) Suggest knowledge-gated choice opportunities the author hasn't exploited.
  - The AI is an **assistant layered over the same engine model + linter** — it proposes; the linter
    verifies. It is never a separate, divergent code path.

**Architectural requirement that enables all of the above — one engine core:**

> The engine (state, conditions, effects, engine-derived time, scheduled events, ending resolver, linter)
> is a **pure, serializable, framework-agnostic TypeScript module** consumed *identically* by the player,
> the authoring tool, and CI. No engine logic is duplicated in any UI.

This single decision is what prevents the player and the authoring tool from drifting, lets the linter and
the AI-assist reason about exactly what the player will experience, and keeps the runtime testable in
isolation. It is the structural answer to the review's root cause.

---

## 4. Data-model deltas (vs v0.1 §19)

- **Node:** remove authoritative `time`; add optional `authorTimeHint` (editor-only, never read by logic).
- **Scheduled Event:** require `ifPresentNode`, `ifAbsentEffects`, and a reachable `recoveryNodeId`;
  engine fires on the accumulated clock, location-independent.
- **Ending:** move into an ordered resolver list with `priority`; conditions over state only; a `default`
  catch-all ending is mandatory.
- **Variable registry entry:** `name, type, default, singleSemanticPurpose, writerLabel`.
- **Choice:** may not target an ending node as `destination` (linter-enforced).

---

## 5. Revised staged build order (decomposed sub-projects)

The full product (runtime + authoring suite + AI flow utility + linter) is multiple subsystems; each gets
its own spec → plan → build cycle. We start at A and do not author into an engine that can't yet enforce
its own rules.

- **Sub-project A — Hardened Engine Core + Linter (headless, fully unit-tested).** Pure TS. The heart, and
  where every §1 fix lives. Tests for: condition eval, effects, engine-derived time, scheduled-event
  present/absent firing, ending-resolver exhaustiveness, and the three §2 checks.
  *Done when: the linter blocks a deliberately-broken chapter and passes a correct one.*
- **Sub-project B — Mobile-responsive Web Player + Debug Panel.** Thin UI over the core; localStorage
  saves; debug panel shows state, available/hidden choices + reasons, fired/upcoming events, reachable
  endings. *(Honors "mobile HTML view first; native later.")*
- **Sub-project C — Validation chapter.** Port the chosen sample to the hardened model and prove the thesis:
  the clock bites, the event fires present *and* absent, endings resolve from state, no prose-vs-flag lies.
- **Sub-project D — Authoring + Story-Flow Utility (graph, inspector, AI-assist).** Built last, on the
  proven core.

---

## 6. Success criteria (v1.1, supersedes v0.1 §23 where they conflict)

1. The clock **can** run out — linter-proven and felt in play.
2. A scheduled event fires whether or not the player is present, and the absent path leaves a recoverable
   clue at a reachable node.
3. Endings resolve from accumulated state with **no zero-match holes and no dead-code endings**.
4. No node narrates a flag that isn't set on the path that reached it.
5. The **same engine core** powers the player, the linter, and (later) the authoring tool.
6. A reviewer can play the validation chapter and feel reactivity on the **time and events** axes, not
   only the clue axis.
