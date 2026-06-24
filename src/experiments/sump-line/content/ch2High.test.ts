import { describe, it, expect } from 'vitest';
import { lintStory, GameEngine } from '../../../engine';
import { walkStateSpace } from '../../../engine/stateSpaceWalk';
import { ch2High } from './ch2High';

describe('ch2_high — "The Dry High Traverse" (expanded)', () => {
  it('lints clean (no errors)', () => {
    expect(lintStory(ch2High).errors).toEqual([]);
  });

  it('stays exhaustively walkable: no cap, no softlocks', () => {
    const r = walkStateSpace(ch2High);
    expect(r.capHit).toBe(false);
    expect(r.softlocks).toEqual([]);
  });

  it('only the carry-only endings (daylight + dark) are standalone orphans (F4)', () => {
    const r = walkStateSpace(ch2High);
    expect([...r.orphanEndings].sort()).toEqual(['end_dark_high', 'end_daylight_all_three']);
  });

  it('fast free-climb crosses ahead of the pulse (absent) and surfaces grey', () => {
    const g = new GameEngine(ch2High);
    ['c_freeclimb', 'c_aven_on', 'c_pitch_on', 'c_to_oxbow', 'c_cross', 'c_to_crystal', 'c_traverse_on', 'c_freeclimb_shaft'].forEach((c) => g.choose(c));
    const v = g.choose('c_climb_last');
    expect(v.endingReached?.id).toBe('end_grey_high');
    expect(v.state.vars.cave_someone_lost).toBe(false);
  });

  it('the slow rig is caught at the oxbow (present); crossing alone loses Rolly -> out, not whole', () => {
    const g = new GameEngine(ch2High);
    ['c_rig', 'c_aven_on', 'c_pitch_on', 'c_to_oxbow'].forEach((c) => g.choose(c));
    expect(g.view().node.id).toBe('n_pulse_present');
    ['c_cross_fast', 'c_on_after', 'c_to_crystal', 'c_traverse_on', 'c_freeclimb_shaft'].forEach((c) => g.choose(c));
    const v = g.choose('c_climb_last');
    expect(v.endingReached?.id).toBe('end_out_not_whole');
    expect(v.state.vars.companion_status).toBe('lost');
  });
});
