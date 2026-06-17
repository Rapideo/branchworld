import type { Story, WorldState } from './types';
import { evaluateConditions } from './conditions';
import { applyEffects } from './effects';

export interface EventCheckResult {
  state: WorldState;
  routedNodeId?: string;
  log: string[];
}

export function checkScheduledEvents(s: WorldState, story: Story): EventCheckResult {
  let state = s;
  let routedNodeId: string | undefined;
  const log: string[] = [];

  for (const ev of story.events) {
    if (state.completedEvents.includes(ev.id)) continue;
    if (!evaluateConditions(ev.trigger, state)) continue;

    if (state.location === ev.eventLocation) {
      state = { ...state, completedEvents: [...state.completedEvents, ev.id] };
      if (!routedNodeId) routedNodeId = ev.ifPresentNode;
      log.push(`Event ${ev.id} fired (present) -> ${ev.ifPresentNode}`);
    } else {
      state = applyEffects(state, ev.ifAbsentEffects);
      state = { ...state, completedEvents: [...state.completedEvents, ev.id] };
      log.push(`Event ${ev.id} fired (absent); clue recoverable at ${ev.recoveryNodeId}`);
    }
  }

  return { state, routedNodeId, log };
}
