import { describe, it, expect, beforeEach } from 'vitest';
import { loadSlots, writeSlot, deleteSlot, type SaveSlot } from './storage';
import type { EngineSnapshot } from '../../engine';

const snap: EngineSnapshot = {
  version: 1, storyId: 'sample_410', currentId: 'briefed',
  state: { time: 940, location: 'L_DINER', clues: [], inventory: [], visited: ['start', 'briefed'], completedEvents: [], vars: { knows_envelope: true, mara_trust: 1, saw_pickup: false } },
  log: [],
};
const slot: SaveSlot = { snapshot: snap, savedAt: '2026-06-16T00:00:00.000Z', summary: '3:40 PM - L_DINER' };

describe('save storage', () => {
  beforeEach(() => localStorage.clear());
  it('writes, reads, and deletes named slots', () => {
    expect(loadSlots('sample_410')).toEqual({});
    writeSlot('sample_410', 'first', slot);
    expect(loadSlots('sample_410').first.snapshot.currentId).toBe('briefed');
    deleteSlot('sample_410', 'first');
    expect(loadSlots('sample_410')).toEqual({});
  });
  it('returns {} on corrupt data', () => {
    localStorage.setItem('branchworld:saves:sample_410', '{not json');
    expect(loadSlots('sample_410')).toEqual({});
  });
  it('namespaces by story id', () => {
    writeSlot('sample_410', 's', slot);
    expect(loadSlots('other_story')).toEqual({});
  });
});
