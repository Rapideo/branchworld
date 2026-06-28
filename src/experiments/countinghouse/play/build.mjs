// Bundles the REAL GameRunner + countinghouse into one self-contained, double-clickable HTML.
// No engine re-implementation: esbuild bundles main.ts and all its imports (engine + container + content).
// Run: node src/experiments/countinghouse/play/build.mjs   (writes ./countinghouse.html)
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';

const result = await build({
  entryPoints: ['src/experiments/countinghouse/play/main.ts'],
  bundle: true,
  format: 'iife',
  target: 'es2019',
  write: false,
  loader: { '.ts': 'ts' },
});
const js = result.outputFiles[0].text;

const css = `
  :root { --bg:#08080a; --ink:#d2ccc0; --dim:#8b8478; --lead:#c79a52; --take:#7a9b6f; --line:#211f1c; }
  * { box-sizing:border-box; }
  html,body { margin:0; background:var(--bg); }
  body {
    color:var(--ink);
    font:18px/1.7 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif;
    background-image: radial-gradient(900px 500px at 50% -8%, rgba(199,154,82,.07), transparent 62%);
    min-height:100vh;
  }
  main { max-width:640px; margin:0 auto; padding:34px 22px 90px; }
  .status { display:flex; justify-content:space-between; align-items:baseline;
    border-bottom:1px solid var(--line); padding-bottom:8px; margin-bottom:14px;
    font-size:12px; letter-spacing:.18em; text-transform:uppercase; }
  .status .chapter { color:var(--dim); }
  .status .clock { color:var(--lead); }
  .meters { display:flex; gap:18px; margin-bottom:26px; }
  .meter { flex:1; display:flex; align-items:center; gap:8px; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--dim); }
  .meter-track { flex:1; height:5px; background:#16140f; border-radius:3px; overflow:hidden; }
  .meter-fill { display:block; height:100%; background:var(--lead); transition:width .35s ease; }
  .meter:nth-child(2) .meter-fill { background:var(--take); }
  .meter.low .meter-fill { background:#c9543f; }
  .node-title { font-weight:600; font-size:13px; letter-spacing:.14em; text-transform:uppercase; color:var(--dim); margin:0 0 12px; }
  .prose p { margin:0 0 1.05em; }
  .prose p:last-child { margin-bottom:0; }
  .choices { display:flex; flex-direction:column; gap:11px; margin-top:30px; }
  .choice {
    text-align:left; background:#100e0b; color:var(--ink); border:1px solid var(--line);
    border-radius:10px; padding:14px 16px; font:inherit; font-size:16px; cursor:pointer; transition:.14s;
  }
  .choice:hover { border-color:var(--lead); background:#15120c; transform:translateX(2px); }
  .ending { text-align:center; padding-top:24px; }
  .ending-kicker { color:var(--dim); font-size:12px; letter-spacing:.3em; text-transform:uppercase; margin-bottom:14px; }
  .ending-name { font-weight:600; font-size:30px; line-height:1.15; margin:0 0 26px; color:var(--lead); }
  .ending .prose { text-align:left; }
  .restart { margin-top:34px; background:transparent; color:var(--dim); border:1px solid var(--line);
    border-radius:10px; padding:11px 18px; font:inherit; font-size:14px; cursor:pointer; }
  .restart:hover { color:var(--ink); border-color:var(--lead); }
`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Countinghouse</title>
<style>${css}</style>
</head>
<body>
<main id="app"></main>
<script>${js}</script>
</body>
</html>`;

writeFileSync('countinghouse.html', html);
console.log('wrote countinghouse.html (' + Math.round(html.length / 1024) + ' KB)');
