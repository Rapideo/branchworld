# Engine Assessment — Cave Multi-Chapter Experiment

> Living log. Each entry: **what we wanted**, **what the engine gave us**, **the workaround**, a
> **verdict** (free / workaround-clean / workaround-ugly / impossible), and a **recommended engine
> change** with a rough size. The engine (`src/engine/`, v1.3) is frozen; everything here is a finding,
> not a fix. Summary + prioritized shortlist live at the bottom.

## Findings (container / E1)

### F1 — Seeding a chapter with carried state
- **Wanted:** start a chapter's `GameEngine` from the previous chapter's accumulated state (vars,
  resources, clues, inventory).
- **Engine gave us:** `GameEngine` always builds its initial state from the `Story` (`initState`): vars
  from `variable.default`, resources from `resource.start`, and `clues`/`inventory` always empty. No
  public "construct with this WorldState" seam.
- **Workaround:** `seedChapterStory` clones the chapter's `Story` and rewrites `variable.default` and
  `resource.start` from carried values, and prepends `add_clue`/`add_item` entry effects to the start
  node for carried clues/items.
- **Verdict:** workaround-clean (vars/resources) + workaround-ok (clues/items via entry effects).
- **Recommended change (small):** a `GameEngine` option / factory that accepts an initial `WorldState`
  (or a `Story.seedState`), so carried state needs no Story rewriting.

### F2 — Game-level clock / survival horizon
- **Wanted:** a slow survival burn and an overall rescue deadline that span the whole multi-chapter game.
- **Engine gave us:** one clock per `Story` (minutes from `startTime` to one `deadline`); time-driven
  resources recompute from the *current* chapter's clock.
- **Workaround:** the container keeps `gameElapsedMinutes` (sum of chapter durations), rebases each
  carried resource's `start` on entry (so the burn continues), and projects the game deadline onto each
  chapter's `deadline` (`min(chapter deadline, startTime + remaining)`).
- **Verdict:** workaround-clean.
- **Recommended change (medium):** native game-vs-chapter time — a game clock that chapters inherit, and
  resources that persist across chapters. (This is the `time-gating-flexibility` generalization; the
  experiment now has its concrete shape.)

### F3 — Game-level save
- **Wanted:** cross-session resume of a multi-chapter game.
- **Engine gave us:** `snapshot`/`restore` of a single chapter (`EngineSnapshot`).
- **Workaround:** `GameSnapshot` wraps the chapter snapshot with `currentChapterId`, `gameElapsedMinutes`,
  and the carry that seeded the chapter.
- **Verdict:** workaround-clean.
- **Recommended change (small):** none required; the wrapper is fine. Revisit if/when game structure
  becomes native.

## Findings (content / E2 — authoring the 3-chapter slice)

### F4 — Per-chapter `walkStateSpace` can't reach carry-only endings
- **Wanted:** exhaustively verify each chapter's endings are all reachable.
- **Engine gave us:** the walker runs a chapter from its authored defaults (full lamp, default latches), so
  endings that only fire on *carried-in* state — the dark endings (lamp carried low → at-zero) and
  "Daylight, All Three" (carried `cave_all_together`) — surface as `orphanEndings` and the at-zero path is
  never exercised standalone.
- **Workaround:** accept those specific orphans by design (tests assert exactly the carry-only set) and
  verify them instead in the cross-chapter `GameRunner` playthroughs (`sumpLine.test.ts`), where a low
  carried lamp does reach `end_dark_high` and carried `cave_all_together` reaches `end_daylight_all_three`.
- **Verdict:** workaround-clean (but it splits ending-coverage across two test layers).
- **Recommended change (small):** a `walkStateSpace(story, { seedState })` option (or a tiny seeded-walk
  harness over `seedChapterStory`) so a chapter can be exhaustively walked from a representative carried-in
  state — closing the verification gap chaptering opens.

### F5 — Scheduled-event present/absent reachability is navigation-fragile
- **Wanted:** an event that fires *present* if the player is at the spot when it triggers, *absent* if not —
  with BOTH branches reachable.
- **Engine gave us:** events fire on `enter()` keyed on (time ≥ trigger AND location == eventLocation). A
  node the player *passes through* (enters before the trigger, leaves after) never satisfies "present," so
  a naively-timed event makes its present node an unreachable orphan (both branch chapters had this).
- **Workaround:** retune each trigger time against the actual navigation timing so a *pace difference*
  straddles it — e.g. the slow rig is still at the oxbow when it hits (present) while the fast free-climb
  has crossed (absent). Good drama, but found only by arithmetic, not by the tools.
- **Verdict:** workaround-clean once tuned; easy to get wrong silently.
- **Recommended change (medium):** a lint/walker check that flags an `ifPresentNode` (or absent-recovery)
  that no reachable play actually reaches — turning a silent orphan into a build warning. (Also the
  `walkStateSpace` `eventRecovery` check could grow a present-reachability counterpart.)

