import type { Story } from '../engine';

/**
 * "The Prater Line" — Team 3's chapter ported to the hardened v1.1 engine.
 *
 * Time model (EE-1): the engine clock is absolute minutes from `startTime`.
 * The story runs 20:00 -> 02:10, which crosses midnight, so the deadline and
 * every past-midnight time literal is expressed as hours-since-20:00's day:
 *   - startTime 20:00 = 1200 min
 *   - deadline 02:10  = 1570 min, written '26:10' so parseTime yields 1570
 *   - the 02:10 ending threshold is likewise '26:10'
 * Times still before midnight (the 23:30 canal handoff) keep their literal form.
 * Node bodies carry no authoritative time — they use {{time}} or relative phrasing.
 */
export const praterLine: Story = {
  id: 'prater_line',
  title: 'The Prater Line',
  startNodeId: 'node_safehouse',
  startTime: '20:00',
  deadline: '26:10', // 02:10 next day, absolute 1570 min
  startLocation: 'loc_safehouse',
  variables: [
    { name: 'lindqvist_trust', type: 'number', default: 0, purpose: "Cal's standing with the old handler Lindqvist" },
    { name: 'dragomir_trust', type: 'number', default: 0, purpose: "How far Irina Dragomir trusts Cal" },
    { name: 'volkov_suspicion', type: 'number', default: 0, purpose: "How seriously Volkov takes Cal as a potential asset" },
    { name: 'knows_dragomir_blown', type: 'boolean', default: false, purpose: 'Cal knows Dragomir was surveilled/burned before the run' },
    { name: 'handoff_witnessed', type: 'boolean', default: false, purpose: 'Cal saw the 23:30 canal handoff with his own eyes' },
    { name: 'handoff_missed', type: 'boolean', default: false, purpose: 'The 23:30 handoff happened while Cal was elsewhere' },
    { name: 'has_real_microfilm', type: 'boolean', default: false, purpose: 'Cal carries the genuine 41-frame microfilm' },
    { name: 'took_volkov_deal', type: 'boolean', default: false, purpose: 'Cal accepted Volkov\'s eastbound double-cross' },
    { name: 'companion', type: 'string', default: 'none', purpose: "Who travels with Cal ('none' or 'dragomir')" },
  ],
  locations: [
    { id: 'loc_safehouse', name: 'The Margareten Safehouse' },
    { id: 'loc_streets', name: 'Margareten Streets' },
    { id: 'loc_sperl', name: 'Cafe Sperl' },
    { id: 'loc_crossroads', name: 'Naschmarkt Crossroads' },
    { id: 'loc_riesenrad', name: 'The Riesenrad' },
    { id: 'loc_canal', name: 'The Danubekanal Embankment' },
    { id: 'loc_canal_drop', name: 'The Third Bollard' },
    { id: 'loc_underpass', name: 'The Aspern Bridge Underpass' },
    { id: 'loc_westbahnhof', name: 'Westbahnhof, Platform 3' },
    { id: 'loc_eastbound', name: 'A Slower Train, Eastbound' },
  ],
  events: [
    {
      id: 'event_handoff',
      title: 'The 23:30 Canal Handoff',
      trigger: [{ field: 'time', op: 'time_after', value: '23:30' }],
      eventLocation: 'loc_canal',
      ifPresentNode: 'node_handoff_witnessed',
      ifAbsentEffects: [
        { field: 'handoff_missed', op: 'set', value: 'true' },
        { field: 'clues', op: 'add_clue', value: 'chalk_marks' },
      ],
      recoveryNodeId: 'node_canal_drop',
    },
  ],
  nodes: [
    // 1. node_safehouse — start
    {
      id: 'node_safehouse',
      title: 'The Margareten Safehouse',
      type: 'scene',
      location: 'loc_safehouse',
      body:
        "Rain ticks against the dormer window like a code you can't read. The flat smells of damp wool and burnt coffee, and under a grey blanket the radio set hums a single steady note, waiting.\n\n" +
        "Lindqvist sits with his back to the wall, the way he always sits, a cigarette burning down untasted between two fingers. He nudges the satchel across the table toward you with one knuckle.\n\n" +
        '"It\'s clean," he says. "Cover passport, transit chit, the address. You go to Sperl, you collect the woman, you put her on the oh-two-ten west. Six hours, Cal. A long time to do a simple thing."\n\n' +
        'He says simple the way other men say dangerous.\n\n' +
        '"She\'ll be skittish. She\'s a physicist, not an agent — she\'s never done this. So be gentle and be quick, and do not, whatever happens, take her down to the canal. There\'s nothing for you at the canal tonight."\n\n' +
        'The clock on the radio reads {{time}}. The cigarette finally drops its ash.',
      choices: [
        {
          id: 'take_satchel',
          label: 'Take the satchel and the cover story at face value. Trust the old man.',
          destination: 'node_to_sperl',
          effects: [
            { field: 'lindqvist_trust', op: 'increment', value: '1' },
            { field: 'time', op: 'add_minutes', value: '5' },
          ],
        },
        {
          id: 'press_lindqvist',
          label: '"Why the canal? You only forbid a thing you\'re worried about." Push him.',
          destination: 'node_safehouse_press',
          effects: [
            { field: 'lindqvist_trust', op: 'decrement', value: '1' },
            { field: 'time', op: 'add_minutes', value: '10' },
          ],
        },
        {
          id: 'search_satchel',
          label: 'Wait until he steps to the radio, then quietly search the satchel he gave you.',
          destination: 'node_search_satchel',
          conditions: [{ field: 'lindqvist_trust', op: 'lt', value: '2' }],
          effects: [{ field: 'time', op: 'add_minutes', value: '25' }],
        },
      ],
    },
    // 2. node_safehouse_press
    {
      id: 'node_safehouse_press',
      title: "What the Old Man Won't Say",
      type: 'conversation',
      location: 'loc_safehouse',
      body:
        'Lindqvist studies you for a long moment, and something paternal goes out of his face. What\'s left is just tired.\n\n' +
        '"You want to know why," he says. "Good. Curiosity is the only thing that keeps couriers alive. But there\'s curiosity, and there\'s the kind that gets a frightened woman shot on a tow-path."\n\n' +
        'He leans forward. "The canal is somebody else\'s appointment tonight. Not yours. If you\'re standing there at half eleven you\'ll see things that will make you do something stupid, and stupid is how green men die in this city. That\'s all I\'ll give you. Now — do you trust me, or do you trust the itch under your collar?"\n\n' +
        'The radio hums. Outside, a tram grinds past, throwing wet light across the ceiling.',
      choices: [
        {
          id: 'trust_him',
          label: '"I trust you." Let it go and take the satchel.',
          destination: 'node_to_sperl',
          effects: [
            { field: 'lindqvist_trust', op: 'increment', value: '1' },
            { field: 'time', op: 'add_minutes', value: '5' },
          ],
        },
        {
          id: 'note_canal',
          label: 'Say nothing. Note that he never actually denied the canal was a handoff.',
          destination: 'node_to_sperl',
          effects: [
            { field: 'clues', op: 'add_clue', value: 'suspect_canal' },
            { field: 'time', op: 'add_minutes', value: '5' },
          ],
        },
        {
          id: 'search_satchel',
          label: 'Wait for him to turn to the radio, then search the satchel.',
          destination: 'node_search_satchel',
          conditions: [{ field: 'lindqvist_trust', op: 'lt', value: '2' }],
          effects: [{ field: 'time', op: 'add_minutes', value: '25' }],
        },
      ],
    },
    // 3. node_search_satchel
    {
      id: 'node_search_satchel',
      title: 'Under the False Bottom',
      type: 'discovery',
      location: 'loc_safehouse',
      body:
        'He crouches at the radio, headphones half on, and the world narrows to the soft brass clasps under your thumbs.\n\n' +
        "Papers. The passport — your face, a stranger's name. The transit chit. And beneath the liner, where the cardboard shouldn't be that thick, a second envelope. No seal. Inside: a single photograph of Irina Dragomir, taken with a long lens on a Vienna street, and clipped to it a flimsy carbon you were never meant to read. KOMPROMITTIERT. SUBJECT SURVEILLED SINCE OCTOBER. HANDLE AS BURNED.\n\n" +
        'Your stomach drops through the floor. She isn\'t a defector slipping a net. She walked out under a net that was already drawn — and Lindqvist has known since October.\n\n' +
        "The radio crackles. He's turning. You slide it all back and stand, mouth dry.",
      choices: [
        {
          id: 'pocket_carbon',
          label: 'Pocket the carbon. Keep your face still. Walk to Sperl carrying a secret.',
          destination: 'node_to_sperl',
          effects: [
            { field: 'knows_dragomir_blown', op: 'set', value: 'true' },
            { field: 'lindqvist_trust', op: 'set', value: '0' },
            { field: 'clues', op: 'add_clue', value: 'carbon' },
            { field: 'time', op: 'add_minutes', value: '5' },
          ],
        },
        {
          id: 'confront_him',
          label: 'Confront him now, carbon in your fist. "You sent me to walk a corpse to a train."',
          destination: 'node_safehouse_confront',
          effects: [
            { field: 'knows_dragomir_blown', op: 'set', value: 'true' },
            { field: 'lindqvist_trust', op: 'set', value: '0' },
            { field: 'time', op: 'add_minutes', value: '10' },
          ],
        },
      ],
    },
    // 4. node_safehouse_confront
    {
      id: 'node_safehouse_confront',
      title: "The Old Man's Arithmetic",
      type: 'conversation',
      location: 'loc_safehouse',
      body:
        "He doesn't flinch at the carbon. That's the worst of it — he looks at it the way a man looks at a bill he expected.\n\n" +
        '"So you searched the bag," Lindqvist says softly. "Good. I half hoped you would." He takes off the headphones. "Yes. She\'s blown. Has been for weeks. London wants the microfilm she\'s carrying, and they do not greatly care whether the woman attached to it reaches Salzburg. You were sent to bring the film. She was always... freight."\n\n' +
        'He lets that sit in the damp air.\n\n' +
        '"You can still bring her out. I\'m not ordering you to leave her. I\'m telling you the truth so you choose with your eyes open, which is more than this service gave me at your age. The canal at half eleven is where the film is supposed to change hands without her. Stay away, and you might still save the person instead of the prize. Or go, and learn exactly who I work for. Your call, courier."',
      choices: [
        {
          id: 'leave_silent',
          label: 'Leave without another word and go to Dragomir. Decide later who you serve.',
          destination: 'node_to_sperl',
          effects: [{ field: 'time', op: 'add_minutes', value: '5' }],
        },
        {
          id: 'own_arithmetic',
          label: '"Then I\'ll do my own arithmetic." Take the satchel anyway and go.',
          destination: 'node_to_sperl',
          effects: [
            { field: 'lindqvist_trust', op: 'increment', value: '1' },
            { field: 'time', op: 'add_minutes', value: '5' },
          ],
        },
      ],
    },
    // 5. node_to_sperl
    {
      id: 'node_to_sperl',
      title: 'Across the Wet City',
      type: 'transition',
      location: 'loc_streets',
      entryEffects: [{ field: 'location', op: 'change_location', value: 'loc_streets' }],
      body:
        'The street meets you with a fistful of rain. Margareten is shuttered and sodium-orange; somewhere a dog complains behind a courtyard gate. You turn up your collar over the satchel and start north toward the Naschmarkt, toward Sperl, toward her.\n\n' +
        'A tram waits at the corner, doors hissing, warm yellow inside. Or your own two feet through the back lanes, slower but unwatched. Either way the woman in the back booth is getting colder, and somewhere in this city Anatoly Volkov is awake and curious.',
      choices: [
        {
          id: 'tram',
          label: 'Take the tram. Fast, lit, a little exposed.',
          destination: 'node_sperl',
          effects: [
            { field: 'location', op: 'change_location', value: 'loc_sperl' },
            { field: 'time', op: 'add_minutes', value: '25' },
          ],
        },
        {
          id: 'walk',
          label: "Walk the back lanes. Slower, but you'd see a tail.",
          destination: 'node_sperl',
          effects: [
            { field: 'location', op: 'change_location', value: 'loc_sperl' },
            { field: 'dragomir_trust', op: 'increment', value: '1' },
            { field: 'time', op: 'add_minutes', value: '45' },
          ],
        },
      ],
    },
    // 6. node_sperl
    {
      id: 'node_sperl',
      title: 'Cafe Sperl, the Back Booth',
      type: 'conversation',
      location: 'loc_sperl',
      body:
        'The coffeehouse is a cave of old velvet and marble, half its lamps dark, a pianist murdering Schubert in the corner. At the back, under a clouded mirror, a woman sits with both hands wrapped around a cup that went cold an hour ago.\n\n' +
        'Irina Dragomir is smaller than her file. Sharp-boned, dark-eyed, and so tightly wound that when your shadow falls across the table her whole body flinches toward the service door. She has already chosen which way she\'ll run.\n\n' +
        '"You\'re late," she says, not looking up. "Or you\'re not him at all. I have been deciding which would be worse." Her English is precise, frightened, beautiful. "Sit. Order something. If we are to be shot let it look ordinary."\n\n' +
        'You sit. Under the table, you can feel her knee shaking. Everything from here depends on the next thing out of your mouth.',
      choices: [
        {
          id: 'truth',
          label: "Tell her the plain truth: it's dangerous, you're new, but you'll get her out or die trying.",
          destination: 'node_sperl_trust',
          effects: [
            { field: 'dragomir_trust', op: 'increment', value: '2' },
            { field: 'time', op: 'add_minutes', value: '35' },
          ],
        },
        {
          id: 'cover',
          label: 'Reassure her with the cover story — smooth, confident, the way the manual says.',
          destination: 'node_sperl_cover',
          effects: [
            { field: 'dragomir_trust', op: 'decrement', value: '1' },
            { field: 'time', op: 'add_minutes', value: '30' },
          ],
        },
        {
          id: 'tell_blown',
          label: 'Tell her what you found in the satchel — that she was blown before she ever ran.',
          destination: 'node_sperl_trust',
          conditions: [{ field: 'knows_dragomir_blown', op: 'is_true' }],
          effects: [
            { field: 'dragomir_trust', op: 'increment', value: '3' },
            { field: 'time', op: 'add_minutes', value: '40' },
          ],
        },
        {
          id: 'press_film',
          label: 'Skip the gentling. "Give me the microfilm now and we both stop being targets."',
          destination: 'node_sperl_press_film',
          effects: [
            { field: 'dragomir_trust', op: 'decrement', value: '2' },
            { field: 'time', op: 'add_minutes', value: '25' },
          ],
        },
      ],
    },
    // 7. node_sperl_trust
    {
      id: 'node_sperl_trust',
      title: 'The Crack in the Cup',
      type: 'conversation',
      location: 'loc_sperl',
      body:
        'Something in her unbolts. Not all the way — people like her never unbolt all the way — but enough that her shoulders drop a centimetre and she finally looks at your face instead of the door.\n\n' +
        '"You are honest," she says, almost an accusation. "They sent me an honest boy. That is either very kind or very cruel of them." She turns the cold cup a quarter-turn. "There is a film. Two films, in truth. One I will give to anyone who asks loudly enough — it is engine schematics, real, worthless. The other..." Her thumb brushes the seam of her coat. "The other does not leave my body until I believe the body it goes to will get on that train with me. Do you understand the difference, courier?"\n\n' +
        'You do. Trust is the only currency she takes.',
      choices: [
        {
          id: 'earn_film',
          label: '"Then let me earn the second one." Ask for the real microfilm directly.',
          destination: 'node_get_real_film',
          conditions: [{ field: 'dragomir_trust', op: 'gte', value: '3' }],
          effects: [{ field: 'time', op: 'add_minutes', value: '10' }],
        },
        {
          id: 'walk_with_me',
          label: 'Don\'t push the film. "Walk with me. We\'ll talk on the way to the station."',
          destination: 'node_crossroads',
          effects: [
            { field: 'companion', op: 'set', value: 'dragomir' },
            { field: 'location', op: 'change_location', value: 'loc_crossroads' },
            { field: 'time', op: 'add_minutes', value: '20' },
          ],
        },
        {
          id: 'tell_canal_handoff',
          label: "Tell her a quiet voice says there's a handoff at the canal tonight you don't understand.",
          destination: 'node_crossroads',
          conditions: [{ field: 'knows_dragomir_blown', op: 'is_true' }],
          effects: [
            { field: 'companion', op: 'set', value: 'dragomir' },
            { field: 'dragomir_trust', op: 'increment', value: '1' },
            { field: 'location', op: 'change_location', value: 'loc_crossroads' },
            { field: 'time', op: 'add_minutes', value: '15' },
          ],
        },
      ],
    },
    // 8. node_sperl_cover
    {
      id: 'node_sperl_cover',
      title: 'She Has Heard This Speech Before',
      type: 'conversation',
      location: 'loc_sperl',
      body:
        'You give her the smooth version — the routes, the friends in high places, the certainty. You hear yourself doing it and so does she.\n\n' +
        'Her mouth thins. "You read that from a card," she says. "I have crossed three borders on speeches like that. The men who made them are dead or rich, and I am here, in a dead cafe, with a boy reciting." She pulls her coat tighter. "I will come as far as the door with you. After that you must give me a reason that is not printed."\n\n' +
        'The pianist finishes mangling Schubert and starts again, worse.',
      choices: [
        {
          id: 'drop_script',
          label: 'Drop the script. Tell her the real, frightening truth instead.',
          destination: 'node_sperl_trust',
          effects: [
            { field: 'dragomir_trust', op: 'increment', value: '2' },
            { field: 'time', op: 'add_minutes', value: '25' },
          ],
        },
        {
          id: 'get_moving',
          label: 'Just get her moving. "Reasons later. The train doesn\'t wait."',
          destination: 'node_crossroads',
          effects: [
            { field: 'companion', op: 'set', value: 'dragomir' },
            { field: 'location', op: 'change_location', value: 'loc_crossroads' },
            { field: 'time', op: 'add_minutes', value: '20' },
          ],
        },
      ],
    },
    // 9. node_sperl_press_film
    {
      id: 'node_sperl_press_film',
      title: 'The Wrong Thing to Want First',
      type: 'event',
      location: 'loc_sperl',
      body:
        "Her hand stops halfway to the cup. The warmth you hadn't earned yet drains out of the booth.\n\n" +
        '"Of course," she says, and her voice is glass. "The film. Always the film. I am a courier\'s errand, not a person." She reaches into her coat and lays a small steel canister on the marble between you, sliding it across with one finger like something dead. "Here. Take it. Now leave me to my coffee and tell your masters the package is collected."\n\n' +
        "You know, the moment you touch it, that it's too easy. The decoy. The real film is still somewhere on her, behind a wall you just made taller.",
      choices: [
        {
          id: 'recover',
          label: 'Pocket the decoy and try to recover. "That\'s not what I meant. Let me start again."',
          destination: 'node_sperl_cover',
          effects: [{ field: 'time', op: 'add_minutes', value: '15' }],
        },
        {
          id: 'take_decoy_leave',
          label: 'Take the decoy, take her arm, and leave. You can mend it walking.',
          destination: 'node_crossroads',
          effects: [
            { field: 'companion', op: 'set', value: 'dragomir' },
            { field: 'location', op: 'change_location', value: 'loc_crossroads' },
            { field: 'time', op: 'add_minutes', value: '20' },
          ],
        },
      ],
    },
    // 10. node_get_real_film
    {
      id: 'node_get_real_film',
      title: 'What She Carries Against Her Heart',
      type: 'discovery',
      location: 'loc_sperl',
      body:
        'Irina Dragomir looks at you for a long, weighing moment. Then she does something almost unbearably intimate: she reaches under her coat, under the lining over her ribs, and works loose a flat oilcloth packet warm from her body.\n\n' +
        '"Forty-one frames," she murmurs, pressing it into your hand below the table. "It is the only thing I have ever made that the world should not have. Lose it and a great many people sleep worse. Lose me and only I will mind." A ghost of a smile. "Now you carry both. Heavy, yes? Good. Carry it like it is heavy."\n\n' +
        'The real microfilm is yours. She rises, buttoning her coat, and slips her cold hand into the crook of your arm as if you\'ve done this a hundred times.',
      choices: [
        {
          id: 'into_the_rain',
          label: 'Take her out into the rain toward the station and whatever the night holds.',
          destination: 'node_crossroads',
          effects: [
            { field: 'has_real_microfilm', op: 'set', value: 'true' },
            { field: 'companion', op: 'set', value: 'dragomir' },
            { field: 'dragomir_trust', op: 'increment', value: '1' },
            { field: 'location', op: 'change_location', value: 'loc_crossroads' },
            { field: 'time', op: 'add_minutes', value: '15' },
          ],
        },
      ],
    },
    // 11. node_crossroads
    {
      id: 'node_crossroads',
      title: 'The Fork in the Rain',
      type: 'scene',
      location: 'loc_crossroads',
      body:
        'Outside Sperl the rain has thinned to a cold mist that beads on every lamp. Vienna lies open in three directions and the night tilts toward its appointment.\n\n' +
        'West, the safe way: tram lines running straight to Westbahnhof and the steaming 02:10, the simple completion of a simple thing. North-east, past the river, the Prater — the great lit Riesenrad turning slow against the cloud, tall enough to see who\'s behind you. And down, always down, the black slot of the Danube Canal, where Lindqvist said there was nothing for you, where at half past eleven a man will stand at the third bollard whether you come or not.\n\n' +
        'If Dragomir is on your arm you can feel her deciding, too, whether to trust where you lead.',
      choices: [
        {
          id: 'to_westbahnhof',
          label: "Go straight to Westbahnhof. Don't tempt the night. Just make the train.",
          destination: 'node_westbahnhof',
          effects: [
            { field: 'location', op: 'change_location', value: 'loc_westbahnhof' },
            { field: 'time', op: 'add_minutes', value: '55' },
          ],
        },
        {
          id: 'to_riesenrad',
          label: 'Ride the Riesenrad first. From the top you\'ll see if Volkov\'s men are on you.',
          destination: 'node_riesenrad',
          effects: [
            { field: 'location', op: 'change_location', value: 'loc_riesenrad' },
            { field: 'time', op: 'add_minutes', value: '45' },
          ],
        },
        {
          id: 'to_canal',
          label: 'Go down to the canal. Be there before half eleven and see the handoff yourself.',
          destination: 'node_canal_approach',
          effects: [
            { field: 'location', op: 'change_location', value: 'loc_canal' },
            { field: 'time', op: 'add_minutes', value: '95' },
          ],
        },
      ],
    },
    // 12. node_riesenrad
    {
      id: 'node_riesenrad',
      title: 'The Wheel Against the Cloud',
      type: 'discovery',
      location: 'loc_riesenrad',
      entryEffects: [
        { field: 'knows_dragomir_blown', op: 'set', value: 'true' },
        { field: 'volkov_suspicion', op: 'increment', value: '1' },
      ],
      body:
        'The Prater is nearly empty, the fairground reduced to a few buzzing bulbs and the great iron wheel grinding its slow circle. A bored attendant takes your coins without looking and the gondola lifts you up out of the world.\n\n' +
        'From the top, Vienna is a wet circuit board of light. And there — your breath stops — down by the gates you came through, two men stand under an umbrella that no one in a downpour holds so still. A third sits in a parked Mercedes with its lights off, engine breathing white. They are not watching the wheel. They are watching the line of the canal, and waiting, and one of them is the unmistakable square shape of a man your briefing photo named Anatoly Volkov.\n\n' +
        'They already know about the canal. They knew before you did. Which means Dragomir was blown long before tonight — and someone on your own side let her run anyway.',
      choices: [
        {
          id: 'down_to_canal',
          label: 'Come down quietly and head for the canal to see the handoff for yourself.',
          destination: 'node_canal_approach',
          effects: [
            { field: 'location', op: 'change_location', value: 'loc_canal' },
            { field: 'time', op: 'add_minutes', value: '60' },
          ],
        },
        {
          id: 'meet_volkov',
          label: 'Use what you saw. Go meet Volkov in the underpass and hear his version.',
          destination: 'node_volkov',
          conditions: [{ field: 'knows_dragomir_blown', op: 'is_true' }],
          effects: [
            { field: 'location', op: 'change_location', value: 'loc_underpass' },
            { field: 'time', op: 'add_minutes', value: '55' },
          ],
        },
        {
          id: 'straight_to_train',
          label: "Don't risk it. Take Dragomir straight to the train while you still can.",
          destination: 'node_westbahnhof',
          effects: [
            { field: 'location', op: 'change_location', value: 'loc_westbahnhof' },
            { field: 'time', op: 'add_minutes', value: '70' },
          ],
        },
      ],
    },
    // 13. node_canal_approach
    {
      id: 'node_canal_approach',
      title: 'Below the Street',
      type: 'scene',
      location: 'loc_canal',
      body:
        'Stone steps take you down out of the city and into a colder, older Vienna. The embankment is a concrete ribbon under a single sodium lamp; the canal slides past black and oily, carrying the lights of the bridges in long broken smears. Footsteps echo wrong down here, doubling, so you can never be sure how many feet are really walking.\n\n' +
        'A man in a long coat stands at the third bollard, motionless, collar up. He has the stillness of someone who has waited at many bollards. On the concrete near his feet, chalk marks — arrows, a date, a little box ticked and unticked — a private language.\n\n' +
        'It is getting on toward the half-hour. If you wait in the shadow of the stairs, the appointment will keep itself in front of you. If Dragomir is with you, her hand has gone rigid on your arm.',
      choices: [
        {
          id: 'wait_for_handoff',
          label: 'Wait in the dark for 23:30 and watch who the man hands the canister to.',
          destination: 'node_westbahnhof',
          conditions: [{ field: 'time', op: 'time_before', value: '23:30' }],
          effects: [{ field: 'time', op: 'add_minutes', value: '30' }],
        },
        {
          id: 'too_late',
          label: "You're too late and the bollard is bare — go read the chalk and the cap yourself.",
          destination: 'node_canal_drop',
          conditions: [{ field: 'time', op: 'time_after', value: '23:30' }],
          effects: [
            { field: 'location', op: 'change_location', value: 'loc_canal_drop' },
            { field: 'time', op: 'add_minutes', value: '10' },
          ],
        },
        {
          id: 'pull_back',
          label: "Don't risk being seen. Pull back and run Dragomir to the train instead.",
          destination: 'node_westbahnhof',
          effects: [
            { field: 'location', op: 'change_location', value: 'loc_westbahnhof' },
            { field: 'time', op: 'add_minutes', value: '60' },
          ],
        },
      ],
    },
    // 14. node_handoff_witnessed — event ifPresentNode
    {
      id: 'node_handoff_witnessed',
      title: '23:30 — The Receiver',
      type: 'event',
      location: 'loc_canal',
      entryEffects: [
        { field: 'clues', op: 'add_clue', value: 'saw_real_receiver' },
        { field: 'handoff_witnessed', op: 'set', value: 'true' },
        { field: 'knows_dragomir_blown', op: 'set', value: 'true' },
        { field: 'volkov_suspicion', op: 'increment', value: '2' },
      ],
      body:
        'The half-hour arrives the way bad news arrives, on time. A second figure detaches from the dark under the far bridge and walks the embankment with an unhurried, professional gait. The man at the bollard lifts the loose iron cap, draws out a small steel canister, and holds it out.\n\n' +
        'You expect a Russian. You expect Volkov\'s square shoulders.\n\n' +
        "It is neither. The receiver steps into the lamplight to take the film, and you know the face — you saw it this evening, in the safehouse stairwell, carrying a message up to Lindqvist. It is Lindqvist's own runner. The film is not going to the enemy. It is going home, around you, around Dragomir, the woman erased from her own defection so the prize can travel light.\n\n" +
        'The canister changes hands. The runner pockets it and walks. The night has just shown you its true shape, and it is not the shape you were told.',
      choices: [
        {
          id: 'find_volkov',
          label: 'Go and find Volkov. If your own side is doubling you, hear what the other offers.',
          destination: 'node_volkov',
          effects: [
            { field: 'location', op: 'change_location', value: 'loc_underpass' },
            { field: 'time', op: 'add_minutes', value: '45' },
          ],
        },
        {
          id: 'say_nothing',
          label: 'Say nothing to anyone. Take Dragomir and the truth to the train.',
          destination: 'node_westbahnhof',
          effects: [
            { field: 'location', op: 'change_location', value: 'loc_westbahnhof' },
            { field: 'time', op: 'add_minutes', value: '60' },
          ],
        },
      ],
    },
    // 15. node_canal_drop — recoveryNodeId
    {
      id: 'node_canal_drop',
      title: 'The Third Bollard, Reading the Chalk',
      type: 'discovery',
      location: 'loc_canal_drop',
      entryEffects: [
        { field: 'clues', op: 'add_clue', value: 'knows_who_took_film' },
        { field: 'knows_dragomir_blown', op: 'set', value: 'true' },
        { field: 'volkov_suspicion', op: 'increment', value: '1' },
      ],
      body:
        'You come too late. The embankment is empty, the sodium lamp buzzing over nothing, and where the man stood there\'s only the iron bollard with its loose cap canted open like a mouth.\n\n' +
        'You tilt the cap. Inside, the cavity is dry and bare except for a faint oily ring where a canister sat for weeks — and the warm-metal smell of something only just taken. The film is gone, lifted minutes ago.\n\n' +
        'The chalk tells the rest. An arrow pointing back toward the city, not toward the river and the Soviet side. A small initialled mark — not Cyrillic, a plain Latin set of initials you saw stamped on the transit chit in your own satchel. Whoever took the film works for the people who sent you. The drop was never a defector\'s escape. It was your own service collecting its prize and leaving the woman behind as cover.',
      choices: [
        {
          id: 'take_to_volkov',
          label: 'Take this to Volkov. If your side did this, the other side will pay to know you know.',
          destination: 'node_volkov',
          effects: [
            { field: 'location', op: 'change_location', value: 'loc_underpass' },
            { field: 'time', op: 'add_minutes', value: '45' },
          ],
        },
        {
          id: 'pocket_chalk_run',
          label: 'Pocket the chalk truth and run Dragomir to the train before the net closes.',
          destination: 'node_westbahnhof',
          effects: [
            { field: 'location', op: 'change_location', value: 'loc_westbahnhof' },
            { field: 'time', op: 'add_minutes', value: '60' },
          ],
        },
      ],
    },
    // 16. node_volkov
    {
      id: 'node_volkov',
      title: 'The Aspern Bridge Underpass',
      type: 'conversation',
      location: 'loc_underpass',
      entryEffects: [{ field: 'volkov_suspicion', op: 'increment', value: '1' }],
      body:
        'Volkov is exactly where a man like Volkov would be: leaning in the dripping dark of the underpass, headlights sweeping the curved concrete above him like searchlights that keep missing. He is heavy, calm, amused, a cigarette cupped against the damp.\n\n' +
        '"The honest boy," he says, as if you\'d been introduced. "I have watched you all night carry a satchel and a conscience, which is one item too many for this work." Smoke leaks from his smile. "You begin to understand. The woman was sold by her own people for the thing sewn in her coat. They will take the film at the water and let her walk into my arms at the station, and call it a fair night\'s trade. Unless."\n\n' +
        'He lets unless hang there, glistening.\n\n' +
        '"Unless a courier with a conscience does something his masters never planned. I can put you both on a different train, under a different flag. She lives. You burn. Or you go to your platform and play out the hand they dealt you. Choose with whatever you have left."',
      choices: [
        {
          id: 'how_blown',
          label: '"Then tell me how she was blown — and don\'t lie, I already half know."',
          destination: 'node_volkov_truth',
          conditions: [{ field: 'knows_dragomir_blown', op: 'is_true' }],
          effects: [
            { field: 'volkov_suspicion', op: 'increment', value: '1' },
            { field: 'time', op: 'add_minutes', value: '15' },
          ],
        },
        {
          id: 'take_deal',
          label: 'Take his deal. Walk Irina out under Soviet protection and burn your own service.',
          destination: 'node_eastbound',
          conditions: [
            { field: 'handoff_witnessed', op: 'is_true' },
            { field: 'knows_dragomir_blown', op: 'is_true' },
            { field: 'volkov_suspicion', op: 'gte', value: '3' },
            { field: 'lindqvist_trust', op: 'lt', value: '2' },
          ],
          effects: [
            { field: 'took_volkov_deal', op: 'set', value: 'true' },
            { field: 'location', op: 'change_location', value: 'loc_eastbound' },
            { field: 'time', op: 'add_minutes', value: '15' },
          ],
        },
        {
          id: 'refuse_volkov',
          label: 'Refuse him. Take Dragomir and run for your own train while there\'s still time.',
          destination: 'node_westbahnhof',
          effects: [
            { field: 'location', op: 'change_location', value: 'loc_westbahnhof' },
            { field: 'time', op: 'add_minutes', value: '30' },
          ],
        },
      ],
    },
    // 17. node_volkov_truth
    {
      id: 'node_volkov_truth',
      title: 'Armed With the Truth',
      type: 'conversation',
      location: 'loc_underpass',
      body:
        'He hears you out, and something shifts behind the amused eyes — he respects that you came armed with the truth instead of hope. "Good," Volkov says softly. "You did not come to me empty-handed, or empty-headed. That is rarer than you know." The cigarette glows. "So. You understand the shape of it now. The only question left is the one I already asked you."\n\n' +
        'The clock is running hard now. Whatever you decide, decide it standing.',
      choices: [
        {
          id: 'take_deal',
          label: 'Take his deal.',
          destination: 'node_eastbound',
          conditions: [
            { field: 'handoff_witnessed', op: 'is_true' },
            { field: 'knows_dragomir_blown', op: 'is_true' },
            { field: 'volkov_suspicion', op: 'gte', value: '3' },
            { field: 'lindqvist_trust', op: 'lt', value: '2' },
          ],
          effects: [
            { field: 'took_volkov_deal', op: 'set', value: 'true' },
            { field: 'location', op: 'change_location', value: 'loc_eastbound' },
            { field: 'time', op: 'add_minutes', value: '5' },
          ],
        },
        {
          id: 'refuse_and_run',
          label: 'Refuse and run for your train.',
          destination: 'node_westbahnhof',
          effects: [
            { field: 'location', op: 'change_location', value: 'loc_westbahnhof' },
            { field: 'time', op: 'add_minutes', value: '30' },
          ],
        },
      ],
    },
    // 18. node_westbahnhof — resolvesEnding
    {
      id: 'node_westbahnhof',
      title: 'Westbahnhof, Platform 3',
      type: 'transition',
      location: 'loc_westbahnhof',
      resolvesEnding: true,
      body:
        'The great iron-and-glass hall swallows you, all echo and cold draughts and the clatter of the departures board shedding its letters. Down the length of Platform 3 the 02:10 to Salzburg stands steaming, doors open, a conductor pacing the wet concrete and checking a watch he doesn\'t own.\n\n' +
        'This is the clock made into iron and steam. Whatever you decided in the rain back there, whoever is on your arm, whatever rides in your coat — it all arrives here, at the edge of the platform, where the night finally adds up.\n\n' +
        'You check your own watch and feel the whole evening narrow to a single number.',
      choices: [],
    },
    // 19. node_eastbound — resolvesEnding
    {
      id: 'node_eastbound',
      title: 'A Slower Train, Eastbound',
      type: 'transition',
      location: 'loc_eastbound',
      resolvesEnding: true,
      body:
        "Volkov's hand closes the deal in the dripping dark, and the world tilts onto a different rail. There is no 02:10 for you now — only a private compartment on a slower train, and a different flag stamped on papers that arrive too smoothly to be anything but long-prepared.",
      choices: [],
    },
  ],
  endings: [
    {
      id: 'ending_missed',
      name: 'The 02:11 Platform',
      summary: 'You spent too long learning the truth and the 02:10 left without you.',
      conditions: [{ field: 'time', op: 'time_after', value: '26:10' }],
      body:
        'You come up the platform stairs at a run and stop dead.\n\n' +
        'The 02:10 is two red lamps shrinking into the rain at the far end of the hall, the steam already thinning where it stood. The conductor is gone. The departures board clatters once and goes still. Platform 3 is a long empty stretch of wet concrete and your own hard breathing.\n\n' +
        'Whatever you learned tonight — about Lindqvist, about the canal, about the woman and the film and who was selling whom — you spent too long learning it. The night had a single hard edge, 02:10, and the edge has passed, and edges in this work do not forgive.\n\n' +
        'If Irina is beside you, she says nothing; she has missed trains before and knows what the silence after means. If you\'re alone, the silence is only yours. Either way you are still in Vienna, with the rain coming through the great iron roof in slow grey curtains, and six hours that were never quite enough have run all the way out.\n\n' +
        'Somewhere across the city a telephone is ringing in a safehouse, and no one is going to answer it in time. The 02:11 is just a number. There is no 02:11. There is only the empty platform, and the long cold walk back into a city that knows your face now.',
    },
    {
      id: 'ending_double',
      name: 'The Man Who Knew Too Much',
      summary: 'You took Volkov\'s deal and rode east, burning your own service for the truth.',
      conditions: [{ field: 'took_volkov_deal', op: 'is_true' }],
      body:
        'You take Volkov\'s hand in the dripping dark, and the world tilts onto a different rail.\n\n' +
        'There is no 02:10 for you now — there is a private compartment on a slower train and a different flag stamped on papers that arrive too smoothly to be anything but long-prepared. Irina sits across from you, pale, alive, watching you with an expression that is not gratitude and not quite contempt: the look of someone who has traded one set of masters for another and knows exactly what it costs.\n\n' +
        '"You burned them," she says. "Your own people. For me, or for the film, or to be the one who saw the truth — I will never be sure which." Volkov, in the corridor, is already on the telephone in soft fast Russian, and you understand that the forty-one frames will be read in Moscow now, not London, and that you are the courier who carried them there.\n\n' +
        'You are warm. You are alive. You will never go home. Outside, Vienna lets you go without a sound, and the rain on the glass runs the wrong way, east, into the dark you swore you\'d never enter.\n\n' +
        'Some victories you only recognise as defeats much later, on quiet platforms, in cities you can no longer leave.',
    },
    {
      id: 'ending_clean',
      name: 'The Last Train West',
      summary: 'In time, trusted, together, the real film in your coat — the clean extraction.',
      conditions: [
        { field: 'time', op: 'time_before', value: '26:10' },
        { field: 'dragomir_trust', op: 'gte', value: '3' },
        { field: 'companion', op: 'equals', value: 'dragomir' },
        { field: 'has_real_microfilm', op: 'is_true' },
      ],
      body:
        'You hand the conductor two tickets that are mostly lies and he stamps them without caring. Irina steps up into the warm yellow carriage and you follow, and the doors fold shut behind you with a sound like a held breath finally let go.\n\n' +
        'The oilcloth packet sits against your ribs now, forty-one frames the world shouldn\'t have, riding west under a stranger\'s name. At 02:10 exactly the platform begins to slide backward — the conductor, the wet concrete, the city of trams and smoke and black canal water all loosening their grip at once.\n\n' +
        'Irina watches Vienna go. "You carried it like it was heavy," she says quietly, and almost smiles. "Most of them never do."\n\n' +
        'The rain streaks the glass into long silver threads. Somewhere behind you a handler is explaining to London why the prize and the woman both got away clean. Let him explain. You did the simple thing, in the end — you walked a frightened person out of the dark — and for one green courier on his first solo night, that is the whole of the victory.\n\n' +
        'The train finds open country and the lights of the suburbs thin to nothing. West. Just west, and the held breath of the dark behind you.',
    },
    {
      id: 'ending_burned',
      name: 'Smoke on the Embankment',
      summary: 'She never trusted you and Volkov\'s net closed; you ride west with nothing that matters.',
      conditions: [
        { field: 'dragomir_trust', op: 'lt', value: '3' },
        { field: 'volkov_suspicion', op: 'gte', value: '4' },
      ],
      body:
        'The doors close. The platform slides away. Whatever you carry now — the decoy she shoved across the marble, or nothing at all — it weighs the same: nothing. You never earned the real film.\n\n' +
        'She never handed you the real film. You never gave her reason to. Whether she is sitting across from you now, watching the dark city let you go, or whether the wet streets swallowed her the moment you stopped being worth following — the failure is the same. You never earned the real film. You never earned the right to carry her out.\n\n' +
        'And somewhere back in Vienna, Volkov\'s net has finished drawing closed around a frightened physicist who ran out of people to believe in. You\'ll read about it, or you won\'t; either way it is no longer yours to fix.\n\n' +
        'The conductor passes, checking his borrowed watch. Salzburg by dawn. A debrief. A quiet conversation about what went wrong, in which no one will quite say it was you.\n\n' +
        'The rain stops somewhere past the city limits. You watch your own reflection in the black glass — a green courier on his first solo night, going home with the right lesson, learned too late to spend: in this work, trust is the only currency, and you walked into Vienna unable to afford a thing.\n\n' +
        'The night moved on without you. It always does.',
    },
    {
      id: 'ending_default',
      name: 'A Cold Vienna Dawn',
      summary: 'The night resolved into none of its sharp shapes — only grey morning and unanswered questions.',
      isDefault: true,
      conditions: [],
      body:
        'The night resolves into none of its sharp shapes. No clean carriage west, no eastbound betrayal, no empty platform with its single hard lesson — only the long grey hours thinning toward a cold Vienna dawn.\n\n' +
        'You made the train, or you didn\'t quite; you learned a little, or not enough; and somewhere between the canal and the station the evening simply ran out of edges to cut you on. The rain eases. The trams start their first runs. Whatever you carried and whoever you carried it for, the city takes it back into itself without comment, the way it has taken a hundred quieter nights than this one.',
    },
  ],
};
