# The Sump Line - 3-Chapter Slice - Design (APPROVED)

_Authoring source-of-truth. Architect -> Writer -> Auditor design (2026-06-23), approved by Matthew with 4 taste calls locked. Build authors against THIS._

## Locked decisions (founder sign-off)
1. **Shape:** branch into two distinct second chapters (dry high route / flooded sump) - the replay hook.
2. **Companion:** one - Rolly - the "save them or save yourself" engine.
3. **Tone:** cold, restrained, literary; indifferent cave; sparse dialogue.
4. **How dark:** full range - death (*The Cave Keeps You*) and sealed-in (*Behind the Sump*) are reachable; earned, not default.

**Auditor verdict:** NEEDS_REWORK - The design maps cleanly onto the Game/Chapter/transitions/carry container and the blocker-fix discipline (unconditional latch-setting nodes, change_location on every node, atZero+setFlag pairing, hubs, bounded numerics) is genuinely applied. But it is NOT yet build-ready: two hard problems must be fixed first. (1) ch1_descent fails lintStory CLOCK_CANNOT_BITE — longest simple path is 85 min against a 90-min window, a guaranteed GAME_CHAPTER_LINT error; verified by reproducing the linter's timeBounds. (2) An EE-4 conflict: ch2_sump n_dive (a 'you got through into free air' resolving node) is reachable with cave_sump_sealed=true and then resolves to end_behind_sump (sealed-in), narrating an escape the state denies. Plus three medium items: missing start values for the three choice-driven resources (RESOURCE_START_OUT_OF_RANGE), unset ending priorities producing wrong dark-vs-lost/sealed precedence on real overlaps, and the per-chapter walker reporting the two carry-only dark endings as orphanEndings (a tooling gap to document, not author around). None of these re-introduce an original blocker; they are new findings against the frozen engine. Fix the clock window, gate the dive against the seal flag, add resource starts, set ending priorities, and document/seed the dark-ending walk, and this slice is ready to build.

---

## BUILD PUNCH-LIST (apply these fixes during authoring)

_The design is structurally sound and the original blockers are genuinely fixed (no regressions). These are the new, specific fixes to apply:_

- **[HIGH]** ch1_descent FAILS lintStory CLOCK_CANNOT_BITE. The window is 90 min (13:00->14:30) but the longest SIMPLE path the linter's timeBounds DFS finds is 85 min (n_drop15 -> n_stream10 -> n_rolly/c_stabilise20 -> n_carry15 -> n_choke_hub/c_assess_high10 -> n_high_decide/c_high_together10 -> n_set_together5 -> n_take_high). 85 < 90, so lintStory emits CLOCK_CANNOT_BITE and lintGame surfaces it as GAME_CHAPTER_LINT (an ERROR). Note timeBounds counts ONLY choice add_minutes, not entry-effect minutes, and stops at the first revisited node, so loops do not help. Verified by replicating timeBounds exactly.  **-> Fix:** Either shorten ch1 deadline to <=14:25 (window 85), or add >=5 min of choice-level add_minutes on the longest path (e.g. bump c_take_high / c_carry_on / a choke choice by 5). Re-run the timeBounds calc after any edit; target maxTime >= window and minTime <= window (minTime 45 is already fine).
- **[HIGH]** EE-4 / narrative-state conflict at ch2_sump n_dive. n_dive ('Through the Seal', prose intent = 'pull through the drowned crawl into free air') is a resolving node, but its ending is chosen by the state resolver. A reachable path sets cave_sump_sealed=true via ev_water_drops ifAbsentEffects, then still navigates n_gravel_hub -> c_g_try -> n_crawl -> c_crawl_dive -> n_dive (air_gulps>=1 throughout). At n_dive the resolver evaluates: end_grey_sump requires cave_sump_sealed is_false (fails), so end_behind_sump (sump_sealed is_true) MATCHES. Result: the 'you got through into free air' node resolves to the 'sealed in behind the sump' ending. The crossing-success node narrates an escape the resolved ending denies.  **-> Fix:** Gate the dive so you cannot reach n_dive once cave_sump_sealed is true: add conditionText 'cave_sump_sealed is_false' to c_crawl_dive, c_drop_dive, and c_g_try (or route the sealed case to n_resolve_s instead of n_dive). Keep n_dive's own resolver matching only the not-sealed crossing endings. Verify no remaining path reaches n_dive with cave_sump_sealed=true.
- **[MEDIUM]** Choice-driven resources flood_water (0..3), rope_pitches (0..2), air_gulps (0..3) have NO start value specified. The engine Resource type requires start, and lintResources raises RESOURCE_START_OUT_OF_RANGE if start is outside [min,max]; an undefined/NaN start fails. Several gates depend on the implied start: c_crawl_dive/c_g_try/c_s_duck require air_gulps>=1 (so start must be >=1, intended 3); c_climb_safe requires rope_pitches>=1; c_low_sealed requires flood_water gte 2 (flood_water is RAISED from a low start, so start should be 0).  **-> Fix:** Author explicit start: flood_water start 0, rope_pitches start 2, air_gulps start 3 (each within its declared bound). Confirm the air_gulps>=1 gates remain satisfiable from start and that decrements cannot strand the player below a gate that is the only live exit (n_gravel_hub always keeps c_g_wait->n_resolve_s unconditional, so no softlock — good).
- **[MEDIUM]** Per-chapter walkStateSpace will report end_dark_high and end_dark_sump as orphanEndings, and will never exercise the lamp atZero path. The walker runs the AUTHORED story from defaults with lamp_charge placeholder start=100, depletion 12/5. Max lamp loss in ch2_high (70 min) and ch2_sump (60 min) is 25, so lamp never reaches 0; the dark endings are unreachable in a standalone walk. They are only reachable when the container carries in a low lamp value, which the per-chapter walker has no seam to inject. This is a verification-tooling gap, not an authoring bug — but it WILL show as orphanEndings and could be mistaken for dead endings.  **-> Fix:** Document that end_dark_* orphan-ending findings from walkStateSpace are expected-by-construction (carry-only-reachable). To actually exercise them, either (a) add a walker harness that seeds a low carried lamp start via seedChapterStory before walking, or (b) accept the orphanEnding finding for the two dark endings with a written rationale. Do NOT 'fix' by lowering the placeholder start, which would break the carry-rebase contract.
- **[MEDIUM]** Ending overlaps with no priorities set produce questionable resolution order. ch2_high: end_out_not_whole (cave_someone_lost) and end_dark_high (cave_dark_out) are not provably exclusive (different fields) -> lintStory OVERLAPPING_ENDINGS warning and walker overlaps; with all priorities 0 the array order makes out_not_whole win over dark_high, so a lamp-death that also lost the companion resolves as 'Out, But Not Whole' (asserts you got OUT, which a lamp-zero death contradicts). ch2_sump: end_behind_sump and end_dark_sump overlap the same way; behind_sump wins by order over a dark death.  **-> Fix:** Set explicit priority on the dark endings so the at-zero death dominates: end_dark_high and end_dark_sump priority 2; end_out_not_whole / end_behind_sump priority 1; togetherness/grey 0. This makes 'the cave keeps you' win when lamp hit zero regardless of other latches, matching the prose intent, and silences the OVERLAPPING_ENDINGS warnings.
- **[LOW]** Branch-chapter resource depletion rates are referenced but never numerically specified (lamp 'branch chapters re-declare own rate'; body_heat '15/5 on wet branch'). Without concrete everyMinutes/amount the chapters cannot be authored or linted; RESOURCE_BAD_DEPLETION fires if everyMinutes or amount <= 0.  **-> Fix:** Specify concrete depletion for lamp_charge and body_heat in EACH of ch2_high and ch2_sump (e.g. lamp 12/5 both; body_heat 20/5 high, 15/5 sump), keeping min 0 / max 100 identical to the carried bounds so the container start-rebase does not clamp.

