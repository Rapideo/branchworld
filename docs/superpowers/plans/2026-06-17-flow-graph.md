# Visual Node/Flow Graph (Sub-project D2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only visual flow graph that renders any `Story` (nodes, condition-labeled choice edges, scheduled events, endings via a state-resolver hub) with the live linter overlaid, a deadline time-axis strip, a click-to-inspect panel, and play-from-here — selectable via a Play | Graph switch in the existing app.

**Architecture:** Pure, framework-free transforms turn a `Story` into graph data, dagre auto-lays-out, and React Flow (`@xyflow/react`) thinly renders it. All logic is unit-tested in node; React components are tested in jsdom with `@xyflow/react` mocked. The engine (`src/engine/**`) is untouched.

**Tech Stack:** TypeScript (strict), React 18, `@xyflow/react` v12, `@dagrejs/dagre` v1, Vitest + React Testing Library. Reuses `src/engine`, `src/content`, `src/player`.

## Global Constraints

- TypeScript `strict: true`, no `any` in committed code (test mocks may use `any` narrowly).
- `src/engine/**` MUST NOT be modified. The graph reads a `Story` and calls `lintStory`/`parseTime`/`formatTime`/`gotoNode` — it never reimplements engine logic.
- New module lives under `src/author/graph/`. Pure transforms have NO React/DOM imports.
- The graph is **read-only** and **total**: it never throws on a malformed story and never blocks rendering — lint problems are highlighted, not fatal.
- Endings are connected via one synthetic **Ending Resolver** hub (id `__resolver__`): each `resolvesEnding` node → resolver → each ending (EE-3 made visible). Choices never link to endings.
- Choice edge ids are `` `${nodeId}__${choiceId}` `` (choice ids are NOT globally unique). Choice-scoped lint issues attribute to their owning node.
- Tests: pure transforms run in node env (`src/author/graph/*.test.ts`); React component tests run in jsdom (`*.test.tsx`, already mapped to jsdom for `src/author/**`? — NO: configure it, see Task 4). Conventional Commits. Every task ends green.

## File structure

```
src/author/graph/
  model.ts            # GraphNode/GraphEdge types (Task 1)
  describe.ts         # compact condition/effect strings (Task 1)
  storyToGraph.ts     # Story -> {nodes,edges} incl. resolver hub + phantom targets (Task 1)
  layout.ts           # dagre auto-layout (Task 2)
  lintStatus.ts       # lintStatus + attributeIssues (Task 3)
  timeAxis.ts         # deadline window + event marks (Task 3)
  inspect.ts          # node leads-to / reached-by (Task 3)
  nodes.tsx           # custom RF node components (Task 4)
  TimeAxis.tsx        # time strip (Task 5)
  LintBanner.tsx      # error/warning banner (Task 5)
  InspectorPanel.tsx  # read-only detail + Play-from-here (Task 5)
  GraphView.tsx       # React Flow integration (Task 6)
src/player/useGame.ts # + optional startAtNodeId (Task 7)
src/player/Player.tsx # + startAtNodeId prop (Task 7)
src/player/App.tsx    # + Play|Graph switch (Task 7)
vite.config.ts        # map src/author/** tests to jsdom (Task 4)
```

---

### Task 1: Graph model, describe, storyToGraph (pure)

**Files:**
- Create: `src/author/graph/model.ts`, `src/author/graph/describe.ts`, `src/author/graph/storyToGraph.ts`
- Test: `src/author/graph/describe.test.ts`, `src/author/graph/storyToGraph.test.ts`

**Interfaces:**
- Consumes: `Story`, `Condition`, `Effect`, `NodeType` (engine).
- Produces: `GraphNode`, `GraphEdge`, `GraphNodeKind`, `GraphEdgeKind`; `describeConditions(cs)`, `describeEffects(es)`, `describeCondition(c)`, `describeEffect(e)`; `storyToGraph(story): { nodes: GraphNode[]; edges: GraphEdge[] }`; `RESOLVER_ID`.

- [ ] **Step 1: Write `src/author/graph/model.ts`** (types only, no test)

```ts
import type { NodeType } from '../../engine';

export type GraphNodeKind = 'node' | 'ending' | 'event' | 'resolver';

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  nodeType?: NodeType;
  resolvesEnding?: boolean;
  isStart?: boolean;
  isDefaultEnding?: boolean;
  triggerLabel?: string;
  missing?: boolean; // phantom target for a broken link
}

export type GraphEdgeKind = 'choice' | 'event-present' | 'event-recovery' | 'resolves';

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  kind: GraphEdgeKind;
}
```

- [ ] **Step 2: Write the failing test `src/author/graph/describe.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { describeCondition, describeConditions, describeEffect, describeEffects } from './describe';

describe('describe', () => {
  it('renders a condition compactly', () => {
    expect(describeCondition({ field: 'knows', op: 'is_true' })).toBe('knows is_true');
    expect(describeCondition({ field: 'trust', op: 'gte', value: '2' })).toBe('trust gte 2');
  });
  it('joins conditions with &, empty for none', () => {
    expect(describeConditions(undefined)).toBe('');
    expect(describeConditions([{ field: 't', op: 'gte', value: '2' }, { field: 'k', op: 'is_true' }])).toBe('t gte 2 & k is_true');
  });
  it('renders effects compactly', () => {
    expect(describeEffect({ field: 'trust', op: 'increment', value: '1' })).toBe('trust increment 1');
    expect(describeEffects([{ field: 'time', op: 'add_minutes', value: '10' }, { field: 'k', op: 'set', value: 'true' }])).toBe('time add_minutes 10, k set true');
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run describe`
Expected: FAIL — cannot find module `./describe`.

- [ ] **Step 4: Write `src/author/graph/describe.ts`**

```ts
import type { Condition, Effect } from '../../engine';

export function describeCondition(c: Condition): string {
  return c.value != null ? `${c.field} ${c.op} ${c.value}` : `${c.field} ${c.op}`;
}
export function describeConditions(cs: Condition[] | undefined): string {
  return cs && cs.length ? cs.map(describeCondition).join(' & ') : '';
}
export function describeEffect(e: Effect): string {
  return e.value != null ? `${e.field} ${e.op} ${e.value}` : `${e.field} ${e.op}`;
}
export function describeEffects(es: Effect[] | undefined): string {
  return es && es.length ? es.map(describeEffect).join(', ') : '';
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run describe`
Expected: PASS.

