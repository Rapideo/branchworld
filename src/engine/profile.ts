import type { Story, Condition, Profile } from './types';

export type { Profile, ClockMode } from './types';

export interface ProfileIssue { code: string; message: string; where?: string; }

// A dimension is self-contained: its legal values, the value applied when a story omits it (powers
// normalization), and a validator that flags story-vs-declared-value conflicts.
export interface Dimension {
  id: keyof Profile;
  values: readonly string[];
  default: string;
  validate(story: Story, value: string): ProfileIssue[];
}

const REC = "use preset TIME_PRESSURE_SURVIVAL (clock:'timed') to keep these, or remove them to stay untimed";
const TIME_OPS = new Set(['time_before', 'time_after', 'time_between']);
const CLOCK_READING_OPS = new Set(['equals', 'not_equals', 'gt', 'gte', 'lt', 'lte', 'is_true', 'is_false', 'has_item']);
// A condition reads the live clock if it uses a time_* op OR reads the reserved 'time' field with any value op
// (the engine resolves field:'time' to state.time for every value-reading op — see conditions.ts/state.ts).
export const readsClock = (c: Condition) => TIME_OPS.has(c.op) || (c.field === 'time' && CLOCK_READING_OPS.has(c.op));

function clockReadingHits(story: Story): { op: string; where: string }[] {
  const hits: { op: string; where: string }[] = [];
  const scan = (cs: Condition[] | undefined, where: string) => {
    for (const c of cs ?? []) if (readsClock(c)) hits.push({ op: c.op, where });
  };
  for (const n of story.nodes) {
    scan(n.conditions, `node ${n.id}`);
    for (const ch of n.choices ?? []) scan(ch.conditions, `choice ${ch.id}`);
  }
  for (const ev of story.events) scan(ev.trigger, `event ${ev.id}`);
  for (const en of story.endings) scan(en.conditions, `ending ${en.id}`);
  return hits;
}

export const clockDimension: Dimension = {
  id: 'clock',
  values: ['timed', 'untimed'],
  default: 'timed',
  validate(story, value) {
    const issues: ProfileIssue[] = [];
    if (value === 'timed') {
      if (story.deadline === undefined) issues.push({ code: 'PROFILE_TIMED_NEEDS_DEADLINE', message: "profile clock:'timed' requires a deadline" });
    } else if (value === 'untimed') {
      if (story.deadline !== undefined) issues.push({ code: 'PROFILE_UNTIMED_HAS_DEADLINE', message: `clock:'untimed' but the story has a deadline '${story.deadline}' — ${REC}` });
      if (story.outOfTimeEndingId) issues.push({ code: 'PROFILE_UNTIMED_HAS_OOT_ENDING', message: `clock:'untimed' but outOfTimeEndingId '${story.outOfTimeEndingId}' is set (it can never fire) — ${REC}`, where: story.outOfTimeEndingId });
      for (const r of story.resources ?? []) if (r.depletion) issues.push({ code: 'PROFILE_UNTIMED_HAS_TIME_RESOURCE', message: `clock:'untimed' but resource '${r.id}' is time-driven (has depletion) — ${REC}`, where: r.id });
      for (const h of clockReadingHits(story)) issues.push({ code: 'PROFILE_UNTIMED_HAS_TIME_CONDITION', message: `clock:'untimed' but a clock-reading condition (${h.op}) appears in ${h.where} — ${REC}`, where: h.where });
    }
    return issues;
  },
};

export const travelDimension: Dimension = {
  id: 'travel',
  values: ['off', 'free'],
  default: 'off',
  // Travel's lints (structural + roam-precondition, mixed error/warning levels) live in travelLint.ts,
  // called from lintStory — the Dimension.validate→ProfileIssue hook is error-only and lacks lint context.
  validate: () => [],
};

export const investigationDimension: Dimension = {
  id: 'investigation',
  values: ['off', 'on'],
  default: 'off',
  // Investigation's lints (fence + hygiene) live in investigationLint.ts, called from lintStory — the
  // Dimension.validate hook is error-only and lacks lint context, same pattern as travel.
  validate: () => [],
};

const DIMENSIONS: Dimension[] = [clockDimension, travelDimension, investigationDimension];

// Derived from the dimensions' defaults so it can never drift from them.
export const DEFAULT_PROFILE: Profile = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d.default])) as unknown as Profile;

// A FULLY-NORMALIZED profile — every dimension has a value. Precedence (specific wins):
// the story's own profile > the inherited (game) profile > the dimension defaults.
export function resolveProfile(story: Story, inherited?: Profile): Profile {
  return { ...DEFAULT_PROFILE, ...inherited, ...story.profile } as Profile;
}

export function validateProfile(story: Story, inherited?: Profile): ProfileIssue[] {
  const profile = resolveProfile(story, inherited);
  const issues: ProfileIssue[] = [];
  for (const dim of DIMENSIONS) issues.push(...dim.validate(story, profile[dim.id] ?? dim.default));
  // cross-dimension incompatiblePairs — empty in v1. Reframed (travel spec rev 2): dimensions carry per-dimension
  // REQUIREMENTS, not binary forbids; the forbid hook is gated on the D2 corpus (kept only if a real forbid appears).
  return issues;
}

// Named presets — the "recommended sets". Each pairs with an authoring guide under docs/authoring/.
export const TIME_PRESSURE_SURVIVAL: Profile = { clock: 'timed' };
export const UNTIMED_BRANCHING: Profile = { clock: 'untimed' };
