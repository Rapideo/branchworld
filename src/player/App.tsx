import { useState } from 'react';
import { stories } from '../content/stories';
import { Player } from './Player';
import { GraphView } from '../author/graph/GraphView';

export function App() {
  const [storyId, setStoryId] = useState(stories[0].id);
  const [view, setView] = useState<'play' | 'graph'>('play');
  const [startAtNodeId, setStartAtNodeId] = useState<string | undefined>(undefined);
  const story = (stories.find((s) => s.id === storyId) ?? stories[0]).story;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="flex items-center gap-3 border-b border-stone-200 px-4 py-2 text-sm">
        <label htmlFor="story" className="text-stone-500">Story</label>
        <select id="story" aria-label="Story" value={storyId}
                onChange={(e) => { setStoryId(e.target.value); setStartAtNodeId(undefined); }}
                className="rounded border border-stone-300 px-2 py-1">
          {stories.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <span className="ml-auto inline-flex overflow-hidden rounded border border-stone-300">
          <button onClick={() => setView('play')} className={`px-3 py-1 ${view === 'play' ? 'bg-stone-800 text-white' : 'bg-white'}`}>Play</button>
          <button onClick={() => setView('graph')} className={`px-3 py-1 ${view === 'graph' ? 'bg-stone-800 text-white' : 'bg-white'}`}>Graph</button>
        </span>
      </div>
      {view === 'play'
        ? <Player key={`${storyId}:${startAtNodeId ?? 'start'}`} story={story} startAtNodeId={startAtNodeId} />
        : <GraphView story={story} onPlayFrom={(id) => { setStartAtNodeId(id); setView('play'); }} />}
    </div>
  );
}