- [ ] **Step 6: Write the failing test `src/author/graph/storyToGraph.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { storyToGraph, RESOLVER_ID } from './storyToGraph';
import { praterLine } from '../../content/praterLine';
import type { Story } from '../../engine';

describe('storyToGraph', () => {
  it('emits a node per StoryNode, ending, and event, plus a resolver hub', () => {
    const { nodes } = storyToGraph(praterLine);
    expect(nodes.filter((n) => n.kind === 'node').length).toBe(praterLine.nodes.length);
    expect(nodes.filter((n) => n.kind === 'ending').length).toBe(praterLine.endings.length);
    expect(nodes.filter((n) => n.kind === 'event').length).toBe(praterLine.events.length);
    expect(nodes.find((n) => n.id === RESOLVER_ID)?.kind).toBe('resolver');
    expect(nodes.find((n) => n.id === praterLine.startNodeId)?.isStart).toBe(true);
  });
  it('labels gated choice edges with their conditions and ids them uniquely', () => {
    const { edges } = storyToGraph(praterLine);
    // node_volkov "take_deal" is gated; its edge id is `${node}__${choiceId}`
    const gated = edges.find((e) => e.id === 'node_volkov__take_deal');
    expect(gated).toBeTruthy();
    expect(gated!.label).toContain('volkov_suspicion');
  });
  it('wires each event to a present node and a recovery node', () => {
    const { edges } = storyToGraph(praterLine);
    const present = edges.filter((e) => e.kind === 'event-present');
    const recovery = edges.filter((e) => e.kind === 'event-recovery');
    expect(present.length).toBe(praterLine.events.length);
    expect(recovery.length).toBe(praterLine.events.length);
    expect(present[0].target).toBe(praterLine.events[0].ifPresentNode);
  });
  it('connects resolvesEnding nodes -> resolver -> each ending', () => {
    const { edges } = storyToGraph(praterLine);
    const resolutionNodes = praterLine.nodes.filter((n) => n.resolvesEnding).length;
    expect(edges.filter((e) => e.kind === 'resolves' && e.target === RESOLVER_ID).length).toBe(resolutionNodes);
    expect(edges.filter((e) => e.kind === 'resolves' && e.source === RESOLVER_ID).length).toBe(praterLine.endings.length);
  });
  it('adds a phantom missing node for a broken link, never throws', () => {
    const broken: Story = { ...praterLine, nodes: praterLine.nodes.map((n) =>
      n.id === praterLine.startNodeId
        ? { ...n, choices: [{ id: 'x', label: 'x', destination: 'ghost_node' }] }
        : n) };
    const { nodes } = storyToGraph(broken);
    expect(nodes.find((n) => n.id === 'ghost_node')?.missing).toBe(true);
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `npx vitest run storyToGraph`
Expected: FAIL — cannot find module `./storyToGraph`.

- [ ] **Step 8: Write `src/author/graph/storyToGraph.ts`**

```ts
import type { Story } from '../../engine';
import type { GraphNode, GraphEdge } from './model';
import { describeConditions } from './describe';

export const RESOLVER_ID = '__resolver__';

export function storyToGraph(story: Story): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const known = new Set<string>();

  for (const n of story.nodes) {
    nodes.push({
      id: n.id, kind: 'node', label: n.title, nodeType: n.type,
      resolvesEnding: n.resolvesEnding, isStart: n.id === story.startNodeId,
    });
    known.add(n.id);
  }
  for (const e of story.endings) {
    nodes.push({ id: e.id, kind: 'ending', label: e.name, isDefaultEnding: e.isDefault });
    known.add(e.id);
  }
  for (const ev of story.events) {
    const trig = ev.trigger.find((t) => t.op === 'time_after' || t.op === 'time_before' || t.op === 'time_between');
    nodes.push({ id: ev.id, kind: 'event', label: ev.title, triggerLabel: trig?.value });
    known.add(ev.id);
  }

  for (const n of story.nodes) {
    for (const c of n.choices || []) {
      edges.push({
        id: `${n.id}__${c.id}`, source: n.id, target: c.destination, kind: 'choice',
        label: describeConditions(c.conditions) || undefined,
      });
    }
  }
  for (const ev of story.events) {
    const at = ev.trigger.find((t) => t.op === 'time_after')?.value;
    edges.push({ id: `${ev.id}__present`, source: ev.id, target: ev.ifPresentNode, kind: 'event-present', label: at ? `present @${at}` : 'present' });
    edges.push({ id: `${ev.id}__recovery`, source: ev.id, target: ev.recoveryNodeId, kind: 'event-recovery', label: 'recovery if absent' });
  }

  const resolutionNodes = story.nodes.filter((n) => n.resolvesEnding);
  if (resolutionNodes.length && story.endings.length) {
    nodes.push({ id: RESOLVER_ID, kind: 'resolver', label: 'Ending Resolver' });
    known.add(RESOLVER_ID);
    for (const rn of resolutionNodes) {
      edges.push({ id: `${rn.id}__resolves`, source: rn.id, target: RESOLVER_ID, kind: 'resolves', label: 'resolves from state' });
    }
    for (const e of story.endings) {
      edges.push({ id: `resolver__${e.id}`, source: RESOLVER_ID, target: e.id, kind: 'resolves' });
    }
  }

  // phantom nodes for broken links (targets that don't exist) — keep the graph total
  for (const e of edges) {
    if (!known.has(e.target)) {
      nodes.push({ id: e.target, kind: 'node', label: `⚠ missing: ${e.target}`, missing: true });
      known.add(e.target);
    }
  }

  return { nodes, edges };
}
```

- [ ] **Step 9: Run it to verify it passes**

Run: `npx vitest run storyToGraph`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/author/graph/model.ts src/author/graph/describe.ts src/author/graph/describe.test.ts src/author/graph/storyToGraph.ts src/author/graph/storyToGraph.test.ts
git commit -m "feat: pure Story->graph transform (nodes, edges, resolver hub)"
```

