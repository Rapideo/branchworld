import { describe, it, expect } from 'vitest';
import { lintStory } from '../engine';
import { praterLine } from './praterLine';

describe('praterLine — integrity', () => {
  it('lints clean with no errors or warnings', () => {
    const r = lintStory(praterLine);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
});
