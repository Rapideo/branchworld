import { describe, it, expect } from 'vitest';
import { verifyInvestigation } from './stateSpaceWalk';
import type { Story } from './types';

// A timed study: examine the desk (its clue gates the win), then accuse. minutes/deadline are the knob.
function study(deskMin: number, deadline: string): Story {
  return {
    id: 's', title: 'S', startNodeId: 'study', startTime: '09:00', deadline, startLocation: 'L',
    profile: { clock: 'timed', investigation: 'on' }, variables: [],
    nodes: [
      { id: 'study', title: '', body: '', examinables: [{ id: 'desk', label: 'Desk', clue: 'receipt', reveal: 'r', minutes: deskMin }],
        choices: [{ id: 'accuse', label: 'Accuse', destination: 'verdict' }] },
      { id: 'verdict', title: '', body: '', choices: [], resolvesEnding: true },
    ],
    locations: [{ id: 'L', name: 'L' }], events: [],
    endings: [
      { id: 'win', name: 'W', conditions: [{ field: 'receipt', op: 'has_clue' }], priority: 1, summary: '' },
      { id: 'lose', name: 'L', conditions: [], summary: '', isDefault: true },
    ],
  };
}

describe('verifyInvestigation', () => {
  it('passes when the clue-gated win is reachable with its clue in time', () => {
    const { ok, issues } = verifyInvestigation(study(10, '10:00')); // 10 min examine, 60 min window
    expect(ok).toBe(true);
    expect(issues.find((i) => i.code === 'INVESTIGATION_DEADLINE_UNREACHABLE')).toBeUndefined();
  });
  it('fails INVESTIGATION_DEADLINE_UNREACHABLE when examining blows the deadline', () => {
    const { ok, issues } = verifyInvestigation(study(90, '10:00')); // 90 min examine > 60 min window
    expect(ok).toBe(false);
    expect(issues.find((i) => i.code === 'INVESTIGATION_DEADLINE_UNREACHABLE')).toBeDefined();
  });

  it('P0 GUARD: an endsWith-pinned clue-gated win reached cluelessly-in-time is NOT a false pass', () => {
    // 'win' is pinned by node.endsWith AND carries has_clue(receipt). The accuse path reaches it WITHOUT the
    // clue (examining the desk costs 90 > 60 window). satisfiedEndings (terminal gate re-eval) must reject it.
    const s = study(90, '10:00');
    s.nodes[1].endsWith = 'win';        // verdict node pins 'win' regardless of its conditions
    const { ok, issues } = verifyInvestigation(s);
    expect(ok).toBe(false);
    expect(issues.find((i) => i.code === 'INVESTIGATION_DEADLINE_UNREACHABLE')).toBeDefined();
  });
});
