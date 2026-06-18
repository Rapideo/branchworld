# Sub-project D1 — Story Editor (Edit-in-the-Graph) — Design

> **Status:** Approved design (2026-06-17). Next step: implementation plan via writing-plans.
> **Depends on:** A (engine + linter), B (player), C (chapter), D2 (flow graph) — all complete.
> **PRD references:** §3 (authoring tool — the editor), §EE-1…§EE-6.

## 1. Goal & scope

Build the first cut of the **Story Editor**: a forms-based authoring layer woven into the D2 flow graph,
so a writer can build a **complete, playable, lint-clean chapter end-to-end without hand-writing
TypeScript.** Click a scene on the graph to edit it (text, choices, conditions, effects); add and delete
scenes; edit the global story elements (variables, scheduled events, endings, story settings) in a
settings drawer; the linter runs live and draws problems on the graph; work auto-saves to a local drafts
library with JSON import/export. This is the bridge from "engine for engineers" to "tool for writers."

**In scope (the complete authoring loop):**
- Edit scenes (title, body, type, location, entry effects, resolves-ending) + their choices (label,
  destination, conditions, effects) via an editable inspector.
- Add / delete scenes.
- Globals via a Story Settings drawer: **story meta** (title, start scene, start time, deadline, start
  location), **variables**, **scheduled events**, **endings** (ordered).
- An **auto-saving drafts library** (localStorage) with **New / Duplicate / Import / Export**.
- Live linting on every edit (reusing the engine linter + the D2 overlay); never blocks editing.
- A **Play | Graph | Edit** view switch; drafts appear in the story picker alongside the read-only examples.

**Explicitly deferred (named, not dropped):**
- The **locations-metadata editor** (names/descriptions/travel-times/connections). Location is just a
  label to the engine; `change_location` works on the string, so this is a fast follow.
- **Scene-id renaming** — ids are auto-generated and stable; the writer edits the human-readable *title*.
  A rename-with-reference-rewrite is a later nicety.
- **Graph-canvas drag-to-connect** — choices are wired via the inspector's destination dropdown for now.

## 2. Decisions (locked during brainstorming)

| # | Decision | Choice |
|---|---|---|
| 1 | Editor model | **Edit inside the graph** — click a scene → edit it; globals in a settings drawer; lint redraws on the canvas. |
| 2 | Scope | **Complete authoring loop** — all entities needed for a playable story; defer the locations-metadata editor. |
| 3 | Workflow | **Auto-saving drafts library** — drafts in localStorage, listed in the picker; New/Duplicate/Import/Export; bundled examples read-only. |
| a | Architecture | **Pure edit-operations + drafts store + thin editor layer** (Approach A). |
| b | Operations grain | **Coarse, entity-level** (`upsert`/`delete` a whole scene/variable/event/ending); nested choice/condition editing happens in the inspector form before committing. |
| c | Scene ids | **Auto-generated and stable**; edit the title, not the id (sidesteps reference-rewrite in v1). |
| d | Lint behavior | **Never blocks an edit.** Lint continuously, draw problems on the graph + banner; a draft saves/exports in any state. |

## 3. Architecture

