/**
 * An untimed 2-chapter reference game proving that UNTIMED_BRANCHING works at the Game level.
 *
 * Design rules (exactly those that untimed-branching.md codifies):
 *   ✓  Game.profile = UNTIMED_BRANCHING
 *   ✓  No gameDeadlineMinutes
 *   ✓  No chapter deadline
 *   ✓  No outOfTimeEndingId
 *   ✓  No time-driven resources (no `depletion`)
 *   ✓  No clock-reading conditions (no time_* ops, no field:'time' reads)
 *   ✓  No add_minutes effects — the clock never moves; the walker's state space stays small
 *   ✓  State-gated endings: priority + a default
 *   ✓  Latches set by unconditional entryEffects (not choice effects) to avoid LATCH_IN_CHOICE_EFFECT
 *
 * Narrative: a two-scene negotiation.  Ch1 = the archive (find the note or leave).
 *            Ch2 = the meeting (present / speak up / keep quiet → three outcomes).
 */

import type { Story } from '../engine';
import { UNTIMED_BRANCHING } from '../engine';
import type { Game } from './types';

// ---------------------------------------------------------------------------
// Chapter 1 — The Archive
// ---------------------------------------------------------------------------
// `found_note` (boolean latch) is set by the ch1_ledger entry effect, then read by the ch1_note_taken
// ending.  Carrying vars:'all' brings it into ch2 but ch2 never reads it — the meeting's outcome depends
// only on what the player does there, not on the note (the point: carry flows, ch2 stays self-contained).
// ---------------------------------------------------------------------------
const ch1Story: Story = {
  id: 'untimed_ch1',
  title: 'The Archive',
  startNodeId: 'ch1_start',
  startTime: '00:00',
  // no deadline — untimed
  startLocation: 'archive',
  variables: [
    { name: 'found_note', type: 'boolean', default: false, purpose: 'player found and pocketed the ledger note' },
  ],
  locations: [{ id: 'archive', name: 'The Archive' }],
  events: [],
  nodes: [
    {
      id: 'ch1_start',
      title: 'The Darkened Archive',
      body: 'Dust motes drift in the dim light. A ledger lies open on the table.',
      choices: [
        { id: 'search_ledger', label: 'Search the ledger', destination: 'ch1_ledger' },
        { id: 'leave_now',     label: 'Leave at once',     destination: 'ch1_done'   },
      ],
    },
    {
      id: 'ch1_ledger',
      title: 'The Ledger',
      body: 'A folded note falls from between the pages. You pocket it.',
      // Latch set by entryEffect (not choice effect) — avoids the LATCH_IN_CHOICE_EFFECT warning.
      entryEffects: [{ field: 'found_note', op: 'set', value: 'true' }],
      resolvesEnding: true,
      choices: [],
    },
    {
      id: 'ch1_done',
      title: 'The Corridor',
      body: 'You step out, empty-handed.',
      resolvesEnding: true,
      choices: [],
    },
  ],
  endings: [
    {
      id: 'ch1_note_taken',
      name: 'Note in Hand',
      conditions: [{ field: 'found_note', op: 'is_true' }],
      priority: 1,
      summary: 'Left the archive with the note',
    },
    {
      id: 'ch1_departed',
      name: 'Empty-Handed',
      conditions: [],
      isDefault: true,
      summary: 'Left without the note',
    },
  ],
};

// ---------------------------------------------------------------------------
// Chapter 2 — The Meeting  (game-ending)
// ---------------------------------------------------------------------------
// `trust` is a choice-driven resource (no depletion) — modified by entry effects only.
// Three unconditional choices produce three distinct trust/made_case states → three priority-gated endings.
// The walker can reach all three endings from ch2's standalone defaults.
// ---------------------------------------------------------------------------
const ch2Story: Story = {
  id: 'untimed_ch2',
  title: 'The Meeting',
  startNodeId: 'ch2_start',
  startTime: '00:00',
  // no deadline — untimed
  startLocation: 'meeting_room',
  variables: [
    { name: 'made_case', type: 'boolean', default: false, purpose: 'player presented their case directly' },
  ],
  resources: [
    {
      id: 'trust',
      label: 'Trust',
      min: 0,
      max: 5,
      start: 0,
      // no depletion — choice-driven only; the clock never touches this resource
    },
  ],
  locations: [{ id: 'meeting_room', name: 'Meeting Room' }],
  events: [],
  nodes: [
    {
      id: 'ch2_start',
      title: 'The Contact',
      body: 'The contact sits across the table, studying you.',
      choices: [
        { id: 'make_case',  label: 'Lay out your case',    destination: 'ch2_stated'  },
        { id: 'speak_up',   label: 'Speak up, stay honest', destination: 'ch2_spoken'  },
        { id: 'keep_quiet', label: 'Say nothing',           destination: 'ch2_silent'  },
      ],
    },
    {
      id: 'ch2_stated',
      title: 'The Case',
      body: 'You put it all on the table. The contact listens without blinking.',
      // made_case latch + trust boost set by entryEffect (not choice effect).
      entryEffects: [
        { field: 'made_case', op: 'set',       value: 'true' },
        { field: 'trust',     op: 'increment', value: '2'    },
      ],
      resolvesEnding: true,
      choices: [],
    },
    {
      id: 'ch2_spoken',
      title: 'Words Alone',
      body: 'You speak carefully. The contact nods once.',
      entryEffects: [
        { field: 'trust', op: 'increment', value: '1' },
      ],
      resolvesEnding: true,
      choices: [],
    },
    {
      id: 'ch2_silent',
      title: 'The Silence',
      body: 'You say nothing. The contact waits, then rises.',
      resolvesEnding: true,
      choices: [],
    },
  ],
  endings: [
    // priority 2 — presented the case directly: trust = 2, made_case = true
    {
      id: 'deal_closed',
      name: 'Deal Closed',
      conditions: [{ field: 'made_case', op: 'is_true' }],
      priority: 2,
      summary: 'Presented the case; deal sealed',
    },
    // priority 1 — spoke up but did not lay everything out: trust = 1, made_case = false
    {
      id: 'deal_partial',
      name: 'Something Gained',
      conditions: [{ field: 'trust', op: 'gt', value: '0' }],
      priority: 1,
      summary: 'Spoke up; partial result',
    },
    // default — said nothing: trust = 0, made_case = false
    {
      id: 'deal_blown',
      name: 'Nothing to Show',
      conditions: [],
      isDefault: true,
      summary: 'Said nothing; contact walks',
    },
  ],
};

// ---------------------------------------------------------------------------
// The Game
// ---------------------------------------------------------------------------
export const untimedExample: Game = {
  id: 'untimed_example',
  title: 'The Archive Contact',
  startChapterId: 'ch1',
  profile: UNTIMED_BRANCHING,
  // no gameDeadlineMinutes — the game is untimed end-to-end
  carry: { vars: 'all', resources: [], clues: false, inventory: false },
  chapters: [
    {
      id: 'ch1',
      title: 'The Archive',
      story: ch1Story,
      // catch-all: both ch1 endings transition unconditionally to ch2
      transitions: [{ when: {}, goTo: 'ch2' }],
    },
    {
      id: 'ch2',
      title: 'The Meeting',
      story: ch2Story,
      gameEnding: true,
      transitions: [],
    },
  ],
};
