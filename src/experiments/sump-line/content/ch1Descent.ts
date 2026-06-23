import type { Story } from '../../../engine';

/**
 * The Sump Line — Chapter 1: "The Pulse" (`ch1_descent`).
 *
 * The shared setup: the descent, the flood pulse, the injured companion (Rolly), and the
 * choice of WHICH way out you commit to. A hub chapter (non-game-ending): it sets the carried
 * state — `cave_route` ('high' | 'sump'), `companion_status`, the carried survival meters — and
 * the GAME's transitions (in `sumpLine.ts`) fork on `cave_route`.
 *
 * Authoring notes (from the approved design + build punch-list):
 * - CLOCK FIX: the longest path is bumped to 90 min (carry-Rolly path +5) so `maxTime` (90) == the
 *   13:00→14:30 window (90); lints clean (no CLOCK_CANNOT_BITE) with no path exceeding the deadline,
 *   so the clock never cuts the player off mid-high-route into the wrong (sump) fork.
 * - LAMP at-zero is `setFlag`-only here: the lamp starts full and loses ~35 over this chapter, so it
 *   cannot reach 0; ch1 has no dark ending (it routes onward). The dark ENDINGS live in the branch
 *   chapters, reachable only when a depleted lamp is carried in. (Avoids RESOURCE_ATZERO_ENDING_MISSING.)
 * - Blocker discipline: every latch is set by an UNCONDITIONAL entryEffect on a destination node
 *   (forks are gated CHOICES, never conditional effects); every node emits change_location; bounded
 *   numerics; `n_choke_hub` is the re-convergence hub.
 */
