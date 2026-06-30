import { GameEngine, parseTime } from '../engine';
import type { Game, Chapter, CarriedState, GameSnapshot, GameRunnerView } from './types';
import { extractCarry, seedChapterStory } from './carry';
import { pickNextChapter } from './transitions';

const EMPTY_CARRY: CarriedState = { vars: {}, clues: [], inventory: [] };
const MAX_TRANSITIONS = 1000; // runaway-cycle guard

export class GameRunner {
  private game: Game;
  private engine!: GameEngine;
  private currentChapterId = '';
  private carriedIn: CarriedState = EMPTY_CARRY;
  private gameElapsedMinutes = 0;
  private gameOver = false;
  private finalEndingId?: string;
  private transitionCount = 0;

  constructor(game: Game) {
    this.game = game;
    this.startChapter(game.startChapterId, EMPTY_CARRY);
  }

  private chapter(id: string): Chapter {
    const c = this.game.chapters.find((x) => x.id === id);
    if (!c) throw new Error(`Unknown chapter: ${id}`);
    return c;
  }

  private startChapter(chapterId: string, carry: CarriedState): void {
    const ch = this.chapter(chapterId);
    this.currentChapterId = chapterId;
    this.carriedIn = carry;
    const seeded = seedChapterStory(ch.story, carry, this.gameElapsedMinutes, this.game.gameDeadlineMinutes, this.game.profile);
    this.engine = new GameEngine(seeded);
    this.settle();
  }

  // If the current chapter has ended, bank its elapsed time and transition (recursively).
  private settle(): void {
    const v = this.engine.view();
    if (!v.endingReached || this.gameOver) return;
    const ch = this.chapter(this.currentChapterId);
    this.gameElapsedMinutes += v.state.time - parseTime(ch.story.startTime);
    if (ch.gameEnding) {
      this.gameOver = true;
      this.finalEndingId = v.endingReached.id;
      return;
    }
    if (++this.transitionCount > MAX_TRANSITIONS) {
      throw new Error(`Transition limit exceeded near chapter ${this.currentChapterId} (cycle?)`);
    }
    const carry = extractCarry(v.state, this.game.carry);
    const next = pickNextChapter(ch, v.state, v.endingReached.id);
    if (!next) { this.gameOver = true; this.finalEndingId = v.endingReached.id; return; }
    this.startChapter(next, carry);
  }

  start(): GameRunnerView { return this.view(); }

  view(): GameRunnerView {
    const v = this.engine.view();
    const ch = this.chapter(this.currentChapterId);
    return {
      ...v,
      chapterId: this.currentChapterId,
      chapterTitle: ch.title,
      gameElapsedMinutes: this.gameElapsedMinutes,
      gameOver: this.gameOver,
      finalEndingId: this.finalEndingId,
    };
  }

  choose(choiceId: string): GameRunnerView {
    if (this.gameOver) return this.view();
    this.engine.choose(choiceId);
    this.settle();
    return this.view();
  }

  snapshot(): GameSnapshot {
    return {
      gameId: this.game.id,
      currentChapterId: this.currentChapterId,
      gameElapsedMinutes: this.gameElapsedMinutes,
      carriedIn: JSON.parse(JSON.stringify(this.carriedIn)) as CarriedState,
      chapter: this.engine.snapshot(),
    };
  }

  // Restore expects a snapshot taken DURING play (no pending un-transitioned ending).
  // FINDING (ENGINE-ASSESSMENT): the engine snapshots one chapter; the game snapshot wraps it with
  // chapter id + game clock + the carry that seeded the chapter.
  restore(snap: GameSnapshot): void {
    if (snap.gameId !== this.game.id) throw new Error(`Snapshot is for game ${snap.gameId}, not ${this.game.id}`);
    this.gameElapsedMinutes = snap.gameElapsedMinutes;
    this.currentChapterId = snap.currentChapterId;
    this.carriedIn = snap.carriedIn;
    this.gameOver = false;
    this.finalEndingId = undefined;
    const ch = this.chapter(snap.currentChapterId);
    const seeded = seedChapterStory(ch.story, snap.carriedIn, snap.gameElapsedMinutes, this.game.gameDeadlineMinutes, this.game.profile);
    this.engine = new GameEngine(seeded);
    this.engine.restore(snap.chapter);
  }
}
