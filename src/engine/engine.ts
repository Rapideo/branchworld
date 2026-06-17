import type { Story, StoryNode, WorldState, GameView, ChoiceView, Ending, EngineSnapshot } from './types';
import { initState } from './state';
import { evaluateConditions, explainFailing } from './conditions';
import { applyEffects } from './effects';
import { checkScheduledEvents } from './scheduledEvents';
import { resolveEnding } from './endingResolver';
import { parseTime, formatTime } from './time';

export class GameEngine {
  private story: Story;
  private state: WorldState;
  private currentId: string;
  private deadline: number;
  private log: string[] = [];
  private ending?: Ending;

  constructor(story: Story) {
    this.story = story;
    this.state = initState(story);
    this.currentId = story.startNodeId;
    this.deadline = parseTime(story.deadline);
    this.enter(this.currentId);
  }

  private node(id: string): StoryNode {
    const n = this.story.nodes.find((x) => x.id === id);
    if (!n) throw new Error(`Unknown node: ${id}`);
    return n;
  }

  private enter(id: string): void {
    this.currentId = id;
    const n = this.node(id);
    this.state = applyEffects(this.state, n.entryEffects);
    if (!this.state.visited.includes(id)) {
      this.state = { ...this.state, visited: [...this.state.visited, id] };
    }
    if (!this.ending && (n.resolvesEnding || this.state.time >= this.deadline)) {
      this.ending = resolveEnding(this.state, this.story);
      if (this.ending) this.log.push(`Ending: ${this.ending.id}`);
    }
  }

  start(): GameView {
    return this.view();
  }

  view(): GameView {
    const n = this.node(this.currentId);
    const choices: ChoiceView[] = (n.choices || []).map((c) => {
      const ok = evaluateConditions(c.conditions, this.state);
      return ok
        ? { id: c.id, label: c.label, available: true }
        : { id: c.id, label: c.label, available: false, lockedReason: explainFailing(c.conditions, this.state) };
    });
    return {
      node: n,
      time: this.state.time,
      timeLabel: formatTime(this.state.time),
      location: this.state.location,
      choices,
      state: this.state,
      log: [...this.log],
      endingReached: this.ending,
    };
  }

  choose(choiceId: string): GameView {
    if (this.ending) return this.view();
    const n = this.node(this.currentId);
    const choice = (n.choices || []).find((c) => c.id === choiceId);
    if (!choice) throw new Error(`Unknown choice: ${choiceId}`);
    if (!evaluateConditions(choice.conditions, this.state)) {
      throw new Error(`Choice not available: ${choiceId}`);
    }
    this.state = applyEffects(this.state, choice.effects);
    const res = checkScheduledEvents(this.state, this.story);
    this.state = res.state;
    this.log.push(...res.log);
    const nextId = res.routedNodeId ?? choice.destination;
    this.enter(nextId);
    return this.view();
  }

  snapshot(): EngineSnapshot {
    return {
      version: 1,
      storyId: this.story.id,
      currentId: this.currentId,
      state: JSON.parse(JSON.stringify(this.state)) as WorldState,
      log: [...this.log],
      endingId: this.ending?.id,
    };
  }

  restore(snap: EngineSnapshot): void {
    if (snap.version !== 1) throw new Error(`Unsupported snapshot version: ${snap.version}`);
    if (snap.storyId !== this.story.id) {
      throw new Error(`Snapshot is for story ${snap.storyId}, not ${this.story.id}`);
    }
    this.state = JSON.parse(JSON.stringify(snap.state)) as WorldState;
    this.currentId = snap.currentId;
    this.log = [...snap.log];
    this.ending = snap.endingId ? this.story.endings.find((e) => e.id === snap.endingId) : undefined;
  }

  gotoNode(id: string): GameView {
    this.enter(id);
    return this.view();
  }
}
