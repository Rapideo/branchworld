import { describe, it, expect } from 'vitest';
import { lintStory, GameEngine } from '../../../engine';
import { walkStateSpace } from '../../../engine/stateSpaceWalk';
import { ch1Descent } from './ch1Descent';

describe('ch1_descent — "The Pulse"', () => {
  it('lints clean (no errors)', () => {
    const r = lintStory(ch1Descent);
    expect(r.errors).toEqual([]);
  });

  it('the clock can bite and the chapter is walkable with no softlocks', () => {
    const r = walkStateSpace(ch1Descent);
    expect(r.capHit).toBe(false);
    expect(r.softlocks).toEqual([]);
  });

  it('both fork endings are reachable; no orphan endings (ch1 has no carry-only dark endings)', () => {
    const r = walkStateSpace(ch1Descent);
    expect(r.orphanEndings).toEqual([]);
  });

  it('the high route: carry Rolly up and over the choke -> ch1_to_high, cave_route "high"', () => {
    const g = new GameEngine(ch1Descent);
    g.choose('c_down');
    g.choose('c_to_rolly');
    g.choose('c_stabilise');   // splint + carry: companion_status -> with_you
    g.choose('c_carry_on');
    g.choose('c_scout_high');
    g.choose('c_lead_up');     // lead Rolly up: cave_all_together -> true
    const v = g.choose('c_on_high'); // -> n_take_high (resolvesEnding)
    expect(v.endingReached?.id).toBe('ch1_to_high');
    expect(v.state.vars.cave_route).toBe('high');
    expect(v.state.vars.companion_status).toBe('with_you');
    expect(v.state.vars.cave_all_together).toBe(true);
  });

  it('the sump route: push on, water high, commit to the drowned crawl -> ch1_to_sump, cave_route "sump"', () => {
    const g = new GameEngine(ch1Descent);
    g.choose('c_down');
    g.choose('c_to_rolly');
    g.choose('c_push');        // no splint: flood_water -> 2, companion stays hurt
    const v = g.choose('c_godown'); // flood_water gte 2 -> n_take_low (resolvesEnding)
    expect(v.endingReached?.id).toBe('ch1_to_sump');
    expect(v.state.vars.cave_route).toBe('sump');
  });

  it('stranding Rolly latches the loss state (companion lost + someone_lost)', () => {
    const g = new GameEngine(ch1Descent);
    g.choose('c_down');
    g.choose('c_to_rolly');
    g.choose('c_push');        // do not carry -> companion_status stays 'hurt'
    g.choose('c_scout_high');
    g.choose('c_strand');      // not with_you -> strand: companion_status 'lost', cave_someone_lost true
    const v = g.choose('c_climb_alone');
    expect(v.endingReached?.id).toBe('ch1_to_high');
    expect(v.state.vars.companion_status).toBe('lost');
    expect(v.state.vars.cave_someone_lost).toBe(true);
  });
});
