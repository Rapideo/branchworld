# A1 — Cross-Chapter Contract + Latch Linter (design)

> Sprint-1 safety tool. Closes the **book-killer silent-drift class** (HARDENING-FINDINGS H1/H13;
> scaling-lens S1/S4/S6/S7). Built in the **container layer** (next to `lintGame`) — **zero engine
> changes**, the freeze holds. This doc is the design to sign off before building.

## 1. The gap it closes (grounded in the actual code)

The carry mechanic (`carry.ts`):
- On chapter end, `extractCarry` copies vars/resources from the ending `WorldState` per the `CarryContract`
  (`vars:'all'` copies *everything*).
- `seedChapterStory` rewrites the next chapter's `variable.default` / `resource.start` **only for fields
  that chapter declares** (`carry.ts:39-43`). A carried var the next chapter doesn't declare is silently
  dropped; one it *does* declare gets the carried value.

The detonator (proven by Track A **PROBE-D**): the engine's coercion is **fail-open** for the common latch
gate. `is_false` / `not_equals` on a var that ended up at its default (because nobody upstream wrote it)
reads **true** → the gate *opens*. `equals` reads **false** → fails closed. So a renamed/unwritten carried
latch produces **no error, no softlock, no crash** — just the wrong ending firing for free, surfacing only
in a hand-playthrough that happens to traverse that branch.

What exists today: `lintGame` checks the start chapter, transition targets, catch-alls, per-chapter
`lintStory`, and chapter reachability. **Nothing compares what one chapter writes against what another
reads.** The "output contract" lives only as prose in the State Ledger. A1 makes it machine-checked.

## 2. Where it lives

A new container module `lintGameContracts.ts`, exported and **called by `lintGame`** so the game linter
becomes the single gate. It reads only the public `Game`/`Story`/`CarryContract` shapes — no `src/engine`
change. New tests in `lintGameContracts.test.ts`.

## 3. The derived State Ledger (the data model A1 builds)

A1 first derives, from the `Game`, the registry the method currently maintains by hand (kills S7):

```
LedgerEntry = {
  name: string
  kind: 'var' | 'resource'
  type?: 'boolean'|'number'|'string'     // from declarations; flagged if inconsistent
  declaredIn: chapterId[]                 // chapters whose Story declares it
  writtenIn: chapterId[]                  // chapters with a set/inc/dec effect, atZero.setFlag, or (resource) carry
  readIn:    chapterId[]                  // chapters reading it in any condition (nodes/choices/events/endings) + game transitions
  isCarried: boolean                      // declared by >1 chapter, or in carry.resources, or read by a transition
  writtenValues?: string[]               // for strings: the set of literals `set` assigns
  comparedValues?: string[]              // for strings: the set of literals equals/not_equals compares against
}
```

Per chapter we compute `declares / writes / reads` by structurally scanning the Story (entryEffects,
choice effects, event ifAbsentEffects, resource atZero.setFlag; conditions on nodes/choices/event
triggers/endings) plus the chapter's outgoing **game transitions** (these read vars too — e.g.
`cave_route equals 'high'`). The chapter DAG comes from `chapter.transitions[].goTo`.

This ledger is itself a useful artifact (printable, diffable) — the machine-checked registry the human
author no longer has to keep in their head.

## 4. v1 checks — decidable, zero false positives (ship first)

