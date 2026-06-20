import type { Story, Ending, WorldState } from './types';
import { evaluateConditions } from './conditions';

export function resolveEnding(s: WorldState, story: Story): Ending | undefined {
  const matched = story.endings.filter((e) => !e.isDefault && evaluateConditions(e.conditions, s));
  if (matched.length) {
    // highest priority wins; stable tie-break by original array order
    return matched.reduce((best, e) => ((e.priority ?? 0) > (best.priority ?? 0) ? e : best));
  }
  return story.endings.find((e) => e.isDefault);
}
