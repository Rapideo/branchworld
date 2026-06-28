import type { Game } from '..';
import { ch1Descent } from './ch1Descent';
import { ch2High } from './ch2High';
import { ch2Sump } from './ch2Sump';

/**
 * "The Sump Line" — the 3-chapter cave-survival slice, wired as a Game on the container.
 *
 * ch1_descent (hub) sets `cave_route` and the carried survival state, then branches:
 *   cave_route === 'high'  -> ch2_high  (The Dry High Traverse)
 *   otherwise (catch-all)  -> ch2_sump  (The Flooded Sump Crawl)
 * Both branch chapters are game-ending. lamp_charge + body_heat carry across the boundary (rebased by the
 * container), so a lamp run low in ch1 keeps depleting in ch2 — which is how the dark endings become
 * reachable (the per-chapter walker can't see them; cross-chapter play can).
 */
export const sumpLine: Game = {
  id: 'sump_line',
  title: 'The Sump Line',
  startChapterId: 'ch1_descent',
  carry: { vars: 'all', resources: ['lamp_charge', 'body_heat'], clues: true, inventory: true },
  gameDeadlineMinutes: 360,
  // A1 v1.1 — the cross-chapter contract, machine-checked:
  domains: { companion_status: ['with_you', 'hurt', 'lost'] },
  mutexLatches: [['cave_all_together', 'cave_someone_lost']],
  chapters: [
    {
      id: 'ch1_descent',
      title: 'The Pulse',
      story: ch1Descent,
      transitions: [
        { when: { conditions: [{ field: 'cave_route', op: 'equals', value: 'high' }] }, goTo: 'ch2_high' },
        { when: {}, goTo: 'ch2_sump' },
      ],
    },
    { id: 'ch2_high', title: 'The Dry High Traverse', story: ch2High, gameEnding: true, transitions: [],
      carriedRequired: ['companion_status', 'cave_someone_lost', 'cave_all_together'] },
    { id: 'ch2_sump', title: 'The Flooded Sump Crawl', story: ch2Sump, gameEnding: true, transitions: [],
      carriedRequired: ['companion_status'] },
  ],
};
