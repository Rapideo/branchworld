/**
 * The Countinghouse — content coherence fuzz sweep.
 *
 * Drives the REAL GameRunner over the wired game with index-seeded random choice sequences (no Math.random,
 * so a failing seed re-runs identically) and asserts the slice's honesty invariants hold under load:
 *   - every run terminates in one of the six real endings within the transition cap;
 *   - a GETAWAY ending (clean / lighter / not_whole) implies you actually DROVE — the terminal node reached
 *     is one of n_end_clean/lighter/not_whole — AND the outfit did not get you (lead_blown false). This is
 *     the check that catches the "got_clear set at the hub" class: a state-only assertion would not.
 *   - Dawn never claims you drove (got_clear false); The Outfit always means the Lead is blown;
 *   - the getaway prose's claims match the state (clean => full take + partner present; not_whole => gone).
 *
 * The engine + content are exercised, not modified. A failure here is a CONTENT bug (fix the chapter), not
 * the test. Heavier sweep: FUZZ_N=5000 npx vitest run src/experiments/countinghouse/harden
 */
import { describe, it, expect } from 'vitest';
import { GameRunner } from '../../../container';
import { countinghouse } from '../content/countinghouse';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FUZZ_ENV = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.FUZZ_N;
const FUZZ_N = Number(FUZZ_ENV ?? 600);
const STEP_CAP = 200; // c_wait advances the clock toward Dawn, so every run terminates well within this

const GETAWAYS = new Set(['end_clean', 'end_lighter', 'end_not_whole']);
const DRIVE_TERMINALS = new Set(['n_end_clean', 'n_end_lighter', 'n_end_not_whole']);
const ALL_ENDINGS = new Set(['end_clean', 'end_lighter', 'end_not_whole', 'end_outfit', 'end_dawn', 'end_still_inside']);

function playSeed(seed: number) {
  const rnd = mulberry32(seed);
  const g = new GameRunner(countinghouse);
  let v = g.view();
  for (let step = 0; step < STEP_CAP && !v.gameOver; step++) {
    const avail = v.choices.filter((c) => c.available);
    if (avail.length === 0) break; // would be a softlock; asserted against below
    const choice = avail[Math.floor(rnd() * avail.length)];
    v = g.choose(choice.id);
  }
  return v;
}

describe('The Countinghouse — coherence fuzz sweep', () => {
  it(`every one of ${FUZZ_N} random runs ends honestly`, () => {
    for (let seed = 1; seed <= FUZZ_N; seed++) {
      const v = playSeed(seed);
      const id = v.finalEndingId;

      expect(v.gameOver, `seed ${seed}: never reached an ending`).toBe(true);
      expect(ALL_ENDINGS.has(id ?? ''), `seed ${seed}: unknown ending ${id}`).toBe(true);

      if (GETAWAYS.has(id ?? '')) {
        // you actually DROVE (reached a drive terminal) — not a hub resolution masquerading as a getaway:
        expect(DRIVE_TERMINALS.has(v.node.id), `seed ${seed}: getaway ${id} from non-drive node ${v.node.id}`).toBe(true);
        expect(v.state.vars.got_clear, `seed ${seed}: getaway ${id} without got_clear`).toBe(true);
        // a getaway can never coincide with the outfit taking you (the atZero death out-ranks the pin):
        expect(v.state.vars.lead_blown, `seed ${seed}: getaway ${id} with the Lead blown`).not.toBe(true);
      }

      if (id === 'end_clean') {
        expect(Number(v.state.vars.loot), `seed ${seed}: Clean Away with loot < 3`).toBeGreaterThanOrEqual(3);
        expect(v.state.vars.partner_status, `seed ${seed}: Clean Away with the boxman gone`).not.toBe('gone');
      }
      if (id === 'end_lighter') {
        expect(Number(v.state.vars.loot), `seed ${seed}: Away Lighter with the full take`).toBeLessThan(3);
        expect(v.state.vars.partner_status, `seed ${seed}: Away Lighter with the boxman gone`).not.toBe('gone');
      }
      if (id === 'end_not_whole') {
        expect(v.state.vars.partner_status, `seed ${seed}: Out Not Whole with the boxman present`).toBe('gone');
      }
      if (id === 'end_dawn') {
        // Dawn is the night running out BEFORE you cleared — it must never claim you drove:
        expect(v.state.vars.got_clear, `seed ${seed}: Dawn claimed the drive`).not.toBe(true);
      }
      if (id === 'end_outfit') {
        // The Outfit means the Lead is what got you:
        expect(v.state.vars.lead_blown, `seed ${seed}: The Outfit without the Lead blown`).toBe(true);
      }
    }
  });

  it('the sweep actually exercises a spread of endings (not all one outcome)', () => {
    const counts = new Map<string, number>();
    for (let seed = 1; seed <= FUZZ_N; seed++) {
      const id = playSeed(seed).finalEndingId ?? 'none';
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    // eslint-disable-next-line no-console
    console.log('[countinghouse fuzz] ending spread:', Object.fromEntries(counts));
    // at least three distinct endings should show up across a random sweep (coverage sanity)
    expect([...counts.keys()].filter((k) => k !== 'none').length).toBeGreaterThanOrEqual(3);
  });
});