The risky correctness lives in **pure, framework-free functions** (`src/author/edit/operations.ts`) that
take a `Story` and return a new `Story` — immutable, node-unit-tested exactly like the D2 transforms. A
**drafts store** (localStorage CRUD, error-safe, mirroring B's saves storage) handles persistence. The UI
is a thin React layer: a `useEditor` hook applies an operation → autosaves → lets the graph and linter
recompute. The same `Story` the editor produces is the one the Play and Graph views consume — one object,
three faces (EE-6). The engine (`src/engine/**`) is **untouched**.

**Targeted D2 refactor:** extract the React Flow canvas out of `GraphView` into a shared
`StoryGraphCanvas`, so the read-only `GraphView` and the new `EditorView` render the *same* graph and
differ only in the side panel (read-only inspector vs editable inspector + settings drawer). No behavior
change to the existing Graph view; its tests stay green.

```
 edit (form) ─▶ pure operation ─▶ new Story ─▶ useEditor.setStory ─┬─▶ debounce → drafts store (autosave)
                                                                   ├─▶ StoryGraphCanvas re-layout
                                                                   └─▶ lintStory → overlay + banner (live)
 toolbar: New / Duplicate / Import / Export ─▶ drafts store
```

## 4. Pure edit operations (`src/author/edit/operations.ts`, node-unit-tested — the testable core)

```ts
import type { Story, StoryNode, VariableDef, ScheduledEvent, Ending } from '../../engine';

type MetaPatch = Partial<Pick<Story, 'title' | 'startNodeId' | 'startTime' | 'deadline' | 'startLocation'>>;
export function setStoryMeta(story: Story, patch: MetaPatch): Story;

export function upsertNode(story: Story, node: StoryNode): Story;     // add if id absent, else replace
export function deleteNode(story: Story, nodeId: string): Story;      // removes the node AND any choice in OTHER nodes targeting it (no dangling edges the writer didn't make)

export function upsertVariable(story: Story, v: VariableDef): Story;  // keyed by name
export function deleteVariable(story: Story, name: string): Story;

export function upsertEvent(story: Story, ev: ScheduledEvent): Story; // keyed by id
export function deleteEvent(story: Story, id: string): Story;

export function upsertEnding(story: Story, e: Ending): Story;         // keyed by id
export function deleteEnding(story: Story, id: string): Story;
export function reorderEndings(story: Story, orderedIds: string[]): Story; // order is load-bearing for the resolver

export function freshNodeId(story: Story): string;   // smallest unused `scene_<n>` — pure, deterministic
```

All operations are **immutable** (return a new `Story`, never mutate the argument) and **total** (never
throw on odd input). Choices, and their conditions/effects, are edited as part of the node object inside
the inspector form and committed via `upsertNode` — so the operation surface stays small and testable.

`deleteNode` cleans up **choice** references (it removes choices in other scenes that targeted the deleted
scene). References to the deleted scene from **scheduled events** (`ifPresentNode`/`recoveryNodeId`),
**`startNodeId`**, or anywhere else are left in place and become **lint errors** the writer is shown and
resolves — the editor never silently rewrites the author's structure beyond the obvious dangling-choice case.

## 5. Drafts store (`src/author/edit/drafts.ts`, error-safe localStorage, jsdom-tested)

```ts
import type { Story } from '../../engine';

export interface DraftMeta { id: string; title: string; savedAt: string; }

export function listDrafts(): DraftMeta[];
export function loadDraft(id: string): Story | undefined;
export function saveDraft(story: Story): void;                 // keyed by story.id
export function deleteDraft(id: string): void;
export function duplicateAsDraft(source: Story): Story;        // fresh id + " (copy)" title, saved, returned
export function importDraft(json: string): { ok: true; story: Story } | { ok: false; error: string };
export function exportDraft(story: Story): string;             // pretty JSON
```

Storage key `branchworld:drafts` → `{ [id]: { story: Story; savedAt: string } }`. A draft *is* a `Story`;
drafts are distinguished from bundled examples by living in this store. All access is wrapped in
try/catch — unavailable or corrupt storage degrades to an empty list, never crashes.

## 6. Editor UI (`src/author/edit/`)

- **`useEditor(draftId)`** — loads the draft into state and returns the current `story` plus the
  operations from §4, each bound to (current story) + **debounced autosave** to the drafts store. Also
  exposes `freshNodeId()`.
- **`StoryGraphCanvas`** (extracted from `GraphView`) — the React Flow render of a story with selection;
  consumed by both `GraphView` (read-only) and `EditorView`.
- **`EditorView`** — the Edit screen: `StoryGraphCanvas` + `EditableInspector` + **Add scene** + a
  **Story Settings** drawer toggle + a **Toolbar**. Uses `useEditor`.
- **`EditableInspector`** — when the selected scene belongs to a draft: form fields for title / body /
  type (`<select>` over `NodeType`) / location / resolves-ending; its **choices** (each: label, a
  **destination `<select>`** of real scene ids, plus condition and effect rows); the scene's entry
  effects and availability conditions. Commits via `upsertNode`. (On a read-only bundled story, the
  inspector stays the D2 read-only view.)
- **`ConditionRows` / `EffectRows`** — reusable editors for a `Condition[]` / `Effect[]`: an **operator
  `<select>`** (over `ConditionOp` / `EffectOp`), field and value text inputs, add/remove a row. Reused
  for node conditions, choice conditions/effects, node entry effects, event trigger / if-absent effects,
  and ending conditions.
- **`StorySettingsDrawer`** — sections: **Meta** (title, start-scene `<select>`, start time, deadline,
  start location); **Variables** (list + add/edit/delete: name, type `<select>`, default, purpose);
  **Events** (list + editor: id, title, `trigger` via `ConditionRows`, event location, `ifPresentNode`
  `<select>`, `ifAbsentEffects` via `EffectRows`, `recoveryNodeId` `<select>`); **Endings** (ordered list
  + reorder + editor: name, `conditions` via `ConditionRows`, summary, body, is-default).
- **`Toolbar`** — **New** (blank draft), **Duplicate** (copy the selected story — incl. a bundled one —
  into a draft), **Import** (file/paste → `importDraft`), **Export** (`exportDraft` → download).

**`App.tsx` changes:** `view: 'play' | 'graph' | 'edit'`; the story picker lists bundled examples **plus**
`listDrafts()`. Selecting a bundled example and pressing **Edit** prompts "Duplicate to edit?" (bundled
examples are read-only). New/Duplicate/Import create a draft and switch to Edit.

## 7. Data flow & live lint

Edit → pure operation → new `Story` → `useEditor` sets state + debounce-saves the draft → the canvas
re-lays-out and `lintStory` re-runs → problems redraw on the map (the D2 overlay) and in the banner —
**live, and never blocking the edit.** A draft is always editable and exportable, in any state; the lint
just tells you the truth about it. This matches the established principle: the linter *informs* while you
author and *gates* only at ship time.

## 8. Error handling

- Operations are total — they never throw on odd input.
- **Import:** invalid JSON → a clear, non-blocking error message, nothing loaded; valid-JSON-but-imperfect
  story → loaded as a draft with the linter flagging it (you imported it to *fix* it).
- **Drafts storage:** unavailable/corrupt localStorage degrades to an empty drafts list, never crashes.
- **Playing an invalid draft:** the engine throws on mount if the start scene is missing, and mid-play if
  you pick a choice whose destination scene doesn't exist. The **Play view guards both**: (a) it does not
  construct the engine unless the start scene exists (`story.nodes.some(n => n.id === story.startNodeId)`),
  showing a friendly *"This draft has N issue(s) — fix them in Edit to play"* panel instead; and (b) the
  Player is wrapped in a small **error boundary** that catches any engine throw mid-play and shows the same
  panel rather than blanking the app. The Graph and Edit views always render (their transforms are total).

## 9. Layout sketch

```
┌──────────────────────────────────────────────────────────┐
│ Story: The Prater Line (draft) ▾   [Play | Graph | ▣Edit] │
│ New · Duplicate · Import · Export        ⚙ Story Settings │
│ ⚠ 0 errors · 1 warning                                    │
├──────────────────────────────────┬───────────────────────┤
│        (the flow graph)          │  Inspector — EDITING   │
│   ┌────┐    ┌─────┐   + Add scene │  Title [Café Sperl   ] │
│   │safe│──▶ │sperl│               │  Body  [She's already…]│
│   └────┘    └─────┘               │  Choices:              │
│        ╲   (lint rings live)      │   • "Tell the truth"   │
│      [E]┄▶witness  ◜endings◞       │     → [briefed ▾]      │
│                                   │     if [trust][gte][2] │
│                                   │   + Add choice    🗑    │
└──────────────────────────────────┴───────────────────────┘
        (⚙ Story Settings drawer: Meta · Variables · Events · Endings)
```
Restrained palette matching the player/graph; operator and destination/scene pickers are `<select>`s.

## 10. Testing

- **Pure operations** (`operations.test.ts`, node env): immutability (input unchanged), `upsertNode`
  add-vs-replace, `deleteNode` reference-aware cleanup, `reorderEndings`, `setStoryMeta`, `freshNodeId`
  uniqueness — asserted against `praterLine`/`sampleStory` and small fixtures.
- **Drafts store** (`drafts.test.ts`, jsdom for localStorage): save/load/list/delete round-trip,
  `duplicateAsDraft` (fresh id + copy title), `importDraft` (bad JSON → `{ok:false}`; good → `{ok:true}`),
  `exportDraft`→`importDraft` round-trip, corrupt-storage tolerance.
- **Editor components** (jsdom, mocking `@xyflow/react` as in D2): `ConditionRows`/`EffectRows` add/edit/
  remove with the operator `<select>`; `EditableInspector` editing a field/choice commits via the bound op;
  `StorySettingsDrawer` adding a variable and an ending; the Play-view guard on an invalid draft.
- **Integration** (jsdom): create a New draft → add a scene + a choice with a condition → the lint banner
  updates → Export → re-Import → the round-tripped story matches. The existing player/graph tests stay green
  (the `StoryGraphCanvas` extraction is behavior-preserving).
- Full suite + `tsc --noEmit` + `vite build` green.

## 11. Done-when

- `npm run dev` shows **Play | Graph | Edit**; a writer can **New** (or **Duplicate** The Prater Line) into
  a draft, edit scenes/choices/conditions/effects in the inspector, add/delete scenes, edit variables,
  events, endings, and story settings in the drawer — and the **linter updates live on the graph** as they
  type, never blocking the edit.
- Drafts **auto-save** and appear in the picker; **Export** downloads valid JSON; **Import** loads it back.
- A draft authored from scratch can be made lint-clean and then **played** and **graphed** through the same
  engine — proving a non-programmer can produce a complete, playable chapter.
- The pure operations and drafts store are unit-tested; component + integration tests pass; full suite +
  `tsc` + `vite build` green.
