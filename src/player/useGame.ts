import { useRef, useState } from 'react';
import { GameEngine } from '../engine';
import type { Story, GameView, EngineSnapshot } from '../engine';

export interface UseGame {
  view: GameView;
  choose(choiceId: string): void;
  reset(): void;
  gotoNode(id: string): void;
  snapshot(): EngineSnapshot;
  restore(snap: EngineSnapshot): void;
}

export function useGame(story: Story, startAtNodeId?: string): UseGame {
  const engineRef = useRef<GameEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new GameEngine(story);
    if (startAtNodeId) engineRef.current.gotoNode(startAtNodeId);
  }
  const [view, setView] = useState<GameView>(() => engineRef.current!.view());

  return {
    view,
    choose: (id) => { engineRef.current!.choose(id); setView(engineRef.current!.view()); },
    reset: () => { engineRef.current = new GameEngine(story); setView(engineRef.current.view()); },
    gotoNode: (id) => { engineRef.current!.gotoNode(id); setView(engineRef.current!.view()); },
    snapshot: () => engineRef.current!.snapshot(),
    restore: (snap) => { engineRef.current!.restore(snap); setView(engineRef.current!.view()); },
  };
}
