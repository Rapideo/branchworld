import type { Story, Choice, Condition, Effect, LintResult, LintIssue } from './types';
import { parseTime } from './time';
import { collectSymbols } from './symbols';
import type { StorySymbols } from './symbols';

const RESERVED_FIELDS = new Set(['time', 'location']);
const NON_VAR_EFFECT_OPS = new Set<Effect['op']>([
  'add_clue', 'remove_clue', 'add_item', 'remove_item',
  'change_location', 'add_minutes', 'mark_event_completed', 'mark_visited',
]);

// Sound contradiction detector over an AND-list (returns true only for definite contradictions).
// Exported so Task 4 can reuse it for ending-overlap checks.
export function contradicts(conds: Condition[]): boolean {
  const byField = new Map<string, Condition[]>();
  for (const c of conds) {
    const a = byField.get(c.field) ?? [];
    a.push(c);
    byField.set(c.field, a);
  }
  for (const [, cs] of byField) {
    const hasTrue = cs.some((c) => c.op === 'is_true');
    const hasFalse = cs.some((c) => c.op === 'is_false');
    if (hasTrue && hasFalse) return true;
    const eqs = cs.filter((c) => c.op === 'equals').map((c) => c.value);
    if (new Set(eqs).size > 1) return true; // equals A and equals B, A !== B
    // numeric range emptiness: gte/gt lower vs lte/lt upper
    const lowers = cs.filter((c) => c.op === 'gte' || c.op === 'gt').map((c) => Number(c.value));
    const uppers = cs.filter((c) => c.op === 'lte' || c.op === 'lt').map((c) => Number(c.value));
    if (lowers.length && uppers.length && Math.max(...lowers) > Math.min(...uppers)) return true;
  }
  return false;
}

// A choice is statically dead only when we can PROVE no reachable state satisfies it.
// Sound: when unsure, returns false. Zero false positives is the hard requirement.
export function staticallyDeadChoice(c: Choice, story: Story, sym: StorySymbols): boolean {
  const conds = c.conditions ?? [];
  if (conds.length === 0) return false; // unconditional choice is always live
  // (1) internal contradiction within this choice's own AND-list
  if (contradicts(conds)) return true;
  // (2) requires a clue nothing can produce, OR a var nothing can make truthy
  for (const k of conds) {
    if (k.op === 'has_clue' && !sym.producibleClues.has(k.value ?? k.field)) return true;
    if (k.op === 'is_true' && story.variables.some((v) => v.name === k.field) && !sym.canBecomeTruthy.has(k.field)) return true;
  }
  return false;
}

function choiceMinutes(c: Choice): number {
  return (c.effects || [])
    .filter((e) => e.op === 'add_minutes')
    .reduce((a, e) => a + Number(e.value ?? 0), 0);
}

function computeReachable(story: Story): Set<string> {
  const out = new Set<string>();
  const stack: string[] = [story.startNodeId];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    const n = story.nodes.find((x) => x.id === id);
    if (!n) continue;
    out.add(id);
    for (const c of n.choices || []) stack.push(c.destination);
  }
  return out;
}

function timeBounds(story: Story): { maxTime: number; minTime: number } {
  const byId = new Map(story.nodes.map((n) => [n.id, n]));
  let maxTime = 0;
  let minTime = Infinity;
  const dfs = (id: string, acc: number, path: Set<string>): void => {
    const n = byId.get(id);
    if (!n || n.resolvesEnding || (n.choices?.length ?? 0) === 0 || path.has(id)) {
      maxTime = Math.max(maxTime, acc);
      minTime = Math.min(minTime, acc);
      return;
    }
    const np = new Set(path);
    np.add(id);
    for (const c of n.choices) {
      dfs(c.destination, acc + choiceMinutes(c), np);
    }
  };
  dfs(story.startNodeId, 0, new Set());
  if (minTime === Infinity) minTime = 0;
  return { maxTime, minTime };
}

