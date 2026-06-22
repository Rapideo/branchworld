

# Product Requirements Document

# State-Driven Narrative Game Engine

## Working Title: BranchWorld Engine

### Version 1.1 — Engine-Enforcement Revision

> **Revision history.** This document incorporates the v1.1 engine-enforcement corrections
> directly into the body. The four corrections and the build-blocking linter are stated
> normatively in **§ Engine-Enforcement Requirements (v1.1)** below and are reflected
> throughout §10.6, §10.7, §10.11, §15, §17, §19, §20, §22, and §23. The rationale — why
> these changes were made, from the triple-team chapter-one review — is preserved in
> **Appendix A**. Supersedes the original v0.1 planning draft; the prior standalone "v1.1"
> delta note has been folded into this document.

---

## 1. Executive Summary

BranchWorld Engine is a mobile-responsive narrative game engine for building modern text-based adventure games that combine the feel of **Choose Your Own Adventure books**, **Oregon Trail**, **Carmen Sandiego**, and interactive branching story games.

The engine is designed around one core idea:

> The story does not branch only when the player chooses “A, B, or C.”  
> The story branches because of what the player has done, where they went, when they went there, what they know, who trusts them, what they missed, and what the world is doing in the background.

The goal is to create a reusable engine and authoring tool that allows writers to build interactive narrative games where player agency feels richer than a standard branching book, but without requiring the complexity of a full open-world 3D game.

The first version should be built as a **mobile-responsive web app** so the engine can be tested, previewed, and iterated quickly. A future version may package the player experience as a native mobile app.

The product has two major parts:

1. **Player Preview / Runtime Engine**  
   The mobile-responsive game experience where the player reads scenes, makes choices, moves between locations, advances time, collects clues, and reaches different outcomes.

2. **Narrative Authoring Tool**  
   A development interface where the creator can write story nodes, connect branches, define conditions, manage world state, preview paths, debug logic, and understand how the narrative tree behaves.

The engine should be genre-neutral. The first real game may be mob-themed, but the engine itself should support many possible story types: mystery, survival, coming-of-age, detective, horror, sci-fi, historical adventure, or educational games.

A small sample game, **The 4:10 Envelope**, should be created as a reference scenario. This is not the first commercial title. It is a compact proof-of-concept used to prove that the engine works.

---

## Engine-Enforcement Requirements (v1.1 — Normative)

**Organizing principle:** the engine enforces its own promises; the author cannot silently
break them. Anything the original draft left to author discipline becomes an engine primitive
plus a build-blocking linter check. These requirements are **normative** and supersede the
legacy mechanics in §10.6, §10.7, §10.11, §15, §17, §19, §20.3–20.4, §22.3, and §23 wherever
they conflict. (See Appendix A for why.)

### EE-1. Time is engine-derived; hardcoded timestamps are banned

- The current clock has exactly one source of truth: `startTime + Σ(add_minutes applied)`. The
  engine computes and exposes `currentTime`; the renderer injects it.
- Node bodies **must not** embed absolute clock times as authored ground truth. Prose may
  reference a `{{time}}` token (engine-substituted) or relative phrasing ("the light is going").
- The node `time` field is **demoted** to `authorTimeHint` (non-authoritative, editor-only) or
  removed. The engine never reads it for logic.
- **Calibration is a requirement, not a vibe:** per-action `add_minutes` costs must be tuned so an
  efficient path lands *near* the deadline and any meaningful detour genuinely risks missing it.
  The linter enforces that the deadline is reachable.

### EE-2. Scheduled events are real engine triggers with a mandatory if-absent path

- After **every** time advance, the engine evaluates all incomplete scheduled events regardless
  of the player's location.
- When a trigger fires: **Present** (player at the event location) → route to the witnessed node;
  **Absent** → apply the if-absent effects, **automatically plant a discoverable clue** at a
  reachable recovery node, mark the event completed, and write a debug log entry.
- Every scheduled event **must declare a reachable `recoveryNodeId`**. Shipping one without it is a
  linter failure. This is the "missing something opens a different path, never a dead end"
  guarantee from §8.3 — now enforced.

### EE-3. Endings resolve from accumulated state, never hardwired to choices

- Replace all choice→ending links with a single **Ending Resolver**, evaluated at resolution
  points (deadline reached, or an explicit resolve trigger).
- The resolver walks an **ordered** list of endings, each gated by conditions over accumulated
  state, and selects the first match. A **mandatory catch-all default ending** guarantees
  exhaustiveness — no reachable end-state may match zero endings.
- Choices may advance state and time but **must not target ending nodes directly** (linter-enforced).

### EE-4. Prose must not contradict state

- No node — especially an ending — may narrate an outcome (the town drowned, the gate failed)
  unless the corresponding flag is actually set on the path that reached it.
- Enforced by a per-ending review checklist plus an AI-assisted consistency pass.

### EE-5. The Linter (build-blocking) — the linchpin

Runs in CI/build **and** live inside the authoring tool. Three blocking checks (new):

1. **Deadline reachability** — compute the longest reachable accumulated-time path; **FAIL** if it
   cannot exceed the deadline. **Warn** if the shortest path already overruns it (unwinnable).
2. **Ending exhaustiveness & reachability** — every reachable end-state matches **exactly one**
   ending; flag dead-code (unreachable) endings and zero-match holes (fall-through).
3. **Scheduled-event integrity** — every scheduled event defines present + absent effects **and**
   has a reachable `recoveryNodeId`.

Carried over from §22.3 (still required): broken links, missing destinations, undefined/unused
variables, duplicate IDs, no-exit nodes, unreachable nodes, conditions referencing deleted
variables. **Guardrail (P2): one variable = one meaning** — the linter flags suspected overloading.

### EE-6. One engine core (architectural requirement)

The engine (state, conditions, effects, engine-derived time, scheduled events, ending resolver,
linter) is a **pure, serializable, framework-agnostic TypeScript module** consumed *identically*
by the player, the authoring tool, and CI. No engine logic is duplicated in any UI. This keeps the
player and the authoring tool from drifting and lets the linter and AI-assist reason about exactly
what the player will experience.

---

## 2. Product Vision

The vision is to create a story engine where a non-technical writer can design a branching, reactive narrative without needing to think like a programmer.

The writer should not have to think:

> “I need to program a state machine.”

The writer should be able to think:

> “This scene appears if the player knows about the envelope, arrives at the diner before 4:10 p.m., and Mara still trusts them.”

The engine should translate writer-friendly logic into game behavior.

The long-term vision is a tool where a creator can:

- Write scenes.

- Create locations.

- Define characters.

- Track relationships.

- Define clues and knowledge.

- Build time-based events.

- Create direct choices.

- Create hidden consequences.

- Preview the mobile game.

- See a node graph of the story.

- Understand why a scene did or did not appear.

- Test multiple routes through the story.

- Export or package a playable game.

---

## 3. Problem Statement

Traditional text adventure and branching narrative systems often fall into one of two traps.

### Problem 1: The story becomes too linear

A basic Choose Your Own Adventure structure works well for direct decisions:

```text
Do you enter the house?
A. Yes
B. No
```

But this can feel rigid. The player is only shaping the story when the author explicitly presents a decision.

This creates the feeling of “page turning,” not a living world.

### Problem 2: The game becomes too open and unmanageable

A traditional text adventure lets the player move freely, type commands, inspect objects, and explore spaces.

But for a modern narrative game, especially one built by a small team or solo creator, this can become hard to author. It is difficult to know:

- What should happen next?

- How does the player know where to go?

- How does the writer prevent dead ends?

- How does the story keep momentum?

- How do you manage all the branches?

### Desired Solution

BranchWorld should sit between those two models.

It should feel more open than a branching book, but more controlled than a full simulation.

The player has meaningful choices, but those choices are structured through:

- scenes

- locations

- time

- characters

- clues

- relationships

- scheduled events

- state-based branching

The player does not need a command parser. The player interacts through readable, curated choices. But the available choices and story outcomes are influenced by the broader world state.

---

## 4. Core Product Concept

