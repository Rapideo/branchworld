# The Travel Dimension (Free-Roam) — Design

> Engine capability spec. The **second profile dimension** (`travel: 'off' | 'free'`), and the first to wire the
> long-dormant `Location` navigation model. When `'free'`, the engine surfaces map navigation from each
> location's `connectedLocations` graph; verification switches to a **bounded-exhaustive roam mode** so the
> honesty guarantees survive free-roam. Opt-in: `travel:'off'` (every existing game) is behaviorally inert.
> Sequenced before the **investigation** dimension and the **D2 prototype corpus** (which needs ≥2 dimensions to
> be a meaningful compatible-sets stress-test). Approved 2026-06-28 (brainstorm).
>
> **Rev 2 (2026-06-28)** — after a three-lens Team review (engine-integration, verification-rigor,
> design-completeness; all verdicts CHANGE: *mechanic sound, verification under-built*). Made the roam-mode
> soundness story complete, fixed the engine-integration seams the review traced in code, and reframed the
> compatibility story around per-dimension *requirements* rather than an unexercised forbid hook.
>
> **Rev 3 (2026-06-28)** — after a second Team pass adjudicating the rev-2 fixes against the live code (it caught
> two soundness bugs *inside* the rev-2 fixes). Changes: **(1)** co-reachability must walk the **full forward edge
> set**, not the `parent` spanning tree (the tree-only version false-positives reconvergent — i.e. normal — roam
> maps); **(2)** `ROAM_UNBOUNDED_HUB_WRITE` now rejects `adjust_resource` (its unclamped `__roff_` offset is a
> keyed var) and applies in **both** clock modes; **(3)** bucket alignment is defined by the `readsClock`
> predicate (catches `{field:'time'}` value-ops) and `startTime`-anchored depletion boundaries; **(4)** the
> timed-roam bucket is a *verification parameter*, not a profile field; **(5)** `ROAM_HUB_NONIDEMPOTENT` **cut**
> (noise); **(6)** multi-chapter roam **fenced off** in v1 (`ROAM_CARRY_UNVERIFIABLE` forbids it) instead of
> building unexercised container-walk parity — that build is gated on the D2 corpus.

## Context

The roadmap's capability #3, **free travel between locations**, was cut from the heist (a tight time-pressure
game) but is a real engine feature the `Location` model was *built for*: `connectedLocations`, `travelTimes`,
and `defaultNode` have shipped as type fields since v1.2 but **no engine code reads them** (verified — they
appear only in `types.ts`). The profile framework (engine v1.5) makes this safe to add as an **opt-in dimension**
rather than an always-on mechanic: a game declares `travel:'free'` to turn the map on; everything else leaves it
off and is unaffected.

The one real design problem free-roam poses is **verification**. The engine's honesty guarantees (no softlocks,
all endings reachable, contracts honest) rest on the **exhaustive walker** (`walkStateSpace`). Free-roam is a
state-space bomb — A→B→A→B, each trip advancing the clock into fresh states — that would blow the walk. The
design keeps exhaustive verification, *coarsened*, rather than abandoning it — and the verification section below
is explicit about exactly which guarantees survive the coarsening and which become *loud* INDETERMINATE results
the author cannot mistake for an all-clear.

**A note on "byte-identical."** Adding the dimension changes `DEFAULT_PROFILE` from `{clock:'timed'}` to
`{clock:'timed', travel:'off'}`. Runtime behavior for every existing game is unchanged (nothing is injected, the
walker runs exactly as today), but the *resolved-profile object shape* changes — so the claim is **behaviorally
inert**, not byte-identical. `profile.test.ts`'s assertions that pin the resolved object (`toEqual({clock:'timed'})`)
must be updated to include `travel:'off'`. This is called out so the build doesn't treat that test churn as a
regression.

## The mechanic — engine-generated navigation

