import type { Story, StoryNode, WorldState, GameView, ChoiceView, Ending, EngineSnapshot } from './types';
import { initState } from './state';
import { evaluateConditions, explainFailing } from './conditions';
import { applyEffects } from './effects';
import { checkScheduledEvents } from './scheduledEvents';
import { resolveEndingAt } from './endingResolver';
import { parseTime, formatTime } from './time';
import { buildBounds, type BoundsMap } from './bounds';
import { applyResourceStep } from './resources';

export class GameEngine {
  private story: Story;
  private state: WorldState;
  private currentId: string;
  private deadline: number;
  private startTime: number;
  private bounds: BoundsMap;
  private log: string[] = [];
  private ending?: Ending;

  constructor(story: Story) {
    this.story = story;
    this.state = initState(story);
    this.currentId = story.startNodeId;
    this.deadline = story.deadline !== undefined ? parseTime(story.deadline) : Infinity;
    this.startTime = parseTime(story.startTime);
    this.bounds = buildBounds(story);
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
    this.state = applyEffects(this.state, n.entryEffects, this.bounds);
    if (!this.state.visited.includes(id)) {
      this.state = { ...this.state, visited: [...this.state.visited, id] };
    }
    // Scheduled events fire from world-time, judged at the node we have fully arrived at
    // (after entry effects) so any clock advance — choice OR entry effect — is seen exactly
    // once. checkScheduledEvents marks each fired event completed, so the recursive re-entry
    // a "present" event triggers cannot re-fire it.
    const res = checkScheduledEvents(this.state, this.story, this.bounds);
    this.state = res.state;
    if (res.log.length) this.log.push(...res.log);
    if (res.routedNodeId && res.routedNodeId !== id) {
      this.enter(res.routedNodeId);
      return;
    }
    // Resource depletion + at-zero, after any clock advance is settled at this node.
    const rstep = applyResourceStep(this.state, this.story, this.startTime);
    this.state = rstep.state;
    if (rstep.log.length) this.log.push(...rstep.log);
    // Unified ending resolution (A3): node-named (F8) > priority[state + atZero] (H3) > out-of-time (H4)
    // > default. atZero no longer short-circuits — it competes by priority with state-matched endings.
    const pastDeadline = this.state.time >= this.deadline;
    if (!this.ending && (n.resolvesEnding || n.endsWith || rstep.atZeroEndingId || pastDeadline)) {
      this.ending = resolveEndingAt(this.state, this.story, n, rstep.atZeroEndingId, pastDeadline);
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
    this.state = applyEffects(this.state, choice.effects, this.bounds);
    this.enter(choice.destination);
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