---

### Task 2: dagre auto-layout

**Files:**
- Modify: `package.json` (add `@dagrejs/dagre`)
- Create: `src/author/graph/layout.ts`
- Test: `src/author/graph/layout.test.ts`

**Interfaces:**
- Consumes: `GraphNode`, `GraphEdge` (model).
- Produces: `Positioned` (GraphNode + `x,y,width,height`); `layout(nodes, edges): { nodes: Positioned[]; edges: GraphEdge[] }`.

- [ ] **Step 1: Install dagre**

```bash
npm install @dagrejs/dagre@^1.1.4
```

- [ ] **Step 2: Write the failing test `src/author/graph/layout.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { layout } from './layout';
import { storyToGraph } from './storyToGraph';
import { praterLine } from '../../content/praterLine';

describe('layout', () => {
  it('assigns a position and size to every node', () => {
    const { nodes, edges } = storyToGraph(praterLine);
    const out = layout(nodes, edges);
    expect(out.nodes.length).toBe(nodes.length);
    for (const n of out.nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
      expect(n.width).toBeGreaterThan(0);
      expect(n.height).toBeGreaterThan(0);
    }
  });
  it('flows top-down: the start node sits above a node it leads to', () => {
    const { nodes, edges } = storyToGraph(praterLine);
    const out = layout(nodes, edges);
    const start = out.nodes.find((n) => n.isStart)!;
    const briefed = out.nodes.find((n) => n.id === 'node_briefed')!;
    expect(start.y).toBeLessThan(briefed.y);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run layout`
Expected: FAIL — cannot find module `./layout`.

- [ ] **Step 4: Write `src/author/graph/layout.ts`**

```ts
import dagre from '@dagrejs/dagre';
import type { GraphNode, GraphEdge, GraphNodeKind } from './model';

export interface Positioned extends GraphNode { x: number; y: number; width: number; height: number; }

const SIZES: Record<GraphNodeKind, { width: number; height: number }> = {
  node: { width: 180, height: 56 },
  ending: { width: 160, height: 52 },
  event: { width: 150, height: 46 },
  resolver: { width: 150, height: 46 },
};

export function layout(nodes: GraphNode[], edges: GraphEdge[]): { nodes: Positioned[]; edges: GraphEdge[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 70 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) {
    const s = SIZES[n.kind];
    g.setNode(n.id, { width: s.width, height: s.height });
  }
  for (const e of edges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target);
  }
  dagre.layout(g);
  const positioned: Positioned[] = nodes.map((n) => {
    const s = SIZES[n.kind];
    const p = g.node(n.id); // dagre returns center coordinates
    return { ...n, width: s.width, height: s.height, x: p.x - s.width / 2, y: p.y - s.height / 2 };
  });
  return { nodes: positioned, edges };
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run layout`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/author/graph/layout.ts src/author/graph/layout.test.ts
git commit -m "feat: dagre top-down auto-layout for the flow graph"
```

---

### Task 3: lintStatus + attributeIssues, timeAxis, inspect

**Files:**
- Create: `src/author/graph/lintStatus.ts`, `src/author/graph/timeAxis.ts`, `src/author/graph/inspect.ts`
- Test: `src/author/graph/transforms.test.ts`

**Interfaces:**
- Consumes: `Story`, `StoryNode`, `LintResult`, `LintIssue`, `parseTime` (engine).
- Produces:
  - `GraphLintStatus { byId: Map<string, LintIssue[]>; storyLevel: LintIssue[] }`; `lintStatus(result): GraphLintStatus`; `attributeIssues(story, status): Map<string, LintIssue[]>`.
  - `TimeMark { id; label; triggerMin; frac }`, `TimeAxisData { startMin; deadlineMin; windowMin; marks: TimeMark[] }`; `timeAxis(story): TimeAxisData`.
  - `NodeInspection { node: StoryNode; leadsTo: string[]; reachedBy: string[] }`; `inspect(story, nodeId): NodeInspection | undefined`.

- [ ] **Step 1: Write the failing test `src/author/graph/transforms.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { lintStatus, attributeIssues } from './lintStatus';
import { timeAxis } from './timeAxis';
import { inspect } from './inspect';
import { lintStory, parseTime, type LintResult } from '../../engine';
import { praterLine } from '../../content/praterLine';

describe('lintStatus', () => {
  it('routes story-level issues to storyLevel and where-scoped to byId', () => {
    const result: LintResult = {
      ok: false,
      errors: [{ level: 'error', code: 'CLOCK_CANNOT_BITE', message: 'x' }],
      warnings: [{ level: 'warning', code: 'UNREACHABLE_NODE', message: 'y', where: 'node_x' }],
    };
    const s = lintStatus(result);
    expect(s.storyLevel.map((i) => i.code)).toContain('CLOCK_CANNOT_BITE');
    expect(s.byId.get('node_x')?.[0].code).toBe('UNREACHABLE_NODE');
  });
  it('attributes a choice-scoped issue to its owning node', () => {
    const result: LintResult = { ok: false, errors: [{ level: 'error', code: 'UNDEFINED_VAR', message: 'z', where: 'take_deal' }], warnings: [] };
    const attr = attributeIssues(praterLine, lintStatus(result));
    // 'take_deal' is a choice on node_volkov (and node_volkov_truth) -> attributed to those nodes
    expect(attr.get('node_volkov')?.some((i) => i.code === 'UNDEFINED_VAR')).toBe(true);
  });
});

describe('timeAxis', () => {
  it('computes the window and places each event by fraction', () => {
    const a = timeAxis(praterLine);
    expect(a.startMin).toBe(parseTime(praterLine.startTime));
    expect(a.deadlineMin).toBe(parseTime(praterLine.deadline));
    expect(a.windowMin).toBe(a.deadlineMin - a.startMin);
    const mark = a.marks[0];
    expect(mark.frac).toBeGreaterThan(0);
    expect(mark.frac).toBeLessThan(1);
  });
});

