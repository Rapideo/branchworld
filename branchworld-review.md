# BranchWorld Engine - Triple-Team Chapter-One Review

_Generated 2026-06-16. Three independent teams, each running designer -> writer -> playtester, reconciled by a showrunner._

## Headline Verdict: GO WITH CHANGES

> Three teams, three different stories, one identical failure: the clock and the state-resolved endings are decorative, not implemented. The concept is proven; the wiring is not.

All three independent teams produced strong, publishable prose and at least one genuinely reactive spine (clue-gating). And all three, working in isolation, shipped the EXACT same four mechanical failures: a deadline that cannot run out, hardcoded node timestamps that contradict the accumulated clock, scheduled/missed events that never fire on a schedule, and endings hardwired to choices rather than selected from state. Convergence this tight across isolated teams is the strongest possible signal: these are not authoring slip-ups, they are structural traps the engine and PRD make easy to fall into. The story concept is a GO. But shipping any of these three as written would deliver precisely the 'spreadsheet with no felt consequence' failure mode the founder is trying to avoid. The fixes are calibration and wiring, not rewrites, so the call is go_with_changes â€” with the clock and ending-resolver work as non-negotiable P0s.

## Where three independent teams converged (the strong signal)

- The deadline cannot run out. All three clocks (6-hour windows) are unreachable: per-action costs are ~3-10x too small for the budget, so optimal AND maximal-dawdle runs finish with hours to spare. The ticking-clock premise that titles and sells every story is mechanically inert in all three.
- Node bodies hardcode fictional timestamps that contradict the accumulated add_minutes clock. All three teams did this independently to paper over the broken clock, creating two disagreeing clocks and an incoherent sense of time.
- The scheduled event does not actually fire on a schedule and has no working 'if-absent' path. In all three, the marquee 'world moves without you' event exists only as an opt-in choice in one node; the absent-path clue recovery and the dead-end-prevention guarantee are entirely unimplemented. The flagship reactivity feature is vaporware in every chapter.
- Endings are hardwired to choices, not selected from accumulated state. All three route specific choices directly to specific endings, so the fiction asserts relationships/outcomes the state contradicts (Team 1: Reyes ferries you out at trust=1; Team 3: failed runs fall through a loose fallback into the hero ending).
- Ending selection is buggy and non-exhaustive. Dead-code endings (Team 2: 2 of 5 unreachable), zero-match fall-through dead-ends (Team 2: a clean in-character run matches NO ending), and prose-vs-state contradictions (Team 1: three endings narrate a flood the flag never set) appear across teams.
- The clue-gating pillar is the one feature that genuinely works in all three. Examining the body/satchel/cable sets a knowledge flag that visibly unlocks sharper dialogue. Every team's playtester independently called this the part that 'feels like a living world.'
- Prose quality is strong and consistent across all three teams and was never the problem. The failure is always mechanical/wiring, never writing.
- The scope is right, not too large. All three are completable 21-31 node chapters within the MVP target; the gap is ambition-vs-implementation, not content volume.

## Where they diverged

### How reachable is the designed fail/bleak ending

Team 1's 'Stranded' is orphaned behind one specific low-trust harbor visit (authored but mis-wired). Team 2's two island-overnight endings are pure dead code (time gate never satisfiable). Team 3's 'burned' ending is nearly unreachable because its suspicion gate fights its own trust requirements. Same symptom, three different root causes â€” suggesting the fail-state is structurally the hardest ending to wire correctly and needs explicit attention regardless of approach.

### Whether relationship gates create real door-closing

Team 2 built a genuine town_suspicion<3 lock that closes the Cold Room with a graceful fallback (works, but rarely triggers because suspicion is hard to raise). Teams 1 and 3 use trust mainly to gate content additively; neither demonstrated a clean 'relationship closes a door' beat. Team 2's lock is the best model but shows the tuning problem: a real lock that almost never fires feels as absent as no lock at all.

### Variable semantics discipline

Team 3 surfaced a unique failure the others did not: volkov_suspicion is overloaded to mean three contradictory things (Cal's distrust, Volkov's willingness to deal, and enemy-net-pressure), making endings feel like a coin flip. Teams 1 and 2 kept cleaner one-meaning-per-variable discipline. This is a per-author hazard, not a universal one â€” but worth a PRD guardrail.

### Did the author patch gaps honestly

Team 1 quietly added a 6th ending to paper over AND-only gating â€” an honest signal that the documented 5-ending design was insufficient. Team 2 instead left a hard zero-match hole with no patch. Different responses to the same AND-only-gating constraint the engine imposes; suggests the constraint itself (no OR) is a real authoring pain point.

## Engine feature validation

| Feature | Held up | Notes |
|---|---|---|
| State-driven branching (the core thesis) | MIXED | Holds STRONG on the knowledge axis (clue-gating) in all three, but BREAKS on the time and disaster/outcome axes everywhere. Branching on what-you-know works; branching on the clock and on accumulated state at endings does not. The thesis is half-proven: state-driven branching can feel alive, but only the clue dimension currently delivers it. |
| Time / deadline | WEAK | Failed in all three independently and identically. The deadline never bites; add_minutes costs are an order of magnitude too small; hardcoded node timestamps contradict the real clock. This is the single most important fix and the clearest proof the PRD/engine make the failure easy. |
| Scheduled + missed events ('world moves without you') | WEAK | The headline feature is unimplemented in all three. In every chapter the 'scheduled' event is just an opt-in choice in one node; the if-absent clue-recovery path is dead content. Zero teams got this right, which means the engine offers no enforced hook for it â€” authors treat it as prose flavor because nothing forces it to be a real trigger. |
| Relationships gating content | STRONG | Worked reliably across all three: trust tiers gate confessions, boats, and microfilm, and Team 1/2 even SHOW the threshold diegetically (rope looped vs tied, chain on vs off). The main weakness is tuning (locks that rarely trigger) and, in Team 3, variable overloading â€” both fixable polish, not structural failure. |
| Clue / knowledge-gating | STRONG | The standout success. All three built a clean clue-unlocks-dialogue spine, and all three playtesters independently called it the moment the world felt alive. This is the feature to build the pitch around â€” it is the proof the concept can work. |
| Multiple endings from accumulated state | WEAK | Failed across the board: hardwired to choices not state, non-exhaustive cascades (zero-match dead-ends), dead-code endings, and prose that contradicts the state flags. The 'endings emerge from everything you did' promise is currently fiction in all three. Needs a real state-resolver, not choice->ending links. |
| Light open-world feel (costed travel/gambles) | WEAK | Directly dependent on the broken clock. The marquee 'costed gamble' (lighthouse 70-min round trip, canal detour) is free in all three because time is infinite, so the open-world tension is purely cosmetic. Fix the clock and this likely recovers â€” but today it is not delivered. |
| Writer-side authorability | MIXED | Prose authorability is clearly strong (three teams, high consistent quality). But the SYSTEMS authorability is the problem: the same four traps caught three isolated teams, meaning the engine currently lets authors write a CYOA book by accident while believing they built a living world. The PRD's own risk list predicted these exact failures. Authorable as a book; not yet authorable as a simulation without tooling/guardrails. |

## Prioritized changes

### P0 - do before building

- **Make the engine ENFORCE the clock, not the author. Move time-budget validation into the engine: derive all displayed time from start + accumulated add_minutes (ban hardcoded node 'time' fields), and ship a build-time linter that computes the longest reachable path and fails the build if the deadline cannot expire. Then recalibrate every chapter's per-action costs ~2.5-3x so optimal play lands near the deadline and any detour genuinely risks missing it.**
    - *Why:* All three teams independently shipped an inert clock AND hardcoded contradictory timestamps to hide it. This is not three mistakes; it is one engine gap. The clock is the spine of every premise, and it cannot be left to author discipline.
    - *Raised by team(s):* 1, 2, 3
- **Replace choice->ending links with a single state-resolver node. Endings must be selected by evaluating documented conditions over accumulated state (trust, flags, clues, time) at the resolution point, with a guaranteed exhaustive cascade (a mandatory catch-all default) so no reachable state matches zero endings.**
    - *Why:* Hardwired endings caused the worst immersion breaks in all three: Reyes ferries you out at trust=1, failed runs fall through to the hero ending, a clean run matches no ending and falls through the floor. State and fiction must agree or the entire reactivity promise is fake.
    - *Raised by team(s):* 1, 2, 3
- **Make scheduled events real engine triggers with a mandatory if-absent path. The engine must fire the event on the accumulated clock regardless of location, apply the world-state change, and plant the discoverable clue at the relevant location automatically. Add a linter check that every scheduled event has a reachable if-absent recovery node.**
    - *Why:* The 'world moves without you' feature â€” the thing that most distinguishes this engine from a CYOA book â€” is unimplemented in all three chapters. Authors treat it as prose because nothing in the engine forces it to be a trigger.
    - *Raised by team(s):* 1, 2, 3

### P1 - soon

- **Guarantee the bleak/fail ending is reachable from the clock. Once the deadline bites, the 'missed every exit / world moved without you' ending must emerge from running out of time, not from one hand-authored low-trust branch or an unsatisfiable time gate.**
    - *Why:* Each team's fail-state was broken differently (orphaned, dead code, self-contradicting gate), proving it is the hardest ending to wire. It is also the thematic payoff of the whole clock, so it deserves an explicit engine-level path.
    - *Raised by team(s):* 1, 2, 3
- **Reconcile ending prose with state flags. No ending may narrate an outcome (the town drowned, the gate failed) unless the corresponding flag is actually set on the path that reached it. Add this as a review checklist item per ending.**
    - *Why:* Team 1's sharpest immersion-breaker: three endings assert a flood the bookkeeping never produced. Same root cause as the missing scheduled event, but needs an explicit prose-audit pass even after the event is wired.
    - *Raised by team(s):* 1
- **Validate alternate knowledge routes actually set the gating flag. When a primary clue source is locked (e.g. high suspicion seals the Cold Room), the documented fallback must set the SAME knowledge flag (knows_murder), not merely add a lesser clue, or the player is silently railroaded into the worst ending.**
    - *Why:* Team 2: a locked-out player can never set knows_murder and is funneled into 'Walked Away' with no signposting. Single-point-of-failure clue gates need verified, flag-equivalent alternates.
    - *Raised by team(s):* 2

### P2 - later

- **Add a PRD guardrail: one variable means one thing. Forbid overloading a single number with trust/suspicion/enemy-pressure semantics; split into distinct variables and make ending gates legible.**
    - *Why:* Team 3's volkov_suspicion meant three contradictory things, making endings feel like a coin flip. Cheap to prevent with a naming/semantics rule before authoring.
    - *Raised by team(s):* 3
