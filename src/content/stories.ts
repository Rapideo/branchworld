import type { Story } from '../engine';
import { sampleStory } from './sampleStory';
import { praterLine } from './praterLine';

export const stories: { id: string; title: string; story: Story }[] = [
  { id: sampleStory.id, title: sampleStory.title, story: sampleStory },
  { id: praterLine.id, title: praterLine.title, story: praterLine },
];
