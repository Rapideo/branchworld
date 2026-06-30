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
>
> **Rev 2 (2026-06-29)** — after a **five-lens Team deep dive** (engine-integration, verification-rigor,
> design-completeness, strategic engine-value, player/authoring-feel). Verdict: the design is **sound, correctly
> scoped, and genuinely lighter than travel** (no lens asked for a rewrite), but the verification *argument* was
> under-built. Fixes folded in: **(P0)** completability must certify **gate-satisfaction at the certifying
> terminal**, not bare `reachedEndings` membership — the node-named `endsWith` resolver path ignores an ending's
> conditions (`endingResolver.ts:24-27`), so id-membership yields a false all-clear; **(P1)** `timeBounds`/
> `CLOCK_CANNOT_BITE` must count examine `minutes` into `maxTime` (else it false-positives the flagship timed
> design); the lint sweep is **four** condition passes, not two; `INVESTIGATION_DEADLINE_UNREACHABLE` needs an
> explicit return channel; the `symbols.ts` clue fold-in must be **profile-gated**; **(P2)** drop time for **all**
> untimed walks to make finiteness truly airtight; `settle` runs on *every* examine and preserves full `enter()`
> on event-routing. **Two decisions locked (Matthew):** (a) the runtime profile-inheritance gap is fixed at the
> **root** (`seedChapterStory` stamps the resolved profile) as a **small container-only step *before*** this
> build — so investigation writes **zero** `*_CHAPTER_PROFILE_MISSING` paper; (b) multi-chapter completability is
> **document-only** (authors run `verifyInvestigation` per chapter, parity with `verifyRoam` — `lintGame` stays
> static). Strategic call: **bundle no broader engine cleanup** here; walk-unification / `adjust_resource` /
> `incompatiblePairs` fate are corpus-gated.

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
  Injected examine choices are **appended after** the node's authored choices in `view()`, in `examinablesAt`
  declared order (mirrors the travel injection; matters for any front-end selecting choices by index).
- The injected choice id is **`__examine_<id>`**. The `__` prefix is already reserved and guarded for `Choice`
  ids (`RESERVED_CHOICE_ID`, `linter.ts:124-128`) — that guard already forbids an authored collision; no new
  reserved-prefix machinery is needed (the travel build installed it).
