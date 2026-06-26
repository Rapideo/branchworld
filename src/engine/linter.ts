import type { Story, Choice, Condition, Effect, LintResult, LintIssue } from './types';
import { parseTime } from './time';
import { collectSymbols } from './symbols';
import type { StorySymbols } from './symbols';
import { coerce } from './conditions';

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
    const eqs = cs.filter((c) => c.op === 'equals').map((c) => coerce(c.value));
    if (new Set(eqs).size > 1) return true; // two equals requiring different runtime values
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
  // resource ids are valid effect/condition targets — add them so checkConds/checkEffs don't UNDEFINED_VAR them
  for (const r of story.resources ?? []) varNames.add(r.id);
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
    if (n.resolvesEnding || n.endsWith) continue; // an endsWith node resolves (F3), so it needs no choices
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

  // TYPE_MISMATCH — numeric ops on non-number-typed variables or non-numeric literals
  const varType = new Map(story.variables.map((v) => [v.name, v.type]));
  const NUMERIC_OPS = new Set(['gt', 'gte', 'lt', 'lte']);
  const checkCondTypes = (cs: Condition[] | undefined, where: string) => {
    for (const c of cs || []) {
      const t = varType.get(c.field);
      if (!t) continue; // undefined-var already reported; reserved fields (no entry in map) skip
      if (NUMERIC_OPS.has(c.op)) {
        if (t !== 'number') err('TYPE_MISMATCH', `${c.op} on non-number variable '${c.field}' (declared ${t})`, where);
        else if (c.value != null && !/^-?\d+(\.\d+)?$/.test(c.value))
          err('TYPE_MISMATCH', `${c.op} on '${c.field}' compares against non-numeric literal '${c.value}'`, where);
      }
    }
  };
  for (const n of story.nodes) {
    checkCondTypes(n.conditions, n.id);
    for (const c of n.choices || []) checkCondTypes(c.conditions, c.id);
  }
  for (const ev of story.events) checkCondTypes(ev.trigger, ev.id);
  for (const en of story.endings) checkCondTypes(en.conditions, en.id);

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

  // NEGATIVE_TIME_DELTA — time is monotonic; add_minutes may never rewind the clock (H2)
  const checkTimeDeltas = (es: Effect[] | undefined, where: string) => {
    for (const e of es || []) {
      if (e.op !== 'add_minutes') continue;
      const n = Number(e.value);
      if (Number.isFinite(n) && n < 0) {
        err('NEGATIVE_TIME_DELTA',
          `add_minutes delta '${e.value}' is negative; time is monotonic and may not rewind`, where);
      }
    }
  };
  for (const n of story.nodes) {
    checkTimeDeltas(n.entryEffects, n.id);
    for (const c of n.choices || []) checkTimeDeltas(c.effects, `${n.id}:${c.id}`);
  }
  for (const ev of story.events) checkTimeDeltas(ev.ifAbsentEffects, ev.id);

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

  // A3 — node-named endings (F8) + the out-of-time ending (H4) must reference real endings
  for (const n of story.nodes) {
    if (n.endsWith && !endingIds.has(n.endsWith)) {
      err('NODE_ENDING_MISSING', `Node ${n.id} endsWith '${n.endsWith}' which is not a defined ending`, n.id);
    }
  }
  if (story.outOfTimeEndingId && !endingIds.has(story.outOfTimeEndingId)) {
    err('OUT_OF_TIME_ENDING_MISSING', `outOfTimeEndingId '${story.outOfTimeEndingId}' is not a defined ending`);
  }

  // overlap/shadow warnings — warn when we cannot prove two non-default endings are mutually exclusive
  const nonDefault = story.endings.filter((e) => !e.isDefault);
  for (let i = 0; i < nonDefault.length; i++) {
    for (let j = i + 1; j < nonDefault.length; j++) {
      const a = nonDefault[i], b = nonDefault[j];
      if (!contradicts([...(a.conditions ?? []), ...(b.conditions ?? [])])) {
        const aPri = a.priority ?? 0, bPri = b.priority ?? 0;
        if (aPri === bPri) {
          warn('OVERLAPPING_ENDINGS',
            `Endings '${a.id}' and '${b.id}' can both be satisfied and share priority ${aPri}; ` +
            `resolution falls back to array order. Set distinct priorities to make intent explicit.`, a.id);
        }
      }
    }
  }

  // scheduled event integrity
  for (const ev of story.events) {
    if (!nodeIds.has(ev.ifPresentNode)) err('EVENT_PRESENT_NODE_MISSING', `Event ${ev.id} ifPresentNode ${ev.ifPresentNode} missing`, ev.id);
    if (!nodeIds.has(ev.recoveryNodeId)) err('EVENT_RECOVERY_MISSING', `Event ${ev.id} recoveryNodeId ${ev.recoveryNodeId} missing`, ev.id);
    else if (!reachable.has(ev.recoveryNodeId)) err('EVENT_RECOVERY_UNREACHABLE', `Event ${ev.id} recovery node ${ev.recoveryNodeId} is unreachable by navigation`, ev.id);
    if ((ev.ifAbsentEffects?.length ?? 0) === 0) err('EVENT_NO_ABSENT', `Event ${ev.id} has no if-absent effects`, ev.id);
    if ((ev.trigger?.length ?? 0) === 0) err('EVENT_NO_TRIGGER', `Event ${ev.id} has no trigger`, ev.id);
  }

  // time-literal range: every time_* condition/trigger value must sit in [startTime, deadline]
  const startMin = parseTime(story.startTime);
  const deadlineMin = parseTime(story.deadline);
  const checkTimeLiterals = (cs: Condition[] | undefined, where: string) => {
    for (const c of cs || []) {
      if (!c.op.startsWith('time_') || !c.value) continue;
      const lits = c.op === 'time_between' ? c.value.split('-') : [c.value];
      for (const lit of lits) {
        const t = parseTime(lit.trim());
        if (t < startMin || t > deadlineMin) {
          err('TIME_LITERAL_OUT_OF_RANGE',
            `Time literal ${lit} (=${t}m) in ${c.op} is outside the story window [${story.startTime}, ${story.deadline}]. ` +
            `Use absolute minutes past midnight for after-midnight times (e.g. '26:10').`, where);
        }
      }
    }
  };
  for (const n of story.nodes) {
    checkTimeLiterals(n.conditions, n.id);
    for (const c of n.choices || []) checkTimeLiterals(c.conditions, c.id);
  }
  for (const ev of story.events) checkTimeLiterals(ev.trigger, ev.id);
  for (const en of story.endings) checkTimeLiterals(en.conditions, en.id);

  // deadline reachability
  const window = parseTime(story.deadline) - parseTime(story.startTime);
  const { maxTime, minTime } = timeBounds(story);
  if (maxTime < window) {
    err('CLOCK_CANNOT_BITE', `Longest reachable path accumulates ${maxTime} min but the deadline window is ${window} min — the clock can never run out`);
  }
  if (minTime > window) {
    err('DEADLINE_UNWINNABLE', `Shortest reachable path (${minTime} min) already exceeds the deadline window (${window} min)`);
  }

  for (const issue of lintResources(story)) {
    if (issue.level === 'error') errors.push(issue);
    else warnings.push(issue);
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function lintResources(story: Story): LintIssue[] {
  const issues: LintIssue[] = [];
  const resources = story.resources ?? [];
  const varNames = new Set(story.variables.map((v) => v.name));
  const endingIds = new Set(story.endings.map((e) => e.id));
  const timeDriven = new Set(resources.filter((r) => r.depletion).map((r) => r.id));

  for (const r of resources) {
    if (r.min >= r.max) {
      issues.push({ level: 'error', code: 'RESOURCE_BAD_RANGE', message: `Resource ${r.id}: min (${r.min}) must be < max (${r.max})`, where: r.id });
    }
    if (r.start < r.min || r.start > r.max) {
      issues.push({ level: 'error', code: 'RESOURCE_START_OUT_OF_RANGE', message: `Resource ${r.id}: start ${r.start} is outside [${r.min}, ${r.max}]`, where: r.id });
    }
    if (r.depletion && (r.depletion.everyMinutes <= 0 || r.depletion.amount <= 0)) {
      issues.push({ level: 'error', code: 'RESOURCE_BAD_DEPLETION', message: `Resource ${r.id}: depletion everyMinutes/amount must be > 0`, where: r.id });
    }
    if (varNames.has(r.id)) {
      issues.push({ level: 'error', code: 'RESOURCE_ID_COLLISION', message: `Resource ${r.id} collides with a declared variable name`, where: r.id });
    }
    if (r.atZero?.ending && !endingIds.has(r.atZero.ending)) {
      issues.push({ level: 'error', code: 'RESOURCE_ATZERO_ENDING_MISSING', message: `Resource ${r.id}: at-zero ending ${r.atZero.ending} does not exist`, where: r.id });
    }
    if (r.atZero?.setFlag && !varNames.has(r.atZero.setFlag)) {
      issues.push({ level: 'error', code: 'RESOURCE_ATZERO_FLAG_UNDECLARED', message: `Resource ${r.id}: at-zero flag ${r.atZero.setFlag} is not a declared variable`, where: r.id });
    }
  }

  // bounds map for the out-of-range warning (variables + resources)
  const boundOf: Record<string, { min?: number; max?: number }> = {};
  for (const v of story.variables) if (v.min !== undefined || v.max !== undefined) boundOf[v.name] = { min: v.min, max: v.max };
  for (const r of resources) boundOf[r.id] = { min: r.min, max: r.max };

  const scanEffects = (effects: { field: string; op: string; value?: string }[] | undefined, where: string) => {
    for (const e of effects ?? []) {
      if (timeDriven.has(e.field) && (e.op === 'set' || e.op === 'increment' || e.op === 'decrement')) {
        issues.push({ level: 'error', code: 'RESOURCE_TIME_DRIVEN_WRITTEN', message: `Effect writes time-driven resource ${e.field} (it is recomputed from the clock)`, where });
      }
      if (e.op === 'set' && boundOf[e.field] && e.value !== undefined && /^-?\d+(\.\d+)?$/.test(e.value)) {
        const n = Number(e.value);
        const b = boundOf[e.field];
        if ((b.min !== undefined && n < b.min) || (b.max !== undefined && n > b.max)) {
          issues.push({ level: 'warning', code: 'VALUE_OUT_OF_BOUND', message: `set ${e.field}=${n} is outside its bound [${b.min ?? '-inf'}, ${b.max ?? 'inf'}] (will be clamped)`, where });
        }
      }
    }
  };
  for (const n of story.nodes) {
    scanEffects(n.entryEffects, n.id);
    for (const c of n.choices ?? []) scanEffects(c.effects, `${n.id}:${c.id}`);
  }
  for (const ev of story.events) scanEffects(ev.ifAbsentEffects, ev.id);

  // ATZERO_PRIORITY_DOMINANCE (F2) — post-A3 the atZero ending competes by priority instead of
  // short-circuiting, so a resource death is honest only if it strictly out-ranks every non-default ending it
  // can co-occur with. Enforce that here (the firing state includes the atZero setFlag, so a death-guarded
  // ending is provably exclusive). Zero-FP: only fires when co-occurrence is NOT provably contradictory.
  const endingsById = new Map(story.endings.map((e) => [e.id, e]));
  const nonDefaultEndings = story.endings.filter((e) => !e.isDefault);
  for (const r of resources) {
    const death = r.atZero?.ending ? endingsById.get(r.atZero.ending) : undefined;
    if (!death || death.isDefault) continue;
    const deathConds: Condition[] = [...(death.conditions ?? [])];
    if (r.atZero?.setFlag) deathConds.push({ field: r.atZero.setFlag, op: 'is_true' });
    for (const o of nonDefaultEndings) {
      if (o.id === death.id) continue;
      if (contradicts([...deathConds, ...(o.conditions ?? [])])) continue; // provably cannot co-occur
      if ((death.priority ?? 0) <= (o.priority ?? 0)) {
        issues.push({ level: 'error', code: 'ATZERO_PRIORITY_DOMINANCE',
          message: `Resource ${r.id} death ending '${death.id}' (priority ${death.priority ?? 0}) does not out-rank co-occurring ending '${o.id}' (priority ${o.priority ?? 0}); a resource death could be masked — raise '${death.id}' priority or make the two endings mutually exclusive`,
          where: death.id });
      }
    }
  }

  return issues;
}
