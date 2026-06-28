import { describe, it, expect } from 'vitest';
import { substituteTime, renderView } from './main';
import { GameRunner } from '../../sump-line/GameRunner';
import { countinghouse } from '../content/countinghouse';

describe('play harness (pure render helpers over the real GameRunner)', () => {
  it('substituteTime replaces the {{time}} token', () => {
    expect(substituteTime('it is {{time}} on the street', '11:00 PM')).toBe('it is 11:00 PM on the street');
  });

  it('renders the opening scene with choices and no leftover {{time}} token', () => {
    const html = renderView(new GameRunner(countinghouse).start());
    expect(html).toContain('The Way In');               // chapter title in the status strip
    expect(html).toContain('data-choice="c_case"');     // an available choice
    expect(html).toContain('Lead');                     // the survival meter
    expect(html).toContain('The Take');                 // the counted-inventory meter
    expect(html).not.toContain('{{time}}');             // token substituted to the clock label
  });

  it('renders an ending screen at game over (the clean quiet route)', () => {
    const g = new GameRunner(countinghouse);
    [
      'c_case', 'c_case_on', 'c_quiet', 'c_quiet_on', 'c_blow', 'c_more1', 'c_more2', 'c_done', 'c_run',
      'c_to_stair', 'c_slip', 'c_cover', 'c_dash', 'c_drive_clean',
    ].forEach((c) => g.choose(c));
    const html = renderView(g.view());
    expect(html).toContain('an ending');
    expect(html).toContain('Clean Away');
    expect(html).toContain('data-restart');
  });
});
