# Engine v1.3 -- Numeric Clamping + Resource Primitive (Fork A) -- Design Spec

> **Status:** Implemented in v1.3 (2026-06-22). Approved direction: Fork A (focused resource primitive now,
> generalize later). Depends on nothing un-built; lands BEFORE the cave chapter is authored.
> **Supersedes** the provisional `docs/resource-primitive-and-clamping-proposal.md` (secondary decisions
> now resolved below).

## 1. Goal & scope

Two pieces of engine work, one sub-project, because they share machinery (a bounded number):

1. **Numeric clamping** -- enforce per-variable bounds the engine currently ignores. This is the single
   cross-cutting blocker the chapter audit raised against all three chapters.
2. **Resource primitive (lean, opt-in)** -- a first-class bounded quantity with optional auto-depletion
   and author-defined at-zero behavior, so authors get stamina/lamp/heat/heat-from-cops/fuel/air across
   genres without hand-wiring each one.

**Opt-in & non-breaking:** stories that declare no bounds and no resources behave exactly as today. The two
shipped chapters (Prater Line, sampleStory) declare neither, so they are untouched.

## 2. What the analysis actually found (engine vs not)

The chapter audit raised 16 blockers. Exactly **one class is an engine defect**; the rest are per-chapter
authoring/design fixes handled in the revise-to-epic pass (tracked in `docs/three-chapters-fix-worklist.md`):

| Finding | Engine? | Where addressed |
|---|---|---|
| Numeric vars never clamped to their `bound` (all 3 chapters) | **YES** | This spec, Part A |
| Resource-depletion need (cave) | **YES** (approved feature) | This spec, Part B |
| Event-routing footgun: recovery node shares event location (mob) | Optional lint | This spec, Part C (candidate) |
| Conditional effects "if X set Y" (cave) | **NO** -- convert to branching nodes | Chapter revision (kept OUT of engine to stay lean) |
| `change_location` never emitted (cave) | NO -- authoring | Chapter revision |
| Dead flag / unreachable ending (mob) | NO -- authoring | Chapter revision |
| EE-4 prose-vs-state lies (all 3) | NO -- authoring + human audit | Chapter revision + verify |
| Under-epic node counts (all 3) | NO -- content | Chapter revision |

**Key point:** we deliberately do NOT add a conditional-effect type, an OR operator, or other engine
surface for these. The engine stays small; the fixes live in the content. The only engine growth is
clamping (a correctness fix) and the resource primitive (an approved feature).

A prior round of engine issues (the 2026-06-18 team review) was already closed by the v1.2 hardening
(scheduled-events firing late, soft-lock false-negatives, 6 new lint rules, the productionized
state-space walker). Those are done; this spec is the next, narrower increment.

## 3. Grounding in the current code (verified 2026-06-21)

- `types.ts` `VariableDef` is `{ name, type, default, purpose, label? }` -- **there is no `bound` field
  today.** The chapter designs assumed one. So clamping starts by *adding* the field.
- `effects.ts` `applyEffect`/`applyEffects` are pure `(state, effect[]) -> state` and have **no access to
  bounds**. Clamping must thread a bounds map in.
- `engine.ts` applies effects in exactly the places we must clamp/deplete: `enter()` (entry effects +
  `checkScheduledEvents`) and `choose()` (choice effects). `enter()` already centralizes post-arrival
  logic (events fire from world-time here) -- the natural home for resource depletion + at-zero checks.
- `state.ts` `initState` seeds `vars` from `story.variables`; it will also seed resource start values.
- `scheduledEvents.checkScheduledEvents` applies `ifAbsentEffects` -- also needs the bounds map.

## Part A -- Numeric clamping

