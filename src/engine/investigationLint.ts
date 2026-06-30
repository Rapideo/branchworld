import type { Story, Profile, LintIssue, Condition } from './types';

const issue = (level: 'error' | 'warning', code: string, message: string, where?: string): LintIssue =>
  ({ level, code, message, where });

function clueIsRead(story: Story, clue: string): boolean {
  const reads = (cs: Condition[] | undefined) => (cs ?? []).some((c) => c.op === 'has_clue' && (c.value ?? c.field) === clue);
  for (const n of story.nodes) {
    if (reads(n.conditions)) return true;
    for (const c of n.choices ?? []) if (reads(c.conditions)) return true;
    for (const ex of n.examinables ?? []) if (reads(ex.conditions)) return true;
  }
  for (const ev of story.events) if (reads(ev.trigger)) return true;
  for (const en of story.endings) if (reads(en.conditions)) return true;
  return false;
}

export function lintInvestigation(story: Story, profile: Profile): LintIssue[] {
  const out: LintIssue[] = [];
  const anyExaminables = story.nodes.some((n) => (n.examinables?.length ?? 0) > 0);

  if (profile.investigation !== 'on') {
    if (anyExaminables) out.push(issue('warning', 'EXAMINABLES_IGNORED',
      `examinables are declared but investigation:'off' — the hotspots are inert (forgotten toggle?)`));
    return out;
  }

  if (profile.travel === 'free') out.push(issue('error', 'INVESTIGATION_WITH_TRAVEL_UNVERIFIED',
    `investigation:'on' with travel:'free' is unsupported in v1 — the timed x roam x investigation verification is not built yet`));

  for (const n of story.nodes) {
    const seen = new Set<string>();
    const terminal = !!(n.resolvesEnding || n.endsWith);
    for (const ex of n.examinables ?? []) {
      if (seen.has(ex.id)) out.push(issue('error', 'EXAMINE_DUPLICATE_HOTSPOT', `node ${n.id} has two examinables with id '${ex.id}'`, n.id));
      seen.add(ex.id);
      if (!ex.clue) out.push(issue('error', 'EXAMINE_EMPTY_CLUE', `examinable '${ex.id}' (node ${n.id}) has no clue`, n.id));
      if (terminal) out.push(issue('warning', 'EXAMINE_ON_TERMINAL_NODE', `examinable '${ex.id}' is on terminal node ${n.id} — the injected choice is dead (the ending resolves on entry)`, n.id));
      if (ex.minutes !== undefined && profile.clock === 'untimed') out.push(issue('warning', 'INVESTIGATION_MINUTES_UNTIMED', `examinable '${ex.id}' sets minutes under clock:'untimed' (inert)`, n.id));
      if (ex.clue && !clueIsRead(story, ex.clue)) out.push(issue('warning', 'EXAMINE_CLUE_UNUSED', `examinable '${ex.id}' yields clue '${ex.clue}' that no has_clue condition reads`, n.id));
    }
  }
  return out;
}
