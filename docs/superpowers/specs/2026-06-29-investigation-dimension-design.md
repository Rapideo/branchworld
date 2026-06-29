# The Investigation Dimension (Scene Examination) — Design

> Engine capability spec. The **third profile dimension** — and the **second of the two new dimensions** the
> engine-first call finishes before the D2 prototype corpus (`investigation: 'off' | 'on'`). When `'on'`, the
> engine surfaces author-declared **examinable
> hotspots** on a node and injects a one-shot "examine ⟨hotspot⟩" choice per hotspot — scene-exploration becomes
> a first-class, engine-run loop on top of the clue primitive that already exists. Opt-in: `investigation:'off'`
> (every existing game) is behaviorally inert. Approved 2026-06-29 (brainstorm).
>
> **The five locked design forks (brainstorm, 2026-06-29):**
> 1. **Core job = a new interaction class** (examine-injection, the travel-parallel), *not* a pure verification
>    layer over hand-authored clues.
> 2. **Examinable shape = inline reveal** — the hotspot carries its reveal prose + effects and resolves *in
>    place*; routing to a discovery node (`revealNode`) is **deferred** (the "C" of fork 2).
> 3. **Clock interaction = verify-and-permit** — examinables may carry a `minutes` cost; `investigation:'on'`
>    composes with `clock:'timed'`, and the verifier *proves completability within the deadline* rather than
>    forbidding the pair. **No `incompatiblePairs` forbid is added** (still gated on the corpus).
> 4. **The completability obligation is derived** — `∃` a non-default `has_clue`-gated ending reachable within
>    the deadline. No new authoring surface (read from the ending gates already there). Explicit `required:`
>    contracts are **deferred** (the "B" of fork 4).
> 5. **`investigation` + `travel` is fenced off in v1** (the safer route) — `INVESTIGATION_WITH_TRAVEL_UNVERIFIED`
>    (error). Standalone investigation is fully supported (incl. multi-chapter, since clues already carry); the
>    roam-mystery combination is built after the corpus shows demand.

## Context

The roadmap's capability, **clue-finding / scene-exploration**, sits on a primitive the engine *already ships*:
`WorldState.clues: string[]`, the `add_clue`/`remove_clue` effects, the `has_clue` condition, the `discovery`
node type, and the `DEAD_CLUE_REFERENCE` lint that already catches a `has_clue` gate for a clue nothing produces.
So — exactly as `travel:'free'` added hub-injected navigation **on top of** the long-dormant `Location` graph —
`investigation:'on'` must add something *on top of* clues-as-strings, or it is a no-op. What it adds is the
**examine loop**: the author declares *which things in a scene are searchable and what each yields*, and the
engine runs the "look at the desk → you find the receipt → the desk is now searched" interaction, injecting and
retiring the search choices itself. That is the dimension earning its keep as a *mechanic*, not a lint.

**The central simplification (verified in code, 2026-06-29).** `walkStateSpace` does not read the story's static
`node.choices`; it **plays the real engine** — `snapAt` constructs a `GameEngine(story)`, calls `eng.choose(id)` /
`eng.start()`, and walks `cur.view.choices` (`stateSpaceWalk.ts:61-66, 124-135`). So **any choice the engine
injects in `view()` is walked for free**, with the engine's real `choose()`/ending semantics. This is why
`travelHops`/`travelNodeEdges` feed only the *static* linter (`computeReachable`, which *does* read `node.choices`
directly) and never the walker. The consequence for investigation is large: once `view()` injects `__examine_`
and `choose()` handles it, **the exhaustive walker needs zero changes** — examination, its time costs, and its
effect on ending-reachability are all walked by construction. Investigation is therefore a markedly *lighter*
build than travel: no roam-mode walker surgery, no time-bucketing, no co-reachability/`deadRegions`, no
full-forward-edge recording, no finiteness lint family.

**A note on "byte-identical."** Adding the dimension changes `DEFAULT_PROFILE` from `{clock:'timed', travel:'off'}`
to `{clock:'timed', travel:'off', investigation:'off'}`. Runtime behavior for every existing game is unchanged
(nothing is injected), but the *resolved-profile object shape* changes — so the claim is **behaviorally inert**,
not byte-identical. `profile.test.ts`'s assertions that pin the resolved object must gain `investigation:'off'`;
the build must not read that churn as a regression.

## The mechanic — engine-generated examination

