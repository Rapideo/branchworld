export type Primitive = string | number | boolean;

export type ConditionOp =
  | 'equals' | 'not_equals' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'is_true' | 'is_false' | 'has_clue' | 'has_visited'
  | 'time_before' | 'time_after' | 'time_between';

export interface Condition {
  field: string;
  op: ConditionOp;
  value?: string;        // time_between uses "HH:MM-HH:MM"
  description?: string;
}

export type EffectOp =
  | 'set' | 'increment' | 'decrement'
  | 'add_item' | 'remove_item' | 'add_clue' | 'remove_clue'
  | 'change_location' | 'add_minutes'
  | 'mark_event_completed' | 'mark_visited';

export interface Effect {
  field: string;
  op: EffectOp;
  value?: string;
}

export interface Choice {
  id: string;
  label: string;
  destination: string;   // node id; must not be an ending id (linted)
  conditions?: Condition[];
  effects?: Effect[];
  description?: string;
}

export type NodeType =
  | 'scene' | 'conversation' | 'event' | 'discovery'
  | 'transition' | 'ending' | 'system' | 'location';

export interface StoryNode {
  id: string;
  title: string;
  body: string;
  type?: NodeType;
  location?: string;
  conditions?: Condition[];     // availability (used for location-based selection later)
  entryEffects?: Effect[];
  choices: Choice[];
  resolvesEnding?: boolean;     // entering this node triggers the ending resolver
  authorTimeHint?: string;      // editor-only; engine never reads this for logic
  repeatable?: boolean;
  tags?: string[];
}

export interface Location {
  id: string;
  name: string;
  description?: string;
  connectedLocations?: string[];
  travelTimes?: Record<string, number>;
  defaultNode?: string;
}

export interface ScheduledEvent {
  id: string;
  title: string;
  trigger: Condition[];         // e.g. [{field:'time',op:'time_after',value:'16:10'}]
  eventLocation: string;        // where "present" is judged
  ifPresentNode: string;        // node routed to when player is present
  ifAbsentEffects: Effect[];    // applied when player is absent
  recoveryNodeId: string;       // reachable node that surfaces the clue after absence
}

export interface Ending {
  id: string;
  name: string;
  conditions: Condition[];      // empty only for the default
  summary: string;
  body?: string;
  priority?: number;
  isDefault?: boolean;
}

export interface VariableDef {
  name: string;
  type: 'boolean' | 'number' | 'string';
  default: Primitive;
  purpose: string;              // single semantic meaning
  label?: string;
}

export interface Story {
  id: string;
  title: string;
  startNodeId: string;
  startTime: string;            // "HH:MM"
  deadline: string;             // "HH:MM"
  startLocation: string;
  variables: VariableDef[];
  nodes: StoryNode[];
  locations: Location[];
  events: ScheduledEvent[];
  endings: Ending[];            // ordered; exactly one isDefault with empty conditions
}

export interface WorldState {
  time: number;                 // minutes; engine-derived single source of truth
  location: string;
  clues: string[];
  inventory: string[];
  visited: string[];
  completedEvents: string[];
  vars: Record<string, Primitive>;
}

export interface ChoiceView {
  id: string;
  label: string;
  available: boolean;
  lockedReason?: string;
}

export interface GameView {
  node: StoryNode;
  time: number;
  timeLabel: string;
  location: string;
  choices: ChoiceView[];
  state: WorldState;
  log: string[];
  endingReached?: Ending;
}

export interface LintIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
  where?: string;
}

export interface LintResult {
  ok: boolean;
  errors: LintIssue[];
  warnings: LintIssue[];
}

export interface EngineSnapshot {
  version: 1;
  storyId: string;
  currentId: string;
  state: WorldState;
  log: string[];
  endingId?: string;
}
