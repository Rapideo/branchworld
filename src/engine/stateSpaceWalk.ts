import { GameEngine } from './engine';
import { resolveEnding } from './endingResolver';
import { evaluateConditions } from './conditions';
import { resolveProfile } from './profile';
import { checkBucketAlignment } from './travelLint';
import type { Story, GameView, LintIssue } from './types';

const DEFAULT_CAP = 50_000;

export interface WalkReport {
  statesExplored: number;
  capHit: boolean;
  deadRegions: string[];   // roam: forward-reachable node ids from which NO ending is reachable (co-reachability)
  indeterminate: boolean;  // roam + capHit: the honesty results are from a partial walk — treat as FAIL, not all-clear
  zeroEnding: string[];
  softlocks: string[];
  orphanNodes: string[];
  orphanEndings: string[];
  deadChoices: string[];
  eventRecovery: { eventId: string; ok: boolean }[];
  eventPresent: { eventId: string; ok: boolean }[]; // H8: the ifPresentNode is reached (as present) in some play
  conditionalChoices: string[]; // H12: choices available on some reachable branches and locked on others (`node::choice`)
  overlaps: { winner: string; shadowed: string[]; count: number }[];
}

interface WNode {
  snap: ReturnType<GameEngine['snapshot']>;
  view: GameView;
}

// Canonical key: currentId + every piece of WorldState, with set-like arrays sorted.
function keyOf(n: WNode, timeKey: number): string {
  const s = n.snap.state;
  const sortArr = (a: string[]) => [...a].sort();
  return JSON.stringify({
    id: n.snap.currentId,
    ending: n.snap.endingId ?? null,
    // H10: distinct accumulated time at reconverging hubs is the real cap driver. The optional timeBucket mode
    // quantizes time so same-bucket arrivals collapse — but it is APPROXIMATE: it skips states, so it can hide a
    // softlock / orphan ending. Lossless only when EVERY time threshold (time_* gates, event triggers, the
    // deadline, depletion step boundaries) is bucket-aligned. Use it for scale triage, never as a pass/fail gate.
    time: timeKey,
    location: s.location,
    clues: sortArr(s.clues),
    inventory: sortArr(s.inventory),
    visited: sortArr(s.visited),
    completedEvents: sortArr(s.completedEvents),
    vars: Object.fromEntries(Object.entries(s.vars).sort(([a], [b]) => a.localeCompare(b))),
  });
}

// Effective time component: roam+untimed drops time (A<->A dedups); else raw, or bucketed when a bucket is given.
function timeKeyFor(n: WNode, roam: boolean, untimed: boolean, timeBucket?: number): number {
  if (roam && untimed) return 0;
  const t = n.snap.state.time;
  return timeBucket ? Math.floor(t / timeBucket) : t;
}

// Fork freely: restore(snap) puts a fresh-but-identical engine at any visited
// state, so exploring choice B never contaminates the run that explored choice A.
function snapAt(story: Story, from: WNode | null, choiceId?: string): WNode {
  const eng = new GameEngine(story);
  if (from) eng.restore(from.snap);
  const view = choiceId ? eng.choose(choiceId) : eng.start();
  return { snap: eng.snapshot(), view };
}

interface WalkResult {
  story: Story;
  visited: Map<string, WNode>;
  terminals: WNode[];
  capHit: boolean;
  exercisedChoices: Set<string>; // `${nodeId}::${choiceId}` taken from an AVAILABLE state
  choiceAvail: Map<string, { available: number; locked: number }>; // per `${nodeId}::${choiceId}`, across reached visits
  reachedNodes: Set<string>;
  reachedEndings: Set<string>;
  softlocks: WNode[];
  zeroEnding: WNode[];
  parent: Map<string, { prevKey: string; choiceId: string } | null>;
  edges: Map<string, Set<string>>; // FULL forward transition relation (every taken edge, incl. to-visited)
  terminalKeys: Set<string>;
}

