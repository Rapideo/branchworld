import type { Story } from '../../../engine';

/**
 * The Sump Line — Chapter 1: "The Pulse" (`ch1_descent`) — EXPANDED to an "evening of reading."
 *
 * Design model (Matthew's, locked): a light open world bounded by a clock.
 *  - A SPINE of big decisions the player is always routinely led to and must answer:
 *      (1) how you handle Rolly when the pulse hits  ->  (2) which way out you commit to.
 *  - LOTS of optional, TIME-COSTED detours hung off the hubs. Most MERGE FORWARD into the next spine beat
 *    (a flavoured route through); a few LOOP BACK to their hub for the "poke around and come back" feel.
 *    Either way every thread rejoins the spine — no true dead ends (the engine forbids no-exit nodes).
 *  - TIME is the only true constraint: detours cost minutes, and the flood / dying lamp / cold / the
 *    15:00 sump-seal are the teeth that make spending time actually cost something.
 *  - Re-joining == hub-funnelling == this 26-beat chapter stays EXHAUSTIVELY walker-verifiable.
 *
 * OUTPUTS ARE UNCHANGED from the slice version (cave_route, companion_status, the latching booleans, the
 * carried meters) so ch2_high / ch2_sump and the Game wiring stay frozen. Only ch1 grew.
 *
 * Recalibration (F7): the chapter is much longer now, so lamp depletion is gentled to 5 / 20 min and the
 * window opened to 13:00->16:30; the sump seals at 15:00 (dawdle past it and the low road closes). ch2
 * rates are left as-is — the carried-lamp math still lands (efficient play survives into ch2; long/explored
 * play arrives low and dies in the dark there).
 */
