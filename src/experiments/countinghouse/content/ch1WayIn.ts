import type { Story } from '../../../engine';

/**
 * The Countinghouse — Chapter 1: "The Way In" (`ch1_wayin`).
 *
 * Phases 1-3 of the heist spine: the Way In hub (case + entry route + kit) -> the route-exclusive Floor
 * (quiet inside job vs the fast loud way) -> the Box (crack + the counted take) -> the gone-sideways turn
 * (the count-crew comes back early). Non-game-ending: one default ending that the container transitions to
 * ch2 ("The Way Out").
 *
 * FIRST CONTENT to exercise two v1.4 capabilities:
 *  - counted inventory: `charges` (has_item-gated `c_blow`, spent via decrement) + the counted take `loot`
 *    (the distinct-node grab CHAIN n_grab1->n_grab2->n_grab3, gated >=3 at the finale).
 *  - adjust_resource: THE LEAD — a time-driven survival resource a choice can RAISE (casing buys margin;
 *    cutting the relay buys margin) or a loud entry COSTS. Here atZero only sets `lead_blown` (the death
 *    resolves in ch2, a game-ending chapter); mirrors the cave's ch1 lamp (flag-only atZero).
 *
 * CALIBRATION (see the plan's self-loop/maxTime rule): the take is a CHAIN of distinct nodes, not a
 * repeatable self-loop, so it lengthens the linter's longest SIMPLE path and the clock can bite. Window 70
 * (23:00->24:10): the full-take careful win (~60) clears; the slow `c_work` full-take path (~75) crosses the
 * deadline (resolving end_ch1_out early — ch1 has no lose-state, so that is fine).
 */
