# The Travel Dimension (Free-Roam) — Design

> Engine capability spec. The **second profile dimension** (`travel: 'off' | 'free'`), and the first to wire the
> long-dormant `Location` navigation model. When `'free'`, the engine surfaces map navigation from each
> location's `connectedLocations` graph; verification switches to a **bounded-exhaustive roam mode** so the
> honesty guarantees survive free-roam. Opt-in: `travel:'off'` (every existing game) is byte-identical.
> Sequenced before the **investigation** dimension and the **D2 prototype corpus** (which needs ≥2 dimensions to
> be a meaningful compatible-sets stress-test). Approved 2026-06-28 (brainstorm).

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
design keeps exhaustive verification, *coarsened*, rather than abandoning it.

## The mechanic — engine-generated navigation

The profile gains **`travel: 'off' | 'free'`** (default `'off'`). When `'free'`, the engine wires the `Location`
model as a navigation layer:

- Each `Location`'s **hub** is its `defaultNode`. At a hub node (the current node's id equals some location's
  `defaultNode`), the engine **injects one synthetic "travel to ⟨dest⟩" choice per entry in that location's
  `connectedLocations`**.
- The synthetic choice id is **`__travel_<destLocationId>`** (the reserved `__` prefix the linter already
  guards). Choosing it: advances the clock by `travelTimes[dest]`, sets `location` to `dest`, and enters
  `dest`'s `defaultNode` (its hub).
- Authored **local** content lives off the hub and flows back to it; the **roam layer is the graph of location
  hubs** connected by `travelTimes`. The author builds locations (a hub + optional local content) and the
  connectivity graph — the engine handles inter-location movement (no hand-authored "go to X" choices). That is
  the "free" in free travel.
- With `travel:'off'`, the engine injects nothing; `connectedLocations`/`travelTimes` stay inert; movement is
  authored `change_location` exactly as today.

## Verification — bounded-exhaustive roam mode

`travel:'free'` switches `walkStateSpace` into **roam mode**, driven by the resolved profile, so the walk stays
finite and exhaustive over a *coarsened* state space:

- **Timed roam** → **time-bucketing** (the existing A7 `timeBucket`): clock values within a bucket collapse to
  one state, so repeated travel can't spawn endless fresh states. Default bucket sized to the travel granularity
  (the smallest `travelTimes`, or a fraction of the window); author-tunable. The walk is exhaustive over the
  bucketed space.
- **Untimed roam** → **drop `time` from the walker's state key** (the optimization parked in the profile spec):
  A→B→A returns to a deduped state. Finite.
- Either way the same guarantees hold over that space: **no softlocks, all endings reachable, contracts honest**.

**The cap is a loud signal.** `walkStateSpace` already caps and reports `capHit`. In roam mode a hit becomes a
**`ROAM_STATE_CAP_HIT` warning** — "this map is too big to verify exhaustively even bucketed; size it down or
accept sampled coverage" — honoring the project's no-silent-caps rule.

**The honest caveat (authoring guide):** bucketing *coarsens* — two states differing only by sub-bucket time
merge, so a transition gated on a *fine* clock boundary could be missed. Mitigations: align the bucket to event
trigger times, and roam games should lean on **state/location gates over exact-clock gates** (which suits
free-roam anyway). This is the deliberate trade that makes roam verifiable at all — strong-but-coarsened.

## Compatibility, lints, and placement

**Compatibility — the honest story.** Travel is broadly compatible: `timed` (bucketing) and `untimed` (key-drop)
both work, so the `incompatiblePairs` hook stays **empty** for travel. Its contribution to "compatible sets" is
a **per-dimension requirement** the framework enforces automatically (`travel:'free'` ⇒ roam-mode verification +
a coherent Location graph), not a hard forbid. The first genuine cross-dimension *forbid* will most likely
arrive with **investigation** (its "exhaust every clue" shape sits awkwardly under a hard deadline).

**The travel dimension's `validate` (new codes, all when `travel:'free'`):**
- `TRAVEL_UNKNOWN_LOCATION` (error) — a `connectedLocations` entry names a location that doesn't exist.
- `TRAVEL_NO_HUB` (error) — a travel-reachable location has no `defaultNode` (you could arrive nowhere).
- `TRAVEL_MISSING_TIME` (error) — a connection with no `travelTimes` entry (the trip would be free — an
  authoring slip).
- `TRAVEL_GRAPH_IGNORED` (warning) — `connectedLocations` declared but `travel:'off'` (the graph is inert; a
  likely forgotten toggle).

**Placement (each unit self-contained, testable alone):**
- **`src/engine/profile.ts`** — `travel?: 'off' | 'free'` on `Profile`; a `travelDimension` (id `'travel'`,
  values `['off','free']`, default `'off'`, `validate`) pushed to `DIMENSIONS`. The framework's normalization
  (from v1.5) means it slots in with **no framework change** — proving the extensibility claim.
- **`src/engine/engine.ts`** — `view()` injects the `__travel_<dest>` choices at a hub when `travel:'free'`;
  `choose()` recognizes a `__travel_` id and applies the trip (time + `change_location` + enter the dest hub).
  Contained; no Story mutation. Reads the resolved profile + the Story's `locations`.
- **`src/engine/stateSpaceWalk.ts`** — roam mode (bucket / key-drop) selected from the resolved profile; the
  `ROAM_STATE_CAP_HIT` warning surfaced in the `WalkReport`.

## Verification (tests)

- **A roam reference game** `src/container/roamExample.ts` — a small map (3–4 locations, each a hub + a little
  local content, the `connectedLocations`/`travelTimes` graph), in **both a timed and an untimed variant**.
  Proves: the engine injects travel choices at each hub; a trip pays `travelTimes` and arrives at the dest hub; a
  non-hub node injects nothing; the roam-mode walker **terminates and verifies** (no softlocks, all endings
  reachable). A `GameRunner` plays a roam path to an ending.
- **The travel lints** — each bites on a malformed map (`TRAVEL_NO_HUB`, `TRAVEL_UNKNOWN_LOCATION`,
  `TRAVEL_MISSING_TIME`, the `TRAVEL_GRAPH_IGNORED` warning); a clean roam game lints clean.
- **The cap** — a deliberately oversized roam map trips `ROAM_STATE_CAP_HIT`.
- **Backward-compat** — `travel:'off'` (cave, heist, the untimed example) is byte-identical: nothing injected,
  the walker runs as today, **all existing tests stay green**.
- **An authoring guide** `docs/authoring/free-travel.md` — the roam-game shape (locations + hubs + the graph),
  the state-over-clock-gates guidance, and the bucketing caveat. Full `npx vitest run` green + `npx tsc --noEmit`
  clean; nothing pushed beyond the agreed backup pushes.

## Out of scope (deferred / parked)

- **The investigation dimension** — its own spec/plan next; the first real `incompatiblePairs` forbid likely
  lands there.
- **Map UI / rendering** — front-end (WS-G); the engine only supplies the navigation choices.
- **Conditional / one-way connectivity** (a door that unlocks) — v1 `connectedLocations` is static + symmetric;
  gate *content* for now.
- **Travel-triggered events / random encounters** — deferred; v1 travel is navigation + a time cost only.
- **Auto-aligning buckets to event trigger times** — v1 uses a default bucket + the guide caveat.
- **The D2 prototype corpus** — after both dimensions exist.
