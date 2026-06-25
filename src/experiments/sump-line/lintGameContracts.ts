/**
 * A1 — the cross-chapter contract + latch linter (container layer; ZERO engine changes).
 *
 * `lintGame` checks transitions + per-chapter `lintStory`, but nothing compares what one chapter
 * WRITES against what another READS. With `carry: { vars: 'all' }`, a latch a downstream chapter
 * declares-and-reads but an upstream rename left unwritten silently stays at its default — and the
 * engine's fail-open coercion (`is_false`/`not_equals` on it -> true) opens the gate with no error.
 * This module derives the cross-chapter "State Ledger" and lints the contract.
 *
 * v1 (this file): four decidable, zero-false-positive checks + the derived ledger.
 *   CONTRACT_TYPE_MISMATCH      (error)   one var declared with different `type` across chapters
 *   CONTRACT_READ_NO_PRODUCER   (error)   a var is read but written by NO chapter -> constant/dead gate
 *   CONTRACT_DOMAIN_DRIFT       (warning) a string var compared against a literal nothing ever sets
 *   LATCH_IN_CHOICE_EFFECT      (warning) an ending-read latch set in a choice effect, not an entryEffect
 * Deferred to v1.1: ancestor-aware READ_NO_ANCESTOR_PRODUCER (precise rename-catcher) + MUTEX_LATCH groups.
 *
 * See docs/a1-contract-linter-design.md.
 */
import type { Story, Condition, Effect, LintIssue, Primitive } from '../../engine';
import type { Game } from './types';

const VAR_READ_OPS = new Set(['equals', 'not_equals', 'gt', 'gte', 'lt', 'lte', 'is_true', 'is_false']);
const EQUALITY_OPS = new Set(['equals', 'not_equals']);
const WRITE_OPS = new Set(['set', 'increment', 'decrement']);
const RESERVED = new Set(['time', 'location']);

export type WriteLocation = 'entry' | 'choice' | 'event' | 'atZero';

export interface LedgerEntry {
  name: string;
  kind: 'var' | 'resource';
  types: string[]; // distinct declared types (vars)
  defaults: string[]; // distinct declared defaults, stringified
  declaredIn: string[];
  writtenIn: string[];
  readIn: string[];
  isLatch: boolean; // read by an ending condition
  writtenValues: string[]; // string literals assigned via `set`
  comparedValues: string[]; // string literals compared via equals/not_equals
  writeLocations: WriteLocation[];
}

interface Acc {
  kind: 'var' | 'resource';
  types: Set<string>;
  defaults: Set<string>;
  declaredIn: Set<string>;
  writtenIn: Set<string>;
  readIn: Set<string>;
  isLatch: boolean;
  writtenValues: Set<string>;
  comparedValues: Set<string>;
  writeLocations: Set<WriteLocation>;
}

function uniqSorted(s: Set<string>): string[] {
  return [...s].sort();
}

