import { describe, it, expect } from 'vitest';
import { lintGameContracts, deriveLedger, lintGame, type Game } from '../../container';
import { sumpLine } from './content/sumpLine';

const clone = (): Game => JSON.parse(JSON.stringify(sumpLine)) as Game;
const chapter = (g: Game, id: string) => g.chapters.find((c) => c.id === id)!;
const codes = (issues: { code: string }[]) => issues.map((i) => i.code);

describe('A1 — cross-chapter contract + latch linter', () => {
  it('the real game lints clean (no contract errors or warnings)', () => {
    const r = lintGameContracts(sumpLine);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('lintGame now surfaces contract issues (the wiring)', () => {
    expect(lintGame(sumpLine).errors).toEqual([]);
    const g = clone();
    chapter(g, 'ch2_high').story.variables.find((v) => v.name === 'cave_all_together')!.type = 'string';
    expect(codes(lintGame(g).errors)).toContain('CONTRACT_TYPE_MISMATCH');
  });

  it('derives a ledger that captures the cross-chapter handshake', () => {
    const ledger = deriveLedger(sumpLine);
    const byName = Object.fromEntries(ledger.map((e) => [e.name, e]));

    // cave_route: written in ch1, read by the game transition out of ch1
    expect(byName.cave_route.kind).toBe('var');
    expect(byName.cave_route.writtenIn).toContain('ch1_descent');
    expect(byName.cave_route.readIn).toContain('ch1_descent');

    // companion_status: a carried string, written across chapters
    expect(byName.companion_status.types).toEqual(['string']);
    expect(byName.companion_status.writtenValues).toEqual(expect.arrayContaining(['with_you', 'lost']));

    // cave_all_together: an ending-read latch, set only by entry-effects (never a choice effect)
    expect(byName.cave_all_together.isLatch).toBe(true);
    expect(byName.cave_all_together.writeLocations).not.toContain('choice');
  });

  // ---- mutation tests: each proves a check actually bites ----

  it('CONTRACT_TYPE_MISMATCH — a var declared with conflicting types across chapters', () => {
    const g = clone();
    // cave_someone_lost is a boolean in ch1 and ch2_high; declare it 'string' in ch2_high -> conflict
    chapter(g, 'ch2_high').story.variables.find((v) => v.name === 'cave_someone_lost')!.type = 'string';
    const r = lintGameContracts(g);
    expect(codes(r.errors)).toContain('CONTRACT_TYPE_MISMATCH');
  });

  it('CONTRACT_READ_NO_PRODUCER — a var read but written by no chapter (the renamed/drift latch)', () => {
    const g = clone();
    // ch2_high declares + reads a latch nothing ever sets (models an upstream rename leaving it unwritten)
    const ch = chapter(g, 'ch2_high').story;
    ch.variables.push({ name: 'cave_ghost', type: 'boolean', default: false, purpose: 'expected from upstream, never written' });
    ch.endings.find((e) => e.id === 'end_dark_high')!.conditions.push({ field: 'cave_ghost', op: 'is_true' });
    const r = lintGameContracts(g);
    expect(codes(r.errors)).toContain('CONTRACT_READ_NO_PRODUCER');
    expect(r.errors.find((e) => e.code === 'CONTRACT_READ_NO_PRODUCER')!.message).toContain('cave_ghost');
  });

  it('CONTRACT_DOMAIN_DRIFT — a string var compared against a value nothing sets', () => {
    const g = clone();
    // compare companion_status against 'injured', which no chapter ever sets (only hurt/with_you/lost)
    const node = chapter(g, 'ch2_high').story.nodes.find((n) => n.choices.some((c) => c.id === 'c_haul'))!;
    node.choices.find((c) => c.id === 'c_haul')!.conditions = [{ field: 'companion_status', op: 'equals', value: 'injured' }];
    const r = lintGameContracts(g);
    expect(codes(r.warnings)).toContain('CONTRACT_DOMAIN_DRIFT');
    expect(r.warnings.find((w) => w.code === 'CONTRACT_DOMAIN_DRIFT')!.message).toContain('injured');
  });

  it('LATCH_IN_CHOICE_EFFECT — an ending-read latch set inside a choice effect', () => {
    const g = clone();
    // set cave_someone_lost (an ending-read latch) from a choice effect instead of an entry-effect
    const node = chapter(g, 'ch2_high').story.nodes.find((n) => n.choices.some((c) => c.id === 'c_haul'))!;
    const haul = node.choices.find((c) => c.id === 'c_haul')!;
    haul.effects = [...(haul.effects ?? []), { field: 'cave_someone_lost', op: 'set', value: 'true' }];
    const r = lintGameContracts(g);
    expect(codes(r.warnings)).toContain('LATCH_IN_CHOICE_EFFECT');
  });

  // ---- v1.1: ancestor-aware + annotated checks (opt-in, zero-FP by author assertion) ----

  it('CONTRACT_READ_NO_ANCESTOR_PRODUCER — a carriedRequired var no ancestor chapter writes', () => {
    const g = clone(); // ch2_high.carriedRequired includes cave_all_together; ch1 is its sole ancestor
    // strip every write of cave_all_together from ch1 — models an upstream rename leaving it unwritten
    const ch1 = chapter(g, 'ch1_descent').story;
    for (const n of ch1.nodes) {
      if (n.entryEffects) n.entryEffects = n.entryEffects.filter((e) => e.field !== 'cave_all_together');
      for (const c of n.choices ?? []) if (c.effects) c.effects = c.effects.filter((e) => e.field !== 'cave_all_together');
    }
    const r = lintGameContracts(g);
    expect(codes(r.errors)).toContain('CONTRACT_READ_NO_ANCESTOR_PRODUCER');
    expect(r.errors.find((e) => e.code === 'CONTRACT_READ_NO_ANCESTOR_PRODUCER')!.message).toContain('cave_all_together');
  });

  it('CONTRACT_READ_NO_ANCESTOR_PRODUCER — does NOT fire when an ancestor writes it (no false positive)', () => {
    expect(codes(lintGameContracts(sumpLine).errors)).not.toContain('CONTRACT_READ_NO_ANCESTOR_PRODUCER');
  });

  it('CONTRACT_DOMAIN_VIOLATION — a value compared outside a declared domain', () => {
    const g = clone(); // domains.companion_status = [with_you, hurt, lost]
    const node = chapter(g, 'ch2_high').story.nodes.find((n) => n.choices.some((c) => c.id === 'c_haul'))!;
    node.choices.find((c) => c.id === 'c_haul')!.conditions = [{ field: 'companion_status', op: 'equals', value: 'injured' }];
    expect(codes(lintGameContracts(g).errors)).toContain('CONTRACT_DOMAIN_VIOLATION');
  });

  it('MUTEX_LATCH_UNGUARDED — an ending asserts one mutex latch without excluding its partner', () => {
    const g = clone(); // mutexLatches = [[cave_all_together, cave_someone_lost]]
    const end = chapter(g, 'ch2_high').story.endings.find((e) => e.id === 'end_daylight_all_three')!;
    end.conditions = end.conditions.filter((c) => c.field !== 'cave_someone_lost'); // drop the partner guard
    expect(codes(lintGameContracts(g).warnings)).toContain('MUTEX_LATCH_UNGUARDED');
  });

  it('CONTRACT_UNKNOWN_ANNOTATION — a domains entry naming a var no chapter has (F4)', () => {
    const g = clone();
    g.domains = { ...g.domains, ghost_var: ['a', 'b'] };
    expect(codes(lintGameContracts(g).errors)).toContain('CONTRACT_UNKNOWN_ANNOTATION');
  });

  it('CONTRACT_UNKNOWN_ANNOTATION — a carriedRequired naming a var no chapter has (F4)', () => {
    const g = clone();
    chapter(g, 'ch2_high').carriedRequired = ['ghost_required'];
    expect(codes(lintGameContracts(g).errors)).toContain('CONTRACT_UNKNOWN_ANNOTATION');
  });
});
