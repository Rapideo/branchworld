import type { Condition, WorldState, Primitive } from './types';
import { readVar } from './state';
import { parseTime } from './time';

function num(v: Primitive | undefined): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v == null) return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

export function coerce(v: string | undefined): Primitive {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v != null && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v ?? '';
}

export function evaluateCondition(c: Condition, s: WorldState): boolean {
  const cur = readVar(s, c.field);
  switch (c.op) {
    case 'equals': return String(cur) === String(coerce(c.value));
    case 'not_equals': return String(cur) !== String(coerce(c.value));
    case 'gt': return num(cur) > num(coerce(c.value));
    case 'gte': return num(cur) >= num(coerce(c.value));
    case 'lt': return num(cur) < num(coerce(c.value));
    case 'lte': return num(cur) <= num(coerce(c.value));
    case 'is_true': return cur === true || cur === 'true' || num(cur) > 0;
    case 'is_false': return !(cur === true || cur === 'true' || num(cur) > 0);
    case 'has_item': return num(cur) >= (c.value != null ? num(coerce(c.value)) : 1);
    case 'has_clue': return s.clues.includes(c.value ?? c.field);
    case 'has_visited': return s.visited.includes(c.value ?? c.field);
    case 'time_before': return s.time < parseTime(c.value ?? '00:00');
    case 'time_after': return s.time >= parseTime(c.value ?? '00:00');
    case 'time_between': {
      const range = (c.value ?? '00:00-23:59').split('-');
      const a = parseTime(range[0] ?? '00:00');
      const b = parseTime(range[1] ?? '23:59');
      return s.time >= a && s.time <= b;
    }
    default: return true;
  }
}

export function evaluateConditions(cs: Condition[] | undefined, s: WorldState): boolean {
  if (!cs || cs.length === 0) return true;
  return cs.every((c) => evaluateCondition(c, s));
}

export function explainFailing(cs: Condition[] | undefined, s: WorldState): string {
  if (!cs) return '';
  return cs
    .filter((c) => !evaluateCondition(c, s))
    .map((c) => `${c.field} ${c.op}${c.value != null ? ' ' + c.value : ''}`)
    .join('; ');
}
