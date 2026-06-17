import type { Story, Ending, WorldState } from './types';
import { evaluateConditions } from './conditions';

export function resolveEnding(s: WorldState, story: Story): Ending | undefined {
  for (const e of story.endings) {
    if (e.isDefault) continue;
    if (evaluateConditions(e.conditions, s)) return e;
  }
  return story.endings.find((e) => e.isDefault);
}
