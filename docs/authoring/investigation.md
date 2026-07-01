# Authoring guide: INVESTIGATION (`investigation:'on'`)

Use this when the player examines physical hotspots to gather clues, and those clues gate the winnable ending. The engine injects `__examine_<id>` choices at nodes that carry `examinables`; the author builds the hotspots, the clue-gated endings, and the scene prose that reads cleanly both before and after searching.

---

## The examinable shape

Each hotspot is an `Examinable` object placed in the `examinables` array of a `StoryNode`:

```typescript
import type { Examinable } from '../engine';

const hotspot: Examinable = {
  id: 'desk',                        // hotspot id; injected choice is __examine_desk
  label: 'Search the writing desk',  // shown to the player as the choice label
  clue: 'debt_receipt',              // the clue added to WorldState.clues when taken
  reveal: 'Beneath a sheaf of correspondence you find a receipt …', // prose pushed to the log
  minutes: 15,                       // optional; time cost under clock:'timed' (monotonic, >= 0)
  conditions: [                      // optional extra gate; any evaluateConditions-compatible list
    { field: 'some_var', op: 'is_true' },
  ],
};
```

Fields at a glance:

| Field | Required | Notes |
|---|---|---|
| `id` | yes | unique within the node; the injected choice id is `__examine_<id>` |
| `label` | yes | the player-facing choice label |
| `clue` | yes | must be non-empty; appears in `WorldState.clues` after examination |
| `reveal` | yes | 1–3 sentence prose pushed to the log surface on examine |
| `minutes` | no | time cost; meaningful only under `clock:'timed'`; absent = free |
| `conditions` | no | extra availability gate layered on top of the self-hiding rule |

Declare `investigation:'on'` on the story's `profile`:

```typescript
const myStory: Story = {
  ...
  profile: { clock: 'timed', investigation: 'on' },
};
```

---

## The self-hiding `!has_clue` rule

A hotspot is available if and only if its clue is **not** already held. This is enforced by `examinablesAt` in `src/engine/investigation.ts`:

```typescript
// investigation.ts (excerpt — read-only; do not replicate this logic)
export function examinablesAt(node: StoryNode, state: WorldState): Examinable[] {
  return (node.examinables ?? []).filter(
    (ex) => !state.clues.includes(ex.clue) && evaluateConditions(ex.conditions, state),
  );
}
```

Once a player examines a hotspot, its clue enters `state.clues`. On the next `view()` call `examinablesAt` silently drops it from the injected choices — the hotspot disappears. No author-side flag or `conditions` entry is needed to achieve this: it is automatic.

---

## Coexistence with hand-authored `add_clue`

`investigation:'on'` and authored `add_clue` effects are not in conflict. You may add a clue via a choice effect or `entryEffects` as well as via an examinable. Both routes enter the clue into `state.clues`; `examinablesAt` reads `state.clues` regardless of how the clue arrived. This means:

- A clue acquired by an authored `add_clue` will suppress the matching hotspot on the next view — the hotspot self-hides even if the player never took the `__examine_` path.
- A clue forced in by `entryEffects` (e.g., a separate tutorial node that auto-awards a clue) silences the hotspot correctly.

Use authored `add_clue` for clues that must be delivered without player agency (exposition, off-screen delivery). Use `examinables` for clues the player must spend time and choose to pursue.

---

## Settle-on-examine semantics

When the player takes an `__examine_<id>` choice, the engine does NOT navigate to a new node. Instead:

1. The effects from `examineEffects(ex)` are applied in place: `add_clue` first, then `add_minutes` (if `ex.minutes` is set).
2. The `reveal` text is pushed to the log.
3. `GameEngine.settle` is called on the **current node** — the same post-arrival tail that fires scheduled events, recomputes resources, and runs the ending resolver.

The key implication: **a costly examine can end a timed game**. If the player examines a hotspot whose `minutes` cost pushes the clock past the `deadline`, the settle pass sees the overdue clock and resolves the ending immediately. The player never reaches a choice node for an accusation — the game ends at the scene they were examining.

The same mechanism fires `ScheduledEvent` triggers. If an event's trigger condition becomes true after the time advance, the event fires from `settle` and routes the player to `ifPresentNode` (or applies `ifAbsentEffects`). An author can use this to pull the player out of the investigation scene after a time threshold — even mid-examination.

```typescript
// A ScheduledEvent that routes the player out of the study at 09:45
{
  id: 'constable_arrives',
  title: 'The Constable Arrives',
  trigger: [{ field: 'time', op: 'time_after', value: '09:45' }],
  eventLocation: 'study_room',
  ifPresentNode: 'constable_interrupts',   // player is routed here on examine if past 09:45
  ifAbsentEffects: [],
  recoveryNodeId: 'study',
},
```

---

## The completability guarantee — and its honest scope

`verifyInvestigation` certifies that **winning is structurally possible within the deadline** — not that examining every hotspot wins. Specifically, it checks that at least one clue-gated success ending appears in `satisfiedEndings`: the set of non-default endings whose conditions hold at a terminal state reached at or before the deadline.

