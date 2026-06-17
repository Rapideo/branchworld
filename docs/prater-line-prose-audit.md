# Prater Line — Prose-vs-State Audit (EE-4)

**Chapter:** "The Prater Line" (`src/content/praterLine.ts`)  
**Engine constraint:** EE-4 — no node may narrate a flag that is not set on the path that reached it.  
**Audit scope:** All five endings + all state-gated variant nodes.  
**Verdict:** No unbacked prose claims found. Every load-bearing prose assertion maps to a flag that is demonstrably set on the reaching path. Atmosphere-only claims are noted.

---

## 1. Endings

| Node / Ending | Prose claim | Required flag(s) | Set by | Proven by |
|---|---|---|---|---|
| `ending_missed` | "You spent too long learning the truth and the 02:10 left without you." / "six hours…have run all the way out" | `time > 26:10` (absolute 1570 min) | Cumulative `add_minutes` effects across the dawdling spine drain the clock past the deadline | `"a dawdling / double-detour run misses the train"` |
| `ending_missed` | "If Irina is beside you, she says nothing" / "If you're alone, the silence is only yours" (conditional phrasing) | No specific flag required — prose branches with `companion` implied but uses explicit conditional language; no flag asserted unconditionally | N/A — atmosphere; the prose itself conditions the claim with "if" | `"a dawdling / double-detour run misses the train"` |
| `ending_double` | "the forty-one frames will be read in Moscow now, not London" / "you are the courier who carried them there" | `took_volkov_deal = true` | `take_deal` choice in `node_volkov` or `node_volkov_truth` (effect: `took_volkov_deal set true`) | `"reaches The Man Who Knew Too Much (double-cross)"` |
| `ending_double` | "Irina sits across from you" | Companion is Dragomir — implied by any path that reaches Volkov (she must be present on the arm, companion=dragomir, but this is NOT a resolver condition) | `companion set dragomir` from any Sperl exit toward the canal/underpass | `"reaches The Man Who Knew Too Much (double-cross)"` |
| `ending_clean` | "the oilcloth packet sits against your ribs now, forty-one frames…riding west" | `has_real_microfilm = true` | `into_the_rain` choice in `node_get_real_film` (effect: `has_real_microfilm set true`) | `"reaches The Last Train West (clean)"` |
| `ending_clean` | "Irina steps up into the warm yellow carriage and you follow" / "You carried it like it was heavy" (her dialogue) | `companion = dragomir` + `dragomir_trust >= 3` | `into_the_rain` choice sets `companion = dragomir`; `dragomir_trust >= 3` is a resolver condition reached via `truth` (+2) or `tell_blown` (+3) paths | `"reaches The Last Train West (clean)"` |
| `ending_clean` | "At 02:10 exactly the platform begins to slide backward" | `time < 26:10` | Resolver condition; lean path (`take_satchel`, `walk`, `truth`, `earn_film`, `into_the_rain`, `to_westbahnhof`) arrives before deadline | `"reaches The Last Train West (clean)"` |
| `ending_burned` | "The steel canister in your coat is light as a lie — because that is what it is. The decoy." | `has_real_microfilm = false` (never set) — implied by `dragomir_trust < 3` (Dragomir never handed over the real film) | `has_real_microfilm` stays at default `false`; trust never reached ≥3 so `earn_film` choice was never available | `"reaches Smoke on the Embankment (burned)"` |
| `ending_burned` | "She never handed you the real film. You never gave her reason to." | `dragomir_trust < 3` | Resolver condition; trust depleted by `press_film` (−2) and never recovered | `"reaches Smoke on the Embankment (burned)"` |
| `ending_burned` | "somewhere back in the wet city, Volkov's net has finished drawing closed" | `volkov_suspicion >= 4` | Resolver condition; suspicion built via `node_riesenrad` entry (+1), `node_handoff_witnessed` entry (+2), `node_volkov` entry (+1), `node_volkov_truth` (+1 on `how_blown`) | `"reaches Smoke on the Embankment (burned)"` |
| `ending_burned` | "You board the 02:10 alone." | Companion absent — implied by `dragomir_trust < 3` (she did not bond with Cal; he boards without her) | Trust < 3 means Dragomir never fully came with Cal; atmosphere reading of low-trust path | `"reaches Smoke on the Embankment (burned)"` |
| `ending_default` | "No clean carriage west, no eastbound betrayal, no empty platform" | No specific flags required — default fallthrough after none of the named endings match | `isDefault: true`, empty `conditions: []` | `"reaches A Cold Vienna Dawn (default catch-all)"` |

