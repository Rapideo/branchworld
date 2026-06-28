import type { Story } from '../../../engine';

/**
 * The Countinghouse — Chapter 2: "The Way Out" (`ch2_wayout`).
 *
 * Phase 4 of the heist spine: one escape route reconverging at the getaway car, where the finales resolve.
 * A game-ending chapter. FIRST CONTENT to exercise two more v1.4 capabilities:
 *  - node-named `endsWith` finales: n_end_clean / n_end_lighter / n_end_not_whole pin distinct getaway
 *    outcomes (the state branching is in the gated drive CHOICES at the car).
 *  - the `outOfTimeEndingId` ending: "Dawn" — the night ran out before you cleared (distinct from the
 *    structural default).
 * Plus the atZero DEATH: The Lead hitting zero resolves "The Outfit's Math" (priority 2, dominates).
 *
 * HONESTY (F1 pattern): the getaway only happens when you DRIVE, so `got_clear` is set on the drive-away
 * (the drive choices + the terminal nodes), NOT at the n_car hub. A deadline-cross BEFORE the drive finds
 * got_clear false -> no getaway candidate -> falls through to Dawn. Every getaway ending requires got_clear.
 *
 * STANDALONE WALKABILITY: `made_clean` defaults TRUE here (the container rebases it from the carried value),
 * so `c_slip` is available standalone and the chapter never softlocks at n_stair (mirrors the cave's
 * companion_status default trick).
 *
 * CALIBRATION: window 50 (23:55->24:45). The clean+cover+dash win reaches the car before 50; the c_circle
 * over-investment (~60 simple) and the c_wait dawdle cross 50 BEFORE the car -> Dawn. n_circle is a DISTINCT
 * node (not a self-loop) so it lifts the linter's simple longest path above the window.
 */
