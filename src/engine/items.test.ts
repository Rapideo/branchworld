import { describe, it, expect } from 'vitest';
import { GameEngine } from './engine';
import { lintStory } from './linter';
import type { Story } from './types';

function heistStory(startThermite: number): Story {
  return {
    id: 'h', title: 'heist', startNodeId: 'vault', startTime: '02:00', deadline: '02:20', startLocation: 'L',
    variables: [{ name: 'thermite', type: 'number', kind: 'item', default: startThermite, min: 0, max: 3, label: 'Thermite', purpose: 'breaching charges' }],
    locations: [{ id: 'L', name: 'L' }], events: [],
    nodes: [
      { id: 'vault', title: 'Vault', body: '', choices: [
        { id: 'blow', label: 'Blow the vault', conditions: [{ field: 'thermite', op: 'has_item' }],
          effects: [{ field: 'thermite', op: 'decrement', value: '1' }, { field: 'time', op: 'add_minutes', value: '20' }], destination: 'open' },
      ] },
      { id: 'open', title: 'Open', body: '', choices: [], resolvesEnding: true },
    ],
    endings: [{ id: 'd', name: 'D', summary: '', conditions: [], isDefault: true }],
  };
}

describe('counted inventory (items as flagged count-vars)', () => {
  it('lints clean', () => {
    expect(lintStory(heistStory(1)).errors).toEqual([]);
  });
  it('a has_item-gated choice is available and spends the item (clamped at min)', () => {
    const g = new GameEngine(heistStory(1));
    g.start();
    expect(g.view().choices.find((c) => c.id === 'blow')?.available).toBe(true);
    const v = g.choose('blow'); // spends 1 -> 0
    expect(Number(v.state.vars.thermite)).toBe(0);
  });
  it('the gated choice is unavailable when the item is exhausted', () => {
    const g = new GameEngine(heistStory(0));
    g.start();
    expect(g.view().choices.find((c) => c.id === 'blow')?.available).toBe(false);
  });
});