The profile gains **`investigation: 'off' | 'on'`** (default `'off'`). The carrier is a new optional field on
`StoryNode`:

```ts
interface Examinable {
  id: string;                 // hotspot id; the injected choice is `__examine_<id>` (node-scoped uniqueness)
  label: string;             // "Search the desk"
  clue: string;              // the clue added when taken (the payoff)
  reveal: string;            // prose surfaced (to the log) when taken
  minutes?: number;          // optional time cost; meaningful only under clock:'timed' (monotonic, ≥ 0)
  conditions?: Condition[];  // optional extra gate (e.g. needs a key clue first)
}
// StoryNode gains:  examinables?: Examinable[]
```

When `investigation:'on'`:

- **Availability is state-driven and self-hiding.** At the current node, the engine injects one
  `__examine_<id>` choice per examinable whose **clue is not yet held** *and* whose `conditions` (if any) pass:
  available iff `!state.clues.includes(ex.clue) && evaluateConditions(ex.conditions, state)`. Keying availability
  on `!has_clue(clue)` makes examining **idempotent** (find the receipt by any means and the desk stops offering
  it) and the search loop trivially **monotonic** — each hotspot contributes at most one clue bit, then retires.
- The injected choice id is **`__examine_<id>`**. The `__` prefix is already reserved and guarded for `Choice`
  ids (`RESERVED_CHOICE_ID`, `linter.ts:124-128`) — that guard already forbids an authored collision; no new
  reserved-prefix machinery is needed (the travel build installed it).
- **`choose()` recognizes a `__examine_` id *before* its "unknown choice" throw**, mirroring the existing
  `parseTravelDest` seam (`engine.ts:108-109`). On a valid examine id it **validates** (`investigation:'on'`; the
  hotspot exists on the current node; its clue isn't already held; its `conditions` pass), then applies the
  examine effects — **`add_clue` + optional `add_minutes`** — pushes `reveal` to the `log`, and **stays on the
  same node** so the player keeps searching. A malformed/illegal examine id throws an *investigation-specific*
  error, not the generic one.
- **Examine must "settle" the node without re-arriving.** Advancing the clock by `minutes` can cross the
  deadline, fire a time-triggered `ScheduledEvent`, or step a depleting resource — all of which the engine
  currently runs in `enter()`'s **tail** (`engine.ts:49-70`: `checkScheduledEvents` + possible routing,
  `applyResourceStep`, unified ending resolution). Examine must run that **same tail** so a search that runs you
  out of time ends the game honestly — but it must **not** re-run the node's `entryEffects` or re-mark it
  `visited` (you examined a thing; you did not re-enter the scene). So `enter()`'s tail is factored into a
  reusable **`settle(id)`** step: `enter(id)` = set `currentId` + mark visited + apply `entryEffects` +
  `settle(id)`; **examine** = apply the examine effects + `settle(currentId)`. This is the one real engine
  surgery the dimension needs, and it is soundness-bearing (the deadline/event/resource tail must fire on
  examine-time).
- **Coexists with hand-authored clue-finding; does not replace it.** An author may still plant clues via
  `add_clue` effects on ordinary choices/entry-effects/events. Examinables are *additive*: the lightweight "look
  at the thing, get the clue, keep searching" primitive. Anything that needs real branching off a discovery is a
  normal authored choice/`discovery` node — that is the `revealNode` case deliberately deferred (fork 2).
- With `investigation:'off'`, the engine injects nothing; any `examinables` on nodes stay inert (a warning flags
  the likely-forgotten toggle). Snapshot/restore is unaffected — injected choices are derived from `state.clues`
  + the node's static `examinables` at `view()` time, never stored in `WorldState`.

## Verification — the walker rides the engine; completability rides the walk

`investigation:'on'` requires **no `walkStateSpace` mode and no walker changes**. Because the walker plays the
real engine (Context, above), it already explores every injected examine choice, pays each `minutes` cost, and
sees the resulting ending-reachability. The dimension's two real verification questions are answered by the data
the existing walk already produces:

### Finiteness is free (no bucketing, no time-drop, no co-reachability)