BranchWorld is a **state-driven narrative engine**.

The engine is built around the relationship between four things:

1. **Story Nodes**  
   Authored scenes, passages, encounters, events, conversations, or outcomes.

2. **World State**  
   The invisible memory of the game. This tracks time, location, relationships, clues, inventory, prior actions, and major events.

3. **Rules / Conditions**  
   Logic that determines when scenes or choices are available.

4. **Effects / Consequences**  
   Changes that happen after the player makes a choice or triggers an event.

The player sees a smooth story.

The engine sees something more like this:

```text
Current State
    ↓
Find available scenes
    ↓
Show most relevant scene or location
    ↓
Player chooses an action
    ↓
Apply consequences
    ↓
Advance time
    ↓
Update world state
    ↓
Check scheduled events
    ↓
Find next available scene
```

---

## 5. Target Users

### Primary User: Narrative Game Creator

A writer, designer, solo developer, or small team member who wants to build interactive narrative games without creating a full game engine from scratch.

Needs:

- A clear way to author branching scenes.

- A way to track variables without getting lost.

- A visual graph of the story.

- A mobile preview.

- Debug tools that explain why something happened.

- A way to test multiple paths.

### Secondary User: Game Player

The end player of a game built in the engine.

Needs:

- A clean mobile-first reading experience.

- Clear choices.

- A sense of agency.

- A sense that the world reacts to them.

- Enough guidance to avoid confusion.

- Multiple meaningful outcomes.

- A story that feels authored but not railroaded.

### Tertiary User: Developer / Technical Implementer

A developer or AI coding agent building the engine.

Needs:

- Clear data models.

- Clear runtime rules.

- Clear MVP boundaries.

- Clear acceptance criteria.

- Sample content to test against.

- A staged implementation plan.

---

## 6. Product Goals

### Goal 1: Create a playable mobile-responsive narrative runtime

The player should be able to play a simple state-driven story in a browser on desktop and mobile.

### Goal 2: Support branching based on more than direct choices

The engine must support branches based on:

- direct choices

- prior actions

- time

- current location

- known clues

- relationship values

- inventory or items

- global story events

- scheduled events

- missed events

### Goal 3: Create a writer-friendly authoring model

Writers should be able to express logic in understandable terms:

> Show this scene if the player has seen the black car and Mara trusts them.

### Goal 4: Create a debug-friendly engine

The creator should be able to see:

- current world state

- available nodes

- unavailable nodes

- why a node is unavailable

- what each choice changes

- what events fired

- what endings are reachable

### Goal 5: Build a small sample game that proves the system

The sample game should demonstrate the core mechanics in a limited, understandable way.

---

## 7. Non-Goals for the First Version

The first version should intentionally avoid overbuilding.

### Not required for MVP

- Native iOS or Android app.

- 3D graphics.

- Real-time multiplayer.

- Full command parser.

- AI-generated story content during gameplay.

- Voice acting.

- Complex combat system.

- Save syncing across devices.

- User accounts.

- Marketplace for games.

- Full visual scripting language.

- Complex animation system.

- Procedural world generation.

- Large-scale commercial story production.

The first milestone should prove the engine model, not build the final game platform.

---

## 8. Guiding Design Principles

### 8.1 Simple surface, deep logic

The player interface should feel simple:

- read text

- inspect location

- choose action

- move somewhere

- see result

But underneath, the engine should support deeper state logic.

### 8.2 Writer-first logic

The authoring tool should describe conditions in plain language wherever possible.

Instead of showing only this:

```text
mara_trust >= 2 && saw_black_car === true && time < "17:00"
```

The writer should also see this:

```text
Appears when:
- Mara trusts the player at level 2 or higher
- The player has seen the black car
- It is before 5:00 PM
```

### 8.3 No dead-end confusion

The player should not be able to wander into a meaningless void. If they miss a major event, the game should create alternate clues, consequences, or endings.

Missing something should create a different path, not simply break the story.

### 8.4 The world moves forward

The world should not wait forever for the player.

Scheduled events should happen whether or not the player sees them.

Example:

> At 4:10 p.m., the envelope is picked up at the diner.  
> If the player is there, they witness it.  
> If the player is not there, the event still happens and leaves behind a clue.

### 8.5 Small content should prove large systems

The sample game should be small, but it should touch most of the major engine features.

A 15–25 node demo is better than an unfinished 200-node game.

---

## 9. Core Terminology

### Story Node

A unit of authored content.

A node can be:

- scene

- conversation

- event

- location description

- discovery

- ending

- transition

- clue reveal

- scheduled event

- consequence scene

Example:

```text
N030: Envelope Pickup Witnessed
```

### Choice

An action the player can take from a node.

Example:

```text
Follow the man outside.
```

Choices can have:

- display text

- conditions

- consequences

- destination node

- time cost

- location change

- relationship change

- clue unlock

- item gain/loss

### World State

The current memory of the game.

Example:

```text
time = 4:20 PM
location = Diner
knows_about_envelope = true
mara_trust = 2
saw_black_car = true
has_envelope = false
```

### Condition

A rule that determines whether a node or choice is available.

Example:

```text
Show only if player knows about the envelope.
```

### Effect

A change caused by a choice, scene, or event.

Example:

```text
mara_trust += 1
time += 10 minutes
location = Diner
```

### Scheduled Event

An event that happens at a certain time or when certain global conditions are met.

Example:

```text
At 4:10 PM, the envelope is picked up.
```

### Location

A place the player can visit.

Example:

- School

- Diner

- Arcade

- Payphone

- Home

### Knowledge Flag

A true/false marker representing something the player has learned.

Example:

```text
knows_plate_number = true
```

### Relationship Score

A numeric value representing how a character currently feels about the player.

Example:

```text
mara_trust = 2
nick_suspicion = 1
```

### Ending

A final or semi-final state determined by accumulated player choices and world state.

Example:

```text
Ending A: The Witness
```

---

## 10. Core Engine Requirements

## 10.1 Story Node System

The engine must support authored story nodes.

Each node should include:

- unique ID

- title

- body text

- node type

- associated location

- optional character associations

- availability conditions

- choices

- effects triggered on entry

- tags

- notes for the author

- debug metadata

Example node:

```json
{
  "id": "N030",
  "title": "Envelope Pickup Witnessed",
  "type": "event",
  "location": "Diner",
  "body": "{{time}} — a man in a gray coat enters the diner. He does not look at the menu...",
  "conditions": [
    { "field": "location", "operator": "equals", "value": "Diner" },
    { "field": "time", "operator": "greater_than_or_equal", "value": "16:10" },
    { "field": "envelope_picked_up", "operator": "equals", "value": false }
  ],
  "choices": ["C030_A", "C030_B", "C030_C"]
}
```

### Node Types

The MVP should support these node types:

```text
scene
location
conversation
event
discovery
transition
ending
system
```

### Node Requirements

The engine must be able to:

- load nodes from structured data

- evaluate whether a node is available

- display node content

- display available choices

- hide unavailable choices

- apply node entry effects

- route to another node or location

- mark nodes as visited

- prevent unwanted repeated scenes unless allowed

---

## 10.2 Choice System

Choices are the player’s visible actions.

A choice should include:

- unique ID

- label

- optional description

- parent node

- display conditions

- effects

- destination

- time cost

- priority/order

- whether it is repeatable

- whether it ends the scene

Example:

```json
{
  "id": "C030_A",
  "label": "Follow him outside.",
  "conditions": [],
  "effects": [
    { "field": "time", "operation": "add_minutes", "value": 10 },
    { "field": "saw_black_car", "operation": "set", "value": true },
    { "field": "clerk_suspicion", "operation": "increment", "value": 1 }
  ],
  "destination": "N031"
}
```

### Choice Categories

The engine should support these types of choices:

```text
dialogue choice
movement choice
investigation choice
relationship choice
risk choice
wait choice
item choice
ending choice
```

### Choice Visibility

Some choices should always appear.

Some choices should appear only if conditions are met.

Example:

```text
Ask about the black car
Appears only if: saw_black_car = true
```

This allows the game to feel reactive.

---

## 10.3 World State System

The world state is the engine’s memory.

The MVP should support these state types:

### Boolean flags

Used for yes/no facts.

```text
knows_about_envelope = true
saw_black_car = false
has_envelope = false
```

### Numeric values

Used for relationship scores, suspicion, danger, money, health, etc.

```text
mara_trust = 2
clerk_suspicion = 1
player_stress = 3
```

### String / enum values

Used for current location, weather, current act, current companion, etc.

```text
location = Diner
current_companion = Mara
story_phase = Investigation
```

### Time values

Used for clocks, deadlines, schedules, and event windows.

```text
time = 16:10
day = Tuesday
```

### Inventory / collection values

Used for items, clues, documents, etc.

```text
inventory = ["quarter", "diner_receipt"]
clues = ["black_car", "plate_number"]
```

### Visited nodes

Used to prevent repeated content or enable callbacks.

```text
visited_nodes = ["N001", "N010", "N030"]
```

---

## 10.4 Condition System

The condition system determines whether nodes and choices are available.

The MVP should support the following condition operators:

```text
equals
not equals
greater than
greater than or equal
less than
less than or equal
contains
does not contain
is true
is false
has visited node
has not visited node
time before
time after
time between
```

Example condition:

```json
{
  "field": "mara_trust",
  "operator": "greater_than_or_equal",
  "value": 2
}
```

Writer-facing version:

```text
Mara trusts the player at level 2 or higher.
```

### Compound Conditions

The engine should support AND logic in the MVP.

Example:

```text
Show this node if:
- player knows about the envelope
- time is before 4:10 PM
- player is at the diner
```

OR logic can be introduced after the MVP if needed, but the first version can often avoid complexity by creating separate nodes.

---

## 10.5 Effect System

Effects are changes to world state.

The MVP should support:

```text
set value
increment number
decrement number
add item
remove item
add clue
remove clue
change location
advance time
mark event completed
mark node visited
trigger event
```

Example effects:

```json
[
  { "field": "knows_about_envelope", "operation": "set", "value": true },
  { "field": "mara_trust", "operation": "increment", "value": 1 },
  { "field": "time", "operation": "add_minutes", "value": 10 }
]
```

Writer-facing version:

```text
After this choice:
- Player learns about the envelope.
- Mara trusts the player more.
- 10 minutes pass.
```

---

## 10.6 Time System

> **v1.1 (normative — see §EE-1):** Time is **engine-derived**. The only source of truth for the
> clock is `startTime + Σ(add_minutes)`; the engine exposes `currentTime` and the renderer injects
> it. Node bodies must **not** embed absolute clock times as authored ground truth — use the
> `{{time}}` token or relative phrasing. The legacy authoritative node `time` field is demoted to
> `authorTimeHint` (editor-only, never read for logic). Per-action `add_minutes` costs must be
> calibrated so the deadline can bite; the linter fails the build if the longest reachable path
> cannot exceed the deadline.

The engine must support a simple in-game clock.

For the MVP, time can be represented as:

```text
day
hour
minute
```

Example:

```text
Tuesday, 3:00 PM
```

The engine should support:

- advancing time after choices

- checking time-based conditions

- triggering scheduled events

- changing location availability by time

- changing character availability by time

- creating missed-event consequences

### Time Advancement

Choices may cost time.

Examples:

```text
Ask Mara what she heard → +10 minutes
Walk to the diner → +15 minutes
Wait at diner → +20 minutes
Ride bike to arcade → +10 minutes
```

### Time-Based Scene Variants

The same location may show different scenes based on time.

Example:

```text
Diner before 4:10 PM:
The back booth is empty.

Diner at 4:10 PM:
The pickup happens.

Diner after 4:10 PM:
The envelope is gone, but a receipt remains.
```

---

## 10.7 Scheduled Event System

> **v1.1 (normative — see §EE-2):** Scheduled events are real engine triggers. After **every**
> time advance the engine evaluates all incomplete events **regardless of the player's location**.
> Present → route to the witnessed node; **Absent → apply the if-absent effects, automatically
> plant a discoverable clue at a reachable `recoveryNodeId`, mark the event completed, and log it.**
> Every event **must** declare a reachable `recoveryNodeId` (linter-enforced). The if-absent path
> therefore carries effects **and** a recovery node, not effects alone.

Scheduled events are major world events that happen at a certain time or under certain conditions.

Example:

```text
At 4:10 PM, the envelope is picked up.
```

The event should have different results depending on whether the player is present.

Example logic:

```text
IF player is at the Diner when the event fires:
    Route to node: Envelope Pickup Witnessed (ifPresentNode)
ELSE (player is anywhere else):
    Apply ifAbsentEffects (e.g. envelope_picked_up = true)
    Automatically plant the discoverable clue at the reachable recoveryNodeId
    Mark the event completed; write a debug log entry
```

### MVP Scheduled Event Requirements

The engine should support:

- event ID

- event title

- trigger condition

- node to route to if player is present (`ifPresentNode`)

- effects if player is absent (`ifAbsentEffects`)

- **reachable if-absent recovery node (`recoveryNodeId`) — mandatory (v1.1, linter-enforced)**

- event completion flag (fires at most once)

- debug log entry when event fires

Example:

```json
{
  "id": "E410",
  "title": "Envelope Pickup",
  "trigger": [
    { "field": "time", "operator": "greater_than_or_equal", "value": "16:10" }
  ],
  "eventLocation": "L_DINER",
  "ifPresentNode": "N030_witness",
  "ifAbsentEffects": [
    { "field": "envelope_picked_up", "operation": "set", "value": true },
    { "field": "diner_receipt_available", "operation": "set", "value": true },
    { "field": "clues", "operation": "add_clue", "value": "diner_receipt" }
  ],
  "recoveryNodeId": "N031_receipt"
}
```

---

## 10.8 Location System

The engine should support a small world map made of locations.

A location should include:

- unique ID

- name

- description

- available travel connections

- default scene

- available scenes

- time to travel there

- optional time windows

- optional conditions

- tags

Example:

```json
{
  "id": "L_DINER",
  "name": "Diner",
  "description": "A narrow chrome diner near the bus stop.",
  "travel_time_minutes": 15,
  "connected_locations": ["L_SCHOOL", "L_PAYPHONE", "L_ARCADE"],
  "default_node": "N_DINER_DEFAULT"
}
```

### Location-Based Branching

When the player enters a location, the engine should evaluate:

```text
Where is the player?
What time is it?
What does the player know?
What has already happened here?
Who is present?
What scenes are available?
```

The engine should then show the best available node.

---

## 10.9 Relationship System

The engine should support simple numeric relationship values.

Example:

```text
mara_trust = 0
nick_suspicion = 0
clerk_suspicion = 0
```

Choices can increase or decrease these values.

Example:

```text
Tell Mara the truth → mara_trust +1
Ignore Mara → mara_trust -1
Blame Mara → mara_trust -2
Accuse Nick → nick_suspicion +1
```

Relationship values can unlock or block scenes.

Example:

```text
Mara tells the player the truth only if mara_trust >= 2.
```

The authoring tool should show relationship effects in readable language.

---

## 10.10 Knowledge / Clue System

The engine should distinguish between things that exist in the world and things the player knows.

Example:

The black car may exist in the story, but the player only unlocks related choices after seeing it.

```text
saw_black_car = true
knows_plate_number = true
has_diner_receipt = true
```

Knowledge-based branching allows the game to show smarter choices.

Example:

At the arcade, if the player has seen the black car, a new dialogue choice appears:

```text
Ask Nick why his brother was in the black car.
```

If the player has not seen the car, that choice does not appear.

---

## 10.11 Ending System

> **v1.1 (normative — see §EE-3):** Endings are **not** nodes that choices link to. They live in
> an **ordered resolver list**, each gated by conditions over accumulated state, evaluated at
> resolution points (deadline reached or an explicit resolve trigger). The resolver selects the
> **first match**; a **mandatory catch-all default ending** guarantees no reachable end-state
> matches zero endings. Choices may advance state and time but **must not target an ending as a
> `destination`** (linter-enforced).

