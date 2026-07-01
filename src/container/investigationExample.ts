/**
 * Investigation reference game — "The Locked Study"
 *
 * Proves the investigation:'on' profile dimension works end-to-end:
 *   - Examinables inject __examine_<id> choices at runtime
 *   - Time-cost hotspots create a real tradeoff (the red herring costs you the win)
 *   - verifyInvestigation certifies timed completability via satisfiedEndings
 *
 * Numbers (load-bearing — see brief):
 *   deadline window   = 60 min  (09:00 → 10:00)
 *   3 LB hotspots     = 15 min each  → win path = 45 min ≤ 60 ✓
 *   red herring       = 20 min       → Σ all four = 65 ≥ 60 (CLOCK_CANNOT_BITE silent ✓)
 *   herring + 3 LB    = 65 min > 60  (the herring genuinely kills the run ✓)
 *
 * Exports:
 *   investigationStudy            — timed Story, the clean reference
 *   investigationStudyUntimed     — untimed Story (no deadline, no minutes)
 *   investigationStudyUnreachable — 30-min LB hotspots: 3×30=90>60 → INVESTIGATION_DEADLINE_UNREACHABLE
 *   investigationStudyEndsWith    — 30-min LB + verdict.endsWith pin → P0 false-pass guard (ok=false)
 *   investigationExample          — single-chapter Game wrapping investigationStudy
 *   bareChapterInvestigationGame  — factory: same Game but chapter profile stripped of investigation:'on'
 */

import type { Story, Examinable, StoryNode } from '../engine';
import type { Game } from './types';

// ---------------------------------------------------------------------------
// Helpers for building story variants without deep duplication
// ---------------------------------------------------------------------------

const LB_MINUTES = 15;    // load-bearing hotspot cost (win path: 3 × 15 = 45 ≤ 60)
const HERRING_MINUTES = 20; // red herring cost (65 total ≥ 60, herring kills the run)

/** The four examinables for the study node — parameterised by LB minutes so variants can override. */
function makeExaminables(lbMinutes: number | undefined, herringMinutes: number | undefined): Examinable[] {
  return [
    {
      id: 'desk',
      label: 'Search the writing desk',
      clue: 'debt_receipt',
      reveal: 'Beneath a sheaf of correspondence you find a receipt — Alderton settled a substantial personal debt two days ago. The creditor is his business partner, Caldwell.',
      minutes: lbMinutes,
    },
    {
      id: 'ledger',
      label: 'Examine the account ledger',
      clue: 'ledger_gap',
      reveal: 'October\'s column shows a gap of exactly three hundred pounds, overwritten in a different ink. Someone altered this ledger after the last audit — and Caldwell holds the only other office key.',
      minutes: lbMinutes,
    },
    {
      id: 'painting',
      label: 'Look behind the painting',
      clue: 'safe_combo',
      reveal: 'The landscape conceals a wall safe. The dial has been wiped, but Alderton scratched four digits into the plaster beside it — a combination he could not trust himself to remember. The safe is empty.',
      minutes: lbMinutes,
    },
    {
      id: 'ashtray',
      label: 'Inspect the cigar ashtray',
      clue: 'cigar_brand',
      reveal: 'A Honduran blend, expensive but widely imported. Alderton smoked them; so did half the club. You spend twenty minutes cataloguing ash and find nothing more than a brand name.',
      minutes: herringMinutes,
    },
  ];
}

/** The study node — examinables parameterised by variant. */
function makeStudyNode(examinables: Examinable[]): StoryNode {
  return {
    id: 'study',
    title: 'The Study',
    body: 'The room where Alderton died. Heavy curtains, a writing desk strewn with papers, an account ledger on a stand, a landscape painting slightly off-plumb, and on the mantelpiece an ashtray holding a half-burned cigar.',
    examinables,
    choices: [
      {
        id: 'accuse_partner',
        label: 'Accuse Caldwell, the business partner',
        destination: 'verdict',
        conditions: [
          { field: 'debt_receipt', op: 'has_clue' },
          { field: 'ledger_gap', op: 'has_clue' },
          { field: 'safe_combo', op: 'has_clue' },
        ],
      },
      {
        id: 'accuse_housekeeper',
        label: 'Accuse the housekeeper for want of a better suspect',
        destination: 'verdict',
      },
    ],
  };
}

const verdictNode: StoryNode = {
  id: 'verdict',
  title: 'The Accusation',
  body: 'You deliver your verdict to the constable. The room goes very quiet.',
  resolvesEnding: true,
  choices: [],
};

/** Verdict node pinned to accuse_partner via endsWith (used by the P0 endsWith fixture). */
const verdictEndsWith: StoryNode = {
  id: 'verdict',
  title: 'The Accusation',
  body: 'You deliver your verdict to the constable. The room goes very quiet.',
  endsWith: 'accuse_partner',
  choices: [],
};

