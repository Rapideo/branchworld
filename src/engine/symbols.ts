import type { Story, Effect } from './types';

export interface StorySymbols {
  producibleClues: Set<string>;
  locationIds: Set<string>;
}

function allEffects(story: Story): Effect[] {
  const out: Effect[] = [];
  for (const n of story.nodes) {
    out.push(...(n.entryEffects ?? []));
    for (const c of n.choices ?? []) out.push(...(c.effects ?? []));
  }
  for (const ev of story.events) out.push(...(ev.ifAbsentEffects ?? []));
  return out;
}

export function collectSymbols(story: Story): StorySymbols {
  const producibleClues = new Set<string>();
  for (const e of allEffects(story)) {
    if (e.op === 'add_clue') producibleClues.add(e.value ?? e.field);
  }
  return { producibleClues, locationIds: new Set(story.locations.map((l) => l.id)) };
}
