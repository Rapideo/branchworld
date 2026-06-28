import type { Game } from '../../sump-line/types';
import { ch1WayIn } from './ch1WayIn';
import { ch2WayOut } from './ch2WayOut';

/**
 * "The Countinghouse" — the two-chapter heist slice, wired as a Game on the container.
 *
 * ch1_wayin (The Way In) sets entry_route / the take / partner_status / the Floor mutex and the carried
 * Lead, then transitions (catch-all) to:
 *   ch2_wayout (The Way Out) — game-ending, where the finales resolve.
 *
 * lead (resource) + loot/partner_status/the latches (vars) carry across the boundary, machine-checked by the
 * A1 v1.1 contract linter:
 *   domains       — partner_status is confined to its four legal values.
 *   mutexLatches  — alarm_tripped / made_clean are mutually exclusive (set exactly one in ch1).
 *   carriedRequired — ch2 requires loot + partner_status produced upstream (ch1 writes both).
 *
 * Container imported by SUBMODULE (not the ../../sump-line barrel, which re-exports the cave game). Promoting
 * the container to a shared src/container/ is the next refactor (see FINDINGS.md).
 */
export const countinghouse: Game = {
  id: 'countinghouse',
  title: 'The Countinghouse',
  startChapterId: 'ch1_wayin',
  carry: { vars: 'all', resources: ['lead'], clues: true, inventory: true },
  gameDeadlineMinutes: 240,
  domains: { partner_status: ['steady', 'frayed', 'hurt', 'gone'] },
  mutexLatches: [['alarm_tripped', 'made_clean']],
  chapters: [
    {
      id: 'ch1_wayin',
      title: 'The Way In',
      story: ch1WayIn,
      transitions: [{ when: {}, goTo: 'ch2_wayout' }],
    },
    {
      id: 'ch2_wayout',
      title: 'The Way Out',
      story: ch2WayOut,
      gameEnding: true,
      transitions: [],
      carriedRequired: ['loot', 'partner_status'],
    },
  ],
};
