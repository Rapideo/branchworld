import { describe, it, expect } from 'vitest';
import { checkScheduledEvents } from './scheduledEvents';
import type { Story, WorldState } from './types';

function story(): Story {
  return {
    id: 'g', title: 'g', startNodeId: 'n', startTime: '15:00', deadline: '18:00', startLocation: 'Diner',
    variables: [], nodes: [], locations: [], endings: [],
    events: [{
      id: 'E410', title: 'Pickup',
      trigger: [{ field: 'time', op: 'time_after', value: '16:10' }],
      eventLocation: 'Diner',
      ifPresentNode: 'n_witness',
      ifAbsentEffects: [
        { field: 'envelope_gone', op: 'set', value: 'true' },
        { field: 'clues', op: 'add_clue', value: 'receipt' },
      ],
      recoveryNodeId: 'n_receipt',
    }],
  };
}
const at = (time: number, location: string): WorldState => ({
  time, location, clues: [], inventory: [], visited: [], completedEvents: [], vars: {},
});

describe('scheduledEvents', () => {
  it('does not fire before the trigger time', () => {
    const r = checkScheduledEvents(at(900, 'Diner'), story());
    expect(r.routedNodeId).toBeUndefined();
    expect(r.state.completedEvents).toEqual([]);
  });
  it('routes to the witness node when present', () => {
    const r = checkScheduledEvents(at(975, 'Diner'), story());
    expect(r.routedNodeId).toBe('n_witness');
    expect(r.state.completedEvents).toEqual(['E410']);
  });
  it('applies absent effects and plants the clue when absent', () => {
    const r = checkScheduledEvents(at(975, 'Arcade'), story());
    expect(r.routedNodeId).toBeUndefined();
    expect(r.state.vars.envelope_gone).toBe(true);
    expect(r.state.clues).toContain('receipt');
    expect(r.state.completedEvents).toEqual(['E410']);
  });
  it('never fires the same event twice', () => {
    const fired: WorldState = { ...at(975, 'Arcade'), completedEvents: ['E410'] };
    const r = checkScheduledEvents(fired, story());
    expect(r.state.clues).toEqual([]);
    expect(r.log).toEqual([]);
  });
});
