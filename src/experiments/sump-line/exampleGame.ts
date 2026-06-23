import type { Story } from '../../engine';
import type { Game } from './types';

// Chapter 1: warmth starts at 4 and depletes 1 per 30 min. "slow" burns more warmth than "fast".
const ch1Story: Story = {
  id: 'ex_ch1', title: 'Descent', startNodeId: 'c1_start', startTime: '00:00', deadline: '01:30',
  startLocation: 'L', variables: [], locations: [{ id: 'L', name: 'Cave' }],
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

// Chapter 2a (warm route) and 2b (cold route) both reconverge on chapter 3.
const ch2aStory: Story = {
  id: 'ex_ch2a', title: 'The Dry Gallery', startNodeId: 'c2a_start', startTime: '00:00', deadline: '00:30',
  startLocation: 'L', variables: [], locations: [{ id: 'L', name: 'Cave' }], events: [],
  resources: [{ id: 'warmth', label: 'Warmth', min: 0, max: 4, start: 4, depletion: { everyMinutes: 30, amount: 1 } }],
  nodes: [
    { id: 'c2a_start', title: 'Dry Gallery', body: 'A dry passage, mercifully.', choices: [
      { id: 'on', label: 'Press on', destination: 'c2a_end', effects: [{ field: 'time', op: 'add_minutes', value: '30' }] },
    ] },
    { id: 'c2a_end', title: 'Onward', body: 'The gallery narrows.', resolvesEnding: true, choices: [] },
  ],
  endings: [{ id: 'c2a_done', name: 'Through the gallery', summary: 'on', conditions: [], isDefault: true }],
};

const ch2bStory: Story = {
  id: 'ex_ch2b', title: 'The Wet Crawl', startNodeId: 'c2b_start', startTime: '00:00', deadline: '00:40',
  startLocation: 'L', variables: [], locations: [{ id: 'L', name: 'Cave' }], events: [],
  resources: [{ id: 'warmth', label: 'Warmth', min: 0, max: 4, start: 4, depletion: { everyMinutes: 20, amount: 1 } }],
  nodes: [
    { id: 'c2b_start', title: 'Wet Crawl', body: 'Frigid water soaks you through.', choices: [
      { id: 'on', label: 'Crawl on', destination: 'c2b_end', effects: [{ field: 'time', op: 'add_minutes', value: '40' }] },
    ] },
    { id: 'c2b_end', title: 'Onward', body: 'You emerge, shaking.', resolvesEnding: true, choices: [] },
  ],
  endings: [{ id: 'c2b_done', name: 'Through the crawl', summary: 'on', conditions: [], isDefault: true }],
};

// Chapter 3: game ending. "warmth gt 0" -> survived; default -> frozen.
const ch3Story: Story = {
  id: 'ex_ch3', title: 'The Last Climb', startNodeId: 'c3_start', startTime: '00:00', deadline: '00:20',
  startLocation: 'L', variables: [{ name: 'frozen_flag', type: 'boolean', default: false, purpose: 'reached zero warmth' }],
  locations: [{ id: 'L', name: 'Cave' }], events: [],
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
      { when: { conditions: [{ field: 'warmth', op: 'lte', value: '2' }] }, goTo: 'ch2b' },
      { when: {}, goTo: 'ch2a' },
    ] },
    { id: 'ch2a', title: 'Dry Gallery', story: ch2aStory, transitions: [{ when: {}, goTo: 'ch3' }] },
    { id: 'ch2b', title: 'Wet Crawl', story: ch2bStory, transitions: [{ when: {}, goTo: 'ch3' }] },
    { id: 'ch3', title: 'Last Climb', story: ch3Story, gameEnding: true, transitions: [] },
  ],
};
