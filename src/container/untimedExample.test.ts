import { describe, it, expect } from 'vitest';
import { lintGame } from './lintGame';
import { GameRunner } from './GameRunner';
import { walkStateSpace } from '../engine/stateSpaceWalk';
import { untimedExample } from './untimedExample';

describe('untimedExample — untimed reference game', () => {
  // -----------------------------------------------------------------------
  // T1: lint-clean
  // -----------------------------------------------------------------------
  it('lintGame produces no errors', () => {
    const result = lintGame(untimedExample);
    expect(result.errors, JSON.stringify(result.errors, null, 2)).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // T2: GameRunner plays both chapters to a game-over ending
  // -----------------------------------------------------------------------
  it('GameRunner: make_case path reaches deal_closed (priority-2 ending)', () => {
    const g = new GameRunner(untimedExample);
    expect(g.view().chapterId).toBe('ch1');

    // ch1: search the ledger → ch1_ledger (entryEffect sets found_note=true) → ch1_note_taken
    // settle() → catch-all transition to ch2
    const v1 = g.choose('search_ledger');
    expect(v1.chapterId).toBe('ch2');
    expect(v1.gameOver).toBe(false);

    // ch2: make_case → ch2_stated (entryEffects: made_case=true, trust+=2) → deal_closed
    const v2 = g.choose('make_case');
    expect(v2.gameOver).toBe(true);
    expect(v2.finalEndingId).toBe('deal_closed');
  });

  it('GameRunner: speak_up path reaches deal_partial (priority-1 ending)', () => {
    const g = new GameRunner(untimedExample);
    g.choose('leave_now'); // ch1 → ch1_departed (default) → ch2
    const v = g.choose('speak_up'); // trust += 1 → deal_partial
    expect(v.gameOver).toBe(true);
    expect(v.finalEndingId).toBe('deal_partial');
  });

  it('GameRunner: keep_quiet path reaches deal_blown (default ending)', () => {
    const g = new GameRunner(untimedExample);
    g.choose('leave_now'); // ch1 → ch2
    const v = g.choose('keep_quiet'); // trust stays 0, made_case false → deal_blown
    expect(v.gameOver).toBe(true);
    expect(v.finalEndingId).toBe('deal_blown');
  });

  // -----------------------------------------------------------------------
  // T3: walkStateSpace on each chapter has no softlocks
  // -----------------------------------------------------------------------
  it('ch1 walkStateSpace — no softlocks', () => {
    const report = walkStateSpace(untimedExample.chapters[0].story);
    expect(report.softlocks).toEqual([]);
  });

  it('ch2 walkStateSpace — no softlocks', () => {
    const report = walkStateSpace(untimedExample.chapters[1].story);
    expect(report.softlocks).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // T4: the clock stays inert throughout — no time elapses
  // -----------------------------------------------------------------------
  it('no time elapses across the full game (no add_minutes)', () => {
    const g = new GameRunner(untimedExample);
    g.choose('search_ledger');  // ch1 → ch2
    g.choose('make_case');      // ch2 → game over
    expect(g.view().gameElapsedMinutes).toBe(0);
  });
});
