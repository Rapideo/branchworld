import { describe, it, expect } from 'vitest';
import { lintStory, contradicts, staticallyDeadChoice } from './linter';
import type { Story } from './types';
import { mkStory } from '../test/storyFixture';
import { collectSymbols } from './symbols';

// A clean, lint-passing minimal story.
function clean(): Story {
  return {
    id: 'g', title: 'g', startNodeId: 'a', startTime: '15:00', deadline: '16:30',
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
    s.nodes[0].choices[0].effects = [{ field: 'time', op: 'add_minutes', value: '5' }]; // max path is 5 min, well under the 90-min window
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

  it('flags an undefined startLocation (UNDEFINED_LOCATION)', () => {
    const story = mkStory({ startLocation: 'loc_ghost' }); // only loc_a is defined
    expect(lintStory(story).errors.map((e) => e.code)).toContain('UNDEFINED_LOCATION');
  });

  it('flags an event eventLocation that is not a defined location (UNDEFINED_LOCATION)', () => {
    const story = mkStory({
      variables: [{ name: 'seen', type: 'boolean', default: false, purpose: 'x' }],
      nodes: [
        { id: 'start', title: 'S', body: '', choices: [{ id: 'go', label: 'go', destination: 'p' }] },
        { id: 'p', title: 'P', body: '', choices: [], resolvesEnding: true },
        { id: 'rec', title: 'R', body: '', choices: [], resolvesEnding: true },
      ],
      events: [{
        id: 'ev', title: 'E', trigger: [{ field: 'time', op: 'time_after', value: '20:30' }],
        eventLocation: 'loc_ghost', ifPresentNode: 'p',
        ifAbsentEffects: [{ field: 'seen', op: 'set', value: 'true' }], recoveryNodeId: 'rec',
      }],
    });
    expect(lintStory(story).errors.map((e) => e.code)).toContain('UNDEFINED_LOCATION');
  });

  it('flags a node whose only exit is gated on a never-true flag as SOFT_LOCK', () => {
    const story = mkStory({
      variables: [{ name: 'keycard', type: 'boolean', default: false, purpose: 'has keycard' }],
      nodes: [
        { id: 'start', title: 'S', body: '', choices: [
          { id: 'enter', label: 'Enter vault', destination: 'vault' },
        ] },
        { id: 'vault', title: 'Vault', body: '', choices: [
          { id: 'leave', label: 'Leave', destination: 'start',
            conditions: [{ field: 'keycard', op: 'is_true' }] }, // keycard is never set true anywhere
        ] },
      ],
    });
    const res = lintStory(story);
    expect(res.errors.map((e) => e.code)).toContain('SOFT_LOCK');
  });

  it('does NOT flag a node whose gate CAN be satisfied (no false positive)', () => {
    const story = mkStory({
      variables: [{ name: 'keycard', type: 'boolean', default: false, purpose: 'has keycard' }],
      nodes: [
        { id: 'start', title: 'S', body: '', choices: [
          { id: 'grab', label: 'Grab keycard', destination: 'vault',
            effects: [{ field: 'keycard', op: 'set', value: 'true' }] },
        ] },
        { id: 'vault', title: 'Vault', body: '', choices: [
          { id: 'leave', label: 'Leave', destination: 'start', conditions: [{ field: 'keycard', op: 'is_true' }] },
        ] },
      ],
    });
    expect(lintStory(story).errors.map((e) => e.code)).not.toContain('SOFT_LOCK');
  });
});

describe('time-literal and unwinnable-deadline rules', () => {
  it('errors when a time literal falls outside [startTime, deadline] (TIME_LITERAL_OUT_OF_RANGE)', () => {
    const story = mkStory({
      startTime: '20:00', deadline: '23:00',
      nodes: [{ id: 'start', title: 'S', body: '', choices: [
        { id: 'c', label: 'After 1am?', destination: 'start',
          conditions: [{ field: 'time', op: 'time_after', value: '01:00' }] }, // 60 min, far below the 20:00 start
      ] }],
    });
    expect(lintStory(story).errors.map((e) => e.code)).toContain('TIME_LITERAL_OUT_OF_RANGE');
  });

  it('errors on a time_between whose second bound is outside [startTime, deadline]', () => {
    const story = mkStory({
      startTime: '20:00', deadline: '23:00',
      nodes: [{ id: 'start', title: 'S', body: '', choices: [
        { id: 'c', label: '', destination: 'start',
          conditions: [{ field: 'time', op: 'time_between', value: '21:00-01:00' }] },
      ]}],
    });
    expect(lintStory(story).errors.map((e) => e.code)).toContain('TIME_LITERAL_OUT_OF_RANGE');
  });

  it('errors when the shortest reachable path already exceeds the deadline (DEADLINE_UNWINNABLE)', () => {
    const story = mkStory({
      startTime: '20:00', deadline: '20:30', // 30-min window
      nodes: [
        { id: 'start', title: 'S', body: '', choices: [
          { id: 'go', label: 'Long walk', destination: 'end', effects: [{ field: 'time', op: 'add_minutes', value: '60' }] }],
        },
        { id: 'end', title: 'E', body: '', choices: [], resolvesEnding: true },
      ],
    });
    const res = lintStory(story);
    expect(res.errors.map((e) => e.code)).toContain('DEADLINE_UNWINNABLE');
    expect(res.ok).toBe(false);
  });
});

