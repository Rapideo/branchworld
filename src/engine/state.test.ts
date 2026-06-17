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
});
