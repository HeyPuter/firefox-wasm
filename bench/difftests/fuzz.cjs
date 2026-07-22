#!/usr/bin/env node
// Differential JIT-vs-PBL fuzzer with auto-minimization.
//
// Generates deterministic, terminating JS programs biased toward the JIT's
// fragile surface (mixed-type arithmetic, bitwise/shift edges, array & typed-array
// indexing incl. OOB, polymorphic object property access, control flow), runs each
// under the wasm JIT and under the portable-baseline interpreter (GECKO_NOWASMJIT=1),
// and compares a full-state checksum. On a divergence (different checksum) or a
// JIT-only crash (JIT traps / empty while PBL prints), it delta-minimizes the program
// body to a small repro and saves it.
//
//   node bench/difftests/fuzz.cjs [--seeds N] [--start S] [--timeout MS] [--out DIR]
//
// A finding = a minimized .js under --out plus a line in findings.log.
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MAIN = path.join(ROOT, 'bench', 'main.ts');
const argv = process.argv.slice(2);
function flag(name, def) { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def; }
const SEEDS = +flag('--seeds', 300);
const START = +flag('--start', 1);
const TIMEOUT = +flag('--timeout', 20000);
const OUT = flag('--out', path.join('/home/claude/.claude/jobs/2cefad52/tmp/stab', 'fuzz-findings'));
fs.mkdirSync(OUT, { recursive: true });

// ---------- seeded PRNG ----------
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let RND = Math.random;
function ri(n) { return Math.floor(RND() * n); }
function pick(arr) { return arr[ri(arr.length)]; }
function chance(p) { return RND() < p; }

// ---------- generator ----------
const NUMVARS = ['a', 'b', 'c', 'd', 'p', 'q'];        // function params (numbers)
const LOCALS = ['l0', 'l1', 'l2', 'l3'];               // number locals
const ARRS = ['AR', 'HO'];                             // dense array, holey array
const TAS = ['I8', 'U8', 'I32', 'U32', 'F64'];         // typed arrays
const OBJ = 'O';                                        // polymorphic object
const EDGE = ['0', '-0', '1', '-1', '2', '0.5', '-0.5', 'NaN', 'Infinity', '-Infinity',
  '2147483647', '-2147483648', '4294967295', '3.14', '1e-10', '1e10', '2**31', '2**52', '255', '65536', '0.1'];

function numExpr(depth) {
  if (depth <= 0 || chance(0.35)) {
    const r = ri(6);
    if (r === 0) return pick(NUMVARS);
    if (r === 1) return pick(LOCALS);
    if (r === 2) return pick(EDGE);
    if (r === 3) return String(ri(2000) - 1000);
    if (r === 4) { const t = pick(TAS); return `${t}[${idxExpr(depth - 1)}]`; }
    const arr = pick(ARRS); return `${arr}[${idxExpr(depth - 1)}]`;
  }
  const r = ri(11);
  if (r === 0) { const op = pick(['+', '-', '*', '/', '%']); return `(${numExpr(depth - 1)} ${op} ${numExpr(depth - 1)})`; }
  if (r === 1) { const op = pick(['|', '&', '^', '<<', '>>', '>>>']); return `(${numExpr(depth - 1)} ${op} ${numExpr(depth - 1)})`; }
  if (r === 2) { const op = pick(['-', '~']); return `(${op} ${numExpr(depth - 1)})`; }  // space: avoids `--80`
  if (r === 9) return `((${numExpr(depth - 1)}) ** (${numExpr(depth - 1)}))`;  // parens: unary LHS of ** is illegal
  if (r === 3) { const op = pick(['<', '>', '<=', '>=', '==', '===', '!=']); return `((${numExpr(depth - 1)} ${op} ${numExpr(depth - 1)}) ? ${numExpr(depth - 1)} : ${numExpr(depth - 1)})`; }
  if (r === 4) { const fn = pick(['Math.floor', 'Math.ceil', 'Math.round', 'Math.trunc', 'Math.abs', 'Math.sign', 'Math.sqrt', 'Math.fround', 'Math.clz32', 'Math.log2', 'Math.cbrt']); return `${fn}(${numExpr(depth - 1)})`; }
  if (r === 5) { const fn = pick(['Math.min', 'Math.max', 'Math.imul', 'Math.pow', 'Math.atan2', 'Math.hypot']); return `${fn}(${numExpr(depth - 1)}, ${numExpr(depth - 1)})`; }
  if (r === 6) return `(${numExpr(depth - 1)} | 0)`;
  if (r === 7) return `(${numExpr(depth - 1)} >>> 0)`;
  if (r === 8) { const arr = pick(ARRS); return `${arr}.length`; }
  return `(${OBJ}.${pick(['x', 'y', 'z', 'w'])} + 0)`;
}
function idxExpr(depth) {
  // mix of in-bounds (mod length) and raw (possibly OOB) indices
  if (chance(0.5)) return `((${numExpr(depth)}) & 7)`;
  if (chance(0.5)) return `((${numExpr(depth)} | 0) % 12)`;
  return `(${numExpr(depth)} | 0)`;   // raw -> may be OOB (negative/large)
}

