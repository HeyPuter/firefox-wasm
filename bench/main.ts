#!/usr/bin/env node
// Unified benchmark/harness runner for the wasm SpiderMonkey embed (bench/spidermonkey.js).
// Replaces the scattered embed-js/{run,octane-run,jittest-run}.cjs + *-driver.js + the
// realapp/ubo shell scripts: one entrypoint drives octane, JetStream2, ubo, the real-app
// (acorn/marked) diff, and raw jit-test passthrough, with JIT/PBL A/B + a bail survey.
//
//   node bench/main.ts <suite> [names...] [flags]
//
// suites:
//   octane    [name...]            default set; e.g. `octane richards splay`
//   jetstream [name...]            default set; e.g. `jetstream cdjs n-body`
//   ubo                            uBlock filter-compile (needs ROOT/ubo-bench)
//   realapp   [acorn|marked|all]   parse a real lib, DIFF jit-vs-pbl result
//   jittest   -- <args...>         forward argv verbatim to the embed (js-shell mode)
//   list                           list known bench names
//
// flags:
//   --pbl                 run with the JIT disabled (GECKO_NOWASMJIT=1) baseline
//   --ab                  run BOTH jit + pbl and print the ratio
//   --bails               capture the per-op "unsupported" bail survey (stderr)
//   --iters N  --warm N   JetStream/realapp iteration counts (default 30 / 3)
//   --gczeal N            set GECKO_GCZEAL=N   --nursery-mb N -> GECKO_NURSERY_MB=N
//   --timeout S           per-run timeout seconds (default 180)
//   any GECKO_* in the environment is forwarded to the embed's getenv.
//
// Run benches CLEAN/SERIAL: every bench runs in its own `node __exec` child (fresh
// embed instance), so a crash/leak in one cannot perturb another.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const BENCH = path.dirname(SELF);
const ROOT = path.resolve(BENCH, '..');
const EMBED = path.join(BENCH, 'spidermonkey.js', 'build', 'embed.js');
const OCTANE = path.join(BENCH, 'octane');
const JETSTREAM = path.join(BENCH, 'jetstream');
const REALAPP = path.join(BENCH, 'realapp');
const UBO = path.join(BENCH, 'ubo');

// ---------------------------------------------------------------------------
// Child mode: load the embed, run the given JS files in one VM, exit.
// ---------------------------------------------------------------------------
if (process.argv[2] === '__exec') {
  const require = createRequire(import.meta.url);
  const createEmbed = require(EMBED);
  const files = process.argv.slice(3).map((a) => path.resolve(a));
  const env = { ...process.env };
  createEmbed({
    noInitialRun: true,
    ENV: env,
    preRun: [(m: any) => { try { Object.assign(m.ENV, env); } catch {} }],
    print: (s: string) => console.log(s),
    printErr: (s: string) => console.error(s),
  }).then((M: any) => {
    let rc = 0;
    try { rc = M.callMain(files); } catch (e: any) {
      console.error('[main __exec] callMain threw:', e?.message ?? e);
      rc = 1;
    }
    process.exit(rc || 0);
  });
}

// ---------------------------------------------------------------------------
// Bench tables
// ---------------------------------------------------------------------------
const OCT: Record<string, string[]> = {
  richards: ['richards.js'], deltablue: ['deltablue.js'], crypto: ['crypto.js'],
  raytrace: ['raytrace.js'], earley: ['earley-boyer.js'], splay: ['splay.js'],
  navier: ['navier-stokes.js'], regexp: ['regexp.js'], mandreel: ['mandreel.js'],
  pdfjs: ['pdfjs.js'], codeload: ['code-load.js'], box2d: ['box2d.js'],
  gbemu: ['gbemu-part1.js', 'gbemu-part2.js'],
  zlib: ['zlib-data.js', 'zlib.js'],
  typescript: ['typescript-compiler.js', 'typescript-input.js', 'typescript.js'],
};
const OCT_DEFAULT = ['richards', 'deltablue', 'crypto', 'raytrace', 'earley',
  'splay', 'navier', 'regexp', 'pdfjs', 'gbemu', 'box2d'];