export const ch1Descent: Story = {
  id: 'ch1_descent',
  title: 'The Pulse',
  startNodeId: 'n_drop',
  startTime: '13:00',
  deadline: '14:30', // window 90 min; longest path == 90 (see clock note)
  startLocation: 'surface_pitch',
  variables: [
    { name: 'cave_route', type: 'string', default: 'sump', purpose: "The chapter-fork: 'high' (dry traverse) or 'sump' (the water). Default 'sump' so a passive/timed-out path forks deterministically." },
    { name: 'companion_status', type: 'string', default: 'hurt', purpose: "Rolly's state: 'hurt' | 'with_you' | 'lost'. Carries across chapters; gates content and endings." },
    { name: 'cave_someone_lost', type: 'boolean', default: false, purpose: 'Latching: set true only when the companion is stranded/lost. Pyrrhic/loss endings require it.' },
    { name: 'cave_all_together', type: 'boolean', default: false, purpose: 'Latching: set true only at the safe hub when Rolly is still with you. The clean ending requires it.' },
    { name: 'cave_dark_out', type: 'boolean', default: false, purpose: 'Latching, paired with lamp_charge at-zero. Dark endings require it (keeps the at-zero path honestly gated).' },
    { name: 'cave_hypothermic', type: 'boolean', default: false, purpose: 'Latching, paired with body_heat at-zero. Cold flavour/endings gate on it.' },
    { name: 'cave_sump_sealed', type: 'boolean', default: false, purpose: 'Latching: the low sump duck has sealed (witnessed or heard). The sealed-in ending requires it.' },
  ],
  locations: [
    { id: 'surface_pitch', name: 'Head of the Pitch' },
    { id: 'stream_passage', name: 'The Streamway' },
    { id: 'choke', name: 'The Boulder Choke' },
    { id: 'sump_pool', name: 'The Sump Pool' },
    { id: 'choke_ledge', name: 'The Dry Ledge' },
  ],
  resources: [
    // Carried survival meters (the container rebases `start` from the carried value on entry).
    { id: 'lamp_charge', label: 'Lamp', min: 0, max: 100, start: 100, depletion: { everyMinutes: 12, amount: 5 }, atZero: { setFlag: 'cave_dark_out' } },
    { id: 'body_heat', label: 'Warmth', min: 0, max: 100, start: 100, depletion: { everyMinutes: 20, amount: 5 }, atZero: { setFlag: 'cave_hypothermic' } },
    // Chapter-local, choice-driven (no depletion): how high the water has risen.
    { id: 'flood_water', label: 'Water', min: 0, max: 3, start: 0 },
  ],
  events: [
    {
      id: 'ev_sump_seal',
      title: 'The Sump Seals',
      trigger: [{ field: 'time', op: 'time_after', value: '14:00' }],
      eventLocation: 'sump_pool',
      ifPresentNode: 'n_seal_present',
      ifAbsentEffects: [
        { field: 'cave_sump_sealed', op: 'set', value: 'true' },
        { field: 'clues', op: 'add_clue', value: 'clue_sump_sealed' },
      ],
      recoveryNodeId: 'n_choke_hub',
    },
  ],
  nodes: [
    // 1 — opening
    {
      id: 'n_drop',
      title: 'Head of the Pitch',
      type: 'scene',
      location: 'surface_pitch',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'surface_pitch' }],
      body:
        'Cold comes up out of the shaft to meet you, the breath of moving water somewhere a long way down, and you stand at the head of the pitch with the rope running black over the edge.\n\n' +
        'Whitethroat takes the afternoon’s light and keeps it. Behind you, past the entrance crawl, it is {{time}} and grey and ordinary on the hill. Here there is only the lamp on your helmet, a small hard disc of white laid on the rock, and the dark crowding its edge the way it always does, patient, waiting for the battery to tire.\n\n' +
        'Rolly is above you on the pitch, racking up, breath fogging, cheerful in the way of someone who has done this a hundred times. “Streamway’s loud today,” Rolly says, and laughs, and the laugh goes down the shaft and does not come back. The water far below answers nothing. It is not loud at you. It is just loud.\n\n' +
        'You check the rack, you check the light, you feel the cold already starting to look for the gaps in your wetsuit. You lean back against the rope and let the pitch take your weight.',
      choices: [
        { id: 'c_down', label: 'Down the pitch into the streamway.', destination: 'n_stream', effects: [{ field: 'time', op: 'add_minutes', value: '15' }] },
      ],
    },
    // 2 — the pulse hits
    {
      id: 'n_stream',
      title: 'The Streamway',
      type: 'event',
      location: 'stream_passage',
      entryEffects: [
        { field: 'location', op: 'change_location', value: 'stream_passage' },
        { field: 'companion_status', op: 'set', value: 'hurt' },
        { field: 'flood_water', op: 'increment', value: '1' },
        { field: 'clues', op: 'add_clue', value: 'clue_pulse' },
      ],
      body:
        'The streamway is a low rifting passage and the water is running fast and brown along its floor, and you are forty feet in, bent double, when the cave changes its mind.\n\n' +
        'You hear it before you understand it — a rising note up the passage, a pressure in your ears — and then the pulse comes through, a shoulder of water that was not there a breath ago, and it takes your legs and it takes Rolly harder. There is a sound a body makes against rock that you will not forget. When the surge drops back, Rolly is down in the running water with one boot wedged wrong in the floor and a face gone the colour of the rock.\n\n' +
        '“Ankle,” Rolly says, through teeth, not looking at it. “It’s the ankle. Don’t — just give me a second.”\n\n' +
        'The water is still rising at your shins. A second is the one thing the cave is not offering.',
      choices: [
        { id: 'c_to_rolly', label: 'Get down to Rolly.', destination: 'n_rolly', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
      ],
    },
    // 3 — the companion decision
    {
      id: 'n_rolly',
      title: 'Rolly Down',
      type: 'conversation',
      location: 'stream_passage',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'stream_passage' }],
      body:
        'You get a hand under Rolly’s arm and the two of you sit a moment in the cold running water while the ankle is looked at and not looked at. It is bad. Not bone-through-skin bad, but the kind of bad that does not carry its own weight out of a cave.\n\n' +
        'The only known way out is the sump — the low duck under the boulder choke ahead, a short dive through into the next passage — and the water that just rose is the water that feeds it. Above the choke there is dry country, a longer way, a harder climb. Both of those are forward. Behind you the pitch is a waterfall now.\n\n' +
        'Rolly watches you do the arithmetic. “I can hop,” Rolly says, which is a lie you are both allowed. “Go on. Don’t look at me like that.”',
      choices: [
        { id: 'c_stabilise', label: 'Splint the ankle and take Rolly with you — slower, but together.', destination: 'n_carry', conditions: [{ field: 'companion_status', op: 'equals', value: 'hurt' }], effects: [{ field: 'time', op: 'add_minutes', value: '20' }] },
        { id: 'c_push', label: 'No time to splint — push for the choke, Rolly limping behind.', destination: 'n_choke_hub', effects: [{ field: 'time', op: 'add_minutes', value: '10' }, { field: 'flood_water', op: 'increment', value: '1' }] },
      ],
    },
    // 4 — carry (sets with_you, unconditional)
    {
      id: 'n_carry',
      title: 'Shouldering Rolly',
      type: 'scene',
      location: 'stream_passage',
      entryEffects: [
        { field: 'location', op: 'change_location', value: 'stream_passage' },
        { field: 'companion_status', op: 'set', value: 'with_you' },
      ],
      body:
        'You splint the ankle with a tackle-bag strap and two cold hands, and you get Rolly’s arm over your shoulders, and you stand the two of you up out of the water like one tired animal.\n\n' +
        'It is slow. Every step is a negotiation between Rolly’s weight and the floor and the current, and your lamp throws both your shadows huge and shaking on the passage wall. But you are moving, and you are moving together, and that is going to have to be worth what it costs.\n\n' +
        '“Thanks,” Rolly says, very quietly, once, and then doesn’t say it again.',
      choices: [
        { id: 'c_carry_on', label: 'Carry on toward the choke.', destination: 'n_choke_hub', effects: [{ field: 'time', op: 'add_minutes', value: '20' }] },
      ],
    },
    // 5 — the fork hub (also recoveryNodeId for the seal event). State-agnostic prose.
    {
      id: 'n_choke_hub',
      title: 'The Boulder Choke',
      type: 'transition',
      location: 'choke',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'choke' }],
      body:
        'The boulder choke is where the passage chokes itself half shut — a fall of car-sized blocks the cave dropped here in some older flood, with the water finding its way through the low gaps in white roaring threads. Down at the bottom, under the blocks, is the sump duck: the short drowned crawl that is the only known low way out. Above, a dry rift climbs away into the dark, breathing cold air down into your face.\n\n' +
        'You stand in the noise with Rolly and look at the two ways the cave has left you. The low one is fast and short and under water. The high one is dry and long and a climb. Your lamp’s disc shivers on the wet blocks; the battery is tiring, and the dark at the edge of the light has come in a little closer than it was.\n\n' +
        'Down, or up. The water is not going to wait for you to decide.',
      choices: [
        { id: 'c_scout_high', label: 'Scout the dry rift, up over the choke.', destination: 'n_high_decide', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_check_low', label: 'Climb down to the sump duck and look at the low way.', destination: 'n_seal_present', conditions: [{ field: 'cave_sump_sealed', op: 'is_false' }], effects: [{ field: 'location', op: 'change_location', value: 'sump_pool' }, { field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_godown', label: 'Commit straight to the water — it’s rising fast.', destination: 'n_take_low', conditions: [{ field: 'flood_water', op: 'gte', value: '2' }], effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
      ],
    },
    // 6 — high commit hub
    {
      id: 'n_high_decide',
      title: 'The Dry Ledge',
      type: 'discovery',
      location: 'choke_ledge',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'choke_ledge' }],
      body:
        'You climb up off the choke onto a dry ledge, and for the first time since the pulse the roar drops behind you to a steady underground weather. The air here is older, stiller, colder. Above, the rift goes up and on — the high traverse, the long dry way you have only ever heard described in the club hut, never walked.\n\n' +
        'Rolly gets up beside you or does not, depending on what you decided below. Either way the ledge is dry, and the lamp is dimmer than it was an hour ago, and the high way is the way that does not have water in it.\n\n' +
        'How you take it — and who you take — is the next thing the cave makes you choose.',
      choices: [
        { id: 'c_lead_up', label: 'Lead Rolly up onto the high route with you.', destination: 'n_set_together', conditions: [{ field: 'companion_status', op: 'equals', value: 'with_you' }], effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_strand', label: 'Rolly can’t make the climb — fix a line, go up alone.', destination: 'n_strand_rolly', conditions: [{ field: 'companion_status', op: 'not_equals', value: 'with_you' }], effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
        { id: 'c_commit_high', label: 'Commit to the high traverse and go.', destination: 'n_take_high', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    // 7 — together latch (unconditional)
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
        '“Still a team,” Rolly says, and means it as a question. You don’t answer, because answering it out loud would be tempting the cave. But you are. For now you are.',
      choices: [
        { id: 'c_on_high', label: 'On to the high traverse, together.', destination: 'n_take_high', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    // 8 — strand latch (unconditional set lost + someone_lost)
    {
      id: 'n_strand_rolly',
      title: 'Leaving the Line',
      type: 'scene',
      location: 'choke_ledge',
      entryEffects: [
        { field: 'location', op: 'change_location', value: 'choke_ledge' },
        { field: 'companion_status', op: 'set', value: 'lost' },
        { field: 'cave_someone_lost', op: 'set', value: 'true' },
        { field: 'clues', op: 'add_clue', value: 'clue_left_rolly' },
      ],
      body:
        'There is no version of the high climb that Rolly’s ankle survives, and you both know it before either of you says it. You fix a line down to the ledge below and clip Rolly to it, where it is dry, where the water cannot reach — yet.\n\n' +
        '“Go,” Rolly says. “Get out, send people in. I’m fine here. I’m fine.” The third time is the one neither of you believes.\n\n' +
        'You climb. Below you Rolly’s lamp becomes a smaller and smaller coin on the rock, and then the rift takes you round a corner and it is gone, and there is only your own light and the dry dark and the thing you are choosing to do.',
      choices: [
        { id: 'c_climb_alone', label: 'Climb up to the high traverse.', destination: 'n_take_high', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    // 9 — high route commit (resolves the high fork)
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
        'You crest the top of the choke and the dry rift opens out ahead of you into the upper system, and the sound of the flood drops away below and behind until it is just the cave’s own breathing again.\n\n' +
        'The water is behind you now. Everything ahead is up, and dry, and dark, and a long way.',
      choices: [],
    },
    // 10 — the seal (present node / reached by choice). Marks the event done to avoid a later absent re-fire.
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
        'The duck has been shrinking the whole while — a hand’s width of black airspace between the water and the rock roof, the only low way out, the brown flood climbing it without hurry or malice. There is no drama in it. The water rises because somewhere up the hill more water is coming down, and it does not know you are here.\n\n' +
        'Then the airspace closes. It does not slam. It draws shut — the water meets the rock with a long sucking roar, air punched out sideways in a cold spray across your face — and where there was a way through there is only the pool, smooth and full and final.\n\n' +
        'The low way out is gone. You saw it close. You will not have to wonder, later, whether you might have made it. You know.',
      choices: [
        { id: 'c_commit_water', label: 'Commit to the water anyway — the sealed crawl is still a crawl.', destination: 'n_take_low', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
        { id: 'c_retreat', label: 'Turn back for the choke and the high way.', destination: 'n_choke_hub', effects: [{ field: 'location', op: 'change_location', value: 'choke' }, { field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    // 11 — sump route commit (resolves the default fork)
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
        'You lower yourself into the cold flood at the bottom of the choke, and the water closes over your legs and then your chest, and the only way on now is a drowned one.\n\n' +
        'Whatever air there is ahead, you will find by feel, in the dark, under the rock. You take a breath the cave lets you take, and you go down into the water.',
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
