import { parseTime } from '../engine';
import type { Story, Effect, WorldState, Primitive } from '../engine';
import type { CarryContract, CarriedState } from './types';

export function minutesToClock(min: number): string {
  const m = Math.max(0, Math.round(min));
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${hh}:${mm < 10 ? '0' : ''}${mm}`;
}

export function extractCarry(state: WorldState, contract: CarryContract): CarriedState {
  const vars: Record<string, Primitive> = {};
  if (contract.vars === 'all') Object.assign(vars, state.vars);
  else for (const k of contract.vars) if (k in state.vars) vars[k] = state.vars[k];
  for (const id of contract.resources) if (id in state.vars) vars[id] = state.vars[id];
  return {
    vars,
    clues: contract.clues === false ? [] : [...state.clues],
    inventory: contract.inventory === false ? [] : [...state.inventory],
  };
}

// Seed the next chapter by REWRITING a clone of its Story (never the original):
//  - variable defaults <- carried values   (engine initState reads these)
//  - resource starts    <- carried values   (so a time-driven survival meter continues, not resets)
//  - carried clues/items -> prepended start-node entryEffects (engine has no initial-clue field)
//  - deadline           <- min(chapter deadline, projected game horizon)
// FINDING (ENGINE-ASSESSMENT): the engine has no public "construct with carried state" seam; this
// Story-rewrite is a clean public-API workaround, but native carried-state seeding would be simpler.
export function seedChapterStory(
  story: Story,
  carry: CarriedState,
  gameElapsedMinutes: number,
  gameDeadlineMinutes?: number,
): Story {
  const s: Story = JSON.parse(JSON.stringify(story)) as Story;

  for (const v of s.variables) {
    if (Object.prototype.hasOwnProperty.call(carry.vars, v.name)) v.default = carry.vars[v.name];
  }
  for (const r of s.resources ?? []) {
    if (Object.prototype.hasOwnProperty.call(carry.vars, r.id)) r.start = Number(carry.vars[r.id]);
  }

  const start = s.nodes.find((n) => n.id === s.startNodeId);
  if (start) {
    const seedEffects: Effect[] = [
      ...carry.clues.map((c): Effect => ({ field: 'clues', op: 'add_clue', value: c })),
      ...carry.inventory.map((i): Effect => ({ field: 'inventory', op: 'add_item', value: i })),
    ];
    start.entryEffects = [...seedEffects, ...(start.entryEffects ?? [])];
  }

  if (gameDeadlineMinutes !== undefined) {
    const chapterStart = parseTime(s.startTime);
    const projected = chapterStart + Math.max(0, gameDeadlineMinutes - gameElapsedMinutes);
    const chapterDeadlineMin = s.deadline !== undefined ? parseTime(s.deadline) : Infinity;
    const eff = Math.max(chapterStart, Math.min(chapterDeadlineMin, projected));
    s.deadline = minutesToClock(eff);
  }

  return s;
}
