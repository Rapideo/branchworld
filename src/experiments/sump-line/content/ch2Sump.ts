import type { Story } from '../../../engine';

/**
 * The Sump Line — Chapter 2B: "The Flooded Sump Crawl" (`ch2_sump`) — EXPANDED to an evening (~16 beats).
 * A game-ending branch chapter (reached when ch1 set cave_route='sump' / the default). Wet, fast heat-loss,
 * the sealing sump at your back; the way out is a submerged crawl found by dive, but the water level itself
 * is the world-move — when the pulse passes it briefly DROPS, opening a window. Miss it and you are behind
 * the sump.
 *
 * Authored to the Branch-and-Bottleneck method. Spine: the duck pool -> the low duck & deep sump -> the
 * crawl + the dropped-water window (the dive decision) / the gravel chamber (the wait hub) -> the dive
 * (grey/dark) or the wait (behind/wait/dark). Rejoining detours hang off the hubs.
 *
 * Verified mechanics carried from the slice: ev_water_drops (present=window / absent=sealed); the EE-4 dive
 * gate (every dive/back-to-crawl choice gated cave_sump_sealed is_false, so n_dive is unreachable once
 * sealed); the cave_crossed latch (set only on the dive, so the waiting node can't claim the grey crossing
 * ending); air_gulps; ending priorities (dark 2 > behind 1 > grey/wait 0).
 *
 * Calibration (F7): lamp 5/10min — the wet route kills the battery fast, so with ch1's sump route delivering
 * the lamp at ~40, the fast dive survives (grey) while the long wait runs it to zero (dark). Event retimed to
 * 14:50 for the longer approach. end_dark_sump (carried-low lamp) is a CARRY-ONLY standalone orphan (F4).
 */