The engine should support multiple endings based on accumulated world state.

Endings are entries in a state-resolved list (not choice-linked nodes).

Example:

```text
Ending A: The Witness
Appears if:
- player saw the black car
- player knows the plate number
- player called the police
```

The engine should support:

- ending nodes

- ending conditions

- ending priority

- ending summary

- optional score or outcome explanation

The authoring tool should eventually show which endings are currently reachable or unreachable.

---

# 11. Player Experience Requirements

## 11.1 Mobile-Responsive Player View

The player interface should be designed mobile-first.

The basic screen should include:

- story text

- current location

- current time

- available choices

- optional status indicators

- optional inventory/clue access

- optional relationship hints

- navigation controls

- save/reset controls for testing

The UI should feel like an interactive story, not a spreadsheet.

### Basic Player Screen Layout

```text
--------------------------------
Location: Diner        4:05 PM
--------------------------------

The diner is mostly empty. The back
booth is open. A waitress wipes down
the counter while the cook shouts
through the kitchen window.

You notice a folded newspaper on
the back booth seat.

What do you do?

[ Check the booth ]
[ Ask the waitress about the envelope ]
[ Sit and wait ]
[ Leave before anyone notices you ]
--------------------------------
```

## 11.2 Choice Presentation

Choices should be clear, readable, and tappable.

Each choice should communicate an action.

Good:

```text
Ask Mara what she heard.
Follow the man outside.
Check under the booth.
Call Mara from the payphone.
```

Avoid overly abstract choices:

```text
Investigate.
Proceed.
Option 3.
```

## 11.3 Location Navigation

The player should be able to move between available locations when appropriate.

Possible location UI:

```text
Where do you go?

[ School ]
[ Diner ]
[ Arcade ]
[ Payphone ]
[ Home ]
```

The available locations may change based on time, story phase, or conditions.

## 11.4 Status Panel

The MVP player view may include a simple status strip:

```text
Time: 4:05 PM
Location: Diner
Clues: 2
Companion: Mara
```

For the final player experience, some status information may be hidden to preserve immersion.

For development and debugging, more state should be visible.

---

# 12. Authoring Tool Requirements

The authoring tool is essential because state-driven branching becomes difficult to manage manually.

## 12.1 Author Dashboard

The dashboard should show:

- game title

- number of nodes

- number of locations

- number of variables

- number of endings

- warnings

- unreachable nodes

- broken links

- sample playthroughs

- last edited content

## 12.2 Node Editor

The node editor should allow the creator to edit:

- node title

- node ID

- node type

- body text

- location

- conditions

- entry effects

- choices

- tags

- author notes

## 12.3 Choice Editor

The choice editor should allow the creator to define:

- choice label

- display conditions

- effects

- destination node

- time cost

- location change

- relationship changes

- clue changes

- whether the choice is visible or hidden when unavailable

## 12.4 Variable / State Manager

The state manager should list all game variables.

For each variable:

- name

- type

- default value

- description

- where it is changed

- where it is used

- writer-friendly label

Example:

```text
Variable: mara_trust
Type: number
Default: 0
Description: How much Mara trusts the player.
Changed by:
- N001 Choice A
- N032 Choice B
Used by:
- N050 Mara Tells the Truth
```

This is a crucial feature for preventing story logic from becoming unmanageable.

## 12.5 Location Editor

The location editor should allow the creator to define:

- location name

- description

- connected locations

- travel time

- default node

- available scenes

- conditional scenes

- time-based variants

## 12.6 Event Scheduler

The scheduler should allow creators to define events that happen at a specific time or condition.

Example:

```text
Event: Envelope Pickup
Trigger: 4:10 PM
If player is at Diner: show N030
If player is elsewhere: envelope is picked up, receipt becomes available
```

The scheduler should show a timeline view eventually.

## 12.7 Node Graph View

The graph view should show nodes and branches visually.

At minimum, it should show:

- nodes

- direct choice connections

- conditional nodes

- endings

- warnings

- unreachable nodes

The graph should make it clear that this is not a simple tree. It is a layered graph affected by state.

### Example Graph

```text
N001: After School
│
├── Ask Mara what she heard
│   └── N010: Mara’s Warning
│       ├── Ask about black car
│       │   └── N011: Description of the Car
│       │       └── Sets: saw_black_car = true
│       │
│       ├── Ask Mara to come with you
│       │   └── N012: Mara Joins You
│       │       └── Sets: mara_trust +1, companion = Mara
│       │
│       └── Leave for diner
│           └── L_DINER: Arrive at Diner
│
├── Go straight to diner
│   └── L_DINER: Arrive at Diner
│
├── Head to arcade
│   └── L_ARCADE: Arrive at Arcade
│
├── Go home first
│   └── L_HOME: Arrive Home
│
└── Wait around school
    └── N020: Parking Lot Watch
        └── Time advances to 3:30 PM
```

## 12.8 Debug Preview

The authoring tool should include a preview mode with a debug panel.

The debug panel should show:

- current time

- current location

- active variables

- known clues

- relationships

- visited nodes

- available choices

- hidden choices

- why hidden choices are hidden

- events that have fired

- upcoming scheduled events

- available endings

This is one of the most important simple wins.

---

# 13. Sample Game Requirement

The PRD must include a reference scenario / sample game.

The sample game is not the final game. It is a compact proof-of-concept that demonstrates the engine.

## 13.1 Sample Game Title

**The 4:10 Envelope**

## 13.2 Sample Game Purpose

The sample game exists to prove that the engine can support:

1. Direct choice branching.

2. Time-based branching.

3. Location-based branching.

4. Relationship-based branching.

5. Clue/knowledge-based branching.

6. Scheduled events.

7. Missed events.

8. Multiple endings.

9. Debuggable state.

10. A readable authoring model.

## 13.3 Sample Game Premise

You play as a teenager in a small town after school.

At 3:00 p.m., your friend Mara tells you she overheard something strange: someone is supposed to pick up a mysterious envelope from the back booth of a diner at exactly 4:10 p.m.

You have from 3:00 p.m. to 6:00 p.m. to investigate.

The player can:

- question Mara

- go to the diner

- visit the arcade

- use the payphone

- go home

- wait and watch

- follow suspicious people

- collect clues

- gain or lose Mara’s trust

- miss the pickup

- witness the pickup

- call the police

- get blamed

- discover partial truths

- reach different endings

## 13.4 Sample Game Locations

```text
School
Diner
Arcade
Payphone
Home
Park
Bus Stop
```

## 13.5 Sample Game Starting State

```text
time = 3:00 PM
location = School

knows_about_envelope = false
has_envelope = false
saw_black_car = false
knows_plate_number = false
has_diner_receipt = false
called_police = false

mara_trust = 0
clerk_suspicion = 0
nick_suspicion = 0

rival_alerted = false
envelope_picked_up = false
diner_receipt_available = false
companion = none
```

## 13.6 Opening Node

### N001: After School

Player sees:

```text
The last bell rings. {{time}}.

Most kids pour out toward the buses, but Mara grabs your sleeve before you can leave.

“I heard my brother talking about something weird,” she says. “An envelope. The diner. 4:10.”

She looks nervous.

What do you do?
```

Choices:

```text
1. Ask Mara what she heard.
2. Go straight to the diner.
3. Head to the arcade.
4. Go home first.
5. Wait around and watch the school parking lot.
```

## 13.7 Opening Choice Effects

### Choice 1: Ask Mara what she heard

Effects:

```text
knows_about_envelope = true
mara_trust += 1
time += 10 minutes
```

Destination:

```text
N010: Mara’s Warning
```

### Choice 2: Go straight to the diner

Effects:

```text
location = Diner
time += 15 minutes
```

Destination:

```text
L_DINER
```

### Choice 3: Head to the arcade

Effects:

```text
location = Arcade
time += 10 minutes
```

Destination:

```text
L_ARCADE
```

