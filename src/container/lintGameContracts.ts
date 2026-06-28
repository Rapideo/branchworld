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
import type { Story, Condition, Effect, LintIssue, Primitive } from '../engine';
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

  }

  // ---- v1.1 — ancestor-aware + annotated checks (opt-in; zero-FP by author assertion) ----
  const ledgerByName = new Map(ledger.map((e) => [e.name, e]));

  // CONTRACT_UNKNOWN_ANNOTATION (F4) — an annotation names a field absent from the derived ledger (renamed or
  // typo'd → it silently guards nothing). Covers domains keys, mutex group members, and carriedRequired entries.
  const knownNames = new Set(ledger.map((e) => e.name));
  const checkAnnotation = (name: string, kind: string, where: string) => {
    if (!knownNames.has(name)) {
      err('CONTRACT_UNKNOWN_ANNOTATION', `${kind} references '${name}', which no chapter declares/reads/writes — it guards nothing (renamed or typo'd)`, where);
    }
  };
  for (const name of Object.keys(game.domains ?? {})) checkAnnotation(name, 'domains', name);
  for (const group of game.mutexLatches ?? []) for (const m of group) checkAnnotation(m, 'mutexLatches', m);
  for (const ch of game.chapters) for (const v of ch.carriedRequired ?? []) checkAnnotation(v, `carriedRequired (chapter ${ch.id})`, ch.id);

  // CONTRACT_READ_NO_ANCESTOR_PRODUCER — a chapter's carriedRequired var has a path in with no upstream
  // producer. Chapter-granular and conservative: a chapter that writes V on SOME path still counts as a
  // producer (so the legitimate "the default IS the carried value on this path" case never false-positives);
  // it fires only when NO ancestor writes V at all — the renamed/dropped-latch tail case v1 can't see.
  for (const ch of game.chapters) {
    for (const v of ch.carriedRequired ?? []) {
      if (carriedResources.has(v)) continue; // carried resources are always produced by the resource system
      const producers = new Set((ledgerByName.get(v)?.writtenIn ?? []).filter((id) => id !== ch.id));
      if (hasProducerFreePath(game, ch.id, producers)) {
        err('CONTRACT_READ_NO_ANCESTOR_PRODUCER',
          `chapter '${ch.id}' requires '${v}' carried in, but a path from '${game.startChapterId}' reaches it with no upstream chapter writing '${v}' — on that path '${v}' is its default (silent carried-latch drift)`,
          ch.id);
      }
    }
  }

  // CONTRACT_DOMAIN_VIOLATION — a value set/compared/defaulted outside an annotated domain.
  for (const [name, domain] of Object.entries(game.domains ?? {})) {
    const e = ledgerByName.get(name);
    if (!e) continue;
    const legal = new Set(domain);
    for (const val of new Set([...e.writtenValues, ...e.comparedValues, ...e.defaults])) {
      if (!legal.has(val)) {
        err('CONTRACT_DOMAIN_VIOLATION',
          `'${name}' uses value '${val}' outside its declared domain {${domain.join(', ')}}`, name);
      }
    }
  }

  // MUTEX_LATCH_UNGUARDED — an ending asserting one member of a mutex group must exclude its partners,
  // or drift (both latches true) lets the wrong ending fire. The exclusion is the F-E fix, made checkable.
  const assertsTrue = (c: Condition) => c.op === 'is_true' || (c.op === 'equals' && c.value === 'true');
  const excludesFalse = (conds: Condition[], field: string) =>
    conds.some((c) => c.field === field &&
      (c.op === 'is_false' || (c.op === 'equals' && c.value === 'false') || (c.op === 'not_equals' && c.value === 'true')));
  for (const group of game.mutexLatches ?? []) {
    for (const ch of game.chapters) {
      for (const en of ch.story.endings) {
        const conds = en.conditions ?? [];
        for (const m of group.filter((g) => conds.some((c) => c.field === g && assertsTrue(c)))) {
          for (const partner of group) {
            if (partner === m || excludesFalse(conds, partner)) continue;
            warn('MUTEX_LATCH_UNGUARDED',
              `ending '${en.id}' (chapter '${ch.id}') asserts '${m}' is true but does not exclude its mutex partner '${partner}' — add '${partner} is_false' so drift cannot fire the wrong ending`,
              en.id);
          }
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings, ledger };
}

// True if `target` is reachable from the game's start chapter along transitions WITHOUT passing through
// any `producers` chapter — i.e., a path on which the required var is never written upstream.
function hasProducerFreePath(game: Game, target: string, producers: Set<string>): boolean {
  if (producers.has(game.startChapterId)) return false; // every path begins at a producer
  const adj = new Map(game.chapters.map((c) => [c.id, c.transitions.map((t) => t.goTo)]));
  const seen = new Set<string>();
  const stack = [game.startChapterId];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === target) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const nxt of adj.get(id) ?? []) if (!producers.has(nxt)) stack.push(nxt);
  }
  return false;
}
