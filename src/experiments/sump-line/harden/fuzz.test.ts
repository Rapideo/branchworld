/**
 * Track A — the property/fuzz sweep ("engine hardening").
 *
 * Generates random-but-lint-clean Stories with a seeded PRNG, walks them, and asserts
 * the runtime's load-bearing invariants hold under load:
 *   1. no-throw   — choosing only AVAILABLE choices never throws
 *   2. bounds     — every resource & bounded var stays within [min, max] at every reachable state
 *   3. determinism— replaying a recorded choice path reproduces the exact final snapshot
 *   4. snapshot   — restore() into a fresh engine is faithful (the walker relies on this)
 *
 * Plus TARGETED ADVERSARIAL PROBES that turn the team's code-read hypotheses (which they
 * could not execute) into running, reproducible proofs. Each probe is a minimal lint-clean
 * Story (or pure-unit call) that demonstrates one gap for the v1.4 punch list.
 *
 * The engine (src/engine) is FROZEN: this file only READS it. Failures here are findings,
 * not fixes. Reproduce a fuzz failure by re-running with the logged seed.
 *
 * Heavier sweep on demand:  FUZZ_N=2000 npx vitest run src/experiments/sump-line/harden
 */
import { describe, it, expect } from 'vitest';
import {
  GameEngine,
  lintStory,
  resolveEnding,
  evaluateConditions,
  type Story,
  type GameView,
  type WorldState,
  type EngineSnapshot,
} from '../../../engine';
import { walkStateSpace } from '../../../engine/stateSpaceWalk';

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32) — reproducible: a failing seed re-runs identically.
// ---------------------------------------------------------------------------
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Rng {
  private r: () => number;
  constructor(seed: number) {
    this.r = mulberry32(seed);
  }
  next(): number {
    return this.r();
  }
  /** inclusive both ends */
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.r() * (hi - lo + 1));
  }
  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }
  chance(p: number): boolean {
    return this.r() < p;
  }
}