### Choice 4: Go home first

Effects:

```text
location = Home
time += 20 minutes
```

Destination:

```text
L_HOME
```

### Choice 5: Wait around and watch the parking lot

Effects:

```text
time += 30 minutes
saw_black_car = true
```

Destination:

```text
N020: Parking Lot Watch
```

---

# 14. Sample Game Flow Examples

## 14.1 Same Location, Different Result

The player goes to the diner.

The engine checks the state:

```text
location = Diner
time = current time
knows_about_envelope = true/false
envelope_picked_up = true/false
diner_receipt_available = true/false
```

### Version A: Player arrives early and knows about the envelope

Conditions:

```text
location = Diner
time < 4:10 PM
knows_about_envelope = true
```

Player sees:

```text
The diner is mostly empty. The back booth is open.

A waitress wipes down the counter while the cook shouts through the kitchen window.

You notice the back booth has a folded newspaper on the seat.
```

Choices:

```text
Check the booth.
Ask the waitress about the envelope.
Sit and wait.
Leave before anyone notices you.
```

### Version B: Player arrives early but does not know about the envelope

Conditions:

```text
location = Diner
time < 4:10 PM
knows_about_envelope = false
```

Player sees:

```text
The diner is quiet. A few people sit at the counter.

Nothing seems unusual.
```

Choices:

```text
Order a soda.
Look around.
Leave.
Wait for a while.
```

### Version C: Player arrives after 4:10

Conditions:

```text
location = Diner
time > 4:10 PM
envelope_picked_up = true
```

Player sees:

```text
The back booth is empty.

A wet ring from a coffee mug marks the table. Someone was sitting here recently.

On the floor, half-hidden under the booth, you spot a torn receipt.
```

Choices:

```text
Pick up the receipt.
Ask who was sitting here.
Check outside.
Leave.
```

This proves a core engine concept:

> The player can go to the same place, but the story changes depending on what time it is and what the player knows.

---

## 14.2 Scheduled Event Example

At 4:10 p.m., the engine runs the envelope pickup event.

Pseudo-logic:

```text
IF time == 4:10 PM AND envelope_picked_up == false:

    IF player location == Diner:
        show N030: Envelope Pickup Witnessed

    ELSE:
        envelope_picked_up = true
        diner_receipt_available = true
```

This means the world moves without waiting for the player.

If the player is present, they witness the scene.

If they are absent, they miss the event but can still discover evidence later.

---

## 14.3 Event Node: Envelope Pickup Witnessed

### N030: Envelope Pickup Witnessed

Conditions:

```text
location = Diner
time = 4:10 PM
envelope_picked_up = false
```

Player sees:

```text
{{time}} — a man in a gray coat enters the diner.

He does not look at the counter. He does not look at the menu.

He walks straight to the back booth, lifts the folded newspaper, and slips something into his jacket.
```

Choices:

```text
Follow him outside.
Confront him.
Pretend not to notice.
Tell the waitress.
Run to the payphone.
```

### Choice: Follow him outside

Effects:

```text
time += 10 minutes
saw_black_car = true
clerk_suspicion += 1
```

Destination:

```text
N031: The Black Car
```

### Choice: Confront him

Effects:

```text
time += 5 minutes
rival_alerted = true
```

Destination:

```text
N032: Bad Move
```

### Choice: Run to the payphone

Effects:

```text
location = Payphone
time += 15 minutes
```

Destination:

```text
L_PAYPHONE
```

---

## 14.4 Knowledge-Based Branch Example

At the arcade, the player encounters Nick.

### N060: Nick at the Arcade

Default player view:

```text
Nick is leaning against the pinball machine, acting like he owns the place.
```

Default choices:

```text
Ask if Nick has seen Mara.
Challenge Nick to a game.
Leave.
```

Conditional choice:

```text
Ask Nick why his brother was in the black car.
```

Condition:

```text
saw_black_car = true
```

This proves the knowledge system.

The player is not choosing from a fixed tree. The player’s knowledge changes what they are able to ask.

---

## 14.5 Relationship-Based Branch Example

Mara’s trust starts at 0.

Certain actions increase or decrease trust.

```text
Ask Mara what she heard → mara_trust +1
Ask Mara to come with you → mara_trust +1
Ignore Mara → mara_trust -1
Blame Mara → mara_trust -2
Tell Mara the truth → mara_trust +1
```

Later, this scene appears only if Mara trusts the player.

### N050: Mara Tells the Truth

Conditions:

```text
mara_trust >= 2
time >= 5:00 PM
knows_about_envelope = true
```

Player sees:

```text
Mara finally tells you the part she left out.

Her brother was not just talking about the envelope.

He was supposed to deliver it.
```

This proves the relationship system.

The player can reach this truth only if they treated Mara in a way that preserved trust.

---

# 15. Sample Game Endings

> **v1.1 (see §EE-3):** These endings are evaluated by the **Ending Resolver** as an **ordered
> list**, first match wins, at the resolution point. A **mandatory catch-all default** (Ending F
> below) guarantees exhaustiveness — no reachable end-state falls through with zero matches. No
> choice links directly to any ending.

## Ending A: The Witness

Conditions:

```text
saw_black_car = true
knows_plate_number = true
called_police = true
```

Summary:

The player does not get the envelope, but they report enough useful information to help expose what happened.

## Ending B: The Envelope

Conditions:

```text
has_envelope = true
mara_trust >= 1
```

Summary:

The player gets the envelope and brings it to Mara.

## Ending C: Too Late

Conditions:

```text
time >= 6:00 PM
has_envelope = false
called_police = false
```

Summary:

The player runs out of time and understands only part of the mystery.

## Ending D: Wrong Person

Conditions:

```text
rival_alerted = true
clerk_suspicion >= 2
```

Summary:

The player attracts too much attention and is blamed for causing trouble.

## Ending E: Quiet Truth

Conditions:

```text
mara_trust >= 2
knows_about_envelope = true
has_diner_receipt = true
```

Summary:

The player does not solve everything, but Mara trusts them enough to reveal the deeper truth.

## Ending F: Out of Time (default catch-all — mandatory)

Conditions:

```text
(none — this is the default; it matches when no ending above does)
```

Summary:

The afternoon slips away. Whatever the player did or didn't piece together, the deadline arrives
and the moment to act is gone. This default guarantees every reachable end-state resolves to
exactly one ending (v1.1 §EE-3); it is also the natural home for the "missed every exit / the
world moved without you" outcome once the clock bites.

---

# 16. Recommended MVP Scope

The MVP should be intentionally small and focused.

## MVP Objective

Build a working engine that can play through **The 4:10 Envelope** with:

- 5–7 locations

- 15–25 story nodes

- 10–15 state variables

- 1 scheduled event

- 2–3 relationship variables

- 3–5 possible endings

- mobile-responsive player UI

- basic author/debug interface

## MVP Must Include

### Runtime

- Load story data.

- Display current node.

- Display available choices.

- Apply choice effects.

- Advance time.

- Move between locations.

- Evaluate conditions.

- Trigger scheduled events.

- Track visited nodes.

- Reach endings.

### Authoring / Debug

- View nodes.

- Edit simple node content.

- View state variables.

- View current game state while previewing.

- See hidden choices and why they are hidden.

- Reset game.

- Jump to a node for testing.

- Export/import story JSON.

### Sample Content

- The 4:10 Envelope fully implemented as test content.

---

# 17. Staged Development Plan

> **v1.1 supersession — decomposed sub-projects.** The original Stage 1–8 order below predates the
> engine-enforcement revision. The product (runtime + authoring suite + AI flow utility + linter)
> is now decomposed into sequential sub-projects, each with its own spec → plan → build cycle.
> **We start at A and do not author into an engine that cannot yet enforce its own rules.**
>
> - **Sub-project A — Hardened Engine Core + Linter** (headless, fully unit-tested, pure TS). Where
>   every §EE fix lives. *Done when the linter blocks a deliberately-broken chapter and passes a correct one.*
> - **Sub-project B — Mobile-responsive Web Player + Debug Panel.** Thin UI over the core; localStorage saves.
> - **Sub-project C — Validation chapter.** Port the chosen sample to the hardened model and prove the thesis.
> - **Sub-project D — Authoring + Story-Flow Utility** (graph, inspector, AI-assist). Built last, on the proven core.
>
> The Stage 1–8 breakdown below is retained as finer-grained guidance for building Sub-projects A–B.

