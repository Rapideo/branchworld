# BranchWorld -- Three New Chapter Designs

_Draft v0 blueprints + engine-constraint audit. Generated 2026-06-20 from the team design workflow (Architect -> Writer -> Auditor per chapter)._

> **Status: NOT yet build-ready.** These are first-pass designs. The engine-auditors flagged blockers on all three (below), and the chapters came in under the target epic scale (24 / 25 / 17 nodes vs ~40). Read for premise, world, voice, and the engineering findings -- not as final specs.

## The cross-cutting finding: the engine does not clamp numeric variables

All three auditors independently flagged the same engine gap: `effects.ts` increment/decrement never enforce each variable's declared `bound`. Today the `bound` field is documentation only. Unclamped numerics (a) let re-enterable hub cycles pump trust/heat past their ranges, (b) inflate the state-space walker's key set and risk hitting its cap, and (c) can misfire ending gates. This is the same machinery a **resource primitive** needs (a bounded number with clamping + at-zero behavior), so the fix is shared engine work, not a per-chapter patch.

## Per-chapter verdicts

| Chapter | Title | Nodes | Vars | Events | Endings | Auditor verdict | Blockers |
|---|---|---|---|---|---|---|---|
| Organized Crime | The Mercato Run | 24 | 14 | 2 | 6 | NEEDS REWORK | 6 |
| Underground Survival | The Sump Line | 25 | 13 | 2 | 6 | NEEDS REWORK | 6 |
| The Heist | The Literal Hours | 17 | 14 | 2 | 6 | READY WITH FIXES | 4 |

---

# The Mercato Run -- Organized Crime

**NEEDS REWORK** -- 6 blockers -- 24 nodes -- 6 endings

> A made-soldier in a fading crime family is sent to collect a late debt that turns into a dead body and a buried secret; you have one night to move the corpse, survive a midnight sit-down, and decide who you are before the dock shift changes at dawn.