| Code | Level | Fires when |
|---|---|---|
| `CONTRACT_TYPE_MISMATCH` | error | a var is declared by ≥2 chapters with **different `type`** (a carried value will be read with wrong type semantics). |
| `CONTRACT_READ_NO_PRODUCER` | error | a var is **read by some chapter but written by no chapter anywhere** and is not a `carry.resources` resource → it is permanently its default; the gate is dead/constant (the renamed-latch tail case). |
| `CONTRACT_DOMAIN_DRIFT` | warning | a string var is **compared against a literal no chapter ever `set`s** (e.g. an `equals 'injured'` when nothing writes `'injured'`) — a silently-never-true gate. |
| `LATCH_IN_CHOICE_EFFECT` | warning | a boolean read by any **ending** condition (a "latch") is `set`/`inc`’d inside a **choice effect** rather than an unconditional **entryEffect** (latch-discipline violation; the method's rule). |

These are zero-FP: each is a definite structural fact. On the *current* game they are all clean (verified by
hand against the three chapters; A1's first test will confirm).

## 5. v1.1 checks — ancestor-aware (the precise rename-catcher)

The subtle drift (rename a latch in ch1, ch9 still reads it, ch9 *also* writes it later) needs the DAG +
intra-chapter ordering, so it ships second:

| Code | Level | Fires when |
|---|---|---|
| `CONTRACT_READ_NO_ANCESTOR_PRODUCER` | error | a chapter reads carried var V **before any local write of V** (relies on the carried value), but **no ancestor chapter writes V** → on every path in, V is its default. Catches the ch1-rename / ch9-still-reads case the v1 "no producer *anywhere*" check misses. |
| `MUTEX_LATCH_UNGUARDED` | warning | two latches declared a **mutually-exclusive group** (author-annotated) where an ending reads one without guarding its partner (the F-E class — "all three" without `someone_lost is_false`). |

`READ_NO_ANCESTOR_PRODUCER` needs "is V written on a node reachable before the read node" — the linter
already computes node reachability, so this is tractable; it's just more than v1 needs on day one.

## 6. The recommended hybrid: derive by default, annotate the high-value cases

Two small **opt-in** annotations on the `Game`/`CarryContract` make the strong checks possible without
author burden elsewhere:

- **`carriedRequired: string[]`** — vars a chapter declares that it *requires* to be carried (not defaulted).
  A1 then errors if any path to that chapter has no ancestor producer. This turns "I expect this latch from
  upstream" from prose into a checked contract.
- **`domain: string[]` on a string var** (in the ledger annotation) — the legal value set. A1 errors if a
  chapter `set`s or compares a value outside it. This nails `companion_status` drift hard.

Everything else is derived; annotations are only for the fields where the author wants a guarantee. This is
the scaling-lens recommendation (explicit enum domains + required-carried) layered on a zero-burden derived
base.

## 7. Reporting & test integration

- `lintGameContracts(game): { ok, errors, warnings, ledger }` — returns `LintIssue[]` (reusing the engine's
  `LintIssue` shape: `{level, code, message, where}`) plus the derived ledger.
- `lintGame` calls it and merges issues, so `expect(lintGame(sumpLine).errors).toEqual([])` covers it.
- `lintGameContracts.test.ts`: (a) the current game lints clean; (b) **mutation tests** that prove each check
  bites — e.g. rename a `cave_someone_lost` writer and assert `CONTRACT_READ_NO_ANCESTOR_PRODUCER`; change a
  declared `type` and assert `CONTRACT_TYPE_MISMATCH`; add an `equals 'injured'` and assert
  `CONTRACT_DOMAIN_DRIFT`. (These mutation tests are the proof the linter actually catches drift — the same
  execute-proof discipline as the Track A probes.)

## 8. Build sequence

1. The ledger deriver (`deriveLedger(game)`) + its test (snapshot the current game's ledger).
2. v1 checks (4 codes) + mutation tests; wire into `lintGame`.
3. v1.1 ancestor-aware check + the two opt-in annotations + mutation tests.
4. (Stretch) print the ledger as a table for the authoring loop.

## 9. Open decisions (for sign-off)

1. **Scope of the first PR:** ship **v1 only** (the 4 zero-FP checks + derived ledger) and follow with v1.1,
   or build **v1 + v1.1** (incl. the ancestor-aware rename-catcher) in one go? *My rec: v1 first — it's clean,
   zero-FP, immediately useful, and de-risks the harder ancestor-aware logic.*
2. **Annotations now or later:** add the `carriedRequired` / `domain` opt-ins in this work, or defer until the
   book actually has cross-chapter latches worth pinning? *My rec: define the types now, populate them when the
   book arc lands (they're zero-cost until used).*
3. **Severity of the heuristics:** keep `DOMAIN_DRIFT` and `LATCH_IN_CHOICE_EFFECT` as **warnings** (my rec —
   they can have legitimate exceptions), or make them errors?
