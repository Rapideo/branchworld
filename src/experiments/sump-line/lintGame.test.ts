import { describe, it, expect } from 'vitest';
import { lintGame } from './lintGame';
import { exampleGame } from './exampleGame';
import type { Game } from './types';

function clone(g: Game): Game { return JSON.parse(JSON.stringify(g)) as Game; }

describe('lintGame', () => {
  it('passes the well-formed example game', () => {
    const r = lintGame(exampleGame);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });
  it('flags a transition pointing at a missing chapter', () => {
    const g = clone(exampleGame);
    g.chapters[0].transitions[0].goTo = 'ghost';
    expect(lintGame(g).errors.some((e) => e.code === 'GAME_BROKEN_TRANSITION')).toBe(true);
  });
  it('flags a non-game-ending chapter with no catch-all transition', () => {
    const g = clone(exampleGame);
    g.chapters[1].transitions = [{ when: { endingId: 'never' }, goTo: 'ch3' }]; // ch2a no catch-all
    expect(lintGame(g).errors.some((e) => e.code === 'GAME_NO_CATCHALL')).toBe(true);
  });
  it('flags a missing start chapter', () => {
    const g = clone(exampleGame);
    g.startChapterId = 'nope';
    expect(lintGame(g).errors.some((e) => e.code === 'GAME_NO_START')).toBe(true);
  });
  it('missing start chapter does not cascade into GAME_NO_REACHABLE_ENDING or GAME_ORPHAN_CHAPTER', () => {
    const g = clone(exampleGame);
    g.startChapterId = 'nope';
    const r = lintGame(g);
    expect(r.errors.some((e) => e.code === 'GAME_NO_START')).toBe(true);
    expect(r.errors.some((e) => e.code === 'GAME_NO_REACHABLE_ENDING')).toBe(false);
    expect(r.warnings.some((w) => w.code === 'GAME_ORPHAN_CHAPTER')).toBe(false);
  });
  it('flags when no game-ending chapter is reachable', () => {
    const g = clone(exampleGame);
    g.chapters[3].gameEnding = false;
    g.chapters[3].transitions = [{ when: {}, goTo: 'ch1' }]; // ch3 now loops back, never ends
    expect(lintGame(g).errors.some((e) => e.code === 'GAME_NO_REACHABLE_ENDING')).toBe(true);
  });
  it('warns on an orphan chapter', () => {
    const g = clone(exampleGame);
    g.chapters.push({ id: 'orphan', title: 'O', story: g.chapters[0].story, gameEnding: true, transitions: [] });
    expect(lintGame(g).warnings.some((w) => w.code === 'GAME_ORPHAN_CHAPTER')).toBe(true);
  });
  it('surfaces a per-chapter lintStory error', () => {
    const g = clone(exampleGame);
    g.chapters[0].story.nodes[0].choices[0].destination = 'nowhere'; // broken link inside a chapter
    expect(lintGame(g).errors.some((e) => e.code === 'GAME_CHAPTER_LINT')).toBe(true);
  });
});
