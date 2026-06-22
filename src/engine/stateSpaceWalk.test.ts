import { describe, it, expect } from 'vitest';
import { walkStateSpace } from './stateSpaceWalk';
import type { Story } from './types';
import { praterLine } from '../content/praterLine';
import { sampleStory } from '../content/sampleStory';

describe.each([['praterLine', praterLine], ['sampleStory', sampleStory]])('state-space: %s', (_n, story) => {
  const r = walkStateSpace(story);
  it('completes exhaustively (cap not hit)', () => expect(r.capHit).toBe(false));
  it('EE-3: no reachable state resolves to zero endings', () => expect(r.zeroEnding).toEqual([]));
  it('no soft-locks', () => expect(r.softlocks).toEqual([]));
  it('no orphan endings', () => expect(r.orphanEndings).toEqual([]));
  it('EE-2: every event has a reachable recovery', () => expect(r.eventRecovery.filter((e) => !e.ok)).toEqual([]));
});

describe('walkStateSpace — resources stay tractable', () => {
  function caveStory(): Story {
    return {
      id: 'cave', title: 'cave', startNodeId: 'a', startTime: '15:00', deadline: '20:00', startLocation: 'L',
      variables: [{ name: 'dead', type: 'boolean', default: false, purpose: 'd' }],
      locations: [], events: [],
      resources: [{ id: 'lamp', min: 0, max: 4, start: 4, depletion: { everyMinutes: 30, amount: 1 }, atZero: { ending: 'ending_dark', setFlag: 'dead' } }],
      nodes: [
        { id: 'a', title: 'A', body: 'a', choices: [
          { id: 'slow', label: 'slow', destination: 'b', effects: [{ field: 'time', op: 'add_minutes', value: '150' }] },
          { id: 'fast', label: 'fast', destination: 'b', effects: [{ field: 'time', op: 'add_minutes', value: '30' }] },
        ] },
        { id: 'b', title: 'B', body: 'b', resolvesEnding: true, choices: [] },
      ],
      endings: [
        { id: 'ending_dark', name: 'Dark', summary: 's', conditions: [{ field: 'dead', op: 'is_true' }] },
        { id: 'ending_out', name: 'Out', summary: 'o', conditions: [], isDefault: true },
      ],
    } as unknown as Story;
  }
  it('walks without hitting the cap and reaches both endings', () => {
    const report = walkStateSpace(caveStory());
    expect(report.capHit).toBe(false);
    expect(report.softlocks).toEqual([]);
    expect(report.orphanEndings).toEqual([]); // dark (slow) + out (fast) both reachable
  });
});
