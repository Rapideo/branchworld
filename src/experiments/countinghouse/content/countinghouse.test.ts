import { describe, it, expect } from 'vitest';
import { lintGame } from '../../sump-line/lintGame';
import { GameRunner } from '../../sump-line/GameRunner';
import { valuesAtEndings } from '../../sump-line/seededWalk';
import { countinghouse } from './countinghouse';
import { ch2WayOut } from './ch2WayOut';

// ch1: case the place, quiet entry, blow the box, clean it out (loot 3), keep the boxman, run.
const fullTakeQuietKeep = ['c_case', 'c_case_on', 'c_quiet', 'c_quiet_on', 'c_blow', 'c_more1', 'c_more2', 'c_done', 'c_run'];

describe('The Countinghouse — the wired game', () => {
  it('lintGame is clean (incl. domains / mutex / carriedRequired / ancestor-producer)', () => {
    expect(lintGame(countinghouse).errors).toEqual([]);
  });

  it('The Lead, the take, and the partner all carry across the chapter boundary', () => {
    const g = new GameRunner(countinghouse);
    fullTakeQuietKeep.forEach((c) => g.choose(c));
    expect(g.view().chapterId).toBe('ch2_wayout');
    expect(Number(g.view().state.vars.loot)).toBeGreaterThanOrEqual(3);        // the counted take carried
    expect(Number(g.view().state.vars.lead)).toBeLessThan(40);                 // rebased BELOW its 40 start (carried depleted, not reset)
    expect(Number(g.view().state.vars.lead)).toBeGreaterThan(0);
    expect(g.view().state.vars.partner_status).toBe('frayed');                 // the boxman's carried state
  });

  it('the clean quiet route plays end to end to Clean Away', () => {
    const g = new GameRunner(countinghouse);
    fullTakeQuietKeep.forEach((c) => g.choose(c));
    ['c_to_stair', 'c_slip', 'c_cover', 'c_dash', 'c_drive_clean'].forEach((c) => g.choose(c));
    const v = g.view();
    expect(v.gameOver).toBe(true);
    expect(v.finalEndingId).toBe('end_clean');
  });

  it('leaving the boxman yields Out, Not Whole', () => {
    const g = new GameRunner(countinghouse);
    ['c_approach', 'c_quiet', 'c_quiet_on', 'c_blow', 'c_enough1', 'c_run'].forEach((c) => g.choose(c)); // loot 1, keep moving
    ['c_to_stair', 'c_slip', 'c_leave', 'c_leave_on', 'c_dash', 'c_drive_alone'].forEach((c) => g.choose(c));
    const v = g.view();
    expect(v.gameOver).toBe(true);
    expect(v.finalEndingId).toBe('end_not_whole');
  });

  it('value-at-endings: a healthy clean entry reaches Clean Away and Dawn', () => {
    const report = valuesAtEndings(ch2WayOut, { seed: { loot: 3, partner_status: 'frayed', made_clean: true, lead: 25 }, fields: ['lead', 'loot'] });
    const reached = new Set(report.filter((r) => r.reached).map((r) => r.endingId));
    expect(reached.has('end_clean')).toBe(true); // the clean route survives to the car
    expect(reached.has('end_dawn')).toBe(true);  // the dawdle crosses the window before the car
  });

  it('value-at-endings: a loud, low-Lead entry reaches The Outfit (Lead -> 0)', () => {
    const report = valuesAtEndings(ch2WayOut, { seed: { loot: 0, partner_status: 'gone', made_clean: false, alarm_tripped: true, lead: 12 }, fields: ['lead', 'loot'] });
    const reached = new Set(report.filter((r) => r.reached).map((r) => r.endingId));
    expect(reached.has('end_outfit')).toBe(true); // the carried-low Lead depletes to zero -> the outfit
  });
});
