import { describe, it, expect } from 'vitest';
import { GameRunner } from './GameRunner';
import { exampleGame } from './exampleGame';

describe('GameRunner — end to end on the synthetic game', () => {
  it('routes ch1 -> ch2a (warm) -> ch3, carrying warmth, to a game ending', () => {
    const g = new GameRunner(exampleGame);
    expect(g.view().chapterId).toBe('ch1');
    g.choose('fast');           // +30 min: warmth 4 -> 3 (1 step). c1 ends -> warmth 3 > 2 -> ch2a
    expect(g.view().chapterId).toBe('ch2a');
    g.choose('on');             // +30 min in ch2a: warmth 3 -> 2
    expect(g.view().chapterId).toBe('ch3');
    const v = g.choose('climb'); // ch3 game ending
    expect(v.gameOver).toBe(true);
    expect(v.finalEndingId).toBe('survived'); // warmth still > 0
  });

  it('routes ch1 -> ch2b (cold) when warmth drops to <= 2, and can freeze by ch3', () => {
    const g = new GameRunner(exampleGame);
    g.choose('slow');           // +90 min: warmth 4 -> 1 (3 steps) -> <= 2 -> ch2b
    expect(g.view().chapterId).toBe('ch2b');
    g.choose('on');             // +40 min @ 20/step: warmth 1 -> 0 (2 steps) -> frozen_flag set
    expect(g.view().chapterId).toBe('ch3');
    const v = g.choose('climb');
    expect(v.gameOver).toBe(true);
    expect(v.finalEndingId).toBe('frozen'); // warmth hit 0
  });

  it('accumulates the game clock across chapters', () => {
    const g = new GameRunner(exampleGame);
    g.choose('fast');  // 30
    g.choose('on');    // 30
    g.choose('climb'); // 20
    expect(g.view().gameElapsedMinutes).toBe(80);
  });

  it('snapshot/restore round-trips mid-game', () => {
    const g = new GameRunner(exampleGame);
    g.choose('fast'); // now in ch2a
    const snap = g.snapshot();
    const g2 = new GameRunner(exampleGame);
    g2.restore(snap);
    expect(g2.view().chapterId).toBe('ch2a');
    const v = g2.choose('on');
    expect(v.chapterId).toBe('ch3');
  });
});