**Confirmed clean (do not regress):**
- At-zero ending without matching setFlag (original blocker 4) @ lamp_charge / body_heat atZero across all chapters: NOT regressed — correctly paired: lamp atZero sets cave_dark_out and every dark ending requires cave_dark_out is_true; body_heat atZero is setFlag-only with no ending. resources.ts confirms the flag is set in the same step the ending id is emitted, so no spurious zeroEnding.
- EE-4: ending prose asserts a flag its path did not set (original blocker 3) @ ch2_sump n_dive -> end_behind_sump: PARTIALLY REGRESSED at the resolving-NODE level: n_dive's crossing-success prose is reachable with cave_sump_sealed=true and resolves to the sealed-in ending, so the node narrates an escape the resolved ending denies. The ending-condition latches themselves are honest (behind_sump correctly requires cave_sump_sealed), but the node/ending pairing is not. Gate the dive on cave_sump_sealed is_false (see blockers) to restore the fix.
- Conditional effects smuggled in (original blocker 1) @ all state sets: NOT regressed — every state set is an unconditional entryEffect on a destination node; forks are done by gating CHOICES with conditionText and routing to latch-setting nodes (n_carry, n_strand_rolly, n_set_together, n_take_high, n_take_low, n_lose_here, n_set_together_s). No 'if X set Y' anywhere.
- Missing change_location (original blocker 2) @ every node + scheduled-event present/recovery: NOT regressed — every node outline lists change_location to its own location in entryEffects; eventLocation values (sump_pool, oxbow, flooded_crawl) are declared locations; present nodes share that location and recovery nodes (n_choke_hub/n_crystal_hub/n_gravel_hub) are navigable, so EVENT_RECOVERY_UNREACHABLE will not fire and the present branch is reachable (verified a path arrives at sump_pool with elapsed>=60 for ev_sump_seal).
- OR-logic in conditions (original) @ all condition lists: NOT regressed — no OR used; mutually exclusive forks are split into separate choices that set the same target latch (e.g. companion 'lost' via two different gated choices), matching the AND-only engine.
- Unbounded numerics (original blocker 5) @ all numeric vars/resources: NOT regressed for declared meters (lamp/body_heat 0..100, flood_water 0..3, rope_pitches 0..2, air_gulps 0..3) — bounds present. Caveat: the three choice-driven resources are missing explicit start values (separate blocker), but their min/max bounds are declared so the walker space stays finite.