function stmt(depth, budget) {
  const r = ri(10);
  if (r <= 3) { // assignment
    const lhs = pick([pick(LOCALS), pick(LOCALS),
      `${pick(ARRS)}[${idxExpr(depth)}]`, `${pick(TAS)}[${idxExpr(depth)}]`,
      `${OBJ}.${pick(['x', 'y', 'z', 'w'])}`]);
    const op = pick(['=', '+=', '-=', '*=', '|=', '&=', '^=']);
    return `${lhs} ${op} ${numExpr(depth)};`;
  }
  if (r === 4 && budget > 1) { // if/else
    return `if (${numExpr(depth)}) { ${block(depth - 1, budget - 1)} }` + (chance(0.5) ? ` else { ${block(depth - 1, budget - 1)} }` : '');
  }
  if (r === 5 && budget > 1) { // bounded for
    const n = 2 + ri(4);
    return `for (var fi = 0; fi < ${n}; fi++) { ${pick(LOCALS)} += (${numExpr(depth)}); ${block(depth - 1, budget - 1)} }`;
  }
  if (r === 6 && budget > 1) { // while with counter guard
    return `{ var wc = 0; while ((${numExpr(depth)}) && wc < 8) { wc++; ${pick(LOCALS)} ^= (${numExpr(depth)} | 0); } }`;
  }
  if (r === 7 && budget > 1) { // switch
    let s = `switch ((${numExpr(depth)} | 0) & 3) {`;
    for (let k = 0; k < 3; k++) s += ` case ${k}: ${pick(LOCALS)} += ${numExpr(depth)}; break;`;
    s += ` default: ${pick(LOCALS)} -= ${numExpr(depth)}; }`;
    return s;
  }
  if (r === 8) { // try/catch (divide/throw)
    return `try { ${pick(LOCALS)} += (${numExpr(depth)}); if (${numExpr(depth)} > 500) throw 1; } catch (e) { ${pick(LOCALS)} += 7; }`;
  }
  return `${pick(LOCALS)} = (${numExpr(depth)});`;
}
function block(depth, budget) {
  const n = 1 + ri(3);
  let s = '';
  for (let i = 0; i < n; i++) s += stmt(depth, budget) + ' ';
  return s;
}

function genProgram(seed) {
  RND = mulberry32(seed);
  const nstmts = 5 + ri(10);
  let body = 'var l0=a, l1=b, l2=c+d, l3=(p^q);\n';
  for (let i = 0; i < nstmts; i++) body += '  ' + stmt(3, 3) + '\n';
  // fold all live state into a string, hashed -> deterministic full-state checksum
  const fold = `
  var _s = "";
  _s += l0+"|"+l1+"|"+l2+"|"+l3+"|";
  for (var _i=0;_i<AR.length;_i++) _s += AR[_i]+",";
  for (var _i=0;_i<HO.length;_i++) _s += (_i in HO ? HO[_i] : "h")+",";
  for (var _i=0;_i<I32.length;_i++) _s += I32[_i]+","+U32[_i]+","+F64[_i]+","+I8[_i]+","+U8[_i]+";";
  _s += O.x+"/"+O.y+"/"+O.z+"/"+O.w;
  return _s;`;
  return `
function mix(h, s){ s=String(s); for (var i=0;i<s.length;i++){ h=(Math.imul(h,31)+s.charCodeAt(i))|0; } return h; }
function f(a,b,c,d,p,q, AR, HO, I8, U8, I32, U32, F64, O){
${body}${fold}
}
var acc = 0;
var seeds = [];
for (var k=0;k<200;k++) seeds.push([k%13, (k*7)%17-8, k*0.5-3, (k^5)%9, k%3, -(k%4),
  [1,2,3,4,5,6,7,8], (function(){var h=[1,,3,,5,,7,]; return h;})(),
  new Int8Array([k,-k,127,-128,0,1,2,3]), new Uint8Array([k,255,0,1,2,3,4,5]),
  new Int32Array([k*1000,-k*1000,2147483647,-2147483648,0,1,-1,255]),
  new Uint32Array([k,4294967295,0,1,2,3,4,5]),
  new Float64Array([k*0.1,-k*0.1,Infinity,-Infinity,NaN,0.5,1e10,1e-10]),
  {x:k, y:k*2-3, z:(k%2?k*0.5:k), w:-k}]);
for (var it=0; it<2500; it++){
  var s = seeds[it % seeds.length];
  var r;
  try { r = f(s[0],s[1],s[2],s[3],s[4],s[5], s[6].slice(), s[7].slice(), s[8].slice(), s[9].slice(), s[10].slice(), s[11].slice(), s[12].slice(), {x:s[13].x,y:s[13].y,z:s[13].z,w:s[13].w}); }
  catch (e) { r = "ex:" + (e && e.message || e); }
  acc = mix(acc, r);
}
print("FZ=" + acc);
`;
}

