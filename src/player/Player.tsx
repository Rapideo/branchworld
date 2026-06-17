import { useState } from 'react';
import type { Story } from '../engine';
import { useGame } from './useGame';
import { StatusBar } from './StatusBar';
import { SceneView } from './SceneView';
import { ChoiceList } from './ChoiceList';
import { EndingView } from './EndingView';
import { SaveSlots } from './saves/SaveSlots';
import { DebugPanel } from './debug/DebugPanel';

export function Player({ story }: { story: Story }) {
  const game = useGame(story);
  const [showDebug, setShowDebug] = useState(false);
  const [showSaves, setShowSaves] = useState(false);
  const { view } = game;
  const locationName = (id: string) => story.locations.find((l) => l.id === id)?.name ?? id;

  return (
    <>
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
          storyId={story.id}
          makeSnapshot={game.snapshot}
          onRestore={game.restore}
          summary={`${view.timeLabel} · ${locationName(view.location)}`}
        />
      )}
      {showDebug && <DebugPanel view={view} story={story} onReset={game.reset} onGoto={game.gotoNode} />}
    </>
  );
}
