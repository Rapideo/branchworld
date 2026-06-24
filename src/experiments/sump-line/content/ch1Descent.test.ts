import { describe, it, expect } from 'vitest';
import { lintStory, GameEngine } from '../../../engine';
import { walkStateSpace } from '../../../engine/stateSpaceWalk';
import { ch1Descent } from './ch1Descent';

describe('ch1_descent — "The Pulse" (expanded, ~26 beats)', () => {
  it('lints clean (no errors)', () => {
    expect(lintStory(ch1Descent).errors).toEqual([]);
  });

  it('stays exhaustively walkable: no cap, no softlocks, both fork endings reachable', () => {
    const r = walkStateSpace(ch1Descent);
    expect(r.capHit).toBe(false);
    expect(r.softlocks).toEqual([]);
    expect(r.orphanEndings).toEqual([]);
  });

  it('the HIGH route, carrying Rolly the whole way -> ch1_to_high, together', () => {
    const g = new GameEngine(ch1Descent);
    ['c_gear_in', 'c_descend', 'c_streamway', 'c_press', 'c_to_rolly', 'c_stabilise', 'c_carry_on', 'c_to_choke', 'c_scout_high', 'c_lead_up'].forEach((c) => g.choose(c));
    const v = g.choose('c_on_high');
    expect(v.endingReached?.id).toBe('ch1_to_high');
    expect(v.state.vars.cave_route).toBe('high');
    expect(v.state.vars.companion_status).toBe('with_you');
    expect(v.state.vars.cave_all_together).toBe(true);
  });

  it('the SUMP route, pushing on with the water high -> ch1_to_sump', () => {
    const g = new GameEngine(ch1Descent);
    ['c_gear_in', 'c_descend', 'c_streamway', 'c_press', 'c_to_rolly', 'c_push', 'c_to_choke'].forEach((c) => g.choose(c));
    const v = g.choose('c_godown');
    expect(v.endingReached?.id).toBe('ch1_to_sump');
    expect(v.state.vars.cave_route).toBe('sump');
  });

  it('detours all rejoin the spine, and heavy wandering runs the clock out -> sump default (time is the only constraint)', () => {
    const g = new GameEngine(ch1Descent);
    [
      'c_gear_in', 'c_descend', 'c_streamway',
      'c_oxbow', 'c_oxbow_back', 'c_sound', 'c_water_back', // loop-back detours off the streamway
      'c_press', 'c_to_rolly',
      'c_assess', 'c_assess_back', 'c_word', 'c_word_back', // loop-back detours off the Rolly decision
      'c_stabilise', 'c_carry_on', 'c_to_choke',
      'c_study', 'c_study_back', // loop-back detour off the choke
      'c_scout_high', 'c_lead_up',
    ].forEach((c) => g.choose(c));
    const v = g.choose('c_on_high');
    // No dead-end was ever hit (every detour rejoined) — but all that backtracking ran the 15:30 clock out
    // before the high commit, so the clock commits you to the sump default. The model, working as designed.
    expect(v.endingReached?.id).toBe('ch1_to_sump');
  });
});
