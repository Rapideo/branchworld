import { describe, it, expect } from 'vitest';
import { resolveEnding } from './endingResolver';
import type { Story, WorldState } from './types';
import { mkStory } from '../test/storyFixture';

function storyWith(endings: Story['endings']): Story {
  return {
    id: 'g', title: 'g', startNodeId: 'n', startTime: '15:00', deadline: '18:00',
    startLocation: 'L', variables: [], nodes: [], locations: [], events: [], endings,
  };
}
const s = (vars: Record<string, number>): WorldState => ({
  time: 0, location: 'L', clues: [], inventory: [], visited: [], completedEvents: [], vars,
});

describe('endingResolver', () => {
  const story = storyWith([
    { id: 'win', name: 'Win', summary: 'w', conditions: [{ field: 'score', op: 'gte', value: '3' }] },
    { id: 'ok', name: 'Ok', summary: 'o', conditions: [{ field: 'score', op: 'gte', value: '1' }] },
    { id: 'default', name: 'Default', summary: 'd', conditions: [], isDefault: true },
  ]);
  it('returns the first non-default match in order', () => {
    expect(resolveEnding(s({ score: 5 }), story)?.id).toBe('win');
    expect(resolveEnding(s({ score: 2 }), story)?.id).toBe('ok');
  });
  it('falls back to the default when nothing matches (no zero-match holes)', () => {
    expect(resolveEnding(s({ score: 0 }), story)?.id).toBe('default');
  });
  it('returns default even if it is not last in the list', () => {
    const reordered = storyWith([
      { id: 'default', name: 'D', summary: 'd', conditions: [], isDefault: true },
      { id: 'win', name: 'W', summary: 'w', conditions: [{ field: 'score', op: 'gte', value: '3' }] },
    ]);
    expect(resolveEnding(s({ score: 9 }), reordered)?.id).toBe('win');
    expect(resolveEnding(s({ score: 0 }), reordered)?.id).toBe('default');
  });

  it('prefers the higher-priority ending when two conditions are both satisfied', () => {
    const story = mkStory({
      variables: [{ name: 'score', type: 'number', default: 0, purpose: 's' }],
      endings: [
        { id: 'broad', name: 'Broad', summary: '', conditions: [{ field: 'score', op: 'gte', value: '1' }], priority: 0 },
        { id: 'specific', name: 'Specific', summary: '', conditions: [{ field: 'score', op: 'gte', value: '5' }], priority: 10 },
        { id: 'def', name: 'Default', summary: '', conditions: [], isDefault: true },
      ],
    });
    const state = { time: 0, location: 'loc_a', clues: [], inventory: [], visited: [], completedEvents: [], vars: { score: 10 } };
    expect(resolveEnding(state, story)?.id).toBe('specific');
  });

  it('returns the first ending on equal non-zero priority (stable tie-break)', () => {
    const story = mkStory({
      variables: [{ name: 'score', type: 'number', default: 0, purpose: 's' }],
      endings: [
        { id: 'first', name: 'First', summary: '', conditions: [{ field: 'score', op: 'gte', value: '1' }], priority: 5 },
        { id: 'second', name: 'Second', summary: '', conditions: [{ field: 'score', op: 'gte', value: '1' }], priority: 5 },
        { id: 'def', name: 'Default', summary: '', conditions: [], isDefault: true },
      ],
    });
    const state = { time: 0, location: 'loc_a', clues: [], inventory: [], visited: [], completedEvents: [], vars: { score: 10 } };
    expect(resolveEnding(state, story)?.id).toBe('first');
  });
});
