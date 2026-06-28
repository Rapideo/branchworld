# The Countinghouse — Heist Arc Design (C1)

> Game-arc spec (the world + structure layer, not chapter prose). The first game built on the post-v1.4 engine
> and the proven multi-chapter container (the cave's "Sump Line" is the template). Its explicit job: **showcase
> the v1.4 + counted-inventory features in service of fiction**, not as a feature demo. Approved 2026-06-27.
> Chapter authoring (C2) follows, one path at a time, via the chapter-authoring method.

## Context

The next game is a **one-night mob-heist thriller**: 1973, you and one partner rob the countinghouse of the
Castellano outfit — the room where a crew counts and launders the week's cash. The job goes sideways. It is the
proven time-pressure survival engine in a new skin (the cave taught us the shape: an acute per-chapter clock over
a slow-burn carried meter, branch-and-reconverge chapters, an earned dark range of endings).

The arc is designed so each new engine capability **carries fictional weight**:

| Engine feature (v1.4 / inventory) | Heist fiction |
|---|---|
| Counted inventory (`has_item`, item counts) | charges, tools, and **the take** (counted loot) |
| `adjust_resource` (clock-agnostic offset) | **"The Lead"** — a survival meter a choice can *raise* (kill the alarm, the lookout buys minutes, the inside man stalls) |
| Node-named endings (`endsWith`) | the distinct getaway finales, no latch-tax |
| Out-of-time ending (`outOfTimeEndingId`) | **"Dawn"** — the night simply ran out |
| atZero death by priority (F2 dominance) | **"The Outfit's Math"** — the Lead hit zero; the outfit takes you in their own building |
| Cross-chapter contracts (A1 v1.1) | the carried lead / loot / partner / latches, machine-checked |
| Walker (A4/A7) | exhaustive reachability + value-at-endings over the authored slice |

**The two kinds of heat** (cops + the outfit) are the thematic spine and map cleanly onto the two failure
mechanisms: stay too loud and burn your margin → the *outfit* catches you (atZero death); let the night run out
→ *dawn / the cops* (out-of-time).

## The world

- **When/where:** one night, 1973. The Castellano outfit's countinghouse — an unmarked floor over a laundry,
  with a count-room safe, a back stair, a loading door, and an office. Cold, literary, procedural tone (the cave's
  restraint, not pulp).
- **The crew:** **you + one tracked partner** — the boxman (the safe man). The partner is the emotional core; their
  state (`partner_status`) is carried and decides which ending is honest. Light named crew (a driver, a lookout)
  exist as fiction and as `adjust_resource` levers, not as tracked characters.
- **The job:** get in, crack the box, take what you can, get out before either heat closes. "Gone sideways" = the
  outfit's count-crew comes back **early** (the Phase-3 turn), collapsing the night's margin.

## The spine (four phases ≈ four chapters)

A full playthrough is four chapters; the **first proof authors one path through** (like the cave slice):
ch1 → one Floor route → the Box → one Way-Out route.

1. **The Way In** *(hub)* — case the building, choose the entry route, kit up. Sets the `entry_route` fork and
   your starting gear (charges/tools). Establishes the clock and the starting Lead.
2. **The Floor** *(route-exclusive: two ways)* — the **quiet inside job** (slow, low-noise, preserves Lead, needs
   tools/finesse) **vs the fast loud way** (quick, trips toward `alarm_tripped`, costs Lead, may need a charge).
   Route-exclusive content is the replay hook.
3. **The Box** *(crack the safe + the "gone sideways" turn)* — spend charges/tools to open the box; grab loot
   (the counted take — greed vs. time). Mid-chapter, **the outfit comes early**: the acute turn that collapses
   margin and forces the Way Out.
4. **The Way Out** *(route-exclusive: two ways, reconverging at the car)* — the two escape routes reconverge at
   the getaway car, **where the endings resolve**. This is where node-named finales, the out-of-time ending, and
   the atZero death all live.

## The mechanical layer

### Nested pressure (the cave's acute-clock + slow-burn DNA)

- **The clock** — each chapter has its own acute deadline (the patrol, the count-crew's return, the dawn). Same
  per-chapter clock the cave uses.
- **The Lead** — *the survival meter, and the `adjust_resource` showcase.* Your head start on the heat. A
  **time-driven resource that falls** (the night erodes it; loud/slow choices cost it) — engine-faithful (resources
  only deplete). At `min` (0): the heat is **here**. The new capability: a choice can **raise it back** via
  `adjust_resource` (cut the alarm relay, the lookout's whistle buys three minutes, the inside man stalls the
  count-crew). Carries across chapters (rebased).
- **The partner** — a carried latch `partner_status` ∈ {`steady`, `frayed`, `hurt`, `gone`}, the cave's
  `companion_status` analog. Beats across the night test their nerve; it gates content and decides which ending is
  honest. **Slice scope:** the gone-sideways turn always *frays* the boxman, so at the finale he is `frayed` (or
  `gone` if abandoned); `steady`/`hurt` are forward-declared for later chapters. A present-but-frayed partner
  **counts as a clean getaway** — the getaway prose is written to a rattled man, not a serene one. When the arc
  adds a `hurt` state, the clean gate tightens to exclude it (a wounded boxman in the back seat is never "clean").

### The carried-output contract (machine-checked by the A1 v1.1 linter)

Carried chapter-to-chapter, and contract-annotated so the linter polices it:

| Carried state | Kind | Contract annotation |
|---|---|---|
| `lead` | resource (rebased each chapter) | `carriedRequired` by the Way-Out chapters |
| `partner_status` | latch/string | `domains` = {steady, frayed, hurt, gone}; `carriedRequired` |
| `loot` | counted item | `carriedRequired` by the Way-Out chapters |
| `charges`, `tools` | counted items | carried |
| `entry_route` | string/latch | carried; gates route-exclusive content |
| `alarm_tripped`, `made_clean` | latches | **mutex pair** (`mutexLatches`) |

This is exactly the cross-chapter contract the v1.1 lints (`CONTRACT_READ_NO_ANCESTOR_PRODUCER`,
`CONTRACT_DOMAIN_VIOLATION`, `MUTEX_LATCH_UNGUARDED`, `CONTRACT_UNKNOWN_ANNOTATION`) were built to police.

### The take, and the endings

**Counted loot is the spine of the back half**: how much you grab (a counted item) trades against how long you
stay, which burns the Lead. *Greed vs. getting out clean* is the central tension. The finale set (the dark range
the cave taught us to earn):

| Ending | Fires when | Feature |
|---|---|---|
| **Clean Away** | out, take whole, partner with you, Lead intact | node-named (`endsWith` at the getaway) |
| **Away, Lighter** | out — but you dropped loot or the partner to do it | node-named |
| **Out, Not Whole** | out — but the partner's gone (left / dead) | node-named (mutex-guarded) |
| **The Outfit's Math** | the Lead hit zero — the margin's gone, and you're in *their* building | atZero death (lead→0; single atZero ending, F2-dominant priority) |
| **Dawn** | the night ran out before you cleared | out-of-time (`outOfTimeEndingId`) |
| **Still Inside** *(default)* | never made the getaway — "the lights came on" | honest catch-all default |

The two failure endings map to the **two kinds of heat**: burn the Lead to zero → the *outfit* takes you (atZero
death); let the night simply run out → *dawn / the cops* (out-of-time). Both new ending features, earned by the
fiction. (`alarm_tripped` is not the atZero condition — the engine's `atZero.ending` is a single id — it does its
work elsewhere: Floor consequences, faster Lead drain, and which getaway finale is honest.)

## The first authored slice (the C2 proof)

Author **one full path** end-to-end before fanning out (the cave-slice discipline):

- **The Way In** (hub, one chosen entry route) → **The Floor** (one route — start with the *quiet inside job*) →
  **The Box** (crack + the early-return turn) → **The Way Out** (one route, reconverging at the car).
- Must reach at least: **Clean Away**, **Away/Lighter or Out-Not-Whole**, **Dawn** (out-of-time), and the honest
  **Still Inside** default — so every showcased ending mechanism is exercised by real reachable play.
- Must spend a charge (counted inventory), use at least one `adjust_resource` Lead-buy, and carry
  `lead`/`loot`/`partner_status` across one chapter boundary (so the A1 contracts and the walker have real content
  to check).

The remaining Floor/Way-Out routes and the other two full chapters follow once the slice is proven and reviewed
(replay-route expansion, exactly as the cave did evenings/routes).

## Keystone prose (voice calibration)

Three anchors that fix the voice — 1970s, cold, literary, procedural, restrained; the mob is *procedure, not
menace*; sparse dialogue. The rest of the slice is authored to match these.

**`n_street` — the open (casing the countinghouse):**
> The countinghouse keeps bankers' hours in a building that doesn't. From across the street it is a laundry with
> the lights off and a second floor that never quite goes dark — a slot of yellow at the edge of a drawn blind,
> and behind the blind the outfit's money getting counted into the small hours by men who are good with numbers
> and nothing else. {{time}}. The boxman is in the car beside you with his hands in his lap, not smoking, because
> he gave it up the way he gives everything up: all at once and for good. "Two ways in," he says, not a question.
> You have looked at both for a month. The quiet way is the service door and a long patient hour of nobody
> noticing. The loud way is faster, and fast does not forgive. You watch the slot of yellow light and you do the
> arithmetic one more time, the way you always do, because the arithmetic is the job and the rest is just nerve.

**`n_turn` — the gone-sideways turn (the count-crew comes back early):**
> You hear the street door before you understand it — the particular complaint of a hinge you cased for a month
> and know the voice of — and then the stairs, more than one man, unhurried, the sound of people who belong here
> coming back to a place that is theirs. The count-crew. Early. Nobody is early in this business; early is a thing
> that happens to other people, and now it is happening to you, with the box open and the take in your hands and
> the only door the one the footsteps are climbing toward. The boxman has gone the grey of old putty. "They don't
> come back till four," he says — to you, to the room, to the arithmetic that just stopped being true. It does not
> matter now what was supposed to happen. What matters is the stairs, and the count of them, and how few are left.

**`end_outfit` — The Outfit's Math (the atZero death):**
> It is not personal, and that is the worst of it. The outfit does the sum the way it does every sum — what was
> taken, what it costs to take it back, what the difference buys in the way of a message — and you are a line in
> the ledger now, a number carried from one column to another in a room that smells of cold coffee and other
> people's money. There is no speech. Men who are good with numbers do not make speeches. Somewhere out in the
> night the boxman is running, or is not; the building has stopped being your problem and become arithmetic, and
> arithmetic does not hurry and does not miss. The margin you spent the whole night buying back, minute by minute,
> is spent. The lead is gone. They have you, and they have all the time the books allow — which is exactly as much
> as they need, and not one minute more.

## Out of scope (deferred / parked)

- **Chapter prose / node graphs** — that is C2 (the chapter-authoring method), not this spec. This spec fixes the
  world, the spine, the carried contract, the ending set, and the feature mapping only.
- **Other heist capabilities** — characters-as-assets (the partner is a latch for now, not an asset record),
  timed/skill agility challenges (mostly front-end), and an explicit clock/phase profile. Each gets its own
  brainstorm/spec when the heist's structure demands it.
- **WS-G front-end** (the backpack/meter UI) — the `kind:'item'` tag and resource `label` are the only bridges,
  already in place; no engine work now.
- **P2 lints** (F8 transition-aware producer check, F9 domain-FP trim, F10 chapter-deadline-OOT lint) — clean on
  shipped content; fold in if the heist content trips them.

## Verification

- The arc is **content on the frozen v1.4 engine** — zero engine change is the bar (same as the cave). The proof
  is: the authored slice **lints clean** (story lints + the A1 game-contract linter over the carried contract),
  the **seeded walker** reaches the four required endings and reports value-at-endings, and the **fuzzer** finds no
  player-reachable incoherence (a dishonest ending, an unreachable required ending, a contract violation).
- The slice gets a cross-chapter test (carry of `lead`/`loot`/`partner_status` across a boundary) and a
  walker-backed reachability test for the four endings, mirroring the cave's `lintGameContracts` + `seededWalk`
  harness.
- TDD throughout the C2 authoring; nothing pushed (local commits only).
