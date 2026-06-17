import type { Effect, WorldState, Primitive } from './types';
import { addMinutes } from './time';

function num(v: Primitive | undefined): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v == null) return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function coerce(v: string | undefined): Primitive {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v != null && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v ?? '';
}

function uniqPush(arr: string[], x: string): string[] {
  return arr.includes(x) ? arr : [...arr, x];
}

export function applyEffect(s: WorldState, e: Effect): WorldState {
  switch (e.op) {
    case 'set':
      return { ...s, vars: { ...s.vars, [e.field]: coerce(e.value) } };
    case 'increment':
      return { ...s, vars: { ...s.vars, [e.field]: num(s.vars[e.field]) + num(coerce(e.value ?? '1')) } };
    case 'decrement':
      return { ...s, vars: { ...s.vars, [e.field]: num(s.vars[e.field]) - num(coerce(e.value ?? '1')) } };
    case 'add_clue':
      return { ...s, clues: uniqPush(s.clues, e.value ?? e.field) };
    case 'remove_clue':
      return { ...s, clues: s.clues.filter((x) => x !== (e.value ?? e.field)) };
    case 'add_item':
      return { ...s, inventory: uniqPush(s.inventory, e.value ?? e.field) };
    case 'remove_item':
      return { ...s, inventory: s.inventory.filter((x) => x !== (e.value ?? e.field)) };
    case 'change_location':
      return { ...s, location: e.value ?? s.location };
    case 'add_minutes':
      return { ...s, time: addMinutes(s.time, num(coerce(e.value))) };
    case 'mark_event_completed':
      return { ...s, completedEvents: uniqPush(s.completedEvents, e.value ?? e.field) };
    case 'mark_visited':
      return { ...s, visited: uniqPush(s.visited, e.value ?? e.field) };
    default:
      return s;
  }
}

export function applyEffects(s: WorldState, es: Effect[] | undefined): WorldState {
  if (!es) return s;
  return es.reduce((acc, e) => applyEffect(acc, e), s);
}