// ---------------------------------------------------------------------------
// Clean timed Story — the reference
// ---------------------------------------------------------------------------
export const investigationStudy: Story = {
  id: 'investigation_study',
  title: 'The Locked Study',
  startNodeId: 'study',
  startTime: '09:00',
  deadline: '10:00',
  startLocation: 'study_room',
  profile: { clock: 'timed', investigation: 'on' },
  variables: [],
  locations: [{ id: 'study_room', name: 'The Locked Study' }],
  events: [],
  nodes: [
    makeStudyNode(makeExaminables(LB_MINUTES, HERRING_MINUTES)),
    verdictNode,
  ],
  endings: [
    {
      id: 'accuse_partner',
      name: 'Justice: Caldwell Arrested',
      conditions: [
        { field: 'debt_receipt', op: 'has_clue' },
        { field: 'ledger_gap', op: 'has_clue' },
        { field: 'safe_combo', op: 'has_clue' },
      ],
      priority: 1,
      summary: 'The receipt, the ledger gap, and the empty safe — three chains that bind Caldwell to the deed. He is arrested before nightfall.',
    },
    {
      id: 'wrong_accusation',
      name: 'Wrong Accusation',
      conditions: [],
      isDefault: true,
      summary: 'The accusation does not hold. Whoever killed Alderton walks free — at least for now.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Untimed variant — no deadline, no time costs on hotspots.
// verifyInvestigation passes because clock:'untimed' → completable short-circuits.
// ---------------------------------------------------------------------------
export const investigationStudyUntimed: Story = {
  ...investigationStudy,
  id: 'investigation_study_untimed',
  deadline: undefined,
  profile: { clock: 'untimed', investigation: 'on' },
  nodes: [
    makeStudyNode(makeExaminables(undefined, undefined)),
    verdictNode,
  ],
};

// ---------------------------------------------------------------------------
// Unreachable variant — load-bearing hotspots each 30 min.
// 3 × 30 = 90 min > 60-min window → no terminal within the deadline holds all
// three LB clues → INVESTIGATION_DEADLINE_UNREACHABLE.
// ---------------------------------------------------------------------------
export const investigationStudyUnreachable: Story = {
  ...investigationStudy,
  id: 'investigation_study_unreachable',
  nodes: [
    makeStudyNode(makeExaminables(30, HERRING_MINUTES)),
    verdictNode,
  ],
};

// ---------------------------------------------------------------------------
// endsWith P0 fixture — 30-min LB hotspots AND verdict.endsWith:'accuse_partner'.
//
// The endsWith pin causes the engine to resolve 'accuse_partner' on ANY path to
// verdict (regardless of clue state). A naive "did the ending fire?" check would
// report ok=true. computeSatisfiedEndings guards against this: it re-evaluates the
// ending's CONDITIONS at the terminal state. No terminal within the 60-min window
// can hold all three LB clues (3×30=90>60), so accuse_partner never appears in
// satisfiedEndings → verifyInvestigation correctly returns ok=false.
// ---------------------------------------------------------------------------
export const investigationStudyEndsWith: Story = {
  ...investigationStudyUnreachable,
  id: 'investigation_study_ends_with',
  nodes: [
    investigationStudyUnreachable.nodes[0],
    verdictEndsWith,
  ],
};

// ---------------------------------------------------------------------------
// Game wrappers
// ---------------------------------------------------------------------------

export const investigationExample: Game = {
  id: 'investigation_example',
  title: 'The Locked Study',
  startChapterId: 'inv_ch1',
  profile: { clock: 'timed', investigation: 'on' },
  carry: { vars: 'all', resources: [], clues: false, inventory: false },
  chapters: [
    {
      id: 'inv_ch1',
      title: 'The Locked Study',
      story: investigationStudy,
      gameEnding: true,
      transitions: [],
    },
  ],
};

/**
 * Factory: the timed Game but with the chapter's story.profile stripped of
 * investigation:'on'. The game.profile carries investigation:'on'; seedChapterStory
 * stamps the resolved profile at runtime (resolveProfile(story, gameProfile)).
 * Proves Task 1's profile-stamp closes the silent-failure class for investigation.
 */
export function bareChapterInvestigationGame(): Game {
  const storyStripped: Story = { ...investigationStudy, profile: { clock: 'timed' } };
  return {
    id: 'investigation_bare',
    title: 'The Locked Study (Bare Chapter)',
    startChapterId: 'inv_bare_ch1',
    profile: { clock: 'timed', investigation: 'on' },
    carry: { vars: 'all', resources: [], clues: false, inventory: false },
    chapters: [
      {
        id: 'inv_bare_ch1',
        title: 'The Locked Study',
        story: storyStripped,
        gameEnding: true,
        transitions: [],
      },
    ],
  };
}
