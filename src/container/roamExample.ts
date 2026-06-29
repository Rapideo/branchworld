/**
 * Roam reference games — prove that the travel:'free' mechanic works end-to-end.
 *
 * Three exports:
 *   roamExample       — untimed, single-chapter, travel:'free'; the clean reference.
 *   roamExampleTimed  — timed variant with a time_after gate; exercises bucket alignment.
 *   roamStranded      — a Story with an unreachable-from-ending region; co-reachability bites.
 *
 * Narrative: Three halls of an old mansion.
 *   atrium  — the starting point; a study alcove to explore locally.
 *   library — holds the vault key (a latch set by unconditional entryEffect on library_gem).
 *   vault   — the vault door; the good ending requires the key from the library.
 *
 * The map is symmetric and reconvergent: every hub is directly connected to the other two.
 * Cross-location coupling: key_found (written in the library) gates vault_opened at the vault.
 *
 * Design rules (mirror untimedExample.ts):
 *   ✓  Latches set by unconditional entryEffects (not choice effects) → no LATCH_IN_CHOICE_EFFECT
 *   ✓  A default (catch-all) ending at the vault
 *   ✓  Symmetric connectedLocations and travelTimes on both sides of every edge
 *   ✓  No hub node has resolvesEnding (avoids TRAVEL_HUB_IS_TERMINAL warning)
 *   ✓  No authored choice id starts with '__' (reserved for engine-injected travel choices)
 *   ✓  story.profile declares travel:'free' directly (ROAM_CHAPTER_PROFILE_MISSING guard)
 */

import type { Story } from '../engine';
import type { Game } from './types';

