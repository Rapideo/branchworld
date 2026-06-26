import type { Effect, WorldState, Primitive } from './types';
import { addMinutes } from './time';
import type { BoundsMap } from './bounds';
import { clampValue } from './bounds';

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

export function applyEffect(s: WorldState, e: Effect, bounds?: BoundsMap): WorldState {
  switch (e.op) {
    case 'set': {
      const v = coerce(e.value);
      const out = typeof v === 'number' ? clampValue(v, bounds?.[e.field]) : v;
      return { ...s, vars: { ...s.vars, [e.field]: out } };
    }
    case 'increment': {
      const v = num(s.vars[e.field]) + num(coerce(e.value ?? '1'));
      return { ...s, vars: { ...s.vars, [e.field]: clampValue(v, bounds?.[e.field]) } };
    }
    case 'decrement': {
      const v = num(s.vars[e.field]) - num(coerce(e.value ?? '1'));
      return { ...s, vars: { ...s.vars, [e.field]: clampValue(v, bounds?.[e.field]) } };
    }
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
    case 'add_minutes': {
      // time is monotonic — a negative delta may not rewind the clock (H2)
      const next = addMinutes(s.time, num(coerce(e.value)));
      return { ...s, time: Math.max(s.time, next) };
    }
    case 'mark_event_completed':
      return { ...s, completedEvents: uniqPush(s.completedEvents, e.value ?? e.field) };
    case 'mark_visited':
      return { ...s, visited: uniqPush(s.visited, e.value ?? e.field) };
    default:
      return s;
  }
}

export function applyEffects(s: WorldState, es: Effect[] | undefined, bounds?: BoundsMap): WorldState {
  if (!es) return s;
  return es.reduce((acc, e) => applyEffect(acc, e, bounds), s);
}