The profile gains **`travel: 'off' | 'free'`** (default `'off'`). When `'free'`, the engine wires the `Location`
model as a navigation layer:

- **Hub test (state-driven, not a global node scan).** A node is a hub *for the player's current location*: the
  current node's id equals `here.defaultNode`, where `here = locations.find(l => l.id === state.location)`. The
  test is **`here?.defaultNode === currentId`** — keyed off `state.location`, never a scan of "does any location
  claim this `defaultNode`." (A global scan mis-fires when two locations share a `defaultNode` or a `defaultNode`
  is mis-pointed; keying off the live location is the only sound test.)
- At a hub node the engine **injects one synthetic "travel to ⟨dest⟩" choice per entry in
  `here.connectedLocations`**, in the **declared array order** (deterministic — never set/hash order — so the
  walker and the UI agree run-to-run).
- The synthetic choice id is **`__travel_<destLocationId>`**. The `__` prefix is reserved; the linter already
  guards node/var ids, and rev 2 **extends the reserved-prefix guard to `Choice` ids** so an author can't author
  a real choice that collides with an injected one (`RESERVED_CHOICE_ID`, error).
- **`choose()` recognizes a `__travel_` id *before* its "unknown choice" throw.** Today `choose()` does
  `node.choices.find(c => c.id === choiceId)` and throws `Unknown choice` if absent (`engine.ts` ~line 95) — a
  synthetic id is never in `node.choices`, so without this seam every trip throws. The new branch: when the id
  starts `__travel_`, **validate** (travel is `'free'`; the current node is the current location's hub; the dest
  is in `here.connectedLocations`; `here.travelTimes[dest]` exists) and then apply the trip — advance the clock by
  `travelTimes[dest]`, set `location` to `dest`, enter `dest.defaultNode`. A malformed/illegal travel id throws a
  *travel-specific* error, not the generic one.
- Authored **local** content lives off the hub and flows back to it; the **roam layer is the graph of location
  hubs** connected by `travelTimes`. The author builds locations (a hub + optional local content) and the
  connectivity graph — the engine handles inter-location movement (no hand-authored "go to X" choices). That is
  the "free" in free travel.
- **Travel `'free'` *coexists with* authored `change_location`; it does not take it over.** The synthetic hub
  edges are **additive**. An author may still write a gated `change_location` effect (a door that opens only once
  `key_found`, a one-way drop) alongside the symmetric roam graph. This is deliberate: it recovers
  conditional/one-way connectivity (otherwise deferred) for free, and it keeps the *untimed* roam variant a real
  game (state-gated shortcuts, locked regions) rather than a plumbing fixture. The roam graph is the always-open
  map; authored `change_location` is the special-case edge.
- With `travel:'off'`, the engine injects nothing; `connectedLocations`/`travelTimes` stay inert; movement is
  authored `change_location` exactly as today.
- **Snapshot/restore is unaffected** — synthetic choices are derived from `state.location` + the static
  `locations` graph at `view()` time, never stored in `WorldState`; save/load round-trips through the existing
  state with no new fields. (Stated so the build confirms it rather than adding persistence.)

## Verification — bounded-exhaustive roam mode

`travel:'free'` switches `walkStateSpace` into **roam mode**, driven by the resolved profile. The goal is
unchanged — **prove no softlocks, all endings reachable, contracts honest, over a finite space** — but free-roam
forces three things the rev-1 spec under-specified: a *proved* finiteness precondition, a new co-reachability
property, and honest reporting when the space is too big to finish.

### Finiteness must be *proved*, not assumed

The walker key (`stateSpaceWalk.ts`) includes **all of `s.vars`** (raw, never bucketed). So *any* re-runnable
effect that writes an **unbounded keyed var** farms infinite distinct states and runs the walk to the cap —
under **both** clock modes (bucketing quantizes only `time`, not `vars`). `enter()` re-applies `entryEffects` on
**every** entry, and a roam graph makes hubs/local nodes re-enterable without limit, so finiteness is a
**precondition the linter proves**, not a hope:

