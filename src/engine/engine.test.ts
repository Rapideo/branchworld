import { describe, it, expect } from 'vitest';
import { GameEngine } from './engine';
import type { Story } from './types';

function demo(): Story {
  return {
    id: 'g', title: 'demo', startNodeId: 'start', startTime: '15:00', deadline: '18:00',
    startLocation: 'Diner',
    variables: [{ name: 'knows', type: 'boolean', default: false, purpose: 'k' }],
    locations: [],
    events: [{
      id: 'E', title: 'pickup',
      trigger: [{ field: 'time', op: 'time_after', value: '16:10' }],
      eventLocation: 'Diner', ifPresentNode: 'witness',
      ifAbsentEffects: [{ field: 'clues', op: 'add_clue', value: 'receipt' }],
      recoveryNodeId: 'receipt',
    }],
    nodes: [
      { id: 'start', title: 'Start', body: 'You are at the diner.', choices: [
        { id: 'ask', label: 'Ask about the envelope', destination: 'learned',
          effects: [{ field: 'knows', op: 'set', value: 'true' }, { field: 'time', op: 'add_minutes', value: '5' }] },
        { id: 'wait', label: 'Wait around', destination: 'start2',
          effects: [{ field: 'time', op: 'add_minutes', value: '75' }] },
      ] },
      { id: 'learned', title: 'Learned', body: 'Now you know.', choices: [
        { id: 'gated', label: 'Mention the envelope', destination: 'finish',
          conditions: [{ field: 'knows', op: 'is_true' }] },
        { id: 'leave', label: 'Leave', destination: 'finish' },
      ] },
      { id: 'start2', title: 'Still waiting', body: 'Time passes.', choices: [
        { id: 'end', label: 'Give up', destination: 'finish' },
      ] },
      { id: 'witness', title: 'Witness', body: 'You saw the pickup.', choices: [
        { id: 'w_end', label: 'Go report it', destination: 'finish' },
      ] },
      { id: 'receipt', title: 'Receipt', body: 'You find a receipt.', choices: [
        { id: 'r_end', label: 'Pocket it', destination: 'finish' },
      ] },
      { id: 'finish', title: 'The End', body: 'Resolve.', resolvesEnding: true, choices: [] },
    ],
    endings: [
      { id: 'informed', name: 'Informed', summary: 'You knew.', conditions: [{ field: 'knows', op: 'is_true' }] },
      { id: 'default', name: 'Clueless', summary: 'You did not.', conditions: [], isDefault: true },
    ],
  };
}

describe('GameEngine', () => {
  it('starts at the start node and marks it visited', () => {
    const g = new GameEngine(demo());
    const v = g.start();
    expect(v.node.id).toBe('start');
    expect(v.state.visited).toContain('start');
    expect(v.timeLabel).toBe('3:00 PM');
  });

  it('hides gated choices and explains why, then reveals them after state changes', () => {
    const g = new GameEngine(demo());
    g.choose('wait');        // 75 min passes -> but stays start2 path; knows still false
    // re-run on a fresh engine to test gating at 'learned'
    const g2 = new GameEngine(demo());
    g2.choose('ask');        // sets knows=true, +5 min => 15:05
    const v = g2.view();
    expect(v.node.id).toBe('learned');
    const gated = v.choices.find((c) => c.id === 'gated')!;
    expect(gated.available).toBe(true);
  });

  it('routes to the witness node when a scheduled event fires while present', () => {
    const g = new GameEngine(demo());
    const v = g.choose('wait');   // +75 min => 16:15, at Diner => event fires present
    expect(v.node.id).toBe('witness');
    expect(v.state.completedEvents).toContain('E');
  });

  it('resolves an ending from accumulated state at a resolution node', () => {
    const g = new GameEngine(demo());
    g.choose('ask');              // knows=true
    const v = g.choose('gated');  // -> finish (resolvesEnding)
    expect(v.endingReached?.id).toBe('informed');
  });

  it('falls to the default ending when state does not match', () => {
    const g = new GameEngine(demo());
    g.choose('wait');             // event fires present -> witness (knows still false)
    const v = g.choose('w_end');  // -> finish
    expect(v.endingReached?.id).toBe('default');
  });
});

describe('GameEngine — clamping end-to-end', () => {
  function clampStory(): Story {
    return {
      id: 'c', title: 'c', startNodeId: 'a', startTime: '15:00', deadline: '16:00', startLocation: 'L',
      variables: [{ name: 'heat', type: 'number', default: 4, purpose: 'h', min: 0, max: 4 }],
      locations: [], events: [],
      nodes: [
        { id: 'a', title: 'A', body: 'a', choices: [
          { id: 'spike', label: 'spike', destination: 'b',
            effects: [{ field: 'heat', op: 'increment', value: '10' }] },
        ] },
        { id: 'b', title: 'B', body: 'b', resolvesEnding: true, choices: [] },
      ],
      endings: [{ id: 'd', name: 'D', summary: 'd', conditions: [], isDefault: true }],
    };
  }
  it('clamps a choice effect to the variable max', () => {
    const g = new GameEngine(clampStory());
    const v = g.choose('spike');
    expect(v.state.vars.heat).toBe(4); // 4 + 10 clamped to max 4
  });
});

describe('GameEngine — resource at-zero ends the game', () => {
  function caveStory(): Story {
    return {
      id: 'cave', title: 'cave', startNodeId: 'crawl', startTime: '15:00', deadline: '20:00', startLocation: 'L',
      variables: [{ name: 'dead', type: 'boolean', default: false, purpose: 'd' }],
      locations: [],
      events: [],
      resources: [{
        id: 'lamp', min: 0, max: 4, start: 4,
        depletion: { everyMinutes: 30, amount: 1 },
        atZero: { ending: 'ending_dark', setFlag: 'dead' },
      }],
      nodes: [
        { id: 'crawl', title: 'Crawl', body: 'dark', choices: [
          { id: 'press', label: 'press on', destination: 'crawl2',
            effects: [{ field: 'time', op: 'add_minutes', value: '60' }] },
        ] },
        { id: 'crawl2', title: 'Crawl2', body: 'darker', choices: [
          { id: 'press2', label: 'press on', destination: 'surface',
            effects: [{ field: 'time', op: 'add_minutes', value: '90' }] },
        ] },
        { id: 'surface', title: 'Surface', body: 'daylight', resolvesEnding: true, choices: [] },
      ],
      endings: [
        { id: 'ending_dark', name: 'The Cave Keeps You', summary: 'lamp died', conditions: [{ field: 'dead', op: 'is_true' }] },
        { id: 'ending_out', name: 'Daylight', summary: 'made it', conditions: [], isDefault: true },
      ],
    } as unknown as Story;
  }
  it('lamp dies after 120 min -> dark ending, not the surface', () => {
    const g = new GameEngine(caveStory());
    g.choose('press');          // +60 -> 16:00, lamp 2
    const v = g.choose('press2'); // +90 -> 17:30, lamp 0 -> at-zero ending fires before surface resolves
    expect(v.endingReached?.id).toBe('ending_dark');
    expect(v.state.vars.dead).toBe(true);
  });
});
