import { describe, it, expect } from 'vitest';
import type { Story } from './types';
import { lintStory } from './linter';

// b_hub is reachable ONLY via travel from a_hub (no authored choice points to it).
function roamStory(): Story {
  return {
    id: 't', title: 'T', startNodeId: 'a_hub', startTime: '00:00', startLocation: 'a',
    profile: { clock: 'untimed', travel: 'free' },
    variables: [], events: [], resources: [],
    locations: [
      { id: 'a', name: 'A', connectedLocations: ['b'], travelTimes: { b: 10 }, defaultNode: 'a_hub' },
      { id: 'b', name: 'B', connectedLocations: ['a'], travelTimes: { a: 10 }, defaultNode: 'b_hub' },
    ],
    nodes: [
      { id: 'a_hub', title: 'A', body: '', choices: [{ id: 'fin', label: 'Finish', destination: 'a_end' }] },
      { id: 'a_end', title: 'End', body: '', choices: [], resolvesEnding: true },
      { id: 'b_hub', title: 'B', body: '', choices: [{ id: 'fin', label: 'Finish', destination: 'a_end' }] },
    ],
    endings: [{ id: 'fin', name: 'Fin', conditions: [], isDefault: true, summary: '' }],
  };
}

describe('linter travel-awareness', () => {
  it('a travel-only node is NOT flagged UNREACHABLE when travel:free', () => {
    const codes = lintStory(roamStory()).warnings.map((w) => w.code);
    expect(codes).not.toContain('UNREACHABLE_NODE'); // b_hub is reachable via the roam edge
  });
  it('RESERVED_CHOICE_ID bites on a __-prefixed authored choice id', () => {
    const s = roamStory();
    s.nodes[0].choices.push({ id: '__travel_b', label: 'x', destination: 'a_end' });
    const codes = lintStory(s).errors.map((e) => e.code);
    expect(codes).toContain('RESERVED_CHOICE_ID');
  });

  it('timeBounds counts travel minutes: a travel-driven timed roam game is NOT falsely CLOCK_CANNOT_BITE', () => {
    // No authored add_minutes — the clock bites ONLY via travel. Longest simple path a->b->(back to a, cycle-guard
    // terminates) accumulates 20 travel-min, so a 15-min window can bite. Without travel-aware timeBounds, maxTime
    // would be 0 (authored minutes only) and CLOCK_CANNOT_BITE would falsely fire.
    const s = roamStory();
    s.profile = { clock: 'timed', travel: 'free' };
    s.startTime = '00:00';
    s.deadline = '00:15';
    const codes = lintStory(s).errors.map((e) => e.code);
    expect(codes).not.toContain('CLOCK_CANNOT_BITE');
  });
});
