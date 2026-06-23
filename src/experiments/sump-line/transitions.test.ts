import { describe, it, expect } from 'vitest';
import { pickNextChapter } from './transitions';
import type { Chapter } from './types';
import type { WorldState } from '../../engine';

const ch: Chapter = {
  id: 'a', title: 'A', story: {} as never, transitions: [
    { when: { endingId: 'bad', conditions: [{ field: 'x', op: 'gte', value: '5' }] }, goTo: 'fail' },
    { when: { conditions: [{ field: 'warmth', op: 'lte', value: '2' }] }, goTo: 'cold' },
    { when: {}, goTo: 'warm' }, // catch-all
  ],
};
const state = (vars: Record<string, number>): WorldState => ({
  time: 0, location: 'L', clues: [], inventory: [], visited: [], completedEvents: [], vars,
});

describe('pickNextChapter', () => {
  it('matches on endingId AND conditions', () => {
    expect(pickNextChapter(ch, state({ x: 9, warmth: 4 }), 'bad')).toBe('fail');
  });
  it('skips a rule whose endingId does not match even if conditions hold', () => {
    expect(pickNextChapter(ch, state({ x: 9, warmth: 4 }), 'good')).toBe('warm');
  });
  it('matches a conditions-only rule', () => {
    expect(pickNextChapter(ch, state({ x: 0, warmth: 1 }), 'good')).toBe('cold');
  });
  it('falls through to the catch-all', () => {
    expect(pickNextChapter(ch, state({ x: 0, warmth: 4 }), 'good')).toBe('warm');
  });
  it('returns undefined when nothing matches', () => {
    const noCatch: Chapter = { ...ch, transitions: [{ when: { endingId: 'never' }, goTo: 'x' }] };
    expect(pickNextChapter(noCatch, state({}), 'good')).toBeUndefined();
  });
});
