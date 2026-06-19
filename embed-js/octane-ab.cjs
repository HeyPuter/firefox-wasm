// Octane A/B in node: each bench run N times per arm (fresh subprocess each), min+median,
// ratio = medianA/medianB. Default A = JIT on (current env), B = JIT off (GECKO_NOWASMJIT=1).
//   node embed-js/octane-ab.cjs [bench...]                 # default core set
//   N=5 node embed-js/octane-ab.cjs richards deltablue
//   AENV='GECKO_WJVS_NOUNBOX=1 GECKO_WJVS_GVN=1' node embed-js/octane-ab.cjs richards
//   BENCH-only (no off arm): NOOFF=1 node embed-js/octane-ab.cjs ...
// "Octane score: higher = better", so ratio>1 means arm A (JIT) is faster than arm B (off).
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");

const OCT = path.resolve(__dirname, "../embed-xul/bench/octane");
const RUN = path.resolve(__dirname, "run.cjs");
const DRIVER = path.resolve(__dirname, "octane-driver.js");
const MULTI = { typescript: ["typescript-compiler", "typescript-input", "typescript"],
                gbemu: ["gbemu-part1", "gbemu-part2"], zlib: ["zlib-data", "zlib"] };
const N = parseInt(process.env.N || "5", 10);
const DEFAULT = ["richards", "deltablue", "crypto", "raytrace", "navier-stokes", "splay", "earley-boyer"];

function parseEnv(s) {  // "K=V K2=V2" -> object
  const o = {};
  (s || "").trim().split(/\s+/).filter(Boolean).forEach((kv) => {
    const i = kv.indexOf("="); o[kv.slice(0, i)] = kv.slice(i + 1);
  });
  return o;
}
function score(bench, extraEnv) {
  const parts = MULTI[bench] || [bench];
  const files = [path.join(OCT, "base.js"), ...parts.map((p) => path.join(OCT, p + ".js")), DRIVER];
  for (const f of files) if (!fs.existsSync(f)) return -1;
  const env = Object.assign({}, process.env, extraEnv);
  let out = "";
  try { out = execFileSync("node", ["--no-liftoff", "--stack-size=8000", RUN, ...files], { encoding: "utf8", env, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 << 20 }); }
  catch (e) { out = (e.stdout || "") + ""; }
  const m = /OCTSCORE=(\d+)/.exec(out);
  return m ? +m[1] : -1;
}
const stat = (a) => { a = a.filter((x) => x > 0).sort((x, y) => x - y);
  return a.length ? { min: a[0], med: a[a.length >> 1], n: a.length } : { min: -1, med: -1, n: 0 }; };

(function () {
  const benches = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT;
  const aEnv = parseEnv(process.env.AENV);
  const bEnv = process.env.NOOFF ? null : Object.assign({ GECKO_NOWASMJIT: "1" }, parseEnv(process.env.BENV));
  console.log(`N=${N}  A=${process.env.AENV || "(jit on)"}  B=${process.env.NOOFF ? "(none)" : (process.env.BENV || "jit off")}\n`);
  for (const b of benches) {
    const A = []; for (let i = 0; i < N; i++) A.push(score(b, aEnv));
    const sA = stat(A);
    if (bEnv) {
      const B = []; for (let i = 0; i < N; i++) B.push(score(b, bEnv));
      const sB = stat(B);
      const r = sB.med > 0 ? (sA.med / sB.med).toFixed(2) : "?";
      console.log(`${b.padEnd(14)} A min=${sA.min} med=${sA.med}  | B min=${sB.min} med=${sB.med}  | x${r}`);
    } else {
      console.log(`${b.padEnd(14)} min=${sA.min} med=${sA.med}`);
    }
  }
})();
