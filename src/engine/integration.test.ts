import { describe, it, expect } from 'vitest';
import { GameEngine, lintStory, type Story } from './index';

function miniGame(): Story {
  return {
    id: 'mini', title: 'Mini', startNodeId: 'start', startTime: '15:00', deadline: '16:00',
    startLocation: 'Diner',
    variables: [{ name: 'knows', type: 'boolean', default: false, purpose: 'knowledge of the envelope' }],
    locations: [{ id: 'Diner', name: 'The Diner' }, { id: 'Arcade', name: 'The Arcade' }],
    events: [{
      id: 'E', title: 'pickup',
      trigger: [{ field: 'time', op: 'time_after', value: '15:30' }],
      eventLocation: 'Diner', ifPresentNode: 'witness',
      ifAbsentEffects: [{ field: 'clues', op: 'add_clue', value: 'receipt' }],
      recoveryNodeId: 'receipt',
    }],
    nodes: [
      { id: 'start', title: 'Start', body: 'The diner is quiet.', choices: [
        { id: 'ask', label: 'Ask about the envelope', destination: 'leave',
          effects: [{ field: 'knows', op: 'set', value: 'true' }, { field: 'time', op: 'add_minutes', value: '70' }] },
        { id: 'go_arcade', label: 'Walk to the arcade', destination: 'arcade',
          effects: [{ field: 'location', op: 'change_location', value: 'Arcade' }, { field: 'time', op: 'add_minutes', value: '70' }] },
      ] },
      { id: 'leave', title: 'Leave', body: 'You step out.', resolvesEnding: true, choices: [] },
      { id: 'arcade', title: 'Arcade', body: 'Pinball clatters.', choices: [
        { id: 'home', label: 'Head home', destination: 'leave' },
        { id: 'back', label: 'Go back to the diner', destination: 'receipt' },
      ] },
      { id: 'witness', title: 'Witness', body: 'You saw it.', resolvesEnding: true, choices: [] },
      { id: 'receipt', title: 'Receipt', body: 'A torn receipt.', resolvesEnding: true, choices: [] },
    ],
    endings: [
      { id: 'informed', name: 'Informed', summary: 'You learned the truth.', conditions: [{ field: 'knows', op: 'is_true' }] },
      { id: 'default', name: 'In the dark', summary: 'You never found out.', conditions: [], isDefault: true },
    ],
  };
}

describe('integration', () => {
  it('lints clean', () => {
    const r = lintStory(miniGame());
    expect(r.ok).toBe(true);
  });

  it('reaches the informed ending by asking (present at the event)', () => {
    const g = new GameEngine(miniGame());
    const v = g.choose('ask'); // +70 min -> 16:10, present at Diner: event routes to witness; knows=true
    expect(v.endingReached?.id).toBe('informed');
  });

  it('reaches the default ending by leaving town uninformed', () => {
    const g = new GameEngine(miniGame());
    g.choose('go_arcade');        // leaves Diner (absent), +70 -> receipt clue planted, lands at arcade
    const v = g.choose('home');   // -> leave (resolvesEnding); knows still false
    expect(v.endingReached?.id).toBe('default');
  });
});