- **`ROAM_UNBOUNDED_HUB_WRITE` (error, both clock modes).** A roam-reachable `entryEffect`/travel effect is
  rejected when it writes a keyed numeric var that can grow without bound:
  - `increment`/`decrement` on a numeric var with no declared `min`+`max` (the bound is what makes the key space
    finite). **Includes `kind:'item'` counted vars** (numeric, no bounds required today).
  - **`adjust_resource` outright.** It stores an *unclamped* accumulator `__roff_<id>` (`effects.ts:55-59`) that
    is itself a keyed var; the resource's own `min`/`max` clamps only the *read* value, not the offset, so a
    re-runnable `adjust_resource` farms states even though the resource looks bounded. Reject it in any
    roam-reachable hub/travel effect.
  - **Not unbounded** (so *not* rejected): `add_clue`/`add_item`/`mark_*`/`set` and the `clues[]`/`inventory[]`/
    `visited[]`/`completedEvents[]` arrays — all set-semantic (`uniqPush`) and bounded by the finite pool of
    distinct literals. The *only* farming vector is unbounded numeric writes; that is exactly this lint's surface.
- This replaces the rev-2 `ROAM_HUB_NONIDEMPOTENT` warning (**cut** — it flagged a benign `set x=true` as
  "non-idempotent," high-noise and redundant with this error, which catches the one case that actually breaks
  finiteness).
- **Untimed roam** additionally drops `time` from the key, so A→B→A returns to a deduped state. **Timed roam**
  uses **time-bucketing** (below). Given the unbounded-write precondition above, both are finite — *not* "finite
  by construction" (the bucket alone doesn't bound `vars`); finite **given the lint**.

### Timed roam is exhaustive *only* when the bucket aligns — and misalignment is loud

Bucketing **coarsens time**, and choice availability is recomputed from **raw** time, not the bucket. So a branch
or ending reachable only through a *time-op-gated choice* whose threshold falls *inside* a bucket can be silently
merged away — the walker keeps the first-arrived representative of a bucket (`stateSpaceWalk.ts` ~line 121) and
never explores the variant where the finer-time choice was open. (The walker's own code comment already warns the
bucket is *"APPROXIMATE… never use as a pass/fail gate."*) The decided fix is **keep timed roam, make every loss
of exhaustiveness loud** — never silent:

- **`ROAM_BUCKET_MISALIGNED` (error in roam mode).** The bucket must evenly divide **every** time threshold the
  story can branch on. "Time threshold" is defined by the engine's **`readsClock` predicate** (`profile.ts`) —
  **not** a `time_*`-op scan, which misses value-comparisons on the reserved `time` field (`{field:'time',
  op:'gte', value:'1320'}` is a live clock read via `conditions.ts`; the existing `checkTimeLiterals` linter has
  this same blind spot). The *complete* alignment set:
  1. every clock-reading literal (per `readsClock`) in a **choice** `condition` — the case that actually loses
     branches (choice availability is recomputed from raw time, so a bucket straddling the threshold merges the
     open/closed variants);
  2. every clock-reading literal in an **ending** `condition`;
  3. every **`ScheduledEvent`** trigger time;
  4. the **`deadline`**;
  5. **resource depletion-step boundaries** — `startTime`-anchored: steps fall at `startTime + k·everyMinutes`
     (`resources.ts`), while the key buckets *absolute* time, so the divisor is **`gcd(startTime, everyMinutes)`**
     (add `startTime` to the set), not `everyMinutes` alone. *This item applies only insofar as a depleted
     resource value is not itself a separately-keyed var — to be pinned against the resource-storage model in the
     plan; if depleted values are keyed (and thus explored regardless of bucket, see below), item 5 is subsumed.*
  Node-level `conditions` are **excluded** — the engine never evaluates `n.conditions` at runtime (only
  choice/ending/event conditions), so they gate nothing. The lint errors with the offending threshold and a
  suggested bucket (the GCD of the set, capped by the smallest `travelTimes`). The author either coarsens the
  gates (roam games are *meant* to lean on state/location over exact-clock gates) or accepts a smaller bucket.
  **Exhaustiveness is never silently lost.**
