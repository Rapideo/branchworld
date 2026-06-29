import { describe, it, expect } from 'vitest';
import type { Game } from './types';
import { lintGame } from './lintGame';

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
  it('ROAM_CHAPTER_PROFILE_MISSING when only the game declares travel:free', () => {
    const story = roamChapterStory('s1');
    story.profile = { clock: 'untimed' } as never; // chapter does NOT declare travel
    const g: Game = {
      id: 'g', title: 'G', startChapterId: 'c1', profile: { clock: 'untimed', travel: 'free' },
      carry: { vars: 'all', resources: [], clues: false, inventory: false },
      chapters: [{ id: 'c1', title: 'C1', story, gameEnding: true, transitions: [] }],
    };
    expect(lintGame(g).errors.map((e) => e.code)).toContain('ROAM_CHAPTER_PROFILE_MISSING');
  });
});
