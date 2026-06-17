import { describe, it, expect } from 'vitest';
import { layout } from './layout';
import { storyToGraph } from './storyToGraph';
import { praterLine } from '../../content/praterLine';

describe('layout', () => {
  it('assigns a position and size to every node', () => {
    const { nodes, edges } = storyToGraph(praterLine);
    const out = layout(nodes, edges);
    expect(out.nodes.length).toBe(nodes.length);
    for (const n of out.nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
      expect(n.width).toBeGreaterThan(0);
      expect(n.height).toBeGreaterThan(0);
    }
  });
  it('flows top-down: the start node sits above a node it leads to', () => {
    const { nodes, edges } = storyToGraph(praterLine);
    const out = layout(nodes, edges);
    const start = out.nodes.find((n) => n.isStart)!;
    const childId = praterLine.nodes.find((n) => n.id === praterLine.startNodeId)!.choices[0].destination;
    const child = out.nodes.find((n) => n.id === childId)!;
    expect(start.y).toBeLessThan(child.y);
  });
});
