import { describe, it, expect } from 'vitest';
import type { Story, Location } from './types';
import {
  travelChoiceId, parseTravelDest, hubLocation, travelDests,
  travelTripEffects, destDefaultNode, travelHops, travelNodeEdges,
} from './travel';

const locA: Location = { id: 'a', name: 'Aaa', connectedLocations: ['b'], travelTimes: { b: 10 }, defaultNode: 'a_hub' };
const locB: Location = { id: 'b', name: 'Bbb', connectedLocations: ['a'], travelTimes: { a: 10 }, defaultNode: 'b_hub' };
const story = { locations: [locA, locB], nodes: [] } as unknown as Story;

describe('travel helpers', () => {
  it('builds and parses synthetic ids', () => {
    expect(travelChoiceId('b')).toBe('__travel_b');
    expect(parseTravelDest('__travel_b')).toBe('b');
    expect(parseTravelDest('c_quiet')).toBeUndefined();
  });
  it('hubLocation is keyed off the live location, not a global node scan', () => {
    expect(hubLocation(story, 'a', 'a_hub')?.id).toBe('a');     // at a's hub while in a
    expect(hubLocation(story, 'b', 'a_hub')).toBeUndefined();   // at a_hub but state.location is b → not a hub
    expect(hubLocation(story, 'a', 'a_side')).toBeUndefined();  // in a but not at the hub node
  });
  it('trip effects pay the travel time and change location', () => {
    expect(travelTripEffects(locA, 'b')).toEqual([
      { op: 'add_minutes', field: 'time', value: '10' },
      { op: 'change_location', field: 'location', value: 'b' },
    ]);
    expect(destDefaultNode(story, 'b')).toBe('b_hub');
    expect(travelDests(locA)).toEqual(['b']);
  });
  it('travelHops / travelNodeEdges map hub->dest only when travel is free', () => {
    expect(travelHops(story, { clock: 'timed', travel: 'free' })).toEqual(new Map([
      ['a_hub', [{ dest: 'b_hub', minutes: 10 }]],
      ['b_hub', [{ dest: 'a_hub', minutes: 10 }]],
    ]));
    expect(travelNodeEdges(story, { clock: 'timed', travel: 'free' })).toEqual(new Map([
      ['a_hub', ['b_hub']],
      ['b_hub', ['a_hub']],
    ]));
    expect(travelHops(story, { clock: 'timed', travel: 'off' }).size).toBe(0);
    expect(travelNodeEdges(story, { clock: 'timed', travel: 'off' }).size).toBe(0);
  });
});
