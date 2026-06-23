import { evaluateConditions } from '../../engine';
import type { WorldState } from '../../engine';
import type { Chapter } from './types';

export function pickNextChapter(chapter: Chapter, finalState: WorldState, endingId: string): string | undefined {
  for (const t of chapter.transitions) {
    if (t.when.endingId !== undefined && t.when.endingId !== endingId) continue;
    if (t.when.conditions && !evaluateConditions(t.when.conditions, finalState)) continue;
    return t.goTo;
  }
  return undefined;
}
