import type { Story } from '../../../engine';

/**
 * The Sump Line — Chapter 2A: "The Dry High Traverse" (`ch2_high`) — EXPANDED to an evening (~19 beats).
 * A game-ending branch chapter (reached when ch1 set cave_route='high'). Antagonist: cold + the dying lamp
 * across a long exposed ascent; a second flood pulse can still cut the oxbow bypass and take the companion.
 *
 * Authored to the Branch-and-Bottleneck method (docs/authoring-method.md):
 *  - Spine of forced beats: the dry ascent -> the oxbow + second pulse (the companion decision) -> Crystal
 *    Hall (the final-climb decision) -> the daylight shaft (resolves). Rejoining detours (forward-merges +
 *    a handful of loop-backs) hang off the hubs; over-wandering lets the clock resolve the muted/grey end.
 *  - Carry-in: companion_status, cave_all_together / cave_someone_lost / cave_dark_out / cave_hypothermic,
 *    and the rebased lamp/heat. Output: terminal game endings (no carry-out).
 *  - EE-4: the absent pulse sets no loss (crossing ahead loses no one); the loss is the explicit cross-alone
 *    choice or carried from ch1. Endings hedge companion presence unless a latch guarantees it.
 *
 * Calibration (F7): lamp 5/22min — with ch1 delivering the lamp at ~30, the efficient clean route survives
 * on a thin margin (daylight) while the long/explored route dies in the dark; ch1's rate is left untouched.
 * Event retimed to 15:30 for the longer journey so both pulse branches stay reachable (slow caught present,
 * fast crossed absent). end_daylight_all_three (needs carried togetherness) and end_dark_high (needs a
 * carried-low lamp) are CARRY-ONLY — expected standalone-walk orphans (F4).
 */
