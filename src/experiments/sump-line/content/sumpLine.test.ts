import { describe, it, expect } from 'vitest';
import { lintGame, GameRunner } from '..';
import { sumpLine } from './sumpLine';

// Drive ch1 to the high fork, carrying Rolly the whole way (sets cave_all_together).
function ch1HighWithRolly(g: GameRunner) {
  g.choose('c_down');
  g.choose('c_to_rolly');
  g.choose('c_stabilise'); // splint + carry -> companion_status with_you
  g.choose('c_carry_on');
  g.choose('c_scout_high');
  g.choose('c_lead_up');    // cave_all_together -> true
  g.choose('c_on_high');    // -> resolves ch1_to_high -> transitions to ch2_high
}

describe('The Sump Line — the wired game', () => {
  it('lintGame is clean', () => {
    const r = lintGame(sumpLine);
    expect(r.errors).toEqual([]);
  });

  it('survival meters carry across the chapter boundary (lamp enters ch2 depleted, not reset)', () => {
    const g = new GameRunner(sumpLine);
    ch1HighWithRolly(g);
    expect(g.view().chapterId).toBe('ch2_high');
    // ch1 burned ~35 of the lamp; it carries in below its standalone start of 60 (rebased, not reset to 60).
    expect(Number(g.view().state.vars.lamp_charge)).toBeLessThan(60);
    expect(Number(g.view().state.vars.lamp_charge)).toBeGreaterThan(0);
    expect(g.view().gameElapsedMinutes).toBeGreaterThan(0); // the game clock accumulated ch1's time
  });

  it('the HIGH route, kept together, lamp surviving -> "Daylight, All Three" (a carry-only ending)', () => {
    const g = new GameRunner(sumpLine);
    ch1HighWithRolly(g);
    g.choose('c_freeclimb');     // fast: cross ahead of the pulse (absent)
    g.choose('c_cross');
    const v = g.choose('c_freeclimb_shaft');
    expect(v.gameOver).toBe(true);
    expect(v.finalEndingId).toBe('end_daylight_all_three');
  });

  it('the SUMP route, catching the dropped-water window -> "A Grey Way Out"', () => {
    const g = new GameRunner(sumpLine);
    g.choose('c_down');
    g.choose('c_to_rolly');
    g.choose('c_push');          // no carry; flood rises -> sump fork
    g.choose('c_godown');        // -> ch1_to_sump -> transitions to ch2_sump
    expect(g.view().chapterId).toBe('ch2_sump');
    g.choose('c_to_crawl');      // present: the window
    const v = g.choose('c_drop_dive');
    expect(v.gameOver).toBe(true);
    expect(v.finalEndingId).toBe('end_grey_sump');
  });

  it('a lamp run low across both chapters dies in the dark -> "The Cave Keeps You" (cross-chapter only)', () => {
    const g = new GameRunner(sumpLine);
    ch1HighWithRolly(g);         // slow carry route burns the lamp down to ~25 entering ch2
    g.choose('c_rig');           // slow rig: caught at the oxbow (present)
    g.choose('c_cross_fast');    // -> n_lose_here
    g.choose('c_on_crystal');
    const v = g.choose('c_rig_shaft'); // the long shaft rig pushes the lamp past zero mid-climb
    expect(v.gameOver).toBe(true);
    expect(v.finalEndingId).toBe('end_dark_high');
    expect(v.state.vars.cave_dark_out).toBe(true);
  });
});
