import type { Story, Ending, WorldState, StoryNode } from './types';
import { evaluateConditions } from './conditions';

export function resolveEnding(s: WorldState, story: Story): Ending | undefined {
  const matched = story.endings.filter((e) => !e.isDefault && evaluateConditions(e.conditions, s));
  if (matched.length) {
    // highest priority wins; stable tie-break by original array order
    return matched.reduce((best, e) => ((e.priority ?? 0) > (best.priority ?? 0) ? e : best));
  }
  return story.endings.find((e) => e.isDefault);
}

// A3 — the engine's full-precedence resolver: node-named (F8) > priority[state-matched + atZero] (H3) >
// out-of-time (H4) > default.
export function resolveEndingAt(
  s: WorldState,
  story: Story,
  node: StoryNode | undefined,
  atZeroEndingId: string | undefined,
  pastDeadline: boolean,
): Ending | undefined {
  // 1. Node-named ending — the author pinned this node's outcome (F8). Wins outright.
  if (node?.endsWith) {
    const named = story.endings.find((e) => e.id === node.endsWith);
    if (named) return named;
  }
  // 2. Priority over state-matched endings + the atZero ending, competing together (H3: no short-circuit).
  const candidates = story.endings.filter(
    (e) => !e.isDefault && (e.id === atZeroEndingId || evaluateConditions(e.conditions, s)),
  );
  if (candidates.length) {
    return candidates.reduce((best, e) => ((e.priority ?? 0) > (best.priority ?? 0) ? e : best));
  }
  // 3. Out-of-time — the distinct "the clock chose" ending (H4), not the catch-all default.
  if (pastDeadline && story.outOfTimeEndingId) {
    const oot = story.endings.find((e) => e.id === story.outOfTimeEndingId);
    if (oot) return oot;
  }
  // 4. Default catch-all.
  return story.endings.find((e) => e.isDefault);
}