- **Where the bucket lives.** The timed-roam bucket is a **verification parameter** — the existing `timeBucket`
  opt on `walkStateSpace` — defaulted to the aligned GCD above and overridable in the verify call. It is **not** a
  `Profile`/`Story` field and has no runtime effect (the running engine never buckets). The spec must not
  attribute it to "the resolved profile"; the profile only flips roam mode *on*, the verify harness supplies the
  bucket.
- **What bucketing does *not* miss** (verified against the walker key): `atZero` resource death, deadline
  crossings, and event *firings* all land in keyed fields (`vars`, `ending`, `completedEvents`), so they are
  explored regardless of bucket. The *only* unprotected surface is reachability *through* a time-op-gated
  **choice** (and whatever lies beyond it) — which is exactly what `ROAM_BUCKET_MISALIGNED` covers.
  **Event/condition *presence* under roam is honest to bucket granularity** — named in the authoring guide.

### Co-reachability — the property free-roam actually adds

Today the walker proves *no softlock* (every non-ending state has an available choice) and *all endings globally
reachable* (each ending appears somewhere in the walk). Neither catches free-roam's signature failure: a
**stranded wander-region** — the player roams B↔C↔B forever, every hub has travel choices (so it's *not* a
softlock) and every ending was reachable from the start via some other path (so none is *orphaned*), yet from
inside that region **no ending is reachable anymore**. The rev-1 spec never checked this. We add it — **scoped to
roam mode** (a `change_location` wander-loop could strand a non-roam game too, but that's out of scope here; lock
co-reachability to `travel:'free'`).

- **Co-reachability needs the full forward edge set — NOT the `parent` tree.** This is the one place a naïve
  implementation is unsound. `walkStateSpace` sets `parent` **only on first discovery** (`stateSpaceWalk.ts`,
  inside `if (!visited.has(nextKey))`), so `parent` is a **spanning tree** — every *re-visit* edge (the normal
  shape of a roam graph: A→B and C→B, or A↔B) is dropped. Propagating "can-reach-an-ending" over tree edges alone
  marks a strict *subset* of the truly-safe states → **false-positive dead regions**, which would **fail a clean,
  reconvergent roam map** (worse than no check). So the walk must additionally record the **full forward
  transition relation**: for every popped state and every *available* choice taken, record the edge
  `curKey → nextKey` **even when `nextKey` is already visited** (e.g. a `Map<curKey, Set<nextKey>>` or a
  predecessor multimap, populated on the dedup branch too). This is a **new walker output**, not the existing
  `parent`.
- **The pass.** Seed from every ending-terminal state; BFS-propagate "can-reach-an-ending" **backward** over that
  full reverse adjacency to a fixpoint; any *forward-reachable* state not so marked is a **dead region**. Report
  as **`deadRegions`** on the `WalkReport` (state key + a sample path *in* — walk the `parent` tree up from the
  dead state, which is still fine for that purpose). O(states+edges). A roam game with non-empty `deadRegions`
  **fails** verification.
- **`deadRegions` is authoritative only on a complete walk.** Under `capHit`, a state can look dead merely
  because its route to an ending lay beyond the frontier — so on a capped walk `deadRegions` is **INDETERMINATE**
  like the other honesty results (next section), never a hard fail on its own.

### A capped roam walk is INDETERMINATE, not an all-clear

`walkStateSpace` caps the frontier and reports `capHit`. On a partial (capped) walk, `softlocks:[]` / `deadRegions:[]`
mean *"none found in the first N states,"* **not** *"none exist"* — and for a large roam map, hitting the cap is
the *expected* outcome, not an edge case. Framing the cap as a mere warning next to an empty softlock list is an
invitation to ship something unverified. So in roam mode:

