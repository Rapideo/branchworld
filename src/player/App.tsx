import { useState } from 'react';
import { stories } from '../content/stories';
import { Player } from './Player';

export function App() {
  const [storyId, setStoryId] = useState(stories[0].id);
  const story = (stories.find((s) => s.id === storyId) ?? stories[0]).story;
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-2 text-sm">
        <label htmlFor="story" className="text-stone-500">Story</label>
        <select
          id="story"
          value={storyId}
          onChange={(e) => setStoryId(e.target.value)}
          className="rounded border border-stone-300 px-2 py-1"
        >
          {stories.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>
      {/* key remounts Player (fresh engine) when the story changes */}
      <Player key={storyId} story={story} />
    </div>
  );
}
