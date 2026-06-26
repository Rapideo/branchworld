import { describe, it, expect } from 'vitest';
import { lintStory, GameEngine } from '../../../engine';
import { walkStateSpace } from '../../../engine/stateSpaceWalk';
import { resolveEndingAt } from '../../../engine/endingResolver';
import { ch2High } from './ch2High';

const mkState = (vars: Record<string, boolean>) => ({
  time: 0, location: 'high_rift', clues: [] as string[], inventory: [] as string[],
  visited: [] as string[], completedEvents: [] as string[], vars,
});

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

  it('the benighted default fires when you never climbed out — not a false escape (F1/H4)', () => {
    // past the deadline, never reached the shaft: cave_climbed_out false, lamp alive, no loss
    const st = mkState({ cave_climbed_out: false, cave_dark_out: false, cave_hypothermic: false, cave_all_together: false, cave_someone_lost: false });
    expect(resolveEndingAt(st, ch2High, undefined, undefined, true)?.id).toBe('end_benighted_high');
  });

  it('the surfacing endings require actually climbing out (F1)', () => {
    const climbed = (extra: Record<string, boolean> = {}) =>
      mkState({ cave_climbed_out: true, cave_dark_out: false, cave_hypothermic: false, cave_all_together: false, cave_someone_lost: false, ...extra });
    expect(resolveEndingAt(climbed(), ch2High, undefined, undefined, false)?.id).toBe('end_grey_high');
    expect(resolveEndingAt(climbed({ cave_all_together: true }), ch2High, undefined, undefined, false)?.id).toBe('end_daylight_all_three');
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
