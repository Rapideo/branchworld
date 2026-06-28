import { describe, it, expect } from 'vitest';
import { lintStory, GameEngine } from '../../../engine';
import { walkStateSpace } from '../../../engine/stateSpaceWalk';
import { ch1Descent } from './ch1Descent';

describe('ch1_descent — "The Pulse" (expanded, ~26 beats)', () => {
  it('lints clean (no errors)', () => {
    expect(lintStory(ch1Descent).errors).toEqual([]);
  });

  it('stays exhaustively walkable: no cap, no softlocks, both fork endings reachable', () => {
    // At 26 beats with loop-backs + the open-duck reconnaissance node, the exhaustive walk explores
    // ~53k states — over the 50k DEFAULT backstop but fully tractable (this is exactly H10: distinct
    // accumulated time at reconverging hubs dominates, and H9: evening-scale chapters need the seeded/
    // scalable walker). The walk completes cleanly: no soft-locks, no orphan endings, both forks reached.
    const r = walkStateSpace(ch1Descent, { cap: 80000 });
    expect(r.capHit).toBe(false);
    expect(r.softlocks).toEqual([]);
    expect(r.orphanEndings).toEqual([]);
    expect(r.eventPresent.filter((e) => !e.ok)).toEqual([]); // H8: every scheduled event's present branch is reachable
  });

  it('looking at the low way does NOT seal the cave early (H6: looking ≠ sealing)', () => {
    const g = new GameEngine(ch1Descent);
    // a brisk push to the choke, well before the 15:00 seal
    ['c_gear_in', 'c_descend', 'c_streamway', 'c_press', 'c_to_rolly', 'c_push', 'c_to_choke'].forEach((c) => g.choose(c));
    const v = g.choose('c_check_low');
    expect(v.node.id).toBe('n_duck_look'); // reconnaissance, not the seal event
    expect(v.state.vars.cave_sump_sealed).toBe(false); // looking didn't seal it
    // the open duck still offers the dive (sealed is false) and a way back up to the high route
    expect(v.choices.find((c) => c.id === 'c_dive_open')?.available).toBe(true);
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
