import type { ChoiceView } from '../engine';

export function ChoiceList({ choices, onChoose }: { choices: ChoiceView[]; onChoose: (id: string) => void }) {
  return (
    <nav className="mx-auto flex max-w-prose flex-col gap-2 px-4 pb-8">
      {choices.filter((c) => c.available).map((c) => (
        <button
          key={c.id}
          onClick={() => onChoose(c.id)}
          className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-left text-stone-800 transition hover:border-stone-400 hover:bg-stone-100"
        >
          {c.label}
        </button>
      ))}
    </nav>
  );
}
