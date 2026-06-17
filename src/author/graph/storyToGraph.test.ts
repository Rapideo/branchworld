import { describe, it, expect } from 'vitest';
import { storyToGraph, RESOLVER_ID } from './storyToGraph';
import { praterLine } from '../../content/praterLine';
import type { Story } from '../../engine';

describe('storyToGraph', () => {
  it('emits a node per StoryNode, ending, and event, plus a resolver hub', () => {
    const { nodes } = storyToGraph(praterLine);
    expect(nodes.filter((n) => n.kind === 'node').length).toBe(praterLine.nodes.length);
    expect(nodes.filter((n) => n.kind === 'ending').length).toBe(praterLine.endings.length);
    expect(nodes.filter((n) => n.kind === 'event').length).toBe(praterLine.events.length);
    expect(nodes.find((n) => n.id === RESOLVER_ID)?.kind).toBe('resolver');
    expect(nodes.find((n) => n.id === praterLine.startNodeId)?.isStart).toBe(true);
  });
  it('labels gated choice edges with their conditions and ids them uniquely', () => {
    const { edges } = storyToGraph(praterLine);
    // node_volkov "take_deal" is gated; its edge id is `${node}__${choiceId}`
    const gated = edges.find((e) => e.id === 'node_volkov__take_deal');
    expect(gated).toBeTruthy();
    expect(gated!.label).toContain('volkov_suspicion');
  });
  it('wires each event to a present node and a recovery node', () => {
    const { edges } = storyToGraph(praterLine);
    const present = edges.filter((e) => e.kind === 'event-present');
    const recovery = edges.filter((e) => e.kind === 'event-recovery');
    expect(present.length).toBe(praterLine.events.length);
    expect(recovery.length).toBe(praterLine.events.length);
    expect(present[0].target).toBe(praterLine.events[0].ifPresentNode);
  });
  it('connects resolvesEnding nodes -> resolver -> each ending', () => {
    const { edges } = storyToGraph(praterLine);
    const resolutionNodes = praterLine.nodes.filter((n) => n.resolvesEnding).length;
    expect(edges.filter((e) => e.kind === 'resolves' && e.target === RESOLVER_ID).length).toBe(resolutionNodes);
    expect(edges.filter((e) => e.kind === 'resolves' && e.source === RESOLVER_ID).length).toBe(praterLine.endings.length);
  });
  it('adds a phantom missing node for a broken link, never throws', () => {
    const broken: Story = { ...praterLine, nodes: praterLine.nodes.map((n) =>
      n.id === praterLine.startNodeId
        ? { ...n, choices: [{ id: 'x', label: 'x', destination: 'ghost_node' }] }
        : n) };
    const { nodes } = storyToGraph(broken);
    expect(nodes.find((n) => n.id === 'ghost_node')?.missing).toBe(true);
  });
});