This is a deliberate scope:

- **Red herrings are valid design.** You can author a hotspot whose clue gates nothing. A player who examines it spends real time and gets no path to the win. `verifyInvestigation` does not flag this — it only confirms the win path exists, not that every path leads there.
- **The deadline can force "choose what to examine."** If the sum of all hotspot costs exceeds the deadline window, examining everything is impossible. The guarantee says a winning subset exists within the window; it does not say examining the full set is feasible or safe.
- **untimed stories short-circuit.** For `clock:'untimed'` stories, `verifyInvestigation` skips the deadline check entirely — completable is trivially true, and `minutes` on hotspots are inert.

---

## Seven author rules

### Rule 1 — Gate the winnable ending with `has_clue`, or completability proves nothing

`verifyInvestigation` detects completability by looking for success endings whose `conditions` include at least one `has_clue` check. If no ending condition uses `has_clue`, the verifier classifies it as "no clue gate" and skips the deadline check — the whole logic is a no-op, because any path to a terminal is a win path. This is the **vacuous-pass trap**.

Always gate the winning ending on the clues you want the player to gather:

```typescript
// Good — has_clue conditions anchor the completability check
endings: [
  {
    id: 'accuse_partner',
    conditions: [
      { field: 'debt_receipt', op: 'has_clue' },
      { field: 'ledger_gap',   op: 'has_clue' },
      { field: 'safe_combo',   op: 'has_clue' },
    ],
    priority: 1,
    ...
  },
  { id: 'wrong_accusation', conditions: [], isDefault: true, ... },
],
```

If you want a "win without all clues" variant, gate it on the subset of clues that define that ending — not on no conditions at all.

### Rule 2 — `reveal` renders to the secondary log surface in v1; keep it 1–3 self-contained sentences