Roam needed special keying because A→B→A→B farms unbounded distinct states. Examination cannot: each hotspot is
taken **at most once** (it self-hides on `!has_clue`), clues only accumulate, and examining **does not move you**
(no inter-node cycle is created by examining). Under `clock:'timed'`, accumulated `time` is bounded by the
deadline (past it, the engine resolves an ending), so the timed state space is finite; under `clock:'untimed'`,
the existing non-roam key applies unchanged. The walker's existing key already includes `clues` (sorted) and
`time` — the only fields examine writes — so examine states are deduped correctly with **no new keying logic**.
The roam finiteness-lint family (`ROAM_UNBOUNDED_HUB_WRITE` et al.) has **no analogue here** and is not added.

### Timed completability — derived, exhaustive, and honest to real ending semantics

Per fork 4, the obligation under `clock:'timed'` is: **`∃` a non-default, `has_clue`-gated ending that is
reachable within the deadline.** This is *already* what the exhaustive timed walk computes. The walker reaches an
ending iff some play resolves to it before the deadline forces resolution, populating `reachedEndings` (and its
complement `orphanEndings`) via the engine's **actual** `resolveEndingAt` precedence
(`node-named > priority[state+atZero] > out-of-time > default`). So:

- **The completability set** = non-default endings carrying at least one `has_clue` condition (derived from the
  gates already there — no new authoring surface, matching `DEAD_CLUE_REFERENCE`'s "read intent from the gates"
  approach).
- **Completable** iff *some* member of that set is **not** in `report.orphanEndings`.
- **`INVESTIGATION_DEADLINE_UNREACHABLE` (error)** fires when the set is non-empty and **every** member is
  orphaned in the timed walk — i.e. no clue-gated success is reachable in time. The message names the deadline
  window and points at the examine costs as the likely cause, so the author can't mistake it for generic
  orphan-ending noise.

Deriving completability **from the walk** (rather than a hand-rolled minimum-examine-time path search) is not
just simpler — it is *more correct*: it uses the engine's real ending-resolution precedence, so it never
disagrees with what the player can actually reach. A separate time-budget computation could certify an ending the
resolver would actually shadow, or vice versa.

**Honest scope (stated so the Team can pressure-test it, and so the guide can be candid).** This proves *winning
is structurally possible under the clock* — not that the **maximally-thorough** player can always win. A game in
which examining *every* hotspot blows the deadline, but examining the *load-bearing* ones leaves time to win, is
**completable and passes** — "you cannot do everything; choose what to examine" is a legitimate, often desirable
mystery design, and fork 4 deliberately chose this minimal honesty over the stricter "all-thorough-paths-win"
property (which would outlaw red-herrings). The guide must teach this directly.

### A capped walk is indeterminate for completability