describe('inspect', () => {
  it('computes leadsTo and reachedBy (incl. event routing)', () => {
    const r = inspect(praterLine, 'node_handoff_witnessed')!;
    expect(r.node.id).toBe('node_handoff_witnessed');
    // reached by the scheduled event (ifPresentNode)
    expect(r.reachedBy).toContain('event_handoff');
  });
  it('returns undefined for an unknown node, never throws', () => {
    expect(inspect(praterLine, 'nope')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run transforms`
Expected: FAIL — cannot find the three modules.

- [ ] **Step 3: Write `src/author/graph/lintStatus.ts`**

```ts
import type { Story, LintResult, LintIssue } from '../../engine';

export interface GraphLintStatus { byId: Map<string, LintIssue[]>; storyLevel: LintIssue[]; }

export function lintStatus(result: LintResult): GraphLintStatus {
  const byId = new Map<string, LintIssue[]>();
  const storyLevel: LintIssue[] = [];
  for (const issue of [...result.errors, ...result.warnings]) {
    if (issue.where) byId.set(issue.where, [...(byId.get(issue.where) ?? []), issue]);
    else storyLevel.push(issue);
  }
  return { byId, storyLevel };
}

// Final per-graph-element issues: node-scoped + its choices' issues (choice ids aren't unique,
// so attribute them to the owning node); ending/event-scoped map directly.
export function attributeIssues(story: Story, status: GraphLintStatus): Map<string, LintIssue[]> {
  const out = new Map<string, LintIssue[]>();
  const add = (id: string, issues: LintIssue[] | undefined) => {
    if (!issues || !issues.length) return;
    out.set(id, [...(out.get(id) ?? []), ...issues]);
  };
  for (const n of story.nodes) {
    add(n.id, status.byId.get(n.id));
    for (const c of n.choices || []) add(n.id, status.byId.get(c.id));
  }
  for (const e of story.endings) add(e.id, status.byId.get(e.id));
  for (const ev of story.events) add(ev.id, status.byId.get(ev.id));
  return out;
}
```

- [ ] **Step 4: Write `src/author/graph/timeAxis.ts`**

```ts
import type { Story } from '../../engine';
import { parseTime } from '../../engine';

export interface TimeMark { id: string; label: string; triggerMin: number; frac: number; }
export interface TimeAxisData { startMin: number; deadlineMin: number; windowMin: number; marks: TimeMark[]; }

export function timeAxis(story: Story): TimeAxisData {
  const startMin = parseTime(story.startTime);
  const deadlineMin = parseTime(story.deadline);
  const windowMin = deadlineMin - startMin;
  const marks: TimeMark[] = [];
  for (const ev of story.events) {
    const t = ev.trigger.find((c) => c.op === 'time_after' || c.op === 'time_before');
    if (!t || t.value == null) continue;
    const triggerMin = parseTime(t.value);
    marks.push({ id: ev.id, label: ev.title, triggerMin, frac: windowMin > 0 ? (triggerMin - startMin) / windowMin : 0 });
  }
  return { startMin, deadlineMin, windowMin, marks };
}
```

- [ ] **Step 5: Write `src/author/graph/inspect.ts`**

```ts
import type { Story, StoryNode } from '../../engine';

export interface NodeInspection { node: StoryNode; leadsTo: string[]; reachedBy: string[]; }

export function inspect(story: Story, nodeId: string): NodeInspection | undefined {
  const node = story.nodes.find((n) => n.id === nodeId);
  if (!node) return undefined;
  const leadsTo = Array.from(new Set((node.choices || []).map((c) => c.destination)));
  const reachedBy = new Set<string>();
  for (const n of story.nodes) {
    if ((n.choices || []).some((c) => c.destination === nodeId)) reachedBy.add(n.id);
  }
  for (const ev of story.events) {
    if (ev.ifPresentNode === nodeId || ev.recoveryNodeId === nodeId) reachedBy.add(ev.id);
  }
  return { node, leadsTo, reachedBy: Array.from(reachedBy) };
}
```

- [ ] **Step 6: Run it to verify it passes**

Run: `npx vitest run transforms`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/author/graph/lintStatus.ts src/author/graph/timeAxis.ts src/author/graph/inspect.ts src/author/graph/transforms.test.ts
git commit -m "feat: graph lint-overlay, time-axis, and node-inspection transforms"
```

---

### Task 4: React Flow setup + custom node components

**Files:**
- Modify: `package.json` (add `@xyflow/react`), `vite.config.ts` (map `src/author/**` to jsdom)
- Create: `src/author/graph/nodes.tsx`
- Test: `src/author/graph/nodes.test.tsx`

**Interfaces:**
- Consumes: `GraphNode` (model), `LintIssue` (engine), `@xyflow/react`.
- Produces: `RFNodeData { graph: GraphNode; issues: LintIssue[] }`; components `StoryNodeCard`, `EndingNode`, `EventBadge`, `ResolverNode`; `nodeTypes` map; `ringClass(issues)`.

- [ ] **Step 1: Install React Flow**

```bash
npm install @xyflow/react@^12.3.5
```

- [ ] **Step 2: Map `src/author/**` tests to jsdom in `vite.config.ts`**

Change the `environmentMatchGlobs` line to:

```ts
    environmentMatchGlobs: [['src/player/**', 'jsdom'], ['src/author/**', 'jsdom']],
```

(Leave the rest of `vite.config.ts` unchanged.) Note: `src/author/graph/*.test.ts` for the PURE transforms still want node env. To keep those in node, name only the `.tsx` component tests under a jsdom match instead — set:

```ts
    environmentMatchGlobs: [['src/player/**', 'jsdom'], ['**/*.test.tsx', 'jsdom']],
```

This runs every `.tsx` test in jsdom and every `.ts` test in node — so the Task 1–3 transform tests stay in node and the component tests run in jsdom.

- [ ] **Step 3: Write the failing test `src/author/graph/nodes.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoryNodeCard, EndingNode, EventBadge, ResolverNode } from './nodes';

vi.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom' },
}));

const data = (graph: object, issues: object[] = []) => ({ data: { graph, issues } } as never);

describe('graph node components', () => {
  it('StoryNodeCard shows title + type and an error ring', () => {
    render(<StoryNodeCard {...data({ id: 'a', kind: 'node', label: 'Cafe Sperl', nodeType: 'conversation' }, [{ level: 'error', code: 'X', message: 'm' }])} />);
    expect(screen.getByText('Cafe Sperl')).toBeInTheDocument();
    expect(screen.getByText(/conversation/)).toBeInTheDocument();
    expect(screen.getByText('Cafe Sperl').closest('div')!.className).toMatch(/red/);
  });
  it('EndingNode marks the default ending', () => {
    render(<EndingNode {...data({ id: 'e', kind: 'ending', label: 'In the Dark', isDefaultEnding: true })} />);
    expect(screen.getByText('In the Dark')).toBeInTheDocument();
    expect(screen.getByText(/default/i)).toBeInTheDocument();
  });
  it('EventBadge shows the trigger time; ResolverNode renders its label', () => {
    render(<EventBadge {...data({ id: 'ev', kind: 'event', label: 'Pickup', triggerLabel: '23:30' })} />);
    expect(screen.getByText(/23:30/)).toBeInTheDocument();
    render(<ResolverNode {...data({ id: '__resolver__', kind: 'resolver', label: 'Ending Resolver' })} />);
    expect(screen.getByText('Ending Resolver')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npx vitest run nodes`
Expected: FAIL — cannot find module `./nodes`.

- [ ] **Step 5: Write `src/author/graph/nodes.tsx`**

```tsx
import { Handle, Position } from '@xyflow/react';
import type { GraphNode } from './model';
import type { LintIssue } from '../../engine';

export interface RFNodeData { graph: GraphNode; issues: LintIssue[]; }
type Props = { data: RFNodeData };

export function ringClass(issues: LintIssue[]): string {
  if (issues.some((i) => i.level === 'error')) return 'ring-2 ring-red-500';
  if (issues.some((i) => i.level === 'warning')) return 'ring-2 ring-amber-400';
  return 'ring-1 ring-stone-300';
}

export function StoryNodeCard({ data }: Props) {
  const { graph, issues } = data;
  return (
    <div className={`rounded-md bg-white px-3 py-2 text-xs shadow-sm ${ringClass(issues)} ${graph.isStart ? 'border-l-4 border-emerald-500' : ''} ${graph.missing ? 'bg-red-50' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="font-medium text-stone-800">{graph.label}</div>
      <div className="text-[10px] text-stone-400">{graph.nodeType ?? 'scene'}{graph.resolvesEnding ? ' · resolves' : ''}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export function EndingNode({ data }: Props) {
  const { graph, issues } = data;
  return (
    <div className={`rounded-full border border-stone-800 bg-stone-100 px-3 py-2 text-xs ${ringClass(issues)}`}>
      <Handle type="target" position={Position.Top} />
      <div className="font-medium text-stone-800">{graph.label}</div>
      {graph.isDefaultEnding && <div className="text-[10px] uppercase tracking-wide text-stone-500">default</div>}
    </div>
  );
}

export function EventBadge({ data }: Props) {
  const { graph, issues } = data;
  return (
    <div className={`rounded bg-indigo-50 px-3 py-2 text-xs ${ringClass(issues)}`}>
      <Handle type="target" position={Position.Top} />
      <div className="font-medium text-indigo-900">⏱ {graph.label}</div>
      {graph.triggerLabel && <div className="text-[10px] text-indigo-500">{graph.triggerLabel}</div>}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export function ResolverNode({ data }: Props) {
  const { graph } = data;
  return (
    <div className="rounded bg-stone-800 px-3 py-2 text-xs text-stone-100">
      <Handle type="target" position={Position.Top} />
      <div className="font-medium">{graph.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export const nodeTypes = { storyNode: StoryNodeCard, ending: EndingNode, event: EventBadge, resolver: ResolverNode };
```

- [ ] **Step 6: Run it to verify it passes**

Run: `npx vitest run nodes`
Expected: PASS.

- [ ] **Step 7: Confirm the node-env transform tests still run in node**

Run: `npx vitest run storyToGraph layout transforms`
Expected: PASS (unaffected by the env-glob change).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/author/graph/nodes.tsx src/author/graph/nodes.test.tsx
git commit -m "feat: React Flow custom node components (story/ending/event/resolver)"
```

---

### Task 5: TimeAxis, LintBanner, InspectorPanel (presentational)

**Files:**
- Create: `src/author/graph/TimeAxis.tsx`, `src/author/graph/LintBanner.tsx`, `src/author/graph/InspectorPanel.tsx`
- Test: `src/author/graph/panels.test.tsx`

**Interfaces:**
- Consumes: `timeAxis` data, `GraphLintStatus`, `inspect`, `describeConditions`/`describeEffects` (graph); `Story`, `formatTime` (engine).
- Produces: `TimeAxis({ story })`, `LintBanner({ status })`, `InspectorPanel({ story, selectedId, status, onPlayFrom })`.

- [ ] **Step 1: Write the failing test `src/author/graph/panels.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeAxis } from './TimeAxis';
import { LintBanner } from './LintBanner';
import { InspectorPanel } from './InspectorPanel';
import { lintStatus } from './lintStatus';
import { praterLine } from '../../content/praterLine';

describe('TimeAxis', () => {
  it('renders the window bounds and an event mark', () => {
    render(<TimeAxis story={praterLine} />);
    expect(screen.getByText(/8:00 PM/)).toBeInTheDocument();   // 20:00 start
    expect(screen.getByText(/2:10 AM/)).toBeInTheDocument();   // 02:10 deadline (1570 -> formatTime)
    expect(screen.getByText(praterLine.events[0].title)).toBeInTheDocument();
  });
});

describe('LintBanner', () => {
  it('summarizes errors/warnings and shows story-level codes', () => {
    const status = lintStatus({ ok: false, errors: [{ level: 'error', code: 'CLOCK_CANNOT_BITE', message: 'm' }], warnings: [] });
    render(<LintBanner status={status} />);
    expect(screen.getByText(/1 error/)).toBeInTheDocument();
    expect(screen.getByText(/CLOCK_CANNOT_BITE/)).toBeInTheDocument();
  });
  it('shows a clean state', () => {
    render(<LintBanner status={lintStatus({ ok: true, errors: [], warnings: [] })} />);
    expect(screen.getByText(/clean/i)).toBeInTheDocument();
  });
});

describe('InspectorPanel', () => {
  it('shows a selected node and fires Play-from-here', async () => {
    const onPlayFrom = vi.fn();
    const status = lintStatus({ ok: true, errors: [], warnings: [] });
    render(<InspectorPanel story={praterLine} selectedId="node_sperl" status={status} onPlayFrom={onPlayFrom} />);
    expect(screen.getByRole('heading', { name: /node_sperl|Caf|Sperl/ })).toBeInTheDocument();
    expect(screen.getByText(/leads to/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /play from here/i }));
    expect(onPlayFrom).toHaveBeenCalledWith('node_sperl');
  });
  it('prompts to select when nothing is selected', () => {
    const status = lintStatus({ ok: true, errors: [], warnings: [] });
    render(<InspectorPanel story={praterLine} selectedId={null} status={status} onPlayFrom={() => {}} />);
    expect(screen.getByText(/select a node/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run panels`
Expected: FAIL — cannot find the panel modules.

- [ ] **Step 3: Write `src/author/graph/TimeAxis.tsx`**

```tsx
import type { Story } from '../../engine';
import { formatTime } from '../../engine';
import { timeAxis } from './timeAxis';

export function TimeAxis({ story }: { story: Story }) {
  const a = timeAxis(story);
  return (
    <div className="border-b border-stone-200 px-4 py-2 text-xs text-stone-600">
      <div className="relative mt-4 h-1 rounded bg-stone-200">
        <span className="absolute -top-4 left-0">{formatTime(a.startMin)}</span>
        <span className="absolute -top-4 right-0">{formatTime(a.deadlineMin)}</span>
        {a.marks.map((m) => (
          <span key={m.id} className="absolute -top-4 -translate-x-1/2 whitespace-nowrap text-indigo-600"
                style={{ left: `${Math.max(0, Math.min(1, m.frac)) * 100}%` }}>
            ● {m.label} {formatTime(m.triggerMin)}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/author/graph/LintBanner.tsx`**

```tsx
import type { GraphLintStatus } from './lintStatus';

export function LintBanner({ status }: { status: GraphLintStatus }) {
  const errors = [...status.byId.values()].flat().filter((i) => i.level === 'error').length + status.storyLevel.filter((i) => i.level === 'error').length;
  const warnings = [...status.byId.values()].flat().filter((i) => i.level === 'warning').length + status.storyLevel.filter((i) => i.level === 'warning').length;
  const clean = errors === 0 && warnings === 0;
  return (
    <div className={`px-4 py-1.5 text-xs ${errors ? 'bg-red-50 text-red-700' : warnings ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
      {clean ? '✓ linter clean' : `${errors} error${errors === 1 ? '' : 's'} · ${warnings} warning${warnings === 1 ? '' : 's'}`}
      {status.storyLevel.length > 0 && (
        <span className="ml-2 text-stone-600">— {status.storyLevel.map((i) => i.code).join(', ')}</span>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Write `src/author/graph/InspectorPanel.tsx`**

```tsx
import type { Story } from '../../engine';
import type { GraphLintStatus } from './lintStatus';
import { inspect } from './inspect';
import { describeConditions, describeEffects } from './describe';

export function InspectorPanel({ story, selectedId, status, onPlayFrom }: {
  story: Story; selectedId: string | null; status: GraphLintStatus; onPlayFrom: (id: string) => void;
}) {
  if (!selectedId) {
    return <aside className="w-72 border-l border-stone-200 p-4 text-sm text-stone-400">Select a node to inspect it.</aside>;
  }
  const info = inspect(story, selectedId);
  const issues = status.byId.get(selectedId) ?? [];
  if (!info) {
    // ending / event / resolver / phantom selection — show id + any issues
    return (
      <aside className="w-72 border-l border-stone-200 p-4 text-sm">
        <h2 className="mb-2 font-mono text-base text-stone-800">{selectedId}</h2>
        {issues.map((i, k) => <p key={k} className="text-red-600">{i.code}: {i.message}</p>)}
      </aside>
    );
  }
  const { node, leadsTo, reachedBy } = info;
  return (
    <aside className="w-72 overflow-y-auto border-l border-stone-200 p-4 text-sm">
      <h2 className="font-mono text-base text-stone-800">{node.title}</h2>
      <p className="mb-2 text-xs text-stone-400">{node.id} · {node.type ?? 'scene'}{node.resolvesEnding ? ' · resolves ending' : ''}</p>
      <p className="mb-3 whitespace-pre-line text-xs text-stone-600">{node.body}</p>
      {issues.length > 0 && <div className="mb-3">{issues.map((i, k) => <p key={k} className="text-red-600">⚠ {i.code}</p>)}</div>}
      <h3 className="font-semibold text-stone-700">Choices</h3>
      <ul className="mb-3">
        {(node.choices || []).map((c) => (
          <li key={c.id} className="mb-1 text-xs">
            <span className="text-stone-800">{c.label}</span> → <span className="font-mono">{c.destination}</span>
            {c.conditions?.length ? <div className="text-amber-600">if {describeConditions(c.conditions)}</div> : null}
            {c.effects?.length ? <div className="text-stone-500">does {describeEffects(c.effects)}</div> : null}
          </li>
        ))}
        {(node.choices || []).length === 0 && <li className="text-xs text-stone-400">— (no choices)</li>}
      </ul>
      <p className="text-xs"><span className="font-semibold">leads to:</span> {leadsTo.join(', ') || '—'}</p>
      <p className="mb-3 text-xs"><span className="font-semibold">reached by:</span> {reachedBy.join(', ') || '—'}</p>
      <button onClick={() => onPlayFrom(selectedId)} className="rounded bg-stone-800 px-3 py-1.5 text-white">Play from here</button>
    </aside>
  );
}
```

- [ ] **Step 6: Run it to verify it passes**

Run: `npx vitest run panels`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/author/graph/TimeAxis.tsx src/author/graph/LintBanner.tsx src/author/graph/InspectorPanel.tsx src/author/graph/panels.test.tsx
git commit -m "feat: time-axis strip, lint banner, and node inspector panel"
```

---

### Task 6: GraphView (React Flow integration)

**Files:**
- Create: `src/author/graph/GraphView.tsx`
- Test: `src/author/graph/GraphView.test.tsx`

**Interfaces:**
- Consumes: everything above; `Story`, `lintStory` (engine); `@xyflow/react`.
- Produces: `GraphView({ story, onPlayFrom })`.

- [ ] **Step 1: Write the failing test `src/author/graph/GraphView.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphView } from './GraphView';
import { praterLine } from '../../content/praterLine';

// Mock React Flow: render the passed nodes as clickable buttons + expose counts; render children (chrome lives outside).
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ nodes, edges, onNodeClick, children }: any) => (
    <div data-testid="rf" data-nodes={nodes.length} data-edges={edges.length}>
      {nodes.map((n: any) => (
        <button key={n.id} onClick={() => onNodeClick?.({}, n)}>{n.id}</button>
      ))}
      {children}
    </div>
  ),
  Background: () => null, Controls: () => null, MiniMap: () => null,
  Handle: () => null, Position: { Top: 'top', Bottom: 'bottom' },
}));

describe('GraphView', () => {
  it('renders the lint banner, time axis, and a React Flow with all graph nodes/edges', () => {
    render(<GraphView story={praterLine} onPlayFrom={() => {}} />);
    expect(screen.getByText(/clean|error|warning/i)).toBeInTheDocument(); // LintBanner
    const rf = screen.getByTestId('rf');
    // nodes = story nodes + endings + events + resolver
    const expectedNodes = praterLine.nodes.length + praterLine.endings.length + praterLine.events.length + 1;
    expect(Number(rf.getAttribute('data-nodes'))).toBe(expectedNodes);
  });
  it('clicking a node opens the inspector and Play-from-here fires the callback', async () => {
    const onPlayFrom = vi.fn();
    render(<GraphView story={praterLine} onPlayFrom={onPlayFrom} />);
    await userEvent.click(screen.getByRole('button', { name: 'node_sperl' }));
    await userEvent.click(screen.getByRole('button', { name: /play from here/i }));
    expect(onPlayFrom).toHaveBeenCalledWith('node_sperl');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run GraphView`
Expected: FAIL — cannot find module `./GraphView`.

- [ ] **Step 3: Write `src/author/graph/GraphView.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Story } from '../../engine';
import { lintStory } from '../../engine';
import { storyToGraph } from './storyToGraph';
import { layout } from './layout';
import { lintStatus, attributeIssues } from './lintStatus';
import { nodeTypes, type RFNodeData } from './nodes';
import { TimeAxis } from './TimeAxis';
import { LintBanner } from './LintBanner';
import { InspectorPanel } from './InspectorPanel';

const RF_TYPE: Record<string, string> = { node: 'storyNode', ending: 'ending', event: 'event', resolver: 'resolver' };

export function GraphView({ story, onPlayFrom }: { story: Story; onPlayFrom: (nodeId: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  const status = useMemo(() => lintStatus(lintStory(story)), [story]);
  const { rfNodes, rfEdges } = useMemo(() => {
    const { nodes, edges } = storyToGraph(story);
    const positioned = layout(nodes, edges).nodes;
    const attr = attributeIssues(story, status);
    const rfNodes: Node[] = positioned.map((p) => ({
      id: p.id,
      type: RF_TYPE[p.kind],
      position: { x: p.x, y: p.y },
      data: { graph: p, issues: attr.get(p.id) ?? [] } satisfies RFNodeData,
    }));
    const rfEdges: Edge[] = edges.map((e) => ({
      id: e.id, source: e.source, target: e.target, label: e.label,
      animated: e.kind === 'event-present' || e.kind === 'event-recovery',
      style: e.kind === 'resolves' || e.kind.startsWith('event') ? { strokeDasharray: '4 4' } : undefined,
    }));
    return { rfNodes, rfEdges };
  }, [story, status]);

  return (
    <div className="flex h-[80vh] flex-col">
      <LintBanner status={status} />
      <TimeAxis story={story} />
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <ReactFlow nodes={rfNodes} edges={rfEdges} nodeTypes={nodeTypes} fitView
                     onNodeClick={(_, n) => setSelected(n.id)}>
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
        <InspectorPanel story={story} selectedId={selected} status={status} onPlayFrom={onPlayFrom} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run GraphView`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/author/graph/GraphView.tsx src/author/graph/GraphView.test.tsx
git commit -m "feat: GraphView — React Flow integration with lint overlay, axis, inspector"
```

---

### Task 7: App integration — Play | Graph switch + play-from-here

**Files:**
- Modify: `src/player/useGame.ts`, `src/player/Player.tsx`, `src/player/App.tsx`
- Test: `src/player/graphView.integration.test.tsx`

**Interfaces:**
- Consumes: `GraphView` (graph); `useGame`, `Player` (player); `stories` (content).
- Produces: `useGame(story, startAtNodeId?)`; `Player({ story, startAtNodeId? })`; `App` with a `view: 'play' | 'graph'` switch and play-from-here wiring.

- [ ] **Step 1: Write the failing integration test `src/player/graphView.integration.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

// Mock React Flow so the graph renders deterministically in jsdom (clickable node buttons).
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ nodes, onNodeClick, children }: any) => (
    <div data-testid="rf">{nodes.map((n: any) => <button key={n.id} onClick={() => onNodeClick?.({}, n)}>{n.id}</button>)}{children}</div>
  ),
  Background: () => null, Controls: () => null, MiniMap: () => null,
  Handle: () => null, Position: { Top: 'top', Bottom: 'bottom' },
}));

describe('App Play | Graph integration', () => {
  it('switches to Graph and back', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'A Booth by the Window' })).toBeInTheDocument(); // player default
    await userEvent.click(screen.getByRole('button', { name: /graph/i }));
    expect(screen.getByTestId('rf')).toBeInTheDocument();         // graph view
    await userEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(screen.getByRole('heading', { name: 'A Booth by the Window' })).toBeInTheDocument(); // back to player
  });
  it('Play-from-here in the graph opens the player at that node', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /graph/i }));
    await userEvent.click(screen.getByRole('button', { name: 'witness' }));      // sample story node id
    await userEvent.click(screen.getByRole('button', { name: /play from here/i }));
    expect(screen.getByRole('heading', { name: 'Witness' })).toBeInTheDocument(); // player started at node 'witness'
  });
});
```

> Note: the default story is `sampleStory` (`stories[0]`); its node ids include `witness` (title "Witness"). If those ids/titles differ, read `src/content/sampleStory.ts` and use real ones.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run graphView.integration`
Expected: FAIL — App has no Graph switch / `startAtNodeId`.

- [ ] **Step 3: Add `startAtNodeId` to `src/player/useGame.ts`**

Change the signature and lazy init:

```ts
export function useGame(story: Story, startAtNodeId?: string): UseGame {
  const engineRef = useRef<GameEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new GameEngine(story);
    if (startAtNodeId) engineRef.current.gotoNode(startAtNodeId);
  }
  const [view, setView] = useState<GameView>(() => engineRef.current!.view());
  // ...the rest of the returned object is unchanged...
```

(Keep the returned `{ view, choose, reset, gotoNode, snapshot, restore }` exactly as-is. `reset` still creates a fresh engine at the story start — it intentionally ignores `startAtNodeId`.)

- [ ] **Step 4: Pass `startAtNodeId` through `src/player/Player.tsx`**

Change the signature line:

```tsx
export function Player({ story, startAtNodeId }: { story: Story; startAtNodeId?: string }) {
  const game = useGame(story, startAtNodeId);
  // ...unchanged...
```

- [ ] **Step 5: Rewrite `src/player/App.tsx` with the Play | Graph switch**

```tsx
import { useState } from 'react';
import { stories } from '../content/stories';
import { Player } from './Player';
import { GraphView } from '../author/graph/GraphView';

export function App() {
  const [storyId, setStoryId] = useState(stories[0].id);
  const [view, setView] = useState<'play' | 'graph'>('play');
  const [startAtNodeId, setStartAtNodeId] = useState<string | undefined>(undefined);
  const story = (stories.find((s) => s.id === storyId) ?? stories[0]).story;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="flex items-center gap-3 border-b border-stone-200 px-4 py-2 text-sm">
        <label htmlFor="story" className="text-stone-500">Story</label>
        <select id="story" aria-label="Story" value={storyId}
                onChange={(e) => { setStoryId(e.target.value); setStartAtNodeId(undefined); }}
                className="rounded border border-stone-300 px-2 py-1">
          {stories.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <span className="ml-auto inline-flex overflow-hidden rounded border border-stone-300">
          <button onClick={() => setView('play')} className={`px-3 py-1 ${view === 'play' ? 'bg-stone-800 text-white' : 'bg-white'}`}>Play</button>
          <button onClick={() => setView('graph')} className={`px-3 py-1 ${view === 'graph' ? 'bg-stone-800 text-white' : 'bg-white'}`}>Graph</button>
        </span>
      </div>
      {view === 'play'
        ? <Player key={`${storyId}:${startAtNodeId ?? 'start'}`} story={story} startAtNodeId={startAtNodeId} />
        : <GraphView story={story} onPlayFrom={(id) => { setStartAtNodeId(id); setView('play'); }} />}
    </div>
  );
}
```

- [ ] **Step 6: Run the integration test to verify it passes**

Run: `npx vitest run graphView.integration`
Expected: PASS. (If a sample node id/title differs, correct the test per the Step 1 note.)

- [ ] **Step 7: Run the full suite, typecheck, and build**

Run: `npm test` → all green (engine + player + author).
Run: `npm run typecheck` → no errors.
Run: `npm run build` → succeeds.

- [ ] **Step 8: Manual dev smoke (optional)**

Run: `npm run dev`; switch to **Graph**, pick **The Prater Line**, confirm the graph renders with the resolver hub, the event badge with present/recovery edges, the lint banner, the time-axis strip; click a node → inspector; **Play from here** → player opens at that node. Stop the server.

- [ ] **Step 9: Commit**

```bash
git add src/player/useGame.ts src/player/Player.tsx src/player/App.tsx src/player/graphView.integration.test.tsx
git commit -m "feat: Play | Graph view switch and play-from-here"
```

---

## Self-Review (completed during planning)

**Spec coverage:**
- §1/§2 read-only graph + lint overlay + time-axis + inspect + play-from-here → Tasks 1–7. ✓
- §3 pure transforms + React Flow thin renderer (Approach A) → Tasks 1–3 (pure) + 4–6 (RF). ✓
- §4 `storyToGraph` (resolver hub, unique choice-edge ids, phantom targets), `layout` (dagre), `lintStatus`+`attributeIssues`, `timeAxis`, `inspect` → Tasks 1/2/3. ✓
- §5 components (`StoryNodeCard`/`EndingNode`/`EventBadge`/`ResolverNode`, `TimeAxis`, `LintBanner`, `InspectorPanel`, `GraphView`) → Tasks 4/5/6. ✓
- §6 Play|Graph switch + `Player`/`useGame` `startAtNodeId` + play-from-here → Task 7. ✓
- §7 totality / never blocks: `storyToGraph` phantom targets + `inspect` returns undefined; broken story still renders → Tasks 1/3 + GraphView. ✓
- §8 testing: pure transforms in node; components in jsdom with `@xyflow/react` mocked (refinement over the spec's ResizeObserver stub — noted) → all tasks. ✓
- Out of scope (editing, deep trace, AI, genuine per-node-time layout) → not present. ✓

**Placeholder scan:** every step has complete code/commands; the only "read the real id" note (Task 7 sample node) is a guard, with a concrete default (`witness`/"Witness"). No TBD/TODO. ✓

**Type consistency:** `GraphNode`/`GraphEdge` shapes identical across Tasks 1–6; `RFNodeData {graph, issues}` consistent in Tasks 4/6; `GraphLintStatus` from Task 3 consumed verbatim in Tasks 5/6; `useGame(story, startAtNodeId?)` ↔ `Player({story, startAtNodeId?})` ↔ App in Task 7; `RESOLVER_ID`/`__resolver__` consistent. ✓

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-17-flow-graph.md`.
