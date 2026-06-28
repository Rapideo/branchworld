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
  it('does NOT flag GAME_NO_CATCHALL when the only transition has an empty conditions array', () => {
    const g = clone(exampleGame);
    g.chapters[1].transitions = [{ when: { conditions: [] }, goTo: 'ch3' }]; // empty conditions = runtime catch-all
    expect(lintGame(g).errors.some((e) => e.code === 'GAME_NO_CATCHALL')).toBe(false);
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

describe('lintGame — profile inheritance + conformance', () => {
  const game = (gameProfile?: { clock: 'timed' | 'untimed' }, chapterProfile?: { clock: 'timed' | 'untimed' }): Game => ({
    id: 'g', title: 'G', startChapterId: 'c1', carry: { vars: 'all', resources: [], clues: true, inventory: true },
    ...(gameProfile ? { profile: gameProfile } : {}),
    chapters: [{ id: 'c1', title: 'C1', gameEnding: true, transitions: [],
      story: {
        id: 'c1', title: 'C1', startNodeId: 'a', startTime: '00:00', startLocation: 'L',
        ...(chapterProfile ? { profile: chapterProfile } : {}),
        variables: [], locations: [{ id: 'L', name: 'L' }], events: [],
        nodes: [{ id: 'a', title: 'A', body: '', choices: [], resolvesEnding: true }],
        endings: [{ id: 'd', name: 'D', summary: '', conditions: [], isDefault: true }],
      } }],
  });
  it('a chapter with no profile inherits the game profile (untimed lints clean, no deadline)', () => {
    expect(lintGame(game({ clock: 'untimed' })).errors).toEqual([]);
  });
  it('a chapter declaring a clock that conflicts with the game is flagged', () => {
    expect(lintGame(game({ clock: 'untimed' }, { clock: 'timed' })).errors.map((e) => e.code)).toContain('PROFILE_CHAPTER_CONFLICT');
  });
  it('flags mixed clocks with no Game.profile: an explicit-untimed chapter + an implicit-timed chapter', () => {
    const mk = (id: string, extra: object) => ({ id, title: id, startNodeId: 'n', startTime: '00:00', startLocation: 'L',
      variables: [], locations: [{ id: 'L', name: 'L' }], events: [],
      nodes: [{ id: 'n', title: 'N', body: '', choices: [], resolvesEnding: true }],
      endings: [{ id: 'd', name: 'D', summary: '', conditions: [], isDefault: true }], ...extra });
    const mixed: Game = { id: 'm', title: 'M', startChapterId: 'a',
      carry: { vars: 'all', resources: [], clues: true, inventory: true },
      chapters: [
        { id: 'a', title: 'A', transitions: [{ when: {}, goTo: 'b' }], story: mk('a', { profile: { clock: 'untimed' } }) as any },
        { id: 'b', title: 'B', gameEnding: true, transitions: [], story: mk('b', { deadline: '00:00' }) as any },
      ] };
    expect(lintGame(mixed).errors.map((e) => e.code)).toContain('PROFILE_CHAPTER_CONFLICT');
  });
});
