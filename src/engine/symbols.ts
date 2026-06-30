import type { Story, Effect, Profile } from './types';

export interface StorySymbols {
  producibleClues: Set<string>;
  locationIds: Set<string>;
  canBecomeTruthy: Set<string>;          // var names some effect can make truthy
  setValues: Map<string, Set<string>>;   // var -> literal values some `set` can assign
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

export function collectSymbols(story: Story, profile?: Profile): StorySymbols {
  const producibleClues = new Set<string>();
  const canBecomeTruthy = new Set<string>();
  const setValues = new Map<string, Set<string>>();

  // Variables whose default value is already truthy
  for (const v of story.variables) {
    const d = v.default;
    if (d === true || (typeof d === 'number' && d !== 0) || (typeof d === 'string' && d !== '')) {
      canBecomeTruthy.add(v.name);
    }
  }

  if (profile?.investigation === 'on') {
    for (const n of story.nodes) for (const ex of n.examinables ?? []) producibleClues.add(ex.clue);
  }

  for (const e of allEffects(story)) {
    if (e.op === 'add_clue') {
      producibleClues.add(e.value ?? e.field);
    } else if (e.op === 'set') {
      const vals = setValues.get(e.field) ?? new Set<string>();
      if (e.value !== undefined) vals.add(e.value);
      setValues.set(e.field, vals);
      // 'true' or nonzero numeric string -> can become truthy
      if (e.value === 'true') canBecomeTruthy.add(e.field);
      else if (e.value !== undefined && e.value !== '' && e.value !== 'false') {
        const n = Number(e.value);
        if (!isNaN(n) && n !== 0) canBecomeTruthy.add(e.field);
      }
    } else if (e.op === 'increment') {
      // increment can push a number above 0
      canBecomeTruthy.add(e.field);
    }
  }

  return {
    producibleClues,
    locationIds: new Set(story.locations.map((l) => l.id)),
    canBecomeTruthy,
    setValues,
  };
}
