import type { Story, Profile, LintIssue, Condition, Effect } from './types';
import { parseTime } from './time';
import { readsClock } from './profile';

const issue = (level: 'error' | 'warning', code: string, message: string, where?: string): LintIssue =>
  ({ level, code, message, where });

/** A keyed numeric var is bounded above iff it has a max (resource or VariableDef.max); below iff it has a min. */
function boundsOf(story: Story): Map<string, { min?: number; max?: number }> {
  const m = new Map<string, { min?: number; max?: number }>();
  for (const v of story.variables) m.set(v.name, { min: v.min, max: v.max });
  for (const r of story.resources ?? []) m.set(r.id, { min: r.min, max: r.max });
  return m;
}

// num() mirrors effects.ts: increment adds +num(value), decrement adds -num(value). A write farms unboundedly
// when it grows a keyed numeric var in a direction with no bound. Sign-aware: a negative-literal increment grows
// DOWN (needs a min), a negative-literal decrement grows UP (needs a max).
function num(v: string | undefined): number {
  if (v === undefined) return 1; // increment/decrement default step is 1
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function unboundedWrites(story: Story): LintIssue[] {
  const out: LintIssue[] = [];
  const bounds = boundsOf(story);
  const scan = (es: Effect[] | undefined, where: string) => {
    for (const e of es ?? []) {
      if (e.op === 'adjust_resource') {
        out.push(issue('error', 'ROAM_UNBOUNDED_HUB_WRITE',
          `adjust_resource on '${e.field}' is roam-reachable: its '__roff_' offset is unclamped and keyed, farming infinite states under roam — not allowed in a roam game`, where));
        continue;
      }
      if (e.op !== 'increment' && e.op !== 'decrement') continue;
      const delta = e.op === 'increment' ? num(e.value) : -num(e.value);
      if (delta === 0) continue; // no growth
      const b = bounds.get(e.field);
      const grows = delta > 0 ? 'up' : 'down';
      const needed = delta > 0 ? b?.max : b?.min;
      if (needed === undefined) {
        out.push(issue('error', 'ROAM_UNBOUNDED_HUB_WRITE',
          `${e.op} of '${e.field}' (grows ${grows}) has no ${delta > 0 ? 'max' : 'min'} bound — under roam it farms infinite keyed states; declare a ${delta > 0 ? 'max' : 'min'}`, where));
      }
    }
  };
  for (const n of story.nodes) {
    scan(n.entryEffects, `node ${n.id}`);
    for (const c of n.choices ?? []) scan(c.effects, `choice ${c.id}`);
  }
  for (const ev of story.events) scan(ev.ifAbsentEffects, `event ${ev.id}`);
  return out;
}

export function lintTravel(story: Story, profile: Profile): LintIssue[] {
  const out: LintIssue[] = [];
  const locById = new Map(story.locations.map((l) => [l.id, l]));
  const declaresGraph = story.locations.some((l) => (l.connectedLocations?.length ?? 0) > 0);

  if (profile.travel !== 'free') {
    if (declaresGraph) out.push(issue('warning', 'TRAVEL_GRAPH_IGNORED',
      `connectedLocations are declared but travel:'off' — the roam graph is inert (forgotten toggle?)`));
    return out;
  }

  for (const loc of story.locations) {
    for (const dest of loc.connectedLocations ?? []) {
      const d = locById.get(dest);
      if (!d) { out.push(issue('error', 'TRAVEL_UNKNOWN_LOCATION', `Location ${loc.id} connects to unknown location '${dest}'`, loc.id)); continue; }
      if (!d.defaultNode) out.push(issue('error', 'TRAVEL_NO_HUB', `Travel-reachable location ${dest} has no defaultNode (you could arrive nowhere)`, dest));
      if (loc.travelTimes?.[dest] === undefined) out.push(issue('error', 'TRAVEL_MISSING_TIME', `Connection ${loc.id} -> ${dest} has no travelTimes entry`, loc.id));
      if (!(d.connectedLocations ?? []).includes(loc.id)) out.push(issue('warning', 'TRAVEL_ASYMMETRIC_EDGE', `${loc.id} connects to ${dest} but ${dest} does not connect back (roam graph should be symmetric; use authored change_location for one-way)`, loc.id));
    }
    if (loc.defaultNode) {
      const hub = story.nodes.find((n) => n.id === loc.defaultNode);
      if (hub && (hub.resolvesEnding || hub.endsWith)) out.push(issue('warning', 'TRAVEL_HUB_IS_TERMINAL', `Location ${loc.id}'s hub '${loc.defaultNode}' resolves an ending — arriving there ends the game on contact`, loc.id));
    }
  }

  out.push(...unboundedWrites(story));
  return out;
}

/** The time thresholds (absolute minutes) a timed-roam bucket must evenly divide. Depletion boundaries are
 *  subsumed (depleted values are keyed raw), so they are NOT included. */
export function roamTimeThresholds(story: Story): number[] {
  const set = new Set<number>();
  const litMinutes = (c: Condition): number[] => {
    if (!c.value) return [];
    if (c.op === 'time_between') return c.value.split('-').map((s) => parseTime(s.trim()));
    if (c.op.startsWith('time_')) return [parseTime(c.value)];
    return [Number(c.value)]; // value-op on field:'time' → absolute minutes
  };
  const scan = (cs: Condition[] | undefined) => { for (const c of cs ?? []) if (readsClock(c)) for (const m of litMinutes(c)) if (Number.isFinite(m)) set.add(m); };
  for (const n of story.nodes) for (const c of n.choices ?? []) scan(c.conditions);
  for (const en of story.endings) scan(en.conditions);
  for (const ev of story.events) scan(ev.trigger); // readsClock-gated — a non-time numeric trigger must NOT inject a spurious threshold
  if (story.deadline !== undefined) set.add(parseTime(story.deadline));
  return [...set];
}

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }

/** ROAM_BUCKET_MISALIGNED — run at the verification boundary with the bucket the walker will use. */
export function checkBucketAlignment(story: Story, bucket: number): LintIssue[] {
  const thresholds = roamTimeThresholds(story).filter((t) => t > 0);
  const bad = thresholds.filter((t) => t % bucket !== 0);
  if (bad.length === 0) return [];
  const suggested = thresholds.reduce((a, b) => gcd(a, b));
  return [issue('error', 'ROAM_BUCKET_MISALIGNED',
    `timeBucket ${bucket} does not divide time threshold(s) [${bad.sort((a, b) => a - b).join(', ')}] — bucketing would merge open/closed variants of a time-gated choice. Use a bucket that divides them (e.g. ${suggested}).`)];
}