export const ch1Descent: Story = {
  id: 'ch1_descent',
  title: 'The Pulse',
  startNodeId: 'n_entrance',
  startTime: '13:00',
  deadline: '15:30', // window 150 == the longest static (no-revisit) path; loop-back wandering can run past it -> clock bites to the sump default
  startLocation: 'entrance_series',
  variables: [
    { name: 'cave_route', type: 'string', default: 'sump', purpose: "The chapter-fork: 'high' or 'sump' (default). The Game transitions on it." },
    { name: 'companion_status', type: 'string', default: 'hurt', purpose: "Rolly: 'hurt' | 'with_you' | 'lost'. Carries across chapters; gates content and endings." },
    { name: 'cave_someone_lost', type: 'boolean', default: false, purpose: 'Latching: the companion is stranded/lost. Loss endings require it.' },
    { name: 'cave_all_together', type: 'boolean', default: false, purpose: 'Latching: kept Rolly with you to safety. The clean ending requires it.' },
    { name: 'cave_dark_out', type: 'boolean', default: false, purpose: 'Latching, paired with lamp at-zero. Dark endings require it.' },
    { name: 'cave_hypothermic', type: 'boolean', default: false, purpose: 'Latching, paired with body_heat at-zero.' },
    { name: 'cave_sump_sealed', type: 'boolean', default: false, purpose: 'Latching: the low sump duck has sealed (witnessed, heard, or timed out). The sealed-in path requires it.' },
  ],
  locations: [
    { id: 'entrance_series', name: 'The Entrance Series' },
    { id: 'pitch_head', name: 'Head of the Pitch' },
    { id: 'pitch_bottom', name: 'Foot of the Pitch' },
    { id: 'streamway', name: 'The Streamway' },
    { id: 'oxbow_side', name: 'The Old Oxbow' },
    { id: 'streamway_deep', name: 'The Deep Streamway' },
    { id: 'choke', name: 'The Boulder Choke' },
    { id: 'sump_pool', name: 'The Sump Pool' },
    { id: 'choke_ledge', name: 'The Dry Ledge' },
  ],
  resources: [
    { id: 'lamp_charge', label: 'Lamp', min: 0, max: 100, start: 60, depletion: { everyMinutes: 20, amount: 5 }, atZero: { setFlag: 'cave_dark_out' } },
    { id: 'body_heat', label: 'Warmth', min: 0, max: 100, start: 100, depletion: { everyMinutes: 30, amount: 5 }, atZero: { setFlag: 'cave_hypothermic' } },
    { id: 'flood_water', label: 'Water', min: 0, max: 3, start: 0 },
  ],
  events: [
    {
      id: 'ev_sump_seal',
      title: 'The Sump Seals',
      trigger: [{ field: 'time', op: 'time_after', value: '15:00' }],
      eventLocation: 'sump_pool',
      ifPresentNode: 'n_seal_present',
      ifAbsentEffects: [
        { field: 'cave_sump_sealed', op: 'set', value: 'true' },
        { field: 'clues', op: 'add_clue', value: 'clue_sump_sealed' },
      ],
      recoveryNodeId: 'n_choke',
    },
  ],
  nodes: [
    // ===== ACT 1 — THE DESCENT =====
    {
      id: 'n_entrance',
      title: 'The Entrance Series',
      type: 'scene',
      location: 'entrance_series',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'entrance_series' }],
      body:
        'The hill takes you in through a slot in the limestone no wider than your shoulders, and the day goes out behind you a foot at a time.\n\n' +
        'First the colour goes — the green of the fell, the grey of the sky — and then the warmth, and then, as the crawl turns and drops, the last grudging grey of daylight, until there is only the small hard disc of your lamp on wet rock and the dark folded close behind it. It is {{time}} on the surface. Down here it is no time at all; the cave has never had a clock but the one you brought, ticking down in the battery on your helmet.\n\n' +
        'Rolly is ahead of you in the crawl, voice bouncing flat off the close rock. "Smell that? Streamway’s up. Been raining on the tops all week." A pause, a grunt as a tackle-bag snags and frees. "Be loud down there today." There is nothing in the voice but cheer. You have both done this a hundred times.\n\n' +
        'The crawl opens out ahead into the head of the first pitch, where the rope you rigged on the way in runs black over the lip into the dark. The cold air comes up the shaft to meet you, carrying the sound of moving water from a long way down.',
      choices: [
        { id: 'c_gear_in', label: 'Press on to the head of the pitch.', destination: 'n_pitch_head', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_threshold', label: 'Stop a moment at the edge of the dark.', destination: 'n_threshold', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_threshold',
      title: 'The Edge of the Dark',
      type: 'scene',
      location: 'entrance_series',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'entrance_series' }],
      body:
        'You let Rolly’s light go on ahead and you stop, just for a breath, where the last of the grey still reaches.\n\n' +
        'People ask why, and you have never had a good answer for them. It is not the thrill; the thrill wore off years ago. It is something closer to the opposite — the way the cave does not care, the way it has been here doing exactly this, dripping and sealing and flooding and drying, for longer than there have been people to be frightened of it. There is a peace in being that small. Up in the light everything is about you. Down here nothing is.\n\n' +
        'You flex your fingers against the cold already finding them, check the lamp, check the rack. Then you turn your back on the last of the daylight, the way you always do, and follow Rolly’s voice down into the hill.',
      choices: [
        { id: 'c_to_pitch', label: 'On to the pitch.', destination: 'n_pitch_head', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_pitch_head',
      title: 'Head of the Pitch',
      type: 'scene',
      location: 'pitch_head',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'pitch_head' }],
      body:
        'You stand at the head of the pitch with the rope running black over the edge and the breath of moving water coming up cold out of the shaft.\n\n' +
        'It is a clean drop, forty feet of free hang down into the streamway, and you have rigged it and dropped it a dozen times. Rolly is beside you now, racking up, breath fogging, clipping the descender on with the unhurried competence of someone who has never once thought the cave might be the thing that finishes them. Below, the water is loud. Not loud at you — it does not know you are here — just loud, a fat heavy rush of it somewhere down in the dark, more than there should be.\n\n' +
        'You could drop straight in. Or there are a few minutes still to spend up here on the dry, where it is easy, before the cave gets hold of you properly.',
      choices: [
        { id: 'c_descend', label: 'Rig in and drop the pitch.', destination: 'n_pitch_bottom', effects: [{ field: 'time', op: 'add_minutes', value: '15' }] },
        { id: 'c_rolly_top', label: 'A word with Rolly before you drop.', destination: 'n_rolly_top', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_read_sky', label: 'Listen to the water, read the signs.', destination: 'n_weather', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_rolly_top',
      title: 'A Word at the Top',
      type: 'conversation',
      location: 'pitch_head',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'pitch_head' }],
      body:
        '"Pint after," Rolly says, not a question, threading the rope. "You’re buying. You lost the bet on the survey." You did not lose the bet on the survey and you both know it, and that is the shape of the thing between you — a ledger of small invented debts, kept going for fifteen years, because the real debts do not bear saying out loud.\n\n' +
        'You have pulled each other out of worse than this. A flooded crawl in the Dales, a long cold night on a ledge in France waiting for the water to drop. Rolly was the one who kept talking, then, kept the fear at arm’s length with nonsense until the dawn and the rescue came. You owe Rolly more than you have ever found a way to pay, and the way you pay it is this: you come down the hole together, and you go up it together, every time, no exceptions.\n\n' +
        '"Right," Rolly says, testing the rig, all business now. "Down we go."',
      choices: [
        { id: 'c_descend_after', label: 'Drop the pitch.', destination: 'n_pitch_bottom', effects: [{ field: 'time', op: 'add_minutes', value: '15' }] },
      ],
    },
    {
      id: 'n_weather',
      title: 'Reading the Water',
      type: 'discovery',
      location: 'pitch_head',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'pitch_head' }],
      body:
        'You crouch at the lip and listen the way the old hands taught you, and what you hear you do not much like.\n\n' +
        'The streamway is not just up; it is wrong. There is a note under the rush of it, a deep intermittent boom as some airspace down there fills and empties, the sound a cave makes when it is carrying more water than its passages were cut for. Rain on the tops all week, Rolly said, and the tops drain through here, and somewhere up on the moor the ground is full and giving the rest of it straight to the hole.\n\n' +
        'A cave in this mood can pulse — can rise a foot in a minute, with no warning but the noise, when a held-back head of water somewhere upstream finally lets go. You file it away, cold and clear, the way you file the position of every handhold on a climb. The water is up, and the water is not done coming up. Whatever you do down there today, you do it knowing that.',
      choices: [
        { id: 'c_descend_after_sky', label: 'Drop in anyway — you came to cave.', destination: 'n_pitch_bottom', effects: [{ field: 'time', op: 'add_minutes', value: '15' }] },
      ],
    },
    {
      id: 'n_pitch_bottom',
      title: 'Foot of the Pitch',
      type: 'scene',
      location: 'pitch_bottom',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'pitch_bottom' }],
      body:
        'You come off the rope into the streamway and the noise closes over you like a second cold.\n\n' +
        'Here the water is a real thing, ankle-deep and fast and brown, running hard over a cobbled floor that wants to take your feet from under you. The passage is a tall narrow rift, the walls close enough to touch on both sides, climbing away into the dark above your lamp’s reach. Your light lays its disc on the moving water and the water will not hold it; it breaks and shivers and runs on. Rolly comes down after you, unclips, stamps feeling back into both boots.\n\n' +
        '"All right," Rolly says, raising a voice over the water. "Sump’s about forty minutes down. Quick look at the far series and out before tea?" The only known way out of the far series is the sump — the low drowned duck under the boulder choke downstream — and the way back, the pitch, is already a waterfall behind you. Forward is the plan. Forward is always the plan.',
      choices: [
        { id: 'c_streamway', label: 'Head downstream into the streamway.', destination: 'n_streamway', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_inlet', label: 'Check the side inlet first.', destination: 'n_inlet', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_inlet',
      title: 'The Side Inlet',
      type: 'discovery',
      location: 'pitch_bottom',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'pitch_bottom' }],
      body:
        'A low inlet comes in from the side, and you duck your head in out of habit, lamp first.\n\n' +
        'It is barely a passage — a flat-out crawl carrying a thin separate stream that joins the main flow here — but what stops you is the colour of the water coming out of it. It is brown. Properly brown, peat-stained, thick with the moor. Clean cave water runs clear; this is surface water, and a lot of it, arriving fast and dirty straight off the saturated ground above. The inlet is doing in miniature what the whole system is doing: taking more than it can hold.\n\n' +
        'Cold runs down the back of your neck that has nothing to do with the temperature. You back out, and rejoin Rolly in the main passage, and do not say anything, because there is nothing to say that the water has not already said louder.',
      choices: [
        { id: 'c_to_streamway', label: 'Press on downstream.', destination: 'n_streamway', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
      ],
    },
    // ===== ACT 2 — THE STREAMWAY & THE PULSE =====
    {
      id: 'n_streamway',
      title: 'The Streamway',
      type: 'scene',
      location: 'streamway',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'streamway' }],
      body:
        'The streamway goes down through the hill in a series of cascades and pools, and you go down it with it, wading and stooping and bracing, the work of it almost warm against the cold.\n\n' +
        'This is the part you come for, if you are honest — the long muscular passage through the middle of the earth, the water at your knees and then your thighs, the lamp throwing your shadow huge and shaking on the rift wall, Rolly somewhere ahead or behind, the two lights making a small moving country of seeing in all the dark. The cave breathes cold around you. The boom of the deep water is louder now, closer, ahead.\n\n' +
        'Off to one side an old high-level passage runs — a dry abandoned oxbow, a loop of streamway the water gave up on an age ago. And the floor here is flat enough to stop and sound the depth, if you want to know what the water is really doing before you commit further down.',
      choices: [
        { id: 'c_press', label: 'Press on down the streamway.', destination: 'n_pulse', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_oxbow', label: 'Climb up to explore the old oxbow.', destination: 'n_oxbow_side', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_sound', label: 'Stop and sound the depth of the water.', destination: 'n_test_water', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_oxbow_side',
      title: 'The Old Oxbow',
      type: 'discovery',
      location: 'oxbow_side',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'oxbow_side' }],
      body:
        'You climb up out of the water into the old oxbow, and it is like stepping into another century. The water left here long ago; the floor is dry mud, cracked into plates, and the air is still and dead and almost warm after the streamway.\n\n' +
        'Someone was here before you, a long time ago. A coil of furred hemp rope, perished to felt. A carbide tin, rusted through. And high on the wall, far above where the streamway runs now, a tide-line — a dark stain of old flood mud, laid down by water that once filled this whole passage to the roof. You stand under it and do the arithmetic and it is not comforting. The cave has been this full before. It will be this full again. The only question the tide-line leaves open is whether you will be in it when it is.\n\n' +
        'You take a last look at the dead rope, the dead tin, the high dark water-line, and climb back down to where Rolly waits in the loud living stream.',
      choices: [
        { id: 'c_oxbow_back', label: 'Climb back down to the streamway.', destination: 'n_streamway', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
      ],
    },
    {
      id: 'n_test_water',
      title: 'Sounding the Water',
      type: 'discovery',
      location: 'streamway',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'streamway' }],
      body:
        'You brace against the wall and put a boot down into the deepest part of the channel, feeling for the bottom, reading the water through your legs the way you read rock through your hands.\n\n' +
        'It is deeper than it was an hour ago. You can feel it — the push of it higher up your thigh, the bottom scoured and shifting, cobbles rolling downstream under the force. The level is climbing, slowly, steadily, the way a bath fills. Not a pulse, not yet. Just the patient arithmetic of a moor giving up a week of rain through one hole in the ground, and the hole not quite wide enough.\n\n' +
        'You mark the wet line on the wall with your eye and file it. If it passes that mark, you will know the cave has stopped filling slowly and started filling fast, and that is the moment a sensible person is already at the sump and through it.',
      choices: [
        { id: 'c_water_back', label: 'Carry on down the streamway.', destination: 'n_streamway', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_pulse',
      title: 'The Pulse',
      type: 'event',
      location: 'streamway',
      entryEffects: [
        { field: 'location', op: 'change_location', value: 'streamway' },
        { field: 'companion_status', op: 'set', value: 'hurt' },
        { field: 'flood_water', op: 'increment', value: '1' },
        { field: 'clues', op: 'add_clue', value: 'clue_pulse' },
      ],
      body:
        'It comes the way the old hands said it would, which is to say with no mercy and no warning but a half-second of sound.\n\n' +
        'You hear it before you understand it — the boom up the passage rising to a roar, a pressure in your ears — and then the pulse is there, a shoulder of brown water that was not there a breath ago, shockingly fast, and it takes your legs and it takes Rolly harder. You go down, come up gasping, slam a hand on rock and hold. When the surge drops back to a new, higher normal, Rolly is down in the running water a few feet on, one boot wedged wrong in the floor, face gone the grey of the rock.\n\n' +
        'There is a sound a body makes against stone that you will not forget. Rolly makes it, once, and then bites it off.\n\n' +
        '"Ankle," Rolly says, through teeth, not looking at it. "It’s the ankle. Don’t — just give me a second." The water is already climbing past where it was. A second is the one thing the cave is not offering.',
      choices: [
        { id: 'c_to_rolly', label: 'Get down to Rolly.', destination: 'n_rolly_down', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
      ],
    },
    // ===== ACT 3 — THE ROLLY DECISION (spine 1) =====
    {
      id: 'n_rolly_down',
      title: 'Rolly Down',
      type: 'conversation',
      location: 'streamway',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'streamway' }],
      body:
        'You get a hand under Rolly’s arm and the two of you sit a moment in the rising water while the ankle is looked at and not looked at.\n\n' +
        'It is bad. Not bone-through-skin bad, but the kind of bad that does not carry its own weight out of a cave. The only known way out is the sump, downstream under the choke, a short dive through into the next passage and the way to the surface beyond. Above the choke there is dry country, a longer way, a hard climb. Both of those are forward. Behind you the pitch is a waterfall now and the water is still coming up.\n\n' +
        'Rolly watches you do the arithmetic, and you can see Rolly doing it too, and arriving first at the answer neither of you wants. "I can hop," Rolly says, which is a lie you are both allowed. "Go on. Don’t look at me like that."',
      choices: [
        { id: 'c_assess', label: 'Look at the ankle properly before you decide.', destination: 'n_assess', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
        { id: 'c_word', label: 'Say the thing neither of you is saying.', destination: 'n_rolly_word', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
        { id: 'c_stabilise', label: 'Splint it and take Rolly with you — slower, together.', destination: 'n_carry', conditions: [{ field: 'companion_status', op: 'equals', value: 'hurt' }], effects: [{ field: 'time', op: 'add_minutes', value: '20' }] },
        { id: 'c_push', label: 'No time to splint — push for the choke, Rolly limping behind.', destination: 'n_streamway_deep', effects: [{ field: 'time', op: 'add_minutes', value: '10' }, { field: 'flood_water', op: 'increment', value: '1' }] },
      ],
    },
    {
      id: 'n_assess',
      title: 'The Ankle',
      type: 'discovery',
      location: 'streamway',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'streamway' }],
      body:
        'You get Rolly’s boot off in the cold water, which is its own small cruelty, and look at what the cave has done.\n\n' +
        'It is already swelling, the joint going wrong colours, the foot turning at an angle a foot should not turn at. Not the bone, you think — the bone would be worse — but the ligaments are gone, torn through, and a torn ankle in a flooding cave is, for the practical purpose of getting out, the same as a broken one. Rolly cannot weight it. Rolly cannot climb on it. Rolly can, with a splint and your shoulder, hop and drag and be carried, slowly, at a cost in time you can feel the cave counting.\n\n' +
        '"That bad?" Rolly says, watching your face. You don’t answer. "Yeah," Rolly says. "Thought so."',
      choices: [
        { id: 'c_assess_back', label: 'Back to the decision.', destination: 'n_rolly_down', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_rolly_word',
      title: 'The Unsaid Thing',
      type: 'conversation',
      location: 'streamway',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'streamway' }],
      body:
        '"If it comes to it," Rolly says, fast and low, getting it out before either of you can stop it, "you go. You hear me? Don’t you dare die in here being noble about it. Send people in. That’s the deal."\n\n' +
        'It is the opposite of the deal. The deal, the real one, the fifteen-year one, is that you do not leave each other in the hole. You both know which deal is the true one and which is the one fear makes a person say. You don’t argue it. There is no time to argue it, and arguing it would mean saying out loud how bad this is, and the water is still rising, and Rolly’s lips are already going blue at the edges.\n\n' +
        '"Shut up," you say, as gently as it has ever been said. Rolly almost laughs. The almost-laugh goes down the passage and the water swallows it.',
      choices: [
        { id: 'c_word_back', label: 'Back to the decision.', destination: 'n_rolly_down', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_carry',
      title: 'Shouldering Rolly',
      type: 'scene',
      location: 'streamway',
      entryEffects: [
        { field: 'location', op: 'change_location', value: 'streamway' },
        { field: 'companion_status', op: 'set', value: 'with_you' },
      ],
      body:
        'You splint the ankle with a tackle-bag strap and two cold hands, and you get Rolly’s arm over your shoulders, and you stand the two of you up out of the water like one tired animal.\n\n' +
        'It is slow. Every step is a negotiation between Rolly’s weight and the current and the treacherous floor, and your lamp throws both your shadows huge and reeling on the wall. But you are moving, and you are moving together, and that is going to have to be worth what it costs in the one currency the cave is spending you down to: time. "Thanks," Rolly says, very quietly, once, and then doesn’t say it again, and you are both grateful for that.',
      choices: [
        { id: 'c_carry_on', label: 'Carry on toward the choke.', destination: 'n_streamway_deep', effects: [{ field: 'time', op: 'add_minutes', value: '15' }] },
      ],
    },
    // ===== ACT 4 — THE DEEP STREAMWAY & THE CHOKE (spine 2) =====
    {
      id: 'n_streamway_deep',
      title: 'The Deep Streamway',
      type: 'scene',
      location: 'streamway_deep',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'streamway_deep' }],
      body:
        'The streamway deepens and steepens toward the choke, and the cave stops being a place you walk through and becomes a place you fight.\n\n' +
        'The water is at your waist in the pools now, fast enough in the narrows to lean on, cold enough that your hands have started to go stupid and clumsy on the holds. Your breath comes ragged and fogs in the lamplight. Somewhere in here the joy of it has quietly gone and left only the labour, and under the labour, patient, the fear — not loud, just always there now, the steady knowledge that the way out is downstream under water that is still rising.\n\n' +
        'Ahead the passage chokes down. There is a tight wet squeeze to take direct, or a slower clamber round it over the boulders, or you can stop a moment in the lee of a buttress and gather what you have left before the choke.',
      choices: [
        { id: 'c_to_choke', label: 'Push on to the choke.', destination: 'n_choke', effects: [{ field: 'time', op: 'add_minutes', value: '15' }] },
        { id: 'c_squeeze', label: 'Take the tight wet squeeze direct.', destination: 'n_squeeze', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_pause', label: 'Stop in the lee of the rock and gather yourself.', destination: 'n_deep_pause', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_squeeze',
      title: 'The Wet Squeeze',
      type: 'scene',
      location: 'streamway_deep',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'streamway_deep' }],
      body:
        'You take the squeeze, because it is faster, and for thirty bad seconds you are reminded exactly how much the cave does not care.\n\n' +
        'It is a flat-out slot half-full of running water, and you go through it on your side with your face turned up to the inch of airspace at the roof, the rock pressing your chest, the current pulling at your legs, the lamp scraping and skittering against stone six inches from your eyes. There is a moment in the middle of it, wedged, exhaling to make yourself thinner, the water loud in your ear, when the old animal panic comes up the back of your throat and you have to put it down hard, the way you have learned to: name the next move, make the next move, do not think past it. A hand. A wriggle. A hand. And then the slot opens and spits you out the far side, gasping, into the deeper rift before the choke.',
      choices: [
        { id: 'c_squeeze_on', label: 'On to the choke.', destination: 'n_choke', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
      ],
    },
    {
      id: 'n_deep_pause',
      title: 'In the Lee of the Rock',
      type: 'scene',
      location: 'streamway_deep',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'streamway_deep' }],
      body:
        'You wedge into the lee of a buttress where the water runs slower and you stop, just for a moment, and let your heart come down out of your throat.\n\n' +
        'The cold is the enemy now as much as the water — you can feel it getting into the core of you, the shiver starting deep and constant, the way your thoughts have begun to come slower and stickier. You cup your hands over your mouth and breathe into them, useless, a habit. If Rolly is with you, you check Rolly: the lips, the eyes, the colour, the small signs of a body losing its war with the cold. If Rolly is not, you check the empty dark where Rolly should be, and look away from it.\n\n' +
        'A minute. Just a minute. The cave does not begrudge you the minute, exactly; it simply keeps the meter running while you take it, the water rising and the lamp burning and the afternoon going, all on the same indifferent clock.',
      choices: [
        { id: 'c_pause_on', label: 'On to the choke.', destination: 'n_choke', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
      ],
    },
    {
      id: 'n_choke',
      title: 'The Boulder Choke',
      type: 'transition',
      location: 'choke',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'choke' }],
      body:
        'The boulder choke is where the cave chokes itself half shut — a fall of car-sized blocks dropped here in some older flood, the water finding its way through the low gaps in white roaring threads.\n\n' +
        'Down at the bottom, under the blocks, is the sump duck: the short drowned crawl that is the only known low way out, and the water that just rose is the water that feeds it. Above, a dry rift climbs away into the dark, breathing cold air down at your face — the high way, the long way, a climb. Your lamp’s disc shivers on the wet blocks; the battery is tiring, and the dark at the edge of the light has come in a little closer than it was.\n\n' +
        'This is the fork the whole afternoon has been carrying you toward. Down, into the water and the duck, fast and short and drowned. Or up, into the dry rift, long and cold and a climb. The water is not going to wait for you to decide.',
      choices: [
        { id: 'c_scout_high', label: 'Scout the dry rift, up over the choke.', destination: 'n_high_decide', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_check_low', label: 'Climb down to the sump duck and look at the low way.', destination: 'n_duck_look', conditions: [{ field: 'cave_sump_sealed', op: 'is_false' }], effects: [{ field: 'location', op: 'change_location', value: 'sump_pool' }, { field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_godown', label: 'Commit straight to the water — it’s rising fast.', destination: 'n_take_low', conditions: [{ field: 'flood_water', op: 'gte', value: '2' }], effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_study', label: 'Study the choke and the water a moment longer.', destination: 'n_choke_study', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_choke_study',
      title: 'Reading the Choke',
      type: 'discovery',
      location: 'choke',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'choke' }],
      body:
        'You hold your light on the choke a moment longer and make yourself read it properly, the way fear wants you not to.\n\n' +
        'The low way: the duck is still open, an airspace under the blocks, but the water is climbing the rock toward the roof while you watch, a slow brown tide. There is time to dive it. There may not be time to dither and then dive it. The high way: the dry rift goes up clean, but it is a climb, and a climb costs warmth and light and the one thing you are shortest of, and at the top of it lies a long traverse you have only ever heard described.\n\n' +
        'Neither way is safe. That stopped being on the table when the pulse came through. What is on the table is which danger you choose, and the cave, patient, indifferent, lets you choose it, and goes on rising while you do.',
      choices: [
        { id: 'c_study_back', label: 'Back to the choke and the choice.', destination: 'n_choke', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    // ===== ACT 5 — THE COMMIT =====
    {
      id: 'n_high_decide',
      title: 'The Dry Ledge',
      type: 'discovery',
      location: 'choke_ledge',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'choke_ledge' }],
      body:
        'You climb up off the choke onto a dry ledge, and for the first time since the pulse the roar drops behind you to a steady underground weather.\n\n' +
        'The air here is older, stiller, colder. Above, the rift goes up and on — the high traverse, the long dry way out. Rolly is beside you or is not, depending on what you decided below, and either way the next thing the cave makes you choose is how you take the high road: whether you can get an injured caver up a climb like this at all, and what it means to try, and what it means not to.',
      choices: [
        { id: 'c_lead_up', label: 'Lead Rolly up onto the high route with you.', destination: 'n_set_together', conditions: [{ field: 'companion_status', op: 'equals', value: 'with_you' }], effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_strand', label: 'Rolly can’t make the climb — fix a line, go up alone.', destination: 'n_strand_rolly', conditions: [{ field: 'companion_status', op: 'not_equals', value: 'with_you' }], effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
        { id: 'c_commit_high', label: 'Commit to the high traverse and go.', destination: 'n_take_high', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_set_together',
      title: 'Together on the Ledge',
      type: 'scene',
      location: 'choke_ledge',
      entryEffects: [
        { field: 'location', op: 'change_location', value: 'choke_ledge' },
        { field: 'cave_all_together', op: 'set', value: 'true' },
      ],
      body:
        'You get Rolly up onto the ledge beside you, both of you on the dry rock, both of you breathing like the climb cost more than it did. The splint has held. The ankle is a problem you are carrying forward whole, not a person you are leaving behind.\n\n' +
        '"Still a team," Rolly says, and means it as a question. You don’t answer out loud, because answering it would be tempting the cave. But you are. For now, against the cold and the dark and the water, you are.',
      choices: [
        { id: 'c_on_high', label: 'On to the high traverse, together.', destination: 'n_take_high', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_strand_rolly',
      title: 'Leaving the Line',
      type: 'scene',
      location: 'choke_ledge',
      entryEffects: [
        { field: 'location', op: 'change_location', value: 'choke_ledge' },
        { field: 'companion_status', op: 'set', value: 'lost' },
        { field: 'cave_someone_lost', op: 'set', value: 'true' },
        { field: 'cave_all_together', op: 'set', value: 'false' }, // a loss clears the togetherness latch
        { field: 'clues', op: 'add_clue', value: 'clue_left_rolly' },
      ],
      body:
        'There is no version of the high climb that Rolly’s ankle survives, and you both know it before either of you says it. You fix a line down to the ledge below and clip Rolly to it, where it is dry, where the water cannot reach — yet.\n\n' +
        '"Go," Rolly says. "Get out, send people in. I’m fine here. I’m fine." The third time is the one neither of you believes. You climb. Below you Rolly’s lamp becomes a smaller and smaller coin on the rock, and then the rift takes you round a corner and it is gone, and there is only your own light and the dry dark and the thing you are choosing to do.',
      choices: [
        { id: 'c_climb_alone', label: 'Climb up to the high traverse.', destination: 'n_take_high', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_take_high',
      title: 'Over the Choke',
      type: 'transition',
      location: 'choke_ledge',
      resolvesEnding: true,
      entryEffects: [
        { field: 'location', op: 'change_location', value: 'choke_ledge' },
        { field: 'cave_route', op: 'set', value: 'high' },
      ],
      body:
        'You crest the top of the choke and the dry rift opens out ahead into the upper system, and the sound of the flood drops away below and behind until it is just the cave’s own breathing again. The water is behind you now. Everything ahead is up, and dry, and dark, and a long way.',
      choices: [],
    },
    {
      // Looking at the still-open duck (player choice, any time before the seal). Reconnaissance only:
      // it does NOT seal the cave or consume ev_sump_seal — that beat belongs to the timed event
      // (n_seal_present), reached only by being at the pool when the seal actually comes.
      id: 'n_duck_look',
      title: 'The Sump Duck',
      type: 'discovery',
      location: 'sump_pool',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'sump_pool' }],
      body:
        'You climb down to the lip of the sump pool to look at the low way while there is still a low way to look at.\n\n' +
        'The duck is open — a hand’s width of black airspace between the rising water and the rock roof, the short drowned crawl that is the only known way out under the choke. The water is climbing it without hurry, a slow brown tide answerable to rain that fell on the tops days ago and is only now arriving. There is room to take it now. There may not be, soon. There is no honest way to read, from here, how long the cave means to leave the gap; nobody can. You can dive it now, on the strength of that. Or you can climb back to the choke and the dry rift and leave the water to the water.',
      choices: [
        { id: 'c_dive_open', label: 'Take the duck now, while it’s still open.', destination: 'n_take_low', conditions: [{ field: 'cave_sump_sealed', op: 'is_false' }], effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
        // Leave the water for the dry rift. Goes FORWARD to the high decision (not back to the choke) —
        // a non-sealing loop back into the hub multiplies walker states by arrival-time (H10) and blew the cap.
        { id: 'c_duck_back', label: 'Leave the water — climb up to the high way.', destination: 'n_high_decide', effects: [{ field: 'location', op: 'change_location', value: 'choke_ledge' }, { field: 'time', op: 'add_minutes', value: '10' }] },
      ],
    },
    {
      id: 'n_seal_present',
      title: 'The Sump Seals',
      type: 'event',
      location: 'sump_pool',
      entryEffects: [
        { field: 'location', op: 'change_location', value: 'sump_pool' },
        { field: 'cave_sump_sealed', op: 'set', value: 'true' },
        { field: 'clues', op: 'add_clue', value: 'clue_saw_seal' },
        { field: 'ev_sump_seal', op: 'mark_event_completed' },
      ],
      body:
        'You climb down to the lip of the sump pool just as the mountain decides.\n\n' +
        'The duck has been shrinking the whole while — a hand’s width of black airspace between the water and the rock roof, the only low way out, the brown flood climbing it without hurry or malice. Then the airspace closes. It does not slam. It draws shut — the water meets the rock with a long sucking roar, air punched out sideways in a cold spray across your face — and where there was a way through there is only the pool, smooth and full and final.\n\n' +
        'The low way out is gone. You saw it close. You will not have to wonder, later, whether you might have made it. You know.',
      choices: [
        { id: 'c_commit_water', label: 'Commit to the water anyway — the sealed crawl is still a crawl.', destination: 'n_take_low', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
        { id: 'c_retreat', label: 'Turn back for the choke and the high way.', destination: 'n_choke', effects: [{ field: 'location', op: 'change_location', value: 'choke' }, { field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_take_low',
      title: 'Down Into the Water',
      type: 'transition',
      location: 'sump_pool',
      resolvesEnding: true,
      entryEffects: [
        { field: 'location', op: 'change_location', value: 'sump_pool' },
        { field: 'cave_route', op: 'set', value: 'sump' },
      ],
      body:
        'You lower yourself into the cold flood at the bottom of the choke, and the water closes over your legs and then your chest, and the only way on now is a drowned one. Whatever air there is ahead, you will find by feel, in the dark, under the rock. You take a breath the cave lets you take, and you go down into the water.',
      choices: [],
    },
  ],
  endings: [
    {
      id: 'ch1_to_high',
      name: 'Up Over the Choke',
      summary: 'You commit to the dry high traverse; the way out is up.',
      conditions: [{ field: 'cave_route', op: 'equals', value: 'high' }],
    },
    {
      id: 'ch1_to_sump',
      name: 'Down Into the Water',
      summary: 'You commit to the water, or the clock commits you; the way out is a drowned one.',
      isDefault: true,
      conditions: [],
    },
  ],
};
