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
  // 1. Node-named ending — the author pinned this node's outcome (F8). Wins outright over state, but NOT
  //    over a resource death: a death (atZero) is a hard physical fact, so it beats the pin (F3 decision).
  if (node?.endsWith && !atZeroEndingId) {
    const named = story.endings.find((e) => e.id === node.endsWith);
    if (named) return named;
  }
  // 2. Priority over state-matched endings + the atZero death, competing together (H3: no short-circuit;
  //    F2 enforces the death out-ranks any co-occurring ending). The out-of-time ending is NOT a state
  //    candidate here — it fires only via the deadline path below, so it may be condition-free.
  const candidates = story.endings.filter(
    (e) =>
      !e.isDefault &&
      // a resource death (atZero) is ALWAYS a candidate — even if it doubles as the out-of-time ending; the
      // out-of-time ending is excluded from the state-match path only (it otherwise fires via the deadline path).
      (e.id === atZeroEndingId || (e.id !== story.outOfTimeEndingId && evaluateConditions(e.conditions, s))),
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
