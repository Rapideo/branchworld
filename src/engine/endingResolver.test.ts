import { describe, it, expect } from 'vitest';
import { resolveEnding, resolveEndingAt } from './endingResolver';
import type { Story, WorldState, StoryNode } from './types';
import { mkStory } from '../test/storyFixture';

function storyWith(endings: Story['endings']): Story {
  return {
    id: 'g', title: 'g', startNodeId: 'n', startTime: '15:00', deadline: '18:00',
    startLocation: 'L', variables: [], nodes: [], locations: [], events: [], endings,
  };
}
const s = (vars: Record<string, number>): WorldState => ({
  time: 0, location: 'L', clues: [], inventory: [], visited: [], completedEvents: [], vars,
});

describe('endingResolver', () => {
  const story = storyWith([
    { id: 'win', name: 'Win', summary: 'w', conditions: [{ field: 'score', op: 'gte', value: '3' }] },
    { id: 'ok', name: 'Ok', summary: 'o', conditions: [{ field: 'score', op: 'gte', value: '1' }] },
    { id: 'default', name: 'Default', summary: 'd', conditions: [], isDefault: true },
  ]);
  it('returns the first non-default match in order', () => {
    expect(resolveEnding(s({ score: 5 }), story)?.id).toBe('win');
    expect(resolveEnding(s({ score: 2 }), story)?.id).toBe('ok');
  });
  it('falls back to the default when nothing matches (no zero-match holes)', () => {
    expect(resolveEnding(s({ score: 0 }), story)?.id).toBe('default');
  });
  it('returns default even if it is not last in the list', () => {
    const reordered = storyWith([
      { id: 'default', name: 'D', summary: 'd', conditions: [], isDefault: true },
      { id: 'win', name: 'W', summary: 'w', conditions: [{ field: 'score', op: 'gte', value: '3' }] },
    ]);
    expect(resolveEnding(s({ score: 9 }), reordered)?.id).toBe('win');
    expect(resolveEnding(s({ score: 0 }), reordered)?.id).toBe('default');
  });

  it('prefers the higher-priority ending when two conditions are both satisfied', () => {
    const story = mkStory({
      variables: [{ name: 'score', type: 'number', default: 0, purpose: 's' }],
      endings: [
        { id: 'broad', name: 'Broad', summary: '', conditions: [{ field: 'score', op: 'gte', value: '1' }], priority: 0 },
        { id: 'specific', name: 'Specific', summary: '', conditions: [{ field: 'score', op: 'gte', value: '5' }], priority: 10 },
        { id: 'def', name: 'Default', summary: '', conditions: [], isDefault: true },
      ],
    });
    const state = { time: 0, location: 'loc_a', clues: [], inventory: [], visited: [], completedEvents: [], vars: { score: 10 } };
    expect(resolveEnding(state, story)?.id).toBe('specific');
  });

  it('returns the first ending on equal non-zero priority (stable tie-break)', () => {
    const story = mkStory({
      variables: [{ name: 'score', type: 'number', default: 0, purpose: 's' }],
      endings: [
        { id: 'first', name: 'First', summary: '', conditions: [{ field: 'score', op: 'gte', value: '1' }], priority: 5 },
        { id: 'second', name: 'Second', summary: '', conditions: [{ field: 'score', op: 'gte', value: '1' }], priority: 5 },
        { id: 'def', name: 'Default', summary: '', conditions: [], isDefault: true },
      ],
    });
    const state = { time: 0, location: 'loc_a', clues: [], inventory: [], visited: [], completedEvents: [], vars: { score: 10 } };
    expect(resolveEnding(state, story)?.id).toBe('first');
  });
});