- **`capHit` ⇒ the honesty results are `INDETERMINATE`, and the verify gate FAILS** (not warns). The report
  distinguishes *"verified clean over the full bounded space"* from *"hit the cap at N — coverage incomplete,
  shrink the map or coarsen the bucket."* `ROAM_STATE_CAP_HIT` remains, but as a **failure** in the verification
  path, honoring the project's no-silent-caps rule. (Outside roam mode, cap semantics are unchanged.)

### Container roam-carry is fenced off in v1 (no parity build yet)

The cross-chapter / carry guarantees ride a **separate** verification path, and it is **not** roam-safe:
`valuesAtEndings` has its **own** `keyOf` (raw `time`, no bucket, no time-drop), **caps silently**, and its
`EndingValueReport` has **no field that can express INDETERMINATE** (`seededWalk.ts`). (`walkSeeded` itself
delegates to `walkStateSpace` and already surfaces `capHit`, but its opts pass only `{cap}` — no `timeBucket` —
so timed roam runs to cap there too.) Building full roam parity here — threading the bucket/time-drop through both
walks, unifying their key fields with the engine walker's (`valuesAtEndings`'s key omits `visited` +
`completedEvents`, which the engine walker keys on, so an arrival-fired event could silently merge states), and
adding an INDETERMINATE signal to the report type — is a real chunk of work for a combination **no game in the
codebase exercises**. By felt-or-cut (the same gating just applied to `incompatiblePairs`), v1 does **not** build
it. Instead it **fences the combination**:

- **`ROAM_CARRY_UNVERIFIABLE` (container error).** A `travel:'free'` chapter inside a **multi-chapter** carry is
  **rejected** — roam + cross-chapter carry is unsupported in v1. (A single-chapter roam game is fully supported;
  the engine walker verifies it.) The error tells the author to keep roam games single-chapter for now.
- The parity build is **gated on the D2 corpus**: when a real roam-in-a-carry game appears, we build and test
  parity against it (and lift the fence). Deferred, not forgotten — listed in Out of scope.

## Compatibility, lints, and placement

### Compatibility — reframed around *requirements*, not forbids

Two dimensions in, the cross-dimension **`incompatiblePairs`** forbid hook has **zero** uses, and the rev-1 spec
defended it with a bet ("the first forbid arrives with investigation"). That's speculative gold-plating by this
engine's own felt-or-cut rule. The honest framing of what "compatible sets" actually delivers is **per-dimension
*requirements*** the framework enforces, not binary forbids:

- `clock:'untimed'` ⇒ forbids time-features (already shipped as the lint-flip that made untimed legal).
- `travel:'free'` ⇒ **requires roam-mode verification** (bucket/time-drop), a **coherent `Location` graph**, the
  **finiteness preconditions** above, and **bucket alignment** (timed). These are *requirements*, not a forbid —
  travel composes with both clock values.

So **`travel` adds nothing to `incompatiblePairs` (it stays empty).** The hook itself is **gated on the D2
corpus**: if 10–20 games across real dimension combinations surface a genuine hard forbid, the hook earns its
place; if the corpus never needs it, **it is cut** (felt-or-cut applied to the framework itself). The spec stops
promising investigation will redeem it.

### Honest cost note — the registry makes *validation* cheap, not *runtime*

The dimension registry means travel **slots in with no framework change** for *validation* (a `Dimension` entry +
its `validate`). It does **not** make travel runtime-cheap: travel adds branches to the **three hottest methods**
— `view()` (inject hub choices), `choose()` (the `__travel_` seam), and `walkStateSpace` (roam mode +
co-reachability). Stated plainly so the investigation dimension isn't mis-budgeted as "free because the registry
absorbs it" — investigation will be at least as runtime-invasive.

