import { describe, it, expect } from 'vitest';
import { initState, readVar } from './state';
import type { Story } from './types';

const story: Story = {
  id: 'g', title: 'g', startNodeId: 'n1', startTime: '15:00', deadline: '18:00',
  startLocation: 'L_HOME',
  variables: [
    { name: 'trust', type: 'number', default: 0, purpose: 'trust' },
    { name: 'knows', type: 'boolean', default: false, purpose: 'knowledge' },
  ],
  nodes: [], locations: [], events: [], endings: [],
};

describe('state', () => {
  it('initializes from story start values and variable defaults', () => {
    const s = initState(story);
    expect(s.time).toBe(900);
    expect(s.location).toBe('L_HOME');
    expect(s.vars.trust).toBe(0);
    expect(s.vars.knows).toBe(false);
    expect(s.clues).toEqual([]);
    expect(s.visited).toEqual([]);
  });
  it('readVar resolves reserved fields and vars', () => {
    const s = initState(story);
    expect(readVar(s, 'time')).toBe(900);
    expect(readVar(s, 'location')).toBe('L_HOME');
    expect(readVar(s, 'trust')).toBe(0);
    expect(readVar(s, 'missing')).toBeUndefined();
  });
  it('seeds resource start values into vars', () => {
    const story = {
      id: 'g', title: 'g', startNodeId: 'n', startTime: '15:00', deadline: '16:00', startLocation: 'L',
      variables: [], nodes: [], locations: [], events: [], endings: [],
      resources: [{ id: 'lamp', min: 0, max: 4, start: 4 }, { id: 'cash', min: 0, max: 9, start: 2 }],
    } as unknown as import('./types').Story;
    const s = initState(story);
    expect(s.vars.lamp).toBe(4);
    expect(s.vars.cash).toBe(2);
  });
});
