import type { Story } from '../engine/types';

/** Minimal valid Story; override only what a test exercises. */
export function mkStory(overrides: Partial<Story> = {}): Story {
  const base: Story = {
    id: 'test',
    title: 'Test Story',
    startNodeId: 'start',
    startTime: '20:00',
    deadline: '22:00',
    startLocation: 'loc_a',
    variables: [],
    nodes: [{ id: 'start', title: 'Start', body: '', choices: [] }],
    locations: [{ id: 'loc_a', name: 'A' }],
    events: [],
    endings: [{ id: 'end_default', name: 'Default', summary: '', conditions: [], isDefault: true }],
  };
  return { ...base, ...overrides };
}
