import { describe, it, expect } from 'vitest';
import { lintStatus, attributeIssues } from './lintStatus';
import { timeAxis } from './timeAxis';
import { inspect } from './inspect';
import { lintStory, parseTime, type LintResult } from '../../engine';
import { praterLine } from '../../content/praterLine';

describe('lintStatus', () => {
  it('routes story-level issues to storyLevel and where-scoped to byId', () => {
    const result: LintResult = {
      ok: false,
      errors: [{ level: 'error', code: 'CLOCK_CANNOT_BITE', message: 'x' }],
      warnings: [{ level: 'warning', code: 'UNREACHABLE_NODE', message: 'y', where: 'node_x' }],
    };
    const s = lintStatus(result);
    expect(s.storyLevel.map((i) => i.code)).toContain('CLOCK_CANNOT_BITE');
    expect(s.byId.get('node_x')?.[0].code).toBe('UNREACHABLE_NODE');
  });
  it('attributes a choice-scoped issue to its owning node', () => {
    const result: LintResult = { ok: false, errors: [{ level: 'error', code: 'UNDEFINED_VAR', message: 'z', where: 'take_deal' }], warnings: [] };
    const attr = attributeIssues(praterLine, lintStatus(result));
    // 'take_deal' is a choice on node_volkov (and node_volkov_truth) -> attributed to those nodes
    expect(attr.get('node_volkov')?.some((i) => i.code === 'UNDEFINED_VAR')).toBe(true);
    expect(attr.get('node_volkov_truth')?.some((i) => i.code === 'UNDEFINED_VAR')).toBe(true);
  });
});

describe('timeAxis', () => {
  it('computes the window and places each event by fraction', () => {
    const a = timeAxis(praterLine);
    expect(a.startMin).toBe(parseTime(praterLine.startTime));
    expect(a.deadlineMin).toBe(parseTime(praterLine.deadline!));
    expect(a.windowMin).toBe(a.deadlineMin - a.startMin);
    const mark = a.marks[0];
    expect(mark.frac).toBeGreaterThan(0);
    expect(mark.frac).toBeLessThan(1);
  });
});

describe('inspect', () => {
  it('computes leadsTo and reachedBy (incl. event routing)', () => {
    const r = inspect(praterLine, 'node_handoff_witnessed')!;
    expect(r.node.id).toBe('node_handoff_witnessed');
    // reached by the scheduled event (ifPresentNode)
    expect(r.reachedBy).toContain('event_handoff');
  });
  it('returns undefined for an unknown node, never throws', () => {
    expect(inspect(praterLine, 'nope')).toBeUndefined();
  });
});