## Stage 1: Engine Skeleton

Goal:

Create the smallest possible working runtime.

Features:

- hardcoded sample story data

- render one node

- show choices

- click choice

- move to next node

- apply simple effects

- show current state in debug panel

Simple win:

> Player can start at N001, make a choice, and see the next scene with updated state.

## Stage 2: World State and Conditions

Goal:

Add the state-driven part of the engine.

Features:

- state object

- condition evaluator

- choice visibility rules

- node availability rules

- hidden-choice debug explanations

Simple win:

> A choice appears only after the player learns a clue.

## Stage 3: Time and Location

Goal:

Add the light open-world structure.

Features:

- current time

- time advancement

- locations

- travel choices

- location-based node selection

- time-based scene variants

Simple win:

> Going to the diner before or after 4:10 produces different scenes.

## Stage 4: Scheduled Events

Goal:

Make the world move without waiting for the player.

Features:

- scheduled event definitions

- event trigger checks after time advances

- present/absent event outcomes

- event log

Simple win:

> The envelope pickup happens at 4:10 whether or not the player is at the diner.

## Stage 5: Relationship and Knowledge Systems

Goal:

Support more human-feeling branches.

Features:

- relationship variables

- clue flags

- conditional dialogue choices

- relationship-gated scenes

Simple win:

> Mara reveals extra information only if the player has earned enough trust.

## Stage 6: Authoring Tool MVP

Goal:

Make the content manageable.

Features:

- node list

- node editor

- choice editor

- state variable list

- location list

- preview panel

- debug panel

- JSON import/export

Simple win:

> Creator can edit a node, preview the game, and see state changes.

## Stage 7: Graph View

Goal:

Make story structure visible.

Features:

- visual node graph

- choice edges

- conditional edge labels

- warning indicators

- unreachable node detection

Simple win:

> Creator can see how N001 connects to later scenes and where conditions affect the story.

## Stage 8: Sample Game Completion

Goal:

Finish The 4:10 Envelope as a full reference scenario.

Features:

- all sample nodes

- all sample endings

- debugged paths

- test playthroughs

- documentation

Simple win:

> A reviewer can play the sample and understand the engine’s value.

---

# 18. Technical Architecture Recommendation

## 18.1 Recommended Prototype Stack

For a mobile-responsive web prototype:

```text
Frontend: React or Next.js
Language: TypeScript
Styling: Tailwind CSS
State Management: Zustand or simple React state initially
Data Format: JSON for story content
Persistence: localStorage for MVP saves
Optional Later DB: SQLite, Supabase, or Postgres
Graph View: React Flow
```

## 18.2 Why This Stack

React / Next.js is well-suited for:

- interactive UI

- mobile-responsive player view

- editor forms

- stateful preview

- graph visualization

- later packaging as a web app

TypeScript is useful because the engine will rely heavily on structured data.

JSON is ideal for MVP story content because it is easy to inspect, export, version, and generate.

## 18.3 High-Level Architecture

```text
App
├── Player Runtime
│   ├── Current Node Renderer
│   ├── Choice Renderer
│   ├── Location Navigation
│   ├── Status Display
│   └── Save/Load
│
├── Engine Core
│   ├── State Manager
│   ├── Condition Evaluator
│   ├── Effect Processor
│   ├── Time Manager
│   ├── Location Resolver
│   ├── Event Scheduler
│   └── Ending Resolver
│
├── Authoring Tool
│   ├── Node List
│   ├── Node Editor
│   ├── Choice Editor
│   ├── Variable Manager
│   ├── Location Manager
│   ├── Event Manager
│   ├── Graph View
│   └── Debug Preview
│
└── Content Data
    ├── story.json
    ├── nodes.json
    ├── choices.json
    ├── locations.json
    ├── variables.json
    ├── events.json
    └── endings.json
```

---

# 19. Suggested Data Model

## 19.1 Game Object

```json
{
  "id": "game_410_envelope",
  "title": "The 4:10 Envelope",
  "startNodeId": "N001",
  "startState": {
    "time": "15:00",
    "location": "L_SCHOOL",
    "knows_about_envelope": false,
    "mara_trust": 0
  }
}
```

## 19.2 Node Object

```json
{
  "id": "N001",
  "title": "After School",
  "type": "scene",
  "location": "L_SCHOOL",
  "body": "The last bell rings. {{time}} — the parking lot is already half-empty...",
  "conditions": [],
  "entryEffects": [],
  "choices": ["C001_A", "C001_B", "C001_C"],
  "authorTimeHint": "~15:00 (editor-only; never read by engine logic — see §EE-1)",
  "tags": ["opening", "school", "mara"],
  "repeatable": false
}
```

## 19.3 Choice Object

```json
{
  "id": "C001_A",
  "label": "Ask Mara what she heard.",
  "conditions": [],
  "effects": [
    {
      "field": "knows_about_envelope",
      "operation": "set",
      "value": true
    },
    {
      "field": "mara_trust",
      "operation": "increment",
      "value": 1
    },
    {
      "field": "time",
      "operation": "add_minutes",
      "value": 10
    }
  ],
  "destination": "N010"
}
```

## 19.4 Condition Object

```json
{
  "field": "mara_trust",
  "operator": "greater_than_or_equal",
  "value": 2,
  "description": "Mara trusts the player enough to tell the truth."
}
```

## 19.5 Effect Object

```json
{
  "field": "saw_black_car",
  "operation": "set",
  "value": true
}
```

## 19.6 Location Object

```json
{
  "id": "L_DINER",
  "name": "Diner",
  "description": "A narrow chrome diner near the bus stop.",
  "connectedLocations": ["L_SCHOOL", "L_PAYPHONE", "L_ARCADE"],
  "travelTimes": {
    "L_SCHOOL": 15,
    "L_PAYPHONE": 5,
    "L_ARCADE": 10
  },
  "defaultNode": "N_DINER_DEFAULT"
}
```

## 19.7 Scheduled Event Object

```json
{
  "id": "E410",
  "title": "Envelope Pickup",
  "trigger": [
    { "field": "time", "operator": "greater_than_or_equal", "value": "16:10" }
  ],
  "eventLocation": "L_DINER",
  "ifPresentNode": "N030_witness",
  "ifAbsentEffects": [
    { "field": "envelope_picked_up", "operation": "set", "value": true },
    { "field": "diner_receipt_available", "operation": "set", "value": true },
    { "field": "clues", "operation": "add_clue", "value": "diner_receipt" }
  ],
  "recoveryNodeId": "N031_receipt"
}

> The trigger fires on the accumulated clock (`time_after`/`>=`), not an exact-minute match —
> `add_minutes` can skip past the boundary. Completion is tracked by the engine, so no
> `envelope_picked_up == false` guard is needed. `recoveryNodeId` is **mandatory** and must be
> reachable (v1.1 §EE-2).
```

## 19.8 Ending Object (v1.1)

Endings are entries in an **ordered resolver list**, not nodes. Conditions are over accumulated
state only; exactly one ending is the mandatory `isDefault` catch-all with no conditions.

```json
{
  "id": "ending_witness",
  "name": "The Witness",
  "priority": 10,
  "isDefault": false,
  "conditions": [
    { "field": "saw_black_car", "operator": "equals", "value": true },
    { "field": "knows_plate_number", "operator": "equals", "value": true },
    { "field": "called_police", "operator": "equals", "value": true }
  ],
  "summary": "The player reports enough to help expose what happened.",
  "body": "..."
}
```

The mandatory default catch-all (no conditions):

```json
{ "id": "ending_out_of_time", "name": "Out of Time", "isDefault": true, "conditions": [], "summary": "The deadline arrives; the moment to act is gone." }
```

