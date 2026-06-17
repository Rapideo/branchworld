import { describe, it, expect } from 'vitest';
import { applyEffect, applyEffects } from './effects';
import type { WorldState } from './types';

const base: WorldState = {
  time: 900, location: 'Home', clues: [], inventory: [], visited: [],
  completedEvents: [], vars: { trust: 1, knows: false },
};

describe('effects', () => {
  it('sets, increments, decrements vars', () => {
    expect(applyEffect(base, { field: 'knows', op: 'set', value: 'true' }).vars.knows).toBe(true);
    expect(applyEffect(base, { field: 'trust', op: 'increment', value: '2' }).vars.trust).toBe(3);
    expect(applyEffect(base, { field: 'trust', op: 'decrement' }).vars.trust).toBe(0);
  });
  it('advances engine-derived time', () => {
    expect(applyEffect(base, { field: 'time', op: 'add_minutes', value: '15' }).time).toBe(915);
  });
  it('manages clues, items, location, visited, events', () => {
    expect(applyEffect(base, { field: 'clues', op: 'add_clue', value: 'plate' }).clues).toEqual(['plate']);
    expect(applyEffect(base, { field: 'location', op: 'change_location', value: 'Diner' }).location).toBe('Diner');
    expect(applyEffect(base, { field: 'e1', op: 'mark_event_completed' }).completedEvents).toEqual(['e1']);
    expect(applyEffect(base, { field: 'n2', op: 'mark_visited' }).visited).toEqual(['n2']);
  });
  it('does not mutate the input state', () => {
    const before = JSON.stringify(base);
    applyEffect(base, { field: 'trust', op: 'increment', value: '5' });
    expect(JSON.stringify(base)).toBe(before);
  });
  it('applies a list in order', () => {
    const out = applyEffects(base, [
      { field: 'knows', op: 'set', value: 'true' },
      { field: 'trust', op: 'increment', value: '1' },
      { field: 'time', op: 'add_minutes', value: '10' },
    ]);
    expect(out.vars.knows).toBe(true);
    expect(out.vars.trust).toBe(2);
    expect(out.time).toBe(910);
  });
});
