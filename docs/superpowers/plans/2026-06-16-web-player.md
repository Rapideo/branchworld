# BranchWorld Web Player + Debug Panel (Sub-project B) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a thin, mobile-first React web player and a toggleable debug panel over the existing pure-TypeScript engine, with named localStorage save slots and one bundled sample story — proving the engine can be played and felt in a browser.

**Architecture:** The `GameEngine` stays the single source of truth (PRD §EE-6). A `useGame` hook holds a live engine instance and the latest `GameView`; React components are pure renderers of that view. The engine grows a small, tested `snapshot`/`restore`/`gotoNode` seam (for saves and jump-to-node). No engine logic is duplicated in the UI. Player view hides locked choices; the debug panel reveals them with reasons.

**Tech Stack:** Vite + React 18 + TypeScript (strict) + Tailwind CSS v4. Tests: Vitest 2 + React Testing Library (jsdom). Reuses the existing `src/`, `package.json`, `tsconfig.json`.

## Global Constraints

- TypeScript `strict: true`. No `any` in committed code.
- `src/engine/**` MUST NOT import React, react-dom, Vite, or the DOM. It stays pure logic.
- React is a **thin renderer**: components are pure functions of `GameView`; no condition/effect/event/ending logic is re-implemented in the UI. The UI calls engine functions (`resolveEnding`, `lintStory`) — it never reproduces them.
- Player view renders **only available** choices. Locked choices appear **only** in the debug panel, with their `lockedReason`.
- Tailwind v4 via the `@tailwindcss/vite` plugin; CSS entry is `@import "tailwindcss";`.
- Vitest environment split: tests under `src/player/**` run in `jsdom`; all other tests run in `node` (the existing 41 engine tests must stay green).
- Saves are namespaced in localStorage by story id: key `branchworld:saves:<storyId>`.
- Co-located tests. Every task ends green (`npm test`) and with a Conventional Commit (`feat:`, `test:`, `chore:`).

---

### Task 1: Engine snapshot / restore / gotoNode seam

**Files:**
- Modify: `src/engine/types.ts` (add `EngineSnapshot`)
- Modify: `src/engine/engine.ts` (add `snapshot`, `restore`, `gotoNode`)
- Test: `src/engine/snapshot.test.ts`

**Interfaces:**
- Consumes: `GameEngine`, `Story`, `WorldState`, `GameView`, `Ending` (existing).
- Produces:
  - `interface EngineSnapshot { version: 1; storyId: string; currentId: string; state: WorldState; log: string[]; endingId?: string }`
  - `GameEngine.snapshot(): EngineSnapshot`
  - `GameEngine.restore(snap: EngineSnapshot): void` (throws on version/storyId mismatch)
  - `GameEngine.gotoNode(id: string): GameView` (debug: enters a node; does not unwind a reached ending)

- [ ] **Step 1: Write the failing test `src/engine/snapshot.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { GameEngine } from './engine';
import type { Story } from './types';

function tiny(): Story {
  return {
    id: 'tiny', title: 'Tiny', startNodeId: 'a', startTime: '15:00', deadline: '18:00',
    startLocation: 'L', variables: [{ name: 'n', type: 'number', default: 0, purpose: 'n' }],
    locations: [], events: [],
    nodes: [
      { id: 'a', title: 'A', body: 'a', choices: [
        { id: 'go', label: 'go', destination: 'b',
          effects: [{ field: 'n', op: 'increment', value: '1' }, { field: 'time', op: 'add_minutes', value: '30' }] },
      ] },
      { id: 'b', title: 'B', body: 'b', choices: [{ id: 'back', label: 'back', destination: 'a' }] },
      { id: 'end', title: 'End', body: 'end', resolvesEnding: true, choices: [] },
    ],
    endings: [
      { id: 'win', name: 'Win', summary: 'w', conditions: [{ field: 'n', op: 'gte', value: '1' }] },
      { id: 'default', name: 'D', summary: 'd', conditions: [], isDefault: true },
    ],
  };
}

describe('engine snapshot/restore/gotoNode', () => {
  it('round-trips state via snapshot/restore', () => {
    const g = new GameEngine(tiny());
    g.choose('go');                 // n=1, time 15:30, at b
    const snap = g.snapshot();
    expect(snap.storyId).toBe('tiny');
    const g2 = new GameEngine(tiny());
    g2.restore(snap);
    const v = g2.view();
    expect(v.node.id).toBe('b');
    expect(v.state.vars.n).toBe(1);
    expect(v.time).toBe(930);
  });
  it('rejects a snapshot from a different story', () => {
    const g = new GameEngine(tiny());
    const snap = g.snapshot();
    const g2 = new GameEngine({ ...tiny(), id: 'other' });
    expect(() => g2.restore(snap)).toThrow();
  });
  it('gotoNode enters a node for testing', () => {
    const g = new GameEngine(tiny());
    const v = g.gotoNode('end');    // resolvesEnding; n=0 -> default
    expect(v.node.id).toBe('end');
    expect(v.endingReached?.id).toBe('default');
  });
  it('preserves a reached ending across snapshot/restore', () => {
    const g = new GameEngine(tiny());
    g.choose('go');                 // n=1
    g.gotoNode('end');              // resolves -> win
    const snap = g.snapshot();
    expect(snap.endingId).toBe('win');
    const g2 = new GameEngine(tiny());
    g2.restore(snap);
    expect(g2.view().endingReached?.id).toBe('win');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run snapshot`
Expected: FAIL — `snapshot`/`restore`/`gotoNode` are not functions.

- [ ] **Step 3: Add `EngineSnapshot` to `src/engine/types.ts`**

Append at the end of the file:

```ts
export interface EngineSnapshot {
  version: 1;
  storyId: string;
  currentId: string;
  state: WorldState;
  log: string[];
  endingId?: string;
}
```

- [ ] **Step 4: Add the three methods to `src/engine/engine.ts`**

Change the type import line to include `EngineSnapshot`:

```ts
import type { Story, StoryNode, WorldState, GameView, ChoiceView, Ending, EngineSnapshot } from './types';
```

Add these three methods inside the `GameEngine` class, immediately after `choose(...)`:

```ts
  snapshot(): EngineSnapshot {
    return {
      version: 1,
      storyId: this.story.id,
      currentId: this.currentId,
      state: JSON.parse(JSON.stringify(this.state)) as WorldState,
      log: [...this.log],
      endingId: this.ending?.id,
    };
  }

  restore(snap: EngineSnapshot): void {
    if (snap.version !== 1) throw new Error(`Unsupported snapshot version: ${snap.version}`);
    if (snap.storyId !== this.story.id) {
      throw new Error(`Snapshot is for story ${snap.storyId}, not ${this.story.id}`);
    }
    this.state = JSON.parse(JSON.stringify(snap.state)) as WorldState;
    this.currentId = snap.currentId;
    this.log = [...snap.log];
    this.ending = snap.endingId ? this.story.endings.find((e) => e.id === snap.endingId) : undefined;
  }

  gotoNode(id: string): GameView {
    this.enter(id);
    return this.view();
  }
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run snapshot`
Expected: PASS (4 tests).

- [ ] **Step 6: Confirm the existing engine suite is still green**

Run: `npm test`
Expected: PASS — all prior tests plus the 4 new ones.

- [ ] **Step 7: Commit**

```bash
git add src/engine/types.ts src/engine/engine.ts src/engine/snapshot.test.ts
git commit -m "feat: engine snapshot/restore/gotoNode seam for saves and debug"
```

---

### Task 2: Vite + React + Tailwind + Testing-Library toolchain

**Files:**
- Modify: `package.json` (deps + scripts)
- Modify: `tsconfig.json` (jsx + DOM lib)
- Delete: `vitest.config.ts` (consolidated into vite.config.ts)
- Create: `vite.config.ts`, `index.html`, `src/main.tsx`, `src/index.css`, `src/vite-env.d.ts`, `src/test/setup.ts`, `src/player/App.tsx`
- Test: `src/player/toolchain.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm run dev` server, a `jsdom`+RTL test environment, and a minimal `App` shell.

- [ ] **Step 1: Install dependencies**

```bash
npm install react@^18.3.1 react-dom@^18.3.1
npm install -D vite@^5.4.0 @vitejs/plugin-react@^4.3.1 tailwindcss@^4.0.0 @tailwindcss/vite@^4.0.0 \
  @types/react@^18.3.5 @types/react-dom@^18.3.0 jsdom@^25.0.0 \
  @testing-library/react@^16.0.1 @testing-library/dom@^10.4.0 \
  @testing-library/jest-dom@^6.5.0 @testing-library/user-event@^14.5.2
```

Expected: installs succeed; `node_modules` updated.

- [ ] **Step 2: Replace `vitest.config.ts` with `vite.config.ts`**

Delete `vitest.config.ts`, then create `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    environmentMatchGlobs: [['src/player/**', 'jsdom']],
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

```bash
git rm vitest.config.ts
```

- [ ] **Step 3: Update `tsconfig.json`**

Replace the `compilerOptions` block with (adds `lib` and `jsx`):

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Add `dev`/`build`/`preview` scripts to `package.json`**

Set the `scripts` block to:

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
```

- [ ] **Step 5: Create the entry files**

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BranchWorld Player</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

`src/index.css`:

