import type { Story, WorldState, Primitive } from './types';
import { parseTime } from './time';

export function initState(story: Story): WorldState {
  const vars: Record<string, Primitive> = {};
  for (const v of story.variables) vars[v.name] = v.default;
  return {
    time: parseTime(story.startTime),
    location: story.startLocation,
    clues: [],
    inventory: [],
    visited: [],
    completedEvents: [],
    vars,
  };
}

export function readVar(s: WorldState, field: string): Primitive | undefined {
  if (field === 'time') return s.time;
  if (field === 'location') return s.location;
  return s.vars[field];
}
