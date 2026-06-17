import { describe, it, expect } from 'vitest';
import { renderBody } from './renderBody';

describe('renderBody', () => {
  it('substitutes the {{time}} token', () => {
    expect(renderBody('At {{time}} sharp.', '4:10 PM')).toBe('At 4:10 PM sharp.');
  });
  it('leaves text without the token unchanged', () => {
    expect(renderBody('No token here.', '4:10 PM')).toBe('No token here.');
  });
});
