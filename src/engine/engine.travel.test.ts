import { describe, it, expect } from 'vitest';
import type { Story } from './types';
import { GameEngine } from './engine';

// Two connected locations, each a hub node; travel:'free'.
function roamStory(): Story {
  return {
    id: 't', title: 'T', startNodeId: 'a_hub', startTime: '00:00', startLocation: 'a',
    profile: { clock: 'untimed', travel: 'free' },
    variables: [], events: [], resources: [],
    locations: [
      { id: 'a', name: 'Aaa', connectedLocations: ['b'], travelTimes: { b: 10 }, defaultNode: 'a_hub' },
      { id: 'b', name: 'Bbb', connectedLocations: ['a'], travelTimes: { a: 10 }, defaultNode: 'b_hub' },
    ],
    nodes: [
      { id: 'a_hub', title: 'A', body: '', choices: [{ id: 'finish', label: 'Finish', destination: 'a_end' }] },
      { id: 'a_end', title: 'End', body: '', choices: [], resolvesEnding: true },
      { id: 'b_hub', title: 'B', body: '', choices: [{ id: 'finish', label: 'Finish', destination: 'a_end' }] },
    ],
    endings: [{ id: 'fin', name: 'Fin', conditions: [], isDefault: true, summary: '' }],
  };
}

describe('engine travel wiring', () => {
  it('injects a travel choice at the hub and the trip moves + costs time', () => {
    const eng = new GameEngine(roamStory());
    const v0 = eng.view();
    expect(v0.choices.map((c) => c.id)).toContain('__travel_b'); // injected alongside the authored 'finish'
    const v1 = eng.choose('__travel_b');
    expect(v1.location).toBe('b');
    expect(v1.time).toBe(10);             // paid travelTimes a->b
    expect(v1.node.id).toBe('b_hub');     // entered b's default node
    expect(v1.choices.map((c) => c.id)).toContain('__travel_a'); // and b offers the way back
  });

  it('travel:off injects nothing (behaviorally inert)', () => {
    const s = roamStory();
    s.profile = { clock: 'untimed', travel: 'off' };
    const eng = new GameEngine(s);
    expect(eng.view().choices.map((c) => c.id)).toEqual(['finish']);
  });

  it('an illegal travel id throws a travel-specific error, not "Unknown choice"', () => {
    const eng = new GameEngine(roamStory());
    expect(() => eng.choose('__travel_zzz')).toThrowError(/not connected/);
  });
});
