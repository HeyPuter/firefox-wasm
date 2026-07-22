#!/usr/bin/env node
// GC-rooting-hazard fuzzer. Generates deterministic, terminating JS biased toward the
// pattern that exposes rooting bugs -- a value produced, held across an ALLOCATING
// safepoint (regex op, object/array/string alloc, property-IC, call), then used after --
// and runs the JIT side under aggressive gczeal (minor GC every allocation, which MOVES
// nursery objects) while PBL runs clean. A JIT-only trap ("memory access out of bounds"
// / unreachable / [wj-crashstate]) or a checksum divergence = a rooting-hazard finding.
// Captures the crash signature (lastHelpKind) and delta-minimizes the repro.
//
//   node bench/difftests/fuzz-gc.cjs [--seeds N] [--start S] [--zeal 7,1] [--timeout MS] [--out DIR]
const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MAIN = path.join(ROOT, 'bench', 'main.ts');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const SEEDS = +flag('--seeds', 120);
const START = +flag('--start', 1);
const ZEAL = flag('--zeal', '7,1');
const TIMEOUT = +flag('--timeout', 30000);
const ITERS = +flag('--iters', 800);   // outer driver iterations (lower for slow gczeal so runs finish)
const OUT = flag('--out', path.join('/home/claude/.claude/jobs/2cefad52/tmp/stab', 'fuzz-gc-findings'));
fs.mkdirSync(OUT, { recursive: true });

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let RND = Math.random;
const ri = n => Math.floor(RND() * n);
const pick = a => a[ri(a.length)];
const chance = p => RND() < p;