- **Genre:** Mob crime drama (Goodfellas/Sopranos texture)
- **Setting:** Belmont Harbor, a rust-and-river port city, present-ish but timeless. The Carteri crime family runs the east-side wards out of the Mercato Social Club. One night, from dusk to the 4 AM dock shift change.
- **Protagonist:** Sal Mercato, a soldier under capo Tommy Two-Cars Delfino. Low-to-mid in the family, related by blood to nobody important, but engaged to the underboss's niece — so you have something to protect and everything to prove.
- **Tone:** Lived-in, moral-grey, profane-tender. Men who love each other and will still bury each other. No parody, no winking — the weight is real.
- **Core tension:** A routine collection on a man named Petey Doyle goes wrong: Petey ends up dead (your fault, your partner's fault, or a heart attack you can frame). The family wants the debt and no noise; the cops want a body; your capo wants loyalty; your conscience wants Petey's kid to not find the corpse. Every relationship — capo Tommy, partner Rocco, rival Dom, your fiancee's family — pulls a different way, and the clock is the dock crane that goes dark at 4 AM, your only window to sink the body.
- **The clock:** Start 20:00 (8 PM). Hard deadline 04:00 next day, expressed as 28:00 (1680 min absolute; window = 480 min). The physical clock is the Harbor Authority crane and the dockworkers' shift: the night gang clocks out and the morning gang clocks in at 4 AM, so a body must be in the river before then or it is found at dawn. A scheduled midnight sit-down at the Mercato Club is the social clock; a 02:30 police sweep of the waterfront is the second pressure.

### Expansion hooks (for later folding into one world)
- The Carteri crime family — a named, three-generation east-side organization (boss Carmine Carteri, underboss Vincent 'Vince' Aiello, capo Tommy 'Two-Cars' Delfino) that can recur as the spine of a connected crime world.
- Belmont Harbor — a rust-belt river-port city with named wards (the Flats, Dockside, Little Calabria) reusable as the shared map for mob/cave/heist chapters.
- The Mercato Social Club on Calabria Street — a recurring hub location and the family's seat.
- Detective Renata Voss of Harbor PD Organized Crime — a recurring antagonist/contact who could cross into the heist chapter.
- The O'Doyle / Irish dockworkers' faction — a rival ethnic crew controlling the longshoremen's local, a natural source of future inter-family conflict.
- Sal Mercato himself and his fiancee Gracie Aiello (underboss's niece) — a protagonist and relationship thread that can carry forward.

### Variables

| Variable | Type | Default | Bound | Purpose |
|---|---|---|---|---|
| `mob_tommy_trust` | number | 1 | 0..4 | Capo Tommy Delfino's confidence in Sal's loyalty and competence (0 made-suspect, 4 made-man material). |
| `mob_rocco_bond` | number | 2 | 0..4 | Solidarity between Sal and his partner Rocco (0 he'll roll on you, 4 he'll die for you). |
| `mob_dom_heat` | number | 0 | 0..4 | How much the rival soldier Dom Sabatino has on Sal / is moving against him (0 clean, 4 he can bury you at the sit-down). |
| `mob_family_standing` | number | 2 | 0..5 | Sal's overall standing with the Carteri family leadership at the sit-down (the aggregate the boss judges). |
| `mob_heat` | number | 0 | 0..5 | Police / outside attention drawn this night (0 invisible, 5 a case file with your name). |
| `mob_petey_dead` | boolean | false |  | Petey Doyle is dead (however it happened). |
| `mob_killed_petey` | boolean | false |  | Sal personally and deliberately killed Petey (vs accident / natural / Rocco). |
| `mob_body_sunk` | boolean | false |  | The body was successfully disappeared in the river before the dock shift change. |
| `mob_body_found` | boolean | false |  | The body was discovered (dawn dock crew, cops, or left in the open). |
| `mob_has_debt_money` | boolean | false |  | Sal recovered the $40k Petey owed (the collection's actual point). |
| `mob_knows_setup` | boolean | false |  | Sal learned Tommy set the collection up to fail so it would land on Sal (the night's hidden truth). |
| `mob_made_sitdown` | boolean | false |  | Sal physically attended the midnight sit-down at the Mercato Club. |
| `mob_protected_kid` | boolean | false |  | Sal kept Petey's teenage son Danny out of it / safe (the conscience thread). |
| `mob_gracie_choice` | string | undecided |  | Where Sal stands with fiancee Gracie and the life ('undecided' | 'in' = chose the family | 'out' = chose to leave with her). |

### Locations
- **The Mercato Social Club** (`loc_club`) -- Family seat on Calabria Street; start point and midnight sit-down venue. Hub for orders and judgment.
- **Rocco's Lincoln** (`loc_car`) -- The moving hub — the car ties the map together; conversations and decisions happen on the road.
- **Doyle's Cue & Cushion** (`loc_doyles`) -- Petey Doyle's failing pool hall in the Flats; site of the collection that goes wrong.
- **The Pool Hall Back Room** (`loc_backroom`) -- Where the collection turns into a body.
- **Gracie's Apartment, Little Calabria** (`loc_gracies`) -- The other life; Sal's fiancee and the question of leaving.
- **The Anchor Tap (Dom's bar)** (`loc_dom_bar`) -- Rival Dom Sabatino's turf; where heat and rivalry play out.
- **Pier 7, Dockside** (`loc_docks`) -- The crane and the river; the physical disposal site governed by the 4 AM shift change.
- **The Calabria Street Lock-Up** (`loc_lockup`) -- Family garage; quicklime, tarps, a spare car, and Old Sallie the cleaner.
- **Dockside Streets** (`loc_streets`) -- Transit / connective tissue between wards; where the police sweep is felt.

### Scheduled events
- **The Midnight Sit-Down** (`event_sitdown`) @ 24:00 at `loc_club`
    - World-move: At midnight the principals gather at the Club. If Sal is there it is a live scene; if not, the table convenes without him and Dom narrates the absence to Sal's cost.
    - If present -> `node_sitdown_present`
    - If absent -> set mob_made_sitdown=false; decrement mob_tommy_trust; decrement mob_family_standing; increment mob_dom_heat; add_clue clue_missed_sitdown (word spreads that Sal no-showed the table; Dom fills the silence against him).
    - Recovery node -> `node_aftermath_hub`
- **The 02:30 Waterfront Sweep** (`event_sweep`) @ 26:30 at `loc_docks`
    - World-move: At 02:30 a Harbor PD cruiser sweeps Dockside. Present = caught in it; absent = the pier gets hot, pushing the player toward the lock-up/quicklime disposal instead of the river.
    - If present -> `node_sweep_present`
    - If absent -> set nothing dead-ended: increment mob_heat; add_clue clue_patrol_log (a Harbor PD cruiser logs the pier; if Sal wasn't on the docks he later sees the patrol notice / hears it on the scanner, opening the lock-up quicklime route as the safer disposal).
    - Recovery node -> `node_lockup`

### Endings
- **Made** -- You handled it. Body in the river, debt squared, the table impressed. Carmine says the word. You're getting your button — and you'll spend the rest of your life paying for it.
    - Conditions: On time (before 28:00) AND attended the sit-down AND high family standing (>=4) AND Tommy still trusts you (>=3) AND the body is gone AND Dom didn't bury you (dom_heat <=1).
- **The Door** -- You take Gracie and the bus money and the part of you that's still human, and you walk. No button, no protection, a lifetime of looking over your shoulder — and a kid in the Flats who'll never know your name kept his father's body out of the river.
    - Conditions: On time AND you chose to leave with Gracie AND you protected Petey's kid AND you did NOT personally murder Petey (you keep enough soul to go).
- **Clipped** -- Dom had the floor and you had nothing. By the time the coffee's cold, Tommy won't meet your eye and Vince has already made the call. The life takes you the way it takes everybody who stops being useful.
    - Conditions: Dom buried you at the table (dom_heat >=3) AND your standing collapsed (<=1) — the family decides you're a liability.
- **Pinched** -- Detective Voss has a corpse with your fingerprints on the story. They walk you out of the Club in front of everybody. The only question left is whether you're a stand-up guy or a witness — and the family's already deciding that for you.
    - Conditions: Heat maxed (mob_heat >=4) AND the body was found — Harbor PD has a body and a name.
- **Loose Ends** -- The 4 AM gang clocks in and the crane lights come up and there's Petey, half in the water, waiting for them. You spent the night learning things you didn't need to know and lost the only thing that mattered: the dark. Now everybody's exposed, and it's your name on it.
    - Conditions: You ran out of night (time at/after 28:00) with a body still not gone (not sunk) — dawn finds it.
- **Another Night in the Life** _(default catch-all)_ -- No button, no cuffs, no river-grave gone wrong — just a long grey morning, a debt half-collected, men who half-trust you, and a city that swallows the night the way it swallows everything. You're still here. That's the whole of it.
    - Conditions: Catch-all: the night resolved into none of its sharp shapes.

### Clock budget
- Window: **480 min** -- efficient path ~435 -- dawdle ~585
- Costs: Start orders at Club +15. Drive a leg (Rocco's Lincoln between wards) +25 to +35. The collection scene at Doyle's +30-45. Moving/prepping the body (lock-up tarp/quicklime) +40. Sinking at Pier 7 +35. Attending sit-down +30. A full conversation (Gracie / Dom / Tommy heart-to-heart) +20-30. One major detour (e.g. the Gracie apartment loop, or going to Dom's bar to read the rival) +50-70. Two detours or lingering in optional conversations pushes past 480 and misses the dock window / sit-down.
- Walker plan: **exhaustive** -- hubs: `node_car_hub`, `node_aftermath_hub`, `node_docks_approach`, `node_lockup`

### Node outline

**`node_club_start`** -- The Mercato Social Club _(scene @ loc_club)_
  Open the night; establish family, capo Tommy, the collection order, the clock.
    - "Take the job clean. 'Forty large, before midnight. Done.'" -> `node_tommy_brief` [+15m] _(if always)_ => increment mob_tommy_trust (capped 4); add_minutes 15
    - "'Why me, Tommy? Petey's Dom's guy.' Push on the assignment." -> `node_tommy_brief` [+15m] _(if always)_ => add_clue clue_petey_was_doms; add_minutes 15

**`node_tommy_brief`** -- Two-Cars Lays It Out _(conversation @ loc_club)_
  Capo characterization; seed the hidden setup; introduce the kid and the no-noise rule.
    - "Collect your partner Rocco and roll." -> `node_car_hub` [+10m] _(if always)_ => change_location loc_car; add_minutes 10
    - "Read Tommy's face. Press on what he's not saying." -> `node_tommy_tell` [+15m] _(if if mob_tommy_trust <= 1)_ => add_minutes 15

**`node_tommy_tell`** -- What Tommy Won't Say _(conversation @ loc_club)_
  Optional early route to the setup truth; gated low-trust so it's a price.
    - "Back off, bank the suspicion, go." -> `node_car_hub` [+10m] _(if always)_ => set mob_knows_setup=true; decrement mob_tommy_trust; change_location loc_car; add_minutes 10

**`node_car_hub`** -- Rocco's Lincoln _(scene @ loc_car)_
  CENTRAL HUB. The crossroads players return to between wards; sets partner tone; routes the map.
    - "Drive to Doyle's pool hall and do the collection." -> `node_doyles_arrive` [+30m] _(if if Petey not yet dead)_ => change_location loc_doyles; add_minutes 30
    - "Swing by Gracie's first. (A detour, but you need to hear her voice.)" -> `node_gracie` [+35m] _(if if mob_gracie_choice == undecided)_ => change_location loc_gracies; add_minutes 35
    - "Talk straight with Rocco about where you both stand." -> `node_rocco_talk` [+20m] _(if always)_ => add_minutes 20
    - "Detour to Dom's bar — read the rival before he reads you." -> `node_dom_bar` [+30m] _(if if mob_made_sitdown is false)_ => change_location loc_dom_bar; add_minutes 30

**`node_rocco_talk`** -- You and Rocco _(conversation @ loc_car)_
  Build/spend partner bond; flag-equivalent loyalty that pays off at disposal and sit-down.
    - "Level with him. Make him your brother tonight." -> `node_car_hub` [+15m] _(if always)_ => increment mob_rocco_bond (capped 4); add_minutes 15
    - "Keep it business. 'Just drive, Rocco.'" -> `node_car_hub` [+5m] _(if always)_ => decrement mob_rocco_bond; add_minutes 5

**`node_gracie`** -- Gracie's Apartment _(conversation @ loc_gracies)_
  The other life; opens the exit thread. Major detour (time cost) but the only door to 'The Door' ending.
    - "'After tonight. One more night and we're gone.' Mean it." -> `node_car_hub` [+30m] _(if always)_ => set mob_gracie_choice=out; change_location loc_car; add_minutes 30
    - "'This IS the life, Gracie. It's who I am.' Choose the family." -> `node_car_hub` [+20m] _(if always)_ => set mob_gracie_choice=in; increment mob_family_standing (capped 5); change_location loc_car; add_minutes 20

**`node_dom_bar`** -- The Anchor Tap _(conversation @ loc_dom_bar)_
  Rival mechanic; read or feed Dom; major detour that trades time for control of dom_heat.
    - "Show respect, cut him in on a taste. Defuse it." -> `node_car_hub` [+25m] _(if always)_ => decrement mob_dom_heat; change_location loc_car; add_minutes 25
    - "Push back hard. Let him know you're not afraid." -> `node_car_hub` [+20m] _(if always)_ => increment mob_dom_heat (capped 4); increment mob_family_standing (capped 5); change_location loc_car; add_minutes 20
    - "Let slip you're collecting on Petey tonight." -> `node_car_hub` [+15m] _(if always)_ => increment mob_dom_heat (capped 4); add_clue clue_dom_knows; change_location loc_car; add_minutes 15

**`node_doyles_arrive`** -- Doyle's Cue & Cushion _(scene @ loc_doyles)_
  Arrive at the collection; introduce Petey and his kid Danny; set the conscience stakes.
    - "Tell Danny to take a walk and get a soda. Keep the kid clear." -> `node_collection` [+10m] _(if always)_ => set mob_protected_kid=true; add_minutes 10
    - "Let it happen in front of the kid. Faster, uglier." -> `node_collection` [+5m] _(if always)_ => increment mob_heat (capped 5); add_minutes 5

**`node_collection`** -- The Collection _(conversation @ loc_doyles)_
  The pivotal collection; the fork that determines HOW the body happens (or doesn't).
    - "Take the half he's got and give him till dawn for the rest." -> `node_backroom` [+30m] _(if always)_ => set mob_has_debt_money=true; add_minutes 30
    - "Get physical. Make him find the rest." -> `node_backroom` [+25m] _(if always)_ => increment mob_heat (capped 5); add_minutes 25
    - "Let Rocco handle it. Look away." -> `node_backroom` [+20m] _(if if mob_rocco_bond >= 2)_ => increment mob_heat (capped 5); add_minutes 20

**`node_backroom`** -- The Back Room _(event @ loc_backroom)_
  Where it goes wrong; the body-state machine starts. Branches on prior choice into accident/murder/natural.
    - "It was an accident — he fell. Process what just happened." -> `node_body_decision` [+15m] _(if if you did NOT choose to kill (took_half or got_physical path))_ => set mob_petey_dead=true; add_minutes 15
    - "He's seen too much. Finish it clean with your own hands." -> `node_body_decision` [+15m] _(if always)_ => set mob_petey_dead=true; set mob_killed_petey=true; increment mob_dom_heat (capped 4); add_minutes 15
    - "He clutches his chest and drops. Nature did it for you." -> `node_body_decision` [+10m] _(if if mob_heat <= 1)_ => set mob_petey_dead=true; add_minutes 10

**`node_body_decision`** -- A Body On The Floor _(scene @ loc_backroom)_
  HUB-ish fork into disposal logistics; the kid/conscience and the call-it-in choices.
    - "Call Tommy. Tell him it went wrong." -> `node_call_tommy` [+10m] _(if always)_ => add_minutes 10
    - "Don't call anyone. Wrap him and go to the lock-up." -> `node_to_lockup` [+15m] _(if always)_ => change_location loc_streets; add_minutes 15
    - "Find Danny first. He saw. Decide what to do about the kid." -> `node_danny_choice` [+15m] _(if if mob_protected_kid is false)_ => add_minutes 15

**`node_danny_choice`** -- The Kid Saw _(conversation @ loc_doyles)_
  Conscience crux; sets protected_kid or escalates heat; flag-equivalent path to protecting the kid.
    - "Money, a bus ticket, a hard promise. Get the kid gone and clean." -> `node_to_lockup` [+20m] _(if always)_ => set mob_protected_kid=true; change_location loc_streets; add_minutes 20
    - "A witness is a witness. Do the cold thing." -> `node_to_lockup` [+20m] _(if always)_ => set mob_killed_petey=true; increment mob_heat (capped 5); increment mob_dom_heat (capped 4); change_location loc_streets; add_minutes 20

**`node_call_tommy`** -- 'Tommy, It Went Wrong' _(conversation @ loc_backroom)_
  Loyalty branch; Tommy's reaction reveals or conceals the setup; routes to lock-up with support.
    - "Take his help. Old Sallie meets you at the lock-up." -> `node_to_lockup` [+15m] _(if always)_ => increment mob_tommy_trust (capped 4); change_location loc_streets; add_minutes 15
    - "Catch the thing in his voice. Realize this was engineered." -> `node_to_lockup` [+15m] _(if if mob_tommy_trust <= 2)_ => set mob_knows_setup=true; change_location loc_streets; add_minutes 15

**`node_to_lockup`** -- Dockside Streets, After _(transition @ loc_streets)_
  Connective transit toward disposal; lets time advance toward the sit-down/sweep windows.
    - "Pull into the Calabria Street lock-up." -> `node_lockup` [+20m] _(if always)_ => change_location loc_lockup; add_minutes 20
    - "Leave the problem in the trunk and make the midnight table first." -> `node_to_club` [+20m] _(if if current time is before 24:00)_ => change_location loc_streets; add_minutes 20

**`node_lockup`** -- The Calabria Street Lock-Up _(scene @ loc_lockup)_
  HUB + sweep recovery node. Tools, quicklime, Old Sallie; the disposal-method fork; surfaces sweep clue if absent.
    - "Tarp him up and take him to Pier 7 to sink before the dock shift." -> `node_docks_approach` [+25m] _(if always)_ => change_location loc_streets; add_minutes 25
    - "Do it here with lime and Sallie. Slower, but no river, no patrol." -> `node_quicklime` [+40m] _(if always)_ => add_minutes 40
    - "Let Sallie talk — the docks are hot tonight, he's heard the scanner." -> `node_quicklime` [+15m] _(if if clue clue_patrol_log present)_ => add_clue clue_sallie_warning; add_minutes 15

**`node_quicklime`** -- Lime and Patience _(event @ loc_lockup)_
  Alternate disposal that sinks the body without the river/sweep risk; costs the most time.
    - "It's done. Nothing left. Head for the midnight table." -> `node_to_club` [+20m] _(if always)_ => set mob_body_sunk=true; decrement mob_heat; change_location loc_streets; add_minutes 20

**`node_docks_approach`** -- Pier 7, Approach _(scene @ loc_docks)_
  HUB before the river finale; where the 02:30 sweep is risked; gates the actual sink.
    - "Weight him and put him in the water now, fast." -> `node_sink_body` [+35m] _(if if current time before 28:00)_ => add_minutes 35
    - "Wait for the gang to move down-pier, then do it clean." -> `node_sink_body` [+50m] _(if if current time before 26:30)_ => decrement mob_heat; add_minutes 50
    - "Too hot. Abort to the lock-up and use lime instead." -> `node_lockup` [+30m] _(if always)_ => change_location loc_lockup; add_minutes 30

**`node_sink_body`** -- Into the River _(event @ loc_docks)_
  Resolves the body-state machine to sunk; main success disposal.
    - "It's done. Get to the family — the night isn't over." -> `node_to_club` [+20m] _(if always)_ => set mob_body_sunk=true; change_location loc_streets; add_minutes 20
    - "It's done, and it's past midnight. Slip back into the night." -> `node_aftermath_hub` [+20m] _(if if current time at/after 24:00)_ => set mob_body_sunk=true; change_location loc_streets; add_minutes 20

**`node_to_club`** -- Back to Calabria Street _(transition @ loc_streets)_
  Transit into the sit-down window; routes present/absent based on the scheduled event time.
    - "Go in. Take your seat at the table." -> `node_sitdown_present` [+15m] _(if if current time before 24:30 (you can still make the table))_ => change_location loc_club; add_minutes 15
    - "You're late. The table's already broken up. Slip in after." -> `node_aftermath_hub` [+15m] _(if if current time at/after 24:30)_ => change_location loc_club; add_minutes 15

**`node_sitdown_present`** -- The Midnight Sit-Down _(event @ loc_club)_
  SCHEDULED EVENT ifPresentNode. The social judgment; standing is weighed; Dom testifies.
    - "Be a stand-up guy. Own the night, square the debt, take your medicine." -> `node_aftermath_hub` [+30m] _(if always)_ => set mob_made_sitdown=true; increment mob_family_standing (capped 5); increment mob_tommy_trust (capped 4); add_minutes 30
    - "Turn it on Dom — Petey was his earner, his mess." -> `node_aftermath_hub` [+30m] _(if if clue clue_petey_was_doms present)_ => set mob_made_sitdown=true; increment mob_dom_heat (capped 4); increment mob_family_standing (capped 5); add_minutes 30
    - "Lay the setup on the table — Tommy engineered this." -> `node_aftermath_hub` [+30m] _(if if mob_knows_setup is true)_ => set mob_made_sitdown=true; decrement mob_tommy_trust; increment mob_family_standing (capped 5); add_minutes 30
    - "Say as little as possible and let it ride." -> `node_aftermath_hub` [+25m] _(if always)_ => set mob_made_sitdown=true; increment mob_dom_heat (capped 4); add_minutes 25

**`node_aftermath_hub`** -- After the Table _(scene @ loc_club)_
  CENTRAL POST-MIDNIGHT HUB + sit-down recovery node. Funnels all late paths; surfaces missed-sitdown clue; routes to finale by body-state.
    - "The body's still a problem — go finish it at the docks." -> `node_docks_approach` [+25m] _(if if mob_petey_dead is true AND mob_body_sunk is false)_ => change_location loc_streets; add_minutes 25
    - "Go to Gracie. Take the out while there's still a you to save." -> `node_exit_with_gracie` [+30m] _(if if mob_gracie_choice == out)_ => change_location loc_gracies; add_minutes 30
    - "It's handled. Let the night close out." -> `node_resolve` [+15m] _(if always)_ => add_minutes 15

**`node_sweep_present`** -- 02:30 — The Cruiser _(event @ loc_docks)_
  SCHEDULED EVENT ifPresentNode. Caught in the waterfront sweep while on the pier.
    - "Go still in the crane's shadow and wait it out." -> `node_sink_body` [+20m] _(if always)_ => increment mob_heat (capped 5); add_minutes 20
    - "Walk out casual and play night-fisherman if she stops." -> `node_sink_body` [+15m] _(if always)_ => increment mob_heat (capped 5); increment mob_heat (capped 5); add_clue clue_voss_made_you; add_minutes 15

**`node_exit_with_gracie`** -- The Bus Money _(scene @ loc_gracies)_
  Resolves the walk-away thread; routes to ending resolution with gracie_choice=out locked.
    - "Take her hand and walk out of the life for good." -> `node_resolve` [+20m] _(if always)_ => add_minutes 20
    - "You can't. Send her ahead and turn back to the family." -> `node_resolve` [+15m] _(if always)_ => set mob_gracie_choice=in; increment mob_family_standing (capped 5); add_minutes 15

**`node_resolve`** -- The Long Grey Morning _(transition @ loc_streets)_ _[resolvesEnding]_
  Universal ending-resolution node; entering it runs the resolver against accumulated state.

### Voice bible
- **Register:** Lived-in, moral-grey, profane-tender — the texture of Goodfellas and The Sopranos rendered as prose. Working-class Italian-American mob vernacular, but never cartoonish. The sentences carry weight like men who love each other and will still bury each other. Beauty is allowed but it must be earned and undercut: a lyrical image is always followed by something cold or bodily. Profanity is used sparingly and with affection or threat, never for shock. The narration knows the cost of everything and says it plain.
- **POV:** Second person, present-protagonist ('you' = Sal Mercato). The reader IS Sal. Other characters are named and addressed as Sal would think of them — Tommy, Rocco, Dom, Gracie, the kid Danny, Old Sallie. Interiority is close and unflinching: you feel the weight in your hands, the river smell in your nose, the thing in Tommy's voice. Never break the second person; never narrate Sal from outside.
- **Tense:** Present tense throughout. The night is happening now. Even the ending bodies stay present-or-immediate ('The river takes him' / 'They walk you out') — the morning is arriving, not remembered. This keeps the clock alive and the dread immediate.
- **Rhythm:** Short declaratives for action and dread; longer, breath-held compound sentences for reflection and the lyrical beats. Cadence built on the comma-run and the hard period. Fragments are permitted as punches. A paragraph often ends on a short, flat line that lands the cost. Vary sentence length deliberately — a long river of clauses, then a stone. Dialogue is clipped, rhythmic, loaded with subtext.
- **Dialogue:** Spare, idiomatic, never expository. Men say less than they mean. Endearments and threats wear the same coat ('kid', 'sweetheart', 'paesan'). Nobody explains the life out loud — it's understood. Tommy is warm and lethal in the same breath. Rocco riffs to fill silence. Dom performs grievance. Gracie talks like the only honest person in the room. Use dialect lightly (dropped g's, 'youse' rarely) — flavor, not phonetic transcription.
- **Motifs:** The river (oil-dark, patient, takes everyone the same way); the crane and the dock shift as the clock made physical; espresso machines hissing as the family's heartbeat; weight (the body, the debt, the thing carried); the neon saint over the Club; light dying / coming up (the night as a held breath between two dawns); hands (what they do, what they can't undo); the door (the life as a one-way door, opened the wrong way only once).
- **Dos and donts:** DO: keep present tense and second person without exception. DO use the {{time}} token wherever a clock reference is wanted; never hardcode a number like '8 PM' or '4 AM' — say {{time}} or use relative phrasing ('before the dock shift', 'past midnight', 'the last dark hour'). DO undercut every lyrical image with something bodily or cold. DO let endings assert ONLY state the reaching path guarantees. DON'T write parody, winking, or quip-comedy. DON'T over-explain the mob world. DON'T name a clock time in prose. DON'T assert in any ending a flag its conditions don't guarantee (e.g. don't say the debt was collected in 'Made'; don't say Petey is alive in 'The Door'; don't say the body was sunk in 'Clipped' or 'Default'). DON'T let Sal be a hero or a monster by default — he is exactly what the player's choices made him.

### Keystone prose

#### `node_club_start` -- OPENING NODE

The espresso machine at the back of the Mercato Social Club hisses like it's got something to confess, and nobody listens, because nobody here ever does. Old men hunch over scopa under the saint's neon, the same four faces they've been for thirty years, slapping cards down soft so the sound won't wake whatever's sleeping in the back. Calabria Street smells the way it always smells this time of evening — burnt sugar, river rot, somebody's gravy two doors down. It is {{time}}, and the light is already going out of the day the way it goes out of everything around here. Quiet. Without anyone deciding it.

Tommy Two-Cars Delfino is at the corner table with his jacket off and his pinky ring catching the bulb, and he does the thing he does, which is to look at you for a second too long before he smiles. Tommy's smile is a beautiful thing and you have learned, over the years, to be afraid of it.

'Salvatore,' he says, like your name is a small gift he's giving you. 'Sit. Drink something.'

You don't sit. He knows you won't. He slides an envelope across the felt — thin, almost nothing, which is the joke, because what's in it isn't paper, it's a man. 'Petey Doyle,' Tommy says. 'Cue and Cushion, out in the Flats. He's into us forty large and he's been into us forty large too long. Carmine wants it squared before the table tonight.' He taps the envelope once. 'Quiet. You hear me? The man's got a kid. No headlines before the sit-down, Sallie. No noise.'

Forty thousand dollars and a midnight that's already closer than it was a minute ago. Out past the window the harbor lights are coming up cold and orange, and somewhere down at Pier 7 the night gang is clocking in, and that crane will run until the morning shift takes the dark away. You have until then. Everybody in this room has until then; they just don't know it yet. Only you do.

Tommy waits. The machine hisses. You feel the weight of the night settle onto your shoulders like a coat somebody else paid for, and you reach out and take it, because that is what you do, because that is what you are.

#### `node_sitdown_present` -- SCHEDULED EVENT — WITNESSED (ifPresentNode)

They've set the back room the way they set it for the things that matter — the green baize swept, the good espresso out, the door closed and a man you can't see standing on the other side of it. It is {{time}}, and the principals are all here, which means the night has finally caught up to itself.

Carmine Carteri sits at the head with his hands folded like a man at Mass, and he has not gotten old so much as gotten still, the way a knife gets still. Vince Aiello is at his right — Gracie's uncle, your almost-uncle, the man whose blood you're marrying into — and he won't look at you yet, which tells you the looking will come later and it will cost. Tommy's across the felt with his beautiful dangerous smile turned down to a flat line. And next to Tommy, fat with the night and loving every second of it, sits Dom Sabatino, gold chain riding his collar, already half a story told before you've sat down.

'Sit,' Carmine says. The room sits.

This is the part nobody warns you about when you're a kid wanting in. Not the body, not the river — this. The table. Where the night you just lived gets read back to you by men who weren't there, in front of men who decide what you're worth, and the only currency that buys you anything is the one you can't fake, which is what kind of man you are when the lights are on and the story's being told.

Dom leans forward to start filling the silence with his version of you. Carmine raises one finger — not yet — and turns those still eyes on you instead. The espresso machine hisses somewhere far off, the family's heartbeat, indifferent. Outside, the crane runs and the river waits and the clock keeps its own counsel.

'Salvatore,' the old man says. 'Tell us about your night.'

#### `node_aftermath_hub` -- SCHEDULED EVENT — ABSENT RECOVERY (recoveryNodeId)

The Club has emptied down to the smokers and the saint, the neon buzzing over a room that already happened without you. It is {{time}} and the table broke up a while ago — you can read it in the cups left half-drunk, the chairs pushed back, the particular quiet a room holds after men have decided something in it.

Nunzio's on the step with a cigarette, one of the button men, young enough to still think loyalty and information are the same thing. He doesn't quite meet your eye, and that's how you know before he says a word. 'You weren't here,' he says, which isn't an accusation, just weather. 'Sal. You weren't here.' A drag. 'Dom had the floor the whole time. A man's got the floor and the chair's empty across from him, he can say anything he wants, and there's nobody to say it back.'

He puts something in your hand. A folded scrap, a name, a thing Dom planted in the silence where you should have been standing — the missed table is its own kind of evidence in the life, and the life keeps its books. You no-showed the place where your worth gets counted, and in your absence somebody counted it for you, low.

The river smell comes up Calabria Street the way it always does, patient, and somewhere down at the docks the crane is still running but not for much longer. Whatever's still undone tonight — and you know exactly what's still undone, you can feel where you left it — this is where the night turns and points itself at how it ends. The smokers don't look at you. The machine has gone cold and silent for the night. You're standing in the aftermath of a judgment you didn't attend, holding the proof of it, and the dark out there is getting shorter by the minute.

#### `ending_made` -- ENDING — Made

It's done, and you handled it, and there's a particular silence that falls when men who've seen everything decide they've seen enough. Petey Doyle is in the river where the river takes everyone the same way, the rings spread and closed over him hours ago, and you made the table on time and you stood up straight while the night got read back to you, and when it was over Dom had nothing and you had the floor.

Carmine doesn't say much. Men like Carmine never have to. He stands, and he comes around the felt — the old man, coming to you — and he takes your face in two dry hands the way a priest might, or a butcher checking the cut, and he says the word. Just the word, low, in the old dialect, the one that means you're in, the one that means made, the one that means for the rest of your life you belong to this the way your hand belongs to your arm.

Tommy's smiling his beautiful smile and meaning it for once, and across the room Vince Aiello finally looks at you, and nods, slow, which is Gracie's uncle telling you the marriage is blessed and the man and the made-man are the same man now and always will be.

It is {{time}}. Out past the window the harbor lights are still cold and orange and the crane is still running and soon the morning gang will clock in and take the dark, and they'll never know what the dark held, and that's the whole gift of the thing you just bought. You got everything you wanted. You will spend the rest of your life paying for it, in installments, quietly, the way you pay for everything in the life. The espresso machine hisses. Somebody pours you a drink you didn't ask for. You're one of them now, all the way down.

That's the word. That's the night. That's you.

#### `ending_walk_away` -- ENDING — The Door

Gracie's already got the duffel by the door and a thermos that's gone lukewarm and a look that's been asking you the same question since the first night you met her: are you really the man who walks. The bus money's rolled in a rubber band in your jacket. The schedule's a paper square soft from your thumb working it over and over on the drive here.

There was a kid out in the Flats tonight, Danny Doyle, white-faced over a felt table, and whatever else this night made you it didn't make you the man who lets a kid go down with everything else. You put money in his hand and a future on a bus and a hard promise in his ear, and you kept him clear of it, kept him out, and that one act sits in your chest now like the last warm coal of who you used to be. You did some things tonight you'll carry. But you never closed your hands around a living man on purpose. You held that line. It's a thin line and it's the only thing you're taking with you besides the girl.

'Sal,' Gracie says. Just your name. Not the one the family says — yours.

It is {{time}}, and the door of the life only ever opens one way, and for once it's open the other way, and you take her hand and you go through it. No button. No protection. A long road and a longer habit of looking over your shoulder, every diner, every parked car, the rest of your life. The Carteris don't forgive a man who chooses the door. They'll send word, eventually. Maybe they'll send more than word.

But the bus is real and Gracie's hand is real and somewhere behind you in the Flats there's a kid who got to keep something, who'll grow up not knowing your name and not knowing a stranger kept his father's body out of the river, and that's a thing you'll never be able to tell anybody, and it's enough. The harbor smell thins out behind you. The crane lights are coming up for a morning you won't be here for.

You walk. You're still a person. That's the whole of what you saved, and it cost you everything else, and you'd do it again.

#### `ending_clipped` -- ENDING — Clipped

Dom had the floor and you had nothing, and that's the entire story of how the life ends for a man, told in the space of one cold cup of coffee.

It is {{time}}. The table heard his version and your version sounded thin even to you, and you watched it happen the way you watch a car you're already in go off the road — slow, certain, no door handle that works. Standing went out of you like water out of a cracked glass. By the time Dom sat back, satisfied, gold chain glinting, there was a thing decided in the room that nobody had to say, because the family doesn't say it, the family just stops looking at you a certain way and starts looking at you another way.

Tommy won't meet your eye now. That's the tell. Tommy, who handed you the night with his beautiful smile, who you'd have died for once — he's studying his cuff, his ring, the felt, anything but you, because that's how a capo grieves a man he's already given up. And Vince Aiello has stepped out to make a call, and you don't have to wonder who he's calling or what he's saying. You know. You've made calls like it.

There's a particular kindness in how fast it goes, once it's decided. They'll buy you a drink first, probably. Somebody'll put a warm hand on the back of your neck and call you paesan. The life takes you the way it takes everybody who stops being useful — not in anger, never in anger, just in arithmetic. You stopped adding up. The espresso machine hisses, indifferent, doing the only thing in this room that doesn't lie.

You wanted in your whole life. You're in. All the way down, where the river is, where the river always was, waiting and patient and the same for everyone.

#### `ending_pinched` -- ENDING — Pinched

It's the headlights you notice first, washing the room cold, and then it's Detective Renata Voss coming through the Club door like she owns the deed, and the smokers go quiet and the saint buzzes overhead and you already know, the way you've known a few true things tonight, that this is the one you don't talk your way out of.

Because there's a body, and the body has your night written all over it, and you put it there with your own two hands — that's the part that doesn't wash off, the part you chose, the deliberate weight of it still living in your palms. You drew the kind of heat that becomes a file, and a file becomes a name, and the name is yours, and now here's the woman who's been building the case standing in the family's own front room with a warrant and no particular hurry.

It is {{time}}. She lets you stand up on your own — small mercy, professional courtesy — and she walks you out past Carmine and Vince and Tommy, past the whole table, in front of everybody, which is the worst part and she knows it's the worst part. The family watches you go the way they'd watch a man go down with a sickness, calculating, already deciding the only thing that matters to them now, which isn't whether you did it. It's whether you'll stay shut.

Stand-up guy or a witness. That's the whole question left in the world, and you don't get to answer it tonight, in the cold of the cruiser, with the river smell coming off your own clothes. The crane lights are coming up out the back window for a morning shift that'll find nothing, because the cops already found everything. The family's deciding what you are. You'll have a long time, somewhere quiet and barred, to decide it too.

#### `ending_loose_ends` -- ENDING — Loose Ends

The crane lights come up before you're ready, the way the worst things always arrive on schedule, and the morning gang clocks in down at Pier 7 with their coffee and their bad jokes, and the dark you needed — the only thing you actually needed all night — is gone like it was never owed to you.

It is {{time}}, past the shift change, past the window, past everything. Petey Doyle is still here. Still a problem with a face. Half in the water or wrapped in a tarp or laid out where you ran out of road, it doesn't matter now which, because the one thing that mattered was getting it into the dark before the dark ran out, and you spent the night on everything but. Conversations. Detours. Things you learned that you didn't need to know and can't un-know. You filled the hours with everything except the one job the hours were for.

And now the light's coming up over the harbor, flat and grey and total, and there's no version of this morning where a dockworker doesn't stop, and look twice, and go quiet, and reach for a phone. Maybe it's already happening. Maybe somebody's already looking at what you left and feeling the bottom drop out of their ordinary Tuesday.

The city takes the night back without comment, the way it takes everything, except this once it didn't swallow it clean — this once it left a thing on the shore for everyone to see, and it's got your night on it, your hands somewhere in the story, your name waiting at the end of a thread anybody can pull. You spent the dark learning who you were. You should've spent it making the body disappear. Now everybody's exposed, in the long grey morning, and there's no more dark to hide in, and there won't be again for a while.

#### `ending_default` -- ENDING — Another Night in the Life (default)

And then, the way nights do, it's just over.

No word from Carmine, no hand on the back of your neck, no cuffs, no river-grave that came up wrong at dawn — none of the sharp shapes a night like this can take. Just the slow grey leak of morning into Calabria Street, the espresso machines coughing back to life behind shuttered glass, the first delivery truck grinding past, the saint's neon going pale and stupid in the daylight.

It is {{time}}. The crane down at Pier 7 lights up for the morning gang and they clock in and the dark goes out of the harbor without ceremony. You stand in it. A debt half-squared or half-blown, you're honestly not sure anymore which. Men who half-trust you and will keep half-trusting you, which in the life is most of what you ever get. A night that didn't make you and didn't break you, that just happened, the way most of them do, the way most of everything does.

This is the part they don't tell you about either. Not the table, not the river — this. That most nights in the life don't end in a story worth telling. They end like this, in a grey nothing, with you still standing, still owed, still owing, still here.

The city swallows the night the way it swallows everything, and doesn't look up, and doesn't remember, and you light a cigarette you don't want and you go home, because you're still here, and that's the whole of it, and tomorrow there'll be another one.

### Engine-constraint audit

**Verdict: NEEDS REWORK.** The design is structurally close and the clock model is correct, but it is NOT build-ready against the real engine. Three high-severity blockers must be fixed before a build can pass the walker and behave as authored: (1) mob_body_found is a dead flag, making ending_pinched unreachable; (2) the scheduled-event present/absent routing collides with hub locations — node_aftermath_hub being loc_club force-routes no-show players into the sit-down, so the absent branch is nearly unreachable; (3) numeric vars are unclamped while re-enterable hub cycles (node_car_hub<->node_rocco_talk, aftermath<->docks) can pump them past their stated bounds, undermining the tractability guarantee. Two medium EE-4 prose-vs-state mismatches (Made claims the debt squared; The Door claims the body stayed out of the river) and the c_accident gating gap also need resolution. Links, default-ending integrity, no-exit, undefined-var/location, and clock-bite all pass. Fix the three highs (clamp+fire-once loops, decouple event locations, set mob_body_found), align the two endings' prose with their conditions, then run lintStory + walkStateSpace and confirm errors=0, capHit=false, orphanEndings empty, and the event recovery nodes report ok=true.

- Clock check: OK -- Clock is structurally sound and will bite fairly. Absolute-time model confirmed in initState (time=parseTime(startTime)): start 20:00=1200m, deadline 28:00=1680m (parseTime accepts the >24h literal '28:00'), window=480m. time_after is >= and time_before is <, matching the design. CLOCK_CANNOT_BITE will NOT fire: longest path (both detours node_gracie +35 and node_dom_bar +30, the rocco-talk loop, full collection, lock-up, abort-to-lime, sit-down +30, aftermath) exceeds 480; dawdle 585 confirms. DEADLINE_UNWINNABLE will NOT fire: linter minTime DFS finds a sub-480 decisive path (~435). All keystone PROSE correctly uses {{time}} and relative phrasing with no hardcoded clock numerals. Two non-blocking caveats: (1) node titles 'node_sweep_present'/'02:30 — The Cruiser' embed an absolute clock literal — titles are author-facing not authoritative prose so EE-1 is not violated, but reword to avoid implying a wall-clock the engine doesn't derive. (2) All time-condition literals (24:00, 24:30, 26:30, 28:00) parse and sit within [1200,1680], so TIME_LITERAL_OUT_OF_RANGE will not fire — builder MUST encode them as 24h+ minutes-past-midnight ('24:30','26:30'), never as '00:30'/'02:30'.
- Endings exhaustive: single default = True, ok = False
- State-explosion risk: **medium** (exhaustively walkable: uncertain) -- Three compounding drivers push the cross-product beyond the design's optimistic estimate: (1) UNCLAMPED numeric vars — the engine never caps, so mob_rocco_bond/family_standing/dom_heat/heat can range wider than 0..4/0..5, and the node_car_hub<->node_rocco_talk cycle lets the player pump them while time advances in 5-min steps, creating many (time,var) state combinations. (2) FINE-GRAINED ABSOLUTE TIME — the walker keys on exact minutes; with add_minutes costs of 5/10/15/20/25/30/35/40/50 the time axis is fairly coarse (multiples of 5) which helps, but the re-convergent hubs (node_car_hub, node_lockup via abort-to-lime, node_aftermath_hub) are entered at MANY distinct times, and each distinct entry time is a distinct walker state. (3) The node_car_hub is re-enterable from node_rocco_talk, node_gracie, node_dom_bar AND the collection is gated 'if Petey not yet dead' so the hub is visited pre-body at several (time,bond,dom_heat,standing,clue) combos. node_aftermath_hub is also re-enterable (c_finish_disposal -> docks -> sink -> back to aftermath). These cycles times coarse-but-real time axis times unclamped vars is the explosion vector.

**Blockers:**
- **[HIGH]** mob_body_found is never set by any effect, so ending_pinched (requires mob_body_found is_true) is UNREACHABLE — dead ending, will appear in walker orphanEndings.  **-> Fix:** Add effects that set mob_body_found=true on the not-sunk-by-deadline / left-in-open failure paths (and wire it into the loose-ends/pinched fork), or remove the mob_body_found dependency from ending_pinched.
- **[HIGH]** Scheduled-event present/absent routing collides with hub locations: node_aftermath_hub (the sit-down ABSENT recovery node) is itself loc_club, so entering it at time>=24:00 with event_sitdown not yet completed will force-route the player INTO node_sitdown_present, making the absent branch nearly unreachable. Same class of issue couples loc_docks nodes to event_sweep.  **-> Fix:** Give node_aftermath_hub a location other than loc_club (e.g. loc_streets or a club-step location), or guarantee event_sitdown is marked completed before any loc_club entry on the no-show path. Re-verify event_sweep similarly so node_docks_approach/node_sink_body entries after 26:30 fire the sweep exactly as intended.
- **[HIGH]** Numeric vars are NOT clamped by the engine (effects.ts increment/decrement have no cap), and node_car_hub<->node_rocco_talk (plus re-enterable detours) form cycles that can pump vars past their stated 0..4/0..5 bounds, inflating the walker state space the tractability plan assumes is small.  **-> Fix:** Implement clamping (guarded effects or engine-level), OR make loop/detour choices fire-once via a visited flag so node_rocco_talk/node_gracie/node_dom_bar and the aftermath<->docks return cannot repeat. Then run the walker and confirm capHit=false.
- **[MEDIUM]** ending_made prose asserts the debt was 'squared' but conditions do not require mob_has_debt_money; ending_walk_away prose asserts the kid 'kept his father's body out of the river' but conditions do not constrain body disposition. Both are EE-4 (ending asserts a flag the path does not guarantee).  **-> Fix:** Either add the missing conditions (mob_has_debt_money to made) or reword the prose to claim only state the path guarantees. walk_away must stop asserting the corpse stayed out of the water.
- **[MEDIUM]** node_backroom c_accident gate ('if you did NOT choose to kill') references a distinction no variable records before node_backroom; mob_killed_petey is false on all entry paths, so the gate is either always-true or unexpressible.  **-> Fix:** If the accident path should be blocked after a violent collection, set a flag in node_collection (e.g. mob_collection_violent) and gate c_accident on its absence; otherwise document that accident vs murder is purely player-elective and leave c_accident unconditional.
- **[LOW]** Node title literal '02:30 — The Cruiser' / event id semantics embed an absolute clock; while titles are author-facing (not EE-1 prose), they invite hardcoded-time leakage into body text during build.  **-> Fix:** Reword the sweep node title to relative phrasing and ensure its body uses {{time}} only. Confirm all node bodies (not just keystones) avoid clock numerals at build time.

**OR-logic violations:**
- mob_knows_setup acquisition (node_tommy_tell, node_call_tommy c_hear_setup) and ending_made's high-standing requirement: mob_knows_setup can be set by TWO separate routes (early node_tommy_tell gated trust<=1, late node_call_tommy c_hear_setup gated trust<=2) — this is correct AND-only flag-equivalence (two choices set the SAME flag), NOT smuggled OR. No violation here; calling it out as the GOOD pattern. The one thing to verify: the c_take_job opening (increments trust to 2) closes the EARLY route (trust<=1) but the LATE route (trust<=2) stays open, so no reasonable player is railroaded out of knows_setup by a single opening choice. Confirmed safe. -> No fix required; document node_tommy_tell and node_call_tommy.c_hear_setup as the intended flag-equivalent pair for mob_knows_setup so a future editor does not delete one believing it redundant.

**Structural issues:**
- [UNREACHABLE_ENDING / dead flag] ending_pinched + variable mob_body_found -> mob_body_found is declared and is required true by ending_pinched, but NO node effect anywhere sets mob_body_found=true (it appears only in the variable decl and in ending conditions). ending_pinched is therefore UNREACHABLE — the walker will list it in orphanEndings, and the 'body found' fail-state it represents can never occur. Add an effect that sets mob_body_found=true on the failure paths: e.g. on the deadline-miss/loose-ends path and on a 'left in the open' branch, and most importantly wire ending_loose_ends and ending_pinched to a shared body-found mechanic. Either set mob_body_found=true wherever the body is not sunk by 28:00, or drop ending_pinched's dependency on it. Without this the Pinched ending is dead content.
- [UNEXPRESSIBLE/INEFFECTIVE CONDITION] node_backroom choice c_accident -> Condition is described as 'if you did NOT choose to kill (took_half or got_physical path)' but there is NO variable recording which collection choice (c_take_half/c_get_physical/c_unleash_rocco) was taken — mob_killed_petey is only set INSIDE node_backroom by c_finish_it, so at node_backroom entry it is still false on every path. If implemented as 'mob_killed_petey is_false' the gate is always-true and c_accident is always available (including after no relevant signal), and c_finish_it (unconditional) is also always available, so the accident/murder distinction is purely player-elective with no state gating — acceptable narratively but means killed_petey is set ONLY by explicit choice. Confirm that's intended; if the accident path is meant to be unavailable after an aggressive collection, add a flag in node_collection (e.g. set mob_collection_violent=true) and gate c_accident on its absence.
- [DEAD CHOICE (statically locked) RISK] node_tommy_brief choice c_press_tommy_setup (cond mob_tommy_trust <= 1) and node_backroom c_heart_attack (cond mob_heat <= 1) -> mob_tommy_trust default is 1, but the only path into node_tommy_brief comes from node_club_start where BOTH choices either increment trust (c_take_job) or are neutral (c_ask_why_me). c_take_job pushes trust to 2, so a player who took the job clean can NEVER satisfy mob_tommy_trust<=1 and loses access to the early setup-reveal route; the c_ask_why_me path keeps trust=1 so it is reachable. This is intended as a price, but it means the early knows_setup route is gated behind one specific opening choice — verify the LATE setup reveal (node_call_tommy c_hear_setup, gated mob_tommy_trust<=2) is the flag-equivalent safety so a reasonable player is never permanently locked out of mob_knows_setup. It appears to be (trust<=2 is broad). Document this as the intended flag-equivalence pair.
- [MISSING DESTINATION COVERAGE] node_to_club references node_sitdown_present and node_aftermath_hub; node_sweep_present references node_sink_body -> All choice.destination ids in the outline resolve to declared nodes (no BROKEN_LINK), and no choice.destination is an ending id (no CHOICE_TARGETS_ENDING) — verified across all 24 nodes. node_resolve is the sole resolvesEnding node and has zero choices, which is legal (resolvesEnding exempts NO_EXIT). Good. One watch item: node_sweep_present is an event ifPresentNode and is excluded from the linter's UNREACHABLE warning via presentNodes, so even though no choice points to it, it will not error — confirmed correct.
- [BOUNDS NOT ENGINE-ENFORCED] all numeric vars; every 'increment X (capped 4)' effect -> The engine effects.ts increment/decrement do NOT clamp — there is no Math.min/Math.max/cap anywhere in the engine. The design's '(capped 4)' / '(capped 5)' parentheticals are author intent only. Because node_car_hub<->node_rocco_talk forms a CYCLE that the player can traverse repeatedly (c_bond_rocco -> node_rocco_talk -> c_rocco_loyal/c_rocco_cold -> back to node_car_hub), mob_rocco_bond can be driven above 4 or below 0, and family_standing/dom_heat can exceed their stated ranges via repeated detours. The walker keys on the raw var value, so unclamped vars multiply distinct states. Builder MUST either (a) implement clamping outside the core effect (e.g. entry effects that re-cap, or a guard), or (b) gate the loop so each loop-bearing choice can fire at most once (add a visited/flag gate), or accept a larger but still-bounded state space. Without one of these the 0..4/0..5 bounds the tractability analysis relies on are not real.

**Prose-vs-state flags (EE-4):**
- `ending_made`: Prose asserts 'the debt squared' / 'debt squared' but ending_made's conditions do NOT require mob_has_debt_money. A player can reach Made via the c_get_physical or c_unleash_rocco collection (which never set mob_has_debt_money=true) and still satisfy standing/trust/sunk/sit-down/dom_heat. EE-4 violation risk: do not assert the debt was collected. The voice bible itself flags this ('DON'T say the debt was collected in Made'). Either soften the prose to not claim the money, or add mob_has_debt_money is_true to ending_made conditions.
- `ending_pinched`: Prose: 'you put it there with your own two hands ... the deliberate weight of it' and conditions DO require mob_killed_petey is_true — consistent. But it also implies the body was FOUND by police, which requires mob_body_found=true; since nothing sets that flag (see structural issue), this ending is unreachable, so the prose can never display. Fixing the flag-set issue resolves the prose-vs-state alignment too.
- `ending_loose_ends`: Prose: 'Half in the water or wrapped in a tarp or laid out where you ran out of road' correctly hedges the body's disposition, asserting only that it is NOT gone — matches conditions (mob_body_sunk is_false AND mob_petey_dead is_true AND time>=28:00). Good EE-4 hygiene; no change needed, just confirming.
- `ending_walk_away`: Prose asserts 'you never closed your hands around a living man on purpose' (matches mob_killed_petey is_false) and 'a kid ... kept his father's body out of the river' — the body-out-of-river claim is NOT guaranteed by conditions (walk_away requires protected_kid + gracie=out + not-killed + on-time, but says nothing about body disposition; the player could have sunk Petey in the river, contradicting 'kept his father's body out of the river'). EE-4 risk. Reword to not assert the body's location, or add a condition. protected_kid is about Danny, not the corpse — the prose conflates the two.

**Scheduled-event integrity:**
- `event_sitdown`: present/absent/recovery ok = False -- STRUCTURE is contract-complete (trigger time_after 24:00, eventLocation loc_club, ifPresentNode node_sitdown_present, ifAbsentEffects with state+add_clue, recoveryNodeId node_aftermath_hub which is navigably reachable) so EVENT_* linter checks pass. But the FIRING MECHANIC is fragile against the real engine. checkScheduledEvents routes to ifPresentNode ONLY if state.location===eventLocation (loc_club) at the moment a node is entered with time>=24:00. The intended present path enters node_sitdown_present via node_to_club c_enter_sitdown which already routes there directly AND sets location loc_club — but that means the SCHEDULED EVENT itself never needs to fire to reach the present scene, and worse: if the player is at loc_club after 24:00 for ANY other reason (e.g. arriving via node_aftermath_hub which is location loc_club), the event will fire and FORCE-ROUTE them into node_sitdown_present even when the author intended the aftermath/absent branch. node_aftermath_hub is loc_club and is the recovery (absent) node — so a player who legitimately missed the table, entering node_aftermath_hub at time>=24:00 with event not yet completed, gets yanked into node_sitdown_present by the engine. The absent branch is therefore hard to actually reach. Decouple: give node_aftermath_hub a non-club location, or ensure the event is marked completed before any loc_club entry on the absent path.
- `event_sweep`: present/absent/recovery ok = False -- ifAbsentEffects increments mob_heat and adds clue_patrol_log; recoveryNodeId node_lockup is reachable; structurally the EVENT_* checks pass. But same present/absent fragility plus a worse routing problem: ifPresentNode node_sweep_present is entered only if state.location===loc_docks at a node-entry with time>=26:30. node_sweep_present's own choices route to node_sink_body. Yet the normal docks flow (node_docks_approach -> node_sink_body) ALSO reaches node_sink_body directly. If the player is on the docks after 26:30, every node entry at loc_docks (docks_approach, sink_body) re-checks and the event fires once, force-routing to node_sweep_present — acceptable. The real risk: clue_patrol_log is produced ONLY by the ABSENT branch of this event. node_lockup choice c_sallie_intel is gated 'if clue clue_patrol_log present' and node_docks_approach abort path also implicitly relies on hot-docks knowledge. So the quicklime SAFE route surfaced by the patrol clue is reachable only if the player was ABSENT from the docks at 26:30 — a reasonable player who went to the docks early and sank before 26:30 never gets the clue, which is fine, but verify clue_patrol_log being absent never dead-ends c_sallie_intel as the ONLY exit (it is not the only exit at node_lockup, so no softlock).

**Designers own stated risks:**
- Body-state machine must stay linear: ensure no path can set mob_body_sunk and mob_body_found both true; gate sinking behind a 'have body + before 28:00 + pier not maxed-hot' condition and finding behind absence of sinking. Verify the walker can't reach (sunk=true, found=true).
- Ending overlap: 'ending_pinched' (heat>=4, body_found) and 'ending_loose_ends' (time>=28:00, not sunk) can co-occur — priority 40 vs 50 resolves to pinched first, which is intended (a found body with max heat is the pinch). Confirm linter's contradicts() won't flag a hole; they're priority-disambiguated, not mutually exclusive, so distinct priorities are mandatory (already set).
- 'ending_made' requires body_sunk AND on-time AND high standing simultaneously — confirm at least one efficient path satisfies all four without exceeding 480 min (the scripted decisive run: Club->collection (accident, not murder)->lock-up prep->sit-down->docks sink lands ~435).
- Clock-bite: longest DFS path (with both major detours + full conversations) must exceed 480 so CLOCK_CANNOT_BITE doesn't fire; dawdle budget 585 confirms. Shortest path must be <=480 so DEADLINE_UNWINNABLE doesn't fire (435 confirms).
- mob_family_standing default 2 with a 0..5 bound: ensure scenes can push it to >=4 for 'made' AND down to <=1 for 'clipped' within one playthrough's worth of swings (collection success +1, sit-down performance +/-2, Dom's testimony -1).
- gracie_choice='out' path must remain time-affordable: the Gracie apartment loop is a major +50-70 detour, so taking it AND still making a clean exit before 28:00 must be reachable — but it should cost the family endings, which it naturally does by eating the sit-down.

---

# The Sump Line -- Underground Survival

**NEEDS REWORK** -- 6 blockers -- 25 nodes -- 6 endings

> A routine club caving trip turns lethal when a flood pulse rips through Whitethroat Cavern; with one injured companion, a dying lamp, and a sump that will seal the only known exit, you have one cold afternoon to climb back to daylight before the mountain decides for you.

- **Genre:** Survival horror / environmental thriller (Oregon-Trail-meets-Zork dread)
- **Setting:** Whitethroat Cavern, a limestone system in a remote upland karst region. A sudden surface storm is forcing water underground. The cave is the antagonist: rock, rising water, cold, and dark. No human villain.
- **Protagonist:** You are the most experienced of a three-person sport-caving party from the Greywater Speleological Club: yourself, Mara (steady, injured ankle), and Devlin (younger, prone to panic and fatal shortcuts).
- **Tone:** Claustrophobic, cold, procedural dread. Quiet competence against indifferent geology. Hope is a lamp running down.
- **Core tension:** Climb out before the rising sump permanently floods the only rigged exit, while managing a finite lamp, your own body heat, and two companions whose trust and morale decide whether they follow your route or bolt down a deadly one.
- **The clock:** startTime 13:00, deadline 17:30 (the deadline is the FINAL sump seal at the Wet Crawl — once the flood pulse peaks the exit is underwater for good; absolute window 270 minutes). Two physical scheduled world-moves fire on the clock whether or not you are present: the Wet Crawl sumps shut at 16:20, and an aftershock collapses the Boulder Choke shortcut at 14:40. The clock is mortal and physical — every metre of cave costs minutes you do not have.

### Expansion hooks (for later folding into one world)
- Greywater Speleological Club — the caving club whose logbook, rigging, and rescue callout protocol recur; the surface rescue team (Cave Rescue Organisation) that could become a connected actor
- Whitethroat Cavern / the Karran Fell karst region — a named system and upland region that other chapters can map onto (a flooded mine, a deeper unexplored sump beyond the Master Cave)
- Devlin Roe and Mara Okonjo — named companions who survive (or don't) and could recur as club members in later region chapters
- Callum Greaves — the absent club secretary who rigged the original exit and logged the storm warning that was ignored; an offstage character the region can reuse

### Variables

| Variable | Type | Default | Bound | Purpose |
|---|---|---|---|---|
| `cave_lamp_charge` | number | 4 | 0..4 | Remaining headlamp burn, bounded 0-4; at 0 you are in total dark and route choices that need sight are blocked |
| `cave_body_heat` | number | 4 | 0..4 | Your core warmth, bounded 0-4; cold water and wet waiting drain it, fire/exertion restore it; at 0 hypothermia decides the ending |
| `cave_devlin_morale` | number | 2 | 0..4 | Devlin's morale/trust in your leadership; high lets you talk him off the fatal Boulder Choke shortcut, low and he bolts |
| `cave_mara_trust` | number | 2 | 0..4 | Mara's trust that you will not abandon her injured ankle; gates whether she shares rigging knowledge and keeps pace |
| `cave_has_rope` | boolean | false |  | You recovered the spare rope from the tackle bag, required to safely re-rig the Forty-Foot Pitch |
| `cave_pitch_rigged` | boolean | false |  | The Forty-Foot Pitch is safely rigged for the climb out |
| `cave_knows_sump_rising` | boolean | false |  | You have hard evidence the Wet Crawl sump is filling fast (foam line, draught reversal) and will seal — drives urgency and unlocks the dry bypass clue |
| `cave_found_bypass` | boolean | false |  | You located the higher, dry Aven bypass that beats the sump entirely — the clean route out |
| `cave_devlin_status` | string | with_you | with_you | bolted | lost | safe | Where Devlin physically is: with the party, bolted down a bad route, dead in the cave, or out safe |
| `cave_mara_status` | string | with_you | with_you | left_behind | lost | safe | Where Mara physically is: with the party, left behind injured, dead in the cave, or out safe |
| `cave_fire_built` | boolean | false |  | You built a carbide/tinder warming fire at the Streamway camp, a one-time body_heat restore |
| `cave_injured` | boolean | false |  | You yourself took a fall/injury that slows you and risks the worst outcomes |
| `cave_reached_surface` | boolean | false |  | Set true only at the shaft-base resolution node when you actually break daylight; distinguishes escape endings from trapped ones |

### Locations
- **The Flooded Sump Chamber** (`loc_sump_chamber`) -- Start. Where the flood pulse hit and the party scattered; lowest point, water already rising
- **The Streamway Camp** (`loc_streamway`) -- Hub. A gravel bank above the water; party regroups, fire can be built, decisions branch
- **The Boulder Choke** (`loc_boulder_choke`) -- The tempting fast shortcut up through unstable breakdown; aftershock collapses it at 14:40
- **The Wet Crawl** (`loc_wet_crawl`) -- Low flat-out passage that the sump floods shut at 16:20; the original rigged exit route
- **The High Aven** (`loc_aven`) -- A dry vertical bypass discovered above the streamway; beats the sump entirely if found
- **The Forty-Foot Pitch** (`loc_pitch`) -- Hub. The big vertical climb both exit routes funnel into; must be re-rigged with rope
- **The Master Cave Junction** (`loc_master_cave`) -- Hub. High-level passage above the pitch where all routes converge for the final push
- **The Entrance Series** (`loc_entrance_series`) -- The final cold crawl and shaft base; resolution location where daylight is or isn't reached

### Scheduled events
- **Aftershock at the Boulder Choke** (`event_choke_collapse`) @ 14:40 at `loc_boulder_choke`
    - World-move: An aftershock drops the breakdown roof of the Boulder Choke shortcut, sealing it forever and sending a muddy surge down the streamway. Anyone inside the choke is caught.
    - If present -> `node_choke_collapse_present`
    - If absent -> set cave_knows_sump_rising true (the shock you feel through the rock and the surge of muddy water down the streamway tells you the cave is moving and the water is winning); add_clue 'choke_gone' so a later node reveals the shortcut is sealed
    - Recovery node -> `node_streamway_after_shock`
- **The Wet Crawl Sumps Shut** (`event_sump_seals`) @ 16:20 at `loc_wet_crawl`
    - World-move: The flood pulse peaks; water fills the Wet Crawl to the roof and the original rigged exit is underwater for good. The only way out is now the high route over the pitch.
    - If present -> `node_wet_crawl_sealing_present`
    - If absent -> set cave_knows_sump_rising true; add_clue 'sump_sealed' (the draught dies and a slick of foam marks the new waterline) so the recovery node reveals the original exit is gone and forces the Aven/pitch high route
    - Recovery node -> `node_master_cave`

### Endings
- **Daylight, All Three** -- In time, warm enough, both companions led out alive via the dry bypass — the clean escape.
    - Conditions: You reached the surface in time, found the dry Aven bypass, and both companions are out safe — the textbook self-rescue.
- **Out, But Not Whole** -- You reached the surface in time, but the cave kept one of the party; a survivor's escape paid for in a body left below.
    - Conditions: You broke daylight before the deadline but it cost you — one companion is dead or lost in the cave even though you yourself got out.
- **The Long Cold Wait** -- Alive but trapped above the sealed sump, cold and waiting on the club's overdue callout — survival reduced to endurance.
    - Conditions: You got everyone living to the high ground above the flood but ran out of clock and warmth before the surface — alive, huddled, waiting on a rescue that may or may not come, hypothermia closing in.
- **The Cave Keeps You** -- A death in the dark and no daylight; the mountain wins outright.
    - Conditions: The cave killed someone and you did not get out — the worst case, whether you bolted the bad shortcut, let the cold take you, or were caught when the sump sealed.
- **Behind the Sump** -- Sealed behind the risen sump in total dark, alone — the cave's slowest verdict.
    - Conditions: You missed the exit window and are sealed below the flood with no warmth left and no living companion to share it — entombed, lamp guttering.
- **A Grey Way Out** _(default catch-all)_ -- You got out, or nearly did, in none of the night's clean shapes — a muddled, grey survival the cave shrugs off.
    - Conditions: None of the sharp shapes resolved — you came up out of the entrance series into thin daylight having muddled it, neither triumph nor catastrophe.

### Clock budget
- Window: **270 min** -- efficient path ~245 -- dawdle ~360
- Costs: Streamway regroup +20; talk a companion down (full conversation) +20; build fire +25; recover rope detour +30; scout/find Aven bypass +35; re-rig the Forty-Foot Pitch +30; cross a major passage +30 to +40; Wet Crawl low route +40; total dark fumbling penalty +15. Efficient decisive run (skip fire, grab rope on the way, find bypass once, rig once, climb): ~245 min, ~9% under the 270 window. One major detour (build fire OR a second scout) still lands ~270-285, tight but possible if other choices are lean. Two detours, or any dawdling/backtracking, pushes 300-360 and misses the 17:30 sump seal.
- Walker plan: **exhaustive** -- hubs: `node_streamway`, `node_pitch_base`, `node_master_cave`, `node_entrance_series`

### Node outline

**`node_sump_chamber`** -- After the Pulse _(scene @ loc_sump_chamber)_
  Cold open in the flooded chamber moments after the flood pulse scattered the party; establish stakes, lamp, cold, missing companions.
    - "Shout for Mara and Devlin and listen for an answer over the water." -> `node_find_party` [+10m] _(if always)_ => add_minutes 10; decrement cave_body_heat (standing in the flood)
    - "Wade to the half-sunk tackle bag and salvage what you can first." -> `node_tackle_bag` [+15m] _(if always)_ => add_minutes 15; decrement cave_body_heat

**`node_tackle_bag`** -- The Half-Sunk Tackle Bag _(discovery @ loc_sump_chamber)_
  Optional early resource: recover the spare rope (sets has_rope) at a body-heat cost; flag-equivalent rope source also exists later so this isn't the only path.
    - "Sling the spare rope and push on to find the others." -> `node_find_party` [+10m] _(if always)_ => set cave_has_rope true; add_minutes 10; decrement cave_body_heat
    - "Too heavy and too cold — leave it and go find the others." -> `node_find_party` [+5m] _(if always)_ => add_minutes 5

**`node_find_party`** -- Two Voices in the Dark _(conversation @ loc_sump_chamber)_
  Reunite with Mara (injured ankle) and Devlin (panicking); funnel toward the streamway hub; establish companion vars in play.
    - "Steady Devlin first — get him breathing before he does something stupid." -> `node_streamway` [+15m] _(if always)_ => increment cave_devlin_morale; add_minutes 15
    - "Get under Mara's arm and take her weight toward higher ground." -> `node_streamway` [+15m] _(if always)_ => increment cave_mara_trust; add_minutes 15
    - "No time for nerves — order both up the streamway now, hard." -> `node_streamway` [+10m] _(if always)_ => decrement cave_devlin_morale; add_minutes 10

**`node_streamway`** -- The Streamway Camp _(scene @ loc_streamway)_
  PRIMARY HUB. Gravel bank above the water where the party regroups and the main route decision branches (fire, scout Aven, head for choke/wet crawl, recover rope if missed).
    - "Build a quick carbide-and-tinder fire to drive the cold back before the climb." -> `node_fire` [+25m] _(if only if cave_fire_built is false)_ => add_minutes 25
    - "Scout the high, dry Aven you half-remember above the bank." -> `node_aven_scout` [+35m] _(if always)_ => add_minutes 35; decrement cave_lamp_charge
    - "Make for the Boulder Choke shortcut — fastest line straight up." -> `node_choke_approach` [+20m] _(if always)_ => add_minutes 20
    - "Take the known rigged route through the Wet Crawl toward the pitch." -> `node_wet_crawl_approach` [+30m] _(if always)_ => add_minutes 30
    - "Send back for the rope in the tackle bag before committing to any climb." -> `node_rope_recover` [+30m] _(if only if cave_has_rope is false)_ => add_minutes 30; decrement cave_body_heat

**`node_fire`** -- A Small Hard Flame _(discovery @ loc_streamway)_
  One-time warming: restores body_heat (capped at 4) and lifts companion morale slightly, at a real time cost; sets fire_built so it can't be farmed.
    - "Warm enough. Back to choosing a way out." -> `node_streamway` [+5m] _(if always)_ => set cave_fire_built true; increment cave_body_heat (capped at 4); increment cave_devlin_morale; add_minutes 5

**`node_rope_recover`** -- Back for the Rope _(discovery @ loc_sump_chamber)_
  Flag-equivalent rope source for players who skipped the tackle bag — sets has_rope so the good exit isn't gated behind one fragile early choice (Rule 3).
    - "Rope slung — back to the streamway and the climb." -> `node_streamway` [+10m] _(if always)_ => set cave_has_rope true; add_minutes 10; decrement cave_body_heat

**`node_aven_scout`** -- The High Aven _(discovery @ loc_aven)_
  Discovery of the dry bypass; sets found_bypass and knows_sump_rising (you see the foam line from up high). The clean-route enabler.
    - "This goes. Bring the others up the dry bypass toward the pitch." -> `node_bypass_lead` [+20m] _(if always)_ => set cave_found_bypass true; set cave_knows_sump_rising true; add_minutes 20
    - "Mark it and drop back to the streamway to gather the party." -> `node_streamway` [+15m] _(if always)_ => set cave_found_bypass true; set cave_knows_sump_rising true; add_minutes 15

**`node_bypass_lead`** -- Leading the Dry Way _(conversation @ loc_aven)_
  Companion-management gate on the good route: high morale/trust brings both companions up the dry bypass cleanly toward the pitch hub.
    - "Keep them together and push for the Forty-Foot Pitch." -> `node_pitch_base` [+30m] _(if always)_ => add_minutes 30
    - "Devlin balks at the exposure — stop and talk him up the dry route." -> `node_devlin_talkdown` [+20m] _(if only if cave_devlin_morale lt 2)_ => add_minutes 20

**`node_choke_approach`** -- At the Boulder Choke _(scene @ loc_boulder_choke)_
  The tempting fast-but-fatal shortcut; before 14:40 it's passable-looking; this is where Devlin wants to bolt. Branches to talkdown or commit.
    - "Devlin lunges for the gap — grab him or let him go." -> `node_devlin_talkdown` [+10m] _(if always)_ => add_minutes 10
    - "Risk the choke yourself — it's the fastest line up." -> `node_choke_climb` [+25m] _(if always)_ => add_minutes 25
    - "Too unstable. Pull everyone back to the streamway." -> `node_streamway` [+15m] _(if always)_ => add_minutes 15

**`node_devlin_talkdown`** -- Talking Devlin Off the Choke _(conversation @ loc_boulder_choke)_
  Key relationship gate: high devlin_morale lets you talk him out of the fatal shortcut (keeps him with_you); low morale and he bolts (status->bolted) toward the choke and the 14:40 collapse.
    - "Hold his eyes and bring him back from the edge." -> `node_streamway` [+20m] _(if only if cave_devlin_morale gte 3)_ => increment cave_mara_trust; add_minutes 20
    - "Physically haul him back — risky, may hurt you both." -> `node_streamway` [+15m] _(if only if cave_devlin_morale equals 2)_ => decrement cave_body_heat; add_minutes 15
    - "He tears free and vanishes into the choke before you can stop him." -> `node_devlin_bolted` [+10m] _(if only if cave_devlin_morale lt 2)_ => set cave_devlin_status bolted; add_minutes 10

**`node_devlin_bolted`** -- Gone Into the Stone _(event @ loc_boulder_choke)_
  Consequence node when Devlin bolts; you must choose to chase (deadly, into the choke before/after collapse) or continue and carry the loss. Funnels back to streamway.
    - "Go in after him before the choke shifts." -> `node_choke_climb` [+15m] _(if always)_ => add_minutes 15; decrement cave_body_heat
    - "You can't follow him in there. Take Mara and go." -> `node_streamway` [+10m] _(if always)_ => decrement cave_mara_trust; add_minutes 10

**`node_choke_climb`** -- Inside the Choke _(scene @ loc_boulder_choke)_
  High-risk traverse of the unstable shortcut; outcome depends on timing vs the 14:40 aftershock and on injury. Before the shock it can succeed to the pitch; presence at collapse routes to the present-node.
    - "Push hard for the top of the choke and the pitch beyond." -> `node_pitch_base` [+30m] _(if only if time_before 14:40)_ => add_minutes 30
    - "Press on as the rock begins to move." -> `node_choke_collapse_present` [+10m] _(if only if time_after 14:40)_ => add_minutes 10
    - "Lose your nerve and scramble back down to the streamway." -> `node_streamway` [+20m] _(if always)_ => add_minutes 20; decrement cave_body_heat

**`node_choke_collapse_present`** -- The Roof Comes Down _(event @ loc_boulder_choke)_
  Scheduled-event ifPresentNode for the 14:40 aftershock: witnessed catastrophe inside the choke; injures you (set injured) and if Devlin bolted in he is lost (status->lost); survivors crawl out to the after-shock recovery.
    - "Claw back out of the collapsing breakdown to the streamway, bruised and bleeding." -> `node_streamway_after_shock` [+15m] _(if always)_ => set cave_injured true; if cave_devlin_status equals bolted set lost; decrement cave_body_heat; add_minutes 15

**`node_streamway_after_shock`** -- After the Shock _(scene @ loc_streamway)_
  Recovery node for the aftershock event (recoveryNodeId). An absent player arrives to find the choke sealed and a muddy surge; reveals choke_gone clue and that the only ways are Aven/Wet Crawl. Funnels to streamway routes minus the choke.
    - "The Aven is the dry way now — scout it if you haven't." -> `node_aven_scout` [+10m] _(if only if cave_found_bypass is false)_ => add_minutes 10
    - "Lead the party up the bypass you already found." -> `node_bypass_lead` [+10m] _(if only if cave_found_bypass is true)_ => add_minutes 10
    - "No time to scout — gamble on the Wet Crawl before it sumps." -> `node_wet_crawl_approach` [+20m] _(if always)_ => add_minutes 20

**`node_wet_crawl_approach`** -- The Mouth of the Wet Crawl _(scene @ loc_wet_crawl)_
  Approach to the original rigged exit; sets up the race against the 16:20 sump. Branch: commit to the low crawl (fast, cold, risky vs sump time) or divert to the Aven if time allows.
    - "Go now, flat out through the cold water before it closes." -> `node_wet_crawl_traverse` [+40m] _(if only if time_before 16:20)_ => add_minutes 40; decrement cave_body_heat; decrement cave_lamp_charge
    - "Reach the crawl as the airspace vanishes." -> `node_wet_crawl_sealing_present` [+10m] _(if only if time_after 16:20)_ => add_minutes 10
    - "Don't trust the water — break for the dry Aven instead." -> `node_aven_scout` [+25m] _(if only if cave_found_bypass is false)_ => add_minutes 25

**`node_wet_crawl_traverse`** -- Flat Out in the Cold _(scene @ loc_wet_crawl)_
  The wet crawl traverse itself; heavy body_heat/lamp cost; survival depends on body_heat staying above 0. Funnels to the pitch base.
    - "Drag yourself up out of the water toward the pitch." -> `node_pitch_base` [+15m] _(if always)_ => add_minutes 15; decrement cave_body_heat

**`node_wet_crawl_sealing_present`** -- The Sump Shuts _(event @ loc_wet_crawl)_
  Scheduled-event ifPresentNode for the 16:20 sump seal: you watch the airspace close; forced to retreat to the high route (sets knows_sump_rising) and routes to the master cave hub. Missing the low exit OPENS the high path, never dead-ends.
    - "Turn back and climb for the high route over the pitch — the only way left." -> `node_master_cave` [+25m] _(if always)_ => set cave_knows_sump_rising true; add_minutes 25; decrement cave_body_heat

**`node_pitch_base`** -- The Foot of the Forty-Foot Pitch _(scene @ loc_pitch)_
  SECONDARY HUB. All exit routes funnel to the base of the big climb; gate on rope/rigging. Branch: rig with rope, rig from Mara's knowledge, or free-climb risky.
    - "Rig the spare rope to the bolts and make it a safe climb." -> `node_pitch_rigged` [+30m] _(if only if cave_has_rope is true)_ => set cave_pitch_rigged true; add_minutes 30
    - "Ask Mara how she rigged it on the way in — work it from memory." -> `node_pitch_rigged` [+35m] _(if only if cave_mara_trust gte 3)_ => set cave_pitch_rigged true; increment cave_mara_trust; add_minutes 35
    - "No rope, no time — free-climb the pitch and hope." -> `node_free_climb` [+20m] _(if always)_ => add_minutes 20; decrement cave_body_heat

**`node_pitch_rigged`** -- Up the Rigged Pitch _(scene @ loc_pitch)_
  Safe ascent once rigged; brings companions up cleanly; funnels to master cave hub.
    - "Coil the rope and push on into the Master Cave." -> `node_master_cave` [+25m] _(if always)_ => add_minutes 25

**`node_free_climb`** -- Forty Feet on Bad Holds _(scene @ loc_pitch)_
  Risky unroped ascent; injury and companion danger; cold or weakness can leave a companion behind (status->left_behind). Funnels to master cave.
    - "Get everyone up by main strength and luck." -> `node_master_cave` [+30m] _(if only if cave_body_heat gte 2)_ => increment cave_devlin_morale; add_minutes 30
    - "Mara can't make the climb on that ankle — leave her on a ledge with a promise." -> `node_master_cave` [+20m] _(if always)_ => set cave_mara_status left_behind; decrement cave_mara_trust; add_minutes 20

**`node_master_cave`** -- The Master Cave Junction _(scene @ loc_master_cave)_
  THIRD HUB + sump-event recoveryNodeId. High dry passage where all routes converge; absent players who missed the 16:20 sump arrive here to learn (sump_sealed clue) the low exit is gone. Final route choice toward the entrance.
    - "Make the final push for the entrance series and the shaft." -> `node_entrance_series` [+30m] _(if always)_ => add_minutes 30
    - "Stop to wring out and rewarm before the last cold crawl." -> `node_master_rest` [+25m] _(if only if cave_body_heat lte 1)_ => add_minutes 25
    - "Go back down for Mara if you left her — you can't leave it." -> `node_entrance_series` [+40m] _(if only if cave_mara_status equals left_behind)_ => set cave_mara_status with_you; increment cave_mara_trust; add_minutes 40

**`node_master_rest`** -- A Last Warming _(discovery @ loc_master_cave)_
  Optional late warmth top-up for cold parties at a steep time cost (pushes toward pyrrhic if overspent); restores body_heat once. Funnels to entrance.
    - "Better. Now the entrance series, fast." -> `node_entrance_series` [+30m] _(if always)_ => increment cave_body_heat (capped at 4); add_minutes 30

**`node_entrance_series`** -- The Entrance Series _(scene @ loc_entrance_series)_
  FINAL HUB before resolution; the last cold crawl and the shaft base; resolves status of companions and reaching surface. Branch into the resolution node.
    - "Crawl the last metres and climb the shaft toward the light." -> `node_shaft_base` [+20m] _(if always)_ => add_minutes 20; decrement cave_lamp_charge
    - "Make sure Devlin's right behind you before you commit to the shaft." -> `node_shaft_base` [+15m] _(if only if cave_devlin_status equals with_you)_ => set cave_devlin_status safe; add_minutes 15
    - "Get Mara's weight onto the ladder first; she goes up ahead of you." -> `node_shaft_base` [+15m] _(if only if cave_mara_status equals with_you)_ => set cave_mara_status safe; add_minutes 15

**`node_shaft_base`** -- The Foot of the Shaft _(scene @ loc_entrance_series)_
  Penultimate funnel: resolves remaining companion statuses to safe (if still with_you) and sets reached_surface, then routes to the single resolving node. Ensures status enums close out before the resolver reads them.
    - "Send the others up and climb out into the rain and the light." -> `node_surface` [+15m] _(if always)_ => set cave_reached_surface true; if cave_devlin_status equals with_you set safe; if cave_mara_status equals with_you set safe; add_minutes 15
    - "You're out of warmth and the ladder swims — sit down at the foot of the shaft." -> `node_surface` [+20m] _(if only if cave_body_heat lte 0)_ => add_minutes 20

**`node_surface`** -- The Mouth of Whitethroat _(transition @ loc_entrance_series)_ _[resolvesEnding]_
  SINGLE RESOLUTION NODE (resolvesEnding true). The deadline and accumulated state resolve the ending here; no choices. All paths terminate at this funnel so the resolver runs once over final state.

### Voice bible
- **Register:** Literary survival-horror with a procedural, technical spine. Cold and exact. The diction of someone who knows caves — draught, pitch, choke, sump, rigging, carbide, breakdown, aven, streamway — used without translation, so the reader learns the underworld's grammar by immersion. Sentences carry weight and damp; nothing is decorative for its own sake. The cave is never personified into a creature, but it is granted will through verb choice (the water decides, the rock settles its accounts, the mountain shrugs). Dread is built from competence eroding, not from jump-scares.
- **POV:** Second person singular, present-tense immersion ('you'). The reader IS the most experienced caver. Companions are named and external — Mara, Devlin — addressed and observed, never inhabited. Your own body is reported as sensation and instrument: numb fingers, the cold reaching in past your ribs, the math of minutes you run without being told you are running it.
- **Tense:** Present tense throughout, for the airless immediacy of the descent. The only permitted drift is short reflexive past for things already done or known ('the rigging the flood stripped', 'the way you came in') — kept brief and subordinate so the present-tense floor never lifts.
- **Rhythm:** Long, accreting sentences for movement and dread — clause stacked on clause like the boulders themselves — broken hard by short declaratives at the moments that cost something. A three-or-four-line wash of cold detail, then a single flat sentence that lands like a stone dropped in water. Paragraphs run two to five sentences. The clock is felt as pressure between sentences, never announced as a number.
- **Dialogue:** Sparse, clipped, functional — cavers under load do not make speeches. Mara is economical and dry, gallows-calm even injured: short imperatives, a flat joke when it is worst. Devlin runs hot and fast, half-sentences, the panic audible in repetition ('we go up, we go up now, it's right there'). Your own speech is mostly unquoted — reported as the act ('you tell him to breathe') — and quoted only when the exact words carry the weight. No dialogue tags fancier than 'says'; let the line do the work.
- **Motifs:** Recurring images the builder must reuse for cohesion: (1) the LAMP as hope made physical and finite — 'hope is a lamp running down'; light described as a coin, a cone, a failing thing. (2) DRAUGHT / the cave breathing — moving air means a way through; air dying means a way closing; the cave inhales and exhales. (3) WATER as a rising verdict — the foam line, the waterline creeping up rock, the roar that gets louder behind every choice. (4) COLD as a hand — the cold described as a physical hand reaching in, closing on the heart, taking fingers one at a time. (5) THE MOUNTAIN AS INDIFFERENT JUDGE — never malicious, only vast and unhurried; it 'decides', 'shrugs', 'keeps its own counsel'. (6) NAMES called into dark — the act of shouting two names, Mara and Devlin, recurs as the throughline of responsibility.
- **Dos and donts:** DO use precise caving vocabulary untranslated; let context teach it. DO grant the cave agency through verbs, never through eyes or intent. DO let the clock be felt as pressure and emit {{time}} for any explicit clock reference — NEVER a hardcoded hour. DO keep companion fates exactly as the reaching state sets them: in ending prose, assert ONLY what that path guarantees. DO end scenes on a short, cold sentence. DON'T personify the cave into a monster with malice or eyes. DON'T use ornate metaphor that breaks the procedural chill, or modern-flippant tone, or exclamation. DON'T let an ending name a route, a companion's specific fate, or daylight unless that ending's conditions guarantee it — e.g. 'costly' must not say WHICH companion died or which route; 'lost' must not claim daylight or Mara's fate; 'pyrrhic' and 'trapped' must not claim you reached the surface; 'trapped' is ALONE so never reference a living companion. DON'T announce variables ('your morale is low'); dramatize them. DON'T break second-person present.

### Keystone prose

#### `node_sump_chamber` -- OPENING NODE

The chamber that was dry when you ducked into it is a river now, and the river is climbing your legs.

It came without warning — a deep cough from somewhere up in the system, a pressure in the ears, and then the flood pulse came down out of the dark like a train made of cold, and where there had been a gravel floor and three lamps moving easily there is brown water to your thighs and rising, and the roar of it has eaten every other sound. Your headlamp throws a cone that shudders when you shake. Foam rides the surface in long greasy ropes, the cave's spit, marking how hard the water is running. The draught that should be on your cheek — the cave's breath, the thing that tells a caver which way is out — is gone, drowned under the noise.

You are alone in the cone of your light. The pulse scattered you the way a boot scatters beetles.

You put your back to the cold wall and you call their names into the dark over the water, the only two names that matter down here. Mara. Devlin. The sound goes out and does not come back, or comes back so thinned by the roar you cannot trust it. The water is at the bottom of your ribs now and it has taken the feeling from your legs already, the cold reaching in the way cold does, not from outside but from somewhere it has no right to be.

You check the watch on the inside of your wrist because that is the discipline, because down here the clock is the only honest thing. {{time}}. A whole grey afternoon, on the surface. Down here it is a length of rope, and it is paying out.

The half-sunk tackle bag turns slowly in an eddy a few metres off, snagged on something, the spare rope coil still lashed to its top. Past it, where the streamway lifts toward higher ground, the dark holds the two voices you cannot yet hear.

#### `node_choke_collapse_present` -- SCHEDULED-EVENT WITNESSED SCENE (aftershock at the Boulder Choke, ifPresentNode)

You are inside the choke, threading a black gap between two boulders the size of cars, when the mountain settles its account.

It does not announce itself. There is a sound that is not a sound — a pressure, a thud you feel in the wet of your eyes and the roots of your teeth — and then every stone in the breakdown moves at once. The boulder against your shoulder shifts a hand's width with a grinding that you feel rather than hear, dust comes down in a curtain through your light and turns the cone solid, and from below, where the streamway runs, comes the deep wet roar of a fresh surge of muddy water answering the shock. The gap you came up through is closing. The whole choke is folding like a fist, slowly, with a terrible patience, finding a new way to lie.

There is no decision in it. Your body does the thing your mind has not finished thinking. You jam your boots, you get a hand into the dark, you find cloth or an arm — whoever is within reach — and you haul, and you claw, the rock ticking and settling around you and a corner of it taking the skin off your forearm and a deeper wrench somewhere in your side that you will pay for later, all of you scrabbling for the one gap that is still a gap and not yet a tomb.

Then you are out, on the wrong side, on the streamway side, on your knees in the new mud with your light pointing at nothing and your breath sawing.

Behind you the choke has stopped moving. It sits there, resettled, dense, final, a wall where a way used to be. The faint draught that breathed through it — the cave's own confession that it went somewhere — is gone. Dead air. You count, in the dark, the lights you can still see, and the cold comes in to do its slow arithmetic while you do yours.

#### `node_streamway_after_shock` -- EVENT ABSENT RECOVERY SCENE (aftershock recoveryNodeId; player was NOT at the choke)

You feel the aftershock before you understand it — a deep thud transmitted through the rock under your hands and knees, through the soles of your boots, a single heavy syllable from somewhere in the mass of the mountain that has nothing to do with you and everything to do with where you are.

For a moment nothing changes. Then the streamway changes everything at once. The water that was running brown runs suddenly black with churned mud, the level jumps — you watch the waterline climb the rock a clear hand's breadth in the space of a breath — and a low surge comes down the passage carrying the smell of disturbed stone and broken ground. Somewhere above, something that was holding has stopped holding.

You get the party back onto the gravel bank and you take stock by the cone of your light, and the stock is short.

The draught is the thing that tells you. There was a thread of moving air coming down off the Boulder Choke, faint but real, the cave breathing through that chaos of breakdown — the very thing that made the shortcut look like a shortcut. It is gone now. Dead, flat, still air where there was a breath before. The choke has come down. Whatever way it offered, it has taken back, and anyone who had been inside it would not be standing on this bank.

That way is closed for good, then. The water is higher than it was and climbing, the cold is in all of you now, and the cave has narrowed the question to two answers: the high dry route up and over, if you can find it and rig it, or the low rigged crawl through the water before the water takes that too. You check the watch. {{time}}. Less rope than there was, and the same long way up.

#### `node_surface` -- ENDING: ending_clean — Daylight, All Three (surface reached + bypass found + both companions safe)

You climb the last of the fixed ladder with your arms doing what your legs have stopped being able to do, and the grey coin of daylight at the top of the shaft grows from a coin to a window to the whole streaming, rain-loud world, and then you are out, on your back on wet moorland grass with the rain coming down into your open mouth, and it is the most beautiful cold you have ever felt because it is the cold of the sky and not the cold of the stone.

Mara is already up, sitting against a boulder with her ruined ankle stuck out in front of her and her face turned up into the rain, and she is laughing — a thin, wrung-out caver's laugh, but real. Devlin is on his hands and knees a little way off being sick into the heather, which is the most ordinary and welcome sight in the world, because being sick on the surface is a luxury of the living. All three of you. You led them up and over the dry way, over the top of the flood, while the mountain filled its drowned passages behind you, and the dry way held, and it brought you here.

The sump sealed somewhere below and behind you and it sealed on nothing — on no one. You beat it to the high ground and you beat it to the light. {{time}}, and a storm sky, and the long sodden walk down to the cars and the warmth and the phone call to the club that will not, this time, be the bad call.

Below you the mountain keeps its own counsel, full of black water, indifferent as it always was. You lie in the rain and you let it. It did not get to decide. This once, you decided. You take a long count of the heads around you in the grey light — Mara, Devlin, yourself — and the count comes out whole, and you let your eyes close.

Whitethroat will be there tomorrow. So, this time, will all three of you.

#### `node_surface_costly` -- ENDING: ending_costly — Out, But Not Whole (surface reached in time; one companion dead or lost; route and which-companion NOT guaranteed)

Daylight, in the end, the way it always comes in this place — grey and cold and falling down the shaft like the last of something poured out — and you climb up into it and the rain takes you and you are out. Alive. Out before the cave could close the last door on you.

But you do not climb out whole.

You sit at the mouth of Whitethroat in the wet grass and you make the count that every caver dreads making, the count of who came up the shaft, and the count is short by one. The mountain took its price somewhere down there in the dark and the water and the breakdown, in a passage behind you now, and there was a moment — you will spend a long time finding it again in the small hours — a moment where a different choice might have changed the count. Or might not have. The cave does not show you the other paths. It only keeps what it keeps.

The rain comes down on your face and on the open mouth of the shaft, and from below there is no sound now but water, the patient rising water that does not care what it covered. You are warm enough. You are breathing. You will walk down off the fell and you will make the call to the club, and it will be the bad call, the one with a name in it that does not get to come home.

{{time}}. The light is failing on the moor and the storm has the last word, as it was always going to. You got out. You will carry the rest of it out too, all the way out, for the rest of your life — the weight of the one the cave kept, lighter than a body and heavier than the whole mountain.

#### `node_surface_pyrrhic` -- ENDING: ending_pyrrhic — The Long Cold Wait (past deadline; both companions alive/not lost; body_heat ≤1; trapped above the sealed sump; surface NOT reached)

You do not reach the daylight. The sump sealed below you while you were still climbing for the high ground, the foam line rising to the roof and the draught dying with a long sigh, and now the only honest door out of Whitethroat is underwater for good, and you are above it. All of you. Alive, and above it, and going nowhere.

That is the whole of the mercy and the whole of the cruelty of it. You got them up. You got everyone living to the high dry passage over the flood — no one bolted into the stone, no one was left on a ledge below the water — and you are huddled together now in a place the water cannot reach, three bodies pressed close and sharing what little heat is left between them, which is not much. The cold has taken your fingers one at a time and gone on past them, into the wrists, into the deep core of you where the shivering has begun to slow, and slowing is the bad sign, the sign you have known about for years and hoped never to read from the inside.

The lamp throws what it has left. You ration the light the way you ration the warmth, a little at a time, hope made physical and running down. Someone has to be the one who stays awake and keeps the others awake, and that someone is you, because it was always going to be you.

The club has a callout time. When you do not come out, the call goes to the Cave Rescue Organisation, and good cold people in wet oversuits start the long descent toward where you are. You know this. You hold onto it the way you hold onto the warm bodies beside you. {{time}}, and the watch keeps running, and you wait — for the dive teams, for the pump, for the water to drop, for hands that are not yours — and you count the slow breaths around you in the dark and you make them last.

The mountain is in no hurry. Neither, now, are you. There is nothing left to do down here but endure, and so you endure, and you wait on a rescue that may come in time. May.

#### `node_surface_lost` -- ENDING: ending_lost — The Cave Keeps You (surface NOT reached; Devlin lost; do NOT claim daylight or Mara's fate)

There is no daylight. There is no shaft of grey at the top of anything. There is only the place where it ended, down in the dark, with the water rising and a name that the cave will not give back.

Devlin is gone. Not bolted, not lost in the figurative way cavers mean when they have taken a wrong turn — gone, kept, taken by the stone in the way the mountain takes what it decides to take, fast or slow, your hand a half-second too late or a route too far. His light is not among the lights anymore. You called his name into the dark the way you have called it all afternoon, Devlin, Devlin, and this time the dark simply held it and gave nothing back, the cave breathing its dead flat air, the water coming up indifferent over everything.

You did not get out. The way up closed, or the cold closed it, or the body would not do the last of what was asked of it, and the grey coin of daylight stayed a memory of a thing at the top of a shaft you did not climb. The lamp is burning down. The water is still rising. The mountain that was never angry, only vast, only patient, only entirely without interest in you or the boy or any of it, settles back into being a mountain with black water in its throat.

{{time}}, for whatever the number is worth now. It is the worst arithmetic a caver can be handed — a death in the dark, and no light at the end of it, and the long terrible knowledge that down here the rock keeps the score and the rock always, in the end, collects.

Whitethroat keeps you. It does not gloat. It simply keeps you, the way it has kept others, the way it will keep others again, and the storm goes on raining onto a moor that has no idea you are down here at all.

#### `node_surface_trapped` -- ENDING: ending_trapped — Behind the Sump (past deadline; surface NOT reached; lamp ≤0; ALONE, no living companion)

The sump sealed and you were on the wrong side of it, and now there is no way out of Whitethroat that a living person can take, and you are the only living person here.

The lamp is dead. It did not die all at once — it browned and guttered and shrank, the cone pulling in from the walls to a smear to a coal to a memory of light, and you watched it go the way you watch the last of anything go, with a kind of detached attention, and then it was gone and the dark came in and sat on you with a weight that has no bottom. This is the true dark, the dark that has never seen a sun, and you understand now that you never really saw it before, never once in all the years, because you always had a light. Now you do not. Now there is only the texture of cold rock under your hands and the sound of the water, which is everywhere, which is rising, which is the only clock you have left.

There is no one to share the warmth with. You called the names earlier, all afternoon, two names into the dark — and the dark is empty of them now, one way or another, and you are alone with the stone and the cold and the slow gutter of your own breathing. Alone behind the risen sump.

{{time}}, if the watch is even still going, if you could even read it. It does not matter. The numbers belonged to the world where time bought you something. Down here, on this side of the sealed water, time is just the rate at which the cold finishes what it started, and it is patient, and it is thorough, and it is in no rush at all.

This is the mountain's slowest verdict, and it has all the time there is. You set your back to the rock, and you wait in the absolute dark for the cave to be done deciding, which it has, really, already done.

#### `node_surface_default` -- ENDING: ending_default — A Grey Way Out (no sharp ending resolved; muddled survival; stay vague, came up into thin daylight)

It does not end in any of the clean shapes the afternoon seemed to promise. There is no triumph and there is no catastrophe; there is only the entrance series, the mean low crawl of it, and then the thin grey daylight at the top of the shaft, weaker than you remember it, and you come up into it muddied and battered and breathing, having muddled the whole long descent into something that is neither a win nor a wreck.

You are out. More or less. Mostly. The cave behind you fills with its black water at its own indifferent pace, the sump doing what sumps do, the cold sitting in your bones like a tenant who has not quite decided to leave, and you stand at the mouth of Whitethroat in the failing light and you cannot quite say whether you beat the mountain or only failed to lose to it outright.

The storm is easing to a drizzle. The moor stretches away grey and sodden in every direction, caring nothing. {{time}}, and the afternoon nearly spent, and the long walk down still to come.

The mountain shrugs. That is the whole of its response to you — a shrug, a thing too vast and too old to be impressed by your getting out or to be much troubled if you hadn't. You shoulder what you can carry and you turn your back on the black slot in the hillside, and you go down off the fell into the rain, a grey survivor of a grey day, carrying out with you the particular knowledge that the cave keeps no record of the muddled ones at all. It only remembers the clean shapes. You were not one of them. You will take it.

### Engine-constraint audit

**Verdict: NEEDS REWORK.** Narratively this is the strongest chapter in the set and the SKELETON is engine-clean: no broken links, no NO_EXIT (node_surface resolvesEnding with zero choices is valid), no softlocks (every gated hub keeps an always-available exit), clock bites (longest 395>270) and is winnable (efficient 245<270), single default ending, all time literals in range. But it is NOT buildable as-is because it leans on three things the real engine does not provide: (1) conditional effects ('if X set Y') — unrepresentable, and they are load-bearing for companion status; (2) location changes — never emitted, so scheduled-event presence can never fire and the choke recovery clue is stranded; (3) engine-level var capping and a single-resolution-node assumption — both false (deadline resolves on any node at >=17:30). These cascade into four EE-4 prose-vs-state lies (costly, pyrrhic, default, plus an orphaned lost ending). Fixes are mechanical, not conceptual: convert conditional effects to branching/condition-gated choices, add change_location entry effects, introduce two latching booleans (cave_someone_lost, cave_all_together) to make costly/pyrrhic honest, add cap-guards on increments, and reconcile ending_default prose with deadline timeouts. After those, re-run lint + the state-space walker and confirm no orphanEndings and no overlap surprises.

- Clock check: OK -- Clock is healthy and fair against the REAL linter (src/engine/linter.ts). Window = 270 min (13:00->17:30). Longest acyclic path over the outline = 395 min > 270, so CLOCK_CANNOT_BITE will NOT fire. Efficient decisive run (tackle 15 / rope 10 / steady 15 / scout+take bypass 35+20 / lead 30 / rig 30 / to master 25 / push 30 / to shaft 20 / climb 15) = 245 min, ~9% under window, so DEADLINE_UNWINNABLE will NOT fire. Event literals 14:40 (+100m) and 16:20 (+200m) sit inside [13:00,17:30] so no TIME_LITERAL_OUT_OF_RANGE. EE-1 clean: every node body and keystone uses the {{time}} token, no hardcoded hour anywhere, deadline does not cross midnight. The clock danger is NOT the linter but the engine's deadline-forced resolution firing on ANY node at >=17:30 (see structuralIssues).
- Endings exhaustive: single default = True, ok = False
- State-explosion risk: **low** (exhaustively walkable: yes) -- Five-ish live dimensions: monotonic time (coarse multiples of 5), lamp_charge, body_heat, two companion enums, plus latching booleans. Four hubs (streamway, pitch_base, master_cave, entrance_series) funnel branches so fan-out collapses. The ONLY amplifier is the unenforced numeric bounds (increment/decrement uncapped) which lets body_heat/morale/trust/lamp take a few more distinct values than the claimed 0..4; still small. Default 50,000-state walker cap is comfortable.

**Blockers:**
- **[HIGH]** Conditional effects ('if X set Y') are used in node_shaft_base.c_climb_to_day and node_choke_collapse_present.c_claw_free, but the engine Effect type has no conditional form and applyEffects runs effects unconditionally. These won't compile to valid Story data; companion status (safe/lost) cannot be set this way.  **-> Fix:** Replace each conditional effect with branching nodes: gate a choice's AVAILABILITY with a Condition (status equals with_you), and have its destination apply an unconditional set effect. For Devlin 'lost', route the bolted case to a node whose entryEffect unconditionally sets cave_devlin_status lost.
- **[HIGH]** No change_location effect exists anywhere, so state.location is permanently loc_sump_chamber. Both scheduled events (eventLocation loc_boulder_choke, loc_wet_crawl) can NEVER fire 'present'; they always fire absent, and node_choke_collapse_present / node_wet_crawl_sealing_present are reached only as ordinary choice destinations, bypassing the event engine entirely.  **-> Fix:** Add a change_location entryEffect to each node matching its declared location, so presence works; then ensure the absent-recovery node for the choke (node_streamway_after_shock) is navigably reachable from the streamway hub, not only from the present path.
- **[HIGH]** ending_costly asserts a companion died but its conditions encode no death (only time<17:30 + reached_surface); a fully successful no-bypass run with both companions safe wrongly resolves to it. ending_pyrrhic asserts everyone together but admits bolted/left_behind. ending_default asserts surfacing but catches underground deadline-timeouts. Three EE-4 prose-vs-state lies.  **-> Fix:** Introduce latching booleans (cave_someone_lost, cave_all_together) set by the relevant nodes and gate costly/pyrrhic on them; either add a sharp 'timed-out underground' ending or rewrite ending_default prose to not claim daylight.
- **[MEDIUM]** ending_lost requires cave_devlin_status=='lost', set only by the unrepresentable conditional effect; as designed 'lost' is never assigned, making ending_lost an orphan and its keystone prose unreachable.  **-> Fix:** Once the bolted->lost transition is a real branch node with an unconditional set, ending_lost becomes reachable; add a test path confirming the walker no longer reports it in orphanEndings.
- **[MEDIUM]** Numeric vars are documented as hard-capped 0..4 but the engine never clamps increment/decrement; body_heat can go negative and morale/trust/lamp can exceed bounds, contradicting the walkerTractability claim and risking ending-gate misfires.  **-> Fix:** Add cap-guard conditions to increment choices (e.g. only if var lt 4) and floor-guards where decrement-driven gates matter, or re-document the true ranges and verify the walker stays under cap.
- **[LOW]** node_entrance_series.c_devlin_safe_check / c_mara_safe_check are redundant +15-minute traps that, combined with the broken conditional effects in shaft_base, can leave one companion un-safed.  **-> Fix:** Remove them or make them unconditional confirmations once shaft_base is rebuilt with real branching.

**OR-logic violations:**
- ending_costly.conditions: ending_costly is meant to mean 'out but a companion died/lost', but its AND-list is only [time_before 17:30, reached_surface is_true] — it encodes no death at all. Because there is no OR, the author could not write '(devlin lost) OR (mara lost)', so they dropped the death condition entirely, making costly a catch-all for any in-time surface that isn't the clean bypass. This silently mislabels successful no-bypass runs as tragedies. -> Use flag-equivalence: add a single boolean cave_someone_lost set true on every path that kills/loses a companion (one effect per such node), then ending_costly conditions = [time_before 17:30, reached_surface is_true, cave_someone_lost is_true]. ending_clean stays above it by priority.
- ending_pyrrhic.conditions companion clauses: Intent is 'everyone alive and together above the flood'. not_equals lost on each status admits 'bolted' and 'left_behind', so the OR-free list cannot express 'status is exactly with_you-or-safe'. Reasonable bolted/left-behind states leak into the all-together ending. -> Drive an explicit boolean cave_all_together set true only at the node that confirms both companions are with you, and gate pyrrhic on it instead of two not_equals clauses.

**Structural issues:**
- [CONDITIONAL_EFFECT_UNREPRESENTABLE] node_choke_collapse_present.c_claw_free ('if cave_devlin_status equals bolted set lost'); node_shaft_base.c_climb_to_day ('if cave_devlin_status equals with_you set safe; if cave_mara_status equals with_you set safe') -> The engine Effect type is {field,op,value} with NO conditional form; applyEffects runs every effect unconditionally (effects.ts). 'if X set Y' cannot compile. Also 'set lost'/'set safe' have no field. Replace each conditional effect with a real branching node: e.g. split node_shaft_base into choices/destinations gated by Condition lists (choice available only if status==with_you) that then apply an unconditional 'set cave_devlin_status safe'. For the choke 'set lost', route bolted-Devlin to a distinct node whose unconditional entryEffect sets cave_devlin_status lost.
- [LOCATION_NEVER_CHANGES] all nodes — no choice/entry effect anywhere emits change_location -> state.location is initialized to startLocation and only mutated by change_location effects. With none present, location is permanently loc_sump_chamber, breaking both scheduled events' presence test and making the 8 declared locations cosmetic. Add a change_location entryEffect to every node so location tracks the scene, OR (simpler given the engine) accept that presence-based events are unusable and redesign the two world-moves as pure time-triggered absent effects whose recovery nodes are real hubs reachable from the streamway.
- [VAR_BOUNDS_NOT_ENFORCED] node_fire.c_back_to_routes ('increment ... capped at 4'), node_master_rest.c_rest_to_entrance ('capped at 4'), every decrement of body_heat/lamp/morale/trust -> The engine's increment/decrement (effects.ts) has NO clamp — 'capped at 4' is fiction and body_heat can go negative, morale/trust can exceed 4. This widens the walker's numeric state space beyond the claimed hard 0..4 and can let body_heat<=1 / lamp<=0 ending gates trigger at unintended values. Either add explicit guard conditions so the +increment choice is unavailable at the cap (e.g. c_build_fire only if cave_body_heat lt 4), or accept and re-document the true ranges; do not assert engine-level capping.
- [DEADLINE_FORCES_EARLY_RESOLUTION] node_surface claims 'SINGLE RESOLUTION NODE ... resolver runs once over final state' -> engine.enter() resolves the ending the instant state.time >= deadline on ANY node entry, not only at node_surface. A run that crosses 17:30 mid-cave resolves immediately with reached_surface=false. This is the root of the default-ending prose lie. Either ensure the endings cover every plausible time-out state (add a sharp 'timed out underground, no death' ending so default is truly unreachable), or accept early resolution and rewrite ending_default prose to NOT assert surfacing.
- [REDUNDANT_HARMFUL_CHOICES] node_entrance_series.c_devlin_safe_check / c_mara_safe_check -> These set only ONE companion safe and cost +15; the downstream node_shaft_base.c_climb_to_day already sets BOTH safe when with_you. Since only one entrance_series choice is taken, using a safe_check choice can leave the other companion un-safed unless climb_to_day re-sets it (it would, if its conditional effects worked). Once conditional effects are fixed these become pure time-wasting traps; consider removing them or making them unconditional confirmations.

**Prose-vs-state flags (EE-4):**
- `node_surface_costly`: Asserts 'the count is short by one ... a name that does not get to come home', but ending_costly's conditions guarantee no companion death; reachable by a fully-successful no-bypass run with both companions safe. EE-4 violation.
- `node_surface_pyrrhic`: Asserts 'no one bolted into the stone, no one was left on a ledge', but conditions (status not_equals lost) permit devlin_status=bolted and mara_status=left_behind. EE-4 violation.
- `node_surface_default`: Asserts 'the thin grey daylight at the top of the shaft ... you come up into it ... You are out', but ending_default is the catch-all reached by deadline-timeout while still underground (reached_surface=false). EE-4 violation: default must NOT claim surfacing since it can resolve on un-surfaced timeout states.
- `node_surface_lost`: Depends on cave_devlin_status=='lost', which is set ONLY by the broken conditional effect in node_choke_collapse_present.c_claw_free. As written 'lost' is never assignable, so ending_lost is an ORPHAN ending (walker orphanEndings) and this prose is unreachable until the status-setting is fixed with a real branch node.

**Scheduled-event integrity:**
- `event_choke_collapse`: present/absent/recovery ok = False -- Linter checks (ifPresentNode exists, recoveryNodeId exists+reachable, ifAbsentEffects non-empty, trigger non-empty) will all PASS structurally. But the engine can NEVER fire this event as 'present': presence is judged state.location===ev.eventLocation (loc_boulder_choke), and the design emits ZERO change_location effects, so state.location stays loc_sump_chamber for the entire play. The event therefore ALWAYS fires ABSENT, applying 'set knows_sump_rising true; add_clue choke_gone' wherever you are at 14:40, with NO routing. node_choke_collapse_present is reached only via the plain choice c_choke_caught (node_choke_climb, time_after 14:40) — it is NOT driven by the event mechanism. Worse: the recovery node node_streamway_after_shock is reachable ONLY via node_choke_collapse_present.c_claw_free, i.e. only on the present/in-the-choke path; an absent player whose event fired at 14:40 has no navigable route to it from the streamway hub, so the planted clue is never surfaced in normal play (walker checkEventRecovery passes on raw reachability, but the discovery path is a dead leg).
- `event_sump_seals`: present/absent/recovery ok = False -- Same location defect: eventLocation loc_wet_crawl can never equal state.location (stuck at loc_sump_chamber), so this event also ALWAYS fires ABSENT. node_wet_crawl_sealing_present is reached only via the plain choice c_crawl_too_late (time_after 16:20), not via the event. recoveryNodeId node_master_cave IS broadly reachable (good), so EE-2 recovery technically holds for this one, but the present/absent engine semantics the design relies on are entirely bypassed. Net: both events degrade to 'mutate state at trigger time regardless of player' — acceptable for the sump (recovery=master_cave is a real hub) but broken for the choke (recovery only reachable on the present path).

---

# The Literal Hours -- The Heist

**READY WITH FIXES** -- 4 blockers -- 17 nodes -- 6 endings

> You are the inside-track lead on a four-person crew lifting bearer bonds from a private clearing-house vault during the one ninety-minute window the night-guard rotation thins to a single man — and your getaway driver will not wait past the time she named.

- **Genre:** Heist thriller / crime
- **Setting:** The Meridian Clearing House, a mid-tier private securities depository on the ground floor of a downtown high-rise, on a wet Tuesday night. Present day, unnamed mid-size American city. The crew has cased it for six weeks; tonight the inside man's pulled shift puts the right guard alone at the desk.
- **Protagonist:** Ray 'Della' Dell, the crew lead and the only one who knows the full plan — calm, exact, carries the duffel and the comms. The player is Della, threading three other people's nerves through a vault timer and a guard rotation.
- **Tone:** Tight, procedural, low-romance noir. Competence porn that can curdle into panic. Clipped present-tense dread.
- **Core tension:** Every minute spent buying trust, fixing a mistake, or chasing a bigger score is a minute closer to the next guard sweep, the vault relocking, and the driver pulling away. The crew is the other clock: push them too hard and the weak link flips or freezes; baby them and you run out of night.
- **The clock:** Start 22:00. Hard deadline 00:35 (written as deadline '24:35' = 155 minutes), when getaway driver Mara leaves the loading dock — non-negotiable, the literal end of the job window. Inside it two scheduled events bend the world: the roving guard's perimeter sweep at 22:50 (heist_sweep) and the vault's auto-relock cycle at 23:40 (heist_relock). An efficient decisive run clears the vault and reaches the car around 00:15-00:20 (~135-145 min, comfortably under 155). One major detour (extra room, talk a panicking man down, re-crack a relocked vault) is survivable; two detours or any dawdling and Mara is gone or the sweep catches you mid-floor.

### Expansion hooks (for later folding into one world)
- Mara Quist — the getaway driver / wheel-for-hire, a recurring fixer-adjacent contact who could broker future jobs across the crime world
- The Ostrander — the fence who buys the bearer bonds at a haircut; a recurring buyer/launderer who could appear in mob and cave chapters
- Calloway Group — the private security contractor whose guard rotation the crew exploits; a recurring institutional antagonist
- Pell Street — the crew's home district / safehouse neighborhood, a namable city locale for a connected world
- Vincent 'the Architect' Sarno — the off-screen fixer who sold the crew the floor plans and the inside man's shift; never seen, can recur as the man who assembles jobs

### Variables

| Variable | Type | Default | Bound | Purpose |
|---|---|---|---|---|
| `heist_kel_trust` | number | 2 | 0..4 | How steady Kel (the safecracker) is with Della; low = rattled and slow, high = takes risks for you |
| `heist_tom_nerve` | number | 2 | 0..4 | Tom the lookout/inside-man's composure; at 0 he is the weak link who may freeze or flip |
| `heist_mara_patience` | number | 3 | 0..4 | How long getaway driver Mara will hold the car past her named time; drops when the job runs loud or long |
| `heist_crew_heat` | number | 0 | 0..5 | Accumulated noise/alarm/exposure the crew has generated tonight; high heat means a hot extraction |
| `heist_vault_open` | boolean | false | true/false | The main vault has been cracked open at least once this run |
| `heist_vault_relocked` | boolean | false | true/false | The vault auto-relock cycle fired while the vault was open and the crew was inside/at it |
| `heist_bonds_taken` | boolean | false | true/false | The crew has the primary bearer-bond haul in the duffel |
| `heist_extra_score` | boolean | false | true/false | The crew also grabbed the secondary deposit-box score (greed bonus, costs time) |
| `heist_alarm_tripped` | boolean | false | true/false | A silent or audible alarm has been triggered, putting a response clock in motion |
| `heist_guard_handled` | string | none | none|talked|tied|spooked | State of the lone desk guard Probst: eased past, subdued, or left suspicious |
| `heist_tom_flipped` | boolean | false | true/false | Tom broke under pressure and cut a deal / called it in, betraying the crew |
| `heist_at_car` | boolean | false | true/false | Della has physically reached the getaway car at the loading dock |
| `heist_left_kel` | boolean | false | true/false | Kel was left behind on the floor (relock trap, sweep, or abandonment) and is not in the car |
| `heist_sweep_seen` | boolean | false | true/false | The crew witnessed or has hard knowledge of the 22:50 perimeter sweep timing |

### Locations
- **The Box Truck, Service Alley** (`loc_van`) -- Staging point; the crew suits up and the run begins here
- **Loading Dock** (`loc_dock`) -- Entry/exit seam and where Mara holds the getaway car; the deadline lives here
- **Clearing-House Lobby** (`loc_lobby`) -- Guard desk choke point; Probst sits here, the sweep passes through
- **Service Corridor & Stairwell** (`loc_corridor`) -- Hub connector between dock, lobby, and the vault floor
- **Vault Antechamber** (`loc_vaultroom`) -- Staging just outside the vault; comms hub where the crew regroups
- **The Main Vault** (`loc_vault`) -- The score; the relock cycle fires here
- **Safe-Deposit Box Room** (`loc_boxroom`) -- Optional greed detour off the vault floor
- **Roof Access & Fire Stair** (`loc_roof`) -- Alternate hot exit when the dock is compromised

### Scheduled events
- **The 22:50 Perimeter Sweep** (`heist_sweep`) @ 22:50 at `loc_lobby`
    - World-move: The roving Calloway guard walks the lobby-to-corridor perimeter, checks the dock door, and punches a wall clock. If the crew is in the lobby he must be handled live; if absent, he leaves a logged round and a slightly-ajar door that raises heat and can be discovered as a clue at the vault antechamber hub.
    - If present -> `node_sweep_witnessed`
    - If absent -> add_clue clue_sweep_log (a wall-clock punch / radio chatter the crew can read later) and increment heist_crew_heat by 1 (the roving guard noticed an unlatched door on his round); heist_sweep_seen stays false until the clue is read
    - Recovery node -> `node_vaultroom_hub`
- **The 23:40 Vault Auto-Relock** (`heist_relock`) @ 23:40 at `loc_vault`
    - World-move: The vault's time-lock runs its scheduled bolt cycle and reseals the door. A crew member still inside at 23:40 (Kel) is trapped/pinned and the door must be re-cracked or Kel abandoned; a crew outside hears the hum and learns the vault is shut again.
    - If present -> `node_relock_caught`
    - If absent -> set heist_vault_relocked=true and add_clue clue_relock_hum (the bolt-cycle hum heard from the antechamber); if the crew already has the bonds this is harmless, otherwise the vault is shut again and must be re-cracked
    - Recovery node -> `node_vaultroom_hub`

### Endings
- **The Man on the Inside** -- Tom broke, cut his own deal, and the response was waiting for you. Caught or scattered, the crew is burned from the inside.
    - Conditions: Tom flipped under pressure (heist_tom_flipped is true).
- **Hands Where We Can See Them** -- The window closed on top of you — Mara gone, the floor lit up, and the response team in the door. The night ends in cuffs on wet concrete.
    - Conditions: You reached resolution past the 00:35 deadline — the window closed on top of you.
- **Clean Off the Line** -- Bonds in the duffel, whole crew in the car, no heat behind you. The truck rolls into the rain like it was never there. The perfect score.
    - Conditions: In the car before the deadline, with the bonds, whole crew aboard (Kel not left), low heat (<=2), and Kel still steady (trust >=3).
- **Most of the Money** -- You made the car with the bonds — but loud, or down a man, or with Kel rattled and the heat climbing. A real score with a real wound in it.
    - Conditions: In the car before the deadline with the bonds, but hot or short a crew member or shaky cracker — you got the haul but it cost you.
- **No Score Is Better Than a Bad One** -- You aborted — read the room, killed the job, and walked the crew out empty-handed but free. No money, no cuffs. The discipline that keeps a crew alive.
    - Conditions: In the car before the deadline but the vault was never taken (no bonds) — you called it and pulled the crew out clean-handed.
- **The Night Comes Apart** _(default catch-all)_ -- It didn't end clean and it didn't end in cuffs — it just came apart. The crew scatters into the wet dark with the job half-done and nothing decided.
    - Conditions: Catch-all: any end-state the sharper endings didn't claim — the job dissolved into a grey, inconclusive scatter (e.g. resolution reached but never made the car and not betrayed/late).

### Clock budget
- Window: **155 min** -- efficient path ~140 -- dawdle ~205
- Costs: Suit-up/breach +10; corridor traverse +10; ease past guard (talk) +15; subdue guard (tie) +10; reach vault antechamber +10; crack vault (steady Kel) +25, (rattled Kel) +35; bag bonds +15; safe-deposit greed detour +30; talk a panicking crewman down +20; re-crack a relocked vault +30; exit to dock +15; hot roof exit detour +25.
- Walker plan: **exhaustive** -- hubs: `node_vaultroom_hub`, `node_corridor_hub`, `node_dock_resolve`

### Node outline

**`node_van_start`** -- Suit Up _(scene @ loc_van)_
  Establish crew, clock, and stakes; first trust beat before breach
    - "Run the brief tight and cold — everyone knows their job, no speeches" -> `node_breach` [+10m] _(if always)_ => increment heist_kel_trust (Kel likes precision); add_minutes
    - "Take thirty seconds to steady Tom — he's the green one" -> `node_breach` [+10m] _(if always)_ => increment heist_tom_nerve; add_minutes
    - "Skip it. Clock's already moving — go now" -> `node_breach` [+5m] _(if always)_ => decrement heist_tom_nerve; add_minutes

**`node_breach`** -- The Dock Door _(scene @ loc_dock)_
  Entry seam; quiet vs fast breach; sets initial heat; early abort exit
    - "Pick the dock door clean and quiet" -> `node_corridor_hub` [+15m] _(if always)_ => change_location to corridor; add_minutes
    - "Pry it fast — louder, quicker" -> `node_corridor_hub` [+10m] _(if always)_ => increment heist_crew_heat; change_location to corridor; add_minutes
    - "Something's off. Call it before we're inside" -> `node_dock_resolve` [+5m] _(if always)_ => set heist_at_car=true; add_minutes

**`node_corridor_hub`** -- Service Corridor _(transition @ loc_corridor)_
  PRIMARY HUB. Funnels breach, sweep recovery and box-room returns toward lobby/vault; routes around the guard
    - "Go through the lobby — handle the guard head-on" -> `node_lobby_guard` [+10m] _(if always)_ => change_location to lobby; add_minutes
    - "Slip the back stairwell, avoid the desk entirely" -> `node_vaultroom_hub` [+15m] _(if always)_ => increment heist_crew_heat (unwatched door risk); change_location to vaultroom; add_minutes
    - "Tom's breathing wrong on comms — steady him here" -> `node_tom_check` [+10m] _(if if heist_tom_nerve is low (lte 1))_ => add_minutes

**`node_lobby_guard`** -- The Desk _(conversation @ loc_lobby)_
  Guard choke point; flag-equivalent ways to neutralize Probst; all converge on the vault hub
    - "Use Tom's inside cover — talk Probst into a blind eye" -> `node_vaultroom_hub` [+15m] _(if if heist_tom_nerve is steady (gte 2))_ => set heist_guard_handled='talked'; change_location to vaultroom; add_minutes
    - "Take him quietly — zip-tie him at the desk" -> `node_vaultroom_hub` [+10m] _(if always)_ => set heist_guard_handled='tied'; increment heist_crew_heat; change_location to vaultroom; add_minutes
    - "Bluff badly and push past" -> `node_vaultroom_hub` [+10m] _(if always)_ => set heist_guard_handled='spooked'; increment heist_crew_heat; decrement heist_mara_patience; change_location to vaultroom; add_minutes

**`node_tom_check`** -- Tom on the Wire _(conversation @ loc_corridor)_
  Optional crew-repair beat for the weak link; raises nerve to avoid the later flip
    - "Reassure him — remind him of his cut and his kid" -> `node_corridor_hub` [+10m] _(if always)_ => increment heist_tom_nerve; add_minutes
    - "Hard line — 'You walk now or you finish. Choose.'" -> `node_corridor_hub` [+5m] _(if always)_ => increment heist_tom_nerve; increment heist_crew_heat; add_minutes

**`node_sweep_witnessed`** -- 22:50 — The Round _(event @ loc_lobby)_
  ifPresentNode for heist_sweep; live handling of the roving guard; converges on vault hub
    - "Freeze in the dark and let the round pass" -> `node_vaultroom_hub` [+10m] _(if always)_ => set heist_sweep_seen=true; change_location to vaultroom; add_minutes
    - "Take the roving guard too — fast and quiet" -> `node_vaultroom_hub` [+15m] _(if always)_ => set heist_sweep_seen=true; increment heist_crew_heat; change_location to vaultroom; add_minutes

**`node_vaultroom_hub`** -- Vault Antechamber _(scene @ loc_vaultroom)_
  SECONDARY HUB + event recoveryNodeId. Crew regroups; sweep/relock clues surface; routes to crack, abort, or egress
    - "Put Kel on the vault — start the crack" -> `node_vault_crack` [+10m] _(if if vault not already open (heist_vault_open is false))_ => add_minutes
    - "Read the punched wall clock — when does the round come back?" -> `node_vaultroom_hub` [+5m] _(if if clue_sweep_log present and sweep not yet seen (heist_sweep_seen is false))_ => set heist_sweep_seen=true; add_minutes
    - "Vault resealed — put Kel back on it and re-crack" -> `node_vault_open` [+30m] _(if if vault relocked (heist_vault_relocked is true) and bonds not yet taken)_ => increment heist_crew_heat; change_location to vault; add_minutes
    - "We're done here — make for the exit" -> `node_vaultroom_egress` [+5m] _(if always)_ => add_minutes

**`node_vault_crack`** -- The Crack _(discovery @ loc_vault)_
  Core skill beat; Kel's trust gates speed; sets vault_open; relock event looms here
    - "Give Kel room — let her do it right" -> `node_vault_open` [+25m] _(if if heist_kel_trust steady (gte 3))_ => set heist_vault_open=true; change_location to vault; add_minutes
    - "Press her — we're tight on time" -> `node_vault_open` [+35m] _(if always)_ => set heist_vault_open=true; decrement heist_kel_trust; increment heist_crew_heat; change_location to vault; add_minutes
    - "She can't get it clean — abort the crack" -> `node_vaultroom_hub` [+15m] _(if always)_ => change_location to vaultroom; add_minutes

**`node_relock_caught`** -- 23:40 — The Bolts Run _(event @ loc_vault)_
  ifPresentNode for heist_relock; the vault tries to reseal with the crew at/in it
    - "Jam the bolts and re-crack — get Kel and the bonds out" -> `node_vault_open` [+30m] _(if if heist_kel_trust steady (gte 2))_ => set heist_vault_relocked=true; increment heist_crew_heat; add_minutes
    - "Forget the rest — haul Kel clear before the door seals" -> `node_vaultroom_hub` [+15m] _(if always)_ => set heist_vault_relocked=true; change_location to vaultroom; add_minutes
    - "No time. Seal her in, take what's in the duffel, go" -> `node_vaultroom_hub` [+5m] _(if if bonds already taken (heist_bonds_taken is true))_ => set heist_left_kel=true; decrement heist_tom_nerve; decrement heist_mara_patience; change_location to vaultroom; add_minutes

**`node_vault_open`** -- Inside the Vault _(discovery @ loc_vault)_
  The score; bag bonds, optional greed detour to box room; relock looms if dawdling
    - "Bag the bonds and move" -> `node_vaultroom_hub` [+15m] _(if always)_ => set heist_bonds_taken=true; change_location to vaultroom; add_minutes
    - "Crack the deposit boxes too — bigger haul" -> `node_box_room` [+15m] _(if always)_ => set heist_bonds_taken=true; change_location to boxroom; add_minutes
    - "Grab the loose trays and go — don't get greedy" -> `node_vaultroom_hub` [+10m] _(if always)_ => set heist_bonds_taken=true; increment heist_kel_trust; change_location to vaultroom; add_minutes

**`node_box_room`** -- The Box Room _(discovery @ loc_boxroom)_
  Greed detour; extra score for time/heat; can trip an alarm; returns to vault hub or alarm
    - "Crack the fat boxes and take the extra" -> `node_vaultroom_hub` [+30m] _(if always)_ => set heist_extra_score=true; increment heist_crew_heat; change_location to vaultroom; add_minutes
    - "Force the wired box — fast but it'll trip" -> `node_alarm` [+15m] _(if always)_ => set heist_extra_score=true; set heist_alarm_tripped=true; increment heist_crew_heat; change_location to vaultroom; add_minutes
    - "Not worth it — back to the antechamber" -> `node_vaultroom_hub` [+10m] _(if always)_ => change_location to vaultroom; add_minutes

**`node_alarm`** -- The Wire Trips _(event @ loc_vaultroom)_
  Alarm response clock; drives toward hot exit / flip pressure
    - "Run for the dock now, straight line" -> `node_dock_resolve` [+15m] _(if always)_ => increment heist_crew_heat; change_location to dock; set heist_at_car=true; add_minutes
    - "Dock's exposed — break for the roof and the fire stair" -> `node_roof_exit` [+10m] _(if always)_ => increment heist_crew_heat; change_location to roof; add_minutes
    - "Tom's freezing — talk him down before he bolts or calls it in" -> `node_tom_break` [+20m] _(if if heist_tom_nerve is low (lte 1))_ => add_minutes

**`node_tom_break`** -- Tom Cracks _(conversation @ loc_vaultroom)_
  The betrayal gate; nerve threshold decides whether Tom flips the crew
    - "Hold him — 'We walk out together or not at all'" -> `node_dock_resolve` [+15m] _(if if heist_tom_nerve steady (gte 2))_ => increment heist_tom_nerve; change_location to dock; set heist_at_car=true; add_minutes
    - "He won't hear it — he makes the call" -> `node_dock_resolve` [+10m] _(if if heist_tom_nerve is low (lte 1))_ => set heist_tom_flipped=true; change_location to dock; set heist_at_car=true; add_minutes
    - "Take his phone by force and drag him out" -> `node_dock_resolve` [+15m] _(if always)_ => increment heist_crew_heat; change_location to dock; set heist_at_car=true; add_minutes

**`node_roof_exit`** -- Roof Stair _(transition @ loc_roof)_
  Alternate hot exit; costs Mara patience (she repositions) but escapes a watched dock; converges on dock resolve
    - "Down the fire stair, signal Mara to reposition" -> `node_dock_resolve` [+25m] _(if always)_ => decrement heist_mara_patience; change_location to dock; set heist_at_car=true; add_minutes
    - "Hold on the roof until the heat passes" -> `node_dock_resolve` [+35m] _(if always)_ => decrement heist_mara_patience; change_location to dock; set heist_at_car=true; add_minutes

**`node_exit_dock`** -- Back to the Dock _(transition @ loc_corridor)_
  Clean exit path from vault hub to the car; the default success egress
    - "Walk it out steady — no running, no noise" -> `node_dock_resolve` [+15m] _(if always)_ => change_location to dock; set heist_at_car=true; add_minutes
    - "Bolt for the car — speed over quiet" -> `node_dock_resolve` [+10m] _(if always)_ => increment heist_crew_heat; change_location to dock; set heist_at_car=true; add_minutes

**`node_vaultroom_egress`** -- Make the Call _(scene @ loc_vaultroom)_
  Routing node from the secondary hub to an egress so every vault-hub path reaches an exit
    - "Out the corridor the way we came" -> `node_exit_dock` [+5m] _(if always)_ => change_location to corridor; add_minutes
    - "Straight to the dock, fast" -> `node_dock_resolve` [+10m] _(if always)_ => change_location to dock; set heist_at_car=true; add_minutes

**`node_dock_resolve`** -- The Loading Dock _(transition @ loc_dock)_ _[resolvesEnding, ENDING]_
  TERMINAL HUB. Resolves the ending from accumulated state; the deadline and Mara's patience bite here

### Voice bible
- **Register:** Tight procedural crime-noir. Competence porn that curdles into panic. Working-professional crook diction — gear, rooms, rotations, the names of things done right — laced with the cold-sweat awareness that a single wasted minute eats the whole night. No glamour, no romance, no quips for their own sake. Plain hard nouns; the poetry lives in the dread, not in ornament.
- **POV:** Second person, singular. You are Ray 'Della' Dell, crew lead. The other three (Kel the cracker, Tom the inside man, Mara the wheel) are always 'she/he', held at arm's length the way a lead holds a crew — read, managed, never fully known. The reader threads other people's nerves; the prose keeps reminding them the crew is the second clock.
- **Tense:** Present tense throughout, including endings. The job is happening NOW, in real minutes. Even the resolutions stay in present/immediate-past to keep the floor under the reader's feet.
- **Rhythm:** Short declaratives stacked under pressure; fragments when the clock bites. Sentence length tracks tension — longer, almost-calm lines while a plan holds, then it chops to two- and three-word beats when something goes wrong. Paragraphs run 2–4 sentences. End scenes on a hard, flat fact, not a flourish. Let one concrete sound (a hum, a bolt, a brake light) carry a whole beat.
- **Dialogue:** Clipped, low-affect, operational. People say the minimum. Kel narrates the lock in clicks and feel. Tom's lines fray — half-sentences, breath, the catch before a name. Mara speaks in flat ultimatums about the time and never softens them. No one explains the plan aloud for the reader's benefit; trust that the player knows the job. Comms voices come thin, over a wire, half-swallowed by static.
- **Motifs:** The clock as a physical antagonist (Della 'feeling' the time, the window 'closing'); rain on concrete and loading-dock light; the duffel's growing weight; comms breath and static; Mara's idling brake lights as the one fixed star; the building's hum (HVAC, fluorescents, the vault's bolt-cycle) as a pulse you're racing; doors as seams — open seam, closing seam; hands (gloved, on a dial, on a phone, on a shoulder); the crew as 'the other clock'.
- **Dos and donts:** DO: stay second-person present; keep the clock physically present; let the crew's nerve be the live wire; use {{time}} for any clock read; end on flat facts; vary rhythm with tension; keep heists procedural and grounded. DO NOT: hardcode any clock number in prose; assert a state flag the reaching path doesn't guarantee (e.g. don't say 'bonds in the duffel' in an ending unless heist_bonds_taken is set on every path there; hedge with 'whatever's in the bag' otherwise); use quips, glamour, or romance; over-describe with purple ornament; name a city, brand, or year; let Della monologue the plan; address the reader as anything but Della.

### Keystone prose

#### `node_van_start` -- OPENING node

The box truck smells of cold coffee and gun oil and three people breathing too fast.

You pull the gloves on slow, one finger at a time, because slow is the only thing that ever steadies a crew, and you let them watch you do it. Kel checks her picks against the dome light, lays them in a row on her knee, counts them twice. Tom can't keep his hands off the comms — adjusting, re-seating, adjusting again, the green man's tell. In the dark of the dock beyond the windshield Mara sits behind the wheel with the engine off and the patience of a woman who has done this before and does not intend to do it long.

You run it once, flat and quiet, so nobody has to think on the floor. "Inside man's shift puts one guard at the desk. Single man, the whole window. We breach the dock, we take the vault, we're back in this seat before the round comes through the second time." You don't say the rest. The rest is on the dash clock, reading {{time}}, and on the time Mara named when she took the job — the time she leaves, whether you're in the seat or not.

"That time's real," Mara says, not turning around. "You know it's real."

"It's real," you say.

Kel snaps her picks into their roll. Tom stops touching the comms and just holds them, white-knuckled, like the wire might keep him here. Four faces, one duffel, and the whole night folded down to a strip of minutes that is already getting shorter. You reach for the door handle.

#### `node_sweep_witnessed` -- scheduled-event WITNESSED (heist_sweep ifPresentNode)

You hear it before you see it — the dead scuff of a rubber sole on lobby tile, unhurried, a man who has walked this floor a thousand nights and expects to walk it tonight.

The round.

The roving guard's flashlight comes around the corner ahead of him, a hard white bar sweeping the marble, the dark desk, the seam of the dock door you came through. You go still. You put a flat hand back without looking and feel the crew go still behind you, even Tom, even his breath. The beam crawls across the wall a yard from your face and you watch it touch the edge of your own shadow and not know it.

He stops at the desk. Checks the lone guard's chair — empty, your guard handled, or not at the desk where he should be — and you feel the whole night balance on whether he reads that as wrong. His radio coughs static. He thumbs it, says something low and bored, and then he does the thing the inside man told you he'd do: he steps to the wall by the door and punches the clock there, a hard mechanical chunk, logging the round at {{time}}.

Then the beam swings away. The scuff recedes. The lobby goes back to its hum.

You let your breath out through your teeth. You know the round now — you've seen it with your own eyes, the timing of it, how long the floor is yours before the white bar comes back. That's worth more than the minute it cost. You move.

#### `node_vaultroom_hub` -- scheduled-event ABSENT recovery (recoveryNodeId for both events)

The antechamber holds the four of you and the vault door, and the vault door holds the night.

It stands at the end of the little room like the face of something asleep — a wheel, a seam, a maker's plate gone dull under the work light Kel has clipped to the wall. The crew folds in around it the way a crew does when there's a wall at their backs and a job in front of them. The building hums. Somewhere overhead the air handlers turn over, patient, indifferent, counting nothing.

While you were elsewhere the floor went on without you. The round came and went on its own schedule and left its marks for anyone who knows to read them — a dock door you can see now is sitting a finger's width off its latch, swinging slow in the draft, a thing nobody left open on purpose. The clock by the desk punched at {{time}} and nobody was here to watch it punch. You read the room the way you read a lock: by feel, for the click that says something moved when you weren't looking.

Kel waits with her picks already out, watching your face for the word. Tom's breath saws thin over the comms. The duffel hangs off your shoulder, lighter than it's going to be — or heavier than you want, if it's already done its work. The clock reads {{time}}. Mara's time has not moved. Everything from here runs through this door, and out, and back to a seat that will or will not still be there. You decide what the crew does next.

#### `heist_end_clean` -- ENDING body — Clean Off the Line

You come out the dock seam at a walk, no faster, because faster is what gets seen, and Mara's brake lights are exactly where she swore they'd be.

The duffel rides heavy on your shoulder — the bonds, the whole sure haul of them, dead weight that means everything. Kel's at your elbow, steady as she was at the dial, no rattle left in her hands. Whole crew. Nobody seled in, nobody left on the floor, nobody's nerve cracked open behind you. And behind you the building just sits there in the rain, dark and humming and none the wiser, no alarm, no shout, no white bar of light hunting the lot. Cold. Clean. Quiet as you found it.

Mara reads your face through the wet glass and the locks thunk open. "Made my time," she says, flat, which from her is a parade. The clock on her dash reads {{time}} — inside the window, inside the named time, with room to spare you didn't waste.

Kel goes in first, then the duffel, then you, and the door pulls shut on the rain. The truck rolls out of the dock and into the wet dark with no more noise than any truck on any street, the loading dock shrinking in the mirror, the score in the bag and not one minute of it owed to luck.

This is the one they tell you doesn't happen. The clean one. You did it the slow right way and the slow right way got you out whole. The rain takes the building. The street takes the truck. The night never knew you were here.

#### `heist_end_partial` -- ENDING body — Most of the Money

You make the dock with the bonds and a wound in the job you can already feel.

Mara's brake lights are still there — just. The duffel's full, the sure haul of it banging your hip as you come through the seam, and that much is real, that much you carry into the seat. But the rest of it came at a price the night made you pay. Maybe the heat's behind you, a noise that's going to turn into a phone call somewhere downtown. Maybe you're climbing in light a body you walked in with. Maybe Kel's hands haven't stopped shaking since the dial, since you pressed her when there wasn't slack to press. Whatever it cost you, it cost.

"Get in," Mara says, and there's an edge under it now that wasn't there in the alley. The dash reads {{time}}. Inside the window — barely, or with margin you bled away buying back a mistake — but inside it. The door's still open. That's the line that matters and you're on the right side of it.

You pull yourself up and haul the door shut and the truck moves before it's all the way closed. Out of the dock, into the rain, the building going small behind you with whatever you left bleeding on its floor.

A real score. You'll count it later, in a quiet room, and it'll be real money — and there'll be a part of the night you don't tell anyone about, the part that left the mark. Most of the money. Most of the crew. The job got out, and it didn't get out clean, and you'll know the difference for a long time.

#### `heist_end_walkaway` -- ENDING body — No Score Is Better Than a Bad One

You call it.

Somewhere back there the vault stayed shut — never cracked, never bagged, the bonds still sleeping in their trays behind a door you chose not to spend the rest of the night on. The duffel on your shoulder is empty and light as air and you carry it out the dock seam like that's exactly what you came for.

Mara's brake lights are burning in the wet dark, and her window's already down. "Empty," she says, reading the slack bag. Not a question.

"Empty," you say. "We're out."

The dash reads {{time}} — inside her time, inside the window, every minute of it spent on the one decision that keeps a crew breathing: knowing the night had turned, and turning with it instead of against it. No bonds. No alarm chewing the air behind you. No cuffs, no white light, no man on the floor with his hands behind his head. Just a crew, whole, climbing into a truck with nothing in the bag and nothing on their wrists.

The doors thunk shut. Mara pulls out smooth and unhurried, because there's nothing to run from now. The building shrinks in the mirror, dark and intact and never the wiser.

Nobody made a dime tonight. You'll hear it later — the grumbling, the what-if. Let them grumble. You read the room and killed the job and walked four people out into the rain free. That's the discipline nobody throws a party for. That's the discipline that lets there be a next time.

#### `heist_end_betrayed` -- ENDING body — The Man on the Inside

Tom makes the call.

You see it happen — the phone coming up, the thumb already moving, the look on his face that isn't fear anymore but something worse, the flat relief of a man who's decided to be on the other side of this. You're at the dock now, at the seat, the night supposedly ending — and it ends, just not the way the brief drew it.

The brake lights aren't brake lights. They're too many, and they're the wrong color, and they're coming. The lot goes white. A voice you've never heard owns the air now, hard and amplified and certain, telling you exactly where to put your hands, and you understand in one cold drop that they were waiting because Tom told them to wait — gave them the window, the seam, the duffel, the names. Bought himself a deal with the only thing he had left to sell, which was you.

The clock on Mara's dash reads {{time}}, if Mara's even still there, and it doesn't matter now whether you're inside the window or not. The window was never the thing that killed this. The weak link was, the one you tried to steady all night, the breath that frayed on the comms.

Whatever's in the bag — full, empty, half a night's work — it's just evidence now. The crew scatters or freezes, every one of them on their own from here. You went in to beat a clock and a guard rotation, and the thing that finished you was a man you trusted, breaking inward, in the wet light, where you couldn't reach him in time.

#### `heist_end_caught` -- ENDING body — Hands Where We Can See Them

You reach the dock and the window has closed on top of you.

The clock reads {{time}} — past her time, past the line, into the dark stretch of minutes that don't belong to the job anymore. And the proof of it is right there where the car should be: nothing. No idling shape, no brake lights, no Mara. She named a time and she meant it and she's gone, the way she always swore she'd go, leaving a wet rectangle of empty concrete and the smell of exhaust already thinning in the rain.

You stand in the open seam with whatever you carried this far and no wheel to put it in.

Then the lot lights up. Not your light — theirs. It comes from the street and the far corner and somewhere above, white and total, and the building you beat all night lights up with it, every dark window suddenly a witness. The voice that owns the air tells you where to put your hands. You put them where it says.

The night had one hard edge and it wasn't the guard and it wasn't the vault. It was the clock, the literal hours of it, the minutes you spent fixing and chasing and babying a crew until there were no minutes left to spend. The car was the deadline made into steel and it pulled away while you were still inside, still close, still almost.

Cuffs on wet concrete. The rain doesn't stop for it. It never does.

#### `heist_end_default` -- ENDING body — The Night Comes Apart

It doesn't end clean and it doesn't end in cuffs. It just comes apart in your hands.

There's no neat last shot of it — no truck rolling out whole, no white light, no slow walk into the rain with the discipline intact. Somewhere between the floor and the seam the night stopped adding up to anything. A door that should have closed didn't. A call that should have come didn't. The clock reads {{time}} and you can't even say for certain whether that's inside her time or past it, because the job dissolved before it could resolve into a number that meant something.

The crew scatters. Not on a plan — on instinct, each of them peeling off into the wet dark with their own half of the story, the duffel doing or not doing what it was meant to, the vault open or shut behind you, nothing decided, nothing finished, nothing you could carry back and call a result.

This is the grey one. The one that isn't a score and isn't a bust, that doesn't make the telling and doesn't make the file — that just leaks away into the rain and the cold and the long quiet after, leaving four people who used to be a crew and a night that came apart at a seam you'll never quite be able to point to.

The rain keeps on. The building hums. You go your own way into the dark with the job half-done and nothing settled, and the city closes over it without a sound.

### Engine-constraint audit

**Verdict: READY WITH FIXES.** The design is structurally sound against the real engine: no broken links, no NO_EXIT, no choice targets an ending, exactly one default ending, all variables/locations declared, time literals in-window, clock both bites and is winnable, guard-handling is correctly flag-equivalent, and both scheduled events have valid present+absent+navigable-recovery wiring. It will not throw the hard linter errors. The blockers are not link/exhaustiveness failures but contract-fidelity gaps: (1) the engine does NOT clamp numeric vars, so the stated bounds and the exhaustive-walkability argument are unproven — fix clamping or constrain paths, then confirm walker capHit=false; (2) author the event triggers as Condition[] and decide whether the two present nodes are intentionally present-only (likely walker orphans on fast runs); (3) shore up the clean-ending trust economy so one opening choice does not railroad the player out of the best ending; (4) tighten heist_end_clean prose-vs-flags on the alarm assertion. Address these and it is build-ready for an exhaustive certification.

- Clock check: OK -- Clock bites AND is winnable. Window = parseTime(24:35) - parseTime(22:00) = 1475 - 1320 = 155 min. Longest acyclic path far exceeds 155 (e.g. van10+quietbreach15+lobby10+talk15+sweep10+crackpress35+greed15+box30+hub5+recrack30+egress5+walkout15 ~= 220), so CLOCK_CANNOT_BITE will not fire. Efficient decisive run lands ~135-145 < 155, so DEADLINE_UNWINNABLE will not fire. All choice time costs present and multiples of 5. Linter timeBounds DFS prunes cycles (corridor<->tom_check, vaultroom_hub self-loop via c_read_sweep_clue -> node_vaultroom_hub) at first revisit, but acyclic max still > 155 so no false CLOCK_CANNOT_BITE. Supplied keystone prose uses {{time}} correctly and never hardcodes 22:50/23:40 (uses 'the round'/'the bolt cycle') or the deadline number ('the named time'). No EE-1 violation in supplied prose; builder must hold that line in the ~30 unwritten nodes.
- Endings exhaustive: single default = True, ok = False
- State-explosion risk: **medium** (exhaustively walkable: uncertain) -- (1) heist_crew_heat is UNCLAMPED in the engine with ~15 +1 sources, so the walker keys on heat=0,1,2,...,N rather than 0..5 — the single biggest multiplier. (2) heist_kel_trust / heist_tom_nerve also unclamped and can drift below 0 / above 4, each adding key values. (3) Two scheduled events plus the relock re-crack create vault_open/vault_relocked/bonds_taken combinations that, crossed with heat and time, fan out. (4) Time is coarse (mult of 5, ~31 steps) which helps. Hubs (corridor, vaultroom, dock) genuinely re-converge location, which helps. Net: nodes ~16 (not 40), which is small, but the unclamped numerics are the risk. With DEFAULT_CAP=50,000 states the walk MAY hit capHit if heat/trust/nerve spread widely combined with time and the boolean progress flags.

**Blockers:**
- **[HIGH]** VariableDef bounds (heist_crew_heat 0..5, trust/nerve 0..4) are NOT enforced by the engine — effects.ts increment/decrement never clamp — yet walkerTractability explicitly relies on clamping for exhaustive walkability. With ~15 heat sources heat grows past 5, inflating the walker state key and risking capHit on the exhaustive walk.  **-> Fix:** Add clamping to applyEffect using each VariableDef's bound (min/max), OR redesign so no reachable path can exceed the bounds. Then re-run walkStateSpace and confirm capHit=false and statesExplored is comfortably under cap.
- **[MEDIUM]** Scheduled-event triggers are specified only as 'triggerTime' strings, not as the Condition[] the engine evaluates; and the present nodes (node_sweep_witnessed, node_relock_caught) are reachable ONLY by being physically at eventLocation at trigger time, which the decisive flow does not require, so both present nodes may surface as walker orphanNodes.  **-> Fix:** Author trigger as [{field:'time',op:'time_after',value:'22:50'}] / '23:40'. Confirm there is at least one reachable play that dwells in loc_lobby until 22:50 and one that keeps a member in loc_vault until 23:40, so each present node is exercised; otherwise accept them as intentional present-only nodes and document that orphanNodes for these two ids are expected, not defects.
- **[MEDIUM]** Clean ending depends on heist_kel_trust>=3 gating the clean crack (c_crack_steady), but the only reliable pre-crack trust source is c_brief_tight (+1 from default 2 -> 3). A player who picks c_brief_steady or c_brief_rush at the van can never reach trust 3 before the crack, railroading them out of the clean ending via a single early choice.  **-> Fix:** Add a second pre-crack heist_kel_trust increment (flag-equivalence) on an independent route, so steady-Kel-at-crack is not contingent on one opening choice. (c_grab_run's +1 lands after the crack and cannot help.)
- **[LOW]** EE-4 check on heist_end_clean: prose asserts 'no alarm, no shout' but heist_alarm_tripped is not among the clean conditions, so a state with alarm_tripped=true could in principle resolve clean if heat stayed <=2.  **-> Fix:** Either add heist_alarm_tripped is_false to heist_end_clean.conditions, or verify no path can set heist_alarm_tripped while keeping heat<=2 and trust>=3. Simplest: add the condition.

**OR-logic violations:**
- node_lobby_guard c_talk_guard (cond: heist_tom_nerve gte 2) vs the guard-handling set: Guard neutralization is correctly flag-equivalent: c_tie_guard and c_spook_guard are UNCONDITIONAL fallbacks alongside the nerve-gated c_talk_guard, all three set heist_guard_handled and all route to node_vaultroom_hub. No railroad: a low-nerve player still has tie/spook. Good AND-only design. -> No fix needed; this is the correct pattern.
- node_vault_crack c_crack_steady (cond: heist_kel_trust gte 3): POTENTIAL SOFT RAILROAD, not a hard violation: the only OTHER crack option is c_crack_press (unconditional, but decrements kel_trust and increments heat) and c_crack_bail (abort). A player who arrives with kel_trust < 3 can never take the clean crack; they are funneled into c_crack_press (heat+, trust-) or abort. Since c_crack_press is always available the vault is still openable, so no SOFT_LOCK and bonds remain reachable — but the CLEAN ending (needs trust>=3 AND heat<=2) can become unreachable for a player who never banked trust early. That is intended difficulty, not an engine violation, but flag it: clean ending depends on a fragile early-trust economy (only c_brief_tight and c_grab_run increment kel_trust; press/relock decrement it). -> Confirm there are at least two independent ways to reach kel_trust>=3 before the crack so a reasonable player is not railroaded out of clean by one missed early choice. Currently c_brief_tight (+1, start) and c_grab_run (+1, but that is AFTER the crack) are the main sources — c_grab_run cannot help gate the crack. Consider adding a second pre-crack trust source for flag-equivalence.

**Structural issues:**
- [BOUND_NOT_ENFORCED] effects.ts applyEffect increment/decrement; all heist_crew_heat/heist_kel_trust/heist_tom_nerve/heist_mara_patience effects -> The walkerTractability claim 'Increments/decrements clamp at the bounds so the walker only ever sees in-range values' is FALSE for this engine: applyEffect does raw num+delta with NO clamping. heist_crew_heat has ~15 distinct +1 sources (pry, slip_back, tie, spook, sweep_take, tom_hardline, crack_press, recrack_relocked, recrack, take_extra, trip_alarm, alarm_run, alarm_roof, tom_subdue, bolt_out) and can exceed 5; trust/nerve can drift outside 0..4. This both violates the stated bound AND inflates the walker state key (vars are keyed exactly), enlarging the state space. FIX: either (a) author every increment/decrement with the understanding it is unclamped and design so paths cannot exceed the bound, or (b) add explicit guard conditions / cap logic, or (c) get the engine to clamp via VariableDef bounds. Without this the 'bounded 0..5' tractability argument does not hold against the real engine.
- [TRIGGER_UNDERSPECIFIED] scheduledEvents heist_sweep, heist_relock (triggerTime field) -> Design gives 'triggerTime: 22:50' / '23:40' but the engine's ScheduledEvent.trigger is a Condition[] evaluated by evaluateConditions. Builder MUST author trigger as e.g. [{field:'time',op:'time_after',value:'22:50'}]. time_after is >= so the event fires on the FIRST node-entry at or after the trigger minute. Because triggers are >= (not ==), and events mark completed once fired, ensure no path lands an entry exactly at the boundary in a way that routes present unexpectedly. Both 22:50 and 23:40 sit inside [22:00,24:35] so TIME_LITERAL_OUT_OF_RANGE will not fire.
- [RESERVED_FIELD_DECL] ending heist_end_caught condition field 'time' -> No issue, but note: 'time' is a RESERVED_FIELD; UNDEFINED_VAR/TYPE_MISMATCH are correctly skipped for it. time_after '24:35' (=1475) equals the deadline; engine forces resolution at time>=deadline and time_after is >=, so a state landing exactly at 1475 matches caught(90) before clean/partial/walkaway which all require time_before (< 1475). Boundary is handled correctly: a run that arrives exactly at the deadline is CAUGHT, not clean.
- [NO_BROKEN_LINKS] all choice destinations -> Verified every choice.destination resolves to a real node id in the outline (node_breach, node_corridor_hub, node_dock_resolve, node_lobby_guard, node_vaultroom_hub, node_tom_check, node_vault_crack, node_vault_open, node_box_room, node_alarm, node_tom_break, node_roof_exit, node_exit_dock, node_vaultroom_egress). No choice targets an ending id (no CHOICE_TARGETS_ENDING). node_dock_resolve has resolvesEnding:true with zero choices (legal, not NO_EXIT). No node lacks both choices and resolvesEnding.
- [POSSIBLE_ORPHAN_CHOICE] node_vaultroom_hub c_read_sweep_clue (destination = node_vaultroom_hub, self-loop) -> Self-loop is legal and escapable (other hub choices always-available, e.g. c_to_egress). But the walker dead-choice detector requires c_read_sweep_clue be EXERCISED from an AVAILABLE state, which needs clue_sweep_log present AND heist_sweep_seen false. That state only arises when the sweep fired ABSENT. If on every walked path the sweep fires present (it cannot here — see sweep note, present requires lobby-dwell) OR sweep_seen is already true, c_read_sweep_clue shows up in deadChoices. Acceptable (warning-level), but verify at least one absent-sweep path reaches the hub with the clue unread.

**Prose-vs-state flags (EE-4):**
- `heist_end_clean`: Prose asserts flags the path DOES guarantee (good): conditions require bonds_taken, left_kel=false, heat<=2, kel_trust>=3, so 'bonds, whole crew, no rattle, no alarm' are all backed by state. Minor: 'no alarm, no shout' — heist_alarm_tripped is NOT in the clean conditions, so a clean-ending state COULD in principle have alarm_tripped=true if such a path keeps heat<=2. Verify no path sets heist_alarm_tripped while keeping heat<=2 and trust>=3; if one exists, the 'no alarm' line is an EE-4 false assertion. Likely safe since c_trip_box_alarm also increments heat, but confirm the arithmetic.
- `heist_end_partial`: Correctly hedged ('whatever it cost you'); asserts only bonds_taken (guaranteed by condition) and time_before. Safe. Good EE-4 discipline.
- `heist_end_betrayed`: Hedged on bag contents ('Whatever is in the bag — full, empty, half a night'); only asserts tom_flipped, which is the sole condition. Safe.

**Scheduled-event integrity:**
- `heist_sweep`: present/absent/recovery ok = True -- Present node node_sweep_witnessed exists; recovery node node_vaultroom_hub exists and is reachable by navigation (passes EVENT_RECOVERY_UNREACHABLE). ifAbsentEffects (add_clue clue_sweep_log + increment heist_crew_heat) are non-empty (passes EVENT_NO_ABSENT) and open a real path: c_read_sweep_clue at the hub is gated on has_clue clue_sweep_log, so the planted clue is navigably discoverable. ONE STRUCTURAL GAP: node_sweep_witnessed is the ifPresentNode but NO choice anywhere navigates to it, so it is unreachable-by-navigation. The linter exempts ifPresentNode from UNREACHABLE_NODE (presentNodes set), so no error. But the engine only routes to it when the event fires PRESENT, which requires the player to be AT loc_lobby at time>=22:50. The ONLY lobby node is node_lobby_guard; reaching it costs van(>=5)+breach(>=10)+corridor->lobby(10) >= 25 min from 22:00 = 22:25, then guard handling moves location to loc_vaultroom. So the player is only physically in loc_lobby DURING node_lobby_guard. Unless the player lingers in lobby until 22:50, the sweep fires ABSENT every time and node_sweep_witnessed may be a walker orphan (reported in orphanNodes). Confirm the trigger condition is structured (e.g. time_after 22:50) and that a lobby-dwell path exists, or accept node_sweep_witnessed as present-only/rarely-hit.
- `heist_relock`: present/absent/recovery ok = True -- Present node node_relock_caught exists; recovery node node_vaultroom_hub exists and is reachable. ifAbsentEffects (set heist_vault_relocked=true + add_clue clue_relock_hum) non-empty. Absent path opens re-crack route: c_recrack_relocked at hub gated on heist_vault_relocked AND bonds not taken -> node_vault_open (+30 min). Present node node_relock_caught choices are escapable (c_haul_kel is unconditional), so no NO_EXIT/SOFT_LOCK. Like the sweep, node_relock_caught is reachable ONLY when present at loc_vault at time>=23:40; a decisive crew is already out of the vault by then, so it is a slow-path-only node and will appear in walker orphanNodes on fast certification runs unless a dawdling path keeps someone at loc_vault past 23:40 (the design intends this). Note: if relock fires PRESENT before bonds are taken, c_leave_kel is unavailable (requires bonds_taken) but c_haul_kel/c_recrack remain, so no dead end.

---