// ---------- run ----------
function runEmbed(file, pbl) {
  const env = Object.assign({}, process.env);
  if (pbl) env.GECKO_NOWASMJIT = '1'; else delete env.GECKO_NOWASMJIT;
  const r = cp.spawnSync('node', ['--no-liftoff', '--stack-size=8000', MAIN, '__exec', file],
    { env, timeout: TIMEOUT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '');
  const m = out.match(/FZ=(-?\d+)/);
  return { fz: m ? m[1] : null, timedOut: r.error && r.error.code === 'ETIMEDOUT', status: r.status,
           trap: /unreachable|RuntimeError|callMain threw|NO pending exception|wj-crashstate/.test((r.stdout || '') + (r.stderr || '')) };
}
// classify one program. returns {kind, jit, pbl}
function classify(file) {
  const j = runEmbed(file, false);
  const p = runEmbed(file, true);
  if (p.fz === null) return { kind: 'SKIP', j, p };          // PBL didn't produce -> generator/embed issue, not a JIT bug
  if (j.fz === null) return { kind: (j.trap || j.timedOut) ? 'JIT-CRASH' : 'JIT-NORESULT', j, p };
  if (j.fz !== p.fz) return { kind: 'DIVERGE', j, p };
  return { kind: 'OK', j, p };
}

// ---------- minimizer: line delta-debug on the generated body statements ----------
function minimize(src, targetKind) {
  const tmp = path.join(OUT, '_min.js');
  function stillBad(candidate) {
    fs.writeFileSync(tmp, candidate);
    const c = classify(tmp);
    return c.kind === targetKind;
  }
  let cur = src.split('\n');
  let changed = true, passes = 0;
  while (changed && passes < 6) {
    changed = false; passes++;
    for (let i = 0; i < cur.length; i++) {
      // only try to drop lines inside the function body (indented '  ' stmt lines)
      if (!/^\s{2}\S/.test(cur[i]) || /return |var _s|for \(var _i|_s \+=|function |print\(/.test(cur[i])) continue;
      const cand = cur.slice(0, i).concat(cur.slice(i + 1));
      if (stillBad(cand.join('\n'))) { cur = cand; changed = true; i--; }
    }
  }
  return cur.join('\n');
}

// ---------- dump mode: print one generated program and exit ----------
if (argv.includes('--dump')) { process.stdout.write(genProgram(+flag('--dump', 1))); process.exit(0); }

// ---------- main loop ----------
const findings = [];
const logPath = path.join(OUT, 'findings.log');
const tmp = path.join(OUT, '_cur.js');
let ok = 0, skip = 0;
for (let s = START; s < START + SEEDS; s++) {
  const src = genProgram(s);
  fs.writeFileSync(tmp, src);
  const c = classify(tmp);
  if (c.kind === 'OK') { ok++; process.stdout.write('.'); continue; }
  if (c.kind === 'SKIP') { skip++; process.stdout.write('s'); continue; }
  process.stdout.write('\n');
  const line = `seed=${s} kind=${c.kind} jit=${c.j.fz} pbl=${c.p.fz} jitTrap=${c.j.trap} jitTO=${c.j.timedOut}`;
  console.log('*** FINDING ' + line);
  const min = minimize(src, c.kind);
  const outfile = path.join(OUT, `finding-seed${s}-${c.kind}.js`);
  fs.writeFileSync(outfile, `// ${line}\n// minimized differential repro\n` + min);
  fs.appendFileSync(logPath, line + `  -> ${outfile}\n`);
  findings.push({ seed: s, kind: c.kind, file: outfile });
  console.log('    minimized -> ' + outfile);
}
console.log(`\n\nDONE seeds=${START}..${START + SEEDS - 1}  ok=${ok} skip=${skip} findings=${findings.length}`);
for (const f of findings) console.log(`  ${f.kind}  seed ${f.seed}  ${f.file}`);
