import { describe, it, expect } from 'vitest';
import { lintGame, GameRunner } from './index';
import { lintStory } from '../engine';
import { verifyRoam } from '../engine/stateSpaceWalk';            // submodule — not on the ../engine barrel
import { checkBucketAlignment, roamTimeThresholds } from '../engine/travelLint';
import { roamExample, roamExampleTimed, roamStranded } from './roamExample';

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

describe('roam reference game', () => {
  it('the untimed reference game lints clean (game + story)', () => {
    expect(lintGame(roamExample).errors).toEqual([]);
    expect(lintStory(roamExample.chapters[0].story).errors).toEqual([]);
  });

  it('the timed reference game lints clean', () => {
    expect(lintStory(roamExampleTimed.chapters[0].story).errors).toEqual([]);
  });

  it('the untimed roam walk terminates, verifies, and has no dead regions', () => {
    const { ok, report } = verifyRoam(roamExample.chapters[0].story);
    expect(report.capHit).toBe(false);
    expect(report.deadRegions).toEqual([]);     // reconvergent clean map
    expect(report.orphanEndings).toEqual([]);   // every ending reachable
    expect(ok).toBe(true);
  });

  it('a GameRunner roams across locations and reaches the coupled good ending', () => {
    const g = new GameRunner(roamExample);
    // From atrium_hub: travel to the library, find the key, then travel to the vault.
    // The key_found latch (set in library_gem) gates the vault_opened ending at vault_finish.
    g.choose('__travel_library');   // atrium_hub → library_hub (travel, 10 min)
    g.choose('search_library');     // library_hub → library_gem  (entryEffect: key_found = true)
    g.choose('leave_gem');          // library_gem → library_hub
    g.choose('__travel_vault');     // library_hub → vault_hub   (travel, 10 min)
    g.choose('try_vault');          // vault_hub   → vault_finish (resolvesEnding)
    expect(g.view().finalEndingId).toBe('vault_opened');
  });

  it('the stranded variant is flagged by co-reachability', () => {
    const { ok, report } = verifyRoam(roamStranded);
    expect(report.deadRegions.length).toBeGreaterThan(0);
    expect(ok).toBe(false);
  });

  it('the timed reference game: an aligned bucket verifies, a misaligned one bites', () => {
    const story = roamExampleTimed.chapters[0].story;
    const bucket = roamTimeThresholds(story).reduce(gcd);
    expect(checkBucketAlignment(story, bucket)).toEqual([]);
    expect(verifyRoam(story, { timeBucket: bucket }).ok).toBe(true);
    // a misaligned bucket (not dividing a threshold) makes the gate fail
    expect(verifyRoam(story, { timeBucket: bucket + 1 }).ok).toBe(false);
  });
});
