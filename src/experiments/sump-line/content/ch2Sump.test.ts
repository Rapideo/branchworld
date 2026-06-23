import { describe, it, expect } from 'vitest';
import { lintStory, GameEngine } from '../../../engine';
import { walkStateSpace } from '../../../engine/stateSpaceWalk';
import { ch2Sump } from './ch2Sump';

describe('ch2_sump — "The Flooded Sump Crawl"', () => {
  it('lints clean (no errors)', () => {
    expect(lintStory(ch2Sump).errors).toEqual([]);
  });

  it('is walkable: clock can bite, no cap, no softlocks', () => {
    const r = walkStateSpace(ch2Sump);
    expect(r.capHit).toBe(false);
    expect(r.softlocks).toEqual([]);
  });

  it('only the carry-only dark ending is an orphan in a standalone walk (F4)', () => {
    const r = walkStateSpace(ch2Sump);
    expect([...r.orphanEndings].sort()).toEqual(['end_dark_sump']);
  });

  it('go straight to the crawl, catch the window, dive -> out the far rift (grey)', () => {
    const g = new GameEngine(ch2Sump);
    g.choose('c_to_crawl');        // +15 -> crawl at 14:45 (after 14:40) => PRESENT routes to n_drop_present
    expect(g.view().node.id).toBe('n_drop_present');
    const v = g.choose('c_drop_dive'); // -> n_dive: cave_crossed
    expect(v.endingReached?.id).toBe('end_grey_sump');
    expect(v.state.vars.cave_crossed).toBe(true);
  });

  it('warm in the gravel first -> miss the window (sealed); the dive is gated off; you end behind the sump', () => {
    const g = new GameEngine(ch2Sump);
    g.choose('c_to_gravel');       // +10 -> gravel at 14:40 => ABSENT: cave_sump_sealed true
    expect(g.view().state.vars.cave_sump_sealed).toBe(true);
    // EE-4 dive gate: once sealed, you cannot go back down to try the crawl
    const tryCrawl = g.view().choices.find((c) => c.id === 'c_g_try');
    expect(tryCrawl?.available).toBe(false);
    const v = g.choose('c_g_wait'); // -> n_resolve_s, sealed
    expect(v.endingReached?.id).toBe('end_behind_sump');
  });

  it('witness the window but lose your nerve and wait -> the long cold wait (default)', () => {
    const g = new GameEngine(ch2Sump);
    g.choose('c_to_crawl');        // present
    g.choose('c_drop_back');       // pull back to gravel; window passes unsealed (present fired, not absent)
    const v = g.choose('c_g_wait');
    expect(v.endingReached?.id).toBe('end_long_cold_wait');
    expect(v.state.vars.cave_sump_sealed).toBe(false);
    expect(v.state.vars.cave_crossed).toBe(false);
  });
});