`walkStateSpace` caps the frontier and reports `capHit`. On a capped walk, an ending can look orphaned merely
because its path lay beyond the frontier — so completability **cannot be certified under `capHit`**.
`verifyInvestigation` treats `capHit` as **indeterminate → fail** (mirroring `verifyRoam`'s no-silent-cap rule),
never an all-clear. (Timed investigations are bounded by the deadline and rarely approach the cap, but the rule
holds regardless.)

### `verifyInvestigation` — the single gate

Mirroring `verifyRoam`, one call couples the static lints + the walk + the investigation pass/fail into a single
sound certificate the author cannot misread:

```ts
verifyInvestigation(story, opts?): { ok, report, issues }
  // issues = lintInvestigation(story, resolveProfile(story))   — static checks (fence + hygiene)
  // report = walkStateSpace(story)                              — examination walked for free
  // completable: clock !== 'timed' OR clueGatedSet is empty OR some member ∉ report.orphanEndings
  //   (empty set ⇒ vacuously completable — nothing to prove; matches INVESTIGATION_DEADLINE_UNREACHABLE's
  //    non-empty guard, so a timed game with no clue-gated endings is NOT failed)
  // ok = issues(error).length === 0 && !report.capHit && report.softlocks.length === 0 && completable
```

`ok === true` is independent of whether the author ran the static lints separately — the same property
`verifyRoam.ok` has. (The walk's existing `softlocks` result already catches the "examine-only scene with no real
exit, exhausted, now stuck" failure, since the injected examine choices vanish once their clues are held and the
walker then sees zero available choices.)

## Compatibility, lints, and placement

### The v1 fence — `investigation` + `travel`

Per fork 5 (the safer route), the roam-mystery combination is **not** supported in v1:

- **`INVESTIGATION_WITH_TRAVEL_UNVERIFIED` (error).** A story (or chapter) whose resolved profile has **both**
  `investigation:'on'` and `travel:'free'` is rejected. Rationale: examine composes with the *engine* trivially,
  but the three-way **timed × roam × investigation** verification interaction is the most complex corner in the
  engine, and we chose to prove demand on the corpus before paying for it. Lifted when a real roam-mystery game
  appears (Out of scope).

### Compatibility stays *requirements*, not forbids — `incompatiblePairs` is still empty

Consistent with the travel rev-2 reframe: dimensions carry **per-dimension requirements** the framework enforces,
not binary cross-dimension forbids. `investigation:'on'` ⇒ **requires** producible examinable clues, the examine
`settle` semantics, and (timed) **completability verification**. These are requirements, not a forbid —
investigation composes with both clock values. So **investigation adds nothing to `incompatiblePairs` (it stays
empty)**; the hook's fate remains gated on the D2 corpus. The fence above is a *single-pair v1 build boundary*
(`INVESTIGATION_WITH_TRAVEL_UNVERIFIED`), enforced as a lint — **not** an entry in the `incompatiblePairs` forbid
hook, and not a claim that the two dimensions are semantically incompatible.

### The static linter needs only the clue-symbol fix (not travel-style reachability surgery)

Travel forced `computeReachable`/`NO_EXIT` to learn injected edges because travel choices **move** the player, so
reachability genuinely depended on them. Examine choices are **self-loops** — they reach no new node — so
`computeReachable` needs **no** investigation-awareness, and `NO_EXIT` correctly continues to require a *real*
authored/travel exit (an examine-only scene with no real exit is genuinely a dead end). The **one** static change
that prevents false positives:

- **`symbols.ts` — `producibleClues` must include every examinable's `clue`.** Today `collectSymbols` scans only
  `add_clue` *effects* (`symbols.ts:33-35`). An examinable produces its clue at runtime via the engine, not via a
  static `add_clue`, so without this fix a `has_clue` gate satisfied *only* by examining would wrongly trip
  `DEAD_CLUE_REFERENCE`, and a real exit choice gated on such a clue would wrongly trip `SOFT_LOCK` /
  `staticallyDeadChoice` (`linter.ts:48, 157, 168`). Adding examinable clues to `producibleClues` fixes all three
  in one place — this is the load-bearing static change, and the legitimate "examine to unlock the exit" pattern
  lints clean once it lands.
- **`checkConds` / `checkTimeDeltas` must also sweep `examinable.conditions` / `examinable.minutes`** so a typo'd
  var in a hotspot gate is `UNDEFINED_VAR`'d and a negative `minutes` trips `NEGATIVE_TIME_DELTA` (monotonic
  time), exactly as for choices today.

### The investigation lints (`investigationLint.ts`, mirrors `travelLint.ts`, merged into `lintStory`)

All fire only when `investigation:'on'` unless noted:

- `INVESTIGATION_WITH_TRAVEL_UNVERIFIED` (error) — the v1 fence (resolved profile has both dimensions on).
- `EXAMINE_DUPLICATE_HOTSPOT` (error) — two examinables share an `id` on one node (the injected ids would
  collide).
- `EXAMINE_EMPTY_CLUE` (error) — an examinable has no `clue` (nothing to find; a slip).
- `EXAMINE_ON_TERMINAL_NODE` (warning) — an examinable on a node that resolves an ending (`resolvesEnding`/
  `endsWith`): the injected choice is dead (the ending resolves on entry). Mirrors `TRAVEL_HUB_IS_TERMINAL`.
- `EXAMINE_CLUE_UNUSED` (warning) — an examinable's `clue` is read by no `has_clue` condition anywhere (a
  dead-end clue — the inverse of `DEAD_CLUE_REFERENCE`). Catches a hotspot wired to nothing downstream.
- `INVESTIGATION_MINUTES_UNTIMED` (warning) — `minutes` set on an examinable under `clock:'untimed'` (inert; it
  advances `state.time` but nothing reads it). Mirrors the `PROFILE_UNTIMED_HAS_*` family.
- `EXAMINABLES_IGNORED` (warning) — a node declares `examinables` but the resolved profile is
  `investigation:'off'` (the hotspots are inert; a likely-forgotten toggle). Mirrors `TRAVEL_GRAPH_IGNORED`.

`INVESTIGATION_DEADLINE_UNREACHABLE` (error) is produced by the **walk** (it needs the timed reachability result),
surfaced through `verifyInvestigation` — not a pure-static lint.

### The container must not let `investigation` inherit silently (mirrors `ROAM_CHAPTER_PROFILE_MISSING`)

