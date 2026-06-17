import type { GraphLintStatus } from './lintStatus';

export function LintBanner({ status }: { status: GraphLintStatus }) {
  const errors = [...status.byId.values()].flat().filter((i) => i.level === 'error').length + status.storyLevel.filter((i) => i.level === 'error').length;
  const warnings = [...status.byId.values()].flat().filter((i) => i.level === 'warning').length + status.storyLevel.filter((i) => i.level === 'warning').length;
  const clean = errors === 0 && warnings === 0;
  return (
    <div className={`px-4 py-1.5 text-xs ${errors ? 'bg-red-50 text-red-700' : warnings ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
      {clean ? '✓ linter clean' : `${errors} error${errors === 1 ? '' : 's'} · ${warnings} warning${warnings === 1 ? '' : 's'}`}
      {status.storyLevel.length > 0 && (
        <span className="ml-2 text-stone-600">— {status.storyLevel.map((i) => i.code).join(', ')}</span>
      )}
    </div>
  );
}
