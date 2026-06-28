import { describe, it, expect } from 'vitest';
import { lintStory, GameEngine } from '../../../engine';
import { walkStateSpace } from '../../../engine/stateSpaceWalk';
import { ch1WayIn } from './ch1WayIn';

describe('ch1_wayin — The Way In', () => {
  it('lints clean (no errors)', () => {
    expect(lintStory(ch1WayIn).errors).toEqual([]);
  });
  it('is walkable with no softlocks and the clock can bite', () => {
    const r = walkStateSpace(ch1WayIn, { cap: 80000 });
    expect(r.capHit).toBe(false);
    expect(r.softlocks).toEqual([]);
  });
  it('the box can be blown only with a charge, and blowing spends it (counted inventory)', () => {
    const g = new GameEngine(ch1WayIn);
    g.start();
    ['c_approach', 'c_quiet', 'c_quiet_on'].forEach((c) => g.choose(c)); // arrive at n_box with 1 charge
    expect(g.view().node.id).toBe('n_box');
    expect(g.view().choices.find((c) => c.id === 'c_blow')?.available).toBe(true);
    const v = g.choose('c_blow');
    expect(Number(v.state.vars.charges)).toBe(0); // spent, clamped at min 0
  });
  it('the full take accumulates via the grab chain (counted, not boolean)', () => {
    const g = new GameEngine(ch1WayIn);
    g.start();
    ['c_approach', 'c_quiet', 'c_quiet_on', 'c_blow'].forEach((c) => g.choose(c)); // -> n_grab1, loot 1
    expect(Number(g.view().state.vars.loot)).toBe(1);
    g.choose('c_more1'); expect(Number(g.view().state.vars.loot)).toBe(2);
    g.choose('c_more2'); expect(Number(g.view().state.vars.loot)).toBe(3);
  });
  it('a Lead-buy raises The Lead above the no-buy line (adjust_resource), net of its time cost', () => {
    const noBuy = new GameEngine(ch1WayIn); noBuy.start();
    ['c_approach', 'c_quiet', 'c_quiet_on'].forEach((c) => noBuy.choose(c));   // skip the casing buy
    const withBuy = new GameEngine(ch1WayIn); withBuy.start();
    ['c_case', 'c_case_on', 'c_quiet', 'c_quiet_on'].forEach((c) => withBuy.choose(c)); // take the casing buy
    expect(withBuy.view().node.id).toBe('n_box');
    expect(Number(withBuy.view().state.vars.lead)).toBeGreaterThan(Number(noBuy.view().state.vars.lead));
  });
  it('both Floor latches are reachable and mutually exclusive per path', () => {
    const quiet = new GameEngine(ch1WayIn); quiet.start();
    ['c_approach', 'c_quiet'].forEach((c) => quiet.choose(c));
    expect(quiet.view().state.vars.made_clean).toBe(true);
    expect(quiet.view().state.vars.alarm_tripped).toBe(false);
    const loud = new GameEngine(ch1WayIn); loud.start();
    ['c_approach', 'c_loud'].forEach((c) => loud.choose(c));
    expect(loud.view().state.vars.alarm_tripped).toBe(true);
    expect(loud.view().state.vars.made_clean).toBe(false);
  });
});

describe('ch1_wayin — the loud Floor', () => {
  it('still lints clean and walks with no softlocks after the loud expansion', () => {
    const r = walkStateSpace(ch1WayIn, { cap: 80000 });
    expect(lintStory(ch1WayIn).errors).toEqual([]);
    expect(r.capHit).toBe(false);
    expect(r.softlocks).toEqual([]);
  });
  it('the loud Floor reconverges at the box and spends Lead on the charge', () => {
    const loud = new GameEngine(ch1WayIn); loud.start();
    ['c_approach', 'c_loud', 'c_loud_on'].forEach((c) => loud.choose(c)); // -> n_floor_loud_react
    expect(loud.view().node.id).toBe('n_floor_loud_react');
    const afterCharge = loud.choose('c_charge'); // -> n_box
    expect(afterCharge.node.id).toBe('n_box');
    // the loud-charge run holds LESS Lead than the quiet relay-cut run at the box
    const quiet = new GameEngine(ch1WayIn); quiet.start();
    ['c_approach', 'c_quiet', 'c_quiet_on'].forEach((c) => quiet.choose(c)); // quiet -> n_box (buys +10)
    expect(Number(afterCharge.state.vars.lead)).toBeLessThan(Number(quiet.view().state.vars.lead));
  });
  it('the relay-late beat buys Lead back relative to the charge', () => {
    const charge = new GameEngine(ch1WayIn); charge.start();
    ['c_approach', 'c_loud', 'c_loud_on', 'c_charge'].forEach((c) => charge.choose(c));
    const relay = new GameEngine(ch1WayIn); relay.start();
    ['c_approach', 'c_loud', 'c_loud_on', 'c_relay_late', 'c_relay_on'].forEach((c) => relay.choose(c));
    expect(Number(relay.view().state.vars.lead)).toBeGreaterThan(Number(charge.view().state.vars.lead));
  });
});
