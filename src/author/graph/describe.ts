import type { Condition, Effect } from '../../engine';

export function describeCondition(c: Condition): string {
  return c.value != null ? `${c.field} ${c.op} ${c.value}` : `${c.field} ${c.op}`;
}
export function describeConditions(cs: Condition[] | undefined): string {
  return cs && cs.length ? cs.map(describeCondition).join(' & ') : '';
}
export function describeEffect(e: Effect): string {
  return e.value != null ? `${e.field} ${e.op} ${e.value}` : `${e.field} ${e.op}`;
}
export function describeEffects(es: Effect[] | undefined): string {
  return es && es.length ? es.map(describeEffect).join(', ') : '';
}
