# Counted Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver counted inventory for the engine — `has_item` + counts — by tagging number variables as items (`kind:'item'`), reusing the v1.4-hardened var machinery.

**Architecture:** An item is a declared `number` variable tagged `kind:'item'`; its quantity lives in `vars[name]`. Counts/compare/add/spend reuse the existing numeric condition ops + `increment`/`decrement` effects (already clamped). The only additions are a `has_item` condition op (sugar for "≥ 1") and two lints. `WorldState`/snapshot/carry/walker are untouched.

**Tech Stack:** TypeScript, Vitest. Engine at `src/engine/`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-27-counted-inventory-design.md`.
- Branch: `feature/counted-inventory` (already created off `master`).
- TDD throughout: failing test first, watch it fail, minimal code, watch it pass, commit.
- After every task: `npx vitest run` green and `npx tsc --noEmit` clean.
- **The cave game (`sumpLine`) must still lint clean** — it declares no items, so nothing about it changes.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Do NOT touch `WorldState`, `snapshot`/`restore`, `carry.ts`, or `stateSpaceWalk.ts` — items are vars, already handled there.

---

### Task 1: The `has_item` condition op + the `kind` tag

**Files:**
- Modify: `src/engine/types.ts` (add `VariableDef.kind?: 'item'`; add `'has_item'` to `ConditionOp`)
- Modify: `src/engine/conditions.ts:20-43` (add the `has_item` case in `evaluateCondition`)
- Test: `src/engine/conditions.test.ts`

**Interfaces:**
- Produces: `ConditionOp` includes `'has_item'`; `VariableDef` has optional `kind?: 'item'`. `evaluateCondition({field, op:'has_item', value?}, s)` returns `num(readVar(s, field)) >= (value != null ? num(coerce(value)) : 1)`.

- [ ] **Step 1: Write the failing test** — add to `src/engine/conditions.test.ts` inside `describe('conditions', ...)`:

```ts
  it('handles has_item (counted inventory: qty >= 1, or >= value)', () => {
    const s = { ...base, vars: { ...base.vars, thermite: 2 } };
    expect(evaluateCondition({ field: 'thermite', op: 'has_item' }, s)).toBe(true);             // 2 >= 1
    expect(evaluateCondition({ field: 'thermite', op: 'has_item', value: '2' }, s)).toBe(true); // 2 >= 2
    expect(evaluateCondition({ field: 'thermite', op: 'has_item', value: '3' }, s)).toBe(false);// 2 >= 3
    const empty = { ...base, vars: { ...base.vars, thermite: 0 } };
    expect(evaluateCondition({ field: 'thermite', op: 'has_item' }, empty)).toBe(false);         // 0 >= 1
  });
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run src/engine/conditions.test.ts`
Expected: FAIL — `has_item` hits the `default: return true` branch, so the `>= 3` and empty cases return `true` instead of `false`. (TypeScript in the editor will also flag `'has_item'` as not a valid `ConditionOp` until Step 3.)

- [ ] **Step 3: Add the type members** — in `src/engine/types.ts`, add `'has_item'` to the `ConditionOp` union and `kind?: 'item'` to `VariableDef`:

```ts
// In ConditionOp — add 'has_item' alongside the other has_* ops:
  | 'is_true' | 'is_false' | 'has_clue' | 'has_visited' | 'has_item'

// In VariableDef — add after `type`:
  kind?: 'item';                // tags a number var as an inventory item (front-end backpack + lint)
```

- [ ] **Step 4: Implement the `has_item` case** — in `src/engine/conditions.ts`, add this case in the `evaluateCondition` switch, immediately before `case 'has_clue':`:

```ts
    case 'has_item': return num(cur) >= (c.value != null ? num(coerce(c.value)) : 1);
```

- [ ] **Step 5: Run the test, verify it passes**

Run: `npx vitest run src/engine/conditions.test.ts`
Expected: PASS (all condition tests green).

- [ ] **Step 6: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/engine/types.ts src/engine/conditions.ts src/engine/conditions.test.ts
git commit -m "feat(engine): has_item condition op + VariableDef.kind tag (counted inventory)"
```

---

### Task 2: The item lints (`ITEM_NOT_NUMERIC`, `HAS_ITEM_NOT_ITEM`)

