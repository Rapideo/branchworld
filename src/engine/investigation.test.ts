import { describe, it, expect } from 'vitest';
import { EXAMINE_PREFIX, examineChoiceId, parseExamineTarget, examinablesAt, examineEffects } from './investigation';
import type { StoryNode, WorldState, Examinable } from './types';

const base: WorldState = { time: 0, location: 'L', clues: [], inventory: [], visited: [], completedEvents: [], vars: {} };
const desk: Examinable = { id: 'desk', label: 'Search the desk', clue: 'receipt', reveal: 'A receipt.', minutes: 10 };
const node: StoryNode = { id: 'study', title: '', body: '', choices: [], examinables: [desk] };

describe('investigation helpers', () => {
  it('round-trips the choice id', () => {
    expect(examineChoiceId('desk')).toBe(`${EXAMINE_PREFIX}desk`);
    expect(parseExamineTarget(`${EXAMINE_PREFIX}desk`)).toBe('desk');
    expect(parseExamineTarget('go_north')).toBeUndefined();
  });
  it('offers a hotspot whose clue is unheld, hides it once held', () => {
    expect(examinablesAt(node, base).map((e) => e.id)).toEqual(['desk']);
    expect(examinablesAt(node, { ...base, clues: ['receipt'] })).toEqual([]);
  });
  it('honors examinable conditions', () => {
    const gated: Examinable = { id: 'safe', label: 'Open safe', clue: 'cash', reveal: '$', conditions: [{ field: 'has_key', op: 'is_true' }] };
    const n2 = { ...node, examinables: [gated] };
    expect(examinablesAt(n2, base)).toEqual([]);
    expect(examinablesAt(n2, { ...base, vars: { has_key: true } }).map((e) => e.id)).toEqual(['safe']);
  });
  it('builds add_clue + add_minutes effects', () => {
    expect(examineEffects(desk)).toEqual([
      { field: 'clues', op: 'add_clue', value: 'receipt' },
      { field: 'time', op: 'add_minutes', value: '10' },
    ]);
    expect(examineEffects({ id: 'x', label: '', clue: 'c', reveal: '' })).toEqual([{ field: 'clues', op: 'add_clue', value: 'c' }]);
  });
});