// Expressions producing a STRING (the value most often mishandled across safepoints).
const STRVARS = ['s', 't', 'u'];
const OBJVARS = ['o', 'p'];
const ARRVARS = ['a', 'b'];
const NUMVARS = ['n', 'm', 'i', 'k'];
function strExpr(d) {
  // NOTE: parenthesize the additive base so a chained method (.replace/.slice/.toUpperCase
  // in the recursive cases) binds to the STRING, not the trailing NUMVAR (precedence:
  // `"lit" + i.replace(...)` would call .replace on the number `i` -> a spurious
  // method-on-number TypeError that only ever surfaces the known cosmetic not-callable
  // error-message divergence, drowning real findings).
  if (d <= 0 || chance(0.4)) return pick([pick(STRVARS), pick(STRVARS), `("lit" + ${pick(NUMVARS)})`, `String(${pick(NUMVARS)})`]);
  const r = ri(12);
  if (r === 0) return `(${strExpr(d - 1)} + ${strExpr(d - 1)})`;
  if (r === 1) return `(${strExpr(d - 1)} + ":" + ${pick(NUMVARS)})`;
  if (r === 2) return `${strExpr(d - 1)}.slice(${pick(NUMVARS)} % 5, ${pick(NUMVARS)} % 9 + 3)`;
  if (r === 3) return `${strExpr(d - 1)}.substring(1, 4)`;
  if (r === 4) return `${strExpr(d - 1)}.replace(/[a-z]+/g, "X")`;   // regex safepoint
  if (r === 5) return `(/(\\w+)(\\d)/.exec(${strExpr(d - 1)}) || ["", "z", "0"])[1]`;  // regex clone+exec
  if (r === 6) return `${strExpr(d - 1)}.toUpperCase()`;
  // --- number->string FORMATTING (rounding / radix / exponent edges; all spec-pure,
  // no ICU/locale -> deterministic across engines). A classic JIT-vs-interp divergence
  // source (Double->String, ToFixed/ToPrecision fast paths). ---
  if (r === 7) return `(${numExpr(d - 1)} / 7).toFixed(${ri(4)})`;
  if (r === 8) return `((${numExpr(d - 1)} & 4095) + 1).toString(${pick(['2', '8', '16', '36'])})`;
  if (r === 9) return `String(${numExpr(d - 1)}).padStart(${1 + ri(6)}, "0")`;
  if (r === 10) return `((${numExpr(d - 1)} * 0.5 + 0.25)).toPrecision(${1 + ri(5)})`;
  return `(${strExpr(d - 1)} + ${pick(OBJVARS)}.f)`;
}
function numExpr(d) {
  if (d <= 0 || chance(0.5)) return pick([pick(NUMVARS), String(ri(20)), `${pick(ARRVARS)}.length`, `${pick(STRVARS)}.length`]);
  const r = ri(6);
  if (r === 0) return `(${numExpr(d - 1)} + ${numExpr(d - 1)})`;
  if (r === 1) return `(${numExpr(d - 1)} * 3 % 17)`;
  if (r === 2) return `${pick(STRVARS)}.indexOf(${strExpr(d - 1)})`;   // string+regex-ish
  if (r === 3) return `(/[0-9]/.test(${strExpr(d - 1)}) ? 1 : 0)`;     // regex test safepoint
  if (r === 4) return `${pick(OBJVARS)}.g`;
  return `(${numExpr(d - 1)} | 0)`;
}
// A statement that PRODUCES a value, crosses a safepoint (alloc), then USES it.
function stmt(d) {
  const r = ri(19);
  if (r === 0) { const v = pick(STRVARS); return `${v} = ${strExpr(d)};`; }               // rebind string
  if (r === 1) return `${pick(ARRVARS)}.push({ s: ${strExpr(d)}, n: ${numExpr(d)} });`;   // alloc holding a string
  if (r === 2) return `${pick(OBJVARS)}["k" + (${numExpr(d)} % 4)] = ${strExpr(d)};`;      // prop-IC write holding string
  if (r === 3) { const v = pick(STRVARS); return `{ var m = /(\\w)(\\w)/.exec(${v}); ${v} = (m ? m[0] : ${v}) + ${strExpr(d)}; }`; }  // regex, use v after
  if (r === 4) return `acc += ${strExpr(d)} + "|" + ${numExpr(d)} + ";";`;                 // string build (rope)
  if (r === 5) return `${pick(ARRVARS)} = ${pick(ARRVARS)}.concat([${strExpr(d)}, ${numExpr(d)}]);`;  // array alloc
  if (r === 6) { const v = pick(STRVARS); return `{ var arr = ${v}.split(/[,:]/); acc += arr.length + arr.join("-"); }`; }  // regex split -> array
  if (r === 7) { const v = pick(STRVARS); const w = pick(STRVARS); // scanner: regex-test in while, string held across each clone (the confirmed-vulnerable shape)
    return `{ var jj = ${numExpr(d)} % 3; while (jj < ${v}.length && /[a-zA-Z0-9_]/.test(${v}[jj])) jj++; ${pick(ARRVARS)}.push({ w: ${w}, seg: ${v}.slice(0, jj) }); acc += jj + ${v}; }`; }
  // --- higher-order-method + USER CALLBACK cases: exercise the self-hosted->callback
  // dispatch path (map/reduce/filter/sort/forEach). The callback is a closure that
  // CAPTURES an outer string, ALLOCATES (so GC can fire inside the self-hosted call),
  // and its result is USED after -- the shape that stresses callee/env rooting across a
  // self-hosted safepoint (the decimal/tweetnacl compaction-callee class). ---
  if (r === 8) { const v = pick(STRVARS); return `acc += ${pick(ARRVARS)}.map(function(x){ return ${strExpr(d - 1)} + String(x) + ${v}; }).join(",");`; }
  if (r === 9) return `acc += ${pick(ARRVARS)}.reduce(function(q, x){ return q + ("lit" + String(x) + ${strExpr(d - 1)}); }, "");`;
  if (r === 10) { const v = pick(STRVARS); return `acc += ${pick(ARRVARS)}.filter(function(x){ return (String(x) + ${v}).length % 2 === (${numExpr(d - 1)} & 1); }).length;`; }
  if (r === 11) { const w = pick(ARRVARS); return `${w} = ${w}.slice().sort(function(x, y){ return (String(x).length - String(y).length) || (String(x) < String(y) ? -1 : String(x) > String(y) ? 1 : 0) || (${numExpr(d - 1)} & 1); });`; }  // numeric/relational comparator (localeCompare traps in the embed)
  if (r === 12) { const v = pick(STRVARS); return `${pick(ARRVARS)}.forEach(function(x){ ${pick(OBJVARS)}["m" + (String(x).length % 4)] = ${strExpr(d - 1)} + ${v}; });`; }
  // --- try/catch: value thrown across the JIT exception boundary + caught + used.
  // Uses an EXPLICIT throw of a value (NOT a not-callable/prop-on-undefined -- those hit
  // the known cosmetic decompiled-error-message divergence and would false-flag). ---
  if (r === 13) return `try { if (${numExpr(d)} % 3 === 0) throw (${strExpr(d)} + "!"); ${pick(ARRVARS)}.push(${numExpr(d)}); acc += "ok"; } catch (e) { acc += "C" + String(e).length + ${strExpr(d - 1)}; }`;
  // --- destructuring (with defaults -> tests missing-own-prop protofold) ---
  if (r === 14) return `{ var [q0 = 9, q1 = 8, q2 = 7] = ${pick(ARRVARS)}; var { f: qf = "x", z: qz = 5, g: qg = -1 } = ${pick(OBJVARS)}; acc += String(q0) + String(q1) + String(q2) + qf + qz + qg; }`;
  // --- Map/Set: alloc + set/get/has/size, keyed by generated strings/nums ---
  if (r === 15) { const a = strExpr(d), b = strExpr(d); return `{ var mp = new Map(); mp.set(${a}, ${numExpr(d)}); mp.set(${b}, ${numExpr(d)}); acc += mp.size + ":" + (mp.get(${a}) | 0) + (mp.has(${b}) ? "H" : "-"); }`; }
  if (r === 16) { const a = strExpr(d); return `{ var st = new Set(); st.add(${a}); st.add(${strExpr(d)}); st.add(${a}); acc += st.size + (st.has(${a}) ? "1" : "0"); }`; }
  // --- BigInt arithmetic (may bail to PBL; if so JIT==PBL trivially, still valid) ---
  if (r === 17) return `acc += String((BigInt(${numExpr(d)} & 31) * 7n + 3n) % 100n);`;
  return `if (${numExpr(d)} % 2 === 0) { acc += ${strExpr(d)}; } else { ${pick(ARRVARS)}.push(${strExpr(d)}); }`;
}
function genProgram(seed) {
  RND = mulberry32(seed);
  const n = 5 + ri(8);
  let body = '';
  for (let i = 0; i < n; i++) body += '    ' + stmt(3) + '\n';
  return `
function mix(h, x){ x=String(x); for (var i=0;i<x.length;i++){ h=(Math.imul(h,31)+x.charCodeAt(i))|0; } return h; }
function f(s, t, u, o, p, a, b, n, m) {
  var acc = "", i = 0, k = 0;
  for (var loop = 0; loop < 6; loop++) {
    i = loop; k = (loop * 7) % 5;
${body}
  }
  for (var z = 0; z < a.length && z < 20; z++) acc += String(a[z]) + ",";
  for (var z = 0; z < b.length && z < 20; z++) acc += String(b[z]) + ",";
  acc += "|" + s + t + u + "|" + o.f + "/" + o.g + "/" + p.f + "|" + JSON.stringify(o).length;
  return acc;
}
var chk = 0;
for (var it = 0; it < ${ITERS}; it++) {
  var s = "alpha" + (it % 13), t = "b3ta:" + (it % 7) + "x", u = "gamma_" + (it % 5);
  var o = { f: "of" + it, g: it % 9, k0: "z" }, p = { f: "pf", g: -it };
  var a = [it, "a" + it, it * 2], b = ["b", it % 3, "c" + it];
  var r;
  try { r = f(s, t, u, o, p, a, b, it % 11, (it * 3) % 17); }
  catch (e) { r = "ex:" + (e && e.message || e); }
  chk = mix(chk, r);
}
print("GCFZ=" + chk);
`;
}

