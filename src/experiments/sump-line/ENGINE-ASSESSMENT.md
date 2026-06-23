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

## Summary & prioritized shortlist
_(Filled in after the E2 slice — once we've authored real chapters and seen which findings actually
bite. Current lead candidate: F2, native game-vs-chapter time + resource persistence.)_