export const ch2Sump: Story = {
  id: 'ch2_sump',
  title: 'The Flooded Sump Crawl',
  startNodeId: 'n_s_start',
  startTime: '14:30',
  deadline: '15:50', // window 80 == the longest static path (the long wait runs past the lamp's life -> dark)
  startLocation: 'duck_pool',
  variables: [
    { name: 'companion_status', type: 'string', default: 'with_you', purpose: "Rolly's carried state: 'with_you' | 'hurt' | 'lost'. Gates the shelter-together beats." },
    { name: 'cave_dark_out', type: 'boolean', default: false, purpose: 'Latching, paired with lamp at-zero. Required by the dark ending.' },
    { name: 'cave_sump_sealed', type: 'boolean', default: false, purpose: 'Latching: the crossing window is gone (sealed). Required by behind-the-sump; gates the dive choices.' },
    { name: 'cave_crossed', type: 'boolean', default: false, purpose: 'Latching: you pulled through to the far rift. Set only at n_dive; gates the grey ending so the wait node cannot claim it.' },
  ],
  locations: [
    { id: 'duck_pool', name: 'The Duck Pool' },
    { id: 'sump_passage', name: 'The Drowned Passage' },
    { id: 'flooded_crawl', name: 'The Flooded Crawl' },
    { id: 'gravel_chamber', name: 'The Gravel Chamber' },
    { id: 'exit_rift', name: 'The Far Exit Rift' },
  ],
  resources: [
    { id: 'lamp_charge', label: 'Lamp', min: 0, max: 100, start: 60, depletion: { everyMinutes: 10, amount: 5 }, atZero: { ending: 'end_dark_sump', setFlag: 'cave_dark_out' } }, // 5/10: the wet kills the battery fast; container rebases start
    { id: 'body_heat', label: 'Warmth', min: 0, max: 100, start: 100, depletion: { everyMinutes: 15, amount: 5 } },
    { id: 'air_gulps', label: 'Air', min: 0, max: 3, start: 3 },
  ],
  events: [
    {
      id: 'ev_water_drops',
      title: 'The Water Drops',
      trigger: [{ field: 'time', op: 'time_after', value: '14:48' }, { field: 'cave_sump_sealed', op: 'is_false' }], // after the drowned passage (14:45) but at/before the crawl (14:55), so going-to-the-crawl witnesses the window; AND only if not already sealed coming in from ch1 (else the "window opens" prose plays for a dive that's gated off — H7)
      eventLocation: 'flooded_crawl',
      ifPresentNode: 'n_drop_present',
      ifAbsentEffects: [
        { field: 'cave_sump_sealed', op: 'set', value: 'true' },
        { field: 'clues', op: 'add_clue', value: 'clue_missed_window' },
      ],
      recoveryNodeId: 'n_gravel_hub',
    },
  ],
  nodes: [
    // ===== ACT 1 — INTO THE WATER =====
    {
      id: 'n_s_start',
      title: 'The Duck Pool',
      type: 'scene',
      location: 'duck_pool',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'duck_pool' }],
      body:
        'Down below the choke the world is water to your chest and the cold is a thing with hands.\n\n' +
        'You are in the duck pool, black water moving slow against you, the sealing sump somewhere at your back and the only way on a drowned one. Your lamp lays its disc on the surface and the surface will not hold it still — light shivers and breaks and shivers, and below the broken light there is nothing but more black water and the grit it carries.\n\n' +
        'It is {{time}}. Down here that is only a feeling — the afternoon going somewhere up above, on the hill, where there is sky. The wet pulls the warmth out of you far faster than the dry ever could; you can already feel the shiver starting low in your back, the kind you cannot decide to stop. Each breath you take is a thing you are spending.\n\n' +
        'The far exit is through the water, found by dive, when and if the flood lets you. You can push on toward the crawl and be at the airspace if the water drops, or climb out into the gravel chamber first and try to get some air and sense back into yourself.',
      choices: [
        { id: 'c_to_crawl', label: 'Push on toward the flooded crawl.', destination: 'n_low_duck', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_to_gravel', label: 'Climb out into the gravel chamber first.', destination: 'n_gravel_hub', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_ss_steady', label: 'Stand still a moment and steady your breathing.', destination: 'n_ss_steady', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_ss_steady',
      title: 'Steadying',
      type: 'scene',
      location: 'duck_pool',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'duck_pool' }],
      body:
        'You stand in the black water and make yourself breathe slow — in for four, hold, out for four — the drill you teach the nervous ones, working it now on yourself.\n\n' +
        'Panic uses air, and air is the thing you have least of down here; panic also makes you stupid, and stupid drowns. So you stand and breathe and let the cold water move against you and feel the fear go from a white roar to a low steady tone you can carry. It does not go away. It is not supposed to go away. It is supposed to get small enough to fit in a pocket while you do the next necessary thing. You find that pocket, and you put it there, and you are ready, as ready as the cave is going to let you be.',
      choices: [
        { id: 'c_steady_on', label: 'On into the water.', destination: 'n_s_start', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_low_duck',
      title: 'The Low Duck',
      type: 'scene',
      location: 'sump_passage',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'sump_passage' }],
      body:
        'The way to the crawl goes under a low duck — a place where the roof dips to within a hand’s breadth of the water and you must tip your head back and drink the air off the ceiling to get through.\n\n' +
        'You have done a hundred of these and you have never once liked them. You wedge your nose and mouth into the thin wet gap at the top, the cold rock against your forehead, the water at your lips, and you shuffle forward by feel with your eyes shut against the grit, breathing the inch of foul air the cave grants you, every cell of you wanting to be anywhere that is not here. And then the roof lifts a little, and you can stand, and you are through, in the drowned passage that leads to the crawl.',
      choices: [
        { id: 'c_duck_on', label: 'On through the drowned passage.', destination: 'n_sump_deep', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
        { id: 'c_ss_rolly', label: 'Make sure Rolly gets the duck.', destination: 'n_ss_rolly', conditions: [{ field: 'companion_status', op: 'equals', value: 'with_you' }], effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_ss_rolly',
      title: 'Rolly Through the Duck',
      type: 'conversation',
      location: 'sump_passage',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'sump_passage' }],
      body:
        'You wait at the lip of the duck and talk Rolly through it, because a duck is bad enough on two good legs and worse on one and worst of all when you are already cold to the core and frightened.\n\n' +
        '"Head back, mouth up, eyes shut, breathe slow. I’ve got your harness. I’m not letting go." Rolly nods, white-faced, and goes under into the gap, and for three long seconds there is nothing but bubbles and the pull of the harness in your fist, and then Rolly’s head breaks up beside you, gasping, swearing, alive. "Hate those," Rolly says. "Hate those so much." "I know," you say. "Me too. Come on."',
      choices: [
        { id: 'c_rolly_on', label: 'On through the passage together.', destination: 'n_low_duck', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_sump_deep',
      title: 'The Drowned Passage',
      type: 'scene',
      location: 'sump_passage',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'sump_passage' }],
      body:
        'The drowned passage runs deep and slow toward the crawl, the water at your chest, the cold gone all the way into the middle of you now so that the shiver comes in long racking waves you cannot stop.\n\n' +
        'Your light shows you less and less. The wet has got into the battery housing, or the cold has, or it is simply the slow tiredness of a thing that has burned all afternoon — whatever the cause, the disc on the water is dimmer with every wade, the dark closing its hand a finger at a time. You keep your eyes on the small failing light and your feet on the unseen floor and you go on, because the only thing worse than going on is stopping, here, in this.',
      choices: [
        { id: 'c_deep_on', label: 'Wade on to the flooded crawl.', destination: 'n_crawl', effects: [{ field: 'time', op: 'add_minutes', value: '10' }, { field: 'air_gulps', op: 'decrement', value: '1' }] },
      ],
    },
    // ===== ACT 2 — THE CRAWL & THE WINDOW =====
    {
      id: 'n_crawl',
      title: 'The Flooded Crawl',
      type: 'event',
      location: 'flooded_crawl',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'flooded_crawl' }],
      body:
        'The flooded crawl is a drowned slot under the seal, a thread of foul airspace at its roof where the water has not quite reached the rock. You wedge in cheek to the cold ceiling and breathe the little air the cave allows you and taste grit and iron and cold.\n\n' +
        'The way through is a dive — down, along, up into whatever is on the far side — and you cannot make it while the water is this high. You can wait here at the airspace for the flood to drop and give you the gap, or, if you have the breath and the nerve for it, go now into the black and find the far side by feel.',
      choices: [
        { id: 'c_crawl_dive', label: 'Dive the crawl now, into the black.', destination: 'n_dive_attempt', conditions: [{ field: 'cave_sump_sealed', op: 'is_false' }, { field: 'air_gulps', op: 'gte', value: '1' }], effects: [{ field: 'time', op: 'add_minutes', value: '10' }, { field: 'air_gulps', op: 'decrement', value: '1' }] },
        { id: 'c_wait', label: 'Wait at the airspace for the water to drop.', destination: 'n_gravel_hub', effects: [{ field: 'time', op: 'add_minutes', value: '15' }] },
        { id: 'c_ss_airspace', label: 'Press to the airspace and breathe a moment.', destination: 'n_ss_airspace', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_ss_airspace',
      title: 'At the Airspace',
      type: 'scene',
      location: 'flooded_crawl',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'flooded_crawl' }],
      body:
        'You press your face up into the thread of air at the roof of the crawl and take what the cave gives you, an inch of it, stale and cold and tasting of stone, and for a moment that inch of air is the whole of the world and it is enough.\n\n' +
        'This is the bargain of the wet caves, the thing the dry-land people never understand: how little you need, in the end, and how completely. Air. The next breath. The one after. You lie cheek to the rock and breathe and listen to the water working in the dark all around you, and you wait to see what the flood is going to decide, because down here the flood decides and you abide.',
      choices: [
        { id: 'c_airspace_on', label: 'Back to the crawl and the choice.', destination: 'n_crawl', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_drop_present',
      title: 'The Water Drops',
      type: 'event',
      location: 'flooded_crawl',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'flooded_crawl' }],
      body:
        'You are wedged at the airspace in the flooded crawl, cheek to the cold roof, breathing the thread of foul air the cave allows you, when the water lets go.\n\n' +
        'The roar that has been pressing at your ears recedes. The pulse has passed somewhere up the system, and here, now, the level drops — you feel it before you see it, the water sliding down off your chin, off your chest, the airspace at the roof yawning suddenly wide. Where there was a finger’s breadth of breath there is a hand’s, two hands’, a black gap you could pull yourself through.\n\n' +
        'A window. The mountain has opened a window — not for you, it opened because the water that propped it shut has gone elsewhere — but it has opened, and it will not stay open. The flood is not done. It will come back up and take the gap with it. There is the gap, and the breath in your chest, and the few minutes the cave is lending you. Go now, or the window closes and you are behind the sump.',
      choices: [
        { id: 'c_drop_dive', label: 'Dive the open window — go now.', destination: 'n_dive_attempt', conditions: [{ field: 'cave_sump_sealed', op: 'is_false' }], effects: [{ field: 'time', op: 'add_minutes', value: '10' }, { field: 'air_gulps', op: 'decrement', value: '1' }] },
        { id: 'c_drop_back', label: 'Lose your nerve — pull back to the gravel chamber.', destination: 'n_gravel_hub', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
      ],
    },
    // ===== ACT 3 — THE GRAVEL CHAMBER (the wait hub) =====
    {
      id: 'n_gravel_hub',
      title: 'The Gravel Chamber',
      type: 'transition',
      location: 'gravel_chamber',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'gravel_chamber' }],
      body:
        'The gravel chamber is a bank of wet shingle above the flood, a pocket of close stale air the cave has left you. It is out of the worst of the water, and that is all that can be said for it. The cold is deep in your joints; the shiver will not stop; your hands have gone clumsy and slow.\n\n' +
        'Your lamp gives its small dim disc, the dark sitting patient just past the gravel. Below you the flooded crawl waits, and the seal, and the far rift somewhere beyond the water. There is a hard way through and a waiting way, and the difference between them is breath and nerve and whether the flood gives you the gap.',
      choices: [
        { id: 'c_g_with', label: 'Wedge in with Rolly out of the water.', destination: 'n_set_together_s', conditions: [{ field: 'companion_status', op: 'equals', value: 'with_you' }], effects: [{ field: 'time', op: 'add_minutes', value: '15' }] },
        { id: 'c_g_try', label: 'Go back down and try the crawl.', destination: 'n_crawl', conditions: [{ field: 'cave_sump_sealed', op: 'is_false' }, { field: 'air_gulps', op: 'gte', value: '1' }], effects: [{ field: 'location', op: 'change_location', value: 'flooded_crawl' }, { field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_g_wait', label: 'Hunker down and wait it out.', destination: 'n_resolve_s', effects: [{ field: 'time', op: 'add_minutes', value: '25' }] },
        { id: 'c_ss_look', label: 'Read the water and the seal a moment longer.', destination: 'n_ss_look', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_ss_look',
      title: 'Reading the Water',
      type: 'discovery',
      location: 'gravel_chamber',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'gravel_chamber' }],
      body:
        'You crouch at the edge of the gravel and watch the black water working at the lip of the crawl, trying to read it the way you read the streamway, trying to know.\n\n' +
        'But the water down here does not tell you the way the streamway told you. It rises and it falls on the mountain’s own slow clockwork, answerable to rain that fell on the tops days ago and is only now arriving, and there is no honest way to know from here whether the next pulse will drop the level and open the gap or climb it and shut the seal for good. You can guess. Guessing, here, is the whole game. You watch the water a while longer, learning nothing certain, and turn back to the chamber and the choice that learning nothing certain leaves you.',
      choices: [
        { id: 'c_look_on', label: 'Back to the chamber.', destination: 'n_gravel_hub', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_set_together_s',
      title: 'Two in the Air Bell',
      type: 'scene',
      location: 'gravel_chamber',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'gravel_chamber' }],
      body:
        'You wedge in beside Rolly on the gravel, shoulder to shoulder, sharing what warmth two cold bodies can make in a pocket of dead air. The splint has held. The ankle is a problem for later, if there is a later.\n\n' +
        'Neither of you says much. There is not much to say that the cold has not already said. "Remember France," Rolly says, after a while, teeth going. "We waited that one out." You remember France. You remember it was a near thing, and that you have both been quietly afraid of water ever since, and that you came back underground anyway, because this is who you are. "We did," you say. "We’ll wait this one too." You share the air and the waiting and the small tired light, and somewhere past the gravel the water decides what it is going to do with the two of you.',
      choices: [
        { id: 'c_t_crawl', label: 'Make for the crawl together while there’s a chance.', destination: 'n_crawl', conditions: [{ field: 'cave_sump_sealed', op: 'is_false' }, { field: 'air_gulps', op: 'gte', value: '1' }], effects: [{ field: 'location', op: 'change_location', value: 'flooded_crawl' }, { field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_t_wait', label: 'Wait for rescue together.', destination: 'n_resolve_s', effects: [{ field: 'time', op: 'add_minutes', value: '25' }] },
        { id: 'c_ss_rolly2', label: 'Keep Rolly talking against the cold.', destination: 'n_ss_rolly2', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_ss_rolly2',
      title: 'Keeping Talking',
      type: 'conversation',
      location: 'gravel_chamber',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'gravel_chamber' }],
      body:
        'You keep Rolly talking, because talking is warmth and silence is the cold winning, and because the slow grey slide of a too-cold mind toward not-caring is the thing that kills people who could have been saved.\n\n' +
        'So you talk nonsense — the old club gossip, the bet on the survey, the pint that is owed, the next trip you are absolutely not going to plan and absolutely will — and Rolly talks it back, slower than usual, the words coming a half-beat late, and you watch for the moment the words stop coming and you do not let it arrive. "Stay with me," you say, when the pauses get too long. "Oi. Stay with me." "’M here," Rolly says. "Still here. Buying you that pint." Still here. You hold onto that, and you keep talking.',
      choices: [
        { id: 'c_rolly2_on', label: 'Back to the waiting and the choice.', destination: 'n_set_together_s', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    // ===== ACT 4 — THE DIVE / THE WAIT =====
    {
      id: 'n_dive_attempt',
      title: 'Into the Drowned Crawl',
      type: 'scene',
      location: 'flooded_crawl',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'flooded_crawl' }],
      body:
        'You take the breath — the big one, the one you have been saving all afternoon without knowing it — and you go down into the black water and into the drowned crawl.\n\n' +
        'There is no light now; the water takes it; there is only feel, the cold rock under your hands and the pull of your own body through a space barely bigger than your body, and the burn beginning in your chest that is the clock you are diving against. You do not think about the far side. You do not think about whether there is a far side. You think about the next handhold, and the next, and the slow controlled spending of the air in your chest, the way the wet-cave people learn to or do not come back.',
      choices: [
        { id: 'c_dive_on', label: 'Pull on through the black water.', destination: 'n_far_airspace', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_far_airspace',
      title: 'A Breath in the Dark',
      type: 'scene',
      location: 'flooded_crawl',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'flooded_crawl' }],
      body:
        'Halfway through, where you did not know to hope for it, the roof lifts a hand’s breadth and there is air — a black pocket of it trapped against the rock, foul and thin and the sweetest thing you have ever breathed.\n\n' +
        'You get your face into it and take three fast shallow breaths, all the pocket holds, your heart slamming, the dark absolute, no way to know how far you have come or how far is left, only that there is more crawl ahead and this much air to spend on it. You hold the last breath. You let go of the air pocket. You go back down into the black, into the last of the drowned crawl, toward the far side that you are choosing, now, to believe is there.',
      choices: [
        { id: 'c_far_on', label: 'The last of the crawl — pull for the far side.', destination: 'n_dive', effects: [{ field: 'time', op: 'add_minutes', value: '5' }, { field: 'air_gulps', op: 'decrement', value: '1' }] },
      ],
    },
    {
      id: 'n_dive',
      title: 'Through the Seal',
      type: 'transition',
      location: 'exit_rift',
      resolvesEnding: true,
      entryEffects: [
        { field: 'location', op: 'change_location', value: 'exit_rift' },
        { field: 'cave_crossed', op: 'set', value: 'true' },
      ],
      body:
        'The last of the crawl, hand over blind hand on rock you cannot see, lungs burning down to nothing — and then either the rock above your fingers is gone and your face breaks a surface, or it does not, and the dark has the last word.',
      choices: [],
    },
    {
      id: 'n_resolve_s',
      title: 'The Long Cold Wait',
      type: 'transition',
      location: 'gravel_chamber',
      resolvesEnding: true,
      entryEffects: [{ field: 'location', op: 'change_location', value: 'gravel_chamber' }],
      body:
        'In the end there is nothing to do but stop trying to make the crossing happen, and wedge into the gravel, and wait, and let the cold and the dark and the mountain’s slow clock do what they are going to do.',
      choices: [],
    },
  ],
  endings: [
    {
      id: 'end_dark_sump',
      name: 'The Cave Keeps You',
      summary: 'The lamp died in the water; the dark, which was always going to win, has you under the rock.',
      priority: 2,
      conditions: [{ field: 'cave_dark_out', op: 'is_true' }],
      body:
        'The lamp gives out down in the wet dark, and there is no rallying it this time.\n\n' +
        'It dims to a coal, to a thread, to a memory of light shivering on black water, and then it is gone, and the dark that was always at the edge of it is simply everywhere, total, with no rim to it at all. You are in the water, or beside it, with the cold all the way into the bone and your hands too stupid now to be sure which.\n\n' +
        'The cave does not change. The water moves the way water moves, the rock holds the way rock holds, none of it about you. The dark was always going to win this race; the battery only borrowed the afternoon from it, and now the loan is called, down here where the afternoon never reached.\n\n' +
        'You hold the cold rock and listen to your own breath and the slow drip and lap of water that will not tell you anything. Somewhere far above is the {{time}} sky and the hill and the ordinary day you came down out of. The cave is in no hurry. It has held this dark since before there were eyes to be lost in it, and it has you now, and all the time there is.',
    },
    {
      id: 'end_behind_sump',
      name: 'Behind the Sump',
      summary: 'The window came and went without you; the water rose and the seal shut, and you are on the wrong side of it.',
      priority: 1,
      conditions: [{ field: 'cave_sump_sealed', op: 'is_true' }],
      body:
        'The water never gives you the gap, and in the end it stops pretending it might.\n\n' +
        'The seal is shut. The crawl is full, roof to floor, the airspace you needed gone under risen water that came back up the way it always comes back up, on its own indifferent clock. The easy way out — the dropped-water window, the dive through to the far rift — closed somewhere back there, and you are on this side of it, in the gravel and the dark, with the sump between you and the rest of the cave.\n\n' +
        'You are behind the sump. The phrase has a sound to it you have heard in the club hut, on winter nights, in other people’s stories, and you never thought to be inside one. There is air here, for now, a pocket of it in the gravel chamber. There is a little light left. There is the cold, which has all of you it wants and is still taking more.\n\n' +
        'If there is anyone beside you in the dark, you share the air and the waiting. If there is not, the waiting is only yours. You knock on the rock — bang, bang, bang, a pause — the slow signal, up through a mountain that carries the sound and does not answer, because rock does not answer. Somewhere a call-out will start. The water sealed on its own schedule and offers no opinion on whether it will start in time.',
    },
    {
      id: 'end_grey_sump',
      name: 'A Grey Way Out',
      summary: 'You pull through the dropped-water window into the far rift and climb out — cold, shaking, alive.',
      priority: 0,
      conditions: [
        { field: 'cave_crossed', op: 'is_true' },
        { field: 'cave_dark_out', op: 'is_false' },
      ],
      body:
        'The rock above your fingers is gone and your face breaks a surface and you are gulping foul wet air in a slot of rising stone on the far side of the seal.\n\n' +
        'You made it through. The window held the few seconds you needed and you spent them right. Beyond the crawl the far rift climbs, wet and cold but going up, going out, the water finally at your back instead of over your head.\n\n' +
        'You climb the rift on hands that have stopped properly working, and somewhere up it there is grey — the thin worn grey of a wet afternoon — and then there is rain on your face and the enormous ordinary sky, and you haul yourself out of the black slot in the hillside and lie in the heather and shake, and the shaking is the warmest thing you have felt in hours.\n\n' +
        'If there is anyone beside you, you got them out too, and you do not yet have the breath to say what that is worth. If there is not, you lie alone in the rain and are out, and the cave behind you neither mourns nor celebrates; it sealed and dropped and rose on its own clock, and let you through a gap it never opened for your sake. You are cold and shaking and out, and out is the whole of it, and it is enough.',
    },
    {
      id: 'end_long_cold_wait',
      name: 'The Long Cold Wait',
      summary: 'The water does not drop in time; you wedge in the gravel, knock on the rock, and wait for a rescue that may or may not come.',
      priority: 0,
      isDefault: true,
      conditions: [],
      body:
        'The water does not drop in time, and in the end there is nothing to do but wait.\n\n' +
        'You are wedged in the gravel air bell above the flood, the pocket of close stale air the cave has left you, and you have stopped trying to make the crossing happen. The cold is all the way into you now, the deep shiver that comes in waves and then comes constant, your hands too stupid to do much but knock on the rock — bang, bang, bang, a pause, bang — the slow signal you were taught, sent up through the mountain to anyone who might be listening.\n\n' +
        'The lamp still gives its small disc, dimmer than it was, the dark sitting patient just past the gravel. You turn it down to save what’s left. No sense burning light you’ll want later, if there is a later.\n\n' +
        'If there is anyone beside you in the dark, you share the warmth and the waiting and the knocking. If there is not, the knocking is only yours. Either way the rock takes the sound and does not answer, because rock does not answer; it only carries.\n\n' +
        'It is {{time}}, or near it; down here the afternoon is a thing happening to other people, up in the light. Somewhere a club will notice you overdue. Somewhere a phone will ring. The call-out may come in time and may not, and the cave, which rose and sealed and dropped on its own indifferent clock, offers no opinion on the matter. You breathe. You knock. You wait in the cold for a rescue that may or may not come.',
    },
  ],
};