### Runtime profile inheritance — travel is the first dimension that needs it at runtime

`clock` never needed the *resolved* profile at runtime (the engine reads `deadline` presence directly). `travel`
is the **first** dimension whose **runtime** behavior depends on the resolved profile — and `GameEngine` reads
only `story.profile`; `GameRunner`/`seedChapterStory` never plumb `Game.profile` to the engine. So a `Game` that
declares `profile.travel:'free'` with bare chapters would get **no roam at runtime and no error** (silent
failure). This is closed with a lint rather than a runtime refactor (contained, matches the "self-contained
unit" rule):

- **`ROAM_CHAPTER_PROFILE_MISSING` (container error).** When a game resolves to `travel:'free'`, **each roam
  chapter's own `story.profile` must declare `travel:'free'`** (so the engine, reading `story.profile`, actually
  rooms). The deeper fix — plumbing inherited `Game.profile` into `GameEngine` — is noted as deferred; the lint
  makes the gap impossible to ship silently in the meantime.

### The travel dimension's `validate` (new codes, all when `travel:'free'`)

- `TRAVEL_UNKNOWN_LOCATION` (error) — a `connectedLocations` entry names a location that doesn't exist.
- `TRAVEL_NO_HUB` (error) — a travel-reachable location has no `defaultNode` (you could arrive nowhere).
- `TRAVEL_MISSING_TIME` (error) — a connection with no `travelTimes` entry (the trip would be free — a slip).
- `TRAVEL_ASYMMETRIC_EDGE` (warning) — `A` lists `B` in `connectedLocations` but `B` doesn't list `A`. The roam
  graph is meant to be symmetric (one-way is done via authored `change_location` under coexist); a missing
  reverse edge is a likely omission, not a deliberate one-way.
- `TRAVEL_HUB_IS_TERMINAL` (warning) — a location's `defaultNode` is itself an ending node (`resolvesEnding`/
  `endsWith`): arriving there ends the game on contact, usually unintended for a roam hub.
- `TRAVEL_GRAPH_IGNORED` (warning) — `connectedLocations` declared but `travel:'off'` (the graph is inert; a
  likely forgotten toggle).
- `RESERVED_CHOICE_ID` (error) — an authored `Choice` id begins with the reserved `__` prefix (collision with
  injected travel ids).

Plus the **roam-verification lints** introduced above: `ROAM_UNBOUNDED_HUB_WRITE` (error; `adjust_resource` +
unbounded numeric writes, both clock modes — note the name says "HUB" but the scope is *any* roam-reachable
`entryEffect`/travel effect, including revisitable local nodes), `ROAM_BUCKET_MISALIGNED`,
`ROAM_STATE_CAP_HIT`-as-failure, `ROAM_CHAPTER_PROFILE_MISSING`, `ROAM_CARRY_UNVERIFIABLE`. (`ROAM_HUB_NONIDEMPOTENT`
was **cut** — see Finiteness.)

### The static linter must become travel-aware

The existing static linter (`computeReachable`, `EVENT_RECOVERY_UNREACHABLE`, `UNREACHABLE_NODE`, `NO_EXIT`/
`SOFT_LOCK`) follows only `node.choices` — it does **not** know about injected travel edges. With `travel:'free'`
it would **false-positive** every travel-only node and transit hub (the linter and the walker would *disagree*).
The static linter must become travel-aware **when `travel:'free'`**:

- `computeReachable` traverses hub→dest travel edges (a hub reaches each `connectedLocations` dest's
  `defaultNode`).
- `NO_EXIT`/`SOFT_LOCK` count the **injected** travel exits when judging whether a hub has a way out.
- `EVENT_RECOVERY_UNREACHABLE`/`UNREACHABLE_NODE` honor travel reachability before flagging.

### Placement (each unit self-contained, testable alone)

