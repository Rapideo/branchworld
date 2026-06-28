import { describe, it, expect } from 'vitest';
import { evaluateCondition, evaluateConditions, explainFailing } from './conditions';
import type { WorldState } from './types';

const base: WorldState = {
  time: 970, location: 'Diner', clues: ['black_car'], inventory: [],
  visited: ['n1'], completedEvents: [], vars: { trust: 2, knows: true, phase: 'invest' },
};

describe('conditions', () => {
  it('compares numbers and equality', () => {
    expect(evaluateCondition({ field: 'trust', op: 'gte', value: '2' }, base)).toBe(true);
    expect(evaluateCondition({ field: 'trust', op: 'gt', value: '2' }, base)).toBe(false);
    expect(evaluateCondition({ field: 'phase', op: 'equals', value: 'invest' }, base)).toBe(true);
    expect(evaluateCondition({ field: 'phase', op: 'not_equals', value: 'x' }, base)).toBe(true);
  });
  it('handles booleans', () => {
    expect(evaluateCondition({ field: 'knows', op: 'is_true' }, base)).toBe(true);
    expect(evaluateCondition({ field: 'knows', op: 'is_false' }, base)).toBe(false);
  });
  it('handles clues and visited', () => {
    expect(evaluateCondition({ field: 'clues', op: 'has_clue', value: 'black_car' }, base)).toBe(true);
    expect(evaluateCondition({ field: 'clues', op: 'has_clue', value: 'plate' }, base)).toBe(false);
    expect(evaluateCondition({ field: 'visited', op: 'has_visited', value: 'n1' }, base)).toBe(true);
  });
  it('handles has_item (counted inventory: qty >= 1, or >= value)', () => {
    const s = { ...base, vars: { ...base.vars, thermite: 2 } };
    expect(evaluateCondition({ field: 'thermite', op: 'has_item' }, s)).toBe(true);             // 2 >= 1
    expect(evaluateCondition({ field: 'thermite', op: 'has_item', value: '2' }, s)).toBe(true); // 2 >= 2
    expect(evaluateCondition({ field: 'thermite', op: 'has_item', value: '3' }, s)).toBe(false);// 2 >= 3
    const empty = { ...base, vars: { ...base.vars, thermite: 0 } };
    expect(evaluateCondition({ field: 'thermite', op: 'has_item' }, empty)).toBe(false);         // 0 >= 1
  });
  it('handles engine-derived time', () => {
    expect(evaluateCondition({ field: 'time', op: 'time_after', value: '16:10' }, base)).toBe(true);
    expect(evaluateCondition({ field: 'time', op: 'time_before', value: '16:10' }, base)).toBe(false);
    expect(evaluateCondition({ field: 'time', op: 'time_between', value: '16:00-17:00' }, base)).toBe(true);
  });
  it('ANDs lists and treats empty as true', () => {
    expect(evaluateConditions([], base)).toBe(true);
    expect(evaluateConditions(undefined, base)).toBe(true);
    expect(evaluateConditions(
      [{ field: 'trust', op: 'gte', value: '2' }, { field: 'knows', op: 'is_true' }], base)).toBe(true);
    expect(evaluateConditions(
      [{ field: 'trust', op: 'gte', value: '2' }, { field: 'knows', op: 'is_false' }], base)).toBe(false);
  });
  it('explains failing conditions', () => {
    const msg = explainFailing([{ field: 'trust', op: 'gte', value: '5' }], base);
    expect(msg).toContain('trust');
    expect(msg).toContain('gte');
  });
});
