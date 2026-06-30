import { describe, it, expect } from 'vitest';
import { lintStory } from './linter';
import type { Story } from './types';

function mystery(over: Partial<Story> = {}): Story {
  return {
    id: 's', title: 'S', startNodeId: 'study', startTime: '09:00', deadline: '10:00',
    startLocation: 'L', profile: { clock: 'timed', investigation: 'on' }, variables: [],
    nodes: [{
      id: 'study', title: '', body: '', examinables: [{ id: 'desk', label: 'Desk', clue: 'receipt', reveal: 'r', minutes: 10 }],
      choices: [{ id: 'accuse', label: 'Accuse', destination: 'end_node', conditions: [{ field: 'receipt', op: 'has_clue' }] }],
    }, { id: 'end_node', title: '', body: '', choices: [], resolvesEnding: true }],
    locations: [{ id: 'L', name: 'L' }], events: [],
    endings: [
      { id: 'win', name: 'W', conditions: [{ field: 'receipt', op: 'has_clue' }], priority: 1, summary: '' },
      { id: 'def', name: 'D', conditions: [], summary: '', isDefault: true },
    ],
    ...over,
  };
}

describe('investigation static lints', () => {
  it('a has_clue gate satisfied only by an examinable does NOT trip DEAD_CLUE_REFERENCE (investigation:on)', () => {
    const r = lintStory(mystery());
    expect(r.errors.find((e) => e.code === 'DEAD_CLUE_REFERENCE')).toBeUndefined();
    expect(r.errors.find((e) => e.code === 'SOFT_LOCK')).toBeUndefined();   // accuse-gated-on-examinable-clue is live
  });
  it('the SAME story under investigation:off DOES trip DEAD_CLUE_REFERENCE (clue unproducible at runtime)', () => {
    const r = lintStory(mystery({ profile: { clock: 'timed', investigation: 'off' } }));
    expect(r.errors.find((e) => e.code === 'DEAD_CLUE_REFERENCE')).toBeDefined();
  });
  it('a negative examinable minutes trips NEGATIVE_TIME_DELTA', () => {
    const r = lintStory(mystery({
      nodes: [{ id: 'study', title: '', body: '', examinables: [{ id: 'd', label: '', clue: 'c', reveal: '', minutes: -5 }], choices: [{ id: 'x', label: '', destination: 'end_node' }] },
               { id: 'end_node', title: '', body: '', choices: [], resolvesEnding: true }],
      endings: [{ id: 'def', name: 'D', conditions: [], summary: '', isDefault: true }],
    }));
    expect(r.errors.find((e) => e.code === 'NEGATIVE_TIME_DELTA')).toBeDefined();
  });
  it('a clock-reading examinable condition under clock:untimed trips PROFILE_UNTIMED_HAS_TIME_CONDITION', () => {
    const r = lintStory(mystery({
      profile: { clock: 'untimed', investigation: 'on' }, deadline: undefined,
      nodes: [{ id: 'study', title: '', body: '', examinables: [{ id: 'd', label: '', clue: 'c', reveal: '', conditions: [{ field: 'time', op: 'time_after', value: '09:30' }] }], choices: [{ id: 'x', label: '', destination: 'end_node' }] },
               { id: 'end_node', title: '', body: '', choices: [], resolvesEnding: true }],
      endings: [{ id: 'def', name: 'D', conditions: [], summary: '', isDefault: true }],
    }));
    expect(r.errors.find((e) => e.code === 'PROFILE_UNTIMED_HAS_TIME_CONDITION')).toBeDefined();
  });
  it('CLOCK_CANNOT_BITE does NOT trip when examine costs alone can exhaust the window', () => {
    // window 60 min; authored path is 0 min, but two 40-min hotspots make maxTime 80 >= 60.
    const r = lintStory(mystery({
      nodes: [{ id: 'study', title: '', body: '', examinables: [
        { id: 'a', label: '', clue: 'ca', reveal: '', minutes: 40 }, { id: 'b', label: '', clue: 'cb', reveal: '', minutes: 40 }],
        choices: [{ id: 'x', label: '', destination: 'end_node' }] },
        { id: 'end_node', title: '', body: '', choices: [], resolvesEnding: true }],
      endings: [{ id: 'def', name: 'D', conditions: [], summary: '', isDefault: true }],
    }));
    expect(r.errors.find((e) => e.code === 'CLOCK_CANNOT_BITE')).toBeUndefined();
  });
  it('a numeric op on a string var inside an examinable condition trips TYPE_MISMATCH (checkCondTypes sweep)', () => {
    const r = lintStory(mystery({
      variables: [{ name: 'note', type: 'string', default: '', purpose: 'x' }],
      nodes: [{ id: 'study', title: '', body: '', examinables: [{ id: 'd', label: '', clue: 'c', reveal: '', conditions: [{ field: 'note', op: 'gt', value: '3' }] }], choices: [{ id: 'x', label: '', destination: 'end_node' }] },
               { id: 'end_node', title: '', body: '', choices: [], resolvesEnding: true }],
      endings: [{ id: 'def', name: 'D', conditions: [], summary: '', isDefault: true }],
    }));
    expect(r.errors.find((e) => e.code === 'TYPE_MISMATCH')).toBeDefined();
  });
  it('an out-of-window time literal inside an examinable condition trips TIME_LITERAL_OUT_OF_RANGE (checkTimeLiterals sweep)', () => {
    const r = lintStory(mystery({
      nodes: [{ id: 'study', title: '', body: '', examinables: [{ id: 'd', label: '', clue: 'c', reveal: '', conditions: [{ field: 'time', op: 'time_after', value: '11:30' }] }], choices: [{ id: 'x', label: '', destination: 'end_node' }] },
               { id: 'end_node', title: '', body: '', choices: [], resolvesEnding: true }],
      endings: [{ id: 'def', name: 'D', conditions: [], summary: '', isDefault: true }],
    }));
    expect(r.errors.find((e) => e.code === 'TIME_LITERAL_OUT_OF_RANGE')).toBeDefined();
  });
});
