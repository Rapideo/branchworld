import type { GameView, Story, WorldState } from '../../engine';
import { resolveEnding, lintStory } from '../../engine';

function StateInspector({ state }: { state: WorldState }) {
  const rows: [string, string][] = [
    ['time', String(state.time)],
    ['location', state.location],
    ['clues', state.clues.join(', ') || '—'],
    ['inventory', state.inventory.join(', ') || '—'],
    ['visited', state.visited.join(', ') || '—'],
    ['completed', state.completedEvents.join(', ') || '—'],
    ...Object.entries(state.vars).map(([k, v]) => [k, String(v)] as [string, string]),
  ];
  return (
    <div>
      <h3 className="font-semibold text-stone-300">State</h3>
      <dl className="grid grid-cols-2 gap-x-2">
        {rows.map(([k, v]) => (
          <div key={k} className="contents"><dt className="text-stone-400">{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    </div>
  );
}

function EventLog({ view, story }: { view: GameView; story: Story }) {
  const upcoming = story.events.filter((e) => !view.state.completedEvents.includes(e.id));
  return (
    <div>
      <h3 className="font-semibold text-stone-300">Events</h3>
      <p className="text-stone-400">fired:</p>
      <ul>{view.log.length ? view.log.map((l, i) => <li key={i}>{l}</li>) : <li>—</li>}</ul>
      <p className="text-stone-400">upcoming:</p>
      <ul>{upcoming.length ? upcoming.map((e) => <li key={e.id}>{e.id} ({e.title})</li>) : <li>—</li>}</ul>
    </div>
  );
}

function HiddenChoices({ view }: { view: GameView }) {
  const locked = view.choices.filter((c) => !c.available);
  return (
    <div>
      <h3 className="font-semibold text-stone-300">Hidden choices</h3>
      <ul>
        {locked.length
          ? locked.map((c) => <li key={c.id}>{c.label} — needs {c.lockedReason}</li>)
          : <li>—</li>}
      </ul>
    </div>
  );
}

function EndingPreview({ view, story }: { view: GameView; story: Story }) {
  const e = resolveEnding(view.state, story);
  return (
    <div>
      <h3 className="font-semibold text-stone-300">Ending preview</h3>
      <p>{e ? e.name : '—'}</p>
    </div>
  );
}

function LintStatus({ story }: { story: Story }) {
  const r = lintStory(story);
  return (
    <div>
      <h3 className="font-semibold text-stone-300">Linter</h3>
      <p>{r.ok ? `clean (${r.warnings.length} warnings)` : `${r.errors.length} errors`}</p>
    </div>
  );
}

function JumpToNode({ story, onGoto }: { story: Story; onGoto: (id: string) => void }) {
  return (
    <div>
      <label htmlFor="jump" className="font-semibold text-stone-300">Jump to node</label>
      <select
        id="jump"
        aria-label="Jump to node"
        defaultValue=""
        onChange={(e) => { if (e.target.value) onGoto(e.target.value); }}
        className="ml-2 rounded bg-stone-800 px-2 py-1 text-stone-100"
      >
        <option value="" disabled>select…</option>
        {story.nodes.map((n) => <option key={n.id} value={n.id}>{n.id}</option>)}
      </select>
    </div>
  );
}

export function DebugPanel({ view, story, onReset, onGoto }: {
  view: GameView; story: Story; onReset: () => void; onGoto: (id: string) => void;
}) {
  return (
    <section aria-label="Debug panel" className="space-y-3 border-t border-stone-700 bg-stone-900 p-4 font-mono text-xs text-stone-200">
      <div className="flex gap-2">
        <button onClick={onReset} className="rounded border border-stone-600 px-2 py-1">Reset</button>
        <JumpToNode story={story} onGoto={onGoto} />
      </div>
      <StateInspector state={view.state} />
      <EventLog view={view} story={story} />
      <HiddenChoices view={view} />
      <EndingPreview view={view} story={story} />
      <LintStatus story={story} />
    </section>
  );
}
