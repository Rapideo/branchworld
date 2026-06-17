import type { Story } from '../engine';

export const sampleStory: Story = {
  id: 'sample_410',
  title: 'The 4:10 Envelope (mini)',
  startNodeId: 'start',
  startTime: '15:30',
  deadline: '16:15',
  startLocation: 'L_DINER',
  variables: [
    { name: 'knows_envelope', type: 'boolean', default: false, purpose: 'Player has learned about the 4:10 pickup' },
    { name: 'mara_trust', type: 'number', default: 0, purpose: 'How much Mara trusts the player' },
    { name: 'saw_pickup', type: 'boolean', default: false, purpose: 'Player witnessed the envelope pickup' },
  ],
  locations: [
    { id: 'L_DINER', name: 'The Diner' },
    { id: 'L_ARCADE', name: 'The Arcade' },
  ],
  events: [{
    id: 'E_PICKUP', title: 'Envelope Pickup',
    trigger: [{ field: 'time', op: 'time_after', value: '16:00' }],
    eventLocation: 'L_DINER',
    ifPresentNode: 'witness',
    ifAbsentEffects: [{ field: 'clues', op: 'add_clue', value: 'receipt' }],
    recoveryNodeId: 'find_receipt',
  }],
  nodes: [
    { id: 'start', title: 'A Booth by the Window', body: 'The diner is half-empty. {{time}}.', location: 'L_DINER', choices: [
      { id: 'ask', label: 'Ask Mara what she heard', destination: 'briefed',
        effects: [{ field: 'knows_envelope', op: 'set', value: 'true' }, { field: 'mara_trust', op: 'increment', value: '1' }, { field: 'time', op: 'add_minutes', value: '10' }] },
      { id: 'arcade', label: 'Walk to the arcade', destination: 'arcade',
        effects: [{ field: 'location', op: 'change_location', value: 'L_ARCADE' }, { field: 'time', op: 'add_minutes', value: '20' }] },
      { id: 'home', label: 'Head home', destination: 'leftearly',
        effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
    ] },
    { id: 'briefed', title: 'Mara Leans In', body: "'Back booth, around 4:10. Don't stare.'", location: 'L_DINER', choices: [
      { id: 'press', label: 'Press her for the details', destination: 'watch',
        conditions: [{ field: 'mara_trust', op: 'gte', value: '2' }],
        effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      { id: 'apologize', label: 'Apologize for prying', destination: 'closer',
        effects: [{ field: 'mara_trust', op: 'increment', value: '1' }, { field: 'time', op: 'add_minutes', value: '5' }] },
      { id: 'watchnow', label: 'Settle in and watch the booth', destination: 'watch',
        effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
    ] },
    { id: 'closer', title: 'She Softens', body: 'She exhales and meets your eye. {{time}}.', location: 'L_DINER', choices: [
      { id: 'press', label: 'Press her for the details', destination: 'watch',
        conditions: [{ field: 'mara_trust', op: 'gte', value: '2' }],
        effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      { id: 'watchnow', label: 'Settle in and watch the booth', destination: 'watch',
        effects: [{ field: 'time', op: 'add_minutes', value: '8' }] },
    ] },
    { id: 'watch', title: 'The Stakeout', body: 'You nurse a coffee and watch the back booth.', location: 'L_DINER', choices: [
      { id: 'keep', label: 'Keep watching', destination: 'missed',
        effects: [{ field: 'time', op: 'add_minutes', value: '20' }] },
      { id: 'leave', label: 'Give up and step out', destination: 'leftlate',
        effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
    ] },
    { id: 'arcade', title: 'The Arcade', body: 'Pinball and neon hum. {{time}}.', location: 'L_ARCADE', choices: [
      { id: 'play', label: 'Lose track of time at the machines', destination: 'arcade2',
        effects: [{ field: 'time', op: 'add_minutes', value: '20' }] },
    ] },
    { id: 'arcade2', title: 'A Buzz', body: 'Your phone buzzes. You have a feeling you missed something.', location: 'L_ARCADE', choices: [
      { id: 'headback', label: 'Hurry back to the diner', destination: 'find_receipt',
        effects: [{ field: 'location', op: 'change_location', value: 'L_DINER' }, { field: 'time', op: 'add_minutes', value: '10' }] },
    ] },
    { id: 'find_receipt', title: 'The Receipt', body: 'By the back booth, a crumpled receipt lies on the floor.', location: 'L_DINER', resolvesEnding: true, choices: [] },
    { id: 'witness', title: 'The Pickup', body: 'A man in a gray coat lifts the folded newspaper and is gone.', location: 'L_DINER',
      entryEffects: [{ field: 'saw_pickup', op: 'set', value: 'true' }], resolvesEnding: true, choices: [] },
    { id: 'missed', title: 'Empty Booth', body: 'When you look again, the booth is empty.', location: 'L_DINER', resolvesEnding: true, choices: [] },
    { id: 'leftearly', title: 'Home', body: 'You walk away before any of it begins.', location: 'L_DINER', resolvesEnding: true, choices: [] },
    { id: 'leftlate', title: 'The Sidewalk', body: 'You step out into the late afternoon, none the wiser.', location: 'L_DINER', resolvesEnding: true, choices: [] },
  ],
  endings: [
    { id: 'witnessed', name: 'The Witness', summary: 'You saw the handoff with your own eyes.', conditions: [{ field: 'saw_pickup', op: 'is_true' }] },
    { id: 'receipt_trail', name: 'The Receipt', summary: 'You missed the pickup but found the trail it left.', conditions: [{ field: 'clues', op: 'has_clue', value: 'receipt' }] },
    { id: 'informed', name: 'In the Know', summary: 'You learned the truth but never proved it.', conditions: [{ field: 'knows_envelope', op: 'is_true' }] },
    { id: 'default', name: 'In the Dark', summary: 'The afternoon passed you by.', conditions: [], isDefault: true },
  ],
};