## 19.9 Variable Registry Entry (v1.1)

Every author-declared variable carries a **single semantic purpose** (one variable = one meaning;
the linter flags overloading — §EE-5).

```json
{
  "name": "mara_trust",
  "type": "number",
  "default": 0,
  "singleSemanticPurpose": "How much Mara trusts the player (relationship only).",
  "writerLabel": "Mara's trust"
}
```

---

## 19.10 Numeric bounds & Resources (engine v1.3)

**Bounds.** A `VariableDef` may declare `min` and/or `max`. The engine clamps the result of every
`set`/`increment`/`decrement` into range. Variables without bounds are unclamped (back-compatible).
Authors should bound any numeric the walker must keep finite (trust, suspicion, heat).

**Resources (opt-in).** `Story.resources?: Resource[]`. A resource is a bounded number stored in world
state (usable in any condition/effect) with:
- `min`, `max`, `start`.
- optional `depletion: { everyMinutes, amount }` — **time-driven**: the value is recomputed from the
  clock as `clamp(start - amount * floor((time - startTime) / everyMinutes))`. Because it is a pure
  function of time, it adds no new state-space dimension. A time-driven resource must NOT be written by
  any effect (linted). A resource without `depletion` is **choice-driven**: changed only by effects, clamped.
- optional `atZero: { ending?, setFlag? }` — when the value reaches `min`, the engine resolves to
  `ending` (if not already ended) and/or sets `setFlag` true.
- optional `label`, `hidden` for an optional player meter.

Deferred (not in v1.3): per-node depletion, an arbitrary at-zero effect, regeneration via negative drain.

---

# 20. Engine Runtime Logic

## 20.1 Basic Runtime Loop

```text
1. Load current state.
2. Load current node or location.
3. Evaluate node conditions.
4. Render node text.
5. Evaluate available choices.
6. Hide unavailable choices.
7. Player selects choice.
8. Apply choice effects.
9. Advance time if needed.
10. Check scheduled events.
11. Resolve next node/location.
12. Check ending conditions.
13. Render next scene.
```

## 20.2 Location Resolution Logic

When the player enters a location:

```text
1. Find all nodes associated with this location.
2. Filter nodes by conditions.
3. Remove already-visited non-repeatable nodes.
4. Sort by priority.
5. Show highest-priority available node.
6. If no special node is available, show default location node.
```

## 20.3 Scheduled Event Logic

After **every** time advancement (v1.1 §EE-2 — location-independent):

```text
1. Check all incomplete scheduled events.
2. If an event's trigger condition is met (on the accumulated clock):
   a. Present  -> route to ifPresentNode.
   b. Absent   -> apply ifAbsentEffects AND auto-plant the discoverable
                  clue at the reachable recoveryNodeId.
3. Mark the event completed (it fires at most once).
4. Log the event in the debug panel.
```

## 20.4 Ending Resolution Logic

At a resolution point only — the deadline is reached or a node carries an explicit resolve
trigger (v1.1 §EE-3):

```text
1. Walk the ordered ending list.
2. Select the FIRST non-default ending whose conditions pass.
3. If none match, select the mandatory catch-all default ending.
   (No reachable end-state may match zero endings.)
4. Present the resolved ending. Choices never link to endings directly.
```

---

# 21. Debugging Requirements

Debugging is not optional. It is a core feature.

Without debugging, the creator will not understand why the branching story is behaving the way it is.

## 21.1 Debug Panel

The debug panel should display:

```text
Current Node
Current Location
Current Time
Visited Nodes
Active Flags
Relationships
Inventory
Known Clues
Available Choices
Hidden Choices
Reason Hidden
Scheduled Events
Fired Events
Possible Endings
```

## 21.2 Hidden Choice Explanation

Example:

```text
Choice hidden:
"Ask Nick why his brother was in the black car."

Reason:
Requires saw_black_car = true.
Current value: false.
```

## 21.3 Unavailable Node Explanation

Example:

```text
Node unavailable:
"N050: Mara Tells the Truth"

Reasons:
- Requires mara_trust >= 2. Current value: 1.
- Requires time >= 5:00 PM. Current time: 4:35 PM.
```

This feature will be extremely useful for both the human creator and AI coding agents.

---

# 22. Testing Requirements

## 22.1 Engine Unit Tests

The engine should include tests for:

- condition evaluation

- effect application

- time advancement

- scheduled event triggering

- location node resolution

- ending resolution

- hidden choice explanation

- visited node tracking

## 22.2 Sample Game Path Tests

The sample game should include predefined path tests.

Example:

### Path Test 1: Witness Ending

```text
Start
Ask Mara what she heard
Go to diner
Wait until 4:10
Follow man outside
Memorize plate
Go to payphone
Call police
Expected ending: The Witness
```

### Path Test 2: Too Late Ending

```text
Start
Go home
Go arcade
Go diner after 4:10
Ignore receipt
Run out clock
Expected ending: Too Late
```

### Path Test 3: Quiet Truth Ending

```text
Start
Ask Mara what she heard
Ask Mara to come with you
Miss diner event
Find receipt
Return to Mara
Expected ending: Quiet Truth
```

## 22.3 Authoring Tool Validation (build-blocking linter — v1.1 §EE-5)

The linter runs in CI/build **and** live in the authoring tool. **Errors block the build.**

**Three blocking checks (new in v1.1):**

1. **Deadline reachability** — compute the longest reachable accumulated-time path; **FAIL** if it
   cannot exceed the deadline (the clock can never bite). **Warn** if the shortest path already
   overruns the deadline (unwinnable by construction).
2. **Ending exhaustiveness & reachability** — every reachable end-state matches **exactly one**
   ending; flag dead-code (unreachable) endings and zero-match holes (fall-through).
3. **Scheduled-event integrity** — every scheduled event defines present + absent effects **and**
   has a reachable `recoveryNodeId`; a choice must not target an ending as a destination.

**Carried over (still required, now enforced):**

- broken node links
- missing destinations
- undefined variables
- unused variables
- unreachable nodes
- duplicate IDs
- nodes with no exit
- endings that cannot be reached
- conditions referencing deleted variables

**Guardrail (P2): one variable = one meaning** — flag a variable whose use suggests it encodes
more than its declared `singleSemanticPurpose`.

---

# 23. Success Metrics

> **v1.1 success criteria (supersede the originals where they conflict):**
> 1. The clock **can** run out — linter-proven and felt in play.
> 2. A scheduled event fires whether or not the player is present, and the absent path leaves a
>    recoverable clue at a reachable node.
> 3. Endings resolve from accumulated state with **no zero-match holes and no dead-code endings**.
> 4. No node narrates a flag that isn't set on the path that reached it.
> 5. The **same engine core** powers the player, the linter, and (later) the authoring tool.
> 6. A reviewer feels reactivity on the **time and events** axes, not only the clue axis.

For MVP, success should be measured by whether the engine can demonstrate the concept clearly.

## MVP Success Criteria

The MVP is successful if:

1. A user can play through The 4:10 Envelope from start to ending.

2. The game produces different outcomes based on choices, time, location, clues, and relationships.

3. The scheduled 4:10 event works whether the player is present or absent.

4. The author can see current world state while previewing.

5. The author can understand why a choice is available or hidden.

6. The sample game can be represented as structured data.

7. The system can be extended to another story without rewriting engine logic.

## Qualitative Success Criteria

A reviewer should be able to say:

```text
I understand how this engine is different from a normal branching story.
I understand how choices affect future scenes.
I understand how a writer would author this.
I understand how the sample game proves the system.
```

---

# 24. Key Risks

## Risk 1: Branching complexity becomes unmanageable

Mitigation:

- keep MVP small

- require debug panel

- use variable manager

- add graph view

- include validation warnings

- avoid advanced logic too early

## Risk 2: The player feels lost

Mitigation:

- use curated location choices

- show clear objectives when appropriate

- use time pressure carefully

- provide alternate clues if major events are missed

- avoid dead-end locations

## Risk 3: The authoring tool becomes bigger than the engine

