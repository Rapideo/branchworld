export function StatusBar({ timeLabel, location }: { timeLabel: string; location: string }) {
  return (
    <header className="sticky top-0 z-10 flex justify-between border-b border-stone-200 bg-stone-50/90 px-4 py-2 text-sm font-medium text-stone-600 backdrop-blur">
      <span>{timeLabel}</span>
      <span>{location}</span>
    </header>
  );
}
