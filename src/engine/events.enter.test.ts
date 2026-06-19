import { describe, it, expect } from 'vitest';
import { GameEngine } from './engine';
import { mkStory } from '../test/storyFixture';

describe('scheduled events fire on enter()', () => {
  it('fires an event when the trigger time is crossed by a node entry effect (not a choice effect)', () => {
    // Start 20:00. choose('go') applies no time-changing choice effect — the clock is
    // advanced entirely by the destination node's entryEffect (+160 min = 22:40), which
    // crosses the 22:30 trigger while the player is present at loc_canal.
    const story = mkStory({
      startTime: '20:00',
      deadline: '23:00',
      locations: [{ id: 'loc_a', name: 'A' }, { id: 'loc_canal', name: 'Canal' }],
      nodes: [
        {
          id: 'start',
          title: 'Start',
          body: '',
          choices: [
            {
              id: 'go',
              label: 'Go to the canal',
              destination: 'canal',
              effects: [{ field: 'location', op: 'change_location', value: 'loc_canal' }],
            },
          ],
        },
        {
          id: 'canal',
          title: 'Canal',
          body: '',
          location: 'loc_canal',
          // 20:00 + 160 min = 22:40, crossing the 22:30 trigger while present at loc_canal
          entryEffects: [{ field: 'time', op: 'add_minutes', value: '160' }],
          choices: [{ id: 'wait', label: 'Wait', destination: 'canal2' }],
        },
        { id: 'canal2', title: 'Later', body: '', choices: [], resolvesEnding: true },
        { id: 'present', title: 'You saw it', body: '', choices: [], resolvesEnding: true },
      ],
      events: [
        {
          id: 'ev',
          title: 'Handoff',
          trigger: [{ field: 'time', op: 'time_after', value: '22:30' }],
          eventLocation: 'loc_canal',
          ifPresentNode: 'present',
          ifAbsentEffects: [{ field: 'missed', op: 'set', value: 'true' }],
          recoveryNodeId: 'canal2',
        },
      ],
      variables: [{ name: 'missed', type: 'boolean', default: false, purpose: 'missed the handoff' }],
    });

    const eng = new GameEngine(story);
    const v = eng.choose('go');

    // Player is present at loc_canal when the clock crosses 22:30 via the entry effect -> diverts to present.
    expect(v.node.id).toBe('present');
    expect(v.log.some((l) => l.includes('ev') && l.includes('present'))).toBe(true);
  });
});
