import { useState } from 'react';
import { useGame } from './useGame';
import { sampleStory } from '../content/sampleStory';
import { StatusBar } from './StatusBar';
import { SceneView } from './SceneView';
import { ChoiceList } from './ChoiceList';
import { EndingView } from './EndingView';
import { SaveSlots } from './saves/SaveSlots';
import { DebugPanel } from './debug/DebugPanel';

function locationName(id: string): string {
  return sampleStory.locations.find((l) => l.id === id)?.name ?? id;
}

export function App() {
  const game = useGame(sampleStory);
  const [showDebug, setShowDebug] = useState(false);
  const [showSaves, setShowSaves] = useState(false);
  const { view } = game;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <StatusBar timeLabel={view.timeLabel} location={locationName(view.location)} />
      <main className="pb-4">
        <SceneView node={view.node} timeLabel={view.timeLabel} />
        {view.endingReached
          ? <EndingView ending={view.endingReached} onReset={game.reset} />
          : <ChoiceList choices={view.choices} onChoose={game.choose} />}
      </main>
      <footer className="sticky bottom-0 flex gap-3 border-t border-stone-200 bg-stone-50/90 px-4 py-2 text-sm backdrop-blur">
        <button onClick={() => setShowDebug((s) => !s)}>⚙ debug</button>
        <button onClick={() => setShowSaves((s) => !s)}>💾 saves</button>
      </footer>
      {showSaves && (
        <SaveSlots
          storyId={sampleStory.id}
          makeSnapshot={game.snapshot}
          onRestore={game.restore}
          summary={`${view.timeLabel} · ${locationName(view.location)}`}
        />
      )}
      {showDebug && <DebugPanel view={view} story={sampleStory} onReset={game.reset} onGoto={game.gotoNode} />}
    </div>
  );
}
