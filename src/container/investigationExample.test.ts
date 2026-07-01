import { describe, it, expect } from 'vitest';
import { GameRunner } from './GameRunner';
import { lintGame } from './lintGame';
import { lintStory } from '../engine';
import { verifyInvestigation } from '../engine/stateSpaceWalk';   // submodule — NOT on the ../engine barrel (like verifyRoam)
import { investigationExample, investigationStudy, investigationStudyUntimed, investigationStudyUnreachable, investigationStudyEndsWith, bareChapterInvestigationGame } from './investigationExample';

describe('The Locked Study', () => {
  it('lints clean (story + game)', () => {
    expect(lintStory(investigationStudy).errors).toEqual([]);
    expect(lintGame(investigationExample).errors).toEqual([]);
  });
  it('verifyInvestigation passes on the clean timed + untimed variants', () => {
    expect(verifyInvestigation(investigationStudy).ok).toBe(true);
    expect(verifyInvestigation(investigationStudyUntimed).ok).toBe(true);
  });
  it('a GameRunner can examine the load-bearing clues and accuse the partner correctly', () => {
    const g = new GameRunner(investigationExample);
    g.choose('__examine_desk');     // debt_receipt
    g.choose('__examine_ledger');   // ledger_gap
    g.choose('__examine_painting'); // safe_combo
    g.choose('accuse_partner');
    expect(g.view().finalEndingId).toBe('accuse_partner');
  });
  it('the negative fixture fails INVESTIGATION_DEADLINE_UNREACHABLE', () => {
    const { ok, issues } = verifyInvestigation(investigationStudyUnreachable);
    expect(ok).toBe(false);
    expect(issues.find((i) => i.code === 'INVESTIGATION_DEADLINE_UNREACHABLE')).toBeDefined();
  });
  it('the endsWith P0 fixture is NOT a false pass', () => {
    expect(verifyInvestigation(investigationStudyEndsWith).ok).toBe(false);
  });
  it('a game-profile-only investigation chapter injects __examine_ at runtime (root profile stamp)', () => {
    // bareChapterInvestigationGame: investigation:'on' ONLY on game.profile; the chapter story declares no profile.
    // Proves Task 1's stamp closes the silent-failure class for investigation, not just travel.
    const r = new GameRunner(bareChapterInvestigationGame());
    expect(r.view().choices.some((c) => c.id.startsWith('__examine_'))).toBe(true);
  });
});