- **`choose()` recognizes a `__examine_` id *before* its "unknown choice" throw**, mirroring the existing
  `parseTravelDest` seam (`engine.ts:108-109`). On a valid examine id it **validates** (`investigation:'on'`; the
  hotspot exists on the current node; its clue isn't already held; its `conditions` pass), then applies the
  examine effects — **`add_clue` + optional `add_minutes`** — pushes `reveal` to the `log`, and **stays on the
  same node** so the player keeps searching — *unless* the time-advance fires a `ScheduledEvent` that routes the
  player elsewhere (see settle, below). A malformed/illegal examine id throws an *investigation-specific* error,
  not the generic one.
- **Examine must "settle" the node without re-arriving.** Advancing the clock by `minutes` can cross the
  deadline, fire a time-triggered `ScheduledEvent`, or step a depleting resource — all of which the engine
  currently runs in `enter()`'s **tail** (`engine.ts:49-70`: `checkScheduledEvents` + possible routing,
  `applyResourceStep`, unified ending resolution). Examine must run that **same tail** so a search that runs you
  out of time ends the game honestly — but it must **not** re-run the node's `entryEffects` or re-mark it
  `visited` (you examined a thing; you did not re-enter the scene). So `enter()`'s tail is factored into a
  reusable **`settle(id)`** step: `enter(id)` = set `currentId` + mark visited + apply `entryEffects` +
  `settle(id)`; **examine** = apply the examine effects + `settle(currentId)`. This is the one real engine
  surgery the dimension needs, and it is soundness-bearing (the deadline/event/resource tail must fire on
  examine-time). Three load-bearing details for the implementer: **(1)** `settle` runs on **every** examine,
  including zero-`minutes` ones — `checkScheduledEvents` can fire on a `has_clue` trigger with no clock advance,
  so an "only settle when minutes were added" shortcut would skip it. **(2)** Inside `settle`, the event-routing
  branch (`res.routedNodeId !== currentId`) must still perform a **full `enter()`** of the routed node
  (re-applying *that* node's `entryEffects`), identical to a choice-driven event — only the examiner's *own* node
  is spared re-entry; the integration trace confirmed this factoring is behavior-preserving for `enter()` itself.
  **(3)** `GameEngine.settle` is a distinct method from the existing `GameRunner.settle` (chapter transitions) —
  name it deliberately; no conflict, different class.
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

Roam needed special keying because A→B→A→B farms unbounded distinct states. Examination is far better-behaved:
each hotspot self-hides on `!has_clue`, and examining **does not move you** (no inter-node cycle is created by
examining). What actually **guarantees** finiteness, precisely stated (the rev-1 "monotonic, taken once" framing
was *almost* right but overstated the reason — an authored `remove_clue` of an examinable's clue can re-open the
hotspot, `effects.ts:42-43`):

- Under **`clock:'timed'`**, accumulated `time` is bounded by the deadline (past it, the engine resolves an
  ending), so the timed state space is finite **regardless** of `remove_clue` re-examination — the deadline, not
  monotonicity, is the guarantor.
- Under **`clock:'untimed'`**, the fix is a one-liner that makes the claim genuinely airtight: extend the
  time-drop in `timeKeyFor` (`stateSpaceWalk.ts:53-57`) from `roam && untimed` to **all `untimed`**. This is
  sound because `clock:'untimed'` already forbids every clock-reading condition
  (`PROFILE_UNTIMED_HAS_TIME_CONDITION`, `profile.ts:49`), so nothing branches on `time`; dropping it from the
  key collapses a `remove_clue`→re-examine→`+minutes` loop to a finite set **and** speeds every existing untimed
  walk (this is the long-deferred untimed walker-key optimization NextSteps already noted). Without it, that loop
  would farm raw-time states until `capHit` — caught **loudly** by `!report.capHit`, so never a *silent*
  unsoundness, but better to make it impossible.

The walker's existing key already includes `clues` (sorted) and `time` — the only fields examine writes — so with
that one-liner examine states dedupe correctly with **no other keying logic**. The roam finiteness-lint family
(`ROAM_UNBOUNDED_HUB_WRITE` et al.) has **no analogue here** and is not added.

### Timed completability — derived, exhaustive, and honest to real ending semantics

Per fork 4, the obligation under `clock:'timed'` is: **`∃` a non-default, `has_clue`-gated ending the player can
reach *while actually holding its gating clues*, within the deadline.** The exhaustive timed walk has the data —
but the certificate must read it correctly. **The P0 the verification lens caught:** bare ending-id membership in
`reachedEndings` is **not** a sound proxy, because `resolveEndingAt`'s **node-named `endsWith` path returns the
ending ignoring its own conditions** (`endingResolver.ts:24-27`). So an accusation node wired
`endsWith:'butler_guilty'` records `butler_guilty` as reached on a **clueless, in-time** play — even when every
play that genuinely holds the gating clues blows the deadline. Membership-based completability would call that
game `ok` while the clue-gated win is unreachable-with-clues-in-time. So:

- **The completability set** = non-default endings carrying at least one `has_clue` condition (derived from the
  gates already there — no new authoring surface, matching `DEAD_CLUE_REFERENCE`'s "read intent from the gates"
  approach).
- **Certify on gate-satisfaction at the certifying terminal, not id-membership.** The walk derives a
  **`satisfiedEndings`** set: an ending `E` is satisfied iff some reached **terminal** state actually passes
  `evaluateConditions(E.conditions, terminal.state)` — re-evaluating the gate on the terminal, exactly the
  pattern `findEndingAmbiguities` already uses (`stateSpaceWalk.ts:193-194`). This closes the `endsWith` leak:
  the clueless terminal does not satisfy `E.conditions`, so it does not count. (Completeness — the reverse
  direction — was verified clean: the state-match resolver path *does* evaluate conditions, so a genuinely
  reachable clue-gated win is always found and certified.)
- **Completable** iff the set is empty (nothing to prove) **or** `clueGatedSet ∩ satisfiedEndings ≠ ∅`.
- **`INVESTIGATION_DEADLINE_UNREACHABLE` (error)** fires when the set is non-empty and **no** member is satisfied
  on a complete walk — i.e. no clue-gated success is reachable-with-its-clues in time. The message names the
  deadline window and points at the examine costs as the likely cause.

Deriving completability **from the walk** (rather than a hand-rolled minimum-examine-time path search) is not
just simpler — it is *more correct*: it uses the engine's real resolution + condition evaluation, so it never
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
verifyInvestigation(story, opts?: { cap?: number }): { ok: boolean; report: WalkReport; issues: LintIssue[] }
  // issues  = lintInvestigation(story, resolveProfile(story))   — static fence + hygiene lints
  // report  = walkStateSpace(story, { cap })                    — examination walked for free; no bucket (no roam)
  // satisfiedEndings = endings E s.t. some walk TERMINAL passes evaluateConditions(E.conditions, terminal.state)
  // clueGatedSet     = non-default endings with ≥1 has_clue condition
  // completable = clock !== 'timed' OR clueGatedSet is empty OR (clueGatedSet ∩ satisfiedEndings) ≠ ∅
  // if NOT completable AND NOT report.capHit:
  //     issues.push({ level:'error', code:'INVESTIGATION_DEADLINE_UNREACHABLE', message: <names the window> })
  // ok = issues.filter(error).length === 0 && !report.capHit && report.softlocks.length === 0 && completable
```

The walk-derived completability diagnostic is **pushed into `issues`** (after the walk) so the failure carries a
human-readable message — parity with how `verifyRoam` returns its `bucketIssues`. `opts` is `{ cap? }` only (no
`timeBucket` — investigation needs no bucketing). `capHit` ⇒ **indeterminate → fail** via `!report.capHit`
(*not* `report.indeterminate`, which is `roam && capHit` and always false here) — no silent cap.

**Scope of the certificate (do not oversell it).** `ok === true` is independent of whether the author ran the
static lints separately — the same narrow property `verifyRoam.ok` has: the *walk* results do not depend on lints
having run. But `verifyInvestigation` runs only `lintInvestigation` (fence + hygiene) + the walk — it does **not**
run full `lintStory`, so `DEAD_CLUE_REFERENCE`, `NO_EXIT`, `CLOCK_CANNOT_BITE`, `TYPE_MISMATCH`, and the
`symbols.ts`-dependent checks are **not** covered. A standalone author must run **both** `lintStory` and
`verifyInvestigation`; the container path runs `lintStory` per chapter already (`lintGame.ts`). The guide states
this division of labor. (The walk's `softlocks` result does catch the "examine-only scene, exhausted, now stuck"
failure — the injected choices vanish once their clues are held and the walker sees zero available choices.)

## Compatibility, lints, and placement

### The v1 fence — `investigation` + `travel`

Per fork 5 (the safer route), the roam-mystery combination is **not** supported in v1:

- **`INVESTIGATION_WITH_TRAVEL_UNVERIFIED` (error).** A story (or chapter) whose resolved profile has **both**
  `investigation:'on'` and `travel:'free'` is rejected. Rationale: examine composes with the *engine* trivially,
  but the three-way **timed × roam × investigation** verification interaction is the most complex corner in the
  engine, and we chose to prove demand on the corpus before paying for it. Lifted when a real roam-mystery game
  appears (Out of scope). The fence lives in `lintInvestigation` → `lintStory` and is folded into
  `verifyInvestigation` — note it is **not** folded into `verifyRoam` (which runs only `checkBucketAlignment` +
  walk cleanliness), so a travel-primary author who runs *only* `verifyRoam` on a both-on story would not see it
  bite; `lintStory` is the canonical static gate that always catches it (the same exposure every `TRAVEL_*` static
  lint already has).

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

- **`symbols.ts` — `producibleClues` must include every examinable's `clue`, but *profile-gated*.** Today
  `collectSymbols` scans only `add_clue` *effects* (`symbols.ts:33-35`). An examinable produces its clue at
  runtime via the engine, not via a static `add_clue`, so without this fix a `has_clue` gate satisfied *only* by
  examining would wrongly trip `DEAD_CLUE_REFERENCE`, and a real exit choice gated on such a clue would wrongly
  trip `SOFT_LOCK` / `staticallyDeadChoice` (`linter.ts:48, 157, 168`) — the three (and only three, grep-checked)
  consumers of `producibleClues`. Fold examinable clues in **only when the resolved profile is
  `investigation:'on'`** (pass `profile` into `collectSymbols`, or gate linter-side): folding them in
  *unconditionally* would *suppress* `DEAD_CLUE_REFERENCE` for an examinable-only clue under `investigation:'off'`,
  where the engine injects nothing and the clue is genuinely unproducible — a new false-negative. The legitimate
  "examine to unlock the exit" pattern lints clean once this lands (and `EXAMINABLES_IGNORED` separately warns
  about the inert hotspots when off).
- **The full condition/effect sweep is FOUR passes, not two.** Choice conditions are linted by `checkConds`
  (`linter.ts:163`), `checkCondTypes`/`TYPE_MISMATCH` (`linter.ts:203`), `checkTimeLiterals`/
  `TIME_LITERAL_OUT_OF_RANGE` (`linter.ts:346`), **and** `clockReadingHits` in `profile.ts:23-35` (powering
  `PROFILE_UNTIMED_HAS_TIME_CONDITION`). All four — plus `checkTimeDeltas` for `examinable.minutes`
  (`NEGATIVE_TIME_DELTA`, monotonic time) — must sweep `node.examinables[].conditions` / `.minutes`, or hotspot
  gates are silently second-class (a typo'd var, an out-of-window `time_after`, a string-var `gt`, or a
  clock-read-under-untimed all slip). The rev-1 two-item list was incomplete.
- **`timeBounds` must count examine `minutes` into `maxTime`** (`linter.ts:75-96`). It currently sums only
  authored-choice `add_minutes` + travel hops; examinables are injected, so their cost is invisible — undercounting
  `maxTime` makes `CLOCK_CANNOT_BITE` (`linter.ts:370-372`) **false-positive the flagship design** ("examine costs
  are the time sink"), and would mis-fire on the negative completability fixture. Fold each node's
  `Σ examinable.minutes` into the `maxTime` accumulation (an upper bound — overcount is the safe direction for
  `CLOCK_CANNOT_BITE`). Do **not** add it to `minTime` (examining is optional; the shortest path skips it, so
  `DEADLINE_UNWINNABLE` is unaffected).

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

### The container: fix the profile-inheritance gap at the root (a prior step), not a third papering lint

`GameEngine` reads only `story.profile` at runtime; `GameRunner`/`seedChapterStory` never stamp `Game.profile`
onto the seeded story (`carry.ts` rewrites variables/resources/clues/deadline but **not** `profile`). So a `Game`
declaring `profile.investigation:'on'` with a bare chapter would inject **no examination at runtime, with no
error** — the exact silent-failure travel hit, which travel papered over with `ROAM_CHAPTER_PROFILE_MISSING`.
**Decision (Matthew): fix the root cause instead of shipping a third copy of that paper.**

- **A prior, separate, container-only step (before this build): `seedChapterStory` stamps the resolved profile** —
  `s.profile = resolveProfile(story, game.profile)`, with `GameRunner.startChapter` passing `game.profile` down.
  Zero engine change (the engine keeps reading `story.profile`; the container just stamps the *right* one). This
  removes the silent-failure class **structurally for all dimensions at once**. Because it makes
  `ROAM_CHAPTER_PROFILE_MISSING` flag a now-working config, that lint is **repurposed**: extend the existing
  `PROFILE_CHAPTER_CONFLICT` check (`lintGame.ts:37-43`) to all dimensions, firing only on a genuine *explicit*
  `'on'`-vs-`'off'` chapter override. This touches shipped travel lints/tests, which is exactly why it is its own
  step *before* the investigation branch (cleaner to review in isolation). **Investigation then writes zero
  `*_CHAPTER_PROFILE_MISSING` lints.**

**No carry fence is needed.** Unlike roam, standalone investigation is single-chapter-*free*: clues are already a
carried primitive (`carry.clues`), examination is finite per-chapter, and nothing in the examine loop touches the
cross-chapter verification path. Multi-chapter investigation is **supported**.

- **Multi-chapter completability is document-only (decision: Matthew).** `lintGame` is **static** — it runs
  `lintStory` per chapter + contracts and does **not** call `walkStateSpace`/`verifyInvestigation`, so it does
  **not** prove timed completability. This is exact parity with travel: `verifyRoam` is also a separate gate
  never folded into `lintGame`. The spec/guide states plainly that **`lintGame` does not prove completability; the
  author runs `verifyInvestigation` on each `investigation:'on'` chapter's story.** Baking the walk into
  `lintGame` (making every lint run a state-space walk) is rejected as heavier and inconsistent with how
  `verifyRoam` relates to `lintGame`; a container-level investigation gate is corpus-gated.

### Placement (each unit self-contained, testable alone)

- **PRIOR STEP (own commit, before the dimension) — `src/container/carry.ts` + `GameRunner`** — stamp
  `s.profile = resolveProfile(story, game.profile)` in `seedChapterStory`; pass `game.profile` from
  `GameRunner.startChapter`. **`src/container/lintGame.ts`** — extend `PROFILE_CHAPTER_CONFLICT` to all
  dimensions (retiring/repurposing `ROAM_CHAPTER_PROFILE_MISSING`), firing only on an explicit `'on'`-vs-`'off'`
  override. Update the travel tests that asserted the old lint. (See the container section above.)
- **`src/engine/types.ts`** — `Examinable` interface; `StoryNode.examinables?: Examinable[]`;
  `Profile.investigation?: 'off' | 'on'`.
- **`src/engine/investigation.ts`** (new, mirrors `travel.ts`) — `EXAMINE_PREFIX = '__examine_'`,
  `examineChoiceId`, `parseExamineTarget`, `examinablesAt(node, state)` (the `!has_clue` + conditions filter, in
  declared order), `examineEffects(ex)` (`add_clue` + optional `add_minutes`).
- **`src/engine/profile.ts`** — `investigation?` on `Profile`; an `investigationDimension` (id `'investigation'`,
  values `['off','on']`, default `'off'`, `validate: () => []` — real lints live in `investigationLint.ts`, as
  for travel) pushed to `DIMENSIONS`; **extend `clockReadingHits` to scan `examinable.conditions`**.
  `DEFAULT_PROFILE` gains `investigation:'off'` (derived). Update `profile.test.ts` resolved-object assertions.
- **`src/engine/engine.ts`** — factor `enter()`'s tail into `settle(id)` (distinct name from `GameRunner.settle`;
  runs on *every* examine; preserves full `enter()` on event-routing); `view()` appends `__examine_` choices at
  the current node when `investigation:'on' && !this.ending`; `choose()` gains the `__examine_` branch **before**
  the unknown-choice throw, validating then applying examine effects + `settle(currentId)` (no re-enter). Reads
  the resolved profile + the node's `examinables`; no `Story`/`WorldState` mutation.
- **`src/engine/symbols.ts`** — `producibleClues` includes examinable `clue`s **gated on `investigation:'on'`**
  (pass `profile`); the load-bearing static fix.
- **`src/engine/linter.ts`** — sweep `examinable.conditions` in `checkConds`, `checkCondTypes`,
  `checkTimeLiterals` and `examinable.minutes` in `checkTimeDeltas`; fold `Σ examinable.minutes` into
  `timeBounds`' `maxTime`; call `lintInvestigation(story, profile)` merged into `lintStory` (alongside
  `lintTravel`).
- **`src/engine/investigationLint.ts`** (new) — `lintInvestigation(story, profile)`: the fence + hygiene lints
  above.
- **`src/engine/stateSpaceWalk.ts`** — extend the `timeKeyFor` time-drop to **all `untimed`** (not just roam);
  `verifyInvestigation(story, opts?: { cap? })`: the thin gate (static lints + walk + `satisfiedEndings`
  completability + the pushed `INVESTIGATION_DEADLINE_UNREACHABLE` + `!capHit`). **No structural `walk()`
  changes** beyond the `timeKeyFor` one-liner and deriving `satisfiedEndings` from the existing terminals.
- **`src/container/lintGame.ts`** — **no** `INVESTIGATION_CHAPTER_PROFILE_MISSING` (the prior step's
  `PROFILE_CHAPTER_CONFLICT` extension covers it); no carry fence; `lintGame` stays static (completability is the
  author's separate `verifyInvestigation` call).

## Verification (tests)

- **An investigation reference game** `src/container/investigationExample.ts` — a single-location mystery built
  to be a real micro-*game*, not plumbing: **"The Locked Study"** — a body, **two named suspects** (the
  housekeeper, the business partner), and a study with ~4 examinables, where the clues map to a *suspect*, not
  just a token: desk→`debt_receipt` and ledger→`ledger_gap` (the partner's motive), painting→`safe_combo` (the
  partner needed the safe), ashtray→`cigar_brand` (a **deliberate red herring** — confirms ownership, not guilt).
  - **Accusation endings gated on clue combinations.** Two accusation **choices** on the scene node; the
    "accuse the partner" success ending gates `has_clue(debt_receipt) && has_clue(ledger_gap) &&
    has_clue(safe_combo)`; accusing the housekeeper or accusing on thin evidence resolves a wrong/default ending.
    The clue→suspect mapping is load-bearing prose, not a combo-lock.
  - **A timed variant and an untimed variant.** The timed variant gives each hotspot a `minutes` cost and a
    deadline tight enough that examining **all four** blows it but the **three load-bearing** ones leave time to
    accuse — so `verifyInvestigation` does a *non-vacuous* completability pass, and `CLOCK_CANNOT_BITE` must
    **not** trip (the regression guard for the `timeBounds` fix).
  - **A negative `INVESTIGATION_DEADLINE_UNREACHABLE` fixture** — a copy whose costs/deadline make *no* clue-gated
    success satisfiable in time (`clueGatedSet ∩ satisfiedEndings = ∅`), so the completability error bites.
  - **A `satisfiedEndings` soundness regression fixture (the P0 guard)** — a variant whose success ending is
    pinned via a node `endsWith` *and* carries `has_clue` conditions, reached by a **clueless, in-time** path:
    membership-based completability would pass it; the `satisfiedEndings` (terminal-gate-re-eval) certificate
    must correctly report `INVESTIGATION_DEADLINE_UNREACHABLE`.
  Proves: the engine appends an examine choice per available hotspot; taking one adds the clue, surfaces the
  reveal, pays `minutes`, and retires that hotspot while leaving the player in the scene; a held-clue hotspot is
  not re-offered; `settle` fires the deadline/resource/event tail on examine-time (a tight timed fixture ends the
  game mid-search when a costly examine crosses the deadline); **a costly examine that crosses a `ScheduledEvent`
  trigger fires the event (present path) and routes the player out of the scene** (the settle-routing composition
  test, mirroring travel's event-composition test); a `GameRunner` plays an examine path to the correct
  accusation; `verifyInvestigation().ok === true` on the clean timed + untimed variants.
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
  inert**: nothing injected, the engine runs as today. `profile.test.ts` resolved-object assertions updated to
  include `investigation:'off'`. **One expected, sound churn:** extending the `timeKeyFor` time-drop to all
  `untimed` walks (the long-deferred untimed walker-key optimization) merges time-distinct states for any untimed
  game that advances the clock — it can *reduce* `statesExplored` for `untimedExample`; update any exact
  state-count assertion. Honesty results (softlocks/orphans/endings/dead-choices) are unchanged (untimed forbids
  clock-reading conditions, so nothing branches on the dropped `time`). **All other existing tests stay green.**
- **An authoring guide** `docs/authoring/investigation.md` — the examinable shape; the self-hiding `!has_clue`
  rule; the coexist-with-authored-clues rule; the **settle-on-examine** semantics (a costly examine can end a
  timed game, or fire an event that routes you out); the **completability** guarantee *and its honest scope*
  (winning is structurally possible — not that examining everything always wins; design red-herrings
  deliberately). Plus the Team-flagged author guidance: **(1)** express the winnable ending's gate as `has_clue`
  conditions or completability proves nothing (the vacuous-pass trap); **(2)** `reveal` renders in the
  **secondary log** surface in v1 — keep it to 1–3 self-contained sentences, not a scene (rich presentation is
  WS-G); **(3)** write the scene body to read in both the unsearched and fully-searched states (a "scene complete"
  convention) so a player out of hotspots is not unsure whether something broke; **(4)** a worked deadline-vs-
  examine-cost arithmetic example (the teaching moment for `INVESTIGATION_DEADLINE_UNREACHABLE`); **(5)** a
  `remove_clue` of a hotspot's clue **re-opens** that hotspot (by design; gate with a boolean var to prevent
  re-examination); **(6)** `EXAMINE_CLUE_UNUSED` is a warning, but in a mystery treat it as an error — a clue no
  ending reads is paid-for dead weight; **(7)** run **both** `lintStory` and `verifyInvestigation` (the latter
  does not subsume the former), per chapter for multi-chapter games. Full `npx vitest run` green +
  `npx tsc --noEmit` clean.

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
- **Broader engine simplification** — bundling a wider cleanup into this push is **rejected** (strategic lens):
  unifying the two walk paths (`stateSpaceWalk` vs `seededWalk`/`valuesAtEndings` keys), re-evaluating
  `adjust_resource`/`__roff_`, deciding `incompatiblePairs`/`long-horizon`'s fate, and the `linter.ts` monolith
  refactor are all **corpus-gated or their own dedicated pass**. The *one* refinement pulled in is the
  root-cause profile-stamp (the prior step, above) — done because it *shrinks* investigation (no papering lint),
  not because it enlarges it.
- **Examine reveal as a first-class presentation surface** — v1 routes `reveal` text to the existing `log`
  channel; rich per-hotspot presentation is a WS-G (front-end) concern.
- **The D2 prototype corpus** — after this, the second dimension, ships; it also decides the fate of
  `incompatiblePairs`.
