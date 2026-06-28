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

describe('walkStateSpace — present-reachability (H8) + per-branch reachability (H12)', () => {
  // an event at L2 after 15:30; the player either detours to L2 (present reachable) or waits at L1 (not).
  function presentStory(reachPresent: boolean): Story {
    return {
      id: 'ev', title: 'ev', startNodeId: 'a', startTime: '15:00', deadline: '17:00', startLocation: 'L1',
      variables: [{ name: 'seen', type: 'boolean', default: false, purpose: 's' }],
      locations: [{ id: 'L1', name: 'L1' }, { id: 'L2', name: 'L2' }],
      events: [{
        id: 'E', title: 'E', trigger: [{ field: 'time', op: 'time_after', value: '15:30' }],
        eventLocation: 'L2', ifPresentNode: 'n_present',
        ifAbsentEffects: [{ field: 'seen', op: 'set', value: 'true' }], recoveryNodeId: 'n_rec',
      }],
      nodes: [
        { id: 'a', title: 'A', body: '', choices: reachPresent
          ? [{ id: 'go', label: 'to L2', destination: 'n_rec', effects: [{ field: 'location', op: 'change_location', value: 'L2' }, { field: 'time', op: 'add_minutes', value: '40' }] }]
          : [{ id: 'wait', label: 'wait', destination: 'n_rec', effects: [{ field: 'time', op: 'add_minutes', value: '60' }] }] },
        { id: 'n_present', title: 'P', body: '', choices: [], resolvesEnding: true },
        { id: 'n_rec', title: 'R', body: '', choices: [], resolvesEnding: true },
      ],
      endings: [{ id: 'd', name: 'D', summary: '', conditions: [], isDefault: true }],
    } as unknown as Story;
  }
  it('H8: flags an event whose present node no play reaches (eventPresent ok=false)', () => {
    expect(walkStateSpace(presentStory(false)).eventPresent.find((e) => e.eventId === 'E')!.ok).toBe(false);
  });
  it('H8: an event whose present node IS reachable shows eventPresent ok=true', () => {
    expect(walkStateSpace(presentStory(true)).eventPresent.find((e) => e.eventId === 'E')!.ok).toBe(true);
  });

  it('H8: a present node reached only by a CHOICE (event never fires present) reports ok=false', () => {
    const story = {
      id: 'ev2', title: 'ev2', startNodeId: 'a', startTime: '15:00', deadline: '17:00', startLocation: 'L1',
      variables: [{ name: 'seen', type: 'boolean', default: false, purpose: 's' }],
      locations: [{ id: 'L1', name: 'L1' }, { id: 'L2', name: 'L2' }],
      events: [{
        id: 'E', title: 'E', trigger: [{ field: 'time', op: 'time_after', value: '15:30' }],
        eventLocation: 'L2', ifPresentNode: 'n_present', // present judged only at L2; the player never goes there
        ifAbsentEffects: [{ field: 'seen', op: 'set', value: 'true' }], recoveryNodeId: 'n_rec',
      }],
      nodes: [
        { id: 'a', title: 'A', body: '', choices: [
          { id: 'peek', label: 'peek', destination: 'n_present', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] }, // a CHOICE into the present node
          { id: 'wait', label: 'wait', destination: 'n_rec', effects: [{ field: 'time', op: 'add_minutes', value: '60' }] },
        ] },
        { id: 'n_present', title: 'P', body: '', choices: [], resolvesEnding: true },
        { id: 'n_rec', title: 'R', body: '', choices: [], resolvesEnding: true },
      ],
      endings: [{ id: 'd', name: 'D', summary: '', conditions: [], isDefault: true }],
    } as unknown as Story;
    expect(walkStateSpace(story).eventPresent.find((e) => e.eventId === 'E')!.ok).toBe(false);
  });

  it('H12: surfaces a choice available on one branch and locked on another (conditionalChoices)', () => {
    const story = {
      id: 'br', title: 'br', startNodeId: 'a', startTime: '15:00', deadline: '17:00', startLocation: 'L',
      variables: [{ name: 'flag', type: 'boolean', default: false, purpose: 'f' }],
      locations: [{ id: 'L', name: 'L' }], events: [],
      nodes: [
        { id: 'a', title: 'A', body: '', choices: [
          { id: 'set', label: 'set', destination: 'm', effects: [{ field: 'flag', op: 'set', value: 'true' }, { field: 'time', op: 'add_minutes', value: '10' }] },
          { id: 'noset', label: 'noset', destination: 'm', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
        ] },
        { id: 'm', title: 'M', body: '', choices: [
          { id: 'c_gated', label: 'gated', destination: 'end', conditions: [{ field: 'flag', op: 'is_true' }], effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
          { id: 'c_open', label: 'open', destination: 'end', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
        ] },
        { id: 'end', title: 'E', body: '', choices: [], resolvesEnding: true },
      ],
      endings: [{ id: 'd', name: 'D', summary: '', conditions: [], isDefault: true }],
    } as unknown as Story;
    const r = walkStateSpace(story);
    expect(r.conditionalChoices).toContain('m::c_gated'); // gated true on the set branch, locked on the noset branch
    expect(r.conditionalChoices).not.toContain('m::c_open'); // always available
  });
});

describe('walkStateSpace — time-bucketing mode (H10/A7)', () => {
  function hubStory(): Story {
    return {
      id: 'hub', title: 'hub', startNodeId: 'a', startTime: '15:00', deadline: '18:00', startLocation: 'L',
      variables: [], locations: [{ id: 'L', name: 'L' }], events: [],
      nodes: [
        { id: 'a', title: 'A', body: '', choices: [
          { id: 'x', label: 'x', destination: 'hub', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
          { id: 'y', label: 'y', destination: 'hub', effects: [{ field: 'time', op: 'add_minutes', value: '20' }] },
        ] },
        { id: 'hub', title: 'Hub', body: '', choices: [
          { id: 'go', label: 'go', destination: 'end', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
        ] },
        { id: 'end', title: 'E', body: '', choices: [], resolvesEnding: true },
      ],
      endings: [{ id: 'd', name: 'D', summary: '', conditions: [], isDefault: true }],
    } as unknown as Story;
  }
  it('collapses distinct-time hub states into one bucket (fewer states explored)', () => {
    const exact = walkStateSpace(hubStory());
    const bucketed = walkStateSpace(hubStory(), { timeBucket: 30 }); // the two arrivals (t+10, t+20) share one 30-min bucket
    expect(bucketed.statesExplored).toBeLessThan(exact.statesExplored);
  });
});
