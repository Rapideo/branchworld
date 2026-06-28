# The Countinghouse — Slice Findings

The first game authored on the post-v1.4 engine + counted inventory. A two-chapter vertical slice
("The Way In" → "The Way Out"), built TDD, **zero engine change**, lint-clean + walker-verified + fuzz-swept.
This file records what the slice proved and what it deliberately deferred.

## The four new capabilities, exercised end-to-end

| Capability | Where it earns its place | Honest caveat |
|---|---|---|
| **Counted inventory** | `loot` — the take — is a counted item accumulated through the distinct-node grab chain (`n_grab1→n_grab2→n_grab3`) and gated `≥3` for the clean finale: *greed vs. getting out* is the chapter's spine. `charges` gates `c_blow` via `has_item` and is spent via `decrement`. | `charges` is a `has_item` **demonstrator** (start 1 / max 2 / spend 1) — a boolean in disguise. The *counted* showcase is `loot`. |
| **`adjust_resource`** | **The Lead** — a time-driven survival meter a choice can *raise* (casing the place, cutting the relay) or a loud entry *costs*. It is the line between getting out and The Outfit's Math. | Genuinely load-bearing; not a gimmick. The Lead-buys are one-time nodes (not grindable); the only repeatable beat (`c_wait`) costs time, not Lead. |
| **Node-named `endsWith` finales** | `n_end_clean` / `n_end_lighter` / `n_end_not_whole` pin distinct getaway outcomes; the state branching lives in the gated drive choices at the car. | The weakest of the four: the finales also carry full `conditions` (load-bearing for honesty + atZero-scoping), so the "no latch-tax" benefit isn't fully realized. `endsWith` earns its keep as an **authoring affordance** (distinct terminal nodes for distinct prose) — the same play would resolve identically via the cave's priority-conditioned pattern. A demonstration, not a fiction that *requires* the feature. |
| **`outOfTimeEndingId` (Dawn)** | The night running out is a distinct ending from the structural default — "the clock chose," not a catch-all. | Reachable + honest only because `got_clear` is set on the **drive-away**, not the car hub (see below). |

Plus the **atZero death** (The Outfit's Math, priority 2) and the **cross-chapter contracts** (domains /
mutex / carriedRequired), all machine-checked by `lintGame` + the A1 v1.1 contract linter.

## Honesty seams closed (team gut-check, pre-build)

A three-lens team review of the *plan* (before any code) caught four real issues that a clean build would
have buried — recorded here so the pattern is remembered:

1. **`got_clear` at the hub leaked a fake getaway.** Set at `n_car` entry, a deadline-cross *arriving* at the
   car fired a getaway finale for a player who never drove. **Fix:** set `got_clear` on the drive-away (the
   drive choices + the terminal nodes). A pre-drive deadline-cross now falls through to Dawn. The fuzz
   invariant checks the **terminal node id** (`getaway ⇒ reached an n_end_* node`), which a state-only check
   would not catch.
2. **The clock couldn't bite via a self-loop.** A repeatable self-loop does NOT lengthen the linter's longest
   *simple* path (the `path.has(id)` cycle-guard), so `CLOCK_CANNOT_BITE` would have fired. **Fix:** the take is
   a chain of distinct nodes; ch2 has a distinct over-investment node (`n_circle`) so the window has headroom.
3. **`n_stair` softlocked the standalone walk** (both stair choices gated on carried latches that default
   false). **Fix:** `made_clean` defaults `true` standalone (the container rebases it) — the cave's
   `companion_status`-default trick.
4. **Tautological tests.** Replaced an `id-array === literal` assertion with a real `(gone?, loot≥3?)`
   disjointness test; made the Dawn/Outfit assertions explicit.

The 600-run coherence fuzz confirms the invariants hold under random play: every run ends in a real ending;
no getaway fires from a non-drive node or with the Lead blown; Dawn never claims the drive; The Outfit always
means the Lead is blown. Ending spread (seed 1..600): outfit 304, dawn 154, not_whole 68, lighter 56,
clean 18 — `end_clean` is correctly the hardest outcome.

## Structural orphan (acknowledged)

**`end_still_inside`** is the mandatory `isDefault` ending. In this slice every resolution path is covered
earlier (endsWith → getaways; atZero → Outfit; deadline → Dawn), so the default is unreachable — a deliberate
structural orphan with neutral prose (it never advertises an outcome a player can reach). A live "cornered
inside" branch that fires it is deferred to the loud-route expansion.

## Container promoted (DONE)

The container layer (`Game`/`GameRunner`/`lintGame`/`lintGameContracts`/`seededWalk`/`carry`/`transitions`
+ the synthetic `exampleGame` test fixture) has been **promoted to a shared `src/container/`** with its own
barrel — it is now game-agnostic (depends only on `src/engine/` and its synthetic fixture). The two
cave-specific integration tests (`lintGameContracts.test` against `sumpLine`, `seededWalk.test` against the
cave chapters) live with their fixtures in `sump-line/`, not in the container. The cave's `sump-line/index.ts`
re-exports the container barrel so the cave's own `from '..'` imports are unchanged; the heist imports from
`../../../container`. Both games' playable builds re-bundle cleanly. 305 tests green.

## Deferred (not gold-plated into the slice)

- The **loud-route expansion** (full prose on the loud Floor + the alarm-driven escape; the mutex's second arm).
- The remaining two full chapters (the slice is one path through a four-phase spine).
- A `'hurt'` partner state (forward-declared in the domain; when it lands, the clean gate tightens to exclude
  it — a wounded boxman is never "clean").
- The WS-G front-end (the `kind:'item'` tag + resource `label` are the only bridges; a playable HTML harness
  ships in this slice's Task 5).
