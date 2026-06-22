import { describe, it, expect } from 'vitest';
import { clampValue, buildBounds } from './bounds';
import type { Story } from './types';

describe('clampValue', () => {
  it('clamps within min/max', () => {
    expect(clampValue(7, { min: 0, max: 4 })).toBe(4);
    expect(clampValue(-3, { min: 0, max: 4 })).toBe(0);
    expect(clampValue(2, { min: 0, max: 4 })).toBe(2);
  });
  it('honors one-sided bounds and no bound', () => {
    expect(clampValue(9, { max: 5 })).toBe(5);
    expect(clampValue(-9, { min: -2 })).toBe(-2);
    expect(clampValue(100, undefined)).toBe(100);
  });
});

describe('buildBounds', () => {
  it('collects variable and resource bounds', () => {
    const story = {
      id: 'g', title: 'g', startNodeId: 'n', startTime: '15:00', deadline: '16:00', startLocation: 'L',
      variables: [
        { name: 'trust', type: 'number', default: 0, purpose: 't', min: 0, max: 4 },
        { name: 'free', type: 'number', default: 0, purpose: 'f' },
      ],
      nodes: [], locations: [], events: [], endings: [],
      resources: [{ id: 'lamp', min: 0, max: 4, start: 4 }],
    } as unknown as Story;
    const b = buildBounds(story);
    expect(b.trust).toEqual({ min: 0, max: 4 });
    expect(b.lamp).toEqual({ min: 0, max: 4 });
    expect(b.free).toBeUndefined();
  });
});
