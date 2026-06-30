import { describe, it, expect } from 'vitest';
import type { Game } from './types';
import type { Story } from '../engine';
import { lintGame } from './lintGame';
import { GameRunner } from './GameRunner';

// A single-chapter game where travel:'free' lives ONLY on game.profile; the chapter's story.profile
// omits travel. Two connected locations ensure a __travel_<dest> choice is injected at runtime.
function makeSingleChapterRoamGameWithProfileOnlyOnGame(): Game {
  const story: Story = {
    id: 'rs_bare', title: 'RS', startNodeId: 'hub_a', startTime: '00:00', startLocation: 'locA',
    profile: { clock: 'untimed' }, // no travel:'free' — game.profile provides it via seedChapterStory stamp
    variables: [], events: [],
    locations: [
      { id: 'locA', name: 'A', defaultNode: 'hub_a', connectedLocations: ['locB'], travelTimes: { locB: 5 } },
      { id: 'locB', name: 'B', defaultNode: 'hub_b', connectedLocations: ['locA'], travelTimes: { locA: 5 } },
    ],
    nodes: [
      { id: 'hub_a', title: 'Hub A', body: '', choices: [{ id: 'to_fin', label: 'Finish', destination: 'fin_node' }] },
      { id: 'hub_b', title: 'Hub B', body: '', choices: [{ id: 'back_a', label: 'Back', destination: 'hub_a' }] },
      { id: 'fin_node', title: 'The End', body: '', resolvesEnding: true, choices: [] },
    ],
    endings: [{ id: 'done', name: 'Done', conditions: [], isDefault: true, summary: '' }],
  };
  return {
    id: 'g_bare', title: 'G', startChapterId: 'ch1',
    profile: { clock: 'untimed', travel: 'free' },
    carry: { vars: 'all', resources: [], clues: false, inventory: false },
    chapters: [{ id: 'ch1', title: 'Ch1', story, gameEnding: true, transitions: [] }],
  };
}

function roamChapterStory(id: string) {
  return {
    id, title: id, startNodeId: 'h', startTime: '00:00', startLocation: 'a',
    profile: { clock: 'untimed', travel: 'free' } as const,
    variables: [], events: [], resources: [],
    locations: [{ id: 'a', name: 'A', connectedLocations: [], travelTimes: {}, defaultNode: 'h' }],
    nodes: [{ id: 'h', title: 'H', body: '', choices: [{ id: 'fin', label: 'F', destination: 'e' }] },
            { id: 'e', title: 'E', body: '', choices: [], resolvesEnding: true }],
    endings: [{ id: 'fin', name: 'F', conditions: [], isDefault: true, summary: '' }],
  };
}

describe('container roam fence', () => {
  it('a single-chapter roam game lints clean', () => {
    const g: Game = {
      id: 'g', title: 'G', startChapterId: 'c1',
      carry: { vars: 'all', resources: [], clues: false, inventory: false },
      chapters: [{ id: 'c1', title: 'C1', story: roamChapterStory('s1'), gameEnding: true, transitions: [] }],
    };
    expect(lintGame(g).errors.map((e) => e.code)).not.toContain('ROAM_CARRY_UNVERIFIABLE');
    expect(lintGame(g).ok).toBe(true);
  });
  it('ROAM_CARRY_UNVERIFIABLE forbids a roam chapter in a multi-chapter game', () => {
    const g: Game = {
      id: 'g', title: 'G', startChapterId: 'c1',
      carry: { vars: 'all', resources: [], clues: false, inventory: false },
      chapters: [
        { id: 'c1', title: 'C1', story: roamChapterStory('s1'), transitions: [{ when: {}, goTo: 'c2' }] },
        { id: 'c2', title: 'C2', story: roamChapterStory('s2'), gameEnding: true, transitions: [] },
      ],
    };
    expect(lintGame(g).errors.map((e) => e.code)).toContain('ROAM_CARRY_UNVERIFIABLE');
  });
  it('a game-profile-only roam chapter now lints clean and roams at runtime (root profile stamp)', () => {
    const game = makeSingleChapterRoamGameWithProfileOnlyOnGame();
    const r = lintGame(game);
    expect(r.errors.find((e) => e.code === 'ROAM_CHAPTER_PROFILE_MISSING')).toBeUndefined();
    const runner = new GameRunner(game);
    expect(runner.view().choices.some((c) => c.id.startsWith('__travel_'))).toBe(true);
  });
});
