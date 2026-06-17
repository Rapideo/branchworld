import { describe, it, expect } from 'vitest';
import { GameEngine, lintStory } from '../engine';
import { sampleStory } from './sampleStory';

describe('sampleStory', () => {
  it('lints clean with no warnings', () => {
    const r = lintStory(sampleStory);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
  it('present path reaches the witnessed ending', () => {
    const g = new GameEngine(sampleStory);
    g.choose('ask');        // 15:40, knows, trust 1
    g.choose('watchnow');   // -> watch, 15:50
    const v = g.choose('keep'); // +20 -> 16:10 at diner: event present -> witness
    expect(v.node.id).toBe('witness');
    expect(v.endingReached?.id).toBe('witnessed');
  });
  it('absent path plants the receipt and reaches the receipt ending via the recovery node', () => {
    const g = new GameEngine(sampleStory);
    g.choose('arcade');     // loc ARCADE, 15:50
    g.choose('play');       // +20 -> 16:10 absent: receipt planted
    const v = g.choose('headback'); // -> find_receipt
    expect(v.node.id).toBe('find_receipt');
    expect(v.state.clues).toContain('receipt');
    expect(v.endingReached?.id).toBe('receipt_trail');
  });
  it('locks the press choice until trust is high enough (hidden->revealed)', () => {
    const g = new GameEngine(sampleStory);
    g.choose('ask');        // briefed, trust 1
    expect(g.view().choices.find((c) => c.id === 'press')?.available).toBe(false);
    g.choose('apologize');  // closer, trust 2
    expect(g.view().choices.find((c) => c.id === 'press')?.available).toBe(true);
  });
});