export const ch1WayIn: Story = {
  id: 'ch1_wayin',
  title: 'The Way In',
  startNodeId: 'n_street',
  startTime: '23:00',
  deadline: '24:10', // window 70; absolute minutes past midnight for the after-midnight literal
  startLocation: 'street',
  variables: [
    { name: 'entry_route', type: 'string', default: 'quiet', purpose: "The Floor fork: 'quiet' | 'loud'. Carried; gates content." },
    { name: 'partner_status', type: 'string', default: 'steady', purpose: "The boxman: 'steady'|'frayed'|'hurt'|'gone'. Carries across chapters; domain-checked; gates endings." },
    { name: 'made_clean', type: 'boolean', default: false, purpose: 'Latching: worked the floor without tripping the alarm. Mutex with alarm_tripped.' },
    { name: 'alarm_tripped', type: 'boolean', default: false, purpose: 'Latching: the alarm went. Mutex with made_clean.' },
    { name: 'lead_blown', type: 'boolean', default: false, purpose: 'Latching, paired with The Lead at zero. The Outfit ending (ch2) requires it.' },
    // Counted inventory — items are number vars tagged kind:'item'.
    { name: 'charges', type: 'number', kind: 'item', default: 1, min: 0, max: 2, label: 'Charges', purpose: 'breaching charges for the box' },
    { name: 'loot', type: 'number', kind: 'item', default: 0, min: 0, max: 4, label: 'The Take', purpose: 'bundles of cash from the box; how much you grab trades against time' },
  ],
  locations: [
    { id: 'street', name: 'The Street' },
    { id: 'service_door', name: 'The Service Door' },
    { id: 'count_floor', name: 'The Counting Floor' },
    { id: 'safe_room', name: 'The Box Room' },
    { id: 'stairwell', name: 'The Stairwell' },
  ],
  resources: [
    // THE LEAD — your head start on the heat. Time-driven (falls); raised/spent only via adjust_resource.
    // atZero sets the flag ONLY in ch1 (non-game-ending); the death itself resolves in ch2.
    { id: 'lead', label: 'Lead', min: 0, max: 60, start: 40, depletion: { everyMinutes: 10, amount: 5 }, atZero: { setFlag: 'lead_blown' } },
  ],
  events: [],
  nodes: [
    // ===== PHASE 1 — THE WAY IN =====
    {
      id: 'n_street',
      title: 'The Street',
      type: 'scene',
      location: 'street',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'street' }],
      body:
        "The countinghouse keeps bankers' hours in a building that doesn't. From across the street it is a laundry with the lights off and a second floor that never quite goes dark — a slot of yellow at the edge of a drawn blind, and behind the blind the outfit's money getting counted into the small hours by men who are good with numbers and nothing else. It is {{time}}.\n\n" +
        'The boxman is in the car beside you with his hands in his lap, not smoking, because he gave it up the way he gives everything up: all at once and for good. "Two ways in," he says, not a question. You have looked at both for a month. The quiet way is the service door and a long patient hour of nobody noticing. The loud way is faster, and fast does not forgive.\n\n' +
        'You watch the slot of yellow light and you do the arithmetic one more time, the way you always do, because the arithmetic is the job and the rest is just nerve. There is time, if you want it, to sit on the place a while longer and learn how the night moves before you walk into it.',
      choices: [
        { id: 'c_case', label: 'Sit on the place — learn the patrol and the count-crew before you move.', destination: 'n_case', effects: [{ field: 'time', op: 'add_minutes', value: '10' }, { field: 'lead', op: 'adjust_resource', value: '15' }] },
        { id: 'c_approach', label: 'Enough watching. Cross to the building.', destination: 'n_approach', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_case',
      title: 'Sitting on the Place',
      type: 'discovery',
      location: 'street',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'street' }],
      body:
        'You sit on the place the way the old hands taught you, low in the seat, eyes soft, letting the night show you its shape instead of going looking for it.\n\n' +
        'And it shows you. A prowl car that comes by on a slow loop and the size of the gap it leaves behind it. The count-crew on the second floor, four of them, the rhythm of their cigarettes at the window. The beat cop who tries the laundry door at the quarter-hour out of nothing but habit, and the long dead stretch after he has done it. None of it is a way in by itself. All of it together is a map of the minutes — where the night looks away, and for how long, and how much of a head start a careful man can steal out of the spaces between other men paying attention.\n\n' +
        'The boxman watches you watch. "You got it?" he says. You have it. You always get it; getting it is the part you are good at. The margin is there to be taken, and you take it, and tuck it away against the hour when you will need it.',
      choices: [
        { id: 'c_case_on', label: 'You have the night’s shape. Cross to the building.', destination: 'n_approach', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_approach',
      title: 'The Service Door',
      type: 'scene',
      location: 'service_door',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'service_door' }],
      body:
        'You cross the street in the dead stretch and put your back to the brick beside the service door, and the boxman comes after you soft-footed for a big man, his kit slung close.\n\n' +
        'Here is where the night forks, and you both know it without saying. The service door gives onto a stair and a quiet hour of working the building the way it wants to be worked — slow, unseen, the alarm left sleeping. Or there is the freight shutter around the side, which gives quick and gives loud, and once you have gone loud the building knows you are in it and the clock starts running a different, meaner kind of time.\n\n' +
        'The boxman flexes his hands against the cold. He will go whichever way you call. That is the deal between you, fifteen years old and never once said out loud: you do the arithmetic, he opens the box, and neither of you leaves without the other.',
      choices: [
        { id: 'c_quiet', label: 'The service door. Quiet, slow, the alarm left sleeping.', destination: 'n_floor_quiet', effects: [{ field: 'time', op: 'add_minutes', value: '10' }, { field: 'entry_route', op: 'set', value: 'quiet' }] },
        { id: 'c_loud', label: 'The freight shutter. Fast and loud — take the building before it wakes.', destination: 'n_floor_loud', effects: [{ field: 'time', op: 'add_minutes', value: '5' }, { field: 'entry_route', op: 'set', value: 'loud' }] },
      ],
    },
    // ===== PHASE 2 — THE FLOOR (route-exclusive) =====
    {
      id: 'n_floor_quiet',
      title: 'The Counting Floor — Quiet',
      type: 'scene',
      location: 'count_floor',
      entryEffects: [
        { field: 'location', op: 'change_location', value: 'count_floor' },
        { field: 'made_clean', op: 'set', value: 'true' },
        { field: 'lead', op: 'adjust_resource', value: '10' }, // cutting the relay buys margin
      ],
      body:
        'The service door gives to the boxman in under a minute, the way you knew it would, and you go up the back stair into the smell of the place — old paper, cold coffee, the particular dust of money that has been handled too much.\n\n' +
        'The alarm box is where the plans said it would be, and the boxman opens it and lifts the relay out of its seat with two fingers and a steadiness you have never once seen him lose, and just like that the building is asleep and does not know it. No bell. No call downtown. Whatever happens on this floor now happens in private, between you and the count-crew above and the time you have bought yourselves by being quiet.\n\n' +
        'You let out a breath you did not know you were holding. Clean. The hard way, the patient way, the way that leaves you the most room. Ahead, past the long tables and their banded stacks, is the door to the box room.',
      choices: [
        { id: 'c_quiet_on', label: 'On to the box room.', destination: 'n_box', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
      ],
    },
    {
      id: 'n_floor_loud',
      title: 'The Counting Floor — Loud',
      type: 'scene',
      location: 'count_floor',
      entryEffects: [
        { field: 'location', op: 'change_location', value: 'count_floor' },
        { field: 'alarm_tripped', op: 'set', value: 'true' },
        { field: 'lead', op: 'adjust_resource', value: '-12' }, // the building wakes; you are already behind
      ],
      body:
        'The freight shutter comes up loud, a long iron complaint that no amount of grease was ever going to soften, and somewhere in the wall a contact you did not have time to find closes a circuit, and the building wakes.\n\n' +
        'There is no bell on the floor — the bell is downtown, on a desk, where a bored man is sitting up straighter now and reaching for a phone. You feel the change in the air the way you feel weather coming. You are in, fast, the way you wanted; but the building knows you are in it now, and the count-crew above has heard the shutter, and the long patient hour you might have had is gone before it started. From here it is a race, and you started it a step behind.\n\n' +
        'The boxman is already moving, kit out, no time spent on regret. The box room is ahead, past the tables. Whatever you take, you take fast.',
      choices: [
        { id: 'c_loud_on', label: 'Onto the floor — the building’s waking.', destination: 'n_floor_loud_react', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_floor_loud_react',
      title: 'The Building Wakes',
      type: 'scene',
      location: 'count_floor',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'count_floor' }],
      body:
        'You are three steps onto the floor when the building stops pretending. A light comes on somewhere it should not, and overhead the count-crew’s slow even tread changes — a chair shoved back, a voice gone sharp, the particular quickening of men who have just understood that the noise was not nothing. The alarm did that. The alarm you traded the quiet hour for.\n\n' +
        'The boxman has his head cocked, reading the ceiling the way he reads a lock. "They’re coming down," he says, flat, not afraid, just stating the arithmetic. He is right; you can hear it starting, weight on the stair above. You have seconds, not minutes, and two ways to spend them: straight at the box and damn the margin, or a half-minute on the alarm relay you passed on the way in — cut it late, buy back a corner of the night, and gamble the seconds it costs.',
      choices: [
        { id: 'c_charge', label: 'Straight at the box — damn the margin.', destination: 'n_box', effects: [{ field: 'time', op: 'add_minutes', value: '5' }, { field: 'lead', op: 'adjust_resource', value: '-8' }] },
        { id: 'c_relay_late', label: 'Kill the relay late — buy back a corner of the night.', destination: 'n_floor_relay', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
      ],
    },
    {
      id: 'n_floor_relay',
      title: 'The Relay, Late',
      type: 'scene',
      location: 'count_floor',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'count_floor' }],
      body:
        'You go for the relay box on the wall by the stair-head, where you marked it on the way in and did not have the time to do it right. You do it wrong now, fast, the boxman’s light on the wires and your hands working ahead of your thinking, and the contact comes out of its seat with a small dead click that is the most expensive quiet you have ever bought.\n\n' +
        'It does not call the alarm back — downtown already has it, the bored man already has his phone — but it kills the bell that was about to start screaming on this floor, and it buys you a corner of the margin back, a thin grey edge of head start you did not have a breath ago. The count-crew is on the stair. You spent the seconds. Now you had better be worth them.',
      choices: [
        { id: 'c_relay_on', label: 'Relay’s dead — into the box room.', destination: 'n_box', effects: [{ field: 'time', op: 'add_minutes', value: '5' }, { field: 'lead', op: 'adjust_resource', value: '24' }] },
      ],
    },
    // ===== PHASE 3 — THE BOX =====
    {
      id: 'n_box',
      title: 'The Box',
      type: 'scene',
      location: 'safe_room',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'safe_room' }],
      body:
        'The box is an old Mosler the size of a wardrobe, sunk into the back wall of a windowless room, and it is the reason there are two of you and not one.\n\n' +
        'The boxman stands in front of it the way some men stand in front of a painting, reading it, his head tilted, his bare hands flat against the cold steel of the door. "She’s a good one," he says, almost fond. There are two ways through her, and they cost different currencies. He can work her — the dial, the long patient listening, the feel of the wheels dropping into line — and that costs time, which is the one thing the night keeps taking from you. Or you can put a charge to the hinge and open her the fast way, which costs a charge, and you are carrying only what you are carrying.',
      choices: [
        { id: 'c_blow', label: 'Blow the hinge — spend a charge, open her fast.', destination: 'n_grab1', conditions: [{ field: 'charges', op: 'has_item' }], effects: [{ field: 'time', op: 'add_minutes', value: '5' }, { field: 'charges', op: 'decrement', value: '1' }] },
        { id: 'c_work', label: 'Let the boxman work her — slow, silent, no charge spent.', destination: 'n_grab1', effects: [{ field: 'time', op: 'add_minutes', value: '20' }] },
      ],
    },
    {
      id: 'n_grab1',
      title: 'The Take',
      type: 'scene',
      location: 'safe_room',
      entryEffects: [
        { field: 'location', op: 'change_location', value: 'safe_room' },
        { field: 'loot', op: 'increment', value: '1' },
      ],
      body:
        'The door swings and the inside of her is exactly what a month of arithmetic promised: the outfit’s week, banded and stacked and smelling of other people’s hands, more of it than two men can carry and a great deal more than two men can carry fast.\n\n' +
        'You take the first bundle and put it away, and your heart does the thing it always does, the lift and the warning both at once. Every bundle after the first is the same arithmetic running the other way now: more take, less night. The boxman has his eyes on the door and his hands open. "How much," he says, not really a question, "is enough." You have never once known the answer to that. It is the whole problem of the work, in five words.',
      choices: [
        { id: 'c_more1', label: 'Not yet — take more.', destination: 'n_grab2', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
        { id: 'c_enough1', label: 'Enough. Pocket it and move.', destination: 'n_turn', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_grab2',
      title: 'More',
      type: 'scene',
      location: 'safe_room',
      entryEffects: [
        { field: 'location', op: 'change_location', value: 'safe_room' },
        { field: 'loot', op: 'increment', value: '1' },
      ],
      body:
        'You take more. Of course you take more. The second armful goes against your chest under your coat and the weight of it is a good weight, the weight of the thing being worth it, the weight of not having come all this way for a taste.\n\n' +
        'But the room is louder now in the way a room gets when you have been in it too long — the building settling, a pipe somewhere, the count-crew’s floor creaking overhead as men move around up there not yet sure what they heard. The boxman shifts his weight. He will not say the word. Saying the word is your job, and he is waiting on you to do it, the way he has waited fifteen years.',
      choices: [
        { id: 'c_more2', label: 'The whole till — clean her out.', destination: 'n_grab3', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
        { id: 'c_enough2', label: 'That’s the number. Move.', destination: 'n_turn', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_grab3',
      title: 'The Whole Till',
      type: 'scene',
      location: 'safe_room',
      entryEffects: [
        { field: 'location', op: 'change_location', value: 'safe_room' },
        { field: 'loot', op: 'increment', value: '1' },
      ],
      body:
        'You clean her out. The last of it, the back of the box, the bands at the bottom that nobody bothers to count because nobody was ever supposed to get this far — all of it, into the bags, until the Mosler is a cold empty room with the door hanging open and you are carrying the outfit’s entire week on your two backs.\n\n' +
        'It is the whole take. It is everything you came for and more than you let yourself plan for, and it is heavy, in the hand and in the chest both. The boxman straightens up with the last bag and looks at you and for half a second there is nothing on his face but the old grin, the one from before either of you knew better. "Greedy," he says, and means it as the highest praise there is.',
      choices: [
        { id: 'c_done', label: 'Everything. Now get out.', destination: 'n_turn', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    // ===== THE GONE-SIDEWAYS TURN =====
    {
      id: 'n_turn',
      title: 'Early',
      type: 'event',
      location: 'safe_room',
      entryEffects: [
        { field: 'location', op: 'change_location', value: 'safe_room' },
        { field: 'partner_status', op: 'set', value: 'frayed' },
        { field: 'clues', op: 'add_clue', value: 'clue_crew_early' },
      ],
      body:
        'You hear them before you understand them — the stairs taking weight, more than one man, the unhurried certainty of people who belong here and have just stopped belonging to the part of the night that does not know you are in it.\n\n' +
        'The count-crew. The alarm called them, or they only came back early — nobody comes back early in this business, and yet here they are either way — and it makes no difference now, with the box open and the take in your hands and the one door you want the one their footsteps are making for. The boxman has gone the grey of old putty. "They’re on the stair," he says, to you, to the room, to the arithmetic that just stopped being true.\n\n' +
        'It does not matter now what was supposed to happen. What matters is the stairs, and the count of them, and how few are left.',
      choices: [
        { id: 'c_run', label: 'The back stair — go, now, before they top the landing.', destination: 'n_commit', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_commit',
      title: 'The Back Stair',
      type: 'transition',
      location: 'stairwell',
      resolvesEnding: true,
      entryEffects: [{ field: 'location', op: 'change_location', value: 'stairwell' }],
      body:
        'You go for the back stair with the take against your chest and the boxman’s breath loud behind you, and the count-crew’s voices turning puzzled and then hard in the room you just left.\n\n' +
        'The stairwell drops away into the cold dark below, down toward the lot and the car and whatever the rest of the night has decided to be. You are out of the count-room. That much is done, one way or the other. What you carry, you carry; what is ahead is the getting clear, and the night has not yet said whether it will let you.',
      choices: [],
    },
  ],
  endings: [
    {
      // Neutral by design: a deadline-cross can resolve this at loot 0, so it must NOT assert "you have the take".
      id: 'end_ch1_out',
      name: 'Out of the Count-Room',
      summary: 'You are clear of the count-room, the night not yet decided.',
      isDefault: true,
      conditions: [],
    },
  ],
};
