import { describe, it, expect } from 'vitest';
import { lintStory, GameEngine } from '../../../engine';
import { walkStateSpace } from '../../../engine/stateSpaceWalk';
import { ch2High } from './ch2High';

describe('ch2_high — "The Dry High Traverse"', () => {
  it('lints clean (no errors)', () => {
    expect(lintStory(ch2High).errors).toEqual([]);
  });

  it('is walkable: clock can bite, no cap, no softlocks', () => {
    const r = walkStateSpace(ch2High);
    expect(r.capHit).toBe(false);
    expect(r.softlocks).toEqual([]);
  });

  it('carry-only endings are the only orphans in a standalone walk (F4: daylight needs carried togetherness, dark needs a carried-low lamp)', () => {
    const r = walkStateSpace(ch2High);
    // Reachable from defaults: out_not_whole, grey. Carry-only (expected orphans): daylight, dark.
    expect([...r.orphanEndings].sort()).toEqual(['end_dark_high', 'end_daylight_all_three']);
  });

  it('fast free-climb crosses ahead of the pulse (absent) and surfaces grey', () => {
    const g = new GameEngine(ch2High);
    g.choose('c_freeclimb');      // +20 -> oxbow at 14:50 (before the 14:55 pulse)
    g.choose('c_cross');          // +20 -> Crystal Hall at 15:10; pulse fires ABSENT behind you
    const v = g.choose('c_freeclimb_shaft');
    expect(v.endingReached?.id).toBe('end_grey_high');
    expect(v.state.vars.cave_someone_lost).toBe(false); // crossing ahead loses no one
  });

  it('the slow rig is caught at the oxbow (present); crossing alone loses Rolly -> out, not whole', () => {
    const g = new GameEngine(ch2High);
    g.choose('c_rig');            // +30 -> oxbow at 15:00 (after 14:55) => PRESENT routes to n_pulse_present
    expect(g.view().node.id).toBe('n_pulse_present');
    g.choose('c_cross_fast');     // -> n_lose_here: cave_someone_lost
    g.choose('c_on_crystal');
    const v = g.choose('c_freeclimb_shaft');
    expect(v.endingReached?.id).toBe('end_out_not_whole');
    expect(v.state.vars.companion_status).toBe('lost');
  });
});
