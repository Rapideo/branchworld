import { describe, it, expect } from 'vitest';
import { GameEngine } from './engine';
import type { Story } from './types';

function tiny(): Story {
  return {
    id: 'tiny', title: 'Tiny', startNodeId: 'a', startTime: '15:00', deadline: '18:00',
    startLocation: 'L', variables: [{ name: 'n', type: 'number', default: 0, purpose: 'n' }],
    locations: [], events: [],
    nodes: [
      { id: 'a', title: 'A', body: 'a', choices: [
        { id: 'go', label: 'go', destination: 'b',
          effects: [{ field: 'n', op: 'increment', value: '1' }, { field: 'time', op: 'add_minutes', value: '30' }] },
      ] },
      { id: 'b', title: 'B', body: 'b', choices: [{ id: 'back', label: 'back', destination: 'a' }] },
      { id: 'end', title: 'End', body: 'end', resolvesEnding: true, choices: [] },
    ],
    endings: [
      { id: 'win', name: 'Win', summary: 'w', conditions: [{ field: 'n', op: 'gte', value: '1' }] },
      { id: 'default', name: 'D', summary: 'd', conditions: [], isDefault: true },
    ],
  };
}

describe('engine snapshot/restore/gotoNode', () => {
  it('round-trips state via snapshot/restore', () => {
    const g = new GameEngine(tiny());
    g.choose('go');                 // n=1, time 15:30, at b
    const snap = g.snapshot();
    expect(snap.storyId).toBe('tiny');
    const g2 = new GameEngine(tiny());
    g2.restore(snap);
    const v = g2.view();
    expect(v.node.id).toBe('b');
    expect(v.state.vars.n).toBe(1);
    expect(v.time).toBe(930);
  });
  it('rejects a snapshot from a different story', () => {
    const g = new GameEngine(tiny());
    const snap = g.snapshot();
    const g2 = new GameEngine({ ...tiny(), id: 'other' });
    expect(() => g2.restore(snap)).toThrow();
  });
  it('gotoNode enters a node for testing', () => {
    const g = new GameEngine(tiny());
    const v = g.gotoNode('end');    // resolvesEnding; n=0 -> default
    expect(v.node.id).toBe('end');
    expect(v.endingReached?.id).toBe('default');
  });
  it('preserves a reached ending across snapshot/restore', () => {
    const g = new GameEngine(tiny());
    g.choose('go');                 // n=1
    g.gotoNode('end');              // resolves -> win
    const snap = g.snapshot();
    expect(snap.endingId).toBe('win');
    const g2 = new GameEngine(tiny());
    g2.restore(snap);
    expect(g2.view().endingReached?.id).toBe('win');
  });
});
