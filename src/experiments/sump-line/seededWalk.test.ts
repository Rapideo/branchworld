import { describe, it, expect } from 'vitest';
import { walkStateSpace } from '../../engine/stateSpaceWalk';
import { ch2High } from './content/ch2High';
import { ch2Sump } from './content/ch2Sump';
import { seedStory, walkSeeded, valuesAtEndings } from './seededWalk';

describe('A4/E2 — seeded walker + value-at-endings report', () => {
  it('seedStory rewrites variable defaults and resource starts (non-destructively)', () => {
    const s = seedStory(ch2High, { cave_all_together: true, lamp_charge: 42 });
    expect(s.variables.find((v) => v.name === 'cave_all_together')!.default).toBe(true);
    expect(s.resources!.find((r) => r.id === 'lamp_charge')!.start).toBe(42);
    // original is untouched
    expect(ch2High.variables.find((v) => v.name === 'cave_all_together')!.default).toBe(false);
  });

  it('F4: a seeded walk reaches the carry-only endings the standalone walk orphans', () => {
    // standalone: the two carry-only endings are orphans (the known F4 gap, asserted in ch2High.test too)
    expect([...walkStateSpace(ch2High).orphanEndings].sort()).toEqual(['end_dark_high', 'end_daylight_all_three']);

    // seed carried togetherness + a healthy lamp/heat -> "Daylight, All Three" is now reachable
    const day = walkSeeded(ch2High, { cave_all_together: true, lamp_charge: 70, body_heat: 95 }, { cap: 120000 });
    expect(day.orphanEndings).not.toContain('end_daylight_all_three');

    // seed a nearly-dead lamp -> the dark ending is now reachable
    const dark = walkSeeded(ch2High, { lamp_charge: 6 }, { cap: 120000 });
    expect(dark.orphanEndings).not.toContain('end_dark_high');
  });

  it('F7: value-at-endings reports the resource range at each reachable ending', () => {
    const report = valuesAtEndings(ch2Sump);
    const byId = Object.fromEntries(report.map((r) => [r.endingId, r]));

    // the grey crossing is reachable standalone; its lamp range is reported (tracked fields default to resources)
    expect(byId.end_grey_sump.reached).toBe(true);
    expect(byId.end_grey_sump.ranges.lamp_charge).toBeDefined();
    expect(byId.end_grey_sump.ranges.lamp_charge.min).toBeGreaterThanOrEqual(0);

    // the dark ending is a carry-only orphan standalone -> not reached, no ranges
    expect(byId.end_dark_sump.reached).toBe(false);
  });

  it('F7: a seeded low lamp surfaces the dark ending firing at the lamp floor', () => {
    const report = valuesAtEndings(ch2Sump, { seed: { lamp_charge: 6 } });
    const dark = report.find((r) => r.endingId === 'end_dark_sump')!;
    expect(dark.reached).toBe(true);
    expect(dark.ranges.lamp_charge.min).toBe(0); // it fired precisely because the lamp hit its floor
  });
});