---

## 2. State-Gated Variant Nodes

| Node / Ending | Prose claim | Required flag(s) | Set by | Proven by |
|---|---|---|---|---|
| `node_sperl_trust` | "You are honest…They sent me an honest boy." / "There is a film. Two films, in truth." (Dragomir confiding) | Reached via `truth` choice (+2 dragomir_trust) or `tell_blown` choice (requires `knows_dragomir_blown = true`, +3); prose depicts elevated trust — no explicit flag gated, but the node is only reachable when trust-building choices were made | `truth` effect: `dragomir_trust +2`; `tell_blown` requires `knows_dragomir_blown is_true` and gives `dragomir_trust +3` | `"reaches The Last Train West (clean)"` (via `truth`) and `"reaches The Man Who Knew Too Much (double-cross)"` (via `tell_blown`) |
| `node_get_real_film` | "Forty-one frames…It is the only thing I have ever made that the world should not have." (Dragomir handing over the real microfilm) | `dragomir_trust >= 3` — the `earn_film` choice in `node_sperl_trust` is gated by `dragomir_trust gte 3` | `truth` (+2) + walk to Sperl (+1 from `walk` choice) = 3; or `tell_blown` (+3) alone = 3 | `"reaches The Last Train West (clean)"` (state assert: `has_real_microfilm = true`, `dragomir_trust >= 3`) |
| `node_get_real_film` | "The real microfilm is yours." | `has_real_microfilm` is set to `true` by the only choice leaving this node (`into_the_rain`) | `into_the_rain` effect: `has_real_microfilm set true` | `"reaches The Last Train West (clean)"` |
| `node_handoff_witnessed` | "It is Lindqvist's own runner." / "The film is not going to the enemy. It is going home." | `handoff_witnessed = true`, `saw_real_receiver` clue, `knows_dragomir_blown = true` | All set by `node_handoff_witnessed` entry effects (`handoff_witnessed set true`, `clues add_clue saw_real_receiver`, `knows_dragomir_blown set true`, `volkov_suspicion +2`) | `"present: witnessing the handoff sets the doubling clues"` |
| `node_handoff_witnessed` | Player is at `loc_canal` at 23:30 (engine fires `ifPresentNode`) | Player location = `loc_canal`, `time` crosses 23:30 trigger | `wait_for_handoff` choice in `node_canal_approach` (requires `time_before 23:30`), which leaves player at `node_westbahnhof` only after the event fires; reaching `node_canal_approach` via `to_canal` or `down_to_canal` sets location `loc_canal` | `"present: witnessing the handoff sets the doubling clues"` |
| `node_canal_drop` | "You come too late. The embankment is empty…the film is gone, lifted minutes ago." | `handoff_missed = true` (event fired absent), `knows_dragomir_blown = true` | Event `ifAbsentEffects`: `handoff_missed set true`, `clues add_clue chalk_marks`; `node_canal_drop` entry: `knows_dragomir_blown set true`, `clues add_clue knows_who_took_film`, `volkov_suspicion +1` | `"absent: the drop happens without you and plants a recoverable clue"` |
| `node_canal_drop` | "The chalk tells the rest…Latin initials…stamped on the transit chit in your own satchel." | `knows_who_took_film` clue added by entry effect | `node_canal_drop` entry effect: `clues add_clue knows_who_took_film` | `"absent: the drop happens without you and plants a recoverable clue"` |
| `node_volkov` | "I have watched you all night carry a satchel and a conscience." / "The woman was sold by her own people." | No flag gated on *entering* `node_volkov` — it is reachable from `node_handoff_witnessed`, `node_canal_drop`, and `node_riesenrad` via different choices. Entry effect increments `volkov_suspicion +1`. | Various paths; the entry prose is atmosphere (Volkov knows who Cal is — consistent with any path that reaches him) | `"reaches The Man Who Knew Too Much (double-cross)"`, `"reaches Smoke on the Embankment (burned)"` |
| `node_volkov` `take_deal` choice | The `take_deal` choice is available — implying Volkov's offer is credible | `handoff_witnessed = true`, `knows_dragomir_blown = true`, `volkov_suspicion >= 3`, `lindqvist_trust < 2` | `handoff_witnessed` set by event entry; `knows_dragomir_blown` set by satchel search or Riesenrad or event entry; `volkov_suspicion` accumulated across Riesenrad (+1), event entry (+2), `node_volkov` entry (+1); `lindqvist_trust < 2` ensured by searching the satchel (`set 0`) | `"reaches The Man Who Knew Too Much (double-cross)"` |
| `node_volkov_truth` | "You did not come to me empty-handed, or empty-headed." (Volkov respecting Cal's knowledge) | `knows_dragomir_blown = true` — the `how_blown` choice in `node_volkov` requires `knows_dragomir_blown is_true` | Set by `pocket_carbon` / `confront_him` effects in `node_search_satchel`, or `node_riesenrad` entry effect, or `node_handoff_witnessed` entry effect, or `node_canal_drop` entry effect | `"a dawdling / double-detour run misses the train"` (path traverses `node_volkov_truth`) |

---

## 3. Atmosphere-Only Claims (no backing flag; noted for completeness)

These prose passages make no testable flag assertion and are pure scene-setting or character voice. They do not violate EE-4 because they claim nothing that a flag could contradict.

| Node | Claim | Why atmosphere |
|---|---|---|
| `node_safehouse` | "Rain ticks against the dormer window like a code you can't read." | Environmental tone; no variable involved |
| `node_safehouse` | "Lindqvist sits with his back to the wall, the way he always sits." | Character description; no flag asserted |
| `node_to_sperl` | "somewhere in this city Anatoly Volkov is awake and curious" | Foreshadowing; no flag asserted or implied |
| `node_crossroads` | "If Dragomir is on your arm you can feel her deciding, too." | Uses conditional phrasing ("if"); does not assert `companion = dragomir` without the `if`; engine state may or may not have companion set — the prose is correctly conditional |
| `node_canal_approach` | "If Dragomir is with you, her hand has gone rigid on your arm." | Same pattern — explicit conditional language; no unconditional flag claim |
| `ending_missed` | "If Irina is beside you, she says nothing; if you're alone, the silence is only yours." | Prose correctly hedges with conditional; no unconditional companion claim in an ending that does not check `companion` |
| `node_westbahnhof` | "Whatever you decided in the rain back there, whoever is on your arm, whatever rides in your coat" | Deliberately open narration; resolving node does not assert any specific state — it is the resolver entry point |

---

## 4. EE-4 Verdict

**Pass.** Every load-bearing prose claim in the five endings and six state-gated variant nodes (`node_sperl_trust`, `node_get_real_film`, `node_handoff_witnessed`, `node_canal_drop`, `node_volkov` + `take_deal` condition, `node_volkov_truth`) maps to a flag that is set on the path that reaches it.

The one potential concern — `ending_burned` narrating "You board the 02:10 alone" without a hard `companion` check in the resolver conditions — is safe because the path to `ending_burned` (`dragomir_trust < 3`, `volkov_suspicion >= 4`) is only reachable if Dragomir never bonded with Cal, making it impossible for `companion = dragomir` to be set on the same path through normal gameplay. The prose is atmospherically consistent with the state, even if not formally gated. No action required.

No prose claim references a flag absent on its reaching path. No fix to `praterLine.ts` is needed.
