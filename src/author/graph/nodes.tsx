import { Handle, Position } from '@xyflow/react';
import type { GraphNode } from './model';
import type { LintIssue } from '../../engine';

export interface RFNodeData { graph: GraphNode; issues: LintIssue[]; }
type Props = { data: RFNodeData };

export function ringClass(issues: LintIssue[]): string {
  if (issues.some((i) => i.level === 'error')) return 'ring-2 ring-red-500';
  if (issues.some((i) => i.level === 'warning')) return 'ring-2 ring-amber-400';
  return 'ring-1 ring-stone-300';
}

export function StoryNodeCard({ data }: Props) {
  const { graph, issues } = data;
  return (
    <div className={`rounded-md bg-white px-3 py-2 text-xs shadow-sm ${ringClass(issues)} ${graph.isStart ? 'border-l-4 border-emerald-500' : ''} ${graph.missing ? 'bg-red-50' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <span className="font-medium text-stone-800">{graph.label}</span>
      <span className="block text-[10px] text-stone-400">{graph.nodeType ?? 'scene'}{graph.resolvesEnding ? ' · resolves' : ''}</span>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export function EndingNode({ data }: Props) {
  const { graph, issues } = data;
  return (
    <div className={`rounded-full border border-stone-800 bg-stone-100 px-3 py-2 text-xs ${ringClass(issues)}`}>
      <Handle type="target" position={Position.Top} />
      <div className="font-medium text-stone-800">{graph.label}</div>
      {graph.isDefaultEnding && <div className="text-[10px] uppercase tracking-wide text-stone-500">default</div>}
    </div>
  );
}

export function EventBadge({ data }: Props) {
  const { graph, issues } = data;
  return (
    <div className={`rounded bg-indigo-50 px-3 py-2 text-xs ${ringClass(issues)}`}>
      <Handle type="target" position={Position.Top} />
      <div className="font-medium text-indigo-900">⏱ {graph.label}</div>
      {graph.triggerLabel && <div className="text-[10px] text-indigo-500">{graph.triggerLabel}</div>}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export function ResolverNode({ data }: Props) {
  const { graph, issues } = data;
  return (
    <div className={`rounded bg-stone-800 px-3 py-2 text-xs text-stone-100 ${ringClass(issues)}`}>
      <Handle type="target" position={Position.Top} />
      <div className="font-medium">{graph.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export const nodeTypes = { storyNode: StoryNodeCard, ending: EndingNode, event: EventBadge, resolver: ResolverNode };