export const ch2High: Story = {
  id: 'ch2_high',
  title: 'The Dry High Traverse',
  startNodeId: 'n_h_start',
  startTime: '14:30',
  deadline: '16:50', // window 140 == the longest static path
  startLocation: 'high_rift',
  variables: [
    { name: 'companion_status', type: 'string', default: 'with_you', purpose: "Rolly's carried state: 'with_you' | 'hurt' | 'lost'. Gates content and endings." },
    { name: 'cave_someone_lost', type: 'boolean', default: false, purpose: 'Latching: the companion is lost. Required by the pyrrhic ending.' },
    { name: 'cave_all_together', type: 'boolean', default: false, purpose: 'Latching (carried from ch1): kept Rolly with you. Required by the clean ending.' },
    { name: 'cave_dark_out', type: 'boolean', default: false, purpose: 'Latching, paired with lamp at-zero. Required by the dark ending.' },
    { name: 'cave_hypothermic', type: 'boolean', default: false, purpose: 'Latching, paired with body_heat at-zero. Blocks the clean ending; colours others.' },
    { name: 'cave_climbed_out', type: 'boolean', default: false, purpose: 'Latching: you climbed the exit shaft into daylight. Set only at n_climb; the surfacing endings require it so a deadline-cross below cannot claim the surface (F1/H4).' },
  ],
  locations: [
    { id: 'high_rift', name: 'The Aven Rift' },
    { id: 'upper_gallery', name: 'The Upper Gallery' },
    { id: 'oxbow', name: 'The Oxbow Bypass' },
    { id: 'crystal_hall', name: 'Crystal Hall' },
    { id: 'daylight_shaft', name: 'The Daylight Shaft' },
  ],
  resources: [
    { id: 'lamp_charge', label: 'Lamp', min: 0, max: 100, start: 60, depletion: { everyMinutes: 22, amount: 5 }, atZero: { ending: 'end_dark_high', setFlag: 'cave_dark_out' } }, // standalone start 60; container rebases to carried value
    { id: 'body_heat', label: 'Warmth', min: 0, max: 100, start: 100, depletion: { everyMinutes: 30, amount: 5 }, atZero: { setFlag: 'cave_hypothermic' } },
    { id: 'rope_pitches', label: 'Rope', min: 0, max: 2, start: 2 },
  ],
  events: [
    {
      id: 'ev_second_pulse',
      title: 'The Bypass Goes Under',
      trigger: [{ field: 'time', op: 'time_after', value: '15:30' }],
      eventLocation: 'oxbow',
      ifPresentNode: 'n_pulse_present',
      ifAbsentEffects: [{ field: 'clues', op: 'add_clue', value: 'clue_pulse_cutoff' }],
      recoveryNodeId: 'n_after_oxbow',
    },
  ],
  nodes: [
    // ===== ACT 1 — THE DRY ASCENT =====
    {
      id: 'n_h_start',
      title: 'The Aven Rift',
      type: 'scene',
      location: 'high_rift',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'high_rift' }],
      body:
        'Over the choke the air goes dry and the cold changes its character. Down in the streamway the cold was wet and loud. Up here it is silent and patient, and it gets into the bone.\n\n' +
        'You stand at the foot of the aven rift, a tall blade of darkness climbing away above your lamp’s reach. Your breath fogs and hangs. The water is behind you now, a sound dropped to a distant rumour somewhere below the floor. It is {{time}}, though up here that means nothing — there is no light to tell it by but the small white coin on your helmet, and that coin is smaller than it was at the pitch head. The battery has given the morning to the dark already. It will give the rest.\n\n' +
        'You flex your fingers. The cold has started to make them stupid, slow on the rock, and you have a long dry climb ahead before there is any chance of grey sky. The rift goes up. You can free-climb it fast and spend the warmth you have, or rig it slow and safe and spend the light instead.',
      choices: [
        { id: 'c_freeclimb', label: 'Free-climb the rift fast — spend the warmth, save the light.', destination: 'n_aven', effects: [{ field: 'time', op: 'add_minutes', value: '15' }] },
        { id: 'c_rig', label: 'Rig a protected line — slower and safer, but the lamp burns.', destination: 'n_aven', effects: [{ field: 'time', op: 'add_minutes', value: '25' }, { field: 'rope_pitches', op: 'decrement', value: '1' }] },
        { id: 'c_hs_breath', label: 'Stand a moment and get your breath against the cold.', destination: 'n_hs_breath', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_hs_breath',
      title: 'Catching Breath',
      type: 'scene',
      location: 'high_rift',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'high_rift' }],
      body:
        'You stop at the foot of the rift and breathe, hands cupped over your mouth, and let your heart come down a little.\n\n' +
        'It is a mistake, in a way — standing still is the cold getting its hands into you, and the lamp burns whether you climb or not. But there is a thing you have learned in twenty years underground, which is that fear climbs badly. Better to spend a minute now putting it down than to carry it up the rift in your arms. You look up into the dark the rift climbs into, where your light cannot reach, and you decide, the way you always decide, to go anyway.',
      choices: [
        { id: 'c_breath_on', label: 'On to the climb.', destination: 'n_h_start', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_aven',
      title: 'Climbing the Aven',
      type: 'scene',
      location: 'high_rift',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'high_rift' }],
      body:
        'The aven goes up in a series of awkward chimneys and ledges, and you go up it the slow hard way, bridging cold rock with cold limbs, the lamp throwing your shadow reeling on the walls above you.\n\n' +
        'It is the kind of climbing that is all attention — a hand here, a foot there, the weight tested before it is trusted — and there is a mercy in that, because attention crowds out everything else, the cold and the hour and the long way still to go. You climb up out of the reach of the streamway’s last rumour into a stiller, older silence, and the dark comes up the rift behind you, patient as ever, taking back the rock the moment your light leaves it.',
      choices: [
        { id: 'c_aven_on', label: 'Up over the lip of the aven into the upper system.', destination: 'n_pitch_dark', effects: [{ field: 'time', op: 'add_minutes', value: '15' }] },
        { id: 'c_hs_rolly', label: 'Check on Rolly on the ledge below.', destination: 'n_hs_rolly', conditions: [{ field: 'companion_status', op: 'equals', value: 'with_you' }], effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_hs_rolly',
      title: 'Rolly on the Ledge',
      type: 'conversation',
      location: 'high_rift',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'high_rift' }],
      body:
        'You climb back down a body-length to where Rolly is wedged on a ledge, working up the rift behind you on one good leg and a great deal of stubbornness.\n\n' +
        '"I’m fine," Rolly says, before you can ask, which is how you know it is costing. The splinted ankle is held up off the rock, useless; the climbing is all arms now, and arms tire. But the eyes are clear and the voice is steady and the grip, when you take a hand to help over the awkward move, is still strong. "Stop fussing," Rolly says. "Get up there and find us a way out. I’ll be right behind you." You believe it, mostly, and the mostly is enough to climb on.',
      choices: [
        { id: 'c_rolly_on', label: 'Climb on, Rolly behind you.', destination: 'n_aven', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_pitch_dark',
      title: 'Into the Upper Dark',
      type: 'scene',
      location: 'high_rift',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'high_rift' }],
      body:
        'Over the lip of the aven the passage levels and the lamp shows you less than it did.\n\n' +
        'You notice it the way you notice the light going at the end of a winter afternoon — not a moment, but a slow subtraction. The disc on the rock is smaller, yellower, the dark crowding nearer its rim. You hold a hand up and can just see it; an hour ago you could have read by this. The battery is tiring, and there is no charging it, no spare in the bag deep enough to matter, only the slow certainty that at some point up ahead the light will become a memory of light and then nothing, and you would very much like to be standing in daylight when that happens.',
      choices: [
        { id: 'c_pitch_on', label: 'Press on into the upper gallery.', destination: 'n_upper', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
      ],
    },
    {
      id: 'n_upper',
      title: 'The Upper Gallery',
      type: 'scene',
      location: 'upper_gallery',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'upper_gallery' }],
      body:
        'The upper gallery is a wide dry passage of old dead air, the kind the water has not touched in a very long time, and after the streamway it feels almost like a corridor in some abandoned building under the hill.\n\n' +
        'Your boots are loud on the dry floor. The way on lies ahead toward the oxbow — the bridge of stone over the void that the route out depends on — and you can take the broad safe floor of the gallery, or save minutes on a narrow exposed traverse along a ledge above it, if your nerve and the cold in your hands are up to it. Off to one side a smaller gallery branches away into the dark, hung with old formations, going nowhere you need to go.',
      choices: [
        { id: 'c_to_oxbow', label: 'Take the broad gallery floor to the oxbow.', destination: 'n_oxbow', effects: [{ field: 'time', op: 'add_minutes', value: '15' }] },
        { id: 'c_hs_traverse', label: 'Save time on the exposed ledge traverse.', destination: 'n_oxbow', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_hs_gallery', label: 'Look into the side gallery and its formations.', destination: 'n_hs_gallery', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_hs_gallery',
      title: 'The Side Gallery',
      type: 'discovery',
      location: 'upper_gallery',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'upper_gallery' }],
      body:
        'You turn aside into the smaller gallery, and for a moment forget the hour and the cold in the plain old wonder of the place.\n\n' +
        'Straws hang from the roof in their hundreds, white and fragile, each one grown a few inches over centuries you cannot imagine. Curtains of flowstone fold down the walls like frozen weather. A cluster of helictites twists out sideways against all sense of which way is down. No one comes here; it is too far in, off the through-route, and it has been doing this slow patient beautiful thing in the absolute dark for longer than there have been eyes to mind that no one is watching. You stand in it a moment, your shrinking light moving over the formations, and then you turn back to the business of getting out, because the cave will still be making this long after you are not.',
      choices: [
        { id: 'c_gallery_on', label: 'Back to the through-route and the oxbow.', destination: 'n_upper', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    // ===== ACT 2 — THE OXBOW & THE SECOND PULSE =====
    {
      id: 'n_oxbow',
      title: 'The Oxbow Bypass',
      type: 'event',
      location: 'oxbow',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'oxbow' }],
      body:
        'The gallery narrows to the oxbow: a dry abandoned meander of the old streamway, a ribbon of stone bridging a black void. Far below, down in the gulf the bypass spans, you can hear water moving — a deep, patient sound — but your lamp cannot reach it and you cannot see it. There is only the dry span ahead and the dark on either hand.\n\n' +
        'You stand at the near end of it, the void breathing cold up at you, the lamp laying its shrinking disc on the rock a few feet out. Across the span is Crystal Hall and the last shaft and the way to the surface. The cave is in no hurry. You are.',
      choices: [
        { id: 'c_cross', label: 'Cross the bypass to the far side.', destination: 'n_after_oxbow', effects: [{ field: 'time', op: 'add_minutes', value: '20' }] },
        { id: 'c_hs_void', label: 'Look down into the void a moment first.', destination: 'n_hs_void', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_hs_void',
      title: 'The Void Below',
      type: 'scene',
      location: 'oxbow',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'oxbow' }],
      body:
        'You lean out over the edge of the span and turn your light down into the void, and the light finds nothing — it falls a little way down the wet black walls and then gives up, swallowed, and below it there is only the sound.\n\n' +
        'It is the streamway down there, the same water you climbed up out of, running through the deep dark of the system on its way to the sump and the sea, and it is louder than it should be, fuller, a great fat patient rushing that you feel in the rock under your hands as much as hear. The whole hill is draining through the dark beneath you. You pull back from the edge. Some part of the animal in you does not like having stood over that, with that much water moving in the black, and the animal in you is not always wrong.',
      choices: [
        { id: 'c_void_on', label: 'Back from the edge — cross the bypass.', destination: 'n_oxbow', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_pulse_present',
      title: 'The Bypass Goes Under',
      type: 'event',
      location: 'oxbow',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'oxbow' }],
      body:
        'You are out on the oxbow bypass, mid-span over the void, when the roar climbs up to meet you.\n\n' +
        'It comes from below — from the black gulf the bypass bridges, the place where you could hear water but not see it. A second pulse, surging up the system from the drowned streamway, coming fast. The sound rises through the rock and through the soles of your boots and then the water itself is there, a brown lip clawing over the abandoned meander, taking the dry floor you are standing on and making it a river.\n\n' +
        'The cold of it hits before the wet does. Your lamp’s disc jumps and skitters on the heaving surface. There is no time to think it through; there is only the far side, and the water between you and it rising while you watch. The cave is not trying to take you. The water is only doing what water does when more of it arrives than the passage can hold. But knowing that does not give you back the seconds the flood is eating.',
      choices: [
        { id: 'c_haul', label: 'Haul Rolly across ahead of the surge.', destination: 'n_after_oxbow', conditions: [{ field: 'companion_status', op: 'equals', value: 'with_you' }], effects: [{ field: 'time', op: 'add_minutes', value: '15' }, { field: 'rope_pitches', op: 'decrement', value: '1' }] },
        // Fresh loss — only if there is still someone to lose here. Someone already lost a chapter ago
        // (carried cave_someone_lost) crosses alone (below), without re-narrating the loss (F-C).
        { id: 'c_cross_fast', label: 'Cross fast and don’t look back.', destination: 'n_lose_here', conditions: [{ field: 'cave_someone_lost', op: 'is_false' }], effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_cross_alone', label: 'Cross alone — as you have been since the ledge.', destination: 'n_after_oxbow', conditions: [{ field: 'cave_someone_lost', op: 'is_true' }], effects: [{ field: 'time', op: 'add_minutes', value: '15' }] },
      ],
    },
    {
      id: 'n_lose_here',
      title: 'Cut Off Behind',
      type: 'scene',
      location: 'oxbow',
      entryEffects: [
        { field: 'location', op: 'change_location', value: 'oxbow' },
        { field: 'cave_someone_lost', op: 'set', value: 'true' },
        { field: 'cave_all_together', op: 'set', value: 'false' }, // a loss clears the togetherness latch (H/F-E)
        { field: 'companion_status', op: 'set', value: 'lost' },
        { field: 'clues', op: 'add_clue', value: 'clue_oxbow_cut' },
      ],
      body:
        'You go for the far side and you go alone, and you do not look back until your boots are on dry stone again and the water is between you and where you were.\n\n' +
        'The bypass is a river now, lip to lip, and the dry span you crossed not a minute ago is gone under brown water that rose when water rises and did not care whose side anyone was on. Whoever was behind you is on the far side of that water. You can shout. You do shout. The roar takes it and gives nothing back.\n\n' +
        'You made the crossing. You did not make it whole. That is a thing you decided in the half-second the flood gave you to decide it, and it is yours now, the particular shape of it, to carry up into the light if you reach the light.',
      choices: [
        { id: 'c_on_after', label: 'Push on across the far side.', destination: 'n_after_oxbow', effects: [{ field: 'time', op: 'add_minutes', value: '15' }] },
      ],
    },
    {
      id: 'n_after_oxbow',
      title: 'The Far Side',
      type: 'scene',
      location: 'upper_gallery',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'upper_gallery' }],
      body:
        'On the far side of the oxbow the gallery goes on, and you go on with it, the way back closed behind you now — whether by your own crossing or by the water, closed either way.\n\n' +
        'The cold has stopped being a thing that bothers you and become a thing that you are; the shiver is constant now, low and deep, and your hands do what you tell them a half-second late. The lamp is very dim. But the floor runs level and dry toward Crystal Hall and the last shaft, and forward is the only direction the cave has left you, and forward, at least, is up.',
      choices: [
        { id: 'c_to_crystal', label: 'On toward Crystal Hall.', destination: 'n_dark_traverse', effects: [{ field: 'time', op: 'add_minutes', value: '15' }] },
      ],
    },
    {
      id: 'n_dark_traverse',
      title: 'The Failing Light',
      type: 'scene',
      location: 'upper_gallery',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'upper_gallery' }],
      body:
        'The last stretch before Crystal Hall is a low broken passage of fallen blocks, and you cross it in a light that is nearly gone.\n\n' +
        'You find the holds by feel as much as sight now, the disc on your helmet pulled in to a dim coin you have to lean close to use, the dark sitting just beyond your hands and following you like a patient animal. You talk yourself across it the way you were taught, naming each move before you make it, because the alternative — letting yourself feel how alone you are, how far in, how nearly out of light — is the kind of thinking that gets people killed in here. A block. A gap. A block. And then ahead the passage opens out, and your dim light catches a thousand small wet glints, and you have reached Crystal Hall.',
      choices: [
        { id: 'c_traverse_on', label: 'Into Crystal Hall.', destination: 'n_crystal_hub', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
      ],
    },
    // ===== ACT 3 — CRYSTAL HALL & THE SHAFT =====
    {
      id: 'n_crystal_hub',
      title: 'Crystal Hall',
      type: 'transition',
      location: 'crystal_hall',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'crystal_hall' }],
      body:
        'Crystal Hall is a cold glittering throat of calcite, your lamp throwing its small light across a thousand wet facets, none of them warm. The way back is closed behind you now, and the only way left is up: a final shaft climbing toward whatever grey the afternoon still has.\n\n' +
        'The cold here is the static, bone-deep kind, the kind that bleeds the warmth out of you while you stand still doing nothing. Your lamp is dimmer than it was at the rift; the disc has pulled in, the dark crowding closer at its rim. You make yourself keep moving, because moving is warmth and standing is the cold getting its hands properly into you.\n\n' +
        'The shaft is there. The light is going. You decide how you take it.',
      choices: [
        { id: 'c_rig_shaft', label: 'Rig the shaft properly and climb.', destination: 'n_shaft', conditions: [{ field: 'rope_pitches', op: 'gte', value: '1' }], effects: [{ field: 'time', op: 'add_minutes', value: '20' }, { field: 'rope_pitches', op: 'decrement', value: '1' }] },
        { id: 'c_freeclimb_shaft', label: 'Free-climb the shaft — no rope, no time to spare.', destination: 'n_shaft', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
        { id: 'c_hs_listen', label: 'Stop and listen to the cave a moment.', destination: 'n_hs_listen', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
        { id: 'c_hs_together', label: 'Get Rolly settled and warm before the climb.', destination: 'n_hs_together', conditions: [{ field: 'companion_status', op: 'equals', value: 'with_you' }], effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_hs_listen',
      title: 'Listening',
      type: 'scene',
      location: 'crystal_hall',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'crystal_hall' }],
      body:
        'You hold still in the glittering cold and listen, and the cave gives you back its small underground weather: the tick and drip of water finding its slow way through stone, the far-off rumour of the flood working below, and under all of it the enormous silence the dark is made of.\n\n' +
        'There is nothing in it about you. That is the thing you keep coming back to, down here, the thing that is either the worst of it or the best, depending on the day. The cave is not listening back. It made this hall drop by drop over a time you cannot hold in your head, and it will go on dropping water in the dark long after today is a story or not even that. You are a warm loud brief thing passing through. You take a breath of the dead cold air, and you turn back to the shaft, because passing through is the whole job now.',
      choices: [
        { id: 'c_listen_on', label: 'Back to the shaft.', destination: 'n_crystal_hub', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_hs_together',
      title: 'Before the Climb',
      type: 'conversation',
      location: 'crystal_hall',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'crystal_hall' }],
      body:
        'You get Rolly wedged out of the worst of the draught and check the splint and the colour of the hurt foot and the colour of Rolly’s face, none of which you like, all of which you have seen worse.\n\n' +
        '"Last shaft," you say. "Then daylight." "Then a pint," Rolly says, "which you are buying," and the old joke is so worn smooth that it barely needs saying, which is exactly why it is worth saying. You share the last of the warmth that two cold bodies can make. Then there is nothing left to do but the shaft, and you both know it, and you get up to do it.',
      choices: [
        { id: 'c_together_on', label: 'On to the shaft, together.', destination: 'n_crystal_hub', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      ],
    },
    {
      id: 'n_shaft',
      title: 'The Daylight Shaft',
      type: 'scene',
      location: 'daylight_shaft',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'daylight_shaft' }],
      body:
        'The shaft is the last of the cave, a tall wet climb up toward the world, and you start up it on cold-stupid hands with the dark close around your failing light.\n\n' +
        'It is hard climbing and you are tired in the deep way the cave makes you tired, and every few feet you stop and breathe and find the next hold and tell yourself it is the next hold and not the whole shaft you have to climb. Somewhere far above, you tell yourself, there is grey. There is the smell of rain and peat. There is the ordinary afternoon you came down out of, going on without you, ready to take you back.',
      choices: [
        { id: 'c_climb_last', label: 'Climb the last of it toward the light.', destination: 'n_climb', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
      ],
    },
    {
      id: 'n_climb',
      title: 'The Last of the Cave',
      type: 'transition',
      location: 'daylight_shaft',
      resolvesEnding: true,
      entryEffects: [
        { field: 'location', op: 'change_location', value: 'daylight_shaft' },
        { field: 'cave_climbed_out', op: 'set', value: 'true' }, // you reached and climbed the shaft (F1)
      ],
      body:
        'You climb the last of it, hand over cold hand, toward whatever the shaft is going to give you — grey, or the memory of grey, or the dark catching you first.',
      choices: [],
    },
  ],
  endings: [
    {
      id: 'end_dark_high',
      name: 'The Cave Keeps You',
      summary: 'The lamp died on the traverse; the dark, which was always going to win the race, has you.',
      priority: 2,
      conditions: [{ field: 'cave_dark_out', op: 'is_true' }],
      body:
        'You are climbing the daylight shaft toward grey light impossibly far up when the lamp gives out.\n\n' +
        'It does not flicker and rally the way it has all afternoon. It dims, and dims, the small white disc pulling in to a coal, to a thread, to a memory of light on the rock six inches from your face — and then it is gone, and the dark you have been outrunning since the pitch head is simply there, total, with no edge to it at all.\n\n' +
        'The cave does not change. The shaft is the same shaft, the cold the same cold, the grey mouth of daylight still up there somewhere beyond the reach of any light you have left. The dark was always going to win this race; the battery only ever borrowed the afternoon from it. Now the loan is called.\n\n' +
        'You hold the rock. You can hear your own breath, and the far drip of water, and nothing that will tell you which way is up except the slow pull in your arms. You climb blind, a hand and a hand and a foot, into a darkness the cave has held since before there were eyes to be lost in it. Somewhere above is the light, and the {{time}} sky, and the ordinary afternoon you came down out of.\n\n' +
        'The cave is in no hurry. It has you, and the dark, and all the time there is.',
    },
    {
      id: 'end_out_not_whole',
      name: 'Out, But Not Whole',
      summary: 'You climb out into the rain — and not in any way you wanted. Rolly is behind the water.',
      priority: 1,
      conditions: [
        { field: 'cave_someone_lost', op: 'is_true' },
        { field: 'cave_all_together', op: 'is_false' }, // mutex: a loss excludes "all three" — latch contract made explicit (A1 v1.1)
        { field: 'cave_climbed_out', op: 'is_true' }, // you actually surfaced — not a deadline-cross below (F1)
      ],
      body:
        'You come up the last of the shaft into grey, and the grey is daylight, and the daylight is real. It is thin and cold and the most the hill has to give at {{time}}, but it is sky, and you climb out into it on hands and knees and lie in the wet heather with the rain on your face and breathe air that no rock has been sitting on. You made it. The cave let you have this.\n\n' +
        'It did not let you have all of it. Rolly is not beside you. Somewhere back in the dark, on the wrong side of water that rose when water rises and did not care whose side anyone was on, Rolly is behind you — left, lost, cut off, the particular shape of it your own to carry. You climbed out lighter than you went in, and not in any way you wanted.\n\n' +
        'The lamp still burns its small disc, useless now in the open. You should turn it off. You don’t, not yet. You lie in the rain looking back at the black slot in the hillside, and the cave looks back the way it always does, which is not at all.\n\n' +
        'There will be a call-out. Lights, ropes, people who do this. Maybe in time, maybe not in time; the mountain keeps its own counsel on that and tells you nothing. You are out. You are not whole. The cold has the truth of it, and the cold does not lie.',
    },
    {
      id: 'end_daylight_all_three',
      name: 'Daylight, All Three',
      summary: 'Out together, the lamp still burning, the cold beaten by a margin. The whole of the small victory.',
      priority: 1,
      conditions: [
        { field: 'cave_all_together', op: 'is_true' },
        { field: 'cave_someone_lost', op: 'is_false' }, // honesty: "all three" cannot fire if anyone was lost (H/F-E)
        { field: 'cave_dark_out', op: 'is_false' },
        { field: 'cave_hypothermic', op: 'is_false' },
        { field: 'cave_climbed_out', op: 'is_true' }, // you actually surfaced (F1)
      ],
      body:
        'The shaft gives up its grey a hand’s breadth at a time, and then all at once it is not grey but daylight, watery and cold and absolutely real, and you come up out of the black slot in the hillside into the rain and the wind and the enormous ordinary sky.\n\n' +
        'You get Rolly up after you, the splint still holding, the ankle a problem for a hospital and not for the cave anymore. The two of you lie in the wet heather and laugh the way people laugh when the laugh is mostly just breathing, and the rain comes down on your faces and it is the best thing either of you has ever felt.\n\n' +
        'The lamp is still going. A small thing, but you notice it — the disc you watched shrink all afternoon, still throwing its useless light up into the daylight, the battery that lasted, the dark that did not get you after all. You turn it off yourself, on your own terms, in the light.\n\n' +
        'Below you the cave keeps doing what the cave does — rising, sealing, dropping, on its own indifferent clock — and it will go on doing it long after the call-out and the kettle and the long warm telling of this in the club hut. But it did not keep you, and it did not keep Rolly. Not today. You came down to do a routine afternoon, and you are walking off the hill having done a harder one whole.',
    },
    {
      id: 'end_grey_high',
      name: 'A Grey Way Out',
      summary: 'You surface — cold, shaken, the cost of it left unspoken. Out, but the cave kept something.',
      priority: 0,
      conditions: [{ field: 'cave_climbed_out', op: 'is_true' }], // you surfaced, but not the clean victory (F1)
      body:
        'You climb the last of the shaft on hands going stupid with cold and lungs full of stale cave air, and at the top of it there is grey — not much grey, the thin worn-out grey of a wet afternoon going toward dark, but grey, and it means sky, and it means out.\n\n' +
        'You haul yourself up into the rain and lie a while in the heather, breathing, the black slot of the cave at your back. The lamp still gives its small tired disc, dimmer than it was, the dark beaten by a margin you would rather not measure. You are out. That is the fact you hold onto, because some of the other facts of the afternoon are heavier and you are too cold to lift them yet.\n\n' +
        'If there is anyone beside you in the heather, you do not say anything; you just lie there together being out. If there is not, the rain falls on you alone and you let it. The cave behind you neither mourns nor celebrates; it rose and it sealed on its own clock, and now it is quiet, and it will be quiet a long time.\n\n' +
        'There will be a phone, and a kettle, and people. Later. For now there is the grey sky and the cold rain and the enormous fact of being out of the dark, and that, for the moment, is enough, and has to be.',
    },
    {
      id: 'end_benighted_high',
      name: 'The Day Goes Without You',
      summary: 'You did not reach the shaft in time. The afternoon fails overhead, and you are still below, in the cave that does not hurry.',
      priority: 0,
      isDefault: true,
      conditions: [],
      body:
        'You do not reach the daylight shaft. Not in time — not while there is still an afternoon up there to climb toward. The cave is long, and you spent what the cave gave you, and somewhere above the grey is going out of the sky a degree at a time, and you are not there to see it go.\n\n' +
        'Wherever the cave has you when the day fails — a ledge, a crawl, the cold lip of a pitch — that is where you are. The lamp still throws its small disc, for now. The water still moves somewhere on its own clock. The rock holds the cold it has held since before the hill had a name, and presses it patiently into you, and has all the time there is to do it.\n\n' +
        'You did not get out. That is the fact, and it is a heavy one, and the cave does not help you lift it. There will be a call-out when the surface notices the not-coming-back — lights, ropes, people who do this; maybe in time, maybe not. The mountain keeps its own counsel on that. The dark keeps you, and neither of them is in any hurry at all.',
    },
  ],
};