describe('resolveEndingAt — node-named, atZero-by-priority, out-of-time (A3)', () => {
  const mkNode = (over: Partial<StoryNode> = {}): StoryNode => ({ id: 'n', title: 'N', body: '', choices: [], ...over });

  it('a node-named ending (endsWith) resolves directly, overriding a state match (F8)', () => {
    const story = storyWith([
      { id: 'win', name: 'W', summary: '', conditions: [{ field: 'score', op: 'gte', value: '3' }], priority: 9 },
      { id: 'special', name: 'S', summary: '', conditions: [{ field: 'nope', op: 'is_true' }] },
      { id: 'default', name: 'D', summary: '', conditions: [], isDefault: true },
    ]);
    expect(resolveEndingAt(s({ score: 9 }), story, mkNode({ endsWith: 'special' }), undefined, false)?.id).toBe('special');
  });

  it('the atZero ending competes by priority — a higher-priority state ending wins (H3)', () => {
    const story = storyWith([
      { id: 'grey', name: 'Grey', summary: '', conditions: [{ field: 'crossed', op: 'is_true' }], priority: 5 },
      { id: 'dark', name: 'Dark', summary: '', conditions: [{ field: 'lamp', op: 'lte', value: '0' }], priority: 1 },
      { id: 'default', name: 'D', summary: '', conditions: [], isDefault: true },
    ]);
    expect(resolveEndingAt(s({ crossed: 1, lamp: 0 }), story, mkNode({ resolvesEnding: true }), 'dark', false)?.id).toBe('grey');
  });

  it('the atZero ending wins when it is the highest-priority candidate', () => {
    const story = storyWith([
      { id: 'grey', name: 'Grey', summary: '', conditions: [{ field: 'crossed', op: 'is_true' }], priority: 1 },
      { id: 'dark', name: 'Dark', summary: '', conditions: [{ field: 'lamp', op: 'lte', value: '0' }], priority: 5 },
      { id: 'default', name: 'D', summary: '', conditions: [], isDefault: true },
    ]);
    expect(resolveEndingAt(s({ crossed: 1, lamp: 0 }), story, mkNode({ resolvesEnding: true }), 'dark', false)?.id).toBe('dark');
  });

  it('past the deadline with no match resolves the distinct out-of-time ending (H4)', () => {
    const story: Story = { ...storyWith([
      { id: 'oot', name: 'Out of time', summary: '', conditions: [{ field: 'nope', op: 'is_true' }] },
      { id: 'default', name: 'D', summary: '', conditions: [], isDefault: true },
    ]), outOfTimeEndingId: 'oot' };
    expect(resolveEndingAt(s({ score: 0 }), story, mkNode({}), undefined, true)?.id).toBe('oot');
  });

  it('past the deadline falls back to default when no out-of-time ending is declared', () => {
    const story = storyWith([
      { id: 'win', name: 'W', summary: '', conditions: [{ field: 'score', op: 'gte', value: '3' }] },
      { id: 'default', name: 'D', summary: '', conditions: [], isDefault: true },
    ]);
    expect(resolveEndingAt(s({ score: 0 }), story, mkNode({}), undefined, true)?.id).toBe('default');
  });

  it('a committed state ending beats the out-of-time fallback even past the deadline', () => {
    const story: Story = { ...storyWith([
      { id: 'win', name: 'W', summary: '', conditions: [{ field: 'score', op: 'gte', value: '3' }], priority: 1 },
      { id: 'oot', name: 'OOT', summary: '', conditions: [{ field: 'nope', op: 'is_true' }] },
      { id: 'default', name: 'D', summary: '', conditions: [], isDefault: true },
    ]), outOfTimeEndingId: 'oot' };
    expect(resolveEndingAt(s({ score: 9 }), story, mkNode({ resolvesEnding: true }), undefined, true)?.id).toBe('win');
  });

  it('the atZero death still resolves even when it aliases the out-of-time ending (pre-merge fix)', () => {
    const story: Story = { ...storyWith([
      { id: 'death', name: 'Death', summary: '', conditions: [{ field: 'nope', op: 'is_true' }], priority: 0 },
      { id: 'default', name: 'D', summary: '', conditions: [], isDefault: true },
    ]), outOfTimeEndingId: 'death' };
    // 'death' is BOTH the resource atZero ending AND outOfTimeEndingId; a resource death must still fire (not default)
    expect(resolveEndingAt(s({}), story, mkNode({ resolvesEnding: true }), 'death', false)?.id).toBe('death');
  });

  it('a resource death beats a node-named pin — death wins regardless of priority (F3)', () => {
    const story = storyWith([
      { id: 'pin', name: 'Pin', summary: '', conditions: [{ field: 'nope', op: 'is_true' }], priority: 9 },
      { id: 'death', name: 'Death', summary: '', conditions: [{ field: 'dead', op: 'is_true' }], priority: 1 },
      { id: 'default', name: 'D', summary: '', conditions: [], isDefault: true },
    ]);
    // node pins 'pin' (pri 9) but the lamp died → 'death' (pri 1) wins anyway
    expect(resolveEndingAt(s({ dead: 1 }), story, mkNode({ endsWith: 'pin' }), 'death', false)?.id).toBe('death');
  });

  it('the out-of-time ending never fires as a state match — only via the deadline path (F3)', () => {
    const story: Story = { ...storyWith([
      { id: 'oot', name: 'OOT', summary: '', conditions: [], priority: 9 }, // empty conditions would otherwise always match
      { id: 'default', name: 'D', summary: '', conditions: [], isDefault: true },
    ]), outOfTimeEndingId: 'oot' };
    // not past the deadline → oot must NOT fire by state match; falls to default
    expect(resolveEndingAt(s({}), story, mkNode({ resolvesEnding: true }), undefined, false)?.id).toBe('default');
  });
});
