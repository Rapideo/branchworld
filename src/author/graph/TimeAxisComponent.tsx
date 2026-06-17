import type { Story } from '../../engine';
import { formatTime } from '../../engine';
import { timeAxis } from './timeAxis';

export function TimeAxis({ story }: { story: Story }) {
  const a = timeAxis(story);
  return (
    <div className="border-b border-stone-200 px-4 py-2 text-xs text-stone-600">
      <div className="relative mt-4 h-1 rounded bg-stone-200">
        <span className="absolute -top-4 left-0">{formatTime(a.startMin)}</span>
        <span className="absolute -top-4 right-0">{formatTime(a.deadlineMin)}</span>
        {a.marks.map((m) => (
          <span key={m.id} className="absolute -top-4 -translate-x-1/2 whitespace-nowrap text-indigo-600"
                style={{ left: `${Math.max(0, Math.min(1, m.frac)) * 100}%` }}>
            ● <span>{m.label}</span> {formatTime(m.triggerMin)}
          </span>
        ))}
      </div>
    </div>
  );
}
