# Sub-project C — Validation Chapter: "The Prater Line" — Design

> **Status:** Approved design (2026-06-16). Next step: implementation plan via writing-plans.
> **Depends on:** Sub-project A (hardened engine + linter) and B (web player) — both complete.
> **PRD references:** §5 (sub-project C), §6 (success criteria), §EE-1…EE-4.

## 1. Goal & scope

Port Team 3's chapter **"The Prater Line"** to the hardened v1.1 engine as the reference
implementation, and **prove the living-world thesis**: the clock bites, the scheduled event fires
present *and* absent (with a recoverable clue), endings resolve from accumulated state with no
zero-match holes or dead-code, and no node narrates a flag that isn't set on the path that reached
it. This is a **full faithful port** — the complete chapter with its time/knowledge prose variants,
the optional Volkov underpass, full trust math, and all four endings — using the team's actual
Le Carré-register prose.

**Out of scope (deferred, not dropped):** AI-assisted prose-vs-flag analysis (Sub-project D); any
authoring/graph UI (D); additional chapters; any engine feature work beyond what the port needs
(see §6 on `has_item`).

## 2. Decisions (locked during brainstorming)

| # | Decision | Choice |
|---|---|---|
| 1 | Which chapter | **The Prater Line (Team 3)** — the review's named reference implementation. |
| 2 | Fidelity / size | **Full faithful port** — all nodes + time/knowledge prose variants, Volkov underpass, full trust math, 4 endings. |
| 3 | Clock feel | **Bites, but fair** — efficient decisive play makes the 02:10; one major detour affordable, two/dawdling misses (PRD §1.1). |
| 4 | Prove EE-4 | **Checklist + playthrough state tests** — automated tests assert exact state at each ending/variant; a written audit table maps prose claims → set flags. |
| a | Structure | **One typed `Story` object** (`src/content/praterLine.ts`) + co-located validation tests + spec audit table (Approach A). |
| b | Microfilm gating | Modeled as the boolean flag **`has_real_microfilm`** (the engine has no `has_item` condition op). |
| c | Endings | Add a **mandatory default catch-all** the original lacked. |

## 3. Source material

Extract prose + structure from:
- `branchworld-review.md` — structured summary at §343+ (locations, characters, event, endings) and
  full node prose at §1339+.
- `data.js` (`window.REPORT_DATA`) — the structured chapter data behind the report.

Adapt during the port: strip hardcoded fictional timestamps from prose, substitute the `{{time}}`
token where a clock reference is wanted, and split OR-logic into separate flag-equivalent choices.

## 4. Data-model mapping (v1.1 `Story`)

- **Story:** `id: 'prater_line'`, `startTime: '20:00'`, `deadline: '02:10'`, `startLocation: loc_safehouse`.
- **Locations (7):** `loc_safehouse` (Margareten Safehouse), `loc_sperl` (Café Sperl),
  `loc_riesenrad` (Prater Ferris Wheel), `loc_canal` (Danubekanal Embankment — event site),
  `loc_canal_drop` (Third Bollard dead-drop — **recovery node**), `loc_westbahnhof` (Platform 3 — resolution),
  `loc_underpass` (Aspern Bridge Underpass — optional Volkov contact).
- **Variables:**
  - numbers: `lindqvist_trust` (default 0), `dragomir_trust` (0), `volkov_suspicion` (0)
  - booleans: `knows_dragomir_blown` (false), `handoff_witnessed` (false), `handoff_missed` (false),
    `has_real_microfilm` (false)
  - string: `companion` (default `'none'`; set to `'dragomir'` when she follows)
  - Each declares one semantic purpose (§EE-5).
- **Clues:** `saw_real_receiver`, `knows_who_took_film`, `chalk_marks`.
- **Scheduled event** `event_handoff`:
  - `trigger: [{ field: 'time', op: 'time_after', value: '23:30' }]`
  - `eventLocation: loc_canal`
  - `ifPresentNode: node_handoff_witnessed` (entry effects: `add_clue saw_real_receiver`,
    `set handoff_witnessed=true`, `increment volkov_suspicion`)
  - `ifAbsentEffects: [ set handoff_missed=true, add_clue chalk_marks ]`
  - `recoveryNodeId: node_canal_drop` (navigable; reading the marks yields `add_clue knows_who_took_film`)

## 5. Endings — ordered resolver + mandatory default

Ordered list (resolver returns the first non-default match; default is the mandatory catch-all):

