import { describe, it, expect } from 'vitest';
import { lintStory } from '../../engine';
import { exampleGame } from './exampleGame';

describe('exampleGame', () => {
  it('has 3 chapters, a start chapter, and one game-ending chapter', () => {
    expect(exampleGame.chapters.length).toBe(3);
    expect(exampleGame.chapters.some((c) => c.id === exampleGame.startChapterId)).toBe(true);
    expect(exampleGame.chapters.filter((c) => c.gameEnding).length).toBe(1);
  });
  it('every chapter story lints clean', () => {
    for (const ch of exampleGame.chapters) {
      const r = lintStory(ch.story);
      const errors = r.errors;
      expect(errors, `chapter ${ch.id}: ${JSON.stringify(errors)}`).toEqual([]);
    }
  });
});