export const ch2WayOut: Story = {
  id: 'ch2_wayout',
  title: 'The Way Out',
  startNodeId: 'n_out_start',
  startTime: '23:55',
  deadline: '24:45', // window 50; absolute minutes past midnight
  startLocation: 'stairwell',
  outOfTimeEndingId: 'end_dawn',
  variables: [
    { name: 'partner_status', type: 'string', default: 'steady', purpose: "The boxman: 'steady'|'frayed'|'hurt'|'gone'. Carried; gates the finales." },
    { name: 'made_clean', type: 'boolean', default: true, purpose: 'Latching (carried): came in clean. Default TRUE standalone for walkability; the container rebases it. Mutex with alarm_tripped.' },
    { name: 'alarm_tripped', type: 'boolean', default: false, purpose: 'Latching (carried): the alarm went. Mutex with made_clean.' },
    { name: 'lead_blown', type: 'boolean', default: false, purpose: 'Latching, paired with The Lead at zero. The Outfit ending requires it.' },
    { name: 'got_clear', type: 'boolean', default: false, purpose: 'Latching: you DROVE away. Every getaway finale requires it so a deadline-cross before the drive cannot claim the car (F1).' },
    // Carried items (declared so the carry surface matches ch1).
    { name: 'charges', type: 'number', kind: 'item', default: 1, min: 0, max: 2, label: 'Charges', purpose: 'carried; unused this chapter' },
    { name: 'loot', type: 'number', kind: 'item', default: 0, min: 0, max: 4, label: 'The Take', purpose: 'carried take; gates the clean finale' },
  ],
  locations: [
    { id: 'stairwell', name: 'The Back Stair' },
    { id: 'loading_dock', name: 'The Loading Dock' },
    { id: 'alley', name: 'The Alley' },
    { id: 'getaway_car', name: 'The Car' },
  ],
  resources: [
    // THE LEAD — now lethal: atZero resolves The Outfit (this is a game-ending chapter). Same bounds as ch1
    // so the container's carried-value rebase doesn't clamp.
    { id: 'lead', label: 'Lead', min: 0, max: 60, start: 40, depletion: { everyMinutes: 10, amount: 5 }, atZero: { ending: 'end_outfit', setFlag: 'lead_blown' } },
  ],
  events: [],
  nodes: [
    {
      id: 'n_out_start',
      title: 'Down the Stair',
      type: 'scene',
      location: 'stairwell',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'stairwell' }],
      body:
        'The back stair takes you down two at a time into the cold, the take heavy against you, the boxman a half-flight behind and breathing like a bellows. Above, the count-crew has stopped being puzzled and started being organized; you can hear it in the way the voices have dropped and spread out.\n\n' +
        'Down is good. Down is away from them. But down is also into the body of the building, and the building belongs to the outfit, and the only thing you have on the outfit tonight is the head start you spent the whole job buying yourself, minute by minute, in a currency the night keeps quietly spending back. However much of it you have left, this is where it starts to matter.',
      choices: [
        { id: 'c_to_stair', label: 'Down to the dock level.', destination: 'n_stair', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_stair',
      title: 'The Bottom of the Stair',
      type: 'scene',
      location: 'stairwell',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'stairwell' }],
      body:
        'At the bottom the stair gives onto a service corridor and, past it, the loading dock and the alley and — if the night has gone the way you need it to — the car.\n\n' +
        'How you go from here depends on how you came in. If you came clean, the building still half-believes it is empty, and you can move through it quiet and unhurried, the way a man moves who has every right to be where he is. If you came loud, the building knows, and quiet is a luxury you spent at the freight shutter; now it is just speed and nerve and the door at the far end.',
      choices: [
        { id: 'c_slip', label: 'Slip through quiet — the building still thinks it’s asleep.', destination: 'n_lot', conditions: [{ field: 'made_clean', op: 'is_true' }], effects: [{ field: 'time', op: 'add_minutes', value: '10' }, { field: 'lead', op: 'adjust_resource', value: '10' }] },
        { id: 'c_force', label: 'No time for quiet — force the corridor and run.', destination: 'n_lot', conditions: [{ field: 'alarm_tripped', op: 'is_true' }], effects: [{ field: 'time', op: 'add_minutes', value: '5' }, { field: 'lead', op: 'adjust_resource', value: '-10' }] },
      ],
    },
    {
      id: 'n_lot',
      title: 'The Loading Dock',
      type: 'scene',
      location: 'loading_dock',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'loading_dock' }],
      body:
        'The loading dock is a concrete mouth open on the alley, and between you and the mouth is the one thing your month of arithmetic did not put on the map: a man from the count-crew, sent down the front while the others worked the floor, standing now at the head of the dock with his back to you and a question in the set of his shoulders.\n\n' +
        'The boxman has stopped dead at your side. The ankle of the night, the thing gone wrong — here it is, in a man who has not seen you yet, between you and the alley. You can take the time to bring the boxman through it with you, slow and careful and together, the way the deal says. Or you can go now, alone, fast, and leave the slower man to the dock and the dark and whatever the count-crew does to men it finds where you have been.',
      choices: [
        { id: 'c_cover', label: 'Bring the boxman through with you — slow, together.', destination: 'n_approach_car', effects: [{ field: 'time', op: 'add_minutes', value: '15' }] },
        { id: 'c_leave', label: 'Go now, alone — the boxman is too slow for this.', destination: 'n_leave', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_leave',
      title: 'Alone',
      type: 'scene',
      location: 'loading_dock',
      entryEffects: [
        { field: 'location', op: 'change_location', value: 'loading_dock' },
        { field: 'partner_status', op: 'set', value: 'gone' },
      ],
      body:
        'You go alone, and you go fast, low and quick along the dock’s edge while the man at the head of it is still working out what his ears told him, and you are past him and into the alley before the boxman has finished understanding what you decided.\n\n' +
        'You do not look back. Looking back is for men who can afford it. Behind you, in the concrete dark of the dock, the boxman is on the wrong side of a decision you made in the half-second the night gave you to make it, and that is his now, the particular weight of it, the same way the take is yours. Fifteen years, and it comes down to a corridor and a count of seconds and which of you could move faster. You carry that out into the alley with the rest of what you are carrying.',
      choices: [
        { id: 'c_leave_on', label: 'Into the alley.', destination: 'n_approach_car', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_approach_car',
      title: 'The Alley',
      type: 'scene',
      location: 'alley',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'alley' }],
      body:
        'The alley runs black and narrow toward the street, and somewhere down it, nosed in against a dead streetlight where you left it, is the car. This is the last of it. This is the stretch where men get caught who had the whole rest of it clean, because they hurried wrong or waited wrong or stood a half-second too long deciding.\n\n' +
        'The night is thinning at its edges. Not light yet — but the particular grey thinness that comes before light, the hour when the city’s own machinery starts to wake and the cover of the dark starts handing itself back. Whatever lead you have left, you spend the last of it here, getting to the car before the night decides it is finished with you.',
      choices: [
        { id: 'c_dash', label: 'Straight down the alley to the car.', destination: 'n_car', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_circle', label: 'Don’t trust the straight line — circle the block once and come at it clean.', destination: 'n_circle', effects: [{ field: 'time', op: 'add_minutes', value: '20' }] },
        { id: 'c_wait', label: 'Wait — let the alley settle before you commit to it.', destination: 'n_approach_car', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_circle',
      title: 'The Long Way',
      type: 'scene',
      location: 'alley',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'alley' }],
      body:
        'You don’t trust the straight line — the straight line is where they expect you — so you take the long way, around the block, hugging the dark, coming at the car from the side the night is quietest on.\n\n' +
        'It is the careful play, and careful costs what careful always costs: time, which is the one thing the thinning sky is taking from you faster now. Every doorway you ghost past is a doorway you are not yet in the car, and the grey at the edge of the world comes up another notch while you do the prudent thing. There is a version of tonight where this is the move that saves you, and a version where it is the move that finishes you, and you will not know which until you turn the last corner.',
      choices: [
        { id: 'c_circle_on', label: 'Around the last corner to the car.', destination: 'n_car', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_car',
      title: 'The Car',
      type: 'scene',
      location: 'getaway_car',
      // NOTE: does NOT set got_clear — the getaway is the DRIVE, not arriving here (F1 honesty).
      entryEffects: [{ field: 'location', op: 'change_location', value: 'getaway_car' }],
      body:
        'And there it is, nosed in against the dead streetlight exactly where you left it, cold and dark and dumb and the most beautiful thing you have ever seen. You get the door and get in and get the take down off your chest and your hands are doing the small familiar things, the key, the choke, the wheel, while some larger part of you is just saying the one word over and over: car, car, car.\n\n' +
        'This is the line. Everything up to here is just a building you were in. The moment the engine turns and the wheels move, you are a man driving away in the grey before dawn, and what kind of man that is — whole, or light, or alone — is the last thing the night is going to ask you, and it is going to ask it now.',
      choices: [
        { id: 'c_drive_clean', label: 'Drive — the take whole, the boxman beside you.', destination: 'n_end_clean', conditions: [{ field: 'partner_status', op: 'not_equals', value: 'gone' }, { field: 'loot', op: 'gte', value: '3' }], effects: [{ field: 'time', op: 'add_minutes', value: '5' }, { field: 'got_clear', op: 'set', value: 'true' }] },
        { id: 'c_drive_light', label: 'Drive — lighter than you wanted, but you’re both in.', destination: 'n_end_lighter', conditions: [{ field: 'partner_status', op: 'not_equals', value: 'gone' }, { field: 'loot', op: 'lt', value: '3' }], effects: [{ field: 'time', op: 'add_minutes', value: '5' }, { field: 'got_clear', op: 'set', value: 'true' }] },
        { id: 'c_drive_alone', label: 'Drive — the seat beside you empty.', destination: 'n_end_not_whole', conditions: [{ field: 'partner_status', op: 'equals', value: 'gone' }], effects: [{ field: 'time', op: 'add_minutes', value: '5' }, { field: 'got_clear', op: 'set', value: 'true' }] },
      ],
    },
    {
      id: 'n_end_clean',
      title: 'Clean Away',
      type: 'transition',
      location: 'getaway_car',
      endsWith: 'end_clean',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'getaway_car' }, { field: 'got_clear', op: 'set', value: 'true' }],
      body: 'The engine turns and the wheels bite and the dead streetlight slides away behind you, and the countinghouse with it, and the whole long arithmetical night.',
      choices: [],
    },
    {
      id: 'n_end_lighter',
      title: 'Away, Lighter',
      type: 'transition',
      location: 'getaway_car',
      endsWith: 'end_lighter',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'getaway_car' }, { field: 'got_clear', op: 'set', value: 'true' }],
      body: 'The engine turns and you pull away, the take lighter against your chest than it might have been, the boxman breathing beside you, the streetlight falling behind.',
      choices: [],
    },
    {
      id: 'n_end_not_whole',
      title: 'Out, Not Whole',
      type: 'transition',
      location: 'getaway_car',
      endsWith: 'end_not_whole',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'getaway_car' }, { field: 'got_clear', op: 'set', value: 'true' }],
      body: 'The engine turns and you drive, the seat beside you empty, the streetlight and the dock and the man you left behind it all sliding back into the grey.',
      choices: [],
    },
  ],
  endings: [
    {
      id: 'end_outfit',
      name: "The Outfit's Math",
      summary: 'The Lead hit zero — the margin gone, and you in their building. The outfit takes you.',
      priority: 2,
      conditions: [{ field: 'lead_blown', op: 'is_true' }],
      body:
        'It is not personal, and that is the worst of it. The outfit does the sum the way it does every sum — what was taken, what it costs to take it back, what the difference buys in the way of a message — and you are a line in the ledger now, a number carried from one column to another in a room that smells of cold coffee and other people’s money.\n\n' +
        'There is no speech. Men who are good with numbers do not make speeches. Somewhere out in the night the boxman is running, or is not; the building has stopped being your problem and become arithmetic, and arithmetic does not hurry and does not miss. The margin you spent the whole night buying back, minute by minute, is spent. The lead is gone.\n\n' +
        'They have you, and they have all the time the books allow — which is exactly as much as they need, and not one minute more.',
    },
    {
      id: 'end_clean',
      name: 'Clean Away',
      summary: 'Out, the take whole, the boxman beside you — rattled, breathing, alive.',
      priority: 0,
      conditions: [{ field: 'got_clear', op: 'is_true' }, { field: 'partner_status', op: 'not_equals', value: 'gone' }, { field: 'loot', op: 'gte', value: '3' }],
      body:
        'You drive. Not fast — fast is how you get noticed — just steady, a man and his friend in a cold car in the grey before dawn, going nowhere in particular at a sensible speed, with the outfit’s entire week in bags on the back seat.\n\n' +
        'The boxman is shaking, a little, the fine constant tremor of a man who has just spent everything he had. He is not steady. He will not be steady for a while; the count-crew on the stairs put something into him tonight that does not come straight back out. But he is here, in the seat beside you, whole, breathing, alive, and his hand when it finds yours on the gearstick grips hard and says the thing neither of you will ever say out loud. You went in together. You came out together. The take is the whole take.\n\n' +
        'Behind you the countinghouse goes on being a laundry with the lights off, and the city wakes up around the fact of what is gone from it, and you drive into the grey having done a thing that men will tell wrong in club rooms for thirty years. Whole. The both of you. Tonight, that is everything there is.',
    },
    {
      id: 'end_lighter',
      name: 'Away, Lighter',
      summary: 'Out together — but you left some of it in the box to do it.',
      priority: 0,
      conditions: [{ field: 'got_clear', op: 'is_true' }, { field: 'partner_status', op: 'not_equals', value: 'gone' }, { field: 'loot', op: 'lt', value: '3' }],
      body:
        'You drive, and the bags on the back seat are lighter than they might have been, and you find you do not much care.\n\n' +
        'There was more in the box. There is always more in the box; that is the whole trap of the work, the way it tells you to stay one more minute, take one more bundle, and one of those minutes is always the one that kills you. You did not take it. You took what you took and you got the both of you to the car, and the boxman is beside you, rattled and grey and grinning anyway, and the math of the night came out on the right side of the only line that finally matters, which is the one with the two of you alive on it.\n\n' +
        'The grey comes up over the city and you drive into it, lighter than you wanted and out, and out is the word you keep coming back to. Out. Together. The rest is just money.',
    },
    {
      id: 'end_not_whole',
      name: 'Out, Not Whole',
      summary: 'You made the car. The boxman did not.',
      priority: 0,
      conditions: [{ field: 'got_clear', op: 'is_true' }, { field: 'partner_status', op: 'equals', value: 'gone' }],
      body:
        'You drive, and the seat beside you is empty, and it stays empty all the long grey way out of the city, and you keep not looking at it the way you kept not looking back at the dock.\n\n' +
        'You made it. That is the fact, and it is a real one, and you hold onto it because some of the other facts of the night are heavier and you are too far from anywhere safe to put them down yet. The take is on the back seat. You got out clean, by the only measure the outfit keeps. By the other measure — the fifteen-year one, the one that says you do not leave each other in the building — you did not get out at all, and you will be a long time understanding which measure you are going to have to live by now.\n\n' +
        'There will be a reckoning, later, of what happened on the dock, and who could have moved faster, and whether the half-second was real. Not tonight. Tonight there is only the grey road and the empty seat and the particular arithmetic of a man who came out alone, carrying everything, and the one thing he wanted to keep.',
    },
    {
      // Out-of-time: distinct from the structural default. Empty conditions (fires via the deadline path only).
      id: 'end_dawn',
      name: 'Dawn',
      summary: 'The night ran out before you cleared. The grey comes up and the city wakes around you.',
      conditions: [],
      body:
        'The grey wins. It does not come for you the way the outfit would, or the cops; it just comes, the way morning always comes, indifferent and on time, the thin light filling in the alley and the dock and the street until there is nowhere left that the dark was hiding you.\n\n' +
        'You spent the night, every minute of it, and the night is spent, and you are still here — short of the car, or sitting in it not yet moving, or somewhere in the body of the building still doing the careful prudent thing — when the city opens its eyes. A delivery truck. A man with keys. A black-and-white on its slow morning loop, and a cop in it who looks twice at a parked car with two men low in the seats and a great many bags on the back.\n\n' +
        'It was never the outfit you most had to beat. It was the clock, the plain turning of the night toward day, and the clock does not chase and does not hurry and does not miss. The clock just runs out. Yours has.',
    },
    {
      // Structural catch-all (the mandatory isDefault). Unreachable in the slice; kept deliberately NEUTRAL
      // so it never advertises an outcome the player cannot reach (a live "cornered inside" branch is deferred).
      id: 'end_still_inside',
      name: 'Still Inside',
      summary: 'The night closed and you never made the getaway.',
      isDefault: true,
      conditions: [],
      body:
        'However it came to this — wherever the night caught you, still inside the thing you came to rob — you did not make the getaway. The building kept you. The rest is for other people to piece together later, from what they find, and to tell however they tell it.',
    },
  ],
};
