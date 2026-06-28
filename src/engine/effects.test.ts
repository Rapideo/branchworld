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
  it('never rewinds time on a negative add_minutes (monotonic invariant, H2)', () => {
    expect(applyEffect(base, { field: 'time', op: 'add_minutes', value: '-30' }).time).toBe(900);
  });
  it('adjust_resource accumulates a hidden resource offset (F6)', () => {
    const after = applyEffect(base, { field: 'lamp', op: 'adjust_resource', value: '20' });
    expect(after.vars['__roff_lamp']).toBe(20);
    expect(applyEffect(after, { field: 'lamp', op: 'adjust_resource', value: '-5' }).vars['__roff_lamp']).toBe(15);
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
  it('clamps increment/decrement/set when bounds are supplied', () => {
    const bounds = { trust: { min: 0, max: 4 } };
    expect(applyEffect(base, { field: 'trust', op: 'increment', value: '10' }, bounds).vars.trust).toBe(4);
    const low = { ...base, vars: { ...base.vars, trust: 0 } };
    expect(applyEffect(low, { field: 'trust', op: 'decrement', value: '5' }, bounds).vars.trust).toBe(0);
    expect(applyEffect(base, { field: 'trust', op: 'set', value: '99' }, bounds).vars.trust).toBe(4);
  });
  it('does not clamp when no bound is supplied (back-compat)', () => {
    expect(applyEffect(base, { field: 'trust', op: 'increment', value: '10' }).vars.trust).toBe(11);
  });
});