export function lintStory(story: Story): LintResult {
  const errors: LintIssue[] = [];
  const warnings: LintIssue[] = [];
  const err = (code: string, message: string, where?: string) =>
    errors.push({ level: 'error', code, message, where });
  const warn = (code: string, message: string, where?: string) =>
    warnings.push({ level: 'warning', code, message, where });

  const nodeIds = new Set(story.nodes.map((n) => n.id));
  const endingIds = new Set(story.endings.map((e) => e.id));
  const varNames = new Set(story.variables.map((v) => v.name));
  const sym = collectSymbols(story);

  // duplicate node ids
  const seen = new Set<string>();
  for (const n of story.nodes) {
    if (seen.has(n.id)) err('DUPLICATE_NODE_ID', `Duplicate node id: ${n.id}`, n.id);
    seen.add(n.id);
  }

  // links + choice-targets-ending
  for (const n of story.nodes) {
    for (const c of n.choices || []) {
      if (endingIds.has(c.destination)) {
        err('CHOICE_TARGETS_ENDING', `Choice ${c.id} targets ending ${c.destination}; endings resolve from state`, n.id);
      } else if (!nodeIds.has(c.destination)) {
        err('BROKEN_LINK', `Choice ${c.id} -> missing node ${c.destination}`, n.id);
      }
    }
  }

  // no-exit nodes + soft-lock detection
  for (const n of story.nodes) {
    if (n.resolvesEnding) continue;
    const choices = n.choices ?? [];
    if (choices.length === 0) {
      err('NO_EXIT', `Node ${n.id} has no choices and does not resolve an ending`, n.id);
      continue;
    }
    if (choices.every((c) => staticallyDeadChoice(c, story, sym))) {
      err('SOFT_LOCK', `Node ${n.id} has no escapable exit — every choice is permanently locked`, n.id);
    }
  }

  // undefined variables
  const checkConds = (cs: Condition[] | undefined, where: string) => {
    for (const c of cs || []) {
      if (RESERVED_FIELDS.has(c.field)) continue;
      if (c.op === 'has_clue') {
        const clue = c.value ?? c.field;
        if (!sym.producibleClues.has(clue)) err('DEAD_CLUE_REFERENCE',
          `Condition requires clue '${clue}' that no add_clue effect can produce`, where);
        continue;
      }
      if (c.op === 'has_visited' || c.op.startsWith('time_')) continue;
      if (!varNames.has(c.field)) err('UNDEFINED_VAR', `Condition references undefined variable: ${c.field}`, where);
    }
  };
  const checkEffs = (es: Effect[] | undefined, where: string) => {
    for (const e of es || []) {
      if (NON_VAR_EFFECT_OPS.has(e.op)) continue;
      if (!varNames.has(e.field)) err('UNDEFINED_VAR', `Effect references undefined variable: ${e.field}`, where);
    }
  };
  for (const n of story.nodes) {
    checkConds(n.conditions, n.id);
    checkEffs(n.entryEffects, n.id);
    for (const c of n.choices || []) {
      checkConds(c.conditions, c.id);
      checkEffs(c.effects, c.id);
    }
  }
  for (const ev of story.events) {
    checkConds(ev.trigger, ev.id);
    checkEffs(ev.ifAbsentEffects, ev.id);
  }
  for (const en of story.endings) checkConds(en.conditions, en.id);

  // UNDEFINED_LOCATION — change_location effects and eventLocation fields
  const checkLocations = (es: Effect[] | undefined, where: string) => {
    for (const e of es || []) {
      if (e.op === 'change_location' && e.value && !sym.locationIds.has(e.value)) {
        err('UNDEFINED_LOCATION', `Effect sets location to undefined id: ${e.value}`, where);
      }
    }
  };
  for (const n of story.nodes) {
    checkLocations(n.entryEffects, n.id);
    for (const c of n.choices || []) checkLocations(c.effects, c.id);
  }
  for (const ev of story.events) {
    if (!sym.locationIds.has(ev.eventLocation)) {
      err('UNDEFINED_LOCATION', `Event ${ev.id} eventLocation ${ev.eventLocation} is not a defined location`, ev.id);
    }
  }
  if (!sym.locationIds.has(story.startLocation)) {
    err('UNDEFINED_LOCATION', `startLocation ${story.startLocation} is not a defined location`);
  }

  // reachability
  const reachable = computeReachable(story);
  const presentNodes = new Set(story.events.map((e) => e.ifPresentNode));
  for (const n of story.nodes) {
    if (!reachable.has(n.id) && !presentNodes.has(n.id)) {
      warn('UNREACHABLE_NODE', `Node ${n.id} is unreachable from start`, n.id);
    }
  }

  // default ending integrity
  const defaults = story.endings.filter((e) => e.isDefault);
  if (defaults.length === 0) err('NO_DEFAULT_ENDING', 'No default (catch-all) ending; some end-states could match zero endings');
  if (defaults.length > 1) err('MULTIPLE_DEFAULT_ENDINGS', 'More than one default ending');
  if (defaults.length === 1 && (defaults[0].conditions?.length ?? 0) > 0) {
    err('DEFAULT_HAS_CONDITIONS', 'Default ending must have no conditions');
  }

  // scheduled event integrity
  for (const ev of story.events) {
    if (!nodeIds.has(ev.ifPresentNode)) err('EVENT_PRESENT_NODE_MISSING', `Event ${ev.id} ifPresentNode ${ev.ifPresentNode} missing`, ev.id);
    if (!nodeIds.has(ev.recoveryNodeId)) err('EVENT_RECOVERY_MISSING', `Event ${ev.id} recoveryNodeId ${ev.recoveryNodeId} missing`, ev.id);
    else if (!reachable.has(ev.recoveryNodeId)) err('EVENT_RECOVERY_UNREACHABLE', `Event ${ev.id} recovery node ${ev.recoveryNodeId} is unreachable by navigation`, ev.id);
    if ((ev.ifAbsentEffects?.length ?? 0) === 0) err('EVENT_NO_ABSENT', `Event ${ev.id} has no if-absent effects`, ev.id);
    if ((ev.trigger?.length ?? 0) === 0) err('EVENT_NO_TRIGGER', `Event ${ev.id} has no trigger`, ev.id);
  }

  // deadline reachability
  const window = parseTime(story.deadline) - parseTime(story.startTime);
  const { maxTime, minTime } = timeBounds(story);
  if (maxTime < window) {
    err('CLOCK_CANNOT_BITE', `Longest reachable path accumulates ${maxTime} min but the deadline window is ${window} min — the clock can never run out`);
  }
  if (minTime > window) {
    warn('POSSIBLY_UNWINNABLE', `Shortest reachable path (${minTime} min) already exceeds the deadline window (${window} min)`);
  }

  return { ok: errors.length === 0, errors, warnings };
}