In v1 the `reveal` text is pushed to `GameView.log`, not interpolated into the node body. It appears in a separate log panel (inspector's notebook, findings sidebar — the exact presentation is front-end defined). Design `reveal` text accordingly:

- Self-contained: the player may read the log in isolation from the scene body.
- 1–3 sentences maximum: the log is a running record, not a prose passage.
- No scene-framing language: don't write "You search the room and …" — the choice label already carries that meaning. Write what was found.

```typescript
// Good — self-contained discovery, no scene preamble
reveal: 'Beneath a sheaf of correspondence you find a receipt — Alderton settled a substantial personal debt two days ago. The creditor is his business partner, Caldwell.',

// Avoid — long passage, scene-framing prose, reads as body not log
reveal: 'You spend several minutes searching through the various items on the desk before finally turning over a folded sheet of paper hidden under a heavy book. The paper reveals itself to be a receipt ...',
```

### Rule 3 — Write the scene body to read in both the unsearched and fully-searched states

The `body` of a node with `examinables` is displayed every time the player views that node — before, during, and after examination. It must read naturally whether zero or all hotspots have been taken. This is the "scene complete" convention.

Write the body as a static inventory of what is present in the room, not as a prompt to search:

```typescript
// Good — static description, reads at any examination state
body: 'The room where Alderton died. Heavy curtains, a writing desk strewn with papers, an account ledger on a stand, a landscape painting slightly off-plumb, and on the mantelpiece an ashtray holding a half-burned cigar.',

// Avoid — imperative prompt that reads oddly after the player has already searched
body: 'Search the study: there is a desk, a ledger, a painting, and an ashtray to examine.',
```

Carry the "what you found" narrative in `reveal` (log surface) and let the body stay as a stable scene anchor.

### Rule 4 — Worked deadline-vs-examine-cost arithmetic

`INVESTIGATION_DEADLINE_UNREACHABLE` fires when no clue-gated success ending is reachable with its required clues within the deadline. Here is the arithmetic the verifier performs:

```
deadline window  = story.deadline − story.startTime   (in minutes)
LB cost per clue = Examinable.minutes (for load-bearing hotspots)
win path cost    = sum of minutes for the clues that gate the success ending
                   + minutes for any navigation choices on the path to the terminal
```

**Concrete example (The Locked Study):**

```
startTime = 09:00, deadline = 10:00  →  window = 60 min
desk.minutes    = 15  (debt_receipt)
ledger.minutes  = 15  (ledger_gap)
painting.minutes = 15  (safe_combo)
ashtray.minutes  = 20  (red herring — cigar_brand)

win path (3 LB clues, no navigation cost): 15 + 15 + 15 = 45 min ≤ 60 min  ✓
red herring path (all 4): 45 + 20 = 65 min > 60 min  → herring kills the run ✓
```

If you change all three LB hotspots to 30 minutes: `30 × 3 = 90 > 60` — no winning subset fits the window — and `verifyInvestigation` fires `INVESTIGATION_DEADLINE_UNREACHABLE`.

Fix: reduce `minutes`, widen the deadline window, or reduce the number of required clues.

### Rule 5 — `remove_clue` of a hotspot's clue re-opens that hotspot; gate with a boolean var to prevent re-examination

`examinablesAt` hides a hotspot when the clue is in `state.clues`. If you author a `remove_clue` effect anywhere in the story and the removed clue belongs to a hotspot, that hotspot becomes available again on the next view. This is rarely what you want.

If you need to revoke a clue for narrative reasons, pair the `remove_clue` with a boolean guard to prevent re-examination:

```typescript
// Variable to close off re-examination
variables: [
  { name: 'desk_searched', type: 'boolean', default: false, purpose: 'prevents re-examining the desk' },
],

// The examinable gates on the guard
examinables: [
  {
    id: 'desk',
    label: 'Search the writing desk',
    clue: 'debt_receipt',
    reveal: '...',
    conditions: [{ field: 'desk_searched', op: 'is_false' }],
  },
],

// Wherever you set the guard (e.g., entryEffects of the examine node or a choice effect)
effects: [
  { field: 'desk_searched', op: 'set', value: 'true' },
  { field: 'clues', op: 'remove_clue', value: 'debt_receipt' },
],
```

The `conditions` gate (`is_false`) prevents the hotspot from reappearing even when the clue is gone.

### Rule 6 — Treat `EXAMINE_CLUE_UNUSED` as an error in a mystery

`EXAMINE_CLUE_UNUSED` is classified as a `warning` by `lintInvestigation` — it fires when a hotspot's clue is not read by any `has_clue` condition anywhere in the story (endings, choices, node conditions, events, or other examinables).

In a mystery, an unread clue is paid-for dead weight: the player spends time examining a hotspot, reads a reveal that implies significance, and then the clue never influences any branch. Treat `EXAMINE_CLUE_UNUSED` as an error. Either:

- Add a `has_clue` condition somewhere (an ending, a conditional choice, a gated scene) that makes the clue load-bearing, or
- Demote it to a fully free atmospheric `reveal` delivered by an authored `entryEffects` or choice — not an examinable that costs time and a hotspot slot.

Red herrings are valid (a clue that misleads the player into spending time on a wrong path), but a red herring **is read** by the game: the wrong-accusation branch might carry an authored check, or the reveal text deliberately frames the mislead. A clue that no condition ever reads is not a red herring — it is an orphan.

### Rule 7 — Run both `lintStory` and `verifyInvestigation`; for multi-chapter games, run them per chapter

`verifyInvestigation` does NOT subsume `lintStory`. The investigation verifier runs `lintInvestigation` internally, but `lintStory` covers the full cross-cutting sweep: dead choices, orphan nodes, ending ambiguity, resource bounds, event recovery, and all the general story hygiene checks. Running only `verifyInvestigation` will miss non-investigation lint failures.

```typescript
import { lintStory } from '../engine';
import { verifyInvestigation } from '../engine/stateSpaceWalk';  // NOT on the ../engine barrel

// Per-story verification
const lintResult = lintStory(myStory);
const verifyResult = verifyInvestigation(myStory);

expect(lintResult.errors).toEqual([]);
expect(verifyResult.ok).toBe(true);
```

For a multi-chapter game, run both checks on each chapter's story individually. The container-level `lintGame` covers inter-chapter contracts (carry, transitions) but does not walk the state space of each chapter. The investigation verifier is story-scoped, not game-scoped.

```typescript
import { lintGame } from '../container/lintGame';
import { lintStory } from '../engine';
import { verifyInvestigation } from '../engine/stateSpaceWalk';

// Multi-chapter: check the container contracts
expect(lintGame(myGame).errors).toEqual([]);

// Then check each investigation chapter story individually
for (const ch of myGame.chapters) {
  if (ch.story.profile?.investigation === 'on') {
    expect(lintStory(ch.story).errors).toEqual([]);
    expect(verifyInvestigation(ch.story).ok).toBe(true);
  }
}
```

---

## Reference implementation

`src/container/investigationExample.ts` — "The Locked Study" — is the canonical reference. It exports:

- `investigationStudy` — the clean timed story (3 load-bearing hotspots × 15 min each = 45 min ≤ 60 min deadline; 1 red herring at 20 min that kills a full-set run).
- `investigationStudyUntimed` — the same story with `clock:'untimed'` and no `minutes`; `verifyInvestigation` passes via the untimed short-circuit.
- `investigationStudyUnreachable` — load-bearing hotspots set to 30 min (3 × 30 = 90 > 60); fires `INVESTIGATION_DEADLINE_UNREACHABLE`.
- `investigationStudyEndsWith` — combines the unreachable variant with `verdict.endsWith:'accuse_partner'`; the P0 guard (`satisfiedEndings` re-evaluates conditions at the terminal, not just reachability) ensures `verifyInvestigation` still returns `ok === false`.
- `investigationExample` — the single-chapter `Game` wrapping `investigationStudy`.
- `bareChapterInvestigationGame()` — factory proving that the root-profile stamp (`resolveProfile`) closes the silent-failure class: a chapter whose own `story.profile` omits `investigation:'on'` still gets examination injection when the game-level profile carries it.

Read `investigationExample.ts` alongside this guide to see every rule applied in code.
