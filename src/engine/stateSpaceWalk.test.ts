import { describe, it, expect } from 'vitest';
import { walkStateSpace } from './stateSpaceWalk';
import { praterLine } from '../content/praterLine';
import { sampleStory } from '../content/sampleStory';

describe.each([['praterLine', praterLine], ['sampleStory', sampleStory]])('state-space: %s', (_n, story) => {
  const r = walkStateSpace(story);
  it('completes exhaustively (cap not hit)', () => expect(r.capHit).toBe(false));
  it('EE-3: no reachable state resolves to zero endings', () => expect(r.zeroEnding).toEqual([]));
  it('no soft-locks', () => expect(r.softlocks).toEqual([]));
  it('no orphan endings', () => expect(r.orphanEndings).toEqual([]));
  it('EE-2: every event has a reachable recovery', () => expect(r.eventRecovery.filter((e) => !e.ok)).toEqual([]));
});
