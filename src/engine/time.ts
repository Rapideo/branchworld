export function parseTime(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) throw new Error(`Invalid time: ${hhmm}`);
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function addMinutes(minutes: number, delta: number): number {
  return minutes + delta;
}

export function formatTime(minutes: number): string {
  const norm = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const mm = norm % 60;
  const ap = h < 12 ? 'AM' : 'PM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${mm < 10 ? '0' : ''}${mm} ${ap}`;
}
