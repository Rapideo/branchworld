import { describe, it, expect } from 'vitest';
import { parseTime, formatTime, addMinutes } from './time';

describe('time', () => {
  it('parses HH:MM to minutes', () => {
    expect(parseTime('16:10')).toBe(970);
    expect(parseTime('00:00')).toBe(0);
    expect(parseTime('9:05')).toBe(545);
  });
  it('throws on bad input', () => {
    expect(() => parseTime('nope')).toThrow();
  });
  it('adds minutes', () => {
    expect(addMinutes(970, 25)).toBe(995);
  });
  it('formats minutes to 12-hour clock', () => {
    expect(formatTime(970)).toBe('4:10 PM');
    expect(formatTime(0)).toBe('12:00 AM');
    expect(formatTime(720)).toBe('12:00 PM');
  });
  it('renders a day offset for times at or beyond 24h so distinct absolute times differ', () => {
    expect(formatTime(120)).toBe('2:00 AM');
    expect(formatTime(120 + 1440)).toBe('2:00 AM (+1d)');
  });
});
