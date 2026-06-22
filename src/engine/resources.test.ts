import { describe, it, expect } from 'vitest';
import { applyResourceStep } from './resources';
import type { Story, WorldState } from './types';

function lampStory(): Story {
  return {
    id: 'g', title: 'g', startNodeId: 'n', startTime: '15:00', deadline: '18:00', startLocation: 'L',
    variables: [{ name: 'dead', type: 'boolean', default: false, purpose: 'd' }],
    nodes: [], locations: [], events: [], endings: [],
    resources: [{
      id: 'lamp', min: 0, max: 4, start: 4,
      depletion: { everyMinutes: 30, amount: 1 },
      atZero: { ending: 'ending_dark', setFlag: 'dead' },
    }],
  } as unknown as Story;
}
const at = (time: number): WorldState => ({
  time, location: 'L', clues: [], inventory: [], visited: [], completedEvents: [], vars: { lamp: 4, dead: false },
});
const START = 900; // 15:00

describe('applyResourceStep — time-driven depletion', () => {
  it('recomputes the lamp from the clock', () => {
    expect(applyResourceStep(at(900), lampStory(), START).state.vars.lamp).toBe(4);   // 0 elapsed
    expect(applyResourceStep(at(960), lampStory(), START).state.vars.lamp).toBe(2);   // 60 min -> -2
    expect(applyResourceStep(at(1020), lampStory(), START).state.vars.lamp).toBe(0);  // 120 min -> clamp 0
  });
  it('fires at-zero: sets the flag and reports the ending', () => {
    const r = applyResourceStep(at(1020), lampStory(), START);
    expect(r.state.vars.dead).toBe(true);
    expect(r.atZeroEndingId).toBe('ending_dark');
  });
  it('does nothing for a story with no resources', () => {
    const none = { ...lampStory(), resources: [] } as unknown as Story;
    const s = at(1020);
    expect(applyResourceStep(s, none, START).state).toBe(s);
  });
});
