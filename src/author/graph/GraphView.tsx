import { useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Story } from '../../engine';
import { lintStory } from '../../engine';
import { storyToGraph } from './storyToGraph';
import { layout } from './layout';
import { lintStatus, attributeIssues } from './lintStatus';
import { nodeTypes, type RFNodeData } from './nodes';
import { TimeAxis } from './TimeAxisComponent';
import { LintBanner } from './LintBanner';
import { InspectorPanel } from './InspectorPanel';

const RF_TYPE: Record<string, string> = { node: 'storyNode', ending: 'ending', event: 'event', resolver: 'resolver' };

export function GraphView({ story, onPlayFrom }: { story: Story; onPlayFrom: (nodeId: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  const status = useMemo(() => lintStatus(lintStory(story)), [story]);
  const { rfNodes, rfEdges } = useMemo(() => {
    const { nodes, edges } = storyToGraph(story);
    const positioned = layout(nodes, edges).nodes;
    const attr = attributeIssues(story, status);
    const rfNodes: Node[] = positioned.map((p) => ({
      id: p.id,
      type: RF_TYPE[p.kind],
      position: { x: p.x, y: p.y },
      data: { graph: p, issues: attr.get(p.id) ?? [] } satisfies RFNodeData,
    }));
    const rfEdges: Edge[] = edges.map((e) => ({
      id: e.id, source: e.source, target: e.target, label: e.label,
      animated: e.kind === 'event-present' || e.kind === 'event-recovery',
      style: e.kind === 'resolves' || e.kind.startsWith('event') ? { strokeDasharray: '4 4' } : undefined,
    }));
    return { rfNodes, rfEdges };
  }, [story, status]);

  return (
    <div className="flex h-[80vh] flex-col">
      <LintBanner status={status} />
      <TimeAxis story={story} />
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <ReactFlow nodes={rfNodes} edges={rfEdges} nodeTypes={nodeTypes} fitView
                     onNodeClick={(_, n) => setSelected(n.id)}>
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
        <InspectorPanel story={story} selectedId={selected} status={status} onPlayFrom={onPlayFrom} />
      </div>
    </div>
  );
}
