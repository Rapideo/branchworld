import type { Story, LintResult, LintIssue } from '../../engine';

export interface GraphLintStatus { byId: Map<string, LintIssue[]>; storyLevel: LintIssue[]; }

export function lintStatus(result: LintResult): GraphLintStatus {
  const byId = new Map<string, LintIssue[]>();
  const storyLevel: LintIssue[] = [];
  for (const issue of [...result.errors, ...result.warnings]) {
    if (issue.where) byId.set(issue.where, [...(byId.get(issue.where) ?? []), issue]);
    else storyLevel.push(issue);
  }
  return { byId, storyLevel };
}

// Final per-graph-element issues: node-scoped + its choices' issues (choice ids aren't unique,
// so attribute them to the owning node); ending/event-scoped map directly.
export function attributeIssues(story: Story, status: GraphLintStatus): Map<string, LintIssue[]> {
  const out = new Map<string, LintIssue[]>();
  const add = (id: string, issues: LintIssue[] | undefined) => {
    if (!issues || !issues.length) return;
    out.set(id, [...(out.get(id) ?? []), ...issues]);
  };
  for (const n of story.nodes) {
    add(n.id, status.byId.get(n.id));
    for (const c of n.choices || []) add(n.id, status.byId.get(c.id));
  }
  for (const e of story.endings) add(e.id, status.byId.get(e.id));
  for (const ev of story.events) add(ev.id, status.byId.get(ev.id));
  return out;
}
