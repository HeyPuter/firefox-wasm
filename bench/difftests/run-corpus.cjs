#!/usr/bin/env node
// Regression gate for the stability differential corpus: runs each standalone sample
// (bench/difftests/NN-*.js) and each real-app driver (real/drv-*.js + its lib) under the
// wasm JIT and under PBL (GECKO_NOWASMJIT=1), comparing the printed `checksum=`/`FZ=` line.
// A divergence (different checksum) or a JIT-only crash (empty JIT while PBL prints) = FAIL.
//   node bench/difftests/run-corpus.cjs [--gczeal 7,1] [--only NN]
// Exits non-zero on any FAIL. This is the campaign's one-command "is the JIT still correct?"
// check -- protects the shipped fixes (double-mod, ROOTLIVE same-block) + the clean surface.
const cp = require('child_process'), fs = require('fs'), path = require('path');
const DIR = __dirname, ROOT = path.resolve(DIR, '..', '..'), MAIN = path.join(ROOT, 'bench', 'main.ts');
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const ZEAL = flag('--gczeal'), ONLY = flag('--only'), TIMEOUT = 240000;
// real-app drivers -> their prepended lib file(s), relative to DIR/real
const REAL = {
  'drv-acorn.js':  ['../../realapp/acorn.js'],
  'drv-marked.js': ['../../realapp/marked.min.js'],
  'drv-crypto.js': ['lib-crypto.js'],
  'drv-lodash.js': ['lodash.min.js'],
  'drv-big.js':    ['big.min.js'],
  'drv-dayjs.js':  ['dayjs.min.js'],
  'app-interpreter.js': [], 'app-datapipeline.js': [], 'app-pathfind.js': [], 'app-vm.js': [],
};
function run(files, pbl) {
  const env = Object.assign({}, process.env);
  if (pbl) env.GECKO_NOWASMJIT = '1'; else delete env.GECKO_NOWASMJIT;
  if (ZEAL) { env.GECKO_GCZEAL = ZEAL; env.GECKO_NURSERY_MB = '1'; }
  const r = cp.spawnSync('node', ['--no-liftoff', '--stack-size=8000', MAIN, '__exec', ...files],
    { env, timeout: TIMEOUT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const all = (r.stdout || '') + (r.stderr || '');
  const m = all.match(/(?:checksum[=:] ?|FZ=)(-?\d+)/);
  return { cs: m ? m[1] : null, trap: /out of bounds|unreachable|callMain threw|wj-crashstate|Test262Error/.test(all), to: r.error && r.error.code === 'ETIMEDOUT' };
}
// gather cases
const cases = [];
for (const f of fs.readdirSync(DIR).sort()) {
  if (/^\d\d-.*\.js$/.test(f)) { if (!ONLY || f.startsWith(ONLY)) cases.push({ name: f, files: [path.join(DIR, f)] }); }
}
const realDir = path.join(DIR, 'real');
if (fs.existsSync(realDir)) for (const drv of Object.keys(REAL)) {
  if (ONLY && !drv.includes(ONLY)) continue;
  const p = path.join(realDir, drv); if (!fs.existsSync(p)) continue;
  const libs = REAL[drv].map(l => path.join(realDir, l)).filter(fs.existsSync);
  cases.push({ name: 'real/' + drv, files: [...libs, p] });
}
let pass = 0, fail = 0; const fails = [];
for (const c of cases) {
  const p = run(c.files, true);
  if (p.cs === null) { console.log(`SKIP ${c.name} (PBL no output: to=${p.to} trap=${p.trap})`); continue; }
  const j = run(c.files, false);
  if (j.cs === null) { fail++; fails.push(c.name + ` [JIT ${j.trap ? 'CRASH' : (j.to ? 'timeout' : 'no-output')}, PBL=${p.cs}]`); console.log(`*** FAIL ${c.name}: JIT ${j.trap ? 'CRASH' : 'no-output'} PBL=${p.cs}`); continue; }
  if (j.cs !== p.cs) { fail++; fails.push(c.name + ` [JIT=${j.cs} PBL=${p.cs}]`); console.log(`*** FAIL ${c.name}: JIT=${j.cs} PBL=${p.cs}`); }
  else { pass++; console.log(`OK   ${c.name}  ${j.cs}`); }
}
console.log(`\nCORPUS ${ZEAL ? '(gczeal ' + ZEAL + ') ' : ''}pass=${pass} fail=${fail}`);
if (fail) { console.log('FAILURES:\n  ' + fails.join('\n  ')); process.exit(1); }
