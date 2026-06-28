import { describe, it, expect } from 'vitest';
import { lintStory, GameEngine } from '../../../engine';
import { walkStateSpace } from '../../../engine/stateSpaceWalk';
import { ch2WayOut } from './ch2WayOut';

describe('ch2_wayout — The Way Out', () => {
  it('lints clean (incl. atZero-dominance, out-of-time, endsWith rules)', () => {
    expect(lintStory(ch2WayOut).errors).toEqual([]);
  });
  it('is walkable, no softlocks; only the carry-only / structural endings may be orphans', () => {
    const r = walkStateSpace(ch2WayOut, { cap: 80000 });
    expect(r.capHit).toBe(false);
    expect(r.softlocks).toEqual([]);
    const allowed = new Set(['end_outfit', 'end_clean', 'end_still_inside']); // carry-only + structural default
    expect(r.orphanEndings.filter((e) => !allowed.has(e))).toEqual([]);
  });
  it('the three drive choices partition (partner gone?, loot>=3?) — exactly one available in each cell', () => {
    const cell = (partner: string, loot: number) => {
      const s: typeof ch2WayOut = JSON.parse(JSON.stringify(ch2WayOut));
      s.variables.find((v) => v.name === 'partner_status')!.default = partner;
      s.variables.find((v) => v.name === 'loot')!.default = loot;
      s.variables.find((v) => v.name === 'got_clear')!.default = true; // stand at the car
      s.startNodeId = 'n_car';
      const g = new GameEngine(s);
      return g.view().choices.filter((c) => c.available).map((c) => c.id).sort();
    };
    expect(cell('frayed', 3)).toEqual(['c_drive_clean']);
    expect(cell('frayed', 1)).toEqual(['c_drive_light']);
    expect(cell('gone', 3)).toEqual(['c_drive_alone']);
    expect(cell('gone', 0)).toEqual(['c_drive_alone']);
  });
  it('Dawn (out-of-time) fires for a pre-drive deadline-cross, with got_clear still false', () => {
    const g = new GameEngine(ch2WayOut);
    g.start();
    g.choose('c_to_stair'); g.choose('c_slip'); g.choose('c_leave'); g.choose('c_leave_on');
    let v = g.view();
    for (let i = 0; i < 30 && !v.endingReached; i++) v = g.choose('c_wait');
    expect(v.endingReached?.id).toBe('end_dawn');
    expect(v.state.vars.got_clear).not.toBe(true); // never drove -> no false getaway claim
  });
  it('a carried-low Lead resolves The Outfit on entry (atZero death dominates)', () => {
    const dying: typeof ch2WayOut = JSON.parse(JSON.stringify(ch2WayOut));
    dying.resources!.find((r) => r.id === 'lead')!.start = 0;
    const g = new GameEngine(dying);
    expect(g.view().endingReached?.id).toBe('end_outfit');
  });
});
