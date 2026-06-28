# The Countinghouse — The Loud Route — Design

> Content expansion of the shipped heist slice. The arc spec
> (`2026-06-27-heist-arc-design.md`) designed the Floor as **route-exclusive** (quiet inside job vs the fast
> loud way); the slice authored only the quiet path through, leaving the loud route a one-node stub. This makes
> the loud route a genuinely distinct, fuller path — the replay hook the arc promised. **Pure content, zero
> engine change**, on the shipped engine + profile (`countinghouse` is `profile: TIME_PRESSURE_SURVIVAL`).
> Approved 2026-06-28.

## Context

Today the loud route is thin: in ch1 it is a single node (`n_floor_loud` — trip the alarm, `−12` Lead, → the
shared `n_box`); in ch2 it is a single gated choice (`c_force` at `n_stair` → the shared cold dock `n_lot`). Both
routes then share the Box, the grab chain, the gone-sideways turn, **and the dock/partner beat**. So "loud" is
currently just "quiet, faster and costlier" — the arc's promised *route-exclusive replay value* isn't delivered.

The richest untapped lever: the dock confrontation at `n_lot` assumes the count-crew man is *unaware* ("his back
to you"). On a loud run — alarm tripped, building awake — he would be **alert**. A hot dock vs the cold dock is
genuinely different content (a different moral beat under a gun), not a flavor swap. That, plus a fuller loud
Floor, is the expansion.

## The design

### ch1 — the loud Floor (route-exclusive)

`n_floor_loud` (kept: the freight shutter, the alarm, `alarm_tripped = true`, `−12` Lead) gains a short
loud-specific sequence — the building *reacting*:

- A new node where the count-crew is stirred **by the alarm** (descending early), the boxman already moving — a
  loud-specific choice:
  - **`c_charge`** — push straight for the box: fastest, spends the most Lead (a further `adjust_resource −N`).
  - **`c_relay_late`** — kill the relay late, under fire: the loud echo of the quiet relay-cut — buys back some
    Lead (`adjust_resource +N`) but costs time you do not have (a larger `add_minutes`), a real gamble.
- Both reconverge at the shared `n_box`. The quiet route (`n_floor_quiet`) is untouched.

### ch1 — the turn, made route-neutral

`n_turn` currently reads as a quiet-route *surprise* ("nobody is early"). A light prose edit (no new node,
same effects) makes the "they're on the stairs now" beat fit **both** entries — the alarm *called* them (loud) or
they *came back early* (quiet). This keeps the Box → grab → turn → commit spine genuinely shared and honest for
both routes.

### ch2 — the loud escape (the replay hook)

At `n_stair`, re-point **`c_force`** (gated `alarm_tripped is_true`) from the cold `n_lot` to a **new hot dock**:

- **`n_dock_hot`** — the count-crew man is *alert, facing you*, gun out; the building is loud behind you. The
  same partner fork, but under fire and faster: **cover the boxman** (slower, a gun on you) vs **leave him**
  (fast). Its choices reconverge at the **shared** `n_approach_car` (cover) and the **shared** `n_leave`
  (abandon → `partner_status = 'gone'`), so the car + finales stay shared.
- The quiet route (`c_slip`, gated `made_clean is_true`) keeps the current cold dock `n_lot`.

So ch2 has two route-exclusive dock beats (cold `n_lot` for quiet, hot `n_dock_hot` for loud) that reconverge at
the existing `n_approach_car` / `n_leave`.

## What makes loud *feel* different

- **Faster but costlier.** The alarm + forcing + the charge spend Lead, so the loud route **trends toward "The
  Outfit's Math"** (the atZero death) — same ending set, harder path. No new finale.
- **The hot dock shifts the moral beat.** Under a gun, leaving the boxman is more tempting → more "Out, Not
  Whole" on loud runs. A different texture, not just different prose.
- **The mutex's loud arm finally drives content.** `alarm_tripped → n_dock_hot`; `made_clean → n_lot` — the
  route-exclusive divergence the arc promised, machine-guaranteed by the carried mutex.

## Constraints + verification

- **Pure content, zero engine change.** On the shipped engine + counted inventory + the profile framework
  (`countinghouse` declares `profile: TIME_PRESSURE_SURVIVAL`, retained).
- **Lint-clean** — `lintStory` for both chapters + the A1 game-contract linter (`lintGame`) stay clean; the
  `alarm_tripped`/`made_clean` mutex annotation now has real loud-route reads.
- **Walker-tractable** — the new loud nodes add no problematic loops; recalibrate the loud route's clock so the
  chapter window still bites (`CLOCK_CANNOT_BITE`/`DEADLINE_UNWINNABLE` clean) and the walk stays under the cap
  with no softlocks.
- **The 600-run coherence fuzz stays green** — every loud path ends honestly (no fake getaway; getaway ⇒ reached
  an `n_end_*` node with Lead not blown; The Outfit ⇒ Lead blown). The fuzz's ending spread should now show the
  loud route reaching The Outfit / Out-Not-Whole more readily.
- **New tests:** the loud entry → hot dock → an ending plays end-to-end via `GameRunner`; a loud playthrough
  reaches `end_outfit` more readily than the quiet one (Lead pressure); the hot-dock partner fork resolves
  (cover → present finale; leave → `partner_status 'gone'` → Out, Not Whole).

## Out of scope (deferred / parked)

- The remaining two full chapters (the slice + this expansion are still chapters 1–2 of the four-phase arc).
- Any new engine/profile capability — this is content only.
- The playable HTML already exists (`countinghouse.html`); it is rebuilt + redeployed as a build step, not a
  design concern.
- A loud-route-specific finale — deliberately none; the loud route reuses the shipped ending set, reached at a
  different distribution.