Container fit: OK - Clean mapping. Game/Chapter/CarryContract/ChapterTransition shapes all match types.ts. ch1_descent is non-gameEnding and has the catch-all transition (empty when -> ch2_sump) LAST after the conditional cave_route=='high' -> ch2_high, satisfying lintGame GAME_NO_CATCHALL; transitions reference real chapters; both branch chapters are gameEnding:true with empty transitions and are reachable from start (GAME_NO_REACHABLE_ENDING satisfied, no orphan chapters since both branches reachable). carry.vars='all' carries cave_route/companion_status/all latching booleans; carry.resources lists lamp_charge+body_heat; clues/inventory true. Both survival resources are declared in every chapter that uses them with a placeholder start for the container to rebase — matches seedChapterStory which rewrites resource.start from the carried value and projects gameDeadlineMinutes onto each chapter deadline. One caveat: branch-chapter resource depletion rates and the three choice-driven resource starts are not yet specified (see blockers), but the structural container fit itself is correct.
Clock: ISSUE - ch1_descent FAILS: window 90 min but max reachable simple path is 85 min (reproduced the linter's timeBounds exactly: choice add_minutes only, stops at revisited nodes) -> CLOCK_CANNOT_BITE error. ch2_high passes (max 70 == window 70, min 50). ch2_sump passes (max 65 >= window 60, min 25). Prose carries no clock numerals; all timing via {{time}} token or relative phrasing per the keystone prose — verified clean. The per-chapter acute clock bites and is winnable in the two branch chapters; only ch1 needs +5 min on its longest path or a 5-min-shorter deadline.
Walker: per-chapter exhaustive = yes

---

## Structure

Shape: Chapter 1 (ch1_descent) is the shared setup — the descent, the flood pulse, the rescue of the injured companion — and it sets the carried state that forks the game via the carried var cave_route ('high' | 'sump'), companion_status, and the lamp/heat values. On chapter end, ordered transitions read cave_route and route to ONE of two distinct gameEnding chapters: ch2_high (dry high traverse / oxbow bypass) or ch2_sump (flooded sump crawl). Player plays ch1 + exactly one branch (3 authored, 2 played). This is a genuine CHAPTER-LEVEL branch driven by CARRIED state (cave_route + companion status + carried meters), not just an in-chapter choice: the branch chapters differ in locations, acute clock, scheduled world-move, and ending palette. I chose branch over linear because the founder's premise is fundamentally a fork ('the sump seals — beat it to the dry high route, or commit to the water?'); a branch proves carry-over more convincingly since the same lamp_charge/body_heat/companion state seeds two structurally different chapters and yields honestly-gated endings in each. The carried-state chapter-branch happens at the ch1 boundary, evaluated by transitions on cave_route.

### Game object
- id: `sump_line` | title: The Sump Line | startChapter: `ch1_descent`
- gameDeadlineMinutes: 360
- carry: vars=all | resources=[lamp_charge, body_heat] | clues=True | inventory=True

### Carried variables & resources

| Name | Kind | Type | Default | Bound | Depletion | At-zero | Purpose |
|---|---|---|---|---|---|---|---|
| `lamp_charge` | resource | number | 100 | min 0 / max 100 | everyMinutes 12 / amount 5 (ch1); branch chapters re-declare own rate; rebased start carried | ending: chapter-local dark ending + setFlag: cave_dark_out | Carried time-driven survival meter: the dying lamp. Depletes on the chapter clock across the whole ordeal; at min the dark resolves a dark ending (paired with setFlag). |
| `body_heat` | resource | number | 100 | min 0 / max 100 | everyMinutes 20 / amount 5 (ch1 dry); 15/5 on wet branch | setFlag: cave_hypothermic (no direct ending in ch1) | Carried time-driven survival meter: core warmth. Wet routes burn faster. At min: hypothermic; paired setFlag gates cold flavour/endings. |
| `cave_route` | var | string | sump |  |  |  | THE chapter-fork variable. Set by ch1 nodes to 'high' or 'sump'; ch1 transitions route on it. Default 'sump' so a passive/absent path forks deterministically. |
| `companion_status` | var | string | hurt |  |  |  | Carried companion (Rolly) state: with_you | hurt | lost. Set by unconditional entryEffects on branching nodes. Gates content and endings in both branch chapters. |
| `cave_someone_lost` | var | boolean | false |  |  |  | Latching boolean. Set true ONLY by the node that strands/loses the companion (and by ch2_high second-pulse absent-effect). Pyrrhic/loss endings require it (EE-4). |
| `cave_all_together` | var | boolean | false |  |  |  | Latching boolean. Set true ONLY at the safe hub when companion_status is with_you. 'Daylight, All Three' requires it. |
| `cave_dark_out` | var | boolean | false |  |  |  | Latching boolean paired with lamp_charge atZero.setFlag in every chapter. Dark endings require it is_true so the at-zero resource never yields a spurious zeroEnding (blocker 4). |
| `cave_hypothermic` | var | boolean | false |  |  |  | Latching boolean paired with body_heat atZero.setFlag. Cold flavour/endings gate on it so the walker's at-zero path is honestly gated. |
| `cave_sump_sealed` | var | boolean | false |  |  |  | Latching boolean set when the sump-sealing scheduled event fires (present entryEffect or absent effect). 'Behind the Sump' requires it true; also informs ch1 sump routing. |

### Companions
- **Rolly** (var: `companion_status`) - The injured club-mate. Cracked ankle from the flood pulse; can be carried, stabilised, or stranded. Carried companion_status gates content and endings across both branches.

---

## Chapter: The Pulse  `ch1_descent` [hub -> branches]

**Clock:** 13:00 -> 14:30

A routine caving-club afternoon in Whitethroat Cavern. The protagonist and Rolly are deep in the streamway when a flood pulse rips through, cracking Rolly's ankle and turning the only known low exit — the sump — into a closing trap. One injured companion, a dying lamp, a cold afternoon. The chapter sets WHO is with you and WHICH way out you commit to as the water decides for the mountain.

### Locations
- `surface_pitch` **Head of the Pitch** - start; the rigged shaft they came down
- `stream_passage` **The Streamway** - where the flood pulse hits and Rolly is hurt
- `choke` **The Boulder Choke** - junction; high route goes up over it, sump route ducks below
- `sump_pool` **The Sump Pool** - eventLocation for the sump-sealing world-move; the low duck
- `choke_ledge` **The Dry Ledge** - re-convergence hub above the choke

### Chapter-local resources
- `flood_water` - Choice-driven (no depletion) 0..3 meter of how high the water has risen. Raised by effects when the player lingers; high values push toward the sump fork and add danger. Bounded min 0 max 3.

### Scheduled event (the world moves without you)
- `ev_sump_seal` @ 14:00 at `sump_pool`
    - World-move: Rising water seals the low sump duck, physically, whether or not the protagonist is watching.
    - If present -> `n_seal_present`
    - If absent -> set cave_sump_sealed=true; add_clue clue_sump_sealed
    - Recovery -> `n_choke_hub`

### Transitions
- when cave_route equals 'high' -> `ch2_high`
- when (catch-all, empty when) -> `ch2_sump`

### Endings
- **Up Over the Choke** `ch1_to_high` - Commits to the dry high traverse; routes to ch2_high.  _(if cave_route equals 'high')_
- **Down Into the Water** `ch1_to_sump` _(default)_ - MANDATORY DEFAULT. Below/at the sump as it seals or takes the low line; routes to ch2_sump.  _(if (empty — default))_

### Node outline

**`n_drop`** - Head of the Pitch _(scene @ surface_pitch)_
  - purpose: Opening; establish cold, lamp, the descent.
  - prose intent: Cold air rising from black water far below; the rope, the rack, Rolly above you on the pitch. No clock numerals — use {{time}}.
  - entry effects: change_location surface_pitch
  - "Down the pitch into the streamway" -> `n_stream` [+15m] => add_minutes 15

**`n_stream`** - The Streamway _(event @ stream_passage)_
  - purpose: The flood pulse hits; Rolly is hurt. Sets the inciting state.
  - prose intent: A wall of brown water; the roar; Rolly down with a cracked ankle. The afternoon just turned lethal.
  - entry effects: change_location stream_passage; set companion_status='hurt'; increment flood_water (+1); add_clue clue_pulse
  - "Get to Rolly" -> `n_rolly` [+10m] => add_minutes 10

**`n_rolly`** - Rolly Down _(conversation @ stream_passage)_
  - purpose: Decide how to handle the injured companion — the choice that branches companion_status.
  - prose intent: Rolly white-faced, ankle wrong, water rising at your boots. Stabilise, carry, or push for the exit.
  - entry effects: change_location stream_passage
  - "Splint the ankle and take Rolly with you" -> `n_carry` [+20m] _(if companion_status equals 'hurt')_ => add_minutes 20
  - "No time — push for the choke, Rolly limping behind" -> `n_choke_hub` [+10m] => add_minutes 10; increment flood_water (+1)

**`n_carry`** - Shouldering Rolly _(scene @ stream_passage)_
  - purpose: UNCONDITIONAL set companion_status='with_you' (branching-node fix for blocker 1).
  - prose intent: Rolly's arm over your shoulder, the splint holding; slower, but together.
  - entry effects: change_location stream_passage; set companion_status='with_you'
  - "Carry on toward the choke" -> `n_choke_hub` [+15m] => add_minutes 15

**`n_choke_hub`** - The Boulder Choke _(transition @ choke)_
  - purpose: RE-CONVERGENCE HUB (walkability). Also recoveryNodeId for the seal event. Routes high vs low.
  - prose intent: The choke: water boiling through the low duck, dry rift climbing away above. The fork.
  - entry effects: change_location choke
  - "Scout the dry rift up over the choke" -> `n_high_decide` [+10m] => add_minutes 10
  - "Check the low sump duck" -> `n_seal_present` [+10m] _(if cave_sump_sealed is_false)_ => change_location sump_pool; add_minutes 10
  - "Go down to the sump (water already high)" -> `n_take_low` [+10m] _(if flood_water gte 2)_ => add_minutes 10

**`n_high_decide`** - The Dry Ledge _(discovery @ choke_ledge)_
  - purpose: High-route commit hub; gate togetherness latch.
  - prose intent: A dry ledge above the flood; the high traverse beckons. Quieter here, but the lamp is dimming.
  - entry effects: change_location choke_ledge
  - "Lead Rolly up to the high route" -> `n_set_together` [+10m] _(if companion_status equals 'with_you')_ => add_minutes 10
  - "Take the high route, Rolly slowing — leave a line and go" -> `n_strand_rolly` [+5m] _(if companion_status not_equals 'with_you')_ => add_minutes 5
  - "Commit to the high traverse" -> `n_take_high` [+5m] => add_minutes 5

**`n_set_together`** - Together on the Ledge _(scene @ choke_ledge)_
  - purpose: UNCONDITIONAL set cave_all_together=true (honest-ending latch, blocker 3).
  - prose intent: Both of you on the dry ledge, breathing hard, still a team.
  - entry effects: change_location choke_ledge; set cave_all_together=true
  - "On to the high traverse" -> `n_take_high` [+5m] => add_minutes 5

**`n_strand_rolly`** - Leaving the Line _(scene @ choke_ledge)_
  - purpose: UNCONDITIONAL set companion_status='lost' + cave_someone_lost=true (loss latch, blocker 1+3).
  - prose intent: Rolly's light recedes below as you climb; a rope left, a promise you may not keep.
  - entry effects: change_location choke_ledge; set companion_status='lost'; set cave_someone_lost=true; add_clue clue_left_rolly
  - "Climb to the high traverse" -> `n_take_high` [+5m] => add_minutes 5

**`n_take_high`** - Over the Choke _(transition @ choke_ledge)_ _[resolvesEnding]_
  - purpose: Set cave_route='high'; resolvesEnding -> ch1_to_high; routes to ch2_high.
  - prose intent: You crest the choke into the dry dark. The water is behind you now.
  - entry effects: change_location choke_ledge; set cave_route='high'

**`n_seal_present`** - The Sump Seals _(event @ sump_pool)_
  - purpose: PRESENT node for ev_sump_seal: unconditional set cave_sump_sealed=true (present-branch fix, blocker 2).
  - prose intent: You watch the airspace close, water meeting rock with a sucking roar. The low way out is gone.
  - entry effects: change_location sump_pool; set cave_sump_sealed=true; add_clue clue_saw_seal
  - "Commit to the water anyway" -> `n_take_low` [+5m] => add_minutes 5
  - "Retreat back to the choke" -> `n_choke_hub` [+5m] => change_location choke; add_minutes 5

**`n_take_low`** - Down Into the Water _(transition @ sump_pool)_ _[resolvesEnding]_
  - purpose: Set cave_route='sump'; resolvesEnding -> ch1_to_sump (default); routes to ch2_sump.
  - prose intent: You lower into the cold flood, the only way now a drowned one.
  - entry effects: change_location sump_pool; set cave_route='sump'

---

## Chapter: The Dry High Traverse  `ch2_high` [GAME-ENDING]

**Clock:** 14:30 -> 15:40

Over the choke and into the dry upper system. No acute water here — the antagonist is cold and the dying lamp, across a long exposed traverse and an oxbow bypass over a void. A second flood pulse can still surge up the system and cut the bypass behind you. The climb to daylight resolves the game.

### Locations
- `high_rift` **The Aven Rift** - start; tall dry rift climbing from the choke
- `oxbow` **The Oxbow Bypass** - dry abandoned meander; the bridge across the void; eventLocation
- `crystal_hall` **Crystal Hall** - cold static chamber, heat bleeds fast; decision hub
- `daylight_shaft` **The Daylight Shaft** - final climb to surface; resolves endings

### Chapter-local resources
- `rope_pitches` - Choice-driven 0..2 of remaining safe rope/protection for the final climb. Decremented when used to protect Rolly or rig fast. Low value gates the riskier climb. Bounded min 0 max 2.

### Scheduled event (the world moves without you)
- `ev_second_pulse` @ 15:10 at `oxbow`
    - World-move: A SECOND flood pulse surges up the system and overtops the oxbow, cutting off the bypass.
    - If present -> `n_pulse_present`
    - If absent -> set cave_someone_lost=true; add_clue clue_pulse_cutoff
    - Recovery -> `n_crystal_hub`

### Transitions
- (none - this is a game-ending chapter)

### Endings
- **Daylight, All Three** `end_daylight_all_three` - Clean win: out together with the lamp alive.  _(if cave_all_together is_true AND cave_dark_out is_false AND cave_hypothermic is_false)_
- **Out, But Not Whole** `end_out_not_whole` - Pyrrhic: surfaces but Rolly lost/stranded.  _(if cave_someone_lost is_true)_
- **The Cave Keeps You** `end_dark_high` - At-zero dark ending: lamp died on the traverse. Paired with lamp atZero.setFlag.  _(if cave_dark_out is_true)_
- **A Grey Way Out** `end_grey_high` _(default)_ - MANDATORY DEFAULT. Muted, ambiguous survival — out, but cold, no clean state achieved.  _(if (empty — default))_

### Node outline

**`n_h_start`** - The Aven Rift _(scene @ high_rift)_
  - purpose: Entry; rebased lamp/heat continue depleting. Establish dry cold.
  - prose intent: A tall dry rift, your breath fogging, the lamp a shrinking coin of light. Reference {{time}}, no numerals.
  - entry effects: change_location high_rift
  - "Free-climb the rift toward the oxbow" -> `n_oxbow` [+20m] => add_minutes 20
  - "Rig a protected line (slower, safer)" -> `n_oxbow` [+30m] => add_minutes 30; decrement rope_pitches (-1)

**`n_oxbow`** - The Oxbow Bypass _(event @ oxbow)_
  - purpose: eventLocation for ev_second_pulse; present routing here.
  - prose intent: A dry meander bridging a black void; far below, water you can hear but not see.
  - entry effects: change_location oxbow
  - "Cross the bypass to Crystal Hall" -> `n_crystal_hub` [+20m] => add_minutes 20

**`n_pulse_present`** - The Bypass Goes Under _(event @ oxbow)_
  - purpose: PRESENT node for ev_second_pulse. If companion not with you, route to loss; else continue. UNCONDITIONAL sets on destinations.
  - prose intent: The roar climbs the void; water claws over the oxbow lip as you scramble across.
  - entry effects: change_location oxbow
  - "Haul Rolly across ahead of the surge" -> `n_crystal_hub` [+15m] _(if companion_status equals 'with_you')_ => add_minutes 15; decrement rope_pitches (-1)
  - "Cross alone — the water takes the rest" -> `n_lose_here` [+10m] _(if companion_status not_equals 'with_you')_ => add_minutes 10
  - "Cross fast and don't look back" -> `n_lose_here` [+10m] => add_minutes 10

**`n_lose_here`** - Cut Off Behind _(scene @ oxbow)_
  - purpose: UNCONDITIONAL set cave_someone_lost=true (loss latch).
  - prose intent: The bypass is a river now; whoever was behind it is on the far side of the water.
  - entry effects: change_location oxbow; set cave_someone_lost=true; set companion_status='lost'; add_clue clue_oxbow_cut
  - "Push on to Crystal Hall" -> `n_crystal_hub` [+15m] => add_minutes 15

**`n_crystal_hub`** - Crystal Hall _(transition @ crystal_hall)_
  - purpose: RE-CONVERGENCE HUB + recoveryNodeId. Heat bleeds; choose climb approach.
  - prose intent: A cold glittering chamber; the lamp guttering; the final shaft ahead. Decision point.
  - entry effects: change_location crystal_hall
  - "Rest and warm up (costs time, the lamp burns)" -> `n_crystal_hub` [+15m] _(if body_heat lt 40)_ => add_minutes 15
  - "Rig the shaft properly and climb" -> `n_climb` [+20m] _(if rope_pitches gte 1)_ => add_minutes 20; decrement rope_pitches (-1)
  - "Free-climb the shaft (no rope left)" -> `n_climb` [+10m] => add_minutes 10

**`n_climb`** - The Daylight Shaft _(ending @ daylight_shaft)_ _[resolvesEnding]_
  - purpose: Resolving node. Ending resolver picks among the four by accumulated latches; at-zero lamp dark ending honestly gated by cave_dark_out.
  - prose intent: Grey light, impossibly far up; you climb toward it or the dark takes the last of the lamp. Let the resolved ending's body carry the cost the state actually recorded.
  - entry effects: change_location daylight_shaft

---

## Chapter: The Flooded Sump Crawl  `ch2_sump` [GAME-ENDING]

**Clock:** 14:30 -> 15:30

Down into the flood below the choke. Wet, fast heat-loss, the sealing sump at your back. The way out is a submerged crawl found by dive — but the water level itself is the world-move: when the pulse passes it briefly DROPS, opening an airspace window to cross. Miss it and you are behind the sump. The far exit rift resolves the game.

### Locations
- `duck_pool` **The Duck Pool** - start; half-flooded low passage below the choke
- `flooded_crawl` **The Flooded Crawl** - the free-dive / airspace crawl under the seal; eventLocation
- `gravel_chamber` **The Gravel Chamber** - air bell beyond the duck; warming/decision hub
- `exit_rift` **The Far Exit Rift** - the dive-found way out; resolves endings

### Chapter-local resources
- `air_gulps` - Choice-driven 0..3 of breath-holds/airspace margin for the submerged crawl. Decremented per dive choice. At low values the crawl is gated off, forcing the wait-it-out/sealed branch. Bounded min 0 max 3.

### Scheduled event (the world moves without you)
- `ev_water_drops` @ 15:00 at `flooded_crawl`
    - World-move: The pulse passes and the water DROPS, briefly opening an airspace in the crawl — a window to dive the seal.
    - If present -> `n_drop_present`
    - If absent -> set cave_sump_sealed=true; add_clue clue_missed_window
    - Recovery -> `n_gravel_hub`

### Transitions
- (none - this is a game-ending chapter)

### Endings
- **A Grey Way Out** `end_grey_sump` - Survival via the dropped-water window: out the far rift, cold and shaken.  _(if cave_dark_out is_false AND cave_sump_sealed is_false)_
- **Behind the Sump** `end_behind_sump` - Sealed in: the duck closed before the crossing. Flag set by the scheduled event.  _(if cave_sump_sealed is_true)_
- **The Cave Keeps You** `end_dark_sump` - At-zero dark ending in the water: lamp died mid-crawl. Paired with lamp atZero.setFlag.  _(if cave_dark_out is_true)_
- **The Long Cold Wait** `end_long_cold_wait` _(default)_ - MANDATORY DEFAULT. Hunkered in the gravel air bell, hypothermic, signalling, waiting for a rescue that may or may not come.  _(if (empty — default))_

### Node outline

**`n_s_start`** - The Duck Pool _(scene @ duck_pool)_
  - purpose: Entry; rebased lamp/heat continue. Wet, faster heat loss.
  - prose intent: Black water to your chest, the lamp's reflection shivering. Reference {{time}}, no numerals.
  - entry effects: change_location duck_pool
  - "Duck the low airspace toward the crawl" -> `n_crawl` [+15m] => add_minutes 15; decrement air_gulps (-1)
  - "Climb out into the gravel chamber first" -> `n_gravel_hub` [+10m] => add_minutes 10

**`n_crawl`** - The Flooded Crawl _(event @ flooded_crawl)_
  - purpose: eventLocation for ev_water_drops; present routing here.
  - prose intent: A drowned crawl, a thread of airspace at the roof; you taste grit and cold.
  - entry effects: change_location flooded_crawl
  - "Wait at the airspace for the water to drop" -> `n_gravel_hub` [+15m] => add_minutes 15
  - "Dive the crawl now" -> `n_dive` [+10m] _(if air_gulps gte 1)_ => add_minutes 10; decrement air_gulps (-1)

**`n_drop_present`** - The Water Drops _(event @ flooded_crawl)_
  - purpose: PRESENT node for ev_water_drops: the window opens. Route to the dive crossing (UNCONDITIONAL togetherness handled at gravel hub).
  - prose intent: The roar recedes; the airspace yawns wide for a breath of minutes — go now.
  - entry effects: change_location flooded_crawl
  - "Dive the open window" -> `n_dive` [+10m] => add_minutes 10; decrement air_gulps (-1)
  - "Pull back to the gravel chamber" -> `n_gravel_hub` [+10m] => change_location gravel_chamber; add_minutes 10

**`n_gravel_hub`** - The Gravel Chamber _(transition @ gravel_chamber)_
  - purpose: RE-CONVERGENCE HUB + recoveryNodeId. Air bell to warm/decide; set togetherness latch.
  - prose intent: A gravel bank above the water, a pocket of air; the lamp dim, the cold deep. Decide.
  - entry effects: change_location gravel_chamber
  - "Wedge in with Rolly and warm up" -> `n_set_together_s` [+15m] _(if companion_status equals 'with_you')_ => add_minutes 15
  - "Go back and try the crawl" -> `n_crawl` [+10m] _(if air_gulps gte 1)_ => change_location flooded_crawl; add_minutes 10
  - "Hunker down and wait it out" -> `n_resolve_s` [+20m] => add_minutes 20

**`n_set_together_s`** - Two in the Air Bell _(scene @ gravel_chamber)_
  - purpose: UNCONDITIONAL set cave_all_together=true (latch; lets the grey-out read as together).
  - prose intent: Shoulder to shoulder on the gravel, sharing the last warmth.
  - entry effects: change_location gravel_chamber; set cave_all_together=true
  - "Make for the crawl together" -> `n_crawl` [+10m] _(if air_gulps gte 1)_ => change_location flooded_crawl; add_minutes 10
  - "Wait for rescue together" -> `n_resolve_s` [+20m] => add_minutes 20

**`n_dive`** - Through the Seal _(ending @ exit_rift)_ _[resolvesEnding]_
  - purpose: Successful-crossing resolving node -> grey/dark endings by latches. change_location to exit_rift.
  - prose intent: Lungs burning, you pull through the drowned crawl into rising rock and a breath of free air — or the dark takes you mid-pull.
  - entry effects: change_location exit_rift

**`n_resolve_s`** - The Long Cold Wait _(ending @ gravel_chamber)_ _[resolvesEnding]_
  - purpose: Wait/sealed resolving node -> behind_sump / long_cold_wait / dark by latches. Default and at-zero endings honestly gated.
  - prose intent: The water doesn't drop in time; you bang on rock, breathe, and wait. Let the resolved ending body carry exactly the recorded state.
  - entry effects: change_location gravel_chamber

---

## Voice bible

- **Register:** Cold, physical, plainspoken survival horror in the Zork/Oregon-Trail lineage — heavy on evocative reading, light on dialogue (the cave is mostly silent; Rolly speaks rarely and in fragments). Concrete Anglo-Saxon nouns over Latinate abstraction: water, rock, grit, breath, rope, light, cold. Short declaratives that lengthen only when the body is working or the dread is mounting. The cave is never anthropomorphised as malicious — it is INDIFFERENT, which is worse: water rises because water rises, rock seals because rock seals, none of it about you. Two constant pressures named or felt in nearly every scene: the failing lamp (a shrinking coin/disc of light, the dark waiting at its edge) and the body (the cold finding you, breath fogging, fingers going stupid, the shiver you can't stop). Sentiment is earned through physical specificity, never stated outright. No melodrama, no purple metaphor stacks, no 'suddenly'.
- **POV:** Second person singular, present tense throughout ('You lower into the cold flood'). The protagonist is unnamed; Rolly is the only named companion and is referred to by name or 'Rolly'. Address the reader-as-protagonist directly and continuously — the body is the camera.
- **Tense:** Present tense, always. Past tense only inside a remembered beat or a stated fact about what already happened ('the pulse cracked Rolly's ankle an hour ago'). Never narrate the future as certain.
- **Rhythm:** Default to short and mid-length sentences. Open scenes with a single grounding sensory line. Build dread by accumulating concrete detail then cutting to a short, flat sentence ('The low way out is gone.'). Use paragraph breaks (\n\n) generously — each beat its own block, like breaths. In action/event scenes, clip the rhythm; in waiting/ending scenes, let it slow and lengthen, then end on a short line. Reference the clock ONLY via the {{time}} token or relative phrasing ('the afternoon is going', 'not long now') — NEVER a clock numeral.
- **Motifs:** (1) The lamp as a shrinking disc/coin of light with the dark pressing its rim; its dimming = the central dread clock. (2) Cold as an active searcher that 'finds' you, gets into the joints, makes hands stupid and clumsy. (3) Water as indifferent machinery — it rises, drops, seals on its own schedule, the mountain's business not yours. (4) Breath: fogging in the dry, counted/held in the wet, the most basic resource. (5) Rock as patient and total — it does not hurry and it does not care. (6) Rolly's light/voice as the measure of togetherness — near = a team, receding = loss.
- **Dos and donts:** DO: keep prose physical, cold, and concrete; let the lamp and the body do the dread work; use {{time}} for any clock reference; let each ending body assert ONLY facts its resolver conditions guarantee, hedging branch-specific props with conditional 'if/whether' phrasing (the EE-4 convention from the Prater Line audit). DON'T: write any clock numeral anywhere in prose; DON'T make the cave malicious or speak with intent; DON'T assert in ending prose any flag the reaching path doesn't set (e.g. don't say 'Rolly is beside you' in a default/dark ending that doesn't require cave_all_together — hedge it); DON'T name body_heat/lamp_charge numbers — render them as felt sensation; DON'T resolve ambiguity the state leaves open (a rescue 'that may or may not come' stays may-or-may-not). Companion presence/loss may only be stated as fact in an ending whose conditions guarantee it (cave_all_together for together; cave_someone_lost for loss); otherwise hedge.

## Keystone prose (the locked voice - extend it across all nodes)

### `n_drop` - ch1 opening node (The Pulse — Head of the Pitch)

Cold comes up out of the shaft to meet you, the breath of moving water somewhere a long way down, and you stand at the head of the pitch with the rope running black over the edge.

Whitethroat takes the afternoon's light and keeps it. Behind you, past the entrance crawl, it is {{time}} and grey and ordinary on the hill. Here there is only the lamp on your helmet, a small hard disc of white laid on the rock, and the dark crowding its edge the way it always does, patient, waiting for the battery to tire.

Rolly is above you on the pitch, racking up, breath fogging, cheerful in the way of someone who has done this a hundred times. "Streamway's loud today," Rolly says, and laughs, and the laugh goes down the shaft and does not come back.

The water far below answers nothing. It is not loud at you. It is just loud.

You check the rack, you check the light, you feel the cold already starting to look for the gaps in your wetsuit. The streamway is down there, and the only known way out — the sump, the low duck under the choke — is down there with it. A routine afternoon. You came to do a routine afternoon.

You lean back against the rope and let the pitch take your weight.

### `n_seal_present` - ch1 scheduled-event WITNESSED scene (ev_sump_seal fires while present at sump_pool)

You are at the lip of the sump pool when the mountain decides.

The duck has been shrinking all the while you watched it — a hand's width of black airspace between the water and the rock roof, the only low way out, and the brown flood climbing it without hurry or malice. There is no drama in it. The water rises because somewhere up the hill more water is coming down, and it does not know you are here.

Then the airspace closes.

It does not slam. It draws shut — the water meets the rock with a long sucking roar, air punched out sideways in a cold spray across your face, and where there was a way through there is only the pool, smooth and full and final. The roar goes on for a moment after, the cave swallowing its own sound, and then there is just the lap of water against stone and your own breath loud in your throat.

The low way out is gone.

Your lamp lays its small disc on the heaving black surface. The cold has found the wet skin at your wrists and is working inward. Behind and above you the choke climbs away into dry dark, the only direction left that is not water.

You saw it close. You will not have to wonder, later, whether you might have made it. You know.

### `n_choke_hub` - ch1 scheduled-event ABSENT recovery scene (player not at sump_pool when ev_sump_seal fires; recoveryNodeId; cave_sump_sealed set true + clue_sump_sealed by absent effects)

You are at the boulder choke, water boiling white through the low gaps, when the sound changes.

Somewhere below and out of sight, down where the sump duck was, the cave makes a noise you feel in the rock under your hands more than hear — a deep wet thud, a long sucking draw, and then a settling. You don't have to see it to read it. You have read it in other people's stories, in the club hut on winter nights. That is the sound of a duck going under for good.

You were not there to watch. It made no difference to the water whether you watched. It sealed on its own time, the mountain's business, none of it about you.

The choke stands in front of you: the flood roaring through the low way that is a closed way now, and above it a dry rift climbing into the dark, breathing cold air down at your face. Your lamp's disc shivers on the wet boulders. The battery is tiring; the dark at the edge of the light has come in a little closer than it was.

The low road is decided for you. What is left is up, or nothing.

You file the fact away — the sump is sealed, you heard it go — and you turn your light to the choke.

### `n_h_start` - ch2_high opening node (The Dry High Traverse — The Aven Rift)

Over the choke the air goes dry and the cold changes its character. Down in the streamway the cold was wet and loud. Up here it is silent and patient, and it gets into the bone.

You stand at the foot of the aven rift, a tall blade of darkness climbing away above your lamp's reach. Your breath fogs and hangs. The water is behind you now, a sound that has dropped to a distant rumour somewhere below the floor. It is {{time}}, though up here that means nothing — there is no light to tell it by but the small white coin on your helmet, and that coin is smaller than it was at the pitch head. The battery has given the morning to the dark already. It will give the rest.

You flex your fingers. The cold has started to make them stupid, slow on the rock, and you have a long dry climb ahead before there is any chance of grey sky.

The rift goes up. You can free-climb it fast and spend the warmth you have, or rig it slow and safe and spend the light instead. Either way the cave waits, indifferent, in no hurry at all. It has been here a long time. It will be here after.

You set a hand on the cold rock and start up.

### `n_pulse_present` - ch2_high scheduled-event WITNESSED scene (ev_second_pulse fires while present at oxbow)

You are out on the oxbow bypass, mid-span over the void, when the roar climbs up to meet you.

It comes from below — from the black gulf the bypass bridges, the place where you could hear water but not see it. A second pulse, surging up the system from the drowned streamway, and it is coming fast. The sound rises through the rock and through the soles of your boots and then the water itself is there, a brown lip clawing over the abandoned meander, taking the dry floor you are standing on and making it a river.

The cold of it hits before the wet does. Your lamp's disc jumps and skitters on the heaving surface. There is no time to think it through; there is only the far side, and the water between you and it rising while you watch.

The cave is not trying to take you. The water is only doing what water does when more of it arrives than the passage can hold. But knowing that does not make the lip any lower, and it does not give you back the seconds the flood is eating.

You move. Behind you the bypass goes under for good, the way back cut off in a single cold breath, and whatever crosses now crosses, and whatever doesn't is on the wrong side of the water.

### `n_crystal_hub` - ch2_high scheduled-event ABSENT recovery scene (player not at oxbow when ev_second_pulse fires; recoveryNodeId; ifAbsentEffects set cave_someone_lost true + clue_pulse_cutoff)

You have made Crystal Hall ahead of the water, and that is the only mercy in it.

The chamber is a cold glittering throat of calcite, your lamp throwing its small light across a thousand wet facets, none of them warm. You are catching your breath on the gravel when the roar comes up behind you — the oxbow going under, a second pulse climbing the system and overtopping the bypass you crossed not long ago. You hear it cut off. You hear the dry meander become a river in the space of a few seconds, the way back closing behind you in the dark you can no longer see into.

You were across. Not everyone was.

Whatever was still behind you on the far side of the oxbow is behind the water now, and the water does not negotiate and does not hurry back. The cave did not single anyone out. It simply rose, the way it rises, and the timing was the timing.

The cold of Crystal Hall is the static, bone-deep kind that bleeds the warmth out of you while you stand still doing nothing. Your lamp is dimmer here than it was at the rift; the disc has pulled in, the dark crowding closer at its rim. Ahead, the final shaft. Behind, only water and what the water took.

You make yourself stand. The way out is up, and the light is going.

### `n_s_start` - ch2_sump opening node (The Flooded Sump Crawl — The Duck Pool)

Down below the choke the world is water to your chest and the cold is a thing with hands.

You are in the duck pool, black water moving slow against you, the sealing sump somewhere at your back and the only way on a drowned one. Your lamp lays its disc on the surface and the surface will not hold it still — light shivers and breaks and shivers, and below the broken light there is nothing but more black water and the grit it carries.

It is {{time}}. Down here that is only a feeling — the afternoon going somewhere up above, on the hill, where there is sky. The wet pulls the warmth out of you far faster than the dry ever could; you can already feel the shiver starting low in your back, the kind you cannot decide to stop. Each breath you take is a thing you are spending. There is air in your lungs and a low airspace at the roof of the crawl ahead and not much else between you and the dark.

The far exit is through the water, found by dive, when and if the flood lets you. The mountain holds the schedule. You hold your breath.

You wade forward into the cold, the lamp's broken light going with you, and the water closes warm-cold around your ribs.

### `n_drop_present` - ch2_sump scheduled-event WITNESSED scene (ev_water_drops fires while present at flooded_crawl — the window opens)

You are wedged at the airspace in the flooded crawl, cheek to the cold roof, breathing the thread of foul air the cave allows you, when the water lets go.

The roar that has been pressing at your ears recedes. The pulse has passed somewhere up the system, and here, now, the level drops — you feel it before you see it, the water sliding down off your chin, off your chest, the airspace at the roof yawning suddenly wide. Where there was a finger's breadth of breath there is a hand's, two hands', a black gap you could pull yourself through.

A window. The mountain has opened a window, not for you — it has opened because the water that propped it shut has gone elsewhere — but it has opened, and it will not stay open. The flood is not done. It will come back up and take the gap with it.

Your lamp's disc trembles on the dropped surface. The cold is deep in you now, the shiver constant, your hands gone clumsy and slow. Every part of you wants to be warm and still and out of the water. None of that is on offer.

There is the gap, and the breath in your chest, and the few minutes the cave is lending you. Go now, or the window closes and you are behind the sump.

### `n_gravel_hub` - ch2_sump scheduled-event ABSENT recovery scene (player not at flooded_crawl when ev_water_drops fires; recoveryNodeId; ifAbsentEffects set cave_sump_sealed true + clue_missed_window)

You are up in the gravel chamber, out of the worst of the water, when the cave does the thing you needed to be there for.

You hear it through the rock — down in the flooded crawl the roar drops, the water sliding away, an airspace yawning open for a few borrowed minutes. The window. The chance to dive the seal and reach the far rift. It opens without you. It was never going to wait for you to be ready; it opened because the pulse passed, the mountain's own clockwork, and it asked nothing and announced nothing.

And then, while you stand on the gravel with the cold deep in your joints, you hear it come back up. The roar climbs again. The water fills the gap it briefly gave. The crawl is full and the seal is shut and the easy crossing is gone with the dropped water you weren't down there to use.

You file the cold fact: the window came and went; the sump is sealed against the easy way now.

The gravel bank holds a pocket of air, dim and close. Your lamp has pulled its disc in small; the dark sits just past your hands. The shiver will not stop. There is still a hard way and a waiting way, but the kind crossing is behind you, under the risen water, gone.

You turn your tired light on what is left.

### `n_climb` - ch2_high BLEAK 'cave keeps you' dark ending — end_dark_high (resolver requires cave_dark_out is_true; lamp_charge hit zero, atZero setFlag cave_dark_out). Asserts ONLY the dark; hedges companion.

You are climbing the daylight shaft toward grey light impossibly far up when the lamp gives out.

It does not flicker and rally the way it has all afternoon. It dims, and dims, the small white disc pulling in to a coal, to a thread, to a memory of light on the rock six inches from your face — and then it is gone, and the dark you have been outrunning since the pitch head is simply there, total, with no edge to it at all.

The cave does not change. The shaft is the same shaft, the cold the same cold, the grey mouth of daylight still up there somewhere beyond the reach of any light you have left. The dark was always going to win this race; the battery only ever borrowed the afternoon from it. Now the loan is called.

You hold the rock. You can hear your own breath, and the far drip of water, and nothing that will tell you which way is up except the slow pull in your arms. You climb blind, a hand and a hand and a foot, into a darkness the cave has held since before there were eyes to be lost in it.

Somewhere above is the light. Somewhere is the hill, and the {{time}} sky, and the ordinary afternoon you came down out of.

The cave is in no hurry. It has you, and the dark, and all the time there is.

### `n_climb` - ch2_high PYRRHIC loss ending — end_out_not_whole (resolver requires cave_someone_lost is_true). Asserts the loss as fact (guaranteed by cave_someone_lost); does NOT claim where/how exactly beyond 'behind the water'.

You come up the last of the shaft into grey, and the grey is daylight, and the daylight is real.

It is thin and cold and the most that the hill has to give at {{time}}, but it is sky, and you climb out into it on hands and knees and lie in the wet heather with the rain on your face and breathe air that no rock has been sitting on. You made it. The cave let you have this.

It did not let you have all of it.

Rolly is not beside you. Somewhere back in the dark, on the wrong side of water that rose when water rises and did not care whose side anyone was on, Rolly is behind you — left, lost, cut off, the particular shape of it your own to carry. You climbed out lighter than you went in, and not in any way you wanted.

The lamp still burns its small disc, useless now in the open. You should turn it off. You don't, not yet. You lie in the rain looking back at the black slot in the hillside, and the cave looks back the way it always does, which is not at all.

There will be a call-out. Lights, ropes, people who do this. Maybe in time, maybe not in time. The mountain keeps its own counsel on that and tells you nothing.

You are out. You are not whole. The cold has the truth of it, and the cold does not lie.

### `n_resolve_s` - ch2_sump MANDATORY DEFAULT ending — end_long_cold_wait (empty conditions; reached when no dark/sealed flag dominates). Asserts ONLY hunkered-waiting + cold + uncertain rescue; hedges companion AND does not assert sealed/dark.

The water does not drop in time, and in the end there is nothing to do but wait.

You are wedged in the gravel air bell above the flood, the pocket of close stale air the cave has left you, and you have stopped trying to make the crossing happen. The cold is all the way into you now, the deep shiver that comes in waves and then comes constant, your hands too stupid to do much but knock on the rock — bang, bang, bang, a pause, bang — the slow signal you were taught, sent up through the mountain to anyone who might be listening.

The lamp still gives its small disc, dimmer than it was, the dark sitting patient just past the gravel. You turn it down to save what's left. No sense burning light you'll want later, if there is a later.

If there is anyone beside you in the dark, you share the warmth and the waiting and the knocking. If there is not, the knocking is only yours. Either way the rock takes the sound and does not answer, because rock does not answer; it only carries.

It is {{time}}, or near it; down here the afternoon is a thing happening to other people, up in the light. Somewhere a club will notice you overdue. Somewhere a phone will ring. The call-out may come in time and may not, and the cave, which rose and sealed and dropped on its own indifferent clock, offers no opinion on the matter.

You breathe. You knock. You wait in the cold for a rescue that may or may not come.