`GameEngine` reads only `story.profile` at runtime; `GameRunner`/`seedChapterStory` do not plumb `Game.profile`
into the engine. So a `Game` declaring `profile.investigation:'on'` with a bare chapter would inject **no
examination at runtime, with no error** — the exact silent-failure travel hit:

- **`INVESTIGATION_CHAPTER_PROFILE_MISSING` (container error).** When a game resolves to `investigation:'on'`,
  each investigation chapter's own `story.profile` must declare `investigation:'on'`.

**No carry fence is needed.** Unlike roam, standalone investigation is single-chapter-*free*: clues are already a
carried primitive (`carry.clues`), examination is finite per-chapter, and nothing in the examine loop touches the
cross-chapter verification path. Multi-chapter investigation is **supported** — the payoff of choosing fork 5's
safer route (without travel in the mix, the carry story stays verifiable by the existing container checks).

### Placement (each unit self-contained, testable alone)

- **`src/engine/types.ts`** — `Examinable` interface; `StoryNode.examinables?: Examinable[]`;
  `Profile.investigation?: 'off' | 'on'`.
- **`src/engine/investigation.ts`** (new, mirrors `travel.ts`) — `EXAMINE_PREFIX = '__examine_'`,
  `examineChoiceId`, `parseExamineTarget`, `examinablesAt(node, state)` (the `!has_clue` + conditions filter, in
  declared order), `examineEffects(ex)` (`add_clue` + optional `add_minutes`).
- **`src/engine/profile.ts`** — `investigation?` on `Profile`; an `investigationDimension` (id `'investigation'`,
  values `['off','on']`, default `'off'`, `validate: () => []` — real lints live in `investigationLint.ts`, as
  for travel) pushed to `DIMENSIONS`. `DEFAULT_PROFILE` gains `investigation:'off'` (derived). Update
  `profile.test.ts` resolved-object assertions.
- **`src/engine/engine.ts`** — factor `enter()`'s tail into `settle(id)`; `view()` injects `__examine_` choices
  at the current node when `investigation:'on' && !this.ending`; `choose()` gains the `__examine_` branch
  **before** the unknown-choice throw, validating then applying examine effects + `settle(currentId)` (no
  re-enter). Reads the resolved profile + the node's `examinables`; no `Story`/`WorldState` mutation.
- **`src/engine/symbols.ts`** — `producibleClues` includes examinable `clue`s (the load-bearing static fix).
- **`src/engine/linter.ts`** — extend `checkConds`/`checkTimeDeltas` to sweep `examinable.conditions`/`minutes`;
  call `lintInvestigation(story, profile)` merged into `lintStory` (alongside `lintTravel`).
- **`src/engine/investigationLint.ts`** (new) — `lintInvestigation(story, profile)`: the fence + hygiene lints
  above.
- **`src/engine/stateSpaceWalk.ts`** — `verifyInvestigation(story, opts)`: the thin gate (static lints + walk +
  completability + `capHit`-is-indeterminate). **No `walk()` changes.**
- **`src/container/lintGame.ts`** — `INVESTIGATION_CHAPTER_PROFILE_MISSING` (investigation chapter must declare
  `investigation:'on'`). No carry fence.

## Verification (tests)

- **An investigation reference game** `src/container/investigationExample.ts` — a single-location mystery (e.g.
  "The Locked Study": a study node with ~4 examinables — desk→`receipt`, painting→`safe_combo`,
  ashtray→`cigar_brand`, ledger→`ledger_gap`), built to be a *game*, not plumbing:
  - **Accusation endings gated on clue combinations** — the "correct accusation" ending gates on the
    load-bearing clues (`has_clue` on each); a wrong/again-default accusation otherwise. The map of clues to
    endings is load-bearing.
  - **A timed variant and an untimed variant.** The timed variant carries `minutes` costs and a deadline tight
    enough that `verifyInvestigation` must *prove* the accusation is still reachable in time (a non-trivial
    completability pass, not a vacuous one).
  - **A negative `INVESTIGATION_DEADLINE_UNREACHABLE` fixture** — a copy whose examine costs (or deadline)
    make *every* clue-gated success ending orphaned in the timed walk, so the completability error has something
    to bite on.
  Proves: the engine injects an examine choice per available hotspot; taking one adds the clue, surfaces the
  reveal, pays `minutes`, and retires that hotspot while leaving the player in the scene; a held-clue hotspot is
  not re-offered; `settle` fires the deadline/resource/event tail on examine-time (a deliberately tight timed
  fixture ends the game mid-search when a costly examine crosses the deadline); a `GameRunner` plays an examine
  path to the correct accusation; `verifyInvestigation().ok === true` on the clean timed + untimed variants.