describe('overlap/shadow warnings', () => {
  it('warns when two non-default endings can be simultaneously satisfiable (OVERLAPPING_ENDINGS)', () => {
    const story = mkStory({
      variables: [{ name: 'score', type: 'number', default: 0, purpose: 's' }],
      nodes: [{ id: 'start', title: 'S', body: '', choices: [], resolvesEnding: true }],
      endings: [
        { id: 'a', name: 'A', summary: '', conditions: [{ field: 'score', op: 'gte', value: '1' }] },
        { id: 'b', name: 'B', summary: '', conditions: [{ field: 'score', op: 'gte', value: '5' }] },
        { id: 'def', name: 'Default', summary: '', conditions: [], isDefault: true },
      ],
    });
    expect(lintStory(story).warnings.map((w) => w.code)).toContain('OVERLAPPING_ENDINGS');
  });

  it('does NOT warn when the two overlapping endings have distinct priorities', () => {
    const story = mkStory({
      variables: [{ name: 'score', type: 'number', default: 0, purpose: 's' }],
      nodes: [{ id: 'start', title: 'S', body: '', choices: [], resolvesEnding: true }],
      endings: [
        { id: 'a', name: 'A', summary: '', conditions: [{ field: 'score', op: 'gte', value: '1' }], priority: 0 },
        { id: 'b', name: 'B', summary: '', conditions: [{ field: 'score', op: 'gte', value: '5' }], priority: 10 },
        { id: 'def', name: 'Default', summary: '', conditions: [], isDefault: true },
      ],
    });
    expect(lintStory(story).warnings.map((w) => w.code)).not.toContain('OVERLAPPING_ENDINGS');
  });
});

describe('contradicts (sound — only definite contradictions)', () => {
  it('flags is_true and is_false on the same field', () => {
    expect(contradicts([{ field: 'x', op: 'is_true' }, { field: 'x', op: 'is_false' }])).toBe(true);
  });
  it('flags an empty numeric range (gte 5 and lt 3)', () => {
    expect(contradicts([{ field: 'n', op: 'gte', value: '5' }, { field: 'n', op: 'lt', value: '3' }])).toBe(true);
  });
  it('flags equals to two genuinely different values', () => {
    expect(contradicts([{ field: 'k', op: 'equals', value: 'A' }, { field: 'k', op: 'equals', value: 'B' }])).toBe(true);
  });
  it('does NOT flag equals to numerically-equal literals (5 vs 5.0)', () => {
    expect(contradicts([{ field: 'k', op: 'equals', value: '5' }, { field: 'k', op: 'equals', value: '5.0' }])).toBe(false);
  });
  it('does NOT flag a satisfiable numeric range (gte 3 and lt 5)', () => {
    expect(contradicts([{ field: 'n', op: 'gte', value: '3' }, { field: 'n', op: 'lt', value: '5' }])).toBe(false);
  });
});

describe('TYPE_MISMATCH — numeric ops on declared variables', () => {
  it('flags a numeric comparison against a non-numeric literal (TYPE_MISMATCH)', () => {
    const story = mkStory({
      variables: [{ name: 'score', type: 'number', default: 0, purpose: 's' }],
      nodes: [{ id: 'start', title: 'S', body: '', choices: [
        { id: 'c', label: 'x', destination: 'start', conditions: [{ field: 'score', op: 'gt', value: 'banana' }] }],
      }],
    });
    expect(lintStory(story).errors.map((e) => e.code)).toContain('TYPE_MISMATCH');
  });
});

describe('staticallyDeadChoice — is_true uses num()>0, not JS truthiness', () => {
  it('treats is_true on a var only ever set to a non-numeric string as dead', () => {
    const story = mkStory({
      variables: [{ name: 'status', type: 'string', default: '', purpose: 's' }],
      nodes: [
        { id: 'start', title: 'S', body: '', choices: [
          { id: 'open', label: 'open', destination: 'start', effects: [{ field: 'status', op: 'set', value: 'open' }] },
          { id: 'use', label: 'use', destination: 'start', conditions: [{ field: 'status', op: 'is_true' }] },
        ] },
      ],
    });
    const useChoice = story.nodes[0].choices[1];
    expect(staticallyDeadChoice(useChoice, story, collectSymbols(story))).toBe(true);
  });
});
