export type Primitive = string | number | boolean;

export type ConditionOp =
  | 'equals' | 'not_equals' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'is_true' | 'is_false' | 'has_clue' | 'has_visited' | 'has_item'
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
  | 'change_location' | 'add_minutes' | 'adjust_resource'
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
  endsWith?: string;            // A3/F8: resolve directly to this ending id (node-named), overriding the state resolver
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

export interface ResourceDepletion {
  everyMinutes: number;   // time-driven: lose `amount` every `everyMinutes` of clock
  amount: number;
}

export interface ResourceAtZero {
  ending?: string;        // resolve to this ending when the resource reaches min
  setFlag?: string;       // set this boolean var true when the resource reaches min
}

export interface Resource {
  id: string;             // stored in WorldState.vars[id] as a number
  label?: string;         // for an optional player meter (debug shows it for free)
  min: number;
  max: number;
  start: number;
  depletion?: ResourceDepletion;  // present => time-driven (recomputed); absent => choice-driven (stored)
  atZero?: ResourceAtZero;        // fires once-effectively when value reaches min
  hidden?: boolean;               // omit from the player meter (still in debug)
}

export interface VariableDef {
  name: string;
  type: 'boolean' | 'number' | 'string';
  kind?: 'item';                // tags a number var as an inventory item (front-end backpack + lint)
  default: Primitive;
  purpose: string;              // single semantic meaning
  label?: string;
  min?: number;                 // optional numeric lower bound (clamped by the engine)
  max?: number;                 // optional numeric upper bound (clamped by the engine)
}

export type ClockMode = 'timed' | 'untimed'; // 'long-horizon' reserved as a future value of this dimension
export interface Profile {
  clock: ClockMode;
  // future dimensions slot in here as OPTIONAL fields: travel?: 'off' | 'free'; investigation?: 'off' | 'on'; …
}

export interface Story {
  id: string;
  title: string;
  startNodeId: string;
  startTime: string;            // "HH:MM"
  deadline?: string;            // "HH:MM" — required for timed stories; absent for untimed
  startLocation: string;
  variables: VariableDef[];
  nodes: StoryNode[];
  locations: Location[];
  events: ScheduledEvent[];
  endings: Ending[];            // ordered; exactly one isDefault with empty conditions
  resources?: Resource[];
  outOfTimeEndingId?: string;   // A3/H4: distinct "the clock chose" ending when the deadline forces resolution with no match
  profile?: Profile;
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