function walk(story: Story, cap: number, timeBucket?: number, roamOpt?: boolean): WalkResult {
  const profile = resolveProfile(story);
  const roam = roamOpt ?? (profile.travel === 'free');
  const untimed = profile.clock === 'untimed';
  const key = (n: WNode) => keyOf(n, timeKeyFor(n, roam, untimed, timeBucket));

  const visited = new Map<string, WNode>();
  const parent = new Map<string, { prevKey: string; choiceId: string } | null>();
  const edges = new Map<string, Set<string>>();
  const terminalKeys = new Set<string>();
  const terminals: WNode[] = [];
  const exercisedChoices = new Set<string>();
  const choiceAvail = new Map<string, { available: number; locked: number }>();
  const reachedNodes = new Set<string>();
  const reachedEndings = new Set<string>();
  const softlocks: WNode[] = [];
  const zeroEnding: WNode[] = [];
  let capHit = false;

  const start = snapAt(story, null);
  const startKey = key(start);
  visited.set(startKey, start);
  parent.set(startKey, null);
  const queue: WNode[] = [start];

  while (queue.length) {
    if (visited.size >= cap) { capHit = true; break; }
    const cur = queue.shift()!;
    const curKey = key(cur);
    reachedNodes.add(cur.snap.currentId);

    const ended = cur.view.endingReached;
    if (ended) {
      reachedEndings.add(ended.id);
      terminals.push(cur);
      terminalKeys.add(curKey);
      if (!resolveEnding(cur.snap.state, story)) zeroEnding.push(cur);
      continue;
    }

    const available = cur.view.choices.filter((c) => c.available);
    for (const c of cur.view.choices) {
      const k = `${cur.snap.currentId}::${c.id}`;
      const rec = choiceAvail.get(k) ?? { available: 0, locked: 0 };
      if (c.available) rec.available++; else rec.locked++;
      choiceAvail.set(k, rec);
    }
    if (available.length === 0) { softlocks.push(cur); continue; }

    for (const ch of available) {
      exercisedChoices.add(`${cur.snap.currentId}::${ch.id}`);
      const next = snapAt(story, cur, ch.id);
      const nextKey = key(next);
      // CO-REACHABILITY SOUNDNESS — record the FULL forward edge here, OUTSIDE the `if (!visited.has(nextKey))`
      // block below. Every taken edge (including to an already-visited state) must be recorded; a re-visit edge
      // can be the only route from a state to a terminal. Moving this inside the visited-guard reintroduces the
      // spanning-tree bug the spec was rewritten to fix. (Reviewer: verify this placement explicitly.)
      const set = edges.get(curKey) ?? new Set<string>();
      set.add(nextKey);
      edges.set(curKey, set);
      if (!visited.has(nextKey)) {
        visited.set(nextKey, next);
        parent.set(nextKey, { prevKey: curKey, choiceId: ch.id });
        queue.push(next);
        if (visited.size >= cap) { capHit = true; break; }
      }
    }
    if (capHit) break;
  }

  return { story, visited, terminals, capHit, exercisedChoices, choiceAvail, reachedNodes, reachedEndings, softlocks, zeroEnding, parent, edges, terminalKeys };
}

/** Co-reachability core (pure, exported for direct testing): the set of state keys from which SOME terminal is
 *  reachable, computed by BFS BACKWARD over the FULL forward edge set (NOT a spanning tree — back/re-visit edges
 *  are load-bearing). A key is co-reaching iff it is a terminal or has an edge to a co-reaching key. */
export function coReachable(terminalKeys: Set<string>, edges: Map<string, Set<string>>): Set<string> {
  const rev = new Map<string, string[]>();
  for (const [from, tos] of edges) for (const to of tos) {
    const a = rev.get(to);
    if (a) a.push(from); else rev.set(to, [from]);
  }
  const canReach = new Set<string>(terminalKeys);
  const q = [...terminalKeys];
  while (q.length) {
    const k = q.shift()!;
    for (const p of rev.get(k) ?? []) if (!canReach.has(p)) { canReach.add(p); q.push(p); }
  }
  return canReach;
}

// Any forward-reached state not co-reaching is a dead region. Returns distinct node ids.
function computeDeadRegions(w: WalkResult): string[] {
  const canReach = coReachable(w.terminalKeys, w.edges);
  const dead = new Set<string>();
  for (const [k, n] of w.visited) if (!canReach.has(k)) dead.add(n.snap.currentId);
  return [...dead];
}

