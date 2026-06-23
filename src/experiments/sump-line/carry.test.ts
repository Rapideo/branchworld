import { describe, it, expect } from 'vitest';
import { extractCarry, seedChapterStory, minutesToClock } from './carry';
import type { Story, WorldState } from '../../engine';
import type { CarryContract } from './types';

const state: WorldState = {
  time: 970, location: 'X', clues: ['map'], inventory: ['rope'], visited: ['n1'],
  completedEvents: ['e1'], vars: { warmth: 1, trust: 3, name: 'Mara' },
};
const contract: CarryContract = { vars: 'all', resources: ['warmth'], clues: true, inventory: true };

const story = (): Story => ({
  id: 's', title: 's', startNodeId: 'start', startTime: '00:00', deadline: '02:00', startLocation: 'L',
  variables: [{ name: 'trust', type: 'number', default: 0, purpose: 't' }],
  locations: [{ id: 'L', name: 'Cave' }], events: [],
  resources: [{ id: 'warmth', min: 0, max: 4, start: 4, depletion: { everyMinutes: 30, amount: 1 } }],
  nodes: [{ id: 'start', title: 'S', body: 'b', entryEffects: [{ field: 'trust', op: 'increment', value: '1' }], choices: [] }],
  endings: [{ id: 'd', name: 'D', summary: 'd', conditions: [], isDefault: true }],
});

describe('minutesToClock', () => {
  it('renders minutes as HH:MM allowing >24h', () => {
    expect(minutesToClock(90)).toBe('1:30');
    expect(minutesToClock(1570)).toBe('26:10');
    expect(minutesToClock(0)).toBe('0:00');
  });
});

describe('extractCarry', () => {
  it("copies vars (all), the listed resource value, clues and inventory", () => {
    const c = extractCarry(state, contract);
    expect(c.vars.trust).toBe(3);
    expect(c.vars.warmth).toBe(1);
    expect(c.clues).toEqual(['map']);
    expect(c.inventory).toEqual(['rope']);
  });
  it('honors a restricted var list and disabled clues/inventory', () => {
    const c = extractCarry(state, { vars: ['trust'], resources: [], clues: false, inventory: false });
    expect(c.vars).toEqual({ trust: 3 });
    expect(c.clues).toEqual([]);
    expect(c.inventory).toEqual([]);
  });
});

describe('seedChapterStory', () => {
  it('does not mutate the source story', () => {
    const src = story();
    const before = JSON.stringify(src);
    seedChapterStory(src, extractCarry(state, contract), 0);
    expect(JSON.stringify(src)).toBe(before);
  });
  it('rebases variable defaults and resource starts from carried values', () => {
    const seeded = seedChapterStory(story(), extractCarry(state, contract), 0);
    expect(seeded.variables.find((v) => v.name === 'trust')!.default).toBe(3);
    expect(seeded.resources!.find((r) => r.id === 'warmth')!.start).toBe(1);
  });
  it('injects carried clues and inventory as prepended start-node entry effects', () => {
    const seeded = seedChapterStory(story(), extractCarry(state, contract), 0);
    const start = seeded.nodes.find((n) => n.id === 'start')!;
    expect(start.entryEffects![0]).toEqual({ field: 'clues', op: 'add_clue', value: 'map' });
    expect(start.entryEffects!.some((e) => e.op === 'add_item' && e.value === 'rope')).toBe(true);
    // authored entry effect is preserved after the injected ones
    expect(start.entryEffects!.some((e) => e.field === 'trust' && e.op === 'increment')).toBe(true);
  });
  it('projects the game deadline onto the chapter deadline when the horizon is tighter', () => {
    // chapter own deadline 02:00 = 120 min; game has 50 min left -> deadline becomes 00:50
    const seeded = seedChapterStory(story(), extractCarry(state, contract), 550, 600);
    expect(seeded.deadline).toBe('0:50');
  });
  it("leaves the chapter deadline alone when the game horizon is looser", () => {
    const seeded = seedChapterStory(story(), extractCarry(state, contract), 0, 600);
    expect(seeded.deadline).toBe('2:00'); // min(120, 600) -> 120 = 02:00
  });
});
