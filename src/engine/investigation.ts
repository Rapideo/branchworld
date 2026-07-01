import type { StoryNode, WorldState, Examinable, Effect } from './types';
import { evaluateConditions } from './conditions';

export const EXAMINE_PREFIX = '__examine_';

export function examineChoiceId(id: string): string {
  return `${EXAMINE_PREFIX}${id}`;
}

export function parseExamineTarget(choiceId: string): string | undefined {
  return choiceId.startsWith(EXAMINE_PREFIX) ? choiceId.slice(EXAMINE_PREFIX.length) : undefined;
}

/** Available hotspots at a node: clue not yet held AND conditions pass, in declared order. */
export function examinablesAt(node: StoryNode, state: WorldState): Examinable[] {
  return (node.examinables ?? []).filter(
    (ex) => !state.clues.includes(ex.clue) && evaluateConditions(ex.conditions, state),
  );
}

/** The effects taking a hotspot applies: add the clue, then (if any) pay the time. */
export function examineEffects(ex: Examinable): Effect[] {
  const effects: Effect[] = [{ field: 'clues', op: 'add_clue', value: ex.clue }];
  if (ex.minutes !== undefined) effects.push({ field: 'time', op: 'add_minutes', value: String(ex.minutes) });
  return effects;
}
