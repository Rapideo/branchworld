import { describe, it, expect } from 'vitest';
import { describeCondition, describeConditions, describeEffect, describeEffects } from './describe';

describe('describe', () => {
  it('renders a condition compactly', () => {
    expect(describeCondition({ field: 'knows', op: 'is_true' })).toBe('knows is_true');
    expect(describeCondition({ field: 'trust', op: 'gte', value: '2' })).toBe('trust gte 2');
  });
  it('joins conditions with &, empty for none', () => {
    expect(describeConditions(undefined)).toBe('');
    expect(describeConditions([{ field: 't', op: 'gte', value: '2' }, { field: 'k', op: 'is_true' }])).toBe('t gte 2 & k is_true');
  });
  it('renders effects compactly', () => {
    expect(describeEffect({ field: 'trust', op: 'increment', value: '1' })).toBe('trust increment 1');
    expect(describeEffects([{ field: 'time', op: 'add_minutes', value: '10' }, { field: 'k', op: 'set', value: 'true' }])).toBe('time add_minutes 10, k set true');
  });
});