- **Telegraph silent-loss and obey-the-handler traps in prose. Warn the player when an in-character choice forfeits the prize (walking off without the real microfilm) or when the obvious early move is gated (satchel search), and give the loyal/cautious reading a non-degenerate path.**
    - *Why:* Teams 3 (and 1's early-wait railroad) punish reasonable in-character choices invisibly, which reads as the system being unfair rather than reactive. Player-clarity polish, not structural.
    - *Raised by team(s):* 1, 3

## Standout ideas worth keeping

- Team 1's double-routed evidence: Doyle's suspicion lets you reach the same gate logs via TWO fictionally distinct routes (play-along/carelessness vs press-hard/panic). A genuine systemic touch where one variable produces different felt paths to the same state.
- Team 1's SHOWN relationship beats: Reyes loops the rope loose to throw vs ties it down tight; the trust threshold is visible in the fiction, not just a number. The +2 apology vs +1 truth economy makes generosity feel mathematically rewarded.
- Team 3's two-films device: a worthless decoy vs the real microfilm hidden on the defector's body makes trust mechanically load-bearing in a way the player can see and reason about â€” the cleanest example of relationship-as-mechanic across all three.
- Team 3's scheduled-handoff TWIST: the canal receiver turning out to be the handler's own runner, not a Soviet, is an earned dramatic high point that only lands because you witnessed (or missed) a timed world event. This is the best argument for why scheduled events are worth fixing.
- Team 2's diegetically-signposted trust tiers: chain-on vs chain-off, hostile vs candlelit cottage â€” the player reads the relationship threshold from the scene description instead of a stat screen. The model for legible relationship gating.
- Team 2's graceful clue-lock fallback: town_suspicion>=3 seals the Cold Room but routes to logbook/cottage instead of dead-ending â€” the right pattern for 'a closed door opens another,' even though it currently triggers too rarely.
- Team 2's 'Just the Paperwork' ending concept: the most haunting outcome is the one where the player feels fine, files the accident in good faith, and never knew how close they stood to the truth. A sophisticated use of the knowledge-vs-world distinction.

## Are we asking too much?

"No on content and scope â€” but YES on the implicit assumption that authors can hand-wire these systems correctly from prose intent. The honest finding is structural: three skilled teams, working in complete isolation, each wrote excellent chapters and each independently fell into the SAME four traps (inert clock, contradictory hardcoded timestamps, fake scheduled events, choice-hardwired endings). When isolated teams converge on identical failures, the problem is not the teams â€” it is that the engine and PRD make these failures the path of least resistance. The PRD's own risk list predicted every one of them, which means the risks were understood but not engineered against. So the founder is not asking too much of the STORY; they are asking too much of unaided AUTHORING. The fix is not 'try harder' or 'cut scope' â€” it is to move the four pillars from author-discipline into engine-enforced primitives plus a build-time linter (path-length check, exhaustive-ending check, scheduled-event-has-absent-path check). Do that and the ambition is correctly sized. Ship as-is and you get exactly the CYOA-with-bookkeeping the founder fears, three times over."

## Recommended next step

"Before authoring any more chapters, harden the engine and add a linter â€” do not fix the three chapters first. Specifically: (1) make time engine-derived and ban hardcoded node timestamps; (2) make scheduled events fire on the accumulated clock with a mandatory if-absent clue path; (3) replace choice->ending links with a single state-resolver that requires an exhaustive cascade. Then ship a build-time validator that fails on three checks: the longest reachable path cannot exceed the deadline, every reachable end-state matches exactly one ending, and every scheduled event has a reachable absent-path recovery. Re-run Team 3's 'The Prater Line' (smallest at 21 nodes, strongest reactive spine, cleanest twist) through the hardened engine as the reference implementation. If the clock bites and the endings resolve from state in that one chapter, you have proven the living-world thesis and can scale authoring with confidence."

---

# Team 1 - The Last Bell at Pelican Reach

**Genre:** Disaster / evacuation thriller with light mystery  
**Playtest verdict:** go_with_changes  
**Logline:** A storm-surge siren tech has one tide cycle to warn a stubborn coastal town, find out why the new flood gate won't close, and decide who is worth saving before the sea takes the road out.

- **Setting:** Pelican Reach, a sinking Gulf-coast barrier town, on the afternoon and evening of a Category 3 landfall, 2026. One causeway out. Six hours from the first siren to the surge.
- **Protagonist:** Wren Okafor, 31, the county's only on-site emergency siren and flood-gate technician, who grew up here and left, and is the one person who knows the warning system is half-broken.
- **Tone:** Tense, salt-and-rust atmospheric, morally grey; quiet dread punctuated by hard timed decisions.
- **Core tension:** The official evacuation order is a lie of convenience: the new automated flood gate is jammed and the town's siren grid only half works. Wren can save the town, save a few people, or save the truth about who sabotaged the gate, but the clock and the tide will not let her do all three.
- **The clock:** A hard 6-hour tide window from 14:00 (first advisory) to 20:00 (surge peak). Travel between locations costs 10-40 minutes; key scheduled events fire on the clock; the causeway floods and becomes impassable at 19:00, hard-locking the map and forcing an ending.

## Locations

- **Pump House 7 (Siren Control)** - A cinderblock bunker on the dune line housing the siren master panel and the manual override for the new flood gate. Smells of ozone and standing water; a red fault light blinks on the gate relay. *(Home base and the knowledge hub. Here Wren can learn the gate is sabotaged (clue), test the siren grid, and ultimately choose manual-close the gate. The discovery that unlocks the conspiracy path lives here.)*
- **Tillet's Harbor & Bait Dock** - A working dock of shrimp boats, diesel sheen, and Captain Reyes's wheelhouse. Boats strain against their lines as the chop builds. *(The evacuation-by-sea alternative and Reyes relationship hub. High trust unlocks a boat lift for stranded people; low trust and Reyes leaves without you.)*
- **The Salt Lick Diner** - A chrome-and-vinyl holdout on Main where the old-timers refuse to leave, nursing coffee and stubbornness under a buzzing TV hurricane map. *(The civilian-persuasion hub. Convincing the holdouts to evacuate is gated by the mayor's public statement and by what Wren knows. Source of a witness clue.)*
- **Pelican Reach Town Hall** - A sandbagged municipal building where Mayor Doyle is staging a calm press line that the gate 'is functioning normally.' Phones ringing off the hook. *(Authority and suspicion hub. Doyle's trust/suspicion gates access to the gate logs; confronting him is the conspiracy spine. Scheduled press conference fires here.)*
- **The Causeway & Toll Booth** - The single two-lane bridge to the mainland, water already licking the low span. A county trooper waves cars through against the wind. *(The literal exit and the hard map-lock. Floods at 19:00. The bottleneck that makes every minute spent elsewhere a real cost.)*
- **The Verrazano Flood Gate** - The town's pride: a massive new automated sea gate at the channel mouth, motor housing open, a maintenance van parked wrong, a cut control cable swinging in the wind. *(The scheduled-event epicenter. The gate fails to auto-close at 18:00 whether or not Wren is present. Witnessing it vs. finding it failed produces different clues and different endings.)*

## Characters

- **Wren Okafor** - Protagonist; siren/flood-gate technician, hometown returner, the only one who knows the system is broken.
- **Captain Marisol Reyes** - Shrimp-boat captain and former family friend; the sea-evacuation lifeline. Warm but burned by Wren leaving town. *(var: reyes_trust)*
- **Mayor Cal Doyle** - Affable, cornered mayor managing the optics of a failing gate he green-lit on a cheap contract; antagonist-or-ally depending on play. *(var: doyle_suspicion)*
- **Sela Okafor** - Wren's younger sister and a Salt Lick Diner waitress who won't leave while the old-timers stay; the emotional stakes and a witness to the sabotage van. *(var: sela_trust)*
- **Deputy Frank Tillet** - Causeway trooper and the contractor's cousin; either a roadblock or a reluctant confessor about who cut the cable.

## Engine features exercised

- **Direct branching choices:** At every node Wren picks readable options, e.g. at Pump House 7: 'Run the full siren self-test (+20 min)' vs 'Skip the test and drive to the harbor.' At the gate: 'Manually crank the gate closed' vs 'Photograph the cut cable and leave.'
- **Time / deadline:** A 6-hour clock from 14:00 to 20:00. Every choice has an add_minutes cost (siren test +20, drive to causeway +25). The surge peaks at 20:00 and the causeway floods at 19:00, so total spent time directly decides which ending is still reachable.
- **Location / travel:** 6 named locations on a small map with explicit travel times (Pump House->Harbor 15 min, Town Hall->Diner 10 min, anywhere->Causeway 25 min). change_location effects move Wren and add_minutes; the engine picks the best node at each place by time and knowledge.
- **Relationship variables:** reyes_trust and sela_trust both gate content: Reyes only lends the boat for a mass rescue if reyes_trust >= 3; Sela only rallies the diner holdouts to evacuate if sela_trust >= 2. doyle_suspicion blocks or opens the gate-log confrontation.
- **Clue / knowledge gate:** The choice 'Ask Deputy Tillet who parked the maintenance van' appears ONLY after add_clue('saw_cut_cable') is set (from inspecting the gate or Sela's witness account). Without the clue that confrontation node is unavailable, so the conspiracy ending is locked behind knowing.
- **Scheduled event:** The automated flood gate's 18:00 auto-close failure fires on the clock at any location via a scheduled event with if-present and if-absent branches, independent of Wren's actions.
- **Missed-event consequence:** If Wren is NOT at the gate at 18:00, the gate silently fails to close; the engine sets gate_open=true and add_clue('found_gate_failed_open') discoverable on any later visit (water already pouring through), so missing the event opens the 'find it failed' path and the salvage/conspiracy endings rather than dead-ending.
- **Multiple endings:** 5 endings selected purely from accumulated state (time remaining, gate_open, reyes_trust, sela_trust, doyle_suspicion, evacuees count, clues held) when the causeway locks at 19:00 or the surge hits at 20:00.

## Scheduled event

**The 18:00 Gate Failure (Verrazano auto-close)** - trigger: Clock reaches 18:00 AND gate has not been manually closed (gate_manually_closed is_false). Fires regardless of Wren's location.

- *If present:* If Wren is at the Verrazano Flood Gate at 18:00, she witnesses the auto-close sequence stall: the motor screams, the cut control cable sparks, the gate jerks halfway and stops. She gets a live timed choice â€” 'Crank it closed by hand (+40 min, blocks the surge but strands her past the causeway lock)' or 'Abandon it and run for the bridge.' Sets witnessed_sabotage=true and add_clue('saw_cut_cable').
- *If absent:* If Wren is elsewhere, the gate silently fails to seal. Effects: set gate_open=true, set town_flooding=true, mark_event_completed('gate_failed'). It leaves a discoverable clue: any later entry to the gate or harbor triggers add_clue('found_gate_failed_open') â€” water already surging through the half-open gate and the same cut cable visible â€” so the truth and the salvage/blame paths stay reachable; the player is never dead-ended, only routed onto a grimmer branch.

## Endings

- **Held the Line** - Wren manually seals the Verrazano gate before the surge, the town floods only ankle-deep, and Reyes ferries the last stragglers off the dock. Pelican Reach survives bruised but standing. Wren misses the easy causeway exit and rides out the night on Reyes's boat â€” and the cut cable is still in her pocket as evidence for chapter two. *(conditions: gate_manually_closed == true AND time_of_close before 18:40 (cranked it in time) AND reyes_trust >= 2)*
- **The Ferryman's Bargain** - The gate is lost and the water comes, but Wren spent her hours earning Reyes and Sela's trust instead of fighting the sea. The shrimp boat runs three overloaded trips; the town drowns but most of its people don't. A hero's win that cost the town itself â€” and left the saboteur unnamed. *(conditions: gate_open == true AND reyes_trust >= 3 AND evacuees >= 8 AND on_boat == true)*
- **The Paper Trail** - Wren chooses the truth over the rescue: she pulls the gate logs, photographs the cut cable, gets Deputy Tillet's half-confession, and makes the 19:00 causeway with the evidence. Fewer people got out, but the cheap-contract conspiracy that doomed the gate is exposed â€” the hook that drives chapter two. *(conditions: clues contains 'saw_cut_cable' AND clues contains 'gate_log_pulled' AND doyle_suspicion >= 4 AND escaped_via_causeway == true)*
- **The Last Bell** - Wren can't stop the water, but the full siren grid she repaired actually sounds, Sela empties the diner, and a thin stream of cars beats the causeway flood. A small, human, partial save â€” the town is gone but its people heard the bell in time. *(conditions: sela_trust >= 2 AND siren_grid_tested == true AND time at causeway lock < 19:00 AND evacuees >= 4 AND gate not manually closed)*
- **What the Tide Took** - Wren spent her six hours hesitating â€” chasing the wrong lead, mistrusted by everyone, present for nothing. The gate fails unwitnessed, the causeway floods at 19:00 with her on the wrong side, and the surge finds her at Pump House 7 with the override two feet underwater. The bleak ending the world hands you when you let it move forward without you. *(conditions: At 20:00: gate_open == true AND escaped_via_causeway == false AND on_boat == false (missed every exit and the scheduled gate event))*

## Designer's own stated risks

- Authoring cost is the real threat: 5 endings x meaningful state combinations means many condition permutations to hand-tune. With only AND logic (no OR), every 'either of these clues works' case must be split into duplicate nodes/choices, which roughly doubles node count for the gate/diner persuasion scenes â€” the honest answer is that 12 nodes is tight and this likely wants 14-16 to not feel thin.
- The reactivity can read as bookkeeping if the prose doesn't SHOW the state change. If 'reyes_trust +1' just silently ticks, the player feels a CYOA with a spreadsheet. Every effect needs a visible narrative beat (Reyes uncoils a rope vs. turns his back), and that authorial discipline, not the engine, is what sells 'living world.'
- The scheduled gate event is the best showcase but also the most testable failure point: if the if-absent clue isn't reliably injected on the NEXT visit to any relevant location, a player who skips the gate hits a dead end â€” exactly the principle we must not violate. This needs explicit 'on enter, if gate_failed and not yet seen, add clue' logic, which is easy to forget.
- The clock makes optimal play feel punishing: a first-time reader doesn't know travel costs, so they may blow the tide on exploration and only ever see end_stranded, concluding the game is unfair rather than reactive. Chapter one probably needs a soft early signal of how much time things cost, or the 'living world' reads as 'gotcha world.'
- Five endings risk being unevenly weighted â€” 'Ferryman' and 'Paper Trail' are clearly the rich ones; 'Held the Line' and 'Last Bell' may feel like near-duplicates of a partial save. Without distinct epilogue prose and a distinct chapter-two hook each, two of the five endings add bookkeeping without adding felt difference.
- doyle_suspicion does double duty as both 'unlock the confrontation' and 'block the confrontation' depending on threshold, which is elegant but easy to mis-tune into an unwinnable Paper Trail path where the player can never get suspicion into the required band. The trust/suspicion gating windows need playtesting, not just authoring.

## Playtest findings

**Verdict:** go_with_changes - The prose, the clue-gated conspiracy spine, and the SHOWN relationship beats are genuinely strong and prove the concept can read as a living world on at least one axis. But three of the four pillars the design sells â€” the scheduled gate failure, state-selected endings, and an enforced clock â€” are not actually implemented in the written chapter. As-is it plays as a high-quality CYOA whose endings assert a disaster the bookkeeping never produces. These are fixable without a rewrite: they're engine/wiring fixes plus prose reconciliation, not a new story. So: go, but only with the scheduled-event, ending-resolver, and clock-enforcement changes done first. Shipping as written would deliver the exact 'spreadsheet with no felt consequence' failure the designer's own risks predicted.

### Playthroughs walked by hand

- **A â€” The Paper Trail (conspiracy run)** -> ending: *node_end_paper_trail (The Paper Trail)*
    - Felt like: Felt the MOST like a living world of the three. The clue-gate genuinely shapes dialogue: 'Name the contractor' only exists because Sela's witness account is in your pocket, and Tillet's confession is locked behind the same clue. Doyle's two-faced gating (play-along vs press) producing different routes to the same cabinet is elegant. BUT the world never reacted to the central physical fact: gate_open stayed false the entire run because no scheduled event fired, so the town never flooded â€” yet the ending prose insists Pelican Reach 'drowned.' The reactivity is real on the conspiracy axis and broken on the disaster axis.
- **B â€” Ferryman (earn the boat, skip the gate)** -> ending: *node_end_ferryman (The Ferryman's Bargain)*
    - Felt like: Emotionally the richest writing (the bucket, 'you came back'), and the trust gate is legible â€” apology is the only +2 so a player feels the math reward generosity. But MECHANICALLY hollow at the climax: I reached Ferryman with gate_open=false and on a clock around 16:00â€“17:00. The ending prose describes the gate failing and the town drowning, but that state was NEVER SET on this path. node_harbor_lift's Ferryman condition checks reyes_trust and reyes_will_lift but NOT gate_open, so you get 'the gate is lost' narration over a gate that, in state, is fine and unattended. It reads as a CYOA book whose ending was written assuming a flood the bookkeeping never produced.
- **C â€” Witness the gate, hold the line** -> ending: *node_end_held_line (Held the Line)*
    - Felt like: The gate set-piece is vivid and the manual-crank choice has real teeth (seal the town but strand yourself). But this path exposes the worst design flaw: the Held the Line ENDING CONDITION per the design doc requires reyes_trust>=2, yet node_floodgate_wait routes DIRECTLY to node_end_held_line with no reyes check at all. On this efficient path reyes_trust is still 1 (untouched), so a player who never visited Reyes still gets the 'Reyes ferries you off' epilogue â€” the relationship payoff fires for a relationship that doesn't exist. Living world? No: the ending is hardwired to the choice, not the state.

### What works

- The clue-gate on the conspiracy spine is genuinely reactive: 'Name the contractor' (node_townhall_press) and 'Ask Tillet who cut the cable' (node_causeway) only exist if you hold saw_cut_cable, so the mystery dialogue visibly bends to what you know.
- Doyle's suspicion doing double duty (play-along at node_townhall_along still yields logs via carelessness; press-hard at node_townhall_press yields logs via panic) gives two fictionally distinct routes to the same evidence â€” a real systemic touch.
- Relationship effects are SHOWN, not just ticked: Reyes loops the rope loose to throw (node_harbor_truth) vs ties it down tight (node_harbor_official). This is exactly the 'visible narrative beat' the designer flagged as necessary.
- The apology being a +2 while truth/official are +1/0 makes the trust economy legible and rewards the emotionally generous read.
- Prose quality is high and consistent in voice; the salt-and-rust atmosphere lands.

### What breaks

- **[HIGH / mechanical]** The scheduled 18:00 gate-failure event from the design DOES NOT EXIST in the written chapter. Gate failure only occurs inside node_floodgate_wait, which requires being physically at the gate AND choosing to wait. Any path that skips the gate (Path A, Path B) ends with gate_open=false forever, so the 'if-absent: silently fail, set gate_open=true, inject found_gate_failed_open on next visit' mechanic â€” the design's showcase feature â€” is entirely unimplemented. - This is the single most-touted feature and the designer's own #3 risk ('easy to forget the on-enter inject'). Its absence means the 'find it failed' branch is unreachable except by physically going to the gate and choosing to leave, which defeats the whole point. node_causeway_discover_fail is gated on gate_open==true, a flag nothing off-gate ever sets, so that node is effectively DEAD CODE on most paths. *(missing scheduled event; node_floodgate_wait is the only place gate_open/town_flooding get set)*
- **[HIGH / mechanical]** Ending conditions in the design are not enforced by the nodes. node_floodgate_wait -> node_end_held_line has NO reyes_trust>=2 check, so you reach 'Held the Line' (whose epilogue features Reyes ferrying you out) with reyes_trust=1 and zero Reyes scenes played. - The endings are supposed to be 'selected purely from accumulated state.' Instead they're hardwired destinations on choices. The fiction then asserts relationships and outcomes the state contradicts (Reyes shows up for someone she never trusted). *(node_floodgate_wait 'Crank it closed' choice; node_end_held_line)*
- **[HIGH / mechanical]** The clock is decorative, not enforced. Node 'time' headers are hardcoded and contradict the accumulated add_minutes. Path C reaches node_floodgate_wait (forced 18:00) at a real accumulated time near 14:55. Path A reaches node_causeway (forced 17:00) near 16:20. - The entire premise is a hard 6-hour tide clock where 'total spent time directly decides which ending is reachable.' But nodes jump time forward by fiat. A player can dawdle or rush and hit the same scripted timestamps, so the 19:00 causeway lock and 20:00 surge â€” the core tension â€” never actually constrain anyone. The clock is a prop. *(node_floodgate_early (header 16:30 reachable by 14:55), node_floodgate_wait (forced 18:00), node_causeway (forced 17:00))*
- **[MEDIUM / mechanical]** node_end_stranded (What the Tide Took) is nearly unreachable. The only path to it is node_harbor_lift's 'boat already gone (reyes<2)' choice, which requires you to have traveled to the harbor at the end with low Reyes trust. A player who simply runs out of options elsewhere has no route there. - The design frames Stranded as the 'let the world move without you' fail-state triggered at 20:00 by missing every exit. As written it's a single hand-authored dead-end behind a specific low-trust harbor visit, not an emergent consequence of the clock. The bleak ending the clock is supposed to produce is orphaned. *(node_end_stranded only inbound from node_harbor_lift)*
- **[HIGH / narrative]** Two endings assert the town drowned over state where it didn't. Paper Trail prose: 'the conspiracy that drowned Pelican Reach'; Ferryman prose: 'the gate is lost... the town drowns' â€” both reachable with gate_open=false. - The flood is the spine of the disaster, and the endings narrate it as fact while the world-state says the gate is intact and unattended. A player who paid attention to the fiction (panel honest, gate untouched) gets told the town drowned with no causal event shown. This is the sharpest immersion-breaker. *(node_end_paper_trail, node_end_ferryman vs unset gate_open)*
- **[MEDIUM / narrative]** node_end_last_bell is reachable with gate not manually closed but ALSO with gate_open=false. Its prose says 'the gate failed, the streets are a sea,' but on the path that reaches it (e.g. via node_causeway 'sound the grid') no flooding flag was ever set. - Same root cause as above: endings describe a flood the state machine never executed because the scheduled failure isn't implemented. *(node_causeway -> node_end_last_bell; node_floodgate_wait was never visited)*
- **[LOW / player-clarity]** Travel-time asymmetry breaks spatial sense. Pump House -> Flood Gate is +25 (node_pumphouse_relay) but Harbor -> Flood Gate is +30 and Diner -> Flood Gate is +25, while design says 'anywhere -> Causeway 25.' Causeway times vary (+25 from townhall, +15 to cross). There is no consistent map. - A first-time player can't build a mental map of the island to budget the clock â€” which the designer flagged as risk #4 (the 'gotcha world'). Minor because the clock isn't enforced anyway, but if it WERE enforced this would be unfair. *(travel costs across node_harbor_*, node_diner_*, node_townhall_*)*
- **[MEDIUM / player-clarity]** node_floodgate_wait can be entered far before 18:00 yet forces an 18:00 wait with no time cost for the waiting itself, and offers no way to do anything else in the intervening hours. - If a player arrives at ~15:00 and chooses to stay, they burn ~3 hours of tide doing nothing while other locations (diner pact, Reyes, logs) go untouched â€” but the node hides this by jumping to 18:00. Either it should refuse early-wait or show the opportunity cost. As written it's a railroad disguised as a choice. *(node_floodgate_early 'stay to wait' -> node_floodgate_wait)*
- **[LOW / authoring]** node_end_paper_or_stranded_check is a transition node placed AFTER escaped_via_causeway is already set, then routes to Paper Trail or 'Drove Out Thin.' But the design's Paper Trail requires escaped_via_causeway==true AND the fallback 'Drove Out Thin' is a 6th ending not in the design's 5. - The chapter quietly added a 6th ending to paper over the AND-only gating the designer warned about (risk #1). It works, but it signals the 5-ending design was already insufficient and the author had to patch the gap â€” confirming the authoring-cost risk is real. *(node_end_paper_or_stranded_check, node_end_drove_out_thin)*

### Biggest narrative problem

The town drowns in the prose of three separate endings (Paper Trail, Ferryman, Last Bell) on paths where the world-state flag for flooding (gate_open / town_flooding) was never set, because the design's headline feature â€” the 18:00 scheduled gate-failure that fires regardless of location â€” was never implemented. The gate only fails if you stand at it and choose to wait. So a careful player who skipped the gate is told, with no on-screen causal event, that the Gulf poured through the Verrazano and Pelican Reach drowned â€” while the last thing the fiction showed them was a sabotaged-but-physically-intact gate sitting unattended. The disaster is asserted, not simulated. That single gap turns the 'living world' into a CYOA book whose endings were written for a flood the bookkeeping never delivers."

### Is this asking too much?

Not by content â€” 12 written nodes + 6 endings is a real, completable chapter and the prose is already authored at quality. The overreach is in the GAP between the design's systemic ambition (engine-level scheduled events, state-resolved endings, an enforced tide clock) and what the nodes actually encode (hardcoded times, choice-hardwired endings, a flood flag almost nothing sets). The designer's own risk list predicted exactly these failures (authoring cost, cosmetic reactivity, the easy-to-forget on-enter inject). It's realistic to author â€” but only if the team treats the engine features as build requirements, not prose flavor. Right now the chapter quietly cheats them, which is why it reads as bookkeeping at the climax."

### Required changes

- **Actually implement the 18:00 scheduled event as an engine-level clock trigger independent of nodes: when accumulated time crosses 18:00 and gate_manually_closed is false, set gate_open=true, town_flooding=true, mark_event_completed('gate_failed'). Add an on-enter hook to Causeway, Harbor, FloodGate, and PumpHouse that injects found_gate_failed_open if gate_failed and not yet seen.** - Without this the whole if-absent branch, node_causeway_discover_fail, and the dead-ending guarantee don't exist. This is the feature the design is sold on; right now it's vaporware.
- **Make endings state-selected, not hardwired destinations. Replace direct choice->ending links (e.g. node_floodgate_wait -> node_end_held_line) with a single resolver that evaluates the documented conditions (reyes_trust, gate flags, evacuees, clues, time) when the causeway locks at 19:00 or surge hits 20:00.** - Currently endings fire from the choice, so you get Held the Line (Reyes ferries you out) at reyes_trust=1, and flood prose over an intact gate. State and fiction must agree or the reactivity is fake.
- **Stop hardcoding node 'time' headers. Derive displayed time from accumulated add_minutes, and gate node availability on real time (e.g. node_floodgate_wait only valid if current time >= 17:50; refuse or fast-forward-with-cost an early wait). Enforce the 19:00 causeway lock and 20:00 surge from the real clock.** - The 6-hour tide is the core tension and it currently constrains nothing â€” players hit scripted timestamps regardless of how they spend time, so every 'minute costs' decision is theater.
- **Either fold node_end_drove_out_thin into the 5 documented endings or formally make it the 6th, and reconcile flood prose across Paper Trail / Ferryman / Last Bell so it only claims the town drowned when gate_open==true.** - A 6th ending appeared to patch AND-only gating, and three endings narrate a flood that may not have happened. Pick consistent fiction tied to the flag.
- **Add an explicit, reachable route to node_end_stranded driven by the 20:00 clock (missed every exit), not solely the node_harbor_lift low-trust branch.** - The designed fail-state is currently orphaned behind one specific harbor visit; the 'world moved without you' ending should emerge from the clock the design built it around.

---

# Team 2 - The Last Ferry from Vael Harbor

**Genre:** Atmospheric noir mystery / light open-world thriller  
**Playtest verdict:** go_with_changes  
**Logline:** A disgraced insurance investigator has one foggy evening to find out who really drowned in Vael Harbor before the last ferry leaves at midnight and strands her on an island that already wants her gone.

- **Setting:** Vael Harbor, a decaying fishing town on a tidal island off a cold northern coast. One main road, salt-rotted buildings, a lighthouse, and a ferry that runs only twice a day. The story takes place over a single evening, roughly 6:00 PM to midnight, as fog rolls in and the tide rises.
- **Protagonist:** Della Voss, 41, a former insurance fraud investigator quietly let go after she accused the wrong man. She came to Vael to sign off on a routine drowning payout and leave. Then she recognized the dead man's face. Observant, broke, allergic to being lied to, and out of professional credibility to spend.
- **Tone:** Cold, hushed, dread-soaked but grounded. Rain on tin roofs, lies told politely, kindness that might be a trap. Reads like a paperback noir you can walk around inside.
- **Core tension:** Everyone in Vael has a reason to want the drowning ruled an accident, and Della has until the last ferry to decide whether to expose the truth, take the bribe, or run â€” without knowing which choice gets her killed. What she KNOWS changes who she can confront, and the town does not wait for her to make up her mind.
- **The clock:** A hard deadline: the last ferry departs Vael Pier at 12:00 AM (midnight). Every action costs time (travel, conversations, searching). Miss the ferry and Della is trapped on the island overnight, which forces a different, darker set of endings. A scheduled event â€” the harbor bell at 9:00 PM â€” also restructures the world mid-chapter.

## Locations

- **Vael Pier** - A wind-scoured concrete jetty where the ferry ties up. A single sodium lamp, a chained life-ring, the ticket shed with its hand-painted schedule. The water below is black and patient. *(The exit and the clock made physical. Della starts near here; the midnight ferry departs here. Several endings resolve here. The 'if absent' clue for the scheduled event surfaces here.)*
- **The Drowned Anchor (tavern)** - The town's only pub â€” low beams, peat smoke, the kind of warm that makes you forget the cold wants you. Locals go quiet when an outsider walks in. *(Social hub. Where rumors, the bribe offer, and most relationship-building happen. Different scenes fire here by time and by who is present after the bell.)*
- **Bellweather's Cold Room** - The back room of the undertaker's shop, where the drowned man lies under a sheet on a steel table. Smells of brine and formaldehyde. The undertaker, Ines Bellweather, guards it. *(Where the central clue lives. Examining the body unlocks the knowledge gate that changes everything downstream.)*
- **Cleat Point Lighthouse** - Automated now, but the keeper's cottage at its base is lived in. A long wet walk out along the breakwater. The light sweeps the fog every twelve seconds. *(Where the witness (the old keeper) hides what he saw. Hard to reach, costs the most travel time â€” a real open-world risk/reward choice against the clock.)*
- **Harbormaster's Office** - A cramped tower room above the pier, full of tide charts, logbooks, and a brass bell rope that runs up through the ceiling. *(Holds the harbor logbook (documentary evidence) and the bell. The 9:00 PM scheduled event originates here. Confronting the harbormaster happens here.)*
- **The Tarrow Cottage** - A dark stone house at the edge of town with one lit window. The dead man's home, and his sister's. Net floats hang by the door like a warning. *(Emotional center and a second relationship anchor. The sister can give Della the truth or sell her out, depending on trust earned elsewhere.)*

## Characters

- **Della Voss** - Protagonist. The player. An outsider investigator with one night and no allies â€” yet.
- **Silas Crannock** - The harbormaster. Outwardly helpful, the man who certified the death an accident and who controls the ferry and the bell. Antagonist-or-ally depending on play. The bribe comes from him. *(var: crannock_trust)*
- **Maren Tarrow** - The dead man's sister, fishnet-mender, the only person in Vael with nothing to gain from the lie. The truth-keeper, if Della earns her. *(var: maren_trust)*
- **Ines Bellweather** - The undertaker. Tired, decent, scared of Crannock. Will let Della examine the body only if Della hasn't already burned her credibility in town. *(var: town_suspicion)*
- **Eli Goff** - The old lighthouse keeper. Saw the boat go out that night and the man who came back alone. A frightened witness who only speaks once Della already knows enough to ask the right question.
- **Jonah Tarrow** - The drowned man. Maren's brother. Never appears alive; his body and his secret drive the chapter. Della recognizes him from an old fraud case she was fired over.

## Engine features exercised

- **Direct branching choices (A/B/C):** At the bribe scene in the Harbormaster's Office, Della picks plainly: take the envelope, refuse it openly, or pocket it and lie that she'll cooperate. Each is an immediate authored fork with distinct effects (set bribe_taken, change crannock_trust, change town_suspicion).
- **State-driven branching (time/location/knowledge/relationship):** The same locations show different nodes by state: the Drowned Anchor before 9 PM is a rumor-gathering scene; after the bell it becomes a tense, half-empty room where only the bribe scene or a warning fires. The Cottage shows a hostile node if maren_trust < 2 and a confession node if maren_trust >= 2 AND knows_jonah_alive_recently is true.
- **Relationship variables that gate content:** maren_trust gates Maren's confession (need >= 2) and the 'Vindication' ending. crannock_trust gates safe passage and the bribe-cooperation path. town_suspicion (rising with aggressive/accusatory choices) can LOCK the Cold Room examination if it crosses 3 before Della gets there â€” a relationship effectively closing a door.
- **Clue/knowledge gate:** Examining Jonah's body in the Cold Room adds clue 'rope_burns_on_wrists' and sets knows_murder=true. ONLY then does the choice 'Ask Eli who tied him' appear at the Lighthouse, and only then does 'Confront Silas with the wrist marks' appear in the Office. Without the clue those nodes show weaker, non-accusatory choices.
- **Time / deadline (ticking clock):** Clock runs 6:00 PM to midnight. Travel and talk cost minutes (Pier<->Anchor 10 min, walk to Lighthouse 35 min each way). add_minutes on every choice. If hour reaches 24:00 the ferry node is gone and trapped=true, forcing the island-overnight endings.
- **Location / travel:** 6 connected locations form a small map with asymmetric travel times; the Lighthouse is deliberately far (70 min round trip), so visiting Eli is a costed gamble against the midnight ferry â€” the open-world tension the founder wants.
- **Scheduled event (fires whether present or not):** The Harbor Bell at 9:00 PM. If Della is in the Office she witnesses Crannock ring it and overhears why; if absent it still fires, changing town state and leaving a discoverable clue (see scheduledEvent).
- **Missed-event consequence (no dead end):** Missing the bell scene does not break the story: the world advances (boats leave, the Anchor empties, ferry_warning posted) and Della can still recover the information later by reading the tide log in the Office or noticing the empty moorings at the Pier â€” an alternate clue path to the same knowledge.
- **Multiple endings from accumulated state:** Five endings selected by a condition cascade over knows_murder, bribe_taken, maren_trust, crannock_trust, trapped, and made_ferry â€” evaluated at the resolution node.

## Scheduled event

**The 9:00 PM Harbor Bell** - trigger: time_after 21:00 (fires once, day 1, regardless of player location)

- *If present:* If Della is in the Harbormaster's Office at 9:00, she watches Silas Crannock haul the bell rope three times and quietly tell a fisherman, 'The Tarrow boat stays moored â€” nobody goes near Cleat Point tonight.' She gains clue 'crannock_blocked_lighthouse' and knows_crannock_hiding=true, which later unlocks a sharper confrontation choice and a trust path with Maren (she believes Della faster).
- *If absent:* The bell still rings across town. The world changes: set anchor_emptied=true (the tavern clears out, killing the rumor scene there), the fishing boats leave their moorings, and Crannock posts a weather notice at the Pier warning the midnight ferry 'may run early.' This leaves a discoverable clue: at the Pier, Della can read the notice (add_clue 'ferry_may_run_early') and at the Office the tide logbook now shows the Tarrow boat was logged 'in' at 8:50 PM in Crannock's hand â€” add_clue 'log_tampered' â€” recovering the hidden information by a different route so the path never dead-ends.

## Endings

- **Vindication** - Della boards the midnight ferry with the wrist-mark photos, the tampered logbook, and Maren's signed statement. She names Crannock from the mainland. It costs her the rest of the night's sleep and maybe her safety, but for the first time since she was fired she got the right man. Hook into chapter two: Crannock has friends on the mainland too. *(conditions: knows_murder is_true AND maren_trust gte 2 AND bribe_taken is_false AND made_ferry is_true)*
- **Bought and Gone** - Della signs the accident ruling, takes Crannock's envelope, and rides the ferry out with money in her coat and Jonah Tarrow's face in her dreams. The town keeps its secret. She tells herself she had no proof â€” even if she did. A quieter, guiltier chapter two: someone mails her the photo she pretended not to take. *(conditions: bribe_taken is_true AND made_ferry is_true)*
- **The Tide Doesn't Wait** - Chasing Eli's testimony at the Lighthouse, Della burns too many minutes; the ferry's lights pull away from the Pier without her. Trapped on the island overnight knowing what she knows, with Crannock now certain she's a threat. The screen goes to the sweep of the lighthouse beam. Chapter two opens at dawn â€” if she sees it. *(conditions: made_ferry is_false AND knows_murder is_true AND crannock_trust lt 0)*
- **Stranded, but Believed** - Della misses the ferry but Maren takes her in, bolts the cottage door, and tells her the whole story by candlelight. No evidence leaves the island tonight, but Della isn't alone, and now two people know. A slow-burn chapter two: building a case from inside the town that's hiding it. *(conditions: made_ferry is_false AND maren_trust gte 3)*
- **Just the Paperwork** - Della never made it to the Cold Room â€” too cautious, too slow, or too spooked. She files the drowning as an accident in good faith and leaves on the ferry, never knowing how close she stood to the truth. The most haunting ending precisely because she feels fine. Chapter two: the case reopens, and her signature is on the wrong line. *(conditions: knows_murder is_false AND made_ferry is_true)*

## Designer's own stated risks

- Authoring burden is real: even at 12-14 nodes, the conditional variants (a location showing 3-4 different bodies by time/trust/knowledge) mean each 'node' is closer to 3 sub-scenes of prose. The honest count of authored text blocks is closer to 30-35, not 14. This is the core truth the founder asked about â€” reactivity multiplies writing, not just logic.
- The clue gate (Cold Room body) is a single point of failure: most of the 'good' endings route through knows_murder. If a player gets town_suspicion too high early and locks the Cold Room, the design intends the Office logbook + Lighthouse as alternate routes to the same knowledge â€” but I have NOT fully guaranteed every player reaches one of those alternates, so a frustrating 'I felt railroaded into the dull ending' is possible. Needs a safety net node.
- The Lighthouse is a deliberate time-sink against the midnight clock, which is dramatically great but can feel like a punishing 'gotcha' the first time â€” a new player may not know 70 minutes is fatal until they've already spent it. May need a soft in-world warning (a posted travel-time sign) so the cost is legible BEFORE the commitment, or it reads as unfair rather than tense.
- Distinguishing 'felt reactive' from 'CYOA with bookkeeping' is genuinely at risk in the early nodes: the first 6 PM scene is mostly menu-like. The reactivity only becomes VISIBLE after the 9 PM bell and the body examination. If a playtester quits before 9 PM, the engine's whole thesis is invisible. The opening 15 minutes must seed at least one 'the world moved without me' beat earlier (e.g. a boat already gone when she arrives).
- Relationship math is coarse: maren_trust thresholds (2 and 3) doing heavy gating means a single missed +1 choice silently flips a player between 'Vindication' and 'Stranded' with no signposting. Players hate invisible thresholds. I'd want at least one diegetic readout of where they stand (Maren's body language described differently per tier), or it feels arbitrary on replay.
- OR-logic avoidance per the MVP forces node duplication: the bribe scene effectively needs separate node variants for high vs low crannock_trust, and the ending cascade has overlapping conditions (e.g. a player who took the bribe AND knows_murder) that must be ordered carefully or two endings could both qualify. Ending selection order is a bug surface I'm flagging now.

## Playtest findings

**Verdict:** go_with_changes - The writing and the knowledge-gate architecture are good enough that this is worth shipping â€” the bones of a genuinely reactive noir are here. But as authored it has four high-severity mechanical failures that any playthrough exposes: an unreachable deadline, two dead-code endings, a zero-match dead-end at the resolution node, and a scheduled event that doesn't actually schedule. These aren't polish items; they nullify the engine's whole thesis (the clock, the open-world gamble, the fires-whether-present event). They're also all fixable with rebudgeted time values, one default ending, and wiring the bell as a real time hook. Not 'too much' â€” the scope is right â€” but a flat 'go' would ship a story whose central mechanic is decorative. Fix the clock and the cascade and it delivers what it promises.

### Playthroughs walked by hand

- **A â€” Going for Vindication (body â†’ Maren â†’ logbook â†’ confront â†’ ferry)** -> ending: *Vindication (node_end_vindication)*
    - Felt like: The prose is genuinely good and the gates (bodyâ†’knows_murderâ†’Maren confessionâ†’confront) chain logically, so it READS reactive. But mechanically it is a CYOA book with bookkeeping wearing a clock costume. The 'last ferry at midnight' tension that the whole premise sells is a lie: this complete, optimal run ends at 7:35 PM on the accumulated clock with FOUR AND A HALF HOURS to spare. Nothing about the deadline ever pressed on a single decision. The lighthouse â€” the marquee risk/reward gamble â€” is strictly skippable and I was never tempted, because time is functionally infinite.
- **B â€” Bell-wait then confront, no Maren (exposes a dead end)** -> ending: *NONE â€” hard fall-through / dead end. Vindication needs maren_trust>=2 (have 0). Bought needs bribe (none). Walked_away needs knows_murder FALSE (it's true). Stranded needs time_after 24:00 (it's 19:55). Marked needs time_after 24:00 (19:55). No ending condition is satisfied.*
    - Felt like: This is the design collapsing. A perfectly sensible, in-character playthrough â€” see the body, witness the bell, refuse to grovel to the sister, confront the killer, run for the boat â€” arrives at the resolution node and matches ZERO endings. A player who knows it was murder, made the boat, and didn't take the bribe has nowhere to go. It feels like falling through the floor of the world.
- **C â€” Maximal dawdling to stress the clock** -> ending: *Just the Paperwork (node_end_walked_away)*
    - Felt like: Even deliberately taking the SLOWEST route â€” tavern, cottage, the full 70-minute lighthouse round trip, the long walk back â€” lands at 8:10 PM. The clock has nearly four hours of unused slack. The midnight deadline cannot be reached by any path the graph allows; the longest reachable chain accumulates roughly 120â€“180 minutes against a 360-minute budget. The 'ticking clock' is pure atmosphere with zero mechanical bite.

### What works

- Prose quality is strong and consistent â€” the noir voice, the cold-sea imagery, and the per-node tone hold up; this reads like a real paperback you can walk around in.
- The core clue gate is well constructed: examining the body sets knows_murder + rope_burns, and that single gate cleanly unlocks the sharper Eli question (node_eli_testimony), the Maren confession (node_cottage_first), and the Crannock confrontation (node_logbook/node_bell_present). When it fires, it genuinely feels like knowledge changing what you can say.
- The town_suspicion < 3 lock on node_examine_body is a real, legible door-closing mechanic with a graceful fallback (node_cold_room_refused routes to logbook/cottage), so burning credibility has visible cost without an instant dead end.
- Maren's trust tiers are diegetically signposted (chain-on vs chain-off, hostile vs candlelit), which is exactly the readable-threshold the design risks flagged as missing â€” here it's actually handled.
- The bribe scene offers three mechanically distinct, well-authored forks (take/pocket-and-lie/refuse) with different crannock_trust and downstream effects.

### What breaks

- **[HIGH / mechanical]** The midnight deadline is mathematically unreachable. The longest path the graph permits accumulates ~120â€“180 minutes against the 360-minute (18:00â†’24:00) budget. No sequence of choices can push the accumulated clock past midnight. - The clock is the spine of the entire premise ('one foggy evening', 'last ferry', the lighthouse as a costed gamble). If it can never run out, the central tension is decorative. The lighthouse 70-min round trip is sold as fatal but is free. Three playthroughs confirm this. *(global; node_ferry_resolution and every add_minutes value)*
- **[HIGH / mechanical]** Two of five endings are unreachable. node_end_stranded_safe and node_end_marked both require time_after 24:00, which no path can produce. - 40% of the authored endings â€” the entire 'trapped on the island overnight' darker half the design pitched â€” can never fire. That's a large chunk of written prose the player can never see, and the design's promised 'darker set of endings' simply does not exist in play. *(node_ferry_resolution branches 4 and 5; node_end_stranded_safe; node_end_marked)*
- **[HIGH / mechanical]** A clean, in-character path reaches node_ferry_resolution matching ZERO ending conditions (Path B: knows_murder=true, maren_trust=0, bribe_taken=false, made the boat). - The ending cascade has a hole: a player who solved the murder but never befriended Maren and refused the bribe satisfies none of the five condition sets. There is no catch-all/default ending. The story falls through the floor. *(node_ferry_resolution)*
- **[HIGH / mechanical]** Every node carries a hardcoded 'time' field that contradicts the accumulated add_minutes clock. - Two clocks disagree. If the engine displays/uses the node's time field, the player sees teleporting time and the bell 'at 9PM' fires whenever you walk in. If it uses accumulated minutes, the node labels lie. Either way the scheduled-event premise (a 9:00 bell that restructures the world) is broken â€” the bell is just a node you opt into, not a time-triggered event. *(all nodes; e.g. node_office_first time=19:30 reached at clock 18:10â€“19:10; node_bell_present time=21:00 reached at clock ~19:40; node_ferry_resolution time=23:30 reached at clock 19:35)*
- **[HIGH / mechanical]** The 9PM scheduled event does not actually fire on a schedule and has no 'if absent' path implemented. - The design promises the bell fires whether or not Della is present, setting anchor_emptied, posting ferry_may_run_early, and creating an alternate log_tampered clue route. In the actual graph the bell ONLY exists as a manual 'wait for 9PM' choice inside node_office_first. If you're never in the office you never trigger anything; anchor_emptied, the pier weather notice, and the absent-path clue are never set anywhere. The signature 'fires whether present or not' feature is entirely unimplemented. *(node_bell_present; scheduledEvent in design)*
- **[MEDIUM / narrative]** The waited_for_bell wait costs 60 minutes but the design's whole point of that hour (world advancing, tavern emptying) never happens; it's a dead 60-minute tax. - You burn an hour to watch one scene; because the clock has slack to spare and no other state advances during that hour, the time cost is invisible and meaningless â€” the opposite of the intended dramatic pressure. *(node_office_first 'wait for 9PM' choice)*
- **[MEDIUM / mechanical]** crannock_trust gate for end_marked (lt 0) is reachable but orphaned by the time gate; and bribe+knows_murder players are mis-sorted. - A player who takes the bribe AND knows it was murder hits the Bought branch (bribe gate listed second) and never the more interesting consequence â€” fine, but combined with the dead-end hole it shows the cascade was never exhaustively checked. Ending selection is a confirmed bug surface, exactly as the design's own risk #6 feared. *(node_ferry_resolution ordering)*
- **[LOW / narrative]** node_maren_wary is reached by BOTH the soft 'honestly don't know' (+1 trust) and the hard 'press her' (+0 trust) choices, but the destination prose assumes she softened. - After pressing her hard and earning nothing, the player still lands on a node where 'she doesn't close the door' and volunteers Jonah's whole backstory. The hostile choice produces the friendly outcome â€” the consequence contradicts the fiction. *(node_cottage_first choices 2 and 3 â†’ node_maren_wary)*
- **[MEDIUM / mechanical]** knows_murder gate is a single point of failure with an incompletely guaranteed alternate route, and the alternate doesn't actually set knows_murder. - If a player locks the Cold Room (town_suspicion>=3), the design says logbook+lighthouse recover the knowledge â€” but reading the logbook only adds clue log_tampered; it never sets knows_murder. And Eli refuses to talk without the rope clue. So a locked-out player can never set knows_murder and is railroaded into Walked Away with no signposting that a door closed permanently. *(node_logbook (log_tampered) and node_eli_vague)*
- **[LOW / player-clarity]** town_suspicion can only cross 3 with great effort, making the one genuine lock nearly inert. - Reaching town_suspicion 3 before the Cold Room requires stacking multiple aggressive choices early (booth +1, harsh reply +1, threaten Ines +1) AND going to the body last. Most players sail under it, so the design's one real relationship-closes-a-door mechanic rarely triggers â€” its absence makes the world feel less reactive than advertised. *(node_cold_room gate)*

### Biggest narrative problem

The entire story is built around a deadline that cannot be missed. 'You have until the last ferry leaves at midnight' is the logline, the title, and the source of every dramatic stake â€” yet across three playthroughs, including a deliberately maximal-dawdle run with the full lighthouse detour, the accumulated clock never gets past ~8:15 PM. Time is effectively infinite, the lighthouse 'gamble' has no downside, and the 40% of endings about being trapped overnight can never occur. A noir that promises 'which choice gets her killed' instead delivers 'do everything at your leisure and pick your favorite ending.' The dread is all in the prose; none of it is in the mechanics, which makes it a CYOA book that merely describes a clock rather than a world that runs on one."

### Is this asking too much?



### Required changes

- **Rebudget the clock so the deadline actually bites. Either inflate travel/conversation costs roughly 2.5â€“3x (Pierâ†”Anchor 10â†’20, town walks 15â†’25, lighthouse 35â†’50+ each way, scene beats 5â†’15) OR shrink the window, so an optimal investigation lands ~23:30 and the lighthouse detour genuinely risks missing the boat.** - Without this the premise, the title, and the lighthouse risk/reward are all fiction. This is the difference between a living world and a CYOA with a fake timer.
- **Delete the per-node hardcoded 'time' fields, or make the engine derive displayed time solely from 18:00 + accumulated minutes. Pick ONE clock.** - Two disagreeing clocks make the scheduled event nonsensical and the player's sense of time incoherent. The bell 'at 9PM' must fire at real clock 21:00, not whenever you open the office door.
- **Add a catch-all/default ending at node_ferry_resolution (e.g. a 'made the boat with what little you have' fallback) and re-verify the cascade is exhaustive over every reachable combination of knows_murder, bribe_taken, maren_trust, crannock_trust, made_ferry.** - A clean playthrough (Path B) currently matches zero endings and dead-ends. Every reachable state must resolve.
- **Implement the scheduled event as an actual time-triggered hook that fires once at clock 21:00 regardless of location, with the authored if-absent consequences (anchor_emptied, ferry_may_run_early notice at Pier, alternate log_tampered route) wired to real nodes/effects.** - Right now the bell is just an opt-in choice in one node; the 'fires whether present or not' feature and its entire alternate-clue safety net are unimplemented, so the design's headline reactivity beat does not exist in play.
- **Make the alternate knowledge route actually set knows_murder. Have node_logbook (log_tampered) plus one more corroborating clue, or a locked-Cold-Room safety node, set knows_murder=true so a high-suspicion player isn't silently railroaded into Walked Away.** - The Cold Room is a single point of failure; the promised alternate routes recover a clue but never the knows_murder flag that every good ending depends on.
- **Fix node_maren_wary so the 'press her hard' (no-trust) choice routes to a colder, less informative node than the 'honestly don't know' (+1 trust) choice.** - Currently the hostile and warm choices land on the same friendly outcome, contradicting the fiction and erasing the consequence of the aggressive choice.
- **Make trapped/island endings reachable once the clock is fixed, and reorder the ending cascade so bribe+knows_murder, and missed-ferry permutations, sort to the intended ending.** - Two endings are dead code today; after the clock fix they must be reachable and the overlapping conditions ordered deterministically.

---

# Team 3 - The Prater Line

**Genre:** Cold War espionage thriller (one-night defection)  
**Playtest verdict:** go_with_changes  
**Logline:** A junior CIA courier has six hours to walk a nervy Soviet scientist out of Vienna before the last train west leaves at 02:10 â€” but who is lying to whom changes everything, and the handoff that decides his fate happens at 23:30 whether you make it there or not.

- **Setting:** Vienna, the night of 14 November 1971. A cold, rain-slick city of trams, smoky coffeehouses, the lit Ferris wheel of the Prater, and the black water of the Danube Canal. The map is a handful of districts you cross on foot or by tram under a hard deadline.
- **Protagonist:** Cal Maddox, 26, a brand-new CIA field courier on his first solo night. Not a trained killer or master spy â€” a careful young man with a satchel, a cover passport, and orders he half-trusts. The player IS Cal: every read is his POV, every choice his judgment call.
- **Tone:** Tense, rain-soaked, morally grey. Sparse evocative prose in the Le CarrÃ© register â€” cigarette smoke, mistrust, small human tells. Quiet dread over action.
- **Core tension:** You must exfiltrate defecting physicist Irina Dragomir before 02:10, but you cannot tell from the prose alone who is straight with you â€” your own handler Lindqvist, the frightened Dragomir, or the KGB resident Volkov who keeps appearing where he shouldn't. Trust is currency and you are short on time to spend it.
- **The clock:** Hard deadline: the last neutral-corridor train leaves Westbahnhof at 02:10. Story opens at 20:00. Every move costs minutes (tram +10, walking a district +20, a long conversation +15-30). A fixed SCHEDULED EVENT â€” the canal-side document handoff â€” fires at 23:30 regardless of where you are. Miss the train and the night ends one way; make it with the wrong person and it ends another.

## Locations

- **The Margareten Safehouse** - A cramped third-floor flat above a shuttered tailor's, smelling of damp wool and instant coffee. A radio set hums under a blanket; a satchel waits on the table. Where the night begins. *(Home base and briefing point. Where you meet Lindqvist, receive (or refuse) the cover papers, and learn the official version of the plan. Returning here later can reveal whether Lindqvist lied to you.)*
- **Cafe Sperl** - A grand old coffeehouse with worn velvet booths and marble tables, half-empty at this hour. A pianist plays badly. Dragomir waits in the back booth, hands wrapped around a cold cup. *(Where you first meet the defector Irina Dragomir and build (or destroy) her trust. The hinge of the whole chapter â€” her trust gates whether she follows you, hands you the real microfilm, or bolts.)*
- **The Riesenrad (Prater Ferris Wheel)** - The great iron wheel turns slowly against the rain, gondolas swaying, fairground lights blurred. Cold, exposed, public â€” and the only place tall enough to see if you're being followed. *(Observation point and the alternate route to intercept the handoff. From a gondola you can spot Volkov's men below â€” a clue you can get nowhere else.)*
- **The Danubekanal Embankment** - A concrete walkway below street level where the black canal slides past graffiti and a single sodium lamp. Footsteps echo. A man in a long coat waits by the third bollard at 23:30. *(Site of the SCHEDULED handoff event at 23:30. Be present and you witness who really receives the documents; be absent and the drop still happens, leaving a discoverable clue behind.)*
- **The Third Bollard (dead-drop)** - Up close, the iron bollard has a loose cap. Inside, a film canister â€” or the empty rattle of one already taken. Chalk marks on the concrete tell a story to anyone who reads them. *(The discoverable clue site. If you miss the 23:30 handoff, coming here afterward lets you reconstruct what happened (and who took the film), keeping the path open instead of dead-ending.)*
- **Westbahnhof, Platform 3** - A vaulting iron-and-glass terminus, departures board clattering. The 02:10 to Salzburg and the neutral corridor west sits steaming. A conductor checks watches he does not own. *(The exit and the clock made physical. Whoever boards with you (or doesn't), and whether you arrive before 02:10, determines which ending fires.)*
- **The Aspern Bridge Underpass** - A dripping concrete underpass where the KGB resident Volkov suggests, with a thin smile, that you have been told only half the truth. Headlights sweep past overhead. *(Optional opposition contact. Only reachable once you know certain clues; here Volkov can flip the whole night into a double-cross or a clean burn of the operation.)*

## Characters

- **Cal Maddox** - Protagonist / player character. A green CIA courier on his first solo exfiltration. His judgment is yours.
- **Erik Lindqvist** - Cal's handler. Calm, paternal, runs the op by radio and in person at the safehouse. May be protecting Cal â€” or feeding him a story. Trust him too much and you walk into his version of the night. *(var: lindqvist_trust)*
- **Irina Dragomir** - The defecting Soviet physicist. Frightened, sharp, carrying microfilm she will only surrender to someone she believes. Her cooperation is the prize and the danger. *(var: dragomir_trust)*
- **Anatoly Volkov** - KGB resident in Vienna. The opposition. Appears where he shouldn't, hinting that Cal has been lied to. Can be avoided, confronted, or dealt with â€” each reshapes the ending. *(var: volkov_suspicion)*
- **The Man at the Third Bollard** - Unnamed courier of the 23:30 handoff. Identity is the mystery the scheduled event exists to reveal.

## Engine features exercised

- **Direct branching choices:** Every node offers readable A/B/C taps with no parser: at Cafe Sperl you can [Tell Dragomir the truth about the risk], [Reassure her with the cover story], or [Press her for the microfilm now] â€” each immediately forks dialogue and effects.
- **Time / deadline:** Clock starts 20:00, train leaves 02:10. add_minutes on every choice: tram +10, crossing a district on foot +20, a full conversation +15-30. Spend too long and you physically cannot reach Westbahnhof before 02:10, which forces ending_missed_train.
- **Location / travel:** 5-7 named nodes connected by a small map with real travel times via change_location + add_minutes. The engine picks the best available node at each location based on time/knowledge, so Cafe Sperl reads differently at 20:30 than at midnight after the handoff.
- **Relationship gating:** dragomir_trust gte 3 is required for the choice [She hands you the real microfilm]; below that she gives you a decoy. lindqvist_trust lt 2 unlocks the suspicious choice [Search the satchel he gave you]. volkov_suspicion gates whether Volkov offers a deal or simply burns you.
- **Clue / knowledge gate:** The choice [Ask Volkov why Dragomir was already blown] only appears if knows_dragomir_blown is_true â€” a clue obtainable only by riding the Riesenrad and spotting Volkov's men, OR by reading the chalk marks at the dead-drop. Knowing it transforms the Volkov conversation.
- **Scheduled event:** event_handoff fires at time 23:30 by trigger condition whether or not Cal is at loc_canal. If present he witnesses the real receiver; if absent the engine still applies the world-state change and plants a clue at loc_canal_drop.
- **Missed-event consequence:** Missing the 23:30 handoff does not break the story: it sets handoff_missed and leaves chalk marks + an empty/full canister at loc_canal_drop, so visiting afterward yields add_clue(knows_who_took_film), opening an alternate route to the same endings rather than a dead end.
- **Multiple endings:** Four endings selected purely from accumulated state (trust values, clues known, who is with you, current time vs 02:10) via AND-chained conditions on the final Westbahnhof node â€” no single 'win' branch; the night resolves from everything you did.

## Scheduled event

**The Canal Handoff** - trigger: Fires when game time reaches day 1, 23:30 â€” evaluated whether or not Cal is currently at loc_canal.

- *If present:* Cal, on the embankment at 23:30, watches the man at the third bollard hand a film canister not to a Soviet but to Lindqvist's own runner â€” proof the operation is being doubled. Effects: add_clue(saw_real_receiver), set(handoff_witnessed=true), increment(volkov_suspicion). This unlocks the [Confront Lindqvist] and double-agent paths.
- *If absent:* The drop happens without a witness. Effects: set(handoff_missed=true), the world-state still flips (film is taken), and a clue is planted at loc_canal_drop: chalk marks + an empty bollard cap. Visiting loc_canal_drop afterward yields add_clue(knows_who_took_film) by reading the marks, so the player recovers the same knowledge a beat late â€” alternate path, never a dead end.

## Endings

- **The Last Train West** - Cal boards the 02:10 with Irina beside him and the genuine microfilm in his coat. A clean, hard-won extraction. The model success ending â€” earned only by building Dragomir's trust AND beating the clock AND carrying the real film. *(conditions: current_time time_before 02:10 AND dragomir_trust gte 3 AND companion equals 'dragomir' AND has_item 'real_microfilm')*
- **The Man Who Knew Too Much** - Having seen the canal handoff and learned Dragomir was blown from the start, Cal cuts a deal with Volkov and walks Irina out under Soviet protection instead â€” burning his own service. A morally grey 'win' that only opens if you witnessed the scheduled event and distrusted your handler. *(conditions: handoff_witnessed is_true AND knows_dragomir_blown is_true AND volkov_suspicion gte 3 AND lindqvist_trust lt 2)*
- **Smoke on the Embankment** - Dragomir never trusted Cal enough to hand over the real film, and Volkov's net closed. Cal makes the train alone with a decoy canister; the defection collapses behind him. A failure ending that still resolves cleanly â€” the world moved on without him. *(conditions: dragomir_trust lt 3 AND volkov_suspicion gte 4)*
- **The 02:11 Platform** - Cal reaches Westbahnhof as the red lights of the 02:10 shrink into the rain. Whatever he learned, he spent too long learning it. Stranded in Vienna with whatever he carries, the night ends on the empty platform â€” the pure consequence of the clock running out. *(conditions: current_time time_after 02:10)*

## Designer's own stated risks

- Authoring cost is the real danger: even at 14 nodes, every location node must hold 2-4 time-and-knowledge variants of prose (Cafe Sperl reads differently at 20:30 vs post-handoff midnight). That is closer to 30-40 authored prose blocks than 14 â€” the reactivity the founder wants is exactly what makes authoring expensive, and this chapter proves that tension rather than hiding it.
- Trust math can feel arbitrary to the player. dragomir_trust gte 3 is invisible; if the prose doesn't telegraph WHY a choice raised or lowered it, the gated 'real microfilm' moment reads as a coin-flip and the branching feels like bookkeeping, not character. The fix is heavy authorial discipline in the prose, which costs more words.
- The 02:10 deadline can soft-lock the experience emotionally: a player who dawdles is railroaded to ending_missed_train no matter how well they played the human drama. That is realistic but can feel punitive on a FIRST chapter meant to seduce â€” the clock may need to be generous enough that only genuine indecision triggers it.
- Risk of the scheduled event feeling like a cutscene rather than a living world. If 'if absent' just hands the player the same clue a few minutes later, the world isn't really moving WITHOUT them â€” it's waiting politely. To truly sell reactivity the absent-path consequence should cost something (a worse ending tier), but that risks feeling unfair to a new player who didn't know the event existed.
- Honest verdict the founder asked for: with this much state, the branching genuinely FEELS reactive in the first 20 minutes â€” but the illusion is fragile and proportional to prose quality, not system depth. The engine is sound; the bottleneck is writing labor. A 200-node game at this density is likely unrealistic for a small team. The 10-14 node chapter is the right scope precisely because it's the largest amount of reactivity you can author well.
- AND-only conditions (no OR) means I had to split some logic into separate nodes (e.g. the two ways to learn knows_dragomir_blown). This is workable at 14 nodes but will combinatorially explode the node count as the world grows â€” a structural limit the team should budget for now.

## Playtest findings

**Verdict:** go_with_changes - The writing and the branching CONCEPT are strong enough to justify proceeding â€” the satchel/Sperl/canal spine genuinely feels reactive and the double-cross path is excellent. But as authored it ships broken in ways a player will hit in the first session: the deadline never bites, the fictional clock contradicts the engine state, the model success ending has an op bug, failure runs mis-route into the hero ending, and the entire missed-event recovery system is unreachable. None of these are conceptual dead-ends; they are concrete, fixable calibration and condition-logic errors. Fix the six required changes (clock recalibration and ending-condition logic are non-negotiable) and this is a genuinely good first chapter. Ship it only after those land.

### Playthroughs walked by hand

- **The Trusting Courier (intended clean exfil)** -> ending: *node_ending_clean (The Last Train West) â€” assuming the has_item/has_clue op mismatch is forgiven*
    - Felt like: Reads beautifully line-by-line; the prose is genuinely strong Le Carre pastiche. But it felt like a CYOA book with bookkeeping, not a living world, because the much-advertised CLOCK never bit: I reached the platform with ~3.5 hours of unspent budget and the train waited regardless. The 'six hours to do a simple thing' tension is purely cosmetic on this path.
- **The Suspicious Courier (double-cross / Volkov deal)** -> ending: *node_ending_double (The Man Who Knew Too Much)*
    - Felt like: This path felt the MOST alive â€” the satchel discovery recoloring the Sperl scene, the wheel revealing the watchers, the canal proving the doubling. The reactivity is real here. But it is fragile: it only assembles if you happen to ride the wheel (for +2 suspicion) before witnessing. Witnessing alone gives susp=2, one short of the deal gate, so a player who skips the wheel hits a silently-locked deal choice and feels cheated.
- **The Botched Approach (testing failure/burned ending)** -> ending: *node_ending_clean via the loose fallback (companion=dragomir) â€” the WRONG ending: she never gave the real film, trust is -2, yet the player gets the triumphant 'carried it like it was heavy' clean-exfil text*
    - Felt like: Broken. The fallback choice ladder at node_westbahnhof routes a failed, distrusted, decoy-carrying run into the heroic clean ending because the only hard requirement that fallback checks is companion=dragomir. ending_burned is nearly unreachable (needs susp gte 4 which requires deep Volkov/canal engagement that simultaneously raises trust/knowledge), so the failure state the design promises rarely actually fires.

### What works

- Prose quality is genuinely high â€” sparse, smoky Le Carre register that sells dread without action. The opening text and the four ending texts are publishable.
- The satchel-discovery -> Sperl -> canal spine is authentically reactive: knowing Dragomir was blown unlocks a different, better Sperl beat and recolors every later scene. When it works, it feels like a living world, not a menu.
- Dragomir's two-films device (worthless decoy vs body-hidden real film) is an elegant, legible way to make trust mechanically load-bearing and is well telegraphed in prose.
- The scheduled handoff's REVEAL (the receiver is Lindqvist's own runner, not a Soviet) is a strong, earned twist and the dramatic high point.
- effectsText/conditionText plain-language labels are excellent player-clarity design â€” the player can see WHY trust moved.

### What breaks

- **[HIGH / mechanical]** The hard deadline cannot run out. Per-choice costs (1-30 min) are an order of magnitude too small for a 360-minute budget; the longest possible path accumulates to roughly 22:50 against an 02:10 train. ending_missed_train (time_after 02:10) is effectively unreachable and the entire advertised core tension is inert. - The clock is the spine of the premise and logline. If it never bites, the game is a branching story wearing a thriller's clothes, and the 'six hours' urgency is a lie the player eventually notices. *(global clock vs node_westbahnhof / node_ending_missed / all add_minutes effects)*
- **[HIGH / mechanical]** Node body times are hardcoded fiction (canal 23:18, Volkov 00:20, Westbahnhof 01:40, endings 02:10) with no connection to the accumulated engine clock (~21:00-23:00 on real paths). The 23:30 scheduled event's trigger time is never reached by the real clock. - Either the engine ignores accumulated time and just plays scripted timestamps (then add_minutes is theatre and time gates are meaningless), or it uses accumulated time (then the fiction's clock contradicts the prose the player is reading). Both are incoherent. *(node_canal_approach (23:18), node_handoff_witnessed (23:30), node_volkov (00:20), node_westbahnhof (01:40))*
- **[HIGH / mechanical]** loc_canal_drop / the missed-event recovery path is unreachable. node_canal_approach's 'too late, read the chalk' choice is gated time_after 23:30, but the engine clock never reaches 23:30. The 'pull back' choice sets handoff_missed but routes straight to Westbahnhof and never plants or yields the canal_drop clue. - The design's flagship 'world moves without you / never a dead end' feature simply never executes. node_canal_drop is dead content; handoff_missed is set but never read by any ending condition. *(node_canal_approach, node_canal_drop, scheduledEvent ifAbsent)*
- **[HIGH / mechanical]** node_westbahnhof clean-exfil condition checks field 'has_item' with op 'has_clue' for value 'real_microfilm'; the item was added via op 'add_item' to field 'has_item' (and earlier as field 'real_microfilm'). Op/field type mismatch will either always-fail or always-pass depending on engine leniency. - This is the model success ending. If it always-fails, no one ever sees the intended best ending; if it always-passes, the gate is meaningless. *(node_westbahnhof choice 2; node_get_real_film effect)*
- **[HIGH / mechanical]** Greedy fallback ladder at node_westbahnhof mis-routes failures into the clean ending. The 'board with companion' fallback (only hard check: companion=dragomir, time_before 02:10) sits in the ladder and catches distrusted/decoy runs, sending them to node_ending_clean with triumphant text. - A player who botched everything but kept Dragomir on their arm gets the hero ending. Failure states stop meaning anything; ending_burned becomes nearly unreachable. *(node_westbahnhof choices 4-5)*
- **[MEDIUM / narrative]** The real microfilm is silently skippable. From node_sperl_trust, only choice 1 routes through node_get_real_film; choices 2 and 3 set companion=dragomir and leave WITHOUT the film, with no prose warning. A high-trust player who picks 'walk with me' loses the prize and won't know why their ending is worse. - Trust gte 3 is built but then the player can accidentally walk past the payoff. Reads as the system punishing a reasonable, in-character choice. *(node_sperl_trust choices 2-3)*
- **[MEDIUM / player-clarity]** The satchel-search opening move is locked at start. lindqvist_trust starts at 2; the search choice needs lt 2. A player whose instinct is to investigate immediately cannot â€” they must first spend a turn antagonizing Lindqvist to lower trust, which is unintuitive and invisible. - Railroads the suspicious-archetype player and makes the most interesting branch (knows_dragomir_blown) gated behind a non-obvious two-step. *(node_safehouse choice 3 / node_safehouse_press choice 3)*
- **[MEDIUM / mechanical]** ending_double's suspicion gate is one point short on the obvious path. Witnessing the handoff yields volkov_suspicion=2 (when starting from 0), but the deal needs gte 3. Only riding the Riesenrad first (+2) or using the 'ask why' self-loop (+1) reaches it. - A player who does the dramatically correct thing (witness the betrayal, go confront Volkov) hits a silently-disabled 'take the deal' choice and cannot understand why the night's logical conclusion is forbidden. *(node_volkov choice 2; node_handoff_witnessed / node_riesenrad suspicion increments)*
- **[MEDIUM / mechanical]** volkov_suspicion semantics are incoherent. The variable is named 'suspicion' (Cal's suspicion of his own side) but is used as a proxy for 'Volkov trusts/will deal with you' (deal needs susp gte 3) AND as 'Volkov's net closed' (ending_burned needs susp gte 4). One number is asked to mean three contradictory things. - Makes ending conditions feel arbitrary; the same rising number both lets you cut a deal and dooms you to the burned ending depending on an unrelated trust value. *(endings ending_double vs ending_burned; volkov_suspicion)*
- **[LOW / narrative]** node_volkov's 'ask why' choice destinations back to node_volkov itself, relying on asked_volkov_why is_false to not re-show. If the engine re-enters the same node it must re-render the full body text ('The honest boy...') as if meeting Volkov fresh, which reads as a glitch. - Self-looping conversation node will repeat the introduction prose; minor immersion break. *(node_volkov choice 1)*
- **[LOW / narrative]** Lindqvist's explicit 'do not go to the canal' followed by the canal being the climax means a trusting player who OBEYS their handler is mechanically punished with a thinner story, while disobedience is rewarded. - Realistic but, on a first chapter meant to seduce, the most loyal reading of the character leads to the least content. Worth a telegraph. *(node_safehouse / node_crossroads)*

### Biggest narrative problem

The clock is the entire premise and it does not work. The logline promises 'six hours to walk her out before 02:10' and a fixed 23:30 handoff â€” but the engine's accumulated minute-costs (1 to 30 per choice) cannot consume a 360-minute budget; the longest playable route lands around 22:50. So the deadline never threatens, ending_missed_train is unreachable, and the 23:30 scheduled-event trigger is never met by the real clock. To paper over this, every node body hardcodes a fictional timestamp (canal 23:18, Volkov 00:20, platform 01:40) that has no relationship to the state the engine is actually tracking. The result is a thriller whose central source of dread is a stage prop: the player is told the clock is killing them while it demonstrably is not, and the one system meant to prove the world moves without you (the missed-handoff chalk-drop recovery) is rendered unreachable by the same broken clock.

### Is this asking too much?



### Required changes

- **Recalibrate the clock so it can actually expire. Either inflate per-action costs dramatically (tram +30-40, district on foot +45-60, conversations +30-45, the canal detour a real +90) so a dawdling/detour-heavy run genuinely risks 02:10, OR shorten the window. Then make ending_missed_train reachable by at least one plausible greedy-exploration path.** - Without this the core tension and one of four endings are dead. This is the single change that decides whether the premise is real.
- **Make node body times derive from the engine clock instead of hardcoded strings, and ensure the 23:30 scheduled event fires off accumulated time. Remove every fixed timestamp from node bodies that contradicts state, or convert them to computed display.** - Eliminates the fiction-vs-state contradiction and makes the scheduled event and all time gates meaningful.
- **Fix the node_westbahnhof ending selection: correct the has_item/has_clue op mismatch, and replace the greedy loose fallbacks with strictly mutually-exclusive, fully-specified AND-conditions for all four endings (clean, double, burned, missed). No fallback should route a failed run into ending_clean.** - Currently the best ending can mis-fire and failure runs are mis-classified as victories, which destroys the 'endings emerge from accumulated state' promise.
- **Repair the missed-event recovery loop: have the absent-path actually plant the canal_drop clue, make node_canal_drop reachable (its time gate must be satisfiable), and have at least one ending read handoff_missed / knows_who_took_film so the alternate path leads somewhere.** - This is the flagship reactivity feature and it currently never executes; node_canal_drop is dead content.
- **Resolve the volkov_suspicion overload: split into two variables (e.g. cal_suspects_betrayal and volkov_net_pressure), and lower/clarify the ending_double gate so witnessing the handoff plus confronting Volkov is sufficient without requiring the off-path Riesenrad detour.** - One number meaning trust, suspicion, and enemy-pressure makes endings feel like a coin-flip and silently locks the dramatically-correct double-cross.
- **Make the satchel-search available at the very first beat (drop the lind_trust lt 2 gate or set starting trust to 1), and add a prose telegraph at node_sperl_trust warning that leaving without asking for the film means leaving without the prize.** - Unlocks the most interesting branch for the suspicious player and stops the trust system from silently punishing a reasonable in-character choice.

---

# Appendix - The full written chapters

_The complete playable prose each team wrote. You can also click through these interactively in branchworld-review.html._

## Team 1 - The Last Bell at Pelican Reach

*Start node: node_pumphouse_start*

**Opening:**

The first siren goes off at 14:00 and you already know it's lying.

You hear it from inside Pump House 7 â€” that long, climbing wail rolling out over the dune line â€” and you watch the master panel disagree with it. Of the fourteen siren heads ringed around Pelican Reach, nine show green. Five show a dead amber nothing. The town hears a warning. Half the town hears it through a single working horn two miles off, thin as a gnat.

And on the gate relay, low on the panel, a red fault light blinks like a slow pulse. The Verrazano flood gate â€” the new one, the one Mayor Doyle cut the ribbon on last spring â€” is not going to close on its own. You'd bet your hands on it.

You grew up here. You left here. Now you're the only person on this sandbar who knows the warning system is half a lie, and the radio on your hip is crackling the official line: orderly evacuation, no cause for alarm, the gate is functioning normally.

Outside, the wind has teeth. Six hours until the water comes over the low span and takes the road. The clock starts now.

### node_pumphouse_start - Pump House 7 â€” The Fault Light
*loc: PumpHouse | time: 14:00 | type: scene*

The bunker smells of ozone and standing water, the way it always has, the way it did when your father ran this panel and you sat on an overturned bucket doing your homework by the glow of the relays.

You put your hand flat on the master panel and feel it hum. Nine green. Five amber-dead. You could run the full self-test and find out exactly which horns are gone â€” but that's twenty minutes you don't get back, and the surge clock doesn't care about your diligence.

The gate relay blinks its red fault. There's a manual override switch under a hinged steel cover here, wired straight to the Verrazano motor house. If the gate won't close itself at 18:00 â€” and it won't â€” this switch, or a hand-crank at the gate itself, is all that stands between Pelican Reach and the Gulf.

Your radio coughs Doyle's voice again: "...gate is functioning normally, repeat, no cause for alarm..." You think about the cheap contract everyone whispered about. You think about the maintenance van that's been parked wrong at the channel mouth for three days.

The wind leans on the cinderblock. Time to move, one way or another.

**Choices:**
- Run the full siren self-test (+20 min) â€” find out what's actually broken  ->  node_pumphouse_test  [Costs 20 minutes; learns the grid is repairable and marks the grid as tested.]
- Pop the override cover and study the gate relay wiring  ->  node_pumphouse_relay  [Costs 10 minutes; learns the gate is being held open from the channel end, not the panel.]
- Skip it all â€” drive to Tillet's Harbor and find Reyes (+15 min)  ->  node_harbor  [Costs 15 minutes; travels to the harbor.]
- Drive straight to Town Hall and get the truth out of Doyle (+20 min)  ->  node_townhall  [Costs 20 minutes; travels to Town Hall.]

### node_pumphouse_test - The Self-Test
*loc: PumpHouse | time: 14:20 | type: discovery*

You key the diagnostic and the panel runs its scales. One by one the dead heads report in: corroded coil, severed feed, water in a junction box, a controller that needs a hard reset you can do from right here. It's not catastrophe. It's neglect. Somebody stopped maintaining the eastern arc of the grid and nobody upstairs wanted to pay to fix it.

You reset what resets. You reroute what reroutes. When you're done, the count reads twelve green, two amber â€” enough that if you tell the town to run, the whole town will hear you say it.

That's the thing about your father's panel. It still wants to work. It just needs someone who stayed.

The wind has picked up a half-step while you worked. 14:20. Five hours and forty minutes of tide left, and you've spent twenty buying a voice loud enough to save people with â€” if you can get anyone to listen.

**Choices:**
- Now check the gate relay before you leave (+10 min)  ->  node_pumphouse_relay  [Costs 10 minutes; inspects the relay.]
- Drive to the Salt Lick Diner â€” your sister Sela is working (+20 min)  ->  node_diner  [Costs 20 minutes; travels to the diner.]
- Drive to Tillet's Harbor and find Reyes (+15 min)  ->  node_harbor  [Costs 15 minutes; travels to the harbor.]

### node_pumphouse_relay - Under the Steel Cover
*loc: PumpHouse | time: 14:10 | type: discovery*

You flip the hinged cover off the override and read the wiring the way you'd read a face. The fault isn't here. The panel is sending the close-command just fine â€” you can see the signal go out, clean and strong, down the conduit toward the channel mouth. It's the gate end that isn't answering. Something downstream of here is cut, or jammed, or worse.

The override will only do its job if the gate's own motor and linkage are intact. If the cable's gone at the gate, this switch is a light switch wired to a dead bulb. You won't know which until you stand at the Verrazano itself.

But now you know the lie has a shape. The panel is honest. Someone made the gate dishonest on the far end. You wipe grease on your jeans and look at the fault light blinking its slow red pulse, and you decide it looks less like a malfunction and more like a confession.

**Choices:**
- Drive to the Verrazano Flood Gate and see what's wrong with your own eyes (+25 min)  ->  node_floodgate_early  [Costs 25 minutes; travels to the flood gate.]
- Drive to Town Hall â€” make Doyle explain the far end (+20 min)  ->  node_townhall  [Costs 20 minutes; travels to Town Hall.]
- Drive to the Salt Lick Diner and warn Sela first (+20 min)  ->  node_diner  [Costs 20 minutes; travels to the diner.]

### node_harbor - Tillet's Harbor & Bait Dock
*loc: Harbor | time: 14:15 | type: conversation*

Diesel sheen rides the chop and the shrimp boats pull at their lines like dogs that smell the storm. Captain Marisol Reyes stands in the wheelhouse door of the Saint Brendan, coiling a rope she doesn't need to coil, watching you come down the dock with a face that remembers exactly when you left and exactly who you left.

"Wren Okafor," she says. "County sent the runaway to tell us all to run." Not cruel. Just true, and a little tired. She and your father shrimped these waters thirty years. You used to call her Tia Mari before you got too old and too gone for it.

"They're saying the gate's fine," she goes on, nodding at the radio chatter. "You're the gate person. That why your face looks like that?"

Behind her, the Saint Brendan rocks heavy and able. That boat could lift a lot of people off this dock if the road went under. If she'd run it. If she trusted the person asking.

**Choices:**
- Tell her the truth straight: the gate won't close and the sirens are half-dead  ->  node_harbor_truth  [Reyes trust +1; she respects the honesty.]
- Apologize for leaving â€” for not being here when your father got sick  ->  node_harbor_apology  [Reyes trust +2; the old wound finally gets touched.]
- Stay official â€” just confirm the evac order and ask if she's leaving  ->  node_harbor_official  [No trust change; Reyes keeps her distance.]

### node_harbor_truth - Reyes Uncoils the Rope
*loc: Harbor | time: 14:20 | type: conversation*

You give it to her flat, the way she's always given everything to you. Nine sirens of fourteen. A gate that takes the close-signal and does nothing. A mayor on the radio calling it normal.

Reyes listens with her jaw set, and when you finish she doesn't say anything for a moment. Then she stops coiling the rope and instead loops it loose around the cleat â€” ready to throw off, not tie down. A small thing. It changes the whole shape of her.

"My boat holds a lot of frightened people if it has to," she says. "More than the law likes. But I don't run her into a Cat 3 for a maybe. You bring me people who need lifting and a reason that holds water, and the Saint Brendan is yours. You bring me a panic and a guess, and I take my crew out and you're not on her. Comprende?"

You comprende. The road out floods at 19:00. After that, this boat is the only door left.

**Choices:**
- Ask her to stage here for a mass rescue and go rally people now (+0 min)  ->  node_harbor_stage  *(if Only if Reyes trusts you enough (reyes_trust >= 3))*  [Reyes agrees to wait and run rescue trips; she stages the boat.]
- Head to the diner to start emptying the town (+20 min)  ->  node_diner  [Costs 20 minutes; travels to the diner.]
- Go to the flood gate and try to fix the thing itself (+30 min)  ->  node_floodgate_early  [Costs 30 minutes; travels to the flood gate.]

### node_harbor_apology - Tia Mari
*loc: Harbor | time: 14:25 | type: conversation*

It comes out before the gate, before the sirens, before any of it. You tell her you should have been here. That you heard about your father over the phone in a city that didn't know his name, and you didn't come back until there was a job and a paycheck attached to the coming. That leaving was easy and that's the part you can't forgive yourself for.

Reyes's face does something complicated. The chop slaps the hull. "He waited for you," she says finally. "Right up to the end he kept that bucket out for you. The one you sat on." She looks away, toward the gray seam where the sky has gone the color of a bruise. "I kept the bucket."

She wipes her face with the back of a weathered hand and when she turns back the burned look is gone. "You came back now. That's a thing that's true today." She drops the rope into a loose loop around the cleat â€” ready to throw, ready to run. "Tell me what's actually happening, Wren. All of it."

And you do. And she believes you, because the door between you opened.

**Choices:**
- Ask her to stage the Saint Brendan for a mass rescue (+0 min)  ->  node_harbor_stage  *(if Only if Reyes trusts you enough (reyes_trust >= 3))*  [Reyes agrees to run rescue trips; she stages the boat.]
- Head to the diner to get Sela and the holdouts moving (+20 min)  ->  node_diner  [Costs 20 minutes; travels to the diner.]
- Go to the flood gate and try to fix it (+30 min)  ->  node_floodgate_early  [Costs 30 minutes; travels to the flood gate.]

### node_harbor_official - By the Book
*loc: Harbor | time: 14:20 | type: conversation*

You keep it clean and procedural. Mandatory evacuation, the county recommends she move her crew and vessel, here is the timeline, do you have any questions. You hear your own voice and it sounds like the radio. It sounds like Doyle.

Reyes finishes coiling her rope and ties it down tight. Tied to stay. "Recommends," she repeats. "Sure." The warmth that flickered when you walked up has banked itself back to coals. "I've weathered storms since before you could spell county, mija. I'll make my own call on my own boat."

She turns back to her work, which is the politest way a person can show you their back. Whatever the Saint Brendan might have been to this day, you just made it a maybe â€” and maybes don't run into a Cat 3 for strangers.

**Choices:**
- Push it â€” tell her the gate is actually broken and you need her  ->  node_harbor_truth  [Reyes trust +1; honesty repairs some of it.]
- Leave it. Drive to Town Hall and deal with Doyle (+25 min)  ->  node_townhall  [Costs 25 minutes; travels to Town Hall.]
- Drive to the diner and warn Sela (+20 min)  ->  node_diner  [Costs 20 minutes; travels to the diner.]

### node_harbor_stage - The Saint Brendan Waits
*loc: Harbor | time: 14:25 | type: event*

Reyes pulls a chart light on in the wheelhouse and starts thinking in load and freeboard and trip times, the way only thirty years on this water lets a person think. "I can make three runs before the channel gets too ugly to enter," she says. "Maybe thirty souls a run if they're calm and skinny and scared enough to listen. You get them down to my dock, I get them off this rock."

She jabs a finger at you. "But I lift off this dock, Wren, which means you spend your hours bringing me bodies, not chasing ghosts up at that gate. You can't do both. The tide won't let you."

That's the whole game laid bare on a chart table. Save the people, or save the gate and the truth of who killed it. Reyes has just made the boat real. Now you have to fill it â€” or walk away from it toward the harder, lonelier thing.

**Choices:**
- Go fill the boat â€” drive to the diner and rally the holdouts (+20 min)  ->  node_diner  [Costs 20 minutes; travels to the diner to gather evacuees.]
- Walk away from the boat â€” go to the gate and try to save the town itself (+30 min)  ->  node_floodgate_early  [Costs 30 minutes; travels to the flood gate.]

### node_diner - The Salt Lick Diner
*loc: Diner | time: 14:40 | type: conversation*

Chrome and vinyl and the smell of old coffee. Above the counter the TV throws a hurricane map across the room in lurid red, the cone of probability swallowing the whole barrier island. And here, under it, sit the holdouts â€” four old-timers in a booth, Earl and the Pruitt brothers and Miss Adeline, nursing cups and stubbornness, daring the sea to make them move.

Your sister Sela works the floor between them, refilling cups that don't need refilling, because she won't leave while they won't leave, because that's who she is and always has been and you weren't here to see her become it.

"Look what the storm dragged in," Sela says, and her smile is real but it's guarding something. "County Wren. You here to tell my regulars to abandon ship?" Earl snorts into his coffee. The TV says nothing they'll believe more than they believe the chrome on the napkin holder.

Sela watches you, waiting to see which brother showed up â€” the county one or the one she actually missed.

**Choices:**
- Talk to Sela like family first â€” ask how she's holding up  ->  node_diner_sela  [Sela trust +1; you reach her before you reach the room.]
- Work the booth â€” try to persuade the old-timers to evacuate  ->  node_diner_persuade  [Attempts to move the holdouts.]
- Ask Sela quietly what she saw out at the channel three days ago  ->  node_diner_witness  [Sela trust +1; she tells you about the maintenance van and the cut cable.]

### node_diner_sela - Sister
*loc: Diner | time: 14:50 | type: conversation*

You ask her how she's doing â€” really, not the county way â€” and something in Sela's shoulders comes down an inch. "Tired," she admits, low, so the booth can't hear. "They're scared, Wren, even Earl, especially Earl, and they cover it with the stubborn. If somebody they trust tells them to go, and means it, they'll go. But it can't be a uniform telling them. It has to be us."

Us. She hasn't said us about you in three years.

"I'm not leaving them," she adds, and there's the steel that's pure your father. "So if you want me out, you get them out. We're a package deal now, big brother."

The TV map pulses. Whatever you do next, Sela just told you the lever: reach her, and she'll empty this room for you when the moment comes. The grid you may have fixed back at the pump house, the siren bell that's supposed to send them running â€” it only matters if someone in here makes them believe the bell.

**Choices:**
- Ask what she saw out at the channel three days ago  ->  node_diner_witness  [Sela trust +1; she describes the maintenance van and a man cutting a cable.]
- Promise her: when the bell sounds for real, get them all to the causeway  ->  node_diner_pact  [Sela trust +1; you make the evacuation pact.]
- Leave now for Town Hall to confront Doyle (+10 min)  ->  node_townhall  [Costs 10 minutes; travels to Town Hall.]

### node_diner_witness - What Sela Saw
*loc: Diner | time: 14:55 | type: discovery*

Sela glances at the booth, then pulls you toward the pass-through where the fryer noise covers a voice. "Three days back, before any of this. I drove the shore road out past the channel to dump the grease bucket. There was a maintenance van parked wrong at the gate â€” county plates, but parked up on the rocks where no county truck goes." She wets her lips. "A man was up in the motor housing with cutters. I thought, fine, they're servicing the new gate. But Wren â€” he saw me see him. And he stopped. Just stood there holding the cutters and watched my truck go by. I didn't tell anybody. Who'd I tell? Doyle's on TV every night saying that gate's a miracle."

A cut cable. A man who didn't want a witness. Three days before the storm that the gate was built to stop.

It lands in you like a stone in still water. The gate didn't fail. The gate was killed. And your sister is the only person who saw the hand that did it.

"Be careful with this," she says quietly. "Whoever that was, he's still on the island."

**Choices:**
- Go to Town Hall and force the gate logs out of Doyle (+10 min)  ->  node_townhall  [Costs 10 minutes; travels to Town Hall carrying the witness clue.]
- Make the evacuation pact with Sela before you go anywhere  ->  node_diner_pact  [Sela trust +1; you make the evacuation pact.]
- Drive to the gate to see the cut cable yourself (+25 min)  ->  node_floodgate_early  [Costs 25 minutes; travels to the flood gate.]

### node_diner_persuade - Working the Booth
*loc: Diner | time: 14:55 | type: conversation*

You slide up to the booth and make the case. The map, the timeline, the surge height, the road that floods at seven. Earl looks at you over his glasses with the patience of a man who has buried two wives and a hurricane named after each. "Son, the county told us to run in '05 and again in '12 and the water stopped at the gutters both times. Doyle's on the TV right now saying the gate'll hold. Why's your face say different than the mayor's mouth?"

The booth waits. This is the crux: they will not move for a stranger's say-so, and to them, three years gone, you are exactly that. They'll move for one of two things â€” proof the official line is a lie, or someone they love standing up and saying go.

Miss Adeline pats the seat beside her with a papery hand. "Sit, baby. Have a coffee. The sea's done its worst to me before."

**Choices:**
- Tell them flat: the gate is sabotaged and Doyle is lying  ->  node_diner_pact  *(if Only if you know about the cut cable (has clue saw_cut_cable))*  [Sela trust +1; the truth shakes the booth and bonds you to Sela.]
- Turn to Sela and ask her to back you in front of them  ->  node_diner_sela  [Pivots to reaching Sela directly.]
- Give up on the booth for now and drive to Town Hall (+10 min)  ->  node_townhall  [Costs 10 minutes; travels to Town Hall.]

### node_diner_pact - The Pact
*loc: Diner | time: 15:05 | type: event*

Sela meets your eyes and you both understand it at once, the way you used to finish each other's chores. She'll hold the room. You go do the thing only you can do. And when the real bell sounds â€” the full grid, every horn, unmistakable â€” she will physically walk these stubborn old saints out the door and point their cars at the causeway before the water takes it.

"They'll go when I go," she says. "And I'll go when the sirens mean it. Make the sirens mean it, Wren."

Earl grumbles but he's listening to her now in a way he never listened to you. Miss Adeline has already found her purse. The pact is made: a working bell, a sister to ring people toward it, and a road that closes at 19:00. Three things that have to line up.

You squeeze her hand. It's 15:05. The tide is turning out there, you can feel the pressure of it in your teeth.

**Choices:**
- Go to Town Hall and deal with Doyle and the logs (+10 min)  ->  node_townhall  [Costs 10 minutes; travels to Town Hall.]
- Go to the flood gate to try to close it yourself (+25 min)  ->  node_floodgate_early  [Costs 25 minutes; travels to the flood gate.]
- Go to the harbor and set up Reyes for a sea rescue (+20 min)  ->  node_harbor  [Costs 20 minutes; travels to the harbor.]

### node_townhall - Pelican Reach Town Hall
*loc: TownHall | time: 15:20 | type: conversation*

Sandbags climb the steps to their shoulders and inside, the phones are a wall of sound nobody's answering. Mayor Cal Doyle works the room in shirtsleeves, sweat at his collar, a smile bolted on so hard it must hurt. He's mid-sentence to a reporter â€” "...the Verrazano gate is the most advanced coastal defense on the Gulf, and it is functioning normally..." â€” when he sees you and the smile flickers like a bad bulb.

He knows what you are. The one person in the county who can read his miracle gate and call it a corpse.

"Wren!" Too loud, too warm, steering you by the elbow toward the corner, away from the reporter. "Glad you're here. Crazy day. I trust the system's all green on your end?" His eyes beg you to say yes. Behind him, in a server cabinet, sit the gate's maintenance and command logs â€” every signal, every contract sign-off, every name. Locked behind his cooperation, or his fear.

**Choices:**
- Play along â€” tell him it's green and let him relax  ->  node_townhall_along  [Doyle suspicion +1; he trusts you and grows careless.]
- Press him hard in front of the reporter â€” make him sweat  ->  node_townhall_press  [Doyle suspicion +2; he panics and the cracks show.]
- Tell him plainly the gate won't close and you need the logs to fix it  ->  node_townhall_logs_ask  [Doyle suspicion +1; you make your move toward the records.]

### node_townhall_along - Letting Him Breathe
*loc: TownHall | time: 15:30 | type: conversation*

"All green," you say, and watch the relief flood him like the surge he won't admit is coming. Doyle pumps your hand, claps your shoulder, tells the reporter "see, the county's own technician," and in his gratitude he gets loose, and loose men talk.

"Between us," he says low, walking you past the server cabinet, "the contract on that gate â€” we went with the low bid. Tillet Marine. Frank's cousin's outfit. Cut some corners on the maintenance schedule, sure, everybody does. But it'll hold. It has to hold." He laughs and it has no floor under it. "It has to hold, Wren, or I'm the man who sold this town a sandcastle."

There it is â€” the shape of the rot, handed to you because he thinks you're on his side. Tillet Marine. Frank's cousin. The cut corners. He's left the logs an arm's length away, and a careless man doesn't lock the cabinet behind a friend.

**Choices:**
- Slip the gate logs while he's distracted (you know just what to grab)  ->  node_townhall_logs_pull  [Costs 10 minutes; pulls the gate logs.]
- Leave him to his press line and drive to the gate (+25 min)  ->  node_floodgate_early  [Costs 25 minutes; travels to the flood gate.]
- Drive to the causeway and find Deputy Tillet (+25 min)  ->  node_causeway  [Costs 25 minutes; travels to the causeway.]

### node_townhall_press - Making Him Sweat
*loc: TownHall | time: 15:30 | type: conversation*

You don't take the elbow. You raise your voice just enough to carry to the reporter's recorder. "Mayor, as the county's gate technician I'm telling you the Verrazano is showing a hard fault on the close command. Is the public aware the automated gate may not seal before surge?"

The room's noise drops a notch. The reporter's pen comes up. Doyle's bolted smile cracks straight down the middle and underneath it is a frightened man who green-lit a cheap contract and prayed.

"That's â€” that's not â€” the gate is functioning normally," he says, but his hand is shaking and he's already steering you, hard now, toward the back hall, away from witnesses. In the corner his aide kills the reporter's recording with a hand over the lens. Cornered animals do one of two things: they hide the evidence, or in their panic they let something slip. Doyle is deciding which, right in front of you, and his suspicion of you has gone from zero to a held breath.

**Choices:**
- Corner him in the back hall and demand the gate logs now  ->  node_townhall_logs_ask  [Doyle suspicion +1; you press for the records.]
- Name the contractor â€” say 'Tillet Marine' and watch his face  ->  node_townhall_logs_ask  *(if Only if you already know about the cut cable (has clue saw_cut_cable))*  [Doyle suspicion +2; the contractor's name detonates the room.]
- Leave him rattled and drive to the gate to act (+25 min)  ->  node_floodgate_early  [Costs 25 minutes; travels to the flood gate.]

### node_townhall_logs_ask - The Cabinet
*loc: TownHall | time: 15:40 | type: discovery*

You back him against the server cabinet â€” the one with the gate's whole life inside it. "The command logs, Cal. Every close-signal, every maintenance sign-off, every name on the Tillet contract. Give them to me and maybe the story tomorrow is that you helped the technician save the town. Refuse, and the story is that you hid them with the surge six hours out."

Doyle's throat works. He's doing the math a cornered man does â€” and the thing about a cornered man is that whether he caves depends on how cornered he already feels. If you've shaken him enough that he sees no other door, he hands you the key. If he still thinks he can talk his way clear, he stonewalls and you'll have to take it the hard way later.

**Choices:**
- Take the logs from his own hand (he caves)  ->  node_townhall_logs_pull  *(if Only if Doyle is cornered enough (doyle_suspicion >= 3))*  [Costs 5 minutes; Doyle caves and you pull the gate logs.]
- He stonewalls â€” leave and chase the truth at the causeway instead (+25 min)  ->  node_causeway  *(if Only if Doyle is NOT yet cornered (doyle_suspicion < 3))*  [Costs 25 minutes; travels to the causeway to find Deputy Tillet.]
- Forget the logs â€” drive to the gate and just try to close it (+25 min)  ->  node_floodgate_early  [Costs 25 minutes; travels to the flood gate.]

### node_townhall_logs_pull - The Logs
*loc: TownHall | time: 15:50 | type: discovery*

You pull the records and they sing the whole filthy song. The close-command tested green on install and then â€” eleven days ago â€” a maintenance entry logged by Tillet Marine took the gate offline for 'cable servicing' and it never came back fully online. The motor reports nominal. The linkage reports nominal. The control cable reports a break that the system was told to ignore. Somebody silenced the alarm on a cut cable and signed it Tillet.

And there, on the contract cover sheet: low bid, fast-tracked, signed Cal Doyle. The cousin's company. The corners cut. The miracle that was always going to drown.

You photograph all of it. Whatever else this day costs, the truth of who killed the gate is now in your pocket â€” and the only thing that turns a photograph into a reckoning is a witness and a confession, both of which are waiting out at the bridge.

15:50. The light through the sandbagged windows has gone the green of deep water.

**Choices:**
- Drive to the causeway â€” confront Deputy Tillet about his cousin (+25 min)  ->  node_causeway  [Costs 25 minutes; travels to the causeway carrying the logs.]
- Drive to the gate to try to crank it shut and save the town (+25 min)  ->  node_floodgate_early  [Costs 25 minutes; travels to the flood gate.]
- Drive to the harbor and set up the sea rescue (+20 min)  ->  node_harbor  [Costs 20 minutes; travels to the harbor.]

### node_floodgate_early - The Verrazano Flood Gate
*loc: FloodGate | time: 16:30 | type: discovery*

The town's pride rises out of the channel mouth, a slab of engineered hope as tall as a house, and it is wide open. The motor housing gapes, its access panel swinging. The maintenance van Sela described is still up on the rocks where no county truck belongs. And there, in the wind, a control cable hangs cut clean through, its bright copper face not even weathered â€” a fresh cut, days old at most, sawing back and forth in the gusts like a thing waving for help.

This is the murder weapon. The gate can still be closed by hand â€” there's a manual crank gear the size of a ship's wheel, meant for exactly this failure â€” but it's slow, brutal work against the rising water, and the auto-close won't even attempt its sequence until 18:00. If you crank now you'll fight the gate's own dead motor. If you wait for 18:00, you can let the motor try, fail, and then throw your weight in at the half-closed point.

You photograph the cut cable. Now you know the gate's wound by sight as well as by record.

**Choices:**
- Photograph everything and stay to be here when the gate tries at 18:00  ->  node_floodgate_wait  [Records the cut cable; you commit to waiting at the gate for the auto-close attempt.]
- Photograph the cable and drive to the causeway for Tillet's confession (+25 min)  ->  node_causeway  [Costs 25 minutes; records the cut cable and travels to the causeway.]
- Don't wait â€” drive to the harbor to commit to the boat rescue (+30 min)  ->  node_harbor  [Costs 30 minutes; records the cut cable and travels to the harbor.]

### node_floodgate_wait - Waiting for 18:00
*loc: FloodGate | time: 18:00 | type: event*

You stay. You wedge yourself in the lee of the motor housing and you watch the water climb the channel walls inch by inch while the light dies and the wind goes from teeth to claws. At 17:55 the automated controller wakes, sensing surge, and begins its close sequence â€” the sequence Doyle swore was functioning normally.

At 18:00 the motor screams. It draws current and drives the gate and the gate jerks ten feet and then the cut cable parts the rest of the way with a crack like a rifle, and the whole slab stops dead. Halfway. Sparks spit from the severed control line. The Gulf shoulders through the gap, brown and muscled, and the channel begins to pour into Pelican Reach behind it.

The gate is stuck at the half. The manual crank gear is right there, slick with spray. You can throw your body into it and finish what the motor couldn't â€” forty minutes of agony that seals the town but strands you here past the causeway lock. Or you abandon it and run for the bridge while the bridge still exists.

**Choices:**
- Crank it closed by hand â€” seal the town, strand yourself (+40 min)  ->  node_end_held_line  [Costs 40 minutes; manually closes the gate and records the time of close.]
- Abandon the gate and run for the causeway (+25 min)  ->  node_causeway  [Costs 25 minutes; the gate stays open and floods the town; travels to the causeway.]
- Abandon the gate and run for Reyes's boat at the harbor (+30 min)  ->  node_harbor_lift  [Costs 30 minutes; the gate stays open and floods the town; travels to the harbor.]

### node_causeway - The Causeway & Toll Booth
*loc: Causeway | time: 17:00 | type: conversation*

The single bridge to the mainland runs low and flat across the water, and the water is already licking the bottom of the low span, slapping up in gray sheets when the gusts hit. A thin line of cars crawls across, wipers losing. At the toll booth, Deputy Frank Tillet leans into the wind in a streaming poncho, waving traffic through, his cruiser lights smearing red and blue across the rain.

He's the contractor's cousin. He's also the gatekeeper of the last dry road off this island, and at 19:00 â€” two hours from now and closing â€” the low span goes under and this door slams shut for good.

If the gate has already failed somewhere behind you, you can feel it: the water here is higher than the tide tables say it should be. The Gulf is coming in two directions now, over the bar and through the channel both.

Frank squints at you through the rain. "Okafor. You should be gone already. Whole island should be. Get in line and get across."

**Choices:**
- Ask Tillet who parked the maintenance van and cut the cable  ->  node_causeway_confess  *(if Only if you know about the cut cable (has clue saw_cut_cable))*  [Confronts Tillet with the sabotage; pushes toward a confession.]
- Check the water â€” see if the gate has already failed behind you  ->  node_causeway_discover_fail  *(if Only if the gate failed while you were away (gate_open is true))*  [Discovers the leftover sign of the failed-open gate.]
- Just cross â€” take the dry road out while it's still there (+15 min)  ->  node_end_paper_or_stranded_check  [Costs 15 minutes; crosses the causeway to the mainland.]
- Sound the full siren grid from here and signal the diner to run  ->  node_end_last_bell  *(if Only if the grid is repaired and Sela will rally them (siren_grid_tested true and sela_trust >= 2))*  [Sounds the working bell; Sela empties the diner and a stream of cars beats the flood.]

### node_causeway_discover_fail - Water From the Wrong Direction
*loc: Causeway | time: 18:20 | type: discovery*

You crouch at the rail and read the water the way your father taught you. It's wrong. It's too high, too fast, and there's a current running across the span that shouldn't exist â€” channel water, surging through from behind the town, carrying the diesel sheen of the harbor and a single torn maintenance flag you'd know anywhere. The flag off the van at the gate.

The gate failed. While you were elsewhere it tried its broken sequence at 18:00, the cut cable parted, the motor died at the half, and nobody was standing there to throw a body into the crank. The Gulf has been pouring through the open Verrazano for twenty minutes and the proof of it is washing past your boots: the same cut cable's bright copper tag, snagged now on the bridge rail, glinting.

You pull it free. Evidence, delivered to you by the very flood it caused. The town is drowning behind you. The only questions left are who you name for it and whether you make the road before it's gone.

**Choices:**
- Confront Tillet now â€” you have the cable, make him talk  ->  node_causeway_confess  *(if Only if you know about the cut cable (has clue saw_cut_cable))*  [Picks up the failed-gate proof and confronts Tillet.]
- Cross while you still can â€” get the evidence off the island (+15 min)  ->  node_end_paper_or_stranded_check  [Costs 15 minutes; picks up the failed-gate proof and crosses the causeway.]
- Run for Reyes's boat instead â€” the road feels too far gone (+25 min)  ->  node_harbor_lift  [Costs 25 minutes; picks up the proof and travels to the harbor.]

### node_causeway_confess - Frank Tillet's Half-Confession
*loc: Causeway | time: 17:20 | type: conversation*

You step under the booth's dripping overhang and lay it down: a maintenance van on the rocks, a man in the motor housing with cutters, a control cable cut clean eleven days ago and logged as service by Tillet Marine. "Your cousin's company, Frank. Your cousin's van. So either you tell me what you know, or you're the deputy who waved cars past a sabotage you helped bury."

The rain runs off his hat brim. For a long moment he just watches the traffic crawl, and then something in him gives way â€” not all of it, but enough. "Donnie didn't think it'd matter," he says, low and ragged. "Doyle's office told him the gate was over budget. Said skip the cable retrofit, fake the sign-off, nobody'd know till the warranty ran out. Donnie just... cut it loose and logged it done. He didn't think a storm would come this season." Frank's jaw works. "I didn't cut anything. But I knew. God help me, I knew, and I waved them all through anyway."

There it is â€” the confession, half a one, but enough to hang a chapter on. The clock reads 17:20 and the low span is an inch closer to gone.

**Choices:**
- Take the confession and cross the causeway with all of it (+15 min)  ->  node_end_paper_or_stranded_check  [Costs 15 minutes; records the confession and crosses the causeway.]
- Get the confession, then sound the grid and run the diner out first  ->  node_end_last_bell  *(if Only if the grid is repaired and Sela will rally them (siren_grid_tested true and sela_trust >= 2))*  [Records the confession; sounds the bell and empties the diner toward the road.]
- Get the confession, then run for Reyes's boat to save who you can (+25 min)  ->  node_harbor_lift  [Costs 25 minutes; records the confession and travels to the harbor.]

### node_harbor_lift - The Saint Brendan, Loading
*loc: Harbor | time: 18:30 | type: event*

You come down the dock through ankle-deep water that wasn't there this morning. The harbor is loud â€” engines, rain, voices â€” and the Saint Brendan rides low against the pilings with her deck lights blazing.

Whether she's a lifeline or a closed door depends entirely on the hours behind you. If you spent them earning Reyes, she's here, idling, waiting for exactly you. If you spent them as the county runaway with a guess and a uniform, she's already gone or going, and no amount of arriving will change that now. The water doesn't negotiate and neither does she.

**Choices:**
- Board the boat and run the rescue with Reyes  ->  node_end_ferryman  *(if Only if Reyes fully trusts you and will lift (reyes_trust >= 3 and clue reyes_will_lift))*  [Boards the Saint Brendan; the boat runs overloaded rescue trips and you ride out the night aboard.]
- Beg a single seat off Reyes even though you didn't earn the lift  ->  node_end_ferryman  *(if Only if Reyes has at least some trust (reyes_trust >= 2) but won't run the mass rescue)*  [Boards as one of a few; Reyes takes a small load and you ride out the night aboard.]
- The boat is already gone â€” turn back for the pump house in the dark (+20 min)  ->  node_end_stranded  *(if Only if Reyes never trusted you (reyes_trust < 2))*  [Costs 20 minutes; the boat has left without you and the night closes in.]

### node_end_paper_or_stranded_check - Across the Span
*loc: Causeway | time: 18:40 | type: transition*

You take your place in the crawling line of cars and the bridge groans under you, water sheeting across the low span, the wipers losing their war. Behind you in the mirror, Pelican Reach is going dark, lights drowning one by one. Ahead, the mainland rises out of the rain like a promise.

What you carry across with you is the whole question of what this day was. A glovebox full of photographs and a confession â€” or just two empty hands and the bad luck of arriving everywhere too late to matter.

**Choices:**
- Reach the far side with the evidence and the confession  ->  node_end_paper_trail  *(if Only if you have the witness, the logs, and a cornered mayor (clues saw_cut_cable and gate_log_pulled, doyle_suspicion >= 4))*  [Carries the full case off the island; reaches the Paper Trail ending.]
- Reach the far side with empty hands  ->  node_end_drove_out_thin  *(if Always available as the fallback if you lack the full case)*  [Reaches the mainland alive but without the case that mattered.]

### node_end_held_line - Held the Line
*loc: FloodGate | time: 18:40 | type: ending*

You throw yourself into the crank gear and the world narrows to that one ring of steel and your own breath tearing. The water fights you for every inch. Your hands go from raw to bleeding to numb. At 18:40, with the Gulf roaring through a gap the width of a door, the gate grinds the last foot home and seals with a boom you feel in your sternum, and the channel â€” the murderous, pouring channel â€” goes still.

Pelican Reach floods only ankle-deep. The diner, the dock, the chrome and the stubborn old saints in their booth â€” bruised, soaked, standing. You missed the causeway by an hour; you'll ride out the night where the road can't reach you. But out of the dark comes a familiar diesel rumble: the Saint Brendan, Reyes at the wheel, come to take the last stragglers off the high ground and you with them, because you earned that boat with the truth.

In your soaked pocket, the cut cable's bright copper tag. You held the line. Now, in chapter two, you find out who handed Donnie Tillet the cutters â€” and you have the gate, the town, and the evidence all still standing to do it with.

### node_end_ferryman - The Ferryman's Bargain
*loc: Harbor | time: 19:00 | type: ending*

Reyes throws you a hand and hauls you over the gunwale, and the Saint Brendan pulls off the drowning dock heavy with frightened people, more than the law allows, more than is safe, exactly as many as will fit. She runs the channel by feel and memory in the dark, three overloaded trips while the gate she couldn't save pours the Gulf into the streets behind you.

The town drowns. The diner goes under to its countertops, the pump house your father ran disappears, Main Street becomes a canal. But the people â€” Earl and Miss Adeline and the Pruitt brothers, Sela white-knuckled beside you, dozens more â€” the people don't drown, because you spent your six hours earning the woman at this wheel instead of fighting a sea that was always going to win.

A hero's night that cost the town itself. And somewhere out there, the hand that cut the cable is still unnamed, still dry, still uncharged â€” the thing that will pull you back across this water in chapter two. Reyes catches your eye over the crowd and says nothing. She doesn't have to. You came back. That's a thing that was true today.

### node_end_paper_trail - The Paper Trail
*loc: Causeway | time: 18:55 | type: ending*

Your tires hit mainland asphalt at 18:55, five minutes before the low span goes under for good, and you pull over in the lashing rain and just breathe. On the seat beside you: the gate logs photographed, the cut cable's copper tag, the silenced alarm, the faked Tillet sign-off, and Frank's ragged half-confession that Doyle's own office told Donnie to skip the retrofit and lie.

You chose the truth over the rescue, and the truth has a cost with a face â€” the cars that were still crossing behind you when you stopped chasing people and started chasing evidence, the booth at the diner you can only hope Sela got moving. Fewer people made it out because you spent your hours on this. You'll carry that.

But the cheap-contract conspiracy that drowned Pelican Reach will not be a tragic act of God in tomorrow's paper. It will be a crime, with a contractor and a deputy and a mayor attached to it, because one person who grew up on that sandbar refused to let it sink quietly. The reckoning starts in chapter two. You have everything you need to bring it.

### node_end_last_bell - The Last Bell
*loc: Causeway | time: 18:45 | type: ending*

You can't stop the water â€” but you can ring the bell, the real one, the whole grid you brought back from the dead in your father's bunker. You key the master signal and for the first time in years every horn on Pelican Reach sounds at once, fourteen throats howling the same warning across the whole drowning island, unmistakable, undeniable, the sound the town was promised and never got.

And Sela hears it and she moves. She walks the old-timers out of the Salt Lick into their cars the way she swore she would â€” when the sirens mean it, she said, make them mean it â€” and a thin determined stream of headlights pours onto the causeway and beats the flood across by minutes. Earl, Miss Adeline, the Pruitts, a hundred others who finally believed the noise. The low span goes under right behind the last taillights.

The town is gone. The gate failed, the streets are a sea, the diner is somewhere under the dark. But its people heard the bell in time, because someone stayed long enough to fix the thing that warns them. A small save. A human one. The kind your father would have called enough. Chapter two finds you on the mainland with a town's worth of survivors and a question burning in you: who cut the cable that made the bell the only thing left to ring?

### node_end_drove_out_thin - Drove Out Thin
*loc: Causeway | time: 18:50 | type: ending*

You make the mainland with the water at your axles and nothing in your hands. No logs, no confession, no cable â€” or not enough of them, not the full case, not a cornered mayor to pin it on. You got yourself off the island and that is the entire sum of what you got.

Behind you Pelican Reach drowns in the dark, and you'll spend a long time wondering which of your six hours was the wrong one â€” the conversation you played too safe, the trust you never earned, the lead you didn't chase far enough to make it stick. You're alive. You're dry. And you're the technician who knew the gate was a lie and couldn't make the knowing matter in time.

It's not the bleakest end the tide hands out. But it's the loneliest kind of survival â€” the one where you live to carry the whole story and not one shred of proof. Chapter two begins with you on the wrong side of the water, starting over, hunting a cut cable that's already washed out to sea.

### node_end_stranded - What the Tide Took
*loc: PumpHouse | time: 20:00 | type: ending*

You spent your six hours hesitating â€” chasing the wrong lead, trusted by no one, present for nothing that mattered. The boat left without you because you never gave Reyes a reason to wait. The causeway flooded at 19:00 with you on the wrong side of it. The gate failed at 18:00 with no one standing at the crank.

And now, in the last dark, you've come back to the only place that was ever really yours: Pump House 7, your father's panel, the override switch under its steel cover. You throw it. Of course you throw it. And of course the gate is long dead at the far end and the switch does nothing but click, a light switch wired to a drowned bulb.

The water comes up through the floor of the bunker. It reaches the panel and the relays gutter out one by one, green and amber and the slow red fault light, all of them going dark together. The surge finds you at 20:00 with the override two feet underwater and your hand still on it.

This is the ending the world hands you when you let it move forward without you. The tide took the town, and then it took the one who stayed.

---

## Team 2 - The Last Ferry from Vael Harbor

*Start node: node_pier_arrival*

**Opening:**

Vael Harbor smells of salt rot and old secrets, and you have until midnight to leave it.

You are Della Voss â€” forty-one, broke, and out of professional credibility to spend. They let you go from the insurance bureau quietly, a year ago, after you accused the wrong man and couldn't prove it. So when a routine drowning payout landed on your desk â€” a fisherman off a fogbound island, open and shut, just needs a signature â€” you took it. Easy money. A boat there, a boat back, a name on a line.

Then the morning fax came through with the dead man's face on it, and your coffee went cold in your hand. Jonah Tarrow. The deckhand from the case that ended you. The one man alive who could have proved you'd been right all along.

Now he isn't alive.

The afternoon ferry sets you down on Vael Pier as the fog rolls in off the water, and behind you the boat is already pulling away â€” the last one back is at midnight, and the hand-painted schedule warns NO EXCEPTIONS. Six hours. One road. A lighthouse, a tavern, a cold room with a body in it, and a town where everyone has a reason to call this an accident.

Somewhere out past the breakwater, a light sweeps the fog every twelve seconds, patient as a clock.

The tide is coming in. So are you.

### node_pier_arrival - The Empty Mooring
*loc: Vael Pier | time: 18:00 | type: scene*

The fog comes in off the water like something with a grudge. You step off the afternoon ferry onto Vael Pier with your coat collar up and your case file under your arm, and the boat that brought you is already grumbling back out toward the mainland â€” the last one until midnight. A hand-painted schedule nailed to the ticket shed reads in flaking white: DEPARTS VAEL 12:00 AM. NO EXCEPTIONS.

There's a single sodium lamp, a chained life-ring gone green with salt, and below the concrete lip the harbor water moves black and unhurried, the way deep water does when it isn't in a rush to give anything back.

A row of mooring cleats lines the jetty. One of them is empty â€” a frayed end of mooring line still knotted to the iron, sawn or snapped, you can't tell from here. Net floats and a folded tarp sit where a boat ought to be. Someone left in a hurry, or didn't mean to leave at all.

Your watch says 6:00. You came to sign a drowning off as an accident, collect your fee, and never think about this place again. Then they showed you the dead man's face in a fax this morning, and you recognized it. Jonah Tarrow. The man you were fired for chasing.

Six hours. One ferry. A town that already knows you're here.

**Choices:**
- Crouch and examine the cut mooring line.  ->  node_cut_line  [You lose 5 minutes and notice the line was cut, not weathered.]
- Walk into town toward the tavern, the Drowned Anchor.  ->  node_anchor_rumors  [A 10-minute walk into town.]
- Go straight to the undertaker's to see the body while you still have nerve.  ->  node_cold_room  [A 15-minute walk to Bellweather's Cold Room.]

### node_cut_line - A Clean Cut
*loc: Vael Pier | time: 18:05 | type: discovery*

You go down on one knee where the concrete is slick. The mooring line isn't frayed â€” it's been opened with a blade, a single drawn stroke through hemp as thick as your thumb. Weather doesn't cut like that. A person does.

The tarp beside it is dry on the underside. Whatever sat here was hauled out recently â€” today, even. Net floats hang in a tidy bundle. Whoever owned this boat kept it neat, and somebody else made it disappear.

The lamp buzzes. Out past the breakwater, the lighthouse beam wheels through the fog every twelve seconds, patient as a clock. From up here you can see almost the whole town: the tavern's lit windows, the dark stone cottage at the far edge with one yellow square of light, the squat tower of the harbormaster's office leaning over the pier like a man listening at a door.

You pocket the observation the way you pocket everything â€” quietly, for later.

**Choices:**
- Climb to the Harbormaster's Office above the pier.  ->  node_office_first  [A 5-minute climb up the tower stairs.]
- Walk into town to the Drowned Anchor.  ->  node_anchor_rumors  [A 10-minute walk.]
- Head for the undertaker's to examine the body.  ->  node_cold_room  [A 15-minute walk to the Cold Room.]

### node_anchor_rumors - Locals Go Quiet
*loc: The Drowned Anchor | time: 18:15 | type: conversation*

The Drowned Anchor is the only warm thing in Vael â€” low black beams, peat smoke, a fire that's been burning since before you were born. When you push through the door, the talk doesn't stop so much as fold itself away. Six faces turn, register outsider, and turn back to their glasses with the practiced indifference of people who have decided, together, what they will and won't say.

The barman polishes a glass that's already dry. "You'll be the insurance woman," he says. Not a question. "Drink?"

In the corner booth, a man in a harbormaster's coat watches you over a whisky â€” silver at the temples, an easy smile that's done a lot of work in its life. He lifts the glass an inch in greeting. Silas Crannock. You know the name; he's the one who signed Jonah Tarrow's death an accident and faxed it to your office with a politeness that made your teeth itch.

Nobody mentions a drowning. Which is how you know everybody is thinking about it.

**Choices:**
- Buy a round and let the room loosen up. Listen.  ->  node_anchor_listen  [You spend 15 minutes and a little money, and the town warms a fraction.]
- Go straight to Crannock's booth and ask about Jonah Tarrow, plainly.  ->  node_crannock_booth  [Direct, but it puts the room on edge (+1 town suspicion).]
- Ask the barman where the dead man's family lives.  ->  node_anchor_directions  [He answers warily; 5 minutes.]

### node_anchor_listen - What the Smoke Says
*loc: The Drowned Anchor | time: 18:30 | type: discovery*

Money loosens tongues even in Vael, a little, after the second round. You don't ask questions. You let the silence do the asking and the whisky do the answering.

An old fisherman with hands like driftwood says it to his glass more than to you: "Jonah Tarrow could read this harbor blindfold. Twenty years on that water. Man like that doesn't just fall in." The barman shoots him a look and he goes quiet, but it's been said now, hanging in the smoke.

A younger one mutters that the Tarrow boat went out the night Jonah died and came back wrong. He won't say what wrong means. "Ask Maren," someone says. "His sister. She's the only one in this town who isn't getting paid to call it an accident." The cottage at the edge of town, with the net floats hung by the door like a warning.

And everyone, eventually, glances at Crannock's booth. Nobody contradicts him. Nobody quite looks at him either.

You've got the shape of it now, even if you don't have the bones.

**Choices:**
- Walk out to the Tarrow Cottage to find Maren.  ->  node_cottage_first  [A 15-minute walk to the edge of town.]
- Go see the body at the Cold Room before talking to anyone else.  ->  node_cold_room  [A 10-minute walk to Bellweather's.]
- Cross to Crannock's booth and take his measure.  ->  node_crannock_booth  [5 minutes.]

### node_anchor_directions - The Barman's Map
*loc: The Drowned Anchor | time: 18:20 | type: transition*

The barman sets down his cloth and leans in, lowering his voice so the booth can't hear. "Maren Tarrow. Stone house at the west edge, one light always on. She mends nets now her brother's gone." He pauses, weighing you. "She won't thank you for coming. But she's the only honest grief in this town, so. Mind how you go."

He glances toward Crannock's corner and adds, quieter still: "And mind him. He's been very generous lately. Generous men in Vael always want something signed."

Then he straightens, the moment gone, and goes back to polishing the dry glass.

**Choices:**
- Go to the Tarrow Cottage.  ->  node_cottage_first  [A 15-minute walk west.]
- Go to the Cold Room and examine Jonah's body.  ->  node_cold_room  [A 10-minute walk.]
- Climb to the Harbormaster's Office to read the logbook.  ->  node_office_first  [A 10-minute walk back to the pier and up.]

### node_crannock_booth - The Generous Man
*loc: The Drowned Anchor | time: 18:35 | type: conversation*

Crannock gestures at the bench across from him as if he owns it, which in every way that matters he does. Up close the easy smile has good teeth and tired eyes.

"Della Voss. All the way from the mainland for one drowning." He turns his glass slowly. "Terrible thing. Jonah went out drunk, the tide took him, we pulled what was left off the rocks at Cleat Point. Open and shut. I've got the certificate already drawn â€” you sign, you're on the midnight boat, everyone sleeps."

He says it kindly. That's the part that warns you. Kind men with paperwork already drawn have practiced this speech.

"You knew him," you say. "You signed him off the same night."

Something flickers and is gone. "Small town. I sign everyone off." He smiles. "Come up to my office before the ferry. We'll make this easy for you. You look like a woman who could use easy."

**Choices:**
- Tell him you'll consider it. Stay cordial.  ->  node_anchor_listen  [He warms to you (+1 crannock_trust). 5 minutes. You rejoin the room.]
- Tell him a man who can read a harbor doesn't drown in it.  ->  node_anchor_directions  [He cools; the room hears the edge in your voice (+1 town_suspicion, -1 crannock_trust). 5 minutes.]
- Say nothing. Get up and go see the body for yourself.  ->  node_cold_room  [A 10-minute walk to the Cold Room.]

### node_cold_room - Bellweather's Cold Room
*loc: Bellweather's Cold Room | time: 18:30 | type: scene*

The undertaker's shop smells of brine and formaldehyde and something underneath both that you've learned not to name. Ines Bellweather is a tired woman in a rubber apron, and when you tell her who you are she goes very still, the way people do when they're already afraid of someone who isn't in the room.

"Crannock said the insurance was sorted," she says.

"The insurance is me," you answer. "And I'd like to see him."

She looks at the door behind her, where Jonah Tarrow lies under a sheet on a steel table. Then she looks at you â€” really looks, weighing what you've already done tonight, whether you've come in here clean or trailing trouble.

**Choices:**
- Ask gently. Promise her name stays out of it.  ->  node_examine_body  *(if Available if you haven't burned your credibility in town (town_suspicion < 3).)*  [She relents and pulls back the sheet. 10 minutes.]
- Tell her you'll have Crannock's certificate thrown out if she doesn't cooperate.  ->  node_cold_room_refused  [Threatening the scared undertaker backfires (+1 town_suspicion). She refuses. 5 minutes.]

### node_cold_room_refused - A Door Closes
*loc: Bellweather's Cold Room | time: 18:40 | type: transition*

Ines's face shuts like a tide gate. "I think you should go," she says, very quietly, and her hand is already on the sheet, smoothing it down over the shape of Jonah Tarrow as if to protect him from you. "Whatever you are, you're not gentle, and gentle is the only thing that gets through a door in this town."

You've lost the room. Word will travel â€” it always does in places this small â€” and the next door will be harder.

But Vael has more than one way to the truth, if you've got the time to walk it. There's a logbook in the harbormaster's tower. There's an old man at the lighthouse who saw something. And there's a sister at the edge of town with nothing left to lose.

The fog presses against the window. Your watch ticks.

**Choices:**
- Climb to the Harbormaster's Office and read the logbook yourself.  ->  node_office_first  [A 15-minute walk to the pier tower.]
- Walk to the Tarrow Cottage and try the sister.  ->  node_cottage_first  [A 15-minute walk west.]

### node_examine_body - What the Tide Didn't Take
*loc: Bellweather's Cold Room | time: 18:45 | type: discovery*

Ines draws the sheet back to the chest and steps away to let you work, hugging herself in the cold.

Jonah Tarrow looks smaller than his fax. The sea has bleached him and the rocks at Cleat Point did the rest, and for a moment you just stand with the man you got fired for chasing, two years and a hundred miles from the case that ended your career. Then the habit takes over and you stop seeing a man and start seeing evidence.

The lungs, the lividity â€” drowning, yes, the certificate isn't lying about that. He went into the water alive. But you take his wrists in your gloved hands and turn them to the lamp, and there it is, the thing a tide can't fake: a band of abraded flesh around each wrist, deep and even, the unmistakable signature of rope drawn tight by someone who meant it to hold.

He was tied. He went into the black water tied, and he drowned trying to get free.

"You saw nothing," Ines whispers, but her eyes are wet. "Please."

This isn't a payout anymore. It's a murder, and you're the only one off the island who knows it.

**Choices:**
- Climb to the Harbormaster's Office. Find the logbook â€” and Crannock.  ->  node_office_first  [You now know it was murder. A 15-minute walk to the tower.]
- Go to the Tarrow Cottage and tell Maren what you found.  ->  node_cottage_first  [You now know it was murder. A 15-minute walk west.]

### node_office_first - The Harbormaster's Tower
*loc: Harbormaster's Office | time: 19:30 | type: scene*

The office is a cramped room at the top of a salt-rusted stair, walls papered with tide charts and the kind of barometers that have outlived their owners. A brass bell rope rises through a hole in the ceiling, taut, waiting. On the desk, open to today, lies the harbor logbook â€” every boat in, every boat out, in Crannock's careful hand.

The room is empty. Through the window the pier lamp gutters in the fog, and the lighthouse beam wheels past, once, twice, counting.

Your watch says it's getting on. Somewhere below, the tide is climbing the pilings.

If you mean to read that log, now's the time â€” before its author climbs the stairs.

**Choices:**
- Read the logbook's entries for the night Jonah died.  ->  node_logbook  [You find a tampered entry. 10 minutes.]
- Wait here for 9 PM. Something tells you Crannock will come to ring that bell.  ->  node_bell_present  *(if Available before 9:00 PM.)*  [You wait out the clock to 9:00 and witness the bell.]
- Walk the long breakwater out to the lighthouse to find the old keeper.  ->  node_lighthouse  [A punishing 35-minute walk each way â€” the posted sign warns of it.]

### node_logbook - A Lie in His Own Hand
*loc: Harbormaster's Office | time: 19:40 | type: discovery*

You run your finger down the column for the night Jonah drowned. Boats out, boats in, times in neat columns. And there â€” the Tarrow boat, logged IN at 8:50 PM.

But the ink is wrong. Fresher than the lines around it, the pen pressed harder, the 8:50 crowded into a space that wanted a different number. Someone backdated the entry to put Jonah's boat safely moored an hour before anyone could place it out at Cleat Point. The harbormaster's own hand, covering the harbormaster's own night.

And a marginal note, half-erased: a tide table reference for 9:48 PM, high water at the Point. The exact wrong time to be in that water unless someone put you there.

A posted card by the door, weather-stained, gives the travel times around the harbor â€” and confirms what your legs already fear: Cleat Point Lighthouse, 35 minutes out along the breakwater. Seventy minutes round trip. A long way to spend against a midnight boat.

Footsteps on the stair below. Slow. Unhurried. The smile climbing up to meet you.

**Choices:**
- Confront Silas with the wrist marks. You know it was murder.  ->  node_confront_crannock  *(if Only if you examined the body and know it was murder.)*  [A direct accusation. 10 minutes.]
- Stay calm and let him make his offer.  ->  node_bribe_scene  [You don't tip your hand. 5 minutes.]
- Slip out and walk to the lighthouse to find the witness while he's distracted.  ->  node_lighthouse  [A 35-minute walk out the breakwater.]

### node_bell_present - Three Strokes at Nine
*loc: Harbormaster's Office | time: 21:00 | type: event*

At nine exactly, boots on the stair. You step into the shadow of the chart cabinet and Crannock comes in without seeing you, all business now, the tavern smile left downstairs. He takes the brass rope in both hands and hauls â€” once, twice, three times â€” and out across the fog the harbor bell tolls, deep and final, a sound the whole town stops to hear.

A fisherman waits at the door, cap in hand. Crannock speaks low, but you're close enough.

"The Tarrow boat stays moored. Nobody goes near Cleat Point tonight. Not the keeper, not anyone. The light does its job alone." The fisherman nods and is gone.

Crannock stands a moment in the bell's dying ring, looking out at the wheeling beam â€” the lighthouse he's just sealed off, the old man out there he doesn't want anyone reaching. Then he turns to leave and sees you.

The silence stretches. He's wondering how much you heard. You're wondering the same about how much he'll do about it.

**Choices:**
- Step out of the shadow and confront him with what you heard â€” and the wrists.  ->  node_confront_crannock  *(if Only if you know it was murder.)*  [You learned he blocked the lighthouse. A sharp confrontation. 10 minutes.]
- Pretend you heard nothing and let him make his offer.  ->  node_bribe_scene  [You note that he blocked the lighthouse, but play dumb. 5 minutes.]
- Bolt down the stairs and run for the lighthouse before he can stop you.  ->  node_lighthouse  [You learned he blocked the lighthouse. A frantic 35-minute walk.]

### node_cottage_first - The One Lit Window
*loc: The Tarrow Cottage | time: 19:00 | type: conversation*

The Tarrow cottage sits where the town gives up and the rocks begin, a dark stone box with net floats hung by the door like shrunken heads. One window burns yellow. You knock, and after a long time the door opens on a chain and a woman's face, hard and sleepless â€” Maren Tarrow, with her dead brother's stubborn jaw.

"Insurance," she says, before you speak. "Come to call my brother a drunk so the company keeps its money. They've all been by to practice the word for me. Accident." The chain doesn't move.

Behind her you can see a table strewn with net and twine, a single chair, a photograph turned face-down. Grief lives here and pays no rent to anyone's convenience.

How you stand right now depends entirely on what you've already done in this town tonight.

**Choices:**
- Tell her you don't think it was an accident â€” and you can prove the wrists.  ->  node_maren_confession  *(if Only if you know it was murder.)*  [The truth earns her trust (+2 maren_trust). The chain comes off. 15 minutes.]
- Tell her honestly you don't know yet, but you're not here to bury him.  ->  node_maren_wary  [She softens a little, watchful (+1 maren_trust). 10 minutes.]
- Press her hard for what she knows. You're short on time.  ->  node_maren_wary  [She shuts down; you've earned nothing (no trust gained). 5 minutes.]

### node_maren_wary - Net and Twine
*loc: The Tarrow Cottage | time: 19:15 | type: conversation*

She doesn't take the chain off, but she doesn't close the door either. That's as much as Vael gives a stranger.

"Jonah owed money," she says finally, looking past you into the fog. "To the wrong man. The kind who runs the ferry and the bell and decides who the tide forgives. Jonah was going to talk to someone official â€” go to the mainland, he said, finally make it right about some old business." Her jaw works. "Then he went out one last night and the official man wrote 'accident' before they'd even dried him off."

She studies you through the gap. "If you find out what really happened â€” really find out, not the company's version â€” you come back here. I'll know if you're lying by then. People always come back to this door lying. Be the one who doesn't."

The chain stays on. But she's told you where to dig: the body, the keeper who watches that water, the man who runs the bell.

**Choices:**
- Go examine Jonah's body at the Cold Room.  ->  node_cold_room  *(if Best if you haven't already been turned away there.)*  [A 15-minute walk to Bellweather's.]
- Climb to the Harbormaster's Office and read the logbook.  ->  node_office_first  [A 15-minute walk to the pier tower.]
- Make the long walk to the lighthouse to find the old keeper.  ->  node_lighthouse  [A 35-minute walk out the breakwater.]

### node_maren_confession - By Candlelight
*loc: The Tarrow Cottage | time: 19:30 | type: discovery*

When you say the word rope, the chain rattles off the door and Maren steps back to let you in, and for the first time her hard face cracks toward something human.

"I knew," she says, sitting hard in the single chair. "I knew it the second they wouldn't let me see his hands." She drags the face-down photograph upright: Jonah, sun-squinting, alive. "He found something in his old papers â€” a fraud, years back, a man drowned for the insurance and the wrong fellow took the fall. Jonah was on the boat that night, just a deckhand, didn't understand what he'd seen until lately. He was going to the mainland to confess his part and name the man who paid him to stay quiet." Her eyes find yours. "Silas Crannock."

The old case. The one you got fired for chasing the wrong man on. Jonah knew the right one. And Crannock drowned him to keep him from saying so.

Maren takes a sheet of paper and a stub of pencil. "I'll write it down. Everything he told me, signed. You get it off this island and you finish what my brother died trying to start. But understand â€” " she grips your wrist, " â€” if you take that man's money instead, I'll know. And there's no boat far enough."

**Choices:**
- Take her signed statement and promise to name Crannock from the mainland.  ->  node_office_first  [You gain Maren's signed statement and her full trust (+1 maren_trust). Head for the office and the ferry. 15 min.]
- Stay and ask if you can shelter here if you miss the ferry.  ->  node_maren_shelter  [You gain her statement and deepen her trust (+1 maren_trust). 10 minutes.]

### node_maren_shelter - A Bolt on the Door
*loc: The Tarrow Cottage | time: 19:40 | type: transition*

Maren looks at you a long moment, then at the black window, then nods once. "The door bolts from inside," she says. "If the tide and that man between them keep you off the midnight boat, you come here. I won't turn out the one person on this island who believed me."

It's not safety, exactly. Two women in a stone house against a town that wants a thing forgotten. But it's more than you arrived with.

She folds the signed statement into your coat herself, smooths it flat over your heart. "Now. The ferry leaves at twelve and Vael doesn't wait. Go do it the brave way if you can. Come back the alive way if you can't."

The lighthouse beam crosses the window, and your watch keeps its small relentless promise.

**Choices:**
- Race for the midnight ferry at the pier while there's still time.  ->  node_ferry_resolution  [A 20-minute walk to the pier.]
- Risk the long walk to the lighthouse first to get the witness too.  ->  node_lighthouse  [A 35-minute walk out the breakwater â€” a real gamble against midnight.]

### node_lighthouse - Cleat Point
*loc: Cleat Point Lighthouse | time: 20:30 | type: conversation*

The breakwater is a spine of wet stone running out into nothing, and the walk is every bit as long as the sign promised. The fog swallows the town behind you. The automated light wheels overhead every twelve seconds, and in its passes you see the keeper's cottage hunched at the base of the tower, one storm lantern in the window.

Eli Goff opens the door before you knock â€” a small, frightened old man who has clearly watched you come the whole way out. "You shouldn't be here," he says. "Crannock rang the bell. Nobody's to come." But he doesn't shut the door. He's been waiting years for someone to make him say it.

He saw the Tarrow boat go out that last night. He saw two men in it. And he saw it come back with one.

**Choices:**
- Ask him who tied Jonah's wrists.  ->  node_eli_testimony  *(if Only if you examined the body and know about the rope.)*  [The right question. Eli breaks and tells you everything. 15 minutes.]
- Ask him generally what he saw that night.  ->  node_eli_vague  *(if Shown when you don't yet know it was murder.)*  [He's too scared to say much without the right question. 10 minutes.]
- Don't waste another minute. Turn back for the ferry now.  ->  node_ferry_resolution  [The long 35-minute walk back to the pier.]

### node_eli_vague - What He Won't Say
*loc: Cleat Point Lighthouse | time: 20:40 | type: discovery*

Eli's hands shake on the lantern. "A boat went out. Came back. The water takes men, miss â€” it's an old town and a cold sea." He's giving you the script, the safe one, the one Crannock would approve. There's more behind his eyes, a whole drowned year of it, but he won't hand it to someone who can't already see the shape.

"I've said too much," he whispers. "Go on now. Mind the tide on the way back â€” it covers the low stones after ten, and you'll want to be ahead of it."

Whatever he saw, he'll only confirm it for someone who already knows the question. You'd have needed to see those wrists.

The beam wheels. Far off, you imagine you can hear the harbor bell's echo still hanging in the fog. And your watch is no longer your friend.

**Choices:**
- Turn back for the pier and make the midnight ferry while you still can.  ->  node_ferry_resolution  [The long 35-minute walk back.]
- Walk back via the Cottage to tell Maren what little you have.  ->  node_cottage_first  [A 30-minute walk back along the breakwater to the cottage.]

### node_eli_testimony - The Man Who Came Back Alone
*loc: Cleat Point Lighthouse | time: 20:45 | type: discovery*

When you say the word rope, something goes out of Eli Goff â€” the fear, or the holding of it. He sits down heavily on the cottage step.

"Crannock," he says. "It was Crannock in the boat with him. I watched through the glass. They went out past the Point and I saw â€” I saw Jonah's hands behind him, and Silas standing over him, and then it was just Silas at the tiller coming home alone, slow, like a man with all night." Tears stand in the old eyes. "Jonah was going to the mainland to tell on him over some old insurance killing. Silas couldn't have that. So he tied him to his own anchor and let the high tide do it for him. Nine forty-eight, the water tops the Point. He knew the tide table like scripture."

He grips your sleeve. "I'll come. I'll say it to a mainland magistrate if you can get me off this rock alive. But you'll never make the ferry walking me out â€” these old legs. Choose, miss. The truth or the boat. Sometimes the tide doesn't let you have both."

You have a witness. Now you only need the one thing Vael guards most jealously: time.

**Choices:**
- Leave Eli to follow and run flat-out for the midnight ferry with what you have.  ->  node_ferry_resolution  [You secured Eli's testimony. The long 35-minute walk back to the pier.]
- Walk Eli back as far as the Cottage to Maren â€” slower, but together.  ->  node_cottage_first  [You secured Eli's testimony. A slow 40-minute walk to the cottage.]

### node_bribe_scene - The Envelope
*loc: Harbormaster's Office | time: 21:15 | type: event*

Crannock sets a thick manila envelope on the desk between you with two fingers, the way you'd lay down a winning card. The certificate of accidental death waits beside it, his signature already dry, a blank line where yours should go.

"Enough there to forget you were ever cold," he says, and the tavern smile is back, kindly, terrible. "You sign 'accident,' you take the envelope, you make the midnight boat, and Vael becomes a place you can't quite remember. Nobody's hurt. The man's dead either way â€” money in your coat changes nothing for him and everything for you." He spreads his hands. "I'm not a monster, Della. I'm just a man who knows how the tide runs. Be smart. Be warm. Sign."

The envelope sits there, fat and quiet. Outside, the beam wheels. Somewhere a woman is mending nets and waiting for someone not to come back to her door lying.

Your move, investigator.

**Choices:**
- Take the envelope. Sign the ruling. You had no proof anyone would believe.  ->  node_ferry_resolution  [bribe_taken = true; +2 crannock_trust. You head for the ferry, money in your coat. 5 min.]
- Pocket the envelope and lie that you'll cooperate â€” then go anyway.  ->  node_ferry_resolution  [bribe_taken = true; +1 crannock_trust; you keep the option to betray him. 5 min.]
- Push the envelope back across the desk and refuse him to his face.  ->  node_confront_crannock  [You refuse openly (-2 crannock_trust). His face changes. 5 minutes.]

### node_confront_crannock - The Smile Comes Off
*loc: Harbormaster's Office | time: 21:30 | type: event*

You lay it out for him flat, the way you'd lay out a case file: the rope burns around a drowned fisherman's wrists, the backdated entry in his own logbook, the high tide at 9:48 he knows like scripture. You watch the kindly mask come off Silas Crannock one muscle at a time, and what's underneath is not angry. It's calm. Calm is worse.

"You've been busy," he says softly. "That's a great deal of trouble to invent on your last night with a working career." He moves between you and the door, unhurried, a man who has the whole island on his side of the ledger. "I controlled the bell so no one would reach the keeper. I can control a ferry just as easily, Della. It may run early tonight. It may run not at all, for the wrong passenger."

He steps aside, finally, almost courtly. "Or you walk down to that pier and you board it and you never come back, and we both pretend this conversation drowned with him. I'd take the boat if I were you. The tide is rising, and on this island the tide always wins."

The threat is real and the clock is realer. You go.

**Choices:**
- Get to the pier and the midnight ferry before he can carry out the threat.  ->  node_ferry_resolution  [Crannock now sees you as a threat (-1 crannock_trust). A 5-minute descent to the pier.]
- Detour to the Cottage to put your evidence in Maren's hands first.  ->  node_cottage_first  [Crannock marks you as a threat (-1 crannock_trust). A 15-minute walk to the cottage.]
- If you never reached the body, you have only suspicion â€” make the long gamble to the lighthouse for a witness.  ->  node_lighthouse  *(if Shown when you don't yet know it was murder.)*  [A desperate 35-minute walk out the breakwater.]

### node_ferry_resolution - The Last Ferry from Vael Harbor
*loc: Vael Pier | time: 23:30 | type: transition*

Vael Pier again, where you started, where everything in this town finally comes to be paid for. The fog is a wall now and the tide has climbed halfway up the pilings, black water slapping the concrete with the patience of something that has all night.

The sodium lamp gutters. Somewhere out in the murk, an engine â€” or the memory of one. You check your watch and the whole night narrows to this single point: are you in time, and what are you carrying when you arrive?

The chained life-ring sways. The schedule on the shed reads what it has read all evening. NO EXCEPTIONS.

This is where Vael decides what to do with you.

**Choices:**
- Board the ferry and ride out with everything you've gathered.  ->  node_end_vindication  *(if If you made the boat in time (before midnight), know it was murder, earned Maren (trust >= 2), and refused the bribe.)*  [made_ferry = true. The boat carries you and the truth to the mainland.]
- Board the ferry with Crannock's money in your coat.  ->  node_end_bought  *(if If you made the boat in time (before midnight) and took the bribe.)*  [made_ferry = true. You leave with the envelope and the secret intact.]
- Board the ferry. You file it as an accident in good faith.  ->  node_end_walked_away  *(if If you made the boat in time (before midnight) and never learned it was murder.)*  [made_ferry = true. You leave, never knowing how close you stood.]
- The lights pull away without you. You're trapped â€” find Maren's bolted door.  ->  node_end_stranded_safe  *(if If you missed the boat (midnight or later) but Maren fully trusts you (trust >= 3).)*  [made_ferry = false. You're stranded, but not alone.]
- The lights pull away without you. You're trapped on the island, and known.  ->  node_end_marked  *(if If you missed the boat (midnight or later), know it was murder, and Crannock now sees you as a threat (crannock_trust < 0).)*  [made_ferry = false. Trapped overnight with a man who's certain you're a threat.]

### node_end_vindication - Ending: Vindication [ENDING]
*loc: The Ferry | time: 00:00 | type: ending*

The deck rail is cold under your hands as Vael shrinks into the fog behind you, that one yellow window the last thing to go. In your coat: a folded statement signed in Maren Tarrow's stubborn hand, the photographs you took of two abraded wrists, the page you tore from a logbook lying in its author's own ink.

For two years you've carried the wrong man's face â€” the one you accused, the one that cost you your name. Tonight you carry the right one. Jonah Tarrow knew it. He died trying to say it. You'll say it for him, from a mainland office, into a telephone, to people who have to write it down.

It will cost you sleep. It may cost you more than that. As the mainland lights come up ahead, you think about how calm Crannock was, how he said the tide always wins â€” and how a man that calm has friends on more shores than one.

But for the first time since they let you go, you got the right man. The ferry's wake is a white road behind you, leading back to a town that wanted you gone, and to a fight that's only beginning.

### node_end_bought - Ending: Bought and Gone [ENDING]
*loc: The Ferry | time: 00:00 | type: ending*

The envelope is a warm thick weight against your ribs the whole way across, and you keep one hand on it like a man keeps a hand on a wound. You signed where Crannock pointed. Accident. You watched the word leave your pen and you told yourself the thing you'll tell yourself for the rest of your life: there was no proof anyone would have believed.

There was. You know exactly where it lay, under a sheet on a steel table, two clean bands around a fisherman's wrists. You just decided to be warm instead of right.

Vael keeps its secret. The town will sleep tonight, and so, eventually, will you, money in your coat and Jonah Tarrow's bleached face waiting behind your eyes every time you close them.

Months from now an envelope will arrive at your mainland flat with no return address, and inside it a single photograph you could swear you never took â€” a drowned man's wrists, and someone, somewhere, who knows you saw. The fog reaches the rail. The mainland comes up cold and ordinary. You are exactly as free as you paid to be.

### node_end_walked_away - Ending: Just the Paperwork [ENDING]
*loc: The Ferry | time: 00:00 | type: ending*

You sign the drowning off as an accident because, as far as you ever learned, that is exactly what it was. A man who knew the harbor went into it on a bad night and the tide kept him. You were thorough enough to feel clean and not quite thorough enough to be right, and you'll never know the difference â€” that's the mercy and the horror of it.

The ferry takes you out on schedule. You file the report in good faith. You sleep fine. You think, once or twice on the crossing, of the dark cottage at the edge of town with its one lit window, and feel nothing in particular, and that is the most haunting part: you stood a single sheet of fabric away from the truth and walked out into the fog feeling like a professional who'd done her job.

Weeks later, on the mainland, a clerk reopens the Tarrow file for a routine audit. Your signature sits on the line that says accident, and a younger investigator frowns at a coroner's note about the wrists that no one read in time â€” and reaches for the telephone. Somewhere a case is about to have your name on it, on the wrong side. You don't know that yet. You feel fine. You feel absolutely fine.

### node_end_stranded_safe - Ending: Stranded, but Believed [ENDING]
*loc: The Tarrow Cottage | time: 00:10 | type: ending*

You reach the pier in time to watch the ferry's lights detach from the world and slide away into the murk, taking the mainland and the morning with them. The tide has the pilings now. You're on the island until dawn, at least â€” if Vael gives you a dawn.

But you turn from the black water and walk west, to the stone house with the one lit window, and Maren Tarrow opens the door before you knock and draws you in and throws the bolt behind you with a sound like a full stop at the end of a long sentence.

No evidence leaves the island tonight. The photographs, the statement, the truth â€” they stay here, candlelit, two women and a dead man's name in a house a town would like to forget. But you are not alone, and that is not nothing. For hours she tells you the whole of it, everything Jonah was and everything Crannock took, and you write, and the storm lantern burns low.

"Two of us know now," Maren says, when the telling is done and the night is its blackest. "He can drown one stranger. He can't drown a town's worth of remembering." Outside, the lighthouse beam wheels patiently over a harbor that thinks it has won. It hasn't. Not yet. The case starts tomorrow, from the inside, and you have somewhere to begin.

### node_end_marked - Ending: The Tide Doesn't Wait [ENDING]
*loc: Vael Pier | time: 00:00 | type: ending*

You spend your minutes the way you've spent your whole career â€” chasing the truth one step past what was safe. Out at Cleat Point you got it, all of it, the witness and the wrists and the man who came back alone. And on the long walk in, the fog ahead of you bloomed with a light that wasn't the lighthouse, and the engine you'd been praying toward coughed, and pulled, and the ferry's lamps slid away from the pier without you.

Midnight. The tide is at the top of the pilings. The schedule on the shed still reads NO EXCEPTIONS, and for you, tonight, there are none.

You're trapped on the island, holding everything Silas Crannock killed a man to bury, and Crannock knows it. You refused his envelope and named his crime to his face, and a man that calm does not forget a loose end overnight. Somewhere up in the leaning tower, a lamp is still lit. He knows the ferry's gone. He knows you're still here.

The last thing the screen holds is the lighthouse beam, sweeping the fog, twelve seconds and gone, twelve seconds and gone â€” out where Jonah Tarrow learned that on this island the tide always wins. Chapter two opens at dawn. If you live to see it.

---

## Team 3 - The Prater Line

*Start node: node_safehouse*

**Opening:**

Vienna, the night of 14 November 1971. Rain, and the smell of wet trams. You are Cal Maddox, twenty-six years old, four months trained, and tonight â€” for the first time â€” alone. A satchel waits on a table in a safehouse above a dead tailor's shop. A frightened woman waits in the back booth of a coffeehouse across the city, with something sewn into her coat that the world should not have. The last neutral train west leaves Westbahnhof at 02:10. You have six hours to walk her out of this city, and the only thing shorter than your time is your supply of people you can trust. The clock starts now. It is 20:00.

### node_safehouse - The Margareten Safehouse
*loc: The Margareten Safehouse | time: 20:00 | type: scene*

Rain ticks against the dormer window like a code you can't read. The flat smells of damp wool and burnt coffee, and under a grey blanket the radio set hums a single steady note, waiting.

Lindqvist sits with his back to the wall, the way he always sits, a cigarette burning down untasted between two fingers. He nudges the satchel across the table toward you with one knuckle.

"It's clean," he says. "Cover passport, transit chit, the address. You go to Sperl, you collect the woman, you put her on the oh-two-ten west. Six hours, Cal. A long time to do a simple thing."

He says simple the way other men say dangerous.

"She'll be skittish. She's a physicist, not an agent â€” she's never done this. So be gentle and be quick, and do not, whatever happens, take her down to the canal. There's nothing for you at the canal tonight."

The clock on the radio reads 20:00. The cigarette finally drops its ash.

**Choices:**
- Take the satchel and the cover story at face value. Trust the old man.  ->  node_to_sperl  [Lindqvist warms to you (+1 trust). One minute passes.]
- "Why the canal? You only forbid a thing you're worried about." Push him.  ->  node_safehouse_press  [He goes guarded; you lose a little of his goodwill (-1 trust). Five minutes of fencing.]
- Wait until he steps to the radio, then quietly search the satchel he gave you.  ->  node_search_satchel  *(if Only if you already distrust Lindqvist (lindqvist_trust below 2).)*  [Ten careful minutes. You may find something he didn't mean you to.]

### node_safehouse_press - What the Old Man Won't Say
*loc: The Margareten Safehouse | time: 20:05 | type: conversation*

Lindqvist studies you for a long moment, and something paternal goes out of his face. What's left is just tired.

"You want to know why," he says. "Good. Curiosity is the only thing that keeps couriers alive. But there's curiosity, and there's the kind that gets a frightened woman shot on a tow-path."

He leans forward. "The canal is somebody else's appointment tonight. Not yours. If you're standing there at half eleven you'll see things that will make you do something stupid, and stupid is how green men die in this city. That's all I'll give you. Now â€” do you trust me, or do you trust the itch under your collar?"

The radio hums. Outside, a tram grinds past, throwing wet light across the ceiling.

**Choices:**
- "I trust you." Let it go and take the satchel.  ->  node_to_sperl  [He relaxes; trust restored (+1). The night is yours.]
- Say nothing. Note that he never actually denied the canal was a handoff.  ->  node_to_sperl  [You file the suspicion away (clue: you suspect the canal is a handoff). Trust stays cool.]
- Wait for him to turn to the radio, then search the satchel.  ->  node_search_satchel  *(if Only if your trust in Lindqvist has already gone cold (below 2).)*  [Ten careful minutes while his back is turned.]

### node_search_satchel - Under the False Bottom
*loc: The Margareten Safehouse | time: 20:15 | type: discovery*

He crouches at the radio, headphones half on, and the world narrows to the soft brass clasps under your thumbs.

Papers. The passport â€” your face, a stranger's name. The transit chit. And beneath the liner, where the cardboard shouldn't be that thick, a second envelope. No seal. Inside: a single photograph of Irina Dragomir, taken with a long lens on a Vienna street, and clipped to it a flimsy carbon you were never meant to read. KOMPROMITTIERT. SUBJECT SURVEILLED SINCE OCTOBER. HANDLE AS BURNED.

Your stomach drops through the floor. She isn't a defector slipping a net. She walked out under a net that was already drawn â€” and Lindqvist has known since October.

The radio crackles. He's turning. You slide it all back and stand, mouth dry.

**Choices:**
- Pocket the carbon. Keep your face still. Walk to Sperl carrying a secret.  ->  node_to_sperl  [You learn Dragomir was blown from the start. Trust in Lindqvist collapses. You carry the carbon.]
- Confront him now, carbon in your fist. "You sent me to walk a corpse to a train."  ->  node_safehouse_confront  [You learn she was blown â€” and burn the last of your trust in him to the ground.]

### node_safehouse_confront - The Old Man's Arithmetic
*loc: The Margareten Safehouse | time: 20:25 | type: conversation*

He doesn't flinch at the carbon. That's the worst of it â€” he looks at it the way a man looks at a bill he expected.

"So you searched the bag," Lindqvist says softly. "Good. I half hoped you would." He takes off the headphones. "Yes. She's blown. Has been for weeks. London wants the microfilm she's carrying, and they do not greatly care whether the woman attached to it reaches Salzburg. You were sent to bring the film. She was always... freight."

He lets that sit in the damp air.

"You can still bring her out. I'm not ordering you to leave her. I'm telling you the truth so you choose with your eyes open, which is more than this service gave me at your age. The canal at half eleven is where the film is supposed to change hands without her. Stay away, and you might still save the person instead of the prize. Or go, and learn exactly who I work for. Your call, courier."

The clock reads 20:25.

**Choices:**
- Leave without another word and go to Dragomir. Decide later who you serve.  ->  node_to_sperl  [You go cold and quiet, carrying everything you've learned.]
- "Then I'll do my own arithmetic." Take the satchel anyway and go.  ->  node_to_sperl  [A grudging flicker of respect passes between you (+1 trust, off the floor).]

### node_to_sperl - Across the Wet City
*loc: Margareten streets | time: 20:30 | type: transition*

The street meets you with a fistful of rain. Margareten is shuttered and sodium-orange; somewhere a dog complains behind a courtyard gate. You turn up your collar over the satchel and start north toward the Naschmarkt, toward Sperl, toward her.

A tram waits at the corner, doors hissing, warm yellow inside. Or your own two feet through the back lanes, slower but unwatched. Either way the woman in the back booth is getting colder, and somewhere in this city Anatoly Volkov is awake and curious.

**Choices:**
- Take the tram. Fast, lit, a little exposed.  ->  node_sperl  [The tram eats the distance (+10 minutes).]
- Walk the back lanes. Slower, but you'd see a tail.  ->  node_sperl  [Twenty minutes on foot â€” but you arrive certain no one followed (+1 trust from your own steadiness).]

### node_sperl - Cafe Sperl, the Back Booth
*loc: Cafe Sperl | time: 20:50 | type: conversation*

The coffeehouse is a cave of old velvet and marble, half its lamps dark, a pianist murdering Schubert in the corner. At the back, under a clouded mirror, a woman sits with both hands wrapped around a cup that went cold an hour ago.

Irina Dragomir is smaller than her file. Sharp-boned, dark-eyed, and so tightly wound that when your shadow falls across the table her whole body flinches toward the service door. She has already chosen which way she'll run.

"You're late," she says, not looking up. "Or you're not him at all. I have been deciding which would be worse." Her English is precise, frightened, beautiful. "Sit. Order something. If we are to be shot let it look ordinary."

You sit. Under the table, you can feel her knee shaking. Everything from here depends on the next thing out of your mouth.

**Choices:**
- Tell her the plain truth: it's dangerous, you're new, but you'll get her out or die trying.  ->  node_sperl_trust  [Honesty lands. She softens (+2 trust). Fifteen minutes.]
- Reassure her with the cover story â€” smooth, confident, the way the manual says.  ->  node_sperl_cover  [She hears the script and goes colder (-1 trust). Fifteen minutes.]
- Tell her what you found in the satchel â€” that she was blown before she ever ran.  ->  node_sperl_trust  *(if Only if you know Dragomir was blown.)*  [Dangerous honesty. It terrifies her â€” and binds her to you completely (+3 trust). Twenty minutes.]
- Skip the gentling. "Give me the microfilm now and we both stop being targets."  ->  node_sperl_press_film  [You press too early. She recoils (-2 trust). Ten minutes.]

### node_sperl_trust - The Crack in the Cup
*loc: Cafe Sperl | time: 21:10 | type: conversation*

Something in her unbolts. Not all the way â€” people like her never unbolt all the way â€” but enough that her shoulders drop a centimetre and she finally looks at your face instead of the door.

"You are honest," she says, almost an accusation. "They sent me an honest boy. That is either very kind or very cruel of them." She turns the cold cup a quarter-turn. "There is a film. Two films, in truth. One I will give to anyone who asks loudly enough â€” it is engine schematics, real, worthless. The other..." Her thumb brushes the seam of her coat. "The other does not leave my body until I believe the body it goes to will get on that train with me. Do you understand the difference, courier?"

You do. Trust is the only currency she takes.

It's getting on for half nine. The clock is a quiet animal in the room.

**Choices:**
- "Then let me earn the second one." Ask for the real microfilm directly.  ->  node_get_real_film  *(if Only if she trusts you enough (dragomir_trust 3 or more).)*  [She decides you're the body. She gives you the real film.]
- Don't push the film. "Walk with me. We'll talk on the way to the station."  ->  node_crossroads  [She rises and takes your arm. Dragomir is now with you. Five minutes.]
- Tell her a quiet voice says there's a handoff at the canal tonight you don't understand.  ->  node_crossroads  *(if Only if you suspect the canal is a handoff, or know she was blown.)*  [She pales. "Then someone is selling me twice." She comes with you, frightened and bonded (+1 trust).]

### node_sperl_cover - She Has Heard This Speech Before
*loc: Cafe Sperl | time: 21:05 | type: conversation*

You give her the smooth version â€” the routes, the friends in high places, the certainty. You hear yourself doing it and so does she.

Her mouth thins. "You read that from a card," she says. "I have crossed three borders on speeches like that. The men who made them are dead or rich, and I am here, in a dead cafe, with a boy reciting." She pulls her coat tighter. "I will come as far as the door with you. After that you must give me a reason that is not printed."

The pianist finishes mangling Schubert and starts again, worse. Half past nine is breathing down the room.

**Choices:**
- Drop the script. Tell her the real, frightening truth instead.  ->  node_sperl_trust  [Honesty, late but real. She recovers some faith in you (+2 trust). Ten minutes.]
- Just get her moving. "Reasons later. The train doesn't wait."  ->  node_crossroads  [She comes, but wary, the real film still hidden. Dragomir is with you. Five minutes.]

### node_sperl_press_film - The Wrong Thing to Want First
*loc: Cafe Sperl | time: 21:00 | type: event*

Her hand stops halfway to the cup. The warmth you hadn't earned yet drains out of the booth.

"Of course," she says, and her voice is glass. "The film. Always the film. I am a courier's errand, not a person." She reaches into her coat and lays a small steel canister on the marble between you, sliding it across with one finger like something dead. "Here. Take it. Now leave me to my coffee and tell your masters the package is collected."

You know, the moment you touch it, that it's too easy. The decoy. The real film is still somewhere on her, behind a wall you just made taller.

The clock reads 21:00.

**Choices:**
- Pocket the decoy and try to recover. "That's not what I meant. Let me start again."  ->  node_sperl_cover  [You take the decoy canister and try to rebuild from a hole. Five minutes.]
- Take the decoy, take her arm, and leave. You can mend it walking.  ->  node_crossroads  [Decoy in pocket, Dragomir reluctantly with you. Five minutes.]

### node_get_real_film - What She Carries Against Her Heart
*loc: Cafe Sperl | time: 21:15 | type: discovery*

Irina Dragomir looks at you for a long, weighing moment. Then she does something almost unbearably intimate: she reaches under her coat, under the lining over her ribs, and works loose a flat oilcloth packet warm from her body.

"Forty-one frames," she murmurs, pressing it into your hand below the table. "It is the only thing I have ever made that the world should not have. Lose it and a great many people sleep worse. Lose me and only I will mind." A ghost of a smile. "Now you carry both. Heavy, yes? Good. Carry it like it is heavy."

The real microfilm is yours. She rises, buttoning her coat, and slips her cold hand into the crook of your arm as if you've done this a hundred times.

It is twenty past nine.

**Choices:**
- Take her out into the rain toward the station and whatever the night holds.  ->  node_crossroads  [You hold the real microfilm; Dragomir is with you. Trust seals (+1). Five minutes.]

### node_crossroads - The Fork in the Rain
*loc: Naschmarkt crossroads | time: 21:35 | type: scene*

Outside Sperl the rain has thinned to a cold mist that beads on every lamp. Vienna lies open in three directions and the clock is past nine-thirty, the night tilting toward its appointment.

West, the safe way: tram lines running straight to Westbahnhof and the steaming 02:10, the simple completion of a simple thing. North-east, past the river, the Prater â€” the great lit Riesenrad turning slow against the cloud, tall enough to see who's behind you. And down, always down, the black slot of the Danube Canal, where Lindqvist said there was nothing for you, where at half past eleven a man will stand at the third bollard whether you come or not.

If Dragomir is on your arm you can feel her deciding, too, whether to trust where you lead.

**Choices:**
- Go straight to Westbahnhof. Don't tempt the night. Just make the train.  ->  node_westbahnhof  [The cautious road west (+25 minutes to the platform).]
- Ride the Riesenrad first. From the top you'll see if Volkov's men are on you.  ->  node_riesenrad  [A detour to the Prater (+20 minutes) for a view you can get nowhere else.]
- Go down to the canal. Be there before half eleven and see the handoff yourself.  ->  node_canal_approach  [Down toward the black water (+20 minutes), against Lindqvist's order.]

### node_riesenrad - The Wheel Against the Cloud
*loc: The Riesenrad | time: 21:55 | type: discovery*

The Prater is nearly empty, the fairground reduced to a few buzzing bulbs and the great iron wheel grinding its slow circle. A bored attendant takes your coins without looking and the gondola lifts you up out of the world.

From the top, Vienna is a wet circuit board of light. And there â€” your breath stops â€” down by the gates you came through, two men stand under an umbrella that no one in a downpour holds so still. A third sits in a parked Mercedes with its lights off, engine breathing white. They are not watching the wheel. They are watching the line of the canal, and waiting, and one of them is the unmistakable square shape of a man your briefing photo named Anatoly Volkov.

They already know about the canal. They knew before you did. Which means Dragomir was blown long before tonight â€” and someone on your own side let her run anyway.

**Choices:**
- Come down quietly and head for the canal to see the handoff for yourself.  ->  node_canal_approach  [You learn Dragomir was blown and Volkov's net is set. Down to the water (+20 min).]
- Use what you saw. Go meet Volkov in the underpass and hear his version.  ->  node_volkov  *(if Only once you know Dragomir was blown.)*  [You learn the net is set; you seek the man who set it (+1 suspicion). To the underpass (+20 min).]
- Don't risk it. Take Dragomir straight to the train while you still can.  ->  node_westbahnhof  [You bolt for the platform with what you know (+30 min from the Prater).]

### node_canal_approach - Below the Street
*loc: The Danubekanal Embankment | time: 23:18 | type: scene*

Stone steps take you down out of the city and into a colder, older Vienna. The embankment is a concrete ribbon under a single sodium lamp; the canal slides past black and oily, carrying the lights of the bridges in long broken smears. Footsteps echo wrong down here, doubling, so you can never be sure how many feet are really walking.

A man in a long coat stands at the third bollard, motionless, collar up. He has the stillness of someone who has waited at many bollards. On the concrete near his feet, chalk marks â€” arrows, a date, a little box ticked and unticked â€” a private language.

Your watch reads 23:18. If you wait in the shadow of the stairs, the half-hour will come and the appointment will keep itself in front of you. If Dragomir is with you, her hand has gone rigid on your arm.

**Choices:**
- Wait in the dark for 23:30 and watch who the man hands the canister to.  ->  node_handoff_witnessed  *(if Best if you arrive before the half-hour.)*  [You hold still until the scheduled handoff fires at 23:30.]
- You're too late and the bollard is bare â€” go read the chalk and the cap yourself.  ->  node_canal_drop  *(if Only if you arrive after the handoff (after 23:30).)*  [The man is gone; only the leftover clue remains.]
- Don't risk being seen. Pull back and run Dragomir to the train instead.  ->  node_westbahnhof  [You leave the appointment to itself and break for Westbahnhof (+30 min).]

### node_handoff_witnessed - 23:30 â€” The Receiver
*loc: The Danubekanal Embankment | time: 23:30 | type: event*

The half-hour arrives the way bad news arrives, on time. A second figure detaches from the dark under the far bridge and walks the embankment with an unhurried, professional gait. The man at the bollard lifts the loose iron cap, draws out a small steel canister, and holds it out.

You expect a Russian. You expect Volkov's square shoulders.

It is neither. The receiver steps into the lamplight to take the film, and you know the face â€” you saw it this evening, in the safehouse stairwell, carrying a message up to Lindqvist. It is Lindqvist's own runner. The film is not going to the enemy. It is going home, around you, around Dragomir, the woman erased from her own defection so the prize can travel light.

The canister changes hands. The runner pockets it and walks. The night has just shown you its true shape, and it is not the shape you were told.

**Choices:**
- Go and find Volkov. If your own side is doubling you, hear what the other offers.  ->  node_volkov  [You witnessed the doubling. Suspicion hardens (+2). To the underpass (+20 min).]
- Say nothing to anyone. Take Dragomir and the truth to the train.  ->  node_westbahnhof  [You witnessed the doubling and run for the platform (+30 min).]

### node_canal_drop - The Third Bollard, Reading the Chalk
*loc: The Third Bollard | time: 23:40 | type: discovery*

You come too late. The embankment is empty, the sodium lamp buzzing over nothing, and where the man stood there's only the iron bollard with its loose cap canted open like a mouth.

You tilt the cap. Inside, the cavity is dry and bare except for a faint oily ring where a canister sat for weeks â€” and the warm-metal smell of something only just taken. The film is gone, lifted minutes ago.

The chalk tells the rest. An arrow pointing back toward the city, not toward the river and the Soviet side. A small initialled mark â€” not Cyrillic, a plain Latin set of initials you saw stamped on the transit chit in your own satchel. Whoever took the film works for the people who sent you. The drop was never a defector's escape. It was your own service collecting its prize and leaving the woman behind as cover.

**Choices:**
- Take this to Volkov. If your side did this, the other side will pay to know you know.  ->  node_volkov  [You reconstruct who took the film (a beat late). Suspicion climbs (+2). To the underpass (+20 min).]
- Pocket the chalk truth and run Dragomir to the train before the net closes.  ->  node_westbahnhof  [You carry the reconstructed truth to the platform (+30 min).]

### node_volkov - The Aspern Bridge Underpass
*loc: The Aspern Bridge Underpass | time: 00:20 | type: conversation*

Volkov is exactly where a man like Volkov would be: leaning in the dripping dark of the underpass, headlights sweeping the curved concrete above him like searchlights that keep missing. He is heavy, calm, amused, a cigarette cupped against the damp.

"The honest boy," he says, as if you'd been introduced. "I have watched you all night carry a satchel and a conscience, which is one item too many for this work." Smoke leaks from his smile. "You begin to understand. The woman was sold by her own people for the thing sewn in her coat. They will take the film at the water and let her walk into my arms at the station, and call it a fair night's trade. Unless."

He lets unless hang there, glistening.

"Unless a courier with a conscience does something his masters never planned. I can put you both on a different train, under a different flag. She lives. You burn. Or you go to your platform and play out the hand they dealt you. Choose with whatever you have left."

It is past midnight. The clock is running hard now.

**Choices:**
- "Then tell me how she was blown â€” and don't lie, I already half know."  ->  node_volkov  *(if Only if you already know Dragomir was blown â€” and only askable once.)*  [He respects that you came armed with the truth (+1 suspicion locked in). Ten minutes.]
- Take his deal. Walk Irina out under Soviet protection and burn your own service.  ->  node_ending_double  *(if Only if you witnessed the handoff, know she was blown, distrust Lindqvist, and Volkov trusts you (suspicion 3+).)*  [You cross the line. Ten minutes, then a different train.]
- Refuse him. Take Dragomir and run for your own train while there's still time.  ->  node_westbahnhof  [You walk out on the offer. To Westbahnhof (+25 min).]

### node_westbahnhof - Westbahnhof, Platform 3
*loc: Westbahnhof, Platform 3 | time: 01:40 | type: transition*

The great iron-and-glass hall swallows you, all echo and cold draughts and the clatter of the departures board shedding its letters. Down the length of Platform 3 the 02:10 to Salzburg stands steaming, doors open, a conductor pacing the wet concrete and checking a watch he doesn't own.

This is the clock made into iron and steam. Whatever you decided in the rain back there, whoever is on your arm, whatever rides in your coat â€” it all arrives here, at the edge of the platform, where the night finally adds up.

You check your own watch and feel the whole evening narrow to a single number.

**Choices:**
- Board the 02:10 and let the night resolve.  ->  node_ending_missed  *(if If you arrive after 02:10 â€” the train is already gone.)*  [Too late. The platform is empty.]
- Step aboard with Irina and the real film in your coat.  ->  node_ending_clean  *(if If you're in time, she trusts you, she's with you, and you carry the real microfilm.)*  [The clean extraction â€” everything earned.]
- Board alone, decoy in your fist, and let the defection collapse behind you.  ->  node_ending_burned  *(if If she never trusted you enough and Volkov's net has closed (suspicion 4+).)*  [The failure that still resolves â€” you make the train, the prize does not.]
- Board the 02:10 with whatever you've got and ride it out.  ->  node_ending_clean  *(if Fallback if you're on time with Irina but the cleaner conditions don't quite hold.)*  [You leave Vienna together, for better or worse.]
- Board the 02:10 alone, the night spent and nothing certain in your hands.  ->  node_ending_burned  *(if Fallback if you reach the platform in time but with no companion.)*  [You ride west alone into the rain.]

### node_ending_clean - The Last Train West [ENDING]
*loc: The 02:10, departing | time: 02:10 | type: ending*

You hand the conductor two tickets that are mostly lies and he stamps them without caring. Irina steps up into the warm yellow carriage and you follow, and the doors fold shut behind you with a sound like a held breath finally let go.

The oilcloth packet sits against your ribs now, forty-one frames the world shouldn't have, riding west under a stranger's name. At 02:10 exactly the platform begins to slide backward â€” the conductor, the wet concrete, the city of trams and smoke and black canal water all loosening their grip at once.

Irina watches Vienna go. "You carried it like it was heavy," she says quietly, and almost smiles. "Most of them never do."

The rain streaks the glass into long silver threads. Somewhere behind you a handler is explaining to London why the prize and the woman both got away clean. Let him explain. You did the simple thing, in the end â€” you walked a frightened person out of the dark â€” and for one green courier on his first solo night, that is the whole of the victory.

The train finds open country and the lights of the suburbs thin to nothing. West. Just west, and the held breath of the dark behind you.

### node_ending_double - The Man Who Knew Too Much [ENDING]
*loc: A slower train, eastbound | time: 02:05 | type: ending*

You take Volkov's hand in the dripping dark, and the world tilts onto a different rail.

There is no 02:10 for you now â€” there is a private compartment on a slower train and a different flag stamped on papers that arrive too smoothly to be anything but long-prepared. Irina sits across from you, pale, alive, watching you with an expression that is not gratitude and not quite contempt: the look of someone who has traded one set of masters for another and knows exactly what it costs.

"You burned them," she says. "Your own people. For me, or for the film, or to be the one who saw the truth â€” I will never be sure which." Volkov, in the corridor, is already on the telephone in soft fast Russian, and you understand that the forty-one frames will be read in Moscow now, not London, and that you are the courier who carried them there.

You are warm. You are alive. You will never go home. Outside, Vienna lets you go without a sound, and the rain on the glass runs the wrong way, east, into the dark you swore you'd never enter.

Some victories you only recognise as defeats much later, on quiet platforms, in cities you can no longer leave.

### node_ending_burned - Smoke on the Embankment [ENDING]
*loc: The 02:10, departing alone | time: 02:10 | type: ending*

You board the 02:10 alone. The doors close, the platform slides away, and the steel canister in your coat is light as a lie â€” because that is what it is. The decoy. Engine schematics, real and worthless, the only thing Irina Dragomir ever trusted you with.

She never handed you the real film. You never gave her reason to. And somewhere back in the wet city, Volkov's net has finished drawing closed around a frightened physicist who ran out of people to believe in. You'll read about it, or you won't; either way it is no longer yours to fix.

The conductor passes, checking his borrowed watch. Salzburg by dawn. A debrief. A quiet conversation about what went wrong, in which no one will quite say it was you.

The rain stops somewhere past the city limits. You watch your own reflection in the black glass â€” a green courier on his first solo night, going home with the wrong canister and the right lesson, learned too late to spend: in this work, trust is the only currency, and you walked into Vienna unable to afford a thing.

The night moved on without you. It always does.

### node_ending_missed - The 02:11 Platform [ENDING]
*loc: Westbahnhof, Platform 3 | time: 02:11 | type: ending*

You come up the platform stairs at a run and stop dead.

The 02:10 is two red lamps shrinking into the rain at the far end of the hall, the steam already thinning where it stood. The conductor is gone. The departures board clatters once and goes still. Platform 3 is a long empty stretch of wet concrete and your own hard breathing.

Whatever you learned tonight â€” about Lindqvist, about the canal, about the woman and the film and who was selling whom â€” you spent too long learning it. The night had a single hard edge, 02:10, and the edge has passed, and edges in this work do not forgive.

If Irina is beside you, she says nothing; she has missed trains before and knows what the silence after means. If you're alone, the silence is only yours. Either way you are still in Vienna, with the rain coming through the great iron roof in slow grey curtains, and six hours that were never quite enough have run all the way out.

Somewhere across the city a telephone is ringing in a safehouse, and no one is going to answer it in time. The 02:11 is just a number. There is no 02:11. There is only the empty platform, and the long cold walk back into a city that knows your face now.

---