// EE-3 overlap: two non-default endings simultaneously satisfiable on a reachable
// terminal. Resolver is deterministic, so exactly one still resolves — report the
// winner + shadowed set so a human can judge "benign priority" vs "contradictory prose".
function findEndingAmbiguities(w: WalkResult) {
  const nonDefault = w.story.endings.filter((e) => !e.isDefault);
  const sig = new Map<string, { winner: string; shadowed: string[]; count: number }>();
  for (const t of w.terminals) {
    const matches = nonDefault.filter((e) => evaluateConditions(e.conditions, t.snap.state)).map((e) => e.id);
    if (matches.length > 1) {
      const winner = resolveEnding(t.snap.state, w.story)?.id ?? '(none)';
      const shadowed = matches.filter((m) => m !== winner);
      const k = `${winner}|${shadowed.join(',')}`;
      const prev = sig.get(k);
      if (prev) prev.count++;
      else sig.set(k, { winner, shadowed, count: 1 });
    }
  }
  return [...sig.values()];
}

function findDeadChoices(w: WalkResult): string[] {
  const dead: string[] = [];
  for (const n of w.story.nodes)
    for (const c of n.choices || [])
      if (!w.exercisedChoices.has(`${n.id}::${c.id}`)) dead.push(`${n.id}::${c.id}`);
  return dead;
}

const findOrphanNodes = (w: WalkResult) =>
  w.story.nodes.filter((n) => !w.reachedNodes.has(n.id)).map((n) => n.id);

const findOrphanEndings = (w: WalkResult) =>
  w.story.endings.filter((e) => !w.reachedEndings.has(e.id)).map((e) => e.id);

// EE-2 (machine-honest): recoveryNodeId is reached as a current state in SOME reachable
// play. Cannot judge whether the clue TEXT truly surfaces — that's prose, deferred to a human.
function checkEventRecovery(w: WalkResult) {
  return w.story.events.map((ev) => ({ eventId: ev.id, ok: w.reachedNodes.has(ev.recoveryNodeId) }));
}

// H8: an event is present-reachable only if it actually FIRED present on some reachable path — NOT merely if
// its ifPresentNode was reached (that node can be choice-reachable). The engine logs each present firing.
function computeEventPresent(w: WalkResult) {
  const fired = new Set<string>();
  for (const wn of w.visited.values())
    for (const line of wn.view.log) {
      const m = /^Event (.+?) fired \(present\)/.exec(line);
      if (m) fired.add(m[1]);
    }
  return w.story.events.map((ev) => ({ eventId: ev.id, ok: fired.has(ev.id) }));
}

export function walkStateSpace(story: Story, opts?: { cap?: number; timeBucket?: number; roam?: boolean }): WalkReport {
  const cap = opts?.cap ?? DEFAULT_CAP;
  const profile = resolveProfile(story);
  const roam = opts?.roam ?? (profile.travel === 'free');
  const w = walk(story, cap, opts?.timeBucket, roam);
  return {
    statesExplored: w.visited.size,
    capHit: w.capHit,
    indeterminate: roam && w.capHit,
    deadRegions: roam ? computeDeadRegions(w) : [],
    zeroEnding: [...new Set(w.zeroEnding.map((n) => n.view.endingReached?.id ?? n.snap.currentId))],
    softlocks: [...new Set(w.softlocks.map((n) => n.snap.currentId))],
    orphanNodes: findOrphanNodes(w),
    orphanEndings: findOrphanEndings(w),
    deadChoices: findDeadChoices(w),
    eventRecovery: checkEventRecovery(w),
    eventPresent: computeEventPresent(w),
    conditionalChoices: [...w.choiceAvail.entries()].filter(([, v]) => v.available > 0 && v.locked > 0).map(([k]) => k).sort(),
    overlaps: findEndingAmbiguities(w),
  };
}

export interface RoamVerifyResult { ok: boolean; report: WalkReport; bucketIssues: LintIssue[]; }

/** The roam verify gate. Timed roam MUST pass a bucket that divides every time threshold (checkBucketAlignment);
 *  the walk must be complete (not indeterminate) and clean (no softlocks, dead regions, or orphan endings). */
export function verifyRoam(story: Story, opts?: { timeBucket?: number; cap?: number }): RoamVerifyResult {
  const bucketIssues = opts?.timeBucket !== undefined ? checkBucketAlignment(story, opts.timeBucket) : [];
  const report = walkStateSpace(story, { roam: true, timeBucket: opts?.timeBucket, cap: opts?.cap });
  const ok = bucketIssues.length === 0 && !report.indeterminate
    && report.softlocks.length === 0 && report.deadRegions.length === 0 && report.orphanEndings.length === 0;
  return { ok, report, bucketIssues };
}
