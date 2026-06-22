import type { Story } from './types';

export interface Bound {
  min?: number;
  max?: number;
}

export type BoundsMap = Record<string, Bound>;

export function clampValue(n: number, b?: Bound): number {
  if (!b) return n;
  let v = n;
  if (b.min !== undefined) v = Math.max(b.min, v);
  if (b.max !== undefined) v = Math.min(b.max, v);
  return v;
}

export function buildBounds(story: Story): BoundsMap {
  const m: BoundsMap = {};
  for (const v of story.variables) {
    if (v.min !== undefined || v.max !== undefined) m[v.name] = { min: v.min, max: v.max };
  }
  for (const r of story.resources ?? []) {
    m[r.id] = { min: r.min, max: r.max };
  }
  return m;
}
