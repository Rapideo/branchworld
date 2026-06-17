import type { NodeType } from '../../engine';

export type GraphNodeKind = 'node' | 'ending' | 'event' | 'resolver';

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  nodeType?: NodeType;
  resolvesEnding?: boolean;
  isStart?: boolean;
  isDefaultEnding?: boolean;
  triggerLabel?: string;
  missing?: boolean; // phantom target for a broken link
}

export type GraphEdgeKind = 'choice' | 'event-present' | 'event-recovery' | 'resolves';

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  kind: GraphEdgeKind;
}
