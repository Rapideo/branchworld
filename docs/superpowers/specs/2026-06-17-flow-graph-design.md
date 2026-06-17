# Sub-project D2 — Visual Node/Flow Graph — Design

> **Status:** Approved design (2026-06-17). Next step: implementation plan via writing-plans.
> **Depends on:** Sub-projects A (engine + linter), B (web player), C (validation chapter) — all complete.
> **PRD references:** §3 (authoring & story-flow utility — graph as a core deliverable), §EE-1…EE-6.

## 1. Goal & scope

Build the first piece of the authoring suite (Sub-project D): a **read-only visual flow graph** that
renders any `Story` as an auto-laid-out node/edge diagram with the **live linter results overlaid**, a
**time-axis strip** for the deadline window and scheduled events, a **click-to-inspect** side panel, and
a **play-from-here** hook into the existing engine/player. It directly answers the PRD's thesis driver:
*state-driven branching is unmanageable to author by hand.* The graph derives entirely from the `Story`
via pure functions; React Flow is a thin renderer.

**In scope:** the flow graph (nodes, choice edges with condition labels, endings as a distinct cluster,
each scheduled event as a badge with present/recovery edges), dagre auto-layout, lint overlay + banner,
a startTime→deadline time-axis strip with event marks, a read-only node inspector panel, play-from-here,
and a Play|Graph view switch in the existing app.

**Explicitly out of scope (later sub-projects, not dropped):**
- Editing the story from the graph or forms (drag/connect/add/delete, field editing) → **D1**.
- The deeper "why did/didn't this appear" state-trace and full *used-by* analysis → **D3**.
- AI-assist (prose drafting, branch/consistency analysis, calibration proposals) → **D4**.
- A genuine per-node *reachable-time* timeline layout (nodes positioned by accumulated time). The
  time-axis strip shows only the window + event trigger marks, not node placement by time.

## 2. Decisions (locked during brainstorming)

