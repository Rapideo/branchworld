import dagre from '@dagrejs/dagre';
import type { GraphNode, GraphEdge, GraphNodeKind } from './model';

export interface Positioned extends GraphNode { x: number; y: number; width: number; height: number; }

const SIZES: Record<GraphNodeKind, { width: number; height: number }> = {
  node: { width: 180, height: 56 },
  ending: { width: 160, height: 52 },
  event: { width: 150, height: 46 },
  resolver: { width: 150, height: 46 },
};

export function layout(nodes: GraphNode[], edges: GraphEdge[]): { nodes: Positioned[]; edges: GraphEdge[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 70 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) {
    const s = SIZES[n.kind];
    g.setNode(n.id, { width: s.width, height: s.height });
  }
  for (const e of edges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target);
  }
  dagre.layout(g);
  const positioned: Positioned[] = nodes.map((n) => {
    const s = SIZES[n.kind];
    const p = g.node(n.id); // dagre returns center coordinates
    return { ...n, width: s.width, height: s.height, x: p.x - s.width / 2, y: p.y - s.height / 2 };
  });
  return { nodes: positioned, edges };
}