### F6 — Time-driven resources can't be restored by an action
- **Wanted:** a "rest / warm up / swap the battery" choice that *raises* a survival meter.
- **Engine gave us:** a time-driven resource is a pure function of the clock; effects may not write it, and
  any action costs time, so "resting" only ever *lowers* it. A choice can't restore a time-driven meter.
- **Workaround:** cut the warming choice; survival meters only ever fall this slice.
- **Verdict:** workaround-ugly (a real mechanic — shelters, battery swaps — is simply unavailable).
- **Recommended change (medium):** allow a time-driven resource an additive choice-driven *offset* (value =
  clamp(base(time) + offset)), so effects can grant/spend against it without breaking the time model.

### F7 — Survival-resource calibration is coupled and unforgiving
- **Wanted:** the dark "lamp dies" ending reachable on long/careless play; the clean ending reachable on
  efficient play.
- **Engine gave us:** one depletion rate + start. A full lamp (100) at 5/12min can't reach 0 inside a
  ~155-min slice, so the dark endings were *unreachable until tuned* (start lowered to 60 — "a morning
  already spent"). And because the long-but-successful route and the dawdle-to-death route are close in
  total time, one global rate barely separates them (the clean high route survives with the lamp at ~5).
- **Workaround:** hand-tuned start (60) + the F4 cross-chapter verification; thematically the razor margin
  is a feature, but it's fragile and arithmetic-driven.
- **Verdict:** workaround-clean for the slice; doesn't scale to 10–12 chapters without tooling.
- **Recommended change (medium):** an authoring/lint aid that reports, per resource, the min/max value at
  every reachable ending (so "is the dark ending reachable? does the clean route survive?" is answered by
  the tool, not by hand). Pairs naturally with F4's seeded walk.

### F8 — State-resolved endings can't tell *which node* you resolved at
- **Wanted:** "you pulled through to the far rift" (a crossing-success ending) vs "you waited it out" (a
  default ending) — two different *nodes*, same surrounding state.
- **Engine gave us:** the ending resolver evaluates conditions over `WorldState` only; it has no idea which
  resolving node fired, so a waiting node could match a crossing-success ending whose state happened to hold.
- **Workaround:** add a latch (`cave_crossed`) set only at the crossing node, and gate the crossing ending
  on it — encoding "how you ended" into state.
- **Verdict:** workaround-clean (and arguably correct discipline), but it's a latch tax every time the
  *path*, not just the *state*, should pick the ending.
- **Recommended change (small):** let a `resolvesEnding` node name a specific ending id directly (resolve
  THIS ending), falling back to the state resolver — so node-determined finales need no bookkeeping latch.

### F9 (tooling) — Player & graph don't know about Games; barrel gap
- **Wanted:** play and visualise a multi-chapter Game.
- **Engine gave us:** the web player and flow-graph (D2) operate on a single `Story`; nothing renders a
  Game (chapter transitions, carried meters, the game clock). Also `walkStateSpace` isn't re-exported from
  the engine barrel (content/tests import it from `../../engine/stateSpaceWalk`).
- **Workaround:** a self-contained playable HTML harness over `GameRunner` (E2 Task 6); per-chapter graphing
  still works for each chapter.
- **Verdict:** workaround-fine for the slice; a real game-level player + chapter-graph view is the next
  tooling step (deferred to after playtesting, per Matthew).
- **Recommended change:** a "play a Game" mode in the web player and a chapter-graph layer in D2; export
  `walkStateSpace` from the barrel (trivial).

## Summary & prioritized shortlist

The container approach **held**: the slice plays end-to-end across the branch, the engine stayed **frozen**
(zero `src/engine/` changes, proven), and every gap became a clean public-API workaround — no friction was
fatal. The engine is in genuinely good shape for multi-chapter, nested-pressure narrative. What the
experiment now tells us to build, in priority order:

1. **P0 — Native game-vs-chapter time + cross-chapter resource persistence (F2)** + **carried-state seeding
   (F1).** The single biggest win: it dissolves the rebasing/projection/seed-rewrite workarounds and is the
   concrete shape of the long-deferred clock generalization. The experiment has now *specified it by
   example*.
2. **P1 — Verification at chapter scale: a seeded `walkStateSpace` (F4) + a per-resource value-at-endings
   report (F7).** Without these, authoring 10–12 chapters means hand-checking carry-only endings and
   resource tuning by arithmetic — the part that doesn't scale.
3. **P1 — A present/absent reachability lint for scheduled events (F5).** Catches a silent-orphan class that
   bit *both* branch chapters.
4. **P2 — Node-named endings (F8)** and **a restore op / additive offset for time-driven resources (F6).**
   Quality-of-authoring; remove the latch tax and unlock shelters/battery-swaps.
5. **P2 — Game-level player + chapter-graph tooling (F9).** Deferred to after playtesting, by decision.

Nothing here is an emergency; all are *enhancements the experiment earned the right to recommend*. The
recommended first move is the P0 generalization — now de-risked, because the container is its working
prototype.