// JetStream bench files are <name>.js in bench/jetstream/.
const JS_DEFAULT = ['n-body', '3d-raytrace', 'cdjs', 'crypto-aes', 'crypto-sha1',
  'hash-map', 'date-format-tofte'];

// ---------------------------------------------------------------------------
// Run one embed child; return stdout/stderr/code.
// ---------------------------------------------------------------------------
type Run = { out: string; err: string; code: number | null };
function runEmbed(files: string[], opts: { env?: Record<string, string>; cwd?: string; timeoutS?: number } = {}): Run {
  const env = { ...process.env, ...(opts.env ?? {}) };
  const r = spawnSync(process.execPath,
    ['--no-liftoff', '--stack-size=8000', SELF, '__exec', ...files],
    { encoding: 'utf8', env, cwd: opts.cwd ?? ROOT, timeout: (opts.timeoutS ?? 180) * 1000, maxBuffer: 256 * 1024 * 1024 });
  return { out: r.stdout ?? '', err: r.stderr ?? '', code: r.status };
}

const grab = (s: string, re: RegExp): string | null => { const m = s.match(re); return m ? m[1] : null; };

function bailSurvey(err: string): string {
  const counts: Record<string, number> = {};
  for (const m of err.matchAll(/unsupported (?:value|effect) op#\d+ (\w+)/g)) counts[m[1]] = (counts[m[1]] ?? 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return top.length ? top.map(([k, v]) => `${k}x${v}`).join(' ') : '-';
}

// CLI flag parsing -----------------------------------------------------------
function parseFlags(argv: string[]) {
  const f = { pbl: false, ab: false, bails: false, iters: 30, warm: 3, timeoutS: 180,
    gczeal: '', nurseryMb: '', rest: [] as string[] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pbl') f.pbl = true;
    else if (a === '--ab') f.ab = true;
    else if (a === '--bails') f.bails = true;
    else if (a === '--iters') f.iters = +argv[++i];
    else if (a === '--warm') f.warm = +argv[++i];
    else if (a === '--timeout') f.timeoutS = +argv[++i];
    else if (a === '--gczeal') f.gczeal = argv[++i];
    else if (a === '--nursery-mb') f.nurseryMb = argv[++i];
    else f.rest.push(a);
  }
  return f;
}
function baseEnv(f: ReturnType<typeof parseFlags>, pbl: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  if (pbl) e.GECKO_NOWASMJIT = '1';
  if (f.gczeal) e.GECKO_GCZEAL = f.gczeal;
  if (f.nurseryMb) e.GECKO_NURSERY_MB = f.nurseryMb;
  return e;
}

// Write a tiny JS prelude file (JetStream/realapp iteration globals); cached in os.tmpdir.
function preludeFile(iters: number, warm: number): string {
  const p = path.join(os.tmpdir(), `bench_iters_${iters}_${warm}.js`);
  fs.writeFileSync(p, `globalThis.JS_ITERS=${iters}; globalThis.JS_WARM=${warm};\n`);
  return p;
}

// ---------------------------------------------------------------------------
// Suite runners
// ---------------------------------------------------------------------------
function octaneFiles(name: string): string[] | null {
  const benches = OCT[name];
  if (!benches) return null;
  return [path.join(OCTANE, 'base.js'), ...benches.map((b) => path.join(OCTANE, b)),
    path.join(OCTANE, 'octane-driver.js')];
}

function runOctane(names: string[], f: ReturnType<typeof parseFlags>) {
  const list = names.length ? names : OCT_DEFAULT;
  console.log('# octane (OCTSCORE, higher=better)' + (f.ab ? '  [jit / pbl = ratio]' : f.pbl ? '  [PBL]' : '  [JIT]'));
  for (const name of list) {
    const files = octaneFiles(name);
    if (!files) { console.log(pad(name) + 'UNKNOWN (try: list)'); continue; }
    const doRun = (pbl: boolean): { score: number | null; err: string | null; raw: Run } => {
      const r = runEmbed(files, { env: baseEnv(f, pbl), timeoutS: f.timeoutS });
      const err = grab(r.out, /ERR=(\S+)/) ?? (r.code ? `exit${r.code}` : null);
      const sc = grab(r.out, /OCTSCORE=(\d+)/);
      return { score: sc ? +sc : null, err: err && !sc ? err : null, raw: r };
    };
    if (f.ab) {
      const j = doRun(false), p = doRun(true);
      const ratio = j.score && p.score ? (j.score / p.score).toFixed(2) + 'x' : 'n/a';
      console.log(pad(name) + `jit=${j.score ?? j.err}  pbl=${p.score ?? p.err}  => ${ratio}`
        + (f.bails ? `   bails: ${bailSurvey(j.raw.err)}` : ''));
    } else {
      const x = doRun(f.pbl);
      console.log(pad(name) + (x.score ?? `ERR ${x.err}`) + (f.bails ? `   bails: ${bailSurvey(x.raw.err)}` : ''));
    }
  }
}

function runJetstream(names: string[], f: ReturnType<typeof parseFlags>) {
  const list = names.length ? names : JS_DEFAULT;
  const prelude = preludeFile(f.iters, f.warm);
  console.log(`# jetstream (perIter ms, lower=better; iters=${f.iters} warm=${f.warm})`
    + (f.ab ? '  [pbl/jit ratio]' : f.pbl ? '  [PBL]' : '  [JIT]'));
  for (const name of list) {
    const bench = path.join(JETSTREAM, `${name}.js`);
    if (!fs.existsSync(bench)) { console.log(pad(name) + 'UNKNOWN'); continue; }
    const files = [prelude, bench, path.join(JETSTREAM, 'jetstream-driver.js')];
    const doRun = (pbl: boolean) => {
      const r = runEmbed(files, { env: baseEnv(f, pbl), timeoutS: f.timeoutS });
      const per = grab(r.out, /perIter=([\d.]+)/);
      const err = /\bERR=/.test(r.out) ? (grab(r.out, /ERR=(\S+)/) ?? 'err') : (r.code ? `exit${r.code}` : null);
      const ok = /\bOK\b/.test(r.out);
      return { per: per ? +per : null, ok, err: !per ? (err ?? 'no-result') : null, raw: r };
    };
    if (f.ab) {
      const j = doRun(false), p = doRun(true);
      const ratio = j.per && p.per ? (p.per / j.per).toFixed(2) + 'x' : 'n/a';
      console.log(pad(name) + `jit=${j.per ?? j.err}ms  pbl=${p.per ?? p.err}ms  => ${ratio}`
        + (f.bails ? `   bails: ${bailSurvey(j.raw.err)}` : ''));
    } else {
      const x = doRun(f.pbl);
      console.log(pad(name) + (x.per != null ? `${x.per}ms ${x.ok ? 'OK' : ''}` : `ERR ${x.err}`)
        + (f.bails ? `   bails: ${bailSurvey(x.raw.err)}` : ''));
    }
  }
}

function runUbo(f: ReturnType<typeof parseFlags>) {
  const files = [path.join(UBO, 'ubo-run.js')];
  console.log('# ubo (total ms, lower=better)' + (f.ab ? '  [pbl/jit ratio]' : f.pbl ? '  [PBL]' : '  [JIT]'));
  const doRun = (pbl: boolean) => {
    const r = runEmbed(files, { env: baseEnv(f, pbl), cwd: ROOT, timeoutS: Math.max(f.timeoutS, 300) });
    const ms = grab(r.out, /UBOTOTALMS=([\d.]+)/);
    const correct = /net 64250/.test(r.out);
    return { ms: ms ? +ms : null, correct, raw: r };
  };
  if (f.ab) {
    const j = doRun(false), p = doRun(true);
    const ratio = j.ms && p.ms ? (p.ms / j.ms).toFixed(2) + 'x' : 'n/a';
    console.log(pad('ubo') + `jit=${j.ms ?? 'ERR'}ms${j.correct ? '' : '!'}  pbl=${p.ms ?? 'ERR'}ms  => ${ratio}`
      + (f.bails ? `   bails: ${bailSurvey(j.raw.err)}` : ''));
  } else {
    const x = doRun(f.pbl);
    console.log(pad('ubo') + (x.ms != null ? `${x.ms}ms ${x.correct ? 'OK' : 'WRONG'}` : 'ERR')
      + (f.bails ? `   bails: ${bailSurvey(x.raw.err)}` : ''));
  }
}

function runRealapp(which: string, f: ReturnType<typeof parseFlags>) {
  const prelude = preludeFile(f.iters, f.warm);
  const apps: Record<string, { lib: string; bench: string; tag: string }> = {
    acorn: { lib: 'acorn.js', bench: 'acorn-bench.js', tag: 'NODES' },
    marked: { lib: 'marked.min.js', bench: 'marked-bench.js', tag: 'HTMLLEN' },
  };
  const names = which === 'all' || !which ? ['acorn', 'marked'] : [which];
  console.log('# realapp (DIFF jit-vs-pbl result; perIter ms)');
  for (const n of names) {
    const a = apps[n]; if (!a) { console.log(pad(n) + 'UNKNOWN'); continue; }
    const files = [prelude, path.join(REALAPP, a.lib), path.join(REALAPP, a.bench),
      path.join(JETSTREAM, 'jetstream-driver.js')];
    const re = new RegExp(a.tag + '=(\\d+)');
    const pbl = runEmbed(files, { env: baseEnv(f, true), timeoutS: f.timeoutS });
    const jit = runEmbed(files, { env: baseEnv(f, false), timeoutS: f.timeoutS });
    const ps = grab(pbl.out, re), jsv = grab(jit.out, re);
    const pm = grab(pbl.out, /perIter=([\d.]+)/), jm = grab(jit.out, /perIter=([\d.]+)/);
    let verdict = 'OK';
    if (/\bERR=/.test(jit.out) || jsv == null) verdict = '*** JIT-ERR ' + (grab(jit.out, /ERR=(\S+)/) ?? '');
    else if (ps !== jsv) verdict = `*** MISMATCH pbl=${ps} jit=${jsv}`;
    console.log(pad(n) + `pbl[${a.tag}=${ps} ${pm}ms] jit[${a.tag}=${jsv} ${jm}ms] => ${verdict}`
      + (f.bails ? `   bails: ${bailSurvey(jit.err)}` : ''));
  }
}

function runJittest(rest: string[], f: ReturnType<typeof parseFlags>) {
  // Forward argv verbatim to the embed (js-shell mode: -e/-f/absolute paths).
  const i = rest.indexOf('--');
  const args = i >= 0 ? rest.slice(i + 1) : rest;
  const env = { ...process.env, ...baseEnv(f, f.pbl) };
  const r = spawnSync(process.execPath, ['--no-liftoff', '--stack-size=8000', SELF, '__exec', ...args],
    { encoding: 'utf8', env, cwd: ROOT, stdio: 'inherit', timeout: f.timeoutS * 1000 });
  process.exit(r.status ?? 0);
}

const pad = (s: string) => (s + ' ').padEnd(16, '.') + ' ';

function main() {
  const [suite, ...argv] = process.argv.slice(2);
  const f = parseFlags(argv);
  switch (suite) {
    case 'octane': return runOctane(f.rest, f);
    case 'jetstream': case 'js': return runJetstream(f.rest, f);
    case 'ubo': return runUbo(f);
    case 'realapp': return runRealapp(f.rest[0] ?? 'all', f);
    case 'jittest': return runJittest(f.rest, f);
    case 'list':
      console.log('octane:    ' + Object.keys(OCT).join(' '));
      console.log('jetstream: ' + fs.readdirSync(JETSTREAM).filter((x) => x.endsWith('.js') && x !== 'jetstream-driver.js').map((x) => x.slice(0, -3)).join(' '));
      console.log('realapp:   acorn marked');
      return;
    default:
      console.error('usage: node bench/main.ts <octane|jetstream|ubo|realapp|jittest|list> [names...] [--pbl|--ab|--bails|--iters N|--warm N|--gczeal N|--nursery-mb N]');
      process.exit(2);
  }
}

// Entry dispatch runs last so the const bench-tables above are initialized first
// (function decls hoist; const/let stay in the temporal dead zone until evaluated).
if (process.argv[2] !== '__exec') main();