**Files:**
- Modify: `src/engine/linter.ts` (add an `itemVars` set near `varNames`; an `ITEM_NOT_NUMERIC` loop near the `RESERVED_VAR_PREFIX` loop; a `has_item` branch in `checkConds`)
- Test: `src/engine/linter.test.ts`

**Interfaces:**
- Consumes: `VariableDef.kind` and the `'has_item'` op from Task 1.
- Produces: lint codes `ITEM_NOT_NUMERIC` (a `kind:'item'` var with `type !== 'number'`) and `HAS_ITEM_NOT_ITEM` (a `has_item` condition whose field is not a declared `kind:'item'` var).

- [ ] **Step 1: Write the failing tests** — add to `src/engine/linter.test.ts` inside the main `describe('linter', ...)` block:

```ts
  it('ITEM_NOT_NUMERIC — a kind:item var that is not type number', () => {
    const s = clean();
    s.variables.push({ name: 'loot', type: 'string', kind: 'item', default: '', purpose: 'x' });
    expect(lintStory(s).errors.map((e) => e.code)).toContain('ITEM_NOT_NUMERIC');
  });
  it('HAS_ITEM_NOT_ITEM — has_item on a var that is not a declared item', () => {
    const s = clean();
    s.nodes[0].choices[0].conditions = [{ field: 'knows', op: 'has_item' }]; // 'knows' is a boolean, not an item
    expect(lintStory(s).errors.map((e) => e.code)).toContain('HAS_ITEM_NOT_ITEM');
  });
  it('does NOT flag a valid item var + has_item (no false positive)', () => {
    const s = clean();
    s.variables.push({ name: 'thermite', type: 'number', kind: 'item', default: 0, min: 0, max: 3, purpose: 'x' });
    s.nodes[0].choices[0].conditions = [{ field: 'thermite', op: 'has_item' }];
    const codes = lintStory(s).errors.map((e) => e.code);
    expect(codes).not.toContain('ITEM_NOT_NUMERIC');
    expect(codes).not.toContain('HAS_ITEM_NOT_ITEM');
  });
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx vitest run src/engine/linter.test.ts`
Expected: the first two FAIL (`expected [...] to include 'ITEM_NOT_NUMERIC'` / `'HAS_ITEM_NOT_ITEM'`); the no-false-positive test passes already.

- [ ] **Step 3: Add the `itemVars` set** — in `src/engine/linter.ts`, find the line `const varNames = new Set(story.variables.map((v) => v.name));` (near the top of `lintStory`) and add immediately after the existing `for (const r of story.resources ?? []) varNames.add(r.id);` line:

```ts
  const itemVars = new Set(story.variables.filter((v) => v.kind === 'item').map((v) => v.name));
```

- [ ] **Step 4: Add the `ITEM_NOT_NUMERIC` check** — in `src/engine/linter.ts`, find the existing reserved-prefix loop:

```ts
  for (const v of story.variables) {
    if (v.name.startsWith('__')) err('RESERVED_VAR_PREFIX', `Variable '${v.name}' uses the reserved '__' prefix (engine-internal, e.g. resource offsets)`, v.name);
  }
```

and add the item-type check inside that same loop, after the `__` check:

```ts
    if (v.kind === 'item' && v.type !== 'number') err('ITEM_NOT_NUMERIC', `Item '${v.name}' (kind:'item') must be type 'number'`, v.name);
```

- [ ] **Step 5: Add the `HAS_ITEM_NOT_ITEM` check** — in `src/engine/linter.ts`, find `checkConds` and the line `if (c.op === 'has_visited' || c.op.startsWith('time_')) continue;`. Add this branch immediately before that line:

```ts
      if (c.op === 'has_item') {
        if (!itemVars.has(c.field)) err('HAS_ITEM_NOT_ITEM', `has_item references '${c.field}' which is not a declared item (kind:'item')`, where);
        continue;
      }
```

- [ ] **Step 6: Run the tests, verify they pass**

Run: `npx vitest run src/engine/linter.test.ts`
Expected: PASS (all three new tests green; existing linter tests still green).