**Data model:** add optional bounds to `VariableDef`:
```ts
interface VariableDef { /* ...existing... */ min?: number; max?: number; }
```
(Chapter designs' `"0..4"` strings map to `{min:0, max:4}` at authoring time.)

**Engine:** the `GameEngine` builds a bounds map once at construction from `story.variables` (+ resources,
Part B): `Record<string, {min?:number; max?:number}>`. `applyEffect`/`applyEffects` gain an optional
`bounds?` param and clamp the result of `set` / `increment` / `decrement` for any field that has bounds:
`clamp(v, min ?? -Inf, max ?? +Inf)`. The engine passes `bounds` at all three apply sites (entry, choice,
absent-event). No bounds -> no clamping (back-compat; existing `effects.test.ts` stays green).

**Why it matters:** makes the state-space walker's tractability real -- a `0..4` var takes 5 values, not
unbounded -- so `capHit=false` is provable, and ending gates can't misfire on overshoot.

## Part B -- Resource primitive (lean)

**Data model:**
```ts
interface Resource {
  id: string;            // lives in WorldState.vars[id] as a number -> usable in any condition/effect
  label?: string;        // for the player meter
  min: number; max: number; start: number;
  depletion?: { everyMinutes: number; amount: number };  // present => time-driven (recomputed from the clock)
  atZero?: { ending?: string; setFlag?: string };
  hidden?: boolean;      // omit from the player meter (still shown in debug)
}
interface Story { /* ...existing... */ resources?: Resource[]; }
```

**Two depletion modes (chosen for walker-friendliness) — as shipped in v1.3:**
- **Time-driven** (has `depletion: { everyMinutes, amount }`): the engine *recomputes* the value each step as
  `clamp(start - amount * floor((time - startTime) / everyMinutes), min, max)`. It is a pure function of the
  clock -> **adds no new walker dimension** (the cave's dying lamp is free). Choice effects may NOT modify
  a time-driven resource (it is a gauge of time); the linter enforces this (`RESOURCE_TIME_DRIVEN_WRITTEN`).
- **Choice-driven** (no `depletion`): a stored value, changed by effects, clamped to `[min,max]`. Adds a
  *bounded* walker dimension. (A per-node auto-decrement mode is deferred — see §6.)

**At-zero behavior** fires once when a resource reaches `min`, evaluated in `enter()` after depletion:
- `ending: <id>` -> resolve to that ending immediately (new resolution trigger alongside deadline /
  `resolvesEnding`). The cave's lamp: `atZero:{ending:'ending_cave_keeps_you'}` -- dark = death,
  deterministically at the computable moment the lamp dies.
- `setFlag: <name>` -> set a boolean other content reacts to.
- (An arbitrary at-zero `effect` is deferred — see §6.)
- **Default (omitted): none** -- authors gate risky choices via a normal condition on the resource
  (`{field:'lamp_charge', op:'gt', value:'0'}`). (Revised from the proposal's "block": conditions already
  express blocking precisely; an ill-defined automatic "block" is not worth the magic.)

**initState** seeds `vars[r.id] = r.start` for each resource. **Bounds map** includes each resource's
`{min,max}` so Part A clamping covers resources automatically.

## Part C -- Linter additions (build-blocking unless noted)

- Resource sanity: `min < max`, `start in [min,max]`, `depletion.amount > 0`, `atZero.ending` exists and is
  reachable, `atZero.setFlag` declared, a time-driven resource is never targeted by an effect.
- Out-of-range authored value (`set` to 9 on a `0..4` var) -> **warning** (not error).
- **(Candidate, optional)** event-routing footgun warning: a scheduled event whose `recoveryNodeId` (or an
  always-reachable hub) sits at `eventLocation` such that entering it post-trigger re-routes into
  `ifPresentNode`. Catches the mob chapter's class of bug for all future chapters. Defer if not cheap.

## 4. Player / debug

- Debug panel: list resources with value / max. Player: render a labeled meter per non-`hidden` resource;
  no new layout required, reuse the status strip. Entirely optional per resource.

## 5. Walker / verification

- Time-driven resources: no new dimension (function of time). Choice-driven: bounded by clamping.
- Re-run `walkStateSpace` on a resource-bearing fixture and confirm `capHit=false`, no orphan endings, and
  that an `atZero:{ending}` resource produces a reachable ending the walker reports.

## 6. Non-goals (v1)

Regeneration via negative time-drain (restore is via explicit `increment` effects only); a resource that is
*both* time- and choice-driven (additive-offset model -- v2); the unified "pressure systems" / flexible
time-gate generalization (Fork B -- deferred by decision); any new condition/effect operators.
Per-node depletion (`per:'node'` fixed decrement on every scene enter) -- deferred; per-node depletion
is not in v1.3. An arbitrary at-zero `effect` (run one Effect when a resource hits zero) -- deferred;
`atZero` supports only `ending` and `setFlag` in v1.3.

## 7. Testing (TDD)

- Clamping: increment past max caps; decrement past min floors; `set` out of range clamps; no-bound
  passthrough unchanged; existing `effects.test.ts` stays green.
- Resource: time-driven recompute at several clock points; `per:'node'` decrement; choice spend/restore +
  clamp; `atZero:{ending}` fires deterministically; `atZero:{setFlag}` sets; resource usable in a condition.
- Engine: a small resource fixture story plays to the lamp-death ending and to a survive ending.
- Linter: each new rule has a failing + passing case.
- Walker: fixture confirms tractability claims.

## 8. Done-when

`tsc` + `vite build` clean; all existing 139 tests green; new tests green; a resource fixture lints clean,
walks with `capHit=false`, and reaches its `atZero` ending; the two shipped chapters are byte-for-byte
unaffected. Then: write the implementation plan (writing-plans) and build via subagent-driven-development.
