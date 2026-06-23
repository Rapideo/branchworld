# Resource Primitive + Numeric Clamping -- Design Proposal (PROVISIONAL)

_2026-06-20. A pre-read for Matthew to react to alongside the chapter review. This is a PROPOSAL with
open decisions flagged, not an approved spec. We lock it via a short brainstorm when you're back._

## Why these two are one piece of work

The chapter audit surfaced that the engine never enforces a variable's declared `bound` -- the single
most-repeated blocker across all three chapters. The fix (clamp numerics to a range) is the *same
machinery* a resource needs: a number with a floor, a ceiling, and behavior at the edges. So we do the
foundation (clamping) once, then layer resources on top.

This is also the realization of the roadmap note that resources + flexible time-gating are both "take
the one privileged clock and make pressure a flexible, pluggable thing."

---

## Part 1 -- Numeric clamping (foundation, low-risk, needed regardless)

**Behavior:** when a `VariableDef` declares a `bound` (e.g. `"0..4"`), the engine clamps the result of
`set`/`increment`/`decrement` into `[min,max]`. Variables with no `bound` stay unclamped.

**Why it's safe:**
- Non-breaking: the two shipped chapters (Prater Line, sampleStory) don't declare bounds, so their
  behavior is unchanged.
- Makes the walker honest: bounded vars take a known finite set of values -> the tractability argument
  the chapters rely on becomes real instead of aspirational.
- TDD-able in isolation: a handful of tests in `effects.test.ts` (clamp up, clamp down, no-bound passthrough).

**Open decision 1 (small):** should an out-of-range *authored* value (a `set` to 9 on a `0..4` var) be a
**lint warning**? Recommend yes -- cheap, catches author mistakes.

---

## Part 2 -- The resource primitive (the play-value feature)

A resource is a bounded number with semantics the engine understands, so authors get depletion, meters,
and at-zero consequences without hand-wiring each one. **Opt-in: stories with no resources are unaffected.**

### Recommended shape (lean, first-class)

```
Resource {
  id            // e.g. "lamp_charge"
  label         // "Lamp"   (for the player meter)
  min, max      // 0, 4
  start         // 4
  depletion?    // optional: { per: "minutes"|"node", amount: n }  -- auto-drain
  atZero?       // optional: "block" | { setFlag } | { ending } | { effect }
}
```

- **Auto-depletion** is the headline: a resource can drain with the clock (`per: "minutes"`) or per scene
  (`per: "node"`) without the author adding a decrement to every choice. Choices can still spend/restore it
  explicitly (`add_minutes`-style effects already work via clamping).
- **At-zero behavior** is author-defined, not hardcoded -- block risky choices, set a flag, run an effect,
  or force an ending. (Built on the existing condition/effect machinery + one new "atZero -> ending" hook.)
- **Player UI:** the debug panel and player can render a labeled meter; entirely optional.

### The walker insight (matters for "epic" scale)

A **purely time-driven** resource is *deterministic from the clock* -- it adds **no new independent state
dimension** to the walker (lamp level is a function of time, which is already in the key). That's a gift
for tractability: the cave's dying lamp can be pure time-depletion and cost us nothing. Only resources
that *also* change via choices (a found battery, a heat pack) add dimensionality -- and clamping keeps
even those small. Design guidance: prefer time-driven resources; make choice-driven ones rare and bounded.

### What this unlocks beyond the cave

Stamina, fuel, ammo, body heat, air, a dwindling bankroll, police "heat" that ticks up, a phone battery --
across mob/heist/survival/any genre. It turns the clock from the *only* pressure into one of several.

---

## THE decision for you (open fork)

**Fork A -- Focused resource primitive now (RECOMMENDED).** Build clamping + the lean resource above,
ship it, author the cave on it, learn from a real depleting resource in play. Generalize later.
- Pro: unblocks the cave cleanly and soon; small, verifiable; real-world feedback before we over-design.
- Con: the broader "flexible/scoped/long time-gates" generalization waits.

**Fork B -- Unified "pressure systems" model.** Design resources *and* per-chapter / long-horizon /
variable-granularity time-gates together as one coherent abstraction (per the roadmap note).
- Pro: one model instead of two bolt-ons; avoids reworking the clock twice.
- Con: much bigger up-front design; delays the cave; risks designing in the abstract before we've felt a
  single resource in play.

My recommendation is **A** -- get a resource into players' hands, then generalize from evidence. But the
clock-generalization is genuinely yours to weigh, since you raised it.

### Secondary decisions (quick, for when we lock this)
1. At-zero default behavior if an author omits `atZero`: **block risky choices** (safest) vs nothing.
2. Should `depletion` support *regeneration* (negative drain / rest nodes) in v1, or spend-only?
3. Meter visibility: always-on in the player, or author-flagged per resource?

---

## Sketch of the build (Fork A), once approved

1. Clamping in `effects.ts` (+ tests) -- foundation.
2. `Resource` type + story field; engine drains on time-advance / node-enter; clamps; fires `atZero`.
3. Linter: bounds/at-zero sanity; out-of-range author warning; walker confirms no new explosion.
4. Player + debug meter (optional render).
5. Author the cave (`The Sump Line`) on the real primitive as the proof, then walker + playtest verify.

Estimated as its own small sub-project (engine v1.3), sequenced before cave authoring.