- [ ] **Step 7: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/engine/linter.ts src/engine/linter.test.ts
git commit -m "feat(engine): ITEM_NOT_NUMERIC + HAS_ITEM_NOT_ITEM lints (counted inventory)"
```

---

### Task 3: End-to-end integration (spend-a-charge gate) + regression check

**Files:**
- Create: `src/engine/items.test.ts`

**Interfaces:**
- Consumes: `has_item` (Task 1), the item lints (Task 2), and the existing `increment`/`decrement` clamping.

- [ ] **Step 1: Write the integration test** — create `src/engine/items.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { GameEngine } from './engine';
import { lintStory } from './linter';
import type { Story } from './types';

function heistStory(startThermite: number): Story {
  return {
    id: 'h', title: 'heist', startNodeId: 'vault', startTime: '02:00', deadline: '02:30', startLocation: 'L',
    variables: [{ name: 'thermite', type: 'number', kind: 'item', default: startThermite, min: 0, max: 3, label: 'Thermite', purpose: 'breaching charges' }],
    locations: [{ id: 'L', name: 'L' }], events: [],
    nodes: [
      { id: 'vault', title: 'Vault', body: '', choices: [
        { id: 'blow', label: 'Blow the vault', conditions: [{ field: 'thermite', op: 'has_item' }],
          effects: [{ field: 'thermite', op: 'decrement', value: '1' }, { field: 'time', op: 'add_minutes', value: '20' }], destination: 'open' },
      ] },
      { id: 'open', title: 'Open', body: '', choices: [], resolvesEnding: true },
    ],
    endings: [{ id: 'd', name: 'D', summary: '', conditions: [], isDefault: true }],
  };
}

describe('counted inventory (items as flagged count-vars)', () => {
  it('lints clean', () => {
    expect(lintStory(heistStory(1)).errors).toEqual([]);
  });
  it('a has_item-gated choice is available and spends the item (clamped at min)', () => {
    const g = new GameEngine(heistStory(1));
    g.start();
    expect(g.view().choices.find((c) => c.id === 'blow')?.available).toBe(true);
    const v = g.choose('blow'); // spends 1 -> 0
    expect(Number(v.state.vars.thermite)).toBe(0);
  });
  it('the gated choice is unavailable when the item is exhausted', () => {
    const g = new GameEngine(heistStory(0));
    g.start();
    expect(g.view().choices.find((c) => c.id === 'blow')?.available).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test, verify it passes**

Run: `npx vitest run src/engine/items.test.ts`
Expected: PASS (all three). (This exercises has_item gating, decrement-with-clamp, and lint-clean together — each piece is already implemented in Tasks 1-2, so this should pass on first run; if any fails, fix the underlying task.)

- [ ] **Step 3: Full suite + typecheck (regression gate)**

Run: `npx vitest run` then `npx tsc --noEmit`
Expected: all tests green (the cave game still lints clean — it declares no items), typecheck clean.

- [ ] **Step 4: Commit**

```bash
git add src/engine/items.test.ts
git commit -m "test(engine): end-to-end counted-inventory integration (spend-a-charge gate)"
```

---

## Self-Review

**Spec coverage:**
- Model (`kind:'item'` count-var) → Task 1 (the type field). ✓
- `has_item` condition + reuse of numeric ops → Task 1 (`has_item`); numeric ops already exist (no task needed). ✓
- Add/spend via `increment`/`decrement` → already exist; exercised in Task 3. ✓
- Lints `ITEM_NOT_NUMERIC` + `HAS_ITEM_NOT_ITEM` → Task 2. ✓
- Backward-compat (legacy inventory/carry/walker untouched) → enforced by Global Constraints (no task touches them); regression-checked in Task 3 Step 3. ✓
- Front-end hook (the `kind` tag) → the tag is added in Task 1; the UI itself is out of scope (WS-G). ✓
- Testing → Tasks 1-3 are all TDD. ✓

**Placeholder scan:** No TBD/TODO; every code step shows the exact code. ✓

**Type consistency:** `kind?: 'item'`, `ConditionOp` `'has_item'`, lint codes `ITEM_NOT_NUMERIC` / `HAS_ITEM_NOT_ITEM`, and `itemVars` are named identically everywhere they appear. ✓
