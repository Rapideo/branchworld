import type { Story } from '../../../engine';

/**
 * The Sump Line — Chapter 2A: "The Dry High Traverse" (`ch2_high`). A game-ending branch chapter
 * (reached when ch1 set cave_route='high'). The antagonist here is cold + the dying lamp across a long
 * exposed traverse; a second flood pulse can still surge up and cut the oxbow bypass.
 *
 * Build fixes applied (beyond the design):
 * - EVENT TIMING: `ev_second_pulse` triggers at 14:55 (not 15:10) so BOTH branches are reachable — the
 *   slow *rig* path is still at the oxbow when it hits (present → witnessed), the fast *free-climb* path
 *   has crossed ahead (absent). (As designed at 15:10 the present node was unreachable.)
 * - EE-4: the absent effect no longer sets cave_someone_lost (crossing ahead with Rolly loses no one);
 *   the loss is set only by the explicit "cross alone/fast" choice (n_lose_here) or carried from ch1.
 * - Punch-list: rope_pitches start 2; ending priorities (dark 2 > loss 1 > together/grey 0); concrete
 *   depletion (lamp 12/5, body_heat 20/5); lamp atZero resolves the dark ending paired with cave_dark_out.
 *
 * Carry: lamp_charge/body_heat are rebased on entry by the container; the latching vars carry from ch1.
 * Note: end_daylight_all_three (needs carried cave_all_together) and end_dark_high (needs a carried-low
 * lamp) are CARRY-ONLY — unreachable in a standalone per-chapter walk (expected orphanEndings, F4).
 */
