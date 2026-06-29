import { describe, it, expect } from 'vitest';
import type { Story } from './types';
import { walkStateSpace, coReachable } from './stateSpaceWalk';

describe('coReachable (full-edge soundness guard)', () => {
  it('marks a state co-reaching THROUGH a back-edge to an already-visited state', () => {
    // S0 -> T (terminal); S0 -> X; X -> S0 (the ONLY way out of X is back to S0, a re-visit edge).
    // X co-reaches T via X->S0->T. A tree built from first-discovery (S0->T, S0->X) drops X->S0 and would
    // WRONGLY exclude X. coReachable uses the full edge set, so X must be included.
    const edges = new Map<string, Set<string>>([
      ['S0', new Set(['T', 'X'])],
      ['X', new Set(['S0'])],
    ]);
    const reach = coReachable(new Set(['T']), edges);
    expect(reach.has('S0')).toBe(true);
    expect(reach.has('X')).toBe(true);  // FAILS for a tree-only implementation
  });
});

// Reconvergent clean map: a<->b, both can finish. Integration smoke test that roam terminates and reports no
// dead regions on a real game. (The deterministic co-reachability soundness guard is the pure coReachable test
// above — an integration fixture can't force a load-bearing back-edge because visited[] is in the state key.)
function reconvergent(): Story {
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
      // b can ONLY get out by traveling back to a (b->a edge is a re-visit edge the parent tree drops)
      { id: 'b_hub', title: 'B', body: '', choices: [] },
    ],
    endings: [{ id: 'fin', name: 'F', conditions: [], isDefault: true, summary: '' }],
  };
}

// Stranded map: c is a dead region — you can roam a<->c but c can never reach an ending.
function stranded(): Story {
  const s = reconvergent();
  s.locations[0].connectedLocations = ['b', 'c'];
  s.locations[0].travelTimes = { b: 10, c: 10 };
  s.locations.push({ id: 'c', name: 'C', connectedLocations: ['a'], travelTimes: { a: 10 }, defaultNode: 'c_hub' });
  // c_hub only travels back to a, and a can finish — so c is NOT stranded here. To strand, cut c->a:
  s.locations[2].connectedLocations = []; // c connects nowhere out; its hub has no choices
  s.nodes.push({ id: 'c_hub', title: 'C', body: '', choices: [] });
  return s;
}

describe('walker roam mode', () => {
  it('untimed roam terminates and the reconvergent clean map has no dead regions', () => {
    const r = walkStateSpace(reconvergent());
    expect(r.capHit).toBe(false);          // time dropped → finite
    expect(r.indeterminate).toBe(false);
    expect(r.deadRegions).toEqual([]);     // b reaches an ending via b->a->finish (full-edge co-reachability)
    expect(r.softlocks).toEqual([]);
  });
  it('a stranded wander-region is reported in deadRegions', () => {
    const r = walkStateSpace(stranded());
    expect(r.deadRegions).toContain('c_hub'); // c can never reach an ending
  });
  it('capHit in roam is INDETERMINATE', () => {
    const r = walkStateSpace(reconvergent(), { cap: 1 }); // force a cap
    expect(r.capHit).toBe(true);
    expect(r.indeterminate).toBe(true);
  });
});