export function deriveLedger(game: Game): LedgerEntry[] {
  // Pass 0: every field that any chapter declares as a resource is a resource game-wide.
  const resourceIds = new Set<string>();
  for (const ch of game.chapters) for (const r of ch.story.resources ?? []) resourceIds.add(r.id);

  const map = new Map<string, Acc>();
  const ensure = (name: string): Acc => {
    let a = map.get(name);
    if (!a) {
      a = {
        kind: resourceIds.has(name) ? 'resource' : 'var',
        types: new Set(), defaults: new Set(), declaredIn: new Set(), writtenIn: new Set(),
        readIn: new Set(), isLatch: false, writtenValues: new Set(), comparedValues: new Set(),
        writeLocations: new Set(),
      };
      map.set(name, a);
    }
    return a;
  };

  const reads = (conds: Condition[] | undefined, chId: string, isEnding: boolean) => {
    for (const c of conds ?? []) {
      if (!VAR_READ_OPS.has(c.op) || RESERVED.has(c.field)) continue;
      const a = ensure(c.field);
      a.readIn.add(chId);
      if (isEnding) a.isLatch = true;
      if (EQUALITY_OPS.has(c.op) && c.value != null) a.comparedValues.add(c.value);
    }
  };
  const writes = (effects: Effect[] | undefined, chId: string, where: WriteLocation) => {
    for (const e of effects ?? []) {
      if (!WRITE_OPS.has(e.op)) continue;
      const a = ensure(e.field);
      a.writtenIn.add(chId);
      a.writeLocations.add(where);
      if (e.op === 'set' && e.value != null) a.writtenValues.add(e.value);
    }
  };

  for (const ch of game.chapters) {
    const story: Story = ch.story;
    for (const v of story.variables) {
      const a = ensure(v.name);
      a.declaredIn.add(ch.id);
      if (v.type) a.types.add(v.type);
      a.defaults.add(String(v.default));
    }
    for (const r of story.resources ?? []) {
      ensure(r.id).declaredIn.add(ch.id);
      if (r.atZero?.setFlag) writes([{ field: r.atZero.setFlag, op: 'set', value: 'true' }], ch.id, 'atZero');
    }
    for (const n of story.nodes) {
      reads(n.conditions, ch.id, false);
      writes(n.entryEffects, ch.id, 'entry');
      for (const c of n.choices ?? []) {
        reads(c.conditions, ch.id, false);
        writes(c.effects, ch.id, 'choice');
      }
    }
    for (const ev of story.events) {
      reads(ev.trigger, ch.id, false);
      writes(ev.ifAbsentEffects, ch.id, 'event');
    }
    for (const en of story.endings) reads(en.conditions, ch.id, true);
    // game-level transitions out of this chapter read vars too (e.g. cave_route)
    for (const t of ch.transitions) reads(t.when.conditions, ch.id, false);
  }

  return [...map.entries()]
    .map(([name, a]): LedgerEntry => ({
      name,
      kind: a.kind,
      types: uniqSorted(a.types),
      defaults: uniqSorted(a.defaults),
      declaredIn: uniqSorted(a.declaredIn),
      writtenIn: uniqSorted(a.writtenIn),
      readIn: uniqSorted(a.readIn),
      isLatch: a.isLatch,
      writtenValues: uniqSorted(a.writtenValues),
      comparedValues: uniqSorted(a.comparedValues),
      writeLocations: [...a.writeLocations].sort() as WriteLocation[],
    }))
    .sort((x, y) => x.name.localeCompare(y.name));
}

export interface ContractLintResult {
  ok: boolean;
  errors: LintIssue[];
  warnings: LintIssue[];
  ledger: LedgerEntry[];
}

export function lintGameContracts(game: Game): ContractLintResult {
  const ledger = deriveLedger(game);
  const errors: LintIssue[] = [];
  const warnings: LintIssue[] = [];
  const err = (code: string, message: string, where?: string) => errors.push({ level: 'error', code, message, where });
  const warn = (code: string, message: string, where?: string) => warnings.push({ level: 'warning', code, message, where });

  // resources carried across the game by id; the resource system always "produces" them.
  const carriedResources = new Set(game.carry?.resources ?? []);

  for (const e of ledger) {
    // CONTRACT_TYPE_MISMATCH — one carried var declared with conflicting types
    if (e.kind === 'var' && e.types.length > 1) {
      err('CONTRACT_TYPE_MISMATCH',
        `'${e.name}' is declared with conflicting types [${e.types.join(', ')}] across chapters [${e.declaredIn.join(', ')}] — a carried value will be read with the wrong type semantics`,
        e.declaredIn.join(','));
    }

    // CONTRACT_READ_NO_PRODUCER — a var is read but no chapter ever writes it => permanently its default
    if (e.kind === 'var' && e.readIn.length > 0 && e.writtenIn.length === 0) {
      err('CONTRACT_READ_NO_PRODUCER',
        `'${e.name}' is read in [${e.readIn.join(', ')}] but written by no chapter — it is always its default, so the gate is constant (silent drift or dead logic)`,
        e.readIn[0]);
    }

    // CONTRACT_DOMAIN_DRIFT — a string var compared against a literal nothing ever sets (and not its default)
    if (e.kind === 'var' && e.types.includes('string')) {
      const legal = new Set([...e.writtenValues, ...e.defaults]);
      for (const cv of e.comparedValues) {
        if (!legal.has(cv)) {
          warn('CONTRACT_DOMAIN_DRIFT',
            `'${e.name}' is compared against '${cv}' which no chapter ever sets (legal values: {${[...legal].join(', ')}}) — this gate is silently never true`,
            e.readIn[0]);
        }
      }
    }

    // LATCH_IN_CHOICE_EFFECT — an ending-read latch set in a choice effect rather than an unconditional entryEffect
    if (e.isLatch && e.writeLocations.includes('choice')) {
      warn('LATCH_IN_CHOICE_EFFECT',
        `'${e.name}' is read by an ending (a latch) but is set inside a choice effect in [${e.writtenIn.join(', ')}] — latches should be set only by unconditional entry-effects`,
        e.writtenIn[0]);
    }

    void carriedResources; // reserved for v1.1 ancestor-aware checks (carried resources are exempt there)
  }

  return { ok: errors.length === 0, errors, warnings, ledger };
}
