import { GameRunner } from '../../sump-line/GameRunner';
import type { GameRunnerView } from '../../sump-line/types';
import { countinghouse } from '../content/countinghouse';

/** Replace the engine's {{time}} token with the rendered chapter clock (pure; unit-tested). */
export function substituteTime(text: string, timeLabel: string): string {
  return text.replace(/\{\{time\}\}/g, timeLabel);
}

function paragraphs(body: string, timeLabel: string): string {
  return substituteTime(body, timeLabel)
    .split('\n\n')
    .map((p) => `<p>${escapeHtml(p)}</p>`) // prose is plain text; escape then block it
    .join('');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function meter(label: string, value: unknown, max: number): string {
  const v = Math.max(0, Math.min(max, Number(value)));
  const pct = Math.round((v / max) * 100);
  const low = pct <= 25 ? ' low' : '';
  return `<div class="meter${low}"><span class="meter-label">${label}</span><span class="meter-track"><span class="meter-fill" style="width:${pct}%"></span></span></div>`;
}

/** Render the whole screen for a view (pure-ish HTML; choice ids are read back on click). */
export function renderView(view: GameRunnerView): string {
  if (view.gameOver && view.endingReached) {
    const e = view.endingReached;
    return `
      <div class="ending">
        <div class="ending-kicker">— an ending —</div>
        <h1 class="ending-name">${escapeHtml(e.name)}</h1>
        <div class="prose">${paragraphs(e.body ?? e.summary, view.timeLabel)}</div>
        <button class="restart" data-restart="1">Case it again</button>
      </div>`;
  }
  const lead = view.state.vars.lead;
  const loot = view.state.vars.loot;
  const choices = view.choices
    .filter((c) => c.available)
    .map((c) => `<button class="choice" data-choice="${c.id}">${escapeHtml(c.label)}</button>`)
    .join('');
  return `
    <div class="status">
      <span class="chapter">${escapeHtml(view.chapterTitle)}</span>
      <span class="clock">${escapeHtml(view.timeLabel)}</span>
    </div>
    <div class="meters">${meter('Lead', lead, 60)}${meter('The Take', loot, 4)}</div>
    <div class="scene">
      <h2 class="node-title">${escapeHtml(view.node.title)}</h2>
      <div class="prose">${paragraphs(view.node.body, view.timeLabel)}</div>
    </div>
    <div class="choices">${choices}</div>`;
}

function mount(root: HTMLElement): void {
  let runner = new GameRunner(countinghouse);
  const draw = () => {
    root.innerHTML = renderView(runner.view());
    root.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((b) =>
      b.addEventListener('click', () => {
        runner.choose(b.dataset.choice as string);
        draw();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }),
    );
    const restart = root.querySelector<HTMLButtonElement>('[data-restart]');
    if (restart) restart.addEventListener('click', () => { runner = new GameRunner(countinghouse); draw(); });
  };
  draw();
}

// Auto-mount in the browser (no-op under the node test runner, which imports the pure helpers only).
if (typeof document !== 'undefined') {
  const el = document.getElementById('app');
  if (el) mount(el);
}
