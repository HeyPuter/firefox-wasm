#!/usr/bin/env node
// Run a real Rust->wasm module (rusttest.wasm) through the in-process wasm
// interpreter in the SpiderMonkey embedder and check exported results against
// values computed here in node.
//   node embed-js/wasmtests/rusttest.cjs
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
// Build rust/rusttest.rs -> /tmp/rusttest.wasm if absent (needs the wasm32 target:
// `rustup target add wasm32-unknown-unknown`). Skip cleanly if rustc/target missing.
const WASM_PATH = "/tmp/rusttest.wasm";
if (!fs.existsSync(WASM_PATH)) {
  try {
    execFileSync("rustc", ["--target", "wasm32-unknown-unknown", "-O", "--crate-type=cdylib",
      path.join(__dirname, "rust", "rusttest.rs"), "-o", WASM_PATH], { stdio: "inherit" });
  } catch (e) {
    console.log("SKIP rusttest: cannot build " + WASM_PATH +
      " (need `rustup target add wasm32-unknown-unknown`): " + (e.message || e));
    process.exit(0);
  }
}
const wasm = fs.readFileSync(WASM_PATH);
const arr = Array.from(wasm);

// Reference implementations (must match rusttest.rs).
const u32 = (x) => x >>> 0;
function sortChecksum(seed, count) {
  const n = Math.min(count, 256);
  const a = new Array(n);
  let x = u32(seed);
  for (let i = 0; i < n; i++) { x = u32(u32(Math.imul(x, 1103515245)) + 12345); a[i] = x % 1000; }
  a.sort((p, q) => p - q);
  let acc = 0;
  for (let i = 0; i < n; i++) acc = u32(acc + u32(Math.imul(a[i], i + 1)));
  return acc;
}
function fib(n) { let a = 0n, b = 1n; for (let i = 0; i < n; i++) { [a, b] = [b, a + b]; } return a; }
function sumSq(n) { let s = 0n; for (let i = 1n; i <= BigInt(n); i++) s += i * i; return s; }
function collatz(n) { n = BigInt(n); let c = 0; while (n !== 1n) { n = (n & 1n) ? 3n * n + 1n : n / 2n; c++; } return c; }

const checks = [
  ["fib(30)", `i.exports.fib(30)`, fib(30).toString()],
  ["sum_sq(1000)", `i.exports.sum_sq(1000)`, sumSq(1000).toString()],
  ["collatz(27)", `i.exports.collatz(27n)`, String(collatz(27))],
  ["sort_checksum(42,200)", `i.exports.sort_checksum(42,200)`, String(sortChecksum(42, 200))],
  ["dispatch", `[i.exports.dispatch(0,7,3),i.exports.dispatch(1,7,3),i.exports.dispatch(2,7,3)].join(",")`, "10,4,21"],
];

let script = `var bytes=new Uint8Array([${arr.join(",")}]);\n`;
script += `var i=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});\n`;
for (const [name, expr] of checks) {
  script += `try{print(${JSON.stringify(name)}+"="+(${expr}));}catch(e){print(${JSON.stringify(name)}+"=ERR:"+(e&&e.message?e.message:e));}\n`;
}
const sp = "/tmp/rusttest_run.js";
fs.writeFileSync(sp, script);

const env = Object.assign({}, process.env, { EMSDK: path.join(ROOT, "emsdk"), GECKO_WASM_INTERP: "1" });
let out = "";
try { out = execFileSync("node", [path.join(ROOT, "bench", "main.ts"), "__exec", sp], { env, encoding: "utf8" }); }
catch (e) { out = (e.stdout || "").toString(); console.error(e.stderr || ""); }

const map = {};
for (const line of out.split("\n")) { const m = line.match(/^(.+?)=(.*)$/); if (m) map[m[1]] = m[2]; }

let pass = 0, fail = 0;
for (const [name, , expect] of checks) {
  const got = map[name];
  if (got === expect) { pass++; console.log(`PASS ${name} = ${got}`); }
  else { fail++; console.log(`FAIL ${name}: got=${got} expected=${expect}`); }
}
console.log(`\n${pass}/${pass + fail} real-Rust-wasm checks passed (interpreter)`);
process.exit(fail ? 1 : 0);
