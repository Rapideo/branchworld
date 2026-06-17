import type { StoryNode } from '../engine';
import { renderBody } from './renderBody';

export function SceneView({ node, timeLabel }: { node: StoryNode; timeLabel: string }) {
  return (
    <article className="mx-auto max-w-prose px-4 py-6">
      <h1 className="mb-4 font-serif text-2xl text-stone-900">{node.title}</h1>
      <p className="whitespace-pre-line font-serif text-lg leading-relaxed text-stone-800">
        {renderBody(node.body, timeLabel)}
      </p>
    </article>
  );
}
