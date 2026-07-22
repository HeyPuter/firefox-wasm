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
const MICRO = path.join(BENCH, 'microbenches');
const DISAS = path.join(BENCH, 'disas');
const WASMDIR = path.join(BENCH, 'wasm');
const EMSDK = process.env.EMSDK || '/home/claude/emsdk';
const WASM_DIS = [path.join(EMSDK, 'upstream', 'bin', 'wasm-dis'), 'wasm-dis']
  .find((p) => p === 'wasm-dis' || fs.existsSync(p)) ?? 'wasm-dis';

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
      // A wasm trap's stack names the wasm frames; a trap inside a JIT'd module
      // is attributable (the module's fns are compiled per JS function).
      if (e?.stack) console.error(String(e.stack).split('\n').slice(0, 25).join('\n'));
      // Post-trap forensics: last helper kind/site + runtime state (the trap kills
      // the wasm stack but the module memory survives).
      try { M._WJDumpCrashState?.(); } catch {}
      rc = 1;
    }
    process.exit(rc || 0);
  });
} else if (process.argv[2] === '__jsshell') {
  // js-shell mode: forward argv VERBATIM (no path resolution) — jit_test.py passes
  // -e/-f flags, --thread-count, and absolute test paths that embed.cpp parses itself.
  const require = createRequire(import.meta.url);
  const createEmbed = require(EMBED);
  const args = process.argv.slice(3);
  const env = { ...process.env };
  createEmbed({
    noInitialRun: true, ENV: env,
    preRun: [(m: any) => { try { Object.assign(m.ENV, env); } catch {} }],
    print: (s: string) => console.log(s), printErr: (s: string) => console.error(s),
  }).then((M: any) => {
    let rc = 0;
    try { rc = M.callMain(args); } catch (e: any) { console.error('[main __jsshell] threw:', e?.message ?? e); rc = 1; }
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
  // WJ_ECHO=1 forwards the child's stderr (JIT debug dumps: GECKO_WJWARP_DUMP,
  // GECKO_WJ_SITEHIST, etc.) to this process so it's visible; otherwise it's
  // captured for parsing only (e.g. --bails -> bailSurvey).
  if (process.env.WJ_ECHO) process.stderr.write(r.stderr ?? '');
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

function runMicro(names: string[], f: ReturnType<typeof parseFlags>) {
  const all = fs.readdirSync(MICRO).filter((x) => x.endsWith('.js') && x !== 'micro-driver.js').map((x) => x.slice(0, -3)).sort();
  const list = names.length ? names : all;
  const prelude = preludeFile(f.iters, f.warm);
  const driver = path.join(MICRO, 'micro-driver.js');
  console.log(`# microbenches (perIter ms, lower=better; iters=${f.iters} warm=${f.warm})`
    + (f.ab ? '  [pbl/jit ratio + sum diff]' : f.pbl ? '  [PBL]' : '  [JIT]'));
  for (const name of list) {
    const bench = path.join(MICRO, `${name}.js`);
    if (!fs.existsSync(bench)) { console.log(pad(name) + 'UNKNOWN'); continue; }
    const files = [prelude, bench, driver];
    const doRun = (pbl: boolean) => {
      const r = runEmbed(files, { env: baseEnv(f, pbl), timeoutS: f.timeoutS });
      return { per: grab(r.out, /perIter=([\d.]+)/), sum: grab(r.out, /MICROSUM=(-?\d+)/),
        err: /\bERR=/.test(r.out) ? (grab(r.out, /ERR=(\S+)/) ?? 'err') : (r.code ? `exit${r.code}` : null), raw: r };
    };
    if (f.ab) {
      const j = doRun(false), p = doRun(true);
      const ratio = j.per && p.per ? (+p.per / +j.per).toFixed(2) + 'x' : 'n/a';
      const diff = j.sum != null && p.sum != null ? (j.sum === p.sum ? 'OK' : `*** MISMATCH jit=${j.sum} pbl=${p.sum}`) : '?';
      console.log(pad(name) + `jit=${j.per ?? j.err}ms  pbl=${p.per ?? p.err}ms  => ${ratio}  ${diff}`
        + (f.bails ? `   bails: ${bailSurvey(j.raw.err)}` : ''));
    } else {
      const x = doRun(f.pbl);
      console.log(pad(name) + (x.per != null ? `${x.per}ms  sum=${x.sum}` : `ERR ${x.err}`)
        + (f.bails ? `   bails: ${bailSurvey(x.raw.err)}` : ''));
    }
  }
}

function runUbo(f: ReturnType<typeof parseFlags>) {
  const files = [path.join(UBO, 'ubo-run.js')];
  console.log('# ubo (total ms, lower=better)' + (f.ab ? '  [pbl/jit ratio]' : f.pbl ? '  [PBL]' : '  [JIT]'));
  const doRun = (pbl: boolean) => {
    // ubo-run.js load()/read() the bundle + filter lists relative to bench/ubo.
    const r = runEmbed(files, { env: baseEnv(f, pbl), cwd: UBO, timeoutS: Math.max(f.timeoutS, 300) });
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

// In-process wasm interpreter (GECKO_WASM_INTERP) test suite. Each bench/wasm/*.cjs is a
// standalone node harness that builds wasm (wat2wasm/wasm-as, emcc, rustc) and runs it
// through the embed; it self-reports and exits nonzero on failure.
function runWasm(names: string[], f: ReturnType<typeof parseFlags>) {
  const all = ['difftest', 'atomictest', 'tramptest', 'emtest', 'rusttest'];
  const list = names.length ? names : all;
  const env = { ...process.env, EMSDK, EM_CONFIG: path.join(ROOT, 'em_config') };
  console.log('# wasm interpreter tests (GECKO_WASM_INTERP)');
  let pass = 0, fail = 0;
  for (const n of list) {
    const file = path.join(WASMDIR, `${n}.cjs`);
    if (!fs.existsSync(file)) { console.log(pad(n) + 'UNKNOWN'); continue; }
    const r = spawnSync(process.execPath, [file], { encoding: 'utf8', env, cwd: ROOT,
      timeout: Math.max(f.timeoutS, 300) * 1000, maxBuffer: 64 * 1024 * 1024 });
    const out = (r.stdout ?? '') + (r.stderr ?? '');
    const summary = (out.match(/(\d+\/\d+[^\n]*passed)/) || out.match(/\b(SKIP[^\n]*)/) || [, ''])[1];
    const ok = r.status === 0;
    console.log(pad(n) + (ok ? 'ok' : 'FAIL') + (summary ? `  ${summary}` : ''));
    if (ok) pass++; else { fail++; if (f.bails) console.log(out.split('\n').slice(-8).map((l) => '    ' + l).join('\n')); }
  }
  console.log(`# ${pass} ok, ${fail} failed`);
  if (fail) process.exit(1);
}

// Web Tooling Benchmark (v8/web-tooling-benchmark): real dev tools (acorn, babel,
// typescript, prettier, terser, ...) running their actual code. dist/cli.js is a
// self-contained JS-shell bundle; intl-shim.js stubs Intl (embed is --without-intl-api),
// and a `var ONLY="<tool>"` prelude restricts to one tool. NOTE: runs under PBL (--pbl);
// under JIT it currently hits a miscompile (unreachable trap) in a bundle-init function.
const WT = path.join(BENCH, 'webtooling');
function runWebtooling(names: string[], f: ReturnType<typeof parseFlags>) {
  const files = [path.join(WT, 'intl-shim.js')];
  const only = names[0];
  if (only) { const p = path.join(os.tmpdir(), `wtb_only_${only}.js`); fs.writeFileSync(p, `var ONLY=${JSON.stringify(only)};\n`); files.push(p); }
  files.push(path.join(WT, 'cli.js'));
  console.log('# web tooling benchmark (runs/s, higher=better)' + (f.pbl ? '  [PBL]' : '  [JIT]') + (only ? `  only=${only}` : ''));
  const r = runEmbed(files, { env: baseEnv(f, f.pbl), timeoutS: Math.max(f.timeoutS, 900) });
  const lines = r.out.split('\n').filter((l) => /runs\/s|Geometric mean|Running/.test(l));
  console.log(lines.join('\n'));
  // A run with no score line is a SILENT failure (validation fail / child crash);
  // surface the child's exit code + stderr tail automatically so the flake
  // self-diagnoses instead of hiding behind WJ_ECHO (see task #58).
  if (!lines.some((l) => l.includes('runs/s'))) {
    const errTail = r.err.trim().split('\n').slice(-32).join('\n  ');
    console.log(`(NO SCORE) child exit=${r.code}${/unreachable/.test(r.err) ? ' — unreachable trap (JIT miscompile?)' : ''}`);
    console.log(`stdout tail: ${JSON.stringify(r.out.trim().split('\n').slice(-4).join(' | '))}`);
    if (errTail) console.log(`stderr tail:\n  ${errTail}`);
  }
}

const JITTEST = path.join(BENCH, 'jittest');
function runJittest(rest: string[], f: ReturnType<typeof parseFlags>) {
  // Run SpiderMonkey's own jit-test suite against the wasm embed: jit_test.py drives
  // bench/jittest/jsshell (-> node main.ts __jsshell ...). Validates BOTH correctness
  // (expected pass/throw) AND stay-in-JIT (`do{f()}while(!inWasmJit())` warmups only
  // finish once f is wasm-JIT-compiled). Pass test filters as names (e.g. `arguments`,
  // `ion/dce`); none = the whole suite (slow). Honors WJ_TIMEOUT / WJ_JOBS, GECKO_* env.
  const py = path.join(ROOT, 'firefox', 'js', 'src', 'jit-test', 'jit_test.py');
  if (!fs.existsSync(py)) { console.error('jit_test.py not found at ' + py); process.exit(2); }
  const args = [py, '-t', process.env.WJ_TIMEOUT ?? '40', '-j', process.env.WJ_JOBS ?? '8',
    '--no-progress', '--exclude-from', path.join(JITTEST, 'jit-test-exclude.txt'),
    path.join(JITTEST, 'jsshell'), ...rest];
  const env = { ...process.env, ...baseEnv(f, f.pbl), EMSDK, EM_CONFIG: path.join(ROOT, 'em_config') };
  const r = spawnSync('python3', args, { encoding: 'utf8', env, cwd: ROOT, stdio: 'inherit',
    timeout: Math.max(f.timeoutS, 3600) * 1000 });
  process.exit(r.status ?? 0);
}

const pad = (s: string) => (s + ' ').padEnd(16, '.') + ' ';

// ---------------------------------------------------------------------------
// Disassembler: dump the wasm the JIT emitted for ONE function and show its WAT.
// GECKO_WJ_WASMDUMP=<line> writes /tmp/wbjit_<line>.wasm at compile time (no
// runtime perturbation); wasm-dis turns it into WAT. The function must get hot
// (call-count trigger), so the driven JS must call it many times.
// ---------------------------------------------------------------------------
function findFnLine(src: string, name: string): number {
  const lines = src.split('\n');
  const pats = [
    new RegExp(`\\bfunction\\s+${name}\\b`),
    new RegExp(`\\b${name}\\s*[:=]\\s*function\\b`),
    new RegExp(`\\b${name}\\s*\\([^)]*\\)\\s*\\{`),     // method / shorthand
    new RegExp(`\\b${name}\\s*=\\s*\\(?[^)]*\\)?\\s*=>`), // arrow
  ];
  for (let i = 0; i < lines.length; i++) for (const p of pats) if (p.test(lines[i])) return i + 1;
  return -1;
}
function watDis(wasmPath: string): string {
  const r = spawnSync(WASM_DIS, [wasmPath], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return r.stdout ?? '';
}
// Run jsFile so the fn at `line` JIT-compiles, return its WAT ('' if it never compiled).
function dumpFnWat(jsFile: string, line: number, env: Record<string, string> = {}, timeoutS = 120): { wat: string; out: string } {
  const out = `/tmp/wbjit_${line}.wasm`;
  try { fs.rmSync(out, { force: true }); } catch {}
  const r = runEmbed([jsFile], { env: { ...env, GECKO_WJ_WASMDUMP: String(line) }, timeoutS });
  return { wat: fs.existsSync(out) ? watDis(out) : '', out: r.out + r.err };
}

function runDisas(rest: string[], f: ReturnType<typeof parseFlags>) {
  const jsFile = rest.find((a) => a.endsWith('.js'));
  if (!jsFile) { console.error('usage: node bench/main.ts disas <file.js> [--fn name | --line N] [--grep pat]'); process.exit(2); }
  const abs = path.resolve(jsFile);
  const src = fs.readFileSync(abs, 'utf8');
  const fnIdx = rest.indexOf('--fn'); const lineIdx = rest.indexOf('--line'); const grepIdx = rest.indexOf('--grep');
  let line = lineIdx >= 0 ? +rest[lineIdx + 1] : -1;
  if (line < 0 && fnIdx >= 0) { line = findFnLine(src, rest[fnIdx + 1]); if (line < 0) { console.error(`fn '${rest[fnIdx + 1]}' not found in ${jsFile}`); process.exit(2); } }
  if (line < 0) line = 1; // dump-all fallback
  const { wat, out } = dumpFnWat(abs, line, baseEnv(f, f.pbl), f.timeoutS);
  if (!wat) { console.error(`no wasm dumped for line ${line} (fn never compiled? bailed? not hot enough?)\n--- embed output tail ---\n${out.split('\n').slice(-12).join('\n')}`); process.exit(1); }
  const grep = grepIdx >= 0 ? new RegExp(rest[grepIdx + 1]) : null;
  const lines = wat.split('\n');
  console.log(`# WAT for fn@line ${line} of ${path.basename(jsFile)} (${lines.length} lines)`);
  console.log((grep ? lines.filter((l) => grep.test(l)) : lines).join('\n'));
}

// ---------------------------------------------------------------------------
// Codegen tests (FileCheck-style). Each bench/disas/<name>.js has leading
// directives + a body that drives one function hot:
//   // FN: <name>                 the function to disassemble (required)
//   // CHECK: <regex>             WAT must contain (in order)
//   // CHECK-NOT: <regex>         WAT must NOT contain
//   // CHECK-COUNT-<N>: <regex>   exactly N matches
//   // CHECK-COMPILES            assert the fn compiled at all
// ---------------------------------------------------------------------------
function runDisasTest(names: string[], f: ReturnType<typeof parseFlags>) {
  const all = fs.existsSync(DISAS) ? fs.readdirSync(DISAS).filter((x) => x.endsWith('.js')).map((x) => x.slice(0, -3)).sort() : [];
  const list = names.length ? names : all;
  console.log('# disas codegen tests');
  let pass = 0, fail = 0;
  for (const name of list) {
    const file = path.join(DISAS, `${name}.js`);
    if (!fs.existsSync(file)) { console.log(pad(name) + 'UNKNOWN'); fail++; continue; }
    const src = fs.readFileSync(file, 'utf8');
    const dir = (re: RegExp) => [...src.matchAll(new RegExp(re.source, 'g'))].map((m) => m[1].trim());
    const fnName = dir(/\/\/\s*FN:\s*(.+)/)[0];
    if (!fnName) { console.log(pad(name) + 'NO FN: directive'); fail++; continue; }
    const line = findFnLine(src, fnName);
    if (line < 0) { console.log(pad(name) + `fn '${fnName}' not found`); fail++; continue; }
    const { wat, out } = dumpFnWat(file, line, baseEnv(f, false), f.timeoutS);
    const fails: string[] = [];
    const compiles = src.includes('CHECK-COMPILES') || true;
    if (!wat) { console.log(pad(name) + `FAIL (fn '${fnName}'@${line} did not compile)` + (f.bails ? `  ${out.split('\n').slice(-3).join(' ')}` : '')); fail++; continue; }
    for (const c of dir(/\/\/\s*CHECK:\s*(.+)/)) if (!new RegExp(c).test(wat)) fails.push(`CHECK miss: /${c}/`);
    for (const c of dir(/\/\/\s*CHECK-NOT:\s*(.+)/)) if (new RegExp(c).test(wat)) fails.push(`CHECK-NOT hit: /${c}/`);
    for (const m of src.matchAll(/\/\/\s*CHECK-COUNT-(\d+):\s*(.+)/g)) {
      const want = +m[1], re = new RegExp(m[2].trim(), 'g'); const got = (wat.match(re) ?? []).length;
      if (got !== want) fails.push(`CHECK-COUNT-${want} got ${got}: /${m[2].trim()}/`);
    }
    if (fails.length) { console.log(pad(name) + 'FAIL  ' + fails.join('; ')); fail++; }
    else { console.log(pad(name) + `ok (${wat.split('\n').length} WAT lines)`); pass++; }
  }
  console.log(`# ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

// diffcheck <file.js>: differential JIT-vs-PBL execution of one script.
// 1) result diff: whole-script output under JIT vs GECKO_NOWASMJIT.
// 2) per-call diff: re-run with GECKO_WJ_VERIFY (return values re-executed in the
//    interpreter) + GECKO_WJ_VERIFYMUT (this/arg slot + dense-element side effects),
//    reporting each [wb-VERIFY] MISMATCH with fn/line. Exit 1 on any divergence.
function runDiffcheck(rest: string[], f: ReturnType<typeof parseFlags>) {
  const files = rest.filter((r) => fs.existsSync(r));
  if (!files.length) { console.error('diffcheck: no existing files in: ' + rest.join(' ')); process.exit(2); }
  const jit = runEmbed(files, { env: baseEnv(f, false), timeoutS: f.timeoutS });
  const pbl = runEmbed(files, { env: baseEnv(f, true), timeoutS: f.timeoutS });
  let bad = 0;
  if (jit.out !== pbl.out) {
    bad++;
    console.log('OUTPUT DIVERGES:');
    const j = jit.out.trim().split('\n'), p = pbl.out.trim().split('\n');
    for (let i = 0; i < Math.max(j.length, p.length); i++) {
      if (j[i] !== p[i]) { console.log(`  line ${i + 1}: jit=${JSON.stringify(j[i])} pbl=${JSON.stringify(p[i])}`); if (bad++ > 8) break; }
    }
  } else {
    console.log('output identical (' + jit.out.trim().split('\n').length + ' lines)');
  }
  const ver = runEmbed(files, { env: { ...baseEnv(f, false), GECKO_WJ_VERIFY: '1', GECKO_WJ_VERIFYMUT: '1' }, timeoutS: f.timeoutS * 4 });
  const mism = ver.err.split('\n').filter((l) => l.includes('MISMATCH'));
  if (mism.length) {
    bad += mism.length;
    console.log(`per-call verifier: ${mism.length} mismatches (first 10):`);
    for (const m of mism.slice(0, 10)) console.log('  ' + m);
  } else {
    console.log('per-call verifier: clean (returns + side effects match interpreter)');
  }
  if (bad) process.exit(1);
}

function main() {
  const [suite, ...argv] = process.argv.slice(2);
  const f = parseFlags(argv);
  switch (suite) {
    case 'octane': return runOctane(f.rest, f);
    case 'jetstream': case 'js': return runJetstream(f.rest, f);
    case 'micro': case 'microbenches': return runMicro(f.rest, f);
    case 'ubo': return runUbo(f);
    case 'realapp': return runRealapp(f.rest[0] ?? 'all', f);
    case 'disas': return runDisas(f.rest, f);
    case 'disastest': return runDisasTest(f.rest, f);
    case 'wasm': return runWasm(f.rest, f);
    case 'webtooling': case 'wtb': return runWebtooling(f.rest, f);
    case 'jittest': return runJittest(f.rest, f);
    case 'diffcheck': return runDiffcheck(f.rest, f);
    case 'list':
      console.log('octane:    ' + Object.keys(OCT).join(' '));
      console.log('jetstream: ' + fs.readdirSync(JETSTREAM).filter((x) => x.endsWith('.js') && x !== 'jetstream-driver.js').map((x) => x.slice(0, -3)).join(' '));
      console.log('micro:     ' + fs.readdirSync(MICRO).filter((x) => x.endsWith('.js') && x !== 'micro-driver.js').map((x) => x.slice(0, -3)).join(' '));
      console.log('disastest: ' + (fs.existsSync(DISAS) ? fs.readdirSync(DISAS).filter((x) => x.endsWith('.js')).map((x) => x.slice(0, -3)).join(' ') : ''));
      console.log('wasm:      difftest atomictest tramptest emtest rusttest');
      console.log('webtooling: acorn babel babylon buble chai coffeescript espree esprima jshint lebab postcss prepack prettier source-map terser typescript uglify-js  (or none=all)');
      console.log('realapp:   acorn marked');
      return;
    default:
      console.error('usage: node bench/main.ts <octane|jetstream|micro|ubo|realapp|webtooling|disas|disastest|wasm|jittest|list> [names...] [flags]\n'
        + '  disas <file.js> --fn NAME [--grep RE]   show the WAT the JIT emitted for a function\n'
        + '  disastest [names]                       run bench/disas/*.js codegen CHECK tests\n'
        + '  flags: --pbl --ab --bails --iters N --warm N --gczeal N --nursery-mb N --timeout S');
      process.exit(2);
  }
}

// Entry dispatch runs last so the const bench-tables above are initialized first
// (function decls hoist; const/let stay in the temporal dead zone until evaluated).
if (process.argv[2] !== '__exec' && process.argv[2] !== '__jsshell') main();