- **`src/engine/profile.ts`** — `travel?: 'off' | 'free'` on `Profile`; a `travelDimension` (id `'travel'`,
  values `['off','free']`, default `'off'`, `validate`) pushed to `DIMENSIONS`. `DEFAULT_PROFILE` gains
  `travel:'off'` (derived). Update `profile.test.ts` resolved-object assertions.
- **`src/engine/engine.ts`** — `view()` injects `__travel_<dest>` choices at the current location's hub when
  `travel:'free'` (deterministic order); `choose()` gains the `__travel_` branch **before** the unknown-choice
  throw, with validation. Contained; no Story mutation. Reads the resolved profile + the Story's `locations`.
- **`src/engine/stateSpaceWalk.ts`** — roam mode (bucket via the `timeBucket` opt / time-drop); the **full
  forward-edge structure** (new output, populated on the dedup branch too) and the **co-reachability** pass +
  `deadRegions`; `capHit`⇒INDETERMINATE in roam (including `deadRegions`); `ROAM_STATE_CAP_HIT` as failure.
- **`src/engine/linter.ts`** — travel-awareness in `computeReachable`/`NO_EXIT`/reachability checks;
  `RESERVED_CHOICE_ID`; the roam-finiteness lint (`adjust_resource` + unbounded numeric writes) + bucket-alignment
  lint (via the `readsClock` predicate). Note: flip the now-stale `profile.ts` comment that says the
  `incompatiblePairs` hook "lands with dimension #2."
- **`src/container/lintGame.ts`** — `ROAM_CHAPTER_PROFILE_MISSING` (roam chapter must declare `travel:'free'`),
  `ROAM_CARRY_UNVERIFIABLE` (forbid a roam chapter in a multi-chapter carry — the v1 fence; no `seededWalk`/
  `valuesAtEndings` roam changes in v1).

## Verification (tests)

- **A roam reference game** `src/container/roamExample.ts` — a small map (3–4 locations, each a hub + a little
  local content, the `connectedLocations`/`travelTimes` graph), in **both a timed and an untimed variant**, and
  built to be a *game*, not just plumbing:
  - **Cross-location state coupling** — state set in location A gates content or an ending in location B (the map
    is load-bearing, not decorative).
  - **A deliberate stranding fixture** — a variant (or a clearly-marked broken copy) with a wander-region that
    can't reach any ending, so the **co-reachability** check has something to bite on.
  - **A reconvergent clean variant** — the clean map must have *re-visit / reconvergent* edges (A↔B, or A→C and
    B→C) and still assert `deadRegions: []`. This is the regression guard for the co-reachability soundness bug:
    a tree-only implementation would false-positive here, so this test must pass *because* the walk records the
    full forward edge set, not the `parent` tree.
  Proves: the engine injects travel choices at the current location's hub; a trip pays `travelTimes` and arrives
  at the dest hub; a non-hub node injects nothing; authored `change_location` still works alongside the roam graph
  (coexist); the roam-mode walker **terminates and verifies** (no softlocks, all endings reachable, **no dead
  regions on the reconvergent clean map**). A `GameRunner` plays a roam path to an ending.
- **The travel lints** — each bites on a malformed map (`TRAVEL_NO_HUB`, `TRAVEL_UNKNOWN_LOCATION`,
  `TRAVEL_MISSING_TIME`, `TRAVEL_ASYMMETRIC_EDGE`, `TRAVEL_HUB_IS_TERMINAL`, `RESERVED_CHOICE_ID`, the
  `TRAVEL_GRAPH_IGNORED` warning); a clean roam game lints clean (the no-false-positive gate).
