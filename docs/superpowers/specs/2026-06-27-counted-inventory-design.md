# Counted Inventory via Flagged Count-Vars — Design

> Engine-capability spec. The first capability from the post-v1.4 capabilities brainstorm, in service of the
> next game (a **mob/heist survival/thriller**). Approved 2026-06-27. Built entirely on the variable machinery
> hardened in engine v1.4.

## Context

The next game is a **mob/heist survival/thriller** — the proven time-pressure engine in a new skin. A heist
genuinely wants **counted inventory**: gear, loot, charges, keycards ("2 keycards", "1 charge left", "loot worth
X"), with choices gated both on *whether* you hold something and on *how much*.

The engine already has counted, bounded, lint-checked numbers — **variables** (`min`/`max` clamping, type-lint,
undefined-var lint, all hardened in v1.4). So rather than build a parallel inventory subsystem and reshape
`WorldState`, we deliver counted inventory **on top of the var system**: an item is a number var tagged as an
item. This was chosen (over a dedicated `inventory: Record<string,number>` field) on **felt-or-cut** grounds — it
delivers exactly counts + `has_item` + `item_count` at near-zero engine reshape, reusing machinery we just
hardened, which is the right trade at heist scale (~5–15 item types).

## The model

Add **one** optional field to `VariableDef`:

```ts
kind?: 'item';   // tags a number var as an inventory item (for the front-end backpack + lint)
```

An **item** is a declared number var with `kind: 'item'`:

- `default` = starting count; `min`/`max` = stack bounds (e.g. `min 0, max 3`); `label` = display name.
- Its quantity lives in `vars[name]` like any other number var.

```ts
{ name: 'thermite', type: 'number', kind: 'item', default: 0, min: 0, max: 3, label: 'Thermite', purpose: 'breaching charges' }
```

**Consequence:** `WorldState`, `snapshot`/`restore`, the cross-chapter carry (`extractCarry` / `seedChapterStory`),
and `walkStateSpace` are all **untouched** — items are vars, already handled everywhere. This is the whole point
of the approach.

## Conditions & effects

- **Counts** — reuse the existing numeric condition ops on the item var directly:
  `{ field: 'thermite', op: 'gte', value: '2' }` ("≥ 2 charges"), plus `gt` / `lte` / `lt` / `equals`. (`item_count`
  is just these — no new op.)
- **`has_item`** — the one new condition op: sugar for "have at least one". `{ field: 'thermite', op: 'has_item' }`
  ⇔ `thermite >= 1`. An optional `value` gives "≥ N": `{ op: 'has_item', value: '2' }` ⇔ `>= 2`.
- **Add / spend** — reuse the existing `increment` / `decrement` effects, already clamped to `[min, max]`:
  `{ field: 'thermite', op: 'decrement', value: '1' }` spends one (floored at `min`). **No new effect ops.**

## Lint

- `ITEM_NOT_NUMERIC` (error) — a `kind:'item'` var declared with `type` ≠ `'number'`.
- `HAS_ITEM_NOT_ITEM` (error) — a `has_item` condition whose field is not a declared `kind:'item'` var
  (typo-safety, mirroring `UNDEFINED_VAR` / `DEAD_CLUE_REFERENCE`).
- Bounds (`VALUE_OUT_OF_BOUND`), undefined-var, and numeric type-mismatch are already enforced by the var lints —
  items inherit them for free.

## Backward-compat + front-end hook

- The legacy `inventory: string[]` field, the `add_item` / `remove_item` effects, and `carry.inventory` are
  **untouched** — they remain for simple unique "have-or-not" items. Counted inventory is the new item-var path
  (the recommended one going forward). **No migration required.**
- **WS-G (front-end, later):** renders `kind:'item'` vars — `label`, current count, `max` — as the player's
  backpack. The `kind` tag is the only bridge needed; no engine work for it now.

## Engine surface (files to touch)

- `src/engine/types.ts` — `VariableDef.kind?: 'item'`; `ConditionOp` += `'has_item'`.
- `src/engine/conditions.ts` — evaluate `has_item` (`num(vars[field]) >= (value ? num(value) : 1)`).
- `src/engine/linter.ts` — `ITEM_NOT_NUMERIC`, `HAS_ITEM_NOT_ITEM`.
- Tests — `conditions.test.ts`, `linter.test.ts`, + one `GameEngine` integration (a spend-a-charge gate).

## Out of scope (deferred / parked)

- A dedicated `inventory: Record<string, number>` model (Approach 2) — rejected as gold-plating at this scale.
- The front-end backpack UI (WS-G).
- The other heist capabilities — timed/skill challenges (mostly front-end), characters-as-assets, and the
  clock/phase profile (pulled when the heist's structure demands it). Each gets its own brainstorm/spec.
- Free-roam travel + clue-finding (investigation-shape; stay parked).

## Verification

- **TDD**: `has_item` (≥1 and ≥N with `value`) in `conditions.test`; the two lint checks each bite **and** a clean
  item-var story passes with zero false positives; a `GameEngine` integration proving a `has_item thermite`-gated
  choice that `decrement`s thermite works end-to-end and clamps at `min`.
- Full `npx vitest run` green + `npx tsc --noEmit` clean. **The cave game must still lint clean** (it declares no
  items, so nothing about it changes).
