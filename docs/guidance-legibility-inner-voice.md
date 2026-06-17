# Guidance-Legibility Layer — "The Inner Voice" (design input)

**Status:** Design input — **not yet adapted to BranchWorld.** Carried over 2026-06-16 from a parallel
prototype's playtest as a portable concept for BranchWorld's player-facing guidance/legibility layer. Take it
up **after** the P0 engine work (clock enforcement, state-resolver endings, scheduled-event triggers, the
linter). The mechanics below are engine-neutral and must be re-expressed in BranchWorld's node/clock model when
this is specced.

## The problem it solves
A state-driven, "world-moves-without-you" story is only as good as the player's ability to *read* it. Two
failure modes sit at opposite ends:
- **Too vague** — no pointer; the player stalls, unsure what to do next (dead air).
- **Too directive** — a quest marker / breadcrumb that railroads and kills the feeling of authoring your own path.

## The idea
Guidance becomes the **player-character thinking out loud** between scenes — not a UI panel, not a marker.
Each between-scene beat:
1. **Recaps what just happened** in the character's interior voice ("Okay. Petey won't talk. The trunk's packed.").
2. **Floats the live threads as competing impulses** — phrased as the character's own options ("The kitchen
   crew always knows something. Or skip it and go straight at Davey."). These *are* the player's choices.

It's *diegetic guidance*: the world reasons in-character; the player picks which reasoning to follow. Never
lost (there's always at least one impulse plus the clock pressure); never railroaded (2–4 genuine threads, none
marked "best").

## The four locked design decisions (from the brainstorm)
1. **Narration source = hybrid.** The author writes a short interior **tail per scene** (the specific, emotional
   "what just happened" — the writing burden, where voice lives). The **engine assembles the "what now" options**
   from the currently-open threads + the clock (the navigation — which therefore can never be missing, so dead
   air is structurally impossible).
2. **The beat is the play surface.** Every between-scene moment is the character's head; local/spatial info
   (who's here, what's happening, what you could do right here) **folds into the voice** as things he notices and
   weighs. No bare menu exists to go dark. Requires a **light register** so low-stakes moments ("just walk next
   door") don't feel padded.
3. **Traversal = arrive-into-a-beat.** Picking an impulse that points elsewhere **moves** the character there and
   fires a **fresh beat on arrival** — you feel the travel, you see who's present/absent (observation is a
   reward), and the scene becomes the obvious next impulse. Pointers aim at a **place/person, never a next-step**;
   the last-mile is the player's. (Optional upgrade: cut straight in when a destination has exactly one obvious
   scene.)
4. **No explicit "tracking."** Every impulse already carries its destination, so a player-managed "focus/track"
   is redundant — retired. Each beat re-presents the live threads fresh; the player chooses in the moment. The
   "thing he keeps coming back to" comes free from the authored tail, not a mechanic.

## Mapping to BranchWorld (the open design task)
BranchWorld is node-based. To adapt:
- **"Open threads"** ≈ the set of currently-reachable / clue-gated next nodes (the live frontier), kept small by
  prerequisite/clue gating.
- **The beat** ≈ an interstitial reflection rendered between story nodes (or a dedicated node type) showing the
  authored recap tail of the node just left + the reachable threads as voiced choices.
- **"Arrive-into-a-beat"** ≈ moving to a location surfaces a fresh reflection there (reads the live world per the
  accumulated clock + scheduled events).
- **The authored tail** ≈ a short interior-voice field on each node.
- **Never-dark guarantee** ≈ the reflection always carries the clock pressure plus at least a "wait / sit with
  it" impulse, even when only one thread is live.

This layer is **player-facing legibility** — complementary to the P0 engine fixes, not a replacement for them.
It makes the state-driven world *readable*; it does not fix the clock/ending/scheduled-event wiring. Spec it once
the engine core + linter are in place.