```css
@import "tailwindcss";
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './player/App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

`src/player/App.tsx` (minimal shell; expanded in Task 9):

```tsx
export function App() {
  return <main className="min-h-screen bg-stone-50 text-stone-900">BranchWorld</main>;
}
```

- [ ] **Step 6: Write the toolchain smoke test `src/player/toolchain.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('toolchain', () => {
  it('renders a React component in jsdom with jest-dom matchers', () => {
    render(<button>hello</button>);
    expect(screen.getByRole('button', { name: 'hello' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run the suite and typecheck**

Run: `npm test`
Expected: PASS — engine tests (node) + the toolchain test (jsdom).

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 8: Verify the dev server boots (manual)**

Run: `npm run dev` then open the printed URL; expect to see "BranchWorld". Stop the server (Ctrl-C).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html \
  src/main.tsx src/index.css src/vite-env.d.ts src/test/setup.ts src/player/App.tsx src/player/toolchain.test.tsx
git commit -m "chore: add Vite + React + Tailwind v4 + Testing Library toolchain"
```

---

### Task 3: Bundled sample story

**Files:**
- Create: `src/content/sampleStory.ts`
- Test: `src/content/sampleStory.test.ts`

**Interfaces:**
- Consumes: `Story` (types), `GameEngine`, `lintStory` (engine).
- Produces: `export const sampleStory: Story` (id `sample_410`). Lints clean (no errors, no warnings), exercises a hidden→revealed choice, the scheduled event present **and** absent with a reachable recovery node, and ≥2 distinct state-resolved endings.

> This story is verified lint-clean and playable against the real engine. Author it exactly as below.

- [ ] **Step 1: Write the failing test `src/content/sampleStory.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { GameEngine, lintStory } from '../engine';
import { sampleStory } from './sampleStory';

describe('sampleStory', () => {
  it('lints clean with no warnings', () => {
    const r = lintStory(sampleStory);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
  it('present path reaches the witnessed ending', () => {
    const g = new GameEngine(sampleStory);
    g.choose('ask');        // 15:40, knows, trust 1
    g.choose('watchnow');   // -> watch, 15:50
    const v = g.choose('keep'); // +20 -> 16:10 at diner: event present -> witness
    expect(v.node.id).toBe('witness');
    expect(v.endingReached?.id).toBe('witnessed');
  });
  it('absent path plants the receipt and reaches the receipt ending via the recovery node', () => {
    const g = new GameEngine(sampleStory);
    g.choose('arcade');     // loc ARCADE, 15:50
    g.choose('play');       // +20 -> 16:10 absent: receipt planted
    const v = g.choose('headback'); // -> find_receipt
    expect(v.node.id).toBe('find_receipt');
    expect(v.state.clues).toContain('receipt');
    expect(v.endingReached?.id).toBe('receipt_trail');
  });
  it('locks the press choice until trust is high enough (hidden->revealed)', () => {
    const g = new GameEngine(sampleStory);
    g.choose('ask');        // briefed, trust 1
    expect(g.view().choices.find((c) => c.id === 'press')?.available).toBe(false);
    g.choose('apologize');  // closer, trust 2
    expect(g.view().choices.find((c) => c.id === 'press')?.available).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run sampleStory`
Expected: FAIL — cannot find module `./sampleStory`.

- [ ] **Step 3: Write `src/content/sampleStory.ts`**

```ts
import type { Story } from '../engine';

export const sampleStory: Story = {
  id: 'sample_410',
  title: 'The 4:10 Envelope (mini)',
  startNodeId: 'start',
  startTime: '15:30',
  deadline: '16:15',
  startLocation: 'L_DINER',
  variables: [
    { name: 'knows_envelope', type: 'boolean', default: false, purpose: 'Player has learned about the 4:10 pickup' },
    { name: 'mara_trust', type: 'number', default: 0, purpose: 'How much Mara trusts the player' },
    { name: 'saw_pickup', type: 'boolean', default: false, purpose: 'Player witnessed the envelope pickup' },
  ],
  locations: [
    { id: 'L_DINER', name: 'The Diner' },
    { id: 'L_ARCADE', name: 'The Arcade' },
  ],
  events: [{
    id: 'E_PICKUP', title: 'Envelope Pickup',
    trigger: [{ field: 'time', op: 'time_after', value: '16:00' }],
    eventLocation: 'L_DINER',
    ifPresentNode: 'witness',
    ifAbsentEffects: [{ field: 'clues', op: 'add_clue', value: 'receipt' }],
    recoveryNodeId: 'find_receipt',
  }],
  nodes: [
    { id: 'start', title: 'A Booth by the Window', body: 'The diner is half-empty. {{time}}.', location: 'L_DINER', choices: [
      { id: 'ask', label: 'Ask Mara what she heard', destination: 'briefed',
        effects: [{ field: 'knows_envelope', op: 'set', value: 'true' }, { field: 'mara_trust', op: 'increment', value: '1' }, { field: 'time', op: 'add_minutes', value: '10' }] },
      { id: 'arcade', label: 'Walk to the arcade', destination: 'arcade',
        effects: [{ field: 'location', op: 'change_location', value: 'L_ARCADE' }, { field: 'time', op: 'add_minutes', value: '20' }] },
      { id: 'home', label: 'Head home', destination: 'leftearly',
        effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
    ] },
    { id: 'briefed', title: 'Mara Leans In', body: "'Back booth, around 4:10. Don't stare.'", location: 'L_DINER', choices: [
      { id: 'press', label: 'Press her for the details', destination: 'watch',
        conditions: [{ field: 'mara_trust', op: 'gte', value: '2' }],
        effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      { id: 'apologize', label: 'Apologize for prying', destination: 'closer',
        effects: [{ field: 'mara_trust', op: 'increment', value: '1' }, { field: 'time', op: 'add_minutes', value: '5' }] },
      { id: 'watchnow', label: 'Settle in and watch the booth', destination: 'watch',
        effects: [{ field: 'time', op: 'add_minutes', value: '10' }] },
    ] },
    { id: 'closer', title: 'She Softens', body: 'She exhales and meets your eye. {{time}}.', location: 'L_DINER', choices: [
      { id: 'press', label: 'Press her for the details', destination: 'watch',
        conditions: [{ field: 'mara_trust', op: 'gte', value: '2' }],
        effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
      { id: 'watchnow', label: 'Settle in and watch the booth', destination: 'watch',
        effects: [{ field: 'time', op: 'add_minutes', value: '8' }] },
    ] },
    { id: 'watch', title: 'The Stakeout', body: 'You nurse a coffee and watch the back booth.', location: 'L_DINER', choices: [
      { id: 'keep', label: 'Keep watching', destination: 'missed',
        effects: [{ field: 'time', op: 'add_minutes', value: '20' }] },
      { id: 'leave', label: 'Give up and step out', destination: 'leftlate',
        effects: [{ field: 'time', op: 'add_minutes', value: '5' }] },
    ] },
    { id: 'arcade', title: 'The Arcade', body: 'Pinball and neon hum. {{time}}.', location: 'L_ARCADE', choices: [
      { id: 'play', label: 'Lose track of time at the machines', destination: 'arcade2',
        effects: [{ field: 'time', op: 'add_minutes', value: '20' }] },
    ] },
    { id: 'arcade2', title: 'A Buzz', body: 'Your phone buzzes. You have a feeling you missed something.', location: 'L_ARCADE', choices: [
      { id: 'headback', label: 'Hurry back to the diner', destination: 'find_receipt',
        effects: [{ field: 'location', op: 'change_location', value: 'L_DINER' }, { field: 'time', op: 'add_minutes', value: '10' }] },
    ] },
    { id: 'find_receipt', title: 'The Receipt', body: 'By the back booth, a crumpled receipt lies on the floor.', location: 'L_DINER', resolvesEnding: true, choices: [] },
    { id: 'witness', title: 'The Pickup', body: 'A man in a gray coat lifts the folded newspaper and is gone.', location: 'L_DINER',
      entryEffects: [{ field: 'saw_pickup', op: 'set', value: 'true' }], resolvesEnding: true, choices: [] },
    { id: 'missed', title: 'Empty Booth', body: 'When you look again, the booth is empty.', location: 'L_DINER', resolvesEnding: true, choices: [] },
    { id: 'leftearly', title: 'Home', body: 'You walk away before any of it begins.', location: 'L_DINER', resolvesEnding: true, choices: [] },
    { id: 'leftlate', title: 'The Sidewalk', body: 'You step out into the late afternoon, none the wiser.', location: 'L_DINER', resolvesEnding: true, choices: [] },
  ],
  endings: [
    { id: 'witnessed', name: 'The Witness', summary: 'You saw the handoff with your own eyes.', conditions: [{ field: 'saw_pickup', op: 'is_true' }] },
    { id: 'receipt_trail', name: 'The Receipt', summary: 'You missed the pickup but found the trail it left.', conditions: [{ field: 'clues', op: 'has_clue', value: 'receipt' }] },
    { id: 'informed', name: 'In the Know', summary: 'You learned the truth but never proved it.', conditions: [{ field: 'knows_envelope', op: 'is_true' }] },
    { id: 'default', name: 'In the Dark', summary: 'The afternoon passed you by.', conditions: [], isDefault: true },
  ],
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run sampleStory`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/content/sampleStory.ts src/content/sampleStory.test.ts
git commit -m "feat: bundled lint-clean sample story for the web player"
```

---

### Task 4: `renderBody` — `{{time}}` token substitution

**Files:**
- Create: `src/player/renderBody.ts`
- Test: `src/player/renderBody.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `renderBody(body: string, timeLabel: string): string`.

- [ ] **Step 1: Write the failing test `src/player/renderBody.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { renderBody } from './renderBody';

describe('renderBody', () => {
  it('substitutes the {{time}} token', () => {
    expect(renderBody('At {{time}} sharp.', '4:10 PM')).toBe('At 4:10 PM sharp.');
  });
  it('leaves text without the token unchanged', () => {
    expect(renderBody('No token here.', '4:10 PM')).toBe('No token here.');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run renderBody`
Expected: FAIL — cannot find module `./renderBody`.

- [ ] **Step 3: Write `src/player/renderBody.ts`**

```ts
export function renderBody(body: string, timeLabel: string): string {
  return body.replaceAll('{{time}}', timeLabel);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run renderBody`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/player/renderBody.ts src/player/renderBody.test.ts
git commit -m "feat: {{time}} token substitution for scene bodies"
```

---

### Task 5: `useGame` hook

**Files:**
- Create: `src/player/useGame.ts`
- Test: `src/player/useGame.test.tsx`

**Interfaces:**
- Consumes: `GameEngine`, `Story`, `GameView`, `EngineSnapshot` (engine); `sampleStory` (content).
- Produces:
  - `interface UseGame { view: GameView; choose(choiceId: string): void; reset(): void; gotoNode(id: string): void; snapshot(): EngineSnapshot; restore(snap: EngineSnapshot): void }`
  - `useGame(story: Story): UseGame`

- [ ] **Step 1: Write the failing test `src/player/useGame.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGame } from './useGame';
import { sampleStory } from '../content/sampleStory';

describe('useGame', () => {
  it('exposes the start view and advances on choose', () => {
    const { result } = renderHook(() => useGame(sampleStory));
    expect(result.current.view.node.id).toBe('start');
    act(() => result.current.choose('ask'));
    expect(result.current.view.node.id).toBe('briefed');
    expect(result.current.view.state.vars.knows_envelope).toBe(true);
  });
  it('resets to the start', () => {
    const { result } = renderHook(() => useGame(sampleStory));
    act(() => result.current.choose('ask'));
    act(() => result.current.reset());
    expect(result.current.view.node.id).toBe('start');
  });
  it('round-trips via snapshot/restore', () => {
    const { result } = renderHook(() => useGame(sampleStory));
    act(() => result.current.choose('ask'));
    let snap!: ReturnType<typeof result.current.snapshot>;
    act(() => { snap = result.current.snapshot(); });
    act(() => result.current.reset());
    expect(result.current.view.node.id).toBe('start');
    act(() => result.current.restore(snap));
    expect(result.current.view.node.id).toBe('briefed');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run useGame`
Expected: FAIL — cannot find module `./useGame`.

- [ ] **Step 3: Write `src/player/useGame.ts`**

```ts
import { useRef, useState } from 'react';
import { GameEngine } from '../engine';
import type { Story, GameView, EngineSnapshot } from '../engine';

export interface UseGame {
  view: GameView;
  choose(choiceId: string): void;
  reset(): void;
  gotoNode(id: string): void;
  snapshot(): EngineSnapshot;
  restore(snap: EngineSnapshot): void;
}

export function useGame(story: Story): UseGame {
  const engineRef = useRef<GameEngine | null>(null);
  if (engineRef.current === null) engineRef.current = new GameEngine(story);
  const [view, setView] = useState<GameView>(() => engineRef.current!.view());

  return {
    view,
    choose: (id) => { engineRef.current!.choose(id); setView(engineRef.current!.view()); },
    reset: () => { engineRef.current = new GameEngine(story); setView(engineRef.current.view()); },
    gotoNode: (id) => { engineRef.current!.gotoNode(id); setView(engineRef.current!.view()); },
    snapshot: () => engineRef.current!.snapshot(),
    restore: (snap) => { engineRef.current!.restore(snap); setView(engineRef.current!.view()); },
  };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run useGame`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/player/useGame.ts src/player/useGame.test.tsx
git commit -m "feat: useGame hook wrapping the engine as source of truth"
```

---

### Task 6: Player view components (StatusBar, SceneView, ChoiceList, EndingView)

**Files:**
- Create: `src/player/StatusBar.tsx`, `src/player/SceneView.tsx`, `src/player/ChoiceList.tsx`, `src/player/EndingView.tsx`
- Test: `src/player/playerView.test.tsx`

**Interfaces:**
- Consumes: `StoryNode`, `ChoiceView`, `Ending` (engine); `renderBody` (Task 4).
- Produces (pure components):
  - `StatusBar({ timeLabel, location }: { timeLabel: string; location: string })`
  - `SceneView({ node, timeLabel }: { node: StoryNode; timeLabel: string })`
  - `ChoiceList({ choices, onChoose }: { choices: ChoiceView[]; onChoose: (id: string) => void })` — renders **only available** choices
  - `EndingView({ ending, onReset }: { ending: Ending; onReset: () => void })`

- [ ] **Step 1: Write the failing test `src/player/playerView.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusBar } from './StatusBar';
import { SceneView } from './SceneView';
import { ChoiceList } from './ChoiceList';
import { EndingView } from './EndingView';

describe('player view', () => {
  it('StatusBar shows time and location', () => {
    render(<StatusBar timeLabel="4:10 PM" location="The Diner" />);
    expect(screen.getByText(/4:10 PM/)).toBeInTheDocument();
    expect(screen.getByText(/The Diner/)).toBeInTheDocument();
  });
  it('SceneView shows the title and substitutes {{time}}', () => {
    render(<SceneView node={{ id: 'n', title: 'Scene', body: 'It is {{time}} now.', choices: [] }} timeLabel="4:10 PM" />);
    expect(screen.getByRole('heading', { name: 'Scene' })).toBeInTheDocument();
    expect(screen.getByText('It is 4:10 PM now.')).toBeInTheDocument();
  });
  it('ChoiceList renders only available choices and reports clicks', async () => {
    const onChoose = vi.fn();
    render(<ChoiceList onChoose={onChoose} choices={[
      { id: 'a', label: 'Alpha', available: true },
      { id: 'b', label: 'Bravo', available: false, lockedReason: 'locked' },
    ]} />);
    expect(screen.getByRole('button', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bravo' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Alpha' }));
    expect(onChoose).toHaveBeenCalledWith('a');
  });
  it('EndingView shows the ending and a reset control', async () => {
    const onReset = vi.fn();
    render(<EndingView onReset={onReset} ending={{ id: 'e', name: 'The End', summary: 'Done.', conditions: [] }} />);
    expect(screen.getByText('The End')).toBeInTheDocument();
    expect(screen.getByText('Done.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /new game/i }));
    expect(onReset).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run playerView`
Expected: FAIL — cannot find the component modules.

- [ ] **Step 3: Write the four components**

`src/player/StatusBar.tsx`:

```tsx
export function StatusBar({ timeLabel, location }: { timeLabel: string; location: string }) {
  return (
    <header className="sticky top-0 z-10 flex justify-between border-b border-stone-200 bg-stone-50/90 px-4 py-2 text-sm font-medium text-stone-600 backdrop-blur">
      <span>{timeLabel}</span>
      <span>{location}</span>
    </header>
  );
}
```

`src/player/SceneView.tsx`:

```tsx
import type { StoryNode } from '../engine';
import { renderBody } from './renderBody';

export function SceneView({ node, timeLabel }: { node: StoryNode; timeLabel: string }) {
  return (
    <article className="mx-auto max-w-prose px-4 py-6">
      <h1 className="mb-4 font-serif text-2xl text-stone-900">{node.title}</h1>
      <p className="whitespace-pre-line font-serif text-lg leading-relaxed text-stone-800">
        {renderBody(node.body, timeLabel)}
      </p>
    </article>
  );
}
```

`src/player/ChoiceList.tsx`:

```tsx
import type { ChoiceView } from '../engine';

export function ChoiceList({ choices, onChoose }: { choices: ChoiceView[]; onChoose: (id: string) => void }) {
  return (
    <nav className="mx-auto flex max-w-prose flex-col gap-2 px-4 pb-8">
      {choices.filter((c) => c.available).map((c) => (
        <button
          key={c.id}
          onClick={() => onChoose(c.id)}
          className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-left text-stone-800 transition hover:border-stone-400 hover:bg-stone-100"
        >
          {c.label}
        </button>
      ))}
    </nav>
  );
}
```

`src/player/EndingView.tsx`:

```tsx
import type { Ending } from '../engine';

export function EndingView({ ending, onReset }: { ending: Ending; onReset: () => void }) {
  return (
    <section className="mx-auto max-w-prose px-4 pb-8">
      <div className="rounded-xl border border-stone-300 bg-white p-6">
        <p className="mb-1 text-xs uppercase tracking-wide text-stone-400">Ending</p>
        <h2 className="mb-2 font-serif text-2xl text-stone-900">{ending.name}</h2>
        <p className="mb-4 text-stone-700">{ending.summary}</p>
        <button onClick={onReset} className="rounded-lg bg-stone-800 px-4 py-2 text-white hover:bg-stone-700">
          New game
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run playerView`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/player/StatusBar.tsx src/player/SceneView.tsx src/player/ChoiceList.tsx src/player/EndingView.tsx src/player/playerView.test.tsx
git commit -m "feat: player view components (status, scene, choices, ending)"
```

---

### Task 7: Save slots (storage + UI)

**Files:**
- Create: `src/player/saves/storage.ts`, `src/player/saves/SaveSlots.tsx`
- Test: `src/player/saves/storage.test.ts`, `src/player/saves/SaveSlots.test.tsx`

**Interfaces:**
- Consumes: `EngineSnapshot` (engine).
- Produces:
  - `interface SaveSlot { snapshot: EngineSnapshot; savedAt: string; summary: string }`
  - `loadSlots(storyId: string): Record<string, SaveSlot>`
  - `writeSlot(storyId: string, name: string, slot: SaveSlot): void`
  - `deleteSlot(storyId: string, name: string): void`
  - `SaveSlots({ storyId, makeSnapshot, onRestore, summary }: { storyId: string; makeSnapshot: () => EngineSnapshot; onRestore: (snap: EngineSnapshot) => void; summary: string })`

- [ ] **Step 1: Write the failing storage test `src/player/saves/storage.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadSlots, writeSlot, deleteSlot, type SaveSlot } from './storage';
import type { EngineSnapshot } from '../../engine';

const snap: EngineSnapshot = {
  version: 1, storyId: 'sample_410', currentId: 'briefed',
  state: { time: 940, location: 'L_DINER', clues: [], inventory: [], visited: ['start', 'briefed'], completedEvents: [], vars: { knows_envelope: true, mara_trust: 1, saw_pickup: false } },
  log: [],
};
const slot: SaveSlot = { snapshot: snap, savedAt: '2026-06-16T00:00:00.000Z', summary: '3:40 PM - L_DINER' };

describe('save storage', () => {
  beforeEach(() => localStorage.clear());
  it('writes, reads, and deletes named slots', () => {
    expect(loadSlots('sample_410')).toEqual({});
    writeSlot('sample_410', 'first', slot);
    expect(loadSlots('sample_410').first.snapshot.currentId).toBe('briefed');
    deleteSlot('sample_410', 'first');
    expect(loadSlots('sample_410')).toEqual({});
  });
  it('returns {} on corrupt data', () => {
    localStorage.setItem('branchworld:saves:sample_410', '{not json');
    expect(loadSlots('sample_410')).toEqual({});
  });
  it('namespaces by story id', () => {
    writeSlot('sample_410', 's', slot);
    expect(loadSlots('other_story')).toEqual({});
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run storage`
Expected: FAIL — cannot find module `./storage`.

- [ ] **Step 3: Write `src/player/saves/storage.ts`**

```ts
import type { EngineSnapshot } from '../../engine';

export interface SaveSlot {
  snapshot: EngineSnapshot;
  savedAt: string;
  summary: string;
}

const keyFor = (storyId: string) => `branchworld:saves:${storyId}`;

export function loadSlots(storyId: string): Record<string, SaveSlot> {
  try {
    const raw = localStorage.getItem(keyFor(storyId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, SaveSlot>) : {};
  } catch {
    return {};
  }
}

export function writeSlot(storyId: string, name: string, slot: SaveSlot): void {
  try {
    const slots = loadSlots(storyId);
    slots[name] = slot;
    localStorage.setItem(keyFor(storyId), JSON.stringify(slots));
  } catch {
    /* storage unavailable; ignore */
  }
}

export function deleteSlot(storyId: string, name: string): void {
  try {
    const slots = loadSlots(storyId);
    delete slots[name];
    localStorage.setItem(keyFor(storyId), JSON.stringify(slots));
  } catch {
    /* ignore */
  }
}
```

- [ ] **Step 4: Run storage test to verify it passes**

Run: `npx vitest run storage`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing UI test `src/player/saves/SaveSlots.test.tsx`**

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaveSlots } from './SaveSlots';
import type { EngineSnapshot } from '../../engine';

const snap: EngineSnapshot = {
  version: 1, storyId: 'sample_410', currentId: 'briefed',
  state: { time: 940, location: 'L_DINER', clues: [], inventory: [], visited: [], completedEvents: [], vars: {} },
  log: [],
};

describe('SaveSlots', () => {
  beforeEach(() => localStorage.clear());
  it('saves a named slot and loads it back', async () => {
    const onRestore = vi.fn();
    render(<SaveSlots storyId="sample_410" makeSnapshot={() => snap} onRestore={onRestore} summary="3:40 PM - L_DINER" />);
    await userEvent.type(screen.getByLabelText('Slot name'), 'before pickup');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText(/before pickup/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Load' }));
    expect(onRestore).toHaveBeenCalledWith(snap);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run SaveSlots`
Expected: FAIL — cannot find module `./SaveSlots`.

- [ ] **Step 7: Write `src/player/saves/SaveSlots.tsx`**

```tsx
import { useState } from 'react';
import type { EngineSnapshot } from '../../engine';
import { loadSlots, writeSlot, deleteSlot, type SaveSlot } from './storage';

interface Props {
  storyId: string;
  makeSnapshot: () => EngineSnapshot;
  onRestore: (snap: EngineSnapshot) => void;
  summary: string;
}

export function SaveSlots({ storyId, makeSnapshot, onRestore, summary }: Props) {
  const [slots, setSlots] = useState<Record<string, SaveSlot>>(() => loadSlots(storyId));
  const [name, setName] = useState('');
  const refresh = () => setSlots(loadSlots(storyId));

  const save = () => {
    const slotName = name.trim() || `Save ${Object.keys(slots).length + 1}`;
    writeSlot(storyId, slotName, { snapshot: makeSnapshot(), savedAt: new Date().toISOString(), summary });
    setName('');
    refresh();
  };

  return (
    <section aria-label="Save slots" className="border-t border-stone-200 bg-white px-4 py-3 text-sm">
      <div className="flex gap-2">
        <input
          aria-label="Slot name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Slot name"
          className="flex-1 rounded border border-stone-300 px-2 py-1"
        />
        <button onClick={save} className="rounded bg-stone-800 px-3 py-1 text-white">Save</button>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {Object.entries(slots).map(([slotName, s]) => (
          <li key={slotName} className="flex items-center justify-between gap-2">
            <span className="truncate">{slotName} — {s.summary}</span>
            <span className="flex gap-1">
              <button onClick={() => onRestore(s.snapshot)} className="rounded border border-stone-300 px-2 py-0.5">Load</button>
              <button onClick={() => { deleteSlot(storyId, slotName); refresh(); }} className="rounded border border-stone-300 px-2 py-0.5">Delete</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 8: Run SaveSlots test to verify it passes**

Run: `npx vitest run SaveSlots`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/player/saves/storage.ts src/player/saves/storage.test.ts src/player/saves/SaveSlots.tsx src/player/saves/SaveSlots.test.tsx
git commit -m "feat: named localStorage save slots"
```

---

### Task 8: Debug panel

**Files:**
- Create: `src/player/debug/DebugPanel.tsx`
- Test: `src/player/debug/DebugPanel.test.tsx`

**Interfaces:**
- Consumes: `GameView`, `Story`, `WorldState` (engine); `resolveEnding`, `lintStory` (engine).
- Produces: `DebugPanel({ view, story, onReset, onGoto }: { view: GameView; story: Story; onReset: () => void; onGoto: (id: string) => void })`.

> The spec listed the inspector sub-sections as separate files; for B's thin, read-only debug panel they are small internal components within `DebugPanel.tsx` (one cohesive surface). Split later if it grows.

- [ ] **Step 1: Write the failing test `src/player/debug/DebugPanel.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DebugPanel } from './DebugPanel';
import { sampleStory } from '../../content/sampleStory';
import { GameEngine } from '../../engine';

function viewAtBriefed() {
  const g = new GameEngine(sampleStory);
  g.choose('ask'); // at 'briefed', trust 1 -> 'press' is locked
  return g.view();
}

describe('DebugPanel', () => {
  it('shows hidden choices with reasons, an ending preview, and clean lint', () => {
    render(<DebugPanel view={viewAtBriefed()} story={sampleStory} onReset={() => {}} onGoto={() => {}} />);
    expect(screen.getByText(/Press her for the details/)).toBeInTheDocument();
    expect(screen.getByText(/mara_trust gte 2/)).toBeInTheDocument();
    expect(screen.getByText(/In the Know/)).toBeInTheDocument();   // ending preview (knows_envelope true)
    expect(screen.getByText(/clean/i)).toBeInTheDocument();        // lint status
  });
  it('fires reset and jump callbacks', async () => {
    const onReset = vi.fn();
    const onGoto = vi.fn();
    render(<DebugPanel view={viewAtBriefed()} story={sampleStory} onReset={onReset} onGoto={onGoto} />);
    await userEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(onReset).toHaveBeenCalled();
    await userEvent.selectOptions(screen.getByLabelText('Jump to node'), 'witness');
    expect(onGoto).toHaveBeenCalledWith('witness');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run DebugPanel`
Expected: FAIL — cannot find module `./DebugPanel`.

- [ ] **Step 3: Write `src/player/debug/DebugPanel.tsx`**

```tsx
import type { GameView, Story, WorldState } from '../../engine';
import { resolveEnding, lintStory } from '../../engine';

function StateInspector({ state }: { state: WorldState }) {
  const rows: [string, string][] = [
    ['time', String(state.time)],
    ['location', state.location],
    ['clues', state.clues.join(', ') || '—'],
    ['inventory', state.inventory.join(', ') || '—'],
    ['visited', state.visited.join(', ') || '—'],
    ['completed', state.completedEvents.join(', ') || '—'],
    ...Object.entries(state.vars).map(([k, v]) => [k, String(v)] as [string, string]),
  ];
  return (
    <div>
      <h3 className="font-semibold text-stone-300">State</h3>
      <dl className="grid grid-cols-2 gap-x-2">
        {rows.map(([k, v]) => (
          <div key={k} className="contents"><dt className="text-stone-400">{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    </div>
  );
}

function EventLog({ view, story }: { view: GameView; story: Story }) {
  const upcoming = story.events.filter((e) => !view.state.completedEvents.includes(e.id));
  return (
    <div>
      <h3 className="font-semibold text-stone-300">Events</h3>
      <p className="text-stone-400">fired:</p>
      <ul>{view.log.length ? view.log.map((l, i) => <li key={i}>{l}</li>) : <li>—</li>}</ul>
      <p className="text-stone-400">upcoming:</p>
      <ul>{upcoming.length ? upcoming.map((e) => <li key={e.id}>{e.id} ({e.title})</li>) : <li>—</li>}</ul>
    </div>
  );
}

function HiddenChoices({ view }: { view: GameView }) {
  const locked = view.choices.filter((c) => !c.available);
  return (
    <div>
      <h3 className="font-semibold text-stone-300">Hidden choices</h3>
      <ul>
        {locked.length
          ? locked.map((c) => <li key={c.id}>{c.label} — needs {c.lockedReason}</li>)
          : <li>—</li>}
      </ul>
    </div>
  );
}

function EndingPreview({ view, story }: { view: GameView; story: Story }) {
  const e = resolveEnding(view.state, story);
  return (
    <div>
      <h3 className="font-semibold text-stone-300">Ending preview</h3>
      <p>{e ? e.name : '—'}</p>
    </div>
  );
}

function LintStatus({ story }: { story: Story }) {
  const r = lintStory(story);
  return (
    <div>
      <h3 className="font-semibold text-stone-300">Linter</h3>
      <p>{r.ok ? `clean (${r.warnings.length} warnings)` : `${r.errors.length} errors`}</p>
    </div>
  );
}

function JumpToNode({ story, onGoto }: { story: Story; onGoto: (id: string) => void }) {
  return (
    <div>
      <label htmlFor="jump" className="font-semibold text-stone-300">Jump to node</label>
      <select
        id="jump"
        aria-label="Jump to node"
        defaultValue=""
        onChange={(e) => { if (e.target.value) onGoto(e.target.value); }}
        className="ml-2 rounded bg-stone-800 px-2 py-1 text-stone-100"
      >
        <option value="" disabled>select…</option>
        {story.nodes.map((n) => <option key={n.id} value={n.id}>{n.id}</option>)}
      </select>
    </div>
  );
}

export function DebugPanel({ view, story, onReset, onGoto }: {
  view: GameView; story: Story; onReset: () => void; onGoto: (id: string) => void;
}) {
  return (
    <section aria-label="Debug panel" className="space-y-3 border-t border-stone-700 bg-stone-900 p-4 font-mono text-xs text-stone-200">
      <div className="flex gap-2">
        <button onClick={onReset} className="rounded border border-stone-600 px-2 py-1">Reset</button>
        <JumpToNode story={story} onGoto={onGoto} />
      </div>
      <StateInspector state={view.state} />
      <EventLog view={view} story={story} />
      <HiddenChoices view={view} />
      <EndingPreview view={view} story={story} />
      <LintStatus story={story} />
    </section>
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run DebugPanel`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/player/debug/DebugPanel.tsx src/player/debug/DebugPanel.test.tsx
git commit -m "feat: debug panel (state, events, hidden choices, ending preview, lint, reset, jump)"
```

---

### Task 9: App composition + final verification

**Files:**
- Modify: `src/player/App.tsx`
- Test: `src/player/App.test.tsx`

**Interfaces:**
- Consumes: `useGame` (Task 5), the player components (Task 6), `SaveSlots` (Task 7), `DebugPanel` (Task 8), `sampleStory` (Task 3).
- Produces: the composed `App`.

- [ ] **Step 1: Write the failing test `src/player/App.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('App', () => {
  it('plays the sample story from the start node', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'A Booth by the Window' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ask Mara what she heard' }));
    expect(screen.getByRole('heading', { name: 'Mara Leans In' })).toBeInTheDocument();
  });
  it('hides locked choices in the player but reveals them in the debug panel', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Ask Mara what she heard' }));
    expect(screen.queryByRole('button', { name: 'Press her for the details' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /debug/i }));
    expect(screen.getByText(/mara_trust gte 2/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run App`
Expected: FAIL — App is still the minimal shell (no scene heading / debug toggle).

- [ ] **Step 3: Write `src/player/App.tsx`**

```tsx
import { useState } from 'react';
import { useGame } from './useGame';
import { sampleStory } from '../content/sampleStory';
import { StatusBar } from './StatusBar';
import { SceneView } from './SceneView';
import { ChoiceList } from './ChoiceList';
import { EndingView } from './EndingView';
import { SaveSlots } from './saves/SaveSlots';
import { DebugPanel } from './debug/DebugPanel';

function locationName(id: string): string {
  return sampleStory.locations.find((l) => l.id === id)?.name ?? id;
}

export function App() {
  const game = useGame(sampleStory);
  const [showDebug, setShowDebug] = useState(false);
  const [showSaves, setShowSaves] = useState(false);
  const { view } = game;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <StatusBar timeLabel={view.timeLabel} location={locationName(view.location)} />
      <main className="pb-4">
        <SceneView node={view.node} timeLabel={view.timeLabel} />
        {view.endingReached
          ? <EndingView ending={view.endingReached} onReset={game.reset} />
          : <ChoiceList choices={view.choices} onChoose={game.choose} />}
      </main>
      <footer className="sticky bottom-0 flex gap-3 border-t border-stone-200 bg-stone-50/90 px-4 py-2 text-sm backdrop-blur">
        <button onClick={() => setShowDebug((s) => !s)}>⚙ debug</button>
        <button onClick={() => setShowSaves((s) => !s)}>💾 saves</button>
      </footer>
      {showSaves && (
        <SaveSlots
          storyId={sampleStory.id}
          makeSnapshot={game.snapshot}
          onRestore={game.restore}
          summary={`${view.timeLabel} · ${locationName(view.location)}`}
        />
      )}
      {showDebug && <DebugPanel view={view} story={sampleStory} onReset={game.reset} onGoto={game.gotoNode} />}
    </div>
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run App`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — engine (node) + all player tests (jsdom), nothing red.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Production build**

Run: `npm run build`
Expected: Vite build succeeds (no type/bundve errors), `dist/` produced.

- [ ] **Step 8: Manual dev smoke (optional but recommended)**

Run: `npm run dev`, open the URL on a narrow viewport. Confirm: the scene reads cleanly; taking choices advances the time in the status bar; reaching an ending shows the ending card; the debug drawer shows state/events/hidden-choices/ending-preview/lint and the reset + jump controls; saving a named slot then reloading the page and loading it restores state. Stop the server.

- [ ] **Step 9: Commit**

```bash
git add src/player/App.tsx src/player/App.test.tsx
git commit -m "feat: compose the web player (scene, choices, saves, debug)"
```

---

## Self-Review (completed during planning)

**Spec coverage:**
- §2 decision 1 (bundle sample story) → Task 3. ✓
- §2 decision 2 (hide locked choices; reasons in debug) → Task 6 `ChoiceList` (filters available) + Task 8 `HiddenChoices`; asserted in Task 9 test. ✓
- §2 decision 3 (inspector + reset + jump + lint + ending preview) → Task 8. ✓
- §2 decision 4 (named save slots) → Task 7. ✓
- §2 decision 5 (clean minimal mobile-first) → Tasks 6/9 Tailwind layout. ✓
- §2 (a) engine seam in the core → Task 1. ✓
- §2 (b) tiny demo story → Task 3 (verified lint-clean + two endings + hidden→revealed). ✓
- §3 architecture (engine source of truth, thin renderer, no UI logic dup) → Task 5 `useGame`; debug uses `resolveEnding`/`lintStory` not reimplementations. ✓
- §3 stack (Vite/React/TS/Tailwind v4), env split, scripts → Task 2. ✓
- §4 EngineSnapshot/restore/gotoNode signatures → Task 1. ✓
- §6 components (each one job) → Tasks 4–8. ✓
- §7 data flow + localStorage schema (`branchworld:saves:<storyId>`) → Tasks 5/7. ✓
- §8 error handling (try/catch storage, restore mismatch throw, only-available choices) → Tasks 7/1/6. ✓
- §9 testing (env split, engine seam, renderBody, UI behaviors, lint-clean story) → Tasks 1–9. ✓
- §10 sample story requirements (axes, lint clean, default ending, one-meaning vars) → Task 3. ✓
- §11 visual direction → Tasks 6/9. ✓
- §12 done-when → Task 9 Steps 5–8. ✓
- Out of scope (graph view, live state editing, real chapter, calibration) → not present; correctly deferred to C/D.

**Placeholder scan:** no TBD/TODO; every step has complete code/commands. ✓

**Type consistency:** `EngineSnapshot` shape identical in Tasks 1/5/7; `UseGame` members (`view/choose/reset/gotoNode/snapshot/restore`) consumed verbatim in Task 9; component prop types match their Task-6/7/8 definitions; `SaveSlot` identical in storage and SaveSlots; `sampleStory.id` (`sample_410`) used consistently. ✓

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-16-web-player.md`.
