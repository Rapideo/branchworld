import type { Ending } from '../engine';

export function EndingView({ ending, onReset }: { ending: Ending; onReset: () => void }) {
  return (
    <section className="mx-auto max-w-prose px-4 pb-8">
      <div className="rounded-xl border border-stone-300 bg-white p-6">
        <p className="mb-1 text-xs uppercase tracking-wide text-stone-400">Ending</p>
        <h2 className="mb-2 font-serif text-2xl text-stone-900">{ending.name}</h2>
        <p className="mb-4 text-stone-700">{ending.summary}</p>
        <button onClick={onReset} className="rounded-lg bg-stone-800 px-4 py-2 text-white hover:bg-stone-700">
          New game
        </button>
      </div>
    </section>
  );
}
