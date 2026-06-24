import { describe, it, expect } from 'vitest';
import { substituteTime, renderView } from './main';
import { GameRunner, sumpLine } from '..';

describe('play harness (pure render helpers over the real GameRunner)', () => {
  it('substituteTime replaces the {{time}} token', () => {
    expect(substituteTime('it is {{time}} on the hill', '2:50 PM')).toBe('it is 2:50 PM on the hill');
  });

  it('renders the opening scene with choices and no leftover {{time}} token', () => {
    const html = renderView(new GameRunner(sumpLine).start());
    expect(html).toContain('The Pulse');            // chapter title in the status strip
    expect(html).toContain('data-choice="c_gear_in"'); // an available choice
    expect(html).toContain('Lamp');                 // the survival meter
    expect(html).not.toContain('{{time}}');         // token substituted to the clock label
  });

  it('renders an ending screen at game over', () => {
    const g = new GameRunner(sumpLine);
    ['c_gear_in', 'c_descend', 'c_streamway', 'c_press', 'c_to_rolly', 'c_push', 'c_to_choke', 'c_godown', 'c_to_crawl', 'c_drop_dive'].forEach((c) => g.choose(c));
    const html = renderView(g.view());
    expect(html).toContain('an ending');
    expect(html).toContain('A Grey Way Out');
    expect(html).toContain('data-restart');
  });
});
