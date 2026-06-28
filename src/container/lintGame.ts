import { lintStory, resolveProfile } from '../engine';
import type { LintIssue } from '../engine';
import type { Game } from './types';
import { lintGameContracts } from './lintGameContracts';

export function lintGame(game: Game): { ok: boolean; errors: LintIssue[]; warnings: LintIssue[] } {
  const errors: LintIssue[] = [];
  const warnings: LintIssue[] = [];
  const ids = new Set(game.chapters.map((c) => c.id));

  if (!ids.has(game.startChapterId)) {
    errors.push({ level: 'error', code: 'GAME_NO_START', message: `startChapterId ${game.startChapterId} is not a chapter` });
  }

  // structural per-chapter checks
  for (const ch of game.chapters) {
    for (const t of ch.transitions) {
      if (!ids.has(t.goTo)) {
        errors.push({ level: 'error', code: 'GAME_BROKEN_TRANSITION', message: `chapter ${ch.id} -> missing chapter ${t.goTo}`, where: ch.id });
      }
    }
    if (!ch.gameEnding) {
      const hasCatchAll = ch.transitions.some((t) => t.when.endingId === undefined && (!t.when.conditions || t.when.conditions.length === 0));
      if (!hasCatchAll) {
        errors.push({ level: 'error', code: 'GAME_NO_CATCHALL', message: `non-game-ending chapter ${ch.id} has no catch-all transition; some end-state could have no next chapter`, where: ch.id });
      }
    }
    const r = lintStory(ch.story, game.profile);
    for (const e of r.errors) {
      errors.push({ level: 'error', code: 'GAME_CHAPTER_LINT', message: `chapter ${ch.id}: [${e.code}] ${e.message}`, where: ch.id });
    }
  }

  // v1 requires a uniform clock across a game. Compare each chapter's RESOLVED clock (its own profile, else
  // the inherited game profile, else the timed default) PLUS the game's own declaration — so an
  // implicitly-timed chapter under an explicitly-untimed sibling, or a chapter overriding the game, is caught.
  const clocks = new Set(game.chapters.map((ch) => resolveProfile(ch.story, game.profile).clock));
  if (game.profile) clocks.add(game.profile.clock);
  if (clocks.size > 1) {
    errors.push({ level: 'error', code: 'PROFILE_CHAPTER_CONFLICT',
      message: `mixed clock profiles [${[...clocks].sort().join(', ')}] across the game and its chapters — v1 requires a uniform clock`,
      where: game.startChapterId });
  }

  // reachability from start
  const reachable = new Set<string>();
  const stack = ids.has(game.startChapterId) ? [game.startChapterId] : [];
  while (stack.length) {
    const id = stack.pop()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    const ch = game.chapters.find((c) => c.id === id);
    if (ch) for (const t of ch.transitions) if (ids.has(t.goTo)) stack.push(t.goTo);
  }

  if (ids.has(game.startChapterId)) {
    const reachableEnding = game.chapters.some((c) => reachable.has(c.id) && c.gameEnding);
    if (!reachableEnding) {
      errors.push({ level: 'error', code: 'GAME_NO_REACHABLE_ENDING', message: 'no game-ending chapter is reachable from the start chapter' });
    }

    for (const ch of game.chapters) {
      if (!reachable.has(ch.id)) {
        warnings.push({ level: 'warning', code: 'GAME_ORPHAN_CHAPTER', message: `chapter ${ch.id} is unreachable from the start chapter`, where: ch.id });
      }
    }
  }

  // A1 — cross-chapter contract + latch checks (the variable handshake per-chapter lint can't see)
  const contracts = lintGameContracts(game);
  errors.push(...contracts.errors);
  warnings.push(...contracts.warnings);

  return { ok: errors.length === 0, errors, warnings };
}
