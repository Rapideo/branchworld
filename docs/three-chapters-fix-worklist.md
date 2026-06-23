# Three Chapters -- Consolidated Fix Worklist

_Derived 2026-06-20 from the design-workflow auditors. Dedupes the 16 per-chapter blockers into
engine-level (fix once, helps all three) vs per-chapter (authoring/design). Execution order assumes
the engine-first sequencing. Not yet started -- pending Matthew's design review._

## Baseline (confirmed green before any change)

`tsc --noEmit` clean - `vite build` clean - 139/139 tests pass. This is the rollback-safe starting point.

---

## A. Engine-level (shared -- do first, clears blockers across all three)

### A1. Numeric clamping from `VariableDef.bound` (THE cross-cutting blocker) -- REQUIRED
- **Why:** all three auditors independently flagged it. `effects.ts` `increment`/`decrement` never
  enforce a variable's declared range, so `bound` is documentation only. Unclamped numerics let
  re-enterable hubs pump trust/heat past their stated ranges, **inflate the state-space walker's key
  set (capHit risk), and can misfire ending gates.**
- **Touched by:** mob (high), cave (medium), heist (high).
- **Fix:** parse `bound` ("0..4") into min/max; clamp `increment`/`decrement`/`set` into range when a
  bound exists. Vars with no `bound` stay unclamped (keeps Prater Line / sampleStory unaffected ->
  non-breaking). Add tests; re-run the walker and confirm `capHit=false`.
- **Note:** this is the same machinery the resource primitive needs -- see the resource proposal doc.

### A2. (Candidate, not required) Lint guard for event-routing footguns
- **Why:** the mob chapter's recovery node shares a location with its event location, which
  force-routes no-show players into the present scene (absent branch nearly unreachable). It's
  author-fixable per-chapter, but it's the *same class* of trap the engine made easy in the original
  review. A lint warning would catch it across all future chapters.
- **Fix (optional):** warn when a scheduled event's `recoveryNodeId` (or any always-reachable hub) sits
  at `eventLocation` such that entering it post-trigger re-routes into `ifPresentNode`. Defer unless cheap.

---

## B. Per-chapter (authoring/design -- after A1, during the revise-to-epic pass)

### B0. (All three) Expand to epic scale
Drafts came in at 24 / 25 / 17 nodes vs the ~38-46 target. Expansion is itself a blocker on the
"epic" ask -- biggest lift is the heist (17 -> ~40). Fold the fixes below into the expansion rather
than patching twice.

### B1. The Mercato Run (mob) -- NEEDS REWORK, 6 blockers
- **[high] Dead flag:** `mob_body_found` is never set -> `ending_pinched` unreachable (walker orphan).
  Set it on the not-sunk-by-deadline / left-in-open failure paths.
- **[high] Event routing:** `node_aftermath_hub` is `loc_club` (= the sit-down event location), force-
  routing no-show players into `node_sitdown_present`. Give the recovery node a non-club location, or
  guarantee `event_sitdown` is marked completed before any `loc_club` entry on the no-show path. Re-check
  `event_sweep` / `loc_docks` for the same coupling.
- **[high] Hub cycles pump vars:** `node_car_hub <-> node_rocco_talk` (and re-enterable detours) can
  loop. A1 clamping caps the values; also make loop/detour choices fire-once via a visited flag so the
  walker state space stays small.
- **[med] EE-4 prose lies:** `ending_made` says the debt was "squared" but doesn't require
  `mob_has_debt_money`; `ending_walk_away` says the kid kept the body out of the river but conditions
  don't constrain disposal. Add the conditions or reword the prose.
- **[med] `c_accident` gate** references a distinction no variable records before `node_backroom`. Set a
  `mob_collection_violent` flag upstream and gate on it, or make the choice unconditional.
- **[low] Title clock leak:** rename "02:30 -- The Cruiser"; ensure its body uses `{{time}}` only.

### B2. The Sump Line (cave) -- NEEDS REWORK, 6 blockers (strongest-written; mechanical fixes)
- **[high] Conditional effects unsupported:** "if X set Y" used in `node_shaft_base.c_climb_to_day` and
  `node_choke_collapse_present.c_claw_free`. The engine has no conditional effect. Convert to **branching
  nodes**: gate a choice's availability with a Condition, route to a node whose entry effect sets the flag
  unconditionally. (Keeps the engine lean -- no new effect type.)
- **[high] No `change_location` anywhere:** `state.location` never changes, so both scheduled events can
  only ever fire *absent* and the present nodes are bypassed. Add `change_location` entry effects matching
  each node's declared location; ensure the choke's absent-recovery node is navigably reachable.
- **[high] EE-4 ending lies:** `ending_costly` asserts a death its conditions don't encode; `ending_pyrrhic`
  asserts everyone-together but admits the bolted case; `ending_default` claims daylight but catches
  underground timeouts. Add latching booleans (`cave_someone_lost`, `cave_all_together`) and gate
  costly/pyrrhic on them; add a sharp "timed-out underground" ending or reword the default.
- **[med] Orphan ending:** `ending_lost` depends on a flag only set by the unrepresentable conditional
  effect -> becomes reachable once B2's branching fix lands. Add a walker path confirming it.
- **[med] Resource ranges:** body_heat/morale/trust/lamp uncapped -> handled by A1 clamping (and/or the
  resource primitive once it lands; the cave is the primary consumer).
- **[low] Redundant safe-check traps:** remove or make unconditional once `shaft_base` is rebuilt.

### B3. The Literal Hours (heist) -- READY WITH FIXES, 4 blockers (closest to buildable)
- **[high] Clamping:** `heist_crew_heat` (0..5) has ~15 +1 sources and is unclamped -> walker key blows
  up. Resolved by A1; then confirm `capHit=false`.
- **[med] Event triggers:** authored as `triggerTime` strings, not `Condition[]`. Encode as
  `[{field:'time',op:'time_after',value:'22:50'}]` etc. Decide whether the two present nodes are
  intentionally present-only (expected walker orphans on fast runs -> document) or ensure a dwell path
  exercises each.
- **[med] Anti-railroad:** the clean ending needs `heist_kel_trust>=3`, but the only pre-crack source is
  one opening choice. Add a second, independent pre-crack trust increment (flag-equivalence) so one early
  pick doesn't lock players out of the best ending.
- **[low] EE-4:** `heist_end_clean` prose asserts "no alarm" but conditions don't include
  `heist_alarm_tripped is_false`. Add the condition.

---

## C. Verification (the "team verify" phase, after build)

For each rebuilt chapter: `lintStory` errors=0; `walkStateSpace` -> `capHit=false`, `orphanEndings`
empty, `softlocks` empty, every event's recovery reports `ok=true`, no surprise `overlaps`; scripted
playthroughs reach **every** ending with asserted state; the clock bites both ways; a human prose-vs-state
audit per ending. Then the playtester panel reads for narrative sense.
