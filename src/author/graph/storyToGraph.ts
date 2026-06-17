import type { Story } from '../../engine';
import type { GraphNode, GraphEdge } from './model';
import { describeConditions } from './describe';

export const RESOLVER_ID = '__resolver__';

export function storyToGraph(story: Story): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const known = new Set<string>();

  for (const n of story.nodes) {
    nodes.push({
      id: n.id, kind: 'node', label: n.title, nodeType: n.type,
      resolvesEnding: n.resolvesEnding, isStart: n.id === story.startNodeId,
    });
    known.add(n.id);
  }
  for (const e of story.endings) {
    nodes.push({ id: e.id, kind: 'ending', label: e.name, isDefaultEnding: e.isDefault });
    known.add(e.id);
  }
  for (const ev of story.events) {
    const trig = ev.trigger.find((t) => t.op === 'time_after' || t.op === 'time_before' || t.op === 'time_between');
    nodes.push({ id: ev.id, kind: 'event', label: ev.title, triggerLabel: trig?.value });
    known.add(ev.id);
  }

  for (const n of story.nodes) {
    for (const c of n.choices || []) {
      edges.push({
        id: `${n.id}__${c.id}`, source: n.id, target: c.destination, kind: 'choice',
        label: describeConditions(c.conditions) || undefined,
      });
    }
  }
  for (const ev of story.events) {
    const at = ev.trigger.find((t) => t.op === 'time_after')?.value;
    edges.push({ id: `${ev.id}__present`, source: ev.id, target: ev.ifPresentNode, kind: 'event-present', label: at ? `present @${at}` : 'present' });
    edges.push({ id: `${ev.id}__recovery`, source: ev.id, target: ev.recoveryNodeId, kind: 'event-recovery', label: 'recovery if absent' });
  }

  const resolutionNodes = story.nodes.filter((n) => n.resolvesEnding);
  if (resolutionNodes.length && story.endings.length) {
    nodes.push({ id: RESOLVER_ID, kind: 'resolver', label: 'Ending Resolver' });
    known.add(RESOLVER_ID);
    for (const rn of resolutionNodes) {
      edges.push({ id: `${rn.id}__resolves`, source: rn.id, target: RESOLVER_ID, kind: 'resolves', label: 'resolves from state' });
    }
    for (const e of story.endings) {
      edges.push({ id: `resolver__${e.id}`, source: RESOLVER_ID, target: e.id, kind: 'resolves' });
    }
  }

  // phantom nodes for broken links (targets that don't exist) — keep the graph total
  for (const e of edges) {
    if (!known.has(e.target)) {
      nodes.push({ id: e.target, kind: 'node', label: `⚠ missing: ${e.target}`, missing: true });
      known.add(e.target);
    }
  }

  return { nodes, edges };
}