// ---------------------------------------------------------------------------
// Untimed chapter story
// ---------------------------------------------------------------------------
const roamStory: Story = {
  id: 'roam_story',
  title: 'The Three Halls',
  startNodeId: 'atrium_hub',
  startTime: '00:00',
  // no deadline — untimed
  startLocation: 'atrium',
  profile: { clock: 'untimed', travel: 'free' },
  variables: [
    {
      name: 'key_found',
      type: 'boolean',
      default: false,
      purpose: 'player found the vault key hidden in the library',
    },
  ],
  locations: [
    {
      id: 'atrium',
      name: 'The Atrium',
      defaultNode: 'atrium_hub',
      connectedLocations: ['library', 'vault'],
      travelTimes: { library: 10, vault: 10 },
    },
    {
      id: 'library',
      name: 'The Library',
      defaultNode: 'library_hub',
      connectedLocations: ['atrium', 'vault'],
      travelTimes: { atrium: 10, vault: 10 },
    },
    {
      id: 'vault',
      name: 'The Vault',
      defaultNode: 'vault_hub',
      connectedLocations: ['atrium', 'library'],
      travelTimes: { atrium: 10, library: 10 },
    },
  ],
  events: [],
  nodes: [
    // ── atrium ──────────────────────────────────────────────────────────────
    {
      id: 'atrium_hub',
      title: 'The Atrium',
      body: 'A wide entrance hall. Corridors lead to the library and the vault. A study alcove waits to one side.',
      choices: [
        { id: 'explore_atrium', label: 'Explore the study alcove', destination: 'atrium_study' },
      ],
    },
    {
      id: 'atrium_study',
      title: 'The Study Alcove',
      body: 'Old ledgers on low shelves. Nothing of obvious use, but a hand-drawn map notes the wing layout.',
      choices: [
        { id: 'leave_study', label: 'Return to the atrium', destination: 'atrium_hub' },
      ],
    },
    // ── library ─────────────────────────────────────────────────────────────
    {
      id: 'library_hub',
      title: 'The Library',
      body: 'Tall shelves crowd the room. Dust settles on rows of leather-bound volumes.',
      choices: [
        { id: 'search_library', label: 'Search the shelves', destination: 'library_gem' },
      ],
    },
    {
      id: 'library_gem',
      title: 'The Hidden Key',
      body: 'Behind a loose panel you find a brass key on a velvet cord. You pocket it.',
      // Latch set by entryEffect (not choice effect) — avoids LATCH_IN_CHOICE_EFFECT warning.
      entryEffects: [{ field: 'key_found', op: 'set', value: 'true' }],
      choices: [
        { id: 'leave_gem', label: 'Return to the library', destination: 'library_hub' },
      ],
    },
    // ── vault ────────────────────────────────────────────────────────────────
    {
      id: 'vault_hub',
      title: 'The Vault Antechamber',
      body: 'A heavy iron door dominates the far wall. A keyhole gleams in the lamplight.',
      choices: [
        { id: 'try_vault', label: 'Try the vault door', destination: 'vault_finish' },
      ],
    },
    {
      id: 'vault_finish',
      title: 'The Vault',
      body: 'The moment of truth at the vault door.',
      resolvesEnding: true,
      choices: [],
    },
  ],
  endings: [
    {
      id: 'vault_opened',
      name: 'Vault Opened',
      conditions: [{ field: 'key_found', op: 'is_true' }],
      priority: 1,
      summary: 'The brass key turned; the vault swung open.',
    },
    {
      id: 'vault_locked',
      name: 'Vault Remains Locked',
      conditions: [],
      isDefault: true,
      summary: 'Without the key the vault door would not yield.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Timed chapter story — same halls, but with a deadline and a time-gated search.
//
// Travel times = 30 min each.  Deadline = 60 min.
//   • Thresholds: time_after '00:30' (30 min) + deadline (60 min) → {30, 60}.
//   • Aligned bucket = gcd(30, 60) = 30.
//   • CLOCK_CANNOT_BITE: the two-hop path atrium→library→vault accumulates 60 min, meeting the
//     60-min window (timeBounds counts travel minutes — no authored add_minutes needed).
//   • verifyRoam(story, { timeBucket: 30 }).ok === true.
//   • verifyRoam(story, { timeBucket: 31 }).ok === false (31 does not divide 30).
// ---------------------------------------------------------------------------
const roamTimedStory: Story = {
  id: 'roam_timed_story',
  title: 'The Three Halls (Night)',
  startNodeId: 'atrium_hub_t',
  startTime: '00:00',
  deadline: '01:00',       // 60-minute window
  startLocation: 'atrium',
  profile: { clock: 'timed', travel: 'free' },
  variables: [
    {
      name: 'key_found',
      type: 'boolean',
      default: false,
      purpose: 'player found the vault key hidden in the library',
    },
  ],
  locations: [
    {
      id: 'atrium',
      name: 'The Atrium',
      defaultNode: 'atrium_hub_t',
      connectedLocations: ['library', 'vault'],
      travelTimes: { library: 30, vault: 30 },  // 30 min each so 2-hop path = 60 min = deadline window
    },
    {
      id: 'library',
      name: 'The Library',
      defaultNode: 'library_hub_t',
      connectedLocations: ['atrium', 'vault'],
      travelTimes: { atrium: 30, vault: 30 },
    },
    {
      id: 'vault',
      name: 'The Vault',
      defaultNode: 'vault_hub_t',
      connectedLocations: ['atrium', 'library'],
      travelTimes: { atrium: 30, library: 30 },
    },
  ],
  events: [],
  nodes: [
    // ── atrium ──────────────────────────────────────────────────────────────
    {
      id: 'atrium_hub_t',
      title: 'The Atrium',
      body: 'A wide entrance hall. The clock is ticking.',
      choices: [
        { id: 'explore_atrium_t', label: 'Explore the study alcove', destination: 'atrium_study_t' },
      ],
    },
    {
      id: 'atrium_study_t',
      title: 'The Study Alcove',
      body: 'Old ledgers. Nothing of use tonight.',
      choices: [
        { id: 'leave_study_t', label: 'Return to the atrium', destination: 'atrium_hub_t' },
      ],
    },
    // ── library ─────────────────────────────────────────────────────────────
    {
      id: 'library_hub_t',
      title: 'The Library',
      body: 'Tall shelves. The loose panel is only visible once the dust has had time to settle.',
      choices: [
        {
          id: 'search_library_t',
          label: 'Search the shelves',
          destination: 'library_gem_t',
          // Gate: the panel is discoverable only after the first half-hour.
          // threshold 30 min → with deadline 60 min, thresholds = {30, 60}, aligned bucket = gcd = 30.
          conditions: [{ field: 'time', op: 'time_after', value: '00:30' }],
        },
      ],
    },
    {
      id: 'library_gem_t',
      title: 'The Hidden Key',
      body: 'Behind the loose panel you find a brass key. You pocket it.',
      entryEffects: [{ field: 'key_found', op: 'set', value: 'true' }],
      choices: [
        { id: 'leave_gem_t', label: 'Return to the library', destination: 'library_hub_t' },
      ],
    },
    // ── vault ────────────────────────────────────────────────────────────────
    {
      id: 'vault_hub_t',
      title: 'The Vault Antechamber',
      body: 'The iron door. The keyhole gleams.',
      choices: [
        { id: 'try_vault_t', label: 'Try the vault door', destination: 'vault_finish_t' },
      ],
    },
    {
      id: 'vault_finish_t',
      title: 'The Vault',
      body: 'The moment of truth.',
      resolvesEnding: true,
      choices: [],
    },
  ],
  endings: [
    {
      id: 'vault_opened_t',
      name: 'Vault Opened',
      conditions: [{ field: 'key_found', op: 'is_true' }],
      priority: 1,
      summary: 'The brass key turned; the vault swung open.',
    },
    {
      id: 'vault_locked_t',
      name: 'Vault Remains Locked',
      conditions: [],
      isDefault: true,
      summary: 'The clock ran out before the vault yielded.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Stranded variant — vault connects to a crypt with no exit to any ending.
// The crypt_hub ↔ crypt_pit cycle is forward-reachable from the main map but
// cannot reach any ending, so verifyRoam reports deadRegions and ok === false.
// (Not lint-clean by design — the co-reachability bite is the feature under test.)
// ---------------------------------------------------------------------------
export const roamStranded: Story = {
  id: 'roam_stranded',
  title: 'The Three Halls (Stranded)',
  startNodeId: 'atrium_hub',
  startTime: '00:00',
  startLocation: 'atrium',
  profile: { clock: 'untimed', travel: 'free' },
  variables: [
    {
      name: 'key_found',
      type: 'boolean',
      default: false,
      purpose: 'player found the vault key in the library',
    },
  ],
  locations: [
    {
      id: 'atrium',
      name: 'The Atrium',
      defaultNode: 'atrium_hub',
      connectedLocations: ['library', 'vault'],
      travelTimes: { library: 10, vault: 10 },
    },
    {
      id: 'library',
      name: 'The Library',
      defaultNode: 'library_hub',
      connectedLocations: ['atrium', 'vault'],
      travelTimes: { atrium: 10, vault: 10 },
    },
    {
      id: 'vault',
      name: 'The Vault',
      defaultNode: 'vault_hub',
      // vault connects to crypt — one-way (no back-link); that is the asymmetry that strands the player
      connectedLocations: ['atrium', 'library', 'crypt'],
      travelTimes: { atrium: 10, library: 10, crypt: 10 },
    },
    {
      // crypt: reachable from vault but has no connectedLocations → no travel out
      id: 'crypt',
      name: 'The Crypt',
      defaultNode: 'crypt_hub',
      connectedLocations: [],
      travelTimes: {},
    },
  ],
  events: [],
  nodes: [
    // ── atrium ──────────────────────────────────────────────────────────────
    {
      id: 'atrium_hub',
      title: 'The Atrium',
      body: 'A wide entrance hall.',
      choices: [
        { id: 'explore_atrium', label: 'Explore the study alcove', destination: 'atrium_study' },
      ],
    },
    {
      id: 'atrium_study',
      title: 'The Study Alcove',
      body: 'Old ledgers. Nothing useful.',
      choices: [
        { id: 'leave_study', label: 'Return to the atrium', destination: 'atrium_hub' },
      ],
    },
    // ── library ─────────────────────────────────────────────────────────────
    {
      id: 'library_hub',
      title: 'The Library',
      body: 'Tall shelves crowd the room.',
      choices: [
        { id: 'search_library', label: 'Search the shelves', destination: 'library_gem' },
      ],
    },
    {
      id: 'library_gem',
      title: 'The Hidden Key',
      body: 'Behind a loose panel you find a brass key.',
      entryEffects: [{ field: 'key_found', op: 'set', value: 'true' }],
      choices: [
        { id: 'leave_gem', label: 'Return to the library', destination: 'library_hub' },
      ],
    },
    // ── vault ────────────────────────────────────────────────────────────────
    {
      id: 'vault_hub',
      title: 'The Vault Antechamber',
      body: 'A heavy iron door. A dark staircase descends to the crypt.',
      choices: [
        { id: 'try_vault', label: 'Try the vault door', destination: 'vault_finish' },
      ],
    },
    {
      id: 'vault_finish',
      title: 'The Vault',
      body: 'The moment of truth.',
      resolvesEnding: true,
      choices: [],
    },
    // ── crypt: dead region (no exit to any ending) ───────────────────────────
    {
      id: 'crypt_hub',
      title: 'The Crypt',
      body: 'Cold stone. An oppressive silence. There is no way back up.',
      choices: [
        { id: 'descend_crypt', label: 'Descend deeper', destination: 'crypt_pit' },
      ],
    },
    {
      id: 'crypt_pit',
      title: 'The Pit',
      body: 'A dead end. You scramble back the way you came.',
      choices: [
        { id: 'ascend_crypt', label: 'Climb back to the crypt entrance', destination: 'crypt_hub' },
      ],
    },
  ],
  endings: [
    {
      id: 'vault_opened',
      name: 'Vault Opened',
      conditions: [{ field: 'key_found', op: 'is_true' }],
      priority: 1,
      summary: 'The brass key turned; the vault swung open.',
    },
    {
      id: 'vault_locked',
      name: 'Vault Remains Locked',
      conditions: [],
      isDefault: true,
      summary: 'Without the key the vault door would not yield.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Games
// ---------------------------------------------------------------------------
export const roamExample: Game = {
  id: 'roam_example',
  title: 'The Three Halls',
  startChapterId: 'roam_ch1',
  profile: { clock: 'untimed', travel: 'free' },
  carry: { vars: 'all', resources: [], clues: false, inventory: false },
  chapters: [
    {
      id: 'roam_ch1',
      title: 'The Three Halls',
      story: roamStory,
      gameEnding: true,
      transitions: [],
    },
  ],
};

export const roamExampleTimed: Game = {
  id: 'roam_example_timed',
  title: 'The Three Halls (Night)',
  startChapterId: 'roam_timed_ch1',
  profile: { clock: 'timed', travel: 'free' },
  carry: { vars: 'all', resources: [], clues: false, inventory: false },
  chapters: [
    {
      id: 'roam_timed_ch1',
      title: 'The Three Halls (Night)',
      story: roamTimedStory,
      gameEnding: true,
      transitions: [],
    },
  ],
};
