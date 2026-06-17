import type { Story, Choice, Condition, Effect, LintResult, LintIssue } from './types';
import { parseTime } from './time';

const RESERVED_FIELDS = new Set(['time', 'location']);
const NON_VAR_EFFECT_OPS = new Set<Effect['op']>([
  'add_clue', 'remove_clue', 'add_item', 'remove_item',
  'change_location', 'add_minutes', 'mark_event_completed', 'mark_visited',
]);

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

  // no-exit nodes
  for (const n of story.nodes) {
    if ((n.choices?.length ?? 0) === 0 && !n.resolvesEnding) {
      err('NO_EXIT', `Node ${n.id} has no choices and does not resolve an ending`, n.id);
    }
  }

  // undefined variables
  const checkConds = (cs: Condition[] | undefined, where: string) => {
    for (const c of cs || []) {
      if (RESERVED_FIELDS.has(c.field)) continue;
      if (c.op === 'has_clue' || c.op === 'has_visited' || c.op.startsWith('time_')) continue;
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
