import { describe, it, expect } from 'vitest';
import { lintStory, GameEngine } from '../../../engine';
import { walkStateSpace } from '../../../engine/stateSpaceWalk';
import { ch2Sump } from './ch2Sump';

describe('ch2_sump — "The Flooded Sump Crawl" (expanded)', () => {
  it('lints clean (no errors)', () => {
    expect(lintStory(ch2Sump).errors).toEqual([]);
  });

  it('stays exhaustively walkable: no cap, no softlocks', () => {
    const r = walkStateSpace(ch2Sump);
    expect(r.capHit).toBe(false);
    expect(r.softlocks).toEqual([]);
  });

  it('only the carry-only dark ending is a standalone orphan (F4)', () => {
    const r = walkStateSpace(ch2Sump);
    expect([...r.orphanEndings].sort()).toEqual(['end_dark_sump']);
  });

  it('push to the crawl, catch the window, dive through -> grey', () => {
    const g = new GameEngine(ch2Sump);
    ['c_to_crawl', 'c_duck_on', 'c_deep_on'].forEach((c) => g.choose(c));
    expect(g.view().node.id).toBe('n_drop_present'); // arrived at the crawl as the window opened
    ['c_drop_dive', 'c_dive_on'].forEach((c) => g.choose(c));
    const v = g.choose('c_far_on');
    expect(v.endingReached?.id).toBe('end_grey_sump');
    expect(v.state.vars.cave_crossed).toBe(true);
  });

  it('warm in the gravel first -> miss the window (sealed); the dive is gated off; behind the sump', () => {
    const g = new GameEngine(ch2Sump);
    g.choose('c_to_gravel'); // reach the gravel before the window
    g.choose('c_ss_look'); // read the water...
    g.choose('c_look_on'); // ...back to the chamber past 14:48 — the window passed unseen (absent => sealed)
    expect(g.view().state.vars.cave_sump_sealed).toBe(true);
    const tryCrawl = g.view().choices.find((c) => c.id === 'c_g_try');
    expect(tryCrawl?.available).toBe(false); // dive gated once sealed
    const v = g.choose('c_g_wait');
    expect(v.endingReached?.id).toBe('end_behind_sump');
  });

  it('witness the window but pull back and wait -> the long cold wait (default)', () => {
    const g = new GameEngine(ch2Sump);
    ['c_to_crawl', 'c_duck_on', 'c_deep_on'].forEach((c) => g.choose(c)); // present (window)
    g.choose('c_drop_back'); // pull back unsealed (present fired, not absent)
    const v = g.choose('c_g_wait');
    expect(v.endingReached?.id).toBe('end_long_cold_wait');
    expect(v.state.vars.cave_sump_sealed).toBe(false);
    expect(v.state.vars.cave_crossed).toBe(false);
  });
});