export const ch2High: Story = {
  id: 'ch2_high',
  title: 'The Dry High Traverse',
  startNodeId: 'n_h_start',
  startTime: '14:30',
  deadline: '15:35', // window 65; longest path == 65
  startLocation: 'high_rift',
  variables: [
    { name: 'companion_status', type: 'string', default: 'with_you', purpose: "Rolly's carried state: 'with_you' | 'hurt' | 'lost'. Gates content and endings." },
    { name: 'cave_someone_lost', type: 'boolean', default: false, purpose: 'Latching: the companion is lost. Required by the pyrrhic ending.' },
    { name: 'cave_all_together', type: 'boolean', default: false, purpose: 'Latching (carried from ch1): kept Rolly with you. Required by the clean ending.' },
    { name: 'cave_dark_out', type: 'boolean', default: false, purpose: 'Latching, paired with lamp at-zero. Required by the dark ending.' },
    { name: 'cave_hypothermic', type: 'boolean', default: false, purpose: 'Latching, paired with body_heat at-zero. Blocks the clean ending; colours others.' },
  ],
  locations: [
    { id: 'high_rift', name: 'The Aven Rift' },
    { id: 'oxbow', name: 'The Oxbow Bypass' },
    { id: 'crystal_hall', name: 'Crystal Hall' },
    { id: 'daylight_shaft', name: 'The Daylight Shaft' },
  ],
  resources: [
    { id: 'lamp_charge', label: 'Lamp', min: 0, max: 100, start: 60, depletion: { everyMinutes: 12, amount: 5 }, atZero: { ending: 'end_dark_high', setFlag: 'cave_dark_out' } }, // standalone start 60; the container rebases to the carried value
    { id: 'body_heat', label: 'Warmth', min: 0, max: 100, start: 100, depletion: { everyMinutes: 20, amount: 5 }, atZero: { setFlag: 'cave_hypothermic' } },
    { id: 'rope_pitches', label: 'Rope', min: 0, max: 2, start: 2 },
  ],
  events: [
    {
      id: 'ev_second_pulse',
      title: 'The Bypass Goes Under',
      trigger: [{ field: 'time', op: 'time_after', value: '14:55' }],
      eventLocation: 'oxbow',
      ifPresentNode: 'n_pulse_present',
      ifAbsentEffects: [{ field: 'clues', op: 'add_clue', value: 'clue_pulse_cutoff' }],
      recoveryNodeId: 'n_crystal_hub',
    },
  ],
  nodes: [
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
        { id: 'c_freeclimb', label: 'Free-climb the rift fast — spend the warmth, save the light.', destination: 'n_oxbow', effects: [{ field: 'time', op: 'add_minutes', value: '20' }] },
        { id: 'c_rig', label: 'Rig a protected line — slower and safer, but the lamp burns.', destination: 'n_oxbow', effects: [{ field: 'time', op: 'add_minutes', value: '30' }, { field: 'rope_pitches', op: 'decrement', value: '1' }] },
      ],
    },
    {
      id: 'n_oxbow',
      title: 'The Oxbow Bypass',
      type: 'event',
      location: 'oxbow',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'oxbow' }],
      body:
        'The rift tops out into the oxbow: a dry abandoned meander of the old streamway, a ribbon of stone bridging a black void. Far below, down in the gulf the bypass spans, you can hear water moving — a deep, patient sound — but your lamp cannot reach it and you cannot see it. There is only the dry span ahead and the dark on either hand.\n\n' +
        'You start across, one boot in front of the other on the cold stone, the void breathing up at you. The lamp lays its shrinking disc on the rock a few feet ahead. The cave is in no hurry. You are.',
      choices: [
        { id: 'c_cross', label: 'Cross the bypass to Crystal Hall.', destination: 'n_crystal_hub', effects: [{ field: 'time', op: 'add_minutes', value: '20' }] },
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
        { id: 'c_haul', label: 'Haul Rolly across ahead of the surge.', destination: 'n_crystal_hub', conditions: [{ field: 'companion_status', op: 'equals', value: 'with_you' }], effects: [{ field: 'time', op: 'add_minutes', value: '15' }, { field: 'rope_pitches', op: 'decrement', value: '1' }] },
        { id: 'c_cross_fast', label: 'Cross fast and don’t look back.', destination: 'n_lose_here', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
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
        { field: 'companion_status', op: 'set', value: 'lost' },
        { field: 'clues', op: 'add_clue', value: 'clue_oxbow_cut' },
      ],
      body:
        'You go for the far side and you go alone, and you do not look back until your boots are on dry stone again and the water is between you and where you were.\n\n' +
        'The bypass is a river now, lip to lip, and the dry span you crossed not a minute ago is gone under brown water that rose when water rises and did not care whose side anyone was on. Whoever was behind you is on the far side of that water. You can shout. You do shout. The roar takes it and gives nothing back.\n\n' +
        'You made the crossing. You did not make it whole. That is a thing you decided in the half-second the flood gave you to decide it, and it is yours now, the particular shape of it, to carry up into the light if you reach the light.',
      choices: [
        { id: 'c_on_crystal', label: 'Push on to Crystal Hall.', destination: 'n_crystal_hub', effects: [{ field: 'time', op: 'add_minutes', value: '15' }] },
      ],
    },
    {
      id: 'n_crystal_hub',
      title: 'Crystal Hall',
      type: 'transition',
      location: 'crystal_hall',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'crystal_hall' }],
      body:
        'Crystal Hall is a cold glittering throat of calcite, your lamp throwing its small light across a thousand wet facets, none of them warm. The way back is closed behind you now — the oxbow gone under, or going — and the only way left is up: a final shaft climbing toward whatever grey the afternoon still has.\n\n' +
        'The cold here is the static, bone-deep kind, the kind that bleeds the warmth out of you while you stand still doing nothing. Your lamp is dimmer than it was at the rift; the disc has pulled in, the dark crowding closer at its rim. You make yourself keep moving, because moving is warmth and standing is the cold getting its hands properly into you.\n\n' +
        'The shaft is there. The light is going. You decide how you take it.',
      choices: [
        { id: 'c_rig_shaft', label: 'Rig the shaft properly and climb.', destination: 'n_climb', conditions: [{ field: 'rope_pitches', op: 'gte', value: '1' }], effects: [{ field: 'time', op: 'add_minutes', value: '20' }, { field: 'rope_pitches', op: 'decrement', value: '1' }] },
        { id: 'c_freeclimb_shaft', label: 'Free-climb the shaft — no rope, no time to spare.', destination: 'n_climb', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
      ],
    },
    {
      id: 'n_climb',
      title: 'The Daylight Shaft',
      type: 'transition',
      location: 'daylight_shaft',
      resolvesEnding: true,
      entryEffects: [{ field: 'location', op: 'change_location', value: 'daylight_shaft' }],
      body:
        'The shaft goes up into the dark above your light, and somewhere far up it there is grey, or the memory of grey, or nothing. You set your hands on the cold rock and start to climb the last of the cave.',
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
      conditions: [{ field: 'cave_someone_lost', op: 'is_true' }],
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
      priority: 0,
      conditions: [
        { field: 'cave_all_together', op: 'is_true' },
        { field: 'cave_dark_out', op: 'is_false' },
        { field: 'cave_hypothermic', op: 'is_false' },
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
      isDefault: true,
      conditions: [],
      body:
        'You climb the last of the shaft on hands going stupid with cold and lungs full of stale cave air, and at the top of it there is grey — not much grey, the thin worn-out grey of a wet afternoon going toward dark, but grey, and it means sky, and it means out.\n\n' +
        'You haul yourself up into the rain and lie a while in the heather, breathing, the black slot of the cave at your back. The lamp still gives its small tired disc, dimmer than it was, the dark beaten by a margin you would rather not measure. You are out. That is the fact you hold onto, because some of the other facts of the afternoon are heavier and you are too cold to lift them yet.\n\n' +
        'If there is anyone beside you in the heather, you do not say anything; you just lie there together being out. If there is not, the rain falls on you alone and you let it. The cave behind you neither mourns nor celebrates; it rose and it sealed on its own clock, and now it is quiet, and it will be quiet a long time.\n\n' +
        'There will be a phone, and a kettle, and people. Later. For now there is the grey sky and the cold rain and the enormous fact of being out of the dark, and that, for the moment, is enough, and has to be.',
    },
  ],
};