const START_MIN = 8 * 60; // 08:00
function fmtHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// The generator — a structured random Story that is lint-clean by construction.
// Forward-only edges (a DAG) so it always terminates and stays walker-tractable;
// the gnarly bits (loop-backs, events, negative time) live in the targeted probes.
// ---------------------------------------------------------------------------
function genStory(seed: number): Story {
  const rng = new Rng(seed);
  const id = `fuzz_${seed}`;

  const locations = [
    { id: 'loc_a', name: 'A' },
    { id: 'loc_b', name: 'B' },
    { id: 'loc_c', name: 'C' },
  ];
  const locIds = locations.map((l) => l.id);

  const maxMeter = rng.int(3, 8);
  const variables = [
    { name: 'flag', type: 'boolean' as const, default: false, purpose: 'a latch' },
    { name: 'meter', type: 'number' as const, default: rng.int(0, 2), purpose: 'a gauge', min: 0, max: maxMeter },
  ];

  // resources (disjoint ids from variables)
  const resources: NonNullable<Story['resources']> = [];
  if (rng.chance(0.6)) {
    resources.push({
      id: 'lamp',
      label: 'Lamp',
      min: 0,
      max: 100,
      start: rng.int(20, 100),
      depletion: { everyMinutes: 5 * rng.int(2, 6), amount: rng.int(2, 10) },
      atZero: rng.chance(0.5) ? { setFlag: 'flag' } : undefined,
    });
  }
  const hasAir = rng.chance(0.4);
  if (hasAir) resources.push({ id: 'air', min: 0, max: 3, start: rng.int(1, 3) });

  const nNodes = rng.int(4, 9);
  const terminalCount = rng.int(1, 2);
  const M = nNodes - terminalCount; // interior count
  const nodeId = (i: number) => `n${i}`;

  const condChoices = () => {
    const k = rng.int(1, maxMeter);
    return rng.pick([
      [{ field: 'flag', op: 'is_true' as const }],
      [{ field: 'flag', op: 'is_false' as const }],
      [{ field: 'meter', op: 'gte' as const, value: String(k) }],
      [{ field: 'meter', op: 'lt' as const, value: String(k) }],
    ]);
  };

  const nodes: Story['nodes'] = [];
  for (let i = 0; i < M; i++) {
    const nc = rng.int(1, 3);
    const choices = [];
    for (let c = 0; c < nc; c++) {
      const dest = rng.int(i + 1, nNodes - 1); // forward edge → DAG
      const effects: { field: string; op: any; value?: string }[] = [
        { field: 'time', op: 'add_minutes', value: String(5 * rng.int(1, 6)) },
      ];
      if (rng.chance(0.3)) effects.push({ field: 'flag', op: 'set', value: 'true' });
      if (rng.chance(0.3)) effects.push({ field: 'meter', op: 'increment', value: '1' });
      if (hasAir && rng.chance(0.2)) effects.push({ field: 'air', op: 'decrement', value: '1' });
      if (rng.chance(0.2)) effects.push({ field: `clue_${i}_${c}`, op: 'add_clue' });
      choices.push({
        id: `n${i}_c${c}`,
        label: `choice ${c}`,
        destination: nodeId(dest),
        // first choice is ALWAYS unconditional → node has a live exit → no static soft-lock
        conditions: c === 0 ? undefined : rng.chance(0.4) ? condChoices() : undefined,
        effects,
      });
    }
    const entryEffects =
      rng.chance(0.3) ? [{ field: 'location', op: 'change_location' as any, value: rng.pick(locIds) }] : undefined;
    nodes.push({ id: nodeId(i), title: `node ${i}`, body: `body ${i}`, choices, entryEffects });
  }
  for (let i = M; i < nNodes; i++) {
    nodes.push({ id: nodeId(i), title: `end node ${i}`, body: `end body ${i}`, choices: [], resolvesEnding: true });
  }

  // endings: one default + 1..3 non-default with distinct priorities
  const endings: Story['endings'] = [{ id: 'e_default', name: 'Default', conditions: [], summary: 'default', isDefault: true }];
  const nEnd = rng.int(1, 3);
  for (let e = 0; e < nEnd; e++) {
    const k = rng.int(1, maxMeter);
    const cond = rng.pick([
      [{ field: 'flag', op: 'is_true' as const }],
      [{ field: 'meter', op: 'gte' as const, value: String(k) }],
    ]);
    endings.push({ id: `e${e}`, name: `End ${e}`, conditions: cond, summary: `end ${e}`, priority: e + 1 });
  }

  // clock: pick a window inside the linter's own [minTime, maxTime] so it always bites & is winnable
  const { maxT, minT } = pathTimeBounds(nodes, nodeId(0));
  const window = maxT <= 0 ? 0 : rng.int(Math.min(minT, maxT), maxT);

  return {
    id,
    title: `Fuzz ${seed}`,
    startNodeId: nodeId(0),
    startTime: fmtHHMM(START_MIN),
    deadline: fmtHHMM(START_MIN + window),
    startLocation: 'loc_a',
    variables,
    nodes,
    locations,
    events: [],
    endings,
    resources: resources.length ? resources : undefined,
  };
}

// Faithful replica of the linter's timeBounds DFS (so generated windows are lint-legal).
function pathTimeBounds(nodes: Story['nodes'], startId: string): { maxT: number; minT: number } {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let maxT = 0;
  let minT = Infinity;
  const choiceMin = (c: any) =>
    (c.effects || []).filter((e: any) => e.op === 'add_minutes').reduce((a: number, e: any) => a + Number(e.value ?? 0), 0);
  const dfs = (id: string, acc: number, path: Set<string>): void => {
    const n = byId.get(id);
    if (!n || n.resolvesEnding || (n.choices?.length ?? 0) === 0 || path.has(id)) {
      maxT = Math.max(maxT, acc);
      minT = Math.min(minT, acc);
      return;
    }
    const np = new Set(path);
    np.add(id);
    for (const c of n.choices) dfs(c.destination, acc + choiceMin(c), np);
  };
  dfs(startId, 0, new Set());
  if (minT === Infinity) minT = 0;
  return { maxT, minT };
}

