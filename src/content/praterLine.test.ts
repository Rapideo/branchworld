import { describe, it, expect } from 'vitest';
import { GameEngine, lintStory } from '../engine';
import { praterLine } from './praterLine';

function play(ids: string[]) {
  const g = new GameEngine(praterLine);
  for (const id of ids) g.choose(id);
  return g.view();
}

describe('praterLine — integrity', () => {
  it('lints clean with no errors or warnings', () => {
    const r = lintStory(praterLine);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
});

describe('praterLine — every ending resolves from accumulated state', () => {
  it('reaches The Last Train West (clean)', () => {
    // walk (trust +1) -> the plain truth (+2 => 3) -> earn the real film -> straight to the station, in time
    const v = play(['take_satchel', 'walk', 'truth', 'earn_film', 'into_the_rain', 'to_westbahnhof']);
    expect(v.endingReached?.id).toBe('ending_clean');
    expect(v.state.vars.has_real_microfilm).toBe(true);
    expect(v.state.vars.companion).toBe('dragomir');
    expect(Number(v.state.vars.dragomir_trust)).toBeGreaterThanOrEqual(3);
  });

  it('reaches The Man Who Knew Too Much (double-cross)', () => {
    // search satchel (knows blown, lindqvist trust -> 0) -> tell her she was blown (trust 3, companion)
    // -> down to the canal, witness the 23:30 handoff (suspicion +2) -> find Volkov (+1) -> take his deal
    const v = play([
      'search_satchel', 'pocket_carbon', 'tram', 'tell_blown', 'tell_canal_handoff',
      'to_canal', 'wait_for_handoff', 'find_volkov', 'take_deal',
    ]);
    expect(v.endingReached?.id).toBe('ending_double');
    expect(v.state.vars.took_volkov_deal).toBe(true);
    expect(v.node.id).toBe('node_eastbound');
  });

  it('reaches Smoke on the Embankment (burned)', () => {
    // press for the film too early (trust -2) -> ride the Riesenrad (+1 susp) -> down to the canal,
    // witness the handoff (+2 susp) -> find Volkov (+1 susp => 4) -> refuse him. Trust never recovers.
    const v = play([
      'take_satchel', 'tram', 'press_film', 'take_decoy_leave',
      'to_riesenrad', 'down_to_canal', 'wait_for_handoff', 'find_volkov', 'refuse_volkov',
    ]);
    expect(v.endingReached?.id).toBe('ending_burned');
    expect(Number(v.state.vars.dragomir_trust)).toBeLessThan(3);
    expect(Number(v.state.vars.volkov_suspicion)).toBeGreaterThanOrEqual(4);
  });

  it('reaches A Cold Vienna Dawn (default catch-all)', () => {
    // an in-time path matching none of the specific endings: cover story, just get moving, straight west.
    // trust stays low, no real film, no deal, no missed train, suspicion never builds.
    const v = play(['take_satchel', 'tram', 'cover', 'get_moving', 'to_westbahnhof']);
    expect(v.endingReached?.id).toBe('ending_default');
  });
  // ending_missed is covered by the clock tests in the calibration suite.
});

describe('praterLine — the 23:30 canal handoff fires both ways', () => {
  it('present: witnessing the handoff sets the doubling clues', () => {
    // reach loc_canal before 23:30 (arrive ~23:00), then wait for the half-hour
    const v = play(['take_satchel', 'tram', 'truth', 'walk_with_me', 'to_canal', 'wait_for_handoff']);
    expect(v.node.id).toBe('node_handoff_witnessed');
    expect(v.state.clues).toContain('saw_real_receiver');
    expect(v.state.vars.handoff_witnessed).toBe(true);
    expect(v.state.completedEvents).toContain('event_handoff');
  });

  it('absent: the drop happens without you and plants a recoverable clue', () => {
    const g = new GameEngine(praterLine);
    // dawdle off-canal: a slow Sperl spine lands at the crossroads ~22:50, then ride the
    // Riesenrad (+45) which crosses 23:30 while location !== loc_canal -> the event fires absent.
    [
      'search_satchel', 'confront_him', 'own_arithmetic', 'walk',
      'press_film', 'recover', 'drop_script', 'walk_with_me', 'to_riesenrad',
    ].forEach((id) => g.choose(id));
    expect(g.view().state.vars.handoff_missed).toBe(true);
    expect(g.view().state.clues).toContain('chalk_marks');
    expect(g.view().state.completedEvents).toContain('event_handoff');
    expect(g.view().state.vars.handoff_witnessed).toBe(false);
    // now go down to the canal (late) and read the chalk at the recovery node
    g.choose('down_to_canal'); // -> node_canal_approach, already past 23:30
    const v = g.choose('too_late'); // -> node_canal_drop (recoveryNodeId)
    expect(v.node.id).toBe('node_canal_drop');
    expect(v.state.clues).toContain('knows_who_took_film');
  });
});
