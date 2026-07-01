import { describe, it, expect } from 'vitest';
import type { Story } from './types';
import { validateProfile, resolveProfile, TIME_PRESSURE_SURVIVAL, UNTIMED_BRANCHING, DEFAULT_PROFILE } from './profile';

// a timed story: deadline + a time-driven resource + an out-of-time ending + a time_* condition.
function timedStory(): Story {
  return {
    id: 't', title: 'T', startNodeId: 'a', startTime: '00:00', deadline: '01:00', startLocation: 'L',
    outOfTimeEndingId: 'oot',
    variables: [], locations: [{ id: 'L', name: 'L' }],
    events: [{ id: 'ev', title: 'E', trigger: [{ field: 'time', op: 'time_after', value: '00:30' }], eventLocation: 'L', ifPresentNode: 'a', ifAbsentEffects: [], recoveryNodeId: 'a' }],
    resources: [{ id: 'lamp', label: 'Lamp', min: 0, max: 10, start: 10, depletion: { everyMinutes: 10, amount: 1 } }],
    nodes: [{ id: 'a', title: 'A', body: '', choices: [], resolvesEnding: true }],
    endings: [{ id: 'oot', name: 'OOT', summary: '', conditions: [] }, { id: 'd', name: 'D', summary: '', conditions: [], isDefault: true }],
  };
}

describe('profile — the clock dimension validator', () => {
  it('a timed story (the default profile) raises no profile issues', () => {
    expect(validateProfile(timedStory())).toEqual([]);
  });
  it('the TIME_PRESSURE_SURVIVAL preset accepts the timed story', () => {
    expect(validateProfile({ ...timedStory(), profile: TIME_PRESSURE_SURVIVAL })).toEqual([]);
  });
  it('UNTIMED_BRANCHING flags every clock-bound feature, each recommending TIME_PRESSURE_SURVIVAL', () => {
    const issues = validateProfile({ ...timedStory(), profile: UNTIMED_BRANCHING });
    const codes = issues.map((i) => i.code);
    for (const c of ['PROFILE_UNTIMED_HAS_DEADLINE', 'PROFILE_UNTIMED_HAS_OOT_ENDING', 'PROFILE_UNTIMED_HAS_TIME_RESOURCE', 'PROFILE_UNTIMED_HAS_TIME_CONDITION']) {
      expect(codes).toContain(c);
    }
    for (const i of issues) expect(i.message).toMatch(/TIME_PRESSURE_SURVIVAL/);
  });
  it('catches a GENERIC clock-read (field "time" + a value op), not just time_* ops', () => {
    const s: Story = {
      id: 'g', title: 'G', startNodeId: 'a', startTime: '00:00', startLocation: 'L', profile: { clock: 'untimed' },
      variables: [], locations: [{ id: 'L', name: 'L' }], events: [],
      nodes: [
        { id: 'a', title: 'A', body: '', choices: [
          { id: 'late', label: 'late', destination: 'e', conditions: [{ field: 'time', op: 'gt', value: '30' }] },
          { id: 'go', label: 'go', destination: 'e' },
        ] },
        { id: 'e', title: 'E', body: '', choices: [], resolvesEnding: true },
      ],
      endings: [{ id: 'd', name: 'D', summary: '', conditions: [], isDefault: true }],
    };
    expect(validateProfile(s).map((i) => i.code)).toContain('PROFILE_UNTIMED_HAS_TIME_CONDITION');
  });
  it('resolveProfile normalizes; the story profile wins, the inherited fills the gap', () => {
    expect(resolveProfile(timedStory())).toEqual({ clock: 'timed', travel: 'off', investigation: 'off' });                                   // default
    expect(resolveProfile(timedStory(), UNTIMED_BRANCHING)).toEqual({ clock: 'untimed', travel: 'off', investigation: 'off' });              // inherited fills
    expect(resolveProfile({ ...timedStory(), profile: { clock: 'timed' } }, UNTIMED_BRANCHING)).toEqual({ clock: 'timed', travel: 'off', investigation: 'off' }); // story wins
  });
  it('a timed story (default profile) with no deadline raises PROFILE_TIMED_NEEDS_DEADLINE', () => {
    const s: Story = { id: 'x', title: 'X', startNodeId: 'a', startTime: '00:00', startLocation: 'L',
      variables: [], locations: [{ id: 'L', name: 'L' }], events: [],
      nodes: [{ id: 'a', title: 'A', body: '', choices: [], resolvesEnding: true }],
      endings: [{ id: 'd', name: 'D', summary: '', conditions: [], isDefault: true }] };
    expect(validateProfile(s).map((i) => i.code)).toContain('PROFILE_TIMED_NEEDS_DEADLINE');
  });
  it('travel dimension: default is off and appears in the resolved profile', () => {
    expect(DEFAULT_PROFILE).toEqual({ clock: 'timed', travel: 'off', investigation: 'off' });
    expect(resolveProfile(timedStory())).toEqual({ clock: 'timed', travel: 'off', investigation: 'off' });
    expect(resolveProfile({ ...timedStory(), profile: { clock: 'timed', travel: 'free' } }))
      .toEqual({ clock: 'timed', travel: 'free', investigation: 'off' });
  });
});