// ---------------------------------------------------------------------------
// An independent fork-walk (mirrors stateSpaceWalk but lets us inspect each state).
// Doubles as a snapshot/restore stress test: every edge restores into a fresh engine.
// ---------------------------------------------------------------------------
interface WState {
  snap: EngineSnapshot;
  view: GameView;
}
function stateKey(n: WState): string {
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
function forEachState(
  story: Story,
  visit: (v: GameView) => void,
  cap = 2500,
): { states: number; capHit: boolean; softlocks: string[] } {
  const eng0 = new GameEngine(story);
  const start: WState = { view: eng0.start(), snap: eng0.snapshot() };
  const seen = new Map<string, WState>([[stateKey(start), start]]);
  const queue: WState[] = [start];
  const softlocks = new Set<string>();
  let capHit = false;

  while (queue.length) {
    if (seen.size >= cap) {
      capHit = true;
      break;
    }
    const cur = queue.shift()!;
    visit(cur.view);
    if (cur.view.endingReached) continue;
    const avail = cur.view.choices.filter((c) => c.available);
    if (avail.length === 0) {
      softlocks.add(cur.snap.currentId);
      continue;
    }
    for (const ch of avail) {
      const e = new GameEngine(story);
      e.restore(cur.snap); // <-- restore into a FRESH engine (fidelity stress)
      const view = e.choose(ch.id);
      const next: WState = { view, snap: e.snapshot() };
      const k = stateKey(next);
      if (!seen.has(k)) {
        seen.set(k, next);
        queue.push(next);
        if (seen.size >= cap) {
          capHit = true;
          break;
        }
      }
    }
    if (capHit) break;
  }
  return { states: seen.size, capHit, softlocks: [...softlocks] };
}

function randomWalk(story: Story, rng: Rng, maxSteps = 300): { path: string[]; snap: EngineSnapshot } {
  const eng = new GameEngine(story);
  let v = eng.start();
  const path: string[] = [];
  for (let i = 0; i < maxSteps; i++) {
    if (v.endingReached) break;
    const avail = v.choices.filter((c) => c.available);
    if (avail.length === 0) break;
    const ch = rng.pick(avail);
    path.push(ch.id);
    v = eng.choose(ch.id);
  }
  return { path, snap: eng.snapshot() };
}

function assertBounds(story: Story, v: GameView): void {
  for (const r of story.resources ?? []) {
    const val = Number(v.state.vars[r.id]);
    expect(val, `resource ${r.id} below min in ${story.id}`).toBeGreaterThanOrEqual(r.min);
    expect(val, `resource ${r.id} above max in ${story.id}`).toBeLessThanOrEqual(r.max);
  }
  for (const def of story.variables) {
    if (def.min === undefined && def.max === undefined) continue;
    const val = Number(v.state.vars[def.name]);
    if (def.min !== undefined) expect(val, `var ${def.name} below min in ${story.id}`).toBeGreaterThanOrEqual(def.min);
    if (def.max !== undefined) expect(val, `var ${def.name} above max in ${story.id}`).toBeLessThanOrEqual(def.max);
  }
  expect(Number.isFinite(v.state.time), `time non-finite in ${story.id}`).toBe(true);
}

// ---------------------------------------------------------------------------
// Build a corpus of lint-clean generated stories once (shared across properties).
// ---------------------------------------------------------------------------
// Read the optional override without depending on @types/node (keeps tsc clean).
const FUZZ_ENV = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.FUZZ_N;
const FUZZ_N = Number(FUZZ_ENV ?? 250);
interface CorpusEntry {
  seed: number;
  story: Story;
}
const corpus: CorpusEntry[] = [];
let generated = 0;
let rejected = 0;
for (let seed = 1; seed <= FUZZ_N; seed++) {
  generated++;
  let story: Story;
  try {
    story = genStory(seed);
  } catch {
    rejected++;
    continue;
  }
  if (lintStory(story).errors.length === 0) corpus.push({ seed, story });
  else rejected++;
}

describe('Track A — engine property sweep over random lint-clean stories', () => {
  it(`the generator yields a healthy corpus of lint-clean stories (gen=${generated})`, () => {
    // If this fails, the generator regressed and the whole sweep is meaningless — fail loudly.
    expect(corpus.length).toBeGreaterThan(30);
    expect(corpus.length / generated).toBeGreaterThan(0.2);
  });

  it('PROP-1/2: no reachable state ever throws or escapes resource/var bounds', () => {
    const sample = corpus.slice(0, 120);
    let totalStates = 0;
    let capHits = 0;
    const softlockStories: number[] = [];
    for (const { seed, story } of sample) {
      const r = forEachState(story, (v) => assertBounds(story, v));
      totalStates += r.states;
      if (r.capHit) capHits++;
      if (r.softlocks.length) softlockStories.push(seed);
    }
    // Observational, not a failure: forward-DAG generated stories should not softlock.
    // (Dynamic soft-locks are demonstrated deliberately in PROBE-A below.)
    // eslint-disable-next-line no-console
    console.log(
      `[fuzz] walked ${sample.length} stories, ${totalStates} states, capHits=${capHits}, softlockStories=${softlockStories.length}`,
    );
    expect(softlockStories).toEqual([]); // generated DAGs always keep a live exit
  });

  it('PROP-3: replaying a recorded choice path is deterministic', () => {
    for (const { story } of corpus.slice(0, 120)) {
      const rng = new Rng(0xc0ffee);
      const a = randomWalk(story, rng);
      // replay the exact path on a fresh engine
      const eng = new GameEngine(story);
      eng.start();
      for (const c of a.path) eng.choose(c);
      const b = eng.snapshot();
      expect(b.state, `nondeterministic replay in ${story.id}`).toEqual(a.snap.state);
      expect(b.endingId).toBe(a.snap.endingId);
    }
  });

  it('PROP-4: snapshot()/restore() into a fresh engine is faithful mid-game', () => {
    for (const { story } of corpus.slice(0, 120)) {
      const eng = new GameEngine(story);
      let v = eng.start();
      // advance a few steps, then fork: continue on A vs restore-into-fresh-B and take the same choice
      for (let step = 0; step < 4; step++) {
        if (v.endingReached) break;
        const avail = v.choices.filter((c) => c.available);
        if (!avail.length) break;
        const snap = eng.snapshot();
        const choice = avail[0].id;
        const contA = eng.choose(choice);
        const engB = new GameEngine(story);
        engB.restore(snap);
        const contB = engB.choose(choice);
        expect(contB.state, `restore diverged in ${story.id}`).toEqual(contA.state);
        expect(contB.endingReached?.id).toBe(contA.endingReached?.id);
        v = contA;
      }
    }
  });

  it('OBS: aggregate walkStateSpace health across the corpus (no throws; report caps/softlocks)', () => {
    let capHits = 0;
    let withSoftlocks = 0;
    for (const { story } of corpus) {
      const r = walkStateSpace(story);
      if (r.capHit) capHits++;
      if (r.softlocks.length) withSoftlocks++;
    }
    // eslint-disable-next-line no-console
    console.log(`[fuzz] walkStateSpace: corpus=${corpus.length}, capHits=${capHits}, withSoftlocks=${withSoftlocks}`);
    expect(capHits).toBe(0); // small generated stories never blow the cap
  });
});

// ===========================================================================
// TARGETED ADVERSARIAL PROBES — execute-proofs of the team's code-read findings.
// Each builds a MINIMAL lint-clean Story (asserts lint clean) and demonstrates the gap.
// ===========================================================================
describe('Track A — targeted probes (execute-proofs for the v1.4 punch list)', () => {
  // PROBE-A: a lint-clean story that DYNAMICALLY soft-locks.
  // Proves: lintStory clean ≠ soft-lock-free — the walker is load-bearing (validates the
  // method's insistence on running walkStateSpace, not just the linter).
  it('PROBE-A: lint passes but the walker finds a dynamic soft-lock (numeric gate never satisfiable on the path)', () => {
    const story: Story = {
      id: 'probe_softlock',
      title: 'Softlock',
      startNodeId: 'n0',
      startTime: '08:00',
      deadline: '08:20', // window 20; the trap is hit at +10, well before the deadline
      startLocation: 'loc_a',
      variables: [{ name: 'meter', type: 'number', default: 0, purpose: 'never raised', min: 0, max: 10 }],
      locations: [{ id: 'loc_a', name: 'A' }],
      events: [],
      nodes: [
        { id: 'n0', title: 'start', body: '', choices: [{ id: 'c_go', label: 'go', destination: 'n_trap', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] }] },
        // every exit gated on meter>=5, but nothing ever raises meter → stuck at runtime, time < deadline
        { id: 'n_trap', title: 'trap', body: '', choices: [{ id: 'c_need', label: 'need 5', destination: 'n_end', conditions: [{ field: 'meter', op: 'gte', value: '5' }], effects: [{ field: 'time', op: 'add_minutes', value: '10' }] }] },
        { id: 'n_end', title: 'end', body: '', choices: [], resolvesEnding: true },
      ],
      endings: [{ id: 'e_default', name: 'Default', conditions: [], summary: '', isDefault: true }],
    };
    expect(lintStory(story).errors).toEqual([]); // the linter is happy
    const walk = walkStateSpace(story);
    expect(walk.softlocks).toContain('n_trap'); // the walker is NOT — it catches what lint can't
  });

  // PROBE-B (CLOSED by A2): a negative add_minutes is now both lint-flagged and runtime-refused.
  // Was systems-finding S1 / H2: rewind made F6's "time-driven meters can only fall" false and the
  // linter had no NEGATIVE_TIME_DELTA guard. A2 added the lint + the "time is monotonic" invariant;
  // this probe now proves the hole is closed (it actually runs).
  it('PROBE-B (closed): a negative add_minutes is lint-flagged and cannot rewind time (H2 fixed)', () => {
    const story: Story = {
      id: 'probe_rewind',
      title: 'Rewind',
      startNodeId: 'n0',
      startTime: '08:00',
      deadline: '10:00', // window 120 (a long forward branch makes maxTime large enough to be lint-legal)
      startLocation: 'loc_a',
      variables: [{ name: 'flag', type: 'boolean', default: false, purpose: 'unused' }],
      locations: [{ id: 'loc_a', name: 'A' }],
      events: [],
      resources: [{ id: 'lamp', label: 'Lamp', min: 0, max: 100, start: 100, depletion: { everyMinutes: 10, amount: 10 } }],
      nodes: [
        {
          id: 'n0',
          title: 'start',
          body: '',
          choices: [
            { id: 'c_long', label: 'long way', destination: 'n_longend', effects: [{ field: 'time', op: 'add_minutes', value: '200' }] },
            { id: 'c_advance', label: 'advance 30', destination: 'n_mid', effects: [{ field: 'time', op: 'add_minutes', value: '30' }] },
          ],
        },
        { id: 'n_mid', title: 'mid', body: '', choices: [{ id: 'c_rewind', label: 'rewind 20', destination: 'n_back', effects: [{ field: 'time', op: 'add_minutes', value: '-20' }] }] },
        { id: 'n_back', title: 'back', body: '', choices: [{ id: 'c_finish', label: 'finish', destination: 'n_end', effects: [{ field: 'time', op: 'add_minutes', value: '5' }] }] },
        { id: 'n_end', title: 'end', body: '', choices: [], resolvesEnding: true },
        { id: 'n_longend', title: 'longend', body: '', choices: [], resolvesEnding: true },
      ],
      endings: [{ id: 'e_default', name: 'Default', conditions: [], summary: '', isDefault: true }],
    };
    expect(lintStory(story).errors.map((e) => e.code)).toContain('NEGATIVE_TIME_DELTA'); // now caught

    const eng = new GameEngine(story);
    eng.start();
    const atMid = eng.choose('c_advance'); // time 08:30, lamp = 100 - 10*floor(30/10) = 70
    const lampMid = Number(atMid.state.vars.lamp);
    const tMid = atMid.state.time;
    const atBack = eng.choose('c_rewind'); // -20 clamped away: time holds 08:30, lamp holds 70
    const lampBack = Number(atBack.state.vars.lamp);
    const tBack = atBack.state.time;

    expect(lampMid).toBe(70);
    expect(tBack).toBe(tMid); // the rewind was refused — time did not run backwards
    expect(lampBack).toBe(lampMid); // and the time-driven meter did NOT revive
  });

  // PROBE-C: an atZero ending short-circuits the priority resolver.
  // PROBE-C (CLOSED by A3 + guarded by F2): the atZero ending no longer short-circuits — it competes by
  // priority, so a higher-priority state-matched ending CAN win (the H3 engine fix). This thin story — a
  // survival ending out-ranking the death WITHOUT guarding against it — is exactly what the F2
  // ATZERO_PRIORITY_DOMINANCE lint now flags. So this probe proves both the engine behavior and the lint.
  it('PROBE-C (closed): an atZero ending competes by priority; the higher-priority state ending wins (H3 fixed)', () => {
    const story: Story = {
      id: 'probe_atzero',
      title: 'AtZero',
      startNodeId: 'n0',
      startTime: '08:00',
      deadline: '09:30', // window 90 (≤ the +100 long branch so the clock can bite); cross resolves at +15
      startLocation: 'loc_a',
      variables: [{ name: 'crossed', type: 'boolean', default: false, purpose: 'reached the far side' }],
      locations: [{ id: 'loc_a', name: 'A' }],
      events: [],
      resources: [{ id: 'lamp', label: 'Lamp', min: 0, max: 100, start: 10, depletion: { everyMinutes: 10, amount: 10 }, atZero: { ending: 'e_dark' } }],
      nodes: [
        {
          id: 'n0',
          title: 'start',
          body: '',
          choices: [
            { id: 'c_long', label: 'long way', destination: 'n_longend', effects: [{ field: 'time', op: 'add_minutes', value: '100' }] },
            { id: 'c_cross', label: 'cross', destination: 'n_done', effects: [{ field: 'time', op: 'add_minutes', value: '15' }] },
          ],
        },
        { id: 'n_done', title: 'done', body: '', entryEffects: [{ field: 'crossed', op: 'set', value: 'true' }], choices: [], resolvesEnding: true },
        { id: 'n_longend', title: 'longend', body: '', choices: [], resolvesEnding: true },
      ],
      endings: [
        { id: 'e_default', name: 'Default', conditions: [], summary: '', isDefault: true },
        { id: 'e_grey', name: 'Grey (you crossed)', conditions: [{ field: 'crossed', op: 'is_true' }], summary: '', priority: 5 },
        { id: 'e_dark', name: 'Dark (lamp died)', conditions: [{ field: 'lamp', op: 'lte', value: '0' }], summary: '', priority: 1 },
      ],
    };
    // F2 now flags this exact authoring (death 'e_dark' pri1 out-ranked by co-occurring 'e_grey' pri5, unguarded):
    expect(lintStory(story).errors.map((e) => e.code)).toContain('ATZERO_PRIORITY_DOMINANCE');

    const eng = new GameEngine(story);
    eng.start();
    const end = eng.choose('c_cross'); // lamp 10 → 0 at +10..15; crossed=true
    // The engine now resolves the higher-priority GREY ending (atZero competes, no longer short-circuits)...
    expect(end.endingReached?.id).toBe('e_grey');
    // ...matching what the priority resolver over the same final state intends.
    const byPriority = resolveEnding(end.state, story);
    expect(byPriority?.id).toBe('e_grey');
    expect(end.endingReached?.id).toBe(byPriority?.id); // engine outcome == priority intent
  });

  // PROBE-F (A3 + F3): a node with endsWith and NO resolvesEnding still resolves — endsWith is a resolution
  // trigger (the F3 wiring fix) — to the named ending even though the state resolver would pick the default.
  // The node is reached well before the deadline, so endsWith is the ONLY trigger.
  it('PROBE-F: a node with endsWith (no resolvesEnding) triggers resolution to the named ending', () => {
    const story: Story = {
      id: 'probe_named', title: 'Named', startNodeId: 'n0', startTime: '08:00', deadline: '12:00',
      startLocation: 'loc_a', variables: [{ name: 'crossed', type: 'boolean', default: false, purpose: 'x' }],
      locations: [{ id: 'loc_a', name: 'A' }], events: [],
      nodes: [
        { id: 'n0', title: 's', body: '', choices: [
          { id: 'c', label: 'go', destination: 'n_end', effects: [{ field: 'time', op: 'add_minutes', value: '30' }] },
          { id: 'c_long', label: 'long', destination: 'n_long', effects: [{ field: 'time', op: 'add_minutes', value: '240' }] },
        ] },
        { id: 'n_end', title: 'e', body: '', choices: [], endsWith: 'e_special' }, // no resolvesEnding -> endsWith must trigger
        { id: 'n_long', title: 'l', body: '', choices: [], resolvesEnding: true },
      ],
      endings: [
        { id: 'e_default', name: 'D', conditions: [], summary: '', isDefault: true },
        { id: 'e_special', name: 'Special', conditions: [{ field: 'crossed', op: 'is_true' }], summary: '', priority: 0 },
      ],
    };
    expect(lintStory(story).errors).toEqual([]);
    const eng = new GameEngine(story);
    eng.start();
    const end = eng.choose('c'); // time 08:30, well before 12:00; crossed unset -> state picks default; endsWith forces e_special
    expect(end.endingReached?.id).toBe('e_special');
  });

  // PROBE-G (F6/A6 closed): a choice can RAISE a time-driven resource via adjust_resource (swap the battery) —
  // the old engine forbade it (time-driven meters only ever fell). value = clamp(base(time) + offset).
  it('PROBE-G: adjust_resource lets a choice raise a time-driven lamp (F6 closed)', () => {
    const story: Story = {
      id: 'probe_offset', title: 'Offset', startNodeId: 'n0', startTime: '08:00', deadline: '08:35',
      startLocation: 'loc_a', variables: [], locations: [{ id: 'loc_a', name: 'A' }], events: [],
      resources: [{ id: 'lamp', label: 'Lamp', min: 0, max: 100, start: 100, depletion: { everyMinutes: 10, amount: 10 } }],
      nodes: [
        { id: 'n0', title: 's', body: '', choices: [{ id: 'c_burn', label: 'burn 30', destination: 'n1', effects: [{ field: 'time', op: 'add_minutes', value: '30' }] }] },
        { id: 'n1', title: 'm', body: '', choices: [{ id: 'c_swap', label: 'swap battery (+20)', destination: 'n_end', effects: [{ field: 'lamp', op: 'adjust_resource', value: '20' }, { field: 'time', op: 'add_minutes', value: '5' }] }] },
        { id: 'n_end', title: 'e', body: '', choices: [], resolvesEnding: true },
      ],
      endings: [{ id: 'd', name: 'D', conditions: [], summary: '', isDefault: true }],
    };
    expect(lintStory(story).errors).toEqual([]);
    const eng = new GameEngine(story);
    eng.start();
    const mid = eng.choose('c_burn'); // 08:30, lamp = 100 - 10*3 = 70
    expect(Number(mid.state.vars.lamp)).toBe(70);
    const after = eng.choose('c_swap'); // 08:35, base 70, +20 offset -> 90 (the meter went UP)
    expect(Number(after.state.vars.lamp)).toBe(90);
  });

  // PROBE-D: the coercion asymmetry behind silent cross-chapter contract drift.
  // Proves scaling-finding S1: a carried latch that a downstream chapter reads but an upstream
  // rename left UNWRITTEN reads as undefined — and is_false on undefined OPENS the gate (fails
  // open) while equals on undefined fails CLOSED. Same drift, opposite symptom per operator.
  it('PROBE-D: is_false on a missing var returns true (gate opens); equals returns false (gate closes)', () => {
    const missing: WorldState = {
      time: 0,
      location: 'loc_a',
      clues: [],
      inventory: [],
      visited: [],
      completedEvents: [],
      vars: {}, // 'ghost' was renamed away upstream → absent here
    };
    // A downstream "only if the latch was never set" gate silently OPENS for a renamed latch:
    expect(evaluateConditions([{ field: 'ghost', op: 'is_false' }], missing)).toBe(true);
    // An equals-based gate silently CLOSES instead — drift symptom flips with the operator:
    expect(evaluateConditions([{ field: 'ghost', op: 'equals', value: 'with_you' }], missing)).toBe(false);
    // not_equals likewise reads "true" against undefined → another fail-open path:
    expect(evaluateConditions([{ field: 'ghost', op: 'not_equals', value: 'with_you' }], missing)).toBe(true);
  });

  // PROBE-E: overlapping same-priority endings resolve by ARRAY ORDER (positional, silent).
  // Documents the tie-break: lint only WARNS (OVERLAPPING_ENDINGS), and the array-first wins.
  it('PROBE-E: two satisfiable same-priority endings resolve to the array-first; lint only warns', () => {
    const story: Story = {
      id: 'probe_overlap',
      title: 'Overlap',
      startNodeId: 'n0',
      startTime: '08:00',
      deadline: '08:10',
      startLocation: 'loc_a',
      variables: [{ name: 'flag', type: 'boolean', default: true, purpose: 'both endings read it' }],
      locations: [{ id: 'loc_a', name: 'A' }],
      events: [],
      nodes: [
        { id: 'n0', title: 'start', body: '', choices: [{ id: 'c_go', label: 'go', destination: 'n_end', effects: [{ field: 'time', op: 'add_minutes', value: '10' }] }] },
        { id: 'n_end', title: 'end', body: '', choices: [], resolvesEnding: true },
      ],
      endings: [
        { id: 'e_default', name: 'Default', conditions: [], summary: '', isDefault: true },
        { id: 'e_first', name: 'First', conditions: [{ field: 'flag', op: 'is_true' }], summary: '', priority: 0 },
        { id: 'e_second', name: 'Second', conditions: [{ field: 'flag', op: 'is_true' }], summary: '', priority: 0 },
      ],
    };
    const lint = lintStory(story);
    expect(lint.errors).toEqual([]); // overlap is NOT an error...
    expect(lint.warnings.some((w) => w.code === 'OVERLAPPING_ENDINGS')).toBe(true); // ...only a warning

    const eng = new GameEngine(story);
    eng.start();
    const end = eng.choose('c_go');
    expect(end.endingReached?.id).toBe('e_first'); // array order decides the tie, silently
  });
});
