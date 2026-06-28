# Authoring guide: UNTIMED_BRANCHING

Use this preset when the game is **state-driven, not time-driven**: player choices set latches and resources, endings read those latches, and there is no clock pressure.

```typescript
import { UNTIMED_BRANCHING } from '../engine';

export const myGame: Game = {
  profile: UNTIMED_BRANCHING,
  // no gameDeadlineMinutes
  ...
};
```

---

## What to forbid (the linter enforces these)

| Forbidden | Reason |
|---|---|
| `story.deadline` on any chapter | implies a running clock; the validator fires `PROFILE_UNTIMED_HAS_DEADLINE` |
| `story.outOfTimeEndingId` | can never fire without a deadline; validator fires `PROFILE_UNTIMED_HAS_OOT_ENDING` |
| `resource.depletion` on any resource | time-driven depletion requires a clock; validator fires `PROFILE_UNTIMED_HAS_TIME_RESOURCE` |
| `time_*` condition ops (`time_before`, `time_after`, `time_between`) | read the live clock; validator fires `PROFILE_UNTIMED_HAS_TIME_CONDITION` |
| any condition with `field: 'time'` and a value op (`equals`, `gt`, `gte`, `lt`, `lte`, `not_equals`, `is_true`, `is_false`) | also reads the live clock; same validator code |

---

## What to use instead

**State-gated endings** (priority + a default) — set boolean latches or resource values in entry effects, then read them in ending conditions.  Use distinct priorities so the resolution order is explicit and `OVERLAPPING_ENDINGS` warnings are avoided.

**Choice-driven resources** (no `depletion`) — increment / decrement the resource via entry effects on destination nodes; the clock never touches it.  Use `adjust_resource` only for time-driven resources (the lint `ADJUST_RESOURCE_NOT_TIME_DRIVEN` will stop you otherwise).

**Latches in entry effects, not choice effects** — latches read by endings should be set in a destination node's `entryEffects`, not in a choice's `effects`, so the lint `LATCH_IN_CHOICE_EFFECT` stays silent.

---

## Walker-cheapness caveat

Avoiding `add_minutes` is **strongly recommended** in untimed games but is not enforced by the validator.  If you do include `add_minutes` effects:
- the clock still ticks and the walker's state space is inflated by the time dimension, so walks are no cheaper than a timed game;
- a cosmetic time label will appear in debug/UI even though no deadline exists.

The walk is only cheaper untimed when no choice or effect advances the clock at all.

---

## Reference implementation

`src/container/untimedExample.ts` — a two-chapter game that satisfies every rule above, lints clean, and is verified by `walkStateSpace` (no softlocks on either chapter).  Read it alongside this guide.
