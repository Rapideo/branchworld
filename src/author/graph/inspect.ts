import type { Story, StoryNode } from '../../engine';

export interface NodeInspection { node: StoryNode; leadsTo: string[]; reachedBy: string[]; }

export function inspect(story: Story, nodeId: string): NodeInspection | undefined {
  const node = story.nodes.find((n) => n.id === nodeId);
  if (!node) return undefined;
  const leadsTo = Array.from(new Set((node.choices || []).map((c) => c.destination)));
  const reachedBy = new Set<string>();
  for (const n of story.nodes) {
    if ((n.choices || []).some((c) => c.destination === nodeId)) reachedBy.add(n.id);
  }
  for (const ev of story.events) {
    if (ev.ifPresentNode === nodeId || ev.recoveryNodeId === nodeId) reachedBy.add(ev.id);
  }
  return { node, leadsTo, reachedBy: Array.from(reachedBy) };
}
