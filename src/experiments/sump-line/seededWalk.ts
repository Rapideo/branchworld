/**
 * A4 / E2 — seeded walker + value-at-endings report (container layer; ZERO engine changes).
 *
 * Two book-scale verification gaps the per-chapter walker can't cover:
 *  - F4: `walkStateSpace` always starts from a chapter's authored defaults, so carry-only endings
 *        (the dark endings, "Daylight, All Three") are unreachable orphans standalone. A SEEDED walk
 *        starts the chapter from a representative carried-in state, so those endings are exercised.
 *  - F7: survival-resource calibration is hand-arithmetic. A value-at-endings report walks the chapter
 *        and reports the min/max of each resource (and chosen vars) at every reachable ending — so
 *        "is the dark ending reachable? does the clean route survive?" is answered by a table, not by hand.
 *
 * Built over the public engine API (GameEngine snapshot/restore + walkStateSpace) by rewriting a clone
 * of the Story's variable defaults / resource starts — the same move the container's seedChapterStory
 * makes. No src/engine change.
 */
import { GameEngine } from '../../engine';
import type { Story, Primitive, GameView, EngineSnapshot } from '../../engine';
import { walkStateSpace, type WalkReport } from '../../engine/stateSpaceWalk';

/** Clone the Story and override variable defaults / resource starts from a representative carried-in state. */
export function seedStory(story: Story, seed: Record<string, Primitive>): Story {
  const s: Story = JSON.parse(JSON.stringify(story)) as Story;
  for (const v of s.variables) if (Object.prototype.hasOwnProperty.call(seed, v.name)) v.default = seed[v.name];
  for (const r of s.resources ?? []) if (Object.prototype.hasOwnProperty.call(seed, r.id)) r.start = Number(seed[r.id]);
  return s;
}

/** Exhaustively walk a chapter FROM a representative carried-in state (closes the F4 verification gap). */
export function walkSeeded(story: Story, seed: Record<string, Primitive>, opts?: { cap?: number }): WalkReport {
  return walkStateSpace(seedStory(story, seed), opts);
}

export interface FieldRange {
  min: number;
  max: number;
}
export interface EndingValueReport {
  endingId: string;
  reached: boolean;
  count: number; // distinct terminal states resolving to this ending
  ranges: Record<string, FieldRange>; // per tracked field: min/max value across those terminals
}

interface WState {
  snap: EngineSnapshot;
  view: GameView;
}
function keyOf(n: WState): string {
  const s = n.snap.state;
  return JSON.stringify({
    id: n.snap.currentId,
    ending: n.snap.endingId ?? null,
    time: s.time,
    location: s.location,
    vars: s.vars,
    clues: [...s.clues].sort(),
    inventory: [...s.inventory].sort(),
  });
}

/**
 * Walk a chapter (optionally seeded) and report, per reachable ending, the min/max of each tracked
 * numeric field across the terminals resolving to it. Tracked fields default to every resource id.
 * This is the F7 calibration table: e.g. "end_daylight_all_three: lamp_charge ∈ [5, 41]".
 */
export function valuesAtEndings(
  story: Story,
  opts?: { seed?: Record<string, Primitive>; fields?: string[]; cap?: number },
): EndingValueReport[] {
  const s = opts?.seed ? seedStory(story, opts.seed) : story;
  const fields = opts?.fields ?? (s.resources ?? []).map((r) => r.id);
  const cap = opts?.cap ?? 100_000;

  const acc = new Map<string, { count: number; ranges: Record<string, FieldRange> }>();
  const record = (endingId: string, state: GameView['state']) => {
    let a = acc.get(endingId);
    if (!a) {
      a = { count: 0, ranges: {} };
      acc.set(endingId, a);
    }
    a.count++;
    for (const f of fields) {
      const raw = state.vars[f];
      if (raw === undefined) continue;
      const n = Number(raw);
      if (Number.isNaN(n)) continue;
      const r = a.ranges[f];
      if (!r) a.ranges[f] = { min: n, max: n };
      else {
        r.min = Math.min(r.min, n);
        r.max = Math.max(r.max, n);
      }
    }
  };

  // fork-restore BFS over the reachable state space (mirrors the engine walker; lets us read terminals)
  const eng0 = new GameEngine(s);
  const start: WState = { view: eng0.start(), snap: eng0.snapshot() };
  const seen = new Set<string>([keyOf(start)]);
  const queue: WState[] = [start];
  while (queue.length) {
    if (seen.size >= cap) break;
    const cur = queue.shift()!;
    if (cur.view.endingReached) {
      record(cur.view.endingReached.id, cur.view.state);
      continue;
    }
    const avail = cur.view.choices.filter((c) => c.available);
    for (const ch of avail) {
      const e = new GameEngine(s);
      e.restore(cur.snap);
      const view = e.choose(ch.id);
      const next: WState = { view, snap: e.snapshot() };
      const k = keyOf(next);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push(next);
        if (seen.size >= cap) break;
      }
    }
  }

  return s.endings.map((e): EndingValueReport => {
    const a = acc.get(e.id);
    return { endingId: e.id, reached: !!a, count: a?.count ?? 0, ranges: a?.ranges ?? {} };
  });
}
