import type { Story } from '../../engine';
import type { GraphLintStatus } from './lintStatus';
import { inspect } from './inspect';
import { describeConditions, describeEffects } from './describe';

export function InspectorPanel({ story, selectedId, status, onPlayFrom }: {
  story: Story; selectedId: string | null; status: GraphLintStatus; onPlayFrom: (id: string) => void;
}) {
  if (!selectedId) {
    return <aside className="w-72 border-l border-stone-200 p-4 text-sm text-stone-400">Select a node to inspect it.</aside>;
  }
  const info = inspect(story, selectedId);
  const issues = status.byId.get(selectedId) ?? [];
  if (!info) {
    // ending / event / resolver / phantom selection — show id + any issues
    return (
      <aside className="w-72 border-l border-stone-200 p-4 text-sm">
        <h2 className="mb-2 font-mono text-base text-stone-800">{selectedId}</h2>
        {issues.map((i, k) => <p key={k} className="text-red-600">{i.code}: {i.message}</p>)}
      </aside>
    );
  }
  const { node, leadsTo, reachedBy } = info;
  return (
    <aside className="w-72 overflow-y-auto border-l border-stone-200 p-4 text-sm">
      <h2 className="font-mono text-base text-stone-800">{node.title}</h2>
      <p className="mb-2 text-xs text-stone-400">{node.id} · {node.type ?? 'scene'}{node.resolvesEnding ? ' · resolves ending' : ''}</p>
      <p className="mb-3 whitespace-pre-line text-xs text-stone-600">{node.body}</p>
      {issues.length > 0 && <div className="mb-3">{issues.map((i, k) => <p key={k} className="text-red-600">⚠ {i.code}</p>)}</div>}
      <h3 className="font-semibold text-stone-700">Choices</h3>
      <ul className="mb-3">
        {(node.choices || []).map((c) => (
          <li key={c.id} className="mb-1 text-xs">
            <span className="text-stone-800">{c.label}</span> → <span className="font-mono">{c.destination}</span>
            {c.conditions?.length ? <div className="text-amber-600">if {describeConditions(c.conditions)}</div> : null}
            {c.effects?.length ? <div className="text-stone-500">does {describeEffects(c.effects)}</div> : null}
          </li>
        ))}
        {(node.choices || []).length === 0 && <li className="text-xs text-stone-400">— (no choices)</li>}
      </ul>
      <p className="text-xs"><span className="font-semibold">leads to:</span> {leadsTo.join(', ') || '—'}</p>
      <p className="mb-3 text-xs"><span className="font-semibold">reached by:</span> {reachedBy.join(', ') || '—'}</p>
      <button onClick={() => onPlayFrom(selectedId)} className="rounded bg-stone-800 px-3 py-1.5 text-white">Play from here</button>
    </aside>
  );
}