Mitigation:

- start with JSON and simple forms

- add graph view after runtime works

- build authoring features only around real sample game needs

## Risk 4: The engine becomes too genre-specific

Mitigation:

- keep sample game generic

- use neutral terms like nodes, locations, clues, relationships

- avoid hardcoding mob-game concepts

- treat the first real game as a content pack

## Risk 5: Too much technical logic leaks into writing

Mitigation:

- provide writer-friendly condition labels

- use plain-English descriptions

- show human-readable summaries of effects

- create templates for common branches

---

# 25. Recommended Simple Wins

These should be prioritized because they will quickly prove the idea.

## Simple Win 1: One working node with state changes

Player chooses “Ask Mara what she heard.”

State changes:

```text
knows_about_envelope = true
mara_trust = 1
time = 3:10 PM
```

## Simple Win 2: Conditional choice appears

At the diner, “Ask about the envelope” appears only if:

```text
knows_about_envelope = true
```

## Simple Win 3: Same location changes by time

Diner before 4:10 is different from diner after 4:10.

## Simple Win 4: Scheduled event fires

Envelope pickup happens at 4:10 whether or not the player is present.

## Simple Win 5: Debug panel explains hidden choices

The creator can see why a choice is unavailable.

## Simple Win 6: Multiple endings

At least three endings are reachable based on accumulated state.

---

# 26. Future Enhancements

After MVP, possible enhancements include:

- native mobile wrapper

- AI-assisted scene writing

- AI-assisted branch analysis

- automatic path simulation

- story coverage map

- relationship graph

- timeline visualization

- inventory system

- character schedules

- reusable story templates

- visual condition builder

- export to playable static web build

- cloud save

- user accounts

- multiple projects

- collaborative editing

- version history

- localization

- audio/music support

- image support

- procedural variation

- achievement system

- analytics for player choices

---

# 27. Handoff Prompt for Another Agent Review

Use the following prompt to have another AI agent review the concept.

```text
I am designing a mobile-responsive state-driven narrative game engine.

The engine is intended to combine the feel of Choose Your Own Adventure books, Oregon Trail, Carmen Sandiego, and interactive branching movies, but with a light open-world structure.

The core idea is that the story branches not only through direct player choices, but also through world state: time, location, known clues, relationships, prior actions, missed events, inventory, and scheduled events.

The engine has two parts:
1. A player runtime where the user experiences the story.
2. An authoring tool where the writer creates story nodes, branches, conditions, consequences, locations, variables, and scheduled events.

The sample proof-of-concept game is called The 4:10 Envelope. In it, the player hears about a mysterious envelope pickup happening at a diner at 4:10 PM. The player can investigate by going to different locations, talking to characters, collecting clues, gaining or losing trust, witnessing or missing the event, and reaching multiple endings.

Please review this concept and answer:

1. Does the engine concept make sense?
2. Is the difference between a normal branching story and a state-driven narrative clear?
3. Does the sample game effectively demonstrate the engine?
4. Are there any missing systems that would be required for an MVP?
5. Are there any parts that seem too complex for a first version?
6. Would a developer understand how to start building this?
7. Would a non-technical writer understand how to author stories in this system?
8. What should be simplified?
9. What should be added?
10. What are the biggest risks?
```

---

# 28. Open Questions

These do not block MVP development, but should be answered eventually.

1. Should the first production game be built inside the same repo as the engine, or as a separate content pack?

2. Should the authoring tool store content as JSON first, or use a database from the beginning?

3. Should unavailable choices be hidden from the player or shown as disabled hints?

4. Should the player see relationship/status values, or should those remain hidden?

5. Should the player have an explicit objective list?

6. Should time always be visible?

7. Should the game support save slots in the first version?

8. Should the graph view be part of MVP or early alpha?

9. Should the engine eventually support images and UI cards per node?

10. Should the sample game use a mystery theme, or should it be even more abstract?

---

# 29. Recommended MVP Build Order

The recommended development order is:

```text
1. Define TypeScript data models.
2. Create sample story JSON.
3. Build condition evaluator.
4. Build effect processor.
5. Build basic node renderer.
6. Build choice click handling.
7. Add world state display.
8. Add time advancement.
9. Add location system.
10. Add scheduled event system.
11. Add ending resolver.
12. Build sample game nodes.
13. Add debug panel.
14. Add simple node list/editor.
15. Add validation checks.
16. Add graph view.
```

The first true milestone should be:

> A playable version of The 4:10 Envelope where the diner scene changes based on whether the player knows about the envelope and whether they arrive before or after 4:10 PM.

That single milestone proves the heart of the engine.

---

# 30. Final Product Definition

BranchWorld Engine is a tool for creating interactive narrative games where story progression is shaped by:

- direct choices

- time

- location

- relationships

- clues

- knowledge

- inventory

- prior actions

- scheduled events

- missed opportunities

- accumulated consequences

The core product is not just a game player.

The core product is a way to author and understand branching narrative logic.

The sample game, The 4:10 Envelope, should be used as the proof that the engine works.

The MVP should stay small, but it must include the essential idea:

> The player goes somewhere, at a certain time, with certain knowledge, after making certain choices — and the story responds.

That is the engine.

---

# Appendix A — v1.1 Revision Rationale (why the engine-enforcement corrections exist)

*This appendix preserves the rationale that originally lived in the standalone "v1.1" delta note.
The normative rules themselves are in **§ Engine-Enforcement Requirements (v1.1)** near the top and
are reflected throughout §10, §15, §17, §19, §20, and §22–23.*

## A.1 The review finding

Three independent design teams — each running designer → writer → playtester in isolation —
separately invented, wrote, and adversarially playtested a complete chapter one against the
original (v0.1) model. All three, working blind to one another, shipped the **same four structural
failures**:

1. The deadline could not run out (per-action time costs far too cheap).
2. Authors hardcoded fictional timestamps into prose to fake the urgency the clock wasn't conveying.
3. The "world moves without you" scheduled event was never a real trigger — only an opt-in choice in
   one node — and the if-absent clue-recovery path was unimplemented.
4. Endings were hardwired to specific choices rather than resolved from accumulated state, so the
   fiction asserted outcomes the state contradicted.

Convergence this tight across isolated teams is the signal: **these are not authoring mistakes, they
are the path of least resistance the v0.1 model creates.** The clue/knowledge-gating pillar — the one
feature v0.1 forced the author to wire correctly — worked in all three and was the only thing that
felt like a living world.

> **Organizing principle of v1.1:** the engine enforces its own promises; the author cannot silently
> break them. Anything v0.1 left to author discipline becomes an engine primitive plus a
> build-blocking linter check.

## A.2 The four corrections → where they now live

| Correction | Normative rule | Reflected in |
|---|---|---|
| Time is engine-derived; hardcoded timestamps banned | §EE-1 | §10.6, §19.2 |
| Scheduled events real + mandatory if-absent recovery | §EE-2 | §10.7, §19.7, §20.3 |
| Endings resolved from state, exhaustive, default catch-all | §EE-3 | §10.11, §15, §19.8, §20.4 |
| Prose must not contradict state | §EE-4 | per-ending checklist, AI-assist pass |
| Build-blocking linter (3 checks) | §EE-5 | §22.3 |
| One pure engine core | §EE-6 | §18.3 |

## A.3 The reviewer's recommended next step (retained verbatim)

> "Before authoring any more chapters, harden the engine and add a linter — do not fix the three
> chapters first. Specifically: (1) make time engine-derived and ban hardcoded node timestamps;
> (2) make scheduled events fire on the accumulated clock with a mandatory if-absent clue path;
> (3) replace choice→ending links with a single state-resolver that requires an exhaustive cascade.
> Then ship a build-time validator that fails on three checks: the longest reachable path cannot
> exceed the deadline, every reachable end-state matches exactly one ending, and every scheduled
> event has a reachable absent-path recovery. Re-run the smallest, strongest chapter through the
> hardened engine as the reference implementation."

*Full team-by-team detail lives in `branchworld-review.md`.*
