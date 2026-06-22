import type { Story, WorldState } from './types';
import { clampValue } from './bounds';

export interface ResourceStepResult {
  state: WorldState;
  atZeroEndingId?: string;
  log: string[];
}

// Recompute time-driven resources from the clock, clamp choice-driven ones, and fire at-zero.
// Time-driven values are a pure function of `time`, so they add NO new walker dimension.
export function applyResourceStep(s: WorldState, story: Story, startTime: number): ResourceStepResult {
  const resources = story.resources ?? [];
  if (resources.length === 0) return { state: s, log: [] };

  const vars = { ...s.vars };
  let changed = false;
  let atZeroEndingId: string | undefined;
  const log: string[] = [];

  for (const r of resources) {
    const bound = { min: r.min, max: r.max };
    let value: number;
    if (r.depletion) {
      const steps = Math.floor((s.time - startTime) / r.depletion.everyMinutes);
      value = clampValue(r.start - r.depletion.amount * steps, bound);
    } else {
      value = clampValue(Number(vars[r.id] ?? r.start), bound);
    }
    if (vars[r.id] !== value) {
      vars[r.id] = value;
      changed = true;
    }
    if (value <= r.min && r.atZero) {
      if (r.atZero.setFlag && vars[r.atZero.setFlag] !== true) {
        vars[r.atZero.setFlag] = true;
        changed = true;
        log.push(`Resource ${r.id} hit ${r.min}: set ${r.atZero.setFlag}`);
      }
      if (r.atZero.ending && !atZeroEndingId) {
        atZeroEndingId = r.atZero.ending;
        log.push(`Resource ${r.id} hit ${r.min}: ending ${r.atZero.ending}`);
      }
    }
  }

  return { state: changed ? { ...s, vars } : s, atZeroEndingId, log };
}