- **The roam-verification lints** — `ROAM_UNBOUNDED_HUB_WRITE` bites on (a) an unbounded `increment` and (b) an
  `adjust_resource` on a roam-reachable entry effect, and passes a *bounded* counter and the set-semantic effects
  (`add_clue`/`set`); `ROAM_BUCKET_MISALIGNED` bites on both a `time_*`-op and a `{field:'time'}` value-op choice
  gate whose threshold the bucket doesn't divide (and names the threshold + a suggested bucket), and on a
  `startTime`-offset depletion boundary; a deliberately oversized roam map trips `ROAM_STATE_CAP_HIT` and the
  verify result is **INDETERMINATE/fail**, not a clean pass; `ROAM_CHAPTER_PROFILE_MISSING` bites on a
  `travel:'free'` game with a bare chapter.
- **Co-reachability** — the stranding fixture reports a non-empty `deadRegions` with a sample path; the
  reconvergent clean game reports `deadRegions: []` (the soundness regression guard above).
- **The roam-carry fence** — `ROAM_CARRY_UNVERIFIABLE` bites on a multi-chapter game with a `travel:'free'`
  chapter; a single-chapter roam game and an all-`travel:'off'` multi-chapter game both lint clean (no
  false-positive on the supported shapes).
- **Composition with scheduled events** — an event whose presence is judged on `state.location` fires on roam
  arrival at its location (travel already composes with `ScheduledEvents`; this confirms it and documents the
  bucket-granularity presence caveat).
- **Backward-compat** — `travel:'off'` (cave, heist, the untimed example) is **behaviorally inert**: nothing
  injected, the walker runs as today. `profile.test.ts` resolved-object assertions updated to
  `{clock:..., travel:'off'}`; **all other existing tests stay green**.
- **An authoring guide** `docs/authoring/free-travel.md` — the roam-game shape (locations + hubs + the graph),
  the coexist rule (roam graph + authored `change_location`, incl. the footgun that `change_location` sets
  `location` but not `currentId`, so landing a player at a non-hub node yields no travel choices until they reach
  the hub), the **state-over-clock-gates** guidance, the bucket-alignment requirement and the honest list of what
  coarsening can/can't miss, the cap-is-failure rule, and the single-chapter-only fence. Full `npx vitest run`
  green + `npx tsc --noEmit` clean; nothing pushed beyond the agreed backup/milestone pushes.

## Out of scope (deferred / parked)

- **Multi-chapter roam (roam chapter in a cross-chapter carry)** — fenced off in v1 by `ROAM_CARRY_UNVERIFIABLE`.
  The container roam-parity build (thread bucket/time-drop through `walkSeeded`/`valuesAtEndings`, unify their key
  fields with the engine walker, add an INDETERMINATE signal to `EndingValueReport`) is **gated on the D2 corpus**
  — built and tested when a real roam-in-a-carry game exists, lifting the fence.
- **Plumbing inherited `Game.profile` into `GameEngine`** — the lint (`ROAM_CHAPTER_PROFILE_MISSING`) covers the
  gap for v1; the runtime-inheritance refactor is a separate, broader change.
- **The investigation dimension** — its own spec/plan next. Whether it surfaces the *first* genuine
  `incompatiblePairs` forbid is now an open question for the **D2 corpus**, not a promise.
- **Map UI / rendering** — front-end (WS-G); the engine only supplies the navigation choices.
- **One-way / conditional connectivity *in the roam graph itself*** — v1 `connectedLocations` is static +
  symmetric; the **coexist** rule covers conditional/one-way needs via authored `change_location` for now.
- **Travel-triggered events / random encounters as a first-class feature** — deferred; v1 travel is navigation +
  a time cost. (Note: a *condition/time-gated* `ScheduledEvent` present at a destination already fires on roam
  arrival — the primitive exists; only the dedicated "encounter" authoring sugar is deferred.)
- **Auto-aligning buckets to thresholds** — v1 *lints* misalignment (`ROAM_BUCKET_MISALIGNED`) and the author
  sets the bucket; auto-derivation is a later ergonomic.
- **The D2 prototype corpus** — after both dimensions exist; it also decides the fate of `incompatiblePairs`.
