import type { Story, Condition, Primitive, GameView, EngineSnapshot, Profile } from '../engine';

/** A rule evaluated when a chapter ends; first match wins. Empty `when` = catch-all. */
export interface ChapterTransition {
  when: { endingId?: string; conditions?: Condition[] };
  goTo: string; // id of the next chapter
}

export interface Chapter {
  id: string;
  title: string;
  story: Story;           // a normal engine Story (own nodes, own clock, own endings)
  gameEnding?: boolean;   // if true, reaching an ending here ends the whole game
  transitions: ChapterTransition[]; // evaluated in order on chapter end
  carriedRequired?: string[]; // A1 v1.1: vars this chapter requires an ANCESTOR chapter to produce (else its default silently carries)
}

export interface CarryContract {
  vars: 'all' | string[];
  resources: string[];    // game-level resource ids whose value carries (start rebased next chapter)
  clues: boolean;
  inventory: boolean;
}

export interface Game {
  id: string;
  title: string;
  startChapterId: string;
  chapters: Chapter[];
  carry: CarryContract;
  profile?: Profile;                   // game-wide inherited default; a chapter's own story.profile overrides it
  gameDeadlineMinutes?: number; // optional overall survival horizon (container-projected)
  domains?: Record<string, string[]>;  // A1 v1.1: a var -> its legal value set (annotated, zero-FP DOMAIN check)
  mutexLatches?: string[][];           // A1 v1.1: groups of mutually-exclusive latches (an ending asserting one must exclude its partners)
}

export interface CarriedState {
  vars: Record<string, Primitive>;
  clues: string[];
  inventory: string[];
}

export interface GameSnapshot {
  gameId: string;
  currentChapterId: string;
  gameElapsedMinutes: number; // elapsed at the START of the current chapter
  carriedIn: CarriedState;    // the carry used to seed the current chapter
  chapter: EngineSnapshot;    // the current chapter engine's snapshot
}

export interface GameRunnerView extends GameView {
  chapterId: string;
  chapterTitle: string;
  gameElapsedMinutes: number;
  gameOver: boolean;
  finalEndingId?: string;
}
