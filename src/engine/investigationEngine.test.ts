import { describe, it, expect } from 'vitest';
import { GameEngine } from './engine';
import type { Story } from './types';

function study(profile: Story['profile'], opts: { minutes?: number; deadline?: string } = {}): Story {
  return {
    id: 's', title: 'S', startNodeId: 'study', startTime: '09:00', startLocation: 'L',
    deadline: opts.deadline, profile,
    variables: [],
    nodes: [{
      id: 'study', title: 'Study', body: 'A dim study.', examinables: [
        { id: 'desk', label: 'Search the desk', clue: 'receipt', reveal: 'A debt receipt.', minutes: opts.minutes },
      ],
      choices: [{ id: 'leave', label: 'Leave', destination: 'hall' }],
    }, { id: 'hall', title: 'Hall', body: '', choices: [], resolvesEnding: true }],
    locations: [{ id: 'L', name: 'L' }], events: [],
    endings: [{ id: 'end', name: 'E', conditions: [], summary: '', isDefault: true }],
  };
}

describe('investigation engine', () => {
  it('injects an examine choice only when investigation:on', () => {
    expect(new GameEngine(study({ clock: 'untimed' })).view().choices.map((c) => c.id)).toEqual(['leave']);
    const on = new GameEngine(study({ clock: 'untimed', investigation: 'on' }));
    expect(on.view().choices.map((c) => c.id)).toEqual(['leave', '__examine_desk']); // appended after authored
  });
  it('taking a hotspot adds the clue, logs the reveal, retires it, and stays in the scene', () => {
    const g = new GameEngine(study({ clock: 'untimed', investigation: 'on' }));
    const v = g.choose('__examine_desk');
    expect(v.state.clues).toContain('receipt');
    expect(v.log.some((l) => l.includes('debt receipt'))).toBe(true);
    expect(v.node.id).toBe('study');                                  // did not move
    expect(v.choices.map((c) => c.id)).toEqual(['leave']);            // hotspot retired
  });
  it('a costly examine that crosses the deadline ends the game mid-search (settle on examine)', () => {
    const g = new GameEngine(study({ clock: 'timed', investigation: 'on' }, { minutes: 120, deadline: '09:30' }));
    const v = g.choose('__examine_desk');                             // +120 min crosses 09:30
    expect(v.endingReached?.id).toBe('end');
  });
  it('throws on an unavailable examine id (clue already held)', () => {
    const g = new GameEngine(study({ clock: 'untimed', investigation: 'on' }));
    g.choose('__examine_desk');
    expect(() => g.choose('__examine_desk')).toThrow();
  });
  it('a costly examine that fires a present ScheduledEvent routes the player out (settle event-routing)', () => {
    const s: Story = {
      id: 's', title: 'S', startNodeId: 'study', startTime: '09:00', deadline: '10:00', startLocation: 'L',
      profile: { clock: 'timed', investigation: 'on' },
      variables: [{ name: 'interrupted', type: 'boolean', default: false, purpose: 'x' }],
      nodes: [
        { id: 'study', title: '', body: '', examinables: [{ id: 'desk', label: 'Desk', clue: 'c', reveal: 'r', minutes: 30 }], choices: [{ id: 'leave', label: '', destination: 'study' }] },
        { id: 'interrupt', title: '', body: '', entryEffects: [{ field: 'interrupted', op: 'set', value: 'true' }], choices: [{ id: 'x', label: '', destination: 'study' }] },
      ],
      locations: [{ id: 'L', name: 'L' }],
      events: [{ id: 'knock', title: '', trigger: [{ field: 'time', op: 'time_after', value: '09:20' }], eventLocation: 'L', ifPresentNode: 'interrupt', ifAbsentEffects: [{ field: 'interrupted', op: 'set', value: 'true' }], recoveryNodeId: 'study' }],
      endings: [{ id: 'end', name: 'E', conditions: [], summary: '', isDefault: true }],
    };
    const v = new GameEngine(s).choose('__examine_desk'); // +30 -> 09:30 >= 09:20: event fires PRESENT
    expect(v.node.id).toBe('interrupt');                  // settle's routing branch did a full enter() of the routed node
    expect(v.state.vars.interrupted).toBe(true);          // the routed node's entryEffects fired
  });
});