- **The investigation lints** — each bites on a malformed story (`EXAMINE_DUPLICATE_HOTSPOT`,
  `EXAMINE_EMPTY_CLUE`, `EXAMINE_ON_TERMINAL_NODE`, `EXAMINE_CLUE_UNUSED`, `INVESTIGATION_MINUTES_UNTIMED`,
  `EXAMINABLES_IGNORED`, `INVESTIGATION_WITH_TRAVEL_UNVERIFIED`); a clean investigation game lints clean (the
  no-false-positive gate).
- **The clue-symbol fix** — a `has_clue` ending/choice gate satisfied *only* by an examinable lints **clean**
  (no `DEAD_CLUE_REFERENCE`); the "examine to unlock the only exit" node lints clean (no `SOFT_LOCK`). A
  regression guard: removing the `symbols.ts` fix re-introduces both false positives.
- **Completability** — the tight-but-solvable timed variant reports the clue-gated accusation ending as
  reachable (`verifyInvestigation().ok === true`); the negative fixture reports
  `INVESTIGATION_DEADLINE_UNREACHABLE` and `ok === false`; an oversized fixture that trips `capHit` is
  **indeterminate → fail**, not a clean pass.
- **The fence** — `INVESTIGATION_WITH_TRAVEL_UNVERIFIED` bites on a story resolving to both dimensions on; an
  investigation-only and a travel-only game each lint clean (no false positive on the supported shapes).
- **The container profile-missing lint** — `INVESTIGATION_CHAPTER_PROFILE_MISSING` bites on an
  `investigation:'on'` game with a bare chapter; a correctly-stamped multi-chapter investigation game lints
  clean (multi-chapter investigation is supported).
- **Backward-compat** — `investigation:'off'` (cave, heist, the untimed/roam examples) is **behaviorally
  inert**: nothing injected, the engine and walker run as today. `profile.test.ts` resolved-object assertions
  updated to include `investigation:'off'`; **all other existing tests stay green**.
- **An authoring guide** `docs/authoring/investigation.md` — the examinable shape (hotspot = label + clue +
  reveal + optional minutes/conditions), the self-hiding `!has_clue` rule, the coexist-with-authored-clues rule,
  the **settle-on-examine** semantics (a costly examine can end a timed game), the **completability** guarantee
  *and its honest scope* (winning is structurally possible — not that examining everything always wins; design
  red-herrings deliberately), the examine-only-scene-needs-a-real-exit rule, and the v1 travel fence. Full
  `npx vitest run` green + `npx tsc --noEmit` clean.

## Out of scope (deferred / parked)

- **`investigation` + `travel` (the roam mystery)** — fenced in v1 by `INVESTIGATION_WITH_TRAVEL_UNVERIFIED`;
  built when the D2 corpus shows demand and the timed × roam × investigation verification is proven (lifting the
  fence).
- **`revealNode` routing (fork 2's "C")** — a hotspot that navigates into an authored discovery sub-scene with
  its own choices; v1 examinables resolve *in place*. Use a normal authored choice for branching for now.
- **Explicit required-set contracts (fork 4's "B")** — `required: true` on examinables / a `Story`-level required
  list; v1 derives the completability set from `has_clue` ending gates. Added if the corpus needs author-pinned
  thoroughness.
- **Clue combination / deduction** (fork 1's "C") — clues combining into derived knowledge ("receipt + timetable
  ⇒ the alibi is false"); v1 clues stay independent bits.
- **An `all_examined` convenience predicate** — a scene-level "found everything here" condition op; v1 gates on
  individual `has_clue`s (which already express it).
- **Plumbing inherited `Game.profile` into `GameEngine`** — the lint (`INVESTIGATION_CHAPTER_PROFILE_MISSING`)
  covers the gap for v1; the runtime-inheritance refactor is a separate, broader change shared with travel.
- **Examine reveal as a first-class presentation surface** — v1 routes `reveal` text to the existing `log`
  channel; rich per-hotspot presentation is a WS-G (front-end) concern.
- **The D2 prototype corpus** — after this, the second dimension, ships; it also decides the fate of
  `incompatiblePairs`.
