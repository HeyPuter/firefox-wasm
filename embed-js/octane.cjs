// Run Octane benchmark(s) in the SpiderMonkey-only node embedder, one subprocess per bench
// (clean process-per-arm, like the browser harness). Prints "<bench>: OCTSCORE=<n>".
//   node embed-js/octane.cjs <bench> [bench2 ...]
//   GECKO_WJVS_NOUNBOX=1 GECKO_WJVS_GVN=1 node embed-js/octane.cjs richards   # A/B a JIT gate
//   GECKO_NOWASMJIT=1 node embed-js/octane.cjs richards                       # JIT-off arm
// Env (GECKO_*) is inherited by the child and forwarded to the JIT's getenv.
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");

const OCT = path.resolve(__dirname, "../embed-xul/bench/octane");
const RUN = path.resolve(__dirname, "run.cjs");
const DRIVER = path.resolve(__dirname, "octane-driver.js");
const MULTI = {  // benchmarks needing >1 source file (load order)
  typescript: ["typescript-compiler", "typescript-input", "typescript"],
  gbemu: ["gbemu-part1", "gbemu-part2"],
  zlib: ["zlib-data", "zlib"],
};

function runOne(bench) {
  const parts = MULTI[bench] || [bench];
  const files = [path.join(OCT, "base.js"), ...parts.map((p) => path.join(OCT, p + ".js")), DRIVER];
  for (const f of files) if (!fs.existsSync(f)) return { err: "missing " + f };
  let out = "";
  try {
    // --stack-size: node's default V8 stack is smaller than chromium's; the JIT's deopt
    // self-resume recurses across the wasm<->host-wasm boundary, so FDEOPT testing needs more.
    out = execFileSync("node", ["--no-liftoff", "--stack-size=8000", RUN, ...files], { encoding: "utf8", stdio: ["ignore", "pipe", process.env.GECKO_DEBUG_JIT || process.env.OCT_VERBOSE ? "inherit" : "ignore"], maxBuffer: 64 << 20 });
  } catch (e) { out = (e.stdout || "") + ""; if (!out) return { err: String(e).slice(0, 120) }; }
  if (process.env.OCT_VERBOSE) process.stdout.write(out);
  const m = /OCTSCORE=(\d+)/.exec(out);
  const w = /WALLMS=(\d+)/.exec(out);
  const er = /\bERR=([^\n]+)/.exec(out);
  return { score: m ? +m[1] : null, wallMs: w ? +w[1] : null, err: m ? null : (er ? er[1] : "no score") };
}

const benches = process.argv.slice(2);
if (!benches.length) { console.error("usage: node octane.cjs <bench> [bench2 ...]"); process.exit(2); }
let rc = 0;
for (const b of benches) {
  const r = runOne(b);
  if (r.score != null) console.log(`${b}: OCTSCORE=${r.score}${r.wallMs != null ? ` (${r.wallMs}ms)` : ""}`);
  else { console.log(`${b}: FAIL ${r.err}`); rc = 1; }
}
process.exit(rc);
