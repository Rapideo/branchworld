import { describe, it, expect } from 'vitest';
import type { Story } from './types';
import { lintTravel, roamTimeThresholds, checkBucketAlignment } from './travelLint';

function base(): Story {
  return {
    id: 't', title: 'T', startNodeId: 'a_hub', startTime: '00:00', startLocation: 'a',
    profile: { clock: 'untimed', travel: 'free' },
    variables: [], events: [], resources: [],
    locations: [
      { id: 'a', name: 'A', connectedLocations: ['b'], travelTimes: { b: 10 }, defaultNode: 'a_hub' },
      { id: 'b', name: 'B', connectedLocations: ['a'], travelTimes: { a: 10 }, defaultNode: 'b_hub' },
    ],
    nodes: [
      { id: 'a_hub', title: 'A', body: '', choices: [{ id: 'fin', label: 'F', destination: 'a_end' }] },
      { id: 'a_end', title: 'E', body: '', choices: [], resolvesEnding: true },
      { id: 'b_hub', title: 'B', body: '', choices: [{ id: 'fin', label: 'F', destination: 'a_end' }] },
    ],
    endings: [{ id: 'fin', name: 'F', conditions: [], isDefault: true, summary: '' }],
  };
}

describe('travel structural lints', () => {
  it('clean roam graph lints clean', () => {
    expect(lintTravel(base(), { clock: 'untimed', travel: 'free' })).toEqual([]);
  });
  it('TRAVEL_MISSING_TIME / TRAVEL_UNKNOWN_LOCATION / TRAVEL_NO_HUB / TRAVEL_ASYMMETRIC_EDGE', () => {
    const s = base();
    s.locations[0].travelTimes = {};                  // missing time a->b
    s.locations[0].connectedLocations = ['b', 'zzz']; // unknown loc 'zzz'
    s.locations[1].connectedLocations = [];           // b no longer connects back to a => a->b is asymmetric
    s.locations[1].defaultNode = undefined;           // b has no hub
    const codes = lintTravel(s, { clock: 'untimed', travel: 'free' }).map((i) => i.code);
    expect(codes).toContain('TRAVEL_MISSING_TIME');
    expect(codes).toContain('TRAVEL_UNKNOWN_LOCATION');
    expect(codes).toContain('TRAVEL_NO_HUB');
    expect(codes).toContain('TRAVEL_ASYMMETRIC_EDGE'); // a lists b, b no longer lists a
  });
  it('TRAVEL_HUB_IS_TERMINAL warns when a location hub resolves an ending', () => {
    const s = base();
    s.nodes[2].resolvesEnding = true; // b_hub is now terminal
    s.nodes[2].choices = [];
    const codes = lintTravel(s, { clock: 'untimed', travel: 'free' }).map((i) => i.code);
    expect(codes).toContain('TRAVEL_HUB_IS_TERMINAL');
  });
  it('TRAVEL_GRAPH_IGNORED warns when a graph is declared but travel:off', () => {
    const codes = lintTravel(base(), { clock: 'untimed', travel: 'off' }).map((i) => i.code);
    expect(codes).toContain('TRAVEL_GRAPH_IGNORED');
  });
});

describe('roam finiteness lint', () => {
  it('ROAM_UNBOUNDED_HUB_WRITE bites on an unbounded increment and adjust_resource, passes a bounded counter', () => {
    const s = base();
    s.variables = [{ name: 'n', type: 'number', default: 0, purpose: 'unbounded' }];
    s.nodes[0].entryEffects = [{ field: 'n', op: 'increment', value: '1' }]; // no max → unbounded
    const codes = lintTravel(s, { clock: 'untimed', travel: 'free' }).map((i) => i.code);
    expect(codes).toContain('ROAM_UNBOUNDED_HUB_WRITE');

    const s2 = base();
    s2.variables = [{ name: 'n', type: 'number', default: 0, min: 0, max: 3, purpose: 'bounded' }];
    s2.nodes[0].entryEffects = [{ field: 'n', op: 'increment', value: '1' }]; // has max → fine
    expect(lintTravel(s2, { clock: 'untimed', travel: 'free' }).map((i) => i.code)).not.toContain('ROAM_UNBOUNDED_HUB_WRITE');
  });
});

describe('bucket alignment (verification-time check)', () => {
  it('thresholds collect time gates; a misaligned bucket bites, an aligned one passes', () => {
    const s = base();
    s.profile = { clock: 'timed', travel: 'free' };
    s.deadline = '01:00'; // 60
    s.nodes[0].choices[0].conditions = [{ field: 'time', op: 'time_after', value: '00:15' }]; // 15
    expect(roamTimeThresholds(s).sort((a, b) => a - b)).toEqual([15, 60]);
    expect(checkBucketAlignment(s, 10).map((i) => i.code)).toContain('ROAM_BUCKET_MISALIGNED'); // 10 ∤ 15
    expect(checkBucketAlignment(s, 5)).toEqual([]); // 5 | 15 and 5 | 60
  });
});