| # | Decision | Choice |
|---|---|---|
| 1 | First D piece | **D2 — the visual flow graph** (PRD's headline core deliverable). |
| 2 | Interaction | **Read-only explorer** + click-to-inspect panel + **play-from-here**. |
| 3 | Scheduled events | **Both** — annotated in the graph (badge + present/recovery edges) AND a time-axis strip. |
| a | Architecture | **Pure transforms + React Flow + dagre**; React Flow is a thin renderer (Approach A). |

## 3. Architecture

Everything the graph displays is derived from the `Story` by **pure, framework-free functions** that are
unit-tested in the node environment. React Flow (`@xyflow/react`) renders the derived, positioned nodes
and edges. Play-from-here reuses the engine's existing `GameEngine.gotoNode`. The engine (`src/engine/**`)
is untouched. New module: `src/author/graph/`. `App.tsx` gains a **Play | Graph** view switch beside the
existing story selector; the same selected `Story` feeds either view.

```
 Story ─▶ storyToGraph ─▶ layout(dagre) ─┐
         lintStory ─▶ lintStatus ────────┼─▶ GraphView (React Flow) ─▶ click ─▶ InspectorPanel
         timeAxis ───────────────────────┘                                   └─▶ onPlayFrom(id)
                                                                                    │
 App: [Play | Graph] switch ◀──────────────────────────────────────────────────────┘ (gotoNode in Player)
```

**New dependencies (runtime):** `@xyflow/react` (React Flow v12), `@dagrejs/dagre` (layout; ships TS types).

## 4. Pure transforms (`src/author/graph/`, node-env unit-tested against `praterLine` + `sampleStory`)

```ts
// model.ts
export type GraphNodeKind = 'node' | 'ending' | 'event' | 'resolver';
export interface GraphNode {
  id: string; kind: GraphNodeKind; label: string;
  nodeType?: NodeType; resolvesEnding?: boolean;
  isStart?: boolean; isDefaultEnding?: boolean; triggerLabel?: string; // event badge time
}
export type GraphEdgeKind = 'choice' | 'event-present' | 'event-recovery' | 'resolves';
export interface GraphEdge { id: string; source: string; target: string; label?: string; kind: GraphEdgeKind; }

// storyToGraph.ts
export function storyToGraph(story: Story): { nodes: GraphNode[]; edges: GraphEdge[] };
//   - one 'node' per StoryNode (label=title, nodeType, resolvesEnding, isStart = story.startNodeId)
//   - one 'ending' per Ending (label=name, isDefaultEnding)
//   - one 'event' per ScheduledEvent (label=title, triggerLabel from its time_after trigger)
//   - choice edges: source=node, target=choice.destination, kind 'choice',
//       id = `${nodeId}__${choiceId}` (choice ids are NOT globally unique — e.g. 'press' on two nodes),
//       label = a compact rendering of choice.conditions (e.g. "knows_envelope is_true") or undefined
//   - event edges: event→ifPresentNode (kind 'event-present', label "present @HH:MM"),
//       event→recoveryNodeId (kind 'event-recovery', label "recovery if absent")
//   - state-resolver (since choices can't target endings — EE-3): if any node has resolvesEnding,
//       add ONE synthetic 'resolver' hub node ("Ending Resolver"); a 'resolves' edge from each
//       resolvesEnding node → resolver, and a 'resolves' edge from resolver → each Ending. This
//       connects the endings cluster and visualizes that endings resolve from accumulated state,
//       not from navigation. (R + M edges, not R×M.)

// layout.ts  (dagre; deterministic; fixed node sizes per kind so it's testable)
export interface Positioned extends GraphNode { x: number; y: number; width: number; height: number; }
export function layout(nodes: GraphNode[], edges: GraphEdge[]): { nodes: Positioned[]; edges: GraphEdge[] };

// lintStatus.ts
export interface GraphLintStatus { byId: Map<string, LintIssue[]>; storyLevel: LintIssue[]; }
export function lintStatus(result: LintResult): GraphLintStatus; // group by LintIssue.where; where-less → storyLevel
//   Overlay highlights graph elements (node/ending/event) by id. A choice-scoped issue's `where` is the
//   choice id (not globally unique), so GraphView attributes it to its OWNING node for highlighting via
//   the node→choice-ids map storyToGraph already has. Node/ending/event-scoped ids map directly.

// timeAxis.ts
export interface TimeMark { id: string; label: string; triggerMin: number; frac: number; } // frac in [0,1] across the window
export interface TimeAxisData { startMin: number; deadlineMin: number; windowMin: number; marks: TimeMark[]; }
export function timeAxis(story: Story): TimeAxisData; // window = deadline-start; one mark per event's earliest time_after trigger

// inspect.ts
export interface NodeInspection { node: StoryNode; leadsTo: string[]; reachedBy: string[]; }
export function inspect(story: Story, nodeId: string): NodeInspection;
//   leadsTo = unique choice.destination of node's choices
//   reachedBy = node ids whose choices target nodeId + event ids routing to it (ifPresentNode/recoveryNodeId)
```

All five are pure and total — they never throw on malformed data (a broken link yields an edge to a
target with no node; the renderer shows it as dangling and the linter flags it).

## 5. React components (thin renderers, `src/author/graph/`)

- `GraphView({ story, onPlayFrom })` — composes `storyToGraph`→`layout`, `lintStatus(lintStory(story))`,
  and `timeAxis`; renders `<ReactFlow>` with custom node types, edges (condition labels, dashed for
  event edges), MiniMap + Controls (pan/zoom/fit); owns selection state; renders `TimeAxis`, `LintBanner`,
  and the `InspectorPanel` for the selected node.
- Custom RF nodes: `StoryNodeCard` (title + type; start node accented; lint ring: red=error, amber=warning),
  `EndingNode` (distinct shape; default ending marked), `EventBadge` (title + trigger time).
- `TimeAxis({ data })` — the startTime→deadline strip with event trigger marks.
- `InspectorPanel({ story, selectedId, onPlayFrom })` — read-only: node title/body/type; its choices with
  their conditions/effects (reusing a compact condition/effect renderer); `leadsTo` / `reachedBy`; lint
  issues for this element; a **Play from here** button → `onPlayFrom(selectedId)`. For an ending/event
  selection it shows that element's raw fields instead.
- `LintBanner({ status })` — counts + the story-level issues (e.g. `CLOCK_CANNOT_BITE`, `NO_DEFAULT_ENDING`).

## 6. App integration & play-from-here

- `App.tsx`: add `view: 'play' | 'graph'` state and a switch control beside the story selector. `'play'`
  renders the existing `Player`; `'graph'` renders `GraphView` for the same selected story.
- `Player`/`useGame` gain an optional `startAtNodeId`; when set, the engine `gotoNode`s it on mount
  (reusing the existing debug-grade enter-for-testing semantics — no path effects).
- `GraphView.onPlayFrom(id)` → `App` sets `view='play'` and passes `startAtNodeId=id` to `Player`.

## 7. Error handling

The graph **never blocks on a bad story** — visualizing problems is the point. A story that fails lint
renders fully with issues highlighted (red/amber rings, a banner); broken links render as dangling edges
flagged by the linter; the transforms are total and never throw on malformed data. localStorage/engine
are not touched by the graph (read-only over the in-memory `Story`).

## 8. Testing

- **Pure transforms** (`storyToGraph`, `layout`, `lintStatus`, `timeAxis`, `inspect`): thorough node-env
  unit tests against `praterLine` and `sampleStory` — e.g. node/edge counts, that gated choices carry a
  condition label, that each event yields present+recovery edges, that `layout` assigns every node a
  position with edges flowing downward, that `lintStatus` routes a `CLOCK_CANNOT_BITE` to `storyLevel` and
  a node-scoped issue to `byId`, that `timeAxis` places a 23:30 event at the right fraction, that `inspect`
  computes `leadsTo`/`reachedBy` correctly (incl. event routing into `reachedBy`).
- **React components** (jsdom): light smoke tests — `GraphView` mounts and renders node titles; the lint
  banner appears when a deliberately-broken story is passed; clicking a node opens the inspector; the
  **Play from here** button fires `onPlayFrom` with the node id. Add a `ResizeObserver` stub to
  `src/test/setup.ts` (React Flow needs container sizing in jsdom); assertions target rendered content,
  not pixel coordinates.
- Full suite + `tsc --noEmit` + `vite build` stay green; the existing player/engine tests are untouched.

## 9. Layout sketch

```
┌───────────────────────────────────────────────┐
│ Story: The Prater Line ▾     [ Play | ▣ Graph ]│
│ ⚠ 0 errors · 1 warning                         │  ← LintBanner
│ 20:00 ├──────────●23:30──────────────┤ 02:10   │  ← TimeAxis
├──────────────────────────────────┬─────────────┤
│   ┌──────┐  cond: mara_trust≥2     │ Inspector   │
│   │ start│─▶┌───────┐─▶┌───────┐   │ node_sperl  │
│   └──────┘  │briefed│  │ ...   │   │ conversation│
│        ╲    └───────┘  └───────┘   │ leads to: … │
│   [E 23:30]┄present┄▶witness ◜endings◞ reached by│
│      ┊┄recovery┄▶drop      (pan/zoom)│ [Play here]│
└──────────────────────────────────┴─────────────┘
```
Restrained palette matching the player; lint rings on nodes; event edges dashed.

## 10. Done-when

- `npm run dev` shows a **Play | Graph** switch; Graph renders the selected story as an auto-laid-out
  flow graph with choice edges (condition labels on gated ones), endings as a distinct cluster, and each
  scheduled event as a badge with present + recovery edges.
- Linter results are overlaid (node/edge rings + a banner); a broken story renders with its problems
  visibly highlighted rather than blocking.
- A startTime→deadline time-axis strip shows the window with event trigger marks.
- Clicking a node opens a read-only inspector (fields, choices w/ conditions/effects, leads-to/reached-by);
  **Play from here** switches to the player starting at that node.
- The five pure transforms are unit-tested against both real stories; component smoke tests pass; full
  suite + `tsc` + `vite build` green.
