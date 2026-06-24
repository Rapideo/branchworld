---
name: author-chapter
description: Use when authoring or expanding a BranchWorld chapter (a 25-40 beat "evening" of branching narrative) — drives the Branch-and-Bottleneck Authoring method end to end, keeping the State Ledger, the engine invariants, and the verify loop. Invoke for any new chapter, chapter expansion, or when wiring branches + variables for the cave POC book or any BranchWorld game.
---

# Authoring a BranchWorld Chapter

Follow the **Branch-and-Bottleneck Authoring** method in `docs/authoring-method.md`. Read it first — it is
the source of truth. This skill is the checklist that keeps you honest while you work it.

## The one rule that carries the rest

Maintain the **State Ledger** out loud, the entire time — never in your head. Every variable & resource:
meaning, type, default, invariant, **where SET**, **where READ**; plus the endings table (each ending's
conditions, priority, and *what its prose may assert* — only what its conditions guarantee). The ledger is
the antidote to "managing all the branches and variables mentally": you externalize it so nothing drifts.

## The five stages (do them in order; don't skip Stage 4)

1. **Brief & Pattern** — role in the book (carry-in, the frozen **output contract**), dramatic job, target
   beats (25–40). Default pattern: branch-and-bottleneck. Define the **spine** (the forced decisions). Seed
   the ledger.
2. **Beat Map** — spine hubs + rejoining detours (forward-merge by default; a *handful* of loop-backs).
   Each beat: id / location / type / time-cost / destinations + every set/read → ledger. Enforce: no
   dead-ends, latch discipline, the time budget, **walker tractability** (loop-backs & flavor state blow
   the 50k cap — keep texture in prose).
3. **Prose** — locked voice; `{{time}}` never a numeral; endings assert only guaranteed facts (hedge the
   rest).
4. **Wiring** — emit the typed `Story`; apply the engine invariants; cross-check every ledger row.
5. **Verify & Calibrate** — `lintStory` clean → `walkStateSpace` (no cap / softlocks; orphans = expected
   carry-only set) → scripted `GameEngine` playthroughs (every ending + output contract) → in-book
   `lintGame` + cross-chapter `GameRunner` playthroughs → calibrate clock/meters. Fix, re-run, **green**.

## Engine invariants (never violate)

EE-1 time-derived (`{{time}}`, no numerals) · latch discipline (latches set only by unconditional
entry-effects) · resources bounded; time-driven meters never written by effects; choice-driven written by
inc/dec · carried-output contract frozen · EE-4 ending honesty (+ a latch to separate node-determined
outcomes that share state) · no dead-ends (detours rejoin) · spend loop-backs & flavor state deliberately.

## When the loop won't close

- `CLOCK_CANNOT_BITE` → deadline ≈ startTime + longest static path (bump a choice ±5 min).
- `capHit` → cut loop-backs / flavor state, or seed/sample the walk + lean on scripted coverage, and log it.
- A dark / clean ending unreachable in a standalone walk → expected; it's carry-only, verify it in the
  cross-chapter game.
- Survival math off → start meters partly spent; tune so the minimal long success route just survives.

Keep the engine **frozen** unless the work is an explicit engine task; chapters add only content + tests.