function run(file, pbl, zeal) {
  const env = Object.assign({}, process.env);
  if (pbl) env.GECKO_NOWASMJIT = '1'; else delete env.GECKO_NOWASMJIT;
  if (zeal) { env.GECKO_GCZEAL = ZEAL; env.GECKO_NURSERY_MB = '1'; } else { delete env.GECKO_GCZEAL; delete env.GECKO_NURSERY_MB; }
  const r = cp.spawnSync('node', ['--no-liftoff', '--stack-size=8000', MAIN, '__exec', file],
    { env, timeout: TIMEOUT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const all = (r.stdout || '') + (r.stderr || '');
  const m = all.match(/GCFZ=(-?\d+)/);
  const km = all.match(/lastHelpKind=(\d+)/);
  return { fz: m ? m[1] : null, trap: /out of bounds|unreachable|RuntimeError|callMain threw|NO pending exception|wj-crashstate|Assertion/.test(all),
           kind: km ? +km[1] : null, timedOut: r.error && r.error.code === 'ETIMEDOUT' };
}
function classify(file) {
  const p = run(file, true, false);      // PBL, no zeal = GC-independent reference
  if (p.fz === null) return { kind: 'SKIP', p };
  const j = run(file, false, true);      // JIT under gczeal
  if (j.trap || (j.fz === null && j.timedOut === false)) {
    // A JIT crash is only a JIT bug if PBL under the SAME zeal does NOT also crash
    // (a shared runtime/GC crash is out of the JS->wasm-JIT scope).
    const pzc = run(file, true, true);
    if (pzc.trap || (pzc.fz === null && pzc.timedOut === false))
      return { kind: 'SHARED-CRASH', p, j, pz: pzc };
    return { kind: 'ROOT-CRASH', p, j, pz: pzc };
  }
  if (j.fz === null) return { kind: 'SKIP', p, j };   // JIT-gczeal timed out (too slow) -> skip
  // FAST PATH: if JIT@zeal already == PBL@clean, there's nothing to disambiguate -- the
  // JIT agrees with the GC-independent reference, so it's OK and a 3rd run (PBL@zeal)
  // can't change that (PBL@zeal would also == PBL@clean or reveal GC-mode-dep, neither a
  // JIT bug). Skips the 3rd process spawn in the common no-divergence case (~33% faster).
  if (j.fz === p.fz) return { kind: 'OK', p, j };
  // DISAMBIGUATE with the CORRECT JIT oracle: PBL under the SAME GC mode as the JIT run.
  // Comparing to PBL@clean alone false-positives on programs whose RESULT legitimately
  // depends on GC mode (seed 62: JIT@14==PBL@14 but both != PBL@clean -- shared GC-observable
  // behavior, NOT a JIT miscompile).
  const pz = run(file, true, true);      // PBL under the SAME zeal
  if (pz.fz === null) return { kind: 'SKIP', p, j, pz };
  if (j.fz !== pz.fz) return { kind: 'GC-DIVERGE', p, j, pz };   // TRUE JIT rooting bug
  if (pz.fz !== p.fz) return { kind: 'GC-MODE-DEP', p, j, pz };  // shared (JIT==PBL@zeal), not a JIT bug
  return { kind: 'OK', p, j, pz };
}
function minimize(src, target) {
  const tmp = path.join(OUT, '_min.js');
  const bad = c => { fs.writeFileSync(tmp, c); return classify(tmp).kind === target; };
  let cur = src.split('\n'), changed = true, passes = 0;
  while (changed && passes < 5) {
    changed = false; passes++;
    for (let i = 0; i < cur.length; i++) {
      if (!/^\s{4}\S/.test(cur[i])) continue;   // only body stmt lines
      const cand = cur.slice(0, i).concat(cur.slice(i + 1));
      if (bad(cand.join('\n'))) { cur = cand; changed = true; i--; }
    }
  }
  return cur.join('\n');
}

const findings = [];
const tmp = path.join(OUT, '_cur.js');
const logPath = path.join(OUT, 'findings.log');
let ok = 0, skip = 0, modeDep = 0;
for (let s = START; s < START + SEEDS; s++) {
  fs.writeFileSync(tmp, genProgram(s));
  const c = classify(tmp);
  if (c.kind === 'OK') { ok++; process.stdout.write('.'); continue; }
  if (c.kind === 'SKIP') { skip++; process.stdout.write('s'); continue; }
  // GC-MODE-DEP / SHARED-CRASH: JIT agrees with PBL under the SAME GC mode -> NOT a
  // JS->wasm-JIT bug (shared runtime GC-observable behavior or impl-defined program).
  // Count + note the seed, but don't minimize/save (out of the JIT mandate's scope).
  if (c.kind === 'GC-MODE-DEP' || c.kind === 'SHARED-CRASH') {
    modeDep++; process.stdout.write('m');
    fs.appendFileSync(logPath, `seed=${s} kind=${c.kind} (shared, not-JIT) jit@zeal=${c.j && c.j.fz} pbl@zeal=${c.pz && c.pz.fz} pbl@clean=${c.p.fz}\n`);
    continue;
  }
  process.stdout.write('\n');
  const line = `seed=${s} kind=${c.kind} lastHelpKind=${c.j && c.j.kind} jitFz=${c.j && c.j.fz} pbl@zeal=${c.pz && c.pz.fz} pbl@clean=${c.p.fz}`;
  console.log('*** ' + line);
  const min = minimize(genProgram(s), c.kind);
  const outfile = path.join(OUT, `gcfind-seed${s}-${c.kind}-kind${c.j && c.j.kind}.js`);
  fs.writeFileSync(outfile, `// ${line}\n// repro: JIT under GECKO_GCZEAL=${ZEAL} GECKO_NURSERY_MB=1 vs PBL\n` + min);
  fs.appendFileSync(logPath, line + ` -> ${outfile}\n`);
  findings.push({ seed: s, kind: c.kind, sig: c.j && c.j.kind, file: outfile });
  console.log('    minimized -> ' + outfile);
}
console.log(`\n\nDONE seeds=${START}..${START + SEEDS - 1} ok=${ok} skip=${skip} modeDep=${modeDep}(shared,not-JIT) findings=${findings.length}(true JIT bugs)`);
const bySig = {};
for (const f of findings) { const key = `${f.kind}/kind${f.sig}`; bySig[key] = (bySig[key] || 0) + 1; }
console.log('signatures (dedup by crash kind):'); for (const k of Object.keys(bySig).sort((a, b) => bySig[b] - bySig[a])) console.log(`  ${bySig[k]}x  ${k}`);
for (const f of findings) console.log(`  ${f.kind} sig=kind${f.sig} seed ${f.seed} ${f.file}`);
