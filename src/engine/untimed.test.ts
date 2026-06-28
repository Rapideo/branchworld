import { describe, it, expect } from 'vitest';
import type { Story } from './types';
import { GameEngine } from './engine';
import { lintStory } from './linter';
import { walkStateSpace } from './stateSpaceWalk';

// untimed: NO deadline, no time-driven resources, no clock-reading conditions, no out-of-time ending.
const untimed: Story = {
  id: 'u', title: 'Untimed', startNodeId: 'start', startTime: '00:00', startLocation: 'L',
  profile: { clock: 'untimed' },
  variables: [{ name: 'opened', type: 'boolean', default: false, purpose: 'a latch' }],
  locations: [{ id: 'L', name: 'L' }], events: [],
  nodes: [
    { id: 'start', title: 'Start', body: '', choices: [
      { id: 'open', label: 'open it', destination: 'end', effects: [{ field: 'opened', op: 'set', value: 'true' }] },
      { id: 'leave', label: 'leave', destination: 'end', effects: [] },
    ] },
    { id: 'end', title: 'End', body: '', choices: [], resolvesEnding: true },
  ],
  endings: [
    { id: 'opened', name: 'Opened', summary: '', conditions: [{ field: 'opened', op: 'is_true' }], priority: 1 },
    { id: 'left', name: 'Left', summary: '', conditions: [], isDefault: true },
  ],
};

describe('untimed game (no clock)', () => {
  it('lints clean', () => { expect(lintStory(untimed).errors).toEqual([]); });
  it('runs to an ending with no deadline-forced resolution', () => {
    expect(new GameEngine(untimed).choose('open').endingReached?.id).toBe('opened');
  });
  it('walks with no softlocks; both endings reachable', () => {
    const r = walkStateSpace(untimed);
    expect(r.softlocks).toEqual([]);
    expect(r.orphanEndings).toEqual([]);
  });
});
