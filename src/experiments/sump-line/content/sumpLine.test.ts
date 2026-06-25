import { describe, it, expect } from 'vitest';
import { lintGame, GameRunner } from '..';
import { sumpLine } from './sumpLine';

// Drive the expanded ch1 to the high fork, carrying Rolly the whole way (sets cave_all_together).
function ch1HighWithRolly(g: GameRunner) {
  // spine: descend -> streamway -> the pulse -> splint & carry -> the choke -> scout high -> over the top
  ['c_gear_in', 'c_descend', 'c_streamway', 'c_press', 'c_to_rolly', 'c_stabilise', 'c_carry_on', 'c_to_choke', 'c_scout_high', 'c_lead_up', 'c_on_high'].forEach((c) => g.choose(c));
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
    // ch2 fast, efficient: free-climb, cross ahead of the pulse, free-climb the shaft — the lamp just survives
    ['c_freeclimb', 'c_aven_on', 'c_pitch_on', 'c_to_oxbow', 'c_cross', 'c_to_crystal', 'c_traverse_on', 'c_freeclimb_shaft'].forEach((c) => g.choose(c));
    const v = g.choose('c_climb_last');
    expect(v.gameOver).toBe(true);
    expect(v.finalEndingId).toBe('end_daylight_all_three');
  });

  it('the SUMP route, catching the dropped-water window -> "A Grey Way Out"', () => {
    const g = new GameRunner(sumpLine);
    // ch1 sump fork: push on without carrying, water high, commit to the water
    ['c_gear_in', 'c_descend', 'c_streamway', 'c_press', 'c_to_rolly', 'c_push', 'c_to_choke', 'c_godown'].forEach((c) => g.choose(c));
    expect(g.view().chapterId).toBe('ch2_sump');
    // ch2_sump: push to the crawl, catch the dropped-water window, dive through to the far rift
    ['c_to_crawl', 'c_duck_on', 'c_deep_on', 'c_drop_dive', 'c_dive_on'].forEach((c) => g.choose(c));
    const v = g.choose('c_far_on');
    expect(v.gameOver).toBe(true);
    expect(v.finalEndingId).toBe('end_grey_sump');
  });

  it('a lamp run low across both chapters dies in the dark -> "The Cave Keeps You" (cross-chapter only)', () => {
    const g = new GameRunner(sumpLine);
    ch1HighWithRolly(g);         // the long carry route burns the lamp down to ~30 entering ch2
    // ch2 slow & long: rig, caught at the oxbow, cross alone, rig the shaft — the lamp runs to zero mid-climb
    ['c_rig', 'c_aven_on', 'c_pitch_on', 'c_to_oxbow', 'c_cross_fast', 'c_on_after', 'c_to_crystal', 'c_traverse_on', 'c_rig_shaft'].forEach((c) => g.choose(c));
    const v = g.choose('c_climb_last');
    expect(v.gameOver).toBe(true);
    expect(v.finalEndingId).toBe('end_dark_high');
    expect(v.state.vars.cave_dark_out).toBe(true);
  });

  it('a companion lost in ch1 is NOT re-lost at the ch2 oxbow — crosses alone, togetherness never claimed (H/F-C, F-E)', () => {
    const g = new GameRunner(sumpLine);
    // ch1: push on (Rolly hurt), scout high, strand Rolly at the ledge, climb out alone
    ['c_gear_in', 'c_descend', 'c_streamway', 'c_press', 'c_to_rolly', 'c_push', 'c_to_choke', 'c_scout_high', 'c_strand', 'c_climb_alone'].forEach((c) => g.choose(c));
    expect(g.view().chapterId).toBe('ch2_high');
    expect(g.view().state.vars.cave_someone_lost).toBe(true);
    expect(g.view().state.vars.cave_all_together).toBe(false); // the strand cleared the togetherness latch (F-E)

    // ch2: the slow rig is caught at the oxbow by the second pulse (present)
    ['c_rig', 'c_aven_on', 'c_pitch_on', 'c_to_oxbow'].forEach((c) => g.choose(c));
    expect(g.view().node.id).toBe('n_pulse_present');
    // already lost a chapter ago: the fresh-loss choice is gated off; only "cross alone" remains (F-C)
    expect(g.view().choices.find((c) => c.id === 'c_cross_fast')?.available).toBe(false);
    expect(g.view().choices.find((c) => c.id === 'c_cross_alone')?.available).toBe(true);
    g.choose('c_cross_alone');

    ['c_to_crystal', 'c_traverse_on', 'c_freeclimb_shaft'].forEach((c) => g.choose(c));
    const v = g.choose('c_climb_last');
    expect(v.gameOver).toBe(true);
    // an honest ending for a lost (and possibly dark) run — never the "all three" reunion
    expect(v.finalEndingId).not.toBe('end_daylight_all_three');
    expect(v.state.vars.cave_all_together).toBe(false);
  });
});