1. **The 02:11 Platform** — `time_after 02:10`. (Missed the train; dominates other state.)
2. **The Man Who Knew Too Much** — `handoff_witnessed is_true ∧ knows_dragomir_blown is_true ∧ volkov_suspicion gte 3 ∧ lindqvist_trust lt 2`.
3. **The Last Train West** — `time_before 02:10 ∧ dragomir_trust gte 3 ∧ companion equals 'dragomir' ∧ has_real_microfilm is_true`.
4. **Smoke on the Embankment** — `dragomir_trust lt 3 ∧ volkov_suspicion gte 4`.
5. **(default, mandatory)** **A Cold Vienna Dawn** — no conditions. Any in-time state that matches none
   of the above resolves here instead of falling through to the hero ending (the original's bug).

Choices may advance state/time but **must not** target an ending (linter `CHOICE_TARGETS_ENDING`).
The resolution node is `loc_westbahnhof`'s node (`resolvesEnding: true`); the deadline also forces
resolution when `time >= 02:10`.

## 6. The six documented bugs → how the port fixes each

| Review bug | Fix in the port |
|---|---|
| Hard deadline cannot run out (costs ~10× too small) | Recalibrate `add_minutes` (see §7); linter `CLOCK_CANNOT_BITE` proves the longest path exceeds 02:10. |
| Hardcoded node timestamps contradict the clock | Engine-derived time only; prose uses `{{time}}` or relative phrasing (EE-1). No node carries an authoritative time. |
| Missed-event recovery path unreachable / dead content | `loc_canal_drop` is a navigable `recoveryNodeId`; visiting after an absent handoff yields `knows_who_took_film` (EE-2), keeping the path open. |
| Failure runs mis-route into the hero ending | Ordered resolver + mandatory default (§5); ending tests prove each failure path lands correctly (EE-3). |
| `volkov_suspicion gte 4` / double-cross gate effectively unreachable | Tune suspicion accrual (Riesenrad sighting, witnessing, Volkov contact) so *Smoke* and the deal gate are genuinely reachable; a playthrough test reaches each. |
| `has_item` vs `has_clue` op mismatch | Model the real microfilm as boolean `has_real_microfilm` (checked `is_true`). The engine has no `has_item` condition op — inventory is write-only. *(Noted as a future engine enhancement; not built for C.)* |

## 7. Clock calibration (bites-but-fair)

- **Window:** 20:00 → 02:10 = **370 minutes**.
- **Targets** (tuned during implementation against the linter + playthroughs, not guessed):
  - Efficient, decisive spine (Safehouse → Sperl → Canal → Westbahnhof): ≈ **330–355 min** — makes the
    train with a small margin.
  - Representative costs: tram **+10**, cross a district on foot **+20**, a full conversation **+15–30**,
    Riesenrad detour ≈ **+25**, Volkov underpass ≈ **+30**.
  - One major detour is affordable; **two detours, or genuine dawdling, exceed 370** → *The 02:11 Platform*.
- **Linter guarantees:** longest reachable path **> 370** (no `CLOCK_CANNOT_BITE`) and a viable path
  **< 370** (no `POSSIBLY_UNWINNABLE`). Exact per-action costs are finalized by iterating
  lint + playthrough assertions until both the lint constraints and the bites-but-fair feel hold.

## 8. AND-only condition handling

The engine ANDs a condition list; there is no OR. Where the original offers two routes to the same
knowledge (`knows_dragomir_blown` via the Riesenrad sighting **or** reading the chalk at the drop),
the port keeps them as **separate choices/nodes that each set the same flag** — faithful to the
original and verified flag-equivalent so a player who takes either route is never silently railroaded
into the worst ending (the review's "validate alternate knowledge routes set the same flag" P1).

## 9. Validation — the proof (C's whole point)

`src/content/praterLine.test.ts` (node env, against the real engine):
- **Lints clean:** `lintStory(praterLine).ok === true`; zero errors. Warnings, if any, are enumerated
  and justified in the spec/audit (target: zero).
- **Every ending reachable:** a scripted playthrough reaches **each of the 5 endings**, and asserts the
  exact accumulated state at resolution (trust values, flags, `companion`, clues, time bucket).
- **Scheduled event both ways:** one test with the player **present** at `loc_canal` at 23:30
  (→ `saw_real_receiver`, `handoff_witnessed`); one **absent** (→ `handoff_missed`, then recover
  `knows_who_took_film` by visiting `loc_canal_drop`).
- **Clock bites both directions:** a **dawdling** path resolves to *The 02:11 Platform* (`time_after 02:10`);
  an **efficient** path reaches *The Last Train West* before 02:10.
- **Alternate-knowledge equivalence:** both routes to `knows_dragomir_blown` end with the flag set.

**Prose-vs-state audit (EE-4):** a table in this spec and a short `docs/prater-line-prose-audit.md`
mapping **each ending and each state-gated prose variant → the flags its prose asserts**, cross-checked
against the reaching path (which the playthrough tests prove is real). No prose claim may reference a
flag the path does not set.

## 10. Player integration

Add a minimal **content selector** to the B App: a small control to switch between the bundled demo
(`sampleStory`) and **The Prater Line** (`praterLine`). Both load through the same `useGame`/engine
path — an honest demonstration that the core is content-agnostic. Selecting a story resets the engine
to that story's start. (No routing, no persistence of the selection beyond the session — YAGNI.)

## 11. Done-when

- `src/content/praterLine.ts` exists as a typed `Story`; `lintStory` is clean.
- The full validation suite (§9) is green; `tsc` and `vite build` clean.
- All five endings are reachable; the scheduled event fires present and absent with a recoverable clue;
  a dawdling run misses the 02:10 and an efficient run makes it.
- The prose-vs-state audit table shows no unmatched prose claims.
- The chapter is playable in the web player via the content selector, and a reviewer feels reactivity
  on the **time and events** axes, not only the clue axis (PRD §6.6).
