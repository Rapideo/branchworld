import { describe, it, expect } from 'vitest';
import { lintStory } from './linter';
import type { Story } from './types';
import { mkStory } from '../test/storyFixture';

// A clean, lint-passing minimal story.
function clean(): Story {
  return {
    id: 'g', title: 'g', startNodeId: 'a', startTime: '15:00', deadline: '16:00',
    startLocation: 'L',
    variables: [{ name: 'knows', type: 'boolean', default: false, purpose: 'k' }],
    locations: [{ id: 'L', name: 'Location L' }],
    events: [{
      id: 'E', title: 'e',
      trigger: [{ field: 'time', op: 'time_after', value: '15:30' }],
      eventLocation: 'L', ifPresentNode: 'b',
      ifAbsentEffects: [{ field: 'clues', op: 'add_clue', value: 'c' }],
      recoveryNodeId: 'b',
    }],
    nodes: [
      { id: 'a', title: 'A', body: 'a', choices: [
        { id: 'go', label: 'go', destination: 'b',
          effects: [{ field: 'time', op: 'add_minutes', value: '90' }] },
      ] },
      { id: 'b', title: 'B', body: 'b', resolvesEnding: true, choices: [] },
    ],
    endings: [
      { id: 'win', name: 'Win', summary: 'w', conditions: [{ field: 'knows', op: 'is_true' }] },
      { id: 'default', name: 'D', summary: 'd', conditions: [], isDefault: true },
    ],
  };
}

describe('linter', () => {
  it('passes a clean story', () => {
    const r = lintStory(clean());
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('flags broken links', () => {
    const s = clean();
    s.nodes[0].choices[0].destination = 'nowhere';
    const r = lintStory(s);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === 'BROKEN_LINK')).toBe(true);
  });

  it('flags a missing default ending', () => {
    const s = clean();
    s.endings = s.endings.filter((e) => !e.isDefault);
    expect(lintStory(s).errors.some((e) => e.code === 'NO_DEFAULT_ENDING')).toBe(true);
  });

  it('flags undefined variables', () => {
    const s = clean();
    s.nodes[0].choices[0].effects = [{ field: 'ghost', op: 'set', value: '1' }];
    expect(lintStory(s).errors.some((e) => e.code === 'UNDEFINED_VAR')).toBe(true);
  });

  it('flags a no-exit dead-end node', () => {
    const s = clean();
    s.nodes[1].resolvesEnding = false; // node b now has no choices and no resolution
    expect(lintStory(s).errors.some((e) => e.code === 'NO_EXIT')).toBe(true);
  });

  it('flags a scheduled event with an unreachable recovery node', () => {
    const s = clean();
    s.events[0].recoveryNodeId = 'b';
    s.nodes[0].choices[0].destination = 'b'; // still reachable -> ok
    s.events[0].recoveryNodeId = 'ghost';
    expect(lintStory(s).errors.some((e) => e.code === 'EVENT_RECOVERY_MISSING')).toBe(true);
  });

  it('flags a clock that cannot bite', () => {
    const s = clean();
    s.nodes[0].choices[0].effects = [{ field: 'time', op: 'add_minutes', value: '5' }]; // window is 60 min
    const r = lintStory(s);
    expect(r.errors.some((e) => e.code === 'CLOCK_CANNOT_BITE')).toBe(true);
  });

  it('warns on unreachable nodes', () => {
    const s = clean();
    s.nodes.push({ id: 'orphan', title: 'O', body: 'o', resolvesEnding: true, choices: [] });
    const r = lintStory(s);
    expect(r.warnings.some((w) => w.code === 'UNREACHABLE_NODE')).toBe(true);
  });

  it('flags a has_clue condition for a clue nothing ever adds (DEAD_CLUE_REFERENCE)', () => {
    const story = mkStory({
      nodes: [
        { id: 'start', title: 'S', body: '', choices: [
          { id: 'c', label: 'Use key', destination: 'start',
            conditions: [{ field: 'keycard', op: 'has_clue' }] }, // no effect ever adds 'keycard'
        ] },
      ],
    });
    const res = lintStory(story);
    expect(res.errors.map((e) => e.code)).toContain('DEAD_CLUE_REFERENCE');
  });

  it('flags a change_location to an undefined location id (UNDEFINED_LOCATION)', () => {
    const story = mkStory({
      nodes: [
        { id: 'start', title: 'S', body: '', choices: [
          { id: 'c', label: 'Go', destination: 'start',
            effects: [{ field: 'location', op: 'change_location', value: 'loc_nowhere' }] },
        ] },
      ],
    });
    const res = lintStory(story);
    expect(res.errors.map((e) => e.code)).toContain('UNDEFINED_LOCATION');
  });
});
