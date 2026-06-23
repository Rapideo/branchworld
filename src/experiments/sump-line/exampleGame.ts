import type { Story } from '../../engine';
import type { Game } from './types';

// Chapter 1: warmth starts at 4 and depletes 1 per 30 min. "slow" burns more warmth than "fast".
// Deadline 01:30 = 90 min; max path (slow) = 90 min → clock can bite on the slow route.
const ch1Story: Story = {
  id: 'ex_ch1', title: 'Descent', startNodeId: 'c1_start', startTime: '00:00', deadline: '01:30',
  startLocation: 'cave', variables: [], locations: [{ id: 'cave', name: 'Cave' }],
  events: [],
  resources: [{ id: 'warmth', label: 'Warmth', min: 0, max: 4, start: 4, depletion: { everyMinutes: 30, amount: 1 } }],
  nodes: [
    { id: 'c1_start', title: 'The Drop', body: 'Cold air rises from the shaft.', choices: [
      { id: 'slow', label: 'Down carefully', destination: 'c1_end', effects: [{ field: 'time', op: 'add_minutes', value: '90' }] },
      { id: 'fast', label: 'Down fast', destination: 'c1_end', effects: [{ field: 'time', op: 'add_minutes', value: '30' }] },
    ] },
    { id: 'c1_end', title: 'The Floor', body: 'You reach the chamber floor.', resolvesEnding: true, choices: [] },
  ],
  endings: [{ id: 'c1_done', name: 'At the floor', summary: 'down', conditions: [], isDefault: true }],
};

// Chapter 2: a single passage that branches internally (dry or wet crawl).
// Deadline 01:00 = 60 min; max path (wet crawl = 60 min) → clock can bite.
const ch2Story: Story = {
  id: 'ex_ch2', title: 'The Gallery', startNodeId: 'c2_start', startTime: '00:00', deadline: '01:00',
  startLocation: 'gallery', variables: [], locations: [{ id: 'gallery', name: 'Gallery' }], events: [],
  resources: [{ id: 'warmth', label: 'Warmth', min: 0, max: 4, start: 4, depletion: { everyMinutes: 30, amount: 1 } }],
  nodes: [
    { id: 'c2_start', title: 'The Fork', body: 'Two passages lead onward.', choices: [
      { id: 'dry', label: 'Take the dry gallery', destination: 'c2_end', effects: [{ field: 'time', op: 'add_minutes', value: '30' }] },
      { id: 'wet', label: 'Take the wet crawl', destination: 'c2_end', effects: [{ field: 'time', op: 'add_minutes', value: '60' }] },
    ] },
    { id: 'c2_end', title: 'Onward', body: 'The gallery narrows toward a shaft.', resolvesEnding: true, choices: [] },
  ],
  endings: [{ id: 'c2_done', name: 'Through the gallery', summary: 'on', conditions: [], isDefault: true }],
};

// Chapter 3: game ending. "warmth gt 0" → survived; default → frozen.
// Deadline 00:20 = 20 min; only path = 20 min → clock can bite.
const ch3Story: Story = {
  id: 'ex_ch3', title: 'The Last Climb', startNodeId: 'c3_start', startTime: '00:00', deadline: '00:20',
  startLocation: 'shaft', variables: [{ name: 'frozen_flag', type: 'boolean', default: false, purpose: 'reached zero warmth' }],
  locations: [{ id: 'shaft', name: 'Shaft' }], events: [],
  resources: [{ id: 'warmth', label: 'Warmth', min: 0, max: 4, start: 4, depletion: { everyMinutes: 30, amount: 1 }, atZero: { setFlag: 'frozen_flag' } }],
  nodes: [
    { id: 'c3_start', title: 'The Shaft', body: 'Daylight, far above.', choices: [
      { id: 'climb', label: 'Climb', destination: 'c3_end', effects: [{ field: 'time', op: 'add_minutes', value: '20' }] },
    ] },
    { id: 'c3_end', title: 'The Surface?', body: 'You haul yourself up.', resolvesEnding: true, choices: [] },
  ],
  endings: [
    { id: 'survived', name: 'Out, Alive', summary: 'warm enough', conditions: [{ field: 'warmth', op: 'gt', value: '0' }] },
    { id: 'frozen', name: 'The Cold Took You', summary: 'froze', conditions: [], isDefault: true },
  ],
};

export const exampleGame: Game = {
  id: 'example_cave', title: 'Synthetic Cave', startChapterId: 'ch1',
  carry: { vars: 'all', resources: ['warmth'], clues: true, inventory: true },
  gameDeadlineMinutes: 600,
  chapters: [
    { id: 'ch1', title: 'Descent', story: ch1Story, transitions: [
      { when: { conditions: [{ field: 'warmth', op: 'lte', value: '2' }] }, goTo: 'ch2' },
      { when: {}, goTo: 'ch2' },
    ] },
    { id: 'ch2', title: 'The Gallery', story: ch2Story, transitions: [{ when: {}, goTo: 'ch3' }] },
    { id: 'ch3', title: 'Last Climb', story: ch3Story, gameEnding: true, transitions: [] },
  ],
};
